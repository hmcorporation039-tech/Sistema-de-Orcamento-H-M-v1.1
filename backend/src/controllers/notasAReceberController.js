// Notas emitidas ainda não pagas (services/notasAReceber.js) — rotas em routes/v2/notasAReceber.js, todas só
// do administrador (dinheiro da empresa, como o resto do Financeiro).
// Erro do serviço com status (400/404/409) sai pelo tratador central (middleware/erros.js) como { erro: mensagem }.
const servico = require('../services/notasAReceber');

async function listar(req, res) {
  res.json(await servico.listar());
}

// A resposta é sempre a lista nova; o que a ação devolver (ligadas, obra do Pix, avisos) vai junto.
const responder = (acao) => async (req, res) => {
  const r = await acao(req);
  res.json({ ...(r && typeof r === 'object' ? r : {}), ...(await servico.listar()) });
};

// { ligadas, obras_preenchidas, avisos }
const ligarSugeridas = responder(req => servico.ligarSugeridas(req.usuario.id));
// Pix já ligados a nota cuja proposta tem obra, mas ainda sem obra: leva a obra da nota (só preenche obra vazia).
// { preenchidos, obras }
const aplicarObraDasNotas = responder(req => servico.aplicarObraDasNotas(req.usuario.id));
// { obra_id, obra_preenchida, aviso }: o aviso vem quando o Pix já era de outra obra (e continua nela)
const ligar = responder(req => servico.ligar(Number(req.params.id), Number(req.body?.movimento_id), req.usuario.id));
const darBaixa = responder(req => servico.darBaixa(Number(req.params.id), req.usuario.id, req.body?.obs));
const desfazerBaixa = responder(req => servico.desfazerBaixa(Number(req.params.id), req.usuario.id));

module.exports = { listar, ligarSugeridas, aplicarObraDasNotas, ligar, darBaixa, desfazerBaixa };
