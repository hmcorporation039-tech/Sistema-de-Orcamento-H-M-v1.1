// Teste da automação — lista de pontos, NBR 16401-3, ISO 52120-1/EN 15232 e residencial
const motor = require('../scripts/lib/index');
const { classeDe } = require('../scripts/lib/calculo');
const { perto, igual, fim } = require('../../_comum/teste').verificador('automação');

const res = motor.processar(motor.exemplo());
const { bms, zonas, efic } = res.calc;
// Pontos físicos: 2 chillers (5) + 3 bombas (4) + 4 AHU (9) + 2 exaustores (3) + 12 iluminação (2) + sensores das zonas (3 CO₂ × 3 + 1 T/UR × 2)
igual('pontos físicos', bms.fisicos, 2 * 5 + 3 * 4 + 4 * 9 + 2 * 3 + 12 * 2 + 3 * 3 + 2);
igual('pontos de integração (2 chillers × 20 + 3 medidores × 12)', bms.rede, 76);
igual('dispositivos na rede RS-485', bms.dispositivosRede, 5);
igual('com 20 % de reserva', bms.fisicosComReserva, Math.ceil(99 * 1.2));
igual('controladores de 32 pontos', bms.controladores, Math.ceil(119 / 32));
igual('licença do supervisório', bms.licenca, 250);
// NBR 16401-3: escritório 400 m², 5 pessoas/100 m² → 20 pessoas; Vbz = 2,5×20 + 0,3×400 = 170 L/s
const z1 = zonas.find(z => z.id === 'Z1');
igual('pessoas pela densidade', z1.pessoas, 20);
perto('ar externo da zona', z1.vbz, 170);
// CO₂ em regime: 420 + 0,0052/(170/20) × 10⁶ = 1 032 → 1 030 ppm
igual('setpoint de CO₂ do escritório', z1.setpointCo2, 1030);
igual('setpoint de CO₂ do auditório limitado a 1 100 ppm', zonas.find(z => z.id === 'Z3').setpointCo2, 1100);
// Classe: atual D (controle central), proposta B; economia térmica 1 − 0,80/1,51 e elétrica 1 − 0,93/1,10
igual('classe atual', efic.atual.classe, 'D');
igual('classe proposta', efic.proposta.classe, 'B');
perto('economia climatização', efic.econTh, 1 - 0.80 / 1.51);
perto('economia demais usos', efic.econEl, 1 - 0.93 / 1.10);
perto('economia kWh/mês', efic.economiaKwh, 42000 * (1 - 0.80 / 1.51) + 18000 * (1 - 0.93 / 1.10));
igual('classe A com todas as funções no topo', classeDe({ emissao: 'demanda', ventilacao: 'co2', iluminacao: 'ausencia', gestao: 'otimizacao' }).classe, 'A');
// Ensaio de sensor: 23,8 × 23,5 com tolerância 0,5 → conforme; CO₂ 820 × 790 (±75) → conforme
igual('sensores conformes', res.med.sensores.every(s => s.resultado === 'C'), true);

// Residencial Zigbee: (11 liga/desliga + 3 tomadas)/2 = 7 relés + 3 dimmers + 2 cortinas + 2 IR + 3 sensores + 2 cenas
const resid = motor.processar(require('../exemplos/exemplo-residencia.json')).calc.resid;
igual('dispositivos residenciais Zigbee', resid.dispositivos, 7 + 3 + 2 + 3 + 3 + 2);
// KNX: atuadores 8 canais = ceil(14/8) = 2; dimmer 4 canais = 1; persiana = 1; botoeiras 5 + 2; sensores 3; gateways AC 3; interface IP 1
const knx = JSON.parse(JSON.stringify(require('../exemplos/exemplo-residencia.json')));
knx.residencial.tecnologia = 'knx';
const rk = motor.processar(knx).calc.resid;
igual('dispositivos KNX', rk.dispositivos, 2 + 1 + 1 + 7 + 3 + 3 + 1);
igual('uma linha KNX', rk.rede.linhas, 1);

(async () => {
  for (const r of [res, motor.processar(require('../exemplos/exemplo-residencia.json'))])
    for (const t of motor.tiposDisponiveis(r)) igual(`documento ${t}`, (await motor.gerarDocumento(r, t)).buffer.slice(0, 2).toString(), 'PK');
  const orc = motor.montarOrcamento(res, 'execucao');
  igual('orçamento com pontos BMS', orc.itens.some(i => i.codigo === 'auto_pontos_bms' && i.quantidade === 99), true);
  igual('orçamento de diagnóstico', motor.montarOrcamento(res, 'diagnostico').itens[0].codigo, 'auto_inspecao');
  fim();
})();
