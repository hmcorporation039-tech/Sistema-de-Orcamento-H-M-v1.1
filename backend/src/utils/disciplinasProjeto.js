// Disciplinas de projeto da H&M para a ANÁLISE de projeto. Cada área de atuação
// é uma disciplina separada (pedido do usuário, 25/10/2026): elétrica predial
// não se mistura com hospitalar ou industrial, cabeamento não se mistura com
// CFTV etc. Usada pela Análise de Projeto (restringe itens e contagens ao que
// foi marcado em cada arquivo), pelo relatório, pela tela (GET
// /projetos/disciplinas) e pelo servidor MCP.
// Derivada do registro único (skills/_comum/disciplinas.js): `skill` = chave da
// disciplina cujo motor atende esta; `grupo` só organiza a tela.
const REGISTRO = require('../config/caminhos').registroDisciplinas();
const DISCIPLINAS = REGISTRO.DISCIPLINAS.map(d => ({ chave: d.chave, nome: d.nomes.analise, grupo: d.grupo, skill: d.skill }));

const CHAVES_VALIDAS = new Set(DISCIPLINAS.map(d => d.chave));

// Valida a lista de disciplinas vinda do frontend (form-data, chega como
// string JSON) — descarta silenciosamente chaves desconhecidas em vez de
// dar erro, pra não travar a análise por um valor inesperado.
function normalizarDisciplinas(valor) {
  let lista = valor;
  if (typeof valor === 'string') {
    try {
      lista = JSON.parse(valor);
    } catch {
      lista = [];
    }
  }
  if (!Array.isArray(lista)) return [];
  return [...new Set(lista.filter(c => CHAVES_VALIDAS.has(c)))];
}

function nomeDaDisciplina(chave) {
  return DISCIPLINAS.find(d => d.chave === chave)?.nome || chave;
}

module.exports = { DISCIPLINAS, normalizarDisciplinas, nomeDaDisciplina };
