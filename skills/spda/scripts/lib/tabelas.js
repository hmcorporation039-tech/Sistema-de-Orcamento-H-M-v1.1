// Tabelas da ABNT NBR 5419:2026 usadas nos cálculos.
//
// Cada valor vem do texto da norma (partes 2 e 3, edição de 2026), com a
// tabela de origem anotada. As chaves são as mesmas do arquivo de dados da
// obra (ver referencia/esquema-dados.md). Não altere um valor sem conferir na
// norma: o laudo cita a tabela de onde cada fator saiu.

// ── NBR 5419-2:2026, Anexo A ────────────────────────────────────────────────

// Tabela A.1 — fator de localização da estrutura CD
const CD = {
  cercada_mais_altos: 0.25,   // cercada por objetos significativamente mais altos
  cercada_mesma_altura: 0.5,  // cercada por objetos da mesma altura ou ligeiramente mais baixos
  isolada: 1,                 // nenhum objeto nas vizinhanças ou objetos significativamente mais baixos
  topo_colina: 2,             // isolada no topo de colina ou monte
};

// Tabela A.2 — fator de instalação da linha CI
const CI = {
  aerea: 1,
  enterrada: 0.5,
  enterrada_malha: 0.01, // enterrada dentro dos limites de um eletrodo em malha (NBR 5419-4, 5.2)
};

// Tabela A.3 — fator do tipo de linha CT
const CT = {
  bt_ou_sinal: 1,  // energia em BT ou linha de sinal
  at_trafo: 0.2,   // energia em AT com transformador AT/BT de enrolamentos separados
};

// Tabela A.4 — fator ambiental da linha CE
const CE = {
  rural: 1,
  suburbano: 0.5,
  urbano: 0.1,
  urbano_alto: 0.01, // urbano com estruturas acima de 20 m
};

// ── NBR 5419-2:2026, Anexo B ────────────────────────────────────────────────

// Tabela B.1 — PTA (medidas adicionais contra toque e passo); várias medidas → produto
const PTA = {
  nenhuma: 1,
  avisos: 0.1,
  isolacao: 0.01,         // ≥ 3 mm de XLPE nas descidas expostas (só toque)
  malha_solo: 0.01,       // malha de equipotencialização do solo (só passo)
  descida_natural: 0.001, // estrutura metálica contínua ou concreto armado como descida natural
  restricoes: 0,          // restrições físicas fixas
};

// Tabela B.2 — PB conforme o NP do SPDA
const PB = {
  nenhum: 1,
  IV: 0.2,
  III: 0.1,
  II: 0.05,
  I: 0.02,
  I_descida_natural: 0.01,        // captação NP I + descida natural que atende 8.1.2 b) da parte 3
  cobertura_metalica_natural: 0.001, // cobertura metálica como captação natural + descida natural
};

// Tabela B.3 (PSPD) e Tabela B.7 (PEB) — mesmos valores por NP dos DPS.
// "melhor_I" e "melhor_I_max" são os dois extremos da faixa 0,005–0,001
// (DPS com características melhores que as exigidas para NP I — justificar
// com dados do fabricante).
const PSPD = {
  nenhum: 1,
  'III-IV': 0.05,
  II: 0.02,
  I: 0.01,
  melhor_I: 0.005,
  melhor_I_max: 0.001,
};
const PEB = PSPD;

// Tabela B.4 — CLD e CLI conforme blindagem/aterramento da linha externa
const CLD_CLI = {
  aerea_nao_blindada: { cld: 1, cli: 1 },
  enterrada_nao_blindada: { cld: 1, cli: 1 },
  neutro_multiaterrado: { cld: 1, cli: 0.2 },
  enterrada_blindada_nao_ligada: { cld: 1, cli: 0.3 },
  aerea_blindada_nao_ligada: { cld: 1, cli: 0.1 },
  blindada_ligada_bep: { cld: 1, cli: 0 },
  duto_protecao: { cld: 0, cli: 0 },   // cabo de proteção, duto/eletroduto metálico ligado ao BEP
  fibra_optica: { cld: 0, cli: 0 },    // sem linha externa ou linha não metálica
  interface_isolante: { cld: 0, cli: 0 },
};

// Tabela B.5 — KS3 conforme a fiação interna
const KS3 = {
  sem_preocupacao: 1,
  evitando_lacos_grandes: 0.5,
  evitando_lacos_medios: 0.2,
  evitando_lacos_pequenos: 0.01,
  blindado: 0.0001, // cabos blindados ou em conduto metálico ligado nas duas pontas
};

// Tabela B.6 — PTU (medidas contra toque por descarga na linha); várias → produto
const PTU = {
  nenhuma: 1,
  avisos: 0.1,
  isolacao: 0.01,
  restricoes: 0,
};

// Tabela B.8 — PLD conforme a blindagem (RS) e a suportabilidade UW (kV)
const PLD_UW = [0.35, 0.5, 1, 1.5, 2.5, 4, 6];
const PLD = {
  nao_blindada: [1, 1, 1, 1, 1, 1, 1], // ou blindagem não ligada à referência do equipamento
  rs_5_20: [1, 1, 1, 1, 0.95, 0.9, 0.8],
  rs_1_5: [1, 1, 0.9, 0.8, 0.6, 0.3, 0.1],
  rs_ate_1: [1, 0.85, 0.6, 0.4, 0.2, 0.04, 0.02],
};

// Tabela B.9 — PLI conforme o tipo de linha e UW (kV)
const PLI_UW = [1, 1.5, 2.5, 4, 6];
const PLI = {
  energia: [1, 0.6, 0.3, 0.16, 0.1],
  sinal: [1, 0.5, 0.2, 0.08, 0.04],
};

// ── NBR 5419-2:2026, Anexo C ────────────────────────────────────────────────

// Tabela C.2 — LT, LF e LO por tipo de estrutura (perda L1)
const LT = 0.01;
const OCUPACAO = {
  // chave: { LF, LO, descricao }
  explosao: { LF: 0.1, LO: 0.1, descricao: 'Risco de explosão' },
  hospital_uti_cc: { LF: 0.1, LO: 0.01, descricao: 'Hospital — UTI e bloco cirúrgico' },
  hospital_geral: { LF: 0.1, LO: 0.001, descricao: 'Hospital — outras partes' },
  hotel_escola_civico: { LF: 0.1, LO: 0, descricao: 'Hotel, escola, edifício cívico' },
  entretenimento_igreja_museu: { LF: 0.05, LO: 0, descricao: 'Entretenimento público, igreja, museu' },
  industrial_comercial: { LF: 0.02, LO: 0, descricao: 'Industrial, comercial' },
  outros: { LF: 0.01, LO: 0, descricao: 'Outros (residencial etc.)' },
};

// Tabela C.3 — rt conforme o piso/solo
const RT_PISO = {
  terra_concreto: 0.01,
  marmore_ceramica: 0.001,
  brita_carpete: 0.0001,
  asfalto_linoleo_madeira: 0.00001,
};

// Tabela C.4 — rp conforme as providências contra incêndio (adotar o menor aplicável)
const RP = {
  nenhuma: 1,   // também para zona com risco de explosão
  manual: 0.5,  // extintores, hidrantes, alarme manual, compartimentação, rotas de escape
  automatica: 0.2, // instalação fixa automática ou alarme automático (protegidos contra surtos)
};

// Tabela C.5 — rf conforme o risco de incêndio ou explosão
const RF = {
  explosao_zona_0_20: 1,
  explosao_zona_1_21: 0.1,
  explosao_zona_2_22: 0.001,
  incendio_alto: 0.1,    // ≥ 800 MJ/m² ou materiais/cobertura combustíveis
  incendio_normal: 0.01, // 400 a 800 MJ/m²
  incendio_baixo: 0.001, // < 400 MJ/m²
  nenhum: 0,
};

// Tabela C.6 — hz (perigo especial)
const HZ = {
  nenhum: 1,
  panico_baixo: 2,           // até 2 andares e ≤ 100 pessoas
  panico_medio: 5,           // eventos de 100 a 1 000 pessoas
  dificuldade_evacuacao: 5,  // pessoas imobilizadas, hospitais
  panico_alto: 10,           // eventos com mais de 1 000 pessoas
};

// Tabela C.7 — rs conforme o tipo de construção
const RS = {
  simples: 2,          // madeira ou alvenaria simples
  concreto_armado: 1,  // robusta: metálica ou concreto armado
  metalica: 1,
};

// Tabela C.9 — LF para perda de patrimônio cultural (L3)
const LF_L3 = 0.1;

// Tabela 4 — riscos toleráveis
const RT_TOLERAVEL = { R1: 1e-5, R3: 1e-4 };

// 7.3.4 — frequência tolerável de danos
const FT = { critico: 0.1, nao_critico: 1 };

// ── NBR 5419-3:2026 ─────────────────────────────────────────────────────────

// Tabela 2 — raio da esfera rolante e módulo máximo da malha; Tabela 5 —
// distância entre descidas; Tabela 11 — ki
const NIVEL = {
  I: { raio: 20, malha: 5, descidas: 10, ki: 0.08 },
  II: { raio: 30, malha: 10, descidas: 10, ki: 0.06 },
  III: { raio: 45, malha: 15, descidas: 15, ki: 0.04 },
  IV: { raio: 60, malha: 20, descidas: 20, ki: 0.04 },
};

// Tabela 12 — km
const KM = { ar: 1, solido: 0.5 };

// Tabela 13 — kc simplificado conforme o número de descidas
function kcSimplificado(nDescidas) {
  if (nDescidas <= 1) return 1;
  if (nDescidas === 2) return 0.66;
  return 0.44;
}

// Figura 3 e equações 1a/1b — comprimento mínimo l1 do eletrodo (m)
function comprimentoMinimoEletrodo(np, resistividade) {
  if (np === 'III' || np === 'IV') return 5; // independe da resistividade (nota 1)
  if (resistividade == null) return null;    // NP I/II exigem a resistividade do solo
  if (np === 'I') return Math.max(5, 0.03 * resistividade - 10);
  if (np === 'II') return Math.max(5, 0.02 * resistividade - 11);
  return null;
}

// Tabelas 7 e 8 — materiais de captação/descida e de aterramento mais usados
const MATERIAIS_CAPTACAO = {
  cobre_35: { descricao: 'cobre nu 35 mm²', secao: 35 },
  aluminio_70: { descricao: 'alumínio 70 mm²', secao: 70 },
  aco_galvanizado_50: { descricao: 'aço zincado a quente 50 mm²', secao: 50 },
  aco_cobreado_35: { descricao: 'aço cobreado 35 mm²', secao: 35 },
};
const MATERIAIS_ATERRAMENTO = {
  cobre_50: { descricao: 'cobre nu 50 mm²', secao: 50 },
  aco_galvanizado_90: { descricao: 'fita de aço zincado a quente 90 mm² (3 mm)', secao: 90 },
  aco_cobreado_50: { descricao: 'aço cobreado 50 mm²', secao: 50 },
};

// Tabelas 9 e 10 — seções mínimas de equipotencialização (mm²)
const EQUIPOTENCIALIZACAO = {
  entre_barras_nao_enterrado: { cobre: 16, aluminio: 25, aco_galvanizado: 50 },
  instalacoes_internas: { cobre: 6, aluminio: 10, aco_galvanizado: 16 },
};

// 7.3.2 f) — intervalo entre inspeções periódicas (anos)
function intervaloInspecao({ servico_essencial, area_classificada, corrosao_severa, explosivos }) {
  return (servico_essencial || area_classificada || corrosao_severa || explosivos) ? 1 : 3;
}

module.exports = {
  CD, CI, CT, CE, PTA, PB, PSPD, PEB, CLD_CLI, KS3, PTU, PLD, PLD_UW, PLI, PLI_UW,
  LT, OCUPACAO, RT_PISO, RP, RF, HZ, RS, LF_L3, RT_TOLERAVEL, FT,
  NIVEL, KM, kcSimplificado, comprimentoMinimoEletrodo,
  MATERIAIS_CAPTACAO, MATERIAIS_ATERRAMENTO, EQUIPOTENCIALIZACAO, intervaloInspecao,
};
