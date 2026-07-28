const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function listar(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, nome, email, role, ativo, criado_em, ultimo_acesso
       FROM usuarios ORDER BY nome`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar usuários' });
  }
}

async function criar(req, res) {
  const { nome, email, senha, role } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
  }
  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter ao menos 6 caracteres' });
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, role)
       VALUES ($1,$2,$3,$4) RETURNING id, nome, email, role, ativo, criado_em`,
      [nome, email, senhaHash, role === 'admin' ? 'admin' : 'user']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Já existe um usuário com esse e-mail' });
    }
    res.status(500).json({ erro: 'Erro ao criar usuário' });
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { nome, email, role, ativo } = req.body;

  if (Number(id) === req.usuario.id && ativo === false) {
    return res.status(400).json({ erro: 'Você não pode desativar seu próprio usuário' });
  }
  if (Number(id) === req.usuario.id && role && role !== 'admin') {
    return res.status(400).json({ erro: 'Você não pode remover seu próprio acesso de administrador' });
  }

  try {
    const result = await pool.query(
      `UPDATE usuarios SET nome=$1, email=$2, role=$3, ativo=$4
       WHERE id=$5 RETURNING id, nome, email, role, ativo, criado_em`,
      [nome, email, role === 'admin' ? 'admin' : 'user', ativo !== false, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Já existe um usuário com esse e-mail' });
    }
    res.status(500).json({ erro: 'Erro ao atualizar usuário' });
  }
}

async function remover(req, res) {
  const { id } = req.params;

  if (Number(id) === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode excluir seu próprio usuário' });
  }

  try {
    const result = await pool.query('DELETE FROM usuarios WHERE id=$1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ mensagem: 'Usuário excluído com sucesso' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        erro: 'Este usuário já tem propostas ou ações registradas no sistema e não pode ser excluído. Desative-o em vez de excluir.'
      });
    }
    res.status(500).json({ erro: 'Erro ao excluir usuário' });
  }
}

async function redefinirSenha(req, res) {
  const { id } = req.params;
  const { novaSenha } = req.body;

  if (!novaSenha || novaSenha.length < 6) {
    return res.status(400).json({ erro: 'A nova senha deve ter ao menos 6 caracteres' });
  }

  try {
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    const result = await pool.query(
      'UPDATE usuarios SET senha=$1 WHERE id=$2 RETURNING id',
      [senhaHash, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ mensagem: 'Senha redefinida com sucesso' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao redefinir senha' });
  }
}

module.exports = { listar, criar, atualizar, remover, redefinirSenha };
