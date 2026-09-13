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
async function gerarPdfDeHtml(html, opcoesPdf = {}) {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 8000 });
    } catch (err) {
      // Tempo esgotado esperando recurso externo: segue com o que já carregou.
      // O conteúdo do documento é local; só as fontes vêm de fora.
      console.warn('Recurso externo demorou a carregar no PDF, seguindo sem ele:', err.message);
    }
    return await page.pdf({ format: 'A4', printBackground: true, ...opcoesPdf });
  } finally {
    await browser.close().catch(err =>
      console.error('Falha ao fechar o navegador do PDF (documento não foi afetado):', err.message)
    );
  }
}

module.exports = { gerarPdfDeHtml };
