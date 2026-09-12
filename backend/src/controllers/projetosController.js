const puppeteer = require('puppeteer');
const { analisarProjetoCompleto } = require('../utils/compatibilizacaoAnalise');
const { gerarHtmlRelatorioCompatibilizacao } = require('../utils/relatorioCompatibilizacaoTemplate');
const { gerarFooterTemplate } = require('../utils/pdfTemplate');

// Recebe um ou mais PDFs de projeto (plantas de CFTV, cabeamento, etc.) e
// devolve a análise extraída (ambientes, câmeras, cabos, achados de
// compatibilização e uma lista inicial de serviços/materiais) para revisão
// do usuário antes de gerar o relatório final.
async function analisar(req, res) {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ erro: 'Envie ao menos um arquivo PDF de projeto' });
  }

  try {
    const arquivos = req.files.map(f => ({ buffer: f.buffer, nomeArquivo: f.originalname }));
    const analise = await analisarProjetoCompleto(arquivos);
    res.json(analise);
  } catch (err) {
    console.error('Erro ao analisar projeto:', err);
    res.status(422).json({ erro: err.message || 'Erro ao analisar os arquivos do projeto' });
  }
}

// Gera o relatório de compatibilização em PDF a partir da análise já revisada
// pelo usuário (serviços/materiais com quantidades ajustadas e o que já está
// pronto marcado) — documento interno, separado do orçamento comercial.
async function gerarRelatorio(req, res) {
  const analise = req.body;
  if (!analise || typeof analise !== 'object') {
    return res.status(400).json({ erro: 'Dados da análise não informados' });
  }

  try {
    const html = gerarHtmlRelatorioCompatibilizacao(analise);
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4', printBackground: true,
        margin: { top: '12mm', bottom: '20mm', left: '14mm', right: '14mm' },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: gerarFooterTemplate(),
      });
      const nomeCliente = String(analise.cliente || 'projeto').trim().replace(/[^a-zA-Z0-9À-ÿ]+/g, '_');
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Compatibilizacao_${nomeCliente}.pdf"`,
      });
      res.send(pdf);
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error('Erro ao gerar relatório de compatibilização:', err);
    res.status(500).json({ erro: 'Erro ao gerar relatório de compatibilização' });
  }
}

module.exports = { analisar, gerarRelatorio };
