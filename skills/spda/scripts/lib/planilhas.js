// Planilhas Excel: medições de campo (com resultado calculado por fórmula) e
// materiais + resumo do risco (com coluna de preço para o orçamento).

const ExcelJS = require('exceljs');
const { rotuloNp } = require('./dimensionamento');

const PRETO = 'FF1A1A1A';
const DOURADO = 'FFC9A227';

function estilizarCabecalho(ws) {
  const linha = ws.getRow(1);
  linha.eachCell(c => {
    c.font = { bold: true, color: { argb: DOURADO } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRETO } };
    c.alignment = { vertical: 'middle', wrapText: true };
  });
  linha.height = 22;
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

async function gerarPlanilhaMedicoes(res, caminho) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'H&M Engenharia e Tecnologia LTDA';

  const ws = wb.addWorksheet('Continuidade');
  ws.columns = [
    { header: 'Ponto', key: 'ponto', width: 8 },
    { header: 'Ensaio (Anexo F)', key: 'tipo', width: 10 },
    { header: 'Origem', key: 'origem', width: 34 },
    { header: 'Destino', key: 'destino', width: 34 },
    { header: 'Medido (Ω)', key: 'valor', width: 11 },
    { header: 'Limite (Ω)', key: 'limite', width: 10 },
    { header: 'Resultado', key: 'resultado', width: 11 },
    { header: 'Critério', key: 'criterio', width: 46 },
    { header: 'Data/hora', key: 'hora', width: 14 },
    { header: 'Observação', key: 'obs', width: 30 },
  ];
  res.ensaios.forEach((e, i) => {
    const n = i + 2;
    ws.addRow({
      ponto: e.ponto, tipo: e.tipo_ensaio, origem: e.origem, destino: e.destino,
      valor: e.valor_ohm ?? null, limite: e.limite, criterio: e.criterio,
      resultado: { formula: `IF(E${n}="","NV",IF(E${n}<=F${n},"C","NC"))` },
    });
  });
  estilizarCabecalho(ws);
  ws.addConditionalFormatting({
    ref: `G2:G${Math.max(2, res.ensaios.length + 1)}`,
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'NC', style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF8CBAD' } } } },
      { type: 'containsText', operator: 'containsText', text: 'NV', style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFF2CC' } } } },
    ],
  });

  const wa = wb.addWorksheet('Aterramento (informativo)');
  wa.columns = [
    { header: 'Ponto', key: 'ponto', width: 10 }, { header: 'Método', key: 'metodo', width: 22 },
    { header: 'Distância da corrente (m)', key: 'dist', width: 14 }, { header: 'Resistência (Ω)', key: 'r', width: 14 },
    { header: 'Condição do solo', key: 'solo', width: 24 }, { header: 'Observação', key: 'obs', width: 30 },
  ];
  ((res.dados.inspecao || {}).aterramento || []).forEach(a => wa.addRow({ ponto: a.ponto, metodo: a.metodo, dist: a.distancia_m, r: a.valor_ohm, solo: a.condicao_solo }));
  estilizarCabecalho(wa);

  const wi = wb.addWorksheet('Instrumentos');
  wi.columns = ['Instrumento', 'Fabricante', 'Modelo', 'Nº série', 'Certificado', 'Validade', 'Uso'].map(h => ({ header: h, width: 18 }));
  ((res.dados.inspecao || {}).instrumentos || []).forEach(i => wi.addRow([i.instrumento, i.fabricante, i.modelo, i.serie, i.certificado, i.validade, i.uso]));
  estilizarCabecalho(wi);

  if (!caminho) return Buffer.from(await wb.xlsx.writeBuffer()); // sem caminho: devolve o arquivo em memória
  await wb.xlsx.writeFile(caminho);
  return caminho;
}

async function gerarPlanilhaMateriaisRisco(res, caminho) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'H&M Engenharia e Tecnologia LTDA';

  if (res.dim) {
    const wm = wb.addWorksheet('Materiais');
    wm.columns = [
      { header: 'Cód.', key: 'cod', width: 8 }, { header: 'Descrição', key: 'desc', width: 70 },
      { header: 'Un.', key: 'un', width: 6 }, { header: 'Qtd.', key: 'qtd', width: 9 },
      { header: 'Preço unit. (R$)', key: 'preco', width: 14 }, { header: 'Total (R$)', key: 'total', width: 14 },
      { header: 'Referência', key: 'ref', width: 34 },
    ];
    res.dim.materiais.forEach((m, i) => {
      const n = i + 2;
      wm.addRow({ cod: m.codigo, desc: m.descricao, un: m.unidade, qtd: m.quantidade, preco: null, total: { formula: `IF(E${n}="","",D${n}*E${n})` }, ref: m.referencia });
    });
    const ult = res.dim.materiais.length + 1;
    const tot = wm.addRow({ desc: 'TOTAL', total: { formula: `SUM(F2:F${ult})` } });
    tot.font = { bold: true };
    wm.getColumn('preco').numFmt = '#,##0.00';
    wm.getColumn('total').numFmt = '#,##0.00';
    estilizarCabecalho(wm);
  }

  if (res.risco) {
    const a = res.risco.atual;
    const wr = wb.addWorksheet('Risco');
    wr.columns = [
      { header: 'Zona', width: 48 }, ...['RA', 'RB', 'RC', 'RM', 'RU', 'RV', 'RW', 'RZ', 'R1 zona', 'F', 'FT'].map(h => ({ header: h, width: 11 })),
    ];
    a.zonas.forEach(z => wr.addRow([z.zona.nome, ...['RA', 'RB', 'RC', 'RM', 'RU', 'RV', 'RW', 'RZ'].map(k => z.comp[k]), z.R1, z.FT == null ? null : z.F, z.FT]));
    wr.addRow([]);
    wr.addRow(['R1 total', null, null, null, null, null, null, null, null, a.R1]).font = { bold: true };
    wr.addRow(['RT (tolerável)', null, null, null, null, null, null, null, null, a.RT.R1]);
    wr.addRow(['Situação', null, null, null, null, null, null, null, null, a.atendeR1 && a.atendeF ? 'ATENDE' : 'NÃO ATENDE']).font = { bold: true };
    for (let c = 2; c <= 12; c++) wr.getColumn(c).numFmt = '0.00E+00';
    estilizarCabecalho(wr);

    const wc = wb.addWorksheet('Cenários');
    wc.columns = [
      { header: 'NP do SPDA', width: 26 }, { header: 'NP dos DPS', width: 26 }, { header: 'Fibra óptica', width: 12 },
      { header: 'R1', width: 12 }, { header: 'F (pior zona)', width: 12 }, { header: 'Atende', width: 10 },
    ];
    res.risco.cenarios.forEach(c => wc.addRow([c.np_spda, rotuloNp(c.dps_np), c.fibra ? 'sim' : 'não', c.R1, c.F, c.atende ? 'SIM' : 'não']));
    wc.getColumn(4).numFmt = '0.00E+00';
    wc.getColumn(5).numFmt = '0.00E+00';
    estilizarCabecalho(wc);
  }

  if (!caminho) return Buffer.from(await wb.xlsx.writeBuffer()); // sem caminho: devolve o arquivo em memória
  await wb.xlsx.writeFile(caminho);
  return caminho;
}

module.exports = { gerarPlanilhaMedicoes, gerarPlanilhaMateriaisRisco };
