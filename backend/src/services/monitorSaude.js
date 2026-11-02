// Alerta de sistema fora do ar (sugestão do plano de melhorias, 02/11/2026). O script scripts/monitorar-saude.js roda a cada
// 5 minutos pelo Agendador de Tarefas do Windows, consulta o /health e avisa por e-mail:
//   - depois de FALHAS_PARA_ALERTAR consultas seguidas sem "ok" (uma falha isolada, como o reinício de 10 s do supervisor,
//     não alerta); o aviso sai UMA vez, não a cada consulta;
//   - quando volta, um aviso de "voltou" (só se o de queda tinha saído).
// A decisão é uma função pura (avaliar) para testar sem rede nem e-mail. Observação: ele roda no mesmo PC do sistema; se o PC
// inteiro estiver desligado, nada roda (para isso, só um monitor de fora — ver o plano).
const FALHAS_PARA_ALERTAR = 3;

// estado: { falhas, alertado, desde } | null; ok: o /health respondeu "ok"; agora: Date.
// Devolve { estado (novo), acao: null | 'queda' | 'voltou' }.
function avaliar(estado, ok, agora = new Date(), limite = FALHAS_PARA_ALERTAR) {
  const atual = { falhas: 0, alertado: false, desde: null, ...(estado || {}) };
  if (ok) {
    const acao = atual.alertado ? 'voltou' : null;
    return { estado: { falhas: 0, alertado: false, desde: null, ultimoOk: agora.toISOString() }, acao };
  }
  const falhas = atual.falhas + 1;
  const desde = atual.desde || agora.toISOString();
  if (falhas >= limite && !atual.alertado) return { estado: { ...atual, falhas, alertado: true, desde }, acao: 'queda' };
  return { estado: { ...atual, falhas, desde }, acao: null };
}

// Consulta o /health; "ok" só com HTTP 200 e status "ok" (o próprio /health confere o banco).
async function consultar(url, timeoutMs = 8000, buscar = globalThis.fetch) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await buscar(url, { signal: ctl.signal });
    if (!r.ok) return { ok: false, motivo: `HTTP ${r.status}` };
    const j = await r.json().catch(() => ({}));
    return j.status === 'ok' ? { ok: true } : { ok: false, motivo: 'respondeu, mas o status não é ok' };
  } catch (e) {
    return { ok: false, motivo: e.name === 'AbortError' ? `sem resposta em ${timeoutMs / 1000} s` : e.message };
  } finally { clearTimeout(t); }
}

function mensagem(acao, { desde, motivo, url } = {}) {
  const quando = desde ? new Date(desde).toLocaleString('pt-BR') : '';
  if (acao === 'queda') {
    return {
      assunto: 'ALERTA: o Sistema H&M está fora do ar',
      texto: `O sistema não respondeu nas últimas ${FALHAS_PARA_ALERTAR} verificações${quando ? ` (desde ${quando})` : ''}.\nÚltimo motivo: ${motivo || 'desconhecido'}.\nEndereço consultado: ${url}\n\nO que fazer: abra o PC do servidor e rode C:\\HM-Engenharia\\hm-eng\\reiniciar-backend.bat como administrador. Se o PC estiver desligado, ligue-o (o sistema sobe sozinho).\n\nEste aviso sai uma vez por queda; outro avisará quando o sistema voltar.`,
    };
  }
  return {
    assunto: 'O Sistema H&M voltou ao ar',
    texto: `O sistema voltou a responder${quando ? `. A queda começou em ${quando}` : ''}.\nEndereço consultado: ${url}`,
  };
}

module.exports = { avaliar, consultar, mensagem, FALHAS_PARA_ALERTAR };
