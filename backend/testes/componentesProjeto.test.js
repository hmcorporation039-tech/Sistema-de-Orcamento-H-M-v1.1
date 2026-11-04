// Biblioteca de componentes e edições do engenheiro (versão 2.30): inserir e retirar componentes, com os símbolos de
// cada disciplina, na planta do Mapa do CAD e no 3D; a releitura do desenho conta o inserido no orçamento e tira o
// retirado; o 3D mostra as edições na hora, alinhadas ao arquivo de referência. DXF SINTÉTICO (nenhum dado de cliente).
// Rodar: node testes/componentesProjeto.test.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { componentes, componente } = require('../src/services/bibliotecaComponentes');
const ed = require('../src/services/edicoesDoMapa');
const mapaCad = require('../src/services/mapaCad');
const { lerArquivoCad } = require('../src/services/analiseCad');
const M = require('../src/services/modelo3d');

const SK = require('../src/config/caminhos').RAIZ_SKILLS;
const { DesenhoDxf } = require(path.join(SK, '_comum', 'cad', 'dxf.js'));

function dxfExplodido() {
  const d = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'EL-TOMADAS', cor: 1 }] });
  d.polilinha([[0, 0], [6, 0], [6, 4], [0, 4]], { layer: 'A-PAREDE', fechada: true });
  d.polilinha([[6.15, 0], [10, 0], [10, 4], [6.15, 4]], { layer: 'A-PAREDE', fechada: true });
  d.texto(2.5, 2, 0.2, 'SALA DE ESTAR', { layer: 'A-TEXTO' });
  d.texto(7.5, 2, 0.2, 'ESCRITORIO', { layer: 'A-TEXTO' });
  for (const x of [0.5, 1.5, 2.5, 7, 8]) d.polilinha([[x, 0.3], [x + 0.3, 0.3], [x + 0.15, 0.56]], { layer: 'EL-TOMADAS', fechada: true });
  return d.toString();
}

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

(async () => {
  await caso('biblioteca: todo tipo do 3D/orçamento tem símbolo de planta, disciplina e montagem', () => {
    const lista = componentes();
    assert.ok(lista.length >= 50, `só ${lista.length} componentes`);
    for (const c of lista) {
      assert.ok(c.svg && c.svg.d && c.svg.raio > 0, `${c.simbolo} sem símbolo`);
      assert.ok(c.disciplina && c.nome && c.montagem, c.simbolo);
      assert.ok(c.altura_m === null || (c.altura_m > 0 && c.altura_m < 15), c.simbolo);
    }
    // o símbolo é o mesmo do bloco DXF da H&M (detector: círculo com "F")
    const det = componente('HM-INC-DETECTOR-FUMACA');
    assert.match(det.svg.d, /a0\.15 0\.15/);
    assert.deepStrictEqual(det.svg.textos.map(t => t.t), ['F']);
    assert.strictEqual(det.montagem, 'teto');
    assert.strictEqual(componente('HM-ELE-TOMADA-BAIXA').altura_m, 0.3);
    // climatização deixou de cair em "eletrica"
    assert.ok(lista.filter(c => /^HM-CLIM-/.test(c.simbolo)).every(c => c.disciplina === 'climatizacao'));
    assert.strictEqual(mapaCad.chaveDoProjeto('climatizacao'), 'climatizacao');
  });

  const mapaBase = { simbolos: [], planta: { extensao: [0, 0, 10, 4] } };
  await caso('pedido de edição: validação', () => {
    assert.match(ed.validarPedido({}, mapaBase), /Nada para alterar/);
    assert.match(ed.validarPedido({ adicionar: [{ simbolo: 'HM-NAO-EXISTE', x: 1, y: 1 }] }, mapaBase), /não existe na biblioteca/);
    assert.match(ed.validarPedido({ adicionar: [{ simbolo: 'HM-INC-DETECTOR-FUMACA', x: 500, y: 1 }] }, mapaBase), /fora do desenho/);
    assert.match(ed.validarPedido({ adicionar: [{ simbolo: 'HM-INC-DETECTOR-FUMACA', x: 1, y: 1, altura_m: 40 }] }, mapaBase), /Altura inválida/);
    assert.match(ed.validarPedido({ adicionar: 'x' }, mapaBase), /Formato inválido/);
    assert.match(ed.validarPedido({ desfazer: ['<script>'] }, mapaBase), /inválida/);
    assert.strictEqual(ed.validarPedido({ adicionar: [{ simbolo: 'HM-INC-DETECTOR-FUMACA', x: 2, y: 2 }], remover: [{ x: 1, y: 0.4 }] }, mapaBase), null);
  });

  await caso('aplicar: inserir, retirar, retirar o inserido (= desfazer) e desfazer pelo id', () => {
    let { edicoes, resumo } = ed.aplicarPedido(null, { adicionar: [{ simbolo: 'HM-INC-DETECTOR-FUMACA', x: 2, y: 2 }], remover: [{ x: 1, y: 0.4, simbolo: 'HM-ELE-TOMADA-BAIXA' }] }, 3, '2026-11-03T10:00:00Z');
    assert.deepStrictEqual(resumo, { adicionados: 1, removidos: 1, desfeitos: 0 });
    const a = edicoes.adicionados[0];
    assert.match(a.id, /^a[0-9a-f]{10}$/);
    assert.deepStrictEqual([a.simbolo, a.disciplina, a.rotulo, a.x, a.y, a.usuario_id], ['HM-INC-DETECTOR-FUMACA', 'incendio', 'Detector pontual de fumaça', 2, 2, 3]);
    // retirar duas vezes o mesmo ponto não duplica
    ({ edicoes } = ed.aplicarPedido(edicoes, { remover: [{ x: 1.02, y: 0.41 }] }));
    assert.strictEqual(edicoes.removidos.length, 1);
    // retirar o que foi inserido desfaz a inserção (não vira "retirado")
    ({ edicoes, resumo } = ed.aplicarPedido(edicoes, { remover: [{ x: 2.05, y: 2 }] }));
    assert.deepStrictEqual([edicoes.adicionados.length, edicoes.removidos.length, resumo.desfeitos], [0, 1, 1]);
    ({ edicoes } = ed.aplicarPedido(edicoes, { desfazer: [edicoes.removidos[0].id] }));
    assert.strictEqual(edicoes.removidos.length, 0);
    assert.ok(ed.retirado({ removidos: [{ x: 1, y: 1 }] }, 1.1, 1.05));
    assert.ok(!ed.retirado({ removidos: [{ x: 1, y: 1 }] }, 1.3, 1));
    assert.ok(ed.retirado({ removidos: [{ x: 1, y: 1 }] }, 11, 6, 10, 5), 'com o deslocamento do arquivo');
    // cada retirada tira UM componente, o mais perto (até 35 cm: o ponto de inserção do bloco pode ficar fora do centro)
    assert.deepStrictEqual([...ed.indicesRetirados([[0, 0], [0.2, 0], [1, 1]], { removidos: [{ x: 0.12, y: 0 }] })], [1]);
    assert.deepStrictEqual([...ed.indicesRetirados([[0, 0], [0.3, 0]], { removidos: [{ x: 0.3, y: 0.01 }, { x: 0.29, y: 0 }] })].sort(), [0, 1], 'duas retiradas no mesmo lugar tiram dois');
    assert.deepStrictEqual([...ed.indicesRetirados([[0, 0]], { removidos: [{ x: 0.5, y: 0 }] })], []);
  });

  const dxf = Buffer.from(dxfExplodido());
  let base;
  await caso('releitura com edições: o inserido entra no orçamento (conferido), o retirado sai, e as edições seguem com o mapa', async () => {
    base = await lerArquivoCad(dxf, 'planta.dxf');
    const linha = base.mapa.simbolos.find(s => s.layer === 'EL-TOMADAS');
    const confirmados = mapaCad.confirmadasDoMapa(mapaCad.aplicarNoMapa(base.mapa, [{ idx: linha.idx, simbolo: 'HM-ELE-TOMADA-BAIXA', confirmado: true }]).mapa);
    const tomadas = base.mapa.planta.pontos.filter(p => p[0] === linha.idx);
    assert.strictEqual(tomadas.length, 5);
    const { edicoes } = ed.aplicarPedido(null, {
      adicionar: [{ simbolo: 'HM-INC-DETECTOR-FUMACA', x: 3, y: 2 }, { simbolo: 'HM-INC-DETECTOR-FUMACA', x: 8, y: 2 }, { simbolo: 'HM-ELE-TOMADA-MEDIA', x: 5.5, y: 3.6 }],
      remover: [{ x: tomadas[0][1], y: tomadas[0][2] }],
    });
    const r = await lerArquivoCad(dxf, 'planta.dxf', { confirmados, edicoes });
    const itens = r.pagina.itens.filter(it => it.tipo === 'simbolo');
    const tomada = itens.find(it => it.bloco === 'HM-ELE-TOMADA-BAIXA');
    assert.strictEqual(tomada.quantidade, 4, 'a tomada retirada sai da contagem');
    const det = itens.find(it => it.bloco === 'HM-INC-DETECTOR-FUMACA');
    assert.ok(det, JSON.stringify(itens.map(i => [i.bloco, i.quantidade])));
    assert.deepStrictEqual([det.quantidade, det.ambiguo, det.disciplina, det.origemDescricao, det.montagem], [2, false, 'incendio', 'inserido', 'teto']);
    const media = itens.find(it => it.bloco === 'HM-ELE-TOMADA-MEDIA');
    assert.deepStrictEqual([media.quantidade, media.altura_m, media.ambiguo], [1, 1.1, false], 'a altura típica da biblioteca vai junto');
    // 3D: os pontos levam o tipo exato e o id do inserido
    const noEspacial = r.espacial.pontos.filter(p => p.edicao);
    assert.strictEqual(noEspacial.length, 3);
    assert.ok(noEspacial.every(p => p.simbolo && /^a[0-9a-f]{10}$/.test(p.edicao)));
    assert.ok(r.espacial.pontos.filter(p => !p.edicao && p.simbolo === 'HM-ELE-TOMADA-BAIXA').length === 4);
    assert.deepStrictEqual(r.mapa.edicoes, edicoes);
    assert.strictEqual(r.mapa.edicoesNoOrcamento, true);
    assert.match(r.pagina.aviso, /3 componente\(s\) inserido\(s\) da biblioteca e 1 retirado\(s\)/);
    // disciplina do inserido que não foi marcada no envio: avisada para entrar no reprocessamento
    assert.deepStrictEqual(mapaCad.disciplinasAIncluir(r.mapa, ['eletrica']).map(d => [d.chave, d.pontos]), [['incendio', 2]]);
    assert.deepStrictEqual([mapaCad.resumoDoMapa(r.mapa).inseridos, mapaCad.resumoDoMapa(r.mapa).retirados], [3, 1]);
  });

  await caso('3D na hora: as edições do arquivo entram alinhadas à referência, sem repetir o que a leitura já aplicou', () => {
    const espacial = { referencia: 'arq.dxf', pontos: [
      { x: 11, y: 5, descricao: 'Tomada baixa', disciplina: 'eletrica', simbolo: 'HM-ELE-TOMADA-BAIXA' },
      { x: 13, y: 5, descricao: 'Tomada baixa', disciplina: 'eletrica', simbolo: 'HM-ELE-TOMADA-BAIXA' },
      { x: 15, y: 7, descricao: 'Detector pontual de fumaça', disciplina: 'incendio', simbolo: 'HM-INC-DETECTOR-FUMACA', edicao: 'a00000000aa' },
    ] };
    const { edicoes } = ed.aplicarPedido(null, { adicionar: [{ simbolo: 'HM-CFTV-CAMERA', x: 2, y: 1 }], remover: [{ x: 1, y: 0 }] });
    edicoes.adicionados.push({ id: 'a00000000aa', simbolo: 'HM-INC-DETECTOR-FUMACA', disciplina: 'incendio', x: 5, y: 2 });
    const an = {
      espacial,
      compatibilizacao: { referencia: 'arq.dxf', grupos: [{ referencia: 'arq.dxf', membros: [{ arquivo: 'arq.dxf', dx: 0, dy: 0 }, { arquivo: 'ele.dxf', dx: 10, dy: 5 }] }] },
      dados_extraidos: [{ arquivo: 'ele.dxf', mapa_cad: { arquivo: 'ele.dxf', simbolos: [], edicoes } }],
    };
    const r = M.comEdicoes(M.dispositivosDoEspacial(espacial), an);
    assert.strictEqual(r.retirados, 1, 'a tomada em (1, 0) do arquivo = (11, 5) no 3D');
    assert.strictEqual(r.inseridos, 1, 'o detector já aplicado pela leitura não repete');
    const cam = r.dispositivos.find(d => d.simbolo === 'HM-CFTV-CAMERA');
    assert.deepStrictEqual([cam.x, cam.y, cam.disciplina], [12, 6, 'cftv']);
    assert.ok(cam.id.startsWith('a'), 'o inserido tem id estável no 3D');
    // o tipo exato guardado na leitura vale mais que a descrição
    assert.ok(r.dispositivos.some(d => d.simbolo === 'HM-INC-DETECTOR-FUMACA' && d.edicao === 'a00000000aa'));
    // arquivo fora do grupo de referência: as edições dele esperam o reprocessamento
    const fora = M.comEdicoes(M.dispositivosDoEspacial(espacial), { ...an, dados_extraidos: [{ arquivo: 'outro.dxf', mapa_cad: { simbolos: [], edicoes } }] });
    assert.strictEqual(fora.dispositivos.length, 3);
  });

  await caso('3D embutido: só a tela do sistema emoldura, e a página continua em sandbox sem a origem do sistema', () => {
    assert.match(M.CSP_MODELO_3D, /frame-ancestors 'none'/);
    assert.match(M.CSP_MODELO_3D_EMBUTIDO, /frame-ancestors 'self'/);
    assert.match(M.CSP_MODELO_3D_EMBUTIDO, /sandbox allow-scripts;/);
    assert.ok(!/allow-same-origin|connect-src/.test(M.CSP_MODELO_3D_EMBUTIDO));
    const t = M.criarLink('analise', 5, { embutido: true });
    assert.strictEqual(M.lerLink(t).embutido, true);
    assert.ok(!('embutido' in M.lerLink(M.criarLink('analise', 5))));
  });

  await caso('rota das edições passa por autenticação e posse; o visualizador só edita dentro da tela', () => {
    const rotas = fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'index.js'), 'utf8');
    assert.match(rotas, /router\.put\('\/projetos\/analises\/:id\/mapa\/edicoes', autenticar, validarId, posseAnalise, projCtrl\.editarMapaCad\)/);
    const edicao = fs.readFileSync(path.join(SK, '_comum', 'cad', 'visualizador3d', 'edicao.js'), 'utf8');
    assert.match(edicao, /window\.parent && window\.parent !== window/);
    assert.match(edicao, /ev\.source !== window\.parent/);
    assert.ok(!/fetch\(|XMLHttpRequest|localStorage/.test(edicao), 'o 3D não fala com a rede nem guarda nada');
  });

  console.log(`componentesProjeto: ${ok} casos ok`);
  process.exit(0);
})().catch(e => { console.error('FALHOU:', e); process.exit(1); });
