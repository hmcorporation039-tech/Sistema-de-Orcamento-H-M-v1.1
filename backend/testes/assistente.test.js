// Assistente virtual — testes SEM banco e SEM gastar cota (Claude Code falso
// que emite um stream-json gravado). Rodar: npm test (pasta backend).
//   - ferramentas do MCP = lista liberada no --allowedTools, sem nenhuma
//     ferramenta de aprovar/enviar/excluir/mudar preço;
//   - argumentos do `claude -p` (modo restrito, sem ferramentas embutidas,
//     só o MCP do assistente) e ambiente sem os segredos do backend;
//   - interpretação do stream-json (texto, passos, sessão, uso da assinatura);
//   - processo: streaming, parar, tempo-limite; fila de 2;
//   - rotas permitidas ao token do assistente (e que existem de verdade);
//   - edição de rascunho (operações) e mescla do formulário;
//   - tipo de arquivo pelo conteúdo.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const jwt = require('jsonwebtoken');

const F = require('../src/services/assistente/ferramentas');
const CLI = require('../src/services/assistente/claudeCli');
const { Fila } = require('../src/services/assistente/execucao');
const S = require('../src/services/assistente/sessoes');
const R = require('../src/utils/assistenteRascunho');
const A = require('../src/services/assistente/arquivos');
const { rotasPermitidas } = require('../src/middleware/escopoAssistente');
const { TIPOS } = require('../src/services/assistente/acoes');
const { config } = require('../src/services/assistente/config');

const FIX = path.join(__dirname, 'fixtures', 'assistente');
let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('ferramentas do MCP = lista do --allowedTools; nada de aprovar/enviar/excluir/mudar preço', async () => {
  const mcp = await import(require('url').pathToFileURL(path.join(__dirname, '..', 'src', 'mcp', 'assistenteFerramentas.mjs')).href);
  const nomes = mcp.definirFerramentas({ api: async () => ({}), contexto: {} }).map(f => f.nome);
  assert.deepStrictEqual(nomes.slice().sort(), F.FERRAMENTAS.map(f => f.nome).sort());
  for (const n of nomes) assert.ok(!F.PROIBIDAS.test(n), `ferramenta proibida: ${n}`);
  assert.ok(nomes.includes('propor_acao'));
  assert.deepStrictEqual(F.ferramentasPermitidas().filter(t => !t.startsWith('mcp__hm__')), []);
  // tipos de ação: a lista que o MCP oferece = as regras do servidor
  assert.deepStrictEqual(F.TIPOS_ACAO.slice().sort(), Object.keys(TIPOS).sort());
});

caso('argumentos do claude -p: modo restrito, sem ferramentas embutidas, só o MCP do assistente', () => {
  const base = { mensagem: 'oi', sessionId: '11111111-1111-1111-1111-111111111111', mcpConfig: 'C:\\tmp\\mcp.json', modelo: 'sonnet', maxTurnos: 40, sistema: 'regras' };
  const a = CLI.montarArgs({ ...base, retomar: false });
  const valorDe = (lista, nome) => lista[lista.indexOf(nome) + 1];
  for (const flag of ['--restricted', '--strict-mcp-config', '--disable-slash-commands', '--verbose', '--include-partial-messages', '--exclude-dynamic-system-prompt-sections']) assert.ok(a.includes(flag), flag);
  assert.strictEqual(valorDe(a, '--tools'), '');
  assert.strictEqual(valorDe(a, '--permission-mode'), 'dontAsk');
  assert.strictEqual(valorDe(a, '--output-format'), 'stream-json');
  assert.strictEqual(valorDe(a, '--mcp-config'), base.mcpConfig);
  assert.strictEqual(valorDe(a, '--session-id'), base.sessionId);
  assert.ok(!a.includes('--resume'));
  assert.ok(!a.some(x => /^(Bash|PowerShell|Read|Edit|Write|WebFetch|WebSearch)/.test(x)), 'ferramenta embutida liberada');
  assert.ok(!a.includes('--dangerously-skip-permissions') && !a.includes('bypassPermissions'));
  const liberadas = a.slice(a.indexOf('--allowedTools') + 1, a.indexOf('--max-turns'));
  assert.deepStrictEqual(liberadas, F.ferramentasPermitidas());
  const b = CLI.montarArgs({ ...base, retomar: true });
  assert.strictEqual(valorDe(b, '--resume'), base.sessionId);
  assert.ok(!b.includes('--session-id'));
});

caso('o Claude Code não herda os segredos do backend', () => {
  const env = CLI.ambienteFiltrado({ PATH: 'x', USERPROFILE: 'u', APPDATA: 'a', DB_PASS: 's', JWT_SECRET: 'j', ANTHROPIC_API_KEY: 'k', GEMINI_API_KEY: 'g', MCP_LOGIN_SENHA: 'm', EMAIL_IMAP_PASS: 'e' });
  assert.deepStrictEqual(Object.keys(env).sort(), ['APPDATA', 'PATH', 'USERPROFILE']);
});

caso('stream-json: texto em tempo real sem duplicar, passos da ferramenta, sessão e uso da assinatura', () => {
  const eventos = [];
  const it = new CLI.InterpretadorStream(e => eventos.push(e));
  for (const l of fs.readFileSync(path.join(FIX, 'conversa-obras.jsonl'), 'utf8').split('\n').filter(Boolean)) {
    it.processar(JSON.parse(l.replace(/__SESSAO__/g, 'abc')));
  }
  assert.strictEqual(it.sessionId, 'abc');
  assert.ok(it.resultado.sucesso);
  assert.deepStrictEqual(it.partes.map(p => p.tipo), ['texto', 'ferramenta', 'texto']);
  assert.strictEqual(it.partes[0].texto, 'Vou consultar as obras.'); // deltas + mensagem completa = uma vez só
  const f = it.partes[1];
  assert.strictEqual(f.nome, 'buscar_obras');
  assert.strictEqual(f.rotulo, 'Consultando as obras');
  assert.deepStrictEqual(f.entrada, { limite: 20 });
  assert.strictEqual(f.ok, true);
  assert.match(f.resumo, /OB-2026-001/);
  assert.match(it.textoFinal(), /Temos \*\*2 obras\*\*/);
  assert.strictEqual(it.limiteUso.unifiedWindows.five_hour.utilization, 0.2);
  assert.ok(eventos.some(e => e.tipo === 'texto') && eventos.some(e => e.tipo === 'ferramenta_inicio') && eventos.some(e => e.tipo === 'ferramenta_fim'));
  // sem stream parcial (só mensagens completas), o texto vem das mensagens
  const it2 = new CLI.InterpretadorStream();
  it2.processar({ type: 'assistant', message: { id: 'm', content: [{ type: 'text', text: 'Olá' }] } });
  it2.processar({ type: 'result', subtype: 'success', result: 'Olá' });
  assert.strictEqual(it2.textoFinal(), 'Olá');
});

caso('falhas da CLI viram mensagens claras', () => {
  assert.match(CLI.explicarFalha({ stderr: 'Invalid API key · Please run /login' }), /não está logado/);
  assert.match(CLI.explicarFalha({ resultado: { sucesso: false, texto: 'Claude AI usage limit reached' } }), /cota da assinatura/);
  assert.match(CLI.explicarFalha({ estourou: true, tempoLimiteMs: 600000 }), /tempo-limite \(10 min\)/);
  assert.match(CLI.explicarFalha({ cancelado: true }), /Cancelado/);
  assert.match(CLI.explicarFalha({ erroSpawn: 'ENOENT' }), /Não consegui iniciar/);
  assert.ok(CLI.sessaoNaoEncontrada('No conversation found with session ID: x'));
});

const registroArgs = () => path.join(os.tmpdir(), `hm-assist-args-${process.pid}-${Math.random().toString(36).slice(2)}.jsonl`);

caso('processo: o CLI falso transmite os eventos e recebe os argumentos', async () => {
  const reg = registroArgs();
  const it = new CLI.InterpretadorStream();
  const args = CLI.montarArgs({ mensagem: 'o que temos em obras?', sessionId: '22222222-2222-2222-2222-222222222222', retomar: false, mcpConfig: 'x.json', modelo: 'sonnet', maxTurnos: 10, sistema: 's' });
  const saida = await CLI.executarProcesso({ comando: process.execPath, prefixo: [path.join(FIX, 'cli-falso.js'), path.join(FIX, 'conversa-obras.jsonl'), reg], args, cwd: os.tmpdir(), env: CLI.ambienteFiltrado(), aoEvento: e => it.processar(e), tempoLimiteMs: 20000 });
  assert.strictEqual(saida.codigo, 0);
  assert.strictEqual(it.sessionId, '22222222-2222-2222-2222-222222222222');
  assert.ok(it.resultado.sucesso);
  const recebidos = JSON.parse(fs.readFileSync(reg, 'utf8').trim());
  assert.deepStrictEqual(recebidos, args);
  fs.rmSync(reg, { force: true });
});

caso('processo: parar mata a execução; tempo-limite também', async () => {
  const reg = registroArgs();
  const prefixo = [path.join(FIX, 'cli-falso.js'), path.join(FIX, 'conversa-dorme.jsonl'), reg];
  const ctrl = new AbortController();
  const t0 = Date.now();
  setTimeout(() => ctrl.abort(), 400);
  const s1 = await CLI.executarProcesso({ comando: process.execPath, prefixo, args: [], cwd: os.tmpdir(), env: CLI.ambienteFiltrado(), aoEvento: () => {}, signal: ctrl.signal, tempoLimiteMs: 30000 });
  assert.ok(s1.cancelado && Date.now() - t0 < 15000, 'não parou');
  const s2 = await CLI.executarProcesso({ comando: process.execPath, prefixo, args: [], cwd: os.tmpdir(), env: CLI.ambienteFiltrado(), aoEvento: () => {}, tempoLimiteMs: 500 });
  assert.ok(s2.estourou);
  fs.rmSync(reg, { force: true });
});

caso('fila: no máximo 2 ao mesmo tempo, posição de quem espera, cancelar na fila', async () => {
  const fila = new Fila(2);
  const posicoes = [];
  await fila.adquirir('a'); await fila.adquirir('b');
  const c = fila.adquirir('c', p => posicoes.push(['c', p]));
  const d = fila.adquirir('d', p => posicoes.push(['d', p])).catch(e => e);
  assert.deepStrictEqual(fila.estado(), { rodando: 2, esperando: 2, maximo: 2 });
  assert.ok(fila.remover('d'));
  assert.ok((await d).cancelado);
  fila.liberar();
  await c;
  assert.deepStrictEqual(fila.estado(), { rodando: 2, esperando: 0, maximo: 2 });
  assert.ok(posicoes.some(([q, p]) => q === 'd' && p === 2));
  fila.liberar(); fila.liberar();
  assert.strictEqual(fila.estado().rodando, 0);
});

caso('token do assistente: escopo, conversa, execução e validade de 2 h; só vale com a execução no ar', () => {
  const t = S.emitirTokenAssistente({ usuarioId: 7, conversaId: 3, exec: 'abc' }, 'x'.repeat(40));
  const d = jwt.verify(t, 'x'.repeat(40));
  assert.strictEqual(d.escopo, 'assistente');
  assert.strictEqual(d.conv, 3);
  assert.ok(Math.abs(d.exp - d.iat - 7200) < 5);
  assert.strictEqual(S.execucaoDoToken(d), null); // nenhuma execução registrada
  S.registrarExecucao({ exec: 'abc', conversaId: 3, usuarioId: 7 });
  assert.ok(S.execucaoDoToken(d));
  assert.strictEqual(S.execucaoDoToken({ ...d, conv: 4 }), null);
  assert.strictEqual(S.execucaoDoToken({ ...d, id: 8 }), null);
  S.encerrarExecucao('abc');
  assert.strictEqual(S.execucaoDoToken(d), null);
});

caso('rotas do token do assistente: nada de status, e-mail, link, exclusão, catálogo, usuários; todas existem', () => {
  const rotas = rotasPermitidas();
  for (const proibida of ['PATCH /propostas/:id/status', 'DELETE /propostas/:id', 'POST /propostas/:id/enviar-email', 'POST /propostas/:id/link-aprovacao',
    'DELETE /projetos/analises/:id', 'DELETE /laudos/:id', 'PUT /materiais/:id', 'POST /materiais', 'PUT /precos-mao-de-obra', 'GET /usuarios',
    'POST /assistente/acoes/:id/aplicar', 'POST /assistente/conversas/:id/mensagens', 'PUT /obras/:id', 'POST /propostas/:id/duplicar']) {
    assert.ok(!rotas.includes(proibida), `liberada: ${proibida}`);
  }
  assert.ok(!rotas.some(r => r.startsWith('DELETE ')), 'alguma exclusão liberada');
  // toda rota liberada existe no roteador (sem erro de digitação que abriria/fecharia sem querer)
  const router = require('../src/routes');
  const existentes = new Set();
  for (const camada of router.stack) {
    if (camada.route) for (const m of Object.keys(camada.route.methods)) existentes.add(`${m.toUpperCase()} ${camada.route.path}`);
  }
  for (const r of rotas) assert.ok(existentes.has(r), `rota liberada inexistente: ${r}`);
});

caso('rascunho: operações sobre a proposta lida (GET → PUT)', () => {
  const p = {
    data: '2026-10-27T03:00:00.000Z', validade: 5, cliente_nome: 'Cliente X', bdi: '10.00', imposto_venda: '0', imposto_servico: '6', versao: 3,
    secoes: [{ id: 50, nome: 'Serviços (Mão de Obra)' }, { id: 51, nome: 'Materiais e Equipamentos' }],
    itens: [
      { id: 900, secao_id: 50, descricao: 'Instalação de câmera', quantidade: '6.000', unidade: 'un', valor_unitario: '120.00', status: 'a_cotar' },
      { id: 901, secao_id: 51, descricao: 'Câmera IP 4MP', quantidade: '6.000', unidade: 'un', valor_unitario: '0.00', status: 'a_cotar', material_id: 12 },
    ],
  };
  const base = R.propostaParaPayload(p);
  assert.strictEqual(base.data, '2026-10-27');
  assert.strictEqual(base.versao, 3);
  const { payload, resumo } = R.aplicarOperacoes(base, {
    alterar: [{ item_id: 901, valor_unitario: 450.555, status: 'confirmado' }],
    remover: [900],
    adicionar: [{ secao: 'servicos', descricao: 'Configuração do NVR', quantidade: 1 }, { secao: 'materiais', descricao: 'Switch PoE 8p', quantidade: 1, valor_unitario: 900 }],
    campos: { bdi: 15, escopo: 'Novo escopo' },
  });
  assert.strictEqual(payload.itens.length, 3);
  assert.strictEqual(payload.itens.find(i => i._id === 901).vu, 450.56);
  assert.strictEqual(payload.itens.find(i => i.desc === 'Configuração do NVR').status, 'a_cotar'); // sem preço = a cotar
  assert.strictEqual(payload.itens.find(i => i.desc === 'Switch PoE 8p').sid, 51);
  assert.strictEqual(payload.bdi, 15);
  assert.ok(resumo.length >= 5);
  assert.ok(!('_id' in R.payloadParaEnvio(payload).itens[0]));
  assert.throws(() => R.aplicarOperacoes(base, { remover: [12345] }), /não existe nesta proposta/);
  assert.throws(() => R.aplicarOperacoes(base, {}), /Nenhuma alteração/);
  assert.throws(() => R.aplicarOperacoes(base, { alterar: [{ item_id: 900, quantidade: -1 }] }), /inválid/);
  // proposta vazia (rascunho a partir de itens): seção nova criada
  const vazio = R.aplicarOperacoes({ data: '2026-10-28', cliente_nome: 'Y', secoes: [], itens: [] }, { adicionar: [{ secao: 'materiais', descricao: 'Cabo', quantidade: 100, unidade: 'm' }] });
  assert.deepStrictEqual(vazio.payload.secoes, [{ id: 1, nome: 'Materiais e Equipamentos' }]);
});

caso('formulário do projeto: mescla campo a campo, listas substituem, sem poluir protótipo', () => {
  const m = R.mesclarDados({ obra: { nome: 'A', cidade: 'B' }, ambientes: [1, 2, 3] }, { obra: { nome: 'C' }, ambientes: [9] });
  assert.deepStrictEqual(m, { obra: { nome: 'C', cidade: 'B' }, ambientes: [9] });
  const p = R.mesclarDados({}, JSON.parse('{"__proto__": {"x": 1}, "a": 1}'));
  assert.strictEqual(({}).x, undefined);
  assert.deepStrictEqual(p, { a: 1 });
});

caso('arquivo: tipo pelo conteúdo, não pela extensão', async () => {
  const { pdfCftvSintetico } = require('./fixtures/assistente/pdfProjetoSintetico');
  assert.strictEqual(await A.detectarTipo(pdfCftvSintetico(), 'x.pdf'), 'pdf');
  assert.strictEqual(await A.detectarTipo(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]), 'f.png'), 'png');
  assert.strictEqual(await A.detectarTipo(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]), 'f.jpg'), 'jpg');
  assert.strictEqual(await A.detectarTipo(Buffer.from('AC1027\0\0\0\0rest'), 'planta.dwg'), 'dwg');
  assert.strictEqual(await A.detectarTipo(Buffer.from('  0\r\nSECTION\r\n  2\r\nHEADER\r\n'), 'planta.dxf'), 'dxf');
  assert.strictEqual(await A.detectarTipo(Buffer.from('item;qtd\ncabo;10\n'), 'lista.csv'), 'csv');
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook(); wb.addWorksheet('A').addRow(['x', 1]);
  assert.strictEqual(await A.detectarTipo(Buffer.from(await wb.xlsx.writeBuffer()), 'p.xlsx'), 'xlsx');
  // executável ou HTML renomeado para .pdf, ZIP qualquer: recusados
  assert.strictEqual(await A.detectarTipo(Buffer.from('MZ\x90\0\x03\0\0\0'), 'projeto.pdf'), null);
  assert.strictEqual(await A.detectarTipo(Buffer.from('<html><script>alert(1)</script></html>'), 'projeto.pdf'), null);
  const JSZip = require('jszip'); const z = new JSZip(); z.file('a.txt', 'oi');
  assert.strictEqual(await A.detectarTipo(await z.generateAsync({ type: 'nodebuffer' }), 'coisa.docx'), null);
});

caso('configuração: padrões (fila 2, 10 min, limite diário, provedor Max, API desligada)', () => {
  const c = config({});
  assert.strictEqual(c.maxSimultaneas, 2);
  assert.strictEqual(c.tempoLimiteMs, 600000);
  assert.strictEqual(c.provedor, 'claude_max');
  assert.ok(c.ligado);
  assert.strictEqual(config({ ASSISTENTE_PROVEDOR: 'api' }).provedor, 'api');
  assert.strictEqual(config({ ASSISTENTE: 'desligado' }).ligado, false);
  assert.strictEqual(config({ ASSISTENTE_LIMITE_DIARIO: '0' }).limiteDiario, 0);
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; } catch (e) { console.error(`FALHOU: ${nome}`); console.error(e); process.exit(1); }
  }
  console.log(`assistente: ${ok}/${casos.length} casos ok`);
  process.exit(0);
})();
