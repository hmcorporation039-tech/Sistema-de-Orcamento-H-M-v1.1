// Notas fiscais de serviço (versão 2.4) — controllers/notasFiscaisController.js.
// Tudo só administrador (mesma regra do Financeiro, onde a tela fica).
// Importação: XML soltos ou .zip, em memória (até 20 MB por arquivo, 300 arquivos).
const { criarUpload, multer } = require('../../utils/upload');
const ctrl = require('../../controllers/notasFiscaisController');

const uploadXml = criarUpload({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 300 } });

module.exports = (router, { autenticar, admin, validarId }) => {
  router.get('/notas-fiscais', autenticar, admin, ctrl.listar);
  router.post('/notas-fiscais', autenticar, admin, ctrl.criar);
  router.post('/notas-fiscais/importar', autenticar, admin, uploadXml.array('arquivos', 300), ctrl.importar);
  router.post('/notas-fiscais/de-proposta', autenticar, admin, ctrl.criarDeProposta);
  router.get('/notas-fiscais/cancelamento-config', autenticar, admin, ctrl.configCancelamento);
  router.get('/notas-fiscais/:id', autenticar, validarId, admin, ctrl.obter);
  router.put('/notas-fiscais/:id', autenticar, validarId, admin, ctrl.atualizar);
  router.delete('/notas-fiscais/:id', autenticar, validarId, admin, ctrl.remover);
  router.post('/notas-fiscais/:id/duplicar', autenticar, validarId, admin, ctrl.duplicar);
  router.post('/notas-fiscais/:id/cancelar', autenticar, validarId, admin, ctrl.cancelar);
  router.post('/notas-fiscais/:id/email', autenticar, validarId, admin, ctrl.enviarEmail);
  router.get('/notas-fiscais/:id/pdf', autenticar, validarId, admin, ctrl.pdf);
  router.get('/notas-fiscais/:id/preview-html', autenticar, validarId, admin, ctrl.previewHtml);
  router.get('/notas-fiscais/:id/xml', autenticar, validarId, admin, ctrl.xml);
  router.post('/notas-fiscais/:id/atestado', autenticar, validarId, admin, ctrl.previaAtestado);
  router.post('/notas-fiscais/:id/atestado.docx', autenticar, validarId, admin, ctrl.atestadoDocx);
  router.post('/notas-fiscais/:id/atestado/email', autenticar, validarId, admin, ctrl.enviarAtestado);
  router.get('/notas-fiscais/:id/notas-candidatas', autenticar, validarId, admin, ctrl.notasCandidatas);
  router.get('/notas-fiscais/:id/recebimentos', autenticar, validarId, admin, ctrl.recebimentosCandidatos);
  router.put('/notas-fiscais/:id/recebimento', autenticar, validarId, admin, ctrl.ligarRecebimento);
  router.get('/notas-fiscais/:id/propostas-candidatas', autenticar, validarId, admin, ctrl.propostasCandidatas);
  router.put('/notas-fiscais/:id/proposta', autenticar, validarId, admin, ctrl.vincularProposta);
};
