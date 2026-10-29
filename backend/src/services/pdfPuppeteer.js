const puppeteer = require('puppeteer');

// Gera um PDF a partir de HTML, garantindo que NENHUM erro aconteça depois que
// o chamador já enviou a resposta.
//
// O padrão anterior, repetido nos 4 controllers, era:
//     try { ... res.send(pdf); } finally { await browser.close(); }
// Como o `finally` roda depois do `res.send`, um `browser.close()` que
// rejeitasse (Chromium morto por falta de memória, processo zumbi no Windows)
// caía no catch externo, que tentava `res.status(500)` sobre uma resposta já
// enviada → ERR_HTTP_HEADERS_SENT → rejeição não tratada → processo derrubado.
//
// Aqui o navegador é fechado ANTES de devolver o buffer, e a falha ao fechar é
// registrada e engolida: se o PDF já foi gerado, não há motivo para o usuário
// perder o documento porque o Chromium não fechou direito.
//
// `timeout` no setContent: os templates referenciam fontes do Google. Sem
// internet (ou com firewall que descarta o pacote em vez de recusar), o
// `networkidle0` ficava os 30s padrão esperando e o usuário recebia erro ao
// baixar um PDF que nem depende da fonte. 8s é suficiente e falha rápido.

// Fila: cada PDF abre um Chromium inteiro (~150 MB). Vários usuários gerando
// PDF ao mesmo tempo (ou um clique repetido) esgotavam a memória do PC e
// derrubavam o sistema. No máximo PDF_CONCORRENCIA ao mesmo tempo; o resto espera.
const MAX_SIMULTANEOS = Number(process.env.PDF_CONCORRENCIA) || 2;
// Prazo na fila: antes a espera não tinha fim — com o Chromium travado, os
// pedidos se acumulavam para sempre (memória e conexões presas). Passou do
// prazo, o pedido desiste com erro claro (503) e o usuário tenta de novo.
const PRAZO_FILA_MS = Number(process.env.PDF_PRAZO_FILA_MS) || 120 * 1000;
// tempo-limite de cada operação na página (setContent, waitForSelector, pdf...)
const TEMPO_PAGINA_MS = 60 * 1000;
let emUso = 0;
const espera = [];

const erroFilaCheia = () => Object.assign(
  new Error('A fila de PDF está cheia (muitos documentos sendo gerados ao mesmo tempo). Tente de novo em instantes.'),
  { status: 503, codigo: 'FILA_PDF_CHEIA' });

function reservarVaga(prazoMs) {
  if (emUso < MAX_SIMULTANEOS) { emUso++; return Promise.resolve(); }
  return new Promise((ok, falha) => {
    const item = { entrar: () => { clearTimeout(relogio); ok(); } };
    const relogio = setTimeout(() => {
      const i = espera.indexOf(item);
      if (i >= 0) espera.splice(i, 1);
      falha(erroFilaCheia());
    }, prazoMs);
    espera.push(item);
  });
}

// A vaga passa direto para o próximo da fila (sem baixar e subir o contador:
// assim ninguém "fura" a fila entre uma coisa e outra)
function liberarVaga() {
  const proximo = espera.shift();
  if (proximo) proximo.entrar();
  else emUso--;
}

async function comVaga(fn, prazoMs = PRAZO_FILA_MS) {
  await reservarVaga(prazoMs);
  try {
    return await fn();
  } finally {
    liberarVaga();
  }
}

// Fecha o Chromium; se o close falhar ou travar, mata o processo — senão o
// Chromium (~150 MB) ficava vivo no PC, e a vaga da fila era liberada mesmo assim.
async function fecharNavegador(browser, contexto) {
  try {
    await Promise.race([
      browser.close(),
      new Promise((_, falha) => setTimeout(() => falha(new Error('o navegador não fechou em 10 s')), 10000).unref()),
    ]);
  } catch (err) {
    console.error(`Falha ao fechar o navegador ${contexto} (documento não foi afetado):`, err.message);
    try { browser.process()?.kill('SIGKILL'); } catch { /* já morreu */ }
  }
}

// page.evaluate não tem tempo-limite próprio: um script da página que nunca
// termina segurava a vaga da fila para sempre
function comTempoLimite(promessa, ms, oque) {
  let relogio;
  return Promise.race([
    promessa,
    new Promise((_, falha) => { relogio = setTimeout(() => falha(new Error(`${oque} passou de ${ms / 1000} s`)), ms); }),
  ]).finally(() => clearTimeout(relogio));
}

// O HTML junta dados digitados e importados (nomes, descrições, texto de
// e-mail). Mesmo escapado, o navegador do PDF não precisa de JavaScript nem
// de acessar nada além das fontes do Google: sem JS e com as requisições
// filtradas, um texto malicioso não consegue fazer o servidor buscar endereços
// da rede interna nem ler arquivos locais (file://).
const PERMITIDOS = /^(data:|about:blank|https:\/\/fonts\.(googleapis|gstatic)\.com\/)/;

async function gerarPdfDeHtml(html, opcoesPdf = {}) {
  return comVaga(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(TEMPO_PAGINA_MS);
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (PERMITIDOS.test(req.url())) req.continue().catch(() => {});
        else req.abort('blockedbyclient').catch(() => {});
      });
      try {
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 8000 });
      } catch (err) {
        // Tempo esgotado esperando recurso externo: segue com o que já carregou.
        // O conteúdo do documento é local; só as fontes vêm de fora.
        console.warn('Recurso externo demorou a carregar no PDF, seguindo sem ele:', err.message);
      }
      // puppeteer 25 devolve Uint8Array; o res.send do Express 4 transforma isso em
      // JSON ({"0":37,...}). Buffer garante o binário no download e na gravação.
      return Buffer.from(await page.pdf({ format: 'A4', printBackground: true, timeout: 60000, ...opcoesPdf }));
    } finally {
      await fecharNavegador(browser, 'do PDF');
    }
  });
}

// Imagem (PNG) de uma página gerada pelo próprio sistema que PRECISA de
// JavaScript — o modelo 3D (three.js). Mesma fila do PDF; rede bloqueada (só
// data:/about:blank), então o script não alcança nada fora da página. WebGL
// pelo SwiftShader (render por software): funciona sem placa de vídeo.
// opcoes: { largura, altura, esperarSeletor, css, antes (função rodada na página antes da foto) }
async function capturarImagemDeHtml(html, { largura = 1600, altura = 1000, esperarSeletor = null, css = '', antes = null } = {}) {
  return comVaga(async () => {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
    });
    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(TEMPO_PAGINA_MS);
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (/^(data:|about:blank)/.test(req.url())) req.continue().catch(() => {});
        else req.abort('blockedbyclient').catch(() => {});
      });
      await page.setViewport({ width: largura, height: altura });
      await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
      if (esperarSeletor) await page.waitForSelector(esperarSeletor, { timeout: 60000 });
      if (css) await page.addStyleTag({ content: css });
      if (antes) await comTempoLimite(page.evaluate(antes), 30000, 'o preparo da página para a captura');
      await new Promise(r => setTimeout(r, 400));
      return Buffer.from(await comTempoLimite(page.screenshot({ type: 'png' }), TEMPO_PAGINA_MS, 'a captura da imagem'));
    } finally {
      await fecharNavegador(browser, 'da captura');
    }
  });
}

module.exports = { gerarPdfDeHtml, capturarImagemDeHtml, comVaga };
