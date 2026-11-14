// Notas emitidas ainda não pagas — controllers/notasAReceberController.js (regras em services/notasAReceber.js).
// Dinheiro da empresa: tudo só para o administrador, como o resto do Financeiro.
const ctrl = require('../../controllers/notasAReceberController');

module.exports = (router, { autenticar, admin, validarId }) => {
  router.get('/notas-a-receber', autenticar, admin, ctrl.listar);
  router.post('/notas-a-receber/ligar-sugeridas', autenticar, admin, ctrl.ligarSugeridas);
  router.post('/notas-a-receber/obra-das-notas', autenticar, admin, ctrl.aplicarObraDasNotas);
  router.post('/notas-a-receber/:id/ligar', autenticar, admin, validarId, ctrl.ligar);
  router.post('/notas-a-receber/:id/baixa', autenticar, admin, validarId, ctrl.darBaixa);
  router.delete('/notas-a-receber/:id/baixa', autenticar, admin, validarId, ctrl.desfazerBaixa);
};
