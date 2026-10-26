// Obras (versão 2.0, Fase 2D) — ver controllers/obrasController.js.
// Ver/listar: qualquer usuário logado. Editar e ligar/desligar itens: dono da
// obra ou administrador. Excluir: administrador (e só obra sem itens ligados).
const ctrl = require('../../controllers/obrasController');

module.exports = (router, { autenticar, admin, validarId, exigirPosse }) => {
  const posseObra = exigirPosse('obras', {
    naoEncontrado: 'Obra não encontrada.',
    semPermissao: 'Esta obra foi criada por outro usuário. Peça a ele ou a um administrador para alterar.',
  });
  router.get('/obras', autenticar, ctrl.listar);
  router.post('/obras', autenticar, ctrl.criar);
  router.get('/obras/:id/pasta', autenticar, validarId, ctrl.pasta);
  router.post('/obras/:id/pasta/abrir', autenticar, validarId, ctrl.abrirPasta);
  router.put('/obras/:id/vinculos', autenticar, validarId, posseObra, ctrl.vincular);
  router.get('/obras/:id', autenticar, validarId, ctrl.buscarUma);
  router.put('/obras/:id', autenticar, validarId, posseObra, ctrl.atualizar);
  router.delete('/obras/:id', autenticar, validarId, admin, ctrl.remover);
};
