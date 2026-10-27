// Versão 2.0 — kits-modelo da disciplina Pressurização de escadas (skills/pressurizacao).
//
// O seed dos kits-modelo (2.0-08) roda UMA vez (marca 'composicoes_kits_modelo'); no
// banco em que ele já rodou, os kits novos de KITS_MODELO não entram sozinhos. Esta
// migração cria SÓ os kits da disciplina 'pressurizacao' (KIT-PRES-01 e KIT-PRES-02),
// uma vez (marca 'composicoes_kits_pressurizacao'), com as mesmas regras do 2.0-08:
// código fixo com ON CONFLICT DO NOTHING (não recria kit apagado/editado nem duplica),
// materiais casados ao catálogo pela descrição (o que não casa fica "a cotar") e
// serviços pela base padrão (os códigos pres_* já foram semeados em models/schema.js,
// que roda antes das migrações). Nenhum preço é gravado. Numa instalação nova o
// 2.0-08 já cria estes kits e aqui nada muda além da marca.
const { KITS_MODELO, casarComCatalogo } = require('../../utils/composicoes');
const { compararComCatalogo } = require('../../utils/compatibilizacaoAnalise');

const MARCA = 'composicoes_kits_pressurizacao';
const DISCIPLINA = 'pressurizacao';

module.exports = async (client) => {
  const { rows: [marca] } = await client.query('SELECT 1 FROM configuracoes WHERE chave = $1', [MARCA]);
  if (marca) return;

  const kits = KITS_MODELO.filter(k => k.disciplina === DISCIPLINA);
  const catalogo = (await client.query('SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY id')).rows;
  const { rows: refs } = await client.query('SELECT codigo, descricao, unidade FROM precos_mao_de_obra_referencia WHERE codigo LIKE $1', ['pres\\_%']);
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
         String(achado && !achado.conversao ? achado.unidade_catalogo : it.unidade).slice(0, 10)]
      );
    }
  }
  await client.query(
    'INSERT INTO configuracoes (chave, valor) VALUES ($1, $2) ON CONFLICT (chave) DO NOTHING',
    [MARCA, JSON.stringify({ em: new Date().toISOString(), kits: criados, materiais_no_catalogo: casados, materiais_sem_catalogo: semCatalogo })]
  );
  if (criados) console.log(`Composições: ${criados} kit(s)-modelo de pressurização criados (${casados} material(is) casados com o catálogo, ${semCatalogo} a cotar)`);
};
