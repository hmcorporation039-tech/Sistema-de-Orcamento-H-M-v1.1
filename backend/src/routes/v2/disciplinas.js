// Registro único das disciplinas (skills/_comum/disciplinas.js) para a tela —
// a tela não guarda mais a sua cópia dos nomes (frontend/src/hooks/useDisciplinas.js).
// 2.37: também os nomes antigos de chave (aliases) e as chaves só visuais (iluminação externa), para a tela dar
// o nome curto e a cor de qualquer disciplina que o 3D ou o Mapa do CAD mostrem.
const { registroDisciplinas } = require('../../config/caminhos');

module.exports = (router, { autenticar }) => {
  router.get('/disciplinas', autenticar, (req, res) => {
    const { DISCIPLINAS, OUTROS, ALIASES_CHAVE, EXTRAS_VISUAIS } = registroDisciplinas();
    res.json({ disciplinas: DISCIPLINAS, outros: OUTROS, aliases: ALIASES_CHAVE || {}, extras: EXTRAS_VISUAIS || [] });
  });
};
