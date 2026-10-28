// Token curto do assistente e registro das execuções em andamento.
//
// Cada mensagem enviada ao assistente vira uma EXECUÇÃO (um processo do Claude
// Code + o MCP do assistente). O MCP fala com a API do sistema com um token
// próprio, emitido para aquela execução:
//   { id: <usuário logado>, escopo: 'assistente', conv: <conversa>, exec: <execução> }
// assinado com o JWT_SECRET, válido por 2 h. O middleware autenticar reconhece o
// escopo e só deixa passar as rotas que o MCP usa (middleware/escopoAssistente.js);
// posse e admin valem como para o próprio usuário. Além do prazo, o token só
// vale ENQUANTO a execução está no ar: terminada, cancelada ou estourado o
// tempo, a execução sai do registro e o token passa a ser recusado (401), mesmo
// que alguém o tenha copiado.
//
// O registro é em memória: o backend de produção é um processo só (se um dia
// forem vários, o registro precisa ir para o banco).
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ESCOPO = 'assistente';
const VALIDADE_TOKEN = '2h';

const ativas = new Map(); // exec -> { exec, conversaId, usuarioId, mensagemId, criados: [], acoes: [] }

function novoIdExecucao() {
  return crypto.randomBytes(12).toString('hex');
}

function emitirTokenAssistente({ usuarioId, conversaId, exec }, segredo = require('../../config/segredos').JWT_SECRET) {
  return jwt.sign({ id: usuarioId, escopo: ESCOPO, conv: conversaId, exec }, segredo, { expiresIn: VALIDADE_TOKEN, algorithm: 'HS256' });
}

function registrarExecucao({ exec, conversaId, usuarioId, mensagemId = null }) {
  const reg = { exec, conversaId: Number(conversaId), usuarioId: Number(usuarioId), mensagemId, criados: [], acoes: [], ouvintes: new Set() };
  ativas.set(exec, reg);
  return reg;
}

function encerrarExecucao(exec) {
  ativas.delete(exec);
}

function obterExecucao(exec) {
  return exec ? ativas.get(exec) || null : null;
}

// O token decodificado pertence a uma execução no ar, do mesmo usuário e da mesma conversa?
function execucaoDoToken(decodificado) {
  const reg = obterExecucao(decodificado?.exec);
  if (!reg) return null;
  if (reg.usuarioId !== Number(decodificado.id) || reg.conversaId !== Number(decodificado.conv)) return null;
  return reg;
}

// Algo criado pelo assistente nesta execução (para os links na resposta)
function registrarCriacao(exec, item) {
  const reg = obterExecucao(exec);
  if (!reg) return;
  if (!reg.criados.some(c => c.tipo === item.tipo && c.id === item.id)) reg.criados.push(item);
  for (const f of reg.ouvintes) { try { f({ tipo: 'criado', item }); } catch { /* ouvinte não derruba a API */ } }
}

function registrarAcao(exec, acao) {
  const reg = obterExecucao(exec);
  if (!reg) return;
  reg.acoes.push(acao);
  for (const f of reg.ouvintes) { try { f({ tipo: 'acao', acao }); } catch { /* idem */ } }
}

module.exports = {
  ESCOPO, novoIdExecucao, emitirTokenAssistente, registrarExecucao, encerrarExecucao, obterExecucao,
  execucaoDoToken, registrarCriacao, registrarAcao,
};
