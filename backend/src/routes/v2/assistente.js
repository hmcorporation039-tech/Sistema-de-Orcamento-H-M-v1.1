// Assistente virtual (controllers/assistenteController.js). Tudo com autenticar.
//
// TELA (login normal; o token do assistente é recusado aqui pelo
// middleware/escopoAssistente.js — ele não aplica a própria ação):
//   status, conversas (listar/criar/ver/renomear/arquivar), anexos, mensagem
//   com resposta em streaming (NDJSON pelo fetch, token no cabeçalho), acompanhar,
//   cancelar, aplicar/descartar ação pendente.
// FERRAMENTAS (só token de escopo 'assistente', da conversa do token):
//   /assistente/ferramentas/* — arquivos da conversa, normas, histórico de preço
//   e propor ação.
const ctrl = require('../../controllers/assistenteController');

module.exports = (router, { autenticar, validarId }) => {
  router.get('/assistente/status', autenticar, ctrl.status);
  router.get('/assistente/contexto', autenticar, ctrl.contextoDaTela);
  router.get('/assistente/conversas', autenticar, ctrl.listarConversas);
  router.post('/assistente/conversas', autenticar, ctrl.criarConversa);
  router.get('/assistente/conversas/:id', autenticar, validarId, ctrl.verConversa);
  router.patch('/assistente/conversas/:id', autenticar, validarId, ctrl.alterarConversa);
  router.post('/assistente/conversas/:id/arquivos', autenticar, validarId, ctrl.receberArquivos, ctrl.enviarArquivos);
  router.post('/assistente/conversas/:id/mensagens', autenticar, validarId, ctrl.enviarMensagem);
  router.get('/assistente/conversas/:id/acompanhar', autenticar, validarId, ctrl.acompanhar);
  router.post('/assistente/conversas/:id/cancelar', autenticar, validarId, ctrl.cancelar);
  router.get('/assistente/arquivos/:id', autenticar, validarId, ctrl.baixarArquivo);
  router.post('/assistente/acoes/:id/aplicar', autenticar, validarId, ctrl.aplicarAcao);
  router.post('/assistente/acoes/:id/descartar', autenticar, validarId, ctrl.descartarAcao);

  router.get('/assistente/ferramentas/contexto', autenticar, ctrl.soAssistente, ctrl.ferramentaContexto);
  router.get('/assistente/ferramentas/arquivos', autenticar, ctrl.soAssistente, ctrl.ferramentaArquivos);
  router.get('/assistente/ferramentas/arquivos/:id', autenticar, ctrl.soAssistente, ctrl.ferramentaArquivo);
  router.get('/assistente/ferramentas/arquivos/:id/conteudo', autenticar, ctrl.soAssistente, ctrl.ferramentaArquivoConteudo);
  router.get('/assistente/ferramentas/norma', autenticar, ctrl.soAssistente, ctrl.ferramentaNorma);
  router.get('/assistente/ferramentas/historico-preco', autenticar, ctrl.soAssistente, ctrl.ferramentaHistoricoPreco);
  router.post('/assistente/ferramentas/acoes', autenticar, ctrl.soAssistente, ctrl.ferramentaProporAcao);
};
