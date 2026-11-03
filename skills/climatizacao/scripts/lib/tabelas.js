// Tabelas e premissas da disciplina CLIMATIZAÇÃO (HVAC): carga térmica por
// componentes, seleção do sistema, sistemas centrais (chiller, fancoil/AHU, VAV,
// dutos, bombas) e operação (PMOC, vistoria e medições).
//
// Regra da skill (roteiro de 02/11/2026, fase 4): NENHUM valor de tabela de norma é
// dado como conferido sem ter sido lido no texto vigente. Tudo que não foi lido está
// marcado [CONFERIR] aqui, aparece como pendência no memorial (calc.pendencias) e
// pode ser trocado no formulário da obra.
//
// Conferido no texto em 02/11/2026:
//  - Lei 13.589/2018 (planalto.gov.br): art. 1º — edifícios de uso público e coletivo
//    com ambientes climatizados artificialmente devem ter PMOC; § 1º também os de uso
//    restrito (processos produtivos, laboratórios, hospitais) pelos regulamentos
//    próprios; art. 3º — padrões de qualidade do ar da RE 09/2003 da ANVISA "e
//    posteriores alterações" e normas da ABNT. A lei NÃO fixa limite de capacidade.
//  - Portaria MS 3.523/1998 (bvsms.saude.gov.br): art. 5º f — renovação mínima de
//    27 m³/h/pessoa; art. 5º e — tomada de ar externo com filtro classe G1 no mínimo;
//    art. 6º — sistemas com capacidade ACIMA de 5 TR (o texto diz "15.000 kcal/h =
//    60.000 BTU/H") exigem responsável técnico habilitado, que implanta o PMOC pelo
//    Anexo I e pela NBR 13971. O Anexo I (PDF à parte) NÃO foi aberto — [CONFERIR].
//  - Comunicado ABRAVA de 05/08/2024: desde 25/07/2024 os padrões referenciais da
//    RE 09/2003 passaram a ser os da ABNT NBR 17037 (CO₂ ≤ externo + 700 ppm; PM10
//    50 µg/m³ e PM2,5 25 µg/m³; velocidade do ar ≤ 0,20 m/s; 21 a 26 °C; UR 35 a 65 %;
//    análises semestrais com amostra externa no mesmo período). A NBR 17037 em si NÃO
//    foi lida — [CONFERIR NBR 17037].

// ── Constantes físicas (não são valor de norma) ────────────────────────────
const W_POR_TR = 3516.8525; // 1 TR = 12 000 BTU/h
const BTUH_POR_W = 3.412142;
const KCALH_POR_W = 0.859845;
const CP_AR_SECO = 1.006; // kJ/(kg·K)
const CP_VAPOR = 1.86; // kJ/(kg·K)
const H_VAPORIZACAO = 2501; // kJ/kg a 0 °C
const RHO_AGUA = 999.7; // kg/m³ (~10 °C)
const CP_AGUA = 4.19; // kJ/(kg·K)
const G = 9.81;

// ── Condições de projeto ──────────────────────────────────────────────────
// Externas: devem vir da NBR 16401-1 (Anexo A, dados climáticos por cidade) para o
// percentil escolhido. Os valores padrão abaixo são para pré-dimensionamento em
// Brasília e NÃO foram lidos na tabela da norma — [CONFERIR NBR 16401-1 Anexo A].
const EXTERNO_PADRAO = { cidade: 'Brasília/DF', altitude_m: 1100, tbs_c: 32, tbu_c: 22, conferir: true };
// Internas (conforto, NBR 16401-2): verão com temperatura operativa ~22,5 a 26 °C conforme
// a umidade — faixa NÃO conferida no texto [CONFERIR NBR 16401-2]. Adotado 24 °C / 50 %.
const INTERNO_PADRAO = { tbs_c: 24, ur_pct: 50, faixa_t: [22.5, 26], faixa_ur: [35, 65], conferir: true };

// ── Envoltória ────────────────────────────────────────────────────────────
// Resistência superficial externa Rse = 0,04 m²·K/W (ISO 6946 / NBR 15220-2) [CONFERIR NBR 15220-2]
const RSE = 0.04;
// Irradiância solar de PICO por orientação (W/m²), céu claro, latitude ~15 °S —
// valores de PRÉ-DIMENSIONAMENTO, não são tabela de norma. Os picos de faces opostas
// não ocorrem na mesma hora: somá-los superestima a carga (lado seguro).
// [CONFERIR com dados do local — ASHRAE Fundamentals cap. 14/18 ou software de simulação]
const IRRADIANCIA_PICO = { N: 450, NE: 550, L: 700, SE: 450, S: 150, SO: 450, O: 700, NO: 550, H: 950 };
const ORIENTACOES = { N: 'Norte', NE: 'Nordeste', L: 'Leste', SE: 'Sudeste', S: 'Sul', SO: 'Sudoeste', O: 'Oeste', NO: 'Noroeste', H: 'Horizontal (cobertura)' };
// Absortância solar α por cor da superfície externa [CONFERIR NBR 15220-2, Tabela B.2]
const ABSORTANCIA = { clara: 0.3, media: 0.5, escura: 0.8 };
// Transmitância térmica U (W/m²·K) típica por construção — PRÉ-DIMENSIONAMENTO
// [CONFERIR NBR 15220-3 Anexo D / catálogo do fabricante]
const CONSTRUCOES = {
  alvenaria: { rotulo: 'Parede de alvenaria rebocada', tipo: 'opaco', u: 2.5 },
  concreto: { rotulo: 'Parede de concreto (10 cm)', tipo: 'opaco', u: 4.4 },
  drywall: { rotulo: 'Gesso acartonado com lã mineral', tipo: 'opaco', u: 0.6 },
  laje_telhado: { rotulo: 'Laje com telhado (ático ventilado)', tipo: 'opaco', u: 2.0 },
  laje_exposta: { rotulo: 'Laje exposta impermeabilizada', tipo: 'opaco', u: 3.7 },
  telha_metalica: { rotulo: 'Telha metálica sanduíche (isolada)', tipo: 'opaco', u: 0.7 },
  vidro_simples: { rotulo: 'Vidro comum 6 mm', tipo: 'vidro', u: 5.7, fs: 0.83 },
  vidro_refletivo: { rotulo: 'Vidro refletivo/controle solar', tipo: 'vidro', u: 5.5, fs: 0.45 },
  vidro_duplo: { rotulo: 'Vidro duplo (insulado) baixo-e', tipo: 'vidro', u: 2.8, fs: 0.40 },
  divisa: { rotulo: 'Divisa com ambiente não climatizado', tipo: 'divisa', u: 2.5 },
};
// Divisa com ambiente não climatizado: ΔT adotado = metade do ΔT externo [CONFERIR critério H&M]
const FRACAO_DT_DIVISA = 0.5;

// ── Pessoas: calor sensível e latente por pessoa (W) ─────────────────────
// Valores ajustados do ASHRAE Fundamentals cap. 18, Tabela 1 (reproduzidos na
// NBR 16401-1, Anexo C) — NÃO conferidos no texto [CONFERIR NBR 16401-1 Anexo C].
const ATIVIDADES = {
  sentado: { rotulo: 'Sentado em repouso (teatro, auditório)', s: 65, l: 30 },
  escritorio: { rotulo: 'Trabalho leve de escritório', s: 75, l: 55 },
  em_pe: { rotulo: 'Em pé / andando devagar (loja, banco)', s: 75, l: 70 },
  restaurante: { rotulo: 'Restaurante (sentado, comendo)', s: 80, l: 80 },
  bancada: { rotulo: 'Trabalho leve de bancada (oficina, laboratório)', s: 80, l: 140 },
  academia: { rotulo: 'Atividade física (academia)', s: 210, l: 315 },
};
// Iluminação e equipamentos padrão (W/m²) quando o projeto não informa — pré-dimensionamento
// [CONFERIR com o projeto luminotécnico (skill iluminacao) e a lista real de equipamentos]
const ILUMINACAO_PADRAO_W_M2 = 10;
const EQUIPAMENTOS_PADRAO_W_M2 = { escritorio: 15, reuniao: 5, sala_aula: 5, loja: 10, restaurante: 10, auditorio: 3, outro: 10 };
const ATIVIDADE_DO_USO = { escritorio: 'escritorio', reuniao: 'escritorio', sala_aula: 'sentado', loja: 'em_pe', restaurante: 'restaurante', auditorio: 'sentado', outro: 'escritorio' };

// ── Ar externo (NBR 16401-3) ──────────────────────────────────────────────
// Fp/Fa e densidade de ocupação vêm da skill de automação (mesma tabela, já marcada
// [CONFERIR] lá): skills/automacao/scripts/lib/tabelas.js → AR_EXTERNO.
// Eficiência da distribuição Ez (NBR 16401-3 / ASHRAE 62.1 Tab. 6.2.2.2) [CONFERIR]
const EZ = {
  teto_frio: { rotulo: 'Insuflamento frio pelo teto, retorno pelo teto', ez: 1.0 },
  piso_frio: { rotulo: 'Insuflamento frio pelo piso (deslocamento)', ez: 1.2 },
  teto_quente: { rotulo: 'Insuflamento quente pelo teto, retorno pelo teto', ez: 0.8 },
};
// Portaria MS 3.523/1998, art. 5º f — renovação mínima (conferido no texto)
const RENOVACAO_MINIMA_M3H_PESSOA = 27;
// Eficiência de ventilação do sistema multizona Ev pela maior fração Zpz
// (ASHRAE 62.1, Tabela 6.2.5.2; mesmo procedimento na NBR 16401-3) [CONFERIR]
const EV_POR_ZPZ = [[0.15, 1.0], [0.25, 0.9], [0.35, 0.8], [0.45, 0.7], [0.55, 0.6]];

// ── Seleção do sistema (critério de projeto H&M — NÃO é norma) [CONFERIR] ──
const SISTEMAS = {
  split: { rotulo: 'Split (hi-wall / cassete / piso-teto) por ambiente', curto: 'split' },
  vrf: { rotulo: 'VRF (fluxo de refrigerante variável)', curto: 'VRF' },
  self: { rotulo: 'Self-contained / rooftop com dutos', curto: 'self' },
  chiller: { rotulo: 'Água gelada: chiller + fancoils (AHU)', curto: 'água gelada' },
};
const CRITERIO_SISTEMA = { split_max_tr: 5, split_max_ambientes: 4, self_min_tr_ambiente: 10, self_max_ambientes: 3, vrf_max_tr: 120 };

// Capacidades comerciais (pré-seleção; o modelo final é do catálogo) [CONFERIR fabricante]
const SPLIT_BTUH = [9000, 12000, 18000, 24000, 30000, 36000, 48000, 55000, 60000];
const VRF_EVAP_KW = [2.2, 2.8, 3.6, 4.5, 5.6, 7.1, 8.0, 9.0, 11.2, 14.0, 16.0];
const VRF_COND_KW = [22.4, 28.0, 33.5, 40.0, 45.0, 50.0, 56.0, 61.5];
const VRF_MODULOS_MAX = 3; // módulos por sistema (combinação) [CONFERIR fabricante]
const VRF_COMBINACAO = [0.5, 1.3]; // Σ evaporadoras ÷ condensadoras admitido [CONFERIR fabricante]
const SELF_TR = [5, 7.5, 10, 12.5, 15, 20, 25, 30, 40];
const CHILLER_TR = [30, 40, 50, 60, 70, 80, 100, 120, 140, 160, 180, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 1000];
// COP típico para a potência elétrica ESTIMADA de split/VRF/self (W/W) [CONFERIR etiqueta INMETRO/catálogo]
const COP_TIPICO = { split: 3.2, vrf: 3.8, self: 2.9 };
const FP_EQUIPAMENTO = 0.9; // FP típico de equipamento com compressor inverter [CONFERIR placa]

// ── Chiller ──────────────────────────────────────────────────────────────
// AHRI 550/590: IPLV = 0,01·A + 0,42·B + 0,45·C + 0,12·D (eficiência a 100/75/50/25 %
// da carga); condição padrão de água gelada 12,2 → 6,7 °C (≈ 2,4 gpm/TR) e de água de
// condensação 29,4 °C de entrada (≈ 3,0 gpm/TR) [CONFERIR AHRI 550/590, edição vigente]
const IPLV_PESOS = [0.01, 0.42, 0.45, 0.12];
const AGUA_GELADA_PADRAO = { saida_c: 6.7, delta_t: 5.5 };
const CONDENSACAO_PADRAO = { delta_t: 5.5 };
// Tonelada de torre de resfriamento = 15 000 BTU/h de rejeição (convenção CTI) [CONFERIR]
const W_POR_TR_TORRE = 4396.07;
// Eficiência MÍNIMA de chiller — ASHRAE 90.1, Tabela 6.8.1-3 (Path A / Path B), em
// COP (W/W) para água e EER→COP para ar. Valores de memória da edição 2016/2019,
// NÃO conferidos no texto [CONFERIR ASHRAE 90.1 da edição adotada no contrato].
const MIN_CHILLER_90_1 = {
  ar: [{ ate_tr: 150, a: { cop: 2.96, iplv: 4.01 }, b: { cop: 2.84, iplv: 4.63 } }, { ate_tr: Infinity, a: { cop: 2.96, iplv: 4.10 }, b: { cop: 2.84, iplv: 4.72 } }],
  agua_deslocamento: [
    { ate_tr: 75, a: { cop: 4.69, iplv: 5.86 }, b: { cop: 4.51, iplv: 7.03 } }, { ate_tr: 150, a: { cop: 4.88, iplv: 6.28 }, b: { cop: 4.69, iplv: 7.18 } },
    { ate_tr: 300, a: { cop: 5.33, iplv: 6.51 }, b: { cop: 5.17, iplv: 7.99 } }, { ate_tr: 600, a: { cop: 5.77, iplv: 6.76 }, b: { cop: 5.63, iplv: 8.58 } },
    { ate_tr: Infinity, a: { cop: 6.28, iplv: 7.03 }, b: { cop: 6.01, iplv: 9.26 } },
  ],
  agua_centrifugo: [
    { ate_tr: 150, a: { cop: 5.77, iplv: 6.39 }, b: { cop: 5.06, iplv: 7.99 } }, { ate_tr: 300, a: { cop: 5.77, iplv: 6.39 }, b: { cop: 5.54, iplv: 8.79 } },
    { ate_tr: 400, a: { cop: 6.28, iplv: 6.76 }, b: { cop: 5.91, iplv: 9.02 } }, { ate_tr: Infinity, a: { cop: 6.28, iplv: 7.03 }, b: { cop: 6.01, iplv: 9.26 } },
  ],
};
const TIPOS_CHILLER = {
  ar: { rotulo: 'Condensação a ar (scroll/parafuso)', tabela: 'ar', condensacao: 'ar' },
  agua_parafuso: { rotulo: 'Condensação a água — parafuso/scroll', tabela: 'agua_deslocamento', condensacao: 'agua' },
  agua_centrifugo: { rotulo: 'Condensação a água — centrífugo', tabela: 'agua_centrifugo', condensacao: 'agua' },
};

// ── Hidráulica (pré-dimensionamento, substituir pelo traçado e catálogos) [CONFERIR] ──
const HIDRAULICA = {
  dp_evaporador_mca: 5, dp_condensador_mca: 6, casa_maquinas_mca: 5, perda_rede_pa_m: 250, fator_singularidades: 1.5,
  dp_serpentina_mca: 4, dp_valvula_mca: 3, torre_mca: 6, rendimento_bomba: 0.7, folga_motor: 1.15,
  v_max_tubo_ms: 2.4, comprimento_rede_m: null,
};
// Tubo de aço carbono Sch 40 — diâmetro interno (mm) por diâmetro nominal [CONFERIR ASME B36.10 / NBR 5590]
const TUBOS_SCH40 = [['1"', 26.6], ['1 1/4"', 35.1], ['1 1/2"', 40.9], ['2"', 52.5], ['2 1/2"', 62.7], ['3"', 77.9], ['4"', 102.3], ['5"', 128.2], ['6"', 154.1], ['8"', 202.7], ['10"', 254.5], ['12"', 303.2]];

// ── Ar: insuflamento, AHU, VAV e dutos (pré-dimensionamento) [CONFERIR] ──────
const AR = {
  delta_t_insuflamento: 10, // K entre ambiente e insuflamento
  dp_serpentina_pa: 150, dp_filtros_pa: 250, dp_retorno_pa: 50, dp_difusor_pa: 25, dp_caixa_vav_pa: 25,
  efeito_sistema: 0.10, rendimento_ventilador: 0.65, folga_motor: 1.15,
  k_curva: 0.3, k_derivacao: 0.5,
  perda_alvo_pa_m: 1.0, v_max_principal_ms: 8, v_max_ramal_ms: 5, altura_max_duto_m: 0.4,
  vazao_difusor_m3h: 540, area_por_difusor_m2: 25, vazao_grelha_retorno_m3h: 900,
  // VAV: fração mínima controlável da caixa e Zpz alvo (Voz ÷ vazão mínima) para a Ev do
  // sistema não despencar — critério H&M [CONFERIR fabricante / ASHRAE 62.1]
  vav_fracao_minima: 0.2, vav_v_entrada_max_ms: 10, zpz_alvo: 0.55,
};
// Caixa VAV: diâmetros de entrada comerciais (m) [CONFERIR fabricante]
const VAV_ENTRADAS_M = [0.15, 0.2, 0.25, 0.3, 0.35, 0.4];
// ASHRAE 90.1, 6.5.2.1 (reaquecimento na vazão mínima) — limite de memória: a maior entre
// 20 % da vazão de pico e a vazão de ar externo da zona (edição 2016+; era 30 % antes)
// [CONFERIR ASHRAE 90.1 6.5.2.1 na edição adotada]
const LIMITE_REAQUECIMENTO_90_1 = 0.2;
// Classe mínima de filtragem (NBR 16401-3, Tabela 5, nível 1 de conforto: G4 + F7?) [CONFERIR NBR 16401-3];
// tomada de ar externo com G1 no mínimo — Portaria 3.523, art. 5º e (conferido)
const FILTRAGEM = { ar_externo_min: 'G1 (Portaria 3.523, art. 5º e)', recomendada: 'G4 + F7 [CONFERIR NBR 16401-3 Tabela 5]' };

// ── Qualidade do ar interior — critérios da vistoria ──────────────────────
// nbr17037: valores do comunicado ABRAVA de 05/08/2024 (norma não lida) [CONFERIR NBR 17037]
// re09: RE 09/2003 da ANVISA — valores de memória [CONFERIR RE 09/2003]
const CRITERIOS_QAI = {
  nbr17037: { rotulo: 'ABNT NBR 17037 (substitui os padrões da RE 09/2003)', co2_acima_externo_ppm: 700, co2_max_ppm: null, t: [21, 26], ur: [35, 65], v_max: 0.20, pm10: 50, pm25: 25 },
  re09: { rotulo: 'ANVISA RE 09/2003', co2_acima_externo_ppm: null, co2_max_ppm: 1000, t: [23, 26], ur: [40, 65], v_max: 0.25, aerodispersoides: 80, fungos_ufc_m3: 750, ie_max: 1.5 },
};
// Vazão medida por difusor: tolerância ±10 % da de projeto [CONFERIR NBR 16401-1 / procedimento de TAB]
const TOLERANCIA_VAZAO = 0.10;
// ΔT de água gelada medido ≥ 80 % do de projeto (critério H&M de vistoria) [CONFERIR]
const FRACAO_DT_AGUA = 0.8;

// ── PMOC — rotinas por tipo de equipamento ─────────────────────────────────
// Periodicidade: D diária, M mensal, T trimestral, S semestral, A anual. Rotinas
// típicas no espírito do Anexo I da Portaria 3.523/1998 e da ABNT NBR 13971 — o Anexo I
// e a NBR 13971 NÃO foram lidos: as periodicidades são critério H&M [CONFERIR].
const PERIODICIDADES = { D: 'Diária', M: 'Mensal', T: 'Trimestral', S: 'Semestral', A: 'Anual' };
const MESES_DA_PERIODICIDADE = { D: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], M: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], T: [1, 4, 7, 10], S: [1, 7], A: [1] };
const ROTINAS_PMOC = {
  split: [
    ['Limpar ou trocar os filtros de ar da evaporadora', 'M'], ['Limpar a bandeja de condensado e testar o dreno (sem acúmulo de água)', 'M'],
    ['Verificar ruído, vibração e fixação da evaporadora e da condensadora', 'M'], ['Medir as temperaturas de insuflamento e de retorno', 'M'],
    ['Higienizar a serpentina e a turbina da evaporadora com produto registrado no MS (Portaria 3.523, art. 5º a/b)', 'S'],
    ['Limpar a serpentina da condensadora', 'T'], ['Medir tensão e corrente do compressor e conferir aperto das conexões elétricas', 'S'],
    ['Verificar o isolamento térmico e a fixação da tubulação frigorígena', 'S'], ['Verificar pressões/superaquecimento e vazamentos de refrigerante', 'S'],
  ],
  vrf_evap: [
    ['Limpar ou trocar os filtros de ar da unidade interna', 'M'], ['Limpar a bandeja de condensado e testar o dreno/bomba de dreno', 'M'],
    ['Higienizar serpentina e ventilador com produto registrado no MS', 'S'], ['Conferir comunicação, alarmes e histórico de falhas no controle', 'M'],
  ],
  vrf_cond: [
    ['Limpar a serpentina da unidade externa', 'T'], ['Verificar ruído, vibração, fixação e base antivibração', 'M'],
    ['Ler pressões, temperaturas e falhas no software de diagnóstico do fabricante', 'S'], ['Medir tensão/corrente e reapertar conexões elétricas', 'S'],
    ['Teste de vazamento de refrigerante nas juntas e derivações acessíveis', 'A'],
  ],
  self: [
    ['Verificar a pressão diferencial dos filtros e trocar quando necessário', 'M'], ['Limpar a bandeja de condensado e testar o dreno com sifão', 'M'],
    ['Verificar correias, polias e rolamentos do ventilador', 'M'], ['Higienizar a serpentina evaporadora', 'S'], ['Limpar o condensador', 'T'],
    ['Medir tensão/corrente dos compressores e do ventilador', 'S'], ['Verificar pressões e vazamentos de refrigerante', 'S'],
  ],
  fancoil: [
    ['Verificar a pressão diferencial dos filtros (pressostato) e trocar quando necessário', 'M'], ['Limpar a bandeja de condensado, conferir o sifão e o dreno', 'M'],
    ['Verificar correias, polias, rolamentos e vibração do ventilador', 'M'], ['Inspecionar a caixa de mistura: livre de materiais e objetos (Portaria 3.523, art. 5º d)', 'M'],
    ['Higienizar a serpentina de água gelada', 'S'], ['Conferir a abertura do damper de ar externo e a vazão mínima', 'T'],
    ['Testar a válvula de controle de água gelada e os sensores de temperatura', 'T'], ['Medir tensão/corrente do motor e reapertar conexões', 'S'],
    ['Medir a vazão de ar insuflado (balanceamento)', 'A'],
  ],
  vav: [['Conferir o controle de vazão (mínima e máxima) e a calibração do sensor de fluxo', 'S'], ['Testar o reaquecimento e o atuador do damper', 'S']],
  chiller: [
    ['Registrar temperaturas e pressões de operação (planilha de operação)', 'D'], ['Verificar vazamentos de refrigerante e de óleo', 'M'],
    ['Conferir as vazões e o ΔT da água gelada e de condensação', 'M'], ['Reapertar conexões elétricas e medir tensões, correntes e isolamento', 'S'],
    ['Análise do óleo do compressor', 'A'], ['Limpeza dos tubos do condensador (condensação a água) ou das serpentinas (a ar)', 'A'],
    ['Calibrar sensores e testar as proteções e intertravamentos (fluxostato)', 'A'],
  ],
  torre: [
    ['Conferir o tratamento químico da água (controle microbiológico, incrustação e corrosão)', 'M'], ['Limpar a bacia e o enchimento', 'T'],
    ['Verificar o ventilador, as correias/redutor e o eliminador de gotas', 'M'], ['Limpeza e desinfecção completas da torre', 'S'],
  ],
  bomba: [
    ['Verificar ruído, vibração, temperatura dos mancais e vazamento no selo', 'M'], ['Lubrificar os mancais (quando aplicável)', 'T'],
    ['Conferir o alinhamento motor–bomba e a base', 'S'], ['Medir tensão/corrente do motor e reapertar conexões', 'S'],
  ],
  exaustor: [['Verificar ruído, vibração e correias', 'M'], ['Limpar as pás/rotor e a veneziana', 'T'], ['Medir tensão/corrente do motor', 'S']],
  geral: [
    ['Inspecionar e limpar a tomada de ar externo e o filtro G1 (Portaria 3.523, art. 5º e)', 'M'],
    ['Limpar difusores, grelhas e venezianas', 'T'], ['Inspecionar o interior dos dutos (sujidade, umidade, isolamento) e limpar quando necessário', 'A'],
    ['Análise da qualidade do ar interior por laboratório acreditado (NBR 17037: semestral, com amostra externa)', 'S'],
    ['Divulgar aos ocupantes os procedimentos e resultados do PMOC (Portaria 3.523, art. 6º d)', 'S'],
    ['Registrar cada execução do PMOC e manter o registro disponível (Portaria 3.523, art. 6º c)', 'M'],
  ],
};
const TIPOS_EQUIPAMENTO = {
  split: 'Split (evaporadora + condensadora)', vrf_evap: 'VRF — unidade interna', vrf_cond: 'VRF — unidade externa', self: 'Self-contained / rooftop',
  fancoil: 'Fancoil / AHU', vav: 'Caixa VAV', chiller: 'Chiller', torre: 'Torre de resfriamento', bomba: 'Bomba de água', exaustor: 'Exaustor / ventilador',
};

module.exports = {
  W_POR_TR, BTUH_POR_W, KCALH_POR_W, CP_AR_SECO, CP_VAPOR, H_VAPORIZACAO, RHO_AGUA, CP_AGUA, G,
  EXTERNO_PADRAO, INTERNO_PADRAO, RSE, IRRADIANCIA_PICO, ORIENTACOES, ABSORTANCIA, CONSTRUCOES, FRACAO_DT_DIVISA,
  ATIVIDADES, ILUMINACAO_PADRAO_W_M2, EQUIPAMENTOS_PADRAO_W_M2, ATIVIDADE_DO_USO, EZ, RENOVACAO_MINIMA_M3H_PESSOA, EV_POR_ZPZ,
  SISTEMAS, CRITERIO_SISTEMA, SPLIT_BTUH, VRF_EVAP_KW, VRF_COND_KW, VRF_MODULOS_MAX, VRF_COMBINACAO, SELF_TR, CHILLER_TR,
  COP_TIPICO, FP_EQUIPAMENTO, IPLV_PESOS, AGUA_GELADA_PADRAO, CONDENSACAO_PADRAO, W_POR_TR_TORRE, MIN_CHILLER_90_1, TIPOS_CHILLER,
  HIDRAULICA, TUBOS_SCH40, AR, VAV_ENTRADAS_M, LIMITE_REAQUECIMENTO_90_1, FILTRAGEM, CRITERIOS_QAI, TOLERANCIA_VAZAO, FRACAO_DT_AGUA,
  PERIODICIDADES, MESES_DA_PERIODICIDADE, ROTINAS_PMOC, TIPOS_EQUIPAMENTO,
};
