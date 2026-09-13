const pool = require('../config/database');
const { chamarGemini, configurado: geminiConfigurado } = require('./geminiClient');
const { pesquisarMercadoComClaude, configurado: claudeConfigurado } = require('./claudeClient');

// Lógica de pesquisa de mercado, isolada do Express — reaproveitada tanto
// pelo endpoint HTTP (pesquisaMercadoController.js) quanto pelas ferramentas
// do servidor MCP (mcp-server.js), que chamam isso direto, sem passar por
// req/res. Antes o prompt vivia duplicado aqui e em claudeClient.js (com
// pequenas diferenças de texto) — agora tem um só lugar.

// Cache de 48h: a mesma descrição pesquisada de novo nesse intervalo reusa o
// resultado salvo em vez de gastar cota do Gemini ou dinheiro do Claude de
// novo — e a tabela vai virando um histórico de preços pesquisados.
const HORAS_CACHE = 48;

class ErroPesquisaMercado extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

function normalizarDescricao(desc) {
  return desc.trim().toLowerCase().replace(/\s+/g, ' ');
}

function montarPrompt(descricao) {
  return `Pesquise o preço de mercado atual no Brasil para o seguinte material/equipamento: "${descricao}".
Traga de 3 a 6 resultados reais de sites, fornecedores ou distribuidores brasileiros, com nome do produto encontrado, preço e link.
Se algum resultado for de uma variação diferente do material pedido (ex.: categoria/especificação diferente, marca genérica muito mais barata), diga isso explicitamente na observação.
Responda em texto corrido organizado, curto e direto — não precisa ser JSON.`;
}

async function buscarCache(descricaoNormalizada) {
  const r = await pool.query(
    `SELECT resultado, fonte, criado_em FROM pesquisas_mercado
     WHERE descricao_normalizada = $1 AND criado_em > NOW() - INTERVAL '${HORAS_CACHE} hours'
     ORDER BY criado_em DESC LIMIT 1`,
    [descricaoNormalizada]
  );
  return r.rows[0] || null;
}

async function salvarCache(descricaoOriginal, descricaoNormalizada, resultado, fonte) {
  await pool.query(
    `INSERT INTO pesquisas_mercado (descricao, descricao_normalizada, resultado, fonte) VALUES ($1,$2,$3,$4)`,
    [descricaoOriginal, descricaoNormalizada, resultado, fonte]
  );
}

// Pesquisa o preço de mercado de um material/serviço com busca real na web
// (Gemini gratuito primeiro, Claude pago como fallback quando a cota diária
// do Gemini estoura). Sempre um resultado consultivo — quem decide se
// atualiza o preço continua sendo o usuário.
async function pesquisarPrecoMercado(descricao) {
  const desc = (descricao || '').trim();
  if (!desc) throw new ErroPesquisaMercado('Informe a descrição do material a pesquisar', 400);

  if (!geminiConfigurado() && !claudeConfigurado()) {
    throw new ErroPesquisaMercado('Pesquisa de mercado desativada — nenhuma IA configurada no .env (GEMINI_API_KEY ou ANTHROPIC_API_KEY)', 422);
  }

  const normalizada = normalizarDescricao(desc);
  // Cache é só otimização de custo — se a tabela falhar por qualquer motivo,
  // a pesquisa segue normalmente (não trava por causa disso).
  const emCache = await buscarCache(normalizada).catch(() => null);
  if (emCache) {
    return { descricao: desc, resultado: emCache.resultado, fonte: emCache.fonte, deCache: true, pesquisadoEm: emCache.criado_em };
  }

  const prompt = montarPrompt(desc);

  if (geminiConfigurado()) {
    try {
      const texto = await chamarGemini({ prompt, busca: true, tentativas: 2 });
      await salvarCache(desc, normalizada, texto, 'gemini').catch(() => {});
      return { descricao: desc, resultado: texto, fonte: 'gemini', deCache: false };
    } catch (err) {
      console.error('Gemini falhou na pesquisa de mercado, tentando fallback:', err.message);
    }
  }

  if (claudeConfigurado()) {
    try {
      const texto = await pesquisarMercadoComClaude(prompt);
      await salvarCache(desc, normalizada, texto, 'claude').catch(() => {});
      return { descricao: desc, resultado: texto, fonte: 'claude', deCache: false };
    } catch (err) {
      console.error('Erro na pesquisa de mercado (Claude, fallback):', err);
      throw new ErroPesquisaMercado(err.message || 'Erro ao pesquisar preço de mercado (Gemini e Claude falharam)', 502);
    }
  }

  throw new ErroPesquisaMercado('Gemini falhou e não há ANTHROPIC_API_KEY configurada pra fallback', 502);
}

module.exports = { pesquisarPrecoMercado, ErroPesquisaMercado };
