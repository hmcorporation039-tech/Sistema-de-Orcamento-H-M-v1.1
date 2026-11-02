import { act } from 'react';
import { createRoot } from 'react-dom/client';
import VencimentosLaudos from './VencimentosLaudos';
import { getVencimentos, criarVencimento, renovarVencimento, criarPropostaRenovacao } from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Cartão "Vencimentos": laudos para todos; documentos da empresa (certidões, certificado A1) só para o administrador.
jest.mock('../services/api', () => ({ getVencimentos: jest.fn(), criarVencimento: jest.fn(), renovarVencimento: jest.fn(), encerrarVencimento: jest.fn(), criarPropostaRenovacao: jest.fn() }));
jest.mock('../hooks/useAuth', () => ({ useAuth: jest.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => {
  caixa = document.createElement('div');
  document.body.appendChild(caixa);
  raiz = createRoot(caixa);
  [getVencimentos, criarVencimento, renovarVencimento, criarPropostaRenovacao].forEach(f => f.mockReset());
  useAuth.mockReturnValue({ usuario: { role: 'admin' } });
});
afterEach(() => {
  act(() => raiz.unmount());
  caixa.remove();
});

const laudo = { id: 1, tipo: 'laudo', origem: null, descricao: 'SPDA — Aurora', cliente_nome: 'Condomínio Aurora', vence_em: '2026-12-01', nivel: 'atencao', rotulo: 'vence em 29 dias' };
const certidao = { id: 2, tipo: 'empresa', origem: null, descricao: 'Certidão FGTS (CRF)', vence_em: '2026-11-20', nivel: 'urgente', rotulo: 'vence em 18 dias' };
const certificado = { id: 3, tipo: 'empresa', origem: 'certificado_a1', descricao: 'Certificado digital A1 (NFS-e)', vence_em: '2026-12-30', nivel: 'atencao', rotulo: 'vence em 58 dias' };
const resposta = (itens) => ({ data: { itens, resumo: { total: itens.length, vencidos: 0, urgentes: 1, atencao: 1 } } });
const abrir = async () => { await act(async () => { raiz.render(<VencimentosLaudos />); }); };
const botao = (texto) => [...caixa.querySelectorAll('button')].find(b => b.textContent.includes(texto));
const digitar = (el, valor) => {
  const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value').set;
  act(() => { set.call(el, valor); el.dispatchEvent(new Event('input', { bubbles: true })); });
};

test('administrador vê os documentos da empresa e o botão para cadastrar', async () => {
  getVencimentos.mockResolvedValue(resposta([laudo, certidao]));
  await abrir();
  expect(caixa.textContent).toContain('Vencimentos');
  expect(caixa.textContent).toContain('Certidão FGTS (CRF)');
  expect(botao('Documento da empresa')).toBeDefined();
});

test('quem não é administrador não vê o botão de documento da empresa', async () => {
  useAuth.mockReturnValue({ usuario: { role: 'usuario' } });
  getVencimentos.mockResolvedValue(resposta([laudo]));
  await abrir();
  expect(caixa.textContent).toContain('Laudos a vencer');
  expect(botao('Documento da empresa')).toBeUndefined();
});

test('cadastrar documento envia o tipo empresa e a data escrita nele', async () => {
  getVencimentos.mockResolvedValue(resposta([]));
  criarVencimento.mockResolvedValue(resposta([certidao]));
  await abrir();
  act(() => { botao('Documento da empresa').click(); });
  digitar(caixa.querySelector('input[list="documentos-empresa"]'), 'Certidão FGTS (CRF)');
  digitar(caixa.querySelector('input[aria-label="Vence em"]'), '2026-11-20');
  await act(async () => { caixa.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  expect(criarVencimento).toHaveBeenCalledWith({ tipo: 'empresa', descricao: 'Certidão FGTS (CRF)', vence_em: '2026-11-20' });
  expect(caixa.textContent).toContain('Certidão FGTS (CRF)');
});

test('renovar documento pede a data nova; laudo continua renovando de hoje', async () => {
  getVencimentos.mockResolvedValue(resposta([laudo, certidao]));
  renovarVencimento.mockResolvedValue(resposta([laudo, certidao]));
  await abrir();
  const [renovarLaudo, renovarDoc] = [...caixa.querySelectorAll('button')].filter(b => b.textContent.includes('Renovei'));
  await act(async () => { renovarLaudo.click(); });
  expect(renovarVencimento).toHaveBeenCalledWith(1, {});
  act(() => { renovarDoc.click(); });
  expect(botao('Salvar nova data').disabled).toBe(true);
  digitar(caixa.querySelector('input[aria-label="Nova data de vencimento"]'), '2027-05-20');
  await act(async () => { botao('Salvar nova data').click(); });
  expect(renovarVencimento).toHaveBeenLastCalledWith(2, { vence_em: '2027-05-20' });
});

test('certificado digital mostra que a data vem do arquivo e não oferece renovar à mão', async () => {
  getVencimentos.mockResolvedValue(resposta([certificado]));
  await abrir();
  expect(caixa.textContent).toContain('lida do certificado');
  expect(botao('Renovei')).toBeUndefined();
});

test('laudo a vencer cria a proposta de renovação e passa a oferecer abrir a mesma proposta', async () => {
  getVencimentos.mockResolvedValue(resposta([laudo]));
  criarPropostaRenovacao.mockResolvedValue({ data: { propostaId: 77, numero: 'P250', criada: true, sugestaoDePreco: 'Sem valor sugerido.', ...resposta([{ ...laudo, proposta_renovacao_id: 77, proposta_renovacao_numero: 'P250' }]).data } });
  await abrir();
  await act(async () => { botao('Proposta de renovação').click(); });
  expect(criarPropostaRenovacao).toHaveBeenCalledWith(1);
  const link = caixa.querySelector('a[href="/propostas/editar/77"]');
  expect(link).not.toBeNull();
  expect(link.textContent).toContain('P250');
  expect(botao('Proposta de renovação')).toBeUndefined();
});

test('laudo em dia e documento da empresa não oferecem proposta de renovação', async () => {
  getVencimentos.mockResolvedValue(resposta([{ ...laudo, nivel: 'ok' }, certidao]));
  await abrir();
  expect(botao('Proposta de renovação')).toBeUndefined();
});
