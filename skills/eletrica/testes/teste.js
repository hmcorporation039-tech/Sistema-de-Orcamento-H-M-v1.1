// Teste de regressão da elétrica predial — valores conferidos à mão contra a
// NBR 5410:2004 (9.5.2, Tabelas 36/40/42/46/47/58/59, 6.2.7).

const T = require('../scripts/lib/tabelas');
const { iluminacaoMinima, tomadasMinimas } = require('../scripts/lib/calculo');
const motor = require('../scripts/lib/index');
const { verificador } = require('../../_comum/teste');

const { perto, igual, fim } = verificador('elétrica');

// Tabelas lidas da norma
igual('Tab. 36: 2,5 mm² B1 2 carregados', T.capacidade(2.5, 'B1', 2, 'PVC'), 24);
igual('Tab. 36: 10 mm² B1 3 carregados', T.capacidade(10, 'B1', 3, 'PVC'), 50);
igual('Tab. 37: 16 mm² C 3 carregados', T.capacidade(16, 'C', 3, 'EPR'), 96);
igual('Tab. 39: 35 mm² E 2 carregados', T.capacidade(35, 'E', 2, 'EPR'), 185);
igual('Tab. 40: PVC 40 °C', T.fatorTemperatura(40, 'PVC'), 0.87);
igual('Tab. 42: 3 circuitos', T.fatorAgrupamento(3), 0.7);
igual('Tab. 58: PE de 25 mm²', T.secaoPE(25), 16);
igual('Tab. 58: PE de 70 mm²', T.secaoPE(70), 35);
igual('Tab. 59: reserva para 8 circuitos', T.reservaQuadro(8), 3);

// 9.5.2 previsão
igual('ilum. 20 m²', iluminacaoMinima(20), 280);
igual('ilum. 6 m²', iluminacaoMinima(6), 100);
igual('ilum. 12 m²', iluminacaoMinima(12), 160);
igual('tomadas cozinha 13 m de perímetro', tomadasMinimas({ tipo: 'cozinha', perimetro_m: 13 }), 4);
igual('tomadas sala 18 m', tomadasMinimas({ tipo: 'sala', perimetro_m: 18 }), 4);
igual('tomadas cômodo 2 m²', tomadasMinimas({ tipo: 'outros', area_m2: 2 }), 1);

// Exemplo completo
const res = motor.processar(motor.exemplo());
const { calc } = res;
const amb = (n) => calc.previsao.find(a => a.nome === n);
igual('cozinha: 2×600 + 2×100 (conjunto > 6 tomadas)', amb('Cozinha').tugVa, 1400);
igual('área de serviço', amb('Área de serviço').tugVa, 1300);
igual('banheiro', amb('Banheiro').tugVa, 600);
const chuveiro = calc.circuitos.find(c => /Chuveiro/.test(c.descricao));
perto('chuveiro Ib', chuveiro.ib, 25);
igual('chuveiro 6 mm² (4 mm² dá 22,4 A < 25 A)', chuveiro.secao, 6);
igual('chuveiro disjuntor', chuveiro.disjuntor, 25);
igual('chuveiro com DR', chuveiro.dr, true);
const ilum = calc.circuitos.find(c => c.tipo === 'iluminacao');
perto('iluminação: queda 2,96 %', ilum.queda, 2.96, 0.01);
perto('demanda', calc.demanda.demandaVa, 9392.04, 0.001);
perto('alimentador Ib', calc.alimentador.ib, 36.98, 0.01);
igual('alimentador 10 mm²', calc.alimentador.secao, 10);
igual('alimentador 3 condutores carregados (Tab. 46)', calc.alimentador.carregados, 3);
igual('disjuntor geral', calc.alimentador.disjuntor, 40);
igual('reserva do quadro', calc.quadro.reserva, 3);

// Inspeção: isolamento 0,3 MΩ < 0,5 MΩ é NC
igual('isolamento 0,3 MΩ → NC', res.med.isolamento.find(m => m.valor_mohm === 0.3).resultado, 'NC');
igual('DR 28 ms → C', res.med.dr[0].resultado, 'C');

// ── Campos editáveis pelo projetista ──────────────────────────────────────
const base = motor.exemplo();
const circuitosDe = (calc0) => calc0.circuitos.map(c => ({ id: c.id, descricao: c.descricao, tipo: c.tipo, ligacao: c.ligacao, potencia_va: c.potencia_va, comprimento_m: c.comprimento, ambientes: c.ambientes.join(', ') }));
{
  const d = JSON.parse(JSON.stringify(base));
  d.circuitos = circuitosDe(calc);
  d.circuitos[1].disjuntor = 25;          // disjuntor maior que o necessário → seção sobe para Iz ≥ In
  d.circuitos[2].secao = 1.5;             // seção abaixo da mínima de TUG → aviso, sem travar
  d.circuitos[0].fases = 'B';             // fase fixada
  d.circuitos[3].potencia_va = null; d.circuitos[3].potencia_w = 552; d.circuitos[3].fp = 0.92; // W + FP
  d.instalacao.fd_ilum_tug_fixo = 0.6;
  d.ambientes[0].tug_va = 900;            // potência de tomadas adotada
  const c2 = motor.processar(d).calc;
  igual('disjuntor de 25 A adotado', c2.circuitos[1].disjuntor, 25);
  // Tab. 36 B1 2c × FCA 0,7: 2,5 → 16,8 A; 4 → 22,4 A; 6 → 28,7 A ≥ 25 A
  igual('seção sobe para 6 mm² (Iz ≥ In de 25 A)', c2.circuitos[1].secao, 6);
  igual('seção 1,5 mm² adotada mantida', c2.circuitos[2].secao, 1.5);
  igual('aviso de seção abaixo da Tabela 47', c2.avisos.some(a => /abaixo da mínima de 2.5 mm²/.test(a)), true);
  igual('fase fixada respeitada', c2.circuitos[0].fases, 'B');
  perto('potência em W com FP → 600 VA', c2.circuitos[3].potencia_va, 600, 0.001);
  igual('FD fixo de iluminação/TUG', c2.demanda.fdIlumTug, 0.6);
  igual('TUG adotada no ambiente', c2.previsao[0].tugVa, 900);
}

// ── Planilha do quadro: fórmulas vivas = motor da skill ───────────────────
// recalcula o .xlsx num motor de fórmulas (sem Excel) e devolve o leitor de células
async function recalcular(buffer, alteracoes = {}) {
  const ExcelJS = require('exceljs');
  const { HyperFormula } = require('hyperformula');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const folhas = {};
  wb.worksheets.forEach(ws => {
    const linhas = [];
    ws.eachRow({ includeEmpty: true }, (row, r) => {
      const l = [];
      row.eachCell({ includeEmpty: true }, (c, col) => { const v = c.value; l[col - 1] = v && typeof v === 'object' && v.formula ? `=${v.formula}` : v && typeof v === 'object' && 'result' in v ? v.result : v ?? null; });
      linhas[r - 1] = l;
    });
    folhas[ws.name] = Array.from(linhas, l => l || []);
  });
  const hf = HyperFormula.buildFromSheets(folhas, { licenseKey: 'gpl-v3', useArrayArithmetic: true });
  for (const [onde, valor] of Object.entries(alteracoes)) {
    const [aba, a1] = onde.split('!');
    hf.setCellContents(hf.simpleCellAddressFromString(a1, hf.getSheetId(aba)), [[valor]]);
  }
  return (aba, a1) => hf.getCellValue(hf.simpleCellAddressFromString(a1, hf.getSheetId(aba)));
}
async function conferirPlanilha(nome, resX, alteracoes) {
  const val = await recalcular((await motor.gerarDocumento(resX, 'planilha')).buffer, alteracoes);
  let ok = true;
  resX.calc.circuitos.forEach((x, i) => {
    const r = 5 + i, q = (L) => val('Quadro de cargas', `${L}${r}`);
    const iguais = [[q('G'), x.potencia_va], [q('K'), x.ib], [q('S'), x.disjuntor], [q('U'), x.secao], [q('W'), x.iz], [q('Y'), x.queda], [q('AB'), x.secaoPE]]
      .every(([a, b]) => typeof a === 'number' && Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)));
    if (!iguais) { ok = false; console.log(`   ${nome}: circuito ${x.id} → planilha ${['G', 'K', 'S', 'U', 'W', 'Y'].map(q).join(' / ')}`); }
  });
  const dem = {};
  for (let r = 6; r <= 46; r++) { const a = val('Demanda e alimentador', `A${r}`); if (a) dem[a] = val('Demanda e alimentador', `B${r}`); }
  perto(`${nome}: demanda na planilha`, dem['DEMANDA (VA)'], resX.calc.demanda.demandaVa, 1e-6);
  igual(`${nome}: seção do alimentador na planilha`, dem['Seção adotada (mm²)'], resX.calc.alimentador.secao);
  perto(`${nome}: queda total na planilha`, dem['Queda total até o circuito mais desfavorável (%)'], resX.calc.quedaTotal, 1e-6);
  igual(`${nome}: disjuntor geral na planilha`, dem['Disjuntor geral In (A)'], resX.calc.alimentador.disjuntor);
  igual(`${nome}: circuitos (Ib, In, seção, Iz, queda, PE) = motor`, ok, true);
  return val;
}

// Documentos e orçamento
(async () => {
  await conferirPlanilha('exemplo', res);
  const tri = JSON.parse(JSON.stringify(base));
  Object.assign(tri.instalacao, { sistema: 'trifasico', tensao_fn: 220, tensao_ff: 380, isolacao: 'EPR', metodo: 'D', temperatura: 25, fd_tue_fixo: 0.8 });
  tri.circuitos = circuitosDe(calc).map((c, i) => ({ ...c, comprimento_m: c.comprimento_m + 5 * i, ...(i === 7 ? { ligacao: 'FFF', potencia_va: 9000 } : {}), ...(i === 1 ? { disjuntor: 20 } : {}), ...(i === 4 ? { agrupamento: 6 } : {}) }));
  await conferirPlanilha('trifásico EPR enterrado', motor.processar(tri));
  // edição na própria planilha: comprimento do circuito 1 → 60 m recalcula a seção como o motor
  const longo = JSON.parse(JSON.stringify(base));
  longo.circuitos = circuitosDe(calc).map((c, i) => (i === 0 ? { ...c, comprimento_m: 60 } : c));
  const val = await recalcular((await motor.gerarDocumento(res, 'planilha')).buffer, { 'Quadro de cargas!L5': 60 });
  const c60 = motor.processar(longo).calc.circuitos[0];
  igual('edição na planilha (60 m): seção = motor', val('Quadro de cargas', 'U5'), c60.secao);
  perto('edição na planilha (60 m): queda = motor', val('Quadro de cargas', 'Y5'), c60.queda, 1e-6);

  for (const tipo of motor.tiposDisponiveis(res)) {
    const g = await motor.gerarDocumento(res, tipo);
    igual(`documento ${tipo} (zip válido)`, g.buffer.slice(0, 2).toString(), 'PK');
  }
  igual('orçamento execução', motor.montarOrcamento(res, 'execucao').itens.length, 26);
  igual('orçamento inspeção (3 serviços + 1 NC)', motor.montarOrcamento(res, 'inspecao').itens.length, 4);
  fim();
})();
