// Aprendizado das NOTAS do desenho (item 8 do plano de melhorias, 02/11/2026): "tomadas baixas a 0,30 m do piso",
// "interruptores h=1,10 m" escritos nas notas gerais da prancha, e as alturas que o engenheiro confirma na tela do
// mapa do CAD. Guardados por escritório (o responsável técnico do carimbo; vazio = não identificado), viram SUGESTÃO
// de altura para o próximo desenho do mesmo projetista — nunca verdade: o que entra no orçamento continua sendo
// a confirmação do engenheiro (cad_simbolos_aprendidos / mapa do CAD).
//   escritorio: chave normalizada do responsável técnico ('' = carimbo sem responsável)
//   origem: 'nota' (lida do desenho) ou 'usuario' (confirmada na tela do mapa — vale mais)
//   vezes: em quantos arquivos a mesma altura apareceu; conflitos: quantas vezes veio outra altura
//          (com conflito a sugestão sai do uso até alguém confirmar)
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cad_notas_aprendidas (
      id SERIAL PRIMARY KEY,
      escritorio VARCHAR(120) NOT NULL DEFAULT '',
      simbolo VARCHAR(40) NOT NULL,
      altura_m NUMERIC(5,2) NOT NULL,
      texto VARCHAR(200),
      origem VARCHAR(10) NOT NULL DEFAULT 'nota' CHECK (origem IN ('nota', 'usuario')),
      vezes INTEGER NOT NULL DEFAULT 1,
      conflitos INTEGER NOT NULL DEFAULT 0,
      arquivo VARCHAR(200),
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW(),
      UNIQUE (escritorio, simbolo)
    )
  `);
};
