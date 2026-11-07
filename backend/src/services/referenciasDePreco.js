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
const { ehOrigemDaIA, idsComPrecoNaoConferido } = require('./catalogoMateriais');

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
      `SELECT ci.preco, ci.unidade, ci.data_cotacao, ci.origem, COALESCE(f.nome, f.cnpj) AS fornecedor FROM cotacoes_itens ci
         JOIN cotacao_fornecedores f ON f.cnpj = ci.fornecedor_cnpj
        WHERE ci.material_id = $1 AND ci.data_cotacao > CURRENT_DATE - $2::int ORDER BY ci.data_cotacao DESC LIMIT 4`,
      [m.material_id, DIAS_COTACAO]).catch(() => ({ rows: [] }));
    // cotação lida por IA (origem "…_ia") e preço do catálogo vindo dela: continuam na lista, MARCADOS — antes apareciam
    // como "Cotação — fornecedor" iguais às lidas sem IA (revisão do uso de IA de 06/11/2026)
    for (const c of cotacoes) {
      const daIA = ehOrigemDaIA(c.origem);
      ofertas.push({ fonte: `Cotação — ${String(c.fornecedor).slice(0, 60)}${daIA ? ' (lida por IA, conferir)' : ''}`, produto: m.descricao_catalogo, preco: r2(c.preco), link: null, mesmo_item: true, ...(daIA ? { lida_por_ia: true } : {}), observacao: `cotado em ${dataBr(c.data_cotacao)}${c.unidade ? ` (${c.unidade})` : ''}` });
    }
    const faixa = (await faixasPorMaterial([m.material_id], {}, db).catch(() => ({})))[String(m.material_id)];
    if (faixa) ofertas.push({ fonte: 'Vendido pela H&M', produto: m.descricao_catalogo, preco: faixa.mediana, link: null, mesmo_item: true, observacao: `mediana de ${faixa.propostas} proposta(s) aprovada(s); última ${moeda(faixa.ultimo)} em ${faixa.ultima_data}` });
    if (m.preco_catalogo > 0) {
      const daIA = (await idsComPrecoNaoConferido([m.material_id], db).catch(() => new Set())).has(Number(m.material_id));
      ofertas.push({ fonte: `Catálogo H&M${daIA ? ' (preço lido por IA, conferir)' : ''}`, produto: m.descricao_catalogo, preco: r2(m.preco_catalogo), link: null, mesmo_item: true, ...(daIA ? { lida_por_ia: true } : {}), observacao: `${m.origem === 'alias' ? 'vínculo aprendido nos orçamentos' : `semelhança ${m.confianca}%`}${m.unidade_catalogo ? ` · ${m.unidade_catalogo}` : ''}` });
    }
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

// ── Mão de obra (revisão do uso de IA de 06/11/2026) ─────────────────────────
// A referência de mercado de um serviço (tela Preços de Mão de Obra) ia SEMPRE para a web. Agora, antes dela:
//   1. o que a H&M já vendeu desse serviço nas propostas APROVADAS (item confirmado, mesmo código da base ou mesma
//      descrição e unidade), só de clientes do MESMO segmento (órgão público × particular) — mediana e última venda;
//   2. a SINAPI (composições da UF configurada) como indicação, fora da média: a composição costuma incluir material.
// → o mesmo formato de pesquisarReferenciaMaoDeObra (valor = mediana do vendido), ou null quando não há venda nenhuma
//   (aí vai para a web). Sem IA e sem internet.
const MAX_LINHAS_VENDIDAS = 200;
async function referenciasInternasMaoDeObra({ codigo, descricao, unidade }, segmento, { db = pool } = {}) {
  const { sqlNormalizar, chaveDescricao } = require('./precosVendidos');
  const { segmentoDoCliente } = require('./precosMaoDeObraReferencia');
  const chave = chaveDescricao(descricao, unidade);
  const { rows } = await db.query(
    `SELECT i.valor_unitario::float8 AS vu, p.numero, p.data, p.cliente_nome, c.tipo AS cliente_tipo
       FROM proposta_itens i
       JOIN propostas p ON p.id = i.proposta_id
       LEFT JOIN clientes c ON c.id = p.cliente_id
      WHERE p.status = 'Aprovada' AND i.valor_unitario > 0 AND COALESCE(i.status, 'confirmado') = 'confirmado'
        AND (($1::text IS NOT NULL AND i.codigo = $1)
             OR ${sqlNormalizar('i.descricao')} || '|' || ${sqlNormalizar('i.unidade')} = $2)
      ORDER BY p.data DESC, p.id DESC LIMIT ${MAX_LINHAS_VENDIDAS}`,
    [codigo || null, chave]).catch(() => ({ rows: [] }));
  const doSegmento = rows.filter(r => segmentoDoCliente(r.cliente_tipo, r.cliente_nome) === segmento);
  const ofertas = [];
  if (doSegmento.length) {
    const valores = doSegmento.map(r => r.vu).sort((a, b) => a - b);
    const meio = Math.floor(valores.length / 2);
    const mediana = r2(valores.length % 2 ? valores[meio] : (valores[meio - 1] + valores[meio]) / 2);
    const ultima = doSegmento[0];
    ofertas.push({ fonte: 'Vendido pela H&M', produto: String(descricao).slice(0, 200), preco: mediana, link: null, mesmo_item: true,
      observacao: `mediana de ${doSegmento.length} venda(s) em propostas aprovadas (${segmento === 'publico' ? 'órgãos públicos' : 'clientes particulares'}); última ${moeda(ultima.vu)} na ${ultima.numero}` });
  }
  if (!ofertas.length) return null; // sem venda do segmento: a SINAPI sozinha não decide (vai para a web)
  if (segmento === 'publico') {
    const sin = await sinapi.buscar(descricao, { tipo: 'composicoes', limite: 2, db }).catch(() => []);
    for (const s of sin) {
      ofertas.push({ fonte: `SINAPI ${s.uf} ${String(s.mes).trim()}`, produto: s.descricao.slice(0, 200), preco: r2(s.valor), link: null, mesmo_item: false,
        observacao: `composição ${s.codigo}${s.unidade ? ` (${s.unidade})` : ''} — inclui material? confira a parcela de mão de obra` });
    }
  }
  const validas = ofertas.filter(o => o.mesmo_item).map(o => o.preco);
  const estatistica = { media: r2(validas.reduce((s, p) => s + p, 0) / validas.length), minimo: Math.min(...validas), maximo: Math.max(...validas), n: validas.length };
  const resultado = ofertas.map(o => `• ${o.fonte}: ${moeda(o.preco)} — ${o.produto}${o.observacao ? ` — ${o.observacao}` : ''}`).join('\n');
  return {
    descricao, ofertas, estatistica, precoSugerido: estatistica.media, resultado, segmento, valor: estatistica.media,
    fontes: 'Vendido pela H&M (propostas aprovadas)', link: null,
    fonte: 'Referências da H&M (sem IA)', interna: true, deCache: true, pesquisadoEm: new Date().toISOString(),
  };
}

module.exports = { referenciasInternas, referenciasInternasMaoDeObra };
