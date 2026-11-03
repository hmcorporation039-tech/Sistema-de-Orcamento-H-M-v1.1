// Sessão revogável (Fase 6, 02/11/2026): o token de acesso agora é curto (15 min) e o login devolve
// também uma chave de RENOVAÇÃO da sessão deste navegador. Quando o servidor recusa o token (401), quem
// chama a API renova aqui, sem a pessoa perceber, e repete o pedido. Só se a renovação também for
// recusada (sessão encerrada, senha trocada, usuário desativado, 7 dias parado) é que aparece o
// "Entre de novo" (services/sessao.js + ModalSessao), como antes.
//
// Usado pelo axios (services/api.js), pelo app de campo (pages/campo/apiCampo.js) e pelo assistente
// (services/assistente.js). Sem React e sem axios, para servir aos três.
//
// localStorage:
//   hm_token        token de acesso (como sempre)
//   hm_renovacao    chave de renovação da sessão
//   hm_dispositivo  identificador deste navegador (o mesmo navegador entrando de novo substitui a
//                   sessão anterior dele, e o servidor reconhece "aparelho novo")

const BASE = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api';
const TOKEN = 'hm_token';
const RENOVACAO = 'hm_renovacao';
const DISPOSITIVO = 'hm_dispositivo';

function ler(chave) {
  try { return localStorage.getItem(chave); } catch { return null; }
}
function gravar(chave, valor) {
  try { if (valor == null) localStorage.removeItem(chave); else localStorage.setItem(chave, valor); } catch { /* sem armazenamento */ }
}

function aleatorio() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function idDispositivo() {
  let id = ler(DISPOSITIVO);
  if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = aleatorio();
    gravar(DISPOSITIVO, id);
  }
  return id;
}

// Guarda o que o login/renovação devolveu. Sem `renovacao` na resposta, a chave guardada continua.
export function guardarSessao({ token, renovacao } = {}) {
  if (token) gravar(TOKEN, token);
  if (renovacao) gravar(RENOVACAO, renovacao);
}

export function esquecerRenovacao() {
  gravar(RENOVACAO, null);
}

export const temRenovacao = () => !!ler(RENOVACAO);

async function pedirRenovacao(chave) {
  const r = await fetch(`${BASE}/auth/renovar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ renovacao: chave }),
    cache: 'no-store',
  });
  const dados = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, dados };
}

// Renova o token de acesso. Pedidos que chegam juntos esperam a MESMA renovação. Resolve com o token
// novo; rejeita se não houver chave ou se o servidor recusar (aí vale o "Entre de novo").
let emAndamento = null;
export function renovarSessao() {
  if (emAndamento) return emAndamento;
  const chave = ler(RENOVACAO);
  if (!chave) return Promise.reject(Object.assign(new Error('Sem chave de renovação'), { semRenovacao: true }));
  emAndamento = (async () => {
    const r = await pedirRenovacao(chave);
    if (r.ok && r.dados.token) {
      guardarSessao(r.dados);
      return r.dados.token;
    }
    // outra aba renovou no meio do caminho e já trocou a chave: vale o token que ela guardou
    if (ler(RENOVACAO) !== chave && ler(TOKEN)) return ler(TOKEN);
    // sessão encerrada no servidor: a chave não serve mais
    if (r.status === 401) esquecerRenovacao();
    throw Object.assign(new Error(r.dados.erro || 'Sessão encerrada'), { status: r.status });
  })().finally(() => { emAndamento = null; });
  return emAndamento;
}

// Sair de verdade: encerra a sessão no servidor (o token e a chave dela param de valer). Recebe o token
// e a chave de antes de limpar a tela; se o token já tiver vencido, renova uma vez só para poder sair.
// Nunca rejeita: sem rede, a sessão vence sozinha (inatividade).
export async function encerrarNoServidor(token, renovacao) {
  const sair = (t) => fetch(`${BASE}/auth/sair`, {
    method: 'POST', headers: { Authorization: `Bearer ${t}` }, cache: 'no-store',
  });
  try {
    if (!token) return;
    const r = await sair(token);
    if (r.status !== 401 || !renovacao) return;
    const novo = await pedirRenovacao(renovacao);
    if (novo.ok && novo.dados.token) await sair(novo.dados.token);
  } catch { /* sem rede: segue */ }
}
