// BASE DE CONHECIMENTO do sistema (pedido de 09/11/2026: "alimente o nosso assistente com todas essas informações"),
// consultável pelo assistente (ferramenta consultar_conhecimento), pelos agentes próprios e pelo pacote de contexto do
// suporte Claude Max. SEM dado de cliente. Três fontes:
//   1. os .md desta pasta (o que o sistema faz, critérios, fluxos) — a 1ª linha diz as disciplinas:
//      <!-- disciplinas: * --> ou <!-- disciplinas: quadros, eletrica -->; cada "## " é uma seção;
//   2. uma seção gerada por disciplina, do registro único (skills/_comum/disciplinas.js) e da descrição do SKILL.md
//      (normas, o que a skill calcula e gera);
//   3. o conhecimento APROVADO pelos engenheiros (sugestões do suporte Claude Max aprovadas — tabela
//      agentes_sugestoes, tipo 'conhecimento'), que é o que faz o agente responder sozinho da próxima vez.
const fs = require('fs');
const path = require('path');
const { normalizar, termosSignificativos } = require('../agentes/textoPedido');

const PASTA = __dirname;
const SKILLS = path.join(__dirname, '..', '..', '..', '..', 'skills');
const MAX_TEXTO = 9000;

let cache = null;
function secoesDosArquivos() {
  if (cache) return cache;
  const secoes = [];
  for (const nome of fs.readdirSync(PASTA).filter(n => n.endsWith('.md')).sort()) {
    const texto = fs.readFileSync(path.join(PASTA, nome), 'utf8').replace(/\r/g, '');
    const disc = (texto.match(/<!--\s*disciplinas:\s*([^>]*?)\s*-->/) || [])[1] || '*';
    const disciplinas = disc.split(',').map(s => s.trim()).filter(Boolean);
    const titulo = (texto.match(/^#\s+(.+)$/m) || [])[1] || nome;
    for (const parte of texto.split(/\n(?=## )/).slice(1)) {
      const t = (parte.match(/^##\s+(.+)$/m) || [])[1] || '';
      secoes.push({ fonte: `${nome} › ${titulo}`, titulo: t, texto: parte.trim(), disciplinas });
    }
  }
  // uma seção por disciplina, do registro e do SKILL.md (sem dado de obra)
  try {
    const { DISCIPLINAS } = require(path.join(SKILLS, '_comum', 'disciplinas.js'));
    for (const d of DISCIPLINAS) {
      let descricao = '';
      const pasta = d.pasta || DISCIPLINAS.find(x => x.chave === d.skill)?.pasta;
      try {
        const md = fs.readFileSync(path.join(SKILLS, pasta, 'SKILL.md'), 'utf8');
        descricao = (md.match(/^description:\s*(.+)$/m) || [])[1] || '';
      } catch { /* disciplina sem skill própria */ }
      secoes.push({
        fonte: `skills/${pasta || d.skill}/SKILL.md`, titulo: d.nomes?.laudo || d.chave, disciplinas: [d.chave],
        texto: `## ${d.nomes?.laudo || d.chave}\n- Chave: ${d.chave}${d.skill && d.skill !== d.chave ? ` (cálculo pela skill de ${d.skill})` : ''}; sigla dos kits KIT-${d.sigla}-NN; ${d.laudo ? 'tem projeto e laudo por disciplina' : 'só na análise'}.\n- ${descricao || 'Sem descrição de skill.'}\n- Normas e regras citáveis: use consultar_norma com a disciplina "${d.skill || d.chave}".`,
      });
    }
  } catch { /* registro indisponível: só os .md */ }
  cache = secoes;
  return secoes;
}

async function aprovados(db, disciplina) {
  if (!db) return [];
  try {
    const { rows } = await db.query(
      `SELECT id, agente, disciplina, pergunta, resposta, decidido_em FROM agentes_sugestoes
        WHERE tipo = 'conhecimento' AND situacao = 'aprovada' AND ($1::text IS NULL OR disciplina IS NULL OR disciplina = $1)
        ORDER BY decidido_em DESC NULLS LAST LIMIT 300`, [disciplina || null]);
    return rows.map(r => ({
      fonte: `conhecimento aprovado #${r.id}${r.decidido_em ? ` (${new Date(r.decidido_em).toLocaleDateString('pt-BR')})` : ''}`,
      titulo: r.pergunta.slice(0, 120), disciplinas: r.disciplina ? [r.disciplina] : ['*'], aprovado: true,
      texto: `## ${r.pergunta.slice(0, 160)}\n${r.resposta}`,
    }));
  } catch { return []; }
}

// → { secoes: [{ fonte, titulo, texto }], texto }  (texto pronto para o assistente / pacote do suporte)
async function consultar({ disciplina = null, busca = '', limite = 6, db = null } = {}) {
  const todas = [...secoesDosArquivos(), ...(await aprovados(db, disciplina))];
  const daDisciplina = todas.filter(s => !disciplina || s.disciplinas.includes('*') || s.disciplinas.includes(disciplina));
  const termos = termosSignificativos(busca, { max: 10 });
  let escolhidas;
  if (termos.length) {
    escolhidas = daDisciplina.map(s => {
      const t = normalizar(`${s.titulo} ${s.texto}`);
      const n = termos.reduce((acc, x) => acc + (t.includes(` ${x}`) ? 1 : 0), 0);
      return { s, n: n + (s.aprovado && n ? 0.5 : 0) + (disciplina && s.disciplinas.includes(disciplina) && n ? 0.5 : 0) };
    }).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, limite).map(x => x.s);
  } else {
    escolhidas = disciplina ? daDisciplina.filter(s => s.disciplinas.includes(disciplina)).slice(0, limite) : daDisciplina.filter(s => /geral|agentes/.test(s.fonte)).slice(0, limite);
  }
  let texto = escolhidas.map(s => `[${s.fonte}]\n${s.texto}`).join('\n\n');
  if (texto.length > MAX_TEXTO) texto = `${texto.slice(0, MAX_TEXTO)}\n[… cortado]`;
  return { secoes: escolhidas.map(({ fonte, titulo, texto: t }) => ({ fonte, titulo, texto: t })), texto };
}

// Resposta já APROVADA para esta pergunta (o agente responde sem IA): todos os termos da pergunta aprovada aparecem
// no pedido novo, e o pedido não tem mais que o dobro de termos (pergunta parecida, não um texto que só a contém)
async function respostaAprovada(pergunta, { db, agente = null, disciplina = null } = {}) {
  if (!db) return null;
  const termos = termosSignificativos(pergunta, { max: 12 });
  if (termos.length < 2) return null;
  try {
    const { rows } = await db.query(
      `SELECT id, pergunta, resposta, termos FROM agentes_sugestoes
        WHERE tipo = 'conhecimento' AND situacao = 'aprovada' AND ($1::text IS NULL OR agente IS NULL OR agente = $1)
          AND ($2::text IS NULL OR disciplina IS NULL OR disciplina = $2)
        ORDER BY decidido_em DESC NULLS LAST LIMIT 500`, [agente, disciplina]);
    const conj = new Set(termos);
    for (const r of rows) {
      const t = Array.isArray(r.termos) && r.termos.length ? r.termos : termosSignificativos(r.pergunta, { max: 12 });
      if (t.length >= 2 && t.every(x => conj.has(x)) && termos.length <= t.length * 2) return r;
    }
  } catch { /* tabela ainda não criada */ }
  return null;
}

module.exports = { consultar, respostaAprovada, secoesDosArquivos };
