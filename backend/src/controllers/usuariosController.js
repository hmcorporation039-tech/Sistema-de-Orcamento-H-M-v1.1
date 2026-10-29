const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { invalidarCacheUsuario } = require('../middleware/auth');
const { registrarAuditoria } = require('../services/auditoria');

async function listar(req, res) {
  const result = await pool.query(
    `SELECT id, nome, email, role, ativo, criado_em, ultimo_acesso
     FROM usuarios ORDER BY nome`
  );
  res.json(result.rows);
}

async function criar(req, res) {
  const { nome, email, senha, role } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
  }
  if (senha.length < 8) {
    return res.status(400).json({ erro: 'A senha deve ter ao menos 8 caracteres' });
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 12);
    const result = await pool.query(
      `INSERT INTO usuarios (nome, email, senha, role, senha_provisoria)
       VALUES ($1,$2,$3,$4, true) RETURNING id, nome, email, role, ativo, criado_em`,
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

// Corpo da edição: cada campo é opcional; presente, precisa ter o tipo certo.
// Devolve null nos ausentes (o UPDATE mantém o valor gravado).
function lerCamposUsuario(body) {
  const tem = (k) => Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined && body[k] !== null;
  const out = { nome: null, email: null, role: null, ativo: null };
  if (tem('nome')) {
    if (typeof body.nome !== 'string' || !body.nome.trim()) return { erro: 'Nome inválido.' };
    out.nome = body.nome.trim();
  }
  if (tem('email')) {
    if (typeof body.email !== 'string' || !body.email.trim()) return { erro: 'E-mail inválido.' };
    out.email = body.email.trim();
  }
  if (tem('role')) {
    if (!['admin', 'user'].includes(body.role)) return { erro: 'Papel inválido (admin ou user).' };
    out.role = body.role;
  }
  if (tem('ativo')) {
    if (typeof body.ativo !== 'boolean') return { erro: 'O campo "ativo" deve ser verdadeiro ou falso.' };
    out.ativo = body.ativo;
  }
  return out;
}

async function atualizar(req, res) {
  const { id } = req.params;
  const campos = lerCamposUsuario(req.body || {});
  if (campos.erro) return res.status(400).json({ erro: campos.erro });
  const { nome, email, role, ativo } = campos;

  if (Number(id) === req.usuario.id && ativo === false) {
    return res.status(400).json({ erro: 'Você não pode desativar seu próprio usuário' });
  }
  if (Number(id) === req.usuario.id && role && role !== 'admin') {
    return res.status(400).json({ erro: 'Você não pode remover seu próprio acesso de administrador' });
  }

  try {
    // Campo ausente no corpo mantém o valor gravado (COALESCE). Antes `ativo`
    // ausente virava true (editar o nome de um usuário desativado o reativava)
    // e `role` ausente virava 'user' (revisão de 27/10/2026).
    const result = await pool.query(
      `UPDATE usuarios SET nome = COALESCE($1, nome), email = COALESCE($2, email),
              role = COALESCE($3, role), ativo = COALESCE($4::boolean, ativo)
       WHERE id=$5 RETURNING id, nome, email, role, ativo, criado_em`,
      [nome, email, role, ativo, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    // Desativar ou rebaixar precisa valer imediatamente, não só quando o cache
    // de 30s expirar.
    invalidarCacheUsuario(id);
    await registrarAuditoria(pool, { entidade: 'usuario', entidadeId: Number(id), acao: 'alterado', detalhes: { role: result.rows[0].role, ativo: result.rows[0].ativo, email: result.rows[0].email }, usuarioId: req.usuario.id });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ erro: 'Já existe um usuário com esse e-mail' });
    }
    console.error('Erro ao atualizar usuário:', err);
    res.status(500).json({ erro: 'Erro ao atualizar usuário' });
  }
}

async function remover(req, res) {
  const { id } = req.params;

  if (Number(id) === req.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode excluir seu próprio usuário' });
  }

  try {
    const result = await pool.query('DELETE FROM usuarios WHERE id=$1 RETURNING id, nome, email, role', [id]);
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
    invalidarCacheUsuario(id);
    await registrarAuditoria(pool, { entidade: 'usuario', entidadeId: Number(id), acao: 'excluido', detalhes: result.rows[0], usuarioId: req.usuario.id });
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

  if (!novaSenha || novaSenha.length < 8) {
    return res.status(400).json({ erro: 'A nova senha deve ter ao menos 8 caracteres' });
  }

  const senhaHash = await bcrypt.hash(novaSenha, 12);
  const result = await pool.query(
    'UPDATE usuarios SET senha=$1, senha_provisoria=true, senha_alterada_em=NOW() WHERE id=$2 RETURNING id',
    [senhaHash, id]
  );
  if (result.rows.length === 0) return res.status(404).json({ erro: 'Usuário não encontrado' });
  invalidarCacheUsuario(id); // sessões abertas com a senha antiga caem na hora
  await registrarAuditoria(pool, { entidade: 'usuario', entidadeId: Number(id), acao: 'senha_redefinida', usuarioId: req.usuario.id });
  res.json({ mensagem: 'Senha redefinida com sucesso' });
}

module.exports = { listar, criar, atualizar, remover, redefinirSenha, lerCamposUsuario };
