const { PDFParse } = require('pdf-parse');
const { paraNumeroBR } = require('./numeroBR');


// A última palavra da descrição costuma ser a marca (ex.: "... 56127/022
// TRAMONTINA"), pelo menos no layout do sistema "ADM" — só separa quando é
// uma palavra só em maiúsculas (sem dígitos), pra não arrancar um código de
// produto (que sempre tem números/barra) achando que é marca.
function separarMarca(linha) {
  const partes = linha.trim().split(/\s+/);
  const ultima = partes[partes.length - 1] || '';
  if (partes.length > 1 && /^[A-ZÀ-Ý]{2,}$/.test(ultima)) {
    return { descricao: partes.slice(0, -1).join(' '), marca: ultima };
  }
  return { descricao: linha.trim(), marca: '' };
}

// Layout do sistema "ADM" (usado pela DF Atacadista, e possivelmente por outros
// fornecedores com o mesmo software de orçamento) — cada item vira um bloco de
// 4 linhas de dados seguido pelos rótulos fixos dos campos (nessa ordem, por
// causa de como o PDF é gerado):
//   1 462                              <- nº do item + código do produto
//   BOX RETO 3/4 C/R 56127/022 TRAMONTINA   <- descrição (+ marca no fim)
//   UND	2,000                        <- unidade + quantidade
//   3,84 7,68                          <- preço unitário + valor total
//   Produto:
//   Descrição: Marca:
//   Quantidade: Unidade:
//   Preço unit.: Valor total:
//   Item:
//   NCM: 76090000
//   ST: 0,00
const RE_INICIO_ITEM = /^(\d+)\s+([\d.]+)$/;
const RE_UNIDADE_QTD = /^([A-Za-zÀ-ÿ]{1,10})\s+([\d.,]+)$/;
const RE_PRECOS = /^([\d.,]+)\s+([\d.,]+)$/;

function extrairModeloAdmBloco(linhas) {
  const itens = [];

  for (let i = 0; i < linhas.length; i++) {
    const inicioMatch = linhas[i].match(RE_INICIO_ITEM);
    if (!inicioMatch) continue;

    const descricaoLinha = linhas[i + 1] || '';
    const qtdMatch = (linhas[i + 2] || '').match(RE_UNIDADE_QTD);
    const precosMatch = (linhas[i + 3] || '').match(RE_PRECOS);
    // "Produto:" logo depois confirma que é mesmo um bloco de item do modelo ADM
    if (!qtdMatch || !precosMatch || linhas[i + 4] !== 'Produto:') continue;

    let ncm = null;
    for (let j = i + 5; j < Math.min(i + 12, linhas.length); j++) {
      if (RE_INICIO_ITEM.test(linhas[j])) break; // já é o próximo item, não achou NCM
      const mNcm = linhas[j].match(/^NCM:\s*(\d+)/);
      if (mNcm) { ncm = mNcm[1]; break; }
    }

    const { descricao, marca } = separarMarca(descricaoLinha);
    if (descricao.length < 3) continue;

    itens.push({
      codigo: inicioMatch[2],
      descricao,
      marca,
      unidade: qtdMatch[1].toLowerCase(),
      quantidade: paraNumeroBR(qtdMatch[2]),
      preco: paraNumeroBR(precosMatch[1]),
      ncm,
    });

    i += 4; // pula o resto do bloco já lido
  }

  return itens;
}

// Segunda variação do mesmo sistema "ADM" (usada pela SOL Atacadista): uma
// linha de tabela por item, agrupada por "ambiente" (ex.: REDES, ALARME,
// CFTV — cabeçalhos que só servem pra organizar visualmente, ignorados aqui).
//   1 805CABO U/UTP CAT 5E 24 AWGX4P AZUL (CX 305MT) CX 3,000 9,000 816,4100 2.449,23 85444900
//   |item| |código| |descrição....................| |un| |qtd| |peso| |preço unit.| |total| |ncm|
// O código vem com ponto de milhar (ex. "7.425"), por isso a captura inclui
// grupos "(?:\.\d+)*" — sem isso, "7.425RACK..." vira código "7" + lixo.
//
// A cola entre campos (código-descrição, total-NCM) varia de orçamento pra
// orçamento — confirmado comparando duas cotações reais da mesma SOL
// Atacadista em datas diferentes: numa, código e descrição vêm colados
// ("805CABO...") e total/NCM vêm com espaço ("2.449,23 85444900"); noutra,
// código e descrição vêm com espaço ("7.425 RACK...") e total/NCM colados
// sem espaço ("1.810,6694031000"). Por isso todo separador aqui é opcional
// (\s*, não \s+) e o NCM fica fixo em 8 dígitos (padrão oficial do NCM
// brasileiro) — sem isso, "1.810,6694031000" quebraria errado entre total e
// NCM (o valor "colado" é ambíguo sem saber que o NCM tem sempre 8 dígitos).
const RE_LINHA_GRADE_ADM = /^(?:\([^)]{0,3}\)\s*)?\d+\s+(\d+(?:\.\d+)*)\s*([^\s\d].*?)\s+([A-Za-zÀ-ÿ]{1,4})\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s*(\d{8})\s*$/;

function extrairModeloAdmGrade(linhas) {
  const itens = [];
  for (const linha of linhas) {
    const m = linha.match(RE_LINHA_GRADE_ADM);
    if (!m) continue;

    const [, codigo, descricaoBruta, unidade, quantidade, , precoUnit, , ncm] = m;
    const descricao = descricaoBruta.replace(/\s{2,}/g, ' ').trim();
    if (descricao.length < 3) continue;

    itens.push({
      codigo,
      descricao,
      unidade: unidade.toLowerCase(),
      quantidade: paraNumeroBR(quantidade),
      preco: paraNumeroBR(precoUnit),
      ncm,
    });
  }
  return itens;
}

// Layout "PEDIDO DE VENDA" (visto num orçamento da Dispel Eletrônica) — outro
// sistema, diferente do "ADM". Cada item é uma linha dividida em 3 blocos por
// tabulação: [código, quantidade, valor bruto] \t [descrição, desconto,
// acréscimo] \t [preço unitário, valor líquido]. Ex.:
//   070530 25,00 142,50	CABO PARALELO BIC. 2X2,50MM POMPEIA 0,00 0,00	5,70 142,50
// O preço unitário real é o 1º número do último bloco (confirmado batendo
// quantidade × preço unitário = valor líquido) — o valor bruto do 1º bloco
// é o total da linha, não o unitário (só coincidem quando quantidade = 1).
const RE_LINHA_PEDIDO_VENDA = /^(\d+)\s+([\d.,]+)\s+([\d.,]+)\t(.+?)\s+([\d.,]+)\s+([\d.,]+)\t([\d.,]+)\s+([\d.,]+)\s*$/;

function extrairModeloPedidoVenda(linhas) {
  const itens = [];
  for (const linha of linhas) {
    const m = linha.match(RE_LINHA_PEDIDO_VENDA);
    if (!m) continue;

    const [, codigo, quantidade, , descricaoBruta, , , precoUnit] = m;
    const descricao = descricaoBruta.replace(/\s{2,}/g, ' ').trim();
    if (descricao.length < 3) continue;

    itens.push({
      codigo,
      descricao,
      unidade: 'un',
      quantidade: paraNumeroBR(quantidade),
      preco: paraNumeroBR(precoUnit),
    });
  }
  return itens;
}

// Layout "Orçamento" da BAND Tecnologia Comércio — outro sistema ainda. Cada
// item é: código, descrição, quantidade, valor total, unidade e, por fim, o
// preço unitário — nessa ordem estranha porque o texto extraído do PDF junta
// o "Valor total" antes do "Valor unit." mesmo a coluna visual sendo o
// contrário, e às vezes um "." solto (observação vazia) quebra a linha antes
// do preço unitário. Confirmado batendo quantidade × preço unitário = valor
// total. Como o "." pode estar em linha própria, aqui a extração roda sobre
// o texto inteiro normalizado (linhas juntas por espaço, "." solto removido),
// não linha a linha como os outros modelos.
const RE_LINHA_BAND = /(\d{1,6})\s+([A-ZÀ-Ÿ][^\t\n]+?)\s+(\d{1,4})\s+R\$\s*([\d.,]+)\s+([A-Za-z]{1,4})\s+R\$\s*([\d.,]+)/g;

function extrairModeloBand(texto) {
  const normalizado = String(texto || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && l !== '.')
    .join(' ');

  const itens = [];
  for (const m of normalizado.matchAll(RE_LINHA_BAND)) {
    const [, codigo, descricaoBruta, quantidade, , unidade, precoUnit] = m;
    const descricao = descricaoBruta.replace(/\s{2,}/g, ' ').trim();
    if (descricao.length < 3) continue;

    itens.push({
      codigo,
      descricao,
      unidade: unidade.toLowerCase(),
      quantidade: paraNumeroBR(quantidade),
      preco: paraNumeroBR(precoUnit),
    });
  }
  return itens;
}

// Unidades comuns em orçamento/cotação de material — usado só pelo modo
// genérico, pra reconhecer a coluna de unidade dentro de uma linha de texto.
const UNIDADES = /^(un|und|unid|pç|pc|peça|peças|cx|caixa|m|mt|metro|metros|kg|cj|conj|conjunto|par|pares|vb|verba|rl|rolo|pt|ponto|pontos|l|litro)\.?$/i;

const LINHA_ITEM_GENERICA = /^\s*(?:\d+(?:\.\d+)*\s+)?(.{3,}?)\s+(\d+(?:[.,]\d+)?)\s+([A-Za-zÀ-ÿçÇ]{1,8}\.?)\s+R?\$?\s*([\d.,]+)(?:\s+R?\$?\s*([\d.,]+))?\s*$/;
const LINHA_IGNORAR = /^(item|descri[çc][ãa]o|c[óo]digo|qtd|quant|unid|un\.|vlr|valor|total|subtotal|sub-total|p[áa]gina)\b/i;

// Modo genérico (fallback): tenta reconhecer uma linha de tabela "descrição
// qtd un valor [valor total]" numa única linha. Layout livre — cada
// fornecedor monta o PDF do jeito dele, então isso é só uma tentativa quando
// o layout conhecido (ADM) não bate.
function extrairGenerico(linhas) {
  const itens = [];
  for (const linha of linhas) {
    if (!linha || LINHA_IGNORAR.test(linha)) continue;
    const m = linha.match(LINHA_ITEM_GENERICA);
    if (!m) continue;

    const [, descricaoBruta, quantidade, unidade, valorA, valorB] = m;
    if (!UNIDADES.test(unidade)) continue;

    const descricao = descricaoBruta.replace(/\s{2,}/g, ' ').trim();
    if (descricao.length < 3) continue;

    const nums = [paraNumeroBR(valorA), paraNumeroBR(valorB)].filter(n => n != null && n > 0);
    if (nums.length === 0) continue;
    const preco = nums.length > 1 ? Math.min(...nums) : nums[0];

    itens.push({ descricao, quantidade: paraNumeroBR(quantidade), unidade: unidade.replace(/\.$/, ''), preco });
  }
  return itens;
}

function extrairDoTexto(texto) {
  const linhas = String(texto || '').split('\n').map(l => l.trim()).filter(Boolean);

  const doBloco = extrairModeloAdmBloco(linhas);
  if (doBloco.length > 0) return doBloco;

  const daGrade = extrairModeloAdmGrade(linhas);
  if (daGrade.length > 0) return daGrade;

  const doPedidoVenda = extrairModeloPedidoVenda(linhas);
  if (doPedidoVenda.length > 0) return doPedidoVenda;

  const daBand = extrairModeloBand(texto);
  if (daBand.length > 0) return daBand;

  return extrairGenerico(linhas);
}

async function extrairCotacaoPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const { text } = await parser.getText();
    return extrairDoTexto(text);
  } finally {
    await parser.destroy();
  }
}

module.exports = { extrairCotacaoPdf, extrairDoTexto };
