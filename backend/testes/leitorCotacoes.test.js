// Teste do leitor de orçamentos de fornecedor em qualquer layout.
// Textos sintéticos (sem dados reais de fornecedor) cobrindo os padrões que o
// leitor universal precisa reconhecer. Rodar: npm test (na pasta backend).
const assert = require('assert');
const { extrairUniversal } = require('../src/utils/leitorCotacaoUniversal');
const { ehDocumentoDaHM } = require('../src/utils/leitorCotacao');
const { codigosFabricante, chaveDescricao } = require('../src/services/catalogoMateriais');
const { classificarPorDescricao } = require('../src/utils/classificadorMaterial');

let ok = 0;
function caso(nome, fn) {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
}

caso('linha única com R$ e unidade', () => {
  const { itens, conferencia } = extrairUniversal([
    'Item Descrição Qtd Un Preço Unit. Total',
    '1 DISJUNTOR BIPOLAR 32A CURVA C 10 UN R$ 45,90 R$ 459,00',
    '2 CABO FLEXIVEL 2,5MM AZUL ROLO 100M 3 RL R$ 219,50 R$ 658,50',
    'Total geral R$ 1.117,50',
  ].join('\n'));
  assert.strictEqual(itens.length, 2);
  assert.deepStrictEqual([itens[0].quantidade, itens[0].preco, itens[0].unidade], [10, 45.9, 'un']);
  assert.match(itens[1].descricao, /^CABO FLEXIVEL 2,5MM AZUL ROLO 100M$/);
  assert.strictEqual(itens[1].unidade, 'rl');
  assert.ok(conferencia.confere);
});

caso('descrição em várias linhas antes da linha de preços', () => {
  const { itens } = extrairUniversal([
    'Descrição Qtde. Preço Unitário Preço Total',
    'CONTATOR TRIPOLAR 12A BOBINA 220V',
    'FABRICANTE XYZ-1234-AB',
    '4 R$ 120,99 R$ 483,96\tP000164\t1 8536.49.00 4 3,25 15 Dias',
  ].join('\n'));
  assert.strictEqual(itens.length, 1);
  assert.strictEqual(itens[0].descricao, 'CONTATOR TRIPOLAR 12A BOBINA 220V FABRICANTE XYZ-1234-AB');
  assert.deepStrictEqual([itens[0].quantidade, itens[0].preco], [4, 120.99]);
});

caso('layout em blocos (quantidade numa linha, preços na seguinte)', () => {
  const { itens } = extrairUniversal([
    '1 462', 'BOX RETO 3/4 COM ROSCA MARCA', 'UND\t2,000', '3,84 7,68', 'Produto:', 'Descrição: Marca:', 'NCM: 76090000',
    '2 934', 'BUCHA P/ ELETRODUTO 3/4 MARCA', 'UND\t5,000', '1,20 6,00', 'Produto:',
  ].join('\n'));
  assert.strictEqual(itens.length, 2);
  assert.deepStrictEqual([itens[1].descricao, itens[1].quantidade, itens[1].preco, itens[1].unidade], ['BUCHA P/ ELETRODUTO 3/4 MARCA', 5, 1.2, 'und']);
});

caso('total colado no NCM e coluna de peso no meio', () => {
  const { itens } = extrairUniversal('7 2.581 TERMINAL TELEFONICO MODELO 300 UN 54,000 0,320 54,53 2.944,6285171830');
  assert.strictEqual(itens.length, 1);
  assert.deepStrictEqual([itens[0].quantidade, itens[0].preco, itens[0].total], [54, 54.53, 2944.62]);
  assert.strictEqual(itens[0].descricao, 'TERMINAL TELEFONICO MODELO 300');
});

caso('peso não é confundido com quantidade', () => {
  const { itens } = extrairUniversal('9 4.111 BATERIA SELADA 12V 7AH UN 2,000 2,010 97,90 195,80');
  assert.strictEqual(itens[0].quantidade, 2);
});

caso('linhas de total, frete e parcelas não viram item', () => {
  const { itens } = extrairUniversal(['Subtotal 2 R$ 10,00 R$ 20,00', 'Frete 1 R$ 35,00 R$ 35,00', 'Parcela 1 R$ 500,00 R$ 500,00'].join('\n'));
  assert.strictEqual(itens.length, 0);
});

caso('proposta da própria H&M é reconhecida e ignorada', () => {
  assert.ok(ehDocumentoDaHM('Subtotal materiais\nSubtotal mão de obra\nBDI (20%)\nDados Bancários'));
  assert.ok(!ehDocumentoDaHM('Orçamento 123 — Cliente: H&M ENGENHARIA E TECNOLOGIA LTDA'));
});

caso('código de fabricante: o último, sem especificações', () => {
  assert.deepStrictEqual(codigosFabricante('DISJUNTOR MOTOR 2,2-3,2A MOLA 3RV2011-1DA20'), ['3RV2011-1DA20']);
  assert.deepStrictEqual(codigosFabricante('CONTATO PARA 3VA11-15; 3VA20-26 3VA9988-0AB11'), ['3VA9988-0AB11']);
  assert.deepStrictEqual(codigosFabricante('RELE 160-690VCA 15-70HZ'), []);
});

caso('descrição comparada sem acentos e pontuação', () => {
  assert.strictEqual(chaveDescricao('Cabo flexível 2,5mm² - 750V'), chaveDescricao('CABO FLEXIVEL 2,5MM 750V'));
  assert.notStrictEqual(chaveDescricao('DISJUNTOR 10A'), chaveDescricao('DISJUNTOR 16A'));
});

caso('componentes elétricos não caem em Ferragens/CFTV', () => {
  assert.strictEqual(classificarPorDescricao('RELE DE MONITORAMENTO PARAFUSO'), 'Elétrica');
  assert.strictEqual(classificarPorDescricao('CONTATOR DE ALARME TIPO HP'), 'Elétrica');
  assert.strictEqual(classificarPorDescricao('CAMERA IP DOME 2MP'), 'CFTV');
  assert.strictEqual(classificarPorDescricao('PARAFUSO SEXTAVADO 1/4'), 'Ferragens');
});

caso('categorias da H&M: alarme, acesso, automação, interfonia e infraestrutura', () => {
  assert.strictEqual(classificarPorDescricao('SIRENE S/ FIO XSS 8000'), 'Alarme');
  assert.strictEqual(classificarPorDescricao('CATRACA SWING LED DS-K3B211LX'), 'Controle de acesso');
  assert.strictEqual(classificarPorDescricao('INTERRUPTOR SMART WIFI TOUCH 2 EWS 1002'), 'Automação');
  assert.strictEqual(classificarPorDescricao('SWITCH SMART GIGABIT 24 PORTAS POE'), 'Redes / Cabeamento Estruturado');
  assert.strictEqual(classificarPorDescricao('CABO CI 50 10 PARES INTERNO'), 'Interfonia');
  assert.strictEqual(classificarPorDescricao('LUVA DE EMENDA 3/4 LISA'), 'Infraestrutura');
  assert.strictEqual(classificarPorDescricao('BUCHA P/ ELETRODUTO 3/4'), 'Infraestrutura');
  assert.strictEqual(classificarPorDescricao('LUVA FLEXTACTIL PRETO GG'), 'EPI');
});

console.log(`leitor de cotações: ${ok} casos ok`);
