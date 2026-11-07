// Comparador de orçamentos da concorrência (06/11/2026): importa o orçamento de um concorrente para o mesmo projeto,
// guarda as linhas e compara com a proposta da H&M (utils/comparadorOrcamentos.js). Leitura SEM IA (planilha de
// qualquer layout ou PDF com texto: utils/leitorOrcamentoConcorrente.js); a IA só entra quando o usuário pede
// (usarIA) e a leitura local não achou nada — PDF escaneado ou layout que o leitor não entende.
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const pool = require('../config/database');
const { comTransacao } = require('./transacao');
const { textoDoPdf } = require('../utils/leitorPdf');
const { workbookDoXls } = require('../utils/leitorXls');
const { lerPlanilha, lerTexto, identificarConcorrente, tipoDoItem } = require('../utils/leitorOrcamentoConcorrente');
const { comparar } = require('../utils/comparadorOrcamentos');
const { ehMaoDeObra } = require('../utils/calculoProposta');
const { disciplinaDoSubgrupo } = require('./aprendizadoOrcamento');
const { registrarAuditoria } = require('./auditoria');

const EXTENSOES = /\.(pdf|xlsx|xlsm|xls)$/i;
const r2 = (v) => Math.round(Number(v) * 100) / 100;
const letras = (t) => (String(t || '').match(/[A-Za-zÀ-ÿ]/g) || []).length;

function tipoDoArquivo(buffer, nome = '') {
  const ini = buffer.subarray(0, 8);
  if (ini.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (ini[0] === 0x50 && ini[1] === 0x4b) return /\.(xlsx|xlsm)$/i.test(nome) || !/\.\w+$/.test(nome) ? 'xlsx' : null;
  if (ini[0] === 0xd0 && ini[1] === 0xcf && ini[2] === 0x11 && ini[3] === 0xe0) return 'xls';
  return null;
}

// Lê o arquivo do concorrente → { itens, metodo, totalDocumento, avisos, identificado, usouIA }
async function lerArquivo(buffer, nome, { usarIA = false } = {}) {
  const tipo = tipoDoArquivo(buffer, nome);
  if (!tipo) return { erro: 'Formato não suportado: envie o orçamento em PDF ou planilha Excel (.xlsx ou .xls).' };
  if (tipo === 'xlsx' || tipo === 'xls') {
    let wb;
    try {
      if (tipo === 'xls') wb = workbookDoXls(buffer);
      else { wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer); }
    } catch (e) {
      return { erro: `Não foi possível abrir a planilha: ${e.message.slice(0, 160)}` };
    }
    const r = lerPlanilha(wb);
    return { ...r, metodo: `planilha (${tipo})`, identificado: { nome: null, cnpj: null }, usouIA: false };
  }
  let texto = '';
  const avisos = [];
  try { texto = await textoDoPdf(buffer); } catch (e) { avisos.push(`PDF ilegível: ${e.message.slice(0, 160)}`); }
  const identificado = identificarConcorrente(texto);
  const local = letras(texto) >= 40 ? lerTexto(texto) : { itens: [], totalDocumento: null, avisos: ['O PDF não tem texto (escaneado ou imagem).'] };
  if (local.itens.length || !usarIA) {
    if (!local.itens.length) local.avisos.push('Para ler este arquivo marque "Ler com IA" (a IA só é usada quando a leitura local não acha os itens).');
    return { ...local, avisos: [...avisos, ...local.avisos], metodo: 'PDF (texto, sem IA)', identificado, usouIA: false };
  }
  // IA: só a pedido do usuário e só quando a leitura local não achou nada (regra "IA por último")
  const { extrairComIA, iaDisponivel } = require('./leitorCotacaoIA');
  if (!iaDisponivel()) return { ...local, avisos: [...avisos, ...local.avisos, 'Nenhuma IA configurada para ler o arquivo.'], metodo: 'PDF', identificado, usouIA: false };
  try {
    const r = await extrairComIA(buffer, 'pdf');
    const itens = r.itens.filter(i => i.descricao.length >= 4 && i.quantidade > 0 && i.precoImpresso > 0).map(i => ({
      descricao: i.descricao.slice(0, 500), unidade: i.unidade || null, quantidade: i.quantidade,
      valor_unitario: r2(i.precoImpresso), valor_material: null, valor_mao_obra: null,
      valor_total: r2(i.total ?? i.quantidade * i.precoImpresso), tipo: tipoDoItem(i.descricao, i.unidade, null, false),
      disciplina: null, secao: null,
    }));
    return { itens, totalDocumento: r.totalDocumento, metodo: `IA (${r.fonte}) — conferir`, identificado: { nome: r.fornecedor || identificado.nome, cnpj: identificado.cnpj },
      avisos: [...avisos, 'Lido por IA: confira as linhas antes de usar a comparação.'], usouIA: true };
  } catch (e) {
    return { ...local, avisos: [...avisos, ...local.avisos, `Leitura por IA indisponível agora (${e.message.slice(0, 160)}).`], metodo: 'PDF', identificado, usouIA: false };
  }
}

async function importar({ buffer, nome, propostaId = null, concorrente = null, cnpj = null, usarIA = false, usuarioId }) {
  const lido = await lerArquivo(buffer, nome, { usarIA });
  if (lido.erro) return { erro: lido.erro };
  if (!lido.itens.length) return { erro: `Nenhum item foi lido do arquivo. ${lido.avisos.join(' ')}`.trim() };
  let obraId = null;
  if (propostaId) {
    const { rows: [p] } = await pool.query('SELECT id, obra_id FROM propostas WHERE id = $1', [propostaId]);
    if (!p) return { erro: 'Proposta não encontrada.' };
    obraId = p.obra_id || null;
  }
  const nomeConcorrente = String(concorrente || lido.identificado?.nome || 'Concorrente').trim().slice(0, 200) || 'Concorrente';
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const soma = r2(lido.itens.reduce((s, i) => s + (Number(i.valor_total) || 0), 0));
  const id = await comTransacao(async (client) => {
    const { rows: [o] } = await client.query(
      `INSERT INTO orcamentos_concorrentes (proposta_id, obra_id, concorrente, cnpj, arquivo_nome, arquivo_hash, metodo, total_documento, soma_itens, avisos, usuario_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [propostaId, obraId, nomeConcorrente, (cnpj || lido.identificado?.cnpj || null)?.replace?.(/\D/g, '').slice(0, 20) || null,
       String(nome || '').slice(0, 255) || null, hash, lido.metodo, lido.totalDocumento || null, soma, JSON.stringify(lido.avisos), usuarioId]);
    for (let i = 0; i < lido.itens.length; i++) {
      const it = lido.itens[i];
      await client.query(
        `INSERT INTO orcamento_concorrente_itens (orcamento_id, ordem, descricao, unidade, quantidade, valor_unitario, valor_material, valor_mao_obra, valor_total, tipo, disciplina, secao)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [o.id, i, it.descricao, it.unidade ? String(it.unidade).slice(0, 20) : null, it.quantidade, it.valor_unitario, it.valor_material, it.valor_mao_obra,
         it.valor_total, it.tipo, it.disciplina ? String(it.disciplina).slice(0, 40) : null, it.secao ? String(it.secao).slice(0, 200) : null]);
    }
    await registrarAuditoria(client, { entidade: 'orcamentos_concorrentes', entidadeId: o.id, acao: 'importar', usuarioId,
      detalhes: { concorrente: nomeConcorrente, arquivo: nome, itens: lido.itens.length, metodo: lido.metodo, usouIA: lido.usouIA } });
    return o.id;
  });
  return { id, itens: lido.itens.length, metodo: lido.metodo, avisos: lido.avisos, usouIA: lido.usouIA };
}

async function listar({ propostaId = null, obraId = null } = {}) {
  const { rows } = await pool.query(
    `SELECT c.id, c.proposta_id, p.numero AS proposta_numero, p.cliente_nome, c.obra_id, c.concorrente, c.cnpj, c.arquivo_nome, c.metodo,
            c.total_documento::float8, c.soma_itens::float8, c.criado_em, c.usuario_id, u.nome AS usuario_nome,
            (SELECT COUNT(*)::int FROM orcamento_concorrente_itens i WHERE i.orcamento_id = c.id) AS itens
       FROM orcamentos_concorrentes c
       LEFT JOIN propostas p ON p.id = c.proposta_id
       LEFT JOIN usuarios u ON u.id = c.usuario_id
      WHERE ($1::int IS NULL OR c.proposta_id = $1) AND ($2::int IS NULL OR c.obra_id = $2)
      ORDER BY c.criado_em DESC, c.id DESC LIMIT 300`, [propostaId, obraId]);
  return rows;
}

// itens da proposta da H&M no formato do comparador (tipo pela seção; disciplina pelo subgrupo)
async function itensDaProposta(propostaId, db = pool) {
  const { rows } = await db.query(
    `SELECT i.id, i.descricao, i.unidade, i.quantidade::float8 AS quantidade, i.valor_unitario::float8 AS valor_unitario, i.subgrupo, s.nome AS secao
       FROM proposta_itens i JOIN proposta_secoes s ON s.id = i.secao_id
      WHERE i.proposta_id = $1 ORDER BY s.ordem, i.ordem, i.id`, [propostaId]);
  return rows.map(r => ({ ...r, tipo: ehMaoDeObra(r.secao) ? 'servico' : 'material', disciplina: disciplinaDoSubgrupo(r.subgrupo) }));
}

async function comparacao(id) {
  const { rows: [o] } = await pool.query(
    `SELECT c.*, c.total_documento::float8 AS total_documento, c.soma_itens::float8 AS soma_itens, p.numero AS proposta_numero, p.cliente_nome,
            p.subtotal_materiais::float8, p.subtotal_mao_obra::float8, p.total::float8 AS proposta_total, p.status AS proposta_status
       FROM orcamentos_concorrentes c LEFT JOIN propostas p ON p.id = c.proposta_id WHERE c.id = $1`, [id]);
  if (!o) return null;
  const { rows: deles } = await pool.query(
    `SELECT id, ordem, descricao, unidade, quantidade::float8, valor_unitario::float8, valor_material::float8, valor_mao_obra::float8,
            valor_total::float8, tipo, disciplina, secao, par_item_id, par_descricao, sem_par
       FROM orcamento_concorrente_itens WHERE orcamento_id = $1 ORDER BY ordem, id`, [id]);
  const cabecalho = {
    id: o.id, concorrente: o.concorrente, cnpj: o.cnpj, arquivo_nome: o.arquivo_nome, metodo: o.metodo, avisos: o.avisos || [],
    observacoes: o.observacoes, proposta_id: o.proposta_id, proposta_numero: o.proposta_numero, cliente_nome: o.cliente_nome,
    proposta_status: o.proposta_status, total_documento: o.total_documento, soma_itens: o.soma_itens, criado_em: o.criado_em, usuario_id: o.usuario_id,
  };
  if (!o.proposta_id) return { ...cabecalho, itensConcorrente: deles, comparacao: null };
  const nossos = await itensDaProposta(o.proposta_id);
  const resultado = comparar(nossos, deles, { subtotal_materiais: o.subtotal_materiais, subtotal_mao_obra: o.subtotal_mao_obra, total: o.proposta_total },
    { totalDocumento: o.total_documento });
  return { ...cabecalho, itensConcorrente: deles, itensNossos: nossos.map(n => ({ id: n.id, descricao: n.descricao, unidade: n.unidade })), comparacao: resultado };
}

async function atualizar(id, dados, usuarioId) {
  const campos = [];
  const valores = [];
  if (dados.concorrente != null) { valores.push(String(dados.concorrente).trim().slice(0, 200) || 'Concorrente'); campos.push(`concorrente = $${valores.length}`); }
  if (dados.cnpj !== undefined) { valores.push(dados.cnpj ? String(dados.cnpj).replace(/\D/g, '').slice(0, 20) : null); campos.push(`cnpj = $${valores.length}`); }
  if (dados.observacoes !== undefined) { valores.push(dados.observacoes ? String(dados.observacoes).slice(0, 5000) : null); campos.push(`observacoes = $${valores.length}`); }
  if (dados.proposta_id !== undefined) {
    const pid = dados.proposta_id == null || dados.proposta_id === '' ? null : Number(dados.proposta_id);
    if (pid != null && !(Number.isInteger(pid) && pid > 0)) return { erro: 'Proposta inválida.' };
    if (pid != null && !(await pool.query('SELECT 1 FROM propostas WHERE id = $1', [pid])).rows.length) return { erro: 'Proposta não encontrada.' };
    valores.push(pid); campos.push(`proposta_id = $${valores.length}`);
    // trocar de proposta desfaz os vínculos manuais (eram com os itens da outra)
    await pool.query('UPDATE orcamento_concorrente_itens SET par_item_id = NULL, par_descricao = NULL WHERE orcamento_id = $1', [id]);
  }
  if (!campos.length) return { erro: 'Nada para alterar.' };
  valores.push(id);
  const { rowCount } = await pool.query(`UPDATE orcamentos_concorrentes SET ${campos.join(', ')}, atualizado_em = NOW() WHERE id = $${valores.length}`, valores);
  if (!rowCount) return null;
  await registrarAuditoria(pool, { entidade: 'orcamentos_concorrentes', entidadeId: Number(id), acao: 'editar', usuarioId, detalhes: dados });
  return { ok: true };
}

// vínculo manual de uma linha do concorrente: { par_item_id } liga a um item nosso, { sem_par: true } diz "não temos
// equivalente", { par_item_id: null, sem_par: false } volta ao casamento automático. tipo também pode ser corrigido.
async function vincularItem(id, itemId, dados) {
  const { rows: [linha] } = await pool.query(
    `SELECT i.id, c.proposta_id FROM orcamento_concorrente_itens i JOIN orcamentos_concorrentes c ON c.id = i.orcamento_id
      WHERE i.id = $1 AND i.orcamento_id = $2`, [itemId, id]);
  if (!linha) return null;
  const sets = [];
  const vals = [];
  if (dados.par_item_id !== undefined || dados.sem_par !== undefined) {
    let parId = dados.par_item_id == null || dados.par_item_id === '' ? null : Number(dados.par_item_id);
    let parDesc = null;
    if (parId != null) {
      const { rows: [n] } = await pool.query('SELECT descricao FROM proposta_itens WHERE id = $1 AND proposta_id = $2', [parId, linha.proposta_id]);
      if (!n) return { erro: 'O item escolhido não é da proposta comparada.' };
      parDesc = n.descricao;
    }
    const semPar = dados.sem_par === true && parId == null;
    if (semPar) parId = null;
    vals.push(parId, parDesc, semPar);
    sets.push(`par_item_id = $${vals.length - 2}`, `par_descricao = $${vals.length - 1}`, `sem_par = $${vals.length}`);
  }
  if (dados.tipo !== undefined) {
    if (!['material', 'servico'].includes(dados.tipo)) return { erro: 'Tipo inválido (material ou servico).' };
    vals.push(dados.tipo); sets.push(`tipo = $${vals.length}`);
  }
  if (!sets.length) return { erro: 'Nada para alterar.' };
  vals.push(itemId);
  await pool.query(`UPDATE orcamento_concorrente_itens SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
  return { ok: true };
}

async function remover(id, usuarioId) {
  return comTransacao(async (client) => {
    const { rows: [o] } = await client.query('DELETE FROM orcamentos_concorrentes WHERE id = $1 RETURNING id, concorrente, arquivo_nome, proposta_id', [id]);
    if (!o) return null;
    await registrarAuditoria(client, { entidade: 'orcamentos_concorrentes', entidadeId: o.id, acao: 'excluir', usuarioId, detalhes: o });
    return o;
  });
}

module.exports = { importar, listar, comparacao, atualizar, vincularItem, remover, lerArquivo, EXTENSOES, paraTestes: { tipoDoArquivo, itensDaProposta } };
