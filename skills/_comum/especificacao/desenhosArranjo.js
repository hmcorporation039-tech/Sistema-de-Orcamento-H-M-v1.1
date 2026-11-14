// Desenhos em ESCALA do arranjo físico (FL05) e das réguas de bornes (FL04), a partir do arranjo
// calculado pela skill quadros (calculo.js → layout.js, modo 'zonas'): cada peça na posição e com
// as medidas do cálculo, canaletas, chapa separadora, barramento e a porta com os dispositivos.
// Coordenadas da skill em mm (placa: do canto superior esquerdo; porta: do canto inferior esquerdo).
// Todo texto passa por escapeHtml; o tamanho da letra cabe na peça (senão a peça fica só com a cor
// e a tag aparece na legenda), para nenhuma etiqueta se sobrepor (teste: desenhos.colisoesDeTexto).

const { escapeHtml: e } = require('../base/html');

const t = (x, y, s, { tam = 9, cor = '#111', anc = 'start', peso = 'normal', rot = 0 } = {}) =>
  `<text x="${r1(x)}" y="${r1(y)}" font-size="${r1(tam)}" fill="${cor}" text-anchor="${anc}" font-weight="${peso}"${rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : ''}>${e(s)}</text>`;
const r1 = (v) => Math.round(v * 10) / 10;
const ret = (x, y, w, h, { cor = '#1b1b1b', fundo = 'none', lw = 1, traco = '' } = {}) => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" fill="${fundo}" stroke="${cor}" stroke-width="${lw}"${traco ? ` stroke-dasharray="${traco}"` : ''}/>`;
const lin = (x1, y1, x2, y2, { cor = '#1b1b1b', w = 1, traco = '' } = {}) => `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${cor}" stroke-width="${w}"${traco ? ` stroke-dasharray="${traco}"` : ''}/>`;
const circ = (x, y, rr, { cor = '#1b1b1b', fundo = 'none', lw = 1 } = {}) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(rr)}" fill="${fundo}" stroke="${cor}" stroke-width="${lw}"/>`;
const svg = (w, h, corpo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r1(w)} ${r1(h)}" preserveAspectRatio="xMidYMid meet" font-family="Arial, Helvetica, sans-serif">${corpo}</svg>`;
const AZUL = '#1f4f9a';
const CORES = { disjuntor_geral: '#e9eef7', disjuntor_cm: '#e9eef7', disjuntor: '#f3f6fb', disjuntor_motor: '#f3f6fb', idr: '#fff1d6', ddr: '#fff1d6', dps: '#e8e0f7', protecao_dps: '#f3f6fb',
  partida: '#d9efe3', fonte: '#ece3f6', disjuntor_comando: '#f3f6fb', protecao_24v: '#f3f6fb', rele_auxiliar: '#e5e0f7', temporizador: '#e5e0f7', contator_comando: '#dbe8f5', termostato: '#eeeeee',
  reserva: 'none', bornes: '#eef3e3', barra_pe: '#cfe9c0', barra_neutro: '#cfe0f5', barramento: 'none' };
const COR_SIN = { verde: '#2e9d4a', vermelho: '#d23b2f', amarelo: '#e2b71a', branco: '#f2f2f2', azul: '#2f6fd2' };
const corDoBotao = (tipo) => (/verde/.test(tipo) ? COR_SIN.verde : /vermelho/.test(tipo) ? COR_SIN.vermelho : /amarelo/.test(tipo) ? COR_SIN.amarelo : /branco/.test(tipo) ? COR_SIN.branco : '#222');

// cota horizontal/vertical simples (texto centrado fora da linha)
const cotaH = (x1, x2, y, txt, tam) => lin(x1, y, x2, y, { cor: AZUL, w: 0.7 }) + lin(x1, y - 4, x1, y + 4, { cor: AZUL, w: 0.7 }) + lin(x2, y - 4, x2, y + 4, { cor: AZUL, w: 0.7 }) + t((x1 + x2) / 2, y + tam + 2, txt, { tam, anc: 'middle', cor: AZUL });
const cotaV = (x, y1, y2, txt, tam) => lin(x, y1, x, y2, { cor: AZUL, w: 0.7 }) + lin(x - 4, y1, x + 4, y1, { cor: AZUL, w: 0.7 }) + lin(x - 4, y2, x + 4, y2, { cor: AZUL, w: 0.7 }) + t(x - 5, (y1 + y2) / 2, txt, { tam, anc: 'middle', cor: AZUL, rot: -90 });

// rótulo dentro da peça, só se couber
function rotuloNaPeca(x, y, w, h, txt, tamMax = 9) {
  if (!txt) return '';
  const tam = Math.min(tamMax, (w - 2) / (String(txt).length * 0.6), h * 0.5);
  if (tam < 4.5) return '';
  return t(x + w / 2, y + h / 2 + tam * 0.35, txt, { tam, anc: 'middle' });
}

function layoutArranjo(a, quadro, { criterios = [] } = {}) {
  const env = a.involucro;
  const E = 0.6; // px por mm
  const W = env.largura * E, H = env.altura * E;
  const gap = 150;
  const x0p = 40, y0 = 40;
  let s = '';
  // ── vista frontal (porta), em escala ──
  s += t(x0p, 22, `VISTA FRONTAL — PORTA (proporcional, mm)`, { tam: 12, peso: 'bold' });
  s += ret(x0p, y0, W, H, { lw: 2, fundo: '#e9edf2' }) + ret(x0p + 6, y0 + 6, W - 12, H - 12, { cor: '#888', lw: 0.7 });
  const P = a.porta || {};
  const Y = (yMm) => y0 + H - yMm * E; // porta: y para cima
  if (P.placa) s += ret(x0p + P.placa.x * E, Y(P.placa.y + P.placa.a), P.placa.l * E, P.placa.a * E, { fundo: '#111', cor: '#111' }) + rotuloNaPeca(x0p + P.placa.x * E, Y(P.placa.y + P.placa.a), P.placa.l * E, P.placa.a * E, quadro.tag, 9).replace('fill="#111"', 'fill="#fff"');
  if (P.fecho) s += ret(x0p + P.fecho.x * E, Y(P.fecho.y + P.fecho.a), P.fecho.l * E, P.fecho.a * E, { fundo: '#444' });
  for (const g of P.grelhas || []) {
    s += ret(x0p + g.x * E, Y(g.y + g.a), g.l * E, g.a * E, { fundo: '#cfd6de' });
    for (let k = 1; k < 5; k++) s += lin(x0p + g.x * E + 3, Y(g.y + g.a) + k * g.a * E / 5, x0p + (g.x + g.l) * E - 3, Y(g.y + g.a) + k * g.a * E / 5, { cor: '#888', w: 0.5 });
  }
  const legenda = [];
  for (const b of P.botoes || []) {
    const cx = x0p + b.cx * E, cy = Y(b.cy), rr = b.d * E / 2;
    if (b.tipo === 'emergencia') s += circ(cx, cy, rr + 5, { fundo: '#f2c200' });
    s += circ(cx, cy, rr, { fundo: corDoBotao(b.tipo) });
    if (b.tipo === 'seletor') s += lin(cx, cy - rr * 0.8, cx, cy + rr * 0.8, { cor: '#fff', w: 2.5 });
    s += t(cx, cy - rr - (b.tipo === 'emergencia' ? 8 : 4), b.id, { tam: 8, anc: 'middle', peso: 'bold' });
    legenda.push(b.id);
  }
  s += cotaH(x0p, x0p + W, y0 + H + 14, `${env.largura}`, 9) + cotaV(x0p - 14, y0, y0 + H, `${env.altura}`, 9);
  // ── vista interna (placa), em escala ──
  const x0i = x0p + W + gap;
  s += t(x0i, 22, 'VISTA INTERNA — PLACA DE MONTAGEM (porta removida)', { tam: 12, peso: 'bold' });
  s += ret(x0i, y0, W, H, { lw: 2 });
  const mx = (env.largura - a.placa.largura) / 2, my = (env.altura - a.placa.altura) / 2;
  const px = x0i + mx * E, py = y0 + my * E;
  s += ret(px, py, a.placa.largura * E, a.placa.altura * E, { fundo: '#f4f1e8', cor: '#999' });
  const xu = px + a.x0 * E;
  // canaletas horizontais e verticais
  for (const h of a.horizontais || []) s += ret(xu, py + h.y * E, a.larguraUtil * E, h.largura * E, { fundo: '#e6e8ee', cor: '#8a8f99', lw: 0.5 });
  if (a.verticais) {
    const hv = (a.placa.altura - 30) * E;
    s += ret(px + 15 * E, py + 15 * E, a.verticais.esquerda * E, hv, { fundo: '#e6e8ee', cor: '#8a8f99', lw: 0.5 });
    s += ret(px + (a.placa.largura - 15 - a.verticais.direita) * E, py + 15 * E, a.verticais.direita * E, hv, { fundo: '#e6e8ee', cor: '#8a8f99', lw: 0.5 });
  }
  for (const sp of a.separadores || []) s += ret(xu + sp.x * E - 1.5, py + sp.y0 * E, 3, (sp.y1 - sp.y0) * E, { fundo: '#555', cor: '#555' });
  // peças
  for (const f of a.fileiras) {
    if (f.trilho) s += ret(xu + f.trilhoX * E, py + (f.y + f.altura / 2 - 17.5) * E, f.trilhoL * E, 35 * E, { fundo: '#dcdcdc', cor: '#9a9a9a', lw: 0.4 });
    for (const k of f.itens) {
      const h = k.altura || 90;
      const x = xu + k.x * E, y = py + (f.y + (f.altura - h) / 2) * E, w = k.largura * E, hh = h * E;
      if (k.tipo === 'barramento' && a.barras) {
        for (let i = 0; i < a.barras.n; i++) s += ret(x, y + (10 + i * a.barras.entreFases + a.barras.entreFases / 2 - 4) * E, w, 8 * E, { fundo: i === a.barras.n - 1 ? '#b7d3f2' : '#e3a868', cor: '#8a4b14', lw: 0.5 });
        s += ret(x, y, w, hh, { cor: '#8a4b14', lw: 0.6, traco: '4 2' });
        continue;
      }
      s += ret(x, y, w, hh, { fundo: CORES[k.tipo] || '#f3f6fb', cor: k.tipo === 'reserva' ? '#999' : AZUL, lw: 0.6, traco: k.tipo === 'reserva' ? '3 2' : '' });
      const nome = k.tipo === 'reserva' ? 'RES' : k.nome;
      const rot = rotuloNaPeca(x, y, w, hh, nome, 8);
      if (rot) s += rot; else if (k.tipo !== 'reserva') legenda.push(nome);
    }
  }
  s += cotaH(x0i, x0i + W, y0 + H + 14, `${env.largura}`, 9) + cotaV(x0i + W + 16, y0, y0 + H, `${env.altura}`, 9);
  s += cotaV(x0i + W + 34, py, py + a.alturaNecessaria * E, `ocupado ${a.alturaNecessaria}`, 8);
  s += t(x0i + W + 46, y0 + 20, 'saída de ar ↑', { tam: 8 }) + t(x0i + W + 46, y0 + H - 6, 'entrada de ar (porta) ↑', { tam: 8 });
  const totalW = x0i + W + 170;
  return svg(totalW, y0 + H + 40, s);
}

// Réguas de bornes desenhadas: um retângulo por borne (cor pela seção), número embaixo, reserva tracejada
function reguasSvg(reguas) {
  const PASSO = 13, ALT = 34;
  let y = 16;
  let s = '';
  let larg = 0;
  const corSec = (sec) => (sec >= 35 ? '#d9b38c' : sec >= 6 ? '#e8d3b8' : sec >= 4 ? '#f0e4cf' : '#eef3e3');
  for (const r of reguas) {
    s += t(0, y + 4, `${r.id} — ${r.titulo} (${r.bornes.length} + ${r.reserva} reserva)`, { tam: 10, peso: 'bold' });
    y += 14;
    const total = r.bornes.length + r.reserva;
    for (let i = 0; i < total; i++) {
      const b = r.bornes[i];
      const x = 6 + i * PASSO;
      s += ret(x, y, PASSO - 2, ALT, b ? { fundo: /PE/.test(b.rotulo) ? '#cfe9c0' : / N\b|neutro/i.test(b.rotulo) ? '#cfe0f5' : corSec(b.secao), cor: '#5b6b3a', lw: 0.6 } : { cor: '#999', lw: 0.6, traco: '2 2' });
      if ((i + 1) % (total > 40 ? 5 : 1) === 0 || i === 0) s += t(x + (PASSO - 2) / 2, y + ALT + 9, String(i + 1), { tam: 6.5, anc: 'middle' });
      larg = Math.max(larg, x + PASSO);
    }
    s += ret(0, y - 2, 5, ALT + 4, { fundo: '#777' }) + ret(6 + total * PASSO, y - 2, 5, ALT + 4, { fundo: '#777' });
    larg = Math.max(larg, 6 + total * PASSO + 6);
    y += ALT + 22;
  }
  s += t(0, y + 2, 'Cor: força conforme a seção · verde-amarelo = PE · azul = N · tracejado = reserva · números a cada borne (a cada 5 nas réguas longas)', { tam: 7.5, cor: '#555' });
  return svg(Math.max(larg, 560), y + 10, s);
}

module.exports = { layoutArranjo, reguasSvg };
