// Fila das mensagens do canal no BANCO (canal_mensagens), não em memória: o webhook só grava e
// responde 200; o trabalhador (trabalhador.js) pega uma por vez por chat, processa e responde.
// Reinício do backend no meio não perde nada (a mensagem "processando" há muito tempo volta à fila).
const pool = require('../../config/database');

const PRESA_MIN = 20; // processando há mais que isso = o backend caiu no meio

// grava; id externo repetido (reenvio do provedor) → null, sem processar de novo
async function enfileirar(m, db = pool) {
  const { rows: [r] } = await db.query(
    `INSERT INTO canal_mensagens (canal, id_externo, remetente, conversa, nome_remetente, tipo, texto, midia, usuario_id, ip)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (canal, id_externo) DO NOTHING RETURNING *`,
    [m.canal, m.id_externo, m.remetente, m.conversa, m.nome_remetente || null, m.tipo || 'texto', m.texto ?? null,
      m.midia ? JSON.stringify(m.midia) : null, m.usuario_id || null, m.ip || null]);
  return r || null;
}

// pega a próxima pronta, nunca duas do mesmo chat ao mesmo tempo, na ordem de chegada
async function pegarProxima(ocupados = [], db = pool) {
  const { rows: [r] } = await db.query(
    `UPDATE canal_mensagens m SET estado = 'processando', tentativas = m.tentativas + 1, iniciada_em = NOW()
      WHERE m.id = (
        SELECT x.id FROM canal_mensagens x
         WHERE x.estado = 'recebida' AND x.proxima_em <= NOW()
           AND NOT (x.canal || ':' || x.remetente = ANY($1::text[]))
           AND NOT EXISTS (SELECT 1 FROM canal_mensagens y WHERE y.canal = x.canal AND y.remetente = x.remetente AND y.estado = 'processando')
           AND NOT EXISTS (SELECT 1 FROM canal_mensagens z WHERE z.canal = x.canal AND z.remetente = x.remetente AND z.estado = 'recebida' AND z.id < x.id)
         ORDER BY x.id
         LIMIT 1
         FOR UPDATE SKIP LOCKED)
      RETURNING m.*`, [ocupados]);
  return r || null;
}

async function concluir(id, { resposta, via, usuarioId = null, enviada = false, estado = 'respondida' }, db = pool) {
  await db.query(
    `UPDATE canal_mensagens SET estado = $2, resposta = $3, via = $4, usuario_id = COALESCE($5, usuario_id), enviada = $6, erro = NULL, processada_em = NOW()
      WHERE id = $1`, [id, estado, resposta ?? null, via || null, usuarioId, enviada]);
}

// guarda a resposta ANTES de enviar: se o envio falhar, a nova tentativa só reenvia (não refaz a consulta
// nem chama o assistente de novo)
async function guardarResposta(id, { resposta, via, usuarioId = null }, db = pool) {
  await db.query('UPDATE canal_mensagens SET resposta = $2, via = $3, usuario_id = COALESCE($4, usuario_id) WHERE id = $1', [id, resposta, via || null, usuarioId]);
}

async function falhar(id, { erro, tentativas, maxTentativas }, db = pool) {
  const desistir = tentativas >= maxTentativas;
  await db.query(
    `UPDATE canal_mensagens SET estado = $2, erro = $3, proxima_em = NOW() + make_interval(secs => $4::int), processada_em = CASE WHEN $2 = 'erro' THEN NOW() ELSE NULL END
      WHERE id = $1`, [id, desistir ? 'erro' : 'recebida', String(erro || '').slice(0, 500), 15 * 2 ** Math.max(0, tentativas - 1)]);
  return desistir;
}

async function devolverPresas(db = pool) {
  const r = await db.query(
    `UPDATE canal_mensagens SET estado = 'recebida', proxima_em = NOW() WHERE estado = 'processando' AND iniciada_em < NOW() - make_interval(mins => $1::int)`, [PRESA_MIN]);
  return r.rowCount;
}

// mensagens deste chat no último minuto (inundação: o resto é ignorado)
async function recentesDoRemetente(canal, remetente, db = pool) {
  const { rows: [r] } = await db.query(
    `SELECT count(*)::int AS n FROM canal_mensagens WHERE canal = $1 AND remetente = $2 AND recebida_em > NOW() - INTERVAL '1 minute'`, [canal, remetente]);
  return r.n;
}

async function haPendentes(db = pool) {
  const { rows: [r] } = await db.query(`SELECT EXISTS (SELECT 1 FROM canal_mensagens WHERE estado IN ('recebida', 'processando')) AS ha`);
  return r.ha;
}

module.exports = { enfileirar, pegarProxima, concluir, guardarResposta, falhar, devolverPresas, recentesDoRemetente, haPendentes };
