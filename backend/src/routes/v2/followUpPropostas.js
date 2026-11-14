// Propostas enviadas e sem resposta — controllers/followUpPropostasController.js (regras em
// services/followUpPropostas.js). Todos veem a lista; registrar contato ou adiar é do dono da proposta ou do
// administrador (mesma posse das demais ações da proposta).
const ctrl = require('../../controllers/followUpPropostasController');

module.exports = (router, { autenticar, validarId, posse }) => {
  router.get('/follow-up-propostas', autenticar, ctrl.listar);
  router.post('/propostas/:id/envio-registrado', autenticar, validarId, posse.proposta, ctrl.registrarEnvio);
  router.post('/propostas/:id/follow-up', autenticar, validarId, posse.proposta, ctrl.registrarContato);
};
