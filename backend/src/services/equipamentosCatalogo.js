// Catálogo de equipamentos de climatização (fase 4 do roteiro — migração 2.0-42,
// rotas em routes/v2/equipamentosCatalogo.js). Mesmo padrão de componentes_quadro:
// qualquer usuário logado lista; cadastrar, editar, aprovar e excluir só o
// administrador; "verificado" só com a fonte (link ou documento do fabricante).
//
// A skill de climatização recebe a tabela em dados.catalogo_equipamentos
// (controllers/laudos/comum.js → injetarNosDados) e escolhe o menor equipamento do
// tipo com capacidade_kw ≥ a pedida, preferindo os verificados. O cálculo da skill é
// síncrono: a tabela (pequena) fica em cache, relida antes de cada uso
// (carregarLaudo de um projeto de climatização) e depois de cada gravação.
const pool = require('../config/database');
const { ErroHttp } = require('../utils/erros');
const { registrarAuditoria } = require('./auditoria');

const TIPOS = {
  bomba: 'Bomba de água', chiller: 'Chiller', exaustor: 'Exaustor / ventilador', fancoil: 'Fancoil / AHU', self: 'Self-contained / rooftop',
  split: 'Split', torre: 'Torre de resfriamento', vav: 'Caixa VAV', vrf_cond: 'VRF — unidade externa', vrf_evap: 'VRF — unidade interna',
};
const ORIGENS = ['catalogo_hm', 'usuario', 'pesquisa_ia'];
const TEXTOS = { tipo: 30, fabricante: 80, modelo: 120, descricao: 300, fonte_url: 1000, fonte_documento: 300, obs: 2000 };
// dados técnicos aceitos (números) — o que a skill usa e o que vale guardar do datasheet
const DADOS_NUMERICOS = ['capacidade_kw', 'capacidade_tr', 'capacidade_btuh', 'cop', 'iplv', 'eer', 'vazao_m3h', 'pressao_pa', 'potencia_kw', 'corrente_a', 'tensao_v',
  'vazao_agua_m3h', 'perda_carga_kpa', 'altura_mca', 'nivel_ruido_db', 'peso_kg', 'largura_mm', 'altura_mm', 'profundidade_mm'];
const DADOS_TEXTO = { refrigerante: 40, compressor: 60, alimentacao: 60, certificacao: 120 };
const CAMPOS = ['tipo', 'fabricante', 'modelo', 'descricao', 'dados', 'fonte_url', 'fonte_documento', 'obs'];

function lerNumero(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}
const urlValida = (u) => /^https?:\/\/[^\s]+$/i.test(u);

// Entrada da tela → registro limpo + lista de erros (função pura, testada sem banco)
function normalizarRegistro(entrada) {
  const e = entrada && typeof entrada === 'object' ? entrada : {};
  const erros = [];
  const r = {};
  for (const [campo, max] of Object.entries(TEXTOS)) {
    const v = e[campo];
    const t = v === null || v === undefined ? '' : (campo === 'obs' ? String(v).trim() : String(v).trim().replace(/\s+/g, ' '));
    r[campo] = t ? t.slice(0, max) : null;
  }
  if (r.tipo) r.tipo = r.tipo.toLowerCase();
  if (!r.tipo || !TIPOS[r.tipo]) erros.push(`Tipo de equipamento inválido (${Object.keys(TIPOS).join(', ')})`);
  if (!r.fabricante) erros.push('Informe o fabricante');
  if (!r.modelo) erros.push('Informe o modelo (código comercial do fabricante)');
  if (r.fonte_url && !urlValida(r.fonte_url)) erros.push('O link da fonte precisa começar com http:// ou https://');
  const d = e.dados && typeof e.dados === 'object' && !Array.isArray(e.dados) ? e.dados : {};
  const dados = {};
  for (const k of DADOS_NUMERICOS) {
    const n = lerNumero(d[k]);
    if (Number.isNaN(n)) { erros.push(`Valor inválido em "${k}"`); continue; }
    if (n !== null && n < 0) { erros.push(`"${k}" não pode ser negativo`); continue; }
    if (n !== null) dados[k] = n;
  }
  for (const [k, max] of Object.entries(DADOS_TEXTO)) if (d[k] != null && String(d[k]).trim()) dados[k] = String(d[k]).trim().slice(0, max);
  // capacidade em kW é o que a skill compara: deriva de TR ou BTU/h quando só vier uma delas
  if (dados.capacidade_kw == null && dados.capacidade_tr != null) dados.capacidade_kw = Math.round(dados.capacidade_tr * 3.5168525 * 100) / 100;
  if (dados.capacidade_kw == null && dados.capacidade_btuh != null) dados.capacidade_kw = Math.round((dados.capacidade_btuh / 3412.142) * 100) / 100;
  if (['chiller', 'split', 'vrf_evap', 'vrf_cond', 'self', 'fancoil'].includes(r.tipo) && !(dados.capacidade_kw > 0)) erros.push('Informe a capacidade (kW, TR ou BTU/h)');
  r.dados = dados;
  return { registro: r, erros: [...new Set(erros)] };
}

function paraSaida(row) {
  if (!row) return null;
  return {
    id: row.id, tipo: row.tipo, fabricante: row.fabricante, modelo: row.modelo, descricao: row.descricao || null, dados: row.dados || {},
    fonte_url: row.fonte_url || null, fonte_documento: row.fonte_documento || null, obs: row.obs || null, origem: row.origem,
    verificado: row.verificado === true, verificado_por: row.verificado_por || null, verificado_em: row.verificado_em || null,
    criado_em: row.criado_em || null, atualizado_em: row.atualizado_em || null,
  };
}

function exigirValido(entrada) {
  const { registro, erros } = normalizarRegistro(entrada);
  if (erros.length) throw new ErroHttp(400, erros.join('; '));
  return registro;
}
function conferirAprovacao(r) {
  if (!r.fonte_url && !r.fonte_documento) throw new ErroHttp(400, 'Para marcar como verificado, informe o link ou o documento do fabricante (datasheet, certificado AHRI) onde os dados foram conferidos.');
}
const erroDuplicado = (e, r) => (e && e.code === '23505' ? new ErroHttp(409, `Já existe no catálogo o equipamento ${r.fabricante} ${r.modelo}. Edite o registro existente.`) : e);
const valores = (r) => CAMPOS.map(c => (c === 'dados' ? JSON.stringify(r.dados || {}) : r[c]));

async function listar({ tipo, fabricante, verificado, texto } = {}) {
  const cond = [];
  const par = [];
  if (tipo && TIPOS[tipo]) { par.push(tipo); cond.push(`tipo = $${par.length}`); }
  if (fabricante) { par.push(String(fabricante).toLowerCase()); cond.push(`lower(fabricante) = $${par.length}`); }
  if (verificado === 'sim' || verificado === 'nao') cond.push(`verificado = ${verificado === 'sim'}`);
  if (texto) { par.push(`%${String(texto).toLowerCase().slice(0, 100)}%`); cond.push(`(lower(fabricante) LIKE $${par.length} OR lower(modelo) LIKE $${par.length} OR lower(coalesce(descricao, '')) LIKE $${par.length})`); }
  const { rows } = await pool.query(`SELECT * FROM equipamentos_catalogo ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''} ORDER BY lower(fabricante), tipo, lower(modelo)`, par);
  return { itens: rows.map(paraSaida), total: rows.length, tipos: Object.entries(TIPOS).map(([valor, rotulo]) => ({ valor, rotulo })).sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR')) };
}

async function buscarUm(id) {
  const { rows: [row] } = await pool.query('SELECT * FROM equipamentos_catalogo WHERE id = $1', [id]);
  return paraSaida(row);
}

async function criar(entrada, usuario) {
  const r = exigirValido(entrada);
  const verificado = entrada?.verificado === true;
  if (verificado) conferirAprovacao(r);
  const cols = [...CAMPOS, 'origem', 'verificado', 'verificado_por', 'verificado_em', 'usuario_id'];
  const vals = [...valores(r), 'usuario', verificado, verificado ? usuario?.nome || null : null, verificado ? new Date() : null, usuario?.id || null];
  try {
    const { rows: [row] } = await pool.query(`INSERT INTO equipamentos_catalogo (${cols.join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`, vals);
    invalidarCache();
    return paraSaida(row);
  } catch (e) { throw erroDuplicado(e, r); }
}

async function atualizar(id, entrada, usuario) {
  const atual = await buscarUm(id);
  if (!atual) throw new ErroHttp(404, 'Equipamento não encontrado.');
  const r = exigirValido(entrada);
  const verificado = entrada?.verificado === true;
  if (verificado) conferirAprovacao(r);
  const manter = verificado && atual.verificado;
  const vals = [...valores(r), verificado, verificado ? (manter ? atual.verificado_por : usuario?.nome || null) : null, verificado ? (manter ? atual.verificado_em : new Date()) : null, id];
  const n = CAMPOS.length;
  try {
    const { rows: [row] } = await pool.query(
      `UPDATE equipamentos_catalogo SET ${CAMPOS.map((c, i) => `${c} = $${i + 1}`).join(', ')}, origem = 'usuario', verificado = $${n + 1}, verificado_por = $${n + 2},
         verificado_em = $${n + 3}, atualizado_em = NOW() WHERE id = $${n + 4} RETURNING *`, vals);
    invalidarCache();
    return paraSaida(row);
  } catch (e) { throw erroDuplicado(e, r); }
}

async function aprovar(id, usuario) {
  const atual = await buscarUm(id);
  if (!atual) throw new ErroHttp(404, 'Equipamento não encontrado.');
  conferirAprovacao(atual);
  const { rows: [row] } = await pool.query('UPDATE equipamentos_catalogo SET verificado = TRUE, verificado_por = $1, verificado_em = NOW(), atualizado_em = NOW() WHERE id = $2 RETURNING *', [usuario?.nome || null, id]);
  invalidarCache();
  return paraSaida(row);
}

async function remover(id, usuario) {
  const atual = await buscarUm(id);
  if (!atual) throw new ErroHttp(404, 'Equipamento não encontrado.');
  await pool.query('DELETE FROM equipamentos_catalogo WHERE id = $1', [id]);
  invalidarCache();
  await registrarAuditoria(pool, { entidade: 'equipamento_catalogo', entidadeId: id, acao: 'excluir', detalhes: atual, usuarioId: usuario?.id || null });
  return atual;
}

// ── Injeção nos dados da skill de climatização ──────────────────────────────
let cache = null; // [registros] | null = ainda não lido
function invalidarCache() { cache = null; }
async function atualizarCache() {
  try {
    const { rows } = await pool.query('SELECT * FROM equipamentos_catalogo ORDER BY id');
    cache = rows.map(paraSaida);
  } catch (e) {
    // banco sem a migração 2.0-42 ainda (backend não reiniciado): a skill segue com os típicos
    if (e && e.code === '42P01') cache = []; else throw e;
  }
  return cache;
}
// dados → cópia com dados.catalogo_equipamentos (só o que a skill usa); tabela vazia: os mesmos dados
function injetarNosDados(dados, registros = cache) {
  const lista = (registros || []).map(r => ({ tipo: r.tipo, fabricante: r.fabricante, modelo: r.modelo, dados: r.dados || {}, verificado: r.verificado === true, fonte: r.fonte_documento || r.fonte_url || null }));
  if (!lista.length) return dados;
  return { ...dados, catalogo_equipamentos: lista };
}

module.exports = { TIPOS, ORIGENS, normalizarRegistro, paraSaida, listar, buscarUm, criar, atualizar, aprovar, remover, atualizarCache, invalidarCache, injetarNosDados };
