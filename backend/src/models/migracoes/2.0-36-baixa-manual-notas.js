// Notas a receber (02/11/2026): não existe tabela de contas a receber, a nota emitida É o valor a receber e o Pix
// ligado a ela (financeiro_movimentos.nota_id, migração 2.0-30) é o que quitou. Quando a nota foi paga por fora
// do Pix (TED, boleto, dinheiro, ou antes de o sistema ler o extrato) o administrador dá baixa na mão, com uma
// observação de como foi, e a nota sai da lista de abertas. Desfazer a baixa limpa as três colunas.
module.exports = async (client) => {
  await client.query('ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS baixa_manual_em TIMESTAMP');
  await client.query('ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS baixa_manual_obs VARCHAR(300)');
  await client.query('ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS baixa_manual_por INTEGER REFERENCES usuarios(id)');
};
