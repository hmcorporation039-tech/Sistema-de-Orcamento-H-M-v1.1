// Regras aprendidas do projetista (2.49, 20/11/2026): cada instrução aplicada guarda os AJUSTES que fez por ambiente
// (o que havia × o que ficou, por componente; e o local da estrutura) — services/instrucoes/regrasProjetista.js. A mesma
// correção repetida vira sugestão de regra (agentes_sugestoes, tipo 'regra_projetista'), que só vale depois da aprovação
// do administrador. O tipo novo em agentes_sugestoes é ajustado em schema.js (a tabela nasce depois das migrações).
// Idempotente.
module.exports = async (client) => {
  await client.query(`ALTER TABLE analises_instrucoes ADD COLUMN IF NOT EXISTS ajustes JSONB NOT NULL DEFAULT '[]'::jsonb`);
};
