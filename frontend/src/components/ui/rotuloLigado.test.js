import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Campo } from './estilos';
import Select from '../Select';
import CampoMoeda from '../CampoMoeda';
import Paginacao from '../Paginacao';
import BuscaCodigo from '../fiscal/BuscaCodigo';
import CampoBusca from './CampoBusca';

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

test('Campo mantém o id que o campo já tinha; sem campo, vira grupo nomeado (nenhum <label> solto)', () => {
  desenhar(
    <>
      <Campo label="E-mail"><input id="email-proprio" /></Campo>
      <Campo label="Ações"><div><button type="button">ok</button></div></Campo>
      <Campo label="Ativo"><input type="checkbox" /></Campo>
    </>,
  );
  const rotulos = caixa.querySelectorAll('label');
  expect(rotulos).toHaveLength(1);
  expect(rotulos[0].htmlFor).toBe('email-proprio');
  const grupos = [...caixa.querySelectorAll('[role="group"]')];
  expect(grupos.map(g => document.getElementById(g.getAttribute('aria-labelledby')).textContent)).toEqual(['Ações', 'Ativo']);
  expect(grupos.every(g => document.getElementById(g.getAttribute('aria-labelledby')).tagName === 'SPAN')).toBe(true);
});

test('BuscaCodigo e CampoBusca recebem o id: o rótulo liga à busca e, já escolhido, ao código mostrado', () => {
  const buscar = () => Promise.resolve({ data: [] });
  desenhar(
    <>
      <Campo label="Município"><BuscaCodigo buscar={buscar} valor={null} onEscolher={() => {}} /></Campo>
      <Campo label="Serviço"><BuscaCodigo buscar={buscar} valor={{ codigo: '070201', descricao: 'Engenharia' }} onEscolher={() => {}} /></Campo>
      <Campo label="Buscar"><CampoBusca value="" onChange={() => {}} /></Campo>
    </>,
  );
  const alvo = [...caixa.querySelectorAll('label')].map(r => document.getElementById(r.htmlFor));
  expect(alvo.map(el => el && el.tagName)).toEqual(['INPUT', 'OUTPUT', 'INPUT']);
  expect(alvo[1].textContent).toContain('Engenharia');
  expect(caixa.querySelector('button[title="Trocar"]').getAttribute('aria-label')).toBe('Trocar');
});

test('Paginação: botões de ícone com nome', () => {
  desenhar(<Paginacao pagina={2} totalPaginas={3} total={60} onMudarPagina={() => {}} />);
  const [anterior, proxima] = caixa.querySelectorAll('button');
  expect(anterior.getAttribute('aria-label')).toBe('Página anterior');
  expect(proxima.getAttribute('aria-label')).toBe('Próxima página');
  expect(proxima.getAttribute('title')).toBe('Próxima página');
});
