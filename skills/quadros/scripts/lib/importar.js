// Adaptadores: o quadro de cargas de um projeto já calculado pelas skills de
// elétrica predial (skills/eletrica) ou industrial (skills/eletrica-industrial)
// vira o JSON desta skill (circuitos, motores, Icc e geral do quadro). Só LÊ
// as outras skills (roda o cálculo delas e copia o resultado).

const ELE = () => require('../../../eletrica/scripts/lib/index.js');
const IND = () => require('../../../eletrica-industrial/scripts/lib/index.js');
const MODELO = require('../../exemplos/modelo-vazio.json');

const clonar = (o) => JSON.parse(JSON.stringify(o));
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
const LIGACAO_ELE = { FN: 'FN', FF: 'FF', FFN: 'FFN', FFF: 'FFF', FFFN: 'FFFN', '3F': 'FFF', '3FN': 'FFFN' };

function cabecalho(dados, extra) {
  const m = clonar(MODELO);
  for (const k of ['meta', 'responsavel', 'cliente', 'obra']) m[k] = { ...m[k], ...(dados[k] || {}) };
  m.meta.titulo = extra.titulo || m.meta.titulo;
  return m;
}

// Elétrica predial → um quadro (o quadro de distribuição do projeto)
function deEletrica(dados, { tag = 'QD-01' } = {}) {
  const res = ELE().processar(dados);
  const { calc } = res;
  const c = calc.config;
  const m = cabecalho(dados, { titulo: `${tag} — importado da elétrica predial` });
  Object.assign(m.quadro, {
    tag, descricao: `Quadro de distribuição — ${dados.obra?.nome || ''}`.trim(), tipo: 'distribuicao',
    sistema: c.sistema, tensao_ff: c.vff, tensao_fn: c.vfn, esquema: c.esquema,
    icc_ka: r2(calc.quadro?.iccKa), disjuntor_geral_a: calc.alimentador?.disjuntor || null,
    residencial: /resid/i.test(dados.obra?.uso || ''),
  });
  let grupo = 0, noGrupo = 0;
  m.circuitos = calc.circuitos.map(x => {
    let dr = '', drGrupo = '';
    if (x.dr) {
      if (noGrupo === 0 || noGrupo >= 3) { grupo++; noGrupo = 0; }
      noGrupo++;
      dr = 'idr'; drGrupo = `DR${grupo}`;
    }
    return {
      n: String(x.id), descricao: x.descricao, tipo: ['iluminacao', 'tug', 'tue'].includes(x.tipo) ? x.tipo : 'outro',
      ligacao: LIGACAO_ELE[x.ligacao] || 'FN', fases: x.fases || '', potencia_w: r2(x.potencia_w ?? (x.potencia_va * (x.fp || 0.92))), fp: x.fp || null,
      ib_a: r2(x.ib), disjuntor_a: x.disjuntor, curva: 'C', icu_ka: null, dr, dr_grupo: drGrupo, dr_ma: 30, secao_mm2: x.secao,
      local_dr: (x.drMotivos || []).includes('local de 5.1.3.2.2'),
    };
  });
  return { dados: m, origem: `elétrica predial: ${calc.circuitos.length} circuitos; DR agrupados de 3 em 3 (revise os grupos)` };
}

// Elétrica industrial → um quadro (QGBT ou um CCM/QD do projeto)
function deIndustrial(dados, { quadro } = {}) {
  const res = IND().processar(dados);
  const { calc } = res;
  const c = calc.config;
  const id = quadro || (calc.quadros[0] ? calc.quadros[0].id : 'QGBT');
  const qgbt = id === 'QGBT';
  const q = qgbt ? null : calc.quadros.find(x => x.id === id);
  if (!qgbt && !q) throw new Error(`Quadro "${id}" não existe no projeto industrial (disponíveis: QGBT, ${calc.quadros.map(x => x.id).join(', ')}).`);
  const curto = qgbt ? calc.qgbt.curto : q.curto;
  const m = cabecalho(dados, { titulo: `${id} — importado da elétrica industrial` });
  Object.assign(m.quadro, {
    tag: id, descricao: qgbt ? 'Quadro geral de baixa tensão' : (q.descricao || id), tipo: qgbt ? 'distribuicao' : (q.tipo === 'CCM' ? 'ccm' : 'distribuicao'),
    sistema: 'trifasico', tensao_ff: c.vff, tensao_fn: c.vfn, esquema: c.esquema, frequencia_hz: c.frequencia,
    icc_ka: r2(curto.icc / 1000), ipk_ka: r2(curto.ip / 1000),
    disjuntor_geral_a: qgbt ? calc.entrada.disjuntorGeral : q.alim.disjuntor,
    forma_separacao: q?.forma || 'auto', ip: q?.ip || 'auto', montagem: 'autoportante', local: 'interno_poeira', multimedidor: qgbt,
  });
  const meus = calc.unidades.filter(u => u.quadro === id);
  m.motores = meus.map(u => ({
    tag: u.tag, descricao: u.descricao, potencia: r2(u.pKw), unidade: 'kW', rendimento: u.eta, fp: u.fp, in_placa_a: r2(u.in), ip_in: u.ipIn,
    partida: u.partida, quantidade: 1, secao_mm2: u.circuito.secao, tensao_placa: u.tensaoPlaca || '',
  }));
  m.circuitos = calc.outras.filter(o => o.quadro === id).map((o, i) => ({
    n: String(o.id || i + 1), descricao: o.descricao, tipo: o.tipo === 'iluminacao' ? 'iluminacao' : o.tipo === 'tomadas' ? 'tug' : 'tue',
    ligacao: o.ligacao === 'FFF' ? 'FFF' : 'FN', fases: '', potencia_w: r2(o.kw * 1000), fp: o.fp, ib_a: r2(o.circuito.ib), disjuntor_a: o.circuito.disjuntor,
    curva: 'C', icu_ka: null, dr: '', dr_grupo: '', dr_ma: 30, secao_mm2: o.circuito.secao, local_dr: false,
  }));
  if (qgbt) {
    for (const x of calc.quadros.filter(k => k.alim)) {
      m.circuitos.push({ n: x.id, descricao: `Alimentador ${x.id}`, tipo: 'alimentador', ligacao: 'FFFN', fases: 'ABC', potencia_w: null, fp: null, ib_a: r2(x.projeto.ib), disjuntor_a: x.alim.disjuntor, curva: 'C', icu_ka: null, dr: '', dr_grupo: '', dr_ma: 30, secao_mm2: x.alim.secao, local_dr: false });
    }
  }
  if (meus.length) m.automacao = { ...m.automacao, ativo: false };
  return { dados: m, origem: `elétrica industrial, quadro ${id}: ${meus.length} motores, ${m.circuitos.length} circuitos` };
}

module.exports = { deEletrica, deIndustrial };
