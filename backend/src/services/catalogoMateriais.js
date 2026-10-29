const { categoriaLocal, carregarReferencia, termos } = require('./classificacaoMateriais');

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
async function categoriaDoItem(client, item, indice) {
  if (indice && !indice.referencia) indice.referencia = await carregarReferencia(client);
  const c = await categoriaLocal(client, item, indice?.referencia);
  return c ? c.categoria : 'Não classificado';
}

async function inserirMaterial(client, indice, item, origem, margem) {
  const categoria = await categoriaDoItem(client, item, indice);
  const preco = Number(item.preco);
  const precoVenda = Math.round(preco * (1 + margem / 100) * 100) / 100;
  const r = await client.query(
    `INSERT INTO materiais (codigo, descricao, categoria, unidade, preco, preco_compra, marca, ncm, origem)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT ((LOWER(TRIM(descricao)))) WHERE ativo = true DO NOTHING RETURNING id, descricao`,
    [item.codigo || null, item.descricao, categoria, item.unidade || 'un', precoVenda, preco, item.marca || '', item.ncm || null, origem]
  );
  // outra leitura (e-mail/pasta/proposta) cadastrou o mesmo material no meio do caminho:
  // o índice único do banco segura a duplicata e fica valendo o que já existe
  if (!r.rows.length) return (await client.query('SELECT id, descricao FROM materiais WHERE LOWER(TRIM(descricao)) = LOWER(TRIM($1)) AND ativo = true', [item.descricao])).rows[0];
  indexar(indice, r.rows[0]);
  if (indice.referencia && categoria !== 'Não classificado') indice.referencia.push({ descricao: item.descricao, categoria, ncm: item.ncm || null, termos: termos(item.descricao) });
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
    await inserirMaterial(client, indice, item, origem, margem);
    return { criado: true, mudou: true };
  }
  const mat = achado.material;
  const semCusto = mat.preco_compra == null || Number(mat.preco_compra) <= 0;
  if (semCusto && !mat.preco_manual) {
    await client.query(`UPDATE materiais SET preco_compra=$1, preco=$2, codigo=COALESCE(NULLIF(codigo,''), $3), marca=COALESCE(NULLIF(marca,''), $4), ncm=COALESCE(NULLIF(ncm,''), $5), atualizado_em=NOW() WHERE id=$6`,
      [preco, Math.round(preco * (1 + margem / 100) * 100) / 100, item.codigo || null, item.marca || null, item.ncm || null, mat.id]);
  } else {
    await client.query(`UPDATE materiais SET preco_compra=COALESCE(preco_compra, $1), codigo=COALESCE(NULLIF(codigo,''), $2), marca=COALESCE(NULLIF(marca,''), $3), ncm=COALESCE(NULLIF(ncm,''), $4) WHERE id=$5`,
      [preco, item.codigo || null, item.marca || null, item.ncm || null, mat.id]);
  }
  return { criado: false, mudou: semCusto, criterio: achado.criterio };
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
  const precoVenda = mat.preco_manual ? Number(mat.preco) : Math.round(preco * (1 + margem / 100) * 100) / 100;
  if (anterior !== preco) await registrarHistoricoPreco(client, mat, { origem, precoCompra: preco, precoVenda, unidade: item.unidade, aplicado: true, referencia });
  if (mat.preco_manual) {
    await client.query(`UPDATE materiais SET preco_compra=$1, ncm=COALESCE(NULLIF(ncm,''), $2), origem=$3, atualizado_em=NOW() WHERE id=$4`, [preco, item.ncm || null, origem, mat.id]);
  } else {
    await client.query(`UPDATE materiais SET preco_compra=$1, preco=$2, ncm=COALESCE(NULLIF(ncm,''), $3), origem=$4, atualizado_em=NOW() WHERE id=$5`,
      [preco, precoVenda, item.ncm || null, origem, mat.id]);
  }
  return { criado: false, aplicado: true, criterio: achado.criterio };
}

async function obterMargemPadrao(client) {
  const r = await client.query("SELECT valor FROM configuracoes WHERE chave = 'margem_padrao'");
  return parseFloat(r.rows[0]?.valor) || 0;
}

module.exports = { carregarIndice, registrarItemCotacao, registrarItemNotaFiscal, registrarHistoricoPreco, obterMargemPadrao, chaveDescricao, codigosFabricante, unidadeBase };
