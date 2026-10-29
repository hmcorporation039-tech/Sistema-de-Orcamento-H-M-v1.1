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
  // rota × 1,10 + descidas: acionador a 1,20 m adotado (3 × 1,6 m), sinalizador h=2,40 m da legenda (5 × 0,4 m), detector no teto (0)
  assert.strictEqual(s.inc_infra.quantidade, Math.ceil(95.9 * 1.1 + 3 * 1.6 + 5 * 0.4));
  assert.match(s.inc_infra.observacao, /descidas 6,8 m \(8 ponto\(s\): pé-direito 2,80 m adotado/);
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
  assert.strictEqual(s.ele_qdg.quantidade, 1, 'QGBT é o quadro geral');
  assert.strictEqual(s.ele_qd_setorial.quantidade, 2);
  assert.strictEqual(s.ele_disjuntores.quantidade, 4 + 3);
  // formato novo (projetoParser.quadrosDeCargas): alimentador não é circuito a mais
  const al = { circuito: 'QD-Térreo', quadro: 'QGBT', alimentador: true };
  const an3 = [analise('ele.pdf', ['eletrica'], {
    quadroCargas: [al, c('IL 1', 'QD-Térreo'), c('T 1', 'QD-Térreo')],
    quadrosDeCargas: [{ quadro: 'QGBT', circuitos: [al] }, { quadro: 'QD-Térreo', circuitos: [c('IL 1', 'QD-Térreo'), c('T 1', 'QD-Térreo')] }],
  })];
  const s3 = Object.fromEntries(I.montarServicosPadrao(an3, ['eletrica']).map(x => [x.codigo, x]));
  assert.deepStrictEqual([s3.ele_qdg.quantidade, s3.ele_qd_setorial.quantidade, s3.ele_disjuntores.quantidade], [1, 1, 2 + 2]);
  // formato antigo (sem título): 1 por arquivo com circuitos
  const an2 = [analise('ele.pdf', ['eletrica'], { quadroCargas: [{ circuito: 'C1', fases: 'R' }] })];
  assert.strictEqual(I.montarServicosPadrao(an2, ['eletrica']).find(x => x.codigo === 'ele_qd_setorial').quantidade, 1);
});

caso('A8: eletroduto = rota × 1,10 + descidas; cabo = (rota + descidas) × condutores; fiação não casa cabo do catálogo', () => {
  const catalogo = [{ id: 9, descricao: 'Cabo flexível 2,5 mm² 750 V preto', preco: 3, unidade: 'm' }, { id: 10, descricao: 'Trecho de fiação cabo flexível', preco: 3, unidade: 'm' }];
  const pontos = [
    sim('Interruptor — bloco INT1', 8, { bloco: 'INT1', layer: 'E-INTERRUPTOR', disciplina: 'eletrica' }),
    sim('Tomada 2P+T — bloco TOMADA', 8, { bloco: 'TOMADA', layer: 'TOMADAS', disciplina: 'eletrica' }),
    sim('Luminária — bloco LUM', 10, { bloco: 'LUM', layer: 'E-ILUM', disciplina: 'eletrica' }),
  ];
  const an = [analise('galpao.dwg', ['eletrica'])];
  // formato antigo: "Trecho de fiação" vinha como item de linha
  const velho = [[{ origem: 'cad', pagina: 'DWG', itens: [...pontos,
    lin('Trecho de fiação (eletroduto com condutores) — medido no desenho (layer "FIACAO")', 81.3, { layer: 'FIACAO', disciplina: 'eletrica' }),
    lin('Eletrocalha — medido no desenho (layer "ELETROCALHA")', 135.7, { layer: 'ELETROCALHA', disciplina: 'eletrica' })] }]];
  // formato novo: a fiação só vem em `rotas`
  const novo = [[{ origem: 'cad', pagina: 'DWG', rotas: [{ layer: 'FIACAO', tipo: 'fiacao', disciplina: 'eletrica', rota_m: 81.3 }, { layer: 'ELETROCALHA', tipo: 'eletrocalha', disciplina: 'eletrica', rota_m: 135.7 }],
    itens: [...pontos, lin('Eletrocalha — medido no desenho (layer "ELETROCALHA")', 135.7, { layer: 'ELETROCALHA', disciplina: 'eletrica', rota_m: 135.7, tipoLinha: 'eletrocalha' })] }]];
  const descidas = 8 * (2.8 - 1.1) + 8 * (2.8 - 0.3); // interruptor 1,10 e tomada 0,30 adotados; luminária no teto
  for (const v of [velho, novo]) {
    const m = I.montarMateriaisDoDesenho(an, v, catalogo);
    const eletroduto = m.find(x => /^Eletroduto — rota da fiação/.test(x.descricao));
    assert.strictEqual(eletroduto.quantidade, Math.ceil(81.3 * 1.1 + descidas));
    const cabo = m.find(x => /^Cabo flexível 750 V/.test(x.descricao));
    assert.strictEqual(cabo.quantidade, Math.ceil((81.3 * 1.1 + descidas) * 3));
    assert.strictEqual(cabo.material_id, null, 'cabo calculado não casa com o catálogo');
    assert.match(cabo.observacao, /F \+ N \+ PE adotado/);
    assert.ok(!m.some(x => /Trecho de fiação/.test(x.descricao)), 'a fiação não vira material em metros de rota');
    assert.strictEqual(m.find(x => /^Eletrocalha/.test(x.descricao)).quantidade, Math.ceil(135.7 * 1.1));
    // o modelo "Eletroduto PVC = 0" sai porque há eletroduto calculado; o de cabo também
    const modelos = I.semModeloCoberto(I.montarMateriaisInstalacaoPadrao(an, ['eletrica']), m);
    assert.ok(!modelos.some(x => /^Eletroduto PVC|^Cabo elétrico flexível/.test(x.descricao)));
  }
  // só a fiação (sem eletroduto calculado): o modelo "Eletroduto PVC" fica
  const soFiacao = [{ descricao: 'Trecho de fiação (eletroduto com condutores) — medido no desenho (layer "FIACAO")', quantidade: 90, disciplina: 'eletrica', observacao: 'Medido no DWG "g.dwg"' }];
  assert.ok(I.semModeloCoberto(I.montarMateriaisInstalacaoPadrao(an, ['eletrica']), soFiacao).some(x => /^Eletroduto PVC/.test(x.descricao)));
  // condutores do quadro de cargas lido: "3F+N+T" mais comum → 5
  const an2 = [analise('galpao.dwg', ['eletrica'], { quadroCargas: [{ circuito: 'M1', esquema: '3F+N+T' }, { circuito: 'M2', esquema: '3F+N+T' }, { circuito: 'IL1', esquema: 'F+N+T' }, { circuito: 'QD', esquema: 'F+N+T', alimentador: true }, { circuito: 'QD2', esquema: 'F+N+T', alimentador: true }] })];
  const cabo5 = I.montarMateriaisDoDesenho(an2, novo, []).find(x => /^Cabo/.test(x.descricao));
  assert.match(cabo5.descricao, /5 condutores/);
  assert.match(cabo5.observacao, /esquema mais comum no quadro de cargas/);
  // a lista do projeto vence o cabo estimado
  const r = I.semDuplicarFontes([{ ...cabo5, _fonte: 'estimativa', _arquivo: 'galpao.dwg' }, mat('Cabo flexível 2,5 mm² preto', 300, 'lista', 'galpao.pdf', 'eletrica', 'm')], []);
  assert.deepStrictEqual(r.map(x => x.quantidade), [300]);
});

caso('achados: quadro não lido, código repetido longe, quantidade ambígua e folhas além do limite', () => {
  const A = require('../src/utils/analiseProjetoAchados');
  const cam = { ocorrencias: 79, total: 77, totalUnicos: 75, unicas: [], repetidas: [2, 18, 30], faltando: [], repetidasDistantes: [{ numero: 2, pontos: 2, paginas: [1] }, { numero: 18, pontos: 2, paginas: [1, 2] }] };
  const ach = A.gerarAchados([analise('cftv.pdf', ['cftv'], { cameras: cam }), analise('ele.pdf', ['eletrica'], {
    quadroCargasNaoLido: true,
    quantidadesAmbiguas: [{ descricao: 'Cabo flexível 2,5 mm²', qtd: 1.2, unidade: 'm', qtdAmbigua: true, qtdAlternativa: 1200 }],
  })]);
  const tema = (t) => ach.find(a => a.tema === t);
  assert.match(tema('Câmeras: mesmo código em pontos distantes').observacao, /CAM18 aparece em 2 pontos distantes \(pág\. 1, 2\).*contados 77 pontos \(75 números únicos\)/);
  assert.match(tema('Câmeras: numeração repetida').observacao, /CAM30/);
  assert.ok(!/CAM18/.test(tema('Câmeras: numeração repetida').observacao), 'a distante não repete no achado de repetição colada');
  assert.ok(tema('Quadro de cargas presente e não lido'));
  assert.match(tema('Quantidade com ponto: milhar ou decimal?').observacao, /lido 1,2 m \(seria 1200 se o ponto for separador de milhar\)/);
  // folhas: o quadro não lido não diz mais que "continua sendo lido"
  const folha = { tipo: 'unifilar', resumo: 'diagrama unifilar', semPlanta: true, temPlanta: false, misto: false };
  const [f] = A.achadosDasFolhas([{ arquivo: 'ele.pdf', quadroCargasNaoLido: true }], [[{ pagina: 2, folha }]]);
  assert.match(f.observacao, /quadro de cargas presente e não lido/i);
  assert.ok(!/continua sendo lido/.test(f.observacao));
  const [f2] = A.achadosDasFolhas([{ arquivo: 'ele.pdf', quadroCargas: [{ circuito: 'IL 1' }, { circuito: 'QD-1', alimentador: true }], quadrosDeCargas: [{}, {}] }], [[{ pagina: 2, folha }]]);
  assert.match(f2.observacao, /lido pelo texto: 1 circuito\(s\) em 2 quadros/);
  // A10: 9 folhas, só 6 lidas pelo desenho
  const paginas = [1, 2, 3, 4, 5, 6].map(pagina => ({ pagina, itens: [] }));
  const d = A.achadosDoDesenho([{ arquivo: 'grande.pdf', textoPorPagina: Array(9).fill('x') }], [paginas], { maxPaginas: 6 });
  assert.match(d.find(a => a.tema === 'Folhas do PDF não lidas pelo desenho').observacao, /folha\(s\) 7 a 9 ficaram de fora/);
  assert.ok(!A.achadosDoDesenho([{ arquivo: 'p.pdf', textoPorPagina: ['x', 'y'] }], [[{ pagina: 1, itens: [] }, { pagina: 2, itens: [] }]], { maxPaginas: 6 }).length);
  // QTD da legenda × desenho (CAD: conferenciaLegenda; PDF: quantidadeLegenda no item) e xref de outra disciplina
  const dxf = A.achadosDoDesenho([{ arquivo: 'x.dxf' }], [[{ origem: 'cad', pagina: 'DXF', itens: [], conferenciaLegenda: [{ bloco: 'CFTV CAMERA', descricao: 'Câmera dome — bloco CFTV CAMERA', desenho: 15, legenda: 17 }],
    xrefsDeOutraDisciplina: [{ xref: 'E-COND', disciplina: 'eletrica', componentes: 432, metros: 713 }] }]]);
  assert.match(dxf.find(a => /legenda diferente/.test(a.tema)).observacao, /Câmera dome: legenda diz 17, desenho contou 15/);
  assert.match(dxf.find(a => /xref/.test(a.tema)).observacao, /"E-COND".*432 componente/);
  // CAD antigo: quantidadeLegenda; PDF (pdfVetorial 29b1aa7): qtde_projeto
  const pdf = A.achadosDoDesenho([{ arquivo: 'l.pdf' }], [[{ pagina: 1, itens: [sim('Luminária X', 10, { quantidadeLegenda: 12 }), sim('Luminária Y', 4, { qtde_projeto: 6 }), sim('Luminária Z', 3, { qtde_projeto: 3 })] }]]);
  const obs = pdf.find(a => /legenda diferente/.test(a.tema)).observacao;
  assert.match(obs, /Luminária X: legenda diz 12, desenho contou 10/);
  assert.match(obs, /Luminária Y: legenda diz 6, desenho contou 4/);
  assert.ok(!/Luminária Z/.test(obs), 'igual à legenda: sem achado');
});

caso('pdfVetorial novo: página pulada com motivo, itens da legenda não contados, escala indefinida e fornecedor', () => {
  const A = require('../src/utils/analiseProjetoAchados');
  const paginas = [
    { pagina: 1, ms: 900, escala: 50, avisoEscala: 'folha com 2 escalas (1:50, 1:25): trecho em vista sem escala não medido',
      naoContados: [{ descricao: 'Arandela de parede', qtde_projeto: 4, codigo: 'L7', motivo: 'símbolo não encontrado na planta' }],
      itens: [sim('LUMINÁRIA DE EMBUTIR 18 W', 12, { qtde_projeto: 12, fornecedor: 'FABRICANTE EXEMPLO', origem_legenda: 'tabela' }),
        lin('Eletroduto embutido', null, { comprimento_pt: 4200, escala_indefinida_pt: 4200 })] },
    { pagina: 2, itens: [], aviso: 'passou de 60 s — contagem pelo desenho não feita', pulada: { motivo: 'tempo', limite_s: 60 } },
    { pagina: null, itens: [], aviso: 'páginas 16 a 18 não lidas (limite de 15 páginas por arquivo)', pulada: { motivo: 'limite_paginas', paginas: [16, 17, 18], limite: 15 } },
  ];
  const ach = A.achadosDoDesenho([{ arquivo: 'lum.pdf', textoPorPagina: Array(18).fill('x') }], [paginas], { maxPaginas: 15 });
  const tema = (t) => ach.find(a => a.tema === t)?.observacao || '';
  assert.match(tema('Contagem pelo desenho (PDF vetorial) incompleta'), /pág\. 2 \[passou do tempo-limite da página\]/);
  assert.match(tema('Contagem pelo desenho (PDF vetorial) incompleta'), /\[além do limite de páginas lidas\] páginas 16 a 18/);
  assert.ok(!ach.some(a => a.tema === 'Folhas do PDF não lidas pelo desenho'), 'o leitor já avisou: sem achado em dobro');
  assert.match(tema('Itens da legenda sem contagem no desenho'), /Arandela de parede \(L7\): 4 previstos na legenda, nenhum nesta folha \(pág\. 1\)/);
  assert.match(tema('Escala das vistas da folha'), /2 escalas/);
  assert.match(tema('Contagem pelo desenho (PDF vetorial)'), /4200 pt \(folha com mais de uma escala/);
  // fornecedor da tabela da legenda → referência do fabricante; luminária conta na mão de obra
  const an = [analise('lum.pdf', ['iluminacao'])];
  const m = I.montarMateriaisDoDesenho(an, [paginas], []);
  assert.strictEqual(m.find(x => /EMBUTIR/.test(x.descricao)).referencia_fabricante, 'FABRICANTE EXEMPLO');
  assert.strictEqual(I.contagemDoDesenho(an, [paginas]).ilum_luminaria_embutir.quantidade, 12);
  // descrições de produto da tabela do luminotécnico (sem a palavra "luminária")
  const lum = [[{ pagina: 1, itens: [sim('PRO EMBUTIDO REDONDO MICROBORDA RECUADO GU10 1X AR70 LED', 56), sim('PRO BALIZADOR WAY RING LED 1W 3000K', 6),
    sim('PRO ESPETO LED 6W BIVOLT 3000K', 7), sim('PRO SPOT LED DE SOBREPOR 5W BIVOLT', 6), sim('PRO ARANDELA 2xMINI DIC GU10', 6), sim('CAIXA EMBUTIDA 4x2', 3)] }]];
  const cl = I.contagemDoDesenho(an, lum);
  assert.deepStrictEqual([cl.ilum_luminaria_embutir.quantidade, cl.ilum_luminaria_sobrepor.quantidade], [56, 25]);
  // espelho com vários aparelhos: cada aparelho é um serviço
  const ele = [analise('tom.pdf', ['eletrica'])];
  const ce = I.contagemDoDesenho(ele, [[{ pagina: 1, itens: [sim('Interruptores — Espelho com 6 interruptores', 2), sim('Tomadas médias e tomada 20A — Espelho com 2 tomadas e 1 tomada 20A', 4),
    sim('Interruptor e tomada média — Espelho com 1 interruptor e 1 tomada', 1), sim('Tomada baixa — Espelho com 1 tomada', 5)] }]]);
  assert.deepStrictEqual([ce.ele_interruptor.quantidade, ce.ele_tomada_media.quantidade, ce.ele_tomada_baixa.quantidade], [13, 13, 5]);
});

caso('M8: ponte para as skills usa perímetro/polígono, dimensões do recinto e os quadros separados', () => {
  const { dadosDaAnalise, medidasDoAmbiente } = require('../src/utils/ponteAnaliseSkill');
  const { motorDaDisciplina } = require('../src/utils/disciplinasLaudo');
  // corredor 1,2 × 10 m: perímetro real 22,4 (o quadrado dava 13,9)
  assert.deepStrictEqual([medidasDoAmbiente({ area_m2: 12, perimetro_m: 22.4 }).comprimento_m, medidasDoAmbiente({ area_m2: 12, perimetro_m: 22.4 }).largura_m], [10, 1.2]);
  assert.strictEqual(medidasDoAmbiente({ area_m2: 12, poligono: [[0, 0], [10, 0], [10, 1.2], [0, 1.2]] }).perimetro_m, 22.4);
  assert.strictEqual(medidasDoAmbiente({ area_m2: 16 }).perimetro_m, 16);
  const c = (circuito, quadro, extra = {}) => ({ circuito, quadro, potencia_W: 1000, potencia_VA: 1100, fp: 0.9, tensao_V: 220, esquema: 'F+N+T', fases: 'R', disjuntor_A: 16, secao_mm2: 2.5, ...extra });
  const quadrosDeCargas = [
    { quadro: 'QGBT', circuitos: [c('QD-Térreo', 'QGBT', { alimentador: true, esquema: '3F+N+T', fases: 'RST', disjuntor_A: 63, tensao_V: 380 })], totais: { potencia_VA: 2200, demanda_kVA: 2 } },
    { quadro: 'QD-Térreo', circuitos: [c('IL 1', 'QD-Térreo'), c('T 1', 'QD-Térreo')], totais: { potencia_VA: 2200, demanda_kVA: 1.76 } },
    { quadro: 'QD-1PAV', circuitos: [c('IL 1', 'QD-1PAV'), c('T 1', 'QD-1PAV', { potencia_W: 0, potencia_VA: 0, descricao: 'Reserva' })], totais: { potencia_VA: 1100, demanda_kVA: 0.88 } },
  ];
  const analise = {
    cliente: 'Cliente Exemplo', ambientes: [{ nome: 'CORREDOR', area_m2: 12, perimetro_m: 22.4 }, { nome: 'SALA DE REUNIÃO', area_m2: 20 }],
    espacial: { ambientes: [{ nome: 'Sala de Reunião', poligono: [[0, 0], [5, 0], [5, 4], [0, 4]] }], pontos: [
      { x: 0, y: 0, descricao: 'Rack 12U', disciplina: 'cabeamento' }, { x: 20, y: 10, descricao: 'Ponto de rede RJ45', disciplina: 'rede' }, { x: 5, y: 5, descricao: 'Ponto de rede RJ45', disciplina: 'rede' },
    ] },
    pontosRedeAntena: { rede: { total: 2 } },
    dadosExtraidos: [{ arquivo: 'ele.pdf', quadroCargas: quadrosDeCargas.flatMap(q => q.circuitos), quadrosDeCargas }],
  };
  const ele = dadosDaAnalise('eletrica', motorDaDisciplina('eletrica'), analise);
  assert.deepStrictEqual(ele.dados.circuitos.map(x => x.id), ['QD-Térreo IL 1', 'QD-Térreo T 1', 'QD-1PAV IL 1'], 'sem alimentador, sem reserva, ID com o quadro');
  assert.deepStrictEqual(ele.dados.ambientes.map(a => a.perimetro_m), [22.4, 18]);
  assert.strictEqual(ele.dados.instalacao.fd_ilum_tug[0].fator, 0.8, 'fd dos quadros terminais (2,64 kVA ÷ 3,3 kVA)');
  motorDaDisciplina('eletrica').processar(ele.dados);

  const inc = dadosDaAnalise('incendio', motorDaDisciplina('incendio'), analise);
  assert.deepStrictEqual(inc.dados.ambientes.map(a => [a.comprimento_m, a.largura_m]), [[10, 1.2], [5, 4]]);

  const ilu = dadosDaAnalise('iluminacao', motorDaDisciplina('iluminacao'), analise);
  assert.deepStrictEqual(ilu.dados.ambientes.map(a => a.atividade), ['circulacao', 'reuniao']);
  motorDaDisciplina('iluminacao').processar(ilu.dados);

  const cab = dadosDaAnalise('cabeamento', motorDaDisciplina('cabeamento'), analise);
  assert.deepStrictEqual([cab.dados.pavimentos[0].distancia_media_m, cab.dados.pavimentos[0].distancia_max_m], [Math.round((33 + 13) / 2), 33]);

  const q = dadosDaAnalise('quadros', motorDaDisciplina('quadros'), analise, { quadro: 'QD-Térreo' });
  assert.deepStrictEqual(q.candidatos.map(x => x.quadro), ['QGBT', 'QD-Térreo', 'QD-1PAV']);
  assert.strictEqual(q.dados.quadro.tag, 'QD-Térreo');
  assert.strictEqual(q.dados.quadro.disjuntor_geral_a, 63, 'geral = disjuntor do alimentador no QGBT');
  assert.deepStrictEqual(q.dados.circuitos.map(x => [x.n, x.ligacao, x.fases]), [['IL 1', 'FN', 'A'], ['T 1', 'FN', 'A']]);
  motorDaDisciplina('quadros').processar(q.dados);
});

console.log(`analiseProjetoItens: ${ok} casos ok`);
process.exit(process.exitCode || 0);
