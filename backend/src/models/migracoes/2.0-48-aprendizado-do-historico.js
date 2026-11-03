// Aprendizado do histórico (plano "sistema autônomo", 03/11/2026). Os vínculos descrição → material
// (material_aliases, 2.0-23) só eram gravados nas propostas salvas depois de 01/11/2026: as propostas
// anteriores, com itens já confirmados no catálogo, não ensinavam nada. Uma vez só (umaVez), cada item
// CONFIRMADO com material de uma proposta já gravada vira vínculo — o mesmo que services/aprendizadoMateriais
// .registrar faz ao salvar. A mesma descrição em várias propostas soma as vezes; ligada a materiais
// diferentes, vale a da proposta mais recente (o usuário corrigiu), como no registrar.
const { umaVez } = require('../apoioMigracoes');
const { chaveDaDescricao } = require('../../utils/semelhancaMateriais');

module.exports = async (client) => {
  await umaVez(client, 'migracao_2.0-48_vinculos_das_propostas_antigas', async () => {
    const { rows } = await client.query(
      `SELECT i.descricao, i.material_id FROM proposta_itens i JOIN materiais m ON m.id = i.material_id
        WHERE i.status = 'confirmado' AND i.material_id IS NOT NULL ORDER BY i.proposta_id, i.id`);
    const porChave = new Map();
    for (const r of rows) {
      const chave = chaveDaDescricao(r.descricao);
      if (chave.length < 4) continue;
      const o = porChave.get(chave);
      if (!o) porChave.set(chave, { descricao: String(r.descricao).slice(0, 300), material_id: r.material_id, vezes: 1 });
      else porChave.set(chave, { descricao: o.descricao, material_id: r.material_id, vezes: o.material_id === r.material_id ? o.vezes + 1 : 1 });
    }
    let gravados = 0;
    for (const [chave, v] of porChave) {
      // o vínculo que já existe (gravado ao salvar uma proposta) não muda: ele é mais recente que o histórico
      const r = await client.query(
        `INSERT INTO material_aliases (chave, descricao, material_id, origem, vezes) VALUES ($1, $2, $3, 'proposta', $4)
         ON CONFLICT (chave) DO NOTHING`, [chave, v.descricao, v.material_id, v.vezes]);
      gravados += r.rowCount;
    }
    return { itens: rows.length, vinculos: gravados };
  });
};
