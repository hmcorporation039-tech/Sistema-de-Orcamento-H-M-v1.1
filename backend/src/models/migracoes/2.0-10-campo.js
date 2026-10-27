// Versão 2.0 — Fase 4J: ORDENS DE SERVIÇO de campo (app /campo no celular,
// funciona sem rede). Contrato em docs/CAMPO-API.md; regras em utils/campo.js.
//
// ordens_servico: uma OS por trabalho de campo de uma obra. `uuid` nasce no
// aparelho (ou no servidor, quando o escritório cria) e é o que impede
// duplicar quando a mesma OS chega duas vezes. `numero` OS-AAAA-NNNN é
// sequencial por ano, calculado sob trava dentro da transação do INSERT (sem
// buraco quando a transação é desfeita). O checklist (itens + respostas) fica
// em JSONB; `historico` guarda as respostas/observações/assinaturas
// substituídas (conflito entre aparelhos — nada some). Assinatura: nome,
// documento e o PNG na pasta da obra (Campo\<numero>\), caminho relativo à
// pasta da obra em `assinatura_arquivo`. A obra não pode ser excluída com OS
// (ON DELETE RESTRICT; obrasController conta as OS antes).
//
// os_fotos: uma linha por foto (uuid do aparelho, idempotente); o arquivo
// fica em Campo\<numero>\<uuid>.<ext>, caminho relativo à pasta da obra.
//
// campo_operacoes: cada operação da fila do app aplicada (op_uuid único) e o
// resultado devolvido — reenvio devolve o mesmo resultado sem aplicar de novo.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ordens_servico (
      id SERIAL PRIMARY KEY,
      uuid UUID NOT NULL UNIQUE,
      numero VARCHAR(20) NOT NULL UNIQUE,
      obra_id INTEGER NOT NULL REFERENCES obras(id) ON DELETE RESTRICT,
      titulo VARCHAR(200) NOT NULL,
      descricao TEXT,
      tipo VARCHAR(20) NOT NULL DEFAULT 'outro' CHECK (tipo IN ('instalacao', 'manutencao', 'vistoria', 'visita', 'outro')),
      disciplina VARCHAR(40),
      modelo_checklist VARCHAR(40),
      status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_execucao', 'concluida', 'cancelada')),
      responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      agendada_para DATE,
      iniciada_em TIMESTAMPTZ,
      concluida_em TIMESTAMPTZ,
      cancelada_em TIMESTAMPTZ,
      checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
      historico JSONB NOT NULL DEFAULT '[]'::jsonb,
      observacao_final TEXT,
      observacao_em TIMESTAMPTZ,
      assinatura_nome VARCHAR(150),
      assinatura_documento VARCHAR(30),
      assinatura_arquivo VARCHAR(300),
      assinada_em TIMESTAMPTZ,
      inicio_lat NUMERIC(9,6),
      inicio_lon NUMERIC(9,6),
      conclusao_lat NUMERIC(9,6),
      conclusao_lon NUMERIC(9,6),
      versao INTEGER NOT NULL DEFAULT 1,
      criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_os_obra ON ordens_servico(obra_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_os_responsavel ON ordens_servico(responsavel_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_os_atualizado ON ordens_servico(atualizado_em)');

  await client.query(`
    CREATE TABLE IF NOT EXISTS os_fotos (
      id SERIAL PRIMARY KEY,
      uuid UUID NOT NULL UNIQUE,
      os_id INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
      item_id VARCHAR(80),
      legenda VARCHAR(300),
      arquivo VARCHAR(300) NOT NULL,
      tipo_mime VARCHAR(20) NOT NULL,
      tirada_em TIMESTAMPTZ,
      lat NUMERIC(9,6),
      lon NUMERIC(9,6),
      tamanho INTEGER NOT NULL,
      criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_os_fotos_os ON os_fotos(os_id)');

  await client.query(`
    CREATE TABLE IF NOT EXISTS campo_operacoes (
      id SERIAL PRIMARY KEY,
      op_uuid UUID NOT NULL UNIQUE,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      os_id INTEGER REFERENCES ordens_servico(id) ON DELETE SET NULL,
      tipo VARCHAR(20) NOT NULL,
      resultado JSONB,
      aplicada_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_campo_operacoes_os ON campo_operacoes(os_id)');
};
