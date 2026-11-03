const fs = require('fs');
const path = require('path');
const { defineConfig } = require('cypress');

// Os specs CRIAM clientes, materiais, propostas, usuários e contratos. Antes o
// endereço era fixo (http://localhost:3001 = PRODUÇÃO): no ambiente de teste
// (hm-eng-v2, backend na 3002), "npx cypress run" sem --config baseUrl gravava
// dados de teste no banco de produção.
// Agora: o endereço vem do PORT do backend/.env desta pasta (ou de
// CYPRESS_BASE_URL) e a suíte só roda contra o banco de teste (DB_NAME do mesmo
// .env = hm_orcamentos_v2, a mesma regra dos testes de banco do backend).
const BANCO_DE_TESTE = 'hm_orcamentos_v2';

function lerEnvBackend() {
  const env = {};
  try {
    const texto = fs.readFileSync(path.join(__dirname, '..', 'backend', '.env'), 'utf8');
    for (const linha of texto.split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  } catch { /* sem .env: cai na recusa abaixo */ }
  return env;
}

const envBackend = lerEnvBackend();
const portaEnv = envBackend.PORT || '3001';
const baseUrl = process.env.CYPRESS_BASE_URL || `http://localhost:${portaEnv}`;
const portaAlvo = (() => { try { const u = new URL(baseUrl); return u.port || (u.protocol === 'https:' ? '443' : '80'); } catch { return ''; } })();

if (envBackend.DB_NAME !== BANCO_DE_TESTE) {
  throw new Error(`Cypress recusado: o backend/.env desta pasta usa DB_NAME=${envBackend.DB_NAME || '(vazio)'}; `
    + `a suíte cria dados e só roda contra o banco de teste (${BANCO_DE_TESTE}), no hm-eng-v2.`);
}
if (portaAlvo !== portaEnv) {
  throw new Error(`Cypress recusado: o endereço ${baseUrl} não é o backend desta pasta (PORT=${portaEnv} no backend/.env), `
    + 'então não dá para garantir que o banco é o de teste. Tire o CYPRESS_BASE_URL ou aponte para a mesma porta.');
}

module.exports = defineConfig({
  e2e: {
    baseUrl,
    supportFile: 'cypress/support/e2e.js',
    video: false,
    defaultCommandTimeout: 8000,
    reporter: 'mochawesome',
    reporterOptions: {
      reportDir: 'cypress/reports',
      overwrite: false,
      html: false,
      json: true,
    },
  },
});
