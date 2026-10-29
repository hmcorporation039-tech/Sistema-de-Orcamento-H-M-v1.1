// Painel de Integrações (versão 2.0, só administrador): as rotinas automáticas
// (services/rotinas.js) e o estado da IA (utils/ia.js), numa visão única.
const rotinas = require('../services/rotinas');
const ia = require('../utils/ia');

async function listar(req, res) {
  const dados = await rotinas.statusRotinas();
  res.json({ ...dados, ia: ia.status(), agora: new Date().toISOString() });
}

// Roda a rotina na hora (mesma execução do horário automático, com registro).
async function executar(req, res) {
  const chave = String(req.params.chave || '');
  if (!rotinas.existe(chave)) return res.status(404).json({ erro: 'Rotina desconhecida' });
  try {
    const resumo = await rotinas.executarRotina(chave, { origem: 'manual', usuarioId: req.usuario.id });
    const status = await rotinas.statusRotinas({ historico: 1 });
    res.json({ chave, resumo, rotina: status.rotinas.find(r => r.chave === chave) || null });
  } catch (err) {
    console.error(`Erro ao executar a rotina ${chave}:`, err);
    res.status(500).json({ erro: err.message || 'Erro ao executar a rotina' });
  }
}

// Pergunta mínima para saber se a cadeia de IA responde de verdade (o Claude Max
// pode estar instalado mas sem login, a API sem crédito, o Gemini sem cota).
async function testarIA(req, res) {
  try {
    const r = await ia.perguntarJSON('Teste de conexão do sistema H&M. Responda exatamente com o JSON {"ok": true}.', { finalidade: 'teste do painel', timeoutMs: 120000 });
    res.json({ ok: r.json?.ok === true, provedor: r.provedor, fonte: r.fonte, ms: r.ms, ia: ia.status() });
  } catch (err) {
    res.status(err.indisponivel ? 503 : 500).json({ erro: `Nenhuma IA respondeu: ${String(err.message).slice(0, 400)}`, ia: ia.status() });
  }
}

module.exports = { listar, executar, testarIA };
