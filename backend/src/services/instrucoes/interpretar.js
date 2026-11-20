// INTERPRETADOR do campo de instruções da análise (versão 2.47, 20/11/2026). Determinístico: lê a frase do engenheiro
// ("acrescente 2 câmeras na capela e leve o rack para o CPD") pelo vocabulário (./vocabulario.js + o aprendido e
// aprovado), acha as salas e pavimentos pelos nomes da PRÓPRIA análise e devolve as operações já resolvidas em posição:
//
//   interpretar(texto, contexto) → { operacoes: [op], duvidas: [texto], entendeuAlgo }
//   op = { tipo: 'adicionar'|'retirar'|'mover'|'trocar'|'definir', descricao, simbolo, nome, quantidade, ambiente, pavimento,
//          adicionar: [{ simbolo, x, y, rotulo }], remover: [{ simbolo, x, y }], centros: { chave: { ambiente, pavimento } } }
//   contexto = { ambientes: [{ nome, pavimento, poligono, area_m2 }], pontos: [{ x, y, simbolo?, descricao?, disciplina? }],
//                disciplinas: [chaves da análise], pavimentos: [nomes], projetadas: [disciplinas do projeto sugerido],
//                aprendidas: { frase: [simbolos] } }
//
// As posições são as do 3D / espacial (referência da análise). Nada é gravado aqui: a tela mostra o que foi entendido e
// o engenheiro aplica (controllers/projetos/instrucoes.js). O que não for entendido volta em `duvidas`, dizendo o quê.
const path = require('path');
const { CAD } = require('../../config/caminhos');
const { dentro, centroide } = require(path.join(CAD, 'arquitetura.js'));
const P = require(path.join(CAD, 'posicionamento.js'));
const { componente, componentes } = require('../bibliotecaComponentes');
const { normalizar } = require('../agentes/textoPedido');
const V = require('./vocabulario');

// ── texto ────────────────────────────────────────────────────────────────
const MANTER = new Set(['mais', 'menos', 'tres', 'seis', 'dois', 'duas', 'depois', 'apos', 'pois', 'atras', 'gas', 'status', 'onibus', 'sem', 'dos', 'das', 'nos', 'nas', 'os', 'as']);
// singular de uma palavra (sem acento): cameras → camera, detectores → detector, centrais → central, botoes → botao
function singular(t) {
  if (t.length <= 3 || MANTER.has(t) || V.NUMEROS[t] || /\d/.test(t)) return t;
  if (t.endsWith('oes') || t.endsWith('aes')) return `${t.slice(0, -3)}ao`;
  if (t.endsWith('ais')) return `${t.slice(0, -3)}al`;
  if (t.endsWith('eis') && t.length > 5) return `${t.slice(0, -3)}el`;
  if (/(r|z|s)es$/.test(t)) return t.slice(0, -2);
  if (t.endsWith('ns')) return `${t.slice(0, -2)}m`;
  if (t.endsWith('s')) return t.slice(0, -1);
  return t;
}
// número escrito com zero à esquerda ou ordinal ("01", "1o", "1a") → "1"
const numero = (t) => (/^\d+[oa]?$/.test(t) ? String(Number(t.replace(/[oa]$/, ''))) : t);
const palavras = (s) => normalizar(s).trim().split(' ').filter(Boolean).map(numero);
// preposições/artigos que antecedem um lugar
const PREP_LUGAR = new Set(['no', 'na', 'nos', 'nas', 'em', 'do', 'da', 'dos', 'das', 'de', 'para', 'pra', 'pro', 'ate', 'ao', 'o', 'a', 'os', 'as', 'entre']);
const ARTIGOS = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'de', 'em', 'ao']);
const VAZIAS_NOME = new Set(['de', 'do', 'da', 'dos', 'das', 'e', 'o', 'a']);
// sinônimos de pavimento
const PAV_SIN = { andar: 'pavimento', pav: 'pavimento', piso: 'pavimento', pavto: 'pavimento', nivel: 'pavimento' };

// ── tokens da frase (com a forma singular e o índice original) ──
function tokensDe(texto) {
  return palavras(texto).map((t, i) => ({ t, s: singular(t), i, usado: null }));
}

// procura a sequência `seq` (formas singulares, sem palavras vazias) em toks a partir de cada posição; devolve [ini, fim]
function acharSequencia(toks, seq, livre = () => true) {
  if (!seq.length) return [];
  const achados = [];
  for (let k = 0; k < toks.length; k++) {
    let j = k, m = 0;
    const ini = k;
    while (j < toks.length && m < seq.length) {
      if (!livre(toks[j])) break;
      if (toks[j].s === seq[m] || toks[j].t === seq[m]) { m++; j++; continue; }
      if (m > 0 && VAZIAS_NOME.has(toks[j].t)) { j++; continue; } // "sala DE estar" casa "sala estar"
      break;
    }
    if (m === seq.length) achados.push([ini, j - 1]);
  }
  return achados;
}

// ── salas e pavimentos da análise ──
function prepararLugares(contexto) {
  const nomesPav = [...new Set([...(contexto.pavimentos || []), ...(contexto.ambientes || []).map(a => a.pavimento).filter(Boolean)])];
  const pavimentos = nomesPav.map(nome => {
    const seq = palavras(nome).map(t => PAV_SIN[t] || t).map(singular).filter(t => !VAZIAS_NOME.has(t));
    return { nome, seq };
  });
  const salas = (contexto.ambientes || []).filter(a => a?.nome && !a.semNome).map((a, k) => ({
    k, nome: a.nome, pavimento: a.pavimento || null, pol: Array.isArray(a.poligono) && a.poligono.length >= 3 ? a.poligono : null,
    area: Number(a.area_m2) || 0, seq: palavras(a.nome).map(singular).filter(t => !VAZIAS_NOME.has(t)),
  })).filter(s => s.seq.length);
  return { pavimentos, salas };
}

// marca na frase as salas (nome inteiro; uma palavra só quando vem depois de preposição) e os pavimentos
function marcarLugares(toks, { salas, pavimentos }) {
  const lugares = [];
  const livre = (t) => !t.usado;
  const precedidoDePreposicao = (ini) => ini > 0 && PREP_LUGAR.has(toks[ini - 1].t);
  // pavimentos: "1 pavimento", "terreo", "primeiro andar"
  for (const t of toks) if (V.ORDINAIS[t.t] && toks[t.i + 1] && PAV_SIN[toks[t.i + 1].t] !== undefined) { t.t = String(V.ORDINAIS[t.t]); t.s = t.t; }
  for (const t of toks) if (PAV_SIN[t.t]) { t.t = PAV_SIN[t.t]; t.s = t.t; }
  const candidatosPav = pavimentos.flatMap(p => acharSequencia(toks, p.seq, livre).map(([a, b]) => ({ p, a, b })))
    .sort((x, y) => (y.b - y.a) - (x.b - x.a));
  for (const c of candidatosPav) {
    if (toks.slice(c.a, c.b + 1).some(t => t.usado)) continue;
    toks.slice(c.a, c.b + 1).forEach(t => { t.usado = 'pavimento'; });
    lugares.push({ tipo: 'pavimento', pavimento: c.p.nome, a: c.a, b: c.b });
  }
  // salas pelo nome (a mais longa primeiro)
  const porNome = new Map();
  for (const s of salas) { const k = s.seq.join(' '); if (!porNome.has(k)) porNome.set(k, []); porNome.get(k).push(s); }
  const candidatosSala = [...porNome.entries()].flatMap(([, grupo]) => acharSequencia(toks, grupo[0].seq, livre).map(([a, b]) => ({ grupo, a, b })))
    .filter(c => c.grupo[0].seq.length >= 2 || precedidoDePreposicao(c.a))
    .sort((x, y) => (y.b - y.a) - (x.b - x.a) || y.grupo[0].seq.length - x.grupo[0].seq.length);
  for (const c of candidatosSala) {
    if (toks.slice(c.a, c.b + 1).some(t => t.usado)) continue;
    toks.slice(c.a, c.b + 1).forEach(t => { t.usado = 'sala'; });
    // "todas as circulações", "nas circulações": plural = todas as salas com esse nome
    const plural = toks.slice(c.a, c.b + 1).some(t => t.s !== t.t) || [1, 2].some(k => V.TODOS.has(toks[c.a - k]?.t));
    lugares.push({ tipo: 'sala', salas: c.grupo, nome: c.grupo[0].nome, a: c.a, b: c.b, plural });
  }
  // tipo de sala no plural/genérico: "nos quartos", "em cada banheiro", "todas as circulações"
  for (const t of toks) {
    if (t.usado || t.s.length < 4 || !(t.i > 0 && PREP_LUGAR.has(toks[t.i - 1].t) || (t.i > 1 && V.TODOS.has(toks[t.i - 1].t)) || (t.i > 1 && V.TODOS.has(toks[t.i - 2]?.t)))) continue;
    const doTipo = salas.filter(s => s.seq[0] === t.s);
    if (!doTipo.length || V.COMPONENTES[t.s]) continue;
    t.usado = 'sala';
    const plural = t.s !== t.t || V.TODOS.has(toks[t.i - 1]?.t) || V.TODOS.has(toks[t.i - 2]?.t);
    lugares.push({ tipo: 'sala', salas: doTipo, nome: doTipo.length === 1 ? doTipo[0].nome : t.s.toUpperCase(), a: t.i, b: t.i, plural, generico: true });
  }
  return lugares.sort((x, y) => x.a - y.a);
}

// componentes da frase (frase mais longa primeiro), sem tocar nas palavras de lugar
function marcarComponentes(toks, dicionario) {
  const achados = [];
  const frases = Object.keys(dicionario).map(f => ({ f, seq: f.split(' ').map(singular) })).sort((a, b) => b.seq.length - a.seq.length);
  for (const { f, seq } of frases) {
    for (const [a, b] of acharSequencia(toks, seq, t => !t.usado)) {
      if (toks.slice(a, b + 1).some(t => t.usado)) continue;
      toks.slice(a, b + 1).forEach(t => { t.usado = 'componente'; });
      const plural = toks.slice(a, b + 1).some(t => t.s !== t.t);
      achados.push({ frase: f, simbolos: dicionario[f], a, b, plural });
    }
  }
  // estrutura genérica ("a estrutura", "as centrais")
  for (const f of V.PALAVRAS_ESTRUTURA) {
    const seq = f.split(' ');
    for (const [a, b] of acharSequencia(toks, seq, t => !t.usado)) {
      if (toks.slice(a, b + 1).some(t => t.usado)) continue;
      toks.slice(a, b + 1).forEach(t => { t.usado = 'componente'; });
      achados.push({ frase: f, simbolos: Object.keys(V.ESTRUTURAS), a, b, plural: true, estrutura: true });
    }
  }
  return achados.sort((x, y) => x.a - y.a);
}

const verboDe = (t) => {
  for (const [radical, acao, inteira] of V.VERBOS) if (inteira ? t === radical : t.startsWith(radical) && t.length - radical.length <= 6) return acao;
  return null;
};

// quantidade escrita logo antes do componente (até 2 palavras antes: "mais 2", "duas novas")
function quantidadeAntes(toks, a) {
  for (let k = a - 1; k >= Math.max(0, a - 3); k--) {
    const t = toks[k];
    if (t.usado) break;
    if (/^\d+$/.test(t.t)) return Number(t.t);
    if (V.NUMEROS[t.t]) return V.NUMEROS[t.t];
    if (V.TODOS.has(t.t)) return 'todos';
  }
  return null;
}
// "para 3", "em 4", "total de 5" (definir)
function quantidadeAlvo(toks) {
  for (const t of toks) {
    if (t.usado) continue;
    if (/^\d+$/.test(t.t)) return Number(t.t);
    if (V.NUMEROS[t.t] && !['um', 'uma'].includes(t.t)) return V.NUMEROS[t.t];
  }
  return null;
}

// ── trechos: uma ação por trecho ("acrescente ... e retire ..." são dois) ──
function trechos(toks) {
  const out = [];
  let atual = null;
  for (const t of toks) {
    const acao = !t.usado ? verboDe(t.t) : null;
    const modificador = ['mais', 'menos', 'sem', 'por', 'poe', 'add'].includes(t.t);
    if (acao && (!atual || (atual.acao && !(modificador && atual.acao) && !(atual.acao === 'trocar' && t.t === 'por')))) {
      if (atual) out.push(atual);
      atual = { acao, toks: [t], verbo: t.t };
      t.usado = 'verbo';
      continue;
    }
    if (acao && atual && !atual.acao) { atual.acao = acao; t.usado = 'verbo'; }
    if (acao && modificador && atual) {
      t.usado = 'verbo';
      if (t.t === 'mais' && ['definir', null].includes(atual.acao)) atual.acao = 'adicionar';
      if (t.t === 'menos' && ['definir', null].includes(atual.acao)) atual.acao = 'retirar';
    }
    if (!atual) atual = { acao: null, toks: [] };
    atual.toks.push(t);
  }
  if (atual) out.push(atual);
  return out;
}

// ── geometria ──
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
const r2 = (v) => Math.round(v * 100) / 100;
function candidatosNaSala(pol, montagem) {
  const area = Math.abs(pol.reduce((s, p, i) => s + p[0] * pol[(i + 1) % pol.length][1] - pol[(i + 1) % pol.length][0] * p[1], 0) / 2) || 1;
  const perim = pol.reduce((s, p, i) => s + dist(p, pol[(i + 1) % pol.length]), 0);
  let c;
  if (montagem === 'canto') c = P.nosCantos(pol, pol.length, { recuo: 0.4 });
  else if (montagem === 'teto' || montagem === 'piso') c = P.emGrade(pol, Math.max(0.8, Math.sqrt(area) / 6));
  else c = P.noPerimetro(pol, Math.max(4, Math.round(perim / 0.6)), { recuo: 0.15, fase: 0.5 });
  return c.map(p => [p.x, p.y]).filter(p => Number.isFinite(p[0]) && dentro(p, pol));
}
// n posições espalhadas: cada nova o mais longe possível das do mesmo tipo (e a 30 cm de qualquer outro componente)
function posicoesNovas(sala, simbolo, n, pontosNaSala) {
  const c = componente(simbolo);
  const montagem = c?.montagem || 'parede';
  const cand = sala.pol ? candidatosNaSala(sala.pol, montagem) : [];
  if (!cand.length) {
    const ctr = sala.pol ? centroide(sala.pol) : null;
    return ctr ? Array.from({ length: n }, (_, i) => [ctr[0] + i * 0.4, ctr[1]]) : [];
  }
  const ctr = centroide(sala.pol);
  const mesmos = pontosNaSala.filter(p => p.simbolo === simbolo).map(p => [p.x, p.y]);
  const outros = pontosNaSala.filter(p => p.simbolo !== simbolo).map(p => [p.x, p.y]);
  const escolhidos = [];
  for (let k = 0; k < n; k++) {
    let melhor = null, nota = -Infinity;
    for (const p of cand) {
      if (escolhidos.some(e => dist(e, p) < 0.05)) continue;
      const ref = [...mesmos, ...escolhidos];
      const longe = ref.length ? Math.min(...ref.map(r => dist(r, p))) : -dist(p, ctr) * (montagem === 'canto' ? -1 : 1);
      const perto = outros.some(o => dist(o, p) < 0.3) ? 5 : 0;
      if (longe - perto > nota) { nota = longe - perto; melhor = p; }
    }
    if (!melhor) break;
    escolhidos.push(melhor);
  }
  return escolhidos.map(p => [r2(p[0]), r2(p[1])]);
}
// quais retirar quando são menos que todos: um a um, o mais "apertado" (mais perto de outro do mesmo tipo)
function escolherParaRetirar(lista, n) {
  const resta = [...lista];
  const fora = [];
  while (fora.length < n && resta.length) {
    let pior = 0, menor = Infinity;
    resta.forEach((p, i) => {
      const d = resta.length > 1 ? Math.min(...resta.filter((_, j) => j !== i).map(q => dist([p.x, p.y], [q.x, q.y]))) : 0;
      if (d < menor) { menor = d; pior = i; }
    });
    fora.push(resta.splice(pior, 1)[0]);
  }
  return fora;
}

// ── interpretação ──
function interpretar(texto, contexto = {}) {
  const duvidas = [];
  const operacoes = [];
  const bruto = String(texto || '').trim();
  if (!bruto) return { operacoes, duvidas: ['Escreva o que mudar, por exemplo: "acrescente 2 câmeras na capela".'], entendeuAlgo: false };
  if (bruto.length > 1500) return { operacoes, duvidas: ['Instrução longa demais: divida em partes (até 1.500 caracteres).'], entendeuAlgo: false };

  const dicionario = { ...nomesDaBiblioteca(), ...V.COMPONENTES };
  for (const [frase, simbolos] of Object.entries(contexto.aprendidas || {})) {
    const f = palavras(frase).map(singular).join(' ');
    if (f && Array.isArray(simbolos) && simbolos.length) dicionario[f] = [...new Set([...simbolos, ...(dicionario[f] || [])])];
  }
  const lugaresDaAnalise = prepararLugares(contexto);
  const discAnalise = new Set((contexto.disciplinas || []).flatMap(d => [d, d === 'rede' ? 'cabeamento' : d, d === 'controle-acesso' ? 'controle_acesso' : d]));
  const projetadas = new Set(contexto.projetadas || []);
  // pontos com símbolo (o desenhado sem símbolo é reconhecido pela descrição)
  const pontos = (contexto.pontos || []).filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y)).map(p => ({ ...p, simbolo: p.simbolo || simboloPelaDescricao(p.descricao, dicionario) }));
  const salaDoPonto = (p) => lugaresDaAnalise.salas.find(s => s.pol && dentro([p.x, p.y], s.pol)) || null;
  const pontosNa = (salas) => pontos.filter(p => { const s = salaDoPonto(p); return s && salas.some(x => x.k === s.k); });

  // frases separadas por ponto, ponto e vírgula ou quebra de linha; cada uma em trechos por verbo
  for (const frase of bruto.split(/[.;\n]+/).map(f => f.trim()).filter(Boolean)) {
    const toks = tokensDe(frase.replace(/\bpor\s+favor\b/gi, ' ').replace(/\bpf\b/gi, ' '));
    const lugares = marcarLugares(toks, lugaresDaAnalise);
    const comps = marcarComponentes(toks, dicionario);
    let anterior = null;
    for (const tr of trechos(toks)) {
      const ini = tr.toks[0]?.i ?? 0, fim = tr.toks[tr.toks.length - 1]?.i ?? 0;
      const meusComps = comps.filter(c => c.a >= ini && c.a <= fim);
      const meusLugares = lugares.filter(l => l.a >= ini && l.a <= fim);
      if (!meusComps.length && !meusLugares.length && (!tr.acao || ['por', 'poe', 'mais', 'menos', 'sem', 'add'].includes(tr.verbo))) continue;
      // "acrescente 2 câmeras e 1 detector na capela": uma operação por componente (a troca usa os dois)
      const grupos = tr.acao !== 'trocar' && meusComps.length > 1 ? meusComps.map(c => [c]) : [meusComps];
      const ctxT = { lugaresDaAnalise, discAnalise, projetadas, pontos, pontosNa, elaboracao: !!contexto.elaboracao };
      for (const [gi, cs] of grupos.entries()) {
      // com vários componentes, cada um fica com o lugar que vem depois dele ("2 tomadas na sala e 1 detector na capela")
      let lugaresDoComp = meusLugares;
      if (grupos.length > 1) {
        const prox = grupos[gi + 1]?.[0]?.a ?? Infinity;
        const depois = meusLugares.filter(l => l.a > cs[0].b && l.a < prox);
        lugaresDoComp = depois.length ? depois : meusLugares.filter(l => l.a < cs[0].a).slice(-1);
        if (!lugaresDoComp.length) lugaresDoComp = meusLugares;
      }
      const r = resolverTrecho({ tr, toks, comps: cs, lugares: lugaresDoComp, anterior, ctx: ctxT });
      if (r.duvida) duvidas.push(r.duvida);
      // "retire as câmeras da capela e coloque no salão" = mover
      if (r.op && anterior?.op?.tipo === 'retirar' && r.op.tipo === 'adicionar' && r.herdou) {
        const mov = juntarEmMover(anterior.op, r.op);
        operacoes.splice(operacoes.indexOf(anterior.op), 1, mov);
        anterior = { op: mov, comp: anterior.comp };
        continue;
      }
      if (r.op) { operacoes.push(r.op); anterior = { op: r.op, comp: r.comp }; }
      }
    }
    const sobra = toks.filter(t => !t.usado && t.t.length >= 4 && !PREP_LUGAR.has(t.t) && !V.TODOS.has(t.t) && !V.NUMEROS[t.t] && !/^\d+$/.test(t.t) && !IGNORAR.has(t.t));
    if (sobra.length && !operacoes.length && !duvidas.length) duvidas.push(`Não entendi: "${sobra.map(t => t.t).join(' ')}".`);
  }
  if (!operacoes.length && !duvidas.length) duvidas.push('Não entendi a instrução. Diga o que fazer (acrescentar, retirar, mover, trocar), o componente e o ambiente — ex.: "retire o detector do banheiro".');
  return { operacoes, duvidas, entendeuAlgo: operacoes.length > 0 };
}
const IGNORAR = new Set(['favor', 'porfavor', 'obrigado', 'quero', 'gostaria', 'preciso', 'novo', 'nova', 'novos', 'novas', 'tambem', 'ainda', 'outro', 'outra', 'outros', 'outras', 'mesmo', 'mesma', 'lugar', 'local', 'sala', 'ambiente', 'projeto', 'analise', 'quantidade', 'total', 'perto', 'junto', 'lado', 'entrada']);

// o nome oficial de cada componente da biblioteca também é entendido ("detector pontual de fumaça", "tomada média 2p+t")
let nomesCache = null;
function nomesDaBiblioteca() {
  if (nomesCache) return nomesCache;
  nomesCache = {};
  for (const c of componentes()) {
    const f = palavras(c.nome).map(singular).join(' ');
    if (f && !/^hm /.test(f)) nomesCache[f] = [c.simbolo];
  }
  return nomesCache;
}

function simboloPelaDescricao(descricao, dicionario) {
  if (!descricao) return null;
  const toks = tokensDe(descricao);
  const comps = marcarComponentes(toks, dicionario);
  return comps.length ? comps.sort((a, b) => (b.b - b.a) - (a.b - a.a))[0].simbolos[0] : null;
}

// escolhe o símbolo entre os candidatos da frase: o que existe no lugar (retirar/mover), senão o da disciplina da análise
function escolherSimbolo(comp, { discAnalise, existentes = [] }) {
  const lista = comp.simbolos.filter(s => componente(s));
  if (!lista.length) return null;
  const naObra = lista.find(s => existentes.some(p => p.simbolo === s));
  if (naObra) return naObra;
  const daDisciplina = lista.find(s => (componente(s).disciplinas || [componente(s).disciplina]).some(d => discAnalise.has(d)));
  return daDisciplina || lista[0];
}

const rotuloSala = (s) => (s.pavimento ? `${s.nome} (${s.pavimento})` : s.nome);
const nomeDe = (simbolo) => componente(simbolo)?.nome || simbolo;
const plural = (n, um, varios) => (n === 1 ? um : varios);

// salas de um lugar, filtradas pelo pavimento citado logo depois ("circulação do térreo")
function salasDoLugar(lugar, lugares, lugaresDaAnalise) {
  if (lugar.tipo === 'pavimento') return { salas: lugaresDaAnalise.salas.filter(s => s.pavimento === lugar.pavimento), soPavimento: lugar.pavimento };
  const pav = lugares.find(l => l.tipo === 'pavimento' && l.a > lugar.b && l.a - lugar.b <= 3);
  const salas = pav ? lugar.salas.filter(s => s.pavimento === pav.pavimento) : lugar.salas;
  return { salas: salas.length ? salas : lugar.salas, pavimento: pav?.pavimento || null };
}

function resolverTrecho({ tr, toks, comps, lugares, anterior, ctx }) {
  const { lugaresDaAnalise, discAnalise, projetadas, pontos, pontosNa } = ctx;
  let acao = tr.acao;
  let comp = comps[0] || null;
  let herdou = false;
  if (!comp && anterior?.comp && (acao === 'adicionar' || acao === 'mover' || acao === 'retirar')) { comp = anterior.comp; herdou = true; }
  // sem verbo, com número e componente: "3 câmeras na capela" = deixar 3
  if (!acao && comp && quantidadeAntes(toks, comp.a) != null) acao = 'definir';
  if (!acao) return { duvida: `Faltou o que fazer${comp ? ` com "${comp.frase}"` : ''}: acrescentar, retirar, mover, trocar ou deixar N.` };
  if (!comp) return { duvida: `Não reconheci o componente em "${tr.toks.map(t => t.t).join(' ')}". Use o nome da legenda (câmera, detector, tomada, rack, quadro…).` };
  // "mude a quantidade de câmeras para 3" / "mude para 4 detectores" = definir
  if (acao === 'mover' && !lugares.some(l => toks[l.a - 1] && V.DESTINO.has(toks[l.a - 1].t)) && quantidadeAlvo(tr.toks) != null) acao = 'definir';

  // lugar de origem e de destino
  const ehDestino = (l) => { for (let k = l.a - 1; k >= Math.max(0, l.a - 2); k--) { if (V.DESTINO.has(toks[k].t)) return true; if (!ARTIGOS.has(toks[k].t)) return false; } return false; };
  const lugaresSala = lugares.filter(l => l.tipo === 'sala' || !lugares.some(s => s.tipo === 'sala' && l.a > s.b && l.a - s.b <= 3));
  const destino = lugaresSala.find(ehDestino) || null;
  const origem = lugaresSala.find(l => l !== destino) || null;
  const qtdEscrita = quantidadeAntes(toks, comp.a);
  const todos = qtdEscrita === 'todos' || (comp.plural && qtdEscrita == null);

  const existentesEm = (salas) => pontosNa(salas);
  const descLugar = (salas, l) => (l?.tipo === 'pavimento' ? l.pavimento : salas.length === 1 ? rotuloSala(salas[0]) : `${salas.length} ambientes (${[...new Set(salas.map(s => s.nome))].slice(0, 4).join(', ')}${salas.length > 4 ? '…' : ''})`);
  const ambiguo = (l, salas) => l?.tipo === 'sala' && !l.plural && new Set(salas.map(s => s.pavimento)).size > 1
    ? `"${l.nome}" existe em mais de um pavimento (${[...new Set(salas.map(s => s.pavimento))].join(', ')}): diga qual — ex.: "${l.nome.toLowerCase()} do ${String(salas[0].pavimento).toLowerCase()}" — ou "todas as ${l.nome.toLowerCase()}".` : null;

  if (acao === 'adicionar' || acao === 'definir') {
    const lugar = destino || origem;
    if (!lugar) return { duvida: `Em qual ambiente ${acao === 'definir' ? 'ajustar' : 'acrescentar'} ${nomeDe(comp.simbolos[0]).toLowerCase()}? Ex.: "${comp.frase} em ${lugaresDaAnalise.salas[0]?.nome || 'SALA'}".` };
    const { salas } = salasDoLugar(lugar, lugares, lugaresDaAnalise);
    if (lugar.tipo === 'pavimento') return { duvida: `Em qual ambiente do ${lugar.pavimento}? O sistema precisa da sala para posicionar "${comp.frase}".` };
    const amb = ambiguo(lugar, salas);
    if (amb) return { duvida: amb };
    const existentes = existentesEm(salas);
    const simbolo = escolherSimbolo(comp, { discAnalise, existentes: acao === 'definir' ? existentes : [] });
    if (!simbolo) return { duvida: `"${comp.frase}" não está na biblioteca de componentes.` };
    if (salas.some(s => !s.pol)) return { duvida: `O ambiente "${lugar.nome}" não tem o contorno lido na planta: insira "${comp.frase}" clicando no 3D ou no Mapa do CAD.` };
    const adicionar = [], remover = [];
    let alvo = qtdEscrita === 'todos' ? null : qtdEscrita;
    if (alvo == null && herdou && anterior?.op?.tipo === 'retirar') alvo = anterior.op.remover.length;
    if (acao === 'definir') {
      alvo = alvo ?? quantidadeAlvo(tr.toks);
      if (alvo == null) return { duvida: `Quantos "${comp.frase}" deixar em ${lugar.nome}? Ex.: "deixe 3 ${comp.frase} na ${lugar.nome.toLowerCase()}".` };
    }
    for (const s of salas) {
      const naSala = existentesEm([s]);
      const atuais = naSala.filter(p => p.simbolo === simbolo);
      const n = acao === 'definir' ? alvo - atuais.length : (alvo ?? 1);
      if (n > 0) posicoesNovas(s, simbolo, n, naSala).forEach(([x, y]) => adicionar.push({ simbolo, x, y, rotulo: nomeDe(simbolo) }));
      else if (n < 0) escolherParaRetirar(atuais, -n).forEach(p => remover.push({ simbolo, x: p.x, y: p.y }));
    }
    if (!adicionar.length && !remover.length) return { op: null, comp, duvida: acao === 'definir' ? `${descLugar(salas, lugar)} já tem ${alvo} × ${nomeDe(simbolo)}: nada a mudar.` : `Não achei lugar livre para "${comp.frase}" em ${descLugar(salas, lugar)}.` };
    const tipo = acao === 'definir' ? 'definir' : 'adicionar';
    const descricao = acao === 'definir'
      ? `Deixar ${alvo} × ${nomeDe(simbolo)} em ${descLugar(salas, lugar)}${adicionar.length ? ` (+${adicionar.length})` : ''}${remover.length ? ` (−${remover.length})` : ''}`
      : `Acrescentar ${adicionar.length} × ${nomeDe(simbolo)} em ${descLugar(salas, lugar)}`;
    return { op: { tipo, descricao, simbolo, nome: nomeDe(simbolo), quantidade: adicionar.length || remover.length, ambiente: lugar.nome, adicionar, remover, centros: {} }, comp, herdou };
  }

  if (acao === 'retirar') {
    const lugar = origem || destino;
    const { salas } = lugar ? salasDoLugar(lugar, lugares, lugaresDaAnalise) : { salas: null };
    const amb = lugar ? ambiguo(lugar, salas) : null;
    if (amb && !todos) return { duvida: amb };
    const escopo = salas ? existentesEm(salas) : pontos;
    const simbolo = escolherSimbolo(comp, { discAnalise, existentes: escopo });
    const doTipo = escopo.filter(p => p.simbolo === simbolo);
    const onde = salas ? descLugar(salas, lugar) : 'no projeto todo';
    if (!doTipo.length) return { duvida: `Não há ${nomeDe(simbolo).toLowerCase()} ${salas ? `em ${onde}` : 'no projeto'} para retirar.` };
    if (!salas && !todos && doTipo.length > 1) return { duvida: `Há ${doTipo.length} × ${nomeDe(simbolo)} no projeto: diga de qual ambiente retirar — ou "retire todos os ${comp.frase}".` };
    const n = todos ? doTipo.length : Math.min(doTipo.length, typeof qtdEscrita === 'number' ? qtdEscrita : 1);
    const remover = escolherParaRetirar(doTipo, n).map(p => ({ simbolo, x: p.x, y: p.y }));
    return { op: { tipo: 'retirar', descricao: `Retirar ${remover.length} × ${nomeDe(simbolo)} ${salas ? `${lugar.tipo === 'pavimento' ? 'do' : 'de'} ${onde}` : 'do projeto todo'}`, simbolo, nome: nomeDe(simbolo), quantidade: remover.length, ambiente: lugar?.nome || null, adicionar: [], remover, centros: {} }, comp, herdou };
  }

  if (acao === 'mover') {
    if (!destino) return { duvida: `Para onde mover "${comp.frase}"? Ex.: "leve o ${comp.frase} para o ${(lugaresDaAnalise.salas[0]?.nome || 'depósito').toLowerCase()}".` };
    const dest = salasDoLugar(destino, lugares, lugaresDaAnalise);
    if (destino.tipo === 'pavimento') return { duvida: `Em qual ambiente do ${destino.pavimento}?` };
    const ambD = ambiguo(destino, dest.salas);
    if (ambD) return { duvida: ambD };
    const salaDestino = dest.salas.slice().sort((x, y) => y.area - x.area)[0];
    const orig = origem ? salasDoLugar(origem, lugares, lugaresDaAnalise) : null;
    const escopo = orig ? existentesEm(orig.salas) : pontos;
    // a estrutura (rack, central, QD…) do projeto sugerido: muda o local escolhido e o projetista refaz os cabos
    const estruturas = comp.estrutura ? Object.keys(V.ESTRUTURAS) : comp.simbolos.filter(s => V.ESTRUTURAS[s]);
    const daEstrutura = estruturas.filter(s => V.ESTRUTURAS[s].disciplinas.some(d => projetadas.has(d)));
    if (ctx.elaboracao && daEstrutura.length && (comp.estrutura || daEstrutura.includes(escolherSimbolo(comp, { discAnalise, existentes: escopo })))) {
      const centros = {};
      const nomes = [];
      for (const s of comp.estrutura ? daEstrutura : [escolherSimbolo(comp, { discAnalise, existentes: escopo })]) {
        const e = V.ESTRUTURAS[s];
        if (e.porPavimento) centros[`${e.grupo}|${salaDestino.pavimento}`] = { ambiente: salaDestino.nome, pavimento: salaDestino.pavimento };
        else centros[e.grupo] = { ambiente: salaDestino.nome, ...(salaDestino.pavimento ? { pavimento: salaDestino.pavimento } : {}) };
        nomes.push(e.porPavimento ? `${e.nome} do ${salaDestino.pavimento}` : e.nome);
      }
      return { op: { tipo: 'mover', descricao: `Levar ${nomes.join(' e ')} para ${rotuloSala(salaDestino)} — os cabos são refeitos a partir de lá`, simbolo: daEstrutura[0], nome: nomes.join(', '), quantidade: nomes.length, ambiente: salaDestino.nome, adicionar: [], remover: [], centros }, comp };
    }
    if (comp.estrutura) return { duvida: 'Qual estrutura mover? Diga o equipamento: rack, central de incêndio, central de alarme, quadro, DG…' };
    const simbolo = escolherSimbolo(comp, { discAnalise, existentes: escopo });
    const doTipo = escopo.filter(p => p.simbolo === simbolo && !(dest.salas.some(s => s.pol && dentro([p.x, p.y], s.pol))));
    if (!doTipo.length) return { duvida: `Não achei ${nomeDe(simbolo).toLowerCase()} ${orig ? `em ${descLugar(orig.salas, origem)}` : 'no projeto'} para mover.` };
    if (!orig && doTipo.length > 1 && !todos) return { duvida: `Há ${doTipo.length} × ${nomeDe(simbolo)} no projeto: diga de onde mover — ex.: "mova a ${comp.frase} da ${String(salaDoPontoNome(doTipo[0], lugaresDaAnalise)).toLowerCase()} para a ${salaDestino.nome.toLowerCase()}".` };
    const n = todos ? doTipo.length : Math.min(doTipo.length, typeof qtdEscrita === 'number' ? qtdEscrita : 1);
    const remover = escolherParaRetirar(doTipo, n).map(p => ({ simbolo, x: p.x, y: p.y }));
    const adicionar = posicoesNovas(salaDestino, simbolo, remover.length, existentesEm([salaDestino])).map(([x, y]) => ({ simbolo, x, y, rotulo: nomeDe(simbolo) }));
    return { op: { tipo: 'mover', descricao: `Mover ${remover.length} × ${nomeDe(simbolo)}${orig ? ` de ${descLugar(orig.salas, origem)}` : ''} para ${rotuloSala(salaDestino)}`, simbolo, nome: nomeDe(simbolo), quantidade: remover.length, ambiente: salaDestino.nome, adicionar, remover, centros: {} }, comp };
  }

  if (acao === 'trocar') {
    const [a, b] = comps;
    if (!a || !b) return { duvida: 'Troca precisa dos dois componentes: "troque X por Y" (ex.: "troque as tomadas baixas por tomadas médias na cozinha").' };
    const lugar = origem || destino;
    const { salas } = lugar ? salasDoLugar(lugar, lugares, lugaresDaAnalise) : { salas: null };
    const amb = lugar ? ambiguo(lugar, salas) : null;
    if (amb) return { duvida: amb };
    const escopo = salas ? existentesEm(salas) : pontos;
    const simA = escolherSimbolo(a, { discAnalise, existentes: escopo });
    const simB = escolherSimbolo({ ...b, simbolos: b.simbolos.filter(s => s !== simA).concat(b.simbolos) }, { discAnalise });
    const doTipo = escopo.filter(p => p.simbolo === simA);
    if (!doTipo.length) return { duvida: `Não há ${nomeDe(simA).toLowerCase()} ${salas ? `em ${descLugar(salas, lugar)}` : 'no projeto'} para trocar.` };
    if (!salas && !(a.plural || qtdEscrita === 'todos')) return { duvida: `Trocar em qual ambiente? Ou diga "troque todas as ${a.frase} por ${b.frase}".` };
    const n = typeof qtdEscrita === 'number' ? Math.min(qtdEscrita, doTipo.length) : (a.plural || qtdEscrita === 'todos' ? doTipo.length : 1);
    const sai = escolherParaRetirar(doTipo, n);
    return { op: { tipo: 'trocar', descricao: `Trocar ${sai.length} × ${nomeDe(simA)} por ${nomeDe(simB)}${salas ? ` em ${descLugar(salas, lugar)}` : ' no projeto todo'}`, simbolo: simB, nome: nomeDe(simB), quantidade: sai.length, ambiente: lugar?.nome || null,
      adicionar: sai.map(p => ({ simbolo: simB, x: p.x, y: p.y, rotulo: nomeDe(simB) })), remover: sai.map(p => ({ simbolo: simA, x: p.x, y: p.y })), centros: {} }, comp: b };
  }
  return { duvida: 'Não entendi a ação.' };
}
const salaDoPontoNome = (p, { salas }) => salas.find(s => s.pol && dentro([p.x, p.y], s.pol))?.nome || 'sala';

function juntarEmMover(ret, ad) {
  const n = Math.min(ret.remover.length, ad.adicionar.length) || ret.remover.length;
  return { ...ad, tipo: 'mover', descricao: `Mover ${ret.remover.length} × ${ret.nome}${ret.ambiente ? ` de ${ret.ambiente}` : ''} para ${ad.ambiente}`, quantidade: ret.remover.length,
    remover: ret.remover, adicionar: ad.adicionar.length >= ret.remover.length ? ad.adicionar.slice(0, ret.remover.length) : ad.adicionar, n };
}

module.exports = { interpretar, paraTestes: { singular, tokensDe, trechos, marcarLugares, marcarComponentes, prepararLugares, posicoesNovas, escolherParaRetirar } };
