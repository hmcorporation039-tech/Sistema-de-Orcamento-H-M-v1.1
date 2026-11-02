const crypto = require('crypto');
const pool = require('../config/database');

// Cache das chamadas à IA. Só otimização: se a tabela falhar por qualquer motivo, a
// chamada segue normalmente (nunca trava o fluxo por causa do cache).
//   nome     = função + versão do roteiro (ex.: 'equipamentos_projeto v1'); roteiro novo
//              muda o nome e não reaproveita resposta antiga
//   entrada  = o que a IA recebe; vai para o hash normalizada (espaços e caixa não contam)
//   ttlDias  = validade; resposta vazia, nula ou com erro nunca é guardada

const normalizar = (entrada) => (typeof entrada === 'string' ? entrada : JSON.stringify(entrada ?? null)).replace(/\s+/g, ' ').trim().toLowerCase();

function chaveDe(nome, entrada) {
  return crypto.createHash('sha256').update(`${nome}\u0000${normalizar(entrada)}`).digest('hex');
}

const vazio = (v) => v == null || v === '' ||(Array.isArray(v) && !v.length) || (Array.isArray(v?.itens) && !v.itens.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);

async function registrarUso(nome, acerto) {
  await pool.query(
    `INSERT INTO ia_cache_uso (nome, dia, acertos, chamadas) VALUES ($1, CURRENT_DATE, $2, $3)
     ON CONFLICT (nome, dia) DO UPDATE SET acertos = ia_cache_uso.acertos + EXCLUDED.acertos, chamadas = ia_cache_uso.chamadas + EXCLUDED.chamadas`,
    [nome, acerto ? 1 : 0, acerto ? 0 : 1]
  ).catch(() => {});
}

// Leitura de cotação de fornecedor (pasta e e-mail): documento lido só com os leitores locais
// (layouts conhecidos, universal, OCR) conta como chamada evitada; o que foi para a IA conta
// como chamada. Documento sem itens e sem IA não entra na conta. Nunca derruba a leitura.
function contarLeituraCotacao(leitura) {
  if (leitura?.usouIA) return registrarUso('leitura_cotacao', false);
  if (leitura?.itens?.length) return registrarUso('leitura_cotacao', true);
  return Promise.resolve();
}

// comCache(nome, entrada, { ttlDias, fresco }, () => chamadaÀIA())
//   → { valor, deCache, criadoEm }. `fresco` ignora o que está guardado (e regrava).
async function comCache(nome, entrada, { ttlDias, fresco = false } = {}, chamada) {
  const chave = chaveDe(nome, entrada);
  if (!fresco) {
    const guardado = await pool.query(
      `UPDATE ia_cache SET acertos = acertos + 1 WHERE chave = $1 AND expira_em > NOW() RETURNING resultado, criado_em`,
      [chave]
    ).then(r => r.rows[0]).catch(() => null);
    if (guardado) {
      await registrarUso(nome, true);
      return { valor: guardado.resultado, deCache: true, criadoEm: guardado.criado_em };
    }
  }
  const valor = await chamada(); // erro da IA sobe daqui: nada é guardado
  await registrarUso(nome, false);
  if (!vazio(valor)) {
    await pool.query(
      `INSERT INTO ia_cache (chave, nome, resultado, expira_em) VALUES ($1, $2, $3, NOW() + ($4 || ' days')::interval)
       ON CONFLICT (chave) DO UPDATE SET resultado = EXCLUDED.resultado, criado_em = NOW(), expira_em = EXCLUDED.expira_em, acertos = 0`,
      [chave, nome, JSON.stringify(valor), String(ttlDias)]
    ).catch(() => {});
  }
  return { valor, deCache: false, criadoEm: null };
}

// Painel de Integrações: por função, quantas chamadas à IA o cache evitou
async function situacao(dias = 30) {
  try {
    const uso = await pool.query(
      `SELECT nome, SUM(acertos)::int AS acertos, SUM(chamadas)::int AS chamadas FROM ia_cache_uso
       WHERE dia > CURRENT_DATE - $1::int GROUP BY nome ORDER BY nome`, [dias]);
    const guardadas = await pool.query(`SELECT COUNT(*)::int AS n FROM ia_cache WHERE expira_em > NOW()`);
    const porNome = uso.rows.map(r => ({ nome: r.nome, acertos: r.acertos, chamadas: r.chamadas }));
    const acertos = porNome.reduce((s, r) => s + r.acertos, 0);
    const chamadas = porNome.reduce((s, r) => s + r.chamadas, 0);
    return { dias, acertos, chamadas, evitadas: acertos, taxa: acertos + chamadas ? Math.round(100 * acertos / (acertos + chamadas)) : 0, guardadas: guardadas.rows[0].n, funcoes: porNome };
  } catch {
    return { dias, acertos: 0, chamadas: 0, evitadas: 0, taxa: 0, guardadas: 0, funcoes: [] };
  }
}

async function limparExpirados() {
  const r = await pool.query('DELETE FROM ia_cache WHERE expira_em < NOW()');
  return r.rowCount;
}

module.exports = { comCache, chaveDe, registrarUso, contarLeituraCotacao, situacao, limparExpirados };
