// Quem projetou: o responsável técnico do carimbo (ou o CREA), normalizado. É a chave do que o sistema aprende das
// notas do desenho por escritório (services/notasAprendidas.js). Vazio = o carimbo não diz.
const { chaveNome } = require('./texto');

const chaveEscritorio = (carimbo) => chaveNome(carimbo?.responsavel || carimbo?.crea || '').slice(0, 120);

module.exports = { chaveEscritorio };
