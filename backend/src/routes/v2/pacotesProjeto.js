// Pacote de arquivos de projeto e compatibilização por posição (versão 2.3) —
// controllers/projetosController.js + services/pacotesProjeto.js.
// Enviar/analisar o pacote: qualquer usuário logado (como a análise de sempre),
// com o mesmo limite de análises; o pacote só serve a quem enviou (ou admin).
// O DXF da compatibilização: qualquer usuário logado (como ver a análise).
const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const ctrl = require('../../controllers/projetosController');

// em disco, não em memória: um pacote de dezenas de DWG não pode ocupar a RAM do servidor
const PASTA_UPLOAD = path.join(os.tmpdir(), 'hm-pacotes-upload');
const uploadPacote = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => { fs.mkdirSync(PASTA_UPLOAD, { recursive: true }); cb(null, PASTA_UPLOAD); },
  }),
  // pasta enviada pela tela: o nome vem com a pasta relativa ("Elétrica/E-01.dwg")
  preservePath: true,
  limits: { fileSize: 200 * 1024 * 1024, files: 120 },
  fileFilter: (req, file, cb) => cb(null, /\.(pdf|dwg|dxf|zip)$/i.test(file.originalname || '')),
});
// apaga os temporários do upload quando a resposta termina (deu certo ou não)
const limparUpload = (req, res, next) => {
  res.on('finish', () => { for (const f of req.files || []) fs.rm(f.path, { force: true }, () => {}); });
  next();
};

module.exports = (router, { autenticar, validarId, limiteAnaliseProjeto }) => {
  router.post('/projetos/pacotes', autenticar, limparUpload, uploadPacote.array('arquivos', 120), ctrl.receberPacote);
  router.post('/projetos/pacotes/:token/analisar', autenticar, limiteAnaliseProjeto, ctrl.analisarPacote);
  router.delete('/projetos/pacotes/:token', autenticar, ctrl.descartarPacote);
  router.get('/projetos/analises/:id/compatibilizacao-dxf', autenticar, validarId, ctrl.compatibilizacaoDxf);
};
