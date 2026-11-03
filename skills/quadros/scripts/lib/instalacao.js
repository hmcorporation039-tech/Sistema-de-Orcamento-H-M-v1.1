// Quadro de fabricação → modelo único da instalação (skills/_comum/instalacao): o
// quadro com o geral (Q0), os DR (grupos DRn ou exclusivos DR-n), um disjuntor por
// circuito com a MESMA tag do caderno de fabricação (Q + nº do circuito) e as
// partidas de motor. Quando o quadro veio da elétrica predial ou do luminotécnico
// (scripts/importar.js), `dados.instalacao_origem` traz os pontos e comandos do
// projeto: eles entram ligados aos mesmos circuitos — o 3D do quadro e o da planta
// falam do mesmo disjuntor (fase 2: desligar Q3 apaga o circuito 3).

const I = require('../../../_comum/instalacao');

const TIPO_DO_CIRCUITO = (t) => (I.TIPOS_CIRCUITO.includes(t) ? t : 'outro');

function instalacaoDoQuadro(calc, dados = {}) {
  const c = calc.c;
  const inst = I.novaInstalacao('quadros');
  const geral = calc.geral;
  const q = {
    tag: c.tag, descricao: c.descricao || c.tipoRotulo || 'Quadro', local: dados.quadro?.local || null, ponto: null,
    geral: geral ? { tag: 'Q0', In: geral.In, polos: geral.polos, curva: geral.curva || null } : null,
    drs: [
      ...(c.drGeral ? [{ tag: 'DR0', In: geral?.In || null, idn_ma: c.drGeralMa, polos: c.nFases === 1 ? 2 : 4, circuitos: calc.circuitos.map(x => x.n) }] : []),
      ...calc.drs.map(g => ({ tag: g.id, In: g.In, idn_ma: g.idn, polos: g.polos, circuitos: [...g.circuitos] })),
      ...calc.circuitos.filter(x => x.dr === 'ddr').map(x => ({ tag: I.tagDisjuntor(x.n), In: x.disjuntor, idn_ma: x.drMa, polos: x.polos, circuitos: [x.n], ddr: true })),
    ],
    disjuntores: [], carga_instalada_va: 0,
  };
  inst.quadros.push(q);
  for (const x of calc.circuitos) {
    const va = x.potencia > 0 ? Math.round((x.potencia / (x.fp || 1)) * 100) / 100 : 0;
    inst.circuitos.push({
      id: x.n, quadro: c.tag, disjuntor: I.tagDisjuntor(x.n), tipo: TIPO_DO_CIRCUITO(x.tipo), descricao: x.descricao, potencia_va: va,
      ligacao: x.ligacao, fases: (x.fases || []).join(''), dr: !!x.dr, ambientes: [], pontos: [],
    });
    q.disjuntores.push({ tag: I.tagDisjuntor(x.n), circuito: x.n, polos: x.polos, In: x.disjuntor, curva: x.curva });
    q.carga_instalada_va += va;
  }
  // partida de motor: o "circuito" é o motor (tag M1…), protegido pelo Q1 do bloco de partida
  for (const m of calc.motores || []) {
    const qm = m.partidaInfo?.dispositivos?.find(d => d.ref === 'Q1');
    const tag = `${m.tag}-Q1`;
    const va = Math.round(((m.pKw * 1000) / ((m.eta || 1) * (m.fp || 1))) * 100) / 100;
    inst.circuitos.push({ id: m.tag, quadro: c.tag, disjuntor: tag, tipo: 'motor', descricao: `${m.descricao} — partida ${String(m.partidaRotulo || '').toLowerCase()}`, potencia_va: va, ligacao: 'FFF', fases: 'ABC', dr: false, ambientes: [], pontos: [] });
    q.disjuntores.push({ tag, circuito: m.tag, polos: 3, In: qm?.nominal_a || qm?.faixa?.[1] || null, curva: qm?.tipo === 'disjuntor_motor' ? 'motor' : null });
    q.carga_instalada_va += va;
  }
  q.carga_instalada_va = Math.round(q.carga_instalada_va * 100) / 100;

  // pontos e comandos do projeto de origem (elétrica/iluminação), nos circuitos deste quadro
  const origem = dados.instalacao_origem;
  if (origem?.pontos?.length) {
    const ids = new Set(inst.circuitos.map(x => String(x.id)));
    const porCircuito = new Map(inst.circuitos.map(x => [String(x.id), x]));
    const pontos = origem.pontos.filter(p => ids.has(String(p.circuito)));
    inst.pontos.push(...pontos.map(p => ({ ...p })));
    for (const p of inst.pontos) porCircuito.get(String(p.circuito)).pontos.push(p.id);
    const comPonto = new Set(inst.pontos.map(p => String(p.id)));
    inst.comandos.push(...(origem.comandos || []).filter(k => (k.pontos || []).some(id => comPonto.has(String(id))))
      .map(k => ({ ...k, pontos: k.pontos.filter(id => comPonto.has(String(id))), dispositivos: (k.dispositivos || []).filter(id => comPonto.has(String(id))) })));
    // a carga do ponto é a do projeto de origem; o quadro manda na potência do circuito —
    // se o circuito foi editado no quadro, a validação mostra a diferença
    if (origem.quadro_ponto) q.ponto = origem.quadro_ponto;
  }
  return inst;
}

module.exports = { instalacaoDoQuadro };
