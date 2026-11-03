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
//     fora da layer de pilar, forma redonda (círculo de símbolo — poste, caixa,
//     tomada de piso — que o PDF ou o "explodir" vira polígono) não sobe;
//   - piso por ambiente com cor pelo tipo (nome) e etiqueta com nome e área;
//   - dispositivos na altura típica de instalação (tomada baixa 0,30 m, média
//     1,10 m, alta 2,20 m, interruptor 1,10 m, luminária/detector no teto,
//     câmera no alto do canto etc.), encostados na face da parede mais próxima.
// Coordenadas em metros, relativas ao centro da região do modelo (origem).
const { dentro, centroide, perimetro, distanciaContorno, RE_PAREDE, RE_NAO_PAREDE } = require('./arquitetura');
const { tipoDoAmbiente, ehAmbienteValido } = require('./estimativaArquitetura');
const { SIMBOLOS } = require('./simbolos');
const { separarEletrocalhas, sugerirCaminhos, buscaMaisPerto, MAX_SUGERIDOS } = require('./infraestrutura');
const { comPosicoes } = require('../instalacao');
// peças e duto da climatização (fase 4), declarados na skill
const CLIM = require('../../climatizacao/scripts/lib/cad');

const AVISO = 'Ilustração — não substitui o projeto executivo. Modelo gerado automaticamente a partir da planta 2D (não é BIM): alturas, esquadrias e posições dos pontos são típicas e indicativas.';
const PE_DIREITO_PADRAO = 2.8;
const ALTURA_PORTA = 2.1;
const PEITORIL = 1.1;
const TOPO_JANELA = 2.1;
// parede desenhada em linha simples: espessura de desenho (alvenaria comum),
// para que a parede tenha corpo e o topo escuro apareça na vista de cima
const ESPESSURA_MIN_DESENHO = 0.15;

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
  let base = internos.length ? internos : validos;
  // com região de planta identificada, o grupo de ambientes sai dela (não do maior
  // grupo da folha, que pode ser uma tabela cheia de células com texto)
  const naPlanta = base.filter(a => (arquitetura.regioesPlanta || []).some(c => naCaixa(expandir(c, 0.3), centroide(a.poligono))));
  if (naPlanta.length) base = naPlanta;
  if (!base.length) {
    // sem ambientes: a região classificada como planta (./classificarPrancha.js) — ou,
    // sem ela, o miolo do desenho (percentis 5–95 % das entidades)
    const plantas = arquitetura.regioesPlanta || [];
    if (plantas.length) return { caixa: expandir(plantas.reduce(uniao), 0.5), ambientes: [] };
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
  return { caixa: expandir(crescerPelasParedes(arquitetura, caixa), 1.5), ambientes: [...escolhidos, ...(internos.length ? externos : [])] };
}

// O prédio vai além das salas com nome (planta de PDF com o nome desenhado como
// traço, sala sem etiqueta): a região cresce pelas paredes (layers de parede)
// ligadas a ela — folga de 1,5 m entre uma e outra —, sem pular para outro
// desenho da folha (implantação, segundo pavimento ao lado).
function crescerPelasParedes(arquitetura, caixa) {
  const paredes = arquitetura.referencia
    .filter(r => r.pts.length >= 2 && RE_PAREDE_3D.test(r.layer || '') && !RE_JANELA.test(r.layer || ''))
    .map(r => caixaDe(r.pts))
    .filter(c => Math.hypot(c[2] - c[0], c[3] - c[1]) <= 300);
  const usadas = new Uint8Array(paredes.length);
  let c = caixa;
  for (let volta = 0, cresceu = true; cresceu && volta < 200; volta++) {
    cresceu = false;
    paredes.forEach((p, i) => { if (!usadas[i] && distCaixas(p, c) <= 1.5) { usadas[i] = 1; c = uniao(c, p); cresceu = true; } });
  }
  return c;
}

// ── Classes de layer ─────────────────────────────────────────────────────────
const RE_JANELA = /JANEL|ESQUAD|CAIXILH|VIDRO|WINDOW|(^|[^A-Z])ESQ([^A-Z]|$)/i;
const RE_PILAR = /PILAR|COLUN|ESTRUT|(^|[^A-Z])EST([^A-Z]|$)/i;
const RE_MURETA = /BAIX|MURET|PEITORIL/i;
const RE_MEDIA = /M[EÉ]DIA/i;
const RE_GUARDA = /GUARDA|GRADIL|CORRIM|PARAPEITO/i;
// padrão brasileiro de layers (AsBEA): ARQ-ALV-CRT = alvenaria em corte
const RE_PAREDE_3D = new RegExp(`${RE_PAREDE.source}|(^|[^A-Z])ALV([^A-Z]|$)`, 'i');
// layers das outras disciplinas e da prancha (QiBuilder/AltoQi: EL-Fios, DI-Barramento,
// IFC-Luminária, P-SIMBOL; AutoCAD MEP) — fio, unifilar e símbolo nunca são parede
const RE_OUTRA_DISCIPLINA = /^(EL|ELE|DI|IFC|P|HID|INC|CFTV|TEL|SPDA|AR|AC|MEC|HVAC|PCI)[-_ ]|CONDUT|(^|[^A-Z])FIOS?([^A-Z]|$)|BARRAMENTO|DIAGRAM|UNIFILAR|DISJUNT|L[ÂA]MPADA|TOMADA|INTERRUPTOR|CAIXAS?\s+DE\s+PASSAGEM|QUADRO|PRANCHA|MARGEM|TABELA|AR\s?COND|DUTO/i;
// AsBEA, o que é vista/equipamento da arquitetura: louça, mobiliário, equipamento,
// sanitário, piso, cobertura, projeção, porta, vegetação, cota, texto, hachura
const RE_ARQ_NAO_PAREDE = /(^|[^A-Z])(LOU|MOB|MOV|EQP|SAN|PIS|COB|PRJ|ANT|URB|VIA|TXT|HCH|POR|VEG|COT)([^A-Z]|$)/i;
function classeDaLayer(layer, haParede) {
  const l = layer || '';
  if (RE_OUTRA_DISCIPLINA.test(l)) return null;
  if ((RE_NAO_PAREDE.test(l) || RE_ARQ_NAO_PAREDE.test(l)) && !RE_PAREDE_3D.test(l) && !RE_GUARDA.test(l)) return null;
  if (RE_JANELA.test(l)) return 'janela';
  if (RE_GUARDA.test(l)) return 'guarda';
  if (RE_PILAR.test(l)) return 'pilar';
  if (RE_PAREDE_3D.test(l)) return RE_MURETA.test(l) ? 'mureta' : RE_MEDIA.test(l) ? 'media' : 'parede';
  return haParede ? null : 'parede'; // desenho sem layer de parede reconhecível: tudo que não é anotação
}
// o desenho tem layer de parede reconhecível? (senão tudo que não é anotação sobe)
const haLayerDeParede = (layers) => layers.some(l => RE_PAREDE_3D.test(l || '') && !RE_JANELA.test(l || '') && !RE_OUTRA_DISCIPLINA.test(l || ''));

// Uma planta da folha: a prancha de projeto costuma trazer várias lado a lado
// (a da Arena, 7 — implantação, lojas, detalhes) e o modelo juntava todas.
// Ficam os ambientes, as linhas e as portas dentro de `caixa` [x0, y0, x1, y1] (m).
function recortarArquitetura(arq, caixa) {
  const c = expandir(caixa, 0.5);
  return {
    ...arq,
    ambientes: arq.ambientes.filter(a => naCaixa(c, centroide(a.poligono))),
    portas: (arq.portas || []).filter(p => naCaixa(c, p.meio)),
    referencia: arq.referencia.filter(r => r.pts.length && r.pts.every(p => naCaixa(c, p))),
    regioesPlanta: [caixa],
  };
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
// Forma fechada curva (círculo, elipse, oval: mais de 8 vértices distintos) —
// o símbolo (poste, projetor, caixa, tomada de piso) que a conversão do PDF ou o
// "explodir" do AutoCAD vira polígono. Pilar em layer de parede é retângulo ou L.
function simboloRedondo(pts) {
  const v = pts.filter((p, i) => i === 0 || dist(p, pts[i - 1]) > 1e-6);
  if (v.length > 1 && dist(v[0], v.at(-1)) < 1e-6) v.pop();
  return v.length > 8;
}
const ALTURA_CLASSE = { mureta: PEITORIL, media: 1.6, guarda: 1.1 };

function extrairElementos(arquitetura, caixa, peDireito) {
  let refs = arquitetura.referencia.filter(r => r.pts.length >= 2 && r.pts.some(p => naCaixa(caixa, p)));
  const layers = [...new Set(refs.map(r => r.layer))];
  const haParede = haLayerDeParede(layers);
  // sem layer de parede, "tudo que não é anotação vira parede" — mas só dentro da
  // região classificada como planta (./classificarPrancha.js): o unifilar, a tabela
  // e a legenda da mesma folha não sobem como parede
  const plantas = arquitetura.regioesPlanta || [];
  if (!haParede && plantas.length) refs = refs.filter(r => r.pts.some(p => plantas.some(c => naCaixa(expandir(c, 0.3), p))));
  const classe = new Map(layers.map(l => [l, classeDaLayer(l, haParede)]));
  const portas = (arquitetura.portas || []).filter(p => naCaixa(caixa, p.meio));

  // pilares: polilinha fechada pequena em layer de parede/estrutura
  const pilares = [];
  const usados = new Set();
  let simbolosRedondos = 0;
  for (const r of refs) {
    const c = classe.get(r.layer);
    if (!r.fechada || r.tipo !== 'poli' || !['pilar', 'parede', 'media'].includes(c)) continue;
    const [x0, y0, x1, y1] = caixaDe(r.pts);
    const [L, W] = [x1 - x0, y1 - y0].sort((a, b) => b - a);
    if (c !== 'pilar' && L <= 1.5 && simboloRedondo(r.pts)) {
      // símbolo, não estrutura: nem pilar nem parede
      usados.add(r);
      simbolosRedondos++;
      continue;
    }
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
      // ganha a espessura dela; linha solta (planta em linha simples) vira parede
      // com a espessura mínima de desenho — com 10 cm ela some na vista geral
      for (const l of linhas) {
        for (const [a, b] of l.rest) {
          if (b - a < 0.05) continue;
          if (l.par && b - a <= 1.2) add(a, b, l.d + (l.par.lado * l.par.esp) / 2, l.par.esp);
          else add(a, b, l.d, c === 'guarda' ? 0.05 : ESPESSURA_MIN_DESENHO);
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
  return { paredes: [...paredes, ...vergas], janelas, pilares, folhas, portas, planta, linhasPlanta: escolhidos.length, simbolosRedondos };
}

// ── Dispositivos ────────────────────────────────────────────────────────────
// altura de instalação típica (m, no CENTRO do aparelho) ou montagem: teto,
// canto (alto do canto), topo-porta (acima do vão), piso.
// forma: desenho no visualizador (./visualizador3d/app.js, FORMAS); tam:
// [largura, altura, profundidade] em m. Os pequenos são um pouco EXAGERADOS
// (tomada 4×2 real: 7,5 × 12 cm → 10 × 16 cm) e iguais por tipo, para que o
// cliente reconheça a peça de perto; de longe o visualizador ainda os aumenta
// pela distância da câmera (tamanho mínimo na tela).
const TAM_FORMA = {
  tomada: [0.10, 0.16, 0.03], interruptor: [0.10, 0.16, 0.03], rede: [0.10, 0.16, 0.03], coaxial: [0.10, 0.16, 0.03],
  quadro: [0.60, 0.80, 0.15], rack: [0.60, 0.60, 0.45], caixa: [0.18, 0.18, 0.07], teclado: [0.13, 0.17, 0.04],
  acionador: [0.13, 0.13, 0.06], sirene: [0.14, 0.14, 0.09], barra: [0.30, 0.06, 0.05], emergencia: [0.34, 0.10, 0.06],
  wallbox: [0.26, 0.38, 0.13], luminaria: [0.62, 0.62, 0.06], 'ponto-luz': [0.26, 0.26, 0.10], detector: [0.16, 0.16, 0.07],
  sensor: [0.13, 0.13, 0.06], ap: [0.22, 0.22, 0.045], camera: [0.11, 0.11, 0.32], dome: [0.15, 0.15, 0.10],
  'sensor-canto': [0.08, 0.13, 0.07], catraca: [0.30, 1.00, 0.80],
  // poste no piso: a profundidade (3º) é a altura; largura = braço com a luminária
  poste: [1.2, 0.3, 8], 'caixa-piso': [0.30, 0.30, 0.04],
};
// formas de parede que vão ENCOSTADAS na parede mais próxima mesmo quando o
// símbolo da planta está longe dela (quadro no meio da sala vira quadro na parede)
const FORMAS_DE_PAREDE = new Set(['quadro', 'rack', 'caixa', 'teclado', 'acionador', 'sirene', 'emergencia', 'wallbox']);
const ESPEC = {
  'HM-ELE-TOMADA-BAIXA': { h: 0.3, forma: 'tomada' }, 'HM-ELE-TOMADA-MEDIA': { h: 1.1, forma: 'tomada' }, 'HM-ELE-TOMADA-ALTA': { h: 2.2, forma: 'tomada' },
  'HM-ELE-TUE': { h: 1.1, hMolhado: 2.2, forma: 'tomada' }, 'HM-ELE-PONTO-LUZ': { h: 'teto', forma: 'ponto-luz' },
  'HM-ELE-INTERRUPTOR': { h: 1.1, forma: 'interruptor' }, 'HM-ELE-QUADRO': { h: 1.5, forma: 'quadro', tam: [0.60, 0.80, 0.15] },
  'HM-ILU-LUMINARIA': { h: 'teto', forma: 'luminaria' }, 'HM-ILU-SENSOR': { h: 'teto', forma: 'sensor' }, 'HM-ILU-COMANDO': { h: 1.1, forma: 'interruptor' },
  'HM-HOSP-TOMADA-IT': { h: 1.1, forma: 'tomada' }, 'HM-HOSP-BEL': { h: 0.3, forma: 'caixa', tam: [0.20, 0.15, 0.07] }, 'HM-HOSP-PAINEL-ALARME': { h: 1.5, forma: 'teclado', tam: [0.24, 0.18, 0.06] },
  'HM-CAB-PONTO-REDE': { h: 0.3, forma: 'rede' }, 'HM-CAB-AP': { h: 'teto', forma: 'ap' }, 'HM-CAB-RACK': { h: 1.6, forma: 'rack' },
  'HM-TEL-PONTO': { h: 1.4, forma: 'rede' }, 'HM-TEL-PORTEIRO': { h: 1.4, forma: 'teclado' }, 'HM-TEL-DG': { h: 1.5, forma: 'quadro', tam: [0.50, 0.60, 0.15] },
  'HM-ANT-PONTO': { h: 0.3, forma: 'coaxial' }, 'HM-ANT-SAT': { h: 0.3, forma: 'coaxial' },
  'HM-CFTV-CAMERA': { h: 'canto', forma: 'camera' },
  'HM-ACE-LEITOR': { h: 1.1, forma: 'teclado', tam: [0.09, 0.14, 0.04] }, 'HM-ACE-FECHADURA': { h: 'topo-porta', forma: 'barra' }, 'HM-ACE-SENSOR': { h: 'topo-porta', forma: 'barra', tam: [0.12, 0.04, 0.03] },
  'HM-ACE-BOTOEIRA': { h: 1.1, forma: 'interruptor' }, 'HM-ACE-EMERGENCIA': { h: 1.2, forma: 'acionador' }, 'HM-ACE-CONTROLADORA': { h: 2.0, forma: 'caixa', tam: [0.30, 0.30, 0.09] }, 'HM-ACE-CATRACA': { h: 'piso', forma: 'catraca' },
  'HM-ALM-IVP': { h: 'canto', forma: 'sensor-canto' }, 'HM-ALM-MAGNETICO': { h: 'topo-porta', forma: 'barra', tam: [0.10, 0.03, 0.03] }, 'HM-ALM-SIRENE': { h: 2.4, forma: 'sirene' },
  'HM-ALM-TECLADO': { h: 1.4, forma: 'teclado' }, 'HM-ALM-CENTRAL': { h: 1.6, forma: 'quadro', tam: [0.35, 0.40, 0.10] },
  'HM-INC-DETECTOR-FUMACA': { h: 'teto', forma: 'detector' }, 'HM-INC-DETECTOR-TEMP': { h: 'teto', forma: 'detector' }, 'HM-INC-ACIONADOR': { h: 1.2, forma: 'acionador' },
  'HM-INC-AVISADOR': { h: 2.3, forma: 'sirene' }, 'HM-INC-CENTRAL': { h: 1.5, forma: 'quadro', tam: [0.45, 0.55, 0.15] }, 'HM-INC-EMERGENCIA': { h: 2.2, forma: 'emergencia' },
  'HM-AUT-CONTROLADOR': { h: 1.5, forma: 'quadro', tam: [0.50, 0.60, 0.15] }, 'HM-AUT-SENSOR': { h: 1.5, forma: 'caixa', tam: [0.09, 0.12, 0.04] },
  'HM-SOL-INVERSOR': { h: 1.5, forma: 'quadro', tam: [0.45, 0.60, 0.20] }, 'HM-VE-CARREGADOR': { h: 1.2, forma: 'wallbox' },
  // SPDA: o modelo não tem cobertura — captor fica no forro e a descida na parede, só para localizar
  'HM-SPDA-CAIXA-INSPECAO': { h: 'piso', forma: 'caixa', tam: [0.30, 0.30, 0.05] }, 'HM-SPDA-CAPTOR': { h: 'teto', forma: 'barra', tam: [0.04, 0.04, 0.35] },
  'HM-SPDA-DESCIDA': { h: 1.5, forma: 'barra', tam: [0.03, 0.40, 0.03] },
  // área externa (estacionamento, quadra): poste com luminária/projetor e caixa de passagem no piso
  'HM-ILU-POSTE': { h: 'piso', forma: 'poste' }, 'HM-ELE-CAIXA-PISO': { h: 'piso', forma: 'caixa-piso' },
  // ponto de parede do PDF sem legenda (tomada ou interruptor: a forma não diz qual)
  'HM-ELE-PONTO': { h: 1.1, forma: 'tomada' },
  // climatização (fase 4): difusor, grelha, VAV, evaporadora, fancoil, condensadora e
  // chiller — declarados na skill (skills/climatizacao/scripts/lib/cad.js)
  ...CLIM.ESPEC_3D,
};
const ESPEC_PADRAO = { h: 1.1, forma: 'caixa' };
// especificação completa (com o tamanho da forma quando o símbolo não traz o seu)
const espec = (simbolo) => { const e = ESPEC[simbolo] || ESPEC_PADRAO; return { ...e, tam: e.tam || TAM_FORMA[e.forma] || TAM_FORMA.caixa }; };
// Chaves = as do registro único (../disciplinas.js; revisão de 02/11/2026): antes o
// 3D tinha as suas ('controle-acesso', 'veicular', HOSP como 'eletrica') e o ponto
// do DWG lido na layer VE-* ('carregador') saía cinza, com a chave crua na legenda.
// Só 'iluminacao-externa' é do 3D (postes e caixas: eletroduto enterrado à parte).
const DISCIPLINAS = {
  eletrica: { rotulo: 'Elétrica', cor: '#ff9f43' }, iluminacao: { rotulo: 'Iluminação', cor: '#ffe27a' }, rede: { rotulo: 'Rede (cabeamento)', cor: '#4fa3ff' },
  eletrica_hospitalar: { rotulo: 'Elétrica hospitalar', cor: '#ff7a59' },
  cftv: { rotulo: 'CFTV', cor: '#ff5c8a' }, incendio: { rotulo: 'Incêndio', cor: '#ff4b3e' }, alarme: { rotulo: 'Alarme', cor: '#b388ff' },
  controle_acesso: { rotulo: 'Controle de acesso', cor: '#5ee38a' }, telefonia: { rotulo: 'Telefonia', cor: '#c49a6c' }, antena: { rotulo: 'Antena / TV', cor: '#3fd0c0' },
  'iluminacao-externa': { rotulo: 'Iluminação externa', cor: '#ffb84d' },
  automacao: { rotulo: 'Automação', cor: '#7fe0ff' }, solar: { rotulo: 'Solar', cor: '#f6c90e' }, carregador: { rotulo: 'Recarga veicular', cor: '#a4e05a' }, spda: { rotulo: 'SPDA', cor: '#bfc5cc' },
  climatizacao: { rotulo: 'Climatização', cor: '#5ec8f2' },
};
// nomes antigos (classificador de pontos, mapa do CAD, análises e caches gravados
// antes da unificação) → chave do registro; cabeamento é a rede no 3D
const ALIAS_DISCIPLINA = { 'controle-acesso': 'controle_acesso', veicular: 'carregador', cabeamento: 'rede', 'eletrica-hospitalar': 'eletrica_hospitalar' };
const chaveDisciplina = (k) => ALIAS_DISCIPLINA[k] || k;
const disciplinaDoSimbolo = (s) => ({ ELE: 'eletrica', ILU: 'iluminacao', CAB: 'rede', CFTV: 'cftv', INC: 'incendio', ALM: 'alarme', ACE: 'controle_acesso', TEL: 'telefonia', ANT: 'antena', HOSP: 'eletrica_hospitalar', AUT: 'automacao', SOL: 'solar', VE: 'carregador', SPDA: 'spda', CLIM: 'climatizacao' })[s.split('-')[1]] || 'outros';

// ── Infraestrutura (eletrocalhas, eletrodutos, leitos, perfilados, fiação) ───
// seção [largura, altura] em m e quanto fica abaixo do teto (centro da seção):
// a eletrocalha passa a 30 cm do teto (espaço para lançar os cabos por cima)
// `medida`: a seção padrão escrita — vale quando o projeto não diz a medida
// (o visualizador mostra "medida padrão ilustrativa" nesse caso)
const TRECHOS = {
  eletrocalha: { rotulo: 'Eletrocalha', secao: [0.10, 0.05], medida: '100 × 50 mm', desce: 0.30, forma: 'caixa' },
  leito: { rotulo: 'Leito para cabos', secao: [0.30, 0.06], medida: '300 × 60 mm', desce: 0.35, forma: 'caixa' },
  perfilado: { rotulo: 'Perfilado', secao: [0.038, 0.038], medida: '38 × 38 mm', desce: 0.22, forma: 'caixa' },
  eletroduto: { rotulo: 'Eletroduto', secao: [0.032, 0.032], medida: 'Ø 32 mm (1")', desce: 0.15, forma: 'tubo' },
  fiacao: { rotulo: 'Fiação / cabos', secao: [0.012, 0.012], medida: '', desce: 0.10, forma: 'linha' },
  // climatização: duto retangular no forro (seção padrão ilustrativa)
  ...CLIM.TRECHO_3D,
};
// Projeto sem infraestrutura desenhada (gerado pelo sistema, ou DWG só com os
// pontos): eletroduto ESTIMADO por disciplina, do quadro/rack/central até cada
// ponto, com o tipo e a bitola que o orçamento da skill usa para a disciplina
// (3/4" nos circuitos terminais e nos sistemas de segurança; 1" no cabeamento,
// pela quantidade de cabos UTP). Mostrado como estimativa, para conferir.
const INFRA_ESTIMADA = {
  eletrica: { material: 'PVC corrugado', mm: 25, pol: '3/4"' },
  iluminacao: { material: 'PVC corrugado', mm: 25, pol: '3/4"' },
  rede: { material: 'PVC rígido', mm: 32, pol: '1"' },
  cftv: { material: 'PVC rígido', mm: 25, pol: '3/4"' },
  incendio: { material: 'PVC rígido exclusivo', mm: 25, pol: '3/4"' },
  alarme: { material: 'PVC rígido', mm: 25, pol: '3/4"' },
  eletrica_hospitalar: { material: 'PVC corrugado', mm: 25, pol: '3/4"' },
  controle_acesso: { material: 'PVC rígido', mm: 25, pol: '3/4"' },
  telefonia: { material: 'PVC rígido', mm: 25, pol: '3/4"' },
  antena: { material: 'PVC rígido', mm: 25, pol: '3/4"' },
  automacao: { material: 'PVC rígido', mm: 25, pol: '3/4"' },
  // área externa: duto corrugado enterrado (vala de 0,60 m), mostrado rente ao piso
  'iluminacao-externa': { material: 'PEAD corrugado enterrado', mm: 40, pol: '1 1/4"', z: 0.04 },
};
// o ponto de partida da disciplina (quadro, rack, central, DG, controladora, NVR)
const RE_CENTRO_DISCIPLINA = /QUADRO|RACK|CENTRAL|-DG\b|CONTROLADOR|NVR|DVR|INVERSOR/;
// descida até a peça de parede: o eletroduto mais próximo a até 1,5 m em planta
const DESCIDA_RAIO_M = 1.5;
// ponto fora de todo ambiente, a até isso do contorno de um: é dele (tomada na linha da parede)
const AMBIENTE_FOLGA_M = 0.3;
// acima disso a página fica pesada no celular: ficam os segmentos mais longos
const LIMITE_SEGMENTOS = 20000;

// variação de tom por tipo dentro da disciplina (o 1º tipo fica com a cor da disciplina)
function tom(hex, k) {
  if (!k) return hex;
  const n = parseInt(hex.slice(1), 16);
  const f = [0, 0.38, -0.3, 0.6, -0.45][k % 5];
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)));
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}
const alturaTexto = (e, pd) => (typeof e.h === 'number' ? `h = ${String(e.h.toFixed(2)).replace('.', ',')} m` : { teto: `no teto (${String(pd.toFixed(2)).replace('.', ',')} m)`, canto: 'no alto do canto', 'topo-porta': 'acima da porta', piso: 'no piso' }[e.h]);

// face de parede mais próxima (até `raio`): o ponto encosta nela, virado para o
// ambiente. Com `largura`/`altura` (quadro, rack) a parede precisa caber a peça
// inteira — não fica metade no vão da porta nem em cima do peitoril da janela —
// e, com `poligono`, a peça tem de cair dentro do ambiente do símbolo.
// O fundo da peça fica a 1 cm da face (no visualizador o fundo é o plano z = 0).
function encostar(x, y, z, faces, { raio = 0.8, largura = 0, altura = 0, poligono = null } = {}) {
  const tentar = (estrito) => {
    const cand = [];
    for (const w of faces) {
      const meia = estrito ? altura / 2 : 0;
      if (z + meia > w.z1 + 0.05 || z - meia < w.z0 - 0.05) continue;
      const v = [w.b[0] - w.a[0], w.b[1] - w.a[1]], L2 = v[0] * v[0] + v[1] * v[1];
      if (L2 < 1e-6) continue;
      const L = Math.sqrt(L2);
      if (estrito && largura && L < largura) continue;
      const m = estrito && largura ? largura / 2 / L : 0;
      const t = Math.max(m, Math.min(1 - m, ((x - w.a[0]) * v[0] + (y - w.a[1]) * v[1]) / L2));
      const q = [w.a[0] + v[0] * t, w.a[1] + v[1] * t];
      const d = Math.hypot(x - q[0], y - q[1]);
      if (d < raio) cand.push({ w, q, d, v, L });
    }
    cand.sort((p, q) => (p.d - p.w.esp / 2) - (q.d - q.w.esp / 2));
    for (const c of cand) {
      let nx = x - c.q[0], ny = y - c.q[1];
      const Ln = Math.hypot(nx, ny);
      // símbolo em cima da linha da parede: lado esquerdo do segmento
      if (Ln < 1e-6) [nx, ny] = [-c.v[1] / c.L, c.v[0] / c.L]; else { nx /= Ln; ny /= Ln; }
      const off = c.w.esp / 2 + 0.01;
      const p = { x: c.q[0] + nx * off, y: c.q[1] + ny * off, nx, ny };
      if (estrito && poligono && !dentro([p.x, p.y], poligono) && distanciaContorno([p.x, p.y], poligono) > 0.1) continue;
      return p;
    }
    return null;
  };
  return tentar(true) || ((largura || altura || poligono) ? tentar(false) : null);
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
  // altura lida do projeto (atributo/legenda "h = 1,20 m") vale sobre a típica da peça de parede
  const e0 = espec(d.simbolo);
  const e = typeof e0.h === 'number' && Number(d.altura_m) > 0 ? { ...e0, h: Number(d.altura_m), hMolhado: null } : e0;
  const pol = d.poligono;
  const c = pol ? centroide(pol) : [d.x, d.y];
  // no teto: o fundo da peça encosta no forro (o visualizador desenha para baixo)
  if (e.h === 'teto') return { x: d.x, y: d.y, z: r2(peDireito - 0.01), nx: 0, ny: 0 };
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
  // z é o centro da peça: quadro alto não passa do forro
  const teto = peDireito - Math.max(0.1, e.tam[1] / 2 + 0.05);
  let z = e.h === 'topo-porta' ? Math.min(ALTURA_PORTA + 0.08, peDireito - 0.08) : Math.min(e.h, teto);
  if (e.hMolhado && /BANH|W\.?\s?C|SANIT|LAVABO/i.test(d.ambiente)) z = Math.min(e.hMolhado, teto);
  const deParede = FORMAS_DE_PAREDE.has(e.forma);
  const enc = encostar(d.x, d.y, z, faces, deParede ? { raio: 3, largura: e.tam[0], altura: e.tam[1], poligono: pol } : { altura: e.tam[1] });
  if (enc) return { ...enc, z };
  // sem parede por perto: ponto da planta, virado para o centro do ambiente
  const dx = c[0] - d.x, dy = c[1] - d.y, L = Math.hypot(dx, dy) || 1;
  return { x: d.x, y: d.y, z, nx: dx / L, ny: dy / L };
}

// Trechos de infraestrutura → cena. Entrada (opcoes.trechos): [{ disciplina,
// tipo: 'eletrocalha'|'eletroduto'|'leito'|'perfilado'|'fiacao', layer,
// segmentos: [[x1, y1, x2, y2], …], altura?, material?, medida?, secao_mm?,
// origem_medida? }] (material/medida lidos do desenho: texto junto do traçado,
// nome da layer ou legenda — services/analiseCad) em metros, no MESMO sistema da
// arquitetura lida por lerArquitetura (antes da translação da cena: P() leva
// para a origem do modelo). Saída: um grupo por disciplina + tipo, com os
// segmentos achatados [x1, y1, x2, y2, …], a altura do centro da seção e o
// comprimento total (contado com TODOS os segmentos da região, mesmo quando o
// desenho é limitado aos LIMITE_SEGMENTOS mais longos).
function montarInfra(trechos, P, caixa, peDireito, avisos) {
  const regiao = expandir(caixa, 2);
  const grupos = new Map();
  const todos = [];
  // eletrocalha desenhada como par de abas paralelas (QiBuilder, PDF): um eixo só,
  // com a largura medida entre as abas — antes subiam dois eletrodutos lado a lado
  const lista = [];
  for (const t of Array.isArray(trechos) ? trechos : []) {
    if (!t || !Array.isArray(t.segmentos)) continue;
    if (t.secao_mm || !['eletroduto', 'eletrocalha', undefined].includes(t.tipo) || Number(t.altura) < 0.5) { lista.push(t); continue; }
    const { eletrocalhas, resto } = separarEletrocalhas(t.segmentos.filter(s => Array.isArray(s) && s.length >= 4).map(s => s.slice(0, 4).map(Number)));
    for (const e of eletrocalhas) {
      lista.push({ ...t, tipo: 'eletrocalha', secao_mm: [e.largura_mm, 50], medida: `${e.largura_mm} mm de largura (entre as abas no desenho)`, origem_medida: 'desenho', segmentos: e.segmentos });
    }
    if (resto.length) lista.push({ ...t, segmentos: resto });
  }
  for (const t of lista) {
    const tipo = TRECHOS[t.tipo] ? t.tipo : 'eletroduto';
    const e = TRECHOS[tipo];
    const disc = chaveDisciplina(t.disciplina || 'eletrica');
    // seção do projeto (mm) quando o desenho diz; senão a padrão da tabela
    const mm = Array.isArray(t.secao_mm) && t.secao_mm.length >= 2 && t.secao_mm.every(v => Number(v) > 0) ? t.secao_mm.map(Number) : null;
    const secao = mm ? [mm[0] / 1000, mm[1] / 1000] : e.secao;
    const medida = mm && t.medida ? String(t.medida) : null;
    const material = t.material ? String(t.material) : null;
    const z = Number.isFinite(Number(t.altura)) && Number(t.altura) > 0 ? Math.min(Number(t.altura), peDireito - secao[1] / 2) : Math.max(0.1, peDireito - e.desce);
    const chave = `${disc}|${tipo}|${r2(z)}|${material || ''}|${medida || ''}`;
    let g = grupos.get(chave);
    if (!g) {
      g = { disciplina: disc, tipo, rotulo: e.rotulo, forma: e.forma, secao, z: r2(z), layers: [], comprimento: 0, n: 0, segs: [],
        material, medida: medida || e.medida, origem_medida: medida ? (t.origem_medida || 'desenho') : 'padrao' };
      grupos.set(chave, g);
    }
    if (t.layer && !g.layers.includes(String(t.layer))) g.layers.push(String(t.layer));
    for (const s of t.segmentos) {
      if (!Array.isArray(s) || s.length < 4) continue;
      const [x1, y1, x2, y2] = s.map(Number);
      if (![x1, y1, x2, y2].every(Number.isFinite)) continue;
      const L = Math.hypot(x2 - x1, y2 - y1);
      if (L < 0.01) continue;
      if (!naCaixa(regiao, [x1, y1]) && !naCaixa(regiao, [x2, y2]) && !naCaixa(regiao, [(x1 + x2) / 2, (y1 + y2) / 2])) continue;
      g.comprimento += L; g.n++;
      const seg = { g, L, p: [...P([x1, y1]), ...P([x2, y2])] };
      g.segs.push(seg); todos.push(seg);
    }
  }
  if (todos.length > LIMITE_SEGMENTOS) {
    const ficam = new Set(todos.sort((a, b) => b.L - a.L).slice(0, LIMITE_SEGMENTOS));
    for (const g of grupos.values()) g.segs = g.segs.filter(s => ficam.has(s));
    avisos.push(`Infraestrutura com ${todos.length.toLocaleString('pt-BR')} segmentos: o 3D desenha os ${LIMITE_SEGMENTOS.toLocaleString('pt-BR')} mais longos (o comprimento total conta todos).`);
  }
  return [...grupos.values()].filter(g => g.n).map(g => ({
    disciplina: g.disciplina, tipo: g.tipo, rotulo: g.rotulo, forma: g.forma, secao: g.secao, z: g.z, layers: g.layers,
    material: g.material, medida: g.medida, origem_medida: g.origem_medida, estimado: false,
    cor: (DISCIPLINAS[g.disciplina] || { cor: '#dddddd' }).cor,
    comprimento_m: Math.round(g.comprimento * 10) / 10, segmentos_total: g.n,
    segmentos: g.segs.flatMap(s => s.p), descidas: [], descidas_m: 0,
  }));
}

// Segmentos ortogonais sobrepostos (L de vários pontos pelo mesmo corredor) viram
// um só: o comprimento estimado não conta o mesmo trecho duas vezes
function juntarOrtogonais(segs) {
  const linhas = new Map();
  const outros = [];
  for (const [x1, y1, x2, y2] of segs) {
    if (Math.abs(y1 - y2) < 1e-6) { const k = `h|${r2(y1)}`; (linhas.get(k) || linhas.set(k, []).get(k)).push([Math.min(x1, x2), Math.max(x1, x2)]); }
    else if (Math.abs(x1 - x2) < 1e-6) { const k = `v|${r2(x1)}`; (linhas.get(k) || linhas.set(k, []).get(k)).push([Math.min(y1, y2), Math.max(y1, y2)]); }
    else outros.push([x1, y1, x2, y2]);
  }
  const out = [...outros];
  for (const [k, iv] of linhas) {
    const [eixo, c] = [k[0], Number(k.slice(2))];
    iv.sort((a, b) => a[0] - b[0]);
    let [a, b] = iv[0];
    const fecha = () => { if (b - a >= 0.01) out.push(eixo === 'h' ? [a, c, b, c] : [c, a, c, b]); };
    for (const [p, q] of iv.slice(1)) { if (p <= b + 0.01) b = Math.max(b, q); else { fecha(); [a, b] = [p, q]; } }
    fecha();
  }
  return out;
}

// Eletroduto ESTIMADO de uma disciplina sem traçado no projeto: árvore pelo
// caminho em "L" (como a tubulação corre, paralela às paredes) que liga o
// quadro/rack/central a todos os pontos — cada ponto se liga ao já ligado mais
// próximo (árvore geradora mínima em distância "L"). Pontos na cena (x, y, z).
function arvoreEstimada(pontos, centro) {
  const n = pontos.length;
  const ligado = new Array(n).fill(false);
  const melhor = pontos.map(() => ({ d: Infinity, de: -1 }));
  const segs = [];
  let atual = centro;
  ligado[atual] = true;
  for (let passo = 1; passo < n; passo++) {
    let prox = -1;
    for (let i = 0; i < n; i++) {
      if (ligado[i]) continue;
      const d = Math.abs(pontos[i][0] - pontos[atual][0]) + Math.abs(pontos[i][1] - pontos[atual][1]);
      if (d < melhor[i].d) melhor[i] = { d, de: atual };
      if (prox < 0 || melhor[i].d < melhor[prox].d) prox = i;
    }
    const [ax, ay] = pontos[melhor[prox].de], [bx, by] = pontos[prox];
    if (Math.abs(ax - bx) > 1e-3) segs.push([ax, ay, bx, ay]);
    if (Math.abs(ay - by) > 1e-3) segs.push([bx, ay, bx, by]);
    ligado[prox] = true;
    atual = prox;
  }
  return juntarOrtogonais(segs);
}

// Descidas: do eletroduto/eletrocalha (no alto) até a peça de parede abaixo dele —
// tomada, interruptor, quadro… Com traçado do projeto, a peça se liga ao trecho
// da MESMA disciplina mais próximo (até DESCIDA_RAIO_M em planta) por um ramal
// horizontal e desce na vertical; no estimado o traçado já chega no ponto.
// Grava em `destino` (o próprio g, ou o eletroduto de descida de uma eletrocalha).
function ligarDescidas(g, pecas, destino = g) {
  const seg = g.segmentos;
  const ramais = [];
  let total = 0;
  // eletroduto do piso (embutido/enterrado): sobe até a base da peça de parede
  const doPiso = g.z < 0.5;
  // trecho mais perto da peça (pela grade: antes cada peça conferia todos os segmentos)
  const perto = buscaMaisPerto(seg);
  for (const { x, y, topo, base, piso, teto } of pecas) {
    if (doPiso ? piso || teto || !(base > g.z + 0.1) : topo >= g.z - 0.15) continue; // no teto ou acima do trecho: não desce
    const m = perto(x, y);
    if (!m || m.d > DESCIDA_RAIO_M) continue;
    if (m.d >= 0.05) { ramais.push(r2(m.q[0]), r2(m.q[1]), r2(x), r2(y)); total += m.d; }
    if (doPiso) { destino.descidas.push(r2(x), r2(y), g.z, r2(base)); total += base - g.z; continue; }
    destino.descidas.push(r2(x), r2(y), r2(topo), g.z);
    total += g.z - topo;
  }
  destino.segmentos = destino.segmentos.concat(ramais);
  destino.segmentos_total += ramais.length / 4;
  destino.descidas_m = Math.round((destino.descidas_m + total) * 10) / 10;
  destino.comprimento_m = Math.round((destino.comprimento_m + total) * 10) / 10;
}

// Eletroduto (de descida ou estimado) da disciplina, com a bitola de INFRA_ESTIMADA
function grupoEletroduto(disc, z, estimado) {
  const e = INFRA_ESTIMADA[disc] || INFRA_ESTIMADA.eletrica;
  const tr = TRECHOS.eletroduto;
  return {
    disciplina: disc, tipo: 'eletroduto', rotulo: estimado === 'descida' ? 'Eletroduto de descida' : tr.rotulo, forma: tr.forma, secao: [e.mm / 1000, e.mm / 1000], z: r2(z), layers: [],
    material: e.material, medida: `Ø ${e.mm} mm (${e.pol})`, origem_medida: 'estimado', estimado: true,
    cor: (DISCIPLINAS[disc] || { cor: '#dddddd' }).cor, comprimento_m: 0, segmentos_total: 0, segmentos: [], descidas: [], descidas_m: 0,
  };
}

// Para cada disciplina com pontos: o traçado do projeto ganha as descidas; a
// disciplina sem traçado ganha o eletroduto estimado (INFRA_ESTIMADA) — só com
// estimar (o modelo por planta do desenho não inventa traçado). `tipos`:
// os tipos de dispositivo da cena (itens já em coordenadas da cena).
function completarInfra(infra, tipos, peDireito, avisos, { estimar = true, sugerir = false, paredes = [] } = {}) {
  const porDisc = new Map();
  for (const t of tipos) {
    if (!porDisc.has(t.disciplina)) porDisc.set(t.disciplina, []);
    const tipo = RE_CENTRO_DISCIPLINA.test(t.simbolo) ? 'quadro' : t.forma === 'interruptor' ? 'interruptor' : t.forma === 'luminaria' || t.forma === 'ponto-luz' ? 'luminaria' : 'outro';
    for (const it of t.itens) porDisc.get(t.disciplina).push({ x: it[0], y: it[1], topo: it[2] + (t.montagem === 'teto' ? 0 : t.tam[1] / 2), base: it[2] - (t.montagem === 'teto' ? t.tam[2] || 0 : t.tam[1] / 2), centro: tipo === 'quadro', tipo, amb: it[5], piso: t.montagem === 'piso', teto: t.montagem === 'teto' });
  }
  if (sugerir) infra = [...infra, ...caminhosSugeridos(infra, porDisc, peDireito, paredes, avisos)];
  const estimadas = [];
  for (const [disc, pecas] of porDisc) {
    // a luminária do projeto elétrico desce do eletroduto da elétrica (mesma família)
    const doProjeto = infra.filter(g => FAMILIA(g.disciplina) === FAMILIA(disc) && g.forma !== 'linha');
    if (doProjeto.length) {
      // cada peça desce do trecho mais próximo dela (o de maior seção vence o empate)
      for (const g of doProjeto) g._pecas = [];
      // todos os segmentos em sequência (grupo a grupo: o empate fica com o primeiro),
      // e só os do alto para a peça do teto (luminária não sobe do piso). Busca pela
      // grade: antes cada peça conferia todos os segmentos (revisão de 02/11/2026)
      const juntar = (gs) => {
        const segs = [], dono = [];
        for (const g of gs) for (let i = 0; i + 3 < g.segmentos.length; i += 4) { segs.push(g.segmentos[i], g.segmentos[i + 1], g.segmentos[i + 2], g.segmentos[i + 3]); dono.push(g); }
        return { perto: buscaMaisPerto(segs), dono };
      };
      const todos = juntar(doProjeto);
      const doAlto = doProjeto.some(g => g.z < 0.5) ? juntar(doProjeto.filter(g => !(g.z < 0.5))) : todos;
      for (const p of pecas) {
        const b = p.teto ? doAlto : todos;
        const m = b.perto(p.x, p.y);
        if (m) b.dono[m.s]._pecas.push(p);
      }
      for (const g of doProjeto) {
        // do eletroduto do projeto a descida é o mesmo eletroduto; da eletrocalha/leito/perfilado
        // desce eletroduto (grupo à parte, estimado) — os metros não entram na eletrocalha
        if (g.forma === 'tubo') ligarDescidas(g, g._pecas);
        else if (g._pecas.length) {
          const gd = grupoEletroduto(disc, g.z, 'descida');
          ligarDescidas(g, g._pecas, gd);
          if (gd.descidas.length) estimadas.push(gd);
        }
        delete g._pecas;
      }
      continue;
    }
    const e = INFRA_ESTIMADA[disc];
    if (!estimar || !e || pecas.length < 2) continue;
    const pts = pecas.map(p => [p.x, p.y]);
    let centro = pecas.findIndex(p => p.centro);
    if (centro < 0) {
      // sem quadro/central na cena: parte do ponto mais perto do meio dos pontos
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      centro = pts.reduce((k, p, i) => (Math.hypot(p[0] - cx, p[1] - cy) < Math.hypot(pts[k][0] - cx, pts[k][1] - cy) ? i : k), 0);
    }
    const segs = arvoreEstimada(pts, centro);
    const g = grupoEletroduto(disc, e.z ?? Math.max(0.1, peDireito - TRECHOS.eletroduto.desce), true);
    g.segmentos = segs.flatMap(q => q.map(r2));
    g.segmentos_total = segs.length;
    g.comprimento_m = Math.round(segs.reduce((s, q) => s + Math.hypot(q[2] - q[0], q[3] - q[1]), 0) * 10) / 10;
    ligarDescidas(g, pecas);
    estimadas.push(g);
  }
  const semTracado = estimadas.filter(g => g.rotulo !== 'Eletroduto de descida');
  if (semTracado.length) {
    avisos.push(`Infraestrutura ESTIMADA (o projeto não traz o traçado): ${semTracado.map(g => `${(DISCIPLINAS[g.disciplina] || { rotulo: g.disciplina }).rotulo} — eletroduto ${g.material} ${g.medida}, ${String(g.comprimento_m).replace('.', ',')} m`).join('; ')}. Caminho em "L" do quadro/rack/central até cada ponto, perto do teto, com descida até as peças de parede — conferir no projeto executivo.`);
  }
  if (estimadas.length > semTracado.length) {
    avisos.push('Descidas da eletrocalha/leito/perfilado até as peças de parede: eletroduto ESTIMADO (bitola típica da disciplina) — conferir no projeto.');
  }
  return [...infra, ...estimadas];
}

// elétrica, iluminação e iluminação externa usam a mesma tubulação
// cor única dos caminhos sugeridos (translúcidos no 3D): não se confundem com o projeto
const COR_SUGERIDO = '#8fe9ff';
// (a elétrica hospitalar — tomada do IT médico, BEL — desce da mesma tubulação, como antes
// de ter chave própria; o circuito IT separado é assunto do projeto, não do 3D ilustrativo)
const FAMILIA = (d) => (['iluminacao', 'iluminacao-externa', 'eletrica_hospitalar'].includes(d) ? 'eletrica' : d);

// Caminhos SUGERIDOS (./infraestrutura.js): por família de disciplina, o que o
// desenho deixou solto liga-se à rede do projeto (ou ao quadro) — no teto para os
// pontos de parede e de teto, enterrado (rente ao piso) para postes e caixas de
// piso. Um grupo "Eletroduto sugerido" por disciplina, mostrado à parte no 3D.
function caminhosSugeridos(infra, porDisc, peDireito, paredes, avisos) {
  const familias = new Map();
  for (const [disc, pecas] of porDisc) {
    const f = FAMILIA(disc);
    if (!familias.has(f)) familias.set(f, []);
    familias.get(f).push(...pecas.map(p => ({ ...p, disc })));
  }
  const grupos = [];
  let total = 0, n = 0, sem = 0, cortados = 0;
  for (const [fam, pecas] of familias) {
    for (const piso of [false, true]) {
      // postes e caixas de piso saem do quadro (de parede) quando não há rede enterrada desenhada
      const doNivel = pecas.filter(p => p.piso === piso || (piso && p.tipo === 'quadro'));
      if (!doNivel.some(p => p.piso === piso)) continue;
      const rede = infra.filter(g => FAMILIA(g.disciplina) === fam && g.forma !== 'linha' && (g.z < 0.5) === piso).flatMap(g => g.segmentos);
      // ponto sozinho e sem rede: não há o que ligar
      if (!rede.length && doNivel.length < 2) continue;
      // ponto de parede já ligado pelo eletroduto do piso (sobe do piso) não ganha caminho pelo teto
      const redeParede = piso ? [] : infra.filter(g => FAMILIA(g.disciplina) === fam && g.forma !== 'linha' && g.z < 0.5).flatMap(g => g.segmentos);
      const r = sugerirCaminhos({ pecas: doNivel, rede, redeParede, paredes });
      sem += r.sem - (r.cortados || 0); cortados += r.cortados || 0;
      if (!r.segmentos.length) continue;
      // a cor/disciplina do grupo: a da maioria das peças da família no nível
      const cont = {};
      for (const p of doNivel) cont[p.disc] = (cont[p.disc] || 0) + 1;
      const disc = Object.keys(cont).sort((a, b) => cont[b] - cont[a])[0];
      const z = piso ? (INFRA_ESTIMADA['iluminacao-externa'].z) : Math.max(0.1, peDireito - TRECHOS.eletroduto.desce);
      const g = grupoEletroduto(disc, z, true);
      const segs = juntarOrtogonais(r.segmentos);
      Object.assign(g, {
        rotulo: piso ? 'Eletroduto enterrado sugerido' : 'Eletroduto sugerido', sugerido: true, origem_medida: 'sugerido', cor: COR_SUGERIDO,
        ...(piso ? { material: INFRA_ESTIMADA['iluminacao-externa'].material, medida: `Ø ${INFRA_ESTIMADA['iluminacao-externa'].mm} mm (${INFRA_ESTIMADA['iluminacao-externa'].pol})`, secao: [0.04, 0.04] } : {}),
        segmentos: segs.flatMap(q => q.map(r2)), segmentos_total: segs.length,
        comprimento_m: Math.round(segs.reduce((s, q) => s + Math.hypot(q[2] - q[0], q[3] - q[1]), 0) * 10) / 10,
      });
      total += g.comprimento_m; n += r.sugeridos;
      grupos.push(g);
    }
  }
  if (n) {
    avisos.push(`Caminhos SUGERIDOS pelo sistema (o desenho não liga esses pontos): ${n} pontos ligados à tubulação do projeto ou ao quadro por ${String(Math.round(total * 10) / 10).replace('.', ',')} m de eletroduto — interruptor até a luminária do ambiente, tomada e luminária até a rede mais próxima, em "L" junto às paredes e pelo lado que atravessa menos paredes. É sugestão: conferir no projeto executivo (botão "Sugeridos" do 3D liga/desliga).`);
  }
  if (sem) avisos.push(`${sem} ponto(s) longe demais (mais de 40 m) da rede e do quadro ficaram sem caminho sugerido.`);
  // teto de ./infraestrutura.js (MAX_SUGERIDOS): desenho enorme não estoura o tempo do 3D
  if (cortados) avisos.push(`${cortados.toLocaleString('pt-BR')} ponto(s) ficaram sem caminho sugerido: o sistema sugere no máximo ${MAX_SUGERIDOS.toLocaleString('pt-BR')} ligações por disciplina e nível numa planta (desenho muito grande) — conferir no projeto.`);
  return grupos;
}

// Quadro, rack e central de disciplinas diferentes costumam cair no MESMO ponto
// da parede (cada estimativa escolhe a sala técnica): lado a lado, com 10 cm
// de folga, em vez de um dentro do outro. `p` é ajustado no lugar.
function afastarDosVizinhos(p, tam, postos) {
  const tx = -p.ny, ty = p.nx; // direção ao longo da parede
  for (let k = 0; k < 8; k++) {
    const viz = postos.find(q => q.nx * p.nx + q.ny * p.ny > 0.9 && Math.abs((p.x - q.x) * p.nx + (p.y - q.y) * p.ny) < 0.15
      && Math.abs(p.z - q.z) < (tam[1] + q.tam[1]) / 2 && Math.abs((p.x - q.x) * tx + (p.y - q.y) * ty) < (tam[0] + q.tam[0]) / 2 + 0.1);
    if (!viz) break;
    const ao = (p.x - viz.x) * tx + (p.y - viz.y) * ty;
    const passo = (tam[0] + viz.tam[0]) / 2 + 0.1 - Math.abs(ao);
    const s = ao >= 0 ? 1 : -1;
    p.x += tx * s * (passo + 0.001); p.y += ty * s * (passo + 0.001);
  }
  postos.push({ x: p.x, y: p.y, z: p.z, nx: p.nx, ny: p.ny, tam });
}

// ── Cena ────────────────────────────────────────────────────────────────────
// opcoes: { peDireito, dispositivos (de pontosDasDisciplinas), trechos (ver
// montarInfra), titulo, cliente, obra, proposta, avisos, instalacao (modelo único
// da skill: skills/_comum/instalacao — vai inteiro para a cena),
// estimarInfra (false: disciplina sem traçado no projeto fica sem eletroduto) }
function montarCena(arquitetura, opcoes = {}) {
  const peDireito = Number(opcoes.peDireito) > 1.5 ? Number(opcoes.peDireito) : PE_DIREITO_PADRAO;
  const { ambientes, caixa: caixaSalas } = regiaoDoModelo(arquitetura);
  // postes e caixas da área externa (estacionamento, quadras) ficam fora das
  // salas: a região cresce até eles, senão o 3D os descarta
  const noPiso = (opcoes.dispositivos || []).filter(d => espec(d.simbolo).h === 'piso' && Number.isFinite(d.x) && Number.isFinite(d.y));
  const caixa = noPiso.length ? expandir(uniao(caixaSalas, caixaDe(noPiso.map(d => [d.x, d.y]))), 2) : caixaSalas;
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
  const grandes = []; // quadros, racks e centrais já postos (para não sobrepor)
  const indiceAmb = new Map();
  ambs.forEach((a, i) => { if (!indiceAmb.has(a.nome)) indiceAmb.set(a.nome, i); });
  // ponto sem ambiente (ou com nome que não casa — o componente lido do DWG vem com
  // ambiente null): o MENOR ambiente cujo polígono contém o ponto, como em
  // ./pontosDoDesenho.js. Sem isso o visualizador não acha o ponto "dentro" da sala
  // (etiqueta, dica, escolha do ponto de vista) — revisão de 02/11/2026. A tomada
  // desenhada na linha da parede fica fora do contorno da sala (que corre pela face
  // interna): vale a sala de contorno mais perto, a até AMBIENTE_FOLGA_M
  const caixasAmb = ambientes.map(a => caixaDe(a.poligono));
  const ambienteDoPonto = (x, y) => {
    let k = -1;
    for (let i = 0; i < ambientes.length; i++) {
      const c = caixasAmb[i];
      if (x < c[0] || x > c[2] || y < c[1] || y > c[3] || (k >= 0 && !(ambs[i].area_m2 < ambs[k].area_m2))) continue;
      if (dentro([x, y], ambientes[i].poligono)) k = i;
    }
    if (k >= 0) return k;
    let dk = AMBIENTE_FOLGA_M;
    for (let i = 0; i < ambientes.length; i++) {
      const c = expandir(caixasAmb[i], AMBIENTE_FOLGA_M);
      if (x < c[0] || x > c[2] || y < c[1] || y > c[3]) continue;
      const d = distanciaContorno([x, y], ambientes[i].poligono);
      if (d < dk) { dk = d; k = i; }
    }
    return k;
  };
  const posInstalacao = new Map(); // id do ponto do modelo único → posição na cena
  for (const d0 of opcoes.dispositivos || []) {
    if (!naCaixa(expandir(caixa, 1), [d0.x, d0.y])) continue;
    // nota do projeto "h = 20 cm abaixo do forro" (./pontosDoDesenho.js): conta do pé-direito
    const d = Number(d0.abaixoDoForro_m) > 0 ? { ...d0, altura_m: r2(Math.max(0.1, peDireito - Number(d0.abaixoDoForro_m))) } : d0;
    const disc = chaveDisciplina(d.disciplina || disciplinaDoSimbolo(d.simbolo));
    // componente do projeto recebido vem com a descrição dele (d.rotulo): um tipo
    // por descrição — "Detector de fumaça DFE 521", não só "Detector"
    const chaveTipo = d.rotulo ? `${d.simbolo}|${d.rotulo}` : d.simbolo;
    let t = tipos.get(chaveTipo);
    if (!t) {
      const e0 = espec(d.simbolo);
      const e = typeof e0.h === 'number' && Number(d.altura_m) > 0 ? { ...e0, h: Number(d.altura_m) } : e0;
      const k = (porDisc[disc] = (porDisc[disc] ?? -1) + 1);
      // tam e montagem: o visualizador desenha a peça no tamanho e na posição (parede/teto/canto) certos
      t = { simbolo: d.simbolo, disciplina: disc, rotulo: String(d.rotulo || SIMBOLOS[d.simbolo]?.legenda || d.simbolo).replace(/\s*\(h = [^)]*\)/, ''), forma: e.forma, tam: e.tam, montagem: typeof e.h === 'number' ? 'parede' : e.h, altura: alturaTexto(e, peDireito), cor: tom((DISCIPLINAS[disc] || { cor: '#dddddd' }).cor, k), itens: [] };
      tipos.set(chaveTipo, t);
    }
    const p = posicionar3d(d, faces, peDireito);
    if (FORMAS_DE_PAREDE.has(t.forma)) afastarDosVizinhos(p, t.tam, grandes);
    const [x, y] = P([p.x, p.y]);
    const amb = indiceAmb.has(d.ambiente) ? indiceAmb.get(d.ambiente) : Number.isFinite(d.x) && Number.isFinite(d.y) ? ambienteDoPonto(d.x, d.y) : -1;
    // item: [x, y, z, nx, ny, ambiente, id, campo | null, circuito, comando] — circuito e comando
    // do modelo único da instalação (antes o 3D descartava o atributo CIRCUITO: achado 3D-06);
    // sem eles o item termina no id (ou no campo da câmera), como antes. O elemento é
    // identificado por símbolo + id (estável entre regerações: o id vem do modelo/da planta)
    const circuito = String(d.circuito || d.atributos?.CIRCUITO || '');
    const comando = String(d.comando || '');
    const it = [x, y, r2(p.z), r2(p.nx), r2(p.ny), amb, d.id || ''];
    if (p.campo || circuito || comando) it.push(p.campo ? p.campo.map(P).flat() : null);
    if (circuito || comando) it.push(circuito, comando);
    t.itens.push(it);
    if (d.id && d.daInstalacao) posInstalacao.set(String(d.id), [x, y, r2(p.z)]);
  }

  const internos = ambs.filter(a => a.tipo !== 'externo');
  const caixaInt = internos.length ? internos.map(a => caixaDe(a.poligono)).reduce(uniao) : [0, 0, 0, 0];
  const compParedes = el.paredes.filter(w => w.classe === 'parede').reduce((s, w) => s + dist(w.a, w.b), 0);
  const listaTipos = [...tipos.values()];
  const avisos = [...(opcoes.avisos || [])];
  if (el.simbolosRedondos) avisos.push(`${el.simbolosRedondos} símbolos redondos (poste, caixa, tomada de piso…) na layer de parede não subiram como pilar nem parede.`);
  // traçado do projeto (com as descidas até as peças) + o estimado das disciplinas sem traçado
  const infra = completarInfra(montarInfra(opcoes.trechos, P, caixa, peDireito, avisos), listaTipos, peDireito, avisos, {
    estimar: opcoes.estimarInfra !== false, sugerir: !!opcoes.sugerirInfra,
    paredes: el.paredes.filter(w => w.classe === 'parede').map(w => [...P(w.a), ...P(w.b)]),
  });
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
    simbolos_redondos_ignorados: el.simbolosRedondos,
    dispositivos: listaTipos.map(t => ({ disciplina: t.disciplina, simbolo: t.simbolo, rotulo: t.rotulo, quantidade: t.itens.length, altura: t.altura })),
    infraestrutura: infra.map(g => ({ disciplina: g.disciplina, tipo: g.tipo, rotulo: g.rotulo, sugerido: !!g.sugerido, material: g.material, medida: g.medida, origem_medida: g.origem_medida, comprimento_m: g.comprimento_m, descidas_m: g.descidas_m, segmentos: g.segmentos_total })),
    por_ambiente: ambs.map(a => ({ nome: a.nome, tipo: a.tipo, area_m2: a.area_m2, perimetro_m: a.perimetro_m })),
  };

  const C = (w) => [...P(w.a), ...P(w.b), r2(w.esp), r2(w.z0), r2(w.z1)];
  // modelo único da instalação (quadros, circuitos, pontos com a posição na cena, comandos):
  // a base do 3D interativo (fase 2) — ponto fora desta planta fica com posicao null
  const instalacao = opcoes.instalacao ? comPosicoes(opcoes.instalacao, posInstalacao) : null;
  return {
    // 3: itens com circuito e comando e a instalação inteira (02/11/2026)
    versao: 3,
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
    disciplinas: Object.fromEntries([...new Set([...listaTipos.map(t => t.disciplina), ...infra.map(g => g.disciplina)])].map(k => [k, DISCIPLINAS[k] || { rotulo: k, cor: '#dddddd' }])),
    dispositivos: listaTipos,
    infra,
    numeros,
    avisos,
    ...(instalacao ? { instalacao } : {}),
  };
}

module.exports = { chaveDisciplina, ALIAS_DISCIPLINA, montarCena, montarInfra, regiaoDoModelo, recortarArquitetura, extrairElementos, classeDaLayer, haLayerDeParede, simboloRedondo, encostar, espec, ESPEC, TAM_FORMA, TRECHOS, LIMITE_SEGMENTOS, ESPESSURA_MIN_DESENHO, DISCIPLINAS, TIPOS, AVISO, PE_DIREITO_PADRAO };
