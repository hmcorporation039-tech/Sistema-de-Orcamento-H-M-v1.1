// Configuração do canal remoto (Fase 6) no backend/.env. Os dois canais ficam DESLIGADOS por padrão:
// com o canal desligado, o webhook dele responde 404 e nada é processado.
//
//   CANAL_TELEGRAM_ATIVO=false        liga o webhook do Telegram (POST /api/canal/webhook/telegram)
//   CANAL_TELEGRAM_TOKEN              token do bot (BotFather). Sem ele, a resposta só vai para o log.
//   CANAL_TELEGRAM_SEGREDO            o secret_token passado no setWebhook: o Telegram o devolve no
//                                     cabeçalho X-Telegram-Bot-Api-Secret-Token. OBRIGATÓRIO: sem ele
//                                     o webhook recusa tudo (401).
//   CANAL_WHATSAPP_ATIVO=false        liga o webhook do WhatsApp Cloud API (GET e POST /api/canal/webhook/whatsapp)
//   CANAL_WHATSAPP_TOKEN              token de acesso da Cloud API (envio). Sem ele, só log.
//   CANAL_WHATSAPP_NUMERO_ID          phone_number_id do número da empresa (envio)
//   CANAL_WHATSAPP_APP_SECRET         segredo do app da Meta: confere o X-Hub-Signature-256. OBRIGATÓRIO.
//   CANAL_WHATSAPP_VERIFY_TOKEN       texto combinado para o GET de verificação (hub.verify_token). OBRIGATÓRIO.
//   CANAL_ACAO_PRAZO_MIN=10           prazo para responder "SIM 4821" a uma ação pendente
//   CANAL_LIMITE_POR_MINUTO=120       pedidos por minuto, por IP, em cada webhook
//   CANAL_MENSAGENS_POR_MINUTO=20     mensagens por minuto de um mesmo chat/telefone (o resto é ignorado)
//   CANAL_CORPO_MAX_KB=256            tamanho máximo do corpo do webhook
//   CANAL_MAX_TENTATIVAS=3            tentativas de processar uma mensagem antes de desistir
//   CANAL_SIMULTANEAS=2               mensagens processadas ao mesmo tempo (de chats diferentes)
//   CANAL_ASSISTENTE=ligado           pedido livre vai ao assistente (Claude Max); "desligado" = só comandos
//   WHISPER_CPP_BIN / WHISPER_MODELO  voz: executável do whisper.cpp e o modelo (.bin). Sem os dois, o
//                                     canal responde que a voz ainda não está ativada.
//   FFMPEG_BIN                        ffmpeg para converter o áudio em WAV 16 kHz (padrão: "ffmpeg" no PATH)
const fs = require('fs');

const inteiro = (v, padrao, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : padrao;
};
const ligado = (v) => /^(true|1|sim|ligado)$/i.test(String(v || '').trim());
const preenchido = (v) => String(v || '').trim().length > 0;
const existe = (p) => { try { return preenchido(p) && fs.statSync(String(p).trim()).isFile(); } catch { return false; } };

function config(env = process.env) {
  return {
    telegram: {
      ativo: ligado(env.CANAL_TELEGRAM_ATIVO),
      token: String(env.CANAL_TELEGRAM_TOKEN || '').trim(),
      segredo: String(env.CANAL_TELEGRAM_SEGREDO || '').trim(),
    },
    whatsapp: {
      ativo: ligado(env.CANAL_WHATSAPP_ATIVO),
      token: String(env.CANAL_WHATSAPP_TOKEN || '').trim(),
      numeroId: String(env.CANAL_WHATSAPP_NUMERO_ID || '').trim(),
      appSecret: String(env.CANAL_WHATSAPP_APP_SECRET || '').trim(),
      verifyToken: String(env.CANAL_WHATSAPP_VERIFY_TOKEN || '').trim(),
    },
    acaoPrazoMin: inteiro(env.CANAL_ACAO_PRAZO_MIN, 10, 1, 24 * 60),
    limitePorMinuto: inteiro(env.CANAL_LIMITE_POR_MINUTO, 120, 1),
    mensagensPorMinuto: inteiro(env.CANAL_MENSAGENS_POR_MINUTO, 20, 1),
    corpoMaxBytes: inteiro(env.CANAL_CORPO_MAX_KB, 256, 1, 5120) * 1024,
    maxTentativas: inteiro(env.CANAL_MAX_TENTATIVAS, 3, 1, 10),
    simultaneas: inteiro(env.CANAL_SIMULTANEAS, 2, 1, 10),
    assistente: String(env.CANAL_ASSISTENTE || '').toLowerCase() !== 'desligado',
    voz: {
      whisperBin: String(env.WHISPER_CPP_BIN || '').trim(),
      modelo: String(env.WHISPER_MODELO || '').trim(),
      ffmpeg: String(env.FFMPEG_BIN || '').trim() || 'ffmpeg',
    },
  };
}

// Estado para a tela do administrador: ligado e configurado (sem mostrar nenhum segredo)
function estadoDosCanais(env = process.env) {
  const c = config(env);
  const voz = existe(c.voz.whisperBin) && existe(c.voz.modelo);
  return {
    telegram: {
      ativo: c.telegram.ativo,
      configurado: preenchido(c.telegram.token) && preenchido(c.telegram.segredo),
      faltando: [!preenchido(c.telegram.token) && 'CANAL_TELEGRAM_TOKEN', !preenchido(c.telegram.segredo) && 'CANAL_TELEGRAM_SEGREDO'].filter(Boolean),
    },
    whatsapp: {
      ativo: c.whatsapp.ativo,
      configurado: [c.whatsapp.token, c.whatsapp.numeroId, c.whatsapp.appSecret, c.whatsapp.verifyToken].every(preenchido),
      faltando: [
        !preenchido(c.whatsapp.token) && 'CANAL_WHATSAPP_TOKEN', !preenchido(c.whatsapp.numeroId) && 'CANAL_WHATSAPP_NUMERO_ID',
        !preenchido(c.whatsapp.appSecret) && 'CANAL_WHATSAPP_APP_SECRET', !preenchido(c.whatsapp.verifyToken) && 'CANAL_WHATSAPP_VERIFY_TOKEN',
      ].filter(Boolean),
    },
    voz: { disponivel: voz, faltando: [!existe(c.voz.whisperBin) && 'WHISPER_CPP_BIN', !existe(c.voz.modelo) && 'WHISPER_MODELO'].filter(Boolean) },
    assistente: c.assistente,
    acaoPrazoMin: c.acaoPrazoMin,
  };
}

module.exports = { config, estadoDosCanais, ligado, existe };
