// Treino por disciplina e com as planilhas/orçamentos do acervo (pedido do usuário em 03/11/2026: "faça o treino,
// mas faça com que o sistema sempre aprenda por disciplinas. Em relação às planilhas, usem apenas os materiais que
// não têm no sistema para alimentá-lo").
//
// acervo_treino.disciplina: a disciplina de cada arquivo lido (pelo nome e pelas pastas, utils/disciplinaDoArquivo.js;
//   sem ela, a que o leitor achou no desenho). situacao 'ignorado': arquivo de disciplina que não é da H&M
//   (arquitetura, hidráulica, estrutura) — não é lido, não ensina e não conta como erro.
// acervo_materiais: cada material NOVO que as planilhas e os orçamentos em PDF do acervo ensinaram, com a
//   disciplina (utils/disciplinaDoMaterial.js). Com preço, o material entrou no catálogo (material_id, origem
//   'acervo'); sem preço, fica aqui como conhecido, esperando um preço (não entra no catálogo a R$ 0,00 — regra de
//   28/10/2026). O que o catálogo já tinha não muda (nem preço nem nada). chave: a descrição normalizada
//   (utils/semelhancaMateriais.chaveDaDescricao); vezes: em quantos arquivos apareceu.
module.exports = async (client) => {
  await client.query('ALTER TABLE acervo_treino ADD COLUMN IF NOT EXISTS disciplina VARCHAR(40)');
  // A trava de situação só é refeita quando ainda não aceita 'ignorado' (a da 2.0-49 tinha só 'lido'/'erro').
  // Antes era DROP + ADD a cada partida do backend: trava exclusiva na tabela e varredura de todas as linhas
  // sempre, e qualquer falha ali derrubava a subida (revisão de 11/2026).
  await client.query(`
    DO $$
    DECLARE def TEXT;
    BEGIN
      SELECT pg_get_constraintdef(c.oid) INTO def FROM pg_constraint c
       WHERE c.conrelid = 'acervo_treino'::regclass AND c.conname = 'acervo_treino_situacao_check';
      IF def IS NULL OR def NOT LIKE '%''lido''%' OR def NOT LIKE '%''erro''%' OR def NOT LIKE '%''ignorado''%' THEN
        IF def IS NOT NULL THEN
          ALTER TABLE acervo_treino DROP CONSTRAINT acervo_treino_situacao_check;
        END IF;
        ALTER TABLE acervo_treino ADD CONSTRAINT acervo_treino_situacao_check CHECK (situacao IN ('lido', 'erro', 'ignorado'));
      END IF;
    END $$;
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_acervo_treino_disciplina ON acervo_treino(disciplina)');
  await client.query(`
    CREATE TABLE IF NOT EXISTS acervo_materiais (
      id SERIAL PRIMARY KEY,
      chave VARCHAR(300) NOT NULL UNIQUE,
      descricao VARCHAR(300) NOT NULL,
      unidade VARCHAR(10),
      disciplina VARCHAR(40) NOT NULL,
      categoria VARCHAR(50),
      preco_ref NUMERIC(12,2),
      material_id INTEGER REFERENCES materiais(id) ON DELETE SET NULL,
      arquivo TEXT,
      vezes INTEGER NOT NULL DEFAULT 1,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_acervo_materiais_disciplina ON acervo_materiais(disciplina)');
};
