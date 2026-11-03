// Parte da leitura vetorial de PDF (utils/pdfVetorial.js, que explica o método inteiro):
// passo 2, símbolos (união de caminhos pequenos da mesma cor que se tocam).
const { cronometro } = require('./tempo');

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

module.exports = { uniaoBusca, simbolos };