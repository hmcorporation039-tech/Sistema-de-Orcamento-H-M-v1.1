// Escape de texto para dentro de XML (conteúdo de elemento e valor de atributo entre aspas duplas) — um lugar
// só (estava copiado no .docx do atestado de capacidade e no pedido de cancelamento da NFS-e Nacional; auditoria
// 02/11/2026, OP-09). A regra está no pacote comum (skills/_comum/base/xml.js, Fase 7). Aqui o valor passa por
// String() antes, como sempre foi (nulo vira "null"): o XML da NFS-e não muda. Para HTML de PDF use o escapeHtml.
const path = require('path');
const { COMUM } = require('../config/caminhos');
const { escXml } = require(path.join(COMUM, 'base', 'xml'));

const esc = (s) => escXml(String(s));

module.exports = { esc };
