// Catálogo de componentes de quadros (versão 2.4) — services/componentesQuadro.js.
// Rotas em routes/v2/componentesQuadro.js.
const S = require('../services/componentesQuadro');

// GET /componentes-quadro?fabricante=&tipo=&verificado=sim|nao&texto=&origem=
async function listar(req, res) {
  const { fabricante, tipo, verificado, texto, origem } = req.query;
  res.json(await S.listar({ fabricante, tipo, verificado, texto, origem }));
}

async function buscarUm(req, res) {
  const c = await S.buscarUm(Number(req.params.id));
  if (!c) return res.status(404).json({ erro: 'Componente não encontrado.' });
  res.json(c);
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
  res.json({ mensagem: 'Componente excluído do catálogo' });
}

// POST /componentes-quadro/pesquisar-medida { fabricante, tipo, especificacao }
async function pesquisarMedida(req, res) {
  res.json(await S.pesquisarMedida(req.body || {}, req.usuario));
}

// POST /componentes-quadro/pesquisar-medidas { componentes: [{ tag, tipo, fabricante, especificacao }] }
// → 202 com a tarefa (segue em segundo plano; a tela acompanha pelo GET abaixo)
async function pesquisarEmLote(req, res) {
  const lista = req.body?.componentes ?? req.body?.componentes_sem_medida;
  res.status(202).json(await S.iniciarPesquisaEmLote(lista, req.usuario));
}

// GET /componentes-quadro/pesquisas/:tarefa
async function tarefa(req, res) {
  const t = S.lerTarefa(req.params.tarefa, req.usuario);
  if (!t) return res.status(404).json({ erro: 'Busca não encontrada (expirou ou o servidor foi reiniciado). Clique de novo em "Buscar medidas oficiais".' });
  res.json(t);
}

module.exports = { listar, buscarUm, criar, atualizar, aprovar, remover, pesquisarMedida, pesquisarEmLote, tarefa };
