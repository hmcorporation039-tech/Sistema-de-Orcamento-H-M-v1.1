const pool = require('../config/database');
const { extrairNotaFiscal } = require('../utils/notaFiscalParser');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');
const { comTransacao } = require('../utils/transacao');
const { compararComCatalogo } = require('../utils/compatibilizacaoAnalise');
const rotinas = require('../services/rotinas');
const { registrarAuditoria } = require('../utils/auditoria');
const { registrarHistoricoPreco } = require('../services/catalogoMateriais');

// Compara uma descrição livre (ex.: vinda de um projeto, de uma cotação, ou
// perguntada na conversa via MCP) com o catálogo — mesma lógica de
// correspondência (Jaccard) já usada na Análise de Projeto. Só existe uma
// correspondência se o índice de Jaccard for >= 45%; senão não arrisca sugerir
// preço de coisa diferente.
async function comparar(req, res) {
  const { descricao } = req.body || {};
  // número/objeto: `.trim()` lançava fora do try (pedido pendurado)
  if (typeof descricao !== 'string' || !descricao.trim()) {
    return res.status(400).json({ erro: 'Informe a descrição a comparar' });
  }
  const catalogo = (await pool.query(
    'SELECT id, descricao, preco, unidade, categoria FROM materiais WHERE ativo = true ORDER BY categoria, descricao'
  )).rows;
  const correspondencia = compararComCatalogo(descricao, catalogo);
  res.json({ descricao, correspondencia });
}

async function listar(req, res) {
  const { busca, categoria } = req.query;
  const { pagina, porPagina, offset } = parsePaginacao(req.query);

  let condicoes = 'WHERE ativo = true';
  const params = [];

  if (categoria) {
    params.push(categoria);
    condicoes += ` AND categoria = $${params.length}`;
  }
  if (busca) {
    params.push(`%${busca}%`);
    condicoes += ` AND (descricao ILIKE $${params.length} OR codigo ILIKE $${params.length} OR marca ILIKE $${params.length})`;
  }

  const total = await pool.query(`SELECT count(*) FROM materiais ${condicoes}`, params);
  const result = await pool.query(
    `SELECT * FROM materiais ${condicoes} ORDER BY categoria, descricao LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, porPagina, offset]
  );
  res.json(montarResposta(result.rows, parseInt(total.rows[0].count, 10), pagina, porPagina));
}

// Validação do material (teste de 28/10/2026: preço "abc" e texto acima do
// limite da coluna viravam 500; o PUT parcial apagava os campos omitidos)
const CAMPOS_MATERIAL = ['codigo', 'descricao', 'categoria', 'unidade', 'preco', 'preco_compra', 'marca', 'ncm'];
const LIMITE_MATERIAL = { codigo: 20, descricao: 300, categoria: 50, unidade: 10, marca: 100, ncm: 10 };
function dadosDoMaterial(body, atual = null) {
  const d = {};
  for (const c of CAMPOS_MATERIAL) {
    const v = Object.prototype.hasOwnProperty.call(body || {}, c) ? body[c] : atual?.[c];
    d[c] = v == null ? null : (typeof v === 'string' ? v.trim() || null : v);
  }
  if (!d.descricao || !d.categoria || !d.unidade) return { erro: 'Descrição, categoria e unidade são obrigatórios' };
  for (const c of ['preco', 'preco_compra']) {
    if (d[c] == null) continue;
    const n = typeof d[c] === 'number' ? d[c] : Number(String(d[c]).replace(',', '.'));
    if (!Number.isFinite(n)) return { erro: `Preço inválido: "${d[c]}".` };
    if (n < 0) return { erro: 'Preço não pode ser negativo' };
    d[c] = n;
  }
  for (const [c, max] of Object.entries(LIMITE_MATERIAL)) if (d[c] && String(d[c]).length > max) return { erro: `O campo ${c} passa de ${max} caracteres.` };
  return { d };
}

async function criar(req, res) {
  const { d, erro } = dadosDoMaterial(req.body);
  if (erro) return res.status(400).json({ erro });

  try {
    // o banco não aceita dois materiais ativos com a mesma descrição (índice único)
    const existente = await pool.query('SELECT id FROM materiais WHERE ativo = true AND LOWER(TRIM(descricao)) = LOWER(TRIM($1))', [d.descricao]);
    if (existente.rows.length) return res.status(409).json({ erro: 'Já existe um material com essa descrição no catálogo' });
    const result = await pool.query(
      `INSERT INTO materiais (codigo, descricao, categoria, unidade, preco, preco_compra, marca, ncm, origem, preco_manual)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'manual',true) RETURNING *`,
      [d.codigo, d.descricao, d.categoria, d.unidade, d.preco || 0, d.preco_compra || null, d.marca, d.ncm]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ erro: 'Já existe um material com essa descrição no catálogo' });
    throw err; // erro de entrada do banco vira 400 no tratador central (middleware/erros.js)
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  try {
    const antes = (await pool.query('SELECT * FROM materiais WHERE id = $1 AND ativo = true', [id])).rows[0];
    if (!antes) return res.status(404).json({ erro: 'Material não encontrado' });
    const { d, erro } = dadosDoMaterial(req.body, antes);
    if (erro) return res.status(400).json({ erro });
    const result = await pool.query(
      `UPDATE materiais SET codigo=$1, descricao=$2, categoria=$3,
       unidade=$4, preco=$5, preco_compra=$6, marca=$7, ncm=$8, origem='manual', preco_manual=true, atualizado_em=NOW()
       WHERE id=$9 AND ativo=true RETURNING *`,
      [d.codigo, d.descricao, d.categoria, d.unidade, d.preco || 0, d.preco_compra || null, d.marca, d.ncm, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ erro: 'Material não encontrado' });
    // histórico de preço: edição manual também fica registrada
    const depois = result.rows[0];
    if (antes && (Number(antes.preco) !== Number(depois.preco) || Number(antes.preco_compra || 0) !== Number(depois.preco_compra || 0))) {
      await registrarHistoricoPreco(pool, antes, { origem: 'manual', precoCompra: depois.preco_compra, precoVenda: depois.preco, unidade: depois.unidade, aplicado: true, referencia: `editado por ${req.usuario.nome}` })
        .catch(e => console.warn('Histórico de preço:', e.message));
    }
    res.json(depois);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ erro: 'Já existe outro material com essa descrição no catálogo' });
    throw err; // erro de entrada do banco vira 400 no tratador central (middleware/erros.js)
  }
}

async function remover(req, res) {
  const { id } = req.params;
  const r = await pool.query('UPDATE materiais SET ativo=false WHERE id=$1 AND ativo=true RETURNING id, descricao, preco', [id]);
  if (r.rows[0]) await registrarAuditoria(pool, { entidade: 'material', entidadeId: Number(id), acao: 'excluido', detalhes: r.rows[0], usuarioId: req.usuario.id });
  res.json({ mensagem: 'Material removido' });
}

async function importar(req, res, next) {
  const { materiais } = req.body;
  if (!Array.isArray(materiais) || materiais.length === 0) {
    return res.status(400).json({ erro: 'Lista de materiais inválida' });
  }

  try {
    const importados = await comTransacao(async (client) => {
    let importados = 0;
    for (const m of materiais) {
      if (!m.descricao || !m.categoria || !m.unidade) continue;
      if (Number(m.preco || m.pr || 0) < 0) continue;
      // descrição que já existe no catálogo é ignorada (índice único do banco)
      const r = await client.query(
        `INSERT INTO materiais (codigo, descricao, categoria, unidade, preco, preco_compra, marca, ncm, origem)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT ((LOWER(TRIM(descricao)))) WHERE ativo = true DO NOTHING`,
        [m.codigo || m.cod, m.descricao || m.desc, m.categoria || m.cat,
         m.unidade || m.un, m.preco || m.pr || 0, m.preco_compra || null, m.marca || '', m.ncm || null,
         m.origem || 'importacao']
      );
      importados += r.rowCount;
    }
      return importados;
    });

    res.json({ mensagem: `${importados} materiais importados com sucesso` });
  } catch (err) {
    // Antes esse catch descartava o erro sem logar: o usuário importava 500
    // materiais, recebia "Erro ao importar materiais" e não havia nenhum
    // rastro de qual linha causou o problema.
    console.error('Erro ao importar materiais:', err);
    next(err);
  }
}

async function extrairNota(req, res) {
  if (!req.file) {
    return res.status(400).json({ erro: 'Envie um arquivo PDF (DANFE) ou XML da NF-e' });
  }

  try {
    const resultado = await extrairNotaFiscal(req.file.buffer, req.file.originalname);
    if (resultado.itens.length === 0) {
      return res.status(422).json({ erro: 'Não foi possível identificar itens no arquivo enviado' });
    }
    res.json(resultado);
  } catch (err) {
    console.error('Erro ao extrair nota fiscal:', err);
    res.status(422).json({ erro: err.message || 'Erro ao ler o arquivo da nota fiscal' });
  }
}

async function categorias(req, res) {
  const result = await pool.query(
    "SELECT DISTINCT categoria FROM materiais WHERE ativo = true ORDER BY categoria"
  );
  res.json(result.rows.map(r => r.categoria));
}

// Dispara na hora a mesma varredura que já roda sozinha às 06:00 e às 18:00 (ver
// agendarVerificacaoDePastaFornecedores em server.js) — pra quem acabou de
// salvar um PDF na pasta e não quer esperar o ciclo automático nem reiniciar o backend.
async function verificarFornecedoresAgora(req, res) {
  try {
    // pelo registro comum das rotinas (services/rotinas.js) — aparece no painel de Integrações
    const resumo = await rotinas.executarRotina('fornecedores-pastas', { origem: 'manual', usuarioId: req.usuario?.id });
    res.json(resumo);
  } catch (err) {
    console.error('Erro ao verificar pasta de orçamentos de fornecedores:', err);
    res.status(500).json({ erro: err.message || 'Erro ao verificar pasta de orçamentos de fornecedores' });
  }
}

module.exports = { listar, criar, atualizar, remover, importar, extrairNota, categorias, comparar, verificarFornecedoresAgora };
