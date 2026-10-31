// Projeto de fabricação de quadros elétricos e de automação (conjuntos de BT —
// ABNT NBR IEC 61439-1/-2, com a NBR 5410 para os circuitos). A partir do
// unifilar/quadro de cargas: corrente de cada circuito e por fase, disjuntor
// geral, coordenação (Icu × Icc, DR, seletividade), DPS, barramentos (corrente,
// curto térmico e esforço eletrodinâmico), automação (E/S com reserva, fonte
// 24 Vcc, relés, bornes), componentes com dimensões e perdas, arranjo físico e
// invólucro (./layout.js), elevação de temperatura (IEC TR 60890, simplificado)
// e lista de materiais. Tabelas e fontes em ./tabelas.js.

const T = require('./tabelas');
const ET = require('../../../_comum/eletrico/tabelas');
const { ucDps } = require('../../../_comum/dps');
const EI = require('../../../eletrica-industrial/scripts/lib/calculo');
const XI = require('../../../eletrica-industrial/scripts/lib/tabelas');
const { montarLayout } = require('./layout');
const { criarSeletor } = require('./catalogo');

const SQ3 = Math.sqrt(3);
const num = (v, padrao = null) => (v == null || v === '' || !Number.isFinite(Number(v)) ? padrao : Number(v));
const arred = (v, c = 2) => (v == null ? null : Math.round(v * 10 ** c) / 10 ** c);
const fracao = (v, padrao) => { const x = num(v, padrao); return x != null && x > 1 ? x / 100 : x; };
const ICC_PADRAO_KA = 10; // mesma premissa das outras skills quando a Icc não é informada [CONFERIR]

// ── Configuração ────────────────────────────────────────────────────────────

const TIPOS_QUADRO = {
  distribuicao: 'Quadro de distribuição (QD/QGBT)',
  automacao: 'Quadro de automação (CLP)',
  ccm: 'Centro de controle de motores (CCM)',
  comando: 'Quadro de comando de máquina',
};

function config(dados) {
  const q = dados.quadro || {};
  const sistema = ['monofasico', 'bifasico', 'trifasico'].includes(q.sistema) ? q.sistema : 'trifasico';
  const vff = num(q.tensao_ff, 380);
  const vfn = num(q.tensao_fn, Math.round(vff / SQ3));
  const esquema = q.esquema || 'TN-S';
  const tipo = TIPOS_QUADRO[q.tipo] ? q.tipo : 'distribuicao';
  const iccInformada = num(q.icc_ka) != null;
  const icc = num(q.icc_ka, ICC_PADRAO_KA);
  const n = T.FATOR_N_IPK.find(f => icc <= f.ate);
  const montagem = T.INVOLUCROS[q.montagem] ? q.montagem : (tipo === 'ccm' ? 'autoportante' : 'sobrepor');
  const local = T.LOCAIS[q.local] ? q.local : 'interno_tecnico';
  return {
    tag: q.tag || 'QD-01', descricao: q.descricao || '', tipo, tipoRotulo: TIPOS_QUADRO[tipo],
    maquina: !!q.maquina || tipo === 'comando',
    sistema, nFases: { monofasico: 1, bifasico: 2, trifasico: 3 }[sistema], vff, vfn, esquema, frequencia: num(q.frequencia_hz, 60),
    icc, iccInformada, ipk: num(q.ipk_ka, arred(n.n * icc, 2)), ipkInformado: num(q.ipk_ka) != null, fatorN: n.n,
    tempoIcw: num(q.tempo_icw_s, 1),
    geralInformado: num(q.disjuntor_geral_a), geralFabricante: q.geral_fabricante || null, geralReferencia: q.geral_referencia || null, dpsFabricante: q.dps_fabricante || null, geralTipo: q.geral_tipo || 'auto', geralPolos: num(q.geral_polos), geralIcu: num(q.geral_icu_ka),
    drGeral: !!q.dr_geral, drGeralMa: num(q.dr_geral_ma, 300),
    spda: !!q.spda, dpsClasse: q.dps_classe || 'auto', pontoEntrada: q.ponto_entrada !== false,
    multimedidor: !!q.multimedidor,
    local, localInfo: T.LOCAIS[local], montagem, posicao: q.posicao || (montagem === 'autoportante' ? 'parede' : 'parede'),
    material: T.COEF_TRANSMISSAO[q.material] ? q.material : 'aco',
    temperatura: num(q.temperatura_ambiente, 35), temperaturaMax: num(q.temperatura_max_interna, 50), altitude: num(q.altitude_m, 0),
    forma: q.forma_separacao && q.forma_separacao !== 'auto' ? String(q.forma_separacao) : null,
    ip: q.ip && q.ip !== 'auto' ? q.ip : null, ik: q.ik && q.ik !== 'auto' ? q.ik : null,
    entradaCabos: q.entrada_cabos === 'superior' ? 'superior' : 'inferior',
    barramento: ['pente', 'barra'].includes(q.barramento) ? q.barramento : 'auto',
    barraPintada: !!q.barra_pintada, temperaturaBarra: num(q.temperatura_max_barra, 65),
    apoios: num(q.distancia_apoios_mm, 300), entreFases: num(q.distancia_fases_mm, 60),
    neutroReduzido: !!q.neutro_reduzido,
    bornesSaida: q.bornes_saida == null || q.bornes_saida === 'auto' ? tipo !== 'distribuicao' : (q.bornes_saida === true || q.bornes_saida === 'sim'),
    reservaPct: fracao(q.reserva_pct, 0.2), fatorDiversidade: num(q.fator_diversidade),
    fiacaoM: num(q.comprimento_fiacao_interna_m, 1.0),
    ventilacao: q.ventilacao || 'auto',
    uimpKv: num(q.uimp_kv, vff > 300 ? 6 : 4), ui: num(q.ui_v, vff > 400 ? 690 : 500),
    metodoSaida: q.metodo_saida || 'B1', isolacaoSaida: q.isolacao_saida || 'PVC', temperaturaCabos: num(q.temperatura_cabos, 30),
    residencial: !!q.residencial,
  };
}

// ── Circuitos ───────────────────────────────────────────────────────────────

const LIGACOES = { FN: { fases: 1, neutro: true }, FF: { fases: 2, neutro: false }, FFN: { fases: 2, neutro: true }, FFF: { fases: 3, neutro: false }, FFFN: { fases: 3, neutro: true } };
const TIPOS_CIRCUITO = {
  iluminacao: 'Iluminação', tug: 'Tomadas de uso geral', tue: 'Tomada / uso específico', motor: 'Motor (sem partida no quadro)',
  alimentador: 'Alimentador de outro quadro', ar_condicionado: 'Ar-condicionado', automacao: 'Comando / automação', reserva: 'Reserva equipada', outro: 'Outro',
};

const normFases = (s) => String(s || '').toUpperCase().replace(/L1|R/g, 'A').replace(/L2|S/g, 'B').replace(/L3|T/g, 'C').replace(/[^ABC]/g, '').split('').filter((x, i, a) => a.indexOf(x) === i);

function tensaoDoCircuito(lig, c) {
  if (lig.fases === 1) return c.vfn;
  return c.vff;
}

function correnteDoCircuito(p, fp, lig, c) {
  if (!(p > 0)) return null;
  const v = tensaoDoCircuito(lig, c);
  return lig.fases === 3 ? p / (SQ3 * v * fp) : p / (v * fp);
}

// Seção mínima da fiação interna de potência pela corrente do dispositivo
function fioPorCorrente(i) {
  const f = T.FIO_POR_CORRENTE.find(([a]) => i <= a + 1e-9);
  return f ? f[1] : 70;
}

function lerCircuitos(dados, c, avisos) {
  const lista = (dados.circuitos || []).filter(x => x && (x.n != null || x.descricao));
  const carga = { A: 0, B: 0, C: 0 };
  const fasesDisp = ['A', 'B', 'C'].slice(0, c.nFases);
  return lista.map((x, i) => {
    let ligacao = LIGACOES[x.ligacao] ? x.ligacao : 'FN';
    if (LIGACOES[ligacao].fases > c.nFases) { avisos.push(`Circuito ${x.n ?? i + 1}: ligação ${ligacao} exige mais fases que o sistema ${c.sistema} — ajustada.`); ligacao = c.nFases === 1 ? 'FN' : 'FF'; }
    const lig = LIGACOES[ligacao];
    const tipo = TIPOS_CIRCUITO[x.tipo] ? x.tipo : 'outro';
    const fp = num(x.fp, tipo === 'iluminacao' || tipo === 'tug' ? 0.92 : 0.9);
    const potencia = num(x.potencia_w, 0);
    const ibInformada = num(x.ib_a);
    const ib = ibInformada ?? correnteDoCircuito(potencia, fp, lig, c) ?? 0;
    // fases: as informadas ou a(s) menos carregada(s) — balanceamento simples
    let fases = normFases(x.fases).filter(f => fasesDisp.includes(f));
    if (fases.length !== lig.fases) {
      fases = [...fasesDisp].sort((a, b) => carga[a] - carga[b]).slice(0, lig.fases).sort();
    }
    fases.forEach(f => { carga[f] += ib; });
    const disjuntorInformado = num(x.disjuntor_a);
    const disjuntor = disjuntorInformado ?? (tipo === 'reserva' ? 16 : T.proximo(T.DISJUNTORES_DIN, Math.max(ib, 6)) || T.proximo(T.DISJUNTORES_CM, ib));
    const caixaMoldada = disjuntor > 125 || x.dispositivo === 'caixa_moldada';
    const dr = ['ddr', 'idr'].includes(x.dr) ? x.dr : '';
    const secao = num(x.secao_mm2);
    return {
      n: String(x.n ?? i + 1), descricao: x.descricao || TIPOS_CIRCUITO[tipo], tipo, tipoRotulo: TIPOS_CIRCUITO[tipo], ligacao, neutro: lig.neutro, nFases: lig.fases,
      fases, potencia, fp, ib, ibInformada: ibInformada != null, tensao: tensaoDoCircuito(lig, c),
      disjuntor, disjuntorInformado: disjuntorInformado != null, curva: x.curva || (tipo === 'motor' ? 'D' : 'C'), caixaMoldada,
      polos: lig.fases, icuInformado: num(x.icu_ka), dr, drGrupo: dr === 'idr' ? String(x.dr_grupo || '').trim() : '', drMa: num(x.dr_ma, 30),
      drTipo: x.dr_tipo || '', secao, localDr: !!x.local_dr, dps: !!x.dps, reserva: tipo === 'reserva',
      fio: Math.max(secao || 0, fioPorCorrente(disjuntor)),
      fabricante: x.fabricante || null, referencia: x.referencia || null,
    };
  });
}

// ── Motores (partida no quadro: pela skill de elétrica industrial) ──────────

function lerMotores(dados, c) {
  const out = [];
  for (const [i, m] of (dados.motores || []).entries()) {
    if (!m || !(num(m.potencia) > 0 || num(m.in_placa_a) > 0)) continue;
    const pKw = EI.potenciaKw({ potencia: num(m.potencia, 0), unidade: m.unidade || 'cv' });
    const eta = fracao(m.rendimento, T.MOTOR_PADRAO.eta);
    const fp = num(m.fp, T.MOTOR_PADRAO.fp);
    const inPlaca = num(m.in_placa_a);
    const inCalc = pKw > 0 ? EI.correnteNominalMotor(pKw, c.vff, eta, fp) : null;
    const In = inPlaca ?? inCalc;
    const partida = XI.PARTIDAS[m.partida] ? m.partida : 'direta';
    const qtd = Math.max(1, Math.round(num(m.quantidade, 1)));
    for (let k = 0; k < qtd; k++) {
      const u = {
        in: In, ipIn: num(m.ip_in, T.MOTOR_PADRAO.ipIn), partida, protecao: 'auto', regime: m.regime || 'S1',
        placa: EI.tensoesPlaca(m.tensao_placa || ''), tensao: c.vff, tensaoPlaca: m.tensao_placa || '',
        limitePartida: partida === 'soft_starter' ? XI.LIMITE_SOFT_PADRAO : XI.LIMITE_INVERSOR_PADRAO, pKw,
      };
      const p = EI.dispositivosPartida(u);
      const tagBase = m.tag || `M${i + 1}`;
      out.push({
        tag: qtd > 1 ? `${tagBase}.${k + 1}` : tagBase, descricao: m.descricao || 'Motor', pKw, cv: pKw / XI.CV_KW, eta, fp, in: In, inPlaca: inPlaca != null,
        partida, partidaRotulo: XI.PARTIDAS[partida].rotulo, partidaInfo: p, secao: num(m.secao_mm2),
        fio: Math.max(num(m.secao_mm2, 0), fioPorCorrente(1.25 * In)),
        fabricante: m.fabricante || null,
        // referência única vale para o soft-starter/inversor (T1) ou, na partida direta, para o contator K1
        referencias: m.referencias && typeof m.referencias === 'object' ? m.referencias : (m.referencia ? { [partida === 'soft_starter' || partida === 'inversor' ? 'T1' : 'K1']: m.referencia } : {}),
        semPlaca: num(m.rendimento) == null || num(m.fp) == null,
      });
    }
  }
  return out;
}

// ── Demanda, fases e disjuntor geral ────────────────────────────────────────

function rdf(nCircuitos) {
  return T.porFaixa(T.RDF, nCircuitos);
}

function demanda(circuitos, motores, c) {
  const ativos = circuitos.filter(x => !x.reserva);
  const nSaidas = ativos.length + motores.length;
  const fd = c.fatorDiversidade ?? rdf(nSaidas);
  const fase = { A: 0, B: 0, C: 0 };
  ativos.forEach(x => x.fases.forEach(f => { fase[f] += x.ib; }));
  const somaMot = motores.reduce((s, m) => s + m.in, 0);
  const maiorMot = motores.reduce((a, m) => Math.max(a, m.in), 0);
  const fasesUsadas = ['A', 'B', 'C'].slice(0, c.nFases);
  // corrente de projeto do quadro por fase: FD × Σ Ib + motores (NBR 5410, 6.5.1: 1,25 × In do maior + Σ In dos demais)
  const porFase = Object.fromEntries(fasesUsadas.map(f => [f, fd * fase[f] + (motores.length ? somaMot + 0.25 * maiorMot : 0)]));
  const vals = Object.values(porFase);
  const iMax = Math.max(...vals, 0);
  const iMin = Math.min(...vals);
  const neutro = c.nFases > 1 ? Math.sqrt(Math.max(0, fase.A ** 2 + fase.B ** 2 + fase.C ** 2 - fase.A * fase.B - fase.B * fase.C - fase.C * fase.A)) * fd : iMax;
  return {
    fd, fdInformado: c.fatorDiversidade != null, nSaidas, instalada: fase, porFase, iProjeto: iMax, neutro,
    desequilibrio: c.nFases > 1 && iMax > 0 ? (iMax - iMin) / iMax : 0,
    potenciaKva: c.nFases === 1 ? iMax * c.vfn / 1000 : c.nFases === 2 ? iMax * c.vff / 1000 : SQ3 * c.vff * iMax / 1000,
  };
}

function disjuntorGeral(c, dem, avisos) {
  const ib = dem.iProjeto;
  let In = c.geralInformado;
  if (In == null) In = T.proximo(T.DISJUNTORES_DIN, ib) && ib <= 125 ? T.proximo(T.DISJUNTORES_DIN, Math.max(ib, 10)) : T.proximo(T.DISJUNTORES_CM, ib);
  if (In == null) { avisos.push(`Corrente de projeto ${arred(ib, 0)} A acima da série de disjuntores (1600 A) — quadro fora do escopo do cálculo simplificado.`); In = 1600; }
  if (In < ib - 1e-6) avisos.push(`Disjuntor geral informado (${In} A) abaixo da corrente de projeto do quadro (${arred(ib, 1)} A).`);
  let tipo = c.geralTipo;
  if (!['din', 'caixa_moldada'].includes(tipo)) tipo = In <= 125 && c.icc <= 25 ? 'din' : 'caixa_moldada';
  if (tipo === 'din' && In > 125) tipo = 'caixa_moldada';
  const polos = c.geralPolos || (c.esquema === 'TT' ? c.nFases + 1 : (c.nFases === 1 ? 2 : c.nFases));
  let icu = c.geralIcu;
  let norma;
  if (tipo === 'din') {
    const s60898 = c.icc <= 10 && In <= 63;
    icu = icu ?? (s60898 ? T.proximo(T.ICN_60898, c.icc) : T.proximo(T.ICU_DIN_60947, c.icc));
    norma = s60898 ? 'NBR NM 60898 (Icn)' : 'NBR IEC 60947-2 (Icu)';
  } else {
    icu = icu ?? T.proximo(T.ICU_CM, c.icc);
    norma = 'NBR IEC 60947-2 (Icu)';
  }
  if (icu == null) { avisos.push(`Icc de ${c.icc} kA acima da série de disjuntores: especificar disjuntor/limitador pelo fabricante. [CONFERIR]`); icu = c.icc; }
  const ics = tipo === 'din' && norma.startsWith('NBR NM') ? T.icsDin(icu) : icu; // caixa moldada: escolher Ics = 100 % Icu
  return { In, ib, tipo, polos, icu, ics, norma, informado: c.geralInformado != null, curva: tipo === 'din' ? 'C' : null };
}

// ── Coordenação e DR ────────────────────────────────────────────────────────

function iccDoDispositivo(cx, c) {
  if (cx.icuInformado != null) return { icu: cx.icuInformado, informado: true, norma: cx.caixaMoldada ? 'NBR IEC 60947-2' : (cx.icuInformado <= 10 ? 'NBR NM 60898' : 'NBR IEC 60947-2') };
  if (cx.caixaMoldada) return { icu: T.proximo(T.ICU_CM, c.icc) ?? c.icc, informado: false, norma: 'NBR IEC 60947-2' };
  if (c.icc <= 10 && cx.disjuntor <= 63) return { icu: T.proximo(T.ICN_60898, c.icc), informado: false, norma: 'NBR NM 60898' };
  return { icu: T.proximo(T.ICU_DIN_60947, c.icc) ?? c.icc, informado: false, norma: 'NBR IEC 60947-2' };
}

function coordenar(circuitos, geral, c, avisos) {
  const tempInt = c.temperaturaMax; // pior caso: ar no topo no limite adotado
  const kDerating = Math.max(0.5, 1 - T.DERATING_DIN_POR_C * Math.max(0, tempInt - 30));
  for (const x of circuitos) {
    const ic = iccDoDispositivo(x, c);
    x.icu = ic.icu; x.icuNorma = ic.norma; x.icuEspecificado = !ic.informado;
    x.icuOk = x.icu >= c.icc - 1e-9;
    x.filiacao = !x.icuOk && geral.icu >= c.icc;
    x.notas = [];
    if (!x.icuOk) {
      x.notas.push(x.filiacao
        ? `Icu ${x.icu} kA < Icc ${c.icc} kA: só com filiação (back-up) comprovada pela tabela do fabricante com o geral (NBR 5410, 5.3.5.5.1)`
        : `Icu ${x.icu} kA < Icc ${c.icc} kA e o geral também não interrompe — trocar o disjuntor (NBR 5410, 5.3.5.5.1)`);
    }
    // Ib ≤ In ≤ Iz (NBR 5410, 5.3.4.1)
    x.inOk = x.reserva || x.ib <= x.disjuntor + 1e-9;
    if (!x.inOk) x.notas.push(`Ib ${arred(x.ib, 1)} A > In ${x.disjuntor} A`);
    if (x.secao) {
      const carregados = x.nFases === 3 ? 3 : 2;
      let iz = null;
      try {
        iz = ET.capacidade(x.secao, c.metodoSaida, carregados, c.isolacaoSaida) * ET.fatorTemperatura(c.temperaturaCabos, c.isolacaoSaida, c.metodoSaida === 'D');
      } catch { iz = null; }
      x.iz = iz;
      x.izOk = iz == null || x.disjuntor <= iz + 1e-9;
      if (!x.izOk) x.notas.push(`In ${x.disjuntor} A > Iz ${arred(iz, 1)} A do cabo ${String(x.secao).replace('.', ',')} mm² (método ${c.metodoSaida}, sem agrupamento) — 5.3.4.1`);
    } else {
      x.iz = null; x.izOk = true;
    }
    // redução de corrente do disjuntor DIN no ar quente do quadro
    x.inCorrigida = x.caixaMoldada ? x.disjuntor : x.disjuntor * kDerating;
    x.deratingOk = x.reserva || x.ib <= x.inCorrigida + 1e-9;
    if (!x.deratingOk) x.notas.push(`com o ar a ${tempInt} °C o disjuntor de ${x.disjuntor} A conduz ≈ ${arred(x.inCorrigida, 1)} A < Ib — conferir a tabela de redução do fabricante`);
    // seletividade amperimétrica com o geral (aviso)
    x.seletivo = geral.In / x.disjuntor >= T.RAZAO_SELETIVIDADE - 1e-9;
    if (!x.seletivo && !x.reserva) x.notas.push(`In geral / In circuito = ${arred(geral.In / x.disjuntor, 2)} < ${T.RAZAO_SELETIVIDADE}: seletividade só pela tabela do fabricante`);
    // DR (NBR 5410, 5.1.3.2.2) e TT
    x.drObrigatorio = x.localDr || (c.esquema === 'TT' && !x.reserva && x.tipo !== 'alimentador');
    x.drMotivo = x.localDr ? 'local de 5.1.3.2.2' : (x.drObrigatorio ? 'esquema TT (seccionamento automático por DR)' : '');
    x.drFalta = x.drObrigatorio && !x.dr && !c.drGeral;
    if (x.drFalta) x.notas.push(`DR ≤ ${x.localDr ? 30 : 300} mA exigido (${x.drMotivo}) e não previsto`);
    if (x.dr && x.drMa > 30 && x.localDr) x.notas.push(`IΔn ${x.drMa} mA > 30 mA em local de 5.1.3.2.2`);
    x.drRecomendado = !x.dr && !x.drObrigatorio && ['tug', 'tue'].includes(x.tipo);
  }
  const semSeletividade = circuitos.filter(x => !x.seletivo && !x.reserva).length;
  if (semSeletividade) avisos.push(`${semSeletividade} circuito(s) com corrente nominal próxima à do geral: seletividade só garantida pela tabela de seletividade do fabricante. [CONFERIR]`);
  const faltaDr = circuitos.filter(x => x.drFalta);
  if (faltaDr.length) avisos.push(`DR exigido e não previsto nos circuitos ${faltaDr.map(x => x.n).join(', ')} (NBR 5410, 5.1.3.2.2${c.esquema === 'TT' ? ' e esquema TT' : ''}).`);
  const icuRuim = circuitos.filter(x => !x.icuOk);
  if (icuRuim.length) avisos.push(`Capacidade de interrupção abaixo da Icc (${c.icc} kA) nos circuitos ${icuRuim.map(x => x.n).join(', ')} — ${icuRuim.every(x => x.filiacao) ? 'só com filiação do fabricante' : 'trocar os disjuntores'} (NBR 5410, 5.3.5.5.1).`);
  if (geral.icu < c.icc - 1e-9) avisos.push(`Disjuntor geral com Icu ${geral.icu} kA abaixo da Icc presumida ${c.icc} kA (NBR 5410, 5.3.5.5.1).`);
  if (geral.ics < c.icc - 1e-9) avisos.push(`Ics do geral (${arred(geral.ics, 1)} kA) abaixo da Icc — recomendável Ics ≥ Icc no disjuntor de entrada (continuidade após o curto).`);
  return { kDerating };
}

// Interruptores DR agrupados (IDR) e exclusivos
function gruposDr(circuitos, dados, c) {
  const definidos = new Map((dados.drs || []).filter(d => d && d.id).map(d => [String(d.id).trim(), d]));
  const grupos = new Map();
  for (const x of circuitos.filter(k => k.dr === 'idr')) {
    const id = x.drGrupo || `DR-${x.n}`;
    if (!grupos.has(id)) grupos.set(id, []);
    grupos.get(id).push(x);
    x.drId = id;
  }
  const fd = c.fatorDiversidade ?? 0.8;
  return [...grupos.entries()].map(([id, lista]) => {
    const def = definidos.get(id) || {};
    const conds = new Set();
    let temN = false;
    lista.forEach(x => { x.fases.forEach(f => conds.add(f)); if (x.neutro) temN = true; });
    const nCond = conds.size + (temN ? 1 : 0);
    const polos = num(def.polos) || (nCond <= 2 ? 2 : 4);
    const maiorIn = Math.max(...lista.map(x => x.disjuntor));
    const soma = lista.reduce((s, x) => s + x.ib, 0) * (lista.length > 1 ? fd : 1);
    const In = num(def.in_a) || T.proximo(T.IDR_IN, Math.max(maiorIn, soma)) || 125;
    const idn = num(def.idn_ma) || Math.min(...lista.map(x => x.drMa));
    const tipoDr = def.tipo || (lista.some(x => /inversor|eletr/i.test(x.descricao)) ? 'A' : 'AC');
    const notas = [];
    if (In < maiorIn) notas.push(`In do IDR (${In} A) menor que o maior disjuntor do grupo (${maiorIn} A) — o IDR precisa estar protegido contra sobrecarga [CONFERIR coordenação do fabricante]`);
    if (lista.length > 1 && lista.every(x => x.drObrigatorio)) notas.push('Um DR para vários circuitos: um defeito desliga todos — avaliar DR por circuito nos locais de 5.1.3.2.2');
    return { id, circuitos: lista.map(x => x.n), polos, In, idn, tipo: tipoDr, soma, maiorIn, notas, fases: [...conds].sort(), neutro: temN, fabricante: def.fabricante || null, referencia: def.referencia || null };
  });
}

// ── DPS (NBR 5410, 6.3.5.2; NBR 5419-4, Anexo C) ────────────────────────────

function dps(c) {
  if (c.dpsClasse === 'nenhum') return null;
  const classe = c.dpsClasse !== 'auto' ? c.dpsClasse : (c.spda && c.pontoEntrada ? 'I+II' : 'II');
  const uc = ucDps({ vfn: c.vfn, vff: c.vff, esquema: c.esquema });
  const comNeutro = !['TN-C'].includes(c.esquema) && !(c.esquema.startsWith('IT'));
  const fases = c.nFases;
  const nFase = fases;
  const nNeutro = comNeutro ? 1 : 0;
  const trif = fases === 3;
  const classeI = classe !== 'II';
  return {
    classe, uc, fases: nFase, neutroPe: nNeutro, quantidade: nFase + nNeutro,
    in: classeI ? null : 5, inNeutroPe: classeI ? null : (trif ? 20 : 10),
    iimp: classeI ? 12.5 : null, iimpNeutroPe: classeI ? (trif ? 50 : 25) : null,
    peMin: classeI ? 16 : 4,
    texto: classeI
      ? `Classe I${classe === 'I+II' ? '+II' : ''} (ensaio com Iimp): Iimp ≥ 12,5 kA por modo de proteção e ≥ ${trif ? 50 : 25} kA no DPS N-PE, quando não determinada pela NBR 5419 (NBR 5410, 6.3.5.2.4 d); exigido no ponto de entrada quando a edificação tem SPDA (NBR 5419-4:2026, C.1.7)`
      : `Classe II (ensaio com In): In ≥ 5 kA (8/20 µs) por modo de proteção e ≥ ${trif ? 20 : 10} kA no DPS N-PE do esquema de conexão 3 (NBR 5410, 6.3.5.2.4 d)`,
    protecao: 'Proteção contra sobrecorrente do DPS conforme o fabricante (NBR 5410, 6.3.5.2.5) [CONFERIR]',
    ligacao: `Condutores de ligação o mais curtos possível, total ≤ 0,5 m; DPS–PE ≥ ${classeI ? 16 : 4} mm² (NBR 5410, 6.3.5.2.9)`,
  };
}

// ── Automação ───────────────────────────────────────────────────────────────

const SINAIS_POR_PARTIDA = {
  direta: { DI: 2, DO: 1, AI: 0, AO: 0 }, estrela_triangulo: { DI: 2, DO: 1, AI: 0, AO: 0 },
  soft_starter: { DI: 2, DO: 1, AI: 0, AO: 0 }, inversor: { DI: 2, DO: 1, AI: 0, AO: 1 },
};
const PORTA = {
  emergencia: { rotulo: 'Botão de emergência (cogumelo, trava, NF)', cor: 'vermelho sobre fundo amarelo', sinal: null },
  liga: { rotulo: 'Botão LIGA / partida', cor: 'branco (preferencial) ou verde', sinal: 'DI' },
  desliga: { rotulo: 'Botão DESLIGA / parada', cor: 'preto (preferencial), cinza ou branco', sinal: 'DI' },
  reset: { rotulo: 'Botão RESET / rearme', cor: 'azul', sinal: 'DI' },
  seletor: { rotulo: 'Chave seletora (MAN-0-AUT)', cor: 'preto', sinal: 'DI2' },
  sinaleiro_verde: { rotulo: 'Sinaleiro verde (condição normal / em operação)', cor: 'verde', sinal: 'DO' },
  sinaleiro_amarelo: { rotulo: 'Sinaleiro amarelo (condição anormal / alarme)', cor: 'amarelo', sinal: 'DO' },
  sinaleiro_vermelho: { rotulo: 'Sinaleiro vermelho (emergência / falha)', cor: 'vermelho', sinal: 'DO' },
  sinaleiro_branco: { rotulo: 'Sinaleiro branco (quadro energizado)', cor: 'branco', sinal: null },
  potenciometro: { rotulo: 'Potenciômetro (referência)', cor: '—', sinal: 'AI' },
};

function automacao(dados, c, motores) {
  const a = dados.automacao || {};
  const porta = (a.porta || []).filter(p => p && PORTA[p.tipo]).map(p => ({ ...PORTA[p.tipo], tipo: p.tipo, funcao: p.funcao || '', quantidade: Math.max(1, Math.round(num(p.quantidade, 1))) }));
  const ativo = !!a.ativo || c.tipo === 'automacao';
  if (c.maquina && !porta.some(p => p.tipo === 'emergencia')) porta.unshift({ ...PORTA.emergencia, tipo: 'emergencia', funcao: 'Parada de emergência (NBR IEC 60204-1 / NR-12)', quantidade: 1, automatico: true });
  if (!ativo) return { ativo: false, porta, releSeguranca: c.maquina };
  const usados = { DI: 0, DO: 0, AI: 0, AO: 0 };
  const origem = [];
  for (const s of a.sinais || []) {
    if (!s || !usados.hasOwnProperty(s.tipo)) continue;
    const q = Math.max(0, Math.round(num(s.quantidade, 1)));
    usados[s.tipo] += q;
    origem.push({ tag: s.tag || '', descricao: s.descricao || '', tipo: s.tipo, quantidade: q, campo: true });
  }
  if (a.sinais_motores !== false) {
    for (const m of motores) {
      const sp = SINAIS_POR_PARTIDA[m.partida];
      Object.entries(sp).forEach(([t, q]) => { usados[t] += q; });
      origem.push({ tag: m.tag, descricao: `${m.partidaRotulo}: confirmação e falha (DI), comando (DO)${sp.AO ? ', referência de velocidade (AO)' : ''}`, tipo: 'motor', quantidade: Object.values(sp).reduce((s, v) => s + v, 0) });
    }
  }
  for (const p of porta) {
    if (p.sinal === 'DI') usados.DI += p.quantidade;
    else if (p.sinal === 'DI2') usados.DI += 2 * p.quantidade;
    else if (p.sinal === 'DO') usados.DO += p.quantidade;
    else if (p.sinal === 'AI') usados.AI += p.quantidade;
  }
  const releSeguranca = c.maquina || porta.some(p => p.tipo === 'emergencia');
  if (releSeguranca) usados.DI += 1; // estado do relé de segurança
  const reserva = fracao(a.reserva_io_pct, 0.2);
  const req = Object.fromEntries(Object.entries(usados).map(([t, q]) => [t, Math.ceil(q * (1 + reserva) - 1e-9)]));
  const cpu = { DI: num(a.cpu_di, T.CPU_IO_PADRAO.DI), DO: num(a.cpu_do, T.CPU_IO_PADRAO.DO), AI: num(a.cpu_ai, T.CPU_IO_PADRAO.AI), AO: num(a.cpu_ao, T.CPU_IO_PADRAO.AO) };
  const temClp = a.clp !== false;
  const modulos = Object.fromEntries(['DI', 'DO', 'AI', 'AO'].map(t => [t, temClp ? Math.max(0, Math.ceil((req[t] - cpu[t]) / T.CLP[t].canais - 1e-9)) : 0]));
  const disponivel = Object.fromEntries(['DI', 'DO', 'AI', 'AO'].map(t => [t, temClp ? cpu[t] + modulos[t] * T.CLP[t].canais : 0]));
  const comunicacao = Array.isArray(a.comunicacao) ? a.comunicacao : String(a.comunicacao || 'ethernet').split(/[,;]\s*/).filter(Boolean);
  const rs485 = comunicacao.some(x => /rtu|485/i.test(x)) ? 1 : 0;
  const ihm = num(a.ihm_pol);
  const switchPortas = num(a.switch_portas, 0);
  const reles = num(a.reles_interface, usados.DO);
  // consumo em 24 Vcc (mA) — típico [CONFERIR com os catálogos]
  const consumo = [];
  const add = (item, ma) => { if (ma > 0) consumo.push({ item, ma }); };
  if (temClp) {
    add('CPU do CLP', T.CLP.cpu.consumo_ma);
    ['DI', 'DO', 'AI', 'AO'].forEach(t => add(`${modulos[t]} × ${T.CLP[t].rotulo}`, modulos[t] * T.CLP[t].consumo_ma));
    add(`${rs485} × módulo RS-485`, rs485 * T.CLP.RS485.consumo_ma);
    add(`Entradas digitais em uso (${usados.DI} × 4 mA)`, usados.DI * 4);
    add(`Saídas analógicas em uso (${usados.AO} × 20 mA)`, usados.AO * 20);
  }
  add(`Relés de interface (${reles} × ${T.RELE_INTERFACE.consumo_ma} mA)`, reles * T.RELE_INTERFACE.consumo_ma);
  if (ihm) add(`IHM ${ihm}"`, T.CONSUMO_24V_MA.ihm);
  if (switchPortas) add(`Switch ${switchPortas} portas`, T.SWITCH.consumo_ma);
  if (releSeguranca) add('Relé de segurança', T.CONSUMO_24V_MA.rele_seguranca);
  const sinaleiros = porta.filter(p => /^sinaleiro/.test(p.tipo)).reduce((s, p) => s + p.quantidade, 0);
  add(`Sinaleiros LED 24 Vcc (${sinaleiros})`, sinaleiros * T.CONSUMO_24V_MA.sinaleiro);
  for (const k of a.cargas_24v || []) {
    if (!k) continue;
    add(`${num(k.quantidade, 1)} × ${k.descricao || 'carga 24 Vcc'}`, num(k.quantidade, 1) * num(k.corrente_ma, 0));
  }
  const totalMa = consumo.reduce((s, x) => s + x.ma, 0);
  const margem = fracao(a.margem_fonte_pct, 0.25);
  const iFonte = (totalMa / 1000) * (1 + margem);
  const fonteA = T.proximo(T.FONTES_24V_A, iFonte);
  const fontes = fonteA ? 1 : Math.ceil(iFonte / 40);
  const fonteNominal = fonteA || 40;
  const pSaida = 24 * totalMa / 1000;
  const iEntrada = (24 * fonteNominal * fontes) / (T.FONTE_RENDIMENTO * c.vfn * 0.95); // a plena carga da fonte
  const disjFonte = T.proximo(T.DISJUNTORES_DIN, Math.max(4, 1.25 * iEntrada));
  const ramos24 = 2 + (usados.DO > 0 || reles > 0 ? 1 : 0) + (ihm || switchPortas ? 1 : 0);
  // bornes de sinal (por sinal + comuns de distribuição)
  const comuns = (n) => (n ? Math.ceil(n / 8) : 0);
  const bornes = {
    DI: usados.DI + comuns(usados.DI), DO: usados.DO + comuns(usados.DO), AI: 3 * usados.AI, AO: 3 * usados.AO, comunicacao: 3 * (rs485 + (comunicacao.length ? 0 : 0)),
    alimentacao24: 2 * ramos24,
  };
  return {
    ativo: true, clp: temClp, cpuReferencia: a.cpu_referencia || null, usados, reserva, req, cpu, modulos, disponivel, origem, comunicacao, rs485, ihm, switchPortas, reles,
    consumo, totalMa, margem, iFonte, fonteA: fonteNominal, fontes, pSaida, iEntrada, disjFonte, ramos24, bornes, porta, releSeguranca,
    folgaIo: Object.fromEntries(['DI', 'DO', 'AI', 'AO'].map(t => [t, disponivel[t] - usados[t]])),
  };
}

// ── Componentes (com dimensões, zona do arranjo e perdas) ───────────────────
// Dimensões: do modelo do fabricante escolhido (./catalogo.js) ou típicas (./tabelas.js).

function fatorCarga(ib, In) {
  const f = In > 0 ? Math.min(1.2, (ib || 0) / In) : 0;
  return f * f;
}
function perdaQuadratica(pNominal, ib, In) {
  return pNominal * fatorCarga(ib, In);
}

// opc.termostato: com ventilação forçada, o termostato de painel entra no arranjo (ver calcular)
function componentes(c, circuitos, drs, geral, dpsInfo, motores, aut, dem, sel, opc = {}) {
  const lista = [];
  const add = (o) => { lista.push({ quantidade: 1, prof: T.DIN_PROF, altura: T.DIN_ALTURA, perda: 0, ...o }); return o; };
  // dispositivo medido pelo catálogo (ou típico); ext = { fabricante, referencia, fc (fator de carga das perdas) }
  const dev = (o, tipoCat, req, ext = {}) => {
    const tip = { l: o.largura, h: o.altura ?? T.DIN_ALTURA, p: o.prof ?? T.DIN_PROF, modulos: o.modulos };
    const m = sel.medir(o.ref, tipoCat, req, tip, ext);
    o.largura = m.l; o.altura = m.h; o.prof = m.p;
    if (o.modulos != null) o.modulos = m.modulos ?? Math.max(1, Math.round(m.l / T.MODULO_NOMINAL_MM));
    if (m.perdaW != null && ext.fc != null) o.perda = m.perdaW * ext.fc;
    o.medida = m.medida; o.tipoCatalogo = tipoCat;
    if (m.medida.origem === 'catalogo') o.descricao = `${o.descricao} — ${m.medida.fabricante} ${m.medida.referencia}`.trim();
    return add(o);
  };
  // típico sem consulta ao catálogo (proteções "conforme o fabricante" de outro dispositivo)
  const tipico = (o) => add({ ...o, medida: { origem: 'tipica', fabricante: null, referencia: '', fonte_url: '', verificado: false } });
  const fdLoss = dem.fd;
  // geral
  const extGeral = { fabricante: c.geralFabricante, referencia: c.geralReferencia, fc: fatorCarga(dem.iProjeto, geral.In) };
  if (geral.tipo === 'din') {
    dev({ ref: 'Q0', tipo: 'disjuntor_geral', zona: 'entrada', descricao: `Disjuntor geral ${geral.polos}P ${geral.In} A curva C, ${geral.norma} ${geral.icu} kA`, polos: geral.polos, In: geral.In,
      largura: T.modulosDisjuntor(geral.polos) * T.MODULO_MM, modulos: T.modulosDisjuntor(geral.polos),
      perda: Math.min(geral.polos, c.nFases) * perdaQuadratica(T.porFaixa(T.PERDA_DISJUNTOR_DIN, geral.In), dem.iProjeto, geral.In) },
    'disjuntor_din', { polos: geral.polos, corrente: geral.In, curva: 'C', icu: geral.icu }, extGeral);
  } else {
    const d = T.dimPorCorrente(T.CAIXA_MOLDADA, geral.In);
    dev({ ref: 'Q0', tipo: 'disjuntor_geral', zona: 'geral', descricao: `Disjuntor geral caixa moldada ${geral.polos}P ${geral.In} A, Icu ${geral.icu} kA / Ics 100 % (NBR IEC 60947-2)`, polos: geral.polos, In: geral.In,
      largura: geral.polos >= 4 ? d.l4 : d.l, altura: d.h, prof: d.p, perda: Math.min(geral.polos, c.nFases) * perdaQuadratica(T.porFaixa(T.PERDA_CAIXA_MOLDADA, geral.In), dem.iProjeto, geral.In) },
    'disjuntor_caixa_moldada', { polos: geral.polos, corrente: geral.In, icu: geral.icu }, extGeral);
  }
  if (c.drGeral) {
    const polos = c.nFases === 1 ? 2 : 4;
    const inDr = T.proximo(T.IDR_IN, geral.In) || geral.In;
    dev({ ref: 'DR0', tipo: 'idr', zona: 'entrada', descricao: `Interruptor DR geral ${polos}P ${inDr} A ${c.drGeralMa} mA tipo S (seletivo)`, polos, In: geral.In,
      largura: T.modulosIdr(polos) * T.MODULO_MM, modulos: T.modulosIdr(polos), perda: Math.min(polos, c.nFases) * perdaQuadratica(T.porFaixa(T.PERDA_IDR, geral.In), dem.iProjeto, geral.In) },
    'dr', { polos, corrente: inDr, sensibilidade: c.drGeralMa }, { fc: fatorCarga(dem.iProjeto, inDr) });
  }
  if (dpsInfo) {
    const mod = T.modulosDps(dpsInfo.classe);
    for (let k = 0; k < dpsInfo.quantidade; k++) {
      const np = k >= dpsInfo.fases;
      const uc = np ? dpsInfo.uc.ucNeutroPe : dpsInfo.uc.uc;
      dev({ ref: `FS${k + 1}`, tipo: 'dps', zona: 'entrada', descricao: `DPS classe ${dpsInfo.classe} ${np ? 'N-PE' : 'F-PE/F-N'} Uc ≥ ${uc} V, ${dpsInfo.iimp ? `Iimp ≥ ${String(np ? dpsInfo.iimpNeutroPe : dpsInfo.iimp).replace('.', ',')} kA` : `In ≥ ${np ? dpsInfo.inNeutroPe : dpsInfo.in} kA`}`,
        polos: 1, largura: mod * T.MODULO_MM, modulos: mod, perda: 0.1 },
      'dps', { classe: dpsInfo.classe === 'II' ? 'II' : 'I', uc, in_ka: np ? dpsInfo.inNeutroPe : dpsInfo.in, iimp: np ? dpsInfo.iimpNeutroPe : dpsInfo.iimp }, { fabricante: c.dpsFabricante });
    }
    tipico({ ref: 'FDPS', tipo: 'protecao_dps', zona: 'entrada', descricao: `Proteção do DPS (disjuntor/fusível ${c.nFases}P conforme o fabricante do DPS) [CONFERIR]`, polos: c.nFases, largura: c.nFases * T.MODULO_MM, modulos: c.nFases, perda: 0.5 });
  }
  let medicao = null;
  if (c.multimedidor) {
    const direta = geral.In <= T.MEDICAO_DIRETA_MAX_A;
    const tc = direta ? null : T.proximo(T.TCS, geral.In);
    medicao = { direta, tc, qtdTc: direta ? 0 : c.nFases };
    dev({ ref: 'P1', tipo: 'medidor', zona: 'entrada', descricao: `Multimedidor de grandezas elétricas DIN (V, I, kW, kvar, FP, kWh)${direta ? ' de ligação direta ≤ 63 A' : `, entrada 5 A com ${c.nFases} TC ${tc}/5 A classe 0,5`}`,
      largura: 4 * T.MODULO_MM, modulos: 4, perda: T.PERDA_MEDIDOR_W }, 'multimedidor', {});
    // multimedidor de painel (registro do fabricante com montagem na porta, ex. 96 × 96): vai para
    // a PORTA, em recorte — no trilho ele ocuparia ~97 mm de fileira e não seria lido com a porta fechada
    const p1 = lista[lista.length - 1];
    if (p1.medida && p1.medida.montagem === 'porta') {
      p1.zona = 'porta';
      delete p1.modulos;
      p1.descricao = p1.descricao.replace('elétricas DIN', 'elétricas de painel, na porta (recorte)');
    }
    tipico({ ref: 'FM', tipo: 'protecao_medicao', zona: 'entrada', descricao: `Fusíveis/disjuntor ${c.nFases}P 2 A para as tensões de medição`, largura: c.nFases * T.MODULO_MM, modulos: c.nFases, perda: 0.5 });
    if (!direta) {
      // TCs de janela (prática usual: o condutor de fase atravessa a janela do TC):
      //  - com barramento de barras: enfiados nas barras de fase, logo após a chegada do geral —
      //    não ocupam placa nem trilho (zona 'sobre_barramento', posição em layout.tcNasBarras);
      //  - com pente (sem barras): nos cabos de saída do Q0, ao lado dele na mesma fileira, com
      //    adaptador para trilho — aí ocupam fileira e entram na conta da placa e do invólucro.
      // O bloco de aferição fica na fileira da entrada, perto do multimedidor.
      const d = T.dimPorCorrente(T.TC_JANELA_DIM, tc);
      const iQ0 = lista.findIndex(k => k.ref === 'Q0');
      const nasBarras = opc.barramento === 'barra';
      const tipicaTc = { origem: 'tipica', fabricante: null, referencia: '', fonte_url: '', verificado: false };
      const tcs = Array.from({ length: c.nFases }, (_, i) => ({ quantidade: 1, ref: `TC${i + 1}`, tipo: 'tc', zona: nasBarras ? 'sobre_barramento' : lista[iQ0].zona,
        descricao: `Transformador de corrente ${tc}/5 A classe 0,5, 2,5 VA, de janela — ${nasBarras ? `na barra L${i + 1}, logo após a chegada do geral` : `fase L${i + 1} na saída do geral`}`,
        largura: d.l, altura: d.h, prof: d.p, perda: 0.5, medida: { ...tipicaTc } }));
      lista.splice(iQ0 + 1, 0, ...tcs);
      tipico({ ref: 'XTC', tipo: 'bloco_afericao', zona: 'entrada', descricao: 'Bloco de aferição (curto-circuitador de TC) 10 polos', largura: T.BLOCO_AFERICAO.l, altura: T.BLOCO_AFERICAO.h, prof: T.BLOCO_AFERICAO.p, perda: 0 });
    }
  }
  // DR agrupados: entram na zona de distribuição antes do 1º circuito do grupo
  const drPorPrimeiro = new Map();
  for (const g of drs) drPorPrimeiro.set(g.circuitos[0], g);
  for (const x of circuitos) {
    const g = drPorPrimeiro.get(x.n);
    if (g) {
      dev({ ref: g.id, tipo: 'idr', zona: 'distribuicao', grupo: g.id, descricao: `Interruptor DR ${g.polos}P ${g.In} A ${g.idn} mA tipo ${g.tipo} (NBR NM 61008) — circuitos ${g.circuitos.join(', ')}`,
        polos: g.polos, In: g.In, largura: T.modulosIdr(g.polos) * T.MODULO_MM, modulos: T.modulosIdr(g.polos),
        perda: Math.min(g.polos, c.nFases + 1) * perdaQuadratica(T.porFaixa(T.PERDA_IDR, g.In), g.soma * fdLoss, g.In) },
      'dr', { polos: g.polos, corrente: g.In, sensibilidade: g.idn }, { fabricante: g.fabricante, referencia: g.referencia, fc: fatorCarga(g.soma * fdLoss, g.In) });
    }
    const ib = x.ib * fdLoss;
    const ext = { fabricante: x.fabricante, referencia: x.referencia, fc: fatorCarga(ib, x.disjuntor) };
    if (x.caixaMoldada) {
      const d = T.dimPorCorrente(T.CAIXA_MOLDADA, x.disjuntor);
      dev({ ref: `Q${x.n}`, tipo: 'disjuntor_cm', zona: 'placa', circuito: x.n, descricao: `Disjuntor caixa moldada ${x.polos}P ${x.disjuntor} A, Icu ${x.icu} kA — circ. ${x.n} ${x.descricao}`,
        polos: x.polos, In: x.disjuntor, largura: d.l, altura: d.h, prof: d.p, perda: x.polos * perdaQuadratica(T.porFaixa(T.PERDA_CAIXA_MOLDADA, x.disjuntor), ib, x.disjuntor) },
      'disjuntor_caixa_moldada', { polos: x.polos, corrente: x.disjuntor, icu: x.icu }, ext);
      continue;
    }
    const ddr = x.dr === 'ddr';
    const mod = ddr ? T.modulosDdr(x.polos) : T.modulosDisjuntor(x.polos);
    dev({ ref: `Q${x.n}`, tipo: ddr ? 'ddr' : 'disjuntor', zona: 'distribuicao', grupo: x.drId || null, circuito: x.n,
      descricao: ddr
        ? `Disjuntor diferencial (DDR) ${x.polos}P${x.neutro ? '+N' : ''} ${x.disjuntor} A curva ${x.curva} ${x.drMa} mA, ${x.icu} kA — circ. ${x.n}`
        : `Disjuntor ${x.polos}P ${x.disjuntor} A curva ${x.curva}, ${x.icuNorma} ${x.icu} kA — circ. ${x.n}${x.reserva ? ' (reserva equipada)' : ''}`,
      polos: x.polos, In: x.disjuntor, largura: mod * T.MODULO_MM, modulos: mod, reserva: x.reserva,
      perda: x.polos * perdaQuadratica(T.porFaixa(T.PERDA_DISJUNTOR_DIN, x.disjuntor), ib, x.disjuntor) * (ddr ? 1.3 : 1) },
    ddr ? 'ddr' : 'disjuntor_din', ddr ? { polos: x.polos, corrente: x.disjuntor, curva: x.curva, sensibilidade: x.drMa, icu: x.icu } : { polos: x.polos, corrente: x.disjuntor, curva: x.curva, icu: x.icu }, ext);
  }
  // partidas de motores (blocos com os dispositivos medidos um a um)
  for (const m of motores) {
    const d = m.partidaInfo.dispositivos;
    const extM = (ref) => ({ fabricante: m.fabricante, referencia: (m.referencias || {})[ref] || null });
    const filhos = [];
    const mf = (ref, tipoCat, req, tip, perda) => {
      const r = sel.medir(`${m.tag}/${ref}`, tipoCat, req, tip, extM(ref));
      const f = { ref, l: r.l, h: r.h, p: r.p, perda, medida: r.medida, tipoCatalogo: tipoCat };
      if (r.perdaW != null && tip.perdaNominal) f.perda = r.perdaW * Math.min(1, perda / tip.perdaNominal);
      return f;
    };
    const q = d.find(x => x.ref === 'Q1');
    if (q.tipo === 'disjuntor_motor') {
      const dim = T.dimPorCorrente(T.DISJUNTOR_MOTOR_DIM, q.faixa[1]);
      const pn = T.porFaixa(T.PERDA_DISJUNTOR_MOTOR, q.faixa[1]);
      filhos.push(mf('Q1', 'disjuntor_motor', { corrente: m.in, faixa: q.faixa }, { ...dim, perdaNominal: pn }, perdaQuadratica(pn, m.in, q.faixa[1])));
    } else if (q.tipo === 'caixa_moldada') {
      const dim = T.dimPorCorrente(T.CAIXA_MOLDADA, q.nominal_a);
      const pn = 3 * T.porFaixa(T.PERDA_CAIXA_MOLDADA, q.nominal_a);
      filhos.push(mf('Q1', 'disjuntor_caixa_moldada', { polos: 3, corrente: q.nominal_a, icu: c.icc }, { ...dim, perdaNominal: pn }, perdaQuadratica(pn, m.in, q.nominal_a)));
    } else {
      filhos.push({ ref: 'Q1', l: 3 * T.MODULO_MM * 1.5, h: 90, p: 90, perda: 3, medida: { origem: 'tipica', fabricante: null, referencia: '', fonte_url: '', verificado: false } });
    }
    const bobina = aut.ativo ? '24 Vcc' : `${c.vfn} Vca`;
    const kts = d.filter(x => x.tipo === 'contator').map(k => {
      const dim = T.dimPorCorrente(T.CONTATOR_DIM, k.nominal_a);
      const pn = T.porFaixa(T.PERDA_CONTATOR, k.nominal_a);
      return mf(k.ref, 'contator', { ac3: k.nominal_a, bobina }, { ...dim, perdaNominal: pn }, pn * Math.min(1, ((k.corrente_a || 0) / k.nominal_a) ** 2 * 0.6 + 0.4));
    });
    const f4 = d.find(x => x.tipo === 'rele_sobrecarga');
    const temp = d.find(x => x.tipo === 'temporizador');
    const eletronico = d.find(x => x.tipo === 'soft_starter' || x.tipo === 'inversor');
    const gap = 8;
    let f4f = null, ktf = null, ef = null;
    if (f4) f4f = mf('F4', 'rele_sobrecarga', { corrente: f4.ajuste_a, faixa: f4.faixa }, { l: kts[0] ? kts[0].l : 45, h: T.RELE_SOBRECARGA_ALTURA - 4, p: 90 }, T.porFaixa(T.PERDA_RELE, f4.ajuste_a));
    if (temp) ktf = mf('KT1', 'rele_tempo', {}, { l: T.MODULO_MM, h: 90, p: 70 }, 1);
    if (eletronico) {
      const soft = eletronico.tipo === 'soft_starter';
      const dim = T.dimPorCorrente(soft ? T.SOFT_DIM : T.INVERSOR_DIM, m.in);
      const pr = soft ? T.PERDA_SOFT(m.in) : T.PERDA_INVERSOR_PCT * m.pKw * 1000;
      ef = mf('T1', eletronico.tipo, { corrente: arred(m.in, 1), kw: arred(m.pKw, 2) }, { ...dim, perdaNominal: pr }, pr);
    }
    const qf = filhos[0];
    const larguraLinha2 = kts.reduce((s, k) => s + k.l + gap, 0) + (ktf ? ktf.l + gap : 0) + (ef ? ef.l + gap : 0) - gap;
    const largura = Math.max(qf.l, larguraLinha2);
    const alturaLinha2 = Math.max(...kts.map(k => k.h + (f4f ? f4f.h + 4 : 0)), ef ? ef.h : 0, ktf ? ktf.h : 0);
    const altura = qf.h + gap + alturaLinha2;
    // posições relativas (para o desenho e o 3D)
    qf.x = (largura - qf.l) / 2; qf.y = 0;
    let xx = 0;
    for (const k of kts) { filhos.push({ ...k, x: xx, y: qf.h + gap }); if (f4f && k.ref === 'K1') filhos.push({ ...f4f, l: Math.min(f4f.l, k.l + 10), x: xx, y: qf.h + gap + k.h + 2 }); xx += k.l + gap; }
    if (ktf) { filhos.push({ ...ktf, x: xx, y: qf.h + gap }); xx += ktf.l + gap; }
    if (ef) filhos.push({ ...ef, x: xx, y: qf.h + gap });
    const perda = filhos.reduce((s, f) => s + (f.perda || 0), 0);
    const nCat = filhos.filter(f => f.medida && f.medida.origem === 'catalogo').length;
    add({ ref: m.tag, tipo: 'partida', zona: 'partidas', motor: m.tag, descricao: `Partida ${m.partidaRotulo.toLowerCase()} — ${m.tag} ${m.descricao} (${arred(m.pKw, 2)} kW, In ${arred(m.in, 1)} A)`,
      largura, altura, prof: Math.max(...filhos.map(f => f.p || T.DIN_PROF)), filhos, perda,
      medida: { origem: nCat === filhos.length ? 'catalogo' : nCat ? 'parcial' : 'tipica', fabricante: m.fabricante || null, referencia: '', fonte_url: '', verificado: filhos.every(f => f.medida && f.medida.verificado) } });
  }
  // comando e automação
  if (aut.ativo || motores.length || aut.porta.length) {
    const fonteA = aut.ativo ? aut.fonteA : 2.5;
    const fontes = aut.ativo ? aut.fontes : 1;
    const fDim = T.FONTE_DIM[fonteA];
    const disjC = aut.ativo ? aut.disjFonte : 6;
    dev({ ref: 'QC1', tipo: 'disjuntor_comando', zona: 'comando', descricao: `Disjuntor 2P ${disjC} A curva C — alimentação da fonte 24 Vcc / comando`, polos: 2, largura: 2 * T.MODULO_MM, modulos: 2, perda: 1 },
      'disjuntor_din', { polos: 2, corrente: disjC, curva: 'C', icu: c.icc }, {});
    for (let k = 0; k < fontes; k++) {
      const pOut = aut.ativo ? aut.pSaida / fontes : 10;
      dev({ ref: `G${k + 1}`, tipo: 'fonte', zona: 'comando', descricao: `Fonte chaveada 24 Vcc ${fonteA} A (${fonteA * 24} W) para trilho DIN`, largura: fDim.l, altura: fDim.h, prof: 115, perda: pOut * (1 / T.FONTE_RENDIMENTO - 1) },
        'fonte_24v', { saida: fonteA }, {});
    }
    const ramos = aut.ativo ? aut.ramos24 : 2;
    tipico({ ref: 'F24', tipo: 'protecao_24v', zona: 'comando', descricao: `Proteção dos ramos 24 Vcc: ${ramos} disjuntores 1P CC 2–6 A (ou módulo eletrônico de ${ramos} canais)`, largura: ramos * T.MODULO_MM, modulos: ramos, perda: ramos * 0.5 });
    if (aut.releSeguranca) dev({ ref: 'KS1', tipo: 'rele_seguranca', zona: 'comando', descricao: 'Relé de segurança para parada de emergência (monitorado, 2 canais, rearme manual) — categoria pela apreciação de risco (NBR ISO 13849-1 / NR-12) [CONFERIR]', largura: 22.5, altura: 100, prof: 115, perda: 2.5 }, 'rele_seguranca', {});
  }
  if (aut.ativo && aut.clp) {
    dev({ ref: 'A1', tipo: 'clp', zona: 'clp', descricao: `${T.CLP.cpu.rotulo} com ${aut.cpu.DI} DI / ${aut.cpu.DO} DO / ${aut.cpu.AI} AI${aut.cpu.AO ? ` / ${aut.cpu.AO} AO` : ''} integradas, porta Ethernet`, largura: T.CLP.cpu.l, altura: T.CLP.cpu.h, prof: T.CLP.cpu.p, perda: T.CLP.cpu.perda_w },
      'clp_cpu', { io: `${aut.cpu.DI} DI ${aut.cpu.DO} DO ${aut.cpu.AI} AI`, ...aut.cpu }, { referencia: aut.cpuReferencia });
    let k = 2;
    for (const t of ['DI', 'DO', 'AI', 'AO']) {
      for (let j = 0; j < aut.modulos[t]; j++) dev({ ref: `A${k++}`, tipo: `modulo_${t}`, zona: 'clp', descricao: T.CLP[t].rotulo, largura: T.CLP[t].l, altura: T.CLP[t].h, prof: T.CLP[t].p, perda: T.CLP[t].perda_w }, 'clp_modulo', { ponto: t, canais: T.CLP[t].canais }, {});
    }
    for (let j = 0; j < aut.rs485; j++) dev({ ref: `A${k++}`, tipo: 'modulo_rs485', zona: 'clp', descricao: T.CLP.RS485.rotulo, largura: T.CLP.RS485.l, altura: T.CLP.RS485.h, prof: T.CLP.RS485.p, perda: T.CLP.RS485.perda_w }, 'clp_modulo', { ponto: 'RS485', canais: 1 }, {});
    if (aut.switchPortas) dev({ ref: 'A90', tipo: 'switch', zona: 'clp', descricao: `Switch Ethernet industrial ${aut.switchPortas} portas, trilho DIN`, largura: T.SWITCH.l, altura: T.SWITCH.h, prof: T.SWITCH.p, perda: T.SWITCH.perda_w }, 'switch', { portas: aut.switchPortas }, {});
  }
  if (aut.ativo && aut.reles) {
    for (let j = 0; j < aut.reles; j++) dev({ ref: `KA${j + 1}`, tipo: 'rele_interface', zona: 'reles', descricao: 'Relé de interface 24 Vcc 1 contato reversível 6 A, base "slim" com LED e diodo', largura: T.RELE_INTERFACE.l, altura: T.RELE_INTERFACE.h, prof: T.RELE_INTERFACE.p, perda: T.RELE_INTERFACE.perda_w }, 'rele_interface', {}, {});
  }
  // termostato do ventilador no alto do quadro (fileira da entrada), onde o ar é mais quente e
  // é a temperatura que o cálculo limita (ar no topo, IEC TR 60890)
  if (opc.termostato) {
    dev({ ref: 'BT1', tipo: 'termostato', zona: 'entrada', descricao: 'Termostato de painel (NA) 0–60 °C para trilho DIN — liga o ventilador', largura: T.TERMOSTATO.l, altura: T.TERMOSTATO.h, prof: T.TERMOSTATO.p, modulos: 1, perda: 0 },
      'termostato', { funcao: 'ventilacao' }, {});
  }
  return { lista, medicao };
}

// ── Bornes ──────────────────────────────────────────────────────────────────

function bornes(c, circuitos, motores, aut, sel) {
  const grupos = [];
  const medidas = new Map(); // seção → medida (catálogo ou típica)
  const tipica = (s) => T.BORNE_LARGURA[s] || T.BORNE_LARGURA[ET.SECOES.find(x => T.BORNE_LARGURA[x] && x >= s) || 95] || 25;
  const medir = (s, grupo) => {
    if (!medidas.has(s)) medidas.set(s, sel.medir(`${grupo} ${String(s).replace('.', ',')} mm²`, 'borne', { secao: s }, { l: tipica(s), h: T.BORNE_ALTURA, p: 50 }, {}));
    return medidas.get(s);
  };
  const largura = (s, grupo) => medir(s, grupo).l;
  const forca = [];
  if (c.bornesSaida) {
    for (const x of circuitos.filter(k => !k.caixaMoldada)) {
      const s = Math.max(2.5, x.fio);
      const n = x.nFases + (x.neutro ? 1 : 0);
      forca.push({ circuito: x.n, secao: s, quantidade: n, pe: 1, largura: largura(s, 'X1') });
    }
  }
  for (const m of motores) {
    const s = Math.max(2.5, m.fio);
    const n = m.partida === 'estrela_triangulo' ? 6 : 3;
    forca.push({ circuito: m.tag, secao: s, quantidade: n, pe: 1, largura: largura(s, 'X1') });
  }
  if (forca.length) grupos.push({ id: 'X1', funcao: 'Força — saídas dos circuitos e motores (fase/neutro) + PE verde-amarelo', itens: forca });
  if (aut.ativo) {
    const b = aut.bornes;
    const sinais = [
      { circuito: 'Alimentação 24 Vcc (+/0 V por ramo)', secao: 2.5, quantidade: b.alimentacao24 },
      { circuito: 'Entradas digitais (sinal + comuns)', secao: 1.5, quantidade: b.DI },
      { circuito: 'Saídas digitais (sinal + comuns)', secao: 1.5, quantidade: b.DO },
      { circuito: 'Entradas analógicas (+, −, blindagem)', secao: 1.5, quantidade: b.AI },
      { circuito: 'Saídas analógicas (+, −, blindagem)', secao: 1.5, quantidade: b.AO },
      { circuito: 'Comunicação RS-485 (A, B, GND)', secao: 1.5, quantidade: b.comunicacao },
    ].filter(x => x.quantidade > 0).map(x => ({ ...x, largura: largura(x.secao, 'X2') }));
    if (sinais.length) grupos.push({ id: 'X2', funcao: 'Comando e sinais 24 Vcc', itens: sinais });
  } else if (motores.length) {
    grupos.push({ id: 'X2', funcao: 'Comando (botoeiras, sinalização remota)', itens: [{ circuito: 'Comando por motor (liga, desliga, sinalização)', secao: 1.5, quantidade: 4 * motores.length, largura: largura(1.5, 'X2') }] });
  }
  // reserva de bornes
  for (const g of grupos) {
    const n = g.itens.reduce((s, i) => s + i.quantidade + (i.pe || 0), 0);
    g.total = n;
    g.reserva = Math.ceil(n * c.reservaPct);
    const larguraMedia = g.itens.reduce((s, i) => s + i.largura * (i.quantidade + (i.pe || 0)), 0) / Math.max(1, n);
    g.comprimento = g.itens.reduce((s, i) => s + i.largura * (i.quantidade + (i.pe || 0)), 0) + g.reserva * larguraMedia + 2 * T.BORNE_POSTE_MM + 2;
    g.altura = Math.max(...g.itens.map(i => medir(i.secao, g.id).h));
    g.prof = Math.max(...g.itens.map(i => medir(i.secao, g.id).p || 50));
    g.medidas = [...new Set(g.itens.map(i => i.secao))].map(s => ({ secao: s, largura_mm: medir(s, g.id).l, ...medir(s, g.id).medida }));
    g.medida = g.medidas.every(x => x.origem === 'catalogo') ? g.medidas[0] : { ...g.medidas[0], origem: g.medidas.some(x => x.origem === 'catalogo') ? 'parcial' : 'tipica' };
  }
  return grupos;
}

// ── Fiação interna e canaletas ──────────────────────────────────────────────

function fiacao(c, circuitos, motores, aut, comps, geral) {
  // condutores por "linha" de origem: potência (lado esquerdo) e comando (lado direito)
  const area = (s) => Math.PI * ((T.DIAMETRO_FIO[s] || T.DIAMETRO_FIO[ET.SECOES.find(x => T.DIAMETRO_FIO[x] && x >= s) || 120] || 19.3) ** 2) / 4;
  const pot = []; // { secao, n, origem }
  const cmd = [];
  // cabos de entrada do geral (fases + N + PE) sobem pela canaleta de potência
  if (geral) pot.push({ secao: fioPorCorrente(geral.In), n: c.nFases + (c.esquema === 'TN-C' ? 0 : 1) + 1, origem: 'entrada', circuito: 'Entrada (geral)', ib: 0, cond: 0 });
  for (const x of circuitos) {
    const n = x.nFases + (x.neutro ? 1 : 0) + 1; // + PE
    pot.push({ secao: x.fio, n, origem: x.caixaMoldada ? 'placa' : 'distribuicao', circuito: x.n, ib: x.ib, cond: x.nFases + (x.neutro ? 1 : 0) });
  }
  for (const m of motores) {
    const n = (m.partida === 'estrela_triangulo' ? 6 : 3) + 1;
    pot.push({ secao: m.fio, n, origem: 'partidas', circuito: m.tag, ib: m.in, cond: m.partida === 'estrela_triangulo' ? 6 : 3 });
    cmd.push({ secao: aut.ativo ? T.FIO_COMANDO : T.FIO_COMANDO_CA, n: 6, origem: 'partidas', circuito: `${m.tag} (bobina e contatos auxiliares)` });
  }
  if (aut.ativo) {
    const u = aut.usados;
    cmd.push({ secao: T.FIO_COMANDO, n: u.DI + u.DO + 2 * aut.reles, origem: 'clp', circuito: 'E/S digitais e relés' });
    cmd.push({ secao: 0.75, n: 2 * (u.AI + u.AO), origem: 'clp', circuito: 'E/S analógicas (par blindado)' });
    cmd.push({ secao: 1.5, n: 2 * aut.ramos24 + 4, origem: 'comando', circuito: 'Distribuição 24 Vcc' });
  }
  const somaArea = (l) => l.reduce((s, k) => s + area(k.secao) * k.n, 0);
  const porZona = {};
  for (const k of [...pot, ...cmd]) { porZona[k.origem] = (porZona[k.origem] || 0) + area(k.secao) * k.n; }
  const areaPot = somaArea(pot);
  const areaCmd = somaArea(cmd);
  const escolher = (areaMm2) => {
    const util = areaMm2 / T.OCUPACAO_CANALETA;
    const d = T.CANALETAS.find(([l, h]) => l * h >= util) || T.CANALETAS[T.CANALETAS.length - 1];
    return { largura: d[0], altura: d[1], areaCabos: areaMm2, ocupacao: areaMm2 / (d[0] * d[1]) };
  };
  // canaletas verticais: potência à esquerda, comando à direita (separação potência × comando)
  const vertical = {
    esquerda: escolher(aut.ativo || motores.length ? areaPot : areaPot / 2),
    direita: escolher(aut.ativo || motores.length ? Math.max(areaCmd, 1) : areaPot / 2),
  };
  // horizontais: uma por fileira — dimensionadas pela fileira mais carregada de cada zona
  const condutoresMetros = {};
  [...pot, ...cmd].forEach(k => { condutoresMetros[k.secao] = (condutoresMetros[k.secao] || 0) + k.n * c.fiacaoM; });
  // perdas na fiação interna (I²R), 70 °C
  const rho70 = T.RHO_20 * (1 + T.ALFA_COBRE * 50);
  const perda = pot.reduce((s, k) => s + (k.cond || 0) * ((k.ib || 0) ** 2) * rho70 * c.fiacaoM / k.secao, 0);
  return { pot, cmd, areaPot, areaCmd, porZona, vertical, escolher, condutoresMetros, perda, area };
}

// ── Barramentos ─────────────────────────────────────────────────────────────

function kAdiabatico(thetaI, thetaF = T.THETA_FINAL_BARRA) {
  return T.K_ADIABATICO_COBRE * Math.sqrt(Math.log((T.BETA_COBRE + thetaF) / (T.BETA_COBRE + thetaI)));
}

function k2Temperatura(thetaBarra, thetaAr) {
  const dt = thetaBarra - thetaAr;
  if (dt <= 0) return 0;
  return (dt / 30) ** T.EXPOENTE_K2;
}

function escolherBarra(corrente, k2, pintada) {
  const col = pintada ? 'pintada' : 'nua';
  const ordenadas = [...T.BARRAS_DIN43671].sort((a, b) => a.l * a.e - b.l * b.e || a[col] - b[col]);
  return ordenadas.find(b => b[col] * k2 >= corrente - 1e-9) || null;
}

// Automático: pente até 125 A em quadro só de disjuntores modulares; barras acima disso, com
// disjuntores de caixa moldada ou com partidas de motores (derivações para as partidas)
function barramento(c, geral, circuitos, dem, motores = []) {
  const tipo = c.barramento !== 'auto' ? c.barramento : (geral.In <= 125 && circuitos.every(x => !x.caixaMoldada) && !motores.length ? 'pente' : 'barra');
  const thetaAr = c.temperaturaMax; // ar em volta da barra no topo do quadro
  const k2 = k2Temperatura(c.temperaturaBarra, thetaAr);
  const In = geral.In;
  const kCurto = kAdiabatico(c.temperaturaBarra);
  const sCurto = (c.icc * 1000 * Math.sqrt(c.tempoIcw)) / kCurto;
  const icw = T.proximo(T.ICW_KA, c.icc) || c.icc;
  const r = { tipo, k2, thetaAr, kCurto, sCurtoMin: sCurto, icw, In };
  if (tipo === 'pente') {
    const pente = T.PENTES.find(p => p.a >= In - 1e-9) || T.PENTES[T.PENTES.length - 1];
    r.pente = pente;
    r.penteOk = pente.a >= In - 1e-9;
    // pente: a verificação ao curto é do fabricante (ensaio com o disjuntor a montante)
    r.curtoOk = null;
    r.fase = null;
    r.secaoFase = pente.s;
  } else {
    let barra = escolherBarra(In, k2, c.barraPintada);
    // seção ≥ curto térmico
    if (barra && barra.l * barra.e < sCurto) barra = [...T.BARRAS_DIN43671].sort((a, b) => a.l * a.e - b.l * b.e).find(b => b.l * b.e >= sCurto && b[c.barraPintada ? 'pintada' : 'nua'] * k2 >= In) || barra;
    r.fase = barra;
    r.secaoFase = barra ? barra.l * barra.e : null;
    r.capacidade = barra ? barra[c.barraPintada ? 'pintada' : 'nua'] * k2 : null;
    r.correnteOk = !!barra && r.capacidade >= In - 1e-9;
    r.curtoOk = !!barra && r.secaoFase >= sCurto - 1e-9;
    // esforço eletrodinâmico (estimativa, IEC 60865-1 simplificado)
    if (barra) {
      const F = 0.2 * (SQ3 / 2) * c.ipk ** 2 * (c.apoios / c.entreFases);
      const Z = barra.l * barra.e ** 2 / 6; // barras de face: força perpendicular à face larga
      const sigma = T.BETA_VIGA * F * c.apoios / (8 * Z);
      const adm = T.Q_RETANGULAR * T.RP02_COBRE;
      const lMax = Math.sqrt((8 * Z * adm * c.entreFases) / (T.BETA_VIGA * 0.2 * (SQ3 / 2) * c.ipk ** 2));
      r.dinamico = { F, Z, sigma, adm, ok: sigma <= adm, forcaApoio: T.ALFA_APOIO * F, lMax };
    }
  }
  // neutro e PE (NBR 5410, Tabela 58; NBR IEC 61439-1 tem tabela equivalente para o PE do conjunto)
  const sF = r.secaoFase || 10;
  r.secaoNeutro = c.neutroReduzido && sF > 25 ? sF / 2 : sF;
  // Tabela 58 da NBR 5410 aplicada à barra: S ≤ 16 → S; 16 < S ≤ 35 → 16; S > 35 → S/2
  r.secaoPeMin = sF <= 16 ? sF : sF <= 35 ? 16 : sF / 2;
  // PE ao curto fase-massa (adiabático, t = 0,2 s; θi 30 °C, θf 200 °C) [CONFERIR tempo de atuação]
  r.secaoPeCurto = (c.icc * 1000 * Math.sqrt(0.2)) / kAdiabatico(30);
  const sPe = Math.max(r.secaoPeMin, r.secaoPeCurto);
  r.pe = [...T.BARRAS_DIN43671].sort((a, b) => a.l * a.e - b.l * b.e).find(b => b.l * b.e >= sPe - 1e-9) || T.BARRAS_DIN43671[0];
  r.neutro = tipo === 'barra' ? ([...T.BARRAS_DIN43671].sort((a, b) => a.l * a.e - b.l * b.e).find(b => b.l * b.e >= r.secaoNeutro - 1e-9) || r.fase) : null;
  r.nBarras = c.nFases + (c.esquema === 'TN-C' ? 0 : 1); // fases + N (PE à parte)
  return r;
}

function completarBarramento(r, c, dem, layout) {
  // comprimento: barras horizontais na largura útil da placa + 0,3 m de derivações por barra
  const L = (layout.placa.largura - 2 * T.MARGEM_UTIL) / 1000;
  const rho65 = T.RHO_20 * (1 + T.ALFA_COBRE * (c.temperaturaBarra - 20));
  if (r.tipo === 'barra' && r.fase) {
    r.comprimentoFase = L + 0.3;
    r.apoiosQtd = Math.ceil((L * 1000) / c.apoios) + 1;
    r.isoladores = r.apoiosQtd * (r.nBarras + 1);
    r.massaKg = (c.nFases * r.secaoFase + (r.neutro ? r.neutro.l * r.neutro.e : 0) + r.pe.l * r.pe.e) * r.comprimentoFase * T.DENSIDADE_COBRE / 1000;
    r.perda = c.nFases * (dem.iProjeto ** 2) * rho65 * r.comprimentoFase / r.secaoFase;
  } else {
    const fileiras = layout.fileiras.filter(f => f.zonas.includes('distribuicao') || f.zonas.includes('entrada')).length;
    r.fileirasPente = layout.fileiras.filter(f => f.zonas.includes('distribuicao')).length;
    r.comprimentoFase = L * Math.max(1, fileiras);
    r.perda = c.nFases * (dem.iProjeto ** 2) * rho65 * (L / 2) * Math.max(1, r.fileirasPente) / (r.secaoFase * Math.max(1, r.fileirasPente));
    r.massaKg = null;
  }
  return r;
}

// ── Elevação de temperatura (IEC TR 60890, simplificado) ────────────────────

function superficieEfetiva(dim, posicao, montagem) {
  const H = dim.altura / 1000, W = dim.largura / 1000, D = dim.profundidade / 1000;
  const b = T.FATOR_SUPERFICIE;
  if (montagem === 'embutir') return { ae: b.ladoExposto * W * H, regra: 'embutido: só a frente troca calor com o ambiente (0,9·W·H) [CONFERIR]' };
  if (posicao === 'livre') return { ae: b.tetoExposto * W * D + 2 * b.ladoExposto * W * H + 2 * b.ladoExposto * D * H, regra: 'livre por todos os lados: teto 1,4·W·D + frente/fundo 0,9·W·H + laterais 0,9·D·H' };
  if (posicao === 'fileira') return { ae: b.tetoExposto * W * D + b.ladoExposto * W * H + b.ladoCoberto * W * H + 2 * b.ladoCoberto * D * H, regra: 'encostado e em fileira: teto 1,4·W·D + frente 0,9·W·H + fundo 0,5·W·H + laterais cobertas 0,5·D·H' };
  return { ae: b.tetoExposto * W * D + b.ladoExposto * W * H + b.ladoCoberto * W * H + 2 * b.ladoExposto * D * H, regra: 'encostado na parede: teto 1,4·W·D + frente 0,9·W·H + fundo 0,5·W·H + laterais 0,9·D·H' };
}

function termica(c, perdas, dim) {
  const { ae, regra } = superficieEfetiva(dim, c.posicao, c.montagem);
  const k = T.COEF_TRANSMISSAO[c.material];
  const P = perdas.total;
  const dtMedio = P / (k * ae);
  const dtTopo = T.FATOR_TOPO * dtMedio;
  const tTopo = c.temperatura + dtTopo;
  const ok = tTopo <= c.temperaturaMax + 1e-9;
  const r = { ae, regra, k, P, dtMedio, dtTopo, tMedia: c.temperatura + dtMedio, tTopo, ok, metodo: dim.corrente <= 630 ? '10.10.4.2' : (dim.corrente <= 1600 ? '10.10.4.3' : 'ensaio') };
  // capacidade de dissipação natural no limite (ΔT médio admissível)
  const dtAdm = (c.temperaturaMax - c.temperatura) / T.FATOR_TOPO;
  r.dtAdmMedio = dtAdm;
  r.pAdmissivel = dtAdm > 0 ? k * ae * dtAdm : 0;
  if (!ok) {
    r.aeNecessaria = dtAdm > 0 ? P / (k * dtAdm) : Infinity;
    const f = T.porFaixa(T.FATOR_F_ALTITUDE, c.altitude);
    const dtV = c.temperaturaMax - c.temperatura;
    // calor a retirar além do que as paredes dissipam no limite do topo (critério do cálculo natural)
    const pExc = Math.max(0, P - r.pAdmissivel);
    r.ventilacao = dtV > 0 ? { f, dt: dtV, pExcedente: pExc, vazao: f * pExc / dtV } : null;
    if (r.ventilacao) {
      r.ventilacao.ventilador = T.VENTILADORES_M3H.find(v => v * T.EFICIENCIA_FILTRO >= r.ventilacao.vazao) || null;
      r.ventilacao.quantidade = r.ventilacao.ventilador ? 1 : Math.ceil(r.ventilacao.vazao / (T.VENTILADORES_M3H[T.VENTILADORES_M3H.length - 1] * T.EFICIENCIA_FILTRO));
      if (!r.ventilacao.ventilador) r.ventilacao.ventilador = T.VENTILADORES_M3H[T.VENTILADORES_M3H.length - 1];
    }
  }
  return r;
}

// ── Grau de proteção e forma ────────────────────────────────────────────────

const IP_NUM = (ip) => { const m = String(ip || '').match(/IP(\d|X)(\d|X)/i); return m ? [m[1] === 'X' ? 0 : Number(m[1]), m[2] === 'X' ? 0 : Number(m[2])] : [0, 0]; };

function protecaoInvolucro(c, circuitos, motores, geral) {
  const rec = c.localInfo;
  const ip = c.ip || rec.ip;
  const ik = c.ik || rec.ik;
  const [d1, d2] = IP_NUM(ip);
  const [r1, r2] = IP_NUM(rec.ip);
  const forma = c.forma || (c.tipo === 'ccm' ? '3b' : (circuitos.some(x => x.caixaMoldada) || geral.In > 250 ? '2b' : '1'));
  return {
    ip, ik, recomendado: rec, ipOk: d1 >= r1 && d2 >= r2, forma, formaTexto: T.FORMAS[forma] || forma,
    notas: [
      `IP mínimo do conjunto instalado IP2X (proteção contra contato direto com o dedo) e IPXXB nas partes acessíveis com a porta aberta para operação por pessoas comuns — NBR IEC 61439-1, 8.2 [CONFERIR]`,
      `Distâncias mínimas em conjuntos não ensaiados: 10 mm entre partes vivas nuas de polaridades distintas e 20 mm até massas/invólucro (100 mm com aberturas de 12–50 mm) — NBR 5410, 6.5.4.2`,
    ],
  };
}

// ── Verificações de projeto da NBR IEC 61439-1 (seção 10, Anexo D) ──────────

function verificacoesProjeto(calc) {
  const { c, barr, term, geral, inv } = calc;
  const isento = c.icc <= 10;
  return [
    { n: 1, item: 'Resistência de materiais e partes (corrosão, isolantes ao calor e fogo, UV, içamento, impacto IK, marcação)', ref: '10.2', opcoes: 'Ensaio', como: `Certificado do fabricante do invólucro (IK ${inv.ik}, pintura, materiais) e marcação conforme 6.1`, situacao: 'pelo fabricante do invólucro' },
    { n: 2, item: 'Grau de proteção do invólucro (IP)', ref: '10.3', opcoes: 'Ensaio; avaliação', como: `${inv.ip} declarado pelo fabricante; manter o IP após furações (prensa-cabos, ventilação, IHM)${term.ventilacao ? ' — ventilação forçada com filtro reduz o IP: confirmar o IP do conjunto ventilador + filtro' : ''}`, situacao: inv.ipOk ? 'atende' : 'IP abaixo do recomendado' },
    { n: 3, item: 'Distâncias de isolamento (no ar)', ref: '10.4', opcoes: 'Ensaio (medição)', como: `≥ ${T.porFaixa(T.DISTANCIA_ISOLAMENTO, c.uimpKv)} mm para Uimp ${c.uimpKv} kV (Tabela 1) e ≥ 10/20 mm nas partes nuas montadas pelo fabricante do quadro (NBR 5410, 6.5.4.2)`, situacao: 'medir na fabricação' },
    { n: 4, item: 'Distâncias de escoamento', ref: '10.4', opcoes: 'Ensaio (medição)', como: `≥ ${T.porFaixa(T.DISTANCIA_ESCOAMENTO, c.ui)} mm para Ui ${c.ui} V, grau de poluição 3, grupo IIIa (Tabela 2) [CONFERIR]`, situacao: 'medir na fabricação' },
    { n: 5, item: 'Proteção contra choque elétrico e integridade do circuito de proteção (continuidade das massas; suportabilidade do PE ao curto)', ref: '10.5', opcoes: 'Continuidade: ensaio; PE ao curto: ensaio ou comparação', como: `Continuidade massa–barra PE ≤ 0,1 Ω (10.5.2) [CONFERIR]; barra PE ${barr.pe.l}×${barr.pe.e} mm (${barr.pe.l * barr.pe.e} mm² ≥ ${arred(Math.max(barr.secaoPeMin, barr.secaoPeCurto), 1)} mm²)`, situacao: 'atende por cálculo; ensaio de rotina' },
    { n: 6, item: 'Incorporação de dispositivos de manobra e componentes', ref: '10.6', opcoes: 'Avaliação', como: 'Dispositivos conforme suas normas (NBR NM 60898, NBR IEC 60947), montados segundo o fabricante (distâncias, posição, aperto)', situacao: 'avaliação no projeto (lista de materiais)' },
    { n: 7, item: 'Circuitos elétricos internos e conexões', ref: '10.7', opcoes: 'Avaliação', como: 'Seções da fiação interna pela corrente (Anexo H [CONFERIR]), barramentos dimensionados, identificação de N (azul-claro) e PE (verde-amarelo) — NBR 5410, 6.1.5.3', situacao: 'avaliação no projeto' },
    { n: 8, item: 'Terminais para condutores externos', ref: '10.8', opcoes: 'Avaliação', como: 'Bornes/terminais compatíveis com as seções dos cabos de campo (lista de bornes)', situacao: 'avaliação no projeto' },
    { n: 9, item: 'Propriedades dielétricas (frequência industrial; tensão suportável de impulso)', ref: '10.9', opcoes: 'Frequência industrial: ensaio; impulso: ensaio ou avaliação', como: `Ensaio a ${T.porFaixa(T.TENSAO_ENSAIO, c.ui)} V eficaz (Ui ${c.ui} V, Tabela 8 [CONFERIR]); impulso Uimp ${c.uimpKv} kV por avaliação das distâncias`, situacao: 'ensaio' },
    { n: 10, item: 'Limites de elevação de temperatura', ref: '10.10', opcoes: 'Ensaio; comparação; cálculo (10.10.4)', como: `Cálculo: ${term.metodo === '10.10.4.2' ? '10.10.4.2 (compartimento único ≤ 630 A — perdas × capacidade do invólucro)' : term.metodo === '10.10.4.3' ? '10.10.4.3 (IEC TR 60890, ≤ 1600 A)' : 'acima de 1600 A só por ensaio'}; ${arred(term.P, 0)} W, ar no topo ≈ ${arred(term.tTopo, 1)} °C (limite ${c.temperaturaMax} °C); correntes dos circuitos ≤ 80 % da corrente térmica convencional dos dispositivos (10.10.4.2.1 [CONFERIR])`, situacao: term.ok ? 'atende por cálculo' : (term.ventilacao ? 'atende com ventilação forçada' : 'não atende — aumentar o invólucro') },
    { n: 11, item: 'Suportabilidade a curto-circuito', ref: '10.11', opcoes: 'Ensaio; comparação com projeto de referência', como: isento ? `Icc ${c.icc} kA ≤ 10 kA: verificação dispensada (10.11.2 [CONFERIR])` : `Icw ${barr.icw} kA/${c.tempoIcw} s e Ipk ${arred(c.ipk, 1)} kA — ${barr.tipo === 'barra' ? `barra ${barr.fase ? `${barr.fase.l}×${barr.fase.e}` : '?'} ${barr.curtoOk ? 'atende' : 'NÃO atende'} ao curto térmico${barr.dinamico ? ` e ${barr.dinamico.ok ? 'atende' : 'NÃO atende'} ao esforço (estimativa)` : ''}` : 'pente: suportabilidade pelo fabricante com o disjuntor a montante'}; comparação com projeto de referência (10.11.3, Tabela 13) ou ensaio`, situacao: isento ? 'dispensada' : (barr.tipo === 'barra' ? (barr.curtoOk && barr.dinamico?.ok ? 'atende por cálculo (estimativa)' : 'revisar barramento') : 'pelo fabricante') },
    { n: 12, item: 'Compatibilidade eletromagnética (EMC)', ref: '10.12', opcoes: 'Ensaio; avaliação', como: 'Componentes conformes às suas normas de EMC e instalados conforme o fabricante (Anexo J [CONFERIR]); separação potência × comando, blindagens aterradas', situacao: 'avaliação' },
    { n: 13, item: 'Operação mecânica', ref: '10.13', opcoes: 'Ensaio', como: 'Portas, travas, manoplas e intertravamentos operados (ciclos de ensaio [CONFERIR])', situacao: 'ensaio na fabricação' },
  ];
}

// ── Lista de materiais ──────────────────────────────────────────────────────

function materiais(calc) {
  const { c, comps, geral, barr, layout, born, fio, aut, dpsInfo, term, inv, motores } = calc;
  const itens = [];
  let n = 0;
  // extra: { fabricante, referencia_fabricante, medidas, fonte, origem_medida, verificado } — de onde veio a medida
  const add = (grupo, descricao, unidade, quantidade, referencia = '', extra = {}) => {
    if (!(quantidade > 0)) return;
    const ex = itens.find(i => i.descricao === descricao && i.unidade === unidade);
    if (ex) { ex.quantidade += quantidade; return; }
    itens.push({ codigo: `QD-${String(++n).padStart(3, '0')}`, grupo, descricao, unidade, quantidade, referencia, ...extra });
  };
  const fmtMm = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
  const origem = (m, l, h, p) => {
    if (!m) return {};
    const cat = m.origem === 'catalogo';
    return {
      fabricante: m.fabricante || '', referencia_fabricante: m.referencia || '', medidas: l ? `${fmtMm(l)} × ${fmtMm(h)} × ${fmtMm(p)}` : '',
      origem_medida: m.origem, verificado: !!m.verificado,
      fonte: cat ? `${m.fonte_documento || ''}${m.fonte_url ? ` ${m.fonte_url}` : ''}${m.verificado ? '' : ' [CONFERIR — medida não verificada no documento oficial]'}`.trim() : 'medida típica de catálogo [CONFERIR]',
    };
  };
  const env = layout.involucro;
  add('Invólucro', `Quadro ${({ sobrepor: 'de sobrepor', embutir: 'de embutir', autoportante: 'autoportante' })[c.montagem]} em ${({ aco: 'chapa de aço pintada', inox: 'aço inox', aluminio: 'alumínio', poliester: 'poliéster' })[c.material]}, ${env.altura} × ${env.largura} × ${env.profundidade} mm (A × L × P), ${inv.ip} / ${inv.ik}, porta com fecho e placa de montagem`, 'un', 1, 'NBR IEC 61439-1/-2; NBR IEC 60529; NBR IEC 62262');
  add('Invólucro', `Espelho/contraporta de proteção (IPXXB) recortado para os dispositivos modulares`, 'un', layout.fileiras.some(f => ['entrada', 'distribuicao', 'comando'].includes(f.zona)) ? 1 : 0, 'NBR IEC 61439-1, 8.2');
  add('Invólucro', `Prensa-cabos/flange de entrada de cabos (${c.entradaCabos}) com vedação ${inv.ip}`, 'cj', 1, 'Manter o IP do invólucro');
  add('Invólucro', 'Cordoalha de aterramento da porta e da placa (16 mm²)', 'un', 2, 'NBR IEC 61439-1, 8.4.3.2 [CONFERIR]');
  // dispositivos
  for (const k of comps.lista) {
    // partidas, TCs, bloco de aferição e termostato têm linha própria (Medição / Climatização) abaixo
    if (['partida', 'tc', 'bloco_afericao', 'termostato'].includes(k.tipo)) continue;
    add('Proteção e manobra', k.descricao.replace(/ — circ\. [^—]*/, '').replace(/ — circuitos [^—]*/, '').trim(), 'un', 1, k.tipo === 'dps' ? 'NBR 5410, 6.3.5.2' : k.tipo.startsWith('modulo') || k.tipo === 'clp' ? 'Automação' : 'NBR IEC 60947 / NBR NM 60898', origem(k.medida, k.largura, k.altura, k.prof));
  }
  for (const m of motores) {
    const bloco = comps.lista.find(k => k.tipo === 'partida' && k.motor === m.tag);
    for (const d of m.partidaInfo.dispositivos) {
      const f = bloco && bloco.filhos.find(x => x.ref === (d.ref === 'F1-F3' ? 'Q1' : d.ref));
      const fm = f && f.medida && f.medida.origem === 'catalogo' ? ` — ${f.medida.fabricante} ${f.medida.referencia}` : '';
      const desc = d.especificacao || (d.tipo === 'contator' ? `Contator tripolar ${d.nominal_a} A AC-3, bobina ${aut.ativo ? '24 Vcc' : `${c.vfn} Vca`}` : d.tipo === 'rele_sobrecarga' ? `Relé de sobrecarga faixa ${d.faixa ? `${d.faixa[0]}–${d.faixa[1]}` : ''} A` : d.tipo);
      add('Partidas de motores', `${desc}${fm}`, 'un', d.quantidade || 1, d.tipo === 'contator' ? 'NBR IEC 60947-4-1' : 'NBR IEC 60947', f ? origem(f.medida, f.l, f.h, f.p) : {});
    }
  }
  const tc1 = comps.lista.find(k => k.tipo === 'tc');
  const xtc = comps.lista.find(k => k.tipo === 'bloco_afericao');
  if (comps.medicao && comps.medicao.qtdTc) add('Medição', `Transformador de corrente ${comps.medicao.tc}/5 A classe 0,5, 2,5 VA, janela para a barra/cabo do geral`, 'un', comps.medicao.qtdTc, 'Medição', tc1 ? origem(tc1.medida, tc1.largura, tc1.altura, tc1.prof) : {});
  if (comps.medicao && comps.medicao.qtdTc) add('Medição', 'Bloco de aferição (curto-circuitador de TC) 10 polos', 'un', 1, 'Medição', xtc ? origem(xtc.medida, xtc.largura, xtc.altura, xtc.prof) : {});
  // barramentos
  if (barr.tipo === 'barra' && barr.fase) {
    add('Barramentos', `Barra de cobre eletrolítico ${barr.fase.l} × ${barr.fase.e} mm (${barr.secaoFase} mm²) — fases`, 'm', arred(c.nFases * barr.comprimentoFase, 2), 'DIN 43671');
    if (barr.neutro) add('Barramentos', `Barra de cobre ${barr.neutro.l} × ${barr.neutro.e} mm — neutro`, 'm', arred(barr.comprimentoFase, 2), 'NBR 5410, 6.2.6');
    add('Barramentos', `Isolador suporte de barramento (epóxi/poliéster) M8, h ≥ ${Math.max(40, c.entreFases / 2)} mm, ≥ ${arred(barr.dinamico ? barr.dinamico.forcaApoio : 0, 0)} N`, 'un', barr.isoladores, 'IEC 60865-1 (esforço estimado)');
    add('Barramentos', 'Kit de parafusos, porcas, arruelas de pressão e lisas (aço bicromatizado/inox) para conexões de barra', 'cj', 1, 'Torque do fabricante');
    add('Barramentos', 'Proteção isolante (policarbonato) frontal do barramento', 'un', 1, 'NBR IEC 61439-1, 8.4 (forma de separação)');
  } else {
    const fileiras = Math.max(1, barr.fileirasPente || 1);
    add('Barramentos', `Barramento tipo pente ${c.nFases}P ${barr.pente.a} A (${barr.pente.s} mm²), cortar no comprimento da fileira`, 'un', fileiras, 'Fabricante dos disjuntores');
    add('Barramentos', 'Terminal de alimentação do pente e tampas de proteção dos pinos livres', 'cj', fileiras, '');
    add('Barramentos', `Bloco de distribuição ${c.nFases + 1} polos ≥ ${geral.In} A`, 'un', fileiras > 1 ? 1 : 0, '');
  }
  const nN = calc.circuitos.filter(x => x.neutro).length;
  add('Barramentos', `Barramento de neutro isolado (azul) ${barr.tipo === 'pente' ? `com ${nN + Math.ceil(nN * c.reservaPct) + 2} furos/terminais` : `${barr.neutro ? `${barr.neutro.l}×${barr.neutro.e}` : ''}`}`, 'un', c.esquema === 'TN-C' || barr.tipo === 'barra' ? 0 : 1, 'NBR 5410, 6.1.5.3.1');
  add('Barramentos', `Barramento de terra (PE) ${barr.pe.l} × ${barr.pe.e} mm com ${calc.circuitos.length + motores.length + Math.ceil((calc.circuitos.length + motores.length) * c.reservaPct) + 4} terminais, verde-amarelo`, 'un', 1, 'NBR 5410, Tabela 58; 6.1.5.3.2');
  // trilhos, canaletas
  const trilhoM = layout.fileiras.filter(f => f.trilho).length * layout.larguraUtil / 1000;
  add('Montagem', 'Trilho DIN 35 × 7,5 mm perfurado (EN 60715)', 'm', arred(Math.ceil(trilhoM * 10) / 10, 1), 'EN 60715');
  for (const [k, v] of Object.entries(layout.canaletasMetros)) add('Montagem', `Canaleta de fiação recortada ${k} mm com tampa`, 'm', arred(Math.ceil(v * 10) / 10, 1), `ocupação ≤ ${T.OCUPACAO_CANALETA * 100} %`);
  // bornes
  for (const g of born) {
    const porSecao = {};
    g.itens.forEach(i => { porSecao[i.secao] = (porSecao[i.secao] || 0) + i.quantidade; });
    const totalItens = g.itens.reduce((s, i) => s + i.quantidade, 0);
    Object.entries(porSecao).forEach(([s, q]) => {
      const md = (g.medidas || []).find(x => Number(x.secao) === Number(s));
      const fm = md && md.origem === 'catalogo' ? ` — ${md.fabricante} ${md.referencia}` : '';
      add('Bornes', `Borne de passagem ${String(s).replace('.', ',')} mm² (${g.id})${fm}`, 'un', q + Math.ceil(q / Math.max(1, totalItens) * g.reserva), 'NBR IEC 60947-7-1', md ? origem(md, md.largura_mm, g.altura, g.prof) : {});
    });
    const pe = g.itens.reduce((s, i) => s + (i.pe || 0), 0);
    if (pe) add('Bornes', `Borne terra (PE) verde-amarelo (${g.id})`, 'un', pe, 'NBR IEC 60947-7-2');
    add('Bornes', `Poste/batente para trilho (${g.id})`, 'un', 2, '');
    add('Bornes', `Tampa final de borne (${g.id})`, 'un', 1 + g.itens.length, '');
    add('Bornes', `Plaqueta de identificação de bornes (${g.id})`, 'un', g.total + g.reserva, 'NBR 5410, 6.5.4.9');
  }
  // fiação
  for (const [s, m] of Object.entries(fio.condutoresMetros).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    add('Fiação interna', `Cabo flexível 750 V ${String(s).replace('.', ',')} mm² (cores: fases preto/vermelho/branco, N azul-claro, PE verde-amarelo, comando 24 Vcc azul-escuro) [CONFERIR padrão de cores]`, 'm', Math.ceil(m * 1.2), 'NBR NM 247-3; NBR 5410, 6.1.5.3');
    const nCond = Math.ceil(m / c.fiacaoM);
    add('Fiação interna', `Terminal tubular (ponteira) isolado ${String(s).replace('.', ',')} mm²`, 'un', Math.ceil(nCond * 2 * 1.1), '');
  }
  const totalCond = Object.values(fio.condutoresMetros).reduce((s, m) => s + m / c.fiacaoM, 0);
  add('Identificação', 'Anilhas de identificação dos condutores (as duas pontas)', 'un', Math.ceil(totalCond * 2 * 1.1), 'NBR 5410, 6.5.4.9');
  add('Identificação', 'Etiquetas de identificação dos dispositivos (acrílico/poliéster gravado)', 'un', comps.lista.length + motores.length, 'NBR 5410, 6.5.4.9');
  add('Identificação', `Placa de identificação do conjunto (fabricante, tipo, data, norma, Ue/Ui/Uimp, In, Icw/Ipk, IP, forma)`, 'un', 1, 'NBR IEC 61439-1, 6.1 [CONFERIR]');
  add('Identificação', `Placa de advertência "PERIGO — RISCO DE CHOQUE ELÉTRICO"${c.residencial ? ' e advertência da NBR 5410, 6.5.4.10' : ''}`, 'un', 1, c.residencial ? 'NBR 5410, 6.5.4.10; NR-10' : 'NR-10');
  add('Identificação', 'Porta-documentos interno com diagrama unifilar/esquemas plastificados', 'un', 1, 'NBR 5410, 6.1.8 [CONFERIR]');
  add('Acessórios', 'Abraçadeiras, suportes adesivos, espiral e acessórios de fiação', 'cj', 1, '');
  if (aut.ativo || aut.porta.length) {
    for (const p of aut.porta) add('Porta (comando e sinalização)', `${p.rotulo} Ø 22 mm${p.funcao ? ` — ${p.funcao}` : ''} (cor: ${p.cor})`, 'un', p.quantidade, 'NBR IEC 60204-1, 10.2 a 10.7 [CONFERIR]; NBR IEC 60947-5-1');
    if (aut.ihm) add('Porta (comando e sinalização)', `IHM touch ${aut.ihm}" 24 Vcc, Ethernet`, 'un', 1, 'Automação');
    if (aut.ativo) add('Automação', 'Cabo blindado 2 × 0,75 mm² (par trançado) para sinais analógicos e abraçadeiras/barra de aterramento de blindagem (360°)', 'm', Math.ceil(2 * (aut.usados.AI + aut.usados.AO) * c.fiacaoM * 1.2) || 0, 'IEC 61000-5-2 [CONFERIR]');
    if (aut.ativo) add('Automação', 'Cabo de rede Cat 6 blindado (patch cord) para CLP/IHM/switch', 'un', 1 + (aut.ihm ? 1 : 0) + (aut.switchPortas ? 1 : 0), '');
  }
  if (term.ventilacao) {
    add('Climatização', `Ventilador com filtro ${term.ventilacao.ventilador} m³/h (vazão livre) ${c.vfn} Vca + grelha de saída com filtro, ${inv.ip}`, 'cj', term.ventilacao.quantidade, 'Cálculo térmico (IEC TR 60890)');
  }
  const bt = comps.lista.find(k => k.tipo === 'termostato');
  if (bt) add('Climatização', bt.descricao, 'un', 1, '', origem(bt.medida, bt.largura, bt.altura, bt.prof));
  return itens;
}

// ── Cálculo completo ────────────────────────────────────────────────────────

// opcoes: { semCatalogo } — só medidas típicas (para comparar o aproveitamento); { semComparacao };
// { semCatalogoEmbutido } — só o catálogo recebido em dados (testes com registros fictícios)
function calcular(dados, opcoes = {}) {
  const avisos = [];
  const premissas = [];
  const c = config(dados);
  if (!c.iccInformada) premissas.push(`Icc presumida no ponto não informada: adotados ${ICC_PADRAO_KA} kA para escolher a capacidade de interrupção e o barramento. [CONFERIR com o estudo de curto / a distribuidora]`);
  if (!c.ipkInformado) premissas.push(`Ipk = n × Icc = ${String(c.fatorN).replace('.', ',')} × ${String(c.icc).replace('.', ',')} = ${String(c.ipk).replace('.', ',')} kA (NBR IEC 61439-1, Tabela 7 [CONFERIR]).`);
  const circuitos = lerCircuitos(dados, c, avisos);
  const motores = lerMotores(dados, c);
  if (motores.some(m => m.semPlaca)) premissas.push(`Motores sem rendimento/FP de placa: adotados η = ${T.MOTOR_PADRAO.eta} e FP = ${T.MOTOR_PADRAO.fp}. [CONFERIR placa]`);
  if (!circuitos.length && !motores.length) avisos.push('Nenhum circuito ou motor informado — preencha o quadro de cargas.');
  const dem = demanda(circuitos, motores, c);
  if (!dem.fdInformado) premissas.push(`Fator de diversidade ${String(dem.fd).replace('.', ',')} pelo número de circuitos de saída (${dem.nSaidas}) — NBR IEC 61439-2, fator de diversidade nominal assumido [CONFERIR]; informe o fator real se houver.`);
  if (dem.desequilibrio > 0.15) avisos.push(`Desequilíbrio entre fases de ${Math.round(dem.desequilibrio * 100)} % — redistribuir circuitos monofásicos (prática ≤ 10–15 %).`);
  const geral = disjuntorGeral(c, dem, avisos);
  const drs = gruposDr(circuitos, dados, c);
  coordenar(circuitos, geral, c, avisos);
  drs.forEach(g => g.notas.forEach(nn => avisos.push(`${g.id}: ${nn}`)));
  const dpsInfo = dps(c);
  if (!dpsInfo) avisos.push('Quadro sem DPS: confirmar que há DPS a montante e a coordenação (NBR 5410, 6.3.5.2).');
  const aut = automacao(dados, c, motores);
  if (aut.ativo) {
    if (aut.fontes > 1) avisos.push(`Consumo 24 Vcc exige ${aut.fontes} fontes de 40 A — dividir as cargas por ramo.`);
    if (aut.clp) Object.entries(aut.folgaIo).forEach(([t, f]) => { if (aut.usados[t] && f < Math.ceil(aut.usados[t] * aut.reserva)) avisos.push(`E/S ${t}: reserva abaixo de ${Math.round(aut.reserva * 100)} %.`); });
  }
  const reservaCircuitos = Math.max(ET.reservaQuadro(circuitos.filter(x => !x.reserva).length), Math.ceil(c.reservaPct * circuitos.filter(x => !x.reserva).length));
  // arranjo físico + térmica. A ventilação só se sabe depois do invólucro escolhido; quando ela é
  // necessária, o termostato do ventilador entra na lista e o arranjo é refeito com ele (o espaço
  // dele conta na placa e no invólucro). Seletor novo a cada passada: não duplica "usados"/"sem medida".
  const arranjar = (termostato) => {
    const sel = criarSeletor(dados, { desligado: !!opcoes.semCatalogo, semArquivo: !!opcoes.semCatalogoEmbutido });
    const barr = barramento(c, geral, circuitos, dem, motores);
    const comps = componentes(c, circuitos, drs, geral, dpsInfo, motores, aut, dem, sel, { termostato, barramento: barr.tipo });
    const born = bornes(c, circuitos, motores, aut, sel);
    const fio = fiacao(c, circuitos, motores, aut, comps, geral);
    const inv = protecaoInvolucro(c, circuitos, motores, geral);
    const layout = montarLayout({ c, comps: comps.lista, born, fio, barr, aut, reservaCircuitos, porta: aut.porta, geral, nNeutros: circuitos.filter(x => x.neutro).length });
    completarBarramento(barr, c, dem, layout);
    const perdasComp = comps.lista.reduce((s, k) => s + (k.perda || 0), 0);
    const perdas = { componentes: perdasComp, barramento: barr.perda || 0, fiacao: fio.perda, total: perdasComp + (barr.perda || 0) + fio.perda };
    perdas.porTipo = {};
    comps.lista.forEach(k => { perdas.porTipo[k.tipo] = (perdas.porTipo[k.tipo] || 0) + (k.perda || 0); });
    const term = termica(c, perdas, { ...layout.involucro, corrente: geral.In });
    return { sel, comps, born, fio, barr, inv, layout, perdas, term };
  };
  let arr = arranjar(false);
  if (!arr.term.ok && arr.term.ventilacao && c.ventilacao !== 'nao') arr = arranjar(true);
  const { sel, comps, born, fio, barr, inv, layout, perdas, term } = arr;
  if (!layout.cabe) avisos.push(`Nenhum invólucro da série ${c.montagem} comporta o arranjo — usado o maior (${layout.involucro.altura} × ${layout.involucro.largura} mm); dividir em colunas/quadros ou trocar a montagem para autoportante.`);
  if (barr.tipo === 'barra') {
    if (!barr.correnteOk) avisos.push(`Barramento: nenhuma barra simples atende ${geral.In} A com k2 = ${arred(barr.k2, 3)} — usar barras em paralelo por fase. [CONFERIR]`);
    if (!barr.curtoOk) avisos.push(`Barramento abaixo da seção mínima ao curto (${arred(barr.sCurtoMin, 0)} mm²).`);
    if (barr.dinamico && !barr.dinamico.ok) avisos.push(`Esforço eletrodinâmico: σ ≈ ${arred(barr.dinamico.sigma, 0)} N/mm² > ${barr.dinamico.adm} N/mm² — reduzir a distância entre apoios para ≤ ${Math.floor(barr.dinamico.lMax / 10) * 10} mm (estimativa). [CONFERIR]`);
  } else if (!barr.penteOk) avisos.push(`Geral de ${geral.In} A acima do maior pente (${barr.pente.a} A) — usar barramento de barras.`);
  if (!term.ok) {
    if (c.ventilacao === 'nao' || !term.ventilacao) avisos.push(`Elevação de temperatura: ar no topo ≈ ${arred(term.tTopo, 1)} °C > ${c.temperaturaMax} °C — aumentar o invólucro (superfície efetiva ≥ ${arred(term.aeNecessaria, 2)} m²) ou ventilar.`);
    else avisos.push(`Elevação de temperatura: ar no topo ≈ ${arred(term.tTopo, 1)} °C > ${c.temperaturaMax} °C — previsto ventilador com filtro de ${term.ventilacao.ventilador} m³/h (necessário ${arred(term.ventilacao.vazao, 0)} m³/h).`);
    if (c.ventilacao === 'nao') term.ventilacao = null;
    if (term.ventilacao && IP_NUM(inv.ip)[0] >= 6) avisos.push(`${inv.ip} com ventilação por filtro não se mantém: usar trocador de calor ou ar-condicionado de painel. [CONFERIR]`);
  }
  if (!inv.ipOk) avisos.push(`${inv.ip} abaixo do recomendado para o local (${c.localInfo.ip}).`);
  if (c.maquina) premissas.push('Quadro de máquina: NBR IEC 60204-1 e NR-12 — parada de emergência por relé de segurança monitorado, categoria pela apreciação de risco (NBR ISO 12100 / NBR ISO 13849-1). [CONFERIR]');
  const calc = { c, circuitos, motores, dem, geral, drs, dpsInfo, aut, comps, born, fio, barr, inv, layout, perdas, term, reservaCircuitos, avisos, premissas };
  calc.verificacoes = verificacoesProjeto(calc);
  calc.materiais = materiais(calc);
  // catálogo: o que veio do fabricante e o que ficou na medida típica (o backend busca as oficiais)
  calc.catalogo = { registros: sel.catalogo.length, usados: sel.usados, fabricantes: dados.fabricantes || null };
  calc.componentes_sem_medida = sel.semMedida;
  calc.espaco = resumoEspaco(calc);
  const doCatalogo = sel.usados.length;
  if (doCatalogo) {
    const semVerif = sel.usados.filter(u => !u.verificado).length;
    premissas.push(`Medidas de ${doCatalogo} dispositivo(s) pelo catálogo do fabricante${semVerif ? ` (${semVerif} sem verificação no documento oficial [CONFERIR])` : ''}; os demais com dimensões típicas [CONFERIR].`);
    if (!opcoes.semComparacao) {
      const tip = calcular(dados, { semCatalogo: true, semComparacao: true });
      calc.comparacao = { tipica: tip.espaco, catalogo: calc.espaco };
    }
  }
  if (sel.semMedida.length) avisos.push(`${sel.semMedida.length} dispositivo(s) do fabricante escolhido sem medida oficial no catálogo — dimensões típicas usadas: ${sel.semMedida.slice(0, 6).map(x => x.especificacao).join('; ')}${sel.semMedida.length > 6 ? '…' : ''}. [CONFERIR]`);
  return calc;
}

// Aproveitamento do espaço interno: área da placa ocupada por dispositivos, trilho usado e reserva
function resumoEspaco(calc) {
  const { layout } = calc;
  const areaPlaca = layout.placa.altura * layout.placa.largura;
  let pecas = 0;
  for (const f of layout.fileiras) for (const k of f.itens) if (k.tipo !== 'reserva') pecas += (k.largura || 0) * (k.altura || 0);
  const canaletas = layout.horizontais.reduce((s, h) => s + h.largura * layout.larguraUtil, 0) + (layout.verticais.esquerda.largura + layout.verticais.direita.largura) * (layout.placa.altura - 2 * T.MARGEM_UTIL);
  return {
    involucro: { ...layout.involucro }, placa: { ...layout.placa }, areaPlacaM2: areaPlaca / 1e6,
    ocupacaoPlaca: pecas / areaPlaca, ocupacaoCanaletas: canaletas / areaPlaca, ocupacaoTrilho: layout.ocupacaoTrilho,
    reservaModulos: Math.round(layout.reservaMm / T.MODULO_MM), alturaNecessaria: layout.alturaNecessaria, sobraAltura: layout.sobraAltura, fileiras: layout.fileiras.length,
  };
}

module.exports = {
  calcular, config, lerCircuitos, correnteDoCircuito, demanda, disjuntorGeral, kAdiabatico, k2Temperatura, escolherBarra,
  superficieEfetiva, termica, dps, automacao, rdf, resumoEspaco, LIGACOES, TIPOS_CIRCUITO, TIPOS_QUADRO, PORTA, SINAIS_POR_PARTIDA,
};
