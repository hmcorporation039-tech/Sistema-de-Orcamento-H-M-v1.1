// BDI pela fórmula do TCU (versão 2.0, Fase 3F).
//
// bdi_memoria: memória do cálculo do BDI (tipo de obra, regime, parcelas e
//   tributos, BDI resultante e, se houver, o BDI diferenciado de materiais) —
//   é o que o PDF imprime como "Composição do BDI", exigida em proposta para
//   órgão público. Gravada pelo calculador do editor (utils/bdiTcu.js limpa e
//   recalcula antes de gravar). NULL = BDI digitado à mão, sem memória.
// bdi_materiais: BDI diferenciado (reduzido) sobre os MATERIAIS, em %. NULL =
//   o mesmo BDI para materiais e mão de obra — que é a conta de sempre, então
//   nenhuma proposta antiga muda de total (ver calculoProposta.calcularTotais).
module.exports = async (client) => {
  await client.query('ALTER TABLE propostas ADD COLUMN IF NOT EXISTS bdi_memoria JSONB');
  await client.query('ALTER TABLE propostas ADD COLUMN IF NOT EXISTS bdi_materiais DECIMAL(5,2)');
};
