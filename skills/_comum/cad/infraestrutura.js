// Infraestrutura do modelo 3D: o que o desenho traz e o que falta ligar.
// Pedido do usuário (01/11/2026): "ainda há falhas na infraestrutura de
// tubulações ou eletrocalhas que saem dos quadros para as tomadas e luminárias,
// e dos interruptores para as luminárias… o sistema pode ter opção de sugerir
// melhores caminhos de infraestrutura".
//
//   separarEletrocalhas(segs) → { eletrocalhas: [{ segmentos, largura_mm }], resto }
//     a eletrocalha desenhada em planta é um par de linhas paralelas (as abas):
//     o par vira UM eixo com a largura medida — antes subiam dois eletrodutos.
//   sugerirCaminhos({ pecas, rede, paredes }) → { segmentos, ligados, sugeridos, sem }
//     liga ao traçado do projeto (ou ao quadro) cada ponto que o desenho deixou
//     solto: interruptor → luminária do mesmo ambiente (retorno); luminária,
//     tomada e quadro → rede mais próxima, em "L" paralelo às paredes, pelo lado
//     que atravessa menos paredes. É SUGESTÃO (camada à parte no 3D), não projeto.
// Coordenadas em metros, num mesmo sistema (o da cena).

const r2 = (v) => Math.round(v * 100) / 100;

// ── Eletrocalha desenhada como par de abas ──────────────────────────────────
const ABA_MIN_M = 1.2;            // aba mais curta que isso é detalhe, não eletrocalha
const LARGURA_M = [0.045, 0.65];  // de 50 a 600 mm entre as abas
const LARGURAS_PADRAO = [50, 75, 100, 150, 200, 250, 300, 400, 500, 600];

// segs: [[x1, y1, x2, y2], …]
function separarEletrocalhas(segs) {
  const info = segs.map(([x1, y1, x2, y2], i) => {
    const L = Math.hypot(x2 - x1, y2 - y1);
    return { i, L, ux: (x2 - x1) / (L || 1), uy: (y2 - y1) / (L || 1), a: [x1, y1], b: [x2, y2] };
  });
  const longos = info.filter(s => s.L >= ABA_MIN_M);
  const usado = new Set();
  const eletrocalhas = [];
  for (let k = 0; k < longos.length; k++) {
    const s = longos[k];
    if (usado.has(s.i)) continue;
    let melhor = null;
    for (let m = k + 1; m < longos.length; m++) {
      const t = longos[m];
      if (usado.has(t.i)) continue;
      const cos = s.ux * t.ux + s.uy * t.uy;
      if (Math.abs(cos) < 0.999) continue; // paralelas (±2,5°)
      // distância entre as retas e sobreposição das projeções no eixo de s
      const d = Math.abs((t.a[0] - s.a[0]) * -s.uy + (t.a[1] - s.a[1]) * s.ux);
      if (d < LARGURA_M[0] || d > LARGURA_M[1]) continue;
      const pr = (p) => (p[0] - s.a[0]) * s.ux + (p[1] - s.a[1]) * s.uy;
      const [t0, t1] = [pr(t.a), pr(t.b)].sort((x, y) => x - y);
      const sob = Math.min(s.L, t1) - Math.max(0, t0);
      // as duas abas começam e terminam juntas (dois eletrodutos lado a lado, não)
      if (sob < 0.8 * Math.max(s.L, t.L)) continue;
      if (!melhor || d < melhor.d) melhor = { t, d, t0: Math.max(0, t0), t1: Math.min(s.L, t1) };
    }
    if (!melhor) continue;
    usado.add(s.i); usado.add(melhor.t.i);
    // eixo: meio do caminho entre as abas, no trecho comum
    const lado = (melhor.t.a[0] - s.a[0]) * -s.uy + (melhor.t.a[1] - s.a[1]) * s.ux >= 0 ? 1 : -1;
    const off = (melhor.d / 2) * lado;
    const p = (t) => [s.a[0] + s.ux * t - s.uy * off, s.a[1] + s.uy * t + s.ux * off];
    const mm = melhor.d * 1000;
    const largura = LARGURAS_PADRAO.reduce((b, v) => (Math.abs(v - mm) < Math.abs(b - mm) ? v : b));
    eletrocalhas.push({ segmento: [...p(melhor.t0), ...p(melhor.t1)].map(r2), largura_mm: largura });
  }
  // largura mais comum vale para o grupo (uma eletrocalha por medida)
  const porLargura = new Map();
  for (const e of eletrocalhas) (porLargura.get(e.largura_mm) || porLargura.set(e.largura_mm, []).get(e.largura_mm)).push(e.segmento);
  return {
    eletrocalhas: [...porLargura].map(([largura_mm, segmentos]) => ({ largura_mm, segmentos })),
    resto: segs.filter((_, i) => !usado.has(i)),
  };
}

// ── Caminhos sugeridos ──────────────────────────────────────────────────────
const LIGADO_M = 0.6;     // ponto a até 60 cm do traçado já está ligado a ele
const MAX_LIGACAO_M = 40; // mais longe que isso não se inventa ligação
const CUSTO_PAREDE_M = 4; // atravessar uma parede "custa" 4 m a mais de eletroduto
// Teto de pontos ligados pela árvore numa chamada (revisão de 02/11/2026): acima
// disso a sugestão para e o 3D avisa — o worker do 3D tem 90 s para tudo
const MAX_SUGERIDOS = 12000;

// Distância do ponto (x, y) ao segmento que começa em segs[i] (achatados) e o ponto
// mais perto dele em Q. A MESMA conta em todo lugar: o índice espacial só escolhe
// quem conferir, não pode mudar o resultado.
const Q = [0, 0];
function distSeg(x, y, segs, i) {
  const x1 = segs[i], y1 = segs[i + 1], vx = segs[i + 2] - x1, vy = segs[i + 3] - y1;
  const L2 = vx * vx + vy * vy;
  const t = L2 ? Math.max(0, Math.min(1, ((x - x1) * vx + (y - y1) * vy) / L2)) : 0;
  Q[0] = x1 + vx * t; Q[1] = y1 + vy * t;
  return Math.hypot(x - Q[0], y - Q[1]);
}
function maisPerto(x, y, segs) {
  let m = null;
  for (let i = 0; i + 3 < segs.length; i += 4) {
    const d = distSeg(x, y, segs, i);
    if (!m || d < m.d) m = { d, s: i / 4, q: [Q[0], Q[1]] };
  }
  return m;
}

function cruza([ax, ay, bx, by], [cx, cy, dx, dy]) {
  const o = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const d1 = o(cx, cy, dx, dy, ax, ay), d2 = o(cx, cy, dx, dy, bx, by);
  const d3 = o(ax, ay, bx, by, cx, cy), d4 = o(ax, ay, bx, by, dx, dy);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

// ── Índice espacial em grade ────────────────────────────────────────────────
// Revisão de 02/11/2026: sem ele cada ponto conferia todas as paredes, todos os
// alvos e todos os outros pontos — 2.700 pontos levavam 3,4 s e 10.800, 51 s
// (o worker do 3D tem 90 s para tudo). Cada item entra em todas as células que a
// caixa dele toca; o que tocaria células demais (linha enorme, coordenada
// estranha) fica numa lista conferida sempre — nunca se perde um candidato.
const MAX_CELULAS_ITEM = 4096;
const chaveCel = (i, j) => (i + 0x100000) * 0x200000 + (j + 0x100000);
class Grade {
  constructor(cel) {
    this.cel = cel; this.celulas = new Map(); this.grandes = []; this.marca = []; this.vez = 0;
    this.lim = [Infinity, Infinity, -Infinity, -Infinity]; // células ocupadas: i0, j0, i1, j1
  }
  inserir(id, x0, y0, x1, y1) {
    const i0 = Math.floor(Math.min(x0, x1) / this.cel), i1 = Math.floor(Math.max(x0, x1) / this.cel);
    const j0 = Math.floor(Math.min(y0, y1) / this.cel), j1 = Math.floor(Math.max(y0, y1) / this.cel);
    if (!(Number.isFinite(i0) && Number.isFinite(i1) && Number.isFinite(j0) && Number.isFinite(j1)) || (i1 - i0 + 1) * (j1 - j0 + 1) > MAX_CELULAS_ITEM) {
      this.grandes.push(id);
      return;
    }
    const L = this.lim;
    L[0] = Math.min(L[0], i0); L[1] = Math.min(L[1], j0); L[2] = Math.max(L[2], i1); L[3] = Math.max(L[3], j1);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const k = chaveCel(i, j), c = this.celulas.get(k);
        if (c) c.push(id); else this.celulas.set(k, [id]);
      }
    }
  }
  // fn(id) uma vez para cada item das células i0..i1 × j0..j1 (e para os grandes)
  celulasDe(i0, j0, i1, j1, fn, comGrandes = true) {
    const vez = ++this.vez, marca = this.marca;
    const ver = (id) => { if (marca[id] !== vez) { marca[id] = vez; fn(id); } };
    if (comGrandes) this.grandes.forEach(ver);
    const L = this.lim;
    for (let i = Math.max(i0, L[0]); i <= Math.min(i1, L[2]); i++) {
      for (let j = Math.max(j0, L[1]); j <= Math.min(j1, L[3]); j++) {
        const c = this.celulas.get(chaveCel(i, j));
        if (c) for (const id of c) ver(id);
      }
    }
  }
  caixa(x0, y0, x1, y1, fn) {
    const f = (v) => Math.floor(v / this.cel);
    this.celulasDe(f(Math.min(x0, x1)), f(Math.min(y0, y1)), f(Math.max(x0, x1)), f(Math.max(y0, y1)), fn);
  }
}
// segmentos achatados [x1, y1, x2, y2, …] → grade (id = posição do segmento)
function gradeDeSegmentos(segs, cel) {
  const g = new Grade(cel);
  for (let s = 0; 4 * s + 3 < segs.length; s++) g.inserir(s, segs[4 * s], segs[4 * s + 1], segs[4 * s + 2], segs[4 * s + 3]);
  return g;
}
const FOLGA = 1e-6;
// há segmento a até `raio` de (x, y)? (o mesmo que maisPerto(...).d <= raio)
function algumAte(g, segs, x, y, raio) {
  let ok = false;
  g.caixa(x - raio - FOLGA, y - raio - FOLGA, x + raio + FOLGA, y + raio + FOLGA, (s) => { if (!ok && distSeg(x, y, segs, 4 * s) <= raio) ok = true; });
  return ok;
}
// o mais perto de (x, y) pela grade, em anéis de células a partir da do ponto; o
// empate fica com o segmento de menor posição (o mesmo que maisPerto)
function maisPertoNaGrade(g, segs, x, y) {
  let m = null;
  const ver = (s) => {
    const d = distSeg(x, y, segs, 4 * s);
    if (!m || d < m.d || (d === m.d && s < m.s)) m = { d, s, q: [Q[0], Q[1]] };
  };
  g.grandes.forEach(ver);
  const L = g.lim;
  if (L[0] > L[2]) return m;
  const ci = Math.floor(x / g.cel), cj = Math.floor(y / g.cel);
  // anéis antes de chegar às células ocupadas estão vazios
  const k0 = Math.max(0, L[0] - ci, ci - L[2], L[1] - cj, cj - L[3]);
  const vez = ++g.vez, marca = g.marca;
  const visitar = (i, j) => {
    const c = g.celulas.get(chaveCel(i, j));
    if (c) for (const s of c) if (marca[s] !== vez) { marca[s] = vez; ver(s); }
  };
  for (let k = k0; ; k++) {
    const i0 = ci - k, i1 = ci + k, j0 = cj - k, j1 = cj + k;
    const ja = Math.max(j0, L[1]), jb = Math.min(j1, L[3]);
    // só a borda do anel k (o miolo já foi visto), dentro das células ocupadas
    for (let i = Math.max(i0, L[0]); i <= Math.min(i1, L[2]); i++) {
      if (i === i0 || i === i1) { for (let j = ja; j <= jb; j++) visitar(i, j); continue; }
      if (j0 >= L[1]) visitar(i, j0);
      if (j1 <= L[3] && j1 !== j0) visitar(i, j1);
    }
    // o que não foi visto está a mais de k células do ponto
    if (m && m.d < k * g.cel - FOLGA) break;
    if (i0 <= L[0] && i1 >= L[2] && j0 <= L[1] && j1 >= L[3]) break;
  }
  return m;
}

// Fila de prioridade (heap binário) dos pontos pendentes: o mais perto da rede
// em cima; empate, o de menor posição (como a ordenação estável de antes)
class Fila {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  static menor(x, y) { return x.d < y.d || (x.d === y.d && x.i < y.i); }
  push(d, i) {
    const a = this.a; a.push({ d, i });
    let k = a.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (!Fila.menor(a[k], a[p])) break;
      [a[k], a[p]] = [a[p], a[k]]; k = p;
    }
  }
  pop() {
    const a = this.a, topo = a[0], fim = a.pop();
    if (a.length) {
      a[0] = fim;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1, r = l + 1;
        let m = k;
        if (l < a.length && Fila.menor(a[l], a[m])) m = l;
        if (r < a.length && Fila.menor(a[r], a[m])) m = r;
        if (m === k) break;
        [a[k], a[m]] = [a[m], a[k]]; k = m;
      }
    }
    return topo;
  }
}

// Rota em "L" de a até b: as duas ordens (primeiro em x ou primeiro em y), vence
// a que atravessa menos paredes; alinhados (até 5 cm), reta.
// nCruza(l): quantas paredes o trecho l atravessa. → { segs, cruz }
function rota(a, b, nCruza) {
  if (Math.abs(a[0] - b[0]) < 0.05 || Math.abs(a[1] - b[1]) < 0.05) {
    const l = [a[0], a[1], b[0], b[1]];
    return { segs: [l], cruz: nCruza(l) };
  }
  const opcoes = [
    [[a[0], a[1], b[0], a[1]], [b[0], a[1], b[0], b[1]]],
    [[a[0], a[1], a[0], b[1]], [a[0], b[1], b[0], b[1]]],
  ];
  const [c0, c1] = opcoes.map(op => op.reduce((s, l) => s + nCruza(l), 0));
  return c1 < c0 ? { segs: opcoes[1], cruz: c1 } : { segs: opcoes[0], cruz: c0 };
}
const custo = (r) => r.segs.reduce((s, l) => s + Math.abs(l[2] - l[0]) + Math.abs(l[3] - l[1]), 0) + CUSTO_PAREDE_M * r.cruz;

// pecas: [{ x, y, tipo: 'quadro'|'interruptor'|'luminaria'|'outro', amb }]
// rede: segmentos achatados [x1, y1, x2, y2, …] do traçado do projeto
// paredes: [[x1, y1, x2, y2], …]
// redeParede: traçado que só liga peças de parede (o eletroduto do piso, de onde a
// tomada sobe) — conta como "já ligado", mas não é rede para os caminhos novos
// → { segmentos, ligados, sugeridos, sem (pontos sem caminho), cortados (dos sem,
//     os que ficaram de fora pelo teto `maxSugeridos`) }
function sugerirCaminhos({ pecas, rede = [], redeParede = [], paredes = [], maxSugeridos = MAX_SUGERIDOS }) {
  const segs = [];
  const add = (r) => { for (const l of r) if (Math.hypot(l[2] - l[0], l[3] - l[1]) >= 0.01) segs.push(l.map(r2)); };
  // tamanho da célula pela extensão dos pontos: ~256 células no lado maior, no mínimo 2 m
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const p of pecas) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    bx0 = Math.min(bx0, p.x); by0 = Math.min(by0, p.y); bx1 = Math.max(bx1, p.x); by1 = Math.max(by1, p.y);
  }
  const W = bx1 > bx0 ? bx1 - bx0 : 0, H = by1 > by0 ? by1 - by0 : 0;
  const cel = Math.max(2, Math.max(W, H) / 256);
  const gParedes = new Grade(cel);
  paredes.forEach((w, k) => gParedes.inserir(k, w[0], w[1], w[2], w[3]));
  const nCruza = (l) => {
    let n = 0;
    gParedes.caixa(l[0], l[1], l[2], l[3], (k) => { if (cruza(l, paredes[k])) n++; });
    return n;
  };

  const gRede = rede.length ? gradeDeSegmentos(rede, cel) : null;
  const gParede = redeParede.length ? gradeDeSegmentos(redeParede, cel) : null;
  const ligado = pecas.map(p => !!gRede && algumAte(gRede, rede, p.x, p.y, LIGADO_M));
  // ligado só pelo piso: fica fora da rede do teto (não vira alvo de outros pontos)
  const peloPiso = pecas.map((p, i) => !ligado[i] && p.tipo !== 'luminaria' && !!gParede && algumAte(gParede, redeParede, p.x, p.y, LIGADO_M));
  const feito = pecas.map((_, i) => ligado[i] || peloPiso[i]);
  let sugeridos = 0;

  // 1) interruptor solto → luminária mais próxima do mesmo ambiente (retorno)
  const lumPorAmb = new Map();
  pecas.forEach((q, j) => { if (q.tipo === 'luminaria') (lumPorAmb.get(q.amb) || lumPorAmb.set(q.amb, []).get(q.amb)).push(j); });
  for (let i = 0; i < pecas.length; i++) {
    const p = pecas[i];
    if (feito[i] || p.tipo !== 'interruptor' || !(p.amb >= 0)) continue;
    let alvo = -1, melhor = Infinity;
    for (const j of lumPorAmb.get(p.amb) || []) {
      const q = pecas[j];
      const d = Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
      if (d < melhor) { melhor = d; alvo = j; }
    }
    if (alvo < 0 || melhor > MAX_LIGACAO_M) continue;
    add(rota([p.x, p.y], [pecas[alvo].x, pecas[alvo].y], nCruza).segs);
    feito[i] = true; sugeridos++;
  }

  // 2) o resto: árvore (Prim) que cresce da rede do projeto, dos pontos já
  //    ligados e do quadro; cada ponto solto entra pelo alvo mais barato
  const alvos = rede.slice(); // segmentos achatados que já são "rede"
  const pontoAlvo = (p) => alvos.push(p.x, p.y, p.x, p.y);
  pecas.forEach((p, i) => { if (ligado[i]) pontoAlvo(p); });
  // sem rede: o quadro é a raiz; sem quadro, o ponto mais perto do meio
  const pendentes = new Set(pecas.map((_, i) => i).filter(i => !feito[i]));
  if (!alvos.length) {
    let raiz = pecas.findIndex((p, i) => p.tipo === 'quadro' && pendentes.has(i));
    if (raiz < 0 && pendentes.size) {
      const lista = [...pendentes];
      const cx = lista.reduce((s, i) => s + pecas[i].x, 0) / lista.length, cy = lista.reduce((s, i) => s + pecas[i].y, 0) / lista.length;
      raiz = lista.reduce((k, i) => (Math.hypot(pecas[i].x - cx, pecas[i].y - cy) < Math.hypot(pecas[k].x - cx, pecas[k].y - cy) ? i : k), lista[0]);
    }
    if (raiz >= 0) { pendentes.delete(raiz); pontoAlvo(pecas[raiz]); }
  }

  // melhor alvo de cada pendente (d e o ponto q da rede), na fila pela distância
  const n = pecas.length;
  const mD = new Float64Array(n).fill(Infinity), mQx = new Float64Array(n), mQy = new Float64Array(n);
  const pendente = new Uint8Array(n);
  for (const i of pendentes) pendente[i] = 1;
  const fila = new Fila();
  const nAlvos = Math.floor(alvos.length / 4);
  if (nAlvos && pendentes.size) {
    // poucos alvos: confere todos; muitos (traçado do projeto): pela grade
    const gAlvos = nAlvos * pendentes.size > 2e6 ? gradeDeSegmentos(alvos, cel) : null;
    for (const i of pendentes) {
      const m = gAlvos ? maisPertoNaGrade(gAlvos, alvos, pecas[i].x, pecas[i].y) : maisPerto(pecas[i].x, pecas[i].y, alvos);
      if (!m || !Number.isFinite(m.d)) continue;
      mD[i] = m.d; mQx[i] = m.q[0]; mQy[i] = m.q[1];
      fila.push(m.d, i);
    }
  }
  // pendentes numa grade de células maiores (~16 pontos por célula), com a maior
  // distância de cada uma: o trecho novo só confere as células que pode melhorar
  const celP = Math.max(cel, Math.sqrt((W * H) / Math.max(1, pendentes.size)) * 4);
  const porCel = new Map();
  for (const i of pendentes) {
    const p = pecas[i];
    const ci = Number.isFinite(p.x) ? Math.floor(p.x / celP) : 0, cj = Number.isFinite(p.y) ? Math.floor(p.y / celP) : 0;
    const k = chaveCel(ci, cj);
    let c = porCel.get(k);
    if (!c) porCel.set(k, (c = { x0: ci * celP, y0: cj * celP, x1: (ci + 1) * celP, y1: (cj + 1) * celP, pts: [], max: -Infinity, todos: !Number.isFinite(p.x) || !Number.isFinite(p.y) }));
    c.pts.push(i);
    c.max = Math.max(c.max, mD[i]);
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) c.todos = true;
  }
  let celulas = [...porCel.values()];
  const novoTrecho = (l) => {
    const sx0 = Math.min(l[0], l[2]), sx1 = Math.max(l[0], l[2]), sy0 = Math.min(l[1], l[3]), sy1 = Math.max(l[1], l[3]);
    let vazias = 0;
    for (const c of celulas) {
      if (!c.pts.length) { vazias++; continue; }
      // distância da célula à caixa do trecho: nenhum ponto da célula fica mais perto que isso
      const dx = Math.max(0, c.x0 - sx1, sx0 - c.x1), dy = Math.max(0, c.y0 - sy1, sy0 - c.y1);
      if (!c.todos && Math.hypot(dx, dy) > c.max + FOLGA) continue;
      let max = -Infinity, k = 0;
      for (const i of c.pts) {
        if (!pendente[i]) continue;
        c.pts[k++] = i;
        const d = distSeg(pecas[i].x, pecas[i].y, l, 0);
        if (d < mD[i]) { mD[i] = d; mQx[i] = Q[0]; mQy[i] = Q[1]; fila.push(d, i); }
        if (mD[i] > max) max = mD[i];
      }
      c.pts.length = k;
      c.max = max;
    }
    if (vazias > celulas.length / 2) celulas = celulas.filter(c => c.pts.length);
  };

  let cortados = 0, passos = 0;
  while (pendentes.size) {
    if (passos >= maxSugeridos) { cortados = pendentes.size; break; }
    // os 8 mais perto em linha reta disputam pelo custo real (com paredes)
    const cand = [];
    while (cand.length < 8 && fila.size) {
      const e = fila.pop();
      // entrada velha (o ponto já entrou ou achou alvo mais perto depois)
      if (!pendente[e.i] || e.d !== mD[e.i] || cand.some(c => c.i === e.i)) continue;
      cand.push(e);
    }
    if (!cand.length) break;
    let esc = -1, cEsc = Infinity, rEsc = null;
    for (const { i } of cand) {
      const r = rota([pecas[i].x, pecas[i].y], [mQx[i], mQy[i]], nCruza);
      const c = custo(r);
      if (c < cEsc) { cEsc = c; esc = i; rEsc = r; }
    }
    // os que não entraram voltam para a fila
    for (const e of cand) if (e.i !== esc) fila.push(e.d, e.i);
    if (mD[esc] > MAX_LIGACAO_M) break;
    add(rEsc.segs);
    pendentes.delete(esc); pendente[esc] = 0;
    sugeridos++; passos++;
    for (const l of rEsc.segs) novoTrecho(l);
  }
  return { segmentos: segs, ligados: ligado.filter(Boolean).length, sugeridos, sem: pendentes.size, cortados };
}

// Busca do segmento mais perto entre muitos (descidas e ligação das peças no 3D:
// ./modelo3d.js) → (x, y) => { d, s (posição do segmento), q } ou null. O mesmo
// resultado de maisPerto (empate: o de menor posição); a grade só quando compensa.
function buscaMaisPerto(segs) {
  const n = Math.floor(segs.length / 4);
  if (n < 64) return (x, y) => maisPerto(x, y, segs);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < 4 * n; i += 2) {
    if (!Number.isFinite(segs[i]) || !Number.isFinite(segs[i + 1])) continue;
    x0 = Math.min(x0, segs[i]); x1 = Math.max(x1, segs[i]); y0 = Math.min(y0, segs[i + 1]); y1 = Math.max(y1, segs[i + 1]);
  }
  const g = gradeDeSegmentos(segs, Math.max(2, Math.max(x1 - x0, y1 - y0, 0) / 256));
  return (x, y) => maisPertoNaGrade(g, segs, x, y);
}

module.exports = { separarEletrocalhas, sugerirCaminhos, buscaMaisPerto, LIGADO_M, MAX_SUGERIDOS };
