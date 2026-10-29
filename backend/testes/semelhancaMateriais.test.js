// Regressão do índice de Jaccard entre descrições de materiais (item 13 da
// revisão de organização). O mesmo índice era calculado em dois lugares, com
// tokenizações e cortes diferentes — e os dois têm de continuar dando os
// MESMOS resultados de antes:
//   - compararComCatalogo (preço sugerido do catálogo na análise de projeto,
//     nos laudos, no "comparar" de materiais e nas migrações de kits): palavras
//     com mais de 2 letras, vírgula separa ("2,5" some), corte 0,45;
//   - classificacaoMateriais (categoria pelo material mais parecido): termos
//     com 2 letras ou mais, sem palavras vazias (DE, PARA, UN…), vírgula fica
//     ("2,5" é um termo), corte 0,5.
// Os valores esperados foram gerados pelo código antes da mudança.
// Sem banco. Rodar: npm test (pasta backend).
const assert = require('assert');

require.cache[require.resolve('../src/config/database')] = { id: 'db', filename: 'db', loaded: true, exports: { query: async () => ({ rows: [] }) } };
const { compararComCatalogo } = require('../src/utils/semelhancaMateriais');
const CM = require('../src/services/classificacaoMateriais');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}`); throw e; }
};
const r6 = (x) => Math.round(x * 1e6) / 1e6;

const CATALOGO = [
  { id: 1, descricao: 'CABO COAXIAL', preco: '1.50', unidade: 'm' },
  { id: 2, descricao: 'CABO COAXIAL RG-6 BLINDADO 75 OHMS BRANCO', preco: '2.90', unidade: 'm' },
  { id: 3, descricao: 'PARAFUSO AUTOBROCANTE 4.2X32 CAIXA 100UN', preco: '99', unidade: 'cx' },
  { id: 4, descricao: 'Cabo de cobre flexível 2,5 mm² 450/750 V PVC', preco: '2.835', unidade: 'm' },
  { id: 5, descricao: 'CABO FLEXIVEL 2,5MM 750V AZ 100MT', preco: '283.04', unidade: 'RL' },
  { id: 6, descricao: 'Disjuntor termomagnético 2P 10 A curva C', preco: '35', unidade: 'un' },
  { id: 7, descricao: 'Detector de fumaça óptico endereçável', preco: '180', unidade: 'un' },
  { id: 8, descricao: 'Câmera IP bullet 4 MP PoE 2.8 mm', preco: '420', unidade: 'un' },
  { id: 9, descricao: 'Sensor magnético XAS 8000 (abertura)', preco: '25', unidade: 'un' },
  { id: 10, descricao: 'Cabo U/UTP Cat6 4 pares 24 AWG azul', preco: '3.10', unidade: 'm' },
  { id: 11, descricao: 'Eletroduto corrugado flexível PVC 3/4" amarelo', preco: '1.20', unidade: 'm' },
  { id: 12, descricao: 'Luminária LED de embutir 60x60 40 W', preco: '95', unidade: 'un' },
  { id: 13, descricao: 'Caixa 4x2 amarela', preco: '1.08', unidade: 'un' },
  { id: 14, descricao: '', preco: '1', unidade: 'un' },
  { id: 15, descricao: 'DE OU UN', preco: '1', unidade: 'un' },
];
const REFERENCIA = [
  { descricao: 'Sensor magnético XAS 8000 (abertura)', categoria: 'Alarme' },
  { descricao: 'Câmera IP bullet 4 MP PoE 2.8 mm', categoria: 'CFTV' },
  { descricao: 'Cabo de cobre flexível 2,5 mm² 450/750 V PVC', categoria: 'Elétrica' },
  { descricao: 'Cabo U/UTP Cat6 4 pares 24 AWG azul', categoria: 'Redes' },
  { descricao: 'Detector de fumaça óptico endereçável', categoria: 'Incêndio' },
  { descricao: 'Disjuntor termomagnético 2P 10 A curva C', categoria: 'Elétrica' },
  { descricao: 'Luminária LED de embutir 60x60 40 W', categoria: 'Iluminação' },
];
const CONSULTAS = [
  'CABO COAXIAL RG6 BLINDADO 75 OHMS',
  'Cabo coaxial',
  'PARAFUSO',
  'Cabo flexível 2,5 mm 750 V',
  'CABO FLEXÍVEL 2,5MM² 750V AZUL ROLO 100M',
  'Disjuntor termomagnético 2P 40 A curva C (NBR NM 60898)',
  'DISJUNTOR TERMOMAGNETICO 2P 10A CURVA C',
  'Detector de fumaça',
  'DETECTOR FUMACA OPTICO ENDERECAVEL',
  'Camera IP Bullet 4MP PoE 2,8mm',
  'SENSOR MAGNETICO XAS 8000',
  'Cabo UTP Cat6 4 pares azul',
  'Eletroduto corrugado 25 mm',
  'Eletroduto corrugado flexível PVC 3/4"',
  'Luminária LED embutir 60x60',
  'Caixa de embutir 4×2" em PVC',
  'caixa 4x2 amarela',
  'Tomada 2P+T 10 A',
  'Interruptor simples',
  '',
  'DE UN',
  'ÇÃÕ ação élétrica',
];

// [material_id, confiança %] ou null
const ESPERADO_CATALOGO = [
  [2,67], // 0
  [1,100], // 1
  null, // 2
  [4,50], // 3
  [5,50], // 4
  [6,60], // 5
  [6,75], // 6
  [7,50], // 7
  [7,100], // 8
  [8,60], // 9
  [9,80], // 10
  [10,83], // 11
  null, // 12
  [11,80], // 13
  [12,100], // 14
  null, // 15
  [13,100], // 16
  null, // 17
  null, // 18
  null, // 19
  null, // 20
  null, // 21
];
const ESPERADO_TERMOS = [
  ["CABO","COAXIAL","RG6","BLINDADO","75","OHMS"], // 0
  ["CABO","COAXIAL"], // 1
  ["PARAFUSO"], // 2
  ["CABO","FLEXIVEL","2,5","MM","750"], // 3
  ["CABO","FLEXIVEL","2,5MM","750V","AZUL","ROLO","100M"], // 4
  ["DISJUNTOR","TERMOMAGNETICO","2P","40","CURVA","NBR","NM","60898"], // 5
  ["DISJUNTOR","TERMOMAGNETICO","2P","10A","CURVA"], // 6
  ["DETECTOR","FUMACA"], // 7
  ["DETECTOR","FUMACA","OPTICO","ENDERECAVEL"], // 8
  ["CAMERA","IP","BULLET","4MP","POE","2,8MM"], // 9
  ["SENSOR","MAGNETICO","XAS","8000"], // 10
  ["CABO","UTP","CAT6","PARES","AZUL"], // 11
  ["ELETRODUTO","CORRUGADO","25","MM"], // 12
  ["ELETRODUTO","CORRUGADO","FLEXIVEL","PVC"], // 13
  ["LUMINARIA","LED","EMBUTIR","60X60"], // 14
  ["CAIXA","EMBUTIR","PVC"], // 15
  ["CAIXA","4X2","AMARELA"], // 16
  ["TOMADA","2P","10"], // 17
  ["INTERRUPTOR","SIMPLES"], // 18
  [], // 19
  [], // 20
  ["CAO","ACAO","ELETRICA"], // 21
];
// similaridade de cada consulta com cada item de REFERENCIA (6 casas)
const ESPERADO_SIMILARIDADE = [
  [0,0,0.076923,0.083333,0,0,0], // 0
  [0,0,0.111111,0.125,0,0,0], // 1
  [0,0,0,0,0,0,0], // 2
  [0,0.1,0.625,0.090909,0,0,0], // 3
  [0,0,0.153846,0.166667,0,0,0], // 4
  [0,0,0,0,0,0.444444,0.083333], // 5
  [0,0,0,0,0,0.666667,0], // 6
  [0,0,0,0,0.5,0,0], // 7
  [0,0,0,0,1,0,0], // 8
  [0,0.5,0,0,0,0,0], // 9
  [0.8,0,0,0,0,0,0], // 10
  [0,0,0.083333,0.714286,0,0,0], // 11
  [0,0.111111,0.090909,0,0,0,0], // 12
  [0,0,0.2,0,0,0,0], // 13
  [0,0,0,0,0,0,0.8], // 14
  [0,0,0.1,0,0,0,0.142857], // 15
  [0,0,0,0,0,0,0], // 16
  [0,0,0,0,0,0.333333,0], // 17
  [0,0,0,0,0,0,0], // 18
  [0,0,0,0,0,0,0], // 19
  [0,0,0,0,0,0,0], // 20
  [0,0,0,0,0,0,0], // 21
];
// [categoria, similaridade] do mais parecido (corte 0,5) ou null
const ESPERADO_PARECIDO = [
  null, // 0
  null, // 1
  null, // 2
  ["Elétrica",0.625], // 3
  null, // 4
  null, // 5
  ["Elétrica",0.666667], // 6
  ["Incêndio",0.5], // 7
  ["Incêndio",1], // 8
  ["CFTV",0.5], // 9
  ["Alarme",0.8], // 10
  ["Redes",0.714286], // 11
  null, // 12
  null, // 13
  ["Iluminação",0.8], // 14
  null, // 15
  null, // 16
  null, // 17
  null, // 18
  null, // 19
  null, // 20
  null, // 21
];

caso('compararComCatalogo: mesmo material e mesma confiança de antes (corte 0,45)', () => {
  CONSULTAS.forEach((c, i) => {
    const r = compararComCatalogo(c, CATALOGO);
    assert.deepStrictEqual(r && [r.material_id, r.confianca], ESPERADO_CATALOGO[i], `consulta ${i}: "${c}"`);
  });
});

caso('compararComCatalogo: devolve preço e unidade do catálogo como antes', () => {
  assert.deepStrictEqual(compararComCatalogo('CABO COAXIAL RG6 BLINDADO 75 OHMS', CATALOGO),
    { material_id: 2, descricao_catalogo: 'CABO COAXIAL RG-6 BLINDADO 75 OHMS BRANCO', preco_catalogo: 2.9, unidade_catalogo: 'm', confianca: 67 });
  assert.strictEqual(compararComCatalogo('qualquer coisa', []), null);
});

caso('classificação: mesmos termos de antes (vírgula fica, palavras vazias saem)', () => {
  CONSULTAS.forEach((c, i) => assert.deepStrictEqual([...CM.termos(c)], ESPERADO_TERMOS[i], `consulta ${i}: "${c}"`));
});

caso('classificação: mesma similaridade de antes para cada par', () => {
  CONSULTAS.forEach((c, i) => REFERENCIA.forEach((r, j) =>
    assert.strictEqual(r6(CM.paraTestes.similaridade(CM.termos(c), CM.termos(r.descricao))), ESPERADO_SIMILARIDADE[i][j], `"${c}" × "${r.descricao}"`)));
});

caso('classificação: mesmo material mais parecido de antes (corte 0,5)', () => {
  const ref = REFERENCIA.map(r => ({ ...r, termos: CM.termos(r.descricao) }));
  CONSULTAS.forEach((c, i) => {
    const m = CM.paraTestes.maisParecido(ref, c);
    assert.deepStrictEqual(m && [m.categoria, r6(m.s)], ESPERADO_PARECIDO[i], `consulta ${i}: "${c}"`);
  });
});

console.log(`semelhancaMateriais: ${ok} casos ok`);
