const pool = require('../config/database');
const { pesquisarPrecoMercado, salvarPesquisaManual, ErroPesquisaMercado } = require('../utils/pesquisaMercadoService');

// Endpoint HTTP — a lógica de verdade (prompt, fallback Gemini→Claude, cache)
// mora em utils/pesquisaMercadoService.js, reaproveitada também pelas
// ferramentas do servidor MCP (mcp-server.js).
async function pesquisar(req, res) {
  try {
    const tipo = req.body.tipo === 'servico' ? 'servico' : 'material';
    const resultado = await pesquisarPrecoMercado(typeof req.body.descricao === 'string' ? req.body.descricao.slice(0, 500) : '', { tipo });
    res.json(resultado);
  } catch (err) {
    if (err instanceof ErroPesquisaMercado) {
      return res.status(err.status).json({ erro: err.message });
    }
    console.error('Erro inesperado na pesquisa de mercado:', err);
    res.status(500).json({ erro: 'Erro ao pesquisar preço de mercado' });
  }
}

// Salva no sistema uma pesquisa de preço feita FORA da API paga — tipicamente
// a busca que o próprio Claude Desktop fez na web (sem gastar cota/dinheiro).
// Usado pela ferramenta MCP salvar_pesquisa_mercado.
async function salvar(req, res) {
  try {
    const { descricao, resultado, fonte } = req.body;
    const r = await salvarPesquisaManual(descricao, resultado, fonte);
    res.status(201).json(r);
  } catch (err) {
    if (err instanceof ErroPesquisaMercado) {
      return res.status(err.status).json({ erro: err.message });
    }
    console.error('Erro ao salvar pesquisa de mercado:', err);
    res.status(500).json({ erro: 'Erro ao salvar pesquisa de mercado' });
  }
}

// Histórico de pesquisas de mercado já feitas (cache de utils/pesquisaMercadoService.js)
// pra uma descrição parecida — usado pela ferramenta MCP historico_preco e,
// no futuro, dá pra usar numa tela de consulta se fizer sentido.
async function historico(req, res) {
  const { descricao, limite } = req.query;
  if (!descricao || !descricao.trim()) {
    return res.status(400).json({ erro: 'Informe a descrição a consultar' });
  }
  const normalizada = descricao.trim().toLowerCase().replace(/\s+/g, ' ');
  const result = await pool.query(
    `SELECT descricao, resultado, fonte, criado_em FROM pesquisas_mercado
     WHERE descricao_normalizada ILIKE $1 ORDER BY criado_em DESC LIMIT $2`,
    [`%${normalizada}%`, Math.min(Number(limite) || 5, 20)]
  );
  res.json(result.rows);
}

module.exports = { pesquisar, salvar, historico };
