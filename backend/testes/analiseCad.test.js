// Versão 2.3 — Análise de Projeto a partir de DWG/DXF (services/analiseCad/index.js):
// o que cada bloco é (sigla, legenda, nome do Revit, outra área), e a leitura
// completa de um DXF SINTÉTICO (nenhum dado de cliente) na thread à parte:
// texto pelos leitores do PDF, ambientes reais, contagem, metragem e pontos por ambiente.
// Rodar: npm test (pasta backend).
const assert = require('assert');
const path = require('path');
const { descreverSimbolo, descreverLinha, lerArquivoCad, ehArquivoCad } = require('../src/services/analiseCad');

const SK = require('../src/config/caminhos').RAIZ_SKILLS;
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

  await caso('linha pela layer: eletrocalha, eletroduto; fiação é rota (cabo = (rota + descidas) × condutores), não material', async () => {
    assert.match(descreverLinha({ layer: 'INST - ELETROCALHA' }).descricao, /^Eletrocalha/);
    const f = descreverLinha({ layer: 'FIACAO' });
    assert.strictEqual(f.rota, true);
    assert.match(f.descricao, /^Rota da fiação .* \(rota \+ descidas\) × nº de condutores/);
    assert.match(descreverLinha({ layer: 'INST - TUBULAÇÃO' }).descricao, /^Eletroduto/);
    assert.strictEqual(descreverLinha({ layer: 'INST - TUBULAÇÃO' }).rota, false);
  });

  // ── Revisão de 29/10/2026 (desenhos reais), casos sintéticos ──
  await caso('M1: biblioteca de símbolos da H&M reconhecida sem legenda (todos os blocos de simbolos.js)', async () => {
    const { BLOCOS_HM } = require(path.join(SK, '_comum', 'cad', 'disciplinasCad.js'));
    const sem = Object.entries(BLOCOS_HM).filter(([nome, s]) => { const d = descreverSimbolo(g(nome, s.layer)); return !d.descricao || !d.disciplina; });
    assert.deepStrictEqual(sem.map(([n]) => n), []);
    assert.strictEqual(descreverSimbolo(g('HM-ACE-CONTROLADORA', 'ACE-CONTROLADORA')).disciplina, 'controle_acesso');
    assert.strictEqual(descreverSimbolo(g('HM-HOSP-PAINEL-ALARME', 'ELE-QUADRO')).disciplina, 'eletrica_hospitalar');
    assert.strictEqual(descreverSimbolo(g('HM-INC-CENTRAL', 'INC-CENTRAL')).descricao, 'Central de alarme de incêndio — bloco HM-INC-CENTRAL');
    assert.deepStrictEqual(descreverSimbolo(g('HM-ELE-TOMADA-BAIXA', 'ELE-TOMADA')).altura, { altura_m: 0.3, montagem: 'parede' });
  });

  await caso('M1: disciplina pelo prefixo do bloco e da layer (INC-, CAB-, CA-, D10_TEL…)', async () => {
    // a sigla "SIRENE" é de alarme, mas o bloco e a layer são de incêndio
    assert.strictEqual(descreverSimbolo(g('INC SIRENE AV', 'INC-SIRENE', { descricaoLegenda: 'Sinalizador audiovisual SAV' })).disciplina, 'incendio');
    assert.strictEqual(descreverSimbolo(g('SIRENE', 'INC-AVISADOR')).disciplina, 'incendio');
    assert.strictEqual(descreverSimbolo(g('SIRENE', 'ALM-SIRENE')).disciplina, 'alarme');
    assert.strictEqual(descreverSimbolo(g('ISO', 'INC-ISOLADOR', { descricaoLegenda: 'Isolador de laço IDL' })).disciplina, 'incendio');
    assert.strictEqual(descreverSimbolo(g('FONTE', 'CA-DISPOSITIVO', { descricaoLegenda: 'Fonte com bateria' })).disciplina, 'controle_acesso');
    assert.match(descreverSimbolo(g('ELE QD', 'CAB-MONITORAMENTO')).descricao, /^Quadro de distribuição/);
    assert.strictEqual(descreverLinha({ layer: 'CAB-ELETROCALHA' }).disciplina, 'rede');
    assert.strictEqual(descreverLinha({ layer: 'INC-ELETRODUTO' }).disciplina, 'incendio');
    assert.strictEqual(descreverLinha({ layer: 'CA-INFRA' }).disciplina, 'controle_acesso');
    assert.strictEqual(descreverLinha({ layer: 'D10_TEL_ELETROCALHAS' }).disciplina, 'telefonia');
    assert.strictEqual(descreverLinha({ layer: 'ARQ-ANT-TXT' }).disciplina, null, 'token de disciplina depois de ARQ não vale');
  });

  await caso('A11: câmera "P-DOMEFIXA1" (DOME sem borda de palavra) e bloco de xref pelo nome depois do "$0$"', async () => {
    const d = descreverSimbolo(g('P-DOMEFIXA1', 'CFTV-EQUIPTOS'));
    assert.strictEqual(d.disciplina, 'cftv');
    assert.match(d.descricao, /^Câmera de CFTV/);
    assert.notStrictEqual(descreverSimbolo(g('CONDOMINIO', 'TEXTO')).disciplina, 'cftv');
  });

  function dxfRevisao() {
    const d = new DesenhoDxf({ layers: [
      { nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'ELE-TOMADA', cor: 1 }, { nome: 'CFTV-CAMERA', cor: 3 }, { nome: 'FIACAO', cor: 2 },
      { nome: 'ELE-ELETRODUTO', cor: 1 }, { nome: 'G-LEGENDA', cor: 7 },
    ] });
    // corredor 1,2 × 10 m e sala 6 × 4 m
    d.polilinha([[0, 0], [10, 0], [10, 1.2], [0, 1.2]], { layer: 'A-PAREDE', fechada: true });
    d.polilinha([[0, 2], [6, 2], [6, 6], [0, 6]], { layer: 'A-PAREDE', fechada: true });
    d.texto(4, 0.5, 0.2, 'CORREDOR', { layer: 'A-TEXTO' });
    d.texto(2, 4, 0.2, 'SALA', { layer: 'A-TEXTO' });
    d.bloco('TUG', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.1, { layerName: '0' }); }, [{ tag: 'ALTURA', x: 0.2, y: 0, altura: 0.1 }]);
    d.bloco('CAM', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.15, { layerName: '0' }); });
    for (const x of [1, 3, 5]) d.inserir('TUG', x, 2.3, { layer: 'ELE-TOMADA', atributos: { ALTURA: 'h=0,30m' } });
    // xref de CFTV dentro do desenho de elétrica: referência, não conta
    d.bloco('XREF-CFTV', (b) => {
      b.addLine({ x: 0, y: 0, z: 0 }, { x: 8, y: 0, z: 0 }, { layerName: '0' });
      b.addInsert('CAM', { x: 1, y: 3, z: 0 }, { layerName: 'CFTV-CAMERA' });
      b.addInsert('CAM', { x: 4, y: 3, z: 0 }, { layerName: 'CFTV-CAMERA' });
    });
    d.inserir('XREF-CFTV', 0, 2, { layer: 'A-TEXTO' });
    // fiação desenhada (rota) e eletroduto
    d.linha(0, 0.6, 10, 0.6, 'FIACAO');
    d.linha(0, 1.0, 8, 1.0, 'ELE-ELETRODUTO');
    // legenda com QTD diferente do desenho
    d.texto(20, 10, 0.25, 'LEGENDA', { layer: 'G-LEGENDA' });
    d.inserir('TUG', 20.3, 9.46, { layer: 'ELE-TOMADA' });
    d.texto(20.8, 9.4, 0.15, 'Tomada baixa 2P+T 10 A h=0,30m', { layer: 'G-LEGENDA' });
    d.texto(26, 9.4, 0.15, 'QTD: 4', { layer: 'G-LEGENDA' });
    // tipo na legenda com QTD e nenhum na planta
    d.bloco('TUE', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.1, { layerName: '0' }); });
    d.inserir('TUE', 20.3, 8.81, { layer: 'ELE-TOMADA' });
    d.texto(20.8, 8.75, 0.15, 'Tomada de uso específico 20 A', { layer: 'G-LEGENDA' });
    d.texto(26, 8.75, 0.15, 'QTD: 2', { layer: 'G-LEGENDA' });
    return d.toString();
  }

  await caso('DXF da revisão: QTD da legenda, rota da fiação, perímetro/polígono, altura, xref de outra disciplina', async () => {
    const r = await lerArquivoCad(Buffer.from(dxfRevisao(), 'utf8'), 'Revisao.dxf');
    // M8: perímetro real e polígono (o corredor 1,2 × 10 m tem 22,4 m de perímetro, não 4·√12 = 13,9)
    const cor = r.analise.ambientes.find(a => a.nome === 'CORREDOR');
    assert.strictEqual(cor.perimetro_m, 22.4);
    assert.strictEqual(cor.poligono.length, 4);
    assert.deepStrictEqual([cor.retangulo.largura_m, cor.retangulo.comprimento_m], [1.2, 10]);
    // A6: QTD da legenda volta junto e a divergência vira conferência
    const tug = r.pagina.itens.find(i => i.bloco === 'TUG');
    assert.strictEqual(tug.quantidade, 3);
    assert.strictEqual(tug.quantidadeLegenda, 4);
    assert.deepStrictEqual(r.pagina.conferenciaLegenda.map(c => [c.bloco, c.desenho, c.legenda]), [['TUG', 3, 4], ['TUE', 0, 2]]);
    // M9: altura de instalação por ponto
    assert.strictEqual(tug.altura_m, 0.3);
    assert.ok(r.espacial.pontos.filter(p => p.disciplina === 'eletrica').every(p => p.altura_m === 0.3 && p.montagem === 'parede'));
    // A8: fiação é rota (sem material de cabo = rota); eletroduto continua material
    assert.ok(!r.pagina.itens.some(i => i.layer === 'FIACAO'), 'fiação não vira material');
    const fi = r.pagina.rotas.find(x => x.layer === 'FIACAO');
    assert.strictEqual(fi.tipo, 'fiacao');
    assert.strictEqual(fi.rota_m, 10);
    assert.deepStrictEqual(fi.cabo, { rota_m: 10, descidas_m: null, condutores: null, formula: '(rota + descidas) × condutores' });
    const ed = r.pagina.itens.find(i => i.layer === 'ELE-ELETRODUTO');
    assert.strictEqual(ed.metros, 8);
    assert.strictEqual(ed.rota_m, 8);
    assert.strictEqual(ed.disciplina, 'eletrica');
    // A11: câmeras da xref de CFTV não contam no desenho de elétrica
    assert.ok(!r.pagina.itens.some(i => i.disciplina === 'cftv'), JSON.stringify(r.pagina.itens.map(i => i.descricao)));
    assert.deepStrictEqual(r.pagina.xrefsDeOutraDisciplina, [{ xref: 'XREF-CFTV', disciplina: 'cftv', componentes: 2, metros: 0 }]);
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

  await caso('PDF com lista + DWG do mesmo projeto: o item não é somado duas vezes (vale o DWG, com a descrição da lista)', async () => {
    const { semDuplicarFontes, tipoDoItem } = require('../src/utils/analiseProjetoItens');
    const m = (descricao, quantidade, unidade, _fonte, disciplina = 'eletrica', extra = {}) => ({ descricao, quantidade, unidade, _fonte, disciplina, observacao: `obs ${_fonte}.`, ...extra });
    const achados = [];
    const saida = semDuplicarFontes([
      m('Tomada 2P+T 10 A', 6, 'un', 'lista', 'eletrica', { material_id: 77 }),
      m('Tomada baixa 2P+T — bloco TUG', 6, 'un', 'cad'),
      m('Eletroduto PVC flexível 3/4"', 35, 'm', 'lista'),
      m('Eletroduto — medido no desenho', 23, 'm', 'cad'),
      m('Disjuntor monopolar 16 A', 4, 'un', 'lista'), // só na lista: fica
      m('Tomada de rede RJ-45', 8, 'un', 'lista', 'rede'), // outra disciplina e tipo "ponto de rede": fica
      { descricao: 'Interruptor simples (modelo)', quantidade: 0, unidade: 'un', disciplina: 'eletrica' }, // item-modelo sem fonte: fica
    ], achados);
    assert.deepStrictEqual(saida.map(x => [x.descricao, x.quantidade]), [
      ['Tomada 2P+T 10 A', 6], ['Eletroduto PVC flexível 3/4"', 23], ['Disjuntor monopolar 16 A', 4], ['Tomada de rede RJ-45', 8], ['Interruptor simples (modelo)', 0],
    ]);
    assert.strictEqual(saida[0].material_id, 77, 'item do DWG herda o material do catálogo da lista');
    assert.ok(saida.every(x => !('_fonte' in x)), 'marca interna não vai para o banco');
    assert.strictEqual(achados.length, 1);
    assert.ok(/tomada: vale DWG\/DXF \(6\); lista de materiais do PDF dizia 6/.test(achados[0].observacao) && /eletroduto: vale DWG\/DXF \(23\); lista de materiais do PDF dizia 35/.test(achados[0].observacao), achados[0].observacao);
    assert.deepStrictEqual(['Tomada de rede', 'Tomada 2P+T', 'Luminária de sobrepor'].map(tipoDoItem), ['ponto_rede', 'tomada', 'luminaria']);
    // lista × contagem pelo desenho do PDF (sem DWG): vale a lista
    const s2 = semDuplicarFontes([m('Luminária LED 18 W', 10, 'un', 'lista', 'iluminacao'), m('LUMINÁRIA DE SOBREPOR', 12, 'un', 'pdf', 'iluminacao')], []);
    assert.deepStrictEqual(s2.map(x => x.quantidade), [10]);
  });

  console.log(`analiseCad: ${ok} casos ok`);
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
