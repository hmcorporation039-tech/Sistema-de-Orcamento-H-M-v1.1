// Teste de regressão da elétrica hospitalar — valores conferidos à mão contra a
// NBR 13534:2008 (base IEC 60364-7-710) e as premissas declaradas em calculo.js.
// Exemplo: ala com 2 salas cirúrgicas, UTI de 6 leitos, posto de enfermagem,
// enfermaria de 4 leitos e circulação (dados ilustrativos, "Cliente Exemplo").

const motor = require('../scripts/lib/index');
const C = require('../scripts/lib/calculo');
const { verificador } = require('../../_comum/teste');
const { perto, igual, fim } = verificador('elétrica hospitalar');

const ex = () => motor.exemplo();
const rodar = (mudar) => { const d = ex(); mudar(d); return motor.processar(d); };
const temNc = (calc, cod) => calc.ncs.some(n => n.cod === cod);

// ── Classificação (RDC 50 → grupo/classe) ──
igual('UTI → grupo 2, classe ≤ 0,5 s', [C.classificar({ tipo: 'uti_adulto' }).grupo, C.classificar({ tipo: 'uti_adulto' }).classe], [2, '0.5']);
igual('sala cirúrgica → grupo 2', C.classificar({ tipo: 'sala_cirurgica' }).grupo, 2);
igual('enfermaria → grupo 1, classe ≤ 15 s', [C.classificar({ tipo: 'enfermaria' }).grupo, C.classificar({ tipo: 'enfermaria' }).classe], [1, '15']);
igual('consultório → grupo 0', C.classificar({ tipo: 'consultorio' }).grupo, 0);
igual('grupo editável (enfermaria → 2)', C.classificar({ tipo: 'enfermaria', grupo: '2' }).grupo, 2);
igual('grupo 1 sem classe sobe para ≤ 15 s', C.classificar({ tipo: 'consultorio', grupo: '1' }).classe, '15');
igual('classe mais restritiva', C.maisRestritiva('15', '0.5', '0.15', ''), '0.15');

// ── Exemplo completo ──
const res = motor.processar(ex());
const { calc } = res;
const amb = (n) => calc.ambientes.find(a => a.nome === n);
const sis = (id) => calc.sistemas.find(s => s.id === id);
igual('3 sistemas IT (um por sala cirúrgica + UTI — 710.413.1.5)', calc.sistemas.length, 3);
igual('enfermaria e posto sem IT', [amb('Enfermaria 101').sistemaIt, amb('Posto de enfermagem UTI').sistemaIt], [null, null]);
// Sala 1: IT = bisturi 555,6 + anestesia 333,3 + monitor 166,7 + 3 bombas 100 + 6 tomadas livres × 150 = 2055,6 VA; foco 315,8 VA
perto('sala 1: carga das tomadas IT', amb('Sala cirúrgica 1').vaItTomadas, 2055.56, 0.001);
perto('IT1: carga instalada 2371,3 VA', sis('IT1').vaInstalada, 2371.35, 0.001);
perto('IT1: demandada × 0,7 = 1660 VA', sis('IT1').vaDemanda, 1659.94, 0.001);
igual('IT1: transformador 3,15 kVA', sis('IT1').kvaPorUnidade, 3.15);
// UTI: 6 vent. 1666,7 + 6 monit. 1000 + 18 bombas 600 + 6 camas 1333,3 + 12 livres × 150 = 6400 VA × 0,7 = 4480 → 5 kVA
perto('IT3 (UTI): carga instalada 6400 VA', sis('IT3').vaInstalada, 6400, 0.001);
igual('IT3 (UTI): transformador 5 kVA', sis('IT3').kvaPorUnidade, 5);
igual('UTI: 8 tomadas IT + 2 TN por leito × 6', [amb('UTI adulto').tomadasIt, amb('UTI adulto').tomadasTn], [48, 12]);
igual('UTI: 6 circuitos IT (máx. 8 tomadas por circuito)', amb('UTI adulto').circuitos.it.length, 6);
igual('sala: ≥ 2 circuitos IT de tomadas por posto (710.53)', amb('Sala cirúrgica 1').circuitos.it.length, 2);
igual('enfermaria: 4 tomadas TN × 4 leitos', amb('Enfermaria 101').tomadasTn, 16);
igual('IT com suporte à vida → classe 0,15 s', sis('IT3').classe, '0.15');
igual('painel de alarme da UTI no posto de enfermagem', sis('IT3').localPainel, 'Posto de enfermagem UTI');
igual('painel de alarme da sala cirúrgica no próprio local', sis('IT1').localPainel, 'Sala cirúrgica 1');
const cIt = calc.circuitos.find(x => x.id === 'IT3.1');
igual('circuito IT: bipolar 220 V, sem DR', [cIt.polos, cIt.tensao, cIt.dr], [2, 220, false]);
igual('circuito IT: disjuntor mínimo 16 A (cabo 2,5 mm²)', [cIt.secao, cIt.disjuntor], [2.5, 16]);
const rx = calc.circuitos.find(x => /Raios X/.test(x.descricao));
igual('raios X > 5 kVA no grupo 2 → TN com DR (710.413.1.3)', [rx.sistema, rx.dr, rx.drObrigatorio], ['TN', true, true]);
igual('raios X 6111 VA / 220 V → 6 mm², 32 A', [rx.secao, rx.disjuntor], [6, 32]);
const mesa = calc.circuitos.find(x => /Mesa cirúrgica/.test(x.descricao));
igual('mesa cirúrgica fora do IT, com DR', [mesa.sistema, mesa.dr], ['TN', true]);
igual('tomadas TN da enfermaria com DR obrigatório tipo A', calc.circuitos.filter(x => x.ambientes && x.ambientes.includes('Enfermaria 101') && x.tipo === 'tug').every(x => x.dr && x.drObrigatorio && x.drTipo === 'A'), true);
const prim3 = calc.sistemas.find(s => s.id === 'IT3').primarios[0];
perto('primário IT3: 5 kVA × 1,25 / 220 V', prim3.ib, 28.41, 0.002);
igual('primário IT3: 4 mm², 32 A curva D', [prim3.secao, prim3.disjuntor, prim3.curva], [4, 32, 'D']);
const qcc = calc.quadros.find(q => q.id === 'QD-CC');
igual('QD-CC: geral 25 A acima do primário de 20 A (seletividade)', qcc.alimentador.disjuntor, 25);
igual('iluminação de segurança ≥ 50 % no grupo 2', amb('UTI adulto').iluminacaoSegurancaVa / amb('UTI adulto').iluminacaoVa, 0.5);
// Equipotencialização UTI: L = 2√120 + 3 = 24,9 m → S ≥ 0,0225 × 24,9 / 0,18 = 3,11 → 4 mm²; R = 0,16 Ω
const eqUti = amb('UTI adulto').equipotencializacao;
perto('BEL UTI: seção calculada 3,11 mm²', eqUti.secaoCalculada, 3.11, 0.005);
igual('BEL UTI: 4 mm², R estimada 0,16 Ω ≤ 0,2 Ω', [eqUti.secao, eqUti.resistenciaEstimada], [4, 0.16]);
igual('BEL só nos grupos 1 e 2', calc.ambientes.filter(a => a.equipotencializacao).length, 4);
// Fonte de segurança: ≤ 0,15 s = 1660 × 2 + 4480 = 7800 VA → 9,75 kVA → UPS 10 kVA
perto('carga classe 0,15 s', calc.fonte.porClasse['0.15'], 7799.88, 0.001);
igual('UPS 10 kVA', calc.fonte.upsKvaSugerido, 10);
perto('carga classe 15 s', calc.fonte.porClasse['15'], 14192.78, 0.001);
// gerador = 14192,8 × 0,8 + 7799,9 × 1,3 + 30 000 = 51 494 VA ÷ 0,8 = 64,4 kVA → 75 kVA
perto('gerador: carga 51,5 kVA', calc.fonte.geradorCargaVa, 51494.07, 0.001);
igual('gerador 75 kVA', calc.fonte.geradorKvaSugerido, 75);
igual('exemplo sem NC de projeto', calc.ncs.length, 0);

// ── Inspeção ──
igual('DSI ajustado em 40 kΩ → NC (IT4)', res.med.dsi.find(m => m.sistema === 'IT2').resultado, 'NC');
igual('equipotencialização 0,25 Ω → NC (E3)', res.med.equipotencializacao.find(m => m.valor_ohm === 0.25).resultado, 'NC');
igual('comutação do gerador 11 s ≤ 15 s → C', res.med.comutacao.find(m => m.fonte === 'Gerador').resultado, 'C');
igual('NCs do laudo: IT4, IT6, E3', res.ncs.map(n => n.item).sort(), ['E3', 'IT4', 'IT6']);
igual('parecer não conforme (preliminar)', res.parecer.situacao, 'NAO_CONFORME_PRELIMINAR');

// ── Casos de borda ──
const semUps = rodar(d => { d.fonte_seguranca.ups = 'nao'; });
igual('grupo 2 sem UPS → NC F1 (gerador não comuta em 0,5 s)', temNc(semUps.calc, 'F1'), true);
igual('… e o checklist F1 fica NC', semUps.checklist.find(c => c.cod === 'F1').situacao, 'NC');
igual('sem gerador → NC F3 e UPS de 3 h', (() => { const r = rodar(d => { d.fonte_seguranca.gerador = 'nao'; d.fonte_seguranca.ups_autonomia_min = null; }); return [temNc(r.calc, 'F3'), r.calc.fonte.upsAutonomiaMin]; })(), [true, 180]);
igual('transferência do gerador 20 s → NC F3', temNc(rodar(d => { d.fonte_seguranca.tempo_transferencia_s = 20; }).calc, 'F3'), true);
igual('gerador existente de 50 kVA < 64,4 kVA → NC F3', temNc(rodar(d => { d.fonte_seguranca.gerador = 'existente'; d.fonte_seguranca.gerador_kva = 50; }).calc, 'F3'), true);
igual('local do grupo 2 sem IT (existente) → NC IT1', temNc(rodar(d => { d.existente = [{ ambiente: 'UTI adulto', sem_it: true }]; }).calc, 'IT1'), true);
igual('DR em circuito IT (existente) → NC P3', temNc(rodar(d => { d.existente = [{ ambiente: 'Sala cirúrgica 2', dr_no_it: true }]; }).calc, 'P3'), true);
igual('tomadas IT sem identificação → NC T2', temNc(rodar(d => { d.existente = [{ ambiente: 'Sala cirúrgica 1', tomadas_sem_identificacao: true }]; }).calc, 'T2'), true);
igual('esquema TN-C → NC P1', temNc(rodar(d => { d.instalacao.esquema = 'TN-C'; }).calc, 'P1'), true);
igual('secundário IT de 260 V → NC IT2', temNc(rodar(d => { d.instalacao.tensao_it_v = 260; }).calc, 'IT2'), true);
igual('suporte à vida em TN no grupo 2 → NC IT1', temNc(rodar(d => { d.equipamentos.find(e => e.descricao === 'Aparelho de anestesia').sistema = 'TN'; d.equipamentos.find(e => e.descricao === 'Aparelho de anestesia').circuito_exclusivo = true; }).calc, 'IT1'), true);
const grande = rodar(d => { d.ambientes.find(a => a.nome === 'UTI adulto').leitos = 12; d.instalacao.fator_simultaneidade_it = 1; });
igual('IT acima de 10 kVA → 2 transformadores de 8 kVA (710.512.1)', [grande.calc.sistemas.find(s => s.ambientes[0].nome === 'UTI adulto').unidades, grande.calc.sistemas.find(s => s.ambientes[0].nome === 'UTI adulto').kvaPorUnidade], [2, 8]);
const enf2 = rodar(d => { d.ambientes.find(a => a.nome === 'Enfermaria 101').grupo = '2'; });
const enf2a = enf2.calc.ambientes.find(a => a.nome === 'Enfermaria 101');
igual('enfermaria reclassificada no grupo 2 → IT com 16 tomadas e 8 TN', [enf2a.sistemaIt != null, enf2a.tomadasIt, enf2a.tomadasTn], [true, 16, 8]);
const comum = rodar(d => { d.ambientes.find(a => a.nome === 'Sala cirúrgica 2').sistema_it = 'CC'; d.ambientes.find(a => a.nome === 'Sala cirúrgica 1').sistema_it = 'CC'; });
igual('salas com o mesmo "sistema IT" dividem o transformador', comum.calc.sistemas.length, 2);
const suporteG1 = rodar(d => { d.equipamentos.push({ ambiente: 'Enfermaria 101', descricao: 'Ventilador pulmonar', quantidade: 1, potencia_w: 250, suporte_vida: true }); });
igual('suporte à vida em grupo 1 → alerta de reclassificação', suporteG1.calc.ambientes.find(a => a.nome === 'Enfermaria 101').alertas.length > 0, true);
const desconhecido = rodar(d => { d.ambientes.push({ nome: 'Depósito', tipo: 'xyz', area_m2: 6 }); });
igual('tipo fora da RDC 50 → grupo 0 com aviso', [desconhecido.calc.ambientes.find(a => a.nome === 'Depósito').grupo, desconhecido.calc.avisos.some(t => /Depósito.*fora da tabela/.test(t))], [0, true]);
const so0 = motor.processar({ ...ex(), ambientes: [{ nome: 'Consultório 1', tipo: 'consultorio', area_m2: 12 }], equipamentos: [], inspecao: {} });
igual('só grupo 0: sem IT, sem UPS e IT1 NA', [so0.calc.sistemas.length, so0.calc.fonte.precisaUps, so0.checklist.find(c => c.cod === 'IT1').situacao], [0, false, 'NA']);
igual('DR tipo AC no ensaio → NC', motor.processar({ ...ex(), inspecao: { ensaios_dr: [{ circuito: 'x', tipo: 'AC', tempo_ms: 20 }] } }).med.dr[0].resultado, 'NC');
igual('UPS com 0,8 s na classe 0,5 → NC', motor.processar({ ...ex(), inspecao: { comutacao: [{ fonte: 'UPS', classe: '0.5', tempo_s: 0.8 }] } }).med.comutacao[0].resultado, 'NC');
let erro = '';
try { motor.processar({ ...ex(), ambientes: [] }); } catch (e) { erro = e.message; }
igual('sem ambientes → erro claro', /ao menos um ambiente/.test(erro), true);
erro = '';
try { motor.processar({ ...ex(), equipamentos: [{ ambiente: 'Inexistente', descricao: 'Monitor', potencia_w: 100 }] }); } catch (e) { erro = e.message; }
igual('equipamento em ambiente inexistente → erro', /sem ambiente correspondente/.test(erro), true);

// ── Documentos e orçamento ──
(async () => {
  igual('4 documentos disponíveis', motor.tiposDisponiveis(res), ['memorial', 'planilha', 'laudo', 'checklist']);
  for (const tipo of motor.tiposDisponiveis(res)) {
    const g = await motor.gerarDocumento(res, tipo);
    igual(`documento ${tipo} (zip válido)`, g.buffer.slice(0, 2).toString(), 'PK');
  }
  const exec = motor.montarOrcamento(res, 'execucao');
  const cod = (o, c) => o.itens.find(i => i.codigo === c);
  igual('execução: 3 painéis IT, 3 DSI, 72 tomadas IT, 4 BEL', [cod(exec, 'hosp_painel_it').quantidade, cod(exec, 'hosp_dsi').quantidade, cod(exec, 'hosp_tomada_it').quantidade, cod(exec, 'hosp_equipotencializacao').quantidade], [3, 3, 72, 4]);
  igual('execução: seções e subgrupos do sistema', exec.itens.every(i => ['Materiais e Equipamentos', 'Serviços (Mão de Obra)'].includes(i.secao) && i.subgrupo && i.descricao && i.quantidade > 0 && i.unidade), true);
  igual('execução: transformadores 2 × 3,15 + 1 × 5 kVA', exec.itens.filter(i => /Transformador de separação/.test(i.descricao)).map(i => i.quantidade), [2, 1]);
  const insp = motor.montarOrcamento(res, 'inspecao');
  igual('inspeção: 5 serviços + 3 NCs', insp.itens.length, 8);
  igual('códigos hosp_ usados', [...new Set([...exec.itens, ...insp.itens].map(i => i.codigo).filter(c => c && c.startsWith('hosp_')))].sort(),
    ['hosp_comissionamento', 'hosp_dsi', 'hosp_ensaio_comutacao', 'hosp_ensaio_local', 'hosp_equipotencializacao', 'hosp_fonte_seguranca', 'hosp_inspecao', 'hosp_laudo', 'hosp_painel_it', 'hosp_projeto', 'hosp_tomada_it']);
  fim();
})();
