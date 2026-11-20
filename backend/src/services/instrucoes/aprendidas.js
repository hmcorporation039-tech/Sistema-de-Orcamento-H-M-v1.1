// Frases APRENDIDAS do campo de instruções (2.47). Quando o vocabulário fixo (./vocabulario.js) não reconhece um
// componente e a IA ajuda a entender, a frase do engenheiro ("câmera speed", "olho mágico") vira SUGESTÃO em
// agentes_sugestoes (tipo 'instrucao', intencao = símbolo). Só depois que o administrador aprova em "O que o sistema
// sabe" ela passa a ser lida sem IA — é assim que o sistema depende cada vez menos de IA nas disciplinas.
const { normalizar } = require('../agentes/textoPedido');
const { componente } = require('../bibliotecaComponentes');

let cache = { em: 0, mapa: null };
const VALIDADE_MS = 60 * 1000;

const fraseNormal = (s) => normalizar(s).trim();

// { frase: [simbolos] } das aprovadas (cache de 1 minuto: a aprovação vale logo)
async function carregar(db) {
  if (cache.mapa && Date.now() - cache.em < VALIDADE_MS) return cache.mapa;
  const mapa = {};
  try {
    const { rows } = await db.query(`SELECT termos, intencao FROM agentes_sugestoes WHERE tipo = 'instrucao' AND situacao = 'aprovada' ORDER BY vezes DESC, id`);
    for (const r of rows) {
      const frase = fraseNormal(Array.isArray(r.termos) ? r.termos[0] : '');
      if (frase && componente(r.intencao)) (mapa[frase] ||= []).push(r.intencao);
    }
  } catch { /* sem a tabela (instalação antiga): só o vocabulário fixo */ }
  cache = { em: Date.now(), mapa };
  return mapa;
}
const esquecerCache = () => { cache = { em: 0, mapa: null }; };

// termos = [{ frase, simbolo }] vindos da IA e confirmados pelo engenheiro ao aplicar
async function sugerir(db, { termos, texto, usuarioId }) {
  let n = 0;
  for (const t of (Array.isArray(termos) ? termos : []).slice(0, 10)) {
    const frase = fraseNormal(t?.frase);
    const c = componente(t?.simbolo);
    if (!c || frase.length < 2 || frase.length > 60) continue;
    await db.query(
      `INSERT INTO agentes_sugestoes (tipo, fonte, agente, intencao, disciplina, termos, pergunta, resposta, chave, usuario_id)
       VALUES ('instrucao', 'ia', 'instrucoes_analise', $1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (chave) DO UPDATE SET vezes = agentes_sugestoes.vezes + 1, atualizado_em = NOW()`,
      [c.simbolo, String(c.disciplina || '').slice(0, 40), JSON.stringify([frase]),
        `"${frase}" — na instrução: "${String(texto || '').slice(0, 300)}"`,
        `No campo de instruções da análise, "${frase}" = ${c.nome} (${c.simbolo}).`,
        `instrucao:${frase}:${c.simbolo}`, usuarioId || null]);
    n++;
  }
  return n;
}

module.exports = { carregar, sugerir, esquecerCache, fraseNormal };
