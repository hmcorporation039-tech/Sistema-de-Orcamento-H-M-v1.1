// Leitura do orçamento de um CONCORRENTE (comparador de concorrência, 06/11/2026) sem IA: planilha de qualquer layout
// (Excel) ou PDF com texto. Funções puras: recebem a pasta de trabalho ExcelJS já carregada ou o texto do PDF.
//   lerPlanilha(wb) / lerTexto(texto) → { itens: [{ descricao, unidade, quantidade, valor_unitario, valor_material,
//     valor_mao_obra, valor_total, tipo, disciplina, secao }], totalDocumento, avisos }
// O concorrente costuma separar material e mão de obra ("Unit. Mat. | Unit. M.O."): os dois são guardados e o
// unitário é a soma. tipo = 'servico' | 'material' pela descrição e pela seção; a disciplina pela seção ou descrição.
const { extrairUniversal, conferirTotal } = require('./leitorCotacaoUniversal');
const { disciplinaDoTexto } = require('./disciplinaDoArquivo');

const ACENTOS = /[̀-ͯ]/g;
const norm = (s) => String(s ?? '').normalize('NFD').replace(ACENTOS, '').toLowerCase().replace(/\s+/g, ' ').trim();
const r2 = (v) => Math.round(Number(v) * 100) / 100;
const MAX_LINHAS_ABA = 5000;
const MAX_ITENS = 3000;

// serviço: a descrição COMEÇA com o trabalho ("Instalação de...", "Passagem de cabos") ou a unidade é de serviço;
// "Caixa de passagem" e "Cabo para instalação" são material (a palavra não está no começo)
const RE_SERVICO_INICIO = /^(m[aã]o de obra|servi[cç]os?|instala[cç][aã]o|montagem|conectoriza|passagem|lan[cç]amento|configura|comissionamento|programa[cç][aã]o|certifica|testes?\b|ensaios?|treinamento|elabora[cç][aã]o|projeto|art\b|mobiliza|desmobiliza|administra[cç][aã]o|execu[cç][aã]o|fixa[cç][aã]o|retirada|remo[cç][aã]o|desmontagem|manuten[cç][aã]o|deslocamento|frete|start.?up|integra[cç][aã]o|parametriza|identifica[cç][aã]o e|organiza[cç][aã]o|aterramento e|escava[cç][aã]o|recomposi[cç][aã]o|furo|abertura|chumbamento|engenheiro|t[eé]cnico|eletricista|auxiliar|ajudante|supervis)/;
const RE_UNIDADE_SERVICO = /^(h|hh|hr|hora|horas|dia|dias|mes|m[eê]s|sv|serv)$/;
const RE_SECAO_SERVICO = /m[aã]o de obra|servi[cç]o|instala[cç][oõ]es? e servi/;
const tipoDoItem = (descricao, unidade, secao, temMatEMo) => {
  if (temMatEMo) return 'material'; // "fornecimento e instalação": o material puxa o preço (a M.O. fica guardada à parte)
  const d = norm(descricao);
  if (/^fornecimento e (instala|montagem)/.test(d)) return 'material';
  if (RE_SERVICO_INICIO.test(d) || RE_UNIDADE_SERVICO.test(norm(unidade).replace(/\.$/, ''))) return 'servico';
  if (secao && RE_SECAO_SERVICO.test(norm(secao))) return 'servico';
  return 'material';
};
const disciplinaDe = (...textos) => {
  for (const t of textos) {
    const d = t ? disciplinaDoTexto(t) : null;
    if (d?.chave) return d.chave;
  }
  return null;
};

// ── Planilha ────────────────────────────────────────────────────────────────
const texto = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map(t => t.text).join('');
    if ('result' in v) return texto(v.result);
    if (v.text) return String(v.text);
    if (v instanceof Date) return '';
  }
  return String(v);
};
function numero(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'object' && 'result' in v) return numero(v.result);
  const s = texto(v).replace(/R\$|\s/g, '');
  if (!/^-?[\d.,]+$/.test(s)) return null;
  const n = /,\d{1,4}$/.test(s) ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}
// coluna de cada campo pelo nome do cabeçalho (o 1º padrão que casa; ordem = preferência)
const CAMPOS = {
  descricao: [/^(descri|discrimina|especifica|servi[cç]os? e materiais|produto|material)/],
  unidade: [/^(un|und|unid|unidade|un\.|und\.|unid\.)$/, /^unid/],
  quantidade: [/^(qtd|qtde|quant|quantidade|qde)/],
  unit_mat: [/unit.*mat|mat.*unit|^material \(?(r\$|unit)|^p\.? ?unit\.? ?mat/],
  unit_mo: [/unit.*(m\.? ?o|m[aã]o)|(m\.? ?o\.?|m[aã]o de obra).*unit|^m[aã]o de obra \(?(r\$|unit)/],
  unit: [/^(pre[cç]o|valor|vlr\.?|p\.|custo) ?unit/, /unit[aá]rio/, /^unit\.?$/],
  total: [/^(pre[cç]o |valor |vlr\.? )?total( geral| do item| \(r\$\))?$/, /^total/],
  numero: [/^(item|itens|n[º°o]\.?)$/],
};
const RE_ABA_FORA = /sinapi|sicro|orse|tcpo|pini|anal[ií]tic|composi[cç]|cronograma|curva|\bbdi\b|encargo|capa\b|instru[cç]|resumo/i;

function acharCabecalho(ws) {
  for (let r = 1; r <= Math.min(60, ws.rowCount); r++) {
    const cols = {};
    ws.getRow(r).eachCell({ includeEmpty: false }, (c, n) => {
      const h = norm(texto(c.value));
      if (!h || h.length > 60) return;
      for (const [campo, padroes] of Object.entries(CAMPOS)) {
        const p = padroes.findIndex(re => re.test(h));
        if (p < 0) continue;
        // "Total Mat." / "Total M.O." não são o total do item
        if (campo === 'total' && /mat|m\.? ?o\b|m[aã]o/.test(h)) continue;
        if (campo === 'unit' && (/mat|m\.? ?o\b|m[aã]o|bdi/.test(h))) continue;
        if (cols[campo] == null || p < cols[campo].p) cols[campo] = { n, p };
        break;
      }
    });
    const temPreco = cols.unit || cols.total || cols.unit_mat || cols.unit_mo;
    if (cols.descricao && (cols.unidade || cols.quantidade) && temPreco) {
      return { linha: r, c: Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, v.n])) };
    }
  }
  return null;
}

function lerAba(ws, avisos) {
  const cab = acharCabecalho(ws);
  if (!cab) return [];
  const { c } = cab;
  const itens = [];
  let secao = null;
  const ate = Math.min(ws.rowCount, cab.linha + MAX_LINHAS_ABA);
  if (ws.rowCount > cab.linha + MAX_LINHAS_ABA) avisos.push(`A aba "${ws.name}" tem mais de ${MAX_LINHAS_ABA} linhas: só as primeiras foram lidas.`);
  for (let r = cab.linha + 1; r <= ate; r++) {
    const row = ws.getRow(r);
    const descricao = texto(row.getCell(c.descricao).value).replace(/\s+/g, ' ').trim();
    if ((descricao.match(/[A-Za-zÀ-ÿ]/g) || []).length < 3) continue;
    const unidade = c.unidade ? texto(row.getCell(c.unidade).value).trim().slice(0, 20) : '';
    const quantidade = c.quantidade ? numero(row.getCell(c.quantidade).value) : null;
    const um = c.unit_mat ? numero(row.getCell(c.unit_mat).value) : null;
    const umo = c.unit_mo ? numero(row.getCell(c.unit_mo).value) : null;
    const u = c.unit ? numero(row.getCell(c.unit).value) : null;
    const t = c.total ? numero(row.getCell(c.total).value) : null;
    // título de grupo/seção: sem quantidade (o subtotal também não tem quantidade, mas não abre seção)
    if (!(quantidade > 0)) {
      if (!/^(sub)?-?\s?total|^total/i.test(descricao)) secao = descricao.slice(0, 200);
      continue;
    }
    if (/^(sub)?-?\s?total\b|^total geral/i.test(descricao)) continue;
    const temMatEMo = um > 0 && umo > 0;
    const unitario = u > 0 ? u : (um > 0 || umo > 0) ? (um || 0) + (umo || 0) : t > 0 ? t / quantidade : null;
    itens.push({
      descricao: descricao.slice(0, 500), unidade: unidade || null, quantidade,
      valor_unitario: unitario != null ? r2(unitario) : null,
      valor_material: um > 0 ? r2(um) : null, valor_mao_obra: umo > 0 ? r2(umo) : null,
      valor_total: t > 0 ? r2(t) : unitario != null ? r2(unitario * quantidade) : null,
      tipo: tipoDoItem(descricao, unidade, secao, temMatEMo),
      disciplina: disciplinaDe(secao, descricao),
      secao,
    });
  }
  return itens;
}

function lerPlanilha(wb) {
  const avisos = [];
  let itens = [];
  wb.eachSheet((ws) => {
    if (RE_ABA_FORA.test(ws.name) || ws.state === 'hidden' || ws.state === 'veryHidden') return;
    itens.push(...lerAba(ws, avisos));
  });
  if (itens.length > MAX_ITENS) {
    avisos.push(`O arquivo tem ${itens.length} itens: só os ${MAX_ITENS} primeiros entram na comparação.`);
    itens = itens.slice(0, MAX_ITENS);
  }
  if (!itens.length) avisos.push('Nenhuma tabela de itens com descrição, quantidade e preço foi achada na planilha.');
  return { itens, totalDocumento: null, avisos };
}

// ── PDF (texto) ─────────────────────────────────────────────────────────────
// Além do leitor universal (quantidade × unitário = total), a linha com material e mão de obra separados:
// "Eletroduto 3/4  m  120,00  4,50  3,20  924,00" → q × (mat + m.o.) = total.
const RE_NUM = /(?<![\w\/\-.,])(\d{1,3}(?:\.\d{3})+(?:,\d{1,4})?|\d+(?:,\d{1,4})?)(?![\w\/\-]|[.,]\d)/g;
const numBR = (s) => Number(s.replace(/\./g, '').replace(',', '.'));
const RE_UN = /\b(un|und|unid|pc|p[cç]|cj|kit|m|mt|ml|m2|m²|m3|rl|kg|par|jg|vb|pt|cx|h|hh|dia|mes)\.?\b/i;
function linhasMatMo(textoPdf) {
  const itens = [];
  for (const linha of String(textoPdf || '').split('\n')) {
    const nums = [...linha.matchAll(RE_NUM)].map(m => ({ v: numBR(m[1]), i: m.index, f: m.index + m[0].length }));
    if (nums.length < 4) continue;
    const [q, a, b, t] = nums.slice(-4);
    if (!(q.v > 0) || !(t.v > 0) || Math.abs(q.v * (a.v + b.v) - t.v) > Math.max(0.05, t.v * 0.002)) continue;
    let desc = linha.slice(0, q.i).replace(/^\s*[\d.]+\s+/, '').trim();
    const mUn = desc.match(new RegExp(`\\s${RE_UN.source}\\s*$`, 'i'));
    const unidade = mUn ? mUn[1].toLowerCase() : null;
    if (mUn) desc = desc.slice(0, mUn.index).trim();
    if ((desc.match(/[A-Za-zÀ-ÿ]/g) || []).length < 4) continue;
    itens.push({ descricao: desc.slice(0, 500), unidade, quantidade: q.v, valor_material: r2(a.v), valor_mao_obra: r2(b.v),
      valor_unitario: r2(a.v + b.v), valor_total: r2(t.v) });
  }
  return itens;
}

function lerTexto(textoPdf) {
  const avisos = [];
  const comMatMo = linhasMatMo(textoPdf);
  const universal = extrairUniversal(textoPdf);
  // fica a leitura que achou mais linhas (o mesmo PDF raramente tem os dois layouts)
  const base = comMatMo.length > universal.itens.length
    ? comMatMo.map(i => ({ ...i, tipo: tipoDoItem(i.descricao, i.unidade, null, true) }))
    : universal.itens.map(i => ({
      descricao: i.descricao.slice(0, 500), unidade: i.unidade || null, quantidade: i.quantidade,
      valor_unitario: r2(i.preco), valor_material: null, valor_mao_obra: null, valor_total: r2(i.total ?? i.preco * i.quantidade),
      tipo: tipoDoItem(i.descricao, i.unidade, null, false),
    }));
  const itens = base.slice(0, MAX_ITENS).map(i => ({ ...i, disciplina: disciplinaDe(i.descricao), secao: null }));
  if (base.length > MAX_ITENS) avisos.push(`O arquivo tem ${base.length} itens: só os ${MAX_ITENS} primeiros entram na comparação.`);
  const conferencia = conferirTotal(itens.map(i => ({ ...i, total: i.valor_total })), textoPdf);
  if (itens.length && !conferencia.confere) {
    avisos.push(`A soma dos itens lidos (R$ ${conferencia.soma.toFixed(2).replace('.', ',')}) não bate com nenhum total do documento: pode faltar item (linha quebrada no PDF) ou o total incluir BDI/impostos. Confira a lista.`);
  }
  if (!itens.length) avisos.push('Nenhuma linha de item (quantidade × unitário = total) foi achada no texto do PDF. Se for PDF escaneado ou de layout muito diferente, envie a planilha do concorrente ou use a leitura com IA.');
  return { itens, totalDocumento: conferencia.totalDocumento, avisos };
}

// CNPJ e nome do concorrente pelo cabeçalho do documento (o usuário pode corrigir)
function identificarConcorrente(textoDoc) {
  const t = String(textoDoc || '');
  const cnpj = (t.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/) || [])[0] || null;
  const razao = (t.match(/^\s*([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9 &.,'-]{3,80}(?:LTDA|EIRELI|S\.?\/?A\.?|ME|EPP|ENGENHARIA)\b\.?)/m) || [])[1] || null;
  return { cnpj: cnpj ? cnpj.replace(/\D/g, '') : null, nome: razao ? razao.trim() : null };
}

module.exports = { lerPlanilha, lerTexto, identificarConcorrente, tipoDoItem, paraTestes: { acharCabecalho, linhasMatMo, numero } };
