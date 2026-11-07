import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Concorrencia from './Concorrencia';
import AprendizadoOrcamento from './AprendizadoOrcamento';
import { getConcorrencia, getComparacaoConcorrente, getPropostas, vincularItemConcorrente, getAprendizadoOrcamento } from '../services/api';

// Comparador de orçamentos da concorrência e "O que já sabe orçar" (06/11/2026). Dados SINTÉTICOS.
let mockParametros = new URLSearchParams('');
const mockDefinirParametros = jest.fn((p) => { mockParametros = new URLSearchParams(p); });
jest.mock('../services/api', () => ({
  getConcorrencia: jest.fn(), getComparacaoConcorrente: jest.fn(), importarOrcamentoConcorrente: jest.fn(), removerConcorrente: jest.fn(),
  vincularItemConcorrente: jest.fn(), atualizarConcorrente: jest.fn(), getPropostas: jest.fn(), getAprendizadoOrcamento: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
  useSearchParams: () => [mockParametros, mockDefinirParametros],
}));
jest.mock('react-hot-toast', () => { const t = jest.fn(); t.success = jest.fn(); t.error = jest.fn(); return { __esModule: true, default: t }; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => {
  jest.useFakeTimers();
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  getPropostas.mockResolvedValue({ data: { itens: [{ id: 5, numero: 'P005', cliente_nome: 'Cliente Exemplo' }] } });
});
afterEach(() => { act(() => raiz.unmount()); caixa.remove(); jest.useRealTimers(); mockParametros = new URLSearchParams(''); });

const comparacao = {
  id: 9, concorrente: 'Concorrente Exemplo', proposta_id: 5, proposta_numero: 'P005', cliente_nome: 'Cliente Exemplo', arquivo_nome: 'orc.xlsx', metodo: 'planilha (xlsx)', avisos: [],
  itensConcorrente: [{ id: 31, descricao: 'Cabo UTP', sem_par: false }],
  itensNossos: [{ id: 1, descricao: 'Câmera IP dome', unidade: 'un' }],
  comparacao: {
    linhas: [{ nosso: { id: 1, descricao: 'Câmera IP dome', quantidade: 10, unidade: 'un', venda_unitario: 400, tipo: 'material' }, deles: { id: 30, descricao: 'Camera IP dome', quantidade: 10, unidade: 'un', valor_unitario: 380 }, semelhanca: 92, manual: false, dif_preco_pct: -5, alertas: [] }],
    soDeles: [{ id: 31, descricao: 'Cabo UTP', quantidade: 400, unidade: 'm', valor_unitario: 4, total: 1600, tipo: 'material' }],
    soNossos: [],
    resumo: { total_nosso: 4000, total_deles: 5400, diferenca: -1400, diferenca_pct: -25.9, potencial_reducao: 200, so_deles: 1, so_nossos: 0, valor_so_deles: 1600, valor_so_nossos: 0, fator_venda: 1 },
    recomendacoes: ['Nosso total está R$ 1.400,00 abaixo do concorrente.'],
  },
};

test('lista os orçamentos importados e abre a comparação', async () => {
  getConcorrencia.mockResolvedValue({ data: [{ id: 9, concorrente: 'Concorrente Exemplo', arquivo_nome: 'orc.xlsx', proposta_numero: 'P005', cliente_nome: 'Cliente Exemplo', itens: 3, total_documento: 5400, criado_em: '2026-11-06T10:00:00' }] });
  await act(async () => { raiz.render(<Concorrencia />); });
  expect(caixa.textContent).toContain('Concorrente Exemplo');
  expect(caixa.textContent).toContain('P005 — Cliente Exemplo');
  const botao = [...caixa.querySelectorAll('button')].find(b => b.textContent === 'Concorrente Exemplo');
  act(() => { botao.click(); });
  expect(mockDefinirParametros).toHaveBeenCalled();
  // (o CRA zera a implementação dos jest.fn a cada teste: confere o argumento)
  expect(new URLSearchParams(mockDefinirParametros.mock.calls[0][0]).get('comparacao')).toBe('9');
});

test('mostra o resumo, as recomendações e vincula item só do concorrente', async () => {
  mockParametros = new URLSearchParams('aba=concorrencia&comparacao=9');
  getComparacaoConcorrente.mockResolvedValue({ data: comparacao });
  vincularItemConcorrente.mockResolvedValue({ data: { ok: true } });
  await act(async () => { raiz.render(<Concorrencia />); });
  expect(caixa.textContent).toContain('O que fazer para oferecer o melhor ao cliente');
  expect(caixa.textContent).toContain('Nosso total está R$ 1.400,00 abaixo do concorrente.');
  expect(caixa.textContent).toContain('Só no orçamento do concorrente (1)');
  const seletor = caixa.querySelector('select[aria-label="Item nosso equivalente a Cabo UTP"]');
  await act(async () => { seletor.value = 'sem'; seletor.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(vincularItemConcorrente).toHaveBeenCalledWith('9', 31, { sem_par: true });
});

test('o que já sabe orçar: autonomia e itens que acompanham por disciplina', async () => {
  getAprendizadoOrcamento.mockResolvedValue({ data: [{ disciplina: 'cftv', nome: 'CFTV', propostas: 4, itensConhecidos: 12, servicosComPreco: 5, materiaisComPreco: 6, precosQueConfirmam: 3, autonomia: 'boa',
    itensQueAcompanham: [{ descricao: 'Patch cord 1,5 m', unidade: 'un', servico: false, ocorrencias: 4, porPonto: 2, preco: 25 }] }] });
  await act(async () => { raiz.render(<AprendizadoOrcamento />); });
  expect(caixa.textContent).toContain('Orça sozinho');
  expect(caixa.textContent).toContain('Patch cord 1,5 m');
  expect(caixa.textContent).toContain('4 de 4');
});
