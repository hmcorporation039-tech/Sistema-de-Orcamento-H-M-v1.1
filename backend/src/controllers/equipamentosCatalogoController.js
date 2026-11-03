// Catálogo de equipamentos de climatização (fase 4) — services/equipamentosCatalogo.js.
// Rotas em routes/v2/equipamentosCatalogo.js.
const S = require('../services/equipamentosCatalogo');

// GET /equipamentos-catalogo?tipo=&fabricante=&verificado=sim|nao&texto=
async function listar(req, res) {
  const { tipo, fabricante, verificado, texto } = req.query;
  res.json(await S.listar({ tipo, fabricante, verificado, texto }));
}

async function buscarUm(req, res) {
  const e = await S.buscarUm(Number(req.params.id));
  if (!e) return res.status(404).json({ erro: 'Equipamento não encontrado.' });
  res.json(e);
}

async function criar(req, res) {
  res.status(201).json(await S.criar(req.body || {}, req.usuario));
}

async function atualizar(req, res) {
  res.json(await S.atualizar(Number(req.params.id), req.body || {}, req.usuario));
}

async function aprovar(req, res) {
  res.json(await S.aprovar(Number(req.params.id), req.usuario));
}

async function remover(req, res) {
  await S.remover(Number(req.params.id), req.usuario);
  res.json({ mensagem: 'Equipamento excluído do catálogo' });
}

module.exports = { listar, buscarUm, criar, atualizar, aprovar, remover };
