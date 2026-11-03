const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { invalidarCacheUsuario, totpObrigatorioAdmin, totpObrigatorioFora } = require('../middleware/auth');
const { JWT_SECRET } = require('../config/segredos');
const S = require('../services/sessoesUsuario');
const segundaEtapa = require('../services/segundaEtapa');
const { registrarAuditoria } = require('../services/telefonesVerificados');
const { ipDoPedido, acessoDeFora, descreverDispositivo } = require('../utils/ipPedido');

// Hash de comparação para e-mail inexistente: o login leva o mesmo tempo com
// ou sem conta, então não dá para descobrir quais e-mails existem pelo tempo.
const HASH_FICTICIO = bcrypt.hashSync('senha-que-nao-existe-' + Date.now(), 12);
const CUSTO_BCRYPT = 12;
// Desafio da segunda etapa: depois da senha certa, a pessoa tem 5 min para digitar o código do
// aplicativo. É um JWT de escopo próprio, que o `autenticar` recusa em qualquer outra rota.
const ESCOPO_DESAFIO = 'login-totp';
const VALIDADE_DESAFIO = '5m';

// Token sem sessão (8 h) — só para quem ainda está com um token de antes das sessões revogáveis e
// troca a senha (a troca devolve um token novo para a tela continuar).
function emitirTokenLegado(usuario) {
  return jwt.sign({ id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role }, JWT_SECRET, { expiresIn: '8h', algorithm: 'HS256' });
}

const resumoUsuario = (u) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  role: u.role,
  // Quando true, o frontend abre a tela de troca de senha logo após o
  // login e só libera o sistema depois que a pessoa definir a sua.
  senhaProvisoria: u.senha_provisoria === true,
  totpAtivo: u.totp_ativo === true,
  // TOTP_OBRIGATORIO_ADMIN ligado e o administrador ainda sem TOTP: a tela leva direto para ativar
  totpPendente: totpObrigatorioAdmin() && u.role === 'admin' && u.totp_ativo !== true,
});

// Abre a sessão (token curto + chave de renovação), registra e avisa de login novo.
async function concluirLogin(req, res, usuario, { metodo, extra = {} }) {
  const ip = ipDoPedido(req);
  const dispositivo = descreverDispositivo(req.headers['user-agent']);
  // A tela manda o id do navegador. Quem não manda (o MCP do Claude Desktop, scripts) é identificado
  // pelo programa + IP: assim cada novo login dele substitui a sessão anterior em vez de acumular.
  const dispositivoId = S.normalizarDispositivoId(req.body?.dispositivo)
    || `p-${require('crypto').createHash('sha256').update(`${req.headers['user-agent'] || ''}|${ip || ''}`).digest('hex').slice(0, 30)}`;
  const novo = await S.conferirLoginNovo(usuario.id, { dispositivoId, ip });
  const sessao = await S.criarSessao(usuario, { dispositivoId, dispositivo, ip });

  // Atualizar último acesso
  await pool.query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [usuario.id]);
  await registrarAuditoria({ usuario_id: usuario.id, acao: 'login', detalhe: { metodo, sessao_id: sessao.sessaoId, dispositivo, ...extra }, ip });
  // o e-mail do aviso não segura a resposta do login
  if (novo.novo) S.avisarLoginNovo(usuario, { dispositivo, ip, dispositivoNovo: novo.dispositivoNovo, ipNovo: novo.ipNovo }).catch(() => {});

  res.json({ token: sessao.token, renovacao: sessao.renovacao, usuario: resumoUsuario(usuario), ...extra });
}

async function login(req, res) {
  const { email, senha } = req.body || {};

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });
  }
  if (typeof email !== 'string' || typeof senha !== 'string') {
    return res.status(400).json({ erro: 'E-mail e senha devem ser texto' });
  }

  // e-mail sem diferença de caixa nem espaços nas pontas (o cadastro grava em
  // minúsculas). Se ainda houver duas contas antigas só com a caixa diferente
  // (a migração 2.0-41 avisa no log), vale a de grafia idêntica.
  const result = await pool.query(
    `SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1) AND ativo = true
      ORDER BY (email = $1) DESC, id LIMIT 1`,
    [email.trim()]
  );

  const usuario = result.rows[0];
  const senhaOk = await bcrypt.compare(String(senha), usuario ? usuario.senha : HASH_FICTICIO);
  const ip = ipDoPedido(req);
  if (!usuario || !senhaOk) {
    await registrarAuditoria({
      usuario_id: usuario ? usuario.id : null, acao: 'login_falhou',
      detalhe: { email: email.trim().toLowerCase().slice(0, 100), motivo: usuario ? 'senha' : 'conta' }, ip,
    });
    return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
  }

  // Segunda etapa: quem ativou o TOTP recebe um desafio e manda o código em /auth/login/totp
  if (usuario.totp_ativo) {
    const desafio = jwt.sign({ id: usuario.id, escopo: ESCOPO_DESAFIO }, JWT_SECRET, { expiresIn: VALIDADE_DESAFIO, algorithm: 'HS256' });
    return res.json({ precisaTotp: true, desafio });
  }
  if (totpObrigatorioFora() && acessoDeFora(req)) {
    await registrarAuditoria({ usuario_id: usuario.id, acao: 'login_recusado', detalhe: { motivo: 'totp_obrigatorio_fora' }, ip });
    return res.status(403).json({
      erro: 'Fora do escritório, o acesso exige a verificação em duas etapas. Ative-a em Cadastros › Minha conta, de dentro da rede do escritório.',
      codigo: 'TOTP_OBRIGATORIO_FORA',
    });
  }
  return concluirLogin(req, res, usuario, { metodo: 'senha' });
}

// Segunda etapa do login: { desafio, codigo } — código do aplicativo (6 dígitos) ou de recuperação.
async function loginTotp(req, res) {
  const { desafio, codigo } = req.body || {};
  if (typeof desafio !== 'string' || (typeof codigo !== 'string' && typeof codigo !== 'number')) {
    return res.status(400).json({ erro: 'Informe o código do aplicativo autenticador.' });
  }
  let d;
  try {
    d = jwt.verify(desafio, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ erro: 'O prazo para digitar o código acabou. Entre de novo com a senha.', codigo: 'DESAFIO_VENCIDO' });
  }
  if (d.escopo !== ESCOPO_DESAFIO) return res.status(401).json({ erro: 'Pedido inválido. Entre de novo com a senha.', codigo: 'DESAFIO_VENCIDO' });

  const { rows: [usuario] } = await pool.query('SELECT * FROM usuarios WHERE id = $1 AND ativo = true', [d.id]);
  if (!usuario || !usuario.totp_ativo) return res.status(401).json({ erro: 'Pedido inválido. Entre de novo com a senha.', codigo: 'DESAFIO_VENCIDO' });

  const ip = ipDoPedido(req);
  const r = await segundaEtapa.conferir(usuario.id, String(codigo));
  if (!r.ok) {
    await registrarAuditoria({ usuario_id: usuario.id, acao: 'login_totp_falhou', ip });
    if (r.motivo === 'configuracao') {
      return res.status(503).json({ erro: 'Não foi possível conferir o código do aplicativo neste servidor. Use um código de recuperação ou fale com o administrador.' });
    }
    return res.status(401).json({ erro: 'Código incorreto. Confira o aplicativo e tente de novo.' });
  }
  return concluirLogin(req, res, usuario, {
    metodo: r.metodo === 'recuperacao' ? 'senha+recuperacao' : 'senha+totp',
    extra: r.metodo === 'recuperacao' ? { codigosRecuperacaoRestantes: r.restantes } : {},
  });
}

// Renovação do token de acesso: { renovacao } → { token, renovacao? }. Não passa pelo `autenticar`
// (o token de acesso já venceu): quem autentica aqui é a própria chave de renovação da sessão.
async function renovar(req, res) {
  const { renovacao } = req.body || {};
  const ip = ipDoPedido(req);
  const r = await S.renovarSessao(renovacao, { ip });
  if (!r.ok) return res.status(401).json({ erro: 'A sessão terminou. Entre de novo.', codigo: 'SESSAO_ENCERRADA' });
  if (totpObrigatorioFora() && acessoDeFora(req) && !r.usuario.totp_ativo) {
    return res.status(403).json({ erro: 'Fora do escritório, o acesso exige a verificação em duas etapas.', codigo: 'TOTP_OBRIGATORIO_FORA' });
  }
  // só a renovação que trocou a chave (as outras abas, na folga de 60 s, não repetem o registro)
  if (r.renovacao) await registrarAuditoria({ usuario_id: r.usuario.id, acao: 'sessao_renovada', detalhe: { sessao_id: r.sessaoId }, ip });
  res.json({ token: r.token, ...(r.renovacao ? { renovacao: r.renovacao } : {}) });
}

// Sair de verdade: encerra a sessão no servidor (o token dela e a chave de renovação param de valer).
async function sair(req, res) {
  const sid = req.usuario.sessaoId;
  if (sid) await S.revogarSessao(sid, 'saiu', { usuarioId: req.usuario.id });
  await registrarAuditoria({ usuario_id: req.usuario.id, acao: 'logout', detalhe: sid ? { sessao_id: sid } : null, ip: ipDoPedido(req) });
  res.json({ ok: true });
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
  // troca obrigatória some. senha_alterada_em derruba os tokens antigos; as
  // outras sessões são encerradas, e esta continua com o token novo abaixo.
  await pool.query(
    'UPDATE usuarios SET senha = $1, senha_provisoria = false, senha_alterada_em = NOW() WHERE id = $2',
    [hash, userId]
  );
  invalidarCacheUsuario(userId);
  const sid = req.usuario.sessaoId;
  const encerradas = await S.revogarSessoesDoUsuario(userId, 'senha', { exceto: sid });
  await registrarAuditoria({ usuario_id: userId, acao: 'senha_alterada', detalhe: { outras_sessoes_encerradas: encerradas }, ip: ipDoPedido(req) });
  await new Promise(r => setTimeout(r, 1100)); // token novo com emissão posterior à troca

  res.json({ mensagem: 'Senha alterada com sucesso', token: sid ? S.emitirTokenAcesso(usuario, sid) : emitirTokenLegado(usuario) });
}

module.exports = { login, loginTotp, renovar, sair, alterarSenha, ESCOPO_DESAFIO };
