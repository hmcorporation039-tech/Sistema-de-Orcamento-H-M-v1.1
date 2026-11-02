// Edições do usuário copiadas no "Reprocessar com o mapa conferido" (services/edicoesDaAnalise.js).
// Funções puras, sem banco. Rodar: node testes/edicoesDaAnalise.test.js
const assert = require('assert');
const { mesclarLista, herdarEdicoes, enxugarLeitura } = require('../src/services/edicoesDaAnalise');

const it = (descricao, extra = {}) => ({ disciplina: 'eletrica', codigo: null, descricao, unidade: 'un', quantidade: 0, valor_unitario: 0, pronto: false, ...extra });
let ok = 0;
const caso = (nome, fn) => { try { fn(); ok++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

caso('campo editado, item retirado e item acrescentado vão para a lista nova', () => {
  const base = [it('Tomada'), it('Interruptor'), it('Luminária')];
  const atual = [it('Tomada', { valor_unitario: 55 }), it('Luminária', { pronto: true }), it('Serviço manual', { quantidade: 3 })]; // retirou o interruptor
  const novo = [it('Tomada'), it('Interruptor'), it('Luminária'), it('Sirene')]; // a releitura achou mais um item
  const { lista, resumo } = mesclarLista(base, atual, novo);
  const por = Object.fromEntries(lista.map(x => [x.descricao, x]));
  assert.strictEqual(por.Tomada.valor_unitario, 55);
  assert.strictEqual(por['Luminária'].pronto, true);
  assert.ok(!por.Interruptor, 'o item retirado continua fora');
  assert.ok(por.Sirene, 'item novo da releitura entra');
  assert.strictEqual(por['Serviço manual'].quantidade, 3);
  assert.deepStrictEqual([resumo.alterados, resumo.removidos, resumo.acrescentados], [2, 1, 1]);
});

caso('quantidade que o mapa recalculou vale a do mapa e vira aviso; quantidade que o mapa não mexeu vale a do usuário', () => {
  const base = [it('Tomada', { quantidade: 0 }), it('Luminária', { quantidade: 4 })];
  const atual = [it('Tomada', { quantidade: 9 }), it('Luminária', { quantidade: 6 })]; // o usuário mexeu nas duas
  const novo = [it('Tomada', { quantidade: 5 }), it('Luminária', { quantidade: 4 })]; // o mapa conferido recalculou só a tomada
  const { lista, resumo } = mesclarLista(base, atual, novo);
  const por = Object.fromEntries(lista.map(x => [x.descricao, x]));
  assert.strictEqual(por.Tomada.quantidade, 5);
  assert.strictEqual(por['Luminária'].quantidade, 6);
  assert.deepStrictEqual(resumo.recalculados, ['Tomada']);
});

caso('sem edição nada muda; os argumentos não são alterados', () => {
  const base = [it('A'), it('B')];
  const novo = [it('A', { quantidade: 2 }), it('B')];
  const copia = JSON.stringify(novo);
  const { lista, resumo } = mesclarLista(base, base, novo);
  assert.deepStrictEqual(lista, novo);
  assert.strictEqual(JSON.stringify(novo), copia);
  assert.deepStrictEqual([resumo.alterados, resumo.removidos, resumo.acrescentados], [0, 0, 0]);
});

caso('itens repetidos (mesma descrição) são casados na ordem', () => {
  const base = [it('Eletroduto'), it('Eletroduto')];
  const atual = [it('Eletroduto'), it('Eletroduto', { quantidade: 8 })];
  const { lista } = mesclarLista(base, atual, [it('Eletroduto'), it('Eletroduto')]);
  assert.deepStrictEqual(lista.map(x => x.quantidade), [0, 8]);
});

caso('descrição editada vira "retirou o antigo + acrescentou o novo" e não duplica', () => {
  const { lista } = mesclarLista([it('Tomada 10A')], [it('Tomada 20A')], [it('Tomada 10A')]);
  assert.deepStrictEqual(lista.map(x => x.descricao), ['Tomada 20A']);
});

caso('sem a leitura original nada é copiado e o resumo diz por quê', () => {
  const resultado = { servicos: [it('A')], materiais: [] };
  const h = herdarEdicoes(resultado, { servicos: [it('A', { quantidade: 9 })], materiais: [], leitura_original: null });
  assert.strictEqual(h.copiadas, false);
  assert.match(h.motivo, /antes de o sistema registrar/);
  assert.strictEqual(resultado.servicos[0].quantidade, 0);
});

caso('herdarEdicoes aplica em serviços e materiais e soma o resumo', () => {
  const resultado = { servicos: [it('S1'), it('S2')], materiais: [it('M1')] };
  const anterior = {
    leitura_original: { servicos: [it('S1'), it('S2')], materiais: [it('M1')] },
    servicos: [it('S1', { valor_unitario: 10 })], materiais: [it('M1', { quantidade: 4 }), it('M2')],
  };
  const h = herdarEdicoes(resultado, anterior);
  assert.strictEqual(h.copiadas, true);
  assert.deepStrictEqual([h.alterados, h.removidos, h.acrescentados], [2, 1, 1]);
  assert.deepStrictEqual(resultado.servicos.map(x => x.descricao), ['S1']);
  assert.deepStrictEqual(resultado.materiais.map(x => x.descricao), ['M1', 'M2']);
});

caso('a leitura original guardada é enxuta (chave + campos editáveis) e ainda serve de base', () => {
  const grande = { ...it('S1', { quantidade: 3 }), texto_longo: 'x'.repeat(500), detalhes: { a: 1 } };
  const [m] = enxugarLeitura([grande]);
  assert.ok(!('texto_longo' in m) && !('detalhes' in m));
  assert.strictEqual(m.descricao, 'S1');
  assert.strictEqual(m.quantidade, 3);
  const resultado = { servicos: [it('S1', { quantidade: 5 })], materiais: [] };
  herdarEdicoes(resultado, { leitura_original: { servicos: [m], materiais: [] }, servicos: [it('S1', { quantidade: 9 })], materiais: [] });
  assert.strictEqual(resultado.servicos[0].quantidade, 5, 'o mapa recalculou: vale o mapa');
  assert.deepStrictEqual(enxugarLeitura(null), []);
});

console.log(`edicoesDaAnalise: ok (${ok} verificações)`);
