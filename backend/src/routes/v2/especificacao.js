// Projeto pela especificação do cliente (09/11/2026) — services/projetoEspecificacao.js.
// Ler e gerar: qualquer usuário logado (o projeto gerado é dele). Alterar, pesquisar preço, simular com
// gravação e aprovar (aprender): dono do projeto ou administrador (posse.laudo). Pesquisa na web (IA):
// só com web=true e com o limite da pesquisa de mercado. Desativar o que foi aprendido: administrador.
// Os documentos (folhas, planilha, ficha, texto de entrega e os demais da skill quadros) saem pela rota
// de sempre: GET /laudos/:id/documento/:tipo.
// Handlers em controllers/especificacaoController.js (2.39); aqui ficam o caminho e os middlewares.
const { criarUpload, multer } = require('../../utils/upload');
const ctrl = require('../../controllers/especificacaoController');

const upload = criarUpload({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, ctrl.EXTENSOES.test(file.originalname || '')),
});

module.exports = (router, { autenticar, admin, validarId, posse, limitePesquisaMercado }) => {
  const limiteSeWeb = (req, res, next) => (req.body && req.body.web ? limitePesquisaMercado(req, res, next) : next());

  router.get('/especificacao/perfis', autenticar, ctrl.perfis);
  router.post('/especificacao/ler', autenticar, upload.single('arquivo'), ctrl.ler);
  router.post('/especificacao/gerar', autenticar, ctrl.gerar);

  router.get('/especificacao/projetos/:id', autenticar, validarId, ctrl.ver);
  router.put('/especificacao/projetos/:id', autenticar, validarId, posse.laudo, ctrl.atualizar);
  router.post('/especificacao/projetos/:id/simular', autenticar, validarId, ctrl.simular);
  router.post('/especificacao/projetos/:id/precos', autenticar, validarId, posse.laudo, limiteSeWeb, ctrl.precos);
  router.post('/especificacao/projetos/:id/aprovar', autenticar, validarId, posse.laudo, ctrl.aprovar);

  router.get('/especificacao/aprendizado', autenticar, ctrl.aprendizado);
  router.delete('/especificacao/aprendizado/:id', autenticar, validarId, admin, ctrl.desativarAprendizado);
};
