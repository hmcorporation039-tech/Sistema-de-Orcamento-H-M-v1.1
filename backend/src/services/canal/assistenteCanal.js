// Pedido livre do canal → o assistente do sistema (o mesmo da tela: Claude Max primeiro pelo
// `claude -p`, ou a API se ASSISTENTE_PROVEDOR=api), com as MESMAS ferramentas (MCP do assistente,
// filtradas pelo papel do usuário) e as mesmas regras: o que é irreversível vira ação pendente, e o
// canal acrescenta o código "SIM 4821" com prazo curto (acoesPendentes.prepararAcoesDoAssistente).
//
// Cada contato tem uma conversa própria do assistente (canal_contatos.conversa_id), que aparece na
// tela do assistente do usuário com o título do canal.
const pool = require('../../config/database');
const { config: configAssistente } = require('../assistente/config');
const { gerenciador } = require('../assistente/execucao');
const { prepararAcoesDoAssistente } = require('./acoesPendentes');

const NOME_CANAL = { telegram: 'Telegram', whatsapp: 'WhatsApp', simulador: 'Simulador do canal' };
const LIMITE_RESPOSTA = 3500;

async function usadasHoje(usuarioId, db = pool) {
  const { rows: [r] } = await db.query(
    `SELECT count(*)::int AS n FROM assistente_mensagens m JOIN assistente_conversas c ON c.id = m.conversa_id
      WHERE c.usuario_id = $1 AND m.papel = 'usuario'
        AND m.criado_em >= (date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo')`, [usuarioId]);
  return r.n;
}

// conversa do assistente deste contato (cria se não houver, se foi arquivada ou se mudou o dono)
async function conversaDoContato(contato, usuario, db = pool) {
  if (contato.conversa_id) {
    const { rows: [c] } = await db.query('SELECT * FROM assistente_conversas WHERE id = $1 AND usuario_id = $2 AND NOT arquivada', [contato.conversa_id, usuario.id]);
    if (c) return c;
  }
  const { rows: [c] } = await db.query(
    `INSERT INTO assistente_conversas (usuario_id, titulo, contexto) VALUES ($1, $2, '{}'::jsonb) RETURNING *`,
    [usuario.id, `${NOME_CANAL[contato.canal] || 'Canal'} — conversa pelo celular`]);
  await db.query('UPDATE canal_contatos SET conversa_id = $3, atualizado_em = NOW() WHERE canal = $1 AND id_externo = $2', [contato.canal, contato.id_externo, c.id]);
  return c;
}

const PREFIXO = (canal) => `[Mensagem recebida pelo ${NOME_CANAL[canal] || 'canal'} no celular: responda curto, em texto simples, sem tabelas nem markdown. `
  + 'O que for irreversível (enviar, mudar status, excluir) só por propor_acao: o usuário confirma pelo próprio celular com um código.]\n';

function esperarFim(g, conversaId, mensagemId, tempoMs) {
  return new Promise((resolve) => {
    let feito = false;
    let sair = null;
    const terminar = async (msg) => {
      if (feito) return;
      feito = true;
      clearTimeout(relogio);
      if (sair) sair();
      if (msg) return resolve(msg);
      const { rows: [m] } = await pool.query('SELECT * FROM assistente_mensagens WHERE id = $1', [mensagemId]);
      resolve(m || null);
    };
    const relogio = setTimeout(() => terminar(null), tempoMs);
    sair = g.acompanhar(conversaId, (ev) => {
      if (ev.tipo === 'fim') terminar(ev.mensagem);
      else if (ev.tipo === 'encerrado') terminar(null);
    });
    if (!sair) terminar(null);
  });
}

// → { texto }
async function perguntarAoAssistente({ contato, usuario, texto, g = gerenciador(), db = pool }) {
  const cfg = configAssistente();
  if (!cfg.ligado) return { texto: 'O assistente está desligado neste sistema. Mande "ajuda" para ver os comandos que funcionam sem ele.' };
  if (cfg.limiteDiario > 0 && await usadasHoje(usuario.id, db) >= cfg.limiteDiario) {
    return { texto: `Limite diário do assistente atingido (${cfg.limiteDiario} mensagens). Os comandos ("ajuda") continuam funcionando.` };
  }
  const conversa = await conversaDoContato(contato, usuario, db);
  let inicio;
  try {
    inicio = await g.iniciar({
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.papel || usuario.role, papel: usuario.papel || usuario.role },
      conversa, texto: `${PREFIXO(contato.canal)}${texto}`, contexto: {},
    });
  } catch (e) {
    if (e.status === 409) return { texto: 'Ainda estou respondendo a mensagem anterior. Aguarde um pouco.' };
    throw e;
  }
  const final = await esperarFim(g, conversa.id, inicio.mensagemAssistente.id, cfg.tempoLimiteMs + 30000);
  const partes = [];
  if (final?.status === 'concluida' && final.texto) partes.push(String(final.texto).slice(0, LIMITE_RESPOSTA));
  else if (final?.status === 'cancelada') partes.push('A resposta foi cancelada.');
  else partes.push('O assistente não conseguiu responder agora. Tente de novo mais tarde ou use os comandos ("ajuda").');
  partes.push(...await prepararAcoesDoAssistente({ contato, mensagemId: inicio.mensagemAssistente.id, db }));
  return { texto: partes.join('\n\n') };
}

module.exports = { perguntarAoAssistente, conversaDoContato, usadasHoje };
