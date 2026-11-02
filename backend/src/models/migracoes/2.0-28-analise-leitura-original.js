// Análise de projeto: guarda o que o sistema LEU (serviços e materiais, antes de qualquer edição do usuário)
// nas análises que têm mapa do CAD (02/11/2026, item 3 do plano de melhorias). É a base para o
// "Reprocessar com o mapa conferido" copiar o que o usuário editou na análise antiga (quantidade, preço,
// itens retirados ou acrescentados) em vez de começar do zero: edição = diferença entre o que foi lido e o
// que está salvo. Coluna opcional; análise antiga fica sem base e o reprocessamento avisa que não copia.
module.exports = async (client) => {
  await client.query('ALTER TABLE analises_projeto ADD COLUMN IF NOT EXISTS leitura_original JSONB');
};
