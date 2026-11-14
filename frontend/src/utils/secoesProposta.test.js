import { ehMaoDeObra } from './secoesProposta';
import { ehMaoDeObra as doEditor } from '../pages/orcamento/apoio';
import { distribuirNasSecoes } from '../components/InserirComposicao';

test('uma regra só de seção de mão de obra (editor e composições)', () => {
  expect(doEditor).toBe(ehMaoDeObra);
  expect(['Mão de Obra', 'MAO-DE-OBRA', 'Serviços (Mão de Obra)', 'Servicos'].every(ehMaoDeObra)).toBe(true);
  expect(['Materiais', 'Equipamentos', '', null].some(ehMaoDeObra)).toBe(false);
  // sem passar a regra, o InserirComposicao usa a mesma: o serviço cai na seção "Mão de Obra" existente
  const secoes = [{ id: 'm', nome: 'Materiais' }, { id: 's', nome: 'Mão de Obra' }];
  const { itens } = distribuirNasSecoes([{ tipo: 'servico' }, { tipo: 'material' }], secoes);
  expect(itens.map(i => i.sid)).toEqual(['s', 'm']);
});
