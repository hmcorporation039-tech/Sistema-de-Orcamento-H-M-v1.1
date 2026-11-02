// Notas emitidas ainda não pagas (services/notasAReceber.js). Dinheiro da empresa: tudo só para o administrador,
// como o resto do Financeiro.
const servico = require('../../services/notasAReceber');

module.exports = (router, { autenticar, admin, validarId }) => {
  const responder = (acao) => async (req, res) => {
    try {
      await acao(req);
    } catch (e) {
      if (e.status) return res.status(e.status).json({ erro: e.message });
      throw e;
    }
    res.json(await servico.listar());
  };

  router.get('/notas-a-receber', autenticar, admin, async (req, res) => {
    res.json(await servico.listar());
  });

  router.post('/notas-a-receber/ligar-sugeridas', autenticar, admin, async (req, res) => {
    let ligadas;
    try {
      ligadas = await servico.ligarSugeridas(req.usuario.id);
    } catch (e) {
      if (e.status) return res.status(e.status).json({ erro: e.message });
      throw e;
    }
    res.json({ ligadas, ...(await servico.listar()) });
  });

  router.post('/notas-a-receber/:id/ligar', autenticar, admin, validarId,
    responder(req => servico.ligar(Number(req.params.id), Number(req.body?.movimento_id), req.usuario.id)));

  router.post('/notas-a-receber/:id/baixa', autenticar, admin, validarId,
    responder(req => servico.darBaixa(Number(req.params.id), req.usuario.id, req.body?.obs)));

  router.delete('/notas-a-receber/:id/baixa', autenticar, admin, validarId,
    responder(req => servico.desfazerBaixa(Number(req.params.id), req.usuario.id)));
};
