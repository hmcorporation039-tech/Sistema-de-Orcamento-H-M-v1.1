const { numeroSeguro } = require('./calculoProposta');

// Validação de entrada de proposta.
//
// Antes não existia nenhuma: dos 6 casos inválidos testados na auditoria, 5
// devolviam 500 (o PostgreSQL rejeitava e o catch genérico transformava em
// "Erro ao criar proposta"), e o 6º — data em formato brasileiro — era aceito
// silenciosamente, dependendo do DateStyle do servidor para ser interpretado
// certo. Numa instalação com DateStyle MDY, "02/03/2026" viraria 3 de fevereiro
// em vez de 2 de março, sem ninguém perceber.

const LIMITES = {
  cliente_nome: 200,
  responsavel: 100,
  tipo: 50,
  porte: 30,
};

// Aceita apenas ISO (AAAA-MM-DD), que é o que o <input type="date"> envia.
// Formatos ambíguos como 10/01/2026 são recusados com explicação em vez de
// dependerem da configuração do banco para desempatar dia e mês.
function dataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const d = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && valor === d.toISOString().slice(0, 10);
}

function validarProposta(body) {
  const { data, cliente_nome, secoes, itens, bdi, imposto_venda, imposto_servico, desconto_materiais_pct, desconto_mao_obra_pct, validade } = body;

  if (!data) return 'Informe a data da proposta.';
  if (!dataValida(data)) return 'Data inválida. Use o formato AAAA-MM-DD.';
  if (!cliente_nome || !String(cliente_nome).trim()) return 'Informe o cliente da proposta.';

  for (const [campo, limite] of Object.entries(LIMITES)) {
    if (body[campo] && String(body[campo]).length > limite) {
      return `O campo "${campo}" excede o limite de ${limite} caracteres.`;
    }
  }

  if (secoes !== undefined && !Array.isArray(secoes)) return 'Formato inválido das seções.';
  if (itens !== undefined && !Array.isArray(itens)) return 'Formato inválido dos itens.';

  for (const [campo, valor] of [['bdi', bdi], ['imposto_venda', imposto_venda], ['imposto_servico', imposto_servico]]) {
    if (valor === undefined || valor === null || valor === '') continue;
    const n = Number(valor);
    // Coluna DECIMAL(5,2): acima de 999.99 o INSERT estourava com erro 500.
    if (!Number.isFinite(n) || n < 0 || n > 999.99) {
      return `O campo "${campo}" deve ser um percentual entre 0 e 999,99.`;
    }
  }

  // Só um registro informativo do último reajuste/desconto aplicado direto
  // nos valores unitários (ver aplicarAjustePercentual no frontend) — não
  // entra em nenhuma conta aqui, só é exibido no PDF quando negativo (ver
  // pdfTemplate.js). Aceita negativo, diferente de bdi/impostos.
  for (const [campo, valor] of [['desconto_materiais_pct', desconto_materiais_pct], ['desconto_mao_obra_pct', desconto_mao_obra_pct]]) {
    if (valor === undefined || valor === null || valor === '') continue;
    const n = Number(valor);
    if (!Number.isFinite(n) || n < -100 || n > 999.99) {
      return `O campo "${campo}" deve ser um percentual entre -100 e 999,99.`;
    }
  }

  if (validade !== undefined && validade !== null && validade !== '') {
    const v = Number(validade);
    if (!Number.isInteger(v) || v < 0 || v > 3650) return 'Validade deve ser um número de dias entre 0 e 3650.';
  }

  const listaItens = Array.isArray(itens) ? itens : [];
  for (const [i, it] of listaItens.entries()) {
    const descricao = it.desc ?? it.descricao;
    if (!descricao || !String(descricao).trim()) return `O item ${i + 1} está sem descrição.`;
    if (String(descricao).length > 1000) return `A descrição do item ${i + 1} é longa demais.`;

    const quantidade = Number(it.qtd ?? it.quantidade);
    if (!Number.isFinite(quantidade) || quantidade < 0) {
      return `Quantidade inválida no item ${i + 1}.`;
    }
    const valorUnitario = Number(it.vu ?? it.valor_unitario ?? 0);
    if (!Number.isFinite(valorUnitario) || valorUnitario < 0) {
      return `Valor unitário inválido no item ${i + 1}.`;
    }
  }

  return null;
}

// `validade` precisa distinguir 0 de ausente: `validade || 5` gravava 5 quando
// o usuário informava 0, mudando silenciosamente o prazo da proposta.
function validadeOuPadrao(valor) {
  if (valor === undefined || valor === null || valor === '') return 5;
  return numeroSeguro(valor, 5);
}

module.exports = { validarProposta, validadeOuPadrao, dataValida };
