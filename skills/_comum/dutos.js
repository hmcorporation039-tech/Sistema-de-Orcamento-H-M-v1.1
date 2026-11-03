// Dutos de ar — perda de carga por atrito e localizada. Motor COMUM (fase 4 do
// roteiro de 02/11/2026): nasceu na skill de pressurização e passou a servir à
// climatização (fancoil/AHU, VAV, insuflamento e retorno). A pressurização importa
// daqui com os mesmos nomes; mudança aqui vale para as duas (rode o npm test das duas).
//
// Método: Darcy-Weisbach com o fator de atrito de Altshul-Tsal (ASHRAE Handbook —
// Fundamentals, cap. 21, "Duct design"):
//   f' = 0,11·(ε/Dh + 68/Re)^0,25;  f = f' se f' ≥ 0,018, senão 0,85·f' + 0,0028
//   Re = 66 400·Dh·V (ar padrão);  Δp/L = (f/Dh)·ρV²/2
// Duto retangular: diâmetro hidráulico Dh = 2ab/(a+b) para o atrito; diâmetro
// equivalente de Huebscher De = 1,30·(ab)^0,625/(a+b)^0,25 para escolher o lado
// pela mesma perda de um duto circular. [CONFERIR na edição do ASHRAE adotada]

const DENSIDADE_PADRAO = 1.204; // kg/m³ — ar padrão (20 °C, 101,325 kPa)
// Rugosidade absoluta ε (m): chapa galvanizada 0,09 mm; alvenaria rebocada ~1,5 mm [CONFERIR];
// flexível (aberto) ~3 mm [CONFERIR fabricante]
const RUGOSIDADE_M = { metalico: 0.00009, alvenaria: 0.0015, misto: 0.0015, flexivel: 0.003 };

// Fator de atrito de Altshul-Tsal (ASHRAE Fundamentals, cap. 21)
function fatorAtrito(dh, v, eps) {
  const re = 66400 * dh * v;
  const f1 = 0.11 * (eps / dh + 68 / re) ** 0.25;
  return { re, f: f1 >= 0.018 ? f1 : 0.85 * f1 + 0.0028 };
}

// Perda por atrito (Pa) em duto retangular a × b, vazão Q (m³/s), comprimento L (m)
function perdaAtrito({ vazao, largura, altura, comprimento, eps, rho = DENSIDADE_PADRAO }) {
  const area = largura * altura;
  const v = vazao / area;
  const dh = (2 * largura * altura) / (largura + altura);
  const { re, f } = fatorAtrito(dh, v, eps);
  const pv = (rho * v * v) / 2;
  const porMetro = (f / dh) * pv;
  return { area, v, dh, re, f, pv, porMetro, total: porMetro * comprimento };
}

// Perda por atrito (Pa) em duto circular de diâmetro D (m)
function perdaAtritoCircular({ vazao, diametro, comprimento, eps, rho = DENSIDADE_PADRAO }) {
  const area = (Math.PI * diametro * diametro) / 4;
  const v = vazao / area;
  const { re, f } = fatorAtrito(diametro, v, eps);
  const pv = (rho * v * v) / 2;
  const porMetro = (f / diametro) * pv;
  return { area, v, dh: diametro, re, f, pv, porMetro, total: porMetro * comprimento };
}

// Diâmetro equivalente de Huebscher (mesma vazão e mesma perda por metro)
const diametroEquivalente = (a, b) => (1.30 * (a * b) ** 0.625) / (a + b) ** 0.25;

// Pressão dinâmica (Pa) e perda localizada K·Pd
const pressaoDinamica = (v, rho = DENSIDADE_PADRAO) => (rho * v * v) / 2;
const perdaLocalizada = (k, v, rho = DENSIDADE_PADRAO) => k * pressaoDinamica(v, rho);

// Diâmetros comerciais de duto circular (m) — série usual de chapa espiral/calandrada [CONFERIR fornecedor]
const DIAMETROS_M = [0.1, 0.125, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.4, 1.6];

// Dimensiona um trecho pelo método da perda constante (perda alvo Pa/m) limitado
// pela velocidade máxima: menor diâmetro comercial que atende os dois; em duto
// retangular, altura fixa (forro) e largura em passos de 50 mm pela equivalência
// de Huebscher. → { forma, diametro | largura × altura, v, porMetro, … }
function dimensionarTrecho({ vazao, perdaAlvo = 1.0, vMax = 8, forma = 'retangular', alturaMax = 0.4, eps = RUGOSIDADE_M.metalico }) {
  let d = DIAMETROS_M.find(D => {
    const r = perdaAtritoCircular({ vazao, diametro: D, comprimento: 1, eps });
    return r.porMetro <= perdaAlvo + 1e-9 && r.v <= vMax + 1e-9;
  }) || DIAMETROS_M[DIAMETROS_M.length - 1];
  if (forma === 'circular') return { forma, diametro: d, ...perdaAtritoCircular({ vazao, diametro: d, comprimento: 1, eps }) };
  // retangular: altura = menor entre a máxima do forro e o próprio diâmetro (seção quase quadrada)
  const altura = Math.min(alturaMax, Math.ceil(d / 0.05) * 0.05);
  let largura = altura;
  while (diametroEquivalente(largura, altura) < d - 1e-9 && largura < 4) largura = Math.round((largura + 0.05) * 100) / 100;
  return { forma, largura, altura, ...perdaAtrito({ vazao, largura, altura, comprimento: 1, eps }) };
}

module.exports = {
  DENSIDADE_PADRAO, RUGOSIDADE_M, DIAMETROS_M, fatorAtrito, perdaAtrito, perdaAtritoCircular, diametroEquivalente,
  pressaoDinamica, perdaLocalizada, dimensionarTrecho,
};
