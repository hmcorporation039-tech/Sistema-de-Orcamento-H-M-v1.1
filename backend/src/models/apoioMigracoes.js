// Apoio às migrações (models/migracoes) — fica FORA da pasta delas porque o
// carregador roda todo arquivo de lá como migração. Antes, o padrão "uma vez só"
// (marca em configuracoes) estava escrito à mão em 4 migrações, e a criação dos
// kits-modelo (~40 linhas) copiada em 2.

// Roda `fazer` uma vez só por banco: a marca `chave` em configuracoes (com o que
// `fazer` devolveu e a data) impede repetir. Devolve o resumo, ou null se já tinha rodado.
async function umaVez(client, chave, fazer) {
  const { rows: [marca] } = await client.query('SELECT 1 FROM configuracoes WHERE chave = $1', [chave]);
  if (marca) return null;
  const resumo = (await fazer()) || {};
  await client.query(
    'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO NOTHING',
    [chave, JSON.stringify({ em: new Date().toISOString(), ...resumo })]
  );
  return resumo;
}

// Cria os kits-modelo (KITS_MODELO de utils/composicoes): código fixo com ON
// CONFLICT DO NOTHING (não recria kit apagado/editado nem duplica), materiais
// casados ao catálogo pela descrição (o que não casa fica "a cotar"), serviços
// pela base padrão (`prefixoServico` limita a busca, ex.: 'pres\_%'). Sem preço.
// Devolve { kits, materiais_no_catalogo, materiais_sem_catalogo }.
async function inserirKits(client, kits, { prefixoServico = null } = {}) {
  const { casarComCatalogo } = require('../utils/composicoes');
  const { compararComCatalogo } = require('../utils/compatibilizacaoAnalise');
  const catalogo = (await client.query('SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY id')).rows;
  const { rows: refs } = prefixoServico
    ? await client.query('SELECT codigo, descricao, unidade FROM precos_mao_de_obra_referencia WHERE codigo LIKE $1', [prefixoServico])
    : await client.query('SELECT codigo, descricao, unidade FROM precos_mao_de_obra_referencia');
  const servicos = new Map(refs.map(r => [r.codigo, r]));

  let criados = 0, casados = 0, semCatalogo = 0;
  for (const kit of kits) {
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
  return { kits: criados, materiais_no_catalogo: casados, materiais_sem_catalogo: semCatalogo };
}

module.exports = { umaVez, inserirKits };
