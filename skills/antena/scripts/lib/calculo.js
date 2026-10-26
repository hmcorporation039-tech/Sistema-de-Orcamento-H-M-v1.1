// Antena coletiva / TV (MATV e SMATV) — cálculo de enlace (link budget).
//
// TV digital aberta ISDB-Tb em UHF (canais 14–51, 470–698 MHz após o
// remanejamento da faixa de 700 MHz [CONFERIR]) e satélite banda Ku (FI de
// 950–2 150 MHz no cabo, LNBF quattro + multiswitch).
//
// Em cada tomada:
//   nível = nível na antena − cabo até o headend + ganho do amplificador
//           − divisor do headend − cabo da prumada (dB/m × m na frequência)
//           − inserções dos derivadores anteriores − derivação do pavimento
//           − cabo até a unidade e até a tomada − divisor da unidade − tomada
// O mínimo usa o canal mais fraco na MAIOR frequência e o maior percurso; o
// máximo usa o canal mais forte na MENOR frequência e o menor percurso.
// Valores de catálogo são típicos de mercado — [CONFERIR] com o fabricante.

// Atenuação típica do cabo coaxial 75 Ω (dB/100 m) — RG-6 com malha 60–67 %
// e condutor CCS; RG-11 para troncos longos. [CONFERIR com o catálogo]
const CABOS = {
  'RG-6': [[5, 1.9], [55, 5.2], [100, 6.6], [200, 9.2], [300, 11.2], [400, 12.9], [470, 14.1], [500, 14.5], [600, 15.9], [700, 17.3], [800, 18.6], [900, 19.8], [1000, 21.0], [1450, 25.5], [1750, 28.2], [2150, 31.5], [2400, 33.5]],
  'RG-11': [[5, 1.2], [55, 3.3], [100, 4.3], [200, 6.0], [300, 7.2], [400, 8.3], [470, 9.0], [500, 9.3], [600, 10.2], [700, 11.2], [800, 12.0], [900, 12.8], [1000, 13.6], [1450, 16.6], [1750, 18.4], [2150, 20.6], [2400, 22.0]],
};

// Derivadores (taps) 5–1 000 MHz: { nº de saídas: { derivação dB: perda de inserção dB } }
// Valores comerciais de derivação 8/12/16/20/24 dB; com 4 ou mais saídas o
// menor valor fisicamente possível sobe (12 ou 16 dB). [CONFERIR com o catálogo]
const DERIVADORES = {
  1: { 8: 2.0, 12: 1.3, 16: 0.9, 20: 0.7, 24: 0.6 },
  2: { 8: 3.0, 12: 1.8, 16: 1.2, 20: 0.9, 24: 0.7 },
  4: { 12: 3.5, 16: 2.0, 20: 1.3, 24: 1.0 },
  6: { 16: 2.5, 20: 1.6, 24: 1.2 },
  8: { 16: 3.0, 20: 1.8, 24: 1.3 },
};
const SAIDAS_DERIVADOR = [1, 2, 4, 6, 8];

// Divisores (splitters): perda por saída, em UHF e na FI de satélite
const DIVISORES = { 2: 4.0, 3: 6.5, 4: 7.5, 6: 10.0, 8: 11.5 };
const DIVISORES_SAT = { 2: 4.5, 3: 7.0, 4: 8.5, 6: 11.0, 8: 12.5 };
const VIAS_DIVISOR = [2, 3, 4, 6, 8];

const ATENUADORES = [3, 6, 10, 12, 15, 20];
const SAIDAS_MULTISWITCH = [4, 8, 12, 16, 24, 32];
// Ruído térmico em 75 Ω na banda do ISDB-Tb (5,57 MHz): −174 dBm/Hz + 10·log(B) + 108,75 ≈ 2,2 dBµV
const RUIDO_TERMICO_DBUV = -174 + 10 * Math.log10(5.57e6) + 108.75;

const SAT_F_MIN = 950;
const SAT_F_MAX = 2150;

const n = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const def = (v, d) => (n(v) == null ? d : n(v));
const r1 = (v) => Math.round(v * 10) / 10;

// dB/100 m por interpolação linear na tabela
function atenuacao(cabo, fMhz) {
  const t = CABOS[cabo] || CABOS['RG-6'];
  if (fMhz <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (fMhz <= t[i][0]) {
      const [f0, a0] = t[i - 1];
      const [f1, a1] = t[i];
      return a0 + (a1 - a0) * (fMhz - f0) / (f1 - f0);
    }
  }
  return t[t.length - 1][1];
}

// Faixa do canal (MHz): UHF 14–69 (470 + 6·(n − 14)), VHF alto 7–13 (174 + 6·(n − 7))
function faixaCanal(canal) {
  const c = Number(canal);
  if (c >= 14 && c <= 69) return [470 + 6 * (c - 14), 476 + 6 * (c - 14)];
  if (c >= 7 && c <= 13) return [174 + 6 * (c - 7), 180 + 6 * (c - 7)];
  return null;
}

function divisor(vias, sat = false) {
  if (!vias || vias <= 1) return { vias: 0, perda: 0, sobra: 0 };
  const tab = sat ? DIVISORES_SAT : DIVISORES;
  const v = VIAS_DIVISOR.find(x => x >= vias);
  if (v) return { vias: v, perda: tab[v], sobra: v - vias };
  // acima de 8 vias: dois estágios (2 vias + divisor de metade)
  const seg = divisor(Math.ceil(vias / 2), sat);
  return { vias: seg.vias * 2, perda: tab[2] + seg.perda, sobra: seg.vias * 2 - vias, estagios: 2 };
}

// combinações de até dois atenuadores comerciais
const SOMAS_ATENUADOR = [...new Set([...ATENUADORES, ...ATENUADORES.flatMap(a => ATENUADORES.map(b => a + b))])].sort((a, b) => a - b);
const atenuadorMin = (x) => (x <= 0 ? 0 : SOMAS_ATENUADOR.find(v => v >= x - 1e-9) || SOMAS_ATENUADOR[SOMAS_ATENUADOR.length - 1]);
const atenuadorAte = (x) => [...SOMAS_ATENUADOR].reverse().find(v => v <= x + 1e-9) || 0;
function decomporAtenuador(v) {
  if (!v) return [];
  if (ATENUADORES.includes(v)) return [v];
  for (const a of [...ATENUADORES].reverse()) if (ATENUADORES.includes(v - a)) return [a, v - a];
  return [v];
}

const saidasDerivador = (u) => SAIDAS_DERIVADOR.find(s => s >= u) || 8;
const vmaxDerivado = (vmax, canais) => vmax - (canais > 1 ? 7.5 * Math.log10(canais - 1) : 0);
const cnSomado = (lista) => (lista.length ? -10 * Math.log10(lista.reduce((a, c) => a + 10 ** (-c / 10), 0)) : null);

function rotuloPav(k) { return k === 0 ? 'Térreo' : `${k}º pav.`; }

// ── Entradas ───────────────────────────────────────────────────────────────

function lerEntradas(dados) {
  const s = dados.sistema || {};
  const sat = s.satelite || {};
  const tipo = ['terrestre', 'satelite', 'ambos'].includes(s.tipo) ? s.tipo : 'terrestre';
  const temTerr = tipo !== 'satelite';
  const temSat = tipo !== 'terrestre';
  // em "ambos", a TV aberta pode seguir pela entrada terrestre do multiswitch (um cabo, tomada TV/SAT) ou por rede de derivadores separada
  const terrPorMs = tipo === 'ambos' && s.rede_terrestre !== 'separada';
  const temDerivadores = temTerr && !terrPorMs;
  const avisos = [];

  const canais = (s.canais || []).filter(c => c && n(c.canal) != null).map(c => ({ ...c, canal: Number(c.canal), faixa: faixaCanal(c.canal), nivel: n(c.nivel_dbuv) }));
  canais.forEach(c => {
    if (!c.faixa) avisos.push(`Canal ${c.canal} fora das faixas de TV (VHF alto 7–13, UHF 14–51). [CONFERIR]`);
    else if (c.canal > 51) avisos.push(`Canal ${c.canal} acima de 698 MHz: faixa remanejada para o serviço móvel (700 MHz) — conferir o canal virtual/físico atual da emissora. [CONFERIR]`);
  });
  const comFaixa = canais.filter(c => c.faixa);
  const fMin = comFaixa.length ? Math.min(...comFaixa.map(c => c.faixa[0])) : def(s.freq_min_mhz, 470);
  const fMax = comFaixa.length ? Math.max(...comFaixa.map(c => c.faixa[1])) : def(s.freq_max_mhz, 698);
  const niveis = canais.map(c => c.nivel).filter(v => v != null);
  const fraco = niveis.length ? Math.min(...niveis) : n(s.nivel_antena_dbuv);
  const forte = niveis.length ? Math.max(...niveis) : def(s.nivel_antena_max_dbuv, fraco);
  const nCanais = canais.length || def(s.canais_qtd, 10);
  if (temTerr && fraco == null) throw new Error('Informe o nível de sinal na antena (dBµV) — por canal ou o do canal mais fraco.');
  if (temTerr && s.nivel_medido !== 'medido') avisos.push('Nível na antena ESTIMADO: medir com analisador de campo no local da antena antes de fechar o projeto. [CONFERIR]');
  if (temTerr && fraco < 45) avisos.push(`Nível do canal mais fraco na antena baixo (${r1(fraco)} dBµV): considerar antena de maior ganho, outra posição/altura ou pré-amplificador de mastro — amplificar no headend não recupera a relação C/N. [CONFERIR]`);

  const rg6 = (f) => atenuacao('RG-6', f) / 100;
  const caboPrumada = s.cabo_prumada === 'RG-11' ? 'RG-11' : 'RG-6';
  // atenuação informada pelo fabricante (dB/100 m) na maior/menor frequência do RG-6 prevalece sobre a tabela típica
  const oMax = n(s.atenuacao_fmax_db_100m);
  const oMin = n(s.atenuacao_fmin_db_100m);
  const a = {
    max: oMax != null ? oMax / 100 : rg6(fMax),
    min: oMin != null ? oMin / 100 : (oMax != null ? oMax / 100 * atenuacao('RG-6', fMin) / atenuacao('RG-6', fMax) : rg6(fMin)),
  };
  a.prumMax = caboPrumada === 'RG-6' ? a.max : atenuacao(caboPrumada, fMax) / 100;
  a.prumMin = caboPrumada === 'RG-6' ? a.min : atenuacao(caboPrumada, fMin) / 100;
  a.satMax = rg6(SAT_F_MAX);
  a.satMin = rg6(SAT_F_MIN);
  a.satPrumMax = atenuacao(caboPrumada, SAT_F_MAX) / 100;
  a.satPrumMin = atenuacao(caboPrumada, SAT_F_MIN) / 100;

  const nivelMin = def(s.nivel_min_dbuv, 50);
  const nivelMax = def(s.nivel_max_dbuv, 80);
  const E = {
    tipo, temTerr, temSat, terrPorMs, temDerivadores, avisos, canais, fMin, fMax, nCanais, caboPrumada, a,
    terr: { fraco, forte },
    nivelMin, nivelMax, alvo: def(s.nivel_alvo_dbuv, nivelMin + 10),
    dAH: def(s.distancia_antena_headend_m, 15),
    peDireito: def(s.pe_direito_m, 3),
    interna: def(s.distancia_interna_m, 8),
    perdaTomada: def(s.perda_tomada_db, 1.0),
    perdaTomadaSat: def(s.perda_tomada_sat_db, 1.5),
    reserva: def(s.reserva_cabo_pct, 10),
    distAterramento: def(s.distancia_aterramento_m, 10),
    antenasUhf: temTerr ? Math.max(1, def(s.antenas_uhf, 1)) : 0,
    amp: {
      ganhoMax: def(s.amp_ganho_max_db, 40),
      vmax: def(s.amp_nivel_max_dbuv, 114),
      nf: def(s.amp_figura_ruido_db, 7),
      linhaMax: def(s.amp_linha_ganho_max_db, 30),
      cnMin: def(s.cn_min_db, 25),
    },
    mer: { terr: def(s.mer_min_db, 25), sat: def(sat.mer_min_db, 11) },
    berMax: def(s.ber_max, 2e-4),
    sat: {
      nome: sat.nome || '', posicao: sat.posicao || '', diametro: def(sat.diametro_cm, 60), transponders: sat.transponders || '',
      lnbf: def(sat.nivel_lnbf_dbuv, 75),
      lnbfMax: def(sat.nivel_lnbf_max_dbuv, def(sat.nivel_lnbf_dbuv, 75) + 3),
      topologia: sat.topologia === 'estrela' ? 'estrela' : 'cascata',
      saidasMs: def(sat.saidas_multiswitch, 32),
      ganhoMs: def(sat.ganho_multiswitch_db, 0),
      passagem: def(sat.perda_passagem_db, 2.0),
      terrDerivacao: def(sat.perda_terrestre_db, 12),
      terrPassagem: def(sat.perda_passagem_terrestre_db, 1.0),
      nivelMin: def(sat.nivel_min_dbuv, 47),
      nivelMax: def(sat.nivel_max_dbuv, 77),
      ganhoAmpMax: def(sat.amp_ganho_max_db, 30),
      linhaMax: def(sat.amp_linha_ganho_max_db, 20),
    },
  };
  E.sat.alvo = def(sat.nivel_alvo_dbuv, E.sat.nivelMin + 8);
  E.vmaxN = vmaxDerivado(E.amp.vmax, E.nCanais);

  const edif = dados.edificacao || {};
  E.torres = (edif.torres || []).filter(t => n(t.pavimentos) > 0 && n(t.unidades_por_pavimento) > 0).map((t, i) => {
    const pontos = Math.max(1, def(t.pontos_por_unidade, 2));
    const dMed = def(t.distancia_prumada_m, 10);
    const ambientes = String(t.ambientes_tv || '').split(/[,;]/).map(x => x.trim()).filter(Boolean);
    return {
      nome: t.nome || `Torre ${String.fromCharCode(65 + i)}`,
      pavimentos: Math.round(n(t.pavimentos)),
      primeiro: def(t.primeiro_pavimento, 1),
      unidades: Math.round(n(t.unidades_por_pavimento)),
      pontos,
      pontosSat: !temSat ? 0 : (tipo === 'ambos' && !terrPorMs ? Math.min(pontos, def(t.pontos_sat_por_unidade, pontos)) : pontos),
      dMed, dMin: def(t.distancia_min_m, dMed), dMax: def(t.distancia_max_m, dMed),
      dHead: def(t.distancia_headend_m, 0),
      ambientes: Array.from({ length: pontos }, (_, k) => ambientes[k] || (k === 0 ? 'Sala' : `Quarto ${k}`)),
    };
  });
  if (!E.torres.length) throw new Error('Cadastre ao menos uma torre/bloco com pavimentos e unidades por pavimento.');
  E.areas = (edif.areas_comuns || []).filter(x => x && n(x.pontos) > 0).map(x => {
    const pontos = Math.round(n(x.pontos));
    return {
      nome: x.nome || 'Área comum', pontos, d: def(x.distancia_m, 30),
      pontosSat: !temSat ? 0 : (tipo === 'ambos' && !terrPorMs ? Math.min(pontos, def(x.pontos_sat, 0)) : pontos),
    };
  });
  E.areasDeriv = E.temDerivadores ? E.areas : [];
  E.areasMs = E.temSat ? E.areas.filter(x => x.pontosSat > 0) : [];
  return E;
}

// ── Rede de derivadores (TV aberta terrestre) ──────────────────────────────

// Escolha do derivador: o MAIOR valor que ainda deixa o mínimo na tomada ≥ alvo
// (guarda sinal para os pavimentos de baixo); se o máximo passar do limite,
// sobe a derivação; se nem 24 dB bastar, atenuador nas saídas.
// Quando a diferença entre o canal mais forte (menor frequência, menor percurso)
// e o mais fraco ocupa quase toda a janela, o alvo efetivo cai para
// (máximo − diferença): melhor ficar dentro da faixa do que estourar o máximo.
const alvoEfetivo = (alvo, max, dif) => Math.min(alvo, max - dif);

function escolherDerivador(saidas, w, s, perdaMin, perdaMax, E) {
  const valores = Object.keys(DERIVADORES[saidas]).map(Number).sort((x, y) => x - y);
  const oMin = (T) => w - T - perdaMin;
  const oMax = (T) => s - T - perdaMax;
  const alvo = alvoEfetivo(E.alvo, E.nivelMax, (s - perdaMax) - (w - perdaMin));
  const ok = valores.filter(T => oMin(T) >= alvo - 1e-9);
  let T;
  if (ok.length) {
    T = Math.max(...ok);
    if (oMax(T) > E.nivelMax + 1e-9) {
      const maior = valores.filter(v => v > T && oMin(v) >= E.nivelMin - 1e-9 && oMax(v) <= E.nivelMax + 1e-9);
      T = maior.length ? Math.min(...maior) : valores.filter(v => v > T && oMin(v) >= E.nivelMin - 1e-9).pop() || T;
    }
  } else {
    T = valores[0];
  }
  const att = oMax(T) > E.nivelMax + 1e-9 ? atenuadorMin(oMax(T) - E.nivelMax) : 0;
  return { T, insercao: DERIVADORES[saidas][T], att, oMin: oMin(T) - att, oMax: oMax(T) - att, atendeAlvo: oMin(T) >= alvo - 1e-9 };
}

function situacao(oMin, oMax, min, max, alvo, att) {
  if (oMin < min - 1e-9) return 'insuficiente';
  if (oMax > max + 1e-9) return 'alto';
  if (oMin < alvoEfetivo(alvo, max, oMax - oMin) - 1e-9 && !att) return 'baixo';
  return 'ok';
}
// amplificador de linha só quando o ganho disponível vale a pena
const GANHO_LINHA_MIN_DB = 6;

// G = ganho líquido do headend (negativo = atenuador na entrada); linha = permite amplificadores de linha
function redeDerivadores(E, G, linha = false) {
  const { a } = E;
  const inW = E.terr.fraco - E.dAH * a.max;
  const inS = E.terr.forte - E.dAH * a.min;
  const outW = inW + G;
  const outS = inS + G;
  // divisor do headend: uma via por torre + uma via para as áreas comuns (divisor secundário entre as áreas)
  const split = divisor(E.torres.length + (E.areasDeriv.length ? 1 : 0));
  const splitAreas = divisor(E.areasDeriv.length);
  const cnEstagios = G > 0 ? [inW - E.amp.nf - RUIDO_TERMICO_DBUV] : [];
  const torres = E.torres.map(t => {
    let w = outW - split.perda - t.dHead * a.prumMax;
    let s = outS - split.perda - t.dHead * a.prumMin;
    const cn = [...cnEstagios];
    const posicoes = [];
    const ampsLinha = [];
    const div = divisor(t.pontos);
    const perdaMin = (t.dMax + E.interna) * a.max + div.perda + E.perdaTomada;
    const perdaMax = (t.dMin + E.interna) * a.min + div.perda + E.perdaTomada;
    const perdaMed = (t.dMed + E.interna) * a.max + div.perda + E.perdaTomada;
    let caboPrumada = 0;
    for (let i = 0; i < t.pavimentos; i++) {
      const k = t.primeiro + t.pavimentos - 1 - i; // do topo para baixo
      const nTaps = Math.ceil(t.unidades / 8);
      let restantes = t.unidades;
      for (let j = 0; j < nTaps; j++) {
        const seg = j === 0 ? E.peDireito : 0.5;
        caboPrumada += seg;
        w -= seg * a.prumMax;
        s -= seg * a.prumMin;
        const unidades = Math.min(restantes, Math.ceil(t.unidades / nTaps));
        restantes -= unidades;
        const saidas = saidasDerivador(unidades);
        let esc = escolherDerivador(saidas, w, s, perdaMin, perdaMax, E);
        let ampLinha = 0;
        if (linha && !esc.atendeAlvo) {
          const g = Math.min(E.amp.linhaMax, E.vmaxN - s);
          if (g >= GANHO_LINHA_MIN_DB) {
            cn.push(w - E.amp.nf - RUIDO_TERMICO_DBUV);
            ampLinha = r1(g);
            w += ampLinha;
            s += ampLinha;
            ampsLinha.push({ pavimento: rotuloPav(k), ganho: ampLinha });
            esc = escolherDerivador(saidas, w, s, perdaMin, perdaMax, E);
          }
        }
        posicoes.push({
          torre: t.nome, k, pavimento: rotuloPav(k) + (nTaps > 1 ? ` (${j + 1}/${nTaps})` : ''), unidades, saidas, derivacao: esc.T, insercao: esc.insercao,
          entradaMin: r1(w), entradaMax: r1(s), ampLinha, atenuador: esc.att,
          tomadaMin: r1(esc.oMin), tomadaMax: r1(esc.oMax), tomadaMed: r1(w - esc.T - perdaMed - esc.att),
          situacao: situacao(esc.oMin, esc.oMax, E.nivelMin, E.nivelMax, E.alvo, esc.att),
        });
        w -= esc.insercao;
        s -= esc.insercao;
      }
    }
    return { ...t, divisorUnidade: div, posicoes, ampsLinha, caboPrumada, cn: cnSomado(cn) };
  });
  const areas = E.areasDeriv.map(x => {
    const div = divisor(x.pontos);
    const oMin = outW - split.perda - splitAreas.perda - (x.d + E.interna) * a.max - div.perda - E.perdaTomada;
    const oMax = outS - split.perda - splitAreas.perda - (x.d + E.interna) * a.min - div.perda - E.perdaTomada;
    const att = oMax > E.nivelMax + 1e-9 ? atenuadorMin(oMax - E.nivelMax) : 0;
    return { ...x, divisor: div, atenuador: att, tomadaMin: r1(oMin - att), tomadaMax: r1(oMax - att), situacao: situacao(oMin - att, oMax - att, E.nivelMin, E.nivelMax, E.alvo, att) };
  });
  const todas = [...torres.flatMap(t => t.posicoes), ...areas];
  return {
    G, inW: r1(inW), inS: r1(inS), outW: r1(outW), outS: r1(outS), split, splitAreas, torres, areas,
    ok: todas.every(p => p.situacao === 'ok'),
    nAmpsLinha: torres.reduce((acc, t) => acc + t.ampsLinha.length, 0),
    cn: cnEstagios.length || torres.some(t => t.ampsLinha.length) ? Math.min(...torres.map(t => t.cn).filter(v => v != null)) : null,
  };
}

// Menor ganho que leva todas as tomadas ao alvo; se o amplificador do headend
// não bastar (ganho máximo ou nível máximo de saída), amplificadores de linha.
function dimensionarDerivadores(E) {
  const inS = E.terr.forte - E.dAH * E.a.min;
  const gCap = Math.min(E.amp.ganhoMax, E.vmaxN - inS);
  let achado = null;
  for (let G = -40; G <= gCap + 1e-9; G += 0.5) {
    const r = redeDerivadores(E, G);
    if (r.ok) { achado = G; break; }
  }
  let rede;
  let atenuadorEntrada = 0;
  if (achado != null && achado <= 0) {
    atenuadorEntrada = atenuadorAte(-achado);
    rede = redeDerivadores(E, -atenuadorEntrada);
  } else if (achado != null) {
    rede = redeDerivadores(E, achado);
  } else {
    rede = redeDerivadores(E, gCap > 0 ? r1(gCap) : 0, true);
    if (gCap <= 0) E.avisos.push('Nível na antena já acima do nível máximo de saída do amplificador para o número de canais: usar headend canalizado/programável. [CONFERIR]');
  }
  const amplificador = rede.G > 0 ? { ganho: rede.G, saidaMax: r1(rede.outS), vmaxN: r1(E.vmaxN), folga: r1(E.vmaxN - rede.outS) } : null;
  return { ...rede, atenuadorEntrada, amplificador };
}

// ── Rede de multiswitch (satélite; e TV aberta quando segue pelo multiswitch) ──

// grupos de saída: por pavimento de cada torre (cascata) e áreas comuns
function gruposMs(E) {
  const grupos = [];
  E.torres.forEach(t => {
    if (!t.pontosSat) return;
    for (let i = 0; i < t.pavimentos; i++) {
      const k = t.primeiro + t.pavimentos - 1 - i;
      grupos.push({ torre: t.nome, k, pavimento: rotuloPav(k), indice: i, pontos: t.unidades * t.pontosSat, dMin: t.dMin, dMax: t.dMax, dMed: t.dMed, dHead: t.dHead, interna: E.interna });
    }
  });
  E.areasMs.forEach(x => grupos.push({ torre: 'Áreas comuns', area: true, pavimento: x.nome, pontos: x.pontosSat, dMin: x.d, dMax: x.d, dMed: x.d, dHead: 0, indice: -1, interna: E.interna }));
  return grupos;
}

function multiswitchesPara(pontos, max) {
  const lista = [];
  let resto = pontos;
  while (resto > 0) {
    const s = SAIDAS_MULTISWITCH.find(x => x >= Math.min(resto, max)) || max;
    lista.push(s);
    resto -= s;
  }
  return lista;
}

function redeMultiswitch(E, gSat, gTerr, linha = false) {
  const { a, sat } = E;
  const tomS = E.perdaTomadaSat;
  const tomT = E.perdaTomada;
  const srcS = { w: sat.lnbf - E.dAH * a.satMax + gSat, s: sat.lnbfMax - E.dAH * a.satMin + gSat };
  const srcT = E.terrPorMs ? { w: E.terr.fraco - E.dAH * a.max + gTerr, s: E.terr.forte - E.dAH * a.min + gTerr } : null;
  const grupos = gruposMs(E);
  const saidaS = (lvl, dCabo, aCabo) => lvl + sat.ganhoMs - dCabo * aCabo - tomS;
  const saidaT = (lvl, dCabo, aCabo) => lvl - sat.terrDerivacao - dCabo * aCabo - tomT;
  const linhas = [];
  const ampsLinha = [];
  let caboTronco = 0;
  let nMs = 0;

  const avaliar = (g, nivel, cabo) => {
    // cabo = { min: m (menor percurso), max: m (maior percurso), prumMin/Max: parte da prumada (dB) }
    const o = {
      satMin: saidaS(nivel.s.w, cabo.max, a.satMax) - (cabo.prumW || 0), satMax: saidaS(nivel.s.s, cabo.min, a.satMin) - (cabo.prumS || 0),
    };
    if (nivel.t) { o.terrMin = saidaT(nivel.t.w, cabo.max, a.max) - (cabo.prumTW || 0); o.terrMax = saidaT(nivel.t.s, cabo.min, a.min) - (cabo.prumTS || 0); }
    o.attSat = o.satMax > sat.nivelMax + 1e-9 ? atenuadorMin(o.satMax - sat.nivelMax) : 0;
    o.attTerr = o.terrMax != null && o.terrMax > E.nivelMax + 1e-9 ? atenuadorMin(o.terrMax - E.nivelMax) : 0;
    o.situacaoSat = situacao(o.satMin - o.attSat, o.satMax - o.attSat, sat.nivelMin, sat.nivelMax, sat.alvo, o.attSat);
    o.situacaoTerr = o.terrMin == null ? null : situacao(o.terrMin - o.attTerr, o.terrMax - o.attTerr, E.nivelMin, E.nivelMax, E.alvo, o.attTerr);
    return {
      ...g, satMin: r1(o.satMin - o.attSat), satMax: r1(o.satMax - o.attSat), atenuadorSat: o.attSat,
      ...(o.terrMin != null ? { terrMin: r1(o.terrMin - o.attTerr), terrMax: r1(o.terrMax - o.attTerr), atenuadorTerr: o.attTerr } : {}),
      situacaoSat: o.situacaoSat, situacaoTerr: o.situacaoTerr,
    };
  };

  if (sat.topologia === 'cascata') {
    // divisor de tronco no headend: uma via por torre (+1 para o multiswitch das áreas comuns)
    const torresMs = E.torres.filter(t => t.pontosSat);
    const vias = torresMs.length + (E.areasMs.length ? 1 : 0);
    const dS = divisor(vias, true);
    const dT = divisor(vias);
    const porTorre = new Map();
    torresMs.forEach(t => {
      porTorre.set(t.nome, {
        s: { w: srcS.w - dS.perda - t.dHead * a.satPrumMax, s: srcS.s - dS.perda - t.dHead * a.satPrumMin },
        t: srcT ? { w: srcT.w - dT.perda - t.dHead * a.prumMax, s: srcT.s - dT.perda - t.dHead * a.prumMin } : null,
      });
      caboTronco += t.dHead;
    });
    for (const g of grupos) {
      if (g.area) continue;
      const nv = porTorre.get(g.torre);
      nv.s.w -= E.peDireito * a.satPrumMax; nv.s.s -= E.peDireito * a.satPrumMin;
      if (nv.t) { nv.t.w -= E.peDireito * a.prumMax; nv.t.s -= E.peDireito * a.prumMin; }
      caboTronco += E.peDireito;
      const mss = multiswitchesPara(g.pontos, sat.saidasMs);
      const cabo = { min: g.dMin + g.interna, max: g.dMax + g.interna };
      mss.forEach((saidas, j) => {
        let ampLinha = 0;
        let r = avaliar(g, nv, cabo);
        if (linha && r.satMin < sat.alvo - 1e-9) {
          const gl = Math.min(sat.linhaMax, sat.nivelMax - r.satMax, sat.alvo - r.satMin + 3);
          if (gl >= GANHO_LINHA_MIN_DB / 2) { ampLinha = r1(gl); nv.s.w += ampLinha; nv.s.s += ampLinha; ampsLinha.push({ torre: g.torre, pavimento: g.pavimento, ganho: ampLinha }); r = avaliar(g, nv, cabo); }
        }
        linhas.push({ ...r, multiswitch: `5×${saidas}`, saidas, pontosMs: Math.min(saidas, g.pontos - j * mss[0]), entradaSat: r1(nv.s.w), ampLinha, pavimento: g.pavimento + (mss.length > 1 ? ` (${j + 1}/${mss.length})` : '') });
        nMs++;
        nv.s.w -= sat.passagem; nv.s.s -= sat.passagem;
        if (nv.t) { nv.t.w -= sat.terrPassagem; nv.t.s -= sat.terrPassagem; }
      });
    }
    // áreas comuns: multiswitch no headend (estrela), uma via do divisor de tronco
    if (E.areasMs.length) {
      const nv = { s: { w: srcS.w - dS.perda, s: srcS.s - dS.perda }, t: srcT ? { w: srcT.w - dT.perda, s: srcT.s - dT.perda } : null };
      const total = E.areasMs.reduce((acc, x) => acc + x.pontosSat, 0);
      const mss = multiswitchesPara(total, sat.saidasMs);
      nMs += mss.length;
      const piorPass = (mss.length - 1);
      grupos.filter(g => g.area).forEach(g => {
        const cabo = { min: g.dMin + g.interna, max: g.dMax + g.interna };
        const nvG = { s: { w: nv.s.w - piorPass * sat.passagem, s: nv.s.s }, t: nv.t ? { w: nv.t.w - piorPass * sat.terrPassagem, s: nv.t.s } : null };
        linhas.push({ ...avaliar(g, nvG, cabo), multiswitch: `5×${mss[0]} (headend)`, saidas: 0, pontosMs: g.pontos, entradaSat: r1(nvG.s.w), ampLinha: 0 });
      });
      linhas.areasMs = mss;
    }
    return { gSat, gTerr, linhas, ampsLinha, caboTronco, nMs, divisorTronco: { sat: dS, terr: dT, vias }, mss: [...linhas.filter(l => l.saidas).map(l => l.saidas), ...(linhas.areasMs || [])] };
  }

  // estrela: todos os multiswitches no headend, em cascata; um cabo por ponto até a tomada
  const total = grupos.reduce((acc, g) => acc + g.pontos, 0);
  const mss = multiswitchesPara(total, sat.saidasMs);
  const inicio = []; // índice do 1º ponto de cada multiswitch
  mss.reduce((acc, s) => { inicio.push(acc); return acc + s; }, 0);
  const msDoPonto = (p) => { let k = 0; while (k + 1 < inicio.length && inicio[k + 1] <= p) k++; return k; };
  let p0 = 0;
  for (const g of grupos) {
    const k1 = msDoPonto(p0);
    const k2 = msDoPonto(p0 + g.pontos - 1);
    p0 += g.pontos;
    const prum = g.area ? 0 : g.dHead + (g.indice + 1) * E.peDireito;
    const cabo = { min: g.dMin + g.interna, max: g.dMax + g.interna, prumW: prum * a.satPrumMax, prumS: prum * a.satPrumMin, prumTW: prum * a.prumMax, prumTS: prum * a.prumMin };
    const nv = {
      s: { w: srcS.w - k2 * sat.passagem, s: srcS.s - k1 * sat.passagem },
      t: srcT ? { w: srcT.w - k2 * sat.terrPassagem, s: srcT.s - k1 * sat.terrPassagem } : null,
    };
    linhas.push({ ...avaliar(g, nv, cabo), multiswitch: k1 === k2 ? `MS-${k1 + 1}` : `MS-${k1 + 1}/${k2 + 1}`, saidas: 0, pontosMs: g.pontos, entradaSat: r1(nv.s.w), ampLinha: 0, prumada: prum });
  }
  return { gSat, gTerr, linhas, ampsLinha, caboTronco: 0, nMs: mss.length, mss, divisorTronco: null };
}

function dimensionarMultiswitch(E) {
  const { sat } = E;
  const okSat = (r) => r.linhas.every(l => l.situacaoSat === 'ok');
  const okTerr = (r) => r.linhas.every(l => !l.situacaoTerr || l.situacaoTerr === 'ok');
  // ganho do amplificador de FI (satélite) no headend
  let gSat = null;
  for (let g = 0; g <= sat.ganhoAmpMax + 1e-9; g += 0.5) { if (okSat(redeMultiswitch(E, g, 0))) { gSat = g; break; } }
  let linha = false;
  if (gSat == null) { gSat = sat.ganhoAmpMax; linha = sat.topologia === 'cascata'; }
  // ganho/atenuação do canal terrestre que entra no multiswitch
  let gTerr = 0;
  let atenuadorEntrada = 0;
  if (E.terrPorMs) {
    const inS = E.terr.forte - E.dAH * E.a.min;
    const gCap = Math.min(E.amp.ganhoMax, E.vmaxN - inS);
    let achado = null;
    for (let g = -40; g <= gCap + 1e-9; g += 0.5) { if (okTerr(redeMultiswitch(E, gSat, g, linha))) { achado = g; break; } }
    if (achado == null) gTerr = gCap > 0 ? r1(gCap) : 0;
    else if (achado <= 0) { atenuadorEntrada = atenuadorAte(-achado); gTerr = -atenuadorEntrada; } else gTerr = achado;
  }
  const r = redeMultiswitch(E, gSat, gTerr, linha);
  const inW = E.terr.fraco - E.dAH * E.a.max;
  return {
    ...r, okSat: okSat(r), okTerr: okTerr(r), atenuadorEntradaTerr: atenuadorEntrada,
    ampSat: gSat > 0 ? { ganho: gSat } : null,
    ampTerr: gTerr > 0 ? { ganho: gTerr, saidaMax: r1(E.terr.forte - E.dAH * E.a.min + gTerr), vmaxN: r1(E.vmaxN) } : null,
    cnTerr: E.terrPorMs && gTerr > 0 ? r1(inW - E.amp.nf - RUIDO_TERMICO_DBUV) : null,
  };
}

// ── Cálculo completo + quantitativos ───────────────────────────────────────

function calcular(dados) {
  const E = lerEntradas(dados);
  const avisos = E.avisos;
  const deriv = E.temDerivadores ? dimensionarDerivadores(E) : null;
  const ms = E.temSat ? dimensionarMultiswitch(E) : null;

  // avisos de nível
  if (deriv) {
    for (const p of [...deriv.torres.flatMap(t => t.posicoes), ...deriv.areas.map(x => ({ ...x, torre: 'Áreas comuns', pavimento: x.nome }))]) {
      if (p.situacao === 'insuficiente') avisos.push(`${p.torre} — ${p.pavimento}: TV aberta ${p.tomadaMin} dBµV na tomada mais distante, abaixo do mínimo de ${E.nivelMin} dBµV.`);
      else if (p.situacao === 'alto') avisos.push(`${p.torre} — ${p.pavimento}: TV aberta ${p.tomadaMax} dBµV na tomada mais próxima, acima do máximo de ${E.nivelMax} dBµV — equalizar os canais no headend.`);
      else if (p.situacao === 'baixo') avisos.push(`${p.torre} — ${p.pavimento}: TV aberta ${p.tomadaMin} dBµV, abaixo do alvo de ${E.alvo} dBµV (margem reduzida).`);
    }
    if (deriv.amplificador && deriv.amplificador.folga < 3) avisos.push(`Amplificador do headend a ${deriv.amplificador.folga} dB do nível máximo de saída para ${E.nCanais} canais (${deriv.amplificador.vmaxN} dBµV): risco de intermodulação. [CONFERIR]`);
    if (deriv.nAmpsLinha) avisos.push(`Previstos ${deriv.nAmpsLinha} amplificador(es) de linha na prumada — ganho do headend limitado a ${r1(Math.min(E.amp.ganhoMax, E.vmaxN - deriv.inS))} dB. Conferir posição e alimentação. [CONFERIR]`);
    if (deriv.cn != null && deriv.cn < E.amp.cnMin) avisos.push(`C/N estimada de ${r1(deriv.cn)} dB na saída da cadeia de amplificadores, abaixo de ${E.amp.cnMin} dB: melhorar o sinal na antena (antena de maior ganho / pré-amplificador de mastro). [CONFERIR]`);
    const tilt = r1((E.a.max - E.a.min) * (E.dAH + E.peDireito * Math.max(...E.torres.map(t => t.pavimentos))));
    if (E.terr.forte - E.terr.fraco > 15) avisos.push(`Diferença de ${r1(E.terr.forte - E.terr.fraco)} dB entre o canal mais forte e o mais fraco na antena: preferir headend canalizado/programável que equaliza os canais. [CONFERIR]`);
    if (tilt > 6) avisos.push(`Inclinação do cabo (${tilt} dB entre ${E.fMin} e ${E.fMax} MHz na prumada mais longa): considerar equalizador de inclinação (slope) no headend.`);
  }
  if (ms) {
    for (const l of ms.linhas) {
      if (l.situacaoSat === 'insuficiente') avisos.push(`${l.torre} — ${l.pavimento}: satélite ${l.satMin} dBµV a 2 150 MHz, abaixo do mínimo de ${E.sat.nivelMin} dBµV.`);
      if (l.situacaoSat === 'alto') avisos.push(`${l.torre} — ${l.pavimento}: satélite ${l.satMax} dBµV a 950 MHz, acima de ${E.sat.nivelMax} dBµV — usar equalizador/atenuador na saída do multiswitch.`);
      if (l.situacaoTerr === 'insuficiente' || l.situacaoTerr === 'alto') avisos.push(`${l.torre} — ${l.pavimento}: TV aberta pelo multiswitch ${l.situacaoTerr === 'alto' ? `${l.terrMax} dBµV (acima de ${E.nivelMax})` : `${l.terrMin} dBµV (abaixo de ${E.nivelMin})`}.`);
    }
    if (ms.ampsLinha.length) avisos.push(`Previstos ${ms.ampsLinha.length} amplificador(es) de linha de FI (satélite) no tronco da prumada. [CONFERIR]`);
    if (E.sat.topologia === 'estrela') avisos.push('Satélite em estrela: um cabo por ponto desde o headend — conferir ocupação da prumada (quantidade de cabos).');
    avisos.push('TV aberta via satélite: a recepção doméstica migrou da banda C para a banda Ku (liberação da faixa de 3,5 GHz para o 5G) — conferir satélite, transponders e polarizações vigentes das emissoras. [CONFERIR]');
  }

  // ── pontos e unidades (expostos para a planta) ──
  const unidades = [];
  const posPorTorrePav = new Map();
  (deriv ? deriv.torres : []).forEach(t => t.posicoes.forEach(p => { if (!posPorTorrePav.has(`${t.nome}|${p.k}`)) posPorTorrePav.set(`${t.nome}|${p.k}`, p); }));
  const msPorTorrePav = new Map();
  (ms ? ms.linhas : []).forEach(l => { if (!l.area && !msPorTorrePav.has(`${l.torre}|${l.k}`)) msPorTorrePav.set(`${l.torre}|${l.k}`, l); });
  E.torres.forEach(t => {
    for (let i = 0; i < t.pavimentos; i++) {
      const k = t.primeiro + t.pavimentos - 1 - i;
      const p = posPorTorrePav.get(`${t.nome}|${k}`);
      const l = msPorTorrePav.get(`${t.nome}|${k}`);
      for (let u = 1; u <= t.unidades; u++) {
        const id = `${k}${String(u).padStart(2, '0')}`;
        const tomadas = t.ambientes.map((amb, j) => {
          const comSat = j < t.pontosSat;
          const tipoTomada = E.terrPorMs || (E.temSat && !E.temTerr) ? (E.terrPorMs ? 'TV/SAT' : 'SAT') : 'TV';
          return {
            id: `TV-${id}-${j + 1}`, ambiente: amb, tipo: tipoTomada,
            ...(E.temDerivadores ? { nivelTerrMin: p?.tomadaMin, nivelTerrMax: p?.tomadaMax } : {}),
            ...(E.terrPorMs ? { nivelTerrMin: l?.terrMin, nivelTerrMax: l?.terrMax } : {}),
            ...(comSat && l && !E.temDerivadores ? { nivelSatMin: l.satMin, nivelSatMax: l.satMax } : {}),
          };
        });
        if (E.temDerivadores && E.temSat) {
          // rede separada: tomada SAT própria nos ambientes com satélite
          t.ambientes.slice(0, t.pontosSat).forEach((amb, j) => tomadas.push({ id: `SAT-${id}-${j + 1}`, ambiente: amb, tipo: 'SAT', nivelSatMin: l?.satMin, nivelSatMax: l?.satMax }));
        }
        unidades.push({ torre: t.nome, pavimento: rotuloPav(k), k, unidade: id, derivador: p ? `${p.saidas} saída(s) ${p.derivacao} dB` : null, multiswitch: l ? l.multiswitch : null, tomadas });
      }
    }
  });
  // planta tipo: tomadas por ambiente da unidade-tipo de cada torre (para a planta DXF)
  const plantaTipo = E.torres.map(t => ({
    torre: t.nome,
    ambientes: t.ambientes.map((amb, j) => ({ ambiente: amb, tomadasTv: E.temTerr || E.terrPorMs ? 1 : 0, tomadasSat: j < t.pontosSat ? 1 : 0, combinada: E.terrPorMs })),
  }));
  const pontosAreas = E.areas.map(x => ({ ambiente: x.nome, tomadasTv: E.temTerr ? x.pontos : 0, tomadasSat: x.pontosSat, combinada: E.terrPorMs }));

  const nUnidades = E.torres.reduce((acc, t) => acc + t.pavimentos * t.unidades, 0);
  const pontosUnidades = E.torres.reduce((acc, t) => acc + t.pavimentos * t.unidades * t.pontos, 0);
  const pontosAreasTotal = E.areas.reduce((acc, x) => acc + x.pontos, 0);
  const nPontos = pontosUnidades + pontosAreasTotal;
  const pontosSat = E.torres.reduce((acc, t) => acc + t.pavimentos * t.unidades * t.pontosSat, 0) + E.areas.reduce((acc, x) => acc + x.pontosSat, 0);
  const pontosDeriv = E.temDerivadores ? nPontos : 0;
  const nPavimentos = E.torres.reduce((acc, t) => acc + t.pavimentos, 0);

  const quant = quantitativos(E, deriv, ms, { nUnidades, nPontos, pontosSat, pontosDeriv, nPavimentos });
  return {
    E, tipo: E.tipo, deriv, ms, avisos,
    nUnidades, nPontos, pontosSat, pontosDeriv, nPavimentos,
    unidades, plantaTipo, pontosAreas,
    ...quant,
  };
}

function quantitativos(E, deriv, ms, tot) {
  const linhasSat = E.temSat ? 4 : 0;
  const linhasTerrAnt = E.antenasUhf;
  const fator = 1 + E.reserva / 100;
  let caboRg6 = 0;
  let caboPrum = 0; // prumada/tronco (RG-6 ou RG-11)
  let segmentos = 0;
  let caboUnidades = 0;
  // antena → headend
  caboRg6 += E.dAH * (linhasTerrAnt + linhasSat);
  segmentos += linhasTerrAnt + linhasSat;
  const derivadores = new Map();
  const atenuadores = new Map();
  const addAtt = (v, q) => { decomporAtenuador(v).forEach(x => atenuadores.set(x, (atenuadores.get(x) || 0) + q)); };
  const divisores = new Map();
  const addDiv = (rotulo, q) => divisores.set(rotulo, (divisores.get(rotulo) || 0) + q);
  let terminadores = 0;
  let caixasPrumada = 0;
  let prumadaServico = 0;
  if (deriv) {
    if (deriv.split.vias) { addDiv(`Divisor ${deriv.split.vias} vias 5–1 000 MHz (headend)`, 1); terminadores += deriv.split.sobra; segmentos += 1; }
    if (deriv.splitAreas.vias) { addDiv(`Divisor ${deriv.splitAreas.vias} vias 5–1 000 MHz (ramal das áreas comuns)`, 1); terminadores += deriv.splitAreas.sobra; segmentos += 1; }
    if (deriv.atenuadorEntrada) addAtt(deriv.atenuadorEntrada, 1);
    deriv.torres.forEach(t => {
      caboPrum += t.dHead + t.caboPrumada;
      prumadaServico += t.dHead + t.caboPrumada;
      segmentos += 1 + t.posicoes.length; // tronco + trechos entre derivadores
      caixasPrumada += t.pavimentos;
      terminadores += 1; // fim da prumada
      t.posicoes.forEach(p => {
        const ch = `${p.saidas}|${p.derivacao}`;
        derivadores.set(ch, (derivadores.get(ch) || 0) + 1);
        terminadores += p.saidas - p.unidades;
        if (p.atenuador) addAtt(p.atenuador, p.unidades);
        if (p.ampLinha) segmentos += 1;
      });
      const nU = t.pavimentos * t.unidades;
      caboUnidades += nU * (t.dMed + t.pontos * E.interna);
      if (t.pontos > 1) {
        addDiv(`Divisor ${t.divisorUnidade.vias} vias 5–1 000 MHz (caixa da unidade)`, nU);
        terminadores += nU * t.divisorUnidade.sobra;
        segmentos += nU * (1 + t.pontos);
      } else segmentos += nU;
    });
    deriv.areas.forEach(x => {
      caboUnidades += x.d + x.pontos * E.interna;
      if (x.pontos > 1) { addDiv(`Divisor ${x.divisor.vias} vias 5–1 000 MHz (área comum)`, 1); terminadores += x.divisor.sobra; segmentos += 1 + x.pontos; } else segmentos += 1;
      if (x.atenuador) addAtt(x.atenuador, x.pontos);
    });
    if (deriv.G > 0) segmentos += 1;
  }
  const multiswitches = new Map();
  if (ms) {
    ms.mss.forEach(s => multiswitches.set(s, (multiswitches.get(s) || 0) + 1));
    const linhasMs = 5;
    if (E.sat.topologia === 'cascata') {
      caboPrum += ms.caboTronco * linhasMs;
      prumadaServico += ms.caboTronco * linhasMs;
      const torresMs = E.torres.filter(t => t.pontosSat);
      caixasPrumada += deriv ? 0 : torresMs.reduce((acc, t) => acc + t.pavimentos, 0);
      segmentos += ms.linhas.length * linhasMs + torresMs.length * linhasMs;
      terminadores += torresMs.length * linhasMs + (E.areasMs.length ? linhasMs : 0); // fim do tronco de cada cascata
      if (ms.divisorTronco && ms.divisorTronco.vias > 1) {
        addDiv(`Divisor ${ms.divisorTronco.sat.vias} vias 5–2 400 MHz (tronco de FI, 4 linhas)`, 4);
        addDiv(`Divisor ${ms.divisorTronco.terr.vias} vias 5–1 000 MHz (tronco terrestre do multiswitch)`, 1);
        terminadores += 5 * ms.divisorTronco.sat.sobra;
      }
      E.torres.filter(t => t.pontosSat).forEach(t => { caboUnidades += t.pavimentos * t.unidades * t.pontosSat * (t.dMed + E.interna); });
    } else {
      terminadores += linhasMs;
      ms.linhas.forEach(l => { caboUnidades += l.pontosMs * ((l.prumada || 0) + l.dMed + E.interna); prumadaServico += l.pontosMs * (l.prumada || 0); });
    }
    E.areasMs.forEach(x => { if (E.sat.topologia === 'cascata') caboUnidades += x.pontosSat * (x.d + E.interna); });
    segmentos += tot.pontosSat;
    const saidasTot = ms.mss.reduce((acc, s) => acc + s, 0);
    terminadores += saidasTot - tot.pontosSat;
    segmentos += ms.nMs * linhasMs; // jumpers de cascata/entrada
    if (!E.terrPorMs) terminadores += ms.nMs; // entrada terrestre não usada
  }
  caboRg6 += caboUnidades;
  if (E.caboPrumada === 'RG-6') { caboRg6 += caboPrum; caboPrum = 0; }
  const conectores = Math.ceil(segmentos * 2 * 1.1);
  const ampsTerr = (deriv && deriv.amplificador ? 1 : 0) + (ms && ms.ampTerr ? 1 : 0);
  const ampsLinhaTerr = deriv ? deriv.nAmpsLinha : 0;
  const ampsSat = ms && ms.ampSat ? 1 : 0;
  const ampsLinhaSat = ms ? ms.ampsLinha.length : 0;
  const ganhoHead = deriv?.amplificador?.ganho ?? ms?.ampTerr?.ganho;
  const dps = linhasTerrAnt + linhasSat + (E.torres.length > 1 ? (E.torres.length - 1) * ((deriv ? 1 : 0) + (ms && E.sat.topologia === 'cascata' ? 5 : 0)) : 0);

  const mat = [];
  const add = (codigo, descricao, unidade, quantidade, referencia) => { if (quantidade > 0) mat.push({ codigo, descricao, unidade, quantidade, referencia }); };
  if (E.temTerr) add('ANT-UHF', 'Antena UHF para TV digital (log-periódica/yagi, canais 14–51, polarização horizontal, ganho ≥ 10 dBi)', 'un', E.antenasUhf, 'ISDB-Tb — NBR 15604 [CONFERIR ganho]');
  if (E.temSat) {
    add('ANT-KU', `Antena parabólica offset banda Ku Ø ${E.sat.diametro} cm com suporte de fixação`, 'un', 1, 'Satélite banda Ku [CONFERIR diâmetro]');
    add('LNBF', 'LNBF banda Ku quattro (4 saídas fixas V/H × banda baixa/alta) para multiswitch', 'un', 1, 'Banda Ku 10,7–12,75 GHz');
  }
  add('MASTRO', 'Mastro de aço galvanizado 1½" × 3 m com base, abraçadeiras e estais', 'un', 1, 'NBR 6123 (vento) [CONFERIR]');
  add('HEAD', 'Caixa metálica/rack de headend com ventilação, tomada e BEL', 'un', 1, 'EN 60728-11');
  if (ampsTerr) add('AMP-H', `Amplificador de headend UHF banda larga, ganho ajustável até ${E.amp.ganhoMax} dB (ajuste ${ganhoHead} dB), saída máx. ${E.amp.vmax} dBµV (DIN 45004B)`, 'un', ampsTerr, 'Cálculo de níveis');
  if (ampsLinhaTerr) add('AMP-L', `Amplificador de linha UHF 5–1 000 MHz, ganho até ${E.amp.linhaMax} dB (prumada)`, 'un', ampsLinhaTerr, 'Cálculo de níveis');
  if (ampsSat) add('AMP-SAT', `Amplificador de FI 950–2 150 MHz para 4 linhas de satélite (ajuste ${ms.ampSat.ganho} dB)`, 'un', ampsSat, 'Cálculo de níveis');
  if (ampsLinhaSat) add('AMP-SAT-L', `Amplificador de linha de FI 950–2 150 MHz para tronco de 4 linhas, ganho até ${E.sat.linhaMax} dB`, 'un', ampsLinhaSat, 'Cálculo de níveis');
  [...multiswitches.entries()].sort((x, y) => y[0] - x[0]).forEach(([s, q]) => add('MS', `Multiswitch 5×${s} (4 SAT + TERR) cascateável${E.sat.ganhoMs > 0 ? ' ativo' : ''}`, 'un', q, 'SMATV'));
  [...derivadores.entries()].sort().forEach(([ch, q]) => { const [s, T] = ch.split('|'); add('DER', `Derivador ${s} saída(s) ${T} dB 5–1 000 MHz, conector F`, 'un', q, 'Cálculo de níveis — equalização da prumada'); });
  [...divisores.entries()].forEach(([rot, q]) => add('DIV', rot, 'un', q, 'Cálculo de níveis'));
  [...atenuadores.entries()].sort((x, y) => x[0] - y[0]).forEach(([v, q]) => add('ATT', `Atenuador fixo ${v} dB 75 Ω, conector F`, 'un', q, 'Nível máximo na tomada'));
  add('TERM', 'Terminador (carga) 75 Ω, conector F', 'un', terminadores, 'Casamento de impedância');
  add('RG6', 'Cabo coaxial RG-6 75 Ω, malha ≥ 60 %, capa PVC (rolo de 100 m)', 'm', Math.ceil(caboRg6 * fator), `Atenuação ${r1(E.a.max * 100)} dB/100 m a ${E.fMax} MHz`);
  if (caboPrum > 0) add('RG11', 'Cabo coaxial RG-11 75 Ω para prumada/tronco', 'm', Math.ceil(caboPrum * fator), `Atenuação ${r1(E.a.prumMax * 100)} dB/100 m a ${E.fMax} MHz`);
  add('CON-F', 'Conector F de compressão para RG-6', 'un', conectores, 'Estimativa: 2 por trecho de cabo + 10 %');
  const tvSimples = E.temDerivadores ? tot.nPontos : 0;
  const tvSat = E.terrPorMs ? tot.pontosSat : 0;
  const soSat = E.temSat && !E.terrPorMs ? tot.pontosSat : 0;
  add('TOM-TV', 'Tomada de TV terminal 75 Ω (conector F) com espelho 4×2', 'un', tvSimples, 'Ponto de TV');
  add('TOM-TVSAT', 'Tomada TV/SAT diplexada (saídas TV e SAT) com espelho 4×2', 'un', tvSat, 'Ponto de TV/SAT');
  add('TOM-SAT', 'Tomada SAT (conector F, 5–2 400 MHz) com espelho 4×2', 'un', soSat, 'Ponto de satélite');
  add('CX-PRU', 'Caixa de passagem na prumada para derivador/multiswitch (por pavimento)', 'un', caixasPrumada, 'NBR 14565 (caminhos)');
  add('DPS-COAX', 'DPS coaxial 75 Ω (protetor de surto, conector F) ligado ao BEL', 'un', dps, 'NBR 5419-4 / NBR 5410');
  add('ATER', 'Cabo de cobre 16 mm² para equipotencialização do mastro ao SPDA/BEP', 'm', Math.ceil(E.distAterramento * 1.1), 'NBR 5419-3 / EN 60728-11 [CONFERIR]');
  add('ATER-K', 'Kit de aterramento do mastro (abraçadeira, terminal e conector)', 'un', 1, 'EN 60728-11');

  return {
    materiais: mat, caboRg6: Math.ceil(caboRg6 * fator), caboRg11: Math.ceil(caboPrum * fator), conectores, terminadores, dps,
    nDerivadores: [...derivadores.values()].reduce((x, y) => x + y, 0),
    nMultiswitch: ms ? ms.nMs : 0,
    amplificadores: { headendTerr: ampsTerr, linhaTerr: ampsLinhaTerr, headendSat: ampsSat, linhaSat: ampsLinhaSat, total: ampsTerr + ampsLinhaTerr + ampsSat + ampsLinhaSat },
    prumadaM: Math.ceil(prumadaServico * fator),
  };
}

module.exports = {
  calcular, lerEntradas, atenuacao, faixaCanal, divisor, escolherDerivador, atenuadorMin, multiswitchesPara,
  CABOS, DERIVADORES, DIVISORES, DIVISORES_SAT, ATENUADORES, SAIDAS_MULTISWITCH, RUIDO_TERMICO_DBUV, SAT_F_MIN, SAT_F_MAX,
};
