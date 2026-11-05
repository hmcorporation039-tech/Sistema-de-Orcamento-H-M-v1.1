// Catálogo sem item a R$ 0,00 (revisão geral de 04/11/2026). A regra vale desde 28/10/2026
// (services/catalogoAutoCadastro.js, ehItemDeCatalogo), mas os itens cadastrados antes dela continuavam ativos: na
// produção, 25 materiais a zero — 19 de um orçamento gerado de laudo em 25/10 ("Disjuntor 1P 10 A", "Caixa 4×2"…) e 6
// de propostas de setembro com valor zero. Na busca do "+ catálogo" eles apareciam como preço válido. Uma vez só, sai do
// catálogo (ativo = false; não apaga, o item da proposta continua com o vínculo) o material ativo sem preço de venda nem
// de compra que nenhum kit (composicao_itens) usa. O usado em kit fica: o kit já o mostra "a cotar" e desativar só
// trocaria a mensagem e soltaria o vínculo que o engenheiro vai precificar.
const { umaVez } = require('../apoioMigracoes');

module.exports = async (client) => {
  await umaVez(client, 'migracao_2.0-52_catalogo_sem_preco_zero', async () => {
    const { rows } = await client.query(
      `UPDATE materiais m SET ativo = false, atualizado_em = NOW()
        WHERE m.ativo = true AND COALESCE(m.preco, 0) <= 0 AND COALESCE(m.preco_compra, 0) <= 0
          AND NOT EXISTS (SELECT 1 FROM composicao_itens c WHERE c.material_id = m.id)
        RETURNING m.id`);
    return { desativados: rows.map(r => r.id) };
  });
};
