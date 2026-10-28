const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { invalidarCacheUsuario } = require('../middleware/auth');
const { JWT_SECRET } = require('../config/segredos');

// Hash de comparação para e-mail inexistente: o login leva o mesmo tempo com
// ou sem conta, então não dá para descobrir quais e-mails existem pelo tempo.
const HASH_FICTICIO = bcrypt.hashSync('senha-que-nao-existe-' + Date.now(), 12);
const CUSTO_BCRYPT = 12;

function emitirToken(usuario) {
  return jwt.sign({ id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role }, JWT_SECRET, { expiresIn: '8h', algorithm: 'HS256' });
}

async function login(req, res) {
  const { email, senha } = req.body || {};

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });
  }
  if (typeof email !== 'string' || typeof senha !== 'string') {
    return res.status(400).json({ erro: 'E-mail e senha devem ser texto' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
      [email]
    );

    const usuario = result.rows[0];
    const senhaOk = await bcrypt.compare(String(senha), usuario ? usuario.senha : HASH_FICTICIO);
    if (!usuario) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
    }

    if (!senhaOk) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
    }

    // Atualizar último acesso
    await pool.query(
      'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1',
      [usuario.id]
    );

    const token = emitirToken(usuario);

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        // Quando true, o frontend abre a tela de troca de senha logo após o
        // login e só libera o sistema depois que a pessoa definir a sua.
        senhaProvisoria: usuario.senha_provisoria === true,
      }
    });

  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno do servidor' });
  }
}

async function alterarSenha(req, res) {
  const { senhaAtual, novaSenha } = req.body || {};
  const userId = req.usuario.id;

  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ erro: 'Preencha todos os campos' });
  }
  // número/objeto no corpo: antes `novaSenha.toLowerCase()` lançava fora do
  // try e o pedido ficava pendurado (revisão de 27/10/2026)
  if (typeof senhaAtual !== 'string' || typeof novaSenha !== 'string') {
    return res.status(400).json({ erro: 'As senhas devem ser texto' });
  }
  if (novaSenha.length < 8) {
    return res.status(400).json({ erro: 'A nova senha deve ter ao menos 8 caracteres' });
  }
  if (novaSenha === senhaAtual) {
    return res.status(400).json({ erro: 'A nova senha precisa ser diferente da atual' });
  }
  // Barra as senhas óbvias — não adianta exigir troca e a pessoa colocar
  // "admin123" de novo.
  const SENHAS_PROIBIDAS = ['admin123', 'senha123', '12345678', 'password', 'hmengenharia'];
  if (SENHAS_PROIBIDAS.includes(novaSenha.toLowerCase())) {
    return res.status(400).json({ erro: 'Essa senha é muito comum. Escolha outra.' });
  }

  try {
    const result = await pool.query('SELECT id, nome, email, role, senha FROM usuarios WHERE id = $1', [userId]);
    const usuario = result.rows[0];
    // Sem esta checagem, um token de usuário já excluído causava
    // "Cannot read properties of undefined" → 500 sem nenhum log, impossível
    // de diagnosticar pelo suporte.
    if (!usuario) {
      return res.status(401).json({ erro: 'Conta não encontrada. Faça login novamente.' });
    }

    const ok = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!ok) {
      return res.status(401).json({ erro: 'Senha atual incorreta' });
    }

    const hash = await bcrypt.hash(novaSenha, CUSTO_BCRYPT);
    // Ao definir a própria senha, ela deixa de ser provisória e o aviso de
    // troca obrigatória some. senha_alterada_em derruba as outras sessões; esta
    // continua com o token novo devolvido abaixo.
    await pool.query(
      'UPDATE usuarios SET senha = $1, senha_provisoria = false, senha_alterada_em = NOW() WHERE id = $2',
      [hash, userId]
    );
    invalidarCacheUsuario(userId);
    await new Promise(r => setTimeout(r, 1100)); // token novo com emissão posterior à troca

    res.json({ mensagem: 'Senha alterada com sucesso', token: emitirToken(usuario) });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    res.status(500).json({ erro: 'Erro ao alterar senha' });
  }
}

module.exports = { login, alterarSenha };
