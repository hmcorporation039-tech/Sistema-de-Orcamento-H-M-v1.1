// Teste do leitor de DXF de PROJETO (./projetoDxf.js) com um desenho SINTÉTICO
// gerado aqui (nenhum dado de cliente): 2 salas, tomadas e câmeras em blocos,
// legenda da prancha, eletroduto em layer própria e uma referência externa
// (xref) com bloco que não pode entrar na contagem.
// Rodar: node _comum/cad/teste-projeto-dxf.js
const assert = require('assert');
const { DesenhoDxf } = require('./dxf');
const { lerArquitetura } = require('./arquitetura');
const { lerProjetoDxf, nomeLimpoDoBloco, RE_TITULO_LEGENDA } = require('./projetoDxf');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
};

function desenho() {
  const g = new DesenhoDxf({ layers: [
    { nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'INST - TOMADAS', cor: 1 }, { nome: 'CFTV', cor: 3 },
    { nome: 'INST - ELETRODUTO', cor: 2 }, { nome: 'TEXTO', cor: 7 }, { nome: 'ARQ-XREF', cor: 9 },
  ] });
  g.polilinha([[0, 0], [6, 0], [6, 4], [0, 4]], { layer: 'A-PAREDE', fechada: true });
  g.polilinha([[6.15, 0], [10, 0], [10, 4], [6.15, 4]], { layer: 'A-PAREDE', fechada: true });
  g.texto(2.5, 2, 0.2, 'SALA DE ESTAR', { layer: 'A-TEXTO' });
  g.texto(7.5, 2, 0.2, 'ESCRITORIO', { layer: 'A-TEXTO' });
  g.bloco('TB-T', (b) => { b.addLWPolyline([{ point: { x: -0.1, y: -0.1 } }, { point: { x: 0.1, y: -0.1 } }, { point: { x: 0.1, y: 0.1 } }, { point: { x: -0.1, y: 0.1 } }], { flags: 1, layerName: '0' }); });
  g.bloco('CAM-DOME', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.15, { layerName: '0' }); });
  // 5 tomadas na sala, 3 no escritório, 2 câmeras na sala
  for (const x of [0.5, 1.5, 2.5, 3.5, 4.5]) g.inserir('TB-T', x, 0.3, { layer: 'INST - TOMADAS' });
  for (const x of [7, 8, 9]) g.inserir('TB-T', x, 0.3, { layer: 'INST - TOMADAS' });
  g.inserir('CAM-DOME', 1, 3.5, { layer: 'CFTV' });
  g.inserir('CAM-DOME', 5, 3.5, { layer: 'CFTV' });
  // legenda: o símbolo da legenda não conta
  g.texto(20, 10, 0.25, 'LEGENDA', { layer: 'TEXTO' });
  g.inserir('TB-T', 20.2, 9.4, { layer: 'INST - TOMADAS' });
  g.texto(20.8, 9.35, 0.2, 'TOMADA BAIXA 2P+T H=0,30m', { layer: 'TEXTO' });
  // eletroduto: 10 m em linha + 5,5 m em polilinha
  g.linha(0, -1, 10, -1, 'INST - ELETRODUTO');
  g.polilinha([[0, -2], [3, -2], [3, 0.5]], { layer: 'INST - ELETRODUTO' });
  // referência externa (contêiner > 3 m) com um bloco pequeno dentro: é base, não projeto
  g.bloco('SIMB-X', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.1, { layerName: '0' }); });
  g.bloco('XREF-ARQUITETURA', (b) => {
    b.addLine({ x: 0, y: 0, z: 0 }, { x: 12, y: 0, z: 0 }, { layerName: '0' });
    for (const x of [1, 2, 3]) b.addInsert('SIMB-X', { x, y: 1, z: 0 }, { layerName: '0' });
  });
  g.inserir('XREF-ARQUITETURA', 0, 20, { layer: 'ARQ-XREF' });
  return g.toString();
}

const texto = desenho();
const arq = lerArquitetura(texto);
const p = lerProjetoDxf(texto, { fator: arq.fatorUnidade, reLayerLinha: /ELETRODUT/i });
const grupo = (n) => p.simbolos.find(s => s.nomeLimpo === n);

caso('arquitetura do desenho: 2 ambientes', () => {
  assert.deepStrictEqual(arq.ambientes.map(a => a.nome).sort(), ['ESCRITORIO', 'SALA DE ESTAR']);
});

caso('tomadas contadas sem a da legenda, com a descrição da legenda', () => {
  const t = grupo('TB-T');
  assert.strictEqual(t.quantidade, 8);
  assert.strictEqual(t.descricaoLegenda, 'TOMADA BAIXA 2P+T H=0,30m');
  assert.strictEqual(t.fora, false);
  assert.strictEqual(t.posicoes.length, 8);
});

caso('câmeras com a posição em metros', () => {
  const c = grupo('CAM-DOME');
  assert.strictEqual(c.quantidade, 2);
  assert.deepStrictEqual(c.posicoes[0], [1, 3.5]);
});

caso('bloco só dentro de referência externa fica de fora', () => {
  const x = grupo('SIMB-X');
  assert.strictEqual(x.quantidade, 3);
  assert.strictEqual(x.fora, true);
});

caso('eletroduto medido na layer: 10 + 5,5 m', () => {
  const l = p.linhas.find(x => x.layer === 'INST - ELETRODUTO');
  assert.ok(l && Math.abs(l.metros - 15.5) < 0.05, JSON.stringify(p.linhas));
});

caso('texto remontado tem os rótulos e a legenda', () => {
  assert.match(p.texto, /SALA DE ESTAR/);
  assert.match(p.texto, /TOMADA BAIXA 2P\+T/);
  assert.strictEqual(p.legenda, 'LEGENDA');
});

caso('título de legenda: CONVENÇÕES sim, LEGENDA CORTE não', () => {
  assert.ok(RE_TITULO_LEGENDA.test('CONVENÇÕES:'));
  assert.ok(RE_TITULO_LEGENDA.test('LEGENDA DE ILUMINAÇÃO'));
  assert.ok(!RE_TITULO_LEGENDA.test('LEGENDA CORTE:'));
  assert.ok(!RE_TITULO_LEGENDA.test('LEGENDA DE FIXAÇÃO DAS LUMINÁRIAS'));
});

caso('nome de família do Revit sem o id e a vista', () => {
  assert.strictEqual(nomeLimpoDoBloco('_5L_Difusor linear_TROX_VSD50 - VSD50-2-VS-M-14886346-3P - FORRO REFLETIDO'), 'Difusor linear TROX VSD50 - VSD50-2-VS-M');
  assert.strictEqual(nomeLimpoDoBloco('OFEletrico_DR_Bipolar - OFEletrico_DR_Bipolar-V15-Detalhe'), 'DR Bipolar');
  assert.strictEqual(nomeLimpoDoBloco('TB-T1'), 'TB-T1');
});

console.log(`projetoDxf: ${ok} casos ok`);
