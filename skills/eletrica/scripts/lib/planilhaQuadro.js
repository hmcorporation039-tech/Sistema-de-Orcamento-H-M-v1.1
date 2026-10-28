// Planilha do QUADRO DE CARGAS com as fórmulas da NBR 5410 vivas no Excel:
// o projetista altera nome de ambiente, área, perímetro, tomadas, potências,
// comprimentos, método, agrupamento, disjuntor, seção, fatores de demanda e
// parâmetros (células AMARELAS) e o Excel recalcula previsão de cargas,
// corrente, fatores de correção, seção pelo critério de capacidade/proteção/
// queda, PE, balanceamento, demanda e alimentador (células BRANCAS = fórmula).
//
// Cada célula de fórmula leva também o valor calculado pelo motor da skill
// (abre certo mesmo em visualizador que não recalcula). O teste da skill
// recalcula a planilha num motor de fórmulas e compara com o motor JS.
//
// A seção calculada é "a menor seção da lista que atende tudo": como
// capacidade e queda melhoram sempre com a seção, conta-se quantas seções
// falham (SUMPRODUCT) — funciona em qualquer Excel, sem fórmula matricial.
const ExcelJS = require('exceljs');
const T = require('./tabelas');
const { ligacaoTue } = require('./calculo');
const CAP = require('../../dados/capacidade_conducao_cobre.json');

const ABA = {
  quadro: 'Quadro de cargas', prev: 'Previsão de cargas', tue: 'Equipamentos (TUE)', dem: 'Demanda e alimentador',
  par: 'Parâmetros', tab: 'Tabelas NBR 5410', mat: 'Materiais',
};
const ref = (aba, a1) => `'${aba}'!${a1}`;

const COR = { amarelo: 'FFFFF2CC', cabecalho: 'FF1A1A1A', ouro: 'FFC9A227', cinza: 'FFF2F2F2', borda: 'FFBFBFBF', vermelho: 'FFC00000', verde: 'FF2E7D32' };
const BORDA = { top: { style: 'thin', color: { argb: COR.borda } }, left: { style: 'thin', color: { argb: COR.borda } }, bottom: { style: 'thin', color: { argb: COR.borda } }, right: { style: 'thin', color: { argb: COR.borda } } };

const TIPO_AMB = { sala: 'Sala', dormitorio: 'Dormitório', cozinha: 'Cozinha/copa', area_servico: 'Área de serviço', banheiro: 'Banheiro', varanda: 'Varanda', garagem: 'Garagem', externa: 'Área externa', outros: 'Outros' };
const TIPO_CIRC = { iluminacao: 'Iluminação', tug: 'TUG', tue: 'TUE' };
const METODOS = ['A1', 'A2', 'B1', 'B2', 'C', 'D', 'E', 'F'];
const SISTEMAS = ['monofasico', 'bifasico', 'trifasico'];
const RESERVA_LINHAS = { ambientes: 15, tues: 10, circuitos: 12 };

// Parâmetros (aba Parâmetros, coluna B)
const PAR = { vfn: 5, vff: 6, sistema: 7, fp: 8, temp: 9, isol: 10, metodo: 11, agrup: 12, rho: 13, qTerm: 14, qAlim: 15, qTotal: 16, compAlim: 17, fdIlum: 18, fdTue: 19, esquema: 20 };
const P = (k) => ref(ABA.par, `$B$${PAR[k]}`);

// Tabelas (aba Tabelas NBR 5410)
const SECOES = T.SECOES;
const LIN_SEC0 = 5;
const LIN_SEC1 = LIN_SEC0 + SECOES.length - 1;
const CHAVES_CAP = ['PVC', 'EPR'].flatMap(iso => METODOS.flatMap(m => [2, 3].map(n => ({ iso, m, n, chave: `${iso}|${m}|${n}` }))));
const colLetra = (n) => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
const COL_CAP1 = colLetra(2 + CHAVES_CAP.length - 1);
const SEC = ref(ABA.tab, `$A$${LIN_SEC0}:$A$${LIN_SEC1}`);
// bloco "Iz para a isolação adotada": 16 colunas método|condutores (fórmula escolhe PVC ou EPR)
const CHAVES_ISO = METODOS.flatMap(m => [2, 3].map(n => `${m}|${n}`));
const COL_ISO0 = 2 + CHAVES_CAP.length + 1;
const COL_ISO = CHAVES_ISO.map((_, i) => colLetra(COL_ISO0 + i));
const CAPR = ref(ABA.tab, `$${COL_ISO[0]}$${LIN_SEC0}:$${COL_ISO.at(-1)}$${LIN_SEC1}`);
const HDR = ref(ABA.tab, `$${COL_ISO[0]}$4:$${COL_ISO.at(-1)}$4`);
const COLUNAS_ISO = COL_ISO.map(L => ref(ABA.tab, `$${L}$${LIN_SEC0}:$${L}$${LIN_SEC1}`)).join(',');
const LIN_T0 = LIN_SEC1 + 5; // 1ª linha de dados das tabelas menores
const FCT_TABS = [
  { nome: 'PVC — ar', col: 'A', dados: { 10: 1.22, 15: 1.17, 20: 1.12, 25: 1.06, 30: 1, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61, 60: 0.5 } },
  { nome: 'EPR/XLPE — ar', col: 'D', dados: { 10: 1.15, 15: 1.12, 20: 1.08, 25: 1.04, 30: 1, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71, 65: 0.65, 70: 0.58, 75: 0.5, 80: 0.41 } },
  { nome: 'PVC — solo', col: 'G', dados: { 10: 1.1, 15: 1.05, 20: 1, 25: 0.95, 30: 0.89, 35: 0.84, 40: 0.77 } },
  { nome: 'EPR/XLPE — solo', col: 'J', dados: { 10: 1.07, 15: 1.04, 20: 1, 25: 0.96, 30: 0.93, 35: 0.89, 40: 0.85 } },
];
const FCA_TAB = [[1, 1], [2, 0.8], [3, 0.7], [4, 0.65], [5, 0.6], [6, 0.57], [7, 0.54], [8, 0.52], [9, 0.5], [12, 0.45], [16, 0.41], [20, 0.38]];
const DISJ = ref(ABA.tab, `$P$${LIN_T0}:$P$${LIN_T0 + T.DISJUNTORES.length - 1}`);

const proxCol = (c, d = 1) => String.fromCharCode(c.charCodeAt(0) + d);
function lookupAcima(colT, n, valor) {
  // 1º valor da tabela ≥ valor (arredonda para cima, lado da segurança); acima do último → último
  const t = ref(ABA.tab, `$${colT}$${LIN_T0}:$${colT}$${LIN_T0 + n - 1}`), f = ref(ABA.tab, `$${proxCol(colT)}$${LIN_T0}:$${proxCol(colT)}$${LIN_T0 + n - 1}`);
  return `INDEX(${f},MIN(${n},IFERROR(MATCH(${valor}-0.000001,${t},1),0)+1))`;
}
const lk = (tab, valor) => lookupAcima(tab.col, Object.keys(tab.dados).length, valor);
const fct = (metodo) => `IF(${metodo}="D",IF(${P('isol')}="PVC",${lk(FCT_TABS[2], P('temp'))},${lk(FCT_TABS[3], P('temp'))}),IF(${P('isol')}="PVC",${lk(FCT_TABS[0], P('temp'))},${lk(FCT_TABS[1], P('temp'))}))`;
const fca = (n) => `INDEX(${ref(ABA.tab, `$N$${LIN_T0}:$N$${LIN_T0 + FCA_TAB.length - 1}`)},MATCH(MAX(1,ROUND(${n},0)),${ref(ABA.tab, `$M$${LIN_T0}:$M$${LIN_T0 + FCA_TAB.length - 1}`)},1))`;
const disjuntorPara = (ib) => `INDEX(${DISJ},IFERROR(MATCH(${ib}-0.000001,${DISJ},1),0)+1)`;
const colunaCap = (metodo, carregados) => `MATCH(${metodo}&"|"&${carregados},${HDR},0)`;
// coluna de Iz do método/condutores como intervalo (CHOOSE funciona em qualquer Excel e no LibreOffice)
const izDaColuna = (metodo, carregados) => `CHOOSE(${colunaCap(metodo, carregados)},${COLUNAS_ISO})`;
// menor seção que atende: seção ≥ mínima, Iz corrigida ≥ In e queda ≤ limite
const secaoQueAtende = ({ smin, metodo, carregados, fct: f, fca: a, inDisj, k, L, ib, v, limite }) =>
  `IFERROR(INDEX(${SEC},SUMPRODUCT(1-(${SEC}>=${smin})*(${izDaColuna(metodo, carregados)}*${f}*${a}>=${inDisj})*((${k}*${P('rho')}*${L}*${ib}*100)/(${SEC}*${v})<=${limite}))+1),"revisar")`;
const pe = (s) => `IF(${s}<=16,${s},IF(${s}<=35,16,INDEX(${SEC},MATCH(${s}/2-0.000001,${SEC},1)+1)))`;

const fx = (formula, result) => ({ formula, ...(result !== undefined ? { result } : {}) });
const r2 = (v, c = 4) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 10 ** c) / 10 ** c : v);

// ── estilos ────────────────────────────────────────────────────────────────
function cabecalho(ws, linha, titulos, larguras) {
  titulos.forEach((t, i) => {
    const c = ws.getCell(linha, i + 1);
    c.value = t;
    c.font = { bold: true, color: { argb: COR.ouro }, size: 9 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.cabecalho } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = BORDA;
    if (larguras?.[i]) ws.getColumn(i + 1).width = larguras[i];
  });
  ws.getRow(linha).height = 42;
}
function titulo(ws, texto, sub) {
  ws.getCell('A1').value = texto;
  ws.getCell('A1').font = { bold: true, size: 13 };
  ws.getCell('A2').value = sub || 'Células AMARELAS: editáveis pelo projetista. Células brancas: fórmula da NBR 5410 (recalcula sozinha). Planilha protegida sem senha (Revisão → Desproteger) para quem precisar mudar a estrutura.';
  ws.getCell('A2').font = { italic: true, size: 9, color: { argb: 'FF595959' } };
}
function entrada(c, valor, numFmt) {
  c.value = valor ?? null;
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.amarelo } };
  c.protection = { locked: false };
  c.border = BORDA;
  if (numFmt) c.numFmt = numFmt;
}
function formula(c, valor, numFmt) {
  c.value = valor;
  c.border = BORDA;
  if (numFmt) c.numFmt = numFmt;
}
const lista = (c, itens) => { c.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${itens.join(',')}"`] }; };
const avisoVermelho = (ws, ref1) => ws.addConditionalFormatting({ ref: ref1, rules: [{ type: 'containsText', operator: 'containsText', text: 'NÃO', priority: 1, style: { font: { bold: true, color: { argb: COR.vermelho } } } }, { type: 'containsText', operator: 'containsText', text: 'revisar', priority: 2, style: { font: { bold: true, color: { argb: COR.vermelho } } } }] });

// ── abas ───────────────────────────────────────────────────────────────────
function abaParametros(wb, res) {
  const c = res.calc.config;
  const ws = wb.addWorksheet(ABA.par);
  titulo(ws, 'PARÂMETROS DO PROJETO');
  cabecalho(ws, 4, ['Parâmetro', 'Valor', 'Referência / observação'], [44, 16, 80]);
  const linhas = [
    ['vfn', 'Tensão fase-neutro (V)', c.vfn, 'Tensão de fornecimento'],
    ['vff', 'Tensão fase-fase (V)', c.vff, ''],
    ['sistema', 'Sistema de alimentação', c.sistema, 'monofasico | bifasico | trifasico', SISTEMAS],
    ['fp', 'Fator de potência médio', c.fp, 'Converte VA → W na demanda'],
    ['temp', 'Temperatura ambiente (°C)', c.temperatura, 'Tabela 40 (método D: temperatura do solo)'],
    ['isol', 'Isolação dos cabos', c.isolacao === 'PVC' ? 'PVC' : 'EPR', 'PVC 70 °C | EPR (EPR/XLPE 90 °C)', ['PVC', 'EPR']],
    ['metodo', 'Método de instalação (padrão)', c.metodo, 'Tabela 33 — A1, A2, B1, B2, C, D, E, F', METODOS],
    ['agrup', 'Circuitos agrupados no pior trecho (padrão)', c.agrupamento, 'Tabela 42'],
    ['rho', 'Resistividade do cobre (Ω·mm²/m)', T.RHO_COBRE, 'Valor conservador a 70 °C'],
    ['qTerm', 'Queda máxima no circuito terminal (%)', c.quedaTerminal, '6.2.7.2: 4 %'],
    ['qAlim', 'Queda máxima no alimentador (%)', c.quedaAlimentador, 'Critério de projeto'],
    ['qTotal', 'Queda máxima total (%)', c.pontoEntrega === 'trafo' ? T.QUEDA.total_trafo : T.QUEDA.total_bt, '6.2.7.1: 5 % (entrega em BT) ou 7 % (transformador próprio)'],
    ['compAlim', 'Comprimento do alimentador (m)', c.comprimentoAlimentador, ''],
    ['fdIlum', 'Fator de demanda iluminação + TUG (fixo)', c.fdIlumTugFixo, 'Vazio = tabela por faixas da aba "Tabelas NBR 5410" (concessionária)'],
    ['fdTue', 'Fator de demanda TUE (fixo)', c.fdTueFixo, 'Vazio = tabela por quantidade da aba "Tabelas NBR 5410"'],
    ['esquema', 'Esquema de aterramento', c.esquema, 'TN-S | TN-C-S | TT (define a quantidade de DPS)', ['TN-S', 'TN-C-S', 'TT']],
  ];
  for (const [k, rot, v, obs, opcoes] of linhas) {
    const r = PAR[k];
    ws.getCell(r, 1).value = rot;
    entrada(ws.getCell(r, 2), v);
    if (opcoes) lista(ws.getCell(r, 2), opcoes);
    ws.getCell(r, 3).value = obs;
  }
  const notas = [
    'MEMÓRIA DE CÁLCULO (NBR 5410:2004)',
    'Iluminação mínima (9.5.2.1.2): 100 VA até 6 m²; acima, +60 VA a cada 4 m² inteiros.',
    'Tomadas mínimas (9.5.2.2.1): banheiro 1; cozinha e área de serviço 1 a cada 3,5 m de perímetro; sala e dormitório 1 a cada 5 m; demais 1 até 6 m², acima 1 a cada 5 m.',
    'Potência das tomadas (9.5.2.2.2): banheiro, cozinha e área de serviço 600 VA nas 3 primeiras (2, se o conjunto passar de 6) e 100 VA nas demais; outros locais 100 VA.',
    'Ib = P / V (F-N e F-F) ou P / (√3·V) (trifásico). Iz = I(tabela 36–39) × FCT (Tabela 40) × FCA (Tabela 42).',
    'Proteção (5.3.4): Ib ≤ In ≤ Iz. Seção mínima (Tabela 47): iluminação 1,5 mm², tomadas e força 2,5 mm².',
    'Queda (6.2.7): ΔV% = k·ρ·L·Ib / (S·V) × 100, k = 2 (monofásico/bifásico) ou √3 (trifásico).',
    'Seção calculada = menor seção que atende seção mínima, Iz ≥ In e queda ≤ limite. PE pela Tabela 58. Reserva do quadro pela Tabela 59.',
    'Demanda: a NBR 5410 não define fatores (4.2.3) — usar os da distribuidora (no DF, Neoenergia DIS-NOR-030/053). [CONFERIR]',
  ];
  notas.forEach((t, i) => { const c1 = ws.getCell(PAR.esquema + 2 + i, 1); c1.value = t; c1.font = i === 0 ? { bold: true } : { size: 9 }; });
  return ws;
}

function abaTabelas(wb, res) {
  const c = res.calc.config;
  const ws = wb.addWorksheet(ABA.tab);
  titulo(ws, 'TABELAS DA NBR 5410 USADAS NAS FÓRMULAS', 'Capacidades de condução (cobre), fatores de correção e disjuntores — não editar. Fatores de demanda (amarelo) são da concessionária e podem ser trocados.');
  // capacidade de condução: chave isolação|método|condutores carregados
  ws.getCell(3, 1).value = 'Seção (mm²)';
  ws.getCell(4, 1).value = 'chave →';
  CHAVES_CAP.forEach((k, i) => {
    const col = 2 + i;
    ws.getCell(3, col).value = `${k.iso} ${k.m} ${k.n}c`;
    ws.getCell(4, col).value = k.chave;
    ws.getColumn(col).width = 9;
  });
  [3, 4].forEach(l => ws.getRow(l).eachCell(x => { x.font = { bold: true, size: 8, color: { argb: COR.ouro } }; x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.cabecalho } }; }));
  const colAD = { A1: [0, 1], A2: [2, 3], B1: [4, 5], B2: [6, 7], C: [8, 9], D: [10, 11] };
  const colEF = { E: [0, 1], F: [2, 3] }; // F 3 condutores: trifólio (mesma coluna do motor, tabelas.js)
  SECOES.forEach((s, i) => {
    const r = LIN_SEC0 + i;
    ws.getCell(r, 1).value = s;
    CHAVES_CAP.forEach((k, j) => {
      const tab = colAD[k.m] ? CAP[k.iso === 'PVC' ? 'PVC_A_D' : 'EPR_A_D'] : CAP[k.iso === 'PVC' ? 'PVC_E_G' : 'EPR_E_G'];
      const idx = (colAD[k.m] || colEF[k.m])[k.n === 3 ? 1 : 0];
      ws.getCell(r, 2 + j).value = tab[s][idx];
    });
    // Iz para a isolação adotada (aba Parâmetros)
    CHAVES_ISO.forEach((k, j) => {
      const iPvc = CHAVES_CAP.findIndex(x => x.chave === `PVC|${k}`), iEpr = CHAVES_CAP.findIndex(x => x.chave === `EPR|${k}`);
      const pvc = ws.getCell(r, 2 + iPvc).value, epr = ws.getCell(r, 2 + iEpr).value;
      ws.getCell(r, COL_ISO0 + j).value = fx(`IF(${P('isol')}="PVC",${colLetra(2 + iPvc)}${r},${colLetra(2 + iEpr)}${r})`, c.isolacao === 'PVC' ? pvc : epr);
    });
  });
  CHAVES_ISO.forEach((k, j) => {
    const col = COL_ISO0 + j;
    ws.getCell(3, col).value = `Adotada ${k.replace('|', ' ')}c`;
    ws.getCell(4, col).value = k;
    ws.getColumn(col).width = 9;
    [3, 4].forEach(l => { const x = ws.getCell(l, col); x.font = { bold: true, size: 8, color: { argb: COR.cabecalho } }; x.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.ouro } }; });
  });
  ws.getCell(2, COL_ISO0).value = 'Iz (A) para a isolação adotada em Parâmetros — usada pelas fórmulas';
  ws.getCell(2, COL_ISO0).font = { bold: true, size: 9 };
  ws.getColumn(1).width = 12;
  // tabelas menores, lado a lado
  const t0 = LIN_T0;
  const blocoTitulo = (col, texto, sub1, sub2) => {
    ws.getCell(t0 - 2, col).value = texto; ws.getCell(t0 - 2, col).font = { bold: true, size: 9 };
    ws.getCell(t0 - 1, col).value = sub1; ws.getCell(t0 - 1, col + 1).value = sub2;
    [col, col + 1].forEach(x => { ws.getCell(t0 - 1, x).font = { bold: true, size: 8 }; });
  };
  FCT_TABS.forEach(tb => {
    const col = tb.col.charCodeAt(0) - 64;
    blocoTitulo(col, `Tabela 40 — FCT ${tb.nome}`, '°C', 'FCT');
    Object.entries(tb.dados).forEach(([t, f], i) => { ws.getCell(t0 + i, col).value = Number(t); ws.getCell(t0 + i, col + 1).value = f; });
  });
  blocoTitulo(13, 'Tabela 42 — FCA (a partir de n circuitos)', 'n ≥', 'FCA');
  FCA_TAB.forEach(([n, f], i) => { ws.getCell(t0 + i, 13).value = n; ws.getCell(t0 + i, 14).value = f; });
  ws.getCell(t0 - 2, 16).value = 'Disjuntores (A)'; ws.getCell(t0 - 2, 16).font = { bold: true, size: 9 };
  T.DISJUNTORES.forEach((d, i) => { ws.getCell(t0 + i, 16).value = d; });
  blocoTitulo(18, 'Demanda ilum. + TUG (concessionária)', 'até kW', 'fator');
  c.fdIlumTug.forEach((l, i) => { entrada(ws.getCell(t0 + i, 18), Number(l.ate_kw)); entrada(ws.getCell(t0 + i, 19), Number(l.fator)); });
  blocoTitulo(21, 'Demanda TUE por quantidade', 'até n', 'fator');
  c.fdTue.forEach((l, i) => { entrada(ws.getCell(t0 + i, 21), Number(l.ate_qtd)); entrada(ws.getCell(t0 + i, 22), Number(l.fator)); });
  [13, 14, 16, 18, 19, 21, 22].forEach(x => { ws.getColumn(x).width = Math.max(ws.getColumn(x).width || 9, 9); });
  return {
    ws,
    fdIlum: { ate: ref(ABA.tab, `$R$${t0}:$R$${t0 + c.fdIlumTug.length - 1}`), f: ref(ABA.tab, `$S$${t0}:$S$${t0 + c.fdIlumTug.length - 1}`), n: c.fdIlumTug.length },
    fdTue: { ate: ref(ABA.tab, `$U$${t0}:$U$${t0 + c.fdTue.length - 1}`), f: ref(ABA.tab, `$V$${t0}:$V$${t0 + c.fdTue.length - 1}`), n: c.fdTue.length },
  };
}

function abaPrevisao(wb, res) {
  const prev = res.calc.previsao;
  const ws = wb.addWorksheet(ABA.prev);
  titulo(ws, 'PREVISÃO DE CARGAS POR AMBIENTE (NBR 5410, 9.5.2)');
  cabecalho(ws, 4, ['Ambiente', 'Tipo', 'Área (m²)', 'Perímetro (m)', 'Iluminação mínima (VA)', 'Iluminação adotada (VA)', 'Tomadas mínimas', 'Tomadas extras', 'Total de tomadas', 'TUG mínima (VA)', 'TUG adotada (VA)', 'Observação', 'Circuito de iluminação', 'Circuito de TUG'],
    [26, 16, 10, 11, 12, 12, 10, 9, 10, 11, 11, 30, 11, 11]);
  // ambiente → circuito (o projetista troca o número para mudar o ambiente de circuito)
  const circDe = (nome, tipo) => res.calc.circuitos.find(c => c.tipo === tipo && (c.ambientes || []).includes(nome))?.id ?? null;
  const n = prev.length + RESERVA_LINHAS.ambientes;
  const ult = 4 + n;
  const tipos600 = ['Banheiro', 'Cozinha/copa', 'Área de serviço'];
  // 9.5.2.2.2 a): 3 tomadas de 600 VA por local (2 se o conjunto desses locais passar de 6)
  ws.getCell('N2').value = 'Tomadas de 600 VA por local (9.5.2.2.2 a)';
  ws.getCell('N2').font = { size: 9, bold: true };
  const total600 = prev.filter(a => T.LOCAIS_600VA.includes(a.tipo)).reduce((s, a) => s + a.nTug, 0);
  formula(ws.getCell('O2'), fx(`IF(SUMPRODUCT(((B5:B${ult}="Banheiro")+(B5:B${ult}="Cozinha/copa")+(B5:B${ult}="Área de serviço"))*I5:I${ult})>6,2,3)`, total600 > 6 ? 2 : 3));
  const Z = '#,##0;-#,##0;;@'; // zero não aparece nas linhas de reserva
  for (let i = 0; i < n; i++) {
    const r = 5 + i;
    const a = prev[i];
    const vazio = (expr) => `IF($A${r}="",0,${expr})`;
    entrada(ws.getCell(r, 1), a?.nome);
    entrada(ws.getCell(r, 2), a ? TIPO_AMB[a.tipo] || 'Outros' : null); lista(ws.getCell(r, 2), Object.values(TIPO_AMB));
    entrada(ws.getCell(r, 3), a ? Number(a.area_m2) || 0 : null, '0.00');
    entrada(ws.getCell(r, 4), a ? Number(a.perimetro_m) || 0 : null, '0.00');
    formula(ws.getCell(r, 5), fx(vazio(`IF(C${r}<=6,100,100+60*INT((C${r}-6)/4))`), a ? a.iluminacaoMin : 0), Z);
    entrada(ws.getCell(r, 6), a && a.iluminacao !== a.iluminacaoMin ? a.iluminacao : fx(`E${r}`, a ? a.iluminacaoMin : 0), Z);
    formula(ws.getCell(r, 7), fx(vazio(`IF(B${r}="Banheiro",1,IF(OR(B${r}="Cozinha/copa",B${r}="Área de serviço"),MAX(1,ROUNDUP(D${r}/3.5,0)),IF(B${r}="Varanda",1,IF(OR(B${r}="Sala",B${r}="Dormitório"),MAX(1,ROUNDUP(D${r}/5,0)),IF(C${r}<=6,1,MAX(1,ROUNDUP(D${r}/5,0)))))))`), a ? a.nTugMin : 0), Z);
    entrada(ws.getCell(r, 8), a ? Number(a.tugs_adicionais) || 0 : null, Z);
    formula(ws.getCell(r, 9), fx(vazio(`G${r}+IF(ISNUMBER(H${r}),H${r},0)`), a ? a.nTug : 0), Z);
    formula(ws.getCell(r, 10), fx(vazio(`IF(OR(B${r}="${tipos600[0]}",B${r}="${tipos600[1]}",B${r}="${tipos600[2]}"),MIN(I${r},$O$2)*600+MAX(0,I${r}-$O$2)*100,I${r}*100)`), a ? a.tugVaMin : 0), Z);
    entrada(ws.getCell(r, 11), a && a.tugVa !== a.tugVaMin ? a.tugVa : fx(`J${r}`, a ? a.tugVaMin : 0), Z);
    entrada(ws.getCell(r, 12), null);
    entrada(ws.getCell(r, 13), a ? circDe(a.nome, 'iluminacao') : null);
    entrada(ws.getCell(r, 14), a ? circDe(a.nome, 'tug') : null);
  }
  const rt = ult + 1;
  ws.getCell(rt, 1).value = 'TOTAL';
  ws.getCell(rt, 1).font = { bold: true };
  [6, 9, 11].forEach(col => {
    const L = colLetra(col);
    formula(ws.getCell(rt, col), fx(`SUM(${L}5:${L}${ult})`, col === 6 ? prev.reduce((s, a) => s + a.iluminacao, 0) : col === 9 ? prev.reduce((s, a) => s + a.nTug, 0) : prev.reduce((s, a) => s + a.tugVa, 0)), '#,##0');
    ws.getCell(rt, col).font = { bold: true };
  });
  ws.views = [{ state: 'frozen', ySplit: 4, xSplit: 1 }];
  ws.getCell(rt + 2, 1).value = 'As colunas "Circuito de iluminação" e "Circuito de TUG" ligam o ambiente ao circuito do quadro: a potência do circuito é a soma dos ambientes ligados a ele.';
  ws.getCell(rt + 2, 1).font = { italic: true, size: 9 };
  return {
    ws,
    circIlum: ref(ABA.prev, `$M$5:$M$${ult}`), circTug: ref(ABA.prev, `$N$5:$N$${ult}`),
    ilum: ref(ABA.prev, `$F$5:$F$${ult}`), tug: ref(ABA.prev, `$K$5:$K$${ult}`),
  };
}

function abaTues(wb, res) {
  const tues = res.calc.previsao.flatMap(a => a.tues.map(t => ({ ...t, ambiente: a.nome })));
  const ws = wb.addWorksheet(ABA.tue);
  titulo(ws, 'EQUIPAMENTOS DE USO ESPECÍFICO (TUE)');
  cabecalho(ws, 4, ['Ambiente', 'Equipamento', 'Potência (W)', 'FP', 'Potência (VA)', 'Ligação'], [24, 34, 12, 8, 13, 9]);
  const n = tues.length + RESERVA_LINHAS.tues;
  for (let i = 0; i < n; i++) {
    const r = 5 + i;
    const t = tues[i];
    entrada(ws.getCell(r, 1), t?.ambiente);
    entrada(ws.getCell(r, 2), t?.descricao);
    entrada(ws.getCell(r, 3), t ? Number(t.potencia_w) : null, '#,##0');
    entrada(ws.getCell(r, 4), t ? Number(t.fp) || 1 : null, '0.00');
    formula(ws.getCell(r, 5), fx(`IF(ISNUMBER(C${r}),C${r}/IF(AND(ISNUMBER(D${r}),D${r}<>0),D${r},1),0)`, t ? Number(t.potencia_w) / (Number(t.fp) || 1) : 0), '#,##0;-#,##0;;@');
    entrada(ws.getCell(r, 6), t ? t.ligacao || ligacaoTue(t.potencia_w, res.calc.config) : null); lista(ws.getCell(r, 6), ['FN', 'FF', 'FFF']);
  }
  ws.views = [{ state: 'frozen', ySplit: 4 }];
  return { ws, linhaDe: (k) => 5 + k };
}

function abaQuadro(wb, res, prev, tue) {
  const { calc } = res;
  const circ = calc.circuitos;
  const ws = wb.addWorksheet(ABA.quadro);
  titulo(ws, `QUADRO DE CARGAS — ${res.dados.obra?.nome || res.dados.cliente?.nome || 'Obra'}`);
  const titulos = ['Circ.', 'Descrição', 'Ambientes atendidos', 'Tipo', 'Ligação', 'Fases', 'Potência (VA)', 'FP', 'Potência (W)', 'Tensão (V)', 'Ib (A)', 'Compr. (m)', 'Método', 'Circ. agrupados', 'Cond. carregados', 'FCT', 'FCA',
    'Seção mín. (mm²)', 'Disjuntor In (A)', 'Seção calculada (mm²)', 'Seção adotada (mm²)', 'Iz tabela (A)', 'Iz corrigida (A)', 'Proteção Ib ≤ In ≤ Iz', 'Queda (%)', 'Queda ≤ limite', 'Neutro (mm²)', 'PE (mm²)', 'DR 30 mA', 'Observação'];
  cabecalho(ws, 4, titulos, [6, 38, 26, 10, 8, 7, 10, 6, 10, 8, 8, 8, 8, 8, 8, 7, 7, 8, 9, 10, 10, 9, 9, 12, 8, 10, 8, 8, 8, 30]);
  const n = circ.length + RESERVA_LINHAS.circuitos;
  const ult = 4 + n;
  let kTue = 0;
  for (let i = 0; i < n; i++) {
    const r = 5 + i;
    const x = circ[i];
    const vz = (expr) => `IF($A${r}="","",${expr})`;
    entrada(ws.getCell(r, 1), x?.id);
    entrada(ws.getCell(r, 2), x?.descricao);
    entrada(ws.getCell(r, 3), x ? (x.ambientes || []).join(', ') : null);
    entrada(ws.getCell(r, 4), x ? TIPO_CIRC[x.tipo] || x.tipo : null); lista(ws.getCell(r, 4), Object.values(TIPO_CIRC));
    entrada(ws.getCell(r, 5), x?.ligacao); lista(ws.getCell(r, 5), ['FN', 'FF', 'FFF']);
    entrada(ws.getCell(r, 6), x?.fases);
    // potência: circuito sugerido acompanha a previsão (soma dos ambientes ligados a ele) ou o equipamento
    let pot = x ? r2(x.potencia_va, 2) : null;
    if (x?.sugerido && x.tipo === 'iluminacao') pot = fx(`SUMIF(${prev.circIlum},$A${r},${prev.ilum})`, r2(x.potencia_va, 2));
    else if (x?.sugerido && x.tipo === 'tug') pot = fx(`SUMIF(${prev.circTug},$A${r},${prev.tug})`, r2(x.potencia_va, 2));
    else if (x?.sugerido && x.tipo === 'tue') pot = fx(`ROUND(${ref(ABA.tue, `$E$${tue.linhaDe(kTue++)}`)},0)`, r2(x.potencia_va, 2));
    entrada(ws.getCell(r, 7), pot, '#,##0');
    entrada(ws.getCell(r, 8), x && x.tipo === 'tue' ? r2(x.fp, 2) : fx(vz(P('fp')), x ? calc.config.fp : ''), '0.00');
    formula(ws.getCell(r, 9), fx(vz(`G${r}*H${r}`), x ? r2(x.potencia_va * (x.tipo === 'tue' ? x.fp : calc.config.fp), 1) : ''), '#,##0');
    formula(ws.getCell(r, 10), fx(vz(`IF(E${r}="FN",${P('vfn')},${P('vff')})`), x ? x.tensao : ''));
    formula(ws.getCell(r, 11), fx(vz(`IF(E${r}="FFF",G${r}/(SQRT(3)*J${r}),G${r}/J${r})`), x ? r2(x.ib) : ''), '0.00');
    entrada(ws.getCell(r, 12), x ? x.comprimento : null, '0.0');
    entrada(ws.getCell(r, 13), x && x.metodo !== calc.config.metodo ? x.metodo : fx(vz(P('metodo')), x ? x.metodo : '')); lista(ws.getCell(r, 13), METODOS);
    entrada(ws.getCell(r, 14), x && x.agrupamento != null && Number(x.agrupamento) !== calc.config.agrupamento ? Number(x.agrupamento) : fx(vz(P('agrup')), x ? calc.config.agrupamento : ''));
    formula(ws.getCell(r, 15), fx(vz(`IF(E${r}="FFF",3,2)`), x ? x.carregados : ''));
    formula(ws.getCell(r, 16), fx(vz(fct(`M${r}`)), x ? x.fct : ''), '0.00');
    formula(ws.getCell(r, 17), fx(vz(fca(`N${r}`)), x ? x.fca : ''), '0.00');
    const sminPadrao = x ? (x.tipo === 'iluminacao' ? T.SECAO_MINIMA.iluminacao : T.SECAO_MINIMA.tug) : null;
    entrada(ws.getCell(r, 18), x && x.secaoMinima !== sminPadrao ? x.secaoMinima : fx(vz(`IF(D${r}="Iluminação",${T.SECAO_MINIMA.iluminacao},${T.SECAO_MINIMA.tug})`), x ? sminPadrao : ''));
    entrada(ws.getCell(r, 19), x?.disjuntorFixo ? x.disjuntor : fx(vz(disjuntorPara(`K${r}`)), x ? x.disjuntor : ''));
    formula(ws.getCell(r, 20), fx(vz(secaoQueAtende({ smin: `R${r}`, metodo: `M${r}`, carregados: `O${r}`, fct: `P${r}`, fca: `Q${r}`, inDisj: `S${r}`, k: `IF(E${r}="FFF",SQRT(3),2)`, L: `L${r}`, ib: `K${r}`, v: `J${r}`, limite: P('qTerm') })), x && !x.secaoFixa ? x.secao : ''));
    entrada(ws.getCell(r, 21), x?.secaoFixa ? x.secao : fx(`T${r}`, x ? x.secao : ''));
    formula(ws.getCell(r, 22), fx(`IF(ISNUMBER(U${r}),IFERROR(INDEX(${CAPR},MATCH(U${r},${SEC},0),${colunaCap(`M${r}`, `O${r}`)}),"—"),"")`, x ? x.izRef : ''));
    formula(ws.getCell(r, 23), fx(`IF(ISNUMBER(V${r}),V${r}*P${r}*Q${r},"")`, x ? r2(x.iz) : ''), '0.0');
    formula(ws.getCell(r, 24), fx(`IF(ISNUMBER(W${r}),IF(AND(K${r}<=S${r},S${r}<=W${r},U${r}>=R${r}),"OK","NÃO ATENDE"),IF($A${r}="","","NÃO ATENDE"))`, x ? (x.ib <= x.disjuntor && x.disjuntor <= x.iz && x.secao >= x.secaoMinima ? 'OK' : 'NÃO ATENDE') : ''));
    formula(ws.getCell(r, 25), fx(`IF(ISNUMBER(U${r}),IF(E${r}="FFF",SQRT(3),2)*${P('rho')}*L${r}*K${r}/(U${r}*J${r})*100,"")`, x ? r2(x.queda) : ''), '0.00');
    formula(ws.getCell(r, 26), fx(`IF(ISNUMBER(Y${r}),IF(Y${r}<=${P('qTerm')},"OK","NÃO ATENDE"),"")`, x ? (x.queda <= calc.config.quedaTerminal + 1e-9 ? 'OK' : 'NÃO ATENDE') : ''));
    formula(ws.getCell(r, 27), fx(`IF(ISNUMBER(U${r}),IF(E${r}="FF","—",U${r}),"")`, x ? (x.ligacao === 'FF' ? '—' : x.secao) : ''));
    formula(ws.getCell(r, 28), fx(`IF(ISNUMBER(U${r}),${pe(`U${r}`)},"")`, x ? x.secaoPE : ''));
    entrada(ws.getCell(r, 29), x ? (x.dr ? 'sim' : 'não') : null); lista(ws.getCell(r, 29), ['sim', 'não']);
    entrada(ws.getCell(r, 30), x ? `${x.criterio}${x.drObrigatorio ? ' · DR obrigatório (5.1.3.2.2)' : ''}` : null);
  }
  avisoVermelho(ws, `T5:Z${ult}`);
  // totais e cargas por fase
  const rt = ult + 1;
  ws.getCell(rt, 2).value = 'TOTAL INSTALADO';
  ws.getCell(rt, 2).font = { bold: true };
  formula(ws.getCell(rt, 7), fx(`SUM(G5:G${ult})`, r2(calc.demanda.instaladaVa, 1)), '#,##0');
  formula(ws.getCell(rt, 9), fx(`SUM(I5:I${ult})`), '#,##0');
  ws.getCell(rt, 7).font = { bold: true };
  const F = `$F$5:$F$${ult}`, G = `$G$5:$G$${ult}`;
  const fase = (f) => {
    const pares = { A: ['AB', 'AC', 'BA', 'CA'], B: ['AB', 'BC', 'BA', 'CB'], C: ['AC', 'BC', 'CA', 'CB'] }[f];
    return `SUMIF(${F},"${f}",${G})+(${pares.map(p => `SUMIF(${F},"${p}",${G})`).join('+')})/2+SUMIF(${F},"ABC",${G})/3`;
  };
  const r0 = rt + 2;
  ws.getCell(r0, 2).value = 'CARGA POR FASE (VA)';
  ws.getCell(r0, 2).font = { bold: true };
  ['A', 'B', 'C'].forEach((f, i) => {
    ws.getCell(r0 + 1 + i, 2).value = `Fase ${f}`;
    formula(ws.getCell(r0 + 1 + i, 7), fx(fase(f), r2(calc.fases.carga[f] ?? 0, 1)), '#,##0');
  });
  // corrente por fase = soma das correntes (Ib) dos circuitos ligados à fase — o alimentador sai da maior
  const K = `$K$5:$K$${ult}`;
  ws.getCell(r0, 11).value = 'Corrente (A)';
  ws.getCell(r0, 11).font = { bold: true };
  ['A', 'B', 'C'].forEach((f, i) => {
    formula(ws.getCell(r0 + 1 + i, 11), fx(`SUMIF(${F},"*${f}*",${K})`, r2(calc.fases.corrente[f] ?? 0)), '0.00');
  });
  ws.getCell(r0 + 4, 2).value = 'Desequilíbrio entre fases (≤ 20 % recomendado)';
  const a = `G${r0 + 1}`, b = `G${r0 + 2}`, c3 = `G${r0 + 3}`;
  formula(ws.getCell(r0 + 4, 7), fx(`IF(${P('sistema')}="monofasico",0,IF(${P('sistema')}="bifasico",IF(MAX(${a},${b})=0,0,(MAX(${a},${b})-MIN(${a},${b}))/MAX(${a},${b})),IF(MAX(${a},${b},${c3})=0,0,(MAX(${a},${b},${c3})-MIN(${a},${b},${c3}))/MAX(${a},${b},${c3}))))`, r2(calc.fases.desequilibrio)), '0.0%');
  ws.getCell(r0 + 6, 2).value = 'Fases: A, B, C (F-N), AB, BC, AC (F-F) ou ABC (trifásico). Circuito novo: preencha Circ., descrição, tipo, ligação, fases, potência e comprimento numa linha amarela vazia.';
  ws.getCell(r0 + 6, 2).font = { italic: true, size: 9 };
  ws.views = [{ state: 'frozen', ySplit: 4, xSplit: 2 }];
  return {
    ws, ult,
    col: (L) => ref(ABA.quadro, `$${L}$5:$${L}$${ult}`),
    correntes: ['A', 'B', 'C'].map((_, i) => ref(ABA.quadro, `$K$${r0 + 1 + i}`)),
  };
}

function abaDemanda(wb, res, q, tab) {
  const { calc } = res;
  const c = calc.config;
  const d = calc.demanda;
  const al = calc.alimentador;
  const ws = wb.addWorksheet(ABA.dem);
  titulo(ws, 'DEMANDA, ALIMENTADOR E QUADRO');
  cabecalho(ws, 4, ['Item', 'Valor', 'Fórmula / referência'], [52, 16, 80]);
  const tipo = q.col('D'), pot = q.col('G'), quedas = q.col('Y'), ids = q.col('A');
  let r = 5;
  const L = {};
  const linha = (k, rotulo, valor, obs, { fmt, editavel, negrito } = {}) => {
    L[k] = r;
    ws.getCell(r, 1).value = rotulo;
    if (negrito) ws.getCell(r, 1).font = { bold: true };
    (editavel ? entrada : formula)(ws.getCell(r, 2), valor, fmt);
    ws.getCell(r, 3).value = obs || '';
    r++;
  };
  const B = (k) => `$B$${L[k]}`;
  const secao = (t) => { ws.getCell(r, 1).value = t; ws.getCell(r, 1).font = { bold: true, color: { argb: COR.ouro } }; ws.getCell(r, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR.cabecalho } }; r++; };
  secao('DEMANDA (fatores da concessionária — a NBR 5410 não define, 4.2.3)');
  linha('ilumVa', 'Potência instalada de iluminação + TUG (VA)', fx(`SUMIF(${tipo},"<>TUE",${pot})`, r2(d.ilumTugVa, 1)), 'Soma dos circuitos de iluminação e TUG do quadro', { fmt: '#,##0' });
  linha('ilumKw', 'Idem (kW)', fx(`${B('ilumVa')}*${P('fp')}/1000`, r2(d.ilumTugVa * c.fp / 1000)), '× FP médio', { fmt: '0.00' });
  linha('fd1', 'Fator de demanda iluminação + TUG', fx(`IF(ISNUMBER(${P('fdIlum')}),${P('fdIlum')},INDEX(${tab.fdIlum.f},MIN(${tab.fdIlum.n},IFERROR(MATCH(${B('ilumKw')}-0.000001,${tab.fdIlum.ate},1),0)+1)))`, d.fdIlumTug), 'Fixo da aba Parâmetros ou faixa da tabela da concessionária', { fmt: '0.00' });
  linha('tueVa', 'Potência instalada de TUE (VA)', fx(`SUMIF(${tipo},"TUE",${pot})`, r2(d.tueVa, 1)), '', { fmt: '#,##0' });
  linha('nTue', 'Quantidade de TUE', fx(`COUNTIF(${tipo},"TUE")`, d.nTue), '');
  linha('fd2', 'Fator de demanda TUE', fx(`IF(ISNUMBER(${P('fdTue')}),${P('fdTue')},INDEX(${tab.fdTue.f},MIN(${tab.fdTue.n},IFERROR(MATCH(${B('nTue')}-0.000001,${tab.fdTue.ate},1),0)+1)))`, d.fdTue), 'Fixo da aba Parâmetros ou tabela por quantidade', { fmt: '0.00' });
  linha('demVa', 'DEMANDA (VA)', fx(`${B('ilumVa')}*${B('fd1')}+${B('tueVa')}*${B('fd2')}`, r2(d.demandaVa, 1)), 'Ilum. + TUG × FD + TUE × FD', { fmt: '#,##0', negrito: true });
  linha('demKw', 'DEMANDA (kW)', fx(`${B('demVa')}*${P('fp')}/1000`, r2(d.demandaKw)), '', { fmt: '0.00', negrito: true });
  r++;
  secao('ALIMENTADOR DO QUADRO');
  const tri = `${P('sistema')}="trifasico"`, mono = `${P('sistema')}="monofasico"`;
  linha('lig', 'Ligação', fx(`IF(${tri},"FFF",IF(${P('sistema')}="bifasico","FF+N","FN"))`, c.sistema === 'trifasico' ? 'FFF' : c.sistema === 'bifasico' ? 'FF+N' : 'FN'), '');
  linha('fdg', 'Fator de demanda global (demanda ÷ instalada)', fx(`IFERROR(${B('demVa')}/(${B('ilumVa')}+${B('tueVa')}),0)`, r2(al.fd, 6)), 'Aplicado à corrente da fase mais carregada', { fmt: '0.0000' });
  linha('ifase', 'Maior corrente de fase instalada (A)', fx(`MAX(${q.correntes.join(',')})`, r2(al.iFaseMax)), 'Aba Quadro de cargas: soma das Ib dos circuitos de cada fase', { fmt: '0.00' });
  linha('ib', 'Corrente de projeto Ib (A)', fx(`${B('ifase')}*${B('fdg')}`, r2(al.ib)), 'Maior corrente de fase × FD global (carga desequilibrada: não dividir a demanda pelas fases)', { fmt: '0.00' });
  linha('L', 'Comprimento (m)', fx(P('compAlim'), al.comprimento), 'Aba Parâmetros', { fmt: '0.0' });
  linha('met', 'Método de instalação', fx(P('metodo'), al.metodo), 'Editável', { editavel: true });
  ws.getCell(L.met, 2).dataValidation = { type: 'list', allowBlank: false, formulae: [`"${METODOS.join(',')}"`] };
  linha('carr', 'Condutores carregados (Tabela 46)', fx(`IF(${mono},2,3)`, al.carregados), '');
  linha('fct', 'FCT (Tabela 40)', fx(fct(B('met')), al.fct), '', { fmt: '0.00' });
  linha('fca', 'FCA (Tabela 42)', 1, 'Alimentador sozinho no trecho = 1 (editável)', { editavel: true, fmt: '0.00' });
  linha('smin', 'Seção mínima (mm²)', T.SECAO_MINIMA.alimentador, 'Editável', { editavel: true });
  linha('in', 'Disjuntor geral In (A)', fx(disjuntorPara(B('ib')), al.disjuntor), 'Menor disjuntor ≥ Ib (editável — seletividade, padrão de entrada)', { editavel: true });
  linha('lim', 'Limite de queda no alimentador (%)', fx(`IF(${P('qTotal')}-MAX(${quedas})<0.5,${P('qAlim')},MIN(${P('qAlim')},${P('qTotal')}-MAX(${quedas})))`, r2(al.limiteQueda)), 'Menor entre o critério do alimentador e (total − maior queda terminal); com folga < 0,5 % o circuito terminal é que deve ser aumentado', { fmt: '0.00' });
  const k = `IF(${tri},SQRT(3),2)`, v = `IF(${mono},${P('vfn')},${P('vff')})`;
  linha('scalc', 'Seção calculada (mm²)', fx(secaoQueAtende({ smin: B('smin'), metodo: B('met'), carregados: B('carr'), fct: B('fct'), fca: B('fca'), inDisj: B('in'), k, L: B('L'), ib: B('ib'), v, limite: B('lim') }), al.secao), 'Menor seção que atende mínima, Iz ≥ In e queda');
  linha('sad', 'Seção adotada (mm²)', fx(B('scalc'), al.secao), 'Editável', { editavel: true });
  linha('iz', 'Iz corrigida (A)', fx(`IFERROR(INDEX(${CAPR},MATCH(${B('sad')},${SEC},0),${colunaCap(B('met'), B('carr'))})*${B('fct')}*${B('fca')},"—")`, r2(al.iz)), '', { fmt: '0.0' });
  linha('prot', 'Proteção Ib ≤ In ≤ Iz', fx(`IF(AND(${B('ib')}<=${B('in')},${B('in')}<=${B('iz')}),"OK","NÃO ATENDE")`, 'OK'), '5.3.4');
  linha('queda', 'Queda no alimentador (%)', fx(`${k}*${P('rho')}*${B('L')}*${B('ib')}/(${B('sad')}*${v})*100`, r2(al.queda)), '', { fmt: '0.00' });
  linha('qtot', 'Queda total até o circuito mais desfavorável (%)', fx(`${B('queda')}+MAX(${quedas})`, r2(calc.quedaTotal)), '', { fmt: '0.00' });
  linha('qok', 'Queda total ≤ limite', fx(`IF(${B('qtot')}<=${P('qTotal')},"OK","NÃO ATENDE")`, calc.quedaTotal <= (c.pontoEntrega === 'trafo' ? 7 : 5) ? 'OK' : 'NÃO ATENDE'), '6.2.7.1');
  linha('pe', 'Condutor de proteção PE (mm²)', fx(pe(B('sad')), al.secaoPE), 'Tabela 58');
  r++;
  secao('QUADRO DE DISTRIBUIÇÃO');
  linha('nc', 'Circuitos', fx(`COUNTIF(${ids},"?*")+COUNT(${ids})`, calc.quadro.circuitos), '');
  linha('res', 'Reserva mínima (Tabela 59)', fx(`IF(${B('nc')}<=6,2,IF(${B('nc')}<=12,3,IF(${B('nc')}<=30,4,ROUNDUP(0.15*${B('nc')},0))))`, calc.quadro.reserva), 'até 6 → 2; 7 a 12 → 3; 13 a 30 → 4; acima de 30 → 15 %');
  linha('dps', 'DPS classe II (unidades)', fx(`IF(${tri},3,IF(${P('sistema')}="bifasico",2,1))+IF(OR(${P('esquema')}="TT",${P('esquema')}="TN-S"),1,0)`, calc.quadro.dpsQtd), `Uc ≥ ${calc.quadro.dpsUc} V (Tabela 49), In ≥ 20 kA`);
  avisoVermelho(ws, `B5:B${r}`);
  return ws;
}

function abaMateriais(wb, res) {
  const ws = wb.addWorksheet(ABA.mat);
  titulo(ws, 'LISTA DE MATERIAIS (preliminar — calculada pelo sistema)', 'Quantidades do dimensionamento do sistema (não acompanham edições do quadro). Preço unitário editável; total por fórmula.');
  cabecalho(ws, 4, ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Preço unit. (R$)', 'Total (R$)', 'Referência'], [10, 70, 6, 9, 14, 14, 34]);
  const m = res.calc.materiais;
  m.forEach((it, i) => {
    const r = 5 + i;
    ws.getCell(r, 1).value = it.codigo; ws.getCell(r, 2).value = it.descricao; ws.getCell(r, 3).value = it.unidade;
    entrada(ws.getCell(r, 4), it.quantidade);
    entrada(ws.getCell(r, 5), null, '#,##0.00');
    formula(ws.getCell(r, 6), fx(`IF(E${r}="","",D${r}*E${r})`, ''), '#,##0.00');
    ws.getCell(r, 7).value = it.referencia;
  });
  const rt = 5 + m.length;
  ws.getCell(rt, 2).value = 'TOTAL'; ws.getCell(rt, 2).font = { bold: true };
  formula(ws.getCell(rt, 6), fx(`SUM(F5:F${rt - 1})`, 0), '#,##0.00');
  return ws;
}

// res = processar(dados) da skill de elétrica → buffer .xlsx
async function gerarPlanilhaQuadro(res) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'H&M Engenharia e Tecnologia LTDA';
  wb.calcProperties = { fullCalcOnLoad: true };
  // ordem das abas: o quadro primeiro (as referências entre abas não dependem da ordem)
  const nomes = [ABA.quadro, ABA.prev, ABA.tue, ABA.dem, ABA.par, ABA.tab, ABA.mat];
  const criadas = {};
  const original = wb.addWorksheet.bind(wb);
  nomes.forEach(n => { criadas[n] = original(n); });
  wb.addWorksheet = (n) => criadas[n];
  abaParametros(wb, res);
  const tab = abaTabelas(wb, res);
  const prev = abaPrevisao(wb, res);
  const tue = abaTues(wb, res);
  const q = abaQuadro(wb, res, prev, tue);
  abaDemanda(wb, res, q, tab);
  abaMateriais(wb, res);
  wb.addWorksheet = original;
  for (const ws of wb.worksheets) {
    ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
    await ws.protect('', { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true, formatRows: true, formatCells: true });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

module.exports = { gerarPlanilhaQuadro, ABA };
