// Leitura vetorial de PDF (utils/pdfVetorial.js) numa thread à parte
// (worker_threads), como a leitura de DWG/DXF (services/analiseCad/worker.js):
// prancha real tem 110–250 mil traços e a leitura leva segundos de CPU, que no
// processo principal travariam o sistema para os outros usuários. Quem chama é
// lerPdfVetorial (pela fila global de services/executarNoWorker.js).
// Entrada (workerData): { buffer, opcoes } — as opções de lerPdfVetorial.
// Saída (postMessage): { ok: true, paginas } ou { ok: false, erro }.
//
// O pdfjs carrega o módulo NATIVO @napi-rs/canvas (só para desenhar a página,
// que aqui não se faz). Módulo nativo numa thread que é encerrada (terminate,
// depois da resposta) derruba o processo inteiro com falha de segmentação
// (Node 24, 29/10/2026): nesta thread ele é bloqueado, e as três classes que o
// pdfjs pede dele ganham versões vazias — leitura de operadores e textos não usa.
const Module = require('module');
const carregar = Module._load;
Module._load = function (pedido, ...resto) {
  if (pedido === '@napi-rs/canvas') throw new Error('módulo nativo de desenho desligado na thread de leitura');
  return carregar.call(this, pedido, ...resto);
};
globalThis.DOMMatrix ||= class DOMMatrix { constructor() { Object.assign(this, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }); } };
globalThis.ImageData ||= class ImageData {};
globalThis.Path2D ||= class Path2D {};

const { parentPort, workerData } = require('worker_threads');
const { lerPdfVetorial, paraTestes } = require('./pdfVetorial');

(async () => {
  try {
    // o aviso "Cannot load @napi-rs/canvas" do pdfjs é esperado aqui: não vai para o log
    const avisar = console.warn;
    console.warn = (...a) => { if (!/@napi-rs\/canvas/.test(String(a[0]))) avisar(...a); };
    try { await paraTestes.pdfjs(); } finally { console.warn = avisar; }
    const paginas = await lerPdfVetorial(Buffer.from(workerData.buffer), { ...workerData.opcoes, emThread: false });
    parentPort.postMessage({ ok: true, paginas });
  } catch (err) {
    parentPort.postMessage({ ok: false, erro: err.message });
  }
})();
