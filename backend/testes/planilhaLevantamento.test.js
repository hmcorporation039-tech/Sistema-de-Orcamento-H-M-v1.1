// Levantamento de quantitativos da análise (services/agentes/planilhaLevantamento.js, 20/11/2026): a contagem de
// pontos que o agente de análise mostra e a planilha no padrão H&M. Dados SINTÉTICOS (nenhum dado de cliente).
// Rodar: node testes/planilhaLevantamento.test.js (pasta backend).
const assert = require('assert');
const ExcelJS = require('exceljs');
const L = require('../src/services/agentes/planilhaLevantamento');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

const analise = {
  id: 999, nomeProjeto: 'Projeto Exemplo', disciplinas: ['eletrica'],
  cameras: { total: 0 }, pontosRedeAntena: { rede: { total: 0 }, antena: { total: 0 } },
  dadosExtraidos: [{ arquivo: 'EXEMPLO.dwg', aviso: 'Diagrama sem circuitos lidos [CONFERIR]', desenho: [{ origem: 'cad', pagina: 'DWG', itens: [
    { tipo: 'simbolo', descricao: 'Condulete C - Tomada média — bloco HM-ELE-TOMADA-BAIXA', quantidade: 32, disciplina: 'eletrica', conferir: true },
    { tipo: 'simbolo', descricao: 'Interruptor - 1x simples', quantidade: 11, disciplina: 'eletrica' },
    { tipo: 'simbolo', descricao: 'Luminária (embutir/sobrepor)', quantidade: 88, disciplina: 'iluminacao' },
    { tipo: 'simbolo', descricao: 'Ambígua', quantidade: 5, disciplina: 'eletrica', ambiguo: true },
    { tipo: 'linha', descricao: 'Eletroduto — medido no desenho', metros: 120.44, disciplina: 'eletrica' },
  ] }] }],
  pontosPorDisciplina: [{ disciplina: 'eletrica', itens: [{ descricao: 'Quadro de distribuição', quantidade: 1 }] }],
  pontosPorAmbiente: [{ ambiente: 'SALA', cftv: 2, rede: 3, antena: 0, total: 5 }],
  servicos: [{ codigo: 'ele_interruptor', descricao: 'Instalação de interruptor', quantidade: 11, unidade: 'un', disciplina: 'eletrica', observacao: 'contagem' }],
  materiais: [{ descricao: 'Interruptor simples/paralelo', quantidade: 0, unidade: 'un', disciplina: 'eletrica' }],
  achados: [{ tema: 'Folhas', observacao: 'planta + diagrama' }],
};

caso('contagem: símbolos, trechos e leitura visual; ambíguo marcado; disciplina não marcada sinalizada', () => {
  const c = L.contagemDaAnalise(analise);
  const por = Object.fromEntries(c.map(x => [x.descricao, x]));
  assert.strictEqual(por['Condulete C - Tomada média'].quantidade, 32, 'sem o " — bloco"');
  assert.strictEqual(por['Condulete C - Tomada média'].conferir, true);
  assert.strictEqual(por['Interruptor - 1x simples'].marcada, true);
  assert.strictEqual(por['Luminária (embutir/sobrepor)'].marcada, false, 'iluminação não foi marcada');
  assert.strictEqual(por['Eletroduto — medido no desenho'].unidade, 'm');
  assert.strictEqual(por['Quadro de distribuição'].origem, 'leitura visual do PDF (Claude)');
  // ambíguo (não conferido no mapa do CAD): aparece, marcado — o orçamento é que não usa
  assert.deepStrictEqual([por['Ambígua'].pendenteMapa, por['Ambígua'].conferir], [true, true]);
  assert.match(por['Ambígua'].origem, /aguardando conferência no mapa/);
  assert.ok(c.findIndex(x => x.marcada === false) > c.findIndex(x => x.descricao === 'Interruptor - 1x simples'), 'marcadas primeiro');
});

caso('planilha: abas do padrão H&M, contagem com subtotal em fórmula e pendências', async () => {
  const buf = await L.gerarPlanilhaLevantamento({ analise });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  assert.deepStrictEqual(wb.worksheets.map(w => w.name), ['Contagem de pontos', 'Pontos por ambiente', 'Serviços', 'Materiais', 'Pendências']);
  const ws = wb.getWorksheet('Contagem de pontos');
  assert.match(String(ws.getCell('A1').value), /LEVANTAMENTO DE QUANTITATIVOS/);
  assert.strictEqual(ws.getCell('B7').value, 'Descrição');
  const formulas = [];
  ws.eachRow(r => r.eachCell(c => { if (c.value && c.value.formula) formulas.push(c.value.formula); }));
  assert.ok(formulas.some(f => /^SUMIFS\(C\d+:C\d+,D\d+:D\d+,"un"\)$/.test(f)), formulas.join(' | '));
  const textos = [];
  wb.getWorksheet('Pendências').eachRow(r => textos.push(r.values.join(' ')));
  assert.ok(textos.some(t => /Disciplina não marcada/.test(t)));
  assert.ok(textos.some(t => /CONFERIR/.test(t)));
});

caso('planilha: análise vazia não quebra (aviso na contagem)', async () => {
  const buf = await L.gerarPlanilhaLevantamento({ analise: { id: 1, disciplinas: ['cftv'] } });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  assert.match(String(wb.getWorksheet('Contagem de pontos').getCell('A8').value), /Nada foi contado/);
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack}`); process.exitCode = 1; }
  }
  console.log(`planilhaLevantamento: ${ok} casos ok`);
  process.exit(process.exitCode || 0);
})();
