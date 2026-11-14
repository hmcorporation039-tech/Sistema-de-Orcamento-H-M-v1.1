// Tabelas da ABNT NBR 5410:2004 (versão corrigida 2008) usadas no cálculo.
// Capacidades de condução (Tabelas 36 a 39, cobre) foram lidas direto do texto
// da norma para dados/capacidade_conducao_cobre.json.

const CAP = require('./dados/capacidade_conducao_cobre.json');

const SECOES = [0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630, 800, 1000];

// Colunas das Tabelas 36/37 (métodos A1 a D, 2 ou 3 condutores carregados)
const COL_A_D = { A1: [0, 1], A2: [2, 3], B1: [4, 5], B2: [6, 7], C: [8, 9], D: [10, 11] };
// Colunas das Tabelas 38/39 (métodos E e F, cabos multipolares/unipolares)
// F: 2 condutores justapostos (col. 4) / 3 condutores em trifólio (col. 5). A col. 6 (3 justapostos no
// mesmo plano) dá valor maior; sem o arranjo definido vale o trifólio, o menor (lado da segurança).
const COL_E_F = { E: [0, 1], F: [2, 3] };

const METODOS = {
  A1: 'A1 — condutores isolados em eletroduto embutido em parede termicamente isolante',
  A2: 'A2 — cabo multipolar em eletroduto embutido em parede termicamente isolante',
  B1: 'B1 — condutores isolados em eletroduto aparente ou embutido em alvenaria',
  B2: 'B2 — cabo multipolar em eletroduto aparente ou embutido em alvenaria',
  C: 'C — cabo sobre parede ou bandeja não perfurada',
  D: 'D — cabo em eletroduto enterrado',
  E: 'E — cabo multipolar ao ar livre / bandeja perfurada',
  F: 'F — cabos unipolares ao ar livre / bandeja perfurada',
};

// Capacidade de condução Iz de referência (A), cobre
function capacidade(secao, metodo, carregados, isolacao) {
  const epr = isolacao === 'EPR' || isolacao === 'XLPE';
  if (COL_A_D[metodo]) {
    const t = epr ? CAP.EPR_A_D : CAP.PVC_A_D;
    return t[secao] ? t[secao][COL_A_D[metodo][carregados === 3 ? 1 : 0]] : null;
  }
  if (COL_E_F[metodo]) {
    const t = epr ? CAP.EPR_E_G : CAP.PVC_E_G;
    return t[secao] ? t[secao][COL_E_F[metodo][carregados === 3 ? 1 : 0]] : null;
  }
  throw new Error(`Método de instalação inválido: ${metodo}`);
}

// Tabela 40 — fator de correção de temperatura (ar)
const FCT_AR = {
  PVC: { 10: 1.22, 15: 1.17, 20: 1.12, 25: 1.06, 30: 1, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61, 60: 0.5 },
  EPR: { 10: 1.15, 15: 1.12, 20: 1.08, 25: 1.04, 30: 1, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71, 65: 0.65, 70: 0.58, 75: 0.5, 80: 0.41 },
};
// Tabela 40 — solo (referência 20 °C)
const FCT_SOLO = {
  PVC: { 10: 1.1, 15: 1.05, 20: 1, 25: 0.95, 30: 0.89, 35: 0.84, 40: 0.77 },
  EPR: { 10: 1.07, 15: 1.04, 20: 1, 25: 0.96, 30: 0.93, 35: 0.89, 40: 0.85 },
};
function fatorTemperatura(temp, isolacao, enterrado) {
  const iso = isolacao === 'PVC' ? 'PVC' : 'EPR';
  const t = (enterrado ? FCT_SOLO : FCT_AR)[iso];
  const chaves = Object.keys(t).map(Number).sort((a, b) => a - b);
  const tc = Number(temp);
  const onde = enterrado ? 'do solo' : 'ambiente';
  if (temp == null || temp === '' || !Number.isFinite(tc)) throw new Error(`Temperatura ${onde} inválida: "${temp}".`);
  // acima do fim da Tabela 40 a isolação não serve para o local (não usar o último fator como se valesse)
  if (tc > chaves[chaves.length - 1]) throw new Error(`Temperatura ${onde} de ${tc} °C acima da Tabela 40 para isolação ${iso === 'PVC' ? 'PVC' : 'EPR/XLPE'} (máximo ${chaves[chaves.length - 1]} °C) — use isolação para temperatura maior ou revise o valor.`);
  const k = chaves.find(c => c >= tc); // arredonda para cima (lado da segurança)
  return t[k];
}

// Tabela 42, linha 1 — condutores em feixe (eletroduto, embutidos, ao ar)
function fatorAgrupamento(nCircuitos) {
  const n = Math.max(1, Math.round(nCircuitos || 1));
  const tab = { 1: 1, 2: 0.8, 3: 0.7, 4: 0.65, 5: 0.6, 6: 0.57, 7: 0.54, 8: 0.52 };
  if (tab[n]) return tab[n];
  if (n <= 11) return 0.5;
  if (n <= 15) return 0.45;
  if (n <= 19) return 0.41;
  return 0.38;
}

// Tabela 47 — seção mínima (cobre, instalação fixa com cabos isolados)
const SECAO_MINIMA = { iluminacao: 1.5, tug: 2.5, tue: 2.5, alimentador: 2.5 };

// Tabela 48 — neutro reduzido (só circuito trifásico equilibrado, 3ª harmônica ≤ 15 %)
const NEUTRO_REDUZIDO = { 35: 25, 50: 25, 70: 35, 95: 50, 120: 70, 150: 70, 185: 95, 240: 120, 300: 150, 400: 185 };

// Tabela 58 — condutor de proteção
function secaoPE(fase) {
  if (fase <= 16) return fase;
  if (fase <= 35) return 16;
  const metade = fase / 2;
  return SECOES.find(s => s >= metade);
}

// Tabela 59 — reserva no quadro
function reservaQuadro(n) {
  if (n <= 6) return 2;
  if (n <= 12) return 3;
  if (n <= 30) return 4;
  return Math.ceil(0.15 * n);
}

// ── Disjuntores: série comum de correntes nominais (A) ──────────────────────
// Uma série só (2.40). Antes eram três listas: DISJUNTORES aqui (6 a 630 A, circuitos e alimentadores),
// DISJUNTORES_DIN nos quadros (2 a 125 A) e DISJUNTORES_CM_ABERTOS (16 a 6300 A; esta já juntava as
// cópias de motores.js, quadros e média tensão em 14/11/2026). Cada tipo recorta a sua faixa:
//   din          — minidisjuntor de trilho DIN: NBR NM 60898 até 63 A, IEC 60947-2 até 125 A;
//   caixaMoldada — caixa moldada (IEC 60947-2) até 1600 A e abertos acima (até 6300 A);
//   predial      — a série dos circuitos e alimentadores (elétrica, hospitalar, carregador, 3D externo):
//                  DIN e caixa moldada de 6 a 630 A, com o 70 A.
// O 70 A só existe na série predial (sempre esteve nela; nem a série DIN nem a de caixa moldada o tinham)
// [CONFERIR com o fabricante].
const SERIE_DISJUNTORES = [2, 4, 6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200, 4000, 5000, 6300];
const FAIXA_DISJUNTORES = { din: [2, 125], caixaMoldada: [16, 6300], predial: [6, 630] };
const SO_PREDIAL = [70];
// valores da série do tipo, recortados em [de, ate]
function disjuntoresDoTipo(tipo, de = 0, ate = Infinity) {
  const faixa = FAIXA_DISJUNTORES[tipo];
  if (!faixa) throw new Error(`Tipo de disjuntor desconhecido: ${tipo}`);
  return SERIE_DISJUNTORES.filter(a => a >= Math.max(faixa[0], de) && a <= Math.min(faixa[1], ate) && (tipo === 'predial' || !SO_PREDIAL.includes(a)));
}

// Correntes nominais usuais de disjuntores (NBR NM 60898 / IEC 60947-2) — circuitos e alimentadores
const DISJUNTORES = disjuntoresDoTipo('predial');
// Minidisjuntores DIN (quadros)
const DISJUNTORES_DIN = disjuntoresDoTipo('din');
// Caixa moldada e abertos (A), IEC 60947-2: motores.js (até 4000 A, proteção de motor grande e geral),
// quadros (até 1600 A, só caixa moldada) e média tensão (100 a 6300 A, geral de BT do trafo) recortam
// a sua faixa com serieDisjuntores(de, ate).
const DISJUNTORES_CM_ABERTOS = disjuntoresDoTipo('caixaMoldada');
const serieDisjuntores = (de = 0, ate = Infinity) => disjuntoresDoTipo('caixaMoldada', de, ate);

// Correntes nominais de DR (interruptor diferencial) usuais (A). Antes [25, 40, 63, 80, 100] em linha
// na elétrica, hospitalar, iluminação e carregador (sem o 125) e [25 … 125] nos quadros.
const DR_IN = [25, 40, 63, 80, 100, 125];
// Menor DR da série com In ≥ a corrente do disjuntor do circuito; acima da série, o próprio valor
// (o DR não pode ficar abaixo do disjuntor — antes saía 100 A para qualquer disjuntor maior) [CONFERIR modelo]
function drComercial(corrente) {
  return DR_IN.find(v => v >= corrente - 1e-9) || corrente;
}

// Relação Ip/In (corrente de partida / nominal) adotada quando a placa do motor não é informada —
// era o 7 repetido nos quadros, na industrial, na pressurização e em motores.js [CONFERIR placa]
const IP_IN_PADRAO = 7;

// Corrente de curta duração (Icw, 1 s) de conjuntos NBR IEC 61439 (kA) — era igual nos quadros e na industrial
const ICW_KA = [6, 10, 15, 20, 25, 35, 50, 65, 80, 100];

// ── Barramentos de cobre (DIN 43671) ────────────────────────────────────────
// DIN 43671 (1975), Tabela 1 — barras retangulares de cobre E-Cu F30, CA 50/60 Hz,
// uma barra por fase, ar ambiente 35 °C e barra a 65 °C (Δθ = 30 K): corrente
// permanente (A) com barra nua e pintada. Valores reproduzidos de catálogos de
// barramentos [CONFERIR com a tabela original]. (Vinham de quadros/scripts/lib/tabelas.js.)
const BARRAS_DIN43671 = [
  { l: 12, e: 2, nua: 108, pintada: 123 }, { l: 15, e: 2, nua: 128, pintada: 148 }, { l: 15, e: 3, nua: 162, pintada: 187 },
  { l: 20, e: 3, nua: 204, pintada: 237 }, { l: 20, e: 5, nua: 274, pintada: 319 }, { l: 25, e: 5, nua: 327, pintada: 384 },
  { l: 30, e: 5, nua: 379, pintada: 447 }, { l: 40, e: 5, nua: 482, pintada: 573 }, { l: 30, e: 10, nua: 573, pintada: 676 },
  { l: 50, e: 5, nua: 583, pintada: 697 }, { l: 60, e: 5, nua: 688, pintada: 826 }, { l: 40, e: 10, nua: 715, pintada: 850 },
  { l: 50, e: 10, nua: 852, pintada: 1020 }, { l: 80, e: 5, nua: 885, pintada: 1070 }, { l: 60, e: 10, nua: 985, pintada: 1180 },
  { l: 100, e: 5, nua: 1080, pintada: 1300 }, { l: 80, e: 10, nua: 1240, pintada: 1500 }, { l: 100, e: 10, nua: 1490, pintada: 1810 },
  { l: 120, e: 10, nua: 1740, pintada: 2110 },
];
// Conjuntos de 2 a 4 barras por fase (só barra nua), nas mesmas condições — os valores que a skill
// de média tensão usava para o QGBT acima de uma barra, "ordem de grandeza da DIN 43671"
// [CONFERIR com o fabricante do painel]. Não há valor de barra pintada para eles.
const CONJUNTOS_DIN43671 = [
  { n: 2, l: 80, e: 10, nua: 2110 }, { n: 2, l: 100, e: 10, nua: 2500 }, { n: 3, l: 100, e: 10, nua: 3310 }, { n: 4, l: 100, e: 10, nua: 4000 },
];
// Correção de temperatura (DIN 43671, Figura 2) aproximada por k2 = ((θbarra − θar)/30)^0,61 —
// a troca de calor por convecção natural e radiação cresce com Δθ^1,25 e I² ∝ calor [CONFERIR na curva]
const EXPOENTE_K2 = 0.61;
function k2Temperatura(thetaBarra, thetaAr) {
  const dt = thetaBarra - thetaAr;
  if (dt <= 0) return 0;
  return (dt / 30) ** EXPOENTE_K2;
}
// Menor barra (por seção) cuja corrente corrigida (tabela × k2) atende; null se nenhuma.
// `conjuntos`: depois das barras simples, também os conjuntos de 2 a 4 barras por fase (só barra nua).
function escolherBarra(corrente, k2, pintada, { conjuntos = false } = {}) {
  const col = pintada ? 'pintada' : 'nua';
  const ordenadas = [...BARRAS_DIN43671].sort((a, b) => a.l * a.e - b.l * b.e || a[col] - b[col]);
  const simples = ordenadas.find(b => b[col] * k2 >= corrente - 1e-9);
  if (simples || !conjuntos || pintada) return simples || null;
  return CONJUNTOS_DIN43671.find(b => b.nua * k2 >= corrente - 1e-9) || null;
}
// Rótulo da barra: "1 × (40 × 10 mm)"
const rotuloBarra = (b) => `${b.n || 1} × (${b.l} × ${b.e} mm)`;

// ── Montagem em trilho DIN e fiação de quadros ─────────────────────────────
// Usadas pela fabricação de quadros (../fabricacao/tabelasQuadro.js) e pelo quadro do 3D
// (../instalacao/painelQuadro.js, que entra no bundle do visualizador). Vinham de quadros/tabelas.js (2.40).
// Módulo DIN (DIN 43880): 17,5 mm; alguns fabricantes usam 18 mm — o espaço é
// reservado com 18 mm (lado da segurança). Trilho TS35 × 7,5 (EN 60715).
const MODULO_MM = 18;
const MODULO_NOMINAL_MM = 17.5;
// Altura (mm) e profundidade (mm, a partir da placa) típicas
const DIN_ALTURA = 90;
const DIN_PROF = 80;
// Diâmetro externo de condutor flexível 450/750 V (NBR NM 247-3) — aproximado [CONFERIR catálogo]
const DIAMETRO_FIO = { 0.5: 2.2, 0.75: 2.4, 1: 2.6, 1.5: 3.0, 2.5: 3.6, 4: 4.3, 6: 4.9, 10: 6.4, 16: 7.6, 25: 9.6, 35: 10.9, 50: 13.0, 70: 15.0, 95: 17.5, 120: 19.3 };

// Resistividade do cobre em operação (Ω·mm²/m) — valor conservador para 70 °C
const RHO_COBRE = 0.0225;
// Resistividade do cobre a 20 °C (1/56 Ω·mm²/m) — curto-circuito máximo (capacidade de interrupção)
const RHO_COBRE_20 = 0.0178;

// Tabela 30 — k do condutor de cobre (integral de Joule k²S², 5.3.5.5.2)
function kCurto(isolacao, secao) {
  if (isolacao === 'EPR' || isolacao === 'XLPE') return 143;
  return secao > 300 ? 103 : 115;
}
// Capacidades de interrupção usuais de disjuntores (kA): NBR NM 60898 (Icn) até 25 kA; acima, IEC 60947-2 (Icu)
const ICN_KA = [3, 4.5, 6, 10, 15, 20, 25, 36, 50, 65, 85, 100];
// Disparo instantâneo por curva (NBR NM 60898: B 3–5·In, C 5–10·In, D 10–20·In) — Ia = limite superior
const CURVA_IA = { B: 5, C: 10, D: 20 };

// Limites de queda de tensão (6.2.7)
const QUEDA = { terminal: 4, total_bt: 5, total_trafo: 7 };

// Tabela 60 — resistência de isolamento mínima
const ISOLAMENTO = [
  { ate: 50, tensaoEnsaio: 250, minimo: 0.25, rotulo: 'SELV/PELV' },
  { ate: 500, tensaoEnsaio: 500, minimo: 0.5, rotulo: 'até 500 V' },
  { ate: Infinity, tensaoEnsaio: 1000, minimo: 1, rotulo: 'acima de 500 V' },
];

// 6.2.11.1.6 — taxa máxima de ocupação do eletroduto (área dos cabos ÷ área da seção interna):
// 53 % com um condutor ou cabo, 31 % com dois e 40 % com três ou mais. Regra única de ocupação
// para as skills (cabeamento de dados; antes só havia o 40 % em cópia no modelo-3d) — 14/11/2026.
const OCUPACAO_ELETRODUTO = { um: 0.53, dois: 0.31, tresOuMais: 0.4 };
// Eletroduto rígido de PVC roscável (NBR 15465): diâmetro interno = diâmetro externo médio − 2 × parede,
// medidas "aproximadas" da ficha técnica Amanco Wavin (FT Eletroduto Soldável e Roscável, FTC000021):
// ½" 20,8/2,2 · ¾" 26,2/2,3 · 1" 32,9/2,7 · 1¼" 41,9/3,0 · 1½" 47,4/3,0 · 2" 59,1/3,2 · 2½" 74,9/3,8 ·
// 3" 87,6/4,0 · 4" 112,7/4,4 mm. Outros fabricantes/classes diferem [CONFERIR com o eletroduto adotado].
const ELETRODUTOS_PVC_ROSCAVEL = [
  { bitola: '1/2"', dn: 20, di: 16.4 }, { bitola: '3/4"', dn: 25, di: 21.6 }, { bitola: '1"', dn: 32, di: 27.5 },
  { bitola: '1 1/4"', dn: 40, di: 35.9 }, { bitola: '1 1/2"', dn: 50, di: 41.4 }, { bitola: '2"', dn: 60, di: 52.7 },
  { bitola: '2 1/2"', dn: 75, di: 67.3 }, { bitola: '3"', dn: 85, di: 79.6 }, { bitola: '4"', dn: 110, di: 103.9 },
];

// Fatores de demanda TÍPICOS de concessionária (residencial) — a NBR 5410 não
// define demanda (4.2.3). Conferir com a norma da distribuidora local
// (no DF: Neoenergia DIS-NOR-030 / DIS-NOR-053). Editáveis no formulário.
const DEMANDA_ILUM_TUG_PADRAO = [
  { ate_kw: 1, fator: 0.86 }, { ate_kw: 2, fator: 0.75 }, { ate_kw: 3, fator: 0.66 }, { ate_kw: 4, fator: 0.59 },
  { ate_kw: 5, fator: 0.52 }, { ate_kw: 6, fator: 0.45 }, { ate_kw: 7, fator: 0.4 }, { ate_kw: 8, fator: 0.35 },
  { ate_kw: 9, fator: 0.31 }, { ate_kw: 10, fator: 0.27 }, { ate_kw: 99999, fator: 0.24 },
];
const DEMANDA_TUE_PADRAO = [
  { ate_qtd: 1, fator: 1 }, { ate_qtd: 2, fator: 1 }, { ate_qtd: 3, fator: 0.84 }, { ate_qtd: 4, fator: 0.76 },
  { ate_qtd: 5, fator: 0.7 }, { ate_qtd: 6, fator: 0.65 }, { ate_qtd: 7, fator: 0.6 }, { ate_qtd: 8, fator: 0.57 },
  { ate_qtd: 9, fator: 0.54 }, { ate_qtd: 10, fator: 0.52 }, { ate_qtd: 9999, fator: 0.5 },
];

// Locais em que DR ≤ 30 mA é obrigatório (5.1.3.2.2)
const LOCAIS_DR = ['banheiro', 'cozinha', 'area_servico', 'garagem', 'externa', 'molhada'];
// Locais de 9.5.3.2 (tomadas em circuito exclusivo) e de 9.5.2.2.2 a) (600 VA)
const LOCAIS_COZINHA = ['cozinha', 'area_servico'];
const LOCAIS_600VA = ['banheiro', 'cozinha', 'area_servico'];

module.exports = {
  SECOES, METODOS, capacidade, fatorTemperatura, fatorAgrupamento, SECAO_MINIMA, NEUTRO_REDUZIDO, secaoPE,
  reservaQuadro, SERIE_DISJUNTORES, FAIXA_DISJUNTORES, disjuntoresDoTipo, DISJUNTORES, DISJUNTORES_DIN, DISJUNTORES_CM_ABERTOS, serieDisjuntores, DR_IN, drComercial, IP_IN_PADRAO, ICW_KA,
  BARRAS_DIN43671, CONJUNTOS_DIN43671, EXPOENTE_K2, k2Temperatura, escolherBarra, rotuloBarra, RHO_COBRE, RHO_COBRE_20, kCurto, ICN_KA, CURVA_IA, QUEDA, ISOLAMENTO, DEMANDA_ILUM_TUG_PADRAO, DEMANDA_TUE_PADRAO,
  LOCAIS_DR, LOCAIS_COZINHA, LOCAIS_600VA, MODULO_MM, MODULO_NOMINAL_MM, DIN_ALTURA, DIN_PROF, DIAMETRO_FIO,
  OCUPACAO_ELETRODUTO, ELETRODUTOS_PVC_ROSCAVEL,
};
