// Erro com status HTTP — UMA classe para todo o backend (antes: duas
// "ErroPedido" com os parâmetros em ordem trocada, mais helpers locais em cada
// controller). Lançado em qualquer ponto de uma rota, vira a resposta no
// tratador central (middleware/erros.js):
//   4xx → { erro: mensagem, ...extra } com o status;
//   5xx → mensagem genérica no corpo e o detalhe no log — a não ser que
//         `publico: true` (a mensagem foi escrita para o usuário, ex.: "o modelo
//         3D demorou demais para ser gerado").
class ErroHttp extends Error {
  constructor(status, mensagem, extra = {}, { publico = false } = {}) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
    this.publico = publico;
  }
}

module.exports = { ErroHttp };
