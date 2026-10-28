// Leitores de TABELAS que já vêm como texto no PDF do projeto (camada de texto
// exportada pelo CAD/Visio) — sem IA e sem OCR. Validados em 25/10/2026 sobre
// projetos reais recebidos (quadro de cargas de elétrica, lista de materiais de
// quadro, lista de materiais de BMS e memorial de cotação):
//   - quadroDeCargas: 20/20 circuitos e totais iguais à folha;
//   - listaMateriais: "QTD + descrição" 8/8, "TAG QTD FABRICANTE MODELO" 18/18,
//     "ITEM DESCRIÇÃO QTD UN" 80/80 linhas.
// Antes disso, esses PDFs saíam da Análise de Projeto com 0 itens.
const num = (s) => {
  const t = String(s).trim();
  // "1.234,56" (BR) ou "28,02" ou "1.5"
  if (/,/.test(t)) return parseFloat(t.replace(/\./g, '').replace(',', '.'));
  return parseFloat(t);
};

// ── Quadro de cargas ─────────────────────────────────────────────────────
// "IL.1.1 - ILUMINAÇÃO CIRCULAÇÃO 600,00 W 0,92 0,75 489,13 VA 220 V 2,22 A A 16 A 2,5 mm²"
//  circuito - descrição  potência  FP  FD  demanda  tensão  corrente  fase(s)  disjuntor  seção
const RE_CIRCUITO = /^([A-Z]{1,4}\.?\d+(?:\.\d+)*)\s*-\s*(.+?)\s+([\d.,]+)\s*W\s+([\d,.]+)\s+([\d,.]+)\s+([\d.,]+)\s*VA\s+(\d+)\s*V\s+([\d,.]+)\s*A\s+([ABCRST]{1,3})\s+(\d+)\s*A\s+([\d,.]+)\s*mm[²2]/gm;

function quadroDeCargas(texto) {
  return [...String(texto || '').matchAll(RE_CIRCUITO)].map(m => ({
    circuito: m[1], descricao: m[2].trim(), potencia_W: num(m[3]), fp: num(m[4]), fd: num(m[5]),
    demanda_VA: num(m[6]), tensao_V: Number(m[7]), corrente_A: num(m[8]), fases: m[9],
    disjuntor_A: Number(m[10]), cabo_mm2: num(m[11]),
  }));
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
const emColunas = (l) => celulas(l).filter(Boolean).length >= 3;

// D) Tabela em COLUNAS com cabeçalho ("Item | Descrição | Unid. | Qtd.", em
// qualquer ordem): cada valor vem da coluna certa. Antes, "1 \tCabo… \tm \t120"
// caía no leitor "QTD + descrição" e o nº do item (1) virava a quantidade.
const COLUNAS = {
  descricao: /^DESCRI|^ESPECIFICA|^MATERIA/i,
  qtd: /^QT|^QUANT/i,
  unidade: /^UN(ID)?\.?$|^UNIDADE|^UND/i,
  item: /^ITEM|^N[º°O]\.?$|^C[ÓO]D/i,
};
function listaPorColunas(linhas) {
  const itens = [];
  for (let i = 0; i < linhas.length; i++) {
    if (!emColunas(linhas[i])) continue;
    const cab = celulas(linhas[i]);
    const col = {};
    cab.forEach((c, k) => { for (const [nome, re] of Object.entries(COLUNAS)) if (col[nome] == null && re.test(c)) col[nome] = k; });
    if (col.descricao == null || col.qtd == null) continue;
    let j = i + 1;
    for (; j < linhas.length && j < i + 300; j++) {
      const l = linhas[j];
      if (!l || RE_FIM_BLOCO.test(l)) break;
      const c = celulas(l);
      if (c.length < cab.length - 1) break; // fim da tabela (texto corrido)
      const qtd = num(c[col.qtd] || '');
      const descricao = c[col.descricao] || '';
      if (!Number.isFinite(qtd) || !/[A-Za-zÀ-ú]{3,}/.test(descricao)) continue;
      itens.push({
        ...(col.item != null && c[col.item] ? { item: c[col.item] } : {}),
        descricao, qtd, unidade: (col.unidade != null && c[col.unidade] ? c[col.unidade] : 'un').toLowerCase().replace(/\.$/, ''),
        layout: 'COLUNAS',
      });
    }
    i = j - 1;
  }
  return itens;
}

// A) "QUANT. (UN) DESCRIÇÃO" — "24 Minidisjuntor monopolar, ..." com descrição que
// pode quebrar em várias linhas, e quantidade às vezes sozinha numa linha.
// Tabela em colunas (com tabulação) é do leitor D — aqui ela encerra o bloco.
function listaQtdDescricao(linhas) {
  const itens = [];
  for (let i = 0; i < linhas.length; i++) {
    if (!/LISTA DE MATERIA|QUANT\.?\s*\(UN\)|^QTD\.?\s+DESCRI/i.test(linhas[i])) continue;
    let atual = null;
    let j = i + 1;
    for (; j < linhas.length && j < i + 200; j++) {
      const l = linhas[j];
      if (!l) { if (atual) break; continue; }
      if (/^QUANT|^QTD|^DESCRI/i.test(l)) continue; // cabeçalho
      if (RE_FIM_BLOCO.test(l) || emColunas(l)) break;
      let m = l.match(/^(\d{1,4})\s+(\S.{3,})$/);
      if (m && /[A-Za-zÀ-ú]{3,}/.test(m[2])) {
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
  for (const { i } of usar) {
    for (let j = i + 1; j < linhas.length && j < i + 200; j++) {
      const l = linhas[j];
      if (!l || RE_FIM_BLOCO.test(l)) break;
      // "TE - 1, TE - 2 2 BELIMO ..." (detalhe) ou "TE 10 BELIMO ..." (resumo)
      const m = l.match(/^([A-Z][A-Z0-9]{0,7}(?:\s*-\s*\d+)?(?:,\s*[A-Z][A-Z0-9]{0,7}\s*-\s*\d+)*)\s+(\d{1,4})\s+(.+)$/);
      if (!m) continue;
      if (/\*/.test(m[3])) { // "QUADROS 9 * * *VER TABELA DE QUADROS": item real, detalhado em outra tabela
        itens.push({ tag: m[1], qtd: Number(m[2]), fabricante: '', modelo: '', descricao: `${m[1]} — ${m[3].replace(/\*/g, '').trim().toLowerCase()}`, unidade: 'un', layout: 'TAG+QTD+FAB+MODELO' });
        continue;
      }
      const partes = m[3].split(/\s+/);
      let n = 1;
      if (/\.$/.test(partes[0]) && partes.length > 2) n = 2; // "FUNC. DEVICES"
      const fabricante = partes.slice(0, n).join(' ');
      const modelo = partes[n] || '';
      const descricao = partes.slice(n + 1).join(' ');
      if (!descricao) continue;
      itens.push({ tag: m[1].replace(/\s+/g, ' '), qtd: Number(m[2]), fabricante, modelo, descricao, unidade: 'un', layout: 'TAG+QTD+FAB+MODELO' });
    }
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
    itens.push({ item: codigo, descricao: desc.trim(), qtd: num(m[3]), unidade: m[4].toLowerCase().replace(/\.$/, ''), disciplinaSecao, layout: 'ITEM+DESC+QTD+UN' });
  }
  return itens;
}

function listaMateriais(texto) {
  const linhas = String(texto || '').split('\n').map(l => l.trim());
  // a tabela em colunas (cabeçalho reconhecido) vale mais que os leitores por padrão de linha
  const colunas = listaPorColunas(linhas);
  const linhasDeColuna = new Set(colunas.map(c => c.descricao));
  const porLinha = [...listaQtdDescricao(linhas), ...listaTagFabricante(linhas), ...listaItemDescQtdUn(linhas)]
    .filter(it => !linhasDeColuna.has(it.descricao) && ![...linhasDeColuna].some(d => it.descricao.startsWith(d)));
  return [...colunas, ...porLinha].filter(it => Number.isFinite(it.qtd) && it.qtd > 0);
}

// ── Carimbo (bloco de título) ────────────────────────────────────────────
function carimbo(texto) {
  const t = String(texto || '');
  const pega = (re) => { const m = t.match(re); return m ? m[1].replace(/\s+/g, ' ').trim().slice(0, 120) : null; };
  const escalas = [...new Set((t.match(/\b1\s*:\s*\d{2,4}\b/g) || []).map(s => s.replace(/\s/g, '')))];
  return {
    escala: pega(/ESC(?:ALA)?\.?\s*:?\s*(1\s*:\s*\d{1,4})/i) || (escalas.length === 1 ? escalas[0] : null)
      || (/\bINDICADA\b/i.test(t) ? 'INDICADA' : null),
    escalasNaFolha: escalas,
    revisao: pega(/\bREV(?:IS[ÃA]O)?\.?\s*:?\s*(R?\d{2}|P\d)\b/i),
    data: pega(/\b(\d{2}\/\d{2}\/\d{4})\b/),
    responsavel: pega(/RESPONS[ÁA]VEL T[ÉE]CNICO\s*:?\s*([^\n\t]+)/i) || pega(/Resp\.\s*t[ée]cnico\s*:\s*([^|\n]+)/i),
    crea: pega(/\b(CREA[\s\-:]*[\dA-Z./-]{4,})/i),
    cliente: pega(/CLIENTE\s*:\s*([^\t\n]+)/i) || pega(/PROPRIET[ÁA]RIO\s*:\s*([^\t\n]+)/i) || pega(/Cliente:\s*([^|\n—]+)/),
    obra: pega(/\bOBRA\s*:\s*([^\t\n]+)/i),
  };
}

// ── Disciplina pelo conteúdo (título da prancha, legenda) ────────────────
// Conta palavras típicas; serve para AVISAR quando o arquivo foi marcado com
// uma disciplina e o conteúdo é de outra (caso real: prancha "CFTV 2" que era
// de alarme). Não decide nada sozinho.
const ASSINATURAS = {
  eletrica: /QUADRO DE CARGAS|DIAGRAMA UNIFILAR|DISJUNTOR|CIRCUITO\b|TOMADA|ALIMENTADOR/gi,
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

module.exports = { quadroDeCargas, totaisQuadro, listaMateriais, carimbo, detectarDisciplinas };
