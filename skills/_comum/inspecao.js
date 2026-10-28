// Inspeção genérica para qualquer disciplina: checklist (base da disciplina +
// o que a obra informar), não conformidades sem duplicidade e parecer.
// Mesma lógica validada na skill de SPDA.

const PRAZOS = {
  P1: 'imediato (providência provisória em até 48 h)',
  P2: 'até 30 dias',
  P3: 'até 90 dias',
  P4: 'na próxima manutenção programada',
};

// base: [{ cod, secao, item, requisito, onde, como, prioridade_padrao }]
// daObra: [{ cod, situacao, obs, foto, prioridade }]
// naoAplicaveis: { [cod]: 'motivo' } — viram NA se a obra não informar outra situação
function mesclarChecklist(base, daObra, naoAplicaveis = {}) {
  const porCod = new Map((daObra || []).map(c => [c.cod, c]));
  const itens = base.map(b => {
    const obra = porCod.get(b.cod);
    const auto = (!obra || !obra.situacao || obra.situacao === 'NV') && naoAplicaveis[b.cod]
      ? { situacao: 'NA', obs: naoAplicaveis[b.cod] } : {};
    return { situacao: 'NV', prioridade: b.prioridade_padrao || 'P3', obs: '', foto: '', ...b, ...(obra || {}), ...auto };
  });
  for (const c of daObra || []) if (!base.some(b => b.cod === c.cod)) itens.push({ situacao: 'NV', ...c });
  return itens;
}

function consolidarNcs(checklist, explicitas) {
  const lista = (explicitas || []).map(n => ({ ...n }));
  const comExplicita = new Set(lista.map(n => n.item));
  for (const c of checklist) {
    if (c.situacao !== 'NC' || comExplicita.has(c.cod)) continue;
    lista.push({
      item: c.cod, local: c.onde || c.secao, descricao: c.obs || c.item, requisito: c.requisito,
      recomendacao: c.recomendacao || `Adequar ao requisito (${c.requisito}) e registrar a correção com foto.`,
      prioridade: c.prioridade || 'P3', foto: c.foto || '',
    });
  }
  const ordem = { P1: 1, P2: 2, P3: 3, P4: 4 };
  lista.sort((a, b) => (ordem[a.prioridade] || 9) - (ordem[b.prioridade] || 9));
  return lista.map((n, i) => ({ ...n, id: `NC-${String(i + 1).padStart(2, '0')}`, prazo: PRAZOS[n.prioridade] || '' }));
}

// medicoes: [{ resultado: 'C' | 'NC' | 'NV' }] — qualquer tabela de medição da disciplina
// opcoes.exigeMedicao (padrão true): laudo sem NENHUM ensaio/medição registrado não
// sai CONFORME — a inspeção visual sozinha não sustenta a conformidade; a lista
// vazia conta como pendência (INCONCLUSIVO, ou NC preliminar se houver NC).
function parecer(checklist, ncs, medicoes = [], opcoes = {}) {
  const exigeMedicao = opcoes.exigeMedicao !== false;
  medicoes = medicoes || [];
  const cont = { C: 0, NC: 0, NA: 0, NV: 0 };
  checklist.forEach(c => { cont[c.situacao] = (cont[c.situacao] || 0) + 1; });
  const porP = { P1: 0, P2: 0, P3: 0, P4: 0 };
  ncs.forEach(n => { porP[n.prioridade] = (porP[n.prioridade] || 0) + 1; });
  const medidos = medicoes.filter(m => m.resultado && m.resultado !== 'NV');
  const medicoesNc = medicoes.filter(m => m.resultado === 'NC').length;
  const semEnsaios = exigeMedicao && medicoes.length === 0;
  const pendentes = cont.NV + medicoes.filter(m => !m.resultado || m.resultado === 'NV').length + (semEnsaios ? 1 : 0);
  let situacao;
  let texto;
  if ((ncs.length || medicoesNc) && pendentes) {
    situacao = 'NAO_CONFORME_PRELIMINAR';
    texto = 'NÃO CONFORME (preliminar) — há não conformidades constatadas e itens ainda não verificados; o parecer final depende da conclusão da inspeção'
      + (semEnsaios ? ' e dos ensaios/medições, que não foram registrados' : '');
  } else if (ncs.length || medicoesNc) {
    situacao = 'NAO_CONFORME';
    texto = 'NÃO CONFORME — corrigir as não conformidades nos prazos indicados e reinspecionar os itens corrigidos';
  } else if (semEnsaios) {
    situacao = 'INCONCLUSIVO';
    texto = 'INCONCLUSIVO — nenhum ensaio/medição foi registrado; a inspeção visual sozinha não sustenta a conformidade da instalação';
  } else if (pendentes) {
    situacao = 'INCONCLUSIVO';
    texto = 'INCONCLUSIVO — há itens ou medições não verificados';
  } else {
    situacao = 'CONFORME';
    texto = 'CONFORME — a instalação atende aos requisitos verificados';
  }
  return { cont, porP, medidos: medidos.length, dentro: medidos.filter(m => m.resultado === 'C').length, medicoesNc, pendentes, semEnsaios, situacao, texto };
}

module.exports = { PRAZOS, mesclarChecklist, consolidarNcs, parecer };
