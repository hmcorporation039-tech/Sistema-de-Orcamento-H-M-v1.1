// Revisão da aba Obras (2.42): peças puras da lista e dos "Itens sem obra".
import { resumoItens, orcadoTexto } from './comum';
import { obraSugerida, obrasDoCliente } from './ItensSemObra';

test('linha de itens mostra só o que existe, no plural certo', () => {
  expect(resumoItens({ qtd_analises: 1, qtd_projetos: 2, qtd_laudos: 0, qtd_propostas: 0, qtd_contratos: 0, qtd_movimentos: 0 })).toBe('1 análise · 2 projetos');
  expect(resumoItens({ qtd_propostas: 1, qtd_contratos: 6, qtd_movimentos: 3 })).toBe('1 proposta · 6 contratos · 3 lançamentos');
  expect(resumoItens({ qtd_propostas: 1, qtd_contratos: 6 }, true)).toBe('1 proposta'); // sem financeiro para quem não é admin
  expect(resumoItens({})).toBe('');
});

test('orçado sem proposta aparece como traço, não R$ 0,00', () => {
  expect(orcadoTexto({ orcado: 0, orcado_base: 'nenhuma' })).toBe('—');
  expect(orcadoTexto({ orcado: 1500, orcado_base: 'aprovadas' })).toMatch(/1\.500,00/);
});

test('obra sugerida: só quando há UMA obra em andamento do mesmo cliente', () => {
  const obras = [
    { id: 1, codigo: 'OB-1', cliente_id: 7, cliente_nome: 'Hospital X', status: 'orcamento' },
    { id: 2, codigo: 'OB-2', cliente_id: 7, cliente_nome: 'Hospital X', status: 'concluida' },
    { id: 3, codigo: 'OB-3', cliente_id: null, cliente_nome: 'Clínica Y', status: 'execucao' },
    { id: 4, codigo: 'OB-4', cliente_id: null, cliente_nome: 'clinica y ', status: 'contratada' },
  ];
  expect(obraSugerida({ cliente_id: 7 }, obras).id).toBe(1);
  expect(obrasDoCliente({ cliente_id: 7 }, obras).map(o => o.id)).toEqual([1, 2]); // em andamento primeiro
  expect(obraSugerida({ cliente_nome: 'CLÍNICA Y' }, obras)).toBeNull(); // duas em andamento: não sugere
  expect(obraSugerida({ cliente_nome: 'Outro' }, obras)).toBeNull();
});
