// Base comum do HTML dos PDFs (proposta, contrato, relatórios, boletim de
// medição, ordem de serviço, folha de entrega). Antes cada template tinha a sua
// cópia de escapeHtml e dos formatadores (6 cópias; as de data já divergiam).
// Regra do projeto: TODO texto que vem do banco/formulário passa por escapeHtml.

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatarMoeda(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Data de coluna DATE ("2026-01-15", ou o Date que o driver devolve à meia-noite):
// dia/mês/ano sem fuso — em horário de Brasília o Date viraria o dia anterior.
// Texto que não é data volta como veio (ex.: "a definir"); vazio → `vazio`.
function formatarData(v, vazio = '—') {
  if (v == null || v === '') return vazio;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(typeof v === 'string' ? v : '');
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return typeof v === 'string' ? v : vazio;
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Data de HOJE (emissão do documento, assinatura de contrato): no fuso de
// Brasília — em UTC, um documento gerado às 21h30 saía datado do dia seguinte.
function formatarDataDeHoje(agora = new Date()) {
  return agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

module.exports = { escapeHtml, formatarMoeda, formatarData, formatarDataDeHoje };
