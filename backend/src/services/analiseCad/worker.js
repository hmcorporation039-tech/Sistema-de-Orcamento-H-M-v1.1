// Leitura de DWG/DXF de projeto numa thread à parte (worker_threads): converter
// o DWG e percorrer um desenho de alguns MB leva segundos de CPU, que no
// processo principal travariam o sistema para os outros usuários.
// Entrada (workerData): { buffer, nome, reLayerLinha (fonte da regex) }
// Saída (postMessage): { ok, dxf, origem, versao, arquitetura, projeto } ou { ok: false, erro }
const path = require('path');
const { parentPort, workerData } = require('worker_threads');

const { CAD } = require('../../config/caminhos');

(async () => {
  try {
    const { textoDxfDoArquivo } = require(path.join(CAD, 'dwg.js'));
    const { lerArquitetura } = require(path.join(CAD, 'arquitetura.js'));
    const { lerProjetoDxf } = require(path.join(CAD, 'projetoDxf.js'));
    const { RE_TEXTO_CANDIDATO } = require('./medidasInfra');
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
        // o que o desenho é (planta × unifilar × quadro de cargas…) e as regiões que não
        // são planta, em metros (skills/_comum/cad/classificarPrancha.js)
        folha: arq.classificacao && {
          tipo: arq.classificacao.tipo, resumo: arq.classificacao.resumo, temPlanta: arq.classificacao.temPlanta, semPlanta: arq.classificacao.semPlanta,
          regioesFora: arq.classificacao.regioes.filter(r => ['diagrama', 'vista_quadro', 'quadro_cargas', 'carimbo'].includes(r.tipo)).map(r => r.caixa),
        },
      },
      projeto: {
        texto: projeto.texto, simbolos: projeto.simbolos, linhas: projeto.linhas, legenda: projeto.legenda, legendaItens: projeto.legendaItens,
        // textos com posição que podem dizer a medida da infraestrutura (medidasInfra.js);
        // só os candidatos: um DWG grande tem dezenas de milhares de textos
        textosMedida: projeto.textos.filter(t => RE_TEXTO_CANDIDATO.test(t.s)).map(({ s, x, y, h, layer }) => ({ s, x, y, h, layer })),
      },
    });
  } catch (err) {
    parentPort.postMessage({ ok: false, erro: err.message });
  }
})();
