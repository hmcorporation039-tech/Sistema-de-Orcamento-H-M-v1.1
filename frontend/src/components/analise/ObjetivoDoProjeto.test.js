import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ObjetivoDoProjeto from './ObjetivoDoProjeto';

// "O que é o projeto" (09/11/2026): disciplina, tipo, vistas usadas × ignoradas, legendas e componentes com a fonte.
// Dados SINTÉTICOS.
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

const objetivo = {
  disciplina: 'media_tensao', tipo: 'subestacao_abrigada', tipoRotulo: 'subestação abrigada', titulo: 'SUBESTAÇÃO 75 kVA - ABRIGADA', confianca: 0.9,
  evidencias: ['carimbo: "SUBESTAÇÃO 75 kVA"'], camadasDeContexto: 12,
  vistas: [
    { id: 'V1', papel: 'principal', titulo: 'PLANTA BAIXA - SUBESTAÇÃO', escala: { fator: 0.5, fonte: 'cotas' } },
    { id: 'V2', papel: 'contexto', titulo: 'SITUAÇÃO' },
    { id: 'V3', papel: 'apoio', titulo: 'CORTE A-A' },
  ],
  componentes: [
    { id: 'C1', tipo: 'transformador', descricao: 'TRANSFORMADOR TRIFÁSICO 75 kVA <b>óleo</b>', item: '07', fonte: 'relacao_materiais', quantidade: 1, unidade: 'un', conferir: false },
    { id: 'C2', tipo: 'cabo_mt', descricao: 'CABO 15 kV EPR 35 mm²', item: '09', fonte: 'relacao_materiais', quantidade: null, unidade: 'm', conferir: true },
  ],
  legendas: [{ titulo: 'RELAÇÃO DE MATERIAIS', tipo: 'relacao', doObjetivo: true, faltando: ['03'], itens: [{ numero: '07', descricao: 'TRANSFORMADOR' }] }],
  dados: { potencia_kva: 75, tensao_primaria_kv: 13.8, tensao_secundaria_v: 380, tensao_secundaria_fn_v: 220 },
  abrigo: { largura_m: 2, comprimento_m: 4 },
  avisos: ['O bloco diz 112,5 kVA, a relação diz 75 — vale a relação [CONFERIR].'],
};

test('mostra o objetivo, os componentes com a fonte e o [CONFERIR] do que o projeto não escreve', () => {
  act(() => raiz.render(<ObjetivoDoProjeto analise={{ dadosExtraidos: [{ arquivo: 'SE.dwg', objetivo }] }} estiloCartao={{}} estiloTitulo={{}} />));
  const texto = caixa.textContent;
  expect(texto).toContain('O que é o projeto');
  expect(texto).toContain('SUBESTAÇÃO 75 kVA - ABRIGADA');
  expect(texto).toContain('media_tensao');
  expect(texto).toContain('75 kVA');
  expect(texto).toContain('abrigo 2,00 × 4,00 m');
  expect(texto).toContain('12 camada(s) de base de outro projeto ignoradas');
  expect(texto).toContain('relação de materiais');
  expect(texto).toContain('quantidade não escrita [CONFERIR]');
  // texto do desenho é texto, não HTML
  expect(caixa.querySelector('b b')).toBeNull();
  expect(texto).toContain('<b>óleo</b>');
});

test('vistas, legendas e avisos abrem no clique', () => {
  act(() => raiz.render(<ObjetivoDoProjeto analise={{ dadosExtraidos: [{ arquivo: 'SE.dwg', objetivo }] }} estiloCartao={{}} estiloTitulo={{}} />));
  const clicar = (rotulo) => act(() => [...caixa.querySelectorAll('button')].find(b => b.textContent.includes(rotulo)).click());
  clicar('Vistas da folha');
  expect(caixa.textContent).toContain('Contexto (base de outro projeto — ignorada)');
  expect(caixa.textContent).toContain('1 un. = 0,50 m');
  clicar('Legendas lidas');
  expect(caixa.textContent).toContain('Itens que não estão no desenho: 03 [CONFERIR]');
  clicar('Avisos da leitura');
  expect(caixa.textContent).toContain('vale a relação [CONFERIR]');
});

test('sem objetivo em nenhum arquivo, o cartão não aparece', () => {
  act(() => raiz.render(<ObjetivoDoProjeto analise={{ dadosExtraidos: [{ arquivo: 'a.pdf' }] }} estiloCartao={{}} estiloTitulo={{}} />));
  expect(caixa.querySelector('[data-testid="cartao-objetivo"]')).toBeNull();
});
