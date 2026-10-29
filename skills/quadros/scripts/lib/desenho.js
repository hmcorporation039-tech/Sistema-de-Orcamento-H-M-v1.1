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
const { posicoesPorta } = require('./porta');

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

// Cota simples (linha + traços + texto), sem cota associativa (ver _comum/cad/dxf.js)
function cota(p, x1, y1, x2, y2, texto, h, { lado = 1 } = {}) {
  const horizontal = Math.abs(y2 - y1) < 1e-6;
  const off = 1.2 * h * lado;
  if (horizontal) {
    p.linha(x1, y1 + off, x2, y2 + off, 'QD-COTA');
    p.linha(x1, y1, x1, y1 + off * 1.3, 'QD-COTA');
    p.linha(x2, y2, x2, y2 + off * 1.3, 'QD-COTA');
    [x1, x2].forEach(x => p.linha(x - h * 0.3, y1 + off - h * 0.3, x + h * 0.3, y1 + off + h * 0.3, 'QD-COTA'));
    p.txt((x1 + x2) / 2, y1 + off + h * 0.7 * lado, h, texto, { layer: 'QD-COTA', alinhar: 'centro' });
  } else {
    p.linha(x1 + off, y1, x2 + off, y2, 'QD-COTA');
    p.linha(x1, y1, x1 + off * 1.3, y1, 'QD-COTA');
    p.linha(x2, y2, x2 + off * 1.3, y2, 'QD-COTA');
    [y1, y2].forEach(y => p.linha(x1 + off - h * 0.3, y - h * 0.3, x1 + off + h * 0.3, y + h * 0.3, 'QD-COTA'));
    p.txt(x1 + off - h * 0.7 * lado, (y1 + y2) / 2, h, texto, { layer: 'QD-COTA', alinhar: 'centro', rotacao: 90 });
  }
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

// Texto curto do dispositivo (dentro do retângulo)
function rotuloItem(k) {
  if (k.tipo === 'disjuntor' || k.tipo === 'disjuntor_geral' || k.tipo === 'ddr') return `${k.ref} ${k.In ? `${k.In}A` : ''}`.trim();
  if (k.tipo === 'idr') return `${k.ref} ${k.In}A`;
  if (k.tipo === 'reserva') return 'RESERVA';
  return k.ref;
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
  p.ret(xF, yBase, W, H, 'QD-PAINEL');
  p.ret(xF + 12, yBase + 12, W - 24, H - 24, 'QD-PORTA');
  // dobradiças (esquerda) e fecho (direita)
  [0.15, 0.5, 0.85].filter((f, i) => H > 700 || i !== 1).forEach(f => p.ret(xF - 6, yBase + H * f - 30, 8, 60, 'QD-PORTA'));
  const PT = posicoesPorta(calc);
  p.ret(xF + PT.fecho.x, yBase + PT.fecho.y, PT.fecho.l, PT.fecho.a, 'QD-PORTA');
  p.circ(xF + W - 39, yBase + H / 2 + 40, 7, 'QD-PORTA');
  // placa de identificação e advertência
  p.ret(xF + PT.placa.x, yBase + PT.placa.y, PT.placa.l, PT.placa.a, 'QD-PORTA');
  p.txt(xF + W / 2, yBase + PT.placa.y + 20, Math.min(18, P(2.2)), c.tag, { layer: 'QD-TEXTO', alinhar: 'centro' });
  const tri = PT.aviso.l;
  const xa = xF + PT.aviso.x, ya = yBase + PT.aviso.y;
  p.poli([[xa, ya], [xa + tri, ya], [xa + tri / 2, ya + tri * 0.87]], 'QD-PORTA', true);
  p.txt(xa + tri / 2, ya + tri * 0.3, tri * 0.4, '!', { layer: 'QD-TEXTO', alinhar: 'centro' });
  // dispositivos de porta (mesma posição do modelo 3D: ./porta.js)
  if (PT.ihm) {
    const ihm = PT.ihm;
    p.ret(xF + ihm.x, yBase + ihm.y, ihm.l, ihm.a, 'QD-PORTA');
    p.ret(xF + ihm.x + 10, yBase + ihm.y + 15, ihm.l - 20, ihm.a - 25, 'QD-PORTA');
    p.txt(xF + W / 2, yBase + ihm.y + ihm.a / 2, Math.min(ihm.a * 0.15, P(2.5)), ihm.rotulo, { layer: 'QD-TEXTO', alinhar: 'centro' });
  }
  for (const b of PT.botoes) {
    const cx = xF + b.cx, cy = yBase + b.cy;
    p.circ(cx, cy, b.d / 2 + 5, 'QD-PORTA');
    p.circ(cx, cy, b.d / 2, 'QD-COMPONENTE');
    if (b.tipo === 'emergencia') p.ret(cx - 32, cy - 32, 64, 64, 'QD-PORTA');
    p.txt(cx, cy - b.d / 2 - 14, Math.min(9, P(1.2)), b.rotulo, { layer: 'QD-TEXTO', alinhar: 'centro' });
  }
  // ventilação
  for (const g of PT.grelhas) {
    p.ret(xF + g.x, yBase + g.y, g.l, g.a, 'QD-PORTA');
    for (let i = 1; i < 6; i++) p.linha(xF + g.x + 8, yBase + g.y + i * g.a / 6, xF + g.x + g.l - 8, yBase + g.y + i * g.a / 6, 'QD-PORTA');
    p.txt(xF + g.x + g.l / 2, yBase + g.y - 14, Math.min(9, P(1.2)), g.rotulo, { layer: 'QD-TEXTO', alinhar: 'centro' });
  }
  // entrada de cabos
  const yEnt = c.entradaCabos === 'inferior' ? yBase - 30 : yBase + H + 5;
  p.ret(xF + W * 0.2, yEnt, W * 0.6, 25, 'QD-RESERVA');
  p.txt(xF + W / 2, yEnt + 12, Math.min(12, P(1.4)), `ENTRADA DE CABOS (${c.entradaCabos.toUpperCase()})`, { layer: 'QD-TEXTO', alinhar: 'centro' });
  cota(p, xF, yBase, xF + W, yBase, `${W}`, P(2), { lado: -1 });
  cota(p, xF, yBase, xF, yBase + H, `${H}`, P(2), { lado: -1 });
  if (yEnt < yBase) { /* a cota inferior já desce abaixo da entrada */ }

  // ── Vista lateral ──
  const xL = xF + W + 120;
  p.txt(xL, yBase + H + P(14), P(3.2), 'VISTA LATERAL', { layer: 'QD-TEXTO' });
  p.ret(xL, yBase, D, H, 'QD-PAINEL');
  p.linha(xL + D - 20, yBase + 12, xL + D - 20, yBase + H - 12, 'QD-PORTA');
  p.linha(xL + 15, yBase + 30, xL + 15, yBase + H - 30, 'QD-TRILHO'); // placa de montagem
  cota(p, xL, yBase, xL + D, yBase, `${D}`, P(2), { lado: -1 });

  // ── Layout interno (placa de montagem) ──
  const xI = xL + D + 120;
  p.txt(xI, yBase + H + P(14), P(3.2), 'LAYOUT INTERNO — PLACA DE MONTAGEM', { layer: 'QD-TEXTO' });
  p.txt(xI, yBase + H + P(9), P(2), `ESC. 1:${esc} — placa ${placa.altura} × ${placa.largura} mm`, { layer: 'QD-TEXTO' });
  p.ret(xI, yBase, W, H, 'QD-PAINEL');
  const px = xI + (W - placa.largura) / 2;
  const pyTopo = yBase + H - (H - placa.altura) / 2; // topo da placa (y para cima)
  p.ret(px, pyTopo - placa.altura, placa.largura, placa.altura, 'QD-PAINEL');
  const Y = (yDown) => pyTopo - yDown; // y da placa (para baixo) → mundo
  const vE = layout.verticais.esquerda, vD = layout.verticais.direita;
  const xUtil = px + layout.x0;
  // canaletas verticais
  const yV0 = T.MARGEM_UTIL, yV1 = placa.altura - T.MARGEM_UTIL;
  p.ret(px + T.MARGEM_UTIL, Y(yV1), vE.largura, yV1 - yV0, 'QD-CANALETA');
  p.ret(px + placa.largura - T.MARGEM_UTIL - vD.largura, Y(yV1), vD.largura, yV1 - yV0, 'QD-CANALETA');
  const hCan = Math.min(P(1.4), 12);
  p.txt(px + T.MARGEM_UTIL + vE.largura / 2, Y(placa.altura / 2), hCan, `CANALETA ${vE.largura}×${vE.altura} — POTÊNCIA`, { layer: 'QD-TEXTO', alinhar: 'centro', rotacao: 90 });
  p.txt(px + placa.largura - T.MARGEM_UTIL - vD.largura / 2, Y(placa.altura / 2), hCan, `CANALETA ${vD.largura}×${vD.altura} — ${calc.aut.ativo || calc.motores.length ? 'COMANDO' : 'POTÊNCIA'}`, { layer: 'QD-TEXTO', alinhar: 'centro', rotacao: 90 });
  // canaletas horizontais
  const xH0 = px + T.MARGEM_UTIL + vE.largura, xH1 = px + placa.largura - T.MARGEM_UTIL - vD.largura;
  for (const h of layout.horizontais) {
    p.ret(xH0, Y(h.y + h.largura), xH1 - xH0, h.largura, 'QD-CANALETA');
  }
  const hCanH = Math.min(P(1.1), 9);
  layout.horizontais.forEach((h, i) => { if (i === 0 || h.zona !== layout.horizontais[i - 1].zona) p.txt(xH1 - 4, Y(h.y + h.largura / 2), hCanH, `${h.largura}×${h.altura}`, { layer: 'QD-TEXTO', alinhar: 'direita' }); });
  // fileiras
  const hItem = (w) => Math.max(4, Math.min(P(1.3), w * 0.55, 11));
  for (const f of layout.fileiras) {
    const yTopo = f.y;
    if (f.trilho) {
      const yc = yTopo + f.altura / 2;
      p.ret(xUtil, Y(yc + 17.5), layout.larguraUtil, 35, 'QD-TRILHO');
    }
    for (const k of f.itens) {
      const h = k.altura || T.DIN_ALTURA;
      const y0 = yTopo + (f.altura - h) / 2;
      const x = xUtil + k.x;
      const w = k.largura;
      if (k.tipo === 'barramento') {
        const n = calc.barr.nBarras;
        const espessura = calc.barr.fase ? calc.barr.fase.e * 2 : 10;
        const rot = ['L1', 'L2', 'L3', 'N'].slice(0, c.nFases).concat(n > c.nFases ? ['N'] : []);
        for (let i = 0; i < n; i++) {
          const yb = y0 + 10 + i * c.entreFases + c.entreFases / 2;
          p.ret(x, Y(yb + espessura / 2), w, espessura, 'QD-BARRAMENTO');
          p.txt(x - 4, Y(yb), hItem(30), rot[i] || '', { layer: 'QD-TEXTO', alinhar: 'direita' });
        }
        const nAp = Math.max(2, calc.barr.apoiosQtd || 2);
        for (let a = 0; a < nAp; a++) {
          const xa2 = x + (w - 30) * a / (nAp - 1);
          p.ret(xa2, Y(y0 + 10 + n * c.entreFases), 30, n * c.entreFases, 'QD-COMPONENTE');
        }
        p.txt(x + w / 2, Y(y0 + 4), hItem(60), `BARRAMENTO ${calc.barr.fase ? `${calc.barr.fase.l}×${calc.barr.fase.e}` : ''} Cu — ISOLADORES A CADA ${c.apoios} mm`, { layer: 'QD-TEXTO', alinhar: 'centro' });
        continue;
      }
      if (k.tipo === 'reserva') {
        p.ret(x, Y(y0 + h), w, h, 'QD-RESERVA');
        p.txt(x + w / 2, Y(y0 + h / 2), hItem(Math.min(w, 60)), w > 50 ? 'RESERVA' : 'RES', { layer: 'QD-TEXTO', alinhar: 'centro' });
        continue;
      }
      if (k.tipo === 'bornes') {
        const g = k.grupoBornes;
        p.ret(x, Y(y0 + h), w, h, 'QD-BORNE');
        // bornes individuais (largura média) — desenho indicativo
        const lm = g.comprimento > 0 ? (g.comprimento - 2 * T.BORNE_POSTE_MM) / Math.max(1, g.total + g.reserva) : 6;
        const n = Math.floor((w - (k.parte === 1 ? T.BORNE_POSTE_MM : 0)) / lm);
        for (let i = 1; i < Math.min(n, 400); i++) p.linha(x + i * lm, Y(y0 + 8), x + i * lm, Y(y0 + h - 8), 'QD-BORNE');
        p.txt(x + 3, Y(y0 - 6), hItem(40), `${g.id}${k.parte > 1 ? ` (cont.)` : ''}`, { layer: 'QD-TEXTO' });
        continue;
      }
      if (k.tipo === 'barra_neutro' || k.tipo === 'barra_pe') {
        p.ret(x, Y(y0 + h), w, h, 'QD-BARRAMENTO');
        for (let xx = x + 15; xx < x + w - 10; xx += 10) { p.circ(xx, Y(y0 + h / 3), 2.5, 'QD-BARRAMENTO'); p.circ(xx, Y(y0 + 2 * h / 3), 2.5, 'QD-BARRAMENTO'); }
        p.txt(x + w / 2, Y(y0 - 6), hItem(40), k.tipo === 'barra_neutro' ? 'BARRA N' : 'BARRA PE', { layer: 'QD-TEXTO', alinhar: 'centro' });
        continue;
      }
      p.ret(x, Y(y0 + h), w, h, 'QD-COMPONENTE');
      if (k.filhos) {
        for (const fh of k.filhos) {
          p.ret(x + fh.x, Y(y0 + fh.y + fh.h), fh.l, fh.h, 'QD-COMPONENTE');
          p.txt(x + fh.x + fh.l / 2, Y(y0 + fh.y + fh.h / 2), hItem(fh.l), fh.ref, { layer: 'QD-TEXTO', alinhar: 'centro', rotacao: fh.l < 40 ? 90 : 0 });
        }
        p.txt(x + w / 2, Y(y0 - 6), hItem(60), k.ref, { layer: 'QD-TEXTO', alinhar: 'centro' });
        continue;
      }
      const vertical = w < 40;
      p.txt(x + w / 2, Y(y0 + h / 2), hItem(vertical ? 18 : w), rotuloItem(k), { layer: 'QD-TEXTO', alinhar: 'centro', rotacao: vertical ? 90 : 0 });
      if (calc.barr.tipo === 'pente' && (k.tipo === 'disjuntor' || k.tipo === 'ddr') && f.zona === 'distribuicao') {
        p.ret(x, Y(y0 + 6), w, 6, 'QD-BARRAMENTO'); // pente nos terminais de entrada
      }
    }
  }
  // cotas da placa e passo das fileiras
  cota(p, xI, yBase, xI + W, yBase, `${W}`, P(2), { lado: -1 });
  cota(p, xI + W, yBase, xI + W, yBase + H, `${H}`, P(2), { lado: 1 });
  cota(p, px, pyTopo, px + placa.largura, pyTopo, `PLACA ${placa.largura}`, P(1.6), { lado: 1 });
  cota(p, xUtil, Y(layout.fileiras[0] ? layout.fileiras[0].y : 0) + 5, xUtil + layout.larguraUtil, Y(layout.fileiras[0] ? layout.fileiras[0].y : 0) + 5, `ÚTIL ${Math.round(layout.larguraUtil)}`, P(1.3), { lado: 1 });
  const fs = layout.fileiras;
  for (let i = 0; i + 1 < fs.length; i++) {
    const a = fs[i].y + fs[i].altura / 2, b = fs[i + 1].y + fs[i + 1].altura / 2;
    p.txt(px - 4, Y((a + b) / 2), Math.min(P(1.2), 10), `${Math.round(b - a)}`, { layer: 'QD-COTA', alinhar: 'direita' });
  }
  // rótulo das zonas à direita
  let ultimaZona = null;
  for (const f of fs) {
    const rot = f.zonas.map(z => layout.rotuloZona[z] || z).join(' / ');
    if (rot === ultimaZona) continue;
    ultimaZona = rot;
    p.txt(xI + W + P(4), Y(f.y + f.altura / 2), Math.min(P(1.4), 12), rot, { layer: 'QD-TEXTO' });
  }

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
