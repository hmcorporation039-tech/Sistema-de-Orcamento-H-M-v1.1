// Desenho de fabricação do quadro em DXF (AutoCAD 2018+), no padrão H&M de
// layers (skills/_comum/cad/padrao-hm.json: QD-PAINEL, QD-TRILHO,
// QD-CANALETA, QD-COMPONENTE, QD-BORNE, QD-TEXTO, QD-COTA e G- da folha):
//   - vista frontal externa (porta, fecho, dobradiças, placa de identificação,
//     advertência, dispositivos de porta, ventilação, entrada de cabos);
//   - vista lateral (profundidade);
//   - layout interno da placa de montagem: fileiras com os dispositivos na
//     ordem do unifilar, trilhos, canaletas, barramentos (barras com isoladores
//     ou pente), barras N/PE, partidas, CLP, bornes, reserva, cotas;
//   - legenda (TAG × descrição), notas e carimbo H&M (mesmo bloco HM-CARIMBO
//     das plantas: campos como atributos editáveis).
// Usa a camada de desenho comum (skills/_comum/cad/dxf.js) sem alterá-la.
// Desenho em milímetros na escala real; a folha (A3…A0) é escolhida pela
// escala de plotagem que faz caber o quadro.

const { point3d } = require('@tarikjabiri/dxf');
const { DesenhoDxf } = require('../../../_comum/cad/dxf');
const { EMPRESA } = require('../../../_comum/empresa');
const T = require('./tabelas');
// geometria das vistas: a mesma do caderno de fabricação em PDF (./caderno.js)
const { vistaFrontal, vistaLateral, vistaInterna } = require('./vistas');

const FORMATOS = [['A3', 420, 297], ['A2', 594, 420], ['A1', 841, 594], ['A0', 1189, 841]];
const ESCALAS = [5, 10, 15, 20, 25];
const fmt = (v, c = 0) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));

// Carimbo H&M: mesmo desenho do bloco HM-CARIMBO de _comum/cad/planta.js
// (180 × 90 mm de papel + 4 linhas de revisão), lá não exportado.
const mmp = (v) => v / 1000;
function definirCarimbo(d) {
  const campos = [
    ['DISCIPLINA', 140, 83, 3, 'DISCIPLINA'], ['TITULO1', 4, 72, 3.5, 'TÍTULO'], ['TITULO2', 4, 67.5, 2.5, null],
    ['CLIENTE', 4, 58.5, 2.5, 'CLIENTE'], ['OBRA', 4, 52, 2.5, 'OBRA'], ['ENDERECO', 4, 44, 2, 'ENDEREÇO'],
    ['FASE', 4, 31, 2.5, 'FASE'], ['ESCALA', 49, 31, 2.5, 'ESCALA'], ['DATA', 94, 31, 2.5, 'DATA'], ['FOLHA', 139, 31, 2.5, 'FOLHA'],
    ['REVISAO', 4, 19, 2.5, 'REVISÃO'], ['FORMATO', 49, 19, 2.5, 'FORMATO'], ['ARQUIVO', 94, 19, 2, 'ARQUIVO'],
    ['RT_NOME', 4, 8, 2, 'RESPONSÁVEL TÉCNICO'], ['RT_CREA', 4, 3, 2, null], ['ART', 64, 3, 2, 'ART'],
    ['DESENHO', 124, 10, 1.6, 'DES.'], ['PROJETO', 124, 6.5, 1.6, 'PROJ.'], ['VERIFICACAO', 152, 10, 1.6, 'VERIF.'], ['APROVACAO', 152, 6.5, 1.6, 'APROV.'],
  ];
  const revisoes = [0, 1, 2, 3].flatMap(i => [[`REV${i}_DATA`, 4, 92 + i * 6, 1.8], [`REV${i}_DESC`, 30, 92 + i * 6, 1.8], [`REV${i}_POR`, 150, 92 + i * 6, 1.8]]);
  d.bloco('HM-CARIMBO', (b) => {
    const ln = (x1, y1, x2, y2) => b.addLine(point3d(mmp(x1), mmp(y1)), point3d(mmp(x2), mmp(y2)), { layerName: '0' });
    const tx = (x, y, h, t) => b.addText(point3d(mmp(x), mmp(y)), mmp(h), t, { layerName: '0' });
    [[0, 0, 180, 0], [180, 0, 180, 120], [180, 120, 0, 120], [0, 120, 0, 0], [0, 90, 180, 90]].forEach(l => ln(...l));
    [80, 64, 50, 40, 28, 16].forEach(y => ln(0, y, 180, y));
    [45, 90, 135].forEach(x => ln(x, 28, x, 40));
    [45, 90].forEach(x => ln(x, 16, x, 28));
    ln(120, 0, 120, 16); ln(60, 0, 60, 6.5);
    [96, 102, 108, 114].forEach(y => ln(0, y, 180, y));
    ln(26, 90, 26, 120); ln(146, 90, 146, 120);
    tx(4, 83, 4.5, EMPRESA.nomeFantasia.toUpperCase());
    tx(4, 116, 1.6, 'REV. / DATA'); tx(30, 116, 1.6, 'DESCRIÇÃO DA REVISÃO'); tx(150, 116, 1.6, 'POR');
    for (const [, x, y, , rotulo] of campos) if (rotulo) tx(x, y + 4.2, 1.4, rotulo);
  }, [...campos, ...revisoes].map(([tag, x, y, h]) => ({ tag, x: mmp(x), y: mmp(y), altura: mmp(h), padrao: '' })));
}

// Adaptador: coordenadas em mm do mundo (DesenhoDxf recebe metros e grava mm)
function pincel(d) {
  const k = (v) => v / 1000;
  return {
    linha: (x1, y1, x2, y2, layer) => d.linha(k(x1), k(y1), k(x2), k(y2), layer),
    ret: (x, y, w, h, layer) => d.polilinha([[k(x), k(y)], [k(x + w), k(y)], [k(x + w), k(y + h)], [k(x), k(y + h)]], { layer, fechada: true }),
    circ: (x, y, r, layer) => d.circulo(k(x), k(y), k(r), layer),
    txt: (x, y, h, t, opts = {}) => d.texto(k(x), k(y), k(h), t, opts),
    cheio: (pts, layer) => d.hachuraSolida(pts.map(([x, y]) => [k(x), k(y)]), layer),
    poli: (pts, layer, fechada = false) => d.polilinha(pts.map(([x, y]) => [k(x), k(y)]), { layer, fechada }),
  };
}

// Tabela com textos (a tabela() de _comum/cad/dxf.js recua o texto 0,08 em unidades de
// metro — em desenho de mm o texto sairia da célula)
function tabela(p, x, y, larguras, cab, linhas, hTexto, hLinha, layer) {
  const total = larguras.reduce((s, v) => s + v, 0);
  [cab, ...linhas].forEach((lin, i) => {
    const yl = y - i * hLinha;
    p.linha(x, yl, x + total, yl, layer);
    let xc = x;
    lin.forEach((t, j) => { p.txt(xc + hTexto * 0.6, yl - hLinha / 2 - hTexto / 2, hTexto, t ?? '', { layer }); xc += larguras[j]; });
  });
  const yF = y - (linhas.length + 1) * hLinha;
  p.linha(x, yF, x + total, yF, layer);
  let xc = x;
  for (const w of [...larguras, 0]) { p.linha(xc, y, xc, yF, layer); xc += w; }
}

function legendaLinhas(calc) {
  const grupos = new Map();
  for (const k of calc.comps.lista) {
    const desc = k.descricao.replace(/ — circ\. [^—]*/, '').replace(/ — circuitos [^—]*/, '').trim();
    const chave = `${k.tipo}|${desc}`;
    if (!grupos.has(chave)) grupos.set(chave, { refs: [], desc, qtd: 0 });
    const g = grupos.get(chave);
    g.refs.push(k.ref); g.qtd += 1;
  }
  const compactar = (refs) => (refs.length > 3 ? `${refs[0]}…${refs[refs.length - 1]}` : refs.join(', '));
  const linhas = [...grupos.values()].map(g => [compactar(g.refs), g.desc, String(g.qtd)]);
  if (calc.barr.tipo === 'barra' && calc.barr.fase) linhas.push(['BARR', `Barramento ${calc.barr.fase.l}×${calc.barr.fase.e} mm Cu — L1/L2/L3${calc.barr.neutro ? ` + N ${calc.barr.neutro.l}×${calc.barr.neutro.e}` : ''}, apoios a cada ${calc.c.apoios} mm`, '1']);
  else linhas.push(['PENTE', `Barramento tipo pente ${calc.c.nFases}P ${calc.barr.pente.a} A (${calc.barr.pente.s} mm²)`, String(Math.max(1, calc.barr.fileirasPente || 1))]);
  linhas.push(['XPE', `Barra de terra ${calc.barr.pe.l}×${calc.barr.pe.e} mm (verde-amarelo)`, '1']);
  for (const g of calc.born) linhas.push([g.id, `Régua de bornes — ${g.funcao} (${g.total} + ${g.reserva} res.)`, String(g.total + g.reserva)]);
  return linhas;
}

function notasDesenho(calc) {
  const { c, inv, barr, layout, term, dpsInfo } = calc;
  const n = [
    `Conjunto conforme NBR IEC 61439-1/-2: Ue ${c.vff}/${c.vfn} V, ${c.frequencia} Hz, ${c.esquema}; In ${calc.geral.In} A; Icc ${fmt(c.icc, 1)} kA; Ipk ${fmt(c.ipk, 1)} kA; ${inv.ip} / ${inv.ik}; ${inv.formaTexto.split(' — ')[0]}.`,
    barr.tipo === 'barra' ? `Barramento de cobre ${barr.fase ? `${barr.fase.l}×${barr.fase.e} mm` : ''} em isoladores a cada ${c.apoios} mm, ${c.entreFases} mm entre centros de fase; partes vivas ≥ 10 mm entre si e ≥ 20 mm de massas (NBR 5410, 6.5.4.2).` : `Barramento tipo pente ${barr.pente.a} A nas fileiras de disjuntores; tampas nos pinos livres.`,
    `Canaletas com ocupação ≤ ${T.OCUPACAO_CANALETA * 100} %; potência na canaleta vertical esquerda e comando/sinais na direita (separação potência × comando).`,
    `Reserva: ${layout.reservaCircuitos} circuitos (NBR 5410, 6.5.4.7 e Tabela 59 / ${Math.round(c.reservaPct * 100)} %) — área tracejada.`,
    'Cores: neutro azul-claro e PE verde-amarelo (NBR 5410, 6.1.5.3); anilhas nas duas pontas; identificação dos dispositivos igual ao unifilar (6.5.4.9).',
    dpsInfo ? `DPS classe ${dpsInfo.classe}: ligações ≤ 0,5 m, DPS–PE ≥ ${dpsInfo.peMin} mm² (NBR 5410, 6.3.5.2.9).` : 'Sem DPS neste quadro (confirmar DPS a montante).',
    term.ventilacao ? `Ventilação forçada: ventilador com filtro ${term.ventilacao.ventilador} m³/h na porta (entrada embaixo, saída em cima) com termostato.` : `Elevação de temperatura por cálculo (IEC TR 60890 simplificado): ar no topo ≈ ${fmt(term.tTopo, 0)} °C.`,
    'Torque de aperto conforme os fabricantes; ensaios de rotina (NBR IEC 61439-1, seção 11) antes da expedição.',
    'Desenho gerado pelo sistema H&M — dimensões de dispositivos típicas de catálogo: conferir com os modelos comprados antes de furar a placa.',
  ];
  return n;
}

function gerarDesenho(calc, dados = {}) {
  const { c, layout } = calc;
  const env = layout.involucro;
  const placa = layout.placa;
  const H = env.altura, W = env.largura, D = env.profundidade;
  // escala: o quadro cabe em ~230 mm de altura de papel e as 3 vistas em ~360 mm
  const largVistas = W + D + W + 2 * 120;
  const esc = ESCALAS.find(e => H / e <= 230 && largVistas / e <= 380) || 25;
  const leg = legendaLinhas(calc);
  const notas = notasDesenho(calc);
  const hTxt = 2.2; // mm de papel
  const alturaLegenda = (leg.length + 1) * 5 + 10 + notas.length * 4.2 + 12;
  const papelW = 25 + largVistas / esc + 20 + 185 + 10;
  const papelH = Math.max(H / esc + 70, alturaLegenda + 120 + 20);
  const [formato, FW, FH] = FORMATOS.find(([, w, h]) => w >= papelW && h >= papelH) || FORMATOS[FORMATOS.length - 1];
  const P = (v) => v * esc; // papel → mundo (mm)

  const d = new DesenhoDxf({ unidade: 'mm', escalaPlotagem: esc });
  d.camada('QD-BARRAMENTO', 1);
  d.camada('QD-RESERVA', 8, 'HIDDEN');
  d.camada('QD-PORTA', 7);
  const p = pincel(d);
  const ht = P(hTxt);

  // folha
  p.ret(0, 0, P(FW), P(FH), 'G-FOLHA-MARGEM');
  p.ret(P(20), P(10), P(FW - 30), P(FH - 20), 'G-FOLHA-MARGEM');

  const yBase = P(30);
  // ── Vista frontal ──
  const xF = P(30);
  p.txt(xF, yBase + H + P(14), P(3.2), 'VISTA FRONTAL EXTERNA', { layer: 'QD-TEXTO' });
  p.txt(xF, yBase + H + P(9), P(2), `ESC. 1:${esc}`, { layer: 'QD-TEXTO' });
  vistaFrontal(p, calc, xF, yBase, P);

  // ── Vista lateral ──
  const xL = xF + W + 120;
  p.txt(xL, yBase + H + P(14), P(3.2), 'VISTA LATERAL', { layer: 'QD-TEXTO' });
  vistaLateral(p, calc, xL, yBase, P);

  // ── Layout interno (placa de montagem) ──
  const xI = xL + D + 120;
  p.txt(xI, yBase + H + P(14), P(3.2), 'LAYOUT INTERNO — PLACA DE MONTAGEM', { layer: 'QD-TEXTO' });
  p.txt(xI, yBase + H + P(9), P(2), `ESC. 1:${esc} — placa ${placa.altura} × ${placa.largura} mm`, { layer: 'QD-TEXTO' });
  vistaInterna(p, calc, xI, yBase, P);

  // ── Legenda, notas e carimbo (coluna da direita) ──
  const xR = P(FW - 10 - 185);
  let yR = P(FH - 16);
  p.txt(xR, yR, P(3), 'LEGENDA', { layer: 'G-LEGENDA' });
  yR -= P(3);
  tabela(p, xR, yR, [P(24), P(146), P(12)], ['TAG', 'DESCRIÇÃO', 'QTD'],
    leg.map(l => [l[0], l[1].length > 92 ? `${l[1].slice(0, 90)}…` : l[1], l[2]]), P(1.6), P(4.6), 'G-LEGENDA');
  yR -= P(4.6) * (leg.length + 1) + P(8);
  p.txt(xR, yR, P(3), 'NOTAS', { layer: 'G-NOTA' });
  yR -= P(5);
  notas.forEach((t, i) => {
    const linhas = [];
    let s = `${i + 1}. ${t}`;
    while (s.length > 118) { const corte = s.lastIndexOf(' ', 118); linhas.push(s.slice(0, corte)); s = `   ${s.slice(corte + 1)}`; }
    linhas.push(s);
    linhas.forEach(l => { p.txt(xR, yR, P(1.6), l, { layer: 'G-NOTA' }); yR -= P(3.2); });
    yR -= P(0.8);
  });
  // carimbo
  definirCarimbo(d);
  d.inserir('HM-CARIMBO', xR / 1000 - P(0) / 1000, P(12) / 1000, {
    layer: 'G-CARIMBO', escala: esc,
    atributos: {
      DISCIPLINA: 'QUADROS', TITULO1: `${c.tag} — ${c.tipoRotulo}`.toUpperCase().slice(0, 60), TITULO2: 'VISTA FRONTAL, LATERAL E LAYOUT INTERNO — FABRICAÇÃO',
      CLIENTE: dados.cliente?.nome || '', OBRA: dados.obra?.nome || '', ENDERECO: [dados.cliente?.endereco, dados.cliente?.cidade, dados.cliente?.uf].filter(Boolean).join(' — '),
      FASE: 'PROJETO DE FABRICAÇÃO', ESCALA: `1:${esc}`, DATA: dados.meta?.data ? String(dados.meta.data).split('-').reverse().join('/') : '', FOLHA: '01/01',
      REVISAO: dados.meta?.revisao || 'R00', FORMATO: formato, ARQUIVO: '',
      RT_NOME: dados.responsavel?.nome || '', RT_CREA: dados.responsavel?.crea ? `CREA ${dados.responsavel.crea}` : '', ART: dados.responsavel?.art || '',
      DESENHO: 'Sistema H&M', PROJETO: '',
      REV0_DATA: dados.meta?.data ? String(dados.meta.data).split('-').reverse().join('/') : '', REV0_DESC: 'Emissão inicial gerada pelo sistema — revisar antes de fabricar', REV0_POR: 'H&M',
    },
  });
  return { dxf: d.toString(), escala: esc, formato, folha: [FW, FH] };
}

module.exports = { gerarDesenho, legendaLinhas, notasDesenho };
