const { simpleParser } = require('mailparser');
const pool = require('../config/database');
const { conectar, credenciaisConfiguradas } = require('../utils/emailClient');

// Converte o HTML do e-mail transacional do Inter em linhas de texto limpas,
// já que esses e-mails não têm uma versão text/plain.
function paraLinhas(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

function valorParaNumero(strValor) {
  return Number(String(strValor).replace(/\./g, '').replace(',', '.'));
}

// "01/08/2026, às 12:56" ou "01/08/2026" -> Date; cai no fallback se não achar nada
function parseDataHoraBr(str, fallback) {
  const m = String(str || '').match(/(\d{2})\/(\d{2})\/(\d{4})(?:,?\s*(?:às)?\s*(\d{2}):(\d{2}))?/i);
  if (!m) return fallback;
  const [, dia, mes, ano, hora, min] = m;
  return new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora) || 0, Number(min) || 0);
}

function pegarValorAposRotulo(linhas, rotulo) {
  const idx = linhas.findIndex(l => l === rotulo);
  return idx >= 0 ? linhas[idx + 1] : null;
}

// "Você recebeu um Pix no valor de R$ 25.500,00 de Hospital Prontonorte S A, na conta ..."
function parsePixRecebido(html, dataEmail) {
  const linhas = paraLinhas(html);
  const texto = linhas.join(' ');
  const m = texto.match(/Você recebeu um Pix no valor de R\$\s*([\d.,]+)\s*de\s*(.+?),\s*na conta/i);
  if (!m) return null;
  return {
    tipo: 'recebido',
    valor: valorParaNumero(m[1]),
    nome: m[2].trim(),
    dataHora: dataEmail,
    idTransacao: null,
  };
}

// "Em 01/08/2026, foi realizado um pagamento ... no valor de R$ 291,00. Os dados de
// destino são: Banco: ... Nome: ... CPF/CNPJ:: ... Data: 01/08/2026, às 12:56 ID Transação: ..."
function parsePixRealizado(html, dataEmail) {
  const linhas = paraLinhas(html);
  const texto = linhas.join(' ');
  const m = texto.match(/foi realizado um pagamento.*?no valor de R\$\s*([\d.,]+)\./i);
  if (!m) return null;

  const dataTexto = pegarValorAposRotulo(linhas, 'Data:');
  return {
    tipo: 'realizado',
    valor: valorParaNumero(m[1]),
    nome: pegarValorAposRotulo(linhas, 'Nome:'),
    dataHora: parseDataHoraBr(dataTexto, dataEmail),
    idTransacao: pegarValorAposRotulo(linhas, 'ID Transação:'),
  };
}

async function verificarPixNaCaixaDeEntrada() {
  const resumo = { emailsEncontrados: 0, movimentosImportados: 0, avisos: [] };

  if (!credenciaisConfiguradas()) {
    resumo.avisos.push('Integração de e-mail não configurada');
    return resumo;
  }

  const dbClient = await pool.connect();
  let imapClient;

  try {
    try {
      imapClient = await conectar();
    } catch (err) {
      const motivo = err.authenticationFailed
        ? 'credenciais inválidas — confira EMAIL_IMAP_USER e a senha de app no .env'
        : err.responseText || err.message;
      resumo.avisos.push(`Falha ao conectar ao e-mail: ${motivo}`);
      return resumo;
    }

    const lock = await imapClient.getMailboxLock('INBOX');
    try {
      const uidsRecebido = await imapClient.search({ subject: 'Pix recebido' }, { uid: true });
      const uidsRealizado = await imapClient.search({ subject: 'Pix realizado' }, { uid: true });
      const uids = [...new Set([...uidsRecebido, ...uidsRealizado])].sort((a, b) => a - b);
      resumo.emailsEncontrados = uids.length;

      for (const uid of uids) {
        const jaLido = await dbClient.query(
          'SELECT id FROM emails_processados WHERE message_id = $1',
          [String(uid)]
        );
        if (jaLido.rows.length > 0) continue;

        const { content } = await imapClient.download(uid, undefined, { uid: true });
        const parsedEmail = await simpleParser(content);
        const assunto = parsedEmail.subject || '';

        await dbClient.query('BEGIN');
        try {
          let movimento = null;
          if (/pix recebido/i.test(assunto)) {
            movimento = parsePixRecebido(parsedEmail.html, parsedEmail.date);
          } else if (/pix realizado/i.test(assunto)) {
            movimento = parsePixRealizado(parsedEmail.html, parsedEmail.date);
          }

          if (movimento) {
            await dbClient.query(
              `INSERT INTO financeiro_movimentos (tipo, nome, valor, data_hora, id_transacao, email_message_id)
               VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email_message_id) DO NOTHING`,
              [movimento.tipo, movimento.nome, movimento.valor, movimento.dataHora, movimento.idTransacao, String(uid)]
            );
            resumo.movimentosImportados++;
          } else {
            resumo.avisos.push(`E-mail "${assunto}" não teve o formato reconhecido — ignorado`);
          }

          await dbClient.query(
            'INSERT INTO emails_processados (message_id, assunto) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [String(uid), assunto]
          );
          await dbClient.query('COMMIT');
        } catch (err) {
          await dbClient.query('ROLLBACK');
          resumo.avisos.push(`Erro ao processar e-mail "${assunto || uid}": ${err.message}`);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    dbClient.release();
    if (imapClient) await imapClient.logout().catch(() => {});
  }

  return resumo;
}

module.exports = { verificarPixNaCaixaDeEntrada, parsePixRecebido, parsePixRealizado };
