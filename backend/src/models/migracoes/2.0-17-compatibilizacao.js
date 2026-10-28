// Compatibilização por posição entre os DWG/DXF de um pacote de projeto
// (versão 2.3 — utils/compatibilidadeEspacial.js):
//   analises_projeto.conflitos: componentes próximos demais, no mesmo ponto e
//     traçados de energia × telecom sobrepostos, com a posição (para a tabela e o DXF);
//   analises_projeto.compatibilizacao: desenho de referência e como cada um foi alinhado.
module.exports = async (client) => {
  await client.query("ALTER TABLE analises_projeto ADD COLUMN IF NOT EXISTS conflitos JSONB NOT NULL DEFAULT '[]'");
  await client.query('ALTER TABLE analises_projeto ADD COLUMN IF NOT EXISTS compatibilizacao JSONB');
};
