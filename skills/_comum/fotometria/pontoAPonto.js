// Cálculo PONTO A PONTO da iluminância (fase 5 do roteiro de 02/11/2026). O MESMO
// código roda na skill de iluminação (Node: Em, Emín e U0 calculadas no memorial) e no
// visualizador 3D (navegador: mapa de iluminância em falsa-cor no piso) — como o
// simulador lógico da instalação.
//
//   E(P) = FM · Σ nível · I(C, γ) · cos γ / d²      (lei do inverso do quadrado e do cosseno)
//
// d = distância da luminária ao ponto P do plano de trabalho, γ = ângulo com a vertical
// (cos γ = h / d), C = azimute do ponto visto da luminária (C0 ao longo do comprimento).
// Só a luz DIRETA: sem a refletância de teto, paredes e piso (sem interreflexão) — a Em
// fica abaixo da do método dos lúmens, que inclui a luz refletida no fator de utilização;
// a uniformidade sai conservadora. Cada luminária é uma fonte pontual.
// JS puro, sem DOM: a fotometria vem no formato compacto de ./leitor.js.

const RAD = Math.PI / 180;
const arred = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;

function interp(xs, ys, x) {
  const n = xs.length;
  if (x <= xs[0]) return x < xs[0] - 1e-9 ? 0 : ys[0];
  if (x >= xs[n - 1]) return x > xs[n - 1] + 1e-9 ? 0 : ys[n - 1];
  // passo constante (forma compacta): índice direto
  const passo = xs[1] - xs[0];
  let i = Math.min(n - 2, Math.floor((x - xs[0]) / passo));
  if (x < xs[i] || x > xs[i + 1]) { i = 0; while (i < n - 2 && x > xs[i + 1]) i++; }
  const t = (x - xs[i]) / (xs[i + 1] - xs[i]);
  return ys[i] + (ys[i + 1] - ys[i]) * t;
}

// I(C, γ) em cd a partir da fotometria compacta
function avaliador(f) {
  if (!f || !Array.isArray(f.C) || !Array.isArray(f.G) || !Array.isArray(f.I)) return () => 0;
  if (f.C.length === 1) { const I0 = f.I[0]; return (C, g) => interp(f.G, I0, g); }
  return (C, g) => {
    const c = ((C % 360) + 360) % 360;
    const passo = f.C[1] - f.C[0];
    let i = Math.min(f.C.length - 2, Math.floor(c / passo));
    if (c < f.C[i] || c > f.C[i + 1]) { i = 0; while (i < f.C.length - 2 && c > f.C[i + 1]) i++; }
    const t = (c - f.C[i]) / (f.C[i + 1] - f.C[i]);
    const a = interp(f.G, f.I[i], g), b = interp(f.G, f.I[i + 1], g);
    return a + (b - a) * t;
  };
}

// Iluminância horizontal no ponto (x, y) do plano de altura zPlano.
// lums: [{ x, y, z (altura de montagem), I (avaliador), fator (nível × FM), rot (graus: C0 da luminária em relação ao eixo x) }]
function iluminanciaNoPonto(x, y, zPlano, lums) {
  let e = 0;
  for (const l of lums) {
    const fator = l.fator ?? 1;
    if (!(fator > 0)) continue;
    const h = l.z - zPlano;
    if (!(h > 0)) continue;
    const dx = x - l.x, dy = y - l.y;
    const d2 = dx * dx + dy * dy + h * h;
    const d = Math.sqrt(d2);
    const g = Math.acos(h / d) / RAD;
    let C = 0;
    if (dx * dx + dy * dy > 1e-12) C = Math.atan2(dy, dx) / RAD - (l.rot || 0);
    e += fator * l.I(C, g) * (h / d) / d2;
  }
  return e;
}

// ponto dentro do polígono (par-ímpar)
function dentro([x, y], pol) {
  let d = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i], [xj, yj] = pol[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d;
  }
  return d;
}

// Grade de cálculo no polígono: { nx, ny } (malha da skill) ou { passo } (m). Células
// do retângulo envolvente; entram as de centro dentro do polígono.
// → { x0, y0, dx, dy, nx, ny, centros: [{ x, y, i, j }] }
function gradeNoPoligono(poligono, { nx, ny, passo, maxCelulas = 4000 } = {}) {
  const xs = poligono.map(p => p[0]), ys = poligono.map(p => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  const L = Math.max(...xs) - x0, W = Math.max(...ys) - y0;
  if (!(nx > 0 && ny > 0)) {
    let p = passo > 0 ? passo : 0.5;
    // nunca mais que maxCelulas (cena grande, celular)
    if ((L / p) * (W / p) > maxCelulas) p = Math.sqrt((L * W) / maxCelulas);
    nx = Math.max(1, Math.round(L / p));
    ny = Math.max(1, Math.round(W / p));
  }
  const dx = L / nx, dy = W / ny;
  const centros = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = [x0 + dx * (i + 0.5), y0 + dy * (j + 0.5)];
    if (dentro(c, poligono)) centros.push({ x: c[0], y: c[1], i, j });
  }
  return { x0, y0, dx, dy, nx, ny, L, W, centros };
}

// Malha de cálculo/medição do ambiente: p = 0,2 · 5^log10(d), d = maior dimensão (premissa da
// EN 12464-1 [CONFERIR com a NBR ISO/CIE 8995-1]); pontos no centro das células. É a malha do
// relatório de medição da skill e a das estatísticas do mapa do 3D (os números batem).
function malhaMedicao(C, L) {
  const d = Math.max(C, L);
  const p = Math.min(10, 0.2 * 5 ** Math.log10(Math.max(d, 1)));
  const nx = Math.max(1, Math.ceil(C / p - 1e-9));
  const ny = Math.max(1, Math.ceil(L / p - 1e-9));
  return { p, nx, ny, pontos: nx * ny };
}

// Em, Emín, Emáx e U0 = Emín / Em
function estatisticas(valores) {
  const v = valores.filter(Number.isFinite);
  if (!v.length) return { em: 0, emin: 0, emax: 0, u0: 0, pontos: 0 };
  const em = v.reduce((s, x) => s + x, 0) / v.length;
  const emin = Math.min(...v);
  return { em, emin, emax: Math.max(...v), u0: em > 0 ? emin / em : 0, pontos: v.length };
}

// Ambiente inteiro: valores nos centros da grade e as estatísticas.
// opcoes: { poligono, plano (m), luminarias: [{ x, y, z, fotometria | I, nivel?, rot? }], fm, nx/ny ou passo }
function calcularAmbiente({ poligono, plano = 0.75, luminarias = [], fm = 1, nx, ny, passo, maxCelulas } = {}) {
  const grade = gradeNoPoligono(poligono, { nx, ny, passo, maxCelulas });
  const cache = new Map();
  const lums = luminarias.map(l => {
    let I = l.I;
    if (!I) { if (!cache.has(l.fotometria)) cache.set(l.fotometria, avaliador(l.fotometria)); I = cache.get(l.fotometria); }
    return { x: l.x, y: l.y, z: l.z, I, rot: l.rot || 0, fator: fm * (l.nivel ?? 1) };
  });
  const valores = grade.centros.map(c => iluminanciaNoPonto(c.x, c.y, plano, lums));
  return { grade, valores, ...estatisticas(valores) };
}

// ── Falsa-cor (mapa de iluminância do 3D) ──────────────────────────────────
// azul escuro → azul → ciano → verde → amarelo → vermelho, t de 0 a 1
const PARADAS = [[0, [0.12, 0.1, 0.45]], [0.2, [0.1, 0.35, 0.95]], [0.4, [0.05, 0.8, 0.9]], [0.6, [0.2, 0.85, 0.3]], [0.8, [0.98, 0.88, 0.15]], [1, [0.9, 0.15, 0.1]]];
function corFalsa(t) {
  const x = Math.min(1, Math.max(0, Number(t) || 0));
  let i = 0;
  while (i < PARADAS.length - 2 && x > PARADAS[i + 1][0]) i++;
  const [ta, a] = PARADAS[i], [tb, b] = PARADAS[i + 1];
  const k = (x - ta) / (tb - ta);
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
// topo "redondo" da escala (lx) e as marcas da legenda
function escala(max) {
  const m = Math.max(10, Number(max) || 0);
  const ordem = 10 ** Math.floor(Math.log10(m));
  const topo = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map(f => f * ordem).find(v => v >= m - 1e-9);
  return { max: topo, marcas: [0, 0.2, 0.4, 0.6, 0.8, 1].map(t => Math.round(topo * t)) };
}

module.exports = { avaliador, iluminanciaNoPonto, gradeNoPoligono, calcularAmbiente, estatisticas, malhaMedicao, dentro, corFalsa, escala, arred };
