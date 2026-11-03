// Atribuição dos lançamentos do financeiro (Pix) às obras. A margem de uma obra (utils/obras.js,
// resumoFinanceiro) só conta o que está ligado a ela; sem isso toda obra parece ter margem de ~100%.
//
// O sistema AGRUPA os lançamentos sem obra por tipo + nome, SUGERE a obra só quando o sinal é seguro
// (o prestador tem contrato em uma única obra; ou o pagador é o cliente de uma única obra em andamento)
// e o administrador confirma por grupo. A escolha pode ser lembrada: os próximos Pix desse nome já
// entram ligados (aplicarRegras, chamada depois da importação por e-mail). Nada é ligado sem confirmação,
// a não ser por regra que o próprio administrador criou.
// O sinal mais seguro é o Pix ligado a uma nota fiscal cuja proposta é de uma obra (nota → proposta → obra):
// vira sugestão de confiança alta. Ao ligar o Pix à nota ele já leva essa obra (services/notasAReceber.js),
// então aqui só aparecem os ligados antes disso ou cuja nota ganhou proposta/obra depois.
const pool = require('../config/database');
const { normalizarTexto } = require('../utils/obras');

const TIPOS = ['recebido', 'realizado'];
const STATUS_ENCERRADA = new Set(['concluida', 'cancelada']);

const chaveNome = (nome) => normalizarTexto(nome).slice(0, 200);
const arred = (n) => Math.round(n * 100) / 100;
const isoDia = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

// Agrupa por tipo + nome normalizado. `prestadores` junta os prestador_id vistos no grupo.
function agrupar(movimentos) {
  const mapa = new Map();
  for (const m of movimentos) {
    const chave = chaveNome(m.nome);
    if (!chave || !TIPOS.includes(m.tipo)) continue;
    const id = `${m.tipo}|${chave}`;
    let g = mapa.get(id);
    if (!g) {
      g = { tipo: m.tipo, chave, nome: String(m.nome).trim(), n: 0, total: 0, de: null, ate: null, prestadores: new Set(), obrasDasNotas: new Set(), comNotaDeObra: 0 };
      mapa.set(id, g);
    }
    g.n++;
    g.total += Number(m.valor) || 0;
    const dia = isoDia(m.data_hora);
    if (dia && (!g.de || dia < g.de)) g.de = dia;
    if (dia && (!g.ate || dia > g.ate)) g.ate = dia;
    if (m.prestador_id) g.prestadores.add(m.prestador_id);
    // obra da proposta da nota a que o Pix está ligado (carregarPendentes)
    if (m.obra_da_nota) { g.obrasDasNotas.add(m.obra_da_nota); g.comNotaDeObra++; }
  }
  return [...mapa.values()].map(g => ({ ...g, total: arred(g.total), prestadores: [...g.prestadores], obrasDasNotas: [...g.obrasDasNotas] }))
    .sort((a, b) => b.total - a.total);
}

// Sugestão para um grupo, ou null. Só sinal seguro:
//  - recebido ligado a nota: TODOS os Pix do grupo estão ligados a notas cuja proposta é da MESMA obra →
//    confiança 'alta'. Só parte deles (ou notas de obras diferentes): essas obras entram como candidatas;
//  - realizado: o prestador tem contrato ligado a UMA única obra;
//  - recebido: o nome do pagador é o cliente de UMA única obra que ainda não foi encerrada.
// Quando há mais de uma obra possível, devolve `candidatas` (sem sugerir uma). As sugestões pelo contrato
// ou pelo nome do cliente são 'media': o administrador confere antes de confirmar.
function sugerir(grupo, contexto = {}) {
  const base = sugerirPeloCadastro(grupo, contexto);
  const daNota = grupo.tipo === 'recebido' ? (grupo.obrasDasNotas || []) : [];
  if (!daNota.length) return base;
  if (daNota.length === 1 && grupo.comNotaDeObra === grupo.n) {
    return { obra_id: daNota[0], motivo: grupo.n === 1 ? 'o Pix está ligado a uma nota desta obra' : 'os Pix estão ligados a notas desta obra', confianca: 'alta' };
  }
  // todos com nota (de obras diferentes): só as obras das notas; parte sem nota: o cadastro também conta
  const todos = grupo.comNotaDeObra === grupo.n;
  const doCadastro = todos ? [] : [...(base?.obra_id ? [base.obra_id] : []), ...(base?.candidatas || [])];
  const candidatas = [...new Set([...daNota, ...doCadastro])];
  const parte = `${grupo.comNotaDeObra} de ${grupo.n} Pix estão ligados a notas`;
  if (candidatas.length === 1) return { obra_id: candidatas[0], motivo: base ? `${base.motivo}; ${parte} desta obra` : `${parte} desta obra`, confianca: 'media' };
  return { obra_id: null, candidatas, motivo: todos ? 'os Pix desse nome estão ligados a notas de obras diferentes' : `${parte} de outra obra (ou de mais de uma)` };
}

function sugerirPeloCadastro(grupo, { obras = [], contratos = [] } = {}) {
  if (grupo.tipo === 'realizado' && grupo.prestadores.length === 1) {
    const ids = [...new Set(contratos.filter(c => c.prestador_id === grupo.prestadores[0] && c.obra_id).map(c => c.obra_id))];
    if (ids.length === 1) return { obra_id: ids[0], motivo: 'o prestador tem contrato nesta obra', confianca: 'media' };
    if (ids.length > 1) return { obra_id: null, candidatas: ids, motivo: 'o prestador tem contrato em mais de uma obra' };
  }
  if (grupo.tipo === 'recebido') {
    const casa = (o) => {
      const c = normalizarTexto(o.cliente_nome);
      return c.length >= 6 && grupo.chave.length >= 6 && (c === grupo.chave || c.includes(grupo.chave) || grupo.chave.includes(c));
    };
    const ativas = obras.filter(o => !STATUS_ENCERRADA.has(o.status) && casa(o));
    if (ativas.length === 1) return { obra_id: ativas[0].id, motivo: 'o pagador é o cliente desta obra', confianca: 'media' };
    if (ativas.length > 1) return { obra_id: null, candidatas: ativas.map(o => o.id), motivo: 'o pagador é cliente de mais de uma obra' };
  }
  return null;
}

async function carregarPendentes(db = pool) {
  const [movs, regras, obras, contratos] = await Promise.all([
    // obra_da_nota: nota emitida → proposta → obra (o sinal de confiança alta)
    db.query(`SELECT fm.id, fm.tipo, fm.nome, fm.valor, fm.data_hora, fm.prestador_id, pr.obra_id AS obra_da_nota
                FROM financeiro_movimentos fm
                LEFT JOIN notas_fiscais n ON n.id = fm.nota_id AND n.situacao = 'emitida'
                LEFT JOIN propostas pr ON pr.id = n.proposta_id
               WHERE fm.obra_id IS NULL AND fm.nome IS NOT NULL`),
    db.query('SELECT tipo, nome_chave FROM regras_movimento_obra WHERE geral'),
    db.query('SELECT id, codigo, nome, cliente_nome, status FROM obras ORDER BY codigo'),
    db.query('SELECT prestador_id, obra_id FROM contratos WHERE obra_id IS NOT NULL'),
  ]);
  const gerais = new Set(regras.rows.map(r => `${r.tipo}|${r.nome_chave}`));
  const grupos = agrupar(movs.rows).filter(g => !gerais.has(`${g.tipo}|${g.chave}`));
  const porId = new Map(obras.rows.map(o => [o.id, o]));
  const resumo = { recebido: { n: 0, valor: 0 }, realizado: { n: 0, valor: 0 } };
  for (const g of grupos) {
    g.sugestao = sugerir(g, { obras: obras.rows, contratos: contratos.rows });
    if (g.sugestao?.obra_id) g.sugestao.obra = porId.get(g.sugestao.obra_id) ? { codigo: porId.get(g.sugestao.obra_id).codigo, nome: porId.get(g.sugestao.obra_id).nome } : null;
    if (g.sugestao?.candidatas) g.sugestao.candidatas = g.sugestao.candidatas.map(i => porId.get(i)).filter(Boolean).map(o => ({ id: o.id, codigo: o.codigo, nome: o.nome }));
    resumo[g.tipo].n += g.n;
    resumo[g.tipo].valor = arred(resumo[g.tipo].valor + g.total);
  }
  return { grupos, resumo, obras: obras.rows.map(o => ({ id: o.id, codigo: o.codigo, nome: o.nome, status: o.status })) };
}

// Liga (ou marca como "geral") os lançamentos SEM obra de um grupo, dentro do período pedido.
// `lembrar` grava a regra para os próximos. Devolve quantos lançamentos mudaram.
async function atribuir(db, { tipo, chave, obra_id = null, geral = false, lembrar = false, de = null, ate = null }, usuarioId = null) {
  if (!TIPOS.includes(tipo)) throw Object.assign(new Error('Tipo inválido.'), { status: 400 });
  if (!chave || typeof chave !== 'string') throw Object.assign(new Error('Grupo inválido.'), { status: 400 });
  const obraId = geral ? null : Number(obra_id);
  if (!geral && (!Number.isInteger(obraId) || obraId < 1)) throw Object.assign(new Error('Escolha a obra (ou marque como despesa geral).'), { status: 400 });
  const ehDia = (s) => s == null || s === '' || /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (!ehDia(de) || !ehDia(ate)) throw Object.assign(new Error('Período inválido.'), { status: 400 });
  if (!geral) {
    const o = await db.query('SELECT 1 FROM obras WHERE id = $1', [obraId]);
    if (!o.rowCount) throw Object.assign(new Error('Obra não encontrada.'), { status: 404 });
  }
  const { rows } = await db.query(`SELECT id, nome, data_hora FROM financeiro_movimentos WHERE obra_id IS NULL AND tipo = $1 AND nome IS NOT NULL`, [tipo]);
  const ids = rows.filter(r => chaveNome(r.nome) === chave && (!de || isoDia(r.data_hora) >= de) && (!ate || isoDia(r.data_hora) <= ate)).map(r => r.id);
  let mudou = 0;
  if (!geral && ids.length) mudou = (await db.query('UPDATE financeiro_movimentos SET obra_id = $1 WHERE id = ANY($2::int[]) AND obra_id IS NULL', [obraId, ids])).rowCount;
  if (!geral && mudou) await db.query('UPDATE obras SET atualizado_em = NOW() WHERE id = $1', [obraId]);
  if (geral || lembrar) {
    await db.query(
      `INSERT INTO regras_movimento_obra (tipo, nome_chave, obra_id, geral, criado_por) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tipo, nome_chave) DO UPDATE SET obra_id = EXCLUDED.obra_id, geral = EXCLUDED.geral, criado_por = EXCLUDED.criado_por, criado_em = NOW()`,
      [tipo, chave, obraId, !!geral, usuarioId]
    );
  }
  return { mudou, regra: !!(geral || lembrar) };
}

// Liga os lançamentos novos aos quais uma regra "lembrar" se aplica (depois de cada importação de Pix).
async function aplicarRegras(db = pool) {
  // a regra vale daqui para frente: lançamento criado antes dela (inclusive os de outro período, que o
  // administrador deixou de fora de propósito) continua como estava. A comparação é no SQL (timestamp × timestamptz).
  const { rows } = await db.query(
    `SELECT fm.id, fm.nome, r.nome_chave, r.obra_id
       FROM financeiro_movimentos fm
       JOIN regras_movimento_obra r ON r.tipo = fm.tipo AND NOT r.geral AND r.obra_id IS NOT NULL AND fm.criado_em >= r.criado_em
      WHERE fm.obra_id IS NULL AND fm.nome IS NOT NULL`
  );
  const porObra = new Map();
  for (const m of rows) {
    if (chaveNome(m.nome) === m.nome_chave) porObra.set(m.obra_id, [...(porObra.get(m.obra_id) || []), m.id]);
  }
  let total = 0;
  for (const [obra, ids] of porObra) {
    total += (await db.query('UPDATE financeiro_movimentos SET obra_id = $1 WHERE id = ANY($2::int[]) AND obra_id IS NULL', [obra, ids])).rowCount;
    await db.query('UPDATE obras SET atualizado_em = NOW() WHERE id = $1', [obra]);
  }
  return total;
}

module.exports = { chaveNome, agrupar, sugerir, carregarPendentes, atribuir, aplicarRegras };
