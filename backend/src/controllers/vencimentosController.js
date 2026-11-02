// Vencimentos de laudos (painel inicial): lista, cadastro dos laudos antigos, renovar e encerrar.
// Regras e e-mail em services/vencimentos.js. Rotas em routes/v2/vencimentos.js.
const venc = require('../services/vencimentos');
const { registrarAuditoria } = require('../services/auditoria');
const pool = require('../config/database');

const responder = (res, err) => res.status(err.status || 500).json({ erro: err.status ? err.message : 'Não foi possível concluir. Tente de novo.' });

async function listar(req, res) {
  try {
    await venc.sincronizarLaudos(pool);
    res.json(await venc.listar(pool));
  } catch (err) { responder(res, err); }
}

async function criar(req, res) {
  try {
    const id = await venc.criar(pool, req.body || {}, req.usuario.id);
    await registrarAuditoria(pool, { entidade: 'vencimento_laudo', entidadeId: id, acao: 'criar', usuarioId: req.usuario.id, detalhes: { descricao: req.body?.descricao, emitido_em: req.body?.emitido_em } });
    res.status(201).json({ id, ...(await venc.listar(pool)) });
  } catch (err) { responder(res, err); }
}

async function renovar(req, res) {
  try {
    await venc.renovar(pool, Number(req.params.id), req.body || {});
    await registrarAuditoria(pool, { entidade: 'vencimento_laudo', entidadeId: Number(req.params.id), acao: 'renovar', usuarioId: req.usuario.id, detalhes: req.body || {} });
    res.json(await venc.listar(pool));
  } catch (err) { responder(res, err); }
}

async function encerrar(req, res) {
  try {
    await venc.encerrar(pool, Number(req.params.id));
    await registrarAuditoria(pool, { entidade: 'vencimento_laudo', entidadeId: Number(req.params.id), acao: 'encerrar', usuarioId: req.usuario.id });
    res.json(await venc.listar(pool));
  } catch (err) { responder(res, err); }
}

module.exports = { listar, criar, renovar, encerrar };
