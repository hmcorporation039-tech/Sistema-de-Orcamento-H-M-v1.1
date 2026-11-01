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

function maisPerto(x, y, segs) {
  let m = null;
  for (let i = 0; i + 3 < segs.length; i += 4) {
    const x1 = segs[i], y1 = segs[i + 1], vx = segs[i + 2] - x1, vy = segs[i + 3] - y1;
    const L2 = vx * vx + vy * vy;
    const t = L2 ? Math.max(0, Math.min(1, ((x - x1) * vx + (y - y1) * vy) / L2)) : 0;
    const q = [x1 + vx * t, y1 + vy * t];
    const d = Math.hypot(x - q[0], y - q[1]);
    if (!m || d < m.d) m = { d, q };
  }
  return m;
}

function cruza([ax, ay, bx, by], [cx, cy, dx, dy]) {
  const o = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const d1 = o(cx, cy, dx, dy, ax, ay), d2 = o(cx, cy, dx, dy, bx, by);
  const d3 = o(ax, ay, bx, by, cx, cy), d4 = o(ax, ay, bx, by, dx, dy);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

// Rota em "L" de a até b: as duas ordens (primeiro em x ou primeiro em y), vence
// a que atravessa menos paredes; alinhados (até 5 cm), reta.
function rota(a, b, paredes) {
  if (Math.abs(a[0] - b[0]) < 0.05 || Math.abs(a[1] - b[1]) < 0.05) return [[a[0], a[1], b[0], b[1]]];
  const opcoes = [
    [[a[0], a[1], b[0], a[1]], [b[0], a[1], b[0], b[1]]],
    [[a[0], a[1], a[0], b[1]], [a[0], b[1], b[0], b[1]]],
  ];
  const n = (op) => op.reduce((s, l) => s + paredes.filter(w => cruza(l, w)).length, 0);
  const [c0, c1] = opcoes.map(n);
  return c1 < c0 ? opcoes[1] : opcoes[0];
}
const custo = (a, b, paredes) => {
  const r = rota(a, b, paredes);
  return r.reduce((s, l) => s + Math.abs(l[2] - l[0]) + Math.abs(l[3] - l[1]), 0)
    + CUSTO_PAREDE_M * r.reduce((s, l) => s + paredes.filter(w => cruza(l, w)).length, 0);
};

// pecas: [{ x, y, tipo: 'quadro'|'interruptor'|'luminaria'|'outro', amb }]
// rede: segmentos achatados [x1, y1, x2, y2, …] do traçado do projeto
// paredes: [[x1, y1, x2, y2], …]
// redeParede: traçado que só liga peças de parede (o eletroduto do piso, de onde a
// tomada sobe) — conta como "já ligado", mas não é rede para os caminhos novos
function sugerirCaminhos({ pecas, rede = [], redeParede = [], paredes = [] }) {
  const segs = [];
  const add = (r) => { for (const l of r) if (Math.hypot(l[2] - l[0], l[3] - l[1]) >= 0.01) segs.push(l.map(r2)); };
  const dRede = pecas.map(p => (rede.length ? maisPerto(p.x, p.y, rede) : null));
  const ligado = pecas.map((p, i) => !!dRede[i] && dRede[i].d <= LIGADO_M);
  // ligado só pelo piso: fica fora da rede do teto (não vira alvo de outros pontos)
  const peloPiso = pecas.map((p, i) => !ligado[i] && p.tipo !== 'luminaria' && redeParede.length > 0 && maisPerto(p.x, p.y, redeParede).d <= LIGADO_M);
  const feito = pecas.map((_, i) => ligado[i] || peloPiso[i]);
  let sugeridos = 0;

  // 1) interruptor solto → luminária mais próxima do mesmo ambiente (retorno)
  for (let i = 0; i < pecas.length; i++) {
    const p = pecas[i];
    if (feito[i] || p.tipo !== 'interruptor' || !(p.amb >= 0)) continue;
    let alvo = -1, melhor = Infinity;
    pecas.forEach((q, j) => {
      if (q.tipo !== 'luminaria' || q.amb !== p.amb) return;
      const d = Math.abs(q.x - p.x) + Math.abs(q.y - p.y);
      if (d < melhor) { melhor = d; alvo = j; }
    });
    if (alvo < 0 || melhor > MAX_LIGACAO_M) continue;
    add(rota([p.x, p.y], [pecas[alvo].x, pecas[alvo].y], paredes));
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
  // melhor alvo de cada pendente, atualizado só com o que entrou na rede
  const melhor = new Map();
  let visto = 0;
  const atualizar = () => {
    const novos = alvos.slice(visto);
    visto = alvos.length;
    if (!novos.length) return;
    for (const i of pendentes) {
      const m = maisPerto(pecas[i].x, pecas[i].y, novos);
      if (m && (!melhor.has(i) || m.d < melhor.get(i).d)) melhor.set(i, m);
    }
  };
  atualizar();
  while (pendentes.size) {
    // os 8 mais perto em linha reta disputam pelo custo real (com paredes)
    const cand = [...pendentes].filter(i => melhor.has(i)).sort((a, b) => melhor.get(a).d - melhor.get(b).d).slice(0, 8);
    if (!cand.length) break;
    let esc = -1, cEsc = Infinity;
    for (const i of cand) {
      const c = custo([pecas[i].x, pecas[i].y], melhor.get(i).q, paredes);
      if (c < cEsc) { cEsc = c; esc = i; }
    }
    if (melhor.get(esc).d > MAX_LIGACAO_M) break;
    const p = pecas[esc];
    const r = rota([p.x, p.y], melhor.get(esc).q, paredes);
    add(r);
    for (const l of r) alvos.push(...l);
    pendentes.delete(esc);
    sugeridos++;
    atualizar();
  }
  return { segmentos: segs, ligados: ligado.filter(Boolean).length, sugeridos, sem: pendentes.size };
}

module.exports = { separarEletrocalhas, sugerirCaminhos, LIGADO_M };
