// Campo de instruções da análise (2.47, 20/11/2026): o engenheiro escreve o que mudar ("acrescente 2 câmeras na capela",
// "leve o rack para o CPD") e o sistema aplica e recalcula a MESMA análise. Esta tabela guarda cada instrução aplicada,
// com o que havia ANTES (edições do mapa por arquivo e critérios do projetista) para o "Desfazer" e o DEPOIS para
// saber se alguém editou a análise por outro caminho (3D, mapa) em seguida (controllers/projetos/instrucoes.js).
// As frases que a IA ajudou a entender viram sugestão de vocabulário (agentes_sugestoes, tipo 'instrucao'): só valem
// depois que o administrador aprova. Idempotente.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS analises_instrucoes (
      id SERIAL PRIMARY KEY,
      analise_id INTEGER NOT NULL REFERENCES analises_projeto(id) ON DELETE CASCADE,
      texto TEXT NOT NULL,
      origem VARCHAR(12) NOT NULL DEFAULT 'regras',
      operacoes JSONB NOT NULL DEFAULT '[]'::jsonb,
      antes JSONB NOT NULL DEFAULT '{}'::jsonb,
      depois JSONB,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      desfeita_em TIMESTAMPTZ,
      desfeita_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
    )`);
  await client.query('CREATE INDEX IF NOT EXISTS idx_analises_instrucoes_analise ON analises_instrucoes(analise_id, id DESC)');
  // o tipo 'instrucao' em agentes_sugestoes é ajustado em schema.js, logo depois de criar essa tabela (ela nasce
  // depois das migrações 2.0-NN; aqui, num banco vazio, ainda não existe).
};
