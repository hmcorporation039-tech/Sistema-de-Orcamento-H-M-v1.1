// Composições e kits (versão 2.0, Fase 3H) — regras puras, sem banco.
//
// Uma composição (custo unitário) junta materiais do catálogo e serviços da
// base única de mão de obra com coeficientes. Ex.: "Ponto de tomada baixa
// completo" = caixa 4×2 (1 un) + eletroduto 3/4" (3 m) + cabo 2,5 mm² (9 m) +
// tomada 2P+T (1 un) + "Instalação de tomada baixa" (1 un).
//
// Regras de custo (calcularCusto):
//   material  → coeficiente × preço ATUAL do catálogo (materiais.preco). Sem
//               catálogo, com o material desativado, com preço zero ou com
//               unidade incompatível com a do item, o item fica "a cotar"
//               (preço nulo) — nunca se inventa preço. Única conversão:
//               item em METRO e material em rolo/caixa (RL/CX) com a
//               metragem ESCRITA na descrição ("100MT", "ROLO 100M", "CX
//               305M", "caixa com 305 metros") → preço do catálogo ÷ metragem,
//               mostrado como "convertido de RL 100 m". Sem metragem clara
//               (nenhuma ou duas diferentes), continua "a cotar";
//   serviço   → coeficiente × preço sugerido do SEGMENTO (valorSugerido: valor
//               adotado pela H&M, se houver; senão a referência oficial para
//               órgão público ou a particular para os demais). Serviço livre
//               fundido em outro segue a fusão (resolverCodigo);
//   custo unitário = soma das linhas com preço; `completo` = nenhuma "a cotar".
// Cada linha é arredondada a 2 casas e o total soma as linhas já arredondadas
// (a tela fecha no centavo com o que mostra).
//
// "Explodir" (explodirComposicao): composição × quantidade → itens prontos para
// a proposta (seção, subgrupo = disciplina, descrição, quantidade = coef × qtd,
// unidade, valor unitário, código do serviço, material_id). A proposta não
// guarda a composição: os itens entram como itens comuns.
const { valorSugerido, ITENS_REFERENCIA } = require('./precosMaoDeObraReferencia');
const { resolverCodigo, DISCIPLINA_OUTROS } = require('./servicosBase');
const DISC = require('../config/caminhos').registroDisciplinas();

const SECAO_MATERIAIS = 'Materiais e Equipamentos';
const SECAO_SERVICOS = 'Serviços (Mão de Obra)';
const SEGMENTOS = ['publico', 'privado'];
const MAX_ITENS = 80;
const MAX_COEFICIENTE = 1e6;
const MAX_QUANTIDADE = 1e6;

const DISCIPLINAS = [...new Set([...ITENS_REFERENCIA.map(i => i.disciplina), DISCIPLINA_OUTROS])];

const arred2 = (v) => Math.round(((Number(v) || 0) + Number.EPSILON) * 100) / 100;
const arred3 = (v) => Math.round(((Number(v) || 0) + Number.EPSILON) * 1000) / 1000;
const numOuNulo = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const segmentoValido = (s) => (s === 'publico' ? 'publico' : 'privado');

// ── Unidades ────────────────────────────────────────────────────────────
// Só para saber se o preço do catálogo vale para a unidade do item: "UND",
// "un", "pç" são a mesma coisa; "RL" (rolo de 100 m) não é "m".
const SINONIMOS_UNIDADE = {
  un: ['un', 'und', 'unid', 'unidade', 'unidades', 'pc', 'pç', 'pç.', 'peca', 'peça', 'pecas', 'peças', 'u'],
  m: ['m', 'mt', 'mts', 'metro', 'metros', 'ml'],
  cx: ['cx', 'caixa'],
  rl: ['rl', 'rolo', 'bob', 'bobina'],
  pct: ['pct', 'pacote', 'pc.'],
  par: ['par', 'pares'],
  kg: ['kg'],
  m2: ['m2', 'm²'],
  pt: ['pt', 'ponto', 'pto'],
  vb: ['vb', 'verba'],
  cj: ['cj', 'conj', 'conjunto', 'kit', 'jg', 'jogo'],
};
const MAPA_UNIDADE = new Map(Object.entries(SINONIMOS_UNIDADE).flatMap(([base, lista]) => lista.map(u => [u, base])));
function normalizarUnidade(u) {
  const t = String(u || '').trim().toLowerCase();
  return MAPA_UNIDADE.get(t) || t;
}
const unidadesCompativeis = (a, b) => normalizarUnidade(a) === normalizarUnidade(b);

// ── Rolo/caixa com metragem → metro ─────────────────────────────────────
// Cabos, eletrodutos e Cat6 estão no catálogo por rolo ou caixa e o kit conta
// em metro. Só converte quando a metragem está escrita na descrição: um
// número seguido de m / mt / mts / metro(s) — "100MT", "RL 100 m", "CX0305M",
// "25X50MT" (25 mm × 50 m), "caixa com 305 metros". "2,5MM" (milímetro) e
// "m²" não contam. Duas metragens diferentes = ambíguo = sem conversão.
const UNIDADES_EMBALAGEM = new Set(['rl', 'cx']);
const RE_METRAGEM = /(\d+(?:[.,]\d+)?)\s*(?:metros?|mts?|m)(?![a-z0-9²³])/gi;
const METRAGEM_MIN = 1;
const METRAGEM_MAX = 10000;
function metragemDaDescricao(descricao) {
  const achadas = new Set();
  for (const m of String(descricao || '').matchAll(RE_METRAGEM)) {
    // começo no meio de um número ("1.250M" lido a partir do "250") não vale
    const antes = m.index > 0 ? m.input[m.index - 1] : '';
    if (antes && /[\d.,]/.test(antes)) continue;
    achadas.add(Number(m[1].replace(',', '.')));
  }
  if (achadas.size !== 1) return null;
  const [metros] = achadas;
  return Number.isFinite(metros) && metros >= METRAGEM_MIN && metros <= METRAGEM_MAX ? metros : null;
}
// a descrição sem a metragem (ela é da embalagem, não do produto): para as
// medidas e a comparação de palavras do casamento com o catálogo
const semMetragem = (descricao) => String(descricao || '').replace(RE_METRAGEM, (txt, n, pos, s) => {
  const antes = pos > 0 ? s[pos - 1] : '';
  return antes && /[\d.,]/.test(antes) ? txt : ' ';
});
const numeroBR = (n) => String(n).replace('.', ',');
// material do catálogo { unidade, descricao } × unidade do item → { metros,
// unidade_catalogo, texto } quando dá para contar em metro; senão null
function conversaoEmbalagem(material, unidadeItem) {
  if (!material || normalizarUnidade(unidadeItem) !== 'm') return null;
  if (!UNIDADES_EMBALAGEM.has(normalizarUnidade(material.unidade))) return null;
  const metros = metragemDaDescricao(material.descricao);
  if (!metros) return null;
  const unidade = String(material.unidade || '').trim().toUpperCase();
  return { metros, unidade_catalogo: unidade, texto: `convertido de ${unidade} ${numeroBR(metros)} m` };
}

// ── Subgrupo do item na proposta ────────────────────────────────────────
// Materiais: o nome da categoria do catálogo daquela disciplina (a tela de
// orçamento usa o subgrupo das seções de materiais como "Categoria").
// Serviços: o nome de subgrupo que utils/servicosBase.js reconhece de volta
// como a mesma disciplina ao salvar a proposta (SUBGRUPO_PARA_DISCIPLINA).
// Todos os itens de um kit ficam no mesmo subgrupo de cada seção — o editor
// agrupa por subgrupo e o kit não se espalha pela proposta.
// (subgrupos e siglas: registro único skills/_comum/disciplinas.js)
const SUBGRUPO_MATERIAL = DISC.mapa(d => d.subgrupo.material, { comOutros: true });
const SUBGRUPO_SERVICO = DISC.mapa(d => d.subgrupo.servico, { comOutros: true });
const subgrupoDoItem = (tipo, disciplina) => (tipo === 'servico' ? SUBGRUPO_SERVICO : SUBGRUPO_MATERIAL)[disciplina || DISCIPLINA_OUTROS] || 'Outros';

// ── Código da composição ────────────────────────────────────────────────
const SIGLA_DISCIPLINA = DISC.mapa(d => d.sigla, { comOutros: true });
const RE_CODIGO = /^[A-Z0-9][A-Z0-9._-]{1,29}$/;
const normalizarCodigo = (c) => String(c || '').trim().toUpperCase().replace(/\s+/g, '-');
// próximo código livre KIT-<SIGLA>-NN, dados os códigos já usados
function proximoCodigo(disciplina, existentes = []) {
  const prefixo = `KIT-${SIGLA_DISCIPLINA[disciplina] || 'OUT'}-`;
  let maior = 0;
  for (const c of existentes) {
    const m = String(c || '').toUpperCase().startsWith(prefixo) ? /^(\d+)$/.exec(String(c).slice(prefixo.length)) : null;
    if (m) maior = Math.max(maior, Number(m[1]));
  }
  return `${prefixo}${String(maior + 1).padStart(2, '0')}`;
}

// ── Validação do que chega da tela ──────────────────────────────────────
const texto = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

// Valida e normaliza o corpo de criar/editar. Devolve { erro } ou { dados }.
// Não confere a existência de material/serviço (isso é do controller, com banco).
function validarComposicao(corpo, { parcial = false } = {}) {
  const c = corpo || {};
  const dados = {};
  if (!parcial || 'descricao' in c) {
    dados.descricao = texto(c.descricao, 300);
    if (!dados.descricao) return { erro: 'Informe a descrição da composição' };
  }
  if (!parcial || 'unidade' in c) {
    dados.unidade = texto(c.unidade, 10) || 'un';
  }
  if (!parcial || 'disciplina' in c) {
    dados.disciplina = texto(c.disciplina, 30) || DISCIPLINA_OUTROS;
    if (!DISCIPLINAS.includes(dados.disciplina)) return { erro: 'Disciplina inválida' };
  }
  if ('observacao' in c) dados.observacao = texto(c.observacao, 2000) || null;
  if ('codigo' in c && c.codigo != null && String(c.codigo).trim() !== '') {
    dados.codigo = normalizarCodigo(c.codigo);
    if (!RE_CODIGO.test(dados.codigo)) return { erro: 'Código inválido: use de 2 a 30 letras, números, ponto, hífen ou sublinhado' };
  }
  if (!parcial || 'itens' in c) {
    if (!Array.isArray(c.itens)) return { erro: 'Envie a lista de itens da composição' };
    if (c.itens.length > MAX_ITENS) return { erro: `No máximo ${MAX_ITENS} itens por composição` };
    const itens = [];
    for (const [i, it] of c.itens.entries()) {
      const n = i + 1;
      const tipo = it?.tipo;
      if (tipo !== 'material' && tipo !== 'servico') return { erro: `Item ${n}: tipo deve ser "material" ou "servico"` };
      const coeficiente = Number(it.coeficiente);
      if (!Number.isFinite(coeficiente) || coeficiente <= 0 || coeficiente > MAX_COEFICIENTE) {
        return { erro: `Item ${n}: coeficiente deve ser um número maior que zero` };
      }
      const material_id = tipo === 'material' && it.material_id != null && it.material_id !== '' ? Number(it.material_id) : null;
      if (material_id != null && !(Number.isInteger(material_id) && material_id > 0)) return { erro: `Item ${n}: material inválido` };
      const servico_codigo = tipo === 'servico' && it.servico_codigo ? texto(it.servico_codigo, 50) : null;
      const descricao = texto(it.descricao, 300);
      // sem vínculo, a descrição é o próprio item ("material sem catálogo")
      if (!material_id && !servico_codigo && !descricao) return { erro: `Item ${n}: informe a descrição ou escolha do catálogo/da base de serviços` };
      itens.push({ tipo, material_id, servico_codigo, coeficiente: Math.round(coeficiente * 10000) / 10000, descricao, unidade: texto(it.unidade, 10) || 'un' });
    }
    dados.itens = itens;
  }
  return { dados };
}

// ── Custo ───────────────────────────────────────────────────────────────
// itens: [{ tipo, material_id, servico_codigo, coeficiente, descricao, unidade }]
// materiais: { [id]: { id, descricao, unidade, preco, ativo, categoria, codigo, ncm } }
// servicos:  { [codigo]: { codigo, descricao, unidade, ativo, fundido_em,
//              valor_referencia, valor_publico, valor_privado } }
function precoDoItem(it, { materiais = {}, servicos = {} }, segmento) {
  if (it.tipo === 'material') {
    if (!it.material_id) return { a_cotar: true, motivo: 'Material sem catálogo — a cotar' };
    const m = materiais[it.material_id];
    if (!m) return { a_cotar: true, motivo: 'Material não está mais no catálogo — a cotar' };
    const atual = { descricao_atual: m.descricao, unidade_atual: m.unidade, categoria: m.categoria || null, ncm: m.ncm || null, codigo_material: m.codigo || null };
    if (m.ativo === false) return { ...atual, a_cotar: true, motivo: 'Material removido do catálogo — a cotar' };
    atual.vinculo_ativo = true;
    // rolo/caixa com metragem escrita: a tela do kit oferece contar em metro
    atual.embalagem_metros = UNIDADES_EMBALAGEM.has(normalizarUnidade(m.unidade)) ? metragemDaDescricao(m.descricao) : null;
    let conversao = null;
    if (!unidadesCompativeis(m.unidade, it.unidade)) {
      conversao = conversaoEmbalagem(m, it.unidade);
      if (!conversao) {
        const semMetragemEscrita = normalizarUnidade(it.unidade) === 'm' && UNIDADES_EMBALAGEM.has(normalizarUnidade(m.unidade));
        return {
          ...atual, a_cotar: true,
          motivo: semMetragemEscrita
            ? `Unidade do catálogo (${m.unidade}) diferente da do item (${it.unidade}) e sem a metragem na descrição do material — a cotar`
            : `Unidade do catálogo (${m.unidade}) diferente da do item (${it.unidade}) — confira o coeficiente`,
        };
      }
    }
    const preco = numOuNulo(m.preco);
    if (!(preco > 0)) return { ...atual, a_cotar: true, motivo: 'Material sem preço no catálogo — a cotar' };
    if (conversao) {
      return {
        ...atual, preco_unitario: preco / conversao.metros, fonte_preco: 'catalogo',
        conversao: { ...conversao, preco_embalagem: preco }, observacao_preco: conversao.texto,
      };
    }
    return { ...atual, preco_unitario: preco, fonte_preco: 'catalogo' };
  }
  if (!it.servico_codigo) return { a_cotar: true, motivo: 'Serviço fora da base — a cotar' };
  const porCodigo = new Map(Object.entries(servicos));
  const srv = resolverCodigo(porCodigo, it.servico_codigo);
  if (!srv) return { a_cotar: true, motivo: 'Serviço não está mais na base — a cotar' };
  const atual = { descricao_atual: srv.descricao, unidade_atual: srv.unidade, servico_codigo_final: srv.codigo, vinculo_ativo: true };
  const ref = { hm: numOuNulo(srv.valor_referencia), publico: numOuNulo(srv.valor_publico), privado: numOuNulo(srv.valor_privado) };
  const preco = valorSugerido(ref, segmento);
  if (!(preco > 0)) return { ...atual, a_cotar: true, motivo: 'Serviço sem valor H&M nem referência do segmento — a cotar' };
  return { ...atual, preco_unitario: preco, fonte_preco: ref.hm != null ? 'hm' : `referencia_${segmento}` };
}

function calcularCusto(itens, bases, segmento = 'privado') {
  const seg = segmentoValido(segmento);
  let total = 0;
  let aCotar = 0;
  const linhas = (itens || []).map((it, i) => {
    const p = precoDoItem(it, bases || {}, seg);
    const coef = Number(it.coeficiente) || 0;
    // unitário a 2 casas, como a proposta (calculoProposta) — a linha fecha com o que for inserido
    const preco = p.preco_unitario != null ? arred2(p.preco_unitario) : null;
    const custo = preco != null ? arred2(coef * preco) : null;
    if (custo != null) total += custo; else aCotar++;
    return {
      ordem: i, tipo: it.tipo, material_id: it.material_id || null, servico_codigo: it.servico_codigo || null,
      coeficiente: coef, descricao: p.descricao_atual || it.descricao, unidade: it.unidade,
      descricao_copia: it.descricao, categoria: p.categoria || null, ncm: p.ncm || null, codigo_material: p.codigo_material || null,
      servico_codigo_final: p.servico_codigo_final || it.servico_codigo || null,
      preco_unitario: preco, custo, fonte_preco: p.fonte_preco || null,
      a_cotar: !!p.a_cotar, motivo: p.motivo || null, vinculo_ativo: !!p.vinculo_ativo,
      // rolo/caixa contado em metro: { metros, unidade_catalogo, texto, preco_embalagem }
      conversao: p.conversao || null, observacao_preco: p.observacao_preco || null,
      unidade_catalogo: p.unidade_atual || null, embalagem_metros: p.embalagem_metros || null,
    };
  });
  return { segmento: seg, itens: linhas, custo_unitario: arred2(total), itens_a_cotar: aCotar, completo: aCotar === 0 };
}

// custo nos dois segmentos (a tela mostra lado a lado)
function calcularCustoNosSegmentos(itens, bases) {
  return Object.fromEntries(SEGMENTOS.map(s => [s, calcularCusto(itens, bases, s)]));
}

// ── Explodir no orçamento ───────────────────────────────────────────────
// composicao: { codigo, descricao, disciplina, itens }; custo: calcularCusto(...)
// Devolve os itens da proposta. status: 'confirmado' só com preço fechado
// (catálogo ou valor adotado pela H&M); referência de mercado e item sem preço
// entram "a_cotar" (mesma regra do gerar orçamento dos laudos).
function explodirComposicao(composicao, custo, quantidade) {
  const qtd = Number(quantidade);
  if (!Number.isFinite(qtd) || qtd <= 0 || qtd > MAX_QUANTIDADE) return { erro: 'Quantidade deve ser um número maior que zero' };
  const itens = custo.itens.map(l => {
    const ehServico = l.tipo === 'servico';
    const quantidadeItem = arred3(l.coeficiente * qtd);
    const valor = l.preco_unitario != null ? arred2(l.preco_unitario) : 0;
    const fechado = l.fonte_preco === 'catalogo' || l.fonte_preco === 'hm';
    return {
      secao: ehServico ? SECAO_SERVICOS : SECAO_MATERIAIS,
      tipo: l.tipo,
      subgrupo: subgrupoDoItem(l.tipo, composicao.disciplina),
      descricao: l.descricao,
      quantidade: quantidadeItem,
      unidade: l.unidade,
      valor_unitario: valor,
      valor_total: arred2(quantidadeItem * valor),
      codigo: l.vinculo_ativo ? (ehServico ? l.servico_codigo_final : l.codigo_material) || null : null,
      // só liga ao catálogo/à base o que ainda existe lá (ativo)
      material_id: !ehServico && l.vinculo_ativo ? l.material_id : null,
      ncm: l.ncm || null,
      status: fechado && quantidadeItem > 0 ? 'confirmado' : 'a_cotar',
      a_cotar: l.a_cotar,
      motivo: l.motivo,
      fonte_preco: l.fonte_preco,
      observacao_preco: l.observacao_preco || null, // "convertido de RL 100 m"
      origem: composicao.codigo,
    };
  });
  return {
    composicao: { codigo: composicao.codigo, descricao: composicao.descricao, unidade: composicao.unidade, disciplina: composicao.disciplina },
    quantidade: qtd,
    segmento: custo.segmento,
    custo_unitario: custo.custo_unitario,
    total: arred2(itens.reduce((s, it) => s + it.valor_total, 0)),
    itens_a_cotar: itens.filter(it => it.a_cotar).length,
    itens,
  };
}

// ── Casamento com o catálogo (kits-modelo) ──────────────────────────────
// compararComCatalogo (Jaccard ≥ 45%) ignora palavras de até 2 letras — e com
// elas os números: "Disjuntor 2P 40 A curva C" e "Disjuntor 1P 10 A curva C"
// dariam 100%. Aqui, antes de comparar, o catálogo é filtrado para os itens
// (1) com unidade compatível com a do item do kit e (2) cujas medidas
// contenham TODAS as medidas do termo (2,5 mm², 3/4", 40 A, Cat6, 4×2…;
// números de norma — NBR 14136 — não contam). Prefere o material com preço.
// Item em metro também casa com rolo/caixa que tem a metragem escrita
// (conversaoEmbalagem); nesse caso a metragem sai da descrição antes das
// medidas e da comparação ("ELETRODUTO CORRUGADO 32X25MT" é de 32 mm, não de
// 25 mm). Ordem de preferência: mesma unidade com preço → rolo/caixa com
// preço → mesma unidade sem preço → rolo/caixa sem preço. O resultado traz
// `conversao` (ou null): quem grava o item mantém a unidade do item (m).
function medidas(descricao) {
  let resto = String(descricao || '').replace(/\b(NBR|NM|IEC|EN|ISO|NR)\s*[-\d.\s/]*\d/gi, ' ');
  const achadas = new Set();
  // fração de polegada (3/4, 1/2, 5/8): numerador menor que o denominador e
  // denominador 2, 4, 8, 16, 32 ou 64; "450/750 V" e "57500/041" viram números soltos
  resto = resto.replace(/(\d{1,2})\/(\d{1,2})(?!\d)/g, (txt, a, b) => {
    if (Number(a) < Number(b) && [2, 4, 8, 16, 32, 64].includes(Number(b))) {
      achadas.add(`${Number(a)}/${Number(b)}`);
      return ' ';
    }
    return txt.replace('/', ' ');
  });
  for (const n of resto.match(/\d+(?:[.,]\d+)?/g) || []) achadas.add(String(Number(n.replace(',', '.'))));
  return achadas;
}
function casarComCatalogo(item, catalogo, comparar) {
  const termos = [item.descricao, ...(item.busca || [])].filter(Boolean);
  // candidatos possíveis pela unidade (a metragem é da embalagem: sai da descrição)
  const porUnidade = [];
  for (const m of catalogo) {
    if (unidadesCompativeis(m.unidade, item.unidade)) { porUnidade.push({ m, conversao: null, descricao: m.descricao }); continue; }
    const conversao = conversaoEmbalagem(m, item.unidade);
    if (conversao) porUnidade.push({ m, conversao, descricao: semMetragem(m.descricao).replace(/\s+/g, ' ').trim() });
  }
  let melhor = null;
  for (const termo of termos) {
    const precisa = medidas(termo);
    const candidatos = porUnidade.filter(c => {
      const tem = medidas(c.descricao);
      return [...precisa].every(n => tem.has(n));
    });
    const comPreco = (c) => Number(c.m.preco) > 0;
    // grupos em ordem de preferência; vale o primeiro que casar
    const grupos = [
      [3000, candidatos.filter(c => !c.conversao && comPreco(c))],
      [2000, candidatos.filter(c => c.conversao && comPreco(c))],
      [1000, candidatos.filter(c => !c.conversao && !comPreco(c))],
      [0, candidatos.filter(c => c.conversao && !comPreco(c))],
    ];
    for (const [bonus, grupo] of grupos) {
      if (!grupo.length) continue;
      // compara pela descrição sem a metragem; devolve o material como está no catálogo
      const achado = comparar(termo, grupo.map(c => ({ ...c.m, descricao: c.descricao })));
      if (!achado) continue;
      const c = grupo.find(x => x.m.id === achado.material_id);
      const pontos = achado.confianca + bonus;
      if (!melhor || pontos > melhor.pontos) {
        melhor = { ...achado, descricao_catalogo: c.m.descricao, conversao: c.conversao, termo, pontos };
      }
      break;
    }
  }
  if (!melhor) return null;
  const { pontos, ...resto } = melhor;
  return resto;
}

// ── Kits-modelo (seed da migração 2.0-08) ───────────────────────────────
// Coeficientes de referência para um ponto médio — ajuste ao projeto. Cada
// material traz termos de busca alternativos para casar com o catálogo; o
// que não casar entra como "material sem catálogo" (a cotar). Nenhum preço
// é gravado aqui: o custo vem sempre do catálogo e da base de serviços.
const CAIXA_4X2 = { tipo: 'material', descricao: 'Caixa de embutir 4×2" em PVC (alvenaria)', unidade: 'un', busca: ['Caixa 4x2 amarela', 'Caixa de embutir 4x2'] };
const ELETRODUTO_3_4 = { tipo: 'material', descricao: 'Eletroduto corrugado flexível PVC 3/4" (25 mm)', unidade: 'm', busca: ['Eletroduto corrugado 3/4', 'Eletroduto corrugado 25 mm'] };
const CABO_2_5 = { tipo: 'material', descricao: 'Cabo de cobre flexível 2,5 mm² 750 V', unidade: 'm', busca: ['Cabo flexível 2,5 mm 750 V', 'Cabo de cobre flexível 2,5 mm²', 'Cabo flexível 2,5MM 750V'] };
const TOMADA_10A = { tipo: 'material', descricao: 'Tomada 2P+T 10 A (padrão NBR 14136) com placa', unidade: 'un', busca: ['Tomada 2P+T 10 A com placa'] };
const CABO_CAT6 = { tipo: 'material', descricao: 'Cabo U/UTP Cat6 4 pares 24 AWG', unidade: 'm', busca: ['Cabo UTP Cat.6 4 pares 24 AWG', 'Cabo U/UTP Cat.6 24 AWGx4P'] };
const mat = (base, coeficiente) => ({ ...base, coeficiente });
const srv = (servico_codigo, coeficiente) => ({ tipo: 'servico', servico_codigo, coeficiente });

const OBS_PONTO = 'Kit-modelo da H&M: coeficientes para um ponto médio (descida de 3 m do forro/laje). Ajuste ao projeto.';
const KITS_MODELO = [
  {
    codigo: 'KIT-ELE-01', disciplina: 'eletrica', unidade: 'pt',
    descricao: 'Ponto de tomada baixa completo (embutido em alvenaria)', observacao: OBS_PONTO,
    itens: [mat(CAIXA_4X2, 1), mat(ELETRODUTO_3_4, 3), mat(CABO_2_5, 9), mat(TOMADA_10A, 1), srv('ele_tomada_baixa', 1)],
  },
  {
    codigo: 'KIT-ELE-02', disciplina: 'eletrica', unidade: 'pt',
    descricao: 'Ponto de tomada média completo (embutido em alvenaria)', observacao: OBS_PONTO,
    itens: [mat(CAIXA_4X2, 1), mat(ELETRODUTO_3_4, 3), mat(CABO_2_5, 9), mat(TOMADA_10A, 1), srv('ele_tomada_media', 1)],
  },
  {
    codigo: 'KIT-ELE-03', disciplina: 'eletrica', unidade: 'pt',
    descricao: 'Ponto de tomada alta completo (embutido em alvenaria)',
    observacao: 'Kit-modelo da H&M: tomada a 1,80 m, descida de 2 m do forro/laje. Ajuste ao projeto.',
    itens: [mat(CAIXA_4X2, 1), mat(ELETRODUTO_3_4, 2), mat(CABO_2_5, 6), mat(TOMADA_10A, 1), srv('ele_tomada_alta', 1)],
  },
  {
    codigo: 'KIT-ELE-04', disciplina: 'eletrica', unidade: 'pt',
    descricao: 'Ponto de luz no teto com interruptor simples (embutido)',
    observacao: 'Kit-modelo da H&M: caixa octogonal no teto, interruptor a 1,10 m, circuito em 1,5 mm² (fase, neutro, retorno e terra). Ajuste ao projeto.',
    itens: [
      mat({ tipo: 'material', descricao: 'Caixa octogonal 4×4" de embutir para laje', unidade: 'un', busca: ['Caixa octogonal 4x4'] }, 1),
      mat(CAIXA_4X2, 1),
      mat(ELETRODUTO_3_4, 5),
      mat({ tipo: 'material', descricao: 'Cabo de cobre flexível 1,5 mm² 750 V', unidade: 'm', busca: ['Cabo flexível 1,5 mm 750 V', 'Cabo de cobre flexível 1,5 mm²', 'Cabo flexível 1,5MM 750V'] }, 15),
      mat({ tipo: 'material', descricao: 'Interruptor simples 10 A com placa', unidade: 'un', busca: ['Interruptor simples com placa'] }, 1),
      srv('ele_ponto_energia', 1),
      srv('ele_interruptor', 1),
    ],
  },
  {
    codigo: 'KIT-ELE-05', disciplina: 'eletrica', unidade: 'cj',
    descricao: 'Circuito de chuveiro elétrico 220 V até 7.500 W (disjuntor + DR + cabo 6 mm²)',
    observacao: 'Kit-modelo da H&M: circuito exclusivo de 15 m do quadro até o chuveiro, cabo 6 mm² (fase, neutro e terra), disjuntor 40 A e DR 30 mA (NBR 5410, local com banheira/chuveiro). Confira a potência do chuveiro e a distância no projeto.',
    itens: [
      mat({ tipo: 'material', descricao: 'Disjuntor termomagnético 40 A curva C', unidade: 'un', busca: ['Disjuntor 40 A curva C'] }, 1),
      mat({ tipo: 'material', descricao: 'Interruptor diferencial residual (DR) 40 A 30 mA', unidade: 'un', busca: ['DR 40 A 30 mA'] }, 1),
      mat({ tipo: 'material', descricao: 'Cabo de cobre flexível 6 mm² 750 V', unidade: 'm', busca: ['Cabo flexível 6,0 mm 750 V', 'Cabo de cobre flexível 6 mm²', 'Cabo flexível 6,0MM 750V'] }, 45),
      mat(ELETRODUTO_3_4, 15),
      mat(CAIXA_4X2, 1),
      srv('ele_disjuntores', 2),
      srv('ele_ponto_energia', 1),
      srv('ele_ensaio_isolamento', 1),
    ],
  },
  {
    codigo: 'KIT-REDE-01', disciplina: 'rede', unidade: 'pt',
    descricao: 'Ponto de rede Cat6 completo (keystone, espelho, patch cords e certificação)',
    observacao: 'Kit-modelo da H&M: 30 m de cabo por ponto (média; máximo de 90 m do enlace permanente pela NBR 14565). A porta do patch panel e a infraestrutura de prumada entram à parte. Ajuste ao projeto.',
    itens: [
      mat(CABO_CAT6, 30),
      mat({ tipo: 'material', descricao: 'Conector RJ-45 fêmea Cat6 (keystone jack)', unidade: 'un', busca: ['Conector RJ-45 fêmea 180° Cat.6 keystone jack', 'Keystone jack RJ-45 Cat.6'] }, 1),
      mat({ tipo: 'material', descricao: 'Espelho 4×2" para 1 ou 2 keystones', unidade: 'un', busca: ['Placa 4x2 para keystone', 'Espelho 4x2 RJ45'] }, 1),
      mat(CAIXA_4X2, 1),
      mat({ tipo: 'material', descricao: 'Patch cord U/UTP Cat6 1,5 m', unidade: 'un', busca: ['Patch cord Cat.6 1,5 m', 'Patch cord RJ-45 Cat.6 1,50 m'] }, 2),
      srv('rede_ponto', 1),
      srv('cab_certificacao', 1),
    ],
  },
  {
    codigo: 'KIT-CFTV-01', disciplina: 'cftv', unidade: 'pt',
    descricao: 'Ponto de câmera IP interna (dome PoE, cabo Cat6 e conectorização)',
    observacao: 'Kit-modelo da H&M: câmera dome IP interna com PoE, 30 m de cabo até o rack. Gravador, switch PoE e nobreak entram à parte. Ajuste ao projeto.',
    itens: [
      mat({ tipo: 'material', descricao: 'Câmera IP dome interna 2 MP PoE', unidade: 'un', busca: ['Câmera IP dome interna', 'Câmera IP dome 2MP'] }, 1),
      mat(CABO_CAT6, 30),
      mat({ tipo: 'material', descricao: 'Conector RJ-45 macho Cat6 (plug) para terminação de câmeras', unidade: 'un', busca: ['Plug RJ-45 Cat.6 terminação de câmeras'] }, 2),
      mat({ tipo: 'material', descricao: 'Patch cord U/UTP Cat6 1,5 m', unidade: 'un', busca: ['Patch cord Cat.6 1,5 m', 'Patch cord RJ-45 Cat.6 1,50 m'] }, 1),
      srv('cftv_camera_interna', 1),
      srv('cftv_ponto', 1),
    ],
  },
  {
    codigo: 'KIT-ALM-01', disciplina: 'alarme', unidade: 'pt',
    descricao: 'Ponto de sensor magnético de abertura (porta/janela)',
    observacao: 'Kit-modelo da H&M: sensor com fio até a central, 15 m de cabo. Se o sensor for sem fio, retire o cabo e a infraestrutura.',
    itens: [
      mat({ tipo: 'material', descricao: 'Sensor magnético de abertura (porta/janela)', unidade: 'un', busca: ['Sensor magnético abertura porta janela'] }, 1),
      mat({ tipo: 'material', descricao: 'Cabo para alarme 4 vias 26 AWG', unidade: 'm', busca: ['Cabo alarme 4 vias'] }, 15),
      srv('alarme_sensor_abertura', 1),
      srv('alarme_infra', 15),
    ],
  },
  {
    codigo: 'KIT-INC-01', disciplina: 'incendio', unidade: 'pt',
    descricao: 'Ponto de detector de fumaça (detector com base, cabo do laço e instalação)',
    observacao: 'Kit-modelo da H&M: detector óptico de fumaça (NBR 17240) com 15 m de cabo do laço até o ponto anterior. A central e a infraestrutura de eletroduto entram à parte. Ajuste ao projeto.',
    itens: [
      mat({ tipo: 'material', descricao: 'Detector óptico de fumaça com base', unidade: 'un', busca: ['Detector de fumaça óptico', 'Detector de fumaça endereçável'] }, 1),
      mat({ tipo: 'material', descricao: 'Cabo de incêndio 2×0,75 mm² vermelho', unidade: 'm', busca: ['Cabo de incêndio 2x0,75 vermelho'] }, 15),
      srv('inc_dispositivo', 1),
      srv('inc_infra', 15),
    ],
  },
  {
    codigo: 'KIT-ANT-01', disciplina: 'antena', unidade: 'pt',
    descricao: 'Ponto de TV (antena coletiva) completo — tomada coaxial RG-6',
    observacao: 'Kit-modelo da H&M: 10 m de cabo RG-6 da caixa de derivação até a tomada. Derivadores, amplificador e headend entram à parte. Ajuste ao projeto.',
    itens: [
      mat({ tipo: 'material', descricao: 'Cabo coaxial RG-6 75 Ω (malha 90%)', unidade: 'm', busca: ['Cabo coaxial RG-6'] }, 10),
      mat({ tipo: 'material', descricao: 'Tomada coaxial RG-6 com conector (TV/antena)', unidade: 'un', busca: ['Tomada coaxial RG-6 conector TV antena'] }, 1),
      mat({ tipo: 'material', descricao: 'Conector F de compressão para RG-6', unidade: 'un', busca: ['Conector F RG-6'] }, 2),
      mat(CAIXA_4X2, 1),
      mat(ELETRODUTO_3_4, 8),
      srv('antena_passagem_ponto', 1),
      srv('antena_ponto', 1),
    ],
  },
  // Pressurização de escadas (skills/pressurizacao) — semeados pela migração 2.0-12
  // no banco em que o seed 2.0-08 já rodou; numa instalação nova o 2.0-08 já os cria.
  {
    codigo: 'KIT-PRES-01', disciplina: 'pressurizacao', unidade: 'pt',
    descricao: 'Ponto de medição de pressão diferencial da escada pressurizada (transmissor 0–100 Pa, cabo blindado e infraestrutura)',
    observacao: 'Kit-modelo da H&M: transmissor de ΔP 4–20 mA com tomadas de pressão (escada × pavimento), 40 m de cabo blindado e 20 m de eletroduto até o painel de comando. Ajuste ao projeto (posição no meio da altura da escada).',
    itens: [
      mat({ tipo: 'material', descricao: 'Transmissor de pressão diferencial 0–100 Pa, saída 4–20 mA, com display e tomadas de pressão', unidade: 'un', busca: ['Transmissor de pressão diferencial 0-100 Pa', 'Transmissor pressão diferencial ar 4-20 mA'] }, 1),
      mat({ tipo: 'material', descricao: 'Cabo de instrumentação blindado 2 × 0,75 mm²', unidade: 'm', busca: ['Cabo blindado 2x0,75 mm', 'Cabo manga blindado 2 vias 0,75'] }, 40),
      mat({ tipo: 'material', descricao: 'Eletroduto de aço galvanizado 3/4" com conexões', unidade: 'm', busca: ['Eletroduto galvanizado 3/4', 'Eletroduto aço galvanizado 3/4'] }, 20),
      srv('pres_sensores', 1),
      srv('pres_cabo_comando', 40),
      srv('pres_infra', 20),
    ],
  },
  {
    codigo: 'KIT-PRES-02', disciplina: 'pressurizacao', unidade: 'pt',
    descricao: 'Acionador remoto "LIGA pressurização" (botoeira com tampa e sinaleiro, cabo resistente ao fogo e infraestrutura)',
    observacao: 'Kit-modelo da H&M: acionador na portaria/sala de controle (CBMDF NT 10, 4.3.1.10.5 f), 60 m de cabo de comando resistente ao fogo e 30 m de eletroduto galvanizado até o painel. Ajuste ao projeto.',
    itens: [
      mat({ tipo: 'material', descricao: 'Acionador remoto "LIGA PRESSURIZAÇÃO" com tampa de proteção, sinaleiro e placa', unidade: 'un', busca: ['Botoeira liga com tampa de proteção', 'Acionador remoto pressurização'] }, 1),
      mat({ tipo: 'material', descricao: 'Cabo de comando blindado 2 × 1,5 mm² resistente ao fogo', unidade: 'm', busca: ['Cabo resistente ao fogo 2x1,5 mm', 'Cabo blindado 2x1,5 mm'] }, 60),
      mat({ tipo: 'material', descricao: 'Eletroduto de aço galvanizado 3/4" com conexões', unidade: 'm', busca: ['Eletroduto galvanizado 3/4', 'Eletroduto aço galvanizado 3/4'] }, 30),
      srv('pres_acionador', 1),
      srv('pres_cabo_comando', 60),
      srv('pres_infra', 30),
    ],
  },
];

module.exports = {
  SECAO_MATERIAIS, SECAO_SERVICOS, SEGMENTOS, DISCIPLINAS, MAX_ITENS, KITS_MODELO,
  arred2, arred3, normalizarUnidade, unidadesCompativeis, subgrupoDoItem, proximoCodigo, normalizarCodigo,
  validarComposicao, calcularCusto, calcularCustoNosSegmentos, explodirComposicao, medidas, casarComCatalogo,
  metragemDaDescricao, conversaoEmbalagem, semMetragem,
};
