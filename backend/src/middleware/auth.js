const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { JWT_SECRET } = require('../config/segredos');

// Cache curto do estado da conta (ativo/role). Sem ele seria uma consulta ao
// banco por requisição; com 30 segundos, desativar um usuário tira o acesso
// dele em até meio minuto, o que é suficiente e mantém o custo irrelevante.
const CACHE_MS = 30 * 1000;
const cacheUsuarios = new Map(); // id -> { dados, expiraEm }

async function buscarUsuarioAtual(id) {
  const agora = Date.now();
  const emCache = cacheUsuarios.get(id);
  if (emCache && emCache.expiraEm > agora) return emCache.dados;

  const r = await pool.query('SELECT id, nome, email, role, ativo, senha_provisoria, senha_alterada_em FROM usuarios WHERE id = $1', [id]);
  const dados = r.rows[0] || null;
  cacheUsuarios.set(id, { dados, expiraEm: agora + CACHE_MS });
  return dados;
}

// Invalida o cache de um usuário — chamado quando a conta é alterada
// (desativada, rebaixada, excluída) para que a mudança valha na hora.
function invalidarCacheUsuario(id) {
  cacheUsuarios.delete(Number(id));
}

async function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    // 401 (e não 403): token expirado/inválido significa "autentique-se de novo".
    // O frontend já trata os dois, mas 401 é o código correto para sessão inválida.
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }

  try {
    // O token sozinho não basta: antes, desativar um funcionário não revogava
    // nada — ele seguia criando, editando e apagando por até 8 horas (o prazo
    // do token). O mesmo valia para rebaixar um admin: o token antigo
    // continuava passando pelo middleware `admin`, que lia o papel de dentro
    // do próprio token. Agora o estado atual da conta vem do banco.
    const usuario = await buscarUsuarioAtual(decoded.id);
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Conta inativa ou inexistente. Faça login novamente.' });
    }
    // Senha trocada/redefinida depois que o token foi emitido: a sessão antiga
    // (inclusive um token roubado) deixa de valer na hora.
    if (usuario.senha_alterada_em && (decoded.iat || 0) * 1000 < new Date(usuario.senha_alterada_em).getTime() - 1000) {
      return res.status(401).json({ erro: 'A senha foi alterada. Faça login novamente.' });
    }
    req.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role, senhaProvisoria: usuario.senha_provisoria === true };
    // Senha provisória (criada/redefinida pelo admin): o servidor só libera a
    // troca de senha — antes isso era exigido apenas pela tela.
    if (req.usuario.senhaProvisoria && !(req.method === 'POST' && req.originalUrl.split('?')[0].endsWith('/auth/senha'))) {
      return res.status(403).json({ erro: 'Defina sua nova senha antes de continuar.', codigo: 'SENHA_PROVISORIA' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

function admin(req, res, next) {
  if (req.usuario?.role !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito a administradores' });
  }
  next();
}

module.exports = { autenticar, admin, invalidarCacheUsuario };
