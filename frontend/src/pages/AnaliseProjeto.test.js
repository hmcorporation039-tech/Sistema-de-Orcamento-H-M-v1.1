import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import AnaliseProjeto from './AnaliseProjeto';
import { getAnaliseProjeto, atualizarAnaliseProjeto, getDisciplinasProjeto, getPastaAnalise } from '../services/api';

// Salvamento automático da análise (revisão de 11/2026). Dados SINTÉTICOS.
//  - a edição feita < 1,5 s antes de trocar de análise se perdia (timer cancelado; o "salvar ao sair" só
//    rodava ao desmontar) → agora grava a anterior na troca;
//  - a gravação da análise A terminando depois de abrir a B punha a versão de A no lugar da de B → 409 falso
//    na próxima gravação de B → agora a versão é por análise.
jest.mock('../services/api', () => ({
  gerarRelatorioCompatibilizacao: jest.fn(), getAnaliseProjeto: jest.fn(), atualizarAnaliseProjeto: jest.fn(),
  gerarOrcamentoDaAnalise: jest.fn(), getPastaAnalise: jest.fn(() => Promise.resolve({ data: {} })), abrirPastaAnalise: jest.fn(),
  getDisciplinasProjeto: jest.fn(() => Promise.resolve({ data: [] })), criarProjetoDeAnalise: jest.fn(),
}));
jest.mock('react-hot-toast', () => { const t = jest.fn(); t.success = jest.fn(); t.error = jest.fn(); return { __esModule: true, default: t }; });
jest.mock('../components/PainelPasta', () => () => null);
jest.mock('../components/PesquisaMercado', () => () => null);
jest.mock('../components/Modelo3d', () => ({ CartaoModelo3dAnalise: () => null }));
jest.mock('../components/analise/EnviarParaAnalise', () => () => null);
jest.mock('../components/analise/ListaAnalises', () => () => null);
jest.mock('../components/analise/ConflitosCompatibilizacao', () => () => null);
jest.mock('../components/analise/MapaCad', () => () => null);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const VERSOES = { 1: 5, 2: 9 };
const dados = (id) => ({
  id, versao: VERSOES[id], cliente: `Cliente ${id}`, nomeProjeto: `Projeto ${id}`, servicos: [], materiais: [],
  funcionamento: '', pontosPorDisciplina: [], finalidade: 'orcamento', disciplinas: [], atualizadoEm: null,
  ambientes: [], achados: [], cameras: { total: 0 }, pontosRedeAntena: {}, pontosPorAmbiente: [], projetos: [], obra: null,
});

let raiz;
let caixa;
let navegar;
function Navegador() { navegar = useNavigate(); return null; }
const esperar = (ms) => act(async () => { await new Promise(r => setTimeout(r, ms)); });

beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  // o Jest do react-scripts zera as implementações antes de cada teste (resetMocks)
  getDisciplinasProjeto.mockResolvedValue({ data: [] });
  getPastaAnalise.mockResolvedValue({ data: {} });
  getAnaliseProjeto.mockReset();
  getAnaliseProjeto.mockImplementation((id) => Promise.resolve({ data: dados(Number(id)) }));
  atualizarAnaliseProjeto.mockReset();
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

async function abrir(id) {
  await act(async () => {
    raiz.render(
      <MemoryRouter initialEntries={[`/a/${id}`]}>
        <Navegador />
        <Routes><Route path="/a/:id" element={<AnaliseProjeto />} /></Routes>
      </MemoryRouter>,
    );
  });
  await esperar(0);
}

function digitarCliente(texto) {
  const campo = caixa.querySelector('input[placeholder="Nome do cliente"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => { setter.call(campo, texto); campo.dispatchEvent(new Event('input', { bubbles: true })); });
}

test('edição feita logo antes de trocar de análise é gravada na anterior', async () => {
  atualizarAnaliseProjeto.mockResolvedValue({ data: { versao: 6 } });
  await abrir(1);
  expect(caixa.querySelector('input[placeholder="Nome do cliente"]').value).toBe('Cliente 1');
  digitarCliente('Cliente 1 corrigido');
  await esperar(200); // bem antes dos 1,5 s do salvamento automático
  await act(async () => { navegar('/a/2'); });
  await esperar(0);
  expect(atualizarAnaliseProjeto).toHaveBeenCalledTimes(1);
  const [id, corpo] = atualizarAnaliseProjeto.mock.calls[0];
  expect(id).toBe(1);
  expect(corpo.cliente_nome).toBe('Cliente 1 corrigido');
  expect(corpo.versao).toBe(5);
  expect(caixa.querySelector('input[placeholder="Nome do cliente"]').value).toBe('Cliente 2');
});

test('gravação da análise anterior que termina depois não troca a versão da aberta', async () => {
  let soltarA;
  atualizarAnaliseProjeto.mockImplementation((id) => (id === 1
    ? new Promise(r => { soltarA = () => r({ data: { versao: 6 } }); })
    : Promise.resolve({ data: { versao: VERSOES[2] + 1 } })));
  await abrir(1);
  digitarCliente('Cliente 1 corrigido');
  await esperar(1700); // a gravação de A sai, mas a resposta demora
  expect(atualizarAnaliseProjeto).toHaveBeenCalledTimes(1);
  await act(async () => { navegar('/a/2'); });
  await esperar(0);
  await act(async () => { soltarA(); }); // A responde com a análise B já aberta
  digitarCliente('Cliente 2 corrigido');
  await esperar(1700);
  expect(atualizarAnaliseProjeto).toHaveBeenCalledTimes(2);
  const [id, corpo] = atualizarAnaliseProjeto.mock.calls[1];
  expect(id).toBe(2);
  expect(corpo.versao).toBe(9); // antes ia a 6 (de A) e o servidor respondia 409
});
