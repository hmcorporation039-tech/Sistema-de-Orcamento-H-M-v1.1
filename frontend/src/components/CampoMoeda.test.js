import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import CampoMoeda from './CampoMoeda';

// Campos de dinheiro trocados por CampoMoeda (2.39): aceitam vírgula e milhar; o modo
// `permiteVazio` (preço opcional: "sem referência") deixa o campo em branco e devolve null.
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
const digitar = (el, v) => act(() => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});

function Tela({ inicial, permiteVazio, valores }) {
  const [v, setV] = useState(inicial);
  return <CampoMoeda value={v} permiteVazio={permiteVazio} placeholder="Sem referência" onChange={(n) => { valores.push(n); setV(n); }} />;
}

test('aceita vírgula e milhar e mostra em reais fora de foco', () => {
  const valores = [];
  act(() => { raiz.render(<Tela inicial="" valores={valores} />); });
  const campo = caixa.querySelector('input');
  expect(campo.value.replace(/\s/g, ' ')).toBe('R$ 0,00');
  digitar(campo, '1.234,56');
  expect(valores.at(-1)).toBe(1234.56);
  expect(campo.value.replace(/\s/g, ' ')).toBe('R$ 1.234,56');
  digitar(campo, '');
  expect(valores.at(-1)).toBe(0);   // sem permiteVazio, apagar é zero (como antes)
});

test('permiteVazio: vazio fica em branco (placeholder à vista) e apagar devolve null', () => {
  const valores = [];
  act(() => { raiz.render(<Tela inicial={null} permiteVazio valores={valores} />); });
  const campo = caixa.querySelector('input');
  expect(campo.value).toBe('');
  digitar(campo, '80,5');
  expect(valores.at(-1)).toBe(80.5);
  digitar(campo, '   ');
  expect(valores.at(-1)).toBeNull();
  expect(campo.value).toBe('');
});
