// Chamadas HTTP do app de campo (contrato em docs/CAMPO-API.md).
//
// Separado de services/api.js de propósito: o interceptor de lá apaga o login
// e recarrega a página em qualquer 401/403, e aqui um 403 de uma operação é só
// "recusada" e um 401 precisa levar ao login SEM perder nada do que está na
// fila (ela fica no IndexedDB, que o login não toca).
//
// Erros, do jeito que a sincronização precisa distinguir:
//   ErroAutenticacao — 401: login vencido; vai para o login e volta depois
//   ErroRegra        — 4xx: o servidor recusou (não adianta reenviar)
//   ErroRede         — sem resposta, tempo esgotado, 5xx, 408 ou 429: tentar depois

const BASE = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api';

export class ErroRede extends Error {
  constructor(msg, status = 0) { super(msg); this.name = 'ErroRede'; this.status = status; this.rede = true; }
}
export class ErroRegra extends Error {
  constructor(msg, status) { super(msg); this.name = 'ErroRegra'; this.status = status; this.regra = true; }
}
export class ErroAutenticacao extends Error {
  constructor(msg = 'Sessão expirada. Entre de novo.') { super(msg); this.name = 'ErroAutenticacao'; this.status = 401; this.autenticacao = true; }
}

function voltarAoLoginPadrao() {
  // Só o login sai do navegador; a fila e as fotos continuam no IndexedDB.
  localStorage.removeItem('hm_token');
  localStorage.removeItem('hm_usuario');
  const volta = window.location.pathname + window.location.search;
  window.location.href = `/login?volta=${encodeURIComponent(volta)}`;
}
let aoNaoAutenticado = voltarAoLoginPadrao;
export function definirAoNaoAutenticado(fn) { aoNaoAutenticado = fn || voltarAoLoginPadrao; }

function token() {
  try { return localStorage.getItem('hm_token'); } catch { return null; }
}

async function lerErro(resp) {
  try {
    const corpo = await resp.json();
    return corpo?.erro || corpo?.mensagem || `Erro ${resp.status}`;
  } catch {
    return `Erro ${resp.status}`;
  }
}

// fetch com tempo limite e classificação do erro.
export async function requisitar(caminho, { metodo = 'GET', corpo, formulario, tempoLimite = 20000, comoBlob = false } = {}) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), tempoLimite) : null;
  const headers = {};
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  let body;
  if (formulario) body = formulario;
  else if (corpo !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(corpo); }
  let resp;
  try {
    resp = await fetch(caminho.startsWith('http') ? caminho : `${BASE}${caminho}`, {
      method: metodo, headers, body, cache: 'no-store', signal: ctrl?.signal,
    });
  } catch (err) {
    throw new ErroRede(err?.name === 'AbortError' ? 'Tempo esgotado (rede lenta).' : 'Sem conexão com o servidor.');
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (resp.status === 401) {
    try { aoNaoAutenticado(); } catch { /* segue */ }
    throw new ErroAutenticacao();
  }
  if (resp.status >= 500 || resp.status === 408 || resp.status === 429) {
    throw new ErroRede(await lerErro(resp), resp.status);
  }
  if (!resp.ok) throw new ErroRegra(await lerErro(resp), resp.status);
  if (comoBlob) return resp.blob();
  try {
    return await resp.json();
  } catch {
    // corpo cortado no meio (queda de rede durante a resposta)
    throw new ErroRede('Resposta incompleta do servidor.');
  }
}

// ── rotas do contrato ───────────────────────────────────────────────────

export function listarOS({ status = 'abertas', desde } = {}) {
  const qs = new URLSearchParams({ status });
  if (desde) qs.set('desde', desde);
  return requisitar(`/campo/os?${qs}`);
}

export const obterOS = (id) => requisitar(`/campo/os/${encodeURIComponent(id)}`);

export const listarModelos = () => requisitar('/campo/modelos-checklist');

// Obras para a OS nova criada no campo (GET /obras?campos=basico devolve
// { itens: [{ id, codigo, nome, cliente_id, cliente_nome, local, status, segmento }], … }).
// pode_abrir_os=1: só as obras em que este usuário pode abrir OS (a mesma regra
// que o servidor usa para aceitar o criar_os) — o técnico não escolhe uma obra
// que depois seria recusada.
export const listarObras = () => requisitar('/obras?campos=basico&pode_abrir_os=1&porPagina=1000');

export const sincronizarOperacoes = (operacoes) =>
  requisitar('/campo/sincronizar', { metodo: 'POST', corpo: { operacoes }, tempoLimite: 45000 });

// Foto: multipart, idempotente pelo uuid (reenvio devolve 200 com a mesma foto).
export function enviarFoto(osUuid, foto, blob) {
  const f = new FormData();
  const ext = foto.tipo_mime === 'image/png' ? 'png' : foto.tipo_mime === 'image/webp' ? 'webp' : 'jpg';
  f.append('foto', blob, `${foto.uuid}.${ext}`);
  f.append('uuid', foto.uuid);
  if (foto.item_id) f.append('item_id', foto.item_id);
  if (foto.legenda) f.append('legenda', foto.legenda);
  f.append('tirada_em', foto.tirada_em);
  if (foto.lat != null) f.append('lat', String(foto.lat));
  if (foto.lon != null) f.append('lon', String(foto.lon));
  return requisitar(`/campo/os/${encodeURIComponent(osUuid)}/fotos`, { metodo: 'POST', formulario: f, tempoLimite: 90000 });
}

// Foto/assinatura já no servidor (rota autenticada: precisa do token, então
// não dá para usar a URL direto no <img>).
export const baixarArquivo = (url) => requisitar(url.replace(/^\/api/, ''), { comoBlob: true, tempoLimite: 30000 });
