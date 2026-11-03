// Ação pendente pelo canal (Fase 6, INT-08). Reaproveita a ação pendente do assistente
// (assistente_acoes + services/assistente/acoes.js: os mesmos tipos, o mesmo preparo com a conferência
// de envio da tela, INT-03, e a mesma execução pela rota HTTP de sempre). O canal acrescenta:
//   - código de confirmação ("SIM 4821"), único entre as pendentes do contato;
//   - prazo curto (CANAL_ACAO_PRAZO_MIN, padrão 10 min);
//   - só o contato que pediu pode confirmar (canal + id externo);
//   - ao confirmar: confere de novo o vínculo e o papel do usuário, a POSSE do registro e a impressão
//     do alvo (reconferirAcao: se o total, o status ou o conteúdo mudou, nada é executado);
//   - "NÃO" cancela; 5 códigos errados seguidos cancelam as pendentes do contato.
const crypto = require('crypto');
const pool = require('../../config/database');
const { prepararAcao, executarAcao, reconferirAcao, criarChamadaApi, ErroAcao, TIPOS } = require('../assistente/acoes');
const { config: configAssistente } = require('../assistente/config');
const { config } = require('./config');

const MAX_CODIGOS_ERRADOS = 5;
const papelDe = (u) => (u ? (u.papel || u.role || null) : null);
// técnico de campo consulta, mas não envia nem altera nada pelo canal
const PAPEIS_SEM_ACAO = new Set(['tecnico']);
const TABELA_DO_ALVO = { proposta: 'propostas', analise: 'analises_projeto', projeto: 'laudos_projetos' };

// O usuário pode fazer esta ação AGORA? (papel + posse: o dono, o administrador ou registro sem dono —
// a mesma regra de middleware/posse.js; catálogo e base de serviços só o administrador)
async function podeAgir(usuario, acao, db = pool) {
  const papel = papelDe(usuario);
  if (!usuario || !papel) return { ok: false, motivo: 'Usuário sem acesso.' };
  if (PAPEIS_SEM_ACAO.has(papel)) return { ok: false, motivo: 'Seu perfil (técnico de campo) só consulta pelo canal.' };
  if (papel === 'admin') return { ok: true };
  const def = TIPOS[acao.tipo];
  if (!def) return { ok: false, motivo: 'Tipo de ação desconhecido.' };
  const tabela = TABELA_DO_ALVO[def.alvo];
  if (!tabela) return { ok: false, motivo: 'Só o administrador muda preço do catálogo ou da base de serviços.' };
  const { rows: [r] } = await db.query(`SELECT usuario_id FROM ${tabela} WHERE id = $1`, [acao.alvo_id]);
  if (!r) return { ok: false, motivo: 'O registro não existe mais.' };
  if (r.usuario_id == null || r.usuario_id === usuario.id) return { ok: true };
  return { ok: false, motivo: 'Este registro foi criado por outro usuário. Peça a ele ou a um administrador.' };
}

async function pendentesDoContato(contato, db = pool) {
  const { rows } = await db.query(
    `SELECT * FROM assistente_acoes WHERE canal = $1 AND canal_id_externo = $2 AND status = 'pendente' ORDER BY id`,
    [contato.canal, contato.id_externo]);
  return rows;
}

function novoCodigo(usados) {
  for (let i = 0; i < 50; i++) {
    const c = String(crypto.randomInt(1000, 10000));
    if (!usados.has(c)) return c;
  }
  throw new Error('Não foi possível gerar um código livre.');
}

const textoConfirmacao = (acao, prazoMin) => `Para confirmar, responda: SIM ${acao.codigo} (vale ${prazoMin} min). Para cancelar: NÃO.`;

// Grava uma ação pedida por comando local ("enviar P254 para ...") na conversa do contato.
async function criarAcaoDoCanal({ contato, usuario, conversaId, tipo, alvo_id, payload, descricao, db = pool, prazoMin = config().acaoPrazoMin }) {
  const preparada = await prepararAcao({ tipo, alvo_id, payload, descricao });
  const permissao = await podeAgir(usuario, preparada, db);
  if (!permissao.ok) throw new ErroAcao(permissao.motivo, 403);
  const usados = new Set((await pendentesDoContato(contato, db)).map(a => a.codigo));
  const codigo = novoCodigo(usados);
  const { rows: [acao] } = await db.query(
    `INSERT INTO assistente_acoes (conversa_id, usuario_id, tipo, alvo_tipo, alvo_id, descricao, payload, impressao,
                                   origem, canal, canal_id_externo, codigo, expira_em)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'canal',$9,$10,$11, NOW() + make_interval(mins => $12::int)) RETURNING *`,
    [conversaId, usuario.id, preparada.tipo, preparada.alvo_tipo, preparada.alvo_id, preparada.descricao, preparada.payload, preparada.impressao,
      contato.canal, contato.id_externo, codigo, prazoMin]);
  return { acao, resumo: preparada.resumo, texto: `${preparada.resumo}\n\n${textoConfirmacao(acao, prazoMin)}` };
}

// Ações que o ASSISTENTE propôs (propor_acao) durante a resposta a uma mensagem do canal: ganham
// código, prazo curto e o contato que pode confirmar.
async function prepararAcoesDoAssistente({ contato, mensagemId, db = pool, prazoMin = config().acaoPrazoMin }) {
  const { rows } = await db.query(`SELECT * FROM assistente_acoes WHERE mensagem_id = $1 AND status = 'pendente' AND codigo IS NULL ORDER BY id`, [mensagemId]);
  const usados = new Set((await pendentesDoContato(contato, db)).map(a => a.codigo));
  const textos = [];
  for (const a of rows) {
    const codigo = novoCodigo(usados);
    usados.add(codigo);
    const { rows: [nova] } = await db.query(
      `UPDATE assistente_acoes SET origem = 'canal', canal = $2, canal_id_externo = $3, codigo = $4, expira_em = NOW() + make_interval(mins => $5::int)
        WHERE id = $1 RETURNING *`, [a.id, contato.canal, contato.id_externo, codigo, prazoMin]);
    textos.push(`Ação pendente: ${String(nova.descricao).split('\n\nMotivo informado')[0]}\n${textoConfirmacao(nova, prazoMin)}`);
  }
  return textos;
}

async function encerrar(acao, status, resultado, usuarioId, db = pool) {
  const { rows: [r] } = await db.query(
    `UPDATE assistente_acoes SET status = $2, resultado = $3, decidido_por = $4, decidido_em = NOW()
      WHERE id = $1 AND status = 'pendente' RETURNING *`, [acao.id, status, resultado, usuarioId]);
  return r || null;
}

// Executor padrão: a MESMA rota HTTP da tela, com um token curto (2 min) do próprio usuário. Posse,
// admin, validação, limite de envio e auditoria são os da rota.
function executorPadrao() {
  return async (acao, usuario) => {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../../config/segredos');
    const token = jwt.sign({ id: usuario.id, nome: usuario.nome, email: usuario.email, role: papelDe(usuario), origem: 'canal' }, JWT_SECRET, { expiresIn: '2m', algorithm: 'HS256' });
    return executarAcao(acao, criarChamadaApi(configAssistente().apiUrl, `Bearer ${token}`));
  };
}

const aplicando = new Set();

// "SIM 4821". deps: { usuarioAtual() → usuário de agora (vínculo conferido de novo) | null,
// executar(acao, usuario), auditar(acao, detalhe) }
async function confirmar({ contato, codigo, deps, db = pool, agora = new Date() }) {
  const pendentes = await pendentesDoContato(contato, db);
  if (!pendentes.length) return { texto: 'Não há nenhuma ação esperando confirmação.' };
  if (!codigo) return { texto: 'Responda SIM seguido do código que veio com a ação (ex.: SIM 1234).' };
  const acao = pendentes.find(a => a.codigo === String(codigo));
  if (!acao) {
    const { rows: [c] } = await db.query(
      'UPDATE canal_contatos SET codigos_errados = codigos_errados + 1, atualizado_em = NOW() WHERE canal = $1 AND id_externo = $2 RETURNING codigos_errados',
      [contato.canal, contato.id_externo]);
    await deps.auditar('acao_codigo_errado', { tentativas: c?.codigos_errados ?? null });
    if ((c?.codigos_errados || 0) >= MAX_CODIGOS_ERRADOS) {
      for (const a of pendentes) await encerrar(a, 'descartada', { motivo: 'codigos_errados', em: agora.toISOString() }, null, db);
      await db.query('UPDATE canal_contatos SET codigos_errados = 0 WHERE canal = $1 AND id_externo = $2', [contato.canal, contato.id_externo]);
      await deps.auditar('acao_cancelada', { motivo: 'codigos_errados', acoes: pendentes.map(a => a.id) });
      return { texto: 'Código errado muitas vezes: as ações pendentes foram canceladas. Peça de novo se precisar.' };
    }
    return { texto: 'Código não confere. Nada foi feito. Confira o número e responda SIM <código>.' };
  }
  await db.query('UPDATE canal_contatos SET codigos_errados = 0 WHERE canal = $1 AND id_externo = $2', [contato.canal, contato.id_externo]);
  if (aplicando.has(acao.id)) return { texto: 'Esta ação já está sendo executada.' };
  aplicando.add(acao.id);
  try {
    // 1. prazo e impressão do alvo (reconferirAcao também vê o prazo)
    if (acao.expira_em && new Date(acao.expira_em) <= agora) {
      await encerrar(acao, 'descartada', { motivo: 'expirou', em: agora.toISOString() }, null, db);
      await deps.auditar('acao_expirada', { acao_id: acao.id, tipo: acao.tipo });
      return { texto: 'O prazo para confirmar acabou. Nada foi feito: peça de novo.' };
    }
    // 2. quem confirma ainda pode (vínculo ativo, papel e posse de agora)
    const usuario = await deps.usuarioAtual();
    if (!usuario || usuario.id !== acao.usuario_id) {
      await encerrar(acao, 'descartada', { motivo: 'sem_vinculo', em: agora.toISOString() }, usuario?.id ?? null, db);
      await deps.auditar('acao_recusada', { acao_id: acao.id, motivo: 'sem_vinculo' });
      return { texto: 'Este chat não está mais ligado a quem pediu a ação. Nada foi feito.' };
    }
    const permissao = await podeAgir(usuario, acao, db);
    if (!permissao.ok) {
      await encerrar(acao, 'descartada', { motivo: 'sem_permissao', erro: permissao.motivo, em: agora.toISOString() }, usuario.id, db);
      await deps.auditar('acao_recusada', { acao_id: acao.id, motivo: 'sem_permissao' });
      return { texto: `Sem permissão: ${permissao.motivo} Nada foi feito.` };
    }
    // 3. o registro não mudou desde o resumo (INT-08) e passa de novo pela conferência de envio (INT-03)
    const conferida = await reconferirAcao(acao, { agora });
    if (!conferida.ok) {
      await encerrar(acao, 'descartada', { motivo: conferida.motivo, erro: conferida.mensagem, em: agora.toISOString() }, usuario.id, db);
      await deps.auditar('acao_recusada', { acao_id: acao.id, motivo: conferida.motivo });
      return { texto: conferida.mensagem };
    }
    // 4. executa pela rota de sempre
    let resultado;
    try {
      resultado = await deps.executar(acao, usuario);
    } catch (e) {
      const erro = e instanceof ErroAcao ? e.message : 'Falha ao executar a ação.';
      if (!(e instanceof ErroAcao)) console.error('[canal] falha ao executar ação:', e);
      await encerrar(acao, 'falhou', { erro, em: new Date().toISOString() }, usuario.id, db);
      await deps.auditar('acao_falhou', { acao_id: acao.id, tipo: acao.tipo });
      return { texto: `Não foi possível: ${erro}` };
    }
    const resumo = { ok: true, mensagem: resultado?.mensagem || null, numero: resultado?.numero || null, status: resultado?.status || null };
    await encerrar(acao, 'aplicada', resumo, usuario.id, db);
    await deps.auditar('acao_confirmada', { acao_id: acao.id, tipo: acao.tipo, alvo_id: acao.alvo_id });
    return { texto: `Feito. ${resumo.mensagem || 'Ação executada.'}` };
  } finally {
    aplicando.delete(acao.id);
  }
}

// "NÃO": cancela todas as pendentes do contato
async function cancelar({ contato, usuarioId, deps, db = pool }) {
  const pendentes = await pendentesDoContato(contato, db);
  if (!pendentes.length) return { texto: 'Não há nenhuma ação esperando confirmação.' };
  for (const a of pendentes) await encerrar(a, 'descartada', { motivo: 'cancelada_no_canal', em: new Date().toISOString() }, usuarioId, db);
  await deps.auditar('acao_cancelada', { acoes: pendentes.map(a => a.id) });
  return { texto: pendentes.length === 1 ? 'Cancelado. Nada foi feito.' : `Canceladas ${pendentes.length} ações. Nada foi feito.` };
}

module.exports = {
  podeAgir, pendentesDoContato, criarAcaoDoCanal, prepararAcoesDoAssistente, confirmar, cancelar, executorPadrao,
  MAX_CODIGOS_ERRADOS,
};
