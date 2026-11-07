const { categoriaLocal, carregarReferencia } = require('./classificacaoMateriais');
const { registrarUso } = require('./iaCache');
// Centavos pela mesma regra da proposta (meio para longe do zero, skills/_comum/base/dinheiro.js).
const { arredondar } = require(require('path').join(require('../config/caminhos').COMUM, 'base', 'dinheiro'));

// Comparação dos itens lidos (cotação de fornecedor ou nota fiscal) com o
// catálogo, para cadastrar automaticamente SÓ o que é novo. Um item é
// considerado o mesmo material quando:
//   1. a descrição é igual (sem diferenciar maiúsculas/espaços); ou
//   2. a descrição é igual ignorando acentos e pontuação ("CABO FLEX. 2,5MM" =
//      "Cabo flex 2,5mm"); ou
//   3. traz o mesmo código de fabricante (ex.: "5SY4102-7", "3RV2011-1JA20")
//      que UM único material do catálogo — fornecedores diferentes descrevem o
//      mesmo produto de jeitos diferentes, mas o código do fabricante é o mesmo.
// Sem nenhum desses, é material novo. Não há comparação "por semelhança" de
// texto: "DISJUNTOR 10A" e "DISJUNTOR 16A" são parecidos e são produtos diferentes.

const normalizar = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

function chaveDescricao(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/[^A-Z0-9,]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Código de fabricante: letras e dígitos misturados, com hífen, 6+ caracteres,
// e que não seja especificação ("160-690VCA", "2,2-3,2A", "15-70HZ"). Usa só o
// ÚLTIMO da descrição — é onde fica o código do próprio produto; os do meio
// costumam ser de compatibilidade ("CONTATO ... PARA 3VA11-15; 3VA20-26 3VA9988-0AB11").
function codigosFabricante(s) {
  const candidatos = String(s || '').toUpperCase().split(/[\s;,()]+/)
    .map(t => t.replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, ''))
    .filter(t => t.length >= 6 && /-/.test(t) && /\d/.test(t) && /[A-Z]/.test(t))
    .filter(t => !/^[\d.,\/-]+[A-Z]{1,4}$/.test(t));
  return candidatos.length ? [candidatos[candidatos.length - 1]] : [];
}

// Carrega o catálogo uma vez por varredura (algumas centenas de linhas).
async function carregarIndice(client) {
  const { rows } = await client.query('SELECT id, descricao FROM materiais WHERE ativo = true');
  const indice = { porChave: new Map(), porCodigo: new Map() };
  for (const m of rows) indexar(indice, m);
  return indice;
}

function indexar(indice, m) {
  const chave = chaveDescricao(m.descricao);
  if (chave && !indice.porChave.has(chave)) indice.porChave.set(chave, m.id);
  for (const c of codigosFabricante(m.descricao)) {
    const atual = indice.porCodigo.get(c);
    indice.porCodigo.set(c, atual == null || atual === m.id ? m.id : -1); // -1 = código ambíguo
  }
}

async function encontrarExistente(client, indice, descricao) {
  const exato = await client.query('SELECT * FROM materiais WHERE LOWER(TRIM(descricao)) = $1 AND ativo = true LIMIT 1', [normalizar(descricao)]);
  if (exato.rows.length) return { material: exato.rows[0], criterio: 'descrição igual' };
  let id = indice.porChave.get(chaveDescricao(descricao));
  let criterio = 'descrição igual (sem acentos/pontuação)';
  if (id == null) {
    for (const c of codigosFabricante(descricao)) {
      const achado = indice.porCodigo.get(c);
      if (achado > 0) { id = achado; criterio = `mesmo código de fabricante (${c})`; break; }
    }
  }
  if (id == null) return null;
  const r = await client.query('SELECT * FROM materiais WHERE id = $1 AND ativo = true', [id]);
  return r.rows.length ? { material: r.rows[0], criterio } : null;
}

// Categoria do material novo: NCM, material mais parecido do catálogo ou
// palavras-chave (services/classificacaoMateriais.js). Sem nenhum, fica
// "Não classificado" e a rotina classificarPendentes resolve com IA depois.
// Devolve { categoria, origem }: a origem (knn, parecido, palavras, ncm, knn_baixa) vai para materiais.categoria_origem.
async function categoriaDoItem(client, item, indice) {
  if (indice && !indice.referencia) indice.referencia = await carregarReferencia(client);
  const c = await categoriaLocal(client, item, indice?.referencia);
  return c ? { categoria: c.categoria, origem: c.origem || null } : { categoria: 'Não classificado', origem: null };
}

async function inserirMaterial(client, indice, item, origem, margem) {
  const { categoria, origem: categoriaOrigem } = await categoriaDoItem(client, item, indice);
  const preco = Number(item.preco);
  const precoVenda = arredondar(preco * (1 + margem / 100));
  // preco_origem = a origem da leitura: "…_ia" (cotação lida por IA) sai "a cotar" no orçamento até alguém conferir
  const r = await client.query(
    `INSERT INTO materiais (codigo, descricao, categoria, unidade, preco, preco_compra, marca, ncm, origem, preco_origem, categoria_origem)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10)
     ON CONFLICT ((LOWER(TRIM(descricao)))) WHERE ativo = true DO NOTHING RETURNING id, descricao`,
    [item.codigo || null, item.descricao, categoria, item.unidade || 'un', precoVenda, preco, item.marca || '', item.ncm || null, origem, categoriaOrigem]
  );
  // outra leitura (e-mail/pasta/proposta) cadastrou o mesmo material no meio do caminho:
  // o índice único do banco segura a duplicata e fica valendo o que já existe
  if (!r.rows.length) return (await client.query('SELECT id, descricao FROM materiais WHERE LOWER(TRIM(descricao)) = LOWER(TRIM($1)) AND ativo = true', [item.descricao])).rows[0];
  indexar(indice, r.rows[0]);
  // classificado sem IA já no cadastro: entra na conta "quanto sai sem IA" (antes só a rotina em lote contava)
  if (categoriaOrigem) await registrarUso('classificacao_material', 'sem_ia');
  // a categoria automática NÃO entra na referência do kNN: só a escolhida por gente ensina (classificacaoMateriais.js)
  return r.rows[0];
}

// Cotação de fornecedor (pasta ou e-mail): cadastra automaticamente SÓ o
// material novo. Material que já existe não tem o preço alterado pela cotação
// (decisão do usuário, 10/10/2026) — o custo de referência dos existentes vem
// das notas fiscais (preço realmente pago) ou de ajuste manual; a cotação só
// completa o que estiver vazio (custo ausente, código, marca, NCM).
async function registrarItemCotacao(client, indice, item, origem, margem) {
  if (!normalizar(item.descricao)) return null;
  const preco = Number(item.preco);
  if (!Number.isFinite(preco) || preco <= 0) return null; // preço não identificado com confiança — não grava lixo
  const achado = await encontrarExistente(client, indice, item.descricao);
  if (!achado) {
    const novo = await inserirMaterial(client, indice, item, origem, margem);
    return { criado: true, mudou: true, materialId: novo?.id };
  }
  const mat = achado.material;
  const semCusto = mat.preco_compra == null || Number(mat.preco_compra) <= 0;
  if (semCusto && !mat.preco_manual) {
    // o preço passa a ser o da cotação e a origem do PREÇO muda junto: antes ficava a marca antiga e o preço lido por
    // IA saía "confirmado" no orçamento (revisão do uso de IA de 06/11/2026)
    await client.query(`UPDATE materiais SET preco_compra=$1, preco=$2, codigo=COALESCE(NULLIF(codigo,''), $3), marca=COALESCE(NULLIF(marca,''), $4), ncm=COALESCE(NULLIF(ncm,''), $5), preco_origem=$7, atualizado_em=NOW() WHERE id=$6`,
      [preco, arredondar(preco * (1 + margem / 100)), item.codigo || null, item.marca || null, item.ncm || null, mat.id, origem]);
  } else {
    await client.query(`UPDATE materiais SET preco_compra=COALESCE(preco_compra, $1), codigo=COALESCE(NULLIF(codigo,''), $2), marca=COALESCE(NULLIF(marca,''), $3), ncm=COALESCE(NULLIF(ncm,''), $4) WHERE id=$5`,
      [preco, item.codigo || null, item.marca || null, item.ncm || null, mat.id]);
  }
  return { criado: false, mudou: semCusto, criterio: achado.criterio, materialId: mat.id };
}

// Unidade comparável: "UN", "und", "PÇ" → un; "MT", "metro" → m; etc.
const UNIDADES_EQUIVALENTES = { un: 'un', und: 'un', unid: 'un', unidade: 'un', pc: 'un', 'pç': 'un', pca: 'un', 'peça': 'un', peca: 'un',
  m: 'm', mt: 'm', mts: 'm', metro: 'm', metros: 'm', cx: 'cx', caixa: 'cx', rl: 'rl', rolo: 'rl', pct: 'pct', pcte: 'pct', pacote: 'pct',
  kg: 'kg', cj: 'cj', conj: 'cj', jg: 'cj', kit: 'kit', par: 'par', br: 'br', barra: 'br', l: 'l', lt: 'l' };
const unidadeBase = (u) => UNIDADES_EQUIVALENTES[String(u || '').trim().toLowerCase().replace(/\.$/, '')] || null;
const LIMITE_VARIACAO = Number(process.env.NF_LIMITE_VARIACAO_PRECO) || 0.5; // 50 %

async function registrarHistoricoPreco(client, mat, dados) {
  await client.query(
    `INSERT INTO materiais_precos_historico (material_id, origem, preco_compra_anterior, preco_compra_novo, preco_anterior, preco_novo, unidade_material, unidade_item, aplicado, motivo, referencia)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [mat.id, dados.origem, mat.preco_compra, dados.precoCompra, mat.preco, dados.precoVenda ?? mat.preco, mat.unidade, dados.unidade || null, dados.aplicado, dados.motivo || null, dados.referencia || null]
  );
}

// Nota fiscal: material novo é cadastrado; existente recebe o ÚLTIMO preço
// pago (é o custo real mais recente). Preço de venda manual é preservado.
// Proteções (auditoria de 25/10/2026) — a mudança NÃO é aplicada, só
// registrada no histórico para conferência, quando:
//   • o preço varia mais de 50 % para cima ou para baixo (NF_LIMITE_VARIACAO_PRECO);
//   • a unidade da nota é diferente da do cadastro (CX × un muda o custo em 100×);
//   • a nota veio só em PDF (sem XML — leitura menos confiável).
// Toda mudança aplicada também vai para o histórico (materiais_precos_historico).
async function registrarItemNotaFiscal(client, indice, item, origem, margem) {
  if (!normalizar(item.descricao)) return null;
  const preco = Number(item.preco);
  if (!Number.isFinite(preco) || preco <= 0) return null;
  const achado = await encontrarExistente(client, indice, item.descricao);
  if (!achado) {
    await inserirMaterial(client, indice, item, origem, margem);
    return { criado: true };
  }
  const mat = achado.material;
  const anterior = Number(mat.preco_compra) || 0;
  let motivo = null;
  if (origem === 'email_pdf') motivo = 'nota sem XML';
  else if (unidadeBase(item.unidade) && unidadeBase(mat.unidade) && unidadeBase(item.unidade) !== unidadeBase(mat.unidade)) motivo = `unidade diferente (nota: ${item.unidade}, cadastro: ${mat.unidade})`;
  else if (anterior > 0 && Math.abs(preco - anterior) / anterior > LIMITE_VARIACAO) motivo = `variação de ${Math.round((preco / anterior - 1) * 100)} % (de R$ ${anterior.toFixed(2)} para R$ ${preco.toFixed(2)})`;
  const referencia = item.referencia || null;
  if (motivo) {
    await registrarHistoricoPreco(client, mat, { origem, precoCompra: preco, unidade: item.unidade, aplicado: false, motivo, referencia });
    return { criado: false, aplicado: false, motivo, criterio: achado.criterio };
  }
  const precoVenda = mat.preco_manual ? Number(mat.preco) : arredondar(preco * (1 + margem / 100));
  if (anterior !== preco) await registrarHistoricoPreco(client, mat, { origem, precoCompra: preco, precoVenda, unidade: item.unidade, aplicado: true, referencia });
  if (mat.preco_manual) {
    await client.query(`UPDATE materiais SET preco_compra=$1, ncm=COALESCE(NULLIF(ncm,''), $2), origem=$3, atualizado_em=NOW() WHERE id=$4`, [preco, item.ncm || null, origem, mat.id]);
  } else {
    // preço pago na nota (custo real): a origem do preço passa a ser a nota
    await client.query(`UPDATE materiais SET preco_compra=$1, preco=$2, ncm=COALESCE(NULLIF(ncm,''), $3), origem=$4, preco_origem=$4, atualizado_em=NOW() WHERE id=$5`,
      [preco, precoVenda, item.ncm || null, origem, mat.id]);
  }
  return { criado: false, aplicado: true, criterio: achado.criterio };
}

// ── Preço conferido ─────────────────────────────────────────────────────────
// Regra única "o que a IA lê é sugestão" (revisão do uso de IA de 06/11/2026): o preço do catálogo só confirma um item
// de orçamento quando NÃO foi lido por IA (cotação lida pela IA, origem "…_ia", ou item do assistente) ou quando alguém
// já o conferiu (preço editado na tela de Materiais: preco_manual). Senão o item usa o preço como sugestão, "a cotar".
// Vale para o gerar orçamento de projeto/laudo/análise, os kits e as referências de preço.
const ehOrigemDaIA = (o) => /(^|_)ia$|^assistente$/i.test(String(o || '').trim());

// material: linha de materiais com preco_manual e preco_origem/origem (SQL_COLUNAS_PRECO). Linha sem nenhuma dessas
// colunas (consulta antiga) conta como conferida.
function precoConferido(material) {
  if (!material) return false;
  if (material.preco_manual) return true;
  return !ehOrigemDaIA(material.preco_origem ?? material.origem);
}

// as colunas que precoConferido lê, para o SELECT de quem chama
const SQL_COLUNAS_PRECO = 'origem, preco_origem, preco_manual';

// ids de materiais → Set dos que têm o preço NÃO conferido (lido por IA). Uma consulta só.
async function idsComPrecoNaoConferido(ids, db) {
  const lista = [...new Set((ids || []).map(Number).filter(n => Number.isInteger(n) && n > 0))];
  if (!lista.length) return new Set();
  const { rows } = await (db || require('../config/database')).query(
    `SELECT id, ${SQL_COLUNAS_PRECO} FROM materiais WHERE id = ANY($1::int[])`, [lista]);
  return new Set(rows.filter(m => !precoConferido(m)).map(m => m.id));
}

async function obterMargemPadrao(client) {
  const r = await client.query("SELECT valor FROM configuracoes WHERE chave = 'margem_padrao'");
  return parseFloat(r.rows[0]?.valor) || 0;
}

module.exports = { carregarIndice, indexar, encontrarExistente, registrarItemCotacao, registrarItemNotaFiscal, registrarHistoricoPreco, obterMargemPadrao, chaveDescricao, codigosFabricante, unidadeBase,
  precoConferido, idsComPrecoNaoConferido, ehOrigemDaIA, SQL_COLUNAS_PRECO };
