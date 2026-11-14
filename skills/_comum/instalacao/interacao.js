// MOTOR GENÉRICO DE INTERAÇÃO (pedido do usuário em 09/11/2026: "continue com a interação,
// como acionar disjuntores, chaves e o que for preciso… isso deve ser replicado a todas as
// disciplinas"). O simulador da baixa tensão (./simulador.js) cuida de quadros, circuitos e
// comandos; este motor cuida de QUALQUER equipamento que declare como é operado:
// subestação (chave fusível, seccionadora, disjuntor de MT com relé 50/51, trafo, geral de
// BT, QGBT), central de incêndio (acionador → alarme → avisadores), alarme (armar/desarmar,
// zona violada → sirene), CFTV (switch PoE desligado → câmeras sem energia) e controle de
// acesso (botoeira/leitor → fechadura liberada; emergência libera todas).
//
// JS puro, sem DOM: testável no Node e o mesmo código no visualizador (bundle).
//
// ── Contrato `interacao` (no equipamento, no componente do projeto ou no perfil) ──
//   {
//     regra: 'fonte' | 'serie' | 'carga' | 'gatilho' | 'central',
//       fonte   — saída = estado em `conduz` (rede da distribuidora, switch PoE…)
//       serie   — saída = entradas com sinal ∧ estado em `conduz` (chave, disjuntor)
//       carga   — saída = entradas com sinal (trafo, QGBT, câmera, avisador)
//       gatilho — saída = estado em `ativos` (acionador, detector, sensor violado)
//       central — guarda o alarme: com alguma entrada ativa e o estado em central.de, passa a
//                 central.para; saída = estado em central.saidaEm (avisadores tocam)
//     estados: ['fechada', 'aberta', …], inicial,
//     conduz: [...], ativos: [...], entradas: [ids], combinar: 'todas' | 'alguma',
//     central: { de: [...], para, saidaEm: [...] },
//     acoes: [{ id, rotulo, de: [estados], para, efeitos: [{ eq, estado }], alvo: { eq, acao },
//               exige: [{ eq | eqs, estado: [...], nao: true, texto } | { entradasInativas: true, texto }],
//               avisoSe: [{ eq | eqs, estado: [...], texto }], texto }],
//     textos: { [estado]: 'texto' }, inferido: bool, nota: 'texto'
//   }
// `exige` RECUSA a manobra (texto didático da sequência correta); `avisoSe` deixa fazer e avisa.
// Os textos de manobra são didáticos (não substituem o procedimento de manobra nem a NR-10).

const S = (v) => String(v ?? '');

// ── Perfis por tipo de equipamento ──────────────────────────────────────────
// (o componente do projeto pode trazer o próprio `interacao` — vale sobre o perfil)
const AVISO_NR10 = 'Texto didático: siga o procedimento de manobra da instalação (NR-10).';
const PERFIS = {
  rede_mt: { regra: 'fonte', estados: ['com tensão', 'sem tensão'], inicial: 'com tensão', conduz: ['com tensão'],
    acoes: [{ id: 'falta', rotulo: 'Simular falta de energia da distribuidora', de: ['com tensão'], para: 'sem tensão' }, { id: 'volta', rotulo: 'Restabelecer a rede', de: ['sem tensão'], para: 'com tensão' }] },
  chave_fusivel: { regra: 'serie', estados: ['fechada', 'aberta', 'fusível queimado'], inicial: 'fechada', conduz: ['fechada'],
    acoes: [
      { id: 'abrir', rotulo: 'Abrir (vara de manobra)', de: ['fechada'], para: 'aberta', avisoSe: [{ tipos: ['disjuntor_mt'], estado: ['fechado'], texto: `Chave fusível aberta COM CARGA: exige a ferramenta de abertura em carga (load buster). O correto é abrir antes o disjuntor. ${AVISO_NR10}` }] },
      { id: 'fechar', rotulo: 'Fechar (vara de manobra)', de: ['aberta'], para: 'fechada' },
      { id: 'queimar', rotulo: 'Simular fusível queimado (elo fusível rompido)', de: ['fechada'], para: 'fusível queimado' },
      { id: 'trocar', rotulo: 'Trocar o elo fusível', de: ['fusível queimado'], para: 'aberta' },
    ] },
  chave_seccionadora: { regra: 'serie', estados: ['fechada', 'aberta'], inicial: 'fechada', conduz: ['fechada'],
    acoes: [
      { id: 'abrir', rotulo: 'Abrir a seccionadora', de: ['fechada'], para: 'aberta',
        exige: [{ tipos: ['disjuntor_mt'], estado: ['fechado'], nao: true, texto: `NUNCA abra a seccionadora sob carga: abra primeiro o disjuntor de MT. Sequência para desligar: 1) disjuntor geral de BT; 2) disjuntor de MT; 3) seccionadora. ${AVISO_NR10}` }] },
      { id: 'fechar', rotulo: 'Fechar a seccionadora', de: ['aberta'], para: 'fechada',
        exige: [{ tipos: ['disjuntor_mt'], estado: ['fechado'], nao: true, texto: `Feche a seccionadora com o disjuntor de MT ABERTO (ela não manobra carga). Sequência para ligar: 1) seccionadora; 2) disjuntor de MT; 3) disjuntor geral de BT. ${AVISO_NR10}` }] },
    ] },
  disjuntor_mt: { regra: 'serie', estados: ['fechado', 'aberto', 'disparado'], inicial: 'fechado', conduz: ['fechado'],
    textos: { disparado: 'disparado pelo relé 50/51 (trip)' },
    acoes: [
      { id: 'abrir', rotulo: 'Abrir o disjuntor de MT', de: ['fechado'], para: 'aberto', avisoSe: [{ tipos: ['disjuntor_bt'], estado: ['fechado'], texto: `Sequência recomendada para desligar: abra antes o disjuntor geral de BT (tira a carga), depois o de MT. ${AVISO_NR10}` }] },
      { id: 'fechar', rotulo: 'Fechar o disjuntor de MT', de: ['aberto'], para: 'fechado',
        exige: [{ tipos: ['rele'], estado: ['atuado'], nao: true, texto: 'O relé 50/51 está atuado: identifique a causa do disparo e rearme o relé antes de fechar o disjuntor.' }],
        avisoSe: [{ tipos: ['disjuntor_bt'], estado: ['fechado'], texto: `Sequência recomendada para ligar: feche o disjuntor de MT com o geral de BT ABERTO (o trafo energiza em vazio) e só então feche o de BT. ${AVISO_NR10}` }] },
      { id: 'disparar', rotulo: 'Simular trip (relé 50/51)', de: ['fechado'], para: 'disparado' },
      { id: 'rearmar', rotulo: 'Rearmar o disjuntor (fica aberto)', de: ['disparado'], para: 'aberto' },
    ] },
  rele: { regra: 'gatilho', estados: ['normal', 'atuado'], inicial: 'normal', ativos: ['atuado'],
    textos: { normal: 'supervisionando (50/51/50N/51N)', atuado: 'ATUADO — mandou abrir o disjuntor de MT' },
    acoes: [
      { id: 'atuar', rotulo: 'Simular sobrecorrente (atuação 50/51)', de: ['normal'], para: 'atuado', efeitosTipos: [{ tipos: ['disjuntor_mt'], de: ['fechado'], estado: 'disparado' }] },
      { id: 'rearmar', rotulo: 'Rearmar o relé (reset)', de: ['atuado'], para: 'normal' },
    ] },
  disjuntor_bt: { regra: 'serie', estados: ['fechado', 'aberto'], inicial: 'fechado', conduz: ['fechado'],
    acoes: [{ id: 'abrir', rotulo: 'Abrir o disjuntor geral de BT', de: ['fechado'], para: 'aberto' }, { id: 'fechar', rotulo: 'Fechar o disjuntor geral de BT', de: ['aberto'], para: 'fechado' }] },
  transformador: { regra: 'carga', textos: { energizado: 'energizado', desenergizado: 'DESENERGIZADO' } },
  qgbt: { regra: 'carga', textos: { energizado: 'barramento energizado', desenergizado: 'DESENERGIZADO' } },
  carga_mt: { regra: 'carga' },
  // incêndio (NBR 17240): o alarme é guardado na central até o rearme
  inc_central: { regra: 'central', estados: ['normal', 'alarme', 'silenciado'], inicial: 'normal', central: { de: ['normal'], para: 'alarme', saidaEm: ['alarme'] },
    textos: { normal: 'em supervisão (normal)', alarme: 'ALARME DE INCÊNDIO — avisadores acionados', silenciado: 'em alarme, avisadores silenciados' },
    acoes: [
      { id: 'silenciar', rotulo: 'Silenciar os avisadores', de: ['alarme'], para: 'silenciado' },
      { id: 'reativar', rotulo: 'Reativar os avisadores', de: ['silenciado'], para: 'alarme' },
      { id: 'rearmar', rotulo: 'Rearmar a central (reset)', de: ['alarme', 'silenciado'], para: 'normal', exige: [{ entradasInativas: true, texto: 'Ainda há dispositivo em alarme: rearme o acionador manual (chave) ou limpe o detector antes do reset da central.' }] },
      { id: 'alarme_geral', rotulo: 'Alarme geral (manual na central)', de: ['normal'], para: 'alarme' },
    ] },
  inc_acionador: { regra: 'gatilho', estados: ['normal', 'acionado'], inicial: 'normal', ativos: ['acionado'],
    acoes: [{ id: 'acionar', rotulo: 'Acionar (quebrar/pressionar)', de: ['normal'], para: 'acionado' }, { id: 'rearmar', rotulo: 'Rearmar o acionador (chave)', de: ['acionado'], para: 'normal' }] },
  inc_detector: { regra: 'gatilho', estados: ['normal', 'fumaça/temperatura detectada'], inicial: 'normal', ativos: ['fumaça/temperatura detectada'],
    acoes: [{ id: 'detectar', rotulo: 'Simular fumaça / temperatura', de: ['normal'], para: 'fumaça/temperatura detectada' }, { id: 'limpar', rotulo: 'Ambiente limpo (normalizar)', de: ['fumaça/temperatura detectada'], para: 'normal' }] },
  inc_avisador: { regra: 'carga', textos: { energizado: 'TOCANDO (sonoro e visual)', desenergizado: 'em silêncio' } },
  // alarme de intrusão: só dispara armado
  alm_central: { regra: 'central', estados: ['desarmado', 'armado', 'disparado'], inicial: 'desarmado', central: { de: ['armado'], para: 'disparado', saidaEm: ['disparado'] },
    textos: { desarmado: 'desarmado', armado: 'ARMADO', disparado: 'DISPARADO — sirene acionada' },
    acoes: [
      { id: 'armar', rotulo: 'Armar', de: ['desarmado'], para: 'armado', exige: [{ entradasInativas: true, texto: 'Há zona aberta/violada: feche a zona (ou inibi-la na central) antes de armar.' }] },
      { id: 'desarmar', rotulo: 'Desarmar (senha)', de: ['armado', 'disparado'], para: 'desarmado' },
    ] },
  alm_sensor: { regra: 'gatilho', estados: ['normal', 'violado'], inicial: 'normal', ativos: ['violado'],
    acoes: [{ id: 'violar', rotulo: 'Simular zona violada', de: ['normal'], para: 'violado' }, { id: 'normalizar', rotulo: 'Normalizar a zona', de: ['violado'], para: 'normal' }] },
  alm_sirene: { regra: 'carga', textos: { energizado: 'TOCANDO', desenergizado: 'em silêncio' } },
  // teclado: comanda a central (as ações são as dela)
  alm_teclado: { regra: 'carga', proxy: true },
  // CFTV: o switch PoE alimenta as câmeras
  cftv_switch: { regra: 'fonte', estados: ['ligado', 'desligado'], inicial: 'ligado', conduz: ['ligado'],
    textos: { ligado: 'ligado — PoE nas portas', desligado: 'DESLIGADO — portas PoE sem energia' },
    acoes: [{ id: 'desligar', rotulo: 'Desligar o switch PoE', de: ['ligado'], para: 'desligado' }, { id: 'ligar', rotulo: 'Ligar o switch PoE', de: ['desligado'], para: 'ligado' }] },
  cftv_camera: { regra: 'carga', textos: { energizado: 'com energia (PoE) — imagem no NVR', desenergizado: 'SEM ENERGIA — switch PoE desligado' } },
  // controle de acesso: a fechadura libera pela botoeira/leitor; a emergência libera todas
  ace_fechadura: { regra: 'gatilho', estados: ['travada', 'liberada'], inicial: 'travada', ativos: ['liberada'],
    acoes: [{ id: 'liberar', rotulo: 'Liberar', de: ['travada'], para: 'liberada' }, { id: 'travar', rotulo: 'Travar (fim do tempo de abertura)', de: ['liberada'], para: 'travada' }] },
  ace_comando: { regra: 'carga', textos: { energizado: 'pronto', desenergizado: 'sem energia' } },
  ace_emergencia: { regra: 'gatilho', estados: ['normal', 'acionada'], inicial: 'normal', ativos: ['acionada'],
    acoes: [{ id: 'acionar', rotulo: 'Acionar a emergência (libera as portas)', de: ['normal'], para: 'acionada', efeitosTipos: [{ tipos: ['ace_fechadura'], estado: 'liberada' }] },
      { id: 'rearmar', rotulo: 'Rearmar a emergência', de: ['acionada'], para: 'normal' }] },
  ace_controladora: { regra: 'carga', textos: { energizado: 'em operação', desenergizado: 'sem energia' } },
  // CLP/controlador DDC do quadro de automação (14/11/2026): RUN liga as saídas; STOP e a falha da fonte desligam
  aut_clp: { regra: 'fonte', estados: ['em RUN', 'em STOP', 'fonte 24 Vcc disparada'], inicial: 'em RUN', conduz: ['em RUN'],
    textos: { 'em RUN': 'em RUN — programa rodando, saídas comandadas', 'em STOP': 'em STOP — programa parado, saídas desligadas', 'fonte 24 Vcc disparada': 'FALHA — fonte 24 Vcc disparada (CPU, módulos e campo sem alimentação)' },
    acoes: [
      { id: 'stop', rotulo: 'Colocar em STOP', de: ['em RUN'], para: 'em STOP', texto: 'Em STOP as saídas digitais e analógicas vão para o estado de segurança: confira a posição segura de cada saída no descritivo de funcionamento.' },
      { id: 'run', rotulo: 'Colocar em RUN', de: ['em STOP'], para: 'em RUN' },
      { id: 'falha', rotulo: 'Simular falha da fonte 24 Vcc', de: ['em RUN', 'em STOP'], para: 'fonte 24 Vcc disparada' },
      { id: 'rearmar', rotulo: 'Rearmar a fonte (o CLP volta em STOP)', de: ['fonte 24 Vcc disparada'], para: 'em STOP' },
    ] },
};

// ── O motor ─────────────────────────────────────────────────────────────────
function criarInteracao(equipamentos = []) {
  const lista = equipamentos.filter(e => e && e.id != null && e.interacao).map(e => ({ ...e, id: S(e.id), interacao: { ...e.interacao } }));
  const porId = new Map(lista.map(e => [e.id, e]));
  const porTipo = (tipos) => lista.filter(e => tipos.includes(e.tipo));
  let estado;
  const inicial = () => Object.fromEntries(lista.map(e => [e.id, e.interacao.inicial ?? (e.interacao.estados || [])[0] ?? null]));
  estado = inicial();
  const ouvintes = new Set();
  let versao = 0;

  // saída de cada equipamento (memória por avaliação; ciclo = sem sinal)
  function avaliar() {
    const memo = new Map();
    const visit = new Set();
    const saida = (id) => {
      if (memo.has(id)) return memo.get(id);
      const e = porId.get(id);
      if (!e || visit.has(id)) return false;
      visit.add(id);
      const it = e.interacao, est = estado[id];
      const ents = (it.entradas || []).map(S).filter(x => porId.has(x));
      const entOk = !ents.length ? true : it.combinar === 'alguma' ? ents.some(saida) : ents.every(saida);
      let v;
      switch (it.regra) {
        case 'fonte': v = (it.conduz || []).includes(est); break;
        case 'serie': v = entOk && (it.conduz || []).includes(est); break;
        case 'gatilho': v = (it.ativos || []).includes(est); break;
        case 'central': v = (it.central?.saidaEm || []).includes(est); break;
        default: v = entOk;
      }
      visit.delete(id);
      memo.set(id, v);
      return v;
    };
    return saida;
  }
  let saidaAtual = avaliar();
  const entradasDe = (id) => (porId.get(id)?.interacao.entradas || []).map(S).filter(x => porId.has(x));
  const entradaAtiva = (id) => {
    const e = porId.get(id);
    const ents = entradasDe(id);
    if (!ents.length) return e?.interacao.regra !== 'central';
    return e.interacao.combinar === 'alguma' || e.interacao.regra === 'central' ? ents.some(x => saidaAtual(x)) : ents.every(x => saidaAtual(x));
  };
  // centrais: alarme guardado (alguma entrada ativa no estado "de" → "para")
  function propagar() {
    for (let i = 0; i < 10; i++) {
      saidaAtual = avaliar();
      let mudou = false;
      for (const e of lista) {
        const c = e.interacao.central;
        if (e.interacao.regra !== 'central' || !c) continue;
        if ((c.de || []).includes(estado[e.id]) && entradasDe(e.id).some(x => saidaAtual(x))) { estado[e.id] = c.para; mudou = true; }
      }
      if (!mudou) break;
    }
  }
  propagar();
  function notificar(ev) { versao++; for (const f of [...ouvintes]) { try { f(ev); } catch (e) { /* um ouvinte com erro não para os outros */ } } }

  // por que o equipamento está sem sinal: o 1º a montante que não conduz
  function motivo(id, vistos = new Set()) {
    const e = porId.get(S(id));
    if (!e || vistos.has(e.id)) return null;
    vistos.add(e.id);
    const it = e.interacao;
    if (['fonte', 'serie'].includes(it.regra) && !(it.conduz || []).includes(estado[e.id])) return `${e.rotulo || e.id} ${textoEstado(e.id)}`;
    for (const x of entradasDe(e.id)) if (!saidaAtual(x)) return motivo(x, vistos) || `${porId.get(x).rotulo || x} sem sinal`;
    return null;
  }
  function textoEstado(id) {
    const e = porId.get(S(id));
    if (!e) return '';
    const it = e.interacao, est = estado[e.id];
    if (it.regra === 'carga') return (it.textos || {})[saidaAtual(e.id) ? 'energizado' : 'desenergizado'] || (saidaAtual(e.id) ? 'energizado' : 'sem energia');
    return (it.textos || {})[est] || S(est);
  }
  // aparência no 3D: 'energizado' | 'apagado' | 'aberto' | 'falha' | 'alarme' | 'alerta' | 'normal' | 'armado'
  function aparencia(id) {
    const e = porId.get(S(id));
    if (!e) return 'normal';
    const it = e.interacao, est = estado[e.id], s = saidaAtual(e.id);
    if (it.regra === 'carga') return s ? (/TOCANDO/i.test(textoEstado(e.id)) ? 'alarme' : 'energizado') : 'apagado';
    if (it.regra === 'gatilho') return s ? (e.tipo === 'ace_fechadura' ? 'aberto' : 'alarme') : 'normal';
    if (it.regra === 'central') return s ? 'alarme' : est === 'silenciado' ? 'alerta' : est === 'armado' ? 'armado' : 'normal';
    if (/queim|dispar/i.test(est)) return 'falha';
    if (!(it.conduz || []).includes(est)) return 'aberto';
    return entradaAtiva(e.id) ? 'energizado' : 'apagado';
  }
  function situacao(id) {
    const e = porId.get(S(id));
    if (!e) return null;
    return { id: e.id, tipo: e.tipo, rotulo: e.rotulo || e.id, estado: estado[e.id], texto: textoEstado(e.id), saida: saidaAtual(e.id), tensao: entradaAtiva(e.id),
      aparencia: aparencia(e.id), motivo: saidaAtual(e.id) ? null : motivo(e.id), inferido: !!e.interacao.inferido, nota: e.interacao.nota || '' };
  }
  const resolverEqs = (r) => (r.eq != null ? [S(r.eq)] : r.eqs ? r.eqs.map(S) : r.tipos ? porTipo(r.tipos).map(e => e.id) : []);
  // ações possíveis no estado atual (as que recusam vêm com o motivo)
  function acoes(id) {
    const e = porId.get(S(id));
    if (!e) return [];
    // teclado do alarme: as ações da central
    if (e.interacao.proxy) {
      const c = entradasDe(e.id)[0] || lista.find(x => x.tipo === 'alm_central')?.id;
      return c ? acoes(c).map(a => ({ ...a, alvo: c })) : [];
    }
    return (e.interacao.acoes || []).filter(a => !a.de || a.de.includes(estado[e.id])).map(a => {
      let recusa = null;
      for (const r of a.exige || []) {
        if (r.entradasInativas) { if (entradasDe(e.id).some(x => saidaAtual(x))) { recusa = r.texto; break; } continue; }
        const ids = resolverEqs(r);
        const casa = ids.some(x => (r.estado || []).includes(estado[x]));
        if (r.nao ? casa : !casa && ids.length) { recusa = r.texto; break; }
      }
      return { id: a.id, rotulo: a.rotulo, alvo: e.id, permitida: !recusa, motivo: recusa };
    });
  }
  // executa a ação: devolve o texto para o aviso (a recusa didática também)
  function agir(id, acaoId) {
    const e = porId.get(S(id));
    if (!e) return null;
    if (e.interacao.proxy) { const a = acoes(e.id).find(x => x.id === acaoId); return a ? agir(a.alvo, acaoId) : null; }
    const a = (e.interacao.acoes || []).find(x => x.id === acaoId && (!x.de || x.de.includes(estado[e.id])));
    if (!a) return null;
    const info = acoes(e.id).find(x => x.id === acaoId);
    if (info && !info.permitida) { notificar({ tipo: 'recusa', id: e.id, acao: acaoId }); return `Manobra recusada — ${info.motivo}`; }
    const avisos = [];
    for (const r of a.avisoSe || []) if (resolverEqs(r).some(x => (r.estado || []).includes(estado[x]))) avisos.push(r.texto);
    if (a.para != null) estado[e.id] = a.para;
    for (const ef of a.efeitos || []) if (porId.has(S(ef.eq))) estado[S(ef.eq)] = ef.estado;
    for (const ef of a.efeitosTipos || []) for (const x of porTipo(ef.tipos)) if (!ef.de || ef.de.includes(estado[x.id])) estado[x.id] = ef.estado;
    propagar();
    notificar({ tipo: 'acao', id: e.id, acao: acaoId });
    return [`${e.rotulo || e.id}: ${textoEstado(e.id)}`, ...avisos].join(' — ');
  }
  return {
    get versao() { return versao; },
    assinar(f) { ouvintes.add(f); return () => ouvintes.delete(f); },
    lista: () => lista, equipamento: (id) => porId.get(S(id)) || null, tem: (id) => porId.has(S(id)),
    estado: (id) => estado[S(id)] ?? null, saida: (id) => saidaAtual(S(id)), tensao: (id) => entradaAtiva(S(id)),
    situacao, acoes, agir, motivo, textoEstado, aparencia,
    definir(id, est) { if (!porId.has(S(id))) return false; estado[S(id)] = est; propagar(); notificar({ tipo: 'definir', id: S(id) }); return true; },
    reiniciar() { estado = inicial(); propagar(); notificar({ tipo: 'reiniciar' }); },
    exportar: () => ({ ...estado }),
    importar(e) { if (!e || typeof e !== 'object') return false; for (const k of Object.keys(estado)) if (e[k] != null && (porId.get(k).interacao.estados || []).includes(e[k])) estado[k] = e[k]; propagar(); notificar({ tipo: 'importar' }); return true; },
  };
}

// equipamento com o perfil do tipo (o `interacao` do projeto vale sobre o perfil)
function comPerfil(base, perfil, extra = {}) {
  const p = PERFIS[perfil] || {};
  const doProjeto = base.interacao && typeof base.interacao === 'object' ? base.interacao : {};
  return { ...base, interacao: { ...JSON.parse(JSON.stringify(p)), ...extra, ...doProjeto, ...(doProjeto.entradas ? { inferido: false } : {}) } };
}

// ── Subestação / média tensão ───────────────────────────────────────────────
// Componentes do objetivo do projeto (../cad/cenaDoObjetivo.js, cena.componentes: { id, tipo,
// descricao, interacao? }). A ligação a montante, quando o componente não traz
// `interacao.entradas`, é a sequência típica da entrada de MT (rede → chave fusível →
// seccionadora → disjuntor de MT → transformador → geral de BT → QGBT), marcada "inferida".
const ORDEM_MT = ['chave_fusivel', 'chave_seccionadora', 'disjuntor_mt', 'transformador', 'disjuntor_bt', 'qgbt'];
const ROTULO_MT = { chave_fusivel: 'Chave fusível', chave_seccionadora: 'Chave seccionadora', disjuntor_mt: 'Disjuntor de MT', transformador: 'Transformador', disjuntor_bt: 'Disjuntor geral de BT', qgbt: 'QGBT', rele: 'Relé 50/51' };
// peças elétricas sem manobra: ficam energizadas (ou não) pelo ponto da cadeia onde estão
const CARGA_APOS = { mufla: null, para_raios: null, cabo_mt: null, isolador: null, cruzeta: null, tc: 'chave_seccionadora', tp: 'chave_seccionadora', medicao: 'chave_seccionadora', barramento: 'chave_seccionadora', cubiculo: 'chave_seccionadora' };
const ALIAS = { trafo: 'transformador', seccionadora: 'chave_seccionadora', fusivel: 'chave_fusivel', disjuntor: 'disjuntor_mt', quadro: 'qgbt' };
const tipoMt = (t) => { const k = String(t || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s-]+/g, '_'); return ALIAS[k] || k; };

function redeDaSubestacao(componentes = []) {
  const comps = componentes.filter(c => c && c.id != null).map(c => ({ ...c, tipo: tipoMt(c.tipo) }));
  const eqs = [];
  const NOTA = 'ligação inferida pela sequência típica da entrada de MT (o projeto não liga os componentes) [CONFERIR no unifilar]';
  const rede = comPerfil({ id: 'REDE-MT', tipo: 'rede_mt', rotulo: 'Rede da distribuidora (ramal de MT)' }, 'rede_mt', { inferido: true });
  eqs.push(rede);
  let anteriores = [rede.id];
  const pontoDaCadeia = {};
  const doTipo = (k) => comps.filter(c => c.tipo === k);
  const temMt = comps.some(c => ORDEM_MT.includes(c.tipo) || c.tipo === 'rele');
  if (!temMt) return { equipamentos: [], vinculos: new Map() };
  const vinculos = new Map(); // id do equipamento → id do componente (a peça no 3D)
  for (const k of ORDEM_MT) {
    let lista = doTipo(k);
    // geral de BT dentro do QGBT quando o projeto não o lista à parte
    if (k === 'disjuntor_bt' && !lista.length && doTipo('qgbt').length) {
      const q = doTipo('qgbt')[0];
      const id = `${q.id}:DJ-BT`;
      eqs.push(comPerfil({ id, tipo: 'disjuntor_bt', rotulo: `Disjuntor geral de BT (no ${q.descricao || 'QGBT'})` }, 'disjuntor_bt', { entradas: [...anteriores], inferido: true, nota: 'o disjuntor geral de BT fica dentro do QGBT (não está na relação à parte)' }));
      vinculos.set(id, String(q.id));
      anteriores = [id];
      pontoDaCadeia[k] = anteriores;
      continue;
    }
    if (!lista.length) continue;
    const ids = [];
    for (const c of lista) {
      const perfil = PERFIS[k] ? k : 'carga_mt';
      const e = comPerfil({ id: String(c.id), tipo: k, rotulo: c.descricao || ROTULO_MT[k] || k, componente: String(c.id) }, perfil, { entradas: [...anteriores], inferido: true, nota: NOTA });
      eqs.push(e);
      vinculos.set(e.id, String(c.id));
      ids.push(e.id);
    }
    anteriores = ids;
    pontoDaCadeia[k] = ids;
  }
  for (const c of doTipo('rele')) {
    eqs.push(comPerfil({ id: String(c.id), tipo: 'rele', rotulo: c.descricao || 'Relé de proteção 50/51', componente: String(c.id) }, 'rele', { inferido: true, nota: 'o relé comanda os disjuntores de MT do projeto [CONFERIR]' }));
    vinculos.set(String(c.id), String(c.id));
  }
  // peças sem manobra (mufla, para-raios, TC/TP, medição): energizadas pelo ponto da cadeia
  for (const c of comps) {
    if (!(c.tipo in CARGA_APOS) || vinculos.has(String(c.id))) continue;
    const apos = CARGA_APOS[c.tipo];
    const ent = apos && pontoDaCadeia[apos] ? pontoDaCadeia[apos] : pontoDaCadeia.chave_fusivel || [rede.id];
    eqs.push(comPerfil({ id: String(c.id), tipo: c.tipo, rotulo: c.descricao || c.tipo, componente: String(c.id) }, 'carga_mt', { entradas: [...ent], inferido: true, nota: NOTA }));
    vinculos.set(String(c.id), String(c.id));
  }
  return { equipamentos: eqs, vinculos };
}

// Liga a rede da subestação ao simulador de BT: o quadro do modelo único alimentado pelo QGBT
// (q.alimentado_por_equipamento = id do equipamento, ou o QGBT pela tag) fica sem energia
// quando a rede diz; e a mudança na rede recalcula a BT (circuitos e pontos apagam)
function ligarAoSimulador(rede, sim) {
  if (!rede || !sim) return () => {};
  const qgbts = rede.lista().filter(e => e.tipo === 'qgbt');
  const doQuadro = new Map();
  for (const q of sim.quadros()) {
    const eq = q.alimentado_por_equipamento != null ? S(q.alimentado_por_equipamento) : /QGBT|QGD|\bQG\b/i.test(S(q.tag)) && qgbts.length ? qgbts[0].id : null;
    if (eq && rede.tem(eq)) doQuadro.set(S(q.tag), eq);
  }
  // sem vínculo explícito e um quadro só sem alimentador: é ele que o QGBT alimenta
  if (!doQuadro.size && qgbts.length) {
    const raiz = sim.quadros().filter(q => q.alimentado_por == null || q.alimentado_por === '');
    if (raiz.length === 1) doQuadro.set(S(raiz[0].tag), qgbts[0].id);
  }
  sim.definirFonteExterna((tag) => { const eq = doQuadro.get(S(tag)); return eq && !rede.saida(eq) ? rede.motivo(eq) || `${rede.equipamento(eq).rotulo} desenergizado` : null; });
  return rede.assinar(() => sim.reavaliar({ origem: 'rede' }));
}

// ── Sistemas de sinal (incêndio, alarme, CFTV, controle de acesso) ──────────
// Símbolo do 3D → disciplina e papel
const PAPEL_DO_SIMBOLO = {
  'HM-INC-CENTRAL': ['incendio', 'central'], 'HM-INC-ACIONADOR': ['incendio', 'acionador'], 'HM-INC-DETECTOR-FUMACA': ['incendio', 'detector'],
  'HM-INC-DETECTOR-TEMP': ['incendio', 'detector'], 'HM-INC-AVISADOR': ['incendio', 'avisador'],
  'HM-ALM-CENTRAL': ['alarme', 'central'], 'HM-ALM-TECLADO': ['alarme', 'teclado'], 'HM-ALM-IVP': ['alarme', 'sensor'], 'HM-ALM-MAGNETICO': ['alarme', 'sensor'], 'HM-ALM-SIRENE': ['alarme', 'sirene'],
  'HM-CFTV-CAMERA': ['cftv', 'camera'], 'HM-CAB-RACK': ['cftv', 'switch'],
  'HM-ACE-CONTROLADORA': ['controle_acesso', 'controladora'], 'HM-ACE-LEITOR': ['controle_acesso', 'leitor'], 'HM-ACE-BOTOEIRA': ['controle_acesso', 'botoeira'],
  'HM-ACE-EMERGENCIA': ['controle_acesso', 'emergencia'], 'HM-ACE-FECHADURA': ['controle_acesso', 'fechadura'],
};
const ROTULO_PAPEL = { central: 'Central', acionador: 'Acionador manual', detector: 'Detector', avisador: 'Avisador audiovisual', teclado: 'Teclado', sensor: 'Sensor', sirene: 'Sirene', camera: 'Câmera', switch: 'Switch PoE', controladora: 'Controladora', leitor: 'Leitor', botoeira: 'Botoeira', emergencia: 'Acionador de emergência', fechadura: 'Fechadura' };
const NOTA_SINAL = 'ligação à central inferida (o laço/zona não consta no modelo) [CONFERIR no projeto]';

// dispositivos: [{ id, simbolo | (disciplina, papel), rotulo, x, y, entradas? }]
// → { equipamentos, vinculos (id do equipamento → id do dispositivo) }
function redeDeSinal(dispositivos = []) {
  const d = dispositivos.map(x => {
    const [disc, papel] = x.papel ? [x.disciplina, x.papel] : PAPEL_DO_SIMBOLO[x.simbolo] || [];
    return disc ? { ...x, id: S(x.id), disciplina: disc, papel } : null;
  }).filter(Boolean);
  const eqs = [];
  const vinculos = new Map();
  const de = (disc, papel) => d.filter(x => x.disciplina === disc && x.papel === papel);
  const rot = (x) => x.rotulo || `${ROTULO_PAPEL[x.papel] || x.papel} ${x.id}`;
  const add = (x, perfil, extra) => { eqs.push(comPerfil({ id: x.id, tipo: perfil, rotulo: rot(x), disciplina: x.disciplina, interacao: x.interacao }, perfil, extra)); vinculos.set(x.id, x.id); };
  const maisPerto = (lista, x) => lista.reduce((m, c) => (!m || Math.hypot(c.x - x.x, c.y - x.y) < Math.hypot(m.x - x.x, m.y - x.y) ? c : m), null);
  // incêndio: acionadores e detectores → central (a do projeto, ou a virtual) → avisadores
  const incendio = (disc, pc, pg, ps, gatilhos) => {
    const disp = gatilhos.flatMap(([p]) => de(disc, p));
    if (!disp.length && !de(disc, ps).length) return;
    let centrais = de(disc, 'central');
    const virtual = !centrais.length;
    if (virtual) { const v = { id: `${disc}:CENTRAL`, disciplina: disc, papel: 'central', rotulo: 'Central (não desenhada nesta planta)', x: 0, y: 0 }; centrais = [v]; }
    const ligadoA = new Map(centrais.map(c => [c.id, []]));
    // a central declarada no dispositivo (laço/zona do projeto) ou a mais perto
    for (const x of disp) {
      const alvo = x.entradas?.[0] != null && ligadoA.has(S(x.entradas[0])) ? S(x.entradas[0]) : (maisPerto(centrais, x) || centrais[0]).id;
      ligadoA.get(alvo).push(x.id);
    }
    for (const c of centrais) {
      eqs.push(comPerfil({ id: c.id, tipo: pc, rotulo: rot(c), disciplina: disc, interacao: c.interacao }, pc, { entradas: ligadoA.get(c.id), inferido: true, nota: NOTA_SINAL }));
      if (!virtual) vinculos.set(c.id, c.id);
    }
    for (const [p, perfil] of gatilhos) for (const x of de(disc, p)) add(x, perfil, { inferido: true, nota: NOTA_SINAL });
    for (const x of de(disc, ps)) add(x, pg, { entradas: [x.entradas?.[0] && ligadoA.has(S(x.entradas[0])) ? S(x.entradas[0]) : (maisPerto(centrais, x) || centrais[0]).id], inferido: true, nota: NOTA_SINAL });
    return centrais;
  };
  incendio('incendio', 'inc_central', 'inc_avisador', 'avisador', [['acionador', 'inc_acionador'], ['detector', 'inc_detector']]);
  const centraisAlm = incendio('alarme', 'alm_central', 'alm_sirene', 'sirene', [['sensor', 'alm_sensor']]);
  for (const x of de('alarme', 'teclado')) add(x, 'alm_teclado', { entradas: centraisAlm ? [(maisPerto(centraisAlm, x) || centraisAlm[0]).id] : [], inferido: true, nota: 'o teclado comanda a central do alarme' });
  // CFTV: câmeras ← switch PoE (o do rack mais perto; sem rack, um switch virtual)
  const cams = de('cftv', 'camera');
  if (cams.length) {
    let sws = de('cftv', 'switch');
    const virtual = !sws.length;
    if (virtual) sws = [{ id: 'cftv:SWITCH-POE', disciplina: 'cftv', papel: 'switch', rotulo: 'Switch PoE (rack não desenhado nesta planta)', x: 0, y: 0 }];
    for (const s of sws) { eqs.push(comPerfil({ id: s.id, tipo: 'cftv_switch', rotulo: s.rotulo || `Switch PoE do rack ${s.id}`, disciplina: 'cftv' }, 'cftv_switch', { inferido: true, nota: 'câmeras ligadas ao switch PoE do rack mais próximo [CONFERIR portas no projeto]' })); if (!virtual) vinculos.set(s.id, s.id); }
    for (const c of cams) add(c, 'cftv_camera', { entradas: [(maisPerto(sws, c) || sws[0]).id], inferido: true, nota: 'alimentada pelo switch PoE (porta a conferir)' });
  }
  // controle de acesso: botoeira/leitor → fechadura mais perto (até 4 m); emergência → todas
  const fech = de('controle_acesso', 'fechadura');
  for (const f of fech) add(f, 'ace_fechadura', { inferido: true, nota: 'fechadura comandada pela botoeira/leitor mais próximos [CONFERIR]' });
  for (const p of ['leitor', 'botoeira']) {
    for (const x of de('controle_acesso', p)) {
      const alvo = maisPerto(fech.filter(f => Math.hypot(f.x - x.x, f.y - x.y) <= 4), x);
      const acoes = alvo ? [{ id: 'liberar', rotulo: p === 'leitor' ? 'Apresentar credencial válida' : 'Pressionar a botoeira', efeitos: [{ eq: alvo.id, estado: 'liberada' }] }] : [];
      add(x, 'ace_comando', { acoes, inferido: true, nota: alvo ? `libera a fechadura ${alvo.id} [CONFERIR]` : 'sem fechadura a até 4 m [CONFERIR]' });
    }
  }
  for (const x of de('controle_acesso', 'emergencia')) add(x, 'ace_emergencia', { inferido: true, nota: 'libera todas as fechaduras (rota de fuga, fail-safe) [CONFERIR]' });
  for (const x of de('controle_acesso', 'controladora')) add(x, 'ace_controladora', {});
  return { equipamentos: eqs, vinculos };
}

// Duas redes como uma (a do prédio e a do painel aberto por cima dele): cada id vai para a
// rede que o tem; a lista e os avisos são das duas
function combinarRedes(a, b) {
  if (!a) return b; if (!b) return a;
  const de = (id) => (a.tem(id) ? a : b);
  const r = {};
  for (const f of ['estado', 'saida', 'tensao', 'situacao', 'acoes', 'agir', 'motivo', 'textoEstado', 'aparencia', 'equipamento', 'definir']) r[f] = (id, ...x) => de(id)[f](id, ...x);
  return {
    ...r, tem: (id) => a.tem(id) || b.tem(id), lista: () => [...a.lista(), ...b.lista()],
    assinar(f) { const s1 = a.assinar(f), s2 = b.assinar(f); return () => { s1(); s2(); }; },
    reiniciar() { a.reiniciar(); b.reiniciar(); }, exportar: () => ({ ...a.exportar(), ...b.exportar() }),
    importar(e) { a.importar(e); b.importar(e); return true; }, get versao() { return a.versao + b.versao; },
  };
}

module.exports = { criarInteracao, combinarRedes, PERFIS, comPerfil, redeDaSubestacao, redeDeSinal, ligarAoSimulador, PAPEL_DO_SIMBOLO, ORDEM_MT, tipoMt };
