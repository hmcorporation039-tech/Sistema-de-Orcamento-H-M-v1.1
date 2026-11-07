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

// ── Revisão de 02/11/2026 (leitura de DWG/DXF: CAD-01 a CAD-07, CAD-11, CAD-13) ──
const BS = '\\';
const { limparMtext, lerAltura, alturaEscrita } = require('./textoCad');
const { alturaDoTexto } = require('./disciplinasCad');
const { montarDxf } = require('./dxfDoDwg');
const { propostaDeMapa, aplicarMapa, aplicarConfirmacoes } = require('./pontosDoDesenho');

caso('CAD-01: limpador único de MTEXT — sublinhado/sobrelinha/riscado sem ";", \\U+, \\S, escapes', () => {
  assert.strictEqual(limparMtext(`${BS}LLEGENDA${BS}l`), 'LEGENDA');
  assert.strictEqual(limparMtext(`${BS}L${BS}OMAPA CHAVE}`), 'MAPA CHAVE');
  // o texto entre "\l" e o próximo ";" não some mais
  assert.strictEqual(limparMtext(`${BS}LNOTAS:${BS}l tomadas baixas a 0,30 m do piso; interruptores a 1,10 m`), 'NOTAS: tomadas baixas a 0,30 m do piso; interruptores a 1,10 m');
  assert.strictEqual(limparMtext(`ELETRODUTO ${BS}U+2205 25mm`), 'ELETRODUTO ∅ 25mm');
  assert.strictEqual(limparMtext(`{${BS}fArial|b1|i0|c0|p34;${BS}H0.5x;${BS}C1;QUADRO}${BS}PQD-1`), 'QUADRO\nQD-1');
  assert.strictEqual(limparMtext(`${BS}PQD-1`, { quebra: ' ' }), ' QD-1');
  assert.strictEqual(limparMtext(`A=12m${BS}S2^; ${BS}S1/2;"`), 'A=12m2 1/2"');
  assert.strictEqual(limparMtext(`C:${BS}${BS}pasta ${BS}{x${BS}} %%c25`), 'C:\\pasta {x} Ø25');
  // a arquitetura usa o mesmo limpador (o nome da sala numa linha só)
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }] });
  g.polilinha([[0, 0], [6, 0], [6, 4], [0, 4]], { layer: 'A-PAREDE', fechada: true });
  g.dxf.addMText({ x: 2, y: 2, z: 0 }, 0.2, `${BS}L${BS}OSALA${BS}PDE ESTAR${BS}o${BS}l`, { layerName: 'A-TEXTO' });
  assert.deepStrictEqual(lerArquitetura(g.toString()).ambientes.map(a => a.nome), ['SALA DE ESTAR']);
});

// legenda com título em MTEXT sublinhado (como o AutoCAD grava) e descrição "a 2,20m do piso"
function desenhoLegendaSublinhada() {
  const g = new DesenhoDxf({ layers: [{ nome: 'ELE-TOMADA', cor: 1 }, { nome: 'TEXTO', cor: 7 }] });
  g.bloco('TA', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.1, { layerName: '0' }); });
  for (const x of [1, 2, 3, 4]) g.inserir('TA', x, 1, { layer: 'ELE-TOMADA' });
  g.dxf.addMText({ x: 20, y: 10, z: 0 }, 0.25, `${BS}LLEGENDA${BS}l`, { layerName: 'TEXTO' });
  g.inserir('TA', 20.2, 9.4, { layer: 'ELE-TOMADA' });
  g.texto(20.8, 9.35, 0.2, 'Tomada alta a 2,20m do piso', { layer: 'TEXTO' });
  g.dxf.addMText({ x: 20, y: 5, z: 0 }, 0.2, `${BS}LNOTAS:${BS}l tomadas baixas a 0,30 m do piso; interruptores a 1,10 m`, { layerName: 'TEXTO' });
  return g.toString();
}

caso('CAD-01: título "\\LLEGENDA\\l" reconhecido — a amostra da legenda não conta e a descrição chega ao bloco', () => {
  const p2 = lerProjetoDxf(desenhoLegendaSublinhada(), { fator: 1 });
  const t = p2.simbolos.find(s => s.nomeLimpo === 'TA');
  assert.strictEqual(p2.legenda, 'LEGENDA');
  assert.strictEqual(t.quantidade, 4, 'antes: 5 (a amostra da legenda contava)');
  assert.strictEqual(t.descricaoLegenda, 'Tomada alta a 2,20m do piso');
  assert.match(p2.texto, /tomadas baixas a 0,30 m do piso; interruptores a 1,10 m/);
});

caso('CAD-02/CAD-11: um leitor de altura só — "a 2,20m do piso" é 2,20 m (não piso), "h:" vale', () => {
  assert.deepStrictEqual(alturaDoTexto('Tomada alta a 2,20m do piso'), { altura_m: 2.2, montagem: 'parede' });
  assert.deepStrictEqual(alturaDoTexto('Tomada baixa a 0,30m do piso'), { altura_m: 0.3, montagem: 'parede' });
  assert.deepStrictEqual(alturaDoTexto('Interruptor simples 1 tecla - 1,20m do piso'), { altura_m: 1.2, montagem: 'parede' });
  assert.deepStrictEqual(alturaDoTexto('Interruptor h: 1,10 m'), { altura_m: 1.1, montagem: 'parede' });
  assert.deepStrictEqual(alturaDoTexto('Tomada de piso'), { altura_m: 0, montagem: 'piso' });
  assert.deepStrictEqual(alturaDoTexto('Detector (teto)'), { altura_m: null, montagem: 'teto' });
  assert.deepStrictEqual(alturaDoTexto('Tomada h= 20 cm abaixo do forro'), { altura_m: null, montagem: 'parede' });
  assert.deepStrictEqual(alturaDoTexto('Tomada baixa 2P+T (h = 0,30 m)'), { altura_m: 0.3, montagem: 'parede' });
  // o leitor do mapa/3D dá o mesmo valor
  for (const [s, h] of [['Tomada alta a 2,20m do piso', 2.2], ['Interruptor h: 1,10 m', 1.1], ['altura: 97,5 cm', 0.98], ['h=30', 0.3], ['h=300mm', 0.3], ['poste h=8', 8], ['Tomada de piso', null]]) {
    assert.strictEqual(alturaEscrita(s), h, s);
  }
  assert.deepStrictEqual(lerAltura('h= 20 cm abaixo do forro'), { altura_m: 0.2, abaixoDoForro: true });
  // o bloco da legenda "a 2,20m do piso" (DXF com blocos): altura na descrição, não no piso
  const t = lerProjetoDxf(desenhoLegendaSublinhada(), { fator: 1 }).simbolos.find(s => s.nomeLimpo === 'TA');
  assert.deepStrictEqual(alturaDoTexto(t.descricaoLegenda), { altura_m: 2.2, montagem: 'parede' });
});

// DXF cru (tuplas) para o que o DesenhoDxf não escreve: tabela BLOCK_RECORD com xdata e MINSERT
function dxfCru(montar) {
  const o = [];
  const g = (c, v) => o.push(String(c), String(v));
  montar(g);
  return o.join('\n') + '\n';
}
const blocoCirculo = (g, nome) => { g(0, 'BLOCK'); g(8, '0'); g(2, nome); g(70, 0); g(10, 0); g(20, 0); g(3, nome); g(0, 'CIRCLE'); g(8, '0'); g(10, 0); g(20, 0); g(40, 0.15); g(0, 'ENDBLK'); g(8, '0'); };
const inserirCru = (g, nome, x, y, extra = []) => { g(0, 'INSERT'); g(8, 'ILU-LUMINARIA'); g(2, nome); g(10, x); g(20, y); for (const [c, v] of extra) g(c, v); };

caso('CAD-07: bloco dinâmico (*U) contado pelo nome verdadeiro e MINSERT de símbolo conta linhas × colunas', () => {
  // como o AutoCAD grava: xdata AcDbBlockRepBTag no registro do *U aponta (1005) para o bloco dinâmico
  const autocad = dxfCru((g) => {
    g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$INSUNITS'); g(70, 6); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'TABLES'); g(0, 'TABLE'); g(2, 'BLOCK_RECORD'); g(5, '9'); g(70, 2);
    g(0, 'BLOCK_RECORD'); g(5, '1F3'); g(100, 'AcDbSymbolTableRecord'); g(100, 'AcDbBlockTableRecord'); g(2, 'LUMINARIA');
    g(0, 'BLOCK_RECORD'); g(5, '2A1'); g(100, 'AcDbSymbolTableRecord'); g(100, 'AcDbBlockTableRecord'); g(2, '*U12'); g(1001, 'AcDbBlockRepBTag'); g(1070, 1); g(1005, '1F3');
    g(0, 'ENDTAB'); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'BLOCKS'); blocoCirculo(g, 'LUMINARIA'); blocoCirculo(g, '*U12'); blocoCirculo(g, '*U99'); g(0, 'ENDSEC');
    g(0, 'SECTION'); g(2, 'ENTITIES');
    inserirCru(g, 'LUMINARIA', 0, 0);
    for (const x of [5, 7, 9]) inserirCru(g, '*U12', x, 0);
    inserirCru(g, '*U99', 30, 0); // anônimo sem nome conhecido: continua contêiner (não conta)
    inserirCru(g, 'LUMINARIA', 20, 0, [[70, 3], [71, 2], [44, 2], [45, 2]]); // MINSERT 3 colunas × 2 linhas
    g(0, 'ENDSEC'); g(0, 'EOF');
  });
  const s = lerProjetoDxf(autocad, { fator: 1 }).simbolos;
  assert.deepStrictEqual(s.map(x => [x.bloco, x.quantidade]), [['LUMINARIA', 10]], 'antes: LUMINARIA 2');
  const pos = s[0].posicoes.map(p => p.join(',')).sort();
  assert.ok(['20,0', '22,0', '24,0', '20,2', '22,2', '24,2'].every(p => pos.includes(p)), pos.join(' '));
  // como o conversor de DWG grava: xdata AcDbDynamicBlockTrueName com o nome
  const conversor = autocad.replace('1001\nAcDbBlockRepBTag\n1070\n1\n1005\n1F3', '1001\nAcDbDynamicBlockTrueName\n1000\nLUMINARIA');
  assert.ok(conversor !== autocad);
  assert.strictEqual(lerProjetoDxf(conversor, { fator: 1 }).simbolos[0].quantidade, 10);
});

// Banco no formato do LibreDWG (convertEx), como ./dwg-para-dxf.mjs entrega a ./dxfDoDwg.js
function bancoDwg() {
  const att = (tag, valor, x, y) => ({ type: 'ATTRIB', layer: 'ELE-TOMADA', tag, flags: 0, text: { text: valor, startPoint: { x, y }, endPoint: { x: 0, y: 0 }, textHeight: 0.1, rotation: 0 } });
  const circulo = { type: 'CIRCLE', layer: '0', center: { x: 0, y: 0 }, radius: 0.1 };
  const modelo = [
    { type: 'LWPOLYLINE', layer: 'A-PAREDE', flag: 512, vertices: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 4 }, { x: 0, y: 4 }] },
    // etiqueta de sala em bloco: o nome é atributo
    { type: 'INSERT', layer: 'A-TEXTO', name: 'ETIQUETA', insertionPoint: { x: 3, y: 2 }, xScale: 1, yScale: 1, zScale: 1, rotation: 0, attribs: [{ ...att('AMBIENTE', 'SALA DE REUNIAO', 2.2, 2), layer: 'A-TEXTO', text: { text: 'SALA DE REUNIAO', startPoint: { x: 2.2, y: 2 }, textHeight: 0.2 } }] },
    { type: 'INSERT', layer: 'ELE-TOMADA', name: 'TOMADA', insertionPoint: { x: 1, y: 1 }, xScale: 1, yScale: 1, zScale: 1, rotation: 0,
      attribs: [att('ALTURA', '2,20', 1.2, 0.9), att('DESCR', 'Tomada alta 2P+T 20A', 1.2, 0.75)] },
    // bloco dinâmico com a visibilidade alterada: anônimo *U5
    { type: 'INSERT', layer: 'ELE-TOMADA', name: '*U5', insertionPoint: { x: 3, y: 1 }, xScale: 1, yScale: 1, zScale: 1, rotation: 0, attribs: [] },
    // rota em spline (por pontos de controle e só por pontos de ajuste) e em elipse
    { type: 'SPLINE', layer: 'CAB-ELETROCALHA', flag: 8, degree: 3, knots: [0, 0, 0, 0, 1, 1, 1, 1], controlPoints: [{ x: 0, y: 5, z: 0 }, { x: 3, y: 5, z: 0 }, { x: 7, y: 5, z: 0 }, { x: 10, y: 5, z: 0 }], fitPoints: [] },
    { type: 'SPLINE', layer: 'ELE-ELETRODUTO', flag: 8, degree: 3, knots: [], controlPoints: [], fitPoints: [{ x: 0, y: 8, z: 0 }, { x: 4, y: 8, z: 0 }, { x: 10, y: 8, z: 0 }] },
    { type: 'ELLIPSE', layer: 'INC-ELETRODUTO', center: { x: 20, y: 0, z: 0 }, majorAxisEndPoint: { x: 2, y: 0, z: 0 }, axisRatio: 0.5, startAngle: 0, endAngle: 2 * Math.PI },
    { type: 'SOLID', layer: 'ELE-TOMADA', corner1: { x: 0, y: 0 }, corner2: { x: 0.1, y: 0 }, corner3: { x: 0, y: 0.1 }, corner4: { x: 0.1, y: 0.1 } },
    { type: 'POINT', layer: 'ELE-TOMADA', position: { x: 5, y: 5, z: 0 } },
    { type: 'DIMENSION', layer: 'COTAS', styleName: 'H&M', definitionPoint: { x: 0, y: -1, z: 0 }, textPoint: { x: 3, y: -1.2 }, measurement: 6, text: '', dimensionType: 32, subDefinitionPoint1: { x: 0, y: 0, z: 0 }, subDefinitionPoint2: { x: 6, y: 0, z: 0 } },
    { type: 'DIMENSION', layer: 'COTAS', styleName: 'H&M', definitionPoint: { x: 0, y: -2, z: 0 }, textPoint: { x: 3, y: -2.2 }, measurement: 6, text: 'ELETROCALHA 300x100 <>', dimensionType: 0 },
    { type: 'MULTILEADER', layer: 'ANOTACAO', textContent: 'Eletrocalha 300x100 perfurada', textAnchor: { x: 5, y: 6, z: 0 }, textHeight: 0.15 },
  ];
  return {
    header: { INSUNITS: 6 },
    entities: modelo,
    tables: {
      BLOCK_RECORD: { entries: [
        { name: '*Model_Space', handle: '1F', entities: modelo },
        { name: 'TOMADA', basePoint: { x: 0, y: 0 }, entities: [circulo] },
        { name: '*U5', basePoint: { x: 0, y: 0 }, entities: [circulo] },
        { name: 'ETIQUETA', basePoint: { x: 0, y: 0 }, entities: [] },
      ] },
      DIMSTYLE: { entries: [{ name: 'H&M', DIMTXT: 0.25, DIMSCALE: 1 }] },
    },
  };
}

caso('CAD-04/05: DWG convertido — atributo é ATTRIB de verdade (tag e altura chegam ao bloco), curvas e chamadas entram', () => {
  const dxf = montarDxf(bancoDwg(), { nomesDinamicos: new Map([['*U5', 'TOMADA']]) });
  const tipos = new Set(dxf.split('\n').filter((l, i, v) => v[i - 1] === '0').map(l => l.trim()));
  for (const t of ['ATTRIB', 'SEQEND', 'SPLINE', 'ELLIPSE', 'SOLID', 'POINT', 'DIMENSION', 'MTEXT']) assert.ok(tipos.has(t), `sem ${t}`);
  const p2 = lerProjetoDxf(dxf, { fator: 1, reLayerLinha: /ELETRODUT|ELETROCALHA/i });
  const t = p2.simbolos.find(s => s.nomeLimpo === 'TOMADA');
  assert.strictEqual(t.quantidade, 2, 'a tomada dinâmica (*U5) conta como TOMADA');
  assert.strictEqual(t.atributos.ALTURA, '2,20');
  assert.strictEqual(t.atributos.DESCR, 'Tomada alta 2P+T 20A');
  assert.deepStrictEqual(t.alturas, [2.2, null]);
  // a arquitetura acha o nome da sala no atributo (não precisa do TEXT solto de antes)
  assert.deepStrictEqual(lerArquitetura(dxf).ambientes.map(a => a.nome), ['SALA DE REUNIAO']);
  // texto da chamada e da cota escrita à mão; a cota só com a medida não vira texto
  assert.match(p2.texto, /Eletrocalha 300x100 perfurada/);
  assert.match(p2.texto, /ELETROCALHA 300x100 6/);
  assert.ok(!p2.textos.some(x => x.s === '6'), 'a medida da cota não entra como texto');
  // metragem pela curva igual à do DXF (teste "metragem pela curva" acima): spline 10 m, elipse 9,69 m;
  // a spline só com pontos de ajuste é medida pelas cordas entre eles
  const m = (l) => p2.linhas.find(x => x.layer === l)?.metros;
  assert.ok(Math.abs(m('CAB-ELETROCALHA') - 10) < 0.1, `spline: ${m('CAB-ELETROCALHA')}`);
  assert.ok(Math.abs(m('ELE-ELETRODUTO') - 10) < 0.1, `spline por pontos de ajuste: ${m('ELE-ELETRODUTO')}`);
  assert.ok(Math.abs(m('INC-ELETRODUTO') - 9.69) < 0.1, `elipse: ${m('INC-ELETRODUTO')}`);
});

caso('CAD-05: mesma rota em DWG e em DXF dá a mesma metragem', () => {
  const g = new DesenhoDxf({ layers: [{ nome: 'CAB-ELETROCALHA', cor: 5 }, { nome: 'INC-ELETRODUTO', cor: 1 }] });
  g.dxf.addSpline({ controlPoints: [{ x: 0, y: 5, z: 0 }, { x: 3, y: 5, z: 0 }, { x: 7, y: 5, z: 0 }, { x: 10, y: 5, z: 0 }], degreeCurve: 3 }, { layerName: 'CAB-ELETROCALHA' });
  g.dxf.addEllipse({ x: 20, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, 0.5, 0, 2 * Math.PI, { layerName: 'INC-ELETRODUTO' });
  const re = /ELETRODUT|ELETROCALHA/i;
  const doDxf = lerProjetoDxf(g.toString(), { fator: 1, reLayerLinha: re }).linhas;
  const doDwg = lerProjetoDxf(montarDxf(bancoDwg()), { fator: 1, reLayerLinha: re }).linhas;
  for (const l of ['CAB-ELETROCALHA', 'INC-ELETRODUTO']) {
    assert.strictEqual(doDwg.find(x => x.layer === l)?.metros, doDxf.find(x => x.layer === l)?.metros, l);
  }
});

// arquitetura mínima para o mapa de símbolos explodidos (pontosDoDesenho)
const quadrado = (x, y, l, layer) => ({ layer, tipo: 'poli', fechada: true, pts: [[x, y], [x + l, y], [x + l, y + l], [x, y + l], [x, y]] });
const arqDe = (refs) => ({ ambientes: [], referencia: refs, notas: [], preenchimentos: [], simbolosDaLegenda: [] });

caso('CAD-03: cada símbolo desenhado vai para UMA linha do mapa (linhas vizinhas com tipos diferentes)', () => {
  const refs = [];
  [0.20, 0.22, 0.24].forEach((l, k) => { for (let i = 0; i < 3; i++) refs.push(quadrado(i * 2, k * 2, l, 'EL-SIMBOLOS')); });
  const arq = arqDe(refs);
  const mapa = propostaDeMapa(arq);
  const conf = mapa.simbolos.map((s, i) => ({ layer: s.layer, medida: s.medida, simbolo: i === 0 ? 'HM-ELE-TOMADA-BAIXA' : 'HM-ELE-INTERRUPTOR', disciplina: 'eletrica' }));
  const { pontos } = aplicarMapa(arq, aplicarConfirmacoes(mapa, conf));
  assert.strictEqual(pontos.length, 9, `9 símbolos desenhados viraram ${pontos.length} pontos (antes: 12)`);
  assert.strictEqual(new Set(pontos.map(p => `${p.x},${p.y}`)).size, 9, 'dois pontos no mesmo lugar');
  // a contagem de cada linha bate com os pontos que ela gera
  mapa.simbolos.forEach((s, i) => assert.strictEqual(pontos.filter(p => p.linha === i).length, s.quantidade, `linha ${i}`));
  // linhas vizinhas (20 e 22 cm) confirmadas com tipos diferentes: cada uma fica com a confirmação dela
  const m2 = { simbolos: [{ layer: 'EL-SIMBOLOS', medida: [0.2, 0.2], quantidade: 3, simbolo: '?' }, { layer: 'EL-SIMBOLOS', medida: [0.22, 0.22], quantidade: 3, simbolo: '?' }], trechos: [] };
  const c2 = aplicarConfirmacoes(m2, [{ layer: 'EL-SIMBOLOS', medida: [0.2, 0.2], simbolo: 'HM-ELE-TOMADA-BAIXA' }, { layer: 'EL-SIMBOLOS', medida: [0.22, 0.22], simbolo: 'HM-ELE-INTERRUPTOR' }]);
  assert.deepStrictEqual(c2.simbolos.map(s => s.simbolo), ['HM-ELE-TOMADA-BAIXA', 'HM-ELE-INTERRUPTOR']);
});

caso('CAD-06: todas as formas de símbolo da layer viram linha do mapa (antes só as 8 mais frequentes)', () => {
  const refs = [];
  for (let k = 0; k < 10; k++) for (let i = 0; i < 2; i++) refs.push(quadrado(i * 3, k * 3, 0.1 + 0.06 * k, 'EL-SIMBOLOS'));
  const mapa = propostaDeMapa(arqDe(refs));
  assert.strictEqual(mapa.simbolos.length, 10);
  assert.strictEqual(mapa.simbolos.reduce((t, s) => t + s.quantidade, 0), 20);
  assert.ok(!mapa.aviso);
});

caso('CAD-13: simbologia de arquitetura e mobiliário não vira linha do mapa nem poste sugerido', () => {
  const refs = [];
  for (const layer of ['#ARQUITETURA SIMBOLOGIA', 'ARQ-SIMBOLOS', 'MOBILIARIO', 'XREF$0$ARQ-SIMB']) {
    for (let i = 0; i < 3; i++) refs.push({ layer, tipo: 'linha', pts: [[i * 5, 0], [i * 5 + 1.36, 0.2]] }, quadrado(i * 5, 3, 0.2, layer));
  }
  refs.push(quadrado(0, 10, 0.2, 'EL-SIMBOLOS'), quadrado(2, 10, 0.2, 'EL-SIMBOLOS'));
  const mapa = propostaDeMapa(arqDe(refs));
  assert.deepStrictEqual([...new Set(mapa.simbolos.map(s => s.layer))], ['EL-SIMBOLOS']);
});

// ── Revisão do motor de leitura (06/11/2026): blocos do orçamento ───────────────────────────────
{
  const linhaB = (x1, y1, x2, y2) => ['0', 'LINE', '8', '0', '10', x1, '20', y1, '30', 0, '11', x2, '21', y2, '31', 0];
  const solidB = (pts) => ['0', 'SOLID', '8', '0', ...pts.flatMap(([x, y], i) => [`1${i}`, x, `2${i}`, y, `3${i}`, 0])];
  const elipseB = () => ['0', 'ELLIPSE', '8', '0', '10', 0, '20', 0, '30', 0, '11', 0.15, '21', 0, '31', 0, '40', 0.5, '41', 0, '42', 6.283185];
  const splineB = () => ['0', 'SPLINE', '8', '0', '70', 8, '71', 3, '72', 8, '73', 4, ...[0, 0, 0, 0, 1, 1, 1, 1].flatMap(k => ['40', k]),
    ...[[0, 0], [0.05, 0.1], [0.15, 0.1], [0.2, 0]].flatMap(([x, y]) => ['10', x, '20', y, '30', 0])];
  const hachuraB = () => ['0', 'HATCH', '8', '0', '10', 0, '20', 0, '30', 0, '2', 'SOLID', '70', 1, '71', 0, '91', 1, '92', 2, '72', 0, '73', 1, '93', 4,
    ...[[0, 0], [0.2, 0], [0.2, 0.2], [0, 0.2]].flatMap(([x, y]) => ['10', x, '20', y]), '97', 0, '75', 0, '76', 1, '98', 0];
  const blocoB = (nome, ents) => ['0', 'BLOCK', '8', '0', '2', nome, '70', 0, '10', 0, '20', 0, '30', 0, '3', nome, '1', '', ...ents.flat(), '0', 'ENDBLK', '8', '0'];
  const insertB = (nome, x, y, layer, attribs = []) => [
    '0', 'INSERT', '8', layer, ...(attribs.length ? ['66', 1] : []), '2', nome, '10', x, '20', y, '30', 0,
    ...attribs.flatMap(([tag, v]) => ['0', 'ATTRIB', '8', layer, '100', 'AcDbText', '10', x, '20', y, '30', 0, '40', 0.1, '1', v, '100', 'AcDbAttribute', '2', tag, '70', 0]), ...(attribs.length ? ['0', 'SEQEND', '8', layer] : [])];
  const dxfB = (blocos, ents) => ['0', 'SECTION', '2', 'HEADER', '0', 'ENDSEC', '0', 'SECTION', '2', 'BLOCKS', ...blocos.flat(), '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES', ...ents.flat(), '0', 'ENDSEC', '0', 'EOF'].join('\n');
  const contagem = (p) => Object.fromEntries(p.simbolos.map(s => [s.bloco, `${s.quantidade}${s.fora ? ' fora' : ''}`]));
  const quadradoB = [linhaB(0, 0, 0.2, 0), linhaB(0.2, 0, 0.2, 0.2), linhaB(0.2, 0.2, 0, 0.2), linhaB(0, 0.2, 0, 0)];

  caso('R-03 bloco desenhado só com SOLID, ELLIPSE, SPLINE ou HATCH é símbolo (antes tinha extensão 0 e sumia)', () => {
    const blocos = [blocoB('TOMADA ALTA', [solidB([[0, 0], [0.2, 0], [0.1, 0.17], [0.1, 0.17]])]), blocoB('LUMINARIA OVAL', [elipseB()]),
      blocoB('ARANDELA CURVA', [splineB()]), blocoB('TOMADA PISO', [hachuraB()])];
    const ents = [];
    for (let i = 0; i < 4; i++) ents.push(insertB('TOMADA ALTA', i * 2, 0, 'EL-TOMADAS'));
    for (let i = 0; i < 3; i++) ents.push(insertB('LUMINARIA OVAL', i * 2, 5, 'EL-ILUMINACAO'));
    for (let i = 0; i < 2; i++) ents.push(insertB('ARANDELA CURVA', i * 2, 8, 'EL-ILUMINACAO'));
    for (let i = 0; i < 5; i++) ents.push(insertB('TOMADA PISO', i * 2, 10, 'EL-TOMADAS'));
    assert.deepStrictEqual(contagem(lerProjetoDxf(dxfB(blocos, ents), { fator: 1 })), { 'TOMADA PISO': '5', 'TOMADA ALTA': '4', 'LUMINARIA OVAL': '3', 'ARANDELA CURVA': '2' });
  });

  caso('R-04 ponto elétrico com CHUVEIRO, CHAMADA, NÍVEL ou ARMÁRIO no nome entra no orçamento; o objeto de arquitetura continua fora', () => {
    const nomes = ['TOMADA CHUVEIRO', 'BOTAO DE CHAMADA', 'CHAVE DE NIVEL', 'ARMARIO TELECOM', 'CHUVEIRO', 'PORTA 80', 'ARMARIO', 'NORTE', 'LEGENDA TOMADA'];
    const p = lerProjetoDxf(dxfB(nomes.map(n => blocoB(n, quadradoB)), nomes.flatMap((n, k) => [insertB(n, k * 2, 0, 'EL-PONTOS'), insertB(n, k * 2, 3, 'EL-PONTOS')])), { fator: 1 });
    const c = contagem(p);
    assert.deepStrictEqual(nomes.map(n => c[n]), ['2', '2', '2', '2', '2 fora', '2 fora', '2 fora', '2 fora', '2 fora']);
  });

  caso('R-16 atributo ALTURA sem unidade no bloco em mm ("1100" = 1,10 m, não 11 m); "Altura de instalação: 1,20 m", "a 1.20m do chão", "H(m)=1,10"', () => {
    const tomadaMm = blocoB('TOMADA', [linhaB(0, 0, 200, 0), linhaB(200, 0, 100, 170), linhaB(100, 170, 0, 0)]);
    const ents = [['1100', 0], ['300', 2000], ['2200', 4000], ['teto', 6000]].map(([v, x]) => insertB('TOMADA', x, 0, 'EL-TOMADAS', [['ALTURA', v]]));
    const p = lerProjetoDxf(dxfB([tomadaMm], ents), { fator: 0.001 });
    assert.deepStrictEqual(p.simbolos.find(s => s.bloco === 'TOMADA').alturas, [1.1, 0.3, 2.2, null]);
    assert.deepStrictEqual(['Altura de instalação: 1,20 m', 'Altura de montagem = 2,40m', 'Tomada a 1.20m do chão', 'H(m)=1,10', 'Altura (cm): 110'].map(alturaEscrita), [1.2, 2.4, 1.2, 1.1, 1.1]);
    assert.deepStrictEqual(alturaDoTexto('Interruptor - altura de instalação 1,10 m'), { altura_m: 1.1, montagem: 'parede' });
  });
}

console.log(`projetoDxf: ${ok} casos ok`);
