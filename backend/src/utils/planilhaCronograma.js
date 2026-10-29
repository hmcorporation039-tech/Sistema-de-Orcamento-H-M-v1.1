// Planilha Excel do CRONOGRAMA FÍSICO-FINANCEIRO da obra (versão 2.0, Fase 3G),
// no estilo da planilha do cliente (planilhaOrcamentoCliente.js): cabeçalho
// escuro, fonte azul = valor digitado, fórmulas para o cliente mexer.
//   Cronograma — etapas × períodos: % previsto (azul) e R$ (fórmula), Gantt por
//                formatação condicional, totais previsto no período/acumulado,
//                % físico e financeiro previstos (fórmulas) e o realizado das
//                medições (% físico, R$ medido, desvio).
//   Medições   — histórico completo (vigentes e corrigidas).
//   Curva S    — previsto × realizado acumulado (fórmulas na aba Cronograma) e
//                gráfico de linhas nativo do Excel (o exceljs não gera gráfico;
//                o XML do gráfico é acrescentado ao pacote no fim).
// Sem banco: recebe tudo pronto do controller (dados + calcularCronograma).
const path = require('path');
const ExcelJS = require('exceljs');
const { COMUM } = require('../config/caminhos');
// papel timbrado (empresa e página no cabeçalho/rodapé de impressão): skills/_comum/empresa.js
const { EMPRESA, timbrarPastaDeTrabalho } = require(path.join(COMUM, 'empresa.js'));
// jszip é dependência do próprio exceljs (sem pacote novo no projeto)
const JSZip = require(require.resolve('jszip', { paths: [path.dirname(require.resolve('exceljs'))] }));

const AZUL = { color: { argb: 'FF1F4E9E' } };
const CAB = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1F1F' } };
const TOTAL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4D6' } };
const DOURADO = { color: { argb: 'FFC9A227' }, bold: true };
const CINZA = { color: { argb: 'FF777777' } };
const MOEDA = '"R$" #,##0.00';
const PCT = '0.00%';
const DATA = 'dd/mm/yyyy';

const paraDataExcel = (iso) => { if (!iso) return null; const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number); return new Date(Date.UTC(a, m - 1, d)); };
const xml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

function cabecalho(ws, linha, titulos) {
  const r = ws.getRow(linha);
  titulos.forEach((t, i) => { const c = r.getCell(i + 1); c.value = t; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = CAB; c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; });
  r.height = 30;
}

const ROTULO_SITUACAO = { adiantado: 'Adiantado', atrasado: 'Atrasado', em_dia: 'Em dia', nao_iniciado: 'Não iniciado', concluida: 'Concluída' };

/**
 * dados: { obra, config, proposta, etapas (do banco, com distribuicao), historico (medições marcadas), calc }
 * Devolve Buffer do .xlsx.
 */
async function gerarPlanilhaCronograma({ obra, config, proposta, etapas, historico = [], calc }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = EMPRESA.razaoSocial;
  wb.created = new Date();
  const ws = wb.addWorksheet('Cronograma', { views: [{ state: 'frozen', xSplit: 2, ySplit: 6 }] });
  const wsM = wb.addWorksheet('Medições');
  const wsS = wb.addWorksheet('Curva S');

  const periodos = calc.periodos;
  const nP = periodos.length;
  const C0 = 10; // 1ª coluna de período (J)
  const col = (k) => ws.getColumn(C0 + k).letter;
  const manual = config?.criterio_peso === 'manual';

  // ── Cronograma ──
  ws.columns = [6, 44, 16, 9, 11, 11, 9, 10, 10, ...Array.from({ length: nP }, () => 13)].map(w => ({ width: w }));
  ws.getCell('A1').value = `${EMPRESA.razaoSocial.toUpperCase()} – CRONOGRAMA FÍSICO-FINANCEIRO`;
  ws.getCell('A1').font = { bold: true, size: 13 };
  ws.getCell('A2').value = `Obra: ${obra.codigo || ''} — ${obra.nome || ''}${obra.cliente_nome ? `   |   Cliente: ${obra.cliente_nome}` : ''}`;
  ws.getCell('A2').font = { bold: true };
  ws.getCell('A3').value = [
    proposta ? `Proposta de base: ${proposta.numero}` : 'Cronograma sem proposta de base',
    `Períodos: ${calc.periodicidade === 'semanal' ? 'semanais' : 'mensais'}`,
    `Peso físico: ${manual ? 'informado' : 'pelo valor da etapa'}`,
    `Referência: ${calc.resumo.data_referencia.split('-').reverse().join('/')}`,
  ].join('   |   ');
  ws.getCell('A4').value = 'Em azul: valor da etapa e % previsto de cada período (altere e a planilha recalcula). Dourado = Gantt (período com execução prevista). Realizado = medições registradas no sistema.';
  ws.getCell('A4').font = { italic: true, ...CINZA };
  cabecalho(ws, 6, ['Item', 'Etapa', 'Valor (R$)', 'Peso', 'Início', 'Término', 'Dias úteis', 'Previsto (soma)', 'Físico realizado', ...calc.rotulos]);

  const L1 = 7;
  const n = etapas.length;
  const LT = L1 + 2 * n; // linha do total
  const ultimaEt = LT - 1;
  etapas.forEach((e, i) => {
    const rA = L1 + 2 * i;
    const rB = rA + 1;
    const ce = calc.etapas[i];
    const A = ws.getRow(rA);
    A.getCell(1).value = i + 1;
    A.getCell(2).value = e.nome;
    A.getCell(2).font = { bold: true };
    const cv = A.getCell(3); cv.value = Number(e.valor) || 0; cv.numFmt = MOEDA; cv.font = AZUL;
    const cp = A.getCell(4);
    if (manual) { cp.value = (ce?.peso || 0) / 100; cp.font = AZUL; } else cp.value = { formula: `IF($C$${LT}=0,0,C${rA}/$C$${LT})`, result: (ce?.peso || 0) / 100 };
    cp.numFmt = PCT;
    if (e.inicio) { A.getCell(5).value = paraDataExcel(e.inicio); A.getCell(5).numFmt = DATA; }
    if (e.fim) { A.getCell(6).value = paraDataExcel(e.fim); A.getCell(6).numFmt = DATA; }
    if (e.inicio && e.fim) A.getCell(7).value = { formula: `NETWORKDAYS(E${rA},F${rA})` };
    const somaDist = (ce?.serie || []).reduce((s, x) => s + x.previsto_pct, 0);
    A.getCell(8).value = { formula: nP ? `SUM(${col(0)}${rA}:${col(nP - 1)}${rA})` : '0', result: somaDist / 100 };
    A.getCell(8).numFmt = PCT;
    const real = ce ? (ce.serie.length ? ce.serie[ce.serie.length - 1].realizado_acum_pct : 0) : 0;
    A.getCell(9).value = real / 100; A.getCell(9).numFmt = PCT;
    const B = ws.getRow(rB);
    B.getCell(2).value = '      previsto (R$)';
    B.getCell(2).font = { italic: true, ...CINZA };
    periodos.forEach((p, k) => {
      const x = ce?.serie[k];
      const c = A.getCell(C0 + k);
      c.value = x && x.previsto_pct ? x.previsto_pct / 100 : null;
      c.numFmt = PCT; c.font = AZUL; c.alignment = { horizontal: 'center' };
      const v = B.getCell(C0 + k);
      v.value = { formula: `IF(${col(k)}${rA}="","",$C$${rA}*${col(k)}${rA})`, result: x && x.previsto_pct ? x.previsto_valor : '' };
      v.numFmt = MOEDA; v.font = { size: 9, ...CINZA };
    });
  });

  // totais e curva (fórmulas)
  const linhas = {
    prev: LT, prevAc: LT + 1, finPrevAc: LT + 2, fisPrev: LT + 3, fisPrevAc: LT + 4,
    med: LT + 6, medAc: LT + 7, finRealAc: LT + 8, fisRealAc: LT + 9, desvio: LT + 10,
  };
  const rotulos = {
    prev: 'TOTAL  |  previsto no período (R$)', prevAc: 'Previsto acumulado (R$)', finPrevAc: '% financeiro previsto acumulado',
    fisPrev: '% físico previsto no período', fisPrevAc: '% físico previsto acumulado',
    med: 'Medido no período (R$)', medAc: 'Medido acumulado (R$)', finRealAc: '% financeiro realizado acumulado',
    fisRealAc: '% físico realizado acumulado', desvio: 'Desvio físico (realizado − previsto)',
  };
  Object.entries(linhas).forEach(([k, l]) => {
    const c = ws.getCell(l, 2); c.value = rotulos[k]; c.font = { bold: true };
    if (['prev', 'fisPrevAc', 'fisRealAc'].includes(k)) for (let j = 1; j < C0 + nP; j++) ws.getCell(l, j).fill = TOTAL;
  });
  ws.getCell(linhas.med - 1, 2).value = 'REALIZADO (medições)';
  ws.getCell(linhas.med - 1, 2).font = DOURADO;
  const tot = ws.getCell(LT, 3);
  tot.value = { formula: n ? `SUM(C${L1}:C${ultimaEt})` : '0', result: calc.resumo.valor_total }; tot.numFmt = MOEDA; tot.font = { bold: true };
  const totP = ws.getCell(LT, 4);
  totP.value = { formula: n ? `SUM(D${L1}:D${ultimaEt})` : '0', result: 1 }; totP.numFmt = PCT; totP.font = { bold: true };

  let kUltMed = -1;
  calc.curva.forEach((c, k) => { if (c.tem_medicao) kUltMed = k; });
  periodos.forEach((p, k) => {
    const L = col(k);
    const ant = k > 0 ? col(k - 1) : null;
    const cv = calc.curva[k];
    const set = (linha, formula, result, fmt, extra = {}) => {
      const c = ws.getCell(linha, C0 + k);
      c.value = formula != null ? { formula, result } : result;
      c.numFmt = fmt; Object.assign(c, extra);
    };
    set(linhas.prev, n ? `SUMPRODUCT($C$${L1}:$C$${ultimaEt},${L}${L1}:${L}${ultimaEt})` : '0', cv.previsto_valor, MOEDA, { font: { bold: true } });
    set(linhas.prevAc, ant ? `${ant}${linhas.prevAc}+${L}${linhas.prev}` : `${L}${linhas.prev}`, cv.previsto_valor_acum, MOEDA);
    set(linhas.finPrevAc, `IF($C$${LT}=0,0,${L}${linhas.prevAc}/$C$${LT})`, cv.financeiro_previsto_acum / 100, PCT);
    set(linhas.fisPrev, n ? `SUMPRODUCT($D$${L1}:$D$${ultimaEt},${L}${L1}:${L}${ultimaEt})` : '0',
      (cv.previsto_fisico_acum - (k > 0 ? calc.curva[k - 1].previsto_fisico_acum : 0)) / 100, PCT);
    set(linhas.fisPrevAc, ant ? `${ant}${linhas.fisPrevAc}+${L}${linhas.fisPrev}` : `${L}${linhas.fisPrev}`, cv.previsto_fisico_acum / 100, PCT, { font: { bold: true } });
    if (k <= kUltMed) {
      set(linhas.med, null, cv.realizado_valor, MOEDA);
      set(linhas.medAc, ant ? `${ant}${linhas.medAc}+${L}${linhas.med}` : `${L}${linhas.med}`, cv.realizado_valor_acum, MOEDA);
      set(linhas.finRealAc, `IF($C$${LT}=0,0,${L}${linhas.medAc}/$C$${LT})`, cv.financeiro_realizado_acum / 100, PCT);
      set(linhas.fisRealAc, null, cv.realizado_fisico_acum / 100, PCT, { font: { bold: true, color: { argb: 'FF1A7F3C' } } });
      set(linhas.desvio, `${L}${linhas.fisRealAc}-${L}${linhas.fisPrevAc}`, (cv.realizado_fisico_acum - cv.previsto_fisico_acum) / 100, '+0.00%;-0.00%;0.00%');
    }
  });
  if (nP && n) {
    ws.addConditionalFormatting({
      ref: `${col(0)}${L1}:${col(nP - 1)}${ultimaEt}`,
      rules: [{ type: 'expression', priority: 1, formulae: [`AND($A${L1}<>"",N(${col(0)}${L1})>0)`], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFC9A227' } }, font: { color: { argb: 'FF000000' } } } }],
    });
    ws.addConditionalFormatting({
      ref: `${col(0)}${linhas.desvio}:${col(nP - 1)}${linhas.desvio}`,
      rules: [
        { type: 'cellIs', priority: 2, operator: 'lessThan', formulae: ['-0.01'], style: { font: { color: { argb: 'FFC0392B' }, bold: true } } },
        { type: 'cellIs', priority: 3, operator: 'greaterThan', formulae: ['0.01'], style: { font: { color: { argb: 'FF1A7F3C' }, bold: true } } },
      ],
    });
  }
  const r = calc.resumo;
  const lr = linhas.desvio + 2;
  [
    ['Situação na referência', ROTULO_SITUACAO[r.situacao] || r.situacao],
    ['% físico previsto até a referência', r.fisico_previsto / 100, PCT],
    ['% físico realizado', r.fisico_realizado / 100, PCT],
    ['% financeiro realizado (medido ÷ total)', r.financeiro_realizado / 100, PCT],
    ['Valor medido acumulado (R$)', r.valor_medido_acum, MOEDA],
    ['Valor a medir no período de referência (R$)', r.valor_a_medir_periodo, MOEDA],
  ].forEach(([rot, val, fmt], i) => {
    ws.getCell(lr + i, 2).value = rot;
    const c = ws.getCell(lr + i, 3); c.value = val; if (fmt) c.numFmt = fmt; c.font = { bold: true };
  });

  // ── Medições ──
  wsM.columns = [12, 14, 44, 14, 16, 12, 50, 22, 18].map(w => ({ width: w }));
  wsM.getCell('A1').value = 'MEDIÇÕES — histórico completo (a correção é uma nova linha; a anterior fica como "Corrigida")';
  wsM.getCell('A1').font = { bold: true, size: 12 };
  cabecalho(wsM, 3, ['Data', 'Período', 'Etapa', '% físico acumulado', 'Valor medido (R$)', 'Situação', 'Observação', 'Registrado por', 'Registrado em']);
  historico.forEach((m, i) => {
    const R = wsM.getRow(4 + i);
    R.getCell(1).value = paraDataExcel(m.data_medicao); R.getCell(1).numFmt = DATA;
    R.getCell(2).value = m.periodo_rotulo || m.periodo;
    R.getCell(3).value = m.etapa_nome_atual || m.etapa_nome || '(etapa removida)';
    if (m.percentual_acumulado != null) { R.getCell(4).value = Number(m.percentual_acumulado) / 100; R.getCell(4).numFmt = PCT; }
    if (m.valor_medido != null) { R.getCell(5).value = Number(m.valor_medido); R.getCell(5).numFmt = MOEDA; }
    R.getCell(6).value = m.vigente ? 'Vigente' : 'Corrigida';
    if (!m.vigente) R.font = CINZA;
    R.getCell(7).value = m.observacao || '';
    R.getCell(8).value = m.usuario_nome || '';
    R.getCell(9).value = m.criado_em ? new Date(m.criado_em) : null; R.getCell(9).numFmt = 'dd/mm/yyyy hh:mm';
  });
  if (!historico.length) wsM.getCell('A4').value = 'Nenhuma medição registrada.';

  // ── Curva S ──
  wsS.columns = [14, 16, 16, 18, 18, 14].map(w => ({ width: w }));
  wsS.getCell('A1').value = 'CURVA S — % físico acumulado (previsto × realizado)';
  wsS.getCell('A1').font = { bold: true, size: 12 };
  cabecalho(wsS, 3, ['Período', 'Previsto', 'Realizado', 'Previsto acum. (R$)', 'Medido acum. (R$)', 'Desvio (p.p.)']);
  const PCT_NUM = '0.00"%"';
  periodos.forEach((p, k) => {
    const R = wsS.getRow(4 + k);
    const L = col(k);
    const cv = calc.curva[k];
    R.getCell(1).value = calc.rotulos[k];
    R.getCell(2).value = { formula: `Cronograma!${L}${linhas.fisPrevAc}*100`, result: cv.previsto_fisico_acum }; R.getCell(2).numFmt = PCT_NUM;
    R.getCell(4).value = { formula: `Cronograma!${L}${linhas.prevAc}`, result: cv.previsto_valor_acum }; R.getCell(4).numFmt = MOEDA;
    if (k <= kUltMed) {
      R.getCell(3).value = { formula: `Cronograma!${L}${linhas.fisRealAc}*100`, result: cv.realizado_fisico_acum }; R.getCell(3).numFmt = PCT_NUM;
      R.getCell(5).value = { formula: `Cronograma!${L}${linhas.medAc}`, result: cv.realizado_valor_acum }; R.getCell(5).numFmt = MOEDA;
      R.getCell(6).value = { formula: `C${4 + k}-B${4 + k}`, result: Math.round((cv.realizado_fisico_acum - cv.previsto_fisico_acum) * 100) / 100 }; R.getCell(6).numFmt = '+0.00;-0.00;0.00';
    }
  });

  timbrarPastaDeTrabalho(wb, 'Cronograma físico-financeiro');
  const buffer = await wb.xlsx.writeBuffer();
  return nP ? acrescentarGraficoCurvaS(buffer, { nome: 'Curva S', periodos: calc.rotulos, previsto: calc.curva.map(c => c.previsto_fisico_acum), realizado: calc.curva.map((c, k) => (k <= kUltMed ? c.realizado_fisico_acum : null)) }) : Buffer.from(buffer);
}

// ── gráfico nativo (DrawingML) ─────────────────────────────────────────
function serieXml(idx, titulo, colRef, ultima, valores, cor, tracejado) {
  const pts = valores.map((v, i) => (v == null ? '' : `<c:pt idx="${i}"><c:v>${Number(v)}</c:v></c:pt>`)).join('');
  return `<c:ser><c:idx val="${idx}"/><c:order val="${idx}"/>`
    + `<c:tx><c:strRef><c:f>'Curva S'!$${colRef}$3</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${xml(titulo)}</c:v></c:pt></c:strCache></c:strRef></c:tx>`
    + `<c:spPr><a:ln w="28575" cap="rnd"><a:solidFill><a:srgbClr val="${cor}"/></a:solidFill>${tracejado ? '<a:prstDash val="dash"/>' : ''}<a:round/></a:ln></c:spPr>`
    + `<c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr><a:solidFill><a:srgbClr val="${cor}"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="${cor}"/></a:solidFill></a:ln></c:spPr></c:marker>`
    + `<c:cat><c:strRef><c:f>'Curva S'!$A$4:$A$${ultima}</c:f><c:strCache><c:ptCount val="${valores.length}"/>__CAT__</c:strCache></c:strRef></c:cat>`
    + `<c:val><c:numRef><c:f>'Curva S'!$${colRef}$4:$${colRef}$${ultima}</c:f><c:numCache><c:formatCode>0.00</c:formatCode><c:ptCount val="${valores.length}"/>${pts}</c:numCache></c:numRef></c:val>`
    + '<c:smooth val="0"/></c:ser>';
}

async function acrescentarGraficoCurvaS(buffer, { nome, periodos, previsto, realizado }) {
  const zip = await JSZip.loadAsync(buffer);
  // descobre o arquivo da aba pelo nome (workbook.xml + rels)
  const wbXml = await zip.file('xl/workbook.xml').async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const mSheet = wbXml.match(new RegExp(`<sheet [^>]*name="${xml(nome)}"[^>]*r:id="([^"]+)"`));
  if (!mSheet) return Buffer.from(buffer);
  const mRel = relsXml.match(new RegExp(`<Relationship [^>]*Id="${mSheet[1]}"[^>]*Target="([^"]+)"`)) || relsXml.match(new RegExp(`<Relationship [^>]*Target="([^"]+)"[^>]*Id="${mSheet[1]}"`));
  if (!mRel) return Buffer.from(buffer);
  const sheetPath = `xl/${mRel[1].replace(/^\/?xl\//, '')}`;
  const sheetFile = sheetPath.split('/').pop();
  const sheetRelsPath = `xl/worksheets/_rels/${sheetFile}.rels`;
  const ultima = 3 + periodos.length;
  const cat = periodos.map((p, i) => `<c:pt idx="${i}"><c:v>${xml(p)}</c:v></c:pt>`).join('');
  const chart = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<c:roundedCorners val="0"/><c:chart>'
    + '<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="pt-BR" sz="1200" b="1"/><a:t>Curva S — % físico acumulado</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>'
    + '<c:autoTitleDeleted val="0"/><c:plotArea><c:layout/><c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>'
    + serieXml(0, 'Previsto', 'B', ultima, previsto, 'C9A227', false).replace('__CAT__', cat)
    + serieXml(1, 'Realizado', 'C', ultima, realizado, '1A7F3C', false).replace('__CAT__', cat)
    + '<c:marker val="1"/><c:axId val="50010001"/><c:axId val="50010002"/></c:lineChart>'
    + '<c:catAx><c:axId val="50010001"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="50010002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>'
    + '<c:valAx><c:axId val="50010002"/><c:scaling><c:orientation val="minMax"/><c:max val="100"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="D9D9D9"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="0&quot;%&quot;" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="50010001"/><c:crosses val="autoZero"/><c:crossBetween val="between"/><c:majorUnit val="10"/></c:valAx>'
    + '</c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>';
  const drawing = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
    + '<xdr:twoCellAnchor><xdr:from><xdr:col>7</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
    + '<xdr:to><xdr:col>17</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>24</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'
    + '<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Curva S"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>'
    + '<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">'
    + '<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/>'
    + '</a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>';
  zip.file('xl/charts/chart1.xml', chart);
  zip.file('xl/drawings/drawing1.xml', drawing);
  zip.file('xl/drawings/_rels/drawing1.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>');
  const relDrawing = '<Relationship Id="rIdCurvaS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>';
  const existente = zip.file(sheetRelsPath);
  if (existente) zip.file(sheetRelsPath, (await existente.async('string')).replace('</Relationships>', `${relDrawing}</Relationships>`));
  else zip.file(sheetRelsPath, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relDrawing}</Relationships>`);
  let sheet = await zip.file(sheetPath).async('string');
  const pos = ['<legacyDrawing', '<legacyDrawingHF', '<picture', '<oleObjects', '<controls', '<webPublishItems', '<tableParts', '<extLst', '</worksheet>']
    .map(t => sheet.indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0];
  sheet = `${sheet.slice(0, pos)}<drawing r:id="rIdCurvaS"/>${sheet.slice(pos)}`;
  zip.file(sheetPath, sheet);
  const tipos = await zip.file('[Content_Types].xml').async('string');
  zip.file('[Content_Types].xml', tipos.replace('</Types>',
    '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
    + '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>'));
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { gerarPlanilhaCronograma };
