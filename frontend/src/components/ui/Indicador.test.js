import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Indicador from './Indicador';
import Etiqueta from './Etiqueta';
import Info from './Info';

// Peças do kit que substituíram as cópias de cartão de número, etiqueta e
// "rótulo / valor" (revisão de 14/11/2026).
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

test('Indicador mostra rótulo, valor e a linha de apoio', () => {
  desenhar(<Indicador rotulo="Valor aprovado" valor="R$ 10,00" sub="3 propostas" destaque />);
  const [rotulo, valor, sub] = caixa.firstChild.children;
  expect(rotulo.textContent).toBe('Valor aprovado');
  expect(valor.textContent).toBe('R$ 10,00');
  expect(valor.style.color).toBe('rgb(201, 162, 39)');   // dourado do destaque
  expect(sub.textContent).toBe('3 propostas');
});

test('Indicador compacto mostra traço para valor nulo; o padrão não inventa texto', () => {
  desenhar(<Indicador variante="compacto" rotulo="Rascunhos" valor={null} />);
  expect(caixa.firstChild.children[1].textContent).toBe('—');
  desenhar(<Indicador rotulo="Rascunhos" valor={null} />);
  expect(caixa.firstChild.children[1].textContent).toBe('');
  expect(caixa.firstChild.children).toHaveLength(2);   // sem `sub`, sem a terceira linha
});

test('Indicador de laudo: verde atende, vermelho não atende, dourado sem critério', () => {
  desenhar(<Indicador variante="laudo" rotulo="R1" valor="1e-06" ok />);
  expect(caixa.firstChild.children[1].style.color).toBe('rgb(63, 185, 95)');
  desenhar(<Indicador variante="laudo" rotulo="R1" valor="1e-04" ok={false} />);
  expect(caixa.firstChild.children[1].style.color).toBe('rgb(224, 80, 80)');
  desenhar(<Indicador variante="laudo" rotulo="NG" valor="5" ok={null} />);
  expect(caixa.firstChild.children[1].style.color).toBe('rgb(201, 162, 39)');
});

test('Etiqueta usa as cores do status e passa a dica e o data-testid', () => {
  desenhar(<Etiqueta info={{ cor: '#3fb95f', bg: '#0a1a0f', borda: '#1a4a26' }} titulo="dica" data-testid="selo">Contratada</Etiqueta>);
  const s = caixa.firstChild;
  expect(s.textContent).toBe('Contratada');
  expect(s.getAttribute('title')).toBe('dica');
  expect(s.getAttribute('data-testid')).toBe('selo');
  expect(s.style.color).toBe('rgb(63, 185, 95)');
  desenhar(<Etiqueta vazada cor="#3fb95f">Ligado</Etiqueta>);
  expect(caixa.firstChild.style.background).toBe('transparent');
});

test('Info mostra rótulo, valor e nota', () => {
  desenhar(<Info variante="ficha" rotulo="Iniciada" valor="02/11/2026" nota="-15,8, -47,9" />);
  expect(caixa.firstChild.textContent).toBe('Iniciada02/11/2026-15,8, -47,9');
});
