// BDI pela fórmula do TCU (versão 2.0, Fase 3F).
//
// O mesmo NÚCLEO (entre as marcas abaixo) existe em frontend/src/utils/bdiTcu.js:
// o calculador da tela e o servidor (PDF, validação da memória) usam a mesma
// conta. O teste testes/bdiCurvaAbc.test.js confere que os dois núcleos são
// idênticos — mudou aqui, copie para lá.

// ==== INÍCIO DO NÚCLEO COMPARTILHADO (bdiTcu) ====
// Fórmula do Acórdão 2.622/2013-TCU-Plenário:
//   BDI = [ (1 + AC + S + R + G) × (1 + DF) × (1 + L) / (1 − I) ] − 1
// AC administração central, S seguro, R risco, G garantia, DF despesas
// financeiras, L lucro, I tributos sobre o preço (PIS, COFINS, ISS e, no regime
// desonerado, a CPRB). A tabela do TCU publica seguro e garantia JUNTOS
// ("Seguro + Garantia"), por isso aqui é uma parcela só (sg = S + G) — na
// fórmula eles já entram somados.
//
// FONTE da tabela: Acórdão nº 2622/2013 – TCU – Plenário, TC 036.076/2011-2,
// sessão de 25/9/2013, relator Min.-Subst. Marcos Bemquerer Costa — item 9.1
// (BDI por tipo de obra e BDI de mero fornecimento) e item 9.2.1 (parcelas).
// Conferido no texto do acórdão (código de autenticidade TCU 50445565), cópia
// em https://www.editais.uff.br/sites/default/files/arquivos/Base%20BDI%20-%20Ac%C3%B3rd%C3%A3o-2622-2013.pdf
// Cada faixa é [1º quartil, médio, 3º quartil], em %.
const FONTE_BDI_TCU = 'Acórdão 2.622/2013-TCU-Plenário (TC 036.076/2011-2), itens 9.1 e 9.2.1';

const TIPOS_OBRA_TCU = [
  {
    id: 'edificios', nome: 'Construção de edifícios',
    bdi: [20.34, 22.12, 25.00],
    ac: [3.00, 4.00, 5.50], sg: [0.80, 0.80, 1.00], r: [0.97, 1.27, 1.27], df: [0.59, 1.23, 1.39], l: [6.16, 7.40, 8.96],
  },
  {
    id: 'rodovias_ferrovias', nome: 'Construção de rodovias e ferrovias',
    bdi: [19.60, 20.97, 24.23],
    ac: [3.80, 4.01, 4.67], sg: [0.32, 0.40, 0.74], r: [0.50, 0.56, 0.97], df: [1.02, 1.11, 1.21], l: [6.64, 7.30, 8.69],
  },
  {
    id: 'saneamento', nome: 'Construção de redes de abastecimento de água, coleta de esgoto e construções correlatas',
    bdi: [20.76, 24.18, 26.44],
    ac: [3.43, 4.93, 6.71], sg: [0.28, 0.49, 0.75], r: [1.00, 1.39, 1.74], df: [0.94, 0.99, 1.17], l: [6.74, 8.04, 9.40],
  },
  {
    id: 'energia', nome: 'Construção e manutenção de estações e redes de distribuição de energia elétrica',
    bdi: [24.00, 25.84, 27.86],
    ac: [5.29, 5.92, 7.93], sg: [0.25, 0.51, 0.56], r: [1.00, 1.48, 1.97], df: [1.01, 1.07, 1.11], l: [8.00, 8.31, 9.51],
  },
  {
    id: 'portuarias', nome: 'Obras portuárias, marítimas e fluviais',
    bdi: [22.80, 27.48, 30.95],
    ac: [4.00, 5.52, 7.85], sg: [0.81, 1.22, 1.99], r: [1.46, 2.32, 3.16], df: [0.94, 1.02, 1.33], l: [7.14, 8.40, 10.43],
  },
];

// BDI diferenciado (reduzido) para itens de MERO FORNECIMENTO de materiais e
// equipamentos — mesmo acórdão, item 9.1 (BDI) e 9.2.1 (parcelas). O TCU
// (Súmula 253 e o próprio acórdão) pede BDI reduzido quando o fornecimento é
// relevante e pode ser contratado à parte; a decisão é caso a caso.
const FORNECIMENTO_TCU = {
  id: 'fornecimento', nome: 'Mero fornecimento de materiais e equipamentos (BDI diferenciado)',
  bdi: [11.10, 14.02, 16.80],
  ac: [1.50, 3.45, 4.49], sg: [0.30, 0.48, 0.82], r: [0.56, 0.85, 0.89], df: [0.85, 0.85, 1.11], l: [3.50, 5.11, 6.22],
};

// Tributos sobre o preço (I). O acórdão manda usar o ISS do município da obra
// (entre 2 % e 5 %, LC 116/2003 art. 8º II e ADCT art. 88 — item 9.3.2.3), e
// PIS/COFINS efetivos (item 9.3.2.4). PIS 0,65 % e COFINS 3,00 % são os do
// regime cumulativo (lucro presumido) — os mesmos dos demonstrativos de BDI
// publicados pelos órgãos. Empresa do Simples Nacional usa as alíquotas do
// Anexo IV da LC 123/2006 (item 9.3.2.5): digite-as nas parcelas.
// ISS padrão 2,00 % [CONFERIR]: alíquota do DF para obras (LC 116, subitem
// 7.02) segundo fonte não oficial (focotributario.com.br) — confirme na
// legislação do município da obra e ajuste a base de cálculo se houver
// dedução de materiais.
// Reforma tributária (EC 132/2023, LC 214/2025): em 2026 a CBS (0,9 %) e o IBS
// (0,1 %) são de teste e compensáveis com PIS/COFINS — não entram aqui.
// [CONFERIR] a partir de 2027.
const TRIBUTOS_PADRAO = { pis: 0.65, cofins: 3.00, iss: 2.00, iss_base: 100 };

// CPRB — contribuição previdenciária sobre a receita bruta, só no regime
// DESONERADO (a empresa trocou os 20 % do INSS patronal sobre a folha por um
// percentual da receita). Construção civil (CNAE 412, 432, 433 e 439 —
// inclui instalações elétricas, 4321-5): 4,5 % (Lei 12.546/2011, art. 7º, VII
// e art. 7º-A, redação da Lei 13.161/2015). A Lei 14.973/2024 reonera aos
// poucos: em 2025 vale 80 % da alíquota (3,6 %), em 2026 60 % (2,7 %), em 2027
// 40 % (1,8 %) e a CPRB acaba em 2028 — com a contribuição sobre a folha
// voltando na proporção inversa (5 %, 10 %, 15 %), que vai para os ENCARGOS
// SOCIAIS da mão de obra, não para o BDI. [CONFERIR] o texto da lei no
// Planalto (cronograma conferido em Felsberg Advogados e Sienge, 2026).
const CPRB_CONSTRUCAO = 4.5;
const FATOR_CPRB_POR_ANO = { 2025: 0.8, 2026: 0.6, 2027: 0.4 };
function aliquotaCprb(ano) {
  const a = Number(ano);
  if (!Number.isFinite(a) || a <= 2024) return CPRB_CONSTRUCAO;
  if (a >= 2028) return 0;
  return Math.round(CPRB_CONSTRUCAO * FATOR_CPRB_POR_ANO[a] * 100) / 100;
}

const REGIMES_BDI = {
  nao_desonerado: 'Não desonerado (INSS de 20 % sobre a folha)',
  desonerado: 'Desonerado (CPRB sobre a receita bruta)',
};

const PARCELAS_BDI = [
  ['ac', 'Administração central (AC)'],
  ['sg', 'Seguro + garantia (S + G)'],
  ['r', 'Risco (R)'],
  ['df', 'Despesas financeiras (DF)'],
  ['l', 'Lucro (L)'],
];
const TRIBUTOS_BDI = [
  ['pis', 'PIS'],
  ['cofins', 'COFINS'],
  ['iss', 'ISS'],
  ['cprb', 'CPRB (desonerado)'],
];

const arred2Bdi = (v) => Math.round((Number(v) + Number.EPSILON) * 100) / 100;
const numBdi = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

function referenciaTcu(tipoId) {
  if (tipoId === FORNECIMENTO_TCU.id) return FORNECIMENTO_TCU;
  return TIPOS_OBRA_TCU.find(t => t.id === tipoId) || null;
}

// I em %: PIS + COFINS + ISS × base + CPRB (só no desonerado)
function tributosBdi(p, regime) {
  const base = p.iss_base == null || p.iss_base === '' ? 100 : numBdi(p.iss_base);
  return numBdi(p.pis) + numBdi(p.cofins) + numBdi(p.iss) * (base / 100) + (regime === 'desonerado' ? numBdi(p.cprb) : 0);
}

// BDI em % (sem arredondar), ou null se I ≥ 100 %. Parcelas em %.
function calcularBdiTcu(p, regime) {
  const i = tributosBdi(p, regime) / 100;
  if (!(i < 1)) return null;
  const v = ((1 + (numBdi(p.ac) + numBdi(p.sg) + numBdi(p.r)) / 100) * (1 + numBdi(p.df) / 100) * (1 + numBdi(p.l) / 100)) / (1 - i) - 1;
  return v * 100;
}

// Parcelas pré-preenchidas com o valor MÉDIO da tabela e os tributos padrão.
// Fornecimento de material não paga ISS (não é serviço) — ISS 0.
function sugestaoBdi(tipoId, regime, ano) {
  const ref = referenciaTcu(tipoId) || TIPOS_OBRA_TCU[0];
  const p = {};
  for (const [k] of PARCELAS_BDI) p[k] = ref[k][1];
  p.pis = TRIBUTOS_PADRAO.pis;
  p.cofins = TRIBUTOS_PADRAO.cofins;
  p.iss = ref.id === FORNECIMENTO_TCU.id ? 0 : TRIBUTOS_PADRAO.iss;
  p.iss_base = TRIBUTOS_PADRAO.iss_base;
  p.cprb = regime === 'desonerado' ? aliquotaCprb(ano) : 0;
  return p;
}

// Avisos de faixa (1º–3º quartil). O BDI comparado com a faixa é o SEM a CPRB:
// os quartis do acórdão (2013) vêm de orçamentos sem desoneração, então a CPRB
// soma por cima da faixa [interpretação — CONFERIR com o órgão contratante].
function avaliarBdi(p, regime, tipoId) {
  const ref = referenciaTcu(tipoId);
  const avisos = [];
  if (!ref) return avisos;
  const fmt = (n) => String(arred2Bdi(n)).replace('.', ',');
  for (const [k, nome] of PARCELAS_BDI) {
    const v = numBdi(p[k]);
    const [q1, , q3] = ref[k];
    if (v < q1 - 1e-9 || v > q3 + 1e-9) avisos.push({ parcela: k, texto: `${nome} = ${fmt(v)} % está fora da faixa do TCU (${fmt(q1)} % a ${fmt(q3)} %)` });
  }
  const semCprb = calcularBdiTcu({ ...p, cprb: 0 }, 'nao_desonerado');
  if (semCprb != null) {
    const [q1, , q3] = ref.bdi;
    if (semCprb < q1 - 1e-9 || semCprb > q3 + 1e-9) {
      avisos.push({ parcela: 'bdi', texto: `BDI${regime === 'desonerado' ? ' sem a CPRB' : ''} = ${fmt(semCprb)} % está fora da faixa do TCU para "${ref.nome}" (${fmt(q1)} % a ${fmt(q3)} %)` });
    }
  }
  return avisos;
}

// Limpa a memória do cálculo vinda da tela antes de gravar (coluna JSONB
// propostas.bdi_memoria): só os campos conhecidos, números entre 0 e 100, e o
// BDI RECALCULADO aqui a partir das parcelas — não o que veio pronto.
// Devolve null quando não há memória (ou ela é inválida).
function limparParcelasBdi(p, regime) {
  if (!p || typeof p !== 'object') return null;
  const out = {};
  for (const k of ['ac', 'sg', 'r', 'df', 'l', 'pis', 'cofins', 'iss', 'iss_base', 'cprb']) {
    const n = k === 'iss_base' && (p[k] == null || p[k] === '') ? 100 : Number(p[k] ?? 0);
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    out[k] = arred2Bdi(n);
  }
  if (regime !== 'desonerado') out.cprb = 0;
  const bdi = calcularBdiTcu(out, regime);
  if (bdi == null || bdi < 0 || bdi > 999.99) return null;
  return { parcelas: out, bdi: arred2Bdi(bdi) };
}

function normalizarMemoriaBdi(m) {
  if (!m || typeof m !== 'object') return null;
  const regime = m.regime === 'desonerado' ? 'desonerado' : 'nao_desonerado';
  const tipo = TIPOS_OBRA_TCU.some(t => t.id === m.tipo_obra) ? m.tipo_obra : null;
  if (!tipo) return null;
  const principal = limparParcelasBdi(m.parcelas, regime);
  if (!principal) return null;
  let materiais = null;
  if (m.materiais && typeof m.materiais === 'object') {
    materiais = limparParcelasBdi(m.materiais.parcelas, regime);
    if (!materiais) return null;
  }
  const ano = Number.isInteger(Number(m.ano_cprb)) ? Number(m.ano_cprb) : null;
  return {
    versao: 1,
    fonte: FONTE_BDI_TCU,
    tipo_obra: tipo,
    regime,
    ano_cprb: ano,
    parcelas: principal.parcelas,
    bdi: principal.bdi,
    materiais,
    calculado_em: typeof m.calculado_em === 'string' && m.calculado_em.length <= 40 ? m.calculado_em : null,
  };
}
// ==== FIM DO NÚCLEO COMPARTILHADO (bdiTcu) ====

module.exports = {
  FONTE_BDI_TCU, TIPOS_OBRA_TCU, FORNECIMENTO_TCU, REGIMES_BDI, PARCELAS_BDI,
  aliquotaCprb, referenciaTcu, tributosBdi, calcularBdiTcu, sugestaoBdi, avaliarBdi, normalizarMemoriaBdi,
};
