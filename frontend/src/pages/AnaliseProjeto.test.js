import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import AnaliseProjeto from './AnaliseProjeto';
import { getAnaliseProjeto, atualizarAnaliseProjeto, getDisciplinasProjeto, getPastaAnalise, getTodosClientes } from '../services/api';

// Salvamento automático da análise (revisão de 11/2026). Dados SINTÉTICOS.
//  - a edição feita < 1,5 s antes de trocar de análise se perdia (timer cancelado; o "salvar ao sair" só
//    rodava ao desmontar) → agora grava a anterior na troca;
//  - a gravação da análise A terminando depois de abrir a B punha a versão de A no lugar da de B → 409 falso
//    na próxima gravação de B → agora a versão é por análise.
jest.mock('../services/api', () => ({
  gerarRelatorioCompatibilizacao: jest.fn(), getAnaliseProjeto: jest.fn(), atualizarAnaliseProjeto: jest.fn(),
  gerarOrcamentoDaAnalise: jest.fn(), getPastaAnalise: jest.fn(() => Promise.resolve({ data: {} })), abrirPastaAnalise: jest.fn(),
  getDisciplinasProjeto: jest.fn(() => Promise.resolve({ data: [] })), criarProjetoDeAnalise: jest.fn(),
  getTodosClientes: jest.fn(),
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
  // campo Cliente com a lista do cadastro (2.39)
  getTodosClientes.mockResolvedValue({ data: { itens: [] } });
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

// ── 2.48: tela única — cabeçalho com resumo numa linha, abas, "⋯ Mais" e barra de ações (dados SINTÉTICOS) ──
const comItens = (id, extra = {}) => ({
  ...dados(id),
  servicos: [{ descricao: 'Instalação de câmera', quantidade: 2, unidade: 'un', valor_unitario: 100, subgrupo: 'CFTV' }],
  materiais: [
    { descricao: 'Câmera dome', quantidade: 2, unidade: 'un', preco_catalogo: 300, preco_unitario: 250, confianca_catalogo: 90 },
    { descricao: 'Conector RJ-45', quantidade: 0, unidade: 'un', preco_catalogo: 2 },
  ],
  achados: [{ tema: 'Quadro sem circuito', observacao: 'Quadro QD-1 sem circuitos lidos' }],
  ...extra,
});
const $t = (id) => caixa.querySelector(`[data-testid="${id}"]`);
const clicarEm = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await esperar(0); };

test('Orçamento abre em "Itens e valores": tabela única, subtotal por bloco e estimativa com o preço adotado', async () => {
  getAnaliseProjeto.mockImplementation((id) => Promise.resolve({ data: comItens(Number(id)) }));
  await abrir(1);
  expect($t('aba-itens')).not.toBeNull();
  expect($t('aba-projeto')).toBeNull();
  // mão de obra 2 × 100 = 200; materiais: 2 × 250 (pesquisa adotada vence o catálogo de 300) + 0 = 500
  expect($t('estimativa').textContent).toMatch(/200,00/);
  expect($t('estimativa').textContent).toMatch(/500,00/);
  expect($t('estimativa').textContent).toMatch(/700,00/);
  expect($t('resumo-analise').textContent).toMatch(/3 item\(ns\)/);
  expect($t('resumo-analise').textContent).toMatch(/1 pendência/);
  expect(caixa.querySelectorAll('[data-testid="linha-item"]')).toHaveLength(3);
  expect($t('bloco-servico').textContent).toMatch(/Mão de obra/);
  expect($t('bloco-material').textContent).toMatch(/500,00/);
  // a lista de análises salvas não aparece com uma análise aberta
  expect($t('nova-analise')).toBeNull();
});

test('Pendências: achados e "Ver os itens" abre a aba de itens filtrada nos sem quantidade', async () => {
  getAnaliseProjeto.mockImplementation((id) => Promise.resolve({ data: comItens(Number(id)) }));
  await abrir(1);
  expect($t('guia-pendencias').textContent).toMatch(/2/); // 1 achado + itens sem quantidade
  await clicarEm($t('guia-pendencias'));
  expect(caixa.textContent).toMatch(/Quadro QD-1 sem circuitos lidos/);
  expect(caixa.textContent).toMatch(/1 item\(ns\) com quantidade 0/);
  await clicarEm([...caixa.querySelectorAll('button')].find(b => /Ver os itens/.test(b.textContent)));
  const linhas = caixa.querySelectorAll('[data-testid="linha-item"]');
  expect(linhas).toHaveLength(1);
  expect(linhas[0].textContent).toMatch(/Conector RJ-45/);
});

test('Elaboração abre em "Projeto"; o "⋯ Mais" abre o funcionamento num painel e a barra oferece o projeto por disciplina', async () => {
  getDisciplinasProjeto.mockResolvedValue({ data: [{ chave: 'cftv', nome: 'CFTV', skill: 'cftv-iec62676' }] });
  getAnaliseProjeto.mockImplementation((id) => Promise.resolve({ data: comItens(Number(id), { finalidade: 'elaboracao', disciplinas: ['cftv'], funcionamento: 'Câmeras gravando em NVR' }) }));
  await abrir(1);
  expect($t('aba-projeto')).not.toBeNull();
  expect($t('gerar-orcamento')).toBeNull(); // na Elaboração o orçamento sai do projeto de cada disciplina
  await clicarEm($t('menu-mais'));
  await clicarEm($t('mais-funcionamento'));
  expect($t('painel-mais').querySelector('textarea').value).toBe('Câmeras gravando em NVR');
  await clicarEm($t('menu-projeto'));
  expect($t('projeto-cftv-iec62676').textContent).toMatch(/CFTV/);
});
