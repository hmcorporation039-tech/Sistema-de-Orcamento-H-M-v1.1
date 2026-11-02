// Revisão da proposta antes do envio por e-mail (services/revisaoPreEnvio.js). Só leitura; mesma posse do envio.
const { revisarProposta } = require('../../services/revisaoPreEnvio');

module.exports = (router, { autenticar, validarId, posse }) => {
  router.get('/propostas/:id/revisao-envio', autenticar, validarId, posse.proposta, async (req, res) => {
    const revisao = await revisarProposta(req.params.id);
    if (!revisao) return res.status(404).json({ erro: 'Proposta não encontrada' });
    res.json(revisao);
  });
};
