// Versão 2.0 — Fase 3G: CRONOGRAMA FÍSICO-FINANCEIRO e MEDIÇÕES por obra.
//
// obra_cronogramas  — um por obra: parâmetros (periodicidade mensal/semanal,
//                     data de início, custo do homem-hora e equipe usados na
//                     duração, critério do peso físico) e a proposta de base.
// obra_etapas       — etapas da obra (uma por sistema/disciplina da proposta,
//                     ou digitadas): valor (R$) e/ou peso (%), início e fim
//                     previstos, origem (seção/subgrupo de onde veio).
// obra_etapa_periodos — distribuição PREVISTA de cada etapa por período
//                     (início do mês ou segunda-feira da semana), em % da etapa.
// obra_medicoes     — medições REALIZADAS: por etapa e período, % físico
//                     acumulado e/ou valor medido no período. Nunca se apaga nem
//                     se altera uma medição: a correção é uma nova linha para a
//                     mesma etapa e período (substitui_id aponta a anterior); a
//                     vigente é a mais recente. A etapa apagada deixa a medição
//                     no histórico (etapa_id NULL, etapa_nome guardado).
// Regras puras em utils/cronograma.js. Idempotente: só CREATE ... IF NOT EXISTS.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS obra_cronogramas (
      id SERIAL PRIMARY KEY,
      obra_id INTEGER NOT NULL UNIQUE REFERENCES obras(id) ON DELETE CASCADE,
      proposta_id INTEGER REFERENCES propostas(id) ON DELETE SET NULL,
      periodicidade VARCHAR(10) NOT NULL DEFAULT 'mensal' CHECK (periodicidade IN ('mensal', 'semanal')),
      data_inicio DATE,
      criterio_peso VARCHAR(10) NOT NULL DEFAULT 'valor' CHECK (criterio_peso IN ('valor', 'manual')),
      custo_hh NUMERIC(10,2),
      equipe INTEGER,
      observacoes TEXT,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      gerado_em TIMESTAMP,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      versao INTEGER NOT NULL DEFAULT 1
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS obra_etapas (
      id SERIAL PRIMARY KEY,
      obra_id INTEGER NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
      proposta_id INTEGER REFERENCES propostas(id) ON DELETE SET NULL,
      ordem INTEGER NOT NULL DEFAULT 0,
      nome VARCHAR(200) NOT NULL,
      origem VARCHAR(200),
      valor NUMERIC(14,2),
      peso NUMERIC(7,4),
      mao_obra NUMERIC(14,2),
      dias_uteis INTEGER,
      inicio DATE,
      fim DATE,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      CHECK (fim IS NULL OR inicio IS NULL OR fim >= inicio)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_obra_etapas_obra ON obra_etapas(obra_id, ordem)');
  await client.query(`
    CREATE TABLE IF NOT EXISTS obra_etapa_periodos (
      id SERIAL PRIMARY KEY,
      etapa_id INTEGER NOT NULL REFERENCES obra_etapas(id) ON DELETE CASCADE,
      periodo DATE NOT NULL,
      percentual NUMERIC(7,4) NOT NULL DEFAULT 0,
      UNIQUE (etapa_id, periodo)
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS obra_medicoes (
      id SERIAL PRIMARY KEY,
      obra_id INTEGER NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
      etapa_id INTEGER REFERENCES obra_etapas(id) ON DELETE SET NULL,
      etapa_nome VARCHAR(200),
      data_medicao DATE NOT NULL,
      periodo DATE NOT NULL,
      percentual_acumulado NUMERIC(7,4),
      valor_medido NUMERIC(14,2),
      observacao TEXT,
      substitui_id INTEGER REFERENCES obra_medicoes(id) ON DELETE SET NULL,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      CHECK (percentual_acumulado IS NOT NULL OR valor_medido IS NOT NULL)
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_obra_medicoes_obra ON obra_medicoes(obra_id, periodo, etapa_id)');
};
