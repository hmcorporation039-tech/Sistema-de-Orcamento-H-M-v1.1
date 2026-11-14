import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import toast from 'react-hot-toast';
import Orcamento from './Orcamento';
import * as api from '../services/api';

// Editor de orçamento (2.40): a carga, o rascunho e o salvar saíram do Orcamento.js para
// ganchos em pages/orcamento/ (useCargaProposta, useRascunho, useSalvarProposta) sem mudar
// o funcionamento. Estes testes fixam o que a tela faz — quais chamadas, com que corpo, que
// mensagens. Dados SINTÉTICOS.

// API falsa: cada função responde pelo `respostas[nome]` (jest.fn por teste) ou por um padrão vazio.
jest.mock('../services/api', () => {
  const respostas = {};
  const vazio = () => Promise.resolve({ data: {} });
  return new Proxy({}, {
    get(_, nome) {
      if (nome === '__esModule') return true;
      if (nome === '__respostas') return respostas;
      if (typeof nome !== 'string') return undefined;
      return (...args) => (respostas[nome] ? respostas[nome](...args) : vazio());
    },
  });
});
jest.mock('react-hot-toast', () => { const t = jest.fn(); t.success = jest.fn(); t.error = jest.fn(); return { __esModule: true, default: t }; });
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ usuario: { id: 1, role: 'admin', nome: 'Teste' } }) }));
jest.mock('../components/Modelo3d', () => ({ OpcaoModelo3dProposta: () => null }));
global.IS_REACT_ACT_ENVIRONMENT = true; // (global, não globalThis: o eslint react-app de fora do projeto não conhece globalThis)

const R = api.__respostas;
const CLIENTES = [{ id: 5, nome: 'Clínica Teste', email: 'contato@clinica.test', ativo: true }];
const PROPOSTA = {
  id: 7, numero: 'HM-2026-007', versao: 3, usuario_id: 1, status: 'Ativa',
  cliente_id: 5, cliente_nome: 'Clínica Teste', cliente_email: 'contato@clinica.test',
  data: '2026-11-01T03:00:00.000Z', validade: 5, tipo: 'Instalação', porte: '', responsavel: 'Fulano',
  local_obra: 'Asa Sul', escopo: 'Quadro', pagamento: '30 dias', observacoes: '',
  bdi: '25', bdi_materiais: null, bdi_memoria: null, imposto_venda: '0', imposto_servico: '6',
  desconto_materiais_pct: null, desconto_mao_obra_pct: null, obra_id: null,
  secoes: [{ id: 11, nome: 'Materiais' }],
  itens: [{ secao_id: 11, descricao: 'Disjuntor 20 A', quantidade: '4', unidade: 'un', valor_unitario: '35.5', material_id: null, status: 'confirmado' }],
  eventos: [],
};

let raiz;
let caixa;
let roteador;
const esperar = (ms = 0) => act(async () => { await new Promise(r => setTimeout(r, ms)); });

beforeEach(() => {
  localStorage.clear();
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  for (const k of Object.keys(R)) delete R[k];
  R.getTodosClientes = jest.fn(() => Promise.resolve({ data: { itens: CLIENTES } }));
  R.getTodosMateriais = jest.fn(() => Promise.resolve({ data: { itens: [] } }));
  R.getServicos = jest.fn(() => Promise.resolve({ data: { itens: [] } }));
  R.getRegistroDisciplinas = jest.fn(() => Promise.resolve({ data: { disciplinas: [], outros: { chave: 'outros', nomes: {} } } }));
  R.getComposicoes = jest.fn(() => Promise.resolve({ data: { itens: [] } }));
  R.getSegmentoCliente = jest.fn(() => Promise.resolve({ data: { segmento: 'privado' } }));
  R.getRevisaoEnvio = jest.fn(() => Promise.resolve({ data: { achados: [], itens_conferidos: 1 } }));
  R.getProximoNumero = jest.fn(() => Promise.resolve({ data: { proximo: 'HM-2026-010' } }));
  R.getPadroesOrcamento = jest.fn(() => Promise.resolve({ data: { bdi: 22, imposto_venda: 0, imposto_servico: 6, definidos: true } }));
  R.getProposta = jest.fn(() => Promise.resolve({ data: PROPOSTA }));
  R.criarProposta = jest.fn(() => Promise.resolve({ data: { id: 42, numero: 'HM-2026-042', versao: 1, status: 'Ativa', mensagem: 'Proposta criada' } }));
  R.atualizarProposta = jest.fn(() => Promise.resolve({ data: { id: 7, numero: 'HM-2026-007', versao: 4, status: 'Ativa', mensagem: 'Proposta atualizada' } }));
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

async function abrir(caminho) {
  roteador = createMemoryRouter([
    { path: '/propostas', element: <Orcamento /> },
    { path: '/propostas/editar/:id', element: <Orcamento /> },
  ], { initialEntries: [caminho] });
  await act(async () => { raiz.render(<RouterProvider router={roteador} />); });
  await esperar();
  await esperar();
}

const botao = (texto) => [...caixa.querySelectorAll('button')].find(b => b.textContent.trim() === texto);
const campoDoRotulo = (texto) => {
  const rotulo = [...caixa.querySelectorAll('label')].find(l => l.textContent.trim() === texto);
  return rotulo && document.getElementById(rotulo.htmlFor);
};
async function clicar(texto) {
  const b = botao(texto);
  expect(b).toBeTruthy();
  await act(async () => { b.click(); });
  await esperar();
}

test('proposta carregada: lê do servidor e salva com o mesmo corpo (PUT com a versão) e o e-mail do cadastro', async () => {
  await abrir('/propostas/editar/7');
  expect(R.getProposta).toHaveBeenCalledWith('7');
  expect(R.getProximoNumero).not.toHaveBeenCalled();
  expect(campoDoRotulo('BDI (%)').value).toBe('25');

  await clicar('Salvar Alterações');
  expect(R.atualizarProposta).toHaveBeenCalledTimes(1);
  expect(R.criarProposta).not.toHaveBeenCalled();
  expect(R.atualizarProposta).toHaveBeenCalledWith('7', {
    data: '2026-11-01', validade: 5, tipo: 'Instalação', porte: '', cliente_id: 5, cliente_nome: 'Clínica Teste',
    responsavel: 'Fulano', local_obra: 'Asa Sul', escopo: 'Quadro', pagamento: '30 dias', observacoes: '',
    bdi: 25, bdi_materiais: null, bdi_memoria: null, imposto_venda: 0, imposto_servico: 6,
    desconto_materiais_pct: null, desconto_mao_obra_pct: null, obra_id: null,
    secoes: [{ id: 11, nome: 'Materiais' }],
    itens: [{ sid: 11, desc: 'Disjuntor 20 A', qtd: 4, un: 'un', vu: 35.5, ncm: null, codigo: null, material_id: null, subgrupo: null, status: 'confirmado', origem_item: null }],
    versao: 3,
  });
  expect(toast.success).toHaveBeenCalledWith('Proposta atualizada');
  expect(caixa.textContent).toContain('Proposta HM-2026-007 salva');

  // e-mail do cliente: o do cadastro ligado por cliente_id, que o servidor devolve com a proposta
  await clicar('Enviar E-mail');
  expect(campoDoRotulo('E-mail do cliente *').value).toBe('contato@clinica.test');
});

test('conflito de versão (409): nada é sobrescrito e a tela oferece recarregar', async () => {
  R.atualizarProposta = jest.fn(() => Promise.reject({ response: { status: 409, data: { erro: 'Alterada por outra pessoa' } } }));
  await abrir('/propostas/editar/7');
  await clicar('Salvar Alterações');
  expect(caixa.textContent).toContain('Alterada por outra pessoa');
  expect(toast.error).not.toHaveBeenCalled();
});

test('proposta nova: padrões e próximo número; rascunho restaurado e salvo com POST, sem reler do servidor', async () => {
  localStorage.setItem('hm_rascunho_proposta:1:nova', JSON.stringify({
    salvoEm: '2026-11-10T12:00:00.000Z', versao: null, numero: null,
    form: { data: '2026-11-10', validade: 7, cliente_nome: 'Cliente Rascunho', cliente_id: null, bdi: 20, imposto_venda: 0, imposto_servico: 6 },
    secoes: [{ id: 's1', nome: 'Materiais' }],
    itens: [{ id: 'i1', sid: 's1', material_id: null, descricao: 'Cabo 2,5 mm²', quantidade: 100, unidade: 'm', valor_unitario: 3.456, ncm: '', codigo: '', subgrupo: '', status: 'confirmado' }],
  }));
  await abrir('/propostas');
  expect(R.getProximoNumero).toHaveBeenCalledTimes(1);
  expect(R.getPadroesOrcamento).toHaveBeenCalledTimes(1);
  expect(R.getProposta).not.toHaveBeenCalled();
  expect(campoDoRotulo('BDI (%)').value).toBe('22'); // o padrão do administrador

  await clicar('Restaurar rascunho');
  expect(toast.success).toHaveBeenCalledWith('Rascunho restaurado — confira e salve');
  expect(campoDoRotulo('BDI (%)').value).toBe('20');

  await clicar('Salvar Proposta');
  expect(R.criarProposta).toHaveBeenCalledTimes(1);
  expect(R.criarProposta).toHaveBeenCalledWith({
    data: '2026-11-10', validade: 7, tipo: '', porte: '', cliente_id: null, cliente_nome: 'Cliente Rascunho',
    responsavel: '', local_obra: '', escopo: '', pagamento: '', observacoes: '',
    bdi: 20, bdi_materiais: null, bdi_memoria: null, imposto_venda: 0, imposto_servico: 6,
    desconto_materiais_pct: null, desconto_mao_obra_pct: null, obra_id: null,
    secoes: [{ id: 's1', nome: 'Materiais' }],
    itens: [{ sid: 's1', desc: 'Cabo 2,5 mm²', qtd: 100, un: 'm', vu: 3.46, ncm: null, codigo: null, material_id: null, subgrupo: null, status: 'confirmado', origem_item: null }],
  });
  expect(toast.success).toHaveBeenCalledWith('Proposta criada');
  await esperar();
  // a URL passa a ser a da proposta gravada, e a tela não relê do servidor (o estado vem junto)
  expect(roteador.state.location.pathname).toBe('/propostas/editar/42');
  expect(R.getProposta).not.toHaveBeenCalled();
  expect(caixa.textContent).toContain('Proposta HM-2026-042 salva');
  // gravou: o rascunho sai do navegador
  expect(localStorage.getItem('hm_rascunho_proposta:1:nova')).toBeNull();
});

test('proposta nova sem cliente: avisa e não chama a API', async () => {
  await abrir('/propostas');
  await clicar('Salvar Proposta');
  expect(toast.error).toHaveBeenCalledWith('Informe o cliente da proposta');
  expect(R.criarProposta).not.toHaveBeenCalled();
});
