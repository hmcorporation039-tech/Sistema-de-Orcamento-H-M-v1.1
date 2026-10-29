// Registro único das disciplinas (skills/_comum/disciplinas.js) para a tela —
// a tela não guarda mais a sua cópia dos nomes (frontend/src/hooks/useDisciplinas.js).
const { registroDisciplinas } = require('../../config/caminhos');

module.exports = (router, { autenticar }) => {
  router.get('/disciplinas', autenticar, (req, res) => {
    const { DISCIPLINAS, OUTROS } = registroDisciplinas();
    res.json({ disciplinas: DISCIPLINAS, outros: OUTROS });
  });
};
