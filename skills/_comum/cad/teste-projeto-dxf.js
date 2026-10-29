// Teste do leitor de DXF de PROJETO (./projetoDxf.js) com um desenho SINTÉTICO
// gerado aqui (nenhum dado de cliente): 2 salas, tomadas e câmeras em blocos,
// legenda da prancha, eletroduto em layer própria e uma referência externa
// (xref) com bloco que não pode entrar na contagem.
// Rodar: node _comum/cad/teste-projeto-dxf.js
const assert = require('assert');
const { DesenhoDxf } = require('./dxf');
const { lerArquitetura } = require('./arquitetura');
const { lerProjetoDxf, nomeLimpoDoBloco, numeroDaQtd, RE_TITULO_LEGENDA } = require('./projetoDxf');

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

// ── Revisão de 29/10/2026 (desenhos reais) — casos sintéticos ────────────
// Legenda ao lado da planta, com coluna QTD. A caixa fixa antiga (120 × 150
// alturas de letra) engolia as câmeras da planta à esquerda e dava a elas a
// descrição do acionador da mesma altura.
function desenhoLegenda() {
  const g = new DesenhoDxf({ layers: [{ nome: 'CFTV-CAMERA', cor: 3 }, { nome: 'INC-ACIONADOR', cor: 1 }, { nome: 'CAB-RACK', cor: 5 }, { nome: 'CAB-MON', cor: 5 }, { nome: 'LEGENDA', cor: 7 }, { nome: 'TEXTO-TAG', cor: 7 }] });
  const tag = [{ tag: 'TAG', x: 0.2, y: 0.1, altura: 0.1 }, { tag: 'ALTURA', x: 0.2, y: -0.1, altura: 0.1 }, { tag: 'DESCR', x: 0.2, y: -0.25, altura: 0.1 }];
  g.bloco('CFTV_CAMERA', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.15, { layerName: '0' }); }, tag);
  g.bloco('INC_ACIONADOR', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.12, { layerName: '0' }); }, tag);
  g.bloco('CAB_RACK', (b) => { b.addLWPolyline([[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]].map(([x, y]) => ({ point: { x, y } })), { flags: 1, layerName: '0' }); });
  g.bloco('MON_POSTO', (b) => { b.addLWPolyline([[-0.6, -0.3], [0.6, -0.3], [0.6, 0.3], [-0.6, 0.3]].map(([x, y]) => ({ point: { x, y } })), { flags: 1, layerName: '0' }); });
  // planta: 4 câmeras, 2 delas na coluna x = 32 (dentro da caixa antiga da legenda)
  const cam = (x, y, n, h) => g.inserir('CFTV_CAMERA', x, y, { layer: 'CFTV-CAMERA', atributos: { TAG: `CAM-0${n}`, ALTURA: h, DESCR: 'dome 4MP' } });
  cam(5, 5, 1, 'h=3,00m'); cam(10, 5, 2, 'h=2,80m'); cam(32, 18.5, 3, 'h=3,50m'); cam(32, 17.15, 4, 'teto');
  g.inserir('INC_ACIONADOR', 6, 12, { layer: 'INC-ACIONADOR', atributos: { TAG: 'AM-01', ALTURA: 'h=1,20m' } });
  g.inserir('INC_ACIONADOR', 12, 12, { layer: 'INC-ACIONADOR', atributos: { TAG: 'AM-02', ALTURA: 'h=1,20m' } });
  g.inserir('CAB_RACK', 14, 6, { layer: 'CAB-RACK' });
  g.inserir('MON_POSTO', 13, 5, { layer: 'CAB-MON' });
  // legenda: título h = 0,25; símbolo em x = 34,85; descrição em 35,4; QTD em 41,8
  g.texto(34.5, 21, 0.25, 'LEGENDA', { layer: 'LEGENDA' });
  const linha = (y, bloco, layer, desc, qtd) => {
    g.inserir(bloco, 34.85, y + 0.06, { layer });
    g.texto(35.4, y, 0.13, desc, { layer: 'LEGENDA' });
    if (qtd) g.texto(41.8, y, 0.13, qtd, { layer: 'LEGENDA' });
  };
  linha(18.45, 'INC_ACIONADOR', 'INC-ACIONADOR', 'Acionador manual h=1,20m', 'QTD: 2');
  linha(17.8, 'CFTV_CAMERA', 'CFTV-CAMERA', 'Camera IP 4MP PoE (dome e bullet)', 'QTD: 5');
  linha(17.15, 'CAB_RACK', 'CAB-RACK', 'Rack 16U de parede', 'QTD: 1');
  // símbolo grande (1,2 m): o texto da linha de cima também está ao alcance — vale a linha mais próxima
  linha(16.5, 'MON_POSTO', 'CAB-MON', 'Posto de monitoramento 2 monitores', 'QTD: 2 + 1');
  g.texto(35.4, 15.85, 0.13, 'Eletrocalha 100x50 (linha sem símbolo)', { layer: 'LEGENDA' });
  g.texto(34.5, 14.5, 0.25, 'NOTAS', { layer: 'LEGENDA' });
  g.texto(34.5, 14, 0.11, '1. Câmeras externas IP67 com IR.', { layer: 'LEGENDA' });
  return g.toString();
}
const pl = lerProjetoDxf(desenhoLegenda(), { fator: 1 });
const gl = (n) => pl.simbolos.find(s => s.nomeLimpo === n);

caso('legenda: câmeras da planta ao lado da legenda contam e não herdam a descrição do acionador', () => {
  const c = gl('CFTV CAMERA');
  assert.strictEqual(c.quantidade, 4);
  assert.strictEqual(c.descricaoLegenda, 'Camera IP 4MP PoE (dome e bullet)');
  assert.strictEqual(gl('INC ACIONADOR').quantidade, 2);
  assert.strictEqual(gl('INC ACIONADOR').descricaoLegenda, 'Acionador manual h=1,20m');
});

caso('legenda: símbolo grande pega a descrição da sua linha (não a de cima)', () => {
  assert.strictEqual(gl('MON POSTO').descricaoLegenda, 'Posto de monitoramento 2 monitores');
  assert.strictEqual(gl('CAB RACK').descricaoLegenda, 'Rack 16U de parede');
});

caso('legenda: coluna QTD lida ("QTD: 5", "2 + 1") para conferir com a contagem', () => {
  assert.strictEqual(gl('CFTV CAMERA').quantidadeLegenda, 5);
  assert.strictEqual(gl('MON POSTO').quantidadeLegenda, 3);
  assert.deepStrictEqual(pl.legendaItens.map(i => [i.bloco, i.quantidade]), [['INC_ACIONADOR', 2], ['CFTV_CAMERA', 5], ['CAB_RACK', 1], ['MON_POSTO', 3]]);
  assert.strictEqual(numeroDaQtd('QTD: 6 (10 RJ45)'), 6);
  assert.strictEqual(numeroDaQtd('12 un'), 12);
  assert.strictEqual(numeroDaQtd('Rack 16U'), null);
});

caso('atributos (que a lib entrega soltos) chegam ao bloco: ALTURA vira altura de instalação por posição', () => {
  const c = gl('CFTV CAMERA');
  assert.strictEqual(c.atributos.TAG, 'CAM-01');
  assert.deepStrictEqual(c.alturas, [3, 2.8, 3.5, null]);
  assert.deepStrictEqual(c.montagens, ['parede', 'parede', 'parede', 'teto']);
});

caso('legenda gerada pela H&M ("… — 12 un"): quantidade lida e tirada da descrição', () => {
  const { definirSimbolos, legenda } = require('./simbolos');
  const g = new DesenhoDxf();
  definirSimbolos(g, ['HM-ELE-TOMADA-BAIXA', 'HM-CFTV-CAMERA']);
  for (const x of [1, 2, 3]) g.inserir('HM-ELE-TOMADA-BAIXA', x, 1, { layer: 'ELE-TOMADA' });
  legenda(g, 10, 5, [{ simbolo: 'HM-ELE-TOMADA-BAIXA', quantidade: 12 }, { simbolo: 'HM-CFTV-CAMERA', quantidade: 2 }]);
  const p2 = lerProjetoDxf(g.toString(), { fator: 1 });
  const t = p2.simbolos.find(s => s.bloco === 'HM-ELE-TOMADA-BAIXA');
  assert.strictEqual(t.quantidade, 3);
  assert.strictEqual(t.descricaoLegenda, 'Tomada baixa 2P+T (h = 0,30 m)');
  assert.strictEqual(t.quantidadeLegenda, 12);
});

caso('bloco de xref inserida ("XREF$0$BLOCO"): o nome é o do bloco, a xref fica registrada', () => {
  assert.strictEqual(nomeLimpoDoBloco('-TOMADAS NOBREAK - OK$0$E-COND'), 'E-COND');
  assert.strictEqual(nomeLimpoDoBloco('A$C6B25151F'), 'A$C6B25151F');
  const g = new DesenhoDxf({ layers: [{ nome: 'ELE-CAIXA', cor: 1 }] });
  g.bloco('XREF-TOMADAS$0$E-COND', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.1, { layerName: '0' }); });
  g.inserir('XREF-TOMADAS$0$E-COND', 1, 1, { layer: 'ELE-CAIXA' });
  g.inserir('XREF-TOMADAS$0$E-COND', 2, 1, { layer: 'ELE-CAIXA' });
  const p2 = lerProjetoDxf(g.toString(), { fator: 1 });
  const s = p2.simbolos[0];
  assert.strictEqual(s.nomeLimpo, 'E-COND');
  assert.strictEqual(s.quantidade, 2);
  assert.deepStrictEqual(s.xrefs, ['XREF-TOMADAS', 'XREF-TOMADAS']);
  assert.strictEqual(s.fora, false, 'xref de instalação não é base de arquitetura');
  // bloco anônimo dentro da xref: o nome é o do bloco, não o da xref ("TOMADAS…" não vira tomada)
  assert.strictEqual(nomeLimpoDoBloco('TOMADAS NB - 1 SUBSOLO$0$A$C12AB1871'), 'A$C12AB1871');
});

caso('mesmo bloco inserido duas vezes no mesmo ponto (cópia sobreposta, xref repetida) conta uma vez', () => {
  const g = new DesenhoDxf({ layers: [{ nome: 'CFTV-CAMERA', cor: 3 }] });
  g.bloco('P-DOMEFIXA1', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.15, { layerName: '0' }); });
  for (const [x, y] of [[1, 1], [1, 1], [1.005, 1], [5, 1]]) g.inserir('P-DOMEFIXA1', x, y, { layer: 'CFTV-CAMERA' });
  const s = lerProjetoDxf(g.toString(), { fator: 1 }).simbolos[0];
  assert.strictEqual(s.quantidade, 2);
  assert.strictEqual(s.duplicadas, 2);
  // o mesmo vale para o traçado: eletroduto desenhado duas vezes por cima mede uma vez
  const g2 = new DesenhoDxf({ layers: [{ nome: 'ELE-ELETRODUTO', cor: 1 }] });
  g2.linha(0, 0, 10, 0, 'ELE-ELETRODUTO');
  g2.linha(10, 0, 0, 0, 'ELE-ELETRODUTO');
  g2.polilinha([[0, 0], [10, 0], [10, 5]], { layer: 'ELE-ELETRODUTO' });
  const l = lerProjetoDxf(g2.toString(), { fator: 1, reLayerLinha: /ELETRODUT/i }).linhas[0];
  assert.strictEqual(l.metros, 15);
});

caso('metragem pela curva: arco de polilinha (bulge), spline e elipse', () => {
  const g = new DesenhoDxf({ layers: [{ nome: 'ELE-ELETRODUTO', cor: 1 }, { nome: 'CAB-ELETROCALHA', cor: 5 }, { nome: 'INC-ELETRODUTO', cor: 1 }] });
  // meia-volta de raio 1 m (bulge 1): π m, não a corda de 2 m
  g.dxf.addLWPolyline([{ point: { x: 0, y: 0 }, bulge: 1 }, { point: { x: 2, y: 0 } }], { layerName: 'ELE-ELETRODUTO' });
  // spline reta de 10 m (pontos de controle alinhados)
  g.dxf.addSpline({ controlPoints: [{ x: 0, y: 5, z: 0 }, { x: 3, y: 5, z: 0 }, { x: 7, y: 5, z: 0 }, { x: 10, y: 5, z: 0 }], degreeCurve: 3 }, { layerName: 'CAB-ELETROCALHA' });
  // elipse inteira 2 × 1 m (semieixos): perímetro ≈ 9,69 m
  g.dxf.addEllipse({ x: 20, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, 0.5, 0, 2 * Math.PI, { layerName: 'INC-ELETRODUTO' });
  const p2 = lerProjetoDxf(g.toString(), { fator: 1, reLayerLinha: /ELETRODUT|ELETROCALHA/i });
  const m = (l) => p2.linhas.find(x => x.layer === l)?.metros;
  assert.ok(Math.abs(m('ELE-ELETRODUTO') - Math.PI) < 0.05, `arco: ${m('ELE-ELETRODUTO')}`);
  assert.ok(Math.abs(m('CAB-ELETROCALHA') - 10) < 0.1, `spline: ${m('CAB-ELETROCALHA')}`);
  assert.ok(Math.abs(m('INC-ELETRODUTO') - 9.69) < 0.1, `elipse: ${m('INC-ELETRODUTO')}`);
});

console.log(`projetoDxf: ${ok} casos ok`);
