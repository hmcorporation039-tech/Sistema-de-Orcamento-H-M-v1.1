const pool = require('../config/database');
const ia = require('./ia');
const { paraNumeroBR } = require('./numeroBR');

// Nome do provedor gravado em pesquisas_mercado.fonte (o mesmo da 1.x, para o
// histórico e o cache continuarem iguais): a API da Anthropic era "claude".
const FONTE_CACHE = { claude_max: 'claude_max', claude_api: 'claude', gemini: 'gemini' };
// Só a pesquisa AUTOMÁTICA (feita pelo próprio sistema) serve de cache. A gravada
// de fora (salvarPesquisaManual — ferramenta MCP salvar_pesquisa_mercado) é texto
// livre não verificado: fica só no histórico (revisão de 27/10/2026).
const FONTES_AUTOMATICAS = [...new Set(Object.values(FONTE_CACHE))];
const MARCA_NAO_VERIFICADA = '[NÃO VERIFICADA — pesquisa enviada de fora do sistema (Claude Desktop/MCP); confira preços e links antes de usar]';
const TAMANHO_MAX_RESULTADO_MANUAL = 20000;

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

// Referência de preço de MÃO DE OBRA por segmento (tela Preços de Mão de Obra):
// oficial/governo (o que limita preço em licitação) × mercado particular.
// Região configurável: PESQUISA_UF (padrão DF) e PESQUISA_REGIAO.
const SEGMENTOS_MO = {
  publico: {
    rotulo: 'oficial / governo',
    fontes: (uf) => `SINAPI (Caixa — composições ou insumos de mão de obra, UF ${uf}, mês de referência mais recente; diga se é desonerado ou não desonerado), ORSE, SICRO/DNIT, SEINFRA, tabelas de preços de órgãos públicos (ex.: NOVACAP, CAESB, DER) e preços praticados em licitações e atas de registro de preços (Painel de Preços do governo federal, Compras.gov.br)`,
    formatoFonte: 'a fonte com código e data (ex.: "SINAPI 91926 — 08/2026 — DF não desonerado")',
  },
  privado: {
    rotulo: 'mercado particular',
    fontes: (uf, regiao) => `preços praticados para clientes particulares (residências, condomínios, comércio e empresas) em ${regiao} ou, sem dado local, no Brasil: sites de orçamento e de prestadores (GetNinjas, Habitissimo, Triider e similares), tabelas publicadas por sindicatos e associações de eletricistas e instaladores, tabelas e anúncios de empresas do ramo e, quando o serviço for projeto, laudo ou ART, as tabelas de honorários de engenharia (CREA, SENGE, IBAPE)`,
    formatoFonte: 'a fonte (site, empresa ou tabela) com a data da publicação, quando houver',
  },
};

function promptServicoSegmento(descricao, unidade, segmento) {
  const s = SEGMENTOS_MO[segmento];
  const uf = process.env.PESQUISA_UF || 'DF';
  const regiao = process.env.PESQUISA_REGIAO || 'Brasília/Distrito Federal';
  return `Pesquise na web a referência de preço de MÃO DE OBRA (serviço, sem material) do segmento ${s.rotulo} para: "${descricao}" — unidade: ${unidade || 'un'}.
Use estas fontes: ${s.fontes(uf, regiao)}.
Traga de 2 a 5 referências REAIS: em "fonte", ${s.formatoFonte}; em "produto", a descrição exata do item/composição encontrado; em "preco", o valor em reais por ${unidade || 'unidade'} só da MÃO DE OBRA (número, ponto como separador decimal); em "link", a página consultada.
${segmento === 'publico' ? 'Composição de "fornecimento e instalação" (com material): calcule a parcela de mão de obra pela composição analítica (coeficiente de cada profissional — eletricista, encarregado, ajudante/servente — × custo horário com encargos da mesma tabela e data) e ponha esse valor em "preco", com a conta em "observacao".\n' : ''}"mesmo_item": true quando for o mesmo serviço de mão de obra na mesma unidade — mesmo que de outra região, outra data ou uma faixa de preço (use o valor médio da faixa); diga isso em "observacao". "mesmo_item": false só quando o escopo ou a unidade forem diferentes, ou quando o preço incluir material e não der para separar a mão de obra. Não invente código, preço nem link — se não achar, devolva menos referências.
Responda SOMENTE com JSON neste formato: ${FORMATO}`;
}

// Preço que a IA devolve como texto. O prompt pede ponto decimal, mas vem de
// tudo: "1.299" e "R$ 2.450" (milhar brasileiro — antes viravam 1,30 e 2,45),
// "1.299,90", "12.50", "1,299.90" e "1,299" (formato americano). Regra única de
// utils/numeroBR.js, com o formato americano tratado antes.
const numero = (v) => {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').replace(/[^\d.,]/g, '');
  if (!s) return NaN;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, ''); // vírgula de milhar (americano)
  else if (/^0\.\d+$/.test(s)) return Number(s); // "0.299" é decimal, não milhar
  const n = paraNumeroBR(s);
  return n == null ? NaN : n;
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

async function buscarCache(descricaoNormalizada) {
  const r = await pool.query(
    `SELECT resultado, fonte, criado_em, ofertas, preco_sugerido FROM pesquisas_mercado
     WHERE descricao_normalizada = $1 AND fonte = ANY($2::text[]) AND criado_em > NOW() - INTERVAL '${HORAS_CACHE} hours'
     ORDER BY criado_em DESC LIMIT 1`,
    [descricaoNormalizada, FONTES_AUTOMATICAS]
  );
  return r.rows[0] || null;
}

async function salvarCache(descricaoOriginal, descricaoNormalizada, resultado, fonte, ofertas = null, precoSugerido = null) {
  await pool.query(
    `INSERT INTO pesquisas_mercado (descricao, descricao_normalizada, resultado, fonte, ofertas, preco_sugerido) VALUES ($1,$2,$3,$4,$5,$6)`,
    [descricaoOriginal, descricaoNormalizada, resultado, fonte, ofertas ? JSON.stringify(ofertas) : null, precoSugerido]
  );
}

// Pesquisa o preço de mercado de um material/serviço com busca real na web.
// Sempre um resultado consultivo — quem decide se atualiza o preço continua
// sendo o usuário.
// Provedores pela cadeia única de utils/ia.js (preferência do usuário: Claude
// Max pela assinatura → Claude pela API → Gemini com busca; IA_ORDEM troca).
// Resposta sem nenhuma oferta válida passa para o próximo provedor (o último é
// aceito mesmo vazio, como na 1.x). Cada provedor devolve o JSON de ofertas; o
// texto continua sendo gravado para a tela e o histórico.
// `prompt` e `chaveCache` permitem pesquisas com roteiro próprio (referência
// de mão de obra por segmento) no mesmo cache, histórico e ordem de provedores.
async function pesquisarPrecoMercado(descricao, { tipo = 'material', prompt: promptProprio, chaveCache } = {}) {
  const desc = (descricao || '').trim();
  if (!desc) throw new ErroPesquisaMercado('Informe a descrição do material a pesquisar', 400);

  if (!ia.disponivel({ web: true })) {
    throw new ErroPesquisaMercado('Pesquisa de mercado desativada — nenhuma IA disponível (Claude Code com a assinatura Max, GEMINI_API_KEY ou ANTHROPIC_API_KEY)', 422);
  }

  const normalizada = normalizarDescricao(chaveCache || `${tipo === 'servico' ? '[servico] ' : ''}${desc}`).slice(0, 500);
  // Cache é só otimização de custo — se a tabela falhar por qualquer motivo,
  // a pesquisa segue normalmente (não trava por causa disso).
  const emCache = await buscarCache(normalizada).catch(() => null);
  if (emCache) {
    const ofertas = emCache.ofertas || [];
    return { descricao: desc, resultado: emCache.resultado, fonte: emCache.fonte, deCache: true, pesquisadoEm: emCache.criado_em, ofertas, estatistica: estatistica(ofertas), precoSugerido: emCache.preco_sugerido != null ? Number(emCache.preco_sugerido) : null };
  }

  const prompt = promptProprio || montarPrompt(desc, tipo);
  let r;
  try {
    r = await ia.pesquisarWeb(prompt, {
      finalidade: 'pesquisa de mercado',
      aceitar: (json, { ultimo }) => ultimo || normalizarOfertas(json).length > 0,
    });
  } catch (err) {
    const detalhe = (err.erros || []).map(e => `${FONTE_CACHE[e.provedor] || e.provedor}: ${e.mensagem === 'resposta sem dado aproveitável' ? 'nenhuma oferta' : e.mensagem}`).join(' | ') || err.message;
    throw new ErroPesquisaMercado(`Não foi possível pesquisar o preço agora (${detalhe.slice(0, 300)})`, 502);
  }
  const fonte = FONTE_CACHE[r.provedor] || r.provedor;
  const json = r.json;
  const ofertas = normalizarOfertas(json);
  const est = estatistica(ofertas);
  const texto = textoDasOfertas(ofertas, est, json?.observacao ? String(json.observacao).slice(0, 300) : '');
  await salvarCache(desc.slice(0, 500), normalizada, texto, fonte, ofertas, est.media).catch(() => {});
  return { descricao: desc, resultado: texto, fonte, deCache: false, ofertas, estatistica: est, precoSugerido: est.media };
}

// Grava no sistema uma pesquisa de preço feita FORA da API paga — tipicamente
// uma busca que o Claude Desktop fez com a própria ferramenta de web (sem
// gastar cota do Gemini nem crédito do Claude via API). Vai para o histórico
// MARCADA como não verificada e fora do cache de 48h: antes qualquer texto
// gravado aqui virava, por 48 h, a "pesquisa de mercado" do botão da tela.
async function salvarPesquisaManual(descricao, resultado, fonte = 'claude_desktop') {
  const desc = String(descricao ?? '').trim();
  const texto = String(resultado ?? '').trim();
  if (!desc) throw new ErroPesquisaMercado('Informe a descrição do material pesquisado', 400);
  if (!texto) throw new ErroPesquisaMercado('Informe o resultado da pesquisa a salvar', 400);
  if (texto.length > TAMANHO_MAX_RESULTADO_MANUAL) throw new ErroPesquisaMercado(`Resultado longo demais (máximo ${TAMANHO_MAX_RESULTADO_MANUAL} caracteres)`, 400);

  // Coluna fonte é VARCHAR(20); descricao/descricao_normalizada são VARCHAR(500).
  // Fonte de pesquisa automática não pode ser usada aqui (entraria no cache).
  let fonteLimpa = (String(fonte || 'claude_desktop').trim() || 'claude_desktop').slice(0, 20);
  if (FONTES_AUTOMATICAS.includes(fonteLimpa.toLowerCase())) fonteLimpa = 'claude_desktop';
  const descCurta = desc.slice(0, 500);
  const normalizada = normalizarDescricao(descCurta).slice(0, 500);

  await salvarCache(descCurta, normalizada, `${MARCA_NAO_VERIFICADA}\n${texto}`, fonteLimpa);
  return { descricao: descCurta, fonte: fonteLimpa, salvo: true, verificada: false };
}

// Referência de mão de obra de um segmento ('publico' | 'privado'): média das
// referências equivalentes (mesmo_item), com as fontes e o 1º link
async function pesquisarReferenciaMaoDeObra(descricao, unidade, segmento) {
  if (!SEGMENTOS_MO[segmento]) throw new ErroPesquisaMercado('Segmento inválido (use publico ou privado)', 400);
  const r = await pesquisarPrecoMercado(descricao, {
    tipo: 'servico',
    prompt: promptServicoSegmento(descricao, unidade, segmento),
    // versão do roteiro na chave: roteiro novo não reaproveita pesquisa antiga do cache
    chaveCache: `[mo_${segmento} v2] ${descricao} /${unidade || ''}`,
  });
  const equivalentes = r.ofertas.filter(o => o.mesmo_item);
  return {
    ...r,
    segmento,
    valor: r.estatistica.media,
    fontes: [...new Set(equivalentes.map(o => o.fonte))].join('; ').slice(0, 300) || null,
    link: equivalentes.find(o => o.link)?.link || null,
  };
}

module.exports = { pesquisarPrecoMercado, pesquisarReferenciaMaoDeObra, salvarPesquisaManual, ErroPesquisaMercado, normalizarOfertas, estatistica, promptServicoSegmento, SEGMENTOS_MO, FONTES_AUTOMATICAS, MARCA_NAO_VERIFICADA };
