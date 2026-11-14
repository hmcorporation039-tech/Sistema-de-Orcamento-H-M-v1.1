// Revisão da proposta antes do envio por e-mail — controllers/propostaDocumentos.js (revisaoEnvio), regras em
// services/revisaoPreEnvio.js. Só leitura; mesma posse do envio.
const ctrl = require('../../controllers/propostaDocumentos');

module.exports = (router, { autenticar, validarId, posse }) => {
  router.get('/propostas/:id/revisao-envio', autenticar, validarId, posse.proposta, ctrl.revisaoEnvio);
};
