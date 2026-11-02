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

// { [material_id]: { propostas, minimo, mediana, maximo, ultimo, ultima_data, ultima_proposta } }
// `excluirPropostaId`: a proposta que está sendo editada não conta contra si mesma.
async function faixasPorMaterial(ids, { excluirPropostaId = null } = {}, executor = pool) {
  if (!ids || !ids.length) return {};
  const { rows } = await executor.query(
    `WITH linhas AS (
       SELECT i.material_id, i.valor_unitario::float8 AS vu, p.id AS proposta_id, p.numero, p.data
         FROM proposta_itens i
         JOIN propostas p ON p.id = i.proposta_id
        WHERE p.status = 'Aprovada'
          AND i.material_id = ANY($1::int[])
          AND i.valor_unitario > 0
          AND COALESCE(i.status, 'confirmado') = 'confirmado'
          AND ($2::int IS NULL OR p.id <> $2)
     ),
     ultimas AS (
       SELECT DISTINCT ON (material_id) material_id, vu, numero, data
         FROM linhas ORDER BY material_id, data DESC, proposta_id DESC, vu DESC
     )
     SELECT l.material_id,
            COUNT(DISTINCT l.proposta_id)::int AS propostas,
            MIN(l.vu) AS minimo,
            percentile_cont(0.5) WITHIN GROUP (ORDER BY l.vu) AS mediana,
            MAX(l.vu) AS maximo,
            u.vu AS ultimo, to_char(u.data, 'YYYY-MM-DD') AS ultima_data, u.numero AS ultima_proposta
       FROM linhas l JOIN ultimas u ON u.material_id = l.material_id
      GROUP BY l.material_id, u.vu, u.data, u.numero`,
    [ids, excluirPropostaId]
  );
  const faixas = {};
  for (const r of rows) {
    faixas[r.material_id] = {
      propostas: r.propostas, minimo: dinheiro(r.minimo), mediana: dinheiro(r.mediana), maximo: dinheiro(r.maximo),
      ultimo: dinheiro(r.ultimo), ultima_data: r.ultima_data, ultima_proposta: r.ultima_proposta,
    };
  }
  return faixas;
}

module.exports = { LIMITE_IDS, lerIds, faixasPorMaterial };
