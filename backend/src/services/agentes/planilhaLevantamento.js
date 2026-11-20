// LEVANTAMENTO DE QUANTITATIVOS da análise de projeto, no padrão visual das planilhas da H&M (pedido de 20/11/2026:
// "o sistema não entrega a contagem de pontos nem projeta as planilhas como o padrão H&M faz"). Antes o agente de
// análise só dizia "N ambientes, X serviços, Y materiais" — sem a tabela do que foi contado. Aqui, sem IA:
//
//   contagemDaAnalise(analise) → linhas { disciplina, descricao, quantidade, unidade, origem, conferir, marcada }
//     - símbolos e trechos lidos do desenho (DWG/DXF e PDF vetorial: dadosExtraidos[].desenho[].itens);
//     - pontos por código no texto (CAMx, Rx, Ax);
//     - pontos lidos pela leitura visual (pontos_por_disciplina, enriquecimento do Claude Desktop).
//     O que é de disciplina NÃO marcada na análise aparece também (marcada: false) — o engenheiro vê, por exemplo,
//     as 91 luminárias de um projeto elétrico em que só "elétrica" foi marcada, e decide marcar iluminação.
//   gerarPlanilhaLevantamento({ analise, contagem }) → Buffer .xlsx com as abas
//     Contagem de pontos | Pontos por ambiente | Serviços | Materiais | Pendências
//     (faixa de título com o logo, bloco de identificação, cabeçalho preto/dourado, seções por disciplina com
//     subtotal, zebra, impressão A4 e timbrado — skills/_comum/excel-estilo.js e empresa.js).
const path = require('path');
const ExcelJS = require('exceljs');
const { COMUM } = require('../../config/caminhos');
const E = require(path.join(COMUM, 'excel-estilo.js'));
const { timbrarPastaDeTrabalho } = require(path.join(COMUM, 'empresa.js'));
const { DISCIPLINAS } = require('../../utils/disciplinasProjeto');
const { hojeBrasilia } = require('../../utils/dataHoje');

const NOME = new Map(DISCIPLINAS.map(d => [d.chave, d.nome || d.rotulo || d.chave]));
const nomeDisc = (c) => NOME.get(c) || (c ? String(c).replace(/_/g, ' ').replace(/^./, x => x.toUpperCase()) : 'Sem disciplina');
// grupo rede/cabeamento/telefonia conta como a mesma marcação
const GRUPO = { rede: 'cabeamento', cabeamento: 'cabeamento', telefonia: 'cabeamento', 'iluminacao-externa': 'iluminacao' };
const doGrupo = (c) => GRUPO[c] || c;
// "Tomada 2P+T — bloco HM-ELE-TOMADA" / "[CONFERIR] …" → texto limpo
const limpar = (s) => String(s || '').replace(/\[CONFERIR\]\s*/gi, '').replace(/\s+—\s+bloco\s+.*$/i, '').replace(/\s+/g, ' ').trim();
const QTD = (q) => (Number.isInteger(Number(q)) ? '#,##0' : '#,##0.0');

function contagemDaAnalise(a = {}) {
  const marcadas = new Set((a.disciplinas || []).map(doGrupo));
  const linhas = new Map();
  const somar = ({ disciplina, descricao, quantidade, unidade = 'un', origem, conferir = false, pendenteMapa = false }) => {
    const q = Number(quantidade);
    if (!(q > 0) || !descricao) return;
    const disc = disciplina || ((a.disciplinas || []).length === 1 ? a.disciplinas[0] : null);
    const chave = `${disc}|${descricao.toLowerCase()}|${unidade}`;
    const l = linhas.get(chave) || { disciplina: disc, descricao, quantidade: 0, unidade, origens: new Set(), conferir: false, pendenteMapa: false, marcada: !disc || marcadas.has(doGrupo(disc)) };
    l.quantidade += q;
    l.origens.add(origem);
    l.conferir = l.conferir || conferir;
    l.pendenteMapa = l.pendenteMapa || pendenteMapa;
    linhas.set(chave, l);
  };
  for (const d of a.dadosExtraidos || []) {
    for (const p of d?.desenho || []) {
      const fonte = p.origem === 'cad' ? `${p.pagina || 'DWG/DXF'} ${d.arquivo || ''}`.trim() : `PDF ${d.arquivo || ''} pág. ${p.pagina ?? '?'}`;
      for (const it of p.itens || []) {
        // ambíguo = símbolo explodido ainda não conferido no mapa do CAD: o orçamento não usa (de propósito), mas a
        // contagem MOSTRA — antes ele sumia e a resposta ficava sem nenhum ponto (LACE-LAB: 186 pontos lidos, 0 mostrados)
        const pendenteMapa = !!it.ambiguo;
        const origemDesenho = pendenteMapa ? `desenho, aguardando conferência no mapa do CAD (${fonte})` : `desenho (${fonte})`;
        if (it.tipo === 'simbolo') somar({ disciplina: it.disciplina, descricao: limpar(it.descricao), quantidade: it.quantidade, unidade: 'un', origem: origemDesenho, pendenteMapa, conferir: pendenteMapa || !!it.conferir || /\[CONFERIR\]/i.test(it.descricao || '') });
        else if (it.tipo === 'linha' && Number(it.metros) > 0) somar({ disciplina: it.disciplina, descricao: limpar(it.descricao), quantidade: Math.round(Number(it.metros) * 10) / 10, unidade: 'm', origem: `medido no desenho (${fonte})`, conferir: true });
      }
      // fiação e cabeamento desenhados só vêm em `rotas` (o eletroduto/eletrocalha já veio como linha acima)
      for (const r of p.rotas || []) {
        if (!['fiacao', 'cabeamento'].includes(r.tipo) || !(Number(r.rota_m) > 0)) continue;
        somar({ disciplina: r.disciplina, descricao: `Rota ${r.tipo === 'fiacao' ? 'da fiação' : 'do cabeamento'} — layer "${r.layer}"`, quantidade: Math.round(Number(r.rota_m) * 10) / 10, unidade: 'm', origem: `medido no desenho (${fonte})`, conferir: true });
      }
    }
  }
  const cod = (t) => Number(t?.total) || 0;
  if (cod(a.cameras)) somar({ disciplina: 'cftv', descricao: 'Câmeras (código CAMx no desenho)', quantidade: cod(a.cameras), origem: 'código no texto do projeto' });
  if (cod(a.pontosRedeAntena?.rede)) somar({ disciplina: 'rede', descricao: 'Pontos de rede (código Rx no desenho)', quantidade: cod(a.pontosRedeAntena.rede), origem: 'código no texto do projeto' });
  if (cod(a.pontosRedeAntena?.antena)) somar({ disciplina: 'antena', descricao: 'Pontos de TV/antena (código Ax no desenho)', quantidade: cod(a.pontosRedeAntena.antena), origem: 'código no texto do projeto' });
  for (const g of a.pontosPorDisciplina || []) {
    for (const it of g.itens || []) somar({ disciplina: g.disciplina, descricao: limpar([it.descricao, it.modelo].filter(Boolean).join(' — ')), quantidade: it.quantidade, unidade: it.unidade || 'un', origem: 'leitura visual do PDF (Claude)', conferir: true });
  }
  return [...linhas.values()].map(l => ({ ...l, origem: [...l.origens].join('; ') }))
    .sort((x, y) => Number(y.marcada) - Number(x.marcada) || nomeDisc(x.disciplina).localeCompare(nomeDisc(y.disciplina)) || (x.unidade === 'm') - (y.unidade === 'm') || y.quantidade - x.quantidade);
}

// tabela com seção por disciplina e subtotal (só de "un": metros e unidades não se somam)
function tabelaPorDisciplina(ws, { linha0, colunas, linhas, celulas, colQtd = null, quebrar = [], centralizar = [] }) {
  E.cabecalhoTabela(ws, linha0, colunas);
  let l = linha0 + 1;
  const destaques = [];
  const grupos = new Map();
  for (const x of linhas) { const k = x.disciplina || ''; (grupos.get(k) || grupos.set(k, []).get(k)).push(x); }
  for (const [disc, itens] of grupos) {
    ws.getCell(l, 1).value = `${nomeDisc(disc)}${itens.some(i => i.marcada === false) ? ' — disciplina NÃO marcada na análise (só informativo)' : ''}`;
    if (colunas.length > 1) ws.mergeCells(l, 1, l, colunas.length);
    destaques.push([l, 'secao']);
    l++;
    const ini = l;
    for (const it of itens) { celulas(it).forEach((v, i) => { ws.getCell(l, i + 1).value = v; }); l++; }
    if (colQtd && itens.some(i => i.unidade === 'un')) {
      ws.getCell(l, colQtd - 1).value = 'Subtotal (un)';
      const col = ws.getColumn(colQtd).letter;
      const colUn = ws.getColumn(colQtd + 1).letter;
      ws.getCell(l, colQtd).value = { formula: `SUMIFS(${col}${ini}:${col}${l - 1},${colUn}${ini}:${colUn}${l - 1},"un")` };
      ws.getCell(l, colQtd).numFmt = '#,##0';
      destaques.push([l, 'subtotal']);
      l++;
    }
  }
  const fim = l - 1;
  if (fim > linha0) {
    E.corpoTabela(ws, { de: linha0 + 1, ate: fim, ultimaColuna: colunas.length, quebrar, centralizar });
    E.zebrar(ws, { de: linha0 + 1, ate: fim, ultimaColuna: colunas.length, pular: destaques.map(d => d[0]) });
    destaques.forEach(([ln, tipo]) => E.destacarLinha(ws, ln, colunas.length, tipo));
  }
  return fim;
}

function abaPadrao(wb, nome, { titulo, subtitulo, larguras, a, linhaTabela = 7 }) {
  const ws = wb.addWorksheet(nome);
  ws.columns = larguras.map(w => ({ width: w }));
  E.faixaTitulo(wb, ws, { titulo, subtitulo, ultimaColuna: larguras.length });
  const n = larguras.length;
  const meio = Math.max(2, Math.floor(n / 2));
  E.blocoIdentificacao(ws, {
    linha: 4,
    colunas: [{ rotulo: [1, 1], valor: [2, meio] }, { rotulo: [meio + 1, meio + 1], valor: [meio + 2, n] }],
    linhas: [
      [{ rotulo: 'Projeto', valor: a.nomeProjeto || `Análise #${a.id}` }, { rotulo: 'Análise', valor: `#${a.id}${a.obra?.codigo ? ` — obra ${a.obra.codigo}` : ''}` }],
      [{ rotulo: 'Disciplinas', valor: (a.disciplinas || []).map(nomeDisc).join(', ') || '—' }, { rotulo: 'Data', valor: hojeBrasilia().split('-').reverse().join('/') }],
    ],
  });
  E.espaco(ws, 6);
  ws.views = [{ state: 'frozen', ySplit: linhaTabela }];
  E.apresentacao(ws);
  return ws;
}

async function gerarPlanilhaLevantamento({ analise: a, contagem = contagemDaAnalise(a) }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'H&M Engenharia — Sistema de Orçamentos';

  // 1. Contagem de pontos
  const wc = abaPadrao(wb, 'Contagem de pontos', { titulo: 'Levantamento de quantitativos — contagem de pontos', subtitulo: 'Lido do projeto sem IA (símbolos, códigos e trechos medidos). Itens [CONFERIR] devem ser confirmados na planta antes do orçamento.', larguras: [6, 58, 11, 7, 46, 11], a });
  let ultima = tabelaPorDisciplina(wc, {
    linha0: 7, colunas: ['Item', 'Descrição', 'Qtd', 'Un', 'Origem da quantidade', 'Conferir'], linhas: contagem, colQtd: 3,
    celulas: (() => { let n = 0; return (it) => [++n, it.descricao, it.quantidade, it.unidade, it.origem, it.conferir ? 'CONFERIR' : 'ok']; })(),
    quebrar: [2, 5], centralizar: [1, 3, 4, 6],
  });
  for (let l = 8; l <= ultima; l++) { const c = wc.getCell(l, 3); if (typeof c.value === 'number') c.numFmt = QTD(c.value); if (wc.getCell(l, 6).value === 'CONFERIR') wc.getCell(l, 6).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFC00000' } }; }
  if (!contagem.length) { wc.getCell(8, 1).value = 'Nada foi contado neste arquivo (PDF escaneado, DWG só com traços ou disciplina sem símbolo reconhecido) — veja a aba Pendências.'; wc.mergeCells(8, 1, 8, 6); }
  E.configurarImpressao(wc, { linhasTitulo: '7:7' });

  // 2. Pontos por ambiente (aproximado)
  const ppa = (a.pontosPorAmbiente || []).filter(p => Number(p.total || (p.cftv || 0) + (p.rede || 0) + (p.antena || 0)) > 0);
  if (ppa.length) {
    const wp = abaPadrao(wb, 'Pontos por ambiente', { titulo: 'Pontos por ambiente', subtitulo: 'Distribuição APROXIMADA por proximidade no desenho: os totais batem com a contagem; a sala de cada ponto deve ser conferida.', larguras: [44, 12, 12, 12, 12], a });
    E.cabecalhoTabela(wp, 7, ['Ambiente', 'Câmeras', 'Rede', 'TV/Antena', 'Total']);
    ppa.forEach((p, i) => {
      const l = 8 + i;
      [p.ambiente, p.cftv || 0, p.rede || 0, p.antena || 0].forEach((v, k) => { wp.getCell(l, k + 1).value = v; });
      wp.getCell(l, 5).value = { formula: `SUM(B${l}:D${l})` };
    });
    const t = 8 + ppa.length;
    wp.getCell(t, 1).value = 'TOTAL';
    for (const c of ['B', 'C', 'D', 'E']) wp.getCell(`${c}${t}`).value = { formula: `SUM(${c}8:${c}${t - 1})` };
    E.corpoTabela(wp, { de: 8, ate: t, ultimaColuna: 5, quebrar: [1], centralizar: [2, 3, 4, 5] });
    E.zebrar(wp, { de: 8, ate: t - 1, ultimaColuna: 5 });
    E.destacarLinha(wp, t, 5, 'total');
    E.configurarImpressao(wp, { linhasTitulo: '7:7' });
  }

  // 3. Serviços (mão de obra) e 4. Materiais — os mesmos itens do rascunho de orçamento da análise
  const comQtd = (lista) => (lista || []).filter(x => !x.pronto).map(x => ({ ...x, marcada: true }));
  const ws = abaPadrao(wb, 'Serviços', { titulo: 'Serviços (mão de obra) levantados', subtitulo: 'Quantidade 0 = o desenho não deu a quantidade: preencher pela planta/memorial antes de gerar o orçamento.', larguras: [6, 54, 10, 7, 60], a });
  ultima = tabelaPorDisciplina(ws, {
    linha0: 7, colunas: ['Item', 'Serviço', 'Qtd', 'Un', 'De onde veio a quantidade'], linhas: comQtd(a.servicos), colQtd: 3,
    celulas: (() => { let n = 0; return (it) => [++n, it.descricao, Number(it.quantidade) || 0, it.unidade || 'un', it.observacao || '']; })(),
    quebrar: [2, 5], centralizar: [1, 3, 4],
  });
  for (let l = 8; l <= ultima; l++) { const c = ws.getCell(l, 3); if (c.value === 0) c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFC00000' } }; }
  E.configurarImpressao(ws, { linhasTitulo: '7:7' });

  const wm = abaPadrao(wb, 'Materiais', { titulo: 'Materiais levantados', subtitulo: 'Sem preço: a pesquisa de preços (planilha QF-CAG) e o orçamento vêm depois, com a quantidade conferida.', larguras: [6, 54, 10, 7, 60], a });
  ultima = tabelaPorDisciplina(wm, {
    linha0: 7, colunas: ['Item', 'Material', 'Qtd', 'Un', 'De onde veio a quantidade'], linhas: comQtd(a.materiais), colQtd: 3,
    celulas: (() => { let n = 0; return (it) => [++n, it.descricao, Number(it.quantidade) || 0, it.unidade || 'un', it.observacao || '']; })(),
    quebrar: [2, 5], centralizar: [1, 3, 4],
  });
  for (let l = 8; l <= ultima; l++) { const c = wm.getCell(l, 3); if (c.value === 0) c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFC00000' } }; }
  E.configurarImpressao(wm, { linhasTitulo: '7:7' });

  // 5. Pendências e achados
  const wpd = abaPadrao(wb, 'Pendências', { titulo: 'Achados e pendências [CONFERIR]', subtitulo: 'Tudo o que a leitura não conseguiu garantir. Resolver antes de enviar o orçamento ao cliente.', larguras: [6, 34, 90], a });
  E.cabecalhoTabela(wpd, 7, ['#', 'Tema', 'Observação']);
  const pend = [
    ...(a.achados || []).map(x => [x.tema, x.observacao]),
    ...(a.dadosExtraidos || []).flatMap(d => String(d?.aviso || '').split(/;\s+/).filter(t => /CONFERIR/i.test(t)).map(t => ['Leitura do arquivo', t])),
    ...contagem.filter(c => c.marcada === false).slice(0, 1).map(() => ['Disciplina não marcada', `O desenho tem itens de ${[...new Set(contagem.filter(c => c.marcada === false).map(c => nomeDisc(c.disciplina)))].join(', ')} que não entram no orçamento porque a disciplina não foi marcada na análise.`]),
  ];
  pend.forEach(([t, o], i) => { wpd.getCell(8 + i, 1).value = i + 1; wpd.getCell(8 + i, 2).value = t; wpd.getCell(8 + i, 3).value = o; });
  if (pend.length) {
    E.corpoTabela(wpd, { de: 8, ate: 7 + pend.length, ultimaColuna: 3, quebrar: [2, 3], centralizar: [1] });
    E.zebrar(wpd, { de: 8, ate: 7 + pend.length, ultimaColuna: 3 });
  }
  E.configurarImpressao(wpd, { linhasTitulo: '7:7' });

  timbrarPastaDeTrabalho(wb, 'Levantamento de quantitativos');
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// Disciplinas que o DESENHO tem e que não foram marcadas (20/11/2026): chave da análise (utils/disciplinasProjeto) e
// quantos pontos ficariam fora. Só conta "un" e só disciplina com pelo menos `minimo` pontos (texto solto não puxa
// disciplina). Usado pelo agente para incluir a disciplina quando o usuário não disse quais queria.
const CHAVE_DA_ANALISE = { 'controle-acesso': 'controle_acesso', 'iluminacao-externa': 'iluminacao', veicular: 'carregador', rede: 'cabeamento', telefonia: 'cabeamento' };
const CHAVES_ANALISE = new Set(DISCIPLINAS.map(d => d.chave));
function disciplinasSugeridas(contagem = [], { minimo = 3 } = {}) {
  const por = new Map();
  for (const c of contagem) {
    if (c.marcada !== false || c.unidade !== 'un' || !c.disciplina) continue;
    const chave = CHAVE_DA_ANALISE[c.disciplina] || c.disciplina;
    if (!CHAVES_ANALISE.has(chave)) continue;
    por.set(chave, (por.get(chave) || 0) + Number(c.quantidade || 0));
  }
  return [...por].filter(([, pontos]) => pontos >= minimo).map(([chave, pontos]) => ({ chave, nome: nomeDisc(chave), pontos })).sort((x, y) => y.pontos - x.pontos);
}
// disciplinas marcadas que não tiveram NENHUM ponto lido (arquivo de outra disciplina ou leitura que falhou)
function disciplinasZeradas(a = {}, contagem = []) {
  const comPontos = new Set(contagem.filter(c => c.marcada !== false && c.unidade === 'un' && c.quantidade > 0).map(c => doGrupo(c.disciplina)));
  return (a.disciplinas || []).filter(d => !comPontos.has(doGrupo(d)));
}

module.exports = { contagemDaAnalise, gerarPlanilhaLevantamento, nomeDisc, disciplinasSugeridas, disciplinasZeradas };
