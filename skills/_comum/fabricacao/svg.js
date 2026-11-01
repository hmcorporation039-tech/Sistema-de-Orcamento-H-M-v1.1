// Pincel SVG com a MESMA interface do pincel DXF dos desenhos de fabricação
// (skills/quadros/scripts/lib/desenho.js → pincel): linha, ret, circ, txt,
// cheio, poli — coordenadas do mundo em mm, com y para CIMA (como no CAD).
// Assim a mesma função de geometria desenha o DXF e as vistas do caderno em
// PDF, sem duplicar posições (ver skills/quadros/scripts/lib/vistas.js).
//
// O pincel guarda as primitivas e só no fim (svg()) calcula a caixa envolvente,
// inverte o y e escreve o <svg viewBox="0 0 L A"> em mm do mundo. Espessuras de
// linha em mm de PAPEL × escala (a escala 1:N do desenho), para a pena sair
// igual em qualquer escala.

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// estilo por camada: pena (mm de papel), cor do traço, preenchimento, tracejado
const ESTILOS = {
  '0': { pena: 0.18, cor: '#222', fundo: 'none' },
  'QD-PAINEL': { pena: 0.35, cor: '#1b1b1b', fundo: 'none' },
  'QD-PORTA': { pena: 0.25, cor: '#333', fundo: 'none' },
  'QD-TRILHO': { pena: 0.13, cor: '#7a7a7a', fundo: '#e3e3e3' },
  'QD-CANALETA': { pena: 0.13, cor: '#8a8f99', fundo: '#eef0f4' },
  'QD-COMPONENTE': { pena: 0.2, cor: '#28406b', fundo: '#f3f6fb' },
  'QD-BORNE': { pena: 0.13, cor: '#5b6b3a', fundo: '#f2f5e9' },
  'QD-BARRAMENTO': { pena: 0.2, cor: '#8a4b14', fundo: '#e3a868' },
  'QD-RESERVA': { pena: 0.13, cor: '#888', fundo: 'none', traco: [2, 1.2] },
  'QD-COTA': { pena: 0.1, cor: '#1f5fa8', fundo: 'none' },
  'QD-TEXTO': { pena: 0, cor: '#111', fundo: 'none' },
  'QD-PLAQUETA': { pena: 0.13, cor: '#555', fundo: '#111' },
  'QD-ISOLADOR': { pena: 0.15, cor: '#5a4a1a', fundo: '#d9c27a' },
  'QD-PE': { pena: 0.15, cor: '#2d6a2d', fundo: '#bfe3a6' },
  'QD-NEUTRO': { pena: 0.15, cor: '#24548a', fundo: '#b7d3f2' },
  'QD-OCULTA': { pena: 0.13, cor: '#666', fundo: 'none', traco: [1.5, 1] },
};

const num = (v) => (Math.round(v * 1000) / 1000).toString();

// estilo: nome de camada (ESTILOS) ou objeto { pena, cor, fundo, traco }
function resolverEstilo(estilo) {
  if (estilo && typeof estilo === 'object') return { ...ESTILOS['0'], ...estilo };
  return ESTILOS[estilo] || ESTILOS['0'];
}

function criarPincelSvg({ escala = 10 } = {}) {
  const prims = [];
  const bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const marcar = (x, y) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    bb.x0 = Math.min(bb.x0, x); bb.x1 = Math.max(bb.x1, x);
    bb.y0 = Math.min(bb.y0, y); bb.y1 = Math.max(bb.y1, y);
  };
  const p = {
    escala,
    linha(x1, y1, x2, y2, layer) { marcar(x1, y1); marcar(x2, y2); prims.push({ t: 'l', x1, y1, x2, y2, e: layer }); },
    ret(x, y, w, h, layer, extra = {}) { marcar(x, y); marcar(x + w, y + h); prims.push({ t: 'r', x, y, w, h, e: layer, ...extra }); },
    circ(x, y, r, layer) { marcar(x - r, y - r); marcar(x + r, y + r); prims.push({ t: 'c', x, y, r, e: layer }); },
    // texto: altura = altura de maiúscula em mm do mundo (como no DXF); alinhar 'esquerda' | 'centro' | 'direita'
    txt(x, y, h, t, { layer = 'QD-TEXTO', alinhar = 'esquerda', rotacao = 0, cor = null, negrito = false } = {}) {
      const s = String(t ?? '');
      if (!s) return;
      const w = s.length * h * 0.62;
      const dx = alinhar === 'centro' ? w / 2 : alinhar === 'direita' ? w : 0;
      const rad = (rotacao * Math.PI) / 180;
      // caixa aproximada (rotação de 0 ou 90°, as usadas nos desenhos)
      if (Math.abs(Math.sin(rad)) > 0.5) { marcar(x - h, y - dx); marcar(x + h, y - dx + w); } else { marcar(x - dx, y - h); marcar(x - dx + w, y + h); }
      prims.push({ t: 't', x, y, h, s, e: layer, alinhar, rotacao, cor, negrito });
    },
    cheio(pts, layer) { pts.forEach(([x, y]) => marcar(x, y)); prims.push({ t: 'p', pts, e: layer, cheio: true }); },
    poli(pts, layer, fechada = false) { pts.forEach(([x, y]) => marcar(x, y)); prims.push({ t: 'p', pts, e: layer, fechada }); },
    // retângulo com cores explícitas (plaquetas, barras coloridas)
    retCor(x, y, w, h, { fundo = 'none', cor = '#333', pena = 0.15, raio = 0 } = {}) { p.ret(x, y, w, h, { fundo, cor, pena }, { raio }); },
    caixa() { return { ...bb }; },
    vazio() { return !prims.length; },
    // SVG final: viewBox em mm do mundo, origem no canto superior esquerdo da caixa + margem
    svg({ margem = 0, idClasse = '' } = {}) {
      const x0 = bb.x0 - margem, y1 = bb.y1 + margem;
      const L = (bb.x1 - bb.x0) + 2 * margem, A = (bb.y1 - bb.y0) + 2 * margem;
      const X = (x) => num(x - x0), Y = (y) => num(y1 - y);
      const pena = (e) => num(Math.max(0.02, resolverEstilo(e).pena) * escala);
      const tracejado = (e) => { const s = resolverEstilo(e); return s.traco ? ` stroke-dasharray="${s.traco.map(v => num(v * escala)).join(' ')}"` : ''; };
      const corpo = prims.map(k => {
        const s = resolverEstilo(k.e);
        if (k.t === 'l') return `<line x1="${X(k.x1)}" y1="${Y(k.y1)}" x2="${X(k.x2)}" y2="${Y(k.y2)}" stroke="${s.cor}" stroke-width="${pena(k.e)}"${tracejado(k.e)}/>`;
        if (k.t === 'r') return `<rect x="${X(k.x)}" y="${Y(k.y + k.h)}" width="${num(Math.abs(k.w))}" height="${num(Math.abs(k.h))}"${k.raio ? ` rx="${num(k.raio)}"` : ''} fill="${s.fundo}" stroke="${s.cor}" stroke-width="${pena(k.e)}"${tracejado(k.e)}/>`;
        if (k.t === 'c') return `<circle cx="${X(k.x)}" cy="${Y(k.y)}" r="${num(k.r)}" fill="${s.fundo}" stroke="${s.cor}" stroke-width="${pena(k.e)}"/>`;
        if (k.t === 'p') {
          const d = k.pts.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x)} ${Y(y)}`).join(' ') + (k.fechada || k.cheio ? ' Z' : '');
          return `<path d="${d}" fill="${k.cheio ? s.cor : (k.fechada ? s.fundo : 'none')}" stroke="${s.cor}" stroke-width="${pena(k.e)}"${tracejado(k.e)}/>`;
        }
        // texto: altura de maiúscula h → font-size ≈ h / 0.72 (Arial)
        const anc = k.alinhar === 'centro' ? 'middle' : k.alinhar === 'direita' ? 'end' : 'start';
        const base = k.alinhar === 'esquerda' ? '' : ' dominant-baseline="central"';
        const rot = k.rotacao ? ` transform="rotate(${num(-k.rotacao)} ${X(k.x)} ${Y(k.y)})"` : '';
        return `<text x="${X(k.x)}" y="${Y(k.y)}" font-size="${num(k.h / 0.72)}" text-anchor="${anc}"${base}${rot} fill="${k.cor || s.cor}"${k.negrito ? ' font-weight="bold"' : ''}>${escapeHtml(k.s)}</text>`;
      }).join('');
      return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(L)} ${num(A)}"${idClasse ? ` class="${escapeHtml(idClasse)}"` : ''} font-family="Arial, Helvetica, sans-serif">${corpo}</svg>`, largura: L, altura: A };
    },
  };
  return p;
}

module.exports = { criarPincelSvg, ESTILOS, escapeHtml };
