// Luminotécnico → modelo único da instalação (skills/_comum/instalacao): cada
// luminária, sensor e comando do cálculo vira um ponto com o circuito IL* que o
// alimenta e o comando que o liga. Os mesmos ids vão para a planta
// (skills/_comum/cad/plantasDisciplina.js) e para o 3D (achado SK-02).
// A elétrica predial usa estas funções para os ambientes cobertos pelo
// luminotécnico (SK-06): a planta elétrica sai com a grade calculada aqui.

const I = require('../../../_comum/instalacao');

// símbolo e prefixo de cada ponto, por planta
const PERFIL_ILUMINACAO = {
  luminaria: { simbolo: 'HM-ILU-LUMINARIA', prefixo: 'L', tipo: 'luminaria' },
  sensor: { simbolo: 'HM-ILU-SENSOR', prefixo: 'SP' },
  comando: { simbolo: 'HM-ILU-COMANDO', prefixo: 'CMD' },
};

// controle do ambiente → tipo do comando e do dispositivo na parede
const COMANDO_DO_CONTROLE = { dimmer: 'dimmer', dali: 'dali', cena: 'cena', '010': 'dimmer_010' };
const DISPOSITIVO_DO_CONTROLE = { dimmer: 'dimmer', dali: 'botoeira_dali', cena: 'teclado_cena', '010': 'controlador_010' };

// Dispositivos de parede do ambiente: quantos e de que tipo (a planta desenha
// max(1, comandos.total) — no ambiente só com sensor fica o interruptor de desligamento manual)
function dispositivosDeParede(a) {
  const n = Math.max(1, a.comandos?.total || 0);
  if (a.controle === 'interruptor' || a.controle === 'sensor') {
    if (a.controle === 'sensor' && !a.comandos?.interruptores) return { tipoBase: null, tipos: Array(n).fill('interruptor') };
    const c = I.comandoDeInterruptores(n, a.comandoTipo);
    return { tipoBase: c.tipo, tipos: c.dispositivos };
  }
  return { tipoBase: COMANDO_DO_CONTROLE[a.controle], tipos: Array(n).fill(DISPOSITIVO_DO_CONTROLE[a.controle] || 'interruptor') };
}

// Pontos e comando de UM ambiente do luminotécnico.
// ctx = { ids (I.contadorDeIds), retornos (I.contadorDeRetornos), reles (contador de tags de relé), perfil }
// → { pontos, comando, porSimbolo: { simbolo → [ids] } }
function pontosDoAmbiente(a, ctx) {
  const perfil = ctx.perfil || PERFIL_ILUMINACAO;
  const distrib = (a.distribuicao || []).length ? a.distribuicao : (a.circuitos || []).map(c => ({ circuito: c, luminarias: a.n, va: a.cargaVa }));
  const c1 = distrib[0]?.circuito || '';
  const comandoId = c1 ? `${c1}${ctx.retornos(c1)}` : '';
  const pontos = [];
  const porSimbolo = {};
  const novo = (perf, extra) => {
    const id = ctx.ids(perf.prefixo);
    (porSimbolo[perf.simbolo] || (porSimbolo[perf.simbolo] = [])).push(id);
    const p = { id, simbolo: perf.simbolo, ambiente: a.nome, comando: comandoId || null, posicao: null, ...extra };
    pontos.push(p);
    return p;
  };
  // luminárias: na ordem da grade, circuito a circuito (partes de um ambiente grande). Fase 5:
  // cada uma leva o código da luminária (fotometria do mapa de iluminância) e o grupo (cenas)
  const luminarias = [];
  let indice = 0;
  for (const d of distrib) {
    for (let k = 0; k < d.luminarias; k++, indice++) {
      const extra = { tipo: perfil.luminaria.tipo || 'luminaria', circuito: d.circuito, carga_va: Math.round((d.va / d.luminarias) * 100) / 100 };
      if (a.luminaria?.codigo) extra.luminaria = a.luminaria.codigo;
      if (a.grupoDe?.[indice]) extra.grupo = a.grupoDe[indice];
      luminarias.push(novo(perfil.luminaria, extra));
    }
  }
  const sensores = [];
  for (let k = 0; k < (a.sensores?.n || 0); k++) sensores.push(novo(perfil.sensor, { tipo: 'sensor', circuito: c1, carga_va: 0 }));
  const parede = dispositivosDeParede(a);
  const deParede = parede.tipos.map(t => novo(perfil.comando, { tipo: t, circuito: c1, carga_va: 0 }));
  let tipo = parede.tipoBase;
  if (a.presenca && (!tipo || tipo.startsWith('interruptor'))) tipo = 'sensor_presenca';
  let rele = null;
  if (tipo === 'pulsador_rele_impulso') rele = { tag: ctx.reles('KI'), tipo: 'impulso' };
  else if (tipo === 'contator_botoeira') rele = { tag: ctx.reles('K'), tipo: 'contator', selo: true };
  else if (a.comandos?.releAuxiliar) rele = { tag: ctx.reles('KA'), tipo: 'auxiliar' };
  const comando = comandoId ? {
    id: comandoId, tipo: tipo || 'interruptor_simples', ambiente: a.nome, circuitos: distrib.map(d => d.circuito), retorno: comandoId.slice(c1.length),
    dispositivos: [...sensores, ...deParede].map(p => p.id), pontos: luminarias.map(p => p.id), ...(rele ? { rele } : {}),
    // fase 5: cenas definidas no projeto (nome e nível de cada grupo, 0–1) — o simulador troca de cena
    ...(a.cenas?.length ? { grupos: (a.grupos || []).map(g => g.nome), cenas: a.cenas.map(c => ({ nome: c.nome, niveis: { ...c.niveis }, padrao: c.padrao || 0 })) } : {}),
  } : null;
  return { pontos, comando, porSimbolo };
}

// Circuito do cálculo (motor da elétrica) → circuito e disjuntor do modelo
function circuitoDoModelo(x, quadro) {
  // Ib, seção, queda e comprimento do cálculo: só para a ficha do circuito no 3D interativo
  // (fase 2 — o simulador não calcula corrente)
  const num = (v, c = 2) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Math.round(Number(v) * 10 ** c) / 10 ** c : undefined);
  const ficha = Object.fromEntries(Object.entries({ ib_a: num(x.ib), secao_mm2: num(x.secao), queda_pct: num(x.queda), comprimento_m: num(x.comprimento_m ?? x.comprimento, 1) }).filter(([, v]) => v !== undefined));
  return {
    circuito: { id: String(x.id), quadro, disjuntor: I.tagDisjuntor(x.id), tipo: x.tipo || 'iluminacao', descricao: x.descricao, potencia_va: x.potencia_va, ligacao: x.ligacao, fases: x.fases || null, dr: !!x.dr, ambientes: [...(x.ambientes || [])], pontos: [], ...ficha },
    disjuntor: { tag: I.tagDisjuntor(x.id), circuito: String(x.id), polos: x.polos, In: x.disjuntor, curva: 'C' },
    dr: x.dr ? { tag: I.tagDr(x.id), In: [25, 40, 63, 80, 100].find(v => v >= x.disjuntor) || 100, idn_ma: 30, polos: x.ligacao === 'FFF' ? 4 : 2, circuitos: [String(x.id)] } : null,
  };
}

// Liga cada ponto à lista de pontos do seu circuito (as duas pontas da ligação)
function ligarPontosAosCircuitos(inst) {
  const porId = new Map(inst.circuitos.map(c => [c.id, c]));
  for (const p of inst.pontos) porId.get(String(p.circuito))?.pontos.push(p.id);
  return inst;
}

// Dados do luminotécnico que o 3D usa no mapa de iluminância (fase 5), calculado no navegador
// pelo MESMO módulo ponto a ponto da skill (../../../_comum/fotometria/pontoAPonto.js):
// a fotometria compacta de cada luminária usada e, por ambiente, plano de trabalho, altura
// de montagem, FM e os requisitos. nomeDe: nome do ambiente no modelo (a elétrica usa o dela).
function luminotecnicoDoModelo(calc, nomeDe = (n) => n) {
  const fotometrias = {};
  for (const a of calc.ambientes) {
    const f = a.luminaria.fotometria;
    if (!f || fotometrias[a.luminaria.codigo]) continue;
    fotometrias[a.luminaria.codigo] = { fonte: f.fonte, nome: f.nome || '', C: f.C, G: f.G, I: f.I, fluxo_lm: f.fluxo_lm, ...(f.angulo_graus ? { angulo_graus: f.angulo_graus } : {}) };
  }
  const r2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : null);
  const ambientes = {};
  for (const a of calc.ambientes) {
    ambientes[nomeDe(a.nome)] = {
      luminaria: a.luminaria.codigo, plano_m: r2(a.plano), altura_montagem_m: r2(a.alturaMontagem), fm: r2(a.fm),
      em_exigida: a.emExigida, uo_min: a.uoMin ?? null, em_lumens: Math.round(a.emObtida),
      ...(a.pontoAPonto ? { ponto_a_ponto: { em: Math.round(a.pontoAPonto.em), emin: Math.round(a.pontoAPonto.emin), u0: r2(a.pontoAPonto.u0) } } : {}),
    };
  }
  return { fotometrias, ambientes };
}

// calc = resultado de ./calculo.js; opcoes.quadro = tag do quadro (padrão QD-01, o da elétrica)
function instalacaoDaIluminacao(calc, opcoes = {}) {
  const tag = opcoes.quadro || 'QD-01';
  const inst = I.novaInstalacao('iluminacao');
  const q = { tag, descricao: 'Quadro de distribuição — circuitos de iluminação', local: null, geral: null, drs: [], disjuntores: [], carga_instalada_va: 0 };
  inst.quadros.push(q);
  for (const x of calc.circuitos) {
    const m = circuitoDoModelo(x, tag);
    inst.circuitos.push(m.circuito);
    q.disjuntores.push(m.disjuntor);
    if (m.dr) q.drs.push(m.dr);
    q.carga_instalada_va += Number(x.potencia_va) || 0;
  }
  const ctx = { ids: I.contadorDeIds(), retornos: I.contadorDeRetornos(), reles: I.contadorDeIds(), perfil: PERFIL_ILUMINACAO };
  for (const a of calc.ambientes) {
    const r = pontosDoAmbiente(a, ctx);
    inst.pontos.push(...r.pontos);
    if (r.comando) inst.comandos.push(r.comando);
  }
  inst.luminotecnico = luminotecnicoDoModelo(calc);
  return ligarPontosAosCircuitos(inst);
}

module.exports = { luminotecnicoDoModelo, instalacaoDaIluminacao, pontosDoAmbiente, circuitoDoModelo, ligarPontosAosCircuitos, dispositivosDeParede, PERFIL_ILUMINACAO };
