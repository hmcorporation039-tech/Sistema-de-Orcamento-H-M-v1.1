// Apresentação da planilha Excel do orçamento (services/planilhaOrcamentoCliente.js +
// skills/_comum/excel-estilo.js e empresa.js): faixa de título com logo, cabeçalho e
// rodapé de impressão alinhados, impressão A4 ajustada à largura com títulos repetidos.
// Dados SINTÉTICOS, sem banco. Rodar: npm test (pasta backend).
const assert = require('assert');
const ExcelJS = require('exceljs');
const { montarPlanilhaCliente } = require('../src/services/planilhaOrcamentoCliente');
const { rodapeExcel, cabecalhoExcel } = require(require('path').join(require('../src/config/caminhos').COMUM, 'empresa.js'));

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack}`); process.exitCode = 1; } };

(async () => {
  const p = { numero: 'P999', cliente_nome: 'Cliente Teste', local_obra: 'Obra Teste', bdi: 20, imposto_venda: 8.6, imposto_servico: 6, validade: 15, total: 0 };
  const secoes = [{ id: 1, nome: 'Materiais', ordem: 1 }, { id: 2, nome: 'Mão de obra', ordem: 2 }];
  const itens = [
    { id: 1, secao_id: 1, descricao: 'Cabo UTP Cat.6', unidade: 'm', quantidade: 100, valor_unitario: 3.5, subgrupo: 'Redes' },
    { id: 2, secao_id: 2, descricao: 'Instalação de ponto', unidade: 'pt', quantidade: 10, valor_unitario: 69, subgrupo: 'Redes' },
  ];
  const { buffer } = await montarPlanilhaCliente({ p, secoes, itens });
  const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);

  await caso('cabeçalho e rodapé de impressão: sem espaço sobrando, rodapé à esquerda e página à direita', () => {
    const rod = rodapeExcel();
    assert.ok(/^&L&"Arial"&7H&&M Engenharia/.test(rod), rod);
    assert.ok(rod.includes('&R&"Arial,Bold"&8Página &P de &N'));
    assert.ok(!/&C/.test(rod), 'rodapé não usa mais o centro (encostava na página)');
    assert.ok(rod.length <= 255);
    assert.ok(/^&L&"Arial,Bold"&9H&&M/.test(cabecalhoExcel('Orçamento P1')));
    assert.ok(cabecalhoExcel('2026 — Orçamento').includes('&8 2026'), 'título com algarismo no início não gruda no tamanho da fonte');
  });

  await caso('toda aba: faixa de título mesclada com logo, A4 ajustado à largura e timbrado', () => {
    assert.deepStrictEqual(wb.worksheets.map(w => w.name), ['Instruções', 'Parâmetros', 'Orçamento', 'Resumo', 'Curva ABC', 'Quantitativos', 'Pesquisa de Preços', 'Fornecedores', 'Cronograma']);
    for (const ws of wb.worksheets) {
      assert.strictEqual(ws.getImages().length, 1, `${ws.name}: logo`);
      assert.ok(ws.pageSetup.fitToPage && ws.pageSetup.fitToWidth === 1 && ws.pageSetup.fitToHeight === 0, `${ws.name}: ajuste à largura`);
      assert.strictEqual(ws.pageSetup.paperSize, 9, `${ws.name}: A4`);
      assert.ok(ws.headerFooter.oddFooter.includes('Página &P de &N'), `${ws.name}: rodapé`);
      assert.match(ws.headerFooter.oddHeader, /^&L/, `${ws.name}: cabeçalho`);
    }
    for (const nome of ['Orçamento', 'Pesquisa de Preços', 'Cronograma', 'Curva ABC']) assert.strictEqual(wb.getWorksheet(nome).pageSetup.orientation, 'landscape', `${nome}: paisagem`);
    for (const nome of ['Parâmetros', 'Resumo', 'Instruções']) assert.strictEqual(wb.getWorksheet(nome).pageSetup.orientation, 'portrait', `${nome}: retrato`);
    assert.strictEqual(wb.getWorksheet('Orçamento').pageSetup.printTitlesRow, '4:4');
  });

  await caso('Orçamento: título, subtítulo com fórmula, cabeçalho preto e linhas de sistema/subtotal/total destacadas', () => {
    const ws = wb.getWorksheet('Orçamento');
    assert.ok(ws.model.merges.includes('A1:N1') && ws.model.merges.includes('A2:N2'));
    assert.match(ws.getCell('A1').value, /PLANILHA ORÇAMENTÁRIA/);
    assert.ok(ws.getCell('A2').value.formula, 'o subtítulo continua sendo a fórmula');
    assert.strictEqual(ws.getCell('A4').fill.fgColor.argb, 'FF141414');
    assert.strictEqual(ws.getCell('A5').fill.fgColor.argb, 'FFF2F2F2'); // título do sistema
    assert.strictEqual(ws.getCell('A5').alignment.horizontal, 'left');
    const sub = [...Array(ws.rowCount)].map((_, i) => i + 1).find(l => /^Subtotal/.test(ws.getCell(l, 3).value || ''));
    assert.strictEqual(ws.getCell(sub, 10).fill.fgColor.argb, 'FFFBF4DE');
    assert.strictEqual(ws.getCell(ws.rowCount, 10).fill.fgColor.argb, 'FF141414'); // TOTAL CUSTO DIRETO
    assert.strictEqual(ws.getCell('F6').font.color.argb, 'FF1F4E9E', 'fonte azul = valor digitado continua');
  });

  await caso('Resumo: o preço final continua na mesma célula (as fórmulas não se mexeram)', () => {
    const ws = wb.getWorksheet('Resumo');
    assert.strictEqual(ws.getCell('A1').value, 'RESUMO DO ORÇAMENTO');
    assert.strictEqual(ws.getCell('A4').value, 'Sistema');
    assert.ok(/ROUND/.test(ws.getCell('D12').value.formula || ''), JSON.stringify(ws.getCell('D12').value));
  });

  console.log(`planilhaExcel: ${ok} casos ok`);
})();
