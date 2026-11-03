// Canal remoto (Fase 6 — Telegram/WhatsApp). controllers/canalController.js, services/canal/*.
//
// Webhooks: SEM autenticar (quem chama é o provedor, não um usuário logado), mas com a assinatura
// conferida SEMPRE no controller, limite de taxa por IP e corpo bruto limitado (server.js monta o
// express.raw em /api/canal/webhook antes do express.json). Canal desligado → 404.
// Tela do administrador: autenticar + admin.
const rateLimit = require('express-rate-limit');
const ctrl = require('../../controllers/canalController');
const { config } = require('../../services/canal/config');

module.exports = (router, { autenticar, admin, validarId }) => {
  const limiteWebhook = rateLimit({
    windowMs: 60 * 1000,
    limit: config().limitePorMinuto,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { erro: 'Muitos pedidos em pouco tempo.' },
  });
  router.post('/canal/webhook/telegram', limiteWebhook, ctrl.webhookTelegram);
  router.get('/canal/webhook/whatsapp', limiteWebhook, ctrl.verificarWhatsapp);
  router.post('/canal/webhook/whatsapp', limiteWebhook, ctrl.webhookWhatsapp);

  router.get('/canal/estado', autenticar, admin, ctrl.estado);
  router.get('/canal/mensagens', autenticar, admin, ctrl.mensagens);
  router.get('/canal/mensagens/:id', autenticar, admin, validarId, ctrl.mensagem);
  router.get('/canal/acoes', autenticar, admin, ctrl.acoes);
  router.post('/canal/simular', autenticar, admin, ctrl.simular);
};
