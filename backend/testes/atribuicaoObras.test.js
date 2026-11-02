// Atribuição dos Pix às obras: agrupamento, sugestão só com sinal seguro, regra "lembrar" e período.
// A parte do banco só roda em hm_orcamentos_v2.
const assert = require('assert');
const a = require('../src/services/atribuicaoObras');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };

const mov = (tipo, nome, valor, dia, prestador_id = null) => ({ tipo, nome, valor, data_hora: `${dia}T12:00:00Z`, prestador_id });

(async () => {
  await caso('agrupa por tipo e nome sem acento nem caixa; soma, período e prestador', () => {
    const g = a.agrupar([
      mov('recebido', 'Hospital Santa Lucia S A', 100000, '2026-09-14'),
      mov('recebido', 'HOSPITAL  SANTA LÚCIA S.A.', 12325.5, '2026-10-15'),
      mov('realizado', 'Hospital Santa Lucia S A', 50, '2026-10-16'),
      mov('realizado', 'Jose Carlos', 300, '2026-08-01', 7),
      mov('realizado', 'Jose Carlos', 300, '2026-09-01', 7),
      mov('realizado', '   ', 10, '2026-09-01'),
    ]);
    assert.strictEqual(g.length, 3, 'nome vazio fica de fora; recebido e realizado do mesmo nome são grupos diferentes');
    const rec = g.find(x => x.tipo === 'recebido');
    assert.strictEqual(rec.n, 2);
    assert.strictEqual(rec.total, 112325.5);
    assert.strictEqual(rec.de, '2026-09-14');
    assert.strictEqual(rec.ate, '2026-10-15');
    assert.deepStrictEqual(g.find(x => x.nome === 'Jose Carlos').prestadores, [7]);
    assert.strictEqual(g[0].total, 112325.5, 'ordenado do maior valor para o menor');
  });

  const obras = [
    { id: 5, codigo: 'OB-5', nome: 'Santa Lucia Sobradinho', cliente_nome: 'Hospital Santa Lucia Sobradinho', status: 'contratada' },
    { id: 7, codigo: 'OB-7', nome: 'Santa Lucia — Hospital', cliente_nome: 'Hospital Santa Lucia S/A', status: 'contratada' },
    { id: 12, codigo: 'OB-12', nome: 'Santa Lucia — outra', cliente_nome: 'Hospital Santa Lucia S/A', status: 'contratada' },
    { id: 6, codigo: 'OB-6', nome: 'Rebeca — Lago Sul', cliente_nome: 'Rebeca Drummond', status: 'contratada' },
    { id: 11, codigo: 'OB-11', nome: 'Ingrid — Águas Claras', cliente_nome: 'Ingrid', status: 'orcamento' },
    { id: 20, codigo: 'OB-20', nome: 'Rebeca antiga', cliente_nome: 'Rebeca Drummond', status: 'concluida' },
  ];

  await caso('recebido: sugere só quando o cliente tem UMA obra em andamento; com várias, só lista candidatas', () => {
    const g = (nome) => a.agrupar([mov('recebido', nome, 1, '2026-09-01')])[0];
    const s1 = a.sugerir(g('Rebeca Drummond'), { obras });
    assert.strictEqual(s1.obra_id, 6, 'a obra concluída da mesma cliente não conta');
    const s2 = a.sugerir(g('Hospital Santa Lucia S A'), { obras });
    assert.strictEqual(s2.obra_id, null);
    assert.deepStrictEqual(s2.candidatas, [7, 12], 'Santa Lucia S/A tem duas obras: não adivinha');
    assert.strictEqual(a.sugerir(g('Sushi Gourmet Restaurante Ltda'), { obras }), null);
    assert.strictEqual(a.sugerir(g('Ing'), { obras }), null, 'nome curto demais não casa por "contém"');
  });

  await caso('realizado: sugere pelo contrato do prestador, só se for uma obra', () => {
    const g = (prest) => a.agrupar([mov('realizado', 'Prestador X', 100, '2026-09-10', prest)])[0];
    const contratos = [{ prestador_id: 1, obra_id: 5 }, { prestador_id: 1, obra_id: 5 }, { prestador_id: 2, obra_id: 5 }, { prestador_id: 2, obra_id: 7 }];
    assert.strictEqual(a.sugerir(g(1), { contratos }).obra_id, 5);
    const dois = a.sugerir(g(2), { contratos });
    assert.strictEqual(dois.obra_id, null);
    assert.deepStrictEqual(dois.candidatas, [5, 7]);
    assert.strictEqual(a.sugerir(g(3), { contratos }), null);
    assert.strictEqual(a.sugerir(g(null), { contratos }), null);
  });

  await caso('atribuir recusa pedido malformado antes de tocar no banco', async () => {
    const db = { query: async () => { throw new Error('não era para consultar'); } };
    await assert.rejects(() => a.atribuir(db, { tipo: 'outro', chave: 'x', obra_id: 1 }), /Tipo inválido/);
    await assert.rejects(() => a.atribuir(db, { tipo: 'recebido', chave: '', obra_id: 1 }), /Grupo inválido/);
    await assert.rejects(() => a.atribuir(db, { tipo: 'recebido', chave: 'x' }), /Escolha a obra/);
    await assert.rejects(() => a.atribuir(db, { tipo: 'recebido', chave: 'x', obra_id: 1, de: '01/09/2026' }), /Período inválido/);
  });

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`atribuicaoObras: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    const limpar = async () => {
      await pool.query("DELETE FROM regras_movimento_obra WHERE nome_chave LIKE 'zz atrib%'").catch(() => {});
      await pool.query("DELETE FROM financeiro_movimentos WHERE nome LIKE 'ZZ Atrib%'").catch(() => {});
      await pool.query("DELETE FROM obras WHERE codigo LIKE 'ZZ-ATRIB%'").catch(() => {});
    };
    try {
      await require('../src/models/migracoes/2.0-32-regras-movimento-obra')(pool);
      await require('../src/models/migracoes/2.0-32-regras-movimento-obra')(pool);  // idempotente
      await limpar();
      const obra = async (cod, cliente) => (await pool.query("INSERT INTO obras (codigo, nome, cliente_nome, status) VALUES ($1, $1, $2, 'execucao') RETURNING id", [cod, cliente])).rows[0].id;
      const lanca = async (tipo, nome, valor, dia) => (await pool.query(
        'INSERT INTO financeiro_movimentos (tipo, nome, valor, data_hora, origem) VALUES ($1, $2, $3, $4, $5) RETURNING id', [tipo, nome, valor, `${dia} 12:00`, 'manual'])).rows[0].id;
      const obraDe = async (id) => (await pool.query('SELECT obra_id FROM financeiro_movimentos WHERE id = $1', [id])).rows[0].obra_id;

      await caso('banco: pendentes aparecem agrupados com sugestão, e atribuir liga só o período pedido', async () => {
        const o1 = await obra('ZZ-ATRIB-1', 'ZZ Atrib Cliente Unico');
        const m1 = await lanca('recebido', 'ZZ Atrib Cliente Unico', 1000, '2026-03-01');
        const m2 = await lanca('recebido', 'ZZ Atrib Cliente Unico', 2000, '2026-06-01');
        const p = await a.carregarPendentes(pool);
        const grupo = p.grupos.find(g => g.chave === 'zz atrib cliente unico');
        assert.strictEqual(grupo.n, 2);
        assert.strictEqual(grupo.total, 3000);
        assert.strictEqual(grupo.sugestao.obra_id, o1);
        const r = await a.atribuir(pool, { tipo: 'recebido', chave: grupo.chave, obra_id: o1, ate: '2026-03-31' });
        assert.strictEqual(r.mudou, 1);
        assert.strictEqual(await obraDe(m1), o1);
        assert.strictEqual(await obraDe(m2), null, 'fora do período fica como estava');
        await assert.rejects(() => a.atribuir(pool, { tipo: 'recebido', chave: grupo.chave, obra_id: 999999 }), /Obra não encontrada/);
      });

      await caso('banco: regra "lembrar" liga só os lançamentos criados depois; "geral" tira da lista', async () => {
        const o2 = await obra('ZZ-ATRIB-2', 'ZZ Atrib Dois');
        const antigo = await lanca('realizado', 'ZZ Atrib Fornecedor', 50, '2026-01-10');
        const r = await a.atribuir(pool, { tipo: 'realizado', chave: 'zz atrib fornecedor', obra_id: o2, lembrar: true, ate: '2025-12-31' });
        assert.strictEqual(r.mudou, 0, 'nada no período, mas a regra foi gravada');
        assert.ok(r.regra);
        assert.strictEqual(await a.aplicarRegras(pool), 0, 'o lançamento criado ANTES da regra não é ligado');
        assert.strictEqual(await obraDe(antigo), null);
        const novo = await lanca('realizado', 'ZZ Atrib Fornecedor', 70, '2026-11-02');
        await pool.query("UPDATE regras_movimento_obra SET criado_em = NOW() - INTERVAL '1 minute' WHERE nome_chave = 'zz atrib fornecedor'");
        await pool.query('UPDATE financeiro_movimentos SET criado_em = NOW() - INTERVAL \'2 minutes\' WHERE id = $1', [antigo]);
        assert.strictEqual(await a.aplicarRegras(pool), 1, 'só o novo');
        assert.strictEqual(await obraDe(novo), o2);
        assert.strictEqual(await obraDe(antigo), null);

        await lanca('realizado', 'ZZ Atrib Despesa Geral', 99, '2026-10-10');
        assert.ok((await a.carregarPendentes(pool)).grupos.some(g => g.chave === 'zz atrib despesa geral'));
        await a.atribuir(pool, { tipo: 'realizado', chave: 'zz atrib despesa geral', geral: true });
        assert.ok(!(await a.carregarPendentes(pool)).grupos.some(g => g.chave === 'zz atrib despesa geral'), 'despesa geral sai da lista');
      });
    } finally {
      await limpar();
      await pool.end();
    }
  }

  console.log(`atribuicaoObras: ok (${ok} verificações)`);
})().catch(e => { console.error(e); process.exit(1); });
