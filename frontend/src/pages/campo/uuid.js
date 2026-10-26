// UUID v4 gerado no aparelho (identidade offline — docs/CAMPO-API.md).
//
// crypto.randomUUID só existe em contexto seguro (HTTPS ou localhost). No HTTP
// da rede local o celular cai na alternativa com crypto.getRandomValues, que
// existe em qualquer contexto. Math.random fica só como último recurso
// (navegador muito antigo) — o servidor confere o formato, não a origem.

function bytesAleatorios(cripto, n) {
  const b = new Uint8Array(n);
  if (cripto && typeof cripto.getRandomValues === 'function') {
    cripto.getRandomValues(b);
  } else {
    for (let i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
  }
  return b;
}

export function uuidDeBytes(b) {
  b[6] = (b[6] & 0x0f) | 0x40; // versão 4
  b[8] = (b[8] & 0x3f) | 0x80; // variante RFC 4122
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function novoUuid(cripto = (typeof crypto !== 'undefined' ? crypto : undefined)) {
  if (cripto && typeof cripto.randomUUID === 'function') {
    try { return cripto.randomUUID(); } catch { /* contexto não seguro: segue */ }
  }
  return uuidDeBytes(bytesAleatorios(cripto, 16));
}

export const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
