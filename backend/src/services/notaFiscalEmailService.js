const { simpleParser } = require('mailparser');
const pool = require('../config/database');
const { conectar, credenciaisConfiguradas } = require('../utils/emailClient');
const { extrairDoPdf, parseNFeXml } = require('../utils/notaFiscalParser');
const { classificarPorDescricao } = require('../utils/classificadorMaterial');

// Piso fixo: nunca busca e-mails anteriores a essa data. Toda verificação
// (manual ou agendada) parte sempre daqui, nunca "N dias atrás". O backfill
// histórico (desde 16/08/2025) já foi feito, então o piso avançou para a
// data em que o monitoramento contínuo começou a valer.
const DESDE_DATA = '2026/07/21';

function normalizarDescricao(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function obterMargemPadrao(client) {
  const r = await client.query("SELECT valor FROM configuracoes WHERE chave = 'margem_padrao'");
  return parseFloat(r.rows[0]?.valor) || 0;
}

// Cria o material se a descrição for nova, ou atualiza custo/preço se já existir.
// Preserva o preço de venda quando ele foi ajustado manualmente (preco_manual = true).
async function upsertMaterial(client, item, origem, margem) {
  const descricaoNorm = normalizarDescricao(item.descricao);
  if (!descricaoNorm) return null;

  const existente = await client.query(
    `SELECT * FROM materiais WHERE LOWER(TRIM(descricao)) = $1 AND ativo = true LIMIT 1`,
    [descricaoNorm]
  );

  const precoCompra = item.preco || 0;
  const precoVenda = Math.round(precoCompra * (1 + margem / 100) * 100) / 100;

  if (existente.rows.length > 0) {
    const mat = existente.rows[0];
    if (mat.preco_manual) {
      await client.query(
        `UPDATE materiais SET preco_compra=$1, ncm=COALESCE(NULLIF(ncm,''), $2), origem=$3, atualizado_em=NOW() WHERE id=$4`,
        [precoCompra, item.ncm || null, origem, mat.id]
      );
    } else {
      await client.query(
        `UPDATE materiais SET preco_compra=$1, preco=$2, ncm=COALESCE(NULLIF(ncm,''), $3), origem=$4, atualizado_em=NOW() WHERE id=$5`,
        [precoCompra, precoVenda, item.ncm || null, origem, mat.id]
      );
    }
    return { criado: false };
  }

  let categoria = null;
  if (item.ncm) {
    const parecido = await client.query(
      `SELECT categoria FROM materiais WHERE ncm = $1 AND ativo = true AND categoria <> 'Não classificado' LIMIT 1`,
      [item.ncm]
    );
    if (parecido.rows.length > 0) categoria = parecido.rows[0].categoria;
  }
  if (!categoria) categoria = classificarPorDescricao(item.descricao);
  if (!categoria) categoria = 'Não classificado';

  await client.query(
    `INSERT INTO materiais (codigo, descricao, categoria, unidade, preco, preco_compra, marca, ncm, origem)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [item.codigo || null, item.descricao, categoria, item.unidade || 'un', precoVenda, precoCompra, '', item.ncm || null, origem]
  );
  return { criado: true };
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

async function processarMensagem(client, parsedEmail, margem, resumo) {
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
    const r = await upsertMaterial(client, item, origem, margem);
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

async function verificarCaixaDeEntrada() {
  const resumo = {
    emailsEncontrados: 0, emailsProcessados: 0,
    materiaisCriados: 0, materiaisAtualizados: 0,
    notasImportadas: 0, avisos: [],
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
          await processarMensagem(dbClient, parsedEmail, margem, resumo);
          await dbClient.query(
            'INSERT INTO emails_processados (message_id, assunto) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [String(uid), parsedEmail.subject || '']
          );
          await dbClient.query('COMMIT');
          resumo.emailsProcessados++;
        } catch (err) {
          await dbClient.query('ROLLBACK');
          resumo.avisos.push(`Erro ao processar e-mail "${parsedEmail.subject || uid}": ${err.message}`);
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

module.exports = { verificarCaixaDeEntrada, upsertMaterial, obterMargemPadrao };
