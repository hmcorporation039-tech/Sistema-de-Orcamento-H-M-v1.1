// Prancha de UM pavimento com o projeto sugerido pelo sistema (versão 2.46, 18/11/2026) — "gerar a prancha DXF/PDF de
// cada pavimento com o projeto desenhado, pronta para entrega". A arquitetura do pavimento (recortada pela caixa dele,
// ./pavimentos.js) vai em cinza (ARQ-BASE), os componentes nas layers da H&M com os blocos da biblioteca
// (./simbolos.js), o traçado da infraestrutura nas layers do projetista, a legenda com o quantitativo do pavimento, os
// critérios/notas e o carimbo H&M (./planta.js). O mesmo desenho sai em SVG para o PDF (o backend monta a folha).
// Os componentes e traçados são os da análise já com as edições do engenheiro (inserir/retirar no 3D).
//
//   pranchaDoPavimento({ arquitetura, pavimento, dispositivos, trechos, notas, carimbo })
//     → { dxf, svg, quantitativo: [{ simbolo, legenda, quantidade }], pavimento, caixa }
const { DesenhoDxf } = require('./dxf');
const { SIMBOLOS, definirSimbolos, legenda } = require('./simbolos');
const { desenharReferencia, carimbo } = require('./planta');
const { recortarArquitetura, DISCIPLINAS } = require('./modelo3d');
const { escapeHtml } = require('../base/html');

const naCaixa = (c, x, y, m = 0.5) => x >= c[0] - m && x <= c[2] + m && y >= c[1] - m && y <= c[3] + m;
// no papel branco: o cinza-claro do SPDA some — vai em grafite
const corDe = (disc) => (disc === 'spda' ? '#4a4f55' : (DISCIPLINAS[disc] || { cor: '#888888' }).cor);

function pranchaDoPavimento({ arquitetura, pavimento = '', dispositivos = [], trechos = [], notas = [], carimbo: dadosCarimbo = {}, escalaPlotagem = 50 }) {
  const pavs = arquitetura.pavimentos || [];
  const pav = pavimento ? pavs.find(p => p.nome === pavimento) : (pavs.length === 1 ? pavs[0] : null);
  if (pavimento && !pav) throw new Error(`O pavimento "${pavimento}" não está na arquitetura (pavimentos lidos: ${pavs.map(p => p.nome).join(', ') || 'nenhum'}).`);
  const arq = pav ? recortarArquitetura(arquitetura, pav.caixa) : arquitetura;
  const ext = arquitetura.extensao || { min: [0, 0], max: [100, 100] };
  const caixa = pav ? pav.caixa : [ext.min[0], ext.min[1], ext.max[0], ext.max[1]];
  const disps = dispositivos.filter(d => Number.isFinite(d.x) && Number.isFinite(d.y) && naCaixa(caixa, d.x, d.y));
  const segs = trechos.flatMap(t => (t.segmentos || []).filter(s => naCaixa(caixa, s[0], s[1]) || naCaixa(caixa, s[2], s[3])).map(s => ({ s, t })));

  // ── DXF ──
  const d = new DesenhoDxf({ unidade: 'mm', escalaPlotagem });
  const usados = [...new Set(disps.map(x => x.simbolo).filter(s => SIMBOLOS[s]))];
  definirSimbolos(d, usados);
  desenharReferencia(d, arq);
  const contagem = {};
  d.camada('G-COMPONENTE', 7);
  for (const x of disps) {
    if (SIMBOLOS[x.simbolo]) {
      d.inserir(x.simbolo, x.x, x.y, { layer: SIMBOLOS[x.simbolo].layer, rotacao: x.rotacao || 0, atributos: { ID: x.id || '', ...(x.circuito ? { CIRCUITO: String(x.circuito) } : {}) } });
    } else {
      d.circulo(x.x, x.y, 0.15, 'G-COMPONENTE');
      d.texto(x.x + 0.2, x.y, 0.1, String(x.rotulo || x.simbolo).slice(0, 40), { layer: 'G-COMPONENTE' });
    }
    contagem[x.simbolo] = (contagem[x.simbolo] || 0) + 1;
  }
  for (const { s, t } of segs) {
    const layer = String(t.layer || `HM-${String(t.disciplina || 'INFRA').toUpperCase()}-${String(t.tipo || 'ELETRODUTO').toUpperCase()}`).slice(0, 60);
    d.camada(layer, 3);
    d.linha(s[0], s[1], s[2], s[3], layer);
  }
  const quantitativo = Object.entries(contagem).map(([simbolo, quantidade]) => ({ simbolo, legenda: SIMBOLOS[simbolo]?.legenda || simbolo, quantidade }))
    .sort((a, b) => a.legenda.localeCompare(b.legenda, 'pt-BR'));
  const x0 = caixa[2] + 3, yMax = caixa[3];
  const { altura } = legenda(d, x0, yMax, quantitativo.filter(q => SIMBOLOS[q.simbolo]).map(q => ({ simbolo: q.simbolo, quantidade: q.quantidade })), { titulo: `LEGENDA — ${pav ? pav.nome.toUpperCase() : 'PLANTA'}` });
  let y = yMax - altura - 1;
  const todasNotas = ['Projeto SUGERIDO pelo sistema H&M a partir da arquitetura — conferir e completar antes de emitir.', ...notas].slice(0, 14);
  d.camada('G-NOTA', 7);
  d.texto(x0, y, 0.22, 'NOTAS', { layer: 'G-NOTA' });
  todasNotas.forEach((n, i) => d.texto(x0, y - 0.45 - i * 0.35, 0.13, `${i + 1}. ${String(n).slice(0, 180)}`, { layer: 'G-NOTA' }));
  y -= 0.8 + todasNotas.length * 0.35;
  carimbo(d, x0, Math.min(caixa[1], y - (120 / 1000) * escalaPlotagem - 0.5), { subtitulo: `PLANTA BAIXA — ${pav ? pav.nome.toUpperCase() : 'PAVIMENTO'} — PROJETO SUGERIDO`, ...dadosCarimbo }, escalaPlotagem);

  return { dxf: d.toString(), svg: svgDaPrancha({ arq, caixa, disps, segs }), quantitativo, pavimento: pav ? pav.nome : null, caixa };
}

// SVG do pavimento (arquitetura cinza, traçado e componentes coloridos pela disciplina), para o PDF
function svgDaPrancha({ arq, caixa, disps, segs }) {
  const [x0, y0, x1, y1] = caixa;
  const L = Math.max(1, x1 - x0), H = Math.max(1, y1 - y0);
  const f = (v) => Math.round(v * 100) / 100;
  const X = (x) => f(x - x0), Y = (y) => f(y1 - y);
  const linhas = [];
  for (const r of arq.referencia || []) {
    const pts = r.pts || [];
    if (r.tipo === 'circulo' && Number.isFinite(r.x)) linhas.push(`<circle cx="${X(r.x)}" cy="${Y(r.y)}" r="${f(r.r)}"/>`);
    else if (pts.length >= 2) linhas.push(`<polyline points="${pts.map(p => `${X(p[0])},${Y(p[1])}`).join(' ')}${r.fechada ? ` ${X(pts[0][0])},${Y(pts[0][1])}` : ''}"/>`);
  }
  const nomes = (arq.ambientes || []).filter(a => !a.semNome && a.centro).map(a => `<text x="${X(a.centro[0])}" y="${Y(a.centro[1])}" font-size="${f(Math.min(0.5, Math.max(0.18, Math.sqrt(a.area_m2 || 4) / 14)))}" text-anchor="middle" fill="#666">${escapeHtml(a.nome)}</text>`);
  const tracado = segs.map(({ s, t }) => `<line x1="${X(s[0])}" y1="${Y(s[1])}" x2="${X(s[2])}" y2="${Y(s[3])}" stroke="${corDe(t.disciplina)}" stroke-width="${t.tipo === 'eletrocalha' ? 0.12 : 0.05}"${t.tipo === 'fiacao' ? ' stroke-dasharray="0.3 0.2"' : ''}/>`);
  const pontos = disps.map(p => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="0.16" fill="${corDe(p.disciplina)}" stroke="#222" stroke-width="0.02"><title>${escapeHtml(p.rotulo || p.simbolo)}</title></circle>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${f(L + 2)} ${f(H + 2)}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">`
    + `<g fill="none" stroke="#9a9a9a" stroke-width="0.025">${linhas.join('')}</g><g>${nomes.join('')}</g><g>${tracado.join('')}</g><g>${pontos.join('')}</g></svg>`;
}

module.exports = { pranchaDoPavimento, svgDaPrancha };
