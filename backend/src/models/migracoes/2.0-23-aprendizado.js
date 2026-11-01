// Aprendizado do sistema (pedido do usuário em 01/11/2026: "ferramentas próprias que
// aprendam a cada projeto analisado, a cada orçamento feito", para depender menos de
// IA e de API de terceiros).
//
// cad_simbolos_aprendidos: cada linha da LEGENDA das pranchas lida num projeto (layer +
// forma do símbolo → tipo e altura). No próximo desenho do mesmo escritório, a planta
// sem legenda (outra prancha, outro pavimento) é reconhecida pelo que já foi lido.
//   chave: layer em maiúsculas | proporção | preenchimento (a escala muda; a forma não)
//   origem: 'legenda' (lida do desenho) ou 'usuario' (conferida/corrigida — vale mais)
//   vezes: em quantos arquivos apareceu igual; conflitos: quantas vezes outro tipo veio
//          para a mesma chave (com conflito, a chave não é usada até alguém conferir)
//
// material_aliases: descrição (normalizada) ou código "REF." de um item → material do
// catálogo, confirmado no orçamento. A próxima análise usa o material certo direto, sem
// a semelhança de texto (que confundia "cabo 2,5 mm²" com "cabo 1,5 mm²").
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cad_simbolos_aprendidos (
      id SERIAL PRIMARY KEY,
      chave VARCHAR(160) NOT NULL UNIQUE,
      layer VARCHAR(120) NOT NULL,
      medida NUMERIC(8,3)[] NOT NULL,
      fracao NUMERIC(5,3) NOT NULL DEFAULT 0,
      simbolo VARCHAR(40) NOT NULL,
      disciplina VARCHAR(40),
      altura_m NUMERIC(5,2),
      texto VARCHAR(200),
      origem VARCHAR(10) NOT NULL DEFAULT 'legenda' CHECK (origem IN ('legenda', 'usuario')),
      vezes INTEGER NOT NULL DEFAULT 1,
      conflitos INTEGER NOT NULL DEFAULT 0,
      arquivo VARCHAR(200),
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS material_aliases (
      id SERIAL PRIMARY KEY,
      chave VARCHAR(300) NOT NULL UNIQUE,
      descricao VARCHAR(300) NOT NULL,
      material_id INTEGER NOT NULL REFERENCES materiais(id) ON DELETE CASCADE,
      origem VARCHAR(12) NOT NULL DEFAULT 'proposta' CHECK (origem IN ('proposta', 'usuario', 'nota_fiscal')),
      vezes INTEGER NOT NULL DEFAULT 1,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_material_aliases_material ON material_aliases(material_id)');
};
