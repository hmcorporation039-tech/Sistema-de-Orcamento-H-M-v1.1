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
function extrairPontosPorCodigo(texto, prefixo) {
  const regex = new RegExp(`\\b${prefixo}(\\d+)\\b`, 'g');
  const numeros = [...String(texto || '').matchAll(regex)].map(m => parseInt(m[1], 10));
  if (numeros.length === 0) {
    return { ocorrencias: 0, total: 0, unicas: [], repetidas: [], faltando: [] };
  }

  const unicas = [...new Set(numeros)].sort((a, b) => a - b);
  const repetidas = [...new Set(numeros.filter((n, i) => numeros.indexOf(n) !== i))].sort((a, b) => a - b);
  const max = Math.max(...numeros);
  const faltando = [];
  for (let i = 1; i <= max; i++) if (!unicas.includes(i)) faltando.push(i);

  return {
    ocorrencias: numeros.length,
    total: unicas.length,
    unicas,
    repetidas,
    faltando,
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
    textoBruto: texto,
  };
}

module.exports = {
  analisarProjeto, extrairTexto, extrairAmbientes, extrairCameras, extrairPontosRedeAntena, extrairTabelaCabos,
};
