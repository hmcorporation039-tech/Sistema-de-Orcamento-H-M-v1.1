import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Campo } from './estilos';
import Select from '../Select';
import CampoMoeda from '../CampoMoeda';
import Paginacao from '../Paginacao';

// Acessibilidade (2.39): o rótulo do Campo liga ao campo (htmlFor + id gerado) e os botões de
// página, que são só ícone, têm nome.
global.IS_REACT_ACT_ENVIRONMENT = true; // (global, não globalThis: o eslint react-app de fora do projeto não conhece globalThis)

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

test('Campo liga o rótulo a input, Select e CampoMoeda (id gerado, um por campo)', () => {
  desenhar(
    <>
      <Campo label="Nome"><input /></Campo>
      <Campo label="Unidade"><Select value="m" onChange={() => {}}><option value="m">m</option></Select></Campo>
      <Campo label="Valor (R$)"><CampoMoeda value={10} onChange={() => {}} /></Campo>
    </>,
  );
  const rotulos = [...caixa.querySelectorAll('label')];
  const ids = rotulos.map(r => r.htmlFor);
  expect(new Set(ids).size).toBe(3);
  rotulos.forEach(r => expect(caixa.querySelector(`[id="${r.htmlFor}"]`)).toBeTruthy());
  expect(caixa.querySelector(`[id="${ids[1]}"]`).tagName).toBe('SELECT');
  expect(caixa.querySelector(`[id="${ids[2]}"]`).tagName).toBe('INPUT');
});

test('Campo mantém o id que o campo já tinha e não liga o que não é campo', () => {
  desenhar(
    <>
      <Campo label="E-mail"><input id="email-proprio" /></Campo>
      <Campo label="Ações"><div><button type="button">ok</button></div></Campo>
      <Campo label="Ativo"><input type="checkbox" /></Campo>
    </>,
  );
  const [email, acoes, ativo] = caixa.querySelectorAll('label');
  expect(email.htmlFor).toBe('email-proprio');
  expect(acoes.hasAttribute('for')).toBe(false);
  expect(ativo.hasAttribute('for')).toBe(false);
});

test('Paginação: botões de ícone com nome', () => {
  desenhar(<Paginacao pagina={2} totalPaginas={3} total={60} onMudarPagina={() => {}} />);
  const [anterior, proxima] = caixa.querySelectorAll('button');
  expect(anterior.getAttribute('aria-label')).toBe('Página anterior');
  expect(proxima.getAttribute('aria-label')).toBe('Próxima página');
  expect(proxima.getAttribute('title')).toBe('Próxima página');
});
