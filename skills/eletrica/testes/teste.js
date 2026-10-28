// Teste de regressão da elétrica predial — valores conferidos à mão contra a
// NBR 5410:2004 (9.5.2, Tabelas 36/40/42/46/47/58/59, 6.2.7).

const T = require('../scripts/lib/tabelas');
const { iluminacaoMinima, tomadasMinimas, calcular } = require('../scripts/lib/calculo');
const motor = require('../scripts/lib/index');
const { verificador } = require('../../_comum/teste');

const { perto, igual, fim } = verificador('elétrica');

// Tabelas lidas da norma
igual('Tab. 36: 2,5 mm² B1 2 carregados', T.capacidade(2.5, 'B1', 2, 'PVC'), 24);
igual('Tab. 36: 10 mm² B1 3 carregados', T.capacidade(10, 'B1', 3, 'PVC'), 50);
igual('Tab. 37: 16 mm² C 3 carregados', T.capacidade(16, 'C', 3, 'EPR'), 96);
igual('Tab. 39: 35 mm² E 2 carregados', T.capacidade(35, 'E', 2, 'EPR'), 185);
// método F com 3 condutores carregados = coluna "trifólio" da Tabela 38 (25 mm² PVC: 110 A; a coluna
// "justapostos no mesmo plano" dá 114 A e era usada antes — sem o arranjo definido vale a menor)
igual('Tab. 38: 25 mm² F 3 carregados (trifólio)', T.capacidade(25, 'F', 3, 'PVC'), 110);
igual('Tab. 38: 25 mm² F 2 carregados (justapostos)', T.capacidade(25, 'F', 2, 'PVC'), 131);
igual('Tab. 40: PVC 40 °C', T.fatorTemperatura(40, 'PVC'), 0.87);
// acima do fim da Tabela 40 (PVC 60 °C) não há fator: antes saía 0,5 como se valesse
let erroTemp = null; try { T.fatorTemperatura(65, 'PVC'); } catch (e) { erroTemp = e.message; }
igual('Tab. 40: PVC a 65 °C → erro (fora da tabela)', /acima da Tabela 40/.test(erroTemp || ''), true);
igual('Tab. 40: EPR a 65 °C → 0,65', T.fatorTemperatura(65, 'EPR'), 0.65);
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
// Alimentador pela fase mais carregada (antes: D/(2·Vfn) = 9392,04/254 = 36,98 A, que trata o
// chuveiro e o ar F-F 220 V como se fossem F-N 127 V divididos pelas fases):
// fase A = ilum 1060/127 + coz 1400/127 + TUG 1100/127 (= 8,35 + 11,02 + 8,66) + ar 1556/220 (7,07)
//        + chuveiro 5500/220 (25,00) = 60,10 A; FD = 9392,04/13716 = 0,68475 → Ib = 41,16 A
perto('alimentador: corrente da fase A', calc.fases.corrente.A, 60.10, 0.001);
perto('alimentador Ib = fase A × FD', calc.alimentador.ib, 41.16, 0.001);
// disjuntor 50 A; 10 mm² B1 3c tem Iz 50 A ≥ 50 A, mas a queda 2·0,0225·12·41,16/(10·220) = 1,01 % > 1 %
// (limite do alimentador) → 16 mm² (0,63 %). Antes: 40 A / 10 mm².
igual('alimentador 16 mm² (queda de 1,01 % em 10 mm²)', calc.alimentador.secao, 16);
igual('alimentador 3 condutores carregados (Tab. 46)', calc.alimentador.carregados, 3);
igual('disjuntor geral 50 A (Ib 41,2 A)', calc.alimentador.disjuntor, 50);
// DPS pela função comum (Tabela 49): TN-S 127 V → 1,1·127 = 139,7 V → 175 V comercial
igual('DPS Uc 175 V (127/220 V TN-S)', calc.quadro.dpsUc, 175);
// Icc no quadro: fonte 10 kA adotada (Z = 127/10 000 = 0,0127 Ω, X/R = 1) + alimentador
// 0,0178·12/16 = 0,01335 Ω → |Z| = √((0,00898+0,01335)² + 0,00898²) = 0,02407 Ω → 5,28 kA → Icn 6 kA
perto('Icc presumida no quadro', calc.falta.iccQuadro, 5276.6, 0.001);
igual('capacidade de interrupção ≥ 6 kA', calc.quadro.icnKa, 6);

// ── Achados da revisão de 27/10/2026 ──────────────────────────────────────
// Alimentador com carga desequilibrada: trifásico 380/220 V, fase A 14 kVA (2 × 7 kVA F-N), fase B 1 kVA, FD 1
{
  const r = calcular({ instalacao: { tensao_fn: 220, tensao_ff: 380, sistema: 'trifasico', esquema: 'TN-S', temperatura: 30, isolacao: 'PVC', metodo: 'B1', agrupamento: 1, fd_ilum_tug_fixo: 1, fd_tue_fixo: 1, comprimento_alimentador_m: 5 },
    circuitos: [{ id: '1', tipo: 'tue', potencia_va: 7000, ligacao: 'FN', fases: 'A', comprimento_m: 5 }, { id: '2', tipo: 'tue', potencia_va: 7000, ligacao: 'FN', fases: 'A', comprimento_m: 5 }, { id: '3', tipo: 'tug', potencia_va: 1000, ligacao: 'FN', fases: 'B', comprimento_m: 5 }] });
  // fase A = 14 000/220 = 63,64 A (antes: 15 000/(√3·380) = 22,8 A → 25 A / 4 mm²)
  perto('3F desequilibrado: Ib = fase A 14 000/220', r.alimentador.ib, 63.64, 0.001);
  igual('3F desequilibrado: disjuntor geral 70 A', r.alimentador.disjuntor, 70);
  igual('3F desequilibrado: aviso cita a fase mais carregada', r.avisos.some(a => a.includes('fase mais carregada (fase A')), true);
}
{
  // bifásico 127/220: 2 × 4400 VA F-N na fase A e 500 VA na B → fase A = 8800/127 = 69,29 A (antes 40 A)
  const r = calcular({ instalacao: { tensao_fn: 127, tensao_ff: 220, sistema: 'bifasico', fd_ilum_tug_fixo: 1, fd_tue_fixo: 1, agrupamento: 1, comprimento_alimentador_m: 5 },
    circuitos: [{ id: '1', tipo: 'tue', potencia_va: 4400, ligacao: 'FN', fases: 'A', comprimento_m: 5 }, { id: '2', tipo: 'tue', potencia_va: 4400, ligacao: 'FN', fases: 'A', comprimento_m: 5 }, { id: '3', tipo: 'tug', potencia_va: 500, ligacao: 'FN', fases: 'B', comprimento_m: 5 }] });
  perto('2F desequilibrado: Ib = 8800/127', r.alimentador.ib, 69.29, 0.001);
  igual('2F desequilibrado: disjuntor geral 70 A', r.alimentador.disjuntor, 70);
}
// Ligação sugerida de TUE > 4 kW: F-F só em 127/220 V com 2ª fase
{
  const banho = (inst) => calcular({ instalacao: inst, ambientes: [{ nome: 'Banho', tipo: 'banheiro', area_m2: 4, perimetro_m: 8, tues: [{ descricao: 'Chuveiro', potencia_w: 5500 }] }] }).circuitos.find(x => /Chuveiro/.test(x.descricao));
  const dfBif = banho({ tensao_fn: 220, tensao_ff: 380, sistema: 'bifasico' });
  // 220/380 V: F-N 220 V, Ib = 5500/220 = 25 A (antes F-F 380 V, 14,5 A, disjuntor bipolar)
  igual('chuveiro 5,5 kW em 220/380 V → F-N', [dfBif.ligacao, dfBif.tensao, dfBif.polos], ['FN', 220, 1]);
  perto('chuveiro 220 V: Ib 25 A', dfBif.ib, 25, 0.001);
  const mono = banho({ tensao_fn: 127, tensao_ff: 220, sistema: 'monofasico' });
  igual('monofásico 127 V → F-N (não há 2ª fase)', mono.ligacao, 'FN');
  igual('127/220 V bifásico → F-F', banho({ tensao_fn: 127, tensao_ff: 220, sistema: 'bifasico' }).ligacao, 'FF');
}
// Seccionamento automático (5.1.2.2.4.2): iluminação 250 VA, 80 m, 1,5 mm², C10, 127 V, sem DR
{
  const r = calcular({ instalacao: { tensao_fn: 127, tensao_ff: 220, sistema: 'monofasico', esquema: 'TN-S' }, circuitos: [{ id: '1', tipo: 'iluminacao', descricao: 'Iluminação externa', potencia_va: 250, comprimento_m: 80, disjuntor: 10 }] });
  const x = r.circuitos[0];
  // laço do circuito 0,0225·80·(1/1,5 + 1/1,5) = 2,40 Ω + alimentador 0,0225·10·(1/2,5 + 1/2,5) = 0,18 Ω = 2,58 Ω
  // Uo/Ia = 127/(10·10) = 1,27 Ω → não secciona; L máx = (1,27 − 0,18)/0,03 = 36,3 m
  perto('Zs do circuito longo', x.falta.zs, 2.58, 0.001);
  perto('Zs máx = Uo/Ia', x.falta.zsMax, 1.27, 0.001);
  perto('comprimento máximo sem DR', x.falta.lMax, 36.33, 0.001);
  igual('DR 30 mA incluído para o seccionamento', [x.dr, x.drMotivos.includes('seccionamento automático (Zs·Ia > Uo)')], [true, true]);
  igual('aviso de Zs', r.avisos.some(a => a.includes('Zs = 2.58 Ω > Uo/Ia')), true);
  // com a Icc da entrada informada (5 kA) entra a fonte: 2·127/5000 = 0,0508 Ω no laço
  const r5 = calcular({ instalacao: { tensao_fn: 127, tensao_ff: 220, sistema: 'monofasico', esquema: 'TN-S', icc_entrada_ka: 5 }, circuitos: [{ id: '1', tipo: 'iluminacao', potencia_va: 250, comprimento_m: 30, disjuntor: 10 }] });
  // 30 m: 0,0508 + 0,18 + 0,0225·30·(2/1,5) = 0,0508 + 0,18 + 0,90 = 1,1308 Ω ≤ 1,27 Ω → o disjuntor secciona
  perto('Zs com a fonte informada', r5.circuitos[0].falta.zs, 1.1308, 0.001);
  igual('30 m: o disjuntor secciona, sem DR', [r5.circuitos[0].falta.disjuntorSecciona, r5.circuitos[0].dr], [true, false]);
  // Icc no quadro: 127/|(0,0254/√2 + 0,0178·10/2,5) + j·0,0254/√2| = 127/|0,08916 + j0,01796| = 1,396 kA → Icn 3 kA
  perto('Icc no quadro com 5 kA na entrada', r5.falta.iccQuadro, 1396.3, 0.001);
  // TT: DR em todos os circuitos (5.1.2.2.4.3)
  const tt = calcular({ instalacao: { tensao_fn: 127, tensao_ff: 220, sistema: 'monofasico', esquema: 'TT' }, circuitos: [{ id: '1', tipo: 'tug', potencia_va: 600, comprimento_m: 10 }] });
  igual('esquema TT: DR no circuito', tt.circuitos[0].dr, true);
}
// Temperatura vazia ("" no formulário/CLI) = padrão 30 °C (antes virava 0 °C → FCT 1,22)
{
  const d = JSON.parse(JSON.stringify(motor.exemplo()));
  d.instalacao.temperatura = '';
  const r = calcular(d);
  igual('temperatura "" → 30 °C, FCT 1', [r.config.temperatura, r.circuitos[0].fct], [30, 1]);
}
// Queda total já estourada no circuito terminal: o alimentador não é levado a 0,1 %
{
  const d = JSON.parse(JSON.stringify(motor.exemplo()));
  d.circuitos = [{ id: '1', tipo: 'tug', potencia_va: 1800, comprimento_m: 40, secao: 2.5 }];
  const r = calcular(d);
  // terminal: 2·0,0225·40·14,17/(2,5·127) = 8,04 % > 5 % → alimentador fica no seu limite (1 %), não em 16 mm²
  perto('queda do terminal fixo', r.maiorQueda, 8.035, 0.001);
  igual('alimentador no limite próprio de 1 %', r.alimentador.limiteQueda, 1);
  igual('alimentador sem superdimensionar (< 16 mm²)', r.alimentador.secao < 16, true);
  igual('aviso aponta o circuito terminal', r.avisos.some(a => /circuito 1 sozinho tem 8.04 %/.test(a)), true);
}
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
  // planilha com carga desequilibrada: Ib do alimentador = maior corrente de fase × FD, igual ao motor
  const deseq = JSON.parse(JSON.stringify(base));
  Object.assign(deseq.instalacao, { sistema: 'trifasico', tensao_fn: 220, tensao_ff: 380 });
  deseq.circuitos = circuitosDe(calc).map((c, i) => ({ ...c, ligacao: 'FN', fases: i < 6 ? 'A' : 'B' }));
  const resDeseq = motor.processar(deseq);
  const valD = await conferirPlanilha('3F desequilibrado', resDeseq);
  const demD = {};
  for (let r = 6; r <= 48; r++) { const a = valD('Demanda e alimentador', `A${r}`); if (a) demD[a] = valD('Demanda e alimentador', `B${r}`); }
  perto('3F desequilibrado: Ib do alimentador na planilha = motor', demD['Corrente de projeto Ib (A)'], resDeseq.calc.alimentador.ib, 1e-6);
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
