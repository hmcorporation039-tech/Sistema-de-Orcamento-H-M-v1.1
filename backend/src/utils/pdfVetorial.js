// Leitura VETORIAL de prancha em PDF (exportada do AutoCAD/Revit): conta os
// símbolos e mede as linhas (eletrodutos, cabos, eletrocalhas) direto da
// geometria, sem OCR e sem IA.
//
// Como funciona:
//   1) percorre a lista de operadores do pdfjs acompanhando a matriz (CTM),
//      cores, espessura e tracejado — cada caminho vira uma caixa + comprimento;
//   2) caminhos pequenos que se tocam, da mesma cor, viram um "símbolo" (o CAD
//      exporta um círculo cheio como várias faixas: a união reconstrói o símbolo);
//   3) a LEGENDA dá o nome: cada símbolo/traço da legenda tem a descrição escrita
//      logo à direita. A amostra da legenda define a assinatura (cor + tamanho +
//      tipo) e as ocorrências fora da legenda são contadas; o traço da legenda
//      define o estilo de linha (cor + espessura + tracejado) e o comprimento total
//      desse estilo vira metros pela escala do carimbo (ESC. 1:50) — ou, na folha
//      com vistas em escalas diferentes, pela escala de cada vista (3c);
//   4) legenda em TABELA ("Símbolo | Fornecedor | Descrição | QTDE"): lida pelas
//      colunas do cabeçalho; a QTDE do projetista vai no item (qtde_projeto) (3b);
//   5) a leitura roda numa thread à parte, com tempo-limite por página (5).
// Limites: símbolo desenhado só com linhas da mesma cor dos fios pode juntar
// com o fio; linha tracejada "explodida" em traços soma só os traços (sem os
// vazios). Os números são para conferência — não substituem a lista de materiais.

const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const hex = (a) => (typeof a?.[0] === 'string' ? a[0] : `#${[...(a || [])].map(v => Math.round(+v).toString(16).padStart(2, '0')).join('')}`).toLowerCase();

let pdfjsCarregado = null;
const pdfjs = () => (pdfjsCarregado ||= import('pdfjs-dist/legacy/build/pdf.mjs'));

// ── 1) Geometria e textos de uma página ────────────────────────────────────
// `geometria`: cada caminho leva também os trechos (subs: [{ segs, fechado }],
// seg = ['l', a, b] ou ['c', p0, c1, c2, p3] em pontos da página) e a espessura
// na página (lwPg) — usado pela conversão PDF → DXF (services/pdfParaDxf.js).
// `ops`: lista de operadores já lida (quem chamou já contou os traços).
// `prazo` (Date.now() limite, opcional): passou, para com erro TEMPO_ESGOTADO.
async function lerPagina(pagina, OPS, { geometria = false, ops: opsLidos = null, prazo = null } = {}) {
  const relogio = cronometro(prazo);
  const vp = pagina.getViewport({ scale: 1 });
  const ops = opsLidos || await pagina.getOperatorList();
  const FILL = new Set([OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  const STROKE = new Set([OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  let st = { ctm: vp.transform.slice(), fill: '#000000', stroke: '#000000', lw: 1, dash: '' };
  const pilha = [];
  const caminhos = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    relogio();
    const fn = ops.fnArray[i], a = ops.argsArray[i];
    switch (fn) {
      case OPS.save: pilha.push({ ...st, ctm: st.ctm.slice() }); break;
      case OPS.restore: st = pilha.pop() || st; break;
      case OPS.transform: st.ctm = mul(st.ctm, a); break;
      case OPS.paintFormXObjectBegin: pilha.push({ ...st, ctm: st.ctm.slice() }); if (a?.[0]) st.ctm = mul(st.ctm, a[0]); break;
      case OPS.paintFormXObjectEnd: st = pilha.pop() || st; break;
      case OPS.setFillRGBColor: st.fill = hex(a); break;
      case OPS.setStrokeRGBColor: st.stroke = hex(a); break;
      case OPS.setLineWidth: st.lw = a[0]; break;
      case OPS.setDash: st.dash = (a[0] || []).map(v => Math.round(v * 10) / 10).join(','); break;
      case OPS.constructPath: {
        const pintura = a[0];
        const d = a[1]?.[0];
        if (!d || typeof d.length !== 'number') break;
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, comp = 0, segs = 0;
        let cx = 0, cy = 0, sx = 0, sy = 0, ini = null, fim = null;
        const ponto = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
        const subs = geometria ? [] : null;
        let sub = null;
        for (let k = 0; k < d.length;) {
          const o = d[k++];
          if (o === 0) {
            [cx, cy] = ap(st.ctm, d[k++], d[k++]); sx = cx; sy = cy; ini ||= [cx, cy]; ponto(cx, cy);
            if (subs) { sub = { segs: [], fechado: false }; subs.push(sub); }
          } else if (o === 1 || o === 2) {
            const c1 = o === 2 ? ap(st.ctm, d[k++], d[k++]) : null;
            const c2 = o === 2 ? ap(st.ctm, d[k++], d[k++]) : null;
            const [x, y] = ap(st.ctm, d[k++], d[k++]);
            if (sub) sub.segs.push(o === 2 ? ['c', [cx, cy], c1, c2, [x, y]] : ['l', [cx, cy], [x, y]]);
            comp += Math.hypot(x - cx, y - cy); cx = x; cy = y; segs++; ponto(x, y); fim = [x, y];
          } else if (o === 3) {
            if (sub) { if (Math.hypot(sx - cx, sy - cy) > 1e-6) sub.segs.push(['l', [cx, cy], [sx, sy]]); sub.fechado = true; }
            comp += Math.hypot(sx - cx, sy - cy); cx = sx; cy = sy; segs++;
          } else break;
        }
        if (!Number.isFinite(x0)) break;
        const cheio = FILL.has(pintura), traco = STROKE.has(pintura);
        if (!cheio && !traco) break;
        // reta: um segmento só (ou caminho cujo comprimento ≈ distância das pontas)
        const reto = !!(ini && fim) && Math.abs(Math.hypot(fim[0] - ini[0], fim[1] - ini[1]) - comp) < 0.5;
        const c = { cheio, traco, fill: st.fill, stroke: st.stroke, lw: +(+st.lw).toFixed(2), dash: st.dash, caixa: [x0, y0, x1, y1], comp, segs, reto };
        if (subs) Object.assign(c, { subs: subs.filter(s => s.segs.length), lwPg: (+st.lw || 0) * Math.sqrt(Math.abs(st.ctm[0] * st.ctm[3] - st.ctm[1] * st.ctm[2])) });
        caminhos.push(c);
        break;
      }
      default: break;
    }
  }
  const tc = await pagina.getTextContent();
  const textos = tc.items.filter(t => t.str && t.str.trim()).map(t => {
    const m = mul(vp.transform, t.transform);
    const h = Math.hypot(m[2], m[3]) || 1;
    return { s: t.str.trim(), x: m[4], y: m[5], h, w: t.width || t.str.length * h * 0.5, horizontal: Math.abs(m[1]) < 1e-3 };
  });
  return { largura: vp.width, altura: vp.height, caminhos, textos, operadores: ops.fnArray.length };
}

// Tempo-limite cooperativo: `prazo` é um Date.now() limite. Devolve uma função
// barata de chamar dentro dos laços (olha o relógio a cada 1024 chamadas); passou
// do prazo, lança erro com codigo TEMPO_ESGOTADO (a página fica de fora, com aviso).
function erroDeTempo() { return Object.assign(new Error('tempo-limite da página esgotado'), { codigo: 'TEMPO_ESGOTADO' }); }
function cronometro(prazo) {
  if (!prazo) return () => {};
  let n = 0;
  return () => { if ((++n & 1023) === 0 && Date.now() > prazo) throw erroDeTempo(); };
}

// União-busca ITERATIVA (com compressão de caminho e união por tamanho). A versão
// recursiva estourava a pilha (RangeError) com ~20 mil traços encadeados — um
// eletroduto picado em segmentos — e o erro sumia no .catch da análise.
function uniaoBusca(n) {
  const pai = new Int32Array(n), tam = new Int32Array(n).fill(1);
  for (let i = 0; i < n; i++) pai[i] = i;
  const raiz = (i) => {
    let r = i;
    while (pai[r] !== r) r = pai[r];
    while (pai[i] !== r) { const p = pai[i]; pai[i] = r; i = p; }
    return r;
  };
  const unir = (a, b) => {
    a = raiz(a); b = raiz(b);
    if (a === b) return;
    if (tam[a] < tam[b]) { const t = a; a = b; b = t; }
    pai[b] = a; tam[a] += tam[b];
  };
  return { raiz, unir };
}

// ── 2) Símbolos: união de caminhos pequenos da mesma cor que se tocam ─────
// Os pares candidatos saem de uma grade FINA (célula de ~5 pt): cada caminho
// entra em todas as células que a caixa dele (alargada pela tolerância) cobre, e
// o par é testado uma vez só, na 1ª célula comum. A grade antiga (célula do
// tamanho do maior símbolo, 41 pt) ficava quadrática com hachura e texto
// explodido em traços: prancha real com 4,5 mil traços numa célula levava 47 s
// (29/10/2026). O teste de "tocar" é o mesmo, no mesmo sentido (A = o de menor x
// inicial; empate, o que vem antes na lista), e os grupos não dependem da ordem
// das uniões: o resultado é idêntico ao da versão anterior.
// `prazo` (Date.now() limite, opcional): passou dele, para com erro TEMPO_ESGOTADO.
function simbolos(caminhos, { tamanhoMax = 40, tolerancia = 0.6, prazo = null } = {}) {
  const grupos = new Map();
  caminhos.forEach((c) => {
    const [x0, y0, x1, y1] = c.caixa;
    if (x1 - x0 > tamanhoMax || y1 - y0 > tamanhoMax) return;
    // preenchido e traçado são famílias diferentes (um símbolo vazado não junta com o cheio)
    // traçado também separa pela espessura: o fio/eletroduto da mesma cor (mais grosso) não gruda no símbolo
    const chave = c.cheio ? `F${c.fill}` : `S${c.stroke}|${c.lw}`;
    (grupos.get(chave) || grupos.set(chave, []).get(chave)).push(c);
  });
  const blobs = [];
  const tol = Math.abs(tolerancia);
  const meia = tol / 2 + 0.01; // folga contra arredondamento: a grade só escolhe candidatos, o teste é o exato
  const lado = Math.max(2, (tamanhoMax + tol) / 8);
  const relogio = cronometro(prazo);
  for (const [chave, lista] of grupos) {
    const { raiz, unir } = uniaoBusca(lista.length);
    // faixa de células de cada caminho (caixa alargada por meia tolerância de cada lado)
    const gx0 = new Int32Array(lista.length), gy0 = new Int32Array(lista.length), gx1 = new Int32Array(lista.length), gy1 = new Int32Array(lista.length);
    const celulas = new Map();
    lista.forEach((c, i) => {
      gx0[i] = Math.floor((c.caixa[0] - meia) / lado); gy0[i] = Math.floor((c.caixa[1] - meia) / lado);
      gx1[i] = Math.floor((c.caixa[2] + meia) / lado); gy1[i] = Math.floor((c.caixa[3] + meia) / lado);
      // coordenada não finita (o teste exato também nunca uniria): fora da grade
      if (!(gx1[i] - gx0[i] < 1e4 && gy1[i] - gy0[i] < 1e4)) return;
      for (let gx = gx0[i]; gx <= gx1[i]; gx++) {
        for (let gy = gy0[i]; gy <= gy1[i]; gy++) {
          const k = gx * 1048576 + gy;
          const l = celulas.get(k);
          if (l) l.push(i); else celulas.set(k, [i]);
        }
      }
    });
    for (const [k, idx] of celulas) {
      if (idx.length < 2) continue;
      for (let a = 0; a < idx.length; a++) {
        relogio();
        const i = idx[a];
        for (let b = a + 1; b < idx.length; b++) {
          const j = idx[b];
          // o par só é testado na 1ª célula comum (canto da interseção das faixas)
          if (Math.max(gx0[i], gx0[j]) * 1048576 + Math.max(gy0[i], gy0[j]) !== k) continue;
          const [p, q] = i < j ? [i, j] : [j, i];
          // A = menor x inicial (empate: o de menor índice), como na varredura antiga
          const [A, B] = lista[q].caixa[0] < lista[p].caixa[0] ? [lista[q].caixa, lista[p].caixa] : [lista[p].caixa, lista[q].caixa];
          if (B[0] > A[2] + tolerancia) continue;
          if (B[1] <= A[3] + tolerancia && B[3] >= A[1] - tolerancia) unir(p, q);
        }
      }
    }
    const porRaiz = new Map();
    lista.forEach((c, i) => {
      const r = raiz(i);
      const b = porRaiz.get(r) || { chave, caixa: [Infinity, Infinity, -Infinity, -Infinity], n: 0 };
      b.caixa = [Math.min(b.caixa[0], c.caixa[0]), Math.min(b.caixa[1], c.caixa[1]), Math.max(b.caixa[2], c.caixa[2]), Math.max(b.caixa[3], c.caixa[3])];
      b.n++;
      porRaiz.set(r, b);
    });
    for (const b of porRaiz.values()) {
      const w = b.caixa[2] - b.caixa[0], h = b.caixa[3] - b.caixa[1];
      // grande demais para símbolo depois da união (fio picado em segmentos),
      // pequeno demais (ponto) ou reto (traço solto, sem área)
      if (w > tamanhoMax * 1.5 || h > tamanhoMax * 1.5 || Math.max(w, h) < 1.5 || Math.min(w, h) < 1) continue;
      blobs.push({ ...b, w, h, cx: (b.caixa[0] + b.caixa[2]) / 2, cy: (b.caixa[1] + b.caixa[3]) / 2 });
    }
  }
  return blobs;
}

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

// Escala do carimbo: "ESC. 1:50", "ESCALA 1/75" ou o "1:75" solto perto de
// um "ESCALA:" (o CAD separa em dois textos). A mais frequente; "SEM ESCALA" não conta.
function escalaDoCarimbo(textos) {
  const cont = {};
  const somar = (v, peso = 1) => { if (v >= 10 && v <= 2000) cont[v] = (cont[v] || 0) + peso; };
  for (const t of textos) {
    const m = t.s.match(/ESC(?:ALA)?\.?\s*[:=]?\s*1\s*[:/]\s*(\d{2,4})\b/i);
    if (m) { somar(+m[1], 2); continue; }
    const solto = t.s.match(/^1\s*[:/]\s*(\d{2,4})$/);
    if (solto && textos.some(e => /^ESC(ALA)?\b/i.test(e.s) && !/SEM ESCALA/i.test(e.s) && Math.hypot(e.x - t.x, e.y - t.y) < 200)) somar(+solto[1]);
  }
  const melhor = Object.entries(cont).sort((a, b) => b[1] - a[1])[0];
  return melhor ? Number(melhor[0]) : null;
}

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

// ── 3b) Legenda em TABELA ──────────────────────────────────────────────────
// "Símbolo | Fornecedor | Descrição | QTDE" (luminotécnico), "SÍMBOLO | TIPO |
// MODELO | QNT | USO" (tomadas), "CIRCUITO | SÍMBOLO | ESPECIFICAÇÃO | … | QNT".
// O texto logo à direita do símbolo é o da coluna vizinha (a marca), não a
// descrição: um luminotécnico real com 21 tipos virou 5 itens com o nome do
// fornecedor (29/10/2026). Aqui o cabeçalho diz qual coluna é qual, as linhas da
// tabela (ou, sem elas, a coluna de quantidade) separam as linhas e cada linha
// dá UMA entrada: símbolo + descrição + a quantidade que o projetista escreveu.
const RE_COL_SIMBOLO = /^S[ÍI]MB(OLOS?|\.)$/i;
const RE_COL_DESCRICAO = /^(DESCRI[ÇC][ÃA]O|ESPECIFICA[ÇC][ÃA]O|DISCRIMINA[ÇC][ÃA]O)\b/i;
const RE_COL_TIPO = /^(TIPO|MODELO|ITEM|EQUIPAMENTO|LUMIN[ÁA]RIA|PRODUTO)\b/i;
const RE_COL_QTD = /^(QTDE?|QTD|QUANT(IDADE)?|QNT|QUANTID)\.?:?$/i;
const RE_COL_FORNECEDOR = /^(FORNECEDOR|FABRICANTE|MARCA)\b/i;
const RE_NUMERO = /^\d{1,5}(?:,\d+)?$/;
const meioDoTexto = (t) => t.y - t.h * 0.35;

// linhas (réguas) retas da página: verticais e horizontais, para as colunas e linhas da tabela
function reguasDaPagina(caminhos) {
  const v = [], h = [];
  for (const c of caminhos) {
    if (!c.reto && !(c.cheio && c.segs <= 5)) continue;
    const [x0, y0, x1, y1] = c.caixa;
    if (x1 - x0 < 1.2 && y1 - y0 > 8) v.push(c.caixa);
    else if (y1 - y0 < 1.2 && x1 - x0 > 30) h.push(c.caixa);
  }
  return { v, h };
}

function tabelasDeLegenda(textos, caminhos, blobs) {
  const tabelas = [];
  const horiz = textos.filter(t => t.horizontal);
  let reguas = null;
  for (const s of horiz) {
    if (!RE_COL_SIMBOLO.test(s.s.trim())) continue;
    if (tabelas.some(t => dentroDe(t.caixa, [s.x, s.y - s.h, s.x + s.w, s.y]))) continue;
    // células do cabeçalho: textos da mesma linha, contíguos ao "Símbolo" (vão < 350 pt)
    const linha = horiz.filter(t => Math.abs(meioDoTexto(t) - meioDoTexto(s)) < Math.max(s.h, t.h) * 0.6).sort((a, b) => a.x - b.x);
    let ini = linha.indexOf(s), fim = ini;
    while (ini > 0 && linha[ini].x - (linha[ini - 1].x + linha[ini - 1].w) < 350) ini--;
    while (fim < linha.length - 1 && linha[fim + 1].x - (linha[fim].x + linha[fim].w) < 350) fim++;
    const cel = linha.slice(ini, fim + 1);
    if (!cel.some(c => RE_COL_DESCRICAO.test(c.s) || RE_COL_TIPO.test(c.s))) continue;
    reguas ||= reguasDaPagina(caminhos);
    const hy = meioDoTexto(s);
    const verticais = reguas.v.filter(r => r[1] <= hy + 1 && r[3] >= hy - 1).map(r => r[0]).sort((a, b) => a - b);
    const reguaEntre = (a, b) => verticais.find(x => x > a - 1 && x < b + 1);
    // colunas: borda esquerda = régua vertical entre os títulos ou, sem ela, o fim do título anterior
    const colunas = cel.map((c, k) => {
      const esq = k === 0
        ? (verticais.filter(x => x < c.x + 1 && x > c.x - 150).pop() ?? c.x - 60)
        : (reguaEntre(cel[k - 1].x + cel[k - 1].w, c.x) ?? cel[k - 1].x + cel[k - 1].w + 0.5);
      return { texto: c.s.trim(), esq };
    });
    const ultima = cel[cel.length - 1];
    colunas.forEach((c, k) => { c.dir = k < colunas.length - 1 ? colunas[k + 1].esq : (verticais.find(x => x > ultima.x + ultima.w - 1 && x < ultima.x + ultima.w + 150) ?? ultima.x + ultima.w + Math.max(60, ultima.w)); });
    const colSimb = colunas[cel.indexOf(s)];
    const colDesc = colunas.filter(c => RE_COL_DESCRICAO.test(c.texto));
    const colTexto = colDesc.length ? colDesc : colunas.filter(c => RE_COL_TIPO.test(c.texto));
    const colQtd = colunas.find(c => RE_COL_QTD.test(c.texto)) || null;
    const colForn = colunas.find(c => RE_COL_FORNECEDOR.test(c.texto)) || null;
    const esqT = colunas[0].esq, dirT = colunas[colunas.length - 1].dir;
    const naTabela = (t) => t.x >= esqT - 0.5 && t.x < dirT;
    const daColuna = (col, t) => t.x >= col.esq - 0.5 && t.x < col.dir - 0.5;
    const topoCab = s.y - s.h * 1.2;

    // linhas da tabela: réguas horizontais que atravessam do símbolo à descrição
    const xDesc = colTexto[0].esq;
    const ys = reguas.h.filter(r => r[0] <= colSimb.esq + (colSimb.dir - colSimb.esq) * 0.5 && r[2] >= xDesc + 5 && r[1] > hy - s.h * 0.3)
      .map(r => (r[1] + r[3]) / 2).sort((a, b) => a - b)
      .filter((y, i, l) => i === 0 || y - l[i - 1] > 1);
    let faixas = [];
    if (ys.length >= 2 && ys[0] < s.y + s.h * 4) {
      const passoMax = Math.max(s.h * 15, 60);
      const passos = [];
      for (let i = 1; i < ys.length; i++) {
        const g = ys[i] - ys[i - 1];
        const med = passos.length ? [...passos].sort((a, b) => a - b)[passos.length >> 1] : null;
        if (g > passoMax || (med && g > med * 4)) break; // vão grande: acabou a tabela
        const temTexto = horiz.some(t => { const m = meioDoTexto(t); return m > ys[i - 1] && m < ys[i] && naTabela(t); });
        if (!temTexto && passos.length) break; // linha vazia depois das linhas: fim da tabela
        if (temTexto) { faixas.push([ys[i - 1], ys[i]]); passos.push(g); }
      }
    }
    if (!faixas.length) {
      // sem réguas: cada número da coluna de quantidade (ou cada símbolo) marca uma linha
      const ancoras = (colQtd
        ? horiz.filter(t => daColuna(colQtd, t) && RE_NUMERO.test(t.s.trim()) && t.y > s.y).map(meioDoTexto)
        : blobs.filter(b => b.cx >= colSimb.esq && b.cx < colSimb.dir && b.cy > s.y).map(b => b.cy))
        .sort((a, b) => a - b).filter((y, i, l) => i === 0 || y - l[i - 1] > 2);
      const lista = [];
      for (const y of ancoras) { if (lista.length ? y - lista[lista.length - 1] > Math.max(s.h * 8, 60) : y - s.y > Math.max(s.h * 8, 60)) break; lista.push(y); }
      const passo = lista.length > 1 ? (lista[lista.length - 1] - lista[0]) / (lista.length - 1) : s.h * 2;
      faixas = lista.map((y, i) => [i ? (lista[i - 1] + y) / 2 : Math.max(s.y + s.h * 0.2, y - passo / 2), i < lista.length - 1 ? (y + lista[i + 1]) / 2 : y + passo / 2]);
    }
    if (!faixas.length) continue;
    const fundo = faixas[faixas.length - 1][1];
    const caixa = [esqT - 2, topoCab - 2, dirT + 2, fundo + 2];
    const juntar = (lista) => lista.sort((a, b) => (Math.abs(a.y - b.y) < a.h * 0.3 ? a.x - b.x : a.y - b.y)).map(t => t.s).join(' ').replace(/\s+/g, ' ').trim();
    const entradas = [], semSimbolo = [];
    for (const [y0, y1] of faixas) {
      const dentro = horiz.filter(t => { const m = meioDoTexto(t); return m > y0 && m < y1 && naTabela(t); });
      const texto = colTexto.map(c => juntar(dentro.filter(t => daColuna(c, t)))).filter(Boolean).join(' — ');
      if (!texto) continue;
      const qtdTxt = colQtd ? dentro.filter(t => daColuna(colQtd, t) && RE_NUMERO.test(t.s.trim()))[0] : null;
      const qtde = qtdTxt ? Number(qtdTxt.s.trim().replace(',', '.')) : null;
      const fornecedor = colForn ? juntar(dentro.filter(t => daColuna(colForn, t))) || null : null;
      const codigo = dentro.find(t => daColuna(colSimb, t) && /^\d{1,3}$/.test(t.s.trim()))?.s.trim() || null;
      const dentroDaCelula = (cx, cy, cx0, cx1) => cy > y0 && cy < y1 && cx0 > colSimb.esq + 0.3 && cx1 < colSimb.dir - 0.3;
      // o número da linha ("01", "02"…) pode vir desenhado em traços no canto da
      // célula: o símbolo é o que fica sob o título "Símbolo" (coluna estreita: a célula toda)
      const larg = colSimb.dir - colSimb.esq, centro = s.x + s.w / 2;
      const bs = blobs.filter(b => dentroDaCelula(b.cx, b.cy, b.caixa[0], b.caixa[2]) && (larg < 30 || Math.abs(b.cx - centro) < larg * 0.25))
        .sort((a, b) => b.w * b.h - a.w * a.h);
      const ls = caminhos.filter(c => c.traco && c.reto && c.comp >= 6 && dentroDaCelula((c.caixa[0] + c.caixa[2]) / 2, (c.caixa[1] + c.caixa[3]) / 2, c.caixa[0], c.caixa[2])).sort((a, b) => b.comp - a.comp);
      const desc = { texto, x: xDesc, y: y0, h: s.h };
      const extra = { texto, qtde, fornecedor, codigo, daTabela: true };
      const b = bs[0], l = ls[0];
      // perfil/trilho desenhado como faixa fina (retângulo cheio ou contorno fechado)
      const f = !l && !b ? caminhos.filter(c => faixaDe(c) && dentroDaCelula((c.caixa[0] + c.caixa[2]) / 2, (c.caixa[1] + c.caixa[3]) / 2, c.caixa[0], c.caixa[2])).sort((a, b) => faixaDe(b).L - faixaDe(a).L)[0] : null;
      if (l && (!b || l.comp > 2 * Math.max(b.w, b.h))) {
        entradas.push({ tipo: 'linha', caixa: l.caixa, desc, estilo: `${l.stroke}|${l.lw}|${l.dash}`, cor: l.stroke, lw: l.lw, dash: l.dash, ...extra });
      } else if (f) {
        const { familia, T } = faixaDe(f);
        entradas.push({ tipo: 'linha', caixa: f.caixa, desc, estilo: `faixa|${familia}|${T.toFixed(1)}`, cor: f.cheio ? f.fill : f.stroke, lw: +T.toFixed(1), dash: '', faixa: true, ...extra });
      } else if (b) {
        entradas.push({ tipo: 'simbolo', caixa: b.caixa, desc, blob: b, ...extra });
      } else {
        semSimbolo.push({ descricao: texto, qtde_projeto: qtde, ...(codigo ? { codigo } : {}), motivo: 'símbolo da tabela não reconhecido (traço longo ou desenho composto)' });
      }
    }
    tabelas.push({ caixa, entradas, semSimbolo, colunas: colunas.map(c => c.texto) });
  }
  return tabelas;
}

// ── 3c) Escala por vista ─────────────────────────────────────────────────────
// Uma folha pode ter vistas em escalas diferentes (planta 1:50 + ampliação 1:25,
// detalhe 1:15…). Rótulos de escala: "ESC. 1:50", "ESCALA 1/75", o "1:50" solto
// do título da vista e "SEM ESCALA". Cada vista da folha (regiões do classificador)
// fica com o rótulo mais próximo; a linha medida usa a escala da vista onde está.
const PT_PARA_M = 25.4 / 72 / 1000;
function rotulosDeEscala(textos) {
  const rot = [];
  const valores = (s) => [...s.matchAll(/1\s*[:/]\s*(\d{1,4})\b/g)].map(m => +m[1]).filter(v => v >= 1 && v <= 2000);
  for (const t of textos) {
    const s = t.s.trim();
    const base = { x: t.x + t.w / 2, y: meioDoTexto(t), texto: t };
    if (/SEM\s+ESCALA|S\/\s*ESCALA|FORA DE ESCALA/i.test(s)) { rot.push({ ...base, valores: [0] }); continue; }
    const m = s.match(/ESC(?:ALA)?\.?\s*[:=]?\s*(1\s*[:/]\s*\d{1,4}.*)$/i);
    if (m) { const v = valores(m[1]); if (v.length) rot.push({ ...base, valores: v }); continue; }
    if (/^1\s*[:/]\s*\d{1,4}(\s*[,;eE]\s*1\s*[:/]\s*\d{1,4})*$/.test(s)) rot.push({ ...base, valores: valores(s) });
  }
  return rot;
}

// regiões da folha (classificador) → escala de cada vista. Rótulo do carimbo
// (dentro da região "carimbo") vale para a folha toda só quando é o único valor.
function escalasDaFolha(textos, regioesFolha = [], escalaInformada = null) {
  const rot = rotulosDeEscala(textos);
  const carimbos = regioesFolha.filter(r => r.tipo === 'carimbo').map(r => r.caixa);
  const noCarimbo = (r) => carimbos.some(c => r.x >= c[0] && r.x <= c[2] && r.y >= c[1] && r.y <= c[3]);
  const distintas = [...new Set(rot.flatMap(r => r.valores).filter(v => v > 0))].sort((a, b) => a - b);
  const temSemEscala = rot.some(r => r.valores.includes(0));
  const vistas = [];
  const porVista = !escalaInformada && (distintas.length > 1 || temSemEscala);
  if (porVista) {
    const daVista = rot.filter(r => !noCarimbo(r) && r.valores.length === 1);
    for (const reg of regioesFolha) {
      if (['carimbo', 'legenda'].includes(reg.tipo)) continue;
      const [x0, y0, x1, y1] = reg.caixa;
      const lim = Math.min(150, Math.max(40, 0.25 * Math.max(x1 - x0, y1 - y0)));
      let melhor = null;
      for (const r of daVista) {
        const d = Math.hypot(Math.max(x0 - r.x, 0, r.x - x1), Math.max(y0 - r.y, 0, r.y - y1));
        if (d <= lim && (!melhor || d < melhor.d)) melhor = { d, v: r.valores[0] };
      }
      vistas.push({ tipo: reg.tipo, caixa: reg.caixa, escala: melhor ? melhor.v : null });
    }
  }
  return { distintas, temSemEscala, vistas, porVista };
}

// ── 4) Página → itens da legenda com contagem e metragem ─────────────────
// `regioesFora` ([[x0, y0, x1, y1]] em pontos): regiões da folha que não são planta
// (diagrama unifilar, vista de quadro, quadro de cargas, carimbo — utils/classificarPranchaPdf.js):
// o símbolo e a linha que caem nelas não são contados (o disjuntor do unifilar
// parecia a tomada da legenda).
// `regioesFolha` ([{ tipo, caixa }], do classificador): dão a escala de cada vista
// (folha com mais de uma escala) — ver escalasDaFolha.
// `prazo` (Date.now() limite): passou, para com erro TEMPO_ESGOTADO.
function analisarGeometria({ caminhos, textos, largura, altura }, { escala, regioesFora = [], regioesFolha = [], prazo = null } = {}) {
  const foraDaPlanta = (caixa) => regioesFora.some(r => dentroDe(r, caixa));
  const relogio = cronometro(prazo);
  const blobs = simbolos(caminhos, { prazo });
  // legenda em tabela (Símbolo | Fornecedor | Descrição | QTDE): lida pelas colunas
  const tabelas = tabelasDeLegenda(textos, caminhos, blobs);
  const naTabela = (caixa) => tabelas.some(t => dentroDe(t.caixa, caixa));
  // candidatos a amostra de legenda: símbolo com descrição à direita
  const candSimb = [];
  for (const b of blobs) { relogio(); if (naTabela(b.caixa)) continue; const desc = textoAoLado(b.caixa, textos); if (desc) candSimb.push({ tipo: 'simbolo', caixa: b.caixa, desc, blob: b }); }
  // traço de legenda: reta curta (10–80 pt) com descrição à direita
  const candLinha = [];
  for (const c of caminhos) {
    if (!c.traco || !c.reto || c.comp < 10 || c.comp > 80) continue;
    relogio();
    if (naTabela(c.caixa)) continue;
    const desc = textoAoLado(c.caixa, textos, 40);
    if (desc) candLinha.push({ tipo: 'linha', caixa: c.caixa, desc, estilo: `${c.stroke}|${c.lw}|${c.dash}`, cor: c.stroke, lw: c.lw, dash: c.dash });
  }
  const regioesClassicas = regioesLegenda(textos, [...candSimb, ...candLinha]);
  const regioes = [...regioesClassicas, ...tabelas.map(t => t.caixa)];
  const regiao = regioes.length ? [Math.min(...regioes.map(r => r[0])), Math.min(...regioes.map(r => r[1])), Math.max(...regioes.map(r => r[2])), Math.max(...regioes.map(r => r[3]))] : null;
  const naLegenda = (caixa) => regioes.some(r => dentroDe(r, caixa));
  const naLegendaClassica = (caixa) => regioesClassicas.some(r => dentroDe(r, caixa));
  const escalas = escalasDaFolha(textos, regioesFolha, escala);
  // sem escala no carimbo, o "1:50" do título da vista vale quando é o único valor da folha
  const esc = escala || escalaDoCarimbo(textos) || (escalas.distintas.length === 1 && escalas.distintas[0] >= 10 ? escalas.distintas[0] : null);

  // traço de legenda só se isolado: lado de um símbolo (quadrado, caixa) toca outros caminhos
  const daLegenda = caminhos.filter(c => naLegendaClassica(c.caixa));
  const linhasIsoladas = candLinha.filter(l => naLegendaClassica(l.caixa) && !daLegenda.some(c => c.caixa !== l.caixa && tocam(c.caixa, l.caixa)));
  // partes de um mesmo símbolo (cheio + contorno, ou símbolo de 2 linhas de altura)
  // viram uma entrada só: a da 1ª linha de texto, com a assinatura da maior parte
  const simbs = candSimb.filter(c => naLegendaClassica(c.caixa));
  const { raiz, unir } = uniaoBusca(simbs.length);
  for (let i = 0; i < simbs.length; i++) for (let j = i + 1; j < simbs.length; j++) if (tocam(simbs[i].caixa, simbs[j].caixa, 1.5)) unir(i, j);
  const grupos = new Map();
  simbs.forEach((c, i) => { const r = raiz(i); (grupos.get(r) || grupos.set(r, []).get(r)).push(c); });
  const entradas = [];
  for (const g of grupos.values()) {
    const topo = [...g].sort((a, b) => a.desc.y - b.desc.y)[0].desc;
    const maior = [...g].sort((a, b) => (b.blob.w * b.blob.h) - (a.blob.w * a.blob.h))[0];
    entradas.push({ ...maior, desc: topo });
  }
  entradas.push(...linhasIsoladas);
  // símbolo centrado num parágrafo de várias linhas casa com a 2ª linha: sobe
  // até a 1ª, sem passar por uma linha que já é início de outra entrada
  const marcadas = new Set(entradas.map(e => Math.round(e.desc.y)));
  for (const e of entradas) {
    let d = e.desc;
    for (let passo = 0; passo < 5; passo++) {
      const acima = textos.filter(t => t.horizontal && Math.abs(t.x - d.x) < d.h && t.y < d.y && d.y - t.y < d.h * 1.7).sort((a, b) => b.y - a.y)[0];
      if (!acima || marcadas.has(Math.round(acima.y)) || !ehDescricao(acima.s)) break;
      d = { ...(textoAoLado([acima.x - 1, acima.y - acima.h * 0.6, acima.x - 0.6, acima.y - acima.h * 0.1], textos, 2) || { texto: acima.s, x: acima.x, y: acima.y, h: acima.h }) };
    }
    e.desc = d;
  }
  const inicios = new Set(entradas.map(e => Math.round(e.desc.y)));
  for (const e of entradas) e.texto = descricaoCompleta(e, textos, inicios);

  // Assinatura do símbolo: a maior parte (cor, cheio/vazado, tamanho) e as
  // partes de OUTRA família com o centro dentro dela (o miolo cheio do círculo
  // vazado…). Só o tamanho da maior parte não separava "embutido AR70" de
  // "embutido AR111" (mesmo círculo, miolos diferentes).
  const companheiros = indiceDeCompanheiros(blobs);
  const assinaturaDe = (b) => ({ blob: b, comps: companheiros(b) });

  // uma entrada por SÍMBOLO: a chave é a assinatura (estilo do traço, na linha),
  // não o texto — antes, uma entrada por descrição juntava luminárias diferentes
  // do mesmo fornecedor. A mesma assinatura com o mesmo texto (legenda repetida
  // na folha) é uma entrada só; com textos diferentes, as duas ficam e são
  // marcadas ambíguas mais abaixo.
  const unicas = [];
  tabelas.forEach(t => t.entradas.forEach((e, i) => { e.linhaTabela = i + 1; }));
  for (const e of [...tabelas.flatMap(t => t.entradas), ...entradas]) {
    relogio();
    if (e.tipo === 'simbolo') e.sig = assinaturaDe(e.blob);
    const igual = unicas.find(u => u.tipo === e.tipo && u.texto === e.texto && (e.tipo === 'simbolo' ? mesmaAssinatura(u.sig, e.sig) : u.estilo === e.estilo));
    if (!igual) { unicas.push({ ...e }); continue; }
    if (e.qtde != null) igual.qtde = (igual.qtde ?? 0) + e.qtde;
  }

  // ocorrências na planta: cada símbolo vai para a entrada que ele satisfaz com
  // MAIS partes (o círculo com miolo é do "AR111", não do "círculo sozinho");
  // empate: conta para as duas (e elas ficam ambíguas)
  const entradasSimb = unicas.filter(e => e.tipo === 'simbolo');
  for (const e of entradasSimb) e.ocorr = [];
  const amostras = new Set(entradasSimb.map(e => e.blob));
  for (const b of blobs) {
    relogio();
    if (amostras.has(b)) continue;
    let cand = null;
    for (const e of entradasSimb) if (parecido(b, e.blob)) (cand ||= []).push(e);
    if (!cand || naLegenda(b.caixa) || foraDaPlanta(b.caixa)) continue;
    const sb = assinaturaDe(b);
    const ok = cand.filter(e => partesCasam(e.sig, sb));
    if (!ok.length) continue;
    const max = Math.max(...ok.map(e => e.sig.comps.length));
    for (const e of ok) if (e.sig.comps.length === max) e.ocorr.push(b);
  }

  const itens = [];
  for (const e of unicas) {
    e.desc = { ...e.desc, texto: e.texto };
    const doProjeto = {
      ...(e.qtde != null ? { qtde_projeto: e.qtde } : {}),
      ...(e.fornecedor ? { fornecedor: e.fornecedor } : {}),
      ...(e.codigo ? { codigo: e.codigo } : {}),
      ...(e.daTabela ? { origem_legenda: 'tabela', linha_tabela: e.linhaTabela } : {}),
    };
    if (e.tipo === 'simbolo') {
      itens.push({
        tipo: 'simbolo', descricao: e.desc.texto, quantidade: e.ocorr.length,
        assinatura: { cor: e.blob.chave.slice(1).split('|')[0], preenchido: e.blob.chave[0] === 'F', largura_pt: +e.blob.w.toFixed(1), altura_pt: +e.blob.h.toFixed(1), ...(e.sig.comps.length ? { partes: e.sig.comps.length } : {}) },
        ...doProjeto,
        posicoes: e.ocorr.slice(0, 500).map(b => [Math.round(b.cx), Math.round(b.cy)]),
        _sig: e.sig,
      });
    } else {
      itens.push({ tipo: 'linha', descricao: e.desc.texto, ...medirLinha(e.estilo, caminhos, { naLegenda, foraDaPlanta, esc, escalas, relogio }), estilo: { cor: e.cor, espessura: e.lw, tracejado: e.dash || null }, ...doProjeto });
    }
  }
  // duas linhas da tabela com a mesma descrição e símbolos diferentes: o código
  // (ou a linha da tabela) separa os nomes
  const repetidas = new Map();
  for (const i of itens) repetidas.set(i.descricao, (repetidas.get(i.descricao) || 0) + 1);
  const vistos = new Map();
  for (const i of itens) {
    if (repetidas.get(i.descricao) < 2) continue;
    const n = (vistos.get(i.descricao) || 0) + 1;
    vistos.set(i.descricao, n);
    i.descricao = `${i.descricao} (símbolo ${i.codigo || i.linha_tabela || n})`;
  }
  // na legenda, símbolos iguais (mesma assinatura) com descrições diferentes não se distinguem: avisa
  const simbItens = itens.filter(i => i.tipo === 'simbolo');
  for (const i of simbItens) {
    if (simbItens.some(j => j !== i && j.assinatura.cor === i.assinatura.cor && j.assinatura.preenchido === i.assinatura.preenchido
      && Math.abs(j.assinatura.largura_pt - i.assinatura.largura_pt) <= 0.8 && Math.abs(j.assinatura.altura_pt - i.assinatura.altura_pt) <= 0.8
      && mesmaAssinatura(i._sig, j._sig))) i.ambiguo = true;
  }
  for (const i of simbItens) delete i._sig;
  // o mesmo estilo de linha em duas descrições: não dá para separar as metragens
  itens.filter(i => i.tipo === 'linha').forEach((i, _, l) => { if (l.some(j => j !== i && JSON.stringify(j.estilo) === JSON.stringify(i.estilo))) i.ambiguo = true; });
  itens.sort((a, b) => (a.tipo === b.tipo ? a.descricao.localeCompare(b.descricao, 'pt-BR') : a.tipo === 'simbolo' ? -1 : 1));
  const valido = (i) => i.descricao.length >= 6 && !/^(SOBE|DESCE)\b/i.test(i.descricao) && (i.tipo === 'simbolo' ? i.quantidade > 0 : i.comprimento_pt > 0);
  // o que o projetista quantificou na tabela e não foi contado no desenho: fica à
  // vista (para o achado de conferência "legenda diz N, desenho tem 0")
  const naoContados = [
    ...tabelas.flatMap(t => t.semSimbolo),
    ...itens.filter(i => !valido(i) && i.qtde_projeto != null).map(i => ({ descricao: i.descricao, qtde_projeto: i.qtde_projeto, ...(i.codigo ? { codigo: i.codigo } : {}), motivo: 'símbolo não encontrado na planta' })),
  ];
  const linhasSemEscala = itens.filter(i => i.tipo === 'linha' && valido(i) && i.metros == null && escalas.porVista && escalas.distintas.length > 1);
  return {
    itens: itens.filter(valido), legenda: regiao ? regiao.map(Math.round) : null, legendas: regioes.map(r => r.map(Math.round)), escala: esc, pagina_pt: [Math.round(largura), Math.round(altura)],
    ...(tabelas.length ? { tabelasLegenda: tabelas.map(t => ({ caixa: t.caixa.map(Math.round), colunas: t.colunas, linhas: t.entradas.length + t.semSimbolo.length })) } : {}),
    ...(naoContados.length ? { naoContados } : {}),
    ...(escalas.distintas.length > 1 || escalas.temSemEscala ? { escalas: { distintas: escalas.distintas, semEscala: escalas.temSemEscala, vistas: escalas.vistas.map(v => ({ tipo: v.tipo, caixa: v.caixa.map(Math.round), escala: v.escala })) } } : {}),
    ...(linhasSemEscala.length ? { avisoEscala: `folha com mais de uma escala (${escalas.distintas.map(v => `1:${v}`).join(', ')}): ${linhasSemEscala.length} linha(s) da legenda caem em vista sem escala identificada — metragem não calculada, conferir na planta` } : {}),
  };
}

// Comprimento de um estilo de linha na planta. Folha de escala única: tudo na
// escala do carimbo. Folha com mais de uma escala (ou com vista "SEM ESCALA"):
// cada trecho na escala da sua vista; trecho em vista "sem escala" não entra nos
// metros; trecho em vista sem escala identificada, com mais de uma escala na
// folha, bloqueia os metros (null) em vez de chutar uma escala.
function medirLinha(estilo, caminhos, { naLegenda, foraDaPlanta, esc, escalas, relogio }) {
  // comprimento do caminho se ele é deste estilo (null se não é). Faixa: o
  // comprimento é o lado maior (só faixa alinhada aos eixos — a inclinada fica de fora)
  const [, familia, tRef] = estilo.startsWith('faixa|') ? estilo.match(/^faixa\|(.+)\|([\d.]+)$/) : [];
  const casa = familia
    ? (c) => { const f = faixaDe(c); return f && f.familia === familia && Math.abs(f.T - +tRef) <= Math.max(0.25, +tRef * 0.2) ? f.L : null; }
    : (c) => (c.traco && `${c.stroke}|${c.lw}|${c.dash}` === estilo ? c.comp : null);
  let comp = 0, n = 0, metros = 0, semEscalaPt = 0, indefinidoPt = 0;
  const porEscala = {};
  const vistaDe = (caixa) => {
    const cx = (caixa[0] + caixa[2]) / 2, cy = (caixa[1] + caixa[3]) / 2;
    let melhor = null;
    for (const v of escalas.vistas) {
      const [x0, y0, x1, y1] = v.caixa;
      if (cx < x0 || cx > x1 || cy < y0 || cy > y1) continue;
      const area = (x1 - x0) * (y1 - y0);
      if (!melhor || area < melhor.area) melhor = { v, area };
    }
    return melhor?.v || null;
  };
  for (const c of caminhos) {
    const L = casa(c);
    if (L == null || naLegenda(c.caixa) || foraDaPlanta(c.caixa)) continue;
    relogio();
    comp += L; n++;
    if (!escalas.porVista) continue;
    const v = vistaDe(c.caixa);
    const e = v?.escala ?? (escalas.distintas.length === 1 ? escalas.distintas[0] : null);
    if (e === 0) semEscalaPt += L;
    else if (e == null) indefinidoPt += L;
    else { metros += L * PT_PARA_M * e; porEscala[e] = (porEscala[e] || 0) + L; }
  }
  const r = { comprimento_pt: Math.round(comp), trechos: n };
  if (!escalas.porVista) return { ...r, metros: esc ? Math.round(comp * PT_PARA_M * esc * 10) / 10 : null };
  return {
    ...r,
    metros: indefinidoPt > 0 || !Object.keys(porEscala).length ? null : Math.round(metros * 10) / 10,
    escalas_pt: Object.fromEntries(Object.entries(porEscala).map(([k, v]) => [`1:${k}`, Math.round(v)])),
    ...(semEscalaPt ? { sem_escala_pt: Math.round(semEscalaPt) } : {}),
    ...(indefinidoPt ? { escala_indefinida_pt: Math.round(indefinidoPt) } : {}),
  };
}

// ── 5) Limites: TEMPO, não número de traços ─────────────────────────────────
// Antes, página com mais de 50 mil traços não era lida: 6 de 10 PDFs reais
// (110–250 mil traços) ficavam sem contagem (29/10/2026). Agora a leitura roda
// numa thread à parte (pdfVetorialWorker.js, pela fila global de
// services/executarNoWorker.js: no máximo 2 leituras pesadas ao mesmo tempo,
// memória limitada) e cada página tem um tempo-limite; a página que passa dele
// volta com `aviso` e `pulada: { motivo: 'tempo' }`, sem itens — contagem pela
// metade não é dada como contagem. O teto de traços fica só como proteção de
// memória (uma página de 250 mil traços usa ~1 GB).
const MAX_CAMINHOS_PAGINA = 500000;
const TEMPO_PAGINA_MS = 60 * 1000;
const TEMPO_TOTAL_MS = 150 * 1000;
const MEMORIA_WORKER_MB = 2048;
const seg = (ms) => Math.round(ms / 1000);

// PDF (buffer) → por página: itens da legenda com quantidade (símbolos) e
// metros (linhas). `paginas`: limita (padrão: até `maxPaginas`, 10). PDF só com
// imagem → vazio. Página pulada ou que falhe na análise volta com `aviso` (e sem
// itens) em vez de derrubar as outras; `pulada.motivo`: 'tempo' (passou do
// tempo-limite da página), 'tempo_total' (o tempo do arquivo acabou antes dela),
// 'tracos' (acima do teto de memória), 'memoria' (a thread estourou a memória),
// 'limite_paginas' (páginas além de `maxPaginas`: uma entrada só, `pagina: null`).
// Cada página volta também com `folha` (utils/classificarPranchaPdf.js: planta,
// diagrama unifilar, quadro de cargas…) e `ms` (tempo da página). Página sem
// planta (só unifilar, quadro, tabela) não é contada (`ignorada`); na folha
// mista, a contagem é só fora do unifilar, da vista do quadro, da tabela e do carimbo.
// Opções: escala, maxPaginas, maxCaminhos, tempoPaginaMs, tempoLimiteMs (do
// arquivo todo), emThread (padrão true; false = no próprio processo, usado pela thread).
async function lerPdfVetorial(buffer, opcoes = {}) {
  if (opcoes.emThread === false) return lerPdfVetorialAqui(buffer, opcoes);
  const total = opcoes.tempoLimiteMs ?? TEMPO_TOTAL_MS;
  const { executarNoWorker } = require('../services/executarNoWorker');
  let m;
  try {
    m = await executarNoWorker(require('path').join(__dirname, 'pdfVetorialWorker.js'),
      { buffer, opcoes: { ...opcoes, emThread: false } },
      // a thread respeita o tempo por conta própria; o limite daqui é a rede de segurança
      { tempoLimiteMs: total + 30 * 1000, memoriaMb: MEMORIA_WORKER_MB });
  } catch (e) {
    if (e.codigo === 'TEMPO_ESGOTADO') return [{ pagina: null, caminhos: null, itens: [], legenda: null, escala: null, aviso: `a leitura do desenho passou de ${seg(total + 30000)} s e foi interrompida — contagem pelo desenho não feita, conferir na planta`, pulada: { motivo: 'tempo', limite_s: seg(total + 30000) } }];
    if (e.codigo === 'SEM_RESPOSTA') return [{ pagina: null, caminhos: null, itens: [], legenda: null, escala: null, aviso: `a leitura do desenho estourou a memória reservada (${MEMORIA_WORKER_MB} MB) — contagem pelo desenho não feita, conferir na planta`, pulada: { motivo: 'memoria', limite_mb: MEMORIA_WORKER_MB } }];
    throw e;
  }
  if (!m?.ok) throw new Error(m?.erro || 'leitura vetorial sem resposta');
  return m.paginas;
}

async function lerPdfVetorialAqui(buffer, { paginas, escala, maxPaginas = 10, maxCaminhos = MAX_CAMINHOS_PAGINA, tempoPaginaMs = TEMPO_PAGINA_MS, tempoLimiteMs = TEMPO_TOTAL_MS } = {}) {
  const prazoTotal = Date.now() + tempoLimiteMs;
  const { getDocument, OPS } = await pdfjs();
  const doc = await getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, verbosity: 0, disableFontFace: true }).promise;
  try {
    const lista = paginas || Array.from({ length: Math.min(doc.numPages, maxPaginas) }, (_, i) => i + 1);
    const saida = [];
    for (const n of lista) {
      const vazio = { itens: [], legenda: null, escala: null };
      if (Date.now() > prazoTotal) {
        saida.push({ pagina: n, caminhos: null, ...vazio, aviso: `não lida: o tempo de leitura do arquivo (${seg(tempoLimiteMs)} s) acabou antes desta página — conferir na planta`, pulada: { motivo: 'tempo_total', limite_s: seg(tempoLimiteMs) } });
        continue;
      }
      const t0 = Date.now();
      const prazo = Math.min(t0 + tempoPaginaMs, prazoTotal);
      let pag = null, nCaminhos = null, folha = null;
      let r = { ...vazio };
      try {
        pag = await doc.getPage(n);
        // conta antes de ler: página acima do teto nem monta a geometria (memória por traço)
        let ops = await pag.getOperatorList();
        nCaminhos = 0;
        for (const f of ops.fnArray) if (f === OPS.constructPath) nCaminhos++;
        if (nCaminhos > maxCaminhos) {
          r.aviso = `página com ${nCaminhos.toLocaleString('pt-BR')} traços (limite ${maxCaminhos.toLocaleString('pt-BR')}, proteção de memória): contagem pelo desenho não feita — conferir na planta`;
          r.pulada = { motivo: 'tracos', limite: maxCaminhos };
        } else {
          if (Date.now() > prazo) throw erroDeTempo();
          const geo = await lerPagina(pag, OPS, { geometria: true, ops, prazo });
          ops = null; // a lista de operadores (a maior parte da memória) já pode ser liberada
          nCaminhos = geo.caminhos.length;
          if (geo.caminhos.length) {
            try { folha = resumoDaFolha(classificarPaginaPdf(geo, { escala })); } catch (e) { console.warn(`[pdfVetorial] classificação da página ${n} falhou:`, e.message); }
            for (const c of geo.caminhos) delete c.subs; // a contagem não usa os trechos: libera a memória
            if (Date.now() > prazo) throw erroDeTempo();
          }
          if (folha?.semPlanta) {
            r.ignorada = `${folha.resumo} — sem contagem de símbolos (não é planta)`;
          } else if (geo.caminhos.length) {
            try {
              r = analisarGeometria(geo, { escala, regioesFora: folha?.regioesFora || [], regioesFolha: folha?.regioes || [], prazo });
              if (r.avisoEscala) r.aviso = r.avisoEscala;
            } catch (e) {
              if (e.codigo === 'TEMPO_ESGOTADO') throw e;
              r.aviso = `falha ao ler o desenho (${e.message}) — conferir na planta`;
            }
          }
        }
      } catch (e) {
        if (e.codigo !== 'TEMPO_ESGOTADO') throw e;
        r = {
          ...vazio,
          aviso: `página pesada${nCaminhos ? ` (${nCaminhos.toLocaleString('pt-BR')} traços)` : ''}: a leitura passou do tempo-limite de ${seg(prazo - t0)} s — contagem pelo desenho não feita, conferir na planta`,
          pulada: { motivo: 'tempo', limite_s: seg(prazo - t0) },
        };
      }
      saida.push({ pagina: n, caminhos: nCaminhos, ms: Date.now() - t0, ...r, ...(folha ? { folha: { tipo: folha.tipo, resumo: folha.resumo, temPlanta: folha.temPlanta, semPlanta: folha.semPlanta, misto: folha.misto, regioes: folha.regioes } } : {}) });
      if (pag) pag.cleanup();
    }
    // páginas além do limite: não somem caladas
    if (!paginas && doc.numPages > maxPaginas) {
      const fora = Array.from({ length: doc.numPages - maxPaginas }, (_, i) => maxPaginas + 1 + i);
      saida.push({
        pagina: null, caminhos: null, itens: [], legenda: null, escala: null,
        aviso: `${fora.length === 1 ? `página ${fora[0]} não lida` : `páginas ${fora[0]} a ${fora[fora.length - 1]} não lidas`} (limite de ${maxPaginas} páginas por arquivo) — conferir na planta`,
        pulada: { motivo: 'limite_paginas', paginas: fora, limite: maxPaginas },
      });
    }
    return saida;
  } finally {
    await doc.destroy();
  }
}

// classificação → o que a análise guarda: tipo, resumo e as regiões a não contar
// DETALHE (ampliação, detalhe de instalação) também fica fora da contagem, mas só
// quando a folha tem planta: o detalhe repete pontos da planta ou numera os itens
// em círculos — prancha real de CFTV contava 11 caixas de passagem, 6 delas os
// "①②③" das especificações do detalhe (29/10/2026). Folha só de detalhe
// continua contada (não há outra vista para contar).
const CONTAGEM_FORA = new Set(['diagrama', 'vista_quadro', 'quadro_cargas', 'carimbo']);
function resumoDaFolha(c) {
  const temVistaDePlanta = c.regioes.some(r => r.tipo === 'planta');
  return {
    tipo: c.tipo, resumo: c.resumo, temPlanta: c.temPlanta, semPlanta: c.semPlanta, misto: c.misto,
    regioesFora: c.regioes.filter(r => CONTAGEM_FORA.has(r.tipo) || (temVistaDePlanta && r.tipo === 'detalhe')).map(r => r.caixa),
    // tipo e caixa de cada região: os pontos por ambiente da folha mista usam
    // (utils/pontosPorAmbiente.js — o que cai fora da planta não conta)
    regioes: c.regioes.map(r => ({ tipo: r.tipo, caixa: r.caixa })),
  };
}
// carregada na hora (utils/classificarPranchaPdf.js usa escalaDoCarimbo daqui)
const classificarPaginaPdf = (...a) => require('./classificarPranchaPdf').classificarPaginaPdf(...a);

module.exports = { lerPdfVetorial, analisarGeometria, simbolos, escalaDoCarimbo, escalasDaFolha, MAX_CAMINHOS_PAGINA, TEMPO_PAGINA_MS, TEMPO_TOTAL_MS, paraTestes: { textoAoLado, regioesLegenda, lerPagina, pdfjs, uniaoBusca, tabelasDeLegenda, rotulosDeEscala, resumoDaFolha } };
