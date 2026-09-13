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

  const r = await pool.query('SELECT id, nome, email, role, ativo FROM usuarios WHERE id = $1', [id]);
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
    decoded = jwt.verify(token, JWT_SECRET);
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
    req.usuario = { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role };
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
