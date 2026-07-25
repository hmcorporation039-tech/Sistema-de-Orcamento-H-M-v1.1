const puppeteer = require('puppeteer');
const pool = require('../config/database');
const { gerarHtmlRelatorio, gerarFooterTemplateRelatorio } = require('../utils/relatorioTemplate');

// Primeiro dia do mês atual até hoje, se as datas não forem informadas
function periodoPadrao() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return {
    dataInicio: inicio.toISOString().slice(0, 10),
    dataFim: hoje.toISOString().slice(0, 10),
  };
}

function montarFiltro(query) {
  const padrao = periodoPadrao();
  const dataInicio = query.dataInicio || padrao.dataInicio;
  const dataFim = query.dataFim || padrao.dataFim;
  const { status, busca } = query;

  const condicoes = ['data >= $1', 'data <= $2'];
  const params = [dataInicio, dataFim];

  if (status) {
    params.push(status);
    condicoes.push(`status = $${params.length}`);
  }
  if (busca) {
    params.push(`%${busca}%`);
    condicoes.push(`(numero ILIKE $${params.length} OR cliente_nome ILIKE $${params.length} OR local_obra ILIKE $${params.length})`);
  }

  return { where: `WHERE ${condicoes.join(' AND ')}`, params, dataInicio, dataFim, status, busca };
}

async function buscarPropostasEtotais(query) {
  const { where, params, dataInicio, dataFim, status, busca } = montarFiltro(query);

  const propostas = await pool.query(
    `SELECT id, numero, data, cliente_nome, local_obra, status,
       subtotal_materiais, subtotal_mao_obra, valor_bdi,
       imposto_venda, imposto_servico, valor_imposto_venda, valor_imposto_servico,
       bdi, total
     FROM propostas
     ${where}
     ORDER BY sequencial DESC`,
    params
  );

  const totaisResult = await pool.query(
    `SELECT
      count(*) AS propostas,
      COALESCE(SUM(total), 0) AS valor_total,
      COALESCE(SUM(total) FILTER (WHERE status = 'Aprovada'), 0) AS valor_aprovado
     FROM propostas
     ${where}`,
    params
  );
  const t = totaisResult.rows[0];

  return {
    dataInicio, dataFim, status, busca,
    propostas: propostas.rows,
    totais: {
      propostas: Number(t.propostas),
      valorTotal: Number(t.valor_total),
      valorAprovado: Number(t.valor_aprovado),
    },
  };
}

async function listar(req, res) {
  try {
    const resultado = await buscarPropostasEtotais(req.query);
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao gerar relatório de propostas:', err);
    res.status(500).json({ erro: 'Erro ao gerar relatório de propostas' });
  }
}

function escaparCsv(valor) {
  const texto = String(valor ?? '');
  if (/[",;\n]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

async function exportarCsv(req, res) {
  try {
    const { propostas } = await buscarPropostasEtotais(req.query);

    const cabecalho = [
      'Numero', 'Data', 'Cliente', 'Local da Obra', 'Status',
      'Subtotal Materiais', 'Imposto Vendas', 'Subtotal Mao de Obra', 'Imposto Servicos',
      'BDI', 'Total'
    ];
    const linhas = propostas.map(p => [
      p.numero,
      new Date(p.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
      p.cliente_nome,
      p.local_obra || '',
      p.status,
      Number(p.subtotal_materiais).toFixed(2),
      Number(p.valor_imposto_venda).toFixed(2),
      Number(p.subtotal_mao_obra).toFixed(2),
      Number(p.valor_imposto_servico).toFixed(2),
      Number(p.valor_bdi).toFixed(2),
      Number(p.total).toFixed(2),
    ].map(escaparCsv).join(';'));

    const csv = [cabecalho.join(';'), ...linhas].join('\r\n');
    const bom = '﻿';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-propostas.csv"');
    res.send(bom + csv);
  } catch (err) {
    console.error('Erro ao exportar CSV do relatório:', err);
    res.status(500).json({ erro: 'Erro ao exportar CSV do relatório' });
  }
}

async function exportarPdf(req, res) {
  let browser;
  try {
    const dados = await buscarPropostasEtotais(req.query);
    const html = gerarHtmlRelatorio(dados);

    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4', printBackground: true,
      margin: { top: '12mm', bottom: '24mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: gerarFooterTemplateRelatorio(),
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-propostas.pdf"');
    res.send(pdf);
  } catch (err) {
    console.error('Erro ao exportar PDF do relatório:', err);
    res.status(500).json({ erro: 'Erro ao exportar PDF do relatório' });
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { listar, exportarCsv, exportarPdf };
