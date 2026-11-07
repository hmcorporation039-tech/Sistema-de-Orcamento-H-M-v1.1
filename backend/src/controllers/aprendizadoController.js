// Painel "O que o sistema já sabe" e o treino com as obras já feitas (plano "sistema autônomo", 03/11/2026).
//   GET  /aprendizado            resumo do conhecimento, autonomia, acerto da leitura e fila do que conferir
//   GET  /aprendizado/treino     andamento do treino com o acervo
//   POST /aprendizado/treino     começa uma rodada (admin) — roda em segundo plano; a tela acompanha pelo GET
//   POST /aprendizado/treino/parar  pede para parar depois do arquivo atual (admin)
const painel = require('../services/painelAprendizado');
const treino = require('../services/treinoAcervo');
const pool = require('../config/database');
const { registrarAuditoria } = require('../services/auditoria');

// a fila do que conferir é a de quem pede (o administrador vê a de todos)
async function resumo(req, res) {
  res.json(await painel.resumo(req.usuario));
}

function andamento(req, res) {
  res.json(treino.situacao());
}

async function iniciarTreino(req, res) {
  if (treino.situacao().rodando) return res.status(409).json({ erro: 'Já há um treino em andamento.', ...treino.situacao() });
  const limite = Number(req.body?.limite) > 0 ? Math.min(Number(req.body.limite), 5000) : undefined;
  treino.treinar({ limite }).catch(e => console.error('[treino-acervo]', e.message));
  await registrarAuditoria(pool, { entidade: 'aprendizado', acao: 'treino_acervo', detalhes: { limite: limite || null }, usuarioId: req.usuario?.id || null });
  res.status(202).json(treino.situacao());
}

function pararTreino(req, res) {
  res.json(treino.pararTreino());
}

module.exports = { resumo, andamento, iniciarTreino, pararTreino };
