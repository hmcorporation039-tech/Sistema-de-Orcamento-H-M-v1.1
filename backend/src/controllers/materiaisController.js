const pool = require('../config/database');
const { extrairNotaFiscal } = require('../utils/notaFiscalParser');

async function listar(req, res) {
  const { busca, categoria } = req.query;
  let query = 'SELECT * FROM materiais WHERE ativo = true';
  const params = [];

  if (categoria) {
    params.push(categoria);
    query += ` AND categoria = $${params.length}`;
  }
  if (busca) {
    params.push(`%${busca}%`);
    query += ` AND (descricao ILIKE $${params.length} OR codigo ILIKE $${params.length} OR marca ILIKE $${params.length})`;
  }

  query += ' ORDER BY categoria, descricao';

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar materiais' });
  }
}

async function criar(req, res) {
  const { codigo, descricao, categoria, unidade, preco, preco_compra, marca, ncm } = req.body;

  if (!descricao || !categoria || !unidade) {
    return res.status(400).json({ erro: 'Descrição, categoria e unidade são obrigatórios' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO materiais (codigo, descricao, categoria, unidade, preco, preco_compra, marca, ncm, origem, preco_manual)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'manual',true) RETURNING *`,
      [codigo, descricao, categoria, unidade, preco || 0, preco_compra || null, marca, ncm]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar material' });
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { codigo, descricao, categoria, unidade, preco, preco_compra, marca, ncm } = req.body;

  try {
    const result = await pool.query(
      `UPDATE materiais SET codigo=$1, descricao=$2, categoria=$3,
       unidade=$4, preco=$5, preco_compra=$6, marca=$7, ncm=$8, origem='manual', preco_manual=true, atualizado_em=NOW()
       WHERE id=$9 AND ativo=true RETURNING *`,
      [codigo, descricao, categoria, unidade, preco || 0, preco_compra || null, marca, ncm, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Material não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar material' });
  }
}

async function remover(req, res) {
  const { id } = req.params;
  try {
    await pool.query('UPDATE materiais SET ativo=false WHERE id=$1', [id]);
    res.json({ mensagem: 'Material removido' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover material' });
  }
}

async function importar(req, res) {
  const { materiais } = req.body;
  if (!Array.isArray(materiais) || materiais.length === 0) {
    return res.status(400).json({ erro: 'Lista de materiais inválida' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let importados = 0;
    for (const m of materiais) {
      if (!m.descricao || !m.categoria || !m.unidade) continue;
      await client.query(
        `INSERT INTO materiais (codigo, descricao, categoria, unidade, preco, preco_compra, marca, ncm, origem)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [m.codigo || m.cod, m.descricao || m.desc, m.categoria || m.cat,
         m.unidade || m.un, m.preco || m.pr || 0, m.preco_compra || null, m.marca || '', m.ncm || null,
         m.origem || 'importacao']
      );
      importados++;
    }
    await client.query('COMMIT');
    res.json({ mensagem: `${importados} materiais importados com sucesso` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro ao importar materiais' });
  } finally {
    client.release();
  }
}

async function extrairNota(req, res) {
  if (!req.file) {
    return res.status(400).json({ erro: 'Envie um arquivo PDF (DANFE) ou XML da NF-e' });
  }

  try {
    const resultado = await extrairNotaFiscal(req.file.buffer, req.file.originalname);
    if (resultado.itens.length === 0) {
      return res.status(422).json({ erro: 'Não foi possível identificar itens no arquivo enviado' });
    }
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao extrair nota fiscal:', err);
    res.status(422).json({ erro: err.message || 'Erro ao ler o arquivo da nota fiscal' });
  }
}

module.exports = { listar, criar, atualizar, remover, importar, extrairNota };
