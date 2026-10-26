// Leitores de tabelas do PDF de projeto (utils/leitoresTabelaProjeto.js e
// projetoParser.js). Textos SINTÉTICOS nos mesmos formatos dos projetos reais
// recebidos (quadro de cargas, listas de materiais, memorial de cotação,
// carimbo, ambientes) — nenhum dado de cliente. Rodar: npm test (pasta backend).
const assert = require('assert');
const L = require('../src/utils/leitoresTabelaProjeto');
const { extrairAmbientes, extrairTabelaCabos } = require('../src/utils/projetoParser');

let ok = 0;
function caso(nome, fn) {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
}

caso('quadro de cargas: circuitos e totais', () => {
  const t = [
    'IL.1.1 - ILUMINAÇÃO CIRCULAÇÃO 600,00 W 0,92 0,75 489,13 VA 220 V 2,22 A A 16 A 2,5 mm²',
    'TUG.1.2 - TOMADAS SALA 01 1.200,00 W 0,92 0,75 978,26 VA 220 V 4,45 A B 20 A 2,5 mm²',
    'POTÊNCIA TOTAL INSTALADA 1800,00 W 0,92 - 1956,52 VA - - - - -',
    'POTÊNCIA TOTAL DEMANDADA 1350,00 W 0,92 0,75 1467,39 VA 380 V 2,23 A ABC 32 A 6,0 mm²',
  ].join('\n');
  const c = L.quadroDeCargas(t);
  assert.strictEqual(c.length, 2);
  assert.deepStrictEqual([c[1].circuito, c[1].potencia_W, c[1].disjuntor_A, c[1].cabo_mm2, c[1].fases], ['TUG.1.2', 1200, 20, 2.5, 'B']);
  const tot = L.totaisQuadro(t);
  assert.deepStrictEqual([tot.instalada_W, tot.disjuntor_geral_A, tot.alimentador_mm2], [1800, 32, 6]);
});

caso('lista "QTD + descrição" com quantidade sozinha e descrição em várias linhas', () => {
  const t = [
    'LISTA DE MATERIAIS DO QUADRO ELÉTRICO',
    'QUANT. (UN) DESCRIÇÃO',
    '1 Disjuntor tripolar, norma IEC 60947-2, In=63A, curva "C",',
    'Icu=36,0kA até 400V.',
    '24 Minidisjuntor monopolar, In=16A, curva "C".',
    '1',
    'Painel elétrico metálico, corrente nominal até',
    '400A, 24 módulos por fila, IP-43.',
    '4 Protetor contra sobretensão, 20kA',
    'LEIAUTE - INTERNO',
  ].join('\n');
  const l = L.listaMateriais(t);
  assert.deepStrictEqual(l.map(i => i.qtd), [1, 24, 1, 4], 'cabeçalho em 2 linhas não pode duplicar');
  assert.match(l[0].descricao, /Icu=36,0kA/);
  assert.match(l[2].descricao, /^Painel .* 400A, 24 módulos/);
});

caso('lista "TAG QTD FABRICANTE MODELO": só a tabela-resumo conta', () => {
  const t = [
    'TAG QTD FABRICANTE MODELO DESCRIÇÃO',
    'TE - 1, TE - 2 2 FABRICX 01DT-5LN SENSOR TEMP. DUTO',
    '',
    'TAG PREFIX QTD FABRICANTE MODELO DESCRIÇÃO',
    'TE 10 FABRICX 01DT-5LN SENSOR TEMP. DUTO',
    'CS 11 FUNC. DEVICES RIBXKTF RELÉ CORRENTE',
    'QUADROS 9 * * *VER TABELA DE QUADROS',
  ].join('\n');
  const l = L.listaMateriais(t);
  assert.deepStrictEqual(l.map(i => [i.tag, i.qtd]), [['TE', 10], ['CS', 11], ['QUADROS', 9]]);
  assert.deepStrictEqual([l[1].fabricante, l[1].modelo, l[1].descricao], ['FUNC. DEVICES', 'RIBXKTF', 'RELÉ CORRENTE']);
});

caso('memorial "ITEM DESCRIÇÃO QTD UN": disciplina pelo título da seção', () => {
  const t = [
    '1. INTERFONE (MATERIAL E MÃO DE OBRA)',
    '1.1.10 TERMINAL DEDICADO TDMI 300 54 un',
    '4. CONTROLE DE ACESSO CATRACA (MATERIAL E MÃO DE OBRA)',
    '1.1.2 CATRACA SWING LED 2 un',
    '1.1.26 Cabo UTP - CAT 5e 234.5 mt',
    '6. DETECÇÃO E ALARME DE INCÊNDIO CLASSE B',
    '1.1.14 DETECTOR DE FUMACA ENDERECAVEL COM BASE 124 un',
  ].join('\n');
  const l = L.listaMateriais(t);
  assert.deepStrictEqual(l.map(i => [i.item, i.qtd, i.unidade, i.disciplinaSecao]), [
    ['1.1.10', 54, 'un', 'telefonia'], ['1.1.2', 2, 'un', 'controle_acesso'], ['1.1.26', 234.5, 'mt', 'controle_acesso'], ['1.1.14', 124, 'un', 'incendio'],
  ]);
});

caso('carimbo e disciplina pelo conteúdo', () => {
  const t = 'SEGURANÇA ELETRÔNICA - ALARME\nSENSOR DE ABERTURA\nSIRENE\nIVP\nESCALA: 1:75\nREV. 02\nCLIENTE: CLIENTE EXEMPLO\n12/03/2026';
  const c = L.carimbo(t);
  assert.deepStrictEqual([c.escala, c.revisao, c.cliente, c.data], ['1:75', '02', 'CLIENTE EXEMPLO', '12/03/2026']);
  assert.strictEqual(L.detectarDisciplinas(t)[0].chave, 'alarme');
});

caso('ambientes: "A = " com espaço, sem lixo de carimbo/revisão/lotação', () => {
  const t = ['01 \t17/04/2025 \tALTERAÇÃO DE LAYOUT \tO AUTOR', 'ARMÁRIOS', 'A= 6,20m²', '40 ALUNOS \tSALA 102', 'A = 48,00 m²'].join('\n');
  assert.deepStrictEqual(extrairAmbientes(t).map(a => [a.nome, a.area_m2]), [['ARMÁRIOS', 6.2], ['SALA 102', 48]]);
});

caso('tabela de cabos aceita sigla com dígito e sem ponto final', () => {
  const t = 'CAT6 CABO PAR TRANÇADO CATEGORIA 6.\nRG6 CABO COAXIAL RG-6\nFO CABO DE FIBRA ÓPTICA.';
  assert.deepStrictEqual(extrairTabelaCabos(t).map(c => c.sigla), ['CAT6', 'RG6', 'FO']);
});

caso('ponte PDF → skill elétrica: circuitos e fator de demanda do quadro do projeto', () => {
  const { dadosDaAnalise } = require('../src/utils/ponteAnaliseSkill');
  const { motorDaDisciplina } = require('../src/utils/disciplinasLaudo');
  const t = [
    'IL.1.1 - ILUMINAÇÃO CIRCULAÇÃO 600,00 W 0,92 0,75 489,13 VA 220 V 2,22 A A 16 A 2,5 mm²',
    'TUG.1.2 - TOMADAS SALA 01 1.200,00 W 0,92 0,75 978,26 VA 220 V 4,45 A B 20 A 2,5 mm²',
    'AC.1.3 - AR CONDICIONADO SALA 01 2.000,00 W 0,92 0,75 1630,43 VA 380 V 3,30 A BC 20 A 2,5 mm²',
    'POTÊNCIA TOTAL INSTALADA 3800,00 W 0,92 - 4130,43 VA - - - - -',
    'POTÊNCIA TOTAL DEMANDADA 2850,00 W 0,92 0,75 3097,83 VA 380 V 4,71 A ABC 32 A 6,0 mm²',
  ].join('\n');
  const analise = {
    cliente: 'Cliente Exemplo', nomeProjeto: 'Escola Exemplo', ambientes: [{ nome: 'SALA 01', area_m2: 48 }, { nome: 'BANHEIRO', area_m2: 4 }],
    dadosExtraidos: [{ arquivo: 'ele.pdf', quadroCargas: L.quadroDeCargas(t), totaisQuadro: L.totaisQuadro(t), carimbo: { revisao: '01' } }],
  };
  const motor = motorDaDisciplina('eletrica');
  const { dados, avisos } = dadosDaAnalise('eletrica', motor, analise);
  assert.deepStrictEqual(dados.circuitos.map(c => [c.id, c.tipo, c.ligacao]), [['IL.1.1', 'iluminacao', 'FN'], ['TUG.1.2', 'tug', 'FN'], ['AC.1.3', 'tue', 'FF']]);
  assert.strictEqual(dados.instalacao.fd_ilum_tug[0].fator, 0.75);
  assert.deepStrictEqual([dados.ambientes[1].tipo, dados.meta.revisao, dados.cliente.nome], ['banheiro', 'R01', 'Cliente Exemplo']);
  assert.ok(avisos.some(a => /\[CONFERIR\]/.test(a)), 'o que é estimado precisa vir marcado');
  const res = motor.processar(dados); // o cálculo da norma roda com os dados mapeados
  assert.strictEqual(res.calc.circuitos.length, 3);
  const orc = motor.montarOrcamento(res, 'execucao');
  assert.ok(orc.itens.some(i => i.secao === 'Materiais e Equipamentos' && /Cabo/.test(i.descricao)), 'orçamento com cabos dimensionados');
});

console.log(`leitores de projeto: ${ok} casos ok`);
