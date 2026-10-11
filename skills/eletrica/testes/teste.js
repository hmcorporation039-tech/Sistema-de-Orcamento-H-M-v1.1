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

// Documentos e orçamento
(async () => {
  for (const tipo of motor.tiposDisponiveis(res)) {
    const g = await motor.gerarDocumento(res, tipo);
    igual(`documento ${tipo} (zip válido)`, g.buffer.slice(0, 2).toString(), 'PK');
  }
  igual('orçamento execução', motor.montarOrcamento(res, 'execucao').itens.length, 26);
  igual('orçamento inspeção (3 serviços + 1 NC)', motor.montarOrcamento(res, 'inspecao').itens.length, 4);
  fim();
})();
