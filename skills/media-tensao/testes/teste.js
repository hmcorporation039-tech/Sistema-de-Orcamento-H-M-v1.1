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

// 8) Revisão 27/10/2026 (achado A2.2)
const T = require('../scripts/lib/tabelas');
const JSZip = require('../../node_modules/jszip');
const textoDocx = async (r, tipo) => {
  const z = await JSZip.loadAsync((await motor.gerarDocumento(r, tipo)).buffer);
  return (await z.file('word/document.xml').async('string')).replace(/<[^>]+>/g, '');
};
const variar = (f) => { const d = motor.exemplo(); f(d); return motor.processar(d); };

// 8a) brita só entra se informada. Antes: 3 000 Ω·m / 10 cm assumidos em qualquer SE.
//   Sem brita, ρ1 = 400 Ω·m, ts = 0,5 s, 50 kg: Cs = 1, ρs = 400 →
//   toque = (1000 + 1,5 × 400) × 0,116 / √0,5 = 262,5 V (antes, com a brita assumida:
//   Cs = 1 − 0,09 × (1 − 400/3000) / (0,2 + 0,09) = 0,731 → 703,6 V);
//   passo = (1000 + 6 × 400) × 0,116 / √0,5 = 557,8 V.
const semBrita = variar(d => { d.aterramento.rho_brita_ohm_m = null; d.aterramento.espessura_brita_m = null; }).calc;
igual('sem brita informada: Cs = 1 e sem brita na conta', [semBrita.malha.comBrita, semBrita.malha.adm.cs], [false, 1]);
perto('sem brita: toque admissível 262,5 V (antes 703,6 V)', semBrita.malha.adm.toque, 262.5, 0.003);
perto('sem brita: passo admissível 557,8 V', semBrita.malha.adm.passo, 557.8, 0.003);
igual('sem brita: Em 632 V > 262 V → toque NÃO atende (antes "atende")', semBrita.malha.verif.toque, false);
igual('sem brita: brita fora da lista de materiais e aviso emitido', [semBrita.materiais.some(m => m.codigo === 'BRITA'), semBrita.avisos.some(a => /brita não informada/.test(a))], [false, true]);
const brita = k.materiais.find(m => m.codigo === 'BRITA');
igual('com brita (exemplo 3000 Ω·m / 15 cm) em SE abrigada: brita orçada 15 × 10 × 0,15 = 22,5 → 23 m³', brita && brita.quantidade, 23);
igual('modelo vazio não traz brita pré-preenchida', [motor.modeloVazio().aterramento.rho_brita_ohm_m, motor.modeloVazio().aterramento.espessura_brita_m], [null, null]);

// 8b) SE em poste com disjuntor: seccionamento visível = chaves fusíveis no poste
const posteDj = variar(d => { d.fornecimento.tipo_se = 'poste'; d.fornecimento.protecao = 'disjuntor'; d.cargas.quadros = [{ id: 'Q', demanda_kw: 150, fp: 0.92 }]; d.cabo_mt.comprimento_m = 0; });
const ids = posteDj.calc.unifilar.elementos.map(e => e.id);
igual('poste + disjuntor: chave fusível orçada (antes: nenhuma)', posteDj.calc.materiais.some(m => m.codigo === 'CHF' && /seccionamento visível/.test(m.descricao)), true);
igual('poste + disjuntor: unifilar com CF1 antes do disjuntor', ids.includes('CF1') && ids.indexOf('CF1') < ids.indexOf('DJ1'), true);

// 8c) transformadores grandes: In primária 2500 kVA = 2500/(√3 × 13,8) = 104,6 A > 100 A;
//     3000 kVA = 125,5 A > 80K × 1,5 = 120 A. Antes: chave 100 A e erro nos cabos de BT.
const t2500 = variar(d => { d.transformador.potencia_kva = 2500; d.cargas.quadros = [{ id: 'Q', demanda_kw: 1500, fp: 0.92 }]; }).calc;
igual('2500 kVA / 380 V: processa (antes: erro nos cabos trafo→QGBT) com barramento blindado', [t2500.bt.inDisj, t2500.bt.cabos.tipo, t2500.materiais.some(m => m.codigo === 'BUSWAY')], [4000, 'barramento_blindado', true]);
igual('2500 kVA: chave fusível de derivação 200 A (In 104,6 A > 100 A)', t2500.prot.chave.in, 200);
const t3000 = variar(d => { d.transformador.potencia_kva = 3000; d.cargas.quadros = [{ id: 'Q', demanda_kw: 1500, fp: 0.92 }]; }).calc;
igual('3000 kVA: elo 80K (≈120 A) não atende 125,5 A → aviso', [t3000.prot.chave.eloAtende, t3000.avisos.some(a => /Elo 80K/.test(a))], [false, true]);
const t220 = variar(d => { d.transformador.potencia_kva = 3000; d.fornecimento.tensao_secundaria_v = 220; d.fornecimento.tensao_secundaria_fn = 127; d.cargas.quadros = [{ id: 'Q', demanda_kw: 1500, fp: 0.92 }]; }).calc;
//   In sec = 3 000 000 / (√3 × 220) = 7 873 A > 6 300 A (maior disjuntor da tabela)
igual('3000 kVA / 220 V: In sec 7873 A > 6300 A → disjuntor NÃO atende e aviso', [Math.round(t220.corr.inSec), t220.bt.disjAtende, t220.avisos.some(a => /maior disjuntor geral/.test(a))], [7873, false, true]);
const m1500 = variar(d => { d.transformador.potencia_kva = 1500; d.fornecimento.tensao_secundaria_v = 220; d.fornecimento.tensao_secundaria_fn = 127; d.cargas.quadros = [{ id: 'Q', demanda_kw: 300, fp: 0.92 }]; }).calc;
igual('1500 kVA / 220 V: processa (antes: erro) — In 3936 A → disjuntor 4000 A', [m1500.bt.inDisj, m1500.bt.disjAtende], [4000, true]);

// 8d) TC 400-5 (Icc 8 kA / 20) com 51N = 0,3 × 1,2 × 20,92 = 7,53 A → 7,53/400 = 1,9 % do TC (0,094 A secundários)
perto('exemplo: 51N no secundário = 1,88 % da nominal do TC', k.prot.pct51n, 1.883, 0.005);
igual('exemplo: 51N abaixo de ~5 % do TC → aviso (antes: silêncio)', [k.prot.checagens.neutroNaFaixaTc, k.avisos.some(a => /TC 400-5 A escolhido pelo curto/.test(a))], [false, true]);

// 8e) para-raios: neutro não efetivamente aterrado → MCOV ≥ 1,05 × 13,8 = 14,49 kV → 18 kV (MCOV 15,3). Antes: 15 kV.
const isolado = variar(d => { d.fornecimento.neutro_aterrado = false; }).calc;
igual('neutro não aterrado: para-raios 18 kV (antes 15 kV)', [isolado.pr.ur, isolado.pr.mcov], [18, 15.3]);
igual('neutro aterrado continua 12 kV (MCOV necessária 14,49/√3 = 8,37 kV)', [k.pr.ur, k.pr.mcovNecessaria], [12, 8.37]);

// 8f) chave fusível com curto acima da capacidade usual (7,1 kA sim.) → aviso e [CONFERIR] no material
const curto40 = variar(d => { d.fornecimento.icc_3f_ka = 40; d.fornecimento.icc_ft_ka = 40; }).calc;
igual('40 kA: chave fusível não atende o curto → aviso e [CONFERIR] no material', [curto40.prot.chave.atendeCurto, curto40.avisos.some(a => /capacidade de interrupção usual de chave fusível/.test(a)), /CONFERIR: acima da capacidade/.test(curto40.materiais.find(m => m.codigo === 'CHF').descricao)], [false, true, true]);

(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  // memorial não afirma o que o cálculo não sustenta
  const memSemBrita = await textoDocx(variar(d => { d.aterramento.rho_brita_ohm_m = null; d.aterramento.espessura_brita_m = null; }), 'memorial');
  igual('memorial sem brita diz "SEM camada superficial" e não cita brita de 3000 Ω·m', [/SEM camada superficial/.test(memSemBrita), /3\.000 Ω·m com/.test(memSemBrita)], [true, false]);
  const memPoste = await textoDocx(posteDj, 'memorial');
  igual('memorial poste + disjuntor: seccionamento visível pelas chaves fusíveis no poste', /Seccionamento visível a montante do disjuntor: chaves fusíveis/.test(memPoste), true);
  const r2500 = variar(d => { d.transformador.potencia_kva = 2500; d.cargas.quadros = [{ id: 'Q', demanda_kw: 1500, fp: 0.92 }]; });
  for (const t of ['memorial', 'planilha']) igual(`2500 kVA (barramento blindado): documento ${t}`, (await motor.gerarDocumento(r2500, t)).buffer.slice(0, 2).toString(), 'PK');
  igual('memorial 2500 kVA cita o barramento blindado', /barramento blindado \(bus way\)/.test(await textoDocx(r2500, 'memorial')), true);
  const ex = motor.montarOrcamento(res, 'execucao');
  igual('orçamento de execução com serviços mt_', ex.itens.filter(i => (i.codigo || '').startsWith('mt_')).length >= 9, true);
  igual('orçamento de manutenção', motor.montarOrcamento(res, 'inspecao').itens.some(i => i.codigo === 'mt_laudo'), true);
  fim();
})();
