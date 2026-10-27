// Armazenamento do app de campo no aparelho (IndexedDB), sem dependência nova.
//
// Um banco por usuário ("hm-campo-u<id>"): se outra pessoa entrar no mesmo
// celular, ela não vê nem envia com o próprio login a fila de quem saiu.
//
// Lojas (object stores):
//   os     — { uuid, servidor: <OS como o servidor devolveu> | null, atualizado_local }
//   fila   — operações a enviar, na ordem (chave `seq` autoincremento):
//            { seq, op_uuid, feita_em, tipo, os_uuid, dados, estado: 'pendente'|'recusada', erro? }
//   fotos  — { uuid, os_uuid, item_id, legenda, tirada_em, lat, lon, tipo_mime,
//            estado: 'pendente'|'enviada'|'recusada', erro?, enviada_em? }
//   arquivos — { uuid, tipo_mime, bytes: ArrayBuffer } — os bytes da foto, à parte
//            para a lista de fotos não carregar megabytes a cada atualização da tela
//            (ArrayBuffer em vez de Blob: o Safari antigo falhava ao guardar Blob)
//   listas — { chave: 'obras' | 'modelos', itens, salvo_em }
//   meta   — { chave, valor }  (data da última sincronização etc.)
//
// A interface é a mesma na versão em memória (testes e navegador sem IndexedDB):
//   get(loja, chave) · put(loja, valor) → chave · del(loja, chave) · all(loja)

export const LOJAS = {
  os: { keyPath: 'uuid' },
  fila: { keyPath: 'seq', autoIncrement: true },
  fotos: { keyPath: 'uuid' },
  arquivos: { keyPath: 'uuid' },
  listas: { keyPath: 'chave' },
  meta: { keyPath: 'chave' },
};
const VERSAO_BANCO = 1;

function promessa(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function nomeDoBanco(usuarioId) {
  return `hm-campo-u${String(usuarioId ?? 'anonimo').replace(/[^\w-]/g, '')}`;
}

function abrirBancoIdb(nome, idb) {
  return new Promise((resolve, reject) => {
    const req = idb.open(nome, VERSAO_BANCO);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [loja, opcoes] of Object.entries(LOJAS)) {
        if (!db.objectStoreNames.contains(loja)) db.createObjectStore(loja, opcoes);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Banco do aparelho bloqueado por outra aba do app.'));
  });
}

// Loja sobre IndexedDB. Reabre a conexão se o navegador a fechar (o Safari faz
// isso quando o app fica muito tempo em segundo plano).
export function criarLojaIdb(nome, idb = (typeof indexedDB !== 'undefined' ? indexedDB : null)) {
  if (!idb) throw new Error('IndexedDB indisponível');
  let conexao = null;
  async function db() {
    if (!conexao) {
      conexao = abrirBancoIdb(nome, idb).then(d => {
        d.onversionchange = () => { d.close(); conexao = null; };
        d.onclose = () => { conexao = null; };
        return d;
      }).catch(err => { conexao = null; throw err; });
    }
    return conexao;
  }
  async function rodar(loja, modo, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(loja, modo);
      let resultado;
      Promise.resolve(fn(tx.objectStore(loja))).then(r => { resultado = r; }, reject);
      tx.oncomplete = () => resolve(resultado);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transação abortada'));
    });
  }
  return {
    tipo: 'indexeddb',
    nome,
    get: (loja, chave) => rodar(loja, 'readonly', s => promessa(s.get(chave))),
    put: (loja, valor) => rodar(loja, 'readwrite', s => promessa(s.put(valor))),
    del: (loja, chave) => rodar(loja, 'readwrite', s => promessa(s.delete(chave))),
    all: (loja) => rodar(loja, 'readonly', s => promessa(s.getAll())),
    fechar: async () => { if (conexao) (await conexao).close(); conexao = null; },
  };
}

// Cópia como o IndexedDB faria (inclusive ArrayBuffer), para a versão em
// memória se comportar igual: quem lê não altera o que está guardado.
function copiar(v) {
  if (typeof structuredClone === 'function') return structuredClone(v);
  if (v instanceof ArrayBuffer) return v.slice(0);
  if (Array.isArray(v)) return v.map(copiar);
  if (v && typeof v === 'object') {
    const r = {};
    for (const [k, x] of Object.entries(v)) r[k] = copiar(x);
    return r;
  }
  return v;
}

// Mesma interface, em memória: testes e navegador sem IndexedDB (os dados
// somem ao fechar a aba — a tela avisa).
export function criarLojaMemoria() {
  const dados = {};
  const contadores = {};
  for (const loja of Object.keys(LOJAS)) { dados[loja] = new Map(); contadores[loja] = 0; }
  return {
    tipo: 'memoria',
    async get(loja, chave) { return copiar(dados[loja].get(chave)); },
    async put(loja, valor) {
      const { keyPath, autoIncrement } = LOJAS[loja];
      const v = copiar(valor);
      if (autoIncrement && v[keyPath] == null) v[keyPath] = ++contadores[loja];
      if (autoIncrement) contadores[loja] = Math.max(contadores[loja], v[keyPath]);
      dados[loja].set(v[keyPath], v);
      return v[keyPath];
    },
    async del(loja, chave) { dados[loja].delete(chave); },
    async all(loja) {
      return [...dados[loja].entries()]
        .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
        .map(([, v]) => copiar(v));
    },
    async fechar() {},
  };
}

// Abre a loja do usuário: IndexedDB quando existe, memória quando não.
export async function abrirLoja(usuarioId) {
  try {
    const loja = criarLojaIdb(nomeDoBanco(usuarioId));
    await loja.all('meta'); // força abrir agora: erro aparece aqui, não no meio do uso
    // Pede ao navegador para não apagar os dados quando faltar espaço.
    try { if (navigator.storage?.persist) navigator.storage.persist(); } catch { /* opcional */ }
    return loja;
  } catch {
    return criarLojaMemoria();
  }
}
