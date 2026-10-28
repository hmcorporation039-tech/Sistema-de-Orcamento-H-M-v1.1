// Textos do corpo JSON sempre "bem formados" (UTF-16 sem surrogate solto).
//
// JSON aceita "\ud800" sozinho; o Node guarda isso numa string que o
// PostgreSQL não aceita em jsonb ("Unicode low surrogate must follow a high
// surrogate") e que vira "?" em outros lugares. Na aprovação pública um nome
// assim derrubava a auditoria no meio da transação (revisão de 27/10/2026).
// Aqui cada string do corpo (em qualquer nível) passa por String#toWellFormed,
// que troca só o surrogate solto por U+FFFD — texto normal não muda.
const PROFUNDIDADE_MAX = 64;

function normalizarTextos(valor, profundidade = 0) {
  if (typeof valor === 'string') return valor.isWellFormed() ? valor : valor.toWellFormed();
  if (!valor || typeof valor !== 'object' || profundidade > PROFUNDIDADE_MAX) return valor;
  if (Array.isArray(valor)) {
    for (let i = 0; i < valor.length; i++) valor[i] = normalizarTextos(valor[i], profundidade + 1);
    return valor;
  }
  // só objetos simples (o que o express.json produz); Buffer/Date ficam como estão
  const proto = Object.getPrototypeOf(valor);
  if (proto !== Object.prototype && proto !== null) return valor;
  for (const chave of Object.keys(valor)) {
    if (chave === '__proto__') continue; // nunca reatribuir (mudaria o protótipo)
    const original = valor[chave];
    const v = normalizarTextos(original, profundidade + 1);
    const limpa = chave.isWellFormed() ? chave : chave.toWellFormed();
    if (limpa === chave) {
      if (v !== original) valor[chave] = v;
    } else {
      delete valor[chave];
      Object.defineProperty(valor, limpa, { value: v, enumerable: true, writable: true, configurable: true });
    }
  }
  return valor;
}

function textosBemFormados(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = normalizarTextos(req.body);
  next();
}

module.exports = { textosBemFormados, normalizarTextos };
