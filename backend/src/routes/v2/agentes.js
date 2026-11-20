// Agentes próprios (09/11/2026) — controllers/agentesController.js. Tudo com autenticar.
//   GET  /agentes                          registro dos agentes (dados), situação do módulo de quadros e do suporte
//   GET  /agentes/execucoes                 as do usuário (admin: ?todas=1)
//   POST /agentes/execucoes                 inicia ({ agente, entrada, conversa_id?, aguardar? }); o que a entrada
//                                           aponta (análise, projeto, proposta) só é alterável se for do usuário/admin
//   GET  /agentes/execucoes/:id             dono ou admin
//   POST /agentes/execucoes/:id/cancelar    dono ou admin (parar não apaga nada)
//   GET  /agentes/conhecimento              base de conhecimento (sem dado de cliente)
//   POST /agentes/pedidos/:id/avaliacao     o usuário diz se o resultado do pedido roteado serviu
//   GET  /agentes/sugestoes                 pendentes/aprovadas (admin vê todas; os outros, as próprias)
//   PUT  /agentes/sugestoes/:id             aprovar/recusar (vocabulário: admin; conhecimento: admin ou o autor)
//   GET  /agentes/indicadores               dependência de IA por agente (suporte Claude Max por mês)
//   GET  /agentes/conhecimento-disciplinas  (2.49) regras do projetista (embutidas + aprendidas) e frases, por disciplina
const ctrl = require('../../controllers/agentesController');

module.exports = (router, { autenticar }) => {
  router.get('/agentes', autenticar, ctrl.listar);
  router.get('/agentes/execucoes', autenticar, ctrl.listarExecucoes);
  router.post('/agentes/execucoes', autenticar, ctrl.iniciar);
  router.get('/agentes/execucoes/:id', autenticar, ctrl.ver);
  router.post('/agentes/execucoes/:id/cancelar', autenticar, ctrl.cancelar);
  router.get('/agentes/conhecimento', autenticar, ctrl.consultarConhecimento);
  router.post('/agentes/pedidos/:id/avaliacao', autenticar, ctrl.avaliarPedido);
  router.get('/agentes/sugestoes', autenticar, ctrl.listarSugestoes);
  router.put('/agentes/sugestoes/:id', autenticar, ctrl.decidirSugestao);
  router.get('/agentes/indicadores', autenticar, ctrl.indicadores);
  router.get('/agentes/conhecimento-disciplinas', autenticar, ctrl.conhecimentoDisciplinas);
};
