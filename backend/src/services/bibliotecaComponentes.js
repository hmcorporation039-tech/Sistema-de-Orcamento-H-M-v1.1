// Biblioteca de componentes por disciplina (versão 2.30): o que o engenheiro pode INSERIR na planta de um projeto
// analisado (Mapa do CAD) e que vai junto para o orçamento e para o 3D. Cada componente é um tipo de ponto do sistema
// (o mesmo que o 3D e o orçamento entendem: services/mapaCad.tiposDisponiveis) com
//   - o SÍMBOLO de planta da H&M (skills/_comum/cad/simbolos.js, o mesmo bloco do DXF que a H&M entrega), traduzido
//     para SVG — a tela desenha exatamente o símbolo da legenda, não uma bolinha;
//   - a altura de instalação típica e a montagem (teto, parede, piso, canto, topo da porta) do 3D (modelo3d.js ESPEC).
// A altura típica é a do modelo do sistema, não norma: na tela ela aparece como sugestão e o engenheiro troca.
const path = require('path');
const { CAD } = require('../config/caminhos');
const { SIMBOLOS } = require(path.join(CAD, 'simbolos.js'));
const { ESPEC } = require(path.join(CAD, 'modelo3d.js'));
const { tiposDisponiveis } = require('./mapaCad');

const r3 = (v) => Math.round(v * 1000) / 1000;

// O desenho do bloco é uma função que chama addLine / addCircle / addText (biblioteca do DXF). Aqui um "bloco" de
// mentira guarda cada traço; o SVG sai com o eixo y invertido (no desenho y sobe, na tela desce).
// tipos do 3D que não têm bloco de planta na biblioteca H&M: desenho próprio, no mesmo estilo
const SEM_BLOCO = {
  'HM-ILU-POSTE': { d: 'M-0.15 0a0.15 0.15 0 1 0 0.3 0a0.15 0.15 0 1 0 -0.3 0M0 0L0.35 -0.25M0.25 -0.32L0.45 -0.18', textos: [], raio: 0.45 },
  'HM-ELE-CAIXA-PISO': { d: 'M-0.15 -0.15L0.15 -0.15L0.15 0.15L-0.15 0.15L-0.15 -0.15M-0.15 -0.15L0.15 0.15M-0.15 0.15L0.15 -0.15', textos: [], raio: 0.15 },
  'HM-ELE-PONTO': { d: 'M-0.18 0.108L0.18 0.108L0 -0.162L-0.18 0.108', textos: [{ x: -0.05, y: 0.08, h: 0.1, t: '?' }], raio: 0.18 },
};

function svgDoSimbolo(simbolo) {
  if (SEM_BLOCO[simbolo]) return SEM_BLOCO[simbolo];
  const s = SIMBOLOS[simbolo];
  if (!s || typeof s.desenhar !== 'function') return null;
  const linhas = [], circulos = [], textos = [];
  const bloco = {
    addLine: (a, b) => linhas.push([a.x, a.y, b.x, b.y]),
    addCircle: (c, r) => circulos.push([c.x, c.y, r]),
    addText: (p, h, t) => textos.push([p.x, p.y, h, String(t)]),
    addArc: (c, r) => circulos.push([c.x, c.y, r]),
    addLWPolyline: (pts) => (pts || []).slice(1).forEach((p, i) => linhas.push([pts[i].point?.x ?? pts[i].x, pts[i].point?.y ?? pts[i].y, p.point?.x ?? p.x, p.point?.y ?? p.y])),
  };
  try { s.desenhar(bloco); } catch { return null; }
  if (!linhas.length && !circulos.length && !textos.length) return null;
  // traços seguidos viram um caminho só (M x y L x y …)
  let d = '';
  let fim = null;
  for (const [x0, y0, x1, y1] of linhas) {
    if (!fim || Math.abs(fim[0] - x0) > 1e-6 || Math.abs(fim[1] - y0) > 1e-6) d += `M${r3(x0)} ${r3(-y0)}`;
    d += `L${r3(x1)} ${r3(-y1)}`;
    fim = [x1, y1];
  }
  for (const [x, y, r] of circulos) d += `M${r3(x - r)} ${r3(-y)}a${r3(r)} ${r3(r)} 0 1 0 ${r3(2 * r)} 0a${r3(r)} ${r3(r)} 0 1 0 ${r3(-2 * r)} 0`;
  const xs = [...linhas.flatMap(l => [l[0], l[2]]), ...circulos.flatMap(c => [c[0] - c[2], c[0] + c[2]]), ...textos.flatMap(t => [t[0], t[0] + t[2] * t[3].length * 0.7])];
  const ys = [...linhas.flatMap(l => [l[1], l[3]]), ...circulos.flatMap(c => [c[1] - c[2], c[1] + c[2]]), ...textos.flatMap(t => [t[1], t[1] + t[2]])];
  const raio = Math.max(...xs.map(Math.abs), ...ys.map(Math.abs), 0.05);
  return {
    d,
    // texto do símbolo ("F" do detector, "AP", "DG"): na tela fica no mesmo lugar e tamanho do DXF
    textos: textos.map(([x, y, h, t]) => ({ x: r3(x), y: r3(-y), h: r3(h), t: t.slice(0, 6) })),
    raio: r3(raio),
  };
}

// montagem e altura típica (m, no centro do aparelho) pelo 3D
function instalacao(simbolo) {
  const h = ESPEC[simbolo]?.h;
  if (typeof h === 'number') return { montagem: 'parede', altura_m: h };
  return { montagem: h || 'parede', altura_m: null };
}

let emCache = null;
// [{ simbolo, nome, disciplina, montagem, altura_m, svg: { d, textos, raio } | null }] em ordem de disciplina e nome
function componentes() {
  if (!emCache) emCache = tiposDisponiveis().map(t => ({ ...t, ...instalacao(t.simbolo), svg: svgDoSimbolo(t.simbolo) }));
  return emCache;
}
const componente = (simbolo) => componentes().find(c => c.simbolo === simbolo) || null;

module.exports = { componentes, componente, svgDoSimbolo, instalacao };
