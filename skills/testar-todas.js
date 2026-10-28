// Roda os testes de regressão de todas as skills: `npm test` na pasta skills
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let falhou = false;
// base comum: CAD (DXF, leitura de arquitetura, posicionamento, plantas),
// classificação projeto × laudo dos documentos e as entregas do projeto (as-built, ZIP)
for (const teste of ['cad/teste-cad.js', 'teste-tipos-documento.js', 'teste-entrega.js', 'teste-inspecao.js']) {
  try {
    process.stdout.write(execFileSync(process.execPath, [path.join(__dirname, '_comum', ...teste.split('/'))], { encoding: 'utf8' }));
  } catch (e) {
    falhou = true;
    process.stdout.write(e.stdout || '');
    console.log(`_comum/${teste}: FALHOU`);
  }
}
for (const pasta of fs.readdirSync(__dirname)) {
  if (pasta.startsWith('_') || pasta === 'node_modules') continue;
  const dir = path.join(__dirname, pasta, 'testes');
  if (!fs.existsSync(dir)) continue;
  for (const arq of fs.readdirSync(dir).filter(a => a.endsWith('.js'))) {
    try {
      process.stdout.write(execFileSync(process.execPath, [path.join(dir, arq)], { encoding: 'utf8' }));
    } catch (e) {
      falhou = true;
      process.stdout.write(e.stdout || '');
      console.log(`${pasta}/${arq}: FALHOU`);
    }
  }
}
process.exitCode = falhou ? 1 : 0;
