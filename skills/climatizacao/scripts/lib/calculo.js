// Climatização — etapa 1: carga térmica por componentes e seleção do sistema.
//
// Método (ver as fontes e os [CONFERIR] em tabelas.js):
//  1. psicrometria do ar externo e interno no local (pressão pela altitude; umidade
//     pelo bulbo úmido ou pela UR; entalpia) — ASHRAE Fundamentals cap. 1;
//  2. carga de cada ambiente por componentes (ASHRAE Fundamentals cap. 18; NBR 16401-1):
//     - envoltória: opaco Q = U·A·(ΔT + α·I·Rse) (temperatura sol-ar em regime, sem a
//       inércia — lado seguro); vidro Q = U·A·ΔT + A·FS·I·(1 − sombreamento);
//       divisa com ambiente não climatizado Q = U·A·ΔT·0,5;
//     - pessoas (sensível e latente pela atividade), iluminação e equipamentos;
//     - infiltração e ar externo: qs = ṁ·(cpa + cpv·W)·ΔT; ql = ṁ·hfg·ΔW;
//  3. ar externo pela NBR 16401-3: Vbz = Fp·Pz + Fa·Az (tabela da skill de automação),
//     Voz = Vbz/Ez, e no mínimo 27 m³/h por pessoa (Portaria MS 3.523/1998, art. 5º f);
//  4. capacidade com o fator de segurança, em W, kW, TR e BTU/h; vazão de insuflamento
//     pela carga sensível do ambiente e o ΔT de insuflamento;
//  5. escolha do sistema (split, VRF, self ou água gelada) pelo critério H&M declarado
//     e pré-seleção das capacidades comerciais.
// Sistemas centrais (chiller, fancoil/AHU, VAV, dutos e bombas): ./centrais.js.

const T = require('./tabelas');
const AUT = require('../../../automacao/scripts/lib/tabelas'); // AR_EXTERNO (NBR 16401-3), a mesma da automação

const num = (v, padrao = null) => (v === '' || v == null || !Number.isFinite(Number(v)) ? padrao : Number(v));
const arred = (v, c = 2) => (v == null || !Number.isFinite(v) ? v : Math.round(v * 10 ** c) / 10 ** c);
const sim = (v) => v === true || v === 'true' || v === 'sim' || v === 1;
const fmt = (v, c = 1) => (v == null || !Number.isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));

// ── Psicrometria (ASHRAE Fundamentals, cap. 1) ─────────────────────────────

// Pressão atmosférica padrão pela altitude (kPa) — ASHRAE eq. 3
const pressaoAtmosferica = (z = 0) => 101.325 * (1 - 2.25577e-5 * z) ** 5.2559;

// Pressão de saturação do vapor sobre água líquida (kPa), 0 a 200 °C — Hyland-Wexler (ASHRAE eq. 6)
function pressaoSaturacao(t) {
  const k = t + 273.15;
  const ln = -5.8002206e3 / k + 1.3914993 - 4.8640239e-2 * k + 4.1764768e-5 * k * k - 1.4452093e-8 * k ** 3 + 6.5459673 * Math.log(k);
  return Math.exp(ln) / 1000;
}

// Umidade absoluta (kg/kg de ar seco) pela pressão de vapor
const umidadePorPv = (pv, p) => (0.621945 * pv) / (p - pv);
const umidadePorUr = (t, ur, p) => umidadePorPv((ur / 100) * pressaoSaturacao(t), p);
// pelo bulbo úmido (t* ≥ 0 °C) — ASHRAE eq. 33
function umidadePorTbu(t, tbu, p) {
  const ws = umidadePorPv(pressaoSaturacao(tbu), p);
  return ((2501 - 2.326 * tbu) * ws - 1.006 * (t - tbu)) / (2501 + 1.86 * t - 4.186 * tbu);
}
// UR (%) de um estado (t, W)
const urDe = (t, w, p) => (100 * (w * p) / (0.621945 + w)) / pressaoSaturacao(t);
// Entalpia (kJ/kg de ar seco) e volume específico (m³/kg de ar seco)
const entalpia = (t, w) => T.CP_AR_SECO * t + w * (T.H_VAPORIZACAO + T.CP_VAPOR * t);
const volumeEspecifico = (t, w, p) => (0.287042 * (t + 273.15) * (1 + 1.607858 * w)) / p;

function estado(t, w, p) {
  return { t, w, p, ur: urDe(t, w, p), h: entalpia(t, w), v: volumeEspecifico(t, w, p) };
}

// Carga de uma vazão de ar externo/infiltração (m³/s medidos nas condições externas)
// trazida às condições internas: sensível, latente (≥ 0) e total (W)
function cargaDeAr(vazaoM3s, ext, int) {
  const m = vazaoM3s / ext.v; // kg/s de ar seco
  const s = m * (T.CP_AR_SECO + T.CP_VAPOR * ext.w) * (ext.t - int.t) * 1000;
  const l = Math.max(0, m * T.H_VAPORIZACAO * (ext.w - int.w) * 1000);
  return { massa: m, s, l, total: s + l };
}

// Vazão (m³/s nas condições internas) que retira a carga sensível qs com ΔT de insuflamento
const vazaoInsuflamento = (qs, int, dt) => ((qs / 1000) / ((T.CP_AR_SECO + T.CP_VAPOR * int.w) * dt)) * int.v;

const kwParaTr = (w) => w / T.W_POR_TR;

// ── Entradas ───────────────────────────────────────────────────────────────

function config(dados) {
  const p = dados.projeto || {};
  const avisos = [];
  // situação das normas (revisão de 04/11/2026): edição nova publicada depois da usada no cálculo
  avisos.push("ABNT NBR 16401-1 e -2 têm edição de 11/2024 (conferir dados externos e condições internas); a NBR 16401-3:2024 está suspensa e vale a de 2008, usada aqui. [CONFERIR]");
  const pendencias = new Set();
  const altitude = num(p.altitude_m, T.EXTERNO_PADRAO.altitude_m);
  const tbsExt = num(p.tbs_externa_c, null);
  const tbuExt = num(p.tbu_externa_c, null);
  if (tbsExt == null || tbuExt == null) {
    avisos.push(`Condição externa de projeto não informada: adotadas TBS ${T.EXTERNO_PADRAO.tbs_c} °C / TBU ${T.EXTERNO_PADRAO.tbu_c} °C (${T.EXTERNO_PADRAO.cidade}). Use os dados climáticos da NBR 16401-1 (Anexo A) para a cidade da obra. [CONFERIR]`);
  }
  pendencias.add('Condições externas de projeto (TBS/TBU) e percentil: NBR 16401-1, Anexo A — valores do formulário não conferidos na tabela da norma. [CONFERIR]');
  pendencias.add('Condições internas de conforto: faixa de temperatura operativa e UR da NBR 16401-2 não lida no texto vigente. [CONFERIR]');
  const c = {
    altitude, p: pressaoAtmosferica(altitude),
    tbsExt: tbsExt ?? T.EXTERNO_PADRAO.tbs_c, tbuExt: tbuExt ?? T.EXTERNO_PADRAO.tbu_c,
    tbsInt: num(p.tbs_interna_c, T.INTERNO_PADRAO.tbs_c), urInt: num(p.ur_interna_pct, T.INTERNO_PADRAO.ur_pct),
    fatorSeguranca: num(p.fator_seguranca_pct, 10) / 100,
    sistema: T.SISTEMAS[p.sistema] ? p.sistema : 'auto',
    simultaneidade: Math.min(1, Math.max(0.5, num(p.simultaneidade, 1))),
    dtInsuflamento: num(p.delta_t_insuflamento_c, T.AR.delta_t_insuflamento),
    distribuicao: ['vav', 'vac'].includes(p.distribuicao) ? p.distribuicao : 'vac',
    ez: T.EZ[p.distribuicao_ar] ? p.distribuicao_ar : 'teto_frio',
    portaria27: p.minimo_27_m3h_pessoa !== false,
    irradiancia: { ...T.IRRADIANCIA_PICO, ...Object.fromEntries(Object.entries(p.irradiancia || {}).filter(([, v]) => num(v) != null).map(([k, v]) => [k, Number(v)])) },
    usoPublico: p.uso_publico_coletivo !== false,
    distanciaCondensadora: num(p.distancia_condensadora_m, 7),
  };
  if (c.fatorSeguranca > 0.3) avisos.push(`Fator de segurança de ${fmt(c.fatorSeguranca * 100, 0)} % é alto: superdimensiona o equipamento e piora o controle de umidade. [CONFERIR]`);
  if (c.dtInsuflamento < 6 || c.dtInsuflamento > 14) avisos.push(`ΔT de insuflamento de ${fmt(c.dtInsuflamento)} K fora da faixa usual (8 a 12 K) — risco de condensação nos difusores ou vazão excessiva. [CONFERIR]`);
  if (!p.irradiancia || !Object.keys(p.irradiancia).length) pendencias.add('Irradiância solar de pico por orientação: valores de pré-dimensionamento (latitude ~15 °S), não tabela de norma — substituir pelos dados do local. [CONFERIR]');
  return { c, avisos, pendencias };
}

// ── Carga por ambiente ─────────────────────────────────────────────────────

function cargaDaEnvoltoria(superficies, c, dT, pend) {
  const linhas = [];
  for (const s of superficies) {
    const cons = T.CONSTRUCOES[s.construcao] || T.CONSTRUCOES.alvenaria;
    const area = num(s.area_m2, 0);
    if (!(area > 0)) continue;
    const u = num(s.u_w_m2k, cons.u);
    if (num(s.u_w_m2k) == null) pend.add(`Transmitância U típica de "${cons.rotulo}" (${fmt(u, 2)} W/m²·K) — substituir pelo valor da NBR 15220-3 ou do fabricante. [CONFERIR]`);
    const ori = T.ORIENTACOES[s.orientacao] ? s.orientacao : (cons.tipo === 'opaco' && /laje|telha/.test(s.construcao || '') ? 'H' : 'N');
    const irr = c.irradiancia[ori] || 0;
    let q = 0;
    let detalhe;
    if (cons.tipo === 'vidro') {
      const fs = num(s.fs, cons.fs);
      if (num(s.fs) == null) pend.add(`Fator solar típico de "${cons.rotulo}" (FS ${fmt(fs, 2)}) — usar o do fabricante do vidro. [CONFERIR]`);
      const somb = Math.min(1, Math.max(0, num(s.sombreamento_pct, 0) / 100));
      const cond = u * area * dT;
      const sol = area * fs * irr * (1 - somb);
      q = cond + sol;
      detalhe = `U·A·ΔT ${fmt(cond, 0)} W + A·FS·I ${fmt(sol, 0)} W (I = ${fmt(irr, 0)} W/m², FS ${fmt(fs, 2)}${somb ? `, sombra ${fmt(somb * 100, 0)} %` : ''})`;
    } else if (cons.tipo === 'divisa') {
      q = u * area * dT * T.FRACAO_DT_DIVISA;
      detalhe = `U·A·ΔT·${fmt(T.FRACAO_DT_DIVISA, 1)} (ΔT adotado = metade do externo) [CONFERIR]`;
      pend.add('Divisa com ambiente não climatizado: ΔT adotado igual à metade do ΔT externo (critério H&M). [CONFERIR]');
    } else {
      const alfa = num(s.absortancia, T.ABSORTANCIA[s.cor] ?? T.ABSORTANCIA.media);
      if (num(s.absortancia) == null) pend.add('Absortância solar por cor da superfície (clara 0,3 / média 0,5 / escura 0,8): NBR 15220-2 Tabela B.2 não conferida. [CONFERIR]');
      const dTsa = alfa * irr * T.RSE;
      q = u * area * (dT + dTsa);
      detalhe = `U·A·(ΔT + α·I·Rse) = ${fmt(u, 2)}·${fmt(area, 1)}·(${fmt(dT, 1)} + ${fmt(dTsa, 1)}) (α ${fmt(alfa, 2)}, I ${fmt(irr, 0)} W/m²)`;
    }
    linhas.push({ descricao: `${cons.rotulo}${cons.tipo !== 'divisa' ? ` — ${T.ORIENTACOES[ori]}` : ''}`, construcao: s.construcao, orientacao: ori, area, u, q, detalhe, tipo: cons.tipo });
  }
  return linhas;
}

function lerAmbientes(dados, c, ext, int, avisos, pend) {
  const env = dados.envoltoria || [];
  const ids = new Set();
  return (dados.ambientes || []).filter(a => a && (a.nome || a.id) && num(a.area_m2, 0) > 0).map((a, i) => {
    const id = String(a.id || `A${i + 1}`).trim();
    if (ids.has(id)) throw new Error(`Ambiente "${id}" repetido — use um id por ambiente.`);
    ids.add(id);
    const nome = a.nome || id;
    const uso = AUT.AR_EXTERNO[a.uso] ? a.uso : 'outro';
    const ref = AUT.AR_EXTERNO[uso];
    const area = num(a.area_m2, 0);
    const peDireito = num(a.pe_direito_m, 2.7);
    let pessoas = num(a.pessoas, null);
    if (!(pessoas > 0)) {
      pessoas = Math.max(1, Math.ceil((area * ref.densidade) / 100));
      avisos.push(`${nome}: ocupação não informada — adotadas ${pessoas} pessoas pela densidade típica do uso (${ref.densidade} pessoas/100 m², NBR 16401-3). [CONFERIR]`);
    }
    const ativ = T.ATIVIDADES[a.atividade] ? a.atividade : T.ATIVIDADE_DO_USO[uso] || 'escritorio';
    const pes = T.ATIVIDADES[ativ];
    const dT = c.tbsExt - c.tbsInt;
    const superficies = cargaDaEnvoltoria(env.filter(s => String(s.ambiente || '').trim() === id || String(s.ambiente || '').trim() === nome), c, dT, pend);
    if (!superficies.length) avisos.push(`${nome}: sem superfícies na envoltória — só cargas internas e ar externo (ambiente interno?). [CONFERIR]`);
    const envoltoria = superficies.reduce((s, x) => s + x.q, 0);
    const ilumWm2 = num(a.iluminacao_w_m2, T.ILUMINACAO_PADRAO_W_M2);
    const equipWm2 = num(a.equipamentos_w_m2, T.EQUIPAMENTOS_PADRAO_W_M2[uso] ?? 10);
    if (num(a.iluminacao_w_m2) == null || num(a.equipamentos_w_m2) == null) pend.add('Densidade de iluminação e de equipamentos padrão (W/m²) onde o formulário não informou — conferir com o luminotécnico e a lista de equipamentos. [CONFERIR]');
    const iluminacao = area * ilumWm2;
    const equipamentos = area * equipWm2 + num(a.equipamentos_w, 0);
    const pessoasS = pessoas * pes.s;
    const pessoasL = pessoas * pes.l;
    // infiltração (m³/h nas condições externas) — zero com o ambiente pressurizado pelo ar externo
    const infil = cargaDeAr(num(a.infiltracao_m3h, 0) / 3600, ext, int);
    // ar externo (NBR 16401-3): Vbz = Fp·Pz + Fa·Az; Voz = Vbz/Ez; mínimo legal de 27 m³/h·pessoa
    const fp = num(a.fp, ref.fp);
    const fa = num(a.fa, ref.fa);
    const vbz = fp * pessoas + fa * area; // L/s
    const ez = T.EZ[c.ez].ez;
    const vozNorma = vbz / ez;
    const vozPortaria = c.portaria27 ? (T.RENOVACAO_MINIMA_M3H_PESSOA * pessoas) / 3.6 : 0;
    const voz = Math.max(vozNorma, vozPortaria);
    const criterioAr = vozPortaria > vozNorma ? `Portaria 3.523, art. 5º f (27 m³/h·pessoa) > NBR 16401-3 (${fmt(vozNorma * 3.6, 0)} m³/h)` : 'NBR 16401-3 (Fp·Pz + Fa·Az)/Ez';
    const oa = cargaDeAr(voz / 1000, ext, int);
    const sensivelAmb = envoltoria + pessoasS + iluminacao + equipamentos + infil.s;
    const latenteAmb = pessoasL + infil.l;
    const f = 1 + c.fatorSeguranca;
    const sensivel = (sensivelAmb + oa.s) * f;
    const latente = (latenteAmb + oa.l) * f;
    const total = sensivel + latente;
    const vIns = vazaoInsuflamento(sensivelAmb * f, int, c.dtInsuflamento);
    return {
      id, nome, uso, rotuloUso: ref.rotulo, area, peDireito, volume: area * peDireito, pessoas, atividade: ativ, rotuloAtividade: pes.rotulo,
      unidade: String(a.unidade || '').trim() || null, comprimentoRamal: num(a.comprimento_ramal_m, null),
      superficies, componentes: {
        envoltoria, pessoasS, pessoasL, iluminacao, equipamentos, infiltracaoS: infil.s, infiltracaoL: infil.l, arExternoS: oa.s, arExternoL: oa.l,
      },
      fp, fa, vbz, voz, vozNorma, criterioAr, ez,
      sensivelAmb: sensivelAmb * f, latenteAmb: latenteAmb * f, sensivel, latente, total, fcs: total ? sensivel / total : 1,
      kw: total / 1000, tr: kwParaTr(total), btuh: total * T.BTUH_POR_W, wM2: total / area, m2PorTr: area / kwParaTr(total),
      vIns, vInsM3h: vIns * 3600, renovacoes: (vIns * 3600) / (area * peDireito),
    };
  });
}

// ── Escolha do sistema (critério H&M declarado) ────────────────────────────

function escolherSistema(ambs, c) {
  const k = T.CRITERIO_SISTEMA;
  const tr = ambs.reduce((s, a) => s + a.tr, 0);
  const maior = Math.max(...ambs.map(a => a.tr), 0);
  let sistema = c.sistema;
  let motivo;
  if (sistema !== 'auto') motivo = 'escolhido no formulário';
  else if (tr <= k.split_max_tr && ambs.length <= k.split_max_ambientes) { sistema = 'split'; motivo = `carga total ${fmt(tr)} TR ≤ ${k.split_max_tr} TR em até ${k.split_max_ambientes} ambientes`; }
  else if (maior >= k.self_min_tr_ambiente && ambs.length <= k.self_max_ambientes) { sistema = 'self'; motivo = `poucos ambientes grandes (maior ${fmt(maior)} TR ≥ ${k.self_min_tr_ambiente} TR)`; }
  else if (tr <= k.vrf_max_tr) { sistema = 'vrf'; motivo = `${ambs.length} ambientes com controle individual e carga total ${fmt(tr)} TR ≤ ${k.vrf_max_tr} TR`; }
  else { sistema = 'chiller'; motivo = `carga total ${fmt(tr)} TR acima de ${k.vrf_max_tr} TR — água gelada com fancoils`; }
  return { sistema, rotulo: T.SISTEMAS[sistema].rotulo, motivo, automatico: c.sistema === 'auto' };
}

const proximo = (lista, v) => lista.find(x => x >= v - 1e-9);

// Do catálogo do banco (equipamentos_catalogo, injetado pelo sistema): o menor
// equipamento do tipo com capacidade ≥ a pedida, preferindo os verificados
function doCatalogo(catalogo, tipo, kwMin) {
  const lista = (catalogo || []).filter(e => e && e.tipo === tipo && num(e.dados?.capacidade_kw, 0) >= kwMin - 1e-9)
    .sort((a, b) => (b.verificado === true) - (a.verificado === true) || num(a.dados.capacidade_kw) - num(b.dados.capacidade_kw));
  return lista[0] || null;
}

function selecionarSplit(ambs, c, catalogo) {
  return ambs.map(a => {
    const n = Math.max(1, Math.ceil(a.btuh / T.SPLIT_BTUH[T.SPLIT_BTUH.length - 1]));
    const btuh = proximo(T.SPLIT_BTUH, a.btuh / n);
    const modelo = doCatalogo(catalogo, 'split', btuh / T.BTUH_POR_W / 1000);
    const forma = btuh <= 24000 ? 'hi-wall' : btuh <= 36000 ? 'cassete ou piso-teto' : 'piso-teto ou cassete';
    const kwFrio = (btuh / T.BTUH_POR_W) / 1000;
    const kwEl = kwFrio / num(modelo?.dados?.cop, T.COP_TIPICO.split);
    return { ambiente: a.nome, id: a.id, n, btuh, kw: kwFrio, tr: kwParaTr(btuh / T.BTUH_POR_W), forma, kwEl: kwEl * n, modelo };
  });
}

function selecionarVrf(ambs, c, avisos, catalogo) {
  const evap = ambs.map(a => {
    const max = T.VRF_EVAP_KW[T.VRF_EVAP_KW.length - 1];
    const n = Math.max(1, Math.ceil(a.kw / max));
    const kw = proximo(T.VRF_EVAP_KW, a.kw / n);
    return { ambiente: a.nome, id: a.id, n, kw, total: kw * n };
  });
  const somaEvap = evap.reduce((s, e) => s + e.total, 0);
  const requerido = ambs.reduce((s, a) => s + a.kw, 0) * c.simultaneidade;
  const maxSistema = T.VRF_MODULOS_MAX * T.VRF_COND_KW[T.VRF_COND_KW.length - 1];
  const nSist = Math.max(1, Math.ceil(requerido / maxSistema));
  const porSist = requerido / nSist;
  const nMod = Math.max(1, Math.ceil(porSist / T.VRF_COND_KW[T.VRF_COND_KW.length - 1]));
  const modulo = proximo(T.VRF_COND_KW, porSist / nMod);
  const modeloCond = doCatalogo(catalogo, 'vrf_cond', modulo);
  const somaCond = modulo * nMod * nSist;
  const combinacao = somaEvap / somaCond;
  if (combinacao < T.VRF_COMBINACAO[0] || combinacao > T.VRF_COMBINACAO[1]) avisos.push(`VRF: combinação Σ internas ÷ Σ externas = ${fmt(combinacao * 100, 0)} %, fora da faixa ${T.VRF_COMBINACAO[0] * 100}–${T.VRF_COMBINACAO[1] * 100} % adotada — confirmar com o software do fabricante. [CONFERIR]`);
  const kwEl = (requerido / num(modeloCond?.dados?.cop, T.COP_TIPICO.vrf));
  return { evaporadoras: evap, nEvap: evap.reduce((s, e) => s + e.n, 0), somaEvap, requerido, sistemas: nSist, modulosPorSistema: nMod, modulo, somaCond, combinacao, kwEl, modeloCond };
}

function selecionarSelf(grupos, catalogo) {
  return grupos.map(g => {
    const tr = g.kw * 1000 / T.W_POR_TR;
    const max = T.SELF_TR[T.SELF_TR.length - 1];
    const n = Math.max(1, Math.ceil(tr / max));
    const cap = proximo(T.SELF_TR, tr / n);
    const modelo = doCatalogo(catalogo, 'self', cap * T.W_POR_TR / 1000);
    const kwEl = (cap * T.W_POR_TR / 1000 / num(modelo?.dados?.cop, T.COP_TIPICO.self)) * n;
    return { unidade: g.id, ambientes: g.ambientes.map(a => a.nome), n, tr: cap, kw: cap * T.W_POR_TR / 1000, kwEl, modelo };
  });
}

module.exports = {
  T, num, arred, fmt, sim, proximo, doCatalogo,
  pressaoAtmosferica, pressaoSaturacao, umidadePorUr, umidadePorTbu, urDe, entalpia, volumeEspecifico, estado, cargaDeAr, vazaoInsuflamento, kwParaTr,
  config, cargaDaEnvoltoria, lerAmbientes, escolherSistema, selecionarSplit, selecionarVrf, selecionarSelf,
};
