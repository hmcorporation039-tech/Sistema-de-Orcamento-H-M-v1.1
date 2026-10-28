// Worker de teste (testes/robustezSeguranca.test.js): espera `ms` e responde
// quando começou e quando terminou; `sair` encerra sem responder.
const { parentPort, workerData } = require('worker_threads');

const inicio = Date.now();
if (workerData.sair) process.exit(3);
setTimeout(() => parentPort.postMessage({ ok: true, id: workerData.id, inicio, fim: Date.now() }), workerData.ms || 0);
