// Cadastro fiscal para a NFS-e Padrão Nacional (versão 2.4, etapa 1 — pedido
// do usuário em 31/10/2026, depois do estudo da Resolução CGSN 191/2026 e do
// levantamento do SYSB1). Só cadastro: a emissão vem na etapa 2.
//
// empresa_fiscal: uma linha só (id = 1) com o que a DPS pede do prestador e
//   não está em skills/_comum/empresa.js (razão social, CNPJ e endereço seguem
//   lá, fonte única do papel timbrado). CNAEs: os do cartão CNPJ (31/10/2026).
// empresa_servicos_nfse: os serviços que a H&M fatura (código de tributação
//   nacional, NBS, CNAE, descrição e alíquota) — cada nota escolhe um.
// clientes: endereço em campos (a DPS pede CEP, código IBGE do município etc.),
//   inscrições, e-mail para a nota e retenção do ISS pelo tomador.
// fiscal_servicos / fiscal_nbs / municipios_ibge: tabelas oficiais, carregadas
//   dos JSON de assets/fiscal (gerados do Anexo B do gov.br/nfse e da API do
//   IBGE). Arquivo novo = marca nova em umaVez, e a carga roda de novo.
const path = require('path');
const { umaVez } = require('../apoioMigracoes');

const PASTA = path.join(__dirname, '..', '..', 'assets', 'fiscal');
const lerTabela = (arquivo) => require(path.join(PASTA, arquivo)).linhas;

module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS fiscal_servicos (
      codigo CHAR(6) PRIMARY KEY,
      nivel VARCHAR(8) NOT NULL CHECK (nivel IN ('item', 'subitem', 'codigo')),
      descricao TEXT NOT NULL
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS fiscal_nbs (
      codigo CHAR(9) PRIMARY KEY,
      descricao TEXT NOT NULL
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS municipios_ibge (
      codigo CHAR(7) PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      uf CHAR(2) NOT NULL
    )
  `);
  await client.query('CREATE INDEX IF NOT EXISTS idx_municipios_ibge_nome ON municipios_ibge (uf, LOWER(nome))');

  // carga das tabelas oficiais: um INSERT por tabela (unnest), atualizando o
  // que já existe — nada é apagado (código que saiu da lista continua para as
  // notas antigas que o usam)
  await umaVez(client, 'fiscal-tabelas-anexob-20260122', async () => {
    const serv = lerTabela('servicos-nacionais.json');
    await client.query(
      `INSERT INTO fiscal_servicos (codigo, nivel, descricao)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[])
       ON CONFLICT (codigo) DO UPDATE SET nivel = EXCLUDED.nivel, descricao = EXCLUDED.descricao`,
      [serv.map(s => s[0]), serv.map(s => s[1]), serv.map(s => s[2])]
    );
    const nbs = lerTabela('nbs.json');
    await client.query(
      `INSERT INTO fiscal_nbs (codigo, descricao)
       SELECT * FROM unnest($1::text[], $2::text[])
       ON CONFLICT (codigo) DO UPDATE SET descricao = EXCLUDED.descricao`,
      [nbs.map(n => n[0]), nbs.map(n => n[1])]
    );
    return { servicos: serv.length, nbs: nbs.length };
  });
  await umaVez(client, 'fiscal-municipios-ibge-20261031', async () => {
    const mun = lerTabela('municipios-ibge.json');
    await client.query(
      `INSERT INTO municipios_ibge (codigo, nome, uf)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[])
       ON CONFLICT (codigo) DO UPDATE SET nome = EXCLUDED.nome, uf = EXCLUDED.uf`,
      [mun.map(m => m[0]), mun.map(m => m[1]), mun.map(m => m[2])]
    );
    return { municipios: mun.length };
  });

  // Prestador. Códigos da DPS (Anexo I do leiaute):
  //   op_simp_nac    1 não optante, 2 MEI, 3 ME/EPP (a H&M: porte ME)
  //   reg_ap_trib_sn 1 tributos federais e ISS pelo Simples; 2 federais pelo
  //                  Simples e ISS por fora; 3 tudo por fora
  //   reg_esp_trib   0 nenhum … 6 sociedade de profissionais
  //   serie_dps      série das DPS emitidas por este sistema [CONFERIR com o contador]
  // cnaes_secundarios: [{ codigo, descricao }]
  await client.query(`
    CREATE TABLE IF NOT EXISTS empresa_fiscal (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      inscricao_municipal VARCHAR(20),
      cnae_principal CHAR(7),
      cnae_principal_descricao VARCHAR(200),
      cnaes_secundarios JSONB NOT NULL DEFAULT '[]',
      op_simp_nac SMALLINT NOT NULL DEFAULT 3 CHECK (op_simp_nac IN (1, 2, 3)),
      reg_ap_trib_sn SMALLINT NOT NULL DEFAULT 1 CHECK (reg_ap_trib_sn IN (1, 2, 3)),
      reg_esp_trib SMALLINT NOT NULL DEFAULT 0 CHECK (reg_esp_trib BETWEEN 0 AND 6),
      codigo_municipio CHAR(7) NOT NULL DEFAULT '5300108',
      ambiente VARCHAR(12) NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
      serie_dps VARCHAR(5) NOT NULL DEFAULT '1',
      proximo_numero_dps BIGINT NOT NULL DEFAULT 1 CHECK (proximo_numero_dps > 0),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `);
  await client.query('INSERT INTO empresa_fiscal (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
  // CNAEs do cartão CNPJ (emitido em 31/10/2026) — uma vez só; depois, a tela edita
  await umaVez(client, 'fiscal-cnaes-cartao-cnpj-20261031', async () => {
    const { principal, secundarios } = require(path.join(PASTA, 'cnaes-hm.json'));
    await client.query(
      `UPDATE empresa_fiscal SET cnae_principal = $1, cnae_principal_descricao = $2, cnaes_secundarios = $3
        WHERE id = 1 AND cnae_principal IS NULL`,
      [principal.codigo, principal.descricao, JSON.stringify(secundarios)]
    );
    return { secundarios: secundarios.length };
  });

  await client.query(`
    CREATE TABLE IF NOT EXISTS empresa_servicos_nfse (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(100) NOT NULL,
      ctrib_nac CHAR(6) NOT NULL,
      ctrib_mun VARCHAR(3),
      nbs CHAR(9),
      cnae CHAR(7),
      aliquota_iss NUMERIC(5,2) CHECK (aliquota_iss IS NULL OR aliquota_iss BETWEEN 0 AND 5),
      descricao_padrao TEXT,
      padrao BOOLEAN NOT NULL DEFAULT FALSE,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // no máximo um serviço padrão (o que a nota já abre escolhido)
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_empresa_servicos_nfse_padrao ON empresa_servicos_nfse (padrao) WHERE padrao AND ativo');

  // Dados passados pelo usuário em 31/10/2026 — uma vez só; depois, a tela edita.
  // CF/DF do comprovante do Cadastro Fiscal do DF: no DF é o mesmo número para
  // ICMS e ISS, e é ele que vai como inscrição municipal na DPS. Serviços: os três
  // códigos que o usuário mandou usar (NBS fica para o contador).
  await umaVez(client, 'fiscal-cfdf-servicos-20261031', async () => {
    await client.query("UPDATE empresa_fiscal SET inscricao_municipal = '0786440800236' WHERE id = 1 AND inscricao_municipal IS NULL");
    const { rows: [{ n }] } = await client.query('SELECT count(*)::int AS n FROM empresa_servicos_nfse');
    if (n) return { servicos: 0 };
    await client.query(
      `INSERT INTO empresa_servicos_nfse (nome, ctrib_nac, cnae, padrao) VALUES
         ('Serviços de engenharia', '070101', '7112000', TRUE),
         ('Execução de obra por empreitada', '070202', NULL, FALSE),
         ('Projetos de engenharia', '070302', '7112000', FALSE)`
    );
    return { servicos: 3 };
  });

  // Tomador. `endereco` (texto livre) continua: é o que sai na proposta.
  for (const [coluna, tipo] of [
    ['cep', 'CHAR(8)'],
    ['logradouro', 'VARCHAR(200)'],
    ['numero', 'VARCHAR(20)'],
    ['complemento', 'VARCHAR(100)'],
    ['bairro', 'VARCHAR(100)'],
    ['codigo_municipio', 'CHAR(7)'],
    ['inscricao_municipal', 'VARCHAR(20)'],
    ['inscricao_estadual', 'VARCHAR(20)'],
    ['email_nota', 'VARCHAR(100)'],
    ['retem_iss', 'BOOLEAN NOT NULL DEFAULT FALSE'],
  ]) {
    await client.query(`ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ${coluna} ${tipo}`);
  }
};
