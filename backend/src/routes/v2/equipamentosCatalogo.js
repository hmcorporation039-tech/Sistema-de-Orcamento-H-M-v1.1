// Catálogo de equipamentos de climatização (chiller, fancoil, split, VRF, self, VAV,
// bombas, torres) com os dados técnicos do fabricante — fase 4 do roteiro.
// controllers/equipamentosCatalogoController.js.
//
// Ver/listar: qualquer usuário logado. Cadastrar, editar, aprovar e excluir:
// administrador (o mesmo nível do catálogo de componentes de quadros).
const ctrl = require('../../controllers/equipamentosCatalogoController');

module.exports = (router, { autenticar, admin, validarId }) => {
  router.get('/equipamentos-catalogo', autenticar, ctrl.listar);
  router.post('/equipamentos-catalogo', autenticar, admin, ctrl.criar);
  router.get('/equipamentos-catalogo/:id', autenticar, validarId, ctrl.buscarUm);
  router.put('/equipamentos-catalogo/:id', autenticar, validarId, admin, ctrl.atualizar);
  router.post('/equipamentos-catalogo/:id/aprovar', autenticar, validarId, admin, ctrl.aprovar);
  router.delete('/equipamentos-catalogo/:id', autenticar, validarId, admin, ctrl.remover);
};
