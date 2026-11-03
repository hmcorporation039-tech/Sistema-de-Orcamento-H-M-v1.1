// Parte da leitura vetorial de PDF (utils/pdfVetorial.js, que explica o método inteiro):
// tempo-limite cooperativo.

// Tempo-limite cooperativo: `prazo` é um Date.now() limite. Devolve uma função
// barata de chamar dentro dos laços (olha o relógio a cada 1024 chamadas); passou
// do prazo, lança erro com codigo TEMPO_ESGOTADO (a página fica de fora, com aviso).
function erroDeTempo() { return Object.assign(new Error('tempo-limite da página esgotado'), { codigo: 'TEMPO_ESGOTADO' }); }
function cronometro(prazo) {
  if (!prazo) return () => {};
  let n = 0;
  return () => { if ((++n & 1023) === 0 && Date.now() > prazo) throw erroDeTempo(); };
}

module.exports = { erroDeTempo, cronometro };