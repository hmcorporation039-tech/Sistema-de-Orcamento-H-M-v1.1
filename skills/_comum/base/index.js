// Pacote comum do sistema H&M (Fase 7 do roteiro): o que backend e skills usam igual, num lugar só —
// texto (comparar nomes), formatação pt-BR (dinheiro, data, número), regras de dinheiro da proposta,
// escape de HTML e de XML e o timbrado da H&M.
//
// Por que aqui (skills/_comum/base) e não um pacote de npm workspaces na raiz:
//   - as skills são ligadas ao Claude como pastas soltas (skills/ligar-skills.ps1) e já chegam ao
//     _comum por require relativo ("../../../_comum/..."); um pacote fora de skills/ não iria junto;
//   - o backend já lê skills/_comum por config/caminhos.js (COMUM);
//   - workspaces mudariam o jeito de instalar (node_modules içados para a raiz) e o build do React
//     (CRA) não compila código fora de frontend/src — o frontend fica com utils/format.js e
//     utils/dinheiro.js, conferidos contra este pacote em backend/testes/comum.test.js.
// Sem dependências (só o path do Node): roda no backend, nas skills e no Claude Code.
//
//   const { formatarMoeda, escapeHtml } = require('<...>/skills/_comum/base');
module.exports = {
  ...require('./texto'),
  ...require('./formato'),
  ...require('./dinheiro'),
  ...require('./html'),
  ...require('./xml'),
  ...require('./timbrado'),
};
