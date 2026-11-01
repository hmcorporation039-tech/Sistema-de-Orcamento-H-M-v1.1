// Geometria das vistas do quadro, comum ao desenho DXF (./desenho.js) e ao
// caderno de fabricação em PDF (./caderno.js): a função recebe um "pincel"
// (linha, ret, circ, txt, cheio, poli — mm do mundo, y para cima) e desenha.
// O pincel DXF grava entidades por layer; o pincel SVG
// (skills/_comum/fabricacao/svg.js) grava o mesmo desenho em SVG. Assim as
// posições de porta, placa, trilhos, canaletas, barramentos e bornes são as
// mesmas nos dois documentos (e no 3D, que usa ./porta.js e ./layout.js).
//
// P(v) = v × escala: converte mm de PAPEL em mm do mundo (altura de texto).

const T = require('./tabelas');
const { posicoesPorta } = require('./porta');
const { tcNasBarras } = require('./layout');

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

// Texto curto do dispositivo (dentro do retângulo)
function rotuloItem(k) {
  if (k.tipo === 'disjuntor' || k.tipo === 'disjuntor_geral' || k.tipo === 'ddr') return `${k.ref} ${k.In ? `${k.In}A` : ''}`.trim();
  if (k.tipo === 'idr') return `${k.ref} ${k.In}A`;
  if (k.tipo === 'reserva') return 'RESERVA';
  return k.ref;
}

// Vista frontal externa (porta fechada), canto inferior esquerdo em (xF, yBase).
// opts.rotulos = false: o caderno desenha a plaqueta no lugar do texto (botões e grelhas).
function vistaFrontal(p, calc, xF, yBase, P, { rotulos = true } = {}) {
  const { c } = calc;
  const H = calc.layout.involucro.altura, W = calc.layout.involucro.largura;
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
  for (const m of PT.medidores) {
    p.ret(xF + m.x, yBase + m.y, m.l, m.a, 'QD-PORTA');
    p.ret(xF + m.x + 8, yBase + m.y + m.a * 0.45, m.l - 16, m.a * 0.45, 'QD-COMPONENTE'); // visor
    p.txt(xF + m.x + m.l / 2, yBase + m.y + m.a * 0.2, Math.min(m.a * 0.15, P(1.6)), m.rotulo, { layer: 'QD-TEXTO', alinhar: 'centro' });
  }
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
    if (rotulos) p.txt(cx, cy - b.d / 2 - 14, Math.min(9, P(1.2)), b.rotulo, { layer: 'QD-TEXTO', alinhar: 'centro' });
  }
  // ventilação
  for (const g of PT.grelhas) {
    p.ret(xF + g.x, yBase + g.y, g.l, g.a, 'QD-PORTA');
    for (let i = 1; i < 6; i++) p.linha(xF + g.x + 8, yBase + g.y + i * g.a / 6, xF + g.x + g.l - 8, yBase + g.y + i * g.a / 6, 'QD-PORTA');
    if (rotulos) p.txt(xF + g.x + g.l / 2, yBase + g.y - 14, Math.min(9, P(1.2)), g.rotulo, { layer: 'QD-TEXTO', alinhar: 'centro' });
  }
  // entrada de cabos
  const yEnt = c.entradaCabos === 'inferior' ? yBase - 30 : yBase + H + 5;
  p.ret(xF + W * 0.2, yEnt, W * 0.6, 25, 'QD-RESERVA');
  p.txt(xF + W / 2, yEnt + 12, Math.min(12, P(1.4)), `ENTRADA DE CABOS (${c.entradaCabos.toUpperCase()})`, { layer: 'QD-TEXTO', alinhar: 'centro' });
  // cota da largura abaixo da faixa de entrada de cabos (senão o texto cai dentro dela)
  const yCota = c.entradaCabos === 'inferior' ? yBase - 32 : yBase;
  cota(p, xF, yCota, xF + W, yCota, `${W}`, P(2), { lado: -1 });
  cota(p, xF, yBase, xF, yBase + H, `${H}`, P(2), { lado: -1 });
  return PT;
}

// Vista lateral (profundidade), canto inferior esquerdo em (xL, yBase)
function vistaLateral(p, calc, xL, yBase, P) {
  const H = calc.layout.involucro.altura, D = calc.layout.involucro.profundidade;
  p.ret(xL, yBase, D, H, 'QD-PAINEL');
  p.linha(xL + D - 20, yBase + 12, xL + D - 20, yBase + H - 12, 'QD-PORTA');
  p.linha(xL + 15, yBase + 30, xL + 15, yBase + H - 30, 'QD-TRILHO'); // placa de montagem
  cota(p, xL, yBase, xL + D, yBase, `${D}`, P(2), { lado: -1 });
}

// Layout interno (placa de montagem), canto inferior esquerdo do invólucro em (xI, yBase).
// Devolve as funções de posição (para o caderno sobrepor detalhes no mesmo lugar).
function vistaInterna(p, calc, xI, yBase, P) {
  const { c, layout } = calc;
  const env = layout.involucro;
  const placa = layout.placa;
  const H = env.altura, W = env.largura;
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
        // TCs de janela enfiados nas barras de fase (mesma posição do 3D: layout.tcNasBarras)
        for (const t of tcNasBarras(calc)) {
          const yb = y0 + 10 + t.fase * c.entreFases + c.entreFases / 2;
          p.ret(x + t.dx, Y(yb + t.a / 2), t.l, t.a, 'QD-COMPONENTE');
          p.txt(x + t.dx + t.l / 2, Y(yb + t.a / 2 + 4), hItem(30), t.ref, { layer: 'QD-TEXTO', alinhar: 'centro' });
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
  return { px, pyTopo, Y, xUtil };
}

module.exports = { vistaFrontal, vistaLateral, vistaInterna, cota, rotuloItem };
