import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ModalOportunidades, { ModalCompararMaterial } from './ComparativoFornecedores';
import { getCotacoesMaterial, getOportunidadesCotacao, renomearFornecedorCotacao } from '../services/api';

// Comparativo de fornecedores: modal por material (menor preço, outra unidade, aviso de confira) e o painel de
// oportunidades (ranking, vazio, abrir o material). A tela só mostra o que o servidor calculou.
jest.mock('../services/api', () => ({ getCotacoesMaterial: jest.fn(), getOportunidadesCotacao: jest.fn(), renomearFornecedorCotacao: jest.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  getCotacoesMaterial.mockReset();
  getOportunidadesCotacao.mockReset();
  renomearFornecedorCotacao.mockReset().mockResolvedValue({ data: {} });
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const forn = (extra) => ({ cnpj: '33578308000178', nome: 'DF ATACADISTA', preco: 80, unidade: 'm', data: '2026-10-20', dias: 13, comparavel: true, menor: true, acima_do_menor_pct: 0, ...extra });
const comparacao = (extra) => ({ data: { material: { id: 7 }, validade_dias: 90, antigas: 0, custo_catalogo: 100, catalogo_acima_pct: 25, suspeito: false,
  fornecedores: [forn({}), forn({ cnpj: '07607904000200', nome: 'SOL ATACADISTA', preco: 90, menor: false, acima_do_menor_pct: 12.5 })], ...extra } });
const material = { id: 7, descricao: 'CABO FLEX 2,5MM', unidade: 'm' };
const abrirMaterial = async () => { await act(async () => { raiz.render(<ModalCompararMaterial material={material} onFechar={() => {}} />); }); };
// o Modal vai para o body; os testes olham o documento inteiro
const q = (sel) => document.querySelector(sel);
const qa = (sel) => [...document.querySelectorAll(sel)];

test('material: mostra o menor preço, a diferença do outro e o catálogo acima', async () => {
  getCotacoesMaterial.mockResolvedValue(comparacao());
  await abrirMaterial();
  expect(getCotacoesMaterial).toHaveBeenCalledWith(7);
  const linhas = qa('[data-testid="comparar-linha"]');
  expect(linhas).toHaveLength(2);
  expect(linhas[0].textContent).toContain('DF ATACADISTA');
  expect(linhas[0].textContent).toContain('menor preço');
  expect(linhas[1].textContent).toContain('+12,5 %');
  expect(q('[data-testid="comparar-resumo"]').textContent).toContain('25 % acima do menor preço');
});

test('material: preços 5× distantes pedem conferência em vez de dizer que o catálogo está caro', async () => {
  getCotacoesMaterial.mockResolvedValue(comparacao({ suspeito: true, catalogo_acima_pct: 400 }));
  await abrirMaterial();
  expect(q('[data-testid="comparar-suspeito"]')).not.toBeNull();
  expect(q('[data-testid="comparar-resumo"]').textContent).not.toContain('acima do menor preço');
});

test('material: cotação em outra unidade aparece marcada e fora da comparação', async () => {
  getCotacoesMaterial.mockResolvedValue(comparacao({ fornecedores: [forn({}), forn({ cnpj: '11953410000173', nome: 'ECO', preco: 800, unidade: 'rl', comparavel: false, menor: false, acima_do_menor_pct: null })] }));
  await abrirMaterial();
  expect(qa('[data-testid="comparar-linha"]')[1].textContent).toContain('outra unidade');
});

test('material: sem cotação explica que as próximas leituras entram sozinhas', async () => {
  getCotacoesMaterial.mockResolvedValue(comparacao({ fornecedores: [], antigas: 2, catalogo_acima_pct: null }));
  await abrirMaterial();
  const texto = q('[data-testid="comparar-vazio"]').textContent;
  expect(texto).toContain('Nenhuma cotação');
  expect(texto).toContain('há 2 mais antigas');
});

test('material: corrigir o nome do fornecedor salva e recarrega', async () => {
  getCotacoesMaterial.mockResolvedValue(comparacao());
  await abrirMaterial();
  act(() => { q('button[aria-label="Corrigir o nome de DF ATACADISTA"]').click(); });
  const campo = q('input[aria-label="Nome do fornecedor"]');
  const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(campo), 'value').set;
  act(() => { set.call(campo, 'DF Atacadista Ltda'); campo.dispatchEvent(new Event('input', { bubbles: true })); });
  await act(async () => { q('button[aria-label="Salvar nome"]').click(); });
  expect(renomearFornecedorCotacao).toHaveBeenCalledWith('33578308000178', 'DF Atacadista Ltda');
  expect(getCotacoesMaterial).toHaveBeenCalledTimes(2);
});

test('material: erro ao carregar avisa em vez de ficar em branco', async () => {
  getCotacoesMaterial.mockRejectedValue(new Error('x'));
  await abrirMaterial();
  expect(document.body.textContent).toContain('Não foi possível carregar');
});

const oport = (extra) => ({ data: { resumo: { materiais_cotados: 124, materiais_com_varios_fornecedores: 6, fornecedores: 4, oportunidades: 1, validade_dias: 90 },
  ranking: [{ cnpj: '33578308000178', nome: 'DF ATACADISTA', itens_comparados: 5, vezes_menor: 4, pct_menor: 80 }],
  itens: [{ material_id: 7, descricao: 'CABO FLEX 2,5MM', unidade: 'm', custo_catalogo: 100, menor: { preco: 80, nome: 'DF ATACADISTA' }, motivo: 'catalogo_acima', catalogo_acima_pct: 25, diferenca_entre_fornecedores_pct: 12.5, suspeito: false }],
  ...extra } });

test('oportunidades: resumo, ranking e linha clicável que abre o material', async () => {
  getOportunidadesCotacao.mockResolvedValue(oport());
  const abrir = jest.fn();
  await act(async () => { raiz.render(<ModalOportunidades onFechar={() => {}} onAbrirMaterial={abrir} />); });
  expect(q('[data-testid="oport-resumo"]').textContent).toContain('124 materiais cotados');
  expect(q('[data-testid="oport-ranking"]').textContent).toContain('menor preço em 4 de 5');
  const linha = q('[data-testid="oport-linha"]');
  expect(linha.textContent).toContain('catálogo 25 % acima');
  act(() => { linha.click(); });
  expect(abrir).toHaveBeenCalledWith({ id: 7, descricao: 'CABO FLEX 2,5MM', unidade: 'm' });
});

test('oportunidades: sem diferença relevante diz o que fazer aparecer', async () => {
  getOportunidadesCotacao.mockResolvedValue(oport({ itens: [], ranking: [] }));
  await act(async () => { raiz.render(<ModalOportunidades onFechar={() => {}} onAbrirMaterial={() => {}} />); });
  expect(q('[data-testid="oport-vazio"]')).not.toBeNull();
  expect(q('[data-testid="oport-ranking"]')).toBeNull();
});
