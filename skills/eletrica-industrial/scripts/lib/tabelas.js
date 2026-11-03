// Tabelas da elétrica industrial. As tabelas da NBR 5410 (capacidade de
// condução, fatores, seções mínimas, PE) vêm da skill de elétrica
// (skills/_comum/eletrico/tabelas.js); as de motores e dispositivos de partida
// (contatores, disjuntor-motor, relés, fusíveis, regimes) vêm do motor comum
// skills/_comum/eletrico/motores.js (SK-08, 02/11/2026) e são reexportadas aqui
// com os mesmos nomes. Ficam aqui só capacitores, curto-circuito, CCM e eletrocalha.
//
// Faixas e correntes comerciais são as usuais de catálogo (WEG, Siemens,
// Schneider, ABB) — [CONFERIR] sempre com o catálogo do fabricante escolhido.

const M = require('../../../_comum/eletrico/motores');

const {
  CV_KW, PARTIDAS, LIMITE_SOFT_PADRAO, LIMITE_INVERSOR_PADRAO, FP_PARTIDA_PADRAO, FP_PARTIDA_INVERSOR,
  FATOR_UTILIZACAO, fatorUtilizacao, CONTATORES_AC3, DISJUNTOR_MOTOR, MAGNETICO_DM, RELES, FUSIVEIS,
  DISJUNTORES_GERAIS, RHO_QUENTE, X_CABO, REGIMES, REGIMES_AC4, proximo, faixa,
} = M;

// Fatores de demanda típicos das outras cargas [CONFERIR com o regime real da fábrica]
const DEMANDA_OUTRAS = {
  iluminacao: { rotulo: 'Iluminação', fd: 1.0, fp: 0.95 },
  tomadas: { rotulo: 'Tomadas de uso geral', fd: 0.3, fp: 0.92 },
  resistiva: { rotulo: 'Carga resistiva (estufa, forno, aquecimento)', fd: 1.0, fp: 1.0 },
  outros: { rotulo: 'Outras cargas', fd: 1.0, fp: 0.9 },
};

// Capacidade de interrupção (Icu) comercial (kA)
const ICU_KA = [3, 4.5, 6, 10, 15, 16, 20, 25, 36, 40, 50, 65, 70, 85, 100, 150];
// Corrente de curta duração (Icw, 1 s) e nominal de barramento de conjuntos IEC 61439
const ICW_KA = [6, 10, 15, 20, 25, 35, 50, 65, 80, 100];
const BARRAMENTOS_A = [63, 100, 160, 250, 400, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000];

// Capacitores (kvar) — estágios comerciais
const ESTAGIOS_KVAR = [2.5, 5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100];
// IEC 60831-1: sobrecorrente permanente 1,3 × In × tolerância de capacitância 1,1 → 1,43 [CONFERIR]
const FATOR_CORRENTE_CAPACITOR = 1.43;
// Fusível do estágio ≈ 1,65 × Ic (prática de fabricante) [CONFERIR]
const FATOR_FUSIVEL_CAPACITOR = 1.65;

// Transformadores trifásicos usuais (kVA)
const TRAFOS_KVA = [75, 112.5, 150, 225, 300, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000];

// Curto-circuito (RHO_QUENTE e X_CABO vêm do motor comum de motores)
const RHO_20 = 0.0178;   // Ω·mm²/m — cobre a 20 °C (Icc máximo, IEC 60909)
const R_TRAFO_PCT_PADRAO = 1.0; // perdas em carga ≈ 1 % de S para trafos de 300 a 1000 kVA [CONFERIR na placa/ensaio]
const XR_REDE = 10;       // X/R da rede de média tensão (IEC 60909: R ≈ 0,1·X)

// Diâmetro externo aproximado de cabo unipolar 0,6/1 kV EPR (mm) — para ocupação de eletrocalha [CONFERIR catálogo]
const DIAMETRO_CABO = { 1.5: 6.0, 2.5: 6.6, 4: 7.2, 6: 7.8, 10: 8.9, 16: 10, 25: 11.8, 35: 13, 50: 14.8, 70: 16.6, 95: 19, 120: 20.8, 150: 23, 185: 25.5, 240: 28.8, 300: 31.8, 400: 36, 500: 40 };
const ELETROCALHA_LARGURAS = [100, 150, 200, 300, 400, 500, 600, 800];
const ELETROCALHA_ALTURA = 100;
const ELETROCALHA_OCUPACAO = 0.4; // taxa de ocupação adotada [CONFERIR]

// Formas de separação de conjuntos (NBR IEC 61439-2, 8.101)
const FORMAS = { 1: 'Forma 1', '2a': 'Forma 2a', '2b': 'Forma 2b', '3a': 'Forma 3a', '3b': 'Forma 3b', '4a': 'Forma 4a', '4b': 'Forma 4b' };

module.exports = {
  CV_KW, PARTIDAS, LIMITE_SOFT_PADRAO, LIMITE_INVERSOR_PADRAO, FP_PARTIDA_PADRAO, FP_PARTIDA_INVERSOR,
  FATOR_UTILIZACAO, fatorUtilizacao, DEMANDA_OUTRAS, CONTATORES_AC3, DISJUNTOR_MOTOR, MAGNETICO_DM, RELES, FUSIVEIS,
  DISJUNTORES_GERAIS, ICU_KA, ICW_KA, BARRAMENTOS_A, ESTAGIOS_KVAR, FATOR_CORRENTE_CAPACITOR, FATOR_FUSIVEL_CAPACITOR,
  TRAFOS_KVA, RHO_20, RHO_QUENTE, X_CABO, R_TRAFO_PCT_PADRAO, XR_REDE, DIAMETRO_CABO, ELETROCALHA_LARGURAS,
  ELETROCALHA_ALTURA, ELETROCALHA_OCUPACAO, REGIMES, REGIMES_AC4, FORMAS, proximo, faixa,
};
