// Instalação ESTIMADA a partir do desenho (revisão de 04/11/2026 — pedido do usuário: "os quadros, interruptores e
// outros componentes da visualização não têm interação"). O 3D interativo (./simulador.js) só ligava com o modelo
// único que as skills de elétrica/iluminação calculam (./index.js); o 3D de uma ANÁLISE de DWG/PDF não tem esse
// modelo, e o quadro, o interruptor e a luminária ficavam parados. Aqui o modelo sai dos próprios componentes do
// desenho, sem inventar valor de projeto:
//   - quadro: cada quadro desenhado (QD-1, QD-2…); sem nenhum, um "QD" sem posição;
//   - circuito: o número escrito junto do ponto (lido do desenho, ../cad/circuitoDoDesenho.js), no quadro mais perto;
//     sem número, um circuito de iluminação e um de tomadas por ambiente e um por TUE (a divisão usual, marcada
//     como estimada). Disjuntor sem corrente nominal (In null: o 3D mostra "—"), carga null;
//   - comando: o retorno escrito no desenho ("3a"); sem ele, os interruptores do ambiente comandam as luminárias
//     do ambiente (1 → simples, 2 → paralelo, 3+ → intermediário: ./index.js, comandoDeInterruptores); sem
//     interruptor e com sensor de presença, o sensor.
// É só para a simulação do 3D (o que acende com o quê): não entra em orçamento nem em memorial. origem
// 'desenho_estimado' + estimada: true → o 3D avisa que é estimativa a conferir.
//
// itens: [{ simbolo, forma, disciplina, ambiente (índice ou -1), nomeAmbiente, x, y, id, circuito, comando }]
// Devolve { instalacao, ids: [id de cada item ('' = não faz parte)] } ou null (nada elétrico no desenho).
const I = require('./index');

const DISCIPLINAS_ELETRICAS = new Set(['eletrica', 'iluminacao', 'iluminacao-externa']);
function tipoDoItem(it) {
  if (!DISCIPLINAS_ELETRICAS.has(it.disciplina)) return null;
  if (it.forma === 'quadro') return 'quadro';
  if (it.forma === 'luminaria' || it.forma === 'poste') return 'luminaria';
  if (it.forma === 'ponto-luz') return 'ponto_luz';
  if (it.forma === 'tomada') return /TUE/.test(it.simbolo || '') ? 'tue' : 'tomada';
  if (it.forma === 'interruptor') return 'interruptor';
  if (it.forma === 'sensor') return 'sensor';
  return null;
}
const PREFIXO = { quadro: 'QD-', luminaria: 'L', ponto_luz: 'L', tomada: 'T', tue: 'E', interruptor: 'S', sensor: 'SP' };
const LUZ = new Set(['luminaria', 'ponto_luz']);

function instalacaoDoDesenho(itens) {
  const lista = (itens || []).map((it, k) => ({ ...it, k, tipo: tipoDoItem(it) })).filter(x => x.tipo);
  if (!lista.some(x => x.tipo !== 'quadro')) return null;
  const usados = new Set((itens || []).map(it => String(it.id || '')).filter(Boolean));
  const n = {};
  const novoId = (prefixo) => { let id; do { n[prefixo] = (n[prefixo] || 0) + 1; id = `${prefixo}${n[prefixo]}`; } while (usados.has(id)); usados.add(id); return id; };
  const ids = (itens || []).map(() => '');
  for (const x of lista) { x.id = x.id ? String(x.id) : novoId(PREFIXO[x.tipo]); ids[x.k] = x.id; }

  const inst = I.novaInstalacao('desenho_estimado');
  inst.estimada = true;
  const quadrosDesenhados = lista.filter(x => x.tipo === 'quadro');
  const quadros = quadrosDesenhados.length
    ? quadrosDesenhados.map((x, i) => ({ tag: quadrosDesenhados.length > 1 ? `QD-${i + 1}` : 'QD', ponto: x.id, x: x.x, y: x.y, local: x.nomeAmbiente || null }))
    : [{ tag: 'QD', ponto: null, x: null, y: null, local: null }];
  const maisPerto = (x) => {
    let m = quadros[0], dm = Infinity;
    for (const q of quadros) {
      if (!Number.isFinite(q.x)) continue;
      const d = Math.hypot(q.x - x.x, q.y - x.y);
      if (d < dm) { dm = d; m = q; }
    }
    return m;
  };
  const porTag = new Map(quadros.map(q => [q.tag, { tag: q.tag, descricao: 'Quadro (do desenho)', local: q.local, ponto: q.ponto, geral: null, drs: [], disjuntores: [] }]));
  inst.quadros.push(...porTag.values());

  // circuitos: o do desenho (com o quadro na frente quando há mais de um) ou o estimado por ambiente
  const circuitos = new Map();
  const circuito = (id, quadro, tipo, descricao, ambiente) => {
    if (!circuitos.has(id)) {
      circuitos.set(id, { id, quadro, disjuntor: I.tagDisjuntor(id), tipo, descricao, potencia_va: null, ligacao: null, fases: null, dr: null, ambientes: [], pontos: [], estimado: true });
      porTag.get(quadro).disjuntores.push({ tag: I.tagDisjuntor(id), circuito: id, polos: null, In: null, curva: null });
    }
    const c = circuitos.get(id);
    if (ambiente && !c.ambientes.includes(ambiente)) c.ambientes.push(ambiente);
    return c;
  };
  const cargas = lista.filter(x => x.tipo !== 'quadro' && x.tipo !== 'interruptor' && x.tipo !== 'sensor');
  const nomeAmb = (x) => x.nomeAmbiente || (x.ambiente >= 0 ? `Ambiente ${x.ambiente + 1}` : 'Área externa');
  const chaveAmb = (x) => (x.ambiente >= 0 ? `a${x.ambiente}` : 'fora');
  let nIl = 0, nTug = 0;
  const ilPorAmb = new Map(), tugPorAmb = new Map();
  for (const x of cargas) {
    const q = maisPerto(x).tag;
    let c;
    if (x.circuito) {
      const id = quadros.length > 1 ? `${q}.${x.circuito}` : String(x.circuito);
      c = circuito(id, q, LUZ.has(x.tipo) ? 'iluminacao' : x.tipo === 'tue' ? 'tue' : 'tug', `Circuito ${x.circuito} (do desenho)`, nomeAmb(x));
    } else if (LUZ.has(x.tipo)) {
      const k = chaveAmb(x);
      if (!ilPorAmb.has(k)) ilPorAmb.set(k, `IL${++nIl}`);
      c = circuito(ilPorAmb.get(k), q, 'iluminacao', `Iluminação — ${nomeAmb(x)} (estimado)`, nomeAmb(x));
    } else if (x.tipo === 'tue') {
      c = circuito(`TUE${x.id.replace(/^E/, '')}`, q, 'tue', `TUE ${x.id} — ${nomeAmb(x)} (estimado)`, nomeAmb(x));
    } else {
      const k = chaveAmb(x);
      if (!tugPorAmb.has(k)) tugPorAmb.set(k, `TUG${++nTug}`);
      c = circuito(tugPorAmb.get(k), q, 'tug', `Tomadas — ${nomeAmb(x)} (estimado)`, nomeAmb(x));
    }
    c.pontos.push(x.id);
    inst.pontos.push({ id: x.id, tipo: x.tipo, simbolo: x.simbolo, ambiente: nomeAmb(x), circuito: c.id, comando: null, carga_va: null, posicao: null });
  }
  inst.circuitos.push(...circuitos.values());
  const pontoDe = new Map(inst.pontos.map(p => [p.id, p]));

  // comandos: o retorno do desenho ("3a") junta luzes e interruptores com o mesmo texto; o resto, por ambiente
  const dispositivos = lista.filter(x => x.tipo === 'interruptor' || x.tipo === 'sensor');
  const novoComando = (id, tipo, luzes, disps, ambiente) => {
    const circs = [...new Set(luzes.map(l => pontoDe.get(l.id).circuito))];
    inst.comandos.push({ id, tipo, ambiente, circuitos: circs, retorno: null, dispositivos: disps.map(d => d.id), pontos: luzes.map(l => l.id), estimado: true });
    for (const l of luzes) pontoDe.get(l.id).comando = id;
    // o interruptor é ponto do circuito das luzes que ele comanda (sem carga)
    disps.forEach((d, i) => {
      const tipoDisp = d.tipo === 'sensor' ? 'sensor' : (I.comandoDeInterruptores(disps.length).dispositivos[i] || 'interruptor_simples');
      const p = { id: d.id, tipo: tipoDisp, simbolo: d.simbolo, ambiente: nomeAmb(d), circuito: circs[0], comando: id, carga_va: 0, posicao: null };
      inst.pontos.push(p);
      pontoDe.set(p.id, p);
      const c = circuitos.get(circs[0]);
      if (c && !c.pontos.includes(d.id)) c.pontos.push(d.id);
    });
  };
  const luzes = cargas.filter(x => LUZ.has(x.tipo));
  const comRetorno = new Map();
  for (const x of [...luzes, ...dispositivos]) if (x.comando) (comRetorno.get(x.comando) || comRetorno.set(x.comando, []).get(x.comando)).push(x);
  const usadosNoComando = new Set();
  for (const [ret, membros] of comRetorno) {
    const ls = membros.filter(m => LUZ.has(m.tipo)), ds = membros.filter(m => !LUZ.has(m.tipo) && m.tipo === 'interruptor');
    if (!ls.length || !ds.length) continue;
    novoComando(`${ret}`, I.comandoDeInterruptores(ds.length).tipo, ls, ds, nomeAmb(ls[0]));
    membros.forEach(m => usadosNoComando.add(m.id));
  }
  const porAmb = new Map();
  for (const x of [...luzes, ...dispositivos]) {
    if (usadosNoComando.has(x.id) || x.ambiente < 0) continue;
    const k = chaveAmb(x);
    (porAmb.get(k) || porAmb.set(k, { luzes: [], interruptores: [], sensores: [] }).get(k))[LUZ.has(x.tipo) ? 'luzes' : x.tipo === 'sensor' ? 'sensores' : 'interruptores'].push(x);
  }
  let nCmd = 0;
  for (const g of porAmb.values()) {
    if (!g.luzes.length) continue;
    if (g.interruptores.length) novoComando(`C${++nCmd}`, I.comandoDeInterruptores(g.interruptores.length).tipo, g.luzes, g.interruptores, nomeAmb(g.luzes[0]));
    else if (g.sensores.length) novoComando(`C${++nCmd}`, 'sensor_presenca', g.luzes, g.sensores.slice(0, 1), nomeAmb(g.luzes[0]));
  }
  // interruptor/sensor que não comanda nada (sem luz no ambiente): fica fora da simulação
  for (const d of dispositivos) if (!pontoDe.has(d.id)) ids[d.k] = '';
  return { instalacao: inst, ids };
}

module.exports = { instalacaoDoDesenho, tipoDoItem };
