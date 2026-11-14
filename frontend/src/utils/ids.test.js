import { gerarId } from './ids';
import { itensParaOrcamento, distribuirNasSecoes } from '../components/InserirComposicao';

test('gerarId: tmp_ por padrão, prefixo opcional e nunca repete', () => {
  const a = gerarId();
  const b = gerarId();
  const kit = gerarId('tmp_kit');
  expect(a).toMatch(/^tmp_\d+_\d+$/);
  expect(kit).toMatch(/^tmp_kit_\d+_\d+$/);
  expect(new Set([a, b, kit]).size).toBe(3);
});

test('InserirComposicao continua marcando itens e seções novas com tmp_kit_', () => {
  const itens = itensParaOrcamento({ itens: [{ descricao: 'Cabo 2,5', quantidade: 10, tipo: 'material' }] });
  expect(itens[0].id).toMatch(/^tmp_kit_\d+_\d+$/);
  const { secoes } = distribuirNasSecoes(itens, []);
  expect(secoes).toHaveLength(1);
  expect(secoes[0].id).toMatch(/^tmp_kit_\d+_\d+$/);
});
