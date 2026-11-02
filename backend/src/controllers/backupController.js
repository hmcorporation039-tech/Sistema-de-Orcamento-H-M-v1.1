// Backup do banco pelo painel de Integrações (só administrador). Rotas em routes/v2/backup.js.
const backup = require('../services/backup');
const testeRestauracao = require('../services/testeRestauracao');
const { registrarAuditoria } = require('../services/auditoria');
const pool = require('../config/database');

// Último teste de restauração (scripts/testar-restauracao.js, mensal): vai junto da situação do backup.
function restauracao() {
  const r = testeRestauracao.lerResultado();
  return {
    ultimo: r ? { em: r.em, ok: r.ok, arquivo: r.arquivo, origem: r.origem, tabelas: r.tabelas, duracaoS: r.duracaoS, problemas: r.problemas || [] } : null,
    atrasado: testeRestauracao.atrasado(r),
    agendado: 'todo dia 1, às 03:30',
  };
}

async function situacao(req, res) {
  res.json({ ...(await backup.situacao()), restauracao: restauracao() });
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
  const sit = { ...(await backup.situacao()), restauracao: restauracao() };
  if (!r.ok) return res.status(500).json({ erro: r.erro, avisos: r.avisos, situacao: sit });
  res.json({ ok: true, arquivo: r.arquivo, avisos: r.avisos, situacao: sit });
}

module.exports = { situacao, executar };
