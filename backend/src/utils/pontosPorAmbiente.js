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
const { areaDaLinha, RE_NAO_NOME_INSTALACAO } = require('./projetoParser');
const { carimbo } = require('./leitoresTabelaProjeto');

const RE_RUIDO_TITULO = /(prancha|folha|formato|escala|revis[ãa]o|rev\.|raio|curva|tubo|bitola|norma|detalhe|corte|refer[êe]ncia|autor|layout|altera[çc][ãa]o|\d{2}\/\d{2}\/\d{4})/i;
// começo de uma linha de área ("A=", "A:", "ÁREA ="): encerra o nome da sala acima
const RE_INICIO_AREA = /^(A|[ÁA]REA)\s*[=:]/i;

// Mesmo código ("CAM18", "R5") repetido na mesma folha: é o MESMO ponto só se as
// duas ocorrências estão a menos de ~1 m uma da outra no desenho (rótulo
// duplicado, "A5/R5" + "R5" colados). Mais longe, ou em outra folha, são pontos
// diferentes com número repetido — antes todos contavam uma vez só (câmeras 75
// no lugar de 77; R1…R10 + R1…R8 de dois pavimentos davam 10 e não 18).
// Com a escala da folha, 1 m vira pontos do PDF (1 pt = 25,4/72 mm no papel).
const DISTANCIA_MESMO_PONTO_M = 1;
const ptPorMetro = (escala) => (1000 / escala) * (72 / 25.4);
// Sem escala: 28 pt = 1 cm no papel = 1 m em 1:100 e 0,5 m em 1:50 (escalas de
// planta de instalações). Dois pontos distintos quase nunca ficam a menos de 1 cm
// no papel — o próprio símbolo tem 3 a 5 mm —, e um rótulo duplicado fica colado.
const LIMIAR_SEM_ESCALA_PT = 28;

const MAIOR_NUMERO_PLAUSIVEL = 500;

// tipo de ponto -> prefixo do código no desenho (mesmos usados em projetoParser.js). A câmera aceita também
// "CAM-01", "CAM_01" e "CAM 01" (escritórios que separam o número): antes só "CAM01" contava. Rede e antena
// continuam sem separador ("R-1"/"A-1" costumam ser revisão, corte, eixo)
const TIPOS = [['cftv', 'CAM[-_ ]?'], ['rede', 'R'], ['antena', 'A']];
// nome de sala: cada parte até ~3 linhas acima da anterior (em pontos, na folha
// como se vê: origem no topo, y para baixo, rotação da página aplicada)
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
// `opcoes.escalaPorPagina` (Map página → denominador, ex. 50 para 1:50): a escala
// já lida pelo leitor vetorial; sem ela, vale a do texto da própria folha.
//
// Devolve { porAmbiente, codigos }:
//   porAmbiente — [{ ambiente, cftv, rede, antena }] (o formato de sempre);
//   codigos — por tipo (cftv, rede, antena): { ocorrencias, total (pontos pela
//     posição), totalUnicos (números únicos, o total antigo), juntadas (rótulos
//     repetidos a menos de ~1 m, contados uma vez), repetidasDistantes: [{ numero,
//     pontos, paginas }] } e `limiares` [{ pagina, escala, limiar_pt }].
async function lerPontosDoPdf(buffer, { maxPaginas = MAX_PAGINAS, carregarPdfjs = carregarPdfjsPadrao, paginasIgnoradas = null, regioesPorPagina = null, escalaPorPagina = null } = {}) {
  const vazio = { porAmbiente: [], codigos: null };
  let pdfjsLib;
  try {
    // pdfjs-dist só existe como ESM nesta versão — import() dinâmico dentro
    // de um módulo CommonJS funciona normalmente no Node.
    pdfjsLib = await carregarPdfjs();
  } catch {
    return vazio; // se não conseguir carregar por algum motivo, só fica sem essa distribuição — não trava a análise
  }

  let doc;
  try {
    doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), disableWorker: true, isEvalSupported: false }).promise;
  } catch {
    return vazio;
  }

  // o documento é SEMPRE destruído no fim (antes ficava aberto: memória do
  // pdfjs presa a cada análise até o coletor de lixo, e nada liberava as páginas)
  try {
    return await contarPorAmbiente(doc, maxPaginas, paginasIgnoradas, regioesPorPagina, escalaPorPagina);
  } finally {
    await Promise.resolve(doc.destroy?.()).catch(() => {});
  }
}

// Formato de sempre (lista por ambiente). A contagem por posição vai junto em
// `.codigos` — propriedade NÃO enumerável: quem só itera a lista, compara ou
// grava em JSON não vê diferença; quem precisa do total corrigido lê
// `resultado.codigos` (ver projetoParser.comRepeticoesPorPosicao).
async function calcularPontosPorAmbiente(buffer, opcoes = {}) {
  const { porAmbiente, codigos } = await lerPontosDoPdf(buffer, opcoes);
  return Object.defineProperty(porAmbiente, 'codigos', { value: codigos, enumerable: false });
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

async function contarPorAmbiente(doc, maxPaginas, paginasIgnoradas, regioesPorPagina, escalaPorPagina) {
  const porAmbiente = new Map(); // nome -> { cftv, rede, antena }
  // pontos já vistos por tipo+número: [{ pagina, membros: [{x, y}] }] — um grupo por ponto físico
  const grupos = new Map();
  const ocorrencias = { cftv: 0, rede: 0, antena: 0 };
  const juntadas = { cftv: 0, rede: 0, antena: 0 };
  const limiares = [];
  const ultima = Math.min(doc.numPages, maxPaginas);
  if (doc.numPages > ultima) console.warn(`[pontosPorAmbiente] PDF com ${doc.numPages} páginas: lidas só as ${ultima} primeiras`);

  for (let n = 1; n <= ultima; n++) {
    if (paginasIgnoradas?.has(n)) continue;
    let items;
    let textoDaFolha = '';
    let page = null;
    try {
      page = await doc.getPage(n);
      const content = await page.getTextContent();
      // posição na folha COMO SE VÊ (origem no topo, y para baixo, rotação da
      // página aplicada): folha com /Rotate 270 tem o "acima" no eixo x do PDF,
      // e o nome "SALA DE / HEMODIÁLISE 1" saía cortado ("HEMODIÁLISE 1")
      const vp = page.getViewport({ scale: 1 });
      items = content.items.map(it => { const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]); return { str: it.str, x, y }; });
      // escala lida da folha inteira (o carimbo pode cair numa região "carimbo")
      textoDaFolha = items.map(it => it.str).join('\n');
      const regioes = regioesPorPagina?.get(n);
      if (regioes?.length) {
        // regiões em coordenadas da página com origem no topo (as do leitor vetorial)
        const naPlanta = filtroDaFolha(regioes);
        items = items.filter(it => naPlanta(it.x, it.y));
      }
    } catch {
      continue; // página que falhar não impede as demais
    } finally {
      try { page?.cleanup?.(); } catch { /* sem importância */ }
    }

    // distância em pontos do PDF abaixo da qual o mesmo código é o mesmo ponto
    const escala = Number(escalaPorPagina?.get(n)) || Number((carimbo(textoDaFolha).escala || '').split(':')[1]) || null;
    const limiar = escala ? ptPorMetro(escala) * DISTANCIA_MESMO_PONTO_M : LIMIAR_SEM_ESCALA_PT;
    limiares.push({ pagina: n, escala, limiar_pt: Math.round(limiar * 10) / 10 });

    // Ambientes da página: mesmo padrão "nome (até 3 partes) + linha de área" já
    // usado em extrairAmbientes (projetoParser.js — "A=", "A:", "ÁREA", m² isolado),
    // mas usando os itens de
    // texto com posição em vez do texto linear — pulando itens vazios
    // (marcadores de quebra de linha que o pdfjs inclui) e descartando texto
    // de legenda/carimbo (revisão, autor, formato...) que por coincidência de
    // ordem no PDF acabaria "colado" no nome do ambiente.
    // A parte do nome tem de estar PERTO da linha de área (logo acima ou ao lado):
    // a ordem no PDF não é a ordem na folha — "SALA DE REUNIOES" e "ESC. 1:50" de
    // outro canto entravam no nome ("SALA DE REUNIOES ESC. 1:50 SALA", 29/10/2026).
    // (y da folha cresce para BAIXO: "acima" = y menor)
    const perto = (p, a) => Math.abs(p.x - a.x) <= PERTO_X && p.y <= a.y + 2 && a.y - p.y <= PERTO_Y;
    const ambientes = [];
    items.forEach((it, i) => {
      if (areaDaLinha(it.str) == null) return;
      const partes = [];
      let j = i - 1, tentativas = 0;
      while (j >= 0 && partes.length < 3 && tentativas < 10) {
        const t = items[j].str.trim();
        tentativas++;
        if (RE_INICIO_AREA.test(t) || areaDaLinha(t) != null || RE_RUIDO_TITULO.test(t) || RE_NAO_NOME_INSTALACAO.test(t)) break;
        if (t && !perto(items[j], partes[0] || it)) break;
        if (t) partes.unshift(items[j]);
        j--;
      }
      if (partes.length === 0) return;
      const nome = partes.map(p => p.str.trim()).join(' ').trim();
      const posicao = partes[partes.length - 1]; // parte mais próxima da linha de área — a mais confiável espacialmente
      ambientes.push({ nome, x: posicao.x, y: posicao.y });
    });

    // Pontos da página: mesmos prefixos usados no resto do parser, com o
    // mesmo teto de plausibilidade (evita pegar "PRANCHA A1"/data como ponto).
    // Código repetido a menos de ~1 m (rótulo duplicado) conta uma vez; mais
    // longe é outro ponto com o mesmo número e conta de novo. Contados também
    // nas folhas sem ambiente (o total por código não depende da sala).
    const pontos = [];
    for (const it of items) {
      if (RE_RUIDO_TITULO.test(it.str)) continue;
      for (const [tipo, prefixo] of TIPOS) {
        for (const m of it.str.matchAll(new RegExp(`\\b${prefixo}(\\d{1,3})\\b`, 'g'))) {
          const numero = parseInt(m[1], 10);
          if (numero < 1 || numero > MAIOR_NUMERO_PLAUSIVEL) continue;
          ocorrencias[tipo]++;
          const chave = tipo + numero;
          const lista = grupos.get(chave) || [];
          const mesmo = lista.find(g => g.pagina === n && g.membros.some(q => Math.hypot(q.x - it.x, q.y - it.y) <= limiar));
          if (mesmo) { mesmo.membros.push({ x: it.x, y: it.y }); juntadas[tipo]++; continue; }
          lista.push({ pagina: n, membros: [{ x: it.x, y: it.y }] });
          grupos.set(chave, lista);
          pontos.push({ tipo, x: it.x, y: it.y });
        }
      }
    }
    if (ambientes.length === 0) continue;

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

  const codigos = { limiares };
  for (const [tipo] of TIPOS) {
    const meus = [...grupos.entries()].filter(([chave]) => chave.startsWith(tipo) && /^\d+$/.test(chave.slice(tipo.length)));
    const repetidasDistantes = meus.filter(([, l]) => l.length > 1)
      .map(([chave, l]) => ({ numero: Number(chave.slice(tipo.length)), pontos: l.length, paginas: [...new Set(l.map(g => g.pagina))] }))
      .sort((a, b) => a.numero - b.numero);
    codigos[tipo] = {
      ocorrencias: ocorrencias[tipo],
      total: meus.reduce((s, [, l]) => s + l.length, 0),
      totalUnicos: meus.length,
      juntadas: juntadas[tipo],
      repetidasDistantes,
    };
  }
  return { porAmbiente: [...porAmbiente.entries()].map(([ambiente, contagem]) => ({ ambiente, ...contagem })), codigos };
}

module.exports = { calcularPontosPorAmbiente, lerPontosDoPdf };
