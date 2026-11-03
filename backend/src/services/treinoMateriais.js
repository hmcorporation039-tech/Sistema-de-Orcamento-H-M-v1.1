// Treino com as planilhas e os orçamentos em PDF do acervo (pasta dos clientes), POR DISCIPLINA (pedido do usuário
// em 03/11/2026: "em relação às planilhas, usem apenas os materiais que não têm no sistema para alimentá-lo").
// Sem IA. Para cada linha lida (utils/leitorPlanilhaMateriais.js ou o leitor de cotação, services/leitorCotacao.js):
//   - serviço (instalação, lançamento, ART, verba, ponto…) e item de pacote ("conforme projeto", "miudezas") não são
//     material de catálogo: ficam de fora;
//   - o que o catálogo JÁ TEM — mesma descrição, mesmo código de fabricante, vínculo aprendido ou texto quase igual
//     (≥ 90 %, a mesma régua que confirma preço) — não muda nada;
//   - o resto ganha categoria (a classificação local do catálogo) e DISCIPLINA (utils/disciplinaDoMaterial.js); sem
//     disciplina da H&M (drywall, porta, louça) não entra;
//   - com preço: entra no catálogo (origem 'acervo', o preço da planilha como referência — a primeira cotação ou nota
//     fiscal real grava o custo); sem preço: fica em acervo_materiais como conhecido, sem ir ao catálogo a R$ 0,00.
const pool = require('../config/database');
const { carregarIndice, indexar, encontrarExistente, unidadeBase, codigosFabricante } = require('./catalogoMateriais');
const { carregarCatalogo } = require('./aprendizadoMateriais');
const { categoriaLocal, carregarReferencia, termos } = require('./classificacaoMateriais');
const { compararComCatalogo, chaveDaDescricao, CONFIANCA_CONFIRMA } = require('../utils/semelhancaMateriais');
const { disciplinaDoMaterial, CATEGORIA_DA_DISCIPLINA } = require('../utils/disciplinaDoMaterial');
const { disciplinaDoTexto } = require('../utils/disciplinaDoArquivo');

// linha de serviço (composição de mão de obra, verba, administração) — não é material de catálogo
const RE_SERVICO = /^(fornecimento e (instala|montagem|lan[cç]a)|instala[cç][aã]o|montagem|lan[cç]amento|execu[cç][aã]o|conectoriza|certifica[cç]|mobiliza|desmobiliza|anota[cç][aã]o|\bART\b|projeto|elabora|servi[cç]o|m[aã]o de obra|teste|comissionamento|programa[cç][aã]o|configura[cç][aã]o|remo[cç][aã]o|retirada|demoli|limpeza|treinamento|assist[eê]ncia|engenharia|administra|frete|hora\b|di[aá]ria|loca[cç][aã]o|manuten[cç][aã]o|recomposi|abertura|fechamento|chumbamento|passage(m|ns)|fus[aã]o|opera[cç][aã]o|software|licen[cç]a|ferramentas?\b|identifica[cç][aã]o|organiza[cç][aã]o|ensaio|medi[cç][aã]o|vistoria|laudo|as ?built|documenta|despesa|transporte|seguro|taxa|equipe|t[eé]cnico|eletricista|ajudante|encarregado|retrofit|recondiciona|readequa|adequa[cç][aã]o|substitui[cç][aã]o|reforma|desmontagem|reinstala|remanejamento|deslocamento|intera[cç][aã]o|integra[cç][aã]o)/i;
const RE_UNIDADE_SERVICO = /^(vb|verba|h|hh|hr|hs|hora|horas|m[eê]s|dia|dias|di[aá]ria|serv|sv|srv|pt|pto|ponto|pontos|gl|global|%)\.?$/i;
// item "de verba", que não é um produto ("Quadros elétricos conforme diagramas unifilares", "Acessórios de conexão de
// infraestruturas", "Verba para miudezas"): o preço é do pacote da obra, não serve para outra
const RE_GENERICO = /conforme (o )?(projeto|diagrama|caderno|especifica|memorial)|segundo (o )?projeto|todos os (componentes|materiais|acess)|\binclus[oa]s?\b|acess[oó]rios (de|para) (conex|instala|fixa|montagem)|\bdiversos\b|miudezas|\bverba\b|conjunto de materiais|kit de materiais|materiais (de|para) (instala|fixa|montagem)|\bcomplementos?\b|\bomissos?\b|rela[cç][aã]o (acima|abaixo)|miscel[aâ]n|materia(is|s) (para|de) (a )?(execu|obra)|gen[eé]ricos?\b|\bexistentes?\b|remanejad|\(amplificador \+|\+ ?splitters/i;
// só a etiqueta de um quadro da obra ("QF-IT-1° PAV-AB", "QD-BB RECIRCULAÇÃO"): o preço é daquele quadro montado
// (a sigla com hífen logo depois: "QUADRO DE COMANDO" é produto, não etiqueta)
const RE_ETIQUETA = /^(Q[A-Z]{0,4}|CCM)[-_][^,;]{0,25}$/;
const RE_PENDENTE = /^(n[aã]o classificado|geral)?$/i;

// "Fornecimento de cabo flexível…" → "Cabo flexível…" (o fornecimento é o próprio material); "0012716 018 DUTO
// CORRUGADO…" → "DUTO CORRUGADO…" (o código interno da loja na frente da descrição)
const limpar = (d) => String(d || '').replace(/\s+/g, ' ').trim().replace(/^(\d[\d.\-/]{3,}\s+)+/, '')
  .replace(/^(fornecimento|aquisi[cç][aã]o)\s+(de|do|da|dos|das)\s+/i, '').replace(/^./, (c) => c.toUpperCase());
const ehServico = (it) => RE_SERVICO.test(it.descricao) || (it.unidade && RE_UNIDADE_SERVICO.test(String(it.unidade).trim()));
const unidadeDe = (u) => unidadeBase(u) || (String(u || '').trim().toLowerCase().replace(/\.$/, '').slice(0, 10) || 'un');
// código só quando tem cara de código de fabricante (o "3.165" interno da loja não serve)
const codigoDe = (c) => { const s = String(c || '').trim(); return /[A-Z]/i.test(s) && /\d/.test(s) && s.length <= 20 ? s : null; };

// O catálogo e a referência de categorias, carregados uma vez por rodada (crescem com o que a rodada cadastra)
async function prepararContexto(client = pool) {
  const indice = await carregarIndice(client);
  indice.referencia = await carregarReferencia(client);
  const catalogo = await carregarCatalogo(client);
  return { indice, catalogo };
}

async function jaExiste(client, ctx, descricao) {
  if (await encontrarExistente(client, ctx.indice, descricao)) return true;
  const achado = compararComCatalogo(descricao, ctx.catalogo);
  return !!achado && (achado.origem === 'alias' || achado.confianca >= CONFIANCA_CONFIRMA);
}

// itens: [{ descricao, unidade, preco, marca, codigo, ncm, secao? }] de UMA aba/documento.
// disciplina: a do arquivo (ou da aba) — vale para o material de apoio, a infraestrutura e o que o catálogo não sabe
// classificar. A seção da planilha geral de obra (item.secao) vale mais que ela; seção de outra disciplina
// (hidráulica, civil, sprinklers) fica de fora inteira.
async function aprenderItens(client, ctx, itens, { disciplina = null, arquivo = '' } = {}) {
  const r = { lidos: 0, novos: 0, semPreco: 0, existentes: 0, servicos: 0, genericos: 0, semDisciplina: 0, porDisciplina: {}, exemplos: [] };
  const vistos = new Set();
  for (const bruto of itens || []) {
    const it = { ...bruto, descricao: limpar(bruto.descricao) };
    if ((it.descricao.match(/[A-Za-zÀ-ÿ]/g) || []).length < 4) continue;
    const chave = chaveDaDescricao(it.descricao);
    if (vistos.has(chave)) continue; // a mesma linha repetida no mesmo arquivo conta uma vez
    vistos.add(chave);
    r.lidos++;
    if (it.secao?.fora) { r.semDisciplina++; continue; }
    if (ehServico(it)) { r.servicos++; continue; }
    if (RE_GENERICO.test(it.descricao) || RE_ETIQUETA.test(it.descricao)) { r.genericos++; continue; }
    if (await jaExiste(client, ctx, it.descricao)) { r.existentes++; continue; }
    const cat = await categoriaLocal(client, { descricao: it.descricao, ncm: it.ncm || null }, ctx.indice.referencia);
    const categoriaLida = cat && !RE_PENDENTE.test(cat.categoria) ? cat.categoria : null;
    const disc = disciplinaDoMaterial(it.descricao, { categoria: categoriaLida, contexto: it.secao?.chave || disciplina });
    if (!disc) { r.semDisciplina++; continue; }
    const categoria = (categoriaLida || CATEGORIA_DA_DISCIPLINA[disc] || 'Não classificado').slice(0, 50);
    const unidade = unidadeDe(it.unidade);
    const preco = Number(it.preco) > 0 ? Math.round(Number(it.preco) * 100) / 100 : null;
    let materialId = null;
    if (preco) {
      const codigo = codigoDe(it.codigo) || codigosFabricante(it.descricao)[0]?.slice(0, 20) || null;
      const ins = await client.query(
        `INSERT INTO materiais (codigo, descricao, categoria, unidade, preco, marca, ncm, origem)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'acervo')
         ON CONFLICT ((LOWER(TRIM(descricao)))) WHERE ativo = true DO NOTHING RETURNING id, descricao`,
        [codigo, it.descricao, categoria, unidade, preco, it.marca || '', it.ncm || null]);
      if (ins.rows.length) {
        materialId = ins.rows[0].id;
        indexar(ctx.indice, ins.rows[0]);
        ctx.catalogo.push({ id: materialId, descricao: it.descricao, preco, unidade, categoria });
        if (categoriaLida) ctx.indice.referencia.push({ descricao: it.descricao, categoria, ncm: it.ncm || null, termos: termos(it.descricao) });
        r.novos++;
        if (r.exemplos.length < 10) r.exemplos.push({ descricao: it.descricao, disciplina: disc, preco });
      } else {
        r.existentes++; // cadastrado no meio do caminho (outra leitura): vale o que já existe
        continue;
      }
    } else {
      r.semPreco++;
    }
    r.porDisciplina[disc] = (r.porDisciplina[disc] || 0) + 1;
    await client.query(
      `INSERT INTO acervo_materiais (chave, descricao, unidade, disciplina, categoria, preco_ref, material_id, arquivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (chave) DO UPDATE SET vezes = acervo_materiais.vezes + 1,
         material_id = COALESCE(acervo_materiais.material_id, EXCLUDED.material_id),
         preco_ref = COALESCE(EXCLUDED.preco_ref, acervo_materiais.preco_ref), atualizado_em = NOW()`,
      [chave, it.descricao, unidade, disc, categoria, preco, materialId, String(arquivo || '').slice(0, 500)]);
  }
  return r;
}

const somar = (a, b) => {
  for (const k of ['lidos', 'novos', 'semPreco', 'existentes', 'servicos', 'genericos', 'semDisciplina']) a[k] = (a[k] || 0) + (b[k] || 0);
  for (const [d, n] of Object.entries(b.porDisciplina || {})) a.porDisciplina[d] = (a.porDisciplina[d] || 0) + n;
  a.exemplos = [...(a.exemplos || []), ...(b.exemplos || [])].slice(0, 10);
  return a;
};
const vazio = () => ({ lidos: 0, novos: 0, semPreco: 0, existentes: 0, servicos: 0, genericos: 0, semDisciplina: 0, porDisciplina: {}, exemplos: [] });

// Uma planilha (pasta de trabalho ExcelJS já carregada): cada aba com a disciplina dela ("Telecom", "HVAC") ou a do
// arquivo. Tudo numa transação: o arquivo ensina inteiro ou nada.
async function aprenderDaPlanilha(wb, { disciplina = null, arquivo = '', ctx = null, client: dado = null } = {}) {
  const { lerPlanilhaMateriais } = require('../utils/leitorPlanilhaMateriais');
  const abas = lerPlanilhaMateriais(wb);
  const total = { ...vazio(), abas: abas.length };
  if (!abas.length) return total;
  const client = dado || await pool.connect();
  try {
    await client.query('BEGIN');
    const contexto = ctx || await prepararContexto(client);
    for (const a of abas) {
      const daAba = disciplinaDoTexto(a.aba);
      if (daAba?.fora) continue; // aba de arquitetura/hidráulica numa planilha geral
      somar(total, await aprenderItens(client, contexto, a.itens, { disciplina: daAba?.chave || disciplina, arquivo }));
    }
    await client.query('COMMIT');
    return total;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    if (!dado) client.release();
  }
}

// Itens de um orçamento/cotação em PDF já lidos (leitorCotacao, sem IA)
async function aprenderDoDocumento(itens, { disciplina = null, arquivo = '', ctx = null, client: dado = null } = {}) {
  const client = dado || await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await aprenderItens(client, ctx || await prepararContexto(client), itens, { disciplina, arquivo });
    await client.query('COMMIT');
    return r;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    if (!dado) client.release();
  }
}

// Para o painel: o que o acervo ensinou de material, por disciplina
async function resumoDosMateriais(executor = pool) {
  try {
    const { rows } = await executor.query(
      `SELECT disciplina, COUNT(*) FILTER (WHERE material_id IS NOT NULL)::int AS no_catalogo,
              COUNT(*) FILTER (WHERE material_id IS NULL)::int AS sem_preco
         FROM acervo_materiais GROUP BY disciplina ORDER BY 2 DESC, 3 DESC`);
    return rows;
  } catch {
    return []; // banco antigo sem a tabela
  }
}

module.exports = { aprenderItens, aprenderDaPlanilha, aprenderDoDocumento, prepararContexto, resumoDosMateriais, paraTestes: { ehServico, limpar, unidadeDe } };
