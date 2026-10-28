// Dados do diagrama unifilar (QGBT → CCMs → motores com partida) em forma
// neutra, para geradores de esquema (ex.: QElectroTech). Nada aqui é
// calculado de novo: só reorganiza o resultado de calculo.js.
//
// Referências de equipamento no estilo IEC 81346-2 usual em CCM:
//   Q = disjuntor/seccionador, K = contator, F = relé/fusível, T = conversor
//   (soft-starter/inversor), M = motor, C = banco de capacitores, W = cabo.

const arred = (v, c = 2) => (v == null ? null : Math.round(v * 10 ** c) / 10 ** c);

function cabo(a) {
  if (!a) return null;
  return {
    fases: a.condutores === 6 ? '6 condutores (Y-Δ)' : '3F',
    condutores_por_fase: a.paralelos || 1,
    secao_mm2: a.secao, neutro_mm2: a.secaoNeutro || null, pe_mm2: a.secaoPE,
    comprimento_m: arred(a.comprimento, 1), metodo: a.metodo, queda_regime_pct: arred(a.queda),
  };
}

function saidaMotor(u, c) {
  const p = u.partidaInfo;
  return {
    tipo: 'motor', tag: u.tag, descricao: u.descricao, em_operacao: u.emOperacao,
    potencia_kw: arred(u.pKw, 2), potencia_cv: arred(u.cv, 2), tensao_v: u.tensao, in_a: arred(u.in, 1), ip_in: u.ipIn, fs: u.fs, regime: u.regime,
    partida: {
      tipo: p.tipo, rotulo: p.rotulo, ip_linha_a: arred(p.ipLinha, 0), conjugado_pct: p.conjugado == null ? null : arred(p.conjugado, 0),
      sobrecarga: p.sobrecarga,
      dispositivos: p.dispositivos.map(d => ({
        ref: d.ref, tipo: d.tipo, funcao: d.funcao,
        nominal_a: d.nominal_a ?? null, faixa_a: d.faixa || null, ajuste_a: d.ajuste_a ?? null, categoria: d.categoria || null,
        icu_min_ka: ['disjuntor_motor', 'caixa_moldada'].includes(d.tipo) ? u.curto.icuMin : null,
        especificacao: d.especificacao || null,
      })),
    },
    cabo: { ...cabo(u.circuito), condutores: u.circuito.condutores },
    queda_partida_pct: { dispositivo: arred(u.quedaPartida.dispositivo), motor: arred(u.quedaPartida.motor) },
    icc_motor_ka: arred(u.curto.iccMax / 1000), seccionadora_local: u.seccionadoraLocal,
    tensao_rede_v: c.vff,
  };
}

function saidaCarga(o) {
  return {
    tipo: 'carga', tag: o.id, descricao: o.descricao, categoria: o.tipo, potencia_kw: o.kw, ligacao: o.ligacao,
    protecao: { ref: 'Q', tipo: 'disjuntor', polos: o.circuito.polos, nominal_a: o.circuito.disjuntor },
    cabo: { fases: o.ligacao === 'FFF' ? '3F' : 'F', condutores_por_fase: 1, secao_mm2: o.circuito.secao, neutro_mm2: o.circuito.secaoNeutro || null, pe_mm2: o.circuito.secaoPE, comprimento_m: o.circuito.comprimento, metodo: o.circuito.metodo, queda_regime_pct: arred(o.circuito.queda) },
  };
}

function curto(q) {
  return q.curto ? { icc_ka: arred(q.curto.icc / 1000), icc_fonte_ka: arred(q.curto.iccFonte / 1000), ip_ka: arred(q.curto.ip / 1000), icu_min_ka: q.curto.icuMin } : null;
}

function montarUnifilar(calc) {
  const { config: c, qgbt, quadros, entrada, trafo, banco } = calc;
  return {
    versao: 1,
    sistema: { tensao_ff_v: c.vff, tensao_fn_v: c.vfn, frequencia_hz: c.frequencia, esquema: c.esquema },
    origem: c.entrada === 'trafo'
      ? { tipo: 'transformador', ref: 'TR1', kva: trafo.kva, z_pct: trafo.z, tensao_secundario_v: c.vff, in_secundario_a: arred(trafo.inSec, 1), icc_terminais_ka: arred(trafo.iccTerminais / 1000), scc_rede_mva: c.sccRedeMva }
      : { tipo: 'entrada_bt', ref: 'ENT', icc_entrada_ka: c.iccEntradaKa },
    cabo_entrada: { ref: 'W0', ...cabo(entrada.cabo) },
    qgbt: {
      ref: 'QGBT', descricao: qgbt.descricao,
      disjuntor_geral: { ref: 'Q0', nominal_a: entrada.disjuntorGeral, icu_min_ka: qgbt.curto.icuMin },
      barramento_a: qgbt.conjunto.barramento, icw_min_ka: qgbt.conjunto.icw, curto: curto(qgbt),
      dps: { quantidade: c.esquema === 'TN-S' || c.esquema === 'TT' ? 4 : 3, classe: 'II', uc_v: calc.dps.uc },
      saidas: [
        ...quadros.filter(q => q.alim).map((q, i) => ({
          tipo: 'alimentador', ref: `Q${i + 1}`, destino: q.id, nominal_a: q.alim.disjuntor, icu_min_ka: qgbt.curto.icuMin,
          ib_6_5_1_a: arred(q.projeto.ib, 1), cabo: { ref: `W${i + 1}`, ...cabo(q.alim) },
        })),
        ...qgbt.motores.map(u => saidaMotor(u, c)),
        ...qgbt.outras.map(saidaCarga),
        ...(banco.necessario ? [{
          tipo: 'banco_capacitores', ref: 'C1', kvar_total: banco.total, estagios_kvar: banco.estagios, tipo_banco: banco.tipo,
          dessintonizado: banco.dessintonizado, tensao_capacitor_v: banco.tensaoCapacitor,
          protecao: { ref: 'QC1', nominal_a: banco.cabo.disjuntor, icu_min_ka: qgbt.curto.icuMin }, fusivel_estagio_a: banco.fusivelEstagio,
          cabo: { ref: 'WC1', ...cabo(banco.cabo) },
        }] : []),
      ],
    },
    quadros: quadros.filter(q => q.alim).map(q => ({
      ref: q.id, tipo: q.tipo, descricao: q.descricao, alimentado_por: 'QGBT', forma: q.forma, ip: q.ip,
      barramento_a: q.conjunto.barramento, icw_min_ka: q.conjunto.icw, curto: curto(q),
      chave_geral_a: q.alim.disjuntor,
      saidas: [...q.motores.map(u => saidaMotor(u, c)), ...q.outras.map(saidaCarga)],
    })),
  };
}

// Adaptador para o gerador de unifilar de quadro que já existe na base comum
// (skills/_comum/cad/qet/unifilar-qd.mjs → gerarUnifilarQD): mesma forma de
// dados de skills/_comum/cad/unifilar.js (dadosUnifilar). Desenha cada saída
// com disjuntor + carga; o símbolo de motor (M 3~), contatores e relé ainda não
// existem nesse gerador — por isso a partida vai no texto do disjuntor.
const virgula = (n, d = 1) => String(Number(n).toFixed(d)).replace('.', ',').replace(/,0+$/, '');
const mm2 = (s) => `${virgula(s, 1)} mm²`;
const curtoTxt = (s, max) => (String(s).length > max ? `${String(s).slice(0, max - 1)}…` : String(s));
const SIGLA_PARTIDA = { direta: 'direta', estrela_triangulo: 'Y-Δ', soft_starter: 'soft', inversor: 'inversor' };

function dadosUnifilarQD(res, { quadro = 'QGBT' } = {}) {
  const { calc, dados } = res;
  const c = calc.config;
  const q = quadro === 'QGBT' ? calc.qgbt : calc.quadros.find(x => x.id === quadro);
  if (!q) throw new Error(`Quadro "${quadro}" não existe (disponíveis: QGBT, ${calc.quadros.map(x => x.id).join(', ')}).`);
  const hoje = new Date();
  const cabo = quadro === 'QGBT' ? calc.entrada.cabo : q.alim;
  const geral = quadro === 'QGBT' ? calc.entrada.disjuntorGeral : q.alim.disjuntor;
  const circuitos = [];
  const add = (tipo, descricao, disjuntor, secao, carga) => circuitos.push({ id: circuitos.length + 1, tipo, descricao: curtoTxt(descricao, 23), disjuntor, secao, carga, dr: null });
  if (quadro === 'QGBT') calc.quadros.filter(x => x.alim).forEach(x => add('tue', `Alim. ${x.id}`, `${x.alim.disjuntor} A — 3P`, `${x.alim.paralelos > 1 ? `${x.alim.paralelos}×` : ''}${mm2(x.alim.secao)}`, `${virgula(x.projeto.ib, 0)} A`));
  for (const u of q.motores) {
    const prot = u.partidaInfo.dispositivos.find(d => d.ref === 'Q1' || d.ref === 'F1-F3');
    const pTxt = prot.faixa ? `${virgula(prot.faixa[0])}–${virgula(prot.faixa[1])} A` : `${prot.nominal_a} A`;
    add('tue', `${u.tag} ${virgula(u.cv)} cv ${SIGLA_PARTIDA[u.partida]}`, `${pTxt} — ${prot.tipo === 'fusivel' ? 'fus.' : 'DM'}`, `${u.circuito.condutores === 6 ? '6×' : ''}${mm2(u.circuito.secao)}`, `${virgula(u.pKw)} kW`);
  }
  for (const o of q.outras) add(o.tipo === 'iluminacao' ? 'iluminacao' : o.tipo === 'resistiva' ? 'aquecedor' : 'tomada', o.descricao, `${o.circuito.disjuntor} A — ${o.circuito.polos}P`, mm2(o.circuito.secao), `${virgula(o.kw)} kW`);
  if (quadro === 'QGBT' && calc.banco.necessario) add('tue', `Banco capac. ${virgula(calc.banco.total)} kvar`, `${calc.banco.cabo.disjuntor} A — 3P`, mm2(calc.banco.cabo.secao), `${virgula(calc.banco.total)} kvar`);
  return {
    quadro,
    obra: dados.obra?.nome || dados.meta?.titulo || 'Obra',
    cliente: dados.cliente?.nome || '',
    local: q.descricao || '',
    data: `${hoje.getFullYear()}${String(hoje.getMonth() + 1).padStart(2, '0')}${String(hoje.getDate()).padStart(2, '0')}`,
    rev: dados.meta?.revisao || 'R00',
    responsavel: dados.responsavel?.nome || '',
    crea: dados.responsavel?.crea ? `CREA ${dados.responsavel.crea}` : '',
    arquivo: `unifilar-${quadro.toLowerCase()}`,
    alimentacao: {
      texto: `3F${cabo.secaoNeutro ? '+N' : ''}+PE — ${c.vff}/${c.vfn} V — ${c.frequencia} Hz`,
      secao: `${cabo.paralelos > 1 ? `${cabo.paralelos} × (` : ''}${cabo.secaoNeutro ? 4 : 3} × ${mm2(cabo.secao)}${cabo.paralelos > 1 ? ')' : ''} + PE ${mm2(cabo.secaoPE)} (Cu/${c.isolacao})`,
      secaoCurta: mm2(cabo.secao),
    },
    geral: { descricao: `${geral} A — 3P` },
    dr: null,
    dps: { descricao: `classe II\n${calc.dps.uc} V — 20 kA`, secao: '16 mm²' }, // Uc pela NBR 5410, Tabela 49 (antes fixo em 275 V)
    circuitos,
    notas: [
      'NOTAS',
      `1. Icc no barramento ${virgula(q.curto.icc / 1000, 1)} kA;`,
      `    Icu mínimo ${q.curto.icuMin} kA.`,
      '2. Partidas: ver memorial (contatores',
      '    AC-3, relés e soft/inversor).',
      '3. Gerado pelo sistema H&M — revisar.',
    ],
  };
}

module.exports = { montarUnifilar, dadosUnifilarQD };
