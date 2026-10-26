// Teste da antena coletiva — cálculo de enlace (link budget) da prumada,
// escolha dos derivadores, amplificador, atenuador, multiswitch, documentos e orçamento.
const motor = require('../scripts/lib/index');
const C = require('../scripts/lib/calculo');
const { perto, igual, fim } = require('../../_comum/teste').verificador('antena');

// ── Tabelas e funções básicas
igual('canal 14 = 470–476 MHz', C.faixaCanal(14), [470, 476]);
igual('canal 51 = 692–698 MHz (topo da faixa após o remanejamento)', C.faixaCanal(51), [692, 698]);
perto('RG-6 a 698 MHz interpolado: 15,9 + 0,98 × (17,3 − 15,9)', C.atenuacao('RG-6', 698), 15.9 + 0.98 * 1.4);
igual('divisor 3 pontos → 3 vias 6,5 dB', C.divisor(3), { vias: 3, perda: 6.5, sobra: 0 });
igual('divisor 5 pontos → 6 vias, 1 saída terminada', C.divisor(5).sobra, 1);
igual('atenuador para 7,2 dB → 9 dB (3 + 6 em série, o mais próximo acima)', C.atenuadorMin(7.2), 9);
igual('multiswitches para 40 pontos (até 32 saídas) → 5×32 + 5×8', C.multiswitchesPara(40, 32), [32, 8]);

// ── Caso à mão: 1 torre, 10 pavimentos × 4 unidades × 2 pontos, cabo 20 dB/100 m (0,2 dB/m)
// antena 70 dBµV, 20 m até o headend → entrada 70 − 20 × 0,2 = 66,0 dBµV
// por pavimento: prumada 3 m (0,6 dB); unidade: (10 + 5) m × 0,2 = 3,0 + divisor 2 vias 4,0 + tomada 1,0 = 8,0 dB
// tomada = entrada do derivador − derivação − 8,0; escolhe o MAIOR derivador com tomada ≥ alvo 60
const casoMao = (mudar = {}, torres) => ({
  sistema: { tipo: 'terrestre', nivel_medido: 'medido', nivel_antena_dbuv: 70, canais_qtd: 10, distancia_antena_headend_m: 20, atenuacao_fmax_db_100m: 20, atenuacao_fmin_db_100m: 20, pe_direito_m: 3, distancia_interna_m: 5, perda_tomada_db: 1, nivel_min_dbuv: 50, nivel_max_dbuv: 80, ...mudar },
  edificacao: { torres: torres || [{ nome: 'Torre Teste', pavimentos: 10, unidades_por_pavimento: 4, pontos_por_unidade: 2, distancia_prumada_m: 10 }] },
});
const m = C.calcular(casoMao());
const pos = m.deriv.torres[0].posicoes;
perto('entrada do headend 66,0 dBµV', m.deriv.inW, 66.0);
// ganho mínimo: com 32,5 dB o 1º pavimento chega a 78,4 → 78,4 − 12 − 8 = 58,4 < 60; com 33 dB atende
perto('ganho do amplificador 33 dB (menor que atende o alvo)', m.deriv.amplificador.ganho, 33);
perto('nível máx. de saída para 10 canais: 114 − 7,5·log(9)', m.deriv.amplificador.vmaxN, Math.round((114 - 7.5 * Math.log10(9)) * 10) / 10);
// 10º: 99 − 0,6 = 98,4 → 24 dB → 66,4; ... 6º: 92,0 → 24 dB → 60,0; 5º: 90,4 → 20 dB; 4º: 88,5 → 20 dB; 3º: 86,6 → 16 dB; 2º: 84,0 → 16 dB; 1º: 81,4 → 12 dB → 61,4
igual('derivadores do topo para a base', pos.map(p => p.derivacao), [24, 24, 24, 24, 24, 20, 20, 16, 16, 12]);
perto('10º pav.: entrada 98,4 dBµV', pos[0].entradaMin, 98.4);
perto('10º pav.: tomada 98,4 − 24 − 8 = 66,4 dBµV', pos[0].tomadaMin, 66.4);
perto('6º pav.: tomada 92,0 − 24 − 8 = 60,0 dBµV (no alvo)', pos[4].tomadaMin, 60.0);
perto('1º pav.: entrada 84,0 − 2,0 − 0,6 = 81,4 dBµV', pos[9].entradaMin, 81.4);
perto('1º pav.: tomada 81,4 − 12 − 8 = 61,4 dBµV', pos[9].tomadaMin, 61.4);
igual('todas as tomadas OK', pos.every(p => p.situacao === 'ok'), true);
perto('C/N = 66 − NF 7 − ruído térmico 2,2 dBµV', m.deriv.cn, 66 - 7 - C.RUIDO_TERMICO_DBUV);
igual('derivadores 4 saídas: 5 × 24 dB', m.materiais.find(x => /4 saída\(s\) 24 dB/.test(x.descricao)).quantidade, 5);
igual('divisores de 2 vias: 1 por unidade (40)', m.materiais.find(x => /2 vias.*unidade/.test(x.descricao)).quantidade, 40);
igual('expõe 40 unidades com 2 tomadas para a planta', [m.unidades.length, m.unidades[0].tomadas.length, m.unidades[0].unidade], [40, 2, '1001']);

// ── Borda: nível insuficiente → amplificador (e de linha, se o headend não basta)
const baixo = C.calcular(casoMao({ nivel_antena_dbuv: 40 }));
perto('antena 40 dBµV → headend no ganho máximo (40 dB)', baixo.deriv.amplificador.ganho, 40);
igual('antena 40 dBµV → 1 amplificador de linha na prumada', baixo.deriv.nAmpsLinha, 1);
igual('antena 40 dBµV → aviso de sinal baixo na antena', baixo.avisos.some(a => /baixo \(40 dBµV\)/.test(a)), true);
igual('antena 40 dBµV → todas as tomadas OK com o amplificador de linha', baixo.deriv.torres[0].posicoes.every(p => p.situacao === 'ok'), true);

// ── Borda: nível alto → sem amplificador, atenuador na entrada e derivador maior
const alto = C.calcular(casoMao({ nivel_antena_dbuv: 110 }));
igual('antena 110 dBµV → sem amplificador', alto.deriv.amplificador, null);
// 110 − 4 = 106 na entrada; precisa de 99 → sobra 7 dB → atenuador comercial de 6 dB
igual('antena 110 dBµV → atenuador de 6 dB na entrada do headend', alto.deriv.atenuadorEntrada, 6);
igual('antena 110 dBµV → 24 dB no 10º pavimento', alto.deriv.torres[0].posicoes[0].derivacao, 24);
// anexo de 1 pavimento junto ao headend + torre a 80 m: o ganho é puxado pela torre longe
// headend 66 + 53 = 119 − divisor 2 vias 4 − 0,6 = 114,4 → 24 dB → 82,4 > 80 → atenuador 3 dB → 79,4
const anexo = C.calcular(casoMao({ amp_ganho_max_db: 60, amp_nivel_max_dbuv: 130 }, [
  { nome: 'Torre A', pavimentos: 10, unidades_por_pavimento: 4, pontos_por_unidade: 2, distancia_prumada_m: 10, distancia_headend_m: 80 },
  { nome: 'Anexo', pavimentos: 1, unidades_por_pavimento: 4, pontos_por_unidade: 2, distancia_prumada_m: 10, distancia_headend_m: 0 },
]));
const pa = anexo.deriv.torres[1].posicoes[0];
perto('anexo: ganho 53 dB', anexo.deriv.amplificador.ganho, 53);
igual('anexo: derivador 24 dB + atenuador 3 dB', [pa.derivacao, pa.atenuador], [24, 3]);
perto('anexo: tomada 79,4 dBµV', pa.tomadaMax, 79.4);
// diferença de 40 dB entre canais numa janela de 30 dB → não há como atender sem headend canalizado
const faixa = C.calcular(casoMao({ nivel_antena_max_dbuv: 110, amp_nivel_max_dbuv: 130 }));
igual('canais com 40 dB de diferença → aviso de headend canalizado', faixa.avisos.some(a => /canalizado/.test(a)), true);

// ── Satélite: multiswitch por número de pontos
const sat = (topologia) => C.calcular({ sistema: { tipo: 'satelite', satelite: { topologia } }, edificacao: { torres: [{ nome: 'T', pavimentos: 10, unidades_por_pavimento: 4, pontos_por_unidade: 1, distancia_prumada_m: 10 }] } });
igual('cascata: 10 multiswitches 5×4 (um por pavimento)', sat('cascata').ms.mss, Array(10).fill(4));
igual('estrela: 40 pontos → 5×32 + 5×8 no headend', sat('estrela').ms.mss, [32, 8]);
igual('satélite: níveis dentro de 47–77 dBµV', sat('cascata').ms.linhas.every(l => l.situacaoSat === 'ok'), true);

// ── Exemplo completo: documentos e orçamento
const res = motor.processar(motor.exemplo());
igual('exemplo: medição com MER 23 dB e BER 5E-4 → NC', res.medicoes[1].resultado, 'NC');
igual('exemplo: NC do mastro sem SPDA vira P1', res.ncs[0].prioridade, 'P1');
(async () => {
  for (const tp of motor.tiposDisponiveis(res)) igual(`documento ${tp}`, (await motor.gerarDocumento(res, tp)).buffer.slice(0, 2).toString(), 'PK');
  const exec = motor.montarOrcamento(res, 'execucao');
  igual('orçamento usa antena_ponto existente', exec.itens.some(i => i.codigo === 'antena_ponto'), true);
  igual('orçamento usa os novos antena_*', ['antena_instalacao', 'antena_headend', 'antena_derivador', 'antena_prumada', 'antena_medicao', 'antena_projeto'].every(c => exec.itens.some(i => i.codigo === c)), true);
  igual('orçamento de vistoria tem relatório e NC', ['antena_relatorio', undefined].every(c => motor.montarOrcamento(res, 'inspecao').itens.some(i => i.codigo === c)), true);
  fim();
})();
