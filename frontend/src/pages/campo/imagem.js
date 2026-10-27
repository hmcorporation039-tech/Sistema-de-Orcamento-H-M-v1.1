// Foto reduzida no próprio celular antes de guardar: no máximo 1600 px no maior
// lado, JPEG qualidade ~0,8. Uma foto de 12 MP (4 MB) vira ~300–500 KB — cabe
// muitas no aparelho e sobe rápido no 4G da obra.

export const LADO_MAXIMO = 1600;
export const QUALIDADE_JPEG = 0.8;
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
const LIMITE_SERVIDOR = 8 * 1024 * 1024;

// Dimensões finais mantendo a proporção (nunca aumenta a imagem).
export function calcularDimensoes(largura, altura, maximo = LADO_MAXIMO) {
  const w = Math.max(1, Math.round(Number(largura) || 0));
  const h = Math.max(1, Math.round(Number(altura) || 0));
  const maior = Math.max(w, h);
  if (maior <= maximo) return { largura: w, altura: h, reduziu: false };
  const f = maximo / maior;
  return { largura: Math.max(1, Math.round(w * f)), altura: Math.max(1, Math.round(h * f)), reduziu: true };
}

function carregarImagem(arquivo) {
  // createImageBitmap respeita a orientação do EXIF (foto "deitada" do celular)
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(arquivo, { imageOrientation: 'from-image' })
      .catch(() => createImageBitmap(arquivo));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem.')); };
    img.src = url;
  });
}

function canvasParaBlob(canvas, tipo, qualidade) {
  return new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem.'))), tipo, qualidade);
    } else {
      try {
        const dataUrl = canvas.toDataURL(tipo, qualidade);
        const bin = atob(dataUrl.split(',')[1]);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        resolve(new Blob([bytes], { type: tipo }));
      } catch (e) { reject(e); }
    }
  });
}

// Devolve { bytes: ArrayBuffer, tipo_mime, largura, altura }.
export async function reduzirImagem(arquivo, { maximo = LADO_MAXIMO, qualidade = QUALIDADE_JPEG } = {}) {
  let img;
  try {
    img = await carregarImagem(arquivo);
  } catch {
    img = null;
  }
  if (!img) {
    // Formato que o navegador não abre (ex.: HEIC em navegador sem suporte):
    // guarda o original se o servidor aceitar; senão, avisa.
    if (TIPOS_ACEITOS.includes(arquivo.type) && arquivo.size <= LIMITE_SERVIDOR) {
      return { bytes: await arquivo.arrayBuffer(), tipo_mime: arquivo.type, largura: null, altura: null };
    }
    throw new Error('Formato de imagem não suportado. Use a câmera do app ou uma foto JPEG.');
  }
  const { largura, altura } = calcularDimensoes(img.width, img.height, maximo);
  const canvas = document.createElement('canvas');
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; // PNG com transparência não vira fundo preto no JPEG
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(img, 0, 0, largura, altura);
  if (typeof img.close === 'function') img.close();
  const blob = await canvasParaBlob(canvas, 'image/jpeg', qualidade);
  canvas.width = 0; canvas.height = 0; // libera a memória já (celular com pouca RAM)
  return { bytes: await blob.arrayBuffer(), tipo_mime: 'image/jpeg', largura, altura };
}

// Geolocalização opcional: só em contexto seguro (o navegador nega no HTTP).
// Sem ela — ou se o técnico negar, ou demorar — fica null.
export function obterPosicao(tempoLimite = 4000) {
  return new Promise(resolve => {
    if (typeof window === 'undefined' || !window.isSecureContext || !navigator.geolocation) {
      resolve({ lat: null, lon: null });
      return;
    }
    let feito = false;
    const fim = v => { if (!feito) { feito = true; resolve(v); } };
    const t = setTimeout(() => fim({ lat: null, lon: null }), tempoLimite + 500);
    try {
      navigator.geolocation.getCurrentPosition(
        p => { clearTimeout(t); fim({ lat: Number(p.coords.latitude.toFixed(6)), lon: Number(p.coords.longitude.toFixed(6)) }); },
        () => { clearTimeout(t); fim({ lat: null, lon: null }); },
        { enableHighAccuracy: false, timeout: tempoLimite, maximumAge: 120000 },
      );
    } catch {
      clearTimeout(t);
      fim({ lat: null, lon: null });
    }
  });
}

// Assinatura do canvas → base64 do PNG (sem o prefixo data:), até 300 KB.
export function canvasParaPngBase64(canvas) {
  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

export function tamanhoBase64(b64) {
  const s = String(b64 || '');
  const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  return Math.floor((s.length * 3) / 4) - pad;
}
