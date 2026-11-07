// Geometria de apoio para a leitura de CAD (sem dado de cliente):
//   - traçado de polilinha com arco (bulge): o trecho curvo era medido pela
//     corda, e a eletrocalha/eletroduto em curva saía mais curta;
//   - SPLINE e ELLIPSE em pontos (antes não eram medidas — a rota desenhada
//     com spline simplesmente sumia da metragem);
//   - retângulo mínimo de um polígono (largura × comprimento do ambiente), para
//     quem precisa das dimensões e não só da área (perímetro, distâncias).
const entityToPolyline = require('dxf/lib/entityToPolyline').default;

// pontos do arco de um trecho com bulge (tan(θ/4); > 0 anti-horário), sem o ponto inicial
function arcoDoBulge(p, q, bulge, passoRad = Math.PI / 36) {
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const c = Math.hypot(dx, dy);
  if (!bulge || c < 1e-12) return [q];
  const th = 4 * Math.atan(bulge); // varredura com sinal
  const meio = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const k = (c / 2) / Math.tan(th / 2); // distância (com sinal) do meio da corda ao centro
  const centro = [meio[0] - (dy / c) * k, meio[1] + (dx / c) * k];
  const r = Math.hypot(p[0] - centro[0], p[1] - centro[1]);
  const a0 = Math.atan2(p[1] - centro[1], p[0] - centro[0]);
  const n = Math.max(2, Math.ceil(Math.abs(th) / passoRad));
  const out = [];
  for (let i = 1; i < n; i++) { const a = a0 + (th * i) / n; out.push([centro[0] + r * Math.cos(a), centro[1] + r * Math.sin(a)]); }
  out.push(q);
  return out;
}

// LWPOLYLINE/POLYLINE com os arcos (bulge) em pontos; fechada repete o primeiro ponto
function pontosDaPolilinha(e) {
  const v = (e.vertices || []).filter(x => Number.isFinite(x.x) && Number.isFinite(x.y));
  if (v.length < 2) return null;
  const seq = e.closed ? [...v, v[0]] : v;
  const pts = [[seq[0].x, seq[0].y]];
  for (let i = 1; i < seq.length; i++) pts.push(...arcoDoBulge([seq[i - 1].x, seq[i - 1].y], [seq[i].x, seq[i].y], seq[i - 1].bulge || 0));
  return pts;
}

// SPLINE e ELLIPSE pela própria lib `dxf` (interpolação da B-spline / da elipse),
// em cópia rasa: a função da lib altera a entidade em alguns tipos
function pontosDaCurva(e) {
  try {
    if (e.type === 'SPLINE' && !(e.controlPoints?.length >= 2)) {
      return e.fitPoints?.length >= 2 ? e.fitPoints.map(p => [p.x, p.y]) : null;
    }
    const pts = entityToPolyline({ ...e }, { interpolationsPerSplineSegment: 16 });
    return pts && pts.length >= 2 && pts.every(p => Number.isFinite(p[0]) && Number.isFinite(p[1])) ? pts : null;
  } catch {
    return e.fitPoints?.length >= 2 ? e.fitPoints.map(p => [p.x, p.y]) : null;
  }
}

// SOLID (triângulo/quadrilátero cheio — a tomada alta "cheia" de muitos escritórios): os cantos na ordem
// do contorno. O DXF grava 1-2-3-4 em "Z" (o contorno é 1-2-4-3); no triângulo o 4º repete o 3º.
function pontosDoSolido(e) {
  const c = (e.corners || []).filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y)).map(p => [p.x, p.y]);
  if (c.length < 3) return null;
  const pts = c.length === 4 ? [c[0], c[1], c[3], c[2]] : c;
  return pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-9);
}

// HATCH: cada laço do contorno em pontos (polilinha do laço, ou as arestas: reta, arco e elipse pelos
// extremos e pelo centro ± raio — basta para a extensão e o preenchimento de um símbolo)
function lacosDaHachura(e) {
  const out = [];
  for (const l of e.boundary?.loops || []) {
    const pts = [];
    for (const x of l.entities || []) {
      if (x.type === 'POLYLINE') for (const p of x.points || []) pts.push([p.x, p.y]);
      else if (x.start && x.end) pts.push([x.start.x, x.start.y]);
      else if (x.center && Number.isFinite(x.radius) && x.radius > 0) {
        const a0 = (x.startAngle || 0) * Math.PI / 180, a1 = (x.endAngle || 360) * Math.PI / 180;
        for (let k = 0; k <= 8; k++) { const a = a0 + ((a1 - a0) * k) / 8; pts.push([x.center.x + x.radius * Math.cos(a), x.center.y + x.radius * Math.sin(a)]); }
      } else if (x.center && x.major) {
        const r = Math.hypot(x.major.x, x.major.y);
        pts.push([x.center.x - r, x.center.y - r], [x.center.x + r, x.center.y + r]);
      }
    }
    const ok = pts.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (ok.length >= 2) out.push(ok);
  }
  return out;
}

const comprimento = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

// fecho convexo (cadeia monótona)
function fechoConvexo(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const inf = [], sup = [];
  for (const q of p) { while (inf.length >= 2 && cruz(inf.at(-2), inf.at(-1), q) <= 0) inf.pop(); inf.push(q); }
  for (const q of [...p].reverse()) { while (sup.length >= 2 && cruz(sup.at(-2), sup.at(-1), q) <= 0) sup.pop(); sup.push(q); }
  return [...inf.slice(0, -1), ...sup.slice(0, -1)];
}

// Retângulo de menor área que contém o polígono (lados do fecho convexo):
// { largura_m (menor lado), comprimento_m (maior), angulo_graus (do lado maior) }
function retanguloMinimo(poligono) {
  const h = fechoConvexo(poligono || []);
  if (h.length < 3) return null;
  let melhor = null;
  for (let i = 0; i < h.length; i++) {
    const [a, b] = [h[i], h[(i + 1) % h.length]];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-9) continue;
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, y] of h) { const u = x * ux + y * uy, v = -x * uy + y * ux; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const area = (u1 - u0) * (v1 - v0);
    if (!melhor || area < melhor.area - 1e-9) melhor = { area, du: u1 - u0, dv: v1 - v0, ang: Math.atan2(uy, ux) };
  }
  if (!melhor) return null;
  const longo = melhor.du >= melhor.dv;
  let ang = (melhor.ang * 180) / Math.PI + (longo ? 0 : 90);
  ang = ((ang % 180) + 180) % 180;
  const r = (v) => Math.round(v * 100) / 100;
  return { largura_m: r(Math.min(melhor.du, melhor.dv)), comprimento_m: r(Math.max(melhor.du, melhor.dv)), angulo_graus: Math.round(ang * 10) / 10 };
}

module.exports = { arcoDoBulge, pontosDaPolilinha, pontosDaCurva, pontosDoSolido, lacosDaHachura, comprimento, retanguloMinimo, fechoConvexo };
