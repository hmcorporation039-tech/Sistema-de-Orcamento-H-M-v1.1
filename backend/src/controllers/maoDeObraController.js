const pool = require('../config/database');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');

// Lista os serviços de mão de obra ATIVOS da base única (versão 2.0:
// precos_mao_de_obra_referencia — os padrão + os lançados em propostas; ver
// utils/servicosBase.js). Mantém o formato antigo de /mao-de-obra-itens
// (id, descricao, unidade, valor_unitario) para quem ainda chama esta rota;
// `id` agora é o código do serviço e valor_unitario é o valor H&M adotado ou,
// sem ele, a referência particular. A tela Orçamento usa GET /servicos, que
// traz também a sugestão por segmento do cliente.
async function listar(req, res) {
  const { busca } = req.query;
  const { pagina, porPagina, offset } = parsePaginacao(req.query);

  let condicoes = 'WHERE ativo = true';
  const params = [];
  if (busca) {
    params.push(`%${busca}%`);
    condicoes += ` AND descricao ILIKE $${params.length}`;
  }

  const total = await pool.query(`SELECT count(*) FROM precos_mao_de_obra_referencia ${condicoes}`, params);
  const result = await pool.query(
    `SELECT codigo AS id, codigo, descricao, unidade, disciplina, origem,
            COALESCE(valor_referencia, valor_privado, 0) AS valor_unitario
       FROM precos_mao_de_obra_referencia ${condicoes}
      ORDER BY descricao LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, porPagina, offset]
  );
  res.json(montarResposta(result.rows, parseInt(total.rows[0].count, 10), pagina, porPagina));
}

module.exports = { listar };
