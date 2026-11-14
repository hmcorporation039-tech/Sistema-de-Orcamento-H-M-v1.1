// Notas fiscais de serviço — PDF (layout do ISS, com QR Code), pré-visualização em HTML, XML e envio
// por e-mail ao tomador.
const QRCode = require('qrcode');
const pool = require('../../config/database');
const { registrarAuditoria } = require('../../services/auditoria');
const { contentDisposition } = require('../../utils/nomeArquivoDownload');
const { gerarPdfDeHtml } = require('../../services/pdfPuppeteer');
const { criarTransportador } = require('../../services/email/smtp');
const { EMPRESA } = require('../../utils/pdfTemplate');
const { gerarHtmlNfse } = require('../../utils/nfsePdfTemplate');
const { ASSINATURA_EMPRESA } = require('../propostaDocumentos');
const { EMAIL, lerNota } = require('./comum');

// ── PDF, XML, e-mail ───────────────────────────────────────────────────────

const nomeArquivo = (n, ext) => {
  const cliente = String(n.tomador?.nome || 'cliente').trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_').slice(0, 60);
  return `NFS-e_${n.numero || `rascunho_${n.id}`}_${cliente}.${ext}`;
};

async function montarPdf(n) {
  const { rows: [empresa] } = await pool.query('SELECT * FROM empresa_fiscal WHERE id = 1');
  const codigos = [n.tomador?.codigo_municipio, n.codigo_municipio_prestacao, n.municipio_incidencia].filter(Boolean);
  const { rows: mun } = codigos.length
    ? await pool.query('SELECT codigo, nome, uf FROM municipios_ibge WHERE codigo = ANY($1)', [codigos])
    : { rows: [] };
  // QR Code: a página da nota no portal do ISS DF (link guardado na importação)
  // ou a consulta pública nacional pela chave; rascunho não tem
  const destinoQr = n.situacao === 'rascunho' ? null
    : n.link_consulta || (n.chave_acesso ? `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${n.chave_acesso}` : null);
  const qrcode = destinoQr ? await QRCode.toDataURL(destinoQr, { margin: 0, width: 300, errorCorrectionLevel: 'M' }) : null;
  const html = gerarHtmlNfse(n, { empresa: empresa || {}, municipios: Object.fromEntries(mun.map(m => [m.codigo, m])), qrcode });
  // sem o rodapé do papel timbrado: a nota segue o layout do ISS, que não tem
  return Buffer.from(await gerarPdfDeHtml(html, { margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' } }));
}

async function pdf(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  // fila de PDF cheia: o tratador central (middleware/erros.js) responde 503 com a mensagem da fila
  const arquivo = await montarPdf(n);
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': contentDisposition(nomeArquivo(n, 'pdf')) });
  res.send(arquivo);
}

// Retorna o HTML da nota sem passar pelo Puppeteer — para pré-visualização no browser.
async function previewHtml(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const { rows: emp } = await pool.query('SELECT * FROM empresa_fiscal LIMIT 1');
  const empresa = emp[0] || {};
  const codigos = [n.tomador?.codigo_municipio, n.codigo_municipio_prestacao, n.municipio_incidencia].filter(Boolean);
  const { rows: mun } = codigos.length
    ? await pool.query('SELECT codigo, nome, uf FROM municipios_ibge WHERE codigo = ANY($1)', [codigos])
    : { rows: [] };
  const destinoQr = n.situacao === 'rascunho' ? null
    : n.link_consulta || (n.chave_acesso ? `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${n.chave_acesso}` : null);
  const qrcode = destinoQr ? await QRCode.toDataURL(destinoQr, { margin: 0, width: 300, errorCorrectionLevel: 'M' }) : null;
  const html = gerarHtmlNfse(n, { empresa, municipios: Object.fromEntries(mun.map(m => [m.codigo, m])), qrcode });
  res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.send(html);
}

async function xml(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  if (!n.xml) return res.status(404).json({ erro: 'Esta nota não tem XML (rascunho ou nota sem arquivo importado).' });
  res.set({ 'Content-Type': 'application/xml; charset=utf-8', 'Content-Disposition': contentDisposition(nomeArquivo(n, 'xml')) });
  res.send(n.xml);
}

async function enviarEmail(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  if (n.situacao === 'rascunho') return res.status(409).json({ erro: 'Rascunho não se envia ao cliente: emita a nota primeiro.' });
  const destinatarios = String(req.body?.destinatario ?? '').split(/[;,\s]+/).map(s => s.trim()).filter(Boolean);
  if (!destinatarios.length || destinatarios.length > 5 || destinatarios.some(d => d.length > 254 || !EMAIL.test(d))) {
    return res.status(400).json({ erro: 'Informe de 1 a 5 e-mails válidos (separados por vírgula).' });
  }
  const mensagem = req.body?.mensagem;
  if (mensagem != null && (typeof mensagem !== 'string' || mensagem.length > 10000)) return res.status(400).json({ erro: 'Mensagem de até 10.000 caracteres.' });
  const arquivo = await montarPdf(n);
  const valor = Number(n.valor_servicos).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const corpo = (mensagem && mensagem.trim())
    || `Olá,\n\nSegue em anexo a nota fiscal de serviço nº ${n.numero}, no valor de ${valor}.${n.situacao === 'cancelada' ? '\n\nAtenção: esta nota foi CANCELADA.' : ''}`;
  const anexos = [{ filename: nomeArquivo(n, 'pdf'), content: arquivo, contentType: 'application/pdf' }];
  if (n.xml) anexos.push({ filename: nomeArquivo(n, 'xml'), content: Buffer.from(n.xml, 'utf8'), contentType: 'application/xml' });
  await criarTransportador().sendMail({
    from: `"H&M Engenharia" <${process.env.EMAIL_IMAP_USER}>`,
    to: destinatarios.join(', '),
    subject: `NFS-e nº ${n.numero} — ${EMPRESA.nomeFantasia}`,
    text: `${corpo}\n\n${ASSINATURA_EMPRESA}`,
    attachments: anexos,
  });
  const para = destinatarios.join(', ').slice(0, 254);
  await pool.query('UPDATE notas_fiscais SET ultimo_envio_em = NOW(), ultimo_envio_para = $2 WHERE id = $1', [n.id, para]);
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'email', usuarioId: req.usuario.id, detalhes: { para } });
  res.json({ mensagem: `Nota ${n.numero} enviada para ${para}` });
}

module.exports = { pdf, previewHtml, xml, enviarEmail };
