// Notas emitidas ainda não pagas (services/notasAReceber.js). Dinheiro da empresa: tudo só para o administrador,
// como o resto do Financeiro.
const servico = require('../../services/notasAReceber');

module.exports = (router, { autenticar, admin, validarId }) => {
  // A resposta é sempre a lista nova; o que a ação devolver (ligadas, obra do Pix, avisos) vai junto.
  const responder = (acao) => async (req, res) => {
    let r;
    try {
      r = await acao(req);
    } catch (e) {
      if (e.status) return res.status(e.status).json({ erro: e.message });
      throw e;
    }
    res.json({ ...(r && typeof r === 'object' ? r : {}), ...(await servico.listar()) });
  };

  router.get('/notas-a-receber', autenticar, admin, async (req, res) => {
    res.json(await servico.listar());
  });

  // { ligadas, obras_preenchidas, avisos }
  router.post('/notas-a-receber/ligar-sugeridas', autenticar, admin,
    responder(req => servico.ligarSugeridas(req.usuario.id)));

  // Pix já ligados a nota cuja proposta tem obra, mas ainda sem obra: leva a obra da nota (só preenche obra vazia).
  // { preenchidos, obras }
  router.post('/notas-a-receber/obra-das-notas', autenticar, admin,
    responder(req => servico.aplicarObraDasNotas(req.usuario.id)));

  // { obra_id, obra_preenchida, aviso }: o aviso vem quando o Pix já era de outra obra (e continua nela)
  router.post('/notas-a-receber/:id/ligar', autenticar, admin, validarId,
    responder(req => servico.ligar(Number(req.params.id), Number(req.body?.movimento_id), req.usuario.id)));

  router.post('/notas-a-receber/:id/baixa', autenticar, admin, validarId,
    responder(req => servico.darBaixa(Number(req.params.id), req.usuario.id, req.body?.obs)));

  router.delete('/notas-a-receber/:id/baixa', autenticar, admin, validarId,
    responder(req => servico.desfazerBaixa(Number(req.params.id), req.usuario.id)));
};
