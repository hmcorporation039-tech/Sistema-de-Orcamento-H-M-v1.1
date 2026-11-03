// Migrações num banco VAZIO (auditoria 02/11/2026, BD-06). É o caso de uma instalação nova ou de um servidor
// reconstruído depois de um desastre: os outros testes só rodam criarTabelas() sobre o v2 já migrado, então
// uma migração que dependa de tabela criada por outra mais à frente (ou fora de ordem) só apareceria nesse dia.
// Cria um banco temporário (BANCO_TEMP), roda criarTabelas() DUAS vezes (a segunda prova a idempotência),
// compara tabelas e colunas (information_schema) com as do hm_orcamentos_v2 e apaga o temporário no fim,
// mesmo se falhar. Índices ficam de fora: o v2 tem dois GIN criados à mão (BD-03).
// Só roda com DB_NAME=hm_orcamentos_v2; o v2 só é LIDO.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const { Client } = require('pg');

const BANCO_DE_TESTE = 'hm_orcamentos_v2';
const BANCO_TEMP = 'hm_teste_migracoes';
if (process.env.DB_NAME !== BANCO_DE_TESTE) {
  console.log(`migracoesBancoVazio: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  process.exit(0);
}

const conectar = async (banco) => {
  const c = new Client({
    host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432, database: banco,
    user: process.env.DB_USER || 'postgres', password: process.env.DB_PASS || '',
    statement_timeout: 120000,
  });
  await c.connect();
  return c;
};

// "tabela.coluna tipo" de cada coluna das tabelas do schema public (views ficam de fora)
async function estrutura(client) {
  const { rows } = await client.query(`
    SELECT c.table_name, c.column_name, c.data_type
      FROM information_schema.columns c
      JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
     WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'`);
  return {
    tabelas: new Set(rows.map(r => r.table_name)),
    colunas: new Map(rows.map(r => [`${r.table_name}.${r.column_name}`, r.data_type])),
  };
}

// chaves de `de` (Set de tabelas ou Map de colunas) que não estão em `em`
const faltando = (de, em) => [...de.keys()].filter(k => !em.has(k)).sort();

async function principal() {
  const inicio = Date.now();
  const admin = await conectar('postgres');
  let pool;
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${BANCO_TEMP} WITH (FORCE)`); // sobra de uma rodada que caiu no meio
    await admin.query(`CREATE DATABASE ${BANCO_TEMP}`);

    // O pool do backend é criado no require de config/database, com o DB_NAME do ambiente (o env.js não
    // sobrescreve variável já definida). Este teste roda num processo só dele, então apontar o DB_NAME
    // para o banco temporário ANTES do require faz o criarTabelas() migrar o temporário, sem tocar no v2.
    process.env.DB_NAME = BANCO_TEMP;
    pool = require('../src/config/database');
    const { criarTabelas } = require('../src/models/schema');
    assert.strictEqual(pool.options.database, BANCO_TEMP, 'o pool precisa apontar para o banco temporário');

    const logOriginal = console.log;
    console.log = () => {}; // "Conectado ao PostgreSQL" e o resumo das migrações, duas vezes
    try {
      await criarTabelas();
      await criarTabelas(); // migração idempotente: rodar de novo num banco recém-criado não pode falhar
    } finally { console.log = logOriginal; }

    const doTemp = await conectar(BANCO_TEMP);
    const doV2 = await conectar(BANCO_DE_TESTE);
    let novo, v2;
    try { novo = await estrutura(doTemp); v2 = await estrutura(doV2); } finally {
      await doTemp.end().catch(() => {});
      await doV2.end().catch(() => {});
    }

    const tabelasSoNoV2 = faltando(v2.tabelas, novo.tabelas);
    const tabelasSoNoNovo = faltando(novo.tabelas, v2.tabelas);
    const colunasSoNoV2 = faltando(v2.colunas, novo.colunas).filter(k => !tabelasSoNoV2.includes(k.split('.')[0]));
    const colunasSoNoNovo = faltando(novo.colunas, v2.colunas).filter(k => !tabelasSoNoNovo.includes(k.split('.')[0]));
    const tiposDiferentes = [...novo.colunas].filter(([k, tipo]) => v2.colunas.has(k) && v2.colunas.get(k) !== tipo)
      .map(([k, tipo]) => `${k} (novo: ${tipo}, v2: ${v2.colunas.get(k)})`).sort();

    assert.deepStrictEqual(tabelasSoNoV2, [], 'tabelas que existem no v2 e o banco novo não cria');
    assert.deepStrictEqual(tabelasSoNoNovo, [], 'tabelas que o banco novo cria e o v2 não tem');
    assert.deepStrictEqual(colunasSoNoV2, [], 'colunas que existem no v2 e o banco novo não cria');
    assert.deepStrictEqual(colunasSoNoNovo, [], 'colunas que o banco novo cria e o v2 não tem');
    assert.deepStrictEqual(tiposDiferentes, [], 'colunas com tipo diferente entre o banco novo e o v2');

    console.log(`migracoesBancoVazio: ok — banco vazio migrado 2× e igual ao v2 (${novo.tabelas.size} tabelas, ${novo.colunas.size} colunas) em ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
  } finally {
    if (pool) await pool.end().catch(() => {});
    await admin.query(`DROP DATABASE IF EXISTS ${BANCO_TEMP} WITH (FORCE)`).catch(() => {});
    await admin.end().catch(() => {});
  }
}

principal().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
