// Proposta de renovação do laudo (02/11/2026): do cartão de vencimentos o engenheiro cria um rascunho de
// proposta para renovar o laudo que está vencendo. Guarda qual proposta nasceu de qual vencimento, para
// o segundo clique abrir a mesma proposta em vez de criar outra. Se a proposta for apagada, o vínculo some.
module.exports = async (client) => {
  await client.query('ALTER TABLE vencimentos_laudos ADD COLUMN IF NOT EXISTS proposta_renovacao_id INTEGER REFERENCES propostas(id) ON DELETE SET NULL');
};
