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
//      desse estilo vira metros pela escala do carimbo (ESC. 1:50).
// Limites: símbolo desenhado só com linhas da mesma cor dos fios pode juntar
// com o fio; linha tracejada "explodida" em traços soma só os traços (sem os
// vazios). Os números são para conferência — não substituem a lista de materiais.

const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const hex = (a) => (typeof a?.[0] === 'string' ? a[0] : `#${[...(a || [])].map(v => Math.round(+v).toString(16).padStart(2, '0')).join('')}`).toLowerCase();

let pdfjsCarregado = null;
const pdfjs = () => (pdfjsCarregado ||= import('pdfjs-dist/legacy/build/pdf.mjs'));

// ── 1) Geometria e textos de uma página ────────────────────────────────────
async function lerPagina(pagina, OPS) {
  const vp = pagina.getViewport({ scale: 1 });
  const ops = await pagina.getOperatorList();
  const FILL = new Set([OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  const STROKE = new Set([OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  let st = { ctm: vp.transform.slice(), fill: '#000000', stroke: '#000000', lw: 1, dash: '' };
  const pilha = [];
  const caminhos = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
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
        for (let k = 0; k < d.length;) {
          const o = d[k++];
          if (o === 0) { [cx, cy] = ap(st.ctm, d[k++], d[k++]); sx = cx; sy = cy; ini ||= [cx, cy]; ponto(cx, cy); }
          else if (o === 1 || o === 2) {
            if (o === 2) k += 4;
            const [x, y] = ap(st.ctm, d[k++], d[k++]);
            comp += Math.hypot(x - cx, y - cy); cx = x; cy = y; segs++; ponto(x, y); fim = [x, y];
          } else if (o === 3) { comp += Math.hypot(sx - cx, sy - cy); cx = sx; cy = sy; segs++; }
          else break;
        }
        if (!Number.isFinite(x0)) break;
        const cheio = FILL.has(pintura), traco = STROKE.has(pintura);
        if (!cheio && !traco) break;
        // reta: um segmento só (ou caminho cujo comprimento ≈ distância das pontas)
        const reto = !!(ini && fim) && Math.abs(Math.hypot(fim[0] - ini[0], fim[1] - ini[1]) - comp) < 0.5;
        caminhos.push({ cheio, traco, fill: st.fill, stroke: st.stroke, lw: +(+st.lw).toFixed(2), dash: st.dash, caixa: [x0, y0, x1, y1], comp, segs, reto });
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

// ── 2) Símbolos: união de caminhos pequenos da mesma cor que se tocam ─────
function simbolos(caminhos, { tamanhoMax = 40, tolerancia = 0.6 } = {}) {
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
  for (const [chave, lista] of grupos) {
    const pai = lista.map((_, i) => i);
    const raiz = (i) => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
    const ord = lista.map((_, i) => i).sort((i, j) => lista[i].caixa[0] - lista[j].caixa[0]);
    for (let a = 0; a < ord.length; a++) {
      const A = lista[ord[a]].caixa;
      for (let b = a + 1; b < ord.length; b++) {
        const B = lista[ord[b]].caixa;
        if (B[0] > A[2] + tolerancia) break;
        if (B[1] <= A[3] + tolerancia && B[3] >= A[1] - tolerancia) pai[raiz(ord[a])] = raiz(ord[b]);
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
const ehDescricao = (s) => s.length >= 5 && (s.match(/[A-Za-zÀ-ú]/g) || []).length >= 4 && !/^(LEGENDA|NOTAS?|OBS|SOBE|DESCE)/i.test(s);

// Linha de texto que fica logo à direita de uma caixa (mesma altura)
function textoAoLado(caixa, textos, distMax = 70) {
  const cy = (caixa[1] + caixa[3]) / 2, h = Math.max(caixa[3] - caixa[1], 3);
  let melhor = null;
  for (const t of textos) {
    if (!t.horizontal || !ehDescricao(t.s)) continue;
    const ty = t.y - t.h * 0.35; // meio da linha de texto (y da tela é a linha de base)
    if (Math.abs(ty - cy) > Math.max(h * 0.7, t.h * 0.8)) continue;
    const dx = t.x - caixa[2];
    if (dx < -0.5 || dx > distMax) continue;
    if (!melhor || dx < melhor.dx) melhor = { ...t, dx };
  }
  if (!melhor) return null;
  // junta os pedaços da mesma linha (o PDF quebra o texto em trechos)
  const linha = textos.filter(t => t.horizontal && Math.abs(t.y - melhor.y) < melhor.h * 0.3 && t.x >= melhor.x - 0.5 && t.x < melhor.x + 400).sort((a, b) => a.x - b.x);
  let fimX = melhor.x - 1;
  const partes = [];
  for (const t of linha) { if (t.x - fimX > melhor.h * 2.5) break; partes.push(t.s); fimX = t.x + t.w; }
  return { texto: partes.join(' ').replace(/\s+/g, ' ').trim(), x: melhor.x, y: melhor.y, h: melhor.h };
}

// Regiões de legenda: abaixo de cada título "LEGENDA(S)", enquanto as entradas
// seguem contíguas (sem vão maior que 150 pt). Sem título não há legenda — nomes
// de sala alinhados na planta pareceriam uma coluna de legenda.
function regioesLegenda(textos, candidatos) {
  const regioes = [];
  for (const titulo of textos.filter(t => /^LEGENDAS?\b/i.test(t.s))) {
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

// ── 4) Página → itens da legenda com contagem e metragem ─────────────────
function analisarGeometria({ caminhos, textos, largura, altura }, { escala } = {}) {
  const blobs = simbolos(caminhos);
  // candidatos a amostra de legenda: símbolo com descrição à direita
  const candSimb = [];
  for (const b of blobs) { const desc = textoAoLado(b.caixa, textos); if (desc) candSimb.push({ tipo: 'simbolo', caixa: b.caixa, desc, blob: b }); }
  // traço de legenda: reta curta (10–80 pt) com descrição à direita
  const candLinha = [];
  for (const c of caminhos) {
    if (!c.traco || !c.reto || c.comp < 10 || c.comp > 80) continue;
    const desc = textoAoLado(c.caixa, textos, 40);
    if (desc) candLinha.push({ tipo: 'linha', caixa: c.caixa, desc, estilo: `${c.stroke}|${c.lw}|${c.dash}`, cor: c.stroke, lw: c.lw, dash: c.dash });
  }
  const regioes = regioesLegenda(textos, [...candSimb, ...candLinha]);
  const regiao = regioes.length ? [Math.min(...regioes.map(r => r[0])), Math.min(...regioes.map(r => r[1])), Math.max(...regioes.map(r => r[2])), Math.max(...regioes.map(r => r[3]))] : null;
  const naLegenda = (caixa) => regioes.some(r => dentroDe(r, caixa));
  const esc = escala || escalaDoCarimbo(textos);
  const ptParaM = esc ? (25.4 / 72 / 1000) * esc : null;

  // traço de legenda só se isolado: lado de um símbolo (quadrado, caixa) toca outros caminhos
  const daLegenda = caminhos.filter(c => naLegenda(c.caixa));
  const linhasIsoladas = candLinha.filter(l => naLegenda(l.caixa) && !daLegenda.some(c => c.caixa !== l.caixa && tocam(c.caixa, l.caixa)));
  // partes de um mesmo símbolo (cheio + contorno, ou símbolo de 2 linhas de altura)
  // viram uma entrada só: a da 1ª linha de texto, com a assinatura da maior parte
  const simbs = candSimb.filter(c => naLegenda(c.caixa));
  const pai = simbs.map((_, i) => i);
  const raiz = (i) => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  for (let i = 0; i < simbs.length; i++) for (let j = i + 1; j < simbs.length; j++) if (tocam(simbs[i].caixa, simbs[j].caixa, 1.5)) pai[raiz(i)] = raiz(j);
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
  // uma entrada por descrição
  const porDesc = new Map();
  for (const e of entradas) {
    const texto = descricaoCompleta(e, textos, inicios);
    const k = `${e.tipo}|${texto}`;
    if (!porDesc.has(k)) porDesc.set(k, { ...e, texto });
  }
  const itens = [];
  for (const e of porDesc.values()) {
    e.desc = { ...e.desc, texto: e.texto };
    if (e.tipo === 'simbolo') {
      const ocorr = blobs.filter(b => b !== e.blob && parecido(b, e.blob) && !naLegenda(b.caixa));
      itens.push({
        tipo: 'simbolo', descricao: e.desc.texto, quantidade: ocorr.length,
        assinatura: { cor: e.blob.chave.slice(1).split('|')[0], preenchido: e.blob.chave[0] === 'F', largura_pt: +e.blob.w.toFixed(1), altura_pt: +e.blob.h.toFixed(1) },
        posicoes: ocorr.slice(0, 500).map(b => [Math.round(b.cx), Math.round(b.cy)]),
      });
    } else {
      let comp = 0, n = 0;
      for (const c of caminhos) {
        if (!c.traco || `${c.stroke}|${c.lw}|${c.dash}` !== e.estilo || naLegenda(c.caixa)) continue;
        comp += c.comp; n++;
      }
      itens.push({
        tipo: 'linha', descricao: e.desc.texto, comprimento_pt: Math.round(comp), trechos: n,
        metros: ptParaM ? Math.round(comp * ptParaM * 10) / 10 : null, estilo: { cor: e.cor, espessura: e.lw, tracejado: e.dash || null },
      });
    }
  }
  // na legenda, símbolos iguais com descrições diferentes não se distinguem: avisa
  const ambiguos = itens.filter(i => i.tipo === 'simbolo').filter((i, _, l) => l.some(j => j !== i && j.assinatura.cor === i.assinatura.cor && j.assinatura.preenchido === i.assinatura.preenchido && Math.abs(j.assinatura.largura_pt - i.assinatura.largura_pt) <= 0.8 && Math.abs(j.assinatura.altura_pt - i.assinatura.altura_pt) <= 0.8));
  ambiguos.forEach(i => { i.ambiguo = true; });
  // o mesmo estilo de linha em duas descrições: não dá para separar as metragens
  itens.filter(i => i.tipo === 'linha').forEach((i, _, l) => { if (l.some(j => j !== i && JSON.stringify(j.estilo) === JSON.stringify(i.estilo))) i.ambiguo = true; });
  itens.sort((a, b) => (a.tipo === b.tipo ? a.descricao.localeCompare(b.descricao, 'pt-BR') : a.tipo === 'simbolo' ? -1 : 1));
  const valido = (i) => i.descricao.length >= 6 && !/^(SOBE|DESCE)\b/i.test(i.descricao) && (i.tipo === 'simbolo' ? i.quantidade > 0 : i.comprimento_pt > 0);
  return { itens: itens.filter(valido), legenda: regiao ? regiao.map(Math.round) : null, legendas: regioes.map(r => r.map(Math.round)), escala: esc, pagina_pt: [Math.round(largura), Math.round(altura)] };
}

// PDF (buffer) → por página: itens da legenda com quantidade (símbolos) e
// metros (linhas). `paginas`: limita (padrão: até 10). PDF só com imagem → vazio.
async function lerPdfVetorial(buffer, { paginas, escala, maxPaginas = 10 } = {}) {
  const { getDocument, OPS } = await pdfjs();
  const doc = await getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, verbosity: 0, disableFontFace: true }).promise;
  try {
    const lista = paginas || Array.from({ length: Math.min(doc.numPages, maxPaginas) }, (_, i) => i + 1);
    const saida = [];
    for (const n of lista) {
      const pag = await doc.getPage(n);
      const geo = await lerPagina(pag, OPS);
      const r = geo.caminhos.length ? analisarGeometria(geo, { escala }) : { itens: [], legenda: null, escala: null };
      saida.push({ pagina: n, caminhos: geo.caminhos.length, ...r });
      pag.cleanup();
    }
    return saida;
  } finally {
    await doc.destroy();
  }
}

module.exports = { lerPdfVetorial, analisarGeometria, simbolos, escalaDoCarimbo, paraTestes: { textoAoLado, regioesLegenda, lerPagina, pdfjs } };
