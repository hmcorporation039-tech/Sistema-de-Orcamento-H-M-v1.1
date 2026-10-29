// Conexão com a caixa de e-mail e identificação das mensagens — comum às
// rotinas de notas/orçamentos (notaFiscalEmailService) e de Pix
// (financeiroEmailService). Revisão de 27/10/2026:
//
// 1. Falha de conexão era só um "aviso" e a rodada contava como sucesso: de
//    15 a 25/10 o log tinha ENOTFOUND imap.gmail.com e o painel mostrava as
//    rotinas em dia, com dias sem ler notas nem Pix. Agora tenta de novo com
//    espera e, se não conectar, LANÇA erro (status "erro" no registro e
//    repescagem pela agenda em services/rotinas.js).
// 2. O e-mail lido era lembrado pelo UID do IMAP, que só vale enquanto o
//    UIDVALIDITY da pasta não muda (o Gmail pode renumerar): depois disso um
//    e-mail novo com UID antigo era pulado e um antigo, relido. Agora a chave
//    é o X-GM-MSGID do Gmail (`emailId` no imapflow) ou o Message-ID; o UID
//    antigo só vale para os registros feitos antes desta versão, e só se o
//    assunto também confere.
const { conectar } = require('../utils/emailClient');

const ESPERAS_AGENDADA_MS = [30 * 1000, 2 * 60 * 1000]; // 3 tentativas em ~2,5 min
const ESPERAS_MANUAL_MS = [5 * 1000];                     // botão "Verificar agora": 2 tentativas
const TAMANHO_CHAVE = 998;                                // emails_processados.message_id VARCHAR(998)

class FalhaConexaoEmail extends Error {
  constructor(motivo, tentativas) {
    super(`Falha ao conectar ao e-mail (${tentativas} tentativa${tentativas > 1 ? 's' : ''}): ${motivo}`);
    this.name = 'FalhaConexaoEmail';
    this.code = 'EMAIL_CONEXAO';
    this.tentativas = tentativas;
  }
}

function motivoDaFalha(err) {
  if (err && err.authenticationFailed) {
    return 'credenciais inválidas — confira EMAIL_IMAP_USER e a senha de app no .env, e se o IMAP está habilitado nas configurações do Gmail';
  }
  return String((err && (err.responseText || err.message || err.code)) || err || 'erro desconhecido');
}

const esperasDaOrigem = (origem) => (origem === 'agendada' ? ESPERAS_AGENDADA_MS : ESPERAS_MANUAL_MS);

// Conecta com novas tentativas. Senha errada não adianta repetir (e o Gmail
// bloqueia quem insiste): falha na hora.
async function conectarComRetry({ conectarFn = conectar, esperas = ESPERAS_AGENDADA_MS, esperar = (ms) => new Promise(r => setTimeout(r, ms)), log = console } = {}) {
  for (let i = 0; ; i++) {
    try {
      return await conectarFn();
    } catch (err) {
      const motivo = motivoDaFalha(err);
      if (err?.authenticationFailed || i >= esperas.length) throw new FalhaConexaoEmail(motivo, i + 1);
      log.warn(`E-mail: tentativa ${i + 1} de conexão falhou (${motivo}) — nova tentativa em ${Math.round(esperas[i] / 1000)} s`);
      await esperar(esperas[i]);
    }
  }
}

function limparMessageId(messageId) {
  return String(messageId || '').trim().replace(/^<+|>+$/g, '').trim();
}

// Chave estável de uma mensagem: X-GM-MSGID > Message-ID > UIDVALIDITY:UID
function chaveDaMensagem({ emailId, messageId, uid, uidValidity }) {
  if (emailId) return `gm:${emailId}`;
  const mid = limparMessageId(messageId);
  if (mid) return `mid:${mid}`.slice(0, TAMANHO_CHAVE);
  return uidValidity != null ? `uid:${uidValidity}:${uid}` : String(uid);
}

// Busca de uma vez (um FETCH só) o X-GM-MSGID, o Message-ID e o assunto de
// cada UID. Map uid → { uid, chave, legado, assunto }.
async function identificarMensagens(imapClient, uids) {
  const mapa = new Map();
  if (!uids || !uids.length) return mapa;
  const uidValidity = imapClient.mailbox?.uidValidity != null ? String(imapClient.mailbox.uidValidity) : null;
  for await (const msg of imapClient.fetch(uids, { uid: true, envelope: true, emailId: true }, { uid: true })) {
    mapa.set(msg.uid, {
      uid: msg.uid,
      chave: chaveDaMensagem({ emailId: msg.emailId, messageId: msg.envelope?.messageId, uid: msg.uid, uidValidity }),
      legado: String(msg.uid),
      assunto: msg.envelope?.subject || '',
    });
  }
  // UID que o servidor não devolveu no FETCH (apagado no meio): fica de fora
  return mapa;
}

// Registro em emails_processados desta mensagem (ou null). O registro antigo,
// gravado só com o UID, vale se o assunto também for o mesmo (com o prefixo
// "[rejeitado] " que a rotina de Pix grava para e-mails recusados).
async function registroProcessado(db, ident, colunas = 'id') {
  const { rows } = await db.query(
    `SELECT ${colunas} FROM emails_processados
      WHERE message_id = $1
         OR (message_id = $2 AND (assunto = $3 OR assunto = LEFT('[rejeitado] ' || $3, 500) OR assunto = LEFT($3, 500)))
      ORDER BY (message_id = $1) DESC
      LIMIT 1`,
    [ident.chave, ident.legado, ident.assunto || '']
  );
  return rows[0] || null;
}

module.exports = {
  conectarComRetry, FalhaConexaoEmail, motivoDaFalha, esperasDaOrigem,
  chaveDaMensagem, identificarMensagens, registroProcessado, limparMessageId,
  ESPERAS_AGENDADA_MS, ESPERAS_MANUAL_MS,
};
