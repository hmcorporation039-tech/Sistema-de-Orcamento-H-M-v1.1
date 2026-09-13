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
// Modelo fixo em código antes; agora dá pra trocar sem editar nada, só
// mudando o .env — útil quando um modelo mais novo for lançado (conferir
// sempre a documentação oficial da Anthropic antes de trocar).
const MODELO_CLAUDE = process.env.CLAUDE_MODELO_PESQUISA || 'claude-sonnet-5';

function configurado() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// `prompt` vem pronto de quem chama (utils/pesquisaMercadoService.js) — antes
// esta função montava o próprio prompt, quase igual ao de
// pesquisaMercadoController.js, só com pequenas diferenças de texto; agora
// existe um só lugar de verdade pro prompt.
async function pesquisarMercadoComClaude(prompt) {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODELO_CLAUDE,
    max_tokens: 2500,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
    messages: [{ role: 'user', content: prompt }],
  });

  const texto = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if (!texto) throw new Error('Claude não retornou texto na resposta');
  return texto;
}

module.exports = { pesquisarMercadoComClaude, configurado };
