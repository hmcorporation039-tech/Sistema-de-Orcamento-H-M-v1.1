// Versão 2.3 — modelo 3D ilustrativo (services/modelo3d): geração na thread à
// parte com uma arquitetura SINTÉTICA (nenhum dado de cliente), chave do cache,
// link curto, política da página e anexo do PDF (escapado). Sem banco.
// Rodar: npm test (pasta backend).
const assert = require('assert');
const path = require('path');
const M = require('../src/services/modelo3d');
const { gerarHtmlProposta } = require('../src/utils/pdfTemplate');

const { CAD, RAIZ_SKILLS } = require('../src/config/caminhos');
const { DesenhoDxf } = require(path.join(CAD, 'dxf.js'));
const { point3d } = require(path.join(RAIZ_SKILLS, 'node_modules', '@tarikjabiri', 'dxf'));

// sala e cozinha (mm), parede interna com porta em bloco (como skills/_comum/cad/teste-3d.js)
function dxfSintetico() {
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'A-PORTA', cor: 3 }] });
  const L = (x1, y1, x2, y2) => g.linha(x1, y1, x2, y2, 'A-PAREDE');
  [[0, 0, 8000, 0], [8000, 0, 8000, 5000], [8000, 5000, 0, 5000], [0, 5000, 0, 0],
    [-150, -150, 8150, -150], [8150, -150, 8150, 5150], [8150, 5150, -150, 5150], [-150, 5150, -150, -150],
    [5000, 0, 5000, 1200], [5000, 2000, 5000, 5000], [5150, 0, 5150, 1200], [5150, 2000, 5150, 5000], [5000, 1200, 5150, 1200], [5000, 2000, 5150, 2000]].forEach(l => L(...l));
  g.bloco('PORTA80', (b) => { b.addLine(point3d(0, 0), point3d(800, 0), { layerName: '0' }); b.addArc(point3d(0, 0), 800, 0, 90, { layerName: '0' }); });
  g.dxf.addInsert('PORTA80', point3d(5000, 2000), { layerName: 'A-PORTA', rotationAngle: 180 });
  g.texto(2500, 2500, 200, 'SALA DE ESTAR', { layer: 'A-TEXTO' });
  g.texto(6500, 2500, 200, 'COZINHA', { layer: 'A-TEXTO' });
  return g.toString().replace(/(\$INSUNITS\r?\n\s*70\r?\n\s*)6/, '$14');
}

// (d) o mesmo desenho com um diagrama unifilar e um quadro de cargas ao lado (29/10/2026):
// `layer` 'UNIFILAR' (o desenhista separou) ou tudo numa layer só, sem layer de parede
// (o classificador da folha é que separa a planta do diagrama)
function dxfComUnifilar(layerUnifilar, { tudoNumaLayer = false } = {}) {
  const lp = tudoNumaLayer ? 'DESENHO' : 'A-PAREDE', lt = tudoNumaLayer ? 'DESENHO' : 'A-TEXTO';
  const g = new DesenhoDxf({ layers: [{ nome: lp, cor: 8 }, { nome: lt, cor: 7 }, { nome: layerUnifilar, cor: 1 }] });
  const L = (x1, y1, x2, y2, l = lp) => g.linha(x1, y1, x2, y2, l);
  [[0, 0, 8000, 0], [8000, 0, 8000, 5000], [8000, 5000, 0, 5000], [0, 5000, 0, 0],
    [-150, -150, 8150, -150], [8150, -150, 8150, 5150], [8150, 5150, -150, 5150], [-150, 5150, -150, -150],
    [5000, 0, 5000, 1200], [5000, 2000, 5000, 5000], [5150, 0, 5150, 1200], [5150, 2000, 5150, 5000], [5000, 1200, 5150, 1200], [5000, 2000, 5150, 2000]].forEach(l => L(...l));
  g.bloco('PORTA80', (b) => { b.addLine(point3d(0, 0), point3d(800, 0), { layerName: '0' }); b.addArc(point3d(0, 0), 800, 0, 90, { layerName: '0' }); });
  g.dxf.addInsert('PORTA80', point3d(5000, 2000), { layerName: lp, rotationAngle: 180 });
  g.texto(2500, 2500, 200, 'SALA DE ESTAR', { layer: lt });
  g.texto(6500, 2500, 200, 'COZINHA', { layer: lt });
  // unifilar a 4 m da planta: barramento, 12 saídas com disjuntor (arco) e texto do circuito
  const U = (x1, y1, x2, y2) => L(x1, y1, x2, y2, layerUnifilar);
  const ux = 12000, uy = 0;
  U(ux, uy, ux, uy + 12 * 400);
  for (let i = 0; i < 12; i++) {
    const y = uy + 200 + i * 400;
    U(ux, y, ux + 3000, y);
    g.dxf.addArc(point3d(ux + 1000, y), 100, 0, 180, { layerName: layerUnifilar });
    g.texto(ux + 3050, y + 30, 120, `C${i + 1} 2x2,5mm² DISJ 20A`, { layer: layerUnifilar });
  }
  // contorno do quadro em polilinha fechada (vira "ambiente" se ninguém separar)
  g.polilinha([[ux - 300, uy - 300], [ux + 5000, uy - 300], [ux + 5000, uy + 5100], [ux - 300, uy + 5100]], { layer: layerUnifilar, fechada: true });
  g.texto(ux, uy - 700, 250, 'DIAGRAMA UNIFILAR - QDC', { layer: layerUnifilar });
  // quadro de cargas: células fechadas com o texto dentro (cada uma "seria" um ambiente)
  const tx = 12000, ty = -6000;
  ['CIRCUITO', 'DESCRIÇÃO', 'POTÊNCIA'].forEach((t, k) => g.texto(tx + 50 + k * 2000, ty + 10 * 500 + 150, 150, t, { layer: layerUnifilar }));
  for (let i = 0; i < 10; i++) {
    for (let k = 0; k < 3; k++) g.polilinha([[tx + k * 2000, ty + i * 500], [tx + (k + 1) * 2000, ty + i * 500], [tx + (k + 1) * 2000, ty + (i + 1) * 500], [tx + k * 2000, ty + (i + 1) * 500]], { layer: layerUnifilar, fechada: true });
    g.texto(tx + 50, ty + i * 500 + 150, 150, `C${i + 1}`, { layer: layerUnifilar });
    g.texto(tx + 2050, ty + i * 500 + 150, 150, i % 2 ? 'Sala de reuniao' : 'Copa', { layer: layerUnifilar });
    g.texto(tx + 4050, ty + i * 500 + 150, 150, `${600 + i * 100} VA`, { layer: layerUnifilar });
  }
  g.texto(tx, ty + 11 * 500 + 200, 250, 'QUADRO DE CARGAS - QDC', { layer: layerUnifilar });
  return g.toString().replace(/(\$INSUNITS\r?\n\s*70\r?\n\s*)6/, '$14');
}

let ok = 0;
const caso = async (nome, fn) => { await fn(); ok++; };

(async () => {
  const fonte = {
    origemTipo: 'analise', origemId: 1, nomeArquivo: 'teste.dxf', dxf: dxfSintetico(),
    disciplinas: ['eletrica', 'cftv'], dadosPorDisciplina: {}, semPontos: null, peDireito: 2.8,
    titulo: 'Modelo 3D — <script>alert(1)</script>', cliente: 'Cliente & Cia', obra: '',
  };

  await caso('gera o HTML na thread à parte, com ambientes e pontos estimados', async () => {
    const r = await M.gerarNoWorker(fonte);
    assert.ok(r.html.startsWith('<!doctype html>'));
    assert.strictEqual(r.numeros.ambientes, 2);
    assert.ok(r.numeros.dispositivos.some(d => d.disciplina === 'eletrica' && d.quantidade > 0), 'tomadas/pontos da elétrica');
    assert.ok(r.numeros.dispositivos.some(d => d.disciplina === 'cftv'), 'câmeras');
    assert.ok(r.avisos.some(a => /CONFERIR/.test(a)), 'estimativa avisada');
    assert.ok(!r.html.includes('<script>alert(1)</script>'), 'título escapado');
  });

  await caso('formulário do projeto que não fecha cai na estimativa, avisando', async () => {
    const r = await M.gerarNoWorker({ ...fonte, disciplinas: ['cftv'], dadosPorDisciplina: { cftv: { lixo: true } } });
    assert.ok(r.numeros.dispositivos.some(d => d.disciplina === 'cftv'));
    assert.ok(r.avisos.some(a => /ESTIMADOS/.test(a)));
  });

  await caso('DWG do projeto → 3D: todo componente (sem símbolo vira caixa com o nome) e trecho com tipo e medida', async () => {
    const r = M.dispositivosDoEspacial({
      pontos: [
        { x: 1, y: 1, descricao: 'Acionador manual AME 521 h=1,20m — bloco INC AC', disciplina: 'incendio', altura_m: 1.2, montagem: 'parede' },
        { x: 2, y: 1, descricao: 'Isolador de laço IDL 521 — bloco INC ISO', disciplina: 'incendio' },
        { x: 3, y: 1, descricao: 'Difusor linear', disciplina: null },
      ],
      trechos: [{ layer: 'INC-ELETRODUTO', disciplina: 'incendio', segmentos: [[0, 0, 5, 0]], tipo: 'eletroduto', material: 'PVC rígido', medida: 'Ø 25 mm (3/4")', secao_mm: [25, 25], origem_medida: 'legenda' }],
    });
    assert.deepStrictEqual(r.dispositivos.map(d => [d.simbolo, d.rotulo, d.disciplina, d.altura_m]), [
      ['HM-INC-ACIONADOR', 'Acionador manual AME 521 h=1,20m', 'incendio', 1.2],
      ['HM-GEN-COMPONENTE', 'Isolador de laço IDL 521', 'incendio', undefined],
    ]);
    assert.strictEqual(r.genericos, 1);
    assert.deepStrictEqual([r.trechos[0].tipo, r.trechos[0].material, r.trechos[0].medida, r.trechos[0].secao_mm, r.trechos[0].origem_medida], ['eletroduto', 'PVC rígido', 'Ø 25 mm (3/4")', [25, 25], 'legenda']);
  });

  await caso('disciplina sem estimativa (controle de acesso sem formulário) não derruba o 3D', async () => {
    const r = await M.gerarNoWorker({ ...fonte, disciplinas: ['controle-acesso', 'cftv'] });
    assert.ok(r.numeros.dispositivos.some(d => d.disciplina === 'cftv'));
    assert.ok(r.avisos.some(a => /controle-acesso: sem pontos no 3D/.test(a)));
  });

  await caso('arquitetura sem ambientes: erro claro', async () => {
    const vazio = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }] });
    vazio.linha(0, 0, 1000, 0, 'A-PAREDE');
    await assert.rejects(M.gerarNoWorker({ ...fonte, dxf: vazio.toString() }), (e) => e.status === 400 && /ambientes/.test(e.message));
  });

  await caso('(d) DXF com unifilar e quadro de cargas ao lado: só as paredes e os ambientes da planta', async () => {
    const { lerArquitetura } = require(path.join(CAD, 'arquitetura.js'));
    const { regiaoDoModelo, extrairElementos } = require(path.join(CAD, 'modelo3d.js'));
    for (const [layer, opcoes, como] of [['UNIFILAR', {}, 'layer UNIFILAR'], ['QUADRO DE CARGAS', {}, 'layer QUADRO DE CARGAS'], ['DESENHO', { tudoNumaLayer: true }, 'tudo numa layer, sem layer de parede']]) {
      const arq = lerArquitetura(dxfComUnifilar(layer, opcoes));
      assert.deepStrictEqual(arq.ambientes.map(a => a.nome).sort(), ['COZINHA', 'SALA DE ESTAR'], `${como}: ${arq.ambientes.map(a => a.nome)}`);
      const { caixa } = regiaoDoModelo(arq);
      const el = extrairElementos(arq, caixa, 2.8);
      const xs = el.paredes.flatMap(p => [p.a[0], p.b[0]]);
      assert.ok(xs.length && Math.max(...xs) <= 8.3, `${como}: parede fora da planta (x até ${Math.max(...xs)})`);
      if (opcoes.tudoNumaLayer) {
        assert.ok(arq.classificacao.regioes.some(r => r.tipo === 'diagrama'), `${como}: ${arq.classificacao.resumo}`);
        assert.ok(arq.regioesPlanta.length === 1 && arq.regioesPlanta[0][2] < 9, JSON.stringify(arq.regioesPlanta));
      }
    }
    // o 3D inteiro, com o desenho misto numa layer só
    const r = await M.gerarNoWorker({ ...fonte, dxf: dxfComUnifilar('DESENHO', { tudoNumaLayer: true }) });
    assert.strictEqual(r.numeros.ambientes, 2);
  });

  await caso('(d) DXF só com unifilar e quadro de cargas: a leitura recusa com a mensagem, sem paredes', async () => {
    const { lerArquiteturaNoWorker } = require('../src/services/tarefasCad');
    const g = new DesenhoDxf({ layers: [{ nome: 'DESENHO', cor: 7 }] });
    const ux = 0;
    g.linha(ux, 0, ux, 4800, 'DESENHO');
    for (let i = 0; i < 12; i++) {
      const y = 200 + i * 400;
      g.linha(ux, y, ux + 3000, y, 'DESENHO');
      g.texto(ux + 3050, y + 30, 120, `C${i + 1} 2x2,5mm² DISJ 20A`, { layer: 'DESENHO' });
    }
    g.texto(ux, -700, 250, 'DIAGRAMA UNIFILAR - QDC', { layer: 'DESENHO' });
    g.texto(ux, -1100, 150, 'SEM ESCALA', { layer: 'DESENHO' });
    const e = await lerArquiteturaNoWorker(Buffer.from(g.toString().replace(/(\$INSUNITS\r?\n\s*70\r?\n\s*)6/, '$14')), 'unifilar.dxf').catch(x => x);
    assert.ok(e instanceof Error && /"unifilar\.dxf": O desenho só tem diagrama unifilar.* não há planta baixa para montar o 3D/.test(e.message), e.message);
    assert.strictEqual(e.codigo, 'SEM_PLANTA');
  });

  await caso('chave do cache muda com o formulário, a arquitetura e o título', async () => {
    const k = M.chaveDa(fonte);
    assert.strictEqual(k, M.chaveDa({ ...fonte }));
    assert.notStrictEqual(k, M.chaveDa({ ...fonte, dadosPorDisciplina: { cftv: { a: 1 } } }));
    assert.notStrictEqual(k, M.chaveDa({ ...fonte, dxf: fonte.dxf + ' ' }));
    assert.notStrictEqual(k, M.chaveDa({ ...fonte, proposta: 'P300' }));
  });

  await caso('link curto: formato, validade e origem', async () => {
    const t = M.criarLink('laudo', 7);
    assert.match(t, /^[0-9a-f]{48}$/);
    assert.deepStrictEqual({ ...M.lerLink(t), expira: 0 }, { origemTipo: 'laudo', origemId: 7, expira: 0 });
    assert.strictEqual(M.lerLink('x'.repeat(48)), null);
    assert.strictEqual(M.lerLink('../../etc'), null);
  });

  await caso('página do 3D em sandbox, sem rede', async () => {
    assert.match(M.CSP_MODELO_3D, /sandbox allow-scripts(;|$)/);
    assert.ok(!/allow-same-origin/.test(M.CSP_MODELO_3D));
    assert.match(M.CSP_MODELO_3D, /default-src 'none'/);
  });

  await caso('nome do arquivo baixado sem caracteres proibidos', async () => {
    assert.strictEqual(M.nomeArquivo({ titulo: 'Modelo 3D — Obra: A/B "C"' }), 'Modelo 3D - Obra A B C.html');
    assert.strictEqual(M.nomeArquivo({ titulo: '' }), 'Modelo 3D - Projeto.html');
  });

  await caso('PDF: anexo do 3D só com imagem, embutida em data:', async () => {
    const base = { numero: 'P1', cliente_nome: 'X', secoes: [], itens: [], total: 0 };
    const sem = gerarHtmlProposta(base, {});
    assert.ok(!sem.includes('modelo 3D ilustrativo'));
    const com = gerarHtmlProposta(base, { modelo3d: { imagem: Buffer.from('png'), comLink: true } });
    assert.ok(com.includes('Como vai ficar (modelo 3D ilustrativo)'));
    assert.ok(com.includes(`data:image/png;base64,${Buffer.from('png').toString('base64')}`));
    assert.ok(com.includes('página de aprovação'));
  });

  console.log(`modelo3d: ${ok} casos ok`);
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
