// Tabelas da elétrica industrial. As tabelas da NBR 5410 (capacidade de
// condução, fatores, seções mínimas, PE) vêm da skill de elétrica
// (skills/_comum/eletrico/tabelas.js); aqui ficam só os dados de motores,
// dispositivos de partida, capacitores e curto-circuito.
//
// Faixas e correntes comerciais são as usuais de catálogo (WEG, Siemens,
// Schneider, ABB) — [CONFERIR] sempre com o catálogo do fabricante escolhido.

// 1 cv (cavalo-vapor métrico) = 735,5 W — NBR 17094-1 usa kW; cv mantido por uso corrente
const CV_KW = 0.7355;

// Corrente de partida típica por tipo de partida (múltiplo da Ip de partida direta)
// e conjugado de partida relativo ao da partida direta
const PARTIDAS = {
  direta: { rotulo: 'Partida direta', norma: 'NBR IEC 60947-4-1 (AC-3)' },
  estrela_triangulo: { rotulo: 'Estrela-triângulo (Y-Δ)', norma: 'NBR IEC 60947-4-1 (AC-3)' },
  soft_starter: { rotulo: 'Soft-starter', norma: 'NBR IEC 60947-4-2' },
  inversor: { rotulo: 'Inversor de frequência', norma: 'IEC 61800-2 / IEC 61800-5-1' },
};
// Soft-starter: limitação de corrente típica 3 × In (ajuste 2 a 4 × In conforme o conjugado da carga) [CONFERIR]
const LIMITE_SOFT_PADRAO = 3.0;
// Inversor: corrente de aceleração limitada a ~1,5 × In (sobrecarga de 60 s) [CONFERIR]
const LIMITE_INVERSOR_PADRAO = 1.5;
// FP durante a partida (rotor bloqueado) — típico 0,3 a 0,4 [CONFERIR com o fabricante]
const FP_PARTIDA_PADRAO = 0.35;
// O inversor absorve da rede quase só potência ativa (retificador a diodos)
const FP_PARTIDA_INVERSOR = 0.95;

// Fator de utilização (carregamento médio do motor) por faixa de potência —
// valores típicos da literatura (Mamede Filho, Instalações Elétricas Industriais) [CONFERIR]
const FATOR_UTILIZACAO = [
  { ate_cv: 2.5, fator: 0.70 },
  { ate_cv: 15, fator: 0.83 },
  { ate_cv: 40, fator: 0.85 },
  { ate_cv: Infinity, fator: 0.87 },
];
function fatorUtilizacao(cv) {
  return FATOR_UTILIZACAO.find(f => cv <= f.ate_cv).fator;
}

// Fatores de demanda típicos das outras cargas [CONFERIR com o regime real da fábrica]
const DEMANDA_OUTRAS = {
  iluminacao: { rotulo: 'Iluminação', fd: 1.0, fp: 0.95 },
  tomadas: { rotulo: 'Tomadas de uso geral', fd: 0.3, fp: 0.92 },
  resistiva: { rotulo: 'Carga resistiva (estufa, forno, aquecimento)', fd: 1.0, fp: 1.0 },
  outros: { rotulo: 'Outras cargas', fd: 1.0, fp: 0.9 },
};

// Contatores — corrente nominal de emprego AC-3 em 380/400 V (A) [CONFERIR em 440 V]
const CONTATORES_AC3 = [9, 12, 18, 25, 32, 40, 50, 65, 80, 95, 115, 150, 185, 225, 265, 330, 400, 500, 630, 800];

// Disjuntor-motor (IEC 60947-2 / 60947-4-1): faixas de ajuste térmico (A)
const DISJUNTOR_MOTOR = [
  [0.1, 0.16], [0.16, 0.25], [0.25, 0.4], [0.4, 0.63], [0.63, 1], [1, 1.6], [1.6, 2.5], [2.5, 4], [4, 6.3], [6, 10],
  [9, 14], [13, 18], [17, 23], [20, 25], [23, 28], [27, 32], [28, 40], [36, 45], [40, 50], [45, 63], [55, 75], [70, 90], [80, 100],
];
// Disparo magnético do disjuntor-motor ≈ 13 × limite superior da faixa [CONFERIR]
const MAGNETICO_DM = 13;

// Relé de sobrecarga (térmico/eletrônico) — faixas de ajuste (A)
const RELES = [
  [0.1, 0.16], [0.16, 0.25], [0.25, 0.4], [0.4, 0.63], [0.63, 1], [1, 1.6], [1.6, 2.5], [2.5, 4], [4, 6], [5.5, 8], [7, 10],
  [9, 13], [12, 18], [17, 25], [23, 32], [30, 40], [37, 50], [48, 65], [55, 70], [63, 80], [80, 104], [95, 120], [110, 150],
  [140, 200], [200, 320], [250, 400], [400, 630],
];

// Fusíveis NH/Diazed (A)
const FUSIVEIS = [2, 4, 6, 10, 16, 20, 25, 32, 35, 40, 50, 63, 80, 100, 125, 160, 200, 224, 250, 315, 355, 400, 500, 630, 800];

// Disjuntores de caixa moldada / abertos (A) — alimentadores e geral
const DISJUNTORES_GERAIS = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000];

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

// Curto-circuito
const RHO_20 = 0.0178;   // Ω·mm²/m — cobre a 20 °C (Icc máximo, IEC 60909)
const RHO_QUENTE = 0.0225; // Ω·mm²/m — mesmo valor da skill de elétrica (queda de tensão / Icc mínimo)
const X_CABO = 0.08e-3;  // Ω/m — reatância típica de cabo BT [CONFERIR]
const R_TRAFO_PCT_PADRAO = 1.0; // perdas em carga ≈ 1 % de S para trafos de 300 a 1000 kVA [CONFERIR na placa/ensaio]
const XR_REDE = 10;       // X/R da rede de média tensão (IEC 60909: R ≈ 0,1·X)

// Diâmetro externo aproximado de cabo unipolar 0,6/1 kV EPR (mm) — para ocupação de eletrocalha [CONFERIR catálogo]
const DIAMETRO_CABO = { 1.5: 6.0, 2.5: 6.6, 4: 7.2, 6: 7.8, 10: 8.9, 16: 10, 25: 11.8, 35: 13, 50: 14.8, 70: 16.6, 95: 19, 120: 20.8, 150: 23, 185: 25.5, 240: 28.8, 300: 31.8, 400: 36, 500: 40 };
const ELETROCALHA_LARGURAS = [100, 150, 200, 300, 400, 500, 600, 800];
const ELETROCALHA_ALTURA = 100;
const ELETROCALHA_OCUPACAO = 0.4; // taxa de ocupação adotada [CONFERIR]

// Regimes de serviço (IEC 60034-1 / NBR 17094-1)
const REGIMES = {
  S1: 'S1 — contínuo', S2: 'S2 — tempo limitado', S3: 'S3 — intermitente periódico', S4: 'S4 — intermitente com partida',
  S5: 'S5 — intermitente com partida e frenagem', S6: 'S6 — contínuo com carga intermitente', S7: 'S7 — contínuo com partida e frenagem',
  S8: 'S8 — contínuo com mudança de velocidade', S9: 'S9 — variações não periódicas', S10: 'S10 — cargas discretas constantes',
};
const REGIMES_AC4 = ['S4', 'S5', 'S7', 'S8'];

// Formas de separação de conjuntos (NBR IEC 61439-2, 8.101)
const FORMAS = { 1: 'Forma 1', '2a': 'Forma 2a', '2b': 'Forma 2b', '3a': 'Forma 3a', '3b': 'Forma 3b', '4a': 'Forma 4a', '4b': 'Forma 4b' };

const proximo = (lista, v) => lista.find(x => x >= v - 1e-9);
const faixa = (lista, v) => lista.find(([a, b]) => v >= a - 1e-9 && v <= b + 1e-9) || null;

module.exports = {
  CV_KW, PARTIDAS, LIMITE_SOFT_PADRAO, LIMITE_INVERSOR_PADRAO, FP_PARTIDA_PADRAO, FP_PARTIDA_INVERSOR,
  FATOR_UTILIZACAO, fatorUtilizacao, DEMANDA_OUTRAS, CONTATORES_AC3, DISJUNTOR_MOTOR, MAGNETICO_DM, RELES, FUSIVEIS,
  DISJUNTORES_GERAIS, ICU_KA, ICW_KA, BARRAMENTOS_A, ESTAGIOS_KVAR, FATOR_CORRENTE_CAPACITOR, FATOR_FUSIVEL_CAPACITOR,
  TRAFOS_KVA, RHO_20, RHO_QUENTE, X_CABO, R_TRAFO_PCT_PADRAO, XR_REDE, DIAMETRO_CABO, ELETROCALHA_LARGURAS,
  ELETROCALHA_ALTURA, ELETROCALHA_OCUPACAO, REGIMES, REGIMES_AC4, FORMAS, proximo, faixa,
};
