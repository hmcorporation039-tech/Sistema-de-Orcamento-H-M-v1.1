// Preços de referência de mão de obra: segmento do cliente (oficial/governo ×
// particular), prioridade da sugestão e roteiro de fontes de cada pesquisa.
// Sem banco e sem IA. Rodar: npm test (pasta backend).
const assert = require('assert');
const { segmentoDoCliente, valorSugerido } = require('../src/services/precosMaoDeObraReferencia');
const { promptServicoSegmento, SEGMENTOS_MO } = require('../src/services/pesquisaMercado');

let ok = 0;
function caso(nome, fn) {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
}

caso('segmento pelo cadastro do cliente: "Órgão Público" → oficial; Empresa/Pessoa Física → particular', () => {
  assert.strictEqual(segmentoDoCliente('Órgão Público', 'Qualquer'), 'publico');
  assert.strictEqual(segmentoDoCliente('Empresa', 'Secretaria de Saúde'), 'privado'); // o cadastro manda
  assert.strictEqual(segmentoDoCliente('Pessoa Física', 'João'), 'privado');
});

caso('sem cadastro, o nome do cliente indica órgão público', () => {
  for (const n of ['SECRETARIA DE ESTADO DE EDUCAÇÃO DO DF', 'Tribunal Regional Federal', 'Prefeitura Municipal de Formosa', 'Universidade Federal de Goiás', 'NOVACAP', 'Câmara Legislativa do DF', 'Corpo de Bombeiros Militar'])
    assert.strictEqual(segmentoDoCliente(null, n), 'publico', n);
  for (const n of ['Condomínio Residencial Exemplo', 'Clínica Exemplo LTDA', 'Cliente Exemplo', '', null])
    assert.strictEqual(segmentoDoCliente(null, n), 'privado', String(n));
});

caso('sugestão: valor H&M adotado tem prioridade; senão a referência do segmento', () => {
  const r = { hm: 120, publico: 95.5, privado: 150 };
  assert.strictEqual(valorSugerido(r, 'publico'), 120);
  assert.strictEqual(valorSugerido({ ...r, hm: null }, 'publico'), 95.5);
  assert.strictEqual(valorSugerido({ ...r, hm: null }, 'privado'), 150);
  assert.strictEqual(valorSugerido({ hm: null, publico: 95.5, privado: null }, 'privado'), null); // não mistura segmentos
});

caso('pesquisa oficial pede SINAPI/ORSE/licitações com código, data e UF; particular pede mercado e honorários', () => {
  const pub = promptServicoSegmento('Instalação de ponto de tomada', 'un', 'publico');
  assert.match(pub, /SINAPI/); assert.match(pub, /ORSE/); assert.match(pub, /Painel de Preços/); assert.match(pub, /UF DF/); assert.match(pub, /desonerado/);
  assert.match(pub, /por un\b/); assert.match(pub, /Não invente/);
  const pri = promptServicoSegmento('Laudo de SPDA com ART', 'vb', 'privado');
  assert.match(pri, /particulares/); assert.match(pri, /honorários de engenharia/); assert.match(pri, /Brasília\/Distrito Federal/);
  assert.doesNotMatch(pri, /SINAPI/);
  assert.deepStrictEqual(Object.keys(SEGMENTOS_MO), ['publico', 'privado']);
});

console.log(`preços de referência: ${ok} casos ok`);
