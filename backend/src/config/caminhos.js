// Caminhos do sistema montados num lugar só (antes "path.join(__dirname, '..',
// '..', '..', 'skills')" estava em 8 arquivos, cada um com o seu número de "..").
// Mover um arquivo de pasta (utils → services, por exemplo) não muda mais
// nenhum caminho: todos partem daqui.
const path = require('path');

const RAIZ_REPOSITORIO = path.join(__dirname, '..', '..', '..');
const RAIZ_SKILLS = path.join(RAIZ_REPOSITORIO, 'skills');
const COMUM = path.join(RAIZ_SKILLS, '_comum');
const CAD = path.join(COMUM, 'cad');
// identidade visual da H&M (logo.png, cabecalho.png): fonte única, a mesma das skills (docx-base.js).
// O backend lia cópias em src/assets (auditoria 02/11/2026, OP-11); o frontend/public/logo.png fica,
// porque o build do React só publica o que está em public — testes/identidadeVisual.test.js confere o hash.
const ASSETS_COMUM = path.join(COMUM, 'assets');

// registro único das disciplinas (skills/_comum/disciplinas.js)
const registroDisciplinas = () => require(path.join(COMUM, 'disciplinas.js'));

module.exports = { RAIZ_REPOSITORIO, RAIZ_SKILLS, COMUM, CAD, ASSETS_COMUM, registroDisciplinas };
