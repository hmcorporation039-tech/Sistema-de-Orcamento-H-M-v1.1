import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Aprendizado from './Aprendizado';
import { getAprendizado, iniciarTreinoAcervo } from '../services/api';

// "O que o sistema sabe" (03/11/2026): acerto da leitura, fila do que conferir, treino com as obras e autonomia.
// Dados SINTÉTICOS.
jest.mock('../services/api', () => ({ getAprendizado: jest.fn(), getTreinoAcervo: jest.fn(), iniciarTreinoAcervo: jest.fn(), pararTreinoAcervo: jest.fn() }));
jest.mock('../hooks/useAuth', () => ({ useAuth: () => ({ usuario: { role: 'admin' } }) }));
jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a> }));
jest.mock('react-hot-toast', () => { const t = jest.fn(); t.success = jest.fn(); t.error = jest.fn(); return { __esModule: true, default: t }; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
});
afterEach(() => { act(() => raiz.unmount()); caixa.remove(); });

const dados = {
  materiais: { vinculos: 84, catalogo: 509 },
  simbolos: { conferidos: 3, da_legenda: 21, em_conflito: 1, escritorios: 2 },
  blocos: { em_uso: 12, em_conflito: 0, escritorios: 2 },
  notas: { em_uso: 4, lidas: 6, escritorios: 1 },
  acervo: { lidos: 6, erros: 0, escritorios: 1, ultimo: '2026-11-03T12:00:00', rodada: { rodando: false } },
  autonomia: { dias: 90, taxa: 60, semIA: 6, comIA: 4, funcoes: [{ nome: 'Lista de equipamentos do projeto (itens "REF.:")', acertos: 6, chamadas: 4, taxa: 60 }] },
  precisao: { conferidas: 4, certas: 3, taxa: 75, porOrigem: [{ origem: 'legenda', nome: 'Legenda do desenho', conferidas: 4, certas: 3, taxa: 75 }], porDisciplina: [] },
  fila: [{ analise_id: 7, nome: 'Obra teste', arquivo: 'planta.dxf', layer: 'EL-LUM', simbolo: 'HM-ILU-LUMINARIA', tipo: 'Luminária', quantidade: 40, origem: 'semelhante', confianca: 0.82 }],
};

test('mostra o acerto, a fila de conferência com link para a análise e inicia o treino', async () => {
  getAprendizado.mockResolvedValue({ data: dados });
  await act(async () => { raiz.render(<Aprendizado />); });
  const pagina = caixa.querySelector('[data-testid="pagina-aprendizado"]');
  expect(pagina.textContent).toContain('75%');
  expect(pagina.textContent).toContain('3 de 4 linha(s)');
  expect(caixa.querySelector('a[href="/obras/analise/7"]').textContent).toBe('Obra teste');
  expect(pagina.textContent).toContain('parecido · 82%');
  expect(pagina.textContent).toContain('60% sem IA');
  iniciarTreinoAcervo.mockResolvedValue({ data: { rodando: true, feitos: 0, pendentes: 825, atual: 'Cliente\\planta.dwg' } });
  await act(async () => { caixa.querySelector('[data-testid="iniciar-treino"]').click(); });
  expect(caixa.querySelector('[data-testid="treino-andamento"]').textContent).toContain('Lendo 0 de 825');
});

// diretriz de 06/11/2026: o aprendizado é POR DISCIPLINA — quanto cada uma sabe, confirmado × sugerido
test('mostra o que cada disciplina já sabe, confirmado pelo engenheiro × sugerido pelo sistema', async () => {
  getAprendizado.mockResolvedValue({ data: { ...dados, porDisciplinaDetalhe: [
    { chave: 'eletrica', nome: 'Elétrica', simbolos: 8, blocos: 2, legendasPdf: 0, alturas: 1, naoPonto: 1, confirmados: 5, sugeridos: 7, total: 12 },
    { chave: 'cftv', nome: 'CFTV', simbolos: 0, blocos: 3, legendasPdf: 1, alturas: 0, naoPonto: 0, confirmados: 0, sugeridos: 4, total: 4 },
  ] } });
  await act(async () => { raiz.render(<Aprendizado />); });
  const tabela = caixa.querySelector('[data-testid="sabe-por-disciplina"]');
  expect(tabela.textContent).toContain('confirmado');
  const ele = [...caixa.querySelector('[data-testid="sabe-eletrica"]').querySelectorAll('td')].map(td => td.textContent);
  expect(ele).toEqual(['Elétrica', '8', '2', '0', '1', '1', '5', '7']);
  expect(caixa.querySelector('[data-testid="sabe-cftv"]').textContent).toContain('CFTV');
});
