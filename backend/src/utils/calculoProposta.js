// Regra de negócio dos valores da proposta, no backend.
//
// Antes, o backend gravava os totais exatamente como o navegador enviava e
// calculava o valor do item como `(it.qtd || 1) * (it.vu || 0)`. Isso gerava
// dois problemas confirmados na auditoria:
//
// 1. Quantidade 0 virava 1. Como `0` é "falsy", um item com quantidade zerada
//    era gravado com quantidade 1 e valor cheio — enquanto a tela (que calcula
//    0 × valor = 0) o excluía do total. O PDF do cliente saía com a linha
//    valendo R$ 1.000 e "Total geral: R$ 0,00": a soma das linhas não fechava
//    com o total.
//
// 2. Totais vindos prontos do cliente. Uma requisição com itens de R$ 50.000 e
//    `total: 0` era aceita e virava PDF e relatório financeiro.
//
// Agora o valor de cada item e todos os totais são recalculados aqui, a partir
// dos itens — o que o cliente manda nesses campos é ignorado.

// Converte com segurança: aceita número ou string, rejeita NaN/Infinity.
// (`Number('abc') * 10` produzia NaN, e o PostgreSQL ACEITA NaN em coluna
// numeric — contaminando para sempre qualquer SUM() do dashboard.)
function numeroSeguro(valor, padrao = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : padrao;
}

function arredondar(valor) {
  return Math.round((numeroSeguro(valor) + Number.EPSILON) * 100) / 100;
}

// Quantidade com 3 casas, como a coluna proposta_itens.quantidade DECIMAL(10,3)
// grava. Antes a conta usava a quantidade cheia (1,0004 × 1.000 = 1.000,40) e o
// banco gravava 1,000: o PDF saía "1 × 1.000,00 = 1.000,40" e Excel, curva ABC,
// cronograma e a tela depois de recarregar davam outro número. O arredondamento
// é o do PostgreSQL (metade para longe do zero sobre o número como escrito:
// "1.0005" → 1,001), feito na notação decimal para não errar no binário.
function arredondarQuantidade(valor, padrao = 0) {
  const n = numeroSeguro(valor, padrao);
  const abs = String(Math.abs(n));
  const r = /e/i.test(abs) ? Math.round(Math.abs(n) * 1000) / 1000 : Number(`${Math.round(Number(`${abs}e3`))}e-3`);
  return n < 0 ? -r : r;
}

// Uma seção é de mão de obra pelo nome — mesma regra do frontend, mantida para
// que os dois lados cheguem ao mesmo número.
const RE_MAO_DE_OBRA = /m[ãa]o.?de.?obra|serviç|servic/i;

function ehMaoDeObra(nome) {
  return RE_MAO_DE_OBRA.test(nome || '');
}

// Normaliza um item vindo do corpo da requisição (o frontend manda abreviado:
// desc/qtd/un/vu; o duplicar manda o nome completo da coluna).
function normalizarItem(it, ordem) {
  const quantidade = arredondarQuantidade(it.qtd ?? it.quantidade, 1);
  // arredonda o unitário para 2 casas ANTES de multiplicar: é o valor gravado
  // (DECIMAL 10,2) e impresso, então qtd × unitário da linha sempre fecha
  const valorUnitario = arredondar(numeroSeguro(it.vu ?? it.valor_unitario, 0));
  return {
    material_id: it.material_id || null,
    descricao: it.desc ?? it.descricao ?? '',
    quantidade,
    unidade: it.un ?? it.unidade ?? null,
    valor_unitario: valorUnitario,
    valor_total: arredondar(quantidade * valorUnitario),
    ncm: it.ncm || null,
    codigo: it.codigo || null,
    subgrupo: it.subgrupo || null,
    status: it.status || 'confirmado',
    ordem,
  };
}

// Recalcula subtotais, BDI, impostos e total a partir das seções e itens.
// `secoes` e `itens` são os arrays crus do corpo da requisição.
//
// O reajuste/desconto geral (+aumenta ou -desconta todos os valores) NÃO é
// um percentual bolt-on somado aqui (uma versão anterior fazia isso, só
// nesta sessão de desenvolvimento — nunca chegou a um uso real além de um
// teste) — o usuário pediu que ele reescreva de vez o valor_unitario de cada
// item (ver aplicarAjustePercentual em Orcamento.js, no frontend), então o
// efeito dele já chega aqui embutido nos próprios itens, sem precisar de
// nenhum termo a mais na conta.
//
// BDI diferenciado (versão 2.0, Fase 3F — BDI pela fórmula do TCU): com
// `bdi_materiais` preenchido, o BDI dos materiais usa esse percentual e o da
// mão de obra continua `bdi` (o TCU pede BDI reduzido para mero fornecimento
// de materiais e equipamentos). Sem ele (null/vazio — todas as propostas
// antigas), a conta é EXATAMENTE a de antes: (materiais + mão de obra) × BDI.
// Os impostos de venda/serviço continuam somados por fora, sobre o custo
// direto; se o BDI foi calculado com os tributos dentro (fórmula do TCU, I),
// o editor avisa para zerá-los — senão o imposto entra duas vezes.
function bdiMateriaisDefinido(bdiMateriais) {
  return bdiMateriais !== undefined && bdiMateriais !== null && bdiMateriais !== '' && Number.isFinite(Number(bdiMateriais));
}

// Item → seção: pelo id da tela (`sid`), pelo id do banco (`secao_id`, como o
// GET /propostas/:id devolve) ou pelo nome (`secao_nome`), mas só quando os DOIS
// lados têm valor. Antes `it.sid === sec.id` com os dois undefined dava true
// e o item entrava em TODAS as seções (100 → 200 no total; revisão de 27/10/2026).
// Sem `secao_id`, ler a proposta pela API e gravar de volta apagava todos os
// itens (teste de 28/10/2026). Uma regra só: totais, validação e gravação.
function itemPertenceASecao(it, sec) {
  if (!it || !sec) return false;
  return (sec.id != null && it.sid != null && it.sid === sec.id)
    || (sec.id != null && it.sid == null && it.secao_id != null && String(it.secao_id) === String(sec.id))
    || (sec.nome != null && it.secao_nome != null && it.secao_nome === sec.nome);
}

function calcularTotais({ secoes, itens, bdi, bdi_materiais, imposto_venda, imposto_servico }) {
  const listaSecoes = Array.isArray(secoes) ? secoes : [];
  const listaItens = Array.isArray(itens) ? itens : [];

  let subtotalMateriais = 0;
  let subtotalMaoObra = 0;

  for (const sec of listaSecoes) {
    const itensDaSecao = listaItens.filter(it => itemPertenceASecao(it, sec));
    const subtotal = itensDaSecao.reduce((soma, it) => {
      const item = normalizarItem(it, 0);
      return soma + item.valor_total;
    }, 0);

    if (ehMaoDeObra(sec.nome)) subtotalMaoObra += subtotal;
    else subtotalMateriais += subtotal;
  }

  subtotalMateriais = arredondar(subtotalMateriais);
  subtotalMaoObra = arredondar(subtotalMaoObra);

  const percentualBdi = numeroSeguro(bdi, 0);
  const percentualVenda = numeroSeguro(imposto_venda, 0);
  const percentualServico = numeroSeguro(imposto_servico, 0);

  const bdiDetalhe = detalharBdi({ subtotalMateriais, subtotalMaoObra, bdi: percentualBdi, bdi_materiais });
  const valorBdi = bdiDetalhe.valor_bdi;
  const valorImpostoVenda = arredondar(subtotalMateriais * (percentualVenda / 100));
  const valorImpostoServico = arredondar(subtotalMaoObra * (percentualServico / 100));

  return {
    subtotal_materiais: subtotalMateriais,
    subtotal_mao_obra: subtotalMaoObra,
    valor_bdi: valorBdi,
    // só existem com BDI diferenciado (não são gravados; o PDF mostra as duas linhas)
    valor_bdi_materiais: bdiDetalhe.valor_bdi_materiais,
    valor_bdi_mao_obra: bdiDetalhe.valor_bdi_mao_obra,
    valor_imposto_venda: valorImpostoVenda,
    valor_imposto_servico: valorImpostoServico,
    total: arredondar(subtotalMateriais + subtotalMaoObra + valorBdi + valorImpostoVenda + valorImpostoServico),
  };
}

// Valor do BDI a partir dos subtotais. Sem BDI diferenciado, a expressão é a
// mesma de sempre (não troque por mat×b + mão×b: o arredondamento pode mudar
// um centavo). Usado também pelo PDF para mostrar as duas linhas de BDI.
function detalharBdi({ subtotalMateriais, subtotalMaoObra, bdi, bdi_materiais }) {
  const mat = numeroSeguro(subtotalMateriais);
  const mao = numeroSeguro(subtotalMaoObra);
  const percentualBdi = numeroSeguro(bdi, 0);
  if (!bdiMateriaisDefinido(bdi_materiais)) {
    return { diferenciado: false, valor_bdi: arredondar((mat + mao) * (percentualBdi / 100)), valor_bdi_materiais: null, valor_bdi_mao_obra: null };
  }
  const valorMateriais = arredondar(mat * (Number(bdi_materiais) / 100));
  const valorMaoObra = arredondar(mao * (percentualBdi / 100));
  return { diferenciado: true, valor_bdi: arredondar(valorMateriais + valorMaoObra), valor_bdi_materiais: valorMateriais, valor_bdi_mao_obra: valorMaoObra };
}

module.exports = { calcularTotais, detalharBdi, bdiMateriaisDefinido, normalizarItem, numeroSeguro, arredondar, arredondarQuantidade, itemPertenceASecao, ehMaoDeObra };
