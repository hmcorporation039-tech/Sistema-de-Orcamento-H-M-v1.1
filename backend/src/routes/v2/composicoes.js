// Composições e kits (versão 2.0, Fase 3H) — ver controllers/composicoesController.js.
// Listar, ver, calcular rascunho e explodir no orçamento: qualquer usuário
// logado. Criar, editar, duplicar, ativar/desativar e excluir: administrador.
const ctrl = require('../../controllers/composicoesController');

module.exports = (router, { autenticar, admin, validarId }) => {
  router.get('/composicoes', autenticar, ctrl.listar);
  router.post('/composicoes', autenticar, admin, ctrl.criar);
  router.post('/composicoes/calcular', autenticar, ctrl.calcular);
  router.post('/composicoes/explodir', autenticar, ctrl.explodir);
  router.get('/composicoes/:id', autenticar, validarId, ctrl.buscarUma);
  router.put('/composicoes/:id', autenticar, validarId, admin, ctrl.atualizar);
  router.post('/composicoes/:id/duplicar', autenticar, validarId, admin, ctrl.duplicar);
  router.put('/composicoes/:id/ativo', autenticar, validarId, admin, ctrl.definirAtivo);
  router.delete('/composicoes/:id', autenticar, validarId, admin, ctrl.remover);
};
