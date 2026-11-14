// Normalização de texto para COMPARAR nomes (semAcento, chaveNome): a regra está no pacote comum
// (skills/_comum/base/texto.js, Fase 7), a mesma das skills. Este arquivo fica para os require de sempre.
const path = require('path');
const { COMUM } = require('../config/caminhos');
const base = require(path.join(COMUM, 'base', 'texto'));

// chave de BUSCA: sem acento, minúsculas, espaços juntados ("  Cabo  Flexível " → "cabo flexivel").
// Fonte única desde a 2.38 — estava copiada no aprendizado do orçamento, nos preços vendidos, no
// comparador de orçamentos, no leitor do orçamento concorrente e no leitor da planilha de materiais.
const chaveBusca = (s) => base.semAcento(String(s ?? '')).toLowerCase().replace(/\s+/g, ' ').trim();

module.exports = { ...base, chaveBusca };
