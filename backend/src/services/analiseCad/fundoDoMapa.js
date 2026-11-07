// Desenho de fundo da planta do mapa do CAD (tela de confirmação). Antes a tela só tinha o contorno dos ambientes e
// os pontos: numa subestação sem ambientes fechados eram pontos soltos num quadro vazio, sem ter como saber o que
// cada um era (03/11/2026). Agora vão os traços da planta (paredes, portas, equipamentos, os próprios símbolos), em
// metros, sem o que não é planta (unifilar, vista do quadro, quadro de cargas, carimbo) e simplificados para caber na
// análise guardada. Formato compacto: { layers: [nome], linhas: [[iLayer, x0, y0, x1, y1, …]], cortados }.
const MAX_VERTICES = 30000;
// Simplificação em níveis, do mais fino ao mais grosso; vale o primeiro que cabe. passo: vértice a menos disso do
// anterior sai (o arco vira poucos segmentos); minimo: traço mais curto que isso sai (miudeza de símbolo e hachura —
// metade dos traços de um DWG real tem menos de 1 cm, e o símbolo já aparece como ponto colorido na tela).
// Antes era "os mais longos primeiro" até a cota: num DWG com cinco plantas na folha, só a primeira ficava com parede.
const NIVEIS = [{ passo: 0.04, minimo: 0.15 }, { passo: 0.08, minimo: 0.3 }, { passo: 0.1, minimo: 0.5 }, { passo: 0.2, minimo: 1 }];
const r2 = (v) => Math.round(v * 100) / 100;
const valido = (p) => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]);

// Região do fundo: em volta dos pontos do mapa e dos ambientes, com folga. Caso real (03/11/2026): o unifilar de um
// DWG de elétrica estava a 110 km da planta, fora das regiões que o classificador marca; os barramentos, por serem
// os traços mais longos, tomavam a cota de vértices e a planta ficava sem paredes.
function regiaoDeInteresse(centros = [], poligonos = []) {
  const pts = [...centros, ...poligonos.flat()].filter(valido);
  if (!pts.length) return null;
  // laço e não Math.min(...xs): com centenas de milhares de vértices o espalhamento estoura a pilha (RangeError)
  const c = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x, y] of pts) {
    if (x < c[0]) c[0] = x;
    if (y < c[1]) c[1] = y;
    if (x > c[2]) c[2] = x;
    if (y > c[3]) c[3] = y;
  }
  const folga = Math.max(10, Math.max(c[2] - c[0], c[3] - c[1]) * 0.15);
  return [c[0] - folga, c[1] - folga, c[2] + folga, c[3] + folga];
}

// referencia: [{ pts: [[x, y]], fechada, layer }] em metros (skills/_comum/cad/arquitetura.js → referencia)
// regioesFora: caixas [x0, y0, x1, y1] das regiões que não são planta; regiao: só o que tem vértice dentro dela
function simplificar(tracos, { passo, minimo }) {
  const saida = [];
  let vertices = 0;
  for (const r of tracos) {
    const pts = r.pts;
    const enxuto = [pts[0]];
    let comprimento = 0;
    for (let i = 1; i < pts.length; i++) {
      const u = enxuto[enxuto.length - 1];
      const d = Math.hypot(pts[i][0] - u[0], pts[i][1] - u[1]);
      if (d >= passo || i === pts.length - 1) { enxuto.push(pts[i]); comprimento += d; }
    }
    if (comprimento < Math.max(minimo, passo)) continue;
    if (r.fechada && enxuto.length > 2) enxuto.push(enxuto[0]);
    saida.push({ layer: r.layer, pts: enxuto, comprimento });
    vertices += enxuto.length;
  }
  return { saida, vertices };
}

function fundoDoMapa(referencia, regioesFora = [], regiao = null) {
  const fora = ([x, y]) => regioesFora.some(c => x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3]);
  const naRegiao = ([x, y]) => !regiao || (x >= regiao[0] && x <= regiao[2] && y >= regiao[1] && y <= regiao[3]);
  const tracos = [];
  for (const r of referencia || []) {
    const pts = (r.pts || []).filter(valido);
    if (pts.length < 2 || pts.every(fora) || !pts.some(naRegiao)) continue;
    tracos.push({ layer: String(r.layer || '0'), pts, fechada: !!r.fechada });
  }
  // o primeiro nível que cabe — se ele não deixar nenhum traço (desenho só de traços curtos), fica o anterior
  let nivel = null;
  for (const n of NIVEIS) {
    const s = simplificar(tracos, n);
    if (s.vertices <= MAX_VERTICES) { if (s.saida.length || !nivel) nivel = s; break; }
    nivel = s;
  }
  // o que ainda não cabe: ficam os traços mais longos (paredes, contornos)
  const candidatos = nivel ? nivel.saida.sort((a, b) => b.comprimento - a.comprimento) : [];
  const layers = [];
  const indice = new Map();
  const linhas = [];
  let vertices = 0;
  let cortados = 0;
  for (const c of candidatos) {
    if (vertices + c.pts.length > MAX_VERTICES) { cortados++; continue; }
    vertices += c.pts.length;
    if (!indice.has(c.layer)) { indice.set(c.layer, layers.length); layers.push(c.layer); }
    linhas.push([indice.get(c.layer), ...c.pts.flatMap(([x, y]) => [r2(x), r2(y)])]);
  }
  return linhas.length ? { layers, linhas, cortados } : null;
}

// Caixa de enquadramento pelos percentis 2–98 % dos vértices e pontos: um traço ou ponto perdido longe do desenho
// (caso real: um ponto isolado no rodapé da folha) não deixa a planta pequena no canto da tela
function caixaPrincipal(xs, ys) {
  if (!xs.length) return null;
  const q = (v, f) => { const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.floor(f * (s.length - 1))))]; };
  const caixa = [q(xs, 0.02), q(ys, 0.02), q(xs, 0.98), q(ys, 0.98)];
  const folga = Math.max(caixa[2] - caixa[0], caixa[3] - caixa[1], 1) * 0.04;
  return [r2(caixa[0] - folga), r2(caixa[1] - folga), r2(caixa[2] + folga), r2(caixa[3] + folga)];
}

module.exports = { fundoDoMapa, regiaoDeInteresse, caixaPrincipal, MAX_VERTICES };
