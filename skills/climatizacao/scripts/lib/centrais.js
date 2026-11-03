// Climatização — etapa 2: sistemas centrais.
//  - unidades de tratamento de ar (fancoil/AHU com água gelada, ou self dutado):
//    vazão de insuflamento, ar externo do sistema (multizona — ASHRAE 62.1 / NBR 16401-3:
//    Zpz = Voz/Vpz, Ev pela maior Zpz, Vot = Vou/Ev), serpentina e vazão de água;
//  - VAV por ambiente: vazão máxima pela carga, mínima pelo ar externo e pela fração
//    mínima controlável, reaquecimento e limite da ASHRAE 90.1 (6.5.2.1), setpoint do
//    controle de pressão estática do duto (com reset por demanda);
//  - dutos (principal e ramais) pelo motor comum de dutos (_comum/dutos.js — Altshul-
//    Tsal, o mesmo da pressurização), perda no caminho crítico, difusores e grelhas;
//  - ventilador e bombas pelo motor comum de motores e partidas (_comum/eletrico/motores.js);
//  - central de água gelada: chillers (TR, COP/IPLV pela AHRI 550/590, mínimo da ASHRAE
//    90.1), vazão de água gelada pelo ΔT, condensação, bombas primárias/secundárias.
// Todo valor de pré-dimensionamento sai com [CONFERIR] (tabelas.js).

const T = require('./tabelas');
const K = require('./calculo');
const DU = require('../../../_comum/dutos');
const M = require('../../../_comum/eletrico/motores');

const { num, fmt, proximo } = K;
const r5 = (v) => Math.ceil(v / 5) * 5;

// ── Agrupamento dos ambientes em unidades de ar ────────────────────────────
// ambiente.unidade = id da unidade (AHU-01, SELF-01). Sem agrupamento: VAV junta tudo
// numa unidade (VAV precisa de várias zonas por ventilador); volume constante = uma por ambiente.
function agruparUnidades(ambs, c, dados, avisos) {
  const cfg = Object.fromEntries((dados.unidades || []).filter(u => u && u.id).map(u => [String(u.id).trim(), u]));
  const grupos = new Map();
  const semGrupo = ambs.filter(a => !a.unidade);
  if (semGrupo.length && c.distribuicao === 'vav') {
    avisos.push(`${semGrupo.length} ambiente(s) sem unidade de ar indicada: reunidos na AHU-01 (VAV). [CONFERIR zoneamento]`);
    semGrupo.forEach(a => { a.unidade = 'AHU-01'; });
  } else semGrupo.forEach((a, i) => { a.unidade = `${c.sistemaEscolhido === 'self' ? 'SELF' : 'AHU'}-${String(i + 1).padStart(2, '0')}`; });
  for (const a of ambs) {
    if (!grupos.has(a.unidade)) grupos.set(a.unidade, { id: a.unidade, ambientes: [], cfg: cfg[a.unidade] || {} });
    grupos.get(a.unidade).ambientes.push(a);
  }
  return [...grupos.values()];
}

// Eficiência de ventilação do sistema (62.1 Tab. 6.2.5.2; acima de 0,55 pelo Apêndice A: Ev = 1 + Xs − Zpz)
function eficienciaVentilacao(zpzMax, xs) {
  const linha = T.EV_POR_ZPZ.find(([lim]) => zpzMax <= lim + 1e-9);
  if (linha) return { ev: linha[1], metodo: 'tabela' };
  return { ev: Math.max(0.1, 1 + xs - zpzMax), metodo: 'apendice' };
}

function vavDoAmbiente(a, cfgAr) {
  const vMax = a.vIns; // m³/s, pela carga sensível do ambiente
  const vozM3s = a.voz / 1000;
  // mínima pela ventilação: Voz ÷ Zpz alvo (mantém a Ev do sistema na tabela da 62.1)
  const vMinVent = vozM3s / cfgAr.zpz_alvo;
  const vMin = Math.min(vMax, Math.max(cfgAr.vav_fracao_minima * vMax, vMinVent));
  // caixas: a zona grande é dividida em caixas iguais até caber na maior entrada comercial
  const maior = T.VAV_ENTRADAS_M[T.VAV_ENTRADAS_M.length - 1];
  const qMaxCaixa = (Math.PI * maior * maior / 4) * cfgAr.vav_v_entrada_max_ms;
  const caixas = Math.max(1, Math.ceil(vMax / qMaxCaixa - 1e-9));
  const entrada = T.VAV_ENTRADAS_M.find(d => (vMax / caixas) / (Math.PI * d * d / 4) <= cfgAr.vav_v_entrada_max_ms + 1e-9);
  // ASHRAE 90.1 6.5.2.1: com reaquecimento, a mínima não passa da maior entre 20 % da máxima e a
  // vazão exigida pela ventilação [CONFERIR edição]
  const limite90 = Math.max(T.LIMITE_REAQUECIMENTO_90_1 * vMax, Math.min(vMax, vMinVent));
  return { vMax, vMin, vMinVent, fracaoMin: vMin / vMax, zpz: vozM3s / vMin, caixas, entrada, limite90, acimaDe90: vMin > limite90 * 1.001, densa: vMax < vMinVent * 0.999 };
}

// ── Unidades de ar: vazões, ar externo, serpentina, dutos e ventilador ────

function dutosDaUnidade(u, cfgAr, avisos) {
  const area = u.ambientes.reduce((s, a) => s + a.area, 0);
  const comp = num(u.cfg.comprimento_principal_m, null) ?? Math.round(1.5 * Math.sqrt(area));
  if (num(u.cfg.comprimento_principal_m, null) == null) avisos.push(`${u.id}: comprimento do duto principal não informado — adotado ${comp} m (1,5·√área). [CONFERIR traçado]`);
  const curvas = num(u.cfg.curvas_principal, 3);
  const eps = DU.RUGOSIDADE_M.metalico;
  const forma = u.cfg.forma_duto === 'circular' ? 'circular' : 'retangular';
  const principal = DU.dimensionarTrecho({ vazao: u.vFan, perdaAlvo: cfgAr.perda_alvo_pa_m, vMax: cfgAr.v_max_principal_ms, forma, alturaMax: cfgAr.altura_max_duto_m, eps });
  principal.comprimento = comp;
  principal.atrito = principal.porMetro * comp;
  principal.curvas = curvas * DU.perdaLocalizada(cfgAr.k_curva, principal.v);
  const ramais = u.ambientes.map(a => {
    const L = a.comprimentoRamal ?? Math.max(3, Math.round(Math.sqrt(a.area)));
    const t = DU.dimensionarTrecho({ vazao: a.vIns, perdaAlvo: cfgAr.perda_alvo_pa_m, vMax: cfgAr.v_max_ramal_ms, forma, alturaMax: cfgAr.altura_max_duto_m, eps });
    const derivacao = DU.perdaLocalizada(cfgAr.k_derivacao, t.v);
    return { ambiente: a.nome, id: a.id, vazao: a.vIns, comprimento: L, ...t, atrito: t.porMetro * L, derivacao, total: t.porMetro * L + derivacao, estimado: a.comprimentoRamal == null };
  });
  if (ramais.some(r => r.estimado)) avisos.push(`${u.id}: comprimento dos ramais não informado em ${ramais.filter(r => r.estimado).length} ambiente(s) — adotado √área (mín. 3 m). [CONFERIR traçado]`);
  const critico = ramais.reduce((m, r) => (r.total > m.total ? r : m), ramais[0]);
  const perimetro = (t) => (t.forma === 'circular' ? Math.PI * t.diametro : 2 * (t.largura + t.altura));
  const chapa = perimetro(principal) * comp + ramais.reduce((s, r) => s + perimetro(r) * r.comprimento, 0);
  return { principal, ramais, critico, chapaM2: chapa, forma };
}

function unidadesDeAr(ambs, c, dados, catalogo, avisos, pend) {
  const cfgAr = { ...T.AR, ...Object.fromEntries(Object.entries(dados.ar || {}).filter(([, v]) => num(v) != null).map(([k, v]) => [k, Number(v)])) };
  if (Object.keys(dados.ar || {}).filter(k => num(dados.ar[k]) != null).length < 4) pend.add('Perdas de serpentina, filtros, difusor e caixa VAV, rendimento do ventilador e vazão por difusor: valores de pré-dimensionamento — substituir pelos catálogos. [CONFERIR]');
  const vav = c.distribuicao === 'vav';
  const grupos = agruparUnidades(ambs, c, dados, avisos);
  const unidades = grupos.map(u => {
    const vSoma = u.ambientes.reduce((s, a) => s + a.vIns, 0);
    u.vFan = vav ? vSoma * c.simultaneidade : vSoma;
    // ar externo do sistema (multizona): Vou = Σ Fp·Pz + Σ Fa·Az; Vpz = mínima (VAV) ou de projeto (volume constante)
    const zonas = u.ambientes.map(a => {
      const vv = vav ? vavDoAmbiente(a, cfgAr) : null;
      const vpz = vv ? vv.vMin : a.vIns;
      return { a, vav: vv, zpz: (a.voz / 1000) / vpz };
    });
    const vou = u.ambientes.reduce((s, a) => s + a.voz * a.ez, 0) / 1000; // Vbz (= Voz·Ez) no nível do sistema
    const vozSoma = u.ambientes.reduce((s, a) => s + a.voz, 0) / 1000;
    const xs = vou / u.vFan;
    const zpzMax = Math.max(...zonas.map(z => z.zpz));
    let ev = 1;
    let metodoEv = 'zona única';
    if (u.ambientes.length > 1) ({ ev, metodo: metodoEv } = eficienciaVentilacao(zpzMax, xs));
    const vot = u.ambientes.length > 1 ? vou / ev : vozSoma;
    const pessoas = u.ambientes.reduce((s, a) => s + a.pessoas, 0);
    const vMinLegal = c.portaria27 ? (T.RENOVACAO_MINIMA_M3H_PESSOA * pessoas) / 3600 : 0;
    const votAdot = Math.max(vot, vMinLegal);
    if (votAdot > u.vFan * 1.001) avisos.push(`${u.id}: o ar externo (${fmt(votAdot * 3600, 0)} m³/h) passa da vazão de insuflamento (${fmt(u.vFan * 3600, 0)} m³/h) — unidade 100 % ar externo ou rever o ΔT. [CONFERIR]`);
    // serpentina: cargas dos ambientes (sem o ar externo de cada um) + ar externo do sistema
    const f = 1 + c.fatorSeguranca;
    const oa = K.cargaDeAr(votAdot, c.ext, c.int);
    const sensivel = u.ambientes.reduce((s, a) => s + a.sensivelAmb, 0) + oa.s * f;
    const latente = u.ambientes.reduce((s, a) => s + a.latenteAmb, 0) + oa.l * f;
    const kw = (sensivel + latente) / 1000;
    // ventilador: caminho crítico
    const dutos = dutosDaUnidade(u, cfgAr, avisos);
    const p = dutos.principal;
    const linhas = [
      [`Duto principal ${p.forma === 'circular' ? `Ø ${fmt(p.diametro * 1000, 0)} mm` : `${fmt(p.largura * 1000, 0)} × ${fmt(p.altura * 1000, 0)} mm`}, ${fmt(p.comprimento, 0)} m (Altshul-Tsal)`, p.atrito, `${fmt(p.porMetro, 2)} Pa/m · V ${fmt(p.v, 1)} m/s`],
      [`${num(u.cfg.curvas_principal, 3)} curva(s) no principal (K ${fmt(cfgAr.k_curva, 2)})`, p.curvas, `Pd ${fmt(p.pv, 1)} Pa`],
      [`Ramal crítico — ${dutos.critico.ambiente} (${fmt(dutos.critico.comprimento, 0)} m + derivação K ${fmt(cfgAr.k_derivacao, 2)})`, dutos.critico.total, `${fmt(dutos.critico.porMetro, 2)} Pa/m · V ${fmt(dutos.critico.v, 1)} m/s`],
      ...(vav ? [['Caixa VAV (Δp mínima de operação)', cfgAr.dp_caixa_vav_pa, '[CONFERIR fabricante]']] : []),
      ['Difusor de insuflamento', cfgAr.dp_difusor_pa, '[CONFERIR fabricante]'],
      ['Serpentina', cfgAr.dp_serpentina_pa, '[CONFERIR fabricante]'],
      ['Filtros (sujos, no ponto de troca)', cfgAr.dp_filtros_pa, `${T.FILTRAGEM.recomendada}`],
      ['Retorno (grelhas, plenum e tomada de ar externo)', cfgAr.dp_retorno_pa, '[CONFERIR]'],
    ];
    const subtotal = linhas.reduce((s, l) => s + l[1], 0);
    const pressao = subtotal * (1 + cfgAr.efeito_sistema);
    const kwEixo = M.potenciaEixoVentilador(u.vFan, pressao, cfgAr.rendimento_ventilador);
    const partida = vav ? 'inversor' : (kwEixo * cfgAr.folga_motor > 7.5 ? 'soft_starter' : 'direta');
    const motor = M.motorDaCarga({ kwEixo, folga: cfgAr.folga_motor, tensao: c.vff, partida });
    // controle de pressão estática do duto (VAV): Δp mínima da caixa mais desfavorável + o que
    // fica a jusante dela (ramal + derivação + difusor); sensor a ~2/3 do principal e reset por
    // demanda ("trim & respond", ASHRAE Guideline 36; ASHRAE 90.1 6.5.3.2) [CONFERIR]
    const controlePressao = vav ? {
      setpoint: r5(cfgAr.dp_caixa_vav_pa + dutos.critico.total + cfgAr.dp_difusor_pa),
      sensor: `no duto principal, a ~2/3 do comprimento (≈ ${fmt(p.comprimento * 2 / 3, 0)} m da unidade)`,
    } : null;
    if (vav) zonas.forEach(z => { if (z.vav.densa) avisos.push(`${z.a.nome}: zona densa — o ar externo da zona (${fmt(z.a.voz * 3.6, 0)} m³/h) pede vazão mínima maior que a de projeto (Zpz ${fmt(z.vav.zpz, 2)} > ${fmt(cfgAr.zpz_alvo, 2)}), o que derruba a eficiência de ventilação do sistema: considerar controle por CO₂ (DCV), ar externo dedicado ou unidade própria. [CONFERIR]`); if (z.vav.acimaDe90 && c.reaquecimento !== 'nenhum') avisos.push(`${z.a.nome}: vazão mínima da VAV (${fmt(z.vav.vMin * 3600, 0)} m³/h) acima do limite de reaquecimento da ASHRAE 90.1 6.5.2.1 (maior entre 20 % da máxima e o ar externo da zona = ${fmt(z.vav.limite90 * 3600, 0)} m³/h). [CONFERIR edição]`); });
    // difusores e grelhas de retorno
    const terminais = u.ambientes.map(a => ({
      ambiente: a.nome, id: a.id,
      difusores: Math.max(Math.ceil(a.vInsM3h / cfgAr.vazao_difusor_m3h), Math.ceil(a.area / cfgAr.area_por_difusor_m2)),
      grelhas: Math.max(1, Math.ceil(a.vInsM3h / cfgAr.vazao_grelha_retorno_m3h)),
    }));
    terminais.forEach(t => { t.vazaoPorDifusor = u.ambientes.find(a => a.id === t.id).vInsM3h / t.difusores; });
    const reaq = vav && c.reaquecimento !== 'nenhum'
      ? zonas.map(z => ({ ambiente: z.a.nome, kw: (z.vav.vMin / c.int.v) * (T.CP_AR_SECO + T.CP_VAPOR * c.int.w) * c.dtInsuflamento }))
      : [];
    const self = c.sistemaEscolhido === 'self';
    const modelo = K.doCatalogo(catalogo, self ? 'self' : 'fancoil', kw);
    return {
      id: u.id, tipo: self ? 'self' : 'fancoil', ambientes: u.ambientes.map(a => a.nome), ids: u.ambientes.map(a => a.id), area: u.ambientes.reduce((s, a) => s + a.area, 0),
      vSoma, vFan: u.vFan, vFanM3h: u.vFan * 3600, vou, vot, votAdot, vMinLegal, ev, metodoEv, xs, zpzMax,
      sensivel, latente, kw, tr: kw * 1000 / T.W_POR_TR, oa,
      aguaM3h: self ? null : (kw / (T.RHO_AGUA * T.CP_AGUA * c.agua.dt)) * 3600,
      dutos, linhas, subtotal, pressao, kwEixo, motor, partida, controlePressao,
      vavs: vav ? zonas.map(z => ({ ambiente: z.a.nome, id: z.a.id, ...z.vav, voz: z.a.voz / 1000 })) : [],
      reaquecimento: reaq, terminais, modelo,
    };
  });
  return { unidades, cfgAr };
}

// ── Central de água gelada ────────────────────────────────────────────────

const minimo901 = (tipo, tr) => {
  const lista = T.MIN_CHILLER_90_1[T.TIPOS_CHILLER[tipo].tabela];
  return lista.find(l => tr <= l.ate_tr);
};
// IPLV pela AHRI 550/590 a partir do COP a 100/75/50/25 % de carga (COP: média ponderada direta)
const iplv = (cops) => cops.reduce((s, cop, i) => s + T.IPLV_PESOS[i] * cop, 0);

function tubo(vazaoM3h, vMax) {
  const dMin = Math.sqrt((4 * vazaoM3h / 3600) / (Math.PI * vMax)) * 1000;
  const t = T.TUBOS_SCH40.find(([, di]) => di >= dMin - 1e-9) || T.TUBOS_SCH40[T.TUBOS_SCH40.length - 1];
  const v = (vazaoM3h / 3600) / (Math.PI * (t[1] / 1000) ** 2 / 4);
  return { dn: t[0], di: t[1], dMin, v };
}

function bomba({ tag, funcao, vazaoM3h, altura, partida, h, c }) {
  const kwEixo = M.potenciaEixoBomba(vazaoM3h, altura, h.rendimento_bomba);
  const p = partida || (kwEixo * h.folga_motor > 7.5 ? 'soft_starter' : 'direta');
  const motor = M.motorDaCarga({ kwEixo, folga: h.folga_motor, tensao: c.vff, partida: p });
  return { tag, funcao, vazaoM3h, altura, kwEixo, motor, partida: p, tubo: tubo(vazaoM3h, h.v_max_tubo_ms) };
}

function centralAguaGelada(unidades, ambs, c, dados, catalogo, avisos, pend) {
  const cen = dados.central || {};
  const h = { ...T.HIDRAULICA, ...Object.fromEntries(Object.entries(cen.hidraulica || {}).filter(([, v]) => num(v) != null).map(([k, v]) => [k, Number(v)])) };
  pend.add('Perdas de carga hidráulicas (evaporador, condensador, serpentinas, válvulas, rede em Pa/m) e rendimento das bombas: pré-dimensionamento — substituir pelo traçado e pelos catálogos. [CONFERIR]');
  const tipo = T.TIPOS_CHILLER[cen.tipo_chiller] ? cen.tipo_chiller : 'ar';
  const cargaKw = unidades.reduce((s, u) => s + u.kw, 0) * c.simultaneidade;
  const cargaTr = cargaKw * 1000 / T.W_POR_TR;
  const nOp = Math.max(1, Math.round(num(cen.chillers, cargaTr > 150 ? 2 : 1)));
  const reserva = cen.chiller_reserva === true;
  const trPorChiller = proximo(T.CHILLER_TR, cargaTr / nOp) || T.CHILLER_TR[T.CHILLER_TR.length - 1];
  if (cargaTr / nOp > T.CHILLER_TR[T.CHILLER_TR.length - 1]) avisos.push(`Chiller de ${fmt(cargaTr / nOp, 0)} TR acima da tabela: aumentar o número de chillers.`);
  const kwPorChiller = trPorChiller * T.W_POR_TR / 1000;
  const modelo = K.doCatalogo(catalogo, 'chiller', kwPorChiller);
  const min = minimo901(tipo, trPorChiller);
  const copInf = num(cen.cop, null) ?? num(modelo?.dados?.cop, null);
  const copsParcial = ['cop_100', 'cop_75', 'cop_50', 'cop_25'].map(k => num(cen[k], null));
  const iplvCalc = copsParcial.every(v => v > 0) ? iplv(copsParcial) : null;
  const iplvInf = iplvCalc ?? num(cen.iplv, null) ?? num(modelo?.dados?.iplv, null);
  const cop = copInf ?? min.a.cop;
  if (copInf == null) avisos.push(`COP do chiller não informado: adotado o MÍNIMO da ASHRAE 90.1 (Path A) para ${T.TIPOS_CHILLER[tipo].rotulo} (${fmt(min.a.cop, 2)} W/W) só para estimar a potência elétrica — usar o COP certificado AHRI 550/590 do fabricante. [CONFERIR]`);
  pend.add('Eficiência mínima de chiller (ASHRAE 90.1, Tabela 6.8.1-3, Path A/B) — valores de memória da edição 2016/2019, não conferidos no texto. [CONFERIR]');
  pend.add('IPLV pela AHRI 550/590 (pesos 1/42/45/12 % e condições padrão de água) — edição não conferida. [CONFERIR]');
  const atende = {
    cop: copInf == null ? null : copInf >= Math.min(min.a.cop, min.b.cop) - 1e-9,
    iplv: iplvInf == null ? null : iplvInf >= Math.min(min.a.iplv, min.b.iplv) - 1e-9,
    pathA: copInf != null && iplvInf != null ? copInf >= min.a.cop - 1e-9 && iplvInf >= min.a.iplv - 1e-9 : null,
    pathB: copInf != null && iplvInf != null ? copInf >= min.b.cop - 1e-9 && iplvInf >= min.b.iplv - 1e-9 : null,
  };
  if (atende.pathA === false && atende.pathB === false) avisos.push(`Chiller com COP ${fmt(copInf, 2)} / IPLV ${fmt(iplvInf, 2)} abaixo do mínimo da ASHRAE 90.1 (Path A ${fmt(min.a.cop, 2)}/${fmt(min.a.iplv, 2)}; Path B ${fmt(min.b.cop, 2)}/${fmt(min.b.iplv, 2)}). [CONFERIR]`);
  const dtAgua = c.agua.dt;
  const vazaoChiller = (kwPorChiller / (T.RHO_AGUA * T.CP_AGUA * dtAgua)) * 3600; // m³/h
  const vazaoTotal = (cargaKw / (T.RHO_AGUA * T.CP_AGUA * dtAgua)) * 3600;
  const kwEl = kwPorChiller / cop;
  const condAgua = T.TIPOS_CHILLER[tipo].condensacao === 'agua';
  const rejeicao = kwPorChiller * (1 + 1 / cop);
  const dtCond = num(cen.delta_t_condensacao_c, T.CONDENSACAO_PADRAO.delta_t);
  const vazaoCond = condAgua ? (rejeicao / (T.RHO_AGUA * T.CP_AGUA * dtCond)) * 3600 : null;
  const torreTr = condAgua ? rejeicao * 1000 / T.W_POR_TR_TORRE : null;
  // bombas
  const arranjo = cen.arranjo_bombas === 'primario_variavel' ? 'primario_variavel' : 'primario_secundario';
  const bombaReserva = cen.bomba_reserva !== false;
  const nChillers = nOp + (reserva ? 1 : 0);
  const areaTotal = ambs.reduce((s, a) => s + a.area, 0);
  const rede = num(cen.comprimento_rede_m, null) ?? Math.round(2 * (Math.sqrt(areaTotal) + 10));
  if (num(cen.comprimento_rede_m, null) == null) avisos.push(`Comprimento da rede de água gelada (ida + retorno do circuito mais desfavorável) não informado: adotado ${rede} m. [CONFERIR traçado]`);
  const hRede = (rede * h.perda_rede_pa_m * h.fator_singularidades) / (T.RHO_AGUA * T.G);
  const bombas = [];
  const hPrim = h.dp_evaporador_mca + h.casa_maquinas_mca + (arranjo === 'primario_variavel' ? hRede + h.dp_serpentina_mca + h.dp_valvula_mca : 0);
  for (let i = 1; i <= nChillers + (bombaReserva ? 1 : 0); i++) {
    bombas.push(bomba({ tag: `BAGP-${String(i).padStart(2, '0')}`, funcao: i > nChillers ? 'primária (reserva)' : 'primária', vazaoM3h: vazaoChiller, altura: hPrim, partida: arranjo === 'primario_variavel' ? 'inversor' : null, h, c }));
  }
  if (arranjo === 'primario_secundario') {
    const hSec = hRede + h.dp_serpentina_mca + h.dp_valvula_mca;
    for (let i = 1; i <= 1 + (bombaReserva ? 1 : 0); i++) bombas.push(bomba({ tag: `BAGS-${String(i).padStart(2, '0')}`, funcao: i > 1 ? 'secundária (reserva)' : 'secundária', vazaoM3h: vazaoTotal, altura: hSec, partida: 'inversor', h, c }));
  }
  if (condAgua) {
    const hCond = h.dp_condensador_mca + h.torre_mca + h.casa_maquinas_mca;
    for (let i = 1; i <= nChillers + (bombaReserva ? 1 : 0); i++) bombas.push(bomba({ tag: `BAC-${String(i).padStart(2, '0')}`, funcao: i > nChillers ? 'condensação (reserva)' : 'condensação', vazaoM3h: vazaoCond, altura: hCond, partida: null, h, c }));
  }
  return {
    tipo, rotuloTipo: T.TIPOS_CHILLER[tipo].rotulo, cargaKw, cargaTr, nOp, reserva, nChillers, trPorChiller, kwPorChiller, modelo,
    cop, copInformado: copInf, iplv: iplvInf, iplvCalculado: iplvCalc, copsParcial, minimo: min, atende, kwEl, dtAgua, tSaida: c.agua.tSaida,
    vazaoChiller, vazaoTotal, condAgua, rejeicao, dtCond, vazaoCond, torreTr, arranjo, bombaReserva, rede, hRede, bombas,
    tuboPrincipal: tubo(vazaoTotal, h.v_max_tubo_ms), h,
  };
}

module.exports = { agruparUnidades, eficienciaVentilacao, vavDoAmbiente, dutosDaUnidade, unidadesDeAr, centralAguaGelada, minimo901, iplv, tubo, bomba };
