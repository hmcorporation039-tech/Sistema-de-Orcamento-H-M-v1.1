// Códigos de serviço das skills chegam a 26 caracteres (spda_ensaio_continuidade,
// antena_amplificador_linha…): com proposta_itens.codigo VARCHAR(20), gerar o
// orçamento do laudo dava erro 500. Mesma correção da 1.8.2 (idempotente).
module.exports = async (client) => {
  await client.query(`
    DO $$ BEGIN
      IF (SELECT character_maximum_length FROM information_schema.columns
           WHERE table_name = 'proposta_itens' AND column_name = 'codigo') < 50 THEN
        ALTER TABLE proposta_itens ALTER COLUMN codigo TYPE VARCHAR(50);
      END IF;
    END $$;
  `);
};
