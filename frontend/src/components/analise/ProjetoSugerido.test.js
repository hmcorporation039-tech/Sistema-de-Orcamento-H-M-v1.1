import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ProjetoSugerido, PavimentosDaAnalise } from './ProjetoSugerido';

// Projeto sugerido pelo sistema (2.45): por pavimento, o que foi posto em cada ambiente e por quê, a infraestrutura e
// os cabos medidos; e os pavimentos lidos da arquitetura. Dados SINTÉTICOS.
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

const sugerido = {
  disciplinas: ['cftv', 'incendio'], pavimentos: ['Térreo', '1º pavimento'], componentes: 4, retirados: 0,
  pontos: [
    { simbolo: 'HM-CFTV-CAMERA', disciplina: 'cftv', rotulo: 'Câmera dome', ambiente: 'SECRETARIA', pavimento: 'Térreo', motivo: 'guarda de valores [CONFERIR]', cabo_m: 18.4 },
    { simbolo: 'HM-INC-DETECTOR-FUMACA', disciplina: 'incendio', rotulo: 'Detector de fumaça', ambiente: 'SECRETARIA', pavimento: 'Térreo', motivo: 'ambiente fechado' },
    { simbolo: 'HM-CFTV-CAMERA', disciplina: 'cftv', rotulo: 'Câmera dome', ambiente: 'CAPELA', pavimento: '1º pavimento', motivo: 'espaço de reunião' },
    { simbolo: 'HM-CFTV-CAMERA', disciplina: 'cftv', rotulo: 'Câmera dome', ambiente: 'CAPELA', pavimento: '1º pavimento', motivo: 'espaço de reunião' },
  ],
  ambientes: [
    { nome: 'SECRETARIA', pavimento: 'Térreo', tipo: 'escritorio', rotuloTipo: 'escritório/atendimento' },
    { nome: 'BANHEIRO', pavimento: 'Térreo', tipo: 'sanitario', rotuloTipo: 'sanitário' },
    { nome: 'CAPELA', pavimento: '1º pavimento', tipo: 'assembleia' },
  ],
  metragens: [{ disciplina: 'cftv', descricao: 'Cabo U/UTP Cat6 LSZH (câmera → switch PoE)', metros: 61.2 }],
  criterios: ['Pé-direito adotado 3 m [CONFERIR].'], avisos: ['1 cabo passa de 90 m [CONFERIR].'], cabo_max_m: 22.1,
};

test('mostra o projeto sugerido por pavimento: componentes, ambiente a ambiente com o motivo, cabos e avisos', () => {
  act(() => raiz.render(<ProjetoSugerido analise={{ dadosExtraidos: [{ arquivo: 'arq.dwg', projeto_sugerido: sugerido }] }} estiloCartao={{}} estiloTitulo={{}} />));
  const txt = caixa.textContent;
  expect(txt).toContain('Projeto sugerido pelo sistema');
  expect(txt).toContain('4 componente(s) de CFTV, Detecção e alarme de incêndio em 2 pavimento(s)');
  // abre no 1º pavimento da lista (o térreo): só o que é dele
  expect(txt).toContain('SECRETARIA');
  expect(txt).not.toContain('CAPELA:');
  expect(txt).toContain('guarda de valores');
  expect(txt).toContain('BANHEIRO (sanitário)');
  expect(txt).toContain('Cabo U/UTP Cat6');
  expect(txt).toContain('61,2 m');
  expect(txt).toContain('1 cabo passa de 90 m');
  // troca de pavimento
  const abas = caixa.querySelectorAll('[data-testid="aba-pavimento"]');
  expect(abas.length).toBe(2);
  act(() => abas[1].click());
  expect(caixa.textContent).toContain('CAPELA: 2 × Câmera dome');
  expect(caixa.textContent).not.toContain('guarda de valores');
});

test('sem projeto sugerido, o cartão não aparece', () => {
  act(() => raiz.render(<ProjetoSugerido analise={{ dadosExtraidos: [{ arquivo: 'arq.dwg' }] }} estiloCartao={{}} estiloTitulo={{}} />));
  expect(caixa.textContent).toBe('');
});

test('pavimentos e ambientes: um grupo por pavimento, na ordem do prédio, com a área escrita e o divergente a conferir', () => {
  const analise = {
    dadosExtraidos: [{ pavimentos: [{ nome: 'Subsolo' }, { nome: 'Térreo' }] }],
    ambientes: [
      { nome: 'CAPELA', pavimento: 'Térreo', area_m2: 80, area_projeto_m2: 92.85 },
      { nome: 'SALÃO DE FESTAS', pavimento: 'Subsolo', area_m2: 813, area_projeto_m2: 806.69 },
      { nome: 'SALA - 02', pavimento: 'Térreo', area_m2: 10, area_projeto_m2: 67.03, area_divergente: true },
    ],
  };
  act(() => raiz.render(<PavimentosDaAnalise analise={analise} estiloCartao={{}} estiloTitulo={{}} />));
  const txt = caixa.textContent;
  expect(txt.indexOf('Subsolo')).toBeLessThan(txt.indexOf('Térreo'));
  expect(txt).toContain('1 com a área lida diferente da escrita');
  const botoes = caixa.querySelectorAll('button');
  act(() => botoes[1].click());
  expect(caixa.textContent).toContain('SALA - 02 — 67,03 m²');
  expect(caixa.textContent).toContain('lida pelas paredes: 10 m²');
});
