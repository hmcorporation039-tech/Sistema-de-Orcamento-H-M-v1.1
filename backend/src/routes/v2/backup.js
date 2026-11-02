// Backup do banco pelo painel de Integrações. Só administrador.
const ctrl = require('../../controllers/backupController');

module.exports = (router, { autenticar, admin }) => {
  router.get('/integracoes/backup', autenticar, admin, ctrl.situacao);
  router.post('/integracoes/backup/executar', autenticar, admin, ctrl.executar);
};
