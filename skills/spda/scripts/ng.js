#!/usr/bin/env node
// Uso: node scripts/ng.js "<município>" [UF]
// Consulta o NG na Tabela F.1 da NBR 5419-2:2026 (única fonte aceita, F.1.1).

const { buscarNg, sugerirMunicipios } = require('./lib/ng');

const [municipio, uf] = process.argv.slice(2);
if (!municipio) {
  console.error('Uso: node scripts/ng.js "<município>" [UF]');
  process.exit(2);
}
const achado = buscarNg(municipio, uf);
if (achado) {
  console.log(`${achado.municipio}/${achado.uf}: NG = ${achado.ng} descargas/km²/ano (NBR 5419-2:2026, Tabela F.1)`);
} else {
  const sugestoes = sugerirMunicipios(municipio, uf);
  console.log(`Não encontrado: "${municipio}"${uf ? `/${uf}` : ''}.`);
  if (sugestoes.length) console.log('Parecidos:\n' + sugestoes.map(s => `  ${s.municipio}/${s.uf}: NG = ${s.ng}`).join('\n'));
  process.exit(1);
}
