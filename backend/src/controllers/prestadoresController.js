const pool = require('../config/database');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');
const { vincularPrestadores } = require('../utils/vincularPrestadores');

const CATEGORIAS_VALIDAS = ['mao_de_obra', 'material', 'despesa'];

async function listar(req, res) {
  const { busca, categoria } = req.query;
  const { pagina, porPagina, offset } = parsePaginacao(req.query);

  let condicoes = 'WHERE p.ativo = true';
  const params = [];

  if (busca) {
    params.push(`%${busca}%`);
    condicoes += ` AND (p.nome ILIKE $1 OR p.documento ILIKE $1 OR p.email ILIKE $1)`;
  }
  if (categoria) {
    params.push(categoria);
    condicoes += ` AND p.categoria = $${params.length}`;
  }

  try {
    const total = await pool.query(`SELECT count(*) FROM prestadores p ${condicoes}`, params);
    const result = await pool.query(
      `SELECT p.*,
        COALESCE(SUM(fm.valor) FILTER (WHERE fm.tipo = 'realizado'), 0) AS total_pago,
        COALESCE(SUM(fm.valor) FILTER (WHERE fm.tipo = 'realizado' AND fm.categoria = 'mao_de_obra'), 0) AS total_mao_de_obra,
        COALESCE(SUM(fm.valor) FILTER (WHERE fm.tipo = 'realizado' AND fm.categoria = 'material'), 0) AS total_material,
        COALESCE(SUM(fm.valor) FILTER (WHERE fm.tipo = 'realizado' AND fm.categoria = 'despesa'), 0) AS total_despesa,
        COALESCE(SUM(fm.valor) FILTER (WHERE fm.tipo = 'realizado' AND fm.categoria IS NULL), 0) AS total_sem_categoria
       FROM prestadores p
       LEFT JOIN financeiro_movimentos fm ON fm.prestador_id = p.id
       ${condicoes}
       GROUP BY p.id
       ORDER BY p.nome
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, porPagina, offset]
    );
    res.json(montarResposta(result.rows, parseInt(total.rows[0].count, 10), pagina, porPagina));
  } catch (err) {
    console.error('Erro ao listar prestadores:', err);
    res.status(500).json({ erro: 'Erro ao listar prestadores' });
  }
}

const TIPOS_VALIDOS = ['Pessoa Física', 'Pessoa Jurídica'];

async function criar(req, res) {
  const { nome, email, telefone, documento, chavePix, categoria, tipo } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
  if (categoria && !CATEGORIAS_VALIDAS.includes(categoria)) {
    return res.status(400).json({ erro: 'Categoria inválida' });
  }
  if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO prestadores (nome, email, telefone, documento, chave_pix, categoria, tipo)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nome, email, telefone, documento, chavePix, categoria || null, tipo || 'Pessoa Física']
    );
    await vincularPrestadores();
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar prestador:', err);
    res.status(500).json({ erro: 'Erro ao criar prestador' });
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, email, telefone, documento, chavePix, categoria, tipo } = req.body;
  if (categoria && !CATEGORIAS_VALIDAS.includes(categoria)) {
    return res.status(400).json({ erro: 'Categoria inválida' });
  }
  if (tipo && !TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo inválido' });
  }

  try {
    const result = await pool.query(
      `UPDATE prestadores SET nome=$1, email=$2, telefone=$3, documento=$4, chave_pix=$5, categoria=$6, tipo=$7, atualizado_em=NOW()
       WHERE id=$8 AND ativo=true RETURNING *`,
      [nome, email, telefone, documento, chavePix, categoria || null, tipo || 'Pessoa Física', id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Prestador não encontrado' });
    await vincularPrestadores();
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar prestador:', err);
    res.status(500).json({ erro: 'Erro ao atualizar prestador' });
  }
}

async function remover(req, res) {
  const { id } = req.params;
  try {
    await pool.query('UPDATE prestadores SET ativo=false WHERE id=$1', [id]);
    res.json({ mensagem: 'Prestador removido' });
  } catch (err) {
    console.error('Erro ao remover prestador:', err);
    res.status(500).json({ erro: 'Erro ao remover prestador' });
  }
}

module.exports = { listar, criar, atualizar, remover };
