import { act } from 'react';
import { createRoot } from 'react-dom/client';
import FollowUpPropostas from './FollowUpPropostas';
import { getFollowUpPropostas, registrarFollowUp, registrarEnvioProposta, atualizarStatus } from '../services/api';

// Cartão "Propostas sem resposta": lista por urgência, registrar contato, adiar e encerrar (só na sugestão).
jest.mock('../services/api', () => ({ getFollowUpPropostas: jest.fn(), registrarFollowUp: jest.fn(), registrarEnvioProposta: jest.fn(), atualizarStatus: jest.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  getFollowUpPropostas.mockReset();
  registrarFollowUp.mockReset();
  registrarEnvioProposta.mockReset();
  atualizarStatus.mockReset().mockResolvedValue({});
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const item = (extra) => ({ id: 1, numero: 'P1', cliente_nome: 'Cliente A', responsavel: 'Ana', total: 5000, nivel: 'atrasado', dias_de_atraso: 4, dias_desde_envio: 9, contatos: 0,
  proximo_contato: '2026-11-01', validade_vencida: false, ultima_nota: null, ...extra });
const resposta = (itens, extra = {}) => ({ data: { itens, resumo: { aguardando: itens.length, valor_aguardando: 5000, para_hoje: 0, atrasados: 1, valor_atrasado: 5000, resposta_aprovada: { n: 0, mediana: null }, ...extra } } });
const abrir = async () => { await act(async () => { raiz.render(<FollowUpPropostas />); }); };
const botao = (texto) => [...caixa.querySelectorAll('button')].find(b => b.textContent.includes(texto));
const digitar = (el, valor) => {
  const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
  act(() => { set.call(el, valor); el.dispatchEvent(new Event('input', { bubbles: true })); });
};

test('sem proposta aguardando o cartão nem aparece; com erro também não', async () => {
  getFollowUpPropostas.mockResolvedValue(resposta([]));
  await abrir();
  expect(caixa.querySelector('[data-testid="followup-propostas"]')).toBeNull();
  getFollowUpPropostas.mockRejectedValue(new Error('x'));
  act(() => raiz.unmount()); raiz = createRoot(caixa);
  await abrir();
  expect(caixa.innerHTML).toBe('');
});

test('mostra número, cliente, valor e o motivo; registra o contato com a anotação', async () => {
  getFollowUpPropostas.mockResolvedValue(resposta([item({})]));
  registrarFollowUp.mockResolvedValue(resposta([item({ nivel: 'aguardando', contatos: 1, ultima_nota: 'pediu uma semana' })]));
  await abrir();
  const texto = caixa.textContent;
  expect(texto).toContain('P1');
  expect(texto).toContain('Cliente A');
  expect(texto).toContain('contato atrasado há 4 dias');
  expect(texto).toContain('1 atrasada');

  await act(async () => { botao('Fiz contato').click(); });
  digitar(caixa.querySelector('input[aria-label="Anotação"]'), 'pediu uma semana');
  await act(async () => { botao('Registrar contato').click(); });
  expect(registrarFollowUp).toHaveBeenCalledWith(1, { tipo: 'contato', nota: 'pediu uma semana' });
  expect(caixa.textContent).toContain('pediu uma semana');
});

test('adiar manda a data escolhida', async () => {
  getFollowUpPropostas.mockResolvedValue(resposta([item({})]));
  registrarFollowUp.mockResolvedValue(resposta([item({ nivel: 'aguardando' })]));
  await abrir();
  await act(async () => { botao('Adiar').click(); });
  digitar(caixa.querySelector('input[type="date"]'), '2026-12-15');
  await act(async () => { [...caixa.querySelectorAll('button')].filter(b => b.textContent === 'Adiar').pop().click(); });
  expect(registrarFollowUp).toHaveBeenCalledWith(1, { tipo: 'adiado', nota: '', proximo_em: '2026-12-15' });
});

test('"Encerrar" só aparece na sugestão e pede confirmação antes de cancelar a proposta', async () => {
  getFollowUpPropostas.mockResolvedValue(resposta([item({ nivel: 'atrasado' }), item({ id: 2, numero: 'P2', nivel: 'encerrar', contatos: 3 })]));
  await abrir();
  expect([...caixa.querySelectorAll('button')].filter(b => b.textContent.includes('Encerrar'))).toHaveLength(1);
  expect(caixa.textContent).toContain('3 contatos sem resposta — encerrar?');

  window.confirm = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
  await act(async () => { botao('Encerrar').click(); });
  expect(atualizarStatus).not.toHaveBeenCalled();
  await act(async () => { botao('Encerrar').click(); });
  expect(atualizarStatus).toHaveBeenCalledWith(2, 'Cancelada');
});

test('a mediana de resposta só aparece quando há amostra', async () => {
  getFollowUpPropostas.mockResolvedValue(resposta([item({})]));
  await abrir();
  expect(caixa.querySelector('[data-testid="followup-mediana"]')).toBeNull();
  act(() => raiz.unmount()); raiz = createRoot(caixa);
  getFollowUpPropostas.mockResolvedValue(resposta([item({})], { resposta_aprovada: { n: 5, mediana: 6 } }));
  await abrir();
  expect(caixa.querySelector('[data-testid="followup-mediana"]').textContent).toContain('cerca de 6 dias (de 5 aprovadas)');
});

test('proposta ativa sem envio registrado: lista à parte e "Já enviei" manda a data escolhida', async () => {
  const sem = { id: 9, numero: 'P9', cliente_nome: 'Cliente Z', total: 8000, data: '2026-10-01', responsavel: 'Ana' };
  getFollowUpPropostas.mockResolvedValue({ data: { itens: [], sem_envio: [sem], resumo: { aguardando: 0, valor_aguardando: 0, para_hoje: 0, atrasados: 0, valor_atrasado: 0, sem_envio: 1, resposta_aprovada: { n: 0, mediana: null } } } });
  registrarEnvioProposta.mockResolvedValue(resposta([item({ id: 9, numero: 'P9' })]));
  await abrir();
  expect(caixa.querySelector('[data-testid="followup-sem-envio"]')).toBeNull();   // fechada até pedir
  expect(caixa.textContent).toContain('Nenhuma proposta em acompanhamento');
  await act(async () => { botao('1 ativa sem envio registrado').click(); });
  expect(caixa.querySelector('[data-testid="followup-sem-envio"]').textContent).toContain('P9');
  digitar(caixa.querySelector('input[type="date"]'), '2026-10-20');
  await act(async () => { botao('Já enviei').click(); });
  expect(registrarEnvioProposta).toHaveBeenCalledWith(9, { data: '2026-10-20' });
  expect(caixa.textContent).toContain('contato atrasado');
});
