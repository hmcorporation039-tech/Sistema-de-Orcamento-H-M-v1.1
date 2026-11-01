// Plaquetas de identificação em SVG, em escala real (mm): comando/sinalização
// da porta, identificação externa do conjunto, advertência e a plaqueta da
// H&M (logo + modelo + dados de marcação da norma do produto). A mesma regra
// de ajuste do texto serve para desenhar a plaqueta no lugar, nas vistas.
//
// Padrão H&M adotado (o usuário pode mudar no formulário; contrato do caderno):
//   comando/sinalização: acrílico 2 mm preto, letra branca gravada a laser;
//   advertência: amarela com letra/símbolo preto (NR-10 10.10, ISO 7010 W012);
//   identificação externa: tag + função; plaqueta H&M em alumínio anodizado.

const fs = require('fs');
const path = require('path');
const { escapeHtml } = require('./svg');
const { EMPRESA } = require('../empresa');

const num = (v) => (Math.round(v * 100) / 100).toString();

let logoCache = null;
function logoDataUri() {
  if (logoCache != null) return logoCache;
  try {
    logoCache = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '..', 'assets', 'logo.png')).toString('base64')}`;
  } catch {
    logoCache = '';
  }
  return logoCache;
}

const temFuros = (p) => /parafus|rebite/i.test(String(p.fixacao || ''));

// Maior altura de letra (maiúscula, mm) que faz as linhas caberem em l × a
// (maiúsculas em negrito: largura média ≈ 0,92 × altura de maiúscula; entrelinha 1,45 × altura)
function ajustarTexto(linhas, l, a, { margem = 2, max = 10 } = {}) {
  const ls = (Array.isArray(linhas) ? linhas : [linhas]).map(t => String(t ?? '')).filter(Boolean);
  if (!ls.length) return { h: 0, linhas: [] };
  const maior = Math.max(...ls.map(t => t.length));
  const pelaLargura = (l - 2 * margem) / (maior * 0.92);
  const pelaAltura = (a - 2 * margem) / (ls.length * 1.45);
  return { h: Math.max(0.8, Math.min(max, pelaLargura, pelaAltura)), linhas: ls };
}

// Furos de fixação (Ø 3,5 mm a 4 mm das bordas; 2 furos laterais na plaqueta baixa)
function furos(l, a) {
  const r = 1.75;
  const pts = a < 20 ? [[3.5, a / 2], [l - 3.5, a / 2]] : [[4, 4], [l - 4, 4], [4, a - 4], [l - 4, a - 4]];
  return pts.map(([x, y]) => `<circle cx="${num(x)}" cy="${num(y)}" r="${r}" fill="#fff" stroke="#777" stroke-width="0.2"/>`).join('');
}

// Símbolo de risco elétrico (raio) dentro do triângulo ISO 7010 W012
function raio(cx, cy, s) {
  const p = [[0.1, -0.5], [-0.22, 0.05], [0.0, 0.05], [-0.12, 0.5], [0.24, -0.08], [0.02, -0.08], [0.18, -0.5]];
  return `<path d="${p.map(([x, y], i) => `${i ? 'L' : 'M'}${num(cx + x * s)} ${num(cy + y * s)}`).join(' ')} Z" fill="#111"/>`;
}

// SVG de uma plaqueta. escala k: 1 → tamanho real; 2 → metade (1:2)
function svgPlaqueta(p, { k = 1 } = {}) {
  const l = Number(p.largura_mm) || 60;
  const a = Number(p.altura_mm) || 20;
  const fundo = p.fundo || '#111';
  const letra = p.letra || '#fff';
  const forma = p.forma || 'retangulo';
  let corpo;
  if (forma === 'triangulo') {
    const m = 0.8;
    corpo = `<path d="M${num(l / 2)} ${m} L${num(l - m)} ${num(a - m)} L${m} ${num(a - m)} Z" fill="${fundo}" stroke="#111" stroke-width="${num(Math.max(1, l * 0.06))}" stroke-linejoin="round"/>${raio(l / 2, a * 0.6, a * 0.5)}`;
  } else if (forma === 'circulo') {
    const ajuste = ajustarTexto(p.texto, l * 0.7, a * 0.4);
    corpo = `<circle cx="${num(l / 2)}" cy="${num(a / 2)}" r="${num(Math.min(l, a) / 2 - 0.3)}" fill="${fundo}" stroke="#555" stroke-width="0.3"/>`
      + `<circle cx="${num(l / 2)}" cy="${num(a / 2)}" r="${num(Math.min(l, a) * 0.2)}" fill="#fff" stroke="#999" stroke-width="0.2"/>`
      + textoCentrado(ajuste, l / 2, a * 0.82, letra);
  } else {
    const ajuste = ajustarTexto(p.texto, l - (temFuros(p) && a < 20 ? 10 : 0), a);
    corpo = `<rect x="0.15" y="0.15" width="${num(l - 0.3)}" height="${num(a - 0.3)}" rx="1.2" fill="${fundo}" stroke="#555" stroke-width="0.3"/>`
      + textoCentrado(ajuste, l / 2, a / 2, letra) + (temFuros(p) ? furos(l, a) : '');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(l / k)}mm" height="${num(a / k)}mm" viewBox="0 0 ${num(l)} ${num(a)}" font-family="Arial, Helvetica, sans-serif">${corpo}</svg>`;
}

function textoCentrado({ h, linhas }, cx, cy, cor) {
  if (!linhas.length) return '';
  const passo = h * 1.45;
  const y0 = cy - ((linhas.length - 1) * passo) / 2;
  return linhas.map((t, i) => `<text x="${num(cx)}" y="${num(y0 + i * passo)}" font-size="${num(h / 0.72)}" text-anchor="middle" dominant-baseline="central" font-weight="bold" fill="${cor}">${escapeHtml(t)}</text>`).join('');
}

// Plaqueta H&M: logo + nome + modelo + nº de série/OS + dados de marcação
// (quadro: NBR IEC 61439-1, 6.1; rack: NBR 14565 / TIA-606), em alumínio
function svgPlaquetaHm(ph, { k = 1 } = {}) {
  const l = Number(ph.largura_mm) || 100;
  const a = Number(ph.altura_mm) || 70;
  const s = Math.min(l / 100, a / 70); // tudo proporcional ao tamanho padrão 100 × 70
  const logo = logoDataUri();
  const dados = (ph.dados || []).filter(d => d && d[0]);
  const colunas = dados.length > 7 ? 2 : 1;
  const linhas = Math.ceil(dados.length / colunas);
  const yDados = 31 * s;
  const passo = Math.min(5.2 * s, (a - yDados - 3 * s) / Math.max(1, linhas));
  const hTxt = Math.min(1.9 * s, passo * 0.5);
  const larguraCol = (l - 8 * s) / colunas;
  const maxCar = Math.floor(larguraCol / (hTxt * 0.8));
  const corta = (t) => (t.length > maxCar ? `${t.slice(0, maxCar - 1)}…` : t);
  const celulas = dados.map(([chave, valor], i) => {
    const c = Math.floor(i / linhas), r = i % linhas;
    const x = 4 * s + c * larguraCol, y = yDados + r * passo + passo * 0.6;
    return `<text x="${num(x)}" y="${num(y)}" font-size="${num(hTxt / 0.72)}" fill="#1a1a1a"><tspan font-weight="bold">${escapeHtml(chave)}:</tspan> ${escapeHtml(corta(String(valor ?? '')))}</text>`;
  }).join('');
  const t = (x, y, h, txt, extra = '') => `<text x="${num(x)}" y="${num(y)}" font-size="${num(h / 0.72)}" fill="#111"${extra}>${escapeHtml(txt)}</text>`;
  const corpo = `<defs><linearGradient id="alu" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9ecef"/><stop offset="0.5" stop-color="#cfd4da"/><stop offset="1" stop-color="#e3e6ea"/></linearGradient></defs>`
    + `<rect x="0.2" y="0.2" width="${num(l - 0.4)}" height="${num(a - 0.4)}" rx="2" fill="url(#alu)" stroke="#6b7177" stroke-width="0.4"/>`
    + (logo ? `<image href="${logo}" x="${num(5 * s)}" y="${num(4 * s)}" width="${num(15 * s)}" height="${num(15 * s)}"/>` : '')
    + t(23 * s, 9 * s, 3.1 * s, EMPRESA.nomeFantasia, ' font-weight="bold"')
    + t(23 * s, 13.6 * s, 1.8 * s, ph.subtitulo || 'Conjunto montado e ensaiado pela H&M')
    + t(23 * s, 18 * s, 2.3 * s, `Modelo: ${ph.modelo || '—'}`, ' font-weight="bold"')
    + `<line x1="${num(4 * s)}" y1="${num(21.5 * s)}" x2="${num(l - 4 * s)}" y2="${num(21.5 * s)}" stroke="#6b7177" stroke-width="0.3"/>`
    + t(5 * s, 26.5 * s, 2.1 * s, `Nº de série / OS: ${ph.numero_serie || '________'}`)
    + celulas
    + (temFuros(ph) ? furos(l, a) : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${num(l / k)}mm" height="${num(a / k)}mm" viewBox="0 0 ${num(l)} ${num(a)}" font-family="Arial, Helvetica, sans-serif">${corpo}</svg>`;
}

// Folha com todas as plaquetas desenháveis (desenhar !== false) em escala 1:1
// (1:2 se alguma passar da largura útil da página), agrupadas, + a plaqueta H&M
function htmlFolhaPlaquetas(plaquetas = [], plaquetaHm = null, { larguraUtilMm = 185 } = {}) {
  const desenhaveis = plaquetas.filter(p => p && p.desenhar !== false);
  const hms = (Array.isArray(plaquetaHm) ? plaquetaHm : [plaquetaHm]).filter(Boolean);
  const maior = Math.max(0, ...desenhaveis.map(p => Number(p.largura_mm) || 60), ...hms.map(h => Number(h.largura_mm) || 100));
  const k = maior > larguraUtilMm ? 2 : 1;
  const grupos = new Map();
  for (const p of desenhaveis) {
    const g = p.grupo || 'Plaquetas';
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(p);
  }
  // cartão com a largura da própria plaqueta (as legendas não empurram as vizinhas); material e
  // fixação ficam na lista do caderno — aqui só tag, medida e local
  const cartao = (svg, legenda, l) => `<figure class="pl-cartao" style="width:${num(Math.max(40, l / k))}mm">${svg}<figcaption>${legenda}</figcaption></figure>`;
  const legenda = (p) => [
    `<b>${escapeHtml(p.tag || '')}</b>${p.quantidade > 1 ? ` × ${escapeHtml(p.quantidade)}` : ''} — ${escapeHtml(`${p.largura_mm} × ${p.altura_mm} mm`)}`,
    escapeHtml(p.local || ''),
  ].filter(Boolean).join('<br/>');
  const partes = [];
  if (hms.length) {
    const um = (h) => cartao(svgPlaquetaHm(h, { k }), [
      `<b>${escapeHtml(h.modelo || '')}</b> — ${escapeHtml(`${h.largura_mm || 100} × ${h.altura_mm || 70} mm`)}`,
      escapeHtml(h.material || ''), escapeHtml(h.fixacao || ''), escapeHtml(h.local || ''),
    ].filter(Boolean).join('<br/>'), Number(h.largura_mm) || 100);
    partes.push(`<h3>Plaqueta H&amp;M (identificação do fabricante do conjunto)${hms.length > 1 ? ` — uma por conjunto (${hms.length})` : ''}</h3><div class="pl-grade">${hms.map(um).join('')}</div>`);
  }
  for (const [g, lista] of grupos) partes.push(`<h3>${escapeHtml(g)}</h3><div class="pl-grade">${lista.map(p => cartao(svgPlaqueta(p, { k }), legenda(p), Number(p.largura_mm) || 60)).join('')}</div>`);
  return { html: partes.join(''), escala: `1:${k}` };
}

module.exports = { svgPlaqueta, svgPlaquetaHm, htmlFolhaPlaquetas, ajustarTexto, logoDataUri, temFuros };
