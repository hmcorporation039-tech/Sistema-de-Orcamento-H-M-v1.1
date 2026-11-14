// Resposta grande comprimida com gzip quando o navegador aceita (versão 2.37). A página do 3D tem ~1 MB (three.js +
// cena) e ia sem compressão — pesava no link do cliente aberto pela internet; com gzip cai para ~1/4. Sem dependência
// nova (zlib do Node): só as respostas que passam por aqui, não o servidor inteiro.
const zlib = require('zlib');

const MINIMO_BYTES = 8 * 1024; // abaixo disso a compressão não compensa

function enviarComprimido(req, res, corpo) {
  const buf = Buffer.isBuffer(corpo) ? corpo : Buffer.from(String(corpo), 'utf8');
  res.vary('Accept-Encoding');
  if (buf.length >= MINIMO_BYTES && /\bgzip\b/i.test(req.headers['accept-encoding'] || '')) {
    res.set('Content-Encoding', 'gzip');
    return res.send(zlib.gzipSync(buf, { level: 6 }));
  }
  return res.send(buf);
}

module.exports = { enviarComprimido, MINIMO_BYTES };
