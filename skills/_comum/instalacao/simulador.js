// Simulador LÓGICO da instalação (fase 2 do roteiro de 02/11/2026 — 3D interativo).
// Lê o modelo único (./index.js: quadros → disjuntores → circuitos → comandos → pontos)
// e responde "o que acontece se…": desligar o Q3 apaga as luminárias do circuito 3 e
// deixa as tomadas dele sem energia; interruptores, pulsadores com relé de impulso,
// contatores com botoeira liga/desliga e selo, sensores, dimmers e o painel de motor
// (liga, desliga, emergência, sinaleiros e relé térmico) seguem a lógica de comando.
//
//   energizado(ponto) = geral ∧ DR ∧ disjuntor ∧ lógica do comando
//
// Não calcula corrente: Ib, queda de tensão e seção já vêm da skill e só aparecem na
// ficha do circuito. JS puro, sem DOM e sem rede: testável no Node
// (./teste-simulador.js) e o mesmo código roda no visualizador 3D (bundle esbuild).
// O estado fica só no objeto (no navegador: a aba); exportar()/importar() o levam de uma
// vista para outra (prédio ↔ quadro, troca de planta).
//
// Fase 5 (iluminação no 3D): cenas DEFINIDAS no projeto — comando.cenas = [{ nome, niveis:
// { grupo: 0–1 }, padrao }] e ponto.grupo — dão o nível de CADA luminária (grupo a grupo);
// o teclado troca de cena (…→ última → desligado → 1ª) e o DALI-2 com cenas também chama
// cena. Lista só de números (comando antigo, sem cenas no projeto) segue como antes:
// 100 % → 60 % → 30 % → desligado.

// tipos de ponto que são CARGA ligada ao comando (acendem/giram)
const LUZ = new Set(['luminaria', 'ponto_luz']);
const MOTOR = 'motor';

// cenas do comando: definidas no projeto (objetos) ou a lista antiga de níveis
const cenasDefinidas = (k) => Array.isArray(k.cenas) && k.cenas.length && k.cenas.every(c => c && typeof c === 'object');
const CENAS_PADRAO = [1, 0.6, 0.3, 0];
// nível (0–1) de um grupo numa cena definida
function nivelNaCena(cena, grupo) {
  const v = cena?.niveis && grupo != null && grupo in cena.niveis ? cena.niveis[grupo] : cena?.padrao;
  return Math.max(0, Math.min(1, Number(v) || 0));
}
const nivelMaximoDaCena = (cena) => Math.max(nivelNaCena(cena, null), ...Object.values(cena?.niveis || {}).map(v => Math.max(0, Math.min(1, Number(v) || 0))));

// estado inicial dos comandos: 'ligado' (luzes acesas — desligar um disjuntor mostra o
// efeito na hora) ou 'desligado'. Motores começam sempre parados (painel: aperte LIGA).
function criarSimulador(instalacao, opcoes = {}) {
  const inst = instalacao || { quadros: [], circuitos: [], pontos: [], comandos: [] };
  const inicio = opcoes.inicio === 'desligado' ? 'desligado' : 'ligado';
  const quadros = inst.quadros || [];
  const circuitos = inst.circuitos || [];
  const pontos = inst.pontos || [];
  const comandos = inst.comandos || [];
  const S = (v) => String(v ?? '');

  const quadroDe = new Map(quadros.map(q => [S(q.tag), q]));
  const circuitoDe = new Map(circuitos.map(c => [S(c.id), c]));
  const pontoDe = new Map(pontos.map(p => [S(p.id), p]));
  const comandoDe = new Map(comandos.map(k => [S(k.id), k]));
  // painel de motor: um por circuito de motor (partida da skill quadros, bomba, ventilador,
  // pressurização) — o "contator com selo" do painel
  const paineisDe = new Map(circuitos.filter(c => c.tipo === MOTOR).map(c => [S(c.id), c]));

  // ── estado ────────────────────────────────────────────────────────────────
  // chave dos dispositivos de proteção: "quadro|tag" (Q0 e DR0 repetem de um quadro para outro)
  const chave = (q, tag) => `${S(q)}|${S(tag)}`;
  let estado;
  function estadoInicial() {
    const e = { protecao: {}, comandos: {}, paineis: {}, emergenciaQuadro: {} };
    for (const q of quadros) {
      if (q.geral?.tag) e.protecao[chave(q.tag, q.geral.tag)] = true;
      for (const d of q.disjuntores || []) e.protecao[chave(q.tag, d.tag)] = true;
      for (const dr of q.drs || []) if (!dr.ddr) e.protecao[chave(q.tag, dr.tag)] = true;
      e.emergenciaQuadro[S(q.tag)] = false;
    }
    const on = inicio === 'ligado';
    for (const k of comandos) {
      const disp = (k.dispositivos || []).map(S);
      const s = { pos: {}, rele: false, k: false, emergencia: false, presenca: false, habilitado: true, nivel: 0, ultimo: 1, cena: -1 };
      // interruptores: a posição de cada um (a saída é o OU-exclusivo de todas — vale para
      // simples, paralelo e paralelo + intermediários)
      disp.forEach(id => { s.pos[id] = false; });
      // comando sem dispositivo no modelo: uma tecla "virtual" (acionada pela luminária)
      if (!disp.length) s.pos._ = false;
      if (on) {
        s.pos[Object.keys(s.pos)[0]] = true;
        s.rele = true; s.k = true; s.presenca = true; s.nivel = 1;
        // teclado de cenas começa na 1ª cena; o DALI-2 com cenas, no nível manual (100 %)
        s.cena = k.tipo === 'cena' || !cenasDefinidas(k) ? 0 : -1;
        if (k.tipo === 'cena' && cenasDefinidas(k)) s.nivel = nivelMaximoDaCena(k.cenas[0]);
      }
      e.comandos[S(k.id)] = s;
    }
    for (const id of paineisDe.keys()) e.paineis[id] = { k: false, emergencia: false, termico: false };
    return e;
  }
  estado = estadoInicial();

  let versao = 0;
  const ouvintes = new Set();
  function mudou(evento) {
    propagar();
    versao++;
    for (const f of [...ouvintes]) { try { f(evento); } catch (e) { /* um ouvinte com erro não para os outros */ } }
  }

  // ── consultas: proteção e alimentação ─────────────────────────────────────
  function acharQuadroDaTag(tag, quadro) {
    if (quadro != null && quadro !== '') return quadroDe.get(S(quadro)) || null;
    const t = S(tag);
    return quadros.find(q => q.geral?.tag === t || (q.disjuntores || []).some(d => d.tag === t) || (q.drs || []).some(d => d.tag === t)) || null;
  }
  // { tipo: 'geral' | 'disjuntor' | 'dr' | 'ddr', quadro, item } ou null
  function dispositivo(tag, quadro) {
    const q = acharQuadroDaTag(tag, quadro);
    if (!q) return null;
    const t = S(tag);
    if (q.geral?.tag === t) return { tipo: 'geral', quadro: q, item: q.geral };
    const d = (q.disjuntores || []).find(x => x.tag === t);
    if (d) return { tipo: (q.drs || []).some(x => x.ddr && x.tag === t) ? 'ddr' : 'disjuntor', quadro: q, item: d };
    const dr = (q.drs || []).find(x => x.tag === t && !x.ddr);
    if (dr) return { tipo: 'dr', quadro: q, item: dr };
    return null;
  }
  function ligado(tag, quadro) {
    const d = dispositivo(tag, quadro);
    return d ? estado.protecao[chave(d.quadro.tag, tag)] !== false : false;
  }

  // Por que o circuito está sem energia (texto) — null quando está alimentado
  function motivo(circuitoId, visitados = new Set()) {
    const c = circuitoDe.get(S(circuitoId));
    if (!c) return `circuito ${circuitoId} não existe no modelo`;
    const q = quadroDe.get(S(c.quadro));
    if (!q) return `quadro ${c.quadro} não existe no modelo`;
    // quadro alimentado por um circuito de outro quadro (QD do andar ← QGBT)
    if (q.alimentado_por != null && q.alimentado_por !== '' && !visitados.has(S(q.tag))) {
      visitados.add(S(q.tag));
      const m = motivo(q.alimentado_por, visitados);
      if (m) return `${q.tag} sem alimentação (${m})`;
    }
    if (q.geral?.tag && estado.protecao[chave(q.tag, q.geral.tag)] === false) return `disjuntor geral ${q.geral.tag} do ${q.tag} desligado`;
    for (const dr of q.drs || []) {
      if (dr.ddr) continue;
      if (!(dr.circuitos || []).map(S).includes(S(c.id))) continue;
      if (estado.protecao[chave(q.tag, dr.tag)] === false) return `${dr.tag} (DR) do ${q.tag} desligado`;
    }
    if (c.disjuntor && estado.protecao[chave(q.tag, c.disjuntor)] === false) return `disjuntor ${c.disjuntor} desligado`;
    return null;
  }
  const alimentado = (circuitoId) => motivo(circuitoId) === null;

  // ── lógica de comando ─────────────────────────────────────────────────────
  // circuito que alimenta a bobina do relé/contator (o 1º do comando)
  const circuitoDoComando = (k) => S((k.circuitos || [])[0] ?? pontoDe.get(S((k.pontos || [])[0]))?.circuito ?? '');
  function bobinaAlimentada(k) {
    const c = circuitoDoComando(k);
    return c ? alimentado(c) : true;
  }
  // saída do comando, 0 a 1 (dimmer: o nível; os demais: 0 ou 1)
  function saida(k) {
    const s = estado.comandos[S(k.id)];
    if (!s) return 0;
    switch (k.tipo) {
      case 'interruptor_simples': case 'interruptor_paralelo': case 'interruptor_intermediario':
        return Object.values(s.pos).reduce((x, v) => x !== !!v, false) ? 1 : 0;
      case 'pulsador_rele_impulso': return s.rele ? 1 : 0;
      case 'contator_botoeira': return s.k && !s.emergencia ? 1 : 0;
      case 'sensor_presenca': return s.presenca && s.habilitado ? 1 : 0;
      case 'dimmer': case 'dimmer_010': case 'dali': case 'cena':
        if (cenasDefinidas(k) && (k.tipo === 'cena' || s.cena >= 0)) return s.cena >= 0 && k.cenas[s.cena] ? nivelMaximoDaCena(k.cenas[s.cena]) : 0;
        return Math.max(0, Math.min(1, Number(s.nivel) || 0));
      default: return Object.values(s.pos).reduce((x, v) => x !== !!v, false) ? 1 : 0;
    }
  }

  // nível de UMA carga do comando: com cena definida ativa, o do grupo da carga na cena
  function saidaDoPonto(k, p) {
    const s = estado.comandos[S(k.id)];
    if (s && cenasDefinidas(k) && (k.tipo === 'cena' || s.cena >= 0)) return s.cena >= 0 && k.cenas[s.cena] ? nivelNaCena(k.cenas[s.cena], p?.grupo) : 0;
    return saida(k);
  }

  // contator e painel de motor sem tensão na bobina: o selo cai (não volta sozinho)
  function propagar() {
    for (const k of comandos) {
      if (k.tipo !== 'contator_botoeira') continue;
      const s = estado.comandos[S(k.id)];
      if (s && s.k && (!bobinaAlimentada(k) || s.emergencia)) s.k = false;
    }
    for (const [id, c] of paineisDe) {
      const p = estado.paineis[id];
      const emerg = p.emergencia || !!estado.emergenciaQuadro[S(c.quadro)];
      if (p.k && (!alimentado(id) || emerg || p.termico)) p.k = false;
    }
  }

  // ── consultas: pontos ─────────────────────────────────────────────────────
  function painel(id) {
    const c = paineisDe.get(S(id));
    if (!c) return null;
    const p = estado.paineis[S(id)];
    const al = alimentado(id);
    const emerg = p.emergencia || !!estado.emergenciaQuadro[S(c.quadro)];
    const girando = al && p.k && !emerg && !p.termico;
    return {
      id: S(id), descricao: c.descricao || '', quadro: c.quadro, disjuntor: c.disjuntor, alimentado: al, motivo: motivo(id),
      contator: p.k, emergencia: emerg, emergenciaLocal: p.emergencia, termico: p.termico, girando,
      // sinaleiros (IEC 60073 / textos do caderno da skill quadros): verde EM OPERAÇÃO,
      // amarelo ALARME (térmico desarmado), vermelho FALHA/EMERGÊNCIA, branco ENERGIZADO
      sinaleiros: { verde: girando, amarelo: al && p.termico, vermelho: al && (emerg || p.termico), branco: al },
    };
  }

  // nível de saída do ponto (0 a 1) e o estado em texto
  function estadoPonto(id) {
    const p = pontoDe.get(S(id));
    if (!p) return null;
    const c = circuitoDe.get(S(p.circuito));
    const m = c ? motivo(c.id) : 'ponto sem circuito no modelo';
    const al = m === null;
    const k = p.comando ? comandoDe.get(S(p.comando)) : null;
    let nivel = al ? 1 : 0;
    let texto;
    if (LUZ.has(p.tipo)) {
      if (k) nivel = al ? saidaDoPonto(k, p) : 0;
      texto = !al ? `apagada — sem energia (${m})` : nivel > 0 ? (nivel < 1 ? `acesa em ${Math.round(nivel * 100)} %` : 'acesa') : `apagada pelo comando ${k ? k.id : ''}`.trim();
    } else if (p.tipo === MOTOR) {
      const pn = painel(p.circuito);
      if (pn) nivel = pn.girando ? 1 : 0;
      else if (k) nivel = al ? saida(k) : 0;
      texto = !al ? `parado — sem energia (${m})` : nivel ? 'em operação' : pn?.termico ? 'parado — relé térmico desarmado' : pn?.emergencia ? 'parado — emergência acionada' : 'parado';
    } else if (p.tipo === 'tomada' || p.tipo === 'tue') {
      texto = al ? 'com energia' : `SEM ENERGIA (${m})`;
    } else {
      texto = al ? 'com energia' : `sem energia (${m})`;
    }
    // circuitoLido 'a_conferir': o número do circuito veio do texto da planta, sem conferência (./doDesenho.js)
    return { id: S(p.id), tipo: p.tipo, circuito: c ? S(c.id) : null, comando: k ? S(k.id) : null, alimentado: al, motivo: m, nivel, energizado: nivel > 0, texto, ...(p.circuitoLido ? { circuitoLido: p.circuitoLido } : {}) };
  }
  const energizado = (id) => !!estadoPonto(id)?.energizado;

  function estadoComando(id) {
    const k = comandoDe.get(S(id));
    if (!k) return null;
    const s = estado.comandos[S(id)];
    const cenas = cenasDefinidas(k) ? k.cenas.map(c => c.nome || '') : null;
    return { id: S(id), tipo: k.tipo, saida: saida(k), bobina: bobinaAlimentada(k), ...JSON.parse(JSON.stringify(s)), ...(cenas ? { cenas, cenaAtiva: s.cena >= 0 ? cenas[s.cena] ?? null : null } : {}) };
  }

  // ── ações ─────────────────────────────────────────────────────────────────
  function definir(tag, valor, quadro) {
    const d = dispositivo(tag, quadro);
    if (!d) return false;
    const k = chave(d.quadro.tag, tag);
    const v = !!valor;
    if ((estado.protecao[k] !== false) === v) return true;
    estado.protecao[k] = v;
    mudou({ tipo: 'protecao', quadro: d.quadro.tag, tag: S(tag), ligado: v });
    return true;
  }
  const alternar = (tag, quadro) => definir(tag, !ligado(tag, quadro), quadro);

  // aciona um dispositivo de comando (interruptor, pulsador, botoeira, sensor, dimmer,
  // teclado) — ou, para uma luminária, o comando dela (como apertar o 1º interruptor).
  // acao: botoeira 'liga' | 'desliga' | 'emergencia' | 'liberar'; dimmer: nível 0–1.
  // Devolve o texto do que aconteceu (para o aviso na tela) ou null.
  function acionar(id, acao) {
    const p = pontoDe.get(S(id));
    if (!p) return null;
    if (p.tipo === MOTOR && paineisDe.has(S(p.circuito))) return motor(p.circuito, acao || (painel(p.circuito).contator ? 'desliga' : 'liga'));
    const k = p.comando ? comandoDe.get(S(p.comando)) : null;
    if (!k) return null;
    const s = estado.comandos[S(k.id)];
    const ehDisp = (k.dispositivos || []).map(S).includes(S(p.id));
    // carga (luminária): aciona o comando pelo 1º dispositivo dele
    if (!ehDisp) {
      const d0 = (k.dispositivos || [])[0];
      if (d0 != null && pontoDe.has(S(d0))) return acionar(d0, acao);
      return acionarComando(k, s, null, acao);
    }
    return acionarComando(k, s, p, acao);
  }

  function acionarComando(k, s, p, acao) {
    const tipoDisp = p?.tipo || '';
    const ev = (texto) => { mudou({ tipo: 'comando', comando: S(k.id), ponto: p ? S(p.id) : null }); return texto; };
    const toggleNivel = () => { if (s.nivel > 0) { s.ultimo = s.nivel; s.nivel = 0; } else s.nivel = s.ultimo || 1; };
    // chamar uma cena definida: acao { cena: índice } (−1 = desligar), em qualquer comando com cenas
    if (cenasDefinidas(k) && acao && typeof acao === 'object' && Number.isFinite(Number(acao.cena))) {
      const i = Math.round(Number(acao.cena));
      s.cena = i >= 0 && i < k.cenas.length ? i : -1;
      if (s.cena >= 0) s.nivel = nivelMaximoDaCena(k.cenas[s.cena]); else if (k.tipo === 'cena') s.nivel = 0;
      return ev(s.cena >= 0 ? `cena "${k.cenas[s.cena].nome}"` : k.tipo === 'cena' ? 'cenas: desligado' : 'nível manual');
    }
    // sensor fora do comando de presença (DALI com sensor): simula a detecção como um liga/desliga
    if (tipoDisp === 'sensor' && k.tipo === 'sensor_presenca') { s.presenca = !s.presenca; return ev(s.presenca ? 'presença detectada' : 'ambiente vazio (sensor)'); }
    switch (k.tipo) {
      case 'interruptor_simples': case 'interruptor_paralelo': case 'interruptor_intermediario': {
        const alvo = p ? S(p.id) : Object.keys(s.pos)[0];
        if (alvo == null) return null;
        s.pos[alvo] = !s.pos[alvo];
        return ev(`${alvo}: tecla na posição ${s.pos[alvo] ? 'I' : 'O'}`);
      }
      case 'pulsador_rele_impulso': {
        // o pulso só muda o relé se a bobina tiver tensão (circuito ligado)
        if (!bobinaAlimentada(k)) return ev(`pulso sem efeito: bobina do relé ${k.rele?.tag || ''} sem tensão`.replace('  ', ' '));
        s.rele = !s.rele;
        return ev(`relé de impulso ${k.rele?.tag || ''} ${s.rele ? 'fechou' : 'abriu'}`.replace('  ', ' '));
      }
      case 'contator_botoeira': {
        const a = acao || (s.emergencia ? 'liberar' : s.k ? 'desliga' : 'liga');
        if (a === 'emergencia') { s.emergencia = true; s.k = false; return ev('emergência acionada: contator caiu'); }
        if (a === 'liberar') { s.emergencia = false; return ev('emergência liberada (aperte LIGA)'); }
        if (a === 'desliga') { s.k = false; return ev(`contator ${k.rele?.tag || ''} desligado`.replace('  ', ' ')); }
        if (s.emergencia) return ev('LIGA sem efeito: emergência acionada');
        if (!bobinaAlimentada(k)) return ev('LIGA sem efeito: bobina do contator sem tensão');
        s.k = true;
        return ev(`contator ${k.rele?.tag || ''} ligado e selado`.replace('  ', ' '));
      }
      case 'sensor_presenca': {
        // interruptor do ambiente com sensor: desligamento manual
        s.habilitado = !s.habilitado;
        return ev(s.habilitado ? 'sensor habilitado' : 'desligamento manual (sensor inibido)');
      }
      case 'dimmer': case 'dimmer_010': case 'dali': {
        // botoeira/dimmer manual: sai da cena (DALI-2 com cenas) para o nível manual
        if (s.cena >= 0 && cenasDefinidas(k)) { s.nivel = saida(k); s.cena = -1; }
        if (typeof acao === 'number' && Number.isFinite(acao)) { s.nivel = Math.max(0, Math.min(1, acao)); if (s.nivel > 0) s.ultimo = s.nivel; }
        else toggleNivel();
        return ev(s.nivel > 0 ? `nível ${Math.round(s.nivel * 100)} %` : 'desligado');
      }
      case 'cena': {
        if (cenasDefinidas(k)) {
          // cenas do projeto: 1ª → … → última → desligado → 1ª; número = índice (−1 = desligado)
          const n = k.cenas.length;
          if (typeof acao === 'number' && Number.isFinite(acao)) s.cena = Math.round(acao) >= 0 && Math.round(acao) < n ? Math.round(acao) : -1;
          else s.cena = s.cena >= n - 1 ? -1 : s.cena + 1;
          s.nivel = s.cena >= 0 ? nivelMaximoDaCena(k.cenas[s.cena]) : 0;
          return ev(s.cena >= 0 ? `cena "${k.cenas[s.cena].nome}"` : 'cenas: desligado');
        }
        // teclado de cenas sem cenas no projeto: 100 % → 60 % → 30 % → desligado → 100 %…
        const cenas = Array.isArray(k.cenas) && k.cenas.length ? k.cenas.map(Number) : CENAS_PADRAO;
        if (typeof acao === 'number' && Number.isFinite(acao)) s.cena = Math.max(0, Math.min(cenas.length - 1, Math.round(acao)));
        else s.cena = (s.cena + 1) % cenas.length;
        s.nivel = cenas[s.cena];
        return ev(`cena ${s.cena + 1}: ${s.nivel > 0 ? `${Math.round(s.nivel * 100)} %` : 'desligado'}`);
      }
      default: {
        const alvo = p ? S(p.id) : Object.keys(s.pos)[0];
        if (alvo == null) return null;
        s.pos[alvo] = !s.pos[alvo];
        return ev(`${alvo} acionado`);
      }
    }
  }

  // painel de motor: 'liga' | 'desliga' | 'emergencia' | 'liberar' | 'desarmar_termico' | 'rearmar'
  function motor(id, acao) {
    const c = paineisDe.get(S(id));
    if (!c) return null;
    const p = estado.paineis[S(id)];
    const ev = (t) => { mudou({ tipo: 'motor', motor: S(id), acao }); return t; };
    switch (acao) {
      case 'liga': {
        const pn = painel(id);
        if (!pn.alimentado) return ev(`LIGA sem efeito: ${pn.motivo}`);
        if (pn.emergencia) return ev('LIGA sem efeito: emergência acionada');
        if (p.termico) return ev('LIGA sem efeito: relé térmico desarmado (rearme)');
        p.k = true;
        return ev(`${id}: contator ligado e selado — motor em operação`);
      }
      case 'desliga': p.k = false; return ev(`${id}: motor desligado`);
      case 'emergencia': p.emergencia = true; p.k = false; return ev(`${id}: EMERGÊNCIA — motor parado`);
      case 'liberar': p.emergencia = false; return ev(`${id}: emergência liberada (aperte LIGA)`);
      case 'desarmar_termico': p.termico = true; p.k = false; return ev(`${id}: relé térmico desarmado (sobrecarga simulada)`);
      case 'rearmar': p.termico = false; return ev(`${id}: relé térmico rearmado (aperte LIGA)`);
      default: return null;
    }
  }

  // emergência da porta do quadro: para todos os motores do quadro
  function emergenciaQuadro(quadro, ativa = true) {
    if (!quadroDe.has(S(quadro))) return false;
    estado.emergenciaQuadro[S(quadro)] = !!ativa;
    mudou({ tipo: 'emergencia', quadro: S(quadro), ativa: !!ativa });
    return true;
  }

  function reiniciar() { estado = estadoInicial(); mudou({ tipo: 'reiniciar' }); }
  const exportar = () => JSON.parse(JSON.stringify(estado));
  // estado salvo de outra vista (ou de outra carga da página): só as chaves que existem
  function importar(e) {
    if (!e || typeof e !== 'object') return false;
    const base = estadoInicial();
    for (const k of Object.keys(base.protecao)) if (typeof e.protecao?.[k] === 'boolean') base.protecao[k] = e.protecao[k];
    for (const k of Object.keys(base.emergenciaQuadro)) if (typeof e.emergenciaQuadro?.[k] === 'boolean') base.emergenciaQuadro[k] = e.emergenciaQuadro[k];
    for (const k of Object.keys(base.comandos)) {
      const v = e.comandos?.[k];
      if (!v || typeof v !== 'object') continue;
      const s = base.comandos[k];
      for (const id of Object.keys(s.pos)) if (typeof v.pos?.[id] === 'boolean') s.pos[id] = v.pos[id];
      for (const f of ['rele', 'k', 'emergencia', 'presenca', 'habilitado']) if (typeof v[f] === 'boolean') s[f] = v[f];
      for (const f of ['nivel', 'ultimo', 'cena']) if (Number.isFinite(v[f])) s[f] = v[f];
    }
    for (const k of Object.keys(base.paineis)) {
      const v = e.paineis?.[k];
      if (v && typeof v === 'object') for (const f of ['k', 'emergencia', 'termico']) if (typeof v[f] === 'boolean') base.paineis[k][f] = v[f];
    }
    estado = base;
    mudou({ tipo: 'importar' });
    return true;
  }

  return {
    instalacao: inst,
    get versao() { return versao; },
    assinar(f) { ouvintes.add(f); return () => ouvintes.delete(f); },
    // modelo
    quadros: () => quadros, quadro: (tag) => quadroDe.get(S(tag)) || null,
    circuito: (id) => circuitoDe.get(S(id)) || null, ponto: (id) => pontoDe.get(S(id)) || null,
    comando: (id) => comandoDe.get(S(id)) || null, temPonto: (id) => pontoDe.has(S(id)),
    paineis: () => [...paineisDe.keys()].map(painel),
    // consultas
    dispositivo, ligado, alimentado, motivo, energizado, estadoPonto, estadoComando, painel,
    emergenciaDoQuadro: (q) => !!estado.emergenciaQuadro[S(q)],
    // ações
    definir, alternar, desligar: (tag, q) => definir(tag, false, q), ligar: (tag, q) => definir(tag, true, q),
    acionar, motor, emergenciaQuadro, reiniciar, exportar, importar,
  };
}

// rótulo do tipo de dispositivo/ponto (ficha do 3D)
const ROTULO_PONTO = {
  luminaria: 'Luminária', ponto_luz: 'Ponto de luz', tomada: 'Tomada', tue: 'Tomada de uso específico', motor: 'Motor',
  interruptor_simples: 'Interruptor simples', interruptor_paralelo: 'Interruptor paralelo', interruptor_intermediario: 'Interruptor intermediário',
  interruptor: 'Interruptor', pulsador: 'Pulsador', botoeira: 'Botoeira liga/desliga', sensor: 'Sensor de presença', dimmer: 'Dimmer',
  controlador_010: 'Controlador 0-10 V', botoeira_dali: 'Botoeira DALI', teclado_cena: 'Teclado de cenas',
};

module.exports = { criarSimulador, ROTULO_PONTO, nivelNaCena };
