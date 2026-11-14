// Valor em reais para TEXTO corrido (mensagens do canal, respostas dos agentes, prompts, revisão
// pré-envio) — fonte única desde a 2.38. É o formatarMoeda comum (skills/_comum/base/formato.js) com
// espaço comum no lugar do espaço inquebrável que o toLocaleString põe depois do "R$" (no WhatsApp e
// em prompt o NBSP vira caractere estranho). Antes havia seis cópias com a regex de milhar, cada uma
// tratando nulo de um jeito. `opcoes.vazio`: o que mostrar para nulo/vazio (padrão: R$ 0,00).
const { formatarMoeda } = require('./htmlPdf');

function moedaTexto(v, opcoes) {
  const t = formatarMoeda(v, opcoes);
  return typeof t === 'string' ? t.replace(/ /g, ' ') : t;
}

module.exports = { moedaTexto };
