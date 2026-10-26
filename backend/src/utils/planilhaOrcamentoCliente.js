// Planilha Excel do orçamento para o cliente, no modelo que a H&M já usa
// (planilha de orçamento de referência da H&M): Instruções, Parâmetros, Orçamento,
// Resumo, Quantitativos, Pesquisa de Preços — mais Fornecedores e Cronograma
// (pedido do usuário, 25/10/2026). Tudo com FÓRMULAS: o cliente/equipe muda um
// parâmetro ou um preço e a planilha recalcula. Com os parâmetros padrão, o
// total fecha com o da proposta (mesma regra de calculoProposta.js: BDI sobre
// material + mão de obra, imposto de venda sobre material e de serviço sobre
// mão de obra).
const ExcelJS = require('exceljs');
const pool = require('../config/database');
const { ehMaoDeObra, bdiMateriaisDefinido } = require('./calculoProposta');
const { calcularCurvaAbc, LIMITES_CURVA_ABC } = require('./curvaAbc'); // aba Curva ABC (2.0, Fase 3F)
const { formulaDuracaoExcel, ETAPA_MOBILIZACAO, ETAPA_ENTREGA } = require('./duracaoCronograma'); // regra de duração compartilhada com o cronograma da obra (2.0)

const AZUL = { color: { argb: 'FF1F4E9E' } }; // fonte azul = valor digitado (convenção da planilha H&M)
const CAB = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1F1F' } };
const DOURADO = { color: { argb: 'FFC9A227' }, bold: true };
const MOEDA = '"R$" #,##0.00';
const PCT = '0.00%';

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

async function carregarDados(propostaId) {
  const { rows: [p] } = await pool.query('SELECT * FROM propostas WHERE id = $1', [propostaId]);
  if (!p) return null;
  const secoes = (await pool.query('SELECT id, nome, ordem FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem, id', [propostaId])).rows;
  const itens = (await pool.query(
    `SELECT i.*, m.marca, m.origem AS origem_material, m.preco_manual
       FROM proposta_itens i LEFT JOIN materiais m ON m.id = i.material_id
      WHERE i.proposta_id = $1 ORDER BY i.secao_id, i.id`, [propostaId])).rows;
  // última pesquisa de mercado estruturada de cada descrição (ofertas com link)
  const descricoes = [...new Set(itens.map(i => norm(i.descricao)))];
  const pesquisas = descricoes.length ? (await pool.query(
    `SELECT DISTINCT ON (descricao_normalizada) descricao_normalizada, ofertas, fonte, criado_em
       FROM pesquisas_mercado WHERE descricao_normalizada = ANY($1) AND ofertas IS NOT NULL
      ORDER BY descricao_normalizada, criado_em DESC`, [descricoes])).rows : [];
  const pesquisaPor = new Map(pesquisas.map(r => [r.descricao_normalizada, r]));
  return { p, secoes, itens, pesquisaPor };
}

function cabecalho(ws, linha, titulos) {
  const r = ws.getRow(linha);
  titulos.forEach((t, i) => { const c = r.getCell(i + 1); c.value = t; c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = CAB; c.alignment = { vertical: 'middle', wrapText: true }; });
  r.height = 30;
}

// ── Curva ABC ── (2.0, Fase 3F) Ordem e agrupamento pela mesma regra do PDF e
// da tela (utils/curvaAbc.js); o valor de cada linha é FÓRMULA que soma o
// total do item na aba Orçamento, e %, % acumulado e classe também são
// fórmulas, com os limites das classes em células azuis. Mudou preço ou
// quantidade? Os valores recalculam; para reordenar, classifique a tabela
// pela coluna "Valor total" (maior para menor).
function montarAbaCurvaAbc(ws, { itens, secoes, linhaNoOrcamento }) {
  const curva = calcularCurvaAbc(itens.map(it => ({
    descricao: it.descricao, quantidade: it.quantidade, unidade: it.unidade, valor_unitario: it.valor_unitario, codigo: it.codigo,
    tipo: ehMaoDeObra(secoes.find(s => s.id === it.secao_id)?.nome || '') ? 'servico' : 'material',
  })));
  ws.columns = [7, 70, 11, 12, 8, 17, 11, 13, 9, 14].map(w => ({ width: w }));
  ws.getCell('A1').value = 'CURVA ABC DO ORÇAMENTO';
  ws.getCell('A1').font = { bold: true, size: 13 };
  ws.getCell('B2').value = 'Limite da classe A (% acumulado do valor)';
  ws.getCell('B3').value = 'Limite da classe B (% acumulado do valor)';
  const limA = ws.getCell('D2'); limA.value = LIMITES_CURVA_ABC.A / 100; limA.numFmt = PCT; limA.font = AZUL;
  const limB = ws.getCell('D3'); limB.value = LIMITES_CURVA_ABC.B / 100; limB.numFmt = PCT; limB.font = AZUL;
  ws.getCell('F2').value = 'Custo direto (sem BDI e impostos). A classe vem do acumulado ANTES do item: o item que cruza o limite ainda entra na classe de cima.';
  ws.getCell('F2').font = { italic: true, color: { argb: 'FF777777' } };
  cabecalho(ws, 5, ['#', 'Item', 'Tipo', 'Qtd.', 'Un.', 'Valor total', '%', '% acumulado', 'Classe', 'Linhas no Orçamento']);
  const ini = 6;
  const fim = ini + curva.itens.length - 1;
  const linhaTotal = fim + 1;
  const totalRef = `$F$${linhaTotal}`;
  curva.itens.forEach((l, k) => {
    const r = ini + k;
    const L = ws.getRow(r);
    const linhasOrc = l.origens.map(i => linhaNoOrcamento.get(itens[i].id)).filter(Boolean);
    L.getCell(1).value = l.posicao;
    L.getCell(2).value = l.descricao;
    L.getCell(3).value = l.tipo === 'servico' ? 'Serviço' : 'Material';
    L.getCell(4).value = linhasOrc.length ? { formula: linhasOrc.map(x => `Orçamento!F${x}`).join('+') } : l.quantidade;
    L.getCell(5).value = l.unidade || '';
    L.getCell(6).value = linhasOrc.length ? { formula: linhasOrc.map(x => `Orçamento!L${x}`).join('+'), result: l.total } : l.total;
    L.getCell(7).value = { formula: `IF(${totalRef}=0,0,F${r}/${totalRef})` };
    L.getCell(8).value = { formula: `IF(${totalRef}=0,0,SUM($F$${ini}:F${r})/${totalRef})` };
    L.getCell(9).value = { formula: `IF(ROUND(H${r}-G${r},9)<$D$2,"A",IF(ROUND(H${r}-G${r},9)<$D$3,"B","C"))` };
    L.getCell(9).alignment = { horizontal: 'center' };
    L.getCell(9).font = { bold: true };
    L.getCell(10).value = linhasOrc.join(', ');
    L.getCell(6).numFmt = MOEDA;
    [7, 8].forEach(c => { L.getCell(c).numFmt = PCT; });
  });
  ws.getCell(linhaTotal, 2).value = 'TOTAL (custo direto)';
  ws.getCell(linhaTotal, 2).font = { bold: true };
  const ct = ws.getCell(linhaTotal, 6);
  ct.value = curva.itens.length ? { formula: `SUM(F${ini}:F${fim})` } : 0;
  ct.numFmt = MOEDA; ct.font = { bold: true };
  if (curva.itens.length) {
    // barras no próprio valor e cor por classe
    ws.addConditionalFormatting({ ref: `F${ini}:F${fim}`, rules: [{ type: 'dataBar', cfvo: [{ type: 'num', value: 0 }, { type: 'max' }], color: { argb: 'FFC9A227' }, gradient: false }] });
    ws.addConditionalFormatting({
      ref: `I${ini}:I${fim}`,
      rules: [
        { type: 'cellIs', operator: 'equal', formulae: ['"A"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF3E3A6' } } } },
        { type: 'cellIs', operator: 'equal', formulae: ['"B"'], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE4E4E4' } } } },
      ],
    });
  }
  // resumo por classe
  const lr = linhaTotal + 2;
  cabecalho(ws, lr, ['', 'Classe', 'Itens', '', '', 'Valor', '% do total']);
  ['A', 'B', 'C'].forEach((c, i) => {
    const r = lr + 1 + i;
    ws.getCell(r, 2).value = `Classe ${c}`;
    ws.getCell(r, 3).value = { formula: curva.itens.length ? `COUNTIF($I$${ini}:$I$${fim},"${c}")` : '0' };
    ws.getCell(r, 6).value = { formula: curva.itens.length ? `SUMIF($I$${ini}:$I$${fim},"${c}",$F$${ini}:$F$${fim})` : '0' };
    ws.getCell(r, 6).numFmt = MOEDA;
    ws.getCell(r, 7).value = { formula: `IF(${totalRef}=0,0,F${r}/${totalRef})` };
    ws.getCell(r, 7).numFmt = PCT;
  });
  ws.views = [{ state: 'frozen', ySplit: 5 }];
}

async function gerarPlanilhaCliente(propostaId) {
  const dados = await carregarDados(propostaId);
  if (!dados) return null;
  const { p, secoes, itens, pesquisaPor } = dados;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'H&M Engenharia e Tecnologia';
  wb.created = new Date();

  // abas criadas já na ordem da planilha de referência
  const [wsI, wsP, wsO, wsR, wsT, wsQ, wsF, wsC] = ['Instruções', 'Parâmetros', 'Orçamento', 'Resumo', 'Quantitativos', 'Pesquisa de Preços', 'Fornecedores', 'Cronograma']
    .map(n => wb.addWorksheet(n));

  // ── Instruções ──
  wsI.columns = [{ width: 150 }];
  [
    ['COMO USAR ESTA PLANILHA', true],
    [''],
    ['1. Parâmetros: cliente, BDI, impostos, custo do homem-hora, tamanho da equipe e data de início da obra. Tudo o mais recalcula.'],
    ['2. Pesquisa de Preços: cada material tem até 3 fontes (loja, preço, link). Critério MÉDIA, MÍNIMO ou MANUAL — em MANUAL vale o preço digitado (padrão = preço da proposta).'],
    ['3. Orçamento: quantidades e preços de mão de obra em azul podem ser alterados; o preço do material vem da Pesquisa de Preços pelo ID.'],
    ['4. Resumo: totais por sistema, BDI e impostos (mesma regra da proposta em PDF) e preço final.'],
    ['5. Quantitativos: itens medidos (metros, caixas, bobinas) com a origem da quantidade.'],
    ['6. Fornecedores: lojas e distribuidores das pesquisas de preço, com os itens cotados em cada um.'],
    ['7. Cronograma: duração de cada sistema = mão de obra ÷ (custo do homem-hora × equipe × 8 h), em dias úteis a partir da data de início.'],
    ['8. Curva ABC: itens do maior para o menor valor, com % do total, % acumulado e classe (A até 80 %, B até 95 %, C o resto — limites na própria aba).'],
    [''],
    ['CONVENÇÕES', true],
    ['Fonte azul = valor digitado (pode alterar)   |   Fonte preta = fórmula (não altere)'],
    [''],
    ['OBSERVAÇÕES', true],
    ['• Preços de pesquisa de mercado são de varejo online na data da pesquisa — confirme com o fornecedor antes da compra.'],
    ['• Quantidades estimadas a partir do projeto: confirme no projeto executivo / medição em campo.'],
    ['• Não inclui obras civis, forros, pinturas e itens não listados, salvo indicação.'],
  ].forEach(([t, negrito], i) => { const c = wsI.getCell(i + 1, 1); c.value = t; if (negrito) c.font = { bold: true }; c.alignment = { wrapText: true }; });

  // ── Parâmetros ──
  wsP.columns = [{ width: 42 }, { width: 50 }, { width: 70 }];
  wsP.getCell('A1').value = 'PARÂMETROS DO ORÇAMENTO';
  wsP.getCell('A1').font = { bold: true, size: 13 };
  const inicioPadrao = new Date(); inicioPadrao.setDate(inicioPadrao.getDate() + 15);
  const parametros = [
    ['Cliente', p.cliente_nome || ''],
    ['Obra / local', p.local_obra || ''],
    ['Proposta', p.numero],
    ['Data da proposta', p.data ? new Date(p.data) : new Date(), 'dd/mm/yyyy'],
    ['Validade da proposta (dias)', Number(p.validade) || 15],
    ['BDI (administração, lucro, riscos)', (Number(p.bdi) || 0) / 100, PCT, 'Sobre material + mão de obra (mesma regra da proposta).'],
    ['Imposto sobre a venda de material', (Number(p.imposto_venda) || 0) / 100, PCT, 'Sobre o material.'],
    ['Imposto sobre serviço', (Number(p.imposto_servico) || 0) / 100, PCT, 'Sobre a mão de obra.'],
    ['Custo do homem-hora (R$)', 65, MOEDA, '[CONFERIR] Usado só para estimar a duração no Cronograma.'],
    ['Equipe em campo (pessoas)', 2, '0', 'Cronograma.'],
    ['Data de início da obra', inicioPadrao, 'dd/mm/yyyy', 'Cronograma (dias úteis, de segunda a sexta).'],
    // BDI diferenciado dos materiais (2.0, Fase 3F — fórmula do TCU): sem ele,
    // a célula é uma fórmula igual ao BDI (= a conta de sempre)
    ['BDI dos materiais (diferenciado)', bdiMateriaisDefinido(p.bdi_materiais) ? Number(p.bdi_materiais) / 100 : { formula: 'B8' }, PCT,
      bdiMateriaisDefinido(p.bdi_materiais) ? 'BDI reduzido para fornecimento de materiais (Acórdão 2.622/2013-TCU). O BDI acima vale para a mão de obra.' : 'Igual ao BDI (proposta sem BDI diferenciado). Digite um percentual para usar um BDI reduzido nos materiais.'],
  ];
  parametros.forEach(([rot, val, fmt, obs], i) => {
    const r = i + 3;
    wsP.getCell(r, 1).value = rot;
    const c = wsP.getCell(r, 2); c.value = val; c.font = val && val.formula ? {} : AZUL; if (fmt) c.numFmt = fmt;
    if (obs) wsP.getCell(r, 3).value = obs;
  });
  const P_ = {}; // nome → referência absoluta
  ['cliente', 'obra', 'proposta', 'data', 'validade', 'bdi', 'impVenda', 'impServico', 'custoHH', 'equipe', 'inicio', 'bdiMat'].forEach((k, i) => { P_[k] = `Parâmetros!$B$${i + 3}`; });

  // ── Pesquisa de Preços ── (um ID por material)
  wsQ.columns = [7, 52, 22, 13, 30, 22, 13, 30, 22, 13, 30, 13, 13, 13, 11, 13, 15, 50].map(w => ({ width: w }));
  wsQ.getCell('A1').value = 'PESQUISA DE PREÇOS DE MERCADO';
  wsQ.getCell('A1').font = { bold: true, size: 13 };
  cabecalho(wsQ, 3, ['ID', 'Item', 'Fonte 1', 'Preço 1', 'Link 1', 'Fonte 2', 'Preço 2', 'Link 2', 'Fonte 3', 'Preço 3', 'Link 3', 'Média', 'Mínimo', 'Máximo', 'Critério', 'Preço manual', 'PREÇO ADOTADO', 'Observação']);
  const fornecedores = new Map(); // fonte → [{ item, preco, link }]
  const idPorItem = new Map();
  const materiais = itens.filter(i => !ehMaoDeObra(secoes.find(s => s.id === i.secao_id)?.nome || ''));
  materiais.forEach((it, k) => {
    const id = `P${String(k + 1).padStart(3, '0')}`;
    idPorItem.set(it.id, id);
    const r = k + 4;
    const pesq = pesquisaPor.get(norm(it.descricao));
    const ofertas = (pesq?.ofertas || []).filter(o => o.mesmo_item !== false).slice(0, 3);
    const linha = wsQ.getRow(r);
    linha.getCell(1).value = id;
    linha.getCell(2).value = it.descricao;
    ofertas.forEach((o, j) => {
      linha.getCell(3 + j * 3).value = o.fonte;
      const cp = linha.getCell(4 + j * 3); cp.value = o.preco; cp.numFmt = MOEDA;
      if (o.link) { const cl = linha.getCell(5 + j * 3); cl.value = { text: 'abrir', hyperlink: o.link }; cl.font = { color: { argb: 'FF1155CC' }, underline: true }; }
      (fornecedores.get(o.fonte) || fornecedores.set(o.fonte, []).get(o.fonte)).push({ item: it.descricao, preco: o.preco, link: o.link });
    });
    const precos = `D${r},G${r},J${r}`;
    linha.getCell(12).value = { formula: `IF(COUNT(${precos})=0,"",AVERAGE(${precos}))` };
    linha.getCell(13).value = { formula: `IF(COUNT(${precos})=0,"",MIN(${precos}))` };
    linha.getCell(14).value = { formula: `IF(COUNT(${precos})=0,"",MAX(${precos}))` };
    // padrão MANUAL = preço da proposta (a planilha fecha com o PDF); trocar para MÉDIA/MÍNIMO usa as fontes
    const crit = linha.getCell(15); crit.value = 'MANUAL'; crit.font = AZUL;
    crit.dataValidation = { type: 'list', allowBlank: false, formulae: ['"MÉDIA,MÍNIMO,MANUAL"'] };
    const man = linha.getCell(16); man.value = Number(it.valor_unitario) || 0; man.numFmt = MOEDA; man.font = AZUL;
    const adot = linha.getCell(17);
    adot.value = { formula: `IF(O${r}="MANUAL",P${r},IF(O${r}="MÍNIMO",M${r},L${r}))` };
    adot.numFmt = MOEDA; adot.font = { bold: true };
    [12, 13, 14].forEach(c => { linha.getCell(c).numFmt = MOEDA; });
    linha.getCell(18).value = ofertas.length
      ? `Pesquisa ${pesq.fonte === 'claude_max' ? 'Claude Max' : pesq.fonte} em ${new Date(pesq.criado_em).toLocaleDateString('pt-BR')}`
      : (Number(it.valor_unitario) > 0 ? 'Preço do catálogo H&M / proposta' : 'A cotar — sem preço');
  });
  const ultimaQ = materiais.length + 3;

  // ── Orçamento ──
  wsO.columns = [7, 30, 60, 28, 8, 9, 10, 15, 15, 16, 16, 17, 28, 40].map(w => ({ width: w }));
  wsO.getCell('A1').value = 'H&M ENGENHARIA – PLANILHA ORÇAMENTÁRIA';
  wsO.getCell('A1').font = { bold: true, size: 13 };
  wsO.getCell('A2').value = { formula: `"Cliente: "&${P_.cliente}&"   |   Obra: "&${P_.obra}&"   |   Proposta "&${P_.proposta}` };
  cabecalho(wsO, 4, ['Item', 'Sistema', 'Descrição', 'Fabricante / modelo', 'Un.', 'Qtd.', 'ID pesquisa', 'P. unit. material', 'P. unit. mão de obra', 'Total material', 'Total mão de obra', 'Total do item', 'Origem do preço', 'Observações']);
  // agrupa por sistema (subgrupo; sem subgrupo = nome da seção)
  const sistemaDe = (it) => it.subgrupo || secoes.find(s => s.id === it.secao_id)?.nome || 'Geral';
  const sistemas = [...new Set(itens.map(sistemaDe))];
  let r = 5;
  const subtotais = [];
  const linhaNoOrcamento = new Map(); // id do item → linha na aba Orçamento
  sistemas.forEach((sis, n) => {
    const nomeSis = `${n + 1}. ${sis}`;
    const t = wsO.getCell(r, 1); t.value = nomeSis.toUpperCase(); t.font = DOURADO;
    r++;
    const ini = r;
    itens.filter(it => sistemaDe(it) === sis).forEach((it, k) => {
      const mo = ehMaoDeObra(secoes.find(s => s.id === it.secao_id)?.nome || '');
      const L = wsO.getRow(r);
      linhaNoOrcamento.set(it.id, r); // a aba Curva ABC soma o total do item desta linha
      L.getCell(1).value = `${n + 1}.${k + 1}`;
      L.getCell(2).value = nomeSis;
      L.getCell(3).value = it.descricao;
      L.getCell(4).value = [it.marca, it.codigo && !mo ? it.codigo : null].filter(Boolean).join(' ') || '—';
      L.getCell(5).value = it.unidade || 'un';
      const q = L.getCell(6); q.value = Number(it.quantidade) || 0; q.font = AZUL;
      if (mo) {
        L.getCell(8).value = 0;
        const v = L.getCell(9); v.value = Number(it.valor_unitario) || 0; v.font = AZUL;
        L.getCell(13).value = it.status === 'a_cotar' ? 'A cotar' : 'Mão de obra H&M';
      } else {
        const id = idPorItem.get(it.id);
        L.getCell(7).value = id;
        L.getCell(8).value = { formula: `IFERROR(INDEX('Pesquisa de Preços'!$Q$4:$Q$${ultimaQ},MATCH(G${r},'Pesquisa de Preços'!$A$4:$A$${ultimaQ},0)),0)` };
        L.getCell(9).value = 0;
        L.getCell(13).value = { formula: `IFERROR(INDEX('Pesquisa de Preços'!$O$4:$O$${ultimaQ},MATCH(G${r},'Pesquisa de Preços'!$A$4:$A$${ultimaQ},0)),"")` };
      }
      L.getCell(10).value = { formula: `F${r}*H${r}` };
      L.getCell(11).value = { formula: `F${r}*I${r}` };
      L.getCell(12).value = { formula: `J${r}+K${r}` };
      [8, 9, 10, 11, 12].forEach(c => { L.getCell(c).numFmt = MOEDA; });
      if (it.status === 'a_cotar') L.getCell(14).value = 'Preço a confirmar';
      r++;
    });
    const fim = r - 1;
    const S = wsO.getRow(r);
    S.getCell(3).value = `Subtotal – ${nomeSis}`;
    S.getCell(3).font = { bold: true };
    ['J', 'K', 'L'].forEach((col, j) => { const c = S.getCell(10 + j); c.value = { formula: `SUM(${col}${ini}:${col}${fim})` }; c.numFmt = MOEDA; c.font = { bold: true }; });
    subtotais.push({ nome: nomeSis, linha: r });
    r += 2;
  });
  const linhaTotalO = r;
  wsO.getCell(r, 3).value = 'TOTAL CUSTO DIRETO';
  wsO.getCell(r, 3).font = { bold: true };
  ['J', 'K', 'L'].forEach((col, j) => { const c = wsO.getCell(r, 10 + j); c.value = { formula: subtotais.map(s => `${col}${s.linha}`).join('+') || '0' }; c.numFmt = MOEDA; c.font = { bold: true }; });
  wsO.views = [{ state: 'frozen', ySplit: 4 }];
  wsO.autoFilter = { from: 'A4', to: 'N4' };

  // ── Resumo ──
  wsR.columns = [{ width: 50 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 14 }];
  wsR.getCell('A1').value = 'RESUMO DO ORÇAMENTO';
  wsR.getCell('A1').font = { bold: true, size: 13 };
  wsR.getCell('A2').value = { formula: `"Cliente: "&${P_.cliente}&"  |  Obra: "&${P_.obra}` };
  cabecalho(wsR, 4, ['Sistema', 'Material', 'Mão de obra', 'Custo direto', '% do total']);
  const ultimoSis = 4 + subtotais.length;
  subtotais.forEach((s, i) => {
    const l = 5 + i;
    wsR.getCell(l, 1).value = s.nome;
    wsR.getCell(l, 2).value = { formula: `SUMIF(Orçamento!$B:$B,$A${l},Orçamento!$J:$J)` };
    wsR.getCell(l, 3).value = { formula: `SUMIF(Orçamento!$B:$B,$A${l},Orçamento!$K:$K)` };
    wsR.getCell(l, 4).value = { formula: `B${l}+C${l}` };
    wsR.getCell(l, 5).value = { formula: `IF($D$${ultimoSis + 1}=0,0,D${l}/$D$${ultimoSis + 1})` };
  });
  const lt = ultimoSis + 1;
  wsR.getCell(lt, 1).value = 'TOTAL CUSTO DIRETO';
  ['B', 'C', 'D', 'E'].forEach((col, j) => { wsR.getCell(lt, 2 + j).value = { formula: `SUM(${col}5:${col}${ultimoSis})` }; });
  wsR.getCell(lt + 1, 1).value = 'Conferência com a aba Orçamento (deve dar 0)';
  wsR.getCell(lt + 1, 4).value = { formula: `D${lt}-Orçamento!L${linhaTotalO}` };
  const linhasR = [
    // material × BDI dos materiais + mão de obra × BDI; sem BDI diferenciado
    // o dos materiais é igual ao BDI e a conta é a de sempre (custo direto × BDI)
    [bdiMateriaisDefinido(p.bdi_materiais) ? 'BDI (materiais com BDI diferenciado + mão de obra)' : 'BDI', `B${lt}*${P_.bdiMat}+C${lt}*${P_.bdi}`],
    ['Imposto sobre a venda de material', `B${lt}*${P_.impVenda}`],
    ['Imposto sobre serviço', `C${lt}*${P_.impServico}`],
  ];
  linhasR.forEach(([rot, f], i) => { wsR.getCell(lt + 3 + i, 1).value = rot; wsR.getCell(lt + 3 + i, 4).value = { formula: f }; });
  const lf = lt + 3 + linhasR.length;
  wsR.getCell(lf, 1).value = 'PREÇO FINAL DA PROPOSTA';
  wsR.getCell(lf, 1).font = DOURADO;
  wsR.getCell(lf, 4).value = { formula: `D${lt}+D${lt + 3}+D${lt + 4}+D${lt + 5}` };
  wsR.getCell(lf, 4).font = { bold: true };
  for (let l = 5; l <= lf; l++) { [2, 3, 4].forEach(c => { wsR.getCell(l, c).numFmt = MOEDA; }); wsR.getCell(l, 5).numFmt = PCT; }
  wsR.getCell(lf + 2, 1).value = `Total da proposta ${p.numero} no sistema: R$ ${Number(p.total || 0).toFixed(2).replace('.', ',')} — com os parâmetros e preços padrão desta planilha, o preço final é o mesmo.`;
  wsR.getCell(lf + 2, 1).font = { italic: true, color: { argb: 'FF777777' } };

  // ── Quantitativos ── (itens medidos: metros, caixas, bobinas, barras)
  wsT.columns = [{ width: 60 }, { width: 14 }, { width: 10 }, { width: 50 }];
  wsT.getCell('A1').value = 'QUANTITATIVOS';
  wsT.getCell('A1').font = { bold: true, size: 13 };
  cabecalho(wsT, 3, ['Item', 'Quantidade', 'Unid.', 'Sistema']);
  itens.filter(i => /^(m|ml|m²|m2|cx|bobina|barra|rl|kg)$/i.test(String(i.unidade || '').trim())).forEach((it, k) => {
    wsT.getRow(4 + k).values = [it.descricao, Number(it.quantidade) || 0, it.unidade, sistemaDe(it)];
  });

  // ── Fornecedores ──
  wsF.columns = [{ width: 34 }, { width: 60 }, { width: 15 }, { width: 60 }];
  wsF.getCell('A1').value = 'FORNECEDORES PESQUISADOS';
  wsF.getCell('A1').font = { bold: true, size: 13 };
  cabecalho(wsF, 3, ['Fornecedor / loja', 'Item cotado', 'Preço', 'Link']);
  let rf = 4;
  [...fornecedores.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).forEach(([fonte, lista]) => {
    lista.forEach((x, i) => {
      const L = wsF.getRow(rf++);
      L.getCell(1).value = i === 0 ? fonte : '';
      if (i === 0) L.getCell(1).font = { bold: true };
      L.getCell(2).value = x.item;
      L.getCell(3).value = x.preco; L.getCell(3).numFmt = MOEDA;
      if (x.link) { L.getCell(4).value = { text: x.link, hyperlink: x.link }; L.getCell(4).font = { color: { argb: 'FF1155CC' }, underline: true }; }
    });
  });
  if (rf === 4) wsF.getCell('A4').value = 'Nenhuma pesquisa de mercado estruturada para os itens desta proposta — use "Pesquisar mercado" na Análise de Projeto.';

  // ── Cronograma ── (sequencial por sistema; dias úteis)
  const SEMANAS = 16;
  wsC.columns = [{ width: 40 }, { width: 16 }, { width: 12 }, { width: 13 }, { width: 13 }, ...Array.from({ length: SEMANAS }, () => ({ width: 5 }))];
  wsC.getCell('A1').value = 'CRONOGRAMA FÍSICO (estimado)';
  wsC.getCell('A1').font = { bold: true, size: 13 };
  wsC.getCell('A2').value = 'Duração = mão de obra do sistema ÷ (custo do homem-hora × equipe × 8 h), mínimo 1 dia útil. Ajuste custo do homem-hora, equipe e início na aba Parâmetros.';
  wsC.getCell('A2').font = { italic: true, color: { argb: 'FF777777' } };
  cabecalho(wsC, 4, ['Etapa', 'Mão de obra (R$)', 'Dias úteis', 'Início', 'Término', ...Array.from({ length: SEMANAS }, (_, i) => `S${i + 1}`)]);
  const etapas = [{ nome: ETAPA_MOBILIZACAO.nome, fixo: ETAPA_MOBILIZACAO.dias }, ...subtotais.map(s => ({ nome: s.nome, sistema: s.nome })), { nome: ETAPA_ENTREGA.nome, fixo: ETAPA_ENTREGA.dias }];
  etapas.forEach((e, i) => {
    const l = 5 + i;
    wsC.getCell(l, 1).value = e.nome;
    if (e.sistema) {
      wsC.getCell(l, 2).value = { formula: `SUMIF(Orçamento!$B:$B,A${l},Orçamento!$K:$K)` };
      wsC.getCell(l, 3).value = { formula: formulaDuracaoExcel(`B${l}`, P_.custoHH, P_.equipe) };
    } else {
      wsC.getCell(l, 3).value = e.fixo; wsC.getCell(l, 3).font = AZUL;
    }
    wsC.getCell(l, 2).numFmt = MOEDA;
    wsC.getCell(l, 4).value = { formula: i === 0 ? `WORKDAY(${P_.inicio}-1,1)` : `WORKDAY(E${l - 1},1)` };
    wsC.getCell(l, 5).value = { formula: `WORKDAY(D${l},C${l}-1)` };
    [4, 5].forEach(c => { wsC.getCell(l, c).numFmt = 'dd/mm/yyyy'; });
  });
  const lu = 4 + etapas.length;
  wsC.getCell(lu + 1, 1).value = 'PRAZO TOTAL (dias úteis)';
  wsC.getCell(lu + 1, 1).font = { bold: true };
  wsC.getCell(lu + 1, 3).value = { formula: `NETWORKDAYS(D5,E${lu})` };
  wsC.getCell(lu + 2, 1).value = 'Término previsto';
  wsC.getCell(lu + 2, 5).value = { formula: `E${lu}` };
  wsC.getCell(lu + 2, 5).numFmt = 'dd/mm/yyyy';
  // Gantt: a semana k (a partir do início) acende quando cruza o período da etapa
  const primeiraSemana = 'F';
  const ultimaSemana = wsC.getColumn(5 + SEMANAS).letter;
  wsC.addConditionalFormatting({
    ref: `${primeiraSemana}5:${ultimaSemana}${lu}`,
    rules: [{ type: 'expression', formulae: [`AND(${P_.inicio}+(COLUMN()-6)*7<=$E5,${P_.inicio}+(COLUMN()-5)*7-1>=$D5)`], style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFC9A227' } } } }],
  });

  // ── Curva ABC ── (2.0, Fase 3F) — aba logo depois do Resumo
  const wsAbc = wb.addWorksheet('Curva ABC');
  wsAbc.orderNo = wsR.orderNo + 0.5;
  montarAbaCurvaAbc(wsAbc, { itens, secoes, linhaNoOrcamento });

  return { buffer: await wb.xlsx.writeBuffer(), proposta: p };
}

module.exports = { gerarPlanilhaCliente };
