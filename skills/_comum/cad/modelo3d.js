// Modelo 3D ILUSTRATIVO (não é BIM) a partir da arquitetura 2D lida em
// ./arquitetura.js e, opcionalmente, dos pontos de uma ou mais disciplinas
// posicionados pelas mesmas regras da planta DXF (./estimativaArquitetura.js).
// Devolve uma CENA em JSON simples, que ./visualizador3d.js transforma numa
// página HTML autossuficiente (three.js embutido), e os NÚMEROS DO PROJETO.
//
// Como a cena é montada:
//   - paredes: linhas das layers de parede agrupadas por direção; duas linhas
//     paralelas a 5–45 cm uma da outra viram UMA parede com essa espessura
//     (o vão da porta já vem aberto no desenho); linha solta vira parede fina;
//     layer "baixa"/mureta → 1,10 m, "média" → 1,60 m, guarda-corpo → 1,10 m;
//   - janelas (layers de esquadria): peitoril até 1,10 m, vidro até 2,10 m e
//     verga até o pé-direito; portas: verga acima de 2,10 m e folha aberta 90°;
//   - pilares: polilinha fechada pequena (≤ 1,5 m) em layer de parede/estrutura;
//   - piso por ambiente com cor pelo tipo (nome) e etiqueta com nome e área;
//   - dispositivos na altura típica de instalação (tomada baixa 0,30 m, média
//     1,10 m, alta 2,20 m, interruptor 1,10 m, luminária/detector no teto,
//     câmera no alto do canto etc.), encostados na face da parede mais próxima.
// Coordenadas em metros, relativas ao centro da região do modelo (origem).
const { dentro, centroide, perimetro, RE_PAREDE, RE_NAO_PAREDE } = require('./arquitetura');
const { tipoDoAmbiente, ehAmbienteValido } = require('./estimativaArquitetura');
const { SIMBOLOS } = require('./simbolos');

const AVISO = 'Ilustração — não substitui o projeto executivo. Modelo gerado automaticamente a partir da planta 2D (não é BIM): alturas, esquadrias e posições dos pontos são típicas e indicativas.';
const PE_DIREITO_PADRAO = 2.8;
const ALTURA_PORTA = 2.1;
const PEITORIL = 1.1;
const TOPO_JANELA = 2.1;

const r2 = (v) => Math.round(v * 100) / 100;
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

// ── Ambientes ───────────────────────────────────────────────────────────────
const TIPOS = {
  social: { rotulo: 'Social / estar', cor: '#d9c38f' },
  intimo: { rotulo: 'Íntimo (dormitórios)', cor: '#9fb9d8' },
  molhado: { rotulo: 'Molhado (banho, cozinha, serviço)', cor: '#8fd0c4' },
  trabalho: { rotulo: 'Trabalho / salas', cor: '#c3a4d2' },
  circulacao: { rotulo: 'Circulação', cor: '#b8b8b2' },
  tecnico: { rotulo: 'Técnico / apoio', cor: '#cf9f7f' },
  garagem: { rotulo: 'Garagem', cor: '#a7a39b' },
  externo: { rotulo: 'Externo (jardim, varanda)', cor: '#93bf86' },
  outros: { rotulo: 'Outros', cor: '#cdcac2' },
};

const caixaDe = (pts) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
};
const uniao = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
const expandir = (c, m) => [c[0] - m, c[1] - m, c[2] + m, c[3] + m];
const naCaixa = (c, [x, y]) => x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3];
const distCaixas = (a, b) => Math.hypot(Math.max(0, a[0] - b[2], b[0] - a[2]), Math.max(0, a[1] - b[3], b[1] - a[3]));

// Região do modelo: os ambientes internos válidos (descarta notas, vazios,
// projeções e grupos isolados — carimbo, implantação), mais os externos colados
function regiaoDoModelo(arquitetura) {
  const validos = arquitetura.ambientes.filter(ehAmbienteValido).map(a => ({ ...a, tipo: tipoDoAmbiente(a.nome), caixa: caixaDe(a.poligono) }));
  const internos = validos.filter(a => a.tipo !== 'externo');
  const base = internos.length ? internos : validos;
  if (!base.length) {
    // sem ambientes: miolo do desenho (percentis 5–95 % das entidades)
    const xs = arquitetura.referencia.map(r => r.pts[0][0]).sort((a, b) => a - b), ys = arquitetura.referencia.map(r => r.pts[0][1]).sort((a, b) => a - b);
    const q = (v, f) => v[Math.min(v.length - 1, Math.floor(f * v.length))] ?? 0;
    return { caixa: [q(xs, 0.05), q(ys, 0.05), q(xs, 0.95), q(ys, 0.95)], ambientes: [] };
  }
  // grupos de ambientes próximos (≤ 12 m); fica o maior e os que têm ≥ 20 % da área dele
  const grupo = base.map((_, i) => i);
  const raiz = (i) => (grupo[i] === i ? i : (grupo[i] = raiz(grupo[i])));
  for (let i = 0; i < base.length; i++) for (let j = i + 1; j < base.length; j++) if (distCaixas(base[i].caixa, base[j].caixa) <= 12) grupo[raiz(i)] = raiz(j);
  const areas = {};
  base.forEach((a, i) => { areas[raiz(i)] = (areas[raiz(i)] || 0) + a.area_m2; });
  const maior = Math.max(...Object.values(areas));
  const escolhidos = base.filter((a, i) => areas[raiz(i)] >= 0.2 * maior);
  let caixa = escolhidos.map(a => a.caixa).reduce(uniao);
  const perto = expandir(caixa, 6);
  const externos = validos.filter(a => a.tipo === 'externo' && a.area_m2 <= 1500 && naCaixa(perto, centroide(a.poligono)));
  for (const e of externos) caixa = uniao(caixa, e.caixa);
  return { caixa: expandir(caixa, 1.5), ambientes: [...escolhidos, ...(internos.length ? externos : [])] };
}

// ── Classes de layer ─────────────────────────────────────────────────────────
const RE_JANELA = /JANEL|ESQUAD|CAIXILH|VIDRO|WINDOW|(^|[^A-Z])ESQ([^A-Z]|$)/i;
const RE_PILAR = /PILAR|COLUN|ESTRUT|(^|[^A-Z])EST([^A-Z]|$)/i;
const RE_MURETA = /BAIX|MURET|PEITORIL/i;
const RE_MEDIA = /M[EÉ]DIA/i;
const RE_GUARDA = /GUARDA|GRADIL|CORRIM|PARAPEITO/i;
function classeDaLayer(layer, haParede) {
  const l = layer || '';
  if (RE_NAO_PAREDE.test(l) && !RE_PAREDE.test(l) && !RE_GUARDA.test(l)) return null;
  if (RE_JANELA.test(l)) return 'janela';
  if (RE_GUARDA.test(l)) return 'guarda';
  if (RE_PILAR.test(l)) return 'pilar';
  if (RE_PAREDE.test(l)) return RE_MURETA.test(l) ? 'mureta' : RE_MEDIA.test(l) ? 'media' : 'parede';
  return haParede ? null : 'parede'; // desenho sem layer de parede reconhecível: tudo que não é anotação
}

// ── Intervalos (listas ordenadas de [a, b]) ─────────────────────────────────
function juntar(iv, folga = 0.01) {
  const s = iv.filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  const out = [];
  for (const [a, b] of s) { const u = out[out.length - 1]; if (u && a <= u[1] + folga) u[1] = Math.max(u[1], b); else out.push([a, b]); }
  return out;
}
function intersecao(A, B) {
  const out = [];
  let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    const a = Math.max(A[i][0], B[j][0]), b = Math.min(A[i][1], B[j][1]);
    if (b > a) out.push([a, b]);
    if (A[i][1] < B[j][1]) i++; else j++;
  }
  return out;
}
function subtrair(A, B) {
  let out = A.map(x => [...x]);
  for (const [b0, b1] of B) out = out.flatMap(([a0, a1]) => (b1 <= a0 || b0 >= a1 ? [[a0, a1]] : [...(b0 > a0 ? [[a0, b0]] : []), ...(b1 < a1 ? [[b1, a1]] : [])]));
  return out;
}

// ── Paredes, janelas e pilares ──────────────────────────────────────────────
const ALTURA_CLASSE = { mureta: PEITORIL, media: 1.6, guarda: 1.1 };

function extrairElementos(arquitetura, caixa, peDireito) {
  const refs = arquitetura.referencia.filter(r => r.pts.length >= 2 && r.pts.some(p => naCaixa(caixa, p)));
  const layers = [...new Set(refs.map(r => r.layer))];
  const haParede = layers.some(l => RE_PAREDE.test(l || '') && !RE_JANELA.test(l || ''));
  const classe = new Map(layers.map(l => [l, classeDaLayer(l, haParede)]));
  const portas = (arquitetura.portas || []).filter(p => naCaixa(caixa, p.meio));

  // pilares: polilinha fechada pequena em layer de parede/estrutura
  const pilares = [];
  const usados = new Set();
  for (const r of refs) {
    const c = classe.get(r.layer);
    if (!r.fechada || r.tipo !== 'poli' || !['pilar', 'parede', 'media'].includes(c)) continue;
    const [x0, y0, x1, y1] = caixaDe(r.pts);
    const [L, W] = [x1 - x0, y1 - y0].sort((a, b) => b - a);
    if (L <= 1.5 && W >= 0.1 && L * W >= 0.02) {
      // na layer de pilar é pilar; na de parede, só o "quadrado" (≤ 0,8 m, proporção ≤ 2,5) conta como
      // pilar — retângulo comprido fechado é trecho de parede (sobe igual, mas não entra na contagem)
      const ehPilar = c === 'pilar' || (L <= 0.8 && L / W <= 2.5);
      pilares.push({ pts: r.pts.slice(0, r.pts.length - (dist(r.pts[0], r.pts.at(-1)) < 1e-6 ? 1 : 0)), ehPilar });
      usados.add(r);
    }
  }

  // segmentos por classe (arcos só em layer de parede: parede curva; arco de porta fica de fora)
  const folhaDePorta = (p, q) => portas.some(pt => {
    const L = pt.largura_m / (pt.dupla ? 2 : 1);
    return (Math.min(dist(p, pt.dobradica), dist(q, pt.dobradica)) < 0.08 || (pt.dupla && Math.min(dist(p, pt.batente), dist(q, pt.batente)) < 0.08)) && Math.abs(dist(p, q) - L) < 0.12;
  });
  // linha de soleira/folha fechada dentro do vão da porta não é janela
  const noVao = (p, q) => portas.some(pt => {
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const v = [q[0] - p[0], q[1] - p[1]], L = Math.hypot(...v) || 1;
    return dist(m, pt.meio) < pt.largura_m / 2 + 0.25 && Math.abs((v[0] * pt.u[1] - v[1] * pt.u[0]) / L) < 0.2;
  });
  const segs = [];
  for (const r of refs) {
    const c = classe.get(r.layer);
    if (!c || c === 'pilar' || usados.has(r)) continue;
    if (r.tipo === 'arco' && c === 'janela') continue;
    const pts = r.pts;
    const lados = pts.slice(1).map((p, i) => [pts[i], p]);
    if (r.fechada && dist(pts[0], pts.at(-1)) > 1e-6) lados.push([pts.at(-1), pts[0]]);
    for (const [p, q] of lados) {
      const L = dist(p, q);
      if (L < 0.03 || !naCaixa(caixa, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2])) continue;
      if (folhaDePorta(p, q)) continue;
      if (c === 'janela' && (L < 0.25 || noVao(p, q))) continue;
      segs.push({ p, q, classe: c });
    }
  }

  // agrupa por direção (tolerância 0,6°); ângulo em [0, π)
  const TOL = (0.6 * Math.PI) / 180;
  for (const s of segs) {
    let th = Math.atan2(s.q[1] - s.p[1], s.q[0] - s.p[0]);
    if (th < 0) th += Math.PI;
    if (th >= Math.PI - TOL) th -= Math.PI;
    s.th = th;
  }
  segs.sort((a, b) => a.th - b.th);
  const grupos = [];
  for (const s of segs) {
    const g = grupos[grupos.length - 1];
    if (g && s.th - g.ultimo <= TOL) { g.itens.push(s); g.ultimo = s.th; } else grupos.push({ itens: [s], ultimo: s.th });
  }

  const paredes = [];   // { a, b, esp, z0, z1, classe }
  const janelas = [];   // { a, b, esp }
  for (const g of grupos) {
    const th = g.itens.reduce((s, x) => s + x.th, 0) / g.itens.length;
    const u = [Math.cos(th), Math.sin(th)], n = [-u[1], u[0]];
    const pt = (t, d) => [u[0] * t + n[0] * d, u[1] * t + n[1] * d];
    const porClasse = {};
    for (const s of g.itens) {
      const tp = s.p[0] * u[0] + s.p[1] * u[1], tq = s.q[0] * u[0] + s.q[1] * u[1];
      const d = ((s.p[0] + s.q[0]) * n[0] + (s.p[1] + s.q[1]) * n[1]) / 2;
      (porClasse[s.classe] = porClasse[s.classe] || []).push({ d, iv: [Math.min(tp, tq), Math.max(tp, tq)] });
    }
    for (const [c, lista] of Object.entries(porClasse)) {
      // linhas sobrepostas (mesmo desenho repetido) viram uma só
      lista.sort((a, b) => a.d - b.d);
      const linhas = [];
      for (const x of lista) {
        const l = linhas[linhas.length - 1];
        if (l && x.d - l.dUlt < 0.015) { l.ivs.push(x.iv); l.soma += x.d; l.k++; l.dUlt = x.d; } else linhas.push({ ivs: [x.iv], soma: x.d, k: 1, dUlt: x.d });
      }
      for (const l of linhas) { l.d = l.soma / l.k; l.rest = juntar(l.ivs); }

      if (c === 'janela') {
        // faixa de linhas paralelas próximas (caixilho, vidro, peitoril) = uma janela
        let i = 0;
        while (i < linhas.length) {
          let j = i;
          while (j + 1 < linhas.length && linhas[j + 1].d - linhas[j].d <= 0.12 && linhas[j + 1].d - linhas[i].d <= 0.4) j++;
          const faixa = linhas.slice(i, j + 1);
          const d0 = faixa[0].d, d1 = faixa[faixa.length - 1].d;
          for (const [a, b] of juntar(faixa.flatMap(l => l.rest), 0.05)) {
            if (b - a >= 0.4) janelas.push({ a: pt(a, (d0 + d1) / 2), b: pt(b, (d0 + d1) / 2), esp: Math.max(d1 - d0, 0.06) });
          }
          i = j + 1;
        }
        continue;
      }

      const z1 = ALTURA_CLASSE[c] ? Math.min(ALTURA_CLASSE[c], peDireito) : peDireito;
      const add = (a, b, d, esp) => { if (b - a >= 0.03) paredes.push({ a: pt(a, d), b: pt(b, d), esp, z0: 0, z1, classe: c }); };
      // pares de faces paralelas a 5–45 cm: a parede com a espessura real (os mais próximos primeiro)
      const pares = [];
      const [emin, emax] = c === 'guarda' ? [0.02, 0.3] : [0.05, 0.45];
      for (let i = 0; i < linhas.length; i++) {
        for (let j = i + 1; j < linhas.length && linhas[j].d - linhas[i].d <= emax; j++) {
          if (linhas[j].d - linhas[i].d >= emin) pares.push([i, j, linhas[j].d - linhas[i].d]);
        }
      }
      pares.sort((p, q) => p[2] - q[2]);
      for (const [i, j, esp] of pares) {
        const A = linhas[i], B = linhas[j];
        const ov = intersecao(A.rest, B.rest).filter(([a, b]) => b - a >= 0.05);
        if (!ov.length) continue;
        for (const [a, b] of ov) add(a, b, (A.d + B.d) / 2, esp);
        A.rest = subtrair(A.rest, ov); B.rest = subtrair(B.rest, ov);
        if (!A.par) A.par = { esp, lado: 1 };
        if (!B.par) B.par = { esp, lado: -1 };
      }
      // sobras: trecho curto de uma face já pareada (canto, encontro de paredes)
      // ganha a espessura dela; linha solta vira parede fina
      for (const l of linhas) {
        for (const [a, b] of l.rest) {
          if (b - a < 0.05) continue;
          if (l.par && b - a <= 1.2) add(a, b, l.d + (l.par.lado * l.par.esp) / 2, l.par.esp);
          else add(a, b, l.d, c === 'guarda' ? 0.05 : 0.1);
        }
      }
    }
  }

  // portas: verga acima de 2,10 m (na linha da parede vizinha) e folha aberta
  const vergas = [];
  const folhas = [];
  const cheias = paredes.filter(p => p.classe === 'parede');
  const paredeJunto = (p0, u) => {
    let melhor = null;
    for (const w of cheias) {
      const v = [w.b[0] - w.a[0], w.b[1] - w.a[1]], L = Math.hypot(...v);
      if (L < 0.02 || Math.abs((v[0] * u[1] - v[1] * u[0]) / L) > 0.1) continue;
      const t = ((p0[0] - w.a[0]) * v[0] + (p0[1] - w.a[1]) * v[1]) / (L * L);
      const q = [w.a[0] + v[0] * t, w.a[1] + v[1] * t];
      const dd = dist(p0, q) - w.esp / 2;
      if (t > -0.6 / L && t < 1 + 0.6 / L && dd < 0.15 && (!melhor || dd < melhor.dd)) melhor = { w, dd, v, L };
    }
    return melhor;
  };
  for (const p of portas) {
    const viz = paredeJunto(p.dobradica, p.u) || paredeJunto(p.batente, p.u);
    const esp = viz ? viz.w.esp : 0.15;
    // linha de centro da parede passando pelo vão
    let a = p.dobradica, b = p.batente;
    if (viz) {
      const { w, v, L } = viz;
      const proj = (q) => { const t = ((q[0] - w.a[0]) * v[0] + (q[1] - w.a[1]) * v[1]) / (L * L); return [w.a[0] + v[0] * t, w.a[1] + v[1] * t]; };
      a = proj(a); b = proj(b);
    } else {
      a = [a[0] + p.n[0] * esp / 2, a[1] + p.n[1] * esp / 2]; b = [b[0] + p.n[0] * esp / 2, b[1] + p.n[1] * esp / 2];
    }
    if (peDireito > ALTURA_PORTA + 0.05) vergas.push({ a, b, esp, z0: ALTURA_PORTA, z1: peDireito, classe: 'verga' });
    const largFolha = p.largura_m / (p.dupla ? 2 : 1);
    for (const h of p.dupla ? [p.dobradica, p.batente] : [p.dobradica]) {
      folhas.push({ a: h, b: [h[0] + p.n[0] * largFolha, h[1] + p.n[1] * largFolha] });
    }
  }
  // janela: peitoril + vidro + verga na mesma espessura
  for (const j of janelas) {
    paredes.push({ a: j.a, b: j.b, esp: j.esp, z0: 0, z1: Math.min(PEITORIL, peDireito), classe: 'peitoril' });
    if (peDireito > TOPO_JANELA + 0.05) vergas.push({ a: j.a, b: j.b, esp: j.esp, z0: TOPO_JANELA, z1: peDireito, classe: 'verga' });
  }
  // planta de referência no piso: o que não é parede nem anotação (mobiliário,
  // louças, bancadas, escada), em cm relativos à origem, Int16 em base64
  const RE_ANOTACAO = /COTA|DIM|TEXT|TXT|EIXO|HACH|CARIMBO|SELO|NOTA|LEGENDA|CORTE|VIEWPORT|DEFPOINTS|N[IÍ]VEL|SETA|S[IÍ]MB|PROJE|PROJ\b|COBERT|TELHA|BEIRAL|VAGAS|CURVA|TALUDE|VIAS|AREA|ÁREA|DEMOLIR|LIMITE|PAGIN|MARGEM|INDICA|ESPECIF|FORRO|ILUM|EL[EÉ]T|HIDR|ESGOTO|GASES|TUBUL|INC[EÊ]ND|SPK|AR-|^AR\b|DUTO/i;
  const pl = [];
  for (const r of refs) {
    if (classe.get(r.layer) || RE_ANOTACAO.test(r.layer || '')) continue;
    const pts = r.pts;
    for (let i = 1; i < pts.length; i++) pl.push([pts[i - 1], pts[i]]);
    if (r.fechada && pts.length > 2 && dist(pts[0], pts.at(-1)) > 1e-6) pl.push([pts.at(-1), pts[0]]);
  }
  const dentroCaixa = pl.filter(([p, q]) => naCaixa(caixa, p) && naCaixa(caixa, q) && dist(p, q) >= 0.02);
  const LIMITE = 25000;
  const escolhidos = dentroCaixa.length > LIMITE ? dentroCaixa.sort((x, y) => dist(y[0], y[1]) - dist(x[0], x[1])).slice(0, LIMITE) : dentroCaixa;
  const cx = (caixa[0] + caixa[2]) / 2, cy = (caixa[1] + caixa[3]) / 2;
  const buf = new Int16Array(escolhidos.length * 4);
  escolhidos.forEach(([p, q], i) => {
    buf[i * 4] = Math.round((p[0] - cx) * 100); buf[i * 4 + 1] = Math.round((p[1] - cy) * 100);
    buf[i * 4 + 2] = Math.round((q[0] - cx) * 100); buf[i * 4 + 3] = Math.round((q[1] - cy) * 100);
  });
  const planta = Math.max(caixa[2] - caixa[0], caixa[3] - caixa[1]) < 650 ? Buffer.from(buf.buffer).toString('base64') : '';
  return { paredes: [...paredes, ...vergas], janelas, pilares, folhas, portas, planta, linhasPlanta: escolhidos.length };
}

// ── Dispositivos ────────────────────────────────────────────────────────────
// altura de instalação típica (m) ou montagem: teto, canto (alto do canto),
// topo-porta (acima do vão), piso
const ESPEC = {
  'HM-ELE-TOMADA-BAIXA': { h: 0.3, forma: 'tomada' }, 'HM-ELE-TOMADA-MEDIA': { h: 1.1, forma: 'tomada' }, 'HM-ELE-TOMADA-ALTA': { h: 2.2, forma: 'tomada' },
  'HM-ELE-TUE': { h: 1.1, hMolhado: 2.2, forma: 'tomada' }, 'HM-ELE-PONTO-LUZ': { h: 'teto', forma: 'ponto-luz' },
  'HM-ELE-INTERRUPTOR': { h: 1.1, forma: 'interruptor' }, 'HM-ELE-QUADRO': { h: 1.5, forma: 'quadro' },
  'HM-ILU-LUMINARIA': { h: 'teto', forma: 'luminaria' }, 'HM-ILU-SENSOR': { h: 'teto', forma: 'sensor' }, 'HM-ILU-COMANDO': { h: 1.1, forma: 'interruptor' },
  'HM-HOSP-TOMADA-IT': { h: 1.1, forma: 'tomada' }, 'HM-HOSP-BEL': { h: 0.3, forma: 'caixa' }, 'HM-HOSP-PAINEL-ALARME': { h: 1.5, forma: 'caixa' },
  'HM-CAB-PONTO-REDE': { h: 0.3, forma: 'tomada' }, 'HM-CAB-AP': { h: 'teto', forma: 'sensor' }, 'HM-CAB-RACK': { h: 1.6, forma: 'rack' },
  'HM-TEL-PONTO': { h: 1.4, forma: 'tomada' }, 'HM-TEL-PORTEIRO': { h: 1.4, forma: 'caixa' }, 'HM-TEL-DG': { h: 1.5, forma: 'quadro' },
  'HM-ANT-PONTO': { h: 0.3, forma: 'tomada' }, 'HM-ANT-SAT': { h: 0.3, forma: 'tomada' },
  'HM-CFTV-CAMERA': { h: 'canto', forma: 'camera' },
  'HM-ACE-LEITOR': { h: 1.1, forma: 'interruptor' }, 'HM-ACE-FECHADURA': { h: 'topo-porta', forma: 'barra' }, 'HM-ACE-SENSOR': { h: 'topo-porta', forma: 'barra' },
  'HM-ACE-BOTOEIRA': { h: 1.1, forma: 'interruptor' }, 'HM-ACE-EMERGENCIA': { h: 1.2, forma: 'interruptor' }, 'HM-ACE-CONTROLADORA': { h: 2.0, forma: 'caixa' }, 'HM-ACE-CATRACA': { h: 'piso', forma: 'catraca' },
  'HM-ALM-IVP': { h: 'canto', forma: 'sensor-canto' }, 'HM-ALM-MAGNETICO': { h: 'topo-porta', forma: 'barra' }, 'HM-ALM-SIRENE': { h: 2.4, forma: 'caixa' },
  'HM-ALM-TECLADO': { h: 1.4, forma: 'caixa' }, 'HM-ALM-CENTRAL': { h: 1.6, forma: 'quadro' },
  'HM-INC-DETECTOR-FUMACA': { h: 'teto', forma: 'detector' }, 'HM-INC-DETECTOR-TEMP': { h: 'teto', forma: 'detector' }, 'HM-INC-ACIONADOR': { h: 1.2, forma: 'caixa' },
  'HM-INC-AVISADOR': { h: 2.3, forma: 'caixa' }, 'HM-INC-CENTRAL': { h: 1.5, forma: 'quadro' }, 'HM-INC-EMERGENCIA': { h: 2.2, forma: 'barra' },
};
const DISCIPLINAS = {
  eletrica: { rotulo: 'Elétrica', cor: '#ff9f43' }, iluminacao: { rotulo: 'Iluminação', cor: '#ffe27a' }, rede: { rotulo: 'Rede (cabeamento)', cor: '#4fa3ff' },
  cftv: { rotulo: 'CFTV', cor: '#ff5c8a' }, incendio: { rotulo: 'Incêndio', cor: '#ff4b3e' }, alarme: { rotulo: 'Alarme', cor: '#b388ff' },
  'controle-acesso': { rotulo: 'Controle de acesso', cor: '#5ee38a' }, telefonia: { rotulo: 'Telefonia', cor: '#c49a6c' }, antena: { rotulo: 'Antena / TV', cor: '#3fd0c0' },
};
const disciplinaDoSimbolo = (s) => ({ ELE: 'eletrica', ILU: 'iluminacao', CAB: 'rede', CFTV: 'cftv', INC: 'incendio', ALM: 'alarme', ACE: 'controle-acesso', TEL: 'telefonia', ANT: 'antena', HOSP: 'eletrica' })[s.split('-')[1]] || 'outros';

// variação de tom por tipo dentro da disciplina (o 1º tipo fica com a cor da disciplina)
function tom(hex, k) {
  if (!k) return hex;
  const n = parseInt(hex.slice(1), 16);
  const f = [0, 0.38, -0.3, 0.6, -0.45][k % 5];
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
const alturaTexto = (e, pd) => (typeof e.h === 'number' ? `h = ${String(e.h.toFixed(2)).replace('.', ',')} m` : { teto: `no teto (${String(pd.toFixed(2)).replace('.', ',')} m)`, canto: 'no alto do canto', 'topo-porta': 'acima da porta', piso: 'no piso' }[e.h]);

// face de parede mais próxima (até 0,8 m): o ponto encosta nela, virado para o ambiente
function encostar(x, y, z, faces) {
  let melhor = null;
  for (const w of faces) {
    if (z > w.z1 + 0.05 || z < w.z0 - 0.05) continue;
    const v = [w.b[0] - w.a[0], w.b[1] - w.a[1]], L2 = v[0] * v[0] + v[1] * v[1];
    if (L2 < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((x - w.a[0]) * v[0] + (y - w.a[1]) * v[1]) / L2));
    const q = [w.a[0] + v[0] * t, w.a[1] + v[1] * t];
    const d = Math.hypot(x - q[0], y - q[1]);
    if (d < 0.8 && (!melhor || d - w.esp / 2 < melhor.d - melhor.w.esp / 2)) melhor = { w, q, d };
  }
  if (!melhor) return null;
  let nx = x - melhor.q[0], ny = y - melhor.q[1];
  const L = Math.hypot(nx, ny);
  if (L < 1e-6) { const v = [melhor.w.b[0] - melhor.w.a[0], melhor.w.b[1] - melhor.w.a[1]]; const Lv = Math.hypot(...v); [nx, ny] = [-v[1] / Lv, v[0] / Lv]; } else { nx /= L; ny /= L; }
  const off = melhor.w.esp / 2 + 0.03;
  return { x: melhor.q[0] + nx * off, y: melhor.q[1] + ny * off, nx, ny };
}

// Recorte de polígono (qualquer) por um polígono CONVEXO (Sutherland–Hodgman)
function recortar(sujeito, recorte) {
  let out = sujeito;
  const n = recorte.length;
  const area = recorte.reduce((s, [x, y], i) => { const [x2, y2] = recorte[(i + 1) % n]; return s + x * y2 - x2 * y; }, 0);
  const sinal = area >= 0 ? 1 : -1;
  for (let i = 0; i < n && out.length; i++) {
    const a = recorte[i], b = recorte[(i + 1) % n];
    const lado = (p) => sinal * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const cruza = (p, q) => { const t = lado(p) / (lado(p) - lado(q)); return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
    const ent = out;
    out = [];
    for (let k = 0; k < ent.length; k++) {
      const p = ent[k], q = ent[(k + 1) % ent.length];
      const dp = lado(p) >= 0, dq = lado(q) >= 0;
      if (dp) out.push(p);
      if (dp !== dq) out.push(cruza(p, q));
    }
  }
  return out;
}

// Área coberta no piso (câmera: setor de 90° até o alcance; IVP: 90° até 12 m),
// recortada pelo ambiente — ilustra o que cada câmera enxerga sem atravessar paredes
function campoNoPiso(p, dir, alcance, pol, abertura = 90) {
  const th = Math.atan2(dir[1], dir[0]), meia = (abertura * Math.PI) / 360;
  const setor = [p];
  for (let k = 0; k <= 12; k++) { const a = th - meia + (2 * meia * k) / 12; setor.push([p[0] + alcance * Math.cos(a), p[1] + alcance * Math.sin(a)]); }
  const r = pol ? recortar(pol, setor) : setor;
  return r.length >= 3 ? r : null;
}

function posicionar3d(d, faces, peDireito) {
  const e = ESPEC[d.simbolo] || { h: 1.1, forma: 'caixa' };
  const pol = d.poligono;
  const c = pol ? centroide(pol) : [d.x, d.y];
  if (e.h === 'teto') return { x: d.x, y: d.y, z: peDireito - 0.03, nx: 0, ny: 0 };
  if (e.h === 'piso') return { x: d.x, y: d.y, z: 0, nx: 0, ny: 0 };
  if (e.h === 'canto') {
    // vértice do ambiente mais próximo do ponto da planta → no alto, olhando para o centro
    let v = [d.x, d.y];
    if (pol) v = pol.reduce((m, p) => (dist(p, [d.x, d.y]) < dist(m, [d.x, d.y]) ? p : m), pol[0]);
    let dx = c[0] - v[0], dy = c[1] - v[1];
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    let p = [v[0] + dx * 0.22, v[1] + dy * 0.22];
    if (pol && !dentro(p, pol)) p = [d.x, d.y];
    const ivp = d.simbolo === 'HM-ALM-IVP';
    const alcance = ivp ? 12 : 15;
    const z = ivp ? Math.min(2.4, peDireito - 0.2) : peDireito - 0.25;
    return { x: p[0], y: p[1], z, nx: dx, ny: dy, campo: campoNoPiso(p, [dx, dy], alcance, pol) };
  }
  let z = e.h === 'topo-porta' ? Math.min(ALTURA_PORTA + 0.08, peDireito - 0.08) : Math.min(e.h, peDireito - 0.1);
  if (e.hMolhado && /BANH|W\.?\s?C|SANIT|LAVABO/i.test(d.ambiente)) z = Math.min(e.hMolhado, peDireito - 0.1);
  const enc = encostar(d.x, d.y, z, faces);
  if (enc) return { ...enc, z };
  // sem parede por perto: ponto da planta, virado para o centro do ambiente
  const dx = c[0] - d.x, dy = c[1] - d.y, L = Math.hypot(dx, dy) || 1;
  return { x: d.x, y: d.y, z, nx: dx / L, ny: dy / L };
}

// ── Cena ────────────────────────────────────────────────────────────────────
// opcoes: { peDireito, dispositivos (de pontosDasDisciplinas), titulo, cliente, obra, proposta, avisos }
function montarCena(arquitetura, opcoes = {}) {
  const peDireito = Number(opcoes.peDireito) > 1.5 ? Number(opcoes.peDireito) : PE_DIREITO_PADRAO;
  const { caixa, ambientes } = regiaoDoModelo(arquitetura);
  const origem = [(caixa[0] + caixa[2]) / 2, (caixa[1] + caixa[3]) / 2];
  const P = ([x, y]) => [r2(x - origem[0]), r2(y - origem[1])];
  const el = extrairElementos(arquitetura, caixa, peDireito);

  const ambs = ambientes.map((a, i) => ({
    i, nome: a.nome, tipo: a.tipo, area_m2: a.area_m2, perimetro_m: a.perimetro_m || r2(perimetro(a.poligono)),
    poligono: a.poligono.map(P), centro: P(dentro(centroide(a.poligono), a.poligono) ? centroide(a.poligono) : a.centro || centroide(a.poligono)),
  }));

  // dispositivos dentro da região, na altura de instalação
  const faces = el.paredes.filter(w => w.classe !== 'guarda');
  const tipos = new Map();
  const porDisc = {};
  for (const d of opcoes.dispositivos || []) {
    if (!naCaixa(expandir(caixa, 1), [d.x, d.y])) continue;
    const disc = d.disciplina || disciplinaDoSimbolo(d.simbolo);
    let t = tipos.get(d.simbolo);
    if (!t) {
      const e = ESPEC[d.simbolo] || { h: 1.1, forma: 'caixa' };
      const k = (porDisc[disc] = (porDisc[disc] ?? -1) + 1);
      t = { simbolo: d.simbolo, disciplina: disc, rotulo: (SIMBOLOS[d.simbolo]?.legenda || d.simbolo).replace(/\s*\(h = [^)]*\)/, ''), forma: e.forma, altura: alturaTexto(e, peDireito), cor: tom((DISCIPLINAS[disc] || { cor: '#dddddd' }).cor, k), itens: [] };
      tipos.set(d.simbolo, t);
    }
    const p = posicionar3d(d, faces, peDireito);
    const [x, y] = P([p.x, p.y]);
    const amb = ambs.findIndex(a => a.nome === d.ambiente);
    t.itens.push([x, y, r2(p.z), r2(p.nx), r2(p.ny), amb, d.id || '', ...(p.campo ? [p.campo.map(P).flat()] : [])]);
  }

  const internos = ambs.filter(a => a.tipo !== 'externo');
  const caixaInt = internos.length ? internos.map(a => caixaDe(a.poligono)).reduce(uniao) : [0, 0, 0, 0];
  const compParedes = el.paredes.filter(w => w.classe === 'parede').reduce((s, w) => s + dist(w.a, w.b), 0);
  const listaTipos = [...tipos.values()];
  const numeros = {
    area_interna_m2: r2(internos.reduce((s, a) => s + a.area_m2, 0)),
    area_externa_m2: r2(ambs.filter(a => a.tipo === 'externo').reduce((s, a) => s + a.area_m2, 0)),
    ambientes: internos.length,
    ambientes_externos: ambs.length - internos.length,
    dimensoes_m: [r2(caixaInt[2] - caixaInt[0]), r2(caixaInt[3] - caixaInt[1])],
    pe_direito_m: peDireito,
    paredes_m: Math.round(compParedes),
    paredes_area_m2: Math.round(compParedes * peDireito),
    portas: el.portas.length,
    janelas: el.janelas.length,
    pilares: el.pilares.filter(p => p.ehPilar).length,
    dispositivos: listaTipos.map(t => ({ disciplina: t.disciplina, simbolo: t.simbolo, rotulo: t.rotulo, quantidade: t.itens.length, altura: t.altura })),
    por_ambiente: ambs.map(a => ({ nome: a.nome, tipo: a.tipo, area_m2: a.area_m2, perimetro_m: a.perimetro_m })),
  };

  const C = (w) => [...P(w.a), ...P(w.b), r2(w.esp), r2(w.z0), r2(w.z1)];
  return {
    versao: 1,
    aviso: AVISO,
    titulo: opcoes.titulo || 'Modelo 3D ilustrativo',
    cliente: opcoes.cliente || '', obra: opcoes.obra || '', proposta: opcoes.proposta || '',
    data: opcoes.data || new Date().toLocaleDateString('pt-BR'),
    peDireito, alturaPorta: ALTURA_PORTA,
    limites: [...P([caixa[0], caixa[1]]), ...P([caixa[2], caixa[3]])],
    paredes: el.paredes.filter(w => ['parede', 'verga'].includes(w.classe)).map(C),
    muretas: el.paredes.filter(w => ['mureta', 'media', 'peitoril'].includes(w.classe)).map(C),
    guardas: el.paredes.filter(w => w.classe === 'guarda').map(C),
    vidros: el.janelas.map(j => [...P(j.a), ...P(j.b), r2(Math.max(0.02, j.esp * 0.3)), PEITORIL, Math.min(TOPO_JANELA, peDireito)]),
    pilares: el.pilares.map(p => p.pts.map(P)),
    planta: el.planta,
    folhas: el.folhas.map(f => [...P(f.a), ...P(f.b)]),
    portas: el.portas.map(p => ({ id: p.id, meio: P(p.meio), largura: p.largura_m, dupla: p.dupla })),
    ambientes: ambs,
    tiposAmbiente: TIPOS,
    disciplinas: Object.fromEntries([...new Set(listaTipos.map(t => t.disciplina))].map(k => [k, DISCIPLINAS[k] || { rotulo: k, cor: '#dddddd' }])),
    dispositivos: listaTipos,
    numeros,
    avisos: opcoes.avisos || [],
  };
}

module.exports = { montarCena, regiaoDoModelo, extrairElementos, classeDaLayer, ESPEC, DISCIPLINAS, TIPOS, AVISO, PE_DIREITO_PADRAO };
