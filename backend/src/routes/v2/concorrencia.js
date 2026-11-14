// Comparador de orçamentos da concorrência e aprendizado de orçamento por disciplina (06/11/2026).
// Leitura livre para quem está logado (como as propostas); alterar/apagar a importação só o dono ou o administrador.
// Handlers em controllers/concorrenciaController.js (2.40); aqui ficam o caminho e os middlewares.
const { criarUpload, multer } = require('../../utils/upload');
const ctrl = require('../../controllers/concorrenciaController');

const upload = criarUpload({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, ctrl.EXTENSOES.test(file.originalname || '')),
});

module.exports = (router, { autenticar, validarId, exigirPosse }) => {
  const posseConcorrente = exigirPosse('orcamentos_concorrentes', {
    naoEncontrado: 'Orçamento do concorrente não encontrado.',
    semPermissao: 'Este orçamento do concorrente foi importado por outro usuário. Peça a ele ou a um administrador para alterar.',
  });

  router.get('/concorrencia', autenticar, ctrl.listar);
  router.post('/concorrencia', autenticar, upload.single('arquivo'), ctrl.importar);
  router.get('/concorrencia/:id', autenticar, validarId, ctrl.comparacao);
  router.patch('/concorrencia/:id', autenticar, validarId, posseConcorrente, ctrl.atualizar);
  router.patch('/concorrencia/:id/itens/:itemId', autenticar, validarId, posseConcorrente, ctrl.vincularItem);
  router.delete('/concorrencia/:id', autenticar, validarId, posseConcorrente, ctrl.remover);

  // o que o sistema já sabe orçar em cada disciplina (services/aprendizadoOrcamento.js)
  router.get('/orcamentos/aprendizado', autenticar, ctrl.painelAprendizado);
};
