// Propostas enviadas e sem resposta (services/followUpPropostas.js) — rotas em routes/v2/followUpPropostas.js.
// Todos veem a lista; registrar o envio ou o contato é do dono da proposta ou do administrador (a posse fica na rota).
// Erro do serviço com status (400 dado inválido, 404 proposta, 409 proposta não Ativa ou sem envio) sai pelo
// tratador central (middleware/erros.js) como { erro: mensagem }.
const servico = require('../services/followUpPropostas');
const pool = require('../config/database');

async function listar(req, res) {
  res.json(await servico.listar());
}

// A resposta é sempre a lista nova (a proposta sai dela ou muda de prazo).
async function registrarEnvio(req, res) {
  await servico.registrarEnvio(pool, Number(req.params.id), req.usuario.id, req.body || {});
  res.json(await servico.listar());
}

async function registrarContato(req, res) {
  await servico.registrar(pool, Number(req.params.id), req.usuario.id, req.body || {});
  res.json(await servico.listar());
}

module.exports = { listar, registrarEnvio, registrarContato };
