// Distribuição aproximada de pontos (câmera/rede/antena) por ambiente do
// projeto — usa a posição real (x,y) de cada texto na página do PDF (via
// pdfjs-dist diretamente, não a extração linear de texto usada no resto do
// parser) pra achar, por proximidade geométrica, qual ambiente cada ponto
// está mais perto. É exatamente o dado que a planilha de referência da
// empresa já traz (aba "Pontos por Ambiente": Ambiente | Rede | TV/Antena |
// Câmeras), só que lá é montado à mão olhando o desenho.
//
// Testado contra essa planilha de referência (Orcamento_Definitivo_CRH.xlsx):
// bate exatamente em boa parte dos ambientes testados, fica a 1 ponto de
// diferença em vários outros, e erra mais em casos raros (ambientes pequenos
// perto de um vizinho maior "roubam" o ponto). Os TOTAIS gerais (soma de
// todos os ambientes) sempre batem — confirmado com os mesmos 69 pontos de
// rede e 24 de antena da extração por código já validada. Só a distribuição
// por sala é aproximada, e por isso é sempre exibida com aviso.
//
// Por que é aproximado: o texto do PDF não guarda qual ponto "pertence" a
// qual sala — só a posição de cada texto na página. Um ponto perto da
// fronteira entre duas salas, ou num corredor sem rótulo de área por perto,
// pode cair no ambiente vizinho errado.
const RE_RUIDO_TITULO = /(prancha|folha|formato|escala|revis[ãa]o|rev\.|raio|curva|tubo|bitola|norma|detalhe|corte|refer[êe]ncia|autor|layout|altera[çc][ãa]o|\d{2}\/\d{2}\/\d{4})/i;

const MAIOR_NUMERO_PLAUSIVEL = 500;

// tipo de ponto -> prefixo do código no desenho (mesmos usados em projetoParser.js)
const TIPOS = [['cftv', 'CAM'], ['rede', 'R'], ['antena', 'A']];
// nome de sala: cada parte até ~3 linhas acima da anterior (em pontos do PDF, y para cima)
const PERTO_X = 150;
const PERTO_Y = 40;

// Páginas lidas por arquivo: a análise roda no processo do servidor e um PDF de
// centenas de páginas (caderno inteiro) segurava memória e CPU à toa. As
// pranchas de pontos ficam nas primeiras; a distribuição já é aproximada.
const MAX_PAGINAS = 30;

const carregarPdfjsPadrao = () => import('pdfjs-dist/legacy/build/pdf.mjs');

// `opcoes.carregarPdfjs` existe só para o teste trocar o pdfjs por um falso.
// `opcoes.paginasIgnoradas` (Set de números de página): folhas que não são planta
// (diagrama unifilar, quadro de cargas — utils/classificarPranchaPdf.js); um "R1"
// ou "A2" do quadro não pode cair na sala mais próxima.
// `opcoes.regioesPorPagina` (Map página → regiões da folha, mesmo formato de
// classificarFolha: { tipo, caixa: [x0, y0, x1, y1] } em pontos, origem no topo):
// folha MISTA (planta + quadro de cargas/unifilar ao lado) — o texto que cai numa
// região que não é planta fica fora (antes a página inteira contava).
async function calcularPontosPorAmbiente(buffer, { maxPaginas = MAX_PAGINAS, carregarPdfjs = carregarPdfjsPadrao, paginasIgnoradas = null, regioesPorPagina = null } = {}) {
  let pdfjsLib;
  try {
    // pdfjs-dist só existe como ESM nesta versão — import() dinâmico dentro
    // de um módulo CommonJS funciona normalmente no Node.
    pdfjsLib = await carregarPdfjs();
  } catch {
    return []; // se não conseguir carregar por algum motivo, só fica sem essa distribuição — não trava a análise
  }

  let doc;
  try {
    doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), disableWorker: true, isEvalSupported: false }).promise;
  } catch {
    return [];
  }

  // o documento é SEMPRE destruído no fim (antes ficava aberto: memória do
  // pdfjs presa a cada análise até o coletor de lixo, e nada liberava as páginas)
  try {
    return await contarPorAmbiente(doc, maxPaginas, paginasIgnoradas, regioesPorPagina);
  } finally {
    await Promise.resolve(doc.destroy?.()).catch(() => {});
  }
}

const dentroDe = (caixas, x, y) => caixas.some(c => x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3]);
// tipos que são claramente outra coisa (classificarPrancha.NAO_PLANTA); região
// "desconhecido" fica (planta pouco típica não perde os pontos)
const NAO_PLANTA = new Set(['diagrama', 'vista_quadro', 'quadro_cargas', 'legenda', 'detalhe', 'corte_fachada', 'carimbo']);
// fora = numa região que não é planta e em nenhuma de planta (região de planta vence)
function filtroDaFolha(regioes) {
  const planta = regioes.filter(r => r.tipo === 'planta').map(r => r.caixa);
  const outras = regioes.filter(r => NAO_PLANTA.has(r.tipo)).map(r => r.caixa);
  return (x, y) => !(dentroDe(outras, x, y) && !dentroDe(planta, x, y));
}

async function contarPorAmbiente(doc, maxPaginas, paginasIgnoradas, regioesPorPagina) {
  const porAmbiente = new Map(); // nome -> { cftv, rede, antena }
  const ultima = Math.min(doc.numPages, maxPaginas);
  if (doc.numPages > ultima) console.warn(`[pontosPorAmbiente] PDF com ${doc.numPages} páginas: lidas só as ${ultima} primeiras`);

  for (let n = 1; n <= ultima; n++) {
    if (paginasIgnoradas?.has(n)) continue;
    let items;
    let page = null;
    try {
      page = await doc.getPage(n);
      const content = await page.getTextContent();
      items = content.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
      const regioes = regioesPorPagina?.get(n);
      if (regioes?.length) {
        // regiões em coordenadas da página com origem no topo (as do leitor vetorial)
        const vp = page.getViewport({ scale: 1 });
        const naPlanta = filtroDaFolha(regioes);
        items = items.filter(it => { const [vx, vy] = vp.convertToViewportPoint(it.x, it.y); return naPlanta(vx, vy); });
      }
    } catch {
      continue; // página que falhar não impede as demais
    } finally {
      try { page?.cleanup?.(); } catch { /* sem importância */ }
    }

    // Ambientes da página: mesmo padrão "nome (até 3 partes) + A=NN,NNm²" já
    // usado em extrairAmbientes (projetoParser.js), mas usando os itens de
    // texto com posição em vez do texto linear — pulando itens vazios
    // (marcadores de quebra de linha que o pdfjs inclui) e descartando texto
    // de legenda/carimbo (revisão, autor, formato...) que por coincidência de
    // ordem no PDF acabaria "colado" no nome do ambiente.
    // A parte do nome tem de estar PERTO da linha de área (logo acima ou ao lado):
    // a ordem no PDF não é a ordem na folha — "SALA DE REUNIOES" e "ESC. 1:50" de
    // outro canto entravam no nome ("SALA DE REUNIOES ESC. 1:50 SALA", 29/10/2026).
    const perto = (p, a) => Math.abs(p.x - a.x) <= PERTO_X && p.y >= a.y - 2 && p.y - a.y <= PERTO_Y;
    const ambientes = [];
    items.forEach((it, i) => {
      if (!/^A=\s*[\d.,]+\s*m[²2]\s*$/i.test(it.str.trim())) return;
      const partes = [];
      let j = i - 1, tentativas = 0;
      while (j >= 0 && partes.length < 3 && tentativas < 10) {
        const t = items[j].str.trim();
        tentativas++;
        if (/^A=/i.test(t) || RE_RUIDO_TITULO.test(t)) break;
        if (t && !perto(items[j], partes[0] || it)) break;
        if (t) partes.unshift(items[j]);
        j--;
      }
      if (partes.length === 0) return;
      const nome = partes.map(p => p.str.trim()).join(' ').trim();
      const posicao = partes[partes.length - 1]; // parte mais próxima da linha de área — a mais confiável espacialmente
      ambientes.push({ nome, x: posicao.x, y: posicao.y });
    });
    if (ambientes.length === 0) continue;

    // Pontos da página: mesmos prefixos usados no resto do parser, com o
    // mesmo teto de plausibilidade (evita pegar "PRANCHA A1"/data como ponto).
    // Deduplicados por número — um código repetido por engano no desenho
    // conta só uma vez, pra não inflar a sala onde caiu a duplicata.
    const vistos = new Set();
    const pontos = [];
    for (const it of items) {
      if (RE_RUIDO_TITULO.test(it.str)) continue;
      for (const [tipo, prefixo] of TIPOS) {
        for (const m of it.str.matchAll(new RegExp(`\\b${prefixo}(\\d{1,3})\\b`, 'g'))) {
          const numero = parseInt(m[1], 10);
          if (numero < 1 || numero > MAIOR_NUMERO_PLAUSIVEL) continue;
          const chave = tipo + numero;
          if (vistos.has(chave)) continue;
          vistos.add(chave);
          pontos.push({ tipo, x: it.x, y: it.y });
        }
      }
    }

    for (const p of pontos) {
      let melhor = null, melhorDist = Infinity;
      for (const a of ambientes) {
        const d = Math.hypot(a.x - p.x, a.y - p.y);
        if (d < melhorDist) { melhorDist = d; melhor = a; }
      }
      if (!melhor) continue;
      const atual = porAmbiente.get(melhor.nome) || { cftv: 0, rede: 0, antena: 0 };
      atual[p.tipo]++;
      porAmbiente.set(melhor.nome, atual);
    }
  }

  return [...porAmbiente.entries()].map(([ambiente, contagem]) => ({ ambiente, ...contagem }));
}

module.exports = { calcularPontosPorAmbiente };
