// Leitores de TABELAS que já vêm como texto no PDF do projeto (camada de texto
// exportada pelo CAD/Visio) — sem IA e sem OCR. Validados em 25/10/2026 sobre
// projetos reais recebidos (quadro de cargas de elétrica, lista de materiais de
// quadro, lista de materiais de BMS e memorial de cotação):
//   - quadroDeCargas: 20/20 circuitos e totais iguais à folha;
//   - listaMateriais: "QTD + descrição" 8/8, "TAG QTD FABRICANTE MODELO" 18/18,
//     "ITEM DESCRIÇÃO QTD UN" 80/80 linhas.
// Antes disso, esses PDFs saíam da Análise de Projeto com 0 itens.
// 29/10/2026, formato do AltoQi (Lumine/QiBuilder) em projeto real de 3 folhas:
//   - quadrosDeCargas: 57/57 circuitos em 4 quadros (antes 0);
//   - listaMateriais "grupo / especificação ⇥ qtd unidade": 177/177 itens
//     (antes 76, com a bitola "16 mm²" lida como 16 un).
// Número de tabela: "1.234,56" (BR), "28,02", "1.5" ou "40.26" (AltoQi usa ponto
// decimal). Sem vírgula, ponto seguido de EXATAMENTE 3 dígitos ("1.200") é
// ambíguo: milhar brasileiro (1200) ou decimal com 3 casas (1,2). A leitura
// continua a de antes (ponto decimal), mas `ambiguo` sai marcado com a outra
// leitura em `alternativa`, para virar achado em vez de passar calado.
function lerNumero(s) {
  const t = String(s ?? '').trim();
  if (/,/.test(t)) return { valor: parseFloat(t.replace(/\./g, '').replace(',', '.')), ambiguo: false };
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return { valor: parseFloat(t), ambiguo: true, alternativa: Number(t.replace(/\./g, '')) };
  return { valor: parseFloat(t), ambiguo: false };
}
const num = (s) => lerNumero(s).valor;
// campos de quantidade ambígua para juntar ao item da lista
const marcaAmbigua = (n) => (n.ambiguo ? { qtdAmbigua: true, qtdAlternativa: n.alternativa } : {});

// ── Quadro de cargas ─────────────────────────────────────────────────────
// "IL.1.1 - ILUMINAÇÃO CIRCULAÇÃO 600,00 W 0,92 0,75 489,13 VA 220 V 2,22 A A 16 A 2,5 mm²"
//  circuito - descrição  potência  FP  FD  demanda  tensão  corrente  fase(s)  disjuntor  seção
const RE_CIRCUITO = /^([A-Z]{1,4}\.?\d+(?:\.\d+)*)\s*-\s*(.+?)\s+([\d.,]+)\s*W\s+([\d,.]+)\s+([\d,.]+)\s+([\d.,]+)\s*VA\s+(\d+)\s*V\s+([\d,.]+)\s*A\s+([ABCRST]{1,3})\s+(\d+)\s*A\s+([\d,.]+)\s*mm[²2]/gm;

function quadroDeCargasEmLinha(texto) {
  return [...String(texto || '').matchAll(RE_CIRCUITO)].map(m => ({
    circuito: m[1], descricao: m[2].trim(), potencia_W: num(m[3]), fp: num(m[4]), fd: num(m[5]),
    demanda_VA: num(m[6]), tensao_V: Number(m[7]), corrente_A: num(m[8]), fases: m[9],
    disjuntor_A: Number(m[10]), cabo_mm2: num(m[11]),
  }));
}

// Quadro de cargas em COLUNAS, lido pelo cabeçalho (formato do AltoQi/QiBuilder):
//   "Quadro de Cargas (QD-1) - TERREO"
//   "Circuito ⇥ Descrição ⇥ Esquema ⇥ Método ⇥ Tensão ⇥ [Iluminação (W) ⇥ Tomadas (W) ⇥]
//    Pot. total. ⇥ Pot. total. ⇥ Fases ⇥ Pot. - R ⇥ Pot. - S ⇥ Pot. - T ⇥ FCT ⇥ FCA ⇥ In' ⇥
//    Ip ⇥ Seção ⇥ Ic ⇥ Icc ⇥ Disj ⇥ dV parc ⇥ dV total ⇥ Status"
// A linha do circuito NÃO tem uma célula por coluna: o pdf-parse omite as vazias
// (descrição em branco, potência das fases sem carga, contagem de lâmpadas por
// potência). Por isso: o começo é achado pelo conteúdo (esquema "F+N+T", tensão
// "220 V", fases "R+S+T") e o fim — FCT … Status, sempre preenchido — é alinhado
// pela direita com as colunas do cabeçalho. O formato antigo (tudo numa linha
// com W/VA/V/A/mm²) dava 0 circuitos nesse quadro (revisão de 29/10/2026).
const RE_ESQUEMA = /^\d?F(\s*\+\s*(\d?F|N|T|PE))*$/i;
const RE_FASES = /^[RST](\s*\+\s*[RST]){0,2}$/;
const CAUDA = [ // colunas do fim da linha, alinhadas pela direita
  ['fct', /^FCT$/i], ['fca', /^FCA$/i], ['in_corrigida_A', /^In'?$/i], ['ip_A', /^Ip$|^Ib$/i],
  ['secao_mm2', /^Se[çc][ãa]o/i], ['ic_A', /^Ic$|^Iz$/i], ['icc_kA', /^Icc/i], ['disjuntor_A', /^Disj/i],
  ['dv_parcial_pct', /^dV\s*parc/i], ['dv_total_pct', /^dV\s*tot/i], ['status', /^Status/i],
];
const ehCabecalhoQuadro = (cel) => cel.some(c => /^Circuito$/i.test(c))
  && cel.filter(c => /^(Esquema|M[ée]todo|Tens[ãa]o|Disj|Se[çc][ãa]o|Ip|In'?|Ic|dV|Fases|Pot)/i.test(c)).length >= 4;
// Linhas lidas por tabela (proteção contra texto corrido sem fim). Tabela maior que o limite não some calada: o
// quadro sai com `cortado` e os itens da lista com `listaCortada` ({ leitor, limite }) — viram achado
// (utils/analiseProjetoAchados.js) para conferir o resto direto no PDF.
const LIMITE_QUADRO = 400, LIMITE_COLUNAS = 300, LIMITE_ALTOQI = 1500, LIMITE_QTD_DESC = 200, LIMITE_TAG = 200;
// a tabela segue depois da linha `j` (próxima linha não vazia ainda tem cara de linha da tabela)?
function continua(linhas, j, ehLinha) {
  for (let k = j; k < linhas.length && k < j + 3; k++) {
    const l = linhas[k];
    if (!l) continue;
    return !RE_FIM_BLOCO.test(l) && ehLinha(l);
  }
  return false;
}
const marcarCortada = (itens, desde, leitor, limite) => { for (let k = desde; k < itens.length; k++) itens[k].listaCortada = { leitor, limite }; };

// Quadro alimentado por um circuito deste ("QD-1PAV" no QGBT): é alimentador, não carga
// ("CD-01" é condensadora: fica de fora)
const RE_NOME_QUADRO = /^(Q[A-Z]{0,4}\d*|CCM|PAINEL)\s*[- ]/i;

// Título do quadro: "Quadro de Cargas (QGBT) - SUB-SOLO", "QUADRO DE CARGAS - QD-01 - TERREO", "QUADRO DE CARGAS: QD1".
// O hífen COLADO é do nome ("QD-01"); nome e pavimento se separam por hífen com espaço. Antes o nome era cortado
// no 1º hífen: "QD-01" e "QD-02" viravam o mesmo "QD" (ids de circuito repetidos e alimentador errado na ponte da skill).
function tituloDoQuadro(linha) {
  const t = String(linha).match(/^QUADRO DE CARGAS?\b\s*(.*)$/i);
  if (!t) return null;
  const resto = t[1].trim();
  if (!resto) return { quadro: null, pavimento: null };
  const par = resto.match(/^\(([^)]+)\)\s*(?:[-–:]\s*(.*))?$/);
  if (par) return { quadro: par[1].trim() || null, pavimento: par[2]?.trim() || null };
  const sep = resto.match(/^[-–:]\s*(.*)$/);
  if (!sep || /\t/.test(sep[1])) return null; // sem separador depois do título (ou célula de tabela): não é o título
  const [nome, ...pav] = sep[1].split(/\s+[-–]\s*|[-–]\s+/);
  return { quadro: nome.trim() || null, pavimento: pav.join(' - ').trim() || null };
}

function quadrosPorColunas(linhas) {
  const quadros = [];
  for (let i = 0; i < linhas.length; i++) {
    const cab = celulas(linhas[i]);
    if (!ehCabecalhoQuadro(cab)) continue;
    // título "Quadro de Cargas (QGBT) - SUB-SOLO" logo acima
    let quadro = null, pavimento = null;
    for (let k = 1; k <= 3 && i - k >= 0; k++) {
      const t = tituloDoQuadro(linhas[i - k]);
      if (t) { ({ quadro, pavimento } = t); break; }
    }
    // colunas do fim: as do cabeçalho depois da última "Pot. - T" (ou de "Fases")
    let fimCabeca = -1;
    cab.forEach((c, k) => { if (/^Pot\.?\s*-\s*[RST]$|^Fases$/i.test(c)) fimCabeca = k; });
    const cauda = [];
    for (const c of cab.slice(fimCabeca + 1)) {
      const col = CAUDA.find(([, re]) => re.test(c));
      cauda.push(col ? col[0] : null);
    }
    const circuitos = [];
    let totais = null;
    let j = i + 1;
    for (; j < linhas.length && j < i + LIMITE_QUADRO; j++) {
      const l = linhas[j];
      if (!l) continue;
      const c = celulas(l).filter(Boolean);
      if (/^de inst\.|^\((V|VA|W|A)\)/i.test(c[0] || '')) continue; // 2ª linha do cabeçalho (unidades)
      if (/^TOTAL$/i.test(c[0] || '')) {
        const f = c.findIndex(x => RE_FASES.test(x));
        if (f >= 2) totais = { potencia_VA: num(c[f - 2]), potencia_W: num(c[f - 1]) };
        j++;
        break;
      }
      if (c.length < 8 || RE_FIM_BLOCO.test(l) || ehCabecalhoQuadro(c)) break;
      const e = c.slice(0, 4).findIndex((x, k) => k >= 1 && RE_ESQUEMA.test(x));
      if (e < 1) continue;
      const tensao = c.slice(e + 1, e + 4).find(x => /^\d+(\/\d+)?\s*V$/i.test(x));
      const kT = c.indexOf(tensao, e + 1);
      const kF = c.findIndex((x, k) => k > kT && RE_FASES.test(x));
      if (!tensao || kF < 0) continue;
      // fim da linha pela direita; "Status" (texto) pode faltar
      let nomes = cauda;
      if (nomes[nomes.length - 1] === 'status' && !/[A-Za-z]/.test(c[c.length - 1])) nomes = nomes.slice(0, -1);
      if (c.length - nomes.length <= kF) continue;
      const fim = {};
      nomes.forEach((n, k) => { if (n) fim[n] = c[c.length - nomes.length + k]; });
      if (!/^\d/.test(fim.disjuntor_A || '') || !/^\d/.test(fim.secao_mm2 || '')) continue;
      // entre a tensão e as fases: [lâmpadas/tomadas por potência…] Pot (VA), Pot (W)
      const pots = c.slice(kT + 1, kF).map(num);
      const va = pots.length >= 2 ? pots[pots.length - 2] : null;
      const w = pots.length >= 1 ? pots[pots.length - 1] : null;
      const nomeCircuito = c[0];
      const opcional = (k) => (fim[k] != null ? num(fim[k]) : null);
      circuitos.push({
        circuito: nomeCircuito, descricao: c.slice(1, e).join(' ') || null,
        // campos do formato antigo (mesmos nomes: ponte para a skill, achados, orçamento)
        potencia_W: w, fp: va > 0 && w != null ? Math.round((w / va) * 100) / 100 : null, fd: null, demanda_VA: null,
        tensao_V: Number(tensao.match(/\d+/)[0]), corrente_A: opcional('ip_A'), fases: c[kF].replace(/[\s+]/g, ''),
        disjuntor_A: num(fim.disjuntor_A), cabo_mm2: num(fim.secao_mm2),
        // o que só o quadro em colunas traz (conferências da NBR 5410: Ib ≤ In ≤ Iz, queda de tensão)
        potencia_VA: va, esquema: c[e].replace(/\s/g, ''), metodo: c[e + 1] !== tensao ? c[e + 1] : null,
        in_corrigida_A: opcional('in_corrigida_A'), ip_A: opcional('ip_A'), secao_mm2: num(fim.secao_mm2),
        ic_A: opcional('ic_A'), icc_kA: opcional('icc_kA'), dv_parcial_pct: opcional('dv_parcial_pct'), dv_total_pct: opcional('dv_total_pct'),
        status: fim.status || null, fct: opcional('fct'), fca: opcional('fca'),
        quadro, pavimento, alimentador: RE_NOME_QUADRO.test(`${nomeCircuito} `),
      });
    }
    // "Quadro de Demanda (QGBT)" logo depois: "TOTAL ⇥ 154.22" (kVA demandados)
    let demanda_kVA = null;
    let naDemanda = false;
    for (let k = j; k < Math.min(linhas.length, j + 15); k++) {
      if (/^QUADRO DE CARGAS?/i.test(linhas[k])) break;
      if (/^QUADRO DE DEMANDA/i.test(linhas[k])) { naDemanda = true; continue; }
      const m = naDemanda && linhas[k].match(/^TOTAL\s+([\d.,]+)$/i);
      if (m) { demanda_kVA = num(m[1]); break; }
    }
    // parou no limite com a tabela ainda seguindo: o resto não foi lido — avisa (achado), em vez de cortar calado
    const cortado = j === i + LIMITE_QUADRO && continua(linhas, j, (l) => celulas(l).filter(Boolean).length >= 8 && !/^TOTAL\b/i.test(l));
    quadros.push({
      quadro, pavimento, circuitos, totais: totais || demanda_kVA != null ? { ...(totais || {}), demanda_kVA } : null, layout: 'COLUNAS',
      ...(cortado ? { cortado: { limite: LIMITE_QUADRO } } : {}),
    });
    i = j - 1;
  }
  // circuito com o nome de outro quadro do mesmo arquivo também é alimentador
  const nomes = new Set(quadros.map(q => q.quadro && q.quadro.replace(/\s/g, '').toUpperCase()).filter(Boolean));
  for (const q of quadros) for (const c of q.circuitos) if (nomes.has(c.circuito.replace(/\s/g, '').toUpperCase())) c.alimentador = true;
  return quadros;
}

// Quadros do arquivo, cada um com seus circuitos: "Quadro de cargas (X)" separa
// um quadro do outro (os IDs C1, IL 1… se repetem entre quadros). O formato em
// linha não tem título por quadro: vira um quadro só, sem nome.
function quadrosDeCargas(texto) {
  const linhas = String(texto || '').split('\n').map(l => l.trim());
  const emLinha = quadroDeCargasEmLinha(texto);
  const colunas = quadrosPorColunas(linhas);
  return [...(emLinha.length ? [{ quadro: null, pavimento: null, circuitos: emLinha, totais: null, layout: 'LINHA' }] : []), ...colunas];
}

// Lista plana de circuitos (todos os quadros), como antes — cada circuito do
// quadro em colunas leva `quadro` (título) e `alimentador` para quem precisar separar.
function quadroDeCargas(texto) {
  return quadrosDeCargas(texto).flatMap(q => q.circuitos);
}

// Há quadro de cargas no texto (título no começo da linha ou cabeçalho com
// "Circuito" e colunas elétricas)? Junto com quadroDeCargas() = [] vira o
// achado "quadro de cargas presente e não lido" — antes o silêncio fazia a
// análise dizer que o quadro "continua sendo lido pelo texto".
function quadroDeCargasPresente(texto) {
  return String(texto || '').split('\n').some(l => /^\s*QUADRO DE CARGAS?\b/i.test(l) || ehCabecalhoQuadro(celulas(l.trim())));
}

function totaisQuadro(texto) {
  const t = String(texto || '');
  const inst = t.match(/POT[ÊE]NCIA TOTAL INSTALADA\s+([\d.,]+)\s*W/i);
  const dem = t.match(/POT[ÊE]NCIA TOTAL DEMANDADA\s+([\d.,]+)\s*W.*?([\d,.]+)\s*A\s+([ABCRST]+)\s+(\d+)\s*A\s+([\d,.]+)\s*mm[²2]/i);
  if (!inst && !dem) return null;
  return {
    instalada_W: inst ? num(inst[1]) : null,
    demandada_W: dem ? num(dem[1]) : null,
    corrente_A: dem ? num(dem[2]) : null,
    fases: dem ? dem[3] : null,
    disjuntor_geral_A: dem ? Number(dem[4]) : null,
    alimentador_mm2: dem ? num(dem[5]) : null,
  };
}

// ── Listas de materiais ──────────────────────────────────────────────────
// Linhas que encerram um bloco de lista (começo de outra área da prancha)
const RE_FIM_BLOCO = /^(--\s*\d+\s+of\s+\d+\s*--|LEIAUTE|VISTA|ESCALA|DIAGRAMA|DETALHE|NOTAS?\b|LEGENDA|OBSERVA|QUADRO DE CARGAS|PLANTA|CORTE)/i;

// Linha de tabela em colunas (o pdf-parse separa as células com tabulação)
const celulas = (l) => String(l).split('\t').map(c => c.trim());
// texto que começa com unidade de medida: o número antes dele é bitola, corrente
// ou dimensão ("16 mm²", "50 A - 10 kA", "4 x 2"") — nunca quantidade nem nº de item
const RE_MEDIDA_INICIO = /^(mm[²2]?|cm|m[²2³3]?|kA|A|V|kV|W|kW|VA|kVA|Hz|x\s*\d|["'”]|%)(\s|$|[-–,.)])/i;
const emColunas = (l) => celulas(l).filter(Boolean).length >= 3;

// D) Tabela em COLUNAS com cabeçalho ("Item | Descrição | Unid. | Qtd.", em
// qualquer ordem): cada valor vem da coluna certa. Antes, "1 \tCabo… \tm \t120"
// caía no leitor "QTD + descrição" e o nº do item (1) virava a quantidade.
// "QNT" e "QTDE" também são quantidade; sem coluna "Descrição", a descrição sai
// de "Tipo"/"Modelo"/"Produto"/"Equipamento" (tabela "TIPO | MODELO | QNT" de
// tomadas/luminárias — antes não era lida)
const COLUNAS = {
  descricao: /^DESCRI|^ESPECIFICA|^MATERIA/i,
  qtd: /^QT|^QNT|^QUANT/i,
  unidade: /^UN(ID)?\.?$|^UNIDADE|^UND/i,
  item: /^ITEM|^N[º°O]\.?$|^C[ÓO]D/i,
};
const COLUNAS_DESCRICAO_ALTERNATIVA = /^(TIPO|MODELO|PRODUTO|EQUIPAMENTO|PE[ÇC]A)S?\.?$/i;
function listaPorColunas(linhas) {
  const itens = [];
  const usadas = new Set();
  for (let i = 0; i < linhas.length; i++) {
    if (!emColunas(linhas[i])) continue;
    const cab = celulas(linhas[i]);
    const col = {};
    cab.forEach((c, k) => { for (const [nome, re] of Object.entries(COLUNAS)) if (col[nome] == null && re.test(c)) col[nome] = k; });
    // sem "Descrição": as colunas Tipo/Modelo juntas fazem a descrição
    const colsDescricao = col.descricao != null ? [col.descricao]
      : cab.map((c, k) => (COLUNAS_DESCRICAO_ALTERNATIVA.test(c) ? k : -1)).filter(k => k >= 0);
    if (!colsDescricao.length || col.qtd == null) continue;
    const inicio = itens.length;
    let j = i + 1;
    for (; j < linhas.length && j < i + LIMITE_COLUNAS; j++) {
      const l = linhas[j];
      if (!l || RE_FIM_BLOCO.test(l)) break;
      const c = celulas(l);
      if (c.length < cab.length - 1) break; // fim da tabela (texto corrido)
      const n = lerNumero(c[col.qtd] || '');
      const qtd = n.valor;
      const descricao = colsDescricao.map(k => c[k]).filter(Boolean).join(' — ');
      if (!Number.isFinite(qtd) || !/[A-Za-zÀ-ú]{3,}/.test(descricao)) continue;
      itens.push({
        ...(col.item != null && c[col.item] ? { item: c[col.item] } : {}),
        descricao, qtd, unidade: (col.unidade != null && c[col.unidade] ? c[col.unidade] : 'un').toLowerCase().replace(/\.$/, ''),
        ...marcaAmbigua(n),
        layout: 'COLUNAS',
      });
    }
    if (j === i + LIMITE_COLUNAS && continua(linhas, j, (l) => celulas(l).length >= cab.length - 1)) marcarCortada(itens, inicio, 'COLUNAS', LIMITE_COLUNAS);
    // linhas lidas por esta tabela: saem do texto dos leitores por padrão de linha (listaMateriais)
    if (itens.length > inicio) for (let k = i; k < j; k++) usadas.add(k);
    i = j - 1;
  }
  return { itens, usadas };
}

// E) Lista de materiais do AltoQi (Lumine/QiBuilder): grupos em linhas sem
// tabulação e o item "especificação ⇥ qtd unidade":
//   "Lista de materiais - TERREO" / "Elétrica" / "Cabo Unipolar (cobre)" /
//   "Isol. EPR - 0,6/1kV" / "16 mm² - Azul claro ⇥ 40.26 m" / "Isol.PVC - 450/750V" / …
// A especificação sozinha não diz o que é ("16 mm² - Azul claro", "4x2"", "50 A -
// 10 kA"): a descrição leva os dois últimos níveis de grupo. Um bloco de k linhas de
// grupo depois de itens troca os k níveis de baixo (o de cima continua valendo).
// Antes, "16 mm² - Azul claro" caía no leitor "QTD + descrição" (bitola virava
// quantidade: 16 un) e os itens em "pç" sem nº de item eram descartados.
const RE_ITEM_ALTOQI = /^(.*\S)\s*\t\s*(\d[\d.,]*)\s*(p[çc]s?|un|und|m|m[²2]|m[³3]|kg|cj|jg|rl|cx|br|l)\.?$/i;
function listaAltoQi(linhas) {
  const itens = [];
  const usadas = new Set();
  for (let i = 0; i < linhas.length; i++) {
    const titulo = linhas[i].match(/^LISTA DE MATERIA(?:L|IS)\b\s*(?:[-–]\s*(.+))?$/i);
    if (!titulo) continue;
    // só é deste formato se algum item "⇥ qtd unidade" aparecer logo no começo
    if (!linhas.slice(i + 1, i + 8).some(l => RE_ITEM_ALTOQI.test(l))) continue;
    let grupo = [];
    let novos = [];
    const inicio = itens.length;
    let j = i + 1;
    for (; j < linhas.length && j < i + LIMITE_ALTOQI; j++) {
      const l = linhas[j];
      if (!l) continue;
      if (RE_FIM_BLOCO.test(l) || /^LISTA DE MATERIA/i.test(l)) break;
      const m = l.match(RE_ITEM_ALTOQI);
      if (m) {
        if (novos.length) { grupo = grupo.slice(0, Math.max(0, grupo.length - novos.length)).concat(novos); novos = []; }
        const n = lerNumero(m[2]);
        const unidade = m[3].toLowerCase().replace(/^pc/, 'pç').replace(/^pçs$/, 'pç');
        itens.push({
          descricao: [...grupo.slice(-2), m[1].trim()].join(' — '),
          grupo: grupo.join(' > ') || null, especificacao: m[1].trim(),
          qtd: n.valor, unidade, ...marcaAmbigua(n),
          ...(titulo[1] ? { pavimento: titulo[1].trim() } : {}),
          layout: 'ALTOQI',
        });
        continue;
      }
      // linha com tabulação que não é item: outra tabela (legenda, quadro)
      if (/\t/.test(l)) break;
      novos.push(l);
      if (novos.length > 4) { j -= novos.length - 1; break; } // texto corrido: a lista acabou
    }
    if (j === i + LIMITE_ALTOQI && continua(linhas, j, (l) => RE_ITEM_ALTOQI.test(l) || !/\t/.test(l))) marcarCortada(itens, inicio, 'ALTOQI', LIMITE_ALTOQI);
    for (let k = i; k < j; k++) usadas.add(k);
    i = j - 1;
  }
  return { itens, usadas };
}

// A) "QUANT. (UN) DESCRIÇÃO" — "24 Minidisjuntor monopolar, ..." com descrição que
// pode quebrar em várias linhas, e quantidade às vezes sozinha numa linha.
// Tabela em colunas (com tabulação) é do leitor D — aqui ela encerra o bloco.
function listaQtdDescricao(linhas) {
  const itens = [];
  for (let i = 0; i < linhas.length; i++) {
    if (!/LISTA DE MATERIA|QUANT\.?\s*\(UN\)|^QTD\.?\s+DESCRI/i.test(linhas[i])) continue;
    let atual = null;
    const inicio = itens.length;
    let j = i + 1;
    for (; j < linhas.length && j < i + LIMITE_QTD_DESC; j++) {
      const l = linhas[j];
      if (!l) { if (atual) break; continue; }
      if (/^QUANT|^QTD|^DESCRI/i.test(l)) continue; // cabeçalho
      if (RE_FIM_BLOCO.test(l) || emColunas(l)) break;
      let m = l.match(/^(\d{1,4})\s+(\S.{3,})$/);
      // "16 mm² - Azul claro", "50 A - 10 kA", "4 x 2"": o número é bitola/corrente/
      // medida, não quantidade; e linha que TERMINA em "⇥ qtd unidade" é de outro formato
      const ehMedida = m && (RE_MEDIDA_INICIO.test(m[2]) || /\t\s*[\d.,]+\s*\S{1,4}$/.test(l));
      if (m && !ehMedida && /[A-Za-zÀ-ú]{3,}/.test(m[2])) {
        atual = { qtd: Number(m[1]), descricao: m[2].trim(), unidade: 'un', layout: 'QTD+DESC' };
        itens.push(atual);
        continue;
      }
      if (/^\d{1,4}$/.test(l) && linhas[j + 1] && /^[A-Za-zÀ-ú]/.test(linhas[j + 1])) {
        atual = { qtd: Number(l), descricao: linhas[j + 1].trim(), unidade: 'un', layout: 'QTD+DESC' };
        itens.push(atual);
        j++;
        continue;
      }
      // continuação da descrição anterior (até ~300 caracteres)
      // ("400A, 24 módulos…" começa com número mas não é item: não casou acima)
      if (atual && atual.descricao.length < 300) { atual.descricao += ` ${l}`; continue; }
      if (atual) break;
    }
    if (atual && j === i + LIMITE_QTD_DESC && continua(linhas, j, (l) => !emColunas(l) && /^\d{1,4}(\s|$)/.test(l))) marcarCortada(itens, inicio, 'QTD+DESC', LIMITE_QTD_DESC);
    // cabeçalho em duas linhas ("LISTA DE MATERIAIS…" + "QUANT. (UN)…"): o
    // bloco já foi lido; continua depois dele para não ler de novo
    if (atual) i = j - 1;
  }
  return itens;
}

// B) "TAG [PREFIX] QTD FABRICANTE MODELO DESCRIÇÃO" (listas de BMS/automação).
// Havendo a tabela-resumo (cabeçalho com PREFIX), só ela conta — as tabelas por
// detalhe repetem os mesmos itens e contariam em dobro.
function listaTagFabricante(linhas) {
  const cabecalhos = [];
  linhas.forEach((l, i) => { if (/\bTAG\s+(PREFIX\s+)?QTD\s+FABRICANTE\s+MODELO/i.test(l)) cabecalhos.push({ i, resumo: /PREFIX/i.test(l) }); });
  const usar = cabecalhos.some(c => c.resumo) ? cabecalhos.filter(c => c.resumo) : cabecalhos;
  const itens = [];
  const RE_LINHA_TAG = /^([A-Z][A-Z0-9]{0,7}(?:\s*-\s*\d+)?(?:,\s*[A-Z][A-Z0-9]{0,7}\s*-\s*\d+)*)\s+(\d{1,4})\s+(.+)$/;
  for (const { i } of usar) {
    const inicio = itens.length;
    let j = i + 1;
    for (; j < linhas.length && j < i + LIMITE_TAG; j++) {
      const l = linhas[j];
      if (!l || RE_FIM_BLOCO.test(l)) break;
      // "TE - 1, TE - 2 2 BELIMO ..." (detalhe) ou "TE 10 BELIMO ..." (resumo)
      const m = l.match(RE_LINHA_TAG);
      if (!m) continue;
      if (/\*/.test(m[3])) { // "QUADROS 9 * * *VER TABELA DE QUADROS": item real, detalhado em outra tabela
        itens.push({ tag: m[1], qtd: Number(m[2]), fabricante: '', modelo: '', descricao: `${m[1]} — ${m[3].replace(/\*/g, '').trim().toLowerCase()}`, unidade: 'un', layout: 'TAG+QTD+FAB+MODELO', _linha: j });
        continue;
      }
      const partes = m[3].split(/\s+/);
      let n = 1;
      if (/\.$/.test(partes[0]) && partes.length > 2) n = 2; // "FUNC. DEVICES"
      const fabricante = partes.slice(0, n).join(' ');
      const modelo = partes[n] || '';
      const descricao = partes.slice(n + 1).join(' ');
      if (!descricao) continue;
      itens.push({ tag: m[1].replace(/\s+/g, ' '), qtd: Number(m[2]), fabricante, modelo, descricao, unidade: 'un', layout: 'TAG+QTD+FAB+MODELO', _linha: j });
    }
    if (j === i + LIMITE_TAG && continua(linhas, j, (l) => RE_LINHA_TAG.test(l))) marcarCortada(itens, inicio, 'TAG+QTD+FAB+MODELO', LIMITE_TAG);
  }
  return itens;
}

// C) "1.1.10 TERMINAL DEDICADO TDMI 300 54 un" (ITEM DESCRIÇÃO QTD UNIDADE), com
// itens quebrados em 2–3 linhas (o número do item ou a descrição numa linha acima).
const RE_UNIDADE = '(un|und\\.?|unid\\.?|p[çc]s?\\.?|m|mt\\.?|ml|m[²2]|cj|kit|rl|cx|jg|vb|kg|l)';
function listaItemDescQtdUn(linhas) {
  const itens = [];
  const re = new RegExp(`^(?:(\\d+(?:\\.\\d+){1,3})\\s+)?(.+?)\\s+([\\d.]+(?:,\\d+)?)\\s+${RE_UNIDADE}$`, 'i');
  // Memorial com vários sistemas: "4. CONTROLE DE ACESSO CATRACA (MATERIAL E MÃO
  // DE OBRA)". A disciplina do título vale para os itens abaixo dele (a
  // descrição do item sozinha — "TERMINAL DEDICADO TDMI 300" — não diz o sistema).
  let disciplinaSecao = null;
  for (let i = 0; i < linhas.length; i++) {
    const titulo = linhas[i].match(/^\d{1,2}\.\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ].{3,})$/);
    if (titulo && !re.test(linhas[i])) {
      const d = detectarDisciplinas(titulo[1])[0];
      if (d) disciplinaSecao = d.chave;
      continue;
    }
    const m = linhas[i].match(re);
    if (!m) continue;
    let codigo = m[1];
    let desc = m[2];
    if (!codigo) {
      for (let k = 1; k <= 2 && i - k >= 0; k++) {
        const ant = linhas[i - k];
        if (/^\d+(\.\d+){1,3}$/.test(ant)) { codigo = ant; desc = linhas.slice(i - k + 1, i).concat(desc).join(' '); break; }
        const m2 = ant.match(/^(\d+(?:\.\d+){1,3})\s+(.+)$/);
        if (m2 && !re.test(ant)) { codigo = m2[1]; desc = [m2[2], ...linhas.slice(i - k + 1, i), desc].join(' '); break; }
      }
    }
    if (!codigo || !/[A-Za-zÀ-ú]{3,}/.test(desc)) continue;
    // "2.5 mm² - Preto 131.78 m": "2.5" é bitola, não nº de item
    if (m[1] && RE_MEDIDA_INICIO.test(desc)) continue;
    const n = lerNumero(m[3]);
    itens.push({ item: codigo, descricao: desc.trim(), qtd: n.valor, unidade: m[4].toLowerCase().replace(/\.$/, ''), ...marcaAmbigua(n), disciplinaSecao, layout: 'ITEM+DESC+QTD+UN', _linha: i });
  }
  return itens;
}

function listaMateriais(texto) {
  const linhas = String(texto || '').split('\n').map(l => l.trim());
  // lista do AltoQi primeiro: as linhas dela saem do texto dos outros leitores
  // (senão "16 mm² - Azul claro ⇥ 40.26 m" vira 16 un no leitor "QTD + descrição")
  const altoqi = listaAltoQi(linhas);
  const resto = altoqi.usadas.size ? linhas.map((l, k) => (altoqi.usadas.has(k) ? '' : l)) : linhas;
  // a tabela em colunas (cabeçalho reconhecido) vale mais que os leitores por padrão de linha: o item que eles acharem
  // numa linha dela (`_linha`) sai, e o que ainda vier repetido sai pela descrição IGUAL (normalizada). Antes era por
  // "começa com": "Cabo" da tabela apagava "24 Cabo flexível 2,5mm²" de outra lista (revisão de 06/11/2026)
  const colunas = listaPorColunas(resto);
  const normal = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s—–-]+/g, ' ').replace(/[.;,:]+$/, '').trim();
  const linhasDeColuna = new Set(colunas.itens.map(c => normal(c.descricao)));
  const porLinha = [...listaQtdDescricao(resto), ...listaTagFabricante(resto), ...listaItemDescQtdUn(resto)]
    .filter(it => !colunas.usadas.has(it._linha) && !linhasDeColuna.has(normal(it.descricao)))
    .map(({ _linha, ...it }) => it);
  return [...altoqi.itens, ...colunas.itens, ...porLinha].filter(it => Number.isFinite(it.qtd) && it.qtd > 0);
}

// ── Carimbo (bloco de título) ────────────────────────────────────────────
// Rótulo e valor na MESMA linha ([ \t]*, não \s*): "…DO CLIENTE:" no fim de uma
// linha pegava o "00" da tabela de revisões da linha de baixo; "PROPRIETÁRIO:"
// vazio pegava "ENDEREÇO:". Valor só número ou outro rótulo ("ENDEREÇO:") não vale
// — passa para a próxima ocorrência.
const valorDeCampo = (v) => !!v && !/^[\d\s./-]+$/.test(v) && !/:\s*$/.test(v) && /[A-Za-zÀ-ú]{2,}/.test(v);
// Escala: com rótulo ("ESC. 1:50", "ESCALA 1:75"), a mais repetida na folha; no
// empate, a de maior denominador (planta, não detalhe — "ESCALA 1:5" do detalhe
// de uma folha de plantas em 1:75 saía como a escala da folha). "ESCALA 1/50" e "ESCALA - 1:50" também
// (antes não eram lidos); a barra só depois do rótulo — "1/12" solto pode ser data. Sai sempre "1:50".
function escalaDaFolha(t) {
  const rotuladas = [...t.matchAll(/\bESC(?:ALA)?\.?[ \t]*[:=\-–]?[ \t]*(1[ \t]*[:/][ \t]*\d{1,4})\b/gi)].map(m => m[1].replace(/\s/g, '').replace('/', ':'));
  if (!rotuladas.length) return null;
  const vezes = {};
  for (const e of rotuladas) vezes[e] = (vezes[e] || 0) + 1;
  return Object.keys(vezes).sort((a, b) => vezes[b] - vezes[a] || Number(b.split(':')[1]) - Number(a.split(':')[1]))[0];
}
function carimbo(texto) {
  const t = String(texto || '');
  const limpa = (s) => s.replace(/\s+/g, ' ').trim().slice(0, 120);
  const pega = (re) => { const m = t.match(re); return m ? limpa(m[1]) : null; };
  // primeira ocorrência com valor de verdade (re com /g)
  const pegaValido = (re) => { for (const m of t.matchAll(re)) { const v = limpa(m[1]); if (valorDeCampo(v)) return v; } return null; };
  // escalas da folha: "1:50" solto e as rotuladas com barra ("ESCALA 1/50")
  const escalas = [...new Set([...(t.match(/\b1[ \t]*:[ \t]*\d{2,4}\b/g) || []).map(s => s.replace(/\s/g, '')),
    ...[...t.matchAll(/\bESC(?:ALA)?\.?[ \t]*[:=\-–]?[ \t]*(1[ \t]*\/[ \t]*\d{2,4})\b/gi)].map(m => m[1].replace(/\s/g, '').replace('/', ':'))])];
  return {
    escala: escalaDaFolha(t) || (escalas.length === 1 ? escalas[0] : null)
      || (/\bINDICADA\b/i.test(t) ? 'INDICADA' : null),
    escalasNaFolha: escalas,
    revisao: pega(/\bREV(?:IS[ÃA]O)?\.?\s*:?\s*(R?\d{2}|P\d)\b/i),
    data: pega(/\b(\d{2}\/\d{2}\/\d{4})\b/),
    responsavel: pegaValido(/RESPONS[ÁA]VEL T[ÉE]CNICO[ \t]*:?[ \t]*([^\n\t]+)/gi) || pegaValido(/Resp\.[ \t]*t[ée]cnico[ \t]*:[ \t]*([^|\n]+)/gi),
    // com ao menos um dígito ("CREA/CAU" é rótulo do carimbo, não registro)
    crea: pega(/\b(CREA[ \t\-:]*(?=[\dA-Z./-]*\d)[\dA-Z./-]{4,})/i),
    cliente: pegaValido(/\bCLIENTE[ \t]*:[ \t]*([^\t\n]+)/gi) || pegaValido(/\bPROPRIET[ÁA]RIO[ \t]*:[ \t]*([^\t\n]+)/gi) || pegaValido(/\bCliente:[ \t]*([^|\n—]+)/g),
    obra: pegaValido(/\bOBRA[ \t]*:[ \t]*([^\t\n]+)/gi),
  };
}

// ── Disciplina pelo conteúdo (título da prancha, legenda) ────────────────
// Conta palavras típicas; serve para AVISAR quando o arquivo foi marcado com
// uma disciplina e o conteúdo é de outra (caso real: prancha "CFTV 2" que era
// de alarme). Não decide nada sozinho.
const ASSINATURAS = {
  // "CIRCUITO FECHADO (de TV)" é CFTV, não elétrica
  eletrica: /QUADRO DE CARGAS|DIAGRAMA UNIFILAR|DISJUNTOR|CIRCUITO\b(?!\s+FECHADO)|TOMADA|ALIMENTADOR/gi,
  eletrica_hospitalar: /IT[\s-]M[ÉE]DICO|NBR\s?13534|SISTEMA IT\b|SALA CIR[ÚU]RGICA|\bUTI\b|DSI\b|SUPERVISOR DE ISOLAMENTO/gi,
  eletrica_industrial: /\bCCM\b|PARTIDA (DIRETA|ESTRELA)|INVERSOR DE FREQ|SOFT-?STARTER|BANCO DE CAPACITORES|\bMOTOR(ES)?\b/gi,
  media_tensao: /SUBESTA[ÇC][ÃA]O|M[ÉE]DIA TENS[ÃA]O|13[,.]8\s?kV|NBR\s?14039|CUB[ÍI]CULO|TRANSFORMADOR DE (POT|FOR)/gi,
  iluminacao: /ILUMINA[ÇC][ÃA]O|LUMIN[ÁA]RIA|PERFIL DE LED|\bLUX\b|PLAFON/gi,
  rede: /REDE L[ÓO]GICA|\bREDE\b(?! EL[ÉE]TRICA)|CABEAMENTO ESTRUTURADO|PATCH PANEL|\bCAT\s?6|RJ-?45|SWITCH/gi,
  cftv: /\bCFTV\b|C[ÂA]MERA|\bNVR\b|\bDVR\b|CIRCUITO FECHADO/gi,
  alarme: /\bALARME\b|SENSOR DE ABERTURA|\bIVP\b|INFRAVERMELHO|SIRENE|INTRUS[ÃA]O/gi,
  controle_acesso: /CONTROLE DE ACESSO|FECHADURA ELETRO|LEITORA?\b|CATRACA|BOTOEIRA|ELETRO-?[IÍ]M[ÃA]/gi,
  incendio: /INC[ÊE]NDIO|DETEC[ÇC][ÃA]O|DETECTOR DE FUMA|ACIONADOR MANUAL|AVISADOR|CENTRAL DE ALARME DE INC|SDAI|NBR\s?17240/gi,
  spda: /\bSPDA\b|DESCARGAS ATMOSF|CAPTOR|DESCIDA|NBR\s?5419|MALHA DE ATERRAMENTO/gi,
  automacao: /AUTOMA[ÇC][ÃA]O|\bBMS\b|BACNET|MODBUS|CONTROLADOR|SUPERVIS[ÓO]RIO|CHILLER|FANCOIL|\bDDC\b/gi,
  solar: /FOTOVOLTAIC|M[ÓO]DULO FV|INVERSOR SOLAR|STRING BOX|\bkWp\b/gi,
  carregador: /RECARGA DE VE[ÍI]CULO|CARREGADOR VEICULAR|WALLBOX|ELETROPOSTO|NBR\s?17019/gi,
  antena: /\bANTENA\b|COAXIAL|\bRG-?6\b|TV A CABO/gi,
  telefonia: /TELEFONIA|\bPABX\b|RAMAL|INTERFONE|PORTEIRO/gi,
  // pressurização de escada: "damper" só de alívio/sobrepressão e "pressurização" sem
  // bomba/hidráulica, para não puxar itens de climatização (BMS) nem de hidrantes
  pressurizacao: /ESCADAS? (DE SEGURAN[ÇC]A )?PRESSURIZADAS?|PRESSURIZA[ÇC][ÃA]O DE ESCADAS?|(?<!BOMBAS? (DE )?)PRESSURIZA[ÇC][ÃA]O(?! HIDR)|NBR\s?14880|DAMPER DE (AL[ÍI]VIO|SOBREPRESS[ÃA]O)|REGISTRO DE SOBREPRESS[ÃA]O|VENTILADOR(ES)? DE PRESSURIZA|CONTROLE DE FUMA[ÇC]A POR PRESSURIZA/gi,
};

function detectarDisciplinas(texto) {
  const t = String(texto || '');
  const pontos = {};
  for (const [chave, re] of Object.entries(ASSINATURAS)) {
    const n = (t.match(re) || []).length;
    if (n > 0) pontos[chave] = n;
  }
  return Object.entries(pontos).sort((a, b) => b[1] - a[1]).map(([chave, ocorrencias]) => ({ chave, ocorrencias }));
}

module.exports = {
  quadroDeCargas, quadrosDeCargas, quadroDeCargasPresente, totaisQuadro, listaMateriais, carimbo, detectarDisciplinas, lerNumero,
};
