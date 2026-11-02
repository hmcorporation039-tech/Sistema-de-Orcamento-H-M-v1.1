const pool = require('../config/database');
const { unidadeBase } = require('./catalogoMateriais');
const { formatarCnpj, soDigitos, cnpjValido } = require('../utils/cnpj');

// Comparativo de fornecedores (02/11/2026): cada preço cotado fica guardado com o fornecedor
// (tabela cotacoes_itens), e daqui sai quem cotou mais barato e se o custo do catálogo está acima do
// melhor preço recente. O catálogo NÃO muda por cotação (decisão de 10/10/2026): isto só aponta.
//
// Regras (sugestão da casa, ajustáveis aqui):
//   - cotação vale 90 dias; depois disso só conta como "antiga" e não entra no ranking;
//   - de cada fornecedor vale a cotação mais nova do material;
//   - só se comparam preços na mesma unidade do material (CX × un muda o preço em 100×);
//   - catálogo é "acima" quando passa 5 % do menor preço vigente;
//   - diferença de 5× ou mais entre preços quase sempre é unidade/embalagem diferente, não economia:
//     o item aparece marcado como "confira" e não vira oportunidade.
const VALIDADE_DIAS = 90;
const LIMITE_ACIMA_PCT = 5;
const FATOR_SUSPEITO = 5;
const LIMITE_OPORTUNIDADES = 100;
const MIN_ITENS_RANKING = 3;

const arred1 = (v) => Math.round(v * 10) / 10;
const arred4 = (v) => Math.round(v * 10000) / 10000;
const diasEntre = (de, ate) => Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${de}T00:00:00Z`)) / 86400000);
const nomeDe = (cnpj, nome) => (nome && nome.trim()) || formatarCnpj(cnpj);

function hojeIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Cálculo puro ───────────────────────────────────────────────────────────

// cotacoes: [{ fornecedor_cnpj, fornecedor_nome, preco, unidade, data_cotacao 'YYYY-MM-DD' }]
// material: { unidade, preco_compra }
function comparar({ cotacoes, material, hoje, validadeDias = VALIDADE_DIAS }) {
  const maisNova = new Map();
  for (const c of cotacoes || []) {
    const atual = maisNova.get(c.fornecedor_cnpj);
    if (!atual || c.data_cotacao >= atual.data_cotacao) maisNova.set(c.fornecedor_cnpj, c);
  }
  const unidadeMat = unidadeBase(material?.unidade);
  const vigentes = [];
  let antigas = 0;
  for (const c of maisNova.values()) {
    const dias = diasEntre(c.data_cotacao, hoje);
    if (dias > validadeDias) { antigas++; continue; }
    const unidadeCot = unidadeBase(c.unidade);
    vigentes.push({
      cnpj: c.fornecedor_cnpj, nome: nomeDe(c.fornecedor_cnpj, c.fornecedor_nome), preco: Number(c.preco), unidade: c.unidade || null,
      data: c.data_cotacao, dias: Math.max(dias, 0), comparavel: !unidadeMat || !unidadeCot || unidadeMat === unidadeCot,
    });
  }
  const comparaveis = vigentes.filter(f => f.comparavel).sort((a, b) => a.preco - b.preco);
  const menor = comparaveis[0] || null;
  const maior = comparaveis[comparaveis.length - 1] || null;
  for (const f of vigentes) {
    f.menor = !!menor && f.comparavel && f.preco === menor.preco;
    f.acima_do_menor_pct = menor && f.comparavel && menor.preco > 0 ? arred1((f.preco / menor.preco - 1) * 100) : null;
  }
  vigentes.sort((a, b) => (b.comparavel - a.comparavel) || a.preco - b.preco);

  const custo = Number(material?.preco_compra) > 0 ? Number(material.preco_compra) : null;
  const suspeito = !!menor && ((maior.preco / menor.preco >= FATOR_SUSPEITO && comparaveis.length > 1)
    || (custo != null && (custo / menor.preco >= FATOR_SUSPEITO || menor.preco / custo >= FATOR_SUSPEITO)));
  return {
    fornecedores: vigentes,
    antigas,
    n_comparaveis: comparaveis.length,
    menor,
    maior,
    custo_catalogo: custo,
    catalogo_acima_pct: menor && custo != null && menor.preco > 0 ? arred1((custo / menor.preco - 1) * 100) : null,
    diferenca_entre_fornecedores_pct: comparaveis.length > 1 && menor.preco > 0 ? arred1((maior.preco / menor.preco - 1) * 100) : null,
    suspeito,
  };
}

// ── Gravação ───────────────────────────────────────────────────────────────

async function gravarFornecedor(client, { cnpj, nome }) {
  await client.query(
    `INSERT INTO cotacao_fornecedores (cnpj, nome) VALUES ($1, $2)
     ON CONFLICT (cnpj) DO UPDATE SET nome = COALESCE(cotacao_fornecedores.nome, EXCLUDED.nome)`,
    [cnpj, nome ? String(nome).slice(0, 200) : null]
  );
}

// Guarda o preço cotado de UM item. Nunca derruba a importação: se a gravação falhar, desfaz só ela
// (savepoint) e o catálogo segue como estava. Reler o mesmo documento não duplica (índice único).
async function registrarItem(client, { materialId, fornecedor, item, origem, documento, data }) {
  const preco = Number(item?.preco);
  if (!materialId || !fornecedor?.cnpj || !cnpjValido(fornecedor.cnpj) || !(preco > 0) || !documento) return false;
  // dentro da transação da importação o savepoint isola uma falha; fora dela (uso avulso) segue sem ele
  const comSavepoint = await client.query('SAVEPOINT cotacao_item').then(() => true, () => false);
  try {
    await gravarFornecedor(client, fornecedor);
    const r = await client.query(
      `INSERT INTO cotacoes_itens (material_id, fornecedor_cnpj, preco, unidade, quantidade, origem, documento, data_cotacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::date, CURRENT_DATE))
       ON CONFLICT (documento, material_id, preco) DO NOTHING`,
      [materialId, fornecedor.cnpj, arred4(preco), item.unidade ? String(item.unidade).slice(0, 20) : null,
        Number(item.quantidade) > 0 ? item.quantidade : null, origem || null, String(documento).slice(0, 120), data || null]
    );
    if (comSavepoint) await client.query('RELEASE SAVEPOINT cotacao_item');
    return r.rowCount > 0;
  } catch (e) {
    if (comSavepoint) await client.query('ROLLBACK TO SAVEPOINT cotacao_item').catch(() => {});
    console.error('Cotação não guardada no comparativo:', e.message);
    return false;
  }
}

async function renomearFornecedor(db, cnpjBruto, nome) {
  const cnpj = soDigitos(cnpjBruto);
  const limpo = String(nome || '').trim().replace(/\s+/g, ' ');
  if (!limpo || limpo.length > 200) throw Object.assign(new Error('Informe um nome de até 200 caracteres.'), { status: 400 });
  const r = await db.query('UPDATE cotacao_fornecedores SET nome=$1, atualizado_em=NOW() WHERE cnpj=$2', [limpo, cnpj]);
  if (!r.rowCount) throw Object.assign(new Error('Fornecedor não encontrado.'), { status: 404 });
  return { cnpj, nome: limpo };
}

// ── Leitura ────────────────────────────────────────────────────────────────

const SQL_COTACOES = `
  SELECT c.id, c.material_id, c.fornecedor_cnpj, f.nome AS fornecedor_nome, c.preco, c.unidade,
         to_char(c.data_cotacao, 'YYYY-MM-DD') AS data_cotacao
    FROM cotacoes_itens c
    LEFT JOIN cotacao_fornecedores f ON f.cnpj = c.fornecedor_cnpj`;

async function comparacaoDoMaterial(db, materialId, hoje = hojeIso()) {
  const mat = await db.query('SELECT id, descricao, unidade, preco_compra FROM materiais WHERE id = $1', [materialId]);
  if (!mat.rows.length) return null;
  const cot = await db.query(`${SQL_COTACOES} WHERE c.material_id = $1 ORDER BY c.data_cotacao, c.id`, [materialId]);
  return { material: mat.rows[0], validade_dias: VALIDADE_DIAS, ...comparar({ cotacoes: cot.rows, material: mat.rows[0], hoje }) };
}

async function oportunidades(db = pool, hoje = hojeIso()) {
  const r = await db.query(
    `SELECT c.id, c.material_id, c.fornecedor_cnpj, f.nome AS fornecedor_nome, c.preco, c.unidade,
            to_char(c.data_cotacao, 'YYYY-MM-DD') AS data_cotacao, m.descricao, m.unidade AS unidade_material, m.preco_compra
       FROM cotacoes_itens c
       JOIN materiais m ON m.id = c.material_id AND m.ativo = true
       LEFT JOIN cotacao_fornecedores f ON f.cnpj = c.fornecedor_cnpj
      WHERE c.data_cotacao >= $1::date - $2::int
      ORDER BY c.data_cotacao, c.id`,
    [hoje, VALIDADE_DIAS]
  );
  const porMaterial = new Map();
  for (const x of r.rows) {
    if (!porMaterial.has(x.material_id)) porMaterial.set(x.material_id, { material: { id: x.material_id, descricao: x.descricao, unidade: x.unidade_material, preco_compra: x.preco_compra }, cotacoes: [] });
    porMaterial.get(x.material_id).cotacoes.push(x);
  }
  const itens = [];
  const rank = new Map();
  let comVarios = 0;
  for (const { material, cotacoes } of porMaterial.values()) {
    const c = comparar({ cotacoes, material, hoje });
    if (!c.menor) continue;
    if (c.n_comparaveis > 1) {
      comVarios++;
      for (const f of c.fornecedores.filter(x => x.comparavel)) {
        const e = rank.get(f.cnpj) || { cnpj: f.cnpj, nome: f.nome, itens_comparados: 0, vezes_menor: 0 };
        e.itens_comparados++;
        if (f.menor) e.vezes_menor++;
        rank.set(f.cnpj, e);
      }
    }
    const catalogoAcima = c.catalogo_acima_pct != null && c.catalogo_acima_pct >= LIMITE_ACIMA_PCT;
    const divergem = c.diferenca_entre_fornecedores_pct != null && c.diferenca_entre_fornecedores_pct >= LIMITE_ACIMA_PCT;
    if (!catalogoAcima && !divergem) continue;
    itens.push({
      material_id: material.id, descricao: material.descricao, unidade: material.unidade, custo_catalogo: c.custo_catalogo,
      menor: c.menor, n_fornecedores: c.n_comparaveis, catalogo_acima_pct: c.catalogo_acima_pct,
      diferenca_entre_fornecedores_pct: c.diferenca_entre_fornecedores_pct, suspeito: c.suspeito,
      motivo: catalogoAcima ? 'catalogo_acima' : 'fornecedores_divergem',
    });
  }
  // o que merece olhar primeiro: diferença que parece real (não suspeita), maior primeiro
  itens.sort((a, b) => (a.suspeito - b.suspeito) || ((b.catalogo_acima_pct ?? b.diferenca_entre_fornecedores_pct) - (a.catalogo_acima_pct ?? a.diferenca_entre_fornecedores_pct)));
  const ranking = [...rank.values()].filter(e => e.itens_comparados >= MIN_ITENS_RANKING)
    .map(e => ({ ...e, pct_menor: Math.round(e.vezes_menor / e.itens_comparados * 100) }))
    .sort((a, b) => b.pct_menor - a.pct_menor || b.itens_comparados - a.itens_comparados);
  const forn = await db.query('SELECT count(*)::int AS n FROM cotacao_fornecedores');
  return {
    itens: itens.slice(0, LIMITE_OPORTUNIDADES),
    ranking,
    resumo: { materiais_cotados: porMaterial.size, materiais_com_varios_fornecedores: comVarios, fornecedores: forn.rows[0].n, oportunidades: itens.length, validade_dias: VALIDADE_DIAS },
  };
}

module.exports = { comparar, registrarItem, gravarFornecedor, renomearFornecedor, comparacaoDoMaterial, oportunidades, VALIDADE_DIAS, LIMITE_ACIMA_PCT, hojeIso };
