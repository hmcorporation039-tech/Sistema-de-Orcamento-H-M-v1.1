// `npm run build` de produção sem tirar a tela do ar.
//
// O backend serve frontend/build direto. O react-scripts apaga essa pasta no
// começo do build e só a recria ~1 minuto depois: nesse intervalo quem estava
// usando o sistema recebia tela branca/erro. Aqui o build vai para
// frontend/build-novo e só no fim troca de lugar com o atual (renomear é
// instantâneo). Se o build falhar, o atual continua intacto.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const atual = path.join(raiz, 'build');
const novo = path.join(raiz, 'build-novo');
const anterior = path.join(raiz, 'build-anterior');

fs.rmSync(novo, { recursive: true, force: true });
const r = spawnSync(process.execPath, [require.resolve('react-scripts/scripts/build')], {
  cwd: raiz,
  stdio: 'inherit',
  env: { ...process.env, BUILD_PATH: novo },
});
if (r.status !== 0) {
  fs.rmSync(novo, { recursive: true, force: true });
  console.error('\nBuild falhou — a versão em uso (frontend/build) não foi alterada.');
  process.exit(r.status || 1);
}

fs.rmSync(anterior, { recursive: true, force: true });
if (fs.existsSync(atual)) fs.renameSync(atual, anterior);
fs.renameSync(novo, atual);
fs.rmSync(anterior, { recursive: true, force: true });
console.log('\nNova versão no ar (frontend/build). Recarregue o sistema com Ctrl+F5.');
