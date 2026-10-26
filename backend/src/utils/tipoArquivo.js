// Tipo real do arquivo pelos primeiros bytes ("magic bytes"). O tipo declarado
// pelo navegador (mimetype) e a extensão são escolhidos por quem envia — um
// HTML ou executável renomeado para .jpg passaria. Aqui vale o conteúdo.
function tipoPorConteudo(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  // PDF: "%PDF" deve aparecer no começo (a especificação tolera lixo antes, até 1 KB)
  if (buffer.subarray(0, 1024).includes('%PDF')) return 'application/pdf';
  return null;
}

module.exports = { tipoPorConteudo };
