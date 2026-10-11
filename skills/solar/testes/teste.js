// Teste da usina solar — CRESESB Eq. 6.28 a 6.32, NBR 16612 e REN 1000
const motor = require('../scripts/lib/index');
const { calcular, fatorTemperaturaFv } = require('../scripts/lib/calculo');
const { perto, igual, fim } = require('../../_comum/teste').verificador('solar');

const ex = motor.exemplo();
const res = motor.processar(ex);
const c = res.calc;
// Consumo médio 760 kWh − 50 (bifásico) = 710 kWh/mês → P = 710/30/(5,2 × 0,8) = 5,689 kWp → 11 × 550 Wp
perto('consumo médio', c.media, 760);
perto('potência necessária (Eq. 6.28)', c.pfvNecessaria, 710 / 30 / (5.2 * 0.8));
igual('11 módulos', c.nTotal, 11);
// Tmód = 33 + (45 − 20)/800 × 1000 = 64,25 °C; Voc(8 °C) = 49,6 × (1 − 0,0027 × (8 − 25))
perto('temperatura máxima do módulo (Eq. 4.7)', c.temperaturas.tModMax, 64.25);
perto('Voc a 8 °C', c.temperaturas.vocTmin, 49.6 * (1 - 0.0027 * (8 - 25)));
// Faixa: máx. = floor(600 / 51,88) = 11; mín. = ceil(90 / Vmp(64,25 °C)) = 3
igual('máximo de módulos em série (Eq. 6.30)', c.faixa.maxVoc, 11);
igual('mínimo de módulos em série (Eq. 6.31)', c.faixa.min, 3);
igual('strings 6 + 5 em MPPTs distintos', c.strings.join('+'), '6+5');
perto('FDI (Eq. 6.29)', c.fdi, 5 / 6.05);
igual('sem fusível com 1 string por MPPT', c.precisaFusivel, false);
// Cabo CC: 4 mm² exposto ao sol = 41 A × √((90 − 50)/60)
perto('fator de temperatura do cabo FV', fatorTemperaturaFv(50), Math.sqrt(40 / 60));
igual('cabo CC 4 mm²', c.caboCc.secao, 4);
perto('geração mensal', c.geracaoMes, 6.05 * 5.2 * 30 * 0.8);
// Lado CA: 5 kW / 220 V × 1,25 = 28,4 A → disjuntor 32 A
igual('disjuntor CA 32 A', c.circuitosCa[0].disjuntor, 32);
perto('potência disponibilizada 2 × 220 × 63 A', c.pDisp, 27.72);
// Fusível obrigatório com 3 strings em paralelo por MPPT
const ex3 = JSON.parse(JSON.stringify(ex));
Object.assign(ex3.sistema, { n_modulos: 30, modulos_por_string: 10 });
Object.assign(ex3.inversor, { n_mppt: 1, strings_por_mppt: 3, quantidade: 1, imax_mppt: 40, isc_max_mppt: 50, potencia_ca_w: 15000 });
Object.assign(ex3.modulo, { corrente_reversa_max_a: 25 });
const c3 = calcular(ex3);
igual('3 strings em paralelo exigem fusível', c3.precisaFusivel, true);
igual('fusível gPV 25 A (1,5 × 14 = 21 ≤ In ≤ 25)', c3.fusivel, 25);
// Ensaio de string: 6 × 49,6 × (1 − 0,0027 × 15) = 285,7 V esperado a 40 °C
perto('Voc esperado no ensaio', res.strings[0].esperado, 6 * 49.6 * (1 - 0.0027 * 15));
igual('ensaio S1 conforme', res.strings[0].resultado, 'C');
(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  igual('orçamento usa códigos sol_*', motor.montarOrcamento(res, 'execucao').itens.some(i => i.codigo === 'sol_modulo'), true);
  igual('resumo com indicadores', motor.resumir(res).indicadores.length >= 6, true);
  fim();
})();
