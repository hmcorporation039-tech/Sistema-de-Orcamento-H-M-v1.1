const { paraNumeroBR } = require('./numeroBR');

// Leitor universal de orçamento/cotação: não depende do layout do fornecedor.
// A assinatura de qualquer linha de item é ter quantidade, preço unitário e
// valor total com quantidade × unitário = total. O leitor procura esse trio
// entre os números da linha (em qualquer posição — pode haver colunas de peso,
// IPI, NCM ou desconto no meio), usa o texto da linha como descrição e, quando
// ela não tem texto suficiente, as linhas anteriores desde o último item
// (descrição quebrada em várias linhas). Também aceita o layout em blocos, com
// a quantidade numa linha e os dois preços na seguinte. No fim, confere a soma
// dos itens com algum total impresso no documento.
//
// Os leitores de layout específico (cotacaoFornecedorParser.js) continuam
// valendo primeiro; este entra para qualquer layout que eles não conhecem.

// Número no formato brasileiro (1.234,56 / 12,5 / 7), com ou sem R$. Não pega
// pedaço de código: o número não pode estar colado em letra, barra ou hífen
// (5SY4102-7, 56127/022 e 3RV2011 ficam de fora).
const RE_NUMERO = /(?<![\w\/\-.,])(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,4})?|\d+(?:,\d{1,4})?)(?![\w\/\-]|[.,]\d)/g;
const RE_LINHA_TOTAL = /\b(sub-?\s?total|total|valor\s+(?:total|l[ií]quido|do\s+pedido|da\s+proposta)|vlr\.?\s*(?:total|produtos|cota[cç][aã]o)|frete|desconto|impostos?|parcela|vencimento|pagamento|entrada)\b/i;
// Cabeçalho de tabela: linha formada quase só por nomes de coluna.
const COLUNAS = /^(c[oó]d(igo)?|ref|item|it|n[ºo°]?|descri[cç][aã]o|produtos?|qtd[ea]?|qt|quant(idade)?|un|und|unid(ade)?|unit[aá]rio|unit|pre[cç]o|vlr|valor|total|ncm|icms%?|ipi%?|st|entrega|prazo|marca|peso|desc(onto)?%?|liq(uido)?|bruto)\.?$/i;
function ehCabecalho(linha) {
  const termos = linha.split(/[\s\t/|]+/).filter(t => /[A-Za-zÀ-ÿ]/.test(t));
  const colunas = termos.filter(t => COLUNAS.test(t)).length;
  return colunas >= 3 && colunas >= termos.length * 0.6;
}
const UNIDADES = 'UN|UND|UNID|UNIDADE|PC|PÇ|PCS|PEÇA|PECA|CX|CJ|KIT|M|MT|MTS|METRO|ML|RL|ROLO|KG|PAR|JG|LT|BR|SC|VB|PT|PCT|PCTE|BD|FD|GL|TB|BAR';
const RE_UNIDADE = new RegExp(`(?:^|\\s)(${UNIDADES})\\.?(?=\\s|$)`, 'i');
const RE_UNIDADE_FINAL = new RegExp(`\\s+(${UNIDADES})\\.?\\s*$`, 'i');
const LETRAS = /[A-Za-zÀ-ÿ]{3,}/g;
// "Rótulo: valor" no início da linha (campo do cabeçalho do documento)
const RE_CAMPO = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .\/º°-]{1,30}:\s*\S/;
// código/especificação alfanumérica (ex.: "1,1KV BR4:4AM70180AB410EB0") —
// linha só com isso ainda é continuação de descrição
const RE_CODIGO = /[A-Za-z]{1,}\d|\d[A-Za-z]{1,}/;
const palavras = (s) => (String(s || '').match(LETRAS) || []).length;

function numerosDaLinha(linha) {
  const nums = [];
  for (const m of String(linha).matchAll(RE_NUMERO)) {
    const valor = paraNumeroBR(m[1]);
    if (valor == null) continue;
    nums.push({ valor, inicio: m.index, fim: m.index + m[0].length, comCifrao: /R\$/.test(m[0]), decimal: /,\d/.test(m[1]) });
  }
  return nums;
}

// tolerância = arredondamento do preço unitário (meio centavo por unidade) ou 0,1 % do total
const confere = (q, u, t) => Math.abs(q * u - t) <= Math.max(0.02, q * 0.0051, t * 0.001);

// Limites contra linha patológica (OCR de tabela inteira numa linha só, PDF com
// texto sem quebra): ehRotulo é quadrático no tamanho da linha e melhorTrio é
// cúbico no número de números — 300 números = 4,5 milhões de trios por linha.
// Linha de item real tem bem menos que isso; o trio fica no fim da linha.
const MAX_CARACTERES_LINHA = 2000;
const MAX_NUMEROS_LINHA = 30;

// Escolhe o trio (quantidade, unitário, total) mais plausível da linha.
function melhorTrio(todos) {
  const nums = todos.length > MAX_NUMEROS_LINHA ? todos.slice(-MAX_NUMEROS_LINHA) : todos;
  let melhor = null;
  for (let k = nums.length - 1; k >= 2; k--) {
    const t = nums[k];
    if (t.valor <= 0) continue;
    for (let j = k - 1; j >= 1; j--) {
      const u = nums[j];
      if (u.valor <= 0) continue;
      for (let i = j - 1; i >= 0; i--) {
        const q = nums[i];
        if (q.valor <= 0 || q.valor > 100000 || !confere(q.valor, u.valor, t.valor)) continue;
        // pontuação: preços com centavos/R$, trio contíguo, quantidade "redonda"
        let pontos = 0;
        if (u.decimal || u.comCifrao) pontos += 2;
        if (t.decimal || t.comCifrao) pontos += 2;
        if (j === i + 1) pontos += 1;
        if (k === j + 1) pontos += 1;
        if (q.valor === 1 && u.valor === t.valor) pontos -= 1; // 1 × X = X é fraco sozinho
        if (Number.isInteger(q.valor)) pontos += 0.5;
        if (Math.abs(q.valor * u.valor - t.valor) < 0.011) pontos += 1.5; // conta exata
        if (!melhor || pontos > melhor.pontos) melhor = { q, u, t, pontos };
      }
    }
  }
  return melhor;
}

// Linha de rótulos do PDF ("Produto:", "Descrição: Marca:", "NCM: 76090000").
function ehRotulo(linha) {
  return /:/.test(linha) && linha.replace(/[A-Za-zÀ-ÿ.\s\/%]+:\s*/g, '').replace(/[\d.,\s\/-]+/g, '').length < 3;
}

// Total colado no NCM: "1.494,6085176229" = 1.494,60 + NCM 85176229 (o NCM
// tem sempre 8 dígitos e o valor monetário, 2 casas).
const separarColados = (linha) => linha.replace(/(\d,\d{2})(\d{8})(?=\s|$)/g, '$1 $2');

function limparDescricao(texto) {
  return String(texto || '')
    .replace(/\t/g, ' ')
    .replace(/^[\s\-–—=_|:;.,'"*~]+/, '') // sujeira de OCR no começo (traços, barras)
    .replace(/^[A-Z]{1,2}[0-9OIl]{4,}\s+(?=[A-ZÀ-Ý]{3,})/, '') // código do fornecedor lido por OCR (P019635 → "PO19635")
    .replace(/^[\s\-–—=_|]+/, '')
    .replace(/^\s*(?:\([^)]{0,3}\)\s*)?(?:\d{1,4}\s*[-–.)]?\s+)?(?:\d[\d.\-\/]{2,}\s*(?=[A-Za-zÀ-ÿ]))?/, '') // nº do item e código numérico
    .replace(/^[\s\-–—=_|]+/, '')
    .replace(/^[A-Z][A-Za-z]?[0-9OIl]{4,}\s+(?=[A-ZÀ-Ý]{3,})/, '') // de novo, quando vinha depois do nº do item
    .replace(/[\s\-–—=_|]+$/, '')
    .replace(/R\$\s*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extrairUniversal(texto) {
  const linhas = String(texto || '').split('\n').map(l => separarColados(l.trim().slice(0, MAX_CARACTERES_LINHA)));
  const itens = [];
  let buffer = [];
  const anteriores = [];
  for (const linha of linhas) {
    if (!linha || ehRotulo(linha)) continue;
    // cabeçalho da tabela, quebra de página ou campo do cabeçalho do documento
    // ("Vendedor: Fulano", "E-mail do vendedor: ...") — nada disso é descrição
    if (ehCabecalho(linha) || /^P[áa]gina\b|^-- \d+ of \d+ --$/i.test(linha) || RE_CAMPO.test(linha)) { buffer = []; continue; }
    const nums = numerosDaLinha(linha);
    let trio = nums.length >= 3 ? melhorTrio(nums) : null;
    let linhaQtd = null;
    if (!trio && nums.length === 2 && nums.every(n => n.decimal || n.comCifrao) && palavras(linha.replace(/R\$/g, '')) === 0) {
      // layout em blocos: "UND 2,000" numa linha e "3,84 7,68" na seguinte
      const anterior = anteriores[anteriores.length - 1];
      const q = anterior ? numerosDaLinha(anterior).pop() : null;
      if (q && q.valor > 0 && q.valor <= 100000 && confere(q.valor, nums[0].valor, nums[1].valor)) {
        trio = { q, u: nums[0], t: nums[1] };
        linhaQtd = anterior;
      }
    }
    anteriores.push(linha);
    if (anteriores.length > 3) anteriores.shift();

    const textoAntes = trio && !linhaQtd ? linha.slice(0, trio.q.inicio) : '';
    if (!trio || (RE_LINHA_TOTAL.test(textoAntes) && palavras(textoAntes) <= 3)) {
      if (RE_LINHA_TOTAL.test(linha) && palavras(linha) <= 4) buffer = [];
      else if (palavras(linha) >= 1 || RE_CODIGO.test(linha)) buffer = [...buffer, linha].slice(-4);
      continue;
    }

    let unidade = 'un';
    let desc;
    if (linhaQtd) {
      const mq = linhaQtd.match(RE_UNIDADE);
      if (mq) unidade = mq[1].toLowerCase();
      desc = limparDescricao(buffer.filter(l => l !== linhaQtd).join(' '));
    } else {
      // descrição = texto antes da quantidade (+ trechos com palavras entre os números)
      const meio = [linha.slice(trio.q.fim, trio.u.inicio), linha.slice(trio.u.fim, trio.t.inicio)]
        .filter(p => palavras(p) > 0 && !RE_UNIDADE.test(` ${p.trim()} `));
      desc = limparDescricao([textoAntes, ...meio].join(' ')).replace(/(\s+[\d.,]+\s*%?)+\s*$/, '');
      const mUn = desc.match(RE_UNIDADE_FINAL) || [linha.slice(trio.q.fim, trio.u.inicio), linha.slice(trio.u.fim, trio.t.inicio)].join(' ').match(RE_UNIDADE);
      if (mUn) { unidade = mUn[1].toLowerCase(); desc = desc.replace(RE_UNIDADE_FINAL, '').trim(); }
      if (palavras(desc) < 2 && buffer.length) desc = limparDescricao([...buffer, desc].join(' '));
    }
    buffer = [];
    desc = desc.replace(/\s{2,}/g, ' ').trim();
    if (palavras(desc) < 1 || desc.length < 4) continue;
    if (RE_LINHA_TOTAL.test(desc) && palavras(desc) <= 3) continue;
    itens.push({ descricao: desc, quantidade: trio.q.valor, unidade, preco: trio.u.valor, total: trio.t.valor });
  }
  return { itens, conferencia: conferirTotal(itens, texto) };
}

// Procura no documento um valor igual à soma dos itens (total geral, subtotal
// ou total de produtos). Se achar, a leitura está completa; se não, pode ter
// faltado item ou o total impresso inclui impostos/frete.
function conferirTotal(itens, texto) {
  if (!itens.length) return { soma: 0, totalDocumento: null, confere: false };
  const soma = Math.round(itens.reduce((a, i) => a + (i.total ?? i.preco * i.quantidade), 0) * 100) / 100;
  const valores = String(texto || '').split('\n').flatMap(l => numerosDaLinha(separarColados(l.trim())).map(n => n.valor));
  const candidatos = valores.filter(v => v >= soma * 0.98 && v <= soma * 1.02);
  const totalDocumento = candidatos.length ? candidatos.reduce((a, b) => (Math.abs(b - soma) < Math.abs(a - soma) ? b : a)) : null;
  return { soma, totalDocumento, confere: totalDocumento != null && Math.abs(totalDocumento - soma) <= Math.max(0.1, soma * 0.002) };
}

module.exports = { extrairUniversal, conferirTotal, MAX_NUMEROS_LINHA };
