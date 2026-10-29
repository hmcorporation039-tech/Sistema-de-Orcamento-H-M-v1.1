import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Modal from './Modal';

// Janela única (etapa 7 do kit de tela): Esc fecha só a de cima, o clique no
// fundo fecha (arrastar a seleção de dentro para fora não), foco no conteúdo.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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

const desenhar = (jsx) => act(() => { raiz.render(jsx); });
const tecla = (key) => act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
const mouse = (el, tipo) => act(() => { el.dispatchEvent(new MouseEvent(tipo, { bubbles: true })); });

test('Esc fecha só a janela de cima (e-mail por cima do detalhe)', () => {
  const fechou = [];
  desenhar(
    <>
      <Modal titulo="Detalhe" onFechar={() => fechou.push('detalhe')}>a</Modal>
      <Modal titulo="E-mail" onFechar={() => fechou.push('email')}>b</Modal>
    </>,
  );
  tecla('Escape');
  expect(fechou).toEqual(['email']);
  // a de cima saiu da tela: o próximo Esc é da de baixo
  desenhar(<Modal titulo="Detalhe" onFechar={() => fechou.push('detalhe')}>a</Modal>);
  tecla('Escape');
  expect(fechou).toEqual(['email', 'detalhe']);
  tecla('Enter');
  expect(fechou).toHaveLength(2);
});

test('clique no fundo fecha; dentro da janela e seleção arrastada para fora não', () => {
  const onFechar = jest.fn();
  desenhar(<Modal titulo="Novo Cliente" onFechar={onFechar} testid="janela"><input data-testid="campo" /></Modal>);
  const fundo = caixa.querySelector('[data-modal-fundo]');
  const janela = caixa.querySelector('[data-testid=janela]');
  const campo = caixa.querySelector('[data-testid=campo]');

  mouse(campo, 'mousedown'); mouse(campo, 'click');
  expect(onFechar).not.toHaveBeenCalled();

  // apertou no campo e soltou no fundo (selecionando texto): o click cai no fundo
  mouse(campo, 'mousedown'); mouse(fundo, 'click');
  expect(onFechar).not.toHaveBeenCalled();

  mouse(fundo, 'mousedown'); mouse(fundo, 'click');
  expect(onFechar).toHaveBeenCalledTimes(1);

  expect(janela.getAttribute('role')).toBe('dialog');
  expect(janela.getAttribute('aria-label')).toBe('Novo Cliente');
});

test('o X fecha, e sem campo com autoFocus o foco vai para a janela', () => {
  const onFechar = jest.fn();
  desenhar(<Modal titulo="Pasta" onFechar={onFechar} testid="janela" zIndex={1000}>conteúdo</Modal>);
  const janela = caixa.querySelector('[data-testid=janela]');
  expect(document.activeElement).toBe(janela);
  expect(caixa.querySelector('[data-modal-fundo]').style.zIndex).toBe('1000');
  mouse(caixa.querySelector('button[aria-label=Fechar]'), 'click');
  expect(onFechar).toHaveBeenCalledTimes(1);
});

test('sem titulo não desenha cabeçalho (telas com cabeçalho próprio)', () => {
  desenhar(<Modal rotulo="Calculador de BDI" onFechar={() => {}} data-teste="x">corpo</Modal>);
  const janela = caixa.querySelector('[role=dialog]');
  expect(janela.getAttribute('aria-label')).toBe('Calculador de BDI');
  expect(janela.getAttribute('data-teste')).toBe('x');
  expect(janela.querySelector('h3')).toBeNull();
});
