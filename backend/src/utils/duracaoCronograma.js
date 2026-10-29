// Regra de DURAÇÃO de etapa usada no cronograma — compartilhada entre a planilha
// do cliente (planilhaOrcamentoCliente.js, aba "Cronograma", em fórmula Excel) e
// o cronograma físico-financeiro da obra (cronograma.js, em JS). Extraída da
// planilha na versão 2.0 (Fase 3G) para as duas não divergirem:
//   duração (dias úteis) = mão de obra do sistema ÷ (custo do homem-hora × equipe × 8 h),
//   arredondada para cima, mínimo 1 dia útil; dias úteis = segunda a sexta.
// Antes e depois do sistema entram duas etapas fixas (mobilização e testes).

const HORAS_POR_DIA = 8;
const CUSTO_HH_PADRAO = 65; // R$ — [CONFERIR] mesmo padrão da aba Parâmetros da planilha
const EQUIPE_PADRAO = 2; // pessoas em campo

// Teto da duração de UMA etapa (≈ 8 anos de dias úteis). Custo do homem-hora
// digitado errado (0,01 em vez de 65) dava milhões de dias, término no ano
// 30.000+ e um laço de milhões de passos no servidor; acima disto o cronograma
// usa o teto e avisa (revisão de 27/10/2026).
const MAX_DIAS_ETAPA = 2000;

const ETAPA_MOBILIZACAO = { nome: 'Mobilização e conferência do projeto em campo', dias: 1 };
const ETAPA_ENTREGA = { nome: 'Testes, comissionamento e entrega', dias: 2 };

/** Duração calculada SEM o teto (para o aviso dizer quanto deu). */
function duracaoCalculada(maoDeObra, custoHH = CUSTO_HH_PADRAO, equipe = EQUIPE_PADRAO) {
  const mo = Number(maoDeObra) || 0;
  const div = (Number(custoHH) || 0) * (Number(equipe) || 0) * HORAS_POR_DIA;
  if (!(div > 0) || !(mo > 0)) return 1;
  // tolerância de ponto flutuante para não somar um dia a mais em divisões exatas
  return Math.max(1, Math.ceil(mo / div - 1e-9));
}

/** Dias úteis de uma etapa (equivale a MAX(1,ROUNDUP(mo/(hh*equipe*8),0)) do Excel, com o teto). */
function duracaoDiasUteis(maoDeObra, custoHH = CUSTO_HH_PADRAO, equipe = EQUIPE_PADRAO) {
  return Math.min(MAX_DIAS_ETAPA, duracaoCalculada(maoDeObra, custoHH, equipe));
}

/** A mesma regra como fórmula Excel (refs de célula já montadas pelo chamador).
 * Sem o teto: no Excel o valor absurdo não trava nada e fica à vista do usuário. */
function formulaDuracaoExcel(refMaoDeObra, refCustoHH, refEquipe) {
  return `MAX(1,ROUNDUP(${refMaoDeObra}/(${refCustoHH}*${refEquipe}*${HORAS_POR_DIA}),0))`;
}

const ehDiaUtil = (d) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6;

/** Converte 'AAAA-MM-DD' | Date em Date UTC à meia-noite. */
function paraData(v) {
  if (v instanceof Date) return new Date(Date.UTC(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate()));
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
}

const isoData = (d) => d.toISOString().slice(0, 10);

/** WORKDAY(data, n) do Excel (sem feriados): n dias úteis depois (ou antes, n < 0). */
function workday(data, n) {
  const d = paraData(data);
  const passo = n < 0 ? -1 : 1;
  let faltam = Math.abs(n);
  while (faltam > 0) {
    d.setUTCDate(d.getUTCDate() + passo);
    if (ehDiaUtil(d)) faltam--;
  }
  return d;
}

/** Primeiro dia útil em ou depois da data (WORKDAY(data-1,1)). */
const primeiroDiaUtil = (data) => workday(new Date(paraData(data).getTime() - 86400000), 1);

/**
 * Sequência das etapas como na aba Cronograma da planilha: cada uma começa no
 * dia útil seguinte ao término da anterior. etapas: [{ dias }] → [{ inicio, fim }] ISO.
 */
function sequenciarDiasUteis(etapas, dataInicio) {
  let fimAnterior = null;
  return etapas.map((e) => {
    const dias = Math.min(MAX_DIAS_ETAPA, Math.max(1, Math.round(Number(e.dias) || 1)));
    const inicio = fimAnterior ? workday(fimAnterior, 1) : primeiroDiaUtil(dataInicio);
    const fim = workday(inicio, dias - 1);
    fimAnterior = fim;
    return { ...e, dias, inicio: isoData(inicio), fim: isoData(fim) };
  });
}

module.exports = {
  CUSTO_HH_PADRAO, EQUIPE_PADRAO, ETAPA_MOBILIZACAO, ETAPA_ENTREGA, MAX_DIAS_ETAPA,
  duracaoDiasUteis, duracaoCalculada, formulaDuracaoExcel, workday, primeiroDiaUtil, sequenciarDiasUteis, paraData, isoData, ehDiaUtil,
};
