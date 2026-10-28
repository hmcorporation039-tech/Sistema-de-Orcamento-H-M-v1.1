// Aprovação da proposta por link (versão 2.0, Fase 3I) — controllers/aprovacaoController.js.
//
// INTERNAS (login): ver = qualquer usuário logado; gerar/revogar = dono da
// proposta ou administrador (mesma posse das outras rotas de proposta).
//
// PÚBLICAS (sem login): isoladas no prefixo /api/publico/aprovacao, num router
// próprio, com limite de taxa forte por IP. Nenhuma rota pública fora deste
// prefixo; nada de CORS extra (a página pública é servida pelo próprio sistema).
const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../../controllers/aprovacaoController');
const { protegerRotasAsync } = require('../../middleware/erros');

const limite = (windowMs, limit, erro, extra = {}) => rateLimit({
  windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { erro }, ...extra,
});

// leitura da página: folgado para quem recarrega, apertado para varredura
const limiteLeitura = limite(10 * 60 * 1000, 60, 'Muitos acessos em pouco tempo. Aguarde alguns minutos e tente novamente.');
// PDF abre um Chromium inteiro: poucos por IP
const limitePdf = limite(10 * 60 * 1000, 10, 'Muitos downloads do PDF em pouco tempo. Aguarde alguns minutos e tente novamente.');
// decisão: cada link aceita uma só; o limite segura tentativa em massa
const limiteDecisao = limite(60 * 60 * 1000, 10, 'Muitas tentativas em pouco tempo. Aguarde e tente novamente.');
// tentativa de adivinhar token: só as respostas 404 (link inválido) contam
const limiteTokenInvalido = limite(15 * 60 * 1000, 20, 'Muitos links inválidos a partir deste endereço. Aguarde 15 minutos.', {
  requestWasSuccessful: (req, res) => res.statusCode !== 404,
  skipSuccessfulRequests: true,
});

module.exports = (router, { autenticar, validarId, exigirPosse }) => {
  const posseProposta = exigirPosse('propostas', {
    naoEncontrado: 'Proposta não encontrada.',
    semPermissao: 'Esta proposta foi criada por outro usuário. Peça a ele ou a um administrador para alterar.',
  });

  router.post('/propostas/:id/link-aprovacao', autenticar, validarId, posseProposta, ctrl.gerarLink);
  router.get('/propostas/:id/links-aprovacao', autenticar, validarId, ctrl.listarLinks);
  router.post('/propostas/:id/links-aprovacao/:linkId/revogar', autenticar, validarId, posseProposta, ctrl.revogarLink);
  router.get('/propostas/:id/decisoes-aprovacao', autenticar, validarId, ctrl.listarDecisoes);

  const publico = protegerRotasAsync(express.Router());
  publico.use((req, res, next) => {
    // conteúdo comercial do cliente: sem cache em proxy/navegador e fora de buscadores
    res.set({ 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
    next();
  });
  publico.use(limiteTokenInvalido);
  publico.get('/:token', limiteLeitura, ctrl.verPublico);
  publico.get('/:token/pdf', limitePdf, ctrl.pdfPublico);
  // modelo 3D: gerar/capturar pesa como o PDF — mesmo limite
  publico.get('/:token/modelo-3d', limitePdf, ctrl.modelo3dPublico);
  publico.post('/:token/decisao', limiteDecisao, ctrl.decidirPublico);
  // qualquer outro caminho do prefixo: mesma resposta de link inválido
  publico.use((req, res) => res.status(404).json({ erro: 'Este link de aprovação não é válido ou já expirou. Peça um novo link à H&M Engenharia.', codigo: 'LINK_INVALIDO' }));
  router.use('/publico/aprovacao', publico);
};
