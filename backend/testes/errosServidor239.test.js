// Revisão 2.39, seção "Servidor": 500 que sumiam passam a entrar no log e no resumo diário de erros; blocos
// try/catch que repetiam o tratador central saíram SEM mudar status nem mensagem; o controller das notas
// fiscais dividido por assunto; regra de negócio das rotas de follow-up, notas a receber e revisão do envio
// movida para controllers. Sem banco de verdade (pool falso) e com dados sintéticos.
// Rodar: node testes/errosServidor239.test.js (pasta backend).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ── pool falso (antes de qualquer require de src/) ──────────────────────────
const banco = { pool: null };
const poolFalso = {
  query: (...a) => banco.pool.query(...a),
  connect: async () => { throw new Error('sem cliente no teste'); },
  on() {},
};
require.cache[require.resolve('../src/config/database')] = { id: 'db', filename: 'db', loaded: true, exports: poolFalso };

// o resumo diário de erros: conta o que seria registrado (sem gravar nada)
const errosSistema = require('../src/services/errosSistema');
const registrados = [];
errosSistema.registrar = async (req, err) => { registrados.push({ metodo: req?.method, rota: errosSistema.normalizarRota(req?.originalUrl), mensagem: err?.message }); };

const { tratarErros } = require('../src/middleware/erros');

const silencio = (fn) => async () => {
  const { warn, error, log } = console;
  console.warn = () => {}; console.error = () => {}; console.log = () => {};
  try { return await fn(); } finally { Object.assign(console, { warn, error, log }); }
};
const resFalsa = () => {
  const r = { code: 200, body: undefined, headersSent: false, cabecalhos: {} };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; r.headersSent = true; return r; };
  r.set = (h) => { Object.assign(r.cabecalhos, h); return r; };
  r.type = () => r;
  r.send = (b) => { r.body = b; r.headersSent = true; return r; };
  return r;
};
// chama o handler como o Express faz com protegerRotasAsync: o que rejeitar vai para o tratador central
async function chamar(fn, req) {
  const res = resFalsa();
  const pedido = { method: 'POST', originalUrl: '/api/teste', params: {}, query: {}, body: {}, usuario: { id: 1, role: 'admin' }, ...req };
  await Promise.resolve(fn(pedido, res, (e) => { throw e; })).catch(e => tratarErros(e, pedido, res, () => {}));
  return res;
}

const casos = [];
const caso = (nome, fn) => casos.push([nome, silencio(fn)]);

// ════════ 500 que sumiam: agora registrados, mesma resposta ════════
caso('vencimentos e atribuição: erro inesperado é registrado; erro com status não; a resposta não muda', async () => {
  const venc = require('../src/services/vencimentos');
  const original = venc.sincronizarLaudos;
  try {
    const V = require('../src/controllers/vencimentosController');
    registrados.length = 0;
    venc.sincronizarLaudos = async () => { throw new Error('relation "vencimentos_laudos" does not exist'); };
    const r = await chamar(V.listar, { method: 'GET', originalUrl: '/api/vencimentos', usuario: { id: 2, role: 'user' } });
    assert.deepStrictEqual([r.code, r.body], [500, { erro: 'Não foi possível concluir. Tente de novo.' }]);
    assert.strictEqual(registrados.length, 1, 'o 500 não entrou no resumo diário');
    assert.match(registrados[0].mensagem, /does not exist/);
    registrados.length = 0;
    venc.sincronizarLaudos = async () => { throw Object.assign(new Error('Os documentos da empresa são só do administrador.'), { status: 403 }); };
    const r2 = await chamar(V.listar, { method: 'GET', usuario: { id: 2, role: 'user' } });
    assert.deepStrictEqual([r2.code, r2.body], [403, { erro: 'Os documentos da empresa são só do administrador.' }]);
    assert.strictEqual(registrados.length, 0, 'erro do usuário não é erro do sistema');
  } finally { venc.sincronizarLaudos = original; }

  const svc = require('../src/services/atribuicaoObras');
  const orig2 = svc.carregarPendentes;
  try {
    registrados.length = 0;
    svc.carregarPendentes = async () => { throw new Error('falha sintética'); };
    const r = await chamar(require('../src/controllers/atribuicaoObrasController').pendentes, { method: 'GET' });
    assert.deepStrictEqual([r.code, r.body], [500, { erro: 'Não foi possível concluir. Tente de novo.' }]);
    assert.strictEqual(registrados.length, 1);
  } finally { svc.carregarPendentes = orig2; }
});

caso('usuários (excluir) e composições: o 500 com mensagem própria entra no resumo; 23503/23505 continuam 409', async () => {
  const U = require('../src/controllers/usuariosController');
  registrados.length = 0;
  banco.pool = { query: async () => { throw Object.assign(new Error('falha sintética'), { code: 'XX000' }); } };
  let r = await chamar(U.remover, { method: 'DELETE', params: { id: '9' } });
  assert.deepStrictEqual([r.code, r.body], [500, { erro: 'Erro ao excluir usuário' }]);
  assert.strictEqual(registrados.length, 1);
  banco.pool = { query: async () => { throw Object.assign(new Error('fk'), { code: '23503' }); } };
  r = await chamar(U.remover, { method: 'DELETE', params: { id: '9' } });
  assert.strictEqual(r.code, 409);
  assert.strictEqual(registrados.length, 1, '409 não é erro do sistema');

  const C = require('../src/controllers/composicoesController');
  registrados.length = 0;
  banco.pool = { query: async () => { throw new Error('falha sintética'); } };
  r = await chamar(C.definirAtivo, { method: 'PUT', params: { id: '3' }, body: { ativo: false } });
  assert.deepStrictEqual([r.code, r.body], [500, { erro: 'Erro ao alterar a composição' }]);
  assert.strictEqual(registrados.length, 1);
  banco.pool = null;
});

caso('aprovação pública: a falha entra no resumo pelo padrão da rota, nunca com o token do link', async () => {
  const A = require('../src/controllers/aprovacaoController');
  registrados.length = 0;
  banco.pool = { query: async () => { throw new Error('falha sintética do banco'); } };
  const token = 'Zz9yX8wV7uT6sR5qP4oN3mL2kJ1iH0gF9eD8cB7aA6z';
  const r = await chamar(A.pdfPublico, { method: 'GET', originalUrl: `/api/publico/aprovacao/${token}/pdf`, baseUrl: '/api/publico/aprovacao', route: { path: '/:token/pdf' }, params: { token } });
  banco.pool = null;
  assert.deepStrictEqual([r.code, r.body], [500, { erro: 'Não foi possível concluir agora. Tente de novo em alguns minutos.' }]);
  assert.strictEqual(registrados.length, 1);
  assert.strictEqual(registrados[0].rota, '/api/publico/aprovacao/:token/pdf');
  assert.ok(!JSON.stringify(registrados).includes(token), 'o token foi para o resumo de erros');
});

// ════════ try/catch redundantes: o tratador central responde igual ════════
caso('follow-up e notas a receber (agora em controllers): erro do serviço com status sai igual, { erro }', async () => {
  const F = require('../src/services/followUpPropostas');
  const N = require('../src/services/notasAReceber');
  const orig = { registrar: F.registrar, listar: F.listar, ligar: N.ligar, listarN: N.listar };
  try {
    F.registrar = async () => { throw Object.assign(new Error('Esta proposta ainda não tem envio registrado: registre quando foi enviada.'), { status: 409 }); };
    const ctrlF = require('../src/controllers/followUpPropostasController');
    let r = await chamar(ctrlF.registrarContato, { params: { id: '5' } });
    assert.deepStrictEqual([r.code, r.body], [409, { erro: 'Esta proposta ainda não tem envio registrado: registre quando foi enviada.' }]);
    F.registrar = async () => {};
    F.listar = async () => ({ propostas: [{ id: 5 }] });
    r = await chamar(ctrlF.registrarContato, { params: { id: '5' } });
    assert.deepStrictEqual([r.code, r.body], [200, { propostas: [{ id: 5 }] }]);

    const ctrlN = require('../src/controllers/notasAReceberController');
    N.ligar = async () => { throw Object.assign(new Error('Nota não encontrada.'), { status: 404 }); };
    r = await chamar(ctrlN.ligar, { params: { id: '7' }, body: { movimento_id: 3 } });
    assert.deepStrictEqual([r.code, r.body], [404, { erro: 'Nota não encontrada.' }]);
    N.ligar = async (nota, mov) => ({ obra_id: 4, obra_preenchida: true, aviso: null, nota, mov });
    N.listar = async () => ({ notas: [], total: 0 });
    r = await chamar(ctrlN.ligar, { params: { id: '7' }, body: { movimento_id: 3 } });
    assert.deepStrictEqual(r.body, { obra_id: 4, obra_preenchida: true, aviso: null, nota: 7, mov: 3, notas: [], total: 0 });
    assert.strictEqual(registrados.filter(x => /nota|proposta/i.test(x.mensagem || '')).length, 0, '4xx não vai para o resumo');
  } finally { Object.assign(F, { registrar: orig.registrar, listar: orig.listar }); Object.assign(N, { ligar: orig.ligar, listar: orig.listarN }); }
});

caso('consultas do assistente e pacote de projeto: 404/403 do serviço saem iguais pelo tratador central', async () => {
  const C = require('../src/services/canal/consultas');
  const orig = C.margemDaObra;
  try {
    C.margemDaObra = async () => { throw new C.ErroConsulta('Obra não encontrada.', 404); };
    const r = await chamar(require('../src/controllers/canalConsultas').margem, { method: 'GET', params: { id: '1' } });
    assert.deepStrictEqual([r.code, r.body], [404, { erro: 'Obra não encontrada.' }]);
  } finally { C.margemDaObra = orig; }

  const P = require('../src/services/pacotesProjeto');
  const origP = P.arquivosDoPacote;
  try {
    P.arquivosDoPacote = () => { throw Object.assign(new Error('Este pacote foi enviado por outro usuário.'), { status: 403 }); };
    const proj = require('../src/controllers/projetos');
    const r = await chamar(proj.analisarPacote, { params: { token: 'a'.repeat(40) }, body: { arquivos: [{ id: 1, disciplinas: ['eletrica'] }] } });
    assert.deepStrictEqual([r.code, r.body], [403, { erro: 'Este pacote foi enviado por outro usuário.' }]);
  } finally { P.arquivosDoPacote = origP; }
});

caso('notas fiscais: atestado com erro 400 e PDF com a fila cheia respondem como antes (sem o try/catch local)', async () => {
  const atestado = require('../src/services/atestadoCapacidade');
  const origM = atestado.montarAtestado;
  const nota = { id: 11, numero: 501, situacao: 'emitida', proposta_id: null, tomador: { nome: 'ZZ Tomador', documento: '00000000000191' } };
  banco.pool = { query: async (sql) => (/FROM notas_fiscais n/.test(sql) ? { rows: [{ ...nota }] } : { rows: [] }) };
  try {
    atestado.montarAtestado = () => { throw Object.assign(new Error('A NFS-e nº 502 é de outro tomador: o atestado junta só notas do mesmo cliente.'), { status: 400 }); };
    const N = require('../src/controllers/notasFiscaisController');
    const r = await chamar(N.previaAtestado, { params: { id: '11' } });
    assert.deepStrictEqual([r.code, r.body], [400, { erro: 'A NFS-e nº 502 é de outro tomador: o atestado junta só notas do mesmo cliente.' }]);
  } finally { atestado.montarAtestado = origM; banco.pool = null; }

  const pdfP = require('../src/services/pdfPuppeteer');
  const origPdf = pdfP.gerarPdfDeHtml;
  // documentos.js pegou gerarPdfDeHtml na carga: troca no cache antes de recarregar a parte
  const caminhoDoc = require.resolve('../src/controllers/notasFiscais/documentos');
  delete require.cache[caminhoDoc];
  pdfP.gerarPdfDeHtml = async () => { throw Object.assign(new Error('Muitos PDFs sendo gerados agora. Tente de novo em instantes.'), { codigo: 'FILA_PDF_CHEIA' }); };
  banco.pool = { query: async (sql) => (/FROM notas_fiscais n/.test(sql) ? { rows: [{ ...nota, tomador: { nome: 'ZZ' } }] } : { rows: [] }) };
  try {
    const D = require('../src/controllers/notasFiscais/documentos');
    const r = await chamar(D.pdf, { method: 'GET', params: { id: '11' } });
    assert.deepStrictEqual([r.code, r.body], [503, { erro: 'Muitos PDFs sendo gerados agora. Tente de novo em instantes.' }]);
  } finally { pdfP.gerarPdfDeHtml = origPdf; banco.pool = null; delete require.cache[caminhoDoc]; }
});

// ════════ divisão do controller e rotas sem regra de negócio ════════
caso('notas fiscais divididas: o nome antigo reexporta o índice com as mesmas 24 funções', () => {
  const antigo = require('../src/controllers/notasFiscaisController');
  const indice = require('../src/controllers/notasFiscais');
  assert.strictEqual(antigo, indice);
  const esperadas = ['notasCandidatas', 'enviarAtestado', 'criarDeProposta', 'recebimentosCandidatos', 'ligarRecebimento', 'listar', 'obter',
    'criar', 'atualizar', 'remover', 'duplicar', 'cancelar', 'configCancelamento', 'pdf', 'previewHtml', 'xml', 'enviarEmail', 'importar',
    'previaAtestado', 'atestadoDocx', 'propostasCandidatas', 'vincularProposta', 'importarConteudos', 'calcularTotais'];
  assert.deepStrictEqual(Object.keys(indice).sort(), [...esperadas].sort());
  for (const k of esperadas) assert.strictEqual(typeof indice[k], 'function', k);
  const linhas = fs.readdirSync(path.join(__dirname, '..', 'src', 'controllers', 'notasFiscais'))
    .map(f => fs.readFileSync(path.join(__dirname, '..', 'src', 'controllers', 'notasFiscais', f), 'utf8').split('\n').length);
  assert.ok(Math.max(...linhas) < 300, 'cada parte fica pequena');
});

caso('rotas de follow-up, notas a receber e revisão do envio: sem SQL nem regra, com o mesmo autenticar/posse/admin', () => {
  const ler = (f) => fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'v2', f), 'utf8');
  for (const f of ['followUpPropostas.js', 'notasAReceber.js', 'revisaoEnvio.js']) {
    const src = ler(f);
    assert.ok(!/async \(req|pool|try \{|res\.(json|status)/.test(src), `${f} ainda tem lógica`);
  }
  // registra as rotas num router falso e confere a ordem dos middlewares de cada uma
  const autenticar = () => {}; const admin = () => {}; const validarId = () => {}; const posseProposta = () => {};
  const vistos = {};
  const router = new Proxy({}, { get: (_, metodo) => (url, ...mw) => { vistos[`${metodo.toUpperCase()} ${url}`] = mw; } });
  for (const f of ['followUpPropostas', 'notasAReceber', 'revisaoEnvio']) require(`../src/routes/v2/${f}`)(router, { autenticar, admin, validarId, posse: { proposta: posseProposta } });
  const so = (k) => vistos[k].slice(0, -1);
  assert.deepStrictEqual(so('GET /follow-up-propostas'), [autenticar]);
  assert.deepStrictEqual(so('POST /propostas/:id/envio-registrado'), [autenticar, validarId, posseProposta]);
  assert.deepStrictEqual(so('POST /propostas/:id/follow-up'), [autenticar, validarId, posseProposta]);
  assert.deepStrictEqual(so('GET /notas-a-receber'), [autenticar, admin]);
  assert.deepStrictEqual(so('POST /notas-a-receber/ligar-sugeridas'), [autenticar, admin]);
  assert.deepStrictEqual(so('POST /notas-a-receber/obra-das-notas'), [autenticar, admin]);
  for (const k of ['POST /notas-a-receber/:id/ligar', 'POST /notas-a-receber/:id/baixa', 'DELETE /notas-a-receber/:id/baixa']) assert.deepStrictEqual(so(k), [autenticar, admin, validarId], k);
  assert.deepStrictEqual(so('GET /propostas/:id/revisao-envio'), [autenticar, validarId, posseProposta]);
});

(async () => {
  let ok = 0;
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`erros do servidor (2.39): ${ok}/${casos.length} casos ok`);
})();
