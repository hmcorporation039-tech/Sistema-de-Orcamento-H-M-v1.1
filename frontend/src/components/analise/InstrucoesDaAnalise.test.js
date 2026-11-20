import { act } from 'react';
import { createRoot } from 'react-dom/client';
import InstrucoesDaAnalise from './InstrucoesDaAnalise';
import * as api from '../../services/api';

// Campo de instruções da análise (2.47): escrever, ver o que o sistema entendeu, desmarcar, aplicar (a análise volta
// recalculada) e desfazer a última. Quando as regras não entendem, o botão da IA aparece. Dados SINTÉTICOS.
jest.mock('../../services/api', () => ({
  listarInstrucoes: jest.fn(), interpretarInstrucao: jest.fn(), interpretarInstrucaoIa: jest.fn(),
  aplicarInstrucao: jest.fn(), desfazerInstrucao: jest.fn(),
}));
jest.mock('react-hot-toast', () => { const t = jest.fn(); t.success = jest.fn(); t.error = jest.fn(); return { __esModule: true, default: t }; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  jest.clearAllMocks();
  api.listarInstrucoes.mockResolvedValue({ data: [] });
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const analise = {
  id: 7, finalidade: 'elaboracao', disciplinas: ['cftv', 'incendio'],
  ambientes: [{ nome: 'CAPELA' }, { nome: 'SECRETARIA' }, { nome: 'CPD' }],
};
const OPS = [
  { tipo: 'adicionar', descricao: 'Acrescentar 2 × Câmera de CFTV em CAPELA (1º pavimento)', adicionar: [{ simbolo: 'HM-CFTV-CAMERA', x: 1, y: 1 }, { simbolo: 'HM-CFTV-CAMERA', x: 2, y: 2 }], remover: [], centros: {} },
  { tipo: 'mover', descricao: 'Levar rack (CFTV/rede) para CPD (Térreo)', adicionar: [], remover: [], centros: { telecom: { ambiente: 'CPD' } } },
];
const espera = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });
const montar = async (props = {}) => { await act(async () => raiz.render(<InstrucoesDaAnalise analise={analise} {...props} />)); await espera(); };
const $ = (id) => caixa.querySelector(`[data-testid="${id}"]`);
const $$ = (id) => [...caixa.querySelectorAll(`[data-testid="${id}"]`)];
function escrever(texto) {
  const el = $('instrucao-texto');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  act(() => { setter.call(el, texto); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
const clicar = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await espera(); };

test('mostra exemplos com as salas da própria análise', async () => {
  await montar();
  expect(caixa.textContent).toMatch(/Diga o que mudar/);
  expect(caixa.textContent).toMatch(/acrescente 2 câmeras na capela/);
  expect(caixa.textContent).toMatch(/leve o rack para o cpd/);
});

test('interpreta, desmarca uma operação e aplica só a marcada; a análise recalculada sobe para a página', async () => {
  const onAtualizada = jest.fn();
  api.interpretarInstrucao.mockResolvedValue({ data: { operacoes: OPS, duvidas: [], iaDisponivel: false } });
  api.aplicarInstrucao.mockResolvedValue({ data: { id: 7, versao: 3, instrucao: { id: 1 } } });
  await montar({ onAtualizada });
  escrever('acrescente 2 câmeras na capela e leve o rack para o cpd');
  await clicar($('instrucao-interpretar'));
  expect(api.interpretarInstrucao).toHaveBeenCalledWith(7, 'acrescente 2 câmeras na capela e leve o rack para o cpd');
  expect($$('instrucao-operacao')).toHaveLength(2);
  expect($('instrucao-aplicar').textContent).toMatch(/Aplicar \(2\)/);
  await clicar($$('instrucao-operacao')[1].querySelector('input'));
  expect($('instrucao-aplicar').textContent).toMatch(/Aplicar \(1\)/);
  await clicar($('instrucao-aplicar'));
  expect(api.aplicarInstrucao).toHaveBeenCalledWith(7, expect.objectContaining({ operacoes: [OPS[0]], origem: 'regras' }));
  expect(onAtualizada).toHaveBeenCalledWith({ id: 7, versao: 3, instrucao: { id: 1 } });
  expect($('instrucao-leitura')).toBeNull();
  expect(api.listarInstrucoes).toHaveBeenCalledTimes(2); // recarrega o histórico
});

// 2.49: a mesma correção repetida (2 análises ou 3 ambientes do mesmo tipo) vira sugestão de regra do projetista
test('correção repetida: avisa que virou sugestão de regra do projetista', async () => {
  const toast = require('react-hot-toast').default;
  api.interpretarInstrucao.mockResolvedValue({ data: { operacoes: [OPS[0]], duvidas: [], iaDisponivel: false } });
  api.aplicarInstrucao.mockResolvedValue({ data: { id: 7, instrucao: { id: 2, regrasSugeridas: [{ id: 5, texto: 'Projetista de CFTV: em espaço de reunião de pessoas, acrescentar 2 × câmera de cftv' }] } } });
  await montar();
  escrever('acrescente 2 câmeras na capela');
  await clicar($('instrucao-interpretar'));
  await clicar($('instrucao-aplicar'));
  const aviso = toast.mock.calls.map(c => c[0]).find(t => /sugestão de regra/.test(t));
  expect(aviso).toMatch(/: em espaço de reunião de pessoas, acrescentar 2 × câmera/);
  expect(aviso).not.toMatch(/Projetista de CFTV/);
});

test('não entendeu: mostra a dúvida e oferece a IA; o que a IA entendeu vai com as palavras novas para aprovação', async () => {
  api.interpretarInstrucao.mockResolvedValue({ data: { operacoes: [], duvidas: ['Não entendi: "speed"'], iaDisponivel: true } });
  api.interpretarInstrucaoIa.mockResolvedValue({ data: { operacoes: [OPS[0]], duvidas: [], termos: [{ frase: 'speed dome', simbolo: 'HM-CFTV-CAMERA' }] } });
  api.aplicarInstrucao.mockResolvedValue({ data: { id: 7 } });
  await montar();
  escrever('bota uma speed dome na capela');
  await clicar($('instrucao-interpretar'));
  expect($('instrucao-duvida').textContent).toMatch(/Não entendi/);
  expect($('instrucao-aplicar')).toBeNull();
  await clicar($('instrucao-ia'));
  expect(caixa.textContent).toMatch(/com ajuda da IA/);
  await clicar($('instrucao-aplicar'));
  expect(api.aplicarInstrucao).toHaveBeenCalledWith(7, expect.objectContaining({ origem: 'ia', termos: [{ frase: 'speed dome', simbolo: 'HM-CFTV-CAMERA' }] }));
});

test('histórico: só a última instrução tem Desfazer; desfazer recalcula a análise', async () => {
  api.listarInstrucoes.mockResolvedValue({ data: [
    { id: 2, texto: 'leve o rack para o cpd', operacoes: ['Levar rack'], criado_em: '2026-11-20T15:00:00Z', podeDesfazer: true },
    { id: 1, texto: 'retire o detector', operacoes: ['Retirar 1'], criado_em: '2026-11-20T14:00:00Z', desfeita_em: '2026-11-20T14:30:00Z', podeDesfazer: false },
  ] });
  api.desfazerInstrucao.mockResolvedValue({ data: { id: 7, versao: 5 } });
  const onAtualizada = jest.fn();
  window.confirm = jest.fn(() => true);
  await montar({ onAtualizada });
  expect($('instrucoes-historico').textContent).toMatch(/Instruções aplicadas \(1, 1 desfeita/);
  expect($$('instrucao-desfazer')).toHaveLength(1);
  await clicar($('instrucao-desfazer'));
  expect(api.desfazerInstrucao).toHaveBeenCalledWith(7, 2);
  expect(onAtualizada).toHaveBeenCalledWith({ id: 7, versao: 5 });
});
