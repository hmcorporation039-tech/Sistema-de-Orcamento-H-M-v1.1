// Geometria e textos do DESENHO em PDF (traços lidos por utils/pdfVetorial.js,
// opção `geometria`), num lugar só: a conversão PDF → DXF
// (services/pdfParaDxf.js) e a classificação das pranchas
// (utils/classificarPranchaPdf.js) precisam reconhecer os mesmos arcos de porta,
// a mesma espessura de parede e juntar os mesmos pedaços de texto. Antes de
// 29/10/2026 estas funções moravam só na conversão.
const PT_EM_M = 25.4 / 72 / 1000; // 1 ponto do PDF no papel, em metros
const ESCALAS = [20, 25, 50, 75, 100, 125, 200, 250, 500];

// ── geometria ───────────────────────────────────────────────────────────
const sub2 = (a, b) => [a[0] - b[0], a[1] - b[1]];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const grau = (v) => ((Math.atan2(v[1], v[0]) * 180 / Math.PI) + 360) % 360;
const bezier = (p0, c1, c2, p3, t) => {
  const u = 1 - t;
  return [0, 1].map(i => u * u * u * p0[i] + 3 * u * u * t * c1[i] + 3 * u * t * t * c2[i] + t * t * t * p3[i]);
};

// Curva cúbica que é arco de círculo (o CAD exporta arco assim): centro no
// cruzamento das normais das pontas, mesmo raio nas pontas e no meio.
// Devolve { centro, r, inicio, fim } (graus, anti-horário) ou null.
function arcoDaCurva(p0, c1, c2, p3) {
  const t0 = sub2(c1, p0), t1 = sub2(p3, c2);
  const n0 = [-t0[1], t0[0]], n1 = [-t1[1], t1[0]];
  const det = n0[0] * -n1[1] + n1[0] * n0[1];
  if (Math.abs(det) < 1e-9 || dist(p0, p3) < 1e-6) return null;
  const d = sub2(p3, p0);
  const s = (d[0] * -n1[1] + n1[0] * d[1]) / det;
  const centro = [p0[0] + s * n0[0], p0[1] + s * n0[1]];
  const r = dist(centro, p0);
  const meio = bezier(p0, c1, c2, p3, 0.5);
  if (!(r > 0) || Math.abs(dist(centro, p3) - r) > r * 0.03 || Math.abs(dist(centro, meio) - r) > r * 0.03) return null;
  return { ...angulos(centro, p0, p3, meio), centro, r, p0, p3, meio };
}
// início/fim (graus, anti-horário) do arco de p0 a p3 passando por `meio`
function angulos(centro, p0, p3, meio) {
  const a0 = grau(sub2(p0, centro)), a1 = grau(sub2(p3, centro)), am = grau(sub2(meio, centro));
  const volta = (a) => (a - a0 + 360) % 360;
  return volta(am) < volta(a1) ? { inicio: a0, fim: a1 } : { inicio: a1, fim: a0 };
}
const varredura = (a) => (a.fim - a.inicio + 360) % 360 || 360;

// círculo pelos 3 pontos (null se alinhados)
function circulo3(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-12) return null;
  const q = (p) => p[0] * p[0] + p[1] * p[1];
  const centro = [(q(a) * (b[1] - c[1]) + q(b) * (c[1] - a[1]) + q(c) * (a[1] - b[1])) / d, (q(a) * (c[0] - b[0]) + q(b) * (a[0] - c[0]) + q(c) * (b[0] - a[0])) / d];
  return { centro, r: dist(centro, a) };
}

// Pedaços seguidos do mesmo círculo viram um arco só: o PDF pode partir um arco
// de 90° em 2 curvas (AutoCAD) ou em 16 de 5,6° (Chromium). O centro de um pedaço
// curto é impreciso: junta-se pela continuidade das pontas e o círculo é refeito
// pelos 3 pontos (início, junção, fim), conferindo que o ponto do meio cai nele.
function juntarArco(lista, a) {
  const ult = lista.at(-1);
  if (ult && Math.abs(ult.r - a.r) < ult.r * 0.03) {
    const tol = ult.r * 0.02;
    let ini = null, juncao = null, fim = null;
    if (dist(ult.p3, a.p0) < tol) [ini, juncao, fim] = [ult.p0, a.p0, a.p3];
    else if (dist(a.p3, ult.p0) < tol) [ini, juncao, fim] = [a.p0, ult.p0, ult.p3];
    const c = ini && circulo3(ini, juncao, fim);
    if (c && Math.abs(dist(c.centro, a.meio) - c.r) < c.r * 0.02 && Math.abs(dist(c.centro, ult.meio) - c.r) < c.r * 0.02) {
      Object.assign(ult, { centro: c.centro, r: c.r, p0: ini, p3: fim, meio: juncao, ...angulos(c.centro, ini, fim, juncao) });
      return;
    }
  }
  lista.push({ ...a });
}

// ── escala ──────────────────────────────────────────────────────────────
// Pelos arcos de porta (≈ 90°): a escala padrão em que o raio mediano fica mais
// perto de 0,80 m, desde que caia entre 0,55 e 1,10 m.
// `segmentos` ([[a, b]], opcional): só vale o arco com a FOLHA desenhada (reta do
// centro até uma ponta do arco) — numa planta elétrica os cantos arredondados dos
// símbolos e as curvas de eletroduto também são arcos de 90° e puxavam o mediano.
// Sem ao menos 2 arcos com folha, volta à regra antiga (todos os arcos de 90°).
function escalaPelasPortas(arcosPt, segmentos = null) {
  let lista = arcosPt.filter(a => { const v = varredura(a); return v >= 75 && v <= 105; });
  if (segmentos?.length) {
    const comFolha = arcosComFolha(lista, segmentos);
    if (comFolha.length >= 2) lista = comFolha;
  }
  const raios = lista.map(a => a.r).sort((x, y) => x - y);
  if (raios.length < 2) return null;
  const mediano = raios[Math.floor(raios.length / 2)];
  let melhor = null;
  for (const e of ESCALAS) {
    const m = mediano * PT_EM_M * e;
    if (m >= 0.55 && m <= 1.1 && (!melhor || Math.abs(m - 0.8) < Math.abs(melhor.m - 0.8))) melhor = { e, m };
  }
  return melhor?.e || null;
}

// Arcos com a folha da porta: reta que sai do centro (dobradiça) e termina numa
// das pontas do arco (folha aberta ou fechada). Índice por grade nas pontas das retas.
function arcosComFolha(arcos, segmentos) {
  const cel = 4;
  const grade = new Map();
  const k = (p) => `${Math.floor(p[0] / cel)},${Math.floor(p[1] / cel)}`;
  for (const s of segmentos) for (const p of s) { const c = k(p); (grade.get(c) || grade.set(c, []).get(c)).push(s); }
  const perto = (p) => {
    const [i, j] = [Math.floor(p[0] / cel), Math.floor(p[1] / cel)];
    const out = [];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) out.push(...(grade.get(`${i + a},${j + b}`) || []));
    return out;
  };
  // raio de menos de 2 pt é ponta arredondada de traço, não porta
  return arcos.filter(a => a.r >= 2).filter(a => {
    const tol = Math.max(0.8, a.r * 0.06);
    return perto(a.centro).some(([p, q]) => {
      const [c, o] = dist(p, a.centro) <= dist(q, a.centro) ? [p, q] : [q, p];
      return dist(c, a.centro) <= tol && (dist(o, a.p0) <= tol || dist(o, a.p3) <= tol);
    });
  });
}

// ── textos: junta os pedaços de uma mesma linha ─────────────────────────
function juntarTextos(textos) {
  const horiz = textos.filter(t => t.horizontal).sort((a, b) => (Math.abs(a.y - b.y) < Math.min(a.h, b.h) * 0.3 ? a.x - b.x : a.y - b.y));
  const saida = [];
  for (const t of horiz) {
    const ult = saida.at(-1);
    if (ult && Math.abs(ult.y - t.y) < ult.h * 0.3 && Math.abs(ult.h - t.h) < ult.h * 0.25) {
      const vao = t.x - (ult.x + ult.w);
      if (vao > -ult.h * 0.3 && vao < ult.h * 0.6) {
        ult.s += vao > ult.h * 0.12 ? ` ${t.s}` : t.s;
        ult.w = t.x + t.w - ult.x;
        continue;
      }
    }
    saida.push({ ...t });
  }
  return [...saida, ...textos.filter(t => !t.horizontal)];
}

// ── espessura que é parede ──────────────────────────────────────────────
// Espessuras (por comprimento de traço): parede é a faixa bem mais grossa que a
// mediana, com pelo menos 3% do total desenhado. null = tudo da mesma espessura.
function espessuraDeParede(caminhos) {
  const porLw = new Map();
  let total = 0;
  for (const c of caminhos) {
    if (!c.traco || c.dash) continue;
    const lw = Math.round(c.lwPg * 20) / 20;
    porLw.set(lw, (porLw.get(lw) || 0) + c.comp);
    total += c.comp;
  }
  if (!total) return null;
  const faixas = [...porLw.entries()].sort((a, b) => a[0] - b[0]);
  let acum = 0, mediana = faixas[0][0];
  for (const [lw, comp] of faixas) { acum += comp; if (acum >= total / 2) { mediana = lw; break; } }
  const limite = Math.max(mediana * 1.6, mediana + 0.15);
  const grossas = faixas.filter(([lw]) => lw >= limite).reduce((s, [, c]) => s + c, 0);
  return grossas >= total * 0.03 ? limite : null;
}

module.exports = {
  PT_EM_M, ESCALAS, sub2, dist, bezier, arcoDaCurva, angulos, varredura, circulo3, juntarArco, escalaPelasPortas, arcosComFolha, juntarTextos, espessuraDeParede,
};
