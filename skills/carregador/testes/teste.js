// Teste da recarga de VE — conferido com o projeto real AP-1103 (wallbox 7,4 kW,
// 220 V F-N, cabo 6 mm² EPR, disjuntor 40 A) e com a NBR 17019.
const motor = require('../scripts/lib/index');
const { tipoDr } = require('../scripts/lib/calculo');
const { verificador } = require('../../_comum/teste');
const { perto, igual, fim } = verificador('carregador');

const res = motor.processar(motor.exemplo());
const c = res.calc.circuitos[0];
perto('Ib 7,4 kW / 220 V', c.ib, 33.64, 0.002);
igual('ligação F-N em 220/380 V', c.ligacao, 'FN');
igual('seção 6 mm² (igual ao projeto AP-1103)', c.secao, 6);
igual('disjuntor 40 A (igual ao projeto AP-1103)', c.disjuntor, 40);
igual('DR tipo A com RDC-DD no carregador', c.dr.tipo, 'A');
igual('modo 3 sem RDC-DD → DR tipo B', tipoDr({ modo: 'modo3_ac', rdc_dd_incorporado: false }).tipo, 'B');
igual('modo 4 CC → DR da instalação não exigido', tipoDr({ modo: 'modo4_dc' }).exigido, false);
igual('padrão de entrada comporta (12,1 + 33,6 ≤ 50 A)', res.calc.capacidade.atende, true);
// mesmo caso em 127/220 V: liga F-F em 220 V
const ex2 = motor.exemplo(); ex2.instalacao.tensao_fn = 127; ex2.instalacao.tensao_ff = 220; ex2.instalacao.sistema = 'bifasico';
igual('127/220 V → ligação F-F', motor.processar(ex2).calc.circuitos[0].ligacao, 'FF');
// distância maior → queda de tensão manda subir a seção
const ex3 = motor.exemplo(); ex3.pontos[0].comprimento_m = 45;
igual('45 m → 10 mm² pela queda de tensão', motor.processar(ex3).calc.circuitos[0].secao, 10);
(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  igual('orçamento de instalação', motor.montarOrcamento(res, 'execucao').itens.length > 6, true);
  fim();
})();
