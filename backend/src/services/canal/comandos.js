// Execução dos comandos reconhecidos pelo interpretador local (sem IA). Cada um devolve
// { texto } ou, quando a busca aproximada acha mais de um candidato, { texto, escolha } — o canal
// guarda a escolha (canal_contatos.escolha, prazo de 10 min) e a próxima mensagem "1", "2"… a resolve.
const pool = require('../../config/database');
const C = require('./consultas');
const B = require('./busca');
const { AJUDA } = require('./interpretador');
const { criarAcaoDoCanal } = require('./acoesPendentes');
const { conversaDoContato } = require('./assistenteCanal');
const { ErroAcao } = require('../assistente/acoes');

const SO_FINANCEIRO = 'Esta consulta é só para o administrador e o financeiro.';
const PRAZO_ESCOLHA_MS = 10 * 60 * 1000;

function perguntar(tipo, achado, comando) {
  const opcoes = achado.varios.slice(0, 5).map(o => ({ id: o.id, rotulo: o.rotulo }));
  return {
    texto: `Achei mais de ${tipo === 'obra' ? 'uma obra' : tipo === 'cliente' ? 'um cliente' : tipo === 'projeto' ? 'um projeto' : 'uma proposta'}:\n`
      + opcoes.map((o, i) => `${i + 1}) ${o.rotulo}`).join('\n')
      + '\nResponda com o número.',
    escolha: { campo: tipo, opcoes, comando, expira_em: new Date(Date.now() + PRAZO_ESCOLHA_MS).toISOString() },
  };
}

const naoAchei = (tipo, termo) => ({ texto: `Não achei ${tipo} parecido com "${termo}". Confira o nome ou o código.` });

// resolve um campo (obra, proposta, cliente, projeto): id já escolhido ou busca aproximada
async function resolver(tipo, termo, idEscolhido, comando, buscar) {
  if (idEscolhido) return { id: idEscolhido };
  const achado = await buscar(termo);
  if (achado.unico) return { id: achado.unico.id, registro: achado.unico.registro };
  if (achado.varios) return { pergunta: perguntar(tipo, achado, comando) };
  return { pergunta: naoAchei(tipo === 'obra' ? 'obra' : tipo === 'cliente' ? 'cliente' : tipo === 'projeto' ? 'projeto' : 'proposta', termo) };
}

async function buscarProjetos(termo, db = pool) {
  const { rows } = await db.query(
    `SELECT l.id, l.titulo, l.disciplina, l.cliente_nome, l.cliente_id, o.codigo AS obra_codigo, o.nome AS obra_nome
       FROM laudos_projetos l LEFT JOIN obras o ON o.id = l.obra_id WHERE l.tipo = 'projeto' ORDER BY l.atualizado_em DESC NULLS LAST LIMIT 2000`);
  return B.escolher(termo, rows.map(l => ({
    id: l.id, rotulo: `#${l.id} ${l.titulo || 'sem título'} — ${l.disciplina}${l.cliente_nome ? ` (${l.cliente_nome})` : ''}`,
    texto: `${l.titulo || ''} ${l.disciplina} ${l.cliente_nome || ''} ${l.obra_codigo || ''} ${l.obra_nome || ''}`, registro: l,
  })));
}

const emailDoCliente = (c) => (c?.email_nota || c?.email || '').trim() || null;

// destino do envio: e-mail escrito, "o cliente" (o cliente do registro) ou um cliente pelo nome
async function resolverDestino(cmd, clienteDoRegistroId, db) {
  if (cmd.email) return { email: cmd.email };
  const destino = B.normalizar(cmd.destino || '');
  if (!destino || /^(?:o |a )?(?:cliente|ele|ela)$/.test(destino)) {
    if (!clienteDoRegistroId) return { pergunta: { texto: 'Este registro não tem cliente cadastrado. Diga o e-mail: enviar … para nome@empresa.com.br' } };
    const { rows: [c] } = await db.query('SELECT id, nome, email, email_nota FROM clientes WHERE id = $1', [clienteDoRegistroId]);
    const email = emailDoCliente(c);
    return email ? { email, cliente: c.nome } : { pergunta: { texto: `O cliente ${c?.nome || ''} não tem e-mail cadastrado. Diga o e-mail: enviar … para nome@empresa.com.br` } };
  }
  const r = await resolver('cliente', cmd.destino, cmd.cliente_id, cmd, (t) => B.buscarClientes(t, db));
  if (r.pergunta) return r;
  const { rows: [c] } = await db.query('SELECT id, nome, email, email_nota FROM clientes WHERE id = $1', [r.id]);
  const email = emailDoCliente(c);
  return email ? { email, cliente: c.nome } : { pergunta: { texto: `O cliente ${c?.nome || ''} não tem e-mail cadastrado. Diga o e-mail: enviar … para nome@empresa.com.br` } };
}

// cmd = saída do interpretador (+ ids já escolhidos); ctx = { contato, usuario, db }
async function executarComando(cmd, ctx) {
  const db = ctx.db || pool;
  const fin = C.podeVerFinanceiro(ctx.usuario);
  try {
    switch (cmd.comando) {
      case 'ajuda': return { texto: AJUDA };
      case 'custos':
      case 'margem': {
        if (!fin) return { texto: SO_FINANCEIRO };
        const r = await resolver('obra', cmd.obra, cmd.obra_id, cmd, (t) => B.buscarObras(t, db));
        if (r.pergunta) return r.pergunta;
        return cmd.comando === 'custos' ? C.custosDaObra(r.id, { mes: !!cmd.mes, db }) : C.margemDaObra(r.id, { db });
      }
      case 'notas_a_receber': return fin ? C.notasAReceber() : { texto: SO_FINANCEIRO };
      case 'pix_sem_obra': return fin ? C.pixSemObra({ db }) : { texto: SO_FINANCEIRO };
      case 'vencimentos': return C.vencimentos({ incluirEmpresa: fin, db });
      case 'novidades': return C.novidadesPastas();
      case 'cotacoes': return C.cotacoes({ db });
      case 'proposta': {
        const r = await resolver('proposta', cmd.termo, cmd.proposta_id, cmd, (t) => B.buscarPropostas(t, db));
        if (r.pergunta) return r.pergunta;
        return C.resumoProposta(r.id, { db });
      }
      case 'enviar_proposta': {
        const r = await resolver('proposta', cmd.termo, cmd.proposta_id, cmd, (t) => B.buscarPropostas(t, db));
        if (r.pergunta) return r.pergunta;
        const proposta = { id: r.id };
        const { rows: [p] } = await db.query('SELECT id, numero, cliente_id FROM propostas WHERE id = $1', [proposta.id]);
        const destino = await resolverDestino({ ...cmd, proposta_id: p.id }, p.cliente_id, db);
        if (destino.pergunta) return destino.pergunta;
        const conversa = await conversaDoContato(ctx.contato, ctx.usuario, db);
        const criada = await criarAcaoDoCanal({
          contato: ctx.contato, usuario: ctx.usuario, conversaId: conversa.id, tipo: 'enviar_email_proposta', alvo_id: p.id,
          payload: { destinatario: destino.email }, descricao: `Pedido pelo canal${destino.cliente ? ` (cliente ${destino.cliente})` : ''}.`, db,
        });
        return { texto: criada.texto, acao: criada.acao };
      }
      case 'enviar_projeto': {
        const r = await resolver('projeto', cmd.termo, cmd.projeto_id, cmd, (t) => buscarProjetos(t, db));
        if (r.pergunta) return r.pergunta;
        const { rows: [l] } = await db.query('SELECT id, cliente_id FROM laudos_projetos WHERE id = $1', [r.id]);
        const destino = await resolverDestino({ ...cmd, projeto_id: l.id }, l.cliente_id, db);
        if (destino.pergunta) return destino.pergunta;
        const conversa = await conversaDoContato(ctx.contato, ctx.usuario, db);
        const criada = await criarAcaoDoCanal({
          contato: ctx.contato, usuario: ctx.usuario, conversaId: conversa.id, tipo: 'enviar_email_projeto', alvo_id: l.id,
          payload: { destinatario: destino.email }, descricao: `Pedido pelo canal${destino.cliente ? ` (cliente ${destino.cliente})` : ''}.`, db,
        });
        return { texto: criada.texto, acao: criada.acao };
      }
      default: return null;
    }
  } catch (e) {
    if (e instanceof ErroAcao || e instanceof C.ErroConsulta) return { texto: e.message };
    throw e;
  }
}

// "2" depois de "qual delas?": completa o comando guardado com o id escolhido
function aplicarEscolha(escolha, indice) {
  if (!escolha || !Array.isArray(escolha.opcoes)) return { erro: 'Não há nenhuma lista esperando resposta.' };
  if (escolha.expira_em && new Date(escolha.expira_em) < new Date()) return { erro: 'A lista expirou. Repita o pedido.' };
  const op = escolha.opcoes[indice - 1];
  if (!op) return { erro: `Escolha um número de 1 a ${escolha.opcoes.length}.` };
  const campo = { obra: 'obra_id', proposta: 'proposta_id', cliente: 'cliente_id', projeto: 'projeto_id' }[escolha.campo];
  return { comando: { ...escolha.comando, [campo]: op.id } };
}

module.exports = { executarComando, aplicarEscolha, buscarProjetos, SO_FINANCEIRO };
