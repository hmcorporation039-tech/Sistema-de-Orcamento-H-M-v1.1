// Envio da resposta por canal: adaptador.enviar(idExterno, texto) e, para a voz,
// adaptador.baixarAudio(midia) → Buffer. Sem token configurado o adaptador NÃO chama o provedor:
// só registra no log que a resposta não saiu (o texto fica na fila, na coluna resposta).
// O simulador da tela do administrador usa um adaptador que não envia nada (a tela lê a resposta da
// fila). Nos testes entra um adaptador falso (criarAdaptador(..., { fetchImpl })) ou um objeto qualquer.
const { config } = require('./config');

const LIMITE_TELEGRAM = 4000; // o limite é 4096; a margem cobre o "(continua)"
const LIMITE_WHATSAPP = 4000;
const final = (id) => { const t = String(id || ''); return t.length > 4 ? `••${t.slice(-4)}` : t; };

// texto longo vai em partes, quebrando em fim de linha quando possível
function partes(texto, limite) {
  const t = String(texto || '').trim() || '(sem texto)';
  const saida = [];
  let resto = t;
  while (resto.length > limite) {
    let corte = resto.lastIndexOf('\n', limite);
    if (corte < limite * 0.5) corte = limite;
    saida.push(resto.slice(0, corte).trimEnd());
    resto = resto.slice(corte).trimStart();
  }
  if (resto) saida.push(resto);
  return saida.slice(0, 5);
}

function criarAdaptador(canal, { cfg = config(), fetchImpl = globalThis.fetch, log = console } = {}) {
  if (canal === 'simulador') {
    return { canal, configurado: true, async enviar() { return { enviado: false, simulado: true }; }, async baixarAudio() { return null; } };
  }
  if (canal === 'telegram') {
    const { token } = cfg.telegram;
    return {
      canal, configurado: !!token,
      async enviar(idExterno, texto) {
        if (!token) { log.log(`[canal] Telegram sem CANAL_TELEGRAM_TOKEN: resposta para ${final(idExterno)} não enviada (${String(texto || '').length} caracteres).`); return { enviado: false }; }
        for (const parte of partes(texto, LIMITE_TELEGRAM)) {
          const r = await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: idExterno, text: parte, disable_web_page_preview: true }),
            signal: AbortSignal.timeout(15000),
          });
          if (!r.ok) throw new Error(`Telegram respondeu ${r.status} ao enviar`);
        }
        return { enviado: true };
      },
      async baixarAudio(midia) {
        if (!token || !midia?.file_id) return null;
        const info = await fetchImpl(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(midia.file_id)}`, { signal: AbortSignal.timeout(15000) });
        const caminho = (await info.json().catch(() => ({})))?.result?.file_path;
        if (!info.ok || !caminho || !/^[\w./-]+$/.test(caminho)) return null;
        const arq = await fetchImpl(`https://api.telegram.org/file/bot${token}/${caminho}`, { signal: AbortSignal.timeout(30000) });
        if (!arq.ok) return null;
        const buffer = Buffer.from(await arq.arrayBuffer());
        return buffer.length <= 20 * 1024 * 1024 ? buffer : null;
      },
    };
  }
  if (canal === 'whatsapp') {
    const { token, numeroId } = cfg.whatsapp;
    const pronto = !!(token && numeroId);
    return {
      canal, configurado: pronto,
      async enviar(idExterno, texto) {
        if (!pronto) { log.log(`[canal] WhatsApp sem CANAL_WHATSAPP_TOKEN/NUMERO_ID: resposta para ${final(idExterno)} não enviada (${String(texto || '').length} caracteres).`); return { enviado: false }; }
        for (const parte of partes(texto, LIMITE_WHATSAPP)) {
          const r = await fetchImpl(`https://graph.facebook.com/v21.0/${encodeURIComponent(numeroId)}/messages`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: idExterno, type: 'text', text: { body: parte, preview_url: false } }),
            signal: AbortSignal.timeout(15000),
          });
          if (!r.ok) throw new Error(`WhatsApp respondeu ${r.status} ao enviar`);
        }
        return { enviado: true };
      },
      async baixarAudio(midia) {
        if (!pronto || !midia?.media_id) return null;
        const info = await fetchImpl(`https://graph.facebook.com/v21.0/${encodeURIComponent(midia.media_id)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
        const url = (await info.json().catch(() => ({})))?.url;
        if (!info.ok || typeof url !== 'string' || !/^https:\/\/[\w.-]+\.(fbsbx|facebook|whatsapp)\.(com|net)\//.test(url)) return null;
        const arq = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
        if (!arq.ok) return null;
        const buffer = Buffer.from(await arq.arrayBuffer());
        return buffer.length <= 16 * 1024 * 1024 ? buffer : null;
      },
    };
  }
  throw new Error(`Canal desconhecido: ${canal}`);
}

module.exports = { criarAdaptador, partes };
