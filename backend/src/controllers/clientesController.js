const pool = require('../config/database');
const { registrarAuditoria } = require('../services/auditoria');
const { parsePaginacao, montarResposta } = require('../utils/paginacao');

async function listar(req, res) {
  const { busca } = req.query;
  const { pagina, porPagina, offset } = parsePaginacao(req.query);

  let condicoes = 'WHERE ativo = true';
  const params = [];

  if (busca) {
    params.push(`%${busca}%`);
    condicoes += ` AND (nome ILIKE $1 OR documento ILIKE $1 OR email ILIKE $1)`;
  }

  const total = await pool.query(`SELECT count(*) FROM clientes ${condicoes}`, params);
  const result = await pool.query(
    // municipio_uf: nome do município do código IBGE (cadastro fiscal, 2.4)
    `SELECT c.*, (SELECT m.nome || '-' || m.uf FROM municipios_ibge m WHERE m.codigo = c.codigo_municipio) AS municipio_uf
       FROM clientes c ${condicoes} ORDER BY nome LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, porPagina, offset]
  );
  res.json(montarResposta(result.rows, parseInt(total.rows[0].count, 10), pagina, porPagina));
}

// Validação do cadastro (teste de 28/10/2026: nome só com espaços, tipo
// inventado e e-mail sem "@" eram aceitos; nome acima de 200 caracteres virava 500)
// 2.4: campos fiscais para a NFS-e (migracoes/2.0-21-fiscal.js) — endereço em
// campos, inscrições, e-mail para a nota e retenção do ISS (booleano).
const CAMPOS = [
  'nome', 'documento', 'tipo', 'responsavel', 'telefone', 'email', 'endereco',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'codigo_municipio',
  'inscricao_municipal', 'inscricao_estadual', 'email_nota', 'retem_iss',
];
const TIPOS = ['Empresa', 'Pessoa Física', 'Órgão Público'];
const LIMITE = {
  nome: 200, documento: 20, responsavel: 100, telefone: 20, email: 100, endereco: 1000,
  logradouro: 200, numero: 20, complemento: 100, bairro: 100, inscricao_municipal: 20, inscricao_estadual: 20, email_nota: 100,
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function dadosDoCliente(body, atual = null) {
  // campo que não veio no pedido fica como está (antes o PUT parcial apagava documento, e-mail…)
  const d = {};
  for (const c of CAMPOS) {
    const v = Object.prototype.hasOwnProperty.call(body || {}, c) ? body[c] : atual?.[c];
    d[c] = v == null ? null : String(v).trim() || null;
  }
  d.tipo = d.tipo || 'Empresa';
  d.retem_iss = d.retem_iss === 'true' || d.retem_iss === '1';
  for (const c of ['cep', 'codigo_municipio', 'inscricao_municipal', 'inscricao_estadual']) d[c] = d[c] ? d[c].replace(/\D/g, '') || null : null;
  if (!d.nome) return { erro: 'Nome é obrigatório' };
  if (!TIPOS.includes(d.tipo)) return { erro: `Tipo inválido (use ${TIPOS.join(', ')}).` };
  if (d.email && !EMAIL.test(d.email)) return { erro: 'E-mail inválido.' };
  if (d.email_nota && !EMAIL.test(d.email_nota)) return { erro: 'E-mail para a nota inválido.' };
  if (d.cep && d.cep.length !== 8) return { erro: 'CEP tem 8 dígitos.' };
  if (d.codigo_municipio && d.codigo_municipio.length !== 7) return { erro: 'Código IBGE do município tem 7 dígitos.' };
  for (const [c, max] of Object.entries(LIMITE)) if (d[c] && d[c].length > max) return { erro: `O campo ${c} passa de ${max} caracteres.` };
  return { d };
}

// Município conferido na tabela do IBGE; sem endereço em texto (o da
// proposta), ele é montado a partir dos campos.
async function completarEndereco(d) {
  if (!d.codigo_municipio) return null;
  const { rows: [m] } = await pool.query('SELECT nome, uf FROM municipios_ibge WHERE codigo = $1', [d.codigo_municipio]);
  if (!m) return 'Município (código IBGE) não encontrado.';
  if (!d.endereco && d.logradouro) {
    const rua = [d.logradouro, d.numero, d.complemento].filter(Boolean).join(', ');
    const cep = d.cep ? `, CEP ${d.cep.slice(0, 5)}-${d.cep.slice(5)}` : '';
    d.endereco = `${rua}${d.bairro ? ` – ${d.bairro}` : ''}, ${m.nome}-${m.uf}${cep}`;
  }
  return null;
}

async function criar(req, res) {
  const { d, erro } = dadosDoCliente(req.body);
  if (erro) return res.status(400).json({ erro });
  const erroMunicipio = await completarEndereco(d);
  if (erroMunicipio) return res.status(400).json({ erro: erroMunicipio });
  const result = await pool.query(
    `INSERT INTO clientes (${CAMPOS.join(', ')})
     VALUES (${CAMPOS.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`,
    CAMPOS.map(c => d[c])
  );
  await registrarAuditoria(pool, { entidade: 'clientes', entidadeId: result.rows[0].id, acao: 'criar', usuarioId: req.usuario.id, detalhes: { nome: d.nome } });
  res.status(201).json(result.rows[0]);
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { rows: [atual] } = await pool.query('SELECT * FROM clientes WHERE id = $1 AND ativo = true', [id]);
  if (!atual) return res.status(404).json({ erro: 'Cliente não encontrado' });
  const { d, erro } = dadosDoCliente(req.body, atual);
  if (erro) return res.status(400).json({ erro });
  const erroMunicipio = await completarEndereco(d);
  if (erroMunicipio) return res.status(400).json({ erro: erroMunicipio });
  const result = await pool.query(
    `UPDATE clientes SET ${CAMPOS.map((c, i) => `${c}=$${i + 1}`).join(', ')}, atualizado_em=NOW()
     WHERE id=$${CAMPOS.length + 1} AND ativo=true RETURNING *`,
    [...CAMPOS.map(c => d[c]), id]
  );
  if (result.rows.length === 0) return res.status(404).json({ erro: 'Cliente não encontrado' });
  const mudou = CAMPOS.filter(c => (atual[c] ?? null) !== d[c]);
  if (mudou.length) await registrarAuditoria(pool, { entidade: 'clientes', entidadeId: atual.id, acao: 'editar', usuarioId: req.usuario.id, detalhes: { campos: mudou } });
  res.json(result.rows[0]);
}

async function remover(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query('UPDATE clientes SET ativo=false WHERE id=$1 AND ativo=true RETURNING id, nome', [id]);
  if (rows[0]) await registrarAuditoria(pool, { entidade: 'clientes', entidadeId: rows[0].id, acao: 'desativar', usuarioId: req.usuario.id, detalhes: { nome: rows[0].nome } });
  res.json({ mensagem: 'Cliente removido' });
}

module.exports = { listar, criar, atualizar, remover };
