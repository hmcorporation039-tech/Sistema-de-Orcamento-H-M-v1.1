import {
  calcularTotais, itensAgrupados, reordenarPorSubgrupo, problemaParaSalvar, montarPayload, formDaProposta, itensDaProposta,
} from './calculos';

// Contas do editor de orçamento que saíram de pages/Orcamento.js na divisão da 2.39 — o
// resultado tem de ser o mesmo de antes (e o do servidor, calculoProposta.js). Dados SINTÉTICOS.
const SECOES = [{ id: 's1', nome: 'Materiais' }, { id: 's2', nome: 'Mão de Obra' }];
const ITENS = [
  { id: 'a', sid: 's1', descricao: 'Cabo', quantidade: 10, valor_unitario: 2.5, subgrupo: 'Elétrica' },
  { id: 'b', sid: 's1', descricao: 'Câmera', quantidade: 2, valor_unitario: 300, subgrupo: 'CFTV' },
  { id: 'c', sid: 's1', descricao: 'Disjuntor', quantidade: 1, valor_unitario: 40, subgrupo: 'Elétrica' },
  { id: 'd', sid: 's2', descricao: 'Instalação', quantidade: 1.5, valor_unitario: 100.333, subgrupo: '' },
];

test('totais: subtotais por tipo de seção, BDI único e impostos arredondados como o servidor', () => {
  const t = calcularTotais(ITENS, SECOES, { bdi: 10, bdi_materiais: null, imposto_venda: 5, imposto_servico: 2 });
  expect(t.subtotalMateriais).toBe(665);            // 25 + 600 + 40
  expect(t.subtotalMaoObra).toBe(150.5);             // 1,5 × 100,33
  expect(t.valorBdi).toBe(81.55);
  expect(t.valorBdiMateriais).toBeNull();
  expect(t.valorImpostoVenda).toBe(33.25);
  expect(t.valorImpostoServico).toBe(3.01);
  expect(t.total).toBe(933.31);
});

test('totais: BDI diferenciado de materiais', () => {
  const t = calcularTotais(ITENS, SECOES, { bdi: 10, bdi_materiais: 20, imposto_venda: 0, imposto_servico: 0 });
  expect(t.valorBdiMateriais).toBe(133);
  expect(t.valorBdiMaoObra).toBe(15.05);
  expect(t.valorBdi).toBe(148.05);
});

test('reordenar junta os itens do mesmo subgrupo; agrupar põe cabeçalho e subtotal de cada bloco', () => {
  const ordenados = reordenarPorSubgrupo(ITENS, 's1');
  expect(ordenados.map(i => i.id)).toEqual(['a', 'c', 'b', 'd']);
  const linhas = itensAgrupados(ordenados, 's1');
  expect(linhas.map(l => (l.tipo === 'item' ? l.item.id : `${l.tipo}:${l.nome}`))).toEqual([
    'cabecalho:Elétrica', 'a', 'c', 'subtotal:Elétrica', 'cabecalho:CFTV', 'b', 'subtotal:CFTV',
  ]);
  expect(linhas[3].soma).toBe(65);
});

test('validação aponta o primeiro problema; payload leva o cliente escolhido e arredonda', () => {
  const form = { ...formDaProposta({ cliente_nome: ' Clínica ', validade: 7, bdi: '10' }), cliente_nome: ' Clínica ' };
  expect(problemaParaSalvar({ cliente_nome: '  ' }, ITENS)).toBe('Informe o cliente da proposta');
  expect(problemaParaSalvar(form, [])).toBe('Adicione ao menos um item à proposta');
  expect(problemaParaSalvar(form, [{ descricao: 'x', quantidade: -1, valor_unitario: 1 }])).toBe('Quantidade inválida no item 1');
  expect(problemaParaSalvar(form, ITENS)).toBeNull();
  const p = montarPayload(form, SECOES, ITENS, 42);
  expect(p.cliente_id).toBe(42);
  expect(p.cliente_nome).toBe('Clínica');
  expect(p.validade).toBe(7);
  expect(p.itens[3]).toMatchObject({ qtd: 1.5, vu: 100.33, subgrupo: null });
  expect(montarPayload(form, SECOES, ITENS, undefined).cliente_id).toBeNull();
});

test('proposta carregada: cliente_id vem junto e os itens chegam agrupados por subgrupo', () => {
  const p = {
    cliente_nome: 'X', cliente_id: 9, bdi: '12.5', bdi_materiais: null,
    itens: [
      { secao_id: 1, descricao: 'A', quantidade: '1', valor_unitario: '2', subgrupo: 'G1' },
      { secao_id: 1, descricao: 'B', quantidade: '1', valor_unitario: '2', subgrupo: 'G2' },
      { secao_id: 1, descricao: 'C', quantidade: '1', valor_unitario: '2', subgrupo: 'G1' },
    ],
  };
  expect(formDaProposta(p)).toMatchObject({ cliente_id: 9, bdi: 12.5, bdi_materiais: null });
  expect(itensDaProposta(p).map(i => i.descricao)).toEqual(['A', 'C', 'B']);
});
