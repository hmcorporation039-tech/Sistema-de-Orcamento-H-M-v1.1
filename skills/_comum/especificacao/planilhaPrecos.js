// PLANILHA DE PESQUISA DE PREÇOS DO MATERIAL — mesmo formato e critérios da pesquisa de preços
// de referência da H&M (aba "Materiais": Item | Tag | Descrição | Referência pesquisada | Qtd |
// Un | Preço unit. | Total = Qtd × Preço | Origem do preço | Faixa encontrada | Fonte |
// Observação; grupos; subtotais por SUMIFS na origem; contingência % editável; TOTAL MATERIAL
// sem BDI e sem mão de obra; legenda de cores e notas) e mais a aba "Resumo" (por grupo, itens
// que mais pesam, pesquisado × estimativa, onde economizar, mudanças em relação ao anteprojeto e
// itens que dependem da Icc). Fórmulas vivas (exceljs).
//
// PREÇO, em cascata e sem inventar valor:
//   1. preço aprendido (pesquisa aprovada pelo engenheiro, com data, loja e faixa) — "Pesquisado";
//   2. referências da H&M do sistema (cotação de fornecedor, vendido, catálogo) — "Pesquisado" se
//      cotação/pesquisa, "Estimativa H&M" se catálogo/vendido;
//   3. estimativa digitada e aprovada pelo engenheiro — "Estimativa H&M";
//   4. fornecido pelo cliente — "Cliente" (sem preço);
//   5. nada disso — "A cotar": preço VAZIO (nunca R$ 0,00), linha amarela, entra na contagem
//      de itens a cotar. A pesquisa na web (IA) é sugestão: o resultado aprovado vira o item 1.

const ExcelJS = require('exceljs');
const { timbrarPlanilha } = require('../empresa');

const AZUL_ESCURO = 'FF0F2257';
const CINZA_GRUPO = 'FFE6E9F0';
const AMARELO_CLARO = 'FFFFF4D6';
const AMARELO = 'FFFFFF00';
const DOURADO = 'FFF2B924';
const AZUL = 'FF0000FF';
const GRUPOS = ['Invólucro', 'Proteção de força', 'Acionamentos', 'Comando e sinalização', 'Ventilação', 'Barramento e bornes', 'Consumíveis', 'Fornecido pelo cliente'];
// grupos na ordem: os do painel primeiro e, depois, os de cada disciplina (14/11/2026 — incêndio, MT, BMS…)
const gruposDe = (itens) => [...GRUPOS.filter(g => itens.some(i => i.grupo === g)), ...[...new Set(itens.map(i => i.grupo))].filter(g => g && !GRUPOS.includes(g))];
// tag/título do projeto (quadro ou projeto de outra disciplina) e o objeto da pesquisa
const tagDe = (p) => p.quadro?.tag || p.meta?.tag || 'PRJ';
const objetoDe = (p) => (p.quadro ? 'montagem do quadro' : 'material do projeto');
const ORIGENS = { pesquisado: 'Pesquisado', estimativa: 'Estimativa H&M', cliente: 'Cliente', cotar: 'A cotar' };

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesAno = (iso) => { const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`); return Number.isNaN(d.getTime()) ? '' : `${MESES[d.getMonth()]}/${d.getFullYear()}`; };
const faixaTxt = (f) => (Array.isArray(f) && f.length === 2 ? `${fmtBR(f[0])} – ${fmtBR(f[1])}` : f || '—');
const fmtBR = (v) => (v == null ? '' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }));

// semelhança simples por palavras (para casar a chave do material com o preço aprendido)
function semelhanca(a, b) {
  const A = new Set(norm(a).split(' ').filter(x => x.length > 1));
  const B = new Set(norm(b).split(' ').filter(x => x.length > 1));
  if (!A.size || !B.size) return 0;
  let c = 0;
  for (const x of A) if (B.has(x)) c++;
  return (2 * c) / (A.size + B.size);
}

// Casamento material × preço aprendido, sem IA: palavras em comum (pela menor descrição), os
// NÚMEROS da especificação principal (antes de "—" e "(") presentes no outro lado (≥ 60 %: 125 A
// não casa com 250 A, borne 4 mm² não casa com 50 mm²) e a mesma unidade (preço por "rolo" não
// vale por "m"). Sinônimos usuais da descrição em SINONIMOS.
const PARADAS = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'em', 'para', 'p', 'v', 'a', 'mm', 'o', 'ou', 'no', 'na', 'kit', 'cj']);
const SINONIMOS = [[/ 1 p n /g, ' 2 p '], [/ c (?=base|led|diodo)/g, ' com ']];
function tokens(s) {
  let t = ` ${String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/(\d),(\d)/g, '$1.$2').replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2').replace(/[^a-z0-9.]+/g, ' ')} `;
  for (const [r, v] of SINONIMOS) t = t.replace(r, v);
  return t.split(' ').filter(x => x && x !== '.' && !PARADAS.has(x));
}
const principal = (s) => String(s ?? '').split(/\s+[—–]\s+|\(/)[0];
const numeros = (s) => tokens(s).filter(x => /^\d+(\.\d+)?$/.test(x));
const unidadeNorm = (u) => ({ pc: 'pc', 'pç': 'pc', un: 'pc', und: 'pc', peca: 'pc' }[norm(u)] || norm(u));
// unidade de compra → base e fator ("rolo 100 m" = 100 × m; "cx 50 pç" = 50 × pç)
function unidadeBase(u) {
  const t = norm(u);
  const m = /^(?:rolo|bobina|caixa|cx|pacote|pct|kit)\s*(?:c\s*)?(\d+(?:\.\d+)?)\s*(m|metros?|pc|pecas?|un)$/.exec(t);
  if (m) return { base: /^m/.test(m[2]) ? 'm' : 'pc', fator: Number(m[1]) };
  return { base: unidadeNorm(u), fator: 1 };
}
// fator para levar o preço da unidade do aprendido para a unidade do material (null = incompatível)
function fatorUnidade(m, a) {
  if (!a.unidade || !m.unidade) return 1;
  const um = unidadeBase(m.unidade), ua = unidadeBase(a.unidade);
  if (um.base !== ua.base) return null;
  return um.fator / ua.fator;
}
function pontuar(m, a) {
  if (fatorUnidade(m, a) == null) return 0;
  const A = new Set(tokens(`${m.chave || ''} ${principal(m.descricao)}`).filter(x => x.length > 1 && !/^\d/.test(x)));
  const B = new Set(tokens(`${a.chave || ''} ${a.descricao || ''}`).filter(x => x.length > 1 && !/^\d/.test(x)));
  if (!A.size || !B.size) return 0;
  let c = 0;
  for (const x of A) if (B.has(x)) c++;
  const palavras = c / Math.min(A.size, B.size);
  const nm = numeros(principal(m.descricao));
  const na = new Set(numeros(principal(a.descricao || a.chave)));
  const cobertura = nm.length ? nm.filter(x => na.has(x)).length / nm.length : 1;
  if (palavras < 0.5 || cobertura < 0.6) return 0;
  // desempate: o preço cujos números da especificação principal também estão no material
  const nap = numeros(principal(a.descricao || a.chave));
  const nmS = new Set(nm);
  const volta = nap.length ? nap.filter(x => nmS.has(x)).length / nap.length : 1;
  return palavras + cobertura + 0.5 * volta;
}

// seção do condutor/barra na descrição principal: "40×5 mm" → 200 mm²; "2,5 mm²" → 2,5
function secaoDe(desc) {
  const t = principal(desc).replace(/(\d),(\d)/g, '$1.$2');
  const b = /(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*mm(?!²)/i.exec(t);
  if (b) return { s: Number(b[1]) * Number(b[2]), txt: `${b[1]}×${b[2]}` };
  const c = /(\d+(?:\.\d+)?)\s*mm²/i.exec(t);
  return c ? { s: Number(c[1]), txt: `${String(c[1]).replace('.', ',')} mm²` } : null;
}
const FAMILIAS = [/\bbarra\b.*\bcobre\b/, /\bcabo\b.*\bflexivel\b/, /\bcabo\b.*\bpp\b/, /\bvergalh/];
function estimarPorSecao(m, apr) {
  const sm = secaoDe(m.descricao);
  if (!sm) return null;
  const nm = norm(principal(m.descricao));
  const fam = FAMILIAS.find(r => r.test(nm));
  if (!fam) return null;
  const cand = apr.filter(a => a.preco > 0 && fam.test(norm(principal(a.descricao || a.chave))) && fatorUnidade(m, a) != null)
    .map(a => ({ a, sa: secaoDe(a.descricao || a.chave) })).filter(x => x.sa && x.sa.s > 0)
    .sort((x, y) => Math.abs(Math.log(x.sa.s / sm.s)) - Math.abs(Math.log(y.sa.s / sm.s)));
  if (!cand.length) return null;
  const { a, sa } = cand[0];
  const f = fatorUnidade(m, a);
  const precoUn = a.preco * f;
  const preco = Math.round(precoUn * sm.s / sa.s * 100) / 100;
  return { preco, origem: ORIGENS.estimativa, faixa: '—', fonte: a.fonte || '—', data: a.data || null, referenciaPesquisada: `proporcional a ${a.referencia && a.referencia !== "—" ? a.referencia : principal(a.descricao || a.chave).trim()}`,
    obs: [`Estimativa H&M: preço proporcional à seção (${sm.txt} ÷ ${sa.txt} = ${fmtBR(Math.round(sm.s / sa.s * 1000) / 1000)}) × R$ ${fmtBR(Math.round(precoUn * 100) / 100)}/${m.unidade} do item pesquisado "${principal(a.descricao || a.chave).slice(0, 60)}"${f !== 1 ? ` (convertido de ${a.unidade})` : ''} — mesmo material; cotar`, m.obs].filter(Boolean).join(' · ') };
}

// Resolve o preço de cada material. fontes: { aprendidos: [...], referencias: { [chave]: {...} }, estimativas: { [chave]: {...} } }
function resolverPrecos(materiais, fontes = {}) {
  const apr = fontes.aprendidos || [];
  return materiais.map(m => {
    if (m.cliente) return { ...m, preco: 0, origem: ORIGENS.cliente, faixa: '—', fonte: '—', obs: m.obs || 'Somente montagem e ligação' };
    const chave = m.chave || m.descricao;
    let achado = apr.find(a => a.chave && norm(a.chave) === norm(chave));
    if (!achado) {
      const cand = apr.map(a => ({ a, s: pontuar(m, a) })).filter(x => x.s > 0).sort((x, y) => y.s - x.s)[0];
      if (cand && cand.s >= 1.2) achado = cand.a;
    }
    if (achado && achado.preco > 0) {
      const f = fatorUnidade(m, achado) ?? 1;
      const conv = f !== 1 ? `preço convertido de "${achado.unidade}" (R$ ${fmtBR(achado.preco)}) para "${m.unidade}" (÷ ${fmtBR(1 / f)})` : '';
      return { ...m, preco: Math.round(achado.preco * f * 100) / 100, origem: achado.origem === 'estimativa' || f !== 1 ? ORIGENS.estimativa : ORIGENS.pesquisado, faixa: faixaTxt(achado.faixa), fonte: achado.fonte || '—', data: achado.data || null,
        referenciaPesquisada: achado.referencia || m.referencia, obs: [conv, achado.obs, m.obs].filter(Boolean).join(' · '), alternativa: achado.alternativa || null, equivale: achado.equivale || null, aprendido: true };
    }
    // mesma família (barra de cobre, cabo flexível…) com outra seção: preço proporcional à seção do
    // pesquisado mais próximo — "Estimativa H&M" com a regra escrita (nunca R$ 0,00)
    const porSecao = estimarPorSecao(m, apr);
    if (porSecao) return { ...m, ...porSecao };
    const ref = fontes.referencias?.[m.chave];
    if (ref && ref.preco > 0) {
      const pesquisa = /cota|pesquis|fornecedor/i.test(ref.fonte || '');
      return { ...m, preco: ref.preco, origem: pesquisa ? ORIGENS.pesquisado : ORIGENS.estimativa, faixa: faixaTxt(ref.faixa), fonte: ref.fonte, data: ref.data || null, referenciaPesquisada: ref.produto || m.referencia, obs: [ref.obs, m.obs].filter(Boolean).join(' · ') };
    }
    const est = fontes.estimativas?.[m.chave];
    if (est && est.preco > 0) return { ...m, preco: est.preco, origem: ORIGENS.estimativa, faixa: '—', fonte: est.fonte || 'estimativa do engenheiro', data: est.data || null, obs: [est.obs, m.obs].filter(Boolean).join(' · ') };
    return { ...m, preco: null, origem: ORIGENS.cotar, faixa: '—', fonte: '—', obs: [m.obs, 'sem preço no sistema — cotar'].filter(Boolean).join(' · ') };
  });
}

// Resumo (também para o texto de entrega)
function resumir(itens, { contingencia = 0.1, topN = 5 } = {}) {
  const total = (i) => (i.preco || 0) * i.quantidade;
  const porGrupo = gruposDe(itens).map(g => ({ grupo: g, total: itens.filter(i => i.grupo === g).reduce((s, i) => s + total(i), 0), n: itens.filter(i => i.grupo === g).length })).filter(g => g.n && g.grupo !== 'Fornecido pelo cliente');
  const pesquisado = itens.filter(i => i.origem === ORIGENS.pesquisado).reduce((s, i) => s + total(i), 0);
  const estimado = itens.filter(i => i.origem === ORIGENS.estimativa).reduce((s, i) => s + total(i), 0);
  const subtotal = pesquisado + estimado;
  const top = [...itens].filter(i => i.preco > 0).sort((a, b) => total(b) - total(a)).slice(0, topN).map(i => ({ descricao: i.descricao, referencia: i.referenciaPesquisada || '', preco: i.preco, quantidade: i.quantidade, total: total(i), fonte: i.fonte, origem: i.origem, tag: i.tag }));
  const econ = itens.filter(i => i.alternativa && i.alternativa.preco != null && i.preco > i.alternativa.preco).map(i => ({ descricao: `${i.tag !== '—' ? `${i.tag} ` : ''}${i.descricao.split(' (')[0]}`, de: `${i.referenciaPesquisada || ''} ≈ R$ ${fmtBR(i.preco)}`, para: `${i.alternativa.referencia} ≈ R$ ${fmtBR(i.alternativa.preco)}`, economia: (i.preco - i.alternativa.preco) * i.quantidade, ressalva: i.alternativa.ressalva || 'menor robustez' }));
  const mudancas = itens.filter(i => i.equivale).map(i => `${i.tag !== '—' ? `${i.tag}: ` : ''}${i.equivale}`);
  const dependeIcc = itens.filter(i => i.dependeIcc).map(i => i.tag).filter(t => t && t !== '—');
  const datas = itens.map(i => i.data).filter(Boolean).sort();
  return {
    porGrupo, pesquisado, estimado, subtotal, contingencia, total: subtotal * (1 + contingencia), top,
    economia: { itens: econ, total: econ.reduce((s, x) => s + x.economia, 0) }, mudancas, dependeIcc,
    aCotar: itens.filter(i => i.origem === ORIGENS.cotar).length, temCliente: itens.some(i => i.origem === ORIGENS.cliente),
    dataBase: datas.length ? mesAno(datas[datas.length - 1]) : mesAno(new Date().toISOString()),
  };
}

const borda = { top: { style: 'thin', color: { argb: 'FFD0D5DE' } }, bottom: { style: 'thin', color: { argb: 'FFD0D5DE' } } };

async function gerarPlanilhaPrecos(projeto, fontes = {}, opcoes = {}) {
  const contingencia = opcoes.contingencia ?? 0.1;
  const itens = resolverPrecos(projeto.materiais, fontes);
  const res = resumir(itens, { contingencia });
  const wb = new ExcelJS.Workbook();
  wb.creator = 'H&M Engenharia e Tecnologia';
  const ws = wb.addWorksheet('Materiais', { views: [{ state: 'frozen', ySplit: 4, topLeftCell: 'A5' }] });
  ws.columns = [5, 9, 44, 30, 6, 9, 12, 13, 14, 18, 24, 48].map(w => ({ width: w }));
  ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } };
  const m = projeto.meta;
  ws.getCell('A1').value = `${tagDe(projeto)} — Pesquisa de preços de material (${objetoDe(projeto)})`;
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: AZUL_ESCURO } };
  ws.getCell('A2').value = `${m.obra ? `Obra: ${m.obra} · ` : ''}${m.cliente ? `Cliente: ${m.cliente} · ` : ''}Ref.: anteprojeto ${tagDe(projeto)} Rev.${m.revisao || '0A'} · Data-base: ${res.dataBase} · Preços de varejo online (BRL), sem frete, sem BDI`;
  ws.getCell('A2').font = { size: 9 };
  const cab = ['Item', 'Tag', 'Descrição', 'Referência pesquisada', 'Qtd', 'Un', 'Preço unit. (R$)', 'Total (R$)', 'Origem do preço', 'Faixa encontrada (R$)', 'Fonte', 'Observação'];
  const h = ws.getRow(4);
  h.values = cab;
  h.height = 30;
  h.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_ESCURO } }; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }; c.alignment = { vertical: 'middle', wrapText: true }; });
  let r = 5;
  let n = 0;
  const linhaItem = {};
  const faixaGrupo = {};
  for (const g of gruposDe(itens)) {
    const doGrupo = itens.filter(i => i.grupo === g);
    if (!doGrupo.length) continue;
    const rg = ws.getRow(r);
    rg.getCell(1).value = g === 'Consumíveis' ? 'Consumíveis de montagem (estimativa)' : g;
    for (let k = 1; k <= 12; k++) rg.getCell(k).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CINZA_GRUPO } };
    rg.getCell(1).font = { bold: true, size: 11, color: { argb: AZUL_ESCURO } };
    r++;
    const ini = r;
    for (const i of doGrupo) {
      n++;
      const row = ws.getRow(r);
      row.values = [n, i.tag || '—', i.descricao, i.referenciaPesquisada || i.referencia || '—', i.quantidade, i.unidade, i.preco == null ? null : i.preco, { formula: `E${r}*G${r}` }, i.origem, i.faixa || '—', i.fonte || '—', i.obs || ''];
      row.font = { size: 9, color: { argb: 'FF000000' } };
      row.alignment = { vertical: 'top', wrapText: true };
      row.getCell(5).font = { size: 9, color: { argb: AZUL } };
      row.getCell(7).font = { size: 9, color: { argb: AZUL } };
      row.getCell(7).numFmt = '#,##0.00';
      row.getCell(8).numFmt = '#,##0.00';
      if (i.origem === ORIGENS.estimativa || i.origem === ORIGENS.cotar) {
        row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMARELO_CLARO } };
        row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMARELO_CLARO } };
      }
      for (let k = 1; k <= 12; k++) row.getCell(k).border = borda;
      if (String(i.descricao).length > 60 || String(i.obs || '').length > 70) row.height = 22.35;
      linhaItem[i.item] = r;
      r++;
    }
    faixaGrupo[g] = [ini, r - 1];
  }
  const fim = r - 1;
  r++;
  const tot = (rot, formula, { negrito = false, fill = null } = {}) => {
    const row = ws.getRow(r);
    row.getCell(7).value = rot;
    row.getCell(8).value = { formula };
    row.getCell(8).numFmt = '#,##0.00';
    row.getCell(7).font = { size: 10, bold: negrito };
    row.getCell(8).font = { size: 10, bold: negrito };
    if (fill) row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    return r++;
  };
  const rPesq = tot('Subtotal pesquisado', `SUMIFS(H5:H${fim},I5:I${fim},"${ORIGENS.pesquisado}")`);
  const rEst = tot('Subtotal estimado', `SUMIFS(H5:H${fim},I5:I${fim},"${ORIGENS.estimativa}")`);
  const rSub = tot('Subtotal material', `H${rPesq}+H${rEst}`, { negrito: true });
  const rCont = tot('Contingência / frete / variação', `H${rSub}*L${r}`);
  ws.getCell(`K${rCont}`).value = 'Contingência (%) →';
  ws.getCell(`K${rCont}`).font = { size: 9 };
  ws.getCell(`L${rCont}`).value = contingencia;
  ws.getCell(`L${rCont}`).numFmt = '0%';
  ws.getCell(`L${rCont}`).font = { size: 11, color: { argb: AZUL } };
  ws.getCell(`L${rCont}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMARELO } };
  const rTot = tot('TOTAL MATERIAL (sem BDI e sem mão de obra)', `H${rSub}+H${rCont}`, { negrito: true, fill: DOURADO });
  const rCot = r++;
  ws.getCell(`G${rCot}`).value = 'Itens a cotar (sem preço)';
  ws.getCell(`G${rCot}`).font = { size: 9 };
  ws.getCell(`H${rCot}`).value = { formula: `COUNTIFS(I5:I${fim},"${ORIGENS.cotar}")` };
  ws.getCell(`H${rCot}`).font = { size: 9 };
  r++;
  const notas = [
    'LEGENDA: azul = valores de entrada (qtd e preço) editáveis · amarelo-claro = preço estimado ou a cotar (não encontrado em loja; cotar) · amarelo = contingência ajustável.',
    `Preços de varejo online em ${res.dataBase} (menor preço confiável ou valor típico encontrado). Compra com CNPJ em distribuidor autorizado costuma sair abaixo — usar esta planilha como teto.`,
    `Não inclui: mão de obra de montagem e testes, projeto executivo/ART, BDI, frete${res.temCliente ? ', itens fornecidos pelo cliente' : ''}, instalação em campo e cabos de campo.`,
    ...(res.dependeIcc.length ? [`Itens com Icu dependente do Icc no ponto (${res.dependeIcc.join(', ')}) podem mudar de versão e de preço após a confirmação do Icc.`] : []),
    ...(res.mudancas.length ? [`Divergências em relação ao anteprojeto: ${res.mudancas.join('; ')}.`] : []),
    ...(res.aCotar ? [`${res.aCotar} item(ns) sem preço no sistema ("A cotar") — o total não os inclui até a cotação.`] : []),
  ];
  for (const t of notas) {
    ws.mergeCells(`A${r}:L${r}`);
    ws.getCell(`A${r}`).value = t;
    ws.getCell(`A${r}`).font = { size: 9 };
    ws.getCell(`A${r}`).alignment = { wrapText: true, vertical: 'top' };
    ws.getRow(r).height = t.length > 190 ? 26 : 15;
    r++;
  }
  timbrarPlanilha(ws, `${tagDe(projeto)} — Pesquisa de preços de material`);

  // ── Aba Resumo ─────────────────────────────────────────────────────────────
  const rs = wb.addWorksheet('Resumo');
  rs.columns = [{ width: 46 }, { width: 34 }, { width: 18 }, { width: 18 }, { width: 30 }];
  rs.getCell('A1').value = `${tagDe(projeto)} — Resumo da pesquisa de preços`;
  rs.getCell('A1').font = { bold: true, size: 14, color: { argb: AZUL_ESCURO } };
  let y = 3;
  const titulo = (txt) => { rs.getCell(`A${y}`).value = txt; rs.getCell(`A${y}`).font = { bold: true, size: 11, color: { argb: AZUL_ESCURO } }; y++; };
  const cabec = (vals) => { const row = rs.getRow(y); row.values = vals; row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_ESCURO } }; c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }; }); y++; };
  titulo('Total por grupo');
  cabec(['Grupo', '', 'Total (R$)', '% do material']);
  const yGrupoIni = y;
  for (const g of gruposDe(itens).filter(x => faixaGrupo[x] && x !== 'Fornecido pelo cliente')) {
    const [a, b] = faixaGrupo[g];
    rs.getCell(`A${y}`).value = g;
    rs.getCell(`C${y}`).value = { formula: `SUM(Materiais!H${a}:H${b})` };
    rs.getCell(`C${y}`).numFmt = '#,##0.00';
    rs.getCell(`D${y}`).value = { formula: `IF(Materiais!H${rSub}=0,0,C${y}/Materiais!H${rSub})` };
    rs.getCell(`D${y}`).numFmt = '0%';
    y++;
  }
  rs.getCell(`A${y}`).value = 'Subtotal material'; rs.getCell(`C${y}`).value = { formula: `Materiais!H${rSub}` }; rs.getCell(`C${y}`).numFmt = '#,##0.00'; rs.getRow(y).font = { bold: true }; y++;
  rs.getCell(`A${y}`).value = 'Contingência'; rs.getCell(`C${y}`).value = { formula: `Materiais!H${rCont}` }; rs.getCell(`C${y}`).numFmt = '#,##0.00'; y++;
  rs.getCell(`A${y}`).value = 'TOTAL MATERIAL (sem BDI e sem mão de obra)'; rs.getCell(`C${y}`).value = { formula: `Materiais!H${rTot}` }; rs.getCell(`C${y}`).numFmt = '#,##0.00'; rs.getCell(`C${y}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DOURADO } }; rs.getRow(y).font = { bold: true }; y += 2;
  void yGrupoIni;
  titulo('Pesquisado × estimativa');
  cabec(['Origem', '', 'Total (R$)', '% do material']);
  for (const [rot, lin] of [['Pesquisado (loja/cotação)', rPesq], ['Estimativa H&M (cotar)', rEst]]) {
    rs.getCell(`A${y}`).value = rot; rs.getCell(`C${y}`).value = { formula: `Materiais!H${lin}` }; rs.getCell(`C${y}`).numFmt = '#,##0.00';
    rs.getCell(`D${y}`).value = { formula: `IF(Materiais!H${rSub}=0,0,Materiais!H${lin}/Materiais!H${rSub})` }; rs.getCell(`D${y}`).numFmt = '0%'; y++;
  }
  rs.getCell(`A${y}`).value = 'Itens a cotar (sem preço)'; rs.getCell(`C${y}`).value = { formula: `Materiais!H${rCot}` }; y += 2;
  titulo('Itens que mais pesam');
  cabec(['Item', 'Referência', 'Preço unit. (R$)', 'Total (R$)', 'Fonte']);
  for (const tp of res.top) {
    const it = itens.find(i => i.descricao === tp.descricao && i.tag === tp.tag);
    const lin = linhaItem[it.item];
    rs.getCell(`A${y}`).value = { formula: `Materiais!C${lin}` };
    rs.getCell(`B${y}`).value = { formula: `Materiais!D${lin}` };
    rs.getCell(`C${y}`).value = { formula: `Materiais!G${lin}` }; rs.getCell(`C${y}`).numFmt = '#,##0.00';
    rs.getCell(`D${y}`).value = { formula: `Materiais!H${lin}` }; rs.getCell(`D${y}`).numFmt = '#,##0.00';
    rs.getCell(`E${y}`).value = { formula: `Materiais!K${lin}` };
    y++;
  }
  y++;
  titulo('Onde economizar (linha premium × econômica)');
  if (res.economia.itens.length) {
    cabec(['Item', 'Linha pesquisada → econômica', 'Economia (R$)', '', 'Ressalva']);
    const yE = y;
    for (const x of res.economia.itens) {
      rs.getCell(`A${y}`).value = x.descricao; rs.getCell(`B${y}`).value = `${x.de} → ${x.para}`; rs.getCell(`C${y}`).value = Math.round(x.economia * 100) / 100; rs.getCell(`C${y}`).numFmt = '#,##0.00'; rs.getCell(`E${y}`).value = x.ressalva;
      rs.getCell(`C${y}`).font = { color: { argb: AZUL } };
      y++;
    }
    rs.getCell(`A${y}`).value = 'Economia total possível'; rs.getCell(`C${y}`).value = { formula: `SUM(C${yE}:C${y - 1})` }; rs.getCell(`C${y}`).numFmt = '#,##0.00'; rs.getRow(y).font = { bold: true }; y++;
    rs.getCell(`A${y}`).value = 'Linha econômica: menor robustez/vida útil — confirmar com o cliente antes de trocar.'; rs.getCell(`A${y}`).font = { size: 9, italic: true }; y += 2;
  } else { rs.getCell(`A${y}`).value = 'Sem alternativa econômica registrada para estes itens (registre na aprovação da pesquisa).'; rs.getCell(`A${y}`).font = { size: 9, italic: true }; y += 2; }
  titulo('Mudanças em relação ao anteprojeto (equivalências)');
  if (res.mudancas.length) for (const t of res.mudancas) { rs.getCell(`A${y}`).value = t; y++; } else { rs.getCell(`A${y}`).value = 'Nenhuma: a pesquisa seguiu as referências do anteprojeto.'; y++; }
  y++;
  titulo('Itens cuja versão e preço dependem da Icc');
  rs.getCell(`A${y}`).value = res.dependeIcc.length ? `${res.dependeIcc.join(', ')} — confirmar a Icc no ${projeto.quadro?.origem || 'ponto de instalação'} antes de comprar.` : '—';
  rs.getColumn(1).alignment = { wrapText: true, vertical: 'top' };
  rs.getColumn(2).alignment = { wrapText: true, vertical: 'top' };
  timbrarPlanilha(rs, `${tagDe(projeto)} — Resumo da pesquisa de preços`);

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return { buffer, itens, resumo: res };
}

module.exports = { gerarPlanilhaPrecos, resolverPrecos, resumir, semelhanca, ORIGENS, GRUPOS };
