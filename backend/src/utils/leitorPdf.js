// Leitura de PDF pelo pdf-parse — um lugar só (antes o mesmo new PDFParse →
// getText → destroy estava copiado na análise de projeto, na cotação de
// fornecedor e na nota fiscal; uma quarta cópia nem era usada). A leitura
// VETORIAL (traços e símbolos) é outra coisa: utils/pdfVetorial.js.
const { PDFParse } = require('pdf-parse');

// Texto de todas as páginas ('' se o PDF não tiver camada de texto)
async function textoDoPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    return (await parser.getText()).text || '';
  } finally {
    await parser.destroy();
  }
}

// Texto de todas as páginas e o de cada uma (a análise de projeto tira os
// ambientes só das folhas de planta — utils/classificarPranchaPdf.js)
async function textoEPaginasDoPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const r = await parser.getText();
    return { texto: r.text || '', paginas: (r.pages || []).map(p => p.text || '') };
  } finally {
    await parser.destroy();
  }
}

// Páginas como imagem (PNG), para o OCR de PDF escaneado
async function paginasComoImagem(buffer, { escala = 2.5, maxPaginas } = {}) {
  const parser = new PDFParse({ data: buffer });
  try {
    const r = await parser.getScreenshot({ scale: escala, ...(maxPaginas ? { first: maxPaginas } : {}) });
    return r.pages.map(p => Buffer.from(p.data));
  } finally {
    await parser.destroy();
  }
}

module.exports = { textoDoPdf, textoEPaginasDoPdf, paginasComoImagem };
