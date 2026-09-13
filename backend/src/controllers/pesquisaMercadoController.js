const { pesquisarPrecoMercado, ErroPesquisaMercado } = require('../utils/pesquisaMercadoService');

// Endpoint HTTP — a lógica de verdade (prompt, fallback Gemini→Claude, cache)
// mora em utils/pesquisaMercadoService.js, reaproveitada também pelas
// ferramentas do servidor MCP (mcp-server.js).
async function pesquisar(req, res) {
  try {
    const resultado = await pesquisarPrecoMercado(req.body.descricao);
    res.json(resultado);
  } catch (err) {
    if (err instanceof ErroPesquisaMercado) {
      return res.status(err.status).json({ erro: err.message });
    }
    console.error('Erro inesperado na pesquisa de mercado:', err);
    res.status(500).json({ erro: 'Erro ao pesquisar preço de mercado' });
  }
}

module.exports = { pesquisar };
