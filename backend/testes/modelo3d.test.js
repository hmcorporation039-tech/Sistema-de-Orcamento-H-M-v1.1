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

  // 01/11/2026: o 3D nunca estima pontos pela área (a Arena saía com 868 tomadas que
  // não existem no projeto) — sem ponto desenhado nem formulário, só a arquitetura
  await caso('gera o HTML na thread à parte, com os ambientes e SEM pontos estimados', async () => {
    const r = await M.gerarNoWorker(fonte);
    assert.ok(r.html.startsWith('<!doctype html>'));
    assert.strictEqual(r.numeros.ambientes, 2);
    assert.strictEqual(r.numeros.dispositivos.length, 0, JSON.stringify(r.numeros.dispositivos));
    assert.ok(r.avisos.some(a => /nada é estimado/.test(a)), r.avisos.join(' | '));
    assert.ok(!r.html.includes('<script>alert(1)</script>'), 'título escapado');
  });

  await caso('formulário do projeto que não posiciona pontos não cai na estimativa', async () => {
    const r = await M.gerarNoWorker({ ...fonte, disciplinas: ['cftv'], dadosPorDisciplina: { cftv: { lixo: true } } });
    assert.strictEqual(r.numeros.dispositivos.length, 0);
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

  await caso('pontos do projeto (espacial) entram na planta deles', async () => {
    const r = await M.gerarNoWorker({ ...fonte, dispositivosReais: [{ simbolo: 'HM-CFTV-CAMERA', rotulo: 'Câmera', disciplina: 'cftv', x: 2, y: 2, rotacao: 0, id: '', ambiente: null }] });
    assert.ok(r.numeros.dispositivos.some(d => d.disciplina === 'cftv' && d.quantidade === 1), JSON.stringify(r.numeros.dispositivos));
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

  // revisão de 02/11/2026 (3D-05): a legenda aprendida muda a leitura dos símbolos e
  // entra na chave; o gerador é TODO o skills/_comum/cad (+ empresa.js), pelo conteúdo
  await caso('chave do cache muda com os símbolos aprendidos (a ordem não importa)', async () => {
    const a1 = { layer: 'EL-TOMADAS', medida: [0.2, 0.2], fracao: 0.5, simbolo: 'HM-ELE-TOMADA-ALTA', disciplina: 'eletrica', altura_m: 2.2, texto: 'Tomada alta' };
    const a2 = { ...a1, layer: 'EL-INTERRUPTORES', simbolo: 'HM-ELE-INTERRUPTOR', texto: 'Interruptor' };
    const k = M.chaveDa(fonte, [a1, a2]);
    assert.strictEqual(k, M.chaveDa(fonte, [a2, a1]));
    assert.notStrictEqual(k, M.chaveDa(fonte, [a1]));
    assert.notStrictEqual(k, M.chaveDa(fonte, [a1, { ...a2, usuario: true }]));
    assert.notStrictEqual(k, M.chaveDa(fonte));
  });

  await caso('versão do gerador: todos os .js/.json de _comum/cad e o empresa.js, sem testes', async () => {
    const nomes = M.arquivosDoGerador().map(f => path.relative(CAD, f).split(path.sep).join('/'));
    for (const f of ['simbolos.js', 'disciplinasCad.js', 'planta.js', 'plantasDisciplina.js', 'posicionamento.js', 'modelo3d.js', 'infraestrutura.js', 'visualizador3d/app.bundle.js', 'padrao-hm.json']) assert.ok(nomes.includes(f), f);
    assert.ok(!nomes.some(f => /(^|\/)teste-|node_modules/.test(f)), nomes.join(' '));
    const v = M.versaoDoGerador();
    assert.match(v, /^[0-9a-f]{64}$/);
    assert.strictEqual(M.versaoDoGerador(), v);
  });

  await caso('componente do projeto entra no 3D com a chave do registro (carregador, controle_acesso)', async () => {
    const { dispositivos } = M.dispositivosDoEspacial({ pontos: [
      { disciplina: 'carregador', descricao: 'Carregador veicular wallbox 7 kW', x: 2, y: 2 },
      { disciplina: 'controle_acesso', descricao: 'Leitor facial', x: 6.5, y: 2 },
    ], trechos: [] });
    assert.deepStrictEqual(dispositivos.map(d => d.disciplina), ['carregador', 'controle_acesso']);
    const r = await M.gerarNoWorker({ ...fonte, dispositivosReais: dispositivos });
    const cena = JSON.parse(r.html.match(/window\.CENA=(.*?);document\.querySelectorAll/s)[1]);
    assert.deepStrictEqual(Object.keys(cena.disciplinas).sort(), ['carregador', 'controle_acesso']);
    assert.ok(Object.values(cena.disciplinas).every(d => d.cor !== '#dddddd'), JSON.stringify(cena.disciplinas));
    // o componente lido do DWG vem sem ambiente: o 3D acha o da posição (3D-01)
    assert.ok(cena.dispositivos.every(t => t.itens.every(i => i[5] >= 0)), JSON.stringify(cena.dispositivos.map(t => t.itens)));
  });

  await caso('"Gerar de novo": rota com login, id válido e dono da origem (ou admin)', async () => {
    const rotas = [];
    const router = { get: (p, ...f) => rotas.push(['get', p, f]), post: (p, ...f) => rotas.push(['post', p, f]), patch: (p, ...f) => rotas.push(['patch', p, f]) };
    const marca = (nome) => Object.assign((req, res, next) => next(nome), { nome });
    const chamados = [];
    const posse = { laudo: (req, res, next) => { chamados.push('laudo'); next(); }, analise: (req, res, next) => { chamados.push('analise'); next(); }, proposta: (req, res, next) => { chamados.push('proposta'); next(); } };
    require('../src/routes/v2/modelo3d')(router, { autenticar: marca('autenticar'), validarId: marca('validarId'), posse, uploadArquitetura: { single: () => marca('upload') } });
    const r = rotas.find(([m, p]) => m === 'post' && p === '/modelo-3d/:origem/:id/gerar-de-novo');
    assert.ok(r, rotas.map(x => x[1]).join(' '));
    assert.deepStrictEqual(r[2].slice(0, 2).map(f => f.nome), ['autenticar', 'validarId']);
    const posseDaOrigem = r[2][2];
    for (const origem of ['laudo', 'analise', 'proposta', 'constructor', '__proto__']) posseDaOrigem({ params: { origem } }, {}, () => {});
    assert.deepStrictEqual(chamados, ['laudo', 'analise', 'proposta']);
    assert.strictEqual(typeof M.refazerModelo, 'function');
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
