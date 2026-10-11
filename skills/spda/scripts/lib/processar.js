// Junta dados da obra, análise de risco e dimensionamento em um único
// resultado que os documentos consomem. Também consolida checklist, não
// conformidades e ensaios, e define o parecer do laudo.

const { analisarRisco } = require('./risco');
const { dimensionar } = require('./dimensionamento');
const T = require('./tabelas');

const CHECKLIST_BASE = require('../../dados/checklist_base.json');

const PRAZOS = {
  P1: 'imediato (providência provisória em até 48 h)',
  P2: 'até 30 dias',
  P3: 'até 90 dias',
  P4: 'na próxima manutenção programada',
};

// Critérios do Anexo F da NBR 5419-3:2026
const ENSAIOS = {
  'F.1': { nome: 'Armaduras — descida + aterramento natural (medição cruzada)', limite: 1, criterio: '≤ 1 Ω (F.1.2.3.3)' },
  'F.2': { nome: 'Armaduras de pilar — descida natural (topo × base do mesmo pilar)', limite: 1, criterio: '≤ 1 Ω (F.2.2.3.3)' },
  'F.3': { nome: 'Armaduras da fundação — aterramento natural', limite: 1, criterio: '≤ 1 Ω (F.3)' },
  'F.4': { nome: 'Verificação comprobatória captação × BEP', limite: 0.2, criterio: '≤ 0,2 Ω (F.4.4)' },
  'F.5': { nome: 'Condutor de descida não natural', limite: null, criterio: 'compatível com material × comprimento (F.5.2.1.3)' },
  'F.6': { nome: 'Eletrodo de aterramento não natural', limite: null, criterio: 'compatível com material × comprimento (F.6.2.1.3)' },
  'F.7': { nome: 'Ligação equipotencial', limite: null, criterio: 'compatível com material × comprimento (F.7.2.3)' },
};
const RESISTIVIDADE = { cobre: 0.0178, aluminio: 0.0282, aco_galvanizado: 0.138, aco_cobreado: 0.059 }; // Ω·mm²/m a 20 °C

// Para F.5 a F.7 a norma pede valor compatível com o condutor. Com material,
// seção e comprimento informados, calcula a resistência esperada e adota 2×
// como limite (margem para conexões — critério adotado, declarado no laudo).
function criterioEnsaio(e) {
  const tipo = ENSAIOS[e.tipo_ensaio] || { criterio: 'informar critério', limite: null };
  if (tipo.limite != null) return { criterio: tipo.criterio, limite: tipo.limite };
  if (e.material && e.secao_mm2 && e.comprimento_m && RESISTIVIDADE[e.material]) {
    const esperado = RESISTIVIDADE[e.material] * e.comprimento_m / e.secao_mm2;
    return { criterio: `≤ ${(2 * esperado).toFixed(3).replace('.', ',')} Ω (2 × R esperada de ${esperado.toFixed(3).replace('.', ',')} Ω — critério adotado)`, limite: 2 * esperado };
  }
  return { criterio: '≤ 1 Ω (adotado; informar material, seção e comprimento para o critério por resistência esperada)', limite: 1 };
}

function processarEnsaios(lista) {
  return (lista || []).map(e => {
    const { criterio, limite } = criterioEnsaio(e);
    let resultado = 'NV';
    if (e.valor_ohm != null && e.valor_ohm !== '') resultado = Number(e.valor_ohm) <= limite ? 'C' : 'NC';
    return { ...e, criterio, limite, resultado };
  });
}

// Checklist da obra sobre a base de 60 itens: o que a obra informar substitui
// o item da base com o mesmo código; itens extras da obra entram no fim.
// Itens que não se aplicam pela própria configuração da estrutura — marcados NA
// automaticamente, a menos que a obra informe outra situação.
function naoAplicaveis(dados) {
  const na = {};
  const est = dados.estrutura || {};
  const spda = dados.spda || {};
  if (est.H != null && est.H <= 60) na.CP8 = 'Estrutura com altura até 60 m — proteção lateral não exigida (5.3.2.14.1)';
  if (spda.np && !spda.descida_natural && !spda.cobertura_metalica_natural) {
    na.D4 = 'Sem componentes naturais no SPDA';
    na.DS12 = 'Descidas não naturais';
  }
  return na;
}

function mesclarChecklist(daObra, dados) {
  const porCod = new Map((daObra || []).map(c => [c.cod, c]));
  const na = naoAplicaveis(dados);
  const itens = CHECKLIST_BASE.map(b => {
    const daObraItem = porCod.get(b.cod);
    const auto = (!daObraItem || !daObraItem.situacao || daObraItem.situacao === 'NV') && na[b.cod]
      ? { situacao: 'NA', obs: na[b.cod] } : {};
    return { situacao: 'NV', prioridade: b.prioridade_padrao, obs: '', foto: '', ...b, ...(daObraItem || {}), ...auto };
  });
  for (const c of daObra || []) if (!CHECKLIST_BASE.some(b => b.cod === c.cod)) itens.push({ situacao: 'NV', ...c });
  return itens;
}

// NCs: as descritas explicitamente pela obra prevalecem sobre a NC gerada do
// checklist para o mesmo item (o laudo antigo repetia as duas).
function consolidarNcs(checklist, explicitas) {
  const lista = [];
  const itensComNcExplicita = new Set((explicitas || []).map(n => n.item));
  for (const n of explicitas || []) lista.push({ ...n });
  for (const c of checklist) {
    if (c.situacao !== 'NC' || itensComNcExplicita.has(c.cod)) continue;
    lista.push({
      item: c.cod, local: c.onde || c.secao, descricao: c.obs || c.item, requisito: c.requisito,
      recomendacao: c.recomendacao || `Adequar ao requisito (${c.requisito}) e registrar a correção com foto.`,
      prioridade: c.prioridade || 'P3', foto: c.foto || '',
    });
  }
  const ordemP = { P1: 1, P2: 2, P3: 3, P4: 4 };
  lista.sort((a, b) => (ordemP[a.prioridade] || 9) - (ordemP[b.prioridade] || 9));
  return lista.map((n, i) => ({ ...n, id: `NC-${String(i + 1).padStart(2, '0')}`, prazo: PRAZOS[n.prioridade] || '' }));
}

function parecer(checklist, ncs, ensaios) {
  const cont = { C: 0, NC: 0, NA: 0, NV: 0 };
  checklist.forEach(c => { cont[c.situacao] = (cont[c.situacao] || 0) + 1; });
  const porP = { P1: 0, P2: 0, P3: 0, P4: 0 };
  ncs.forEach(n => { porP[n.prioridade] = (porP[n.prioridade] || 0) + 1; });
  const medidos = ensaios.filter(e => e.resultado !== 'NV');
  const ensaiosNc = ensaios.filter(e => e.resultado === 'NC').length;
  const pendentes = cont.NV + ensaios.filter(e => e.resultado === 'NV').length;
  let texto;
  let situacao;
  if ((ncs.length || ensaiosNc) && pendentes) {
    situacao = 'NAO_CONFORME_PRELIMINAR';
    texto = 'NÃO CONFORME (preliminar) — há não conformidades constatadas e itens ainda não verificados; o parecer final depende da conclusão da inspeção';
  } else if (ncs.length || ensaiosNc) {
    situacao = 'NAO_CONFORME';
    texto = 'NÃO CONFORME — corrigir as não conformidades nos prazos indicados e reinspecionar os itens corrigidos';
  } else if (pendentes) {
    situacao = 'INCONCLUSIVO';
    texto = 'INCONCLUSIVO — há itens ou ensaios não verificados';
  } else {
    situacao = 'CONFORME';
    texto = 'CONFORME — o SPDA atende à norma de origem e à NBR 5419-3:2026, Seção 7, nos itens verificados';
  }
  return { cont, porP, medidos: medidos.length, dentro: medidos.filter(e => e.resultado === 'C').length, ensaiosNc, pendentes, situacao, texto };
}

function processar(dados) {
  const risco = (dados.zonas && dados.zonas.length) ? analisarRisco(dados) : null;
  const dim = (dados.spda && T.NIVEL[dados.spda.np]) ? dimensionar(dados) : null;
  const insp = dados.inspecao || {};
  const checklist = mesclarChecklist(insp.checklist, dados);
  const ncs = consolidarNcs(checklist, insp.ncs);
  const ensaios = processarEnsaios(insp.continuidade);
  return {
    dados, risco, dim, checklist, ncs, ensaios,
    parecer: parecer(checklist, ncs, ensaios),
    intervalo: T.intervaloInspecao(insp),
    prazos: PRAZOS,
    tiposEnsaio: ENSAIOS,
  };
}

module.exports = { processar, PRAZOS, ENSAIOS, criterioEnsaio };
