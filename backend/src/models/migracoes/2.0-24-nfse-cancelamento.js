// Cancelamento direto na API da NFS-e Nacional (evento 101101): guarda o
// protocolo e o XML do evento devolvidos pela Receita e se o cancelamento foi
// feito pelo sistema ('receita') ou só registrado depois do portal ('manual').
module.exports = async (client) => {
  await client.query(`ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS cancelamento_via VARCHAR(10)`);
  await client.query(`ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS cancelamento_codigo SMALLINT`);
  await client.query(`ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS cancelamento_protocolo VARCHAR(60)`);
  await client.query(`ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS cancelamento_xml TEXT`);
};
