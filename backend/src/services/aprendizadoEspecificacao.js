// O que o sistema aprende com os projetos gerados pela especificação (migração 2.0-56) e como o
// próximo projeto usa isso SEM IA: carregar(perfil) devolve o "aprendido" no formato que o motor das
// skills recebe em opcoes.aprendido (skills/_comum/especificacao/leitor.js e
// skills/quadros/scripts/lib/especificacao.js):
//   { vocabulario: [{ alvo, id, padrao }], escolhas: {…regras…}, decisoes: { chave: valor },
//     respostas: { idDoPonto: 'manter' }, precos: [{ chave, descricao, referencia, preco, faixa, fonte, data, … }] }
// Ordem de força no motor: aprendido (aprovado pelo engenheiro) > perfil em dados > padrão do código.
const pool = require('../config/database');
const { hojeBrasilia } = require('../utils/dataHoje');

const TIPOS = new Set(['vocabulario', 'escolha', 'decisao', 'resposta', 'preco']);
const PERFIL_PRECO = '*';
const corta = (s, n) => String(s ?? '').slice(0, n);

function mesclar(a, b) {
  const out = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' ? mesclar(out[k], v) : v;
  return out;
}

// Linhas do banco → aprendido (função pura, testada sem banco)
function montarAprendido(linhas) {
  const ap = { vocabulario: [], escolhas: {}, decisoes: {}, respostas: {}, precos: [] };
  for (const l of linhas) {
    const v = l.valor || {};
    if (l.tipo === 'vocabulario' && v.padrao) ap.vocabulario.push({ alvo: v.alvo, id: v.id, padrao: v.padrao, grupo: v.grupo, rotulo: v.rotulo, valor: v.valor });
    else if (l.tipo === 'escolha') ap.escolhas = mesclar(ap.escolhas, v);
    else if (l.tipo === 'decisao' && v.valor != null) ap.decisoes[l.chave] = v.valor;
    else if (l.tipo === 'resposta' && v.resposta) ap.respostas[l.chave] = v.resposta;
    else if (l.tipo === 'preco' && Number(v.preco) > 0) ap.precos.push({ chave: l.chave, ...v, preco: Number(v.preco) });
  }
  return ap;
}

// O que uma aprovação ensina (função pura): a tela manda as correções de leitura, as respostas aos pontos,
// os preços aprovados e as escolhas de regra; aqui viram itens { tipo, chave, valor }.
//   correcoes: [{ frase, alvo: 'requisito'|'equipamento'|'sinal', id, grupo?, rotulo?, valor? }]
//   respostas: { idDoPonto: { acao: 'sugestao'|'manter', decisao?, valor? } }
//   precos:    [{ chave, descricao, referencia, preco, faixa, fonte, data, origem, alternativa, equivale, unidade }]
//   escolhas:  { …trecho de regras do perfil… }
function itensDaAprovacao({ correcoes = [], respostas = {}, precos = [], escolhas = null }, padraoDaFrase) {
  const itens = [];
  for (const c of correcoes) {
    if (!c || !c.frase || !c.id || !['requisito', 'equipamento', 'sinal'].includes(c.alvo)) continue;
    const padrao = padraoDaFrase(c.frase);
    itens.push({ tipo: 'vocabulario', chave: corta(`${c.alvo}:${c.id}:${padrao}`, 300), valor: { alvo: c.alvo, id: c.id, padrao, frase: corta(c.frase, 300), grupo: c.grupo, rotulo: c.rotulo, valor: c.valor } });
  }
  for (const [id, r] of Object.entries(respostas || {})) {
    if (!r) continue;
    if (r.acao === 'sugestao' && r.decisao && r.valor != null) itens.push({ tipo: 'decisao', chave: corta(r.decisao, 300), valor: { valor: r.valor, ponto: id } });
    else if (r.acao === 'manter') itens.push({ tipo: 'resposta', chave: corta(id, 300), valor: { resposta: 'manter' } });
  }
  for (const p of precos || []) {
    if (!p || !(Number(p.preco) > 0) || !(p.chave || p.descricao)) continue;
    itens.push({ tipo: 'preco', chave: corta(p.chave || p.descricao, 300), perfil: PERFIL_PRECO, valor: {
      descricao: corta(p.descricao, 300), referencia: corta(p.referencia, 200), preco: Number(p.preco), faixa: Array.isArray(p.faixa) ? p.faixa.map(Number) : null,
      fonte: corta(p.fonte, 200), data: p.data || hojeBrasilia(), origem: p.origem === 'estimativa' ? 'estimativa' : 'pesquisado', unidade: corta(p.unidade, 20),
      ...(p.alternativa && Number(p.alternativa.preco) > 0 ? { alternativa: { referencia: corta(p.alternativa.referencia, 200), preco: Number(p.alternativa.preco), ressalva: corta(p.alternativa.ressalva, 200) } } : {}),
      ...(p.equivale ? { equivale: corta(p.equivale, 300) } : {}),
    } });
  }
  if (escolhas && typeof escolhas === 'object' && Object.keys(escolhas).length) itens.push({ tipo: 'escolha', chave: corta(Object.keys(escolhas).sort().join('+'), 300), valor: escolhas });
  return itens;
}

async function carregar(perfil, { db = pool } = {}) {
  const { rows } = await db.query(
    `SELECT tipo, chave, valor FROM especificacao_aprendizado WHERE ativo AND (perfil = $1 OR perfil = $2) ORDER BY atualizado_em`, [perfil, PERFIL_PRECO]);
  return montarAprendido(rows);
}

async function aprender(itens, { perfil, usuarioId = null, laudoId = null, db = pool }) {
  let n = 0;
  for (const it of itens) {
    if (!TIPOS.has(it.tipo)) continue;
    await db.query(
      `INSERT INTO especificacao_aprendizado (perfil, tipo, chave, valor, usuario_id, laudo_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (perfil, tipo, chave) DO UPDATE SET valor = EXCLUDED.valor, usuario_id = EXCLUDED.usuario_id, laudo_id = EXCLUDED.laudo_id,
         confirmacoes = especificacao_aprendizado.confirmacoes + 1, ativo = true, atualizado_em = NOW()`,
      [corta(it.perfil || perfil, 60), it.tipo, corta(it.chave, 300), JSON.stringify(it.valor || {}), usuarioId, laudoId]);
    n++;
  }
  return n;
}

async function listar({ perfil = null, db = pool } = {}) {
  const { rows } = await db.query(
    `SELECT a.id, a.perfil, a.tipo, a.chave, a.valor, a.confirmacoes, a.ativo, a.atualizado_em, u.nome AS usuario
       FROM especificacao_aprendizado a LEFT JOIN usuarios u ON u.id = a.usuario_id
      WHERE ($1::text IS NULL OR a.perfil = $1 OR a.perfil = '*') ORDER BY a.tipo, a.atualizado_em DESC LIMIT 500`, [perfil]);
  return rows;
}

async function desativar(id, { db = pool } = {}) {
  const r = await db.query('UPDATE especificacao_aprendizado SET ativo = false, atualizado_em = NOW() WHERE id = $1', [id]);
  return r.rowCount;
}

module.exports = { carregar, aprender, listar, desativar, montarAprendido, itensDaAprovacao, PERFIL_PRECO };
