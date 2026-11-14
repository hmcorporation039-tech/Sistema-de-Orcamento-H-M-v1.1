// QUADRO FIEL AO PROJETO, COM O CABEAMENTO COMPLETO (pedido do usuário em 09/11/2026: "no
// projeto 3d os circuitos com o cabeamento completo têm que aparecer nos quadros, com
// barramentos de terra e neutro e suas respectivas medidas; cada disjuntor tem de seguir
// fielmente o que está no projeto").
//
// JS puro, sem DOM: roda no Node (teste, skill quadros) e no visualizador (bundle).
//
//   fichaDoDisjuntor / fichaDoDr / fichaDoGeral → linhas { campo, valor, fonte, conferir }:
//     o dado do diagrama unifilar, do quadro de cargas ou da legenda, NESSA ordem (a leitura
//     em ../cad/quadrosDoDiagrama.js já junta assim) e a fonte de cada um. O que o projeto não
//     traz sai "[CONFERIR] — não consta no projeto": nada é inventado, nem valor de norma.
//   barramentosDoQuadro → barras L1/L2/L3 (ou pente), N e PE com largura × espessura,
//     comprimento, nº de furos/bornes, material e a fonte: do projeto (q.barramentos com
//     fonte 'projeto') ou calculadas pela skill quadros (DIN 43671 e Tabela 58 da NBR 5410 —
//     ./barramentosCalculados.js, no Node) e marcadas "calculado — conferir com o fabricante".
//   montarQuadroEsquematico → a cena do quadro (formato de ../cad/visualizador3d/quadro.js)
//     a partir do quadro do modelo único (diagrama do projeto): trilhos, disjuntores e DR na
//     largura dos polos, pente/barras, barras N e PE, canaletas, bornes e a fiação.
//   fiacaoDoQuadro(cena, q, circuitos) → os condutores: alimentação → geral → pente/barras →
//     cada disjuntor; saída de cada disjuntor até a saída do quadro; neutro de cada circuito
//     da barra N (passando pelo DR quando há); PE da barra PE. Cor da função (N azul-claro e
//     PE verde-amarelo, NBR 5410 6.1.5.3; fases em preto identificadas por anilha L1/L2/L3,
//     o padrão da skill quadros) e diâmetro pela seção do projeto. Serve à cena esquemática
//     e à cena de fabricação da skill quadros (as mesmas TAGs; barras com o campo `barra`).
// Coordenadas da cena em mm, origem no canto inferior-esquerdo-fundo (x direita, y cima, z frente).
const T = require('../../quadros/scripts/lib/tabelas');

const CONFERIR = '[CONFERIR] — não consta no projeto';
const FONTE = {
  unifilar: 'diagrama unifilar do projeto', tabela: 'quadro de cargas do projeto', 'unifilar+tabela': 'diagrama unifilar / quadro de cargas do projeto',
  legenda: 'legenda do projeto', diagrama: 'diagrama do projeto', projeto: 'projeto', planta: 'texto da planta',
  quadros: 'cálculo da skill quadros (caderno de fabricação)', calculado: 'calculado pela skill quadros — conferir com o fabricante',
  sistema: 'sistema (convenção H&M)', padrao_hm: 'padrão da skill quadros', norma: 'NBR 5410',
};
const nomeFonte = (f) => FONTE[f] || String(f || '');
const S = (v) => String(v ?? '');
const br = (v, c = 1) => (Number.isInteger(Number(v)) ? String(Number(v)) : Number(v).toFixed(c).replace('.', ','));
const temValor = (v) => v != null && v !== '' && !(typeof v === 'number' && !Number.isFinite(v));

// cores dos condutores e das barras
const COR = {
  // fases: preto, identificadas por anilha L1/L2/L3 (skill quadros, caderno.fiacaoPorCor)
  F: '#202226', N: '#7ec4ff', PE: '#3aa845', PE_FAIXA: '#ffd21f',
  // desenergizado (o disjuntor do circuito desligado): acinzentado
  APAGADO: '#7d828a',
  barraFase: '#c87533', barraN: '#7ec4ff', barraPE: '#3aa845', isolador: '#7a2f2a',
  canaleta: '#8d949c', trilho: '#b8bcc2', borne: '#a7afb8', bornePE: '#57b35a', borneN: '#5aa7e6',
};
const CONVENCAO_CORES = 'N azul-claro e PE verde-amarelo (NBR 5410, 6.1.5.3); fases em preto com anilha L1/L2/L3 (padrão da skill quadros — o projeto não define a cor das fases)';

// origem de um campo: a do item (d.fontes), a do circuito, a do quadro (q.origem) ou do diagrama
function fonteDe(campo, ...donos) {
  for (const o of donos) if (o?.fontes && o.fontes[campo]) return o.fontes[campo];
  for (const o of donos) if (o?.origem && FONTE[o.origem]) return o.origem;
  for (const o of donos) if (o?.fonte && FONTE[o.fonte]) return o.fonte;
  return null;
}
const linha = (campo, valor, fonte) => (temValor(valor)
  ? { campo, valor: String(valor), fonte: nomeFonte(fonte) || 'projeto', conferir: false }
  : { campo, valor: CONFERIR, fonte: '—', conferir: true });

// número de polos (1–4) ou null
const polosDe = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 4 ? n : null; };
const descricaoDoProjeto = (c) => (c?.descricao && !/^Circuito\s+\S+$/i.test(String(c.descricao)) ? c.descricao : null);

// ── Fichas fiéis ao projeto ─────────────────────────────────────────────────
function fichaDoDisjuntor(q, d, circ = null, dr = null) {
  if (!d) return [];
  const p = polosDe(d.polos);
  const f = (k) => fonteDe(k, d, circ, q);
  return [
    { campo: 'TAG', valor: S(d.tag), fonte: d.tagDoProjeto ? nomeFonte(f('tag')) : 'sistema (Q + nº do circuito)', conferir: false },
    linha('Circuito', d.circuito, f('numero')),
    linha('Polos', p ? `${p}P (${p * (T.MODULO_MM)} mm — ${p} módulo${p > 1 ? 's' : ''} DIN)` : null, f('polos')),
    linha('Corrente nominal (In)', temValor(d.In) ? `${d.In} A` : null, f('In')),
    linha('Curva', d.curva, f('curva')),
    linha('Capacidade de interrupção (Icu/Icn)', temValor(d.icu_ka) ? `${br(d.icu_ka)} kA` : temValor(d.icn_ka) ? `${br(d.icn_ka)} kA (Icn)` : null, f('icu_ka')),
    linha('Descrição do circuito', descricaoDoProjeto(circ), f('descricao')),
    linha('Seção do cabo de saída', temValor(circ?.secao_mm2) ? `${br(circ.secao_mm2)} mm²` : null, fonteDe('secao_mm2', circ, q)),
    ...(dr ? [{ campo: 'Protegido pelo DR', valor: `${dr.tag}${temValor(dr.idn_ma) ? ` (${dr.idn_ma} mA)` : ''}`, fonte: nomeFonte(fonteDe('dr', circ, dr, q)) || 'projeto', conferir: false }] : []),
  ];
}
function fichaDoDr(q, dr) {
  if (!dr) return [];
  const p = polosDe(dr.polos);
  const f = (k) => fonteDe(k, dr, q);
  return [
    { campo: 'TAG', valor: S(dr.tag), fonte: dr.lido ? nomeFonte(f('tag')) || 'diagrama do projeto' : 'sistema', conferir: false },
    linha('Dispositivo', dr.ddr ? 'Disjuntor diferencial (DDR)' : 'Interruptor diferencial residual (DR)', f('tipo') || q?.origem || 'projeto'),
    linha('Polos', p ? `${p}P` : null, f('polos')),
    linha('Corrente nominal (In)', temValor(dr.In) ? `${dr.In} A` : null, f('In')),
    linha('Sensibilidade (IΔn)', temValor(dr.idn_ma) ? `${dr.idn_ma} mA` : null, f('idn_ma')),
    linha('Circuitos protegidos', (dr.circuitos || []).length ? dr.circuitos.join(', ') : null, f('circuitos')),
  ];
}
function fichaDoGeral(q) {
  const g = q?.geral;
  if (!g) return [];
  const p = polosDe(g.polos);
  const f = (k) => fonteDe(k, g, q);
  return [
    { campo: 'TAG', valor: S(g.tag), fonte: 'sistema', conferir: false },
    linha('Dispositivo', 'Disjuntor geral do quadro', q.origem || 'projeto'),
    linha('Polos', p ? `${p}P` : null, f('polos')),
    linha('Corrente nominal (In)', temValor(g.In) ? `${g.In} A` : null, f('In')),
    linha('Curva', g.curva, f('curva')),
    linha('Capacidade de interrupção (Icu)', temValor(g.icu_ka) ? `${br(g.icu_ka)} kA` : null, f('icu_ka')),
    linha('Alimentador', g.alimentador || q.alimentador, f('alimentador')),
  ];
}

// ── Fases do quadro ─────────────────────────────────────────────────────────
// pelos polos do geral (3P/4P → trifásico) e dos disjuntores; sem nada escrito: 3 fases no
// desenho, marcado [CONFERIR]
function fasesDoQuadro(q) {
  const pg = polosDe(q?.geral?.polos);
  const pd = Math.max(0, ...(q?.disjuntores || []).map(d => polosDe(d.polos) || 0));
  if (pg >= 3 || pd >= 3) return { n: 3, fonte: pg ? 'polos do disjuntor geral' : 'polos dos disjuntores', conferir: false };
  if (pg === 2 || pd === 2) return { n: 2, fonte: 'polos dos disjuntores (bifásico — conferir se F+N)', conferir: true };
  if (pg === 1 || pd === 1) return { n: 1, fonte: 'polos dos disjuntores', conferir: true };
  return { n: 3, fonte: CONFERIR, conferir: true };
}
// fase (L1/L2/L3) de cada polo do circuito: a do projeto ("A", "RS", "L1"…); senão null
function fasesDoCircuito(circ, polos) {
  const s = String(circ?.fases ?? '').toUpperCase().replace(/L1|R/g, 'A').replace(/L2|S/g, 'B').replace(/L3|T/g, 'C').replace(/[^ABC]/g, '');
  const l = [...new Set(s.split('').filter(Boolean))].map(x => ({ A: 'L1', B: 'L2', C: 'L3' })[x]);
  return l.length >= Math.min(polos, 3) ? l.slice(0, polos) : null;
}

// ── Barramentos ─────────────────────────────────────────────────────────────
// q.barramentos (do projeto, ou calculado no Node pela skill quadros):
//   { tipo: 'pente'|'barra', fase: { l, e }|null, pente: { a, s }|null, neutro: { l, e }|null,
//     pe: { l, e }, fonte: 'projeto'|'calculado', material?, icc_ka?, icc_informada?, notas? }
// terminais: { N: nº de condutores na barra N, PE: nº na barra PE } (contados na fiação)
// Furos/bornes e comprimento pela regra da skill quadros (caderno: furos = saídas + reserva
// + 2, passo 10 mm em duas fileiras): reserva de 20 % (padrão da skill) e 20 mm de pontas.
const RESERVA_PADRAO = 0.2;
function furosEComprimento(nUsados) {
  const furos = nUsados + Math.ceil(nUsados * RESERVA_PADRAO) + 2;
  return { furos, comprimento_mm: 20 + 10 * Math.ceil(furos / 2) };
}
function barramentosDoQuadro(q, { terminais = {}, nFases = null, larguraFases = null } = {}) {
  const b = q?.barramentos && typeof q.barramentos === 'object' ? q.barramentos : null;
  const nf = nFases || fasesDoQuadro(q).n;
  const doProjeto = b && b.fonte === 'projeto';
  const fonteMedida = b ? (doProjeto ? 'projeto' : 'calculado') : null;
  const textoFonte = !b ? CONFERIR : doProjeto ? nomeFonte(b.origem || 'projeto') : 'calculado pela skill quadros (DIN 43671 e NBR 5410, Tabela 58) — conferir com o fabricante';
  const out = [];
  const medida = (x) => (x && Number(x.l) > 0 && Number(x.e) > 0 ? { largura_mm: Number(x.l), espessura_mm: Number(x.e) } : null);
  const tipo = b?.tipo === 'barra' ? 'barra' : b?.tipo === 'pente' ? 'pente' : null;
  // fases: barras (geral > 125 A) ou pente
  const fases = ['L1', 'L2', 'L3'].slice(0, nf);
  if (tipo === 'barra') {
    const m = medida(b.fase);
    for (const f of fases) {
      out.push({ funcao: f, tipo: 'barra', ...(m || {}), comprimento_mm: larguraFases, furos: null, material: b.material || 'Cobre eletrolítico (Cu-ETP)', cor: COR.barraFase,
        fonte: m ? fonteMedida : null, fonte_texto: m ? textoFonte : CONFERIR, conferir: !m || !doProjeto });
    }
  } else {
    out.push({ funcao: fases.join('/'), tipo: 'pente', pente_a: b?.pente?.a ?? null, secao_mm2: b?.pente?.s ?? b?.secaoFase ?? null, comprimento_mm: larguraFases, furos: null,
      material: b?.pente ? 'Cobre isolado (pente do fabricante dos disjuntores)' : null, cor: COR.barraFase,
      fonte: b?.pente ? fonteMedida : null, fonte_texto: b?.pente ? textoFonte : CONFERIR, conferir: !b?.pente || !doProjeto });
  }
  // N e PE: barra (DIN 43671) com furação para os terminais
  for (const [funcao, x, cor, mat] of [['N', b?.neutro || (tipo === 'pente' && b?.secaoNeutro ? null : null), COR.barraN, 'Cobre eletrolítico, identificada azul-claro (NBR 5410, 6.1.5.3.1)'],
    ['PE', b?.pe, COR.barraPE, 'Cobre eletrolítico, identificada verde-amarelo (NBR 5410, 6.1.5.3.2)']]) {
    const m = medida(x);
    const n = Number(terminais[funcao]) || 0;
    const fc = furosEComprimento(n);
    out.push({
      funcao, tipo: 'barra', ...(m || {}), ...(funcao === 'N' && !m && b?.secaoNeutro ? { secao_mm2: b.secaoNeutro } : {}),
      comprimento_mm: fc.comprimento_mm, furos: fc.furos, terminais_usados: n, material: mat, cor,
      fonte: m ? fonteMedida : null, fonte_texto: m ? textoFonte : (funcao === 'N' && b?.secaoNeutro ? `${textoFonte} (seção ≥ ${br(b.secaoNeutro)} mm²; a barra pelo fabricante)` : CONFERIR),
      conferir: !m || !doProjeto,
      regra_furos: 'furos = condutores ligados + 20 % de reserva + 2 (regra da skill quadros, passo 10 mm em 2 fileiras) — conferir com o fabricante',
    });
  }
  return { tipo: tipo || (b ? 'pente' : null), barras: out, fonte: fonteMedida, icc_ka: b?.icc_ka ?? null, icc_informada: b?.icc_informada ?? null, notas: b?.notas || [] };
}
const textoBarra = (x) => [
  x.largura_mm ? `${br(x.largura_mm)} × ${br(x.espessura_mm)} mm` : x.secao_mm2 ? `${br(x.secao_mm2)} mm²` : CONFERIR,
].join('');
function fichaDaBarra(x, q) {
  return [
    { campo: 'Barra', valor: x.funcao === 'N' ? 'Neutro (N)' : x.funcao === 'PE' ? 'Terra (PE)' : x.tipo === 'pente' ? `Fases ${x.funcao} — pente` : `Fase ${x.funcao}`, fonte: 'projeto', conferir: false },
    { campo: 'Seção (largura × espessura)', valor: x.tipo === 'pente' ? (x.pente_a ? `pente ${x.pente_a} A${x.secao_mm2 ? ` (${br(x.secao_mm2)} mm²)` : ''}` : CONFERIR) : textoBarra(x), fonte: x.fonte_texto, conferir: x.conferir },
    { campo: 'Comprimento', valor: x.comprimento_mm ? `${Math.round(x.comprimento_mm)} mm (no arranjo)` : CONFERIR, fonte: x.funcao === 'N' || x.funcao === 'PE' ? 'regra da skill quadros (furos × passo)' : 'largura do arranjo', conferir: !x.comprimento_mm },
    ...(x.furos != null ? [{ campo: 'Furos / bornes', valor: `${x.furos} (${x.terminais_usados} usados no projeto)`, fonte: x.regra_furos, conferir: true }] : []),
    { campo: 'Material', valor: x.material || CONFERIR, fonte: x.material ? (x.fonte === 'projeto' ? 'projeto' : 'NBR 5410 (cor) / skill quadros') : '—', conferir: !x.material },
    ...(q?.barramentos?.icc_informada === false ? [{ campo: 'Icc considerada', valor: `${br(q.barramentos.icc_ka)} kA (premissa da skill quadros: o projeto não informa)`, fonte: CONFERIR, conferir: true }] : []),
  ];
}

// ── Geometria e roteamento da fiação ────────────────────────────────────────
const ZC_PADRAO = 50;
function geometriaDaCena(cena) {
  const cx = cena.caixas || [];
  const can = cx.filter(b => b.camada === 'canaletas');
  const H = can.filter(b => b.l >= b.a).map(b => ({ y: b.y + b.a / 2, x0: b.x, x1: b.x + b.l, z: b.z + b.p / 2, larg: b.a }));
  const V = can.filter(b => b.a > b.l).map(b => ({ x: b.x + b.l / 2, y0: b.y, y1: b.y + b.a, z: b.z + b.p / 2, larg: b.l }));
  const { L = 600, A = 800 } = cena.involucro || {};
  const fl = cx.find(b => b.tag === 'FLANGE') || null;
  const saida = fl ? { x0: fl.x + 12, x1: fl.x + fl.l - 12, y: fl.y + (fl.y > A / 2 ? -6 : 8), z: fl.z + fl.p / 2, sup: fl.y > A / 2 } : { x0: L * 0.3, x1: L * 0.7, y: 8, z: ZC_PADRAO, sup: false };
  const esq = V.length ? V.reduce((m, v) => (v.x < m.x ? v : m)) : { x: 18, y0: 0, y1: A, z: ZC_PADRAO, larg: 30 };
  const dir = V.length ? V.reduce((m, v) => (v.x > m.x ? v : m)) : { x: L - 18, y0: 0, y1: A, z: ZC_PADRAO, larg: 30 };
  return { H, V, esq, dir, saida, L, A };
}
// canaleta horizontal acima (sentido +1) ou abaixo (−1) de y que cobre x
function canaletaH(G, x, y, sentido) {
  const c = G.H.filter(h => (sentido > 0 ? h.y > y + 1 : h.y < y - 1) && x >= h.x0 - 30 && x <= h.x1 + 30)
    .sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];
  return c || { y: y + sentido * 28, z: ZC_PADRAO, larg: 20, virtual: true };
}
// pista do condutor dentro da canaleta (vários condutores lado a lado, sem se sobrepor)
const pista = (k, larg) => ((k % 7) - 3) * Math.min(4.5, Math.max(1.5, (larg || 30) / 9));
function limparPts(pts) {
  const out = [];
  for (const p of pts) {
    const q = p.map(v => Math.round(v * 10) / 10);
    const u = out[out.length - 1];
    if (!u || Math.hypot(u[0] - q[0], u[1] - q[1], u[2] - q[2]) > 0.5) out.push(q);
  }
  return out;
}
// Terminal de um polo do dispositivo (caixa): em cima (entrada) ou embaixo (saída)
function terminal(b, k, n, lado) {
  const x = b.x + b.l * (k + 0.5) / Math.max(1, n);
  const y = lado === 'cima' ? b.y + b.a - 9 : b.y + 9;
  return { x, y, z: b.z + b.p - 14, lado };
}
// Rota de a até b pelas canaletas: sai pelo lado do terminal, corre na horizontal até a
// canaleta vertical do lado escolhido, sobe/desce e entra pelo lado do terminal de destino
function rotear(G, a, b, { lado = 'esquerda', k = 0 } = {}) {
  const V = lado === 'direita' ? G.dir : G.esq;
  const off = pista(k, V.larg);
  const ha = a.lado === 'barra' ? { y: a.y, z: a.z } : canaletaH(G, a.x, a.y, a.lado === 'cima' ? 1 : -1);
  const pts = [[a.x, a.y, a.z]];
  const za = (ha.z ?? ZC_PADRAO) + (k % 3 - 1) * 5;
  const ya = ha.y + (a.lado === 'barra' ? 0 : pista(k + 2, ha.larg));
  pts.push([a.x, ya, za]);
  if (b.saida) {
    pts.push([V.x + off, ya, za], [V.x + off, b.y + (b.sup ? -18 : 18), za], [b.x, b.y + (b.sup ? -18 : 18), b.z], [b.x, b.y, b.z]);
    return limparPts(pts);
  }
  const hb = b.lado === 'barra' ? { y: b.y, z: b.z } : canaletaH(G, b.x, b.y, b.lado === 'cima' ? 1 : -1);
  const yb = hb.y + (b.lado === 'barra' ? 0 : pista(k + 4, hb.larg));
  if (Math.abs(ya - yb) < 2 && (hb === ha || a.lado === b.lado)) pts.push([b.x, ya, za]);
  else pts.push([V.x + off, ya, za], [V.x + off, yb, za], [b.x, yb, za]);
  pts.push([b.x, b.y, b.z]);
  return limparPts(pts);
}
// diâmetro externo do condutor pela seção (tabela da skill quadros); sem seção: 2,6 mm ilustrativo
const diametroDe = (s) => (T.DIAMETRO_FIO[Number(s)] || (Number(s) > 0 ? Math.max(2, Math.sqrt(Number(s)) * 1.9) : 2.6));

// Fiação completa do quadro. cena: caixas com tag (dispositivos), canaletas, barras com
// `barra` ('L1'|'L2'|'L3'|'N'|'PE'|'pente') e a flange de entrada (tag FLANGE).
// q: quadro do modelo único (geral, drs, disjuntores, barramentos); circuitos: id → circuito.
// Devolve { condutores, terminais: { N, PE } } — cada condutor:
//   { id, circuito, funcao: 'F'|'N'|'PE', fase, secao_mm2, secao_fonte, d_mm, cor, cor2?, pts,
//     camada, de, para, energia: { tipo: 'entrada'|'tags'|'circuito'|'terra', … }, conferir[] }
function fiacaoDoQuadro(cena, q, circuitos = {}, opcoes = {}) {
  const G = geometriaDaCena(cena);
  const porTag = new Map();
  for (const b of cena.caixas || []) if (b.tag && !porTag.has(S(b.tag)) && ['protecao', 'partidas'].includes(b.camada)) porTag.set(S(b.tag), b);
  const circ = (id) => (circuitos instanceof Map ? circuitos.get(S(id)) : circuitos[S(id)]) || null;
  const barras = (cena.caixas || []).filter(b => b.barra);
  const barra = (f) => barras.filter(b => b.barra === f);
  const nf = opcoes.nFases || fasesDoQuadro(q).n;
  const fases = ['L1', 'L2', 'L3'].slice(0, nf);
  const condutores = [];
  const cont = { N: 0, PE: 0 };
  const slot = { N: 0, PE: 0 };
  let k = 0;
  // ponto de furo na barra N/PE (duas fileiras, passo 10 mm)
  function furo(funcao) {
    const bs = barra(funcao);
    if (!bs.length) return null;
    const i = slot[funcao]++;
    const tot = bs.reduce((s, b) => s + b.l, 0);
    let pos = 10 + (Math.floor(i / 2) * 10) % Math.max(10, tot - 20);
    let b = bs[0];
    for (const x of bs) { if (pos <= x.l - 6) { b = x; break; } pos -= x.l; }
    cont[funcao]++;
    return { x: b.x + Math.min(b.l - 6, Math.max(6, pos)), y: b.y + b.a * (i % 2 ? 0.3 : 0.7), z: b.z + b.p, lado: 'barra' };
  }
  const nSaida = { i: 0 };
  function pontoSaida() {
    const i = nSaida.i++;
    const w = Math.max(20, G.saida.x1 - G.saida.x0);
    return { x: G.saida.x0 + ((i * 9.5) % w), y: G.saida.y, z: G.saida.z, saida: true, sup: G.saida.sup };
  }
  const add = (c) => {
    const s = Number(c.secao_mm2) > 0 ? Number(c.secao_mm2) : null;
    condutores.push({
      id: `${q.tag}:${condutores.length + 1}`, circuito: c.circuito ?? null, funcao: c.funcao, fase: c.fase ?? null,
      secao_mm2: s, secao_fonte: s ? c.secao_fonte || 'projeto' : CONFERIR, d_mm: Math.round(diametroDe(s) * 10) / 10,
      cor: c.funcao === 'N' ? COR.N : c.funcao === 'PE' ? COR.PE : COR.F, ...(c.funcao === 'PE' ? { cor2: COR.PE_FAIXA } : {}),
      camada: `fiacao-${c.funcao}`, pts: c.pts, de: c.de, para: c.para, energia: c.energia, conferir: c.conferir || [],
    });
    k++;
  };
  const secaoQ = (s) => (Number(s) > 0 ? Number(s) : null);
  // (partida de motor da skill quadros: o disjuntor "M-01-Q1" do modelo é a peça "M-01/Q1")
  const disp = (tag) => porTag.get(S(tag)) || porTag.get(S(tag).replace(/-(Q\d+)$/, '/$1')) || null;
  const geral = q.geral ? disp(q.geral.tag) : null;
  const drs = (q.drs || []).filter(d => !d.ddr);
  const drDe = (id) => drs.find(d => (d.circuitos || []).map(S).includes(S(id))) || null;
  const secaoAlim = secaoQ(q.alimentador_secao_mm2 ?? q.geral?.secao_mm2);
  const fonteAlim = secaoAlim ? q.alimentador_fonte || `diagrama do projeto (alimentador${q.alimentador ? ` ${q.alimentador}` : ''})` : null;

  // 1) alimentação: chegada → geral (fases), → barra N e → barra PE
  const npG = geral ? (polosDe(q.geral.polos) || Math.max(1, Math.round(geral.l / T.MODULO_MM))) : 0;
  if (geral) {
    for (let p = 0; p < Math.min(npG, nf); p++) {
      add({ funcao: 'F', fase: fases[p], secao_mm2: secaoAlim, secao_fonte: fonteAlim, pts: rotear(G, terminal(geral, p, npG, 'cima'), pontoSaida(), { lado: 'esquerda', k }).reverse(),
        de: 'alimentador (entrada do quadro)', para: `${q.geral.tag} — polo ${p + 1} (entrada)`, energia: { tipo: 'entrada' }, conferir: secaoAlim ? [] : ['seção do alimentador não consta no projeto'] });
    }
  }
  const fN0 = furo('N');
  if (fN0) add({ funcao: 'N', secao_mm2: secaoAlim, secao_fonte: fonteAlim, pts: rotear(G, fN0, pontoSaida(), { lado: 'esquerda', k }).reverse(), de: 'alimentador (neutro)', para: 'barra N', energia: { tipo: 'entrada' } });
  const fP0 = furo('PE');
  if (fP0) add({ funcao: 'PE', secao_mm2: secaoAlim, secao_fonte: fonteAlim, pts: rotear(G, fP0, pontoSaida(), { lado: 'esquerda', k }).reverse(), de: 'PE do alimentador', para: 'barra PE', energia: { tipo: 'terra' } });

  // 2) geral → distribuição: barras de fase (tipo barra) ou o pente de cada grupo
  const barrasFase = fases.map(f => barra(f)[0]).filter(Boolean);
  const pentes = barra('pente');
  const tagsGeral = q.geral ? [q.geral.tag] : [];
  // ligação interna (jumper) de um dispositivo a montante (np polos, nfo de fase) ao 1º do pente a jusante
  const alimentarDe = (orig, np, nfo, destinoBox, npD, tags, rotDe, rotPara, quem) => {
    for (let p = 0; p < Math.min(nfo, npD, nf); p++) {
      add({ funcao: 'F', fase: fases[p], secao_mm2: quem?.secao ?? null, secao_fonte: quem?.fonte, pts: rotear(G, terminal(orig, p, np, 'baixo'), terminal(destinoBox, p, npD, 'cima'), { lado: 'esquerda', k }),
        de: `${rotDe} — polo ${p + 1} (saída)`, para: `${rotPara} — polo ${p + 1} (entrada)`, energia: { tipo: 'tags', tags }, conferir: quem?.secao ? [] : ['seção da ligação interna não consta no projeto'] });
    }
  };
  // primeiro dispositivo de cada grupo (pente) por fileira: o geral alimenta os soltos e os DR
  const fileiras = new Map();
  const yDe = (b) => Math.round(b.y);
  const itensProtecao = [...porTag.values()].filter(b => b.camada === 'protecao' && b !== geral);
  for (const b of itensProtecao) { const y = yDe(b); if (!fileiras.has(y)) fileiras.set(y, []); fileiras.get(y).push(b); }
  for (const lista of fileiras.values()) lista.sort((a, b) => a.x - b.x);
  const tagsDoDisjuntor = new Map((q.disjuntores || []).map(d => [S(d.tag), d]));
  const grupoDe = (b) => { const d = tagsDoDisjuntor.get(S(b.tag)); if (d) { const dr = drDe(d.circuito); return dr ? `DR:${dr.tag}` : 'geral'; } return drs.some(x => S(x.tag) === S(b.tag)) ? 'geral' : null; };
  if (barrasFase.length) {
    // barras de fase: geral → barras; cada disjuntor/DR do geral sai da barra por cabo
    if (geral) for (let p = 0; p < Math.min(npG, barrasFase.length); p++) {
      const bf = barrasFase[p];
      add({ funcao: 'F', fase: fases[p], secao_mm2: secaoAlim, secao_fonte: fonteAlim, pts: rotear(G, terminal(geral, p, npG, 'baixo'), { x: bf.x + 12, y: bf.y + bf.a / 2, z: bf.z + bf.p, lado: 'barra' }, { lado: 'esquerda', k }),
        de: `${q.geral.tag} — polo ${p + 1} (saída)`, para: `barra ${fases[p]}`, energia: { tipo: 'tags', tags: tagsGeral } });
    }
    for (const b of itensProtecao.filter(x => grupoDe(x) === 'geral')) {
      const d = tagsDoDisjuntor.get(S(b.tag)) || drs.find(x => S(x.tag) === S(b.tag));
      const np = polosDe(d?.polos) || 1;
      const c = d?.circuito != null ? circ(d.circuito) : null;
      const fc = c ? fasesDoCircuito(c, np) : null;
      for (let p = 0; p < Math.min(np, nf); p++) {
        const fase = fc ? fc[p] : null;
        const bf = barrasFase[fase ? fases.indexOf(fase) : p] || barrasFase[p % barrasFase.length];
        add({ funcao: 'F', fase: fase || fases[p] || null, secao_mm2: secaoQ(c?.secao_mm2), secao_fonte: c?.secao_mm2 ? nomeFonte(fonteDe('secao_mm2', c, q)) : null,
          pts: rotear(G, { x: bf.x + 20 + (k * 7) % Math.max(20, bf.l - 40), y: bf.y + bf.a / 2, z: bf.z + bf.p, lado: 'barra' }, terminal(b, p, np, 'cima'), { lado: 'esquerda', k }),
          de: `barra ${bf.barra}`, para: `${b.tag} — polo ${p + 1} (entrada)`, energia: { tipo: 'tags', tags: tagsGeral }, conferir: fc ? [] : ['fase do circuito não consta no projeto'] });
      }
    }
  } else if (geral) {
    // pente: o geral alimenta o 1º dispositivo de cada trecho de pente do grupo "geral"
    for (const lista of fileiras.values()) {
      const primeiro = lista.find(b => grupoDe(b) === 'geral');
      if (!primeiro) continue;
      const d = tagsDoDisjuntor.get(S(primeiro.tag)) || drs.find(x => S(x.tag) === S(primeiro.tag));
      const npP = polosDe(d?.polos) || Math.max(1, Math.round(primeiro.l / T.MODULO_MM));
      alimentarDe(geral, npG, Math.min(npG, nf), primeiro, npP, tagsGeral, q.geral.tag, primeiro.tag, { secao: secaoAlim, fonte: fonteAlim });
    }
  }
  // DR → pente dos disjuntores dele (1º de cada fileira); N: barra N → entrada N do DR
  for (const dr of drs) {
    const b = disp(dr.tag);
    if (!b) continue;
    const np = polosDe(dr.polos) || Math.max(2, Math.round(b.l / T.MODULO_MM));
    const tags = [...tagsGeral, dr.tag];
    const filhos = itensProtecao.filter(x => grupoDe(x) === `DR:${dr.tag}`);
    const porFila = new Map();
    for (const f of filhos) { const y = yDe(f); if (!porFila.has(y) || f.x < porFila.get(y).x) porFila.set(y, f); }
    for (const f of porFila.values()) {
      const d = tagsDoDisjuntor.get(S(f.tag));
      alimentarDe(b, np, Math.max(1, np - 1), f, polosDe(d?.polos) || Math.max(1, Math.round(f.l / T.MODULO_MM)), tags, dr.tag, f.tag, null);
    }
    const fN = furo('N');
    if (fN) add({ funcao: 'N', pts: rotear(G, fN, terminal(b, np - 1, np, 'cima'), { lado: 'esquerda', k }), de: 'barra N', para: `${dr.tag} — polo N (entrada)`, energia: { tipo: 'tags', tags: tagsGeral },
      conferir: ['posição do polo N no DR conforme o fabricante'] });
  }

  // 3) saídas de cada disjuntor: fases até a saída do quadro; N da barra N (ou do DR); PE da barra PE
  for (const d of q.disjuntores || []) {
    const b = disp(d.tag);
    if (!b) continue;
    const c = circ(d.circuito);
    const np = polosDe(d.polos) || Math.max(1, Math.round(b.l / T.MODULO_MM));
    const s = secaoQ(c?.secao_mm2);
    const sf = s ? nomeFonte(fonteDe('secao_mm2', c, q)) : null;
    const fc = fasesDoCircuito(c, np);
    const dr = drDe(d.circuito);
    const rot = `circuito ${d.circuito}${c?.descricao ? ` (${c.descricao})` : ''}`;
    const energia = { tipo: 'circuito', id: S(d.circuito) };
    const ddr = (q.drs || []).some(x => x.ddr && S(x.tag) === S(d.tag));
    // fases: um condutor por polo de fase (2P de circuito F+N: 1 fase e o neutro pelo 2º polo [CONFERIR])
    const temNeutro = c ? !/^(FF|FFF)$/i.test(String(c.ligacao || '')) && np < 3 : np < 3;
    const nFasesC = ddr && temNeutro ? Math.max(1, np - 1) : temNeutro && np === 2 && fc?.length !== 2 ? 1 : Math.min(np, 3);
    for (let p = 0; p < nFasesC; p++) {
      add({ circuito: d.circuito, funcao: 'F', fase: fc ? fc[p] : null, secao_mm2: s, secao_fonte: sf, pts: rotear(G, terminal(b, p, np, 'baixo'), pontoSaida(), { lado: 'direita', k }),
        de: `${d.tag} — polo ${p + 1} (saída)`, para: `saída do quadro → ${rot}`, energia, conferir: [...(fc ? [] : ['fase (L1/L2/L3) não consta no projeto']), ...(s ? [] : ['seção não consta no projeto'])] });
    }
    if (temNeutro) {
      // neutro: do DR/DDR do circuito (saída N) ou da barra N
      let de, pts;
      if (ddr) { pts = rotear(G, terminal(b, np - 1, np, 'baixo'), pontoSaida(), { lado: 'direita', k }); de = `${d.tag} — polo N (saída do DDR)`; }
      else if (dr && disp(dr.tag)) {
        const bd = disp(dr.tag), npd = polosDe(dr.polos) || Math.max(2, Math.round(bd.l / T.MODULO_MM));
        pts = rotear(G, terminal(bd, npd - 1, npd, 'baixo'), pontoSaida(), { lado: 'direita', k }); de = `${dr.tag} — polo N (saída do DR)`;
      } else { const f = furo('N'); if (f) { pts = rotear(G, f, pontoSaida(), { lado: 'direita', k }); de = 'barra N'; } }
      if (pts) add({ circuito: d.circuito, funcao: 'N', secao_mm2: s, secao_fonte: sf, pts, de, para: `saída do quadro → ${rot}`, energia, conferir: s ? [] : ['seção não consta no projeto'] });
    }
    const fp = furo('PE');
    if (fp) add({ circuito: d.circuito, funcao: 'PE', secao_mm2: s, secao_fonte: sf, pts: rotear(G, fp, pontoSaida(), { lado: 'direita', k }), de: 'barra PE', para: `saída do quadro → ${rot}`, energia: { tipo: 'terra' }, conferir: s ? [] : ['seção não consta no projeto'] });
  }
  return { condutores, terminais: { ...cont }, convencao: CONVENCAO_CORES };
}

// ── Cena esquemática do quadro do projeto ───────────────────────────────────
// Fileiras de trilho DIN (18 módulos de 18 mm), o geral, cada DR seguido dos seus
// disjuntores e os demais; largura de cada um pelos POLOS do projeto (sem polos no projeto:
// 1 módulo no desenho e "[CONFERIR]" na ficha). Pente por grupo (geral / cada DR), barras de
// fase quando o barramento é de barras, barras N e PE com a furação, canaletas e a flange.
function montarQuadroEsquematico(q, { circuito = () => null } = {}) {
  const MOD = T.MODULO_MM, ALT = T.DIN_ALTURA, POR_FILA = 18;
  const fq = fasesDoQuadro(q);
  const itens = [];
  const usados = new Set();
  const disjuntores = q.disjuntores || [];
  const drs = (q.drs || []).filter(d => !d.ddr);
  const drDe = (id) => drs.find(d => (d.circuitos || []).map(S).includes(S(id))) || null;
  const largura = (polos, padrao) => (polosDe(polos) || padrao) * MOD;
  const dj = (d) => ({ tag: d.tag, l: largura(d.polos, 1), tipo: (q.drs || []).some(x => x.ddr && x.tag === d.tag) ? 'ddr' : 'disjuntor', d });
  if (q.geral) itens.push({ tag: q.geral.tag, l: largura(q.geral.polos, Math.min(fq.n, 3)), tipo: 'geral', d: q.geral });
  for (const dr of drs) {
    itens.push({ tag: dr.tag, l: largura(dr.polos, fq.n >= 3 ? 4 : 2), tipo: 'dr', d: dr });
    for (const id of dr.circuitos || []) {
      const d = disjuntores.find(x => S(x.circuito) === S(id));
      if (d && !usados.has(d.tag)) { usados.add(d.tag); itens.push(dj(d)); }
    }
  }
  for (const d of disjuntores) if (!usados.has(d.tag)) itens.push(dj(d));
  const filas = [[]];
  let larg = 0;
  for (const it of itens) {
    if (larg + it.l > POR_FILA * MOD && filas[filas.length - 1].length) { filas.push([]); larg = 0; }
    filas[filas.length - 1].push(it);
    larg += it.l;
  }
  const bq = barramentosDoQuadro(q, { nFases: fq.n });
  const comBarras = bq.tipo === 'barra';
  // medidas do arranjo (mm) — ilustrativas, a partir do arranjo dos módulos
  const MARG = 25, CV = 40, GAP = 22, CH = 40, PASSO_FILA = ALT + 15 + CH + 15;
  const larguraFila = POR_FILA * MOD;
  const xFila = MARG + CV + GAP;
  const L = Math.ceil((xFila + larguraFila + GAP + CV + MARG) / 50) * 50;
  const zonaBarrasFase = comBarras ? 30 * fq.n + 40 : 0;
  const ZONA_NPE = 110, ZONA_SAIDA = 70;
  const A = Math.ceil((MARG + CH + 15 + zonaBarrasFase + filas.length * PASSO_FILA + ZONA_NPE + ZONA_SAIDA) / 50) * 50;
  const P = 150;
  const Z_PLACA = 20, ZF = Z_PLACA + 3;
  const caixas = [];
  const add = (o) => { caixas.push(o); return o; };
  add({ camada: 'placa', x: MARG - 10, y: 10, z: Z_PLACA, l: L - 2 * (MARG - 10), a: A - 20, p: 3, cor: '#e6e1d6', rotulo: 'Placa de montagem', semEtiqueta: true, info: [['Peça', 'Placa de montagem'], ['Medidas', 'ilustrativas (arranjo esquemático)']] });
  // canaletas: topo, uma abaixo de cada fileira e as duas verticais
  const canaleta = (x, y, l, a, onde) => add({ camada: 'canaletas', x, y, z: ZF, l, a, p: 60, cor: COR.canaleta, opacidade: 0.3, rotulo: `Canaleta ${Math.min(l, a)} × 60 mm`, semEtiqueta: true,
    dica: `Canaleta — ${onde}`, info: [['Peça', `Canaleta de fiação — ${onde}`], ['Seção', `${Math.min(l, a)} × 60 mm (ilustrativa — o projeto não traz o arranjo interno) [CONFERIR]`]] });
  const xH0 = MARG + CV, xH1 = L - MARG - CV;
  let yTopo = A - MARG - CH;
  canaleta(xH0, yTopo, xH1 - xH0, CH, 'horizontal do topo');
  canaleta(MARG, ZONA_SAIDA - 10, CV, A - MARG - ZONA_SAIDA + 10, 'vertical esquerda (alimentação)');
  canaleta(L - MARG - CV, ZONA_SAIDA - 10, CV, A - MARG - ZONA_SAIDA + 10, 'vertical direita (saídas dos circuitos)');
  let y = yTopo - 15;
  // barras de fase (barramento de barras): abaixo da canaleta do topo
  if (comBarras) {
    bq.barras.filter(b => /^L\d$/.test(b.funcao)).forEach((b, i) => {
      const lb = b.largura_mm || 20, eb = b.espessura_mm || 5;
      const yc = y - 20 - i * 30;
      add({ camada: 'barramentos', barra: b.funcao, x: xFila, y: yc - lb / 2, z: ZF + 40, l: larguraFila, a: lb, p: eb, cor: COR.barraFase, metal: true, rotulo: `${b.funcao} ${textoBarra(b)}`,
        dica: `Barra ${b.funcao} — ${textoBarra(b)} · ${b.fonte_texto}`, ficha: fichaDaBarra({ ...b, comprimento_mm: larguraFila }, q) });
      for (const xa of [xFila + 10, xFila + larguraFila - 40]) add({ camada: 'barramentos', x: xa, y: yc - 15, z: ZF, l: 30, a: 30, p: 40, cor: COR.isolador, forma: 'cilindro', semBorda: true, rotulo: 'Isolador', semEtiqueta: true, info: [['Peça', 'Isolador suporte de barramento (ilustrativo)']] });
    });
    y -= zonaBarrasFase;
  }
  const yFilas = [];
  filas.forEach((fila) => {
    const yb = y - ALT; // base do disjuntor
    yFilas.push(yb);
    add({ camada: 'trilhos', x: xFila - 10, y: yb + ALT / 2 - 17.5, z: ZF, l: larguraFila + 20, a: 35, p: 7.5, cor: COR.trilho, metal: true, rotulo: 'Trilho DIN 35 mm', semEtiqueta: true, info: [['Peça', 'Trilho DIN 35 × 7,5 mm (EN 60715)']] });
    let x = xFila;
    // pente: um trecho por grupo contíguo (geral / cada DR)
    let grupoAtual = null, xg = x;
    const fecharPente = (xFim) => {
      if (comBarras || !grupoAtual || xFim - xg < MOD) return;
      add({ camada: 'barramentos', barra: 'pente', x: xg, y: yb + ALT + 1, z: ZF + 7.5 + 45, l: xFim - xg, a: 7, p: 12, cor: COR.barraFase, metal: true, semBorda: true, rotulo: 'Pente', semEtiqueta: true,
        dica: `Barramento tipo pente — ${grupoAtual === 'geral' ? 'alimentado pelo geral' : `alimentado pelo ${grupoAtual.slice(3)}`}`,
        ficha: fichaDaBarra({ ...bq.barras.find(b => b.tipo === 'pente') || { funcao: 'L1/L2/L3', tipo: 'pente', fonte_texto: CONFERIR, conferir: true }, comprimento_mm: xFim - xg }, q) });
    };
    for (const it of fila) {
      const grupo = it.tipo === 'geral' ? null : it.tipo === 'dr' ? 'geral' : drDe(it.d.circuito) ? `DR:${drDe(it.d.circuito).tag}` : 'geral';
      if (grupo !== grupoAtual) { fecharPente(x); grupoAtual = grupo; xg = x; }
      const c = it.tipo === 'disjuntor' || it.tipo === 'ddr' ? circuito(it.d.circuito) : null;
      const ficha = it.tipo === 'geral' ? fichaDoGeral(q) : it.tipo === 'dr' ? fichaDoDr(q, it.d) : fichaDoDisjuntor(q, it.d, c, drDe(it.d.circuito));
      const resumo = it.tipo === 'geral' ? `Geral${it.d.In ? ` ${it.d.In} A` : ''}` : it.tipo === 'dr' ? `DR${it.d.In ? ` ${it.d.In} A` : ''}${it.d.idn_ma ? ` ${it.d.idn_ma} mA` : ''}` : `${it.d.In ? `${it.d.In} A` : 'In ?'}${it.d.curva ? ` ${it.d.curva}` : ''} — circ. ${it.d.circuito}${c?.descricao ? ` ${c.descricao}` : ''}`;
      add({ camada: 'protecao', tag: it.tag, x, y: yb, z: ZF + 7.5, l: it.l, a: ALT, p: 70, cor: it.tipo === 'dr' ? '#cfe3ff' : it.tipo === 'ddr' ? '#d9ccff' : '#f1f3f5', rotulo: it.tag,
        dica: `${it.tag} — ${resumo}`, ficha, polos: polosDe(it.d.polos), info: [['Medidas', `${it.l} × ${ALT} mm (${it.l / MOD} módulo${it.l / MOD > 1 ? 's' : ''} DIN; corpo típico)`]] });
      x += it.l;
    }
    fecharPente(x);
    canaleta(xH0, yb - 15 - CH, xH1 - xH0, CH, 'horizontal abaixo da fileira');
    y = yb - 15 - CH - 15;
  });
  // barras N e PE (com furação) na zona de baixo, acima da saída
  const yN = ZONA_SAIDA + 70, yPE = ZONA_SAIDA + 25;
  const placeholder = (funcao, yy, cor) => add({ camada: 'barramentos', barra: funcao, x: xFila, y: yy, z: ZF + 25, l: 160, a: 20, p: 6, cor, metal: true, rotulo: funcao, _barra: true });
  const bN = placeholder('N', yN, COR.barraN), bPE = placeholder('PE', yPE, COR.barraPE);
  const cena = {
    tipo: 'quadro', titulo: `${q.tag} — ${q.descricao || 'Quadro'}`, esquematico: true,
    involucro: { L, A, P, espessura: 2, cor: '#d6d4cf', rotulo: `Quadro ${q.tag}`, info: [['Quadro', q.tag], ['Arranjo', 'esquemático — dispositivos fiéis ao projeto; medidas do invólucro ilustrativas'], ['Fases', `${fq.n} (${fq.fonte})`]] },
    porta: { itens: [{ x: (L - 120) / 2, y: A - 70, l: 120, a: 40, p: 2, cor: '#f4f1e8', rotulo: q.tag, info: [['Placa de identificação', q.tag]] }], rotulo: 'Porta', info: [['Porta', 'frontal, articulada à esquerda']] },
    portaAberta: true, caixas,
  };
  add({ camada: 'entrada', tag: 'FLANGE', x: L * 0.2, y: 2, z: P * 0.2, l: L * 0.6, a: 5, p: P * 0.6, cor: '#4a5058', rotulo: 'Flange de entrada e saída de cabos', semEtiqueta: true, info: [['Peça', 'Flange de entrada/saída de cabos (ilustrativa)']] });
  // fiação (conta os terminais N/PE) e então as barras N/PE com a medida certa
  const fi = fiacaoDoQuadro(cena, q, new Map((q.disjuntores || []).map(d => [S(d.circuito), circuito(d.circuito)]).filter(([, c]) => c)), { nFases: fq.n });
  const bq2 = barramentosDoQuadro(q, { terminais: fi.terminais, nFases: fq.n, larguraFases: larguraFila });
  for (const [bx, funcao, cor] of [[bN, 'N', COR.barraN], [bPE, 'PE', COR.barraPE]]) {
    const dado = bq2.barras.find(b => b.funcao === funcao);
    const comp = Math.max(bx.l, dado.comprimento_mm);
    Object.assign(bx, {
      l: comp, a: Math.max(12, dado.largura_mm || 20), p: Math.max(3, dado.espessura_mm || 5), rotulo: `${funcao} ${textoBarra(dado)}`,
      dica: `Barra ${funcao} — ${textoBarra(dado)} · ${dado.furos} furos · ${dado.fonte_texto}`, ficha: fichaDaBarra(dado, q),
    });
    delete bx._barra;
    for (const xa of [bx.x + 4, bx.x + comp - 24]) add({ camada: 'barramentos', x: xa, y: bx.y - 2, z: ZF, l: 20, a: bx.a + 4, p: 25, cor: COR.isolador, semBorda: true, rotulo: `Isolador da barra ${funcao}`, semEtiqueta: true });
    // bornes (parafusos dos furos) — camada própria
    const nf2 = Math.min(dado.furos, 80);
    for (let i = 0; i < nf2; i++) {
      add({ camada: 'bornes', x: bx.x + 8 + Math.floor(i / 2) * 10 - 2, y: bx.y + bx.a * (i % 2 ? 0.3 : 0.7) - 2, z: bx.z + bx.p, l: 4, a: 4, p: 2.5, cor: '#c9ccd1', metal: true, semBorda: true,
        rotulo: `Borne ${i + 1} da barra ${funcao}`, semEtiqueta: true, dica: `Barra ${funcao} — furo ${i + 1} de ${dado.furos}${i < dado.terminais_usados ? ' (usado)' : ' (reserva)'}` });
    }
  }
  // a fiação refeita com as barras no tamanho final (furos nas posições certas)
  const fi2 = fiacaoDoQuadro(cena, q, new Map((q.disjuntores || []).map(d => [S(d.circuito), circuito(d.circuito)]).filter(([, c]) => c)), { nFases: fq.n });
  cena.condutores = fi2.condutores;
  cena.barramentos = bq2;
  cena.camadas = [
    { id: 'protecao', rotulo: 'Proteção (disjuntores e DR)', cor: '#e9ecef' },
    { id: 'barramentos', rotulo: 'Barramentos (fases, N, PE)', cor: COR.barraFase },
    { id: 'fiacao-F', rotulo: 'Fiação — fases (F)', cor: '#3a3d43' },
    { id: 'fiacao-N', rotulo: 'Fiação — neutro (N)', cor: COR.N },
    { id: 'fiacao-PE', rotulo: 'Fiação — terra (PE)', cor: COR.PE },
    { id: 'canaletas', rotulo: 'Canaletas', cor: COR.canaleta },
    { id: 'bornes', rotulo: 'Bornes / furos das barras', cor: '#c9ccd1' },
    { id: 'trilhos', rotulo: 'Trilhos DIN', cor: COR.trilho },
  ];
  cena.numeros = [['disjuntores', String(disjuntores.length)], ['DR', String(drs.length)], ['condutores', String(fi2.condutores.length)], ['fases', `${fq.n}${fq.conferir ? ' [conferir]' : ''}`]];
  cena.avisos = [
    'Arranjo esquemático: cada disjuntor e DR com os dados do projeto (polos, In, curva, seção); o invólucro, as canaletas e os trilhos são ilustrativos.',
    `Cores dos condutores: ${CONVENCAO_CORES}.`,
    ...(bq2.fonte === 'calculado' ? ['Barramentos calculados pela skill quadros (DIN 43671 e Tabela 58 da NBR 5410) — conferir com o fabricante.'] : bq2.fonte ? [] : ['Barramentos sem dados no projeto e sem cálculo (corrente do geral não consta): medidas [CONFERIR].']),
  ];
  return cena;
}

// Condutor energizado? (o visualizador acinzenta o que não está): pelo circuito (disjuntor, DR,
// geral, alimentação), pelos dispositivos a montante, pela chegada do quadro ou pelo equipamento
// do painel (motor de interação). O PE não é seccionado: fica sempre na cor dele.
function condutorEnergizado(c, { sim = null, quadroTag = '', rede = null } = {}) {
  const e = c?.energia || {};
  if (e.tipo === 'terra' || c?.funcao === 'PE') return true;
  if (e.tipo === 'equipamento') return rede ? !!rede.saida(e.id) : true;
  if (!sim) return true;
  const q = String(e.quadro || quadroTag);
  if (e.tipo === 'circuito') return sim.alimentado(e.id);
  const chegada = sim.entradaEnergizada ? sim.entradaEnergizada(q) : true;
  if (e.tipo === 'entrada') return chegada;
  if (e.tipo === 'tags') return chegada && (e.tags || []).every(t => sim.ligado(t, q));
  return true;
}

// Liga a fiação a uma cena de quadro já montada (a de fabricação da skill quadros): as
// camadas de fiação entram na lista, os condutores ficam em cena.condutores
function completarCenaComFiacao(cena, q, circuitos, opcoes = {}) {
  const fi = fiacaoDoQuadro(cena, q, circuitos, opcoes);
  cena.condutores = fi.condutores;
  const ja = new Set((cena.camadas || []).map(c => c.id));
  cena.camadas = [...(cena.camadas || []), ...[
    { id: 'fiacao-F', rotulo: 'Fiação — fases (F)', cor: '#3a3d43' },
    { id: 'fiacao-N', rotulo: 'Fiação — neutro (N)', cor: COR.N },
    { id: 'fiacao-PE', rotulo: 'Fiação — terra (PE)', cor: COR.PE },
  ].filter(c => !ja.has(c.id))];
  return cena;
}

module.exports = {
  CONFERIR, COR, CONVENCAO_CORES, FONTE, nomeFonte, fichaDoDisjuntor, fichaDoDr, fichaDoGeral, fichaDaBarra, fasesDoQuadro, fasesDoCircuito,
  barramentosDoQuadro, furosEComprimento, fiacaoDoQuadro, montarQuadroEsquematico, completarCenaComFiacao, geometriaDaCena, rotear, diametroDe, condutorEnergizado,
};
