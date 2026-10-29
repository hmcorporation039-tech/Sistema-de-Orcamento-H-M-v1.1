#!/usr/bin/env node
// Importa o quadro de cargas de um projeto das skills de elétrica para o JSON
// da skill de quadros:
//   node skills/quadros/scripts/importar.js <projeto.json> --de eletrica [--tag QD-01] [--saida quadro.json]
//   node skills/quadros/scripts/importar.js <projeto.json> --de eletrica-industrial [--quadro CCM-01] [--saida quadro.json]
const fs = require('fs');
const path = require('path');
const { deEletrica, deIndustrial } = require('./lib/importar');

const arg = (n) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const arquivo = process.argv[2];
const de = arg('--de') || 'eletrica';
if (!arquivo || arquivo.startsWith('--')) {
  console.error('Uso: node importar.js <projeto.json> --de eletrica|eletrica-industrial [--quadro ID] [--tag TAG] [--saida quadro.json]');
  process.exit(2);
}
try {
  const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const r = de === 'eletrica-industrial' ? deIndustrial(dados, { quadro: arg('--quadro') }) : deEletrica(dados, { tag: arg('--tag') || 'QD-01' });
  const destino = path.resolve(arg('--saida') || path.join(path.dirname(path.resolve(arquivo)), `quadro-${r.dados.quadro.tag}.json`));
  fs.writeFileSync(destino, JSON.stringify(r.dados, null, 1));
  console.log(`${r.origem}\nSalvo em ${destino} — revise local, montagem, DPS e grupos de DR antes de calcular.`);
} catch (e) {
  console.error(`ERRO: ${e.message}`);
  process.exit(1);
}
