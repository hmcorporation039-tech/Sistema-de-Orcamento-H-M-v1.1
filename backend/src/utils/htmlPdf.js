// Base comum do HTML dos PDFs (proposta, contrato, relatórios, boletim de
// medição, ordem de serviço, folha de entrega). Antes cada template tinha a sua
// cópia de escapeHtml e dos formatadores (6 cópias; as de data já divergiam).
// Regra do projeto: TODO texto que vem do banco/formulário passa por escapeHtml.
//
// As funções estão no pacote comum (skills/_comum/base, Fase 7), as mesmas das skills:
//   escapeHtml(s)                 — html.js
//   formatarMoeda(v)              — formato.js ('R$ 1.234,56'; vazio/nulo → 'R$ 0,00')
//   formatarData(v, vazio = '—')  — formato.js (data DATE sem fuso; texto que não é data volta como veio)
//   formatarDataDeHoje()          — formato.js (hoje no fuso de Brasília)
const path = require('path');
const { COMUM } = require('../config/caminhos');
const { escapeHtml } = require(path.join(COMUM, 'base', 'html'));
const { formatarMoeda, formatarData, formatarDataDeHoje } = require(path.join(COMUM, 'base', 'formato'));

module.exports = { escapeHtml, formatarMoeda, formatarData, formatarDataDeHoje };
