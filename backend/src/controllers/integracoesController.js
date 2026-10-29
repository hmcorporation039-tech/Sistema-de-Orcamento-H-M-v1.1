const pool = require('../config/database');
const { credenciaisConfiguradas } = require('../utils/emailClient');
const rotinas = require('../services/rotinas');
const { registrarAuditoria } = require('../utils/auditoria');

async function statusEmail(req, res) {
  const ultima = await pool.query(
    'SELECT processado_em FROM emails_processados ORDER BY processado_em DESC LIMIT 1'
  );
  res.json({
    configurado: credenciaisConfiguradas(),
    conta: credenciaisConfiguradas() ? process.env.EMAIL_IMAP_USER : null,
    ultimaVerificacao: ultima.rows[0]?.processado_em || null,
  });
}

async function verificarAgora(req, res) {
  try {
    // pelo registro comum das rotinas (services/rotinas.js) — aparece no painel de Integrações
    const resumo = await rotinas.executarRotina('notas-email', { origem: 'manual', usuarioId: req.usuario?.id });
    res.json(resumo);
  } catch (err) {
    console.error('Erro ao verificar caixa de entrada:', err);
    res.status(err.code === 'EMAIL_CONEXAO' ? 503 : 500).json({ erro: err.message || 'Erro ao verificar caixa de entrada' });
  }
}

async function historico(req, res) {
  const notas = await pool.query(
    `SELECT chave_acesso, numero, itens_novos, itens_atualizados, processado_em
     FROM notas_processadas ORDER BY processado_em DESC LIMIT 50`
  );
  const totalEmails = await pool.query('SELECT count(*) FROM emails_processados');
  res.json({
    notas: notas.rows,
    totalEmailsProcessados: parseInt(totalEmails.rows[0].count, 10),
  });
}

async function obterMargem(req, res) {
  const r = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'margem_padrao'");
  res.json({ margem: parseFloat(r.rows[0]?.valor) || 0 });
}

async function atualizarMargem(req, res) {
  const { margem } = req.body;
  const valor = parseFloat(margem);
  // 300% já é muito acima de qualquer margem real; acima disso é erro de digitação
  if (!Number.isFinite(valor) || valor < 0 || valor > 300) {
    return res.status(400).json({ erro: 'Margem inválida (de 0 a 300%)' });
  }
  const anterior = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'margem_padrao'");
  await pool.query(
    `INSERT INTO configuracoes (chave, valor) VALUES ('margem_padrao', $1)
     ON CONFLICT (chave) DO UPDATE SET valor = $1, atualizado_em = NOW()`,
    [String(valor)]
  );
  await registrarAuditoria(pool, {
    entidade: 'configuracoes', acao: 'margem_padrao', usuarioId: req.usuario.id,
    detalhes: { anterior: anterior.rows[0]?.valor ?? null, nova: valor },
  });
  res.json({ margem: valor });
}

module.exports = { statusEmail, verificarAgora, historico, obterMargem, atualizarMargem };
