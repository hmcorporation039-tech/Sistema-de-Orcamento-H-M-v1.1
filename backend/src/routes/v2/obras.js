// Obras (versão 2.0, Fase 2D) — ver controllers/obrasController.js.
// Ver/listar: qualquer usuário logado. Editar e ligar/desligar itens: dono da
// obra ou administrador. Excluir e juntar: administrador (excluir só obra sem itens ligados).
const ctrl = require('../../controllers/obrasController');

module.exports = (router, { autenticar, admin, validarId, posse, limiteAnaliseProjeto }) => {
  const posseObra = posse.obra();
  router.get('/obras', autenticar, ctrl.listar);
  router.post('/obras', autenticar, ctrl.criar);
  // 2.42: obras que parecem a mesma (aviso ao criar) — antes de /obras/:id
  router.get('/obras/parecidas', autenticar, ctrl.parecidas);
  router.get('/obras/:id/pasta', autenticar, validarId, ctrl.pasta);
  router.post('/obras/:id/pasta/abrir', autenticar, validarId, ctrl.abrirPasta);
  // 2.3: pacote de análise com os arquivos que já estão na pasta da obra
  router.post('/obras/:id/pasta/pacote', autenticar, validarId, limiteAnaliseProjeto, ctrl.pacoteDaPasta);
  router.put('/obras/:id/vinculos', autenticar, validarId, posseObra, ctrl.vincular);
  // 2.42: junta a obra repetida nesta (admin: move também contratos e o financeiro)
  router.post('/obras/:id/juntar', autenticar, validarId, admin, ctrl.juntar);
  router.get('/obras/:id', autenticar, validarId, ctrl.buscarUma);
  router.put('/obras/:id', autenticar, validarId, posseObra, ctrl.atualizar);
  router.delete('/obras/:id', autenticar, validarId, admin, ctrl.remover);
};
