const pool = require('../config/database');
const puppeteer = require('puppeteer');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');
const { gerarHtmlContrato, gerarFooterTemplate } = require('../utils/pdfTemplate');

async function listar(req, res) {
  const { busca } = req.query;
  const { pagina, porPagina, offset } = parsePaginacao(req.query);

  let condicoes = 'WHERE 1=1';
  const params = [];

  if (busca) {
    params.push(`%${busca}%`);
    condicoes += ` AND p.nome ILIKE $1`;
  }

  try {
    const total = await pool.query(
      `SELECT count(*) FROM contratos c JOIN prestadores p ON p.id = c.prestador_id ${condicoes}`,
      params
    );
    const result = await pool.query(
      `SELECT c.*, p.nome AS prestador_nome, p.documento AS prestador_documento, p.tipo AS prestador_tipo
       FROM contratos c
       JOIN prestadores p ON p.id = c.prestador_id
       ${condicoes}
       ORDER BY c.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, porPagina, offset]
    );
    res.json(montarResposta(result.rows, parseInt(total.rows[0].count, 10), pagina, porPagina));
  } catch (err) {
    console.error('Erro ao listar contratos:', err);
    res.status(500).json({ erro: 'Erro ao listar contratos' });
  }
}

function validar(body) {
  const { prestadorId, periodoInicio, periodoFim, valor } = body;
  if (!prestadorId) return 'Selecione o prestador';
  if (!periodoInicio || !periodoFim) return 'Informe o período do contrato';
  if (new Date(periodoFim) < new Date(periodoInicio)) return 'A data final não pode ser anterior à inicial';
  if (!(Number(valor) > 0)) return 'Informe um valor maior que zero';
  return null;
}

async function buscarContratoCompleto(id) {
  const result = await pool.query(
    `SELECT c.*, p.nome AS prestador_nome, p.documento AS prestador_documento, p.tipo AS prestador_tipo
     FROM contratos c
     JOIN prestadores p ON p.id = c.prestador_id
     WHERE c.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function montarPdfBuffer(contrato) {
  const html = gerarHtmlContrato(contrato);
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    return await page.pdf({
      format: 'A4', printBackground: true,
      margin: { top: '12mm', bottom: '24mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: gerarFooterTemplate(),
    });
  } finally {
    await browser.close();
  }
}

async function criar(req, res) {
  const erro = validar(req.body);
  if (erro) return res.status(400).json({ erro });

  const { prestadorId, objeto, localObra, periodoInicio, periodoFim, valor } = req.body;
  try {
    const prestador = await pool.query('SELECT id FROM prestadores WHERE id = $1 AND ativo = true', [prestadorId]);
    if (prestador.rows.length === 0) return res.status(404).json({ erro: 'Prestador não encontrado' });

    const result = await pool.query(
      `INSERT INTO contratos (prestador_id, objeto, local_obra, periodo_inicio, periodo_fim, valor, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [prestadorId, objeto || null, localObra || null, periodoInicio, periodoFim, valor, req.usuario.id]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('Erro ao criar contrato:', err);
    res.status(500).json({ erro: 'Erro ao criar contrato' });
  }
}

async function gerarPdf(req, res) {
  try {
    const contrato = await buscarContratoCompleto(req.params.id);
    if (!contrato) return res.status(404).json({ erro: 'Contrato não encontrado' });

    const pdf = await montarPdfBuffer(contrato);
    const nomeArquivo = contrato.prestador_nome.replace(/[^a-zA-Z0-9]+/g, '_');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Contrato_${contrato.id}_${nomeArquivo}.pdf"`,
    });
    res.send(pdf);
  } catch (err) {
    console.error('Erro ao gerar PDF do contrato:', err);
    res.status(500).json({ erro: 'Erro ao gerar PDF do contrato' });
  }
}

async function remover(req, res) {
  try {
    await pool.query('DELETE FROM contratos WHERE id = $1', [req.params.id]);
    res.json({ mensagem: 'Contrato removido' });
  } catch (err) {
    console.error('Erro ao remover contrato:', err);
    res.status(500).json({ erro: 'Erro ao remover contrato' });
  }
}

module.exports = { listar, criar, gerarPdf, remover };
