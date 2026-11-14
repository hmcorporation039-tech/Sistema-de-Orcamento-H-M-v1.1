// Atribuição dos Pix às obras (só administrador: depende do financeiro). Regras em services/atribuicaoObras.js.
const svc = require('../services/atribuicaoObras');
const { registrarAuditoria } = require('../services/auditoria');
const pool = require('../config/database');
const { registrarErroInesperado } = require('../middleware/erros');

// erro com status: a mensagem é para o usuário; sem status: inesperado — registrado (log + resumo diário) e
// resposta genérica (antes o 500 não deixava rastro nenhum)
const responder = (req, res, err) => {
  if (!err.status) registrarErroInesperado(req, err);
  res.status(err.status || 500).json({ erro: err.status ? err.message : 'Não foi possível concluir. Tente de novo.' });
};

async function pendentes(req, res) {
  try { res.json(await svc.carregarPendentes(pool)); } catch (err) { responder(req, res, err); }
}

async function atribuir(req, res) {
  try {
    const r = await svc.atribuir(pool, req.body || {}, req.usuario.id);
    await registrarAuditoria(pool, {
      entidade: 'financeiro_movimento', acao: 'atribuir_obra', usuarioId: req.usuario.id,
      detalhes: { tipo: req.body?.tipo, grupo: req.body?.chave, obra_id: req.body?.obra_id ?? null, geral: !!req.body?.geral, lembrar: !!req.body?.lembrar, de: req.body?.de || null, ate: req.body?.ate || null, ...r },
    });
    res.json({ ...r, ...(await svc.carregarPendentes(pool)) });
  } catch (err) { responder(req, res, err); }
}

module.exports = { pendentes, atribuir };
