// Comparativo de fornecedores (services/cotacoesFornecedor.js): leitura para todos os usuários logados.
// O nome do fornecedor (palpite tirado do documento) vale para todos: só administrador corrige, e fica na
// auditoria (antes qualquer usuário renomeava, sem registro de quem mudou).
// Handlers em controllers/cotacoesFornecedorController.js (2.40); aqui ficam o caminho e os middlewares.
const ctrl = require('../../controllers/cotacoesFornecedorController');

module.exports = (router, { autenticar, admin, validarId }) => {
  router.get('/materiais/:id/cotacoes', autenticar, validarId, ctrl.comparacaoDoMaterial);
  router.get('/cotacoes/oportunidades', autenticar, ctrl.oportunidades);
  router.put('/cotacoes/fornecedores/:cnpj', autenticar, admin, ctrl.renomearFornecedor);
};
