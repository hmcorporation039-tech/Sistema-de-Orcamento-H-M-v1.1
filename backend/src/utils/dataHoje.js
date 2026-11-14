// "Hoje" no horário de Brasília — fonte única. `new Date().toISOString().slice(0, 10)`
// é a data em UTC: depois das 21h já é o dia seguinte, e uma proposta duplicada
// ou gerada à noite nascia com a data de amanhã (PDF, validade e relatórios do mês).
const FUSO = 'America/Sao_Paulo';

// AAAA-MM-DD (en-CA formata assim)
function hojeBrasilia(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

// { ano, mes } (mês 1–12) de hoje em Brasília — para períodos padrão de relatórios
function anoMesBrasilia(agora = new Date()) {
  const [ano, mes] = hojeBrasilia(agora).split('-').map(Number);
  return { ano, mes };
}

// Período padrão dos relatórios e do financeiro: do dia 1º do mês atual até
// hoje, em Brasília. Antes `hoje.toISOString()` era o dia em UTC: depois das
// 21h já era amanhã e, na noite do último dia do mês, o fim caía no mês seguinte.
function periodoMesAtualBrasilia(agora = new Date()) {
  const { ano, mes } = anoMesBrasilia(agora);
  return { dataInicio: `${ano}-${String(mes).padStart(2, '0')}-01`, dataFim: hojeBrasilia(agora) };
}

// "AAAA-MM-DD" que existe no calendário. `new Date('2026-02-31')` não falha: o
// JavaScript "rola" para 03/03 — a data passava na validação e o Postgres
// recusava depois (erro 500 no lugar de "data inválida").
function ehDataIso(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return false;
  const [a, me, d] = m.slice(1).map(Number);
  const dt = new Date(Date.UTC(a, me - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === me - 1 && dt.getUTCDate() === d;
}

// Coluna DATE lida pelo driver do pg vem como Date à meia-noite LOCAL: 'AAAA-MM-DD' pelas partes locais
// (toISOString daria o dia anterior). Texto passa pelos 10 primeiros caracteres; vazio → null.
// Fonte única desde a 2.38 (havia cópias em obras, campo, revisão pré-envio, vencimentos e cotações).
function dataLocalIso(v) {
  if (v === null || v === undefined || v === '') return null;
  if (!(v instanceof Date)) {
    if (typeof v === 'string') return v.slice(0, 10);
    v = new Date(v);
  }
  if (Number.isNaN(v.getTime())) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
}

module.exports = { FUSO, hojeBrasilia, periodoMesAtualBrasilia, ehDataIso, dataLocalIso };
