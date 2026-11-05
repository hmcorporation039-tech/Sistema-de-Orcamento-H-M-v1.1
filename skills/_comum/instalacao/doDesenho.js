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
// Com os QUADROS LIDOS do próprio projeto (diagrama unifilar / quadro de cargas: ../cad/quadrosDoDiagrama.js —
// pedido de 04/11/2026) o quadro desenhado na planta (a tag escrita junto dele, "QDFL-7") fica com os
// circuitos ORIGINAIS: número, descrição, disjuntor, seção, potência e DR do projeto. O ponto vai ao
// circuito pelo número escrito junto dele; sem número, pela descrição do circuito (a do ambiente:
// "ILUM. RECEPÇÃO" para a luminária da recepção) ou pelo único circuito daquele tipo no quadro; só o que
// não casar fica no circuito estimado. Planta com um quadro desenhado sem tag e um só quadro lido: é ele.
//
// itens: [{ simbolo, forma, disciplina, ambiente (índice ou -1), nomeAmbiente, x, y, id, circuito, comando, tag? }]
// opcoes: { quadros: lidos do diagrama }
// Devolve { instalacao, ids: [id de cada item ('' = não faz parte)], resumo } ou null (nada elétrico no desenho).
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

const normTag = (t) => String(t || '').toUpperCase().replace(/\s+/g, '').replace(/\./g, '-');
const normTexto = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
// palavras que identificam o circuito pelo ambiente ("RECEPÇÃO", "VEST FEM", "QUADRA 1"): as de 3+ letras pelo
// radical (6 letras, sem o plural: "ESTACIONAMENTO" casa com o "ESTACIOMENTO" escrito no diagrama) e os números
const VAZIAS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'AMBIENTE', 'SALA']);
const radical = (p) => (/^\d+$/.test(p) ? p : p.replace(/S$/, '').slice(0, 6));
const palavras = (s) => normTexto(s).split(' ').filter(p => (/^\d+$/.test(p) || p.length >= 3) && !VAZIAS.has(p)).map(radical);
// ambiente sem nome no desenho não identifica nada
const GENERICO = /^(Ambiente \d+|Área externa)$/;
// palavras em comum — ao menos uma com letras ("12" sozinho não identifica o circuito)
const comuns = (a, b) => { const B = new Set(b); const c = a.filter(p => B.has(p)); return c.some(p => !/^\d+$/.test(p)) ? c.length : 0; };
const TIPO_DO_PONTO = { luminaria: ['iluminacao'], ponto_luz: ['iluminacao'], tomada: ['tug'], tue: ['tue', 'ar_condicionado', 'motor'] };
// o de maior pontuação, se for o único com ela
const melhorUnico = (pares) => {
  const v = pares.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return v.length && (v.length === 1 || v[0][1] > v[1][1]) ? v[0][0] : null;
};

function instalacaoDoDesenho(itens, opcoes = {}) {
  const lista = (itens || []).map((it, k) => ({ ...it, k, tipo: tipoDoItem(it) })).filter(x => x.tipo);
  if (!lista.some(x => x.tipo !== 'quadro')) return null;
  const lidos = (opcoes.quadros || []).filter(q => q?.circuitos?.length);
  const usados = new Set((itens || []).map(it => String(it.id || '')).filter(Boolean));
  const n = {};
  const novoId = (prefixo) => { let id; do { n[prefixo] = (n[prefixo] || 0) + 1; id = `${prefixo}${n[prefixo]}`; } while (usados.has(id)); usados.add(id); return id; };
  const ids = (itens || []).map(() => '');
  for (const x of lista) { x.id = x.id ? String(x.id) : novoId(PREFIXO[x.tipo]); ids[x.k] = x.id; }

  const inst = I.novaInstalacao('desenho_estimado');
  inst.estimada = true;
  const quadrosDesenhados = lista.filter(x => x.tipo === 'quadro');
  // quadro lido do diagrama ↔ desenhado: pela tag escrita junto do símbolo; sem ela, pelo ambiente do quadro
  // ("QDFL-7 (ACADEMIA)" ↔ o quadro desenhado na ACADEMIA); um desenhado sem tag e um só lido → é ele
  const lidoPorTag = new Map(lidos.map(q => [normTag(q.tag), q]));
  const lidoDe = quadrosDesenhados.map(x => (x.tag ? lidoPorTag.get(normTag(x.tag)) || null : null));
  const ligado = new Set(lidoDe.filter(Boolean));
  quadrosDesenhados.forEach((x, i) => {
    if (lidoDe[i] || !x.nomeAmbiente || GENERICO.test(x.nomeAmbiente)) return;
    const pal = palavras(x.nomeAmbiente);
    const q = melhorUnico(lidos.filter(l => !ligado.has(l)).map(l => [l, comuns(pal, palavras(l.descricao))]));
    if (q) { lidoDe[i] = q; ligado.add(q); }
  });
  if (lidos.length === 1 && quadrosDesenhados.length === 1 && !lidoDe[0] && !quadrosDesenhados[0].tag) { lidoDe[0] = lidos[0]; ligado.add(lidos[0]); }
  const tags = new Set();
  const tagUnica = (t) => { let s = t, i = 1; while (tags.has(s)) s = `${t}-${++i}`; tags.add(s); return s; };
  const quadros = quadrosDesenhados.map((x, i) => ({ tag: tagUnica(lidoDe[i]?.tag || (x.tag ? normTag(x.tag) : quadrosDesenhados.length > 1 ? `QD-${i + 1}` : 'QD')), ponto: x.id, x: x.x, y: x.y, local: x.nomeAmbiente || null, lido: lidoDe[i] }));
  // sem quadro desenhado e um só lido: é o quadro desta planta (sem posição)
  if (!quadros.length && lidos.length === 1) { quadros.push({ tag: tagUnica(normTag(lidos[0].tag)), ponto: null, x: null, y: null, local: null, lido: lidos[0] }); ligado.add(lidos[0]); }
  if (!quadros.length) quadros.push({ tag: tagUnica('QD'), ponto: null, x: null, y: null, local: null, lido: null });
  // quadros lidos que não estão desenhados nesta planta: entram (sem posição) só se algum ponto daqui for de um
  // circuito deles ("ILUM. ESTACIONAMENTO" para o poste do estacionamento)
  const base = [...quadros];
  for (const l of lidos) if (!ligado.has(l)) quadros.push({ tag: tagUnica(normTag(l.tag)), ponto: null, x: null, y: null, local: null, lido: l, extra: true });
  const comLido = quadros.filter(q => q.lido);
  const posicionados = comLido.filter(q => !q.extra);
  const maisPerto = (x) => {
    let m = base[0], dm = Infinity;
    for (const q of base) {
      if (!Number.isFinite(q.x)) continue;
      const d = Math.hypot(q.x - x.x, q.y - x.y);
      if (d < dm) { dm = d; m = q; }
    }
    return m;
  };
  const porTag = new Map(quadros.map(q => [q.tag, {
    tag: q.tag, descricao: q.lido ? q.lido.descricao || 'Quadro (circuitos do diagrama do projeto)' : 'Quadro (do desenho)', local: q.local, ponto: q.ponto,
    geral: q.lido?.geral ? { tag: 'QG', In: q.lido.geral.In ?? null, polos: q.lido.geral.polos ?? null, curva: null } : null, drs: [], disjuntores: [],
    ...(q.lido ? { origem: q.lido.origem } : {}),
  }]));

  // circuitos ORIGINAIS dos quadros lidos (todos, mesmo sem ponto nesta planta: o quadro mostra o que o projeto tem)
  const circuitos = new Map();
  const idLido = (q, numero) => (quadros.length > 1 ? `${q.tag}.${numero}` : String(numero));
  for (const q of comLido) {
    const Q = porTag.get(q.tag);
    for (const c of q.lido.circuitos) {
      const id = idLido(q, c.numero);
      if (circuitos.has(id)) continue;
      circuitos.set(id, {
        id, quadro: q.tag, disjuntor: `Q${c.numero}`, tipo: c.tipo || 'outro', descricao: c.descricao || `Circuito ${c.numero}`,
        potencia_va: c.potencia_va ?? null, potencia_w: c.potencia_w ?? null, secao_mm2: c.secao_mm2 ?? null, ligacao: null, fases: c.fases ?? null,
        dr: c.dr || null, ambientes: [], pontos: [], estimado: false, origem: 'diagrama',
      });
      Q.disjuntores.push({ tag: `Q${c.numero}`, circuito: id, polos: c.polos ?? null, In: c.In ?? null, curva: null });
    }
    Q.drs = (q.lido.drs || []).map(d => ({ tag: d.tag, In: d.In ?? null, idn_ma: d.idn_ma ?? null, polos: null, lido: true, circuitos: (d.circuitos || []).map(k => idLido(q, k)) }));
  }
  const resumo = { quadrosLidos: [], circuitosLidos: 0, porNumero: 0, porDescricao: 0, porTipo: 0, estimados: 0 };
  const perto = (lst, x) => {
    let m = lst[0], dm = Infinity;
    for (const q of lst) { if (!Number.isFinite(q.x)) continue; const d = Math.hypot(q.x - x.x, q.y - x.y); if (d < dm) { dm = d; m = q; } }
    return m;
  };
  const doQuadro = (q, num) => circuitos.get(idLido(q, num));
  // circuito lido para o ponto: pelo número escrito junto dele (no quadro desenhado mais perto que tem esse
  // número num circuito do mesmo tipo), pela descrição (palavras do ambiente na descrição de um circuito do
  // mesmo tipo) ou o único circuito do tipo no quadro desenhado mais perto
  const circuitoLido = (x) => {
    if (!comLido.length) return null;
    const tipos = TIPO_DO_PONTO[x.tipo] || [];
    if (x.circuito) {
      const num = String(x.circuito).toUpperCase().replace(/^0+(?=\d)/, '');
      const com = posicionados.filter(q => q.lido.circuitos.some(c => c.numero === num && (tipos.includes(c.tipo) || c.tipo === 'outro')));
      if (com.length) { resumo.porNumero++; return doQuadro(perto(com, x), num); }
      return null;
    }
    const nome = x.nomeAmbiente || '';
    if (nome && !GENERICO.test(nome)) {
      const pal = palavras(nome);
      const c = melhorUnico([...circuitos.values()].filter(c => tipos.includes(c.tipo)).map(c => [c, comuns(pal, palavras(c.descricao))]));
      if (c) { resumo.porDescricao++; return c; }
    }
    // o único circuito do tipo: só no quadro desenhado do mesmo ambiente do ponto, ou no mais perto quando ele
    // está a menos da metade da distância do 2º (luz da marquise entre vários quadros não vai para nenhum)
    const q = maisPerto(x);
    if (!q?.lido) return null;
    if (q.local !== x.nomeAmbiente) {
      const ds = base.filter(b => Number.isFinite(b.x)).map(b => Math.hypot(b.x - x.x, b.y - x.y)).sort((a, b) => a - b);
      if (ds.length > 1 && ds[0] > 0.5 * ds[1]) return null;
    }
    const doTipo = [...circuitos.values()].filter(c => c.quadro === q.tag && tipos.includes(c.tipo));
    if (doTipo.length === 1) { resumo.porTipo++; return doTipo[0]; }
    return null;
  };

  // circuitos: o do desenho (com o quadro na frente quando há mais de um) ou o estimado por ambiente
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
    let c = circuitoLido(x);
    if (c) {
      if (!c.ambientes.includes(nomeAmb(x))) c.ambientes.push(nomeAmb(x));
    } else if (x.circuito) {
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
  // quadro lido que não está desenhado aqui e não ficou com nenhum ponto: fora desta planta
  const usadosQ = new Set([...circuitos.values()].filter(c => c.pontos.length).map(c => c.quadro));
  const fica = new Set(quadros.filter(q => !q.extra || usadosQ.has(q.tag)).map(q => q.tag));
  inst.quadros.push(...[...porTag.values()].filter(q => fica.has(q.tag)));
  inst.circuitos.push(...[...circuitos.values()].filter(c => fica.has(c.quadro)));
  resumo.quadrosLidos = quadros.filter(q => q.lido && fica.has(q.tag)).map(q => q.tag);
  resumo.circuitosLidos = inst.circuitos.filter(c => c.origem === 'diagrama').length;
  resumo.estimados = inst.pontos.filter(p => circuitos.get(p.circuito)?.estimado).length;
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
  return { instalacao: inst, ids, resumo };
}

module.exports = { instalacaoDoDesenho, tipoDoItem };
