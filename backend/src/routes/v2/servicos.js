// Base única de serviços de mão de obra (versão 2.0, Fase 1B) — ver
// utils/servicosBase.js. A lista é de qualquer usuário logado (tela
// Orçamento); fundir/desativar é só do administrador (tela Preços de Mão de
// Obra). A edição de valores e a pesquisa continuam em /precos-mao-de-obra.
const ctrl = require('../../controllers/servicosController');

module.exports = (router, { autenticar, admin }) => {
  router.get('/servicos', autenticar, ctrl.listar);
  router.get('/servicos/segmento', autenticar, ctrl.segmento);
  router.post('/servicos/:codigo/fundir', autenticar, admin, ctrl.fundir);
  router.put('/servicos/:codigo/ativo', autenticar, admin, ctrl.definirAtivo);
};
