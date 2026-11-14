import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ProjetoDaEspecificacao from './ProjetoDaEspecificacao';
import { getPerfisEspecificacao, lerEspecificacao, gerarProjetoEspecificacao, aprovarProjetoEspecificacao, atualizarProjetoEspecificacao } from '../../services/apiEspecificacao';

// Tela do projeto pela especificação: perfis em ordem alfabética, requisitos lidos com a frase de origem,
// trechos para ensinar e o resultado do projeto (decisões, pontos, pendências, simulação, materiais).
jest.mock('../../services/apiEspecificacao', () => ({
  getPerfisEspecificacao: jest.fn(), lerEspecificacao: jest.fn(), gerarProjetoEspecificacao: jest.fn(), atualizarProjetoEspecificacao: jest.fn(),
  simularProjetoEspecificacao: jest.fn(), precosProjetoEspecificacao: jest.fn(), aprovarProjetoEspecificacao: jest.fn(),
}));
jest.mock('../../services/api', () => ({ baixarDocumentoLaudo: jest.fn() }));
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

const origem = { bloco: 'b1', pagina: 1, secao: '2', frase: 'Alimentação | 380/220 V' };
const lida = {
  perfil: 'quadro_forca_comando', aprendidos: 0, avisos: [],
  vocabulario: { requisitos: [{ id: 'comando.reversao', rotulo: 'Reversão' }, { id: 'alimentacao.tensao', rotulo: 'Tensão' }], equipamentos: [{ id: 'bomba', rotulo: 'Bomba' }] },
  lidos: { estatistica: { cobertura: 90 }, requisitos: [{ id: 'alimentacao.tensao', grupo: 'alimentacao', rotulo: 'Tensão de alimentação', valor: { ff: 380, fn: 220 }, origem, fonte: 'lido' }],
    equipamentos: [{ tipo: 'bomba', rotulo: 'Bomba', quantidade: { valor: 2 }, atributos: { potencia_cv: { valor: 5 } } }],
    naoLidos: [{ bloco: 'b9', texto: 'Frase que o leitor não conhece' }], pendencias: [{ texto: 'Icc presumido no ponto' }] },
};
const resumo = {
  meta: { titulo: 'QF-T — Teste', tag: 'QF-T' }, geral: { texto: '3P 63 A' }, demanda: { iProj: 40, faseMax: 'L1' },
  comando: { reles: [{ tag: 'KB1' }], fonte: { A: 2.5 } }, funcional: [{ nome: 'cenário', ok: true }],
  decisoes: [{ titulo: 'Disjuntor geral', texto: 'Demanda 40 A' }], pontos: [{ id: 'p1', texto: 'Ponto de teste', sugestao: { decisao: 'd', valor: 'SIM', texto: 'Sugestão de teste' } }],
  pendencias: [{ n: 1, texto: 'Pendência de teste' }], excecoes: [{ letra: 'A', texto: 'Exceção de teste' }],
  interacao: { controles: [{ id: 'S1', tipo: 'seletora', rotulo: 'BOMBA B1', estados: ['MAN', '0', 'AUT'], inicial: '0' }] },
  precos: { subtotal: 100, total: 110, aCotar: 1 }, materiais: [{ item: 1, tag: 'Q1', descricao: 'Disjuntor', quantidade: 1, unidade: 'pç', preco: null, origem: 'A cotar', chave: 'disjuntor' }],
};

test('lê a especificação, mostra a frase de origem e gera o projeto', async () => {
  getPerfisEspecificacao.mockResolvedValue({ data: { perfis: [{ chave: 'painel_pressurizacao', nome: 'Painel de pressurização' }, { chave: 'quadro_forca_comando', nome: 'Quadro de força' }] } });
  lerEspecificacao.mockResolvedValue({ data: lida });
  gerarProjetoEspecificacao.mockResolvedValue({ data: { id: 7, resumo } });
  await act(async () => { raiz.render(<ProjetoDaEspecificacao />); });
  const opcoes = [...caixa.querySelectorAll('select option')].map(o => o.textContent);
  expect(opcoes.indexOf('Painel de pressurização')).toBeGreaterThan(opcoes.indexOf('Automático (pelo texto)'));
  expect(opcoes.indexOf('Quadro de força')).toBeGreaterThan(opcoes.indexOf('Painel de pressurização'));
  const arquivo = new File(['x'], 'espec.txt', { type: 'text/plain' });
  const input = caixa.querySelector('input[type=file]');
  Object.defineProperty(input, 'files', { value: [arquivo] });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
  const botao = (texto) => [...caixa.querySelectorAll('button')].find(b => b.textContent.includes(texto));
  await act(async () => { botao('Ler especificação').click(); });
  expect(lerEspecificacao).toHaveBeenCalledWith(arquivo, '');
  expect(caixa.textContent).toContain('Alimentação | 380/220 V');
  expect(caixa.textContent).toContain('Frase que o leitor não conhece');
  await act(async () => { botao('Gerar projeto').click(); });
  expect(gerarProjetoEspecificacao).toHaveBeenCalled();
  expect(caixa.textContent).toContain('Ponto de teste');
  expect(caixa.textContent).toContain('Pendência de teste');
  expect(caixa.textContent).toContain('Exceção de teste');
  expect(caixa.textContent).toContain('a cotar');
  // alternativa econômica e equivalência digitadas vão para o aprendizado junto com o preço
  const digitar = (el, v) => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  aprovarProjetoEspecificacao.mockResolvedValue({ data: { aprendidos: 1 } });
  atualizarProjetoEspecificacao.mockResolvedValue({ data: { resumo } });
  await act(async () => {
    digitar(caixa.querySelector('input[type=number][min="0"]'), '120');
    digitar(caixa.querySelector('input[aria-label="Alternativa econômica"]'), 'Linha econômica X');
    digitar(caixa.querySelector('input[aria-label="Preço da alternativa"]'), '80');
    digitar(caixa.querySelector('input[aria-label="Equivalência"]'), 'marca A → marca B');
  });
  await act(async () => { botao('Aprovar e ensinar').click(); });
  const corpo = aprovarProjetoEspecificacao.mock.calls[0][1];
  expect(corpo.precos[0]).toMatchObject({ chave: 'disjuntor', preco: 120, alternativa: { referencia: 'Linha econômica X', preco: 80 }, equivale: 'marca A → marca B' });
});

// 14/11/2026: projeto gerado pela SKILL da disciplina (ex.: central de incêndio) — indicadores, documentos da
// própria skill e a matriz de causa e efeito; sem a simulação da escada de relés
test('projeto pela skill da disciplina: indicadores, documentos da skill e matriz de causa e efeito', async () => {
  getPerfisEspecificacao.mockResolvedValue({ data: { perfis: [{ chave: 'central_incendio', nome: 'Central de incêndio' }] } });
  lerEspecificacao.mockResolvedValue({ data: { ...lida, perfil: 'central_incendio' } });
  const resumoSkill = {
    tipo: 'skill', disciplina: 'incendio', meta: { titulo: 'CDI-T — Central de teste', tag: 'CDI-T' },
    indicadores: [{ rotulo: 'Central', valor: '2 laço(s)' }, { rotulo: 'Bateria (Anexo B)', valor: '7 Ah', detalhe: '24 h + 15 min' }],
    documentos: [{ tipo: 'memorial', rotulo: 'Memorial descritivo', ext: 'docx' }, { tipo: 'precos_especificacao', rotulo: 'Pesquisa de preços do material (projeto pela especificação)', ext: 'xlsx' }],
    causaEfeito: [{ id: 'pressurizacao', causa: 'Alarme de incêndio', efeitos: ['Partida imediata da pressurização'], modulo: 'comando', modulos: 1, norma: 'IT 13' }],
    decisoes: [{ titulo: 'Detectores de fumaça', texto: '86 un — lido da especificação' }], premissas: [], pontos: [], pendencias: [{ n: 1, texto: 'Pendência da central' }], excecoes: [], avisos: [],
    precos: { subtotal: 0, total: 0, aCotar: 1 }, materiais: [{ item: 1, tag: 'CEN', descricao: 'Central endereçável com 2 laços', quantidade: 1, unidade: 'un', preco: null, origem: 'A cotar', chave: 'cen' }],
  };
  gerarProjetoEspecificacao.mockResolvedValue({ data: { id: 9, resumo: resumoSkill } });
  await act(async () => { raiz.render(<ProjetoDaEspecificacao />); });
  const input = caixa.querySelector('input[type=file]');
  Object.defineProperty(input, 'files', { value: [new File(['x'], 'cdi.txt', { type: 'text/plain' })] });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); });
  const botao = (texto) => [...caixa.querySelectorAll('button')].find(b => b.textContent.includes(texto));
  await act(async () => { botao('Ler especificação').click(); });
  await act(async () => { botao('Gerar projeto').click(); });
  expect(caixa.textContent).toContain('2 laço(s)');
  expect(caixa.textContent).toContain('Matriz de causa e efeito');
  expect(caixa.textContent).toContain('Partida imediata da pressurização');
  expect(botao('Memorial descritivo')).toBeTruthy();
  expect(botao('Pesquisa de preços do material')).toBeTruthy();
  expect(botao('Anteprojeto FL01')).toBeFalsy();
  expect(caixa.textContent).not.toContain('Simulação do comando');
});
