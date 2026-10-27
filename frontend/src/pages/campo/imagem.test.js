import { calcularDimensoes, tamanhoBase64, reduzirImagem } from './imagem';

test('reduz para no máximo 1600 px no maior lado, mantendo a proporção', () => {
  expect(calcularDimensoes(4000, 3000)).toEqual({ largura: 1600, altura: 1200, reduziu: true });
  expect(calcularDimensoes(3000, 4000)).toEqual({ largura: 1200, altura: 1600, reduziu: true });
  expect(calcularDimensoes(4032, 1816)).toEqual({ largura: 1600, altura: 721, reduziu: true });
  expect(calcularDimensoes(1200, 900)).toEqual({ largura: 1200, altura: 900, reduziu: false }); // nunca aumenta
  expect(calcularDimensoes(0, 0)).toEqual({ largura: 1, altura: 1, reduziu: false });
});

test('tamanho do PNG em base64', () => {
  expect(tamanhoBase64(btoa('abc'))).toBe(3);
  expect(tamanhoBase64(btoa('abcd'))).toBe(4);
  expect(tamanhoBase64(btoa('abcde'))).toBe(5);
});

// jsdom não decodifica imagem: sem leitura possível, guarda o original quando
// o servidor aceitaria (JPEG/PNG/WebP até 8 MB) e recusa o resto.
test('sem decodificador: guarda o original aceito; recusa formato desconhecido', async () => {
  const original = global.createImageBitmap;
  global.createImageBitmap = () => Promise.reject(new Error('não decodifica'));
  try {
    const jpeg = new Blob([new Uint8Array([255, 216, 255, 224])], { type: 'image/jpeg' });
    if (!jpeg.arrayBuffer) jpeg.arrayBuffer = () => Promise.resolve(new Uint8Array([255, 216, 255, 224]).buffer);
    const r = await reduzirImagem(jpeg);
    expect(r.tipo_mime).toBe('image/jpeg');
    expect(r.bytes.byteLength).toBe(4);
    const heic = new Blob([new Uint8Array([0, 0, 0])], { type: 'image/heic' });
    await expect(reduzirImagem(heic)).rejects.toThrow(/não suportado/);
  } finally {
    global.createImageBitmap = original;
  }
});
