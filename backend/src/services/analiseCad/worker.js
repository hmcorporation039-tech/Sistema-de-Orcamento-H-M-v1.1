// Leitura de DWG/DXF de projeto numa thread à parte (worker_threads): converter
// o DWG e percorrer um desenho de alguns MB leva segundos de CPU, que no
// processo principal travariam o sistema para os outros usuários.
// Entrada (workerData): { buffer, nome, reLayerLinha (fonte da regex) }
//                         aprendidos (legenda de projetos anteriores: cad_simbolos_aprendidos)
//                         confirmados (tipos conferidos pelo engenheiro no mapa do CAD, desta análise)
//                         notasAprendidas (alturas que o escritório costuma escrever nas notas: cad_notas_aprendidas)
// Saída (postMessage): { ok, dxf, origem, versao, arquitetura, projeto, desenho, avisoUnidade } ou { ok: false, erro }
const path = require('path');
const { parentPort, workerData } = require('worker_threads');

const { CAD } = require('../../config/caminhos');
const { fundoDoMapa, regiaoDeInteresse } = require('./fundoDoMapa');
// regiões da folha que não são planta (skills/_comum/cad/classificarPrancha.js)
const REGIOES_FORA = ['diagrama', 'vista_quadro', 'quadro_cargas', 'carimbo'];

(async () => {
  try {
    const { textoDxfDoArquivo } = require(path.join(CAD, 'dwg.js'));
    const { lerArquitetura } = require(path.join(CAD, 'arquitetura.js'));
    const { lerProjetoDxf } = require(path.join(CAD, 'projetoDxf.js'));
    const { RE_TEXTO_CANDIDATO } = require('./medidasInfra');
    const { carimbo } = require('../../utils/leitoresTabelaProjeto');
    const { chaveEscritorio } = require('../../utils/escritorioDoProjeto');
    const w = workerData;
    const { texto, origem, versao } = await textoDxfDoArquivo(Buffer.from(w.buffer), w.nome);
    let arq = null;
    try { arq = lerArquitetura(texto); } catch { /* sem arquitetura legível: o projeto ainda pode ter texto e blocos */ }
    // sem arquitetura, a unidade sai do cabeçalho ($INSUNITS) — antes ficava 1 calado e o
    // desenho em mm dava os metros de eletroduto ×1000 no orçamento
    let avisoUnidade = null;
    let fator = arq?.fatorUnidade;
    if (!fator) {
      const ins = Number(/\$INSUNITS\s*\r?\n\s*70\s*\r?\n\s*(\d+)/.exec(texto)?.[1]);
      const UNIDADE = { 1: ['polegadas', 0.0254], 2: ['pés', 0.3048], 4: ['milímetros', 0.001], 5: ['centímetros', 0.01], 6: ['metros', 1] }[ins];
      fator = UNIDADE ? UNIDADE[1] : 1;
      avisoUnidade = UNIDADE
        ? `a unidade do desenho foi lida do cabeçalho do arquivo (${UNIDADE[0]}) — confira as metragens`
        : 'a unidade do desenho não pôde ser confirmada (sem arquitetura legível nem unidade no cabeçalho): metragens consideradas em metros — [CONFERIR]';
    }
    const projeto = lerProjetoDxf(texto, { fator, reLayerLinha: new RegExp(w.reLayerLinha, 'i') });
    // símbolos EXPLODIDOS (QiBuilder/AltoQi, PDF convertido): o mesmo leitor do 3D
    // (skills/_comum/cad/pontosDoDesenho.js) — pela layer, pela medida e pela LEGENDA da
    // prancha (tipo e altura), com o que o sistema já aprendeu de projetos anteriores
    let desenho = null;
    let escritorio = '';
    if (arq) {
      try {
        const { propostaDeMapa, aplicarMapa, aplicarConfirmacoes, origemDaLinha, legendaDoProjeto, notasDeAltura } = require(path.join(CAD, 'pontosDoDesenho.js'));
        // o escritório (responsável técnico do carimbo) escolhe quais notas aprendidas valem para este desenho
        try { escritorio = chaveEscritorio(carimbo(projeto.texto)); } catch { escritorio = ''; } // sem carimbo legível o mapa sai igual, só sem o costume do escritório
        const mapa = aplicarConfirmacoes(propostaDeMapa(arq, { aprendidos: w.aprendidos || [], notasAprendidas: w.notasAprendidas || [], escritorio }), w.confirmados || []);
        const { pontos } = aplicarMapa(arq, mapa);
        // circuito e retorno escritos junto de cada símbolo ("3", "a"): sugestão no mapa; vale para o
        // 3D só na linha conferida (skills/_comum/cad/circuitoDoDesenho.js — fase 1 do roteiro)
        let circuitosPorLinha = new Map();
        try { circuitosPorLinha = require(path.join(CAD, 'circuitoDoDesenho.js')).anotarCircuitos(pontos, projeto.textos).porLinha; } catch { /* a leitura do circuito não derruba o mapa */ }
        // o mapa vai junto (tela de confirmação): cada linha com a origem do tipo; trechos só com o resumo
        desenho = {
          pontos, legenda: legendaDoProjeto(arq), notas: notasDeAltura(arq), escritorio,
          mapa: {
            simbolos: mapa.simbolos.map((s, i) => ({ ...s, origem: origemDaLinha(s), ...(circuitosPorLinha.has(i) ? { circuitos_lidos: circuitosPorLinha.get(i) } : {}) })),
            trechos: mapa.trechos.map(({ layer, tipo, disciplina, comprimento_m }) => ({ layer, tipo, disciplina, comprimento_m })),
            // formas de símbolo além do limite de linhas do mapa: ditas no aviso, não somem caladas
            ...(mapa.aviso ? { aviso: mapa.aviso } : {}),
          },
        };
      } catch (e) { desenho = { pontos: [], legenda: [], erro: e.message }; }
    }
    parentPort.postMessage({
      ok: true, dxf: texto, origem, versao: versao || null, desenho, avisoUnidade,
      // desenho grande demais (skills/_comum/cad/arquitetura.js, MAX_ENTIDADES): blocos aninhados mais fundos ficaram fora
      detalheReduzido: arq?.detalheReduzido || null,
      arquitetura: arq && {
        fatorUnidade: fator, portas: arq.portas.length, layers: arq.layers.length,
        ambientes: arq.ambientes.map(a => ({ nome: a.nome, area_m2: a.area_m2, perimetro_m: a.perimetro_m, poligono: a.poligono, origem: a.origem })),
        // o que o desenho é (planta × unifilar × quadro de cargas…) e as regiões que não
        // são planta, em metros (skills/_comum/cad/classificarPrancha.js)
        folha: arq.classificacao && {
          tipo: arq.classificacao.tipo, resumo: arq.classificacao.resumo, temPlanta: arq.classificacao.temPlanta, semPlanta: arq.classificacao.semPlanta,
          regioesFora: arq.classificacao.regioes.filter(r => REGIOES_FORA.includes(r.tipo)).map(r => r.caixa),
        },
        // traços da planta para o fundo da tela do mapa do CAD (./fundoDoMapa.js); sem ele a tela fica só com os pontos
        fundo: (() => {
          try {
            const fora = (arq.classificacao?.regioes || []).filter(r => REGIOES_FORA.includes(r.tipo)).map(r => r.caixa);
            const naPlanta = ([x, y]) => !fora.some(c => x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3]);
            const centros = (desenho?.mapa?.simbolos || []).flatMap(s => s.centros || []).filter(naPlanta);
            return fundoDoMapa(arq.referencia, fora, regiaoDeInteresse(centros, arq.ambientes.map(a => a.poligono || [])));
          } catch { return null; }
        })(),
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
