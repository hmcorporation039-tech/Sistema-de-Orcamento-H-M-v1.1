import { act } from 'react';
import { createRoot } from 'react-dom/client';
import MapaCad from './MapaCad';
import { getMapaCad, salvarMapaCad, editarMapaCad, reprocessarMapaCad, confirmarBlocoMapaCad } from '../../services/api';

// Mapa do CAD (03/11/2026): planta com o desenho de fundo, pontos coloridos pela situação, ficha para conferir na
// própria planta, filtro da tabela e "Ir para" quando a folha tem várias plantas. Dados SINTÉTICOS.
jest.mock('../../services/api', () => ({ getMapaCad: jest.fn(), salvarMapaCad: jest.fn(), editarMapaCad: jest.fn(), reprocessarMapaCad: jest.fn(), confirmarBlocoMapaCad: jest.fn(), abrirModelo3d: jest.fn(), urlModelo3d: (u) => u, exportarBibliotecaBlocos: jest.fn(), importarBibliotecaBlocos: jest.fn() }));
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }));
jest.mock('react-hot-toast', () => { const t = jest.fn(); t.success = jest.fn(); t.error = jest.fn(); return { __esModule: true, default: t }; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  [getMapaCad, salvarMapaCad, editarMapaCad, reprocessarMapaCad].forEach(f => f.mockReset());
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const simbolos = [
  { idx: 0, layer: 'EL-TOMADAS', medida: [0.3, 0.26], quantidade: 3, contados: 3, simbolo: 'HM-ELE-TOMADA-BAIXA', origem: 'regra', confirmado: false },
  { idx: 1, layer: 'EL-SIMBOLOS', medida: [0.4, 0.4], quantidade: 2, contados: 2, simbolo: '?', origem: 'nao_reconhecido', confirmado: false },
  { idx: 2, layer: 'EL-QUADRO', medida: [0.6, 0.3], quantidade: 1, contados: 1, simbolo: 'HM-ELE-QUADRO', origem: 'confirmado', confirmado: true },
];
// duas plantas a 300 m uma da outra
const pontos = [[0, 1, 1], [0, 2, 1], [0, 3, 1], [1, 4, 3], [1, 301, 3], [2, 302, 1]];
const resposta = (extra = {}) => ({ data: {
  disponivel: true, semMapa: false, semFundo: false,
  tipos: [{ simbolo: 'HM-ELE-TOMADA-BAIXA', nome: 'Tomada baixa', disciplina: 'eletrica' }, { simbolo: 'HM-ELE-QUADRO', nome: 'Quadro', disciplina: 'eletrica' }],
  arquivos: [{
    arquivo: 'planta.dxf', valeParaOrcamento: true, simbolos, resumo: { linhas: 3, conferidas: 1, pendentes: 2, pontosPendentes: 5, naoReconhecidas: 1 },
    planta: { caixa: [0, 0, 310, 5], extensao: [0, 0, 310, 5], salas: [{ nome: 'SALA', poligono: [[0, 0], [6, 0], [6, 4], [0, 4]] }], pontos,
      fundo: { layers: ['A-PAREDE'], linhas: [[0, 0, 0, 6, 0, 6, 4, 0, 4, 0, 0]], cortados: 0 } },
  }],
  ...extra,
} });
const montar = async (r) => {
  getMapaCad.mockResolvedValue(r);
  await act(async () => { raiz.render(<MapaCad analiseId={7} estiloCartao={{}} estiloTitulo={{}} />); });
};

test('planta com o desenho de fundo, ambientes e pontos coloridos pela situação', async () => {
  await montar(resposta());
  const svg = caixa.querySelector('[data-testid="planta-mapa-cad"] svg');
  expect(svg).not.toBeNull();
  expect(svg.querySelectorAll('path[stroke="#4a525c"]')).toHaveLength(1); // fundo
  expect(svg.querySelectorAll('path[stroke="#36506e"]')).toHaveLength(1); // sala
  // na vista geral a sala de 6 m é pequena demais para o nome (não polui); com zoom na área, aparece
  expect(svg.textContent).not.toContain('SALA');
  const cores = [...svg.querySelectorAll('circle')].map(c => c.getAttribute('fill'));
  expect(cores.filter(c => c === '#d4a72c')).toHaveLength(3); // tomadas: reconhecidas, falta conferir
  expect(cores.filter(c => c === '#e5534b')).toHaveLength(2); // não reconhecidas
  expect(cores.filter(c => c === '#57ab5a')).toHaveLength(1); // quadro conferido
  expect(caixa.textContent).toContain('Não reconhecido — escolha o tipo (2)');
  // duas plantas longe uma da outra: atalho "Ir para"
  const ir = caixa.querySelector('[data-testid="ir-para-area"]');
  expect([...ir.options].map(o => o.textContent)).toEqual(['Ir para…', 'Área 1 — 4 ponto(s)', 'Área 2 — 2 ponto(s)']);
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  await act(async () => { setter.call(ir, '0'); ir.dispatchEvent(new Event('change', { bubbles: true })); });
  expect(caixa.querySelector('[data-testid="planta-mapa-cad"] svg').textContent).toContain('SALA');
});

test('clique na linha da tabela abre a ficha na planta e confirma dali', async () => {
  await montar(resposta());
  salvarMapaCad.mockResolvedValue({ data: resposta().data });
  expect(caixa.querySelector('[data-testid="ficha-linha-mapa"]')).toBeNull();
  await act(async () => { caixa.querySelector('[data-testid="linha-mapa-0"] td').click(); });
  const ficha = caixa.querySelector('[data-testid="ficha-linha-mapa"]');
  expect(ficha.textContent).toContain('Layer EL-TOMADAS');
  expect(ficha.textContent).toContain('3 ponto(s) na planta');
  // os pontos da linha escolhida ganham o anel de destaque
  expect([...caixa.querySelectorAll('svg circle')].filter(c => c.getAttribute('stroke') === '#f0c63c')).toHaveLength(3);
  await act(async () => { [...ficha.querySelectorAll('button')].find(b => b.textContent === 'Confirmar').click(); });
  expect(salvarMapaCad).toHaveBeenCalledWith(7, 'planta.dxf', [{ idx: 0, simbolo: 'HM-ELE-TOMADA-BAIXA', altura_m: null, confirmado: true }]);
  // clicar num campo da linha não troca a escolha
  await act(async () => { caixa.querySelector('[data-testid="linha-mapa-1"] select').click(); });
  expect(caixa.querySelector('[data-testid="ficha-linha-mapa"]').textContent).toContain('EL-TOMADAS');
});

test('filtro da tabela pela situação', async () => {
  await montar(resposta());
  const filtro = (rotulo) => [...caixa.querySelectorAll('button')].find(b => b.textContent.startsWith(rotulo));
  expect(filtro('Não reconhecidas').textContent).toBe('Não reconhecidas (1)');
  await act(async () => { filtro('Não reconhecidas').click(); });
  expect([...caixa.querySelectorAll('tr[data-mapa-linha]')].map(tr => tr.dataset.mapaLinha)).toEqual(['planta.dxf|1']);
  await act(async () => { filtro('Conferidas').click(); });
  expect([...caixa.querySelectorAll('tr[data-mapa-linha]')].map(tr => tr.dataset.mapaLinha)).toEqual(['planta.dxf|2']);
});

test('mapa antigo, sem o desenho de fundo: aviso e "Ler o DWG de novo"', async () => {
  const r = resposta({ semFundo: true });
  r.data.arquivos[0].simbolos = simbolos.map(s => ({ ...s, confirmado: false, origem: 'regra' }));
  r.data.arquivos[0].resumo = { ...r.data.arquivos[0].resumo, conferidas: 0 };
  delete r.data.arquivos[0].planta.fundo;
  await montar(r);
  expect(caixa.textContent).toContain('foi lida antes do desenho de fundo');
  reprocessarMapaCad.mockResolvedValue({ data: { id: 99 } });
  await act(async () => { caixa.querySelector('[data-testid="ler-de-novo"]').click(); });
  expect(reprocessarMapaCad).toHaveBeenCalledWith(7, { incluirDisciplinas: true });
});

// ── 2.30: componentes da biblioteca inseridos e retirados na planta ──
const componentes = [
  { simbolo: 'HM-INC-DETECTOR-FUMACA', nome: 'Detector pontual de fumaça', disciplina: 'incendio', montagem: 'teto', altura_m: null, svg: { d: 'M-0.15 0a0.15 0.15 0 1 0 0.3 0a0.15 0.15 0 1 0 -0.3 0', textos: [{ x: -0.05, y: 0.06, h: 0.12, t: 'F' }], raio: 0.15 } },
  { simbolo: 'HM-ELE-TOMADA-BAIXA', nome: 'Tomada baixa 2P+T', disciplina: 'eletrica', montagem: 'parede', altura_m: 0.3, svg: { d: 'M-0.18 0.108L0.18 0.108L0 -0.162L-0.18 0.108', textos: [], raio: 0.18 } },
];
const clicarNaPlanta = async (x, y) => {
  const svg = caixa.querySelector('[data-testid="planta-mapa-cad"] svg');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 900, height: 480, right: 900, bottom: 480 });
  await act(async () => {
    svg.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, button: 0 }));
    svg.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y, button: 0 }));
  });
};

test('Inserir: escolhe o componente da biblioteca e clica na planta (posição do desenho, em metros)', async () => {
  await montar(resposta({ componentes }));
  editarMapaCad.mockResolvedValue({ data: resposta({ componentes }).data });
  await act(async () => { caixa.querySelector('[data-testid="modo-inserir"]').click(); });
  const sel = caixa.querySelector('[data-testid="componente-a-inserir"]');
  // paleta por disciplina em ordem alfabética: Elétrica antes de Incêndio
  expect([...sel.querySelectorAll('optgroup')].map(g => g.label)).toEqual(['Elétrica', 'Incêndio']);
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  await act(async () => { setter.call(sel, 'HM-INC-DETECTOR-FUMACA'); sel.dispatchEvent(new Event('change', { bubbles: true })); });
  // centro do quadro = centro da caixa da planta (155; 2,5)
  await clicarNaPlanta(450, 240);
  expect(editarMapaCad).toHaveBeenCalledTimes(1);
  const [id, corpo] = editarMapaCad.mock.calls[0];
  expect(id).toBe(7);
  expect(corpo.arquivo).toBe('planta.dxf');
  expect(corpo.adicionar[0].simbolo).toBe('HM-INC-DETECTOR-FUMACA');
  expect(corpo.adicionar[0].x).toBeCloseTo(155, 1);
  expect(corpo.adicionar[0].y).toBeCloseTo(2.5, 1);
});

test('Retirar: clique no ponto manda a posição dele; inseridos e retirados aparecem na planta e no resumo', async () => {
  const r = resposta({ componentes });
  r.data.arquivos[0].edicoes = {
    adicionados: [{ id: 'a0123456789', simbolo: 'HM-INC-DETECTOR-FUMACA', x: 100, y: 3, em: '2026-11-03T10:00:00Z' }],
    removidos: [{ id: 'r0123456789', x: 301, y: 3, em: '2026-11-03T11:00:00Z' }],
  };
  r.data.arquivos[0].resumo = { ...r.data.arquivos[0].resumo, inseridos: 1, retirados: 1 };
  await montar(r);
  expect(caixa.querySelectorAll('[data-testid="componente-inserido"]')).toHaveLength(1);
  expect(caixa.querySelectorAll('[data-testid="ponto-retirado"]')).toHaveLength(1);
  const resumo = caixa.querySelector('[data-testid="edicoes-do-arquivo"]').textContent;
  expect(resumo).toContain('1 × Detector pontual de fumaça');
  expect(resumo).toContain('1 ponto(s) retirado(s)');
  expect(caixa.querySelector('[data-testid="aviso-reprocessar"]').textContent).toContain('ainda não estão no orçamento');
  editarMapaCad.mockResolvedValue({ data: r.data });
  // desfazer a última: a mais recente é a retirada
  await act(async () => { caixa.querySelector('[data-testid="desfazer-ultima-edicao"]').click(); });
  expect(editarMapaCad).toHaveBeenLastCalledWith(7, { arquivo: 'planta.dxf', desfazer: ['r0123456789'] });
  // modo Retirar: o ponto (1; 1) da linha 0 fica a ~51 px da esquerda e ~244 px do topo
  await act(async () => { caixa.querySelector('[data-testid="modo-retirar"]').click(); });
  await clicarNaPlanta(50.8, 243.9);
  expect(editarMapaCad).toHaveBeenLastCalledWith(7, { arquivo: 'planta.dxf', remover: [{ x: 1, y: 1, simbolo: 'HM-ELE-TOMADA-BAIXA', linha: 0 }] });
});

// revisão de 06/11/2026: o bloco nomeado não identificado (ou só aprendido de outra prancha) se confirma no mapa, na disciplina
test('confirmar bloco: descrição e disciplina vão ao servidor e a linha fica confirmada; "não é ponto" aprendido aparece como origem', async () => {
  const r = resposta({ disciplinas: [{ chave: 'cftv', nome: 'CFTV' }, { chave: 'eletrica', nome: 'Elétrica' }] });
  r.data.arquivos[0].blocos = [{ bloco: 'ZQX-77', layer: '0', quantidade: 3, situacao: 'nao_identificado' }];
  r.data.arquivos[0].simbolos = [...simbolos, { idx: 3, layer: 'EL-SETA', medida: [0.12, 0.05], quantidade: 9, contados: 0, simbolo: '?', origem: 'nao_ponto', confirmado: false }];
  await montar(r);
  expect(caixa.textContent).toContain('"não é ponto" aprendido — conferir');
  const linha = caixa.querySelector('[data-testid="bloco-ZQX-77"]');
  expect(linha.textContent).toContain('não identificado');
  const entrada = linha.querySelector('input');
  const seletor = linha.querySelector('select');
  const mudar = (el, valor) => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
    setter.call(el, valor);
    el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };
  await act(async () => { mudar(entrada, 'Tomada baixa 2P+T a 30 cm'); });
  await act(async () => { mudar(seletor, 'eletrica'); });
  confirmarBlocoMapaCad.mockResolvedValue({ data: { bloco: { nome: 'ZQX-77', origem: 'usuario' } } });
  await act(async () => { caixa.querySelector('[data-testid="confirmar-bloco-ZQX-77"]').click(); });
  expect(confirmarBlocoMapaCad).toHaveBeenCalledWith(7, { arquivo: 'planta.dxf', bloco: 'ZQX-77', descricao: 'Tomada baixa 2P+T a 30 cm', disciplina: 'eletrica' });
  expect(caixa.querySelector('[data-testid="bloco-ZQX-77"]').textContent).toContain('confirmado: Tomada baixa 2P+T a 30 cm (Elétrica)');
});
