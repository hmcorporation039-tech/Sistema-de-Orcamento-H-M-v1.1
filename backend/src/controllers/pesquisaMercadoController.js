const { chamarGemini, configurado: geminiConfigurado } = require('../utils/geminiClient');
const { pesquisarMercadoComClaude, configurado: claudeConfigurado } = require('../utils/claudeClient');

// Pesquisa o preço de mercado de um material com busca real na web (não é a
// IA "lembrando" de memória — ela pesquisa de verdade e responde com base no
// que encontrou). Sempre um resultado consultivo: quem decide se atualiza o
// preço do catálogo continua sendo o usuário.
//
// Gemini é o caminho principal (gratuito). Se a cota diária gratuita estourar
// em todos os modelos (ou qualquer outro erro do Gemini), cai pro Claude
// (pago, sem cota diária) como fallback — testado e ajustado especificamente
// pra esse uso (ver utils/claudeClient.js).
async function pesquisar(req, res) {
  const { descricao } = req.body;
  if (!descricao || !descricao.trim()) {
    return res.status(400).json({ erro: 'Informe a descrição do material a pesquisar' });
  }
  const desc = descricao.trim();

  if (!geminiConfigurado() && !claudeConfigurado()) {
    return res.status(422).json({ erro: 'Pesquisa de mercado desativada — nenhuma IA configurada no .env (GEMINI_API_KEY ou ANTHROPIC_API_KEY)' });
  }

  const prompt = `Pesquise o preço de mercado atual no Brasil para o seguinte material/equipamento: "${desc}".
Traga de 3 a 6 resultados reais de sites, fornecedores ou distribuidores brasileiros, com nome do produto encontrado, preço e link.
Se algum resultado for de uma variação diferente do material pedido (ex.: categoria/especificação diferente, marca genérica muito mais barata), diga isso explicitamente na observação.
Responda em texto corrido organizado, curto e direto — não precisa ser JSON.`;

  if (geminiConfigurado()) {
    try {
      const texto = await chamarGemini({ prompt, busca: true, tentativas: 2 });
      return res.json({ descricao: desc, resultado: texto, fonte: 'gemini' });
    } catch (err) {
      console.error('Gemini falhou na pesquisa de mercado, tentando fallback:', err.message);
    }
  }

  if (claudeConfigurado()) {
    try {
      const texto = await pesquisarMercadoComClaude(desc);
      return res.json({ descricao: desc, resultado: texto, fonte: 'claude' });
    } catch (err) {
      console.error('Erro na pesquisa de mercado (Claude, fallback):', err);
      return res.status(502).json({ erro: err.message || 'Erro ao pesquisar preço de mercado (Gemini e Claude falharam)' });
    }
  }

  res.status(502).json({ erro: 'Gemini falhou e não há ANTHROPIC_API_KEY configurada pra fallback' });
}

module.exports = { pesquisar };
