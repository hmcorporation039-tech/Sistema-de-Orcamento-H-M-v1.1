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

caso('pressurização de escada pelo conteúdo, sem puxar bomba de pressurização nem damper de climatização', () => {
  assert.strictEqual(L.detectarDisciplinas('PRESSURIZAÇÃO DE ESCADA - PLANTA DO 5º PAVIMENTO\nDAMPER DE ALÍVIO 600x400\nNBR 14880')[0].chave, 'pressurizacao');
  assert.strictEqual(L.detectarDisciplinas('Escada pressurizada — ventilador de pressurização V1')[0].chave, 'pressurizacao');
  assert.deepStrictEqual(L.detectarDisciplinas('BOMBA DE PRESSURIZAÇÃO JOCKEY DOS HIDRANTES'), []);
  assert.ok(!L.detectarDisciplinas('DAMPER MOTORIZADO 24 V PARA FANCOIL').some(d => d.chave === 'pressurizacao'));
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

caso('lista em colunas "Item | Descrição | Unid. | Qtd." (tabulação do PDF): quantidade da coluna Qtd., não o nº do item', () => {
  // como o pdf-parse entrega a tabela (achado do teste de 28/10/2026: "Cabo… \tm \t120" saía com qtd 1)
  const t = [
    'LISTA DE MATERIAIS',
    'Item \tDescrição \tUnid. \tQtd.',
    '1 \tCabo flexível 2,5 mm² 750 V \tm \t120',
    '2 \tTomada 2P+T 10 A \tun \t6',
    '3 \tEletroduto PVC flexível 3/4" \tm \t35,5',
    '4 \tDisjuntor monopolar 16 A curva C \tun \t4',
    '5 Ambientes: SALA A=30,00 m²',
    'Observações gerais do projeto.',
  ].join('\n');
  const l = L.listaMateriais(t);
  assert.deepStrictEqual(l.map(i => [i.descricao, i.unidade, i.qtd]), [
    ['Cabo flexível 2,5 mm² 750 V', 'm', 120],
    ['Tomada 2P+T 10 A', 'un', 6],
    ['Eletroduto PVC flexível 3/4"', 'm', 35.5],
    ['Disjuntor monopolar 16 A curva C', 'un', 4],
  ]);
  // ordem Qtd. antes da Unid. e cabeçalho em maiúsculas também
  const t2 = 'ITEM\tQUANT.\tUN\tDESCRIÇÃO\n01\t12\tpç\tLuminária de sobrepor LED 18 W\n02\t3\tun\tQuadro de distribuição 12 disjuntores';
  assert.deepStrictEqual(L.listaMateriais(t2).map(i => [i.descricao, i.qtd, i.unidade]), [['Luminária de sobrepor LED 18 W', 12, 'pç'], ['Quadro de distribuição 12 disjuntores', 3, 'un']]);
});

// ── revisão de 29/10/2026 (análise sobre projetos reais; aqui só texto SINTÉTICO no mesmo formato) ──

caso('lista do AltoQi "grupo / especificação ⇥ qtd unidade": bitola não é quantidade, item em pç sem nº entra', () => {
  const t = [
    'Lista de materiais - PAVIMENTO X',
    'Elétrica',
    'Acessórios p/ eletrodutos',
    'Caixa PVC',
    '4x2" \t34 pç',
    'Cabo Unipolar (cobre)',
    'Isol. EPR - 0,6/1kV',
    '16 mm² - Azul claro \t40.26 m',
    '2.5 mm² - Preto \t131.78 m',
    'Isol.PVC - 450/750V',
    '2.5 mm² - Verde-amarelo \t20.5 m',
    'Dispositivo de Proteção',
    'Disjuntor Unipolar Termomagnético - DIN (Curva C)',
    '16 A - 3 kA \t13 pç',
    'Dispositivo de proteção contra surto',
    '275 V - 80 kA \t8 pç',
    'Eletrocalha perfurada tipo U',
    '150x100mm chapa 18 \t44.13 m',
    'Legenda de fiação - PAVIMENTO X',
    'QD-1',
    '16',
  ].join('\n');
  const l = L.listaMateriais(t);
  assert.deepStrictEqual(l.map(i => [i.qtd, i.unidade]), [[34, 'pç'], [40.26, 'm'], [131.78, 'm'], [20.5, 'm'], [13, 'pç'], [8, 'pç'], [44.13, 'm']]);
  assert.ok(l.every(i => i.layout === 'ALTOQI'), JSON.stringify(l.map(i => i.layout)));
  assert.strictEqual(l[1].descricao, 'Cabo Unipolar (cobre) — Isol. EPR - 0,6/1kV — 16 mm² - Azul claro');
  // grupo de 1 linha depois de itens troca só o nível de baixo
  assert.strictEqual(l[3].descricao, 'Cabo Unipolar (cobre) — Isol.PVC - 450/750V — 2.5 mm² - Verde-amarelo');
  assert.strictEqual(l[4].descricao, 'Dispositivo de Proteção — Disjuntor Unipolar Termomagnético - DIN (Curva C) — 16 A - 3 kA');
  assert.strictEqual(l[5].descricao, 'Dispositivo de Proteção — Dispositivo de proteção contra surto — 275 V - 80 kA');
  assert.strictEqual(l[0].pavimento, 'PAVIMENTO X');
  // fora do AltoQi, "16 mm² …" também nunca vira 16 unidades no leitor "QTD + descrição"
  assert.deepStrictEqual(L.listaMateriais('LISTA DE MATERIAIS\n16 mm² cabo flexível azul\n50 A - 10 kA disjuntor\n4 Protetor contra surto 20kA'), [{ qtd: 4, descricao: 'Protetor contra surto 20kA', unidade: 'un', layout: 'QTD+DESC' }]);
});

// quadro de cargas em colunas, no formato do AltoQi: a linha não tem uma célula
// por coluna (descrição vazia e potência das fases sem carga somem)
const QUADRO_ALTOQI = [
  'Quadro de Cargas (QGBT) - PAVIMENTO X',
  "Circuito \tDescrição \tEsquema \tMétodo \tTensão \tPot. total. \tPot. total. \tFases \tPot. - R \tPot. - S \tPot. - T \tFCT \tFCA \tIn' \tIp \tSeção \tIc \tIcc \tDisj \tdV parc \tdV total \tStatus",
  'de inst. \t(V) \t(VA) \t(W) \t(W) \t(W) \t(W) \t(A) \t(A) \t(mm²) \t(A) \t(kA) \t(A) \t(%) \t(%)',
  'QD-1 \t3F+N+T \tB1 \t380/220 V \t12000 \t10800 \tR+S+T \t3600 \t3600 \t3600 \t1.00 \t0.70 \t26.0 \t18.2 \t10 \t57.0 \t10 \t32 \t0.80 \t1.00 \tOK',
  'R1 \tReserva \tF+N+T \tB1 \t220 V \t0 \t0 \tT \t1.00 \t1.00 \t0.0 \t0.0 \t2.5 \t24.0 \t10 \t16 \t0.00 \t0.00 \tOK',
  'TOTAL \t12000 \t10800 \tR+S+T \t3600 \t3600 \t3600',
  'Quadro de Demanda (QGBT) - PAVIMENTO X',
  'Tipo de carga \tPotência instalada (kVA) \tFator de demanda (%) \tDemanda (kVA)',
  'Uso Específico \t12.00 \t90.00 \t10.80',
  'TOTAL \t10.80',
  'Quadro de Cargas (QD-1) - PAVIMENTO X',
  "Circuito \tDescrição \tEsquema \tMétodo \tTensão \tIluminação (W) \tTomadas (W) \tPot. total. \tPot. total. \tFases \tPot. - R \tPot. - S \tPot. - T \tFCT \tFCA \tIn' \tIp \tSeção \tIc \tIcc \tDisj \tdV parc \tdV total \tStatus",
  'de inst. \t(V) \t24 \t100 \t(VA) \t(W) \t(W) \t(W) \t(W) \t(A) \t(A) \t(mm²) \t(A) \t(kA) \t(A) \t(%) \t(%)',
  'IL 1 \tF+N \tB1 \t220 V \t10 \t267 \t240 \tR \t240 \t1.00 \t0.70 \t1.7 \t1.2 \t2.5 \t24.0 \t3 \t16 \t0.20 \t1.20 \tOK',
  'T 1 \tF+N+T \tB1 \t220 V \t8 \t889 \t800 \tS \t800 \t1.00 \t0.70 \t5.8 \t4.0 \t2.5 \t24.0 \t3 \t16 \t0.50 \t1.50 \tOK',
  'AC-01 \tAr condicionado \tF+F+T \tB1 \t380 V \t1 \t2222 \t2000 \tR+S \t1000 \t1000 \t1.00 \t0.70 \t8.4 \t5.9 \t4 \t32.0 \t3 \t20 \t0.40 \t1.40 \tOK',
  'TOTAL \t10 \t8 \t1 \t3378 \t3040 \tR+S+T \t1240 \t1800 \t0',
].join('\n');

caso('quadro de cargas do AltoQi lido pelas colunas, separado por quadro', () => {
  const q = L.quadrosDeCargas(QUADRO_ALTOQI);
  assert.deepStrictEqual(q.map(x => [x.quadro, x.pavimento, x.circuitos.length]), [['QGBT', 'PAVIMENTO X', 2], ['QD-1', 'PAVIMENTO X', 3]]);
  assert.deepStrictEqual(q[0].totais, { potencia_VA: 12000, potencia_W: 10800, demanda_kVA: 10.8 });
  const [alim, reserva] = q[0].circuitos;
  assert.strictEqual(alim.alimentador, true, 'circuito com nome de outro quadro do arquivo é alimentador');
  assert.strictEqual(reserva.alimentador, false);
  assert.deepStrictEqual([reserva.descricao, reserva.esquema, reserva.tensao_V, reserva.fases], ['Reserva', 'F+N+T', 220, 'T']);
  const [il, , ac] = q[1].circuitos;
  // as colunas "Iluminação (W)"/"Tomadas (W)" (contagem por potência) não deslocam as potências
  assert.deepStrictEqual(
    [il.circuito, il.descricao, il.potencia_VA, il.potencia_W, il.fp, il.in_corrigida_A, il.ip_A, il.corrente_A, il.secao_mm2, il.cabo_mm2, il.ic_A, il.icc_kA, il.disjuntor_A, il.dv_parcial_pct, il.dv_total_pct, il.status, il.metodo],
    ['IL 1', null, 267, 240, 0.9, 1.7, 1.2, 1.2, 2.5, 2.5, 24, 3, 16, 0.2, 1.2, 'OK', 'B1'],
  );
  // fases sem "+" (a ponte conta letras: 2 fases = FF)
  assert.deepStrictEqual([ac.descricao, ac.fases, ac.tensao_V, ac.disjuntor_A, ac.secao_mm2, ac.quadro], ['Ar condicionado', 'RS', 380, 20, 4, 'QD-1']);
  // a lista plana continua igual para quem já usava (todos os circuitos)
  assert.strictEqual(L.quadroDeCargas(QUADRO_ALTOQI).length, 5);
});

caso('quadro de cargas presente e não lido vira sinal; formato em linha continua igual', () => {
  const { analisarTexto } = require('../src/utils/projetoParser');
  assert.strictEqual(analisarTexto(QUADRO_ALTOQI, 'q.pdf').quadroCargasNaoLido, false);
  // título e cabeçalho, mas linhas num formato que nenhum leitor entende
  const ilegivel = ['Quadro de Cargas (QD-9) - PAVIMENTO X', "Circuito \tEsquema \tTensão \tDisj \tSeção \tIp", 'C1 tomadas 16A'].join('\n');
  const a = analisarTexto(ilegivel, 'q.pdf');
  assert.deepStrictEqual([a.quadroCargas.length, a.quadroCargasNaoLido], [0, true]);
  assert.strictEqual(analisarTexto('PLANTA BAIXA\nTOMADA BAIXA', 'p.pdf').quadroCargasNaoLido, false);
  // "ver quadro de cargas" no meio de uma nota não é quadro
  assert.strictEqual(L.quadroDeCargasPresente('NOTA: OS CIRCUITOS SEGUEM O QUADRO DE CARGAS DA FOLHA 2'), false);
  const linha = analisarTexto('IL.1.1 - ILUMINAÇÃO 600,00 W 0,92 0,75 489,13 VA 220 V 2,22 A A 16 A 2,5 mm²', 'q.pdf');
  assert.deepStrictEqual([linha.quadroCargas.length, linha.quadrosDeCargas[0].layout, linha.quadroCargasNaoLido], [1, 'LINHA', false]);
});

caso('milhar com ponto: "1.200" sem vírgula é ambíguo (lido como antes, com a outra leitura marcada)', () => {
  assert.deepStrictEqual(L.lerNumero('1.200'), { valor: 1.2, ambiguo: true, alternativa: 1200 });
  assert.deepStrictEqual(L.lerNumero('40.26'), { valor: 40.26, ambiguo: false });
  assert.deepStrictEqual(L.lerNumero('1.200,50'), { valor: 1200.5, ambiguo: false });
  assert.deepStrictEqual(L.lerNumero('2.350.000'), { valor: 2.35, ambiguo: true, alternativa: 2350000 });
  const l = L.listaMateriais('1.1 Cabo flexível 2,5 mm² azul 1.200 m\n1.2 Eletroduto PVC 3/4" 23.5 m');
  assert.deepStrictEqual(l.map(i => [i.qtd, !!i.qtdAmbigua, i.qtdAlternativa]), [[1.2, true, 1200], [23.5, false, undefined]]);
  const { analisarTexto } = require('../src/utils/projetoParser');
  assert.strictEqual(analisarTexto('Lista de materiais - X\nCabo\n2.5 mm² - Preto \t1.200 m', 'x.pdf').quantidadesAmbiguas.length, 1);
  // "2.5 mm² - Preto 131.78 m": a bitola não é nº de item no leitor ITEM DESC QTD UN
  assert.deepStrictEqual(L.listaMateriais('2.5 mm² - Preto 131.78 m'), []);
});

caso('carimbo: valor na mesma linha do rótulo; rótulo vazio não pega a linha de baixo', () => {
  const t = [
    'PROPRIETÁRIO:',
    'ENDEREÇO:',
    'RESPONSÁVEL TÉCNICO:',
    'PROPRIETÁRIO',
    'ASSINATURA / APROVAÇÃO DO AUTOR E DO CLIENTE:',
    '00 \t01/02/2026 \tLIBERADO PARA APROVAÇÃO',
    'CLIENTE: EMPRESA EXEMPLO LTDA \tCNPJ: 00.000.000/0001-00',
    'CREA/CAU',
    'DETALHE DE FIXAÇÃO',
    'ESCALA 1:5',
    'PLANTA BAIXA - TÉRREO',
    'ESCALA 1:75',
    'PLANTA BAIXA - SUPERIOR',
    'ESCALA 1:75',
  ].join('\n');
  const c = L.carimbo(t);
  assert.deepStrictEqual([c.cliente, c.escala, c.responsavel, c.crea], ['EMPRESA EXEMPLO LTDA', '1:75', null, null]);
  assert.strictEqual(L.carimbo('PROPRIETÁRIO:\nENDEREÇO:\nRUA EXEMPLO 1').cliente, null);
  assert.strictEqual(L.carimbo('PROPRIETÁRIO: Fulano e Beltrana').cliente, 'Fulano e Beltrana');
  assert.strictEqual(L.carimbo('ESCALA\n1:25\nPLANTA 1:50').escala, null, 'escala sem rótulo na mesma linha e duas na folha: não decide');
});

caso('tabela "TIPO | MODELO | QNT" (sem coluna Descrição) lida pelas colunas', () => {
  const t = ['TABELA DE TOMADAS', 'TIPO \tMODELO \tQNT \tUSO', 'Tomada média \tEspelho com 2 tomadas \t3 \tGeral', 'Interruptor \tEspelho com 1 interruptor \t1 \tSala', 'Tomada alta 20A \tEspelho com 1 tomada 20A \t2 \tAr'].join('\n');
  assert.deepStrictEqual(L.listaMateriais(t).map(i => [i.descricao, i.qtd, i.unidade]), [
    ['Tomada média — Espelho com 2 tomadas', 3, 'un'], ['Interruptor — Espelho com 1 interruptor', 1, 'un'], ['Tomada alta 20A — Espelho com 1 tomada 20A', 2, 'un'],
  ]);
  assert.deepStrictEqual(L.listaMateriais('Item \tDescrição \tQTDE\n1 \tSensor de presença \t4').map(i => [i.descricao, i.qtd]), [['Sensor de presença', 4]]);
});

caso('"CIRCUITO FECHADO" (de TV) não conta como elétrica', () => {
  const d = L.detectarDisciplinas('SISTEMA DE CIRCUITO FECHADO DE TV\nCÂMERA IP\nNVR 16 CANAIS');
  assert.strictEqual(d[0].chave, 'cftv');
  assert.ok(!d.some(x => x.chave === 'eletrica'), JSON.stringify(d));
  assert.strictEqual(L.detectarDisciplinas('CIRCUITO 3 - TOMADAS')[0].chave, 'eletrica');
});

caso('ambientes: "A:", "ÁREA =", área sozinha e ponto decimal', () => {
  // letra solta de circuito e texto de legenda logo acima do nome não entram no nome
  const t = ['M \tM', 'J', 'Tomada para exaustor', 'Quarto 2', 'A: 11,84 m2', 'Sala', 'ÁREA = 18,54 m²', 'Cozinha', '6,63 m²', 'Depósito', 'A= 2.5m²', 'Corredor', 'A: 4,20 m', 'Galpão', 'A= 1.250,00m²'].join('\n');
  assert.deepStrictEqual(extrairAmbientes(t).map(a => [a.nome, a.area_m2]), [
    ['Quarto 2', 11.84], ['Sala', 18.54], ['Cozinha', 6.63], ['Depósito', 2.5], ['Corredor', 4.2], ['Galpão', 1250],
  ]);
});

caso('código repetido: pela posição, repetição distante conta de novo; sem posição, nada muda', () => {
  const { analisarTexto, comRepeticoesPorPosicao } = require('../src/utils/projetoParser');
  const a = analisarTexto('PLANTA TÉRREO\nR1 R2 R3 R4 R5 R6 R7 R8 R9 R10\nPLANTA SUPERIOR\nR1 R2 R3 R4 R5 R6 R7 R8', 'x.pdf');
  assert.deepStrictEqual([a.pontosRedeAntena.rede.total, a.pontosRedeAntena.rede.totalUnicos], [10, 10]);
  // o que lerPontosDoPdf devolve: R1…R8 em outra folha = 8 pontos a mais
  const posicional = { repetidasDistantes: [1, 2, 3, 4, 5, 6, 7, 8].map(numero => ({ numero, pontos: 2, paginas: [1, 2] })) };
  const r = comRepeticoesPorPosicao(a.pontosRedeAntena.rede, posicional);
  assert.deepStrictEqual([r.total, r.totalUnicos, r.repetidasDistantes.length], [18, 10, 8]);
  // número que o filtro de texto descartou ("PRANCHA A1") não volta pela posição
  const ant = comRepeticoesPorPosicao({ total: 0, totalUnicos: 0, unicas: [] }, { repetidasDistantes: [{ numero: 1, pontos: 2, paginas: [1] }] });
  assert.strictEqual(ant.total, 0);
  assert.deepStrictEqual(comRepeticoesPorPosicao(a.cameras, null), { ...a.cameras, totalUnicos: 0 });
});

console.log(`leitores de projeto: ${ok} casos ok`);
