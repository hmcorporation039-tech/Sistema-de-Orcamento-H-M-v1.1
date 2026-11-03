// Consultas de leitura do canal remoto e das ferramentas novas do assistente (Fase 6): custos da obra
// por categoria, margem, Pix sem obra, notas, notas a receber, vencimentos, novidades das pastas e
// cotações. Uma função por consulta, que devolve { texto, dados }:
//   - o interpretador local do canal (sem IA) usa o `texto` direto na resposta;
//   - as rotas GET /consultas/* (routes/v2/canalConsultas.js) devolvem os dois, e as ferramentas do
//     MCP (assistenteFerramentas.mjs) repassam o `texto` ao modelo.
// Assim a conta é a mesma pelos dois caminhos. Nada aqui grava.
//
// O financeiro (custos, margem, Pix, notas) é só para o administrador e o papel financeiro: quem
// chama confere com `podeVerFinanceiro` (e a rota, com exigePapel).
const pool = require('../../config/database');
const O = require('../../utils/obras');
const { formatarMoeda, formatarData } = require('../../utils/htmlPdf');
const { periodoMesAtualBrasilia, hojeBrasilia } = require('../../utils/dataHoje');

const brl = (v) => formatarMoeda(v);
const PAPEIS_FINANCEIRO = ['admin', 'financeiro'];
const papelDe = (u) => (u ? (u.papel || u.role || null) : null);
const podeVerFinanceiro = (u) => PAPEIS_FINANCEIRO.includes(papelDe(u));
const ROTULO_CATEGORIA = { mao_de_obra: 'Mão de obra', material: 'Material', despesa: 'Despesa diária' };
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

class ErroConsulta extends Error {
  constructor(msg, status = 400) { super(msg); this.status = status; }
}

async function obraBasica(obraId, db = pool) {
  const { rows: [o] } = await db.query('SELECT id, codigo, nome, cliente_nome, status FROM obras WHERE id = $1', [obraId]);
  if (!o) throw new ErroConsulta('Obra não encontrada.', 404);
  return o;
}
const rotuloObra = (o) => `${o.codigo} — ${o.nome}${o.cliente_nome ? ` (${o.cliente_nome})` : ''}`;

// ── Custos da obra por categoria ────────────────────────────────────────
// Despesas (tipo 'realizado') e entradas (tipo 'recebido') ligadas à obra; `mes` = só o mês atual
// (Brasília). De onde vêm: os Pix e pagamentos lidos do e-mail ou lançados à mão no Financeiro e
// ligados à obra (financeiro_movimentos.obra_id).
async function custosDaObra(obraId, { mes = false, agora = new Date(), db = pool } = {}) {
  const obra = await obraBasica(obraId, db);
  const periodo = mes ? periodoMesAtualBrasilia(agora) : null;
  const params = [obra.id];
  let filtro = '';
  if (periodo) { params.push(periodo.dataInicio, periodo.dataFim); filtro = ' AND fm.data_hora >= $2::date AND fm.data_hora < ($3::date + 1)'; }
  const { rows } = await db.query(
    `SELECT fm.tipo, COALESCE(fm.categoria, '') AS categoria, count(*)::int AS n, COALESCE(sum(fm.valor), 0) AS total
       FROM financeiro_movimentos fm WHERE fm.obra_id = $1${filtro}
      GROUP BY 1, 2 ORDER BY 1, 4 DESC`, params);
  const gastos = rows.filter(r => r.tipo === 'realizado');
  const recebido = rows.filter(r => r.tipo === 'recebido').reduce((s, r) => s + Number(r.total), 0);
  const totalGasto = gastos.reduce((s, r) => s + Number(r.total), 0);
  const categorias = gastos.map(r => ({ categoria: r.categoria || null, rotulo: ROTULO_CATEGORIA[r.categoria] || 'Sem categoria', n: r.n, total: Number(r.total) }));
  const quando = periodo ? `de ${formatarData(periodo.dataInicio)} a ${formatarData(periodo.dataFim)}` : 'desde o início';
  const l = [`Custos da obra ${rotuloObra(obra)}, ${quando}:`];
  if (!categorias.length) l.push('Nenhum gasto ligado a esta obra no período.');
  for (const c of categorias) l.push(`- ${c.rotulo}: ${brl(c.total)} (${plural(c.n, 'lançamento', 'lançamentos')})`);
  if (categorias.length) l.push(`Total gasto: ${brl(totalGasto)}`);
  l.push(`Recebido${periodo ? ' no período' : ''}: ${brl(recebido)}`);
  const { rows: [semObra] } = await db.query(
    `SELECT count(*)::int AS n FROM financeiro_movimentos fm WHERE fm.obra_id IS NULL${periodo ? ' AND fm.data_hora >= $1::date AND fm.data_hora < ($2::date + 1)' : ''}`,
    periodo ? [periodo.dataInicio, periodo.dataFim] : []);
  if (semObra.n) l.push(`Atenção: ${plural(semObra.n, 'lançamento está', 'lançamentos estão')} sem obra${periodo ? ' neste período' : ''} e não entra${semObra.n === 1 ? '' : 'm'} nesta conta.`);
  return { texto: l.join('\n'), dados: { obra, periodo, categorias, total_gasto: totalGasto, recebido, sem_obra: semObra.n } };
}

// ── Margem da obra (a mesma regra do detalhe da obra: utils/obras.resumoFinanceiro) ──
const SQL_NOTA_FATURADA = `n.id, n.valor_servicos, n.valor_liquido, n.baixa_manual_em,
       (SELECT COALESCE(sum(f.valor), 0) FROM financeiro_movimentos f WHERE f.nota_id = n.id) AS recebido
  FROM notas_fiscais n JOIN propostas pr ON pr.id = n.proposta_id`;

async function margemDaObra(obraId, { db = pool } = {}) {
  const obra = await obraBasica(obraId, db);
  const [propostas, movimentos, contratos, notas] = [
    (await db.query('SELECT id, status, total, data FROM propostas WHERE obra_id = $1', [obra.id])).rows,
    (await db.query('SELECT tipo, valor FROM financeiro_movimentos WHERE obra_id = $1', [obra.id])).rows,
    (await db.query('SELECT valor FROM contratos WHERE obra_id = $1', [obra.id])).rows,
    (await db.query(`SELECT ${SQL_NOTA_FATURADA} WHERE pr.obra_id = $1 AND n.situacao = 'emitida'`, [obra.id])).rows,
  ];
  const r = O.resumoFinanceiro({ propostas, movimentos, contratos, notas });
  const base = r.orcado_base === 'aprovadas' ? 'propostas aprovadas' : r.orcado_base === 'ultima_ativa' ? 'última proposta ativa' : 'sem proposta aprovada ou ativa';
  const l = [
    `Margem da obra ${rotuloObra(obra)}:`,
    `- Orçado: ${brl(r.orcado)} (${base})`,
    `- Realizado (gastos ligados): ${brl(r.realizado)}`,
    `- Margem: ${brl(r.margem)}${r.margem_pct != null ? ` (${String(r.margem_pct).replace('.', ',')} % do orçado)` : ''}`,
    `- Recebido: ${brl(r.recebido)} · a receber: ${brl(r.a_receber)}`,
    `- Faturado (notas emitidas): ${brl(r.faturado)}${r.qtd_notas ? ` em ${plural(r.qtd_notas, 'nota', 'notas')}` : ''}`,
  ];
  if (r.contratado) l.push(`- Contratado com prestadores: ${brl(r.contratado)} (informativo, não entra na margem)`);
  return { texto: l.join('\n'), dados: { obra, resumo: r } };
}

// ── Pix sem obra ────────────────────────────────────────────────────────
async function pixSemObra({ limite = 10, db = pool } = {}) {
  const { rows: grupos } = await db.query(
    `SELECT tipo, count(*)::int AS n, COALESCE(sum(valor), 0) AS total FROM financeiro_movimentos WHERE obra_id IS NULL GROUP BY tipo ORDER BY tipo`);
  const { rows: recentes } = await db.query(
    `SELECT id, tipo, nome, valor, data_hora, categoria FROM financeiro_movimentos WHERE obra_id IS NULL ORDER BY data_hora DESC, id DESC LIMIT $1`, [limite]);
  const rotuloTipo = (t) => (t === 'recebido' ? 'recebidos' : t === 'realizado' ? 'pagos' : t);
  const l = [];
  if (!grupos.length) l.push('Todos os Pix e pagamentos estão ligados a uma obra.');
  else {
    l.push('Pix e pagamentos sem obra:');
    for (const g of grupos) l.push(`- ${rotuloTipo(g.tipo)}: ${g.n} (${brl(g.total)})`);
    l.push('\nMais recentes:');
    for (const m of recentes) l.push(`- ${formatarData(m.data_hora)} ${m.tipo === 'recebido' ? 'recebido de' : 'pago a'} ${m.nome || '—'}: ${brl(m.valor)}`);
    l.push('\nLigue cada um à obra no Financeiro (ou pela sugestão automática da tela).');
  }
  return { texto: l.join('\n'), dados: { grupos, recentes } };
}

// ── Notas fiscais ───────────────────────────────────────────────────────
const ROTULO_SITUACAO = { rascunho: 'rascunho', emitida: 'emitida', cancelada: 'cancelada', substituida: 'substituída' };
async function notasFiscais({ limite = 12, db = pool } = {}) {
  const { rows: contagem } = await db.query('SELECT situacao, count(*)::int AS n FROM notas_fiscais GROUP BY situacao ORDER BY situacao');
  const { rows: itens } = await db.query(
    `SELECT id, numero, situacao, data_emissao, tomador->>'nome' AS tomador_nome, valor_servicos, valor_liquido
       FROM notas_fiscais ORDER BY COALESCE(data_emissao, criado_em::date) DESC, id DESC LIMIT $1`, [limite]);
  const l = [];
  if (!contagem.length) l.push('Nenhuma nota fiscal no sistema.');
  else {
    l.push(`Notas fiscais: ${contagem.map(c => `${c.n} ${ROTULO_SITUACAO[c.situacao] || c.situacao}`).join(', ')}.`);
    l.push('\nMais recentes:');
    for (const n of itens) l.push(`- ${n.numero ? `Nota ${n.numero}` : `Rascunho #${n.id}`} — ${n.tomador_nome || '—'} — ${brl(n.valor_servicos)} — ${ROTULO_SITUACAO[n.situacao] || n.situacao}${n.data_emissao ? ` em ${formatarData(n.data_emissao)}` : ''}`);
  }
  return { texto: l.join('\n'), dados: { contagem, itens } };
}

// ── Notas a receber (emitidas e ainda não pagas: services/notasAReceber.js) ──
async function notasAReceber({ limite = 10, listar = null } = {}) {
  const r = await (listar || require('../notasAReceber').listar)();
  const s = r.resumo;
  const abertas = r.itens.filter(i => i.estado === 'aberta' || i.estado === 'parcial');
  const l = [];
  if (!abertas.length) l.push('Nenhuma nota emitida esperando pagamento.');
  else {
    l.push(`Notas a receber: ${s.em_aberto} (${brl(s.saldo_total)})${s.atrasadas ? `, ${plural(s.atrasadas, 'atrasada', 'atrasadas')} (${brl(s.saldo_atrasado)}) — mais de ${r.prazo_dias} dias` : ''}.`);
    for (const n of abertas.slice(0, limite)) {
      l.push(`- Nota ${n.numero || `#${n.id}`} — ${n.tomador_nome || '—'} — saldo ${brl(n.saldo)} — ${plural(n.dias, 'dia', 'dias')}${n.atrasada ? ' (atrasada)' : ''}${n.proposta_numero ? ` — proposta ${n.proposta_numero}` : ''}${n.sugestao?.confianca === 'alta' ? ' — há um Pix que parece ser o pagamento' : ''}`);
    }
    if (abertas.length > limite) l.push(`… mais ${abertas.length - limite}.`);
  }
  if (s.sem_historico) l.push(`${plural(s.sem_historico, 'nota antiga', 'notas antigas')} (${brl(s.valor_sem_historico)}) de antes do primeiro Pix lido: confira na tela.`);
  return { texto: l.join('\n'), dados: { resumo: s, itens: abertas.slice(0, limite) } };
}

// ── Vencimentos (laudos; documentos da empresa só para quem vê o financeiro) ──
const ORDEM_NIVEL = { vencido: 0, urgente: 1, atencao: 2, ok: 3 };
async function vencimentos({ incluirEmpresa = false, limite = 12, db = pool, hoje = hojeBrasilia() } = {}) {
  const V = require('../vencimentos');
  const r = await V.listar(db, hoje, { incluirEmpresa });
  const itens = r.itens.slice().sort((a, b) => (ORDEM_NIVEL[a.nivel] - ORDEM_NIVEL[b.nivel]) || (a.dias - b.dias));
  const proximos = itens.filter(i => i.nivel !== 'ok');
  const l = [];
  if (!r.itens.length) l.push('Nenhum vencimento cadastrado.');
  else if (!proximos.length) l.push(`Nada vencido nem vencendo nos próximos 60 dias (${plural(r.itens.length, 'item acompanhado', 'itens acompanhados')}).`);
  else {
    l.push(`Vencimentos: ${r.resumo.vencidos} vencido(s), ${r.resumo.urgentes} em até 30 dias, ${r.resumo.atencao} em até 60 dias.`);
    for (const i of proximos.slice(0, limite)) l.push(`- ${i.descricao}${i.cliente_nome ? ` (${i.cliente_nome})` : ''}: ${i.rotulo} — ${formatarData(i.vence_em)}${i.proposta_renovacao_numero ? ` — renovação na proposta ${i.proposta_renovacao_numero}` : ''}`);
    if (proximos.length > limite) l.push(`… mais ${proximos.length - limite}.`);
  }
  return { texto: l.join('\n'), dados: { resumo: r.resumo, itens: proximos.slice(0, limite) } };
}

// ── Novidades das pastas dos clientes (services/monitorPastas.js) ──────
const ROTULO_ARQUIVO = { novo: 'novo', alterado: 'alterado', removido: 'removido' };
async function novidadesPastas({ limite = 12, monitor = null } = {}) {
  const M = monitor || require('../monitorPastas');
  const [resumo, itens] = [await M.resumo(), await M.novidades({})];
  const l = [];
  if (!resumo.total) l.push('Nenhum arquivo novo nas pastas dos clientes.');
  else {
    l.push(`Novidades nas pastas: ${plural(resumo.total, 'arquivo', 'arquivos')} (${resumo.porCliente.slice(0, 5).map(c => `${c.cliente_nome || 'sem cliente'}: ${c.total}`).join(', ')}).`);
    for (const a of itens.slice(0, limite)) l.push(`- ${a.cliente_nome || '—'}: ${a.nome} (${ROTULO_ARQUIVO[a.situacao] || a.situacao}${a.detectado_em ? `, ${formatarData(a.detectado_em)}` : ''})`);
  }
  if (resumo.disponivel === false) l.push('Aviso: a pasta do servidor não está acessível agora.');
  return { texto: l.join('\n'), dados: { resumo, itens: itens.slice(0, limite) } };
}

// ── Cotações de fornecedores (services/cotacoesFornecedor.js) ─────────
async function cotacoes({ limite = 8, db = pool } = {}) {
  const CF = require('../cotacoesFornecedor');
  const r = await CF.oportunidades(db);
  const pct = (v) => (v == null ? '—' : `${String(Math.round(v * 10) / 10).replace('.', ',')} %`);
  const l = [`Cotações: ${r.resumo.materiais_cotados} materiais cotados nos últimos ${r.resumo.validade_dias} dias, ${r.resumo.fornecedores} fornecedores.`];
  if (!r.itens.length) l.push('Nenhuma oportunidade de preço (catálogo acima ou fornecedores muito diferentes).');
  else {
    l.push('Oportunidades:');
    for (const i of r.itens.slice(0, limite)) {
      l.push(`- ${i.descricao}: menor ${brl(i.menor?.preco)}${i.menor?.nome ? ` (${i.menor.nome})` : ''}${i.motivo === 'catalogo_acima' ? ` — catálogo ${pct(i.catalogo_acima_pct)} acima` : ` — fornecedores diferem ${pct(i.diferenca_entre_fornecedores_pct)}`}${i.suspeito ? ' (confira: diferença suspeita)' : ''}`);
    }
  }
  if (r.ranking.length) l.push(`Fornecedor que mais sai mais barato: ${r.ranking.slice(0, 3).map(f => `${f.nome || f.cnpj} (${f.pct_menor} % de ${f.itens_comparados})`).join('; ')}.`);
  return { texto: l.join('\n'), dados: { resumo: r.resumo, itens: r.itens.slice(0, limite), ranking: r.ranking.slice(0, 5) } };
}

// ── Proposta (resumo + a mesma conferência de envio da tela) ───────────
async function resumoProposta(id, { db = pool } = {}) {
  const { rows: [p] } = await db.query(
    `SELECT p.id, p.numero, p.cliente_nome, p.status, p.total, p.data, p.validade, p.local_obra, o.codigo AS obra_codigo, o.nome AS obra_nome,
            c.email AS cliente_email
       FROM propostas p LEFT JOIN obras o ON o.id = p.obra_id LEFT JOIN clientes c ON c.id = p.cliente_id WHERE p.id = $1`, [id]);
  if (!p) throw new ErroConsulta('Proposta não encontrada.', 404);
  const { revisarProposta } = require('../revisaoPreEnvio');
  const revisao = await revisarProposta(p.id, db).catch(() => null);
  const achados = (revisao?.achados || []).filter(a => a.nivel !== 'info');
  const l = [
    `Proposta ${p.numero} — ${p.cliente_nome || 'sem cliente'} — ${p.status}`,
    `Total ${brl(p.total)} — data ${formatarData(p.data)} — validade ${p.validade} dias`,
  ];
  if (p.obra_codigo) l.push(`Obra ${p.obra_codigo} — ${p.obra_nome}`);
  if (p.local_obra) l.push(`Local: ${p.local_obra}`);
  for (const a of achados) l.push(`${a.nivel === 'bloqueio' ? 'BLOQUEIO para envio' : 'Atenção'}: ${a.mensagem}`);
  return { texto: l.join('\n'), dados: { proposta: p, achados } };
}

module.exports = {
  ErroConsulta, PAPEIS_FINANCEIRO, papelDe, podeVerFinanceiro,
  custosDaObra, margemDaObra, pixSemObra, notasFiscais, notasAReceber, vencimentos, novidadesPastas, cotacoes, resumoProposta,
};
