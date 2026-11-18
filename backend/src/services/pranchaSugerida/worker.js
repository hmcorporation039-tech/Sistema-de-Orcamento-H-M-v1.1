// Prancha DXF/PDF de um pavimento com o projeto sugerido (versão 2.46) numa thread à parte: ler a arquitetura grande
// leva segundos de CPU (a paróquia: ~10 s) e travaria o sistema para todos. Entrada (workerData): { dxf, pavimento,
// dispositivos, trechos, notas, carimbo }. Saída: { ok, dxf, svg, quantitativo, pavimento } ou { ok: false, erro }.
const path = require('path');
const { parentPort, workerData } = require('worker_threads');
const { CAD } = require('../../config/caminhos');

try {
  const { lerArquitetura } = require(path.join(CAD, 'arquitetura.js'));
  const { pranchaDoPavimento } = require(path.join(CAD, 'pranchaSugerida.js'));
  const w = workerData;
  const arquitetura = lerArquitetura(w.dxf);
  const r = pranchaDoPavimento({ arquitetura, pavimento: w.pavimento || '', dispositivos: w.dispositivos || [], trechos: w.trechos || [], notas: w.notas || [], carimbo: w.carimbo || {} });
  parentPort.postMessage({ ok: true, ...r });
} catch (err) {
  parentPort.postMessage({ ok: false, erro: err.message });
}
