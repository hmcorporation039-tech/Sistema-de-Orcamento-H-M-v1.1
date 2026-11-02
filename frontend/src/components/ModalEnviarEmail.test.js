import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ModalEnviarEmail from './ModalEnviarEmail';
import { getRevisaoEnvio, enviarPropostaPorEmail } from '../services/api';

// Conferência antes do envio (services/revisaoPreEnvio.js): a lista aparece no modal, o erro grave exige
// "enviar mesmo assim" e a conferência fora do ar nunca impede o envio.
jest.mock('../services/api', () => ({ getRevisaoEnvio: jest.fn(), enviarPropostaPorEmail: jest.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  getRevisaoEnvio.mockReset();
  enviarPropostaPorEmail.mockReset().mockResolvedValue({ data: { mensagem: 'enviada' } });
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const abrir = async () => {
  await act(async () => {
    raiz.render(<ModalEnviarEmail aberto onFechar={() => {}} proposta={{ id: 7, numero: 'P7' }} emailInicial="c@c.com" />);
  });
};
const enviar = async () => {
  await act(async () => { document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
};
const revisao = (nivel, achados) => ({ data: { nivel, resumo: {}, itens_conferidos: 3, achados } });

test('lista os achados e pede "enviar mesmo assim" só quando há erro grave', async () => {
  getRevisaoEnvio.mockResolvedValue(revisao('bloqueio', [
    { nivel: 'bloqueio', codigo: 'total_defasado', mensagem: 'O total gravado não bate com os itens.' },
    { nivel: 'atencao', codigo: 'bdi_zero', mensagem: 'BDI em 0%.' },
  ]));
  await abrir();
  expect(getRevisaoEnvio).toHaveBeenCalledWith(7);
  const painel = document.querySelector('[data-testid="revisao-envio"]');
  expect(painel.textContent).toContain('O total gravado não bate com os itens.');
  expect(painel.textContent).toContain('BDI em 0%.');

  await enviar();
  expect(enviarPropostaPorEmail).not.toHaveBeenCalled();

  const caixaMarcar = painel.querySelector('input[type="checkbox"]');
  await act(async () => { caixaMarcar.click(); });
  await enviar();
  expect(enviarPropostaPorEmail).toHaveBeenCalledWith(7, 'c@c.com', '');
});

test('só atenção não trava o envio e não mostra a caixa', async () => {
  getRevisaoEnvio.mockResolvedValue(revisao('atencao', [{ nivel: 'atencao', codigo: 'a_cotar', mensagem: '1 item a cotar.' }]));
  await abrir();
  expect(document.querySelector('[data-testid="revisao-envio"] input[type="checkbox"]')).toBeNull();
  await enviar();
  expect(enviarPropostaPorEmail).toHaveBeenCalledTimes(1);
});

test('proposta limpa mostra a confirmação; conferência fora do ar não aparece nem impede o envio', async () => {
  getRevisaoEnvio.mockResolvedValue(revisao('ok', []));
  await abrir();
  expect(document.querySelector('[data-testid="revisao-envio"]').textContent).toContain('nada a corrigir');

  act(() => raiz.unmount());
  raiz = createRoot(caixa);
  getRevisaoEnvio.mockRejectedValue(new Error('rede'));
  await abrir();
  expect(document.querySelector('[data-testid="revisao-envio"]')).toBeNull();
  await enviar();
  expect(enviarPropostaPorEmail).toHaveBeenCalledTimes(1);
});
