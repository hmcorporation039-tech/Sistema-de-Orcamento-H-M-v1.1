// Planilha de PESQUISA DE PREÇOS de materiais no critério QF-CAG (pedido de 09/11/2026), gerada sem IA pelo agente
// de pesquisa de preços e pelo agente de orçamento. Quando a skill quadros tiver o gerador dela, o agente de quadro
// usa o da skill (services/agentes/adaptadorQuadros.js); o formato aqui é o mesmo:
//
//   Item | Tag | Descrição | Referência pesquisada | Qtd | Un | Preço unit. | Total | Origem do preço | Faixa encontrada |
//   Fonte | Observação
//
// - grupos (linha de título e subtotal por grupo);
// - origem do preço: Pesquisado (cotação de fornecedor ou pesquisa web com data), Estimativa H&M (vendido em
//   propostas aprovadas ou catálogo da H&M), Cliente (preço informado pelo cliente) ou A cotar (sem referência:
//   preço EM BRANCO — nunca R$ 0,00 — e [CONFERIR]);
// - resumo por origem com SOMASES/CONT.SES (SUMIFS/COUNTIFS) — conferível na própria planilha;
// - contingência editável (padrão 10 %) e TOTAL MATERIAL sem BDI e sem mão de obra;
// - legenda das origens e notas de data-base e do que "não inclui".
// Nada aqui grava no banco: recebe as linhas prontas e devolve o Buffer do .xlsx.
const ExcelJS = require('exceljs');
const { hojeBrasilia } = require('../../utils/dataHoje');

const ORIGENS = {
  pesquisado: 'Pesquisado',
  estimativa: 'Estimativa H&M',
  cliente: 'Cliente',
  a_cotar: 'A cotar',
};
const DESCRICAO_ORIGEM = {
  [ORIGENS.pesquisado]: 'Cotação de fornecedor (últimos 180 dias) ou pesquisa de mercado na web, com fonte e data.',
  [ORIGENS.estimativa]: 'Referência própria da H&M: mediana do vendido em propostas aprovadas ou preço do catálogo.',
  [ORIGENS.cliente]: 'Preço informado pelo cliente na lista/especificação.',
  [ORIGENS.a_cotar]: 'Sem referência confiável: preço em branco, fora do total — cotar antes de enviar [CONFERIR].',
};
const COR_ORIGEM = {
  [ORIGENS.pesquisado]: 'FFE2F0D9',
  [ORIGENS.estimativa]: 'FFFFF2CC',
  [ORIGENS.cliente]: 'FFDDEBF7',
  [ORIGENS.a_cotar]: 'FFF8CBAD',
};
const MOEDA = '"R$" #,##0.00';
const QTD = '#,##0.00';
const OURO = 'FFC9A227';
const PRETO = 'FF101010';

const r2 = (v) => Math.round(Number(v) * 100) / 100;
const mediana = (lista) => {
  const v = lista.map(Number).filter(n => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return r2(v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2);
};
const { moedaTexto: moeda } = require('../../utils/moeda'); // fonte única (2.38)
const dataBr = (iso) => String(iso || '').slice(0, 10).split('-').reverse().join('/');

// Classifica a origem do preço de UM item a partir das referências encontradas (sem IA):
//   internas = services/referenciasDePreco.referenciasInternas(descricao) (ou null)
//   web      = resultado de POST /pesquisa-mercado (só quando o usuário permitiu) (ou null)
// → { preco|null, origem, referencia, faixa, fonte, observacao, conferir }
function classificarPreco(item = {}, internas = null, web = null) {
  const ofertas = [
    ...((internas && internas.ofertas) || []).map(o => ({ ...o, web: false })),
    ...((web && !web.interna && web.ofertas) || []).map(o => ({ ...o, web: true, fonte: o.fonte ? `Web — ${o.fonte}` : 'Pesquisa na web' })),
  ];
  const mesmo = ofertas.filter(o => o.mesmo_item !== false && Number(o.preco) > 0);
  const precos = mesmo.map(o => Number(o.preco));
  const faixaTexto = precos.length ? `${moeda(Math.min(...precos))} a ${moeda(Math.max(...precos))} (${precos.length} ref.)` : '';
  // faixa numérica (menor e maior) também sai, para o "onde economizar" da resposta do agente
  const faixa = faixaTexto;
  const extremos = precos.length ? { faixaMin: r2(Math.min(...precos)), faixaMax: r2(Math.max(...precos)) } : { faixaMin: null, faixaMax: null };
  const sinapi = ofertas.filter(o => o.mesmo_item === false && Number(o.preco) > 0);
  const notaSinapi = sinapi.length ? `SINAPI indicativa: ${sinapi.map(s => `${moeda(s.preco)} (${s.fonte})`).join('; ')} — fora da média, conferir se é o mesmo item` : '';
  const fonteDe = (lista) => lista.slice(0, 3).map(o => `${o.fonte}${o.observacao ? ` (${String(o.observacao).slice(0, 80)})` : ''}`).join('; ');
  const juntar = (...t) => t.filter(Boolean).join(' · ');

  const pc = Number(item.preco_cliente);
  if (Number.isFinite(pc) && pc > 0) {
    return { ...extremos, preco: r2(pc), origem: ORIGENS.cliente, referencia: item.referencia || '', faixa, fonte: 'Informado pelo cliente', observacao: juntar(item.observacao, notaSinapi), conferir: false };
  }
  const pesquisadas = mesmo.filter(o => o.web || /^Cota[cç][aã]o/i.test(o.fonte || ''));
  if (pesquisadas.length) {
    const daIA = pesquisadas.some(o => o.lida_por_ia);
    return {
      ...extremos, preco: mediana(pesquisadas.map(o => o.preco)), origem: ORIGENS.pesquisado, referencia: String(pesquisadas[0].produto || '').slice(0, 200), faixa,
      fonte: fonteDe(pesquisadas), observacao: juntar(item.observacao, daIA ? '[CONFERIR] cotação lida por IA' : '', notaSinapi), conferir: daIA,
    };
  }
  const estimativas = mesmo.filter(o => /^(Vendido pela H&M|Cat[aá]logo H&M)/i.test(o.fonte || ''));
  if (estimativas.length) {
    const daIA = estimativas.some(o => o.lida_por_ia);
    return {
      ...extremos, preco: mediana(estimativas.map(o => o.preco)), origem: ORIGENS.estimativa, referencia: String(estimativas[0].produto || '').slice(0, 200), faixa,
      fonte: fonteDe(estimativas), observacao: juntar(item.observacao, daIA ? '[CONFERIR] preço do catálogo lido por IA' : '', notaSinapi), conferir: daIA,
    };
  }
  return {
    ...extremos, preco: null, origem: ORIGENS.a_cotar, referencia: '', faixa,
    fonte: '', observacao: juntar(item.observacao, '[CONFERIR] sem referência de preço — cotar', notaSinapi), conferir: true,
  };
}

// Resumo em memória (o mesmo que a planilha calcula pelas fórmulas): para a resposta do agente e os testes
function resumirPorOrigem(linhas, contingenciaPct = 10) {
  const porOrigem = Object.fromEntries(Object.values(ORIGENS).map(o => [o, { itens: 0, total: 0 }]));
  for (const l of linhas) {
    const o = porOrigem[l.origem] || (porOrigem[l.origem] = { itens: 0, total: 0 });
    o.itens++;
    if (l.preco != null) o.total = r2(o.total + r2(Number(l.quantidade || 0) * Number(l.preco)));
  }
  const subtotal = r2(Object.values(porOrigem).reduce((s, o) => s + o.total, 0));
  const contingencia = r2(subtotal * (Number(contingenciaPct) || 0) / 100);
  return { porOrigem, subtotal, contingencia, total: r2(subtotal + contingencia), aCotar: porOrigem[ORIGENS.a_cotar].itens };
}

// Planilha. dados = { titulo, cliente?, obra?, dataBase (AAAA-MM-DD), contingenciaPct (10), grupos: [{ nome, itens: [
//   { tag, descricao, referencia, quantidade, unidade, preco|null, origem, faixa, fonte, observacao }] }], naoInclui? }
async function gerarPlanilhaPrecos(dados) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de Orçamentos H&M — agente de pesquisa de preços';
  wb.created = new Date();
  const ws = wb.addWorksheet('Pesquisa de preços', {
    views: [{ state: 'frozen', ySplit: 5 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  });
  ws.columns = [
    { key: 'item', width: 7 }, { key: 'tag', width: 10 }, { key: 'descricao', width: 46 }, { key: 'referencia', width: 34 },
    { key: 'qtd', width: 9 }, { key: 'un', width: 6 }, { key: 'preco', width: 14 }, { key: 'total', width: 15 },
    { key: 'origem', width: 15 }, { key: 'faixa', width: 26 }, { key: 'fonte', width: 40 }, { key: 'obs', width: 40 },
  ];
  const borda = { top: { style: 'thin', color: { argb: 'FFBFBFBF' } }, bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } }, left: { style: 'thin', color: { argb: 'FFBFBFBF' } }, right: { style: 'thin', color: { argb: 'FFBFBFBF' } } };
  // em Brasília: em UTC, depois das 21h a planilha saía com a data-base de amanhã
  const dataBase = dados.dataBase || hojeBrasilia();
  const pct = Number.isFinite(Number(dados.contingenciaPct)) ? Number(dados.contingenciaPct) : 10;

  ws.mergeCells('A1:L1');
  ws.getCell('A1').value = String(dados.titulo || 'Pesquisa de preços de materiais').toUpperCase();
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: OURO } };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRETO } };
  ws.getRow(1).height = 24;
  ws.mergeCells('A2:L2');
  ws.getCell('A2').value = [dados.cliente ? `Cliente: ${dados.cliente}` : null, dados.obra ? `Obra: ${dados.obra}` : null, 'H&M Engenharia e Tecnologia'].filter(Boolean).join(' · ');
  ws.mergeCells('A3:L3');
  ws.getCell('A3').value = `Data-base dos preços: ${dataBr(dataBase)} · Critério QF-CAG: origem de cada preço (Pesquisado / Estimativa H&M / Cliente), faixa e fonte · Valores SEM BDI e SEM mão de obra`;
  ws.getCell('A3').font = { italic: true, size: 9 };

  const cab = ws.getRow(5);
  cab.values = ['Item', 'Tag', 'Descrição', 'Referência pesquisada', 'Qtd', 'Un', 'Preço unit.', 'Total', 'Origem do preço', 'Faixa encontrada', 'Fonte', 'Observação'];
  cab.font = { bold: true, color: { argb: 'FF000000' } };
  cab.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cab.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OURO } }; c.border = borda; });
  cab.height = 30;

  let linha = 6;
  const primeira = linha;
  const grupos = (dados.grupos || []).filter(g => (g.itens || []).length);
  grupos.forEach((g, gi) => {
    const r = ws.getRow(linha);
    r.getCell(1).value = String(gi + 1);
    ws.mergeCells(linha, 2, linha, 12);
    r.getCell(2).value = String(g.nome || `Grupo ${gi + 1}`).toUpperCase();
    r.font = { bold: true };
    r.eachCell({ includeEmpty: true }, c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDEDED' } }; });
    linha++;
    const ini = linha;
    g.itens.forEach((it, ii) => {
      const l = ws.getRow(linha);
      l.getCell(1).value = `${gi + 1}.${ii + 1}`;
      l.getCell(2).value = it.tag || '';
      l.getCell(3).value = String(it.descricao || '').slice(0, 500);
      l.getCell(4).value = it.referencia || '';
      l.getCell(5).value = Number(it.quantidade) || 0;
      l.getCell(6).value = it.unidade || 'un';
      // preço sem referência fica EM BRANCO (nunca R$ 0,00) e o total também
      if (it.preco != null && Number(it.preco) > 0) l.getCell(7).value = r2(it.preco);
      l.getCell(8).value = { formula: `IF(G${linha}="","",E${linha}*G${linha})`, result: it.preco != null && Number(it.preco) > 0 ? r2(Number(it.quantidade || 0) * Number(it.preco)) : '' };
      l.getCell(9).value = it.origem || ORIGENS.a_cotar;
      l.getCell(10).value = it.faixa || '';
      l.getCell(11).value = it.fonte || '';
      l.getCell(12).value = it.observacao || '';
      l.getCell(5).numFmt = QTD; l.getCell(7).numFmt = MOEDA; l.getCell(8).numFmt = MOEDA;
      l.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_ORIGEM[it.origem] || COR_ORIGEM[ORIGENS.a_cotar] } };
      l.alignment = { vertical: 'top', wrapText: true };
      l.eachCell({ includeEmpty: true }, c => { c.border = borda; });
      linha++;
    });
    const s = ws.getRow(linha);
    s.getCell(3).value = `Subtotal — ${g.nome || `grupo ${gi + 1}`}`;
    s.getCell(8).value = { formula: `SUM(H${ini}:H${linha - 1})` };
    s.getCell(8).numFmt = MOEDA;
    s.font = { bold: true, italic: true };
    linha += 2;
  });
  const ultima = Math.max(primeira, linha - 1);
  const faixaH = `H$${primeira}:H$${ultima}`;
  const faixaI = `I$${primeira}:I$${ultima}`;

  // ── resumo por origem (SUMIFS/COUNTIFS) ──
  linha++;
  ws.getRow(linha).getCell(3).value = 'RESUMO POR ORIGEM DO PREÇO';
  ws.getRow(linha).getCell(5).value = 'Itens';
  ws.getRow(linha).getCell(8).value = 'Total';
  ws.getRow(linha).font = { bold: true };
  linha++;
  const linhasOrigem = {};
  for (const o of Object.values(ORIGENS)) {
    const r = ws.getRow(linha);
    r.getCell(3).value = o;
    r.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_ORIGEM[o] } };
    r.getCell(5).value = { formula: `COUNTIFS(${faixaI},"${o}")` };
    r.getCell(8).value = { formula: `SUMIFS(${faixaH},${faixaI},"${o}")` };
    r.getCell(8).numFmt = MOEDA;
    linhasOrigem[o] = linha;
    linha++;
  }
  const lSub = linha;
  ws.getRow(lSub).getCell(3).value = 'Subtotal de material com preço';
  ws.getRow(lSub).getCell(8).value = { formula: `SUM(H${linhasOrigem[ORIGENS.pesquisado]}:H${linhasOrigem[ORIGENS.a_cotar]})` };
  ws.getRow(lSub).getCell(8).numFmt = MOEDA;
  ws.getRow(lSub).font = { bold: true };
  const lPct = lSub + 1;
  ws.getRow(lPct).getCell(3).value = 'Contingência (%) — editável';
  ws.getRow(lPct).getCell(7).value = pct / 100;
  ws.getRow(lPct).getCell(7).numFmt = '0.0%';
  ws.getRow(lPct).getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
  ws.getRow(lPct).getCell(7).note = 'Altere o percentual: o total recalcula sozinho.';
  ws.getRow(lPct).getCell(8).value = { formula: `H${lSub}*G${lPct}` };
  ws.getRow(lPct).getCell(8).numFmt = MOEDA;
  const lTot = lPct + 1;
  ws.getRow(lTot).getCell(3).value = 'TOTAL MATERIAL (sem BDI e sem mão de obra)';
  ws.getRow(lTot).getCell(8).value = { formula: `H${lSub}+H${lPct}` };
  ws.getRow(lTot).getCell(8).numFmt = MOEDA;
  ws.getRow(lTot).font = { bold: true, size: 12 };
  ws.getRow(lTot).getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: OURO } };
  const lCotar = lTot + 1;
  ws.getRow(lCotar).getCell(3).value = 'Itens a cotar (sem preço — fora do total)';
  ws.getRow(lCotar).getCell(5).value = { formula: `COUNTIFS(${faixaI},"${ORIGENS.a_cotar}")` };

  // ── legenda e notas ──
  linha = lCotar + 2;
  ws.getRow(linha).getCell(3).value = 'LEGENDA — ORIGEM DO PREÇO';
  ws.getRow(linha).font = { bold: true };
  linha++;
  for (const o of Object.values(ORIGENS)) {
    const r = ws.getRow(linha);
    r.getCell(3).value = o;
    r.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_ORIGEM[o] } };
    ws.mergeCells(linha, 4, linha, 12);
    r.getCell(4).value = DESCRICAO_ORIGEM[o];
    linha++;
  }
  linha++;
  const naoInclui = dados.naoInclui || ['mão de obra (montagem, instalação, comissionamento)', 'BDI', 'frete', 'impostos sobre serviço', 'os itens "A cotar"'];
  const notas = [
    `Data-base: ${dataBr(dataBase)}. Os preços valem para esta data; atualize antes de usar em outra.`,
    `Não inclui: ${naoInclui.join(', ')}.`,
    'Faixa encontrada: menor e maior preço das referências do MESMO item. A SINAPI aparece só como indicação (busca por palavras), fora da média.',
    'Fontes consultadas sem IA: cotações de fornecedores (últimos 180 dias), propostas aprovadas da H&M, catálogo H&M e SINAPI; pesquisa na web só quando autorizada.',
    'Todo preço é referência para a cotação final: confira os itens marcados [CONFERIR] antes de enviar ao cliente.',
  ];
  ws.getRow(linha).getCell(3).value = 'NOTAS';
  ws.getRow(linha).font = { bold: true };
  linha++;
  for (const n of notas) {
    ws.mergeCells(linha, 3, linha, 12);
    ws.getRow(linha).getCell(3).value = n;
    ws.getRow(linha).getCell(3).alignment = { wrapText: true };
    linha++;
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

module.exports = { ORIGENS, DESCRICAO_ORIGEM, classificarPreco, resumirPorOrigem, gerarPlanilhaPrecos, mediana };
