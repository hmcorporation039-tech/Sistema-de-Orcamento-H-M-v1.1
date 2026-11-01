// HTML → PDF para os cadernos de fabricação (e qualquer documento em PDF que
// uma skill precise gerar). As skills são a camada de baixo e não têm o
// puppeteer como dependência: ele é resolvido de backend/node_modules (o mesmo
// Chromium que o sistema já usa para propostas e relatórios).
//
// Mesmas proteções de backend/src/services/pdfPuppeteer.js: JavaScript
// desligado, rede bloqueada (só data: e about:blank — o caderno é
// autossuficiente, sem fontes externas), tempo-limite em cada operação e o
// navegador fechado (ou morto) antes de devolver o buffer. Quando o backend
// está carregado no mesmo processo, usa a FILA dele (comVaga): um caderno
// gerado pela tela entra na mesma fila de Chromiums das propostas.

const path = require('path');

const RAIZ = path.join(__dirname, '..', '..', '..');
const TEMPO_PAGINA_MS = 60 * 1000;

let puppeteerCache = null;
function carregarPuppeteer() {
  if (puppeteerCache) return puppeteerCache;
  try {
    puppeteerCache = require(require.resolve('puppeteer', { paths: [path.join(RAIZ, 'backend')] }));
  } catch {
    try {
      puppeteerCache = require('puppeteer');
    } catch {
      throw new Error('Puppeteer não encontrado: instale as dependências do backend (cd backend && npm install) para gerar o PDF.');
    }
  }
  return puppeteerCache;
}

// Fila do backend, se o módulo existir (mesmo arquivo → mesma instância do require)
function filaDoBackend() {
  try {
    const m = require(path.join(RAIZ, 'backend', 'src', 'services', 'pdfPuppeteer.js'));
    return typeof m.comVaga === 'function' ? m.comVaga : null;
  } catch {
    return null;
  }
}

async function fecharNavegador(browser) {
  try {
    await Promise.race([
      browser.close(),
      new Promise((_, falha) => setTimeout(() => falha(new Error('o navegador não fechou em 10 s')), 10000).unref()),
    ]);
  } catch {
    try { browser.process()?.kill('SIGKILL'); } catch { /* já morreu */ }
  }
}

// opcoes: as do page.pdf (margin, displayHeaderFooter, footerTemplate…); A4,
// fundo impresso e o tamanho de página do CSS (@page, inclusive páginas em
// paisagem nomeadas) por padrão
async function htmlParaPdf(html, opcoes = {}) {
  const puppeteer = carregarPuppeteer();
  const gerar = async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(TEMPO_PAGINA_MS);
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (/^(data:|about:blank)/.test(req.url())) req.continue().catch(() => {});
        else req.abort('blockedbyclient').catch(() => {});
      });
      await page.setContent(html, { waitUntil: 'load', timeout: TEMPO_PAGINA_MS });
      return Buffer.from(await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, timeout: TEMPO_PAGINA_MS, ...opcoes }));
    } finally {
      await fecharNavegador(browser);
    }
  };
  const fila = filaDoBackend();
  return fila ? fila(gerar) : gerar();
}

module.exports = { htmlParaPdf, carregarPuppeteer };
