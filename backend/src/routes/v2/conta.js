// Minha conta (sessões, verificação em duas etapas, Telegram/WhatsApp) e auditoria de acesso — Fase 6,
// segurança antes do canal remoto (02/11/2026). Tudo passa por `autenticar`; o que é de outra pessoa
// (auditoria, sessões e TOTP de outro usuário) é só do administrador. O que confere a senha tem limite
// de tentativas por usuário, como a troca de senha.
const rateLimit = require('express-rate-limit');
const ctrl = require('../../controllers/contaController');

const limiteSenhaConta = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `conta:${req.usuario?.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas sem sucesso. Aguarde 15 minutos e tente novamente.' },
});
// código de vínculo: poucos por hora bastam (cada um invalida o anterior)
const limiteCodigoVinculo = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => `vinculo:${req.usuario?.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitos códigos pedidos em pouco tempo. Aguarde um pouco e tente novamente.' },
});

module.exports = (router, { autenticar, admin, validarId }) => {
  router.get('/conta', autenticar, ctrl.resumo);

  router.get('/conta/sessoes', autenticar, ctrl.listarSessoes);
  router.post('/conta/sessoes/encerrar-outras', autenticar, ctrl.encerrarOutras);
  router.delete('/conta/sessoes/:id', autenticar, validarId, ctrl.encerrarSessao);

  router.post('/conta/totp/iniciar', autenticar, limiteSenhaConta, ctrl.totpIniciar);
  router.post('/conta/totp/confirmar', autenticar, limiteSenhaConta, ctrl.totpConfirmar);
  router.post('/conta/totp/desativar', autenticar, limiteSenhaConta, ctrl.totpDesativar);
  router.post('/conta/totp/codigos-recuperacao', autenticar, limiteSenhaConta, ctrl.totpNovosCodigos);

  router.get('/conta/vinculos', autenticar, ctrl.listarVinculos);
  router.post('/conta/vinculos/codigo', autenticar, limiteCodigoVinculo, ctrl.gerarCodigoVinculo);
  router.delete('/conta/vinculos/:id', autenticar, validarId, ctrl.removerVinculo);

  router.get('/auditoria', autenticar, admin, ctrl.auditoria);
  router.get('/usuarios/:id/sessoes', autenticar, validarId, admin, ctrl.sessoesDoUsuario);
  router.post('/usuarios/:id/sessoes/encerrar', autenticar, validarId, admin, ctrl.encerrarSessoesDoUsuario);
  router.post('/usuarios/:id/totp/desativar', autenticar, validarId, admin, ctrl.desativarTotpDoUsuario);
};
