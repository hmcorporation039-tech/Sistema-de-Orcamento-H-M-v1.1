// Propostas enviadas e sem resposta (services/followUpPropostas.js). Todos veem a lista; registrar contato ou adiar
// é do dono da proposta ou do administrador (mesma posse das demais ações da proposta).
const servico = require('../../services/followUpPropostas');
const pool = require('../../config/database');

module.exports = (router, { autenticar, validarId, posse }) => {
  router.get('/follow-up-propostas', autenticar, async (req, res) => {
    res.json(await servico.listar());
  });

  router.post('/propostas/:id/envio-registrado', autenticar, validarId, posse.proposta, async (req, res) => {
    try {
      await servico.registrarEnvio(pool, Number(req.params.id), req.usuario.id, req.body || {});
    } catch (e) {
      if (e.status) return res.status(e.status).json({ erro: e.message });
      throw e;
    }
    res.json(await servico.listar());
  });

  router.post('/propostas/:id/follow-up', autenticar, validarId, posse.proposta, async (req, res) => {
    try {
      await servico.registrar(pool, Number(req.params.id), req.usuario.id, req.body || {});
    } catch (e) {
      if (e.status) return res.status(e.status).json({ erro: e.message });
      throw e;
    }
    res.json(await servico.listar());
  });
};
