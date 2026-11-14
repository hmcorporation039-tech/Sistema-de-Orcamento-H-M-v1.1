// Agentes próprios — integração com o BANCO DE TESTE (hm_orcamentos_v2) e a API de verdade numa porta livre, com
// dados SINTÉTICOS e SEM gastar cota (o suporte Claude Max e a IA do chat usam o Claude Code FALSO). Confere:
//   - rotas com autenticar; execução só do dono/admin; aprovar regra só admin; token do assistente não aprova;
//   - agente de análise (PDF sintético) → análise criada e marcada na conversa; agente de orçamento → rascunho +
//     planilha QF-CAG; NÃO sobrescreve a proposta de outra conversa nem mexe na análise de outro usuário;
//   - agente de pesquisa de preços (lista) e de quadro (aguardando módulo);
//   - agente sem resposta → suporte Claude Max → sugestão PENDENTE; aprovada → da próxima vez sai da base, sem IA;
//   - chat: o roteador manda o pedido comum ao agente (provedor 'agente', não conta no limite de IA) e o resto à IA;
//     pedido que caiu na IA e virou executar_agente → regra sugerida; o admin aprova → o roteador passa a usar;
//     "aprovar como conhecimento" numa resposta da IA → a mesma pergunta sai da base, sem IA.
// Só roda com DB_NAME=hm_orcamentos_v2; apaga tudo o que cria (e restaura o próximo número de proposta).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.COTACAO_IA = 'desligada';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BANCO_DE_TESTE = 'hm_orcamentos_v2';
if (process.env.DB_NAME !== BANCO_DE_TESTE) {
  console.log(`agentesIntegracao: pulado (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  process.exit(0);
}

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const { criarTabelas } = require('../src/models/schema');
const { JWT_SECRET } = require('../src/config/segredos');
const S = require('../src/services/assistente/sessoes');
const E = require('../src/services/assistente/execucao');
const F = require('../src/services/assistente/ferramentas');
const P = require('../src/services/pastasSistema');
const X = require('../src/services/agentes/executor');
const SUP = require('../src/services/agentes/suporteClaude');
const ROT = require('../src/services/agentes/roteador');
const AQ = require('../src/services/agentes/adaptadorQuadros');
const { pastaDaConversa } = require('../src/services/assistente/arquivos');
const { pdfCftvSintetico } = require('./fixtures/assistente/pdfProjetoSintetico');

const FIX = path.join(__dirname, 'fixtures', 'assistente');
const MARCA = `TESTE AGENTES ${Date.now()}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-agentes-teste-'));
const usuarios = [];
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
  return { status: r.status, eventos, fim: eventos.find(e => e.tipo === 'fim')?.mensagem };
}

async function criarUsuario(sufixo, role = 'user') {
  const { rows: [u] } = await pool.query(
    `INSERT INTO usuarios (nome, email, senha, role, ativo, senha_provisoria) VALUES ($1,$2,'x-sem-login',$3,true,false) RETURNING id, nome, email, role`,
    [`${MARCA} ${sufixo}`, `teste-agentes-${sufixo}-${Date.now()}@exemplo.invalid`, role]);
  usuarios.push(u.id);
  return { ...u, token: jwt.sign({ id: u.id, nome: u.nome, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' }) };
}

async function upload(token, conversaId, nome, buffer, tipo = 'application/pdf') {
  const form = new FormData();
  form.append('arquivos', new Blob([buffer], { type: tipo }), nome);
  return req('POST', `/api/assistente/conversas/${conversaId}/arquivos`, token, undefined, { form });
}

const caso = async (nome, fn) => {
  try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`FALHOU: ${nome}`); throw e; }
};

// PDF sintético SEM disciplina no texto (o agente não consegue deduzir → suporte)
function pdfNeutro() {
  const conteudo = 'BT /F1 12 Tf 100 700 Td (FOLHA 01 - DESENHO GENERICO SEM TITULO) Tj ET';
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let pdf = '%PDF-1.4\n'; const pos = [];
  objs.forEach((o, i) => { pos.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${pos.map(p => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

function roteiroSuporte() {
  const texto = '**Resposta:** identifique a disciplina pelo carimbo sintético.\n**Regra sugerida:** nenhuma.\n**Fontes:** base de conhecimento.';
  const p = path.join(tmp, 'suporte.jsonl');
  fs.writeFileSync(p, [
    { type: 'system', subtype: 'init', tools: F.ferramentasDoSuporte({ consultor: false }), session_id: '__SESSAO__' },
    { type: 'assistant', message: { id: 'm1', role: 'assistant', content: [{ type: 'text', text: texto }] }, session_id: '__SESSAO__' },
    { type: 'result', subtype: 'success', is_error: false, result: texto, session_id: '__SESSAO__' },
  ].map(l => JSON.stringify(l)).join('\n'));
  return p;
}

async function principal() {
  await criarTabelas();
  servidor = app().listen(0, '127.0.0.1');
  await new Promise(r => servidor.once('listening', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
  snapshot = {
    proximo: (await pool.query("SELECT valor FROM configuracoes WHERE chave = 'proximo_numero'")).rows[0].valor,
    material: (await pool.query('SELECT COALESCE(max(id),0)::int AS m FROM materiais')).rows[0].m,
    maoDeObra: (await pool.query('SELECT COALESCE(max(id),0)::int AS m FROM mao_de_obra_itens')).rows[0].m,
    servicos: (await pool.query('SELECT codigo FROM precos_mao_de_obra_referencia')).rows.map(r => r.codigo),
  };
  X.substituirExecutor(X.criarExecutor({ apiUrl: base }));
  const registroArgs = path.join(tmp, 'args.jsonl');
  SUP.configurarParaTeste({ comando: process.execPath, prefixo: [path.join(FIX, 'cli-falso.js'), roteiroSuporte(), registroArgs], statusLogin: async () => ({ instalado: true, logado: true }), config: { ligado: true, apiUrl: base, tempoLimiteMs: 20000 } });
  E.substituirGerenciador(E.criarGerenciador({ config: { apiUrl: base, tempoLimiteMs: 20000, limiteDiario: 0 }, comando: process.execPath, prefixo: [path.join(FIX, 'cli-falso.js'), path.join(FIX, 'conversa-obras.jsonl'), registroArgs] }));

  const ua = await criarUsuario('a');
  const ub = await criarUsuario('b');
  const adm = await criarUsuario('adm', 'admin');
  const conv = (await req('POST', '/api/assistente/conversas', ua.token, { titulo: MARCA })).dados;

  await caso('rotas com autenticar; registro dos agentes; quadro aguardando o módulo', async () => {
    for (const [m, c] of [['GET', '/api/agentes'], ['POST', '/api/agentes/execucoes'], ['GET', '/api/agentes/execucoes/1'], ['GET', '/api/agentes/conhecimento'], ['PUT', '/api/agentes/sugestoes/1'], ['GET', '/api/agentes/indicadores']]) {
      assert.strictEqual((await req(m, c, null, m === 'GET' ? undefined : {})).status, 401, `${m} ${c}`);
    }
    const r = await req('GET', '/api/agentes', ua.token);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.dados.agentes.length, 5);
    assert.strictEqual(r.dados.agentes.find(a => a.chave === 'quadro_especificacao').situacao, AQ.moduloDisponivel() ? 'pronto' : 'aguardando_modulo');
    const k = await req('GET', '/api/agentes/conhecimento?disciplina=quadros&busca=Icc%20borne', ua.token);
    assert.match(k.dados.texto, /Icc/);
  });

  const pdf = (await upload(ua.token, conv.id, 'Projeto CFTV Terreo sintetico.pdf', pdfCftvSintetico())).dados[0];
  let analiseId;
  await caso('agente de análise: PDF sintético → análise marcada na conversa, objetivo, achados', async () => {
    const r = await req('POST', '/api/agentes/execucoes', ua.token, { agente: 'analise_projeto', entrada: { arquivo_id: pdf.id, disciplinas: ['cftv'] }, conversa_id: conv.id, aguardar: true });
    assert.strictEqual(r.status, 200, JSON.stringify(r.dados));
    assert.strictEqual(r.dados.status, 'concluida', r.dados.texto || r.dados.erro);
    analiseId = r.dados.resultado.dados.analise_id;
    assert.ok(analiseId);
    const { rows: [a] } = await pool.query('SELECT assistente_conversa_id FROM analises_projeto WHERE id = $1', [analiseId]);
    assert.strictEqual(a.assistente_conversa_id, conv.id);
    assert.match(r.dados.texto, /O que é o projeto/);
    assert.ok(r.dados.passos.find(p => p.chave === 'analisar').status === 'concluido');
    // arquivo de outra conversa: 400
    assert.strictEqual((await req('POST', '/api/agentes/execucoes', ua.token, { agente: 'analise_projeto', entrada: { arquivo_id: pdf.id } })).status, 400);
    // entrada inválida: 400; agente desconhecido: 400
    assert.strictEqual((await req('POST', '/api/agentes/execucoes', ua.token, { agente: 'analise_projeto', entrada: {} })).status, 400);
    assert.strictEqual((await req('POST', '/api/agentes/execucoes', ua.token, { agente: 'apagar_tudo', entrada: {} })).status, 400);
  });

  let execOrc; let propostaId;
  await caso('agente de orçamento: rascunho pelo motor + planilha QF-CAG na conversa', async () => {
    const r = await req('POST', '/api/agentes/execucoes', ua.token, { agente: 'orcamento', entrada: { analise_id: analiseId }, conversa_id: conv.id, aguardar: true });
    assert.strictEqual(r.dados.status, 'concluida', r.dados.texto || r.dados.erro);
    execOrc = r.dados;
    propostaId = r.dados.resultado.dados.proposta_id;
    const { rows: [p] } = await pool.query('SELECT assistente_conversa_id, status FROM propostas WHERE id = $1', [propostaId]);
    assert.strictEqual(p.assistente_conversa_id, conv.id);
    assert.ok(r.dados.resultado.arquivos.some(a => a.tipo === 'xlsx'), 'planilha QF-CAG salva na conversa');
    assert.match(r.dados.texto, /Não inclui mão de obra, BDI nem itens fornecidos pelo cliente/);
    assert.ok(r.dados.passos.find(x => x.chave === 'mercado').status === 'pulado', 'web só com permissão');
  });

  await caso('não destrutivo: outra conversa do dono não sobrescreve a proposta; outro usuário não mexe na análise', async () => {
    const antes = (await pool.query('SELECT total, atualizado_em FROM propostas WHERE id = $1', [propostaId])).rows[0];
    const r = await req('POST', '/api/agentes/execucoes', ua.token, { agente: 'orcamento', entrada: { analise_id: analiseId }, aguardar: true });
    assert.strictEqual(r.dados.status, 'pendente', r.dados.texto);
    assert.match(r.dados.texto, /não sobrescrevo/);
    const rb = await req('POST', '/api/agentes/execucoes', ub.token, { agente: 'orcamento', entrada: { analise_id: analiseId }, aguardar: true });
    assert.strictEqual(rb.dados.status, 'pendente', rb.dados.texto);
    const depois = (await pool.query('SELECT total, atualizado_em FROM propostas WHERE id = $1', [propostaId])).rows[0];
    assert.deepStrictEqual(depois, antes);
  });

  await caso('execução: só o dono ou o admin vê e cancela', async () => {
    assert.strictEqual((await req('GET', `/api/agentes/execucoes/${execOrc.id}`, ub.token)).status, 403);
    assert.strictEqual((await req('GET', `/api/agentes/execucoes/${execOrc.id}`, ua.token)).status, 200);
    assert.strictEqual((await req('GET', `/api/agentes/execucoes/${execOrc.id}`, adm.token)).status, 200);
    assert.strictEqual((await req('POST', `/api/agentes/execucoes/${execOrc.id}/cancelar`, ub.token, {})).status, 403);
    assert.ok(!(await req('GET', '/api/agentes/execucoes', ub.token)).dados.some(e => e.id === execOrc.id));
  });

  await caso('agente de projeto: disciplina única da análise → projeto da skill e cálculo', async () => {
    const r = await req('POST', '/api/agentes/execucoes', ua.token, { agente: 'projeto_disciplina', entrada: { analise_id: analiseId }, conversa_id: conv.id, aguardar: true });
    assert.ok(['concluida', 'pendente'].includes(r.dados.status), r.dados.texto || r.dados.erro);
    assert.ok(r.dados.resultado.dados.projeto_id, 'projeto criado');
    assert.match(r.dados.texto, /CFTV/);
    console.log(`     projeto: ${r.dados.status}; passos ${r.dados.passos.map(p => `${p.chave}=${p.status}`).join(', ')}; ${r.dados.resultado.arquivos.length} documento(s)`);
  });

  await caso('agente de pesquisa de preços (lista) e de quadro (aguardando módulo)', async () => {
    const r = await req('POST', '/api/agentes/execucoes', ua.token, { agente: 'pesquisa_precos', entrada: { itens: [{ descricao: `${MARCA} material sintético sem referência`, quantidade: 3 }, { descricao: 'Cabo sintético cliente', quantidade: 10, preco_cliente: 4.5 }] }, conversa_id: conv.id, aguardar: true });
    assert.strictEqual(r.dados.status, 'concluida', r.dados.texto);
    assert.strictEqual(r.dados.resultado.dados.totais.subtotal, 45);
    assert.strictEqual(r.dados.resultado.dados.totais.a_cotar, 1);
    const q = await req('POST', '/api/agentes/execucoes', ua.token, { agente: 'quadro_especificacao', entrada: { texto: 'Quadro sintético 380 V com duas bombas de 10 cv' }, conversa_id: conv.id, aguardar: true });
    if (AQ.moduloDisponivel()) console.log('     (módulo do quadro presente: caso "aguardando" pulado)');
    else { assert.strictEqual(q.dados.status, 'aguardando_modulo'); assert.match(q.dados.texto, /FL01/); }
  });

  let sugestaoId;
  await caso('sem resposta → suporte Claude Max (só leitura) → sugestão PENDENTE; aprovada, sai da base sem IA', async () => {
    const neutro = (await upload(ua.token, conv.id, 'folha 01.pdf', pdfNeutro())).dados[0];
    const usoAntes = (await pool.query('SELECT count(*)::int AS n FROM agentes_suporte WHERE usuario_id = $1', [ua.id])).rows[0].n;
    const r = await req('POST', '/api/agentes/execucoes', ua.token, { agente: 'analise_projeto', entrada: { arquivo_id: neutro.id }, conversa_id: conv.id, aguardar: true });
    assert.strictEqual(r.dados.status, 'pendente', r.dados.texto);
    sugestaoId = r.dados.resultado.suporte?.sugestao_id;
    assert.ok(sugestaoId, `sem suporte: ${r.dados.texto}`);
    assert.match(r.dados.texto, /Suporte Claude Max/);
    const { rows: [s] } = await pool.query('SELECT situacao, fonte, tipo FROM agentes_sugestoes WHERE id = $1', [sugestaoId]);
    assert.deepStrictEqual(s, { situacao: 'pendente', fonte: 'claude-max', tipo: 'conhecimento' });
    assert.strictEqual((await pool.query('SELECT count(*)::int AS n FROM agentes_suporte WHERE usuario_id = $1', [ua.id])).rows[0].n, usoAntes + 1);
    // ub não aprova a sugestão de ua; ua aprova
    assert.strictEqual((await req('PUT', `/api/agentes/sugestoes/${sugestaoId}`, ub.token, { situacao: 'aprovada' })).status, 403);
    assert.strictEqual((await req('PUT', `/api/agentes/sugestoes/${sugestaoId}`, ua.token, { situacao: 'aprovada' })).status, 200);
    const r2 = await req('POST', '/api/agentes/execucoes', ua.token, { agente: 'analise_projeto', entrada: { arquivo_id: neutro.id }, conversa_id: conv.id, aguardar: true });
    assert.strictEqual(r2.dados.resultado.suporte?.base_aprovada, true, r2.dados.texto);
    assert.match(r2.dados.texto, /base de conhecimento aprovada \(sem IA\)/);
    assert.strictEqual((await pool.query('SELECT count(*)::int AS n FROM agentes_suporte WHERE usuario_id = $1', [ua.id])).rows[0].n, usoAntes + 1, 'não pediu o Claude de novo');
  });

  const chat = (await req('POST', '/api/assistente/conversas', ua.token, { titulo: `${MARCA} chat` })).dados;
  let respostaIa; let respostaIa2;
  await caso('chat: pedido comum → agente próprio sem IA (não conta no limite); o resto → IA', async () => {
    const csv = (await upload(ua.token, chat.id, 'lista sintetica.csv', Buffer.from('Descrição;Qtd;Un\nMaterial sintético A;2;un\n'), 'text/csv')).dados[0];
    const usadas = (await req('GET', '/api/assistente/status', ua.token)).dados.usadasHoje;
    const m = await mensagemStream(chat.id, ua.token, 'pesquise os preços desta lista', { arquivos: [csv.id] });
    assert.strictEqual(m.status, 200);
    assert.strictEqual(m.fim.provedor, 'agente');
    assert.ok(m.fim.agente_execucao_id && m.fim.agente_pedido_id);
    assert.match(m.fim.texto, /Agente de pesquisa de preços/);
    assert.ok(m.fim.criados.some(c => c.tipo === 'arquivo'), 'planilha como arquivo da conversa');
    assert.ok(m.eventos.some(e => e.tipo === 'ferramenta_inicio' && /agente:/.test(e.nome)));
    const { rows: [p] } = await pool.query('SELECT decisao, agente, execucao_id FROM agentes_pedidos WHERE id = $1', [m.fim.agente_pedido_id]);
    assert.deepStrictEqual([p.decisao, p.agente, p.execucao_id], ['agente', 'pesquisa_precos', m.fim.agente_execucao_id]);
    assert.strictEqual((await req('GET', '/api/assistente/status', ua.token)).dados.usadasHoje, usadas, 'agente próprio não conta no limite de IA');
    const ia = await mensagemStream(chat.id, ua.token, 'quero o levantamento quantitativo dos materiais da obra');
    assert.strictEqual(ia.fim.provedor, 'claude_max');
    respostaIa = ia.fim;
    assert.strictEqual((await pool.query('SELECT decisao FROM agentes_pedidos WHERE resposta_id = $1', [ia.fim.id])).rows[0].decisao, 'ia');
    // avaliação: só quem pediu
    assert.strictEqual((await req('POST', `/api/agentes/pedidos/${m.fim.agente_pedido_id}/avaliacao`, ub.token, { aceito: true })).status, 403);
    assert.strictEqual((await req('POST', `/api/agentes/pedidos/${m.fim.agente_pedido_id}/avaliacao`, ua.token, { aceito: true })).dados.aceito, true);
    const ia2 = await mensagemStream(chat.id, ua.token, 'qual norma rege a iluminação de emergência sintética');
    respostaIa2 = ia2.fim;
  });

  await caso('aprendizado do vocabulário: IA → executar_agente vira regra SUGERIDA; só o admin aprova; aprovada, o roteador usa', async () => {
    const exec = S.novoIdExecucao();
    S.registrarExecucao({ exec, conversaId: chat.id, usuarioId: ua.id, mensagemId: respostaIa.id });
    const token = S.emitirTokenAssistente({ usuarioId: ua.id, conversaId: chat.id, exec });
    try {
      const r = await req('POST', '/api/agentes/execucoes', token, { agente: 'pesquisa_precos', entrada: { itens: [{ descricao: 'Material sintético B', quantidade: 1 }] }, aguardar: true });
      assert.strictEqual(r.status, 200, JSON.stringify(r.dados));
      // o token do assistente não aprova nada
      assert.strictEqual((await req('PUT', '/api/agentes/sugestoes/1', token, { situacao: 'aprovada' })).status, 403);
      assert.strictEqual((await req('POST', `/api/assistente/mensagens/${respostaIa.id}/conhecimento`, token, {})).status, 403);
    } finally { S.encerrarExecucao(exec); }
    await new Promise(r => setTimeout(r, 300));
    const { rows: [s] } = await pool.query(`SELECT id, situacao, termos FROM agentes_sugestoes WHERE tipo = 'vocabulario' AND pedido_id = (SELECT id FROM agentes_pedidos WHERE resposta_id = $1)`, [respostaIa.id]);
    assert.ok(s, 'regra sugerida');
    assert.strictEqual(s.situacao, 'pendente');
    assert.strictEqual((await ROT.decidir({ db: pool, texto: 'quero o levantamento quantitativo dos materiais da obra', conversaId: chat.id })).decisao, 'ia', 'pendente não vale');
    assert.strictEqual((await req('PUT', `/api/agentes/sugestoes/${s.id}`, ua.token, { situacao: 'aprovada' })).status, 403, 'regra do roteador: só admin');
    assert.strictEqual((await req('PUT', `/api/agentes/sugestoes/${s.id}`, adm.token, { situacao: 'aprovada' })).status, 200);
    const d = await ROT.decidir({ db: pool, texto: 'quero o levantamento quantitativo dos materiais da obra', conversaId: chat.id });
    assert.strictEqual(d.regra, `aprendida:${s.id}`);
  });

  await caso('"aprovar como conhecimento" numa resposta da IA: a mesma pergunta sai da base, sem IA', async () => {
    assert.strictEqual((await req('POST', `/api/assistente/mensagens/${respostaIa2.id}/conhecimento`, ub.token, {})).status, 404);
    const r = await req('POST', `/api/assistente/mensagens/${respostaIa2.id}/conhecimento`, ua.token, {});
    assert.strictEqual(r.status, 201, JSON.stringify(r.dados));
    const d = await ROT.decidir({ db: pool, texto: 'qual norma rege a iluminação de emergência sintética?', conversaId: chat.id });
    assert.strictEqual(d.decisao, 'resposta');
    assert.match(d.resposta, /sem IA/);
    const m = await mensagemStream(chat.id, ua.token, 'qual norma rege a iluminação de emergência sintética?');
    assert.strictEqual(m.fim.provedor, 'agente');
    const conv2 = (await req('GET', `/api/assistente/conversas/${chat.id}`, ua.token)).dados;
    assert.strictEqual(conv2.mensagens.find(x => x.id === respostaIa2.id).sugestao_situacao, 'aprovada');
  });

  await caso('indicador de dependência de IA e lista de sugestões', async () => {
    const r = await req('GET', '/api/agentes/indicadores', ua.token);
    assert.strictEqual(r.status, 200);
    assert.ok(r.dados.porAgente.analise_projeto.suporte >= 1);
    assert.ok(r.dados.porAgente.analise_projeto.execucoes >= 3);
    assert.ok(r.dados.roteador.some(x => x.decisao === 'agente'));
    assert.ok(Array.isArray((await req('GET', '/api/agentes/sugestoes?situacao=aprovada', ua.token)).dados));
  });
}

async function limpar() {
  try {
    if (!usuarios.length) return;
    const conversas = (await pool.query('SELECT id FROM assistente_conversas WHERE usuario_id = ANY($1::int[])', [usuarios])).rows.map(r => r.id);
    const propostas = (await pool.query('SELECT id FROM propostas WHERE assistente_conversa_id = ANY($1::int[]) OR usuario_id = ANY($2::int[])', [conversas, usuarios])).rows.map(r => r.id);
    const descricoes = propostas.length ? (await pool.query('SELECT DISTINCT descricao FROM proposta_itens WHERE proposta_id = ANY($1::int[])', [propostas])).rows.map(r => r.descricao) : [];
    const analises = (await pool.query('SELECT * FROM analises_projeto WHERE assistente_conversa_id = ANY($1::int[]) OR usuario_id = ANY($2::int[])', [conversas, usuarios])).rows;
    for (const a of analises) if (a.pasta && !a.pasta_obra_id) fs.rmSync(P.caminhoDe('projeto', a.pasta), { recursive: true, force: true });
    await pool.query('DELETE FROM agentes_suporte WHERE usuario_id = ANY($1::int[]) OR conversa_id = ANY($2::int[])', [usuarios, conversas]);
    await pool.query('DELETE FROM agentes_sugestoes WHERE usuario_id = ANY($1::int[]) OR conversa_id = ANY($2::int[]) OR pedido_id IN (SELECT id FROM agentes_pedidos WHERE usuario_id = ANY($1::int[]))', [usuarios, conversas]);
    await pool.query('DELETE FROM agentes_pedidos WHERE usuario_id = ANY($1::int[])', [usuarios]);
    await pool.query('DELETE FROM agentes_execucoes WHERE usuario_id = ANY($1::int[])', [usuarios]);
    await pool.query('DELETE FROM propostas WHERE id = ANY($1::int[])', [propostas]);
    await pool.query('DELETE FROM laudos_projetos WHERE assistente_conversa_id = ANY($1::int[]) OR usuario_id = ANY($2::int[])', [conversas, usuarios]);
    await pool.query('DELETE FROM analises_projeto WHERE id = ANY($1::int[])', [analises.map(a => a.id)]);
    for (const c of conversas) fs.rmSync(pastaDaConversa(c), { recursive: true, force: true });
    await pool.query('DELETE FROM assistente_conversas WHERE id = ANY($1::int[])', [conversas]);
    if (snapshot) {
      await pool.query("DELETE FROM materiais WHERE id > $1 AND origem = 'proposta' AND descricao = ANY($2::text[])", [snapshot.material, descricoes]);
      await pool.query('DELETE FROM mao_de_obra_itens WHERE id > $1 AND descricao = ANY($2::text[])', [snapshot.maoDeObra, descricoes]);
      await pool.query("DELETE FROM precos_mao_de_obra_referencia WHERE origem = 'proposta' AND NOT (codigo = ANY($1::text[])) AND descricao = ANY($2::text[])", [snapshot.servicos, descricoes]);
      await pool.query("UPDATE configuracoes SET valor = $1 WHERE chave = 'proximo_numero'", [snapshot.proximo]);
    }
    await pool.query('DELETE FROM usuarios WHERE id = ANY($1::int[])', [usuarios]);
  } catch (e) {
    console.error('agentesIntegracao: falha na limpeza —', e.message);
    process.exitCode = 1;
  }
}

principal()
  .then(() => console.log(`agentesIntegracao: ${ok} casos ok`))
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => {
    SUP.configurarParaTeste({});
    await limpar();
    fs.rmSync(tmp, { recursive: true, force: true });
    if (servidor) servidor.close();
    await pool.end().catch(() => {});
    setTimeout(() => process.exit(process.exitCode || 0), 300).unref();
  });
