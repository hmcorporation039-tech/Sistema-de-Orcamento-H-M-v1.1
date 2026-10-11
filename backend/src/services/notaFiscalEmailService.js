const { simpleParser } = require('mailparser');
const pool = require('../config/database');
const { conectar, credenciaisConfiguradas } = require('../utils/emailClient');
const { extrairDoPdf, parseNFeXml } = require('../utils/notaFiscalParser');
const { lerDocumentoCotacao, encerrarOcr, VERSAO_LEITOR } = require('../utils/leitorCotacao');
const { carregarIndice, registrarItemNotaFiscal, obterMargemPadrao } = require('./catalogoMateriais');
const { importarItens } = require('./cotacaoFornecedorService');
const { classificarPendentes } = require('./classificacaoMateriais');

// Piso fixo: nunca busca e-mails anteriores a essa data. Toda verificação
// (manual ou agendada) parte sempre daqui, nunca "N dias atrás". O backfill
// histórico (desde 16/08/2025) já foi feito, então o piso avançou para a
// data em que o monitoramento contínuo começou a valer.
const DESDE_DATA = '2026/07/21';

// Teto de leituras por IA de anexos de orçamento por varredura (só quando o
// leitor local não reconhece o documento) — evita custo alto num backfill.
const MAX_IA_POR_VARREDURA = Number(process.env.COTACAO_IA_MAX_POR_VARREDURA) || 15;
const TAMANHO_MAX_ANEXO = 15 * 1024 * 1024;

// Material novo é cadastrado; existente (mesma descrição, descrição sem
// acentos/pontuação ou mesmo código de fabricante) recebe o último preço pago.
// Preço zero/ausente nunca entra (o parser de DANFE em PDF tem fallback que
// pode devolver itens sem preço) — ver catalogoMateriais.registrarItemNotaFiscal.
async function upsertMaterial(client, item, origem, margem, indice) {
  return registrarItemNotaFiscal(client, indice || await carregarIndice(client), item, origem, margem);
}

function encontrarAnexos(parsedEmail) {
  const xml = parsedEmail.attachments.find(a => /\.xml$/i.test(a.filename || '') || /xml/i.test(a.contentType || ''));
  const pdf = parsedEmail.attachments.find(a => /\.pdf$/i.test(a.filename || '') || /pdf/i.test(a.contentType || ''));
  return { xml, pdf };
}

// Compara (só para log/auditoria) os itens lidos do PDF com os do XML da mesma nota,
// já que o XML é a fonte confiável — o PDF nunca sobrescreve o que veio do XML.
function compararComPdf(itensXml, itensPdf, avisos) {
  if (!itensPdf || itensPdf.length === 0) return;
  if (itensPdf.length !== itensXml.length) {
    avisos.push(`PDF encontrou ${itensPdf.length} itens, XML encontrou ${itensXml.length} — divergência de contagem`);
    return;
  }
  itensXml.forEach((itXml, i) => {
    const itPdf = itensPdf[i];
    if (itPdf.ncm && itXml.ncm && itPdf.ncm !== itXml.ncm) {
      avisos.push(`Item ${i + 1}: NCM do PDF (${itPdf.ncm}) diverge do XML (${itXml.ncm}) — mantido o valor do XML`);
    }
  });
}

async function processarMensagem(client, parsedEmail, margem, resumo, indice) {
  const { xml, pdf } = encontrarAnexos(parsedEmail);
  if (!xml && !pdf) return;

  let itens = [];
  let origem = null;
  let chaveAcesso = null;

  if (xml) {
    const resultado = await parseNFeXml(xml.content);
    itens = resultado.itens;
    chaveAcesso = resultado.chaveAcesso;
    origem = 'email_xml';

    if (pdf) {
      try {
        const itensPdf = await extrairDoPdf(pdf.content);
        compararComPdf(itens, itensPdf, resumo.avisos);
      } catch {
        // leitura do PDF é só um comparativo auxiliar — falha aqui não impede a importação
      }
    }
  } else if (pdf) {
    itens = await extrairDoPdf(pdf.content);
    origem = 'email_pdf';
  }

  if (itens.length === 0) return;

  if (chaveAcesso) {
    const jaProcessada = await client.query(
      'SELECT id FROM notas_processadas WHERE chave_acesso = $1',
      [chaveAcesso]
    );
    if (jaProcessada.rows.length > 0) {
      resumo.avisos.push(`Nota ${chaveAcesso} já havia sido importada — ignorada`);
      return;
    }
  }

  let criados = 0, atualizados = 0;
  for (const item of itens) {
    const r = await upsertMaterial(client, item, origem, margem, indice);
    if (!r) continue;
    if (r.criado) criados++; else atualizados++;
  }

  resumo.materiaisCriados += criados;
  resumo.materiaisAtualizados += atualizados;
  resumo.notasImportadas++;

  if (chaveAcesso) {
    await client.query(
      `INSERT INTO notas_processadas (chave_acesso, itens_novos, itens_atualizados)
       VALUES ($1,$2,$3) ON CONFLICT (chave_acesso) DO NOTHING`,
      [chaveAcesso, criados, atualizados]
    );
  }
}

// Orçamentos/cotações de fornecedor recebidos por e-mail (qualquer layout, PDF
// ou imagem). Ignora notas fiscais (tratadas acima), e-mails enviados pela
// própria H&M e PDFs de proposta da própria H&M (ex.: cliente respondendo).
// E-mail lido com 0 itens volta a ser lido quando a versão do leitor sobe.
async function processarOrcamentosPorEmail(imapClient, dbClient, margem, indice, resumo) {
  const uids = await imapClient.search(
    { gmraw: `has:attachment -DANFE (orçamento OR orcamento OR cotação OR cotacao OR proposta OR "pedido de venda" OR pedido) after:${DESDE_DATA}` },
    { uid: true }
  );
  const proprio = String(process.env.EMAIL_IMAP_USER || '').toLowerCase();
  for (const uid of uids) {
    const lido = await dbClient.query('SELECT itens_lidos, leitor_versao FROM emails_processados WHERE message_id = $1', [String(uid)]);
    if (lido.rows.length && ((lido.rows[0].itens_lidos || 0) > 0 || (lido.rows[0].leitor_versao || 0) >= VERSAO_LEITOR || lido.rows[0].leitor_versao == null)) continue;
    resumo.emailsEncontrados++;

    const { content } = await imapClient.download(uid, undefined, { uid: true });
    const email = await simpleParser(content);
    const remetente = String(email.from?.value?.[0]?.address || '').toLowerCase();
    const anexos = remetente && remetente === proprio ? [] : (email.attachments || [])
      .filter(a => /\.(pdf|png|jpe?g)$/i.test(a.filename || '') || /pdf|image\/(png|jpe?g)/i.test(a.contentType || ''))
      .filter(a => (a.size || a.content?.length || 0) <= TAMANHO_MAX_ANEXO);

    // lê todos os anexos antes de abrir a transação (OCR/IA podem demorar)
    const leituras = [];
    let pendente = false;
    for (const anexo of anexos) {
      try {
        const leitura = await lerDocumentoCotacao(anexo.content, anexo.filename || 'anexo', { permitirIA: resumo.leiturasPorIA < MAX_IA_POR_VARREDURA, exigirClienteHM: true });
        if (leitura.usouIA) resumo.leiturasPorIA++;
        if (leitura.pendente) pendente = true;
        if (leitura.itens.length) leituras.push({ anexo, leitura });
      } catch (err) {
        resumo.avisos.push(`"${email.subject || uid}" / ${anexo.filename}: erro na leitura — ${err.message}`);
      }
    }

    let lidosNoEmail = 0;
    await dbClient.query('BEGIN');
    try {
      for (const { anexo, leitura } of leituras) {
        const r = await importarItens(dbClient, indice, leitura, 'fornecedor_email', margem);
        lidosNoEmail += leitura.itens.length;
        resumo.materiaisCriados += r.criados;
        resumo.materiaisAtualizados += r.atualizados;
        resumo.orcamentosImportados++;
        for (const a of leitura.avisos || []) resumo.avisos.push(`"${email.subject || uid}" / ${anexo.filename}: ${a}`);
      }
      await dbClient.query(
        `INSERT INTO emails_processados (message_id, assunto, tipo, itens_lidos, leitor_versao) VALUES ($1,$2,'orcamento',$3,$4)
         ON CONFLICT (message_id) DO UPDATE SET tipo='orcamento', itens_lidos=EXCLUDED.itens_lidos, leitor_versao=EXCLUDED.leitor_versao, processado_em=NOW()`,
        [String(uid), email.subject || '', lidosNoEmail, pendente && !lidosNoEmail ? VERSAO_LEITOR - 1 : VERSAO_LEITOR]
      );
      await dbClient.query('COMMIT');
      resumo.emailsProcessados++;
    } catch (err) {
      await dbClient.query('ROLLBACK').catch(() => {});
      console.error('Erro ao processar e-mail de orçamento:', err);
      resumo.avisos.push(`Erro ao processar orçamento "${email.subject || uid}": ${err.message}`);
    }
  }
}

async function verificarCaixaDeEntrada() {
  const resumo = {
    emailsEncontrados: 0, emailsProcessados: 0,
    materiaisCriados: 0, materiaisAtualizados: 0,
    notasImportadas: 0, orcamentosImportados: 0, leiturasPorIA: 0, avisos: [],
  };

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
        ? 'credenciais inválidas — confira EMAIL_IMAP_USER e a senha de app no .env, e se o IMAP está habilitado nas configurações do Gmail'
        : err.responseText || err.message;
      resumo.avisos.push(`Falha ao conectar ao e-mail: ${motivo}`);
      return resumo;
    }

    const margem = await obterMargemPadrao(dbClient);
    const indice = await carregarIndice(dbClient);

    const lock = await imapClient.getMailboxLock('INBOX');
    try {
      const uids = await imapClient.search(
        { gmraw: `DANFE has:attachment after:${DESDE_DATA}` },
        { uid: true }
      );
      resumo.emailsEncontrados = uids.length;

      for (const uid of uids) {
        const jaLido = await dbClient.query(
          'SELECT id FROM emails_processados WHERE message_id = $1',
          [String(uid)]
        );
        if (jaLido.rows.length > 0) continue;

        const { content } = await imapClient.download(uid, undefined, { uid: true });
        const parsedEmail = await simpleParser(content);

        await dbClient.query('BEGIN');
        try {
          await processarMensagem(dbClient, parsedEmail, margem, resumo, indice);
          await dbClient.query(
            'INSERT INTO emails_processados (message_id, assunto) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [String(uid), parsedEmail.subject || '']
          );
          await dbClient.query('COMMIT');
          resumo.emailsProcessados++;
        } catch (err) {
          // ROLLBACK protegido (ver comentário equivalente no serviço de Pix).
          await dbClient.query('ROLLBACK').catch(() => {});
          console.error('Erro ao processar e-mail de nota fiscal:', err);
          resumo.avisos.push(`Erro ao processar e-mail "${parsedEmail.subject || uid}": ${err.message}`);
        }
      }

      await processarOrcamentosPorEmail(imapClient, dbClient, margem, indice, resumo);
    } finally {
      lock.release();
      await encerrarOcr();
    }
  } finally {
    dbClient.release();
    if (imapClient) await imapClient.logout().catch(() => {});
  }

  // material que ficou sem categoria (nem NCM, nem parecido, nem palavra-chave) → IA
  if (resumo.materiaisCriados) resumo.classificacao = await classificarPendentes().catch(e => ({ erro: e.message }));
  return resumo;
}

module.exports = { verificarCaixaDeEntrada, upsertMaterial, obterMargemPadrao };
