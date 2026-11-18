// Pavimentos de um desenho: cada planta baixa do mesmo arquivo é um pavimento próprio.
//
// Pedido do usuário (18/11/2026): "o sistema não é capaz de reconhecer e separar, nos
// projetos, pavimentos separados no mesmo projeto — o da Nossa Senhora de Assunção tem
// subsolo, térreo, primeiro e segundo andar e o sistema vê tudo como um pavimento só".
// O DWG da paróquia tem as cinco plantas (subsolo, térreo, 1º, 2º e cobertura) lado a
// lado no espaço do modelo, ENCOSTADAS umas nas outras (o limite do terreno e as
// molduras da prancha se tocam): a separação por manchas (./classificarPrancha.js) não
// acha vão entre elas e devolve uma região só, com 41 "ambientes" misturados.
//
// Como separa: dentro de cada região de planta, os títulos de planta que dizem o
// pavimento ("PLANTA BAIXA - SUBSOLO", "PLANTA BAIXA 1º PAVIMENTO", "PLANTA DE
// COBERTURA") são as âncoras. Com dois ou mais pavimentos diferentes, a região é cortada
// entre eles no eixo em que os títulos se espalham:
//   1) na divisa de moldura (layer PRANCHA/MOLDURA/FOLHA… — a moldura de cada planta) que
//      fica entre os dois títulos; é o corte que o desenhista já fez;
//   2) sem moldura entre eles, no vale de traços (onde o desenho é mais ralo) entre os dois.
// Cada pedaço vira uma região de planta com o pavimento (nome, ordem) e o título dele.
//
//   pavimentoDoTitulo(s) → { chave, nome, ordem } | null
//   dividirPorPavimentos(regiao, { textos, segmentos }) → [regiao, …] (cada uma com .pavimento)
const { tipoDoTitulo } = require('./classificarPrancha');

const sem = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const ORDINAIS = { PRIMEIRO: 1, SEGUNDO: 2, TERCEIRO: 3, QUARTO: 4, QUINTO: 5, SEXTO: 6, SETIMO: 7, OITAVO: 8, NONO: 9, DECIMO: 10 };
const nomeAndar = (n) => `${n}º pavimento`;

// Título de planta → pavimento. Só o que é título de planta ("PLANTA BAIXA - TÉRREO",
// "2º PAVIMENTO", "PLANTA - COBERTURA"); "ESCADA SOBE 1º PAVIMENTO" e "PROJEÇÃO PAV.
// SUPERIOR" não são título e ficam de fora.
function pavimentoDoTitulo(s) {
  const t = sem(s);
  if (!t || t.length > 70) return null;
  const titulo = tipoDoTitulo(String(s).trim()) === 'planta' || /^PLANTA\b/.test(t);
  if (!titulo) return null;
  let m;
  if ((m = /(\d+)\s*[º°OA]?\s*SUB\s*-?\s*SOLO|SUB\s*-?\s*SOLO\s*(\d+)/.exec(t))) { const n = Number(m[1] || m[2]) || 1; return { chave: `subsolo${n}`, nome: n > 1 ? `${n}º subsolo` : 'Subsolo', ordem: -n }; }
  if (/SUB\s*-?\s*SOLO/.test(t)) return { chave: 'subsolo1', nome: 'Subsolo', ordem: -1 };
  if (/\bSEMI\s*-?\s*ENTERRADO/.test(t)) return { chave: 'subsolo1', nome: 'Subsolo', ordem: -1 };
  if (/\bT[E]RREO\b/.test(t)) return { chave: 'terreo', nome: 'Térreo', ordem: 0 };
  if (/\bMEZANINO\b/.test(t)) return { chave: 'mezanino', nome: 'Mezanino', ordem: 0.5 };
  if (/\bCOBERTURA\b|\bTELHADO\b/.test(t)) return { chave: 'cobertura', nome: 'Cobertura', ordem: 1000 };
  if (/\bATICO\b|\bBARRILETE\b|CASA\s+DE\s+MAQUINAS/.test(t)) return { chave: 'atico', nome: 'Ático / barrilete', ordem: 999 };
  if (/\b(PAVIMENTO|PAV\.?)\s+TIPO\b|\bTIPO\b/.test(t)) return { chave: 'tipo', nome: 'Pavimento tipo', ordem: 500 };
  if ((m = /\b(\d{1,2})\s*[º°OA]?\s*(PAVIMENTO|PAV\b|PAV\.|ANDAR)/.exec(t)) || (m = /\b(?:PAVIMENTO|PAV\.?|ANDAR)\s*[-–:]?\s*0?(\d{1,2})\b/.exec(t))) {
    const n = Number(m[1]);
    if (n >= 1 && n <= 60) return { chave: `pav${n}`, nome: nomeAndar(n), ordem: n };
  }
  if ((m = /\b(PRIMEIRO|SEGUNDO|TERCEIRO|QUARTO|QUINTO|SEXTO|SETIMO|OITAVO|NONO|DECIMO)\s+(PAVIMENTO|PAV\b|PAV\.|ANDAR)/.exec(t))) {
    const n = ORDINAIS[m[1]];
    return { chave: `pav${n}`, nome: nomeAndar(n), ordem: n };
  }
  if (/\bSUPERIOR\b/.test(t) && /PAVIMENTO|PAV\b|PAV\./.test(t)) return { chave: 'superior', nome: 'Pavimento superior', ordem: 1 };
  return null;
}

const RE_LAYER_MOLDURA = /MARGEM|MOLDURA|PRANCHA|FOLHA|FORMATO|SHEET|BORDER|FRAME|VIEWPORT|JANELA\s*DE\s*VISTA/i;
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };

// Divisas de moldura no eixo: x das verticais longas (ou y das horizontais) e as pontas das
// perpendiculares, só das layers de moldura
function divisasDeMoldura(segmentos, caixa, eixo) {
  const k = eixo === 'x' ? 0 : 1, o = 1 - k;
  const altura = caixa[3 - k] - caixa[1 - k]; // tamanho no outro eixo
  const lista = [];
  for (const s of segmentos) {
    if (!RE_LAYER_MOLDURA.test(s.layer || '')) continue;
    const d0 = Math.abs(s.a[k] - s.b[k]), d1 = Math.abs(s.a[o] - s.b[o]);
    if (d0 <= 0.002 * (d1 || 1) && d1 >= 0.25 * altura) lista.push((s.a[k] + s.b[k]) / 2); // perpendicular ao eixo: a divisa
    else if (d1 <= 0.002 * (d0 || 1) && d0 >= 5) lista.push(s.a[k], s.b[k]); // ao longo do eixo: as pontas
  }
  return lista;
}

// Vale de traços entre a e b (no eixo): o ponto do intervalo com menos pontos médios de
// segmento por perto (janela de 1,5 m), longe dos títulos (15 % do vão de cada lado)
function vale(segmentos, caixa, eixo, a, b) {
  const k = eixo === 'x' ? 0 : 1;
  const ini = a + 0.15 * (b - a), fim = b - 0.15 * (b - a);
  if (!(fim > ini)) return (a + b) / 2;
  const passo = Math.max(0.25, (fim - ini) / 400);
  const n = Math.ceil((fim - ini) / passo) + 1;
  const hist = new Float64Array(n);
  for (const s of segmentos) {
    const m = (s.a[k] + s.b[k]) / 2;
    if (m < ini - 2 || m > fim + 2) continue;
    const i = Math.round((m - ini) / passo);
    const w = Math.max(1, Math.round(0.75 / passo));
    for (let j = Math.max(0, i - w); j <= Math.min(n - 1, i + w); j++) hist[j]++;
  }
  let melhor = 0;
  for (let i = 1; i < n; i++) if (hist[i] < hist[melhor] || (hist[i] === hist[melhor] && Math.abs(ini + i * passo - (a + b) / 2) < Math.abs(ini + melhor * passo - (a + b) / 2))) melhor = i;
  return ini + melhor * passo;
}

function dividirPorPavimentos(regiao, { textos = [], segmentos = [] } = {}) {
  const c = regiao.caixa;
  const folga = Math.max(3, 0.06 * Math.max(c[2] - c[0], c[3] - c[1]));
  const naCaixa = (t) => t.x >= c[0] - folga && t.x <= c[2] + folga && t.y >= c[1] - folga && t.y <= c[3] + folga;
  const titulos = textos.filter(naCaixa).map(t => ({ t, p: pavimentoDoTitulo(t.s) })).filter(x => x.p);
  const porChave = new Map();
  for (const x of titulos) (porChave.get(x.p.chave) || porChave.set(x.p.chave, { p: x.p, ts: [] }).get(x.p.chave)).ts.push(x.t);
  const grupos = [...porChave.values()];
  const comTitulo = (g) => ({ titulo: g.ts.slice().sort((p, q) => q.h - p.h)[0].s.trim().slice(0, 60), pavimento: g.p });
  if (grupos.length === 0) return [regiao];
  if (grupos.length === 1) return [{ ...regiao, ...comTitulo(grupos[0]) }];
  // eixo: o em que os títulos dos pavimentos se espalham mais (relativo ao tamanho da região)
  // posição de cada pavimento: a média dos títulos dele, sem as cópias no mesmo lugar (o DWG da paróquia tem o título
  // duas vezes, uma em cima da outra, e a mediana caía na cópia e não no meio da planta)
  for (const g of grupos) {
    const unicos = g.ts.filter((t, i) => g.ts.findIndex(o => Math.abs(o.x - t.x) < 0.5 && Math.abs(o.y - t.y) < 0.5) === i);
    g.mx = unicos.reduce((s, t) => s + t.x, 0) / unicos.length;
    g.my = unicos.reduce((s, t) => s + t.y, 0) / unicos.length;
  }
  const esp = (k) => (Math.max(...grupos.map(g => g[k])) - Math.min(...grupos.map(g => g[k])));
  const eixo = esp('mx') / ((c[2] - c[0]) || 1) >= esp('my') / ((c[3] - c[1]) || 1) ? 'x' : 'y';
  const km = eixo === 'x' ? 'mx' : 'my';
  // no eixo y, a leitura é de cima para baixo (a planta de cima primeiro)
  grupos.sort((a, b) => (eixo === 'x' ? a[km] - b[km] : b[km] - a[km]));
  // dois pavimentos com o título no mesmo lugar (a mesma planta com dois nomes): não corta
  const lado = eixo === 'x' ? c[2] - c[0] : c[3] - c[1];
  if (grupos.some((g, i) => i && Math.abs(g[km] - grupos[i - 1][km]) < Math.min(0.05 * lado, 3))) return [regiao];
  const divisas = divisasDeMoldura(segmentos, c, eixo);
  const cortes = [];
  for (let i = 1; i < grupos.length; i++) {
    const a = Math.min(grupos[i - 1][km], grupos[i][km]), b = Math.max(grupos[i - 1][km], grupos[i][km]);
    const meio = (a + b) / 2;
    const naFaixa = divisas.filter(v => v > a + 0.05 * (b - a) && v < b - 0.05 * (b - a));
    // a divisa de moldura mais perto do meio; sem moldura, o vale de traços
    const corte = naFaixa.length ? naFaixa.sort((p, q) => Math.abs(p - meio) - Math.abs(q - meio))[0] : vale(segmentos, c, eixo, a, b);
    cortes.push(corte);
  }
  const k0 = eixo === 'x' ? 0 : 1;
  const lim = [c[k0], ...(eixo === 'x' ? cortes : cortes.slice().sort((p, q) => p - q)), c[k0 + 2]];
  if (eixo === 'y') grupos.reverse(); // de baixo para cima, como os limites
  return grupos.map((g, i) => {
    const caixa = c.slice();
    caixa[k0] = lim[i]; caixa[k0 + 2] = lim[i + 1];
    return { ...regiao, caixa, ...comTitulo(g), dividida: true };
  });
}

// ordem de leitura dos pavimentos (subsolo → térreo → andares → cobertura)
const ordemDoPavimento = (p) => (p && Number.isFinite(p.ordem) ? p.ordem : 1e6);

// ── Níveis de piso e alinhamento vertical (versão 2.46, 18/11/2026) ─────────────────────────────────────────
// "Pé-direito por pavimento lido do corte" e "pavimentos alinhados na vertical". A cota de nível do piso está escrita
// nas plantas e no corte ("+0,10", "-4,50", "+5,15"); cada planta tem muitas (rampa, degrau, piso elevado), mas a
// MAIS repetida, na ordem do prédio e sempre subindo, é o piso do pavimento. No DWG da paróquia: subsolo −4,50, térreo
// +0,10, 1º +5,15, 2º +9,59 e cobertura +15,02 — a altura entre pisos sai da diferença (4,60; 5,05; 4,44 m).
const RE_NIVEL = /^\s*(?:N[ÍI]VEL|NV\.?|N\.|EL\.?)?\s*([+\-±])?\s*(\d{1,3}[.,]\d{2,3})\s*(?:m)?\s*$/i;
const LAJE_ADOTADA_M = 0.2; // espessura de laje + forro descontada da altura entre pisos — critério [CONFERIR]
function niveisDosPavimentos(pavimentos, textos = []) {
  const candidatos = pavimentos.map((p) => {
    const vals = [];
    for (const t of textos) {
      if (!(t.x >= p.caixa[0] && t.x <= p.caixa[2] && t.y >= p.caixa[1] && t.y <= p.caixa[3])) continue;
      const m = RE_NIVEL.exec(String(t.s || ''));
      if (!m) continue;
      const v = (m[1] === '-' ? -1 : 1) * Number(m[2].replace(',', '.'));
      if (Math.abs(v) <= 300) vals.push(v);
    }
    vals.sort((a, b) => a - b);
    const grupos = [];
    for (const v of vals) { const g = grupos[grupos.length - 1]; if (g && v - g.ult <= 0.05) { g.soma += v; g.n++; g.ult = v; } else grupos.push({ soma: v, n: 1, ult: v }); }
    return grupos.filter(g => g.n >= 2).map(g => ({ v: Math.round((g.soma / g.n) * 100) / 100, n: g.n }));
  });
  // um nível por pavimento (ou nenhum), sempre subindo ≥ 2 m por pavimento, com o maior total de cotas
  const k = pavimentos.length;
  const melhor = []; // melhor[i][j] = { total, de: [i', j'] }
  for (let i = 0; i < k; i++) {
    melhor[i] = candidatos[i].map((c) => {
      let m = { total: c.n, de: null };
      for (let i2 = 0; i2 < i; i2++) candidatos[i2].forEach((c2, j2) => {
        if (c.v - c2.v >= 2 * (i - i2) && melhor[i2][j2].total + c.n > m.total) m = { total: melhor[i2][j2].total + c.n, de: [i2, j2] };
      });
      return m;
    });
  }
  let fim = null;
  melhor.forEach((l, i) => l.forEach((m, j) => { if (!fim || m.total > fim.total) fim = { total: m.total, i, j }; }));
  const escolhido = new Array(k).fill(null);
  for (let at = fim && [fim.i, fim.j]; at; at = melhor[at[0]][at[1]].de) escolhido[at[0]] = candidatos[at[0]][at[1]];
  if (escolhido.filter(Boolean).length < 2) return pavimentos.map(() => null);
  return escolhido.map((c, i) => {
    if (!c) return null;
    const prox = escolhido.slice(i + 1).findIndex(Boolean);
    const entre = prox === 0 ? Math.round((escolhido[i + 1].v - c.v) * 100) / 100 : null; // só com o pavimento de cima lido
    return { nivel_m: c.v, cotas: c.n, entre_pisos_m: entre, pe_direito_m: entre ? Math.round((entre - LAJE_ADOTADA_M) * 100) / 100 : null };
  });
}

// Alinhamento vertical: o deslocamento que leva cada planta para o lugar dela no prédio (as plantas ficam lado a lado
// no desenho). Âncora: o que atravessa os pavimentos — escada, elevador, poço, shaft — casado com o do pavimento de
// referência (térreo); sem âncora, a posição da planta dentro da moldura dela (as pranchas do arquiteto repetem a
// moldura) — [CONFERIR]. coords no prédio = coords da planta + deslocamento.
const RE_ANCORA = /ESCADA|ELEVADOR|\bPO[CÇ]O\b|SHAFT|PRUMADA/;
function alinharPavimentos(pavimentos, ambientes) {
  const doPav = (n) => ambientes.filter(a => a.pavimento === n);
  const ref = pavimentos.find(p => /TERREO/.test(sem(p.nome)) && doPav(p.nome).length) || pavimentos.find(p => doPav(p.nome).length);
  if (!ref) return pavimentos.map(() => null);
  const ancoras = (n) => doPav(n).filter(a => RE_ANCORA.test(sem(a.nome)) && a.centro);
  const ancRef = ancoras(ref.nome);
  return pavimentos.map((p) => {
    if (p === ref) return { deslocamento: [0, 0], metodo: 'referência' };
    const daMoldura = [ref.caixa[0] - p.caixa[0], ref.caixa[1] - p.caixa[1]];
    const larg = (c) => c[2] - c[0];
    const molduraParecida = Math.abs(larg(p.caixa) - larg(ref.caixa)) <= 0.15 * larg(ref.caixa);
    const anc = ancoras(p.nome);
    let melhor = null;
    for (const a of anc) for (const b of ancRef) {
      if (sem(a.nome).split(' ')[0] !== sem(b.nome).split(' ')[0]) continue; // escada com escada, elevador com elevador
      const t = [b.centro[0] - a.centro[0], b.centro[1] - a.centro[1]];
      const casam = anc.filter(x => ancRef.some(y => Math.hypot(x.centro[0] + t[0] - y.centro[0], x.centro[1] + t[1] - y.centro[1]) <= 2)).length;
      const longeDaMoldura = Math.hypot(t[0] - daMoldura[0], t[1] - daMoldura[1]);
      const nota = casam * 10 - (molduraParecida ? Math.min(10, longeDaMoldura) : 0);
      if (!melhor || nota > melhor.nota) melhor = { nota, t, casam, nomes: [a.nome, b.nome] };
    }
    if (melhor && (melhor.casam >= 2 || !molduraParecida || Math.hypot(melhor.t[0] - daMoldura[0], melhor.t[1] - daMoldura[1]) <= 6)) {
      return { deslocamento: melhor.t.map(v => Math.round(v * 100) / 100), metodo: `pela ${melhor.nomes[0].toLowerCase()} (casada com a do ${ref.nome})` };
    }
    // sem escada/elevador casado: as PAREDES que se repetem de um pavimento para o outro (contorno das salas em células
    // de 0,5 m) — o deslocamento que mais sobrepõe, perto do da moldura (ou do centro das salas)
    const ml = doPav(p.nome);
    if (!ml.length) return molduraParecida ? { deslocamento: daMoldura.map(v => Math.round(v * 100) / 100), metodo: 'pela moldura da planta [CONFERIR]' } : null;
    const meio = (l) => [l.reduce((s, a) => s + a.centro[0], 0) / l.length, l.reduce((s, a) => s + a.centro[1], 0) / l.length];
    const [mr, mp] = [meio(doPav(ref.nome)), meio(ml)];
    const doCentro = [mr[0] - mp[0], mr[1] - mp[1]];
    const corr = correlacionarParedes(ml, doPav(ref.nome), [daMoldura, doCentro]);
    if (corr) return { deslocamento: corr.t.map(v => Math.round(v * 100) / 100), metodo: `pelas paredes que se repetem (${Math.round(corr.fracao * 100)} % do contorno casado)${corr.fracao < 0.35 ? ' [CONFERIR]' : ''}` };
    if (molduraParecida) return { deslocamento: daMoldura.map(v => Math.round(v * 100) / 100), metodo: 'pela moldura da planta [CONFERIR]' };
    return { deslocamento: doCentro.map(v => Math.round(v * 100) / 100), metodo: 'pelo centro das salas [CONFERIR]' };
  });
}

// contorno das salas → células de 0,5 m; procura, a até 20 m de cada palpite, o deslocamento com mais células em comum
const CEL = 0.5;
function celulasDoContorno(ambs) {
  const s = new Set();
  for (const a of ambs) {
    const pol = a.poligono || [];
    for (let i = 0; i < pol.length; i++) {
      const [x1, y1] = pol[i], [x2, y2] = pol[(i + 1) % pol.length];
      const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (CEL / 2)));
      for (let k = 0; k <= n; k++) s.add(`${Math.round((x1 + ((x2 - x1) * k) / n) / CEL)},${Math.round((y1 + ((y2 - y1) * k) / n) / CEL)}`);
    }
  }
  return [...s].map(k => k.split(',').map(Number));
}
function correlacionarParedes(doPav, daRef, palpites) {
  const a = celulasDoContorno(doPav);
  const b = new Set(celulasDoContorno(daRef).map(([x, y]) => `${x},${y}`));
  if (a.length < 20 || b.size < 20) return null;
  const R = Math.round(20 / CEL);
  let melhor = null;
  for (const t0 of palpites) {
    const [cx, cy] = [Math.round(t0[0] / CEL), Math.round(t0[1] / CEL)];
    for (let dx = -R; dx <= R; dx++) for (let dy = -R; dy <= R; dy++) {
      let n = 0;
      for (const [x, y] of a) if (b.has(`${x + cx + dx},${y + cy + dy}`)) n++;
      if (!melhor || n > melhor.n) melhor = { n, t: [(cx + dx) * CEL, (cy + dy) * CEL] };
    }
  }
  const fracao = melhor.n / Math.min(a.length, b.size);
  return fracao >= 0.15 ? { t: melhor.t, fracao } : null;
}

// completa a lista de pavimentos da arquitetura com o nível, a altura entre pisos, o pé-direito e o alinhamento
function completarPavimentos(pavimentos, ambientes, textos) {
  if (!pavimentos.length) return pavimentos;
  const niveis = niveisDosPavimentos(pavimentos, textos);
  const alinhados = pavimentos.length > 1 ? alinharPavimentos(pavimentos, ambientes) : pavimentos.map(() => ({ deslocamento: [0, 0], metodo: 'referência' }));
  pavimentos.forEach((p, i) => Object.assign(p, niveis[i] || {}, alinhados[i] || {}));
  return pavimentos;
}

module.exports = { pavimentoDoTitulo, dividirPorPavimentos, ordemDoPavimento, niveisDosPavimentos, alinharPavimentos, completarPavimentos, LAJE_ADOTADA_M, paraTestes: { divisasDeMoldura, vale } };
