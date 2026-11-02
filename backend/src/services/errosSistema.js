// Resumo diário de erros do sistema (tabela erros_sistema, migração 2.0-33). O middleware de erros
// (middleware/erros.js) chama registrar() a cada erro 500 inesperado; a rotina `erros-sistema`
// (rotinas.js, 06:00 e 18:00) manda UM e-mail com o que aconteceu desde o último aviso e não manda nada
// quando não houve erro. Registrar nunca derruba a requisição: falha ao gravar só vai para o log.
const crypto = require('crypto');
const pool = require('../config/database');

const DIAS_GUARDADOS = 90;
const MAX_NO_EMAIL = 15;

// "/api/obras/123/itens/45" e "/api/obras/9/itens/2" são o mesmo erro: números e UUIDs viram ":id"
// e a query string sai.
function normalizarRota(url) {
  return String(url || '').split('?')[0]
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:id')
    .replace(/\/\d+(?=\/|$)/g, '/:id')
    .slice(0, 300);
}

// Mensagem sem o que muda a cada vez (números, caminhos de arquivo) para agrupar de verdade.
function mensagemDoErro(err) {
  const m = String((err && err.message) || err || 'erro sem mensagem').split('\n')[0];
  return m.slice(0, 500);
}

function assinar(metodo, rota, mensagem) {
  const base = `${String(metodo || '').toUpperCase()} ${rota} ${mensagem.replace(/\d+/g, '#').slice(0, 120)}`;
  return crypto.createHash('sha1').update(base).digest('hex');
}

async function registrar(req, err, db = pool) {
  try {
    const metodo = String(req?.method || '').slice(0, 10);
    const rota = normalizarRota(req?.originalUrl || req?.url);
    const mensagem = mensagemDoErro(err);
    const pilha = err && err.stack ? String(err.stack).split('\n').slice(0, 8).join('\n') : null;
    await db.query(
      `INSERT INTO erros_sistema (assinatura, metodo, rota, mensagem, pilha) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (assinatura) DO UPDATE SET ocorrencias = erros_sistema.ocorrencias + 1, ultimo_em = NOW(), pilha = EXCLUDED.pilha`,
      [assinar(metodo, rota, mensagem), metodo, rota, mensagem, pilha]
    );
  } catch (e) {
    console.warn(`Registro de erros: não gravou — ${e.message}`);
  }
}

// Erros com ocorrências ainda não avisadas, os mais frequentes primeiro.
async function pendentes(db = pool) {
  const { rows } = await db.query(
    `SELECT id, metodo, rota, mensagem, ocorrencias, ocorrencias_avisadas, primeiro_em, ultimo_em
       FROM erros_sistema WHERE ocorrencias > ocorrencias_avisadas
      ORDER BY (ocorrencias - ocorrencias_avisadas) DESC, ultimo_em DESC`
  );
  return rows;
}

function mensagemEmail(itens) {
  const novas = itens.reduce((s, i) => s + (i.ocorrencias - i.ocorrencias_avisadas), 0);
  const hora = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const linhas = itens.slice(0, MAX_NO_EMAIL).map(i => {
    const n = i.ocorrencias - i.ocorrencias_avisadas;
    const recorrente = i.ocorrencias_avisadas > 0 ? ' (já tinha avisado antes)' : '';
    return `- ${i.metodo} ${i.rota}: ${i.mensagem}\n  ${n} vez${n > 1 ? 'es' : ''}, última às ${hora(i.ultimo_em)}${recorrente}`;
  });
  const resto = itens.length > MAX_NO_EMAIL ? `\n... e mais ${itens.length - MAX_NO_EMAIL} tipo(s) de erro.` : '';
  return {
    assunto: `Sistema H&M: ${novas} erro${novas > 1 ? 's' : ''} desde o último aviso (${itens.length} tipo${itens.length > 1 ? 's' : ''})`,
    texto: `Erros inesperados (500) registrados pelo sistema desde o último resumo:\n\n${linhas.join('\n')}${resto}\n\nO mesmo erro repetido aparece uma vez só, com a contagem. A pilha completa fica na tabela erros_sistema e no log do servidor; se algum se repetir todo dia, vale mandar para correção.`,
  };
}

// Rotina agendada. Só marca como avisado se o e-mail saiu; apaga o que é velho e já foi avisado.
async function executarRotina({ db = pool, enviar, destino = process.env.ALERTA_EMAIL || process.env.EMAIL_IMAP_USER } = {}) {
  await db.query(`DELETE FROM erros_sistema WHERE ultimo_em < NOW() - INTERVAL '${DIAS_GUARDADOS} days' AND ocorrencias <= ocorrencias_avisadas`);
  const itens = await pendentes(db);
  if (!itens.length) return { tipos: 0, ocorrencias: 0, avisos: [] };
  const ocorrencias = itens.reduce((s, i) => s + (i.ocorrencias - i.ocorrencias_avisadas), 0);
  if (!destino) return { tipos: itens.length, ocorrencias, avisos: ['Há erros registrados, mas não há e-mail para avisar (defina ALERTA_EMAIL ou EMAIL_IMAP_USER no .env).'] };
  const envio = enviar || ((m) => require('./email/smtp').criarTransportador().sendMail({ from: process.env.EMAIL_IMAP_USER, ...m }));
  try {
    const m = mensagemEmail(itens);
    await envio({ to: destino, subject: m.assunto, text: m.texto });
  } catch (e) {
    return { tipos: itens.length, ocorrencias, avisos: [`Não consegui enviar o resumo de erros: ${e.message}`] };
  }
  await db.query('UPDATE erros_sistema SET ocorrencias_avisadas = ocorrencias, avisado_em = NOW() WHERE ocorrencias > ocorrencias_avisadas AND id = ANY($1::int[])', [itens.map(i => i.id)]);
  return { tipos: itens.length, ocorrencias, avisados: ocorrencias, avisos: [] };
}

module.exports = { normalizarRota, mensagemDoErro, assinar, registrar, pendentes, mensagemEmail, executarRotina };
