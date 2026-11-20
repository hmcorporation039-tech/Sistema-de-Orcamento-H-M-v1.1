// REGRAS APRENDIDAS DO PROJETISTA (versão 2.49, 20/11/2026). Pedido do usuário: os agentes de cada disciplina
// "continuem aprendendo tudo para que se dependa cada vez menos de IA e melhorando cada vez sozinhos". Na elaboração de
// projeto, o engenheiro corrige o projeto sugerido pelo campo de instruções ("acrescente 2 câmeras na capela", "retire
// os detectores dos depósitos", "leve o rack para o almoxarifado"). Cada instrução aplicada vira AJUSTES por ambiente
// (o que havia × o que ficou, guardados em analises_instrucoes.ajustes); a MESMA correção, no mesmo TIPO de ambiente
// (o tipo do projetista: espaço de reunião, circulação, depósito…), feita em 2 análises ou em 3 ambientes vira SUGESTÃO
// de regra (agentes_sugestoes, tipo 'regra_projetista'). Só depois que o administrador aprova em "O que o sistema sabe"
// o projetista passa a fazer sozinho (skills/_comum/cad/projetista.js, critérios.regras) — nas análises NOVAS: a análise
// guarda as regras com que foi feita, e recalcular não aplica regra nova por cima das edições que a ensinaram.
// Instrução desfeita deixa de contar. Tudo determinístico (sem IA).
const path = require('path');
const { CAD } = require('../../config/caminhos');
const { dentro } = require(path.join(CAD, 'arquitetura.js'));
const { tipoDoAmbiente, ROTULO_TIPO, DISCIPLINAS, regrasDe } = require(path.join(CAD, 'projetista.js'));
const { componente } = require('../bibliotecaComponentes');
const { chaveDoProjeto } = require('../mapaCad');
const { nomeDaDisciplina } = require('../../utils/disciplinasProjeto');
const { pontosComSimbolo } = require('./interpretar');

const MIN_ANALISES = 2;   // a mesma correção em 2 análises...
const MIN_AMBIENTES = 3;  // ...ou em 3 ambientes do mesmo tipo (ainda que numa análise só)
// grupo do equipamento central → disciplina (a tela agrupa por disciplina)
const GRUPO_DISC = { telecom: 'rede', incendio: 'incendio', alarme: 'alarme', acesso: 'controle_acesso', telefonia: 'telefonia', antena: 'antena' };
const NOME_CENTRAL = { telecom: 'Rack / NVR e switch', incendio: 'Central de alarme de incêndio', alarme: 'Central de alarme de intrusão', acesso: 'Controladora de acesso', telefonia: 'Central telefônica / DG', antena: 'Antena e amplificador' };
// só as disciplinas que o projetista projeta por regra de ambiente (elétrica e iluminação saem do cálculo da skill)
const porRegra = (d) => !!(DISCIPLINAS[d] && !DISCIPLINAS[d].motor && !DISCIPLINAS[d].especial);

// ── 1) ajustes de UMA instrução aplicada ──
// a: a análise ANTES da instrução (linha do banco); ops: as operações lidas (controllers/projetos/instrucoes.lerOperacoes)
function ajustesDaInstrucao(a, ops) {
  if (a?.finalidade !== 'elaboracao') return [];
  const salas = (Array.isArray(a.ambientes) ? a.ambientes : []).filter(x => x?.nome && !x.semNome && Array.isArray(x.poligono) && x.poligono.length >= 3);
  if (!salas.length) return [];
  const salaDe = (p) => salas.find(s => dentro([p.x, p.y], s.poligono)) || null;
  const pontos = pontosComSimbolo(a.espacial?.pontos).map(p => ({ simbolo: p.simbolo, sala: salaDe(p) }));
  const por = new Map();
  const reg = (sala, simbolo) => {
    const k = `${sala.nome}|${sala.pavimento || ''}|${simbolo}`;
    return por.get(k) || por.set(k, { sala, simbolo, mais: 0, menos: 0 }).get(k);
  };
  const centros = [];
  for (const o of Array.isArray(ops) ? ops : []) {
    // mover componentes entre salas é posição, não quantidade: não ensina regra (a estrutura movida ensina, abaixo)
    if (o.tipo !== 'mover') {
      for (const p of o.adicionar || []) { const s = salaDe(p); if (s) reg(s, p.simbolo).mais++; }
      for (const p of o.remover || []) { const s = salaDe(p); if (s) reg(s, p.simbolo).menos++; }
    }
    for (const [grupo, v] of Object.entries(o.centros || {})) {
      if (!GRUPO_DISC[grupo]) continue; // o QD de cada pavimento ("eletrica|<pavimento>") fica de fora
      const sala = salas.find(s => s.nome === v?.ambiente && (!v.pavimento || s.pavimento === v.pavimento));
      const tipo = sala ? tipoDoAmbiente(sala.nome) : null;
      if (tipo && tipo !== 'outro') centros.push({ modo: 'centro', grupo, disciplina: GRUPO_DISC[grupo], tipo, ambiente: sala.nome, pavimento: sala.pavimento || null });
    }
  }
  const out = [];
  for (const { sala, simbolo, mais, menos } of por.values()) {
    const c = componente(simbolo);
    const tipo = tipoDoAmbiente(sala.nome);
    if (!c || !porRegra(c.disciplina) || tipo === 'outro' || mais === menos) continue;
    const antes = Math.max(menos, pontos.filter(p => p.simbolo === simbolo && p.sala === sala).length);
    out.push({ disciplina: c.disciplina, simbolo, tipo, ambiente: sala.nome, pavimento: sala.pavimento || null, delta: mais - menos, zerou: antes > 0 && antes + mais - menos <= 0 });
  }
  return [...out, ...centros].slice(0, 100);
}

// ── 2) sugestões a partir de TODAS as instruções que valem ──
const nomeDoSimbolo = (s) => componente(s)?.nome || s;
// minúscula só na 1ª letra de palavra comum: "Câmera de CFTV" → "câmera de CFTV" (a sigla fica)
const minuscula = (s) => String(s || '').replace(/^\p{Lu}(?=\p{Ll})/u, c => c.toLowerCase());
function textoDa(r) {
  const tipo = ROTULO_TIPO[r.tipo] || r.tipo;
  if (r.modo === 'centro') return `${NOME_CENTRAL[r.grupo] || r.grupo} em ${tipo}`;
  if (r.modo === 'nenhum') return `em ${tipo}, não colocar ${minuscula(nomeDoSimbolo(r.simbolo))}`;
  return `em ${tipo}, ${r.modo === 'mais' ? 'acrescentar' : 'retirar'} ${r.n} × ${minuscula(nomeDoSimbolo(r.simbolo))}`;
}
// a quantidade mais frequente (empate: a menor)
function moda(ns) {
  const c = new Map();
  for (const n of ns) c.set(n, (c.get(n) || 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] || 1;
}

// linhas: [{ analise_id, ajustes }] na ordem em que foram aplicadas → [{ chave, regra, analises, ambientes }]. Função pura.
function candidatas(linhas) {
  const salaNet = new Map(), centroNet = new Map();
  for (const l of linhas || []) {
    for (const x of Array.isArray(l.ajustes) ? l.ajustes : []) {
      if (x?.modo === 'centro') { centroNet.set(`${l.analise_id}|${x.grupo}`, { ...x, analise: l.analise_id }); continue; }
      if (!x?.simbolo || !x.tipo) continue;
      const k = `${l.analise_id}|${x.ambiente}|${x.pavimento || ''}|${x.simbolo}`;
      const v = salaNet.get(k) || { ...x, analise: l.analise_id, delta: 0 };
      v.delta += Number(x.delta) || 0;
      v.zerou = !!x.zerou; // vale o que ficou depois da última instrução
      salaNet.set(k, v);
    }
  }
  const por = new Map();
  const somar = (chave, regra, v, n) => {
    const c = por.get(chave) || por.set(chave, { chave, regra, analises: new Set(), ambientes: [], ns: [] }).get(chave);
    c.analises.add(v.analise);
    c.ambientes.push(`${v.ambiente}${v.pavimento ? ` (${v.pavimento})` : ''}`);
    if (n) c.ns.push(n);
  };
  for (const v of salaNet.values()) {
    const modo = v.zerou ? 'nenhum' : v.delta > 0 ? 'mais' : v.delta < 0 ? 'menos' : null;
    if (!modo) continue;
    somar(`regra:${v.disciplina}:${v.tipo}:${v.simbolo}:${modo}`, { modo, disciplina: v.disciplina, tipo: v.tipo, simbolo: v.simbolo }, v, modo === 'nenhum' ? null : Math.abs(v.delta));
  }
  for (const v of centroNet.values()) somar(`regra:centro:${v.grupo}:${v.tipo}`, { modo: 'centro', grupo: v.grupo, disciplina: v.disciplina, tipo: v.tipo }, v, null);
  return [...por.values()]
    .filter(c => c.analises.size >= MIN_ANALISES || (c.regra.modo !== 'centro' && c.ambientes.length >= MIN_AMBIENTES))
    .map(c => {
      const regra = { ...c.regra, ...(c.ns.length ? { n: Math.min(20, moda(c.ns)) } : {}), nome: c.regra.modo === 'centro' ? NOME_CENTRAL[c.regra.grupo] : nomeDoSimbolo(c.regra.simbolo) };
      return { chave: c.chave, regra, analises: c.analises.size, ambientes: c.ambientes };
    });
}

// recalcula as sugestões (depois de aplicar ou desfazer uma instrução). Sugestão já decidida (aprovada/recusada) só
// atualiza a contagem; a pendente que deixou de valer (instrução desfeita) sai. Devolve as que acabaram de nascer.
async function atualizarSugestoes(db, { usuarioId = null } = {}) {
  const { rows } = await db.query(
    `SELECT i.analise_id, i.ajustes FROM analises_instrucoes i JOIN analises_projeto a ON a.id = i.analise_id
      WHERE i.desfeita_em IS NULL AND a.finalidade = 'elaboracao' AND jsonb_array_length(i.ajustes) > 0 ORDER BY i.id`);
  const lista = candidatas(rows);
  const novas = [];
  for (const c of lista) {
    const disc = nomeDaDisciplina(chaveDoProjeto(c.regra.disciplina) || c.regra.disciplina) || c.regra.disciplina;
    const pergunta = `Projetista de ${disc}: ${textoDa(c.regra)}`;
    const vistos = [...c.ambientes.reduce((m, x) => m.set(x, (m.get(x) || 0) + 1), new Map())].map(([x, k]) => (k > 1 ? `${x} ×${k}` : x));
    const resposta = `Você fez essa correção em ${c.ambientes.length} ambiente(s) de ${c.analises} análise(s): ${vistos.slice(0, 8).join(', ')}${vistos.length > 8 ? '…' : ''}. Aprovada, o projetista passa a fazer isso sozinho nas próximas elaborações de projeto (as análises já feitas não mudam).`;
    const { rows: [s] } = await db.query(
      `INSERT INTO agentes_sugestoes (tipo, fonte, agente, intencao, disciplina, termos, pergunta, resposta, chave, vezes, usuario_id)
       VALUES ('regra_projetista', 'instrucoes', 'projetista', $1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (chave) DO UPDATE SET vezes = EXCLUDED.vezes, atualizado_em = NOW(),
         termos = CASE WHEN agentes_sugestoes.situacao = 'pendente' THEN EXCLUDED.termos ELSE agentes_sugestoes.termos END,
         pergunta = CASE WHEN agentes_sugestoes.situacao = 'pendente' THEN EXCLUDED.pergunta ELSE agentes_sugestoes.pergunta END,
         resposta = CASE WHEN agentes_sugestoes.situacao = 'pendente' THEN EXCLUDED.resposta ELSE agentes_sugestoes.resposta END
       RETURNING id, situacao, (xmax = 0) AS nova`,
      [String(c.regra.simbolo || c.regra.grupo).slice(0, 40), c.regra.disciplina, JSON.stringify([c.regra]), pergunta, resposta, c.chave, c.ambientes.length, usuarioId]);
    if (s?.nova) novas.push({ id: s.id, texto: pergunta });
  }
  await db.query(`DELETE FROM agentes_sugestoes WHERE tipo = 'regra_projetista' AND situacao = 'pendente' AND NOT (chave = ANY($1::text[]))`, [lista.map(c => c.chave)]);
  return novas;
}

// ── 3) as aprovadas, para o projetista (cache de 1 minuto; a decisão do administrador limpa) ──
let cache = { em: 0, regras: null };
async function aprovadas(db) {
  if (cache.regras && Date.now() - cache.em < 60 * 1000) return cache.regras;
  let regras = [];
  try {
    const { rows } = await db.query(`SELECT id, termos FROM agentes_sugestoes WHERE tipo = 'regra_projetista' AND situacao = 'aprovada' ORDER BY id`);
    regras = regrasDe(rows.map(r => ({ ...(Array.isArray(r.termos) ? r.termos[0] : {}), id: r.id })));
  } catch { /* instalação sem a tabela: sem regras aprendidas */ }
  cache = { em: Date.now(), regras };
  return regras;
}
const esquecerCache = () => { cache = { em: 0, regras: null }; };

// ── 4) o que o projetista já faz sozinho, por disciplina (texto para "O que o sistema sabe") ──
// Resumo das regras de skills/_comum/cad/projetista.js (o critério que não é número de norma é [CONFERIR] no projeto).
const EMBUTIDAS = {
  cftv: [
    'Câmera em acesso, circulação, espaço de reunião, guarda de valores (secretaria, CPD) e área externa — 1 a cada ~150–200 m².',
    'PTZ só no espaço de reunião do térreo (400 m² ou mais), para a transmissão ao vivo — não nos outros pavimentos nem na área externa.',
    'Nunca em sanitário, dormitório nem na residência (privacidade/LGPD).',
  ],
  cabeamento: [
    'Escritório: 2 tomadas por área de trabalho de 10 m² (NBR 14565 6.7.7.1; o engenheiro pode pedir 3 ou 4).',
    'Sala técnica e sala de uso geral: 2 tomadas; espaço de reunião e circulação grande: ponto de acesso Wi-Fi.',
  ],
  incendio: [
    'Detector de fumaça em todo ambiente fechado, em grade pelo raio da NBR 17240 (temperatura na cozinha/copa).',
    'Acionador manual e avisador junto das saídas, a até 30 m de caminhamento (5.5.3).',
    'Fora: sanitário, área aberta e poço/shaft. Cobertura "só rotas" quando o engenheiro escolhe.',
  ],
  alarme: ['IVP nos ambientes com valor (escritório, sala técnica), nos espaços grandes (1 a cada ~100 m²) e nas circulações de acesso.'],
  telefonia: ['Ramal no escritório/atendimento (1 a cada ~20 m²) e interfone no estar da residência.'],
  antena: ['Tomada de TV no estar e nos dormitórios da residência, na sala de reunião e no espaço de reunião grande.'],
  controle_acesso: ['Só a controladora no local central: leitores e fechaduras entram pelas instruções ("acrescente 1 leitor na secretaria").'],
  eletrica: ['Tomadas e pontos de luz pelo cálculo da NBR 5410 9.5.2, com os circuitos e o QD de cada pavimento.'],
  iluminacao: ['Luminárias pelo método dos lúmens e a iluminância da atividade (NBR ISO/CIE 8995-1).'],
  spda: ['Malha e descidas pelo nível de proteção (NBR 5419-3, Tabelas 2 e 5) no contorno do prédio.'],
};
const chaveTela = (d) => chaveDoProjeto(d) || d;

module.exports = { ajustesDaInstrucao, candidatas, atualizarSugestoes, aprovadas, esquecerCache, textoDa, chaveTela, EMBUTIDAS, MIN_ANALISES, MIN_AMBIENTES };
