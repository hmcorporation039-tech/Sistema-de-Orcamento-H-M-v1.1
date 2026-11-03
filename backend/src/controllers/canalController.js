// Canal remoto (Fase 6): webhooks do Telegram e do WhatsApp (sem login: vêm do provedor, com a
// assinatura conferida SEMPRE) e a tela do administrador (estado dos canais, fila, ações pendentes e
// o simulador, que manda uma mensagem pelo mesmo fluxo sem provedor).
const express = require('express');
const pool = require('../config/database');
const { config, estadoDosCanais } = require('../services/canal/config');
const { conferirTelegram, conferirWhatsapp, verificacaoWhatsapp } = require('../services/canal/assinaturas');
const { lerTelegram, lerWhatsapp } = require('../services/canal/provedores');
const F = require('../services/canal/fila');
const { trabalhador } = require('../services/canal/trabalhador');
const { dependencias } = require('../services/canal/dependencias');
const { ipDoPedido } = require('../utils/ipPedido');

const NAO_ENCONTRADO = { erro: 'Não encontrado.' };

// Corpo BRUTO dos webhooks (a assinatura do WhatsApp é do byte exato que chegou). Montado no
// server.js ANTES do express.json, só em /api/canal/webhook.
function corpoBrutoDosWebhooks() {
  return express.raw({ type: () => true, limit: config().corpoMaxBytes });
}

const ip = (req) => { try { return ipDoPedido(req); } catch { return req.ip || null; } };

async function receber(req, res, canal) {
  const cfg = config();
  if (!cfg[canal].ativo) return res.status(404).json(NAO_ENCONTRADO);
  const bruto = Buffer.isBuffer(req.body) ? req.body : null;
  if (!bruto) return res.status(400).json({ erro: 'Corpo inválido.' });
  if (bruto.length > cfg.corpoMaxBytes) return res.status(413).json({ erro: 'Corpo grande demais.' });
  const assinado = canal === 'telegram'
    ? conferirTelegram(req.get('X-Telegram-Bot-Api-Secret-Token'), cfg.telegram.segredo)
    : conferirWhatsapp(bruto, req.get('X-Hub-Signature-256'), cfg.whatsapp.appSecret);
  if (!assinado) {
    await dependencias().registrarAuditoria({ origem: canal, acao: 'canal_assinatura_invalida', ip: ip(req), detalhe: { canal } });
    return res.status(401).json({ erro: 'Assinatura inválida.' });
  }
  let corpo;
  try { corpo = JSON.parse(bruto.toString('utf8')); } catch { return res.status(400).json({ erro: 'Corpo inválido.' }); }
  const mensagens = canal === 'telegram' ? lerTelegram(corpo) : lerWhatsapp(corpo);
  let novas = 0;
  for (const m of mensagens.slice(0, 50)) if (await F.enfileirar({ ...m, ip: ip(req) })) novas++;
  // responde já: o processamento é do trabalhador (o provedor reenvia se demorar)
  res.status(200).json({ ok: true });
  if (novas) { trabalhador().ligarRelogio(); trabalhador().acordar(); }
}

const webhookTelegram = (req, res) => receber(req, res, 'telegram');
const webhookWhatsapp = (req, res) => receber(req, res, 'whatsapp');

// GET de verificação da Meta (hub.challenge)
function verificarWhatsapp(req, res) {
  const cfg = config();
  if (!cfg.whatsapp.ativo) return res.status(404).json(NAO_ENCONTRADO);
  const desafio = verificacaoWhatsapp(req.query, cfg.whatsapp.verifyToken);
  if (!desafio) return res.status(403).json({ erro: 'Verificação recusada.' });
  res.type('text/plain').send(desafio);
}

// ── Tela do administrador ───────────────────────────────────────────────
async function estado(req, res) {
  const { rows: [fila] } = await pool.query(
    `SELECT count(*) FILTER (WHERE estado = 'recebida')::int AS recebidas, count(*) FILTER (WHERE estado = 'processando')::int AS processando,
            count(*) FILTER (WHERE estado = 'erro' AND recebida_em > NOW() - INTERVAL '7 days')::int AS erros_7d,
            count(*) FILTER (WHERE recebida_em > NOW() - INTERVAL '24 hours')::int AS ultimas_24h
       FROM canal_mensagens`);
  res.json({ ...estadoDosCanais(), seguranca: dependencias().seguranca, fila, trabalhador: trabalhador().estado() });
}

const mascarar = (t) => { const s = String(t || ''); return s.length <= 4 ? s : `${'•'.repeat(Math.min(6, s.length - 4))}${s.slice(-4)}`; };

async function mensagens(req, res) {
  const limite = Math.min(100, Math.max(1, Number(req.query.limite) || 30));
  const { rows } = await pool.query(
    `SELECT m.id, m.canal, m.remetente, m.nome_remetente, m.tipo, m.texto, m.estado, m.tentativas, m.resposta, m.via, m.erro, m.enviada,
            m.recebida_em, m.processada_em, u.nome AS usuario_nome
       FROM canal_mensagens m LEFT JOIN usuarios u ON u.id = m.usuario_id
      ORDER BY m.id DESC LIMIT $1`, [limite]);
  res.json(rows.map(m => ({ ...m, remetente: m.canal === 'simulador' ? 'simulador' : mascarar(m.remetente) })));
}

async function mensagem(req, res) {
  const { rows: [m] } = await pool.query(
    `SELECT id, canal, tipo, texto, estado, tentativas, resposta, via, erro, enviada, recebida_em, processada_em FROM canal_mensagens WHERE id = $1`, [req.params.id]);
  if (!m) return res.status(404).json({ erro: 'Mensagem não encontrada.' });
  res.json(m);
}

async function acoes(req, res) {
  const { rows } = await pool.query(
    `SELECT a.id, a.tipo, a.status, a.codigo, a.canal, a.canal_id_externo, a.expira_em, a.criado_em, a.decidido_em, a.resultado,
            split_part(a.descricao, E'\\n\\nMotivo informado', 1) AS descricao, u.nome AS usuario_nome,
            (a.status = 'pendente' AND a.expira_em IS NOT NULL AND a.expira_em <= NOW()) AS expirada
       FROM assistente_acoes a LEFT JOIN usuarios u ON u.id = a.usuario_id
      WHERE a.origem = 'canal' ORDER BY a.id DESC LIMIT 50`);
  res.json(rows.map(a => ({ ...a, canal_id_externo: a.canal === 'simulador' ? 'simulador' : mascarar(a.canal_id_externo) })));
}

// POST /canal/simular { texto, sem_vinculo? } — mesma fila, mesmo trabalhador, sem provedor: a
// resposta fica na fila (a tela consulta GET /canal/mensagens/:id)
async function simular(req, res) {
  const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : '';
  if (!texto) return res.status(400).json({ erro: 'Escreva a mensagem de teste.' });
  if (texto.length > 4000) return res.status(400).json({ erro: 'Mensagem longa demais (até 4.000 caracteres).' });
  const semVinculo = req.body?.sem_vinculo === true;
  const m = await F.enfileirar({
    canal: 'simulador', id_externo: `sim-${req.usuario.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    remetente: `sim-${req.usuario.id}`, conversa: `sim-${req.usuario.id}`, nome_remetente: req.usuario.nome,
    tipo: 'texto', texto, midia: semVinculo ? { sem_vinculo: true } : null, usuario_id: semVinculo ? null : req.usuario.id, ip: ip(req),
  });
  trabalhador().ligarRelogio();
  trabalhador().acordar();
  res.status(202).json({ id: m.id, estado: m.estado });
}

module.exports = { corpoBrutoDosWebhooks, webhookTelegram, webhookWhatsapp, verificarWhatsapp, estado, mensagens, mensagem, acoes, simular };
