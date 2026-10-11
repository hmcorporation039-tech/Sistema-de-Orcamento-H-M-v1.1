// Roda os testes de regressão de todas as skills: `npm test` na pasta skills
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let falhou = false;
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
