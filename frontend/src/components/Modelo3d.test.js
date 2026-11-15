import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { BotoesModelo3d } from './Modelo3d';
import { getMapaCad, abrirModelo3d, getRegistroDisciplinas, getModelo3d, salvarModelo3dCliente, mostrarModelo3dAoCliente } from '../services/api';

// "Editar componentes no 3D" (revisão de 04/11/2026: "a visualização em 3D ainda não tem a barra de ferramentas"):
// só na análise; abre o 3D com a edição dentro da tela quando há Mapa do CAD. Dados SINTÉTICOS.
jest.mock('../services/api', () => ({
  __esModule: true, default: { post: jest.fn() },
  abrirModelo3d: jest.fn(), baixarModelo3d: jest.fn(), urlModelo3d: (u) => u, enviarArquiteturaAnalise: jest.fn(),
  getArquiteturaAnalise: jest.fn(), getModelo3d: jest.fn(), mostrarModelo3dAoCliente: jest.fn(), getMapaCad: jest.fn(), editarMapaCad: jest.fn(),
  getRegistroDisciplinas: jest.fn(), salvarModelo3dCliente: jest.fn(),
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
  // registro único (GET /disciplinas): nome curto e cor da paleta, os mesmos da legenda do 3D (2.37)
  getRegistroDisciplinas.mockResolvedValue({ data: { disciplinas: [{ chave: 'eletrica', curto: 'Elétrica', cor: '#ff9f43' }, { chave: 'incendio', curto: 'Incêndio', cor: '#ff4b3e' }], outros: { chave: 'outros' }, aliases: { 'controle-acesso': 'controle_acesso' }, extras: [] } });
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

test('a paleta do 3D marca os componentes da disciplina da análise (os outros só com "outras disciplinas")', async () => {
  getMapaCad.mockResolvedValue({ data: { disponivel: true, disciplinasDoProjeto: ['incendio'], componentes: [
    { simbolo: 'HM-ELE-TOMADA-BAIXA', nome: 'Tomada baixa', disciplina: 'eletrica', disciplinas: ['eletrica', 'eletrica_hospitalar', 'eletrica_industrial'] },
    { simbolo: 'HM-INC-DETECTOR-FUMACA', nome: 'Detector de fumaça', disciplina: 'incendio', disciplinas: ['incendio'] },
  ] } });
  abrirModelo3d.mockResolvedValue({ data: { url: '/modelo-3d/ver/abc' } });
  act(() => raiz.render(<BotoesModelo3d origem="analise" id={7} />));
  await act(async () => { caixa.querySelector('[data-testid="editar-3d"]').click(); });
  const quadro = document.querySelector('[data-testid="editor-3d"] iframe');
  const enviado = jest.spyOn(quadro.contentWindow, 'postMessage').mockImplementation(() => {});
  await act(async () => { window.dispatchEvent(new MessageEvent('message', { data: { tipo: 'hm3d:pronto', comOrigem: true }, source: quadro.contentWindow })); });
  const msg = enviado.mock.calls.map(c => c[0]).find(m => m.tipo === 'hm3d:editar');
  expect(msg.paleta.map(p => [p.simbolo, p.doProjeto])).toEqual([['HM-ELE-TOMADA-BAIXA', false], ['HM-INC-DETECTOR-FUMACA', true]]);
  // grupo e cor do marcador vêm do registro único — a mesma cor da disciplina no modelo (2.37)
  expect(msg.paleta.map(p => [p.grupo, p.cor])).toEqual([['Elétrica', '#ff9f43'], ['Incêndio', '#ff4b3e']]);
});

// 2.43: sem Mapa do CAD (arquitetura em PDF, análise antiga) o 3D abre para CONFERIR e salvar para o cliente, sem a paleta
test('sem Mapa do CAD, abre só para conferir e aprovar (sem a paleta de inserir/retirar)', async () => {
  const toast = require('react-hot-toast').default;
  getMapaCad.mockResolvedValue({ data: { disponivel: false, componentes: [{ simbolo: 'X', nome: 'X' }] } });
  abrirModelo3d.mockResolvedValue({ data: { url: '/modelo-3d/ver/abc' } });
  act(() => raiz.render(<BotoesModelo3d origem="analise" id={8} />));
  await act(async () => { caixa.querySelector('[data-testid="editar-3d"]').click(); });
  expect(document.querySelector('[data-testid="editor-3d"]')).not.toBeNull();
  expect(document.querySelector('[data-testid="salvar-3d-cliente"]')).not.toBeNull();
  expect(toast.error).not.toHaveBeenCalled();
  const quadro = document.querySelector('[data-testid="editor-3d"] iframe');
  const enviado = jest.spyOn(quadro.contentWindow, 'postMessage').mockImplementation(() => {});
  await act(async () => { window.dispatchEvent(new MessageEvent('message', { data: { tipo: 'hm3d:pronto', comOrigem: true }, source: quadro.contentWindow })); });
  expect(enviado.mock.calls.map(c => c[0]).find(m => m.tipo === 'hm3d:editar')).toBeUndefined();
});

// 2.43: aprovado no 3D, salva para o cliente ali mesmo — sem ir ao cartão de baixo gerar de novo
test('Aprovar e salvar para o cliente: salva, mostra o arquivo e liga o 3D na proposta dali mesmo', async () => {
  const salvo = { salvo_em: '2026-11-14T23:30:00.000Z', por: 'Engenheiro Teste', nome_arquivo: 'Modelo 3D - Casa.html', inseridos: 2, retirados: 1, atual: true };
  let jaSalvo = false;
  getModelo3d.mockImplementation(() => Promise.resolve({ data: { disponivel: true, salvo_cliente: jaSalvo ? salvo : null, propostas: [{ id: 31, numero: 'P031', status: 'Rascunho', modelo_3d_cliente: false }] } }));
  getMapaCad.mockResolvedValue({ data: { disponivel: true, componentes: [{ simbolo: 'HM-ELE-TOMADA-BAIXA', nome: 'Tomada baixa', disciplina: 'eletrica' }] } });
  abrirModelo3d.mockResolvedValue({ data: { url: '/modelo-3d/ver/abc' } });
  salvarModelo3dCliente.mockImplementation(() => { jaSalvo = true; return Promise.resolve({ data: { ...salvo, na_pasta: true, url: '/api/modelo-3d/ver/x', propostas: [] } }); });
  mostrarModelo3dAoCliente.mockResolvedValue({ data: { modelo_3d_cliente: true } });
  act(() => raiz.render(<BotoesModelo3d origem="analise" id={9} />));
  await act(async () => { caixa.querySelector('[data-testid="editar-3d"]').click(); });
  expect(document.querySelector('[data-testid="3d-cliente-nao-salvo"]')).not.toBeNull();
  const botao = document.querySelector('[data-testid="salvar-3d-cliente"]');
  expect(botao.textContent).toContain('Aprovar e salvar para o cliente');
  await act(async () => { botao.click(); });
  expect(salvarModelo3dCliente).toHaveBeenCalledWith(9);
  const painel = document.querySelector('[data-testid="3d-cliente-salvo"]');
  expect(painel.textContent).toContain('Modelo 3D - Casa.html');
  expect(painel.textContent).toContain('Engenheiro Teste');
  expect(document.querySelector('[data-testid="baixar-3d-cliente"]')).not.toBeNull();
  expect(document.querySelector('[data-testid="salvar-3d-cliente"]').textContent).toContain('Salvar de novo');
  await act(async () => { document.querySelector('[data-testid="mostrar-proposta-31"]').click(); });
  expect(mostrarModelo3dAoCliente).toHaveBeenCalledWith(31, true);
});

test('3D editado depois de salvo: avisa que a pasta continua com a versão salva', async () => {
  const { PainelCliente } = require('./analise/Modelo3dCliente');
  act(() => raiz.render(<PainelCliente analiseId={5} situacao={{ disponivel: true, salvo_cliente: { salvo_em: '2026-11-14T23:30:00.000Z', por: 'X', nome_arquivo: 'a.html', atual: false } }} />));
  expect(caixa.querySelector('[data-testid="3d-cliente-desatualizado"]').textContent).toContain('mudou depois de salvo');
  expect(caixa.querySelector('[data-testid="baixar-3d-cliente"]')).toBeNull();
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
