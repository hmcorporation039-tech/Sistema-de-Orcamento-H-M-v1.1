// Histórico de preços vendidos (item 5 do plano): faixa praticada (menor, mediana, maior, último)
// por material, só com proposta APROVADA e item confirmado; a proposta em edição não conta contra
// si. Tudo dentro de uma transação desfeita no fim (não deixa nada no banco do v2).
// Rodar: node testes/precosVendidos.test.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');

(async () => {
  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`precosVendidos: pulado (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
    return;
  }
  const pool = require('../src/config/database');
  const { lerIds, faixasPorMaterial, LIMITE_IDS } = require('../src/services/precosVendidos');

  // lista de ids vinda da tela: só inteiro positivo, sem repetir, com teto
  assert.deepStrictEqual(lerIds('3, 5,abc,5,-2,0,1.5,7'), [3, 5, 7]);
  assert.deepStrictEqual(lerIds([9, '9', 4]), [9, 4]);
  assert.deepStrictEqual(lerIds(undefined), []);
  assert.strictEqual(lerIds(Array.from({ length: 900 }, (_, i) => i + 1)).length, LIMITE_IDS);
  assert.deepStrictEqual(await faixasPorMaterial([]), {});

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const mat = (await client.query(
      "INSERT INTO materiais (descricao, categoria, unidade, preco) VALUES ('ZZ teste preço vendido', 'Teste', 'un', 10) RETURNING id")).rows[0].id;
    const matSemVenda = (await client.query(
      "INSERT INTO materiais (descricao, categoria, unidade, preco) VALUES ('ZZ teste sem venda', 'Teste', 'un', 10) RETURNING id")).rows[0].id;

    let seq = 900000 + Math.floor(Math.random() * 90000);
    const proposta = async (status, data) => {
      seq++;
      return (await client.query(
        "INSERT INTO propostas (numero, sequencial, data, cliente_nome, status) VALUES ($1, $2, $3, 'Cliente teste', $4) RETURNING id, numero",
        [`T${seq}`.slice(0, 10), seq, data, status])).rows[0];
    };
    const item = (propostaId, materialId, vu, status = 'confirmado') => client.query(
      `INSERT INTO proposta_itens (proposta_id, material_id, descricao, quantidade, valor_unitario, valor_total, status)
       VALUES ($1, $2, 'item teste', 2, $3::numeric, $3::numeric * 2, $4)`, [propostaId, materialId, vu, status]);

    const a1 = await proposta('Aprovada', '2026-01-10'); await item(a1.id, mat, 10);
    const a2 = await proposta('Aprovada', '2026-03-05'); await item(a2.id, mat, 14);
    const a3 = await proposta('Aprovada', '2026-02-01'); await item(a3.id, mat, 12);
    const a4 = await proposta('Aprovada', '2026-04-01'); await item(a4.id, mat, 99, 'a_cotar'); // estimativa: não conta
    const a5 = await proposta('Aprovada', '2026-04-02'); await item(a5.id, mat, 0);              // sem preço: não conta
    const ativa = await proposta('Ativa', '2026-05-01'); await item(ativa.id, mat, 1);
    const recusada = await proposta('Recusada', '2026-05-02'); await item(recusada.id, mat, 2);
    const cancelada = await proposta('Cancelada', '2026-05-03'); await item(cancelada.id, mat, 500);

    let f = await faixasPorMaterial([mat, matSemVenda], {}, client);
    assert.deepStrictEqual(Object.keys(f), [String(mat)], 'material sem venda não aparece');
    assert.deepStrictEqual(
      { ...f[mat], ultima_proposta: undefined },
      { propostas: 3, minimo: 10, mediana: 12, maximo: 14, ultimo: 14, ultima_data: '2026-03-05', ultima_proposta: undefined });
    assert.strictEqual(f[mat].ultima_proposta, a2.numero, 'último = proposta aprovada mais recente');

    // a proposta aberta na tela não conta contra si mesma
    f = await faixasPorMaterial([mat], { excluirPropostaId: a2.id }, client);
    assert.deepStrictEqual([f[mat].propostas, f[mat].minimo, f[mat].maximo, f[mat].ultimo, f[mat].ultima_data], [2, 10, 12, 12, '2026-02-01']);

    // mediana com número par de preços (interpola) e arredonda a 2 casas
    const a6 = await proposta('Aprovada', '2026-06-01'); await item(a6.id, mat, 15.55);
    f = await faixasPorMaterial([mat], {}, client);
    assert.deepStrictEqual([f[mat].propostas, f[mat].mediana, f[mat].maximo, f[mat].ultimo], [4, 13, 15.55, 15.55]);

    // aprovação desfeita (volta a Ativa) sai do histórico na hora
    await client.query("UPDATE propostas SET status = 'Ativa' WHERE id = $1", [a6.id]);
    f = await faixasPorMaterial([mat], {}, client);
    assert.deepStrictEqual([f[mat].propostas, f[mat].maximo], [3, 14]);

    // a rota existe e exige login
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'routes', 'index.js'), 'utf8');
    assert.ok(/router\.get\('\/materiais\/precos-vendidos', autenticar,/.test(src));
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    await pool.end();
  }
  console.log('precosVendidos: ok');
})().catch(e => { console.error(e); process.exit(1); });
