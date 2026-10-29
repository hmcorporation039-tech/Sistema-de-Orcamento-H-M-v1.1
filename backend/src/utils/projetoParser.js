const { quadrosDeCargas, quadroDeCargasPresente, totaisQuadro, listaMateriais, carimbo, detectarDisciplinas } = require('./leitoresTabelaProjeto');
// texto do PDF: leitura única em utils/leitorPdf.js
const { textoDoPdf: extrairTexto, textoEPaginasDoPdf } = require('./leitorPdf');

// Ambientes/salas do projeto: o CAD exporta cada rótulo "NOME DA SALA" em uma
// ou mais linhas, seguido de uma linha "A= NN,NNm²" com a área. Junta até 3
// linhas anteriores como nome (o próprio nome às vezes quebra em várias linhas
// no export), parando se bater em outra área ou linha em branco.
// Linhas que não são nome de ambiente: carimbo, cotas, alturas, lotação
// ("40 ALUNOS"), textos de nota — viravam pedaço do nome ("SALA 01 PROPRIETÁRIO:…").
const RE_NAO_NOME = /:|\d{2}\/\d{2}\/\d{2,4}|^\d+([.,]\d+)?\s*(m|cm|mm)?$|^(H|PD|PE|NA|NPA)\s*=|^(ESCALA|PRANCHA|FOLHA|REVIS|DESENHO|RESPONS|PROPRIET|CREA|CLIENTE|ENDERE)|^(DATA|PROJETO|OBRA)$|^\d+\s+(ALUNOS|PESSOAS|LUGARES)$/i;
// Também não é nome de sala (29/10/2026, planta com "A: 11,84 m²"): letra solta
// de circuito/comando ("M", "G G", "I J") e texto de legenda ou de equipamento
// ("Tomada para exaustor", "Interruptor e tomada") que o export põe logo acima
// do nome — viravam "M J Quarto 1", "Tomada para exaustor … Quarto 1".
const RE_NAO_NOME_INSTALACAO = /^([A-Z](\s+|$))+$|^(TOMADAS?|INTERRUPTOR(ES)?|ESPELHO|PONTO( DE)? (LUZ|FOR[ÇC]A|REDE)|LUMIN[ÁA]RIAS?|ELETRODUTO|ELETROCALHA|CAIXA DE PASSAGEM|QUADRO DE|CIRCUITO|DISJUNTOR|DETECTOR|ACIONADOR|SENSOR|C[ÂA]MERA|PLAFON|PERFIL DE LED|SPOT|PENDENTE)\b/i;
const naoEhNome = (linha) => RE_NAO_NOME.test(linha) || RE_NAO_NOME_INSTALACAO.test(linha);

// Linha de área do ambiente: "A= 12,50m²", "A = 12,50 m²", "A: 11,84 m2" (o "2"
// sobrescrito vem como texto à parte no pdfjs: "A: 11,84 m" + "2"), "ÁREA = 18,54 m²",
// "ÁREA: 6,20 m²" — e a área sozinha, "6,63 m²" (aí o m² é obrigatório). Antes só
// "A=" valia: "Quarto 2 / A: 11,84 m²" dava 0 ambientes (revisão de 29/10/2026).
const RE_LINHA_AREA = /^(?:(?:A|[ÁA]REA)\s*[=:]\s*([\d.,]+)\s*m(?:[²2])?|([\d.,]+)\s*m[²2])\s*$/i;
// começo de outra linha de área (encerra o nome que vem acima)
const RE_INICIO_AREA = /^(A|[ÁA]REA)\s*[=:]/i;
// "12,50" → 12,5; "1.250,00" → 1250; "12.5" → 12,5 (ponto decimal); "1.250" → 1250 (milhar)
function numeroDaArea(s) {
  const t = String(s);
  if (/,/.test(t)) return parseFloat(t.replace(/\./g, '').replace(',', '.'));
  if (/^\d+\.\d{1,2}$/.test(t)) return parseFloat(t);
  return parseFloat(t.replace(/\./g, ''));
}
// área de uma linha (ou null)
function areaDaLinha(linha) {
  const m = String(linha || '').trim().match(RE_LINHA_AREA);
  if (!m) return null;
  const area = numeroDaArea(m[1] || m[2]);
  return Number.isFinite(area) && area > 0 ? area : null;
}

function extrairAmbientes(texto) {
  const linhas = String(texto || '').split('\n');
  const ambientes = [];

  for (let i = 0; i < linhas.length; i++) {
    const area = areaDaLinha(linhas[i]);
    if (area == null) continue;

    const partesNome = [];
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      // linha da tabela de revisões ("01 17/04/2025 ALTERAÇÃO… O AUTOR") encerra o nome
      if (/\d{2}\/\d{2}\/\d{2,4}/.test(linhas[j])) break;
      // "40 ALUNOS \tSALA 102": rótulos vizinhos na mesma linha — vale o último
      const linha = linhas[j].split('\t').pop().trim();
      if (!linha || RE_INICIO_AREA.test(linha) || areaDaLinha(linha) != null || naoEhNome(linha) || linha.length > 60) break;
      partesNome.unshift(linha);
    }
    const nome = partesNome.join(' ').trim();
    if (!nome) continue;

    ambientes.push({ nome, area_m2: area });
  }

  return ambientes;
}

// Extrai todas as ocorrências de um código tipo "PREFIXOnn" (ex.: CAM1,
// R23, A15) e resume: quantas ocorrências, quantos números únicos,
// duplicatas (mesmo número aparecendo mais de uma vez — comum quando o
// projetista repete um código por engano em pontos físicos diferentes) e
// números faltando na sequência (furos de numeração). Usado tanto para
// câmeras (CAMx) quanto para pontos de rede (Rx) e antena/TV (Ax).
// Termos que aparecem antes de um "código" e mostram que NÃO é ponto de
// projeto: prancha/folha em formato A1..A4, raio de curvatura R25, revisão
// R00, bitola de tubo, escala. Testado com texto real de prancha, onde
// "PRANCHA A1 FORMATO A3 RAIO R25 CURVA R50 TUBO PVC R100" produzia 4 pontos
// de antena e 5 de rede que não existem — e esses números viravam quantidade
// orçada.
// Procurado em qualquer posição da janela anterior (e não só colado no
// código), porque na prática vem separado: "TUBO PVC R100", "FOLHA 02 A3".
const RE_CONTEXTO_FALSO = /(prancha|folha|formato|escala|revis[ãa]o|rev\.|raio|curva|tubo|bitola|norma|detalhe|corte|refer[êe]ncia)/i;

// Acima deste valor o número quase certamente não é um ponto de projeto
// (R2026 = ano, A4000 = cota). Sem o teto, um único "R100" solto fazia a
// lista de "faltando" ir de 1 a 99 — 95 pendências falsas no relatório.
const MAIOR_NUMERO_PLAUSIVEL = 500;

// Extrai todas as ocorrências de um código tipo "PREFIXOnn" (ex.: CAM1,
// R23, A15) e resume: quantas ocorrências, quantos números únicos,
// duplicatas (mesmo número aparecendo mais de uma vez — comum quando o
// projetista repete um código por engano em pontos físicos diferentes) e
// números faltando na sequência (furos de numeração). Usado tanto para
// câmeras (CAMx) quanto para pontos de rede (Rx) e antena/TV (Ax).
function extrairPontosPorCodigo(texto, prefixo) {
  const conteudo = String(texto || '');
  const regex = new RegExp(`\\b${prefixo}(\\d+)\\b`, 'g');

  const numeros = [];
  const descartados = [];
  for (const m of conteudo.matchAll(regex)) {
    const numero = parseInt(m[1], 10);
    // Zero não é ponto (R00 é revisão), e número alto demais é ano/cota/código.
    if (numero < 1 || numero > MAIOR_NUMERO_PLAUSIVEL) { descartados.push(m[0]); continue; }
    // Olha as ~14 letras antes da ocorrência pra descartar "PRANCHA A1" e afins.
    const antes = conteudo.slice(Math.max(0, m.index - 14), m.index);
    if (RE_CONTEXTO_FALSO.test(antes)) { descartados.push(m[0]); continue; }
    numeros.push(numero);
  }

  if (numeros.length === 0) {
    return { ocorrencias: 0, total: 0, totalUnicos: 0, unicas: [], repetidas: [], faltando: [], descartados };
  }

  const unicas = [...new Set(numeros)].sort((a, b) => a - b);
  const setUnicas = new Set(unicas);
  const repetidas = [...new Set(numeros.filter((n, i) => numeros.indexOf(n) !== i))].sort((a, b) => a - b);
  const max = unicas[unicas.length - 1];
  const faltando = [];
  for (let i = 1; i <= max; i++) if (!setUnicas.has(i)) faltando.push(i);

  return {
    ocorrencias: numeros.length,
    // só pelo texto não dá para saber se um código repetido é o mesmo ponto
    // escrito duas vezes ou dois pontos com o mesmo número: o total é o de
    // códigos únicos até a posição de cada um corrigir (comRepeticoesPorPosicao)
    total: unicas.length,
    totalUnicos: unicas.length,
    unicas,
    repetidas,
    faltando,
    descartados, // o que o filtro ignorou — útil para conferência
  };
}

// Corrige o total pelos códigos repetidos LONGE um do outro (posição no PDF —
// utils/pontosPorAmbiente.js, `codigos`): "CAM18" em dois pontos da planta a 4 m
// de distância são duas câmeras, e "R1…R10" no térreo e "R1…R8" no superior são
// 18 pontos, não 10. Repetição colada (mesmo ponto, rótulo duplicado) segue
// contando uma vez. `resumo` = extrairPontosPorCodigo; `posicional` =
// codigos.<tipo> de lerPontosDoPdf. Sem posições (DWG, PDF sem texto), nada muda.
// O total antigo fica em `totalUnicos` para o achado mostrar os dois números.
function comRepeticoesPorPosicao(resumo, posicional) {
  if (!resumo) return resumo;
  const base = { ...resumo, totalUnicos: resumo.totalUnicos ?? resumo.total };
  if (!posicional?.repetidasDistantes?.length) return base;
  // só números que o texto também aceitou (o filtro de contexto do texto vale)
  const aceitos = new Set(resumo.unicas || []);
  const distantes = posicional.repetidasDistantes.filter(r => aceitos.has(r.numero));
  const extras = distantes.reduce((s, r) => s + (r.pontos - 1), 0);
  return { ...base, total: base.totalUnicos + extras, repetidasDistantes: distantes };
}

// Códigos de câmera (ex.: CAM1, CAM76) — aparecem como texto direto no desenho
// de CFTV, um por marcação de câmera na planta.
function extrairCameras(texto) {
  return extrairPontosPorCodigo(texto, 'CAM');
}

// Códigos de ponto de rede (Rx) e antena/TV (Ax) — aparecem como texto direto
// no desenho de cabeamento estruturado (ex.: "A1/R1", depois "R25", "R69"
// isolados quando não há antena no mesmo ponto). Mesma lógica de detectar
// duplicatas/furos usada nas câmeras.
function extrairPontosRedeAntena(texto) {
  return {
    rede: extrairPontosPorCodigo(texto, 'R'),
    antena: extrairPontosPorCodigo(texto, 'A'),
  };
}

// Tabela de cabos (legenda tipo "CAT6  CABO PAR TRANÇADO NÃO BLINDADO
// CATEGORIA 6.") — sigla curta seguida da descrição completa na linha seguinte
// (ou logo após, no mesmo padrão de "SIGLA\tDESCRIÇÃO." usado nesses projetos).
function extrairTabelaCabos(texto) {
  const linhas = String(texto || '').split('\n').map(l => l.trim());
  const itens = [];
  // Sigla com dígito (CAT6, RG6) e ponto final opcional: a versão anterior
  // ([A-Z]{2,4} e ponto obrigatório) perdia justamente CAT6, RG6 e FO.
  const RE_SIGLA_DESC = /^([A-Z][A-Z0-9]{1,5})\s+(CABO\s+.+?)\.?\s*$/;

  for (const linha of linhas) {
    const m = linha.match(RE_SIGLA_DESC);
    if (m) itens.push({ sigla: m[1], descricao: m[2] });
  }
  return itens;
}

// Legenda de esquadrias (portas/janelas) é ARQUITETURA, não material da
// disciplina — caía como "material de iluminação" com quantidade. Fica
// separada (útil, por exemplo, para conferir sensores de abertura do alarme).
const RE_ESQUADRIA = /\b(porta|janela|esquadria|basculante|maxim-?ar|veneziana|vidro fixo|portão|caixilho)\b/i;

// Tabela quantitativa genérica — padrão "CÓDIGO - descrição... - N unidade(s);"
// usado em projetos desses escritórios pra listar esquadrias (portas/janelas) e,
// quando existir, quadros de carga/memoriais de outras disciplinas (ex.: um
// "quadro de cargas" de elétrica no mesmo formato). Achado real testando um
// projeto de iluminação (a legenda "PORTAS / JANELAS" vem exatamente assim:
// "PMA070 - Porta de giro de PVC... - 1 unidade;", "PMA080 - ... - 11
// unidades;"). Diferente de câmera/rede/antena (um código por ponto físico),
// aqui uma linha já traz a quantidade agregada como texto — não precisa contar
// ocorrências, só ler o número que já está escrito.
function extrairTabelaQuantitativa(texto) {
  const linhas = String(texto || '').split('\n').map(l => l.trim());
  const itens = [];
  const RE_ITEM_QUANTIFICADO = /^([A-Z0-9]{2,10})\s*-\s*(.+?)\s*-\s*(\d+)\s*unidades?\s*;?\s*$/;

  for (const linha of linhas) {
    const m = linha.match(RE_ITEM_QUANTIFICADO);
    if (m) itens.push({ codigo: m[1], descricao: m[2].trim(), quantidade: parseInt(m[3], 10) });
  }
  return itens;
}

// Nota: a lista de equipamentos/materiais técnicos (com código REF. de
// fabricante) não é extraída aqui por regex — testamos e o texto quebra de
// linha demais pra separar itens com confiança (descrições saíam cortadas
// ou coladas). Essa parte é feita pelo Gemini reformatando o texto já obtido
// abaixo (services/equipamentoExtratorIA.js) — validado como confiável porque é
// reformatação de texto já dado a ele, não leitura livre do PDF.

// `textoPorPagina`: o texto de cada folha, para a análise refazer os ambientes só
// com as folhas de planta (sem o quadro de cargas e o unifilar — 29/10/2026)
async function analisarProjeto(buffer, nomeArquivo) {
  const { texto, paginas } = await textoEPaginasDoPdf(buffer);
  return { ...analisarTexto(texto, nomeArquivo), textoPorPagina: paginas };
}

// Os leitores de texto, sobre o texto já extraído — do PDF ou remontado do
// DWG/DXF (services/analiseCad/index.js)
function analisarTexto(texto, nomeArquivo) {
  const quantitativa = extrairTabelaQuantitativa(texto);
  const quadros = quadrosDeCargas(texto);
  const quadroCargas = quadros.flatMap(q => q.circuitos);
  const listaMateriaisLida = listaMateriais(texto);
  return {
    arquivo: nomeArquivo,
    // PDF escaneado ou com todo o texto convertido em linhas (fonte SHX): sem
    // isso, a análise voltava vazia sem nenhum aviso
    semTexto: String(texto || '').replace(/\s|--\s*\d+\s+of\s+\d+\s*--/g, '').length < 80,
    ambientes: extrairAmbientes(texto),
    cameras: extrairCameras(texto),
    pontosRedeAntena: extrairPontosRedeAntena(texto),
    tabelaCabos: extrairTabelaCabos(texto),
    tabelaQuantitativa: quantitativa.filter(it => !RE_ESQUADRIA.test(it.descricao)),
    esquadrias: quantitativa.filter(it => RE_ESQUADRIA.test(it.descricao)),
    // todos os circuitos (lista plana, como antes); no quadro em colunas cada um
    // traz `quadro` (título "Quadro de cargas (X)") e `alimentador`
    quadroCargas,
    // os mesmos circuitos agrupados por quadro, com os totais de cada um
    quadrosDeCargas: quadros,
    // há quadro de cargas no arquivo e nenhum circuito foi lido: vira achado
    quadroCargasNaoLido: quadroCargas.length === 0 && quadroDeCargasPresente(texto),
    totaisQuadro: totaisQuadro(texto),
    listaMateriais: listaMateriaisLida,
    // quantidade "1.200" sem vírgula: milhar ou 1,2? (lida como 1,2 — conferir)
    quantidadesAmbiguas: listaMateriaisLida.filter(it => it.qtdAmbigua),
    carimbo: carimbo(texto),
    disciplinasDetectadas: detectarDisciplinas(texto),
    textoBruto: texto,
  };
}

module.exports = {
  analisarProjeto, analisarTexto, extrairTexto, extrairAmbientes,
  extrairTabelaCabos, comRepeticoesPorPosicao, areaDaLinha, RE_NAO_NOME_INSTALACAO,
};
