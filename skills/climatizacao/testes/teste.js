// Teste da skill de climatização — casos conferidos à mão (exemplo fictício, sem dado de cliente).
//
// 1) Psicrometria (ASHRAE Fundamentals cap. 1): p(0 m) = 101,325 kPa; pws(20 °C) ≈ 2,339 kPa
//    (tabela ASHRAE: 2,3392 kPa); W a 24 °C / 50 % ao nível do mar: pws(24) = 2,985 kPa,
//    pw = 1,4925 kPa, W = 0,621945·1,4925/(101,325 − 1,4925) = 0,009298 kg/kg.
// 2) Envoltória do "Escritório aberto Norte" (ΔT = 32 − 24 = 8 K):
//    alvenaria clara N: U·A·(ΔT + α·I·Rse) = 2,5·45·(8 + 0,3·450·0,04) = 2,5·45·13,4 = 1 507,5 W;
//    vidro refletivo N 30 m² com 20 % de sombra: 5,5·30·8 + 30·0,45·450·0,8 = 1 320 + 4 860 = 6 180 W.
//    Pessoas: 32 × 75 = 2 400 W sensível e 32 × 55 = 1 760 W latente.
//    Ar externo: NBR 16401-3 (2,5·32 + 0,3·320)·3,6 = 633,6 m³/h < 27·32 = 864 m³/h (Portaria 3.523).
// 3) IPLV (AHRI 550/590): 0,01·5,6 + 0,42·6,5 + 0,45·7,4 + 0,12·7,0 = 6,956.
//    Água gelada de 30 TR (105,506 kW) com ΔT 5,5 K: 105,506/(999,7·4,19·5,5)·3600 = 16,49 m³/h.
//    Bomba primária 16,49 m³/h × 10 mca, η 0,7: 1000·9,81·(16,49/3600)·10/0,7 = 642 W × 1,15 = 0,738 kW > 1 cv → 1,5 cv.
// 4) Dutos pelo motor comum (o mesmo da pressurização): 0,75 × 0,75 m com 5,264 m³/s → 1,036 Pa/m.
// 5) Motor do ventilador: eixo 4,57 kW × 1,15 = 5,26 kW → 7,5 cv (5,516 kW); In = 5 516/(√3·380·0,89·0,84) = 11,21 A.
// 6) PMOC: uso público e coletivo → obrigatório (Lei 13.589, art. 1º); acima de 5 TR → RT (Portaria 3.523, art. 6º).
const fs = require('fs');
const path = require('path');
const motor = require('../scripts/lib/index');
const K = require('../scripts/lib/calculo');
const C = require('../scripts/lib/centrais');
const P = require('../scripts/lib/pmoc');
const CAD = require('../scripts/lib/cad');
const T = require('../scripts/lib/tabelas');
const DU = require('../../_comum/dutos');
const M = require('../../_comum/eletrico/motores');
const { verificador } = require('../../_comum/teste');
const { perto, igual, fim } = verificador('climatização');

// 1) psicrometria
perto('pressão atmosférica ao nível do mar', K.pressaoAtmosferica(0), 101.325, 0.0001);
perto('pressão a 1 100 m (Brasília)', K.pressaoAtmosferica(1100), 88.79, 0.001);
perto('pws a 20 °C (Hyland-Wexler)', K.pressaoSaturacao(20), 2.3392, 0.001);
perto('W a 24 °C / 50 % no nível do mar', K.umidadePorUr(24, 50, 101.325), 0.009298, 0.002);
perto('UR de volta do W', K.urDe(24, K.umidadePorUr(24, 50, 101.325), 101.325), 50, 0.0001);
perto('bulbo úmido igual ao seco = saturado', K.umidadePorTbu(20, 20, 101.325), K.umidadePorUr(20, 100, 101.325), 0.001);
perto('1 TR = 3 516,85 W', K.kwParaTr(3516.8525), 1, 1e-9);

// 2) carga do exemplo
const res = motor.processar(motor.exemplo());
const { calc } = res;
const a1 = calc.ambientes.find(a => a.id === 'A1');
perto('parede clara Norte (sol-ar em regime)', a1.superficies[0].q, 1507.5, 0.0001);
perto('vidro refletivo Norte com 20 % de sombra', a1.superficies[1].q, 6180, 0.0001);
perto('pessoas: sensível', a1.componentes.pessoasS, 2400, 0.0001);
perto('pessoas: latente', a1.componentes.pessoasL, 1760, 0.0001);
perto('ar externo: mínimo legal de 27 m³/h·pessoa vence a NBR 16401-3', a1.voz * 3.6, 864, 0.0001);
perto('ar externo pela NBR 16401-3 (Fp·Pz + Fa·Az)', a1.vozNorma * 3.6, 633.6, 0.0001);
igual('critério do ar externo declarado', /Portaria 3.523/.test(a1.criterioAr), true);
perto('total = sensível + latente', a1.total, a1.sensivel + a1.latente, 1e-9);
perto('fator de segurança de 10 % aplicado', a1.sensivel, (a1.componentes.envoltoria + 2400 + a1.componentes.iluminacao + a1.componentes.equipamentos + a1.componentes.arExternoS) * 1.1, 1e-9);
const sem27 = motor.exemplo(); sem27.projeto.minimo_27_m3h_pessoa = false;
perto('sem o mínimo da Portaria, vale a NBR 16401-3', motor.processar(sem27).calc.ambientes[0].voz * 3.6, 633.6, 0.0001);
igual('sistema escolhido no formulário', [calc.sel.sistema, calc.sel.automatico], ['chiller', false]);

// 3) VAV e ar externo multizona
const ahu1 = calc.projeto.unidades.find(u => u.id === 'AHU-01');
const sala = ahu1.vavs.find(v => v.id === 'A3');
igual('zona densa: mínima = máxima e aviso de DCV', [Math.abs(sala.vMin - sala.vMax) < 1e-12, sala.densa, calc.avisos.some(t => /zona densa/.test(t))], [true, true, true]);
igual('Ev pela tabela (Zpz 0,30 → 0,8)', C.eficienciaVentilacao(0.3, 0.2).ev, 0.8);
perto('Ev pelo Apêndice A acima de 0,55 (1 + Xs − Zpz)', C.eficienciaVentilacao(0.6, 0.12).ev, 0.52, 1e-9);
igual('escritório grande dividido em caixas VAV que cabem na entrada', ahu1.vavs.find(v => v.id === 'A1').caixas >= 2, true);
igual('VAV: mínima ≥ 20 % da máxima e ≤ máxima', ahu1.vavs.every(v => v.vMin >= 0.2 * v.vMax - 1e-9 && v.vMin <= v.vMax + 1e-9), true);
igual('VAV: setpoint de pressão do duto e sensor declarados', [ahu1.controlePressao.setpoint > 0, /2\/3/.test(ahu1.controlePressao.sensor)], [true, true]);
igual('ventilador VAV com inversor', ahu1.motor.partida.tipo, 'inversor');
igual('reaquecimento elétrico calculado por VAV', ahu1.reaquecimento.length, ahu1.vavs.length);

// 4) central de água gelada
const ce = calc.projeto.central;
perto('IPLV pela AHRI 550/590', ce.iplv, 6.956, 0.0001);
igual('2 chillers de 30 TR', [ce.nChillers, ce.trPorChiller], [2, 30]);
perto('vazão de água gelada por chiller (ΔT 5,5 K)', ce.vazaoChiller, 16.49, 0.002);
perto('mínimo da 90.1 Path A — água, deslocamento positivo < 75 TR', ce.minimo.a.cop, 4.69, 0.001);
igual('COP 5,6 e IPLV 6,96 atendem o Path A', ce.atende.pathA, true);
const bp = ce.bombas.find(b => b.tag === 'BAGP-01');
perto('altura da bomba primária = evaporador + casa de máquinas', bp.altura, 10, 1e-9);
igual('bomba primária 1,5 cv (0,738 kW com folga > 1 cv)', bp.motor.cv, 1.5);
igual('bombas: 3 primárias (1 reserva), 2 secundárias com inversor, 3 de condensação', [ce.bombas.filter(b => /^BAGP/.test(b.tag)).length, ce.bombas.filter(b => /^BAGS/.test(b.tag) && b.partida === 'inversor').length, ce.bombas.filter(b => /^BAC/.test(b.tag)).length], [3, 2, 3]);
igual('tubo escolhido pela velocidade máxima', ce.bombas.every(b => b.tubo.v <= T.HIDRAULICA.v_max_tubo_ms + 1e-9), true);
igual('sem COP informado: adota o mínimo da 90.1 com aviso', (() => { const d = motor.exemplo(); d.central.cop = null; const x = motor.processar(d).calc; return [x.projeto.central.cop, x.avisos.some(t => /COP do chiller não informado/.test(t))]; })(), [4.69, true]);

// 5) motores comuns e dutos comuns
perto('dutos: mesmo resultado da pressurização (1,036 Pa/m)', DU.perdaAtrito({ vazao: 5.264, largura: 0.75, altura: 0.75, comprimento: 1, eps: DU.RUGOSIDADE_M.metalico }).porMetro, 1.036, 0.002);
const tr = DU.dimensionarTrecho({ vazao: 0.5, perdaAlvo: 1, vMax: 8, forma: 'circular' });
igual('trecho circular: menor diâmetro que atende perda e velocidade', [tr.porMetro <= 1, tr.v <= 8, DU.perdaAtritoCircular({ vazao: 0.5, diametro: DU.DIAMETROS_M[DU.DIAMETROS_M.indexOf(tr.diametro) - 1], comprimento: 1, eps: DU.RUGOSIDADE_M.metalico }).porMetro > 1], [true, true, true]);
const mv = M.motorDaCarga({ kwEixo: 4.57, folga: 1.15, tensao: 380, partida: 'inversor' });
igual('motor do ventilador: 7,5 cv', mv.cv, 7.5);
perto('In do motor de 7,5 cv (η 0,89, FP 0,84)', mv.in, 11.21, 0.002);

// 6) seleção automática (critério H&M) com o mesmo exemplo
const auto = (fatia) => { const d = motor.exemplo(); d.projeto.sistema = 'auto'; d.projeto.distribuicao = 'vac'; d.ambientes = d.ambientes.slice(...fatia); return motor.processar(d).calc; };
const sp = auto([2, 4]);
igual('2 salas pequenas → split', sp.sel.sistema, 'split');
igual('split: capacidade comercial ≥ carga', sp.projeto.split.every(s => s.btuh * s.n >= sp.ambientes.find(a => a.id === s.id).btuh - 1e-6), true);
igual('4 ambientes de escritório → VRF', auto([0, 4]).sel.sistema, 'vrf');
igual('auditório + foyer (≥ 10 TR, poucos ambientes) → self', auto([4, 6]).sel.sistema, 'self');

// 7) PMOC
igual('PMOC obrigatório e RT obrigatório (60 TR, uso coletivo)', [calc.pmoc.obrigatoriedade.obrigatorio, calc.pmoc.obrigatoriedade.rtObrigatorio], [true, true]);
igual('limite de RT: 5 TR exatos não exige (Portaria: "acima de 5 TR")', P.obrigatoriedade({ pmoc: {} }, 5).rtObrigatorio, false);
igual('uso privado: PMOC não exigido pela lei', P.obrigatoriedade({ pmoc: { uso_publico_coletivo: false } }, 3).obrigatorio, false);
igual('inventário do projeto: chillers, torres, bombas, fancoils e VAV', ['chiller', 'torre', 'bomba', 'fancoil', 'vav'].every(t => calc.pmoc.inventario.itens.some(e => e.tipo === t)), true);
igual('rotinas com periodicidade válida e rotinas gerais', [calc.pmoc.plano.linhas.every(l => T.PERIODICIDADES[l.periodicidade]), calc.pmoc.plano.linhas.some(l => l.tipo === 'geral')], [true, true]);
const ex = motor.exemplo(); ex.equipamentos_existentes = [{ tag: 'SPL-01', tipo: 'split', capacidade_btuh: 36000, quantidade: 2 }];
igual('inventário existente: 2 × 36 000 BTU/h = 6 TR', P.calcularPmoc(ex, null).trTotal, 6);

// 8) vistoria e medições
igual('vazão: 430 de 540 m³/h → NC; 560 de 530 → C', res.med.vazoes.map(m => m.resultado), ['C', 'NC']);
igual('CO₂ 1 180 ppm com externo 420 (limite 1 120, NBR 17037) → NC', res.med.ambiente[1].parcial.co2, 'NC');
const re09 = motor.exemplo(); re09.inspecao.criterio_qai = 're09';
igual('mesmo CO₂ pela RE 09/2003 (1 000 ppm) → NC; UR 61 % ok', [motor.processar(re09).med.ambiente[1].parcial.co2, motor.processar(re09).med.ambiente[1].parcial.ur], ['NC', 'C']);
igual('ΔT de água 5,3 K ≥ 80 % de 5,5 → C', res.med.agua[0].resultado, 'C');
igual('checklist: A3 e Q2 viram NC pelas medições', ['A3', 'Q2'].map(c => res.checklist.find(x => x.cod === c).situacao), ['NC', 'NC']);
igual('sem split/VRF: itens S como NA', res.checklist.filter(x => /^S\d/.test(x.cod)).every(x => x.situacao === 'NA'), true);
igual('parecer não conforme preliminar', res.parecer.situacao, 'NAO_CONFORME_PRELIMINAR');

// 9) CAD / 3D (tipos próprios da skill)
igual('layer HVAC-DIFUSOR → difusor', CAD.tipoDePontoClimatizacao({ layer: 'HVAC-DIFUSOR' }).simbolo, 'HM-CLIM-DIFUSOR');
igual('layer genérica + texto "Unidade condensadora 36000 BTU/h"', CAD.tipoDePontoClimatizacao({ layer: 'AR-COND', texto: 'Unidade condensadora 36000 BTU/h' }).simbolo, 'HM-CLIM-CONDENSADORA');
igual('"Difusor da VAV" é difusor', CAD.tipoDePontoClimatizacao({ layer: 'HVAC', texto: 'Difusor da VAV' }).simbolo, 'HM-CLIM-DIFUSOR');
igual('"Caixa VAV 250 mm" é VAV', CAD.tipoDePontoClimatizacao({ layer: 'HVAC', texto: 'Caixa VAV 250 mm' }).simbolo, 'HM-CLIM-VAV');
igual('layers de climatização reconhecidas', ['HVAC', 'AVAC', 'AR-CONDICIONADO', 'MEC-DUTOS', 'M-DIFUSORES'].map(CAD.ehLayerDaClimatizacao), [true, true, true, true, true]);
igual('layer elétrica não é climatização', CAD.ehLayerDaClimatizacao('ELE-TOMADA'), false);
igual('contagem de blocos por tipo', CAD.contarPontos([{ layer: 'HVAC-DIFUSOR', quantidade: 12 }, { layer: 'HVAC', nome: 'FANCOIL FC-01' }]).contagem['HM-CLIM-FANCOIL'], 1);
igual('os 7 tipos têm símbolo de planta e ESPEC 3D (formas que o visualizador já desenha)', CAD.SIMBOLOS_CLIMATIZACAO.every(s => CAD.SIMBOLOS_PLANTA[s] && CAD.ESPEC_3D[s] && ['luminaria', 'emergencia', 'catraca'].includes(CAD.ESPEC_3D[s].forma) && CAD.ESPEC_3D[s].tam.every(v => v > 0 && v <= 1.2)), true);
const pl = CAD.planta(res);
igual('planta: difusores, grelhas e VAV por ambiente, só símbolos declarados', [pl.pontos.length, pl.pontos.every(p => p.itens.every(i => CAD.SIMBOLOS_PLANTA[i.simbolo] && i.n > 0))], [6, true]);

// 10) pendências [CONFERIR] e códigos de mão de obra
igual('pendências [CONFERIR] listadas para o memorial', calc.pendencias.length >= 15 && calc.pendencias.every(p => /\[CONFERIR/.test(p)), true);
const ref = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'backend', 'src', 'services', 'precosMaoDeObraReferencia.js'), 'utf8');
const registrados = new Set([...ref.matchAll(/codigo: '(clim_[a-z_]+)'/g)].map(m => m[1]));

(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  const usados = new Set();
  for (const modo of motor.modosOrcamento.map(m => m.modo)) {
    const o = motor.montarOrcamento(res, modo);
    o.itens.filter(i => i.codigo).forEach(i => usados.add(i.codigo));
    igual(`orçamento ${modo} sem quantidade zero`, o.itens.every(i => i.quantidade > 0), true);
  }
  for (const fatia of [[2, 4], [0, 4], [4, 6]]) {
    const d = motor.exemplo(); d.projeto.sistema = 'auto'; d.projeto.distribuicao = 'vac'; d.ambientes = d.ambientes.slice(...fatia);
    const x = motor.processar(d);
    for (const modo of motor.modosOrcamento.map(m => m.modo)) motor.montarOrcamento(x, modo).itens.filter(i => i.codigo).forEach(i => usados.add(i.codigo));
  }
  igual('orçamento de instalação com chiller, fancoil, VAV, dutos e projeto', ['clim_chiller', 'clim_fancoil', 'clim_vav', 'clim_duto', 'clim_projeto'].every(cd => usados.has(cd)), true);
  igual('todos os códigos clim_ do orçamento estão na base padrão', [...usados].filter(cd => !registrados.has(cd)), []);
  fim();
})();
