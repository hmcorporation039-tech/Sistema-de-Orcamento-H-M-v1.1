// Comparador de orçamentos da concorrência e painel "o que já sabe orçar" — controller (tirado de
// routes/v2/concorrencia.js na 2.40). Regras em services/concorrencia.js e services/aprendizadoOrcamento.js.
const concorrencia = require('../services/concorrencia');
const aprendizadoOrcamento = require('../services/aprendizadoOrcamento');

const idOpcional = (v) => {
  if (v == null || v === '') return { valor: null };
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? { valor: n } : { erro: true };
};

async function listar(req, res) {
  const p = idOpcional(req.query.proposta_id);
  const o = idOpcional(req.query.obra_id);
  if (p.erro || o.erro) return res.status(400).json({ erro: 'Filtro inválido.' });
  res.json(await concorrencia.listar({ propostaId: p.valor, obraId: o.valor }));
}

async function importar(req, res) {
  if (!req.file) return res.status(400).json({ erro: 'Envie o orçamento do concorrente (PDF ou planilha Excel).' });
  const p = idOpcional(req.body.proposta_id);
  if (p.erro) return res.status(400).json({ erro: 'Proposta inválida.' });
  const r = await concorrencia.importar({
    buffer: req.file.buffer, nome: req.file.originalname, propostaId: p.valor,
    concorrente: req.body.concorrente, cnpj: req.body.cnpj,
    usarIA: req.body.usar_ia === 'true' || req.body.usar_ia === true, usuarioId: req.usuario.id,
  });
  if (r.erro) return res.status(422).json({ erro: r.erro });
  res.status(201).json(r);
}

async function comparacao(req, res) {
  const r = await concorrencia.comparacao(req.params.id);
  if (!r) return res.status(404).json({ erro: 'Orçamento do concorrente não encontrado.' });
  res.json(r);
}

async function atualizar(req, res) {
  const r = await concorrencia.atualizar(req.params.id, req.body || {}, req.usuario.id);
  if (!r) return res.status(404).json({ erro: 'Orçamento do concorrente não encontrado.' });
  if (r.erro) return res.status(400).json({ erro: r.erro });
  res.json(r);
}

async function vincularItem(req, res) {
  const itemId = Number(req.params.itemId);
  if (!Number.isInteger(itemId) || itemId < 1) return res.status(400).json({ erro: 'Item inválido.' });
  const r = await concorrencia.vincularItem(req.params.id, itemId, req.body || {});
  if (!r) return res.status(404).json({ erro: 'Item não encontrado.' });
  if (r.erro) return res.status(400).json({ erro: r.erro });
  res.json(r);
}

async function remover(req, res) {
  const r = await concorrencia.remover(req.params.id, req.usuario.id);
  if (!r) return res.status(404).json({ erro: 'Orçamento do concorrente não encontrado.' });
  res.json({ mensagem: 'Orçamento do concorrente removido.' });
}

// o que o sistema já sabe orçar em cada disciplina
async function painelAprendizado(req, res) {
  res.json(await aprendizadoOrcamento.painel());
}

module.exports = { listar, importar, comparacao, atualizar, vincularItem, remover, painelAprendizado, EXTENSOES: concorrencia.EXTENSOES };
