const pool = require('../config/database');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');

// Lista o catálogo de itens de mão de obra (ver utils/catalogoAutoCadastro.js
// — a tabela cresce sozinha conforme itens são lançados nos orçamentos).
// Usado pra alimentar o dropdown de sugestão na aba Orçamento.
async function listar(req, res) {
  const { busca } = req.query;
  const { pagina, porPagina, offset } = parsePaginacao(req.query);

  let condicoes = 'WHERE ativo = true';
  const params = [];
  if (busca) {
    params.push(`%${busca}%`);
    condicoes += ` AND descricao ILIKE $${params.length}`;
  }

  try {
    const total = await pool.query(`SELECT count(*) FROM mao_de_obra_itens ${condicoes}`, params);
    const result = await pool.query(
      `SELECT * FROM mao_de_obra_itens ${condicoes} ORDER BY descricao LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, porPagina, offset]
    );
    res.json(montarResposta(result.rows, parseInt(total.rows[0].count, 10), pagina, porPagina));
  } catch (err) {
    console.error('Erro ao listar itens de mão de obra:', err);
    res.status(500).json({ erro: 'Erro ao listar itens de mão de obra' });
  }
}

module.exports = { listar };
