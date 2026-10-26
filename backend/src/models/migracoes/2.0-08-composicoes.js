// Versão 2.0 — Fase 3H: composições e kits (composição de custo unitário).
//
// composicoes: o kit (código único, descrição, unidade, disciplina, observação,
//   ativo). Histórico simples: `versao` sobe a cada edição (bloqueio otimista
//   na tela) e `atualizado_em`; os itens não são versionados.
// composicao_itens: cada linha é um material do catálogo (material_id) ou um
//   serviço da base única (servico_codigo → precos_mao_de_obra_referencia),
//   com coeficiente. `descricao`/`unidade` são a cópia do item no momento do
//   vínculo — continuam valendo se o material sair do catálogo — e são o
//   próprio item no "material sem catálogo" (material_id nulo, a cotar).
//   Preço NÃO é gravado: o custo é sempre calculado (utils/composicoes.js).
//
// Kits-modelo (utils/composicoes.js KITS_MODELO): semeados UMA vez — a marca
// 'composicoes_kits_modelo' em configuracoes impede recriar um kit que o
// usuário editou ou apagou; o código fixo (ON CONFLICT DO NOTHING) impede
// duplicar mesmo se a marca for apagada. Materiais são casados ao catálogo
// pela descrição (compararComCatalogo + mesma unidade — ou rolo/caixa com a
// metragem escrita para item em metro — + mesmas medidas); o
// que não casa entra como material sem catálogo.
const { KITS_MODELO, casarComCatalogo } = require('../../utils/composicoes');
const { compararComCatalogo } = require('../../utils/compatibilizacaoAnalise');

const MARCA = 'composicoes_kits_modelo';

module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS composicoes (
      id SERIAL PRIMARY KEY,
      codigo VARCHAR(30) NOT NULL UNIQUE,
      descricao VARCHAR(300) NOT NULL,
      unidade VARCHAR(10) NOT NULL DEFAULT 'un',
      disciplina VARCHAR(30) NOT NULL DEFAULT 'outros',
      observacao TEXT,
      ativo BOOLEAN NOT NULL DEFAULT true,
      origem VARCHAR(10) NOT NULL DEFAULT 'usuario',
      versao INTEGER NOT NULL DEFAULT 0,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW()
    )`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS composicao_itens (
      id SERIAL PRIMARY KEY,
      composicao_id INTEGER NOT NULL REFERENCES composicoes(id) ON DELETE CASCADE,
      ordem INTEGER NOT NULL DEFAULT 0,
      tipo VARCHAR(10) NOT NULL,
      material_id INTEGER REFERENCES materiais(id) ON DELETE SET NULL,
      servico_codigo VARCHAR(50) REFERENCES precos_mao_de_obra_referencia(codigo) ON DELETE SET NULL ON UPDATE CASCADE,
      coeficiente NUMERIC(14,4) NOT NULL,
      descricao VARCHAR(300) NOT NULL,
      unidade VARCHAR(10) NOT NULL DEFAULT 'un',
      CONSTRAINT ck_composicao_itens_tipo CHECK (tipo IN ('material', 'servico')),
      CONSTRAINT ck_composicao_itens_coef CHECK (coeficiente > 0),
      CONSTRAINT ck_composicao_itens_vinculo CHECK (
        (tipo = 'material' AND servico_codigo IS NULL) OR (tipo = 'servico' AND material_id IS NULL))
    )`);
  await client.query('CREATE INDEX IF NOT EXISTS idx_composicao_itens_comp ON composicao_itens(composicao_id, ordem)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_composicao_itens_material ON composicao_itens(material_id) WHERE material_id IS NOT NULL');
  await client.query('CREATE INDEX IF NOT EXISTS idx_composicoes_disciplina ON composicoes(disciplina, descricao)');

  // ── kits-modelo: uma vez só ──
  const { rows: [marca] } = await client.query('SELECT 1 FROM configuracoes WHERE chave = $1', [MARCA]);
  if (marca) return;

  const catalogo = (await client.query('SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY id')).rows;
  const { rows: refs } = await client.query('SELECT codigo, descricao, unidade FROM precos_mao_de_obra_referencia');
  const servicos = new Map(refs.map(r => [r.codigo, r]));

  let criados = 0, casados = 0, semCatalogo = 0;
  for (const kit of KITS_MODELO) {
    const { rows: [nova] } = await client.query(
      `INSERT INTO composicoes (codigo, descricao, unidade, disciplina, observacao, origem)
       VALUES ($1, $2, $3, $4, $5, 'modelo') ON CONFLICT (codigo) DO NOTHING RETURNING id`,
      [kit.codigo, kit.descricao, kit.unidade, kit.disciplina, kit.observacao || null]
    );
    if (!nova) continue;
    criados++;
    for (const [ordem, it] of kit.itens.entries()) {
      if (it.tipo === 'servico') {
        const s = servicos.get(it.servico_codigo);
        await client.query(
          `INSERT INTO composicao_itens (composicao_id, ordem, tipo, servico_codigo, coeficiente, descricao, unidade)
           VALUES ($1, $2, 'servico', $3, $4, $5, $6)`,
          [nova.id, ordem, s ? s.codigo : null, it.coeficiente, String(s ? s.descricao : it.servico_codigo).slice(0, 300), String(s?.unidade || 'un').slice(0, 10)]
        );
        continue;
      }
      const achado = casarComCatalogo(it, catalogo, compararComCatalogo);
      if (achado) casados++; else semCatalogo++;
      await client.query(
        `INSERT INTO composicao_itens (composicao_id, ordem, tipo, material_id, coeficiente, descricao, unidade)
         VALUES ($1, $2, 'material', $3, $4, $5, $6)`,
        [nova.id, ordem, achado ? achado.material_id : null, it.coeficiente,
         String(achado ? achado.descricao_catalogo : it.descricao).slice(0, 300),
         // rolo/caixa com metragem (achado.conversao): o item continua em metro
         String(achado && !achado.conversao ? achado.unidade_catalogo : it.unidade).slice(0, 10)]
      );
    }
  }
  await client.query(
    'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO NOTHING',
    [MARCA, JSON.stringify({ em: new Date().toISOString(), kits: criados, materiais_no_catalogo: casados, materiais_sem_catalogo: semCatalogo })]
  );
  if (criados) console.log(`Composições: ${criados} kit(s)-modelo criados (${casados} material(is) casados com o catálogo, ${semCatalogo} a cotar)`);
};
