// Ajudante mínimo de teste para as skills (sem dependências)
const assert = require('assert');

function verificador(nome) {
  let total = 0;
  let falhas = 0;
  return {
    perto(rotulo, obtido, esperado, tol = 0.006) {
      total++;
      const ok = esperado === 0 ? obtido === 0 : Math.abs(obtido - esperado) / Math.abs(esperado) <= tol;
      if (!ok) { falhas++; console.log(`  FALHOU ${rotulo}: obtido ${obtido}, esperado ${esperado}`); }
    },
    igual(rotulo, obtido, esperado) {
      total++;
      try { assert.deepStrictEqual(obtido, esperado); } catch { falhas++; console.log(`  FALHOU ${rotulo}: obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`); }
    },
    fim() {
      console.log(`${nome}: ${total - falhas}/${total} verificações OK`);
      process.exitCode = falhas ? 1 : 0;
    },
  };
}

module.exports = { verificador };
