// Cache das chamadas à IA: mesma entrada = 1 chamada, entrada diferente = 2, expirado = nova
// chamada, erro/vazio não cacheia, `fresco` ignora o guardado; extrator de equipamentos usa o cache.
// Usa o banco do v2 e limpa só as linhas de teste. Rodar: node testes/iaCache.test.js
const assert = require('assert');
const pool = require('../src/config/database');
const iaCache = require('../src/services/iaCache');
const ia = require('../src/services/ia');
const migracao = require('../src/models/migracoes/2.0-26-ia-cache');

const NOME = 'teste_cache v1';
const NOME_EXT = 'equipamentos_projeto v1';

(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await migracao(client);
    await migracao(client); // idempotente
    await client.query('COMMIT');
  } finally { client.release(); }

  const inicio = new Date(Date.now() - 1000);
  const limpa = async () => {
    await pool.query("DELETE FROM ia_cache WHERE nome = $1 OR (nome = $2 AND criado_em >= $3)", [NOME, NOME_EXT, inicio]); // só o que o teste criou
    await pool.query("DELETE FROM ia_cache_uso WHERE nome = $1", [NOME]);
  };
  await limpa();
  try {
    let chamadas = 0;
    const faz = (v) => async () => { chamadas++; return v; };

    // mesma entrada (espaços e caixa não contam) = 1 chamada
    const a = await iaCache.comCache(NOME, 'Cabo  PP 3x2,5', { ttlDias: 7 }, faz({ itens: [1] }));
    const b = await iaCache.comCache(NOME, ' cabo pp 3x2,5 ', { ttlDias: 7 }, faz({ itens: [2] }));
    assert.strictEqual(chamadas, 1);
    assert.deepStrictEqual([a.deCache, b.deCache], [false, true]);
    assert.deepStrictEqual(b.valor, { itens: [1] });
    assert.ok(b.criadoEm);
    // entrada diferente = nova chamada
    await iaCache.comCache(NOME, 'outro texto', { ttlDias: 7 }, faz({ itens: [3] }));
    assert.strictEqual(chamadas, 2);
    // função (versão do roteiro) diferente não reaproveita
    await iaCache.comCache(`${NOME} v2`, 'cabo pp 3x2,5', { ttlDias: 7 }, faz({ itens: [4] }));
    assert.strictEqual(chamadas, 3);
    await pool.query("DELETE FROM ia_cache WHERE nome = $1", [`${NOME} v2`]);

    // fresco ignora o guardado e regrava
    const c = await iaCache.comCache(NOME, 'cabo pp 3x2,5', { ttlDias: 7, fresco: true }, faz({ itens: [5] }));
    assert.strictEqual(c.deCache, false);
    assert.deepStrictEqual((await iaCache.comCache(NOME, 'cabo pp 3x2,5', { ttlDias: 7 }, faz({ itens: [6] }))).valor, { itens: [5] });

    // expirado = nova chamada
    await pool.query("UPDATE ia_cache SET expira_em = NOW() - INTERVAL '1 minute' WHERE nome = $1", [NOME]);
    const antes = chamadas;
    const d = await iaCache.comCache(NOME, 'cabo pp 3x2,5', { ttlDias: 7 }, faz({ itens: [7] }));
    assert.strictEqual(chamadas, antes + 1);
    assert.strictEqual(d.deCache, false);
    assert.ok((await iaCache.limparExpirados()) >= 1); // as outras entradas de teste expiradas também saem

    // erro e resposta vazia não cacheiam
    await assert.rejects(iaCache.comCache(NOME, 'dá erro', { ttlDias: 7 }, async () => { throw new Error('IA fora'); }), /IA fora/);
    for (const vazio of [null, { itens: [] }, [], {}]) await iaCache.comCache(NOME, 'vazio', { ttlDias: 7 }, async () => vazio);
    const guardados = await pool.query("SELECT COUNT(*)::int n FROM ia_cache WHERE nome = $1 AND chave IN ($2, $3)", [NOME, iaCache.chaveDe(NOME, 'dá erro'), iaCache.chaveDe(NOME, 'vazio')]);
    assert.strictEqual(guardados.rows[0].n, 0);

    // contador do painel: acertos = chamadas evitadas
    const uso = (await iaCache.situacao(1)).funcoes.find(f => f.nome === NOME);
    assert.ok(uso.acertos >= 2 && uso.chamadas >= 4, JSON.stringify(uso));
    const s = await iaCache.situacao(1);
    assert.strictEqual(s.evitadas, s.acertos);
    assert.ok(s.taxa >= 0 && s.taxa <= 100);

    // extrator de equipamentos: mesmo texto de projeto não chama a IA duas vezes; erro cai no aviso
    const { extrairEquipamentosComIA } = require('../src/services/equipamentoExtratorIA');
    const orig = { perguntarJSON: ia.perguntarJSON, disponivel: ia.disponivel };
    let pedidos = 0;
    ia.disponivel = () => true;
    try {
      const texto = `projeto de teste do cache ${Date.now()}`;
      ia.perguntarJSON = async () => { pedidos++; return { provedor: 'gemini', json: { itens: [{ descricao: 'Luminária LED 18 W', referencia: 'ABC-1' }] } }; };
      const e1 = await extrairEquipamentosComIA(texto);
      const e2 = await extrairEquipamentosComIA(texto);
      assert.strictEqual(pedidos, 1);
      assert.deepStrictEqual(e2.itens, e1.itens);
      assert.strictEqual(e2.deCache, true);
      ia.perguntarJSON = async () => { pedidos++; throw new Error('sem IA'); };
      const e3 = await extrairEquipamentosComIA(`${texto} outro`);
      assert.deepStrictEqual(e3.itens, []);
      assert.match(e3.aviso, /falhou/);
      const e4 = await extrairEquipamentosComIA(`${texto} outro`); // o erro não ficou guardado: tenta a IA de novo
      assert.strictEqual(pedidos, 3);
      assert.deepStrictEqual(e4.itens, []);
    } finally { Object.assign(ia, orig); }
  } finally {
    await limpa();
    await pool.end();
  }
  console.log('iaCache: ok');
})().catch(e => { console.error(e); process.exit(1); });
