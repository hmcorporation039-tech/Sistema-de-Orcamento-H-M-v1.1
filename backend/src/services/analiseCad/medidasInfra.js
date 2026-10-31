// Tipo, material e medida da infraestrutura desenhada (eletroduto, eletrocalha,
// leito, perfilado) — para o 3D mostrar cada trecho com a seção REAL e não com
// uma seção padrão. De onde vem a medida, na ordem:
//   1. 'texto'   — texto junto ao traçado ("Ø3/4\"", "EC 100x50", "Eletrocalha
//                  lisa - 300x100mm"); o trecho é dividido por medida e o resto
//                  do caminho ligado herda a do texto mais próximo pelo traçado;
//   2. 'layer'   — nome da layer ("INC_ELETRODUTO_25MM", "ELETROCALHA 100X50");
//   3. 'legenda' — legenda/lista/nota da mesma prancha que define UMA medida
//                  para aquele tipo (amostra de linha da legenda, "CASO NÃO
//                  INDICADO, CONSIDERAR PVC-25mm").
// Sem nenhuma dessas, a medida fica null (o 3D avisa que a seção é ilustrativa):
// nunca se inventa medida.
const path = require('path');
const { CAD } = require('../../config/caminhos');
const { disciplinaDoTexto, separarXref } = require(path.join(CAD, 'disciplinasCad.js'));

// Eletroduto em polegada → diâmetro externo nominal em mm: correspondência usual
// do PVC rígido roscável (NBR 15465 — DN × referência em polegada). Vale como
// seção de desenho também para o aço; quem precisa do diâmetro do aço consulta a NBR 5598.
const POL_PARA_MM = { '1/2': 20, '3/4': 25, '1': 32, '1 1/4': 40, '1 1/2': 50, '2': 60, '2 1/2': 75, '3': 85, '4': 110 };
const MM_PARA_POL = Object.fromEntries(Object.entries(POL_PARA_MM).map(([p, mm]) => [mm, p]));
const DIAMETROS_NOMINAIS = new Set([16, 20, 25, 32, 40, 50, 60, 75, 85, 110]);

const D_TEXTO_M = 1.5; // texto a até 1,5 m do traçado é dele
const MARGEM_M = 0.5; // texto mais perto de outro traçado incompatível: não é deste
// a medida de um texto segue o caminho ligado até 30 m dele: rede de eletrocalhas com
// larguras diferentes costuma ter o rótulo repetido em cada ramal; além disso, não se sabe
const ALCANCE_M = 30;
const JUNTA_M = 0.05; // pontas a até 5 cm: o caminho continua
const AMOSTRA_M = 3; // amostra de linha da legenda: pedaço solto e curto
const CELULA_M = 2;

// ── tipo pela layer (mesmas regras de descreverLinha e do tipoDoTrecho do 3D) ──
// `explicito`: a layer diz o tipo (um "INFRA" ou "TUBULAÇÃO" genérico aceita o tipo do texto)
function tipoDaLayer(layer) {
  const L = separarXref(layer || '').nome;
  if (/ELETROCALHA|\bCALHA/i.test(L)) return { tipo: 'eletrocalha', explicito: true };
  if (/PERFILADO/i.test(L)) return { tipo: 'perfilado', explicito: true };
  if (/LEITO/i.test(L)) return { tipo: 'leito', explicito: true };
  if (/FIA[ÇC][ÃA]O|FIACAO/i.test(L)) return { tipo: 'fiacao', explicito: true };
  // cabeamento desenhado é rota de cabo (descreverLinha), não infraestrutura
  if (/CABEAMENTO/i.test(L) && !/INFRA|ELETROD|TUB/i.test(L)) return { tipo: 'fiacao', explicito: true };
  if (/ELETRODUT|CONDU[IÍ]TE|CONDUIT/i.test(L)) return { tipo: 'eletroduto', explicito: true };
  return { tipo: 'eletroduto', explicito: false };
}
const RETANGULARES = new Set(['eletrocalha', 'perfilado', 'leito']);

// ── leitura da medida num texto ─────────────────────────────────────────────
// palavra que diz o tipo; "ELET." / "ELD" são abreviações usuais de eletroduto
const RE_PALAVRA_ELETRODUTO = /ELETRODUT|\bELET\b\.?|\bELD\b|CONDU[IÍ]TE|CORRUGAD|\bPEAD\b|KANAFLEX|SEALTUBO/i;
const RE_PALAVRA_RET = [[/ELETROCALHA|\bEC\b|\bCALHA\b/i, 'eletrocalha'], [/LEITO/i, 'leito'], [/PERFILADO|\bPERF\b\.?/i, 'perfilado']];
// o que tem medida mas não é infraestrutura elétrica: de outra área sempre (dreno
// Ø150, duto de ar 500x500, vaga 2,40x5,00); caixa 4x4", TV 43", luminária 2x18
// só quando o texto não fala de eletroduto/eletrocalha ("eletroduto Ø1\" até o quadro" vale)
const RE_OUTRA_AREA = /DRENO|ESGOTO|PLUVIAL|[ÁA]GUA|HIDR[ÁA]UL|SPRINKLER|\bG[ÁA]S\b|\bRALO|SANIT|VAGA|GRELHA|DIFUSOR|(?<!ELETRO)DUTO|\bVENTIL/i;
const RE_OUTRO_OBJETO = /\bCX\b|CAIXA|QUADRO|\bTV\b|MONITOR|\bPORTA|JANELA|LUMIN|\bLEDS?\b|PAINEL|BANCADA|LEITORA?\b/i;
// layer de texto de outra área (climatização, hidráulica, arquitetura)
const RE_LAYER_TEXTO_FORA = /HVAC|AVAC|CLIMA|AR.?COND|EQUIPAC|HIDR|SANIT|ESGOTO|PLUVIAL|SPRINK|(^|[-_ .])ARQ|ARQUIT|ESTRUT/i;

const rotuloPol = (p) => `${p}"`;
// "1.1/4", "1,1/4", "1 1/4", "1-1/4", "3/4", "2", "1.5" → chave de POL_PARA_MM ('1 1/4', '3/4', '2', '1 1/2')
function polegada(txt) {
  const s = String(txt).trim();
  let m = /^(\d+)[\s.,-]+(\d)\/(\d)$/.exec(s);
  if (m) return `${Number(m[1])} ${m[2]}/${m[3]}`;
  if ((m = /^(\d)\/(\d)$/.exec(s))) return `${m[1]}/${m[2]}`;
  if ((m = /^(\d+)[.,](\d+)$/.exec(s))) {
    const frac = { 25: '1/4', 5: '1/2', 50: '1/2', 75: '3/4' }[m[2]];
    return frac ? (Number(m[1]) ? `${Number(m[1])} ${frac}` : frac) : null;
  }
  if (/^\d+$/.test(s)) return String(Number(s));
  return null;
}
// polegada → mm: a tabela do PVC; fora dela (5", 6"), a conversão direta da polegada
const valorFracao = (f) => { const [n, d] = f.split('/').map(Number); return d ? n / d : NaN; };
function mmDaPolegada(p) {
  if (POL_PARA_MM[p]) return POL_PARA_MM[p];
  const [a, b] = p.split(' ');
  const v = b ? Number(a) + valorFracao(b) : (a.includes('/') ? valorFracao(a) : Number(a));
  return Number.isFinite(v) && v > 0 ? Math.round(v * 25.4) : null;
}

function eletroduto(mm, pol, quantidade) {
  if (!mm || mm < 10 || mm > 200) return null;
  const p = pol || MM_PARA_POL[mm] || null;
  const base = `Ø ${mm} mm${p ? ` (${rotuloPol(p)})` : ''}`;
  return { forma: 'circular', secao_mm: [mm, mm], medida: quantidade > 1 ? `${quantidade} × ${base}` : base, ...(quantidade > 1 ? { quantidade } : {}) };
}
// eletrocalha/leito/perfilado: largura × altura, com a largura (o lado maior)
// primeiro — "(100x500)mm" e "500x100" são a mesma eletrocalha
function retangular(a, b) {
  const [l, h] = [Math.max(a, b), Math.min(a, b)];
  if (h < 19 || l > 1500) return null;
  return { forma: 'retangular', secao_mm: [l, h], medida: `${l} × ${h} mm` };
}

function materialDoTexto(s, forma) {
  const m = [];
  if (forma === 'circular') {
    if (/CORRUGAD/i.test(s)) m.push(/\bPEAD\b/i.test(s) ? 'PEAD corrugado' : 'PVC corrugado');
    else if (/\bPEAD\b|KANAFLEX/i.test(s)) m.push('PEAD');
    if (/SEALTUBO|FLEX[ÍI]VEL MET|CONDU[IÍ]TE/i.test(s)) m.push('flexível metálico');
    if (/GALV|\bFG\b|FERRO|\bA[ÇC]O\b/i.test(s)) m.push('aço galvanizado');
    else if (/MET[ÁA]LIC|\bMET\b\.?/i.test(s)) m.push('metálico');
    if (/PVC/i.test(s) && !/CORRUGAD/i.test(s)) m.push(/R[ÍI]G/i.test(s) ? 'PVC rígido' : /FLEX/i.test(s) ? 'PVC flexível' : 'PVC');
    else if (/\bR[ÍI]G(IDO)?\b\.?/i.test(s) && !m.length) m.push('rígido');
  } else {
    if (/PERFURAD/i.test(s)) m.push('perfurada');
    if (/\bLISA\b/i.test(s)) m.push('lisa');
    if (/ARAMAD/i.test(s)) m.push('aramada');
    if (/GALV|\bA[ÇC]O\b/i.test(s)) m.push('aço galvanizado');
    else if (/MET[ÁA]LIC|\bMET\b\.?/i.test(s)) m.push('metálica');
    if (/ALUM[ÍI]NIO/i.test(s)) m.push('alumínio');
    if (/PVC/i.test(s)) m.push('PVC');
  }
  // "(galv./PVC)": um ou outro, a escolher na obra
  return m.length ? m.join(/GALV\.?\s*\/\s*PVC|PVC\s*\/\s*GALV/i.test(s) ? ' ou ' : ', ') : null;
}

// Medida escrita num texto: { tipo, explicito (o texto diz o tipo), forma,
// secao_mm, medida, material, quantidade? } ou null
function medidaDoTexto(texto) {
  const s = String(texto || '').replace(/%%[cC]/g, 'Ø').replace(/∅/g, 'Ø').trim();
  if (!s || s.length > 160 || RE_OUTRA_AREA.test(s)) return null;
  const palavraRet = RE_PALAVRA_RET.find(([re]) => re.test(s))?.[1] || null;
  const palavraEld = RE_PALAVRA_ELETRODUTO.test(s);
  if (!palavraRet && !palavraEld && RE_OUTRO_OBJETO.test(s)) return null;
  // eletrodutos em paralelo: "3xØ1\"", "(01x)elet. rig.", "2 eletrodutos 2\"" — "(5x)#4,00mm" são 5 fios
  const qtd = Number(/(\d+)\s*[xX×]\s*Ø/.exec(s)?.[1] || /\((\d+)\s*x\)\s*(?=elet|Ø)/i.exec(s)?.[1] || /\b(\d+)\s+ELETRODUTOS\b/i.exec(s)?.[1] || 1);
  let med = null;

  // 1) Ø: "Ø3/4\"", "ø25", "Ø 1,1/4\"", "Ø50mm", "Ø1 1/4"
  let m = /Ø\s*(\d+[\s.,-]+\d\/\d|\d+[.,]\d+|\d\/\d|\d+)\s*(mm\b|"|”|''|pol\b\.?)?/i.exec(s);
  if (m) {
    const num = m[1].trim(), un = (m[2] || '').toLowerCase();
    const pol = un && un !== 'mm' ? polegada(num) : null;
    if (un === 'mm') med = eletroduto(Math.round(Number(num.replace(',', '.'))), null, qtd);
    else if (pol || /\//.test(num) || Number(num.replace(',', '.')) <= 6) { const p = pol || polegada(num); med = p && eletroduto(mmDaPolegada(p), p, qtd); }
    else med = eletroduto(Math.round(Number(num.replace(',', '.'))), null, qtd);
  }
  // 2) polegada sem Ø: com a palavra eletroduto, ou o texto é só a medida ("3/4\"")
  if (!med) {
    m = /(?:^|[^\d/.,])(\d+[\s.,-]+\d\/\d|\d\/\d|\d+)\s*("|”|''|\s?pol\b\.?)/i.exec(s);
    const soMedida = /^\s*(\d+\s*[xX×]\s*)?(\d+[\s.,-]+\d\/\d|\d\/\d|\d+)\s*("|”|''|pol\.?)\s*$/i.test(s);
    if (m && (palavraEld || soMedida) && !palavraRet) { const p = polegada(m[1]); med = p && eletroduto(mmDaPolegada(p), p, qtd); }
    else if (m && palavraEld && palavraRet && /ELETRODUTOS?\s+\d/i.test(s)) { const p = polegada(m[1]); med = p && eletroduto(mmDaPolegada(p), p, qtd); }
  }
  // 3) DN / mm com a palavra (eletroduto, PVC, corrugado): "PVC-25mm", "corrugado DN 25"
  if (!med && (palavraEld || /PVC|\bFG\b|GALV/i.test(s)) && !palavraRet) {
    m = /\bDN\s*(\d{2,3})\b/i.exec(s) || /(?:^|[^\d#.,])(\d{2,3})\s*mm\b(?![2²])/i.exec(s);
    if (m && DIAMETROS_NOMINAIS.has(Number(m[1]))) med = eletroduto(Number(m[1]), null, qtd);
  }
  // 4) retangular: "EC 100x50", "ELETROCALHA MET. (100x500)mm", "100x50mm - (CFTV)";
  //    sem a palavra, só quando o texto começa pela medida; três medidas é caixa/duto
  if (!med) {
    m = /(?<!\d[.,]?|[xX×]\s*)(\d{2,4})\s*[xX×]\s*(\d{2,4})(?![\d.,]|\s*[xX×]\s*\d)\)?\s*(mm|cm|m)?\b/.exec(s);
    const comeca = /^\(?\s*\d{2,4}\s*[xX×]\s*\d{2,4}/.test(s);
    if (m && (palavraRet || comeca) && !(m[3] && m[3].toLowerCase() !== 'mm')) med = retangular(Number(m[1]), Number(m[2]));
  }
  if (!med) return null;
  const tipo = med.forma === 'circular' ? 'eletroduto' : (palavraRet || 'eletrocalha');
  const explicito = med.forma === 'circular' ? true : !!palavraRet;
  return { tipo, explicito, ...med, material: materialDoTexto(s, med.forma) };
}

// Medida no nome da layer (parte depois da palavra do tipo): "ELE-ELETRODUTO-3/4",
// "INC_ELETRODUTO_25MM", "ELETROCALHA 100X50", "ELETRODUTO 1POL"
function medidaDaLayer(layer) {
  const L = separarXref(layer || '').nome;
  const { tipo } = tipoDaLayer(L);
  if (tipo === 'fiacao') return null;
  const i = L.search(/ELETROCALHA|\bCALHA|PERFILADO|LEITO|ELETRODUT|CONDU[IÍ]TE|CONDUIT|INFRA|TUBULA/i);
  if (i < 0) return null;
  const resto = L.slice(i).replace(/^[A-ZÀ-Ú]+/i, '');
  let med = null, m;
  if (RETANGULARES.has(tipo)) {
    if ((m = /(\d{2,4})\s*X\s*(\d{2,4})/i.exec(resto))) med = retangular(Number(m[1]), Number(m[2]));
  } else if ((m = /(?:^|[^\d])(\d+(?:[\s_-]\d\/\d)?|\d\/\d)\s*(?:POL|")/i.exec(resto)) || (m = /(?:^|[^\d])(\d\/\d)/.exec(resto))) {
    const p = polegada(m[1].replace('_', ' '));
    med = p && eletroduto(mmDaPolegada(p), p, 1);
  } else if ((m = /(?:Ø|ø|∅|[^\d])(\d{2,3})\s*MM/i.exec(resto)) || (m = /(?:Ø|ø|∅)\s*(\d{2,3})/i.exec(resto)) || (m = /[-_ .](\d{2,3})$/.exec(resto))) {
    if (DIAMETROS_NOMINAIS.has(Number(m[1]))) med = eletroduto(Number(m[1]), null, 1);
  }
  if (!med) return null;
  return { tipo, explicito: true, ...med, material: materialDoTexto(L, med.forma) };
}

// filtro barato do worker: só os textos que podem ter medida ou ser título de legenda/nota
const RE_TEXTO_CANDIDATO = /Ø|ø|∅|%%c|\d\s*["”]|''|\d\s*\/\s*\d|\d\s*[xX×]\s*\d|\d\s*mm|\bDN\s*\d|\bPOL\b|ELETRODUT|ELETROCALHA|LEITO|PERFILAD|CORRUG|LEGENDA|CONVEN[ÇC]|SIMBOLOG|NOTAS?\b|OBSERVA|LISTA DE MATERIA|QUANTITATIVO|CASO N[ÃA]O/i;
const RE_TITULO_CONTEXTO = /^(LEGENDA|CONVEN[ÇC][ÕO]ES|SIMBOLOGIA|NOTAS?|OBSERVA[ÇC][ÕO]ES|OBS\.?|LISTA DE MATERIA(IS|L)|QUANTITATIVO)\b.{0,40}$/i;
// título da legenda de símbolos, o mesmo de skills/_comum/cad/projetoDxf.js ("LEGENDA CORTE" não é)
const RE_TITULO_LEGENDA = /^(LEGENDA|CONVEN[ÇC][ÕO]ES|SIMBOLOGIA)(\s+(GERAL|DE (S[ÍI]MBOLOS|EL[ÉE]TRICA|ILUMINA[ÇC][ÃA]O|INSTALA[ÇC][ÕO]ES|PONTOS|CFTV|REDE|L[ÓO]GICA|TELEFONIA|INC[ÊE]NDIO|ALARME|SEGURAN[ÇC]A|AUTOMA[ÇC][ÃA]O|INFRAESTRUTURA)))?\s*:?\s*$/i;
const RE_LAYER_LEGENDA = /LEGEND|SIMBOLOG|CONVEN[ÇC]|\bLEG\b/i;
// nota que vale para todo eletroduto sem medida escrita
const RE_PADRAO = /CASO N[ÃA]O (INDICAD|ESPECIFICAD|COTAD)|QUANDO N[ÃA]O (INDICAD|ESPECIFICAD|COTAD)|SALVO INDICA|EXCETO (ONDE|QUANDO) INDICAD|N[ÃA]O (INDICADOS?|COTADOS?)\s*[:,-]|DI[ÂA]METRO M[ÍI]NIMO/i;

// ── geometria ───────────────────────────────────────────────────────────────
function distPontoSeg(px, py, s) {
  const [x1, y1, x2, y2] = s;
  const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy;
  let t = L ? ((px - x1) * dx + (py - y1) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}
function grade(segs) {
  const g = new Map();
  const cel = (v) => Math.floor(v / CELULA_M);
  segs.forEach((sg, i) => {
    const [x1, y1, x2, y2] = sg.s;
    const cx0 = cel(Math.min(x1, x2)), cx1 = cel(Math.max(x1, x2)), cy0 = cel(Math.min(y1, y2)), cy1 = cel(Math.max(y1, y2));
    // segmento enorme (linha perdida a quilômetros): fora da grade, não trava a leitura
    if ((cx1 - cx0 + 1) * (cy1 - cy0 + 1) > 4000) return;
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) { const k = `${cx},${cy}`; (g.get(k) || g.set(k, []).get(k)).push(i); }
  });
  // índices dos segmentos a até `r` m do ponto
  return (x, y, r) => {
    const out = new Set();
    for (let cx = cel(x - r); cx <= cel(x + r); cx++) for (let cy = cel(y - r); cy <= cel(y + r); cy++) for (const i of g.get(`${cx},${cy}`) || []) out.add(i);
    return out;
  };
}

// Dijkstra com várias origens pelo traçado ligado: cada segmento fica com a
// origem mais próxima PELO CAMINHO (não em linha reta através da parede)
function maisProximoPeloCaminho(n, vizinhos, comp, origens) {
  const dist = new Float64Array(n).fill(Infinity), de = new Int32Array(n).fill(-1);
  const heap = [];
  const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  for (const [i, o] of origens) if (dist[i] > 0) { dist[i] = 0; de[i] = o; push(0, i); }
  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    for (const j of vizinhos[i]) {
      const nd = d + (comp[i] + comp[j]) / 2;
      if (nd < dist[j] && nd <= ALCANCE_M) { dist[j] = nd; de[j] = de[i]; push(nd, j); }
    }
  }
  return { dist, de };
}

const chaveMedida = (m) => (m ? `${m.tipo}|${m.secao_mm?.join('x')}|${m.medida}|${m.material || ''}|${m.origem}` : 'nada');

// Divide os trechos ({ layer, disciplina, segmentos }) por medida e completa
// cada um com { tipo, material, medida, secao_mm, origem_medida }.
// `textos`: [{ s, x, y, h, layer }] em metros (os candidatos do worker).
function medirTrechos(trechos, textos = []) {
  const segs = [];
  trechos.forEach((t, ti) => t.segmentos.forEach((s) => segs.push({ s, ti, comp: Math.hypot(s[2] - s[0], s[3] - s[1]) })));
  const perto = grade(segs);
  const infoLayer = trechos.map(t => ({ ...tipoDaLayer(t.layer), daLayer: medidaDaLayer(t.layer) }));

  // títulos de legenda/nota/lista: o que está abaixo deles é legenda, não traçado.
  // `estrita`: só LEGENDA/CONVENÇÕES/SIMBOLOGIA — um "nota:" pequeno no meio da
  // planta (DWG real) não faz do texto do eletroduto ao lado uma legenda
  const titulos = textos.filter(t => RE_TITULO_CONTEXTO.test(t.s) && t.h > 0);
  const naLegenda = (t, estrita = false) => RE_LAYER_LEGENDA.test(separarXref(t.layer || '').nome)
    || titulos.some(T => t !== T && (!estrita || RE_TITULO_LEGENDA.test(T.s))
      && t.x >= T.x - 2 * T.h && t.x <= T.x + 60 * T.h && t.y <= T.y + T.h && t.y >= T.y - 80 * T.h);

  const compativel = (med, ti) => {
    const L = infoLayer[ti];
    if (L.tipo === 'fiacao') return med.forma === 'circular'; // o traço da "fiação" com Ø escrito é o eletroduto
    if (!L.explicito) return true;
    if (L.tipo === 'eletroduto') return med.forma === 'circular';
    return med.forma === 'retangular' && (!med.explicito || med.tipo === L.tipo);
  };

  // cada texto com medida vai para o traçado compatível mais perto, se nenhum
  // traçado incompatível estiver claramente mais perto (legenda: o texto da
  // linha de baixo não é do eletroduto de cima)
  const ancoras = []; // { seg, med, legenda }
  const soltos = []; // textos com medida longe de todo traçado, na legenda/nota
  let padrao = null; // "CASO NÃO INDICADO, CONSIDERAR PVC-25mm"
  for (const t of textos) {
    if (RE_LAYER_TEXTO_FORA.test(separarXref(t.layer || '').nome)) continue;
    const med = medidaDoTexto(t.s);
    if (!med) continue;
    if (RE_PADRAO.test(t.s) && med.forma === 'circular') { padrao = padrao && padrao.medida !== med.medida ? { conflito: true } : { ...med, quantidade: undefined }; continue; }
    let melhorTodos = Infinity, melhor = null;
    for (const i of perto(t.x, t.y, D_TEXTO_M)) {
      const d = distPontoSeg(t.x, t.y, segs[i].s);
      if (d > D_TEXTO_M) continue;
      melhorTodos = Math.min(melhorTodos, d);
      if (compativel(med, segs[i].ti) && (!melhor || d < melhor.d)) melhor = { i, d };
    }
    // a "fiação" só vira eletroduto se for ela o traço mais perto do Ø escrito
    const margem = melhor && infoLayer[segs[melhor.i].ti].tipo === 'fiacao' ? 1e-6 : MARGEM_M;
    if (melhor && melhor.d <= melhorTodos + margem) ancoras.push({ seg: melhor.i, med, t });
    else if (naLegenda(t)) soltos.push({ med, t, disciplina: disciplinaDoTexto(t.s) });
  }

  // ligações do traçado (mesma layer): ponta com ponta ou ponta no meio do outro (T)
  const vizinhos = segs.map(() => []);
  segs.forEach((a, i) => {
    for (const [px, py] of [[a.s[0], a.s[1]], [a.s[2], a.s[3]]]) {
      for (const j of perto(px, py, JUNTA_M)) {
        if (j === i || segs[j].ti !== a.ti || distPontoSeg(px, py, segs[j].s) > JUNTA_M) continue;
        vizinhos[i].push(j); vizinhos[j].push(i);
      }
    }
  });
  for (const v of vizinhos) { const u = [...new Set(v)]; v.length = 0; v.push(...u); }
  // pedaços ligados e o comprimento de cada um (amostra de legenda = pedaço curto)
  const pedaco = new Int32Array(segs.length).fill(-1), compPedaco = [];
  for (let i = 0; i < segs.length; i++) {
    if (pedaco[i] >= 0) continue;
    const id = compPedaco.length; let soma = 0; const fila = [i]; pedaco[i] = id;
    while (fila.length) { const k = fila.pop(); soma += segs[k].comp; for (const j of vizinhos[k]) if (pedaco[j] < 0) { pedaco[j] = id; fila.push(j); } }
    compPedaco.push(soma);
  }
  // amostra de linha da legenda: pedaço solto e curto, com o texto à direita dele
  const xMaxPedaco = new Map();
  segs.forEach((sg, i) => xMaxPedaco.set(pedaco[i], Math.max(xMaxPedaco.get(pedaco[i]) ?? -Infinity, sg.s[0], sg.s[2])));
  for (const a of ancoras) {
    const pc = pedaco[a.seg];
    a.legenda = compPedaco[pc] <= AMOSTRA_M && a.t.x >= xMaxPedaco.get(pc) - 0.1 && naLegenda(a.t, true);
  }
  const legendaNoSeg = new Map(), pedacosDeLegenda = new Set();
  for (const a of ancoras) if (a.legenda) { if (!legendaNoSeg.has(a.seg)) legendaNoSeg.set(a.seg, a.med); pedacosDeLegenda.add(pedaco[a.seg]); }
  const segsDoTrecho = trechos.map(() => []);
  segs.forEach((sg, i) => segsDoTrecho[sg.ti].push(i));

  // por segmento: a medida do texto mais próximo pelo caminho (só textos do traçado)
  const doTexto = ancoras.filter(a => !a.legenda);
  const { dist, de } = maisProximoPeloCaminho(segs.length, vizinhos, segs.map(s => s.comp), doTexto.map((a, k) => [a.seg, k]));
  const medidaSeg = new Array(segs.length).fill(null);

  // medida única entre as candidatas (mais de uma: não dá para escolher)
  const unica = (lista) => { const k = new Set(lista.map(m => m.medida)); return k.size === 1 ? lista[0] : null; };
  const comOrigem = (m, origem) => m && { tipo: m.tipo, forma: m.forma, secao_mm: m.secao_mm, medida: m.medida, material: m.material || null, quantidade: m.quantidade || null, origem };

  trechos.forEach((t, ti) => {
    const L = infoLayer[ti];
    const idx = segsDoTrecho[ti];
    const legendaDaLayer = unica(ancoras.filter(a => a.legenda && segs[a.seg].ti === ti).map(a => a.med));
    // a mais comum pelo comprimento entre as do texto, se escrita ao menos 2 vezes na
    // layer: um "100x100mm" solto não vale para 477 m de eletrocalha (DWG real).
    // Fiação não: o resto continua fiação.
    const porMedida = new Map();
    for (const i of idx) if (de[i] >= 0) { const m = doTexto[de[i]].med; const r = porMedida.get(m.medida) || porMedida.set(m.medida, { m, metros: 0 }).get(m.medida); r.metros += segs[i].comp; }
    const vezes = (m) => doTexto.filter(a => segs[a.seg].ti === ti && a.med.medida === m.medida).length;
    const dominante = L.tipo === 'fiacao' ? null : [...porMedida.values()].sort((a, b) => b.metros - a.metros).find(r => vezes(r.m) >= 2)?.m || null;
    // legenda/lista sem amostra de linha: uma medida só para o tipo (e a disciplina, quando o texto diz)
    // (o texto sem disciplina só vale se todos os trechos daquele tipo forem da mesma disciplina)
    const tipoTr = L.tipo === 'fiacao' ? null : L.tipo;
    const doTipo = tipoTr ? soltos.filter(x => x.med.explicito && x.med.tipo === tipoTr) : [];
    const daDisciplina = doTipo.filter(x => x.disciplina && x.disciplina === t.disciplina);
    const umaDisciplina = new Set(trechos.filter((_, k) => infoLayer[k].tipo === tipoTr).map(k => k.disciplina)).size <= 1;
    const doPool = daDisciplina.length ? unica(daDisciplina.map(x => x.med))
      : umaDisciplina ? unica(doTipo.filter(x => !x.disciplina).map(x => x.med)) : null;
    for (const i of idx) {
      const daAmostra = legendaNoSeg.get(i) || (pedacosDeLegenda.has(pedaco[i]) ? legendaDaLayer : null);
      let m = null;
      if (daAmostra) m = comOrigem(daAmostra, 'legenda');
      else if (de[i] >= 0 && (!L.daLayer || dist[i] <= D_TEXTO_M)) m = comOrigem(doTexto[de[i]].med, 'texto');
      else if (L.daLayer) m = comOrigem(L.daLayer, 'layer');
      else if (legendaDaLayer) m = comOrigem(legendaDaLayer, 'legenda');
      else if (dominante) m = comOrigem(dominante, 'texto');
      else if (doPool) m = comOrigem(doPool, 'legenda');
      else if (L.tipo === 'eletroduto' && padrao && !padrao.conflito) m = comOrigem(padrao, 'legenda');
      medidaSeg[i] = m;
    }
  });

  // um trecho por (tipo, medida, material, origem), na ordem original
  const saida = [];
  trechos.forEach((t, ti) => {
    const L = infoLayer[ti];
    const grupos = new Map();
    for (const i of segsDoTrecho[ti]) {
      const m = medidaSeg[i];
      const k = chaveMedida(m);
      const g = grupos.get(k) || grupos.set(k, { m, segmentos: [] }).get(k);
      g.segmentos.push(segs[i].s);
    }
    for (const { m, segmentos } of grupos.values()) {
      // tipo: o do texto quando a layer não diz (INFRA, TUBULAÇÃO) ou quando a "fiação" é eletroduto
      const tipo = m && (!L.explicito || L.tipo === 'fiacao') ? m.tipo : L.tipo;
      saida.push({
        ...t, segmentos, tipo,
        material: m?.material || null, medida: m?.medida || null, secao_mm: m?.secao_mm || null, origem_medida: m?.origem || null,
        // eletrodutos em paralelo ("3xØ1\""): a medida é de cada um
        ...(m?.quantidade > 1 ? { quantidade: m.quantidade } : {}),
      });
    }
  });
  return saida;
}

module.exports = { medirTrechos, medidaDoTexto, medidaDaLayer, tipoDaLayer, RE_TEXTO_CANDIDATO, POL_PARA_MM };
