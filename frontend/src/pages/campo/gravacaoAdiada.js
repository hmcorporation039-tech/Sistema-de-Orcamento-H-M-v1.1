// Gravação adiada dos textos do app de campo (observação do item e observação
// final) — regras puras, testadas em gravacaoAdiada.test.js.
//
// Antes a observação só ia para a fila no "blur": se o celular bloqueasse, o
// app fosse para segundo plano ou a pessoa tocasse em outra coisa sem tirar o
// foco, o texto se perdia. Agora:
//   - grava ~1,5 s depois de a pessoa parar de digitar (debounce);
//   - grava na hora quando a página some (visibilitychange hidden / pagehide),
//     ao sair da tela e antes de ir ao login (descarregarTodos);
//   - as gravações de um mesmo item passam por uma fila (uma de cada vez, na
//     ordem em que a pessoa agiu), e a resposta usada é a ÚLTIMA escolhida na
//     tela (guardada aqui, não relida do IndexedDB): uma observação gravada
//     depois de um toque em "Não conforme" nunca volta a resposta antiga.

export const ESPERA_PADRAO = 1500;

const relogioPadrao = { setTimeout: (f, t) => setTimeout(f, t), clearTimeout: t => clearTimeout(t) };

// Gravadores vivos (para descarregar tudo de uma vez antes de sair/ir ao login).
const ativos = new Set();
export function descarregarTodos() {
  return Promise.all([...ativos].map(g => g.descarregar()));
}
export function quantosAtivos() { return ativos.size; }

// gravar(): função async que lê o estado atual e grava (ou não, se nada mudou).
// executar(fn): põe outra gravação (ex.: o toque na resposta) na mesma fila.
export function criarGravadorAdiado({ gravar, esperaMs = ESPERA_PADRAO, relogio = relogioPadrao, aoErro = () => {} }) {
  let timer = null;
  let sujo = false;
  let cadeia = Promise.resolve();
  const g = {};

  function limparTimer() {
    if (timer) { relogio.clearTimeout(timer); timer = null; }
  }
  function enfileirar(fn) {
    cadeia = cadeia.then(fn).catch(err => { try { aoErro(err); } catch { /* tela */ } });
    return cadeia;
  }
  g.agendar = () => {
    ativos.add(g); // volta à lista se tiver sido encerrado e reaproveitado
    sujo = true;
    limparTimer();
    timer = relogio.setTimeout(() => { timer = null; g.descarregar(); }, esperaMs);
  };
  g.descarregar = () => {
    limparTimer();
    if (!sujo) return cadeia;
    sujo = false;
    return enfileirar(() => gravar());
  };
  // Grava algo agora, na ordem; o texto pendente vai junto (quem chama inclui).
  g.executar = (fn) => {
    limparTimer();
    sujo = false;
    return enfileirar(fn);
  };
  g.pendente = () => sujo;
  g.ocioso = () => cadeia;
  g.encerrar = () => { const p = g.descarregar(); ativos.delete(g); return p; };
  ativos.add(g);
  return g;
}

// Editor de um item do checklist: resposta + observação, sem corrida.
//   registrar(dados) → grava a operação 'responder' (dados.registrar no app)
export function criarEditorItem({ itemId, resposta = null, observacao = '', registrar, esperaMs, relogio, aoErro }) {
  const estado = { resposta, observacao, gravada: observacao };
  const gravador = criarGravadorAdiado({
    esperaMs, relogio, aoErro,
    gravar: async () => {
      const texto = estado.observacao;
      if (texto === estado.gravada) return;
      await registrar({ item_id: itemId, resposta: estado.resposta, observacao: texto });
      estado.gravada = texto;
    },
  });
  return {
    estado: () => ({ ...estado }),
    digitar(texto) { estado.observacao = texto; gravador.agendar(); },
    // toque na resposta: vale na hora (a próxima gravação da observação já usa
    // esta resposta) e leva junto o texto ainda não gravado
    responder(nova) {
      estado.resposta = nova;
      return gravador.executar(async () => {
        const texto = estado.observacao;
        await registrar({ item_id: itemId, resposta: nova, observacao: texto });
        estado.gravada = texto;
      });
    },
    // cópia nova vinda do servidor/da fila: só troca o que a pessoa não está editando
    atualizarDeFora({ resposta: r, observacao: o }, editandoTexto) {
      if (!gravador.pendente()) estado.resposta = r ?? null;
      if (!editandoTexto && !gravador.pendente()) { estado.observacao = o || ''; estado.gravada = o || ''; }
    },
    descarregar: () => gravador.descarregar(),
    encerrar: () => gravador.encerrar(),
    pendente: () => gravador.pendente(),
    ocioso: () => gravador.ocioso(),
  };
}

// Observação final da OS: o mesmo, com a operação 'observacao'.
export function criarEditorTexto({ texto = '', registrar, esperaMs, relogio, aoErro }) {
  const estado = { texto, gravado: texto };
  const gravador = criarGravadorAdiado({
    esperaMs, relogio, aoErro,
    gravar: async () => {
      const t = estado.texto;
      if (t === estado.gravado) return;
      await registrar({ texto: t });
      estado.gravado = t;
    },
  });
  return {
    estado: () => ({ ...estado }),
    digitar(t) { estado.texto = t; gravador.agendar(); },
    atualizarDeFora(t, editando) {
      if (!editando && !gravador.pendente()) { estado.texto = t || ''; estado.gravado = t || ''; }
    },
    descarregar: () => gravador.descarregar(),
    encerrar: () => gravador.encerrar(),
    pendente: () => gravador.pendente(),
  };
}
