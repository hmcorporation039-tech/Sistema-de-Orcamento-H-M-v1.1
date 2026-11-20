// Agentes próprios (09/11/2026) — rotas da tela e das ferramentas do assistente. Tudo com autenticar (routes/v2/
// agentes.js); execução só o dono ou o administrador vê/cancela; aprovar regra de vocabulário só o administrador;
// aprovar conhecimento do suporte, o administrador ou quem fez o pedido que gerou a sugestão.
const pool = require('../config/database');
const { listarAgentes } = require('../services/agentes/registro');
const { executor, autorizadosDaEntrada } = require('../services/agentes/executor');
const { sugerirRegraDoPedido } = require('../services/agentes/roteador');
const { termosSignificativos } = require('../services/agentes/textoPedido');
const adaptadorQuadros = require('../services/agentes/adaptadorQuadros');
const suporte = require('../services/agentes/suporteClaude');
const conhecimento = require('../services/conhecimento');

const idValido = (v) => /^\d{1,10}$/.test(String(v)) && Number(v) >= 1 && Number(v) <= 2147483647;
const ehAdmin = (req) => req.usuario?.role === 'admin';

async function listar(req, res) {
  const s = suporte.config();
  res.json({
    agentes: listarAgentes(),
    quadros: adaptadorQuadros.situacao(),
    suporte: { ligado: s.ligado, consultor: s.consultor, tempoLimiteMin: Math.round(s.tempoLimiteMs / 60000), maxTurnos: s.maxTurnos },
  });
}

async function listarExecucoes(req, res) {
  const limite = Math.min(100, Math.max(1, Number(req.query.limite) || 30));
  const { rows } = await pool.query(
    `SELECT e.id, e.agente, e.status, e.origem, e.conversa_id, e.criado_em, e.terminado_em, e.precisa_ia, jsonb_array_length(e.pendencias) AS pendencias,
            u.nome AS usuario_nome
       FROM agentes_execucoes e LEFT JOIN usuarios u ON u.id = e.usuario_id
      WHERE ($1::boolean OR e.usuario_id = $2) ORDER BY e.id DESC LIMIT $3`, [ehAdmin(req) && req.query.todas === '1', req.usuario.id, limite]);
  res.json(rows);
}

async function iniciar(req, res) {
  const { agente, entrada = {}, aguardar = false } = req.body || {};
  if (typeof agente !== 'string' || !agente) return res.status(400).json({ erro: 'Informe o agente.' });
  if (entrada && typeof entrada !== 'object') return res.status(400).json({ erro: 'Entrada inválida.' });
  let conversaId = null; let mensagemId = null; let origem = 'tela'; let autorizados = [];
  if (req.assistente) {
    // chamado pelo modelo (ferramenta executar_agente): a conversa e a resposta são as do token; nada pré-autorizado
    conversaId = req.assistente.conversaId; mensagemId = req.assistente.mensagemId; origem = 'assistente';
  } else {
    if (req.body?.conversa_id != null) {
      if (!idValido(req.body.conversa_id)) return res.status(400).json({ erro: 'Conversa inválida.' });
      conversaId = Number(req.body.conversa_id);
    }
  }
  // agente/entrada/conversa inválidos (ErroExecucao, 400/404): o tratador central responde { erro }
  if (!req.assistente) autorizados = await autorizadosDaEntrada(pool, req.usuario, entrada);
  const inicio = await executor().iniciar({ agente, entrada, usuario: req.usuario, conversaId, mensagemId, origem, autorizados });
  // pedido que caiu na IA e virou execução de agente: regra de vocabulário SUGERIDA (o admin aprova)
  if (req.assistente?.mensagemId) sugerirRegraDoPedido(pool, { respostaId: req.assistente.mensagemId, agente }).catch(() => {});
  if (aguardar === true) return res.json(await executor().aguardar(inicio.id, 240000));
  res.status(202).json({ id: inicio.id, conversa_id: inicio.conversaId, status: 'fila' });
}

async function execucaoDoUsuario(req, res) {
  if (!idValido(req.params.id)) { res.status(400).json({ erro: 'Execução inválida.' }); return null; }
  const r = await executor().ver(Number(req.params.id));
  if (!r) { res.status(404).json({ erro: 'Execução não encontrada.' }); return null; }
  if (!ehAdmin(req) && r.usuario_id !== req.usuario.id) { res.status(403).json({ erro: 'Esta execução é de outro usuário.' }); return null; }
  return r;
}

async function ver(req, res) {
  const r = await execucaoDoUsuario(req, res);
  if (r) res.json(r);
}

async function cancelar(req, res) {
  const r = await execucaoDoUsuario(req, res);
  if (!r) return;
  res.json({ cancelado: executor().cancelar(r.id) });
}

async function consultarConhecimento(req, res) {
  const disciplina = req.query.disciplina ? String(req.query.disciplina).slice(0, 40) : null;
  const busca = req.query.busca ? String(req.query.busca).slice(0, 300) : '';
  res.json(await conhecimento.consultar({ disciplina, busca, db: pool }));
}

async function avaliarPedido(req, res) {
  if (!idValido(req.params.id) || typeof req.body?.aceito !== 'boolean') return res.status(400).json({ erro: 'Informe aceito: true ou false.' });
  const { rows: [p] } = await pool.query('SELECT id, usuario_id, regra FROM agentes_pedidos WHERE id = $1', [req.params.id]);
  if (!p) return res.status(404).json({ erro: 'Pedido não encontrado.' });
  if (p.usuario_id !== req.usuario.id) return res.status(403).json({ erro: 'Só quem fez o pedido avalia o resultado.' });
  const { rows: [n] } = await pool.query('UPDATE agentes_pedidos SET aceito = $2, avaliado_em = NOW() WHERE id = $1 RETURNING id, aceito', [p.id, req.body.aceito]);
  res.json(n);
}

async function listarSugestoes(req, res) {
  const tipo = ['vocabulario', 'conhecimento', 'instrucao'].includes(req.query.tipo) ? req.query.tipo : null;
  const situacao = ['pendente', 'aprovada', 'recusada'].includes(req.query.situacao) ? req.query.situacao : 'pendente';
  const { rows } = await pool.query(
    `SELECT s.id, s.tipo, s.fonte, s.modo, s.agente, s.intencao, s.disciplina, s.termos, s.pergunta, s.resposta, s.situacao, s.vezes,
            s.execucao_id, s.conversa_id, s.criado_em, s.decidido_em, u.nome AS decidido_por_nome
       FROM agentes_sugestoes s LEFT JOIN usuarios u ON u.id = s.decidido_por
      WHERE s.situacao = $1 AND ($2::text IS NULL OR s.tipo = $2) AND ($3::boolean OR s.usuario_id = $4)
      ORDER BY s.vezes DESC, s.id DESC LIMIT 200`, [situacao, tipo, ehAdmin(req), req.usuario.id]);
  res.json(rows);
}

// aprovar/recusar: vocabulário só admin; conhecimento, admin ou quem fez o pedido. A resposta pode ser corrigida ao
// aprovar (o engenheiro edita o texto do Claude antes de virar conhecimento).
async function decidirSugestao(req, res) {
  if (!idValido(req.params.id)) return res.status(400).json({ erro: 'Sugestão inválida.' });
  const situacao = req.body?.situacao;
  if (!['aprovada', 'recusada'].includes(situacao)) return res.status(400).json({ erro: 'situacao deve ser aprovada ou recusada.' });
  const { rows: [s] } = await pool.query('SELECT * FROM agentes_sugestoes WHERE id = $1', [req.params.id]);
  if (!s) return res.status(404).json({ erro: 'Sugestão não encontrada.' });
  if (s.tipo === 'vocabulario' && !ehAdmin(req)) return res.status(403).json({ erro: 'Só o administrador aprova regras do roteador.' });
  // (2.47) frase do campo de instruções: também só o administrador (passa a valer sem IA para todos)
  if (s.tipo === 'instrucao' && !ehAdmin(req)) return res.status(403).json({ erro: 'Só o administrador aprova frases do campo de instruções.' });
  if (s.tipo === 'conhecimento' && !ehAdmin(req) && s.usuario_id !== req.usuario.id) return res.status(403).json({ erro: 'Só o administrador ou quem fez o pedido aprova este conhecimento.' });
  const resposta = typeof req.body?.resposta === 'string' && req.body.resposta.trim() ? req.body.resposta.trim().slice(0, 20000) : s.resposta;
  const pergunta = typeof req.body?.pergunta === 'string' && req.body.pergunta.trim() ? req.body.pergunta.trim().slice(0, 2000) : s.pergunta;
  const termos = s.tipo === 'conhecimento' ? JSON.stringify(termosSignificativos(pergunta, { max: 12 })) : JSON.stringify(s.termos);
  const { rows: [n] } = await pool.query(
    `UPDATE agentes_sugestoes SET situacao = $2, resposta = $3, pergunta = $4, termos = $5, decidido_por = $6, decidido_em = NOW(), atualizado_em = NOW()
      WHERE id = $1 RETURNING *`, [s.id, situacao, resposta, pergunta, termos, req.usuario.id]);
  if (s.tipo === 'instrucao') require('../services/instrucoes/aprendidas').esquecerCache(); // a frase aprovada vale já
  res.json(n);
}

// Indicador de dependência de IA: por agente, execuções × pedidos de suporte ao Claude Max, por mês; e o roteador
async function indicadores(req, res) {
  const meses = Math.min(24, Math.max(1, Number(req.query.meses) || 6));
  const [exec, sup, ped, sug] = await Promise.all([
    pool.query(`SELECT agente, to_char(date_trunc('month', criado_em), 'YYYY-MM') AS mes, count(*)::int AS n FROM agentes_execucoes
                 WHERE criado_em >= date_trunc('month', NOW()) - make_interval(months => $1::int - 1) GROUP BY 1, 2`, [meses]),
    pool.query(`SELECT COALESCE(agente, origem) AS agente, to_char(date_trunc('month', criado_em), 'YYYY-MM') AS mes, count(*)::int AS n,
                       count(*) FILTER (WHERE ok)::int AS ok FROM agentes_suporte
                 WHERE criado_em >= date_trunc('month', NOW()) - make_interval(months => $1::int - 1) GROUP BY 1, 2`, [meses]),
    pool.query(`SELECT decisao, count(*)::int AS n, count(*) FILTER (WHERE aceito)::int AS aceitos, count(*) FILTER (WHERE aceito = false)::int AS recusados
                  FROM agentes_pedidos WHERE criado_em >= date_trunc('month', NOW()) - make_interval(months => $1::int - 1) GROUP BY 1`, [meses]),
    pool.query(`SELECT tipo, situacao, count(*)::int AS n FROM agentes_sugestoes GROUP BY 1, 2`),
  ]);
  const porAgente = {};
  for (const r of exec.rows) ((porAgente[r.agente] ||= { execucoes: 0, suporte: 0, suporte_ok: 0, meses: {} }).meses[r.mes] ||= { execucoes: 0, suporte: 0 }).execucoes += r.n;
  for (const r of sup.rows) ((porAgente[r.agente] ||= { execucoes: 0, suporte: 0, suporte_ok: 0, meses: {} }).meses[r.mes] ||= { execucoes: 0, suporte: 0 }).suporte += r.n;
  for (const [ag, v] of Object.entries(porAgente)) {
    v.execucoes = Object.values(v.meses).reduce((s, m) => s + m.execucoes, 0);
    v.suporte = Object.values(v.meses).reduce((s, m) => s + m.suporte, 0);
    v.suporte_ok = sup.rows.filter(r => r.agente === ag).reduce((s, r) => s + r.ok, 0);
    v.dependencia_pct = v.execucoes ? Math.round((v.suporte / v.execucoes) * 1000) / 10 : null;
  }
  res.json({ meses, porAgente, roteador: ped.rows, sugestoes: sug.rows });
}

module.exports = { listar, listarExecucoes, iniciar, ver, cancelar, consultarConhecimento, avaliarPedido, listarSugestoes, decidirSugestao, indicadores };
