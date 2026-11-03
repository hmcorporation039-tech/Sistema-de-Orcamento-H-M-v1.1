// Modelos 3D órfãos de ANTES dos gatilhos da 2.0-18 (02/11/2026). A 2.0-18 apaga o modelo junto com
// a origem daqui para a frente, mas não limpou o que já tinha ficado para trás: no banco de teste
// sobrou o 3D (1 MB de HTML) de uma análise excluída antes do gatilho existir, e esse HTML ia em
// todo backup. A produção, que gerou modelos antes da 2.3, pode ter o mesmo resíduo.
// Apaga só a linha de modelos_3d cuja origem (análise, projeto/laudo ou proposta — os mesmos tipos
// dos gatilhos) não existe mais; origem_tipo desconhecido fica como está.
// Idempotente: depois da primeira vez não acha mais nada (e os gatilhos impedem órfão novo).
const ORIGENS = [
  ['analise', 'analises_projeto'],
  ['laudo', 'laudos_projetos'],
  ['proposta', 'propostas'],
];

module.exports = async (client) => {
  for (const [tipo, tabela] of ORIGENS) {
    const { rowCount } = await client.query(
      `DELETE FROM modelos_3d m
        WHERE m.origem_tipo = $1
          AND NOT EXISTS (SELECT 1 FROM ${tabela} o WHERE o.id = m.origem_id)`,
      [tipo]
    );
    if (rowCount) console.log(`Migração 2.0-40: ${rowCount} modelo(s) 3D apagado(s) — a origem (${tipo}) já tinha sido excluída`);
  }
};
