// Roda os testes de regressão de todas as skills: `npm test` na pasta skills
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let falhou = false;
// base comum: CAD (DXF, leitura de arquitetura, posicionamento, plantas, modelo 3D ilustrativo),
// classificação projeto × laudo dos documentos, as entregas do projeto (as-built, ZIP)
// e a leitura de data/GPS das fotos (EXIF) dos relatórios fotográficos; o caderno de
// fabricação e montagem (PDF) de quadros e racks; o modelo único da instalação (quadro →
// circuito → comando → ponto) da elétrica, da iluminação, dos quadros e do 3D e o
// simulador lógico dele (3D interativo: disjuntores, interruptores, contatores, motores);
// a fotometria (IES/LDT) e o cálculo ponto a ponto da iluminação (skill e mapa do 3D); o entendimento do projeto
// (objetivo, papel de cada vista, legendas, componentes e abrigo — 09/11/2026); o quadro fiel com a fiação
// F/N/PE, o motor genérico de interação (subestação, incêndio, alarme, CFTV, acesso), a vista interna
// do rack e da central e a cor da infraestrutura por tipo (09/11/2026)
for (const teste of ['cad/teste-cad.js', 'cad/teste-3d.js', 'cad/teste-projeto-dxf.js', 'cad/teste-leitura-precisao.js', 'cad/teste-objetivo.js', 'cad/teste-pavimentos.js', 'teste-tipos-documento.js', 'teste-entrega.js', 'teste-inspecao.js', 'teste-exif.js', 'fabricacao/teste-fabricacao.js', 'instalacao/teste-instalacao.js', 'instalacao/teste-simulador.js', 'instalacao/teste-painel.js', 'instalacao/teste-paineis-comando.js', 'fotometria/teste-fotometria.js', 'especificacao/teste-especificacao.js', 'especificacao/teste-disciplinas.js']) {
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
