// Sessões revogáveis do escritório (Fase 6, item 2 — 02/11/2026). Tabela `sessoes` (migração 2.0-44).
//
// Login → uma sessão por dispositivo (navegador), com:
//   - token de ACESSO curto (JWT HS256 com `sid`, SESSAO_TOKEN_MINUTOS, padrão 15 min), que vai em todo
//     pedido como antes;
//   - chave de RENOVAÇÃO "<id>.<segredo>", guardada no navegador; o banco só tem o SHA-256 do segredo.
//     A cada renovação a chave muda (a anterior ainda vale 60 s, para duas abas que renovam juntas);
//     usar uma chave antiga depois disso derruba a sessão (sinal de chave copiada).
// A sessão termina por: sair, "encerrar" na lista, "encerrar as outras", senha trocada/redefinida,
// usuário desativado, inatividade (SESSAO_INATIVIDADE_DIAS, padrão 7) ou prazo máximo
// (SESSAO_MAXIMA_DIAS, padrão 30). O token de acesso de uma sessão encerrada para de valer na hora
// (middleware/auth.js consulta `sessaoAtiva`, com cache de 30 s que a revogação limpa).
// Tokens antigos, sem `sid` (emitidos antes desta versão), continuam valendo até vencer (8 h).
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { JWT_SECRET } = require('../config/segredos');
const { registrarAuditoria } = require('./telefonesVerificados');
const { escapeHtml } = require('../utils/htmlPdf');

const GRACA_RENOVACAO_S = 60;
const CACHE_MS = 30 * 1000;

function inteiroEntre(valor, padrao, min, max) {
  const n = parseInt(valor, 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : padrao;
}
const configuracao = () => ({
  tokenMinutos: inteiroEntre(process.env.SESSAO_TOKEN_MINUTOS, 15, 1, 480),
  inatividadeDias: inteiroEntre(process.env.SESSAO_INATIVIDADE_DIAS, 7, 1, 90),
  maximaDias: inteiroEntre(process.env.SESSAO_MAXIMA_DIAS, 30, 1, 365),
});

const sha256 = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const iguais = (a, b) => !!a && !!b && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const novoSegredo = () => crypto.randomBytes(32).toString('base64url');

function emitirTokenAcesso(usuario, sessaoId, { segredo = JWT_SECRET, minutos = configuracao().tokenMinutos } = {}) {
  return jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role, sid: sessaoId },
    segredo, { expiresIn: `${minutos}m`, algorithm: 'HS256' });
}

// "<id>.<segredo>" → { id, segredo } ou null
function lerChaveRenovacao(chave) {
  const m = String(chave ?? '').match(/^(\d{1,10})\.([A-Za-z0-9_-]{20,100})$/);
  return m ? { id: Number(m[1]), segredo: m[2] } : null;
}

// ── Cache do estado da sessão (para o middleware) ──────────────────────
const cache = new Map(); // sid -> { ativa, usuarioId, expiraEm }
function invalidarCacheSessao(sid) {
  if (sid == null) cache.clear(); else cache.delete(Number(sid));
}

// A sessão ainda vale? Atualiza o "último uso" no máximo a cada 30 s por sessão (é o mesmo pedido).
async function sessaoAtiva(sid, usuarioId, executor = pool) {
  const agora = Date.now();
  const emCache = cache.get(Number(sid));
  if (emCache && emCache.expiraEm > agora) return emCache.ativa && emCache.usuarioId === Number(usuarioId);
  const { rows: [s] } = await executor.query(
    `UPDATE sessoes SET ultimo_uso_em = NOW()
      WHERE id = $1 AND revogada_em IS NULL AND expira_em > NOW()
      RETURNING usuario_id`, [sid]);
  const ativa = !!s;
  cache.set(Number(sid), { ativa, usuarioId: s ? s.usuario_id : null, expiraEm: agora + CACHE_MS });
  return ativa && s.usuario_id === Number(usuarioId);
}

// ── Login novo (dispositivo ou IP nunca vistos para esta conta) ────────
async function conferirLoginNovo(usuarioId, { dispositivoId, ip }, executor = pool) {
  const { rows: [r] } = await executor.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE $2::text IS NOT NULL AND dispositivo_id = $2)::int AS mesmo_dispositivo,
            COUNT(*) FILTER (WHERE $3::text IS NOT NULL AND ip = $3)::int AS mesmo_ip
       FROM sessoes WHERE usuario_id = $1`,
    [usuarioId, dispositivoId || null, ip || null]);
  // primeira sessão registrada da conta (logo depois de instalar esta versão): ainda não há com o que
  // comparar, então não é "novo" — só passa a avisar dali em diante
  if (!r.total) return { novo: false, primeiro: true, dispositivoNovo: false, ipNovo: false };
  const dispositivoNovo = !!dispositivoId && r.mesmo_dispositivo === 0;
  const ipNovo = !!ip && r.mesmo_ip === 0;
  return { novo: dispositivoNovo || ipNovo, primeiro: false, dispositivoNovo, ipNovo };
}

// ── Criar / renovar / revogar ──────────────────────────────────────────
function normalizarDispositivoId(valor) {
  const t = String(valor ?? '').trim();
  return /^[A-Za-z0-9_-]{8,64}$/.test(t) ? t : null;
}

async function criarSessao(usuario, { dispositivoId = null, dispositivo = null, ip = null, origem = 'web' } = {}, executor = pool) {
  const cfg = configuracao();
  const disp = normalizarDispositivoId(dispositivoId);
  const segredo = novoSegredo();
  // o mesmo navegador entrando de novo (o "Entre de novo", por exemplo) substitui a sessão anterior dele
  if (disp) {
    const { rows } = await executor.query(
      `UPDATE sessoes SET revogada_em = NOW(), motivo_revogacao = 'substituida'
        WHERE usuario_id = $1 AND dispositivo_id = $2 AND revogada_em IS NULL RETURNING id`,
      [usuario.id, disp]);
    rows.forEach(r => invalidarCacheSessao(r.id));
  }
  const { rows: [s] } = await executor.query(
    `INSERT INTO sessoes (usuario_id, dispositivo_id, dispositivo, ip, origem, renovacao_hash, expira_em)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() + make_interval(days => $7)) RETURNING id`,
    [usuario.id, disp, dispositivo ? String(dispositivo).slice(0, 200) : null, ip, origem, sha256(segredo), cfg.maximaDias]);
  return { sessaoId: s.id, renovacao: `${s.id}.${segredo}`, token: emitirTokenAcesso(usuario, s.id, { minutos: cfg.tokenMinutos }) };
}

// → { ok: true, token, renovacao?, usuario, sessaoId } | { ok: false, motivo }
// Sem `renovacao` na resposta: a chave apresentada era a anterior, dentro dos 60 s de folga (outra aba
// já renovou e guardou a nova no navegador) — só um token de acesso novo é devolvido.
async function renovarSessao(chave, { ip = null } = {}, executor = pool) {
  const lida = lerChaveRenovacao(chave);
  if (!lida) return { ok: false, motivo: 'invalida' };
  const cfg = configuracao();
  const { rows: [s] } = await executor.query(
    `SELECT s.id, s.usuario_id, s.renovacao_hash, s.renovacao_anterior_hash, s.revogada_em,
            (s.expira_em <= NOW()) AS vencida,
            (s.ultimo_uso_em < NOW() - make_interval(days => $2)) AS inativa,
            (s.renovada_em IS NOT NULL AND s.renovada_em > NOW() - make_interval(secs => $3)) AS na_folga,
            u.nome, u.email, u.role, u.ativo, u.totp_ativo
       FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.id = $1`,
    [lida.id, cfg.inatividadeDias, GRACA_RENOVACAO_S]);
  if (!s || s.revogada_em) return { ok: false, motivo: 'invalida' };
  const usuario = { id: s.usuario_id, nome: s.nome, email: s.email, role: s.role, totp_ativo: s.totp_ativo === true };
  const h = sha256(lida.segredo);

  if (!s.ativo) { await revogarSessao(s.id, 'desativado', {}, executor); return { ok: false, motivo: 'invalida' }; }
  if (s.vencida || s.inativa) { await revogarSessao(s.id, s.vencida ? 'vencida' : 'inativa', {}, executor); return { ok: false, motivo: 'vencida' }; }

  if (iguais(h, s.renovacao_hash)) {
    const nova = novoSegredo();
    const { rowCount } = await executor.query(
      `UPDATE sessoes SET renovacao_anterior_hash = renovacao_hash, renovacao_hash = $2, renovada_em = NOW(),
              ultimo_uso_em = NOW(), ip = COALESCE($3, ip)
        WHERE id = $1 AND renovacao_hash = $4 AND revogada_em IS NULL`,
      [s.id, sha256(nova), ip, h]);
    // outro pedido trocou a chave entre a leitura e aqui: fica valendo a dele (folga de 60 s)
    if (!rowCount) return { ok: true, sessaoId: s.id, usuario, token: emitirTokenAcesso(usuario, s.id, { minutos: cfg.tokenMinutos }) };
    invalidarCacheSessao(s.id);
    return { ok: true, sessaoId: s.id, usuario, token: emitirTokenAcesso(usuario, s.id, { minutos: cfg.tokenMinutos }), renovacao: `${s.id}.${nova}` };
  }
  if (s.na_folga && iguais(h, s.renovacao_anterior_hash)) {
    return { ok: true, sessaoId: s.id, usuario, token: emitirTokenAcesso(usuario, s.id, { minutos: cfg.tokenMinutos }) };
  }
  // chave antiga (já trocada há mais de 60 s) ou inventada para uma sessão que existe: encerra a sessão
  await revogarSessao(s.id, 'reuso', {}, executor);
  await registrarAuditoria({ usuario_id: s.usuario_id, acao: 'sessao_chave_reusada', detalhe: { sessao_id: s.id }, ip });
  return { ok: false, motivo: 'invalida' };
}

// Encerra uma sessão. `usuarioId`: só se for dele (null = qualquer, para o admin). Devolve true se encerrou.
async function revogarSessao(sessaoId, motivo, { usuarioId = null } = {}, executor = pool) {
  const { rowCount } = await executor.query(
    `UPDATE sessoes SET revogada_em = NOW(), motivo_revogacao = $2
      WHERE id = $1 AND revogada_em IS NULL AND ($3::int IS NULL OR usuario_id = $3)`,
    [sessaoId, String(motivo).slice(0, 40), usuarioId]);
  invalidarCacheSessao(sessaoId);
  return rowCount > 0;
}

// Encerra todas as sessões abertas do usuário, menos `exceto` (a atual). Devolve quantas.
async function revogarSessoesDoUsuario(usuarioId, motivo, { exceto = null } = {}, executor = pool) {
  const { rows } = await executor.query(
    `UPDATE sessoes SET revogada_em = NOW(), motivo_revogacao = $2
      WHERE usuario_id = $1 AND revogada_em IS NULL AND ($3::int IS NULL OR id <> $3) RETURNING id`,
    [usuarioId, String(motivo).slice(0, 40), exceto]);
  rows.forEach(r => invalidarCacheSessao(r.id));
  return rows.length;
}

// Sessões abertas (não encerradas, dentro do prazo e da inatividade), a atual marcada.
async function listarSessoes(usuarioId, sessaoAtual = null, executor = pool) {
  const { rows } = await executor.query(
    `SELECT id, dispositivo, ip, origem, criada_em, ultimo_uso_em, expira_em
       FROM sessoes
      WHERE usuario_id = $1 AND revogada_em IS NULL AND expira_em > NOW()
        AND ultimo_uso_em >= NOW() - make_interval(days => $2)
      ORDER BY ultimo_uso_em DESC`,
    [usuarioId, configuracao().inatividadeDias]);
  return rows.map(r => ({ ...r, atual: sessaoAtual != null && r.id === Number(sessaoAtual) }));
}

// ── Aviso de login novo ────────────────────────────────────────────────
// Sempre na auditoria. Por e-mail só se o envio estiver configurado (EMAIL_IMAP_* no .env), a conta
// tiver e-mail de verdade e AVISO_LOGIN_NOVO_EMAIL não for "desligado". Nunca atrasa nem derruba o login.
function emailDeVerdade(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '')) && !/\.(invalid|test|local|example)$/i.test(String(email));
}

function mensagemLoginNovo(usuario, { dispositivo, ip, quando = new Date() }) {
  const data = quando.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const linhas = [
    `Olá, ${usuario.nome}.`,
    '',
    'Houve um acesso à sua conta no Sistema de Orçamentos H&M a partir de um aparelho ou endereço que ainda não tínhamos visto:',
    `- Quando: ${data}`,
    `- Aparelho: ${dispositivo || 'desconhecido'}`,
    `- Endereço IP: ${ip || 'desconhecido'}`,
    '',
    'Se foi você, não precisa fazer nada. Se não foi, troque a sua senha e use "Encerrar as outras sessões" em Cadastros › Minha conta.',
  ];
  return {
    assunto: 'Novo acesso à sua conta — Sistema H&M',
    texto: linhas.join('\n'),
    html: linhas.map(l => (l ? `<p style="margin:0 0 6px">${escapeHtml(l)}</p>` : '<br>')).join(''),
  };
}

async function avisarLoginNovo(usuario, info, { enviar = null } = {}) {
  await registrarAuditoria({ usuario_id: usuario.id, acao: 'login_novo', detalhe: { dispositivo: info.dispositivo, dispositivo_novo: info.dispositivoNovo, ip_novo: info.ipNovo }, ip: info.ip });
  if (String(process.env.AVISO_LOGIN_NOVO_EMAIL || '').toLowerCase() === 'desligado') return { email: false };
  if (!emailDeVerdade(usuario.email)) return { email: false };
  let envio = enviar;
  if (!envio) {
    if (!require('./email/imap').credenciaisConfiguradas()) return { email: false };
    envio = (m) => require('./email/smtp').criarTransportador().sendMail({ from: process.env.EMAIL_IMAP_USER, ...m });
  }
  try {
    const m = mensagemLoginNovo(usuario, info);
    await envio({ to: usuario.email, subject: m.assunto, text: m.texto, html: m.html });
    return { email: true };
  } catch (e) {
    console.warn(`Aviso de login novo por e-mail não enviado: ${e.message}`);
    return { email: false };
  }
}

module.exports = {
  GRACA_RENOVACAO_S, configuracao,
  emitirTokenAcesso, lerChaveRenovacao, sessaoAtiva, invalidarCacheSessao,
  criarSessao, renovarSessao, revogarSessao, revogarSessoesDoUsuario, listarSessoes,
  conferirLoginNovo, avisarLoginNovo, mensagemLoginNovo, normalizarDispositivoId,
};
