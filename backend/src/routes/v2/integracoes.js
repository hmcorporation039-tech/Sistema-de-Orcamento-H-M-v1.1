// Painel de Integrações (versão 2.0): rotinas automáticas e estado da IA. Só administrador.
const ctrl = require('../../controllers/rotinasController');

module.exports = (router, { autenticar, admin, limitePesquisaMercado }) => {
  router.get('/integracoes/rotinas', autenticar, admin, ctrl.listar);
  router.post('/integracoes/rotinas/:chave/executar', autenticar, admin, ctrl.executar);
  // teste real da cadeia de IA (gasta uma pergunta curta): mesmo limite da pesquisa de mercado
  router.post('/integracoes/ia/testar', autenticar, admin, limitePesquisaMercado, ctrl.testarIA);
};
