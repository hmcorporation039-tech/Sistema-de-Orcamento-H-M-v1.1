// Cadastro fiscal da NFS-e (versão 2.4, etapa 1) — controllers/fiscalController.js.
// Ver e consultar tabelas: qualquer usuário logado (o cadastro de cliente usa
// CEP e municípios); mudar os dados fiscais e os serviços da empresa: só administrador.
const ctrl = require('../../controllers/fiscalController');

module.exports = (router, { autenticar, admin, validarId }) => {
  router.get('/fiscal/empresa', autenticar, ctrl.obterEmpresa);
  router.put('/fiscal/empresa', autenticar, admin, ctrl.atualizarEmpresa);
  router.post('/fiscal/empresa/servicos', autenticar, admin, ctrl.criarServico);
  router.put('/fiscal/empresa/servicos/:id', autenticar, validarId, admin, ctrl.atualizarServico);
  router.delete('/fiscal/empresa/servicos/:id', autenticar, validarId, admin, ctrl.removerServico);

  router.get('/fiscal/servicos', autenticar, ctrl.servicos);
  router.get('/fiscal/nbs', autenticar, ctrl.nbs);
  router.get('/fiscal/municipios', autenticar, ctrl.municipios);
  router.get('/fiscal/cep/:cep', autenticar, ctrl.cep);
};
