// Circuitos ORIGINAIS dos quadros lidos do próprio desenho: o diagrama unifilar e o
// quadro de cargas (pedido do usuário em 04/11/2026: "os quadros elétricos não estão
// importando os circuitos originais dos diagramas unifilares dos projetos e transportando
// para a visualização 3D"). Antes a análise só reconhecia a região do unifilar para TIRÁ-LA
// da planta (./classificarPrancha.js), e o 3D inventava um circuito de iluminação e um de
// tomadas por ambiente (../instalacao/doDesenho.js) com o disjuntor "a definir".
//
// Leitura determinística (sem IA), pelos textos com posição (metros):
//   1) UNIFILAR (saídas do barramento, o padrão do QiBuilder/AltoQi e da maioria dos
//      escritórios): cada saída tem, na MESMA linha, o número do circuito, a descrição e a
//      potência ("180 W", "1200 VA"); logo acima, do lado do barramento, o disjuntor
//      ("20 A") e a seção ("2.5"); o DR é o "DR" com a corrente logo acima dele, entre a
//      descrição e o barramento, e protege as saídas abaixo dele do mesmo lado. O quadro é o
//      título do diagrama (texto com a tag "QDFL-1 (EXTERIOR E RECEPÇÃO)" no alto, à esquerda;
//      senão embaixo); o geral, o disjuntor logo abaixo do cabo do alimentador ("3#95(50)50").
//   2) QUADRO DE CARGAS (tabela): a linha de cabeçalho com "CIRCUITO" e as colunas de
//      descrição, potência, disjuntor, seção, fases e DR; as linhas de baixo até o "TOTAL".
//      A tag sai do título acima ("QUADRO DE CARGAS - QD-01").
// O mesmo quadro nos dois (unifilar e tabela): um só, o que faltar num vem do outro.
// Nada é inventado: corrente, seção ou potência que não estão escritas ficam null (o 3D
// mostra "a definir"); a sensibilidade do DR só se estiver escrita ("30 mA").
//
// Entrada: textos [{ s, x, y, h, layer }] do desenho INTEIRO (antes de tirar o que não é
// planta) e as regiões da classificação (opcional: separam um diagrama do vizinho).
// Saída: [{ tag, descricao, origem: 'unifilar' | 'tabela' | 'unifilar+tabela', caixa,
//           geral: { In, polos } | null, drs: [{ tag, In, idn_ma, circuitos[] }],
//           circuitos: [{ numero, descricao, tipo, potencia_w, potencia_va, In, polos, secao_mm2, fases, dr }] }]

const { limparMtext } = require('./textoCad');

const SECOES = new Set([0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500]);
const RE_POT = /^(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,(\d+))?\s*(W|VA|kW|kVA)$/i;
const RE_AMPERE = /^(\d{1,4})\s*A$/;
const RE_DR = /^(I?DR|DDR|IDR)$/i;
const RE_NUMERO = /^(?:C\s*-?\s*)?(\d{1,3})$/i;
const RE_SECAO = /^#?\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:mm²|mm2)?$/i;
const RE_LETRAS = /[A-Za-zÀ-ÿ]{2}/;
// texto técnico ao lado da saída que não é descrição (isolação, eletroduto, cor do fio)
const RE_NAO_DESCRICAO = /^(Unipolar|Multipolar|Conduto|Eletroduto|PVC|EPR|XLPE|HEPR|DPS|DR|IDR|DDR|Branco|Preto|Vermelho|Azul|Verde|Cinza|Fase|Neutro|PE|Terra|R|S|T|N)\b|\bkA\b|\bmA\b|\d\s*#\s*\d|ø|Ø|^\d/i;
// tag de quadro: QDFL-1, QD1, QM2, QGBT, QDG-01, CCM-1, CX.P1
const RE_TAG = /\b(Q[A-Z]{0,5}[-.]?\d{1,3}[A-Z]?|QGBT\s*-?\s*\d*|QGD\s*-?\s*\d*|CCM\s*-?\s*\d*|CX\.?\s?P\d+)\b/i;
const RE_TITULO_QUADRO = /QUADRO|DIAGRAMA|UNIFILAR|TRIFILAR|PAINEL/i;
const RE_ALIMENTADOR = /\d\s*#\s*\d/;

const num = (s) => Number(String(s).replace(',', '.'));
const limpo = (s) => limparMtext(String(s || ''), { quebra: ' ' }).replace(/\s+/g, ' ').trim();
const normTag = (t) => String(t || '').toUpperCase().replace(/\s+/g, '').replace(/\./g, '-');

function potenciaDe(s) {
  const m = RE_POT.exec(s);
  if (!m) return null;
  const v = Number(m[1].replace(/[.\s]/g, '') + (m[2] ? `.${m[2]}` : ''));
  const u = m[3].toUpperCase();
  return { valor: /^K/.test(u) ? v * 1000 : v, unidade: /VA$/.test(u) ? 'VA' : 'W' };
}

function tipoDoCircuito(descricao) {
  const d = String(descricao || '').toUpperCase();
  if (/RESERVA/.test(d)) return 'reserva';
  if (/\bAR[- ]?COND|SPLIT|\bAC\b|CLIMATIZ|CONDENSAD|EVAPORAD|FAN ?COIL|VRF/.test(d)) return 'ar_condicionado';
  if (/BOMBA|MOTOR|ELEVADOR|EXAUST|VENTILADOR|PORT[ÃA]O/.test(d)) return 'motor';
  if (/^ILUM|ILUMINA|\bLUZ|L[ÂA]MP|REFLETOR|EMERG|BALIZ/.test(d)) return 'iluminacao';
  if (/\bTUG|TOMADA|\bTOM\b|\bTOM\.|\bT\.U\.G/.test(d)) return 'tug';
  if (/\bTUE|CHUV|FORNO|TORNEIRA|AQUEC|CARR|COOKTOP|MICRO|GELADEIRA|LAVA|SECADORA|BOILER|SAUNA/.test(d)) return 'tue';
  if (/^Q[A-Z]{0,5}[-\s]?\d|QUADRO|ALIMENT|\bQD|\bCD\b/.test(d)) return 'alimentador';
  return 'outro';
}

// grade de busca: o desenho grande tem dezenas de milhares de textos
function grade(textos, celula) {
  const g = new Map();
  const k = (x, y) => `${Math.floor(x / celula)}|${Math.floor(y / celula)}`;
  textos.forEach((t, i) => { const c = k(t.x, t.y); (g.get(c) || g.set(c, []).get(c)).push(i); });
  return (x0, y0, x1, y1) => {
    const r = [];
    for (let cx = Math.floor(x0 / celula); cx <= Math.floor(x1 / celula); cx++) {
      for (let cy = Math.floor(y0 / celula); cy <= Math.floor(y1 / celula); cy++) {
        for (const i of g.get(`${cx}|${cy}`) || []) { const t = textos[i]; if (t.x >= x0 && t.x <= x1 && t.y >= y0 && t.y <= y1) r.push(i); }
      }
    }
    return r;
  };
}

const area = (c) => (c[2] - c[0]) * (c[3] - c[1]);
const naCaixa = (c, x, y, m = 0) => x >= c[0] - m && x <= c[2] + m && y >= c[1] - m && y <= c[3] + m;

// ── 1) unifilar: uma saída por potência ─────────────────────────────────────────────────────
function saidasDoUnifilar(T, perto, hMed) {
  const saidas = [];
  const usados = new Set();
  // corrente de DR: o "40 A" logo acima do texto "DR"
  const drs = [];
  const nomeDr = new Set();
  T.forEach((t, i) => {
    if (!RE_DR.test(t.s)) return;
    const hh = t.h > 0 ? t.h : hMed;
    let melhor = -1, dm = Infinity;
    for (const j of perto(t.x - 1.5 * hh, t.y, t.x + 1.5 * hh, t.y + 8 * hh)) {
      const m = RE_AMPERE.exec(T[j].s);
      if (!m || j === i) continue;
      const d = (T[j].y - t.y) + Math.abs(T[j].x - t.x);
      if (d < dm) { dm = d; melhor = j; }
    }
    // sensibilidade escrita junto ("30 mA", "40A/30mA")
    let idn = null;
    for (const j of perto(t.x - 4 * hh, t.y - 3 * hh, t.x + 4 * hh, t.y + 5 * hh)) {
      const m = /(\d{2,3})\s*mA\b/i.exec(T[j].s);
      if (m) { idn = Number(m[1]); break; }
    }
    if (melhor >= 0) nomeDr.add(melhor);
    drs.push({ i, x: t.x, y: t.y, In: melhor >= 0 ? Number(RE_AMPERE.exec(T[melhor].s)[1]) : null, idn_ma: idn });
  });

  T.forEach((p, ip) => {
    const pot = potenciaDe(p.s);
    if (!pot) return;
    const hh = p.h > 0 ? p.h : hMed;
    const linha = perto(p.x - 40 * hh, p.y - 0.4 * hh, p.x + 40 * hh, p.y + 0.4 * hh).filter(j => j !== ip);
    let iNum = -1, iDesc = -1, dNum = 12 * hh, dDesc = 35 * hh;
    for (const j of linha) {
      const t = T[j];
      const dx = Math.abs(t.x - p.x);
      if (RE_NUMERO.test(t.s) && dx <= dNum) { dNum = dx; iNum = j; } else if (RE_LETRAS.test(t.s) && !RE_NAO_DESCRICAO.test(t.s) && !potenciaDe(t.s) && dx <= dDesc) { dDesc = dx; iDesc = j; }
    }
    if (iNum < 0 || iDesc < 0) return;
    const n = T[iNum], d = T[iDesc];
    // o disjuntor fica entre a descrição e o barramento: do lado oposto ao número
    const lado = Math.sign(d.x - n.x) || 1;
    let iDj = -1, sDj = Infinity;
    for (const j of perto(d.x - 20 * hh, p.y + 0.1 * hh, d.x + 20 * hh, p.y + 7 * hh)) {
      const t = T[j];
      if (!RE_AMPERE.test(t.s) || nomeDr.has(j) || Math.sign(t.x - d.x) !== lado) continue;
      const s = (t.y - p.y) + 0.3 * Math.abs(t.x - d.x);
      if (s < sDj) { sDj = s; iDj = j; }
    }
    const dj = iDj >= 0 ? T[iDj] : null;
    let secao = null;
    if (dj) {
      let ds = Infinity;
      for (const j of perto(dj.x - 5 * hh, p.y + 0.1 * hh, dj.x + 5 * hh, dj.y + 0.2 * hh)) {
        const m = RE_SECAO.exec(T[j].s);
        if (!m || j === iNum || !SECOES.has(num(m[1]))) continue;
        const dd = Math.hypot(T[j].x - dj.x, T[j].y - dj.y);
        if (dd < ds) { ds = dd; secao = num(m[1]); }
      }
    }
    [ip, iNum, iDesc, iDj].forEach(j => j >= 0 && usados.add(j));
    saidas.push({
      x: p.x, y: p.y, hh, lado, xDj: dj ? dj.x : d.x, xDesc: d.x, numero: RE_NUMERO.exec(n.s)[1].toUpperCase(), descricao: d.s.slice(0, 60),
      potencia_w: pot.unidade === 'W' ? pot.valor : null, potencia_va: pot.unidade === 'VA' ? pot.valor : null,
      In: dj ? Number(RE_AMPERE.exec(dj.s)[1]) : null, secao_mm2: secao, dr: null, caixa: [Math.min(n.x, d.x, p.x, dj?.x ?? p.x), p.y, Math.max(n.x, d.x, p.x, dj?.x ?? p.x), dj ? dj.y : p.y],
    });
  });
  return { saidas, drs };
}

// DR de cada saída do diagrama: o "DR" mais perto ACIMA dela, do mesmo lado do barramento
// (entre a descrição da saída e o barramento). O barramento fica entre os disjuntores da
// esquerda e os da direita; diagrama com saídas de um lado só: até 30 alturas de texto
function drsDoGrupo(saidas, drs) {
  const hh = saidas[0].hh;
  const esq = saidas.filter(s => s.lado > 0).map(s => s.xDj), dir = saidas.filter(s => s.lado < 0).map(s => s.xDj);
  const xBarra = esq.length && dir.length ? (Math.max(...esq) + Math.min(...dir)) / 2 : null;
  const ys = saidas.map(s => s.y);
  const y0 = Math.min(...ys), y1 = Math.max(...ys) + 10 * hh;
  for (const s of saidas) {
    let melhor = null, dy = Infinity;
    for (const r of drs) {
      if (r.y <= s.y || r.y > y1 || r.y < y0) continue;
      const lim = xBarra ?? s.xDj + s.lado * 30 * hh;
      const doLado = s.lado > 0 ? r.x > s.xDesc && r.x < lim : r.x < s.xDesc && r.x > lim;
      if (doLado && r.y - s.y < dy) { dy = r.y - s.y; melhor = r; }
    }
    s.dr = melhor;
  }
}

// ── 2) quadro de cargas em tabela ───────────────────────────────────────────────────────────
const COLUNAS = [
  ['numero', /^(CIRC(\.|UITOS?)?|CKT|N[º°O]\.?|N\.?\s*CIRC\.?)$/i],
  ['descricao', /DESCRI|ALIMENTA[ÇC][ÃA]O$|^ALIMENTA|EQUIPAMENTO|^LOCAL|DESTINO|AMBIENTE|UTILIZA|^CARGAS?$/i],
  ['potencia', /POT[ÊE]NCIA|TOTAL\s*\(?\s*K?V?A?W?\s*\)?$|\((K?W|K?VA)\)|\bVA\b|\bW\b/i],
  ['disjuntor', /DISJ|PROTE[ÇC]/i],
  ['secao', /SE[ÇC][ÃA]O|BITOLA|CABO|CONDUTOR|FIA[ÇC]/i],
  ['fases', /^FASES?$|LIGA[ÇC][ÃA]O/i],
  ['dr', /\bI?DR\b|DIFERENCIAL/i],
];
function colunaDe(s) {
  for (const [k, re] of COLUNAS) if (re.test(s)) return k;
  return null;
}

function tabelas(T, perto, hMed) {
  const quadros = [];
  T.forEach((c0, i0) => {
    if (colunaDe(c0.s) !== 'numero') return;
    const hh = c0.h > 0 ? c0.h : hMed;
    // todas as colunas do cabeçalho (também as que não interessam, como "QUANTIDADE" e "F.d"):
    // sem elas o valor delas caía na coluna da esquerda
    const cab = perto(c0.x - 6 * hh, c0.y - 0.6 * hh, c0.x + 250 * hh, c0.y + 0.6 * hh).map(j => ({ j, t: T[j], k: colunaDe(T[j].s) })).filter(c => c.k || (RE_LETRAS.test(c.t.s) && c.t.s.length <= 30));
    const tem = (k) => cab.some(c => c.k === k);
    if (!tem('potencia') && !tem('descricao')) return;
    const cols = cab.sort((a, b) => a.t.x - b.t.x);
    // potência: a coluna "TOTAL" quando há várias (unitária × quantidade × total)
    const pots = cols.filter(c => c.k === 'potencia');
    const potCol = pots.find(c => /TOTAL/i.test(c.t.s) && !/K\s*VA|KW/i.test(c.t.s)) || pots.find(c => !/K\s*VA|KW/i.test(c.t.s)) || pots[0];
    const fatorPot = potCol && /\(\s*K/i.test(potCol.t.s) ? 1000 : 1;
    const unidadePot = potCol && /VA/i.test(potCol.t.s) ? 'VA' : 'W';
    const x0 = Math.min(...cols.map(c => c.t.x)) - 3 * hh, x1 = Math.max(...cols.map(c => c.t.x)) + 25 * hh;
    // linhas abaixo do cabeçalho, até o TOTAL ou um vão grande
    const abaixo = perto(x0, c0.y - 200 * hh, x1, c0.y - 0.5 * hh).map(j => T[j]).sort((a, b) => b.y - a.y);
    const linhas = [];
    for (const t of abaixo) {
      const l = linhas.at(-1);
      if (l && Math.abs(l.y - t.y) <= 0.45 * hh) l.textos.push(t); else linhas.push({ y: t.y, textos: [t] });
    }
    const circuitos = [];
    let yAnt = c0.y, passo = null;
    for (const l of linhas) {
      const gap = yAnt - l.y;
      if (passo != null && gap > 3.5 * passo) break;
      if (passo == null && gap > 8 * hh) break;
      if (l.textos.some(t => /^TOTA/i.test(t.s))) break;
      // coluna do texto: a do cabeçalho mais à direita que começa antes dele
      const val = {};
      for (const t of l.textos) {
        let col = null;
        for (const c of cols) if (c.t.x <= t.x + 1.2 * hh) col = c;
        if (!col) continue;
        const k = col === potCol ? 'potencia' : col.k === 'potencia' ? null : col.k;
        if (k && val[k] == null) val[k] = t.s;
      }
      const mNum = RE_NUMERO.exec(val.numero || '');
      if (!mNum) { if (circuitos.length) break; continue; }
      passo = passo == null ? gap : Math.min(passo, gap);
      yAnt = l.y;
      const pot = val.potencia != null ? num(String(val.potencia).replace(/\.(?=\d{3}\b)/g, '').replace(/[^\d,.]/g, '')) : NaN;
      const dj = /(?:(\d)\s*[xX]\s*|(\d)P\s*[-–]?\s*)?(\d{1,4})\s*A?\b/.exec(val.disjuntor || '');
      const polos = dj && (dj[1] || dj[2]) ? Number(dj[1] || dj[2]) : (/(\d)\s*P\b/i.exec(val.disjuntor || '') ? Number(/(\d)\s*P\b/i.exec(val.disjuntor)[1]) : null);
      const sec = /(\d{1,3}(?:[.,]\d{1,2})?)/.exec(String(val.secao || '').replace(/^\d\s*#\s*/, ''));
      const fases = val.fases ? (String(val.fases).toUpperCase().match(/[RSTABC]/g) || []).length || null : null;
      circuitos.push({
        numero: mNum[1].toUpperCase(), descricao: val.descricao ? String(val.descricao).slice(0, 60) : null,
        potencia_w: Number.isFinite(pot) && pot > 0 && unidadePot === 'W' ? pot * fatorPot : null,
        potencia_va: Number.isFinite(pot) && pot > 0 && unidadePot === 'VA' ? pot * fatorPot : null,
        In: dj ? Number(dj[3]) : null, polos, secao_mm2: sec && SECOES.has(num(sec[1])) ? num(sec[1]) : null, fases,
        dr: val.dr && !/^(N[ÃA]O|-|–|NAO)$/i.test(String(val.dr).trim()) ? { In: null, idn_ma: /(\d{2,3})\s*mA/i.test(val.dr) ? Number(/(\d{2,3})\s*mA/i.exec(val.dr)[1]) : null } : null,
      });
    }
    if (!circuitos.length) return;
    // título: acima do cabeçalho, com a tag do quadro
    let titulo = null, dt = Infinity;
    for (const j of perto(x0 - 10 * hh, c0.y + 0.3 * hh, x1, c0.y + 15 * hh)) {
      const t = T[j];
      if (!RE_TAG.test(t.s) && !RE_TITULO_QUADRO.test(t.s)) continue;
      const d = (t.y - c0.y) + (RE_TAG.test(t.s) ? 0 : 5 * hh);
      if (d < dt) { dt = d; titulo = t; }
    }
    quadros.push({ titulo: titulo?.s || null, origem: 'tabela', caixa: [x0, linhas.length ? Math.min(c0.y, yAnt) : c0.y, x1, c0.y], circuitos, geral: null, drsLidos: [] });
  });
  return quadros;
}

function tagDoTitulo(titulo) {
  if (!titulo) return { tag: null, descricao: null };
  const m = RE_TAG.exec(titulo);
  const desc = /\(([^)]+)\)/.exec(titulo);
  const tag = m ? normTag(m[1]) : null;
  return { tag, descricao: desc && normTag(desc[1]) !== tag ? desc[1].trim() : null };
}

function lerQuadrosDoDiagrama(textos, regioes = []) {
  const T = (textos || []).filter(t => Number.isFinite(t?.x) && Number.isFinite(t?.y)).map(t => ({ ...t, s: limpo(t.s) })).filter(t => t.s);
  if (!T.length) return [];
  const hs = T.map(t => t.h).filter(h => h > 0).sort((a, b) => a - b);
  const hMed = hs.length ? hs[Math.floor(hs.length / 2)] : 0.2;
  const perto = grade(T, Math.max(0.5, 10 * hMed));
  const caixas = (regioes || []).map(r => r.caixa || r).filter(c => Array.isArray(c) && c.length === 4);

  // saídas do unifilar agrupadas pelo diagrama (a região da classificação; sem ela, por vizinhança)
  const { saidas, drs: drsLidos } = saidasDoUnifilar(T, perto, hMed);
  const grupos = new Map();
  for (const s of saidas) {
    let k = -1;
    caixas.forEach((c, i) => { if (naCaixa(c, s.x, s.y, s.hh) && (k < 0 || area(c) < area(caixas[k]))) k = i; });
    const chave = k >= 0 ? `r${k}` : null;
    if (chave) { (grupos.get(chave) || grupos.set(chave, { caixaRegiao: caixas[k], saidas: [] }).get(chave)).saidas.push(s); continue; }
    // fora de região: junta com o grupo solto mais perto (saídas a até 60 alturas de texto uma da outra — os
    // dois lados do barramento ficam a ~40)
    let g = null;
    const dCaixas = (a, b) => Math.hypot(Math.max(0, a[0] - b[2], b[0] - a[2]), Math.max(0, a[1] - b[3], b[1] - a[3]));
    for (const [kk, gg] of grupos) if (kk.startsWith('s') && gg.saidas.some(o => dCaixas(o.caixa, s.caixa) <= 60 * s.hh)) { g = gg; break; }
    if (!g) grupos.set(`s${grupos.size}`, (g = { caixaRegiao: null, saidas: [] }));
    g.saidas.push(s);
  }

  const quadros = [];
  const titulosUsados = new Set();
  for (const g of grupos.values()) {
    // uma potência solta com número não é diagrama; nem a lista sem disjuntor (legenda "15 W")
    if (g.saidas.length < 2 || g.saidas.filter(s => s.In != null).length < g.saidas.length / 2) continue;
    const hh = g.saidas[0].hh;
    drsDoGrupo(g.saidas, drsLidos);
    const xs = g.saidas.flatMap(s => [s.caixa[0], s.caixa[2]]), ys = g.saidas.flatMap(s => [s.caixa[1], s.caixa[3]]);
    let cx = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    if (g.caixaRegiao) cx = [Math.min(cx[0], g.caixaRegiao[0]), Math.min(cx[1], g.caixaRegiao[1]), Math.max(cx[2], g.caixaRegiao[2]), Math.max(cx[3], g.caixaRegiao[3])];
    // alimentador e geral: o cabo "3#95(50)50" no alto e o disjuntor logo abaixo dele
    let geral = null;
    const topoSaidas = Math.max(...g.saidas.map(s => s.caixa[3]));
    const alim = perto(cx[0], topoSaidas, cx[2], (g.caixaRegiao ? cx[3] : topoSaidas + 25 * hh) + 2 * hh).map(j => T[j]).filter(t => RE_ALIMENTADOR.test(t.s)).sort((a, b) => b.y - a.y)[0];
    if (alim) {
      let dm = Infinity;
      for (const j of perto(alim.x - 10 * hh, topoSaidas + 2 * hh, alim.x + 10 * hh, alim.y)) {
        const m = RE_AMPERE.exec(T[j].s);
        if (!m) continue;
        const d = (alim.y - T[j].y) + 0.3 * Math.abs(T[j].x - alim.x);
        if (d < dm) { dm = d; geral = { In: Number(m[1]), polos: [1, 2, 3, 4].includes(Number(/^(\d)\s*#/.exec(alim.s)?.[1])) ? Number(/^(\d)\s*#/.exec(alim.s)[1]) : null }; }
      }
    }
    if (alim) cx[3] = Math.max(cx[3], alim.y);
    // título: no alto à esquerda (o QiBuilder põe ali); senão embaixo
    let titulo = null, melhor = Infinity;
    const candidatos = [...perto(cx[0] - 15 * hh, cx[3] - 3 * hh, cx[2], cx[3] + 12 * hh).map(j => [j, 0]), ...perto(cx[0] - 15 * hh, cx[1] - 12 * hh, cx[2], cx[1] + 3 * hh).map(j => [j, 1])];
    for (const [j, embaixo] of candidatos) {
      if (titulosUsados.has(j) || !RE_TAG.test(T[j].s) || potenciaDe(T[j].s) || RE_NUMERO.test(T[j].s)) continue;
      const t = T[j];
      const d = (embaixo ? 20 * hh + Math.abs(cx[1] - t.y) : Math.abs(t.y - cx[3])) + 0.2 * Math.abs(t.x - cx[0]) + (/T[ÍI]TULO/i.test(t.layer || '') ? 0 : 2 * hh);
      if (d < melhor) { melhor = d; titulo = j; }
    }
    if (titulo != null) titulosUsados.add(titulo);
    // DRs na ordem em que aparecem (de cima para baixo): DR1, DR2…
    const drsVistos = [...new Set(g.saidas.map(s => s.dr).filter(Boolean))].sort((a, b) => b.y - a.y || a.x - b.x);
    const tagDr = new Map(drsVistos.map((r, i) => [r, `DR${i + 1}`]));
    const circuitos = g.saidas.sort((a, b) => (Number.parseInt(a.numero, 10) - Number.parseInt(b.numero, 10)) || a.numero.localeCompare(b.numero)).map(s => ({
      numero: s.numero, descricao: s.descricao, tipo: tipoDoCircuito(s.descricao), potencia_w: s.potencia_w, potencia_va: s.potencia_va,
      In: s.In, polos: null, secao_mm2: s.secao_mm2, fases: null, dr: s.dr ? tagDr.get(s.dr) : null,
    }));
    quadros.push({
      titulo: titulo != null ? T[titulo].s : null, origem: 'unifilar', caixa: cx, geral, circuitos,
      drs: drsVistos.map(r => ({ tag: tagDr.get(r), In: r.In, idn_ma: r.idn_ma, circuitos: circuitos.filter(c => c.dr === tagDr.get(r)).map(c => c.numero) })),
    });
  }

  // tabelas (quadro de cargas): a que cai dentro de um diagrama já lido não conta de novo
  for (const t of tabelas(T, perto, hMed)) {
    t.circuitos.forEach(c => { c.tipo = tipoDoCircuito(c.descricao); });
    const drComum = t.circuitos.some(c => c.dr) ? [{ tag: 'DR', In: null, idn_ma: t.circuitos.find(c => c.dr?.idn_ma)?.dr.idn_ma ?? null, circuitos: t.circuitos.filter(c => c.dr).map(c => c.numero) }] : [];
    // DR por circuito na tabela: cada um com o seu (a tabela não diz o agrupamento)
    const drs = drComum.length ? t.circuitos.filter(c => c.dr).map(c => ({ tag: `DR-${c.numero}`, In: null, idn_ma: c.dr.idn_ma, circuitos: [c.numero] })) : [];
    t.circuitos.forEach(c => { c.dr = c.dr ? `DR-${c.numero}` : null; });
    quadros.push({ titulo: t.titulo, origem: 'tabela', caixa: t.caixa, geral: null, circuitos: t.circuitos, drs });
  }

  // tag e descrição pelo título; o mesmo quadro no unifilar e na tabela vira um só
  const porTag = new Map();
  const saida = [];
  let semTag = 0;
  for (const q of quadros) {
    const { tag, descricao } = tagDoTitulo(q.titulo);
    q.tag = tag || `QUADRO-${++semTag}`;
    q.tagLida = !!tag;
    q.descricao = descricao;
    const ja = tag ? porTag.get(tag) : null;
    if (!ja) { if (tag) porTag.set(tag, q); saida.push(q); continue; }
    ja.origem = ja.origem === q.origem ? ja.origem : 'unifilar+tabela';
    ja.geral = ja.geral || q.geral;
    ja.descricao = ja.descricao || q.descricao;
    for (const c of q.circuitos) {
      const o = ja.circuitos.find(x => x.numero === c.numero);
      if (!o) { ja.circuitos.push(c); continue; }
      for (const k of ['descricao', 'potencia_w', 'potencia_va', 'In', 'polos', 'secao_mm2', 'fases']) if (o[k] == null && c[k] != null) o[k] = c[k];
      if (!o.dr && c.dr) { o.dr = c.dr; ja.drs.push(...q.drs.filter(d => d.tag === c.dr && !ja.drs.some(x => x.tag === d.tag))); }
    }
  }
  return saida.map(({ tag, tagLida, descricao, titulo, origem, caixa, geral, drs, circuitos }) => ({
    tag, tagLida, descricao, titulo, origem, caixa: caixa.map(v => Math.round(v * 100) / 100), geral, drs, circuitos,
  }));
}

// Tag do quadro escrita junto do símbolo na planta ("QDFL-7"): a mais perto, até `raio` m
function tagNaPlanta(x, y, rotulos, raio = 3) {
  let melhor = null, dm = raio;
  for (const t of rotulos || []) {
    const s = limpo(t.s);
    if (s.length > 30) continue;
    const m = RE_TAG.exec(s);
    if (!m) continue;
    const d = Math.hypot(t.x - x, t.y - y);
    if (d <= dm) { dm = d; melhor = normTag(m[1]); }
  }
  return melhor;
}

module.exports = { lerQuadrosDoDiagrama, tagNaPlanta, tipoDoCircuito, normTag, RE_TAG };
