// Versão 2.3 — Análise de Projeto a partir de DWG/DXF (utils/analiseCad.js):
// o que cada bloco é (sigla, legenda, nome do Revit, outra área), e a leitura
// completa de um DXF SINTÉTICO (nenhum dado de cliente) na thread à parte:
// texto pelos leitores do PDF, ambientes reais, contagem, metragem e pontos por ambiente.
// Rodar: npm test (pasta backend).
const assert = require('assert');
const path = require('path');
const { descreverSimbolo, descreverLinha, lerArquivoCad, ehArquivoCad } = require('../src/utils/analiseCad');

const SK = path.join(__dirname, '..', '..', 'skills');
const { DesenhoDxf } = require(path.join(SK, '_comum', 'cad', 'dxf.js'));

let ok = 0;
const caso = async (nome, fn) => { await fn(); ok++; };
const g = (nomeLimpo, layer, extra = {}) => ({ bloco: nomeLimpo, nomeLimpo, layer, layers: [layer], atributos: {}, descricaoLegenda: null, ...extra });

function dxfSintetico() {
  const d = new DesenhoDxf({ layers: [
    { nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'INST - TOMADAS', cor: 1 }, { nome: 'CFTV', cor: 3 }, { nome: 'INST - ELETRODUTO', cor: 2 },
  ] });
  d.polilinha([[0, 0], [6, 0], [6, 4], [0, 4]], { layer: 'A-PAREDE', fechada: true });
  d.polilinha([[6.15, 0], [10, 0], [10, 4], [6.15, 4]], { layer: 'A-PAREDE', fechada: true });
  d.texto(2.5, 2, 0.2, 'SALA DE ESTAR', { layer: 'A-TEXTO' });
  d.texto(7.5, 2, 0.2, 'ESCRITORIO', { layer: 'A-TEXTO' });
  d.texto(20, 20, 0.2, 'CLIENTE: Cliente Exemplo Ltda', { layer: 'A-TEXTO' });
  d.bloco('TB-T', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.1, { layerName: '0' }); });
  d.bloco('CAM-DOME', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.15, { layerName: '0' }); });
  for (const x of [0.5, 1.5, 2.5, 7, 8]) d.inserir('TB-T', x, 0.3, { layer: 'INST - TOMADAS' });
  d.inserir('CAM-DOME', 1, 3.5, { layer: 'CFTV' });
  d.inserir('CAM-DOME', 8, 3.5, { layer: 'CFTV' });
  d.inserir('CAM-DOME', 9, 3.5, { layer: 'CFTV' });
  d.linha(0, -1, 12, -1, 'INST - ELETRODUTO');
  return d.toString();
}

(async () => {
  await caso('arquivo CAD pela extensão', async () => {
    assert.ok(ehArquivoCad('Planta.DWG') && ehArquivoCad('x.dxf') && !ehArquivoCad('x.pdf'));
  });

  await caso('sigla de tomada, quadro e luminária do Revit', async () => {
    const t = descreverSimbolo(g('TB-T', 'INST - TOMADAS'));
    assert.strictEqual(t.disciplina, 'eletrica');
    assert.match(t.descricao, /^Tomada baixa 2P\+T — bloco TB-T$/);
    assert.match(descreverSimbolo(g('QL', 'INST - ELÉTRICA')).descricao, /Quadro de distribuição/);
    const l = descreverSimbolo(g('EF35 - EF2 EF35 19W-1950lm-4000K', 'A-DETL-GENF'));
    assert.strictEqual(l.disciplina, 'iluminacao');
    assert.match(l.descricao, /^Luminária — bloco EF35/);
  });

  await caso('emergência no bloco/layer vai para a descrição', async () => {
    assert.match(descreverSimbolo(g('TBT - EMERG', 'INST - TOMADAS EMERGÊNCIA')).descricao, /circuito de emergência/);
  });

  await caso('sigla curta em nome longo não vale (válvula "TA-Smart" não é tomada alta)', async () => {
    const v = descreverSimbolo(g('TA-Smart DN50 Kvs21 2 PN25', 'Acessórios do tubo'));
    assert.strictEqual(v.disciplina, null);
    assert.strictEqual(v.outraArea, true);
  });

  await caso('climatização fica como outra área; marcador de fiação não é identificado', async () => {
    assert.strictEqual(descreverSimbolo(g('Hi-Wall - Daikin HW 9600 BTU h - FXAQ20AVM', 'Equipamento mecânico')).outraArea, true);
    assert.strictEqual(descreverSimbolo(g('Difusor linear TROX VSD50', 'Terminais de ar')).outraArea, true);
    const f = descreverSimbolo(g('f4', 'INST - FIAÇÃO'));
    assert.strictEqual(f.descricao, null);
  });

  await caso('legenda da prancha vale mais que a sigla', async () => {
    const t = descreverSimbolo(g('T3', 'TUBELE', { descricaoLegenda: 'TOMADA DE CORRENTE 2P+T INSTALADA H=0,30m' }));
    assert.strictEqual(t.origem, 'legenda');
    assert.strictEqual(t.disciplina, 'eletrica');
    // "220 V" ao lado do bloco não é descrição
    assert.strictEqual(descreverSimbolo(g('T3', 'TUBELE', { descricaoLegenda: '220 V' })).origem, null);
  });

  await caso('linha pela layer: eletrocalha, fiação, eletroduto', async () => {
    assert.match(descreverLinha({ layer: 'INST - ELETROCALHA' }).descricao, /^Eletrocalha/);
    assert.match(descreverLinha({ layer: 'FIACAO' }).descricao, /^Trecho de fiação/);
    assert.match(descreverLinha({ layer: 'INST - TUBULAÇÃO' }).descricao, /^Eletroduto/);
  });

  await caso('DXF sintético: leitura completa na thread à parte', async () => {
    const r = await lerArquivoCad(Buffer.from(dxfSintetico(), 'utf8'), 'Projeto exemplo.dxf');
    assert.deepStrictEqual(r.analise.ambientes.map(a => a.nome).sort(), ['ESCRITORIO', 'SALA DE ESTAR']);
    assert.strictEqual(r.analise.semTexto, false);
    assert.match(r.analise.textoBruto, /Cliente Exemplo Ltda/);
    const tom = r.pagina.itens.find(i => i.bloco === 'TB-T');
    assert.strictEqual(tom.quantidade, 5);
    assert.strictEqual(tom.disciplina, 'eletrica');
    const cam = r.pagina.itens.find(i => i.disciplina === 'cftv');
    assert.strictEqual(cam.quantidade, 3);
    const eletroduto = r.pagina.itens.find(i => i.tipo === 'linha');
    assert.strictEqual(eletroduto.metros, 12);
    // câmeras por ambiente pela posição do bloco
    const porAmb = Object.fromEntries(r.pontosPorAmbiente.map(p => [p.ambiente, p.cftv]));
    assert.deepStrictEqual(porAmb, { 'SALA DE ESTAR': 1, ESCRITORIO: 2 });
    // a arquitetura volta para virar a base do 3D
    assert.ok(r.arquitetura && r.arquitetura.dxf.includes('SECTION'));
    assert.strictEqual(r.arquitetura.resumo.ambientes.length, 2);
  });

  await caso('arquivo que não é DWG/DXF: erro claro', async () => {
    await assert.rejects(lerArquivoCad(Buffer.from('não sou cad'), 'x.dxf'), /não é um DWG nem um DXF/);
  });

  console.log(`analiseCad: ${ok} casos ok`);
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
