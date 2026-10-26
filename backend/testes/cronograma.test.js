// Cronograma físico-financeiro e medições (versão 2.0, Fase 3G):
// utils/duracaoCronograma.js (regra de duração compartilhada com a planilha do
// cliente) e utils/cronograma.js (geração, distribuição, curva S, desvio,
// boletim). Também confere que a aba "Cronograma" da planilha do cliente
// continua usando a mesma regra (com o banco simulado). Rodar: npm test.
const assert = require('assert');
const path = require('path');

// banco simulado para a planilha (não conecta no PostgreSQL)
const dadosFalsos = {
  proposta: { id: 1, numero: 'P900', data: '2026-10-20', validade: 15, cliente_nome: 'Cliente Teste', local_obra: 'Obra Teste', bdi: 20, imposto_venda: 10, imposto_servico: 5, total: 6400 },
  secoes: [{ id: 1, nome: 'Materiais', ordem: 1 }, { id: 2, nome: 'Mão de obra', ordem: 2 }],
  itens: [
    { id: 11, secao_id: 1, descricao: 'Câmera IP', quantidade: 2, valor_unitario: 500, valor_total: 1000, subgrupo: 'CFTV', unidade: 'un', status: 'confirmado' },
    { id: 12, secao_id: 1, descricao: 'Cabo Cat6', quantidade: 4, valor_unitario: 500, valor_total: 2000, subgrupo: 'Rede', unidade: 'cx', status: 'confirmado' },
    { id: 21, secao_id: 2, descricao: 'Instalação de câmeras', quantidade: 1, valor_unitario: 500, valor_total: 500, subgrupo: 'CFTV', unidade: 'vb', status: 'confirmado' },
    { id: 22, secao_id: 2, descricao: 'Lançamento de cabos', quantidade: 1, valor_unitario: 1500, valor_total: 1500, subgrupo: 'Rede', unidade: 'vb', status: 'confirmado' },
  ],
};
require.cache[require.resolve('../src/config/database')] = {
  id: 'db-falso', filename: 'db-falso', loaded: true,
  exports: {
    query: async (sql) => {
      if (/FROM propostas WHERE id/i.test(sql)) return { rows: [dadosFalsos.proposta] };
      if (/FROM proposta_secoes/i.test(sql)) return { rows: dadosFalsos.secoes };
      if (/FROM proposta_itens/i.test(sql)) return { rows: dadosFalsos.itens };
      return { rows: [] };
    },
    connect: async () => { throw new Error('sem banco no teste'); },
  },
};

const D = require('../src/utils/duracaoCronograma');
const C = require('../src/utils/cronograma');

let ok = 0;
const caso = (nome, fn) => { try { fn(); ok++; } catch (e) { console.error(`FALHOU: ${nome}`); throw e; } };

// ── duração (regra da planilha) ────────────────────────────────────────
caso('duração = MO ÷ (homem-hora × equipe × 8 h), para cima, mínimo 1', () => {
  assert.strictEqual(D.duracaoDiasUteis(1040, 65, 2), 1); // exato: 1 dia
  assert.strictEqual(D.duracaoDiasUteis(1041, 65, 2), 2);
  assert.strictEqual(D.duracaoDiasUteis(1500, 65, 2), 2);
  assert.strictEqual(D.duracaoDiasUteis(0, 65, 2), 1);
  assert.strictEqual(D.duracaoDiasUteis(10400, 65, 2), 10);
  assert.strictEqual(D.duracaoDiasUteis(5200, 65, 1), 10);
  assert.strictEqual(D.duracaoDiasUteis(5000), D.duracaoDiasUteis(5000, D.CUSTO_HH_PADRAO, D.EQUIPE_PADRAO));
  assert.strictEqual(D.duracaoDiasUteis(5000, 0, 2), 1);
});

caso('a fórmula Excel é a mesma que a planilha usava antes da extração', () => {
  assert.strictEqual(D.formulaDuracaoExcel('B7', 'Parâmetros!$B$11', 'Parâmetros!$B$12'),
    'MAX(1,ROUNDUP(B7/(Parâmetros!$B$11*Parâmetros!$B$12*8),0))');
});

caso('dias úteis: WORKDAY e sequência como na aba Cronograma', () => {
  assert.strictEqual(D.isoData(D.workday('2026-10-30', 1)), '2026-11-02'); // sexta + 1 = segunda
  assert.strictEqual(D.isoData(D.primeiroDiaUtil('2026-10-31')), '2026-11-02'); // sábado → segunda
  assert.strictEqual(D.isoData(D.primeiroDiaUtil('2026-11-04')), '2026-11-04');
  const seq = D.sequenciarDiasUteis([{ dias: 1 }, { dias: 3 }, { dias: 2 }], '2026-10-31');
  assert.deepStrictEqual(seq.map(e => [e.inicio, e.fim]), [
    ['2026-11-02', '2026-11-02'], ['2026-11-03', '2026-11-05'], ['2026-11-06', '2026-11-09'],
  ]);
  assert.strictEqual(C.diasUteisEntre('2026-11-02', '2026-11-13'), 10);
});

// ── períodos e distribuição ────────────────────────────────────────────
caso('períodos mensais e semanais', () => {
  assert.strictEqual(C.inicioPeriodo('2026-10-25', 'mensal'), '2026-10-01');
  assert.strictEqual(C.inicioPeriodo('2026-10-25', 'semanal'), '2026-10-19'); // domingo → segunda anterior
  assert.strictEqual(C.inicioPeriodo('2026-10-26', 'semanal'), '2026-10-26');
  assert.deepStrictEqual(C.periodosEntre('2026-10-15', '2027-01-03', 'mensal'), ['2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01']);
  assert.strictEqual(C.fimPeriodo('2026-02-01', 'mensal'), '2026-02-28');
  assert.strictEqual(C.rotuloPeriodo('2026-11-01', 'mensal'), 'nov/2026');
  assert.strictEqual(C.rotuloPeriodo('2026-10-26', 'semanal', 0), 'S1 · 26/10');
});

caso('distribuição linear pelos dias úteis de cada período, somando 100%', () => {
  const m = C.distribuirLinear('2026-10-26', '2026-11-13', 'mensal'); // 5 dias em out, 10 em nov
  assert.deepStrictEqual(m.map(x => x.periodo), ['2026-10-01', '2026-11-01']);
  assert.deepStrictEqual(m.map(x => x.percentual), [33.33, 66.67]);
  const s = C.distribuirLinear('2026-10-26', '2026-11-13', 'semanal');
  assert.strictEqual(s.length, 3);
  assert.strictEqual(Math.round(s.reduce((a, x) => a + x.percentual, 0) * 100) / 100, 100);
  assert.deepStrictEqual(C.distribuirLinear('2026-11-02', '2026-11-02', 'mensal'), [{ periodo: '2026-11-01', percentual: 100 }]);
  assert.deepStrictEqual(C.distribuirLinear(null, null), []);
});

// ── geração a partir da proposta ───────────────────────────────────────
caso('etapas por sistema com BDI e impostos rateados: soma = total da proposta', () => {
  const { etapas, totais } = C.etapasDaProposta(dadosFalsos);
  assert.strictEqual(totais.total, 6400); // 5000 + BDI 1000 + venda 300 + serviço 100
  assert.deepStrictEqual(etapas.map(e => e.nome), ['CFTV', 'Rede']);
  // material leva BDI proporcional + imposto de venda (3900); MO o resto (2500)
  assert.deepStrictEqual(etapas.map(e => e.valor), [1925, 4475]);
  assert.deepStrictEqual(etapas.map(e => e.mao_obra), [500, 1500]);
  assert.strictEqual(etapas.reduce((s, e) => s + e.valor, 0), totais.total);
});

caso('arredondamento: soma das etapas fecha centavo a centavo com o total', () => {
  const props = { ...dadosFalsos, proposta: { ...dadosFalsos.proposta, bdi: 17.37, imposto_venda: 7.11, imposto_servico: 3.33 },
    itens: [...dadosFalsos.itens, { id: 13, secao_id: 1, descricao: 'x', quantidade: 3, valor_unitario: 33.33, subgrupo: 'Alarme' }] };
  const { etapas, totais } = C.etapasDaProposta(props);
  assert.strictEqual(Math.round(etapas.reduce((s, e) => s + e.valor, 0) * 100), Math.round(totais.total * 100));
});

caso('gerarCronograma: fixas + sistemas, duração da planilha, sequência em dias úteis', () => {
  const g = C.gerarCronograma({ ...dadosFalsos, dataInicio: '2026-10-30', periodicidade: 'mensal' });
  assert.deepStrictEqual(g.etapas.map(e => e.nome), [D.ETAPA_MOBILIZACAO.nome, 'CFTV', 'Rede', D.ETAPA_ENTREGA.nome]);
  assert.deepStrictEqual(g.etapas.map(e => e.dias_uteis), [1, 1, 2, 2]);
  assert.deepStrictEqual(g.etapas.map(e => [e.inicio, e.fim]), [
    ['2026-10-30', '2026-10-30'], ['2026-11-02', '2026-11-02'], ['2026-11-03', '2026-11-04'], ['2026-11-05', '2026-11-06'],
  ]);
  assert.deepStrictEqual(g.etapas[0].distribuicao, [{ periodo: '2026-10-01', percentual: 100 }]);
  assert.deepStrictEqual(g.etapas.map(e => e.valor), [0, 1925, 4475, 0]);
  const sem = C.gerarCronograma({ ...dadosFalsos, dataInicio: '2026-10-30', incluirEtapasFixas: false, custoHH: 65, equipe: 1 });
  assert.deepStrictEqual(sem.etapas.map(e => e.dias_uteis), [1, 3]);
  assert.strictEqual(sem.etapas[0].inicio, '2026-10-30');
});

// ── cálculo previsto × realizado ───────────────────────────────────────
const etapasCalc = [
  { id: 1, nome: 'Infra', valor: 1000, inicio: '2026-11-02', fim: '2026-11-27', distribuicao: [{ periodo: '2026-11-01', percentual: 100 }] },
  { id: 2, nome: 'Cabos', valor: 3000, inicio: '2026-11-16', fim: '2026-12-18', distribuicao: [{ periodo: '2026-11-01', percentual: 50 }, { periodo: '2026-12-01', percentual: 50 }] },
];
const medicoesCalc = [
  { id: 10, etapa_id: 1, periodo: '2026-11-01', percentual_acumulado: 100 },
  { id: 11, etapa_id: 2, periodo: '2026-11-01', percentual_acumulado: 20 },
  { id: 12, etapa_id: 2, periodo: '2026-11-01', percentual_acumulado: 40, substitui_id: 11 }, // correção
];

caso('pesos: por valor (padrão) e manual normalizado', () => {
  assert.deepStrictEqual(C.pesosEfetivos(etapasCalc), [25, 75]);
  assert.deepStrictEqual(C.pesosEfetivos([{ peso: 1 }, { peso: 3 }], 'manual'), [25, 75]);
  assert.deepStrictEqual(C.pesosEfetivos([{ valor: 0 }, { valor: 0 }]), [50, 50]);
});

caso('medição corrigida: a mais recente vale, a anterior fica no histórico', () => {
  const h = C.marcarHistorico(medicoesCalc);
  assert.deepStrictEqual(h.map(m => m.vigente), [true, false, true]);
});

caso('curva S, % físico/financeiro e desvio no período de referência', () => {
  const c = C.calcularCronograma({ etapas: etapasCalc, medicoes: medicoesCalc, dataReferencia: '2026-11-20' });
  assert.deepStrictEqual(c.periodos, ['2026-11-01', '2026-12-01']);
  assert.strictEqual(c.curva[0].previsto_fisico_acum, 62.5); // 25×100% + 75×50%
  assert.strictEqual(c.curva[0].previsto_valor, 2500);
  assert.strictEqual(c.curva[1].previsto_fisico_acum, 100);
  assert.strictEqual(c.curva[1].previsto_valor_acum, 4000);
  assert.strictEqual(c.curva[0].realizado_fisico_acum, 55); // 25×100% + 75×40%
  assert.strictEqual(c.curva[0].realizado_valor, 2200); // 1000 + 40% de 3000
  assert.strictEqual(c.resumo.fisico_previsto, 62.5);
  assert.strictEqual(c.resumo.fisico_realizado, 55);
  assert.strictEqual(c.resumo.financeiro_realizado, 55);
  assert.strictEqual(c.resumo.desvio_fisico, -7.5);
  assert.strictEqual(c.resumo.situacao, 'atrasado');
  assert.strictEqual(c.resumo.valor_medido_periodo, 2200);
  assert.strictEqual(c.resumo.valor_a_medir_periodo, 2200);
  assert.strictEqual(c.etapas[0].situacao, 'concluida');
  assert.strictEqual(c.etapas[1].situacao, 'atrasado');
  assert.deepStrictEqual(c.avisos, []);
});

caso('medição só em valor deriva o % físico; boletim do período', () => {
  const med = [...medicoesCalc, { id: 13, etapa_id: 2, periodo: '2026-12-01', valor_medido: 1800 }];
  const c = C.calcularCronograma({ etapas: etapasCalc, medicoes: med, dataReferencia: '2026-12-10' });
  assert.strictEqual(c.etapas[1].serie[1].realizado_acum_pct, 100); // 40% + 1800/3000
  assert.strictEqual(c.resumo.fisico_realizado, 100);
  assert.strictEqual(c.resumo.situacao, 'em_dia');
  const b = C.boletimMedicao(c, '2026-12-15');
  assert.strictEqual(b.numero, 2);
  assert.strictEqual(b.periodo, '2026-12-01');
  assert.strictEqual(b.fim_periodo, '2026-12-31');
  const cabos = b.linhas.find(l => l.etapa_id === 2);
  assert.deepStrictEqual([cabos.pct_anterior, cabos.pct_periodo, cabos.pct_acumulado], [40, 60, 100]);
  assert.deepStrictEqual([cabos.valor_anterior, cabos.valor_periodo, cabos.valor_acumulado, cabos.saldo], [1200, 1800, 3000, 0]);
  assert.strictEqual(b.totais.valor_periodo, 1800);
  assert.strictEqual(b.totais.saldo, 0);
  assert.strictEqual(C.boletimMedicao(c, '2025-01-01'), null);
});

caso('sem medição: previsto > 0 é atraso; antes do início, não iniciado; aviso de distribuição ≠ 100%', () => {
  const c = C.calcularCronograma({ etapas: etapasCalc, medicoes: [], dataReferencia: '2026-11-20' });
  assert.strictEqual(c.resumo.situacao, 'atrasado');
  assert.strictEqual(c.resumo.valor_a_medir_periodo, 2500); // sem medição: o previsto do período
  const antes = C.calcularCronograma({ etapas: etapasCalc, medicoes: [], dataReferencia: '2026-09-01' });
  assert.strictEqual(antes.resumo.situacao, 'nao_iniciado');
  assert.strictEqual(antes.resumo.fisico_previsto, 0);
  const torto = C.calcularCronograma({ etapas: [{ ...etapasCalc[0], distribuicao: [{ periodo: '2026-11-01', percentual: 80 }] }] });
  assert.strictEqual(torto.avisos.length, 1);
  const vazio = C.calcularCronograma({ etapas: [] });
  assert.deepStrictEqual(vazio.periodos, []);
  assert.strictEqual(vazio.resumo.fisico_realizado, 0);
});

caso('medição de período posterior à referência: compara previsto e realizado no período medido', () => {
  const c = C.calcularCronograma({ etapas: etapasCalc, medicoes: medicoesCalc, dataReferencia: '2026-10-10' });
  assert.strictEqual(c.resumo.fisico_previsto, 62.5); // novembro, não outubro (0%)
  assert.strictEqual(c.resumo.situacao, 'atrasado');
  assert.strictEqual(c.resumo.valor_a_medir_periodo, 0); // outubro não está no cronograma
});

caso('etapa sem distribuição usa a linear pelas datas; semanal', () => {
  const c = C.calcularCronograma({ etapas: [{ id: 5, nome: 'X', valor: 100, inicio: '2026-10-26', fim: '2026-11-06' }], periodicidade: 'semanal', dataReferencia: '2026-10-28' });
  assert.deepStrictEqual(c.periodos, ['2026-10-26', '2026-11-02']);
  assert.strictEqual(c.curva[0].previsto_fisico_acum, 50);
  assert.strictEqual(c.rotulos[0], 'S1 · 26/10');
});

// ── a planilha do cliente continua com a mesma regra ───────────────────
(async () => {
  const ExcelJS = require('exceljs');
  const { gerarPlanilhaCliente } = require(path.join('..', 'src', 'utils', 'planilhaOrcamentoCliente'));
  const r = await gerarPlanilhaCliente(1);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(r.buffer);
  const wsP = wb.getWorksheet('Parâmetros');
  const wsC = wb.getWorksheet('Cronograma');
  const linhaDe = (rotulo) => { let l = null; wsP.eachRow((row, n) => { if (String(row.getCell(1).value || '').startsWith(rotulo)) l = n; }); return l; };
  const refHH = `Parâmetros!$B$${linhaDe('Custo do homem-hora')}`;
  const refEq = `Parâmetros!$B$${linhaDe('Equipe em campo')}`;
  assert.strictEqual(wsP.getCell(`B${linhaDe('Custo do homem-hora')}`).value, D.CUSTO_HH_PADRAO);
  assert.strictEqual(wsP.getCell(`B${linhaDe('Equipe em campo')}`).value, D.EQUIPE_PADRAO);
  const etapasPlanilha = [];
  for (let l = 5; wsC.getCell(l, 1).value && !/^PRAZO/.test(String(wsC.getCell(l, 1).value)); l++) {
    etapasPlanilha.push({ l, nome: wsC.getCell(l, 1).value, c: wsC.getCell(l, 3).value });
  }
  assert.deepStrictEqual(etapasPlanilha.map(e => e.nome), [D.ETAPA_MOBILIZACAO.nome, '1. CFTV', '2. Rede', D.ETAPA_ENTREGA.nome]);
  assert.strictEqual(etapasPlanilha[0].c, D.ETAPA_MOBILIZACAO.dias);
  assert.strictEqual(etapasPlanilha[3].c, D.ETAPA_ENTREGA.dias);
  assert.strictEqual(etapasPlanilha[1].c.formula, D.formulaDuracaoExcel(`B${etapasPlanilha[1].l}`, refHH, refEq));
  assert.strictEqual(etapasPlanilha[1].c.formula, `MAX(1,ROUNDUP(B6/(${refHH}*${refEq}*8),0))`);
  // o cronograma da obra chega aos mesmos dias que a planilha calcularia
  const g = C.gerarCronograma({ ...dadosFalsos, dataInicio: '2026-11-02' });
  assert.deepStrictEqual(g.etapas.map(e => e.dias_uteis), [1, D.duracaoDiasUteis(500), D.duracaoDiasUteis(1500), 2]);
  ok++;

  // planilha do cronograma da obra: abas, fórmulas, Gantt e gráfico da curva S
  const { gerarPlanilhaCronograma } = require('../src/utils/planilhaCronograma');
  const calc = C.calcularCronograma({ etapas: etapasCalc, medicoes: medicoesCalc, dataReferencia: '2026-11-20' });
  const buf = await gerarPlanilhaCronograma({
    obra: { id: 1, codigo: 'OB-2026-001', nome: 'Obra <teste>' }, config: { periodicidade: 'mensal', criterio_peso: 'valor' },
    etapas: etapasCalc, historico: C.marcarHistorico(medicoesCalc).map(m => ({ ...m, data_medicao: '2026-11-20', etapa_nome: 'x' })), calc,
  });
  const JSZip = require(require.resolve('jszip', { paths: [path.dirname(require.resolve('exceljs'))] }));
  const zip = await JSZip.loadAsync(buf);
  assert.ok(zip.file('xl/charts/chart1.xml'), 'gráfico da curva S');
  assert.match(await zip.file('[Content_Types].xml').async('string'), /drawingml\.chart\+xml/);
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(buf);
  assert.deepStrictEqual(wb2.worksheets.map(w => w.name), ['Cronograma', 'Medições', 'Curva S']);
  const wc = wb2.getWorksheet('Cronograma');
  assert.strictEqual(wc.getCell('C7').value, 1000);
  assert.strictEqual(wc.getCell('J7').value, 1); // 100% em nov
  assert.strictEqual(wc.getCell('J10').value.formula, 'IF(J9="","",$C$9*J9)');
  assert.strictEqual(wc.getCell('J11').value.formula, 'SUMPRODUCT($C$7:$C$10,J7:J10)');
  assert.strictEqual(wc.getCell('J11').value.result, 2500);
  const ws3 = wb2.getWorksheet('Curva S');
  assert.strictEqual(ws3.getCell('B4').value.result, 62.5);
  assert.strictEqual(ws3.getCell('C4').value.result, 55);
  assert.strictEqual(ws3.getCell('C5').value, null); // dezembro sem medição: linha do realizado para
  ok++;

  // boletim: HTML escapado
  const { gerarHtmlBoletim } = require('../src/utils/boletimMedicaoTemplate');
  const html = gerarHtmlBoletim({
    obra: { codigo: 'OB-1', nome: '<script>x</script>', cliente_nome: 'A & B' }, boletim: C.boletimMedicao(calc, '2026-11-01'),
    medicoes: [{ etapa_nome: 'Cabos', observacao: '<img src=x onerror=alert(1)>' }], periodicidade: 'mensal',
  });
  assert.ok(!html.includes('<script>x') && html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<img src=x') && html.includes('A &amp; B'));
  assert.match(html, /Boletim de Medição nº 01/);
  ok++;
  console.log(`cronograma: ${ok} casos ok`);
})().catch((e) => { console.error(e); process.exit(1); });
