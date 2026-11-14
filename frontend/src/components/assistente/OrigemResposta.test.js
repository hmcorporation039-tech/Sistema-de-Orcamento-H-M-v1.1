import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { SeloOrigem, AcoesDaResposta, ArquivosGerados, origemDaMensagem } from './OrigemResposta';
import { TabelaDependencia } from '../aprendizado/AgentesProprios';

// De onde veio a resposta do assistente (agente próprio sem IA × suporte Claude Max × IA) e as ações dela.
// Dados SINTÉTICOS; nenhuma chamada de rede (os botões não são clicados).
jest.mock('../../services/assistente', () => ({
  avaliarPedido: jest.fn(), aprovarComoConhecimento: jest.fn(), baixarArquivoConversa: jest.fn(),
  listarSugestoesAgentes: jest.fn(), decidirSugestaoAgentes: jest.fn(), indicadoresAgentes: jest.fn(),
}));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let raiz;
let caixa;
beforeEach(() => { caixa = document.createElement('div'); document.body.appendChild(caixa); raiz = createRoot(caixa); });
afterEach(() => { act(() => raiz.unmount()); caixa.remove(); });
const render = (el) => act(() => raiz.render(el));

test('origem pela mensagem gravada e pela resposta ao vivo', () => {
  expect(origemDaMensagem({ provedor: 'agente' })).toBe('agente');
  expect(origemDaMensagem({ provedor: 'agente', sugestao_id: 9 })).toBe('agente_suporte');
  expect(origemDaMensagem({ provedor: 'suporte_claude' })).toBe('suporte');
  expect(origemDaMensagem({ provedor: 'claude_max' })).toBe('ia');
  expect(origemDaMensagem({ provedor: null }, { origem: 'agente' })).toBe('agente');
  expect(origemDaMensagem({})).toBe(null);
});

test('selo: agente próprio sem IA × suporte Claude Max × IA', () => {
  render(<SeloOrigem origem="agente" />);
  expect(caixa.textContent).toContain('Agente próprio · sem IA');
  render(<SeloOrigem origem="suporte" />);
  expect(caixa.textContent).toContain('Suporte Claude Max');
  render(<SeloOrigem origem="ia" />);
  expect(caixa.textContent).toContain('IA · Claude Max');
  render(<SeloOrigem origem={null} />);
  expect(caixa.textContent).toBe('');
});

test('ações: "serviu?" no agente; "aprovar como conhecimento" só na IA/suporte', () => {
  render(<AcoesDaResposta m={{ id: 1, papel: 'assistente', status: 'concluida', provedor: 'agente', agente_pedido_id: 5, texto: 'ok' }} />);
  expect(caixa.textContent).toContain('O resultado serviu?');
  expect(caixa.textContent).not.toContain('Aprovar como conhecimento');
  render(<AcoesDaResposta m={{ id: 2, papel: 'assistente', status: 'concluida', provedor: 'suporte_claude', sugestao_id: 3, texto: 'resposta do suporte' }} />);
  expect(caixa.textContent).toContain('Aprovar como conhecimento');
  render(<AcoesDaResposta m={{ id: 3, papel: 'assistente', status: 'concluida', provedor: 'claude_max', texto: 'resposta', sugestao_situacao: 'aprovada' }} />);
  expect(caixa.textContent).toContain('Aprovada como conhecimento');
  expect(caixa.textContent).not.toContain('Aprovar como conhecimento');
  render(<AcoesDaResposta m={{ id: 4, papel: 'assistente', status: 'executando', provedor: 'claude_max', texto: 'x' }} />);
  expect(caixa.textContent).toBe('');
});

test('arquivos gerados pelo agente viram botões de download (links continuam links)', () => {
  render(<ArquivosGerados criados={[{ tipo: 'arquivo', id: 7, rotulo: 'Pesquisa de precos.xlsx' }, { tipo: 'proposta', id: 1, rotulo: 'Proposta P1', link: '/propostas/editar/1' }]} />);
  const botoes = caixa.querySelectorAll('button');
  expect(botoes.length).toBe(1);
  expect(botoes[0].textContent).toContain('Pesquisa de precos.xlsx');
});

test('indicador de dependência de IA por agente', () => {
  render(<TabelaDependencia porAgente={{ orcamento: { execucoes: 10, suporte: 2, suporte_ok: 1, dependencia_pct: 20 } }} />);
  expect(caixa.textContent).toContain('Orçamento');
  expect(caixa.textContent).toContain('20 %');
});
