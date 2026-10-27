// Versão 2.1 — análise ≠ laudo (pedido do usuário de 27/10/2026): "nem sempre
// uma análise de projetos vai ter que gerar um laudo; laudos serão pedidos
// quando necessário".
//
// 1. analises_projeto.finalidade: 'orcamento' (orçar a partir do projeto
//    recebido — o uso de até hoje, valor das análises existentes) ou
//    'elaboracao' (a H&M define/entrega o projeto a partir do arquitetônico).
// 2. laudos_projetos.tipo: 'projeto' ou 'laudo'. Os registros existentes são
//    classificados uma vez (só onde tipo é nulo) pela regra de
//    utils/projetoLaudo.js → classificarExistente: dado de inspeção preenchido
//    → laudo; nasceu de análise → projeto; só orçamento de execução → projeto;
//    o resto → laudo.
// 3. laudos_projetos.entregas: as entregas escolhidas no projeto (itens e
//    dados do as-built), para a tela lembrar a última escolha.
// 4. laudos_projetos.pasta_raiz: em que pasta-mãe a pasta do registro mora —
//    'laudos' (Laudos\ ou Obras\<obra>\Laudos\) ou 'projetos' (Projetos\ ou
//    Obras\<obra>\Projetos\). As pastas que já existem ficam onde estão
//    ('laudos'); a migração não move arquivos.
// Idempotente; não apaga nada.
const { classificarExistente } = require('../../utils/projetoLaudo');

module.exports = async (client) => {
  await client.query('ALTER TABLE analises_projeto ADD COLUMN IF NOT EXISTS finalidade VARCHAR(20)');
  await client.query("UPDATE analises_projeto SET finalidade = 'orcamento' WHERE finalidade IS NULL");
  await client.query("ALTER TABLE analises_projeto ALTER COLUMN finalidade SET DEFAULT 'orcamento'");
  await client.query('ALTER TABLE analises_projeto ALTER COLUMN finalidade SET NOT NULL');
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analises_projeto_finalidade_check') THEN
        ALTER TABLE analises_projeto ADD CONSTRAINT analises_projeto_finalidade_check CHECK (finalidade IN ('orcamento', 'elaboracao'));
      END IF;
    END $$;
  `);

  await client.query('ALTER TABLE laudos_projetos ADD COLUMN IF NOT EXISTS tipo VARCHAR(10)');
  await client.query('ALTER TABLE laudos_projetos ADD COLUMN IF NOT EXISTS entregas JSONB');
  await client.query('ALTER TABLE laudos_projetos ADD COLUMN IF NOT EXISTS pasta_raiz VARCHAR(10)');
  // pastas de antes da 2.1 continuam em Laudos\ (ou Obras\<obra>\Laudos\)
  await client.query("UPDATE laudos_projetos SET pasta_raiz = 'laudos' WHERE pasta IS NOT NULL AND pasta_raiz IS NULL");

  const { rows } = await client.query(`
    SELECT l.id, l.disciplina, l.dados, l.analise_id, l.propostas,
           (SELECT count(*)::int FROM laudos_projetos_fotos f WHERE f.laudo_id = l.id) AS total_fotos
      FROM laudos_projetos l WHERE l.tipo IS NULL`);
  for (const r of rows) {
    await client.query('UPDATE laudos_projetos SET tipo = $1 WHERE id = $2 AND tipo IS NULL', [classificarExistente(r, r.total_fotos), r.id]);
  }
  await client.query("ALTER TABLE laudos_projetos ALTER COLUMN tipo SET DEFAULT 'laudo'");
  await client.query('ALTER TABLE laudos_projetos ALTER COLUMN tipo SET NOT NULL');
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'laudos_projetos_tipo_check') THEN
        ALTER TABLE laudos_projetos ADD CONSTRAINT laudos_projetos_tipo_check CHECK (tipo IN ('projeto', 'laudo'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'laudos_projetos_pasta_raiz_check') THEN
        ALTER TABLE laudos_projetos ADD CONSTRAINT laudos_projetos_pasta_raiz_check CHECK (pasta_raiz IS NULL OR pasta_raiz IN ('laudos', 'projetos'));
      END IF;
    END $$;
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_laudos_projetos_tipo ON laudos_projetos (tipo, disciplina)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_laudos_projetos_analise ON laudos_projetos (analise_id) WHERE analise_id IS NOT NULL');
};
