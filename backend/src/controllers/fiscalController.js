// Cadastro fiscal (versão 2.4, etapa 1 da NFS-e Padrão Nacional): dados
// fiscais do prestador (empresa_fiscal), os serviços que a H&M fatura
// (empresa_servicos_nfse) e consulta às tabelas oficiais — códigos de
// tributação nacional (LC 116 desdobrada), NBS, municípios do IBGE e CEP.
// Ver models/migracoes/2.0-21-fiscal.js.
const path = require('path');
const pool = require('../config/database');
const { COMUM } = require('../config/caminhos');
const { EMPRESA } = require(path.join(COMUM, 'empresa.js'));
const { registrarAuditoria } = require('../services/auditoria');

const LIMITE_BUSCA = 30;
const digitos = (v) => String(v ?? '').replace(/\D/g, '');
const tem = (body, c) => Object.prototype.hasOwnProperty.call(body || {}, c);

// ── Empresa (prestador) ─────────────────────────────────────────────────────

async function lerEmpresa() {
  const { rows: [e] } = await pool.query(
    `SELECT f.*, m.nome AS municipio, m.uf
       FROM empresa_fiscal f LEFT JOIN municipios_ibge m ON m.codigo = f.codigo_municipio
      WHERE f.id = 1`
  );
  return e;
}

async function servicosDaEmpresa(soAtivos = true) {
  const { rows } = await pool.query(
    `SELECT e.*, s.descricao AS ctrib_nac_descricao, n.descricao AS nbs_descricao
       FROM empresa_servicos_nfse e
       LEFT JOIN fiscal_servicos s ON s.codigo = e.ctrib_nac
       LEFT JOIN fiscal_nbs n ON n.codigo = e.nbs
      ${soAtivos ? 'WHERE e.ativo' : ''}
      ORDER BY e.padrao DESC, e.nome`
  );
  return rows;
}

// O que falta para emitir — a tela mostra como lista.
function pendenciasEmpresa(e, servicos) {
  const p = [];
  if (!e.inscricao_municipal) p.push('Inscrição Municipal (CF/DF)');
  if (!e.cnae_principal) p.push('CNAE principal');
  if (!servicos.length) p.push('Pelo menos um serviço cadastrado (código de tributação nacional)');
  else if (!servicos.some(s => s.padrao)) p.push('Serviço padrão (o que a nota já abre escolhido)');
  return p;
}

async function obterEmpresa(req, res) {
  const [e, servicos] = await Promise.all([lerEmpresa(), servicosDaEmpresa()]);
  res.json({
    ...e,
    // fixos do papel timbrado (skills/_comum/empresa.js) — só leitura aqui
    razao_social: EMPRESA.razaoSocial,
    cnpj: EMPRESA.cnpj,
    endereco: `${EMPRESA.endereco}, CEP ${EMPRESA.cep}`,
    telefone: EMPRESA.telefone,
    email: EMPRESA.email,
    servicos,
    pendencias: pendenciasEmpresa(e, servicos),
  });
}

const CAMPOS_EMPRESA = [
  'inscricao_municipal', 'cnae_principal', 'cnae_principal_descricao', 'cnaes_secundarios', 'op_simp_nac',
  'reg_ap_trib_sn', 'reg_esp_trib', 'codigo_municipio', 'ambiente', 'serie_dps', 'proximo_numero_dps',
];

// lista de CNAEs vinda da tela: [{ codigo, descricao }] (código com ou sem pontuação)
function listaCnaes(v) {
  if (!Array.isArray(v)) return null;
  const vistos = new Set();
  const lista = [];
  for (const it of v) {
    const codigo = digitos(it?.codigo);
    if (codigo.length !== 7) return null;
    if (vistos.has(codigo)) continue;
    vistos.add(codigo);
    lista.push({ codigo, descricao: String(it?.descricao ?? '').trim().slice(0, 200) });
  }
  return lista;
}

// Valida e normaliza; campo que não veio fica como está.
async function dadosDaEmpresa(body, atual) {
  const v = (c) => (tem(body, c) ? body[c] : atual[c]);
  const texto = (c) => { const x = v(c); return x == null ? null : String(x).trim() || null; };
  const inteiro = (c) => { const x = v(c); return x === '' || x == null ? null : Number(x); };
  const d = {
    inscricao_municipal: digitos(texto('inscricao_municipal')) || null,
    cnae_principal: digitos(texto('cnae_principal')) || null,
    cnae_principal_descricao: texto('cnae_principal_descricao'),
    cnaes_secundarios: listaCnaes(v('cnaes_secundarios')),
    op_simp_nac: inteiro('op_simp_nac'),
    reg_ap_trib_sn: inteiro('reg_ap_trib_sn'),
    reg_esp_trib: inteiro('reg_esp_trib'),
    codigo_municipio: digitos(texto('codigo_municipio')),
    ambiente: texto('ambiente'),
    serie_dps: digitos(texto('serie_dps')),
    proximo_numero_dps: inteiro('proximo_numero_dps'),
  };
  if (d.inscricao_municipal && d.inscricao_municipal.length > 20) return { erro: 'Inscrição Municipal com mais de 20 dígitos.' };
  if (d.cnae_principal && d.cnae_principal.length !== 7) return { erro: 'CNAE tem 7 dígitos (ex.: 71.12-0-00).' };
  if (d.cnae_principal_descricao && d.cnae_principal_descricao.length > 200) return { erro: 'Descrição do CNAE passa de 200 caracteres.' };
  if (!d.cnaes_secundarios) return { erro: 'Lista de CNAEs secundários inválida (cada código tem 7 dígitos).' };
  if (![1, 2, 3].includes(d.op_simp_nac)) return { erro: 'Situação no Simples Nacional inválida.' };
  if (![1, 2, 3].includes(d.reg_ap_trib_sn)) return { erro: 'Regime de apuração inválido.' };
  if (!Number.isInteger(d.reg_esp_trib) || d.reg_esp_trib < 0 || d.reg_esp_trib > 6) return { erro: 'Regime especial inválido.' };
  if (!['homologacao', 'producao'].includes(d.ambiente)) return { erro: 'Ambiente inválido.' };
  if (!d.serie_dps || d.serie_dps.length > 5) return { erro: 'Série da DPS: de 1 a 5 dígitos.' };
  if (!Number.isSafeInteger(d.proximo_numero_dps) || d.proximo_numero_dps < 1) return { erro: 'Próximo número da DPS inválido.' };
  const { rows: [m] } = await pool.query('SELECT 1 FROM municipios_ibge WHERE codigo = $1', [d.codigo_municipio]);
  if (!m) return { erro: 'Município (código IBGE) não encontrado.' };
  d.cnaes_secundarios = JSON.stringify(d.cnaes_secundarios);
  return { d };
}

async function atualizarEmpresa(req, res) {
  const { rows: [atual] } = await pool.query('SELECT * FROM empresa_fiscal WHERE id = 1');
  const { d, erro } = await dadosDaEmpresa(req.body, atual);
  if (erro) return res.status(400).json({ erro });
  await pool.query(
    `UPDATE empresa_fiscal SET ${CAMPOS_EMPRESA.map((c, i) => `${c} = $${i + 1}`).join(', ')},
       atualizado_em = NOW(), atualizado_por = $${CAMPOS_EMPRESA.length + 1}
     WHERE id = 1`,
    [...CAMPOS_EMPRESA.map(c => d[c]), req.usuario.id]
  );
  const comoTexto = (c, x) => (c === 'cnaes_secundarios' && typeof x !== 'string' ? JSON.stringify(x) : String(x ?? '').trim());
  const mudou = CAMPOS_EMPRESA.filter(c => comoTexto(c, atual[c]) !== comoTexto(c, d[c]));
  if (mudou.length) await registrarAuditoria(pool, { entidade: 'empresa_fiscal', entidadeId: 1, acao: 'editar', usuarioId: req.usuario.id, detalhes: { campos: mudou } });
  return obterEmpresa(req, res);
}

// ── Serviços que a H&M fatura ───────────────────────────────────────────────

async function dadosDoServico(body, atual = {}) {
  const v = (c) => (tem(body, c) ? body[c] : atual[c]);
  const texto = (c) => { const x = v(c); return x == null ? null : String(x).trim() || null; };
  const aliq = v('aliquota_iss');
  const d = {
    nome: texto('nome'),
    ctrib_nac: digitos(texto('ctrib_nac')) || null,
    ctrib_mun: digitos(texto('ctrib_mun')) || null,
    nbs: digitos(texto('nbs')) || null,
    cnae: digitos(texto('cnae')) || null,
    aliquota_iss: aliq === '' || aliq == null ? null : Number(String(aliq).replace(',', '.')),
    descricao_padrao: texto('descricao_padrao'),
    padrao: v('padrao') === true || v('padrao') === 'true',
  };
  if (!d.nome) return { erro: 'Dê um nome ao serviço (ex.: "Projeto elétrico").' };
  if (d.nome.length > 100) return { erro: 'Nome do serviço passa de 100 caracteres.' };
  if (!d.ctrib_nac) return { erro: 'Escolha o código de tributação nacional.' };
  if (d.ctrib_mun && d.ctrib_mun.length !== 3) return { erro: 'Código de tributação municipal tem 3 dígitos.' };
  if (d.cnae && d.cnae.length !== 7) return { erro: 'CNAE tem 7 dígitos.' };
  if (d.aliquota_iss != null && !(d.aliquota_iss >= 0 && d.aliquota_iss <= 5)) return { erro: 'Alíquota do ISS entre 0% e 5%.' };
  if (d.descricao_padrao && d.descricao_padrao.length > 2000) return { erro: 'Descrição padrão passa de 2000 caracteres.' };
  const { rows: [s] } = await pool.query("SELECT 1 FROM fiscal_servicos WHERE codigo = $1 AND nivel = 'codigo'", [d.ctrib_nac]);
  if (!s) return { erro: 'Código de tributação nacional fora da lista oficial (6 dígitos, ex.: 07.01.01).' };
  if (d.nbs) {
    const { rows: [n] } = await pool.query('SELECT 1 FROM fiscal_nbs WHERE codigo = $1', [d.nbs]);
    if (!n) return { erro: 'Código NBS fora da lista oficial.' };
  }
  return { d };
}

const CAMPOS_SERVICO = ['nome', 'ctrib_nac', 'ctrib_mun', 'nbs', 'cnae', 'aliquota_iss', 'descricao_padrao', 'padrao'];

// grava o serviço; marcado como padrão, tira a marca dos outros (mesma transação)
async function gravarServico(req, res, id = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let atual = {};
    if (id) {
      ({ rows: [atual] } = await client.query('SELECT * FROM empresa_servicos_nfse WHERE id = $1 AND ativo FOR UPDATE', [id]));
      if (!atual) { await client.query('ROLLBACK'); return res.status(404).json({ erro: 'Serviço não encontrado' }); }
    }
    const { d, erro } = await dadosDoServico(req.body, atual);
    if (erro) { await client.query('ROLLBACK'); return res.status(400).json({ erro }); }
    if (d.padrao) await client.query('UPDATE empresa_servicos_nfse SET padrao = FALSE WHERE padrao AND id IS DISTINCT FROM $1', [id]);
    const valores = CAMPOS_SERVICO.map(c => d[c]);
    const { rows: [salvo] } = id
      ? await client.query(
        `UPDATE empresa_servicos_nfse SET ${CAMPOS_SERVICO.map((c, i) => `${c} = $${i + 1}`).join(', ')}, atualizado_em = NOW()
          WHERE id = $${CAMPOS_SERVICO.length + 1} RETURNING id`, [...valores, id])
      : await client.query(
        `INSERT INTO empresa_servicos_nfse (${CAMPOS_SERVICO.join(', ')})
         VALUES (${CAMPOS_SERVICO.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`, valores);
    await registrarAuditoria(client, { entidade: 'empresa_servicos_nfse', entidadeId: salvo.id, acao: id ? 'editar' : 'criar', usuarioId: req.usuario.id, detalhes: { nome: d.nome, ctrib_nac: d.ctrib_nac } });
    await client.query('COMMIT');
    res.status(id ? 200 : 201).json((await servicosDaEmpresa()).find(s => s.id === salvo.id));
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

const criarServico = (req, res) => gravarServico(req, res);
const atualizarServico = (req, res) => gravarServico(req, res, Number(req.params.id));

async function removerServico(req, res) {
  // desativa (nota emitida com ele continua apontando para o cadastro)
  const { rows: [s] } = await pool.query('UPDATE empresa_servicos_nfse SET ativo = FALSE, padrao = FALSE, atualizado_em = NOW() WHERE id = $1 AND ativo RETURNING id, nome', [req.params.id]);
  if (!s) return res.status(404).json({ erro: 'Serviço não encontrado' });
  await registrarAuditoria(pool, { entidade: 'empresa_servicos_nfse', entidadeId: s.id, acao: 'desativar', usuarioId: req.usuario.id, detalhes: { nome: s.nome } });
  res.json({ mensagem: 'Serviço removido' });
}

// ── Tabelas oficiais ────────────────────────────────────────────────────────

// sem acento e em minúsculas, no próprio SQL ("instalacao" acha "Instalação")
const semAcento = (expr) => `translate(lower(${expr}), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')`;

// Busca por código (com ou sem pontos) ou por palavras da descrição.
function filtroBusca(busca, colunaCodigo, colunaTexto, params) {
  const termo = String(busca || '').trim().slice(0, 100);
  if (!termo) return '';
  if (/^[\d\s./-]+$/.test(termo)) {
    params.push(`${digitos(termo)}%`);
    return ` AND ${colunaCodigo} LIKE $${params.length}`;
  }
  return termo.split(/\s+/).slice(0, 6).map(p => {
    params.push(`%${p}%`);
    return ` AND ${semAcento(colunaTexto)} LIKE ${semAcento(`$${params.length}`)}`;
  }).join('');
}

async function servicos(req, res) {
  const params = [];
  // só os códigos de 6 dígitos servem na DPS; item/subitem só com ?todos=1
  const soCodigos = req.query.todos !== '1';
  const where = `WHERE true${soCodigos ? " AND nivel = 'codigo'" : ''}${filtroBusca(req.query.busca, 'codigo', 'descricao', params)}`;
  const { rows } = await pool.query(`SELECT codigo, nivel, descricao FROM fiscal_servicos ${where} ORDER BY codigo LIMIT ${LIMITE_BUSCA}`, params);
  res.json(rows);
}

async function nbs(req, res) {
  const params = [];
  const where = `WHERE true${filtroBusca(req.query.busca, 'codigo', 'descricao', params)}`;
  const { rows } = await pool.query(`SELECT codigo, descricao FROM fiscal_nbs ${where} ORDER BY codigo LIMIT ${LIMITE_BUSCA}`, params);
  res.json(rows);
}

async function municipios(req, res) {
  const params = [];
  let where = 'WHERE true';
  const uf = String(req.query.uf || '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(uf)) { params.push(uf); where += ` AND uf = $${params.length}`; }
  where += filtroBusca(req.query.busca, 'codigo', 'nome', params);
  const { rows } = await pool.query(`SELECT codigo, nome, uf FROM municipios_ibge ${where} ORDER BY nome, uf LIMIT ${LIMITE_BUSCA}`, params);
  res.json(rows);
}

// CEP → endereço e código IBGE (ViaCEP, serviço público e gratuito). Só o CEP
// sai daqui. Fora do ar: 503, e a tela deixa preencher à mão.
async function cep(req, res) {
  const c = digitos(req.params.cep);
  if (c.length !== 8) return res.status(400).json({ erro: 'CEP tem 8 dígitos.' });
  let dados;
  try {
    const resp = await fetch(`https://viacep.com.br/ws/${c}/json/`, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    dados = await resp.json();
  } catch {
    return res.status(503).json({ erro: 'Consulta de CEP fora do ar agora. Preencha o endereço à mão.' });
  }
  if (dados.erro) return res.status(404).json({ erro: 'CEP não encontrado.' });
  const { rows: [m] } = await pool.query('SELECT codigo, nome, uf FROM municipios_ibge WHERE codigo = $1', [digitos(dados.ibge)]);
  res.json({
    cep: c,
    logradouro: dados.logradouro || '',
    complemento: dados.complemento || '',
    bairro: dados.bairro || '',
    codigo_municipio: m?.codigo || null,
    municipio: m?.nome || dados.localidade || '',
    uf: m?.uf || dados.uf || '',
  });
}

module.exports = {
  obterEmpresa, atualizarEmpresa, criarServico, atualizarServico, removerServico,
  servicos, nbs, municipios, cep,
};
