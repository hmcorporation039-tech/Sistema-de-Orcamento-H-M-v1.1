// Subestação de média tensão (consumidor do Grupo A) — ABNT NBR 14039:2021,
// NBR 15751 (malha de aterramento), NBR 5356 (transformador), REN ANEEL 1000/2021
// e a norma de fornecimento em MT da distribuidora (Neoenergia Brasília, 13,8 kV).
//
// Cálculo: demanda com reserva → transformador comercial; correntes e curto;
// tipo de SE e proteção geral (disjuntor + relé 50/51/50N/51N ou fusível);
// cabo de MT (capacidade + integral de Joule); para-raios; lado de BT (disjuntor
// geral, barramento e cabos trafo→QGBT, com as tabelas da skill de elétrica);
// malha de aterramento (Sverak/Laurent, toque e passo simplificados — IEEE 80);
// medição, demanda contratada, materiais e a sequência do diagrama unifilar.

const fs = require('fs');
const path = require('path');
const T = require('./tabelas');
const ET = require('../../../_comum/eletrico/tabelas');
const E = require('../../../_comum/eletrico/calculo');

const RAIZ3 = Math.sqrt(3);
const arred = (v, c = 2) => (v == null || !Number.isFinite(v) ? v : Math.round(v * 10 ** c) / 10 ** c);
const numero = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const primeiroMaiorIgual = (lista, v) => lista.find(x => x >= v - 1e-9);
const fmt = (v, c = 1) => (v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));

// ── Entradas ───────────────────────────────────────────────────────────────

function config(dados) {
  const f = dados.fornecimento || {};
  const t = dados.transformador || {};
  const cm = dados.cabo_mt || {};
  const p = dados.protecao || {};
  const bt = dados.bt || {};
  const kv = numero(f.tensao_primaria_kv) || 13.8;
  return {
    distribuidora: f.distribuidora || T.DISTRIBUIDORA.nome,
    kv,
    vSec: numero(f.tensao_secundaria_v) || 380,
    vSecFn: numero(f.tensao_secundaria_fn) || ({ 380: 220, 220: 127, 440: 254 })[numero(f.tensao_secundaria_v) || 380] || Math.round((numero(f.tensao_secundaria_v) || 380) / RAIZ3),
    icc3fKa: numero(f.icc_3f_ka),
    sccMva: numero(f.scc_mva),
    iccFtKa: numero(f.icc_ft_ka),
    neutroAterrado: f.neutro_aterrado !== false,
    tipoDesejado: f.tipo_se || 'auto',
    protecaoDesejada: f.protecao || 'auto',
    tEliminacao: numero(f.tempo_eliminacao_s) || 0.5,
    trafo: { kva: numero(t.potencia_kva), z: numero(t.z_pct), isolamento: t.isolamento === 'seco' ? 'seco' : 'oleo', ligacao: t.ligacao || 'Dyn1', fluido: t.fluido || (t.isolamento === 'seco' ? 'seco (resina epóxi)' : 'óleo mineral isolante') },
    caboMt: { L: numero(cm.comprimento_m) || 0, metodo: cm.metodo || 'eletroduto_enterrado', isolacao: cm.isolacao === 'XLPE' ? 'XLPE' : 'EPR', smin: numero(cm.secao_minima_mm2) || T.SECAO_MIN_DISTRIBUIDORA_MT, fc: numero(cm.fator_correcao) || 1, forcada: numero(cm.secao_mm2) },
    rele: { curva: T.CURVAS_IEC[p.curva] ? p.curva : 'MI', fatorFase: numero(p.fator_partida_fase) || 1.2, fatorNeutro: numero(p.fator_partida_neutro) || 0.3, dial: numero(p.dial) || 0.1 },
    bt: { L: numero(bt.comprimento_m) || 10, metodo: bt.metodo || 'F', temperatura: numero(bt.temperatura) ?? 30, quedaMax: numero(bt.queda_max_pct) || 1, fca: numero(bt.fca), xr: numero(bt.xr) || 5 },
  };
}

// ── Demanda ────────────────────────────────────────────────────────────────

// Demanda de um projeto da skill de elétrica (mesmo motor, mesmos fatores)
function demandaDaEletrica(dadosEletrica) {
  const r = E.calcular(dadosEletrica);
  const kva = r.demanda.demandaVa / 1000;
  return { kw: r.demanda.demandaKw, kva, fp: kva ? r.demanda.demandaKw / kva : r.config.fp, nome: dadosEletrica.obra?.nome || dadosEletrica.cliente?.nome || 'Projeto elétrico' };
}

function lerArquivosEletrica(cargas, baseDir) {
  const arquivos = [].concat(cargas.arquivo_eletrica || []).filter(Boolean);
  return arquivos.map(a => {
    const caminho = path.isAbsolute(a) ? a : path.resolve(baseDir || process.cwd(), a);
    if (!fs.existsSync(caminho)) throw new Error(`Arquivo da skill de elétrica não encontrado: ${a}`);
    return JSON.parse(fs.readFileSync(caminho, 'utf8'));
  });
}

function calcularDemanda(dados, opcoes = {}) {
  const cg = dados.cargas || {};
  const fpPadrao = numero(cg.fp_total) || T.DISTRIBUIDORA.fp_referencia;
  const quadros = (cg.quadros || []).filter(q => numero(q.demanda_kw) > 0).map((q, i) => {
    const fp = numero(q.fp) || fpPadrao;
    return { id: q.id || `Q${i + 1}`, descricao: q.descricao || `Quadro ${i + 1}`, kw: Number(q.demanda_kw), fp, kva: Number(q.demanda_kw) / fp, origem: 'informado' };
  });
  const importados = [...[].concat(cg.eletrica || []).filter(Boolean), ...lerArquivosEletrica(cg, opcoes.baseDir)];
  importados.forEach((d, i) => {
    const r = demandaDaEletrica(d);
    quadros.push({ id: `EL${i + 1}`, descricao: `${r.nome} (skill de elétrica)`, kw: r.kw, fp: r.fp, kva: r.kva, origem: 'skill elétrica' });
  });
  const fd = numero(cg.fator_diversidade) || 1;
  let kw;
  let kva;
  let origem;
  if (quadros.length) {
    kw = quadros.reduce((s, q) => s + q.kw, 0) * fd;
    kva = quadros.reduce((s, q) => s + q.kva, 0) * fd; // soma aritmética dos kVA (lado da segurança)
    origem = importados.length ? 'soma dos quadros, com importação da skill de elétrica' : 'soma das demandas por quadro';
  } else if (numero(cg.demanda_total_kw) > 0) {
    kw = Number(cg.demanda_total_kw);
    kva = kw / fpPadrao;
    origem = 'demanda total informada';
  } else {
    throw new Error('Informe a demanda (total em kW, por quadro ou importada da skill de elétrica).');
  }
  const crescimento = numero(cg.crescimento_pct) ?? 20;
  const carregamentoMax = numero(cg.carregamento_max_pct) || 100;
  return {
    quadros, fatorDiversidade: fd, kw, kva, fp: kw / kva, origem, crescimento, carregamentoMax,
    kvaProjeto: kva * (1 + crescimento / 100), kwProjeto: kw * (1 + crescimento / 100),
    cargaInstaladaKw: numero(cg.carga_instalada_kw),
  };
}

// ── Transformador e correntes ──────────────────────────────────────────────

function escolherTransformador(kvaProjeto, { forcado, z, isolamento = 'oleo', carregamentoMax = 100 } = {}) {
  const necessario = kvaProjeto / (carregamentoMax / 100);
  const maior = T.POTENCIAS_TRAFO[T.POTENCIAS_TRAFO.length - 1];
  const kva = forcado || primeiroMaiorIgual(T.POTENCIAS_TRAFO, necessario) || maior;
  return {
    kva, z: z || T.impedanciaTipica(kva, isolamento), zTipica: !z, forcado: !!forcado,
    necessario, carregamento: kvaProjeto / kva, excedeCatalogo: necessario > maior,
  };
}

// In = S / (√3·V); Icc no secundário (barramento infinito) = In / Z = S / (√3·V·Z%)
function correntes(kva, kvPrim, vSec, zPct, sccMva) {
  const inPrim = kva / (RAIZ3 * kvPrim);
  const inSec = kva * 1000 / (RAIZ3 * vSec);
  const iccSecInf = inSec / (zPct / 100);
  const zFontePu = sccMva ? (kva / 1000) / sccMva : 0;
  const iccSec = inSec / (zPct / 100 + zFontePu);
  return { inPrim, inSec, iccSecInfKa: iccSecInf / 1000, iccSecKa: iccSec / 1000, zFontePu, iccSecRefPrim: iccSecInf * vSec / (kvPrim * 1000) };
}

function curtoConcessionaria(c, avisos) {
  let icc3f = c.icc3fKa;
  let scc = c.sccMva;
  let informado = true;
  if (!icc3f && scc) icc3f = scc / (RAIZ3 * c.kv);
  if (!icc3f) {
    informado = false;
    icc3f = 10;
    avisos.push('Nível de curto-circuito no ponto de entrega não informado: adotados 10 kA trifásicos. Solicitar o valor oficial à distribuidora antes de emitir o projeto. [CONFERIR]');
  }
  if (!scc) scc = RAIZ3 * c.kv * icc3f;
  let iccFt = c.iccFtKa;
  if (!iccFt) {
    iccFt = icc3f;
    avisos.push('Curto fase-terra não informado: adotado igual ao trifásico (malha e blindagem dos cabos). [CONFERIR com a distribuidora]');
  }
  return { icc3fKa: icc3f, sccMva: scc, iccFtKa: iccFt, informado };
}

// ── Tipo de subestação e proteção geral ────────────────────────────────────

function tipoSubestacao(kva, desejado) {
  const D = T.DISTRIBUIDORA;
  const recomendado = kva <= D.limite_poste_kva ? 'poste' : 'abrigada';
  if (!desejado || desejado === 'auto') return { tipo: recomendado, recomendado, desejado: 'auto', permitido: true };
  const permitido = !(desejado === 'poste' && kva > D.limite_poste_kva);
  return { tipo: permitido ? desejado : recomendado, recomendado, desejado, permitido };
}

function eloFusivel(kva) {
  return (T.ELO_FUSIVEL_13_8.find(l => kva <= l.ate_kva) || T.ELO_FUSIVEL_13_8[T.ELO_FUSIVEL_13_8.length - 1]).elo;
}

// Chave fusível de distribuição (derivação ou proteção geral em poste): corrente nominal
// ≥ In primária do transformador, capacidade de interrupção ≥ curto no ponto de entrega,
// e o elo da tabela precisa conduzir a In primária.
function chaveFusivel(kva, inPrim, iccKa) {
  const maior = T.CHAVE_FUSIVEL_IN[T.CHAVE_FUSIVEL_IN.length - 1];
  const inChave = primeiroMaiorIgual(T.CHAVE_FUSIVEL_IN, inPrim) || maior;
  const elo = eloFusivel(kva);
  const m = /^(\d+(?:\.\d+)?)K$/.exec(elo);
  const eloContinuo = m ? Number(m[1]) * T.ELO_K_FATOR_CONTINUO : null;
  const ultimaFaixa = kva > T.ELO_FUSIVEL_13_8[T.ELO_FUSIVEL_13_8.length - 2].ate_kva;
  return {
    in: inChave, icnSimKa: T.CHAVE_FUSIVEL_ICN_SIM_KA, elo, eloContinuo,
    atendeCorrente: inChave >= inPrim - 1e-9,
    atendeCurto: iccKa <= T.CHAVE_FUSIVEL_ICN_SIM_KA,
    eloAtende: eloContinuo == null || eloContinuo >= inPrim - 1e-9,
    eloDaDistribuidora: ultimaFaixa,
  };
}

function protecaoMt({ kva, z, inPrim, iccSecRefPrim, curto, tipoSe, c, avisos }) {
  const D = T.DISTRIBUIDORA;
  const classe = T.classeMt(c.kv);
  let modo = c.protecaoDesejada === 'auto' || !c.protecaoDesejada ? (kva <= D.limite_fusivel_kva ? 'fusivel' : 'disjuntor') : c.protecaoDesejada;
  if (modo === 'fusivel' && kva > D.limite_fusivel_kva) {
    avisos.push(`Proteção por fusível não é admitida acima de ${D.limite_fusivel_kva} kVA (NBR 14039 e norma da distribuidora): adotado disjuntor com relés secundários 50/51 e 50N/51N.`);
    modo = 'disjuntor';
  }
  const iAnsi = inPrim * 100 / z;
  const ansi = { i: iAnsi, t: T.tempoAnsi(z), iFt: 0.58 * iAnsi };
  const inrush = { multiplo: T.multiploInrush(kva), i: T.multiploInrush(kva) * inPrim, t: 0.1 };
  const chave = chaveFusivel(kva, inPrim, curto.icc3fKa);
  const base = { modo, ansi, inrush, classe, eloDerivacao: chave.elo, chave };
  // avisos da chave fusível (de derivação ou de proteção geral em poste)
  if (!chave.atendeCorrente) avisos.push(`Corrente primária do transformador (${fmt(inPrim, 1)} A) acima da maior chave fusível de distribuição usual (${chave.in} A): a derivação deve ser definida com a distribuidora (chave/seccionadora de maior corrente). [CONFERIR]`);
  if (!chave.atendeCurto) avisos.push(`Curto no ponto de entrega (${fmt(curto.icc3fKa)} kA) acima da capacidade de interrupção usual de chave fusível tipo expulsão (${fmt(chave.icnSimKa)} kA simétricos): confirmar com a distribuidora o equipamento da derivação (chave de maior capacidade, fusível limitador ou religador). [CONFERIR]`);
  if (!chave.eloAtende) avisos.push(`Elo ${chave.elo} (≈ ${fmt(chave.eloContinuo, 0)} A contínuos) abaixo da corrente primária de ${fmt(inPrim, 1)} A: o elo/fusível da derivação não pode ser o da tabela — definir com a distribuidora. [CONFERIR]`);
  else if (chave.eloDaDistribuidora) avisos.push(`Transformador acima de ${fmt(T.ELO_FUSIVEL_13_8[T.ELO_FUSIVEL_13_8.length - 2].ate_kva)} kVA: o elo de derivação (${chave.elo}) está fora da tabela usual e deve ser definido pela distribuidora na coordenação com o relé. [CONFERIR]`);
  if (modo === 'fusivel') {
    if (tipoSe === 'poste') {
      return { ...base, dispositivo: `Chave fusível de distribuição ${classe.equipamento} kV, ${chave.in} A, capacidade de interrupção ≥ ${fmt(curto.icc3fKa)} kA${chave.atendeCurto ? '' : ' [CONFERIR: acima da capacidade usual de chave tipo expulsão]'}, elo ${base.eloDerivacao}`, elo: base.eloDerivacao };
    }
    const hh = primeiroMaiorIgual(T.FUSIVEL_HH, T.FATOR_HH * inPrim) || T.FUSIVEL_HH[T.FUSIVEL_HH.length - 1];
    return { ...base, hh, dispositivo: `Chave seccionadora tripolar ${classe.equipamento} kV com fusíveis limitadores HH ${fmt(hh)} A (base ${classe.equipamento} kV)` };
  }
  // Disjuntor + relé secundário (ação indireta): ajustes indicativos
  const tc = primeiroMaiorIgual(T.TC_PRIMARIOS, Math.max(inPrim * 1.2, curto.icc3fKa * 1000 / T.FATOR_SOBRECORRENTE_TC)) || T.TC_PRIMARIOS[T.TC_PRIMARIOS.length - 1];
  const i51 = c.rele.fatorFase * inPrim;
  const i50 = 1.1 * Math.max(inrush.i, iccSecRefPrim);
  const i51n = c.rele.fatorNeutro * i51;
  const i50n = 0.5 * i50;
  const t51Ansi = iAnsi >= i50 ? 0.05 : T.tempoCurva(c.rele.curva, c.rele.dial, iAnsi / i51);
  const t51Inrush = inrush.i >= i50 ? 0.05 : T.tempoCurva(c.rele.curva, c.rele.dial, inrush.i / i51);
  const icn = primeiroMaiorIgual(T.DISJ_MT_ICN, curto.icc3fKa) || T.DISJ_MT_ICN[T.DISJ_MT_ICN.length - 1];
  // partidas referidas ao secundário do TC (5 A), em % da nominal do TC
  const pct51 = i51 / tc * 100;
  const pct51n = i51n / tc * 100;
  const checagens = {
    protegeTrafo: t51Ansi < ansi.t,
    naoAtuaInrush: inrush.i < i50 && t51Inrush > inrush.t,
    instantaneoAbaixoIcc: i50 < 0.8 * curto.icc3fKa * 1000,
    disjuntorAtende: curto.icc3fKa <= icn,
    faseNaFaixaTc: pct51 >= T.RELE_PARTIDA_MIN_PCT_TC,
    neutroNaFaixaTc: pct51n >= T.RELE_PARTIDA_MIN_PCT_TC,
  };
  if (!checagens.faseNaFaixaTc || !checagens.neutroNaFaixaTc) {
    const ruins = [!checagens.faseNaFaixaTc && `51 = ${fmt(i51, 1)} A → ${fmt(i51 * 5 / tc, 3)} A no secundário (${fmt(pct51, 1)} % do TC)`, !checagens.neutroNaFaixaTc && `51N = ${fmt(i51n, 1)} A → ${fmt(i51n * 5 / tc, 3)} A no secundário (${fmt(pct51n, 1)} % do TC)`].filter(Boolean);
    avisos.push(`TC ${tc}-5 A escolhido pelo curto (primário ≥ Icc/${T.FATOR_SOBRECORRENTE_TC}) deixa a partida abaixo de ~${T.RELE_PARTIDA_MIN_PCT_TC} % da nominal do TC — ${ruins.join('; ')}: confirmar que o relé admite esse ajuste; senão usar TC de menor relação com fator de sobrecorrente/saturação verificado para ${fmt(curto.icc3fKa)} kA, ou entrada de neutro sensível/TC toroidal. [CONFERIR no catálogo do relé e no estudo de proteção]`);
  }
  if (!checagens.instantaneoAbaixoIcc) avisos.push(`Ajuste do instantâneo de fase (${fmt(i50, 0)} A) próximo do curto da concessionária (${fmt(curto.icc3fKa)} kA): revisar o estudo de proteção. [CONFERIR]`);
  if (!checagens.protegeTrafo) avisos.push(`Curva 51 não passa abaixo do ponto ANSI do transformador (${fmt(iAnsi, 0)} A; ${ansi.t} s): reduzir o dial ou a corrente de partida. [CONFERIR]`);
  if (!checagens.naoAtuaInrush) avisos.push('O relé pode atuar na energização (corrente de magnetização): rever o instantâneo ou o dial. [CONFERIR]');
  if (!checagens.disjuntorAtende) avisos.push(`Curto da concessionária (${fmt(curto.icc3fKa)} kA) acima da capacidade de interrupção usual de disjuntor de MT: consultar fabricante.`);
  return {
    ...base,
    tc, tcRelacao: `${tc}-5 A`, i51, i50, i51n, i50n, t51Ansi, t51Inrush, checagens, pct51, pct51n,
    curva: c.rele.curva, curvaRotulo: T.CURVAS_IEC[c.rele.curva].rotulo, dial: c.rele.dial,
    disjuntor: { un: classe.equipamento, in: T.DISJ_MT_IN[0], icn, nbi: classe.nbi },
    dispositivo: `Disjuntor tripolar ${classe.equipamento} kV, ${T.DISJ_MT_IN[0]} A, ${fmt(icn)} kA, acionado por relé secundário 50/51 e 50N/51N (TC ${tc}-5 A)`,
  };
}

// ── Cabo de MT ─────────────────────────────────────────────────────────────

// Seção mínima pelo curto-circuito (integral de Joule, NBR 14039): S ≥ I·√t / k
function secaoPorCurto(iccKa, t, isolacao = 'EPR') {
  return iccKa * 1000 * Math.sqrt(t) / T.K_CURTO[isolacao];
}

function dimensionarCaboMt({ ib, iProtecao, iccKa, iccFtKa, t, cfg, kv, fp }) {
  const smin = Math.max(T.SECAO_MIN_NORMA_MT, cfg.smin);
  const iProj = Math.max(ib, iProtecao || 0);
  const iz = (s) => (T.capacidadeMt(s, cfg.metodo) || 0) * cfg.fc;
  const sCap = T.SECOES_MT.find(s => iz(s) >= iProj);
  const sCurtoMin = secaoPorCurto(iccKa, t, cfg.isolacao);
  const sCurto = primeiroMaiorIgual(T.SECOES_MT, sCurtoMin);
  const sNorma = primeiroMaiorIgual(T.SECOES_MT, smin);
  if (!sCap || !sCurto) throw new Error('Cabo de MT: nenhuma seção da tabela atende à corrente ou ao curto-circuito — revise os dados.');
  const calculada = Math.max(sNorma, sCap, sCurto);
  const secao = cfg.forcada || calculada;
  const criterio = secao !== calculada ? 'seção informada no formulário'
    : calculada === sCurto && sCurto > sCap && sCurto > sNorma ? 'curto-circuito (integral de Joule)'
      : calculada === sCap && sCap > sNorma ? 'capacidade de condução' : 'seção mínima';
  const R = ET.RHO_COBRE / secao; // Ω/m por fase (aprox. a 90 °C)
  const X = T.X_CABO_MT / 1000;
  const sen = Math.sqrt(Math.max(0, 1 - fp * fp));
  const queda = RAIZ3 * ib * cfg.L * (R * fp + X * sen) / (kv * 1000) * 100;
  return {
    secao, calculada, criterio, smin, sCap, sCurto, sCurtoMin, iz: iz(secao), iProj, ib, metodo: cfg.metodo, L: cfg.L, isolacao: cfg.isolacao,
    k: T.K_CURTO[cfg.isolacao], t, iccKa, queda, blindagemIt: iccFtKa * Math.sqrt(t),
    atende: iz(secao) >= iProj && secao >= sCurtoMin && secao >= smin,
  };
}

// ── Lado de baixa tensão ───────────────────────────────────────────────────

// Cabos do transformador ao QGBT: condutores em paralelo, mesmas tabelas da
// skill de elétrica (NBR 5410, Tabelas 36–42), EPR 90 °C, 3 condutores carregados.
function cabosTrafoQgbt(inDisj, ib, c) {
  const fct = ET.fatorTemperatura(c.bt.temperatura, 'EPR', c.bt.metodo === 'D');
  for (let n = 1; n <= 10; n++) {
    const fca = c.bt.fca || ET.fatorAgrupamento(n);
    for (const s of ET.SECOES.filter(x => x >= (n > 1 ? 50 : 16) && x <= 300)) {
      const izRef = ET.capacidade(s, c.bt.metodo, 3, 'EPR');
      if (izRef == null) continue;
      const iz = izRef * fct * fca * n;
      const queda = RAIZ3 * ET.RHO_COBRE * c.bt.L * ib / (n * s * c.vSec) * 100;
      if (iz >= inDisj && queda <= c.bt.quedaMax) {
        return { tipo: 'cabos', n, secao: s, izRef, iz, fct, fca, queda, secaoNeutro: s, secaoPE: ET.secaoPE(s), metodo: c.bt.metodo, L: c.bt.L, descricao: `${n > 1 ? `${n} × ` : ''}(3 × 1 × ${String(s).replace('.', ',')} + 1 × ${String(s).replace('.', ',')} N + 1 × ${String(ET.secaoPE(s)).replace('.', ',')} PE) mm²` };
      }
    }
  }
  return null; // nenhuma combinação de cabos atende: ladoBt passa para barramento blindado
}

// Barramento blindado (bus way) trafo → QGBT quando os cabos em paralelo não atendem
// (transformadores grandes, sobretudo em 220 V): corrente nominal ≥ disjuntor geral;
// queda de tensão e curto (Icw) pela folha de dados do fabricante [CONFERIR].
function barramentoBlindado(inDisj, c) {
  return {
    tipo: 'barramento_blindado', n: 0, secao: null, secaoPE: null, iz: inDisj, fca: null, queda: null, metodo: 'barramento blindado', L: c.bt.L,
    descricao: `barramento blindado (bus way) trifásico com neutro e PE, corrente nominal ≥ ${inDisj} A [CONFERIR com o fabricante: queda de tensão e Icw]`,
  };
}

function ladoBt(trafo, corr, c, avisos) {
  const maiorDisj = T.DISJ_BT[T.DISJ_BT.length - 1];
  const inDisj = primeiroMaiorIgual(T.DISJ_BT, corr.inSec) || maiorDisj;
  const disjAtende = inDisj >= corr.inSec - 1e-9;
  if (!disjAtende) avisos.push(`Corrente nominal do secundário (${fmt(corr.inSec, 0)} A) acima do maior disjuntor geral de BT da tabela (${maiorDisj} A): o transformador de ${fmt(trafo.kva)} kVA em ${c.vSec} V não tem proteção geral única viável — dividir em dois transformadores/QGBTs ou elevar a tensão secundária. O disjuntor e o barramento listados NÃO atendem. [CONFERIR]`);
  const icu = primeiroMaiorIgual(T.ICU_BT, corr.iccSecInfKa) || T.ICU_BT[T.ICU_BT.length - 1];
  const icuAtende = icu >= corr.iccSecInfKa - 1e-9;
  if (!icuAtende) avisos.push(`Curto no secundário (${fmt(corr.iccSecInfKa)} kA) acima da maior capacidade de interrupção da tabela (${icu} kA): rever o arranjo (dividir o transformador) ou usar limitação de corrente. [CONFERIR]`);
  const kappa = 1.02 + 0.98 * Math.exp(-3 / c.bt.xr); // IEC 60909
  const ipk = kappa * Math.SQRT2 * corr.iccSecInfKa;
  const barramento = T.BARRAMENTOS.find(b => b.a >= inDisj) || T.BARRAMENTOS[T.BARRAMENTOS.length - 1];
  if (barramento.a < inDisj) avisos.push('Corrente do barramento acima da tabela: dimensionar com o fabricante do painel.');
  let cabos = cabosTrafoQgbt(inDisj, corr.inSec, c);
  if (!cabos) {
    cabos = barramentoBlindado(inDisj, c);
    avisos.push(`Cabos trafo → QGBT: nenhuma combinação até 10 condutores de até 300 mm² por fase atende ${inDisj} A no método ${c.bt.metodo} (com os fatores de agrupamento da NBR 5410): adotado barramento blindado (bus way) ≥ ${inDisj} A. Conferir queda de tensão e Icw na folha de dados do fabricante. [CONFERIR]`);
  }
  return {
    inDisj, disjAtende, icu, icuAtende, tipoDisj: inDisj <= 1600 ? 'caixa moldada' : 'aberto (extraível)', kappa, ipk, barramento, icw: corr.iccSecInfKa, cabos,
    tcMedicaoBt: primeiroMaiorIgual([200, 300, 400, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000], corr.inSec),
  };
}

// ── Para-raios ─────────────────────────────────────────────────────────────

// MCOV necessária: neutro efetivamente aterrado → tensão máxima fase-neutro;
// não efetivamente aterrado → tensão máxima entre fases (as fases sãs sobem à tensão
// de linha durante a falta à terra). Ur = menor valor usual com Ur × 0,85 ≥ MCOV
// necessária, nunca abaixo do valor da tabela da classe.
function paraRaios(c, tipoSe, temCabo) {
  const classe = T.classeMt(c.kv);
  const urTabela = c.neutroAterrado ? classe.paraRaiosAterrado : classe.paraRaiosIsolado;
  const vMax = T.FATOR_TENSAO_MAX * c.kv;
  const mcovNecessaria = c.neutroAterrado ? vMax / RAIZ3 : vMax;
  const ur = T.PARA_RAIOS_UR.find(u => u >= urTabela && u * T.PARA_RAIOS_MCOV_UR >= mcovNecessaria - 1e-9) || T.PARA_RAIOS_UR[T.PARA_RAIOS_UR.length - 1];
  const pontos = temCabo ? ['transição aérea-subterrânea (poste de derivação)'] : [tipoSe === 'poste' ? 'junto ao transformador (no poste)' : 'entrada da subestação'];
  return { ur, mcov: arred(ur * T.PARA_RAIOS_MCOV_UR, 1), mcovNecessaria: arred(mcovNecessaria, 2), in: 10, quantidade: 3 * pontos.length, pontos, descricao: `Para-raios de óxido metálico (ZnO) sem centelhador, ${ur} kV, 10 kA, invólucro polimérico (NBR 16050)` };
}

// ── Malha de aterramento (NBR 15751 / IEEE Std 80) ─────────────────────────

// Resistividade aparente do solo em duas camadas (aproximação de Hummel: camadas em
// paralelo até a profundidade de influência) — simplificação [CONFERIR com a NBR 7117]
function resistividadeAparente(rho1, h1, rho2, profundidadeInfluencia) {
  if (!rho2 || !h1 || h1 >= profundidadeInfluencia) return rho1;
  return profundidadeInfluencia / (h1 / rho1 + (profundidadeInfluencia - h1) / rho2);
}

// Sverak (IEEE 80, eq. 57): R = ρ·[1/LT + 1/√(20A)·(1 + 1/(1 + h·√(20/A)))]
function resistenciaSverak(rho, area, lt, h) {
  return rho * (1 / lt + (1 / Math.sqrt(20 * area)) * (1 + 1 / (1 + h * Math.sqrt(20 / area))));
}
// Laurent-Niemann (IEEE 80, eq. 53): R = ρ/4·√(π/A) + ρ/LT
function resistenciaLaurent(rho, area, lt) {
  return (rho / 4) * Math.sqrt(Math.PI / area) + rho / lt;
}

// Tensões de toque e passo admissíveis (critério de Dalziel; IEEE 80 eq. 27–32)
function fatorCamada(rhoSolo, rhoBrita, hs) {
  if (!rhoBrita || !hs) return 1;
  return 1 - 0.09 * (1 - rhoSolo / rhoBrita) / (2 * hs + 0.09);
}
function tensoesAdmissiveis({ rhoSolo, rhoBrita, hs, ts, pesoKg = 50 }) {
  const cs = fatorCamada(rhoSolo, rhoBrita, hs);
  const rs = rhoBrita && hs ? rhoBrita : rhoSolo;
  const k = pesoKg >= 70 ? 0.157 : 0.116;
  return { cs, toque: (1000 + 1.5 * cs * rs) * k / Math.sqrt(ts), passo: (1000 + 6 * cs * rs) * k / Math.sqrt(ts), k };
}

// Tensões de malha (Em) e de passo (Es) — método simplificado da IEEE 80 (16.5),
// malha retangular com hastes no perímetro
function tensoesMalha({ rho, lx, ly, D, h, d, lc, nHastes, lHaste, ig }) {
  const lp = 2 * (lx + ly);
  const area = lx * ly;
  const lr = nHastes * lHaste;
  const na = 2 * lc / lp;
  const nb = Math.sqrt(lp / (4 * Math.sqrt(area)));
  const n = na * nb;
  const kii = nHastes > 0 ? 1 : 1 / (2 * n) ** (2 / n);
  const kh = Math.sqrt(1 + h / 1);
  const km = (1 / (2 * Math.PI)) * (Math.log(D * D / (16 * h * d) + (D + 2 * h) ** 2 / (8 * D * d) - h / (4 * d)) + (kii / kh) * Math.log(8 / (Math.PI * (2 * n - 1))));
  const ki = 0.644 + 0.148 * n;
  const lm = nHastes > 0 ? lc + (1.55 + 1.22 * (lHaste / Math.sqrt(lx * lx + ly * ly))) * lr : lc + lr;
  const ks = (1 / Math.PI) * (1 / (2 * h) + 1 / (D + h) + (1 / D) * (1 - 0.5 ** (n - 2)));
  const ls = 0.75 * lc + 0.85 * lr;
  return { n, na, nb, kii, kh, km, ki, ks, lm, ls, em: rho * km * ki * ig / lm, es: rho * ks * ki * ig / ls };
}

// Seção do condutor da malha (Onderdonk, IEEE 80 eq. 37): S = I·√t / K, K em kA/mm²
function kOnderdonk(tm, ta = 40) {
  const { alfa, rho_uohm_cm: rr, tcap, k0 } = T.COBRE;
  return Math.sqrt((tcap * 1e-4 / (alfa * rr)) * Math.log((k0 + tm) / (k0 + ta)));
}

function malhaAterramento(dados, c, curto, tipoSe, avisos) {
  const a = dados.aterramento || {};
  const D0 = T.DISTRIBUIDORA;
  let rho1 = numero(a.rho1_ohm_m);
  if (!rho1) {
    rho1 = 1000;
    avisos.push('Resistividade do solo não informada: adotado 1.000 Ω·m. Medir pelo método de Wenner (NBR 7117-1) antes de fechar a malha. [CONFERIR]');
  }
  const rho2 = numero(a.rho2_ohm_m);
  const h1 = numero(a.h1_m);
  let lx = numero(a.comprimento_m);
  let ly = numero(a.largura_m);
  if (!lx || !ly) {
    [lx, ly] = tipoSe === 'poste' ? [6, 6] : [10, 6];
    avisos.push(`Área da malha não informada: adotada ${lx} × ${ly} m. [CONFERIR com o arranjo da subestação]`);
  }
  const espac = numero(a.espacamento_m) || 3;
  const h = numero(a.profundidade_m) || 0.5;
  const lHaste = numero(a.comprimento_haste_m) || T.HASTE_PADRAO.comprimento_m;
  const nx = Math.max(2, Math.floor(ly / espac + 1e-9) + 1); // condutores paralelos ao comprimento
  const ny = Math.max(2, Math.floor(lx / espac + 1e-9) + 1); // condutores paralelos à largura
  const dx = ly / (nx - 1);
  const dy = lx / (ny - 1);
  const D = (dx + dy) / 2;
  const lc = nx * lx + ny * ly;
  const lp = 2 * (lx + ly);
  const nHastes = numero(a.n_hastes) || Math.max(4, Math.ceil(lp / 10));
  const lr = nHastes * lHaste;
  const lt = lc + lr;
  const area = lx * ly;
  const rEq = Math.sqrt(area / Math.PI);
  const profInfluencia = Math.max(rEq, h + lHaste);
  const rhoA = resistividadeAparente(rho1, h1, rho2, profInfluencia);
  const rg = resistenciaSverak(rhoA, area, lt, h);
  const rgLaurent = resistenciaLaurent(rhoA, area, lt);
  const rMax = numero(a.resistencia_max_ohm) || D0.resistencia_malha_max_ohm;

  // condutor (curto fase-terra completo, sem fator de divisão)
  const ts = numero(a.tempo_defeito_s) || c.tEliminacao;
  const conexao = T.TEMP_CONEXAO[a.conexao] ? a.conexao : 'exotermica';
  const kO = kOnderdonk(T.TEMP_CONEXAO[conexao]);
  const sCondMin = curto.iccFtKa * Math.sqrt(ts) / kO;
  const sCond = numero(a.secao_condutor_mm2) || Math.max(T.SECAO_MIN_MALHA, primeiroMaiorIgual(ET.SECOES, sCondMin));
  const d = 1.15 * Math.sqrt(4 * sCond / Math.PI) / 1000; // diâmetro do cabo encordoado (m)

  // toque e passo
  const sf = numero(a.fator_divisao) || 1;
  const ig = sf * curto.iccFtKa * 1000;
  // Camada superficial (brita): só entra no cálculo se for informada (ρs e espessura).
  // Sem ela, Cs = 1 e ρs = ρ do solo (IEEE 80 eq. 27/32) — admissíveis bem menores.
  // Antes a skill assumia 3 000 Ω·m / 10 cm em qualquer SE, mesmo sem brita na obra.
  const rhoBritaInf = numero(a.rho_brita_ohm_m);
  const hsInf = numero(a.espessura_brita_m);
  const comBrita = rhoBritaInf > 0 && hsInf > 0;
  const rhoBrita = comBrita ? rhoBritaInf : null;
  const hs = comBrita ? hsInf : 0;
  if (!comBrita) {
    avisos.push(`Camada de brita não informada (resistividade e espessura): toque e passo admissíveis calculados SEM camada superficial (Cs = 1, ρs = ρ do solo = ${fmt(rho1, 0)} Ω·m). Se a SE terá brita, informe ρs (medida ou de catálogo) e a espessura — a brita passa a ser orçada. [CONFERIR]`);
  }
  const pesoKg = numero(a.peso_kg) || 50;
  const adm = tensoesAdmissiveis({ rhoSolo: rho1, rhoBrita, hs, ts, pesoKg });
  const gpr = ig * rg;
  const tm = tensoesMalha({ rho: rhoA, lx, ly, D, h, d, lc, nHastes, lHaste, ig });
  const verif = {
    resistencia: rg <= rMax,
    gprAbaixoToque: gpr <= adm.toque,
    toque: gpr <= adm.toque || tm.em <= adm.toque,
    passo: gpr <= adm.toque || tm.es <= adm.passo,
    condutor: sCond >= sCondMin,
    validade: D >= 2.5 && h >= 0.25 && h <= 2.5 && tm.n <= 25,
  };
  if (!verif.resistencia) avisos.push(`Resistência estimada da malha (${fmt(rg, 2)} Ω) acima de ${fmt(rMax)} Ω: ampliar a malha, usar hastes profundas/prolongáveis ou tratar o solo. [CONFERIR exigência da distribuidora]`);
  if (!verif.toque) avisos.push(`Tensão de toque na malha (${fmt(tm.em, 0)} V) acima da admissível (${fmt(adm.toque, 0)} V): reduzir o espaçamento, ampliar a malha, aumentar a camada de brita ou rever o fator de divisão. [CONFERIR]`);
  if (!verif.passo) avisos.push(`Tensão de passo (${fmt(tm.es, 0)} V) acima da admissível (${fmt(adm.passo, 0)} V). [CONFERIR]`);
  if (!verif.validade) avisos.push('Geometria fora da faixa de validade do método simplificado da IEEE 80 (D ≥ 2,5 m; 0,25 ≤ h ≤ 2,5 m; n ≤ 25): verificar com software de malha. [CONFERIR]');
  return {
    rho1, h1, rho2, rhoA, profInfluencia, rEq, lx, ly, area, espac, nx, ny, dx, dy, D, h, lc, lp, nHastes, lHaste, lr, lt,
    rg, rgLaurent, rMax, ts, conexao, kO, sCondMin, sCond, d, sf, ig, comBrita, rhoBrita, hs, pesoKg, adm, gpr, tm, verif,
    cruzamentos: nx * ny,
  };
}

// ── Medição, demanda contratada, fator de potência ─────────────────────────

function medicao(kva, tipoSe, bt) {
  const D = T.DISTRIBUIDORA;
  const emBt = kva <= D.limite_medicao_bt_kva;
  return emBt
    ? { local: 'BT', descricao: `Medição indireta em baixa tensão (TCs de BT ${bt.tcMedicaoBt}-5 A na saída do transformador, antes do disjuntor geral), em caixa/cubículo padrão da distribuidora`, criterio: `transformador único ≤ ${D.limite_medicao_bt_kva} kVA` }
    : { local: 'MT', descricao: `Medição indireta em média tensão (TPs e TCs da distribuidora em cubículo de medição lacrado, antes da proteção geral)${tipoSe === 'poste' ? ' — em estrutura própria no poste' : ''}`, criterio: `potência > ${D.limite_medicao_bt_kva} kVA` };
}

function demandaContratada(dem) {
  const D = T.DISTRIBUIDORA;
  const sugerida = Math.max(D.demanda_min_contratada_kw, Math.ceil(dem.kw / 5) * 5);
  const futura = Math.max(D.demanda_min_contratada_kw, Math.ceil(dem.kwProjeto / 5) * 5);
  const fpAlvo = 0.95;
  const qc = dem.fp < D.fp_referencia ? dem.kw * (Math.tan(Math.acos(dem.fp)) - Math.tan(Math.acos(fpAlvo))) : 0;
  return { sugerida, futura, limiteUltrapassagem: sugerida * (1 + D.tolerancia_ultrapassagem), fp: dem.fp, fpReferencia: D.fp_referencia, bancoKvar: qc > 0 ? Math.ceil(qc / 5) * 5 : 0, fpAlvo };
}

// ── Materiais ──────────────────────────────────────────────────────────────

function listaMateriais(x) {
  const itens = [];
  const add = (codigo, descricao, unidade, quantidade, referencia) => { if (quantidade > 0) itens.push({ codigo, descricao, unidade, quantidade: arred(quantidade, 1), referencia }); };
  const { c, trafo, se, prot, cabo, pr, bt, malha, med } = x;
  const cl = prot.classe;
  const kvTxt = String(c.kv).replace('.', ',');
  add('TR', `Transformador trifásico ${fmt(trafo.kva)} kVA, ${kvTxt} kV – ${c.vSec}/${c.vSecFn} V, ${trafo.ligacao}, Z ${fmt(trafo.z)} %, ${trafo.isolamento === 'seco' ? 'a seco (resina epóxi)' : 'imerso em óleo isolante'} (NBR 5356)`, 'un', 1, 'NBR 5356; NBR 14039');
  if (se.tipo === 'poste') {
    add('POSTE', 'Poste de concreto duplo T 11 m / 600 daN para subestação aérea (conforme padrão da distribuidora) [CONFERIR]', 'un', 1, 'Norma da distribuidora');
    add('ESTR', 'Estrutura e ferragens para transformador em poste (cruzetas, suporte, isoladores, conectores)', 'vb', 1, 'Norma da distribuidora');
  } else if (se.tipo === 'blindada') {
    add('CUB', `Cabine/subestação blindada ${cl.equipamento} kV (cubículos de entrada${med.local === 'MT' ? ', medição' : ''}, proteção e transformação), IEC 62271-200`, 'un', 1, 'NBR IEC 62271-200; NBR 14039');
  } else if (se.tipo === 'abrigada') {
    add('CIVIL', 'Obra civil da subestação abrigada (alvenaria, laje, porta metálica com abertura para fora, ventilação, canaletas, caixa de contenção de óleo) [CONFERIR projeto civil]', 'vb', 1, 'NBR 14039; norma da distribuidora');
    add('CUB', `Cubículos/postos de ${med.local === 'MT' ? 'medição, ' : ''}proteção e transformação com telas de proteção e barramento de MT ${cl.equipamento} kV`, 'vb', 1, 'NBR 14039');
  } else {
    add('ESTR', `Estruturas metálicas/concreto para a subestação ao tempo ${cl.equipamento} kV (suportes de equipamentos e barramento)`, 'vb', 1, 'NBR 14039');
    add('CERCA', 'Cerca/alambrado com portão e placas de advertência, aterrados à malha', 'm', Math.ceil(malha.lp), 'NBR 14039; NR-10');
  }
  // brita: orçada sempre que a camada entrou no cálculo de toque e passo
  if (malha.comBrita) add('BRITA', `Brita nº 2 (camada de ${fmt(malha.hs * 100, 0)} cm, ρs ${fmt(malha.rhoBrita, 0)} Ω·m) sobre a área da malha — premissa do cálculo de toque e passo`, 'm³', Math.ceil(malha.area * malha.hs), 'NBR 15751');
  // entrada / derivação (em SE em poste com disjuntor, as chaves fusíveis fazem o seccionamento visível a montante)
  const ch = prot.chave;
  const icTxt = `≥ ${fmt(x.curto.icc3fKa)} kA${ch.atendeCurto ? '' : ' [CONFERIR: acima da capacidade usual de chave tipo expulsão]'}`;
  if (cabo || se.tipo !== 'poste' || prot.modo === 'disjuntor') {
    add('CHF', `Chave fusível de distribuição ${cl.equipamento} kV, ${ch.in} A, ${icTxt}, com elo ${prot.eloDerivacao} — derivação${se.tipo === 'poste' && prot.modo === 'disjuntor' ? ' e seccionamento visível a montante do disjuntor' : ''} [CONFERIR com a distribuidora]`, 'un', 3, 'Norma da distribuidora');
  } else if (prot.modo === 'fusivel') {
    add('CHF', `Chave fusível de distribuição ${cl.equipamento} kV, ${ch.in} A, ${icTxt}, com elo ${prot.elo}`, 'un', 3, 'NBR 14039; norma da distribuidora');
  }
  add('PR', pr.descricao, 'un', pr.quantidade, 'NBR 14039; NBR 16050');
  if (cabo) {
    add('CABO-MT', `Cabo de potência unipolar de cobre ${cabo.secao} mm², ${cl.cabo}, isolação ${cabo.isolacao} 90 °C, com blindagem (NBR ${cabo.isolacao === 'XLPE' ? '7287' : '7286'})`, 'm', Math.ceil(3 * (cabo.L * 1.1 + 6)), 'NBR 14039');
    add('TERM-EXT', `Terminação (mufla) para uso externo ${cl.cabo}, cabo ${cabo.secao} mm²`, 'un', 3, 'NBR 14039');
    add('TERM-INT', `Terminação (mufla) para uso interno ${cl.cabo}, cabo ${cabo.secao} mm²`, 'un', 3, 'NBR 14039');
    add('ELE-MT', 'Eletroduto de PEAD corrugado / aço galvanizado para o ramal subterrâneo de MT (inclui descida no poste)', 'm', Math.ceil(cabo.L + 6), 'NBR 14039; norma da distribuidora');
    add('CXP-MT', 'Caixa de passagem para cabos de MT (padrão da distribuidora) [CONFERIR espaçamento]', 'un', Math.max(1, Math.ceil(cabo.L / 40) + 1), 'Norma da distribuidora');
  }
  // proteção geral
  if (prot.modo === 'disjuntor') {
    if (se.tipo !== 'poste') add('SEC', `Chave seccionadora tripolar ${cl.equipamento} kV, 400 A, comando manual, com intertravamento`, 'un', 1, 'NBR 14039');
    add('DJ-MT', `Disjuntor tripolar de MT ${prot.disjuntor.un} kV, ${prot.disjuntor.in} A, ${fmt(prot.disjuntor.icn)} kA, NBI ${prot.disjuntor.nbi} kV (NBR IEC 62271-100)`, 'un', 1, 'NBR 14039');
    add('RELE', 'Relé secundário digital de sobrecorrente 50/51 e 50N/51N (IEC 60255), com registro de eventos', 'un', 1, 'NBR 14039; norma da distribuidora');
    add('TC', `Transformador de corrente de proteção ${prot.tcRelacao}, ${cl.equipamento} kV, 10B100 / 10P20`, 'un', 3, 'NBR 6856');
    add('FONTE', 'Fonte de alimentação do relé (nobreak dedicado ou fonte capacitiva com TP auxiliar)', 'un', 1, 'Norma da distribuidora');
  } else if (se.tipo !== 'poste') {
    add('SEC', `Chave seccionadora tripolar ${cl.equipamento} kV, 400 A, comando manual, para fusíveis HH`, 'un', 1, 'NBR 14039');
    add('HH', `Fusível limitador HH ${fmt(prot.hh)} A, ${cl.equipamento} kV`, 'un', 3 + 3, 'IEC 60282-1 (3 instalados + 3 reserva)');
  }
  // medição
  add('MED', med.local === 'MT' ? 'Cubículo/caixa de medição em MT padrão da distribuidora (TPs/TCs e medidor fornecidos pela distribuidora) [CONFERIR]' : 'Caixa de medição indireta em BT padrão da distribuidora (TCs e medidor fornecidos pela distribuidora) [CONFERIR]', 'un', 1, 'Norma da distribuidora');
  // baixa tensão
  const cb = bt.cabos;
  const Lbt = cb.L * 1.1;
  if (cb.tipo === 'barramento_blindado') {
    add('BUSWAY', `Barramento blindado (bus way) trifásico com neutro e PE, ${bt.inDisj} A, ${c.vSec} V, Icw ≥ ${fmt(bt.icw)} kA, com flanges de conexão ao transformador e ao QGBT [CONFERIR com o fabricante]`, 'm', Math.ceil(Lbt), 'NBR IEC 61439-6; NBR 5410');
  } else {
    add(`CAB-BT-${cb.secao}`, `Cabo de cobre flexível ${String(cb.secao).replace('.', ',')} mm² 0,6/1 kV EPR/XLPE 90 °C (fases e neutro, trafo → QGBT)`, 'm', Math.ceil(4 * cb.n * Lbt), 'NBR 5410, 6.2');
    add(`CAB-BT-${cb.secaoPE}`, `Cabo de cobre flexível ${String(cb.secaoPE).replace('.', ',')} mm² 0,6/1 kV verde-amarelo (PE, trafo → QGBT)`, 'm', Math.ceil(cb.n * Lbt), 'NBR 5410, Tabela 58');
  }
  add('DJ-BT', `Disjuntor geral de BT tripolar ${bt.inDisj} A, Icu ≥ ${bt.icu} kA, ${bt.tipoDisj}`, 'un', 1, 'NBR 5410, 5.3.4; NBR IEC 60947-2');
  add('QGBT', `Quadro geral de BT (QGBT) com barramento de cobre ${bt.barramento.barra} por fase, Icw ≥ ${fmt(bt.icw)} kA, DPS classe I/II e barra de terra`, 'un', 1, 'NBR IEC 61439; NBR 5410');
  // aterramento
  add('CABO-NU', `Cabo de cobre nu ${malha.sCond} mm² para malha de aterramento e ligações das massas`, 'm', Math.ceil(malha.lc * 1.15), 'NBR 15751');
  add('HASTE', T.HASTE_PADRAO.descricao.replace('2,40', String(malha.lHaste).replace('.', ',')), 'un', malha.nHastes, 'NBR 15751; NBR 13571');
  add('CX-INSP', 'Caixa de inspeção de aterramento com tampa (Ø 300 mm)', 'un', malha.nHastes, 'NBR 15751');
  add('SOLDA', malha.conexao === 'exotermica' ? 'Conexão por solda exotérmica (cartucho + molde) — cruzamentos, hastes e derivações' : 'Conector de aterramento (compressão/aparafusado) — cruzamentos, hastes e derivações', 'un', malha.cruzamentos + malha.nHastes + 10, 'NBR 15751');
  // segurança
  if (se.tipo !== 'poste') {
    add('EPC-TAP', `Tapete isolante de borracha ${cl.equipamento} kV (frente dos comandos)`, 'un', 1, 'NR-10, 10.2.8');
    add('EPC-LUZ', 'Luminária de emergência autônoma para a subestação', 'un', 2, 'NBR 14039; NBR 10898');
    add('EPC-EXT', 'Extintor de CO₂ 6 kg com suporte e sinalização', 'un', 1, 'NBR 14039; norma do Corpo de Bombeiros');
  }
  add('EPC-VARA', `Vara/bastão de manobra ${cl.equipamento} kV`, 'un', 1, 'NR-10, 10.2.8');
  add('EPC-DET', `Detector de ausência de tensão ${cl.equipamento} kV`, 'un', 1, 'NR-10, 10.5');
  add('EPC-ATT', `Conjunto de aterramento temporário ${cl.equipamento} kV`, 'un', 1, 'NR-10, 10.5');
  add('PLACA', 'Placas de advertência "PERIGO — ALTA TENSÃO" e diagrama unifilar afixado', 'vb', 1, 'NR-10, 10.10; NBR 14039');
  if (x.contrato.bancoKvar) add('CAP', `Banco de capacitores automático ${x.contrato.bancoKvar} kvar, ${c.vSec} V (correção do FP para ${String(x.contrato.fpAlvo).replace('.', ',')})`, 'un', 1, 'REN 1000/2021 (FP de referência 0,92)');
  return itens;
}

// ── Diagrama unifilar (sequência para o QElectroTech) ──────────────────────

function unifilar(x) {
  const { c, trafo, se, prot, cabo, pr, bt, malha, med, curto, dem } = x;
  const el = [];
  // ligacao: 'serie' (no caminho de potência), 'derivacao' (para a terra, no nó do elemento série anterior) ou 'auxiliar' (comando/medição)
  const add = (id, tipo, rotulo, dados, ligacao = 'serie') => {
    const no = ligacao === 'serie' ? undefined : [...el].reverse().find(e => e.ligacao === 'serie')?.id;
    el.push({ ordem: el.length + 1, id, tipo, rotulo, ligacao, ...(no ? { no } : {}), dados });
  };
  add('PE', 'ponto_entrega', `Ponto de entrega — ${c.distribuidora} ${String(c.kv).replace('.', ',')} kV`, { tensao_kv: c.kv, icc_3f_ka: arred(curto.icc3fKa), icc_ft_ka: arred(curto.iccFtKa), scc_mva: arred(curto.sccMva, 1) });
  if (cabo || se.tipo !== 'poste' || prot.modo === 'disjuntor') add('CF1', 'chave_fusivel', `Chave fusível de derivação 3 × ${prot.classe.equipamento} kV ${prot.chave.in} A — elo ${prot.eloDerivacao}`, { quantidade: 3, elo: prot.eloDerivacao, in_a: prot.chave.in });
  add('PR1', 'para_raios', `Para-raios ${pr.ur} kV ${pr.in} kA (3×)`, { ur_kv: pr.ur, mcov_kv: pr.mcov, in_ka: pr.in, quantidade: 3, local: pr.pontos[0], para: 'malha' }, 'derivacao');
  if (cabo) add('CMT', 'cabo_mt', `Cabo 3 × 1 × ${cabo.secao} mm² ${prot.classe.cabo} ${cabo.isolacao} — ${fmt(cabo.L, 0)} m`, { secao_mm2: cabo.secao, comprimento_m: cabo.L, classe: prot.classe.cabo, metodo: cabo.metodo, terminacoes: 6 });
  if (med.local === 'MT') add('MED', 'medicao_mt', 'Medição indireta em MT (TPs e TCs da distribuidora)', { local: 'MT' });
  if (prot.modo === 'disjuntor') {
    if (se.tipo !== 'poste') add('SC1', 'seccionadora', `Seccionadora tripolar ${prot.classe.equipamento} kV 400 A`, { in_a: 400 });
    add('TC1', 'tc', `TC de proteção ${prot.tcRelacao} (3×)`, { relacao: prot.tcRelacao, quantidade: 3 });
    add('DJ1', 'disjuntor_mt', `Disjuntor ${prot.disjuntor.un} kV ${prot.disjuntor.in} A ${fmt(prot.disjuntor.icn)} kA`, { ...prot.disjuntor });
    add('RL1', 'rele', 'Relé 50/51 – 50N/51N', { funcoes: ['50', '51', '50N', '51N'], curva: prot.curva, dial: prot.dial, i51_a: arred(prot.i51, 1), i50_a: arred(prot.i50, 0), i51n_a: arred(prot.i51n, 1), i50n_a: arred(prot.i50n, 0), entrada: 'TC1', atua_em: 'DJ1' }, 'auxiliar');
  } else if (prot.hh) {
    add('SC1', 'seccionadora_fusivel', `Seccionadora com fusíveis HH ${fmt(prot.hh)} A`, { fusivel_a: prot.hh });
  } else {
    add('CF2', 'chave_fusivel', `Chave fusível ${prot.classe.equipamento} kV ${prot.chave.in} A — elo ${prot.elo}`, { elo: prot.elo, quantidade: 3, in_a: prot.chave.in });
  }
  add('TR1', 'transformador', `Transformador ${fmt(trafo.kva)} kVA ${String(c.kv).replace('.', ',')} kV/${c.vSec}-${c.vSecFn} V ${trafo.ligacao} Z ${fmt(trafo.z)} %`, { kva: trafo.kva, primario_kv: c.kv, secundario_v: c.vSec, ligacao: trafo.ligacao, z_pct: trafo.z, isolamento: trafo.isolamento, neutro_aterrado: true });
  if (med.local === 'BT') add('MED', 'medicao_bt', `Medição indireta em BT (TCs ${bt.tcMedicaoBt}-5 A)`, { local: 'BT', tc: `${bt.tcMedicaoBt}-5 A` });
  if (bt.cabos.tipo === 'barramento_blindado') add('CBT', 'barramento_blindado', `Barramento blindado ≥ ${bt.inDisj} A — ${fmt(bt.cabos.L, 0)} m`, { in_a: bt.inDisj, comprimento_m: bt.cabos.L });
  else add('CBT', 'cabo_bt', `${bt.cabos.descricao} — ${fmt(bt.cabos.L, 0)} m`, { condutores_por_fase: bt.cabos.n, secao_mm2: bt.cabos.secao, pe_mm2: bt.cabos.secaoPE, comprimento_m: bt.cabos.L });
  add('DJG', 'disjuntor_bt', `Disjuntor geral BT ${bt.inDisj} A ${bt.icu} kA`, { in_a: bt.inDisj, icu_ka: bt.icu, tipo: bt.tipoDisj });
  add('QGBT', 'barramento_bt', `QGBT — barramento ${bt.barramento.barra} (${c.vSec}/${c.vSecFn} V)`, { barra: bt.barramento.barra, icw_ka: arred(bt.icw), ipk_ka: arred(bt.ipk) });
  const serie = el.filter(e => e.ligacao === 'serie');
  const saidas = dem.quadros.map(q => ({ id: q.id, descricao: q.descricao, demanda_kw: arred(q.kw, 1), fp: arred(q.fp, 2) }));
  return {
    descricao: 'Equipamentos do ponto de entrega ao QGBT na ordem do diagrama unifilar. Elementos "serie" formam o caminho de potência (ligacoes); "derivacao" sai do nó indicado para a terra; "auxiliar" é comando (TC → relé → disparo do disjuntor).',
    elementos: el,
    ligacoes: serie.slice(1).map((e, i) => [serie[i].id, e.id]),
    derivacoes: el.filter(e => e.ligacao === 'derivacao').map(e => ({ de: e.no, elemento: e.id, para: 'malha de aterramento' })),
    comandos: prot.modo === 'disjuntor' ? [{ de: 'TC1', para: 'RL1', sinal: 'corrente secundária (5 A)' }, { de: 'RL1', para: 'DJ1', sinal: 'disparo (bobina de abertura)' }] : [],
    saidas_qgbt: saidas,
    aterramento: { malha: `${fmt(malha.lx)} × ${fmt(malha.ly)} m, cabo ${malha.sCond} mm², ${malha.nHastes} hastes`, resistencia_ohm: arred(malha.rg, 2), neutro_trafo: 'neutro do secundário ligado à malha (TN-S a partir do QGBT)' },
  };
}

// ── Cálculo completo ───────────────────────────────────────────────────────

function calcular(dados, opcoes = {}) {
  const c = config(dados);
  const avisos = [];
  const dem = calcularDemanda(dados, opcoes);
  const trafo = { ...escolherTransformador(dem.kvaProjeto, { forcado: c.trafo.kva, z: c.trafo.z, isolamento: c.trafo.isolamento, carregamentoMax: dem.carregamentoMax }), isolamento: c.trafo.isolamento, ligacao: c.trafo.ligacao, fluido: c.trafo.fluido };
  const curto = curtoConcessionaria(c, avisos);
  const corr = correntes(trafo.kva, c.kv, c.vSec, trafo.z, curto.sccMva);
  const se = tipoSubestacao(trafo.kva, c.tipoDesejado);
  if (!se.permitido) avisos.push(`Subestação em poste não é admitida para ${fmt(trafo.kva)} kVA (limite ${T.DISTRIBUIDORA.limite_poste_kva} kVA na norma da distribuidora): adotada SE ${T.TIPOS_SE[se.tipo].toLowerCase()}. [CONFERIR]`);
  const prot = protecaoMt({ kva: trafo.kva, z: trafo.z, inPrim: corr.inPrim, iccSecRefPrim: corr.iccSecRefPrim, curto, tipoSe: se.tipo, c, avisos });
  const temCabo = c.caboMt.L > 0 && se.tipo !== 'poste';
  const cabo = temCabo ? dimensionarCaboMt({ ib: corr.inPrim, iProtecao: prot.modo === 'disjuntor' ? prot.i51 : prot.hh, iccKa: curto.icc3fKa, iccFtKa: curto.iccFtKa, t: c.tEliminacao, cfg: c.caboMt, kv: c.kv, fp: dem.fp }) : null;
  if (cabo && !cabo.atende) avisos.push(`Cabo de MT informado (${cabo.secao} mm²) não atende: mínimo ${cabo.calculada} mm² (${cabo.criterio}).`);
  if (!temCabo && se.tipo !== 'poste') avisos.push('Comprimento do ramal de MT (ponto de entrega → SE) não informado: cabo de MT não dimensionado. [CONFERIR]');
  const pr = paraRaios(c, se.tipo, temCabo);
  const bt = ladoBt(trafo, corr, c, avisos);
  const malha = malhaAterramento(dados, c, curto, se.tipo, avisos);
  const med = medicao(trafo.kva, se.tipo, bt);
  const contrato = demandaContratada(dem);

  const D = T.DISTRIBUIDORA;
  if (trafo.excedeCatalogo) avisos.push(`Demanda de projeto (${fmt(dem.kvaProjeto, 0)} kVA) acima do maior transformador da tabela: dividir em mais de um transformador.`);
  if (trafo.carregamento > 1) avisos.push(`Carregamento do transformador ${fmt(trafo.carregamento * 100, 0)} % com o crescimento previsto: escolher potência maior.`);
  if (trafo.zTipica) avisos.push(`Impedância do transformador adotada como típica (${fmt(trafo.z)} %): usar o valor da placa/folha de dados do fabricante. [CONFERIR]`);
  if (dem.kw > D.demanda_max_mt_kw) avisos.push(`Demanda acima de ${D.demanda_max_mt_kw} kW: a REN 1000/2021 (art. 23) prevê atendimento em tensão ≥ 69 kV. [CONFERIR]`);
  if (dem.cargaInstaladaKw != null && dem.cargaInstaladaKw <= D.carga_min_mt_kw) avisos.push(`Carga instalada ${fmt(dem.cargaInstaladaKw)} kW ≤ ${D.carga_min_mt_kw} kW: pela REN 1000/2021 (art. 23) o atendimento seria em BT, salvo opção do consumidor/critério da distribuidora. [CONFERIR]`);
  if (dem.cargaInstaladaKw == null) avisos.push('Carga instalada (kW) não informada — necessária para o pedido de ligação e para o enquadramento da REN 1000/2021 (art. 23). [CONFERIR]');
  if (contrato.bancoKvar) avisos.push(`Fator de potência ${fmt(dem.fp, 2)} abaixo de ${fmt(D.fp_referencia, 2)}: prever banco de capacitores de ~${contrato.bancoKvar} kvar para evitar cobrança de excedente reativo (REN 1000/2021).`);
  avisos.push(`Limites de potência por tipo de SE, proteção e medição conforme a ${D.norma}.`);
  if (prot.modo === 'disjuntor') avisos.push('Ajustes do relé indicativos: os definitivos saem do estudo de proteção e seletividade aprovado pela distribuidora. [CONFERIR]');

  const x = { c, dem, trafo, curto, corr, se, prot, cabo, pr, bt, malha, med, contrato };
  x.materiais = listaMateriais(x);
  x.unifilar = unifilar(x);
  x.avisos = avisos;
  return x;
}

module.exports = {
  calcular, config, calcularDemanda, demandaDaEletrica, escolherTransformador, correntes, tipoSubestacao, protecaoMt, eloFusivel,
  secaoPorCurto, dimensionarCaboMt, cabosTrafoQgbt, paraRaios, resistividadeAparente, resistenciaSverak, resistenciaLaurent,
  fatorCamada, tensoesAdmissiveis, tensoesMalha, kOnderdonk, malhaAterramento, demandaContratada,
};
