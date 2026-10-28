// Tabelas e premissas da disciplina MÉDIA TENSÃO / SUBESTAÇÃO.
// Tudo que vem de norma da distribuidora ou de catálogo de fabricante está
// marcado [CONFERIR]: as normas de fornecimento mudam e a tabela vale como
// ponto de partida, não como valor definitivo.

// ── Transformadores (ABNT NBR 5356 / NBR 5440) ────────────────────────────
// Potências trifásicas usuais no mercado brasileiro (kVA)
const POTENCIAS_TRAFO = [45, 75, 112.5, 150, 225, 300, 500, 750, 1000, 1500, 2000, 2500, 3000];

// Impedância percentual típica a 75 °C — usar a da placa/folha de dados.
// Óleo: NBR 5440 (até 300 kVA: 3,5 % até 150 kVA e 4,5 % em 225/300 kVA) e
// valores usuais de fabricante acima disso. Seco: ~6 %. [CONFERIR]
function impedanciaTipica(kva, isolamento = 'oleo') {
  if (isolamento === 'seco') return 6;
  if (kva <= 150) return 3.5;
  if (kva <= 300) return 4.5;
  if (kva <= 1000) return 5;
  return 6;
}

// Corrente de magnetização (inrush) ≈ múltiplo de In por ~0,1 s [CONFERIR com o fabricante]
function multiploInrush(kva) {
  if (kva <= 2000) return 8;
  return 10;
}

// Ponto ANSI (suportabilidade térmica do transformador ao curto): I = 100/Z% × In, t pela Z%
function tempoAnsi(zPct) {
  if (zPct <= 4) return 2;
  if (zPct <= 5) return 3;
  if (zPct <= 6) return 4;
  return 5;
}

// ── Cabos de média tensão (NBR 14039; NBR 7286 EPR / NBR 7287 XLPE) ────────
// Capacidade de condução (A), cobre, isolação EPR/XLPE 90 °C, 8,7/15 kV,
// 3 cabos unipolares em trifólio, um circuito. Referência: ar 30 °C; solo 20 °C,
// resistividade térmica 2,5 K·m/W. Valores típicos de catálogo, coerentes com as
// tabelas de capacidade da NBR 14039 — [CONFERIR na tabela da norma/fabricante].
const METODOS_MT = {
  ar_trifolio: 'Ao ar livre / bandeja perfurada (trifólio)',
  eletroduto_ar: 'Em eletroduto aparente ao ar',
  enterrado_direto: 'Diretamente enterrado (trifólio)',
  eletroduto_enterrado: 'Em eletroduto / banco de dutos enterrado',
};
const CAPACIDADE_MT = {
  //     ar_trifolio, eletroduto_ar, enterrado_direto, eletroduto_enterrado
  16: [125, 105, 110, 100],
  25: [165, 135, 140, 130],
  35: [200, 165, 170, 155],
  50: [240, 195, 200, 185],
  70: [300, 240, 245, 225],
  95: [360, 290, 295, 270],
  120: [415, 330, 335, 305],
  150: [470, 370, 375, 340],
  185: [540, 420, 420, 385],
  240: [635, 490, 485, 445],
  300: [725, 555, 545, 500],
};
const SECOES_MT = Object.keys(CAPACIDADE_MT).map(Number);
function capacidadeMt(secao, metodo) {
  const i = Object.keys(METODOS_MT).indexOf(metodo);
  if (i < 0) throw new Error(`Método de instalação do cabo de MT inválido: ${metodo}`);
  return CAPACIDADE_MT[secao] ? CAPACIDADE_MT[secao][i] : null;
}
// Constante k da integral de Joule (S ≥ I·√t / k), cobre, EPR/XLPE: 90 °C → 250 °C
const K_CURTO = { EPR: 143, XLPE: 143 };
// Seção mínima: NBR 14039 admite 10 mm² Cu; a distribuidora costuma exigir mais
// no ramal de entrada [CONFERIR com a norma de fornecimento]
const SECAO_MIN_NORMA_MT = 10;
const SECAO_MIN_DISTRIBUIDORA_MT = 35;
// Reatância indutiva típica de cabo unipolar 15 kV em trifólio (Ω/km)
const X_CABO_MT = 0.12;

// Classe de isolamento do cabo e tensão nominal dos equipamentos por tensão primária.
// Para-raios em sistema NÃO efetivamente aterrado: na falta fase-terra as fases sãs
// sobem à tensão de linha, e a MCOV precisa cobrir a tensão máxima entre fases
// (≈ 1,05 × nominal). Em 13,8 kV: MCOV ≥ ~14,5 kV → 18 kV (MCOV 15,3 kV), par usual
// de catálogo (IEEE C62.11/C62.22); 15 kV (MCOV ~12,7 kV) não serve. Para as outras
// tensões o cálculo de paraRaios() sobe a Ur até a MCOV atender. [CONFERIR]
const CLASSE_MT = {
  13.8: { cabo: '8,7/15 kV', equipamento: 15, nbi: 95, paraRaiosAterrado: 12, paraRaiosIsolado: 18 },
  13.2: { cabo: '8,7/15 kV', equipamento: 15, nbi: 95, paraRaiosAterrado: 12, paraRaiosIsolado: 18 },
  22: { cabo: '12/20 kV', equipamento: 24, nbi: 125, paraRaiosAterrado: 18, paraRaiosIsolado: 24 },
  34.5: { cabo: '20/35 kV', equipamento: 36.2, nbi: 170, paraRaiosAterrado: 30, paraRaiosIsolado: 36 },
};
// Tensões nominais usuais de para-raios ZnO (kV) e relação MCOV/Ur típica de catálogo
// (0,75–0,85; adotado 0,85, o par 18 kV / 15,3 kV) [CONFERIR com o fabricante]
const PARA_RAIOS_UR = [10, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48];
const PARA_RAIOS_MCOV_UR = 0.85;
// Tensão máxima de operação ≈ 1,05 × nominal [CONFERIR com a distribuidora]
const FATOR_TENSAO_MAX = 1.05;

function classeMt(kv) {
  const chaves = Object.keys(CLASSE_MT).map(Number).sort((a, b) => a - b);
  const k = chaves.find(c => c >= kv) ?? chaves[chaves.length - 1];
  return CLASSE_MT[k];
}

// ── Proteção de MT ─────────────────────────────────────────────────────────
// Curvas de tempo inverso IEC 60255-151: t = TMS · k / ((I/Is)^α − 1)
const CURVAS_IEC = {
  NI: { k: 0.14, a: 0.02, rotulo: 'normalmente inversa (IEC NI)' },
  MI: { k: 13.5, a: 1, rotulo: 'muito inversa (IEC MI)' },
  EI: { k: 80, a: 2, rotulo: 'extremamente inversa (IEC EI)' },
  LI: { k: 120, a: 1, rotulo: 'inversa longa (IEC LI)' },
};
function tempoCurva(curva, tms, multiplo) {
  const c = CURVAS_IEC[curva] || CURVAS_IEC.MI;
  if (multiplo <= 1) return Infinity;
  return tms * c.k / (multiplo ** c.a - 1);
}
// Correntes primárias normalizadas de TC (A)
const TC_PRIMARIOS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200];
const FATOR_SOBRECORRENTE_TC = 20; // TC de proteção 10B/10P20: Icc ≤ 20 × Inp sem saturar
// Disjuntores de MT: correntes nominais e de interrupção usuais
const DISJ_MT_IN = [630, 1250, 2000];
const DISJ_MT_ICN = [12.5, 16, 20, 25, 31.5];
// Partida mínima ajustável no secundário do TC, em % da corrente nominal do TC (5 A).
// Relés digitais de sobrecorrente costumam começar em ~5 % de In (0,25 A) nas funções
// de fase e neutro; abaixo disso o ajuste pode não existir [CONFERIR no catálogo do relé]
const RELE_PARTIDA_MIN_PCT_TC = 5;

// Chave fusível de distribuição tipo expulsão (NBR 7282), 15 kV: correntes nominais
// usuais 100 e 200 A; capacidade de interrupção típica 7,1 kA simétricos / 10 kA
// assimétricos (ex.: especificação de chaves fusíveis da Enel, MAT-OMBR-MAT-18-0277)
// [CONFERIR na especificação da Neoenergia]. Acima disso: fusível limitador ou disjuntor.
const CHAVE_FUSIVEL_IN = [100, 200];
const CHAVE_FUSIVEL_ICN_SIM_KA = 7.1;
// Elo tipo K: conduz continuamente ~150 % da nominal (elos de estanho) — o 80K, maior
// da tabela, não cobre In primária acima de ~120 A [CONFERIR com o fabricante do elo]
const ELO_K_FATOR_CONTINUO = 1.5;

// Elo fusível de distribuição (tipo H até 75 kVA, tipo K acima) por potência do
// transformador trifásico em 13,8 kV — tabela usual de concessionária [CONFERIR na norma da Neoenergia]
const ELO_FUSIVEL_13_8 = [
  { ate_kva: 15, elo: '1H' }, { ate_kva: 30, elo: '2H' }, { ate_kva: 45, elo: '3H' }, { ate_kva: 75, elo: '5H' },
  { ate_kva: 112.5, elo: '6K' }, { ate_kva: 150, elo: '8K' }, { ate_kva: 225, elo: '10K' }, { ate_kva: 300, elo: '15K' },
  { ate_kva: 500, elo: '25K' }, { ate_kva: 750, elo: '40K' }, { ate_kva: 1000, elo: '50K' }, { ate_kva: 1500, elo: '65K' },
  { ate_kva: 99999, elo: '80K' },
];
// Fusível HH limitador (IEC 60282-1): corrente nominal ≥ 1,6 × In primária (margem para a
// magnetização) [CONFERIR com a tabela do fabricante]
const FUSIVEL_HH = [2, 4, 6.3, 10, 16, 20, 25, 31.5, 40, 50, 63, 80, 100];
const FATOR_HH = 1.6;

// ── Regras da distribuidora (Neoenergia Brasília, 13,8 kV) — TODAS [CONFERIR] ──
const DISTRIBUIDORA = {
  nome: 'Neoenergia Brasília',
  norma: 'norma de fornecimento de energia em média tensão da Neoenergia Brasília (série DIS-NOR) [CONFERIR número e revisão vigentes]',
  limite_poste_kva: 300,          // SE aérea em poste: até 300 kVA (estrutura singela/dupla conforme a potência)
  limite_fusivel_kva: 300,        // acima disso: disjuntor com relés secundários 50/51 e 50N/51N (também NBR 14039)
  limite_medicao_bt_kva: 300,     // um único transformador até este limite: medição indireta em BT
  demanda_max_mt_kw: 2500,        // REN 1000/2021, art. 23: demanda > 2.500 kW → tensão ≥ 69 kV
  carga_min_mt_kw: 75,            // REN 1000/2021, art. 23: carga instalada > 75 kW → atendimento em tensão primária
  demanda_min_contratada_kw: 30,  // REN 1000/2021: montante mínimo de demanda contratada (Grupo A)
  tolerancia_ultrapassagem: 0.05, // REN 1000/2021: ultrapassagem cobrada acima de 105 % da contratada
  fp_referencia: 0.92,            // REN 1000/2021: fator de potência de referência
  resistencia_malha_max_ohm: 10,  // exigência usual de distribuidora para a malha da SE consumidora
};

const TIPOS_SE = {
  poste: 'Aérea em poste (transformador em poste)',
  abrigada: 'Abrigada em alvenaria (cubículos)',
  blindada: 'Abrigada em cabine metálica blindada',
  ao_tempo: 'Ao tempo (no solo, área cercada)',
};

// ── Baixa tensão (lado secundário) ─────────────────────────────────────────
const DISJ_BT = [100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6300];
const ICU_BT = [25, 36, 50, 65, 70, 85, 100, 150];
// Barras de cobre nu, CA, 1 barra por fase (ou conjunto), 35 °C ambiente /
// 65 °C na barra — ordem de grandeza da DIN 43671 [CONFERIR com o fabricante do painel]
const BARRAMENTOS = [
  { barra: '1 × (20 × 5 mm)', a: 274 }, { barra: '1 × (30 × 5 mm)', a: 379 }, { barra: '1 × (40 × 5 mm)', a: 482 },
  { barra: '1 × (50 × 5 mm)', a: 583 }, { barra: '1 × (40 × 10 mm)', a: 715 }, { barra: '1 × (50 × 10 mm)', a: 852 },
  { barra: '1 × (60 × 10 mm)', a: 985 }, { barra: '1 × (80 × 10 mm)', a: 1240 }, { barra: '1 × (100 × 10 mm)', a: 1490 },
  { barra: '2 × (80 × 10 mm)', a: 2110 }, { barra: '2 × (100 × 10 mm)', a: 2500 }, { barra: '3 × (100 × 10 mm)', a: 3310 },
  { barra: '4 × (100 × 10 mm)', a: 4000 },
];

// ── Aterramento (NBR 15751 / IEEE Std 80) ──────────────────────────────────
// Propriedades do cobre recozido (IEEE 80, Tabela 1) para a fórmula de Onderdonk
const COBRE = { alfa: 0.00393, rho_uohm_cm: 1.72, tcap: 3.42, k0: 234 };
// Temperatura máxima admissível da conexão (°C) [CONFERIR]
const TEMP_CONEXAO = { exotermica: 850, compressao: 450, aparafusada: 250 };
const SECAO_MIN_MALHA = 50; // mm² cobre nu — usual em norma de distribuidora [CONFERIR]
const HASTE_PADRAO = { comprimento_m: 2.4, descricao: 'Haste de aterramento aço-cobreado 5/8" × 2,40 m (camada ≥ 254 µm, NBR 13571)' };

module.exports = {
  POTENCIAS_TRAFO, impedanciaTipica, multiploInrush, tempoAnsi,
  METODOS_MT, CAPACIDADE_MT, SECOES_MT, capacidadeMt, K_CURTO, SECAO_MIN_NORMA_MT, SECAO_MIN_DISTRIBUIDORA_MT, X_CABO_MT, classeMt,
  CURVAS_IEC, tempoCurva, TC_PRIMARIOS, FATOR_SOBRECORRENTE_TC, DISJ_MT_IN, DISJ_MT_ICN, RELE_PARTIDA_MIN_PCT_TC, ELO_FUSIVEL_13_8, FUSIVEL_HH, FATOR_HH,
  CHAVE_FUSIVEL_IN, CHAVE_FUSIVEL_ICN_SIM_KA, ELO_K_FATOR_CONTINUO, PARA_RAIOS_UR, PARA_RAIOS_MCOV_UR, FATOR_TENSAO_MAX,
  DISTRIBUIDORA, TIPOS_SE, DISJ_BT, ICU_BT, BARRAMENTOS, COBRE, TEMP_CONEXAO, SECAO_MIN_MALHA, HASTE_PADRAO,
};
