import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OQueOSistemaSabe from './OQueOSistemaSabe';
import { getAprendizado, getAprendizadoOrcamento } from '../../services/api';
import { listarSugestoesAgentes, decidirSugestaoAgentes, conhecimentoDisciplinas, indicadoresAgentes } from '../../services/assistente';

// "O que o sistema sabe" por disciplina (2.49): uma tela só no lugar de "O que o sistema sabe" + "O que já sabe orçar",
// com a fila de aprovação (regras do projetista aprendidas das instruções) em cima. Dados SINTÉTICOS.
jest.mock('../../services/api', () => ({ getAprendizado: jest.fn(), getAprendizadoOrcamento: jest.fn(), getTreinoAcervo: jest.fn(), iniciarTreinoAcervo: jest.fn(), pararTreinoAcervo: jest.fn() }));
jest.mock('../../services/assistente', () => ({ listarSugestoesAgentes: jest.fn(), decidirSugestaoAgentes: jest.fn(), conhecimentoDisciplinas: jest.fn(), indicadoresAgentes: jest.fn() }));
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ usuario: { role: 'admin' } }) }));
jest.mock('react-hot-toast', () => { const t = jest.fn(); t.success = jest.fn(); t.error = jest.fn(); return { __esModule: true, default: t }; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  jest.clearAllMocks();
});
afterEach(() => { act(() => raiz.unmount()); caixa.remove(); });

const LEITURA = {
  materiais: { vinculos: 1, catalogo: 2 }, simbolos: {}, blocos: {}, notas: {},
  acervo: { lidos: 0, erros: 0, escritorios: 0, rodada: { rodando: false } },
  autonomia: { dias: 90, funcoes: [] }, precisao: { conferidas: 0, porOrigem: [], porDisciplina: [] }, fila: [],
  porDisciplinaDetalhe: [{ chave: 'cftv', nome: 'CFTV', simbolos: 8, blocos: 2, legendasPdf: 0, alturas: 1, naoPonto: 0, confirmados: 5, sugeridos: 6, total: 11 }],
};
const CONHECIMENTO = {
  nomes: { cftv: 'CFTV', incendio: 'Detecção e alarme de incêndio (NBR 17240)', cabeamento: 'Cabeamento estruturado — infraestrutura (NBR 14565)' },
  embutidas: { cftv: ['Câmera em acesso e circulação.'], incendio: ['Detector em todo ambiente fechado.'], cabeamento: ['2 tomadas por área de trabalho.'] },
  regras: [
    { id: 11, chave: 'cftv', texto: 'em espaço de reunião de pessoas, acrescentar 2 × câmera de cftv', detalhe: 'em 2 análises', situacao: 'aprovada', vezes: 2 },
    { id: 12, chave: 'cftv', texto: 'em depósito, não colocar câmera de cftv', detalhe: '', situacao: 'recusada', vezes: 3 },
  ],
  frases: [{ id: 21, chave: 'cftv', frase: 'camera speed', componente: 'Câmera de CFTV', situacao: 'aprovada', vezes: 1 }],
};
const PENDENTE = { id: 31, tipo: 'regra_projetista', disciplina: 'incendio', pergunta: 'Projetista de Detecção e alarme de incêndio: em depósito, não colocar detector pontual de fumaça', resposta: 'Você fez essa correção em 3 ambiente(s) de 2 análise(s).', vezes: 3, criado_em: '2026-11-20T12:00:00' };

async function abrir(rota = '/cadastros?aba=conhecimento') {
  getAprendizado.mockResolvedValue({ data: LEITURA });
  getAprendizadoOrcamento.mockResolvedValue({ data: [{ disciplina: 'cftv', nome: 'CFTV', propostas: 4, itensConhecidos: 12, servicosComPreco: 5, materiaisComPreco: 6, precosQueConfirmam: 3, autonomia: 'boa',
    itensQueAcompanham: [{ descricao: 'Patch cord 1,5 m', unidade: 'un', servico: false, ocorrencias: 4, porPonto: 2, preco: 25 }] }] });
  conhecimentoDisciplinas.mockResolvedValue({ data: CONHECIMENTO });
  listarSugestoesAgentes.mockResolvedValue({ data: [PENDENTE] });
  indicadoresAgentes.mockResolvedValue({ data: { porAgente: {}, roteador: [] } });
  await act(async () => { raiz.render(<MemoryRouter initialEntries={[rota]}><OQueOSistemaSabe /></MemoryRouter>); });
}

test('uma tela por disciplina: lê, projeta (com a regra aprendida), frases e o que já sabe orçar', async () => {
  await abrir();
  // abre na disciplina que mais sabe; chips em ordem alfabética, com o nome curto
  const chips = [...caixa.querySelectorAll('[role="tab"]')].map(b => b.textContent.replace(/●\d+/, ''));
  expect(chips).toEqual(['Cabeamento estruturado — infraestrutura', 'CFTV', 'Detecção e alarme de incêndio']);
  const cftv = caixa.querySelector('[data-testid="sabe-cftv"]');
  expect(cftv.querySelector('[data-testid="quadro-leitura"]').textContent).toContain('5 confirmado(s)');
  expect(cftv.querySelector('[data-testid="regras-aprendidas"]').textContent).toContain('acrescentar 2 × câmera');
  expect(cftv.querySelector('[data-testid="quadro-projeta"]').textContent).toContain('1 regra(s) recusada(s) ou desativada(s)');
  expect(cftv.querySelector('[data-testid="quadro-frases"]').textContent).toContain('“camera speed” → Câmera de CFTV');
  expect(cftv.querySelector('[data-testid="quadro-orcamento"]').textContent).toContain('Orça sozinho');
  expect(cftv.querySelector('[data-testid="quadro-orcamento"]').textContent).toContain('Patch cord 1,5 m');
  // a disciplina com regra esperando aprovação tem o marcador
  expect(caixa.querySelector('[data-testid="disciplina-incendio"]').textContent).toContain('●1');
  // detalhes (acerto, treino, uso de IA) recolhidos
  expect(caixa.querySelector('[data-testid="detalhes-aprendizado"]').open).toBe(false);
});

test('aprovar a regra do projetista e desativar uma aprovada', async () => {
  await abrir('/cadastros?aba=conhecimento&disciplina=incendio');
  expect(caixa.querySelector('[data-testid="sabe-incendio"]')).not.toBeNull();
  const fila = caixa.querySelector('[data-testid="aprovacao"]');
  expect(fila.textContent).toContain('Regra do projetista');
  expect(fila.textContent).toContain('não colocar detector');
  decidirSugestaoAgentes.mockResolvedValue({ data: {} });
  await act(async () => { fila.querySelector('[data-testid="aprovar"]').click(); });
  expect(decidirSugestaoAgentes).toHaveBeenCalledWith(31, { situacao: 'aprovada' });
  await act(async () => { caixa.querySelector('[data-testid="disciplina-cftv"]').click(); });
  await act(async () => { caixa.querySelector('[data-testid="desativar-regra"]').click(); });
  expect(decidirSugestaoAgentes).toHaveBeenLastCalledWith(11, { situacao: 'recusada' });
});
