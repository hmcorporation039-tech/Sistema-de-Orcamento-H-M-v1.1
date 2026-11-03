// Índices nas chaves estrangeiras que o PostgreSQL percorre ao apagar a linha de origem (02/11/2026).
// Sem índice, cada DELETE na origem varre a tabela filha inteira (sequential scan):
//   - proposta_itens.secao_id (ON DELETE CASCADE): todo salvamento de proposta apaga as seções e
//     recria; para cada seção apagada o banco rodava 'DELETE FROM proposta_itens WHERE secao_id = $1'
//     sobre os itens de TODAS as propostas — o custo crescia com o total de itens do sistema;
//   - as que viram SET NULL ou CASCADE ao excluir uma proposta ou uma obra.
// Idempotente: CREATE INDEX IF NOT EXISTS (tabelas pequenas; o índice sai em segundos).
const INDICES = [
  ['idx_proposta_itens_secao', 'proposta_itens', 'secao_id'],
  ['idx_analises_projeto_proposta', 'analises_projeto', 'proposta_id'],
  ['idx_analises_projeto_pasta_obra', 'analises_projeto', 'pasta_obra_id'],
  ['idx_laudos_projetos_pasta_obra', 'laudos_projetos', 'pasta_obra_id'],
  ['idx_pasta_arquivos_obra', 'pasta_arquivos', 'obra_id'],
  ['idx_vencimentos_laudos_obra', 'vencimentos_laudos', 'obra_id'],
  ['idx_regras_movimento_obra_obra', 'regras_movimento_obra', 'obra_id'],
];

module.exports = async (client) => {
  for (const [nome, tabela, coluna] of INDICES) {
    await client.query(`CREATE INDEX IF NOT EXISTS ${nome} ON ${tabela} (${coluna})`);
  }
};
