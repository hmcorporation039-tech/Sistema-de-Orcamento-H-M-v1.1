// Índice em proposta_itens.material_id (revisão geral de 14/11/2026, versão 2.39).
// O histórico de preço do material, o "onde este material foi usado", a curva ABC, o aprendizado
// por disciplina e a conferência de exclusão do catálogo filtram os itens de proposta pelo material —
// sem índice, cada uma varria a tabela inteira de itens (a que mais cresce depois das movimentações).
// Parcial: a maioria dos itens digitados à mão não tem material ligado.
// Idempotente (IF NOT EXISTS: na partida seguinte não refaz nem trava).
module.exports = async (client) => {
  await client.query('CREATE INDEX IF NOT EXISTS idx_proposta_itens_material ON proposta_itens(material_id) WHERE material_id IS NOT NULL');
};
