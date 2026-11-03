// Catálogo de equipamentos de climatização (fase 4 do roteiro de 02/11/2026 —
// "catálogo de equipamentos de HVAC", no padrão de componentes_quadro).
//
// equipamentos_catalogo: chillers, fancoils/AHU, splits, VRF, self, caixas VAV,
// bombas, torres e ventiladores com os dados técnicos do fabricante. A skill de
// climatização (skills/climatizacao) recebe a tabela em dados.catalogo_equipamentos
// (controllers/laudos/comum.js) e escolhe o menor equipamento do tipo que atende a
// capacidade, preferindo os verificados.
//   tipo: chave da skill (split, vrf_evap, vrf_cond, self, fancoil, vav, chiller,
//     torre, bomba, exaustor);
//   dados: JSON com os dados técnicos ({ capacidade_kw, cop, iplv, vazao_m3h,
//     pressao_pa, potencia_kw, refrigerante, tensao_v, ... });
//   fonte_url / fonte_documento: onde os dados foram conferidos (datasheet, certificado
//     AHRI); verificado só com a fonte e só pelo administrador.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS equipamentos_catalogo (
      id SERIAL PRIMARY KEY,
      tipo VARCHAR(30) NOT NULL,
      fabricante VARCHAR(80) NOT NULL,
      modelo VARCHAR(120) NOT NULL,
      descricao VARCHAR(300),
      dados JSONB NOT NULL DEFAULT '{}'::jsonb,
      fonte_url VARCHAR(1000),
      fonte_documento VARCHAR(300),
      obs TEXT,
      verificado BOOLEAN NOT NULL DEFAULT FALSE,
      origem VARCHAR(20) NOT NULL DEFAULT 'usuario',
      verificado_por VARCHAR(120),
      verificado_em TIMESTAMPTZ,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  await client.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipamentos_catalogo_origem_ck') THEN
      ALTER TABLE equipamentos_catalogo ADD CONSTRAINT equipamentos_catalogo_origem_ck CHECK (origem IN ('usuario', 'pesquisa_ia', 'catalogo_hm'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipamentos_catalogo_tipo_ck') THEN
      ALTER TABLE equipamentos_catalogo ADD CONSTRAINT equipamentos_catalogo_tipo_ck CHECK (tipo IN ('split', 'vrf_evap', 'vrf_cond', 'self', 'fancoil', 'vav', 'chiller', 'torre', 'bomba', 'exaustor'));
    END IF;
  END $$`);
  // um registro por modelo de cada fabricante (sem diferenciar maiúsculas)
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS equipamentos_catalogo_fabricante_modelo_uk ON equipamentos_catalogo (lower(fabricante), lower(modelo))');
  await client.query('CREATE INDEX IF NOT EXISTS equipamentos_catalogo_tipo_idx ON equipamentos_catalogo (tipo, lower(fabricante))');
  await client.query('CREATE INDEX IF NOT EXISTS equipamentos_catalogo_usuario_idx ON equipamentos_catalogo (usuario_id)');
};
