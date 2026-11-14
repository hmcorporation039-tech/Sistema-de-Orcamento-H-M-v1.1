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
const { tiposDisponiveis, chaveDoProjeto } = require('./mapaCad');

const r3 = (v) => Math.round(v * 1000) / 1000;

// O desenho do bloco é uma função que chama addLine / addCircle / addText (biblioteca do DXF). Aqui um "bloco" de
// mentira guarda cada traço; o SVG sai com o eixo y invertido (no desenho y sobe, na tela desce).
// tipos do 3D que não têm bloco de planta na biblioteca H&M: desenho próprio, no mesmo estilo
const SEM_BLOCO = {
  'HM-ILU-POSTE': { d: 'M-0.15 0a0.15 0.15 0 1 0 0.3 0a0.15 0.15 0 1 0 -0.3 0M0 0L0.35 -0.25M0.25 -0.32L0.45 -0.18', textos: [], raio: 0.45 },
  'HM-ELE-CAIXA-PISO': { d: 'M-0.15 -0.15L0.15 -0.15L0.15 0.15L-0.15 0.15L-0.15 -0.15M-0.15 -0.15L0.15 0.15M-0.15 0.15L0.15 -0.15', textos: [], raio: 0.15 },
  'HM-ELE-PONTO': { d: 'M-0.18 0.108L0.18 0.108L0 -0.162L-0.18 0.108', textos: [{ x: -0.05, y: 0.08, h: 0.1, t: '?' }], raio: 0.18 },
};

// Equipamentos da biblioteca do 3D (subestação, abrigo — skills/_comum/cad/equipamentos3d.js, 09/11/2026): sem bloco
// de planta na H&M; o símbolo é o retângulo da planta do equipamento (limitado a 0,15–0,6 m de meio-lado, para caber na
// tela do mapa) com a sigla dentro
const SIGLA_EQ = {
  TRANSFORMADOR: 'TR', SECCIONADORA: 'SC', MUFLA: 'MF', 'PARA-RAIOS': 'PR', 'CHAVE-FUSIVEL': 'CF', POSTE: 'PT', CRUZETA: 'CZ', ISOLADOR: 'IS',
  'CABO-MT': 'CB', ELETRODUTO: 'ED', POCO: 'PP', 'DISJUNTOR-MT': 'DJ', RELE: 'RL', TC: 'TC', TP: 'TP', MEDICAO: 'MD', QGBT: 'QG', BARRAMENTO: 'BR',
  CUBICULO: 'CU', HASTE: 'H', CORDOALHA: 'CD', 'CAIXA-INSPECAO': 'CI', TAPETE: 'TA', EXTINTOR: 'EX', PLACA: 'PL', TELA: 'TL', VENEZIANA: 'VZ', CANALETA: 'CN', GENERICO: '?',
};
function svgDoEquipamento(simbolo) {
  const m = /^HM-EQ-(.+)$/.exec(simbolo);
  if (!m) return null;
  const tam = ESPEC[simbolo]?.tam || [0.4, 0.4, 0.4];
  const meio = (v) => Math.min(0.6, Math.max(0.15, (Number(v) || 0.4) / 2));
  const a = r3(meio(tam[0])), b = r3(meio(tam[1]));
  const t = SIGLA_EQ[m[1]] || m[1].slice(0, 2);
  const h = r3(Math.min(a, b) * 0.8);
  return { d: `M${-a} ${-b}L${a} ${-b}L${a} ${b}L${-a} ${b}L${-a} ${-b}`, textos: [{ x: r3(-h * 0.35 * t.length), y: r3(h * 0.4), h, t }], raio: r3(Math.max(a, b)) };
}

function svgDoSimbolo(simbolo) {
  if (SEM_BLOCO[simbolo]) return SEM_BLOCO[simbolo];
  if (/^HM-EQ-/.test(simbolo)) return svgDoEquipamento(simbolo);
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

// Disciplinas DE PROJETO (utils/disciplinasProjeto: as que o engenheiro marca no envio) que usam o componente (14/11/2026:
// "coloque apenas os componentes que correspondem à disciplina usada, com a opção de chamar os de outras"). A disciplina
// do 3D é mais grossa que a do projeto: a tomada é "eletrica" no 3D e serve à predial, à hospitalar e à industrial; os
// equipamentos da subestação (HM-EQ-*) são da média tensão; a luminária entra também no projeto elétrico.
const ELETRICAS = ['eletrica', 'eletrica_hospitalar', 'eletrica_industrial'];
const ATERRAMENTO = new Set(['HM-EQ-HASTE', 'HM-EQ-CORDOALHA', 'HM-EQ-CAIXA-INSPECAO']);
const A_MAIS = { 'HM-ELE-QUADRO': ['quadros', 'media_tensao'], 'HM-AUT-CONTROLADOR': ['climatizacao'], 'HM-PRZ-PAINEL': ['incendio'] };
function disciplinasDoComponente(simbolo, disciplina) {
  let base;
  if (/^HM-EQ-/.test(simbolo)) base = ['media_tensao', 'eletrica_industrial', ...(ATERRAMENTO.has(simbolo) ? ['spda'] : [])];
  else if (disciplina === 'eletrica') base = ELETRICAS;
  else if (disciplina === 'iluminacao' || disciplina === 'iluminacao-externa') base = ['iluminacao', ...ELETRICAS];
  else if (disciplina === 'rede') base = ['cabeamento', 'rede'];
  else base = [chaveDoProjeto(disciplina) || disciplina];
  return [...new Set([...base, ...(A_MAIS[simbolo] || [])])];
}

let emCache = null;
// [{ simbolo, nome, disciplina, disciplinas, montagem, altura_m, svg: { d, textos, raio } | null }] em ordem de
// disciplina e nome (disciplinas = as de projeto que usam o componente)
function componentes() {
  if (!emCache) emCache = tiposDisponiveis().map(t => ({ ...t, disciplinas: disciplinasDoComponente(t.simbolo, t.disciplina), ...instalacao(t.simbolo), svg: svgDoSimbolo(t.simbolo) }));
  return emCache;
}
const componente = (simbolo) => componentes().find(c => c.simbolo === simbolo) || null;

module.exports = { componentes, componente, svgDoSimbolo, instalacao, disciplinasDoComponente };
