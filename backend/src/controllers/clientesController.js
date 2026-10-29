const pool = require('../config/database');
const { registrarAuditoria } = require('../services/auditoria');
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

  const total = await pool.query(`SELECT count(*) FROM clientes ${condicoes}`, params);
  const result = await pool.query(
    `SELECT * FROM clientes ${condicoes} ORDER BY nome LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, porPagina, offset]
  );
  res.json(montarResposta(result.rows, parseInt(total.rows[0].count, 10), pagina, porPagina));
}

// Validação do cadastro (teste de 28/10/2026: nome só com espaços, tipo
// inventado e e-mail sem "@" eram aceitos; nome acima de 200 caracteres virava 500)
const CAMPOS = ['nome', 'documento', 'tipo', 'responsavel', 'telefone', 'email', 'endereco'];
const TIPOS = ['Empresa', 'Pessoa Física', 'Órgão Público'];
const LIMITE = { nome: 200, documento: 20, responsavel: 100, telefone: 20, email: 100, endereco: 1000 };
function dadosDoCliente(body, atual = null) {
  // campo que não veio no pedido fica como está (antes o PUT parcial apagava documento, e-mail…)
  const d = {};
  for (const c of CAMPOS) {
    const v = Object.prototype.hasOwnProperty.call(body || {}, c) ? body[c] : atual?.[c];
    d[c] = v == null ? null : String(v).trim() || null;
  }
  d.tipo = d.tipo || 'Empresa';
  if (!d.nome) return { erro: 'Nome é obrigatório' };
  if (!TIPOS.includes(d.tipo)) return { erro: `Tipo inválido (use ${TIPOS.join(', ')}).` };
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return { erro: 'E-mail inválido.' };
  for (const [c, max] of Object.entries(LIMITE)) if (d[c] && d[c].length > max) return { erro: `O campo ${c} passa de ${max} caracteres.` };
  return { d };
}

async function criar(req, res) {
  const { d, erro } = dadosDoCliente(req.body);
  if (erro) return res.status(400).json({ erro });
  const result = await pool.query(
    `INSERT INTO clientes (nome, documento, tipo, responsavel, telefone, email, endereco)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    CAMPOS.map(c => d[c])
  );
  await registrarAuditoria(pool, { entidade: 'clientes', entidadeId: result.rows[0].id, acao: 'criar', usuarioId: req.usuario.id, detalhes: { nome: d.nome } });
  res.status(201).json(result.rows[0]);
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { rows: [atual] } = await pool.query('SELECT * FROM clientes WHERE id = $1 AND ativo = true', [id]);
  if (!atual) return res.status(404).json({ erro: 'Cliente não encontrado' });
  const { d, erro } = dadosDoCliente(req.body, atual);
  if (erro) return res.status(400).json({ erro });
  const result = await pool.query(
    `UPDATE clientes SET nome=$1, documento=$2, tipo=$3, responsavel=$4,
     telefone=$5, email=$6, endereco=$7, atualizado_em=NOW()
     WHERE id=$8 AND ativo=true RETURNING *`,
    [...CAMPOS.map(c => d[c]), id]
  );
  if (result.rows.length === 0) return res.status(404).json({ erro: 'Cliente não encontrado' });
  const mudou = CAMPOS.filter(c => (atual[c] ?? null) !== d[c]);
  if (mudou.length) await registrarAuditoria(pool, { entidade: 'clientes', entidadeId: atual.id, acao: 'editar', usuarioId: req.usuario.id, detalhes: { campos: mudou } });
  res.json(result.rows[0]);
}

async function remover(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query('UPDATE clientes SET ativo=false WHERE id=$1 AND ativo=true RETURNING id, nome', [id]);
  if (rows[0]) await registrarAuditoria(pool, { entidade: 'clientes', entidadeId: rows[0].id, acao: 'desativar', usuarioId: req.usuario.id, detalhes: { nome: rows[0].nome } });
  res.json({ mensagem: 'Cliente removido' });
}

module.exports = { listar, criar, atualizar, remover };
