// Projeto pela especificação do cliente — controller (tirado de routes/v2/especificacao.js na 2.39: a rota
// fica só com o caminho e os middlewares). Regras em services/projetoEspecificacao.js e
// services/aprendizadoEspecificacao.js.
const svc = require('../services/projetoEspecificacao');
const AP = require('../services/aprendizadoEspecificacao');

const idOpcional = (v) => {
  if (v == null || v === '') return { valor: null };
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? { valor: n } : { erro: true };
};
const erro400 = (mensagem) => Object.assign(new Error(mensagem), { status: 400 });
// erro com status (do serviço ou daqui) → { erro } com o status; o resto vai ao tratador central
const responder = (fn) => async (req, res) => {
  try { res.json(await fn(req, res)); } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    throw e;
  }
};

const perfis = responder(() => ({ perfis: svc.perfis() }));

const ler = responder(async (req) => {
  if (!req.file) throw erro400('Envie a especificação (PDF, DOCX, XLSX ou TXT).');
  return svc.ler(req.file.buffer, req.file.originalname, { perfil: req.body.perfil || null });
});

const gerar = responder(async (req) => {
  const b = req.body || {};
  const o = idOpcional(b.obra_id);
  if (o.erro) throw erro400('Obra inválida.');
  return svc.gerar({
    perfil: b.perfil, lidos: b.lidos, pedido: String(b.pedido || '').slice(0, 500), cliente: String(b.cliente || '').slice(0, 200), obra: String(b.obra || '').slice(0, 200),
    obraId: o.valor, decisoes: b.decisoes || {}, respostas: b.respostas || {}, contingencia: b.contingencia ?? 0.1, usuario: req.usuario,
  });
});

const ver = responder((req) => svc.ver(Number(req.params.id)));
const atualizar = responder((req) => svc.atualizar(Number(req.params.id), req.body || {}));
const simular = responder((req) => svc.simular(Number(req.params.id), (req.body && req.body.entradas) || {}));
// web=true pesquisa na web (IA): cada busca conta no limite por hora do usuário (utils/limiteUsoIa)
const precos = responder((req) => svc.sugerirPrecos(Number(req.params.id), { web: !!(req.body && req.body.web), usuarioId: req.usuario.id }));
const aprovar = responder((req) => svc.aprovar(Number(req.params.id), req.body || {}, { usuario: req.usuario }));

const aprendizado = responder(async (req) => ({ itens: await AP.listar({ perfil: req.query.perfil || null }) }));
const desativarAprendizado = responder(async (req) => ({ desativados: await AP.desativar(Number(req.params.id)) }));

module.exports = { perfis, ler, gerar, ver, atualizar, simular, precos, aprovar, aprendizado, desativarAprendizado, EXTENSOES: svc.EXTENSOES };
