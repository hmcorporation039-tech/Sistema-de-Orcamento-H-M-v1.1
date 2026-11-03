// Envio do pacote de entrega do projeto por e-mail (Fase 6). É a rota executada pela ação pendente
// "enviar_email_projeto" (canal: "SIM 4821"; tela do assistente: "Aplicar"). Posse do projeto e limite
// de envio por usuário, como o envio da proposta.
const rateLimit = require('express-rate-limit');
const ctrl = require('../../controllers/canalEnvioProjeto');

module.exports = (router, { autenticar, validarId, posse }) => {
  const limiteEnvio = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 30,
    keyGenerator: (req) => `usuario:${req.usuario?.id}`,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { erro: 'Muitos e-mails enviados em pouco tempo. Aguarde um pouco e tente novamente.' },
  });
  router.post('/laudos/:id/enviar-email', autenticar, validarId, posse.laudo, limiteEnvio, ctrl.enviarEmailProjeto);
};
