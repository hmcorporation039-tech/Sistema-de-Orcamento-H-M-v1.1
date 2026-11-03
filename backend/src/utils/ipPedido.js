// IP de quem fez o pedido e se o acesso vem de fora da rede do escritório (Fase 6, 02/11/2026).
//
// Sem TRUST_PROXY (o padrão, rede local), req.ip é o endereço da conexão. Atrás de um túnel ou proxy
// reverso, TODO pedido chega do próprio PC (127.0.0.1) — e pareceria "de dentro". Por isso:
//   - com TRUST_PROXY definido, o Express lê o IP real do X-Forwarded-For (só do proxy configurado);
//   - sem TRUST_PROXY, se o pedido trouxer cabeçalho de proxy (X-Forwarded-For, Forwarded, X-Real-IP,
//     CF-Connecting-IP), ele é tratado como DE FORA: na dúvida, o lado seguro.

const CABECALHOS_PROXY = ['x-forwarded-for', 'forwarded', 'x-real-ip', 'cf-connecting-ip'];

function ipDoPedido(req) {
  const bruto = String(req?.ip || req?.socket?.remoteAddress || '');
  return bruto.replace(/^::ffff:/i, '').slice(0, 64) || null;
}

// Endereços de rede local/privada (RFC 1918, loopback, link-local, IPv6 ULA).
function ipPrivado(ip) {
  const t = String(ip || '').replace(/^::ffff:/i, '').toLowerCase();
  if (!t) return false;
  if (t === '::1' || t === 'localhost') return true;
  if (/^127\./.test(t) || /^10\./.test(t) || /^192\.168\./.test(t) || /^169\.254\./.test(t)) return true;
  const m = t.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  if (/^f[cd][0-9a-f]{2}:/.test(t) || /^fe80:/.test(t)) return true;
  return false;
}

function acessoDeFora(req) {
  const confiaNoProxy = !!(req?.app && typeof req.app.get === 'function' && req.app.get('trust proxy'));
  if (!confiaNoProxy && CABECALHOS_PROXY.some(h => req?.headers?.[h])) return true;
  return !ipPrivado(ipDoPedido(req));
}

// Descrição curta do aparelho a partir do User-Agent ("Chrome no Windows"), só para a lista de sessões.
function descreverDispositivo(userAgent) {
  const ua = String(userAgent || '');
  if (!ua) return 'Dispositivo desconhecido';
  const navegador = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
      : /Firefox\//.test(ua) ? 'Firefox'
        : /Chrome\//.test(ua) ? 'Chrome'
          : /Safari\//.test(ua) ? 'Safari'
            : /node|axios|curl|python/i.test(ua) ? 'Programa' : 'Navegador';
  const sistema = /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
      : /iPhone|iPad|iOS/.test(ua) ? 'iPhone/iPad'
        : /Mac OS X|Macintosh/.test(ua) ? 'Mac'
          : /Linux/.test(ua) ? 'Linux' : null;
  return (sistema ? `${navegador} no ${sistema}` : navegador).slice(0, 200);
}

module.exports = { ipDoPedido, ipPrivado, acessoDeFora, descreverDispositivo, CABECALHOS_PROXY };
