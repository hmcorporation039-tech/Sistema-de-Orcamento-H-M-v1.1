// Notas fiscais de serviço — atestado de capacidade técnica (item 9): prévia do texto, o Word e o envio
// ao cliente, com outras notas emitidas do mesmo cliente no mesmo atestado.
const pool = require('../../config/database');
const { registrarAuditoria } = require('../../services/auditoria');
const { contentDisposition } = require('../../utils/nomeArquivoDownload');
const { criarTransportador } = require('../../services/email/smtp');
const { EMPRESA } = require('../../utils/pdfTemplate');
const atestado = require('../../services/atestadoCapacidade');
const { ASSINATURA_EMPRESA } = require('../propostaDocumentos');
const { digitos, EMAIL, lerNota } = require('./comum');

// Proposta ligada à nota: de lá vêm o local, os itens e quantidades reais e o número da proposta
// que o atestado usa. O vínculo é opcional e feito pelo administrador (nada é adivinhado).
// `idsOutras`: outras notas emitidas do mesmo cliente que entram no mesmo atestado (até 10)
async function contextoAtestado(nota, idsOutras = []) {
  const outrasNotas = [];
  const ids = Array.isArray(idsOutras) ? idsOutras : [];
  for (const id of [...new Set(ids.map(Number).filter(i => Number.isInteger(i) && i > 0 && i !== nota.id))].slice(0, 10)) {
    const o = await lerNota(id);
    if (!o) throw Object.assign(new Error(`Nota ${id} não encontrada.`), { status: 404 });
    delete o.xml;
    outrasNotas.push(o);
  }
  if (!nota.proposta_id) return { outrasNotas };
  const { rows: [proposta] } = await pool.query(
    'SELECT id, numero, total, local_obra, status, cliente_id, obra_id FROM propostas WHERE id = $1', [nota.proposta_id]);
  if (!proposta) return { outrasNotas };
  const [{ rows: [obra] }, { rows: itens }] = await Promise.all([
    proposta.obra_id ? pool.query('SELECT nome, local FROM obras WHERE id = $1', [proposta.obra_id]) : { rows: [] },
    pool.query(
      `SELECT i.descricao, i.quantidade, i.unidade, s.nome AS secao
         FROM proposta_itens i LEFT JOIN proposta_secoes s ON s.id = i.secao_id
        WHERE i.proposta_id = $1 AND COALESCE(i.status, 'confirmado') = 'confirmado'
        ORDER BY s.ordem NULLS LAST, i.ordem, i.id`, [proposta.id]),
  ]);
  return { proposta, obra, itens, outrasNotas };
}

// Atestado de capacidade técnica (item 9): só o corpo do texto, para o cliente colar no papel
// timbrado dele. `previa` devolve o texto para conferir; `atestadoDocx` baixa o Word. Nunca marca
// nada como emitido: quem atesta é o cliente.
// Erro do atestado (dado que falta, nota de outro tomador: 400; outra nota não encontrada: 404) sai pelo
// tratador central (middleware/erros.js) como { erro: mensagem } — aqui, no Word e no envio por e-mail.
async function previaAtestado(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const { titulo, texto, avisos, sugestao } = atestado.montarAtestado(n, req.body || {}, await contextoAtestado(n, req.body?.notas_ids));
  res.json({ titulo, texto, avisos, sugestao, proposta_id: n.proposta_id, proposta_numero: n.proposta_numero });
}

async function atestadoDocx(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const { blocos } = atestado.montarAtestado(n, req.body || {}, await contextoAtestado(n, req.body?.notas_ids));
  const arquivo = await atestado.gerarDocx(blocos);
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'atestado_gerado', usuarioId: req.usuario.id, detalhes: { nota: n.numero, proposta_id: n.proposta_id, notas_ids: req.body?.notas_ids || [] } });
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'Content-Disposition': contentDisposition(`Atestado_NFS-e_${n.numero || n.id}.docx`),
  });
  res.send(arquivo);
}

// Outras notas EMITIDAS do mesmo cliente que podem entrar no mesmo atestado (contrato com várias notas)
async function notasCandidatas(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const doc = digitos(n.tomador?.documento);
  const { rows } = await pool.query(
    `SELECT id, numero, to_char(data_emissao, 'YYYY-MM-DD') AS data_emissao, valor_servicos, left(discriminacao, 120) AS resumo
       FROM notas_fiscais
      WHERE situacao = 'emitida' AND id <> $1
        AND (($2::int IS NOT NULL AND cliente_id = $2) OR ($3 <> '' AND regexp_replace(tomador->>'documento', '\\D', '', 'g') = $3))
      ORDER BY data_emissao DESC NULLS LAST, id DESC LIMIT 100`, [n.id, n.cliente_id, doc]);
  res.json(rows);
}

// Manda o atestado (Word) ao cliente por e-mail e registra o envio. Corpo: { destinatario, mensagem, notas_ids, ...opcoes do atestado }.
// O e-mail diz que o texto é uma proposta para o cliente conferir e colar no papel timbrado dele.
async function enviarAtestado(req, res) {
  const n = await lerNota(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada' });
  const { destinatario, mensagem, ...opcoes } = req.body || {};
  const destinatarios = String(destinatario ?? '').split(/[;,\s]+/).map(x => x.trim()).filter(Boolean);
  if (!destinatarios.length || destinatarios.length > 5 || destinatarios.some(d => d.length > 254 || !EMAIL.test(d))) {
    return res.status(400).json({ erro: 'Informe de 1 a 5 e-mails válidos (separados por vírgula).' });
  }
  if (mensagem != null && (typeof mensagem !== 'string' || mensagem.length > 10000)) return res.status(400).json({ erro: 'Mensagem de até 10.000 caracteres.' });
  const contexto = await contextoAtestado(n, opcoes.notas_ids);
  const { blocos } = atestado.montarAtestado(n, opcoes, contexto);
  const arquivo = await atestado.gerarDocx(blocos);
  const numeros = [n, ...contexto.outrasNotas].map(x => x.numero).join(', ');
  const corpo = (mensagem && mensagem.trim())
    || `Olá,\n\nSegue em anexo a proposta de texto do atestado de capacidade técnica referente à NFS-e nº ${numeros}. O arquivo traz só o corpo do texto, sem papel timbrado: cole-o no papel timbrado de vocês, confira os dados, ajuste o que for preciso e assine.`;
  await criarTransportador().sendMail({
    from: `"H&M Engenharia" <${process.env.EMAIL_IMAP_USER}>`,
    to: destinatarios.join(', '),
    subject: `Atestado de capacidade técnica — NFS-e nº ${numeros} — ${EMPRESA.nomeFantasia}`,
    text: `${corpo}\n\n${ASSINATURA_EMPRESA}`,
    attachments: [{ filename: `Atestado_NFS-e_${n.numero || n.id}.docx`, content: arquivo, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }],
  });
  const para = destinatarios.join(', ').slice(0, 254);
  await pool.query('UPDATE notas_fiscais SET atestado_enviado_em = NOW(), atestado_enviado_para = $2 WHERE id = $1', [n.id, para]);
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: n.id, acao: 'atestado_enviado', usuarioId: req.usuario.id, detalhes: { para, notas: numeros } });
  res.json({ mensagem: `Atestado enviado para ${para}`, atestado_enviado_em: new Date(), atestado_enviado_para: para });
}

module.exports = { previaAtestado, atestadoDocx, notasCandidatas, enviarAtestado };
