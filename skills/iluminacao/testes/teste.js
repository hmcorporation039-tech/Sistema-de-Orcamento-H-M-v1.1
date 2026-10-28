// Teste da iluminação — método dos lúmens conferido à mão, tabela de FU,
// grade nx × ny, sensores, DALI, circuitos (motor da elétrica), medição e documentos.
const motor = require('../scripts/lib/index');
const C = require('../scripts/lib/calculo');
const { perto, igual, fim } = require('../../_comum/teste').verificador('iluminação');

// ── Caso calculado à mão ──────────────────────────────────────────────────
// Escritório 10 × 8 m, pé-direito 3 m, plano 0,75 m, Em 500 lx, luminária 4 000 lm / 32 W,
// FU = 0,60 (informado), FM = 0,80 (limpo)
// hm = 3 − 0,75 = 2,25 m;  k = 80 / (2,25 × 18) = 1,975
// N = 500 × 80 / (4 000 × 0,60 × 0,80) = 40 000 / 1 920 = 20,83 → 21
// grade: 7 × 3 = 21 tem dx/dy = 1,43/2,67 (razão 1,87 > 1,5); 6 × 4 = 24 (1,67 × 2,00) é a menor válida
// E = 24 × 4 000 × 0,60 × 0,80 / 80 = 576 lx;  DPI = 24 × 32 / 80 = 9,6 W/m²
const LUM = [{ codigo: 'PL1', tipo: 'embutir', potencia_w: 32, fluxo_lm: 4000, ra: 80, ugr: 19 }];
const escritorio = { nome: 'Escritório', atividade: 'escritorio', comprimento_m: 10, largura_m: 8, pe_direito_m: 3, plano_trabalho_m: 0.75, fu: 0.6, conservacao: 'limpo', luminaria: 'PL1', controle: 'dali', sensor_presenca: true };
const caso = C.calcular({ luminarias: LUM, ambientes: [escritorio] });
const a = caso.ambientes[0];
perto('hm', a.hm, 2.25);
perto('índice do recinto k', a.k, 80 / (2.25 * 18));
igual('FM limpo', a.fm, 0.8);
igual('Em exigida escritório (NBR ISO/CIE 8995-1)', a.emExigida, 500);
perto('N calculado', a.nCalc, 20.8333);
perto('método dos lúmens (função)', C.metodoLumens({ em: 500, area: 80, fluxo: 4000, fu: 0.6, fm: 0.8 }), 40000 / 1920);
igual('grade 6 × 4', [a.nx, a.ny, a.n], [6, 4, 24]);
perto('Em obtida', a.emObtida, 576);
perto('densidade de potência', a.dpi, 9.6);
perto('espaçamento máximo 1,5 × hm', a.smax, 3.375);
igual('espaçamento atende', a.okEspacamento, true);
igual('Ra e UGR atendem', [a.okRa, a.okUgr], [true, true]);
// sensor Ø 8 m → quadrado inscrito de 5,66 m → 2 × 2 sensores
igual('sensores 2 × 2', a.sensores.n, 4);
igual('sensores DALI', a.sensores.tipo, 'dali');
igual('24 endereços DALI em 1 linha', [a.enderecos, caso.barramentos.length], [24, 1]);
igual('posições da grade: primeira e última', [a.posicoes[0], a.posicoes[23]], [{ x: 0.833, y: 1 }, { x: 9.167, y: 7 }]);
// malha de medição p = 0,2 × 5^log10(10) = 1,0 m → 10 × 8 pontos
igual('malha de medição', [a.malha.p, a.malha.pontos], [1, 80]);

// ── Tabela de FU (dados/fator_utilizacao.json) ────────────────────────────
// k = 1,975, teto 0,8, parede 0,5, piso 0,2: 0,72 + (0,78 − 0,72) × 0,475/0,5 = 0,777
perto('FU tabela interpolado em k', C.fatorUtilizacao(80 / 40.5, 0.8, 0.5, 0.2), 0.777);
// k = 1: média de 0,54 / 0,56 / 0,60 / 0,62 (teto 0,75, parede 0,4) × 1,03 (piso 0,3)
perto('FU bilinear nas refletâncias + piso', C.fatorUtilizacao(1, 0.75, 0.4, 0.3), 0.58 * 1.03);
igual('FU com k abaixo da tabela usa k = 0,6', C.fatorUtilizacao(0.3, 0.8, 0.5, 0.2), 0.48);
igual('FU com k acima da tabela usa k = 5', C.fatorUtilizacao(9, 0.8, 0.5, 0.2), 0.9);
const semFu = C.calcular({ luminarias: LUM, ambientes: [{ ...escritorio, fu: null, refl_teto: '0.8', refl_parede: '0.5', refl_piso: '0.2' }] }).ambientes[0];
perto('ambiente sem FU usa a tabela', semFu.fu, 0.777);

// ── Casos de borda ───────────────────────────────────────────────────────
const amb = (extra, lum = LUM) => C.calcular({ luminarias: lum, ambientes: [{ ...escritorio, sensor_presenca: false, controle: 'interruptor', ...extra }] }).ambientes[0];
// corredor 15 × 1,8: fila única ao longo do comprimento
const corredor = amb({ atividade: 'circulacao', comprimento_m: 15, largura_m: 1.8, pe_direito_m: 2.7, plano_trabalho_m: null, fu: null, conservacao: 'normal' });
igual('corredor em fila única', corredor.ny, 1);
igual('corredor: plano de referência no piso', corredor.plano, 0);
// depósito 4 × 3: não vira fila de 4 ao longo da largura → 2 × 2
igual('ambiente quase quadrado não vira fila única', [amb({ comprimento_m: 4, largura_m: 3, fu: 0.5, em_lx: 300 }).nx, amb({ comprimento_m: 4, largura_m: 3, fu: 0.5, em_lx: 300 }).ny], [2, 2]);
// C < L é girado: x sempre na maior dimensão
igual('dimensões giradas (C ≥ L)', [amb({ comprimento_m: 8, largura_m: 10 }).comprimento, amb({ comprimento_m: 8, largura_m: 10 }).n], [10, 24]);
// só a área: quadrado equivalente
const soArea = C.calcular({ luminarias: LUM, ambientes: [{ ...escritorio, comprimento_m: null, largura_m: null, area_m2: 64 }] });
igual('só área → quadrado de 8 m', [soArea.ambientes[0].comprimento, soArea.ambientes[0].largura], [8, 8]);
igual('só área gera aviso', soArea.avisos.some(t => /quadrado equivalente/.test(t)), true);
// ambiente pequeno: mínimo de 1 luminária
igual('ambiente pequeno tem 1 luminária', amb({ comprimento_m: 1.2, largura_m: 1, atividade: 'deposito', em_lx: null }).n, 1);
// quantidade fixa (verificação de projeto existente): 7 luminárias não atendem 500 lx
const fixo = amb({ quantidade: 7 });
igual('quantidade fixa mantida', fixo.n, 7);
igual('quantidade fixa insuficiente → Em não atende', fixo.okEm, false);
// pendente: altura de montagem = pé-direito − suspensão
const pend = amb({ luminaria: 'PD1' }, [...LUM, { codigo: 'PD1', tipo: 'pendente', potencia_w: 40, fluxo_lm: 5000, suspensao_m: 0.8 }]);
perto('pendente: hm = 3 − 0,8 − 0,75', pend.hm, 1.45);
// perfil LED: fontes 24 V a 80 % da capacidade
const perfil = amb({ luminaria: 'PF1', controle: 'dali', comprimento_m: 6, largura_m: 5, fu: 0.6, em_lx: 300 }, [{ codigo: 'PF1', tipo: 'perfil', potencia_w: 12, fluxo_lm: 1200, comprimento_m: 1 }]);
igual('perfil: fontes = ceil(W / 80 W)', perfil.fontes, Math.ceil(perfil.potencia / 80));
igual('perfil: endereços DALI pelas fontes', perfil.enderecos, perfil.fontes);
// erros
let erro = '';
try { amb({ plano_trabalho_m: 3 }); } catch (e) { erro = e.message; }
igual('hm ≤ 0 é recusado', /altura útil/.test(erro), true);
erro = '';
try { amb({ luminaria: 'XX9' }); } catch (e) { erro = e.message; }
igual('luminária inexistente é recusada', /não está na tabela/.test(erro), true);
erro = '';
try { C.calcular({ luminarias: [{ codigo: 'A', potencia_w: 0, fluxo_lm: 100 }], ambientes: [escritorio] }); } catch (e) { erro = e.message; }
igual('luminária sem potência é recusada', /potência/.test(erro), true);
// NBR 5410 9.5.2.1.2: residência 20 m² → 100 + 60 × 3 = 280 VA mínimos para o circuito
const res = amb({ atividade: 'res_sala', comprimento_m: 5, largura_m: 4, fu: 0.6, quantidade: 2 }, [{ codigo: 'PL1', potencia_w: 10, fluxo_lm: 1000 }]);
igual('residência: carga mínima 9.5.2.1.2', [res.minimoVa, res.cargaVa], [280, 280]);
// salão grande 30 × 20 com DALI: 2 linhas (64 endereços) e circuito dividido
const salao = C.calcular({ instalacao: { tensao_fn: 220 }, luminarias: LUM, ambientes: [{ ...escritorio, comprimento_m: 30, largura_m: 20 }] });
const s0 = salao.ambientes[0];
igual('salão: linhas DALI = ceil(N / 64)', salao.barramentos.length, Math.ceil(s0.n / 64));
igual('salão: circuitos ≤ 10 A × 220 V', salao.circuitos.every(x => x.potencia_va <= 2200 + 1), true);
igual('salão: soma das luminárias dos circuitos', salao.circuitos.reduce((s, x) => s + x.luminarias, 0), s0.n);
igual('salão: seção mínima 1,5 mm² (Tab. 47)', salao.circuitos.every(x => x.secao >= 1.5), true);

// ── Exemplo completo ─────────────────────────────────────────────────────
const r = motor.processar(motor.exemplo());
const ex = (n) => r.calc.ambientes.find(x => x.nome === n);
igual('exemplo: escritório igual ao caso à mão', [ex('Escritório aberto').n, Math.round(ex('Escritório aberto').emObtida)], [24, 576]);
// sala de reunião 5 × 4: k = 0,988; FU (0,7/0,5/0,2) = 0,54 + 0,06 × 0,94 = 0,596; N = 10 000 / (1 800 × 0,596 × 0,8) = 11,6 → 12 (4 × 3)
perto('reunião: FU da tabela', ex('Sala de reunião').fu, 0.54 + 0.06 * (20 / (2.25 * 9) - 0.8) / 0.2);
igual('reunião: 4 × 3', [ex('Sala de reunião').nx, ex('Sala de reunião').ny], [4, 3]);
igual('reunião: teclado de cenas', ex('Sala de reunião').comandos.tecladosCena, 1);
igual('diretoria: controlador 0-10 V', ex('Diretoria').comandos.controladores010, 1);
igual('locais com DR em circuito próprio', r.calc.circuitos.filter(x => x.dr).map(x => x.ambientes), [['Banheiros', 'Copa']]);
igual('circuitos respeitam 1 200 VA', r.calc.circuitos.every(x => x.potencia_va <= 1200), true);
igual('3 circuitos de 1,5 mm²', r.calc.circuitos.map(x => x.secao), [1.5, 1.5, 1.5]);
// medição: escritório C; reunião 445 lx < 500 → NC; circulação 153,75 lx e Uo 0,78 → C
igual('medições', r.medicoes.map(m => m.resultado), ['C', 'NC', 'C']);
perto('circulação: uniformidade', r.medicoes[2].uo, 120 / 153.75);
igual('E3 (emergência) fica NA — skill de incêndio', r.checklist.find(c => c.cod === 'E3').situacao, 'NA');
igual('NCs do checklist', r.ncs.length, 2);

// Achado A2.7 (revisão 27/10/2026): luminária sem Ra/UGR informados → o resumo dizia
// "Em, Ra e UGR atendidos". Agora o requisito fica "não verificado" e o indicador não fica verde.
{
  const d = JSON.parse(JSON.stringify(motor.exemplo()));
  d.luminarias = [{ codigo: 'X1', tipo: 'embutir', potencia_w: 30, fluxo_lm: 3600 }];
  d.ambientes = [{ nome: 'Sala cirurgica', atividade: 'hosp_cirurgia', comprimento_m: 6, largura_m: 6, pe_direito_m: 3, luminaria: 'X1' }];
  d.inspecao = {};
  const rx = motor.processar(d);
  const ind = motor.resumir(rx).indicadores.find(i => /8995/.test(i.rotulo));
  igual('sem Ra/UGR: indicador não afirma atendimento', [/atendidos/.test(ind.detalhe), ind.ok, ind.valor], [false, undefined, '0 de 1']);
  igual('sem Ra/UGR: detalhe aponta dado ausente', /não verificados/.test(ind.detalhe), true);
  igual('sem Ra/UGR: avisos [CONFERIR] de Ra e de UGR', ['Ra da luminária', 'UGR da luminária'].map(t => rx.calc.avisos.some(a => a.includes(t) && /NÃO verificado/.test(a))), [true, true]);
  // com Ra 90 e UGR 16 informados volta a "atendidos" (Em também atende com a grade calculada)
  d.luminarias[0].ra = 90; d.luminarias[0].ugr = 16;
  const ind2 = motor.resumir(motor.processar(d)).indicadores.find(i => /8995/.test(i.rotulo));
  igual('com Ra/UGR informados e dentro do limite → atendidos', [ind2.ok, ind2.detalhe], [true, 'Em, Ra e UGR atendidos']);
}

(async () => {
  for (const t of motor.tiposDisponiveis(r)) igual(`documento ${t}`, (await motor.gerarDocumento(r, t)).buffer.slice(0, 2).toString(), 'PK');
  const exec = motor.montarOrcamento(r, 'execucao');
  igual('orçamento: códigos ilum_* de mão de obra', ['ilum_luminaria_embutir', 'ilum_luminaria_sobrepor', 'ilum_perfil_led', 'ilum_sensor_presenca', 'ilum_programacao_dali'].every(c => exec.itens.some(i => i.codigo === c)), true);
  igual('orçamento: seções do sistema', [...new Set(exec.itens.map(i => i.secao))], ['Materiais e Equipamentos', 'Serviços (Mão de Obra)']);
  igual('orçamento de medição (2 serviços + 2 NC)', motor.montarOrcamento(r, 'inspecao').itens.length, 4);
  fim();
})();
