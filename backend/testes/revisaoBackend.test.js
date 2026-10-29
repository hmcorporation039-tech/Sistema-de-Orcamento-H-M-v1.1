// Correções da revisão de 27/10/2026, seção [B1] (backend: controllers, rotas,
// middleware, services, models, server.js). Sem banco de verdade: o pool do
// PostgreSQL é trocado por um FALSO antes de carregar os módulos, e o cliente
// falso imita o que importa do PostgreSQL (transação abortada depois de um
// erro, COMMIT que volta como ROLLBACK, SAVEPOINT). Rodar: node testes/revisaoBackend.test.js
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

// ── pool falso (precisa vir antes de qualquer require de src/) ──────────────
const banco = { cliente: null, pool: null };
const poolFalso = {
  query: (...a) => (banco.pool || banco.cliente).query(...a),
  connect: async () => banco.cliente,
  on() {},
};
require.cache[require.resolve('../src/config/database')] = { id: 'db', filename: 'db', loaded: true, exports: poolFalso };
// IA falsa (classificação de materiais nunca chama provedor de verdade)
const iaFalsa = { resposta: {}, chamadas: 0, async perguntarJSON() { iaFalsa.chamadas++; return { fonte: 'falsa', json: iaFalsa.resposta }; }, status: () => ({}) };
require.cache[require.resolve('../src/services/ia')] = { id: 'ia', filename: 'ia', loaded: true, exports: iaFalsa };

const silencio = (fn) => async (...a) => {
  const { warn, error, log } = console;
  console.warn = () => {}; console.error = () => {}; console.log = () => {};
  try { return await fn(...a); } finally { Object.assign(console, { warn, error, log }); }
};

// Cliente que imita o PostgreSQL numa transação: erro aborta; comandos depois
// do erro falham com 25P02; COMMIT de transação abortada devolve "ROLLBACK";
// SAVEPOINT/ROLLBACK TO desfazem só o trecho; fora de transação, SAVEPOINT dá 25P01.
function clientePg({ falhar = () => null, responder = () => ({ rows: [], rowCount: 0 }) } = {}) {
  const c = {
    emTransacao: false, abortada: false, savepoints: [], gravados: [], log: [], liberado: null,
    release(err) { c.liberado = err || true; },
    async query(sql, params = []) {
      const s = String(sql).trim();
      c.log.push(s);
      if (/^BEGIN/i.test(s)) { c.emTransacao = true; c.abortada = false; c.savepoints = []; c.pendentes = []; return { command: 'BEGIN', rows: [] }; }
      if (/^COMMIT/i.test(s)) {
        const desfeita = c.abortada;
        if (!desfeita) c.gravados.push(...(c.pendentes || []));
        c.emTransacao = false; c.abortada = false; c.pendentes = [];
        return { command: desfeita ? 'ROLLBACK' : 'COMMIT', rows: [] };
      }
      if (/^ROLLBACK TO SAVEPOINT/i.test(s)) {
        const sp = c.savepoints.pop(); c.pendentes.length = sp; c.savepoints.push(sp); c.abortada = false; return { rows: [] };
      }
      if (/^ROLLBACK/i.test(s)) { c.emTransacao = false; c.abortada = false; c.pendentes = []; return { command: 'ROLLBACK', rows: [] }; }
      if (c.abortada) throw Object.assign(new Error('current transaction is aborted, commands ignored until end of transaction block'), { code: '25P02' });
      if (/^SAVEPOINT/i.test(s)) {
        if (!c.emTransacao) throw Object.assign(new Error('SAVEPOINT can only be used in transaction blocks'), { code: '25P01' });
        c.savepoints.push(c.pendentes.length); return { rows: [] };
      }
      if (/^RELEASE SAVEPOINT/i.test(s)) { c.savepoints.pop(); return { rows: [] }; }
      const erro = falhar(s, params);
      if (erro) { if (c.emTransacao) c.abortada = true; throw erro; }
      if (/^(INSERT|UPDATE|DELETE)/i.test(s)) {
        if (c.emTransacao) c.pendentes.push({ sql: s, params }); else c.gravados.push({ sql: s, params });
      }
      return responder(s, params);
    },
  };
  return c;
}
// jsonb do PostgreSQL recusa "\ud800" (escape de surrogate solto)
const jsonbRecusa = (s, p) => (/INSERT INTO auditoria/.test(s) && p[3] && /\\ud[89ab][0-9a-f]{2}(?!\\ud[c-f])/i.test(p[3])
  ? Object.assign(new Error('unsupported Unicode escape sequence'), { code: '22P05' }) : null);

const { comTransacao, TransacaoDesfeita } = require('../src/services/transacao');
const { registrarAuditoria, jsonBemFormado } = require('../src/services/auditoria');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

// ════════ item 1 — transação abortada não pode responder sucesso ════════
caso('comTransacao: erro engolido no meio → COMMIT volta ROLLBACK → lança TransacaoDesfeita (antes respondia sucesso)', silencio(async () => {
  banco.cliente = clientePg({ falhar: (s) => (/INSERT INTO x/.test(s) ? new Error('falha') : null) });
  await assert.rejects(comTransacao(async (client) => {
    await client.query('INSERT INTO propostas_falsas VALUES (1)');
    await client.query('INSERT INTO x VALUES (1)').catch(() => {}); // erro engolido
    return 'ok';
  }), (e) => e instanceof TransacaoDesfeita && e.code === 'TRANSACAO_DESFEITA');
  assert.strictEqual(banco.cliente.gravados.length, 0, 'nada gravado');
  assert.ok(banco.cliente.liberado, 'conexão devolvida ao pool');
}));

caso('comTransacao: caminho normal continua igual (COMMIT, resultado devolvido)', async () => {
  banco.cliente = clientePg();
  const r = await comTransacao(async (client) => { await client.query('INSERT INTO a VALUES (1)'); return 42; });
  assert.strictEqual(r, 42);
  assert.strictEqual(banco.cliente.gravados.length, 1);
});

caso('auditoria dentro da transação: falha fica no SAVEPOINT e a operação principal é gravada', silencio(async () => {
  banco.cliente = clientePg({ falhar: (s, p) => (/INSERT INTO auditoria/.test(s) && p[0] === 'quebra' ? Object.assign(new Error('x'), { code: '23502' }) : null) });
  await comTransacao(async (client) => {
    await client.query('INSERT INTO proposta_decisoes_aprovacao VALUES (1)');
    await registrarAuditoria(client, { entidade: 'quebra', acao: 'teste' });
    await client.query('UPDATE propostas SET status = 1');
  });
  const sqls = banco.cliente.gravados.map(g => g.sql);
  assert.deepStrictEqual(sqls.map(s => s.split(' ').slice(0, 3).join(' ')), ['INSERT INTO proposta_decisoes_aprovacao', 'UPDATE propostas SET']);
  assert.ok(banco.cliente.log.some(s => /^SAVEPOINT hm_auditoria/.test(s)) && banco.cliente.log.some(s => /^ROLLBACK TO SAVEPOINT hm_auditoria/.test(s)));
}));

caso('aprovação pública com "Jo\\ud800ão": a auditoria grava (U+FFFD) e a decisão também', silencio(async () => {
  banco.cliente = clientePg({ falhar: jsonbRecusa });
  await comTransacao(async (client) => {
    await client.query('INSERT INTO proposta_decisoes_aprovacao VALUES (1)');
    await registrarAuditoria(client, { entidade: 'propostas', acao: 'aprovada_pelo_cliente', detalhes: { nome: 'Jo\ud800ão' } });
  });
  assert.strictEqual(banco.cliente.gravados.length, 2);
  assert.strictEqual(JSON.parse(banco.cliente.gravados[1].params[3]).nome, 'Jo�ão');
  assert.strictEqual(jsonBemFormado({ a: ['x\udfffy'] }), '{"a":["x�y"]}');
}));

caso('auditoria fora de transação (client em autocommit e pool): 25P01 → INSERT direto; erro só vai para o log', silencio(async () => {
  banco.cliente = clientePg();
  await registrarAuditoria(banco.cliente, { entidade: 'e', acao: 'a' });
  assert.strictEqual(banco.cliente.gravados.length, 1);
  banco.pool = { query: async () => { throw new Error('banco fora'); } };
  await registrarAuditoria(null, { entidade: 'e', acao: 'a' }); // não lança
  banco.pool = null;
}));

caso('textos do corpo: surrogate solto vira U+FFFD em qualquer nível; texto normal e __proto__ intactos', () => {
  const { normalizarTextos, textosBemFormados } = require('../src/middleware/textoBemFormado');
  const corpo = JSON.parse('{"nome":"Jo\\ud800ão","itens":[{"d":"a\\udc00"}],"ok":"Açaí 😀","n":5,"__proto__":{"x":1}}');
  normalizarTextos(corpo);
  assert.strictEqual(corpo.nome, 'Jo�ão');
  assert.strictEqual(corpo.itens[0].d, 'a�');
  assert.strictEqual(corpo.ok, 'Açaí 😀');
  assert.strictEqual(corpo.n, 5);
  assert.strictEqual(Object.getPrototypeOf(corpo), Object.prototype, 'protótipo não muda');
  assert.strictEqual(({}).x, undefined);
  const req = { body: { a: '\ud83d' } };
  textosBemFormados(req, {}, () => {});
  assert.strictEqual(req.body.a, '�');
});

// ════════ item 2 — editar usuário: campo ausente mantém o valor ════════
caso('usuários: ativo/role ausentes não reativam nem rebaixam (null → COALESCE); tipos errados = 400', silencio(async () => {
  const U = require('../src/controllers/usuariosController');
  assert.deepStrictEqual(U.lerCamposUsuario({ nome: ' Ana ' }), { nome: 'Ana', email: null, role: null, ativo: null });
  assert.deepStrictEqual(U.lerCamposUsuario({ ativo: false, role: 'admin' }), { nome: null, email: null, role: 'admin', ativo: false });
  for (const ruim of [{ ativo: 'false' }, { role: 'root' }, { nome: 5 }, { email: '' }]) assert.ok(U.lerCamposUsuario(ruim).erro, JSON.stringify(ruim));
  // SQL de verdade do controller com um pool falso
  let visto;
  banco.pool = { query: async (sql, p) => { if (/UPDATE usuarios/.test(sql)) { visto = { sql, p }; return { rows: [{ id: 9, role: 'user', ativo: false }] }; } return { rows: [] }; } };
  const res = { json() { return this; }, status(c) { this.code = c; return this; } };
  await U.atualizar({ params: { id: '9' }, body: { nome: 'Novo nome' }, usuario: { id: 1 } }, res);
  banco.pool = null;
  assert.match(visto.sql, /ativo = COALESCE\(\$4::boolean, ativo\)/);
  assert.match(visto.sql, /role = COALESCE\(\$3, role\)/);
  assert.deepStrictEqual(visto.p.slice(0, 4), ['Novo nome', null, null, null]);
}));

// ════════ item 3 — status: sair de "Aprovada" pelo cliente só com admin ════════
caso('status: aprovada pelo cliente no link não volta para Ativa/Cancelada (salvo admin); aprovação do link segue', async () => {
  const P = require('../src/controllers/propostasController');
  const cli = (status, aceite) => clientePg({ responder: (s) => (/FROM propostas p WHERE p.id = \$1 FOR UPDATE/.test(s) ? { rows: [{ status, aceite_link: aceite }] } : /^UPDATE propostas/.test(s) ? { rows: [{ id: 1, status: 'x', obra_id: null }] } : { rows: [] }) });
  await assert.rejects(P.aplicarStatusProposta(cli('Aprovada', true), 1, 'Ativa', 2), (e) => e instanceof require('../src/utils/erros').ErroHttp && e.status === 409 && e.extra.codigo === 'APROVADA_PELO_CLIENTE');
  await assert.rejects(P.aplicarStatusProposta(cli('Aprovada', true), 1, 'Cancelada', 2));
  assert.ok(await P.aplicarStatusProposta(cli('Aprovada', true), 1, 'Ativa', 2, null, { admin: true }), 'admin pode');
  assert.ok(await P.aplicarStatusProposta(cli('Aprovada', false), 1, 'Ativa', 2), 'aprovada na tela (sem aceite do link) continua livre');
  assert.ok(await P.aplicarStatusProposta(cli('Ativa', false), 1, 'Aprovada', null, 'pelo cliente'), 'decisão do link');
  // resposta HTTP do atualizarStatus (o erro passa pelo tratador central, como no servidor)
  banco.cliente = cli('Aprovada', true);
  const res = { status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  const req = { params: { id: '1' }, body: { status: 'Recusada' }, usuario: { id: 2, role: 'user' }, method: 'PATCH', originalUrl: '/api/propostas/1/status' };
  await P.atualizarStatus(req, res).catch(e => require('../src/middleware/erros').tratarErros(e, req, res, () => {}));
  assert.strictEqual(res.code, 409);
  assert.strictEqual(res.body.codigo, 'APROVADA_PELO_CLIENTE');
});

// ════════ item 4 — "hoje" em Brasília ════════
caso('data de hoje e período padrão em Brasília (31/10 às 23h30 ainda é outubro)', () => {
  const { hojeBrasilia, periodoMesAtualBrasilia } = require('../src/utils/dataHoje');
  const noite = new Date('2026-11-01T02:30:00Z'); // 31/10 23h30 em Brasília
  assert.strictEqual(hojeBrasilia(noite), '2026-10-31');
  assert.deepStrictEqual(periodoMesAtualBrasilia(noite), { dataInicio: '2026-10-01', dataFim: '2026-10-31' });
  assert.deepStrictEqual(periodoMesAtualBrasilia(new Date('2026-03-01T03:00:00Z')), { dataInicio: '2026-03-01', dataFim: '2026-03-01' });
  // nenhum "hoje" em UTC sobrou nos controllers corrigidos
  for (const f of ['propostasController', 'laudosController', 'projetosController', 'financeiroController', 'relatoriosController', 'cronogramaController']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'controllers', `${f}.js`), 'utf8');
    const linhas = src.split('\n').filter(l => /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)|inicio\.toISOString|hoje\.toISOString/.test(l));
    assert.deepStrictEqual(linhas, [], f);
  }
});

// ════════ item 7 — dois cliques em "Gerar orçamento" ════════
caso('gerar orçamento: vínculo relido com FOR UPDATE dentro da transação (análise e laudo)', () => {
  for (const [f, sql] of [['projetosController', 'SELECT proposta_id FROM analises_projeto WHERE id = $1 FOR UPDATE'], ['laudosController', 'SELECT propostas FROM laudos_projetos WHERE id = $1 FOR UPDATE']]) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'controllers', `${f}.js`), 'utf8');
    const ini = src.indexOf('async function gerarOrcamento');
    const corpo = src.slice(ini, src.indexOf('\nasync function', ini + 10) > 0 ? src.indexOf('\nasync function', ini + 10) : undefined);
    const tx = corpo.indexOf('await comTransacao(');
    assert.ok(tx > 0, f);
    assert.ok(corpo.indexOf(sql) > tx, `${f}: trava dentro da transação`);
    assert.ok(!/pool\.query\([^)]*FROM propostas WHERE id = \$1/.test(corpo), `${f}: proposta vinculada não é mais lida fora da transação`);
  }
});

caso('gerar orçamento (análise): o 2º clique espera o 1º e ATUALIZA a proposta criada por ele', silencio(async () => {
  const proj = require('../src/controllers/projetosController');
  // estado "do banco" compartilhado pelos dois cliques; a trava FOR UPDATE da
  // análise serializa as transações (imitada com uma fila)
  const estado = { proposta_id: null, criadas: 0, atualizadas: 0, seq: 100 };
  let fila = Promise.resolve();
  const linhaAnalise = { id: 7, cliente_nome: 'Cliente X', proposta_id: null, servicos: [{ descricao: 'Serviço', quantidade: 2, unidade: 'un', valor_unitario: 10 }], materiais: [], obra_id: null };
  const novoCliente = () => {
    let liberar = null;
    return {
      release() { if (liberar) liberar(); },
      async query(sql, p) {
        const s = String(sql).trim();
        if (/^BEGIN/.test(s)) return { rows: [] };
        if (/^(COMMIT|ROLLBACK)/.test(s)) { if (liberar) { liberar(); liberar = null; } return { command: 'COMMIT', rows: [] }; }
        if (/FROM analises_projeto WHERE id = \$1 FOR UPDATE/.test(s)) {
          const antes = fila; let fim; fila = new Promise(r => { fim = r; }); liberar = fim;
          await antes; return { rows: [{ proposta_id: estado.proposta_id }] };
        }
        if (/FROM propostas WHERE id = \$1 FOR UPDATE/.test(s)) return { rows: [{ numero: 'P100', status: 'Ativa', bdi: 0 }] };
        if (/UPDATE configuracoes/.test(s)) return { rows: [{ numero: estado.seq++ }] };
        if (/INSERT INTO propostas/.test(s)) { estado.criadas++; return { rows: [{ id: 555 }] }; }
        if (/UPDATE analises_projeto SET proposta_id/.test(s)) { estado.proposta_id = p[0]; return { rows: [] }; }
        if (/^UPDATE propostas SET/.test(s)) { estado.atualizadas++; return { rows: [] }; }
        if (/INSERT INTO proposta_secoes/.test(s)) return { rows: [{ id: 1 }] };
        if (/precos_mao_de_obra_referencia/.test(s)) return { rows: [{ codigo: 'MO-0001' }] }; // serviço já na base
        return { rows: [] };
      },
    };
  };
  banco.pool = { query: async (sql) => (/SELECT \* FROM analises_projeto/.test(sql) ? { rows: [linhaAnalise] } : { rows: [] }) };
  const poolOriginalConnect = poolFalso.connect;
  poolFalso.connect = async () => novoCliente();
  const resposta = () => ({ status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });
  const [r1, r2] = [resposta(), resposta()];
  const req = { params: { id: '7' }, usuario: { id: 1, nome: 'Teste' } };
  try {
    await Promise.all([proj.gerarOrcamento(req, r1, (e) => { throw e; }), proj.gerarOrcamento(req, r2, (e) => { throw e; })]);
  } finally {
    poolFalso.connect = poolOriginalConnect; banco.pool = null;
  }
  assert.strictEqual(estado.criadas, 1, 'uma proposta só');
  assert.strictEqual(estado.atualizadas, 1, 'o segundo clique atualiza');
  assert.deepStrictEqual([r1.body.criada, r2.body.criada].sort(), [false, true]);
}));

// ════════ item 13 — erro fora do try não deixa pedido pendurado ════════
function pedir(servidor, metodo, caminho, corpo) {
  return new Promise((resolve, reject) => {
    const { port } = servidor.address();
    const dados = corpo == null ? null : Buffer.from(JSON.stringify(corpo));
    const r = http.request({ host: '127.0.0.1', port, method: metodo, path: caminho, headers: dados ? { 'content-type': 'application/json', 'content-length': dados.length } : {} }, (res) => {
      let b = ''; res.on('data', d => { b += d; }); res.on('end', () => resolve({ status: res.statusCode, corpo: b ? JSON.parse(b) : null }));
    });
    r.setTimeout(3000, () => { r.destroy(new Error('pedido pendurado (sem resposta em 3 s)')); });
    r.on('error', reject);
    if (dados) r.write(dados);
    r.end();
  });
}

caso('protegerRotasAsync: rejeição/exceção em handler async vira 500 JSON (também nas rotas registradas depois)', silencio(async () => {
  const express = require('express');
  const { protegerRotasAsync, tratarErros } = require('../src/middleware/erros');
  const router = protegerRotasAsync(express.Router());
  router.post('/a', async (req) => { req.body.senha.toLowerCase(); });
  const v2 = (r) => r.get('/b', async () => { throw new Error('boom'); });
  v2(router);
  router.get('/c', (req, res) => res.json({ ok: true }));
  const app = express(); app.use(express.json()); app.use('/api', router); app.use(tratarErros);
  const srv = app.listen(0, '127.0.0.1');
  await new Promise(r => srv.once('listening', r));
  try {
    assert.deepStrictEqual(await pedir(srv, 'POST', '/api/a', { senha: 12345678 }), { status: 500, corpo: { erro: 'Erro interno do servidor.' } });
    assert.strictEqual((await pedir(srv, 'GET', '/api/b')).status, 500);
    assert.deepStrictEqual(await pedir(srv, 'GET', '/api/c'), { status: 200, corpo: { ok: true } });
  } finally { srv.close(); }
}));

caso('routes/index.js e o router público de aprovação usam protegerRotasAsync; alterarSenha/login/comparar validam tipo', async () => {
  const idx = fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'index.js'), 'utf8');
  assert.match(idx, /const router = protegerRotasAsync\(express\.Router\(\)\)/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'v2', 'aprovacao.js'), 'utf8'), /const publico = protegerRotasAsync\(express\.Router\(\)\)/);
  const auth = require('../src/controllers/authController');
  const res = () => ({ status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });
  const r1 = res(); await auth.alterarSenha({ body: { senhaAtual: 'abcdefgh1', novaSenha: 12345678 }, usuario: { id: 1 } }, r1);
  assert.strictEqual(r1.code, 400);
  const r2 = res(); await auth.login({ body: { email: { $ne: 1 }, senha: 'x' } }, r2);
  assert.strictEqual(r2.code, 400);
  const mat = require('../src/controllers/materiaisController');
  const r3 = res(); await mat.comparar({ body: { descricao: 123 } }, r3);
  assert.strictEqual(r3.code, 400);
});

// ════════ item 14 / 16 — migrações ════════
caso('schema: ALTER TYPE do documento só quando preciso; trava de migração; lock_timeout; ROLLBACK protegido', silencio(async () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'models', 'schema.js'), 'utf8');
  assert.ok(!/^\s*await client\.query\(`ALTER TABLE prestadores ALTER COLUMN documento TYPE VARCHAR\(20\)`\);/m.test(src), 'ALTER incondicional removido');
  assert.match(src, /character_maximum_length IS DISTINCT FROM 20/);
  // executa criarTabelas num cliente falso que falha na 1ª migração e cujo ROLLBACK também falha
  const { criarTabelas } = require('../src/models/schema');
  const c = clientePg({ falhar: (s) => (/CREATE TABLE IF NOT EXISTS usuarios/.test(s) ? Object.assign(new Error('erro real da migração'), { code: '55P03' }) : null) });
  const rollbackOriginal = c.query;
  c.query = async (sql, p) => { if (/^ROLLBACK$/.test(String(sql).trim())) throw new Error('conexão caiu'); return rollbackOriginal(sql, p); };
  banco.cliente = c;
  await assert.rejects(criarTabelas(), /erro real da migração/, 'o erro que sobe é o da migração, não o do ROLLBACK');
  assert.ok(c.log[1].startsWith('SELECT pg_advisory_xact_lock'), 'trava antes de tudo');
  assert.match(c.log[2], /^SET LOCAL lock_timeout = '10s'/);
  assert.ok(c.liberado instanceof Error, 'conexão descartada do pool');
}));

// ════════ item 15 — sincronização incremental do campo ════════
caso('campo: incremental cortado no limite devolve `agora` = última alteração (nada se perde)', () => {
  const { marcoDaSincronizacao } = require('../src/controllers/campoController')._interno;
  const agora = new Date('2026-10-27T12:00:00.000Z');
  assert.strictEqual(marcoDaSincronizacao({ agora, incremental: true, incompleto: false, ultimaAlteracao: null }), '2026-10-27T11:58:00.000Z');
  assert.strictEqual(marcoDaSincronizacao({ agora, incremental: true, incompleto: true, ultimaAlteracao: new Date('2026-10-20T08:00:00.123Z') }), '2026-10-20T08:00:00.123Z');
  assert.strictEqual(marcoDaSincronizacao({ agora, incremental: true, incompleto: true, ultimaAlteracao: new Date('2026-10-27T11:59:30Z') }), '2026-10-27T11:58:00.000Z', 'nunca depois da hora com folga');
  assert.strictEqual(marcoDaSincronizacao({ agora, incremental: false, incompleto: true, ultimaAlteracao: new Date('2026-10-20T08:00:00Z') }), '2026-10-27T11:58:00.000Z');
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'controllers', 'campoController.js'), 'utf8');
  assert.match(src, /'os\.atualizado_em, os\.id'/, 'incremental em ordem de alteração');
});

// ════════ item 8 — cronograma ════════
caso('cronograma: medição validada com os dados lidos na transação; versão conferida depois da trava', () => {
  const { montarMedicao } = require('../src/controllers/cronogramaController')._interno;
  const { ErroHttp } = require('../src/utils/erros');
  assert.throws(() => montarMedicao({ config: null, etapas: [], medicoes: [] }, {}), (e) => e instanceof ErroHttp && e.status === 400 && /Monte o cronograma/.test(e.message));
  const atual = { config: { periodicidade: 'mensal', criterio_peso: 'valor' }, etapas: [{ id: 1, nome: 'Etapa', valor: 100, inicio: '2026-10-01', fim: '2026-10-30', distribuicao: [{ periodo: '2026-10-01', percentual: 100 }] }], medicoes: [] };
  assert.throws(() => montarMedicao(atual, { data_medicao: '2026-10-15', itens: [{ etapa_id: 1, valor_medido: 150 }] }), /passaria o valor da etapa/);
  const ok1 = montarMedicao(atual, { data_medicao: '2026-10-15', itens: [{ etapa_id: 1, valor_medido: 60 }] });
  assert.strictEqual(ok1.linhas.length, 1);
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'controllers', 'cronogramaController.js'), 'utf8');
  const reg = src.slice(src.indexOf('async function registrarMedicao'));
  assert.ok(reg.indexOf('carregarDados(obra.id, client)') > reg.indexOf("FOR UPDATE"), 'medição relê o cronograma depois da trava');
  const sal = src.slice(src.indexOf('async function salvar'), src.indexOf('async function registrarMedicao'));
  assert.ok(sal.indexOf("SELECT versao FROM obra_cronogramas") > sal.indexOf('FOR UPDATE'), 'versão conferida depois da trava');
  assert.ok(sal.indexOf('FROM obra_medicoes WHERE etapa_id = ANY') > sal.indexOf('FOR UPDATE'), 'medições das etapas removidas conferidas depois da trava');
});

// ════════ item 10 — cotação de fornecedor: erro de banco não marca o arquivo ════════
caso('pasta de fornecedores: erro de BANCO não registra o arquivo como lido (erro de LEITURA continua registrado)', silencio(async () => {
  const { processarArquivo } = require('../src/services/cotacaoFornecedorService')._interno;
  const novoResumo = () => ({ arquivosProcessados: 0, materiaisCriados: 0, materiaisAtualizados: 0, materiaisJaCadastrados: 0, leiturasPorIA: 0, arquivos: [], avisos: [] });
  const insercoes = (c) => c.log.filter(s => /INSERT INTO arquivos_fornecedores_processados/.test(s)).length;
  // banco falha ao gravar
  const c1 = clientePg({ falhar: (s) => (/INSERT INTO arquivos_fornecedores_processados/.test(s) ? new Error('conexão perdida') : null) });
  const r1 = novoResumo();
  await processarArquivo(c1, { pasta: 'X', nome: 'a.pdf' }, { resumo: r1, ler: async () => ({ itens: [], metodo: 'teste', avisos: [] }), lerArquivo: async () => Buffer.from('a') });
  assert.strictEqual(insercoes(c1), 1, 'só a tentativa da transação (antes: + um registro "erro" com 0 itens)');
  assert.strictEqual(c1.gravados.length, 0);
  assert.match(r1.avisos[0], /tenta de novo/);
  // leitor quebra: registra (0 itens) para não reler à toa
  const c2 = clientePg();
  await processarArquivo(c2, { pasta: 'X', nome: 'b.pdf' }, { resumo: novoResumo(), ler: async () => { throw new Error('PDF corrompido'); }, lerArquivo: async () => Buffer.from('b') });
  assert.strictEqual(c2.gravados.filter(g => /arquivos_fornecedores_processados/.test(g.sql)).length, 1);
}));

// ════════ item 17 — classificação não passa por cima de quem já escolheu ════════
caso('classificação de materiais: UPDATE só se ainda pendente; contagem pelo que mudou de fato', silencio(async () => {
  const { classificarPendentes } = require('../src/services/classificacaoMateriais');
  const updates = [];
  banco.cliente = clientePg({ responder: (s, p) => {
    if (/SELECT id, descricao, ncm FROM materiais/.test(s)) return { rows: [{ id: 1, descricao: 'ITEM QWZX', ncm: '85444900' }, { id: 2, descricao: 'COISA YYZZ', ncm: null }] };
    if (/WHERE ncm = \$1/.test(s)) return { rows: [{ categoria: 'Elétrica' }] };
    if (/SELECT DISTINCT categoria/.test(s)) return { rows: [{ categoria: 'Elétrica' }, { categoria: 'CFTV' }] };
    if (/^UPDATE materiais SET categoria = \$1/.test(s)) { updates.push({ s, p }); return { rows: [], rowCount: 0 }; } // alguém já classificou na tela
    if (/count\(\*\)::int n/.test(s)) return { rows: [{ n: 0 }] };
    return { rows: [] };
  } });
  iaFalsa.resposta = { 2: 'CFTV' };
  const r = await classificarPendentes();
  assert.strictEqual(updates.length, 2);
  for (const u of updates) assert.match(u.s, /AND \(categoria IS NULL OR categoria = ANY\(\$3\)\)/);
  assert.strictEqual(r.classificadosLocal, 0);
  assert.strictEqual(r.classificadosIA, 0);
  assert.strictEqual(iaFalsa.chamadas, 1);
}));

// ════════ item [B2] 11 — item sem seção definida não entra em todas ════════
caso('item → seção: sid/nome indefinidos dos dois lados não casam (100 não vira 200)', () => {
  const { itemPertenceASecao } = require('../src/controllers/propostasController');
  assert.strictEqual(itemPertenceASecao({ descricao: 'x' }, { nome: 'Materiais' }), false);
  assert.strictEqual(itemPertenceASecao({ sid: 1 }, { id: 1, nome: 'A' }), true);
  assert.strictEqual(itemPertenceASecao({ secao_nome: 'A' }, { nome: 'A' }), true);
  assert.strictEqual(itemPertenceASecao({ secao_nome: 'A' }, { id: 3, nome: 'B' }), false);
  const secoes = [{ nome: 'Materiais' }, { nome: 'Serviços (Mão de Obra)' }];
  const itens = [{ secao_nome: 'Materiais', quantidade: 1, valor_unitario: 100 }, { quantidade: 1, valor_unitario: 50 }];
  assert.deepStrictEqual(secoes.map(s => itens.filter(it => itemPertenceASecao(it, s)).length), [1, 0]);
});

// ════════ item 18 — TRUST_PROXY documentado ════════
caso('TRUST_PROXY documentado como obrigatório para o link público', () => {
  const ex = fs.readFileSync(path.join(__dirname, '..', '.env.example'), 'utf8');
  assert.match(ex, /OBRIGATÓRIO antes de publicar o link de aprovação/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'src', 'server.js'), 'utf8'), /URL_PUBLICA está definida, mas TRUST_PROXY não/);
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`revisão backend [B1]: ${ok}/${casos.length} casos ok`);
  process.exit(process.exitCode || 0);
})();
