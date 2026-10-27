// Cronograma físico-financeiro e medições da obra (versão 2.0, Fase 3G).
// Regras PURAS (sem banco) — usadas pelo controller, pela planilha Excel e pelo
// boletim de medição em PDF. Testes: testes/cronograma.test.js.
//
// Conceitos:
//   etapa        { id, nome, origem, valor (R$), peso (%), inicio, fim, distribuicao }
//   distribuicao [{ periodo, percentual }] — % da etapa PREVISTO em cada período
//                (período = 1º dia do mês ou segunda-feira da semana, 'AAAA-MM-DD')
//   medição      { id, etapa_id, periodo, percentual_acumulado, valor_medido }
//                — % físico ACUMULADO da etapa até o período e/ou valor medido NO
//                período. Correção = nova medição da mesma etapa/período; a
//                vigente é a de maior id (a anterior fica no histórico).
//   peso físico  critério 'valor' (padrão): valor da etapa ÷ valor total;
//                'manual': o peso digitado (normalizado para somar 100%).
//   % físico da obra   = Σ peso × % físico da etapa
//   % financeiro       = valor medido acumulado ÷ valor total
//   desvio (p.p.)      = % físico realizado − % físico previsto até a data de
//                        referência; > +1 adiantado, < −1 atrasado, senão em dia.
const D = require('./duracaoCronograma');
const { calcularTotais, normalizarItem, ehMaoDeObra, arredondar } = require('./calculoProposta');

const PERIODICIDADES = ['mensal', 'semanal'];
const CRITERIOS_PESO = ['valor', 'manual'];
const TOLERANCIA_DESVIO = 1; // pontos percentuais
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const r2 = (v) => arredondar(v);
const r4 = (v) => Math.round((num(v) + Number.EPSILON) * 10000) / 10000;
const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

// ── períodos ───────────────────────────────────────────────────────────
/** Início do período que contém a data: 1º dia do mês ou segunda-feira. */
function inicioPeriodo(data, periodicidade = 'mensal') {
  const d = D.paraData(data);
  if (!d) return null;
  if (periodicidade === 'semanal') {
    const dow = d.getUTCDay(); // 0 = domingo
    d.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
    return D.isoData(d);
  }
  return D.isoData(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

function proximoPeriodo(periodo, periodicidade = 'mensal') {
  const d = D.paraData(periodo);
  if (periodicidade === 'semanal') d.setUTCDate(d.getUTCDate() + 7);
  else d.setUTCMonth(d.getUTCMonth() + 1, 1);
  return D.isoData(d);
}

function fimPeriodo(periodo, periodicidade = 'mensal') {
  const d = D.paraData(proximoPeriodo(periodo, periodicidade));
  d.setUTCDate(d.getUTCDate() - 1);
  return D.isoData(d);
}

/** Lista contínua de períodos que cobrem [inicio, fim]. */
function periodosEntre(inicio, fim, periodicidade = 'mensal') {
  const a = inicioPeriodo(inicio, periodicidade);
  const b = inicioPeriodo(fim || inicio, periodicidade);
  if (!a || !b) return [];
  const lista = [];
  for (let p = a; p <= b && lista.length < 1000; p = proximoPeriodo(p, periodicidade)) lista.push(p);
  return lista;
}

function rotuloPeriodo(periodo, periodicidade = 'mensal', indice = null) {
  const d = D.paraData(periodo);
  if (!d) return '';
  if (periodicidade === 'semanal') {
    const dm = `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    return indice != null ? `S${indice + 1} · ${dm}` : `sem. ${dm}`;
  }
  return `${MESES[d.getUTCMonth()]}/${d.getUTCFullYear()}`;
}

/** NETWORKDAYS(a, b) do Excel, sem feriados (inclusive nas duas pontas). */
function diasUteisEntre(a, b) {
  const ini = D.paraData(a);
  const fim = D.paraData(b);
  if (!ini || !fim || fim < ini) return 0;
  let n = 0;
  for (const d = new Date(ini); d <= fim; d.setUTCDate(d.getUTCDate() + 1)) if (D.ehDiaUtil(d)) n++;
  return n;
}

/** Ajusta arredondamentos para a lista somar exatamente `alvo` (resíduo no maior). */
function fecharSoma(valores, alvo, arred = r2) {
  const lista = valores.map(v => arred(v));
  if (!lista.length) return lista;
  const residuo = arred(alvo - lista.reduce((s, v) => s + v, 0));
  if (residuo !== 0) {
    let iMaior = 0;
    lista.forEach((v, i) => { if (Math.abs(v) > Math.abs(lista[iMaior])) iMaior = i; });
    lista[iMaior] = arred(lista[iMaior] + residuo);
  }
  return lista;
}

/**
 * Distribuição LINEAR da etapa nos períodos, proporcional aos dias úteis de
 * cada período dentro de [inicio, fim]. Soma 100%.
 */
function distribuirLinear(inicio, fim, periodicidade = 'mensal') {
  if (!inicio) return [];
  const fimEf = fim && fim >= inicio ? fim : inicio;
  const periodos = periodosEntre(inicio, fimEf, periodicidade);
  const total = diasUteisEntre(inicio, fimEf);
  if (!periodos.length) return [];
  if (total === 0) return [{ periodo: periodos[0], percentual: 100 }];
  const brutos = periodos.map(p => {
    const a = p < inicio ? inicio : p;
    const fp = fimPeriodo(p, periodicidade);
    const b = fp > fimEf ? fimEf : fp;
    return (diasUteisEntre(a, b) / total) * 100;
  });
  const pcts = fecharSoma(brutos, 100);
  return periodos.map((p, i) => ({ periodo: p, percentual: pcts[i] })).filter(x => x.percentual !== 0);
}

// ── geração a partir da proposta ───────────────────────────────────────
/**
 * Etapas por SISTEMA da proposta — mesma regra da aba Orçamento/Cronograma da
 * planilha do cliente (planilhaOrcamentoCliente.js): sistema = subgrupo do item
 * ou, sem subgrupo, o nome da seção; na ordem em que aparecem (itens por
 * secao_id, id). Material e mão de obra de cada sistema; valor com BDI e
 * impostos rateados de forma que a soma das etapas = total de calcularTotais.
 */
function etapasDaProposta({ proposta = {}, secoes = [], itens = [] }) {
  const secaoPorId = new Map(secoes.map(s => [s.id, s]));
  const ordenados = [...itens].sort((a, b) => (num(a.secao_id) - num(b.secao_id)) || (num(a.id) - num(b.id)));
  const sistemas = new Map();
  for (const it of ordenados) {
    const secao = secaoPorId.get(it.secao_id);
    const nome = it.subgrupo || secao?.nome || 'Geral';
    if (!sistemas.has(nome)) sistemas.set(nome, { nome, origem: nome, material: 0, mao_obra: 0 });
    const valor = normalizarItem(it, 0).valor_total;
    if (ehMaoDeObra(secao?.nome || '')) sistemas.get(nome).mao_obra += valor;
    else sistemas.get(nome).material += valor;
  }
  // mesmo cálculo da proposta (passa a linha inteira para acompanhar novos parâmetros de BDI/impostos)
  const totais = calcularTotais({ ...proposta, secoes, itens: ordenados.map(it => ({ ...it, sid: it.secao_id })) });
  const mat = num(totais.subtotal_materiais);
  const mo = num(totais.subtotal_mao_obra);
  const base = mat + mo;
  // parte do total que cabe ao material: material + BDI dos materiais + imposto de venda; o resto é da mão de obra.
  // Com BDI diferenciado (bdi_materiais) cada parte leva o seu; sem ele, o BDI único é proporcional.
  const bdiMat = totais.valor_bdi_materiais != null
    ? num(totais.valor_bdi_materiais)
    : (base > 0 ? num(totais.valor_bdi) * (mat / base) : 0);
  const parteMat = base > 0 ? mat + bdiMat + num(totais.valor_imposto_venda) : 0;
  const parteMo = num(totais.total) - parteMat;
  const lista = [...sistemas.values()].map(s => ({
    ...s,
    material: r2(s.material),
    mao_obra: r2(s.mao_obra),
    valorBruto: (mat > 0 ? parteMat * (s.material / mat) : 0) + (mo > 0 ? parteMo * (s.mao_obra / mo) : 0),
  }));
  const valores = fecharSoma(lista.map(s => s.valorBruto), num(totais.total));
  return {
    totais,
    etapas: lista.map(({ valorBruto, ...s }, i) => ({ ...s, valor: valores[i] })),
  };
}

/**
 * Cronograma gerado da proposta: etapas (com as fixas de mobilização e entrega,
 * como na planilha), duração pela regra compartilhada (duracaoCronograma.js),
 * sequenciadas em dias úteis a partir da data de início, distribuição linear.
 */
function gerarCronograma({
  proposta, secoes, itens, dataInicio, periodicidade = 'mensal',
  custoHH = D.CUSTO_HH_PADRAO, equipe = D.EQUIPE_PADRAO, incluirEtapasFixas = true,
}) {
  const { etapas, totais } = etapasDaProposta({ proposta, secoes, itens });
  const base = etapas.map(e => ({ ...e, dias: D.duracaoDiasUteis(e.mao_obra, custoHH, equipe) }));
  const todas = incluirEtapasFixas
    ? [{ nome: D.ETAPA_MOBILIZACAO.nome, origem: null, material: 0, mao_obra: 0, valor: 0, dias: D.ETAPA_MOBILIZACAO.dias },
      ...base,
      { nome: D.ETAPA_ENTREGA.nome, origem: null, material: 0, mao_obra: 0, valor: 0, dias: D.ETAPA_ENTREGA.dias }]
    : base;
  const seq = D.sequenciarDiasUteis(todas, dataInicio);
  return {
    totais,
    etapas: seq.map((e, i) => ({
      ordem: i + 1,
      nome: e.nome,
      origem: e.origem,
      valor: e.valor,
      peso: null,
      material: e.material,
      mao_obra: e.mao_obra,
      dias_uteis: e.dias,
      inicio: e.inicio,
      fim: e.fim,
      distribuicao: distribuirLinear(e.inicio, e.fim, periodicidade),
    })),
  };
}

// ── pesos e medições ───────────────────────────────────────────────────
/** Peso físico (%) de cada etapa, somando 100. */
function pesosEfetivos(etapas, criterio = 'valor') {
  const n = etapas.length;
  if (!n) return [];
  if (criterio === 'manual') {
    const pesos = etapas.map(e => Math.max(0, num(e.peso)));
    const soma = pesos.reduce((s, v) => s + v, 0);
    if (soma > 0) return pesos.map(p => (p / soma) * 100);
  }
  const valores = etapas.map(e => Math.max(0, num(e.valor)));
  const soma = valores.reduce((s, v) => s + v, 0);
  if (soma > 0) return valores.map(v => (v / soma) * 100);
  return etapas.map(() => 100 / n);
}

/** Medição vigente por etapa e período (a de maior id; as demais são histórico). */
function medicoesVigentes(medicoes, periodicidade = 'mensal') {
  const mapa = new Map();
  for (const m of medicoes || []) {
    if (m.etapa_id == null) continue;
    const chave = `${m.etapa_id}|${inicioPeriodo(m.periodo, periodicidade)}`;
    const atual = mapa.get(chave);
    if (!atual || num(m.id) > num(atual.id)) mapa.set(chave, m);
  }
  return mapa;
}

/** Marca no histórico quais medições estão vigentes e quais foram corrigidas. */
function marcarHistorico(medicoes, periodicidade = 'mensal') {
  const vig = medicoesVigentes(medicoes, periodicidade);
  const vigentes = new Set([...vig.values()].map(m => m.id));
  return (medicoes || []).map(m => ({ ...m, vigente: m.etapa_id != null && vigentes.has(m.id) }));
}

// ── cálculo principal ──────────────────────────────────────────────────
/**
 * Previsto × realizado por período e acumulado (curva S), por etapa e da obra.
 * dataReferencia: hoje (padrão) — define o "previsto até agora" e o desvio.
 */
function calcularCronograma({
  etapas = [], medicoes = [], periodicidade = 'mensal', criterioPeso = 'valor', dataReferencia = new Date(),
}) {
  const per = PERIODICIDADES.includes(periodicidade) ? periodicidade : 'mensal';
  // distribuição de cada etapa (normalizada ao período; sem distribuição → linear pelas datas)
  const dist = etapas.map(e => {
    const lista = Array.isArray(e.distribuicao) && e.distribuicao.length
      ? e.distribuicao
      : distribuirLinear(e.inicio, e.fim, per);
    const m = new Map();
    for (const x of lista) {
      const p = inicioPeriodo(x.periodo, per);
      if (p) m.set(p, (m.get(p) || 0) + num(x.percentual));
    }
    return m;
  });
  const vig = medicoesVigentes(medicoes, per);
  const idsEtapas = new Set(etapas.map(e => e.id));

  // conjunto contínuo de períodos: distribuição, datas das etapas e medições
  const marcos = [];
  dist.forEach(m => marcos.push(...m.keys()));
  etapas.forEach(e => { if (e.inicio) marcos.push(inicioPeriodo(e.inicio, per)); if (e.fim) marcos.push(inicioPeriodo(e.fim, per)); });
  for (const m of vig.values()) if (idsEtapas.has(m.etapa_id)) marcos.push(inicioPeriodo(m.periodo, per));
  const validos = marcos.filter(Boolean).sort();
  const periodos = validos.length ? periodosEntre(validos[0], validos[validos.length - 1], per) : [];
  const K = periodos.length;

  const pesos = pesosEfetivos(etapas, criterioPeso);
  const valorTotal = etapas.reduce((s, e) => s + Math.max(0, num(e.valor)), 0);
  const avisos = [];

  const porEtapa = etapas.map((e, i) => {
    const valor = Math.max(0, num(e.valor));
    let acumPrev = 0;
    let acumReal = 0;
    let valorAcum = 0;
    const somaDist = [...dist[i].values()].reduce((s, v) => s + v, 0);
    if (dist[i].size && Math.abs(somaDist - 100) > 0.05) avisos.push(`A distribuição prevista de "${e.nome}" soma ${r2(somaDist)}% (deveria somar 100%).`);
    const serie = periodos.map((p) => {
      const prevPct = dist[i].get(p) || 0;
      acumPrev += prevPct;
      const m = vig.get(`${e.id}|${p}`);
      let valorPeriodo = 0;
      if (m) {
        const anterior = acumReal;
        if (m.percentual_acumulado != null && m.percentual_acumulado !== '') {
          acumReal = limitar(num(m.percentual_acumulado), 0, 100);
          valorPeriodo = m.valor_medido != null && m.valor_medido !== '' ? num(m.valor_medido) : ((acumReal - anterior) * valor) / 100;
        } else if (m.valor_medido != null && m.valor_medido !== '') {
          valorPeriodo = num(m.valor_medido);
          if (valor > 0) acumReal = limitar(anterior + (valorPeriodo / valor) * 100, 0, 100);
        }
      }
      valorAcum += valorPeriodo;
      return {
        periodo: p,
        previsto_pct: r4(prevPct),
        previsto_acum_pct: r4(acumPrev),
        previsto_valor: r2((valor * prevPct) / 100),
        previsto_valor_acum: r2((valor * acumPrev) / 100),
        realizado_acum_pct: r4(acumReal),
        realizado_valor: r2(valorPeriodo),
        realizado_valor_acum: r2(valorAcum),
        medido: !!m,
        medicao_id: m ? m.id : null,
      };
    });
    return { id: e.id, nome: e.nome, origem: e.origem || null, valor: r2(valor), peso: r4(pesos[i] || 0), inicio: e.inicio || null, fim: e.fim || null, serie };
  });

  // obra por período (curva S)
  const curva = periodos.map((p, k) => {
    const soma = (f) => porEtapa.reduce((s, e) => s + f(e.serie[k], e), 0);
    const prevValor = soma(x => x.previsto_valor);
    const prevValorAcum = soma(x => x.previsto_valor_acum);
    const realValor = soma(x => x.realizado_valor);
    const realValorAcum = soma(x => x.realizado_valor_acum);
    return {
      periodo: p,
      rotulo: rotuloPeriodo(p, per, k),
      previsto_valor: r2(prevValor),
      previsto_valor_acum: r2(prevValorAcum),
      previsto_fisico_acum: r4(soma((x, e) => (e.peso * x.previsto_acum_pct) / 100)),
      realizado_valor: r2(realValor),
      realizado_valor_acum: r2(realValorAcum),
      realizado_fisico_acum: r4(soma((x, e) => (e.peso * x.realizado_acum_pct) / 100)),
      financeiro_previsto_acum: valorTotal > 0 ? r4((prevValorAcum / valorTotal) * 100) : 0,
      financeiro_realizado_acum: valorTotal > 0 ? r4((realValorAcum / valorTotal) * 100) : 0,
      tem_medicao: porEtapa.some(e => e.serie[k].medido),
    };
  });

  // resumo na data de referência
  const pRef = inicioPeriodo(dataReferencia, per);
  let kAteRef = -1;
  periodos.forEach((p, k) => { if (p <= pRef) kAteRef = k; });
  let kMed = -1;
  curva.forEach((c, k) => { if (c.tem_medicao) kMed = k; });
  // previsto e realizado comparados no MESMO período: o de referência ou, se já
  // houver medição de período posterior (medição adiantada), o da última medição
  const kReal = Math.max(kAteRef, kMed);
  const kRef = kReal;
  const temMedicao = kMed >= 0;
  const fisicoPrev = kRef >= 0 ? curva[kRef].previsto_fisico_acum : 0;
  const fisicoReal = kReal >= 0 ? curva[kReal].realizado_fisico_acum : 0;
  const desvio = r2(fisicoReal - fisicoPrev);
  const situacaoDe = (dv, prev) => {
    if (!temMedicao) return prev > 0 ? 'atrasado' : 'nao_iniciado';
    if (dv > TOLERANCIA_DESVIO) return 'adiantado';
    if (dv < -TOLERANCIA_DESVIO) return 'atrasado';
    return 'em_dia';
  };
  const cRef = kRef >= 0 ? curva[kRef] : null;
  const noPeriodoRef = curva.find(c => c.periodo === pRef) || null;
  const resumo = {
    data_referencia: D.isoData(D.paraData(dataReferencia) || new Date()),
    periodo_referencia: pRef,
    valor_total: r2(valorTotal),
    fisico_previsto: r2(fisicoPrev),
    fisico_realizado: r2(fisicoReal),
    financeiro_previsto: cRef ? r2(cRef.financeiro_previsto_acum) : 0,
    financeiro_realizado: kReal >= 0 ? r2(curva[kReal].financeiro_realizado_acum) : 0,
    valor_previsto_acum: cRef ? cRef.previsto_valor_acum : 0,
    valor_medido_acum: kReal >= 0 ? curva[kReal].realizado_valor_acum : 0,
    desvio_fisico: desvio,
    desvio_financeiro: r2((kReal >= 0 ? curva[kReal].realizado_valor_acum : 0) - (cRef ? cRef.previsto_valor_acum : 0)),
    situacao: situacaoDe(desvio, fisicoPrev),
    // valor previsto e medido no período de referência; "a medir" = o medido,
    // ou, antes da medição do período, o previsto (o que se espera faturar)
    valor_previsto_periodo: noPeriodoRef ? noPeriodoRef.previsto_valor : 0,
    valor_medido_periodo: noPeriodoRef ? noPeriodoRef.realizado_valor : 0,
    valor_a_medir_periodo: noPeriodoRef ? (noPeriodoRef.tem_medicao ? noPeriodoRef.realizado_valor : noPeriodoRef.previsto_valor) : 0,
    tem_medicao: temMedicao,
    ultimo_periodo_medido: temMedicao ? periodos[kMed] : null,
    inicio: etapas.map(e => e.inicio).filter(Boolean).sort()[0] || null,
    fim: etapas.map(e => e.fim).filter(Boolean).sort().slice(-1)[0] || null,
  };
  porEtapa.forEach(e => {
    const prev = kRef >= 0 ? e.serie[kRef].previsto_acum_pct : 0;
    const real = kReal >= 0 ? e.serie[kReal].realizado_acum_pct : 0;
    e.previsto_ate_ref = r2(prev);
    e.realizado_ate_ref = r2(real);
    e.desvio = r2(real - prev);
    e.situacao = !e.serie.some(x => x.medido)
      ? (prev > 0 ? 'atrasado' : 'nao_iniciado')
      : (real >= 100 ? 'concluida' : situacaoDe(e.desvio, prev));
  });
  return { periodicidade: per, periodos, rotulos: periodos.map((p, k) => rotuloPeriodo(p, per, k)), etapas: porEtapa, curva, resumo, avisos };
}

/**
 * Boletim de medição de um período: por etapa, % e valor anterior, do período,
 * acumulado e saldo. `calc` = saída de calcularCronograma.
 */
function boletimMedicao(calc, periodo) {
  const p = inicioPeriodo(periodo, calc.periodicidade);
  const k = calc.periodos.indexOf(p);
  if (k < 0) return null;
  const numero = calc.curva.slice(0, k + 1).filter(c => c.tem_medicao).length;
  const linhas = calc.etapas.map(e => {
    const atual = e.serie[k];
    const ant = k > 0 ? e.serie[k - 1] : null;
    const pctAnt = ant ? ant.realizado_acum_pct : 0;
    const valorAnt = ant ? ant.realizado_valor_acum : 0;
    return {
      etapa_id: e.id,
      nome: e.nome,
      valor: e.valor,
      peso: e.peso,
      pct_anterior: r2(pctAnt),
      pct_periodo: r2(atual.realizado_acum_pct - pctAnt),
      pct_acumulado: r2(atual.realizado_acum_pct),
      previsto_acum_pct: r2(atual.previsto_acum_pct),
      valor_anterior: r2(valorAnt),
      valor_periodo: atual.realizado_valor,
      valor_acumulado: atual.realizado_valor_acum,
      saldo: r2(e.valor - atual.realizado_valor_acum),
      medido: atual.medido,
    };
  });
  const soma = (f) => r2(linhas.reduce((s, l) => s + f(l), 0));
  const c = calc.curva[k];
  return {
    periodo: p,
    fim_periodo: fimPeriodo(p, calc.periodicidade),
    rotulo: calc.rotulos[k],
    numero,
    linhas,
    totais: {
      valor: soma(l => l.valor),
      valor_anterior: soma(l => l.valor_anterior),
      valor_periodo: soma(l => l.valor_periodo),
      valor_acumulado: soma(l => l.valor_acumulado),
      saldo: soma(l => l.saldo),
    },
    fisico_acumulado: r2(c.realizado_fisico_acum),
    fisico_anterior: r2(k > 0 ? calc.curva[k - 1].realizado_fisico_acum : 0),
    fisico_previsto: r2(c.previsto_fisico_acum),
    financeiro_acumulado: r2(c.financeiro_realizado_acum),
    previsto_periodo: c.previsto_valor,
    tem_medicao: c.tem_medicao,
  };
}

module.exports = {
  PERIODICIDADES, CRITERIOS_PESO, TOLERANCIA_DESVIO,
  inicioPeriodo, proximoPeriodo, fimPeriodo, periodosEntre, rotuloPeriodo, diasUteisEntre, fecharSoma,
  distribuirLinear, etapasDaProposta, gerarCronograma, pesosEfetivos, medicoesVigentes, marcarHistorico,
  calcularCronograma, boletimMedicao,
};
