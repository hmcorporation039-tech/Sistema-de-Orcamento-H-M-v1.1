// Pix sem obra: agrupados por nome, com sugestão, para o administrador ligar à obra (margem real).
const ctrl = require('../../controllers/atribuicaoObrasController');

module.exports = (router, { autenticar, admin }) => {
  router.get('/financeiro/atribuicao-obras', autenticar, admin, ctrl.pendentes);
  router.post('/financeiro/atribuicao-obras', autenticar, admin, ctrl.atribuir);
};
