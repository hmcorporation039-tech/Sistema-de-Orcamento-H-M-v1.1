// Trabalhador do canal: processa a fila (fila.js) no próprio backend, de forma assíncrona. Para cada
// mensagem:
//   1. quem escreveu: usuarioPeloCanal (vínculo VERIFICADO; sem vínculo só "/vincular" funciona);
//   2. auditoria da mensagem (registrarAuditoria) e limite por chat (inundação é ignorada);
//   3. voz → texto (whisper.cpp local, se configurado);
//   4. "SIM 4821" / "NÃO" (ação pendente), "1", "2"… (escolha), comando local (interpretador.js);
//   5. o resto → assistente (Claude Max primeiro), com as mesmas ferramentas;
//   6. resposta guardada na fila ANTES do envio (falha de envio só reenvia) e enviada pelo adaptador.
const pool = require('../../config/database');
const F = require('./fila');
const { config } = require('./config');
const { dependencias } = require('./dependencias');
const { criarAdaptador } = require('./adaptadores');
const { interpretar } = require('./interpretador');
const { executarComando, aplicarEscolha } = require('./comandos');
const P = require('./acoesPendentes');
const voz = require('./voz');

const NAO_VINCULADO = 'Use /vincular <código> gerado no sistema.';
const ORIGEM = { telegram: 'telegram', whatsapp: 'whatsapp', simulador: 'web' };
const FALHA_GERAL = 'Não consegui processar sua mensagem agora. Tente de novo em alguns minutos.';

async function contatoDe(msg, db = pool) {
  const { rows: [c] } = await db.query(
    `INSERT INTO canal_contatos (canal, id_externo) VALUES ($1, $2)
     ON CONFLICT (canal, id_externo) DO UPDATE SET atualizado_em = canal_contatos.atualizado_em RETURNING *`, [msg.canal, msg.remetente]);
  return c;
}

// usuário de AGORA: pelo vínculo verificado; no simulador, o administrador logado que mandou
async function usuarioAtual(msg, seg, db = pool) {
  if (msg.canal === 'simulador') {
    if (msg.midia?.sem_vinculo || !msg.usuario_id) return null;
    const { rows: [u] } = await db.query('SELECT id, nome, email, role AS papel FROM usuarios WHERE id = $1 AND ativo', [msg.usuario_id]);
    return u || null;
  }
  return seg.usuarioPeloCanal(msg.canal, msg.remetente);
}

function padrao() {
  return {
    seg: () => dependencias(),
    adaptador: (canal) => criarAdaptador(canal),
    assistente: (a) => require('./assistenteCanal').perguntarAoAssistente(a),
    executar: P.executorPadrao(),
    vozDisponivel: () => voz.vozDisponivel(),
    transcrever: (buffer) => voz.transcrever(buffer),
    cfg: () => config(),
    db: pool,
  };
}

function criarTrabalhador(opcoes = {}) {
  const d = { ...padrao(), ...opcoes };
  const db = d.db;

  // → { texto | null, via, usuario }
  async function decidir(msg) {
    const seg = d.seg();
    const cfg = d.cfg();
    const contato = await contatoDe(msg, db);
    const usuario = await usuarioAtual(msg, seg, db);
    const auditar = (acao, detalhe = {}) => seg.registrarAuditoria({
      usuario_id: usuario?.id ?? null, origem: ORIGEM[msg.canal] || 'web', acao, ip: msg.ip || null,
      detalhe: { canal: msg.canal, mensagem_id: msg.id, ...detalhe },
    });
    await auditar('canal_mensagem', { tipo: msg.tipo, vinculado: !!usuario });

    if (await F.recentesDoRemetente(msg.canal, msg.remetente, db) > cfg.mensagensPorMinuto) {
      await auditar('canal_inundacao', {});
      return { texto: null, via: 'ignorada', usuario, ignorar: true };
    }

    let texto = msg.texto;
    let prefixo = '';
    if (msg.tipo === 'audio') {
      if (!usuario) return { texto: NAO_VINCULADO, via: 'vinculo', usuario };
      if (!d.vozDisponivel()) return { texto: voz.NAO_ATIVADA, via: 'voz', usuario };
      const buffer = await d.adaptador(msg.canal).baixarAudio(msg.midia).catch(() => null);
      const t = await d.transcrever(buffer);
      if (t.erro) return { texto: t.erro, via: 'voz', usuario };
      texto = t.texto;
      prefixo = `(Entendi: "${texto.slice(0, 200)}")\n\n`;
    } else if (msg.tipo !== 'texto' || !String(texto || '').trim()) {
      return { texto: usuario ? 'Por enquanto leio só texto (e voz, quando ativada). Mande "ajuda" para ver os comandos.' : NAO_VINCULADO, via: 'outro', usuario };
    }

    let cmd = interpretar(texto);
    if (cmd?.comando === 'vincular') {
      if (msg.canal === 'simulador') return { texto: 'No simulador, quem fala é o seu login: não precisa vincular.', via: 'vinculo', usuario };
      if (!cmd.codigo) return { texto: 'Mande /vincular seguido do código de 6 dígitos gerado em Cadastros › Minha conta.', via: 'vinculo', usuario };
      const r = await seg.confirmarVinculo(msg.canal, msg.remetente, cmd.codigo).catch(() => ({ ok: false }));
      if (r?.ok) {
        await db.query('UPDATE canal_contatos SET usuario_id = $3, conversa_id = NULL, escolha = NULL, codigos_errados = 0, atualizado_em = NOW() WHERE canal = $1 AND id_externo = $2',
          [msg.canal, msg.remetente, r.usuario?.id ?? null]);
        return { texto: `Pronto, ${r.usuario?.nome || 'usuário'}: este chat está ligado à sua conta. Mande "ajuda" para ver os comandos.`, via: 'vinculo', usuario: r.usuario || null };
      }
      return { texto: r?.motivo === 'muitas_tentativas' ? 'Muitas tentativas. Aguarde 15 minutos e gere outro código.' : 'Código inválido ou vencido. Gere outro em Cadastros › Minha conta.', via: 'vinculo', usuario };
    }
    if (!usuario) return { texto: NAO_VINCULADO, via: 'vinculo', usuario };

    // chat que mudou de dono: começa do zero (conversa, escolha, códigos errados)
    if (contato.usuario_id !== usuario.id) {
      await db.query('UPDATE canal_contatos SET usuario_id = $2, conversa_id = NULL, escolha = NULL, codigos_errados = 0, atualizado_em = NOW() WHERE id = $1',
        [contato.id, usuario.id]);
      contato.usuario_id = usuario.id; contato.conversa_id = null; contato.escolha = null;
    }
    const ctx = { contato, usuario, db };
    const depsAcao = {
      usuarioAtual: () => usuarioAtual(msg, seg, db),
      executar: (acao, u) => d.executar(acao, u),
      auditar: (acao, detalhe) => auditar(acao, detalhe),
    };

    if (cmd?.comando === 'confirmar') return { texto: (await P.confirmar({ contato, codigo: cmd.codigo, deps: depsAcao, db })).texto, via: 'acao', usuario };
    if (cmd?.comando === 'cancelar') return { texto: (await P.cancelar({ contato, usuarioId: usuario.id, deps: depsAcao, db })).texto, via: 'acao', usuario };
    if (cmd?.comando === 'escolha') {
      const e = aplicarEscolha(contato.escolha, cmd.indice);
      if (e.erro) return { texto: e.erro, via: 'interpretador', usuario };
      cmd = e.comando;
    }

    let resultado = null;
    let via = 'interpretador';
    if (cmd) resultado = await executarComando(cmd, ctx);
    if (!resultado) {
      if (!cfg.assistente) return { texto: 'Não entendi. Mande "ajuda" para ver os comandos.', via: 'interpretador', usuario };
      via = 'assistente';
      resultado = await d.assistente({ contato, usuario, texto });
    }
    await db.query('UPDATE canal_contatos SET escolha = $2, atualizado_em = NOW() WHERE id = $1', [contato.id, resultado.escolha ? JSON.stringify(resultado.escolha) : null]);
    if (resultado.acao) await auditar('acao_pendente_criada', { acao_id: resultado.acao.id, tipo: resultado.acao.tipo, alvo_id: resultado.acao.alvo_id });
    await auditar(via === 'assistente' ? 'canal_assistente' : 'canal_comando', { comando: cmd?.comando || null });
    return { texto: prefixo + resultado.texto, via, usuario };
  }

  async function enviar(msg, texto) {
    const r = await d.adaptador(msg.canal).enviar(msg.conversa, texto);
    return !!r?.enviado;
  }

  // processa uma mensagem já tirada da fila (estado 'processando')
  async function processar(msg) {
    const cfg = d.cfg();
    try {
      let texto = msg.resposta;
      let via = msg.via;
      let usuarioId = msg.usuario_id;
      if (!texto) {
        const r = await decidir(msg);
        if (r.ignorar) { await F.concluir(msg.id, { resposta: null, via: 'ignorada', estado: 'ignorada', usuarioId: r.usuario?.id ?? null }, db); return; }
        texto = r.texto; via = r.via; usuarioId = r.usuario?.id ?? null;
        await F.guardarResposta(msg.id, { resposta: texto, via, usuarioId }, db);
      }
      const enviada = await enviar(msg, texto);
      await F.concluir(msg.id, { resposta: texto, via, usuarioId, enviada }, db);
    } catch (e) {
      console.error(`[canal] mensagem ${msg.id}:`, e.message);
      const desistiu = await F.falhar(msg.id, { erro: e.message, tentativas: msg.tentativas, maxTentativas: cfg.maxTentativas }, db).catch(() => true);
      if (desistiu) await enviar(msg, FALHA_GERAL).catch(() => {});
    }
  }

  // ── laço ──────────────────────────────────────────────────────────────
  const ocupados = new Set();
  let rodando = 0;
  let drenando = false;
  let deNovo = false;
  let relogio = null;
  const ociosos = [];

  async function drenar() {
    if (drenando) { deNovo = true; return; }
    drenando = true;
    try {
      do {
        deNovo = false;
        while (rodando < d.cfg().simultaneas) {
          const msg = await F.pegarProxima([...ocupados], db);
          if (!msg) break;
          const chave = `${msg.canal}:${msg.remetente}`;
          rodando++; ocupados.add(chave);
          processar(msg).finally(() => {
            rodando--; ocupados.delete(chave);
            setImmediate(acordar);
          });
        }
      } while (deNovo);
    } catch (e) {
      console.error('[canal] fila:', e.message);
    } finally {
      drenando = false;
      if (rodando === 0) ociosos.splice(0).forEach(f => f());
    }
  }

  function acordar() { drenar(); }

  function ligarRelogio(intervaloMs = 20000) {
    if (relogio) return;
    relogio = setInterval(() => { F.devolverPresas(db).catch(() => {}); drenar(); }, intervaloMs);
    relogio.unref?.();
  }
  function parar() { if (relogio) clearInterval(relogio); relogio = null; }

  // testes: espera a fila esvaziar
  async function esperarOcioso(maxMs = 20000) {
    const ate = Date.now() + maxMs;
    while (Date.now() < ate) {
      await drenar();
      if (rodando === 0 && !drenando && !(await F.haPendentes(db))) return true;
      await new Promise(r => setTimeout(r, 30));
    }
    return false;
  }

  return { processar, decidir, drenar, acordar, ligarRelogio, parar, esperarOcioso, estado: () => ({ rodando, drenando, ocupados: [...ocupados] }) };
}

let principal = null;
const trabalhador = () => (principal ||= criarTrabalhador());
const substituirTrabalhador = (t) => { if (principal && principal !== t) principal.parar(); principal = t; };

// Partida do backend: devolve à fila o que ficou pela metade e liga o relógio se algum canal estiver ligado
async function iniciarCanal() {
  const cfg = config();
  try {
    await F.devolverPresas();
    if (cfg.telegram.ativo || cfg.whatsapp.ativo || await F.haPendentes()) {
      trabalhador().ligarRelogio();
      trabalhador().acordar();
    }
  } catch (e) {
    console.warn('[canal] não iniciou a fila:', e.message);
  }
}

module.exports = { criarTrabalhador, trabalhador, substituirTrabalhador, iniciarCanal, NAO_VINCULADO, contatoDe };
