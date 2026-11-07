import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import Financeiro, { paraDatetimeLocal } from './Financeiro';
import { getFinanceiroMovimentos, getPrestadores, atualizarFinanceiroMovimento } from '../services/api';

// Hora do lançamento manual (revisão de 11/2026): a tela mandava toISOString()
// (hora UTC com "Z") para data_hora, que é TIMESTAMP sem fuso — o banco
// descartava o "Z" e o lançamento ficava 3 h adiantado, e mais 3 h a cada
// edição. Agora vai a hora local de Brasília, como o campo mostra.
jest.mock('../services/api', () => ({
  getFinanceiroMovimentos: jest.fn(), verificarPixAgora: jest.fn(), getPrestadores: jest.fn(),
  criarFinanceiroMovimento: jest.fn(), atualizarFinanceiroMovimento: jest.fn(),
  categorizarFinanceiroMovimento: jest.fn(), removerFinanceiroMovimento: jest.fn(), exportarFinanceiroCsv: jest.fn(),
  getObras: jest.fn(() => Promise.resolve({ data: [] })),
}));
jest.mock('react-hot-toast', () => { const t = jest.fn(); t.success = jest.fn(); t.error = jest.fn(); return { __esModule: true, default: t }; });
jest.mock('../components/ObraSelect', () => () => null);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test('paraDatetimeLocal: o instante gravado volta na hora de Brasília', () => {
  // 10:30 em Brasília = 13:30 UTC (o JSON do servidor vem em UTC)
  expect(paraDatetimeLocal('2026-11-06T13:30:00.000Z')).toBe('2026-11-06T10:30');
  // perto da meia-noite UTC: ainda é o dia anterior em Brasília
  expect(paraDatetimeLocal('2026-11-07T01:15:00.000Z')).toBe('2026-11-06T22:15');
  expect(paraDatetimeLocal('lixo')).toBe('');
});

test('editar e salvar sem mexer na hora manda a mesma hora (não soma 3 h)', async () => {
  getPrestadores.mockResolvedValue({ data: { itens: [] } });
  getFinanceiroMovimentos.mockResolvedValue({ data: {
    dataInicio: '2026-11-01', dataFim: '2026-11-06',
    movimentos: [{ id: 5, tipo: 'recebido', nome: 'Cliente X', valor: 100, data_hora: '2026-11-06T13:30:00.000Z', origem: 'manual', obra_id: null }],
    totais: { recebido: 100, realizado: 0, saldo: 100, qtdRecebido: 1, qtdRealizado: 0 },
  } });
  atualizarFinanceiroMovimento.mockResolvedValue({ data: {} });
  const caixa = document.createElement('div');
  document.body.appendChild(caixa);
  const raiz = createRoot(caixa);
  await act(async () => { raiz.render(<MemoryRouter><Financeiro /></MemoryRouter>); });
  // a lista carrega depois de 300 ms (e de novo quando o período inicial chega)
  for (let i = 0; i < 2; i++) await act(async () => { await new Promise(r => setTimeout(r, 400)); });
  const editar = document.querySelector('button[title="Editar"]');
  expect(editar).toBeTruthy();
  await act(async () => { editar.click(); });
  const campo = document.querySelector('input[type="datetime-local"]');
  expect(campo.value).toBe('2026-11-06T10:30');
  const form = campo.closest('form');
  await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  expect(atualizarFinanceiroMovimento).toHaveBeenCalledTimes(1);
  expect(atualizarFinanceiroMovimento.mock.calls[0][1].dataHora).toBe('2026-11-06T10:30');
  act(() => raiz.unmount());
  caixa.remove();
});
