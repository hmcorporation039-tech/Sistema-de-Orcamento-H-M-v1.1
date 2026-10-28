// Roda um script numa thread à parte (worker_threads) e devolve a PRIMEIRA
// mensagem que ele mandar (parentPort.postMessage). Usado pela leitura de
// DWG/DXF (services/analiseCad, services/tarefasCad) e pelo modelo 3D
// (services/modelo3d): ler um desenho grande leva segundos de CPU e, na thread
// principal, travaria o sistema inteiro para os outros usuários.
//
// Semáforo GLOBAL: no máximo MAX_SIMULTANEOS workers ao mesmo tempo, somando
// todos os usos; o resto espera numa fila (ordem de chegada). Cada worker pode
// usar até 1–2 GB de memória: sem o limite, cinco envios de DWG ao mesmo tempo
// esgotavam a RAM do servidor.
//
// Erros: o tempo-limite (contado a partir do início da execução, não da espera
// na fila) rejeita com `codigo = 'TEMPO_ESGOTADO'` e encerra a thread; erro
// dentro do worker rejeita com o erro original; thread que termina sem mandar
// mensagem (falta de memória, process.exit) rejeita com `codigo = 'SEM_RESPOSTA'`.
// Quem chama traduz para a mensagem da sua tela.
const { Worker } = require('worker_threads');

const MAX_SIMULTANEOS = 2;
let ativos = 0;
const fila = [];

function liberar() {
  ativos--;
  const proximo = fila.shift();
  if (proximo) proximo();
}

function reservar() {
  if (ativos < MAX_SIMULTANEOS) { ativos++; return Promise.resolve(); }
  return new Promise((ok) => fila.push(() => { ativos++; ok(); }));
}

function executarNoWorker(caminhoDoScript, dados, { tempoLimiteMs = 180 * 1000, memoriaMb = 1024 } = {}) {
  return reservar().then(() => new Promise((ok, falha) => {
    let resolvido = false;
    let liberado = false;
    const soltar = () => { if (!liberado) { liberado = true; liberar(); } };
    let w;
    try {
      w = new Worker(caminhoDoScript, { workerData: dados, resourceLimits: { maxOldGenerationSizeMb: memoriaMb } });
    } catch (e) {
      soltar();
      falha(e);
      return;
    }
    const terminar = (fn, valor) => {
      if (resolvido) return;
      resolvido = true;
      clearTimeout(relogio);
      fn(valor);
      // a vaga só volta para a fila quando a thread de fato saiu ('exit')
      w.terminate().catch(() => {});
    };
    const relogio = setTimeout(() => {
      terminar(falha, Object.assign(new Error(`a tarefa passou de ${Math.round(tempoLimiteMs / 1000)} s`), { codigo: 'TEMPO_ESGOTADO' }));
    }, tempoLimiteMs);
    w.once('message', (m) => terminar(ok, m));
    w.once('error', (e) => terminar(falha, e));
    w.once('exit', (codigo) => {
      terminar(falha, Object.assign(new Error(`a thread terminou sem resposta (código ${codigo})`), { codigo: 'SEM_RESPOSTA' }));
      soltar();
    });
  }));
}

// para os testes: quantos rodam e quantos esperam
const estadoDoSemaforo = () => ({ ativos, naFila: fila.length, maximo: MAX_SIMULTANEOS });

module.exports = { executarNoWorker, estadoDoSemaforo, MAX_SIMULTANEOS };
