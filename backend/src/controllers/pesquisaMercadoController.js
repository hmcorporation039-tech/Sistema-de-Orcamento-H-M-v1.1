const { chamarGemini, configurado } = require('../utils/geminiClient');

// Pesquisa o preço de mercado de um material via Gemini com busca real no
// Google (não é a IA "lembrando" de memória — ela pesquisa de verdade e
// responde com base no que encontrou). Sempre um resultado consultivo: quem
// decide se atualiza o preço do catálogo continua sendo o usuário.
async function pesquisar(req, res) {
  const { descricao } = req.body;
  if (!descricao || !descricao.trim()) {
    return res.status(400).json({ erro: 'Informe a descrição do material a pesquisar' });
  }

  if (!configurado()) {
    return res.status(422).json({ erro: 'Pesquisa de mercado desativada — GEMINI_API_KEY não configurada no .env' });
  }

  const prompt = `Pesquise o preço de mercado atual no Brasil para o seguinte material/equipamento: "${descricao.trim()}".
Traga de 3 a 6 resultados reais de sites, fornecedores ou distribuidores brasileiros, com nome do produto encontrado, preço e link.
Se algum resultado for de uma variação diferente do material pedido (ex.: categoria/especificação diferente, marca genérica muito mais barata), diga isso explicitamente na observação.
Responda em texto corrido organizado, curto e direto — não precisa ser JSON.`;

  try {
    const texto = await chamarGemini({ prompt, busca: true, tentativas: 2 });
    res.json({ descricao: descricao.trim(), resultado: texto });
  } catch (err) {
    console.error('Erro na pesquisa de mercado:', err);
    res.status(502).json({ erro: err.message || 'Erro ao pesquisar preço de mercado' });
  }
}

module.exports = { pesquisar };
