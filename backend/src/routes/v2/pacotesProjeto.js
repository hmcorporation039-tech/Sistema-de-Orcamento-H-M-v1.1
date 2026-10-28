// Pacote de arquivos de projeto e compatibilização por posição (versão 2.3) —
// controllers/projetosController.js + services/pacotesProjeto.js.
// Enviar/analisar o pacote: qualquer usuário logado (como a análise de sempre),
// com o mesmo limite de análises; o pacote só serve a quem enviou (ou admin).
// O DXF da compatibilização: qualquer usuário logado (como ver a análise).
const fs = require('fs');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const ctrl = require('../../controllers/projetosController');
const { PASTA_UPLOAD } = require('../../services/pacotesProjeto');

// em disco, não em memória: um pacote de dezenas de DWG não pode ocupar a RAM do servidor.
// 150 MB por arquivo (um ZIP com o projeto inteiro) e 80 arquivos por envio: o
// pacote aceita 60 PDF/DWG/DXF, e mais que isso só enchia o disco temporário.
const uploadPacote = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { fs.mkdirSync(PASTA_UPLOAD, { recursive: true }); cb(null, PASTA_UPLOAD); },
  }),
  // pasta enviada pela tela: o nome vem com a pasta relativa ("Elétrica/E-01.dwg")
  preservePath: true,
  limits: { fileSize: 150 * 1024 * 1024, files: 80 },
  fileFilter: (req, file, cb) => cb(null, /\.(pdf|dwg|dxf|zip)$/i.test(file.originalname || '')),
});
// Cada envio grava até 80 × 150 MB no disco e abre ZIPs: limite por usuário
// (envio em loop, por engano ou não, enchia o disco e ocupava o servidor).
const limiteEnvioPacote = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => `usuario:${req.usuario?.id}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitos envios de pacote de projeto em pouco tempo. Aguarde alguns minutos e tente novamente.' },
});
// apaga os temporários do upload quando a resposta termina, deu certo ou não.
// 'close' e não 'finish': se o navegador cai no meio, 'finish' nunca dispara e
// o arquivo ficava no disco (a limpeza por idade do serviço pega o que escapar).
const limparUpload = (req, res, next) => {
  res.on('close', () => { for (const f of req.files || []) fs.rm(f.path, { force: true }, () => {}); });
  next();
};

module.exports = (router, { autenticar, validarId, limiteAnaliseProjeto }) => {
  router.post('/projetos/pacotes', autenticar, limiteEnvioPacote, limparUpload, uploadPacote.array('arquivos', 80), ctrl.receberPacote);
  router.post('/projetos/pacotes/:token/analisar', autenticar, limiteAnaliseProjeto, ctrl.analisarPacote);
  router.delete('/projetos/pacotes/:token', autenticar, ctrl.descartarPacote);
  router.get('/projetos/analises/:id/compatibilizacao-dxf', autenticar, validarId, ctrl.compatibilizacaoDxf);
};
