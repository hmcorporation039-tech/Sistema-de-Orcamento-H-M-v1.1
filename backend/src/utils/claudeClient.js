const Anthropic = require('@anthropic-ai/sdk');

// Cliente fino pra API do Claude (Anthropic) — usado só como fallback pago da
// pesquisa de mercado, quando a cota diária gratuita do Gemini já estourou em
// todos os modelos. Testado antes de usar em produção:
//
// - web_search_20260209 (versão nova, com filtragem dinâmica por código) NÃO
//   serve pra esse caso: o modelo entra num loop de refinar a busca (o item
//   pesquisado é um material de nicho, com pouca presença na web em
//   português), gastando 200k-800k tokens e 4-5 minutos POR ITEM — inviável.
// - web_search_20250305 (versão antiga, sem o loop de filtragem) com Sonnet 5
//   é direto: ~20s e ~45k tokens por pesquisa, resposta completa e honesta
//   (inclusive quando não acha o código exato, sugere equivalentes reais).
//   É essa versão que usamos aqui.
function configurado() {
  return !!process.env.ANTHROPIC_API_KEY;
}

async function pesquisarMercadoComClaude(descricao) {
  const client = new Anthropic();

  const prompt = `Pesquise o preço de mercado atual no Brasil para o seguinte material/equipamento: "${descricao}".
Traga de 3 a 5 resultados reais de sites, fornecedores ou distribuidores brasileiros, com nome do produto, preço e link.
Se algum resultado for de uma variação diferente do material pedido (marca, categoria, especificação), diga isso explicitamente.
Responda em texto corrido organizado, curto e direto — não precisa ser JSON.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 2500,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
    messages: [{ role: 'user', content: prompt }],
  });

  const texto = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (!texto) throw new Error('Claude não retornou texto na resposta');
  return texto;
}

module.exports = { pesquisarMercadoComClaude, configurado };
