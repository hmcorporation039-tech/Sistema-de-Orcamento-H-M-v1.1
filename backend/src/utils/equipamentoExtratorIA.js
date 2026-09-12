const { chamarGemini, configurado } = require('./geminiClient');

// Extrai a lista de equipamentos/materiais técnicos citados no projeto
// (cada um com um código REF. de fabricante) usando o Gemini para reorganizar
// o texto já extraído do PDF (pdf-parse) — não é a IA "lendo" o PDF sozinha,
// é reformatação de texto já dado a ela, tarefa validada como confiável
// (diferente de pedir pra ela listar ambientes de memória, onde ela alucina).
async function extrairEquipamentosComIA(textoCompleto) {
  if (!configurado()) {
    return { itens: [], aviso: 'GEMINI_API_KEY não configurada — extração de equipamentos por IA desativada' };
  }

  const prompt = `O texto abaixo foi extraído (leitura de texto puro, sem OCR) de um PDF de projeto de engenharia. Ele contém várias seções misturadas: lista de ambientes com área, tabela de cabos, tabela de eletrodutos, códigos de circuito, e uma lista de equipamentos/materiais técnicos (cada um com atributos como COR, ALTURA, COMP., DENSIDADE, terminando em "REF.: <código>").

Extraia APENAS os itens de equipamento/material que tenham um código REF. associado (ignore ambientes, tabela de cabos/eletrodutos, códigos de circuito). USE SOMENTE o texto abaixo, não invente itens nem complete texto que não está lá. Se dois itens forem idênticos (mesma descrição e referência), inclua só uma vez.

Responda em JSON: {"itens":[{"descricao":"...","referencia":"..."}]}

TEXTO:
${textoCompleto}`;

  try {
    const texto = await chamarGemini({ prompt, json: true });
    const resultado = JSON.parse(texto);
    const itens = Array.isArray(resultado.itens) ? resultado.itens : [];
    return {
      itens: itens
        .filter(it => it.descricao && it.descricao.trim().length > 3)
        .map(it => ({ descricao: it.descricao.trim(), referencia_fabricante: it.referencia || null })),
    };
  } catch (err) {
    return { itens: [], aviso: `Extração de equipamentos por IA falhou: ${err.message}` };
  }
}

module.exports = { extrairEquipamentosComIA };
