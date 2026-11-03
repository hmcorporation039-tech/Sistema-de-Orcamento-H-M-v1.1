// Verificação OBRIGATÓRIA da origem dos webhooks (Fase 6). Sem segredo configurado, recusa tudo.
//
//   Telegram: o setWebhook recebe um secret_token e o Telegram o devolve em cada pedido no cabeçalho
//             X-Telegram-Bot-Api-Secret-Token. Comparação em tempo constante (dos hashes, para não
//             vazar nem o tamanho).
//   WhatsApp Cloud API: X-Hub-Signature-256 = "sha256=" + HMAC-SHA256 do corpo BRUTO (os bytes como
//             chegaram, antes do JSON.parse) com o app secret. O GET de verificação devolve o
//             hub.challenge só se hub.verify_token for o combinado.
const crypto = require('crypto');

function iguaisEmTempoConstante(a, b) {
  const ha = crypto.createHash('sha256').update(String(a ?? ''), 'utf8').digest();
  const hb = crypto.createHash('sha256').update(String(b ?? ''), 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb) && String(a ?? '').length > 0;
}

function conferirTelegram(cabecalho, segredo) {
  if (!segredo || typeof cabecalho !== 'string' || !cabecalho) return false;
  return iguaisEmTempoConstante(cabecalho, segredo);
}

function assinaturaWhatsapp(corpoBruto, appSecret) {
  return `sha256=${crypto.createHmac('sha256', appSecret).update(corpoBruto).digest('hex')}`;
}

function conferirWhatsapp(corpoBruto, cabecalho, appSecret) {
  if (!appSecret || !Buffer.isBuffer(corpoBruto) || typeof cabecalho !== 'string') return false;
  if (!/^sha256=[0-9a-f]{64}$/i.test(cabecalho.trim())) return false;
  const esperado = Buffer.from(assinaturaWhatsapp(corpoBruto, appSecret).slice(7), 'hex');
  const recebido = Buffer.from(cabecalho.trim().slice(7).toLowerCase(), 'hex');
  return esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido);
}

// GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=... → o challenge (texto) ou null
function verificacaoWhatsapp(query, verifyToken) {
  const modo = query?.['hub.mode'];
  const token = query?.['hub.verify_token'];
  const desafio = query?.['hub.challenge'];
  if (!verifyToken || modo !== 'subscribe' || typeof token !== 'string' || typeof desafio !== 'string') return null;
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(desafio)) return null;
  return iguaisEmTempoConstante(token, verifyToken) ? desafio : null;
}

module.exports = { conferirTelegram, conferirWhatsapp, assinaturaWhatsapp, verificacaoWhatsapp, iguaisEmTempoConstante };
