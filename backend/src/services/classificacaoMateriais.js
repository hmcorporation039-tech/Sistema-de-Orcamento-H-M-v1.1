const pool = require('../config/database');
const { classificarPorDescricao } = require('../utils/classificadorMaterial');
const ia = require('../utils/ia');

// Todo material do catálogo tem categoria (regra do usuário, 10/10/2026).
// A categoria de um material novo sai, nesta ordem, de:
//   1. NCM igual ao de materiais já classificados (categoria mais comum);
//   2. material mais parecido já classificado no catálogo — o próprio catálogo,
//      classificado à mão pela H&M, ensina (ex.: "SENSOR MAGNETICO XAS 8000"
//      vai para Alarme porque "Sensor magnético XAS 8000 (abertura)" está lá);
//   3. regras de palavras-chave (utils/classificadorMaterial.js);
//   4. IA (cadeia única de utils/ia.js: Claude Max → API → Gemini), escolhendo SÓ entre as
//      categorias que já existem — numa rotina em lote (classificarPendentes),
//      fora da gravação da proposta ou da varredura.
// Enquanto a IA não responde, o material fica "Não classificado" e a rotina
// tenta de novo (após cada varredura de fornecedores/e-mail, às 06:00 e 18:00
// e logo depois de salvar uma proposta que cadastrou material novo).

const PENDENTES = ['Não classificado', 'Geral', ''];
const PALAVRAS_VAZIAS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'P', 'PARA', 'COM', 'C', 'S', 'SEM', 'E', 'EM', 'X', 'A', 'O', 'UN', 'PC', 'PCT']);
const SIMILARIDADE_MINIMA = 0.5;

function termos(descricao) {
  return new Set(String(descricao || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/[^A-Z0-9,]+/g, ' ').split(' ').filter(t => t.length >= 2 && !PALAVRAS_VAZIAS.has(t)));
}

function similaridade(a, b) {
  let comum = 0;
  for (const t of a) if (b.has(t)) comum++;
  return comum / (a.size + b.size - comum || 1);
}

// Referência = materiais já classificados (carregada uma vez por rotina).
async function carregarReferencia(client) {
  const { rows } = await client.query(`SELECT descricao, categoria, ncm FROM materiais WHERE ativo = true AND COALESCE(categoria, '') <> ALL($1)`, [PENDENTES]);
  return rows.map(r => ({ ...r, termos: termos(r.descricao) }));
}

function maisParecido(referencia, descricao) {
  const t = termos(descricao);
  let melhor = null;
  for (const r of referencia) {
    const s = similaridade(t, r.termos);
    if (s >= SIMILARIDADE_MINIMA && (!melhor || s > melhor.s)) melhor = { s, categoria: r.categoria, descricao: r.descricao };
  }
  return melhor;
}

// Categoria sem IA (etapas 1 a 3). Devolve { categoria, criterio } ou null.
async function categoriaLocal(client, item, referencia) {
  if (item.ncm) {
    const r = await client.query(
      `SELECT categoria FROM materiais WHERE ncm = $1 AND ativo = true AND COALESCE(categoria, '') <> ALL($2) GROUP BY categoria ORDER BY count(*) DESC LIMIT 1`,
      [item.ncm, PENDENTES]
    );
    if (r.rows.length) return { categoria: r.rows[0].categoria, criterio: `NCM ${item.ncm}` };
  }
  const ref = referencia || await carregarReferencia(client);
  const parecido = maisParecido(ref, item.descricao);
  if (parecido) return { categoria: parecido.categoria, criterio: `parecido com "${parecido.descricao}"` };
  const porRegra = classificarPorDescricao(item.descricao);
  if (porRegra) return { categoria: porRegra, criterio: 'palavras-chave' };
  return null;
}

async function categoriasExistentes(client) {
  const { rows } = await client.query(`SELECT DISTINCT categoria FROM materiais WHERE ativo = true AND COALESCE(categoria, '') <> ALL($1)`, [PENDENTES]);
  return rows.map(r => r.categoria).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// IA em lote: só pode escolher categoria que já existe no catálogo.
async function categoriasPorIA(itens, categorias) {
  const lista = itens.map(i => `${i.id}: ${i.descricao}`).join('\n');
  const { fonte, json } = await ia.perguntarJSON(
    'Você classifica materiais de um catálogo de uma empresa de engenharia elétrica e de sistemas (CFTV, redes, alarme, automação etc.). '
    + `Para cada material abaixo, escolha a categoria mais adequada ENTRE ESTAS, exatamente como escritas: ${JSON.stringify(categorias)}. `
    + 'Responda em JSON no formato {"<id>": "<categoria>"}.\n\nMateriais:\n' + lista,
    { finalidade: 'classificação de materiais' }
  );
  const resultado = {};
  for (const [id, cat] of Object.entries(json || {})) if (categorias.includes(cat)) resultado[id] = cat;
  return { fonte, resultado };
}

let emAndamento = null;
function classificarPendentes() {
  if (!emAndamento) emAndamento = executar().finally(() => { emAndamento = null; });
  return emAndamento;
}

async function executar() {
  const resumo = { pendentes: 0, classificadosLocal: 0, classificadosIA: 0, restantes: 0, fonteIA: null, avisos: [] };
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT id, descricao, ncm FROM materiais WHERE ativo = true AND (categoria IS NULL OR categoria = ANY($1)) ORDER BY id`, [PENDENTES]);
    resumo.pendentes = rows.length;
    if (!rows.length) return resumo;
    const referencia = await carregarReferencia(client);
    const semLocal = [];
    for (const m of rows) {
      const c = await categoriaLocal(client, m, referencia);
      if (c) {
        await client.query('UPDATE materiais SET categoria = $1, atualizado_em = NOW() WHERE id = $2', [c.categoria, m.id]);
        resumo.classificadosLocal++;
      } else semLocal.push(m);
    }
    if (semLocal.length) {
      const categorias = await categoriasExistentes(client);
      for (let i = 0; i < semLocal.length; i += 40) { // lotes de 40 por pergunta
        const lote = semLocal.slice(i, i + 40);
        try {
          const { fonte, resultado } = await categoriasPorIA(lote, categorias);
          resumo.fonteIA = fonte;
          for (const m of lote) {
            if (!resultado[m.id]) continue;
            await client.query('UPDATE materiais SET categoria = $1, atualizado_em = NOW() WHERE id = $2', [resultado[m.id], m.id]);
            resumo.classificadosIA++;
          }
        } catch (e) {
          resumo.avisos.push(`Classificação por IA indisponível agora (${e.message.slice(0, 160)}) — tenta de novo na próxima rotina`);
          // marca como "Não classificado" (não "Geral") para aparecer no filtro e ser retentado
          await client.query(`UPDATE materiais SET categoria = 'Não classificado' WHERE id = ANY($1) AND categoria <> 'Não classificado'`, [lote.map(m => m.id)]);
          break;
        }
      }
    }
    const r = await client.query(`SELECT count(*)::int n FROM materiais WHERE ativo = true AND (categoria IS NULL OR categoria = ANY($1))`, [PENDENTES]);
    resumo.restantes = r.rows[0].n;
  } finally {
    client.release();
  }
  return resumo;
}

// Dispara a rotina sem travar quem chamou (ex.: depois de salvar uma proposta).
function classificarPendentesEmSegundoPlano() {
  setImmediate(() => classificarPendentes().catch(e => console.error('Classificação de materiais:', e.message)));
}

module.exports = { categoriaLocal, carregarReferencia, termos, classificarPendentes, classificarPendentesEmSegundoPlano, PENDENTES };
