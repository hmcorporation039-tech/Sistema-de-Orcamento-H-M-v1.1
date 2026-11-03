// Lê o corpo do webhook de cada provedor e devolve as mensagens no formato da fila:
//   { canal, id_externo, remetente, conversa, nome_remetente, tipo: 'texto'|'audio'|'outro', texto, midia }
// remetente = quem escreveu (id usado no vínculo: chat_id do Telegram, telefone do WhatsApp);
// conversa = para onde a resposta vai. Só conversa particular: grupo e canal do Telegram são ignorados.
// Status de entrega do WhatsApp (sent/delivered/read) não são mensagens e ficam de fora.
const corta = (s, n) => (s == null ? null : String(s).slice(0, n));

function lerTelegram(corpo) {
  const m = corpo?.message || corpo?.edited_message;
  if (!corpo || corpo.update_id == null || !m || !m.chat) return [];
  if (m.chat.type !== 'private') return [];
  const chat = String(m.chat.id);
  const base = {
    canal: 'telegram', id_externo: `u${corpo.update_id}`, remetente: chat, conversa: chat,
    nome_remetente: corta([m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ') || m.from?.username, 120),
  };
  if (typeof m.text === 'string') return [{ ...base, tipo: 'texto', texto: corta(m.text, 4000), midia: null }];
  const audio = m.voice || m.audio;
  if (audio?.file_id) return [{ ...base, tipo: 'audio', texto: null, midia: { file_id: corta(audio.file_id, 300), mime: corta(audio.mime_type, 60), duracao: audio.duration ?? null } }];
  return [{ ...base, tipo: 'outro', texto: null, midia: null }];
}

function lerWhatsapp(corpo) {
  if (corpo?.object !== 'whatsapp_business_account' || !Array.isArray(corpo.entry)) return [];
  const saida = [];
  for (const entrada of corpo.entry) {
    for (const mudanca of entrada?.changes || []) {
      const valor = mudanca?.value;
      const contatos = valor?.contacts || [];
      for (const m of valor?.messages || []) {
        if (!m?.id || !m.from) continue;
        const nome = contatos.find(c => c.wa_id === m.from)?.profile?.name;
        const base = { canal: 'whatsapp', id_externo: corta(m.id, 160), remetente: corta(m.from, 64), conversa: corta(m.from, 64), nome_remetente: corta(nome, 120) };
        if (m.type === 'text' && typeof m.text?.body === 'string') saida.push({ ...base, tipo: 'texto', texto: corta(m.text.body, 4000), midia: null });
        else if (m.type === 'audio' && m.audio?.id) saida.push({ ...base, tipo: 'audio', texto: null, midia: { media_id: corta(m.audio.id, 200), mime: corta(m.audio.mime_type, 60) } });
        else saida.push({ ...base, tipo: 'outro', texto: null, midia: null });
      }
    }
  }
  return saida;
}

module.exports = { lerTelegram, lerWhatsapp };
