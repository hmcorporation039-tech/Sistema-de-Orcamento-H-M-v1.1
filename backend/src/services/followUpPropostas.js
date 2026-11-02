// Propostas enviadas por e-mail e ainda sem resposta (status Ativa): quem precisa de um contato hoje.
// "Enviada" vem do histórico (proposta_eventos: acao 'email' = enviada pelo sistema, 'envio_manual' = a pessoa registrou
// que mandou por fora, WhatsApp ou e-mail comum); o que a pessoa fez depois fica em
// proposta_followups (migração 2.0-34). A decisão (quando é a hora do próximo contato, em que situação a
// proposta está) é função pura em `avaliar`; o banco entra por parâmetro, para o teste rodar sem ele.
//
// Os prazos são sugestão da casa, não regra do cliente: 5 dias depois do envio para o primeiro contato,
// 10 dias entre os seguintes, e depois de 3 contatos sem resposta o sistema sugere encerrar a proposta.
const pool = require('../config/database');
const { hojeBrasilia } = require('../utils/dataHoje');

const PRIMEIRO_CONTATO_DIAS = 5;
const ENTRE_CONTATOS_DIAS = 10;
const CONTATOS_ANTES_DE_ENCERRAR = 3;
const MAX_NOTA = 500;
const MIN_AMOSTRA_RESPOSTA = 3;
const LIMITE_SEM_ENVIO = 50;
const SQL_ENVIO = "e.acao IN ('email', 'envio_manual')";

const ehDataIso = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`))
  && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;
const utc = (iso) => Date.UTC(...iso.split('-').map((n, i) => (i === 1 ? Number(n) - 1 : Number(n))));
const diasEntre = (de, ate) => Math.round((utc(ate) - utc(de)) / 86400000);
const somarDias = (iso, n) => new Date(utc(iso) + n * 86400000).toISOString().slice(0, 10);
const maior = (lista) => lista.reduce((a, b) => (a && a > b ? a : b), null);

// envios: datas (AAAA-MM-DD) dos e-mails; registros: [{ tipo, criado_em: 'AAAA-MM-DD', proximo_em }] em qualquer ordem.
// Um "adiado" só vale se foi feito DEPOIS do último envio/contato (um contato novo recomeça a contagem).
function avaliar({ envios = [], registros = [], data, validade, hoje = hojeBrasilia() }) {
  const ultimoEnvio = maior(envios);
  const contatos = registros.filter(r => r.tipo === 'contato');
  const ultimoContato = maior(contatos.map(r => r.criado_em));
  const base = maior([ultimoEnvio, ultimoContato].filter(Boolean));
  if (!base) return null;
  const intervalo = contatos.length ? ENTRE_CONTATOS_DIAS : PRIMEIRO_CONTATO_DIAS;
  let proximo = somarDias(base, intervalo);
  const adiado = registros.filter(r => r.tipo === 'adiado' && r.proximo_em && r.criado_em >= base)
    .sort((a, b) => (a.criado_em < b.criado_em ? 1 : a.criado_em > b.criado_em ? -1 : 0))[0];
  if (adiado) proximo = adiado.proximo_em;

  const atraso = diasEntre(proximo, hoje);   // > 0: já passou da hora
  let nivel = atraso > 0 ? 'atrasado' : atraso === 0 ? 'hoje' : 'aguardando';
  if (contatos.length >= CONTATOS_ANTES_DE_ENCERRAR && atraso >= 0) nivel = 'encerrar';

  let validadeVencida = false;
  if (ehDataIso(data) && Number(validade) > 0) validadeVencida = somarDias(data, Number(validade)) < hoje;

  return {
    nivel, proximo_contato: proximo, dias_de_atraso: Math.max(0, atraso), dias_para_contato: Math.max(0, -atraso),
    dias_desde_envio: diasEntre(ultimoEnvio || base, hoje), contatos: contatos.length,
    ultimo_envio: ultimoEnvio, ultimo_contato: ultimoContato, adiado_ate: adiado ? adiado.proximo_em : null,
    validade_vencida: validadeVencida,
  };
}

const PESO = { encerrar: 0, atrasado: 1, hoje: 2, aguardando: 3 };

// Mediana de dias entre o primeiro e-mail e a aprovação, das propostas já aprovadas: só vira dica com amostra mínima.
function medianaDias(dias) {
  const v = dias.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length < MIN_AMOSTRA_RESPOSTA) return { n: v.length, mediana: null };
  const m = Math.floor(v.length / 2);
  return { n: v.length, mediana: v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2) };
}

async function listar(db = pool, hoje = hojeBrasilia()) {
  const { rows: propostas } = await db.query(
    `SELECT p.id, p.numero, p.cliente_nome, p.total::float8 AS total, to_char(p.data, 'YYYY-MM-DD') AS data, p.validade,
            p.usuario_id, u.nome AS responsavel, c.email AS cliente_email
       FROM propostas p
       LEFT JOIN usuarios u ON u.id = p.usuario_id
       LEFT JOIN clientes c ON c.id = p.cliente_id
      WHERE p.status = 'Ativa'`);
  const ids = propostas.map(p => p.id);
  const envios = {};
  const registros = {};
  if (ids.length) {
    const ev = await db.query(
      `SELECT e.proposta_id, to_char(e.criado_em, 'YYYY-MM-DD') AS dia FROM proposta_eventos e WHERE ${SQL_ENVIO} AND e.proposta_id = ANY($1::int[])`, [ids]);
    for (const r of ev.rows) (envios[r.proposta_id] ||= []).push(r.dia);
    const fu = await db.query(
      `SELECT proposta_id, tipo, nota, to_char(criado_em, 'YYYY-MM-DD') AS criado_em, to_char(proximo_em, 'YYYY-MM-DD') AS proximo_em
         FROM proposta_followups WHERE proposta_id = ANY($1::int[]) ORDER BY criado_em, id`, [ids]);
    for (const r of fu.rows) (registros[r.proposta_id] ||= []).push(r);
  }

  const itens = [];
  const semEnvio = [];
  for (const p of propostas) {
    const a = avaliar({ envios: envios[p.id] || [], registros: registros[p.id] || [], data: p.data, validade: p.validade, hoje });
    if (!a) { semEnvio.push({ id: p.id, numero: p.numero, cliente_nome: p.cliente_nome, total: p.total, data: p.data, responsavel: p.responsavel }); continue; }
    const feitos = registros[p.id] || [];
    itens.push({ ...p, ...a, ultima_nota: [...feitos].reverse().find(r => r.tipo === 'contato' && r.nota)?.nota || null });
  }
  itens.sort((x, y) => PESO[x.nivel] - PESO[y.nivel] || y.dias_de_atraso - x.dias_de_atraso || y.total - x.total);

  const soma = (lista) => Math.round(lista.reduce((s, i) => s + i.total, 0) * 100) / 100;
  const atrasados = itens.filter(i => i.nivel === 'atrasado' || i.nivel === 'encerrar');
  const { rows: resp } = await db.query(
    `SELECT (to_char(a.dia, 'J')::int - to_char(e.dia, 'J')::int) AS dias
       FROM propostas p
       JOIN LATERAL (SELECT MIN(criado_em)::date AS dia FROM proposta_eventos e WHERE e.proposta_id = p.id AND ${SQL_ENVIO}) e ON e.dia IS NOT NULL
       JOIN LATERAL (SELECT MIN(criado_em)::date AS dia FROM proposta_eventos WHERE proposta_id = p.id AND acao = 'status' AND detalhes ILIKE '%Aprovada%') a ON a.dia IS NOT NULL
      WHERE p.status = 'Aprovada'`);
  semEnvio.sort((x, y) => y.total - x.total);
  return {
    itens,
    sem_envio: semEnvio.slice(0, LIMITE_SEM_ENVIO),
    resumo: {
      sem_envio: semEnvio.length,
      aguardando: itens.length, valor_aguardando: soma(itens),
      para_hoje: itens.filter(i => i.nivel === 'hoje').length,
      atrasados: atrasados.length, valor_atrasado: soma(atrasados),
      resposta_aprovada: medianaDias(resp.map(r => Number(r.dias)).filter(n => n >= 0)),
    },
  };
}

function validarRegistro({ tipo, nota, proximo_em }, hoje = hojeBrasilia()) {
  if (tipo !== 'contato' && tipo !== 'adiado') return 'Informe se foi um contato ou se quer adiar.';
  if (nota != null && (typeof nota !== 'string' || nota.length > MAX_NOTA)) return `A anotação deve ter até ${MAX_NOTA} caracteres.`;
  if (tipo === 'adiado') {
    if (!ehDataIso(proximo_em)) return 'Informe até quando adiar (AAAA-MM-DD).';
    if (proximo_em <= hoje) return 'A nova data precisa ser depois de hoje.';
    if (diasEntre(hoje, proximo_em) > 180) return 'Adiar por mais de 180 dias: melhor encerrar a proposta.';
  }
  return null;
}

// Só proposta Ativa e já enviada por e-mail entra; devolve o registro criado.
async function registrar(db, propostaId, usuarioId, corpo, hoje = hojeBrasilia()) {
  const erro = validarRegistro(corpo, hoje);
  if (erro) { const e = new Error(erro); e.status = 400; throw e; }
  const { rows: [p] } = await db.query(
    `SELECT p.id, p.status, EXISTS (SELECT 1 FROM proposta_eventos e WHERE e.proposta_id = p.id AND ${SQL_ENVIO}) AS enviada
       FROM propostas p WHERE p.id = $1`, [propostaId]);
  if (!p) { const e = new Error('Proposta não encontrada'); e.status = 404; throw e; }
  if (p.status !== 'Ativa') { const e = new Error(`A proposta está como "${p.status}": só proposta Ativa tem acompanhamento.`); e.status = 409; throw e; }
  if (!p.enviada) { const e = new Error('Esta proposta ainda não tem envio registrado: registre quando foi enviada.'); e.status = 409; throw e; }
  const nota = corpo.nota && corpo.nota.trim() ? corpo.nota.trim() : null;
  const { rows: [novo] } = await db.query(
    'INSERT INTO proposta_followups (proposta_id, usuario_id, tipo, nota, proximo_em) VALUES ($1, $2, $3, $4, $5) RETURNING id, tipo, nota',
    [propostaId, usuarioId || null, corpo.tipo, nota, corpo.tipo === 'adiado' ? corpo.proximo_em : null]);
  // fica também no histórico da proposta (mesma trilha do envio por e-mail)
  await db.query('INSERT INTO proposta_eventos (proposta_id, usuario_id, acao, detalhes) VALUES ($1, $2, $3, $4)',
    [propostaId, usuarioId || null, corpo.tipo === 'contato' ? 'followup' : 'followup_adiado',
      corpo.tipo === 'contato' ? `Contato com o cliente${nota ? `: ${nota}` : ''}` : `Acompanhamento adiado até ${corpo.proximo_em.split('-').reverse().join('/')}${nota ? `: ${nota}` : ''}`]);
  return novo;
}

// Registra que a proposta foi enviada fora do sistema (WhatsApp, e-mail comum, entrega em mãos): daí em diante ela
// entra no acompanhamento. A data é a do envio de verdade (não depois de hoje, nem antes da proposta existir).
async function registrarEnvio(db, propostaId, usuarioId, { data, nota } = {}, hoje = hojeBrasilia()) {
  if (!ehDataIso(data)) { const e = new Error('Informe quando a proposta foi enviada.'); e.status = 400; throw e; }
  if (data > hoje) { const e = new Error('A data do envio não pode ser no futuro.'); e.status = 400; throw e; }
  if (nota != null && (typeof nota !== 'string' || nota.length > MAX_NOTA)) { const e = new Error(`A anotação deve ter até ${MAX_NOTA} caracteres.`); e.status = 400; throw e; }
  const { rows: [p] } = await db.query("SELECT id, status, to_char(data, 'YYYY-MM-DD') AS data FROM propostas WHERE id = $1", [propostaId]);
  if (!p) { const e = new Error('Proposta não encontrada'); e.status = 404; throw e; }
  if (p.status !== 'Ativa') { const e = new Error(`A proposta está como "${p.status}": só proposta Ativa tem acompanhamento.`); e.status = 409; throw e; }
  if (data < p.data) { const e = new Error('O envio não pode ser antes da data da proposta.'); e.status = 400; throw e; }
  const texto = nota && nota.trim() ? `: ${nota.trim()}` : '';
  await db.query('INSERT INTO proposta_eventos (proposta_id, usuario_id, acao, detalhes, criado_em) VALUES ($1, $2, $3, $4, $5)',
    [propostaId, usuarioId || null, 'envio_manual', `Envio registrado à mão (fora do sistema) em ${data.split('-').reverse().join('/')}${texto}`, `${data} 12:00`]);
}

module.exports = {
  registrarEnvio,
  PRIMEIRO_CONTATO_DIAS, ENTRE_CONTATOS_DIAS, CONTATOS_ANTES_DE_ENCERRAR,
  avaliar, medianaDias, listar, validarRegistro, registrar,
};
