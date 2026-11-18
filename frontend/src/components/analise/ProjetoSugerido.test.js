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

// 2.46: pontos agrupados (n), nível/pé-direito do pavimento, critérios e "gerar de novo"
test('2.46: soma os agrupados (n), mostra nível e pé-direito do pavimento e gera de novo com os critérios escolhidos', async () => {
  const s = {
    ...sugerido, componentes: 7,
    pontos: [
      { simbolo: 'HM-ILU-LUMINARIA', disciplina: 'iluminacao', rotulo: 'Luminária LED', ambiente: 'SECRETARIA', pavimento: 'Térreo', motivo: 'método dos lúmens', n: 6 },
      { simbolo: 'HM-ELE-QUADRO', disciplina: 'eletrica', rotulo: 'Quadro de distribuição (QD)', ambiente: 'SECRETARIA', pavimento: 'Térreo', motivo: 'QD do Térreo', n: 1 },
    ],
    pavimentosInfo: [{ nome: 'Térreo', nivel_m: 0.1, pe_direito_m: 4.85, pe_direito_lido: true, metodo: 'referência' }, { nome: '1º pavimento', nivel_m: 5.15, pe_direito_m: 4.24, pe_direito_lido: true, metodo: 'pelas paredes que se repetem (40 % do contorno casado)' }],
    criteriosUsados: { densidadeCftv: 'padrao', cftvExterno: true, ptz: true, incendio: 'total', redePor10m2: 2, classeSpda: 'III', excluir: [], peDireito: null },
    disciplinas: ['iluminacao', 'eletrica', 'cftv'],
  };
  const pedidos = [];
  act(() => raiz.render(<ProjetoSugerido analise={{ id: 9, dadosExtraidos: [{ arquivo: 'arq.dwg', projeto_sugerido: s }] }} estiloCartao={{}} estiloTitulo={{}} onRegerar={async (c) => { pedidos.push(c); }} />));
  const txt = caixa.textContent;
  expect(txt).toContain('SECRETARIA: 6 × Luminária LED');
  expect(txt).toContain('Iluminação');
  expect(caixa.querySelector('[data-testid="info-pavimento"]').textContent).toContain('Pé-direito 4,85 m (pelas cotas lidas)');
  expect(caixa.querySelector('[data-testid="prancha-dxf"]').textContent).toContain('Prancha DXF — Térreo');
  // aba do 1º pavimento: o alinhamento aparece
  act(() => caixa.querySelectorAll('[data-testid="aba-pavimento"]')[1].click());
  expect(caixa.querySelector('[data-testid="info-pavimento"]').textContent).toContain('alinhado ao prédio pelas paredes que se repetem');
  // mudar os critérios e gerar de novo
  const abrir = [...caixa.querySelectorAll('button')].find(b => /Mudar os critérios/.test(b.textContent));
  act(() => abrir.click());
  const sel = caixa.querySelector('#crit-densidade');
  act(() => { sel.value = 'reforcada'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
  await act(async () => { caixa.querySelector('[data-testid="gerar-de-novo"]').click(); });
  expect(pedidos).toHaveLength(1);
  expect(pedidos[0].densidadeCftv).toBe('reforcada');
  expect(pedidos[0].classeSpda).toBe('III');
});

test('2.46: critérios para o envio — pé-direito com vírgula vira número e a lista de fora sai limpa', () => {
  const { criteriosParaEnvio, criteriosDoProjeto } = require('./CriteriosProjeto');
  const c = criteriosParaEnvio({ peDireito: '3,5', excluir: ['CASA PAROQUIAL', '  ', 'SALA - 02 (Térreo)'] });
  expect(c.peDireito).toBe(3.5);
  expect(c.excluir).toEqual(['CASA PAROQUIAL', 'SALA - 02 (Térreo)']);
  expect(criteriosParaEnvio({}).peDireito).toBeUndefined();
  expect(criteriosDoProjeto({ peDireito: 4.2, excluir: ['X'] }).peDireito).toBe('4,2');
});
