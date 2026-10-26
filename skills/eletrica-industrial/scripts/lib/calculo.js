// Elétrica industrial de baixa tensão — motores, partidas, CCM, correção do
// fator de potência e curto-circuito.
//
// Referências: ABNT NBR 5410:2004 (6.5.1 motores; 6.2.5 a 6.2.7 condutores e
// queda de tensão; 5.3.4/5.3.5 proteção; Tabelas 36–42, 47 e 58), ABNT NBR
// 17094-1 / IEC 60034-1 (dados de placa, fator de serviço, regimes), ABNT NBR
// IEC 60947-4-1 e 60947-4-2 (contatores, partidas, soft-starters — AC-3),
// ABNT NBR IEC 61439-1/-2 (CCM e quadros), IEC 60909-0 (curto-circuito),
// IEC 60831-1 (capacitores) e REN ANEEL 1000/2021 (FP de referência 0,92).
//
// O dimensionamento de cada cabo (capacidade de condução, FCT, FCA, seção
// mínima, PE e queda de tensão em regime) usa o MESMO motor da skill de
// elétrica predial (skills/eletrica/scripts/lib/calculo.js → dimensionarCircuito),
// como fazem as skills de carregador e solar.

const E = require('../../../eletrica/scripts/lib/calculo');
const T = require('../../../eletrica/scripts/lib/tabelas');
const X = require('./tabelas');

const FOLGA = 1.1; // +10 % de cabo (sobras, emendas, chegada no quadro) — igual à skill de elétrica
const SQ3 = Math.sqrt(3);
const num = (v, padrao) => (v == null || v === '' || Number.isNaN(Number(v)) ? padrao : Number(v));
const fracao = (v, padrao) => { const x = num(v, padrao); return x != null && x > 1 ? x / 100 : x; }; // aceita 89 ou 0,89
const arred = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c;
const tg = (fp) => Math.tan(Math.acos(Math.min(1, Math.max(0.01, fp))));
const somaZ = (...zs) => zs.filter(Boolean).reduce((a, z) => ({ r: a.r + z.r, x: a.x + z.x }), { r: 0, x: 0 });
const modZ = (z) => Math.hypot(z.r, z.x);

// ── Fórmulas básicas (usadas no teste) ─────────────────────────────────────

function potenciaKw(m) {
  const p = num(m.potencia, 0);
  return String(m.unidade || 'cv').toLowerCase() === 'kw' ? p : p * X.CV_KW;
}

// In = P / (√3 · V · η · FP)  (P = potência mecânica no eixo, NBR 17094-1)
function correnteNominalMotor(pKw, v, eta, fp) {
  return (pKw * 1000) / (SQ3 * v * eta * fp);
}

// Correção do FP: Qc = P · (tg φ1 − tg φ2)
function kvarCorrecao(pKw, fp1, fp2) {
  return Math.max(0, pKw * (tg(fp1) - tg(fp2)));
}

// Icc trifásico simétrico nos terminais do transformador (rede infinita): Icc = S / (√3 · V · Z%)
function iccTransformador(kva, zPct, v) {
  return (kva * 1000) / (SQ3 * v * (zPct / 100));
}

// Icc trifásico simétrico por impedância (IEC 60909): Ik = c · V / (√3 · |Z|)
function iccTrifasico(v, z, c = 1) {
  return (c * v) / (SQ3 * modZ(z));
}

// Fator de crista (IEC 60909-0, 4.3.1.1): κ = 1,02 + 0,98 · e^(−3R/X)
function kappa(z) {
  return z.x > 0 ? 1.02 + 0.98 * Math.exp(-3 * z.r / z.x) : 1.02;
}

function zCabo(secao, paralelos, comprimento, rho) {
  const np = Math.max(1, paralelos || 1);
  return { r: (rho * comprimento) / (secao * np), x: (X.X_CABO * comprimento) / np };
}

function tensoesPlaca(texto) {
  return String(texto || '').split(/[^0-9.,]+/).map(s => Number(s.replace(',', '.'))).filter(v => v > 50);
}

// ── Configuração ───────────────────────────────────────────────────────────

function config(dados) {
  const i = dados.instalacao || {};
  const vff = num(i.tensao_ff, 380);
  const trafoKva = num(i.trafo_kva, null);
  const entrada = i.ponto_entrega || (trafoKva ? 'trafo' : 'bt');
  const trafoZ = num(i.trafo_z_pct, 5);
  const perdasCu = num(i.trafo_perdas_cobre_w, null);
  const vCap = num(i.tensao_capacitor_v, vff <= 230 ? 250 : vff <= 400 ? 440 : 525);
  return {
    vff, vfn: num(i.tensao_fn, Math.round(vff / SQ3)), frequencia: num(i.frequencia_hz, 60), esquema: i.esquema || 'TN-S',
    entrada, trafoKva, trafoZ,
    trafoR: perdasCu && trafoKva ? (perdasCu / (trafoKva * 1000)) * 100 : num(i.trafo_r_pct, X.R_TRAFO_PCT_PADRAO),
    trafoRInformado: !!(perdasCu || num(i.trafo_r_pct, null)),
    sccRedeMva: num(i.scc_rede_mva, null), iccEntradaKa: num(i.icc_entrada_ka, null),
    caboEntrada: { secao: num(i.cabo_entrada_secao_mm2, null), paralelos: num(i.cabo_entrada_paralelos, null), comprimento: num(i.cabo_entrada_comprimento_m, 10) },
    fornecerCaboEntrada: i.fornecer_cabo_entrada !== false,
    disjuntorGeralInformado: num(i.disjuntor_geral_a, null),
    temperatura: num(i.temperatura, 30), isolacao: i.isolacao || 'EPR',
    metodo: i.metodo || 'E', metodoAlim: i.metodo_alimentador || 'F',
    agrupamento: Math.max(1, num(i.agrupamento, 1)), agrupamentoAlim: Math.max(1, num(i.agrupamento_alimentador, 1)),
    secaoMaxParalelo: num(i.secao_max_paralelo_mm2, 240),
    quedaTerminal: num(i.queda_max_terminal_pct, T.QUEDA.terminal),
    quedaTotal: num(i.queda_max_total_pct, entrada === 'trafo' ? T.QUEDA.total_trafo : T.QUEDA.total_bt),
    quedaAlim: num(i.queda_max_alimentador_pct, 2),
    quedaEntrada: num(i.queda_max_entrada_pct, 1),
    quedaPartida: num(i.queda_max_partida_pct, 10),
    fpMedido: fracao(i.fp_medido, null), fpAlvo: fracao(i.fp_alvo, 0.92), demandaMedidaKw: num(i.demanda_medida_kw, null),
    tipoBanco: i.tipo_banco || 'auto', estagios: Math.max(1, num(i.estagios_controlador, 6)), bancoDistancia: num(i.banco_distancia_m, 5),
    tensaoCapacitor: vCap, fatorC: num(i.fator_tensao_c, 1.0), contribuicaoMotores: i.contribuicao_motores !== false,
    fatorSimultaneidade: num(i.fator_simultaneidade, 1), carregamentoMax: num(i.carregamento_max_trafo_pct, 100),
    comprimentoPadrao: num(i.comprimento_padrao_m, 20), eletrodutoFinalM: num(i.eletroduto_final_m, 3),
  };
}

// Configuração do motor da skill de elétrica (sistema trifásico)
function configMotorEletrica(c) {
  return E.config({ instalacao: {
    tensao_fn: c.vfn, tensao_ff: c.vff, sistema: 'trifasico', esquema: c.esquema, isolacao: c.isolacao, metodo: c.metodo,
    temperatura: c.temperatura, agrupamento: c.agrupamento, comprimento_medio_circuito_m: c.comprimentoPadrao, ponto_entrega: c.entrada,
  } });
}

// ── Leitura das entradas ───────────────────────────────────────────────────

function lerQuadros(dados) {
  const vistos = new Set();
  return (dados.quadros || []).filter(q => String(q.id || '').trim()).map(q => {
    const id = String(q.id).trim();
    if (id.toUpperCase() === 'QGBT') throw new Error('O QGBT já existe por padrão — não o cadastre na tabela de quadros (use-o como "quadro" dos motores ligados direto nele).');
    if (vistos.has(id)) throw new Error(`Quadro "${id}" repetido na tabela de quadros.`);
    vistos.add(id);
    return { id, descricao: q.descricao || id, tipo: q.tipo || 'CCM', distancia: num(q.distancia_qgbt_m, 20), forma: q.forma || '2b', ip: q.ip || 'IP54', eletrocalhaM: num(q.eletrocalha_m, null) };
  });
}

function quadroDe(item, quadros, rotulo) {
  const id = String(item.quadro || '').trim();
  if (!id || id.toUpperCase() === 'QGBT') return 'QGBT';
  if (!quadros.some(q => q.id === id)) throw new Error(`${rotulo}: quadro "${id}" não está na tabela de quadros/CCMs — confira o nome.`);
  return id;
}

function lerMotores(dados, c, quadros) {
  const unidades = [];
  const avisos = [];
  const premissas = new Set();
  (dados.motores || []).filter(m => num(m.potencia, 0) > 0).forEach((m, i) => {
    const tag = String(m.tag || `M-${String(i + 1).padStart(2, '0')}`).trim();
    const pKw = potenciaKw(m);
    const cv = pKw / X.CV_KW;
    let eta = fracao(m.rendimento, null);
    let fp = fracao(m.fp, null);
    if (eta == null || fp == null) {
      avisos.push(`${tag}: rendimento/FP não informados — adotados η = 0,90 e FP = 0,85. Use os dados de placa (NBR 17094-1). [CONFERIR]`);
      eta = eta ?? 0.9; fp = fp ?? 0.85;
    }
    let ipIn = num(m.ip_in, null);
    if (ipIn == null) { ipIn = 7; avisos.push(`${tag}: Ip/In não informado — adotado 7,0. [CONFERIR placa]`); }
    const partida = X.PARTIDAS[m.partida] ? m.partida : 'direta';
    const inCalc = correnteNominalMotor(pKw, c.vff, eta, fp);
    const inPlaca = num(m.in_placa_a, null);
    const tensao = num(m.tensao_v, c.vff);
    if (Math.abs(tensao - c.vff) / c.vff > 0.05) avisos.push(`${tag}: tensão do motor (${tensao} V) diferente da tensão da instalação (${c.vff} V). [CONFERIR]`);
    const placa = tensoesPlaca(m.tensao_placa);
    if (placa.length && !placa.some(v => Math.abs(v - c.vff) / c.vff <= 0.05)) avisos.push(`${tag}: a placa (${m.tensao_placa} V) não tem a tensão da rede (${c.vff} V).`);
    const regime = X.REGIMES[m.regime] ? m.regime : 'S1';
    const q = Math.max(1, Math.round(num(m.quantidade, 1)));
    const s = Math.min(q, Math.max(0, Math.round(num(m.simultaneos, q))));
    const quadro = quadroDe(m, quadros, `Motor ${tag}`);
    const base = {
      linha: i, tagBase: tag, descricao: m.descricao || 'Motor', quadro, pKw, cv, eta, fp, ipIn, fs: Math.max(1, num(m.fs, 1)),
      tensao, placa, tensaoPlaca: m.tensao_placa || '', partida, regime, distancia: num(m.distancia_m, c.comprimentoPadrao),
      inCalc, inPlaca, in: inPlaca || inCalc, fu: fracao(m.fator_utilizacao, null) ?? X.fatorUtilizacao(cv),
      fpPartida: fracao(m.fp_partida, null) ?? (partida === 'inversor' ? X.FP_PARTIDA_INVERSOR : X.FP_PARTIDA_PADRAO),
      limitePartida: num(m.limite_partida_in, partida === 'soft_starter' ? X.LIMITE_SOFT_PADRAO : partida === 'inversor' ? X.LIMITE_INVERSOR_PADRAO : null),
      protecao: m.protecao || 'auto', metodo: m.metodo || c.metodo, agrupamento: Math.max(1, num(m.agrupamento, c.agrupamento)),
      secaoMinima: num(m.secao_minima_mm2, 0), seccionadoraLocal: !!m.seccionadora_local, quantidadeLinha: q, simultaneosLinha: s,
    };
    if (fracao(m.fator_utilizacao, null) == null) premissas.add('Fator de utilização dos motores por faixa de potência (0,70 até 2,5 cv; 0,83 até 15 cv; 0,85 até 40 cv; 0,87 acima) — valores típicos da literatura. [CONFERIR com o regime real]');
    for (let k = 0; k < q; k++) unidades.push({ ...base, tag: q > 1 ? `${tag}-${k + 1}` : tag, emOperacao: k < s });
  });
  return { unidades, avisos, premissas: [...premissas] };
}

function lerOutras(dados, c, quadros) {
  return (dados.outras_cargas || []).filter(o => num(o.potencia_kw, 0) > 0).map((o, i) => {
    const tipo = X.DEMANDA_OUTRAS[o.tipo] ? o.tipo : 'outros';
    const ref = X.DEMANDA_OUTRAS[tipo];
    const fp = fracao(o.fp, null) ?? ref.fp;
    const fd = fracao(o.fd, null) ?? ref.fd;
    const ligacao = o.ligacao === 'FN' ? 'FN' : 'FFF';
    const kw = num(o.potencia_kw, 0);
    return {
      id: o.id || `C${i + 1}`, descricao: o.descricao || ref.rotulo, tipo, kw, fp, fd, ligacao,
      quadro: quadroDe(o, quadros, `Carga ${o.descricao || i + 1}`), comprimento: num(o.comprimento_m, c.comprimentoPadrao),
      // corrente de demanda equivalente trifásica (cargas F-N distribuídas entre as fases) [CONFERIR balanceamento]
      iDemanda: (kw * fd * 1000) / (SQ3 * c.vff * fp),
    };
  });
}

// ── Dispositivos de partida (NBR IEC 60947-4-1 / -4-2) ──────────────────────

function protecaoCurto(u, iLinha, semicondutor) {
  let tipo = u.protecao;
  if (!tipo || tipo === 'auto') tipo = X.faixa(X.DISJUNTOR_MOTOR, iLinha) ? 'disjuntor_motor' : 'caixa_moldada';
  if (tipo === 'disjuntor_motor' && !X.faixa(X.DISJUNTOR_MOTOR, iLinha)) tipo = 'caixa_moldada';
  if (tipo === 'disjuntor_motor') {
    const f = X.faixa(X.DISJUNTOR_MOTOR, iLinha);
    return { ref: 'Q1', tipo, funcao: 'curto-circuito e sobrecarga', faixa: f, ajuste_a: arred(iLinha, 1), magnetico_a: X.MAGNETICO_DM * f[1], termico: true,
      especificacao: `Disjuntor-motor tripolar faixa ${f[0]}–${f[1]} A, ajuste ${arred(iLinha, 1)} A (IEC 60947-2/-4-1)` };
  }
  if (tipo === 'fusivel') {
    const inF = X.proximo(X.FUSIVEIS, semicondutor ? 1.25 * iLinha : iLinha);
    return { ref: 'F1-F3', tipo, funcao: 'curto-circuito', nominal_a: inF, termico: false, quantidade: 3,
      especificacao: semicondutor ? `Fusível ultrarrápido aR ${inF} A (3 un) com base — coordenação tipo 2 pelo manual do equipamento [CONFERIR]` : `Fusível NH/Diazed aM ${inF} A (3 un) com base — coordenação tipo 2 [CONFERIR tabela do fabricante]` };
  }
  const inD = X.proximo(X.DISJUNTORES_GERAIS, iLinha);
  return { ref: 'Q1', tipo: 'caixa_moldada', funcao: 'curto-circuito', nominal_a: inD, termico: false,
    especificacao: `Disjuntor de caixa moldada tripolar ${inD} A para proteção de motor, magnético ajustável ≥ 2 × Ip [CONFERIR] (IEC 60947-2)` };
}

function dispositivosPartida(u) {
  const In = u.in;
  const ipDireta = u.ipIn * In;
  const ac3 = (i) => X.proximo(X.CONTATORES_AC3, i);
  const disp = [];
  const obs = [];
  let ipLinha;
  let conjugado;
  let sobrecarga;
  if (u.partida === 'direta' || u.partida === 'estrela_triangulo') {
    const yd = u.partida === 'estrela_triangulo';
    const p = protecaoCurto(u, In, false);
    disp.push(p);
    if (yd) {
      ipLinha = ipDireta / 3; conjugado = 100 / 3;
      const iF = In / SQ3;
      disp.push({ ref: 'K1', tipo: 'contator', funcao: 'rede (linha)', corrente_a: arred(iF, 1), nominal_a: ac3(iF), categoria: 'AC-3' });
      disp.push({ ref: 'K2', tipo: 'contator', funcao: 'triângulo', corrente_a: arred(iF, 1), nominal_a: ac3(iF), categoria: 'AC-3' });
      disp.push({ ref: 'K3', tipo: 'contator', funcao: 'estrela', corrente_a: arred(In / 3, 1), nominal_a: ac3(In / 3), categoria: 'AC-3' });
      disp.push({ ref: 'KT1', tipo: 'temporizador', funcao: 'comutação Y-Δ', especificacao: 'Relé temporizador estrela-triângulo (pausa ≈ 50–100 ms)' });
      if (p.termico) sobrecarga = { ajuste_a: arred(In, 1), local: 'disjuntor-motor Q1 (corrente de linha)' };
      else {
        const f = X.faixa(X.RELES, iF);
        disp.push({ ref: 'F4', tipo: 'rele_sobrecarga', funcao: 'sobrecarga (corrente de fase, após K1)', ajuste_a: arred(iF, 1), faixa: f });
        sobrecarga = { ajuste_a: arred(iF, 1), local: 'relé F4 no ramo de K1 (In/√3)' };
      }
      const placa = u.placa;
      const possivel = !placa.length || placa.some(vd => Math.abs(vd - u.tensao) / u.tensao <= 0.05 && placa.some(vy => Math.abs(vy - vd * SQ3) / (vd * SQ3) <= 0.05));
      if (!placa.length) obs.push('Y-Δ exige motor com 6 terminais e tensão em triângulo igual à da rede (ex.: 380/660 V em rede de 380 V). [CONFERIR placa]');
      else if (!possivel) obs.push(`Placa ${u.tensaoPlaca} V não permite Y-Δ em ${u.tensao} V (o triângulo precisa ser a tensão da rede) — trocar o motor ou o tipo de partida.`);
      obs.push('Conjugado de partida reduzido a 1/3: verificar se o conjugado resistente da carga permite a partida (partida em vazio ou com carga leve).');
    } else {
      ipLinha = ipDireta; conjugado = 100;
      disp.push({ ref: 'K1', tipo: 'contator', funcao: 'linha', corrente_a: arred(In, 1), nominal_a: ac3(In), categoria: 'AC-3' });
      if (p.termico) sobrecarga = { ajuste_a: arred(In, 1), local: 'disjuntor-motor Q1' };
      else {
        const f = X.faixa(X.RELES, In);
        disp.push({ ref: 'F4', tipo: 'rele_sobrecarga', funcao: 'sobrecarga', ajuste_a: arred(In, 1), faixa: f });
        sobrecarga = { ajuste_a: arred(In, 1), local: 'relé F4' };
      }
    }
    if (X.REGIMES_AC4.includes(u.regime)) obs.push(`Regime ${u.regime}: manobras de impulso/frenagem — escolher o contator pela tabela AC-4 do fabricante. [CONFERIR]`);
  } else {
    const soft = u.partida === 'soft_starter';
    const lim = u.limitePartida;
    ipLinha = lim * In;
    conjugado = soft ? Math.min(100, (lim / u.ipIn) ** 2 * 100) : null;
    disp.push(protecaoCurto(u, In, true));
    disp.push({ ref: 'K1', tipo: 'contator', funcao: 'isolamento / parada de emergência (NR-12)', corrente_a: arred(In, 1), nominal_a: ac3(In), categoria: 'AC-3' });
    disp.push(soft
      ? { ref: 'T1', tipo: 'soft_starter', funcao: 'partida suave', corrente_a: arred(In, 1), especificacao: `Soft-starter ≥ ${arred(In, 1)} A em ${u.tensao} V, by-pass incorporado e proteção eletrônica de sobrecarga classe 10, limitação ${String(lim).replace('.', ',')} × In (NBR IEC 60947-4-2) [CONFERIR partidas/hora]` }
      : { ref: 'T1', tipo: 'inversor', funcao: 'acionamento com velocidade variável', corrente_a: arred(In, 1), especificacao: `Inversor de frequência ≥ ${arred(In, 1)} A (${arred(u.pKw, 1)} kW) em ${u.tensao} V, uso normal; para conjugado constante escolher pela corrente em uso pesado (IEC 61800) [CONFERIR]` });
    sobrecarga = { ajuste_a: arred(In, 1), local: soft ? 'proteção eletrônica do soft-starter' : 'parâmetro de corrente do inversor' };
    if (soft) obs.push(`Corrente de partida limitada a ${String(lim).replace('.', ',')} × In; conjugado ≈ (${String(lim).replace('.', ',')}/${String(u.ipIn).replace('.', ',')})² ≈ ${Math.round(conjugado)} % do conjugado de partida direta.`);
    else obs.push('Cabo motor–inversor blindado (EMC, IEC 61800-3) e verificação de reatância de rede/filtro conforme o manual. Inversor não contribui para o curto-circuito e gera harmônicos (ver banco de capacitores).');
  }
  return { tipo: u.partida, rotulo: X.PARTIDAS[u.partida].rotulo, ipDireta, ipLinha, conjugado, dispositivos: disp, sobrecarga, observacoes: obs };
}

// ── Circuitos ───────────────────────────────────────────────────────────────

// Circuito terminal de motor (NBR 5410, 6.5.1): Ib = max(1,25; FS) × In.
// Y-Δ: 6 condutores entre o CCM e o motor, cada um com a corrente de fase
// (In/√3); queda de tensão no enrolamento em Δ = 2·ρ·L·If/(S·V) — 2/√3 vezes
// a fórmula trifásica do motor da elétrica, por isso o limite é corrigido.
function circuitoMotor(u, c, ec, secaoMinima = 0) {
  const yd = u.partida === 'estrela_triangulo';
  const fatorIb = Math.max(1.25, u.fs);
  const ibLinha = fatorIb * u.in;
  const ibCond = yd ? ibLinha / SQ3 : ibLinha;
  const kQueda = yd ? 2 / SQ3 : 1;
  const d = E.dimensionarCircuito({
    id: u.tag, descricao: `${u.tag} — ${u.descricao}`, tipo: 'tue', ligacao: 'FFF', potencia_va: SQ3 * c.vff * ibCond,
    comprimento_m: u.distancia, agrupamento: u.agrupamento + (yd ? 1 : 0), metodo: u.metodo, secao_minima: Math.max(secaoMinima, u.secaoMinima),
  }, ec, { minimo: T.SECAO_MINIMA.tue, limiteQueda: c.quedaTerminal / kQueda });
  return {
    secao: d.secao, secaoPE: d.secaoPE, iz: d.iz, izRef: d.izRef, fct: d.fct, fca: d.fca, metodo: d.metodo, agrupamento: u.agrupamento + (yd ? 1 : 0),
    ibLinha, ibCond, fatorIb, condutores: yd ? 6 : 3, comprimento: d.comprimento, queda: d.queda * kQueda, criterio: d.criterio,
  };
}

function circuitoOutra(o, c, ec) {
  const va = (o.kw * 1000) / o.fp;
  const d = E.dimensionarCircuito({ id: o.id, descricao: o.descricao, tipo: o.tipo === 'iluminacao' ? 'iluminacao' : 'tue', ligacao: o.ligacao, potencia_va: va, comprimento_m: o.comprimento, agrupamento: c.agrupamento },
    ec, { minimo: o.tipo === 'iluminacao' ? T.SECAO_MINIMA.iluminacao : T.SECAO_MINIMA.tug, limiteQueda: c.quedaTerminal });
  // carga trifásica resistiva/equilibrada sem neutro; iluminação, tomadas e F-N com neutro
  const comNeutro = o.ligacao === 'FN' || o.tipo === 'iluminacao' || o.tipo === 'tomadas';
  return { secao: d.secao, secaoNeutro: comNeutro ? d.secaoNeutro || d.secao : null, secaoPE: d.secaoPE, iz: d.iz, ib: d.ib, disjuntor: d.disjuntor, polos: d.polos, queda: d.queda, comprimento: d.comprimento, criterio: d.criterio, metodo: d.metodo };
}

// Alimentador trifásico com condutores em paralelo quando a seção passa do
// limite prático (secaoMaxParalelo). Cada conjunto em paralelo conta como um
// circuito para o FCA (Tabela 42) [CONFERIR arranjo na eletrocalha].
function dimensionarAlimentador({ id, descricao, ib, comprimento, limiteQueda, neutro = false, metodo }, c, ec) {
  const disjuntor = X.proximo(X.DISJUNTORES_GERAIS, ib);
  if (!disjuntor) throw new Error(`${descricao}: corrente de ${Math.round(ib)} A acima dos disjuntores previstos.`);
  for (let np = 1; np <= 12; np++) {
    let smin = 0;
    for (let tentativa = 0; tentativa < 30; tentativa++) {
      let d = null;
      try {
        d = E.dimensionarCircuito({ id, descricao, tipo: 'alimentador', ligacao: 'FFF', potencia_va: (SQ3 * c.vff * ib) / np, comprimento_m: comprimento,
          agrupamento: np + c.agrupamentoAlim - 1, metodo: metodo || c.metodoAlim, secao_minima: smin }, ec, { minimo: T.SECAO_MINIMA.alimentador, limiteQueda: Math.max(limiteQueda, 0.05) });
      } catch (e) { d = null; }
      if (!d || d.secao > c.secaoMaxParalelo) break;
      if (disjuntor <= d.iz * np + 1e-9) {
        return { id, descricao, ib, paralelos: np, secao: d.secao, secaoPE: d.secaoPE, secaoNeutro: neutro ? d.secao : null, iz: d.iz, izTotal: d.iz * np,
          disjuntor, queda: d.queda, comprimento: d.comprimento, metodo: d.metodo, fct: d.fct, fca: d.fca, criterio: d.criterio, limiteQueda };
      }
      smin = T.SECOES.find(s => s > d.secao);
      if (!smin) break;
    }
  }
  throw new Error(`${descricao}: nenhuma combinação de cabos em paralelo até ${c.secaoMaxParalelo} mm² atende (${Math.round(ib)} A, ${comprimento} m).`);
}

// Cabo informado (seção e paralelos): verifica capacidade (In ≤ Iz) e calcula a queda
function verificarCaboInformado({ secao, paralelos, comprimento, ib, disjuntor, neutro }, c) {
  const np = Math.max(1, paralelos || 1);
  const izRef = T.capacidade(secao, c.metodoAlim, 3, c.isolacao);
  if (izRef == null) throw new Error(`Cabo de entrada: seção ${secao} mm² sem capacidade tabelada no método ${c.metodoAlim}.`);
  const fct = T.fatorTemperatura(c.temperatura, c.isolacao, c.metodoAlim === 'D');
  const fca = T.fatorAgrupamento(np + c.agrupamentoAlim - 1);
  const iz = izRef * fct * fca;
  return { paralelos: np, secao, secaoPE: T.secaoPE(secao), secaoNeutro: neutro ? secao : null, iz, izTotal: iz * np, disjuntor, ib, comprimento,
    queda: (SQ3 * T.RHO_COBRE * comprimento * ib) / (secao * np * c.vff) * 100, metodo: c.metodoAlim, fct, fca, informado: true, atende: disjuntor <= iz * np + 1e-9 };
}

// ── Demanda e correção do fator de potência ────────────────────────────────

function demanda(unidades, outras, c) {
  const motores = unidades.map(u => {
    const pAbs = u.pKw / u.eta;
    const p = u.emOperacao ? pAbs * u.fu : 0;
    return { tag: u.tag, pAbs, fu: u.fu, kw: p, kvar: p * tg(u.fp), emOperacao: u.emOperacao, inversor: u.partida === 'inversor' };
  });
  const cargas = outras.map(o => { const p = o.kw * o.fd; return { id: o.id, descricao: o.descricao, kwInst: o.kw, fd: o.fd, kw: p, kvar: p * tg(o.fp) }; });
  const fs = c.fatorSimultaneidade;
  const kwMot = motores.reduce((s, m) => s + m.kw, 0);
  const kvarMot = motores.reduce((s, m) => s + m.kvar, 0);
  const kwOut = cargas.reduce((s, m) => s + m.kw, 0);
  const kvarOut = cargas.reduce((s, m) => s + m.kvar, 0);
  const kw = (kwMot + kwOut) * fs;
  const kvar = (kvarMot + kvarOut) * fs;
  const kva = Math.hypot(kw, kvar);
  return {
    motores, cargas, fatorSimultaneidade: fs, kwMot, kvarMot, kwOut, kvarOut, kw, kvar, kva, fp: kva ? kw / kva : 1, corrente: (kva * 1000) / (SQ3 * c.vff),
    instaladaKw: motores.reduce((s, m) => s + m.pAbs, 0) + outras.reduce((s, o) => s + o.kw, 0),
    kwInversores: motores.filter(m => m.inversor).reduce((s, m) => s + m.kw, 0) * fs,
  };
}

function bancoCapacitores(dem, c, ec) {
  const p = c.demandaMedidaKw || dem.kw;
  const fp1 = c.fpMedido || dem.fp;
  const fp2 = c.fpAlvo;
  const qNec = kvarCorrecao(p, fp1, fp2);
  const base = { pKw: p, fp1, fp2, fp1Medido: !!c.fpMedido, pMedida: !!c.demandaMedidaKw, qNecessario: qNec, qAntes: p * tg(fp1) };
  if (qNec < 1) return { ...base, necessario: false, total: 0, estagios: [], fpDepois: fp1, kvaAntes: p / fp1, kvaDepois: p / fp1 };
  let tipo = c.tipoBanco;
  if (tipo === 'auto' || !tipo) tipo = qNec <= 15 ? 'fixo' : 'automatico'; // banco fixo só para correção pequena e carga estável [CONFERIR]
  let estagio;
  let n;
  if (tipo === 'fixo') {
    estagio = X.proximo(X.ESTAGIOS_KVAR, qNec) || Math.ceil(qNec / 25) * 25;
    n = 1;
  } else {
    estagio = X.proximo(X.ESTAGIOS_KVAR, qNec / c.estagios) || 100;
    n = Math.ceil(qNec / estagio - 1e-9);
  }
  const total = estagio * n;
  const qDepois = base.qAntes - total;
  const kvaDepois = Math.hypot(p, qDepois);
  const ic = (total * 1000) / (SQ3 * c.vff);
  const icEstagio = (estagio * 1000) / (SQ3 * c.vff);
  const cabo = dimensionarAlimentador({ id: 'BC', descricao: 'Circuito do banco de capacitores', ib: X.FATOR_CORRENTE_CAPACITOR * ic, comprimento: c.bancoDistancia, limiteQueda: 1 }, c, ec);
  const harmonicos = dem.kw > 0 ? dem.kwInversores / dem.kw : 0;
  const dessintonizado = harmonicos >= 0.2;
  return {
    ...base, necessario: true, tipo, estagio, n, total, estagios: Array.from({ length: n }, () => estagio), controlador: tipo === 'automatico' ? c.estagios : 0,
    qDepois, fpDepois: p / kvaDepois, capacitivo: qDepois < 0, kvaAntes: p / fp1, kvaDepois,
    ic, icEstagio, ibCabo: X.FATOR_CORRENTE_CAPACITOR * ic, cabo,
    fusivelEstagio: X.proximo(X.FUSIVEIS, X.FATOR_FUSIVEL_CAPACITOR * icEstagio),
    tensaoCapacitor: c.tensaoCapacitor, kvarNominalEstagio: estagio * (c.tensaoCapacitor / c.vff) ** 2,
    harmonicos, dessintonizado, frequenciaSintonia: c.frequencia / Math.sqrt(0.07),
  };
}

// ── Curto-circuito (IEC 60909 simplificado) ─────────────────────────────────

function impedanciaFonte(c) {
  const V = c.vff;
  if (c.entrada === 'trafo') {
    let z = { r: 0, x: 0 };
    if (c.sccRedeMva) {
      const zq = (c.fatorC * V * V) / (c.sccRedeMva * 1e6);
      const rq = zq / Math.sqrt(1 + X.XR_REDE ** 2);
      z = somaZ(z, { r: rq, x: rq * X.XR_REDE });
    }
    const zb = (V * V) / (c.trafoKva * 1000);
    const zt = (c.trafoZ / 100) * zb;
    const rt = Math.min(c.trafoR, c.trafoZ * 0.95) / 100 * zb;
    return somaZ(z, { r: rt, x: Math.sqrt(zt * zt - rt * rt) });
  }
  const icc = (c.iccEntradaKa || 10) * 1000;
  const zq = (c.fatorC * V) / (SQ3 * icc);
  return { r: zq / Math.SQRT2, x: zq / Math.SQRT2 }; // X/R = 1 adotado para entrada em BT [CONFERIR]
}

function contribuicaoMotores(unidades, c) {
  if (!c.contribuicaoMotores) return 0;
  // motores assíncronos em operação contribuem com ≈ Ip (IEC 60909-0, 3.8); inversor não contribui
  return unidades.filter(u => u.emOperacao && u.partida !== 'inversor').reduce((s, u) => s + u.ipIn * u.in, 0);
}

function curtoNoPonto(z, zQuente, c, contribuicao) {
  const iccFonte = iccTrifasico(c.vff, z, c.fatorC);
  const icc = iccFonte + contribuicao;
  const k = kappa(z);
  return { z, iccFonte, contribuicao, icc, kappa: k, ip: k * Math.SQRT2 * icc, icuMin: X.proximo(X.ICU_KA, icc / 1000) || null,
    iccMin2f: (0.95 * c.vff) / (2 * modZ(zQuente)) };
}

// ── Queda de tensão na partida (NBR 5410, 6.5.1 e 6.2.7) ─────────────────────
// ΔV% = ΔV em regime até o quadro + 100·√3·Ip·(R·cosφp + X·senφp)/V em cada trecho.
// Y-Δ (estágio estrela): cada enrolamento tem 2 condutores em série → fator 2 no circuito.
function quedaPartida(u, zAteQuadro, quedaRegimeQuadro, secao, c) {
  const Ip = u.partidaInfo.ipLinha;
  const cos = u.fpPartida;
  const sen = Math.sqrt(1 - cos * cos);
  const dvFonte = (100 * SQ3 * Ip * (zAteQuadro.r * cos + zAteQuadro.x * sen)) / c.vff;
  const zc = zCabo(secao, 1, u.circuito.comprimento, X.RHO_QUENTE);
  const kCirc = u.partida === 'estrela_triangulo' ? 2 : 1;
  const dvCirc = (100 * kCirc * SQ3 * Ip * (zc.r * cos + zc.x * sen)) / c.vff;
  const dispositivo = quedaRegimeQuadro + dvFonte;
  return { ip: Ip, cos, dvFonte, regime: quedaRegimeQuadro, dispositivo, circuito: dvCirc, motor: dispositivo + dvCirc };
}

// ── Cálculo completo ───────────────────────────────────────────────────────

function calcular(dados) {
  const c = config(dados);
  const ec = configMotorEletrica(c);
  const avisos = [];
  const premissas = [];
  const quadrosIn = lerQuadros(dados);
  const lm = lerMotores(dados, c, quadrosIn);
  const unidades = lm.unidades;
  avisos.push(...lm.avisos);
  premissas.push(...lm.premissas);
  const outras = lerOutras(dados, c, quadrosIn);
  if (!unidades.length && !outras.length) throw new Error('Informe ao menos um motor (com potência) ou outra carga.');
  if (c.entrada === 'trafo' && !c.trafoKva) throw new Error('Informe a potência do transformador (kVA) ou marque entrada em baixa tensão.');

  // 1. Partida e circuito terminal de cada motor (regime)
  unidades.forEach(u => { u.partidaInfo = dispositivosPartida(u); u.circuito = circuitoMotor(u, c, ec); });
  outras.forEach(o => { o.circuito = circuitoOutra(o, c, ec); });

  // 2. Demanda e correção do FP
  const dem = demanda(unidades, outras, c);
  const banco = bancoCapacitores(dem, c, ec);

  // 3. Entrada: transformador → QGBT
  const inTrafo = c.entrada === 'trafo' ? (c.trafoKva * 1000) / (SQ3 * c.vff) : null;
  const disjuntorGeral = c.disjuntorGeralInformado || X.proximo(X.DISJUNTORES_GERAIS, inTrafo || dem.corrente);
  const neutroEntrada = c.esquema !== 'IT';
  let cabo;
  if (c.caboEntrada.secao) {
    cabo = verificarCaboInformado({ secao: c.caboEntrada.secao, paralelos: c.caboEntrada.paralelos, comprimento: c.caboEntrada.comprimento, ib: dem.corrente, disjuntor: disjuntorGeral, neutro: neutroEntrada }, c);
    if (!cabo.atende) avisos.push(`Cabo de entrada ${cabo.paralelos} × ${cabo.secao} mm² por fase: Iz = ${Math.round(cabo.izTotal)} A < disjuntor geral ${disjuntorGeral} A (5.3.4) — aumentar a seção ou o número de cabos.`);
  } else {
    cabo = dimensionarAlimentador({ id: 'ENT', descricao: c.entrada === 'trafo' ? 'Cabo transformador → QGBT' : 'Cabo ponto de entrega → QGBT', ib: disjuntorGeral, comprimento: c.caboEntrada.comprimento, limiteQueda: c.quedaEntrada, neutro: neutroEntrada }, c, ec);
  }
  cabo.quedaDemanda = (SQ3 * T.RHO_COBRE * cabo.comprimento * dem.corrente) / (cabo.secao * cabo.paralelos * c.vff) * 100;
  const entrada = { tipo: c.entrada, inTrafo, disjuntorGeral, cabo };

  // 4. Quadros/CCMs e alimentadores (6.5.1: Ib = 1,25·In do maior + ΣIn dos demais + outras cargas)
  const proj651 = (motores, cargas) => {
    const op = motores.filter(m => m.emOperacao);
    const maior = op.reduce((a, b) => (!a || b.in > a.in ? b : a), null);
    const somaDemais = op.filter(m => m !== maior).reduce((s, m) => s + m.in, 0);
    const iOutras = cargas.reduce((s, o) => s + o.iDemanda, 0);
    return { maior: maior ? maior.tag : null, inMaior: maior ? maior.in : 0, somaDemais, iOutras, ib: (maior ? 1.25 * maior.in : 0) + somaDemais + iOutras };
  };
  const quadros = quadrosIn.map(q => ({ ...q, motores: unidades.filter(u => u.quadro === q.id), outras: outras.filter(o => o.quadro === q.id) }));
  const qgbt = { id: 'QGBT', descricao: 'Quadro geral de baixa tensão', tipo: 'QGBT', motores: unidades.filter(u => u.quadro === 'QGBT'), outras: outras.filter(o => o.quadro === 'QGBT') };
  const maxTerminal = (q) => Math.max(0, ...q.motores.map(u => u.circuito.queda), ...q.outras.map(o => o.circuito.queda));
  const dimensionarQuadro = (q, fatorLimite = 1) => {
    q.projeto = proj651(q.motores, q.outras);
    let limite = Math.min(c.quedaAlim, c.quedaTotal - cabo.quedaDemanda - maxTerminal(q)) * fatorLimite;
    if (limite < 0.2) limite = 0.2;
    const neutro = q.outras.some(o => o.ligacao === 'FN') || q.outras.some(o => o.tipo === 'iluminacao' || o.tipo === 'tomadas');
    q.alim = q.projeto.ib > 0 ? dimensionarAlimentador({ id: `AL-${q.id}`, descricao: `Alimentador QGBT → ${q.id}`, ib: q.projeto.ib, comprimento: q.distancia, limiteQueda: limite, neutro }, c, ec) : null;
  };
  quadros.forEach(q => dimensionarQuadro(q));
  quadros.filter(q => !q.alim).forEach(q => avisos.push(`${q.id}: quadro sem cargas.`));
  qgbt.projeto = proj651(unidades, outras);

  // 5. Curto-circuito
  const zFonte = impedanciaFonte(c);
  const zEnt = zCabo(cabo.secao, cabo.paralelos, cabo.comprimento, X.RHO_20);
  const zEntQ = zCabo(cabo.secao, cabo.paralelos, cabo.comprimento, X.RHO_QUENTE);
  const zQgbt = somaZ(zFonte, zEnt);
  const zQgbtQ = somaZ(zFonte, zEntQ);
  const iccTerminaisTrafo = c.entrada === 'trafo' ? iccTrifasico(c.vff, zFonte, c.fatorC) : null;
  const calcCurtoQuadros = () => {
    qgbt.curto = curtoNoPonto(zQgbt, zQgbtQ, c, contribuicaoMotores(unidades, c));
    quadros.filter(q => q.alim).forEach(q => {
      q.zQuente = somaZ(zQgbtQ, zCabo(q.alim.secao, q.alim.paralelos, q.alim.comprimento, X.RHO_QUENTE));
      q.curto = curtoNoPonto(somaZ(zQgbt, zCabo(q.alim.secao, q.alim.paralelos, q.alim.comprimento, X.RHO_20)), q.zQuente, c, contribuicaoMotores(q.motores, c));
    });
    qgbt.zQuente = zQgbtQ;
  };
  calcCurtoQuadros();

  // 6. Queda na partida: ajusta o alimentador (terminais do dispositivo de partida) e depois o circuito do motor
  const quadroDoMotor = (u) => (u.quadro === 'QGBT' ? qgbt : quadros.find(q => q.id === u.quadro));
  const partidaDe = (u, secao) => {
    const q = quadroDoMotor(u);
    return quedaPartida(u, q.zQuente, cabo.quedaDemanda + (q.alim ? q.alim.queda : 0), secao, c);
  };
  for (const q of quadros.filter(x => x.alim && x.motores.length)) {
    let fator = 1;
    for (let i = 0; i < 12; i++) {
      const pior = Math.max(...q.motores.map(u => partidaDe(u, u.circuito.secao).dispositivo));
      if (pior <= c.quedaPartida) break;
      // só adianta engrossar o alimentador se a fonte + entrada sozinhas não estourarem o limite
      const semAlim = Math.max(...q.motores.map(u => quedaPartida(u, zQgbtQ, cabo.quedaDemanda, u.circuito.secao, c).dispositivo));
      if (semAlim > c.quedaPartida) break;
      fator *= 0.7;
      dimensionarQuadro(q, fator);
      q.alim.criterio = 'queda na partida (6.5.1)';
      q.zQuente = somaZ(zQgbtQ, zCabo(q.alim.secao, q.alim.paralelos, q.alim.comprimento, X.RHO_QUENTE));
    }
  }
  calcCurtoQuadros();
  for (const u of unidades) {
    let p = partidaDe(u, u.circuito.secao);
    let guarda = 0;
    while (p.motor > c.quedaPartida && p.dispositivo < c.quedaPartida && guarda++ < 12) {
      const prox = T.SECOES.find(s => s > u.circuito.secao);
      if (!prox || prox > 300) break;
      u.circuito = { ...circuitoMotor(u, c, ec, prox), criterio: 'queda na partida' };
      p = partidaDe(u, u.circuito.secao);
    }
    u.quedaPartida = p;
    const q = quadroDoMotor(u);
    u.quedaTotalRegime = cabo.quedaDemanda + (q.alim ? q.alim.queda : 0) + u.circuito.queda;
  }

  // 7. Icc no motor (fim do circuito) e verificação do disparo magnético
  for (const u of unidades) {
    const q = quadroDoMotor(u);
    const zq = q === qgbt ? zQgbt : somaZ(zQgbt, zCabo(q.alim.secao, q.alim.paralelos, q.alim.comprimento, X.RHO_20));
    const zM = somaZ(zq, zCabo(u.circuito.secao, 1, u.circuito.comprimento, X.RHO_20));
    const zMQ = somaZ(q.zQuente, zCabo(u.circuito.secao, 1, u.circuito.comprimento, X.RHO_QUENTE));
    u.curto = { iccMax: iccTrifasico(c.vff, zM, c.fatorC), iccMin2f: (0.95 * c.vff) / (2 * modZ(zMQ)), icuMin: q.curto.icuMin, iccQuadro: q.curto.icc };
    const q1 = u.partidaInfo.dispositivos.find(d => d.ref === 'Q1' && d.magnetico_a);
    if (q1 && u.curto.iccMin2f < 1.2 * q1.magnetico_a) avisos.push(`${u.tag}: Icc mínimo no motor (${(u.curto.iccMin2f / 1000).toFixed(2)} kA) abaixo de 1,2 × disparo magnético do disjuntor-motor (${Math.round(q1.magnetico_a)} A) — circuito longo: aumentar a seção ou verificar a proteção (5.3.5). [CONFERIR]`);
  }
  for (const o of outras) {
    const q = o.quadro === 'QGBT' ? qgbt : quadros.find(x => x.id === o.quadro);
    if (q.curto && q.curto.icc > 10000) avisos.push(`${o.descricao} (${q.id}): Icc no quadro ${(q.curto.icc / 1000).toFixed(1)} kA > 10 kA — minidisjuntor NBR NM 60898 só com proteção de retaguarda (back-up) ou usar disjuntor IEC 60947-2.`);
  }

  // 8. Transformador
  let trafo = null;
  if (c.entrada === 'trafo') {
    const sAntes = banco.necessario || banco.fp1Medido || banco.pMedida ? banco.kvaAntes : dem.kva;
    const sDepois = banco.necessario ? banco.kvaDepois : sAntes;
    const limite = c.trafoKva * c.carregamentoMax / 100;
    trafo = {
      kva: c.trafoKva, z: c.trafoZ, r: c.trafoR, rInformado: c.trafoRInformado, inSec: inTrafo, iccTerminais: iccTerminaisTrafo,
      sAntes, sDepois, carregamentoAntes: sAntes / c.trafoKva, carregamentoDepois: sDepois / c.trafoKva, atende: sDepois <= limite + 1e-9,
      sugerido: sDepois > limite ? X.proximo(X.TRAFOS_KVA, sDepois / (c.carregamentoMax / 100)) : null,
    };
    if (!trafo.atende) avisos.push(`Transformador de ${c.trafoKva} kVA com carregamento de ${Math.round(trafo.carregamentoDepois * 100)} % após a correção do FP — trocar por ${trafo.sugerido || 'unidade maior'} kVA ou rever a demanda.`);
    if (!c.trafoRInformado) premissas.push(`Resistência do transformador adotada R = ${String(X.R_TRAFO_PCT_PADRAO).replace('.', ',')} % (perdas em carga típicas) — informe as perdas no cobre do ensaio/placa. [CONFERIR]`);
    if (!c.sccRedeMva) premissas.push('Potência de curto-circuito da rede de média tensão não informada: adotada rede infinita (lado da segurança para o Icc; otimista para a queda na partida). [CONFERIR com a distribuidora]');
  } else {
    premissas.push(`Entrada em baixa tensão: Icc no ponto de entrega ${c.iccEntradaKa || 10} kA${c.iccEntradaKa ? '' : ' (adotado)'} com X/R = 1. [CONFERIR com a distribuidora]`);
  }
  if (dem.corrente > disjuntorGeral) avisos.push(`Corrente de demanda (${Math.round(dem.corrente)} A) acima do disjuntor geral (${disjuntorGeral} A).`);

  // 9. Conjuntos (NBR IEC 61439): corrente nominal e suportabilidade
  const conjunto = (q, inEntrada) => ({ barramento: X.proximo(X.BARRAMENTOS_A, inEntrada), icw: X.proximo(X.ICW_KA, q.curto.icc / 1000), ipk: q.curto.ip });
  qgbt.conjunto = conjunto(qgbt, disjuntorGeral);
  quadros.filter(q => q.alim).forEach(q => { q.conjunto = conjunto(q, q.alim.disjuntor); });

  // 10. Avisos finais
  for (const u of unidades) {
    u.partidaInfo.observacoes.filter(o => /não permite Y-Δ/.test(o)).forEach(o => avisos.push(`${u.tag}: ${o}`));
    if (u.quedaPartida.dispositivo > c.quedaPartida) avisos.push(`${u.tag}: queda na partida de ${u.quedaPartida.dispositivo.toFixed(1)} % nos terminais do dispositivo de partida (> ${c.quedaPartida} %) mesmo com o alimentador reforçado — usar partida com tensão reduzida (Y-Δ, soft-starter, inversor) ou transformador maior.`);
    else if (u.quedaPartida.motor > c.quedaPartida) avisos.push(`${u.tag}: queda na partida de ${u.quedaPartida.motor.toFixed(1)} % nos terminais do motor (> ${c.quedaPartida} %) — verificar o conjugado de partida. [CONFERIR]`);
    if (u.quedaTotalRegime > c.quedaTotal + 1e-6) avisos.push(`${u.tag}: queda total em regime ${u.quedaTotalRegime.toFixed(2)} % > ${c.quedaTotal} % (6.2.7).`);
    if (X.REGIMES_AC4.includes(u.regime)) avisos.push(`${u.tag}: regime ${u.regime} — contator pela categoria AC-4 e verificação térmica do motor/cabo para o número de manobras. [CONFERIR]`);
  }
  if (banco.necessario && banco.dessintonizado) avisos.push(`Inversores somam ${Math.round(banco.harmonicos * 100)} % da demanda: banco de capacitores com reator de dessintonia (p = 7 %, sintonia ≈ ${Math.round(banco.frequenciaSintonia)} Hz) e medição de harmônicos antes da compra. [CONFERIR]`);
  if (banco.capacitivo) avisos.push('O banco projetado deixa a instalação capacitiva na demanda calculada — reduzir o estágio fixo ou usar banco automático.');
  if (c.fpMedido == null) premissas.push('FP de partida da correção calculado a partir dos dados de placa e fatores de utilização — use o FP medido (fatura/analisador de energia) para o projeto final. [CONFERIR]');
  premissas.push(
    `Queda de tensão na partida limitada a ${c.quedaPartida} % (NBR 5410, 6.5.1 / 6.2.7), com FP de partida ${String(X.FP_PARTIDA_PADRAO).replace('.', ',')} (inversor ${String(X.FP_PARTIDA_INVERSOR).replace('.', ',')}) e reatância de cabo ${X.X_CABO * 1000} mΩ/m; tensão no secundário em vazio igual à nominal. [CONFERIR]`,
    'Contribuição dos motores em operação ao curto-circuito somada aritmeticamente (≈ Ip de cada motor; inversores não contribuem) — lado da segurança. [CONFERIR]',
    'Faixas de disjuntor-motor/relé, correntes AC-3 de contatores e valores de soft-starter/inversor de catálogo genérico — escolher o modelo pela tabela de coordenação tipo 2 do fabricante (NBR IEC 60947-4-1). [CONFERIR]',
    'Fatores de demanda das outras cargas típicos (iluminação 1,0; tomadas 0,3; resistivas 1,0). [CONFERIR]',
  );

  const resultado = { config: c, unidades, outras, quadros, qgbt, demanda: dem, banco, entrada, trafo, avisos, premissas };
  resultado.materiais = materiais(resultado);
  return resultado;
}

// ── Materiais ──────────────────────────────────────────────────────────────

function materiais(calc) {
  const { config: c, unidades, outras, quadros, qgbt, entrada, banco } = calc;
  const itens = [];
  const mapa = new Map();
  const add = (codigo, descricao, unidade, quantidade, referencia) => {
    if (!(quantidade > 0)) return;
    const k = `${codigo}|${descricao}`;
    if (mapa.has(k)) { mapa.get(k).quantidade = arred(mapa.get(k).quantidade + quantidade, 1); return; }
    const it = { codigo, descricao, unidade, quantidade: arred(quantidade, 1), referencia };
    mapa.set(k, it);
    itens.push(it);
  };
  const iso = c.isolacao === 'PVC' ? '0,6/1 kV PVC 70 °C' : '0,6/1 kV EPR/XLPE 90 °C';
  const cabos = {};
  const soma = (s, m) => { if (s) cabos[s] = (cabos[s] || 0) + m; };
  const bandejas = { tronco: [], entrada: [] };
  const diametro = (s) => X.DIAMETRO_CABO[s] || (1.6 * Math.sqrt(s) + 3);
  const ocupa = (lista, s, n) => { for (let i = 0; i < n; i++) lista.push({ s, d: diametro(s) }); };
  for (const q of [qgbt, ...quadros]) q.areasRamais = [];
  const quadroObj = (id) => (id === 'QGBT' ? qgbt : quadros.find(q => q.id === id));

  for (const u of unidades) {
    const L = u.circuito.comprimento * FOLGA;
    soma(u.circuito.secao, L * u.circuito.condutores);
    soma(u.circuito.secaoPE, L);
    const q = quadroObj(u.quadro);
    ocupa(q.areasRamais, u.circuito.secao, u.circuito.condutores);
    ocupa(q.areasRamais, u.circuito.secaoPE, 1);
  }
  for (const o of outras) {
    const L = o.circuito.comprimento * FOLGA;
    const nf = o.ligacao === 'FFF' ? 3 : 1;
    soma(o.circuito.secao, L * nf);
    soma(o.circuito.secaoNeutro, L);
    soma(o.circuito.secaoPE, L);
    const q = quadroObj(o.quadro);
    ocupa(q.areasRamais, o.circuito.secao, nf + (o.circuito.secaoNeutro ? 1 : 0));
    ocupa(q.areasRamais, o.circuito.secaoPE, 1);
  }
  const somaAlim = (a, lista) => {
    const L = a.comprimento * FOLGA;
    soma(a.secao, L * 3 * a.paralelos);
    if (a.secaoNeutro) soma(a.secaoNeutro, L * a.paralelos);
    soma(a.secaoPE, L * a.paralelos);
    if (lista) { ocupa(lista, a.secao, (3 + (a.secaoNeutro ? 1 : 0)) * a.paralelos); ocupa(lista, a.secaoPE, a.paralelos); }
  };
  quadros.filter(q => q.alim).forEach(q => somaAlim(q.alim, bandejas.tronco));
  if (c.fornecerCaboEntrada) somaAlim(entrada.cabo, bandejas.entrada);
  if (banco.necessario) somaAlim(banco.cabo, null);
  Object.keys(cabos).map(Number).sort((a, b) => a - b).forEach(s => add(`CAB-${String(s).replace('.', ',')}`, `Cabo de cobre flexível ${String(s).replace('.', ',')} mm² ${iso}`, 'm', Math.ceil(cabos[s]), 'NBR 5410, 6.2 (metros de condutor; em cabo multipolar, dividir pelo nº de veias)'));

  // Partidas
  for (const u of unidades) {
    for (const d of u.partidaInfo.dispositivos) {
      if (d.tipo === 'disjuntor_motor') add('DM', `Disjuntor-motor tripolar faixa ${String(d.faixa[0]).replace('.', ',')}–${String(d.faixa[1]).replace('.', ',')} A, Icu ≥ ${u.curto.icuMin} kA em ${c.vff} V`, 'un', 1, 'NBR IEC 60947-2 / 60947-4-1');
      else if (d.tipo === 'caixa_moldada') add('DCM', `Disjuntor de caixa moldada tripolar ${d.nominal_a} A para proteção de motor, Icu ≥ ${u.curto.icuMin} kA em ${c.vff} V`, 'un', 1, 'NBR IEC 60947-2');
      else if (d.tipo === 'fusivel') add('FUS', d.especificacao.replace(/ \(3 un\)/, ''), 'un', 3, 'NBR IEC 60269 / coordenação tipo 2');
      else if (d.tipo === 'contator') add('CT', `Contator tripolar ${d.nominal_a} A AC-3 em ${c.vff} V, bobina 220 V CA, com contatos auxiliares`, 'un', 1, 'NBR IEC 60947-4-1');
      else if (d.tipo === 'rele_sobrecarga') add('RT', `Relé de sobrecarga faixa ${String(d.faixa[0]).replace('.', ',')}–${String(d.faixa[1]).replace('.', ',')} A, classe 10`, 'un', 1, 'NBR IEC 60947-4-1');
      else if (d.tipo === 'temporizador') add('TMP', 'Relé temporizador estrela-triângulo', 'un', 1, 'NBR IEC 60947-5-1');
      else if (d.tipo === 'soft_starter') add('SS', `Soft-starter ${Math.ceil(d.corrente_a)} A mínimo em ${c.vff} V, by-pass incorporado (motor ${u.tag})`, 'un', 1, 'NBR IEC 60947-4-2');
      else if (d.tipo === 'inversor') add('INV', `Inversor de frequência ${Math.ceil(d.corrente_a)} A mínimo / ${String(arred(u.pKw, 1)).replace('.', ',')} kW em ${c.vff} V (motor ${u.tag})`, 'un', 1, 'IEC 61800-2 / 61800-5-1');
    }
    add('CMD', 'Conjunto de comando da partida: botões liga/desliga e sinaleiros (verde/vermelho/amarelo) 22 mm', 'un', 1, 'NBR IEC 60947-5-1; NBR IEC 60073');
    if (u.seccionadoraLocal) add('SEC', `Chave seccionadora rotativa tripolar ${X.proximo(X.CONTATORES_AC3, u.in)} A AC-23 com bloqueio por cadeado, junto ao motor`, 'un', 1, 'NBR 5410, 5.6 (seccionamento para manutenção) [CONFERIR]; NR-10, 10.5');
    add('ELF', 'Eletroduto metálico flexível revestido (sealtubo) com conectores — chegada ao motor', 'm', c.eletrodutoFinalM, 'NBR 5410, 6.2.11 [CONFERIR comprimento]');
    add('KIT', 'Kit de terminais de compressão, anilhas de identificação e prensa-cabos (por circuito)', 'un', 1, 'NBR 5410, 6.1.5');
  }
  for (const o of outras) add('DISJ', `Disjuntor ${o.circuito.polos}P ${o.circuito.disjuntor} A curva C — ${o.descricao}`, 'un', 1, 'NBR 5410, 5.3.4');

  // Quadros
  const nDps = c.esquema === 'TN-S' || c.esquema === 'TT' ? 4 : 3;
  const uc = [175, 275, 320, 385, 440].find(v => v >= 1.1 * c.vfn) || 440;
  add('QGBT', `QGBT em conjunto NBR IEC 61439-2: barramento ${qgbt.conjunto.barramento} A, Icw ≥ ${qgbt.conjunto.icw} kA/1 s, Ipk ≥ ${(qgbt.curto.ip / 1000).toFixed(1).replace('.', ',')} kA, IP54 [CONFERIR forma de separação]`, 'un', 1, 'NBR IEC 61439-1/-2');
  add('DG', `Disjuntor geral tripolar ${entrada.disjuntorGeral} A (caixa moldada/aberto) com unidade de proteção ajustável, Icu ≥ ${qgbt.curto.icuMin} kA em ${c.vff} V`, 'un', 1, 'NBR IEC 60947-2; NBR 5410, 5.3.5');
  add('DPS', `DPS classe II, Uc ≥ ${uc} V, In ≥ 20 kA (8/20 µs) no QGBT`, 'un', nDps, 'NBR 5410, 6.3.5.2 e Tabela 49');
  for (const q of quadros.filter(x => x.alim)) {
    add('DAL', `Disjuntor tripolar ${q.alim.disjuntor} A (caixa moldada) para o alimentador do ${q.id}, Icu ≥ ${qgbt.curto.icuMin} kA em ${c.vff} V`, 'un', 1, 'NBR IEC 60947-2; NBR 5410, 6.5.1');
    add('CCM', `${q.tipo === 'CCM' ? 'Centro de controle de motores' : 'Quadro de distribuição'} ${q.id} em conjunto NBR IEC 61439-2: barramento ${q.conjunto.barramento} A, Icw ≥ ${q.conjunto.icw} kA/1 s, ${X.FORMAS[q.forma] || 'forma ' + q.forma}, ${q.ip}, chave geral com bloqueio`, 'un', 1, 'NBR IEC 61439-1/-2');
    if (q.motores.length) add('EMG', `Botão de emergência tipo cogumelo com trava na porta do ${q.id} (NR-12) [CONFERIR também nas máquinas]`, 'un', 1, 'NR-12; ABNT NBR ISO 13850');
  }
  if (qgbt.motores.length) add('EMG', 'Botão de emergência tipo cogumelo com trava no QGBT (motores ligados direto) [CONFERIR também nas máquinas]', 'un', 1, 'NR-12; ABNT NBR ISO 13850');

  // Banco de capacitores
  if (banco.necessario) {
    const vcap = banco.tensaoCapacitor;
    if (banco.tipo === 'automatico') {
      add('BC', `Banco de capacitores automático ${String(banco.total).replace('.', ',')} kvar efetivos em ${c.vff} V (${banco.n} estágios de ${String(banco.estagio).replace('.', ',')} kvar; capacitores ${vcap} V${banco.dessintonizado ? ', com reatores de dessintonia 7 %' : ''}), controlador de FP de ${banco.controlador} estágios, contatores para capacitor AC-6b e fusíveis NH ${banco.fusivelEstagio} A por estágio`, 'un', 1, 'IEC 60831-1; NBR IEC 61439-2; REN ANEEL 1000/2021');
    } else {
      add('BC', `Banco de capacitores fixo ${String(banco.total).replace('.', ',')} kvar efetivos em ${c.vff} V (capacitores ${vcap} V) com fusíveis NH ${banco.fusivelEstagio} A e resistores de descarga`, 'un', 1, 'IEC 60831-1; REN ANEEL 1000/2021');
    }
    add('DBC', `Disjuntor tripolar ${banco.cabo.disjuntor} A para o banco de capacitores (≥ 1,43 × Ic), Icu ≥ ${qgbt.curto.icuMin} kA`, 'un', 1, 'IEC 60831-1; NBR IEC 60947-2');
  }

  // Eletrocalhas (ocupação adotada 40 % de largura × 100 mm) [CONFERIR traçado]
  // cabos ≥ 95 mm² em camada única (soma dos diâmetros); menores pela área com ocupação de 40 % [CONFERIR]
  const largura = (cabosBandeja) => {
    const grandes = cabosBandeja.filter(k => k.s >= 95).reduce((s, k) => s + k.d, 0);
    const pequenos = cabosBandeja.filter(k => k.s < 95).reduce((s, k) => s + Math.PI / 4 * k.d * k.d, 0) / (X.ELETROCALHA_ALTURA * X.ELETROCALHA_OCUPACAO);
    return X.proximo(X.ELETROCALHA_LARGURAS, grandes + pequenos) || X.ELETROCALHA_LARGURAS[X.ELETROCALHA_LARGURAS.length - 1];
  };
  const eletrocalha = [];
  for (const q of [qgbt, ...quadros]) {
    if (!q.areasRamais.length) continue;
    const cargas = [...q.motores.map(u => u.circuito.comprimento), ...q.outras.map(o => o.circuito.comprimento)];
    const m = q.eletrocalhaM || Math.max(...cargas);
    const w = largura(q.areasRamais);
    eletrocalha.push({ trecho: `ramais do ${q.id}`, largura: w, metros: m });
    add('ELC', `Eletrocalha perfurada tipo U ${w} × ${X.ELETROCALHA_ALTURA} mm, aço galvanizado a fogo, com tampa, curvas, tês e suportes — ramais do ${q.id}`, 'm', Math.ceil(m), 'NBR 5410, 6.2.11.4 [CONFERIR traçado]');
  }
  if (bandejas.tronco.length) {
    const m = Math.max(...quadros.filter(q => q.alim).map(q => q.alim.comprimento));
    const w = largura(bandejas.tronco);
    eletrocalha.push({ trecho: 'tronco dos alimentadores', largura: w, metros: m });
    add('ELC', `Eletrocalha perfurada tipo U ${w} × ${X.ELETROCALHA_ALTURA} mm, aço galvanizado a fogo, com acessórios — tronco dos alimentadores QGBT → quadros`, 'm', Math.ceil(m), 'NBR 5410, 6.2.11.4 [CONFERIR traçado]');
  }
  if (bandejas.entrada.length) {
    const w = largura(bandejas.entrada);
    eletrocalha.push({ trecho: 'entrada', largura: w, metros: entrada.cabo.comprimento });
    add('ELC', `Leito/eletrocalha ${w} × ${X.ELETROCALHA_ALTURA} mm, aço galvanizado a fogo, com acessórios — ${c.entrada === 'trafo' ? 'transformador' : 'entrada'} → QGBT`, 'm', Math.ceil(entrada.cabo.comprimento), 'NBR 5410, 6.2.11.4 [CONFERIR traçado]');
  }
  calc.eletrocalha = eletrocalha;
  return itens;
}

module.exports = {
  calcular, config, potenciaKw, correnteNominalMotor, kvarCorrecao, iccTransformador, iccTrifasico, kappa, dispositivosPartida,
  tensoesPlaca, impedanciaFonte,
};
