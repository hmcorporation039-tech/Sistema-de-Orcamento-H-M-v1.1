// Assistente virtual — rotas da tela (conversas, mensagens em streaming,
// arquivos, ações pendentes) e as rotas usadas SÓ pelas ferramentas do MCP do
// assistente (/assistente/ferramentas/*, token de escopo 'assistente').
//
// Conversas são pessoais: cada usuário vê e usa só as próprias (inclusive o
// administrador). O que o assistente cria no sistema segue as regras normais
// de visibilidade (todos veem, só o dono/admin altera).
const multer = require('multer');
const pool = require('../config/database');
const { config } = require('../services/assistente/config');
const { gerenciador } = require('../services/assistente/execucao');
const A = require('../services/assistente/arquivos');
const { prepararAcao, executarAcao, criarChamadaApi, ErroAcao, tiposDeAcao } = require('../services/assistente/acoes');
const { consultarNorma, historicoPreco } = require('../services/assistente/consultas');
const { normalizarContexto, descreverContexto } = require('../services/assistente/prompt');
const { statusLogin } = require('../services/assistente/claudeCli');
const { registrarAcao } = require('../services/assistente/sessoes');
const { contentDisposition } = require('../utils/nomeArquivoDownload');

const MAX_TEXTO = 12000;
const idValido = (v) => /^\d{1,10}$/.test(String(v)) && Number(v) >= 1 && Number(v) <= 2147483647;

async function conversaDoUsuario(id, usuarioId) {
  if (!idValido(id)) return null;
  const { rows: [c] } = await pool.query('SELECT * FROM assistente_conversas WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
  return c || null;
}

async function usadasHoje(usuarioId) {
  const { rows: [r] } = await pool.query(
    `SELECT count(*)::int AS n FROM assistente_mensagens m JOIN assistente_conversas c ON c.id = m.conversa_id
      WHERE c.usuario_id = $1 AND m.papel = 'usuario'
        AND m.criado_em >= (date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')`, [usuarioId]);
  return r.n;
}

// ── Status ──────────────────────────────────────────────────────────────
async function status(req, res) {
  const cfg = config();
  const g = gerenciador();
  const login = cfg.provedor === 'claude_max' ? await statusLogin(cfg.caminhoCli) : null;
  const geral = g.estadoGeral();
  const disponivel = cfg.ligado && (cfg.provedor === 'api' ? !!process.env.ANTHROPIC_API_KEY : !!(login && login.instalado && login.logado));
  let motivo = null;
  if (!cfg.ligado) motivo = 'O assistente está desligado neste sistema (ASSISTENTE=desligado).';
  else if (cfg.provedor === 'api' && !process.env.ANTHROPIC_API_KEY) motivo = 'Provedor "api" sem ANTHROPIC_API_KEY.';
  else if (cfg.provedor === 'claude_max' && !login?.instalado) motivo = 'O Claude Code não está instalado neste PC.';
  else if (cfg.provedor === 'claude_max' && !login?.logado) motivo = 'O Claude Code deste PC não está logado na assinatura Claude Max.';
  const usadas = await usadasHoje(req.usuario.id);
  res.json({
    ligado: cfg.ligado, disponivel, motivo, provedor: cfg.provedor, modelo: geral.modelo,
    assinatura: login?.assinatura || null,
    fila: geral.fila, limiteDiario: cfg.limiteDiario, usadasHoje: usadas,
    // uso da assinatura informado pelo próprio Claude Code na última resposta (fração 0–1)
    usoAssinatura: geral.limiteUso?.unifiedWindows ? {
      cincoHoras: geral.limiteUso.unifiedWindows.five_hour?.utilization ?? null,
      semana: geral.limiteUso.unifiedWindows.seven_day?.utilization ?? null,
      em: geral.limiteUso.em,
    } : null,
    uploadMb: Math.round(cfg.uploadBytes / 1048576), tiposArquivo: A.TIPOS_ACEITOS, tiposDeAcao: tiposDeAcao(),
  });
}

// Texto do contexto da tela ("Obra OB-2026-009 … · Proposta P254 …") para o
// indicador do painel — o mesmo que vai no cabeçalho de cada mensagem
async function contextoDaTela(req, res) {
  const ctx = normalizarContexto(req.query);
  const tem = ctx.obra_id || ctx.proposta_id || ctx.analise_id || ctx.projeto_id;
  res.json({ contexto: ctx, texto: tem ? await descreverContexto({ ...ctx, rota: null }) : null });
}

// ── Conversas ───────────────────────────────────────────────────────────
async function listarConversas(req, res) {
  const arquivadas = req.query.arquivadas === '1';
  const { rows } = await pool.query(
    `SELECT c.id, c.titulo, c.contexto, c.arquivada, c.criado_em, c.atualizado_em,
            (SELECT count(*)::int FROM assistente_acoes a WHERE a.conversa_id = c.id AND a.status = 'pendente') AS acoes_pendentes
       FROM assistente_conversas c WHERE c.usuario_id = $1 AND c.arquivada = $2
      ORDER BY c.atualizado_em DESC LIMIT 100`, [req.usuario.id, arquivadas]);
  const g = gerenciador();
  res.json(rows.map(c => ({ ...c, em_andamento: g.emAndamento(c.id) })));
}

async function criarConversa(req, res) {
  const titulo = String(req.body?.titulo || '').trim().slice(0, 200) || 'Nova conversa';
  const { rows: [c] } = await pool.query(
    'INSERT INTO assistente_conversas (usuario_id, titulo, contexto) VALUES ($1,$2,$3) RETURNING *',
    [req.usuario.id, titulo, normalizarContexto(req.body?.contexto)]);
  res.status(201).json(c);
}

async function verConversa(req, res) {
  const c = await conversaDoUsuario(req.params.id, req.usuario.id);
  if (!c) return res.status(404).json({ erro: 'Conversa não encontrada.' });
  const [mensagens, acoes, arquivos] = await Promise.all([
    pool.query('SELECT id, papel, texto, passos, criados, contexto, arquivos, status, erro, tempo_ms, criado_em FROM assistente_mensagens WHERE conversa_id = $1 ORDER BY id', [c.id]),
    pool.query(`SELECT a.*, u.nome AS decidido_por_nome FROM assistente_acoes a LEFT JOIN usuarios u ON u.id = a.decidido_por
                 WHERE a.conversa_id = $1 ORDER BY a.id`, [c.id]),
    pool.query('SELECT * FROM assistente_arquivos WHERE conversa_id = $1 ORDER BY id', [c.id]),
  ]);
  const { session_id, ...publica } = c;
  res.json({ ...publica, em_andamento: gerenciador().emAndamento(c.id), mensagens: mensagens.rows, acoes: acoes.rows, arquivos: arquivos.rows.map(A.publico) });
}

async function alterarConversa(req, res) {
  const c = await conversaDoUsuario(req.params.id, req.usuario.id);
  if (!c) return res.status(404).json({ erro: 'Conversa não encontrada.' });
  const titulo = req.body?.titulo != null ? String(req.body.titulo).trim().slice(0, 200) : null;
  if (req.body?.titulo != null && !titulo) return res.status(400).json({ erro: 'Informe um título.' });
  const arquivada = typeof req.body?.arquivada === 'boolean' ? req.body.arquivada : null;
  if (arquivada && gerenciador().emAndamento(c.id)) return res.status(409).json({ erro: 'O assistente ainda está respondendo nesta conversa.' });
  const { rows: [nova] } = await pool.query(
    `UPDATE assistente_conversas SET titulo = COALESCE($2, titulo), arquivada = COALESCE($3, arquivada), atualizado_em = NOW()
      WHERE id = $1 RETURNING id, titulo, arquivada, atualizado_em`, [c.id, titulo, arquivada]);
  res.json(nova);
}

// ── Arquivos ────────────────────────────────────────────────────────────
function receberArquivos(req, res, next) {
  const cfg = config();
  const up = multer({ storage: multer.memoryStorage(), limits: { fileSize: cfg.uploadBytes, files: 10 } }).array('arquivos', 10);
  up(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ erro: `Arquivo acima do limite de ${Math.round(cfg.uploadBytes / 1048576)} MB.` });
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ erro: 'Envie até 10 arquivos no campo "arquivos".' });
    return next(err);
  });
}

async function enviarArquivos(req, res) {
  const c = await conversaDoUsuario(req.params.id, req.usuario.id);
  if (!c) return res.status(404).json({ erro: 'Conversa não encontrada.' });
  const arquivos = req.files || [];
  if (!arquivos.length) return res.status(400).json({ erro: 'Nenhum arquivo enviado.' });
  // confere TODOS antes de gravar qualquer um
  const tipos = [];
  for (const f of arquivos) {
    // nome em UTF-8 lido como latin1 pelo leitor do multipart ("ElÃ©trica"): corrige
    // só quando a conversão dá um texto válido (nome já certo fica como está)
    const convertido = Buffer.from(f.originalname, 'latin1').toString('utf8');
    if (/[\u0080-ÿ]/.test(f.originalname) && !convertido.includes('�')) f.originalname = convertido;
    const tipo = await A.detectarTipo(f.buffer, f.originalname);
    if (!tipo) return res.status(415).json({ erro: `"${f.originalname}" não é um tipo aceito. Aceitos: ${A.TIPOS_ACEITOS}.` });
    tipos.push(tipo);
  }
  const salvos = [];
  for (let i = 0; i < arquivos.length; i++) {
    salvos.push(await A.salvarArquivo(pool, { conversaId: c.id, usuarioId: req.usuario.id, nomeOriginal: arquivos[i].originalname, buffer: arquivos[i].buffer, tipo: tipos[i] }));
  }
  res.status(201).json(salvos);
}

async function baixarArquivo(req, res) {
  if (!idValido(req.params.id)) return res.status(400).json({ erro: 'Arquivo inválido.' });
  const { rows: [a] } = await pool.query(
    `SELECT a.* FROM assistente_arquivos a JOIN assistente_conversas c ON c.id = a.conversa_id WHERE a.id = $1 AND c.usuario_id = $2`,
    [req.params.id, req.usuario.id]);
  if (!a) return res.status(404).json({ erro: 'Arquivo não encontrado.' });
  const buffer = await A.lerConteudo(a);
  res.set({ 'Content-Type': A.MIME[a.tipo] || 'application/octet-stream', 'Content-Disposition': contentDisposition(a.nome_original), 'X-Content-Type-Options': 'nosniff' });
  res.send(buffer);
}

// ── Mensagens (streaming NDJSON) ────────────────────────────────────────
function abrirStream(res) {
  res.status(200);
  res.set({ 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  let aberto = true;
  res.on('close', () => { aberto = false; });
  return {
    enviar(evento) { if (aberto) res.write(`${JSON.stringify(evento)}\n`); },
    fechar() { if (aberto) { aberto = false; res.end(); } },
    get aberto() { return aberto; },
  };
}

async function enviarMensagem(req, res) {
  const cfg = config();
  if (!cfg.ligado) return res.status(503).json({ erro: 'O assistente está desligado neste sistema.' });
  const c = await conversaDoUsuario(req.params.id, req.usuario.id);
  if (!c) return res.status(404).json({ erro: 'Conversa não encontrada.' });
  if (c.arquivada) return res.status(409).json({ erro: 'Esta conversa está arquivada. Desarquive ou abra outra.' });
  const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : '';
  if (!texto) return res.status(400).json({ erro: 'Escreva a mensagem.' });
  if (texto.length > MAX_TEXTO) return res.status(400).json({ erro: `Mensagem longa demais (máximo ${MAX_TEXTO} caracteres). Anexe o texto como arquivo.` });
  const ids = Array.isArray(req.body?.arquivos) ? [...new Set(req.body.arquivos.filter(idValido).map(Number))].slice(0, 10) : [];
  let arquivos = [];
  if (ids.length) {
    const { rows } = await pool.query('SELECT * FROM assistente_arquivos WHERE conversa_id = $1 AND id = ANY($2::int[]) ORDER BY id', [c.id, ids]);
    if (rows.length !== ids.length) return res.status(400).json({ erro: 'Arquivo anexado não pertence a esta conversa.' });
    arquivos = rows.map(A.publico);
  }
  if (cfg.limiteDiario > 0 && await usadasHoje(req.usuario.id) >= cfg.limiteDiario) {
    return res.status(429).json({ erro: `Limite diário do assistente atingido (${cfg.limiteDiario} mensagens por usuário). Volta amanhã — ou peça ao administrador para ajustar ASSISTENTE_LIMITE_DIARIO.` });
  }
  const g = gerenciador();
  let inicio;
  try {
    inicio = await g.iniciar({ usuario: req.usuario, conversa: c, texto, contexto: normalizarContexto(req.body?.contexto), arquivos });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    throw e;
  }
  const stream = abrirStream(res);
  stream.enviar({ tipo: 'mensagens', usuario: inicio.mensagemUsuario, assistente: inicio.mensagemAssistente, titulo: inicio.titulo });
  const sair = g.acompanhar(c.id, (ev) => {
    if (ev.tipo === 'encerrado') { stream.fechar(); return; }
    stream.enviar(ev);
  });
  if (!sair) stream.fechar();
  res.on('close', () => { if (sair) sair(); });
}

async function acompanhar(req, res) {
  const c = await conversaDoUsuario(req.params.id, req.usuario.id);
  if (!c) return res.status(404).json({ erro: 'Conversa não encontrada.' });
  const g = gerenciador();
  if (!g.emAndamento(c.id)) return res.status(204).end();
  const stream = abrirStream(res);
  const sair = g.acompanhar(c.id, (ev) => {
    if (ev.tipo === 'encerrado') { stream.fechar(); return; }
    stream.enviar(ev);
  });
  if (!sair) return stream.fechar();
  res.on('close', () => sair());
}

async function cancelar(req, res) {
  const c = await conversaDoUsuario(req.params.id, req.usuario.id);
  if (!c) return res.status(404).json({ erro: 'Conversa não encontrada.' });
  const ok = gerenciador().cancelar(c.id);
  res.json({ cancelado: ok });
}

// ── Ações pendentes ─────────────────────────────────────────────────────
const aplicando = new Set();

async function acaoDoUsuario(id, usuarioId) {
  if (!idValido(id)) return null;
  const { rows: [a] } = await pool.query(
    `SELECT a.* FROM assistente_acoes a JOIN assistente_conversas c ON c.id = a.conversa_id WHERE a.id = $1 AND c.usuario_id = $2`, [id, usuarioId]);
  return a || null;
}

async function aplicarAcao(req, res) {
  const acao = await acaoDoUsuario(req.params.id, req.usuario.id);
  if (!acao) return res.status(404).json({ erro: 'Ação não encontrada.' });
  if (acao.status !== 'pendente') return res.status(409).json({ erro: `Esta ação já foi ${acao.status}.` });
  if (aplicando.has(acao.id)) return res.status(409).json({ erro: 'Esta ação já está sendo aplicada.' });
  aplicando.add(acao.id);
  try {
    // a MESMA rota da tela, com o token de quem clicou (posse, admin, validação, auditoria)
    const api = criarChamadaApi(config().apiUrl, req.headers.authorization);
    let resultado;
    try {
      resultado = await executarAcao(acao, api);
    } catch (e) {
      const erro = e instanceof ErroAcao ? e.message : 'Falha ao aplicar a ação.';
      if (!(e instanceof ErroAcao)) console.error('[assistente] falha ao aplicar ação:', e);
      await pool.query('UPDATE assistente_acoes SET resultado = $2 WHERE id = $1', [acao.id, { erro, em: new Date().toISOString() }]);
      return res.status(e.status && e.status >= 400 && e.status < 500 ? e.status : 502).json({ erro });
    }
    const resumo = { ok: true, mensagem: resultado?.mensagem || null, numero: resultado?.numero || null, status: resultado?.status || null };
    const { rows: [nova] } = await pool.query(
      `UPDATE assistente_acoes SET status = 'aplicada', resultado = $2, decidido_por = $3, decidido_em = NOW()
        WHERE id = $1 AND status = 'pendente' RETURNING *`, [acao.id, resumo, req.usuario.id]);
    res.json({ ...(nova || { ...acao, status: 'aplicada', resultado: resumo }), decidido_por_nome: req.usuario.nome });
  } finally {
    aplicando.delete(acao.id);
  }
}

async function descartarAcao(req, res) {
  const acao = await acaoDoUsuario(req.params.id, req.usuario.id);
  if (!acao) return res.status(404).json({ erro: 'Ação não encontrada.' });
  if (acao.status !== 'pendente') return res.status(409).json({ erro: `Esta ação já foi ${acao.status}.` });
  const { rows: [nova] } = await pool.query(
    `UPDATE assistente_acoes SET status = 'descartada', decidido_por = $2, decidido_em = NOW() WHERE id = $1 AND status = 'pendente' RETURNING *`,
    [acao.id, req.usuario.id]);
  res.json({ ...(nova || acao), decidido_por_nome: req.usuario.nome });
}

// ── Rotas das ferramentas (só token de escopo 'assistente') ─────────────
function soAssistente(req, res, next) {
  if (!req.assistente) return res.status(403).json({ erro: 'Rota exclusiva das ferramentas do assistente.' });
  next();
}

async function ferramentaContexto(req, res) {
  const { rows: [c] } = await pool.query('SELECT id, titulo, contexto FROM assistente_conversas WHERE id = $1', [req.assistente.conversaId]);
  res.json(c || null);
}

async function ferramentaArquivos(req, res) {
  const { rows } = await pool.query('SELECT * FROM assistente_arquivos WHERE conversa_id = $1 ORDER BY id', [req.assistente.conversaId]);
  res.json({ itens: rows.map(A.publico) });
}

async function arquivoDaConversa(req) {
  if (!idValido(req.params.id)) return null;
  const { rows: [a] } = await pool.query('SELECT * FROM assistente_arquivos WHERE id = $1 AND conversa_id = $2', [req.params.id, req.assistente.conversaId]);
  return a || null;
}

async function ferramentaArquivo(req, res) {
  const a = await arquivoDaConversa(req);
  if (!a) return res.status(404).json({ erro: 'Arquivo não encontrado nesta conversa.' });
  const resumo = req.query.resumo === '0' ? null : await A.resumirArquivo(pool, a);
  res.json({ arquivo: A.publico(a), resumo });
}

async function ferramentaArquivoConteudo(req, res) {
  const a = await arquivoDaConversa(req);
  if (!a) return res.status(404).json({ erro: 'Arquivo não encontrado nesta conversa.' });
  res.set({ 'Content-Type': 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
  res.send(await A.lerConteudo(a));
}

async function ferramentaNorma(req, res) {
  const r = consultarNorma({ disciplina: String(req.query.disciplina || ''), busca: req.query.busca ? String(req.query.busca).slice(0, 200) : null, arquivo: req.query.arquivo ? String(req.query.arquivo) : null });
  res.json(r);
}

async function ferramentaHistoricoPreco(req, res) {
  const descricao = String(req.query.descricao || '').trim();
  if (descricao.length < 2) return res.status(400).json({ erro: 'Informe a descrição.' });
  res.json(await historicoPreco(pool, descricao));
}

async function ferramentaProporAcao(req, res) {
  try {
    const p = await prepararAcao(req.body || {});
    const { rows: [acao] } = await pool.query(
      `INSERT INTO assistente_acoes (conversa_id, mensagem_id, usuario_id, tipo, alvo_tipo, alvo_id, descricao, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.assistente.conversaId, req.assistente.mensagemId, req.usuario.id, p.tipo, p.alvo_tipo, p.alvo_id, p.descricao, p.payload]);
    registrarAcao(req.assistente.exec, acao);
    res.status(201).json({ id: acao.id, resumo: p.resumo, status: acao.status });
  } catch (e) {
    if (e instanceof ErroAcao) return res.status(e.status).json({ erro: e.message });
    throw e;
  }
}

module.exports = {
  status, contextoDaTela, listarConversas, criarConversa, verConversa, alterarConversa, receberArquivos, enviarArquivos, baixarArquivo,
  enviarMensagem, acompanhar, cancelar, aplicarAcao, descartarAcao,
  soAssistente, ferramentaContexto, ferramentaArquivos, ferramentaArquivo, ferramentaArquivoConteudo, ferramentaNorma,
  ferramentaHistoricoPreco, ferramentaProporAcao,
};
