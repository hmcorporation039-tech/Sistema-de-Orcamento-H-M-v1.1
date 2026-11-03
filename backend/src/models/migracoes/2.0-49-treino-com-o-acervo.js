// Treino com as obras já feitas pela H&M (plano "sistema autônomo", 03/11/2026: "vasculhe a pasta clientes, lá
// temos muitos projetos que já foram executados"). Sem IA: o próprio leitor do sistema lê cada DWG/DXF da pasta
// dos clientes (services/treinoAcervo.js) e o que o desenho ensina vai para o banco — nunca para o repositório.
//
// cad_blocos_aprendidos: nome do BLOCO → o que ele é, lido da legenda da prancha ("TUG-30" ao lado de "Tomada baixa
//   2P+T a 30 cm"). Por escritório (responsável técnico do carimbo, utils/escritorioDoProjeto.js; '' = não diz).
//   No próximo desenho do mesmo escritório, a prancha sem legenda reconhece o bloco pelo nome. De outro escritório,
//   só quando todos os escritórios que usam o nome concordam na disciplina (services/blocosAprendidos.js).
//   vezes: em quantos arquivos veio igual; conflitos: quantas vezes veio de outra disciplina (sai do uso)
// acervo_treino: cada arquivo da pasta já lido (caminho, tamanho e data): a leitura retoma de onde parou e só relê
//   o arquivo que mudou. resumo: o que ele ensinou (ou o erro).
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS cad_blocos_aprendidos (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(120) NOT NULL,
      escritorio VARCHAR(120) NOT NULL DEFAULT '',
      descricao VARCHAR(200) NOT NULL,
      disciplina VARCHAR(40),
      origem VARCHAR(10) NOT NULL DEFAULT 'legenda' CHECK (origem IN ('legenda', 'usuario')),
      vezes INTEGER NOT NULL DEFAULT 1,
      conflitos INTEGER NOT NULL DEFAULT 0,
      arquivo VARCHAR(200),
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW(),
      UNIQUE (nome, escritorio)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_cad_blocos_aprendidos_nome ON cad_blocos_aprendidos(nome)');
  await client.query(`
    CREATE TABLE IF NOT EXISTS acervo_treino (
      id SERIAL PRIMARY KEY,
      caminho TEXT NOT NULL UNIQUE,
      tamanho BIGINT NOT NULL,
      modificado_em TIMESTAMP NOT NULL,
      tipo VARCHAR(8) NOT NULL,
      situacao VARCHAR(10) NOT NULL CHECK (situacao IN ('lido', 'erro')),
      resumo JSONB NOT NULL DEFAULT '{}'::jsonb,
      lido_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  // a mesma prancha copiada em várias pastas (obra, "Recebidos", "_Sem cliente") ensina uma vez só: senão três cópias
  // contavam como três projetos concordando (vezes = 3)
  await client.query('ALTER TABLE acervo_treino ADD COLUMN IF NOT EXISTS hash CHAR(40)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_acervo_treino_hash ON acervo_treino(hash)');
};
