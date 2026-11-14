// Resposta em pt-BR (markdown simples do chat) de uma execução de agente próprio: o que foi feito, seções do
// resultado, links, arquivos gerados, pendências [CONFERIR] e — quando houve — o suporte Claude Max. Sem IA.
const { obterAgente } = require('./registro');

const STATUS = {
  fila: 'na fila', executando: 'em andamento', concluida: 'concluído sem IA', pendente: 'parou com pendência',
  erro: 'terminou com erro', cancelada: 'cancelado', aguardando_modulo: 'aguardando módulo',
};
const segundos = (r) => (r.iniciado_em && r.terminado_em ? Math.max(1, Math.round((new Date(r.terminado_em) - new Date(r.iniciado_em)) / 1000)) : null);

function textoDoResultado(r) {
  const ag = obterAgente(r.agente);
  const res = r.resultado || {};
  const l = [];
  const t = segundos(r);
  l.push(`**${ag?.nome || r.agente}** — ${STATUS[r.status] || r.status}${t ? ` em ${t} s` : ''} (execução #${r.id}).`);
  if (res.interpretacao) l.push(`_${res.interpretacao}_`);
  if (r.status === 'erro' && r.erro) l.push(`\nErro: ${r.erro}`);
  for (const s of res.secoes || []) {
    if (!s.linhas?.length) continue;
    l.push(`\n### ${s.titulo}`);
    l.push(...s.linhas);
  }
  if (res.pergunta) l.push(`\n**Para seguir:** ${res.pergunta}`);
  if (res.suporte?.texto) {
    l.push(`\n### ${res.suporte.base_aprovada ? 'Resposta da base de conhecimento aprovada (sem IA)' : `Suporte Claude Max${res.suporte.modo === 'consultor' ? ' — pesquisa aprofundada' : ''}`}`);
    l.push(res.suporte.texto);
    if (!res.suporte.base_aprovada) l.push(`\n_Sugestão do Claude Max — vale só depois de aprovada como conhecimento (sugestão #${res.suporte.sugestao_id || '—'})._`);
  }
  const links = res.links || [];
  if (links.length) { l.push('\n### Links'); for (const k of links) l.push(`- [${k.rotulo}](${k.link})`); }
  const arqs = res.arquivos || [];
  if (arqs.length) { l.push('\n### Arquivos gerados'); for (const a of arqs) l.push(`- ${a.nome} (botão abaixo para baixar)`); }
  const pend = r.pendencias || [];
  if (pend.length) { l.push('\n### Pendências'); for (const p of pend.slice(0, 40)) l.push(`- ${p}`); if (pend.length > 40) l.push(`- … mais ${pend.length - 40}`); }
  if (r.precisa_ia && r.motivo_ia && !res.suporte?.texto) l.push(`\n_A IA pode ajudar: ${r.motivo_ia} Se quiser, peça "use a IA"._`);
  return l.join('\n');
}

module.exports = { textoDoResultado, STATUS };
