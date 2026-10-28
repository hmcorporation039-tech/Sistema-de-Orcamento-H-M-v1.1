// Modelo 3D (versão 2.3): modelos_3d guarda o HTML e a imagem por origem
// (origem_tipo + origem_id), sem chave estrangeira — a origem pode ser uma
// análise, um projeto/laudo ou uma proposta. Ao excluir a origem, a linha do
// modelo ficava para trás (HTML de vários MB e a imagem, para sempre no banco
// e no backup). Gatilho AFTER DELETE em cada tabela de origem apaga o modelo
// junto, na mesma transação da exclusão.
// Idempotente: CREATE OR REPLACE na função; o gatilho só é criado se não existir.
const GATILHOS = [
  { tabela: 'analises_projeto', tipo: 'analise', nome: 'hm_modelo_3d_analise_excluida' },
  { tabela: 'laudos_projetos', tipo: 'laudo', nome: 'hm_modelo_3d_laudo_excluido' },
  { tabela: 'propostas', tipo: 'proposta', nome: 'hm_modelo_3d_proposta_excluida' },
];

module.exports = async (client) => {
  await client.query(`
    CREATE OR REPLACE FUNCTION hm_apagar_modelo_3d() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      DELETE FROM modelos_3d WHERE origem_tipo = TG_ARGV[0] AND origem_id = OLD.id;
      RETURN NULL;
    END
    $$
  `);
  for (const g of GATILHOS) {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${g.nome}' AND tgrelid = '${g.tabela}'::regclass) THEN
          CREATE TRIGGER ${g.nome} AFTER DELETE ON ${g.tabela}
            FOR EACH ROW EXECUTE PROCEDURE hm_apagar_modelo_3d('${g.tipo}');
        END IF;
      END
      $$
    `);
  }
};
