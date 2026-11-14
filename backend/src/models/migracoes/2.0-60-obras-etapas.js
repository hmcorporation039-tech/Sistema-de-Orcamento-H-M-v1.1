// Revisão da aba Obras (2.42, 14/11/2026):
//   - obras.juntada_a: a obra repetida que foi juntada a outra (POST /obras/:id/juntar) fica "cancelada"
//     e aponta para a que ficou — a página dela mostra o link, e nada é apagado;
//   - a etapa anda sozinha: obra "contratada" que já tem medição ou OS passa para "execucao" (mesma regra
//     que o cronograma e o campo aplicam daqui em diante — utils/obras.js avancarStatusObra);
//   - nome de cliente lido errado do carimbo ("ENDEREÇO:", "00") nas análises e projetos antigos: a leitura
//     já foi corrigida em 29/10/2026 (services/compatibilizacaoAnalise.js, clienteValido), mas os registros
//     de antes continuavam com o rótulo como nome. Rótulo ("…:") ou só números não é cliente → NULL.
// Idempotente: ADD COLUMN IF NOT EXISTS e UPDATEs que só pegam o que ainda está errado.
module.exports = async (client) => {
  await client.query('ALTER TABLE obras ADD COLUMN IF NOT EXISTS juntada_a INTEGER REFERENCES obras(id) ON DELETE SET NULL');
  await client.query(`
    UPDATE obras o SET status = 'execucao', atualizado_em = NOW(), versao = versao + 1
     WHERE o.status = 'contratada'
       AND (EXISTS (SELECT 1 FROM obra_medicoes m WHERE m.obra_id = o.id)
         OR EXISTS (SELECT 1 FROM ordens_servico s WHERE s.obra_id = o.id))`);
  for (const tabela of ['analises_projeto', 'laudos_projetos']) {
    await client.query(`UPDATE ${tabela} SET cliente_nome = NULL
                         WHERE cliente_nome IS NOT NULL AND (btrim(cliente_nome) ~ ':$' OR btrim(cliente_nome) ~ '^[0-9[:space:].,/–-]+$')`);
  }
};
