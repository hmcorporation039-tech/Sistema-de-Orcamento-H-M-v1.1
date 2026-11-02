// Vencimentos dos documentos da empresa (02/11/2026): além dos laudos entregues, a empresa tem prazos próprios
// que não podem passar em branco (certidões negativas, alvará, anuidade do CREA, seguro, certificado digital A1
// da NFS-e). Usam a mesma tabela, os mesmos avisos de 60/30 dias e a mesma tela dos laudos.
//   tipo   'laudo' (padrão, o que já existia) | 'empresa'
//   origem preenchida quando o sistema mesmo mantém a data (hoje só 'certificado_a1', lida do arquivo .pfx)
module.exports = async (client) => {
  await client.query("ALTER TABLE vencimentos_laudos ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'laudo'");
  await client.query('ALTER TABLE vencimentos_laudos ADD COLUMN IF NOT EXISTS origem VARCHAR(30)');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_vencimentos_origem ON vencimentos_laudos (origem) WHERE origem IS NOT NULL');
};
