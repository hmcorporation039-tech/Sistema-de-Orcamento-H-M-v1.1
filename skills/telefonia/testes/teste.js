// Teste de telefonia e interfonia — ramais com reserva, central e placas,
// prumada CI por pavimento, CCI por unidade, blocos IDC-110, DPS, nobreak,
// PABX IP (switch no bloco > 90 m), híbrido (gateway FXS) e casos de borda.
// Exemplo: condomínio de 2 torres × 9 pavimentos × 3 unidades = 54 ramais.
const motor = require('../scripts/lib/index');
const C = require('../scripts/lib/calculo');
const { perto, igual, fim } = require('../../_comum/teste').verificador('telefonia');

const clonar = (o) => JSON.parse(JSON.stringify(o));
const res = motor.processar(motor.exemplo());
const { calc } = res;
const f = C.FATOR_CABO;
const mat = (c, cod) => c.materiais.filter(m => m.codigo === cod).reduce((a, m) => a + m.quantidade, 0);

// Ramais: 54 unidades + 5 áreas comuns + 1 portaria + 2 porteiros = 62; × 1,2 = 74,4 → 75
igual('unidades e ramais de unidades', [calc.unidades, calc.ramaisUnidades], [54, 54]);
igual('ramais em uso / com reserva', [calc.ramaisUsados, calc.ramaisNec], [62, 75]);
// Central: menor ≥ 75 → 112 ramais; placas ⌈75 ÷ 16⌉ = 5 (80 ramais instalados)
igual('central de 112 ramais com 5 placas de 16', [calc.central.ramais, calc.nCentrais, calc.placas, calc.capacidadeInstalada], [112, 1, 5, 80]);
igual('terminais dedicados (54 + 5), portaria e porteiros', [calc.terminaisDedicados, calc.terminaisPortaria, calc.nPorteiros], [59, 1, 2]);
// Prumada: 3 unidades × 1 par × 1,2 = 3,6 → 4 pares → CI-50 10 pares por pavimento
const pA9 = calc.blocos[0].pavimentos[8];
igual('pares por pavimento → CI 10 pares', [pA9.paresNec, pA9.ciPares], [4, 10]);
// Torre A pav. 9: (12 + 9 × 2,9) × 1,15 + 2 = 45,815 m
perto('CI Torre A 9º pavimento', pA9.compCi, (12 + 9 * 2.9) * f + 2);
// CI total = Σ (dDG + k·h) × 1,15 + 2, k = 1…9, nas duas torres (12 m e 40 m)
const somaCi = [12, 40].reduce((a, d) => a + Array.from({ length: 9 }, (_, k) => (d + (k + 1) * 2.9) * f + 2).reduce((x, y) => x + y, 0), 0);
igual('CI-50 10 pares total', calc.cabos.ciPorPares[10], Math.ceil(somaCi));
// CCI 2 pares: 54 × (15 × 1,15 + 2,9) + áreas Σ(d × 1,15 + 3) + portaria (8 × 1,15 + 3)
const cci = 54 * (15 * f + 2.9) + [30, 35, 20, 25, 45].reduce((a, d) => a + d * f + 3, 0) + (8 * f + 3);
igual('CCI-50 2 pares', calc.cabos.cciM[2], Math.ceil(cci - 1e-9));
igual('CCI-50 4 pares dos porteiros', calc.cabos.cciM[4], Math.ceil((25 + 35) * f + 6 - 1e-9));
// Blocos: andares 18 × 1; DG = ⌈200 pares de cabo ÷ 10⌉ (180 CI + 10 áreas + 2 portaria + 8 porteiros) + ⌈80 ÷ 10⌉ + ⌈1 tronco ÷ 10⌉ = 20 + 8 + 1
igual('blocos IDC-110 (DG / andares)', [calc.paresCabosDg, calc.blocosDg, calc.blocosAndares], [200, 29, 18]);
igual('suportes (3 no DG + 18 andares)', calc.suportes, 21);
// DPS: tronco 1, porteiros 2, piscina 1, Torre B (rota externa) 9 cabos × 1 módulo × 2 pontas = 18, CA 1
igual('DPS por tipo', [calc.dps.tronco, calc.dps.porteiro, calc.dps.area, calc.dps.modulos, calc.dps.ca], [1, 2, 1, 18, 1]);
igual('TAP no DG e na Torre B', calc.taps, 2);
// Nobreak: 30 W + (5 placas + 1 placa de tronco) × 4 W = 54 W → 54 ÷ 0,7 × 1,25 = 96 VA → 600 VA;
// bateria 54 × 4 ÷ (12 × 0,85) × 1,25 = 26,5 Ah → 40 Ah
const nb = calc.nobreaks[0];
perto('carga do nobreak', nb.cargaW, 54);
perto('bateria necessária', nb.ahNec, 54 * 4 / (12 * 0.85) * 1.25);
igual('nobreak 600 VA com bateria 40 Ah', [nb.va, nb.bateriaAh], [600, 40]);
igual('lista de ramais completa', calc.ramaisLista.length, 62);
igual('numeração bloco+pavimento+unidade', [calc.ramaisLista[0].ramal, calc.ramaisLista.find(r => r.bloco === 'Torre B' && r.pavimento === 9).ramal], ['1101', '2901']);
// Planta: 1 ponto de interfone por unidade, no ambiente "Cozinha"
const unids = calc.ambientes.filter(a => a.tipo === 'unidade');
igual('ambientes de unidade para a planta', [unids.length, unids.every(a => a.terminais === 1 && a.ambiente_planta === 'Cozinha')], [54, true]);
// Inspeção: N1/N2 NA (analógico); P2 NC informada; teste de áudio com falha → NC
igual('itens de rede IP não aplicáveis', ['N1', 'N2'].map(c => res.checklist.find(x => x.cod === c).situacao), ['NA', 'NA']);
igual('teste ramal a ramal', res.testes.map(t => t.resultado), ['C', 'NC']);
igual('parecer não conforme (preliminar)', res.parecer.situacao, 'NAO_CONFORME_PRELIMINAR');

// Borda: reserva 0 e 12 unidades por andar (12 × 1,2 = 14,4 → 15 pares → CI 20; blocos = 2)
const d1 = clonar(motor.exemplo());
d1.blocos[0].unidades_por_pavimento = 12;
const c1 = motor.processar(d1).calc;
igual('12 unid./andar → CI 20 pares, 3 blocos (24 pares de ramal)', [c1.blocos[0].pavimentos[0].ciPares, c1.blocos[0].pavimentos[0].blocosIdc], [20, 3]);
const d1b = clonar(motor.exemplo());
d1b.sistema.reserva_pct = 0;
igual('reserva 0 → ramais exatos', motor.processar(d1b).calc.ramaisNec, 62);
// Borda: prédio pequeno (10 ramais) → central compacta de 16, sem placas
const d2 = { sistema: { tipo: 'analogica', terminais_portaria: 1 }, blocos: [{ nome: 'Edifício', pavimentos: 4, unidades_por_pavimento: 2 }] };
const c2 = motor.processar(d2).calc;
igual('central compacta de 16 ramais', [c2.ramaisNec, c2.central.ramais, c2.placas], [11, 16, 0]);
// Borda: 3 torres × 20 pav. × 4 unid. = 240 ramais → 2 centrais de 192 + aviso
const d3 = clonar(motor.exemplo());
d3.blocos = [1, 2, 3].map(i => ({ nome: `T${i}`, pavimentos: 20, unidades_por_pavimento: 4, distancia_dg_m: 20 }));
const c3 = motor.processar(d3).calc;
igual('acima de 192 ramais → 2 centrais', [c3.central.ramais, c3.nCentrais], [192, 2]);
igual('aviso de centrais interligadas', c3.avisos.some(a => /centrais interligadas/.test(a)), true);
// Borda: DPS desativado com pares externos → NC T1 (P2)
const d4 = clonar(motor.exemplo());
d4.sistema.dps_linha = false;
const r4 = motor.processar(d4);
igual('sem DPS → NC T1 P2', [r4.ncs.some(n => n.item === 'T1' && n.prioridade === 'P2'), r4.calc.dps.total], [true, 0]);
// Borda: PABX IP — 75 licenças; Torre B (rota externa) com switch local e fibra
const d5 = clonar(motor.exemplo());
d5.sistema.tipo = 'ip';
const c5 = motor.processar(d5).calc;
igual('PABX IP: licenças e sem CI/CCI', [c5.licencas, c5.cabos.ciM, c5.cabos.cciM[2], c5.blocosAndares], [75, 0, 0, 0]);
igual('Torre B com switch local; Torre A centralizada', c5.blocos.map(b => b.switchLocal), [false, true]);
// DG: 27 (Torre A) + 5 áreas + 1 portaria + 2 porteiros = 35 pontos; + PABX + uplink + 2 → ⌈39 ÷ 24⌉ = 2 switches
igual('pontos e switches no DG', [c5.locaisRede[0].pontos, c5.locaisRede[0].switches], [35, 2]);
igual('fibra Torre B (40 × 1,15 + 10)', c5.cabos.fibraM, Math.ceil(40 * f + 10));
perto('PoE total', c5.poeW, 59 * 4 + 6 + 2 * 8);
// Borda: Torre A IP com DG a 80 m → ponto mais distante > 90 m → switch local
const d6 = clonar(d5);
d6.blocos[0].distancia_dg_m = 80;
igual('IP > 90 m → switch no bloco', motor.processar(d6).calc.blocos[0].switchLocal, true);
// Borda: híbrido — 61 ramais analógicos × 1,2 = 73,2 → 74 portas FXS → 3 × 32 portas
const d7 = clonar(motor.exemplo());
d7.sistema.tipo = 'hibrido';
const c7 = motor.processar(d7).calc;
igual('híbrido: FXS e gateways', [c7.ramaisAnalogicos, c7.fxsNec, c7.gwFxs.qtd, c7.gwFxs.valor], [61, 74, 3, 32]);
igual('híbrido: prumada CI mantida e portaria IP', [c7.cabos.ciPorPares[10] > 0, c7.tomadasRj45], [true, 1]);
// Borda: topologia direta — CCI do DG à unidade, sem CI e sem blocos nos andares
const d8 = clonar(motor.exemplo());
d8.sistema.topologia = 'direta';
const c8 = motor.processar(d8).calc;
igual('direta: sem CI, sem blocos de andar', [c8.cabos.ciM, c8.blocosAndares], [0, 0]);
perto('direta: ramal Torre A 9º pav.', c8.blocos[0].pavimentos[8].compRamal, (12 + 9 * 2.9 + 15) * f + 2.9);
// Borda: 2 ramais por unidade e infraestrutura nova
const d9 = clonar(motor.exemplo());
d9.sistema.ramais_por_unidade = 2;
d9.sistema.infra_existente = false;
const c9 = motor.processar(d9).calc;
igual('2 ramais/unidade → 108 ramais de unidades, CI 10 pares (3 × 2 × 1,2 = 7,2 → 8)', [c9.ramaisUnidades, c9.blocos[0].pavimentos[0].paresNec, c9.blocos[0].pavimentos[0].ciPares], [108, 8, 10]);
igual('infra nova: 18 caixas de andar', [c9.caixasAndar, mat(c9, 'CXA')], [18, 18]);
// Borda: sem blocos
let erro = '';
try { motor.processar(motor.modeloVazio()); } catch (e) { erro = e.message; }
igual('modelo vazio pede blocos', /ao menos um bloco/.test(erro), true);

(async () => {
  for (const t of motor.tiposDisponiveis(res)) igual(`documento ${t}`, (await motor.gerarDocumento(res, t)).buffer.slice(0, 2).toString(), 'PK');
  for (const t of motor.tiposDisponiveis(motor.processar(d5))) igual(`documento IP ${t}`, (await motor.gerarDocumento(motor.processar(d5), t)).buffer.slice(0, 2).toString(), 'PK');
  const orc = motor.montarOrcamento(res, 'execucao');
  const q = (cod) => (orc.itens.find(i => i.codigo === cod) || {}).quantidade;
  igual('orçamento: terminais, porteiros, prumada e blocos', [q('tel_terminal'), q('tel_porteiro'), q('tel_prumada'), q('tel_dg'), q('tel_central')], [59, 2, 875, 47, 1]);
  igual('orçamento: pontos conectorizados (59 + portaria)', q('tel_ponto'), 60);
  igual('orçamento só com seções do sistema', orc.itens.every(i => ['Materiais e Equipamentos', 'Serviços (Mão de Obra)'].includes(i.secao)), true);
  const insp = motor.montarOrcamento(res, 'inspecao');
  igual('orçamento de vistoria por ramal + correção de NC', [insp.itens[0].codigo, insp.itens[0].quantidade, insp.itens.some(i => i.subgrupo === 'Correção de não conformidades')], ['tel_vistoria', 62, true]);
  fim();
})();
