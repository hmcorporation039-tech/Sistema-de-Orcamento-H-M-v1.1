const { perguntarJSON, iaTextoDisponivel } = require('./leitorCotacaoIA');

// Extrai a lista de equipamentos/materiais técnicos citados no projeto
// (cada um com um código REF. de fabricante) usando a IA para reorganizar
// o texto já extraído do PDF (pdf-parse) — não é a IA "lendo" o PDF sozinha,
// é reformatação de texto já dado a ela, tarefa validada como confiável
// (diferente de pedir pra ela listar ambientes de memória, onde ela alucina).
// Claude Max primeiro (assinatura, sem custo por uso), Gemini como complemento.
async function extrairEquipamentosComIA(textoCompleto) {
  if (!iaTextoDisponivel()) {
    return { itens: [], aviso: 'Nenhuma IA configurada — extração de equipamentos por IA desativada' };
  }

  const prompt = `O documento é texto extraído (leitura de texto puro, sem OCR) de um PDF de projeto de engenharia. Ele contém várias seções misturadas: lista de ambientes com área, tabela de cabos, tabela de eletrodutos, códigos de circuito, e uma lista de equipamentos/materiais técnicos (cada um com atributos como COR, ALTURA, COMP., DENSIDADE, terminando em "REF.: <código>").

Extraia APENAS os itens de equipamento/material que tenham um código REF. associado (ignore ambientes, tabela de cabos/eletrodutos, códigos de circuito). USE SOMENTE o texto do documento, não invente itens nem complete texto que não está lá. Se dois itens forem idênticos (mesma descrição e referência), inclua só uma vez.

Responda em JSON: {"itens":[{"descricao":"...","referencia":"..."}]}`;

  try {
    const { json: resultado } = await perguntarJSON(prompt, { documento: textoCompleto });
    const itens = Array.isArray(resultado?.itens) ? resultado.itens : [];
    return {
      itens: itens
        .filter(it => typeof it?.descricao === 'string' && it.descricao.trim().length > 3)
        .map(it => ({ descricao: it.descricao.trim(), referencia_fabricante: it.referencia ? String(it.referencia) : null })),
    };
  } catch (err) {
    return { itens: [], aviso: `Extração de equipamentos por IA falhou: ${err.message}` };
  }
}

module.exports = { extrairEquipamentosComIA };
