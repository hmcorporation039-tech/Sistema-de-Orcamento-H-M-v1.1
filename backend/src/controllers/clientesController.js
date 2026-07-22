const pool = require('../config/database');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');

async function listar(req, res) {
  const { busca } = req.query;
  const { pagina, porPagina, offset } = parsePaginacao(req.query);

  let condicoes = 'WHERE ativo = true';
  const params = [];

  if (busca) {
    params.push(`%${busca}%`);
    condicoes += ` AND (nome ILIKE $1 OR documento ILIKE $1 OR email ILIKE $1)`;
  }

  try {
    const total = await pool.query(`SELECT count(*) FROM clientes ${condicoes}`, params);
    const result = await pool.query(
      `SELECT * FROM clientes ${condicoes} ORDER BY nome LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, porPagina, offset]
    );
    res.json(montarResposta(result.rows, parseInt(total.rows[0].count, 10), pagina, porPagina));
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar clientes' });
  }
}

async function criar(req, res) {
  const { nome, documento, tipo, responsavel, telefone, email, endereco } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });

  try {
    const result = await pool.query(
      `INSERT INTO clientes (nome, documento, tipo, responsavel, telefone, email, endereco)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nome, documento, tipo || 'Empresa', responsavel, telefone, email, endereco]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar cliente' });
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, documento, tipo, responsavel, telefone, email, endereco } = req.body;

  try {
    const result = await pool.query(
      `UPDATE clientes SET nome=$1, documento=$2, tipo=$3, responsavel=$4,
       telefone=$5, email=$6, endereco=$7, atualizado_em=NOW()
       WHERE id=$8 AND ativo=true RETURNING *`,
      [nome, documento, tipo, responsavel, telefone, email, endereco, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar cliente' });
  }
}

async function remover(req, res) {
  const { id } = req.params;
  try {
    await pool.query('UPDATE clientes SET ativo=false WHERE id=$1', [id]);
    res.json({ mensagem: 'Cliente removido' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover cliente' });
  }
}

module.exports = { listar, criar, atualizar, remover };
