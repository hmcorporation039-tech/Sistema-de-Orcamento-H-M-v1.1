// Leitura de DWG/DXF de projeto numa thread à parte (worker_threads): converter
// o DWG e percorrer um desenho de alguns MB leva segundos de CPU, que no
// processo principal travariam o sistema para os outros usuários.
// Entrada (workerData): { buffer, nome, reLayerLinha (fonte da regex) }
// Saída (postMessage): { ok, dxf, origem, versao, arquitetura, projeto } ou { ok: false, erro }
const path = require('path');
const { parentPort, workerData } = require('worker_threads');

const CAD = path.join(__dirname, '..', '..', '..', '..', 'skills', '_comum', 'cad');

(async () => {
  try {
    const { textoDxfDoArquivo } = require(path.join(CAD, 'dwg.js'));
    const { lerArquitetura } = require(path.join(CAD, 'arquitetura.js'));
    const { lerProjetoDxf } = require(path.join(CAD, 'projetoDxf.js'));
    const w = workerData;
    const { texto, origem, versao } = await textoDxfDoArquivo(Buffer.from(w.buffer), w.nome);
    let arq = null;
    try { arq = lerArquitetura(texto); } catch { /* sem arquitetura legível: o projeto ainda pode ter texto e blocos */ }
    const fator = arq?.fatorUnidade || 1;
    const projeto = lerProjetoDxf(texto, { fator, reLayerLinha: new RegExp(w.reLayerLinha, 'i') });
    parentPort.postMessage({
      ok: true, dxf: texto, origem, versao: versao || null,
      arquitetura: arq && {
        fatorUnidade: fator, portas: arq.portas.length, layers: arq.layers.length,
        ambientes: arq.ambientes.map(a => ({ nome: a.nome, area_m2: a.area_m2, perimetro_m: a.perimetro_m, poligono: a.poligono, origem: a.origem })),
      },
      projeto: { texto: projeto.texto, simbolos: projeto.simbolos, linhas: projeto.linhas, legenda: projeto.legenda },
    });
  } catch (err) {
    parentPort.postMessage({ ok: false, erro: err.message });
  }
})();
