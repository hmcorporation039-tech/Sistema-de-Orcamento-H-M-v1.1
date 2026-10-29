// Cronograma físico-financeiro e medições da obra (versão 2.0, Fase 3G) — ver
// controllers/cronogramaController.js. Ver: qualquer usuário logado. Gerar,
// editar e registrar medição: quem pode editar a obra (dono ou administrador).
const ctrl = require('../../controllers/cronogramaController');

module.exports = (router, { autenticar, validarId, posse }) => {
  const posseObra = posse.obra('alterar o cronograma ou registrar medição');
  router.get('/obras/:id/cronograma', autenticar, validarId, ctrl.obter);
  router.put('/obras/:id/cronograma', autenticar, validarId, posseObra, ctrl.salvar);
  router.post('/obras/:id/cronograma/gerar', autenticar, validarId, posseObra, ctrl.gerar);
  router.get('/obras/:id/cronograma/planilha', autenticar, validarId, ctrl.planilha);
  router.get('/obras/:id/medicoes', autenticar, validarId, ctrl.listarMedicoes);
  router.post('/obras/:id/medicoes', autenticar, validarId, posseObra, ctrl.registrarMedicao);
  router.get('/obras/:id/medicoes/boletim', autenticar, validarId, ctrl.boletim);
};
