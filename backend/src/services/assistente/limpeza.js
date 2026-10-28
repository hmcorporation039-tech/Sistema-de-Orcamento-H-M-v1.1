// Guarda das conversas do assistente: 12 meses sem uso (ASSISTENTE_GUARDA_MESES).
// Rotina OPCIONAL e DESLIGADA por padrão — liga com ASSISTENTE_LIMPEZA=ligada.
// Apaga a conversa (mensagens, ações e anexos vão junto, em cascata) e a pasta
// dos anexos. O que o assistente criou no sistema (propostas, análises,
// projetos) NÃO é apagado: só perde a marca da conversa (ON DELETE SET NULL).
const fs = require('fs');
const pool = require('../../config/database');
const { config } = require('./config');
const { pastaDaConversa } = require('./arquivos');

async function limparConversasAntigas({ meses = config().guardaMeses, db = pool } = {}) {
  const { rows } = await db.query(
    `DELETE FROM assistente_conversas WHERE atualizado_em < NOW() - make_interval(months => $1) RETURNING id`, [meses]);
  for (const r of rows) {
    try { fs.rmSync(pastaDaConversa(r.id), { recursive: true, force: true }); } catch (e) { console.warn(`[assistente] pasta da conversa ${r.id}:`, e.message); }
  }
  if (rows.length) console.log(`[assistente] limpeza: ${rows.length} conversa(s) com mais de ${meses} meses apagada(s)`);
  return rows.length;
}

// Uma vez por dia, só se ligada. Chamada no início do servidor (server.js).
function agendarLimpeza() {
  if (!config().limpeza) return null;
  const rodar = () => limparConversasAntigas().catch(e => console.error('[assistente] limpeza falhou:', e.message));
  setTimeout(rodar, 60 * 1000).unref();
  return setInterval(rodar, 24 * 60 * 60 * 1000).unref();
}

module.exports = { limparConversasAntigas, agendarLimpeza };
