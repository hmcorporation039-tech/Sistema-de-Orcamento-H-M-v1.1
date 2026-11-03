// Leitura de lista de materiais / orçamento em planilha Excel de QUALQUER layout (treino com o acervo da pasta dos
// clientes, 03/11/2026: "em relação às planilhas, usem apenas os materiais que não têm no sistema para alimentá-lo").
// Cada escritório monta a sua: "Item | Descrição | Un. | Qtd. | Preço unit.", "ITEM | DISCRIMINAÇÃO | UND | QUANT |
// UNIT MO | UNIT MAT", "Especificação | Modelo | Fabricante | Qtd. total | NCM | Preço unit.". O cabeçalho é achado
// pelas palavras (descrição + unidade ou quantidade nas 40 primeiras linhas de cada aba) e cada coluna pelo nome.
// Preço: o unitário do MATERIAL quando a planilha separa material e mão de obra; o "com BDI" e os totais não
// servem. Não decide o que é material nem a disciplina (services/treinoMateriais.js): só lê as linhas.
//   lerPlanilhaMateriais(workbook ExcelJS) → [{ aba, itens: [{ descricao, unidade, quantidade, preco, marca, codigo, ncm, linha, secao? }] }]
// Cada item leva a `secao` em que estava ({ chave } ou { fora }), quando o título da seção diz a disciplina.
// Função pura (recebe a pasta de trabalho já carregada).
const { disciplinaDoTexto } = require('./disciplinaDoArquivo');
const ACENTOS = /[̀-ͯ]/g;
const norm = (s) => String(s || '').normalize('NFD').replace(ACENTOS, '').toLowerCase().replace(/\s+/g, ' ').trim();

// abas que não são lista de materiais da obra: bases de preço (PINI, SINAPI…), composições, abas de apoio
const RE_ABA_FORA = /pini|sinapi|sicro|orse|tcpo|anal[ií]tic|composi[cç]|instru[cç]|par[aâ]metro|resumo|cronograma|curva|fornecedor|diverg|pesquisa|comparativ|m[aã]o de obra|\bbdi\b|encargo|capa\b|lista de documentos|d[uú]vida/i;
const MAX_LINHAS_ABA = 3000;

function texto(v) {
  if (v == null) return '';
  if (v instanceof Date) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map(r => r.text).join('');
    if ('result' in v) return v.result == null || typeof v.result === 'object' ? '' : String(v.result);
    if (v.text) return String(v.text);
    return '';
  }
  return String(v);
}
function numero(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'object' && 'result' in v) return numero(v.result);
  const s = texto(v).replace(/R\$|\s/g, '');
  if (!/^-?[\d.,]+$/.test(s)) return null;
  // "1.234,56" (pt-BR) ou "1234.56"
  const n = /,\d{1,4}$/.test(s) ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// coluna de cada campo pelo texto do cabeçalho (a primeira que casa; o preço tem preferência pelo do material)
const CAMPOS = {
  descricao: [/^(descri|discrimina|especifica)/],
  unidade: [/^(un|und|unid|unidade|un\.|und\.|unid\.)$/, /^unid/],
  quantidade: [/^(qtd|qtde|quant|quantidade)/],
  preco: [/unit[aá]rio.*mat|unit\.? ?mat|p\.? ?unit[aá]rio material|^material \(em r\$\)|^custo de material/,
    /^(pre[cç]o|valor|vlr\.?|p\.|custo) ?unit/, /unit[aá]rio/],
  total: [/^(total|valor total|pre[cç]o total|vlr\.? total|total \(r\$\))/],
  numero: [/^(item|itens|n[º°o]\.?)$/],
  sistema: [/^(sistema|disciplina|subgrupo)$/],
  marca: [/^(marca|fabricante)/],
  codigo: [/^(c[oó]d|modelo|refer[eê]ncia|part ?number)/],
  ncm: [/^ncm/],
};
// preço que não é o unitário do material (mão de obra, com BDI, total)
const RE_PRECO_FORA = /m[aã]o|\bm\.?o\.?\b|bdi|total|servi[cç]o/;

function acharCabecalho(ws) {
  for (let r = 1; r <= Math.min(40, ws.rowCount); r++) {
    const cols = {};
    ws.getRow(r).eachCell({ includeEmpty: false }, (c, n) => {
      const h = norm(texto(c.value));
      if (!h || h.length > 60) return;
      for (const [campo, padroes] of Object.entries(CAMPOS)) {
        for (let p = 0; p < padroes.length; p++) {
          if (!padroes[p].test(h)) continue;
          if (campo === 'preco' && RE_PRECO_FORA.test(h) && !/mat/.test(h)) continue;
          // fica a de maior preferência (índice menor do padrão); empate: a primeira coluna
          if (cols[campo] == null || p < cols[campo].p) cols[campo] = { n, p };
          break;
        }
      }
    });
    if (cols.descricao && (cols.unidade || cols.quantidade)) {
      return { linha: r, colunas: Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, v.n])) };
    }
  }
  return null;
}

function lerAba(ws) {
  const cab = acharCabecalho(ws);
  if (!cab) return [];
  const { colunas: c } = cab;
  const cabTexto = norm(texto(ws.getRow(cab.linha).getCell(c.descricao).value));
  // lista de pontos de automação ("Descrição do ponto virtual | Tipo | Unidade"): não é material
  if (/ponto/.test(cabTexto)) return [];
  const itens = [];
  const ate = Math.min(ws.rowCount, cab.linha + MAX_LINHAS_ABA);
  // Seção da planilha geral de obra ("13.1 INSTALAÇÕES ELÉTRICAS", "15.1 INSTALAÇÕES HIDROSSANITÁRIAS", "16.2
  // SPRINKLERS"): o título que diz a disciplina vale para os itens de baixo; o título que não diz ("13.10
  // INFRAESTRUTURA") fica com a primeira disciplina dita no mesmo número principal (13 → elétrica).
  let secao = null;
  const porPrincipal = new Map();
  for (let r = cab.linha + 1; r <= ate; r++) {
    const row = ws.getRow(r);
    const descricao = texto(row.getCell(c.descricao).value).replace(/\s+/g, ' ').trim();
    if ((descricao.match(/[A-Za-zÀ-ÿ]/g) || []).length < 4 || norm(descricao) === cabTexto) continue;
    const unidade = c.unidade ? texto(row.getCell(c.unidade).value).trim().slice(0, 20) : '';
    const quantidade = c.quantidade ? numero(row.getCell(c.quantidade).value) : null;
    // título de grupo ("1 | CABEAMENTO ESTRUTURADO"): sem unidade nem quantidade. O subtotal/total também não tem,
    // mas FECHA o grupo de cima: não é título do de baixo ("Subtotal – 1. Detecção e alarme de incêndio")
    if (!unidade && !(quantidade > 0)) {
      if (/^(sub)?-?total/i.test(descricao)) continue;
      const principal = c.numero ? (texto(row.getCell(c.numero).value).trim().match(/^(\d+)/) || [])[1] : null;
      const dita = disciplinaDoTexto(descricao);
      if (dita) {
        secao = dita;
        if (principal && !porPrincipal.has(principal)) porPrincipal.set(principal, dita);
      } else if (principal) {
        secao = porPrincipal.get(principal) || null;
      }
      continue;
    }
    const preco = c.preco ? numero(row.getCell(c.preco).value) : null;
    // coluna "Sistema" na própria linha (a planilha que o sistema gera): vale mais que o título de seção
    const doSistema = c.sistema ? disciplinaDoTexto(texto(row.getCell(c.sistema).value)) : null;
    const secaoDoItem = doSistema || secao;
    itens.push({
      descricao: descricao.slice(0, 300),
      unidade: unidade || null,
      quantidade: quantidade > 0 ? quantidade : null,
      preco: preco > 0 && preco < 1e7 ? Math.round(preco * 100) / 100 : null,
      marca: c.marca ? texto(row.getCell(c.marca).value).trim().slice(0, 100) || null : null,
      codigo: c.codigo ? texto(row.getCell(c.codigo).value).trim().slice(0, 60) || null : null,
      ncm: c.ncm ? (texto(row.getCell(c.ncm).value).replace(/\D/g, '').slice(0, 8) || null) : null,
      linha: r,
      ...(secaoDoItem ? { secao: secaoDoItem } : {}),
    });
  }
  return itens;
}

function lerPlanilhaMateriais(wb) {
  const abas = [];
  wb.eachSheet((ws) => {
    if (RE_ABA_FORA.test(ws.name) || ws.state === 'hidden' || ws.state === 'veryHidden') return;
    const itens = lerAba(ws);
    if (itens.length) abas.push({ aba: ws.name, itens });
  });
  return abas;
}

module.exports = { lerPlanilhaMateriais, paraTestes: { acharCabecalho, numero, texto } };
