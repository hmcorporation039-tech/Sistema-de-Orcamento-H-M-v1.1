// Comparativo de fornecedores (services/cotacoesFornecedor.js): leitura para todos os usuários logados.
// O nome do fornecedor (palpite tirado do documento) vale para todos: só administrador corrige, e fica na
// auditoria (antes qualquer usuário renomeava, sem registro de quem mudou).
const servico = require('../../services/cotacoesFornecedor');
const pool = require('../../config/database');
const { registrarAuditoria } = require('../../services/auditoria');

module.exports = (router, { autenticar, admin, validarId }) => {
  router.get('/materiais/:id/cotacoes', autenticar, validarId, async (req, res) => {
    const r = await servico.comparacaoDoMaterial(pool, Number(req.params.id));
    if (!r) return res.status(404).json({ erro: 'Material não encontrado.' });
    res.json(r);
  });

  router.get('/cotacoes/oportunidades', autenticar, async (req, res) => {
    res.json(await servico.oportunidades(pool));
  });

  // erro com status (400/404) sai pelo tratador central (middleware/erros.js)
  router.put('/cotacoes/fornecedores/:cnpj', autenticar, admin, async (req, res) => {
    const r = await servico.renomearFornecedor(pool, req.params.cnpj, req.body?.nome);
    await registrarAuditoria(pool, {
      entidade: 'cotacao_fornecedor', acao: 'renomear', usuarioId: req.usuario.id,
      detalhes: { cnpj: r.cnpj, de: r.anterior, para: r.nome },
    });
    res.json({ cnpj: r.cnpj, nome: r.nome });
  });
};
