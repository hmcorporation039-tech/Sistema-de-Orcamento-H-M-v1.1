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

// Uma seção é de mão de obra pelo nome — mesma regra do frontend, mantida para
// que os dois lados cheguem ao mesmo número.
const RE_MAO_DE_OBRA = /m[ãa]o.?de.?obra|serviç|servic/i;

function ehMaoDeObra(nome) {
  return RE_MAO_DE_OBRA.test(nome || '');
}

// Normaliza um item vindo do corpo da requisição (o frontend manda abreviado:
// desc/qtd/un/vu; o duplicar manda o nome completo da coluna).
function normalizarItem(it, ordem) {
  const quantidade = numeroSeguro(it.qtd ?? it.quantidade, 1);
  const valorUnitario = numeroSeguro(it.vu ?? it.valor_unitario, 0);
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

// Recalcula subtotais, BDI, impostos, ajuste geral e total a partir das
// seções e itens. `secoes` e `itens` são os arrays crus do corpo da requisição.
function calcularTotais({ secoes, itens, bdi, imposto_venda, imposto_servico, ajuste_geral }) {
  const listaSecoes = Array.isArray(secoes) ? secoes : [];
  const listaItens = Array.isArray(itens) ? itens : [];

  let subtotalMateriais = 0;
  let subtotalMaoObra = 0;

  for (const sec of listaSecoes) {
    const itensDaSecao = listaItens.filter(it => it.sid === sec.id || it.secao_nome === sec.nome);
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
  // Único percentual que aceita negativo — mesma base do BDI (materiais +
  // mão de obra), positivo aumenta todos os valores da proposta, negativo dá
  // desconto igual sobre o total.
  const percentualAjuste = numeroSeguro(ajuste_geral, 0);

  const valorBdi = arredondar((subtotalMateriais + subtotalMaoObra) * (percentualBdi / 100));
  const valorImpostoVenda = arredondar(subtotalMateriais * (percentualVenda / 100));
  const valorImpostoServico = arredondar(subtotalMaoObra * (percentualServico / 100));
  const valorAjusteGeral = arredondar((subtotalMateriais + subtotalMaoObra) * (percentualAjuste / 100));

  return {
    subtotal_materiais: subtotalMateriais,
    subtotal_mao_obra: subtotalMaoObra,
    valor_bdi: valorBdi,
    valor_imposto_venda: valorImpostoVenda,
    valor_imposto_servico: valorImpostoServico,
    valor_ajuste_geral: valorAjusteGeral,
    total: arredondar(subtotalMateriais + subtotalMaoObra + valorBdi + valorImpostoVenda + valorImpostoServico + valorAjusteGeral),
  };
}

module.exports = { calcularTotais, normalizarItem, numeroSeguro, arredondar, ehMaoDeObra };
