// Backup do banco pelo painel de Integrações (só administrador). Rotas em routes/v2/backup.js.
const backup = require('../services/backup');
const { registrarAuditoria } = require('../services/auditoria');
const pool = require('../config/database');

async function situacao(req, res) {
  res.json(await backup.situacao());
}

// Roda o backup na hora (só o banco, com as cópias de rede e nuvem). A auditoria
// guarda quem pediu e como terminou.
async function executar(req, res) {
  let r;
  try {
    r = await backup.executar({ usuarioId: req.usuario.id });
  } catch (err) {
    return res.status(err.status || 500).json({ erro: err.message });
  }
  await registrarAuditoria(pool, {
    entidade: 'backup', acao: 'backup_manual', usuarioId: req.usuario.id,
    detalhes: { ok: r.ok, arquivo: r.arquivo, avisos: r.avisos.slice(0, 10), erro: r.erro },
  });
  const sit = await backup.situacao();
  if (!r.ok) return res.status(500).json({ erro: r.erro, avisos: r.avisos, situacao: sit });
  res.json({ ok: true, arquivo: r.arquivo, avisos: r.avisos, situacao: sit });
}

module.exports = { situacao, executar };
