// Catálogo de componentes de quadros por fabricante (pedido do usuário em
// 29/10/2026: "informar os fabricantes dos componentes, para que o sistema
// busque medidas oficiais de cada componente, para melhor organização dentro
// dos quadros e aproveitamento do espaço interno").
//
// componentes_quadro: o que a H&M cadastrou à mão (origem 'usuario') ou a IA
//   achou no datasheet do fabricante (origem 'pesquisa_ia', sempre
//   verificado = false até alguém conferir e aprovar na tela). Os campos são
//   os do registro do contrato da skill de quadros (skills/quadros/dados/
//   catalogo-componentes.json, que é só leitura); o banco SOBREPÕE o JSON da
//   skill pelo par (fabricante, referência). Medidas em mm: largura (ao longo
//   do trilho) × altura × profundidade (a partir do trilho/placa).
//   especificacao_pesquisada: o pedido que gerou a pesquisa da IA (fabricante|
//   tipo|especificação normalizados) — a busca em lote não repete a mesma.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS componentes_quadro (
      id SERIAL PRIMARY KEY,
      fabricante VARCHAR(80) NOT NULL,
      linha VARCHAR(120),
      referencia VARCHAR(80) NOT NULL,
      tipo VARCHAR(40) NOT NULL,
      descricao VARCHAR(300),
      polos SMALLINT,
      corrente_a NUMERIC(10,2),
      corrente_min_a NUMERIC(10,2),
      curva VARCHAR(10),
      icu_ka NUMERIC(8,2),
      sensibilidade_ma NUMERIC(8,1),
      classe_dps VARCHAR(10),
      imax_ka NUMERIC(8,2),
      in_ka NUMERIC(8,2),
      uc_v NUMERIC(8,1),
      potencia_kw NUMERIC(10,2),
      corrente_ac3_a NUMERIC(10,2),
      tensao_bobina VARCHAR(40),
      saida_a NUMERIC(8,2),
      pontos JSONB,
      largura_mm NUMERIC(8,1),
      altura_mm NUMERIC(8,1),
      profundidade_mm NUMERIC(8,1),
      modulos_din NUMERIC(5,1),
      montagem VARCHAR(10),
      perda_w NUMERIC(8,2),
      consumo_24v_ma NUMERIC(8,1),
      peso_kg NUMERIC(8,3),
      fonte_url VARCHAR(1000),
      fonte_documento VARCHAR(300),
      obs TEXT,
      verificado BOOLEAN NOT NULL DEFAULT FALSE,
      origem VARCHAR(20) NOT NULL DEFAULT 'usuario',
      verificado_por VARCHAR(120),
      verificado_em TIMESTAMPTZ,
      especificacao_pesquisada VARCHAR(400),
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await client.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'componentes_quadro_origem_ck') THEN
      ALTER TABLE componentes_quadro ADD CONSTRAINT componentes_quadro_origem_ck CHECK (origem IN ('usuario', 'pesquisa_ia', 'catalogo_hm'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'componentes_quadro_montagem_ck') THEN
      ALTER TABLE componentes_quadro ADD CONSTRAINT componentes_quadro_montagem_ck CHECK (montagem IS NULL OR montagem IN ('din', 'placa', 'porta', 'piso'));
    END IF;
  END $$`);
  // um registro por código comercial de cada fabricante (sem diferenciar maiúsculas)
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS componentes_quadro_fabricante_referencia_uk ON componentes_quadro (lower(fabricante), lower(referencia))');
  await client.query('CREATE INDEX IF NOT EXISTS componentes_quadro_tipo_fabricante_idx ON componentes_quadro (tipo, lower(fabricante))');
  await client.query('CREATE INDEX IF NOT EXISTS componentes_quadro_pesquisa_idx ON componentes_quadro (especificacao_pesquisada) WHERE especificacao_pesquisada IS NOT NULL');
};
