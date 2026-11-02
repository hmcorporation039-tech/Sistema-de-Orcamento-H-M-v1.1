const pool = require('../config/database');

// Histórico de preços VENDIDOS (item 5 do plano): o que cada material custou ao cliente nas
// propostas aprovadas (valor unitário do item, antes do BDI). O catálogo guarda só o último preço; aqui o engenheiro vê a faixa
// praticada (menor, mediana, maior) e o último valor fechado.
//
// Calculado direto de propostas × itens em vez de uma tabela espelho: assim proposta cancelada,
// recusada, ativa (ainda não fechada) ou apagada nunca entra, e aprovação desfeita sai na hora,
// sem rotina de sincronização que possa ficar para trás. Só conta item confirmado com preço
// (item "a cotar" é estimativa, não preço vendido).
const LIMITE_IDS = 500;

// Valida a lista de ids vinda da tela (inteiros positivos, sem repetir, até LIMITE_IDS)
function lerIds(bruto) {
  const lista = Array.isArray(bruto) ? bruto : String(bruto ?? '').split(',');
  const ids = [];
  for (const x of lista) {
    const n = Number(String(x).trim());
    if (Number.isInteger(n) && n > 0 && !ids.includes(n)) ids.push(n);
    if (ids.length >= LIMITE_IDS) break;
  }
  return ids;
}

const dinheiro = (v) => Math.round(Number(v) * 100) / 100;

// Normalização da descrição para casar item sem material do catálogo com o que já foi vendido: sem acento,
// caixa baixa e espaços únicos. O SQL e o JS fazem a MESMA conta (conferido no teste).
const COM_ACENTO = 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç';
const SEM_ACENTO = 'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc';
const normalizar = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const sqlNormalizar = (col) => `btrim(regexp_replace(lower(translate(COALESCE(${col}, ''), '${COM_ACENTO}', '${SEM_ACENTO}')), '[[:space:]]+', ' ', 'g'))`;
// chave de um item sem material: "descrição|unidade" normalizadas (unidade diferente é outro preço)
const chaveDescricao = (descricao, unidade) => `${normalizar(descricao)}|${normalizar(unidade)}`;
const SQL_CHAVE_DESCRICAO = `${sqlNormalizar('i.descricao')} || '|' || ${sqlNormalizar('i.unidade')}`;

// Mesma conta para os dois jeitos de achar o item: `chaveSql` é a expressão que identifica o item nas
// propostas aprovadas (o material_id ou a descrição normalizada) e `tipo` o tipo do array enviado.
async function faixasPorChave(chaveSql, tipo, valores, excluirPropostaId, executor) {
  const { rows } = await executor.query(
    `WITH linhas AS (
       SELECT (${chaveSql})::text AS chave, i.valor_unitario::float8 AS vu, p.id AS proposta_id, p.numero, p.data
         FROM proposta_itens i
         JOIN propostas p ON p.id = i.proposta_id
        WHERE p.status = 'Aprovada'
          AND (${chaveSql})::text = ANY($1::${tipo}[])
          AND i.valor_unitario > 0
          AND COALESCE(i.status, 'confirmado') = 'confirmado'
          AND ($2::int IS NULL OR p.id <> $2)
     ),
     ultimas AS (
       SELECT DISTINCT ON (chave) chave, vu, numero, data
         FROM linhas ORDER BY chave, data DESC, proposta_id DESC, vu DESC
     )
     SELECT l.chave,
            COUNT(DISTINCT l.proposta_id)::int AS propostas,
            MIN(l.vu) AS minimo,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY l.vu) AS mediana,
            MAX(l.vu) AS maximo,
            u.vu AS ultimo, to_char(u.data, 'YYYY-MM-DD') AS ultima_data, u.numero AS ultima_proposta
       FROM linhas l JOIN ultimas u ON u.chave = l.chave
      GROUP BY l.chave, u.vu, u.data, u.numero`,
    [valores, excluirPropostaId]
  );
  const faixas = {};
  for (const r of rows) {
    faixas[r.chave] = {
      propostas: r.propostas, minimo: dinheiro(r.minimo), mediana: dinheiro(r.mediana), maximo: dinheiro(r.maximo),
      ultimo: dinheiro(r.ultimo), ultima_data: r.ultima_data, ultima_proposta: r.ultima_proposta,
    };
  }
  return faixas;
}

// { [material_id]: { propostas, minimo, mediana, maximo, ultimo, ultima_data, ultima_proposta } }
// `excluirPropostaId`: a proposta que está sendo editada não conta contra si mesma.
async function faixasPorMaterial(ids, { excluirPropostaId = null } = {}, executor = pool) {
  if (!ids || !ids.length) return {};
  return faixasPorChave('i.material_id', 'text', ids.map(String), excluirPropostaId, executor);
}

// Para o item que NÃO está ligado ao catálogo (digitado à mão): mesma faixa, achada pela descrição e unidade
// idênticas (sem acento nem caixa). { [chaveDescricao(descricao, unidade)]: faixa }
async function faixasPorDescricao(itens, { excluirPropostaId = null } = {}, executor = pool) {
  const chaves = [...new Set((itens || []).map(i => chaveDescricao(i.descricao, i.unidade)).filter(c => !c.startsWith('|')))].slice(0, LIMITE_IDS);
  if (!chaves.length) return {};
  return faixasPorChave(SQL_CHAVE_DESCRICAO, 'text', chaves, excluirPropostaId, executor);
}

module.exports = { LIMITE_IDS, lerIds, faixasPorMaterial, faixasPorDescricao, chaveDescricao, normalizar, sqlNormalizar };
