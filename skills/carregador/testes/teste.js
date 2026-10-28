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
// Padrão de entrada pela fase: 8 kVA existentes equilibrados → 8000/(3·220) = 12,12 A por fase
// + wallbox 7400/220 = 33,64 A na fase A = 45,76 A ≤ 50 A
perto('padrão: fase A = 12,12 + 33,64', res.calc.capacidade.iTotal, 45.76, 0.001);
igual('DPS Uc 275 V (220/380 V TN-S: 1,1·220 = 242 V, Tabela 49)', res.calc.dps.uc, 275);

// Achado da revisão 27/10/2026: 2 wallboxes 7,4 kW F-N em 380/220 V NÃO são carga trifásica equilibrada
{
  const C = require('../scripts/lib/calculo');
  const d = motor.exemplo();
  d.pontos.push({ ...d.pontos[0], id: 'VE2', descricao: 'Vaga 2' });
  d.instalacao.demanda_existente_kva = 15;
  const r = C.calcular(d);
  // antes: 14 800/(√3·380) = 22,5 A → alimentador 25 A / 2,5 mm², e o padrão "cabia" (22,8 + 22,5 = 45,3 A)
  igual('2 pontos distribuídos nas fases A e B', r.circuitos.map(x => x.fases), ['A', 'B']);
  perto('fase mais carregada: 7400/220', r.iDistrib, 33.64, 0.001);
  // alimentador: Ib 33,64 A → 40 A (= maior disjuntor a jusante); queda (laço F+N) em 6 mm²:
  // 2·0,0225·10·33,64/(6·220) = 1,15 % > 1 % → 10 mm² (0,69 %)
  igual('alimentador: disjuntor 40 A (≥ Ib e ≥ maior a jusante)', r.alimentador.disjuntor, 40);
  igual('alimentador: 10 mm² pela queda', r.alimentador.secao, 10);
  perto('alimentador: queda 0,69 %', r.alimentador.queda, 0.688, 0.002);
  // padrão 50 A com 15 kVA existentes: 15000/(3·220) = 22,73 A + 33,64 A = 56,36 A > 50 A → não cabe
  perto('padrão: fase A = 22,73 + 33,64', r.capacidade.iTotal, 56.36, 0.001);
  igual('padrão: não cabe (antes dizia que cabia)', r.capacidade.atende, false);
  // os dois na mesma fase (informado): 2 × 33,64 = 67,27 A → disjuntor 70 A
  const d2 = JSON.parse(JSON.stringify(d));
  d2.pontos.forEach(p => { p.fase = 'A'; });
  const r2 = C.calcular(d2);
  perto('mesma fase: 67,27 A', r2.alimentador.ib, 67.27, 0.001);
  igual('mesma fase: disjuntor 70 A', r2.alimentador.disjuntor, 70);
  // ponto trifásico em sistema bifásico não existe
  const d3 = motor.exemplo(); d3.instalacao.sistema = 'bifasico'; d3.pontos[0].fases = '3';
  let erro = null; try { C.calcular(d3); } catch (e) { erro = e.message; }
  igual('ponto trifásico em sistema bifásico → erro', /carregador trifásico em sistema bifasico/.test(erro || ''), true);
}
(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  igual('orçamento de instalação', motor.montarOrcamento(res, 'execucao').itens.length > 6, true);
  fim();
})();
