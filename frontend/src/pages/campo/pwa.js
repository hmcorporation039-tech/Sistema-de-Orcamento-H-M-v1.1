// PWA do app de campo: manifesto e service worker SÓ dentro de /campo.
// O escritório (o resto do sistema) continua sem service worker e sem
// manifesto — nada muda para ele.

const SCOPO = '/campo/';

// Versão do build = hash do main.js da página em uso (ou REACT_APP_BUILD_ID,
// se o build definir). Vai na URL do service worker: build novo → URL nova →
// o navegador instala de novo e o cache velho é apagado.
export function versaoDoBuild() {
  if (process.env.REACT_APP_BUILD_ID) return String(process.env.REACT_APP_BUILD_ID).replace(/[^\w.-]/g, '');
  const src = Array.from(document.scripts || []).map(s => s.src || '')
    .find(s => /\/static\/js\/main\.[0-9a-f]+\.js/.test(s));
  const m = src && src.match(/main\.([0-9a-f]+)\.js/);
  return m ? m[1] : 'dev';
}

// Insere <link rel="manifest"> e metas do app; devolve a função que tira tudo
// (ao sair de /campo para o escritório na mesma aba).
export function instalarManifesto() {
  const criados = [];
  const tituloAntes = document.title;
  function add(tag, attrs) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    el.setAttribute('data-campo', '1');
    document.head.appendChild(el);
    criados.push(el);
  }
  if (!document.querySelector('link[rel="manifest"]')) add('link', { rel: 'manifest', href: '/manifest-campo.json' });
  add('meta', { name: 'theme-color', content: '#000000' });
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
  add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' });
  add('meta', { name: 'apple-mobile-web-app-title', content: 'H&M Campo' });
  add('link', { rel: 'apple-touch-icon', href: '/icone-campo-192.png' });
  document.title = 'H&M Campo';
  return () => {
    for (const el of criados) el.remove();
    document.title = tituloAntes;
  };
}

export function swSuportado() {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator
    && typeof window !== 'undefined' && window.isSecureContext;
}

export async function registrarServiceWorker() {
  if (!swSuportado() || process.env.NODE_ENV !== 'production') return null;
  try {
    return await navigator.serviceWorker.register(`/sw-campo.js?v=${encodeURIComponent(versaoDoBuild())}`, { scope: SCOPO });
  } catch {
    return null; // sem SW o app funciona igual com rede; os dados ficam no IndexedDB
  }
}
