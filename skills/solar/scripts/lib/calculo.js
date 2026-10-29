// Usina solar fotovoltaica conectada à rede (micro/minigeração distribuída).
// Fontes: Manual de Engenharia para Sistemas Fotovoltaicos (CRESESB/CEPEL 2014)
// — Eq. 6.28 (potência do gerador), 6.29 (FDI), 6.30–6.32 (strings) e 4.7
// (temperatura do módulo); ABNT NBR 16612 Tabela C.2 (cabos FV); ABNT NBR 16690
// (arranjos FV); ABNT NBR 16274 (comissionamento); REN Aneel 1000/2021 e
// Lei 14.300/2022. O lado CA usa o mesmo motor da skill de elétrica (NBR 5410).

const E = require('../../../_comum/eletrico/calculo');
const { ucDps } = require('../../../_comum/dps');

const FOLGA = 1.1;
const RHO_CC = 0.0225; // Ω·mm²/m — cobre estanhado próximo da temperatura de operação
// Custo de disponibilidade (kWh/mês) do grupo B — REN 1000 (mesmos valores da RN 414, art. 98)
const DISPONIBILIDADE = { monofasico: 30, bifasico: 50, trifasico: 100 };
// NBR 16612, Tabela C.2 — cabos FV a 30 °C ambiente, condutor a 90 °C, modo 1
// (dois unipolares encostados na horizontal)
const CABO_FV = {
  protegido: { 1.5: 26, 2.5: 35, 4: 47, 6: 60, 10: 83, 16: 110 },
  exposto: { 1.5: 23, 2.5: 31, 4: 41, 6: 51, 10: 71, 16: 93 },
};
const SECOES_CC = [4, 6, 10, 16]; // 4 mm² como mínimo de prática para cabo FV de string
const FUSIVEIS_GPV = [10, 12, 15, 16, 20, 25, 30, 32];
const DPS_CC_UCPV = [600, 1000, 1100, 1500];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; // ano de 365 dias
// Temperatura ambiente mínima adotada quando não informada. Mínimas históricas do DF (INMET):
// 1,4 °C no Gama em 19/05/2022 e 1,6 °C em Brasília em 18/07/1975; o módulo, ao amanhecer,
// pode ficar abaixo do ar (irradiação para o céu). Fora do DF, informar a mínima do local.
const TMIN_PADRAO = 0;
const TMIN_DF = 1.4;

const n = (v, padrao) => (v == null || v === '' || Number.isNaN(Number(v)) ? padrao : Number(v));

// Correção de capacidade para temperatura ambiente ≠ 30 °C (isolação 90 °C)
const fatorTemperaturaFv = (ta) => Math.sqrt(Math.max(0, 90 - ta) / 60);

function consumoMedio(consumo = {}) {
  const meses = MESES.map(m => n(consumo[m], null)).filter(v => v != null && v > 0);
  if (meses.length) return { media: meses.reduce((a, b) => a + b, 0) / meses.length, meses: meses.length };
  return { media: n(consumo.media_kwh, 0), meses: 0 };
}

// Strings: com até uma string por MPPT, as strings podem ter tamanhos
// diferentes (cada MPPT é independente); com mais de uma string por MPPT,
// as strings em paralelo precisam ser iguais.
function distribuirStrings(nMod, faixa, entradas, fixo) {
  if (fixo) return Array(Math.ceil(nMod / fixo)).fill(fixo);
  for (let k = Math.min(entradas, Math.floor(nMod / faixa.min)); k >= Math.max(1, Math.ceil(nMod / faixa.max)); k--) {
    const base = Math.floor(nMod / k);
    const tamanhos = Array.from({ length: k }, (_, i) => base + (i < nMod % k ? 1 : 0));
    if (tamanhos.every(t => t >= faixa.min && t <= faixa.max)) return tamanhos;
  }
  let melhor = null;
  for (let ns = faixa.max; ns >= faixa.min; ns--) {
    const total = ns * Math.ceil(nMod / ns);
    if (!melhor || total < melhor.total) melhor = { ns, total };
  }
  return Array(Math.ceil(nMod / melhor.ns)).fill(melhor.ns);
}

const br = (v, c = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });

function calcular(dados) {
  const mod = dados.modulo || {};
  const inv = dados.inversor || {};
  const loc = dados.local || {};
  const s = dados.sistema || {};
  const inst = dados.instalacao || {};
  const avisos = [];

  const wp = n(mod.potencia_wp, 0);
  if (!wp || !n(mod.voc, 0) || !n(mod.vmp, 0) || !n(mod.isc, 0)) throw new Error('Informe os dados do módulo (potência, Voc, Vmp e Isc da folha de dados).');
  if (!n(inv.potencia_ca_w, 0) || !n(inv.vmax_cc, 0) || !n(inv.mppt_min, 0) || !n(inv.mppt_max, 0)) throw new Error('Informe os dados do inversor (potência CA, tensão máxima CC e faixa de MPPT).');

  // ── Energia e potência do gerador (CRESESB Eq. 6.28) ───────────────────
  const ligacao = inst.sistema || 'bifasico';
  const disponibilidade = DISPONIBILIDADE[ligacao] || 50;
  const { media, meses } = consumoMedio(dados.consumo);
  const fracao = n(s.fracao_pct, 100) / 100;
  const energiaCompensar = Math.max(0, media - disponibilidade) * fracao; // kWh/mês
  const hsp = n(loc.hsp, 0);
  if (!hsp) throw new Error('Informe a HSP média anual no plano dos módulos (kWh/m²·dia — CRESESB SunData ou similar).');
  const pr = n(s.pr, 0.8);
  const pfvNecessaria = energiaCompensar ? energiaCompensar / 30 / (hsp * pr) : 0; // kWp
  const nModulos = n(s.n_modulos, 0) || Math.ceil(pfvNecessaria * 1000 / wp);
  if (!nModulos) throw new Error('Informe o consumo (para dimensionar) ou a quantidade de módulos.');

  // ── Temperaturas e tensões (CRESESB Eq. 4.7) ───────────────────────────
  const noct = n(mod.noct, 45);
  const tMinInformada = n(loc.tamb_min, null);
  const tMin = tMinInformada ?? TMIN_PADRAO;
  const noDf = String(dados.cliente?.uf || loc.uf || '').trim().toUpperCase() === 'DF';
  if (tMinInformada == null) avisos.push(`Temperatura mínima do local não informada: adotado ${TMIN_PADRAO} °C para o Voc máximo (no DF a mínima histórica é ${br(TMIN_DF, 1)} °C, INMET) — informe a mínima histórica do local. [CONFERIR]`);
  else if (noDf && tMin > TMIN_DF) avisos.push(`Temperatura mínima adotada de ${br(tMin, 1)} °C acima da mínima histórica do DF (${br(TMIN_DF, 1)} °C, INMET, Gama, 19/05/2022): o Voc máximo da string fica subestimado. [CONFERIR]`);
  const tMaxAmb = n(loc.tamb_max, 35);
  const tModMax = tMaxAmb + (noct - 20) / 800 * 1000;
  // coeficientes de temperatura de tensão do silício são negativos: valor positivo é erro de
  // digitação (sinal) — com β > 0 o Voc a frio cairia em vez de subir e a string passaria do limite
  const bVocInf = n(mod.coef_voc_pct, -0.28);
  const bVmpInf = n(mod.coef_vmp_pct, n(mod.coef_pmax_pct, -0.35));
  if (bVocInf > 0) avisos.push(`Coeficiente de temperatura do Voc informado positivo (+${br(bVocInf, 2)} %/°C): adotado −${br(bVocInf, 2)} %/°C (a tensão do módulo sobe no frio). Confira a folha de dados. [CONFERIR]`);
  if (bVmpInf > 0) avisos.push(`Coeficiente de temperatura do Vmp/Pmax informado positivo (+${br(bVmpInf, 2)} %/°C): adotado −${br(bVmpInf, 2)} %/°C. Confira a folha de dados. [CONFERIR]`);
  const bVoc = -Math.abs(bVocInf) / 100;
  const bVmp = -Math.abs(bVmpInf) / 100;
  const vocTmin = mod.voc * (1 + bVoc * (tMin - 25));
  const vmpTmin = mod.vmp * (1 + bVmp * (tMin - 25));
  const vmpTmax = mod.vmp * (1 + bVmp * (tModMax - 25));
  const vMaxSistema = Math.min(n(inv.vmax_cc, 0), n(mod.tensao_max_sistema, 1500));

  // ── Faixa de módulos em série (CRESESB Eq. 6.30 e 6.31) ────────────────
  const faixa = {
    min: Math.ceil(n(inv.mppt_min, 0) / vmpTmax),
    maxVoc: Math.floor(vMaxSistema / vocTmin),
    maxMppt: Math.floor(n(inv.mppt_max, 0) / vmpTmin),
  };
  faixa.max = Math.min(faixa.maxVoc, faixa.maxMppt);
  if (faixa.min > faixa.max) throw new Error(`Não há número de módulos em série que atenda ao inversor: mínimo ${faixa.min} (MPPT a ${Math.round(tModMax)} °C) e máximo ${faixa.max} (Voc a ${tMin} °C). Troque o inversor ou o módulo.`);
  // ── Inversores (FDI — CRESESB Eq. 6.29: faixa usual 0,75 a 1,05) ───────
  // A quantidade sai da potência estimada; o FDI final usa a potência fechada nas strings.
  const pca = n(inv.potencia_ca_w, 0) / 1000;
  const pfvEstimada = nModulos * wp / 1000;
  let nInv = n(inv.quantidade, 0);
  if (!nInv) {
    const candidatos = Array.from({ length: Math.ceil(pfvEstimada / pca) + 1 }, (_, i) => i + 1);
    nInv = candidatos.reduce((melhor, k) => (Math.abs(k * pca / pfvEstimada - 0.9) < Math.abs(melhor * pca / pfvEstimada - 0.9) ? k : melhor), 1);
  }
  const nMppt = n(inv.n_mppt, 1);
  const entradas = nInv * nMppt;

  // Distribuição das strings nas entradas MPPT (CRESESB Eq. 6.32)
  const strings = distribuirStrings(nModulos, faixa, entradas, n(s.modulos_por_string, 0));
  const ns = Math.max(...strings);
  const nsMin = Math.min(...strings);
  // Voc a frio acima da tensão máxima do inversor/módulo danifica o equipamento: bloqueia
  if (ns > faixa.maxVoc) throw new Error(`String de ${ns} módulos: Voc a ${tMin} °C = ${br(ns * vocTmin, 0)} V acima da tensão máxima de ${br(vMaxSistema, 0)} V (inversor/módulo) — máximo de ${faixa.maxVoc} módulos em série (CRESESB Eq. 6.30). Reduza os módulos por string.`);
  if (nsMin < faixa.min || ns > faixa.max) avisos.push(`String com ${nsMin === ns ? ns : `${nsMin} a ${ns}`} módulos fora da faixa de MPPT (${faixa.min} a ${faixa.max}): o inversor perde rastreamento/limita a potência.`);
  const nStrings = strings.length;
  const nTotal = strings.reduce((a, b) => a + b, 0);
  if (nTotal !== nModulos) avisos.push(`Quantidade ajustada de ${nModulos} para ${nTotal} módulos para fechar ${nStrings} string(s) de ${ns}.`);
  const pfv = nTotal * wp / 1000; // kWp
  const fdi = nInv * pca / pfv;
  if (fdi < 0.75) avisos.push(`FDI ${br(fdi, 2)} abaixo de 0,75: o inversor ficará sobrecarregado (perdas por limitação de potência). [CONFERIR com o fabricante]`);
  if (fdi > 1.05) avisos.push(`FDI ${br(fdi, 2)} acima de 1,05: inversor superdimensionado para o gerador.`);
  const stringsPorMppt = Math.ceil(nStrings / entradas);
  const entradasUsadas = Math.min(entradas, nStrings);
  const iscMax = 1.25 * mod.isc; // corrente máxima da string (NBR 16690 / IEC 62548)
  const limStrings = n(inv.strings_por_mppt, 0);
  if (limStrings && stringsPorMppt > limStrings) avisos.push(`${stringsPorMppt} strings por MPPT excede o limite do inversor (${limStrings}): usar string box com paralelismo ou mais inversores.`);
  const iMpptOp = stringsPorMppt * n(mod.imp, mod.isc * 0.94);
  if (n(inv.imax_mppt, 0) && iMpptOp > inv.imax_mppt) avisos.push(`Corrente de operação por MPPT (${br(iMpptOp, 1)} A) acima da máxima do inversor (${inv.imax_mppt} A) — haverá limitação. [CONFERIR]`);
  const iscMppt = stringsPorMppt * mod.isc;
  if (n(inv.isc_max_mppt, 0) && iscMppt > inv.isc_max_mppt) avisos.push(`Corrente de curto por MPPT (${br(iscMppt, 1)} A) acima do admitido pelo inversor (${inv.isc_max_mppt} A).`);

  // Fusíveis de string: necessários quando a corrente reversa das demais strings
  // em paralelo supera o suportável pelo módulo (na prática, 3 ou mais strings)
  const iReversa = n(mod.corrente_reversa_max_a, 0) || n(mod.fusivel_serie_max_a, 0) || 20;
  const iReversaCalc = Math.max(0, stringsPorMppt - 1) * iscMax;
  const precisaFusivel = stringsPorMppt >= 3 && iReversaCalc > iReversa;
  // texto do critério conforme o caso real (com 3+ strings o fusível pode ser dispensado pela corrente reversa)
  const motivoSemFusivel = precisaFusivel ? null : stringsPorMppt <= 2
    ? 'até 2 strings em paralelo por MPPT'
    : `${stringsPorMppt} strings em paralelo por MPPT, mas a corrente reversa (${stringsPorMppt} − 1) × 1,25 × Isc = ${br(iReversaCalc, 1)} A ≤ ${br(iReversa, 1)} A suportável pelo módulo`;
  const fusivel = precisaFusivel ? FUSIVEIS_GPV.find(f => f >= 1.5 * mod.isc && f <= 2.4 * mod.isc && f <= iReversa) || null : null;
  if (precisaFusivel && !fusivel) avisos.push('Nenhum fusível gPV padronizado entre 1,5 × Isc e 2,4 × Isc e abaixo da corrente reversa do módulo — conferir com o fabricante.');

  // ── Cabos CC (NBR 16612 Tabela C.2 + queda de tensão) ──────────────────
  const exposicao = s.cabo_exposto_sol === false ? 'protegido' : 'exposto';
  const taCabo = n(s.temp_cabo, 50);
  const kt = fatorTemperaturaFv(taCabo);
  const lCc = n(loc.dist_arranjo_inversor_m, n(loc.dist_arranjo_sb_m, 0) + n(loc.dist_sb_inversor_m, 0)) || 20;
  const iProjetoCc = precisaFusivel ? fusivel || iscMax : Math.max(iscMax, (stringsPorMppt - 1) * iscMax);
  const vString = nsMin * mod.vmp; // menor string = maior queda percentual
  const quedaCcMax = n(s.queda_cc_max_pct, 3);
  const iOperacao = n(mod.imp, mod.isc * 0.94);
  let caboCc = null;
  for (const sec of SECOES_CC) {
    const iz = CABO_FV[exposicao][sec] * kt;
    const queda = 2 * lCc * iOperacao * RHO_CC / (sec * vString) * 100;
    if (iz >= iProjetoCc && queda <= quedaCcMax) { caboCc = { secao: sec, iz, queda }; break; }
  }
  if (!caboCc) throw new Error('Nenhuma seção de cabo CC até 16 mm² atende — reduzir a distância ou rever o arranjo.');

  // ── Lado CA: um circuito por inversor (NBR 5410 — motor da elétrica) ───
  const c = E.config({ instalacao: { isolacao: 'PVC', metodo: 'B1', agrupamento: 1, ...inst } });
  const fasesInv = String(inv.fases || (ligacao === 'trifasico' ? '3' : '1'));
  const lig = fasesInv === '3' ? 'FFF' : (c.vfn >= 200 ? 'FN' : 'FF');
  const quedaCaMax = n(inst.queda_ca_max_pct, 2);
  const circuitosCa = Array.from({ length: nInv }, (_, i) => E.dimensionarCircuito({
    id: `INV${i + 1}`, descricao: `Saída do inversor ${i + 1}`, tipo: 'tue', ligacao: lig,
    // corrente de projeto = 1,25 × corrente nominal de saída (regime contínuo) — prática; conferir o manual do inversor
    potencia_va: 1.25 * n(inv.potencia_ca_w, 0) / n(inv.fp, 1), comprimento_m: n(loc.dist_inversor_quadro_m, 10), agrupamento: 1,
  }, c, { minimo: 2.5, limiteQueda: quedaCaMax }));

  // ── Padrão de entrada e enquadramento ──────────────────────────────────
  const inGeral = n(inst.disjuntor_geral_a, 0);
  const pDisp = inGeral ? (ligacao === 'trifasico' ? Math.sqrt(3) * c.vff * inGeral : ligacao === 'bifasico' ? 2 * c.vfn * inGeral : c.vfn * inGeral) / 1000 : null;
  const pcaTotal = nInv * pca;
  if (pDisp != null && pcaTotal > pDisp) avisos.push(`Potência dos inversores (${br(pcaTotal, 1)} kW) acima da potência disponibilizada no padrão (${br(pDisp, 1)} kW): solicitar aumento de carga à distribuidora ou reduzir a potência (REN 1000).`);
  if (pDisp == null) avisos.push('Informe o disjuntor do padrão de entrada para verificar a potência disponibilizada (REN 1000). [CONFERIR]');
  // potência instalada da central FV = menor entre a soma dos módulos (kWp) e a dos inversores (kW)
  // — critério da distribuidora (Neoenergia, cartilha MMGD Brasília) para a REN 1000 [CONFERIR artigo vigente]
  const potenciaInstalada = Math.min(nTotal * wp / 1000, pcaTotal);
  const enquadramento = potenciaInstalada <= 75 ? 'Microgeração distribuída (≤ 75 kW)' : 'Minigeração distribuída (> 75 kW)';

  // ── Geração ────────────────────────────────────────────────────────────
  const hspMensal = MESES.map(m => n((loc.hsp_mensal || {})[m], null));
  // cada mês com os seus dias; o ano é a soma dos meses e a média mensal é o ano ÷ 12 (antes o mês
  // usava 30 dias e o ano 365, e a soma dos meses não batia com o total anual)
  const geracaoMensal = MESES.map((m, i) => ({ mes: m, dias: DIAS_MES[i], hsp: hspMensal[i] ?? hsp, kwh: pfv * (hspMensal[i] ?? hsp) * DIAS_MES[i] * pr }));
  const geracaoAno = geracaoMensal.reduce((s, g) => s + g.kwh, 0);
  const geracaoMes = geracaoAno / 12;
  const cobertura = energiaCompensar ? geracaoMes / (Math.max(0, media - disponibilidade)) : null;
  const tarifa = n(s.tarifa_kwh, 0);
  const economiaMes = tarifa ? Math.min(geracaoMes, Math.max(0, media - disponibilidade)) * tarifa : null;
  avisos.push('Lei 14.300/2022: sobre a energia compensada incide parcela crescente do custo de distribuição (Fio B); a economia é estimada sem esse desconto. [CONFERIR]');
  avisos.push(`HSP de ${br(hsp, 2)} kWh/m²·dia e taxa de desempenho de ${br((pr * 100), 0)} % adotadas — conferir HSP no plano dos módulos (CRESESB SunData) e sombreamento. [CONFERIR]`);

  // Área
  const areaMod = n(mod.comprimento_m, 0) * n(mod.largura_m, 0);
  const area = areaMod ? nTotal * areaMod * 1.15 : null;
  const areaDisp = n(loc.area_disponivel_m2, 0);
  if (area && areaDisp && area > areaDisp) avisos.push(`Área estimada dos módulos (${br(area, 0)} m²) maior que a disponível (${areaDisp} m²).`);

  // DPS CC (classe II): Ucpv ≥ 1,2 × Voc da string; nas duas extremidades se o arranjo
  // estiver a mais de 10 m do inversor (CRESESB, legenda da Figura 7.29)
  const ucpv = DPS_CC_UCPV.find(u => u >= 1.2 * ns * mod.voc) || 1500;
  const dpsCcQtd = entradasUsadas * (lCc > 10 ? 2 : 1);
  const stringBox = s.string_box !== false;

  const materiais = listaMateriais({ mod, inv, nTotal, nInv, nStrings, ns, caboCc, lCc, fusivel, precisaFusivel, ucpv, dpsCcQtd, stringBox, circuitosCa, c, loc, s, entradas: entradasUsadas, ucCa: ucDps({ vfn: c.vfn, vff: c.vff, esquema: c.esquema }).uc });

  return {
    disponibilidade, media, meses, energiaCompensar, hsp, pr, pfvNecessaria, nModulos, nTotal, pfv, wp,
    temperaturas: { tMin, tMaxAmb, tModMax, vocTmin, vmpTmin, vmpTmax, vMaxSistema },
    faixa, strings, ns, nsMin, nStrings, nInv, pca, fdi, nMppt, entradas, entradasUsadas, stringsPorMppt, iscMax, iMpptOp, iscMppt,
    precisaFusivel, fusivel, iReversa, iReversaCalc, motivoSemFusivel, tMinInformada: tMinInformada != null, bVoc, bVmp,
    caboCc: { ...caboCc, exposicao, taCabo, kt, lCc, iProjeto: iProjetoCc, vString },
    circuitosCa, config: c, pDisp, pcaTotal, potenciaInstalada, enquadramento, dpsCa: ucDps({ vfn: c.vfn, vff: c.vff, esquema: c.esquema }),
    geracaoMensal, geracaoMes, geracaoAno, cobertura, tarifa, economiaMes,
    area, ucpv, dpsCcQtd, stringBox, materiais, avisos,
  };
}

function listaMateriais(x) {
  const itens = [];
  const add = (codigo, descricao, unidade, quantidade, referencia) => quantidade > 0 && itens.push({ codigo, descricao, unidade, quantidade: Math.ceil(quantidade), referencia });
  const local = x.loc.tipo_local || 'telhado';
  add('MOD', `Módulo fotovoltaico ${x.mod.potencia_wp} Wp${x.mod.modelo ? ` — ${x.mod.modelo}` : ''} (registro Inmetro)`, 'un', x.nTotal, 'Portaria Inmetro');
  add('INV', `Inversor on-grid ${(x.inv.potencia_ca_w / 1000).toLocaleString('pt-BR')} kW, ${x.inv.n_mppt || 1} MPPT${x.inv.modelo ? ` — ${x.inv.modelo}` : ''} (registro Inmetro)`, 'un', x.nInv, 'Portaria Inmetro');
  add('EST', `Estrutura de fixação para ${local === 'solo' ? 'solo' : local === 'laje' ? 'laje' : `telhado (${x.loc.tipo_telha || 'conferir telha'})`} — kit por módulo`, 'un', x.nTotal, 'Fabricante');
  const metrosPolo = Math.ceil(x.lCc * x.nStrings * FOLGA + x.nStrings * 2);
  add('CC+', `Cabo solar ${x.caboCc.secao} mm² 1,8 kV CC, vermelho (NBR 16612)`, 'm', metrosPolo, 'NBR 16612');
  add('CC-', `Cabo solar ${x.caboCc.secao} mm² 1,8 kV CC, preto (NBR 16612)`, 'm', metrosPolo, 'NBR 16612');
  add('MC4', 'Par de conectores MC4 (macho + fêmea) do mesmo fabricante', 'par', x.nStrings * 2 + 2, 'NBR 16690');
  if (x.stringBox) {
    // uma string box por inversor: entradas = strings que chegam a ela (antes saía o total de MPPTs de todos os inversores)
    add('SB', `String box CC ${Math.ceil(x.nStrings / x.nInv)} entrada(s) de string com chave seccionadora CC sob carga${x.precisaFusivel ? ' e porta-fusíveis' : ''}`, 'un', x.nInv, 'NBR 16690');
  }
  if (x.precisaFusivel) add('FUS', `Fusível gPV ${x.fusivel || '[definir]'} A 1000/1500 V CC (polo + e −)`, 'un', x.nStrings * 2, 'IEC 60269-6');
  add('DPS-CC', `DPS CC classe II Ucpv ${x.ucpv} V`, 'un', x.dpsCcQtd, 'IEC 61643-31');
  const cabosCa = {};
  for (const k of x.circuitosCa) {
    const L = k.comprimento * FOLGA;
    const fases = k.ligacao === 'FFF' ? 3 : k.ligacao === 'FF' ? 2 : 1;
    cabosCa[k.secao] = (cabosCa[k.secao] || 0) + L * fases;
    if (k.secaoNeutro) cabosCa[k.secaoNeutro] = (cabosCa[k.secaoNeutro] || 0) + L;
    cabosCa[k.secaoPE] = (cabosCa[k.secaoPE] || 0) + L;
  }
  for (const [sec, m] of Object.entries(cabosCa)) add('CA', `Cabo de cobre ${String(sec).replace('.', ',')} mm² 750 V (lado CA)`, 'm', m, 'NBR 5410');
  const ca0 = x.circuitosCa[0];
  add('DJ-CA', `Disjuntor termomagnético ${ca0.polos}P ${ca0.disjuntor} A curva C (saída do inversor)`, 'un', x.nInv, 'NBR 5410');
  add('DPS-CA', `DPS CA classe II Uc ≥ ${x.ucCa} V 20 kA`, 'un', (ca0.ligacao === 'FFF' ? 3 : ca0.ligacao === 'FF' ? 2 : 1) + 1, 'NBR 5410, 6.3.5.2.4 e Tabela 49');
  add('QCA', 'Quadro de proteção CA (sobrepor) com barramentos de neutro e terra', 'un', 1, 'NBR 5410');
  add('ELE', 'Eletroduto/eletrocalha para cabos CC e CA (estimativa)', 'm', (x.lCc + (ca0.comprimento || 10)) * FOLGA, 'NBR 16690 / NBR 5410');
  add('EQP', 'Cabo de cobre 6 mm² verde-amarelo para equipotencialização das molduras e estruturas [CONFERIR seção]', 'm', Math.max(10, x.nTotal * 1.5), 'NBR 16690');
  if (!x.s.aterramento_existente) add('HST', 'Haste de aterramento cobreada 5/8" × 2,4 m com caixa de inspeção', 'un', 1, 'NBR 5410');
  add('PLC', 'Placa de advertência "Cuidado — risco de choque elétrico — geração própria" (padrão de entrada)', 'un', 1, 'Norma da distribuidora');
  return itens;
}

module.exports = { calcular, consumoMedio, fatorTemperaturaFv, CABO_FV, DISPONIBILIDADE, MESES, DIAS_MES, TMIN_PADRAO };
