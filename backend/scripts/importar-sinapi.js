// Importa a planilha mensal do SINAPI (Caixa) para as tabelas sinapi_* (só o estado pedido).
// Uso: node scripts/importar-sinapi.js "C:\caminho\SINAPI_Referência_2026_09.xlsx" [UF]
// A planilha vem no zip SINAPI-AAAA-MM-formato-xlsx.zip de
// https://www.caixa.gov.br/site/paginas/downloads.aspx (categoria "SINAPI - Relatórios mensais - a partir de 2025").
// Reimportar o mesmo mês/UF substitui os dados (serve para a retificação da Caixa).
const pool = require('../src/config/database');
const { criarTabelas } = require('../src/models/schema');
const sinapi = require('../src/services/sinapi');

(async () => {
  const [caminho, uf = sinapi.UF_PADRAO] = process.argv.slice(2);
  if (!caminho) { console.error('Uso: node scripts/importar-sinapi.js <planilha SINAPI_Referência.xlsx> [UF]'); process.exit(1); }
  await criarTabelas(); // garante as tabelas (migração idempotente)
  const r = await sinapi.importar(caminho, { uf: uf.toUpperCase() });
  console.log(`SINAPI ${r.mes} ${r.uf}: ${r.insumos} insumos e ${r.composicoes} composições (os dois regimes).`);
  await pool.end();
})().catch(e => { console.error('Falhou:', e.message); process.exit(1); });
