// Projeto pela especificação do cliente (09/11/2026) — services/projetoEspecificacao.js.
// Ler e gerar: qualquer usuário logado (o projeto gerado é dele). Alterar, pesquisar preço, simular com
// gravação e aprovar (aprender): dono do projeto ou administrador (posse.laudo). Pesquisa na web (IA):
// só com web=true e com o limite da pesquisa de mercado. Desativar o que foi aprendido: administrador.
// Os documentos (folhas, planilha, ficha, texto de entrega e os demais da skill quadros) saem pela rota
// de sempre: GET /laudos/:id/documento/:tipo.
const { criarUpload, multer } = require('../../utils/upload');
const svc = require('../../services/projetoEspecificacao');
const AP = require('../../services/aprendizadoEspecificacao');

const upload = criarUpload({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, svc.EXTENSOES.test(file.originalname || '')),
});
const idOpcional = (v) => {
  if (v == null || v === '') return { valor: null };
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? { valor: n } : { erro: true };
};
const responder = (fn) => async (req, res) => {
  try { res.json(await fn(req, res)); } catch (e) {
    if (e.status) return res.status(e.status).json({ erro: e.message });
    throw e;
  }
};

module.exports = (router, { autenticar, admin, validarId, posse, limitePesquisaMercado }) => {
  router.get('/especificacao/perfis', autenticar, responder(() => ({ perfis: svc.perfis() })));

  router.post('/especificacao/ler', autenticar, upload.single('arquivo'), responder(async (req) => {
    if (!req.file) throw Object.assign(new Error('Envie a especificação (PDF, DOCX, XLSX ou TXT).'), { status: 400 });
    return svc.ler(req.file.buffer, req.file.originalname, { perfil: req.body.perfil || null });
  }));

  router.post('/especificacao/gerar', autenticar, responder(async (req) => {
    const b = req.body || {};
    const o = idOpcional(b.obra_id);
    if (o.erro) throw Object.assign(new Error('Obra inválida.'), { status: 400 });
    return svc.gerar({ perfil: b.perfil, lidos: b.lidos, pedido: String(b.pedido || '').slice(0, 500), cliente: String(b.cliente || '').slice(0, 200), obra: String(b.obra || '').slice(0, 200),
      obraId: o.valor, decisoes: b.decisoes || {}, respostas: b.respostas || {}, contingencia: b.contingencia ?? 0.1, usuario: req.usuario });
  }));

  router.get('/especificacao/projetos/:id', autenticar, validarId, responder((req) => svc.ver(Number(req.params.id))));
  router.put('/especificacao/projetos/:id', autenticar, validarId, posse.laudo, responder((req) => svc.atualizar(Number(req.params.id), req.body || {})));
  router.post('/especificacao/projetos/:id/simular', autenticar, validarId, responder((req) => svc.simular(Number(req.params.id), (req.body && req.body.entradas) || {})));
  router.post('/especificacao/projetos/:id/precos', autenticar, validarId, posse.laudo, (req, res, next) => (req.body && req.body.web ? limitePesquisaMercado(req, res, next) : next()),
    responder((req) => svc.sugerirPrecos(Number(req.params.id), { web: !!(req.body && req.body.web) })));
  router.post('/especificacao/projetos/:id/aprovar', autenticar, validarId, posse.laudo, responder((req) => svc.aprovar(Number(req.params.id), req.body || {}, { usuario: req.usuario })));

  router.get('/especificacao/aprendizado', autenticar, responder(async (req) => ({ itens: await AP.listar({ perfil: req.query.perfil || null }) })));
  router.delete('/especificacao/aprendizado/:id', autenticar, validarId, admin, responder(async (req) => ({ desativados: await AP.desativar(Number(req.params.id)) })));
};
