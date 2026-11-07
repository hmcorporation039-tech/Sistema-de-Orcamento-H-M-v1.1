// Comparador de orçamentos da concorrência e aprendizado de orçamento por disciplina (06/11/2026).
// Leitura livre para quem está logado (como as propostas); alterar/apagar a importação só o dono ou o administrador.
const { criarUpload, multer } = require('../../utils/upload');
const concorrencia = require('../../services/concorrencia');
const aprendizadoOrcamento = require('../../services/aprendizadoOrcamento');

const upload = criarUpload({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, concorrencia.EXTENSOES.test(file.originalname || '')),
});
const idOpcional = (v) => {
  if (v == null || v === '') return { valor: null };
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? { valor: n } : { erro: true };
};

module.exports = (router, { autenticar, validarId, exigirPosse }) => {
  const posseConcorrente = exigirPosse('orcamentos_concorrentes', {
    naoEncontrado: 'Orçamento do concorrente não encontrado.',
    semPermissao: 'Este orçamento do concorrente foi importado por outro usuário. Peça a ele ou a um administrador para alterar.',
  });

  router.get('/concorrencia', autenticar, async (req, res) => {
    const p = idOpcional(req.query.proposta_id);
    const o = idOpcional(req.query.obra_id);
    if (p.erro || o.erro) return res.status(400).json({ erro: 'Filtro inválido.' });
    res.json(await concorrencia.listar({ propostaId: p.valor, obraId: o.valor }));
  });

  router.post('/concorrencia', autenticar, upload.single('arquivo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ erro: 'Envie o orçamento do concorrente (PDF ou planilha Excel).' });
    const p = idOpcional(req.body.proposta_id);
    if (p.erro) return res.status(400).json({ erro: 'Proposta inválida.' });
    const r = await concorrencia.importar({
      buffer: req.file.buffer, nome: req.file.originalname, propostaId: p.valor,
      concorrente: req.body.concorrente, cnpj: req.body.cnpj,
      usarIA: req.body.usar_ia === 'true' || req.body.usar_ia === true, usuarioId: req.usuario.id,
    });
    if (r.erro) return res.status(422).json({ erro: r.erro });
    res.status(201).json(r);
  });

  router.get('/concorrencia/:id', autenticar, validarId, async (req, res) => {
    const r = await concorrencia.comparacao(req.params.id);
    if (!r) return res.status(404).json({ erro: 'Orçamento do concorrente não encontrado.' });
    res.json(r);
  });

  router.patch('/concorrencia/:id', autenticar, validarId, posseConcorrente, async (req, res) => {
    const r = await concorrencia.atualizar(req.params.id, req.body || {}, req.usuario.id);
    if (!r) return res.status(404).json({ erro: 'Orçamento do concorrente não encontrado.' });
    if (r.erro) return res.status(400).json({ erro: r.erro });
    res.json(r);
  });

  router.patch('/concorrencia/:id/itens/:itemId', autenticar, validarId, posseConcorrente, async (req, res) => {
    const itemId = Number(req.params.itemId);
    if (!Number.isInteger(itemId) || itemId < 1) return res.status(400).json({ erro: 'Item inválido.' });
    const r = await concorrencia.vincularItem(req.params.id, itemId, req.body || {});
    if (!r) return res.status(404).json({ erro: 'Item não encontrado.' });
    if (r.erro) return res.status(400).json({ erro: r.erro });
    res.json(r);
  });

  router.delete('/concorrencia/:id', autenticar, validarId, posseConcorrente, async (req, res) => {
    const r = await concorrencia.remover(req.params.id, req.usuario.id);
    if (!r) return res.status(404).json({ erro: 'Orçamento do concorrente não encontrado.' });
    res.json({ mensagem: 'Orçamento do concorrente removido.' });
  });

  // o que o sistema já sabe orçar em cada disciplina (services/aprendizadoOrcamento.js)
  router.get('/orcamentos/aprendizado', autenticar, async (req, res) => {
    res.json(await aprendizadoOrcamento.painel());
  });
};
