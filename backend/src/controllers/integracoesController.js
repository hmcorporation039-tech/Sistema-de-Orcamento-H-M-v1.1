const pool = require('../config/database');
const { credenciaisConfiguradas } = require('../utils/emailClient');
const { verificarCaixaDeEntrada } = require('../services/notaFiscalEmailService');

async function statusEmail(req, res) {
  try {
    const ultima = await pool.query(
      'SELECT processado_em FROM emails_processados ORDER BY processado_em DESC LIMIT 1'
    );
    res.json({
      configurado: credenciaisConfiguradas(),
      conta: credenciaisConfiguradas() ? process.env.EMAIL_IMAP_USER : null,
      ultimaVerificacao: ultima.rows[0]?.processado_em || null,
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao consultar status da integração' });
  }
}

async function verificarAgora(req, res) {
  try {
    const resumo = await verificarCaixaDeEntrada();
    res.json(resumo);
  } catch (err) {
    console.error('Erro ao verificar caixa de entrada:', err);
    res.status(500).json({ erro: err.message || 'Erro ao verificar caixa de entrada' });
  }
}

async function historico(req, res) {
  try {
    const notas = await pool.query(
      `SELECT chave_acesso, numero, itens_novos, itens_atualizados, processado_em
       FROM notas_processadas ORDER BY processado_em DESC LIMIT 50`
    );
    const totalEmails = await pool.query('SELECT count(*) FROM emails_processados');
    res.json({
      notas: notas.rows,
      totalEmailsProcessados: parseInt(totalEmails.rows[0].count, 10),
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar histórico de importação' });
  }
}

async function obterMargem(req, res) {
  try {
    const r = await pool.query("SELECT valor FROM configuracoes WHERE chave = 'margem_padrao'");
    res.json({ margem: parseFloat(r.rows[0]?.valor) || 0 });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar margem padrão' });
  }
}

async function atualizarMargem(req, res) {
  const { margem } = req.body;
  const valor = parseFloat(margem);
  if (Number.isNaN(valor) || valor < 0) {
    return res.status(400).json({ erro: 'Margem inválida' });
  }
  try {
    await pool.query(
      `INSERT INTO configuracoes (chave, valor) VALUES ('margem_padrao', $1)
       ON CONFLICT (chave) DO UPDATE SET valor = $1, atualizado_em = NOW()`,
      [String(valor)]
    );
    res.json({ margem: valor });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar margem padrão' });
  }
}

module.exports = { statusEmail, verificarAgora, historico, obterMargem, atualizarMargem };
