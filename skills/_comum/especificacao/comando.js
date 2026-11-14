// COMPILADOR DOS BLOCOS DE COMANDO (./blocos-comando.json → modelo lógico + documentos).
// Recebe o contexto da solução (motores, equipamentos externos, válvulas, requisitos lidos,
// decisões aprendidas) e instancia os blocos que se aplicam: entradas (seletoras, botões,
// sinais de campo), relés, degraus da escada, equipamentos de campo e saídas de contato.
// Depois numera os contatos de cada relé (11-14, 21-24… NA; 11-12… NF) e os blocos de cada
// seletora (13-14, 23-24…), monta as conexões de campo para as réguas de bornes e roda os
// cenários de verificação de cada bloco no avaliador (./logica.js).
//
// O que é regra de engenharia fica no JSON (blocos, mapa de sinalização, cenários, textos);
// aqui só a mecânica de instanciar e numerar.

const BIBLIOTECA = require('./blocos-comando.json');
const L = require('./logica');

const clonar = (o) => JSON.parse(JSON.stringify(o));
const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');

// {a.b.c} → valor no escopo; ausente → ''
function resolver(caminho, escopo) {
  let v = escopo;
  for (const p of caminho.split('.')) { if (v == null) return ''; v = v[p]; }
  return v == null ? '' : v;
}
const subst = (s, escopo) => String(s).replace(/\{([A-Za-z_][\w.]*)\}/g, (_, c) => String(resolver(c, escopo)));

function condicao(c, ctx, ativos) {
  if (!c) return true;
  const lista = Array.isArray(c) ? c : [c];
  return lista.every(x => {
    if (!x) return true; // condição que virou vazia no placeholder = sem condição
    const neg = x.startsWith('!');
    const s = neg ? x.slice(1) : x;
    let ok;
    if (s.startsWith('req:')) ok = ctx.req.has(s.slice(4));
    else if (s.startsWith('bloco:')) ok = ativos ? ativos.has(s.slice(6)) : true;
    else if (s.startsWith('decisao:')) { const [k, v] = s.slice(8).split('='); ok = String(ctx.decisoes?.[k] ?? '') === v; }
    else if (/^(motores|externos|valvulas)(>=|==)\d+$/.test(s)) {
      const [, col, op, n] = /^(\w+)(>=|==)(\d+)$/.exec(s);
      ok = op === '>=' ? (ctx[col] || []).length >= Number(n) : (ctx[col] || []).length === Number(n);
    } else if (s === 'acionamento') ok = ctx.escopoItem ? !!ctx.escopoItem.acion : (ctx.motores || []).some(m => m.acion);
    else if (s === 'acion_cliente') ok = ctx.escopoItem ? !!ctx.escopoItem.acionCliente : (ctx.motores || []).some(m => m.acionCliente);
    else ok = !!ctx[s];
    return neg ? !ok : ok;
  });
}

// Instancia um objeto do bloco: substitui placeholders, aplica "se", expande p_de/s_de/combinar_de
function instanciar(obj, escopo, ctx, ativos) {
  if (Array.isArray(obj)) {
    return obj.map(o => instanciar(o, escopo, ctx, ativos)).filter(o => o !== undefined);
  }
  if (obj && typeof obj === 'object') {
    if (obj.se) {
      const se = Array.isArray(obj.se) ? obj.se.map(s => subst(s, escopo)) : subst(obj.se, escopo);
      if (!condicao(se, { ...ctx, escopoItem: ctx.escopoItem || escopo }, ativos)) return undefined;
    }
    const de = obj.p_de || obj.s_de || obj.combinar_de;
    if (de) {
      const itens = ctx[de] || [];
      const alias = { motores: 'm', externos: 'e', valvulas: 'v' }[de];
      const folhas = itens.map(it => instanciar(obj.leaf, { ...escopo, [alias]: it }, ctx, ativos)).filter(Boolean);
      const serie = obj.s_de || (obj.combinar_de && ctx.combinacao === 'todos');
      return serie ? { s: folhas } : { p: folhas };
    }
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'se') continue;
      const kk = subst(k, escopo);
      const vv = instanciar(v, escopo, ctx, ativos);
      if (kk === '' || vv === undefined) continue;
      out[kk] = vv;
    }
    if ('neg' in out && typeof out.neg === 'string') out.neg = out.neg === 'true';
    if (out.s) out.s = out.s.filter(Boolean);
    if (out.p) out.p = out.p.filter(Boolean);
    return out;
  }
  if (typeof obj === 'string') return subst(obj, escopo);
  return obj;
}

// troca os apelidos (SLIB → S3) nas expressões e cenários
function aplicarApelidos(obj, apelidos) {
  if (!Object.keys(apelidos).length) return obj;
  const troca = (s) => s.replace(/\b(SLIB|STIT)\b/g, (a) => apelidos[a] || a);
  const rec = (o) => {
    if (Array.isArray(o)) return o.map(rec);
    if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [troca(k), rec(v)]));
    return typeof o === 'string' ? troca(o) : o;
  };
  return rec(obj);
}

const folhasDe = (expr, out = []) => {
  if (!expr) return out;
  if (expr.s) expr.s.forEach(e => folhasDe(e, out));
  else if (expr.p) expr.p.forEach(e => folhasDe(e, out));
  else if (expr.x != null) out.push(expr);
  return out;
};

// ── Escopos (variáveis dos textos) ──────────────────────────────────────────

function variaveisGerais(ctx, ativos = new Set()) {
  const m = ctx.motores || [];
  const e = ctx.externos || [];
  const motor = ctx.rotuloMotor || 'motor';
  const vars = {
    SLIB: 'SLIB', STIT: 'STIT',
    motor, MOTOR: motor.toUpperCase(), motores: ctx.rotuloMotores || 'motores',
    externo: ctx.rotuloExterno || 'equipamento', externos: ctx.rotuloExternos || 'equipamentos', EXTERNOS: (ctx.rotuloExternos || 'equipamentos').toUpperCase(),
    m1: m[0] || {}, ultimo: m[m.length - 1] || {}, e1: e[0] || {}, ultimo_e: e[e.length - 1] || {},
    n_lib: m.length + 1, n_tit: m.length + (ctx.req.has('comando.liberacao') && e.length ? 2 : 1),
    combinacao: ctx.combinacao === 'todos' ? 'E' : 'OU', combinacao_texto: ctx.combinacao === 'todos' ? 'série (todos precisam pedir)' : 'paralelo (qualquer um pede)',
    barra_valvula: ctx.req.has('valvulas.independente_emergencia') ? 'LV+' : 'L+E',
    rff_texto: ctx.req.has('forca.rff') ? ' e o RFF (fases OK)' : '',
    remoto_pos: ctx.decisoes?.titular_automacao === 'REMOTO' ? 'REM' : (m[0] || {}).tag,
    barra_motor: ativos.has('emergencia_rele') ? 'L+E' : 'L+',
    sob_emergencia: ativos.has('emergencia_rele') ? ' (sob L+E)' : '',
    aut_texto: [ativos.has('pedido_externo') ? ' KP (pedido)' : '', ativos.has('partida_por_alarme') ? ' KA (alarme da central ou teste)' : ''].join(''),
    inibe_txt: ctx.req.has('comando.inibicao_fumaca') ? ' (inibido pela fumaça na casa de máquinas — a partida manual continua)' : '',
    teste_txt: ctx.req.has('comando.modo_teste') ? ' ou com a chave em TESTE' : '',
    tempo_reversao: 30,
    ...(ctx.variaveis || {}),
  };
  vars.tempo_reversao_mais = Number(vars.tempo_reversao) + 1;
  // sequência de chillers: anti-ciclagem do 2º estágio (s) — o perfil/especificação dá o valor
  if (vars.tempo_estagio == null || vars.tempo_estagio === '') vars.tempo_estagio = 180;
  vars.tempo_estagio_mais = Number(vars.tempo_estagio) + 1;
  return vars;
}

function escopoMotor(mt, ctx, geral, titular) {
  const n = ctx.motores.length;
  const primeiro = mt.i === 1;
  return {
    ...geral, ...mt, m: mt, i: mt.i, ROTULO: String(mt.rotulo || '').toUpperCase(),
    run: mt.acion ? `${mt.acion}.RUN` : `KM${mt.i}`, rev_neg: primeiro ? 'true' : 'false',
    reversao_texto: ctx.req.has('comando.reversao') && n === 2 ? (primeiro ? ' e sem reversão (KREV NF — líder)' : ' e só com a reversão (KREV NA — reserva)') : '',
    so_lider: primeiro ? '' : '!bloco:reversao_automatica', lider_txt: primeiro && ctx.req.has('comando.reversao') ? ' (líder)' : '',
    titular_neg: primeiro ? 'true' : 'false',
    titular_entradas: titular ? 'STIT' : '',
    titular_pos: titular ? (primeiro ? ctx.motores[0].tag : ctx.motores[n - 1].tag) : '',
    nao_titular_pos: titular ? (primeiro ? ctx.motores[n - 1].tag : ctx.motores[0].tag) : '',
    titular_texto: titular ? ` e só na titular (KT ${primeiro ? 'NF: titular = ' + ctx.motores[0].tag : 'NA: titular = ' + ctx.motores[n - 1].tag})` : '',
    // sequência de chillers (14/11/2026): a bomba i é a dedicada do chiller i (o "par"); o 1º chiller é o
    // líder com KL2 desligado (NF), o último com KL2 ligado (NA)
    par: (ctx.externos || [])[mt.i - 1] || {},
    lider_neg: primeiro ? 'true' : 'false',
    so_primeiro: primeiro ? '' : 'nunca', so_ultimo: mt.i === n ? '' : 'nunca',
  };
}

// ── Compilação ──────────────────────────────────────────────────────────────

function blocosAtivos(ids, ctx, biblio) {
  const porId = new Map(biblio.blocos.map(b => [b.id, b]));
  const candidatos = ids.map(id => porId.get(id)).filter(Boolean);
  // 1ª passada sem as condições "bloco:"; depois até estabilizar
  let ativos = new Set(candidatos.filter(b => condicao((b.se || []).filter(c => !c.startsWith('bloco:')), ctx, null) && listaOk(b, ctx)).map(b => b.id));
  for (let k = 0; k < 5; k++) {
    const novo = new Set([...ativos].filter(id => condicao(porId.get(id).se || [], ctx, ativos)));
    if (novo.size === ativos.size) break;
    ativos = novo;
  }
  return candidatos.filter(b => ativos.has(b.id));
}
const listaOk = (b, ctx) => !b.de_lista || (ctx.listas?.[b.de_lista] || []).length > 0;

function compilarComando(ctx, opcoes = {}) {
  const biblio = opcoes.biblioteca || BIBLIOTECA;
  ctx = { ...ctx, req: ctx.req instanceof Set ? ctx.req : new Set(ctx.req || []), motores: ctx.motores || [], externos: ctx.externos || [], valvulas: ctx.valvulas || [] };
  const ids = opcoes.usar || biblio.blocos.map(b => b.id);
  const blocos = blocosAtivos(ids, ctx, biblio);
  const ativos = new Set(blocos.map(b => b.id));
  const geral = variaveisGerais(ctx, ativos);
  const titular = ativos.has('titular_reserva');
  const avisos = [];

  const modelo = { entradas: [], barras: [], degraus: [], temporizadores: [], equipamentos: [], saidasCampo: [], rotulos: {}, tipos: {} };
  const reles = [];
  const conexoes = []; // { regua, rotulo, grupo }
  const cenarios = [];
  const logica = [];
  const notas = [];
  const apelidos = {};
  const usados = [];
  const portaEntradas = [];

  const addEntrada = (en, grupo) => {
    if (!en || modelo.entradas.some(x => x.id === en.id)) return;
    if (en.alias) apelidos[en.alias] = en.id;
    modelo.entradas.push({ id: en.id, tipo: en.tipo, rotulo: en.rotulo, posicoes: en.posicoes, padrao: en.padrao, local: en.porta ? 'porta' : en.tipo === 'externo' ? 'campo' : 'quadro' });
    modelo.rotulos[en.id] = en.rotulo;
    if (en.porta) portaEntradas.push({ ...en, grupo });
    if (en.campo) conexoes.push(...en.campo.rotulos.map(r => ({ regua: en.campo.regua, rotulo: r, grupo })));
  };

  for (const base of biblio.entradas_base) { const e = instanciar(base, geral, ctx, ativos); if (e) addEntrada(e, 'base'); }
  if (modelo.entradas.some(e => e.id === 'CMD.AUT')) avisos.push('Posição AUT sem fonte automática na especificação: previsto contato externo de comando automático na X3. [CONFERIR com o cliente]');
  for (const base of biblio.barras_base) { const b = instanciar(base, geral, ctx, ativos); if (b) { modelo.barras.push({ tag: b.tag, expr: b.expr }); modelo.rotulos[b.tag] = b.rotulo; } }

  for (const bloco0 of blocos) {
    let bloco = clonar(bloco0);
    // variante escolhida pelo engenheiro (decisão aprendida)
    for (const [chave, v] of Object.entries(bloco.variantes || {})) {
      const [k, val] = chave.split('=');
      if (String(ctx.decisoes?.[k] ?? '') === val) bloco = { ...bloco, ...v, variante: chave };
    }
    usados.push({ id: bloco.id, rotulo: bloco.rotulo, variante: bloco.variante || null });
    if (bloco.de_lista) { compilarLista(bloco, ctx, geral, modelo, reles, conexoes, biblio); logica.push(...(bloco.logica || [])); continue; }
    const itens = bloco.por ? ctx[bloco.por] : [null];
    for (const item of itens) {
      let escopo = geral;
      if (bloco.por === 'motores') escopo = escopoMotor(item, ctx, geral, titular);
      else if (bloco.por === 'valvulas') escopo = { ...geral, ...item, v: item, e: item.e || {}, i: item.i };
      else if (bloco.por === 'externos') escopo = { ...geral, ...item, e: item, i: item.i };
      const cx = { ...ctx, escopoItem: escopo };
      for (const en of bloco.entradas || []) {
        if (en.por) { for (const it of ctx[en.por]) addEntrada(instanciar(en, { ...escopo, e: it }, cx, ativos), bloco.id); continue; }
        addEntrada(instanciar(en, escopo, cx, ativos), bloco.id);
      }
      for (const en of bloco.entradasExtras || []) addEntrada(instanciar(en, escopo, cx, ativos), bloco.id);
      for (const r of instanciar(bloco.reles || [], escopo, cx, ativos)) {
        if (!reles.some(x => x.tag === r.tag)) { reles.push({ tag: r.tag, rotulo: r.rotulo, bloco: bloco.id, usos: [], ...(r.tipo ? { tipo: r.tipo } : {}) }); modelo.rotulos[r.tag] = r.rotulo; modelo.tipos[r.tag] = 'rele'; }
      }
      for (const d of instanciar(bloco.degraus || [], escopo, cx, ativos)) {
        modelo.degraus.push({ id: `D${modelo.degraus.length + 1}`, barra: d.barra, expr: d.expr, saida: d.saida, rotulo: d.rotulo, bloco: bloco.id });
        if (!modelo.rotulos[d.saida]) modelo.rotulos[d.saida] = d.rotulo;
        for (const f of folhasDe(d.expr)) if (f.campo) conexoes.push(...f.campo.rotulos.map(r => ({ regua: f.campo.regua, rotulo: r, grupo: bloco.id })));
      }
      for (const tm of instanciar(bloco.temporizadores || [], escopo, cx, ativos)) {
        if (modelo.temporizadores.some(x => x.tag === tm.tag)) continue;
        modelo.temporizadores.push({ tag: tm.tag, preset_s: Number(tm.preset_s) || 0 });
        reles.push({ tag: tm.tag, rotulo: tm.rotulo, bloco: bloco.id, tipo: 'temporizador', preset_s: Number(tm.preset_s) || 0, usos: [] });
        modelo.rotulos[tm.tag] = tm.rotulo; modelo.tipos[tm.tag] = 'temporizador';
      }
      for (const b of instanciar(bloco.barras || [], escopo, cx, ativos)) { modelo.barras.push({ tag: b.tag, expr: b.expr }); modelo.rotulos[b.tag] = b.rotulo; }
      for (const eq of instanciar(bloco.equipamentos || [], escopo, cx, ativos)) { if (!modelo.equipamentos.some(x => x.tag === eq.tag)) { modelo.equipamentos.push(eq); modelo.rotulos[eq.tag] = eq.rotulo; } }
      for (const sc0 of bloco.saidasCampo || []) {
        const lista = sc0.por || sc0.por_unico ? ctx[sc0.por || sc0.por_unico].map(it => instanciar(sc0, { ...escopo, e: it }, { ...cx }, ativos)) : [instanciar(sc0, escopo, cx, ativos)];
        for (const sc of lista.filter(Boolean)) {
          if (modelo.saidasCampo.some(x => x.tag === sc.tag)) continue;
          modelo.saidasCampo.push({ tag: sc.tag, expr: sc.expr, rotulo: sc.rotulo, bloco: bloco.id });
          modelo.rotulos[sc.tag] = sc.rotulo;
          if (sc.borne && sc.borne.rotulos) conexoes.push(...sc.borne.rotulos.map(r => ({ regua: sc.borne.regua, rotulo: r, grupo: bloco.id })));
        }
      }
      for (const b of instanciar(bloco.bornes || [], escopo, cx, ativos)) conexoes.push(...b.rotulos.map(r => ({ regua: b.regua, rotulo: r, grupo: bloco.id })));
      for (const c of instanciar(bloco.cenarios || [], escopo, cx, ativos)) {
        const entradas = Object.fromEntries(Object.entries(c.entradas || {}).filter(([k, v]) => k && v !== ''));
        const passos = c.aguardar_s ? [{ entradas }, { aguardar_s: Number(c.aguardar_s) }] : undefined;
        cenarios.push({ ...c, entradas, ...(passos ? { passos } : {}), bloco: bloco.id });
      }
      if (!bloco.por || item === itens[0] || bloco.por === 'motores') {
        for (const t of instanciar(bloco.logica || [], escopo, cx, ativos)) if (!logica.includes(t)) logica.push(t);
        for (const t of instanciar(bloco.notas || [], escopo, cx, ativos)) if (!notas.includes(t)) notas.push(t);
      }
    }
  }

  // apelidos (SLIB/STIT) → tags reais
  const ap = (o) => aplicarApelidos(o, apelidos);
  modelo.degraus = ap(modelo.degraus);
  modelo.barras = ap(modelo.barras);
  modelo.saidasCampo = ap(modelo.saidasCampo);
  const cens = ap(cenarios).map(c => ({ ...c, nome: c.nome }));
  const logicaFinal = logica.map(t => t.replace(/\{(SLIB|STIT)\}/g, (_, a) => apelidos[a] || a)).map(t => t.replace(/\b(SLIB|STIT)\b/g, (a) => apelidos[a] || a));

  // sinais sem origem (bloco que faltou): avisa e trata como desligado
  const conhecidos = new Set([
    ...modelo.entradas.map(e => e.id), ...modelo.entradas.filter(e => e.tipo === 'seletora').flatMap(e => e.posicoes.map(p => `${e.id}=${p}`)),
    ...modelo.barras.map(b => b.tag), ...modelo.degraus.map(d => d.saida), ...modelo.saidasCampo.map(s => s.tag),
    ...modelo.equipamentos.flatMap(e => Object.keys(e.saidas || {}).map(k => `${e.tag}.${k}`)),
  ]);
  for (const d of [...modelo.degraus, ...modelo.saidasCampo, ...modelo.barras]) {
    for (const f of folhasDe(d.expr)) if (!conhecidos.has(f.x)) avisos.push(`Sinal "${f.x}" usado em ${d.saida || d.tag} sem origem no comando gerado. [CONFERIR]`);
  }

  numerarContatos(modelo, reles, ctx.contatosPorRele || 4, avisos);
  const seletoras = numerarSeletoras(modelo, portaEntradas);
  const verificacao = L.verificarCenarios(modelo, cens);
  return {
    modelo, reles, seletoras, conexoes, cenarios: cens, verificacao, logica: logicaFinal, notas, avisos,
    blocos: usados, apelidos, porta: portaEntradas.map(p => ({ ...p, id: apelidos[p.alias] || p.id })),
    sinaleiros: modelo.degraus.filter(d => d.tipo === 'sinaleiro' || /^H\d+$/.test(d.saida)).map(d => ({ tag: d.saida, rotulo: d.rotulo, cor: d.cor, tensao: d.tensao, barra: d.barra })),
    interacao: L.paraInteracao(modelo),
  };
}

// Blocos "de lista": sinalização (um sinaleiro por item) e contatos livres (um par de bornes por item)
function compilarLista(bloco, ctx, geral, modelo, reles, conexoes, biblio) {
  const itens = ctx.listas?.[bloco.de_lista] || [];
  const mapa = typeof bloco.mapa === 'string' ? biblio.blocos.find(b => b.id === bloco.mapa).mapa : bloco.mapa;
  const existentes = new Set([...modelo.degraus.map(d => d.saida), ...reles.map(r => r.tag), ...modelo.entradas.map(e => e.id)]);
  let n = bloco.prefixo ? modelo.degraus.filter(d => new RegExp(`^${bloco.prefixo}\\d+$`).test(d.saida)).length : 0;
  let par = (conexoes.filter(c => c.regua === bloco.regua).length) + 1;
  for (const it of itens) {
    const texto = semAcento(it.texto || it).toLowerCase();
    const regra = mapa.find(r => r.termos.some(t => new RegExp(semAcento(t), 'i').test(texto)));
    if (!regra) { (ctx.avisosLista ||= []).push(`"${it.texto || it}": não há regra de estado para este item (${bloco.rotulo}). [CONFERIR]`); continue; }
    let x = regra.x;
    if (regra.por_motor) {
      const mt = (ctx.motores || []).find(m => new RegExp(`\\b${m.tag}\\b`, 'i').test(it.texto || it)) || null;
      if (!mt) continue;
      x = subst(x, { m: mt });
    }
    if (!regra.sem_rele && !existentes.has(x)) { (ctx.avisosLista ||= []).push(`"${it.texto || it}": ${x} não existe no comando gerado. [CONFERIR]`); continue; }
    if (bloco.prefixo) {
      const tag = `${bloco.prefixo}${++n}`;
      modelo.degraus.push({ id: `D${modelo.degraus.length + 1}`, barra: regra.barra || 'L+', expr: { x, neg: !!regra.neg, rotulo: x }, saida: tag, rotulo: it.texto || it, tipo: 'sinaleiro', cor: regra.cor, tensao: regra.tensao || ctx.tensaoComando || '24 Vcc', bloco: bloco.id });
      modelo.rotulos[tag] = it.texto || it;
      modelo.tipos[tag] = 'sinaleiro';
    } else {
      const tag = `${bloco.regua}:${par}-${par + 1}`;
      modelo.saidasCampo.push({ tag, expr: { x, neg: !!regra.neg }, rotulo: it.texto || it, bloco: bloco.id, livre: true });
      modelo.rotulos[tag] = it.texto || it;
      conexoes.push({ regua: bloco.regua, rotulo: `${it.texto || it} (${x})`, grupo: bloco.id }, { regua: bloco.regua, rotulo: `${it.texto || it} comum`, grupo: bloco.id });
      par += 2;
    }
  }
}

// Contatos dos relés: cada uso de um relé numa expressão é um contato (NA 11-14 / NF 11-12)
function numerarContatos(modelo, reles, porRele, avisos) {
  const porTag = new Map(reles.map(r => [r.tag, r]));
  const usar = (f, onde) => {
    const r = porTag.get(f.x);
    if (!r) return;
    const k = r.usos.length + 1;
    const n = f.neg ? `${k}1-${k}2` : `${k}1-${k}4`;
    r.usos.push({ contato: n, tipo: f.neg ? 'NF' : 'NA', uso: onde });
    f.contato = n;
    f.etiqueta = `${f.x} ${n}`;
  };
  for (const b of modelo.barras) for (const f of folhasDe(b.expr)) usar(f, modelo.rotulos[b.tag] || b.tag);
  for (const d of modelo.degraus) for (const f of folhasDe(d.expr)) usar(f, `${d.saida} — ${d.rotulo || ''}`.trim());
  for (const s of modelo.saidasCampo) for (const f of folhasDe(s.expr)) usar(f, s.rotulo || s.tag);
  for (const r of reles) {
    if (r.usos.length > porRele) avisos.push(`${r.tag} usa ${r.usos.length} contatos (> ${porRele}): prever relé auxiliar em paralelo ou bloco de contatos. [CONFERIR]`);
    r.reserva = Math.max(0, porRele - r.usos.length);
  }
}

// Blocos de contato das seletoras/botões: um bloco por uso (NA que fecha na posição)
function numerarSeletoras(modelo, porta) {
  const out = [];
  const usos = new Map();
  const visitar = (f, onde) => {
    const m = /^(.+)=(.+)$/.exec(f.x);
    const id = m ? m[1] : f.x;
    const en = modelo.entradas.find(e => e.id === id);
    if (!en || !['seletora', 'emergencia', 'botao', 'supervisor'].includes(en.tipo)) return;
    if (!usos.has(id)) usos.set(id, []);
    const lista = usos.get(id);
    const k = lista.length + 1;
    const n = en.tipo === 'supervisor' ? '11-14' : f.neg ? `${k}1-${k}2` : `${k}3-${k}4`;
    lista.push({ bloco: n, tipo: f.neg ? 'NF' : 'NA', fecha_em: m ? m[2] : (f.neg ? 'solto' : 'acionado'), uso: onde });
    f.contato = n;
    f.etiqueta = `${id}${m ? ` ${m[2]}` : ''} ${n}`;
  };
  for (const d of modelo.degraus) for (const f of folhasDe(d.expr)) visitar(f, `${d.saida} — ${d.rotulo || ''}`);
  for (const [id, lista] of usos) {
    const en = modelo.entradas.find(e => e.id === id);
    const p = porta.find(x => x.id === id || x.alias === id) || {};
    out.push({ tag: id, tipo: en.tipo, rotulo: en.rotulo, posicoes: en.posicoes || null, blocos: lista, descricao: p.descricao || '', material: p.material || null });
  }
  return out;
}

module.exports = { compilarComando, instanciar, condicao, folhasDe, BIBLIOTECA };
