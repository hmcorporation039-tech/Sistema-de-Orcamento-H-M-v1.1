// Caminhos do sistema montados num lugar só (antes "path.join(__dirname, '..',
// '..', '..', 'skills')" estava em 8 arquivos, cada um com o seu número de "..").
const path = require('path');

const RAIZ_REPOSITORIO = path.join(__dirname, '..', '..', '..');
const RAIZ_SKILLS = path.join(RAIZ_REPOSITORIO, 'skills');
const CAD = path.join(RAIZ_SKILLS, '_comum', 'cad');

// registro único das disciplinas (skills/_comum/disciplinas.js)
const registroDisciplinas = () => require(path.join(RAIZ_SKILLS, '_comum', 'disciplinas.js'));

module.exports = { RAIZ_REPOSITORIO, RAIZ_SKILLS, CAD, registroDisciplinas };
