// Modelo 3D ilustrativo (versão 2.3) — services/modelo3d.
//   analises_projeto_arquitetura: o DWG/DXF da arquitetura enviado na análise
//     (o DWG é guardado já convertido em DXF, como em laudos_projetos_arquitetura);
//   modelos_3d: o HTML gerado (e a imagem do PDF) por origem, com a chave do
//     que entrou no modelo — enquanto nada muda, não recalcula;
//   propostas.modelo_3d_cliente: a proposta mostra o 3D ao cliente (página do
//     link de aprovação e imagem no PDF). Desligado por padrão: é escolha de quem orça.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS analises_projeto_arquitetura (
      analise_id INTEGER PRIMARY KEY REFERENCES analises_projeto(id) ON DELETE CASCADE,
      nome_arquivo VARCHAR(200) NOT NULL,
      conteudo BYTEA NOT NULL,
      resumo JSONB NOT NULL DEFAULT '{}',
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMP DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS modelos_3d (
      origem_tipo VARCHAR(10) NOT NULL CHECK (origem_tipo IN ('laudo', 'analise', 'proposta')),
      origem_id INTEGER NOT NULL,
      chave VARCHAR(64) NOT NULL,
      html TEXT NOT NULL,
      resumo JSONB NOT NULL DEFAULT '{}',
      imagem BYTEA,
      gerado_em TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (origem_tipo, origem_id)
    )
  `);
  await client.query('ALTER TABLE propostas ADD COLUMN IF NOT EXISTS modelo_3d_cliente BOOLEAN NOT NULL DEFAULT false');
};
