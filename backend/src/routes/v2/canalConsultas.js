// Consultas de leitura da Fase 6 (canal remoto e ferramentas do assistente/MCP). Toda rota passa por
// autenticar; o financeiro (custos, margem, Pix sem obra, notas) só para o administrador e o papel
// financeiro (exigePapel do módulo de segurança, resolvido na hora do pedido).
const ctrl = require('../../controllers/canalConsultas');
const { exigePapelTardio } = require('../../services/canal/dependencias');

module.exports = (router, { autenticar, validarId }) => {
  const financeiro = exigePapelTardio('admin', 'financeiro');
  router.get('/consultas/obras/:id/custos', autenticar, validarId, financeiro, ctrl.custos);
  router.get('/consultas/obras/:id/margem', autenticar, validarId, financeiro, ctrl.margem);
  router.get('/consultas/pix-sem-obra', autenticar, financeiro, ctrl.pixSemObra);
  router.get('/consultas/notas-fiscais', autenticar, financeiro, ctrl.notasFiscais);
  router.get('/consultas/notas-a-receber', autenticar, financeiro, ctrl.notasAReceber);
  router.get('/consultas/vencimentos', autenticar, ctrl.vencimentos);
  router.get('/consultas/novidades-pastas', autenticar, ctrl.novidadesPastas);
  router.get('/consultas/cotacoes', autenticar, ctrl.cotacoes);
  router.get('/consultas/historico-preco', autenticar, ctrl.historico);
};
