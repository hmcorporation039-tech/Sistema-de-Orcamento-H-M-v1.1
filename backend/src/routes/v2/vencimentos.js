// Vencimentos de laudos no painel inicial. Quem está logado vê, cadastra e renova; encerrar é do administrador.
const ctrl = require('../../controllers/vencimentosController');

module.exports = (router, { autenticar, admin, validarId }) => {
  router.get('/vencimentos', autenticar, ctrl.listar);
  router.post('/vencimentos', autenticar, ctrl.criar);
  router.put('/vencimentos/:id/renovar', autenticar, validarId, ctrl.renovar);
  router.delete('/vencimentos/:id', autenticar, validarId, admin, ctrl.encerrar);
};
