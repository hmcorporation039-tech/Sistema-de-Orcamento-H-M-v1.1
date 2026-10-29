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

// Layout da ECO Automação Industrial (distribuidor Siemens). A descrição vem
// em 1 a 4 linhas (a última termina com o código Siemens e a marca) e o item
// fecha numa linha com quantidade, preços, código ECO, nº do item, NCM, ICMS%,
// IPI% e prazo — às vezes a descrição curta vem colada no começo dessa linha:
//   MINIDISJUNTOR TRIPOLAR 16A CURVA C
//   5SY4316-7 SIEMENS
//   2 R$ 754,19 R$ 1.508,38<TAB>P019635<TAB>1 8536.20.00 4 6,5 15 Dias
// O preço unitário vem SEM IPI (o rodapé soma "Vlr. Cotação" + IPI = "Vlr.
// Produtos"); como a H&M paga o IPI, o custo gravado é unitário × (1 + IPI%).
// Os itens só começam depois do cabeçalho "Código<TAB>It NCM ICMS% IPI%", que
// se repete a cada página — o acúmulo de descrição zera nele e em "Página:".
const RE_CABECALHO_ECO = /It\s+NCM\s+ICMS%\s+IPI%/;
const RE_LINHA_ECO = /^(?:(.*\S)\s+)?(\d+(?:,\d+)?)\s+R\$\s*([\d.,]+)\s+R\$\s*([\d.,]+)\t(\S+)\t(\d+)\s+(\d{4})\.(\d{2})\.(\d{2})\s+([\d,]+)\s+([\d,]+)\b/;

function extrairModeloEco(texto) {
  const linhas = String(texto || '').split('\n').map(l => l.trim());
  if (!linhas.some(l => RE_CABECALHO_ECO.test(l))) return [];
  const itens = [];
  let dentro = false;
  let buffer = [];
  for (const linha of linhas) {
    if (RE_CABECALHO_ECO.test(linha)) { dentro = true; buffer = []; continue; }
    if (!dentro) continue;
    if (/^Página:|^-- \d+ of \d+ --$|^Observações:/.test(linha)) { buffer = []; if (/^Observações:/.test(linha)) dentro = false; continue; }
    const m = linha.match(RE_LINHA_ECO);
    if (!m) {
      if (linha.length > 2) buffer = [...buffer, linha].slice(-5); // letras soltas (texto vertical) não entram
      continue;
    }
    const [, prefixo, qtdTxt, unitTxt, totalTxt, codigo, , n1, n2, n3, , ipiTxt] = m;
    const quantidade = paraNumeroBR(qtdTxt);
    const unitario = paraNumeroBR(unitTxt);
    const total = paraNumeroBR(totalTxt);
    const { descricao, marca } = separarMarca([...buffer, prefixo || ''].join(' ').replace(/\s{2,}/g, ' '));
    buffer = [];
    // Confere quantidade × unitário = total (±1 %) antes de aceitar o item
    if (!quantidade || !unitario || !total || Math.abs(quantidade * unitario - total) > Math.max(0.05, total * 0.01)) continue;
    if (descricao.length < 3) continue;
    const ipi = paraNumeroBR(ipiTxt) || 0;
    itens.push({
      codigo,
      descricao,
      marca,
      unidade: 'un',
      quantidade,
      preco: Math.round(unitario * (1 + ipi / 100) * 100) / 100,
      ncm: `${n1}${n2}${n3}`,
    });
  }
  return itens;
}

// Layouts conhecidos, do mais específico ao mais geral. Para qualquer outro
// layout, quem chama usa o leitor universal (leitorCotacaoUniversal.js) — o
// antigo modo "genérico" daqui (descrição qtd un valor numa linha) foi
// substituído por ele, que confere quantidade × unitário = total em cada item.
function extrairLayoutsConhecidos(texto) {
  const linhas = String(texto || '').split('\n').map(l => l.trim()).filter(Boolean);
  const modelos = [
    ['ADM (blocos)', () => extrairModeloAdmBloco(linhas)],
    ['ADM (grade)', () => extrairModeloAdmGrade(linhas)],
    ['Pedido de venda', () => extrairModeloPedidoVenda(linhas)],
    ['BAND', () => extrairModeloBand(texto)],
    ['ECO Automação', () => extrairModeloEco(texto)],
  ];
  for (const [modelo, extrair] of modelos) {
    const itens = extrair();
    if (itens.length > 0) return { modelo, itens };
  }
  return { modelo: null, itens: [] };
}

// (extrairCotacaoPdf e extrairDoTexto saíram em 28/10/2026: ninguém usava — a
// leitura de cotação é a de utils/leitorCotacao.js, que chama extrairLayoutsConhecidos)
module.exports = { extrairLayoutsConhecidos };
