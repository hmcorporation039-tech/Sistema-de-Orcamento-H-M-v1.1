// Parecer do laudo de SPDA amarrado à análise de risco e aos ensaios
// (achado A2.1 da revisão de 27/10/2026). Antes, o laudo saía CONFORME com
// R1 = 5,84e-5 > RT = 1e-5, checklist todo C e 0 de 0 ensaios medidos, e o
// texto do objetivo afirmava que a continuidade elétrica tinha sido verificada.
//
// Regras:
//  1. R1 > RT (ou F > FT) no cenário ATUAL → NC automática no item D2
//     (análise de risco e seleção do NP), com o menor cenário que atende.
//  2. Nenhum ensaio de continuidade registrado → o parecer não pode ser
//     CONFORME (INCONCLUSIVO, ou NÃO CONFORME preliminar se houver NC).
//  3. O texto do laudo só afirma continuidade verificada se houve medição.
//
// Ligado em processar.js (envolve o objeto devolvido) e em doc-laudo.js
// (textos). É idempotente: aplicar duas vezes dá o mesmo resultado.

const PRAZOS_PADRAO = {
  P1: 'imediato (providência provisória em até 48 h)',
  P2: 'até 30 dias',
  P3: 'até 90 dias',
  P4: 'na próxima manutenção programada',
};

const ROTULO_NP = {
  nenhum: 'sem SPDA', IV: 'NP IV', III: 'NP III', II: 'NP II', I: 'NP I',
  I_descida_natural: 'NP I + descida natural', cobertura_metalica_natural: 'cobertura metálica natural',
};
const ROTULO_DPS = { 'III-IV': 'III-IV', II: 'II', I: 'I', melhor_I: 'melhor que I', melhor_I_max: 'melhor que I (PSPD 0,001)' };

const ORIGEM = 'analise_risco';
const exp = (v) => Number(v).toExponential(2).replace('.', ',');
const num = (v) => String(v).replace('.', ',');

function cenarioQueAtende(risco) {
  const m = risco.menorQueAtende;
  if (!m) return 'nenhum cenário da varredura atende — informar o proprietário e adotar o NP mais alto e as MPS possíveis (NBR 5419-2:2026, 5.4.6)';
  return `menor cenário que atende: SPDA ${ROTULO_NP[m.np_spda] || m.np_spda} + DPS ${ROTULO_DPS[m.dps_np] || m.dps_np}${m.fibra ? ' + fibra óptica nas linhas de sinal' : ''} (relatório de análise de risco)`;
}

// NCs que a análise de risco do cenário atual impõe (sem id/prazo ainda)
function ncsDoRisco(res) {
  const risco = res.risco;
  if (!risco || !risco.atual) return [];
  const a = risco.atual;
  const insp = (res.dados && res.dados.inspecao) || {};
  const spda = (res.dados && res.dados.spda) || {};
  const npAtual = ROTULO_NP[a.npSpda] || spda.np || a.npSpda;
  const lista = [];
  if (!a.atendeR1) {
    lista.push({
      item: 'D2', origem: ORIGEM, local: 'Estrutura — análise de risco (NBR 5419-2)',
      descricao: `Risco de perda de vida humana R1 = ${exp(a.R1)} acima do tolerável RT = ${exp(a.RT.R1)} com o SPDA e as MPS existentes (${npAtual})`,
      requisito: 'NBR 5419-2:2026, 5.4.4 (R ≤ RT)',
      recomendacao: `Adotar medidas de proteção até R1 ≤ RT — ${cenarioQueAtende(risco)}; adequar o projeto do SPDA/MPS, com ART.`,
      // [CONFERIR] prioridade: risco à vida acima do tolerável, mas a correção
      // exige projeto e obra — P2 por padrão, ajustável em inspecao.prioridade_risco
      prioridade: insp.prioridade_risco || 'P2', foto: '',
    });
  }
  if (!a.atendeF && a.piorF) {
    lista.push({
      item: 'D2', origem: ORIGEM, local: `Zona "${a.piorF.zona}" — frequência de danos`,
      descricao: `Frequência de danos F = ${exp(a.piorF.F)}/ano acima da tolerável FT = ${num(a.piorF.FT)}/ano com as MPS existentes`,
      requisito: 'NBR 5419-2:2026, Seção 7 (F ≤ FT)',
      recomendacao: `Adotar MPS (DPS coordenados, blindagem, roteamento) até F ≤ FT — ${cenarioQueAtende(risco)}.`,
      prioridade: insp.prioridade_frequencia || 'P3', foto: '',
    });
  }
  return lista;
}

function renumerar(ncs, prazos) {
  const ordem = { P1: 1, P2: 2, P3: 3, P4: 4 };
  return ncs
    .map((n, i) => ({ n, i }))
    .sort((x, y) => ((ordem[x.n.prioridade] || 9) - (ordem[y.n.prioridade] || 9)) || (x.i - y.i))
    .map(({ n }, i) => ({ ...n, id: `NC-${String(i + 1).padStart(2, '0')}`, prazo: prazos[n.prioridade] || '' }));
}

// Mesmo parecer de processar.js, com a regra dos ensaios: lista de ensaios
// vazia conta como pendência (laudo sem medição não sai CONFORME).
function parecerSpda(checklist, ncs, ensaios, motivosRisco = []) {
  const cont = { C: 0, NC: 0, NA: 0, NV: 0 };
  checklist.forEach(c => { cont[c.situacao] = (cont[c.situacao] || 0) + 1; });
  const porP = { P1: 0, P2: 0, P3: 0, P4: 0 };
  ncs.forEach(n => { porP[n.prioridade] = (porP[n.prioridade] || 0) + 1; });
  const medidos = ensaios.filter(e => e.resultado && e.resultado !== 'NV');
  const ensaiosNc = ensaios.filter(e => e.resultado === 'NC').length;
  const semEnsaios = ensaios.length === 0;
  const pendentes = cont.NV + ensaios.filter(e => !e.resultado || e.resultado === 'NV').length + (semEnsaios ? 1 : 0);
  const sufixoRisco = motivosRisco.length ? `. A análise de risco do cenário atual não atende (${motivosRisco.join('; ')})` : '';
  let texto;
  let situacao;
  if ((ncs.length || ensaiosNc) && pendentes) {
    situacao = 'NAO_CONFORME_PRELIMINAR';
    texto = 'NÃO CONFORME (preliminar) — há não conformidades constatadas e itens ainda não verificados'
      + (semEnsaios ? ', e nenhum ensaio de continuidade (Anexo F) foi registrado' : '')
      + '; o parecer final depende da conclusão da inspeção' + sufixoRisco;
  } else if (ncs.length || ensaiosNc) {
    situacao = 'NAO_CONFORME';
    texto = 'NÃO CONFORME — corrigir as não conformidades nos prazos indicados e reinspecionar os itens corrigidos' + sufixoRisco;
  } else if (semEnsaios) {
    situacao = 'INCONCLUSIVO';
    texto = 'INCONCLUSIVO — nenhum ensaio de continuidade elétrica (NBR 5419-3:2026, Anexo F) foi registrado; a inspeção visual sozinha não sustenta a conformidade do SPDA';
  } else if (pendentes) {
    situacao = 'INCONCLUSIVO';
    texto = 'INCONCLUSIVO — há itens ou ensaios não verificados';
  } else {
    situacao = 'CONFORME';
    texto = 'CONFORME — o SPDA atende à norma de origem e à NBR 5419-3:2026, Seção 7, nos itens verificados';
  }
  return { cont, porP, medidos: medidos.length, dentro: medidos.filter(e => e.resultado === 'C').length, ensaiosNc, pendentes, semEnsaios, situacao, texto };
}

// Recebe o objeto que processar() monta e devolve o mesmo objeto ajustado.
function aplicarParecerRisco(res) {
  if (!res || res.parecerRiscoAplicado) return res;
  const prazos = res.prazos || PRAZOS_PADRAO;
  const explicitas = ((res.dados && res.dados.inspecao && res.dados.inspecao.ncs) || []);
  const temExplicitaD2 = explicitas.some(n => n.item === 'D2');
  const doRisco = ncsDoRisco(res);
  let ncs = [...(res.ncs || [])];
  let checklist = res.checklist || [];
  const motivos = doRisco.map(n => n.requisito.includes('R ≤ RT') ? `R1 ${exp(res.risco.atual.R1)} > RT` : `F ${exp(res.risco.atual.piorF.F)} > FT ${num(res.risco.atual.piorF.FT)}`);
  if (doRisco.length && !ncs.some(n => n.origem === ORIGEM)) {
    if (!temExplicitaD2) {
      // a NC automática do checklist para D2 (sem descrição própria) dá lugar à do risco
      const auto = ncs.find(n => n.item === 'D2');
      ncs = ncs.filter(n => n.item !== 'D2');
      if (auto && auto.descricao && doRisco[0]) doRisco[0] = { ...doRisco[0], descricao: `${doRisco[0].descricao}. Obs. da inspeção: ${auto.descricao}`, foto: auto.foto || '' };
      ncs.push(...doRisco);
    }
    // checklist coerente com a NC: D2 não pode ficar C/NV com o risco não atendido
    checklist = checklist.map(c => (c.cod === 'D2' && c.situacao !== 'NC')
      ? { ...c, situacao: 'NC', obs: [c.obs, `Análise de risco: ${motivos.join('; ')} no cenário atual (NC automática).`].filter(Boolean).join(' ') }
      : c);
  }
  ncs = renumerar(ncs, prazos);
  const parecer = parecerSpda(checklist, ncs, res.ensaios || [], motivos);
  const avisosRisco = res.risco && res.risco.atual
    ? res.risco.atual.zonas.filter(z => z.ftIgnorado != null).map(z => `FT informado para "${z.zona.nome}" (${z.ftIgnorado}) ignorado — menos restritivo que o da norma (${num(z.ftNorma)}/ano).`)
    : [];
  return { ...res, checklist, ncs, parecer, avisosRisco, parecerRiscoAplicado: true };
}

// Textos do laudo que dependem de medição -------------------------------------

function houveEnsaio(res) {
  return (res.ensaios || []).some(e => e.resultado && e.resultado !== 'NV');
}

// Seção 2 (objetivo e escopo): só afirma continuidade verificada se houve ensaio.
function textoObjetivo(res) {
  const inicio = 'Este laudo registra a inspeção do Sistema de Proteção contra Descargas Atmosféricas (SPDA) da estrutura identificada no item 1, conforme a Seção 7 da ABNT NBR 5419-3:2026. ';
  const fim = ' O laudo também apresenta as não conformidades encontradas, com recomendação e prazo de correção.';
  if (houveEnsaio(res)) {
    return inicio + 'A inspeção verificou a conformidade da documentação existente com a norma de origem do projeto, o estado físico e a continuidade elétrica (ensaios do Anexo F) dos subsistemas de captação, descida, aterramento e equipotencialização e a condição dos dispositivos de ligação equipotencial indireta (DPS classe I e centelhadores).' + fim;
  }
  return inicio + 'A inspeção verificou a conformidade da documentação existente com a norma de origem do projeto, o estado físico dos subsistemas de captação, descida, aterramento e equipotencialização e a condição dos dispositivos de ligação equipotencial indireta (DPS classe I e centelhadores). A continuidade elétrica NÃO foi verificada por ensaio nesta emissão (nenhuma medição do Anexo F registrada) e fica como pendência para a conclusão do laudo.' + fim;
}

// Seção 11 (limitações): embutidos só "avaliados pelos ensaios" se houve ensaio.
function textoLimitacaoEmbutidos(res) {
  if (houveEnsaio(res)) {
    return 'A inspeção cobriu as partes acessíveis com segurança. Componentes embutidos, enterrados ou inacessíveis foram avaliados pelos ensaios de continuidade e pela documentação disponível, nos limites indicados na Seção 2.';
  }
  return 'A inspeção cobriu as partes acessíveis com segurança. Componentes embutidos, enterrados ou inacessíveis NÃO foram avaliados por ensaio de continuidade nesta emissão — apenas pela documentação disponível, nos limites indicados na Seção 2.';
}

module.exports = { aplicarParecerRisco, ncsDoRisco, parecerSpda, textoObjetivo, textoLimitacaoEmbutidos, houveEnsaio, ORIGEM };
