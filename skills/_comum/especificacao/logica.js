// AVALIADOR PURO da lógica de comando por relés (escada / ladder), gerada pelos blocos de
// função (./comando.js). O modelo é DADO (relés, seletoras, botões, entradas externas,
// equipamentos de campo, barras e degraus); aqui só se avalia: varredura até estabilizar,
// como um CLP lendo a escada — cada degrau usa o estado da varredura anterior; repete até
// nada mudar (ou acusa oscilação). Temporizadores (TON) contam o tempo entre passos.
//
// JS puro, sem DOM e sem dependências: roda no Node (testes, documentos) e no visualizador 3D
// (bundle esbuild), que só precisa trocar as entradas e repintar as saídas.
//
// Expressão: { s: [...] } série (E) | { p: [...] } paralelo (OU) | { x: 'SINAL', neg?: true }
// Sinais: bobina de relé ('KB1'), posição de seletora ('S1=MAN'), botão ('S0' = acionado),
// entrada externa ('CH01.DO3'), saída de equipamento de campo ('U1.RUN'), barra ('L+E'),
// falha simulada ('U1.falha'), supervisor ('RFF' = fase OK), 'energia'.
//
// modelo = {
//   entradas: [{ id, tipo: 'seletora'|'botao'|'emergencia'|'externo'|'falha'|'supervisor'|'energia'|'fusivel', padrao, posicoes? }],
//   barras:   [{ tag, expr }],                         // L+, LV+, FN… e as derivadas (L+E)
//   degraus:  [{ id, barra, expr, saida }],            // saida: relé, sinaleiro, carga, entrada de equipamento
//   temporizadores: [{ tag, preset_s }],               // a bobina é a saída de um degrau; o contato é '<tag>'
//   equipamentos: [{ tag, saidas: { NOME: expr } }],   // inversor: RUN = DI1 ∧ ¬falha …
//   saidasCampo:  [{ tag, expr }],                     // contatos secos enviados ao campo (X2/X3)
// }

const MAX_VARREDURAS = 60;

function valor(expr, sinais) {
  if (!expr) return true;
  if (Array.isArray(expr)) return expr.every(e => valor(e, sinais));
  if (expr.s) return expr.s.every(e => valor(e, sinais));
  if (expr.p) return expr.p.length ? expr.p.some(e => valor(e, sinais)) : false;
  if (expr.x != null) {
    const v = !!sinais[expr.x];
    return expr.neg ? !v : v;
  }
  return true;
}

// Entradas iniciais: posição padrão das seletoras, botões soltos, externos inativos, sem falha,
// supervisor OK, energia e fusíveis OK
function entradasPadrao(modelo) {
  const e = {};
  for (const i of modelo.entradas || []) {
    if (i.tipo === 'seletora') e[i.id] = i.padrao ?? i.posicoes?.[0];
    else if (['supervisor', 'energia', 'fusivel'].includes(i.tipo)) e[i.id] = i.padrao ?? true;
    else e[i.id] = i.padrao ?? false;
  }
  return e;
}

// sinais derivados das entradas (seletora → 'S1=MAN')
function sinaisDasEntradas(modelo, entradas) {
  const s = {};
  for (const i of modelo.entradas || []) {
    const v = entradas[i.id];
    if (i.tipo === 'seletora') for (const p of i.posicoes || []) s[`${i.id}=${p}`] = v === p;
    else s[i.id] = !!v;
  }
  return s;
}

// Uma avaliação completa (estável). anterior: { saidas, tempos } do passo anterior (temporizadores e selos)
function avaliar(modelo, entradasParciais = {}, anterior = null, dt = 0) {
  const entradas = { ...entradasPadrao(modelo), ...entradasParciais };
  const base = sinaisDasEntradas(modelo, entradas);
  const tempos = { ...(anterior?.tempos || {}) };
  let saidas = { ...(anterior?.saidas || {}) };
  const timers = new Map((modelo.temporizadores || []).map(t => [t.tag, t]));
  // o tempo do passo conta para os temporizadores cuja bobina já estava energizada
  for (const [tag] of timers) {
    if (saidas[`${tag}.bobina`]) tempos[tag] = (tempos[tag] || 0) + dt; else tempos[tag] = 0;
  }
  let estavel = false;
  let varreduras = 0;
  const historico = [];
  for (; varreduras < MAX_VARREDURAS; varreduras++) {
    const sinais = { ...base, ...saidas };
    for (const [tag, t] of timers) sinais[tag] = !!saidas[`${tag}.bobina`] && (tempos[tag] || 0) >= t.preset_s;
    const novo = {};
    for (const b of modelo.barras || []) { novo[b.tag] = valor(b.expr, sinais); sinais[b.tag] = novo[b.tag]; }
    for (const d of modelo.degraus || []) {
      const on = !!sinais[d.barra] && valor(d.expr, sinais);
      const chave = timers.has(d.saida) ? `${d.saida}.bobina` : d.saida;
      novo[chave] = novo[chave] || on;
    }
    for (const eq of modelo.equipamentos || []) for (const [k, ex] of Object.entries(eq.saidas || {})) novo[`${eq.tag}.${k}`] = valor(ex, sinais);
    for (const sc of modelo.saidasCampo || []) novo[sc.tag] = valor(sc.expr, sinais);
    for (const [tag] of timers) {
      if (!novo[`${tag}.bobina`]) tempos[tag] = 0;
      novo[tag] = !!novo[`${tag}.bobina`] && (tempos[tag] || 0) >= timers.get(tag).preset_s;
    }
    const mudou = Object.keys({ ...novo, ...saidas }).some(k => !!novo[k] !== !!saidas[k]);
    saidas = novo;
    if (!mudou) { estavel = true; break; }
    const assinatura = JSON.stringify(Object.keys(novo).sort().map(k => (novo[k] ? 1 : 0)));
    if (historico.includes(assinatura)) break; // oscilação
    historico.push(assinatura);
  }
  return { entradas, saidas, tempos, estavel, varreduras: varreduras + 1 };
}

// Sequência no tempo: [{ entradas?, aguardar_s? }] → estados depois de cada passo
function simularSequencia(modelo, passos) {
  let estado = null;
  let entradas = {};
  const out = [];
  for (const p of passos) {
    entradas = { ...entradas, ...(p.entradas || {}) };
    estado = avaliar(modelo, entradas, estado, 0);
    if (p.aguardar_s) { estado = avaliar(modelo, entradas, estado, p.aguardar_s); estado = avaliar(modelo, entradas, estado, 0); }
    out.push(estado);
  }
  return out;
}

// Roda os cenários de verificação funcional (gerados pelos blocos):
//   [{ nome, passos: [{ entradas, aguardar_s }], espera: { SINAL: bool } }] → [{ nome, ok, falhas }]
function verificarCenarios(modelo, cenarios) {
  return (cenarios || []).map(c => {
    const passos = c.passos || [{ entradas: c.entradas || {} }];
    const r = simularSequencia(modelo, passos);
    const fim = r[r.length - 1];
    const atual = (k) => !!(k in fim.saidas ? fim.saidas[k] : fim.entradas[k]);
    const falhas = Object.entries(c.espera || {}).filter(([k, v]) => atual(k) !== !!v)
      .map(([k, v]) => `${k}: esperado ${v ? 'ligado' : 'desligado'}, simulado ${atual(k) ? 'ligado' : 'desligado'}`);
    if (!fim.estavel) falhas.push('a lógica não estabilizou (oscilação)');
    return { nome: c.nome, origem: c.origem || null, ok: !falhas.length, falhas, entradas: fim.entradas };
  });
}

// ── Formato de INTERAÇÃO (3D interativo e tela) ─────────────────────────────
// Cada entrada vira um "equipamento operável" com estados e ações (o mesmo vocabulário do
// motor de interação de skills/_comum/instalacao/interacao.js); cada saída vira um indicador.
// O visualizador guarda o estado de cada controle, chama entradasDaInteracao() e avaliar(),
// e pinta os indicadores pelo resultado (saidas).
function paraInteracao(modelo, rotulos = {}) {
  const controles = (modelo.entradas || []).map(i => {
    const r = rotulos[i.id] || i.rotulo || i.id;
    if (i.tipo === 'seletora') {
      return { id: i.id, tipo: 'seletora', rotulo: r, estados: i.posicoes, inicial: i.padrao ?? i.posicoes[0], local: i.local || 'porta',
        acoes: i.posicoes.map(p => ({ id: `pos_${p}`, rotulo: `Girar para ${p}`, para: p })) };
    }
    if (i.tipo === 'emergencia') {
      return { id: i.id, tipo: 'emergencia', rotulo: r, estados: ['solto', 'acionado'], inicial: 'solto', local: 'porta',
        acoes: [{ id: 'acionar', rotulo: 'Acionar a emergência (cogumelo)', de: ['solto'], para: 'acionado' }, { id: 'rearmar', rotulo: 'Girar para soltar (rearme)', de: ['acionado'], para: 'solto' }] };
    }
    if (i.tipo === 'botao') {
      return { id: i.id, tipo: 'botao', rotulo: r, estados: ['solto', 'pressionado'], inicial: 'solto', local: 'porta',
        acoes: [{ id: 'pressionar', rotulo: 'Pressionar', de: ['solto'], para: 'pressionado' }, { id: 'soltar', rotulo: 'Soltar', de: ['pressionado'], para: 'solto' }] };
    }
    if (['falha', 'supervisor', 'fusivel', 'energia'].includes(i.tipo)) {
      const normal = i.tipo === 'falha' ? 'normal' : 'ok';
      const ruim = i.tipo === 'falha' ? 'em falha' : i.tipo === 'supervisor' ? 'falta de fase' : i.tipo === 'fusivel' ? 'fusível aberto' : 'sem energia';
      return { id: i.id, tipo: i.tipo, rotulo: r, estados: [normal, ruim], inicial: normal, local: i.local || 'quadro',
        acoes: [{ id: 'simular', rotulo: `Simular ${ruim}`, de: [normal], para: ruim }, { id: 'normalizar', rotulo: 'Normalizar', de: [ruim], para: normal }] };
    }
    return { id: i.id, tipo: 'externo', rotulo: r, estados: ['inativo', 'ativo'], inicial: 'inativo', local: 'campo',
      acoes: [{ id: 'ativar', rotulo: `Ativar: ${r}`, de: ['inativo'], para: 'ativo' }, { id: 'desativar', rotulo: `Desativar: ${r}`, de: ['ativo'], para: 'inativo' }] };
  });
  const indicadores = [
    ...(modelo.degraus || []).map(d => d.saida),
    ...(modelo.equipamentos || []).flatMap(e => Object.keys(e.saidas || {}).map(k => `${e.tag}.${k}`)),
    ...(modelo.saidasCampo || []).map(s => s.tag),
    ...(modelo.barras || []).map(b => b.tag),
  ].filter((v, i, a) => a.indexOf(v) === i).map(id => ({ id, rotulo: rotulos[id] || (modelo.rotulos || {})[id] || id, tipo: (modelo.tipos || {})[id] || 'sinal' }));
  return { versao: 1, controles, indicadores };
}

// estados dos controles da interação → entradas do avaliador
function entradasDaInteracao(modelo, estados = {}) {
  const e = {};
  for (const i of modelo.entradas || []) {
    const s = estados[i.id];
    if (s == null) continue;
    if (i.tipo === 'seletora') e[i.id] = s;
    else if (i.tipo === 'emergencia') e[i.id] = s === 'acionado';
    else if (i.tipo === 'botao') e[i.id] = s === 'pressionado';
    else if (i.tipo === 'falha') e[i.id] = s === 'em falha';
    else if (['supervisor', 'fusivel', 'energia'].includes(i.tipo)) e[i.id] = s === 'ok';
    else e[i.id] = s === 'ativo';
  }
  return e;
}

module.exports = { avaliar, simularSequencia, verificarCenarios, entradasPadrao, paraInteracao, entradasDaInteracao, valor };
