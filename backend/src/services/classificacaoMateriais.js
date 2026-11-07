const pool = require('../config/database');
const { classificarPorDescricao } = require('../utils/classificadorMaterial');
const ia = require('./ia');
const { termosDaDescricao, indiceJaccard } = require('../utils/semelhancaMateriais');
const knn = require('../utils/classificadorKnn');
const { registrarUso } = require('./iaCache');

// Todo material do catálogo tem categoria (regra do usuário, 10/10/2026).
// A categoria de um material novo sai, nesta ordem, de:
//   0. aprendido do catálogo (utils/classificadorKnn.js, item 7 do plano): vizinhos mais próximos das
//      descrições já classificadas, só quando a confiança passa de CORTE_KNN (medido: ~97 % de acerto
//      no que responde, scripts/avaliar-classificador.js); abaixo do corte, segue para as etapas abaixo;
//   1. material mais parecido já classificado no catálogo — o próprio catálogo,
//      classificado à mão pela H&M, ensina (ex.: "SENSOR MAGNETICO XAS 8000"
//      vai para Alarme porque "Sensor magnético XAS 8000 (abertura)" está lá);
//   2. regras de palavras-chave (utils/classificadorMaterial.js);
//   3. NCM igual ao de materiais já classificados (categoria mais comum) — por último, medido: o NCM
//      sozinho acerta ~89 % e, na frente das outras etapas, derrubava o acerto do conjunto;
//   3b. o vizinho mais votado do kNN mesmo abaixo do corte, marcado "a conferir" (categoria_origem 'knn_baixa');
//   4. IA (cadeia única de services/ia.js: Claude Max → API → Gemini), escolhendo SÓ entre as
//      categorias que já existem — numa rotina em lote (classificarPendentes),
//      fora da gravação da proposta ou da varredura. Só para o que não tem vizinho nenhum no catálogo, e uma vez a
//      cada DIAS_NOVA_TENTATIVA_IA por material (categoria_ia_tentada_em). A categoria da IA fica marcada 'ia'.
// Cada categoria grava quem a escolheu (materiais.categoria_origem) e o kNN aprende SÓ com a escolhida por gente e com
// o catálogo anterior à marca (revisão do uso de IA de 06/11/2026; SQL_CATEGORIA_CONFIAVEL).
// Enquanto a IA não responde, o material fica "Não classificado" e a rotina
// tenta de novo (após cada varredura de fornecedores/e-mail, às 06:00 e 18:00
// e logo depois de salvar uma proposta que cadastrou material novo).

const PENDENTES = ['Não classificado', 'Geral', ''];
const PALAVRAS_VAZIAS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'P', 'PARA', 'COM', 'C', 'S', 'SEM', 'E', 'EM', 'X', 'A', 'O', 'UN', 'PC', 'PCT']);
const SIMILARIDADE_MINIMA = 0.5;
// Medido em 02/11/2026 (20 sorteios de 80 % treino / 20 % teste, 521 materiais): com corte 0,5 o kNN responde
// ~64 % dos itens e acerta ~97 % do que responde; no conjunto (kNN → parecido → palavras-chave → NCM) o
// acerto sobe de 91,7 % para ~96,4 %. O NCM sozinho acerta só ~89 %, por isso vem por último.
const CORTE_KNN = 0.5;

// Um modelo por lista de referência (a rotina carrega a referência uma vez e classifica vários itens).
// A lista pode crescer durante a rotina (catalogoMateriais acrescenta o que acabou de classificar);
// mudou o tamanho, o modelo é refeito.
const modelos = new WeakMap();
function modeloDe(referencia) {
  const guardado = modelos.get(referencia);
  if (guardado && guardado.tamanho === referencia.length) return guardado.modelo;
  const modelo = knn.treinar(referencia);
  modelos.set(referencia, { tamanho: referencia.length, modelo });
  return modelo;
}

// Termos com 2 letras ou mais, a vírgula fica ("2,5" é um termo) e sem as
// palavras vazias; índice de Jaccard (utils/semelhancaMateriais.js, o mesmo da
// sugestão de preço do catálogo, com a tokenização e o corte próprios daqui).
const termos = (descricao) => termosDaDescricao(descricao, { minimo: 2, manterVirgula: true, palavrasVazias: PALAVRAS_VAZIAS });
const similaridade = indiceJaccard;

// Categoria em que dá para confiar como gabarito (revisão do uso de IA de 06/11/2026): a escolhida por gente
// (categoria_origem 'usuario', ou material cadastrado/editado na tela — origem 'manual') e o catálogo anterior a esta
// marca (NULL). A categoria dada pela IA, pelo próprio kNN, pelo NCM, pelas palavras-chave ou pela disciplina do
// arquivo no treino NÃO ensina: antes o classificador aprendia com o próprio chute e o erro se espalhava.
const SQL_CATEGORIA_CONFIAVEL = `(categoria_origem IS NULL OR categoria_origem = 'usuario' OR origem = 'manual')`;

// Referência = materiais já classificados com categoria confiável (carregada uma vez por rotina).
async function carregarReferencia(client) {
  const { rows } = await client.query(`SELECT descricao, categoria, ncm FROM materiais WHERE ativo = true AND COALESCE(categoria, '') <> ALL($1) AND ${SQL_CATEGORIA_CONFIAVEL}`, [PENDENTES]);
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

// Categoria sem IA (etapas 0 a 3 e, por último, a sugestão fraca do kNN). Devolve { categoria, criterio, origem } ou
// null; `origem` vai para materiais.categoria_origem ('knn', 'parecido', 'palavras', 'ncm' ou 'knn_baixa').
async function categoriaLocal(client, item, referencia) {
  const ref = referencia || await carregarReferencia(client);
  const aprendido = knn.classificar(modeloDe(ref), item.descricao);
  if (aprendido && aprendido.confianca >= CORTE_KNN) {
    return { categoria: aprendido.categoria, criterio: `aprendido do catálogo (${Math.round(aprendido.confianca * 100)} %), parecido com "${aprendido.vizinhos[0].descricao}"`, origem: 'knn' };
  }
  const parecido = maisParecido(ref, item.descricao);
  if (parecido) return { categoria: parecido.categoria, criterio: `parecido com "${parecido.descricao}"`, origem: 'parecido' };
  const porRegra = classificarPorDescricao(item.descricao);
  if (porRegra) return { categoria: porRegra, criterio: 'palavras-chave', origem: 'palavras' };
  // NCM por último: um mesmo NCM serve a categorias diferentes (cabo de cobre é elétrica e é rede) e, no teste,
  // acertava só ~89 % — passando à frente das outras etapas derrubava o acerto do conjunto de 96 % para 92 %
  if (item.ncm && client) {
    const r = await client.query(
      `SELECT categoria FROM materiais WHERE ncm = $1 AND ativo = true AND COALESCE(categoria, '') <> ALL($2) AND ${SQL_CATEGORIA_CONFIAVEL} GROUP BY categoria ORDER BY count(*) DESC LIMIT 1`,
      [item.ncm, PENDENTES]
    );
    if (r.rows.length) return { categoria: r.rows[0].categoria, criterio: `NCM ${item.ncm}`, origem: 'ncm' };
  }
  // abaixo do corte, o vizinho mais votado do kNN ainda é uma sugestão melhor que perguntar à IA: entra marcado
  // "a conferir" (categoria_origem 'knn_baixa' — a tela de Materiais mostra) e a IA fica só para o que não tem vizinho
  if (aprendido) {
    return { categoria: aprendido.categoria, criterio: `sugestão do catálogo (${Math.round(aprendido.confianca * 100)} %, abaixo do corte) — a conferir`, origem: 'knn_baixa' };
  }
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

// Só grava se o material AINDA está pendente: a IA demora segundos por lote e,
// nesse meio-tempo, alguém pode ter escolhido a categoria na tela — antes a
// classificação automática passava por cima (revisão de 27/10/2026).
// $4 = quem escolheu (materiais.categoria_origem): a categoria da IA fica marcada 'ia' e não ensina o kNN.
const SQL_GRAVAR_CATEGORIA = `UPDATE materiais SET categoria = $1, categoria_origem = $4, atualizado_em = NOW()
  WHERE id = $2 AND (categoria IS NULL OR categoria = ANY($3))`;

// A IA já foi perguntada sobre a categoria deste material e não resolveu: espera DIAS_NOVA_TENTATIVA_IA para perguntar
// de novo (antes cada proposta salva, varredura de fornecedor ou orçamento gerado perguntava de novo pelos mesmos itens).
const DIAS_NOVA_TENTATIVA_IA = 7;

let emAndamento = null;
function classificarPendentes() {
  if (!emAndamento) emAndamento = executar().finally(() => { emAndamento = null; });
  return emAndamento;
}

async function executar() {
  const resumo = { pendentes: 0, classificadosLocal: 0, classificadosIA: 0, restantes: 0, fonteIA: null, avisos: [] };
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, descricao, ncm, (categoria_ia_tentada_em IS NULL OR categoria_ia_tentada_em < NOW() - ($2 || ' days')::interval) AS pode_ia
         FROM materiais WHERE ativo = true AND (categoria IS NULL OR categoria = ANY($1)) ORDER BY id`, [PENDENTES, String(DIAS_NOVA_TENTATIVA_IA)]);
    resumo.pendentes = rows.length;
    if (!rows.length) return resumo;
    const referencia = await carregarReferencia(client);
    const semLocal = [];
    for (const m of rows) {
      const c = await categoriaLocal(client, m, referencia);
      if (c) {
        const r = await client.query(SQL_GRAVAR_CATEGORIA, [c.categoria, m.id, PENDENTES, c.origem || null]);
        if (r.rowCount) { resumo.classificadosLocal++; await registrarUso('classificacao_material', 'sem_ia'); }
      } else if (m.pode_ia) semLocal.push(m);
      else resumo.aguardandoNovaTentativa = (resumo.aguardandoNovaTentativa || 0) + 1;
    }
    if (semLocal.length) {
      const categorias = await categoriasExistentes(client);
      for (let i = 0; i < semLocal.length; i += 40) { // lotes de 40 por pergunta
        const lote = semLocal.slice(i, i + 40);
        try {
          const { fonte, resultado } = await categoriasPorIA(lote, categorias);
          resumo.fonteIA = fonte;
          // a IA respondeu: registra a tentativa de todo o lote (o que ela não classificou espera DIAS_NOVA_TENTATIVA_IA)
          await client.query('UPDATE materiais SET categoria_ia_tentada_em = NOW() WHERE id = ANY($1)', [lote.map(m => m.id)]);
          for (const m of lote) {
            if (!resultado[m.id]) { await registrarUso('classificacao_material', 'falha'); continue; }
            const r = await client.query(SQL_GRAVAR_CATEGORIA, [resultado[m.id], m.id, PENDENTES, 'ia']);
            if (r.rowCount) { resumo.classificadosIA++; await registrarUso('classificacao_material', 'ia'); }
          }
        } catch (e) {
          resumo.avisos.push(`Classificação por IA indisponível agora (${e.message.slice(0, 160)}) — tenta de novo na próxima rotina`);
          for (let n = 0; n < lote.length; n++) await registrarUso('classificacao_material', 'falha');
          // marca como "Não classificado" (não "Geral") para aparecer no filtro e ser retentado
          await client.query(`UPDATE materiais SET categoria = 'Não classificado' WHERE id = ANY($1) AND (categoria IS NULL OR categoria = ANY($2)) AND categoria IS DISTINCT FROM 'Não classificado'`, [lote.map(m => m.id), PENDENTES]);
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

module.exports = { categoriaLocal, carregarReferencia, termos, classificarPendentes, classificarPendentesEmSegundoPlano, SQL_CATEGORIA_CONFIAVEL, DIAS_NOVA_TENTATIVA_IA, paraTestes: { similaridade, maisParecido, CORTE_KNN } };
