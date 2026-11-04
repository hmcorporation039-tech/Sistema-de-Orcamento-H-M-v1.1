// Legenda de prancha em PDF aprendida (versão 2.30 — pedido do usuário em 03/11/2026: "supere os limites encontrados").
// Até aqui só o DWG/DXF ensinava símbolos: a prancha em PDF não tem layer nem nome de bloco, e a folha sem legenda
// própria saía com zero símbolos. Agora cada linha de legenda lida num PDF (símbolo desenhado + descrição) fica guardada
// pela ASSINATURA do símbolo (cor, cheio/vazado, tamanho no papel, partes internas) e pelo ESCRITÓRIO do carimbo — o
// mesmo símbolo plotado pelo mesmo escritório tem o mesmo tamanho no papel. Na análise de um PDF desse escritório sem
// legenda nenhuma, ela conta os símbolos como SUGESTÃO (fica marcada para conferir, fora do orçamento até conferir).
//   chave: escritorio|assinatura arredondada; texto: a descrição da legenda; simbolo/disciplina/altura_m: o tipo pelo
//   texto (skills/_comum/cad/tiposDePonto.js); vezes: em quantos arquivos apareceu; conflitos: a mesma assinatura do
//   mesmo escritório com tipo diferente em outro arquivo (com conflito, a linha não é usada).
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS pdf_legendas_aprendidas (
      id SERIAL PRIMARY KEY,
      chave VARCHAR(300) NOT NULL UNIQUE,
      escritorio VARCHAR(120) NOT NULL,
      assinatura JSONB NOT NULL,
      texto VARCHAR(300) NOT NULL,
      simbolo VARCHAR(60),
      disciplina VARCHAR(40),
      altura_m NUMERIC(5,2),
      vezes INTEGER NOT NULL DEFAULT 1,
      conflitos INTEGER NOT NULL DEFAULT 0,
      arquivo TEXT,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_pdf_legendas_escritorio ON pdf_legendas_aprendidas(escritorio)');
};
