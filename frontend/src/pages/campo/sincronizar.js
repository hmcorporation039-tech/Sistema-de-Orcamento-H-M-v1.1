// Sincronização do app de campo com o servidor (docs/CAMPO-API.md).
//
// Ordem de cada rodada:
//   1. fila de operações, em lotes, na ordem → POST /campo/sincronizar
//   2. fotos pendentes, uma a uma          → POST /campo/os/:uuid/fotos
//   3. OS alteradas                        → GET  /campo/os?status=abertas&desde=…
//   4. obras e modelos de checklist (no máximo a cada hora, ou no botão)
//
// Regras:
//   - Nada sai do aparelho antes de o servidor confirmar. Operação só sai da
//     fila com resultado ok:true (ou fica "recusada" com ok:false).
//   - Reenviar é seguro: o servidor reconhece op_uuid e o uuid da foto já
//     aplicados e devolve o mesmo resultado. Se a resposta se perder no meio
//     do caminho, a próxima rodada manda de novo e nada duplica.
//   - Erro de regra (ok:false ou 4xx) não é reenviado: fica "recusada" e
//     aparece para o técnico, que pode descartar ou tentar de novo.
//   - Erro de rede, 5xx, 408 e 429: para a rodada e tenta depois, com espera
//     crescente (5 s, 10 s, 20 s… até 5 min).
//   - 401: para tudo e vai ao login (apiCampo); a fila continua no aparelho.

const TAMANHO_LOTE = 25;
const ESPERA_INICIAL = 5000;
const ESPERA_MAXIMA = 5 * 60 * 1000;
const INTERVALO_COMPLETO = 6 * 60 * 60 * 1000; // download completo (sem `desde`)
const INTERVALO_LISTAS = 60 * 60 * 1000;

export function esperaParaTentativa(n, aleatorio = Math.random) {
  const base = Math.min(ESPERA_MAXIMA, ESPERA_INICIAL * 2 ** Math.max(0, n - 1));
  return Math.round(base * (0.85 + 0.3 * aleatorio()));
}

function paraEnvio(op) {
  return { op_uuid: op.op_uuid, feita_em: op.feita_em, tipo: op.tipo, os_uuid: op.os_uuid, dados: op.dados };
}

function bytesParaBlob(arq) {
  return new Blob([arq.bytes], { type: arq.tipo_mime || 'image/jpeg' });
}

export function criarSincronizador({
  dados, api, agora = () => new Date(),
  relogio = { setTimeout: (f, t) => setTimeout(f, t), clearTimeout: t => clearTimeout(t) },
  tamanhoLote = TAMANHO_LOTE, aoEstado = () => {}, ultimaSincronizacao = null,
}) {
  let emAndamento = null;
  let timer = null;
  let tentativas = 0;
  const estado = {
    executando: false, ultimaSincronizacao, erro: null,
    proximaTentativa: null, precisaLogin: false, etapa: null,
  };
  function publicar(mudancas) { Object.assign(estado, mudancas); aoEstado({ ...estado }); }

  function agendar(ms) {
    if (timer) relogio.clearTimeout(timer);
    publicar({ proximaTentativa: new Date(agora().getTime() + ms).toISOString() });
    timer = relogio.setTimeout(() => { timer = null; sincronizar(); }, ms);
  }

  async function processarResposta(lote, resp) {
    const resultados = new Map((resp?.resultados || []).map(r => [r.op_uuid, r]));
    const osVindas = new Set((resp?.os || []).map(o => o.uuid));
    await dados.salvarDoServidor(resp?.os || []);
    let semResultado = 0;
    for (const op of lote) {
      const r = resultados.get(op.op_uuid);
      if (!r) { semResultado++; continue; } // fica na fila; vai de novo
      if (r.ok) {
        if (!osVindas.has(op.os_uuid)) await dados.confirmarOperacao(op);
        await dados.removerOperacao(op.seq);
      } else {
        await dados.recusarOperacao(op.seq, r.erro);
      }
    }
    return semResultado;
  }

  async function enviarFila() {
    const pendentes = (await dados.fila()).filter(o => o.estado !== 'recusada');
    let incompleto = 0;
    for (let i = 0; i < pendentes.length; i += tamanhoLote) {
      const lote = pendentes.slice(i, i + tamanhoLote);
      publicar({ etapa: `Enviando ${Math.min(i + lote.length, pendentes.length)} de ${pendentes.length} alterações` });
      let resp;
      try {
        resp = await api.sincronizarOperacoes(lote.map(paraEnvio));
      } catch (err) {
        if (!err.regra) throw err; // rede/5xx/401: para a rodada
        // O lote inteiro foi recusado (corpo inválido, por exemplo): manda uma a
        // uma para recusar só a que tem problema.
        for (const op of lote) {
          try {
            const r1 = await api.sincronizarOperacoes([paraEnvio(op)]);
            incompleto += await processarResposta([op], r1);
          } catch (e1) {
            if (!e1.regra) throw e1;
            await dados.recusarOperacao(op.seq, e1.message);
          }
        }
        dados.emitir();
        continue;
      }
      incompleto += await processarResposta(lote, resp);
      dados.emitir();
    }
    return incompleto;
  }

  async function enviarFotos() {
    const pendentes = (await dados.fotosMeta())
      .filter(f => f.estado === 'pendente')
      .sort((a, b) => String(a.tirada_em).localeCompare(String(b.tirada_em)));
    let n = 0;
    for (const foto of pendentes) {
      n++;
      publicar({ etapa: `Enviando foto ${n} de ${pendentes.length}` });
      const arq = await dados.lerArquivo(foto.uuid);
      if (!arq?.bytes) {
        await dados.marcarFoto(foto.uuid, 'recusada', 'O arquivo da foto não está mais no aparelho.');
        continue;
      }
      try {
        await api.enviarFoto(foto.os_uuid, foto, bytesParaBlob(arq));
        await dados.marcarFoto(foto.uuid, 'enviada');
      } catch (err) {
        if (!err.regra) throw err;
        await dados.marcarFoto(foto.uuid, 'recusada', err.message);
      }
      dados.emitir();
    }
  }

  async function baixar(forcarCompleto) {
    publicar({ etapa: 'Baixando ordens de serviço' });
    const desde = await dados.meta('desde');
    const ultimaCompleta = await dados.meta('ultima_completa');
    const completo = forcarCompleto || !desde || !ultimaCompleta
      || agora().getTime() - Date.parse(ultimaCompleta) > INTERVALO_COMPLETO;
    const resp = await api.listarOS({ status: 'abertas', desde: completo ? undefined : desde });
    const itens = resp?.itens || [];
    await dados.salvarDoServidor(itens);
    if (completo) {
      await dados.podarAusentes(itens.map(o => o.uuid));
      await dados.salvarMeta('ultima_completa', agora().toISOString());
    }
    if (resp?.agora) await dados.salvarMeta('desde', resp.agora);
    await dados.limparAntigas();
  }

  async function atualizarListas(forcar) {
    const ultima = await dados.meta('listas_em');
    if (!forcar && ultima && agora().getTime() - Date.parse(ultima) < INTERVALO_LISTAS) return;
    publicar({ etapa: 'Atualizando obras e checklists' });
    // Uma lista que falhar (rota ainda inexistente, por exemplo) não impede a outra.
    for (const [chave, chamar] of [['modelos', api.listarModelos], ['obras', api.listarObras]]) {
      try {
        const r = await chamar();
        if (Array.isArray(r?.itens)) await dados.salvarLista(chave, r.itens);
      } catch (err) {
        if (err.autenticacao || err.rede) throw err;
      }
    }
    await dados.salvarMeta('listas_em', agora().toISOString());
  }

  async function executar({ forcarCompleto = false } = {}) {
    publicar({ executando: true, erro: null, precisaLogin: false });
    try {
      const incompleto = await enviarFila();
      await enviarFotos();
      await baixar(forcarCompleto);
      await atualizarListas(forcarCompleto);
      tentativas = 0;
      if (timer) { relogio.clearTimeout(timer); timer = null; }
      const quando = agora().toISOString();
      await dados.salvarMeta('ultima_sincronizacao', quando); // aparece mesmo depois de recarregar sem rede
      publicar({ ultimaSincronizacao: quando, proximaTentativa: null, erro: null });
      if (incompleto) agendar(esperaParaTentativa(1)); // o servidor não respondeu sobre alguma
      return { ok: true };
    } catch (err) {
      if (err.autenticacao) {
        publicar({ precisaLogin: true, erro: err.message });
        return { ok: false, erro: err };
      }
      tentativas++;
      publicar({ erro: err.message || 'Falha ao sincronizar.' });
      agendar(esperaParaTentativa(tentativas));
      return { ok: false, erro: err };
    } finally {
      publicar({ executando: false, etapa: null });
      dados.emitir();
    }
  }

  // Uma rodada por vez: chamadas durante uma rodada esperam a mesma rodada
  // e, se pediram, emendam mais uma no fim (pegam o que entrou na fila no meio).
  let pedirOutra = null;
  function sincronizar(opcoes = {}) {
    if (emAndamento) {
      pedirOutra = { forcarCompleto: !!(opcoes.forcarCompleto || pedirOutra?.forcarCompleto) };
      return emAndamento;
    }
    emAndamento = executar(opcoes).then(async r => {
      while (pedirOutra && r.ok) {
        const o = pedirOutra; pedirOutra = null;
        r = await executar(o);
      }
      pedirOutra = null;
      return r;
    }).finally(() => { emAndamento = null; });
    return emAndamento;
  }

  function parar() {
    if (timer) relogio.clearTimeout(timer);
    timer = null;
  }

  return { sincronizar, parar, estado: () => ({ ...estado }), tentativas: () => tentativas };
}
