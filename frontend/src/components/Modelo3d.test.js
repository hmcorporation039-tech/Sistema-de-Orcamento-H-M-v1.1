import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { BotoesModelo3d } from './Modelo3d';
import { getMapaCad, abrirModelo3d } from '../services/api';

// "Editar componentes no 3D" (revisão de 04/11/2026: "a visualização em 3D ainda não tem a barra de ferramentas"):
// só na análise; abre o 3D com a edição dentro da tela quando há Mapa do CAD. Dados SINTÉTICOS.
jest.mock('../services/api', () => ({
  __esModule: true, default: { post: jest.fn() },
  abrirModelo3d: jest.fn(), baixarModelo3d: jest.fn(), urlModelo3d: (u) => u, enviarArquiteturaAnalise: jest.fn(),
  getArquiteturaAnalise: jest.fn(), getModelo3d: jest.fn(), mostrarModelo3dAoCliente: jest.fn(), getMapaCad: jest.fn(), editarMapaCad: jest.fn(),
}));
jest.mock('react-hot-toast', () => { const t = jest.fn(); t.success = jest.fn(); t.error = jest.fn(); return { __esModule: true, default: t }; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  [getMapaCad, abrirModelo3d].forEach(f => f.mockReset());
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

test('o botão de editar no 3D só aparece na análise', () => {
  act(() => raiz.render(<BotoesModelo3d origem="proposta" id={1} />));
  expect(caixa.querySelector('[data-testid="editar-3d"]')).toBeNull();
  act(() => raiz.render(<BotoesModelo3d origem="analise" id={1} />));
  expect(caixa.querySelector('[data-testid="editar-3d"]')).not.toBeNull();
});

test('com Mapa do CAD, abre o 3D com a edição dentro da tela', async () => {
  getMapaCad.mockResolvedValue({ data: { disponivel: true, componentes: [{ simbolo: 'HM-ELE-TOMADA-BAIXA', nome: 'Tomada baixa', disciplina: 'eletrica' }] } });
  abrirModelo3d.mockResolvedValue({ data: { url: '/modelo-3d/ver/abc' } });
  act(() => raiz.render(<BotoesModelo3d origem="analise" id={7} />));
  await act(async () => { caixa.querySelector('[data-testid="editar-3d"]').click(); });
  expect(getMapaCad).toHaveBeenCalledWith(7);
  expect(document.querySelector('[data-testid="editor-3d"]')).not.toBeNull();
  expect(abrirModelo3d).toHaveBeenCalledWith('analise', 7, { embutido: true });
});

test('sem Mapa do CAD, avisa e não abre', async () => {
  const toast = require('react-hot-toast').default;
  getMapaCad.mockResolvedValue({ data: { disponivel: false, componentes: [{ simbolo: 'X', nome: 'X' }] } });
  act(() => raiz.render(<BotoesModelo3d origem="analise" id={8} />));
  await act(async () => { caixa.querySelector('[data-testid="editar-3d"]').click(); });
  expect(document.querySelector('[data-testid="editor-3d"]')).toBeNull();
  expect(toast.error).toHaveBeenCalled();
});

// revisão de 11/2026: trocar de análise/proposta antes de a resposta chegar não mostra a da anterior
test('resposta atrasada de outra análise não entra no cartão', async () => {
  const { CartaoModelo3dAnalise } = require('./Modelo3d');
  const { getArquiteturaAnalise } = require('../services/api');
  let soltarA;
  getArquiteturaAnalise.mockReset();
  getArquiteturaAnalise.mockImplementation((id) => (id === 1
    ? new Promise(r => { soltarA = () => r({ data: { nome_arquivo: 'arquitetura-A.dxf', resumo: { ambientes: [] } } }); })
    : Promise.resolve({ data: null })));
  await act(async () => { raiz.render(<CartaoModelo3dAnalise analiseId={1} />); });
  await act(async () => { raiz.render(<CartaoModelo3dAnalise analiseId={2} />); });
  await act(async () => { soltarA(); });
  expect(caixa.textContent).not.toContain('arquitetura-A.dxf');
});

test('resposta atrasada de outra proposta não liga a opção do 3D', async () => {
  const { OpcaoModelo3dProposta } = require('./Modelo3d');
  const { getModelo3d } = require('../services/api');
  let soltarA;
  getModelo3d.mockReset();
  getModelo3d.mockImplementation((_o, id) => (id === 1
    ? new Promise(r => { soltarA = () => r({ data: { disponivel: true, modelo_3d_cliente: true } }); })
    : Promise.resolve({ data: { disponivel: false } })));
  await act(async () => { raiz.render(<OpcaoModelo3dProposta propostaId={1} />); });
  await act(async () => { raiz.render(<OpcaoModelo3dProposta propostaId={2} />); });
  await act(async () => { soltarA(); });
  expect(caixa.innerHTML).toBe('');
});
