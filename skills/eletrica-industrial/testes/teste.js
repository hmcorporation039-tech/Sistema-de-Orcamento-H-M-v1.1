// Teste de regressão da elétrica industrial — valores conferidos à mão:
//  - motor 10 cv, 380 V, η 0,89, FP 0,85: In = 7355 / (√3·380·0,89·0,85) = 7355 / 497,9 = 14,77 A
//  - correção do FP de 0,80 para 0,92 com 100 kW: Qc = 100·(0,7500 − 0,4260) = 32,40 kvar
//  - trafo 500 kVA, Z 5 %, 380 V, rede infinita: Icc = 500 000 / (√3·380·0,05) = 15 193 A ≈ 15,2 kA
//  - Y-Δ do compressor de 50 cv (η 0,93, FP 0,86): In = 36 775 / (√3·380·0,93·0,86) = 69,86 A;
//    K1 = K2 ≥ In/√3 = 40,3 A (50 A AC-3); K3 ≥ In/3 = 23,3 A (25 A); Ip linha = 7,5·69,86/3 = 174,6 A
//  - alimentador do CCM-01 (NBR 5410, 6.5.1): 1,25·69,86 + 14,77 + 11,41 + 3·4,93 = 128,29 A

const C = require('../scripts/lib/calculo');
const motor = require('../scripts/lib/index');
const { verificador } = require('../../_comum/teste');

const { perto, igual, fim } = verificador('elétrica industrial');

// Fórmulas básicas
perto('10 cv em kW', C.potenciaKw({ potencia: 10, unidade: 'cv' }), 7.355);
const in10 = C.correnteNominalMotor(7.355, 380, 0.89, 0.85);
perto('In 10 cv 380 V η 0,89 FP 0,85', in10, 14.77, 0.002);
igual('In 10 cv ≈ 14,8 A', Math.round(in10 * 10) / 10, 14.8);
perto('In 10 cv em 440 V', C.correnteNominalMotor(7.355, 440, 0.89, 0.85), 12.75, 0.003);
perto('FP 0,80 → 0,92 com 100 kW', C.kvarCorrecao(100, 0.8, 0.92), 32.40, 0.002);
igual('FP já acima do alvo → 0 kvar', C.kvarCorrecao(100, 0.95, 0.92), 0);
perto('Icc trafo 500 kVA Z 5 % 380 V', C.iccTransformador(500, 5, 380), 15193, 0.001);
const zTr = C.impedanciaFonte(C.config({ instalacao: { trafo_kva: 500, trafo_z_pct: 5, tensao_ff: 380 } }));
perto('Icc por impedância = S/(√3·V·Z%)', C.iccTrifasico(380, zTr), 15193, 0.001);
igual('placa 380/660 V', C.tensoesPlaca('380/660'), [380, 660]);

// Exemplo completo
const res = motor.processar(motor.exemplo());
const { calc } = res;
const u = (tag) => calc.unidades.find(x => x.tag === tag);
const m01 = u('M-01');
perto('In do compressor 50 cv', m01.in, 69.86, 0.002);
const k = (ref) => m01.partidaInfo.dispositivos.find(d => d.ref === ref);
perto('Y-Δ: K1 = In/√3', k('K1').corrente_a, 40.3, 0.003);
igual('Y-Δ: K1 50 A AC-3', k('K1').nominal_a, 50);
igual('Y-Δ: K2 50 A AC-3', k('K2').nominal_a, 50);
igual('Y-Δ: K3 ≥ In/3 → 25 A', k('K3').nominal_a, 25);
perto('Y-Δ: Ip de linha = Ip/3', m01.partidaInfo.ipLinha, 174.6, 0.002);
igual('Y-Δ: 6 condutores', m01.circuito.condutores, 6);
perto('direta: Ip = 7 × In (bomba 10 cv)', u('M-02-1').partidaInfo.ipLinha, 7 * 14.77, 0.002);
igual('placa 220/380 V não permite Y-Δ em 380 V', C.dispositivosPartida({ ...u('M-02-1'), partida: 'estrela_triangulo' }).observacoes.some(o => /não permite Y-Δ/.test(o)), true);
igual('bomba 10 cv: 2,5 mm² (seção mínima, Tab. 47)', u('M-02-1').circuito.secao, 2.5);
igual('ventilador 15 cv a 60 m: 6 mm² pela queda (4 mm² dá 4,2 %)', u('M-06').circuito.secao, 6);
igual('reserva fora da operação simultânea', u('M-02-2').emOperacao, false);
const ccm1 = calc.quadros.find(q => q.id === 'CCM-01');
perto('Ib do alimentador do CCM-01 (6.5.1)', ccm1.projeto.ib, 128.29, 0.002);
igual('disjuntor do alimentador do CCM-01', ccm1.alim.disjuntor, 160);
// Icc máximo pela IEC 60909-0 (antes c = 1,0 e sem K_T: 14 623 A, ≈ 8 % abaixo):
//  trafo 500 kVA, Z 5 %, R 1 %: Zb = 380²/500 000 = 0,2888 Ω; R = 0,002888 Ω; X = √(0,01444² − 0,002888²) = 0,014148 Ω
//  x_T = 0,014148/0,2888 = 0,04899 → K_T = 0,95 · 1,05 / (1 + 0,6 · 0,04899) = 0,96902
//  K_T·Z_T = 0,0027985 + j0,013710; cabo 2 × 240 mm², 12 m: R = 0,0178·12/480 = 0,000445, X = 0,08e-3·12/2 = 0,00048
//  |Z| = |0,0032435 + j0,014190| = 0,014556 Ω → Icc = 1,05 · 380 / (√3 · 0,014556) = 15 826 A
perto('K_T do trafo 500 kVA / 5 % (IEC 60909-0, 6.3.3)', calc.kT, 0.96902, 0.0001);
perto('Icc da fonte no QGBT com c_max = 1,05 e K_T (trafo + 2×240 mm², 12 m)', calc.qgbt.curto.iccFonte, 15826, 0.001);
igual('Icu mínimo no QGBT (com motores: 15,8 + 1,8 = 17,7 kA → 20 kA)', calc.qgbt.curto.icuMin, 20);
// c/K_T = (1 + 0,6·x_T)/0,95 não depende de c_max: trafo sozinho, rede infinita
//  750 kVA, Z 5 %: In = 1139,5 A; Icc antigo = 22,79 kA → × 1,0836 = 24,69 kA (Icu 25 kA)
//  1000 kVA, Z 4,5 %: Icc antigo = 33,76 kA → × 1,0803 = 36,48 kA (Icu 40 kA; antes escolhia 36 kA)
{
  const cfg = (kva, z) => C.config({ instalacao: { trafo_kva: kva, trafo_z_pct: z, tensao_ff: 380 } });
  const icc = (kva, z) => { const c = cfg(kva, z); return C.iccTrifasico(380, C.impedanciaFonte(c, C.fatorKT(c)), c.fatorC); };
  perto('Icc 750 kVA / 5 % com K_T', icc(750, 5), 24695, 0.001);
  perto('Icc 1000 kVA / 4,5 % com K_T', icc(1000, 4.5), 36476, 0.001);
}
// DPS do QGBT pela função comum (Tabela 49): 380/220 V TN-S → 275 V; 440/254 V → 320 V (era 275 V fixo
// no unifilar, abaixo de 1,1·254 = 279,4 V); IT sem neutro 380 V → Uc ≥ U = 380 V → 385 V
igual('DPS 380/220 V TN-S: 275 V', calc.dps.uc, 275);
{
  const d440 = motor.exemplo(); Object.assign(d440.instalacao, { tensao_ff: 440, tensao_fn: 254 });
  const r440 = motor.processar(d440);
  igual('DPS 440/254 V: 320 V', r440.calc.dps.uc, 320);
  igual('unifilar do QGBT 440 V: DPS 320 V', require('../scripts/lib/unifilar').dadosUnifilarQD(r440, { quadro: 'QGBT' }).dps.descricao, 'classe II\n320 V — 20 kA');
  const dIt = motor.exemplo(); dIt.instalacao.esquema = 'IT';
  igual('DPS IT sem neutro 380 V: 385 V', motor.processar(dIt).calc.dps.uc, 385);
}
// CCM só com motores reserva (antes derrubava o cálculo): alimentador pelo maior deles
{
  const d = motor.exemplo();
  d.quadros.push({ id: 'CCM-R', descricao: 'Reservas', tipo: 'CCM', distancia_qgbt_m: 30 });
  d.motores.push({ tag: 'MR', potencia: 20, unidade: 'cv', quadro: 'CCM-R', quantidade: 1, simultaneos: 0, rendimento: 0.9, fp: 0.85, ip_in: 7 });
  const q = motor.processar(d).calc.quadros.find(x => x.id === 'CCM-R');
  // In = 14 710/(√3·380·0,9·0,85) = 29,22 A → Ib = 1,25 × 29,22 = 36,52 A → disjuntor 40 A
  perto('CCM só com reserva: Ib = 1,25 × In do maior', q.projeto.ib, 36.52, 0.001);
  igual('CCM só com reserva: disjuntor 40 A', q.alim.disjuntor, 40);
}
// Motor de 450 cv em 380 V: In = 330,98 kW/(√3·380·0,96·0,88) = 595,2 A, Ib = 744,1 A → cabos em paralelo
{
  const d = motor.exemplo();
  d.motores.push({ tag: 'MG', potencia: 450, unidade: 'cv', quantidade: 1, rendimento: 0.96, fp: 0.88, ip_in: 6, partida: 'soft_starter', distancia_m: 50 });
  const mg = motor.processar(d).calc.unidades.find(x => x.tag === 'MG');
  perto('450 cv: Ib 744 A', mg.circuito.ibLinha, 744.06, 0.001);
  igual('450 cv: 2 × 240 mm² por fase (antes: erro "nenhuma seção atende")', [mg.circuito.paralelos, mg.circuito.secao], [2, 240]);
  igual('450 cv: Iz total ≥ Ib', mg.circuito.izTotal >= mg.circuito.ibLinha, true);
}
igual('CCM com Ipk na especificação do conjunto', calc.materiais.some(m => m.codigo === 'CCM' && /Ipk ≥/.test(m.descricao)), true);
igual('banco: 6 estágios de 15 kvar', [calc.banco.n, calc.banco.estagio], [6, 15]);
igual('banco dessintonizado (inversores ≥ 20 %)', calc.banco.dessintonizado, true);
igual('FP corrigido ≥ 0,92', calc.banco.fpDepois >= 0.92, true);
igual('transformador atende', calc.trafo.atende, true);
igual('todas as partidas ≤ 10 % no dispositivo', calc.unidades.every(x => x.quedaPartida.dispositivo <= 10), true);

// Motor longo: a queda na partida manda aumentar a seção
const ex2 = motor.exemplo();
ex2.motores.find(m => m.tag === 'M-06').distancia_m = 200;
const m06b = motor.processar(ex2).calc.unidades.find(x => x.tag === 'M-06');
igual('15 cv a 200 m: 25 mm² pela queda na partida', [m06b.circuito.secao, m06b.circuito.criterio], [25, 'queda na partida']);
igual('15 cv a 200 m: partida ≤ 10 % no motor', m06b.quedaPartida.motor <= 10, true);

// Inspeção
igual('isolamento 3,2 MΩ < 5 MΩ → NC', res.med.isolamento.find(m => m.motor === 'M-06').resultado, 'NC');
igual('relé M-02-1 ajustado em In → C', res.med.reles.find(m => m.motor === 'M-02-1').resultado, 'C');
igual('relé M-06 28 A > In·FS → NC', res.med.reles.find(m => m.motor === 'M-06').resultado, 'NC');
igual('termografia ΔT 7 °C → C', res.med.termografia[0].resultado, 'C');

// Unifilar (dados para o gerador de esquema)
const un = calc.unifilar;
igual('unifilar: 3 alimentadores + banco no QGBT', un.qgbt.saidas.map(s => s.tipo), ['alimentador', 'alimentador', 'alimentador', 'banco_capacitores']);
igual('unifilar: 7 saídas no CCM-01', un.quadros.find(q => q.ref === 'CCM-01').saidas.length, 7);
const { dadosUnifilarQD } = require('../scripts/lib/unifilar');
igual('adaptador do unifilar de quadro (QET): QGBT com 3 alimentadores + banco', dadosUnifilarQD(res, { quadro: 'QGBT' }).circuitos.length, 4);

// Documentos e orçamento
(async () => {
  for (const tipo of motor.tiposDisponiveis(res)) {
    const g = await motor.gerarDocumento(res, tipo);
    igual(`documento ${tipo} (zip válido)`, g.buffer.slice(0, 2).toString(), 'PK');
  }
  const orc = motor.montarOrcamento(res, 'execucao');
  const qtd = (cod) => (orc.itens.find(i => i.codigo === cod) || {}).quantidade;
  igual('orçamento: motores até 10 cv', qtd('ind_motor_ate10cv'), 6);
  igual('orçamento: motores 10 a 50 cv', qtd('ind_motor_10a50cv'), 2);
  igual('orçamento: motores acima de 50 cv', qtd('ind_motor_acima50cv'), 2);
  igual('orçamento: seções do contrato', [...new Set(orc.itens.map(i => i.secao))], ['Materiais e Equipamentos', 'Serviços (Mão de Obra)']);
  igual('orçamento inspeção (4 serviços + 1 NC)', motor.montarOrcamento(res, 'inspecao').itens.length, 5);
  fim();
})();
