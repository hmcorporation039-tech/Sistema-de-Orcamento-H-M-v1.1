// Notas fiscais de serviço (versão 2.4, pedido do usuário em 31/10/2026):
// rascunho, duplicar ("clonador": muda só cliente, valores e datas), PDF com o
// papel timbrado da H&M, envio por e-mail, cancelamento e importação dos XML
// das notas já emitidas (SYSB1/ISSnet no padrão ABRASF e Emissor Nacional).
// A emissão direta na API nacional (certificado A1) é a etapa 2 — até lá a
// nota é emitida no nfse.gov.br e o XML importado aqui vira a nota emitida.
//
// tomador: retrato do cliente no momento da nota (nome, documento, IM, e-mail,
//   telefone e endereço em campos) — mudar o cadastro não muda nota já feita.
// padrao: 'nacional' (NFS-e Padrão Nacional, chave de 50 dígitos) ou 'abrasf'
//   (notas antigas do ISSnet DF: número + código de verificação).
// situacao: rascunho → emitida → cancelada | substituida.
module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS notas_fiscais (
      id SERIAL PRIMARY KEY,
      situacao VARCHAR(12) NOT NULL DEFAULT 'rascunho' CHECK (situacao IN ('rascunho', 'emitida', 'cancelada', 'substituida')),
      origem VARCHAR(10) NOT NULL DEFAULT 'sistema' CHECK (origem IN ('sistema', 'importada')),
      padrao VARCHAR(8) NOT NULL DEFAULT 'nacional' CHECK (padrao IN ('nacional', 'abrasf')),
      numero BIGINT,
      serie_dps VARCHAR(5),
      numero_dps BIGINT,
      chave_acesso VARCHAR(50),
      codigo_verificacao VARCHAR(60),
      data_emissao TIMESTAMPTZ,
      competencia DATE NOT NULL DEFAULT CURRENT_DATE,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      tomador JSONB NOT NULL DEFAULT '{}',
      servico_id INTEGER REFERENCES empresa_servicos_nfse(id) ON DELETE SET NULL,
      ctrib_nac CHAR(6),
      ctrib_mun VARCHAR(20),
      item_lista VARCHAR(10),
      nbs CHAR(9),
      cnae CHAR(7),
      servico_descricao TEXT,
      discriminacao TEXT NOT NULL DEFAULT '',
      codigo_municipio_prestacao CHAR(7),
      valor_servicos NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (valor_servicos >= 0),
      valor_deducoes NUMERIC(15,2) NOT NULL DEFAULT 0,
      desconto_incondicionado NUMERIC(15,2) NOT NULL DEFAULT 0,
      desconto_condicionado NUMERIC(15,2) NOT NULL DEFAULT 0,
      aliquota_iss NUMERIC(5,2),
      valor_iss NUMERIC(15,2) NOT NULL DEFAULT 0,
      iss_retido BOOLEAN NOT NULL DEFAULT FALSE,
      valor_pis NUMERIC(15,2) NOT NULL DEFAULT 0,
      valor_cofins NUMERIC(15,2) NOT NULL DEFAULT 0,
      valor_inss NUMERIC(15,2) NOT NULL DEFAULT 0,
      valor_ir NUMERIC(15,2) NOT NULL DEFAULT 0,
      valor_csll NUMERIC(15,2) NOT NULL DEFAULT 0,
      outras_retencoes NUMERIC(15,2) NOT NULL DEFAULT 0,
      valor_liquido NUMERIC(15,2) NOT NULL DEFAULT 0,
      observacoes TEXT,
      xml TEXT,
      nota_origem_id INTEGER REFERENCES notas_fiscais(id) ON DELETE SET NULL,
      cancelada_em TIMESTAMPTZ,
      motivo_cancelamento TEXT,
      ultimo_envio_em TIMESTAMPTZ,
      ultimo_envio_para VARCHAR(254),
      criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // dados do layout da NFS-e do ISSnet DF (o PDF segue o da nota oficial):
  // natureza da operação (ExigibilidadeISS 1–7), responsável pela retenção
  // (1 tomador, 2 intermediário), município de incidência, as "outras
  // informações" que o ISS imprime (Simples/PROCON), a chave da nota no Ambiente
  // de Dados Nacional e o link da nota no portal do ISS (vai no QR Code)
  await client.query(`
    ALTER TABLE notas_fiscais
      ADD COLUMN IF NOT EXISTS exigibilidade_iss SMALLINT,
      ADD COLUMN IF NOT EXISTS responsavel_retencao SMALLINT,
      ADD COLUMN IF NOT EXISTS municipio_incidencia CHAR(7),
      ADD COLUMN IF NOT EXISTS outras_informacoes TEXT,
      ADD COLUMN IF NOT EXISTS chave_nacional VARCHAR(50),
      ADD COLUMN IF NOT EXISTS link_consulta TEXT
  `);
  // a mesma nota não entra duas vezes (importar de novo o mesmo XML só atualiza)
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_notas_fiscais_chave ON notas_fiscais (chave_acesso) WHERE chave_acesso IS NOT NULL');
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_notas_fiscais_numero ON notas_fiscais (padrao, numero) WHERE numero IS NOT NULL');
  await client.query('CREATE INDEX IF NOT EXISTS idx_notas_fiscais_cliente ON notas_fiscais (cliente_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_notas_fiscais_competencia ON notas_fiscais (competencia DESC)');
};
