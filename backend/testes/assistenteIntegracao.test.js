// Assistente virtual — integração com o BANCO DE TESTE (hm_orcamentos_v2) e a
// API de verdade numa porta livre, SEM gastar cota: as ferramentas do MCP do
// assistente rodam pelo protocolo MCP (o próprio assistenteMcp.mjs) contra esse
// servidor, e as mensagens usam o Claude Code FALSO (stream-json gravado).
// Confere o que o SERVIDOR garante:
//   - token do assistente recusado nas rotas não permitidas (status, exclusão,
//     e-mail, aplicar ação…) e depois que a execução termina;
//   - editar proposta que ele não criou nesta conversa → negado; posse vale;
//   - upload com tipo/tamanho inválido recusado; conversa de outro usuário invisível;
//   - ação pendente só executa pelo clique do usuário (e uma vez só);
//   - mensagem em streaming, retomada de sessão, sessão perdida, parar, cota esgotada, limite diário.
// Só roda com DB_NAME=hm_orcamentos_v2; apaga tudo o que cria (e restaura o
// próximo número de proposta).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.COTACAO_IA = 'desligada'; // material novo da proposta não chama IA para classificar (sem cota)
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BANCO_DE_TESTE = 'hm_orcamentos_v2';
if (process.env.DB_NAME !== BANCO_DE_TESTE) {
  console.log(`assistenteIntegracao: pulado (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  process.exit(0);
}

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const { criarTabelas } = require('../src/models/schema');
const { JWT_SECRET } = require('../src/config/segredos');
const S = require('../src/services/assistente/sessoes');
const F = require('../src/services/assistente/ferramentas');
const E = require('../src/services/assistente/execucao');
const P = require('../src/services/pastasSistema');
const { pastaDaConversa } = require('../src/services/assistente/arquivos');
const { pdfCftvSintetico } = require('./fixtures/assistente/pdfProjetoSintetico');

const FIX = path.join(__dirname, 'fixtures', 'assistente');
const MARCA = `TESTE ASSISTENTE ${Date.now()}`;
const criado = { usuarios: [], conversas: [], propostas: new Set(), analises: new Set(), laudos: new Set() };
let base; let servidor; let snapshot;
let ok = 0;

function app() {
  const a = express();
  a.use(express.json({ limit: '5mb' }));
  a.use(require('../src/middleware/textoBemFormado').textosBemFormados);
  a.use('/api', require('../src/routes'));
  a.use(require('../src/middleware/erros').tratarErros);
  return a;
}

async function req(metodo, caminho, token, corpo, { form } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let body;
  if (form) body = form; else if (corpo !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(corpo); }
  const r = await fetch(`${base}${caminho}`, { method: metodo, headers, body });
  const texto = await r.text();
  let dados; try { dados = JSON.parse(texto); } catch { dados = texto; }
  return { status: r.status, dados };
}

// lê o NDJSON da resposta em streaming até o fim
async function mensagemStream(conversaId, token, texto, extra = {}) {
  const r = await fetch(`${base}/api/assistente/conversas/${conversaId}/mensagens`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ texto, ...extra }),
  });
  if (!r.ok) return { status: r.status, dados: await r.json(), eventos: [] };
  const eventos = [];
  const leitor = r.body.getReader();
  const dec = new TextDecoder();
  let resto = '';
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    resto += dec.decode(value, { stream: true });
    let i;
    while ((i = resto.indexOf('\n')) >= 0) { const l = resto.slice(0, i).trim(); resto = resto.slice(i + 1); if (l) eventos.push(JSON.parse(l)); }
  }
  return { status: r.status, eventos };
}

async function criarUsuario(sufixo) {
  const { rows: [u] } = await pool.query(
    `INSERT INTO usuarios (nome, email, senha, role, ativo, senha_provisoria) VALUES ($1,$2,'x-sem-login','user',true,false) RETURNING id, nome, email, role`,
    [`${MARCA} ${sufixo}`, `teste-assistente-${sufixo}-${Date.now()}@exemplo.invalid`]);
  criado.usuarios.push(u.id);
  return { ...u, token: jwt.sign({ id: u.id, nome: u.nome, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' }) };
}

async function clienteMcp(token, contexto = {}) {
  const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
  const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
  const cliente = new Client({ name: 'teste', version: '1.0.0' });
  await cliente.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(__dirname, '..', 'src', 'mcp', 'assistenteMcp.mjs')],
    env: { ...require('../src/services/assistente/claudeCli').ambienteFiltrado(), ASSISTENTE_API_URL: base, ASSISTENTE_TOKEN: token, ASSISTENTE_CONTEXTO: JSON.stringify(contexto) },
  }));
  const chamar = async (nome, args) => {
    const r = await cliente.callTool({ name: nome, arguments: args });
    return { erro: !!r.isError, texto: r.content.map(c => c.text).join('\n') };
  };
  return { cliente, chamar };
}

const caso = async (nome, fn) => {
  try { await fn(); ok++; } catch (e) { console.error(`FALHOU: ${nome}`); throw e; }
};

function gerenciadorFalso(roteiro, registro) {
  const g = E.criarGerenciador({ config: { apiUrl: base, tempoLimiteMs: 20000 }, comando: process.execPath, prefixo: [path.join(FIX, 'cli-falso.js'), path.join(FIX, roteiro), registro] });
  E.substituirGerenciador(g);
  return g;
}

async function principal() {
  await criarTabelas();
  await criarTabelas(); // migração idempotente: rodar de novo não pode falhar
  servidor = app().listen(0, '127.0.0.1');
  await new Promise(r => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
  snapshot = {
    proximo: (await pool.query("SELECT valor FROM configuracoes WHERE chave = 'proximo_numero'")).rows[0].valor,
    material: (await pool.query('SELECT COALESCE(max(id),0)::int AS m FROM materiais')).rows[0].m,
    maoDeObra: (await pool.query('SELECT COALESCE(max(id),0)::int AS m FROM mao_de_obra_itens')).rows[0].m,
    servicos: (await pool.query('SELECT codigo FROM precos_mao_de_obra_referencia')).rows.map(r => r.codigo),
  };
  const ua = await criarUsuario('a');
  const ub = await criarUsuario('b');

  // ── conversa e escopo ────────────────────────────────────────────────
  const conv = (await req('POST', '/api/assistente/conversas', ua.token, { titulo: MARCA, contexto: { rota: '/obras' } })).dados;
  criado.conversas.push(conv.id);
  await caso('conversa é pessoal', async () => {
    assert.strictEqual((await req('GET', `/api/assistente/conversas/${conv.id}`, ub.token)).status, 404);
    assert.strictEqual((await req('GET', `/api/assistente/conversas/${conv.id}`, ua.token)).status, 200);
    assert.ok(!(await req('GET', '/api/assistente/conversas', ub.token)).dados.some(c => c.id === conv.id));
  });

  S.registrarExecucao({ exec: 'teste-exec-1', conversaId: conv.id, usuarioId: ua.id });
  const tokAssist = S.emitirTokenAssistente({ usuarioId: ua.id, conversaId: conv.id, exec: 'teste-exec-1' });

  await caso('token do assistente: rotas não permitidas → 403; escopo forjado/execução errada → 401', async () => {
    assert.strictEqual((await req('GET', '/api/obras?porPagina=2', tokAssist)).status, 200);
    for (const [m, c, corpo] of [['GET', '/api/usuarios'], ['PATCH', '/api/propostas/1/status', { status: 'Aprovada' }], ['DELETE', '/api/propostas/1'],
      ['POST', '/api/propostas/1/enviar-email', { destinatario: 'x@exemplo.invalid' }], ['POST', '/api/propostas/1/link-aprovacao', {}],
      ['PUT', '/api/materiais/1', { preco: 1 }], ['POST', '/api/assistente/acoes/1/aplicar'], ['POST', `/api/assistente/conversas/${conv.id}/mensagens`, { texto: 'oi' }],
      ['DELETE', '/api/projetos/analises/1'], ['PUT', '/api/obras/1', {}], ['POST', '/api/laudos', { disciplina: 'cftv', tipo: 'laudo' }]]) {
      const r = await req(m, c, tokAssist, corpo);
      assert.strictEqual(r.status, 403, `${m} ${c} → ${r.status}`);
      assert.match(r.dados.codigo, /^ASSISTENTE_/);
    }
    const forjado = jwt.sign({ id: ua.id, escopo: 'admin', conv: conv.id, exec: 'teste-exec-1' }, JWT_SECRET, { expiresIn: '1h' });
    assert.strictEqual((await req('GET', '/api/obras', forjado)).status, 401);
    const outraConv = S.emitirTokenAssistente({ usuarioId: ua.id, conversaId: conv.id + 999, exec: 'teste-exec-1' });
    assert.strictEqual((await req('GET', '/api/obras', outraConv)).status, 401);
    // rotas das ferramentas: só com o token do assistente
    assert.strictEqual((await req('GET', '/api/assistente/ferramentas/arquivos', ua.token)).status, 403);
  });

  const { cliente, chamar } = await clienteMcp(tokAssist);
  await caso('MCP do assistente: lista de ferramentas = liberadas, sem as proibidas', async () => {
    const { tools } = await cliente.listTools();
    assert.deepStrictEqual(tools.map(t => t.name).sort(), F.FERRAMENTAS.map(f => f.nome).sort());
    for (const t of tools) assert.ok(!F.PROIBIDAS.test(t.name), t.name);
  });

  // ── arquivos ─────────────────────────────────────────────────────────
  const upload = async (token, nome, buffer, convId = conv.id) => {
    const form = new FormData();
    form.append('arquivos', new Blob([buffer]), nome);
    return req('POST', `/api/assistente/conversas/${convId}/arquivos`, token, undefined, { form });
  };
  let arquivoPdf;
  await caso('upload: tipo pelo conteúdo, tamanho máximo, conversa de outro', async () => {
    const r = await upload(ua.token, 'Projeto CFTV Térreo.pdf', pdfCftvSintetico());
    assert.strictEqual(r.status, 201, JSON.stringify(r.dados));
    arquivoPdf = r.dados[0];
    assert.strictEqual(arquivoPdf.tipo, 'pdf');
    assert.strictEqual(arquivoPdf.nome, 'Projeto CFTV Térreo.pdf');
    assert.strictEqual((await upload(ua.token, 'projeto.pdf', Buffer.from('MZ\x90\0\x03\0\0\0 executavel'))).status, 415);
    process.env.ASSISTENTE_UPLOAD_MB = '1';
    assert.strictEqual((await upload(ua.token, 'grande.pdf', Buffer.concat([pdfCftvSintetico(), Buffer.alloc(1100000, 32)]))).status, 413);
    delete process.env.ASSISTENTE_UPLOAD_MB;
    assert.strictEqual((await upload(ub.token, 'x.pdf', pdfCftvSintetico())).status, 404);
  });

  await caso('ler_arquivo: resultado dos leitores, marcado como conteúdo de terceiros', async () => {
    const r = await chamar('ler_arquivo', { arquivo_id: arquivoPdf.id });
    assert.ok(!r.erro, r.texto);
    assert.match(r.texto, /CONTEÚDO DE TERCEIROS/);
    assert.match(r.texto, /ESCOLA MODELO TESTE ASSISTENTE/);
    // arquivo de outra conversa: invisível
    assert.ok((await chamar('ler_arquivo', { arquivo_id: arquivoPdf.id + 100000 })).erro);
  });

  // ── rascunho criado pelo assistente ─────────────────────────────────
  let analiseId; let propostaAssist;
  await caso('analisar_arquivo + gerar_orcamento: análise e rascunho marcados com a conversa', async () => {
    const r = await chamar('analisar_arquivo', { arquivo_id: arquivoPdf.id, disciplinas: ['cftv'], finalidade: 'orcamento', nome_projeto: MARCA });
    assert.ok(!r.erro, r.texto);
    analiseId = Number(r.texto.match(/Análise de projeto #(\d+)/)[1]);
    criado.analises.add(analiseId);
    assert.match(r.texto, /Câmeras \(código CAM\): 6/);
    const { rows: [a] } = await pool.query('SELECT assistente_conversa_id, finalidade, usuario_id FROM analises_projeto WHERE id = $1', [analiseId]);
    assert.strictEqual(a.assistente_conversa_id, conv.id);
    assert.strictEqual(a.usuario_id, ua.id);
    const g = await chamar('gerar_orcamento', { origem: 'analise', id: analiseId });
    assert.ok(!g.erro, g.texto);
    propostaAssist = Number(g.texto.match(/\/propostas\/editar\/(\d+)/)[1]);
    criado.propostas.add(propostaAssist);
    const { rows: [p] } = await pool.query('SELECT assistente_conversa_id, status FROM propostas WHERE id = $1', [propostaAssist]);
    assert.strictEqual(p.assistente_conversa_id, conv.id);
    assert.strictEqual(p.status, 'Ativa');
    const e = await chamar('editar_rascunho', { proposta_id: propostaAssist, campos: { bdi: 12 } });
    assert.ok(!e.erro, e.texto);
    assert.strictEqual(Number((await pool.query('SELECT bdi FROM propostas WHERE id = $1', [propostaAssist])).rows[0].bdi), 12);
    assert.ok(S.obterExecucao('teste-exec-1').criados.some(c => c.tipo === 'proposta' && c.id === propostaAssist));
  });

  await caso('editar proposta que ele não criou nesta conversa → negado (mesmo sendo do usuário)', async () => {
    const minha = await req('POST', '/api/propostas', ua.token, { data: '2026-10-28', cliente_nome: MARCA, secoes: [{ id: 1, nome: 'Serviços (Mão de Obra)' }], itens: [{ sid: 1, desc: `${MARCA} serviço`, qtd: 1, vu: 10 }] });
    assert.strictEqual(minha.status, 201, JSON.stringify(minha.dados));
    criado.propostas.add(minha.dados.id);
    const r = await chamar('editar_rascunho', { proposta_id: minha.dados.id, campos: { bdi: 50 } });
    assert.ok(r.erro);
    assert.match(r.texto, /só altera o que ele mesmo criou/);
    assert.strictEqual(Number((await pool.query('SELECT bdi FROM propostas WHERE id = $1', [minha.dados.id])).rows[0].bdi), 0);
    // gerar orçamento de análise que não é dele também é negado
    const outraAnalise = await pool.query(`SELECT id FROM analises_projeto WHERE assistente_conversa_id IS DISTINCT FROM $1 LIMIT 1`, [conv.id]);
    if (outraAnalise.rows[0]) assert.ok((await chamar('gerar_orcamento', { origem: 'analise', id: outraAnalise.rows[0].id })).erro);
  });

  await caso('posse continua valendo: proposta de outro usuário não é alterada', async () => {
    const deB = await req('POST', '/api/propostas', ub.token, { data: '2026-10-28', cliente_nome: MARCA, secoes: [{ id: 1, nome: 'Serviços (Mão de Obra)' }], itens: [{ sid: 1, desc: `${MARCA} serviço`, qtd: 1, vu: 10 }] });
    criado.propostas.add(deB.dados.id);
    // mesmo marcada como desta conversa (forçado no banco), a posse barra
    await pool.query('UPDATE propostas SET assistente_conversa_id = $1 WHERE id = $2', [conv.id, deB.dados.id]);
    const r = await chamar('editar_rascunho', { proposta_id: deB.dados.id, campos: { bdi: 50 } });
    assert.ok(r.erro);
    assert.match(r.texto, /criada por outro usuário/);
  });

  // ── ações pendentes ─────────────────────────────────────────────────
  await caso('aprovar vira ação pendente; só o clique do usuário aplica (uma vez)', async () => {
    const r = await chamar('propor_acao', { tipo: 'mudar_status_proposta', alvo_id: propostaAssist, descricao: 'Cliente confirmou por telefone', dados: { status: 'Aprovada' } });
    assert.ok(!r.erro, r.texto);
    const acaoId = Number(r.texto.match(/Ação #(\d+)/)[1]);
    assert.match(r.texto, /PENDENTE/);
    assert.strictEqual((await pool.query('SELECT status FROM propostas WHERE id = $1', [propostaAssist])).rows[0].status, 'Ativa');
    const { rows: [acao] } = await pool.query('SELECT * FROM assistente_acoes WHERE id = $1', [acaoId]);
    assert.strictEqual(acao.status, 'pendente');
    assert.match(acao.descricao, /Mudar o status da proposta P\d+/);
    assert.ok(S.obterExecucao('teste-exec-1').acoes.some(a => a.id === acaoId));
    // inválida: recusada já ao propor
    assert.match((await chamar('propor_acao', { tipo: 'mudar_status_proposta', alvo_id: propostaAssist, descricao: 'x', dados: { status: 'Qualquer' } })).texto, /Status inválido/);
    // o assistente não aplica; outro usuário nem enxerga
    assert.strictEqual((await req('POST', `/api/assistente/acoes/${acaoId}/aplicar`, tokAssist)).status, 403);
    assert.strictEqual((await req('POST', `/api/assistente/acoes/${acaoId}/aplicar`, ub.token)).status, 404);
    // o usuário aplica (aplicar chama a rota da tela — o servidor de teste)
    process.env.ASSISTENTE_API_URL = base;
    const ap = await req('POST', `/api/assistente/acoes/${acaoId}/aplicar`, ua.token);
    assert.strictEqual(ap.status, 200, JSON.stringify(ap.dados));
    assert.strictEqual(ap.dados.status, 'aplicada');
    assert.strictEqual((await pool.query('SELECT status FROM propostas WHERE id = $1', [propostaAssist])).rows[0].status, 'Aprovada');
    assert.strictEqual((await req('POST', `/api/assistente/acoes/${acaoId}/aplicar`, ua.token)).status, 409);
    // descartar não executa
    const ex = await chamar('propor_acao', { tipo: 'excluir_proposta', alvo_id: propostaAssist, descricao: 'teste' });
    const exId = Number(ex.texto.match(/Ação #(\d+)/)[1]);
    assert.strictEqual((await req('POST', `/api/assistente/acoes/${exId}/descartar`, ua.token)).dados.status, 'descartada');
    assert.strictEqual((await pool.query('SELECT count(*)::int AS n FROM propostas WHERE id = $1', [propostaAssist])).rows[0].n, 1);
  });

  await cliente.close();
  S.encerrarExecucao('teste-exec-1');
  await caso('terminada a execução, o token do assistente deixa de valer', async () => {
    assert.strictEqual((await req('GET', '/api/obras', tokAssist)).status, 401);
  });

  // ── mensagens (Claude Code falso) ───────────────────────────────────
  const registro = path.join(os.tmpdir(), `hm-assist-integ-${process.pid}.jsonl`);
  await caso('mensagem em streaming: texto, passos, gravação e retomada da sessão', async () => {
    gerenciadorFalso('conversa-obras.jsonl', registro);
    const r = await mensagemStream(conv.id, ua.token, 'o que temos em obras?', { contexto: { rota: '/obras', obra_id: 'abc' } });
    assert.strictEqual(r.status, 200, JSON.stringify(r.dados));
    const tipos = r.eventos.map(e => e.tipo);
    for (const t of ['mensagens', 'executando', 'texto', 'ferramenta_inicio', 'ferramenta_fim', 'fim']) assert.ok(tipos.includes(t), `faltou ${t}`);
    const fim = r.eventos.find(e => e.tipo === 'fim').mensagem;
    assert.strictEqual(fim.status, 'concluida');
    assert.match(fim.texto, /Temos \*\*2 obras\*\*/);
    assert.strictEqual(fim.passos.filter(p => p.tipo === 'ferramenta').length, 1);
    const { rows: [c] } = await pool.query('SELECT session_id, sessao_iniciada, titulo FROM assistente_conversas WHERE id = $1', [conv.id]);
    assert.ok(c.sessao_iniciada);
    const r2 = await mensagemStream(conv.id, ua.token, 'e a primeira?');
    assert.strictEqual(r2.eventos.find(e => e.tipo === 'fim').mensagem.status, 'concluida');
    const chamadas = fs.readFileSync(registro, 'utf8').trim().split('\n').map(l => JSON.parse(l));
    const ultima = chamadas[chamadas.length - 1];
    assert.strictEqual(ultima[ultima.indexOf('--resume') + 1], c.session_id);
    assert.match(chamadas[0][1], /\[Contexto da tela: tela \/obras\]/); // id inválido no contexto ignorado
  });

  await caso('sessão do Claude Code perdida: começa outra com o resumo da conversa', async () => {
    fs.writeFileSync(registro, '');
    gerenciadorFalso('conversa-sessao-perdida.jsonl', registro);
    const r = await mensagemStream(conv.id, ua.token, 'continue');
    assert.strictEqual(r.eventos.find(e => e.tipo === 'fim').mensagem.status, 'concluida');
    const chamadas = fs.readFileSync(registro, 'utf8').trim().split('\n').map(l => JSON.parse(l));
    assert.strictEqual(chamadas.length, 2);
    assert.ok(chamadas[0].includes('--resume') && chamadas[1].includes('--session-id'));
    assert.match(chamadas[1][1], /não pôde ser retomada/);
  });

  await caso('parar: a execução é interrompida e a mensagem fica "cancelada"', async () => {
    gerenciadorFalso('conversa-dorme.jsonl', registro);
    const pendente = mensagemStream(conv.id, ua.token, 'demora');
    await new Promise(r => setTimeout(r, 800));
    assert.strictEqual((await req('POST', `/api/assistente/conversas/${conv.id}/mensagens`, ua.token, { texto: 'outra' })).status, 409);
    assert.strictEqual((await req('POST', `/api/assistente/conversas/${conv.id}/cancelar`, ua.token)).dados.cancelado, true);
    const r = await pendente;
    const fim = r.eventos.find(e => e.tipo === 'fim').mensagem;
    assert.strictEqual(fim.status, 'cancelada');
  });

  await caso('cota da assinatura esgotada: mensagem clara', async () => {
    gerenciadorFalso('conversa-cota-esgotada.jsonl', registro);
    const r = await mensagemStream(conv.id, ua.token, 'oi');
    const fim = r.eventos.find(e => e.tipo === 'fim').mensagem;
    assert.strictEqual(fim.status, 'erro');
    assert.match(fim.erro, /cota da assinatura/);
  });

  await caso('limite diário por usuário', async () => {
    process.env.ASSISTENTE_LIMITE_DIARIO = '2';
    const r = await req('POST', `/api/assistente/conversas/${conv.id}/mensagens`, ua.token, { texto: 'mais uma' });
    delete process.env.ASSISTENTE_LIMITE_DIARIO;
    assert.strictEqual(r.status, 429);
    assert.match(r.dados.erro, /Limite diário/);
  });

  await caso('conversa guarda mensagens, passos e ações; arquivar', async () => {
    const r = await req('GET', `/api/assistente/conversas/${conv.id}`, ua.token);
    assert.ok(r.dados.mensagens.length >= 8);
    assert.ok(r.dados.acoes.length >= 2);
    assert.ok(!('session_id' in r.dados));
    assert.strictEqual((await req('PATCH', `/api/assistente/conversas/${conv.id}`, ua.token, { arquivada: true })).dados.arquivada, true);
    assert.strictEqual((await req('POST', `/api/assistente/conversas/${conv.id}/mensagens`, ua.token, { texto: 'oi' })).status, 409);
  });
  fs.rmSync(registro, { force: true });
}

async function limpar() {
  try {
    const ids = [...criado.propostas];
    const marcadas = (await pool.query('SELECT id FROM propostas WHERE assistente_conversa_id = ANY($1::int[])', [criado.conversas])).rows.map(r => r.id);
    const todas = [...new Set([...ids, ...marcadas])];
    const descricoes = todas.length ? (await pool.query('SELECT DISTINCT descricao FROM proposta_itens WHERE proposta_id = ANY($1::int[])', [todas])).rows.map(r => r.descricao) : [];
    // pastas das análises criadas (Arquivos do Sistema de teste)
    const analises = (await pool.query('SELECT * FROM analises_projeto WHERE id = ANY($1::int[]) OR assistente_conversa_id = ANY($2::int[])', [[...criado.analises], criado.conversas])).rows;
    for (const a of analises) if (a.pasta && !a.pasta_obra_id) fs.rmSync(P.caminhoDe('projeto', a.pasta), { recursive: true, force: true });
    await pool.query('DELETE FROM propostas WHERE id = ANY($1::int[])', [todas]);
    await pool.query('DELETE FROM laudos_projetos WHERE assistente_conversa_id = ANY($1::int[])', [criado.conversas]);
    await pool.query('DELETE FROM analises_projeto WHERE id = ANY($1::int[])', [analises.map(a => a.id)]);
    for (const c of criado.conversas) fs.rmSync(pastaDaConversa(c), { recursive: true, force: true });
    try { fs.rmdirSync(path.dirname(pastaDaConversa(0))); } catch { /* não está vazia (uso real) ou não existe */ }
    await pool.query('DELETE FROM assistente_conversas WHERE id = ANY($1::int[])', [criado.conversas]);
    if (snapshot) {
      // material/serviço que o salvamento das propostas de teste cadastrou sozinho
      await pool.query("DELETE FROM materiais WHERE id > $1 AND origem = 'proposta' AND descricao = ANY($2::text[])", [snapshot.material, descricoes]);
      await pool.query('DELETE FROM mao_de_obra_itens WHERE id > $1 AND descricao = ANY($2::text[])', [snapshot.maoDeObra, descricoes]);
      await pool.query("DELETE FROM precos_mao_de_obra_referencia WHERE origem = 'proposta' AND NOT (codigo = ANY($1::text[])) AND descricao = ANY($2::text[])", [snapshot.servicos, descricoes]);
      await pool.query("UPDATE configuracoes SET valor = $1 WHERE chave = 'proximo_numero'", [snapshot.proximo]);
    }
    await pool.query('DELETE FROM usuarios WHERE id = ANY($1::int[])', [criado.usuarios]);
  } catch (e) {
    console.error('assistenteIntegracao: falha na limpeza —', e.message);
    process.exitCode = 1;
  }
}

principal()
  .then(() => console.log(`assistenteIntegracao: ${ok} casos ok`))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    await limpar();
    if (servidor) servidor.close();
    await pool.end().catch(() => {});
    setTimeout(() => process.exit(process.exitCode || 0), 200).unref();
  });
