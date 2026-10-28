// Chamadas do assistente virtual. As comuns vão pelo axios (services/api.js,
// com o tratamento de sessão de sempre); a mensagem e o "acompanhar" usam
// fetch com ReadableStream para receber a resposta em tempo real (NDJSON: uma
// linha JSON por evento). O token vai no cabeçalho Authorization — nunca na URL.
import api from './api';
import { aguardarNovoLogin, temOuvinteSessao } from './sessao';

export const statusAssistente = () => api.get('/assistente/status', { timeout: 30000 });
export const contextoAssistente = (ctx) => api.get('/assistente/contexto', { params: ctx });
export const listarConversas = (arquivadas = false) => api.get('/assistente/conversas', { params: { arquivadas: arquivadas ? 1 : 0 } });
export const criarConversa = (contexto) => api.post('/assistente/conversas', { contexto });
export const verConversa = (id) => api.get(`/assistente/conversas/${id}`);
export const alterarConversa = (id, dados) => api.patch(`/assistente/conversas/${id}`, dados);
export const cancelarExecucao = (id) => api.post(`/assistente/conversas/${id}/cancelar`);
export const aplicarAcao = (id) => api.post(`/assistente/acoes/${id}/aplicar`, {}, { timeout: 120000 });
export const descartarAcao = (id) => api.post(`/assistente/acoes/${id}/descartar`);
export function enviarArquivos(conversaId, arquivos) {
  const form = new FormData();
  for (const f of arquivos) form.append('arquivos', f, f.name);
  return api.post(`/assistente/conversas/${conversaId}/arquivos`, form, { timeout: 180000 });
}

const base = () => (process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api');

// Lê o NDJSON e chama aoEvento(evento) a cada linha. Devolve quando o servidor
// fecha. `signal` (AbortController) só para de LER (a execução continua no
// servidor; para parar de verdade use cancelarExecucao).
async function lerStream(resposta, aoEvento) {
  const leitor = resposta.body.getReader();
  const dec = new TextDecoder();
  let resto = '';
  for (;;) {
    const { value, done } = await leitor.read();
    if (done) break;
    resto += dec.decode(value, { stream: true });
    let i;
    while ((i = resto.indexOf('\n')) >= 0) {
      const linha = resto.slice(0, i).trim();
      resto = resto.slice(i + 1);
      if (!linha) continue;
      try { aoEvento(JSON.parse(linha)); } catch (e) { console.error('assistente: evento inválido', e); }
    }
  }
}

async function pedirStream(metodo, caminho, corpo, aoEvento, signal, repetida = false) {
  const token = localStorage.getItem('hm_token');
  const resposta = await fetch(`${base()}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal,
  });
  // sessão vencida: espera o "Entre de novo" e repete (o 401 sai antes de gravar qualquer coisa)
  if (resposta.status === 401 && !repetida && temOuvinteSessao()) {
    await aguardarNovoLogin();
    return pedirStream(metodo, caminho, corpo, aoEvento, signal, true);
  }
  if (resposta.status === 204) return { status: 204 };
  const tipo = resposta.headers.get('content-type') || '';
  if (!resposta.ok || !tipo.includes('ndjson')) {
    const dados = await resposta.json().catch(() => ({}));
    const erro = new Error(dados.erro || `Erro ${resposta.status}`);
    erro.status = resposta.status;
    throw erro;
  }
  await lerStream(resposta, aoEvento);
  return { status: resposta.status };
}

export const enviarMensagemStream = (conversaId, dados, aoEvento, signal) =>
  pedirStream('POST', `/assistente/conversas/${conversaId}/mensagens`, dados, aoEvento, signal);

export const acompanharStream = (conversaId, aoEvento, signal) =>
  pedirStream('GET', `/assistente/conversas/${conversaId}/acompanhar`, null, aoEvento, signal);
