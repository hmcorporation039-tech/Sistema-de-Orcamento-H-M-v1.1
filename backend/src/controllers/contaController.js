// "Minha conta" (Fase 6 — 02/11/2026): sessões abertas, verificação em duas etapas e vínculos com o
// Telegram/WhatsApp, cada um só do próprio usuário. E, para o administrador, a auditoria de acesso e as
// ações sobre a conta de outra pessoa (encerrar sessões, desligar a verificação de quem perdeu o celular).
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const S = require('../services/sessoesUsuario');
const segundaEtapa = require('../services/segundaEtapa');
const V = require('../services/telefonesVerificados');
const { totpObrigatorioAdmin, PAPEIS, invalidarCacheUsuario } = require('../middleware/auth');
const { ipDoPedido } = require('../utils/ipPedido');

const auditar = (req, acao, detalhe = null) =>
  V.registrarAuditoria({ usuario_id: req.usuario.id, origem: 'web', acao, detalhe, ip: ipDoPedido(req) });

async function senhaConfere(usuarioId, senha) {
  if (typeof senha !== 'string' || !senha) return false;
  const { rows: [u] } = await pool.query('SELECT senha FROM usuarios WHERE id = $1', [usuarioId]);
  return !!u && bcrypt.compare(senha, u.senha);
}

// ── Resumo ─────────────────────────────────────────────────────────────
async function resumo(req, res) {
  const id = req.usuario.id;
  const [totp, sessoes, vinculos] = await Promise.all([
    segundaEtapa.situacao(id),
    S.listarSessoes(id, req.usuario.sessaoId),
    V.listarVinculos(id),
  ]);
  res.json({
    usuario: { id, nome: req.usuario.nome, email: req.usuario.email, role: req.usuario.role },
    papeis: PAPEIS,
    totp: { ...totp, obrigatorio: totpObrigatorioAdmin() && req.usuario.role === 'admin' },
    sessoes,
    sessaoAtual: req.usuario.sessaoId,
    vinculos,
  });
}

// ── Sessões ────────────────────────────────────────────────────────────
async function listarSessoes(req, res) {
  res.json(await S.listarSessoes(req.usuario.id, req.usuario.sessaoId));
}

async function encerrarSessao(req, res) {
  const id = Number(req.params.id);
  const ok = await S.revogarSessao(id, 'encerrada', { usuarioId: req.usuario.id });
  if (!ok) return res.status(404).json({ erro: 'Sessão não encontrada ou já encerrada.' });
  await auditar(req, 'sessao_encerrada', { sessao_id: id, propria: id === req.usuario.sessaoId });
  res.json({ ok: true });
}

async function encerrarOutras(req, res) {
  const n = await S.revogarSessoesDoUsuario(req.usuario.id, 'outras', { exceto: req.usuario.sessaoId });
  await auditar(req, 'sessoes_outras_encerradas', { quantidade: n });
  res.json({ ok: true, encerradas: n });
}

// ── Verificação em duas etapas ─────────────────────────────────────────
async function totpIniciar(req, res) {
  if (!(await senhaConfere(req.usuario.id, req.body?.senha))) return res.status(400).json({ erro: 'Senha incorreta.' });
  try {
    const r = await segundaEtapa.iniciar(req.usuario);
    res.json({ ...r, prazoMinutos: segundaEtapa.PENDENTE_MINUTOS });
  } catch (e) {
    if (e.code === 'TOTP_SEM_CHAVE') return res.status(503).json({ erro: e.message });
    throw e;
  }
}

async function totpConfirmar(req, res) {
  const codigo = req.body?.codigo;
  if (typeof codigo !== 'string' && typeof codigo !== 'number') return res.status(400).json({ erro: 'Digite o código de 6 dígitos do aplicativo.' });
  const r = await segundaEtapa.confirmar(req.usuario.id, String(codigo));
  if (!r.ok) {
    return res.status(400).json({
      erro: r.motivo === 'sem_pendente' ? 'O prazo para confirmar acabou. Comece a ativação de novo.' : 'Código incorreto. Confira o aplicativo e tente de novo.',
    });
  }
  invalidarCacheUsuario(req.usuario.id);
  await auditar(req, 'totp_ativado');
  res.json({ ok: true, codigosRecuperacao: r.codigos });
}

// Senha errada aqui é 400, não 401: na tela, 401 quer dizer "sessão vencida" (renova ou pede login).
// Desligar e gerar códigos novos pedem a senha E um código (do aplicativo ou de recuperação): uma
// sessão aberta e esquecida num computador não basta para tirar a proteção.
async function conferirSenhaECodigo(req, res) {
  if (!(await senhaConfere(req.usuario.id, req.body?.senha))) { res.status(400).json({ erro: 'Senha incorreta.' }); return false; }
  const r = await segundaEtapa.conferir(req.usuario.id, String(req.body?.codigo ?? ''));
  if (!r.ok) { res.status(400).json({ erro: 'Código incorreto. Use o código do aplicativo ou um de recuperação.' }); return false; }
  return true;
}

async function totpDesativar(req, res) {
  if (!(await conferirSenhaECodigo(req, res))) return;
  await segundaEtapa.desativar(req.usuario.id);
  invalidarCacheUsuario(req.usuario.id);
  await auditar(req, 'totp_desativado');
  res.json({ ok: true });
}

async function totpNovosCodigos(req, res) {
  if (!(await conferirSenhaECodigo(req, res))) return;
  const codigos = await segundaEtapa.novosCodigos(req.usuario.id);
  await auditar(req, 'totp_codigos_novos');
  res.json({ ok: true, codigosRecuperacao: codigos });
}

// ── Vínculos com o canal ───────────────────────────────────────────────
async function listarVinculos(req, res) {
  res.json(await V.listarVinculos(req.usuario.id));
}

async function gerarCodigoVinculo(req, res) {
  const canal = req.body?.canal;
  if (!V.CANAIS.includes(canal)) return res.status(400).json({ erro: 'Escolha o canal: Telegram ou WhatsApp.' });
  const r = await V.gerarCodigoVinculo(req.usuario.id, canal, { ip: ipDoPedido(req) });
  res.json(r);
}

async function removerVinculo(req, res) {
  const ok = await V.removerVinculo(Number(req.params.id), { usuarioId: req.usuario.id, admin: false, ip: ipDoPedido(req) });
  if (!ok) return res.status(404).json({ erro: 'Vínculo não encontrado.' });
  res.json({ ok: true });
}

// ── Administração ──────────────────────────────────────────────────────
const ORIGENS_FILTRO = ['web', 'telegram', 'whatsapp', 'mcp'];
const dataIso = (t) => (typeof t === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null);

// GET /auditoria?tipo=acesso|alteracoes&origem=&usuario_id=&acao=&de=AAAA-MM-DD&ate=AAAA-MM-DD&pagina=
async function auditoria(req, res) {
  const q = req.query || {};
  const filtros = [];
  const params = [];
  const add = (sql, valor) => { params.push(valor); filtros.push(sql.replace('?', `$${params.length}`)); };
  if (q.tipo === 'acesso') filtros.push("a.entidade = 'acesso'");
  else if (q.tipo === 'alteracoes') filtros.push("a.entidade <> 'acesso'");
  if (ORIGENS_FILTRO.includes(q.origem)) add('a.origem = ?', q.origem);
  if (/^\d{1,9}$/.test(String(q.usuario_id || ''))) add('a.usuario_id = ?', Number(q.usuario_id));
  if (typeof q.acao === 'string' && q.acao.trim()) add('a.acao ILIKE ?', `%${q.acao.trim().slice(0, 40).replace(/[%_\\]/g, '\\$&')}%`);
  if (dataIso(q.de)) add('a.criado_em >= ?::date', q.de);
  if (dataIso(q.ate)) add("a.criado_em < ?::date + interval '1 day'", q.ate);
  const onde = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
  const porPagina = 50;
  const pagina = Math.max(1, Math.min(10000, parseInt(q.pagina, 10) || 1));

  const { rows: [{ total }] } = await pool.query(`SELECT COUNT(*)::int AS total FROM auditoria a ${onde}`, params);
  const { rows } = await pool.query(
    `SELECT a.id, a.criado_em, a.entidade, a.entidade_id, a.acao, a.detalhes, a.origem, a.ip, a.usuario_id, u.nome AS usuario_nome
       FROM auditoria a LEFT JOIN usuarios u ON u.id = a.usuario_id
       ${onde}
      ORDER BY a.criado_em DESC, a.id DESC
      LIMIT ${porPagina} OFFSET ${(pagina - 1) * porPagina}`, params);
  res.json({ itens: rows, total, pagina, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) });
}

async function sessoesDoUsuario(req, res) {
  res.json(await S.listarSessoes(Number(req.params.id)));
}

async function encerrarSessoesDoUsuario(req, res) {
  const alvo = Number(req.params.id);
  // o próprio administrador: mantém a sessão de onde ele está clicando
  const n = await S.revogarSessoesDoUsuario(alvo, 'admin', { exceto: alvo === req.usuario.id ? req.usuario.sessaoId : null });
  await V.registrarAuditoria({ usuario_id: req.usuario.id, acao: 'sessoes_encerradas_admin', detalhe: { usuario: alvo, quantidade: n }, ip: ipDoPedido(req) });
  res.json({ ok: true, encerradas: n });
}

async function desativarTotpDoUsuario(req, res) {
  const alvo = Number(req.params.id);
  const { rowCount } = await pool.query('SELECT 1 FROM usuarios WHERE id = $1', [alvo]);
  if (!rowCount) return res.status(404).json({ erro: 'Usuário não encontrado' });
  await segundaEtapa.desativar(alvo);
  invalidarCacheUsuario(alvo);
  await V.registrarAuditoria({ usuario_id: req.usuario.id, acao: 'totp_desativado_admin', detalhe: { usuario: alvo }, ip: ipDoPedido(req) });
  res.json({ ok: true });
}

module.exports = {
  resumo, listarSessoes, encerrarSessao, encerrarOutras,
  totpIniciar, totpConfirmar, totpDesativar, totpNovosCodigos,
  listarVinculos, gerarCodigoVinculo, removerVinculo,
  auditoria, sessoesDoUsuario, encerrarSessoesDoUsuario, desativarTotpDoUsuario,
};
