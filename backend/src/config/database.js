const { Pool } = require('pg');
require('./env');
const { FUSO } = require('../utils/dataHoje');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hm_orcamentos',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '',
  // Sem limites, uma consulta travada podia segurar uma conexão pra sempre —
  // com o tempo, as conexões disponíveis do pool se esgotam e o sistema
  // inteiro trava esperando por uma conexão livre. `statement_timeout` mata a
  // query travada no próprio Postgres; `max` evita abrir conexões demais num
  // banco que roda no mesmo PC que a API e o Puppeteer.
  max: Number(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS) || 30000,
  // "Hoje" do banco (CURRENT_DATE, NOW() gravado em TIMESTAMP sem fuso) no fuso de Brasília em
  // toda conexão, e não no fuso que o PostgreSQL tiver configurado: uma reinstalação ou um
  // servidor em UTC mudaria o dia dos vencimentos, do painel e dos limites de uso da IA (2.39).
  options: `-c TimeZone=${FUSO}`,
});

pool.on('connect', () => {
  console.log('Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Erro no PostgreSQL:', err.message);
});

module.exports = pool;
