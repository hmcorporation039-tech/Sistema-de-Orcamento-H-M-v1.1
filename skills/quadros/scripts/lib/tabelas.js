// Tabelas de referência do projeto de fabricação de quadros (conjuntos de
// manobra e comando de BT — ABNT NBR IEC 61439-1/-2). Cada tabela diz de onde
// veio. Dimensões, perdas e consumos de dispositivos são TÍPICOS de catálogo
// (fabricantes de linha DIN, painéis e automação usuais no Brasil) e saem nos
// documentos com [CONFERIR] — o projeto executivo usa o catálogo do fabricante
// escolhido. Itens de norma lidos no texto: NBR 5410:2004 6.5.4.2, 6.5.4.7 e
// Tabela 59, 5.1.3.2.2, 5.3.5.5.1, 6.3.5.2.4 d) e 6.3.5.2.9, Tabela 58
// (conferidos em 29/10/2026); NBR 5419-4:2026 Anexo C (C.1.7). Os itens da
// NBR IEC 61439 e da IEC TR 60890 não estavam na biblioteca: vão com [CONFERIR].

// ── Espaço ──────────────────────────────────────────────────────────────────

// Módulo DIN (DIN 43880): 17,5 mm; alguns fabricantes usam 18 mm — o espaço é
// reservado com 18 mm (lado da segurança). Trilho TS35 × 7,5 (EN 60715).
const MODULO_MM = 18;
const MODULO_NOMINAL_MM = 17.5;

// Altura (mm) e profundidade (mm, a partir da placa) típicas
const DIN_ALTURA = 90;
const DIN_PROF = 80;

// Dispositivos de linha DIN — módulos por dispositivo [CONFERIR catálogo]
//   disjuntor: 1 módulo por polo (NBR NM 60898 / IEC 60947-2)
//   DDR (disjuntor diferencial, RCBO): 1P+N = 2; 2P = 4; 3P = 7; 4P = 8 (com bloco Vigi)
//   IDR (interruptor diferencial, RCCB, NBR NM 61008): 2P = 2; 4P = 4
//   DPS classe II: 1 módulo por polo; classe I ou I+II: 2 por polo (centelhador/varistor reforçado)
const modulosDisjuntor = (polos) => Math.max(1, polos);
const modulosDdr = (polos) => ({ 1: 2, 2: 4, 3: 7, 4: 8 })[polos] || 2 * polos;
const modulosIdr = (polos) => (polos <= 2 ? 2 : 4);
const modulosDps = (classe) => (classe === 'II' ? 1 : 2);

// Disjuntores de caixa moldada (NBR IEC 60947-2): largura × altura × profundidade (mm), 3 polos;
// 4 polos: +35 mm (≤ 250 A), +45 mm (≤ 630 A), +70 mm (> 630 A) [CONFERIR catálogo]
const CAIXA_MOLDADA = [
  { ate: 160, l: 105, h: 161, p: 86, l4: 140 },
  { ate: 250, l: 105, h: 161, p: 86, l4: 140 },
  { ate: 630, l: 140, h: 255, p: 110, l4: 185 },
  { ate: 1600, l: 210, h: 327, p: 147, l4: 280 },
];

// Partidas de motor (largura no trilho, altura, profundidade) [CONFERIR catálogo]
const CONTATOR_DIM = [
  { ate: 38, l: 45, h: 85, p: 95 }, { ate: 65, l: 55, h: 120, p: 115 }, { ate: 95, l: 70, h: 125, p: 125 },
  { ate: 150, l: 120, h: 170, p: 140 }, { ate: 400, l: 160, h: 220, p: 180 }, { ate: 800, l: 230, h: 300, p: 220 },
];
const DISJUNTOR_MOTOR_DIM = [{ ate: 32, l: 45, h: 90, p: 95 }, { ate: 65, l: 55, h: 130, p: 110 }, { ate: 100, l: 70, h: 140, p: 120 }];
const RELE_SOBRECARGA_ALTURA = 45; // montado sob o contator
// Soft-starter (com by-pass) e inversor de frequência — por corrente (A) [CONFERIR modelo]
const SOFT_DIM = [{ ate: 38, l: 45, h: 160, p: 140 }, { ate: 85, l: 95, h: 200, p: 160 }, { ate: 200, l: 180, h: 300, p: 190 }, { ate: 600, l: 300, h: 450, p: 250 }];
const INVERSOR_DIM = [{ ate: 7, l: 75, h: 200, p: 160 }, { ate: 16, l: 100, h: 240, p: 180 }, { ate: 33, l: 140, h: 300, p: 200 }, { ate: 61, l: 200, h: 400, p: 220 }, { ate: 150, l: 280, h: 600, p: 300 }, { ate: 400, l: 400, h: 900, p: 380 }];

// Automação (largura no trilho, altura) [CONFERIR com a família do CLP escolhida]
const CLP = {
  cpu: { l: 110, h: 100, p: 75, consumo_ma: 300, perda_w: 10, rotulo: 'CPU compacta' },
  DI: { canais: 16, l: 45, h: 100, p: 75, consumo_ma: 50, perda_w: 2.5, rotulo: 'Módulo 16 entradas digitais 24 Vcc' },
  DO: { canais: 16, l: 45, h: 100, p: 75, consumo_ma: 60, perda_w: 3, rotulo: 'Módulo 16 saídas digitais 24 Vcc (transistor)' },
  AI: { canais: 4, l: 45, h: 100, p: 75, consumo_ma: 60, perda_w: 2, rotulo: 'Módulo 4 entradas analógicas 4–20 mA / 0–10 V' },
  AO: { canais: 2, l: 45, h: 100, p: 75, consumo_ma: 60, perda_w: 2, rotulo: 'Módulo 2 saídas analógicas 4–20 mA / 0–10 V' },
  RS485: { l: 30, h: 100, p: 75, consumo_ma: 50, perda_w: 1.5, rotulo: 'Módulo de comunicação RS-485 (Modbus RTU)' },
};
// E/S integradas típicas de CPU compacta (14 DI / 10 DO / 2 AI) — editável no formulário
const CPU_IO_PADRAO = { DI: 14, DO: 10, AI: 2, AO: 0 };
const FONTES_24V_A = [2.5, 5, 10, 20, 40];
const FONTE_DIM = { 2.5: { l: 54, h: 90 }, 5: { l: 70, h: 90 }, 10: { l: 65, h: 125 }, 20: { l: 86, h: 125 }, 40: { l: 125, h: 130 } };
const FONTE_RENDIMENTO = 0.9;
const RELE_INTERFACE = { l: 6.2, h: 90, p: 80, consumo_ma: 17, perda_w: 0.4 }; // relé "slim" 24 Vcc com base
const SWITCH = { l: 45, h: 110, p: 80, consumo_ma: 200, perda_w: 4.8 };
const CONSUMO_24V_MA = { ihm: 500, sinaleiro: 20, sensor: 30, rele_seguranca: 100 };

// Bornes (largura em mm, por seção em mm²) — bornes de parafuso/mola [CONFERIR catálogo]
const BORNE_LARGURA = { 1.5: 5.2, 2.5: 5.2, 4: 6.2, 6: 8.2, 10: 10.2, 16: 12.2, 25: 16, 35: 16, 50: 18.5, 70: 22, 95: 25 };
const BORNE_ALTURA = 60;
const BORNE_POSTE_MM = 9; // batente (2 por grupo); tampa final ≈ 2 mm por grupo

// Canaletas de fiação (largura × altura, mm) — série comercial usual [CONFERIR]
const CANALETAS = [[30, 30], [30, 50], [40, 40], [40, 60], [50, 50], [50, 80], [60, 60], [60, 80], [80, 80], [80, 100], [100, 100]];
// ocupação máxima recomendada pelos fabricantes de canaleta (folga para manutenção e dissipação)
const OCUPACAO_CANALETA = 0.5;

// Diâmetro externo de condutor flexível 450/750 V (NBR NM 247-3) — aproximado [CONFERIR catálogo]
const DIAMETRO_FIO = { 0.5: 2.2, 0.75: 2.4, 1: 2.6, 1.5: 3.0, 2.5: 3.6, 4: 4.3, 6: 4.9, 10: 6.4, 16: 7.6, 25: 9.6, 35: 10.9, 50: 13.0, 70: 15.0, 95: 17.5, 120: 19.3 };
// Fiação interna de potência pela corrente do dispositivo — prática de montagem com
// condutor flexível em canaleta (NBR IEC 61439-1, Anexo H — [CONFERIR]); a seção do
// circuito externo, quando informada e maior, prevalece.
const FIO_POR_CORRENTE = [[10, 1.5], [16, 2.5], [20, 2.5], [25, 4], [32, 6], [40, 10], [50, 10], [63, 16], [80, 25], [100, 35], [125, 50]];
const FIO_COMANDO = 0.75; // 24 Vcc (comando/sinal); 1,5 mm² para comando em CA
const FIO_COMANDO_CA = 1.5;

// ── Invólucros: séries comerciais (mm) ───────────────────────────────────────
// Altura × largura de quadros de chapa de aço de sobrepor/embutir e de armários
// autoportantes das séries usuais dos fabricantes nacionais [CONFERIR com o fornecedor].
// Placa de montagem: invólucro menos 60 mm (sobrepor/embutir) ou 250 × 100 mm (autoportante: base e teto).
const INVOLUCROS = {
  sobrepor: {
    alturasLarguras: [[300, 300], [400, 300], [400, 400], [500, 400], [600, 400], [600, 500], [600, 600], [700, 500], [800, 600], [800, 800], [1000, 600], [1000, 800], [1200, 800], [1200, 1000]],
    profundidades: [150, 200, 250, 300, 400], margemPlaca: [60, 60],
  },
  embutir: {
    alturasLarguras: [[300, 300], [400, 300], [400, 400], [500, 400], [600, 400], [600, 500], [700, 500], [800, 600], [1000, 600], [1000, 800], [1200, 800]],
    profundidades: [100, 150, 200], margemPlaca: [60, 60],
  },
  autoportante: {
    alturasLarguras: [600, 800, 1000, 1200].flatMap(l => [1800, 2000, 2200].map(h => [h, l])),
    profundidades: [400, 500, 600, 800], margemPlaca: [250, 100],
  },
};
// Folga da placa: margem útil interna (mm) e canaleta vertical lateral mínima
const MARGEM_UTIL = 15;
const FOLGA_PORTA = 40; // profundidade além do dispositivo mais fundo (porta, espelho, cabos)

// ── Barramentos ─────────────────────────────────────────────────────────────

// DIN 43671 (1975), Tabela 1 — barras retangulares de cobre E-Cu F30, CA 50/60 Hz,
// uma barra por fase, ar ambiente 35 °C e barra a 65 °C (Δθ = 30 K): corrente
// permanente (A) com barra nua e pintada. Valores reproduzidos de catálogos de
// barramentos [CONFERIR com a tabela original].
const BARRAS_DIN43671 = [
  { l: 12, e: 2, nua: 108, pintada: 123 }, { l: 15, e: 2, nua: 128, pintada: 148 }, { l: 15, e: 3, nua: 162, pintada: 187 },
  { l: 20, e: 3, nua: 204, pintada: 237 }, { l: 20, e: 5, nua: 274, pintada: 319 }, { l: 25, e: 5, nua: 327, pintada: 384 },
  { l: 30, e: 5, nua: 379, pintada: 447 }, { l: 40, e: 5, nua: 482, pintada: 573 }, { l: 30, e: 10, nua: 573, pintada: 676 },
  { l: 50, e: 5, nua: 583, pintada: 697 }, { l: 60, e: 5, nua: 688, pintada: 826 }, { l: 40, e: 10, nua: 715, pintada: 850 },
  { l: 50, e: 10, nua: 852, pintada: 1020 }, { l: 80, e: 5, nua: 885, pintada: 1070 }, { l: 60, e: 10, nua: 985, pintada: 1180 },
  { l: 100, e: 5, nua: 1080, pintada: 1300 }, { l: 80, e: 10, nua: 1240, pintada: 1500 }, { l: 100, e: 10, nua: 1490, pintada: 1810 },
  { l: 120, e: 10, nua: 1740, pintada: 2110 },
];
// Correção de temperatura (DIN 43671, Figura 2) aproximada por k2 = ((θbarra − θar)/30)^0,61 —
// a troca de calor por convecção natural e radiação cresce com Δθ^1,25 e I² ∝ calor [CONFERIR na curva]
const EXPOENTE_K2 = 0.61;
// Barramento tipo pente (DIN): corrente nominal (A) → seção (mm²) [CONFERIR catálogo]
const PENTES = [{ a: 63, s: 10 }, { a: 80, s: 16 }, { a: 100, s: 25 }, { a: 125, s: 35 }];
const DENSIDADE_COBRE = 8.96; // g/cm³ → kg = S(mm²) × L(m) × 0,00896
const RHO_20 = 0.0172;        // Ω·mm²/m — cobre recozido a 20 °C (IEC 60028)
const ALFA_COBRE = 0.00393;   // 1/K
// Curto-circuito (aquecimento adiabático, IEC 60949 / IEC 60865-1): S ≥ I·√t / k,
// k = 226·√ln((234,5 + θf)/(234,5 + θi)) para o cobre. θf = 200 °C para condutor
// nu (IEC 60865-1, Tabela 6 — temperatura máxima recomendada no curto) [CONFERIR];
// θi = temperatura da barra em serviço. Com θi = 90 °C e θf = 250 °C dá k = 143,
// o valor da NBR 5410 (Tabela 30) para cabo EPR/XLPE.
const K_ADIABATICO_COBRE = 226;
const BETA_COBRE = 234.5;
const THETA_FINAL_BARRA = 200;
// Esforço eletrodinâmico (IEC 60865-1, método simplificado): força no condutor central
// F = (√3/2)·(μ0/2π)·ip²·L/a = 0,173·ip²[kA]·L/a (N); tensão de flexão
// σ = Vσ·Vr·β·F·L/(8·Z) com Vσ·Vr = 1 (lado da segurança), β = 0,73 (viga contínua,
// 3 ou mais apoios) e σ ≤ q·Rp0,2 com q = 1,5 (seção retangular); força nos apoios
// FS = α·F com α = 1,1 (apoio intermediário) [CONFERIR Tabelas 2 e 3]. Estimativa.
const BETA_VIGA = 0.73;
const ALFA_APOIO = 1.1;
const Q_RETANGULAR = 1.5;
const RP02_COBRE = 200; // N/mm² — mínimo adotado para cobre semiduro [CONFERIR com o fornecedor da barra]

// NBR IEC 61439-1, Tabela 7 — relação n = Ipk/Icw (valor de crista / eficaz) pela corrente
// de curto e fator de potência [CONFERIR]
const FATOR_N_IPK = [{ ate: 5, n: 1.5, fp: 0.7 }, { ate: 10, n: 1.7, fp: 0.5 }, { ate: 20, n: 2.0, fp: 0.3 }, { ate: 50, n: 2.1, fp: 0.25 }, { ate: Infinity, n: 2.2, fp: 0.2 }];
const ICW_KA = [6, 10, 15, 20, 25, 35, 50, 65, 80, 100];

// ── Proteção ────────────────────────────────────────────────────────────────

// Disjuntores DIN (NBR NM 60898 até 63 A, IEC 60947-2 até 125 A) e caixa moldada (A)
const DISJUNTORES_DIN = [2, 4, 6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
const DISJUNTORES_CM = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600];
// Capacidade de interrupção (kA): Icn NBR NM 60898 (até 10 kA na linha residencial);
// DIN IEC 60947-2 até 25 kA; caixa moldada até 100 kA
const ICN_60898 = [3, 4.5, 6, 10];
const ICU_DIN_60947 = [10, 15, 20, 25];
const ICU_CM = [16, 25, 36, 50, 70, 100];
// Ics da NBR NM 60898: = Icn até 6 kA; 0,75·Icn (mín. 6 kA) até 10 kA; 0,5·Icn (mín. 7,5 kA) acima [CONFERIR]
function icsDin(icn) {
  if (icn <= 6) return icn;
  if (icn <= 10) return Math.max(6, 0.75 * icn);
  return Math.max(7.5, 0.5 * icn);
}
const IDR_IN = [25, 40, 63, 80, 100, 125];
// Seletividade amperimétrica por razão de correntes nominais (regra prática) — a seletividade
// total só se garante pela tabela do fabricante
const RAZAO_SELETIVIDADE = 1.6;
// Transformadores de corrente para medição: primário (A) / 5 A
const TCS = [50, 60, 75, 100, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200, 1500, 2000];
const MEDICAO_DIRETA_MAX_A = 63;

// ── Térmica ─────────────────────────────────────────────────────────────────

// Potência dissipada MÁXIMA por polo de disjuntor DIN à corrente nominal — NBR NM 60898 /
// IEC 60898-1 (tabela de potência dissipada por polo) [CONFERIR tabela]. Os valores reais de
// catálogo são em geral 40 a 60 % menores: o cálculo fica do lado da segurança.
const PERDA_DISJUNTOR_DIN = [[10, 3], [16, 3.5], [25, 4.5], [32, 6], [40, 7.5], [50, 9], [63, 13], [100, 15], [125, 20]];
// Caixa moldada — W por polo a In (típico de catálogo) [CONFERIR]
const PERDA_CAIXA_MOLDADA = [[160, 8], [250, 15], [400, 20], [630, 35], [1000, 50], [1600, 80]];
// Interruptor DR — W por polo a In (típico) [CONFERIR]
const PERDA_IDR = [[25, 1.5], [40, 2.5], [63, 4.5], [80, 6], [100, 8], [125, 10]];
// Contatores (bobina + contatos a Ie AC-3), disjuntor-motor e relé de sobrecarga — W (típico) [CONFERIR]
const PERDA_CONTATOR = [[12, 3.5], [25, 5], [38, 7.5], [65, 12], [95, 18], [150, 30], [400, 45], [800, 70]];
const PERDA_DISJUNTOR_MOTOR = [[10, 5], [25, 7], [40, 9], [63, 12], [100, 18]];
const PERDA_RELE = [[25, 4], [80, 8], [Infinity, 15]];
// Soft-starter com by-pass: 10 W + 0,4 W/A; inversor: 3 % da potência do motor (dissipador interno) [CONFERIR manual]
const PERDA_SOFT = (iA) => 10 + 0.4 * iA;
const PERDA_INVERSOR_PCT = 0.03;
const PERDA_MEDIDOR_W = 4;
const PERDA_IHM_W = 8;

// IEC TR 60890 — fatores de superfície b (W·H·D em m²): teto exposto 1,4; teto coberto 0,7;
// laterais expostas 0,9; laterais cobertas (parede/vizinho) 0,5; piso 0 [CONFERIR]
const FATOR_SUPERFICIE = { tetoExposto: 1.4, tetoCoberto: 0.7, ladoExposto: 0.9, ladoCoberto: 0.5 };
// Coeficiente de transmissão de calor do invólucro (W/(m²·K)) — fornecedores de climatização
// de painéis (chapa de aço pintada 5,5; inox 4,5; alumínio 12; poliéster 3,5) [CONFERIR]
const COEF_TRANSMISSAO = { aco: 5.5, inox: 4.5, aluminio: 12, poliester: 3.5 };
// Ar no topo ≈ c × elevação média (IEC TR 60890 traz c por curva; 1,3 típico de invólucro sem
// ventilação) — estimativa declarada [CONFERIR na curva]
const FATOR_TOPO = 1.3;
// Ventilação forçada: V = f·Q/ΔT (m³/h), f = 3,1 m³·K/(W·h) ao nível do mar, crescendo com a
// altitude (ar menos denso) — fornecedores de climatização de painéis [CONFERIR]
const FATOR_F_ALTITUDE = [[100, 3.1], [250, 3.2], [500, 3.3], [750, 3.4], [1000, 3.5], [1250, 3.6], [1500, 3.7], [1750, 3.8], [2000, 3.9]];
const VENTILADORES_M3H = [25, 55, 105, 180, 300, 550, 700, 900];
const EFICIENCIA_FILTRO = 0.7; // vazão com filtro de saída ≈ 70 % da vazão livre [CONFERIR]
// Redução de corrente do disjuntor DIN com a temperatura do ar (referência 30 °C, NBR NM 60898):
// ≈ 0,45 %/°C (média de catálogos) [CONFERIR tabela de "derating" do fabricante]
const DERATING_DIN_POR_C = 0.0045;
// NBR IEC 61439-2 — fator de diversidade nominal (RDF) assumido pelo número de circuitos de
// saída quando não informado [CONFERIR tabela]
const RDF = [[1, 1], [3, 0.9], [5, 0.8], [9, 0.7], [Infinity, 0.6]];

// ── Grau de proteção e forma de separação ─────────────────────────────────

// Local de instalação → IP (NBR IEC 60529) e IK (NBR IEC 62262) recomendados. Recomendação
// H&M a partir das influências externas (NBR 5410, 4.2.6 — AD água / AE poeira / AG impacto e
// 6.5.4.4); não é tabela de norma [CONFERIR com o local]
const LOCAIS = {
  interno_tecnico: { rotulo: 'Interno — sala elétrica / área técnica (acesso restrito)', ip: 'IP31', ik: 'IK07', influencias: 'AD1, AE1, AG1' },
  interno_publico: { rotulo: 'Interno — área comum (acesso de pessoas leigas)', ip: 'IP41', ik: 'IK08', influencias: 'AD1, AE2, AG2' },
  interno_poeira: { rotulo: 'Interno — indústria (poeira, respingos)', ip: 'IP54', ik: 'IK08', influencias: 'AD3, AE5, AG2' },
  externo_abrigado: { rotulo: 'Externo abrigado (sob cobertura)', ip: 'IP55', ik: 'IK08', influencias: 'AD4, AE5, AG2' },
  externo_exposto: { rotulo: 'Externo exposto (chuva, sol)', ip: 'IP65', ik: 'IK10', influencias: 'AD5, AE6, AG3' },
  lavagem: { rotulo: 'Área com lavagem por jato', ip: 'IP66', ik: 'IK10', influencias: 'AD6, AE6, AG3' },
};
// NBR IEC 61439-2, 8.101 — formas de separação interna [CONFERIR redação e Figura 104]
const FORMAS = {
  1: 'Forma 1 — sem separação interna',
  '2a': 'Forma 2a — barramentos separados das unidades funcionais; terminais não separados dos barramentos',
  '2b': 'Forma 2b — barramentos separados das unidades funcionais; terminais separados dos barramentos',
  '3a': 'Forma 3a — barramentos separados das unidades funcionais e unidades funcionais separadas entre si; terminais não separados dos barramentos',
  '3b': 'Forma 3b — como 3a, com os terminais separados dos barramentos',
  '4a': 'Forma 4a — como 3b, com os terminais de cada unidade funcional separados entre si, no mesmo compartimento da unidade',
  '4b': 'Forma 4b — como 4a, com os terminais em compartimento próprio, separado da unidade funcional',
};

// NBR IEC 61439-1, Tabela 8 — tensão de ensaio dielétrico na frequência industrial (V eficaz)
// pela tensão nominal de isolamento Ui [CONFERIR tabela]
const TENSAO_ENSAIO = [[60, 1000], [300, 1500], [690, 1890], [800, 2000], [1000, 2200]];
// NBR IEC 61439-1, Tabela 1 — distâncias de isolamento (mm) pela Uimp [CONFERIR]
const DISTANCIA_ISOLAMENTO = [[2.5, 1.5], [4, 3], [6, 5.5], [8, 8], [12, 14]];
// Distância de escoamento (mm) — grau de poluição 3, grupo de material IIIa, pela Ui (IEC 60664-1) [CONFERIR]
const DISTANCIA_ESCOAMENTO = [[250, 4], [400, 6.3], [500, 8], [630, 10], [800, 12.5], [1000, 16]];

// ── Motores ─────────────────────────────────────────────────────────────────
// Rendimento e FP típicos quando a placa não é informada [CONFERIR placa]
const MOTOR_PADRAO = { eta: 0.88, fp: 0.84, ipIn: 7 };

// ── Utilidades ──────────────────────────────────────────────────────────────
const proximo = (lista, v) => lista.find(x => x >= v - 1e-9);
const porFaixa = (lista, v) => (lista.find(([ate]) => v <= ate + 1e-9) || lista[lista.length - 1])[1];
const dimPorCorrente = (lista, i) => lista.find(d => i <= d.ate + 1e-9) || lista[lista.length - 1];

module.exports = {
  MODULO_MM, MODULO_NOMINAL_MM, DIN_ALTURA, DIN_PROF, modulosDisjuntor, modulosDdr, modulosIdr, modulosDps,
  CAIXA_MOLDADA, CONTATOR_DIM, DISJUNTOR_MOTOR_DIM, RELE_SOBRECARGA_ALTURA, SOFT_DIM, INVERSOR_DIM,
  CLP, CPU_IO_PADRAO, FONTES_24V_A, FONTE_DIM, FONTE_RENDIMENTO, RELE_INTERFACE, SWITCH, CONSUMO_24V_MA,
  BORNE_LARGURA, BORNE_ALTURA, BORNE_POSTE_MM, CANALETAS, OCUPACAO_CANALETA, DIAMETRO_FIO, FIO_POR_CORRENTE, FIO_COMANDO, FIO_COMANDO_CA,
  INVOLUCROS, MARGEM_UTIL, FOLGA_PORTA,
  BARRAS_DIN43671, EXPOENTE_K2, PENTES, DENSIDADE_COBRE, RHO_20, ALFA_COBRE, K_ADIABATICO_COBRE, BETA_COBRE, THETA_FINAL_BARRA,
  BETA_VIGA, ALFA_APOIO, Q_RETANGULAR, RP02_COBRE, FATOR_N_IPK, ICW_KA,
  DISJUNTORES_DIN, DISJUNTORES_CM, ICN_60898, ICU_DIN_60947, ICU_CM, icsDin, IDR_IN, RAZAO_SELETIVIDADE, TCS, MEDICAO_DIRETA_MAX_A,
  PERDA_DISJUNTOR_DIN, PERDA_CAIXA_MOLDADA, PERDA_IDR, PERDA_CONTATOR, PERDA_DISJUNTOR_MOTOR, PERDA_RELE, PERDA_SOFT, PERDA_INVERSOR_PCT,
  PERDA_MEDIDOR_W, PERDA_IHM_W, FATOR_SUPERFICIE, COEF_TRANSMISSAO, FATOR_TOPO, FATOR_F_ALTITUDE, VENTILADORES_M3H, EFICIENCIA_FILTRO,
  DERATING_DIN_POR_C, RDF, LOCAIS, FORMAS, TENSAO_ENSAIO, DISTANCIA_ISOLAMENTO, DISTANCIA_ESCOAMENTO, MOTOR_PADRAO,
  proximo, porFaixa, dimPorCorrente,
};
