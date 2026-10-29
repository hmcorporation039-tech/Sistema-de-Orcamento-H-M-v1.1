// Data/hora e GPS gravados pela câmera no JPEG (EXIF), para a legenda do
// relatório fotográfico e para conferir se a foto foi tirada no local e na data
// da inspeção (modelo de laudo de SPDA e aterramento de 29/10/2026). Sem
// dependências: lê só as três tags que interessam e ignora o resto.
//
//   lerExif(buffer) → { data_hora: 'AAAA-MM-DDTHH:MM:SS' | null, gps: { lat, lon } | null }
//   coordenadas('-15.65, -47.78' | { lat, lon }) → { lat, lon } | null
//   distanciaM(a, b) → metros entre dois pontos (haversine)

const TAG_EXIF = 0x8769;
const TAG_GPS = 0x8825;
const TAG_DATA_ORIGINAL = 0x9003;
const TAG_DATA = 0x0132;
const TAMANHO_TIPO = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

function lerIfd(buf, tiff, offset, le) {
  const u16 = (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
  const u32 = (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
  const entradas = {};
  if (tiff + offset + 2 > buf.length) return entradas;
  const n = u16(tiff + offset);
  for (let i = 0; i < n; i++) {
    const e = tiff + offset + 2 + i * 12;
    if (e + 12 > buf.length) break;
    const tag = u16(e);
    const tipo = u16(e + 2);
    const qtd = u32(e + 4);
    const tamanho = (TAMANHO_TIPO[tipo] || 1) * qtd;
    const pos = tamanho <= 4 ? e + 8 : tiff + u32(e + 8);
    if (pos + tamanho > buf.length) continue;
    let valor;
    if (tipo === 2) valor = buf.toString('latin1', pos, pos + qtd).replace(/\0+$/, '');
    else if (tipo === 3) valor = u16(pos);
    else if (tipo === 4) valor = u32(pos);
    else if (tipo === 5) valor = Array.from({ length: qtd }, (_, k) => u32(pos + k * 8) / (u32(pos + k * 8 + 4) || 1));
    else valor = buf.slice(pos, pos + tamanho);
    entradas[tag] = valor;
  }
  return entradas;
}

function dataExif(texto) {
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(texto || '');
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}` : null;
}

function graus(g, ref) {
  if (!Array.isArray(g) || g.length < 3) return null;
  const v = g[0] + g[1] / 60 + g[2] / 3600;
  return /[SW]/i.test(ref || '') ? -v : v;
}

function lerExif(buf) {
  const vazio = { data_hora: null, gps: null };
  try {
    if (!buf || buf[0] !== 0xff || buf[1] !== 0xd8) return vazio;
    let i = 2;
    while (i + 4 < buf.length) {
      if (buf[i] !== 0xff) return vazio;
      const marcador = buf[i + 1];
      const tamanho = buf.readUInt16BE(i + 2);
      if (marcador === 0xe1 && buf.toString('latin1', i + 4, i + 10) === 'Exif\0\0') {
        const tiff = i + 10;
        const le = buf.toString('latin1', tiff, tiff + 2) === 'II';
        const ifd0 = lerIfd(buf, tiff, le ? buf.readUInt32LE(tiff + 4) : buf.readUInt32BE(tiff + 4), le);
        const exif = ifd0[TAG_EXIF] ? lerIfd(buf, tiff, ifd0[TAG_EXIF], le) : {};
        const g = ifd0[TAG_GPS] ? lerIfd(buf, tiff, ifd0[TAG_GPS], le) : {};
        const lat = graus(g[2], g[1]);
        const lon = graus(g[4], g[3]);
        return {
          data_hora: dataExif(exif[TAG_DATA_ORIGINAL]) || dataExif(ifd0[TAG_DATA]),
          gps: lat != null && lon != null && (lat !== 0 || lon !== 0) ? { lat, lon } : null,
        };
      }
      if (marcador === 0xda) return vazio; // começou a imagem: não há EXIF
      i += 2 + tamanho;
    }
  } catch { /* JPEG estranho: sem EXIF */ }
  return vazio;
}

function coordenadas(v) {
  if (!v) return null;
  if (typeof v === 'object' && Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lon))) return { lat: Number(v.lat), lon: Number(v.lon) };
  const m = /(-?\d+(?:[.,]\d+)?)\s*[,;]\s*(-?\d+(?:[.,]\d+)?)/.exec(String(v));
  if (!m) return null;
  const lat = Number(m[1].replace(',', '.'));
  const lon = Number(m[2].replace(',', '.'));
  return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

function distanciaM(a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

module.exports = { lerExif, coordenadas, distanciaM };
