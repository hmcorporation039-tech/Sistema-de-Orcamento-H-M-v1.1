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

async function calcularPontosPorAmbiente(buffer) {
  let pdfjsLib;
  try {
    // pdfjs-dist só existe como ESM nesta versão — import() dinâmico dentro
    // de um módulo CommonJS funciona normalmente no Node.
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  } catch {
    return []; // se não conseguir carregar por algum motivo, só fica sem essa distribuição — não trava a análise
  }

  let doc;
  try {
    doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), disableWorker: true, isEvalSupported: false }).promise;
  } catch {
    return [];
  }

  const porAmbiente = new Map(); // nome -> { cftv, rede, antena }

  for (let n = 1; n <= doc.numPages; n++) {
    let items;
    try {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      items = content.items.map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] }));
    } catch {
      continue; // página que falhar não impede as demais
    }

    // Ambientes da página: mesmo padrão "nome (até 3 partes) + A=NN,NNm²" já
    // usado em extrairAmbientes (projetoParser.js), mas usando os itens de
    // texto com posição em vez do texto linear — pulando itens vazios
    // (marcadores de quebra de linha que o pdfjs inclui) e descartando texto
    // de legenda/carimbo (revisão, autor, formato...) que por coincidência de
    // ordem no PDF acabaria "colado" no nome do ambiente.
    const ambientes = [];
    items.forEach((it, i) => {
      if (!/^A=\s*[\d.,]+\s*m[²2]\s*$/i.test(it.str.trim())) return;
      const partes = [];
      let j = i - 1, tentativas = 0;
      while (j >= 0 && partes.length < 3 && tentativas < 10) {
        const t = items[j].str.trim();
        tentativas++;
        if (/^A=/i.test(t) || RE_RUIDO_TITULO.test(t)) break;
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
