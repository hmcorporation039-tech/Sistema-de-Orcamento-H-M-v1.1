// Parte da leitura vetorial de PDF (utils/pdfVetorial.js, que explica o método inteiro):
// passo 1, geometria e textos de uma página.
const { cronometro } = require('./tempo');

const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const hex = (a) => (typeof a?.[0] === 'string' ? a[0] : `#${[...(a || [])].map(v => Math.round(+v).toString(16).padStart(2, '0')).join('')}`).toLowerCase();

let pdfjsCarregado = null;
const pdfjs = () => (pdfjsCarregado ||= import('pdfjs-dist/legacy/build/pdf.mjs'));

// ── 1) Geometria e textos de uma página ────────────────────────────────────
// `geometria`: cada caminho leva também os trechos (subs: [{ segs, fechado }],
// seg = ['l', a, b] ou ['c', p0, c1, c2, p3] em pontos da página) e a espessura
// na página (lwPg) — usado pela conversão PDF → DXF (services/pdfParaDxf.js).
// `ops`: lista de operadores já lida (quem chamou já contou os traços).
// `prazo` (Date.now() limite, opcional): passou, para com erro TEMPO_ESGOTADO.
async function lerPagina(pagina, OPS, { geometria = false, ops: opsLidos = null, prazo = null } = {}) {
  const relogio = cronometro(prazo);
  const vp = pagina.getViewport({ scale: 1 });
  const ops = opsLidos || await pagina.getOperatorList();
  const FILL = new Set([OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  const STROKE = new Set([OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  let st = { ctm: vp.transform.slice(), fill: '#000000', stroke: '#000000', lw: 1, dash: '' };
  const pilha = [];
  const caminhos = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    relogio();
    const fn = ops.fnArray[i], a = ops.argsArray[i];
    switch (fn) {
      case OPS.save: pilha.push({ ...st, ctm: st.ctm.slice() }); break;
      case OPS.restore: st = pilha.pop() || st; break;
      case OPS.transform: st.ctm = mul(st.ctm, a); break;
      case OPS.paintFormXObjectBegin: pilha.push({ ...st, ctm: st.ctm.slice() }); if (a?.[0]) st.ctm = mul(st.ctm, a[0]); break;
      case OPS.paintFormXObjectEnd: st = pilha.pop() || st; break;
      case OPS.setFillRGBColor: st.fill = hex(a); break;
      case OPS.setStrokeRGBColor: st.stroke = hex(a); break;
      case OPS.setLineWidth: st.lw = a[0]; break;
      case OPS.setDash: st.dash = (a[0] || []).map(v => Math.round(v * 10) / 10).join(','); break;
      case OPS.constructPath: {
        const pintura = a[0];
        const d = a[1]?.[0];
        if (!d || typeof d.length !== 'number') break;
        // `curvas`: quantos trechos são curva — com `segs` e `comp`, não muda quando o símbolo é girado (legenda.js)
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, comp = 0, segs = 0, curvas = 0;
        let cx = 0, cy = 0, sx = 0, sy = 0, ini = null, fim = null;
        const ponto = (x, y) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; };
        const subs = geometria ? [] : null;
        let sub = null;
        for (let k = 0; k < d.length;) {
          const o = d[k++];
          if (o === 0) {
            [cx, cy] = ap(st.ctm, d[k++], d[k++]); sx = cx; sy = cy; ini ||= [cx, cy]; ponto(cx, cy);
            if (subs) { sub = { segs: [], fechado: false }; subs.push(sub); }
          } else if (o === 1 || o === 2) {
            const c1 = o === 2 ? ap(st.ctm, d[k++], d[k++]) : null;
            const c2 = o === 2 ? ap(st.ctm, d[k++], d[k++]) : null;
            const [x, y] = ap(st.ctm, d[k++], d[k++]);
            if (sub) sub.segs.push(o === 2 ? ['c', [cx, cy], c1, c2, [x, y]] : ['l', [cx, cy], [x, y]]);
            comp += Math.hypot(x - cx, y - cy); cx = x; cy = y; segs++; if (o === 2) curvas++; ponto(x, y); fim = [x, y];
          } else if (o === 3) {
            if (sub) { if (Math.hypot(sx - cx, sy - cy) > 1e-6) sub.segs.push(['l', [cx, cy], [sx, sy]]); sub.fechado = true; }
            comp += Math.hypot(sx - cx, sy - cy); cx = sx; cy = sy; segs++;
          } else break;
        }
        if (!Number.isFinite(x0)) break;
        const cheio = FILL.has(pintura), traco = STROKE.has(pintura);
        if (!cheio && !traco) break;
        // reta: um segmento só (ou caminho cujo comprimento ≈ distância das pontas)
        const reto = !!(ini && fim) && Math.abs(Math.hypot(fim[0] - ini[0], fim[1] - ini[1]) - comp) < 0.5;
        const c = { cheio, traco, fill: st.fill, stroke: st.stroke, lw: +(+st.lw).toFixed(2), dash: st.dash, caixa: [x0, y0, x1, y1], comp, segs, curvas, reto };
        if (subs) Object.assign(c, { subs: subs.filter(s => s.segs.length), lwPg: (+st.lw || 0) * Math.sqrt(Math.abs(st.ctm[0] * st.ctm[3] - st.ctm[1] * st.ctm[2])) });
        caminhos.push(c);
        break;
      }
      default: break;
    }
  }
  const tc = await pagina.getTextContent();
  const textos = tc.items.filter(t => t.str && t.str.trim()).map(t => {
    const m = mul(vp.transform, t.transform);
    const h = Math.hypot(m[2], m[3]) || 1;
    return { s: t.str.trim(), x: m[4], y: m[5], h, w: t.width || t.str.length * h * 0.5, horizontal: Math.abs(m[1]) < 1e-3 };
  });
  return { largura: vp.width, altura: vp.height, caminhos, textos, operadores: ops.fnArray.length };
}

module.exports = { mul, ap, hex, pdfjs, lerPagina };