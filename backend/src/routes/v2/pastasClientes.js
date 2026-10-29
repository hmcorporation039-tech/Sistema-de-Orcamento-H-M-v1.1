// Pasta por cliente e novidades das pastas (versão 2.3) — controllers/pastasClientesController.js.
// Ver/varrer/marcar como visto: qualquer usuário logado (como ver o cliente e a
// obra); ligar o cliente a uma pasta que já existe no servidor: só administrador.
// O pacote de análise dos arquivos novos usa o mesmo serviço da tela de análise
// (services/pacotesProjeto.js), com o mesmo limite de taxa.
const ctrl = require('../../controllers/pastasClientesController');

module.exports = (router, { autenticar, validarId, limiteAnaliseProjeto, admin }) => {
  router.get('/clientes/:id/pasta', autenticar, validarId, ctrl.pasta);
  router.get('/clientes/:id/pasta/opcoes', autenticar, validarId, ctrl.opcoesDePasta);
  // mexe em pastas do servidor → só administrador
  router.put('/clientes/:id/pasta', autenticar, validarId, admin, ctrl.ligarPasta);
  router.post('/clientes/:id/pasta/abrir', autenticar, validarId, ctrl.abrirPasta);

  router.get('/novidades-pastas/resumo', autenticar, ctrl.resumoNovidades);
  router.get('/novidades-pastas', autenticar, ctrl.novidades);
  router.post('/novidades-pastas/visto', autenticar, ctrl.marcarVisto);
  router.post('/novidades-pastas/pacote', autenticar, limiteAnaliseProjeto, ctrl.pacoteDasNovidades);
};
