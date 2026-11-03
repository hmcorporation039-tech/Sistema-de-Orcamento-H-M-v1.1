import { act } from 'react';
import { createRoot } from 'react-dom/client';
import NotasAReceber from './NotasAReceber';
import toast from 'react-hot-toast';
import { getNotasAReceber, ligarSugeridasNotas, ligarPixNaNota, darBaixaNota, levarObraDasNotas } from '../services/api';

// Cartão "Notas a receber": resumo, ligar o Pix sugerido (um ou todos os de confiança alta) e dar baixa com observação.
jest.mock('../services/api', () => ({ getNotasAReceber: jest.fn(), ligarSugeridasNotas: jest.fn(), ligarPixNaNota: jest.fn(), darBaixaNota: jest.fn(), levarObraDasNotas: jest.fn() }));
// o aviso de obra divergente sai num toast simples: o mock deixa conferir o texto
jest.mock('react-hot-toast', () => { const t = jest.fn(); t.success = jest.fn(); t.error = jest.fn(); return { __esModule: true, default: t }; });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  [getNotasAReceber, ligarSugeridasNotas, ligarPixNaNota, darBaixaNota, levarObraDasNotas, toast, toast.success, toast.error].forEach(f => f.mockReset());
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const mov = { id: 10, nome: 'Hospital Santa Lucia S A', valor: 1000, data: '2026-10-05' };
const item = (extra) => ({ id: 1, numero: '28', data_emissao: '2026-10-01', tomador_nome: 'HOSPITAL SANTA LUCIA S/A', proposta_numero: null, valor_liquido: 1000, recebido: 0,
  saldo: 1000, dias: 40, atrasada: true, estado: 'aberta', faixa: 'ate60', sugestao: { confianca: 'alta', alternativas: 0, movimento: mov }, ...extra });
const resposta = (itens, extra = {}) => ({ data: { prazo_dias: 30, itens, resumo: { em_aberto: itens.filter(i => i.estado !== 'sem_historico').length, saldo_total: 1000, atrasadas: 1, saldo_atrasado: 1000,
  sem_historico: itens.filter(i => i.estado === 'sem_historico').length, valor_sem_historico: 0, sugestoes_altas: itens.filter(i => i.sugestao?.confianca === 'alta').length }, ...extra } });
const abrir = async () => { await act(async () => { raiz.render(<NotasAReceber />); }); };
const botao = (texto) => [...caixa.querySelectorAll('button')].find(b => b.textContent.includes(texto));
const digitar = (el, valor) => {
  const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
  act(() => { set.call(el, valor); el.dispatchEvent(new Event('input', { bubbles: true })); });
};

test('sem nota em aberto, ou com erro, o cartão nem aparece', async () => {
  getNotasAReceber.mockResolvedValue(resposta([]));
  await abrir();
  expect(caixa.querySelector('[data-testid="notas-a-receber"]')).toBeNull();
  getNotasAReceber.mockRejectedValue(new Error('x'));
  await abrir();
  expect(caixa.querySelector('[data-testid="notas-a-receber"]')).toBeNull();
});

test('mostra o resumo, a espera e o Pix sugerido', async () => {
  getNotasAReceber.mockResolvedValue(resposta([item({})]));
  await abrir();
  expect(caixa.querySelector('[data-testid="areceber-resumo"]').textContent).toContain('1 nota');
  expect(caixa.querySelector('[data-testid="areceber-resumo"]').textContent).toContain('passou de 30 dias');
  const linha = caixa.querySelector('[data-testid="areceber-linha"]');
  expect(linha.textContent).toContain('Nota 28');
  expect(linha.textContent).toContain('esperando há 40 dias');
  expect(caixa.querySelector('[data-testid="areceber-sugestao"]').textContent).toContain('Hospital Santa Lucia S A');
});

test('ligar o Pix sugerido chama a rota da nota e atualiza a lista', async () => {
  getNotasAReceber.mockResolvedValue(resposta([item({})]));
  ligarPixNaNota.mockResolvedValue(resposta([item({ id: 2, numero: '29', sugestao: null })]));
  await abrir();
  await act(async () => { botao('Ligar Pix').click(); });
  expect(ligarPixNaNota).toHaveBeenCalledWith(1, 10);
  expect(caixa.querySelector('[data-testid="areceber-linha"]').textContent).toContain('Nota 29');
});

test('sugestão média pede para conferir o nome', async () => {
  getNotasAReceber.mockResolvedValue(resposta([item({ sugestao: { confianca: 'media', alternativas: 0, movimento: mov } })]));
  await abrir();
  expect(botao('Ligar Pix').textContent).toContain('confira o nome');
  expect(botao('Ligar 1 sugerido')).toBeUndefined();   // só a de confiança alta entra no lote
});

test('ligar todos os sugeridos usa a rota em lote', async () => {
  getNotasAReceber.mockResolvedValue(resposta([item({}), item({ id: 2, numero: '29' })]));
  ligarSugeridasNotas.mockResolvedValue({ data: { ...resposta([]).data, ligadas: 2 } });
  await abrir();
  await act(async () => { botao('Ligar 2 sugeridos').click(); });
  expect(ligarSugeridasNotas).toHaveBeenCalledTimes(1);
});

test('ambígua não oferece ligar e explica onde escolher', async () => {
  getNotasAReceber.mockResolvedValue(resposta([item({ sugestao: { confianca: 'ambigua', alternativas: 2, movimento: null } })]));
  await abrir();
  expect(botao('Ligar Pix')).toBeUndefined();
  expect(caixa.textContent).toContain('mais de uma combinação');
});

test('"Já recebi" exige a observação antes de dar baixa', async () => {
  getNotasAReceber.mockResolvedValue(resposta([item({ sugestao: null })]));
  darBaixaNota.mockResolvedValue(resposta([]));
  await abrir();
  act(() => { botao('Já recebi').click(); });
  expect(botao('Dar baixa').disabled).toBe(true);
  digitar(caixa.querySelector('input[aria-label="Como foi paga"]'), 'TED em 10/2025');
  expect(botao('Dar baixa').disabled).toBe(false);
  await act(async () => { botao('Dar baixa').click(); });
  expect(darBaixaNota).toHaveBeenCalledWith(1, 'TED em 10/2025');
});

test('notas antigas ficam recolhidas e não contam como atraso', async () => {
  getNotasAReceber.mockResolvedValue(resposta([item({}), item({ id: 5, numero: '3', estado: 'sem_historico', dias: 400, atrasada: false, sugestao: null })]));
  await abrir();
  expect(caixa.querySelectorAll('[data-testid="areceber-linha"]')).toHaveLength(1);
  act(() => { botao('1 nota antiga').click(); });
  expect(caixa.querySelectorAll('[data-testid="areceber-linha"]')).toHaveLength(2);
  expect(caixa.textContent).toContain('antes do primeiro Pix');
});

test('ligar o Pix que leva a obra da nota avisa; obra divergente vira aviso', async () => {
  getNotasAReceber.mockResolvedValue(resposta([item({})]));
  // a lista nova ainda tem outra nota com Pix sugerido, para o segundo clique
  ligarPixNaNota.mockResolvedValue(resposta([item({ id: 2, numero: '29' })], { obra_preenchida: true, aviso: null }));
  await abrir();
  await act(async () => { botao('Ligar Pix').click(); });
  expect(toast.success).toHaveBeenCalledWith('Pix ligado à nota e à obra da proposta.');
  expect(toast).not.toHaveBeenCalled();
  ligarPixNaNota.mockResolvedValue(resposta([], { obra_preenchida: false, aviso: 'O Pix já está na obra OB-7 e a proposta da nota é da obra OB-5.' }));
  await act(async () => { botao('Ligar Pix').click(); });
  expect(ligarPixNaNota).toHaveBeenLastCalledWith(2, 10);
  expect(toast.success).toHaveBeenLastCalledWith('Pix ligado à nota.');
  expect(toast).toHaveBeenCalledWith(expect.stringContaining('OB-7'), expect.anything());
});

test('Pix já ligados a nota de obra, mas sem obra: botão leva a obra das notas (mesmo sem nota em aberto)', async () => {
  getNotasAReceber.mockResolvedValue(resposta([], { obra_pela_nota: { n: 3, valor: 4500 } }));
  levarObraDasNotas.mockResolvedValue(resposta([], { preenchidos: 3, obras: 2, obra_pela_nota: { n: 0, valor: 0 } }));
  await abrir();
  expect(caixa.querySelector('[data-testid="notas-a-receber"]')).not.toBeNull();
  await act(async () => { botao('Levar a obra das notas para 3 Pix').click(); });
  expect(levarObraDasNotas).toHaveBeenCalledTimes(1);
  expect(toast.success).toHaveBeenCalledWith('3 Pix ganharam a obra da nota (2 obras).');
  expect(caixa.querySelector('[data-testid="notas-a-receber"]')).toBeNull();   // nada mais a mostrar
});
