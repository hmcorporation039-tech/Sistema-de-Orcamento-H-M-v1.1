// Revisão 2.40 — o que ficou de fora das versões 2.36 a 2.39 (parte do servidor):
//   - gatilho materiais_sem_preco_zero (migração 2.0-59): o catálogo não tem item a R$ 0,00 também no banco,
//     sem travar a edição dos materiais a zero mantidos de propósito (kits);
//   - rotas do comparador da concorrência e das cotações de fornecedor só com caminho e middlewares;
//   - falhas externas (Receita, ação do assistente) entram no resumo diário de erros;
//   - a bateria confere o lint do frontend como o build do CRA (scripts/lint-frontend.js).
// Dados SINTÉTICOS; o que grava no banco fica numa transação desfeita no fim. Rodar: node testes/revisao240.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('banco: material novo ou preço zerado é recusado (HMP01 → 400); o antigo a zero continua editável', async () => {
  const pool = require('../src/config/database');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await require('../src/models/migracoes/2.0-59-materiais-sem-preco-zero')(c);
    await require('../src/models/migracoes/2.0-59-materiais-sem-preco-zero')(c); // idempotente
    const tentar = async (sql, p) => {
      await c.query('SAVEPOINT t');
      try { await c.query(sql, p); return 'aceito'; } catch (e) { return e.code; } finally { await c.query('ROLLBACK TO SAVEPOINT t'); }
    };
    assert.strictEqual(await tentar("INSERT INTO materiais (descricao, categoria, unidade, preco) VALUES ('Material sintético 2.40 a zero', 'Geral', 'un', 0)"), 'HMP01');
    assert.strictEqual(await tentar("INSERT INTO materiais (descricao, categoria, unidade, preco) VALUES ('Material sintético 2.40 com preço', 'Geral', 'un', 1.5)"), 'aceito');
    const { rows: [novo] } = await c.query("INSERT INTO materiais (descricao, categoria, unidade, preco) VALUES ('Material sintético 2.40 b', 'Geral', 'un', 2) RETURNING id");
    assert.strictEqual(await tentar('UPDATE materiais SET preco = 0 WHERE id = $1', [novo.id]), 'HMP01');
    // simula um antigo a zero (como os de kit): grava com o gatilho desligado só nesta transação
    await c.query('ALTER TABLE materiais DISABLE TRIGGER trg_materiais_sem_preco_zero');
    const { rows: [antigo] } = await c.query("INSERT INTO materiais (descricao, categoria, unidade, preco) VALUES ('Material sintético 2.40 kit a zero', 'Geral', 'un', 0) RETURNING id");
    await c.query('ALTER TABLE materiais ENABLE TRIGGER trg_materiais_sem_preco_zero');
    assert.strictEqual(await tentar("UPDATE materiais SET categoria = 'Kit' WHERE id = $1", [antigo.id]), 'aceito');
    await c.query('UPDATE materiais SET ativo = false WHERE id = $1', [antigo.id]);
    assert.strictEqual(await tentar('UPDATE materiais SET ativo = true WHERE id = $1', [antigo.id]), 'HMP01', 'reativar a zero');
  } finally {
    await c.query('ROLLBACK').catch(() => {});
    c.release();
  }
  const { tratarErros } = require('../src/middleware/erros');
  const res = { headersSent: false, codigo: 0, status(c) { this.codigo = c; return this; }, json(b) { this.corpo = b; return this; } };
  tratarErros(Object.assign(new Error('x'), { code: 'HMP01' }), { method: 'POST', originalUrl: '/api/materiais' }, res, () => {});
  assert.strictEqual(res.codigo, 400);
  assert.match(res.corpo.erro, /catálogo não tem item a R\$ 0,00/);
});

caso('rotas do comparador e das cotações: só caminho e middlewares (posse e admin nos mesmos lugares)', () => {
  const rotas = [];
  const router = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(m => [m, (url, ...mw) => rotas.push({ m, url, mw })]));
  const autenticar = () => {}; const validarId = () => {}; const admin = () => {}; const posse = () => {};
  require('../src/routes/v2/concorrencia')(router, { autenticar, validarId, exigirPosse: () => posse });
  require('../src/routes/v2/cotacoesFornecedor')(router, { autenticar, validarId, admin });
  for (const r of rotas) assert.strictEqual(r.mw[0], autenticar, `${r.m} ${r.url} sem autenticar`);
  const de = (m, url) => rotas.find(r => r.m === m && r.url === url);
  for (const [m, url] of [['patch', '/concorrencia/:id'], ['patch', '/concorrencia/:id/itens/:itemId'], ['delete', '/concorrencia/:id']]) assert.ok(de(m, url).mw.includes(posse), `${m} ${url} sem posse`);
  assert.ok(de('put', '/cotacoes/fornecedores/:cnpj').mw.includes(admin));
  for (const f of ['concorrencia.js', 'cotacoesFornecedor.js']) {
    const fonte = fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'v2', f), 'utf8');
    assert.ok(!/pool\.query|res\.status|await /.test(fonte), `${f} ainda tem lógica`);
  }
});

caso('falha externa (Receita, ação do assistente) vai para o resumo diário de erros', () => {
  for (const [f, re] of [
    [['controllers', 'notasFiscais', 'cancelamento.js'], /registrarErroInesperado\(req, err\);\s*return res\.status\(502\)/],
    [['controllers', 'assistenteController.js'], /registrarErroInesperado\(req, e\)/],
  ]) assert.match(fs.readFileSync(path.join(__dirname, '..', 'src', ...f), 'utf8'), re, f.join('/'));
});

caso('bateria: o lint do frontend é o do build do CRA e pega regra inexistente e variável sem definição', () => {
  const p = require('../scripts/pre-deploy');
  assert.strictEqual(typeof p.rodarLintFrontend, 'function');
  assert.strictEqual(p.resumoSuite({ saida: 'lint do frontend: 209 arquivos, 0 com erro\n' }), '209 arquivos, 0 com erro');
  const fonte = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'lint-frontend.js'), 'utf8');
  assert.match(fonte, /eslint-config-react-app\/base/);
  assert.match(fonte, /'no-undef': 'error'/);
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`revisão 2.40: ${ok}/${casos.length} casos ok`);
  await require('../src/config/database').end().catch(() => {});
})();
