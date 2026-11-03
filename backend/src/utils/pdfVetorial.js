// Leitura VETORIAL de prancha em PDF (exportada do AutoCAD/Revit): conta os
// símbolos e mede as linhas (eletrodutos, cabos, eletrocalhas) direto da
// geometria, sem OCR e sem IA.
//
// Como funciona:
//   1) percorre a lista de operadores do pdfjs acompanhando a matriz (CTM),
//      cores, espessura e tracejado — cada caminho vira uma caixa + comprimento;
//   2) caminhos pequenos que se tocam, da mesma cor, viram um "símbolo" (o CAD
//      exporta um círculo cheio como várias faixas: a união reconstrói o símbolo);
//   3) a LEGENDA dá o nome: cada símbolo/traço da legenda tem a descrição escrita
//      logo à direita. A amostra da legenda define a assinatura (cor + tamanho +
//      tipo) e as ocorrências fora da legenda são contadas; o traço da legenda
//      define o estilo de linha (cor + espessura + tracejado) e o comprimento total
//      desse estilo vira metros pela escala do carimbo (ESC. 1:50) — ou, na folha
//      com vistas em escalas diferentes, pela escala de cada vista (3c);
//   4) legenda em TABELA ("Símbolo | Fornecedor | Descrição | QTDE"): lida pelas
//      colunas do cabeçalho; a QTDE do projetista vai no item (qtde_projeto) (3b);
//   5) a leitura roda numa thread à parte, com tempo-limite por página (5).
// Limites: símbolo desenhado só com linhas da mesma cor dos fios pode juntar
// com o fio; linha tracejada "explodida" em traços soma só os traços (sem os
// vazios). Os números são para conferência — não substituem a lista de materiais.
//
// Organização (Fase 7, só estrutura — o código de cada passo é o mesmo de antes): este arquivo
// fica com a entrada (lerPdfVetorial), os limites de tempo/memória e o resumo da folha; os passos
// estão na pasta pdfVetorial/: pagina.js (1), simbolos.js (2), legenda.js (3), tabelaLegenda.js (3b),
// escala.js (carimbo e 3c), analise.js (4) e tempo.js (tempo-limite).

const { pdfjs, lerPagina } = require('./pdfVetorial/pagina');
const { erroDeTempo } = require('./pdfVetorial/tempo');
const { simbolos, uniaoBusca } = require('./pdfVetorial/simbolos');
const { textoAoLado, regioesLegenda } = require('./pdfVetorial/legenda');
const { tabelasDeLegenda } = require('./pdfVetorial/tabelaLegenda');
const { escalaDoCarimbo, escalasDaFolha, rotulosDeEscala, escalaEscrita } = require('./pdfVetorial/escala');
const { analisarGeometria } = require('./pdfVetorial/analise');
const { escalaDeReserva } = require('./escalaDaPlanta');

// ── 5) Limites: TEMPO, não número de traços ─────────────────────────────────
// Antes, página com mais de 50 mil traços não era lida: 6 de 10 PDFs reais
// (110–250 mil traços) ficavam sem contagem (29/10/2026). Agora a leitura roda
// numa thread à parte (pdfVetorialWorker.js, pela fila global de
// services/executarNoWorker.js: no máximo 2 leituras pesadas ao mesmo tempo,
// memória limitada) e cada página tem um tempo-limite; a página que passa dele
// volta com `aviso` e `pulada: { motivo: 'tempo' }`, sem itens — contagem pela
// metade não é dada como contagem. O teto de traços fica só como proteção de
// memória (uma página de 250 mil traços usa ~1 GB).
const MAX_CAMINHOS_PAGINA = 500000;
const TEMPO_PAGINA_MS = 60 * 1000;
const TEMPO_TOTAL_MS = 150 * 1000;
const MEMORIA_WORKER_MB = 2048;
const seg = (ms) => Math.round(ms / 1000);

// PDF (buffer) → por página: itens da legenda com quantidade (símbolos) e
// metros (linhas). `paginas`: limita (padrão: até `maxPaginas`, 10). PDF só com
// imagem → vazio. Página pulada ou que falhe na análise volta com `aviso` (e sem
// itens) em vez de derrubar as outras; `pulada.motivo`: 'tempo' (passou do
// tempo-limite da página), 'tempo_total' (o tempo do arquivo acabou antes dela),
// 'tracos' (acima do teto de memória), 'memoria' (a thread estourou a memória),
// 'limite_paginas' (páginas além de `maxPaginas`: uma entrada só, `pagina: null`).
// Cada página volta também com `folha` (utils/classificarPranchaPdf.js: planta,
// diagrama unifilar, quadro de cargas…) e `ms` (tempo da página). Página sem
// planta (só unifilar, quadro, tabela) não é contada (`ignorada`); na folha
// mista, a contagem é só fora do unifilar, da vista do quadro, da tabela e do carimbo.
// Opções: escala, maxPaginas, maxCaminhos, tempoPaginaMs, tempoLimiteMs (do
// arquivo todo), emThread (padrão true; false = no próprio processo, usado pela thread).
async function lerPdfVetorial(buffer, opcoes = {}) {
  if (opcoes.emThread === false) return lerPdfVetorialAqui(buffer, opcoes);
  const total = opcoes.tempoLimiteMs ?? TEMPO_TOTAL_MS;
  const { executarNoWorker } = require('../services/executarNoWorker');
  let m;
  try {
    m = await executarNoWorker(require('path').join(__dirname, 'pdfVetorialWorker.js'),
      { buffer, opcoes: { ...opcoes, emThread: false } },
      // a thread respeita o tempo por conta própria; o limite daqui é a rede de segurança
      { tempoLimiteMs: total + 30 * 1000, memoriaMb: MEMORIA_WORKER_MB });
  } catch (e) {
    if (e.codigo === 'TEMPO_ESGOTADO') return [{ pagina: null, caminhos: null, itens: [], legenda: null, escala: null, aviso: `a leitura do desenho passou de ${seg(total + 30000)} s e foi interrompida — contagem pelo desenho não feita, conferir na planta`, pulada: { motivo: 'tempo', limite_s: seg(total + 30000) } }];
    if (e.codigo === 'SEM_RESPOSTA') return [{ pagina: null, caminhos: null, itens: [], legenda: null, escala: null, aviso: `a leitura do desenho estourou a memória reservada (${MEMORIA_WORKER_MB} MB) — contagem pelo desenho não feita, conferir na planta`, pulada: { motivo: 'memoria', limite_mb: MEMORIA_WORKER_MB } }];
    throw e;
  }
  if (!m?.ok) throw new Error(m?.erro || 'leitura vetorial sem resposta');
  return m.paginas;
}

async function lerPdfVetorialAqui(buffer, { paginas, escala, nomeArquivo = '', maxPaginas = 10, maxCaminhos = MAX_CAMINHOS_PAGINA, tempoPaginaMs = TEMPO_PAGINA_MS, tempoLimiteMs = TEMPO_TOTAL_MS } = {}) {
  const prazoTotal = Date.now() + tempoLimiteMs;
  const { getDocument, OPS } = await pdfjs();
  const doc = await getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, verbosity: 0, disableFontFace: true }).promise;
  try {
    const lista = paginas || Array.from({ length: Math.min(doc.numPages, maxPaginas) }, (_, i) => i + 1);
    const saida = [];
    for (const n of lista) {
      const vazio = { itens: [], legenda: null, escala: null };
      if (Date.now() > prazoTotal) {
        saida.push({ pagina: n, caminhos: null, ...vazio, aviso: `não lida: o tempo de leitura do arquivo (${seg(tempoLimiteMs)} s) acabou antes desta página — conferir na planta`, pulada: { motivo: 'tempo_total', limite_s: seg(tempoLimiteMs) } });
        continue;
      }
      const t0 = Date.now();
      const prazo = Math.min(t0 + tempoPaginaMs, prazoTotal);
      let pag = null, nCaminhos = null, folha = null, reserva = null;
      let r = { ...vazio };
      try {
        pag = await doc.getPage(n);
        // conta antes de ler: página acima do teto nem monta a geometria (memória por traço)
        let ops = await pag.getOperatorList();
        nCaminhos = 0;
        for (const f of ops.fnArray) if (f === OPS.constructPath) nCaminhos++;
        if (nCaminhos > maxCaminhos) {
          r.aviso = `página com ${nCaminhos.toLocaleString('pt-BR')} traços (limite ${maxCaminhos.toLocaleString('pt-BR')}, proteção de memória): contagem pelo desenho não feita — conferir na planta`;
          r.pulada = { motivo: 'tracos', limite: maxCaminhos };
        } else {
          if (Date.now() > prazo) throw erroDeTempo();
          const geo = await lerPagina(pag, OPS, { geometria: true, ops, prazo });
          ops = null; // a lista de operadores (a maior parte da memória) já pode ser liberada
          nCaminhos = geo.caminhos.length;
          if (geo.caminhos.length) {
            try { folha = resumoDaFolha(classificarPaginaPdf(geo, { escala })); } catch (e) { console.warn(`[pdfVetorial] classificação da página ${n} falhou:`, e.message); }
            // escala de reserva (CAD-09) — sem a informada e sem escala escrita na folha: nome do arquivo e, só dentro
            // das regiões de PLANTA, portas e cotas (o arco do disjuntor no unifilar dava 1:500). Medida antes de
            // liberar os trechos. A classificação não muda por ela (fica a de sempre).
            if (!escala && !escalaEscrita(geo.textos) && !folha?.semPlanta) {
              const regioesPlanta = (folha?.regioes || []).filter(rg => rg.tipo === 'planta').map(rg => rg.caixa);
              try { reserva = escalaDeReserva({ nomeArquivo, geo, regioesPlanta }); } catch (e) { console.warn(`[pdfVetorial] escala de reserva da página ${n} falhou:`, e.message); }
            }
            for (const c of geo.caminhos) delete c.subs; // a contagem não usa os trechos: libera a memória
            if (Date.now() > prazo) throw erroDeTempo();
          }
          if (folha?.semPlanta) {
            r.ignorada = `${folha.resumo} — sem contagem de símbolos (não é planta)`;
          } else if (geo.caminhos.length) {
            try {
              r = analisarGeometria(geo, { escala, escalaReserva: reserva, regioesFora: folha?.regioesFora || [], regioesFolha: folha?.regioes || [], prazo });
              if (r.avisoEscala) r.aviso = r.avisoEscala;
            } catch (e) {
              if (e.codigo === 'TEMPO_ESGOTADO') throw e;
              r.aviso = `falha ao ler o desenho (${e.message}) — conferir na planta`;
            }
          }
        }
      } catch (e) {
        if (e.codigo !== 'TEMPO_ESGOTADO') throw e;
        r = {
          ...vazio,
          aviso: `página pesada${nCaminhos ? ` (${nCaminhos.toLocaleString('pt-BR')} traços)` : ''}: a leitura passou do tempo-limite de ${seg(prazo - t0)} s — contagem pelo desenho não feita, conferir na planta`,
          pulada: { motivo: 'tempo', limite_s: seg(prazo - t0) },
        };
      }
      saida.push({ pagina: n, caminhos: nCaminhos, ms: Date.now() - t0, ...r, ...(folha ? { folha: { tipo: folha.tipo, resumo: folha.resumo, temPlanta: folha.temPlanta, semPlanta: folha.semPlanta, misto: folha.misto, regioes: folha.regioes } } : {}) });
      if (pag) pag.cleanup();
    }
    // páginas além do limite: não somem caladas
    if (!paginas && doc.numPages > maxPaginas) {
      const fora = Array.from({ length: doc.numPages - maxPaginas }, (_, i) => maxPaginas + 1 + i);
      saida.push({
        pagina: null, caminhos: null, itens: [], legenda: null, escala: null,
        aviso: `${fora.length === 1 ? `página ${fora[0]} não lida` : `páginas ${fora[0]} a ${fora[fora.length - 1]} não lidas`} (limite de ${maxPaginas} páginas por arquivo) — conferir na planta`,
        pulada: { motivo: 'limite_paginas', paginas: fora, limite: maxPaginas },
      });
    }
    return saida;
  } finally {
    await doc.destroy();
  }
}

// classificação → o que a análise guarda: tipo, resumo e as regiões a não contar
// DETALHE (ampliação, detalhe de instalação) também fica fora da contagem, mas só
// quando a folha tem planta: o detalhe repete pontos da planta ou numera os itens
// em círculos — prancha real de CFTV contava 11 caixas de passagem, 6 delas os
// "①②③" das especificações do detalhe (29/10/2026). Folha só de detalhe
// continua contada (não há outra vista para contar).
const CONTAGEM_FORA = new Set(['diagrama', 'vista_quadro', 'quadro_cargas', 'carimbo']);
function resumoDaFolha(c) {
  const temVistaDePlanta = c.regioes.some(r => r.tipo === 'planta');
  return {
    tipo: c.tipo, resumo: c.resumo, temPlanta: c.temPlanta, semPlanta: c.semPlanta, misto: c.misto,
    regioesFora: c.regioes.filter(r => CONTAGEM_FORA.has(r.tipo) || (temVistaDePlanta && r.tipo === 'detalhe')).map(r => r.caixa),
    // tipo e caixa de cada região: os pontos por ambiente da folha mista usam
    // (utils/pontosPorAmbiente.js — o que cai fora da planta não conta)
    regioes: c.regioes.map(r => ({ tipo: r.tipo, caixa: r.caixa })),
  };
}
// carregada na hora (utils/classificarPranchaPdf.js usa escalaDoCarimbo daqui)
const classificarPaginaPdf = (...a) => require('./classificarPranchaPdf').classificarPaginaPdf(...a);

module.exports = { lerPdfVetorial, analisarGeometria, simbolos, escalaDoCarimbo, escalasDaFolha, MAX_CAMINHOS_PAGINA, TEMPO_PAGINA_MS, TEMPO_TOTAL_MS, paraTestes: { textoAoLado, regioesLegenda, lerPagina, pdfjs, uniaoBusca, tabelasDeLegenda, rotulosDeEscala, resumoDaFolha } };
