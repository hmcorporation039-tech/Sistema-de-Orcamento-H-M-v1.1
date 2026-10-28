// Tabelas da ABNT NBR 5410:2004 (versão corrigida 2008) usadas no cálculo.
// Capacidades de condução (Tabelas 36 a 39, cobre) foram lidas direto do texto
// da norma para dados/capacidade_conducao_cobre.json.

const CAP = require('../../dados/capacidade_conducao_cobre.json');

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

// Correntes nominais usuais de disjuntores (NBR NM 60898 / IEC 60947-2)
const DISJUNTORES = [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 70, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630];

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
  reservaQuadro, DISJUNTORES, RHO_COBRE, RHO_COBRE_20, kCurto, ICN_KA, CURVA_IA, QUEDA, ISOLAMENTO, DEMANDA_ILUM_TUG_PADRAO, DEMANDA_TUE_PADRAO,
  LOCAIS_DR, LOCAIS_COZINHA, LOCAIS_600VA,
};
