const { PDFParse } = require('pdf-parse');

async function extrairTexto(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const { text } = await parser.getText();
    return text;
  } finally {
    await parser.destroy();
  }
}

// Ambientes/salas do projeto: o CAD exporta cada rótulo "NOME DA SALA" em uma
// ou mais linhas, seguido de uma linha "A= NN,NNm²" com a área. Junta até 3
// linhas anteriores como nome (o próprio nome às vezes quebra em várias linhas
// no export), parando se bater em outra área ou linha em branco.
function extrairAmbientes(texto) {
  const linhas = String(texto || '').split('\n');
  const ambientes = [];

  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(/^A=\s*([\d.,]+)\s*m[²2]\s*$/i);
    if (!m) continue;

    const partesNome = [];
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      const linha = linhas[j].trim();
      if (!linha || /^A=/i.test(linha)) break;
      partesNome.unshift(linha);
    }
    const nome = partesNome.join(' ').trim();
    if (!nome) continue;

    ambientes.push({
      nome,
      area_m2: parseFloat(m[1].replace(/\./g, '').replace(',', '.')),
    });
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
    return { ocorrencias: 0, total: 0, unicas: [], repetidas: [], faltando: [], descartados };
  }

  const unicas = [...new Set(numeros)].sort((a, b) => a - b);
  const setUnicas = new Set(unicas);
  const repetidas = [...new Set(numeros.filter((n, i) => numeros.indexOf(n) !== i))].sort((a, b) => a - b);
  const max = unicas[unicas.length - 1];
  const faltando = [];
  for (let i = 1; i <= max; i++) if (!setUnicas.has(i)) faltando.push(i);

  return {
    ocorrencias: numeros.length,
    total: unicas.length,
    unicas,
    repetidas,
    faltando,
    descartados, // o que o filtro ignorou — útil para conferência
  };
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
  const RE_SIGLA_DESC = /^([A-Z]{2,4})\s+(CABO\s+.+\.)\s*$/;

  for (const linha of linhas) {
    const m = linha.match(RE_SIGLA_DESC);
    if (m) itens.push({ sigla: m[1], descricao: m[2] });
  }
  return itens;
}

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
// abaixo (utils/equipamentoExtratorIA.js) — validado como confiável porque é
// reformatação de texto já dado a ele, não leitura livre do PDF.

async function analisarProjeto(buffer, nomeArquivo) {
  const texto = await extrairTexto(buffer);
  return {
    arquivo: nomeArquivo,
    ambientes: extrairAmbientes(texto),
    cameras: extrairCameras(texto),
    pontosRedeAntena: extrairPontosRedeAntena(texto),
    tabelaCabos: extrairTabelaCabos(texto),
    tabelaQuantitativa: extrairTabelaQuantitativa(texto),
    textoBruto: texto,
  };
}

module.exports = {
  analisarProjeto, extrairTexto, extrairAmbientes, extrairCameras, extrairPontosRedeAntena, extrairPontosPorCodigo,
  extrairTabelaCabos, extrairTabelaQuantitativa,
};
