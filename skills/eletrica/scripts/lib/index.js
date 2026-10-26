// Disciplina ELÉTRICA PREDIAL (NBR 5410:2004 / NR-10) — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const B = require('../../../_comum/docx-base');
const T = require('./tabelas');
const { calcular } = require('./calculo');
const { gerarPlanilhaQuadro } = require('./planilhaQuadro');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-residencia.json');

const NORMAS = [
  ['ABNT NBR 5410:2004 (versão corrigida 2008)', 'Instalações elétricas de baixa tensão'],
  ['ABNT NBR 14136', 'Plugues e tomadas para uso doméstico e análogo'],
  ['ABNT NBR NM 60898', 'Disjuntores para proteção de sobrecorrentes'],
  ['ABNT NBR 5419:2026', 'Proteção contra descargas atmosféricas (interface SPDA/DPS)'],
  ['NR-10', 'Segurança em instalações e serviços em eletricidade'],
  ['Norma técnica da distribuidora local', 'Padrão de entrada e cálculo de demanda (no DF: Neoenergia DIS-NOR-030/053)'],
];
const SECOES_CHECKLIST = ['Documentação', 'Quadros', 'Proteção', 'Condutores', 'Tomadas e pontos', 'Aterramento', 'Segurança NR-10'];

const num = (v, c = 2) => (v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));
const sec = (s) => (s == null ? '—' : `${String(s).replace('.', ',')} mm²`);

// ── Inspeção (laudo NBR 5410 seção 7 / NR-10) ───────────────────────────────

function minimoIsolamento(tensao) {
  return T.ISOLAMENTO.find(x => (Number(tensao) || 220) <= x.ate);
}

function medicoes(insp) {
  const isolamento = (insp.isolamento || []).map(m => {
    const lim = minimoIsolamento(m.tensao_v);
    const v = m.valor_mohm;
    return { ...m, criterio: `≥ ${num(lim.minimo)} MΩ a ${lim.tensaoEnsaio} V CC (Tabela 60)`, resultado: v == null || v === '' ? 'NV' : Number(v) >= lim.minimo ? 'C' : 'NC' };
  });
  const continuidade = (insp.continuidade_pe || []).map(m => ({
    ...m, criterio: 'Continuidade confirmada; ≤ 1 Ω adotado como referência (7.3.2)',
    resultado: m.valor_ohm == null || m.valor_ohm === '' ? 'NV' : Number(m.valor_ohm) <= 1 ? 'C' : 'NC',
  }));
  const dr = (insp.ensaios_dr || []).map(m => ({
    ...m, criterio: 'Disparo em IΔn em até 300 ms (IEC 61008/61009) e botão de teste funcionando',
    resultado: m.tempo_ms == null || m.tempo_ms === '' ? 'NV' : (Number(m.tempo_ms) <= 300 && m.botao_teste !== false) ? 'C' : 'NC',
  }));
  return { isolamento, continuidade, dr, aterramento: insp.aterramento || [] };
}

function processar(dados) {
  const calc = calcular(dados);
  const insp = dados.inspecao || {};
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, {});
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const med = medicoes(insp);
  const parecer = I.parecer(checklist, ncs, [...med.isolamento, ...med.continuidade, ...med.dr]);
  return { dados, calc, insp, checklist, ncs, med, parecer };
}

// ── Resumo para a tela ──────────────────────────────────────────────────────

function resumir(res) {
  const { calc } = res;
  const a = calc.alimentador;
  const temInspecao = (res.insp.checklist || []).length || (res.insp.isolamento || []).length;
  return {
    indicadores: [
      { rotulo: 'Potência instalada', valor: `${num(calc.demanda.instaladaVa / 1000)} kVA`, detalhe: `${calc.circuitos.length} circuitos` },
      { rotulo: 'Demanda (fatores típicos)', valor: `${num(calc.demanda.demandaVa / 1000)} kVA`, detalhe: `FD ilum/TUG ${num(calc.demanda.fdIlumTug)} · TUE ${num(calc.demanda.fdTue)}` },
      { rotulo: 'Alimentador', valor: `${sec(a.secao)} · ${a.disjuntor} A`, detalhe: `Ib ${num(a.ib, 1)} A · ΔV ${num(a.queda)} %` },
      { rotulo: 'Queda de tensão total', valor: `${num(calc.quedaTotal)} %`, ok: calc.quedaTotal <= (calc.config.pontoEntrega === 'trafo' ? 7 : 5), detalhe: `maior circuito terminal ${num(calc.maiorQueda)} %` },
      { rotulo: 'Quadro', valor: `${calc.quadro.modulos} módulos`, detalhe: `${calc.quadro.circuitos} circuitos + ${calc.quadro.reserva} reserva (Tab. 59)` },
      { rotulo: 'Balanceamento', valor: `${num(calc.fases.desequilibrio * 100, 0)} %`, ok: calc.fases.desequilibrio <= 0.2, detalhe: Object.entries(calc.fases.carga).map(([f, v]) => `${f} ${num(v / 1000)} kVA`).join(' · ') },
      ...(temInspecao ? [{ rotulo: 'Parecer da inspeção', valor: res.parecer.situacao.replace(/_/g, ' '), ok: res.parecer.situacao === 'CONFORME' ? true : res.parecer.situacao === 'INCONCLUSIVO' ? undefined : false, detalhe: `NC ${res.parecer.cont.NC} · NV ${res.parecer.cont.NV}` }] : []),
    ],
    textos: calc.avisos,
    // valores que a tela copia para o formulário ("Trazer os circuitos calculados" / "Trazer os fatores padrão")
    preencher: {
      circuitos: calc.circuitos.map(c => ({
        id: c.id, descricao: c.descricao, tipo: c.tipo, ligacao: c.ligacao, fases: c.fases_fixas || '', // fase automática continua automática
        potencia_va: Math.round(c.potencia_va), comprimento_m: c.comprimento, metodo: c.metodo === calc.config.metodo ? '' : c.metodo,
        agrupamento: c.agrupamento ?? null, disjuntor: c.disjuntorFixo ? c.disjuntor : null, secao: c.secaoFixa ? c.secao : null,
        dr: !!c.dr, ambientes: (c.ambientes || []).join(', '),
      })),
      fd_ilum_tug: calc.config.fdIlumTug.map(l => ({ ate_kw: l.ate_kw, fator: l.fator })),
      fd_tue: calc.config.fdTue.map(l => ({ ate_qtd: l.ate_qtd, fator: l.fator })),
    },
    tabelas: [
      { titulo: 'Quadro de cargas', colunas: ['Circ.', 'Descrição', 'VA', 'W', 'Lig.', 'Fases', 'Ib (A)', 'L (m)', 'FCT·FCA', 'Disj.', 'Seção F/N/PE', 'Iz (A)', 'ΔV %', 'DR', 'Critério'],
        linhas: calc.circuitos.map(c => [c.id, c.descricao, num(c.potencia_va, 0), num(c.potencia_w, 0), c.ligacao, c.fases, num(c.ib, 1), num(c.comprimento, 0), num(c.fct * c.fca), `${c.polos}P ${c.disjuntor} A`,
          `${sec(c.secao)} / ${c.secaoNeutro ? sec(c.secaoNeutro) : '—'} / ${sec(c.secaoPE)}`, num(c.iz, 1), num(c.queda), c.dr ? (c.drObrigatorio ? 'sim (obrig.)' : 'sim') : '—', c.criterio]) },
      { titulo: 'Demanda e alimentador', colunas: ['Item', 'Valor'],
        linhas: [
          ['Iluminação + TUG instalada', `${num(calc.demanda.ilumTugVa, 0)} VA × FD ${num(calc.demanda.fdIlumTug)}${calc.config.fdIlumTugFixo != null ? ' (fixo)' : ''}`],
          ['TUE instalada', `${num(calc.demanda.tueVa, 0)} VA (${calc.demanda.nTue}) × FD ${num(calc.demanda.fdTue)}${calc.config.fdTueFixo != null ? ' (fixo)' : ''}`],
          ['Demanda', `${num(calc.demanda.demandaVa, 0)} VA = ${num(calc.demanda.demandaKw)} kW`],
          ['Alimentador', `${sec(calc.alimentador.secao)} · disjuntor ${calc.alimentador.polos}P ${calc.alimentador.disjuntor} A · Ib ${num(calc.alimentador.ib, 1)} A · ΔV ${num(calc.alimentador.queda)} %`],
          ['Cargas por fase', Object.entries(calc.fases.carga).map(([f, v]) => `${f} ${num(v, 0)} VA`).join(' · ')],
        ] },
      { titulo: 'Previsão de cargas por ambiente (9.5.2)', colunas: ['Ambiente', 'Tipo', 'Área (m²)', 'Iluminação (VA)', 'Tomadas', 'TUG (VA)', 'TUEs'],
        linhas: calc.previsao.map(p => [p.nome, p.tipo, num(p.area_m2), num(p.iluminacao, 0), p.nTug, num(p.tugVa, 0), p.tues.map(t => `${t.descricao} ${num(t.potencia_w, 0)} W`).join('; ') || '—']) },
    ],
  };
}

// ── Documentos ──────────────────────────────────────────────────────────────

function secoesMemorial(res) {
  const { calc } = res;
  const c = calc.config;
  const a = calc.alimentador;
  return [
    { titulo: '1. Objeto e premissas', paragrafos: [
      `Projeto das instalações elétricas de baixa tensão de ${res.dados.obra?.nome || 'a edificação'}, conforme a ABNT NBR 5410:2004. Alimentação ${c.sistema} ${c.vfn}/${c.vff} V, esquema de aterramento ${c.esquema}, ponto de entrega ${c.pontoEntrega === 'trafo' ? 'em transformador próprio (queda total ≤ 7 %)' : 'em baixa tensão (queda total ≤ 5 %)'}.`,
      `Condutores de cobre com isolação ${c.isolacao === 'PVC' ? 'PVC 70 °C' : 'EPR/XLPE 90 °C'}, método de instalação de referência ${c.metodo} (${T.METODOS[c.metodo]}), temperatura ambiente ${c.temperatura} °C, ${c.agrupamento} circuito(s) agrupado(s) no trecho mais carregado.`,
    ] },
    { titulo: '2. Previsão de cargas (NBR 5410, 9.5.2)', paragrafos: [
      'Iluminação: 100 VA para os primeiros 6 m² e mais 60 VA a cada 4 m² inteiros (9.5.2.1.2). Tomadas: banheiro ≥ 1; cozinha e área de serviço 1 a cada 3,5 m de perímetro; salas e dormitórios 1 a cada 5 m; demais cômodos conforme a área (9.5.2.2.1). Potência: 600 VA nas três primeiras tomadas (duas, se o conjunto passar de seis) de banheiros, cozinhas e áreas de serviço e 100 VA nas demais (9.5.2.2.2).',
    ],
    tabela: { colunas: ['Ambiente', 'Área (m²)', 'Perímetro (m)', 'Iluminação (VA)', 'Tomadas', 'TUG (VA)', 'TUE'],
      linhas: calc.previsao.map(p => [p.nome, num(p.area_m2), num(p.perimetro_m), num(p.iluminacao, 0), p.nTug, num(p.tugVa, 0), p.tues.map(t => `${t.descricao} (${num(t.potencia_w, 0)} W)`).join('; ') || '—']),
      proporcoes: [1.6, 0.7, 0.8, 0.9, 0.7, 0.8, 2] } },
    { titulo: '3. Circuitos e dimensionamento (6.2.5 a 6.2.7)', paragrafos: [
      `Cada circuito atende simultaneamente: capacidade de condução corrigida Iz = I(tab) × FCT × FCA ≥ Ib (Tabelas 36 a 40 e 42), proteção Ib ≤ In ≤ Iz (5.3.4), seção mínima da Tabela 47 e queda de tensão ≤ ${num(c.quedaTerminal)} % nos circuitos terminais (6.2.7.2), calculada por ΔV% = k·ρ·L·Ib/(S·V)·100 com ρ = ${String(T.RHO_COBRE).replace('.', ',')} Ω·mm²/m. FCT = ${num(calc.circuitos[0]?.fct)} (${c.temperatura} °C), FCA conforme o agrupamento.`,
      calc.circuitosSugeridos ? 'Circuitos definidos automaticamente pelas regras de 9.5.3 (tomadas de cozinha/serviço exclusivas, TUE independentes) com comprimento médio adotado — [CONFERIR] comprimentos reais no projeto.' : 'Circuitos conforme definidos no projeto.',
    ],
    tabela: { colunas: ['Circ.', 'Descrição', 'VA', 'Lig.', 'Ib (A)', 'L (m)', 'Seção fase/N/PE', 'Iz (A)', 'Disj.', 'ΔV %', 'DR'],
      linhas: calc.circuitos.map(x => [x.id, x.descricao, num(x.potencia_va, 0), x.ligacao, num(x.ib, 1), num(x.comprimento, 0), `${sec(x.secao)} / ${x.secaoNeutro ? sec(x.secaoNeutro) : '—'} / ${sec(x.secaoPE)}`, num(x.iz, 1), `${x.polos}P ${x.disjuntor} A`, num(x.queda), x.dr ? 'sim' : '—']),
      proporcoes: [0.4, 2.2, 0.6, 0.4, 0.55, 0.45, 1.4, 0.55, 0.8, 0.5, 0.4], tamanho: 14 } },
    { titulo: '4. Proteção diferencial e contra surtos', paragrafos: [
      `DR de alta sensibilidade (IΔn ≤ 30 mA) nos circuitos que servem banheiros, cozinhas, áreas de serviço, garagens e áreas externas (5.1.3.2.2): ${calc.circuitos.filter(x => x.dr).map(x => x.id).join(', ') || 'nenhum'}.`,
      `DPS classe II no quadro de distribuição (6.3.5.2.2): ${calc.quadro.dpsQtd} unidade(s), Uc ≥ ${calc.quadro.dpsUc} V (Tabela 49: Uc ≥ 1,1·Uo), In ≥ 20 kA (8/20 µs). Se a edificação tiver SPDA, coordenar com a NBR 5419-4 (DPS classe I na entrada).`,
    ] },
    { titulo: '5. Balanceamento, demanda e alimentador', paragrafos: [
      `Distribuição de cargas por fase: ${Object.entries(calc.fases.carga).map(([f, v]) => `fase ${f} ${num(v / 1000)} kVA`).join('; ')} (desequilíbrio ${num(calc.fases.desequilibrio * 100, 0)} %).`,
      `Potência instalada ${num(calc.demanda.instaladaVa / 1000)} kVA. Demanda = iluminação e tomadas ${num(calc.demanda.ilumTugVa / 1000)} kVA × ${num(calc.demanda.fdIlumTug)} + ${calc.demanda.nTue} TUE ${num(calc.demanda.tueVa / 1000)} kVA × ${num(calc.demanda.fdTue)} = ${num(calc.demanda.demandaVa / 1000)} kVA. [CONFERIR os fatores de demanda com a norma da distribuidora — a NBR 5410 não os define (4.2.3).]`,
      `Alimentador: Ib = ${num(a.ib, 1)} A, cabo ${sec(a.secao)} (Iz = ${num(a.iz, 1)} A), disjuntor geral ${a.polos}P ${a.disjuntor} A, ${num(a.comprimento, 0)} m, queda ${num(a.queda)} %. Queda total até o circuito mais desfavorável: ${num(calc.quedaTotal)} %.`,
      `Quadro de distribuição com ${calc.quadro.circuitos} circuitos e reserva mínima de ${calc.quadro.reserva} (Tabela 59), ${calc.quadro.modulos} módulos DIN.`,
    ] },
    { titulo: '6. Lista de materiais (preliminar)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 1), m.referencia]), proporcoes: [0.8, 4, 0.5, 0.6, 1.6] },
      notas: ['Cabos com 10 % de folga. Eletrodutos estimados pelo comprimento dos circuitos — confirmar no projeto executivo.'] },
    { titulo: 'Avisos', marcadores: calc.avisos },
  ];
}

function cfgLaudo(res) {
  const { calc, med } = res;
  return {
    titulo: 'LAUDO TÉCNICO DE INSPEÇÃO DAS INSTALAÇÕES ELÉTRICAS',
    tipoInspecao: `Verificação conforme a ABNT NBR 5410:2004, Seção 7, e a NR-10 — ${({ inicial: 'verificação inicial', periodica: 'inspeção periódica', reforma: 'após reforma/ampliação' })[res.insp.tipo] || 'inspeção periódica'}`,
    tituloCurto: 'Laudo de inspeção — instalações elétricas',
    sigla: 'LAUDO-ELE',
    objetivo: 'Este laudo registra a inspeção visual e os ensaios das instalações elétricas de baixa tensão conforme a Seção 7 da ABNT NBR 5410:2004 e as exigências da NR-10, com as não conformidades encontradas, recomendações e prazos.',
    listaNormas: NORMAS,
    secoesChecklist: SECOES_CHECKLIST,
    descricao: [
      ['Alimentação', `${calc.config.sistema} ${calc.config.vfn}/${calc.config.vff} V — esquema ${calc.config.esquema}`],
      ['Potência instalada / demanda', `${num(calc.demanda.instaladaVa / 1000)} kVA / ${num(calc.demanda.demandaVa / 1000)} kVA`],
      ['Quadros e circuitos', `${calc.circuitos.length} circuitos terminais`],
    ],
    metodologia: [
      'Inspeção visual (7.2) antes dos ensaios, com a instalação desenergizada quando necessário.',
      'Continuidade dos condutores de proteção e das equipotencializações (7.3.2).',
      'Resistência de isolamento com megôhmetro em tensão contínua, valores mínimos da Tabela 60 (7.3.3).',
      'Ensaio de funcionamento dos dispositivos DR (corrente IΔn e botão de teste) e verificação do seccionamento automático (7.3.5).',
      'Segurança: desenergização, bloqueio e sinalização conforme NR-10 (10.5), EPI/EPC adequados.',
    ],
    medicoes: [
      { titulo: '6.1 Resistência de isolamento (7.3.3 e Tabela 60)', colunas: ['Circuito', 'Tensão nominal (V)', 'Medido (MΩ)', 'Critério', 'Resultado'], proporcoes: [1.6, 0.9, 0.9, 2.2, 0.8],
        linhas: med.isolamento.map(m => [m.circuito, num(m.tensao_v, 0), m.valor_mohm ?? '', m.criterio, m.resultado]) },
      { titulo: '6.2 Continuidade dos condutores de proteção (7.3.2)', colunas: ['Ponto', 'Medido (Ω)', 'Critério', 'Resultado'], proporcoes: [2, 0.9, 2.6, 0.8],
        linhas: med.continuidade.map(m => [m.ponto, m.valor_ohm ?? '', m.criterio, m.resultado]) },
      { titulo: '6.3 Ensaio dos dispositivos DR', colunas: ['Circuito', 'IΔn (mA)', 'Tempo (ms)', 'Critério', 'Resultado'], proporcoes: [1.5, 0.7, 0.7, 2.4, 0.8],
        linhas: med.dr.map(m => [m.circuito, m.corrente_ma ?? 30, m.tempo_ms ?? '', m.criterio, m.resultado]) },
      ...(med.aterramento.length ? [{ titulo: '6.4 Resistência de aterramento (informativa)', colunas: ['Ponto', 'Método', 'Medido (Ω)'], proporcoes: [2, 2, 1],
        linhas: med.aterramento.map(m => [m.ponto, m.metodo || 'queda de potencial', m.valor_ohm ?? '']), nota: 'Valor informativo; no esquema TT verificar RA × IΔn ≤ 50 V (5.1.2.2.4.3).' }] : []),
    ],
    conclusoes: ['As instalações elétricas devem ser mantidas em estado de conservação e funcionamento, com inspeções periódicas registradas (NR-10, 10.4.4).'],
    proximaInspecao: [
      ['Inspeção periódica recomendada', 'Conforme o plano de manutenção (NBR 5410, 8.1); para instalações com carga > 75 kW, manter o prontuário NR-10 atualizado'],
      ['Ensaio de DR', 'Botão de teste mensal pelo usuário; ensaio com instrumento na inspeção periódica'],
    ],
  };
}

function cfgChecklist(res) {
  const { calc } = res;
  return {
    titulo: 'CHECKLIST DE CAMPO — INSTALAÇÕES ELÉTRICAS', subtitulo: 'ABNT NBR 5410:2004, Seção 7 — NR-10', tituloCurto: 'Checklist de campo — elétrica',
    secoesChecklist: SECOES_CHECKLIST,
    preparacao: [
      'APR e permissão de trabalho; desenergização, bloqueio e sinalização (NR-10, 10.5) antes de abrir quadros.',
      'Levar: megôhmetro (500 V CC), terrômetro, testador de DR, alicate amperímetro, testador de tomadas, termovisor (se houver), câmera.',
    ],
    referencias: [
      ['Alimentador', `${sec(calc.alimentador.secao)} / disjuntor ${calc.alimentador.disjuntor} A`],
      ['Circuitos previstos', `${calc.circuitos.length} + ${calc.quadro.reserva} reserva`],
      ['Resistência de isolamento mínima', '0,5 MΩ a 500 V CC (circuitos até 500 V)'],
    ],
    medicoes: [
      { titulo: 'Resistência de isolamento', colunas: ['Circuito', 'Tensão (V)', 'Medido (MΩ)', 'Obs.'], proporcoes: [2, 1, 1, 2], linhas: calc.circuitos.map(x => [`${x.id} — ${x.descricao}`.slice(0, 60), x.tensao, '', '']) },
      { titulo: 'Ensaio de DR', colunas: ['Circuito', 'IΔn (mA)', 'Tempo (ms)', 'Botão de teste'], proporcoes: [2, 1, 1, 1], linhas: calc.circuitos.filter(x => x.dr).map(x => [`${x.id} — ${x.descricao}`.slice(0, 60), 30, '', '☐ ok']) },
    ],
  };
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial descritivo e de cálculo', formato: 'Word', nome: 'Memorial_Eletrico',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO E DE CÁLCULO — INSTALAÇÕES ELÉTRICAS', subtitulo: 'ABNT NBR 5410:2004 (versão corrigida 2008)', tituloCurto: 'Memorial — instalações elétricas', sigla: 'MEM-ELE', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  // quadro de cargas com as fórmulas da NBR 5410 vivas e campos editáveis (ver planilhaQuadro.js)
  { tipo: 'planilha', rotulo: 'Quadro de cargas (Excel com fórmulas editáveis)', formato: 'Excel', nome: 'Quadro_de_Cargas',
    gerar: (res) => gerarPlanilhaQuadro(res) },
  { tipo: 'laudo', rotulo: 'Laudo de inspeção (NBR 5410 / NR-10)', formato: 'Word', nome: 'Laudo_Eletrico',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, cfgLaudo(res), { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Eletrico',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, cfgChecklist(res), res.checklist)) },
];

// ── Orçamento ───────────────────────────────────────────────────────────────

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const obra = dados.obra?.nome || dados.cliente?.nome || 'a edificação';
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade, subgrupo = 'Elétrica') => ({ secao: S, subgrupo, codigo, descricao, quantidade, unidade });
  if (modo === 'execucao') {
    const nTug = calc.previsao.reduce((s, a) => s + a.nTug, 0);
    const nAmb = calc.previsao.length;
    const nTue = calc.circuitos.filter(x => x.tipo === 'tue').length;
    const nDisp = calc.circuitos.length + calc.circuitos.filter(x => x.dr).length + 1;
    return {
      cliente_nome: dados.cliente?.nome || '',
      escopo: `Execução das instalações elétricas de baixa tensão de ${obra} conforme ABNT NBR 5410: ${calc.circuitos.length} circuitos terminais, quadro de distribuição de ${calc.quadro.modulos} módulos com DR e DPS, alimentador ${sec(calc.alimentador.secao)} com disjuntor geral de ${calc.alimentador.disjuntor} A, pontos de iluminação e tomadas conforme previsão de cargas.`,
      observacoes: 'Rascunho gerado pela skill de elétrica predial — conferir quantidades e preços antes de enviar ao cliente.',
      itens: [
        ...calc.materiais.filter(m => m.quantidade > 0).map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Elétrica', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
        srv('ele_qdg', 'Instalação de quadro de distribuição (montagem, barramentos e identificação)', 1, 'un'),
        srv('ele_disjuntores', 'Instalação de disjuntores, DR e DPS', nDisp + calc.quadro.dpsQtd, 'un'),
        srv('ele_eletrodutos', 'Passagem de eletrodutos e fiação dos circuitos', 1, 'vb'),
        srv('ele_tomada_baixa', 'Instalação de pontos de tomada', nTug, 'un'),
        srv('ele_interruptor', 'Instalação de interruptores', nAmb, 'un'),
        srv('ele_ponto_energia', 'Instalação de pontos de luz e de força (TUE)', nAmb + nTue, 'un'),
        srv('ele_projeto', 'Projeto elétrico executivo com memorial e ART', 1, 'vb'),
      ],
    };
  }
  const nIso = Math.max(1, (res.insp.isolamento || []).length || calc.circuitos.length);
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: `Inspeção das instalações elétricas de ${obra} conforme a Seção 7 da ABNT NBR 5410 e a NR-10, com inspeção visual, ensaios de continuidade, resistência de isolamento e dispositivos DR, e emissão de laudo técnico com ART.${res.ncs.length ? ` Inclui a correção das ${res.ncs.length} não conformidades apontadas (itens a cotar).` : ''}`,
    observacoes: 'Rascunho gerado pela skill de elétrica predial — conferir antes de enviar ao cliente.',
    itens: [
      srv('ele_inspecao', 'Inspeção visual das instalações elétricas (NBR 5410, 7.2 / NR-10)', 1, 'vb', 'Laudo elétrico'),
      srv('ele_ensaio_isolamento', 'Ensaios de resistência de isolamento, continuidade do PE e DR (por circuito)', nIso, 'un', 'Laudo elétrico'),
      srv('ele_laudo', 'Laudo técnico das instalações elétricas com ART', 1, 'vb', 'Laudo elétrico'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' })),
    ],
  };
}

// ── Formulário da tela ─────────────────────────────────────────────────────

const OP = {
  tensoes: F.op([['127', '127 V (F-N)'], ['220', '220 V (F-N)']]),
  tensoesFF: F.op([['220', '220 V (F-F)'], ['380', '380 V (F-F)']]),
  sistema: F.op([['monofasico', 'Monofásico (F+N)'], ['bifasico', 'Bifásico (2F+N)'], ['trifasico', 'Trifásico (3F+N)']]),
  esquema: F.op([['TN-S', 'TN-S'], ['TN-C-S', 'TN-C-S'], ['TT', 'TT']]),
  entrega: F.op([['bt', 'Em baixa tensão (queda total ≤ 5 %)'], ['trafo', 'Transformador próprio (≤ 7 %)']]),
  isolacao: F.op([['PVC', 'PVC 70 °C (450/750 V)'], ['EPR', 'EPR/XLPE 90 °C (0,6/1 kV)']]),
  metodo: F.op(Object.entries(T.METODOS)),
  tipoAmb: F.op([['sala', 'Sala'], ['dormitorio', 'Dormitório'], ['cozinha', 'Cozinha / copa'], ['area_servico', 'Área de serviço / lavanderia'], ['banheiro', 'Banheiro'], ['varanda', 'Varanda'], ['garagem', 'Garagem'], ['externa', 'Área externa'], ['outros', 'Outros (escritório, circulação…)']]),
  ligacao: F.op([['FN', 'F-N'], ['FF', 'F-F'], ['FFF', '3F']]),
  tipoCirc: F.op([['iluminacao', 'Iluminação'], ['tug', 'TUG'], ['tue', 'TUE']]),
  fases: F.op([['', 'auto'], ['A', 'A'], ['B', 'B'], ['C', 'C'], ['AB', 'AB'], ['BC', 'BC'], ['AC', 'AC'], ['ABC', 'ABC']]),
  metodoCirc: F.op([['', 'padrão'], ...Object.keys(T.METODOS).map(k => [k, k])]),
  tipoInsp: F.op([['periodica', 'Inspeção periódica'], ['inicial', 'Verificação inicial (obra nova)'], ['reforma', 'Após reforma/ampliação']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Alimentação e critérios', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'instalacao.tensao_fn', rotulo: 'Tensão F-N', tipo: 'selecao', opcoes: OP.tensoes },
      { caminho: 'instalacao.tensao_ff', rotulo: 'Tensão F-F', tipo: 'selecao', opcoes: OP.tensoesFF },
      { caminho: 'instalacao.sistema', rotulo: 'Sistema', tipo: 'selecao', opcoes: OP.sistema },
      { caminho: 'instalacao.esquema', rotulo: 'Esquema de aterramento', tipo: 'selecao', opcoes: OP.esquema },
      { caminho: 'instalacao.ponto_entrega', rotulo: 'Ponto de entrega', tipo: 'selecao', opcoes: OP.entrega },
      { caminho: 'instalacao.isolacao', rotulo: 'Isolação dos cabos', tipo: 'selecao', opcoes: OP.isolacao },
      { caminho: 'instalacao.metodo', rotulo: 'Método de instalação', tipo: 'selecao', opcoes: OP.metodo },
      { caminho: 'instalacao.temperatura', rotulo: 'Temperatura ambiente (°C)', tipo: 'numero' },
      { caminho: 'instalacao.agrupamento', rotulo: 'Circuitos agrupados (pior trecho)', tipo: 'numero' },
      { caminho: 'instalacao.comprimento_medio_circuito_m', rotulo: 'Comprimento médio dos circuitos (m)', tipo: 'numero' },
      { caminho: 'instalacao.comprimento_alimentador_m', rotulo: 'Comprimento do alimentador (m)', tipo: 'numero' },
      { caminho: 'instalacao.fp', rotulo: 'Fator de potência médio', tipo: 'numero' },
      { caminho: 'instalacao.queda_max_terminal_pct', rotulo: 'Queda máx. circuito terminal (%)', tipo: 'numero', dica: 'NBR 5410 6.2.7.2: 4 %' },
      { caminho: 'instalacao.queda_max_alimentador_pct', rotulo: 'Queda máx. alimentador (%)', tipo: 'numero' },
      { caminho: 'instalacao.limite_circuito_tug_a', rotulo: 'Corrente máx. por circuito de TUG (A)', tipo: 'numero' },
      { caminho: 'instalacao.limite_circuito_iluminacao_a', rotulo: 'Corrente máx. por circuito de iluminação (A)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '3. Ambientes', aberta: true, itens: [
    { tipo: 'nota', texto: 'A previsão de iluminação e tomadas sai pela NBR 5410 (9.5.2) a partir da área e do perímetro. Use "tomadas extras" para pontos além do mínimo; "iluminação (VA)" e "TUG (VA)" substituem a potência mínima da norma pela adotada no projeto (vazio = mínimo da norma).' },
    { tipo: 'tabela', caminho: 'ambientes', rotuloAdicionar: 'Adicionar ambiente',
      novaLinha: { nome: '', tipo: 'sala', area_m2: null, perimetro_m: null, tugs_adicionais: 0, iluminacao_va: null, tug_va: null },
      colunas: [
        { campo: 'nome', rotulo: 'Ambiente' }, { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.tipoAmb, largura: 200 },
        { campo: 'area_m2', rotulo: 'Área (m²)', tipo: 'numero', largura: 90 }, { campo: 'perimetro_m', rotulo: 'Perímetro (m)', tipo: 'numero', largura: 100 },
        { campo: 'tugs_adicionais', rotulo: 'Tomadas extras', tipo: 'numero', largura: 90 }, { campo: 'iluminacao_va', rotulo: 'Iluminação (VA)', tipo: 'numero', largura: 110 },
        { campo: 'tug_va', rotulo: 'TUG (VA)', tipo: 'numero', largura: 100 },
      ] },
    { tipo: 'nota', texto: 'Equipamentos de uso específico (chuveiro, ar-condicionado, forno…). O nome do ambiente deve ser igual ao da tabela acima.' },
    { tipo: 'tabela', caminho: 'tues', rotuloAdicionar: 'Adicionar equipamento (TUE)',
      novaLinha: { ambiente: '', descricao: '', potencia_w: null, ligacao: 'FN', fp: 1 },
      colunas: [
        { campo: 'ambiente', rotulo: 'Ambiente' }, { campo: 'descricao', rotulo: 'Equipamento' },
        { campo: 'potencia_w', rotulo: 'Potência (W)', tipo: 'numero', largura: 100 }, { campo: 'ligacao', rotulo: 'Ligação', tipo: 'selecao', opcoes: OP.ligacao, largura: 90 },
        { campo: 'fp', rotulo: 'FP', tipo: 'numero', largura: 70 },
      ] },
  ] },
  { titulo: '4. Quadro de cargas — circuitos (editável)', itens: [
    { tipo: 'nota', texto: 'Vazio: o sistema divide os circuitos pelas regras de 9.5.3. Para editar o quadro, clique em "Calcular" e depois em "Trazer os circuitos calculados": a divisão automática vem para a tabela e cada campo pode ser alterado (descrição, potência, comprimento, fases, método, agrupamento, disjuntor, seção, DR). Campos vazios = calculados pela norma; disjuntor e seção informados são conferidos (Ib ≤ In ≤ Iz, Tabela 47, queda) e o que não atender aparece nos avisos. Em "Ambientes", liste os ambientes atendidos separados por vírgula (define o DR obrigatório).' },
    { tipo: 'tabela', caminho: 'circuitos', rotuloAdicionar: 'Adicionar circuito', preencherDe: 'circuitos', rotuloPreencher: 'Trazer os circuitos calculados',
      novaLinha: { id: '{n}', descricao: '', tipo: 'tug', ligacao: 'FN', fases: '', potencia_va: null, comprimento_m: null, metodo: '', agrupamento: null, disjuntor: null, secao: null, dr: false, ambientes: '' },
      colunas: [
        { campo: 'id', rotulo: 'Nº', largura: 50 }, { campo: 'descricao', rotulo: 'Descrição' },
        { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.tipoCirc, largura: 110 }, { campo: 'ligacao', rotulo: 'Lig.', tipo: 'selecao', opcoes: OP.ligacao, largura: 80 },
        { campo: 'fases', rotulo: 'Fases', tipo: 'selecao', opcoes: OP.fases, largura: 80 },
        { campo: 'potencia_va', rotulo: 'Potência (VA)', tipo: 'numero', largura: 100 }, { campo: 'comprimento_m', rotulo: 'Compr. (m)', tipo: 'numero', largura: 85 },
        { campo: 'metodo', rotulo: 'Método', tipo: 'selecao', opcoes: OP.metodoCirc, largura: 90 }, { campo: 'agrupamento', rotulo: 'Agrup.', tipo: 'numero', largura: 70 },
        { campo: 'disjuntor', rotulo: 'Disjuntor (A)', tipo: 'numero', largura: 90 }, { campo: 'secao', rotulo: 'Seção (mm²)', tipo: 'numero', largura: 90 },
        { campo: 'dr', rotulo: 'DR', tipo: 'check', largura: 50 }, { campo: 'ambientes', rotulo: 'Ambientes atendidos', largura: 200 },
      ] },
  ] },
  { titulo: '5. Fatores de demanda (concessionária)', itens: [
    { tipo: 'nota', texto: 'A NBR 5410 não define demanda (4.2.3). Um fator fixo abaixo vale para toda a carga daquele grupo; vazio = tabela por faixas. Sem faixas próprias valem fatores típicos de concessionária — "Trazer os fatores padrão" copia a tabela para editar (no DF, conferir com a Neoenergia DIS-NOR-030).' },
    { tipo: 'grade', colunas: 2, campos: [
      { caminho: 'instalacao.fd_ilum_tug_fixo', rotulo: 'Fator de demanda iluminação + TUG (fixo)', tipo: 'numero', dica: 'vazio = tabela por faixas de kW' },
      { caminho: 'instalacao.fd_tue_fixo', rotulo: 'Fator de demanda TUE (fixo)', tipo: 'numero', dica: 'vazio = tabela por quantidade' },
    ] },
    { tipo: 'tabela', caminho: 'instalacao.fd_ilum_tug', rotuloAdicionar: 'Adicionar faixa (iluminação e tomadas)', preencherDe: 'fd_ilum_tug', rotuloPreencher: 'Trazer os fatores padrão', novaLinha: { ate_kw: null, fator: null },
      colunas: [{ campo: 'ate_kw', rotulo: 'Carga até (kW)', tipo: 'numero' }, { campo: 'fator', rotulo: 'Fator de demanda', tipo: 'numero' }] },
    { tipo: 'tabela', caminho: 'instalacao.fd_tue', rotuloAdicionar: 'Adicionar faixa (TUE por quantidade)', preencherDe: 'fd_tue', rotuloPreencher: 'Trazer os fatores padrão', novaLinha: { ate_qtd: null, fator: null },
      colunas: [{ campo: 'ate_qtd', rotulo: 'Quantidade de TUE até', tipo: 'numero' }, { campo: 'fator', rotulo: 'Fator de demanda', tipo: 'numero' }] },
  ] },
  F.secaoInspecao(6, OP.tipoInsp),
  F.secaoChecklist(7, CHECKLIST.length),
  { titulo: '8. Ensaios (NBR 5410, 7.3)', itens: [
    { tipo: 'tabela', caminho: 'inspecao.isolamento', rotuloAdicionar: 'Adicionar medição de isolamento', novaLinha: { circuito: '', tensao_v: 220, valor_mohm: null },
      colunas: [{ campo: 'circuito', rotulo: 'Circuito' }, { campo: 'tensao_v', rotulo: 'Tensão nominal (V)', tipo: 'numero', largura: 130 }, { campo: 'valor_mohm', rotulo: 'Medido (MΩ)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'inspecao.continuidade_pe', rotuloAdicionar: 'Adicionar ponto de continuidade do PE', novaLinha: { ponto: '', valor_ohm: null },
      colunas: [{ campo: 'ponto', rotulo: 'Ponto (tomada/massa → BEP)' }, { campo: 'valor_ohm', rotulo: 'Medido (Ω)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'inspecao.ensaios_dr', rotuloAdicionar: 'Adicionar ensaio de DR', novaLinha: { circuito: '', corrente_ma: 30, tempo_ms: null, botao_teste: true },
      colunas: [{ campo: 'circuito', rotulo: 'Circuito / DR' }, { campo: 'corrente_ma', rotulo: 'IΔn (mA)', tipo: 'numero', largura: 90 }, { campo: 'tempo_ms', rotulo: 'Tempo (ms)', tipo: 'numero', largura: 100 }, { campo: 'botao_teste', rotulo: 'Botão ok', tipo: 'check', largura: 80 }] },
    { tipo: 'tabela', caminho: 'inspecao.aterramento', rotuloAdicionar: 'Adicionar medição de aterramento', novaLinha: { ponto: '', metodo: 'queda de potencial', valor_ohm: null },
      colunas: [{ campo: 'ponto', rotulo: 'Ponto' }, { campo: 'metodo', rotulo: 'Método' }, { campo: 'valor_ohm', rotulo: 'Medido (Ω)', tipo: 'numero', largura: 110 }] },
  ] },
  F.secaoNcs(9, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(10),
];

module.exports = criarDisciplina({
  chave: 'eletrica',
  nome: 'Elétrica predial (NBR 5410)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Execução da instalação', descricao: 'Materiais do dimensionamento (com preço do catálogo) e mão de obra de instalação' },
    { modo: 'inspecao', rotulo: 'Inspeção e laudo', descricao: 'Inspeção, ensaios, laudo NBR 5410/NR-10 e correção das não conformidades' },
  ],
  montarOrcamento,
});
