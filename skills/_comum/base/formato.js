// Formatação pt-BR de dinheiro, data e número — a mesma no PDF do backend e nos documentos das skills.
// O frontend não consegue importar daqui (o build do React só compila o que está em frontend/src):
// frontend/src/utils/format.js tem as mesmas regras, e backend/testes/comum.test.js confere que as
// duas dão o mesmo resultado.

// Dinheiro em reais ('R$ 1.234,56'). Sem opção, vazio ou nulo vira 'R$ 0,00' (totais e somas). Com
// `vazio` (ex.: '—'), nulo, indefinido ou texto vazio mostram esse texto.
function formatarMoeda(v, opcoes) {
  const vazio = opcoes ? opcoes.vazio : undefined;
  if (vazio !== undefined && (v == null || v === '')) return vazio;
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

// Texto ISO ('AAAA-MM-DD', ou o começo de um timestamp) → 'DD/MM/AAAA', sem passar por Date.
// Vazio → ''; o que não começa por data volta como texto, sem mudar (documentos das skills).
function dataIsoBr(v) {
  if (!v) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v);
}

// Número em pt-BR com até `casas` decimais (sem zeros à direita). Vazio, nulo
// ou valor que não vira número finito ('abc', NaN, Infinity) sai como '—',
// nunca "NaN"/"∞" no documento.
function numeroBr(v, casas = 2) {
  if (v == null || v === '' || !Number.isFinite(Number(v))) return '—';
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });
}

module.exports = { formatarMoeda, formatarData, formatarDataDeHoje, dataIsoBr, numeroBr };
