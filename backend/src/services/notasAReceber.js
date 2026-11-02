// Notas a receber: as notas emitidas que ainda não foram pagas, há quantos dias esperam e qual Pix recebido
// provavelmente é o pagamento de cada uma. Não existe tabela de contas a receber: a nota emitida é o valor a
// receber, e o Pix ligado a ela (financeiro_movimentos.nota_id) é o que a quitou. Sem IA: a sugestão é por
// valor (líquido ou bruto) e por semelhança do nome do pagador com o tomador.
//
// As decisões (estado da nota, sugestão de ligação, resumo) são funções puras; o banco entra só em `listar`
// e nas ações, para o teste rodar sem ele.
const pool = require('../config/database');
const { registrarAuditoria } = require('./auditoria');
const { hojeBrasilia } = require('../utils/dataHoje');

// Sugestão da casa, não regra do cliente: cada contrato pode ter o seu prazo. Passou disso, a nota é "atrasada".
const PRAZO_DIAS = 30;
const CENTAVO = 0.01;
const LIMITE_OBS = 300;

const arred = (v) => Math.round(Number(v) * 100) / 100;
const diaIso = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  const d = new Date(v);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
};
const diasEntre = (deIso, ateIso) => {
  const t = (s) => { const [a, m, d] = s.split('-').map(Number); return Date.UTC(a, m - 1, d); };
  return Math.round((t(ateIso) - t(deIso)) / 86400000);
};

// ── Nome do pagador × tomador ───────────────────────────────────────────────
const PALAVRAS_FRACAS = new Set(['ltda', 'me', 'epp', 'eireli', 'sa', 'cia', 'de', 'da', 'do', 'dos', 'das', 'e', 'sociedade', 'comercio', 'servicos']);

function palavras(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
    .filter(p => p.length >= 3 && !PALAVRAS_FRACAS.has(p));
}

// Metade das palavras do nome mais curto aparece no outro, e ao menos uma: "Hospital Santa Lucia S A" casa com
// "HOSPITAL SANTA LUCIA S/A"; "Tourinho Leal Drummond de Andrade Sociedade de Advogados" casa com a versão abreviada.
function nomesParecidos(a, b) {
  const pa = palavras(a), pb = palavras(b);
  if (!pa.length || !pb.length) return false;
  const setB = new Set(pb);
  const em = pa.filter(p => setB.has(p)).length;
  return em >= 1 && em / Math.min(pa.length, pb.length) >= 0.5;
}

// ── Estado de uma nota ──────────────────────────────────────────────────────
// nota: { valor_liquido, data_emissao, baixa_manual_em }; recebido: soma dos Pix ligados; primeiroPix: dia (AAAA-MM-DD)
// do Pix recebido mais antigo que o sistema conhece (antes disso não há como conferir).
function estadoDaNota({ nota, recebido, hoje, primeiroPix = null, prazoDias = PRAZO_DIAS }) {
  const liquido = arred(nota.valor_liquido);
  const pago = arred(recebido || 0);
  const emissao = diaIso(nota.data_emissao);
  const dias = emissao ? Math.max(0, diasEntre(emissao, hoje)) : 0;
  const base = { liquido, recebido: pago, saldo: arred(Math.max(0, liquido - pago)), dias };
  if (nota.baixa_manual_em) return { ...base, estado: 'baixada', saldo: 0, atrasada: false };
  if (pago >= liquido - CENTAVO) return { ...base, estado: 'recebida', saldo: 0, atrasada: false };
  // Emitida muito antes do primeiro Pix que o sistema leu: o pagamento pode ter ocorrido antes do histórico,
  // então não dá para dizer que está em aberto. Fica separada, sem contar como atraso, até alguém dar baixa.
  if (pago === 0 && primeiroPix && emissao && diasEntre(emissao, primeiroPix) > prazoDias) return { ...base, estado: 'sem_historico', atrasada: false };
  return { ...base, estado: pago > 0 ? 'parcial' : 'aberta', atrasada: dias > prazoDias };
}

function faixaDe(dias) {
  if (dias <= PRAZO_DIAS) return 'no_prazo';
  if (dias <= 60) return 'ate60';
  if (dias <= 90) return 'ate90';
  return 'mais90';
}

// ── Sugestão de ligação nota × Pix ──────────────────────────────────────────
// notas: [{ id, valor_liquido, valor_servicos, data_emissao, tomador_nome, saldo }] (abertas e parciais)
// movimentos: [{ id, nome, valor, data_hora }] (Pix recebidos ainda sem nota)
// 'alta'  = só um Pix serve àquela nota, só aquela nota serve àquele Pix e o nome confere (pode ligar em lote);
// 'media' = idem, mas o nome não confere (o administrador olha e confirma);
// 'ambigua' = mais de uma combinação possível (o administrador escolhe na janela da nota).
function sugerirLigacoes(notas, movimentos) {
  const candidatos = new Map();   // nota.id -> [mov]
  const notasDoMov = new Map();   // mov.id -> [nota.id]
  for (const n of notas) {
    const emissao = diaIso(n.data_emissao);
    const valores = [arred(n.valor_liquido), arred(n.valor_servicos), arred(n.saldo)].filter(v => v > 0);
    const lista = movimentos.filter(m => {
      const v = arred(m.valor);
      if (!valores.some(x => Math.abs(x - v) < CENTAVO)) return false;
      // o Pix não pode ser de mais de um dia antes da emissão
      return !emissao || diaIso(m.data_hora) >= somarDias(emissao, -1);
    });
    candidatos.set(n.id, lista);
    for (const m of lista) notasDoMov.set(m.id, [...(notasDoMov.get(m.id) || []), n.id]);
  }
  const saida = new Map();
  for (const n of notas) {
    const lista = candidatos.get(n.id);
    if (!lista.length) continue;
    const comNome = lista.filter(m => nomesParecidos(m.nome, n.tomador_nome));
    const unico = lista.length === 1 && notasDoMov.get(lista[0].id).length === 1;
    const unicoComNome = comNome.length === 1 && notasDoMov.get(comNome[0].id).length === 1;
    if (unicoComNome) saida.set(n.id, { movimento: comNome[0], confianca: 'alta', alternativas: lista.length - 1 });
    else if (unico) saida.set(n.id, { movimento: lista[0], confianca: 'media', alternativas: 0 });
    else saida.set(n.id, { movimento: null, confianca: 'ambigua', alternativas: lista.length });
  }
  return saida;
}

function somarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + n));
  return x.toISOString().slice(0, 10);
}

// ── Resumo ──────────────────────────────────────────────────────────────────
function resumir(itens) {
  const r = { em_aberto: 0, saldo_total: 0, atrasadas: 0, saldo_atrasado: 0, sem_historico: 0, valor_sem_historico: 0, sugestoes_altas: 0,
    faixas: { no_prazo: { n: 0, saldo: 0 }, ate60: { n: 0, saldo: 0 }, ate90: { n: 0, saldo: 0 }, mais90: { n: 0, saldo: 0 } } };
  for (const i of itens) {
    if (i.estado === 'sem_historico') { r.sem_historico++; r.valor_sem_historico = arred(r.valor_sem_historico + i.saldo); continue; }
    if (i.estado !== 'aberta' && i.estado !== 'parcial') continue;
    r.em_aberto++;
    r.saldo_total = arred(r.saldo_total + i.saldo);
    if (i.atrasada) { r.atrasadas++; r.saldo_atrasado = arred(r.saldo_atrasado + i.saldo); }
    const f = r.faixas[faixaDe(i.dias)];
    f.n++; f.saldo = arred(f.saldo + i.saldo);
    if (i.sugestao?.confianca === 'alta') r.sugestoes_altas++;
  }
  return r;
}

// ── Banco ───────────────────────────────────────────────────────────────────
async function carregar(c = pool) {
  // em sequência: dentro da transação o cliente é um só e não aceita consultas em paralelo
  const { rows: notas } = await c.query(
      `SELECT n.id, n.numero, n.data_emissao, n.valor_servicos, n.valor_liquido, n.iss_retido, n.baixa_manual_em, n.baixa_manual_obs,
              n.cliente_id, n.tomador->>'nome' AS tomador_nome, n.proposta_id,
              (SELECT pr.numero FROM propostas pr WHERE pr.id = n.proposta_id) AS proposta_numero,
              (SELECT COALESCE(sum(f.valor), 0) FROM financeiro_movimentos f WHERE f.nota_id = n.id) AS recebido
         FROM notas_fiscais n WHERE n.situacao = 'emitida' ORDER BY n.data_emissao`);
  const { rows: livres } = await c.query(`SELECT id, nome, valor, data_hora FROM financeiro_movimentos WHERE tipo = 'recebido' AND nota_id IS NULL ORDER BY data_hora`);
  const { rows: [pix] } = await c.query(`SELECT min(data_hora) AS primeiro FROM financeiro_movimentos WHERE tipo = 'recebido'`);
  return { notas, livres, primeiroPix: diaIso(pix.primeiro) };
}

function montar({ notas, livres, primeiroPix }, hoje) {
  const avaliadas = notas.map(n => ({ ...n, ...estadoDaNota({ nota: n, recebido: n.recebido, hoje, primeiroPix }) }));
  const abertas = avaliadas.filter(n => n.estado === 'aberta' || n.estado === 'parcial');
  const sugestoes = sugerirLigacoes(abertas.map(n => ({ id: n.id, valor_liquido: n.valor_liquido, valor_servicos: n.valor_servicos, data_emissao: n.data_emissao, tomador_nome: n.tomador_nome, saldo: n.saldo })), livres);
  return avaliadas
    .filter(n => n.estado !== 'recebida' && n.estado !== 'baixada')
    .map(n => {
      const s = sugestoes.get(n.id);
      return {
        id: n.id, numero: n.numero, data_emissao: diaIso(n.data_emissao), tomador_nome: n.tomador_nome, proposta_numero: n.proposta_numero,
        valor_liquido: n.liquido, recebido: n.recebido, saldo: n.saldo, dias: n.dias, atrasada: n.atrasada, estado: n.estado, faixa: faixaDe(n.dias),
        sugestao: s ? { confianca: s.confianca, alternativas: s.alternativas, movimento: s.movimento && { id: s.movimento.id, nome: s.movimento.nome, valor: Number(s.movimento.valor), data: diaIso(s.movimento.data_hora) } } : null,
      };
    })
    // mais antigas primeiro; as sem histórico por último
    .sort((a, b) => (a.estado === 'sem_historico') - (b.estado === 'sem_historico') || b.dias - a.dias);
}

async function listar(hoje = hojeBrasilia()) {
  const itens = montar(await carregar(), hoje);
  return { prazo_dias: PRAZO_DIAS, resumo: resumir(itens), itens };
}

function erro(status, mensagem) { const e = new Error(mensagem); e.status = status; return e; }

async function ligarNoBanco(c, notaId, movimentoId, usuarioId) {
  const { rows: [n] } = await c.query('SELECT id, situacao FROM notas_fiscais WHERE id = $1', [notaId]);
  if (!n) throw erro(404, 'Nota não encontrada.');
  if (n.situacao !== 'emitida') throw erro(409, 'Só nota emitida recebe pagamento.');
  const { rows } = await c.query("UPDATE financeiro_movimentos SET nota_id = $1 WHERE id = $2 AND tipo = 'recebido' AND nota_id IS NULL RETURNING id", [notaId, movimentoId]);
  if (!rows.length) throw erro(409, 'Esse movimento não é um recebimento livre (já está ligado a outra nota?).');
  await registrarAuditoria(c, { entidade: 'notas_fiscais', entidadeId: notaId, acao: 'ligar_recebimento', usuarioId, detalhes: { movimento_id: movimentoId, origem: 'notas_a_receber' } });
}

async function ligar(notaId, movimentoId, usuarioId) {
  if (!Number.isInteger(movimentoId) || movimentoId <= 0) throw erro(400, 'Movimento inválido.');
  await ligarNoBanco(pool, notaId, movimentoId, usuarioId);
}

// Liga de uma vez só as sugestões de confiança alta. Tudo ou nada: se uma falhar (alguém ligou o Pix em outra tela
// no meio do caminho), nenhuma fica pela metade.
// `somenteNotas` (lista de ids) restringe a ligação a essas notas; sem ele vale para todas.
async function ligarSugeridas(usuarioId, hoje = hojeBrasilia(), somenteNotas = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const itens = montar(await carregar(client), hoje).filter(i => i.sugestao?.confianca === 'alta' && (!somenteNotas || somenteNotas.includes(i.id)));
    for (const i of itens) await ligarNoBanco(client, i.id, i.sugestao.movimento.id, usuarioId);
    await client.query('COMMIT');
    return itens.length;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

async function darBaixa(notaId, usuarioId, obs) {
  const texto = String(obs || '').trim();
  if (texto.length < 3) throw erro(400, 'Diga como a nota foi paga (ex.: "TED em 10/2025") para a baixa ficar registrada.');
  if (texto.length > LIMITE_OBS) throw erro(400, `A observação passou de ${LIMITE_OBS} caracteres.`);
  const { rows } = await pool.query(
    "UPDATE notas_fiscais SET baixa_manual_em = NOW(), baixa_manual_obs = $2, baixa_manual_por = $3 WHERE id = $1 AND situacao = 'emitida' RETURNING id", [notaId, texto, usuarioId]);
  if (!rows.length) throw erro(404, 'Nota emitida não encontrada.');
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: notaId, acao: 'baixa_manual', usuarioId, detalhes: { obs: texto } });
}

async function desfazerBaixa(notaId, usuarioId) {
  const { rows } = await pool.query('UPDATE notas_fiscais SET baixa_manual_em = NULL, baixa_manual_obs = NULL, baixa_manual_por = NULL WHERE id = $1 AND baixa_manual_em IS NOT NULL RETURNING id', [notaId]);
  if (!rows.length) throw erro(404, 'Essa nota não tem baixa para desfazer.');
  await registrarAuditoria(pool, { entidade: 'notas_fiscais', entidadeId: notaId, acao: 'desfazer_baixa', usuarioId, detalhes: {} });
}

module.exports = { PRAZO_DIAS, nomesParecidos, estadoDaNota, faixaDe, sugerirLigacoes, resumir, montar, listar, ligar, ligarSugeridas, darBaixa, desfazerBaixa };
