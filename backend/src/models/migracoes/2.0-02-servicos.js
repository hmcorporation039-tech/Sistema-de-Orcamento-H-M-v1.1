// Versão 2.0 — Fase 1B: base única de serviços de mão de obra.
//
// Traz os itens de mao_de_obra_itens (serviços digitados nas propostas) para
// precos_mao_de_obra_referencia como serviços "livres" (origem 'proposta',
// código `livre_<id>`), ao lado dos 192 padrão. A tabela antiga NÃO é apagada
// e continua sendo escrita ao salvar proposta (utils/servicosBase.js).
//
// Idempotente: colunas com ADD COLUMN IF NOT EXISTS; o código livre é fixo
// pelo id antigo (ON CONFLICT DO NOTHING) e uma descrição que já existe na
// base — padrão, livre, desativado ou fundido — é pulada. Rodar de novo só
// importa itens antigos que ainda não estejam lá; nada é sobrescrito.
const { codigoLivre, deduzirDisciplina } = require('../../utils/servicosBase');

module.exports = async (client) => {
  // a descrição do item livre aceita 300 caracteres (como mao_de_obra_itens)
  await client.query(`
    DO $$ BEGIN
      IF (SELECT character_maximum_length FROM information_schema.columns
           WHERE table_name = 'precos_mao_de_obra_referencia' AND column_name = 'descricao') < 300 THEN
        ALTER TABLE precos_mao_de_obra_referencia ALTER COLUMN descricao TYPE VARCHAR(300);
      END IF;
    END $$`);
  // origem: 'padrao' (lista canônica) | 'proposta' (livre); ativo=false tira da
  // lista suspensa; fundido_em = código do serviço que substitui este livre
  await client.query("ALTER TABLE precos_mao_de_obra_referencia ADD COLUMN IF NOT EXISTS origem VARCHAR(20) NOT NULL DEFAULT 'padrao'");
  await client.query('ALTER TABLE precos_mao_de_obra_referencia ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true');
  await client.query('ALTER TABLE precos_mao_de_obra_referencia ADD COLUMN IF NOT EXISTS fundido_em VARCHAR(50)');
  await client.query('ALTER TABLE precos_mao_de_obra_referencia ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP DEFAULT NOW()');
  // um livre por descrição (a busca ao salvar proposta compara assim)
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_servicos_livres_descricao
    ON precos_mao_de_obra_referencia (LOWER(TRIM(descricao))) WHERE origem = 'proposta'`);

  // Sinais para a disciplina: códigos padrão e subgrupos dos itens de
  // proposta com a mesma descrição (ver deduzirDisciplina).
  const { rows } = await client.query(`
    SELECT m.id, TRIM(m.descricao) AS descricao, m.unidade, m.valor_unitario, m.ativo, m.criado_em,
           COALESCE(array_agg(DISTINCT r.disciplina) FILTER (WHERE r.disciplina IS NOT NULL), '{}') AS disciplinas,
           COALESCE(array_agg(DISTINCT TRIM(pi.subgrupo)) FILTER (WHERE TRIM(COALESCE(pi.subgrupo, '')) <> ''), '{}') AS subgrupos
      FROM mao_de_obra_itens m
      LEFT JOIN proposta_itens pi ON LOWER(TRIM(pi.descricao)) = LOWER(TRIM(m.descricao))
      LEFT JOIN precos_mao_de_obra_referencia r ON r.codigo = pi.codigo AND r.origem = 'padrao'
     WHERE TRIM(COALESCE(m.descricao, '')) <> ''
       AND NOT EXISTS (SELECT 1 FROM precos_mao_de_obra_referencia x
                        WHERE x.codigo = 'livre_' || m.id OR LOWER(TRIM(x.descricao)) = LOWER(TRIM(m.descricao)))
     GROUP BY m.id
     ORDER BY m.id`);

  let importados = 0;
  for (const m of rows) {
    const disciplina = deduzirDisciplina({ disciplinasDosCodigos: m.disciplinas, subgrupos: m.subgrupos });
    const r = await client.query(
      `INSERT INTO precos_mao_de_obra_referencia (codigo, descricao, unidade, disciplina, valor_referencia, origem, ativo, criado_em)
       VALUES ($1, $2, $3, $4, $5, 'proposta', $6, COALESCE($7, NOW()))
       ON CONFLICT DO NOTHING`,
      [codigoLivre(m.id), m.descricao, String(m.unidade || 'un').slice(0, 10), disciplina,
       Number(m.valor_unitario) > 0 ? Number(m.valor_unitario) : null, m.ativo !== false, m.criado_em]
    );
    importados += r.rowCount;
  }
  if (importados) console.log(`Base única de serviços: ${importados} serviço(s) lançados em propostas importados`);
};
