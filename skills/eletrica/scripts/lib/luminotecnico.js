// Elétrica predial × projeto luminotécnico (achado SK-06 da auditoria de 02/11/2026).
// Com `dados.luminotecnico` (o formulário da skill de iluminação, NBR ISO/CIE 8995-1),
// a elétrica roda o cálculo da iluminação e:
//   - os circuitos IL* entram no quadro de cargas e no unifilar da elétrica (mesmo id);
//   - nos ambientes cobertos, a iluminação da previsão é a carga do luminotécnico e a
//     planta usa a grade calculada (nx × ny) em vez de "1 ponto a cada 16 m²".
// Os ambientes casam pelo nome (sem acento, maiúsculas e espaços não contam).

const ILU = require('../../../iluminacao/scripts/lib/calculo');

const normalizar = (s) => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();

// parâmetros elétricos que valem os da elétrica (o mesmo quadro): tensões, cabos, método
const DA_ELETRICA = ['tensao_fn', 'tensao_ff', 'sistema', 'esquema', 'isolacao', 'metodo', 'temperatura', 'agrupamento', 'fp', 'queda_max_terminal_pct'];

// → null (sem luminotécnico) ou { calc (da iluminação), opcoes (para o motor da elétrica),
//   cobertos: Map nome da elétrica → ambiente do luminotécnico, avisos }
function prepararLuminotecnico(dados) {
  const lt = dados.luminotecnico;
  if (!lt || typeof lt !== 'object' || !(lt.ambientes || []).length) return null;
  const inst = { ...(lt.instalacao || {}) };
  for (const k of DA_ELETRICA) if (dados.instalacao?.[k] != null && dados.instalacao[k] !== '') inst[k] = dados.instalacao[k];
  let calc;
  try { calc = ILU.calcular({ ...lt, instalacao: inst }); } catch (e) { throw new Error(`Luminotécnico: ${e.message}`); }
  const porNome = new Map((dados.ambientes || []).map(a => [normalizar(a.nome), a.nome]));
  const cobertos = new Map();
  const avisos = [];
  const fora = [];
  for (const a of calc.ambientes) {
    const nome = porNome.get(normalizar(a.nome));
    if (nome) cobertos.set(nome, a); else fora.push(a.nome);
  }
  if (fora.length) avisos.push(`Luminotécnico: ${fora.join(', ')} não está(ão) nos ambientes da elétrica — os circuitos entram no quadro de cargas, mas sem previsão de tomadas para esses ambientes. [CONFERIR]`);
  const nomeDaEletrica = (n) => porNome.get(normalizar(n)) || n;
  const opcoes = {
    luminotecnico: {
      ambientes: new Map([...cobertos].map(([nome, a]) => [nome, { va: a.distribuicao.reduce((s, d) => s + d.va, 0), pontosLuz: a.n }])),
      circuitos: calc.circuitos.map(x => ({ id: x.id, descricao: x.descricao, potencia_va: x.potencia_va, ligacao: x.ligacao, comprimento_m: x.comprimento, dr: x.dr, ambientes: (x.ambientes || []).map(nomeDaEletrica) })),
    },
  };
  return { calc, opcoes, cobertos, avisos };
}

module.exports = { prepararLuminotecnico, normalizar };
