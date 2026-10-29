// Upload (multer) com o limite de tamanho DA ROTA guardado no pedido: o erro de
// arquivo grande diz o limite certo ("acima de 8 MB" nas fotos do campo, 25 MB
// no assistente…). Antes a mensagem era fixa ("15/40/150 MB") e não batia com
// todas as rotas. Mesmo uso do multer: criarUpload(opcoes).single('arquivo').
const multer = require('multer');

const guardarLimite = (bytes) => (req, res, next) => { req.limiteUploadBytes = bytes; next(); };

function criarUpload(opcoes) {
  const m = multer(opcoes);
  const bytes = opcoes?.limits?.fileSize || null;
  const comLimite = (mw) => [guardarLimite(bytes), mw];
  return {
    single: (...a) => comLimite(m.single(...a)),
    array: (...a) => comLimite(m.array(...a)),
    fields: (...a) => comLimite(m.fields(...a)),
    any: (...a) => comLimite(m.any(...a)),
    none: (...a) => comLimite(m.none(...a)),
    limiteBytes: bytes,
  };
}

const mb = (bytes) => `${Math.round((bytes / 1048576) * 10) / 10}`.replace('.', ',');

module.exports = { criarUpload, multer, mb };
