// Foto JPEG de teste (48 × 36 px, gerada para os testes) com EXIF montado na
// hora: data/hora original e GPS. Usada pelos testes do leitor de EXIF e do
// relatório fotográfico do laudo de SPDA e aterramento — sem foto real de obra
// no repositório.

const JPEG_BASE64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAkADADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDW1HUbTSbCS+vpfKt4sb32lsZIA4AJ6kVg/wDCxPCv/QV/8l5f/iaPiJ/yImpf9sv/AEaleD181l+X0sTSc5t3vbT5eR6FevKnKyPeP+FieFf+gr/5Ly//ABNH/CxPCv8A0Ff/ACXl/wDia8Horu/sah3f4f5GP1ufZHvH/CxPCv8A0Ff/ACXl/wDia3tO1G01awjvrGXzbeXOx9pXOCQeCAeoNfNNe8fDv/kRNN/7a/8Ao164cwy+lhqSnBu97a/PyNqFeVSVmHxE/wCRE1L/ALZf+jUrwevoLxnp13q3hO+sbGLzbiXy9ibgucSKTySB0BryX/hXfir/AKBX/kxF/wDFV1ZTXpU6DU5JO/V+SM8VCUpppdDl6K6j/hXfir/oFf8AkxF/8VR/wrvxV/0Cv/JiL/4qvT+tUP5196Ob2U+zOXr3j4d/8iJpv/bX/wBGvXl//Cu/FX/QK/8AJiL/AOKr1rwZp13pPhOxsb6LyriLzN6bg2MyMRyCR0IrzM2r0qlBKEk3fo/JnThYSjNtrob1FFFfPHeFFFFABRRRQB//2Q==';

function ascii(texto) {
  return Buffer.from(`${texto}\0`, 'latin1');
}

// TIFF big-endian: IFD0 (ponteiros EXIF e GPS) → IFD EXIF (DateTimeOriginal) → IFD GPS
function tiffExif({ dataHora, lat, lon }) {
  const buf = Buffer.alloc(178);
  buf.write('MM', 0, 'latin1'); buf.writeUInt16BE(42, 2); buf.writeUInt32BE(8, 4);
  const entrada = (pos, tag, tipo, qtd, valor) => { buf.writeUInt16BE(tag, pos); buf.writeUInt16BE(tipo, pos + 2); buf.writeUInt32BE(qtd, pos + 4); buf.writeUInt32BE(valor, pos + 8); };
  buf.writeUInt16BE(2, 8); entrada(10, 0x8769, 4, 1, 38); entrada(22, 0x8825, 4, 1, 76); buf.writeUInt32BE(0, 34);
  buf.writeUInt16BE(1, 38); entrada(40, 0x9003, 2, 20, 56); buf.writeUInt32BE(0, 52);
  ascii(dataHora.replace(/-/g, ':').replace('T', ' ')).copy(buf, 56);
  buf.writeUInt16BE(4, 76);
  const ref = (pos, tag, letra) => { buf.writeUInt16BE(tag, pos); buf.writeUInt16BE(2, pos + 2); buf.writeUInt32BE(2, pos + 4); buf.write(letra, pos + 8, 'latin1'); };
  ref(78, 1, lat < 0 ? 'S' : 'N'); entrada(90, 2, 5, 3, 130); ref(102, 3, lon < 0 ? 'W' : 'E'); entrada(114, 4, 5, 3, 154); buf.writeUInt32BE(0, 126);
  const racionais = (pos, graus) => {
    const g = Math.abs(graus); const d = Math.floor(g); const m = Math.floor((g - d) * 60); const s = Math.round(((g - d) * 60 - m) * 60 * 1000);
    [[d, 1], [m, 1], [s, 1000]].forEach(([n, den], k) => { buf.writeUInt32BE(n, pos + k * 8); buf.writeUInt32BE(den, pos + k * 8 + 4); });
  };
  racionais(130, lat); racionais(154, lon);
  return buf;
}

// JPEG com EXIF (sem opções: JPEG sem EXIF)
function jpegTeste(exif) {
  const jpeg = Buffer.from(JPEG_BASE64, 'base64');
  if (!exif) return jpeg;
  const tiff = tiffExif(exif);
  const app1 = Buffer.alloc(4 + 6 + tiff.length);
  app1.writeUInt16BE(0xffe1, 0); app1.writeUInt16BE(2 + 6 + tiff.length, 2);
  app1.write('Exif\0\0', 4, 'latin1'); tiff.copy(app1, 10);
  return Buffer.concat([jpeg.slice(0, 2), app1, jpeg.slice(2)]);
}

module.exports = { jpegTeste };
