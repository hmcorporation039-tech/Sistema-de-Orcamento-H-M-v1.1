// Preço pelas referências PRÓPRIAS antes da web (plano "sistema autônomo", 03/11/2026; o mesmo caminho dos sistemas de
// orçamento — base própria e SINAPI antes de pesquisar fora). Para a descrição de um material:
//   1. o material do catálogo (vínculo aprendido ou semelhança de texto com confiança de confirmação);
//   2. dele: as cotações de fornecedores dos últimos 180 dias, o que foi vendido nas propostas aprovadas e o preço
//      do catálogo;
//   3. a SINAPI da UF configurada (todas as palavras da descrição na descrição do insumo) — fica FORA da média:
//      a busca por palavras pode achar uma variação do item.
// → { ofertas, estatistica, precoSugerido, resultado } no formato da pesquisa de mercado, ou null quando não há
//   referência nenhuma (aí, sim, vai para a web). Sem IA e sem internet.
const pool = require('../config/database');
const { carregarCatalogo } = require('./aprendizadoMateriais');
const { compararComCatalogo, CONFIANCA_CONFIRMA } = require('../utils/semelhancaMateriais');
const { faixasPorMaterial } = require('./precosVendidos');
const sinapi = require('./sinapi');

const DIAS_COTACAO = 180;
const r2 = (v) => Math.round(Number(v) * 100) / 100;
const dataBr = (d) => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const moeda = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

async function referenciasInternas(descricao, { db = pool } = {}) {
  const ofertas = [];
  const catalogo = await carregarCatalogo(db);
  const m = compararComCatalogo(descricao, catalogo);
  if (m && m.confianca >= CONFIANCA_CONFIRMA) {
    const { rows: cotacoes } = await db.query(
      `SELECT ci.preco, ci.unidade, ci.data_cotacao, COALESCE(f.nome, f.cnpj) AS fornecedor FROM cotacoes_itens ci
         JOIN cotacao_fornecedores f ON f.cnpj = ci.fornecedor_cnpj
        WHERE ci.material_id = $1 AND ci.data_cotacao > CURRENT_DATE - $2::int ORDER BY ci.data_cotacao DESC LIMIT 4`,
      [m.material_id, DIAS_COTACAO]).catch(() => ({ rows: [] }));
    for (const c of cotacoes) {
      ofertas.push({ fonte: `Cotação — ${String(c.fornecedor).slice(0, 60)}`, produto: m.descricao_catalogo, preco: r2(c.preco), link: null, mesmo_item: true, observacao: `cotado em ${dataBr(c.data_cotacao)}${c.unidade ? ` (${c.unidade})` : ''}` });
    }
    const faixa = (await faixasPorMaterial([m.material_id], {}, db).catch(() => ({})))[String(m.material_id)];
    if (faixa) ofertas.push({ fonte: 'Vendido pela H&M', produto: m.descricao_catalogo, preco: faixa.mediana, link: null, mesmo_item: true, observacao: `mediana de ${faixa.propostas} proposta(s) aprovada(s); última ${moeda(faixa.ultimo)} em ${faixa.ultima_data}` });
    if (m.preco_catalogo > 0) ofertas.push({ fonte: 'Catálogo H&M', produto: m.descricao_catalogo, preco: r2(m.preco_catalogo), link: null, mesmo_item: true, observacao: `${m.origem === 'alias' ? 'vínculo aprendido nos orçamentos' : `semelhança ${m.confianca}%`}${m.unidade_catalogo ? ` · ${m.unidade_catalogo}` : ''}` });
  }
  const sin = await sinapi.buscar(descricao, { limite: 2, db }).catch(() => []);
  for (const s of sin) {
    ofertas.push({ fonte: `SINAPI ${s.uf} ${String(s.mes).trim()}`, produto: s.descricao.slice(0, 200), preco: r2(s.valor), link: null, mesmo_item: false, observacao: `código ${s.codigo}${s.unidade ? ` (${s.unidade})` : ''} — confira se é o mesmo item` });
  }
  if (!ofertas.length) return null;
  const validas = ofertas.filter(o => o.mesmo_item).map(o => o.preco);
  const estatistica = validas.length
    ? { media: r2(validas.reduce((s, p) => s + p, 0) / validas.length), minimo: Math.min(...validas), maximo: Math.max(...validas), n: validas.length }
    : { media: null, minimo: null, maximo: null, n: 0 };
  const resultado = ofertas.map(o => `• ${o.fonte}: ${moeda(o.preco)} — ${o.produto}${o.observacao ? ` — ${o.observacao}` : ''}`).join('\n');
  return { ofertas: ofertas.slice(0, 6), estatistica, precoSugerido: estatistica.media, resultado };
}

module.exports = { referenciasInternas };
