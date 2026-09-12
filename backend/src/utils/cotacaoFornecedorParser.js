const { PDFParse } = require('pdf-parse');

function paraNumeroBR(s) {
  if (!s) return null;
  const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

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

function extrairModeloAdm(linhas) {
  const itens = [];

  for (let i = 0; i < linhas.length; i++) {
    if (!RE_INICIO_ITEM.test(linhas[i])) continue;

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
  const doModelo = extrairModeloAdm(linhas);
  if (doModelo.length > 0) return doModelo;
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
