// "Aceitar as da legenda" (20/11/2026): quais linhas do mapa do CAD podem ser confirmadas em um clique.
// Linhas sintéticas no formato do mapa_cad (nenhum dado de cliente). Rodar: node testes/mapaCadSeguras.test.js
const assert = require('assert');
const { linhasSeguras, coerencia, resumoDoMapa } = require('../src/services/mapaCad');

let ok = 0;
const caso = (nome, fn) => { fn(); ok++; console.log(`  ok  ${nome}`); };
const linha = (idx, origem, simbolo, layer, rotulo = '', extra = {}) => ({ idx, origem, simbolo, layer, rotulo, quantidade: 4, contados: 4, ...extra });

const mapa = { simbolos: [
  linha(0, 'legenda', 'HM-ELE-TOMADA-BAIXA', 'EL-Tomadas', 'Tomada 2P+T 10 A (2x) - baixa'),
  linha(1, 'legenda', 'HM-ELE-INTERRUPTOR', 'EL-Interruptor', 'Interruptor - 1x simples'),
  linha(2, 'regra', 'HM-ILU-LUMINARIA', 'EL-Lâmpada'),
  linha(3, 'regra', 'HM-ELE-CAIXA-PISO', 'Caixa de passagem - Conduletes'),
  linha(4, 'legenda', 'HM-ELE-INTERRUPTOR', 'EL-Diagrama', 'Disjuntor DR tetrapolar 40 A 30 mA'),
  linha(5, 'legenda', 'HM-ELE-TOMADA-BAIXA', 'EL-Simbolos', 'Luminária de sobrepor LED'),
  linha(6, 'semelhante', 'HM-ELE-TOMADA-ALTA', 'X-1'),
  linha(7, 'nao_reconhecido', '?', 'P-SANR'),
  linha(8, 'legenda', 'HM-ELE-QUADRO', 'EL-Quadro', 'Quadro de distribuição', { confirmado: true }),
  linha(9, 'aprendido', 'HM-INC-EMERGENCIA', 'EL-emerg', 'Luminária de emergência'),
  linha(10, 'legenda', 'HM-ELE-TOMADA-BAIXA', 'EL-Tomadas', 'Tomada média', { foraDoOrcamento: 'layer_com_bloco' }),
] };

caso('aceita legenda e aprendido coerentes, e a regra quando o nome da layer diz o tipo', () => {
  const { seguras } = linhasSeguras(mapa);
  assert.deepStrictEqual(seguras.map(l => l.idx), [0, 1, 2, 9]);
  assert.ok(seguras.every(l => l.confirmado === true));
});
caso('fica a conferir: layer genérica, DR da legenda dos diagramas, texto de outro tipo, semelhante', () => {
  const { aConferir } = linhasSeguras(mapa);
  assert.deepStrictEqual(aConferir.map(d => d.idx), [3, 4, 5, 6]);
  assert.match(aConferir.find(d => d.idx === 4).motivo, /prote[çc][ãa]o ou condutor/);
  assert.match(aConferir.find(d => d.idx === 5).motivo, /sugere/);
});
caso('não mexe em confirmadas, não reconhecidas e linhas fora do orçamento', () => {
  const todas = linhasSeguras(mapa);
  const idx = [...todas.seguras, ...todas.aConferir].map(l => l.idx);
  for (const i of [7, 8, 10]) assert.ok(!idx.includes(i), `linha ${i} não devia aparecer`);
});
caso('coerência: "ponto para luminária" é luminária; tomada com 2P+T não é condutor', () => {
  assert.ok(coerencia({ simbolo: 'HM-ILU-LUMINARIA', rotulo: 'Condulete X - Ponto para luminária' }).ok);
  assert.ok(coerencia({ simbolo: 'HM-ELE-TOMADA-BAIXA', rotulo: 'Tomada 2P+T 20 A' }).ok);
  assert.ok(!coerencia({ simbolo: 'HM-ELE-TOMADA-BAIXA', rotulo: 'Eletroduto PVC 25 mm' }).ok);
  // legenda dos diagramas do LACE-LAB: "interruptor" no texto, mas é o DR
  assert.ok(!coerencia({ simbolo: 'HM-ELE-INTERRUPTOR', rotulo: 'Interruptor/disjuntor diferencial residual tetrapolar, corrente nominal de "X" A, 30mA.' }).ok);
  assert.ok(coerencia({ simbolo: 'HM-ELE-INTERRUPTOR', rotulo: 'Interruptor bipolar simples' }).ok);
});
caso('o resumo do mapa conta as seguras para o botão da tela', () => {
  assert.strictEqual(resumoDoMapa(mapa).seguras, 4);
});
console.log(`mapaCadSeguras: ok (${ok} verificações)`);
