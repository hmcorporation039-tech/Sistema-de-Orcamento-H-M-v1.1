/* Service worker do app de campo (H&M Campo) — escopo /campo/ apenas.
 *
 * Registrado por src/pages/campo/pwa.js com scope '/campo/' e ?v=<versão do
 * build> (o hash do main.js): cada build novo tem outra URL de script, então o
 * navegador instala este service worker de novo e troca o cache.
 *
 *   navegação de /campo/*  → rede primeiro (até 4 s); sem rede, index.html do cache
 *   /static/*              → cache primeiro (nome com hash: nunca muda)
 *   /api/* e /health       → nunca passa pelo cache
 *   demais do próprio site → cache e atualiza em segundo plano
 *
 * Só funciona em HTTPS ou localhost (regra do navegador). No HTTP da rede
 * local o app funciona sem ele, com os dados no IndexedDB.
 */
/* eslint-disable no-restricted-globals */
const VERSAO = new URL(self.location.href).searchParams.get('v') || 'dev';
const PREFIXO = 'hm-campo-';
const CACHE = PREFIXO + VERSAO;
const ESSENCIAIS = ['/index.html', '/manifest-campo.json', '/logo.png', '/icone-campo-192.png', '/icone-campo-512.png'];

async function arquivosDoBuild() {
  try {
    const r = await fetch('/asset-manifest.json', { cache: 'no-store' });
    if (!r.ok) return [];
    const m = await r.json();
    const lista = [...Object.values(m.files || {}), ...(m.entrypoints || []).map(e => '/' + e)];
    return [...new Set(lista)].filter(p => typeof p === 'string' && p.startsWith('/static/')
      && !p.endsWith('.map') && !p.endsWith('.LICENSE.txt'));
  } catch (e) {
    return [];
  }
}

self.addEventListener('install', (evento) => {
  evento.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // index.html é obrigatório (sem ele não há app sem rede); o resto, um a um
    await cache.add(new Request('/index.html', { cache: 'no-store' }));
    const outros = [...ESSENCIAIS.slice(1), ...(await arquivosDoBuild())];
    await Promise.all(outros.map(url => cache.add(new Request(url, { cache: 'no-store' })).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(n => n.startsWith(PREFIXO) && n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

function comTempoLimite(promessa, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('tempo')), ms);
    promessa.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function navegacao(request) {
  const cache = await caches.open(CACHE);
  try {
    const resp = await comTempoLimite(fetch(request), 4000);
    if (resp && resp.ok && (resp.headers.get('content-type') || '').includes('text/html')) {
      cache.put('/index.html', resp.clone()).catch(() => null);
    }
    return resp;
  } catch (e) {
    const guardado = await cache.match('/index.html');
    if (guardado) return guardado;
    return new Response('<h1>Sem conexão</h1><p>Abra o app uma vez com rede para guardá-lo no aparelho.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function cachePrimeiro(request) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(request);
  if (guardado) return guardado;
  const resp = await fetch(request);
  if (resp && resp.ok) cache.put(request, resp.clone()).catch(() => null);
  return resp;
}

async function cacheEAtualiza(request) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(request);
  const rede = fetch(request).then(resp => {
    if (resp && resp.ok) cache.put(request, resp.clone()).catch(() => null);
    return resp;
  }).catch(() => null);
  return guardado || (await rede) || new Response('', { status: 504 });
}

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // fontes do Google etc.: direto
  if (url.pathname.startsWith('/api/') || url.pathname === '/health') return; // dados: nunca em cache
  if (request.mode === 'navigate') {
    evento.respondWith(navegacao(request));
    return;
  }
  if (url.pathname.startsWith('/static/')) {
    evento.respondWith(cachePrimeiro(request));
    return;
  }
  if (url.pathname === '/sw-campo.js' || url.pathname === '/asset-manifest.json') return;
  evento.respondWith(cacheEAtualiza(request));
});
