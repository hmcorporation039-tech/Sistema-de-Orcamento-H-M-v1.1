// Normalização de texto para COMPARAR nomes (semAcento, chaveNome): a regra está no pacote comum
// (skills/_comum/base/texto.js, Fase 7), a mesma das skills. Este arquivo fica para os require de sempre.
const path = require('path');
const { COMUM } = require('../config/caminhos');

module.exports = require(path.join(COMUM, 'base', 'texto'));
