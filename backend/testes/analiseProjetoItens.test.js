// Análise de projeto → itens de orçamento (utils/analiseProjetoItens.js,
// analiseProjetoAchados.js, classificarArquivoProjeto.js, ponteAnaliseSkill.js
// e o cliente de services/compatibilizacaoAnalise.js). Dados SINTÉTICOS nos
// formatos lidos dos projetos reais da revisão de 29/10/2026 — nenhum dado de
// cliente. Rodar: node testes/analiseProjetoItens.test.js (pasta backend).
const assert = require('assert');
const I = require('../src/utils/analiseProjetoItens');
const { sugerirDisciplinas } = require('../src/utils/classificarArquivoProjeto');
const { extrairCliente } = require('../src/services/compatibilizacaoAnalise');

let ok = 0;
function caso(nome, fn) {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack}`); process.exitCode = 1; }
}

// análise mínima de um arquivo (formato de projetoParser.analisarProjeto)
const codigos = (total) => ({ total, ocorrencias: total, unicas: [], repetidas: [], faltando: [] });
const analise = (arquivo, disciplinas, extra = {}) => ({
  arquivo, disciplinas, cameras: codigos(0), pontosRedeAntena: { rede: codigos(0), antena: codigos(0) },
  quadroCargas: [], listaMateriais: [], tabelaQuantitativa: [], ambientes: [], ...extra,
});

caso('A4: arquivo marcado "cabeamento" conta os pontos R como o marcado "rede"', () => {
  const comoRede = [analise('cab.pdf', ['rede'], { pontosRedeAntena: { rede: codigos(69), antena: codigos(0) } })];
  const comoCab = [analise('cab.pdf', ['cabeamento'], { pontosRedeAntena: { rede: codigos(69), antena: codigos(0) } })];
  assert.strictEqual(I.totaisCodificados(comoCab).rede, 69);
  const serv = I.montarServicosPadrao(comoCab, ['cabeamento']);
  const s = Object.fromEntries(serv.map(x => [x.codigo, x]));
  assert.strictEqual(s.rede_ponto.quantidade, 69);
  assert.strictEqual(s.rede_ponto.disciplina, 'cabeamento', 'entra na disciplina marcada');
  assert.strictEqual(s.cab_certificacao.quantidade, 69);
  const mat = I.montarMateriaisInstalacaoPadrao(comoCab, ['cabeamento']);
  assert.strictEqual(mat.find(m => /Keystone/.test(m.descricao)).quantidade, 69);
  // marcado "rede": o mesmo resultado
  assert.strictEqual(I.montarServicosPadrao(comoRede, ['rede']).find(x => x.codigo === 'rede_ponto').quantidade, 69);
  const amb = I.montarPontosPorAmbiente([], comoCab, [[{ ambiente: 'SALA', cftv: 0, rede: 3, antena: 0 }]]);
  assert.strictEqual(amb[0].rede, 3);
});

caso('A4: pacote "…-CAB.ESTRU.pdf" é cabeamento, não automação pelo "AUT" do código', () => {
  assert.deepStrictEqual(sugerirDisciplinas('SENG-AUT-OBRA_EXEMPLO_R02-CAB.ESTRU (1).pdf').disciplinas, ['cabeamento']);
  assert.deepStrictEqual(sugerirDisciplinas('AUT-01.pdf').disciplinas, ['automacao'], 'sozinho, AUT ainda vale');
  assert.deepStrictEqual(sugerirDisciplinas('LOG-CFTV-02.pdf').disciplinas.sort(), ['cabeamento', 'cftv']);
});

caso('quadros: desenho só de painel é "quadros"; planta elétrica com QD-01 e unifilar continua elétrica', () => {
  const painel = ['LAYOUT DO PAINEL QGBT', 'VISTA FRONTAL', 'PLACA DE MONTAGEM 1200x800', 'BARRAMENTO DE COBRE', 'BORNES X1 1-24',
    'DIAGRAMA DE COMANDO', 'DIAGRAMA DE FORÇA', 'CONTATOR K1', 'QGBT'].join('\n');
  const planta = ['PLANTA BAIXA - TÉRREO', 'SALA 01', 'A= 24,50 m²', 'COZINHA', 'A= 12,00 m²', 'TOMADA BAIXA', 'QD-01',
    'QUADRO DE CARGAS QD-01', 'DIAGRAMA UNIFILAR QD-01', 'QUADRO DE DISTRIBUIÇÃO'].join('\n');
  assert.deepStrictEqual(sugerirDisciplinas('QD-01.pdf', painel).disciplinas, ['quadros'], 'nome dá elétrica, conteúdo é só painel');
  assert.deepStrictEqual(sugerirDisciplinas('Memorial.pdf', painel).disciplinas, ['quadros']);
  assert.deepStrictEqual(sugerirDisciplinas('ELE-01.pdf', planta).disciplinas, ['eletrica']);
  assert.deepStrictEqual(sugerirDisciplinas('Projeto.pdf', planta).disciplinas, ['eletrica']);
  assert.deepStrictEqual(sugerirDisciplinas('ELE-01.pdf', `${planta}\n${painel}`).disciplinas, ['eletrica', 'quadros'], 'planta + fabricação: quadros como segunda');
  assert.deepStrictEqual(sugerirDisciplinas('LAYOUT DO PAINEL QGBT.dwg').disciplinas, ['quadros'], 'DWG só pelo nome');
  assert.deepStrictEqual(sugerirDisciplinas('QD-01.dwg').disciplinas, ['eletrica'], 'sem conteúdo, QD continua elétrica');
});

caso('M3: cliente só na mesma linha; número ou outro rótulo não é cliente', () => {
  assert.strictEqual(extrairCliente('ASSINATURA / APROVAÇÃO DO AUTOR E DO CLIENTE:\n00\t18/09/2024'), null);
  assert.strictEqual(extrairCliente('CLIENTE:\nENDEREÇO:\tRua X'), null);
  assert.strictEqual(extrairCliente('CLIENTE:\tENDEREÇO:'), null);
  assert.strictEqual(extrairCliente('APROVAÇÃO DO CLIENTE:\n00\nCLIENTE: CONDOMÍNIO EXEMPLO\tFOLHA 1'), 'CONDOMÍNIO EXEMPLO');
});

// material com a marca interna de fonte (semDuplicarFontes)
const mat = (descricao, quantidade, _fonte, _arquivo, disciplina = 'eletrica', unidade = 'un') => ({ descricao, quantidade, unidade, disciplina, _fonte, _arquivo, observacao: `obs ${_fonte}.` });

caso('A9: mesmo tipo em pavimentos diferentes soma; mesmo desenho em dois formatos conta uma vez', () => {
  const achados = [];
  const r = I.semDuplicarFontes([
    mat('Tomada baixa 2P+T — bloco TB', 40, 'cad', 'TERREO.dwg'),
    mat('2 Tomadas médias a 1,20m do piso', 35, 'pdf', 'SUPERIOR.pdf'),
  ], achados);
  assert.deepStrictEqual(r.map(m => m.quantidade), [40, 35]);
  assert.ok(achados.some(a => /somado/.test(a.tema) && /TERREO\.dwg/.test(a.observacao)), JSON.stringify(achados));
  assert.ok(r.every(m => !('_arquivo' in m) && !('_fonte' in m)));
  // mesmo nome-base (revisão e cópia não contam): vale o DWG
  const a2 = [];
  const r2 = I.semDuplicarFontes([
    mat('Tomada 2P+T — bloco TUG', 6, 'cad', 'OBRA_ELE_TERREO_R04.dwg'),
    mat('Tomada 2P+T 10 A', 7, 'lista', 'OBRA_ELE_TERREO_REV.03 (1).pdf'),
  ], a2);
  assert.deepStrictEqual(r2.map(m => [m.descricao, m.quantidade]), [['Tomada 2P+T 10 A', 6]]);
  assert.ok(/mesmo desenho/.test(a2[0].observacao));
  // nomes diferentes, mas a compatibilização casou os ambientes: mesmo pavimento
  const r3 = I.semDuplicarFontes([
    mat('Tomada 2P+T — bloco TUG', 6, 'cad', 'ELETRICA.dwg'),
    mat('TOMADA BAIXA', 7, 'pdf', 'PRANCHA-02.pdf'),
  ], [], { gruposCompat: [{ referencia: 'ARQ.dwg', membros: [{ arquivo: 'ARQ.dwg' }, { arquivo: 'ELETRICA.dwg' }, { arquivo: 'PRANCHA-02.pdf' }] }] });
  assert.deepStrictEqual(r3.map(m => m.quantidade), [6]);
  // dois pavimentos em DWG + o PDF de um deles: o PDF sai, os DWGs somam
  const r4 = I.semDuplicarFontes([
    mat('Tomada — bloco TUG', 10, 'cad', 'P1.dwg'), mat('Tomada — bloco TUG', 12, 'cad', 'P2.dwg'), mat('TOMADA', 9, 'pdf', 'P2.pdf'),
  ], []);
  assert.deepStrictEqual(r4.map(m => m.quantidade), [10, 12]);
});

caso('BAIXO: reserva de plug RJ-45 em percentual, não +24 fixo', () => {
  const an = [analise('cftv.pdf', ['cftv'], { cameras: codigos(2) })];
  const plug = (n) => I.montarMateriaisInstalacaoPadrao([analise('c.pdf', ['cftv'], { cameras: codigos(n) })], ['cftv']).find(m => /Plug RJ-45/.test(m.descricao));
  assert.strictEqual(I.montarMateriaisInstalacaoPadrao(an, ['cftv']).find(m => /Plug RJ-45/.test(m.descricao)).quantidade, 4);
  assert.strictEqual(plug(75).quantidade, 90);
  assert.match(plug(75).observacao, /20 %/);
});

// página do DWG/DXF e do PDF vetorial (formato de analiseCad e pdfVetorial)
const sim = (descricao, quantidade, extra = {}) => ({ tipo: 'simbolo', descricao, quantidade, ambiguo: false, ...extra });
const lin = (descricao, metros, extra = {}) => ({ tipo: 'linha', descricao, metros, ambiguo: false, ...extra });
const servicos = (analises, vetoriais, efetivas) => {
  const cont = I.contagemDoDesenho(analises, vetoriais);
  return Object.fromEntries(I.montarServicosPadrao(analises, efetivas, {}, {}, cont).map(s => [s.codigo, s]));
};

caso('A5: incêndio, controle de acesso e SPDA ganham mão de obra pela contagem do DWG/DXF', () => {
  const an = [analise('inc.dxf', ['incendio', 'cftv', 'cabeamento'])];
  const v = [[{ origem: 'cad', pagina: 'DXF', itens: [
    sim('Detector de fumaca DFE 521 (teto) — bloco INC DET FUMACA', 13, { bloco: 'INC DET FUMACA', layer: 'INC-DETECTOR', disciplina: 'incendio' }),
    // o CAD deu "alarme" (palavra sirene), mas a layer é de incêndio
    sim('Sinalizador audiovisual SAV 521E h=2,40m — bloco INC SIRENE AV', 5, { bloco: 'INC SIRENE AV', layer: 'INC-SIRENE', disciplina: 'alarme' }),
    sim('Acionador manual AME 521 h=1,20m — bloco INC ACIONADOR', 3, { bloco: 'INC ACIONADOR', layer: 'INC-ACIONADOR', disciplina: 'incendio' }),
    sim('Central de alarme CIE 1125 — bloco INC CENTRAL', 1, { bloco: 'INC CENTRAL', layer: 'INC-CENTRAL', disciplina: 'alarme' }),
    // câmera com a descrição trocada pela legenda: não vira serviço de incêndio
    sim('Acionador manual AME 521 h=1,20m — bloco CFTV CAMERA', 15, { bloco: 'CFTV CAMERA', layer: 'CFTV-CAMERA', disciplina: 'cftv' }),
    lin('Eletroduto — medido no desenho (layer "INC-ELETRODUTO")', 66.8, { layer: 'INC-ELETRODUTO', disciplina: null }),
    lin('Eletroduto — medido no desenho (layer "INC-ELETRODUTO-RET")', 29.1, { layer: 'INC-ELETRODUTO-RET', disciplina: null }),
    lin('Eletrocalha — medido no desenho (layer "CAB-ELETROCALHA")', 83.9, { layer: 'CAB-ELETROCALHA', disciplina: null }),
  ] }]];
  const s = servicos(an, v, ['incendio', 'cftv', 'cabeamento']);
  assert.strictEqual(s.inc_dispositivo.quantidade, 21);
  assert.strictEqual(s.inc_central.quantidade, 1);
  assert.strictEqual(s.inc_infra.quantidade, Math.ceil(95.9 * 1.1));
  assert.strictEqual(s.cftv_ponto.quantidade, 15);
  assert.ok(!s.ace_leitor, 'controle de acesso não marcado: sem item');
  // a eletrocalha CAB- é de cabeamento (antes entrava na 1ª disciplina do arquivo)
  const m = I.montarMateriaisDoDesenho(an, v, []);
  assert.strictEqual(m.find(x => /CAB-ELETROCALHA/.test(x.descricao)).disciplina, 'cabeamento');
  assert.strictEqual(m.find(x => /Sinalizador/.test(x.descricao)).disciplina, 'incendio');

  const ca = [analise('ca.dxf', ['controle_acesso', 'spda'])];
  const vca = [[{ origem: 'cad', pagina: 'DXF', itens: [
    sim('Leitor facial SS 3540 — bloco CA LEITOR', 2, { bloco: 'CA LEITOR', layer: 'CA-DISPOSITIVO', disciplina: 'controle_acesso' }),
    sim('Eletroima FE 20150 — bloco CA ELETROIMA', 2, { bloco: 'CA ELETROIMA', layer: 'CA-DISPOSITIVO', disciplina: 'controle_acesso' }),
    sim('Botoeira de saida BT 4000 — bloco CA BOTOEIRA', 2, { bloco: 'CA BOTOEIRA', layer: 'CA-DISPOSITIVO', disciplina: 'controle_acesso' }),
    sim('Haste de aterramento 5/8" x 2,4 m — bloco SPDA HASTE', 8, { bloco: 'SPDA HASTE', layer: 'SPDA-ATERRAMENTO', disciplina: null }),
    lin('Cabo de cobre nu 35 mm² — medido (layer "SPDA-CAPTACAO")', 120, { layer: 'SPDA-CAPTACAO', disciplina: null }),
    lin('Descida — medido (layer "SPDA-DESCIDA")', 40, { layer: 'SPDA-DESCIDA', disciplina: null }),
  ] }]];
  const s2 = servicos(ca, vca, ['controle_acesso', 'spda']);
  assert.deepStrictEqual([s2.ace_leitor.quantidade, s2.ace_fechadura.quantidade, s2.ace_botoeira.quantidade], [2, 2, 2]);
  assert.deepStrictEqual([s2.spda_hastes_caixas.quantidade, s2.spda_malha.quantidade, s2.spda_descida.quantidade], [8, 132, 44]);
});

caso('M4: a contagem do PDF (item não ambíguo) também alimenta a mão de obra e cobre o item-modelo', () => {
  const an = [analise('lum.pdf', ['iluminacao'])];
  const v = [[{ pagina: 1, escala: 50, itens: [
    sim('LUMINÁRIA DE EMBUTIR LED 18 W', 56), sim('Luminária de sobrepor plafon', 7), sim('Arandela', 6, { ambiguo: true }),
  ] }]];
  const s = servicos(an, v, ['iluminacao']);
  assert.strictEqual(s.ilum_luminaria_embutir.quantidade, 56);
  assert.strictEqual(s.ilum_luminaria_sobrepor.quantidade, 7);
  assert.match(s.ilum_luminaria_embutir.observacao, /PDF "lum\.pdf" pág\. 1/);
  const doDesenho = I.montarMateriaisDoDesenho(an, v, []);
  const modelos = I.semModeloCoberto(I.montarMateriaisInstalacaoPadrao(an, ['iluminacao']), doDesenho);
  assert.ok(!modelos.some(m => /^Luminária LED/.test(m.descricao)), 'modelo "Luminária LED … = 0" sai: o PDF já contou');
  // o mesmo desenho em DWG e em PDF não soma na mão de obra (vale o DWG); outro pavimento soma
  const an2 = [analise('ELE_TERREO_R01.dwg', ['eletrica']), analise('ELE_TERREO_R01.pdf', ['eletrica']), analise('ELE_SUPERIOR.pdf', ['eletrica'])];
  const v2 = [
    [{ origem: 'cad', pagina: 'DWG', itens: [sim('Interruptor — bloco INT1', 8, { bloco: 'INT1', layer: 'E-INTERRUPTOR', disciplina: 'eletrica' })] }],
    [{ pagina: 1, itens: [sim('Interruptor simples', 9)] }],
    [{ pagina: 1, itens: [sim('Interruptor simples', 4)] }],
  ];
  assert.strictEqual(servicos(an2, v2, ['eletrica']).ele_interruptor.quantidade, 12);
});

caso('BAIXO: tomada sem altura não é tomada baixa; ponto de luz não é ponto de energia', () => {
  const an = [analise('ele.dwg', ['eletrica'])];
  const v = [[{ origem: 'cad', pagina: 'DWG', itens: [
    sim('Tomada 2P+T — bloco TOMADA', 8, { bloco: 'TOMADA', layer: 'TOMADAS', disciplina: 'eletrica' }),
    sim('Tomada 2P+T h=0,30m — bloco TUG', 4, { bloco: 'TUG', layer: 'TOMADAS', disciplina: 'eletrica' }),
    sim('Tomada a 1,20 m do piso — bloco TUG2', 3, { bloco: 'TUG2', layer: 'TOMADAS', disciplina: 'eletrica' }),
    sim('Ponto de luz — bloco PL', 6, { bloco: 'PL', layer: 'E-ILUM', disciplina: 'eletrica' }),
    sim('Tomada de piso — bloco TP', 2, { bloco: 'TP', layer: 'TOMADAS', disciplina: 'eletrica' }),
  ] }]];
  const s = servicos(an, v, ['eletrica']);
  assert.strictEqual(s.ele_tomada_baixa.quantidade, 4);
  assert.match(s.ele_tomada_baixa.observacao, /Mais 8 tomada\(s\) sem altura/);
  assert.strictEqual(s.ele_tomada_media.quantidade, 3);
  assert.strictEqual(s.ele_ponto_energia.quantidade, 2);
  assert.match(s.ele_ponto_energia.observacao, /6 ponto\(s\) de luz/);
});

caso('M7: quadros contados por título do quadro de cargas, não por arquivo', () => {
  const c = (circuito, quadro) => ({ circuito, quadro, fases: 'R', potencia_W: 1000 });
  const an = [analise('ele.pdf', ['eletrica'], { quadroCargas: [c('C1', 'QGBT'), c('C1', 'QD-Térreo'), c('C2', 'QD-Térreo'), c('C1', 'QD-1PAV')] })];
  const s = Object.fromEntries(I.montarServicosPadrao(an, ['eletrica']).map(x => [x.codigo, x]));
  assert.strictEqual(s.ele_qd_setorial.quantidade, 3);
  assert.strictEqual(s.ele_disjuntores.quantidade, 4 + 3);
  // formato antigo (sem título): 1 por arquivo com circuitos
  const an2 = [analise('ele.pdf', ['eletrica'], { quadroCargas: [{ circuito: 'C1', fases: 'R' }] })];
  assert.strictEqual(I.montarServicosPadrao(an2, ['eletrica']).find(x => x.codigo === 'ele_qd_setorial').quantidade, 1);
});

console.log(`analiseProjetoItens: ${ok} casos ok`);
process.exit(process.exitCode || 0);
