// Versão 2.3 — modelo 3D ilustrativo (services/modelo3d): geração na thread à
// parte com uma arquitetura SINTÉTICA (nenhum dado de cliente), chave do cache,
// link curto, política da página e anexo do PDF (escapado). Sem banco.
// Rodar: npm test (pasta backend).
const assert = require('assert');
const path = require('path');
const M = require('../src/services/modelo3d');
const { gerarHtmlProposta } = require('../src/utils/pdfTemplate');

const CAD = path.join(__dirname, '..', '..', 'skills', '_comum', 'cad');
const { DesenhoDxf } = require(path.join(CAD, 'dxf.js'));
const { point3d } = require(path.join(__dirname, '..', '..', 'skills', 'node_modules', '@tarikjabiri', 'dxf'));

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
