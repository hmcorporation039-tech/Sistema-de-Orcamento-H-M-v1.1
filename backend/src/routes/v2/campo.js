// Ordens de serviço de campo (versão 2.0, Fase 4J) — controllers/campoController.js.
// Contrato com o app de campo: docs/CAMPO-API.md.
//
// Tudo com login. Ver/operar: quem vê a OS (admin, responsável pela OS, dono
// da obra). Criar pela obra: dono da obra ou admin (posse). Editar pelo
// escritório: dono da obra ou admin (conferido no controller, pela obra da
// OS). Excluir: admin. Fotos: multer em memória, 1 arquivo de até 8 MB,
// conteúdo conferido pelos bytes no controller.
const multer = require('multer');
const ctrl = require('../../controllers/campoController');
const { LIMITES } = require('../../utils/campo');

const multerFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: LIMITES.foto_bytes, files: 1, fields: 12, fieldSize: 4096, parts: 16 },
}).single('foto');

// erro do multer com mensagem própria (o padrão de middleware/erros.js fala em 15 MB)
function uploadFoto(req, res, next) {
  multerFoto(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ erro: 'A foto passa de 8 MB.' });
    if (err instanceof multer.MulterError) return res.status(400).json({ erro: 'Envio da foto inválido (um arquivo no campo "foto").' });
    return next(err);
  });
}

module.exports = (router, { autenticar, admin, validarId, exigirPosse }) => {
  const posseObra = exigirPosse('obras', {
    naoEncontrado: 'Obra não encontrada.',
    semPermissao: 'Esta obra foi criada por outro usuário. Peça a ele ou a um administrador para abrir a OS.',
  });
  router.get('/campo/os', autenticar, ctrl.listar);
  router.get('/campo/modelos-checklist', autenticar, ctrl.modelos);
  router.post('/campo/sincronizar', autenticar, ctrl.sincronizar);
  router.get('/campo/fotos/:uuid', autenticar, ctrl.verFoto);
  // :id = id numérico ou uuid da OS
  router.get('/campo/os/:id/pdf', autenticar, ctrl.pdf);
  router.get('/campo/os/:id/assinatura', autenticar, ctrl.verAssinatura);
  router.post('/campo/os/:id/fotos', autenticar, uploadFoto, ctrl.enviarFoto);
  router.get('/campo/os/:id', autenticar, ctrl.buscarUma);
  router.put('/campo/os/:id', autenticar, ctrl.atualizar);
  router.delete('/campo/os/:id', autenticar, admin, ctrl.remover);
  router.post('/obras/:id/os', autenticar, validarId, posseObra, ctrl.criarDaObra);
};
