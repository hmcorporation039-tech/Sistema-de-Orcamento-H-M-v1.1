// Nota fiscal ligada à proposta (02/11/2026): a nota passa a saber de qual proposta veio.
// Daí o sistema chega à obra (propostas.obra_id), ao local e aos itens reais vendidos, e o
// atestado de capacidade técnica usa esses dados em vez de depender só do texto da nota.
// A coluna é opcional (nota antiga e nota avulsa seguem sem proposta) e nada é preenchido
// por palpite: o vínculo é feito pelo administrador.
module.exports = async (client) => {
  await client.query(`
    ALTER TABLE notas_fiscais
      ADD COLUMN IF NOT EXISTS proposta_id INTEGER REFERENCES propostas(id) ON DELETE SET NULL
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_notas_fiscais_proposta ON notas_fiscais (proposta_id) WHERE proposta_id IS NOT NULL');
};
