// Pasta por cliente (versão 2.3, pedido do usuário em 28/10/2026): tudo de um
// cliente — o que o sistema gera e o que o cliente manda — numa pasta só, no
// servidor, monitorada para avisar arquivo novo ou alterado.
//   Clientes\<cliente>\
//     Recebidos do cliente\
//     Obras\<obra>\{Recebidos do cliente, Projeto, Projetos\<disc>, Laudos\<disc>, Propostas, Contratos}
//     Projetos\  Laudos\  Propostas\  Contratos\      (itens sem obra)
//   Clientes\_Sem cliente\...                          (obra/item sem cliente)
//
// clientes.pasta: nome da pasta do cliente (renomeia junto com o cliente).
// <tabela>.pasta_base: pasta-mãe do item, RELATIVA à raiz dos clientes (ex.:
//   "Paróquia X\Obras"). NULL = item ainda no lugar antigo (Arquivos do
//   Sistema\Obras|Projetos|Laudos) até o script de mudança de pastas rodar.
// pasta_arquivos: retrato da pasta de cada cliente (o que o sistema gravou e
//   o que apareceu de fora) — base das "novidades".
// pastas_movidas: registro de cada pasta levada para a do cliente (desfazer).
module.exports = async (client) => {
  await client.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS pasta VARCHAR(200)');
  // posições reais (alinhadas à arquitetura de referência) dos componentes e
  // traçados dos DWG/DXF da análise — o 3D mostra o projeto como desenhado, não estimado
  await client.query('ALTER TABLE analises_projeto ADD COLUMN IF NOT EXISTS espacial JSONB');
  for (const t of ['obras', 'analises_projeto', 'laudos_projetos']) {
    await client.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS pasta_base VARCHAR(600)`);
  }
  await client.query(`
    CREATE TABLE IF NOT EXISTS pasta_arquivos (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
      obra_id INTEGER REFERENCES obras(id) ON DELETE SET NULL,
      caminho VARCHAR(1000) NOT NULL,
      tamanho BIGINT NOT NULL DEFAULT 0,
      modificado_em TIMESTAMPTZ,
      origem VARCHAR(10) NOT NULL DEFAULT 'externo' CHECK (origem IN ('sistema', 'externo')),
      situacao VARCHAR(10) NOT NULL DEFAULT 'conhecido' CHECK (situacao IN ('conhecido', 'novo', 'alterado', 'removido')),
      detectado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      visto_em TIMESTAMPTZ,
      visto_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `);
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_pasta_arquivos_caminho ON pasta_arquivos (LOWER(caminho))');
  await client.query("CREATE INDEX IF NOT EXISTS idx_pasta_arquivos_pendentes ON pasta_arquivos (cliente_id, obra_id) WHERE situacao <> 'conhecido'");
  await client.query(`
    CREATE TABLE IF NOT EXISTS pastas_movidas (
      id SERIAL PRIMARY KEY,
      tabela VARCHAR(40) NOT NULL,
      registro_id INTEGER NOT NULL,
      origem TEXT NOT NULL,
      destino TEXT NOT NULL,
      pasta_antes VARCHAR(200),
      pasta_obra_antes INTEGER,
      movido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      desfeito_em TIMESTAMPTZ
    )
  `);
};
