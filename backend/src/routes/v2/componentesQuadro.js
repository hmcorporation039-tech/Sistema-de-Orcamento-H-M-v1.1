// Catálogo de componentes de quadros por fabricante (medidas oficiais para o
// arranjo do quadro) — controllers/componentesQuadroController.js.
//
// Ver/listar: qualquer usuário logado. Cadastrar, editar, aprovar e excluir:
// administrador (o mesmo nível das telas de preço). Buscar a medida pela IA:
// qualquer usuário logado, com o limite de uso da pesquisa de mercado — o que
// a IA acha entra sempre "a conferir" e só o administrador aprova.
const ctrl = require('../../controllers/componentesQuadroController');

module.exports = (router, { autenticar, admin, validarId, limitePesquisaMercado }) => {
  router.get('/componentes-quadro', autenticar, ctrl.listar);
  router.post('/componentes-quadro', autenticar, admin, ctrl.criar);
  router.post('/componentes-quadro/pesquisar-medida', autenticar, limitePesquisaMercado, ctrl.pesquisarMedida);
  router.post('/componentes-quadro/pesquisar-medidas', autenticar, limitePesquisaMercado, ctrl.pesquisarEmLote);
  router.get('/componentes-quadro/pesquisas/:tarefa', autenticar, ctrl.tarefa);
  router.get('/componentes-quadro/:id', autenticar, validarId, ctrl.buscarUm);
  router.put('/componentes-quadro/:id', autenticar, validarId, admin, ctrl.atualizar);
  router.post('/componentes-quadro/:id/aprovar', autenticar, validarId, admin, ctrl.aprovar);
  router.delete('/componentes-quadro/:id', autenticar, validarId, admin, ctrl.remover);
};
