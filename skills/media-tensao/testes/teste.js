// Teste da skill de média tensão — casos conferidos à mão:
// trafo 500 kVA 13,8 kV / 380 V, Z = 5 %:
//   In prim = 500 / (√3 × 13,8) = 20,92 A; In sec = 500 000 / (√3 × 380) = 759,7 A;
//   Icc sec = S / (√3·V·Z%) = 759,7 / 0,05 = 15,19 kA.
// Cabo de MT pelo curto: 10 kA, 0,5 s, k = 143 → S ≥ 10 000 × √0,5 / 143 = 49,4 mm² → 50 mm².
// Malha: exemplo 1 do anexo B da IEEE Std 80 (70 × 70 m, ρ = 400 Ω·m) → Rg 2,78 Ω, Km 0,89,
//   Ki 2,272, Em ≈ 1 002 V; toque/passo admissíveis (70 kg, Cs 0,74) 838,2 V / 2 686,6 V.
const motor = require('../scripts/lib/index');
const C = require('../scripts/lib/calculo');
const { verificador } = require('../../_comum/teste');
const { perto, igual, fim } = verificador('média tensão');

// 1) correntes e curto do transformador
const corr = C.correntes(500, 13.8, 380, 5);
perto('In primária 500 kVA / 13,8 kV', corr.inPrim, 20.92, 0.002);
perto('In secundária 500 kVA / 380 V', corr.inSec, 759.67, 0.002);
perto('Icc secundário S/(√3·V·Z%)', corr.iccSecInfKa, 15.19, 0.003);

// 2) escolha do transformador pela demanda (com reserva)
igual('414 kVA × 1,2 = 497 → 500 kVA', C.escolherTransformador(414 * 1.2).kva, 500);
igual('250 kVA × 1,2 = 300 → 300 kVA (limite exato)', C.escolherTransformador(250 * 1.2).kva, 300);
igual('310 kVA × 1,2 = 372 → 500 kVA', C.escolherTransformador(310 * 1.2).kva, 500);
igual('carregamento máx. 80 %: 250 kVA → 500 kVA', C.escolherTransformador(250, { carregamentoMax: 80 }).kva, 500);
igual('Z típica 225 kVA óleo = 4,5 %', C.escolherTransformador(200).z, 4.5);

// 3) cabo de MT pelo curto-circuito
perto('S mínima pelo curto 10 kA / 0,5 s', C.secaoPorCurto(10, 0.5), 49.44, 0.002);
const cabo = C.dimensionarCaboMt({ ib: 20.9, iProtecao: 25.1, iccKa: 10, iccFtKa: 3, t: 0.5, cfg: { L: 50, metodo: 'eletroduto_enterrado', isolacao: 'EPR', smin: 25, fc: 1 }, kv: 13.8, fp: 0.92 });
igual('cabo de MT 50 mm² definido pelo curto', [cabo.secao, cabo.criterio], [50, 'curto-circuito (integral de Joule)']);
const cabo2 = C.dimensionarCaboMt({ ib: 20.9, iProtecao: 25.1, iccKa: 12.5, iccFtKa: 3, t: 1, cfg: { L: 50, metodo: 'eletroduto_enterrado', isolacao: 'EPR', smin: 25, fc: 1 }, kv: 13.8, fp: 0.92 });
igual('12,5 kA / 1 s → 95 mm²', cabo2.secao, 95);

// 4) malha — exemplo 1 da IEEE 80 (sem hastes)
perto('Rg Sverak (IEEE 80 ex. 1)', C.resistenciaSverak(400, 4900, 1540, 0.5), 2.78, 0.005);
const tm = C.tensoesMalha({ rho: 400, lx: 70, ly: 70, D: 7, h: 0.5, d: 0.01, lc: 1540, nHastes: 0, lHaste: 0, ig: 1908 });
perto('Km (IEEE 80 ex. 1)', tm.km, 0.89, 0.005);
perto('Ki (IEEE 80 ex. 1)', tm.ki, 2.272, 0.001);
perto('Em (IEEE 80 ex. 1)', tm.em, 1002.1, 0.005);
const adm70 = C.tensoesAdmissiveis({ rhoSolo: 400, rhoBrita: 2500, hs: 0.102, ts: 0.5, pesoKg: 70 });
perto('toque admissível 70 kg (IEEE 80 ex. 1)', adm70.toque, 838.2, 0.005);
perto('passo admissível 70 kg (IEEE 80 ex. 1)', adm70.passo, 2686.6, 0.005);
perto('K de Onderdonk, solda exotérmica 850 °C', C.kOnderdonk(850), 0.2638, 0.003);

// 5) exemplo completo (SE abrigada 500 kVA)
const res = motor.processar(motor.exemplo());
const k = res.calc;
igual('exemplo: trafo 500 kVA', k.trafo.kva, 500);
igual('exemplo: SE abrigada, proteção por disjuntor', [k.se.tipo, k.prot.modo], ['abrigada', 'disjuntor']);
igual('exemplo: cabo de MT 50 mm² (curto 8 kA / 0,5 s)', k.cabo.secao, 50);
igual('exemplo: para-raios 12 kV', k.pr.ur, 12);
igual('exemplo: disjuntor BT 800 A / 25 kA', [k.bt.inDisj, k.bt.icu], [800, 25]);
igual('exemplo: medição em MT', k.med.local, 'MT');
igual('exemplo: unifilar entrada → QGBT', [k.unifilar.elementos[0].tipo, k.unifilar.elementos[k.unifilar.elementos.length - 1].tipo], ['ponto_entrega', 'barramento_bt']);

// 6) regras por potência
const pequeno = motor.exemplo();
pequeno.cargas.quadros = [{ id: 'Q1', descricao: 'Geral', demanda_kw: 160, fp: 0.92 }];
pequeno.fornecimento.tipo_se = 'auto';
pequeno.transformador.z_pct = null;
const rp = motor.processar(pequeno).calc;
igual('174 kVA × 1,2 → 225 kVA em poste com chave fusível', [rp.trafo.kva, rp.se.tipo, rp.prot.modo, rp.prot.elo], [225, 'poste', 'fusivel', '10K']);
const forcaPoste = motor.exemplo(); forcaPoste.fornecimento.tipo_se = 'poste';
igual('500 kVA não pode ser em poste', motor.processar(forcaPoste).calc.se.tipo, 'abrigada');
const forcaFusivel = motor.exemplo(); forcaFusivel.fornecimento.protecao = 'fusivel';
igual('500 kVA com fusível → disjuntor', motor.processar(forcaFusivel).calc.prot.modo, 'disjuntor');

// 7) demanda importada da skill de elétrica
const imp = motor.exemplo();
imp.cargas.quadros = [];
imp.cargas.eletrica = require('../../eletrica/exemplos/exemplo-residencia.json');
imp.cargas.demanda_total_kw = null;
const ri = motor.processar(imp).calc;
igual('importação da skill de elétrica vira quadro', [ri.dem.quadros.length, ri.dem.quadros[0].origem], [1, 'skill elétrica']);

(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  const ex = motor.montarOrcamento(res, 'execucao');
  igual('orçamento de execução com serviços mt_', ex.itens.filter(i => (i.codigo || '').startsWith('mt_')).length >= 9, true);
  igual('orçamento de manutenção', motor.montarOrcamento(res, 'inspecao').itens.some(i => i.codigo === 'mt_laudo'), true);
  fim();
})();
