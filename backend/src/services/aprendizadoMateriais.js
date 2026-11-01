// O orçamento ensina o catálogo (models/migracoes/2.0-23-aprendizado.js: material_aliases).
// Todo item que entra CONFIRMADO numa proposta com material do catálogo vira um vínculo
// "esta descrição = este material". Na próxima análise ou laudo, a mesma descrição vai
// direto ao material certo — sem a semelhança de texto e sem pesquisa de IA.
//
//   carregarCatalogo(executor) → materiais ativos com `.aliases` (Map chave → material_id),
//                                que utils/semelhancaMateriais.compararComCatalogo consulta antes
//   registrar(itens, executor) → grava/reforça os vínculos dos itens confirmados
const pool = require('../config/database');
const { chaveDaDescricao } = require('../utils/semelhancaMateriais');

async function carregarCatalogo(executor = pool) {
  // ORDER BY fixo: o desempate da semelhança é "o primeiro com o maior score"
  const catalogo = (await executor.query('SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY id')).rows;
  catalogo.aliases = new Map();
  try {
    const { rows } = await executor.query('SELECT chave, material_id FROM material_aliases');
    for (const r of rows) catalogo.aliases.set(r.chave, r.material_id);
  } catch (e) {
    // banco antigo sem a tabela: segue só com a semelhança de texto
    if (e.code !== '42P01') console.warn('[aprendizadoMateriais] vínculos não carregados:', e.message);
  }
  return catalogo;
}

// item: { descricao, material_id, status }. Só o confirmado ensina (o "a cotar" é sugestão).
// A mesma descrição ligada a outro material depois: vale o mais recente (o usuário corrigiu).
async function registrar(itens, executor = pool, usuarioId = null) {
  let n = 0;
  for (const it of itens || []) {
    if (it.status !== 'confirmado' || !(Number(it.material_id) > 0)) continue;
    const chave = chaveDaDescricao(it.descricao);
    if (chave.length < 4) continue;
    await executor.query(
      `INSERT INTO material_aliases (chave, descricao, material_id, origem, usuario_id)
       VALUES ($1, $2, $3, 'proposta', $4)
       ON CONFLICT (chave) DO UPDATE SET
         vezes = CASE WHEN material_aliases.material_id = EXCLUDED.material_id THEN material_aliases.vezes + 1 ELSE 1 END,
         material_id = EXCLUDED.material_id, atualizado_em = NOW()`,
      [chave, String(it.descricao).slice(0, 300), Number(it.material_id), usuarioId]);
    n++;
  }
  return n;
}

module.exports = { carregarCatalogo, registrar };
