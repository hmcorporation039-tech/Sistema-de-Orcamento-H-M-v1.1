// Comparativo de fornecedores (services/cotacoesFornecedor.js): leitura para todos os usuários logados;
// o nome do fornecedor (palpite tirado do documento) pode ser corrigido por quem está logado.
const servico = require('../../services/cotacoesFornecedor');
const pool = require('../../config/database');

module.exports = (router, { autenticar, validarId }) => {
  router.get('/materiais/:id/cotacoes', autenticar, validarId, async (req, res) => {
    const r = await servico.comparacaoDoMaterial(pool, Number(req.params.id));
    if (!r) return res.status(404).json({ erro: 'Material não encontrado.' });
    res.json(r);
  });

  router.get('/cotacoes/oportunidades', autenticar, async (req, res) => {
    res.json(await servico.oportunidades(pool));
  });

  router.put('/cotacoes/fornecedores/:cnpj', autenticar, async (req, res) => {
    try {
      res.json(await servico.renomearFornecedor(pool, req.params.cnpj, req.body?.nome));
    } catch (e) {
      if (e.status) return res.status(e.status).json({ erro: e.message });
      throw e;
    }
  });
};
