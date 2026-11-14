// Comparativo de fornecedores — controller (tirado de routes/v2/cotacoesFornecedor.js na 2.40).
// Regras em services/cotacoesFornecedor.js. O nome do fornecedor (palpite tirado do documento) vale para
// todos: só administrador corrige (middleware na rota), e fica na auditoria.
const servico = require('../services/cotacoesFornecedor');
const pool = require('../config/database');
const { registrarAuditoria } = require('../services/auditoria');

async function comparacaoDoMaterial(req, res) {
  const r = await servico.comparacaoDoMaterial(pool, Number(req.params.id));
  if (!r) return res.status(404).json({ erro: 'Material não encontrado.' });
  res.json(r);
}

async function oportunidades(req, res) {
  res.json(await servico.oportunidades(pool));
}

// erro com status (400/404) sai pelo tratador central (middleware/erros.js)
async function renomearFornecedor(req, res) {
  const r = await servico.renomearFornecedor(pool, req.params.cnpj, req.body?.nome);
  await registrarAuditoria(pool, {
    entidade: 'cotacao_fornecedor', acao: 'renomear', usuarioId: req.usuario.id,
    detalhes: { cnpj: r.cnpj, de: r.anterior, para: r.nome },
  });
  res.json({ cnpj: r.cnpj, nome: r.nome });
}

module.exports = { comparacaoDoMaterial, oportunidades, renomearFornecedor };
