// SINAPI local (referência de preços da Caixa). Consulta para qualquer usuário logado;
// trocar estado/regime de referência é só do administrador.
const ctrl = require('../../controllers/sinapiController');

module.exports = (router, { autenticar, admin }) => {
  router.get('/sinapi/situacao', autenticar, ctrl.situacao);
  router.get('/sinapi/buscar', autenticar, ctrl.buscar);
  router.put('/sinapi/config', autenticar, admin, ctrl.configurar);
};
