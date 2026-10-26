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
perto('Icc da fonte no QGBT (trafo + 2×240 mm², 12 m)', calc.qgbt.curto.iccFonte, 14623, 0.005);
igual('Icu mínimo no QGBT (com motores)', calc.qgbt.curto.icuMin, 20);
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
