const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/segredos');

function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    // 401 (e não 403): token expirado/inválido significa "autentique-se de novo".
    // O frontend já trata os dois, mas 401 é o código correto para sessão inválida.
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

function admin(req, res, next) {
  if (req.usuario?.role !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito a administradores' });
  }
  next();
}

module.exports = { autenticar, admin };
