// Elétrica predial → modelo único da instalação (skills/_comum/instalacao).
// Quadro QD-01 com o geral (Q0), um disjuntor por circuito (Q + nº do circuito, a tag
// da skill quadros) e o DR de cada circuito; cada tomada, TUE, ponto de luz e
// interruptor da planta vira um ponto com o circuito que o alimenta e, na luz, o
// comando (circuito + letra do retorno: "1a"). Nos ambientes do luminotécnico, os
// pontos de luz são a grade calculada pela skill de iluminação, nos circuitos IL*.
// Os ids são os da planta (T1, E1, L1, S1, SP1 — ./plantasDisciplina.js usa estes).

const I = require('../../../_comum/instalacao');
const { pontosDoAmbiente, circuitoDoModelo, ligarPontosAosCircuitos } = require('../../../iluminacao/scripts/lib/instalacao');
const { normalizar } = require('./luminotecnico');

// pontos da planta elétrica nos ambientes do luminotécnico
const PERFIL_ELETRICA = {
  luminaria: { simbolo: 'HM-ELE-PONTO-LUZ', prefixo: 'L', tipo: 'ponto_luz' },
  sensor: { simbolo: 'HM-ILU-SENSOR', prefixo: 'SP' },
  comando: { simbolo: 'HM-ELE-INTERRUPTOR', prefixo: 'S' },
};
const r2 = (v) => Math.round(v * 100) / 100;

// pontos de luz sem luminotécnico: um a cada ~16 m², mínimo 1 por cômodo (9.5.2.1.1) — a planta usa o mesmo
const pontosLuzEstimados = (a) => Math.max(1, Math.round((Number(a.area_m2) || 0) / 16));

// circuitos de um tipo que atendem o ambiente: pela lista "ambientes" do circuito e,
// sem ela, pelo nome do ambiente na descrição (a regra antiga da planta)
function circuitosDoAmbiente(calc, tipo, nome) {
  const alvo = normalizar(nome);
  const doTipo = calc.circuitos.filter(x => x.tipo === tipo);
  const pelaLista = doTipo.filter(x => (x.ambientes || []).some(n => normalizar(n) === alvo));
  return pelaLista.length ? pelaLista : doTipo.filter(x => normalizar(`${(x.ambientes || []).join(' ')} ${x.descricao || ''}`).includes(alvo));
}
// k-ésimo de n pontos → circuito (vários circuitos do mesmo tipo no ambiente: em sequência)
const circuitoDoPonto = (lista, k, n) => (lista.length ? String(lista[Math.min(lista.length - 1, Math.floor((k * lista.length) / Math.max(1, n)))].id) : null);

// calc = resultado do motor NBR 5410; lum = prepararLuminotecnico(dados) ou null
function instalacaoDaEletrica(calc, { quadro: tag = 'QD-01', lum = null } = {}) {
  const inst = I.novaInstalacao(lum ? 'eletrica+iluminacao' : 'eletrica');
  const al = calc.alimentador;
  const q = {
    tag, descricao: 'Quadro de distribuição', local: calc.previsao[0]?.nome || null, ponto: null,
    geral: al ? { tag: 'Q0', In: al.disjuntor, polos: al.polos, curva: 'C' } : null,
    drs: [], disjuntores: [], carga_instalada_va: r2(calc.demanda.instaladaVa),
  };
  inst.quadros.push(q);
  for (const x of calc.circuitos) {
    const m = circuitoDoModelo(x, tag);
    if (x.origem === 'luminotecnico') m.circuito.origem = 'luminotecnico';
    inst.circuitos.push(m.circuito);
    q.disjuntores.push(m.disjuntor);
    if (m.dr) q.drs.push(m.dr);
  }

  const ctx = { ids: I.contadorDeIds(), retornos: I.contadorDeRetornos(), reles: I.contadorDeIds(), perfil: PERFIL_ELETRICA };
  const novo = (prefixo, simbolo, extra) => { const p = { id: ctx.ids(prefixo), simbolo, comando: null, posicao: null, ...extra }; inst.pontos.push(p); return p; };
  for (const a of calc.previsao) {
    // tomadas de uso geral: a potência do ambiente dividida entre as tomadas
    const tugs = circuitosDoAmbiente(calc, 'tug', a.nome);
    for (let k = 0; k < a.nTug; k++) novo('T', 'HM-ELE-TOMADA-BAIXA', { tipo: 'tomada', ambiente: a.nome, circuito: circuitoDoPonto(tugs, k, a.nTug), carga_va: r2(a.tugVa / a.nTug) });
    // TUE: um ponto por equipamento, no circuito exclusivo dele
    const tues = circuitosDoAmbiente(calc, 'tue', a.nome);
    (a.tues || []).forEach((t, k) => novo('E', 'HM-ELE-TUE', { tipo: 'tue', ambiente: a.nome, circuito: tues[k] ? String(tues[k].id) : null, carga_va: r2(Number(t.potencia_w) / (Number(t.fp) || 1)), descricao: t.descricao || null }));
    // iluminação: a grade do luminotécnico ou a estimativa por área
    const doLum = lum?.cobertos.get(a.nome);
    if (doLum) {
      const r = pontosDoAmbiente(doLum, ctx);
      r.pontos.forEach(p => { p.ambiente = a.nome; });
      inst.pontos.push(...r.pontos);
      if (r.comando) inst.comandos.push({ ...r.comando, ambiente: a.nome });
      continue;
    }
    const ilum = circuitosDoAmbiente(calc, 'iluminacao', a.nome);
    const nL = pontosLuzEstimados(a);
    const luzes = [];
    for (let k = 0; k < nL; k++) luzes.push(novo('L', 'HM-ELE-PONTO-LUZ', { tipo: 'ponto_luz', ambiente: a.nome, circuito: circuitoDoPonto(ilum, k, nL), carga_va: r2(a.iluminacao / nL) }));
    const c1 = luzes[0].circuito;
    const s = novo('S', 'HM-ELE-INTERRUPTOR', { tipo: 'interruptor_simples', ambiente: a.nome, circuito: c1, carga_va: 0 });
    if (c1) {
      const id = `${c1}${ctx.retornos(c1)}`;
      inst.comandos.push({ id, tipo: 'interruptor_simples', ambiente: a.nome, circuitos: [...new Set(luzes.map(l => l.circuito).filter(Boolean))], retorno: id.slice(c1.length), dispositivos: [s.id], pontos: luzes.map(l => l.id) });
      luzes.forEach(l => { l.comando = id; });
      s.comando = id;
    }
  }
  // o quadro na planta (1º ambiente): o id do símbolo fica no quadro, não é ponto de circuito
  if (calc.previsao.length) q.ponto = ctx.ids('QD');

  // quadro de cargas editado à mão: a potência de cada circuito dividida entre os pontos de
  // carga dele (o que vale é o quadro de cargas); os IL* do luminotécnico ficam com a carga calculada
  if (!calc.circuitosSugeridos) {
    for (const c of calc.circuitos) {
      if (c.origem === 'luminotecnico') continue;
      const cargas = inst.pontos.filter(p => p.circuito === String(c.id) && I.TIPOS_CARGA.has(p.tipo));
      cargas.forEach(p => { p.carga_va = r2(c.potencia_va / cargas.length); });
    }
  }
  return ligarPontosAosCircuitos(inst);
}

module.exports = { instalacaoDaEletrica, pontosLuzEstimados, circuitosDoAmbiente, PERFIL_ELETRICA };
