// Posicionamento automático de pontos num ambiente (polígono em metros).
// Regras explícitas e determinísticas — o projetista revisa e move no CAD:
//   - noPerimetro: distribui N pontos igualmente ao longo das paredes, com
//     recuo para dentro (tomadas NBR 5410 9.5.2.2, pontos de rede, sensores);
//   - emGrade: grade regular dentro do ambiente com espaçamento máximo dado
//     (detectores NBR 17240 pelo raio de cobertura, luminárias, APs);
//   - nosCantos: cantos do ambiente (câmeras, IVP), apontando para o centro.
const { dentro, centroide, perimetro } = require('./arquitetura');

const graus = (r) => (r * 180) / Math.PI;

// `fase` (0–1): desloca o início ao longo das paredes — tipos diferentes de
// ponto no mesmo ambiente (tomada, TUE, interruptor) não caem uns sobre os outros
function noPerimetro(poligono, n, { recuo = 0.15, fase = 0.5 } = {}) {
  if (!n) return [];
  const [cx, cy] = centroide(poligono);
  const total = perimetro(poligono);
  const passo = total / n;
  const pontos = [];
  let alvo = passo * fase;
  let acumulado = 0;
  for (let i = 0; i < poligono.length && pontos.length < n; i++) {
    const [x1, y1] = poligono[i];
    const [x2, y2] = poligono[(i + 1) % poligono.length];
    const lado = Math.hypot(x2 - x1, y2 - y1);
    if (lado < 1e-9) continue;
    // normal para dentro do ambiente, testada no MEIO da parede (no canto o
    // teste cai sobre o contorno e escolhia o lado errado)
    let nx = -(y2 - y1) / lado, ny = (x2 - x1) / lado;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    if (!dentro([mx + nx * 0.01, my + ny * 0.01], poligono)) { nx = -nx; ny = -ny; }
    while (alvo <= acumulado + lado && pontos.length < n) {
      // afastado dos cantos (não fica sobre a parede vizinha)
      const folga = Math.min(0.45, lado / 2) / lado;
      const t = Math.min(1 - folga, Math.max(folga, (alvo - acumulado) / lado));
      let x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      x += nx * recuo; y += ny * recuo;
      // símbolo com a base na parede (vértice do triângulo para dentro)
      pontos.push({ x, y, rotacao: graus(Math.atan2(ny, nx)) - 90 });
      alvo += passo;
    }
    acumulado += lado;
  }
  return pontos.filter(p => Number.isFinite(p.x)) .map(p => ({ ...p, centroAmbiente: [cx, cy] }));
}

function emGrade(poligono, espacamento, { quantidadeMinima = 1 } = {}) {
  const xs = poligono.map(p => p[0]), ys = poligono.map(p => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const nx = Math.max(1, Math.ceil((maxX - minX) / espacamento));
  const ny = Math.max(1, Math.ceil((maxY - minY) / espacamento));
  const dx = (maxX - minX) / nx, dy = (maxY - minY) / ny;
  const pontos = [];
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const p = [minX + dx * (i + 0.5), minY + dy * (j + 0.5)];
    if (dentro(p, poligono)) pontos.push({ x: p[0], y: p[1], rotacao: 0 });
  }
  if (pontos.length < quantidadeMinima) {
    const [cx, cy] = centroide(poligono);
    if (!pontos.length) pontos.push({ x: cx, y: cy, rotacao: 0 });
  }
  return pontos;
}

// Grade com exatamente `n` pontos (quantidade calculada pela skill)
// colunas × linhas pela proporção do ambiente (6 pontos em 23 × 12 m → 3 × 2);
// em ambiente irregular, células fora do polígono caem e a grade é refinada
function gradeComQuantidade(poligono, n) {
  if (!n) return [];
  const xs = poligono.map(p => p[0]), ys = poligono.map(p => p[1]);
  const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
  const L = Math.max(...xs) - minX, W = Math.max(...ys) - minY;
  for (let extra = 0; extra < 12; extra++) {
    const m = n + extra;
    const nx = Math.max(1, Math.min(m, Math.round(Math.sqrt((m * L) / Math.max(W, 1e-6)))));
    const ny = Math.ceil(m / nx);
    const pts = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const p = [minX + (L / nx) * (i + 0.5), minY + (W / ny) * (j + 0.5)];
      if (dentro(p, poligono)) pts.push({ x: p[0], y: p[1], rotacao: 0 });
    }
    if (pts.length >= n) {
      // escolhe n pontos espalhados (passo uniforme na lista), não os n primeiros
      return Array.from({ length: n }, (_, k) => pts[Math.floor((k * pts.length) / n)]);
    }
  }
  return [centro(poligono)];
}

// Grade nx × ny JÁ CALCULADA pela skill (luminotécnico: nx no sentido do
// comprimento, a maior dimensão): o eixo do nx vai no lado maior do ambiente.
// Centros das células do retângulo envolvente; células fora de ambiente
// irregular caem (o aviso de quantidade fica com quem chama).
function gradeNxNy(poligono, nx, ny) {
  if (!nx || !ny) return [];
  const xs = poligono.map(p => p[0]), ys = poligono.map(p => p[1]);
  const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
  const L = Math.max(...xs) - minX, W = Math.max(...ys) - minY;
  const [cx, cy] = L >= W ? [nx, ny] : [ny, nx];
  const pts = [];
  for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    const p = [minX + (L / cx) * (i + 0.5), minY + (W / cy) * (j + 0.5)];
    if (dentro(p, poligono)) pts.push({ x: p[0], y: p[1], rotacao: 0 });
  }
  return pts;
}

function nosCantos(poligono, n, { recuo = 0.3 } = {}) {
  if (!n) return [];
  const [cx, cy] = centroide(poligono);
  return poligono
    .map(([x, y]) => { const d = Math.hypot(cx - x, cy - y) || 1; return { x: x + ((cx - x) / d) * recuo, y: y + ((cy - y) / d) * recuo, rotacao: graus(Math.atan2(cy - y, cx - x)), dist: d }; })
    .sort((a, b) => b.dist - a.dist)
    .slice(0, n)
    .map(({ dist, ...p }) => p);
}

function centro(poligono) {
  const [x, y] = centroide(poligono);
  return dentro([x, y], poligono) ? { x, y, rotacao: 0 } : emGrade(poligono, 1e9)[0];
}

// Junto a uma porta detectada na arquitetura (arquitetura.portas):
//   lado 'fechadura' — além do batente da fechadura (interruptor, leitor, botoeira);
//   lado 'dobradica' — além da dobradiça; lado 'centro' — no meio do vão
//   (eletroímã, sensor magnético de porta).
// `fora`: do outro lado da parede (leitor de entrada fica no lado de fora do
// ambiente controlado). Base do símbolo na parede, como no perímetro.
function juntoPorta(poligono, porta, { lado = 'fechadura', fora = false, afastamento = 0.2, deslocamento = 0 } = {}) {
  const { u, n, dobradica: a, batente: b, meio } = porta;
  const base = lado === 'centro' ? meio
    : lado === 'dobradica' ? [a[0] - u[0] * afastamento, a[1] - u[1] * afastamento]
      : [b[0] + u[0] * afastamento, b[1] + u[1] * afastamento];
  const bx = base[0] + u[0] * deslocamento, by = base[1] + u[1] * deslocamento;
  // lado da parede que fica dentro deste ambiente
  for (const d of [0.2, 0.3, 0.45]) {
    for (const s of [1, -1]) {
      const p = [bx + n[0] * d * s, by + n[1] * d * s];
      if (!dentro(p, poligono)) continue;
      const sinal = fora ? -s : s;
      const dd = fora ? d + 0.15 : d;
      const nx = n[0] * sinal, ny = n[1] * sinal;
      return { x: bx + nx * dd, y: by + ny * dd, rotacao: graus(Math.atan2(ny, nx)) - 90 };
    }
  }
  return null; // além do batente há outra parede: quem chamou usa outro lado ou o perímetro
}

module.exports = { noPerimetro, emGrade, gradeComQuantidade, gradeNxNy, nosCantos, centro, juntoPorta };
