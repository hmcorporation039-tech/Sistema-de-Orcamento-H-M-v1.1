// Teste das entregas do projeto (_comum/entrega.js): marca AS BUILT no Word,
// no Excel (sem perder fórmulas) e no QElectroTech, e o pacote ZIP. Usa os
// documentos reais gerados pelas skills a partir dos exemplos.
// Rodar: node _comum/teste-entrega.js
const assert = require('assert');
const path = require('path');
const JSZip = require('jszip');
const ExcelJS = require('exceljs');
const E = require('./entrega');
const { UNIFILARES } = require('./cad/unifilar');

const skill = (pasta) => require(path.join(__dirname, '..', pasta, 'scripts', 'lib', 'index.js'));
let ok = 0;
let falhas = 0;
async function caso(nome, fn) {
  try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { falhas++; console.log(`  FALHOU ${nome}: ${e.message}`); }
}

async function formulas(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  let n = 0;
  wb.eachSheet(ws => ws.eachRow(r => r.eachCell(c => { if (c.formula || c.sharedFormula) n++; })));
  return { wb, n };
}

(async () => {
  const opcoes = { revisao: 'R02 — As built', data: '2026-10-27' };

  await caso('texto e revisão sugerida do as-built', () => {
    assert.strictEqual(E.textoAsBuilt(opcoes), 'AS BUILT — conforme executado — Rev. R02 — As built — 27/10/2026');
    assert.strictEqual(E.revisaoAsBuiltSugerida('R00 — emissão inicial'), 'R01 — As built');
    assert.strictEqual(E.revisaoAsBuiltSugerida('R09'), 'R10 — As built');
    assert.strictEqual(E.revisaoAsBuiltSugerida(''), 'R01 — As built');
  });

  await caso('cabeçalho do Excel troca só a seção central', () => {
    assert.strictEqual(E.cabecalhoComCentro('&LH&&M&Rpág. &P', 'AS BUILT'), '&LH&&M&CAS BUILT&Rpág. &P');
    assert.strictEqual(E.cabecalhoComCentro('', 'AS BUILT'), '&CAS BUILT');
    assert.strictEqual(E.cabecalhoComCentro('Título', 'X'), '&CX');
  });

  await caso('Word: memorial do CFTV com a faixa AS BUILT no corpo e nos cabeçalhos', async () => {
    const m = skill('cftv');
    const g = await m.gerarDocumento(m.processar(m.exemplo()), 'memorial');
    const marcado = await E.marcarAsBuiltDocx(g.buffer, opcoes);
    const zip = await JSZip.loadAsync(marcado);
    const corpo = await zip.file('word/document.xml').async('string');
    assert.ok(corpo.indexOf('AS BUILT — conforme executado') < corpo.indexOf('MEMORIAL DESCRITIVO'), 'a faixa vem antes do título');
    const cabecalhos = Object.keys(zip.files).filter(n => /^word\/header\d*\.xml$/.test(n));
    assert.ok(cabecalhos.length >= 1);
    for (const h of cabecalhos) assert.ok((await zip.file(h).async('string')).includes('AS BUILT'), `${h} sem a marca`);
    // o original continua igual (a marca é só na cópia)
    assert.ok(!(await (await JSZip.loadAsync(g.buffer)).file('word/document.xml').async('string')).includes('AS BUILT'));
  });

  await caso('Excel: quadro de cargas da elétrica com a marca e as MESMAS fórmulas', async () => {
    const m = skill('eletrica');
    const g = await m.gerarDocumento(m.processar(m.exemplo()), 'planilha');
    const antes = await formulas(g.buffer);
    const marcado = await E.marcarAsBuiltXlsx(g.buffer, opcoes);
    const depois = await formulas(marcado);
    assert.ok(antes.n > 0, 'a planilha de teste tem fórmulas');
    assert.strictEqual(depois.n, antes.n);
    assert.ok(depois.wb.getWorksheet('AS BUILT'), 'aba AS BUILT');
    depois.wb.eachSheet(ws => assert.ok(/AS BUILT/.test(ws.headerFooter?.oddHeader || ''), `aba ${ws.name} sem cabeçalho`));
  });

  await caso('QElectroTech: título, folhas, revisão e data do as-built', () => {
    const m = skill('eletrica');
    const { xml } = UNIFILARES.eletrica(m.processar(m.exemplo()), { quadro: 'QD-01' });
    const marcado = E.marcarAsBuiltQet(xml, opcoes);
    assert.match(marcado, /<project title="AS BUILT — /);
    const folhas = marcado.match(/<diagram\b[^>]*>/g);
    assert.ok(folhas.length >= 1);
    folhas.forEach(f => { assert.match(f, /title="AS BUILT — /); assert.match(f, /indexrev="R02 AS BUILT"/); assert.match(f, /date="20261027"/); });
    assert.strictEqual(marcado.length > xml.length, true);
  });

  await caso('ZIP com subpastas e acentos volta igual', async () => {
    const zipBuf = await E.zipar([{ nome: 'Definições técnicas/Memorial.docx', buffer: Buffer.from('a') }, { nome: 'Folha de entrega.pdf', buffer: Buffer.from('b') }]);
    const zip = await JSZip.loadAsync(zipBuf);
    assert.deepStrictEqual(Object.keys(zip.files).filter(n => !zip.files[n].dir).sort(), ['Definições técnicas/Memorial.docx', 'Folha de entrega.pdf']);
    assert.strictEqual(await zip.file('Folha de entrega.pdf').async('string'), 'b');
  });

  console.log(`_comum/teste-entrega.js: ${ok}/${ok + falhas} casos OK`);
  process.exitCode = falhas ? 1 : 0;
})();
