// Ar externo (renovação de ar) — tabela comum da climatização e da automação (14/11/2026).
// Antes a tabela morava em skills/automacao/scripts/lib/tabelas.js e a climatização a importava de lá
// (dependência de uma skill na outra); a renovação mínima da Portaria estava repetida nas duas.
// As duas skills reexportam daqui com os mesmos nomes.

// NBR 16401-3:2008, Tabela 1, nível 1 — Fp (L/s·pessoa) e Fa (L/s·m²);
// mesmos valores da ASHRAE 62.1. [CONFERIR na norma para o uso específico]
const AR_EXTERNO = {
  escritorio: { rotulo: 'Escritório', fp: 2.5, fa: 0.3, densidade: 5 },
  reuniao: { rotulo: 'Sala de reunião', fp: 2.5, fa: 0.3, densidade: 50 },
  sala_aula: { rotulo: 'Sala de aula', fp: 5.0, fa: 0.6, densidade: 35 },
  loja: { rotulo: 'Loja / varejo', fp: 3.8, fa: 0.6, densidade: 15 },
  restaurante: { rotulo: 'Restaurante', fp: 3.8, fa: 0.9, densidade: 70 },
  auditorio: { rotulo: 'Auditório', fp: 2.5, fa: 0.3, densidade: 150 },
  outro: { rotulo: 'Outro (informar Fp e Fa)', fp: 2.5, fa: 0.3, densidade: 10 },
};

// Portaria MS 3.523/1998, art. 5º f: renovação mínima de 27 m³/h por pessoa (conferido no texto);
// vale junto com a NBR 16401-3 (o maior dos dois)
const RENOVACAO_MINIMA_M3H_PESSOA = 27;

module.exports = { AR_EXTERNO, RENOVACAO_MINIMA_M3H_PESSOA };
