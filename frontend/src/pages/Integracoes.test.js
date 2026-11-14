import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CartaoPadroes } from './Integracoes';
import { getPadroesOrcamento, atualizarPadroesOrcamento, getMargemPadrao, atualizarMargemPadrao } from '../services/api';

// Padrões de orçamento (2.39): a margem de venda (antes na tela Materiais) e o BDI e os impostos
// num cartão só, com os mesmos endpoints de antes. Dados SINTÉTICOS.
jest.mock('../services/api', () => ({
  getPadroesOrcamento: jest.fn(), atualizarPadroesOrcamento: jest.fn(),
  getMargemPadrao: jest.fn(), atualizarMargemPadrao: jest.fn(),
}));
jest.mock('react-hot-toast', () => { const t = jest.fn(); t.success = jest.fn(); t.error = jest.fn(); return { __esModule: true, default: t }; });
global.IS_REACT_ACT_ENVIRONMENT = true; // (global, não globalThis: o eslint react-app de fora do projeto não conhece globalThis)

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  getPadroesOrcamento.mockResolvedValue({ data: { bdi: 20, imposto_venda: null, imposto_servico: 5, definidos: false } });
  getMargemPadrao.mockResolvedValue({ data: { margem: 30 } });
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});
const digitar = (el, v) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const campo = (t) => caixa.querySelector(`[data-testid=padrao-${t}]`);
const salvar = () => [...caixa.querySelectorAll('button')].find(b => b.textContent === 'Salvar');

test('mostra margem, BDI e impostos juntos; salva só o que mudou', async () => {
  await act(async () => { raiz.render(<CartaoPadroes />); });
  expect(caixa.textContent).toContain('Padrões de orçamento');
  expect(campo('margem').value).toBe('30');
  expect(campo('bdi').value).toBe('20');
  expect(campo('imposto_venda').value).toBe('');
  expect(salvar().disabled).toBe(true);

  // só a margem (com vírgula): vai para /configuracoes/margem como número; os padrões não são regravados
  atualizarMargemPadrao.mockResolvedValue({ data: { margem: 32.5 } });
  digitar(campo('margem'), '32,5');
  expect(salvar().disabled).toBe(false);
  await act(async () => { salvar().click(); });
  expect(atualizarMargemPadrao).toHaveBeenCalledWith(32.5);
  expect(atualizarPadroesOrcamento).not.toHaveBeenCalled();
  expect(campo('margem').value).toBe('32,5');

  // agora o BDI: vai para /configuracoes/padroes-orcamento como antes
  atualizarPadroesOrcamento.mockResolvedValue({ data: { bdi: 22, imposto_venda: null, imposto_servico: 5, definidos: false } });
  digitar(campo('bdi'), '22');
  await act(async () => { salvar().click(); });
  expect(atualizarPadroesOrcamento).toHaveBeenCalledWith({ bdi: '22', imposto_venda: '', imposto_servico: '5' });
  expect(atualizarMargemPadrao).toHaveBeenCalledTimes(1);
});

test('margem fora de 0 a 300 % não é enviada', async () => {
  await act(async () => { raiz.render(<CartaoPadroes />); });
  digitar(campo('margem'), '450');
  await act(async () => { salvar().click(); });
  expect(atualizarMargemPadrao).not.toHaveBeenCalled();
});
