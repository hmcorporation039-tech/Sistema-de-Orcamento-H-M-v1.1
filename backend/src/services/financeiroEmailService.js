const { simpleParser } = require('mailparser');
const pool = require('../config/database');
const { credenciaisConfiguradas } = require('./email/imap');
const { conectarComRetry, esperasDaOrigem, identificarMensagens, registroProcessado } = require('./email/conexao');
const { vincularPrestadores } = require('./vincularPrestadores');
const { verificarAutenticidade, dominioPermitido, listaDoEnv } = require('../utils/autenticidadeEmail');
const { executarComTrava } = require('./travaJob');

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

// Alguns favorecidos/pagadores aparecem com um código numérico (matrícula/cadastro)
// na frente do nome, ex: "51818695 Wilson Batista Lima" ou "28.253.229 Thais Pereira
// Andrade Sodre". Remove esse prefixo para não atrapalhar o cadastro de prestadores.
function limparNomeFavorecido(nome) {
  const texto = String(nome || '').trim();
  const m = texto.match(/^(\d[\d.\s]*\d)\s+([A-Za-zÀ-ÖØ-öø-ÿ].*)$/);
  if (!m) return texto;
  const codigo = m[1].replace(/\D/g, '');
  return codigo.length >= 6 ? m[2].trim() : texto;
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
    nome: limparNomeFavorecido(m[2]),
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
    nome: limparNomeFavorecido(pegarValorAposRotulo(linhas, 'Nome:')),
    dataHora: parseDataHoraBr(dataTexto, dataEmail),
    idTransacao: pegarValorAposRotulo(linhas, 'ID Transação:'),
  };
}

// Trava contra execução simultânea (horário automático × "Verificar agora" × outra instância)
function verificarPixNaCaixaDeEntrada({ origem = 'manual' } = {}) {
  return executarComTrava('email-pix', () => lerPixNaCaixaDeEntrada({ esperas: esperasDaOrigem(origem) }));
}

const conexaoCaiu = (imapClient) => imapClient && imapClient.usable === false;

// deps: os testes passam banco, conexão e leitor de e-mail falsos
async function lerPixNaCaixaDeEntrada({ esperas, db = pool, conectarEmail = conectarComRetry, configurado = credenciaisConfiguradas, lerEmail = simpleParser, vincular = vincularPrestadores } = {}) {
  const resumo = { emailsEncontrados: 0, movimentosImportados: 0, avisos: [] };

  if (!configurado()) {
    resumo.avisos.push('Integração de e-mail não configurada');
    return resumo;
  }

  // Falha de conexão (depois das novas tentativas) LANÇA erro: a rodada fica
  // com status "erro" e a agenda repesca em ~15 min (antes era só um aviso e
  // a rodada contava como sucesso — revisão de 27/10/2026).
  const imapClient = await conectarEmail({ esperas });
  let dbClient;

  try {
    dbClient = await db.connect();
    const lock = await imapClient.getMailboxLock('INBOX');
    try {
      const uidsRecebido = await imapClient.search({ subject: 'Pix recebido' }, { uid: true });
      const uidsRealizado = await imapClient.search({ subject: 'Pix realizado' }, { uid: true });
      const uids = [...new Set([...(uidsRecebido || []), ...(uidsRealizado || [])])].sort((a, b) => a - b);
      resumo.emailsEncontrados = uids.length;
      const idents = await identificarMensagens(imapClient, uids);

      for (const uid of uids) {
        const ident = idents.get(uid);
        if (!ident) continue; // sumiu da caixa entre a busca e a leitura
        if (await registroProcessado(dbClient, ident)) continue;

        // Um e-mail ilegível não trava os seguintes (antes o download/parse
        // ficava fora do try e derrubava a rodada inteira)
        let parsedEmail;
        try {
          const { content } = await imapClient.download(uid, undefined, { uid: true });
          parsedEmail = await lerEmail(content);
        } catch (err) {
          if (conexaoCaiu(imapClient)) throw new Error(`A conexão com o e-mail caiu no meio da leitura (${err.message}) — o que faltou será lido na próxima rodada`);
          resumo.avisos.push(`E-mail "${ident.assunto || uid}" não pôde ser lido (${err.message}) — tenta de novo na próxima rodada`);
          continue;
        }
        const assunto = parsedEmail.subject || '';

        // Só o banco (Inter) com assinatura válida: antes qualquer e-mail com o
        // assunto "Pix recebido" virava lançamento no financeiro.
        const aut = verificarAutenticidade(parsedEmail);
        if (!aut.autentico || !dominioPermitido(aut.dominio, listaDoEnv('PIX_REMETENTES_PERMITIDOS', 'inter.co'))) {
          resumo.avisos.push(`E-mail "${assunto}" de ${aut.remetente || 'remetente desconhecido'} ignorado: não é do banco ou a assinatura (DKIM/DMARC) não confere`);
          await dbClient.query('INSERT INTO emails_processados (message_id, assunto) VALUES ($1,$2) ON CONFLICT DO NOTHING', [ident.chave, `[rejeitado] ${assunto}`.slice(0, 500)]);
          continue;
        }

        await dbClient.query('BEGIN');
        try {
          let movimento = null;
          if (/pix recebido/i.test(assunto)) {
            movimento = parsePixRecebido(parsedEmail.html, parsedEmail.date);
          } else if (/pix realizado/i.test(assunto)) {
            movimento = parsePixRealizado(parsedEmail.html, parsedEmail.date);
          }

          if (movimento) {
            // Pix realizado traz o ID da transação: o mesmo pagamento em dois
            // e-mails (reenvio do banco) não vira dois lançamentos
            const repetido = movimento.idTransacao
              ? (await dbClient.query('SELECT id FROM financeiro_movimentos WHERE id_transacao = $1 LIMIT 1', [movimento.idTransacao])).rows[0]
              : null;
            if (repetido) {
              resumo.avisos.push(`Pix "${assunto}" (transação ${movimento.idTransacao}) já estava lançado — ignorado`);
            } else {
              const ins = await dbClient.query(
                `INSERT INTO financeiro_movimentos (tipo, nome, valor, data_hora, id_transacao, email_message_id)
                 VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email_message_id) DO NOTHING`,
                [movimento.tipo, movimento.nome, movimento.valor, movimento.dataHora, movimento.idTransacao, ident.chave]
              );
              if (ins.rowCount) resumo.movimentosImportados++;
            }
          } else {
            resumo.avisos.push(`E-mail "${assunto}" não teve o formato reconhecido — ignorado`);
          }

          await dbClient.query(
            'INSERT INTO emails_processados (message_id, assunto) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [ident.chave, assunto]
          );
          await dbClient.query('COMMIT');
        } catch (err) {
          // ROLLBACK protegido: se o erro original foi a queda da conexão,
          // o próprio rollback rejeita — antes isso escapava do catch, o erro
          // real nunca era logado e a conexão voltava suja para o pool.
          await dbClient.query('ROLLBACK').catch(() => {});
          console.error('Erro ao processar e-mail de Pix:', err);
          resumo.avisos.push(`Erro ao processar e-mail "${assunto || uid}": ${err.message}`);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    if (dbClient) dbClient.release();
    await imapClient.logout().catch(() => {});
  }

  if (resumo.movimentosImportados > 0) {
    await vincular().catch(err => resumo.avisos.push(`Erro ao vincular prestadores: ${err.message}`));
  }

  return resumo;
}

module.exports = { verificarPixNaCaixaDeEntrada, lerPixNaCaixaDeEntrada, parsePixRecebido, parsePixRealizado, limparNomeFavorecido };
