// Versão 2.0 — kits-modelo × rolo/caixa com metragem (ajuste antes da produção).
//
// utils/composicoes.js passou a contar em metro o material do catálogo vendido
// em rolo/caixa quando a metragem está escrita na descrição ("100MT", "CX
// 305M"…): preço ÷ metragem. O seed dos kits-modelo (2.0-08) roda UMA vez; no
// banco em que ele já rodou com a regra antiga, cabos, eletrodutos e Cat6 dos
// kits ficaram como "material sem catálogo" (a cotar). Esta migração liga SÓ:
//   - itens de material SEM catálogo (material_id nulo),
//   - de kits com origem 'modelo' que ninguém editou (versao = 0 — toda
//     edição pela tela sobe a versão),
//   - quando o casamento acha um rolo/caixa com metragem escrita (conversão);
//     casamento de mesma unidade não entra aqui (a regra dele não mudou).
// O item continua em metro (o coeficiente é em metros). Roda uma vez (marca
// 'composicoes_kits_metragem' em configuracoes) — um kit que continue sem
// edição não muda sozinho depois, quando o catálogo mudar. Na instalação nova
// o seed 2.0-08 já casa com a regra nova e aqui não sobra nada para ligar.
// Calcular/explodir um kit NUNCA liga item sozinho (o preço vem só do vínculo).
const { KITS_MODELO, casarComCatalogo } = require('../../utils/composicoes');
const { compararComCatalogo } = require('../../utils/semelhancaMateriais');

const MARCA = 'composicoes_kits_metragem';

// uma vez só (models/apoioMigracoes.js)
module.exports = async (client) => {
  const r = await require('../apoioMigracoes').umaVez(client, MARCA, () => ligarRolosECaixas(client));
  if (r?.ligados?.length) console.log(`Composições: ${r.ligados.length} item(ns) de kits-modelo ligados a rolo/caixa do catálogo (contados em metro)`);
};

async function ligarRolosECaixas(client) {
  const { rows: itens } = await client.query(
    `SELECT i.id, i.ordem, i.descricao, i.unidade, c.codigo
       FROM composicao_itens i JOIN composicoes c ON c.id = i.composicao_id
      WHERE c.origem = 'modelo' AND c.versao = 0 AND i.tipo = 'material' AND i.material_id IS NULL
      ORDER BY c.codigo, i.ordem`);

  const ligados = [];
  if (itens.length) {
    const catalogo = (await client.query('SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY id')).rows;
    const kits = new Map(KITS_MODELO.map(k => [k.codigo, k]));
    for (const it of itens) {
      // termos de busca do kit-modelo, se o item ainda é o mesmo da definição
      const modelo = kits.get(it.codigo)?.itens[it.ordem];
      const def = modelo && modelo.tipo === 'material' && modelo.descricao === it.descricao
        ? modelo : { descricao: it.descricao, unidade: it.unidade };
      const achado = casarComCatalogo({ ...def, unidade: it.unidade }, catalogo, compararComCatalogo);
      if (!achado || !achado.conversao) continue;
      const r = await client.query(
        'UPDATE composicao_itens SET material_id = $1, descricao = $2 WHERE id = $3 AND material_id IS NULL',
        [achado.material_id, String(achado.descricao_catalogo).slice(0, 300), it.id]);
      if (r.rowCount) {
        ligados.push({ kit: it.codigo, item: it.descricao, material_id: achado.material_id, conversao: achado.conversao.texto });
      }
    }
  }

  return { avaliados: itens.length, ligados };
}
