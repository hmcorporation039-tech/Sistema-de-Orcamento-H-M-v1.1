const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { JWT_SECRET } = require('../config/segredos');
const { ESCOPO: ESCOPO_ASSISTENTE, execucaoDoToken } = require('../services/assistente/sessoes');
const { aplicarEscopoAssistente } = require('./escopoAssistente');
const { sessaoAtiva } = require('../services/sessoesUsuario');
const { acessoDeFora } = require('../utils/ipPedido');

// Papéis (Fase 6, item 7 — 02/11/2026). 'financeiro' e 'tecnico' existem para dar acesso a mais gente
// sem dar tudo; o acesso das rotas que já existiam NÃO mudou (continuam com autenticar/admin). Para
// restringir uma rota nova a um papel: router.get('/x', autenticar, exigePapel('financeiro'), ctrl).
// O administrador passa sempre.
const PAPEIS = [
  { valor: 'admin', rotulo: 'Administrador' },
  { valor: 'financeiro', rotulo: 'Financeiro' },
  { valor: 'tecnico', rotulo: 'Técnico de campo' },
  { valor: 'user', rotulo: 'Usuário' },
];
const VALORES_PAPEIS = PAPEIS.map(p => p.valor);

// Obrigatoriedade da verificação em duas etapas (.env, DESLIGADAS por padrão):
//   TOTP_OBRIGATORIO_ADMIN=true  administrador sem TOTP só acessa a própria conta (para ativar)
//   TOTP_OBRIGATORIO_FORA=true   de fora da rede do escritório, só entra quem tem TOTP ativo
const ligado = (v) => /^(true|1|sim|ligado)$/i.test(String(v || '').trim());
const totpObrigatorioAdmin = () => ligado(process.env.TOTP_OBRIGATORIO_ADMIN);
const totpObrigatorioFora = () => ligado(process.env.TOTP_OBRIGATORIO_FORA);
// o que a conta sem TOTP ainda pode usar quando ele é obrigatório: login/sessão e a tela Minha conta
const ROTA_LIVRE_SEM_TOTP = /^\/api\/(auth\/|conta(\/|$))/;

// Cache curto do estado da conta (ativo/role). Sem ele seria uma consulta ao
// banco por requisição; com 30 segundos, desativar um usuário tira o acesso
// dele em até meio minuto, o que é suficiente e mantém o custo irrelevante.
const CACHE_MS = 30 * 1000;
const cacheUsuarios = new Map(); // id -> { dados, expiraEm }

async function buscarUsuarioAtual(id) {
  const agora = Date.now();
  const emCache = cacheUsuarios.get(id);
  if (emCache && emCache.expiraEm > agora) return emCache.dados;

  const r = await pool.query('SELECT id, nome, email, role, ativo, senha_provisoria, senha_alterada_em, totp_ativo FROM usuarios WHERE id = $1', [id]);
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
    // TOKEN_EXPIRADO: o frontend renova sozinho com a chave da sessão (services/sessoesUsuario.js).
    return res.status(401).json({ erro: 'Token inválido ou expirado', ...(err && err.name === 'TokenExpiredError' ? { codigo: 'TOKEN_EXPIRADO' } : {}) });
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
    // Token de sessão (com sid): vale só enquanto a sessão estiver aberta — sair, "encerrar sessões",
    // senha trocada ou usuário desativado cortam na hora. Token antigo, sem sid, vale até vencer.
    if (decoded.sid !== undefined) {
      if (!Number.isInteger(decoded.sid) || !(await sessaoAtiva(decoded.sid, usuario.id))) {
        return res.status(401).json({ erro: 'A sessão foi encerrada. Entre de novo.', codigo: 'SESSAO_ENCERRADA' });
      }
    }
    req.usuario = {
      id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role, senhaProvisoria: usuario.senha_provisoria === true,
      sessaoId: decoded.sid ?? null, totpAtivo: usuario.totp_ativo === true,
    };
    // Senha provisória (criada/redefinida pelo admin): o servidor só libera a
    // troca de senha — antes isso era exigido apenas pela tela.
    if (req.usuario.senhaProvisoria && !(req.method === 'POST' && req.originalUrl.split('?')[0].endsWith('/auth/senha'))) {
      return res.status(403).json({ erro: 'Defina sua nova senha antes de continuar.', codigo: 'SENHA_PROVISORIA' });
    }
    // Verificação em duas etapas obrigatória (só se ligada no .env; ver acima)
    if (decoded.escopo === undefined && !req.usuario.totpAtivo) {
      if (totpObrigatorioFora() && acessoDeFora(req)) {
        return res.status(403).json({
          erro: 'Fora do escritório, o acesso exige a verificação em duas etapas. Ative-a em Cadastros › Minha conta, de dentro da rede do escritório.',
          codigo: 'TOTP_OBRIGATORIO_FORA',
        });
      }
      if (totpObrigatorioAdmin() && usuario.role === 'admin' && !ROTA_LIVRE_SEM_TOTP.test(req.originalUrl.split('?')[0])) {
        return res.status(403).json({ erro: 'Ative a verificação em duas etapas para continuar.', codigo: 'TOTP_OBRIGATORIO' });
      }
    }
    // Token do assistente virtual (escopo 'assistente', emitido para UMA
    // execução): vale só enquanto a execução está no ar e só nas rotas que o
    // MCP do assistente usa (middleware/escopoAssistente.js). Escopo
    // desconhecido é recusado (inclusive o desafio do login em duas etapas).
    if (decoded.escopo !== undefined) {
      if (decoded.escopo !== ESCOPO_ASSISTENTE) return res.status(401).json({ erro: 'Token inválido ou expirado' });
      const execucao = execucaoDoToken(decoded);
      if (!execucao) return res.status(401).json({ erro: 'A sessão do assistente terminou.', codigo: 'ASSISTENTE_SESSAO_ENCERRADA' });
      return aplicarEscopoAssistente(req, res, next, execucao);
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

// exigePapel('financeiro'), exigePapel('tecnico', 'financeiro')…: passa quem tem um dos papéis; o
// administrador passa sempre. Vem DEPOIS do autenticar (usa req.usuario, com o papel lido do banco).
// Papel escrito errado no código quebra na partida, não na hora do acesso.
function exigePapel(...papeis) {
  const lista = papeis.flat();
  if (!lista.length) throw new Error('exigePapel: informe ao menos um papel');
  for (const p of lista) if (!VALORES_PAPEIS.includes(p)) throw new Error(`exigePapel: papel desconhecido "${p}"`);
  return function exigePapelMiddleware(req, res, next) {
    const papel = req.usuario?.role;
    if (papel === 'admin' || (papel && lista.includes(papel))) return next();
    return res.status(403).json({ erro: 'Seu perfil não tem acesso a esta área.' });
  };
}

module.exports = {
  autenticar, admin, exigePapel, invalidarCacheUsuario, PAPEIS, VALORES_PAPEIS,
  totpObrigatorioAdmin, totpObrigatorioFora,
};
