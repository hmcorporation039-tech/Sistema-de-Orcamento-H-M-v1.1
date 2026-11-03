// Parte da leitura vetorial de PDF (utils/pdfVetorial.js, que explica o método inteiro):
// passo 3, legenda clássica (símbolo com a descrição à direita) e assinatura dos símbolos.

// meio da linha de texto (o y do texto é a linha de base); usado também pela tabela e pela escala
const meioDoTexto = (t) => t.y - t.h * 0.35;

// ── 3) Legenda ─────────────────────────────────────────────────────────────
const ehDescricao = (s) => s.length >= 5 && (s.match(/[A-Za-zÀ-ú]/g) || []).length >= 4 && !/^(LEGENDA|NOTAS?|OBS|SOBE|DESCE|SIMBOLOGIA|CONVEN[ÇC][ÕO]ES|TABELA DE)\b/i.test(s);

// Índice dos textos por altura (y), montado UMA vez por lista de textos: antes
// cada caminho percorria todos os textos (30 mil caminhos × 8 mil textos = 70 s
// com o servidor travado). O índice só restringe a busca a uma faixa de y; as
// condições e o desempate (o 1º da lista com o menor dx) são os mesmos.
const indicesTextos = new WeakMap();
function primeiroAPartirDe(lista, y) { // 1ª posição com lista[k].y >= y
  let lo = 0, hi = lista.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (lista[m].y < y) lo = m + 1; else hi = m; }
  return lo;
}
function indiceTextos(textos) {
  const pronto = indicesTextos.get(textos);
  if (pronto && pronto.n === textos.length) return pronto;
  const desc = [], horiz = [], foraDaFaixa = [];
  let hMax = 0;
  textos.forEach((t, i) => {
    if (!t.horizontal) return;
    horiz.push({ i, y: t.y });
    if (!ehDescricao(t.s)) return;
    const ty = t.y - t.h * 0.35; // meio da linha de texto (y da tela é a linha de base)
    // y ou altura não finitos: conferidos um a um (mesmo resultado da busca linear)
    if (!Number.isFinite(ty) || !Number.isFinite(t.h)) foraDaFaixa.push(i);
    else { desc.push({ i, y: ty }); if (t.h > hMax) hMax = t.h; }
  });
  desc.sort((a, b) => a.y - b.y || a.i - b.i);
  horiz.sort((a, b) => a.y - b.y || a.i - b.i);
  const ix = { n: textos.length, desc, horiz, foraDaFaixa, hMax, horizFinito: horiz.every(e => Number.isFinite(e.y)) };
  indicesTextos.set(textos, ix);
  return ix;
}

// Linha de texto que fica logo à direita de uma caixa (mesma altura)
function textoAoLado(caixa, textos, distMax = 70) {
  const cy = (caixa[1] + caixa[3]) / 2, h = Math.max(caixa[3] - caixa[1], 3);
  const ix = indiceTextos(textos);
  let melhor = null, melhorI = -1;
  const avaliar = (i) => {
    const t = textos[i];
    const ty = t.y - t.h * 0.35;
    if (Math.abs(ty - cy) > Math.max(h * 0.7, t.h * 0.8)) return;
    const dx = t.x - caixa[2];
    if (dx < -0.5 || dx > distMax) return;
    if (!melhor || dx < melhor.dx || (dx === melhor.dx && i < melhorI)) { melhor = { ...t, dx }; melhorI = i; }
  };
  const raio = Math.max(h * 0.7, ix.hMax * 0.8);
  if (Number.isFinite(cy) && Number.isFinite(raio)) {
    // faixa um pouco mais larga que a condição exata, que é conferida em avaliar()
    const folga = 1e-6 * (1 + Math.abs(cy) + raio);
    for (let k = primeiroAPartirDe(ix.desc, cy - raio - folga); k < ix.desc.length && ix.desc[k].y <= cy + raio + folga; k++) avaliar(ix.desc[k].i);
    ix.foraDaFaixa.forEach(avaliar);
  } else {
    for (let i = 0; i < textos.length; i++) if (textos[i].horizontal && ehDescricao(textos[i].s)) avaliar(i);
  }
  if (!melhor) return null;
  // junta os pedaços da mesma linha (o PDF quebra o texto em trechos)
  const naLinha = (t) => t.horizontal && Math.abs(t.y - melhor.y) < melhor.h * 0.3 && t.x >= melhor.x - 0.5 && t.x < melhor.x + 400;
  const meia = Math.abs(melhor.h * 0.3);
  let linha;
  if (ix.horizFinito && Number.isFinite(melhor.y) && Number.isFinite(meia)) {
    const folga = 1e-6 * (1 + Math.abs(melhor.y) + meia);
    const idx = [];
    for (let k = primeiroAPartirDe(ix.horiz, melhor.y - meia - folga); k < ix.horiz.length && ix.horiz[k].y <= melhor.y + meia + folga; k++) {
      if (naLinha(textos[ix.horiz[k].i])) idx.push(ix.horiz[k].i);
    }
    // mesma ordem do filter + sort estável de antes: por x, empate pela posição na lista
    idx.sort((a, b) => textos[a].x - textos[b].x || a - b);
    linha = idx.map(i => textos[i]);
  } else {
    linha = textos.filter(naLinha).sort((a, b) => a.x - b.x);
  }
  let fimX = melhor.x - 1;
  const partes = [];
  for (const t of linha) { if (t.x - fimX > melhor.h * 2.5) break; partes.push(t.s); fimX = t.x + t.w; }
  return { texto: partes.join(' ').replace(/\s+/g, ' ').trim(), x: melhor.x, y: melhor.y, h: melhor.h };
}

// Título de legenda: "LEGENDA(S)", "SIMBOLOGIA", "CONVENÇÕES" ou "TABELA DE …"
// (TABELA DE TOMADAS, DE ILUMINAÇÃO…) — menos as tabelas que não são legenda
// (cargas, cabos, áreas, revisões, esquadrias, revestimentos, equivalência).
const RE_TITULO_LEGENDA = /^(LEGENDAS?\b|SIMBOLOGIAS?\b|CONVEN[ÇC][ÕO]ES\b|TABELA DE (?!CARGAS?\b|CABOS?\b|[ÁA]REAS?\b|REVIS|CIRCUITOS?\b|ESQUADRIAS?\b|PORTAS\b|JANELAS\b|REVESTIMENTOS?\b|EQUIVAL[ÊE]NCIA\b|ACABAMENTOS?\b|QUADROS?\b))/i;

// Regiões de legenda: abaixo de cada título de legenda, enquanto as entradas
// seguem contíguas (sem vão maior que 150 pt). Sem título não há legenda — nomes
// de sala alinhados na planta pareceriam uma coluna de legenda.
function regioesLegenda(textos, candidatos) {
  const regioes = [];
  for (const titulo of textos.filter(t => RE_TITULO_LEGENDA.test(t.s))) {
    const abaixo = candidatos.filter(c => c.desc.y > titulo.y && c.desc.y < titulo.y + 1000 && Math.abs(c.caixa[0] - titulo.x) < 300)
      .sort((a, b) => a.desc.y - b.desc.y);
    // seções da legenda ("ILUMINAÇÃO", "TOMADAS"…) podem vir bem abaixo: continua
    // se a entrada segue alinhada na mesma coluna de texto
    const seq = [];
    const colunas = [];
    let y = titulo.y;
    for (const c of abaixo) {
      const mesmaColuna = colunas.some(x => Math.abs(c.desc.x - x) < 30);
      if (c.desc.y - y > (mesmaColuna ? 700 : 150)) continue; // fora da coluna e longe: é da planta
      seq.push(c); y = c.desc.y;
      if (!colunas.some(x => Math.abs(c.desc.x - x) < 3)) colunas.push(c.desc.x);
    }
    if (!seq.length) continue;
    const xs = seq.flatMap(c => [c.caixa[0], c.desc.x + 250]), ys = seq.flatMap(c => [c.caixa[1], c.caixa[3], c.desc.y]);
    regioes.push([Math.min(...xs) - 5, titulo.y - titulo.h - 10, Math.max(...xs), Math.max(...ys) + 12]);
  }
  return regioes;
}

const dentroDe = (r, [x0, y0, x1, y1]) => r && x0 >= r[0] && x1 <= r[2] && y0 >= r[1] && y1 <= r[3];
const tocam = (a, b, t = 0.8) => a[0] <= b[2] + t && b[0] <= a[2] + t && a[1] <= b[3] + t && b[1] <= a[3] + t;
// mesmo símbolo, também girado 90° na planta (largura e altura trocadas)
const perto = (x, y) => Math.abs(x - y) <= Math.max(0.8, y * 0.08);
const parecido = (a, b) => a.chave === b.chave && ((perto(a.w, b.w) && perto(a.h, b.h)) || (perto(a.w, b.h) && perto(a.h, b.w)));

// Partes de um símbolo: blocos de OUTRA família (cheio × traço, outra cor ou
// espessura), não maiores que ele, com o centro dentro dele (folga de 1 pt).
function indiceDeCompanheiros(blobs) {
  const lado = 10, grade = new Map();
  for (const b of blobs) {
    const k = Math.floor(b.cx / lado) * 1048576 + Math.floor(b.cy / lado);
    const l = grade.get(k);
    if (l) l.push(b); else grade.set(k, [b]);
  }
  const memo = new Map();
  return (b) => {
    if (memo.has(b)) return memo.get(b);
    const r = [];
    const [x0, y0, x1, y1] = [b.caixa[0] - 1, b.caixa[1] - 1, b.caixa[2] + 1, b.caixa[3] + 1];
    if ([x0, y0, x1, y1].every(Number.isFinite)) {
      for (let gx = Math.floor(x0 / lado); gx <= Math.floor(x1 / lado); gx++) {
        for (let gy = Math.floor(y0 / lado); gy <= Math.floor(y1 / lado); gy++) {
          for (const o of grade.get(gx * 1048576 + gy) || []) {
            if (o === b || o.chave === b.chave || o.w * o.h > b.w * b.h * 1.1) continue;
            if (o.cx >= x0 && o.cx <= x1 && o.cy >= y0 && o.cy <= y1) r.push({ chave: o.chave, w: o.w, h: o.h, d: Math.hypot(o.cx - b.cx, o.cy - b.cy) });
          }
        }
      }
    }
    memo.set(b, r);
    return r;
  };
}
// Faixa: retângulo fino alinhado aos eixos (cheio, ou contorno fechado) — perfil
// de LED, trilho. { familia, T (espessura), L (comprimento) } ou null.
function faixaDe(c) {
  const w = c.caixa[2] - c.caixa[0], h = c.caixa[3] - c.caixa[1];
  const T = Math.min(w, h), L = Math.max(w, h);
  if (!(T > 0.3 && T <= 3 && L >= 8 && L >= 4 * T && c.segs <= 8)) return null;
  // contorno fechado: perímetro ≈ 2 (L + T) (o CAD às vezes passa o contorno duas vezes)
  if (c.comp < 1.8 * (L + T) || c.comp > 4.4 * (L + T)) return null;
  return { familia: c.cheio ? `F${c.fill}` : `S${c.stroke}|${c.lw}`, T, L };
}
// toda parte da referência tem uma parecida (mesma família, tamanho, distância ao centro) no candidato
const partesCasam = (ref, cand) => ref.comps.every(p => cand.comps.some(q => parecido(p, q) && Math.abs(p.d - q.d) <= Math.max(1, 0.15 * Math.max(ref.blob.w, ref.blob.h))));
const mesmaAssinatura = (a, b) => parecido(a.blob, b.blob) && a.comps.length === b.comps.length && partesCasam(a, b) && partesCasam(b, a);

// Descrição completa: a 1ª linha e as linhas logo abaixo, alinhadas à esquerda,
// até a próxima entrada da legenda
function descricaoCompleta(entrada, textos, inicios) {
  const partes = [entrada.desc.texto];
  let y = entrada.desc.y;
  const coluna = textos.filter(t => t.horizontal && Math.abs(t.x - entrada.desc.x) < entrada.desc.h && t.y > y).sort((a, b) => a.y - b.y);
  for (const t of coluna) {
    if (t.y - y > entrada.desc.h * 1.7 || inicios.has(Math.round(t.y))) break;
    const linha = textoAoLado([t.x - 1, t.y - t.h * 0.6, t.x - 0.6, t.y - t.h * 0.1], textos, 2);
    partes.push(linha?.texto || t.s);
    y = t.y;
    if (partes.length >= 6) break;
  }
  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

module.exports = {
  ehDescricao, meioDoTexto, textoAoLado, regioesLegenda, descricaoCompleta,
  dentroDe, tocam, parecido, indiceDeCompanheiros, faixaDe, partesCasam, mesmaAssinatura,
};