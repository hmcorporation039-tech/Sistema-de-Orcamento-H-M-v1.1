// Notas fiscais (02/11/2026, sugestões do item 9 do plano de melhorias):
//  - registro de quando o atestado de capacidade técnica foi enviado ao cliente e para quem
//    (notas_fiscais.atestado_enviado_em / atestado_enviado_para);
//  - recebimento ligado à nota: o Pix recebido (financeiro_movimentos) pode apontar para a nota que ele quitou
//    (financeiro_movimentos.nota_id). Opcional; nada é ligado sozinho, o administrador confirma na tela.
module.exports = async (client) => {
  await client.query('ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS atestado_enviado_em TIMESTAMPTZ');
  await client.query('ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS atestado_enviado_para VARCHAR(254)');
  await client.query('ALTER TABLE financeiro_movimentos ADD COLUMN IF NOT EXISTS nota_id INTEGER REFERENCES notas_fiscais(id) ON DELETE SET NULL');
  await client.query('CREATE INDEX IF NOT EXISTS idx_financeiro_movimentos_nota ON financeiro_movimentos (nota_id) WHERE nota_id IS NOT NULL');
};
