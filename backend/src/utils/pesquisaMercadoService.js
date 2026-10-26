const pool = require('../config/database');
const { chamarGemini, configurado: geminiConfigurado } = require('./geminiClient');
const { pesquisarMercadoComClaude, configurado: claudeConfigurado } = require('./claudeClient');
const { pesquisarWebClaudeMax, cliDisponivel } = require('./leitorCotacaoIA');

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

// Resposta ESTRUTURADA (ofertas com loja, produto, preço e link), no formato
// da aba "Pesquisa de Preços" da planilha de orçamento da H&M — antes era
// texto livre e o preço tinha de ser redigitado à mão.
const FORMATO = '{"ofertas":[{"fonte":"nome da loja/distribuidor","produto":"nome exato do produto anunciado","preco":123.45,"link":"https://...","mesmo_item":true,"observacao":""}],"observacao":""}';

function montarPrompt(descricao, tipo = 'material') {
  const oQue = tipo === 'servico'
    ? `o preço de mercado de MÃO DE OBRA (serviço, sem material) no Brasil para: "${descricao}". Use tabelas de referência (SINAPI, sindicatos, sites de orçamento) ou anúncios de prestadores; informe o preço por unidade do serviço`
    : `o preço de mercado atual no Brasil do material/equipamento: "${descricao}"`;
  return `Pesquise na web ${oQue}.
Traga de 3 a 5 ofertas REAIS de lojas, fornecedores ou distribuidores brasileiros, com o nome exato do produto anunciado, o preço à vista em reais (número, ponto como separador decimal) e o link da página.
Marque "mesmo_item": false quando a oferta for de outra variação (especificação, capacidade ou marca diferente) e explique em "observacao". Não invente preço nem link — se não achar, devolva menos ofertas.
Responda SOMENTE com JSON neste formato: ${FORMATO}`;
}

const numero = (v) => {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[^\d.,]/g, '');
  if (!s) return NaN;
  return /,\d{1,2}$/.test(s) ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s.replace(/,/g, ''));
};

// Ofertas vindas da IA são DADO não confiável: valida número, link http(s) e tamanho
function normalizarOfertas(json) {
  const lista = Array.isArray(json?.ofertas) ? json.ofertas : [];
  return lista.map(o => ({
    fonte: String(o.fonte || '').slice(0, 80),
    produto: String(o.produto || '').slice(0, 200),
    preco: Math.round(numero(o.preco) * 100) / 100,
    link: /^https?:\/\//i.test(String(o.link || '')) ? String(o.link).slice(0, 500) : null,
    mesmo_item: o.mesmo_item !== false,
    observacao: String(o.observacao || '').slice(0, 300),
  })).filter(o => o.fonte && Number.isFinite(o.preco) && o.preco > 0).slice(0, 6);
}

// Média / mínimo / máximo só das ofertas do MESMO item (critério padrão da
// planilha: média); preço sugerido = média.
function estatistica(ofertas) {
  const validas = ofertas.filter(o => o.mesmo_item).map(o => o.preco);
  if (!validas.length) return { media: null, minimo: null, maximo: null, n: 0 };
  const media = validas.reduce((s, p) => s + p, 0) / validas.length;
  return { media: Math.round(media * 100) / 100, minimo: Math.min(...validas), maximo: Math.max(...validas), n: validas.length };
}

const moeda = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
function textoDasOfertas(ofertas, est, obs) {
  const linhas = ofertas.map(o => `• ${o.fonte}: ${moeda(o.preco)} — ${o.produto}${o.mesmo_item ? '' : ' (variação diferente)'}${o.observacao ? ` — ${o.observacao}` : ''}${o.link ? `\n  ${o.link}` : ''}`);
  if (est.n) linhas.push(`\nMédia ${moeda(est.media)} (mín. ${moeda(est.minimo)}, máx. ${moeda(est.maximo)}, ${est.n} oferta(s) do mesmo item).`);
  if (obs) linhas.push(obs);
  return linhas.join('\n') || 'Nenhuma oferta encontrada.';
}

function extrairJson(texto) {
  const t = String(texto || '');
  const i = t.indexOf('{'), f = t.lastIndexOf('}');
  if (i < 0 || f <= i) return null;
  try { return JSON.parse(t.slice(i, f + 1)); } catch { return null; }
}

async function buscarCache(descricaoNormalizada) {
  const r = await pool.query(
    `SELECT resultado, fonte, criado_em, ofertas, preco_sugerido FROM pesquisas_mercado
     WHERE descricao_normalizada = $1 AND criado_em > NOW() - INTERVAL '${HORAS_CACHE} hours'
     ORDER BY criado_em DESC LIMIT 1`,
    [descricaoNormalizada]
  );
  return r.rows[0] || null;
}

async function salvarCache(descricaoOriginal, descricaoNormalizada, resultado, fonte, ofertas = null, precoSugerido = null) {
  await pool.query(
    `INSERT INTO pesquisas_mercado (descricao, descricao_normalizada, resultado, fonte, ofertas, preco_sugerido) VALUES ($1,$2,$3,$4,$5,$6)`,
    [descricaoOriginal, descricaoNormalizada, resultado, fonte, ofertas ? JSON.stringify(ofertas) : null, precoSugerido]
  );
}

// Pesquisa o preço de mercado de um material/serviço com busca real na web
// (Gemini gratuito primeiro, Claude pago como fallback quando a cota diária
// do Gemini estoura). Sempre um resultado consultivo — quem decide se
// atualiza o preço continua sendo o usuário.
// Ordem (preferência do usuário): Claude Max pela assinatura (sem custo por
// uso) → Gemini com busca → Claude pela API. Cada provedor devolve o JSON de
// ofertas; o texto continua sendo gravado para a tela e o histórico.
async function pesquisarPrecoMercado(descricao, { tipo = 'material' } = {}) {
  const desc = (descricao || '').trim();
  if (!desc) throw new ErroPesquisaMercado('Informe a descrição do material a pesquisar', 400);

  const temClaudeMax = cliDisponivel();
  if (!temClaudeMax && !geminiConfigurado() && !claudeConfigurado()) {
    throw new ErroPesquisaMercado('Pesquisa de mercado desativada — nenhuma IA disponível (Claude Code com a assinatura Max, GEMINI_API_KEY ou ANTHROPIC_API_KEY)', 422);
  }

  const normalizada = normalizarDescricao(`${tipo === 'servico' ? '[servico] ' : ''}${desc}`);
  // Cache é só otimização de custo — se a tabela falhar por qualquer motivo,
  // a pesquisa segue normalmente (não trava por causa disso).
  const emCache = await buscarCache(normalizada).catch(() => null);
  if (emCache) {
    const ofertas = emCache.ofertas || [];
    return { descricao: desc, resultado: emCache.resultado, fonte: emCache.fonte, deCache: true, pesquisadoEm: emCache.criado_em, ofertas, estatistica: estatistica(ofertas), precoSugerido: emCache.preco_sugerido != null ? Number(emCache.preco_sugerido) : null };
  }

  const prompt = montarPrompt(desc, tipo);
  const provedores = [
    temClaudeMax && ['claude_max', () => pesquisarWebClaudeMax(prompt)],
    geminiConfigurado() && ['gemini', async () => extrairJson(await chamarGemini({ prompt, busca: true, tentativas: 2 }))],
    claudeConfigurado() && ['claude', async () => extrairJson(await pesquisarMercadoComClaude(prompt))],
  ].filter(Boolean);

  const erros = [];
  for (const [fonte, executar] of provedores) {
    try {
      const json = await executar();
      const ofertas = normalizarOfertas(json);
      if (!ofertas.length && provedores.at(-1)[0] !== fonte) { erros.push(`${fonte}: nenhuma oferta`); continue; }
      const est = estatistica(ofertas);
      const texto = textoDasOfertas(ofertas, est, json?.observacao ? String(json.observacao).slice(0, 300) : '');
      await salvarCache(desc, normalizada, texto, fonte, ofertas, est.media).catch(() => {});
      return { descricao: desc, resultado: texto, fonte, deCache: false, ofertas, estatistica: est, precoSugerido: est.media };
    } catch (err) {
      erros.push(`${fonte}: ${err.message}`);
      console.error(`Pesquisa de mercado (${fonte}) falhou:`, err.message);
    }
  }
  throw new ErroPesquisaMercado(`Não foi possível pesquisar o preço agora (${erros.join(' | ').slice(0, 300)})`, 502);
}

// Grava no sistema uma pesquisa de preço feita FORA da API paga — tipicamente
// uma busca que o Claude Desktop fez com a própria ferramenta de web (sem
// gastar cota do Gemini nem crédito do Claude via API). Fica no mesmo lugar
// das pesquisas automáticas: alimenta o cache de 48h e o histórico, então o
// botão da tela também passa a mostrar o que foi pesquisado por aqui.
async function salvarPesquisaManual(descricao, resultado, fonte = 'claude_desktop') {
  const desc = (descricao || '').trim();
  const texto = (resultado || '').trim();
  if (!desc) throw new ErroPesquisaMercado('Informe a descrição do material pesquisado', 400);
  if (!texto) throw new ErroPesquisaMercado('Informe o resultado da pesquisa a salvar', 400);

  // Coluna fonte é VARCHAR(20); descricao/descricao_normalizada são VARCHAR(500).
  const fonteLimpa = (String(fonte || 'claude_desktop').trim() || 'claude_desktop').slice(0, 20);
  const descCurta = desc.slice(0, 500);
  const normalizada = normalizarDescricao(descCurta).slice(0, 500);

  await salvarCache(descCurta, normalizada, texto, fonteLimpa);
  return { descricao: descCurta, fonte: fonteLimpa, salvo: true };
}

module.exports = { pesquisarPrecoMercado, salvarPesquisaManual, ErroPesquisaMercado, normalizarOfertas, estatistica };
