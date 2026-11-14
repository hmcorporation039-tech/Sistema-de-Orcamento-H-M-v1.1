// Fila de vagas (semáforo com ordem de chegada) — fonte única desde a 2.38.
// Antes havia quatro cópias com pequenas diferenças: a do Claude Max (services/ia.js), a do
// PDF (services/pdfPuppeteer.js), a das threads de CAD/3D (services/executarNoWorker.js) e
// a do assistente/agentes (services/assistente/execucao.js e services/agentes/executor.js).
// Uma corrigida (prazo na fila, cancelamento, ninguém furando a fila) não corrigia as outras.
//
// criarFila(maximo) — `maximo` é número ou função (lida a cada vez: o .env pode mudar o teto)
//   reservar({ id, signal, prazoMs, aoMudarPosicao, erroPrazo, erroCancelado }) → Promise<soltar>
//     - entra direto se há vaga; senão espera a vez (ordem de chegada);
//     - `prazoMs` > 0: desiste com erroPrazo() (padrão: { timeout: true });
//     - `signal` abortado: sai da fila com erroCancelado(signal) (padrão: { cancelado: true });
//     - `aoMudarPosicao(n)`: posição (1 = próximo) sempre que a fila anda;
//     - `soltar()` devolve a vaga (pode ser chamado mais de uma vez: só a 1ª conta).
//   remover(id, erro?) → true se tirou da espera (quem esperava recebe o erro de cancelado)
//   situacao() → { ativos, esperando, maximo }
// A vaga é contada na hora em que a próxima entra (síncrono): ninguém fura a fila entre um
// soltar e a entrada do próximo.

const erroPrazoPadrao = (prazoMs) => Object.assign(new Error(`sem vaga na fila em ${Math.round(prazoMs / 1000)} s`), { timeout: true });
const erroCanceladoPadrao = () => Object.assign(new Error('Cancelado pelo usuário.'), { cancelado: true });

function criarFila(maximo) {
  const teto = typeof maximo === 'function' ? maximo : () => maximo;
  let ativos = 0;
  const espera = [];

  const avisar = () => espera.forEach((e, i) => { try { e.aoMudarPosicao(i + 1); } catch { /* quem ouve não derruba a fila */ } });
  const soltarUmaVez = () => {
    let solto = false;
    return () => { if (solto) return; solto = true; ativos--; proximo(); };
  };
  function proximo() {
    let andou = false;
    while (ativos < teto() && espera.length) {
      const e = espera.shift();
      ativos++;
      andou = true;
      e.entrar(soltarUmaVez());
    }
    if (andou) avisar();
  }

  function reservar({ id = null, signal = null, prazoMs = 0, aoMudarPosicao = () => {}, erroPrazo = erroPrazoPadrao, erroCancelado = erroCanceladoPadrao } = {}) {
    if (signal?.aborted) return Promise.reject(erroCancelado(signal));
    return new Promise((resolve, reject) => {
      let timer = null;
      const aoAbortar = () => sair(erroCancelado(signal));
      const limpar = () => { clearTimeout(timer); signal?.removeEventListener('abort', aoAbortar); };
      const e = { id, aoMudarPosicao, entrar: (soltar) => { limpar(); resolve(soltar); }, sair: (erro) => sair(erro) };
      function sair(erro) {
        const i = espera.indexOf(e);
        if (i >= 0) { espera.splice(i, 1); avisar(); }
        limpar();
        reject(erro);
      }
      signal?.addEventListener('abort', aoAbortar, { once: true });
      if (prazoMs > 0) timer = setTimeout(() => sair(erroPrazo(prazoMs)), prazoMs);
      espera.push(e);
      proximo();
      if (espera.includes(e)) avisar();
    });
  }

  function remover(id, erro = erroCanceladoPadrao()) {
    const e = espera.find(x => x.id === id);
    if (!e) return false;
    e.sair(erro);
    return true;
  }

  return { reservar, remover, situacao: () => ({ ativos, esperando: espera.length, maximo: teto() }) };
}

// Forma "adquirir/liberar" (assistente e agentes): liberar() devolve uma das vagas tomadas.
class Fila {
  constructor(maximo) { this.fila = criarFila(maximo); this.soltar = []; }
  async adquirir(id = null, aoMudarPosicao = () => {}) {
    this.soltar.push(await this.fila.reservar({ id, aoMudarPosicao }));
  }
  liberar() { const s = this.soltar.pop(); if (s) s(); }
  remover(id) { return this.fila.remover(id); }
  estado() { const s = this.fila.situacao(); return { rodando: s.ativos, esperando: s.esperando, maximo: s.maximo }; }
}

module.exports = { criarFila, Fila };
