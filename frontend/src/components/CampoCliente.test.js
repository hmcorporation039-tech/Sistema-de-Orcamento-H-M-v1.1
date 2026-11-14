import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import CampoCliente, { clienteDaProposta, clientePorNome } from './CampoCliente';
import { Campo } from './ui/estilos';

// Cliente escolhido da lista (2.39 — Orçamento e Análise de Projeto). Dados SINTÉTICOS.
jest.mock('../services/api', () => ({ getTodosClientes: jest.fn(() => Promise.resolve({ data: { itens: [] } })) }));
global.IS_REACT_ACT_ENVIRONMENT = true; // (global, não globalThis: o eslint react-app de fora do projeto não conhece globalThis)

const CLIENTES = [
  { id: 3, nome: 'Zeta Comércio' },
  { id: 1, nome: 'Clínica São José', documento: '11.222.333/0001-81' },
  { id: 2, nome: 'Alfa Engenharia' },
  { id: 4, nome: 'Clinica Sao Jose' },        // homônimo (sem acento) do 1
  { id: 5, nome: 'Beta Inativa', ativo: false },
];

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

// guarda o estado como a tela faz (nome + id) e anota cada onChange
function Tela({ chamadas }) {
  const [estado, setEstado] = useState({ nome: '', id: null });
  return (
    <Campo label="Cliente *">
      <CampoCliente clientes={CLIENTES} nome={estado.nome} clienteId={estado.id}
        onChange={(v) => { chamadas.push(v); setEstado(v); }} />
    </Campo>
  );
}
function montar() {
  const chamadas = [];
  act(() => { raiz.render(<Tela chamadas={chamadas} />); });
  return { chamadas, campo: () => caixa.querySelector('input') };
}

const digitar = (el, v) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
const focar = (el) => act(() => { el.focus(); });
const opcoes = () => [...caixa.querySelectorAll('[role=option]')].map(o => o.textContent);

test('lista em ordem alfabética, sem inativos, e filtra sem acento', () => {
  const { campo } = montar();
  focar(campo());
  expect(opcoes()).toEqual(['Alfa Engenharia', 'Clínica São José · 11.222.333/0001-81', 'Clinica Sao Jose', 'Zeta Comércio']);
  digitar(campo(), 'clinica');
  expect(opcoes()).toHaveLength(2);
});

test('escolher da lista manda o id; digitar um nome novo manda id nulo', () => {
  const { chamadas, campo } = montar();
  focar(campo());
  digitar(campo(), 'alf');
  act(() => { caixa.querySelector('[role=option]').dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  expect(chamadas.at(-1)).toEqual({ id: 2, nome: 'Alfa Engenharia' });
  expect(caixa.querySelector('[data-testid=situacao-cliente]').textContent).toContain('cliente do cadastro');
  digitar(campo(), 'Alfa Engenharia Ltda');
  expect(chamadas.at(-1)).toEqual({ id: null, nome: 'Alfa Engenharia Ltda' });
  expect(caixa.querySelector('[data-testid=situacao-cliente]').textContent).toContain('cliente novo');
});

test('setas + Enter escolhem pelo teclado', () => {
  const { chamadas, campo } = montar();
  focar(campo());
  digitar(campo(), 'a');   // Alfa, Clínica, Clinica, Zeta (todos têm "a")
  const tecla = (key) => act(() => { campo().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
  tecla('ArrowDown');
  tecla('Enter');
  expect(chamadas.at(-1)).toEqual({ id: 1, nome: 'Clínica São José' });
});

test('nome igual ao de um só cliente liga; com homônimos não liga', () => {
  expect(clientePorNome(CLIENTES, ' ZETA comercio ')?.id).toBe(3);
  expect(clientePorNome(CLIENTES, 'Clinica São José')).toBeNull();   // dois cadastros com esse nome
  expect(clientePorNome(CLIENTES, '')).toBeNull();
  const { chamadas, campo } = montar();
  digitar(campo(), 'zeta comércio');
  expect(chamadas.at(-1)).toEqual({ id: 3, nome: 'zeta comércio' });
});

test('cliente da proposta (Orçamento e Histórico): pelo cliente_id primeiro; o nome só sem id', () => {
  const comEmail = [{ id: 7, nome: 'Clínica X', email: '' }, { id: 8, nome: 'Clinica X ', email: 'outro@x.test' }, { id: 9, nome: 'Única', email: 'u@x.test' }];
  // ligada por id: é ESTE cliente, mesmo com um homônimo que tem e-mail (antes o nome achava o outro)
  expect(clienteDaProposta(comEmail, 7, 'Clínica X')).toBe(comEmail[0]);
  expect(clienteDaProposta(comEmail, '9', 'nome antigo')).toBe(comEmail[2]);
  // ligada a um cliente fora da lista (inativo): continua ligada, sem e-mail emprestado
  expect(clienteDaProposta(comEmail, 99, 'Inativo')).toEqual({ id: 99, nome: 'Inativo' });
  // sem id (proposta antiga): só o nome igual ao de um único cliente
  expect(clienteDaProposta(comEmail, null, 'UNICA')).toBe(comEmail[2]);
  expect(clienteDaProposta(comEmail, '', 'Clinica X')).toBeNull();
  expect(clienteDaProposta(comEmail, undefined, '')).toBeNull();
});

test('o rótulo do Campo fica ligado ao campo de cliente', () => {
  const { campo } = montar();
  const rotulo = caixa.querySelector('label');
  expect(rotulo.htmlFor).toBeTruthy();
  expect(rotulo.htmlFor).toBe(campo().id);
});
