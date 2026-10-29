// Classificação de PRANCHA: o que há em cada folha (página do PDF ou desenho
// do DXF) e em cada REGIÃO dela — planta baixa, diagrama unifilar/trifilar/de
// comando, vista de quadro, quadro de cargas/tabela, legenda/notas, detalhe,
// corte/fachada ou carimbo.
//
// Por que existe (pedido do usuário em 29/10/2026): o 3D pegava a página com
// mais traços — quase sempre o diagrama unifilar — e "construía uma edificação
// com os desenhos do quadro" (barramentos grossos viravam parede, células da
// tabela viravam ambiente). Agora quem lê o desenho sabe o que é planta e o que
// não é, e o resto do sistema só usa a planta.
//
// Como funciona:
//   1) a folha é dividida em BLOCOS: os traços são marcados numa grade (1/250
//      da folha) e as manchas ligadas viram regiões; o que fica dentro de outra
//      (moldura interna de uma vista) junta com ela; a moldura da folha não conta.
//      O título de cada vista (texto logo abaixo/acima do bloco) vai com ele.
//      Folha MISTA (planta + unifilar + tabelas) fica com várias regiões;
//   2) cada região ganha pontos por tipo, com o motivo escrito:
//        título ("PLANTA BAIXA", "DIAGRAMA UNIFILAR", "QUADRO DE CARGAS",
//        "VISTA FRONTAL", "DETALHE", "CORTE", "LEGENDA") — o sinal mais forte;
//        layers do DXF ("A-PAREDE" × "UNIFILAR");
//        escala ("ESC. 1:50" × "SEM ESCALA");
//        vocabulário elétrico denso (DISJUNTOR, DR, DPS, kA, mm², QDC…);
//        geometria: planta tem arco de porta, parede em linha dupla e nome de
//        sala; diagrama tem "pente" (barramento com saídas igualmente espaçadas,
//        cada uma com texto); tabela tem grade de linhas com texto nas células;
//        tamanho real plausível (planta entre ~2 e ~600 m);
//   3) o tipo da região é o de maior pontuação (abaixo de 1,5: "desconhecido").
// Limites: heurística — folha sem texto (fonte SHX explodida em linhas) perde os
// sinais mais fortes e fica pela geometria; os motivos voltam para conferência.
//
// Entrada neutra ("folha"), montada por quem lê o arquivo
// (backend/src/utils/classificarPranchaPdf.js e ./arquitetura.js):
//   { caixa: [x0, y0, x1, y1], yParaBaixo, textos: [{ s, x, y, h }],
//     segmentos: [{ a: [x, y], b: [x, y], layer? }], arcos: [{ centro, r, varredura, a, b, layer? }],
//     raioPorta: [min, max], espessuraParede: [min, max] (unidades do desenho),
//     metrosPorUnidade (null = escala desconhecida) }

const TIPOS = ['planta', 'diagrama', 'vista_quadro', 'quadro_cargas', 'legenda', 'detalhe', 'corte_fachada', 'carimbo'];
const ROTULO = {
  planta: 'planta baixa', diagrama: 'diagrama unifilar/trifilar/de comando', vista_quadro: 'vista de quadro/painel',
  quadro_cargas: 'quadro de cargas/tabela', legenda: 'legenda/notas', detalhe: 'detalhe', corte_fachada: 'corte/fachada',
  carimbo: 'carimbo', desconhecido: 'não identificado',
};
// o que não é planta: fica fora do 3D e da leitura de ambientes
const NAO_PLANTA = new Set(['diagrama', 'vista_quadro', 'quadro_cargas', 'legenda', 'detalhe', 'corte_fachada', 'carimbo']);
const PONTUACAO_MINIMA = 1.5;

// ── Vocabulário ──────────────────────────────────────────────────────────
// título → tipo (a 1ª regra que casa vale: "VISTA FRONTAL DO QUADRO" é vista de
// quadro antes de ser vista; "LEGENDA - TÉRREO" é legenda antes de ser pavimento)
const TITULOS = [
  ['vista_quadro', /\bVISTAS?\s+(FRONTA(L|IS)|INTERNAS?|EXTERNAS?|LATERA(L|IS)|DO\s+(QUADRO|PAINEL|QGBT|QD|CCM))|\b(LAYOUT|MONTAGEM|ARRANJO|FACHADA)\s+(INTERN[OA]\s+)?D[OE]\s+(QUADRO|PAINEL|QGBT|CCM)|\bPORTA\s+DO\s+(QUADRO|PAINEL)|\bPLACA\s+DE\s+MONTAGEM/i],
  ['diagrama', /\bDIAGRAMAS?\b|\bUNIFILAR|\bTRIFILAR|\bMULTIFILAR|\bBIFILAR|\bESQUEMAS?\s+(EL[ÉE]TRICO|DE\s+(LIGA|COMANDO|FOR[ÇC]A)|FUNCIONAL|VERTICAL|UNIFILAR|MULTIFILAR)|\bDE\s+COMANDO\b|\bPRUMADA|\bDIAG\.\s/i],
  ['quadro_cargas', /\bQUADROS?\s+D[EO]\s+(CARGAS?|DEMANDA|CIRCUITOS|POT[ÊE]NCIAS?)|\bTABELAS?\b|\bLISTA\s+DE\s+(MATERIA|EQUIPAMENTO|CABOS|CIRCUITOS)|\bQUANTITATIVO|\bRESUMO\s+D[EOA]\b|\bBALANCEAMENTO|\bPLANILHA|\bC[ÁA]LCULO\s+DE\s+DEMANDA/i],
  ['legenda', /^(LEGENDAS?|CONVEN[ÇC][ÕO]ES|SIMBOLOGIA|NOTAS?(\s+GERAIS)?|OBSERVA[ÇC][ÕO]ES|MEMORIAL(\s+DESCRITIVO)?)\b|\bNOTAS\s+GERAIS|MEMORIAL\s+DESCRITIVO/i],
  ['detalhe', /^DETALHES?\b|^DET\.?\s*\d|\bDETALHE\s*[-–]?\s*\d|\bDETALHE\s+(T[ÍI]PICO|DE\s)/i],
  // "SEÇÃO" sozinha é o cabeçalho da coluna do cabo na tabela; corte é "SEÇÃO A-A"
  ['corte_fachada', /^(CORTES?|FACHADAS?|ELEVA[ÇC](ÃO|ÕES)|VISTAS?)\b|^SE[ÇC][ÃA]O\s+[A-Z0-9]{1,2}\s*[-–]?\s*[A-Z0-9]{1,2}\b/i],
  ['planta', /^PLANTAS?\b|\bPLANTA\s+(BAIXA|GERAL|D[EOA]\s)|^LAYOUT\b|^IMPLANTA[ÇC][ÃA]O|^(PAVIMENTO|T[ÉE]RREO|SUBSOLO|MEZANINO|\d+\s*[ºª°o]?\s*(PAVIMENTO|ANDAR|PAV\.?))\b/i],
];
// Frase de nota não é título: "É INDICADA NA LISTA DE MATERIAIS DO PROJETO" contava
// como título de tabela e tirava a planta da Arena (desenho real, 29/10/2026)
const RE_FRASE = /^(É|SER[ÁA]|SER[ÃA]O|DEVE[MR]?|DEVER[ÁA]O?|CONFORME|TODOS|TODAS|PARA|QUANDO|CASO|N[ÃA]O|OS|AS|NA|NO|NAS|NOS)\s/i;
function tipoDoTitulo(s) {
  if (s.length > 70 || RE_FRASE.test(s) || s.trim().split(/\s+/).length > 8) return null;
  return (TITULOS.find(([, re]) => re.test(s)) || [null])[0];
}
const RE_CARIMBO = /\b(PROJETO ARQUITET|PRANCHA|FOLHA|ESCALA|ESC\.|DATA|CREA|CAU|RESPONS[AÁ]VEL|PROPRIET[AÁ]RI|AUTOR|DESENHO|DESENHISTA|REVIS[AÃ]O|CONTE[UÚ]DO|ENDERE[CÇ]O|CLIENTE|ASSINATURA|ART|RRT|CARIMBO|ETAPA|ESPECIALIDADE|DISCIPLINA|FORMATO)\b/i;
const RE_ESCALA = /\bESC(?:ALA)?\.?\s*:?\s*1\s*[:/]\s*\d{2,4}\b|^1\s*[:/]\s*(20|25|50|75|100|125|200|250|500)$/i;
const RE_SEM_ESCALA = /\bSEM\s+ESCALA\b|\bS\/\s*ESC/i;
// vocabulário de diagrama/quadro elétrico (texto que tem pelo menos um destes)
const RE_VOCAB_ELETRICO = /\bDISJ|\b\d+(?:[.,]\d+)?\s*kA\b|\bI?DR\b|\bDPS\b|\bBARRAMENTO|\bCONTATOR|\bBORNE|\bFUS[ÍI]VEL|\bSECCIONADOR|\bmm[²2]|\b\d{1,4}\s*A\b(?!\s*=)|\b[123]\s*P\b|\bCURVA\s*[BCD]\b|\bk(?:VA|W)\b|\bQ(?:GBT|DC|DL|DF|DG|DFL|D|M|L|F)\b|\bTU[GE]\b|\bNEUTRO|\bFASES?\b/i;
// cabeçalho de tabela/quadro de cargas
const RE_VOCAB_TABELA = /^(DESCRI[ÇC][ÃA]O|POT[ÊE]NCIA|POT\.|TOTAL|CIRCUITOS?|CIRC\.?|FASES?|QTD\.?|QUANT\.?|UNID\.?|ITEM|DEMANDA|CORRENTE|TENS[ÃA]O|SE[ÇC][ÃA]O|BITOLA|ESQUEMA|M[ÉE]TODO|F\.?P\.?|F\.?D\.?|PROTE[ÇC][ÃA]O|CARGAS?)\b/i;
// nome de sala (planta) — sem o que é texto de circuito ("Tomadas Cozinha").
// A lista é de COMEÇOS de palavra (DORM, BANH, DEPÓS…): sem \b no fim, senão
// "BANHEIRO", "DORMITÓRIO", "DEPÓSITO" e "ALMOXARIFADO" não contavam como sala.
const RE_NOME_SALA = /\b(SALAS?|QUARTO|DORM|SU[ÍI]TE|COZINHA|COZ\.|COPA|BANH|LAVABO|W\.?\s?C\b|BWC|SANIT|VESTI[ÁA]RIO|CIRCULA|CORREDOR|HALL|RECEP|ESPERA|ESCRIT|REUNI|DEP[ÓO]S|ALMOX|GARAGEM|VARANDA|SACADA|TERRA[ÇC]O|LAVANDERIA|SERVI[ÇC]O|DML|AUDIT|REFEIT|LOJA|OFFICE|ACADEMIA|LANCHONETE|CONSULT|LABORAT|AULA|BIBLIOT|DIRETORIA|GER[ÊE]NCIA|ATENDIMENTO|ESTAR|JANTAR|LIVING|CLOSET|ESCADA|ELEVADOR|ANTEC[ÂA]MARA|P[ÁA]TIO|JARDIM|ARQUIVO|TRIAGEM|ENFERMARIA|EXPURGO|SAL[ÃA]O|SACRISTIA|CAPELA|SECRETARIA|TESOURARIA|COMANDO|LAUDOS|EXAMES?|RAIO|TOMOGRAFIA|RESSON[ÂA]NCIA|MAMOGRAFIA|ULTRASS|PREPARO|ROUPARIA|GUARITA|PORTARIA|PLAT[ÉE]IA|PALCO|QUADRAS?)/i;
// ("COMANDO DE ROTAÇÃO DA BAGS-03" é texto do painel de automação; "SALA DE COMANDO" é sala)
const RE_NAO_SALA = /\bCOMANDO\s+D[EOA]S?\b|BORNE|R[ÉE]GUA|\bCLP\b|\bPLC\b|\bFONTE\b|\bREL[ÉE]\b|\bIHM\b|:\s*$|TOMADA|ILUM|POSTE|REFLETOR|PROJETOR|L[ÂA]MPADA|LUMIN|CIRCUITO|INTERRUP|\bTU[GE]\b|\bAR\b|CONDICIONAD|CHUVEIRO|BOMBA|MOTOR|RESERVA|DISJ|QUADRO|\bQ[DG]|\bkW|\bVA\b|\d+\s*W\b|mm|FIA[ÇC]|ELETRODUTO|ALTURA|PONTO|SENSOR|C[ÂA]MERA|\d+\s*A\b/i;
const RE_AREA = /^A\s*=\s*[\d.,]+\s*m[²2]?$|^[\d.,]+\s*m[²2]$/i;
// layers do DXF (sinal forte: o desenhista já separou). A 1ª regra que casa vale,
// e a de planta vem por ÚLTIMO: "ELE-UNIFILAR" é diagrama, não instalação na planta.
// Planta = arquitetura OU instalações desenhadas sobre ela (tomada, lâmpada,
// eletroduto, fio, caixa, CFTV, incêndio, dados…): projeto elétrico em DWG quase
// nunca tem layer "ARQ" (desenho real da Arena, 29/10/2026).
const LAYERS = [
  ['diagrama', /UNIFILAR|TRIFILAR|DIAGRAM|ESQUEMA|COMANDO|MULTIFILAR/i],
  ['vista_quadro', /VISTA|PAINEL|MONTAGEM/i],
  ['quadro_cargas', /QUADRO.?DE.?CARGA|TABELA|PLANILHA/i],
  ['legenda', /LEGENDA|NOTAS?\b|SIMBOLOG/i],
  ['detalhe', /DETALHE/i],
  ['carimbo', /CARIMBO|SELO|MOLDURA|MARGEM|FOLHA|PRANCHA/i],
  ['planta', /ARQ|PAREDE|ALVEN|WALL|PISO|ESQUAD|PORTA|JANELA|PDF-PAREDE|^(EL|ELE|E|IL|ILU)[-_ ]|EL[ÉE]TRIC|TOMAD|L[ÂA]MPAD|LUMIN|ILUMINA|CONDUT|ELETRODUT|ELETROCAL|\bFIOS?\b|CAIXA|IFC[-_ ]|CFTV|C[ÂA]MERA|INC[ÊE]ND|DETEC|SPDA|DADOS|L[ÓO]GIC|TELEF|INTERRUP|MOBILI/i],
];

const RE_LAYER_ARQUITETURA = /ARQ|PAREDE|ALVEN|WALL|PISO|ESQUAD|PORTA|JANELA/i;

// ── utilitários ─────────────────────────────────────────────────────────
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const area = (c) => Math.max(0, c[2] - c[0]) * Math.max(0, c[3] - c[1]);
const expandir = (c, m) => [c[0] - m, c[1] - m, c[2] + m, c[3] + m];
const naCaixa = (c, [x, y]) => x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3];
const sobreposicao = (a, b) => area([Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]);
const distCaixa = (c, [x, y]) => Math.hypot(Math.max(0, c[0] - x, x - c[2]), Math.max(0, c[1] - y, y - c[3]));
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };

// ── 1) Blocos da folha ───────────────────────────────────────────────────
// Moldura: segmento reto comprido (> 45% da folha) colado na borda (6%).
function ehMolduraDaFolha(s, caixa) {
  const [X0, Y0, X1, Y1] = caixa, L = X1 - X0, A = Y1 - Y0;
  const fx = L * 0.06, fy = A * 0.06;
  const horiz = Math.abs(s.a[1] - s.b[1]) <= A * 0.002, vert = Math.abs(s.a[0] - s.b[0]) <= L * 0.002;
  if (horiz && Math.abs(s.a[0] - s.b[0]) > L * 0.45) return s.a[1] < Y0 + fy || s.a[1] > Y1 - fy;
  if (vert && Math.abs(s.a[1] - s.b[1]) > A * 0.45) return s.a[0] < X0 + fx || s.a[0] > X1 - fx;
  return false;
}

// Grade de ocupação → manchas ligadas (8 vizinhos) → regiões. Devolve, para
// cada segmento, o índice da região (−1 = moldura/avulso) e as caixas.
function segmentar(folha) {
  const [X0, Y0, X1, Y1] = folha.caixa;
  const D = Math.max(X1 - X0, Y1 - Y0) || 1;
  const cel = D / 250;
  const nx = Math.ceil((X1 - X0) / cel) + 1, ny = Math.ceil((Y1 - Y0) / cel) + 1;
  const grade = new Int32Array(nx * ny); // 0 = vazio; 1 = ocupado; depois: id da mancha + 2
  const ci = (x) => lim(Math.floor((x - X0) / cel), 0, nx - 1), cj = (y) => lim(Math.floor((y - Y0) / cel), 0, ny - 1);
  const dentroDaFolha = (p) => p[0] >= X0 && p[0] <= X1 && p[1] >= Y0 && p[1] <= Y1;
  // moldura só existe numa FOLHA (página do PDF, ou desenho com carimbo): no DXF só
  // da planta, a caixa é a do próprio prédio e a "moldura" seria a parede de fora
  const temFolha = folha.molduraNaBorda ?? (folha.textos || []).filter(t => RE_CARIMBO.test(t.s)).length >= 3;
  const usaveis = folha.segmentos.map(s => !(temFolha && ehMolduraDaFolha(s, folha.caixa)) && (dentroDaFolha(s.a) || dentroDaFolha(s.b)));
  const marcar = (a, b) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (cel * 0.5)));
    for (let k = 0; k <= n; k++) grade[cj(a[1] + ((b[1] - a[1]) * k) / n) * nx + ci(a[0] + ((b[0] - a[0]) * k) / n)] = 1;
  };
  folha.segmentos.forEach((s, i) => { if (usaveis[i]) marcar(s.a, s.b); });
  for (const a of folha.arcos || []) if (a.a && a.b && dentroDaFolha(a.a)) marcar(a.a, a.b);

  // manchas
  const manchas = [];
  const fila = new Int32Array(nx * ny);
  for (let k0 = 0; k0 < grade.length; k0++) {
    if (grade[k0] !== 1) continue;
    const id = manchas.length;
    let ini = 0, fim = 0, i0 = Infinity, j0 = Infinity, i1 = -1, j1 = -1;
    fila[fim++] = k0; grade[k0] = id + 2;
    while (ini < fim) {
      const k = fila[ini++], i = k % nx, j = (k - i) / nx;
      if (i < i0) i0 = i; if (i > i1) i1 = i; if (j < j0) j0 = j; if (j > j1) j1 = j;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
        const v = jj * nx + ii;
        if (grade[v] === 1) { grade[v] = id + 2; fila[fim++] = v; }
      }
    }
    // moldura própria (vista emoldurada): os 4 lados da caixa quase todos ocupados por ela
    const lado = (ia, ja, ib, jb) => { let n = 0, t = 0; for (let j = ja; j <= jb; j++) for (let i = ia; i <= ib; i++) { t++; if (grade[j * nx + i] === id + 2) n++; } return n / t; };
    const moldura = i1 - i0 >= 8 && j1 - j0 >= 8 && Math.min(lado(i0, j0, i1, j0), lado(i0, j1, i1, j1), lado(i0, j0, i0, j1), lado(i1, j0, i1, j1)) >= 0.75;
    manchas.push({ caixa: [X0 + i0 * cel, Y0 + j0 * cel, X0 + (i1 + 1) * cel, Y0 + (j1 + 1) * cel], celulas: fim, moldura });
  }

  // junta: mancha dentro (70%) de outra maior → a de fora, se a de fora é uma vista
  // emoldurada ou se a de dentro é miúda (sem moldura, a caixa de uma planta em L
  // cobre a legenda vizinha — e a legenda não é da planta); pequena e perto → a mais próxima
  const areaFolha = (X1 - X0) * (Y1 - Y0);
  const pai = manchas.map((_, i) => i);
  const raiz = (i) => { while (pai[i] !== i) i = pai[i] = pai[pai[i]]; return i; };
  const caixas = manchas.map(m => m.caixa.slice());
  const cels = manchas.map(m => m.celulas);
  // traços por mancha: vista miúda diante da folha (poucas células) mas cheia de
  // traço é desenho, não sujeira — some antes (plantas da Arena, 29/10/2026)
  const tracos = manchas.map(() => 0);
  folha.segmentos.forEach((s, i) => {
    if (!usaveis[i] || !dentroDaFolha(s.a)) return;
    const v = grade[cj(s.a[1]) * nx + ci(s.a[0])];
    if (v >= 2) tracos[v - 2]++;
  });
  const unir = (filho, p) => {
    filho = raiz(filho); p = raiz(p);
    if (filho === p) return;
    pai[filho] = p;
    caixas[p] = [Math.min(caixas[p][0], caixas[filho][0]), Math.min(caixas[p][1], caixas[filho][1]), Math.max(caixas[p][2], caixas[filho][2]), Math.max(caixas[p][3], caixas[filho][3])];
    cels[p] += cels[filho];
    tracos[p] += tracos[filho];
  };
  for (let volta = 0, mudou = true; mudou && volta < 6; volta++) {
    mudou = false;
    const vivas = manchas.map((_, i) => i).filter(i => raiz(i) === i).sort((a, b) => area(caixas[b]) - area(caixas[a]));
    for (let q = vivas.length - 1; q > 0; q--) {
      const c = vivas[q];
      if (raiz(c) !== c) continue;
      const ac = area(caixas[c]) || cel * cel;
      let melhor = -1;
      for (let p = 0; p < q; p++) {
        const g = raiz(vivas[p]);
        if (g === c || area(caixas[g]) <= ac) continue;
        if (!manchas[g].moldura && cels[c] >= 40 && ac >= areaFolha * 0.004) continue;
        // a moldura da FOLHA (quase do tamanho dela) não é vista: não engole as outras
        if (temFolha && manchas[g].moldura && area(caixas[g]) >= areaFolha * 0.7) continue;
        if (sobreposicao(caixas[c], expandir(caixas[g], cel)) >= 0.7 * ac && (melhor < 0 || area(caixas[g]) < area(caixas[melhor]))) melhor = g;
      }
      if (melhor >= 0) { unir(c, melhor); mudou = true; }
    }
  }
  const ehGrande = (i) => cels[i] >= 6 || area(caixas[i]) >= areaFolha * 0.002 || tracos[i] >= 200;
  const grandes = () => manchas.map((_, i) => i).filter(i => raiz(i) === i && ehGrande(i));
  for (const i of manchas.map((_, k) => k).filter(k => raiz(k) === k && !ehGrande(k))) {
    const centro = [(caixas[i][0] + caixas[i][2]) / 2, (caixas[i][1] + caixas[i][3]) / 2];
    let melhor = -1, dm = 3 * cel;
    for (const g of grandes()) { if (g === i) continue; const d = distCaixa(caixas[g], centro); if (d <= dm) { dm = d; melhor = g; } }
    if (melhor >= 0) unir(i, melhor);
  }
  const ids = new Map();
  const regioes = [];
  for (const g of grandes()) { ids.set(g, regioes.length); regioes.push({ caixa: caixas[g], celulas: cels[g] }); }
  const regiaoDoPonto = (p) => {
    if (!dentroDaFolha(p)) return -1;
    const v = grade[cj(p[1]) * nx + ci(p[0])];
    if (v < 2) return -1;
    const r = ids.get(raiz(v - 2));
    return r === undefined ? -1 : r;
  };
  const doSegmento = folha.segmentos.map((s, i) => (usaveis[i] ? regiaoDoPonto(s.a) : -1));
  return { regioes, doSegmento, cel, D, regiaoDoPonto };
}

// ── 2) Geometria de cada região ──────────────────────────────────────────
// Retas na horizontal/vertical, com a posição fixa (y das horizontais, x das verticais)
function retas(segs, tolAng = 0.01) {
  const h = [], v = [];
  for (const s of segs) {
    const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1];
    if (Math.abs(dy) <= Math.abs(dx) * tolAng && dx) h.push({ p: (s.a[1] + s.b[1]) / 2, i0: Math.min(s.a[0], s.b[0]), i1: Math.max(s.a[0], s.b[0]) });
    else if (Math.abs(dx) <= Math.abs(dy) * tolAng && dy) v.push({ p: (s.a[0] + s.b[0]) / 2, i0: Math.min(s.a[1], s.b[1]), i1: Math.max(s.a[1], s.b[1]) });
  }
  return { h, v };
}

// trechos colineares que se tocam viram uma linha só (tabela desenhada célula a célula,
// tracejado partido em traços)
function juntarColineares(lista, tol) {
  const porP = new Map();
  for (const r of lista) { const k = Math.round(r.p / tol); (porP.get(k) || porP.set(k, []).get(k)).push(r); }
  const out = [];
  for (const g of porP.values()) {
    g.sort((a, b) => a.i0 - b.i0);
    let cur = null;
    for (const r of g) {
      if (cur && r.i0 <= cur.i1 + tol) cur.i1 = Math.max(cur.i1, r.i1);
      else { cur = { ...r }; out.push(cur); }
    }
  }
  return out;
}

// Parede em linha dupla: duas paralelas à distância de uma parede (7–40 cm) que
// correm juntas. Linha com par dos DOIS lados à mesma distância e mesmas pontas
// é pilha (linhas de tabela, barramento R-S-T-N), não parede.
function comprimentoDeParede(lista, [e0, e1], tol) {
  const s = [...lista].sort((a, b) => a.p - b.p);
  let total = 0;
  const pares = s.map(() => []);
  for (let i = 0; i < s.length; i++) {
    for (let j = i + 1; j < s.length && s[j].p - s[i].p <= e1; j++) {
      const gap = s[j].p - s[i].p;
      if (gap < e0) continue;
      const sob = Math.min(s[i].i1, s[j].i1) - Math.max(s[i].i0, s[j].i0);
      const menor = Math.min(s[i].i1 - s[i].i0, s[j].i1 - s[j].i0);
      if (sob < 0.6 * menor || menor < 3 * e1) continue;
      pares[i].push({ j, gap, sob, cima: true });
      pares[j].push({ j: i, gap, sob, cima: false });
    }
  }
  const mesmasPontas = (a, b) => Math.abs(a.i0 - b.i0) <= tol && Math.abs(a.i1 - b.i1) <= tol;
  const pilha = s.map((r, i) => {
    const iguais = pares[i].filter(p => mesmasPontas(r, s[p.j]));
    return iguais.some(p => p.cima) && iguais.some(p => !p.cima && iguais.some(q => q.cima && Math.abs(q.gap - p.gap) <= Math.max(tol, p.gap * 0.15)));
  });
  for (let i = 0; i < s.length; i++) {
    if (pilha[i]) continue;
    for (const p of pares[i]) if (p.cima && !pilha[p.j]) { total += p.sob; break; }
  }
  return total;
}

// "Pente" do unifilar: uma barra (barramento) com ≥ 5 saídas perpendiculares
// saindo dela, igualmente espaçadas, cada uma com texto (circuito, disjuntor)
// perto. Vaga de estacionamento e baia também fazem pente, mas sem texto.
function pente(barras, dentes, textos, tol) {
  const indice = new Map();
  const chave = (x, y) => `${Math.round(x / (tol * 4))},${Math.round(y / (tol * 4))}`;
  dentes.forEach((d, k) => { for (const x of [d.i0, d.i1]) { const c = chave(x, d.p); (indice.get(c) || indice.set(c, []).get(c)).push(k); } });
  let melhor = { dentes: 0, comTexto: 0 };
  for (const b of barras) {
    if (b.i1 - b.i0 < tol * 20) continue;
    const achados = new Map();
    for (let y = b.i0 - tol * 4; y <= b.i1 + tol * 4; y += tol * 4) {
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const lista = indice.get(`${Math.round(b.p / (tol * 4)) + dx},${Math.round(y / (tol * 4)) + dy}`);
        if (!lista) continue;
        for (const k of lista) {
          const d = dentes[k];
          if (d.p < b.i0 - tol || d.p > b.i1 + tol) continue;
          if (Math.min(Math.abs(d.i0 - b.p), Math.abs(d.i1 - b.p)) > tol) continue;
          if (d.i1 - d.i0 < tol * 5) continue;
          const kp = Math.round(d.p / tol);
          if (!achados.has(kp)) achados.set(kp, d);
        }
      }
    }
    if (achados.size < 5 || achados.size <= melhor.dentes) continue;
    const ps = [...achados.values()].map(d => d.p).sort((a, c) => a - c);
    const gaps = ps.slice(1).map((p, i) => p - ps[i]);
    const med = mediana(gaps);
    // espaçamento regular: a maioria dos vãos perto do mediano (ou múltiplo dele)
    const regulares = gaps.filter(g => med > 0 && Math.abs(g / med - Math.round(g / med)) < 0.2 && Math.round(g / med) <= 3).length;
    if (regulares < gaps.length * 0.7) continue;
    const comTexto = [...achados.values()].filter(d => textos.some(t => t.y >= d.p - med * 0.6 && t.y <= d.p + med * 0.6
      && t.x >= d.i0 - tol * 4 && t.x <= d.i1 + med * 4)).length;
    melhor = { dentes: achados.size, comTexto };
  }
  return melhor;
}

// Tabela: ≥ 4 linhas horizontais com as mesmas pontas, ≥ 2 verticais que vão da
// 1ª à última, e texto entre elas. Devolve as tabelas achadas (caixa, linhas, textos).
function tabelas(h, v, textos, tol) {
  const lh = juntarColineares(h, tol).filter(r => r.i1 - r.i0 >= tol * 15);
  const lv = juntarColineares(v, tol);
  const usadas = new Set();
  const achadas = [];
  const t2 = tol * 2;
  const ordenadas = [...lh].sort((a, b) => (b.i1 - b.i0) - (a.i1 - a.i0));
  for (const base of ordenadas) {
    if (usadas.has(base)) continue;
    const grupo = lh.filter(r => !usadas.has(r) && Math.abs(r.i0 - base.i0) <= t2 && Math.abs(r.i1 - base.i1) <= t2);
    if (grupo.length < 4) continue;
    const y0 = Math.min(...grupo.map(r => r.p)), y1 = Math.max(...grupo.map(r => r.p));
    const altura = y1 - y0;
    const verticais = lv.filter(r => r.p >= base.i0 - t2 && r.p <= base.i1 + t2 && r.i0 <= y0 + altura * 0.1 + t2 && r.i1 >= y1 - altura * 0.1 - t2);
    // tabela tem borda dos dois lados; o unifilar com saídas do mesmo tamanho
    // tem as verticais (barramentos) no meio
    const bordas = verticais.some(r => Math.abs(r.p - base.i0) <= t2) && verticais.some(r => Math.abs(r.p - base.i1) <= t2);
    if (verticais.length < 2 || !bordas) continue;
    const caixa = [base.i0, y0, base.i1, y1];
    const n = textos.filter(t => naCaixa(expandir(caixa, tol), [t.x, t.y])).length;
    if (n < (grupo.length - 1) * 0.6) continue;
    grupo.forEach(r => usadas.add(r));
    achadas.push({ caixa, linhas: grupo.length, colunas: verticais.length, textos: n });
  }
  return achadas;
}

// Arcos com a folha da porta: reta que sai do centro (dobradiça) e termina numa
// ponta do arco. Arco sem as pontas (a, b) conta (quem montou a folha não as tinha).
function comFolha(arcos, segs) {
  if (!arcos.length) return [];
  const cel = Math.max(...arcos.map(a => a.r)) * 0.25 || 1;
  const grade = new Map();
  const k = (x, y) => `${Math.floor(x / cel)},${Math.floor(y / cel)}`;
  for (const s of segs) for (const p of [s.a, s.b]) { const c = k(p[0], p[1]); (grade.get(c) || grade.set(c, []).get(c)).push(s); }
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  return arcos.filter(a => {
    if (!a.a || !a.b) return true;
    const tol = a.r * 0.08;
    const [i, j] = [Math.floor(a.centro[0] / cel), Math.floor(a.centro[1] / cel)];
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) {
      for (const s of grade.get(`${i + x},${j + y}`) || []) {
        const [c, o] = d(s.a, a.centro) <= d(s.b, a.centro) ? [s.a, s.b] : [s.b, s.a];
        if (d(c, a.centro) <= tol && (d(o, a.a) <= tol || d(o, a.b) <= tol)) return true;
      }
    }
    return false;
  });
}

// ── 3) Pontuação ────────────────────────────────────────────────────────
function pontuar(reg, folha, ctx) {
  const P = Object.fromEntries(TIPOS.map(t => [t, 0]));
  const motivos = [];
  const somar = (tipo, v, motivo) => { if (!v) return; P[tipo] += v; if (motivo) motivos.push(`${v > 0 ? '+' : ''}${Math.round(v * 10) / 10} ${ROTULO[tipo]}: ${motivo}`); };
  const { textos, rotulos, segs, arcos } = reg;
  const todos = [...textos, ...rotulos];

  // títulos (letra maior pesa mais; o título fora do bloco, logo abaixo/acima, um pouco mais)
  const porTitulo = {};
  // (no miolo do bloco, título é chamada — "DETALHE-1" apontando o detalhe na planta — e pesa menos)
  for (const t of todos) {
    const tipo = tipoDoTitulo(t.s);
    if (!tipo) continue;
    const alt = reg.caixa[3] - reg.caixa[1];
    const naBordaDoBloco = rotulos.includes(t) || t.y - reg.caixa[1] <= alt * 0.15 || reg.caixa[3] - t.y <= alt * 0.15;
    const peso = 2.5 * lim(t.h / (ctx.hRef || t.h || 1), 0.8, 2.5) * (rotulos.includes(t) ? 1.2 : naBordaDoBloco ? 1 : 0.4);
    const ja = porTitulo[tipo] || { v: 0, exemplos: [] };
    ja.v = Math.min(7, ja.v + peso);
    if (ja.exemplos.length < 2) ja.exemplos.push(t.s);
    porTitulo[tipo] = ja;
  }
  for (const [tipo, { v, exemplos }] of Object.entries(porTitulo)) somar(tipo, v, `título "${exemplos.join('", "')}"`);

  // escala
  // (texto curto: "esc. 1:50" no meio de uma nota não é a escala da vista)
  const comEscala = todos.find(t => t.s.length <= 30 && RE_ESCALA.test(t.s) && !RE_SEM_ESCALA.test(t.s));
  if (comEscala) { somar('planta', 1.5, `escala "${comEscala.s}"`); P.detalhe += 1; P.corte_fachada += 1; }
  const semEscala = todos.find(t => RE_SEM_ESCALA.test(t.s));
  if (semEscala) { somar('diagrama', 2, `"${semEscala.s}"`); P.vista_quadro += 1; P.quadro_cargas += 1; P.planta -= 2; }

  // vocabulário
  const nt = textos.length;
  if (nt) {
    const eletr = textos.filter(t => RE_VOCAB_ELETRICO.test(t.s)).length;
    const dens = eletr / Math.max(10, nt);
    if (dens >= 0.12) {
      somar('diagrama', Math.min(4, 10 * dens), `vocabulário elétrico em ${eletr} de ${nt} textos`);
      P.quadro_cargas += Math.min(3, 6 * dens);
      P.vista_quadro += Math.min(2, 4 * dens);
      P.planta -= Math.min(2.5, 6 * dens);
    }
    const cab = textos.filter(t => RE_VOCAB_TABELA.test(t.s)).length;
    if (cab >= 3) somar('quadro_cargas', Math.min(3, 0.5 * cab), `${cab} cabeçalhos de tabela (descrição, potência, circuito…)`);
    // notas: muitas frases compridas
    const frases = textos.filter(t => t.s.length >= 30).length;
    if (nt >= 8 && frases >= nt * 0.4) somar('legenda', 2, `${frases} linhas de texto corrido (notas)`);
  }
  // legenda/notas: coluna de descrições alinhadas à esquerda (o símbolo fica ao lado)
  if (nt >= 6) {
    const tolX = ctx.cel * 0.3;
    const desc = textos.filter(t => t.s.length >= 12 && /[A-Za-zÀ-ú]{4}/.test(t.s));
    let coluna = 0;
    for (const t of desc) { const n = desc.filter(o => Math.abs(o.x - t.x) <= tolX).length; if (n > coluna) coluna = n; }
    if (coluna >= 6 && coluna >= nt * 0.3) somar('legenda', 2.5, `${coluna} descrições alinhadas em coluna`);
  }

  // carimbo: muitos campos de carimbo, junto à borda de baixo/direita
  const chaves = new Set(todos.filter(t => RE_CARIMBO.test(t.s)).map(t => t.s.match(RE_CARIMBO)[1].toUpperCase()));
  const [X0, Y0, X1, Y1] = folha.caixa;
  const c = reg.caixa;
  const naBorda = c[2] >= X1 - (X1 - X0) * 0.12 || (folha.yParaBaixo ? c[3] >= Y1 - (Y1 - Y0) * 0.12 : c[1] <= Y0 + (Y1 - Y0) * 0.12);
  if (chaves.size >= 3 && naBorda && area(c) <= area(folha.caixa) * 0.3) somar('carimbo', 4 + 0.3 * chaves.size, `${chaves.size} campos de carimbo (${[...chaves].slice(0, 4).join(', ')})`);

  // layers (a pontuação de planta sai depois de ver sala, porta e parede)
  const porLayer = {};
  let totalLayer = 0, arquitetura = 0;
  if (ctx.temLayers) {
    for (const s of segs) {
      if (!s.layer) continue;
      totalLayer++;
      for (const [tipo, re] of LAYERS) if (re.test(s.layer)) { porLayer[tipo] = (porLayer[tipo] || 0) + 1; if (tipo === 'planta' && RE_LAYER_ARQUITETURA.test(s.layer)) arquitetura++; break; }
    }
    for (const [tipo, n] of Object.entries(porLayer)) if (tipo !== 'planta' && n / totalLayer >= 0.1) somar(tipo, Math.round(4 * (n / totalLayer) * 10) / 10, `${Math.round((100 * n) / totalLayer)}% dos traços em layer de ${ROTULO[tipo]}`);
  }

  // geometria
  // porta = arco de ~90° do tamanho de uma folha COM a folha desenhada (reta do
  // centro até uma ponta): a curva de eletroduto e o canto de símbolo não têm folha
  const portas = comFolha(arcos.filter(a => a.varredura >= 70 && a.varredura <= 110 && a.r >= folha.raioPorta[0] && a.r <= folha.raioPorta[1]), segs).length;
  if (portas) somar('planta', Math.min(4, 0.8 * portas), `${portas} arco(s) de porta`);
  const { h, v } = retas(segs);
  const tol = ctx.cel * 0.25;
  const tabs = tabelas(h, v, textos, tol);
  // linha de tabela não é parede (as linhas das células correm em pares)
  const naTabela = (x, y) => tabs.some(t => naCaixa(expandir(t.caixa, tol), [x, y]));
  const parede = comprimentoDeParede(h.filter(r => !naTabela((r.i0 + r.i1) / 2, r.p)), folha.espessuraParede, tol)
    + comprimentoDeParede(v.filter(r => !naTabela(r.p, (r.i0 + r.i1) / 2)), folha.espessuraParede, tol);
  const paredeM = folha.metrosPorUnidade ? parede * folha.metrosPorUnidade : parede / (folha.raioPorta[1] / 1.25);
  // barra vertical com saídas horizontais, ou o contrário (textos trocados de eixo junto)
  const p1 = pente(v, h, textos, tol), p2 = pente(h, v, textos.map(t => ({ ...t, x: t.y, y: t.x })), tol);
  const pt = p1.comTexto >= p2.comTexto ? p1 : p2;
  if (pt.dentes >= 5 && pt.comTexto >= pt.dentes * 0.6) somar('diagrama', Math.min(4, 1.5 + pt.dentes / 6), `barramento com ${pt.dentes} saídas identificadas`);
  if (tabs.length) {
    const linhas = tabs.reduce((s, t) => s + t.linhas, 0);
    const fracao = tabs.reduce((s, t) => s + area(t.caixa), 0) / (area(c) || 1);
    somar('quadro_cargas', Math.min(5, 2 + linhas / 8 + (fracao >= 0.4 ? 1.5 : 0)), `${tabs.length} tabela(s) com ${linhas} linhas (${Math.round(fracao * 100)}% do bloco)`);
    if (fracao >= 0.4) P.planta -= 1.5;
  }
  // nomes de sala e rótulos de área — fora das tabelas (a coluna "local" do
  // quadro de cargas também lista salas)
  const foraDaTabela = todos.filter(t => !naTabela(t.x, t.y));
  const salas = new Set(foraDaTabela.filter(t => t.s.length >= 3 && t.s.length <= 40 && t.s.split(/\s+/).length <= 5 && RE_NOME_SALA.test(t.s) && !RE_NAO_SALA.test(t.s)).map(t => t.s.toUpperCase()));
  const areas = foraDaTabela.filter(t => RE_AREA.test(t.s)).length;
  if (salas.size) somar('planta', salas.size >= 4 ? 5 : salas.size >= 2 ? 3 : 1, `${salas.size} nome(s) de ambiente (${[...salas].slice(0, 4).join(', ')})`);
  if (areas >= 2) somar('planta', 2, `${areas} rótulos de área (m²)`);
  // parede em linha dupla é sinal de apoio: retângulos do diagrama (disjuntor,
  // barramento) e caixas da legenda também fazem pares; sem porta nem nome de sala, vale a metade
  const apoio = portas || salas.size || areas >= 2 ? 1 : 0.5;
  if (paredeM >= 8) somar('planta', (paredeM >= 30 ? 2.5 : 1.5) * apoio, `${Math.round(paredeM)} m de parede em linha dupla`);
  // layer de planta pesa muito (título de nota/detalhe DENTRO do bloco da planta não
  // pode valer mais que milhares de traços de arquitetura/instalação), mas só com
  // apoio: sozinho, o pedaço de painel em layer "E-…"/"CAIXA" virava planta (QA-BAGT)
  const nPlanta = porLayer.planta || 0;
  if (nPlanta && nPlanta / totalLayer >= 0.1) {
    const share = nPlanta / totalLayer;
    // layer de arquitetura (parede, alvenaria) já é o apoio; o de instalação, não
    const comApoio = portas || salas.size || areas >= 2 || paredeM >= 8 || arquitetura / totalLayer >= 0.1;
    somar('planta', Math.round((comApoio ? Math.min(7, 9 * share) : Math.min(2, 3 * share)) * 10) / 10, `${Math.round(100 * share)}% dos traços em layer de ${ROTULO.planta}${comApoio ? '' : ' (sem sala, porta nem parede)'}`);
  }
  // tamanho real
  if (folha.metrosPorUnidade) {
    const tam = Math.max(c[2] - c[0], c[3] - c[1]) * folha.metrosPorUnidade;
    if (tam < 2) somar('planta', -2, `bloco com ${tam.toFixed(1)} m — pequeno demais para planta`);
    else if (tam > 600) somar('planta', -1, `bloco com ${Math.round(tam)} m — grande demais para planta`);
  }
  return { P, motivos, sinais: { salas: salas.size, portas, paredeM: Math.round(paredeM), dentes: pt.dentes, tabelas: tabs.length } };
}

// ── 4) Folha inteira ────────────────────────────────────────────────────
// Devolve { tipo, misto, temPlanta, semPlanta, pontuacaoPlanta, resumo, regioes }
//   regioes: [{ caixa, tipo, rotulo, pontuacao, confianca, titulo, motivos, sinais }]
//   semPlanta: nenhuma planta, e o desenho é de outra coisa (diagrama, tabela, detalhe…)
function classificarFolha(folha) {
  const f = {
    yParaBaixo: false, textos: [], segmentos: [], arcos: [], metrosPorUnidade: null, raioPorta: [0.55, 1.25], espessuraParede: [0.07, 0.4], ...folha,
  };
  if (!f.caixa) f.caixa = caixaDosPontos([...f.segmentos.flatMap(s => [s.a, s.b]), ...f.textos.map(t => [t.x, t.y])]);
  if (!f.segmentos.length && !f.textos.length) return vazio();
  const { regioes: blocos, doSegmento, cel, D } = segmentar(f);
  const hRef = mediana(f.textos.map(t => t.h).filter(h => h > 0)) || 1;
  const ctx = { cel, D, hRef, temLayers: f.segmentos.some(s => s.layer) };

  const regs = blocos.map(b => ({ ...b, segs: [], textos: [], rotulos: [], arcos: [] }));
  f.segmentos.forEach((s, i) => { if (doSegmento[i] >= 0) regs[doSegmento[i]].segs.push(s); });
  const menorQueContem = (p, margem) => {
    let m = -1;
    regs.forEach((r, i) => { if (naCaixa(expandir(r.caixa, margem), p) && (m < 0 || area(r.caixa) < area(regs[m].caixa))) m = i; });
    return m;
  };
  for (const a of f.arcos) { const p = a.a && a.b ? [(a.a[0] + a.b[0]) / 2, (a.a[1] + a.b[1]) / 2] : a.centro; const i = menorQueContem(p, cel * 0.5); if (i >= 0) regs[i].arcos.push(a); }
  // textos: dentro do bloco; fora, o título logo abaixo/acima (até 3 células ou 4 alturas de letra)
  const soltos = [];
  for (const t of f.textos) {
    // título sem folga: o título que fica entre dois blocos (embaixo da planta,
    // em cima do unifilar) não pode cair no de baixo só pela margem
    const i = menorQueContem([t.x, t.y], tipoDoTitulo(t.s) ? 0 : cel * 0.5);
    if (i >= 0) { regs[i].textos.push(t); continue; }
    let melhor = -1, dm = Infinity;
    regs.forEach((r, k) => { const d = distCaixa(r.caixa, [t.x, t.y]); if (d < dm) { dm = d; melhor = k; } });
    if (melhor >= 0 && dm <= Math.max(3 * cel, 4 * t.h) && t.x >= regs[melhor].caixa[0] - 2 * cel && t.x <= regs[melhor].caixa[2]) regs[melhor].rotulos.push(t);
    else soltos.push(t);
  }
  // textos soltos agrupados (notas, carimbo de texto puro): blocos só de texto
  for (const g of agruparTextos(soltos, cel * 3)) if (g.length >= 4) regs.push({ caixa: caixaDosPontos(g.flatMap(t => [[t.x, t.y], [t.x + (t.w || t.s.length * t.h * 0.5), t.y]])), celulas: 0, segs: [], textos: g, rotulos: [], arcos: [], soTexto: true });

  const areaFolha = area(f.caixa) || 1;
  // bloco denso e pequeno diante da folha: a grade (1/250 da folha) ficou grossa
  // demais e juntou vistas vizinhas — o DWG da Arena tem diagramas a 2 km das
  // plantas, a célula deu 8 m e a implantação, as plantas e os cortes viraram um
  // bloco só, "detalhe" pelos títulos (29/10/2026). Reclassifica com grade própria.
  const nivel = folha.nivel || 0;
  const subdividir = (r) => {
    if (nivel >= 2 || r.soTexto || r.segs.length < 300) return null;
    if (Math.max(r.caixa[2] - r.caixa[0], r.caixa[3] - r.caixa[1]) > 60 * cel) return null;
    const sub = classificarFolha({
      ...f, caixa: r.caixa, nivel: nivel + 1, molduraNaBorda: false,
      segmentos: r.segs, arcos: r.arcos, textos: [...r.textos, ...r.rotulos],
    });
    if (sub.regioes.length < 2) return null;
    const fr = area(r.caixa) / areaFolha;
    return sub.regioes.map(x => ({ ...x, area: x.area * fr }));
  };
  const regioes = regs.flatMap(r => {
    const sub = subdividir(r);
    if (sub) return sub;
    const { P, motivos, sinais } = pontuar(r, f, ctx);
    const ordem = Object.entries(P).sort((a, b) => b[1] - a[1]);
    const [tipo0, v0] = ordem[0];
    let tipo = v0 >= PONTUACAO_MINIMA ? tipo0 : 'desconhecido';
    // "planta" miúda sem sala, porta nem parede é o rótulo solto ("1 — ESCALA 1:100"), não uma vista
    if (tipo === 'planta' && area(r.caixa) < areaFolha * 0.005 && !sinais.salas && !sinais.portas && sinais.paredeM < 8) tipo = 'desconhecido';
    const margem = v0 - (ordem[1]?.[1] || 0);
    const titulo = [...r.rotulos, ...r.textos].filter(t => tipoDoTitulo(t.s)).sort((a, b) => b.h - a.h)[0]?.s || null;
    return [{
      caixa: r.caixa, tipo, rotulo: ROTULO[tipo], titulo,
      pontuacao: Object.fromEntries(ordem.filter(([, v]) => v).map(([k, v]) => [k, Math.round(v * 10) / 10])),
      confianca: tipo === 'desconhecido' ? 'baixa' : v0 >= 5 && margem >= 2 ? 'alta' : margem >= 1 ? 'media' : 'baixa',
      motivos, sinais, area: area(r.caixa) / areaFolha, segmentos: r.segs.length, textos: r.textos.length, soTexto: !!r.soTexto,
    }];
  }).filter(r => r.tipo !== 'desconhecido' || r.area >= 0.005 || r.segmentos >= 50)
    .sort((a, b) => b.area - a.area);
  return resumir(regioes);
}

function resumir(regioes) {
  const plantas = regioes.filter(r => r.tipo === 'planta');
  const identificadas = regioes.filter(r => r.tipo !== 'desconhecido');
  const significativas = identificadas.filter(r => r.tipo !== 'carimbo');
  const tipos = [...new Set(significativas.map(r => r.tipo))];
  // tipo da folha: o da maior região identificada (sem o carimbo); planta presente manda
  const tipo = plantas.length ? 'planta' : significativas[0]?.tipo || (identificadas.length ? identificadas[0].tipo : 'desconhecido');
  // sem planta = há desenho reconhecido como outra coisa (legenda e carimbo não contam:
  // toda prancha tem) e ele pesa mais que o desenho não identificado da folha
  const areaDe = (lista) => lista.reduce((s, r) => s + r.area, 0);
  const outras = significativas.filter(r => r.tipo !== 'legenda');
  const semPlanta = !plantas.length && outras.length > 0 && areaDe(outras) >= areaDe(regioes.filter(r => r.tipo === 'desconhecido' && !r.soTexto));
  const pontuacaoPlanta = plantas.reduce((s, r) => s + (r.pontuacao.planta || 0) * (0.5 + Math.min(1, r.area * 2)), 0);
  const contagem = {};
  for (const r of significativas) contagem[r.tipo] = (contagem[r.tipo] || 0) + 1;
  const resumo = Object.entries(contagem).sort((a, b) => (a[0] === 'planta' ? -1 : b[0] === 'planta' ? 1 : b[1] - a[1]))
    .map(([t, n]) => `${ROTULO[t]}${n > 1 ? ` (${n})` : ''}`).join(' + ') || ROTULO.desconhecido;
  return {
    tipo, misto: tipos.length > 1, temPlanta: plantas.length > 0, semPlanta,
    pontuacaoPlanta: Math.round(pontuacaoPlanta * 10) / 10, resumo, regioes,
  };
}

function vazio() {
  return { tipo: 'desconhecido', misto: false, temPlanta: false, semPlanta: false, pontuacaoPlanta: 0, resumo: ROTULO.desconhecido, regioes: [] };
}

function caixaDosPontos(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (!Number.isFinite(x) || !Number.isFinite(y)) continue; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return Number.isFinite(x0) ? [x0, y0, x1, y1] : [0, 0, 1, 1];
}

// textos próximos (até `d`, ou 6 alturas de letra — a lista da legenda tem
// entrelinha folgada) no mesmo grupo — ordem estável
function agruparTextos(textos, d) {
  const pai = textos.map((_, i) => i);
  const raiz = (i) => { while (pai[i] !== i) i = pai[i] = pai[pai[i]]; return i; };
  const ord = textos.map((t, i) => i).sort((a, b) => textos[a].y - textos[b].y);
  const hMax = Math.max(0, ...textos.map(t => t.h || 0));
  const dMax = Math.max(d, 6 * hMax);
  for (let a = 0; a < ord.length; a++) {
    for (let b = a + 1; b < ord.length && textos[ord[b]].y - textos[ord[a]].y <= dMax; b++) {
      const ta = textos[ord[a]], tb = textos[ord[b]];
      const lim2 = Math.max(d, 6 * Math.max(ta.h || 0, tb.h || 0));
      if (Math.abs(tb.y - ta.y) <= lim2 && Math.abs(ta.x - tb.x) <= lim2 * 4) pai[raiz(ord[a])] = raiz(ord[b]);
    }
  }
  const grupos = new Map();
  textos.forEach((t, i) => { const r = raiz(i); (grupos.get(r) || grupos.set(r, []).get(r)).push(t); });
  return [...grupos.values()];
}

// Caixas das regiões a manter de uma folha classificada: as de planta; sem
// planta identificada, as que não foram reconhecidas como outra coisa. [] = manter tudo.
function regioesParaManter(classificacao) {
  if (!classificacao?.regioes?.length) return [];
  const plantas = classificacao.regioes.filter(r => r.tipo === 'planta');
  if (plantas.length) return plantas.map(r => r.caixa);
  return classificacao.regioes.filter(r => r.tipo === 'desconhecido' && !r.soTexto).map(r => r.caixa);
}

// Frase para a tela/relatório: "folha 3: diagrama unifilar/trifilar/de comando — ignorada no 3D"
function descreverFolha(n, c, { usada = false } = {}) {
  const tit = c.regioes?.find(r => r.titulo && r.tipo === c.tipo)?.titulo;
  return `folha ${n}: ${c.resumo}${tit ? ` ("${tit}")` : ''}${usada ? ' — usada no 3D' : c.temPlanta ? '' : c.semPlanta ? ' — ignorada no 3D' : ''}`;
}

module.exports = { classificarFolha, regioesParaManter, descreverFolha, tipoDoTitulo, ROTULO, NAO_PLANTA, TIPOS, RE_NOME_SALA, paraTestes: { segmentar, comprimentoDeParede, pente, tabelas, retas, juntarColineares, ehMolduraDaFolha, agruparTextos } };
