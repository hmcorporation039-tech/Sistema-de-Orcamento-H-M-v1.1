// Disciplina ELÉTRICA HOSPITALAR (NBR 13534:2008 + RDC 50/2002 + NBR 5410) —
// contrato do sistema (ver skills/_comum/disciplina.js). Os circuitos usam o
// motor da skill de elétrica predial; aqui ficam os requisitos específicos de
// estabelecimentos assistenciais de saúde.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { fmtNum } = require('../../../_comum/docx-base');
const T = require('../../../_comum/eletrico/tabelas');
const C = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-hospital.json');

const NORMAS = [
  ['ABNT NBR 13534:2008', 'Instalações elétricas de baixa tensão — requisitos específicos para instalação em estabelecimentos assistenciais de saúde (base IEC 60364-7-710:2002; cláusulas "710.x" citadas pela numeração da IEC — [CONFERIR] a numeração no texto da NBR)'],
  ['Anvisa RDC 50/2002', 'Regulamento técnico para planejamento, programação, elaboração e avaliação de projetos físicos de EAS (tipos de ambiente e instalações elétricas)'],
  ['ABNT NBR 5410:2004 (versão corrigida 2008)', 'Instalações elétricas de baixa tensão (dimensionamento dos circuitos, proteção, ensaios — Seção 7)'],
  ['IEC 61558-2-15', 'Transformadores de separação para alimentação de locais médicos'],
  ['IEC 61557-8', 'Dispositivos supervisores de isolamento (DSI) para sistemas IT'],
  ['ABNT NBR IEC 60601-1', 'Equipamento eletromédico — requisitos gerais (interface com a instalação)'],
  ['ABNT NBR 14136', 'Plugues e tomadas para uso doméstico e análogo'],
  ['ABNT NBR 13248', 'Cabos de potência e controle com baixa emissão de fumaça e gases tóxicos (não halogenados)'],
  ['ABNT NBR 10898', 'Sistema de iluminação de emergência'],
  ['NR-10', 'Segurança em instalações e serviços em eletricidade'],
];
const SECOES_CHECKLIST = ['Documentação', 'Classificação dos locais', 'Sistema IT médico', 'Proteção e circuitos', 'Equipotencialização', 'Tomadas e identificação', 'Fonte de segurança', 'Iluminação de segurança'];

const num = fmtNum; // número pt-BR; '—' quando vazio ou inválido
const sec = (s) => (s == null ? '—' : `${String(s).replace('.', ',')} mm²`);
const kva = (va) => `${num(va / 1000)} kVA`;
const classeCurta = (k) => (C.CLASSES[k] || C.CLASSES['']).curto;
const sim = (v) => (v ? 'sim' : '—');
const ROTULO_TIPO = { iluminacao: 'Iluminação', tug: 'Tomadas', tue: 'Exclusivo', alimentador: 'Alimentador' };

// ── Inspeção (verificação inicial / periódica — 710.61 e 710.62) ───────────

function medicoes(insp, calc) {
  const isolamento = (insp.isolamento || []).map(m => {
    const lim = T.ISOLAMENTO.find(x => (Number(m.tensao_v) || 220) <= x.ate);
    const v = m.valor_mohm;
    return { ...m, criterio: `≥ ${num(lim.minimo)} MΩ a ${lim.tensaoEnsaio} V CC (NBR 5410, Tabela 60)`, resultado: v == null || v === '' ? 'NV' : Number(v) >= lim.minimo ? 'C' : 'NC' };
  });
  const equipotencializacao = (insp.equipotencializacao || []).map(m => {
    const a = calc.ambientes.find(x => x.nome === String(m.ambiente || '').trim());
    const ref = a && a.grupo === 2 ? '≤ 0,2 Ω (grupo 2 — 710.413.1.6)' : '≤ 0,2 Ω (referência adotada para o grupo 1) [CONFERIR]';
    return { ...m, criterio: ref, resultado: m.valor_ohm == null || m.valor_ohm === '' ? 'NV' : Number(m.valor_ohm) <= C.BEL.limiteOhm ? 'C' : 'NC' };
  });
  const dsi = (insp.dsi || []).map(m => {
    const falhas = [];
    if (m.ajuste_kohm != null && m.ajuste_kohm !== '' && Number(m.ajuste_kohm) < C.DSI.alarmeMinKohm) falhas.push(`ajuste ${m.ajuste_kohm} kΩ < 50 kΩ`);
    if (m.alarme_visual === false) falhas.push('sinal amarelo não funcionou');
    if (m.alarme_sonoro === false) falhas.push('alarme sonoro não funcionou');
    if (m.fuga_trafo_ma != null && m.fuga_trafo_ma !== '' && Number(m.fuga_trafo_ma) > C.IT.fugaMaxMa) falhas.push(`fuga do transformador ${m.fuga_trafo_ma} mA > 0,5 mA`);
    const semDado = m.ajuste_kohm == null || m.ajuste_kohm === '';
    return { ...m, criterio: 'Alarme ≥ 50 kΩ, sinais visual e sonoro, fuga do trafo ≤ 0,5 mA', falhas, resultado: falhas.length ? 'NC' : semDado ? 'NV' : 'C' };
  });
  const dr = (insp.ensaios_dr || []).map(m => ({
    ...m, criterio: 'Disparo em IΔn em até 300 ms, tipo A ou B (AC não permitido) e botão de teste ok',
    resultado: m.tempo_ms == null || m.tempo_ms === '' ? 'NV' : (Number(m.tempo_ms) <= 300 && m.botao_teste !== false && String(m.tipo || 'A').toUpperCase() !== 'AC') ? 'C' : 'NC',
  }));
  const comutacao = (insp.comutacao || []).map(m => {
    const cl = C.CLASSES[String(m.classe)] || C.CLASSES['15'];
    return { ...m, criterio: cl.limite != null ? `≤ ${num(cl.limite)} s (${cl.rotulo})` : cl.rotulo,
      resultado: m.tempo_s == null || m.tempo_s === '' ? 'NV' : cl.limite == null || Number(m.tempo_s) <= cl.limite ? 'C' : 'NC' };
  });
  return { isolamento, equipotencializacao, dsi, dr, comutacao };
}

function processar(dados) {
  const calc = C.calcular(dados);
  const insp = dados.inspecao || {};
  const temG2 = calc.ambientes.some(a => a.grupo === 2);
  const temG1 = calc.ambientes.some(a => a.grupo >= 1);
  const na = {};
  if (!calc.sistemas.length) ['IT1', 'IT2', 'IT3', 'IT4', 'IT5', 'IT6', 'IT7', 'IT8', 'P3', 'P4', 'T1', 'T2'].forEach(k => { na[k] = 'Sem locais do grupo 2 / sem sistema IT médico'; });
  if (!temG2) { na.E3 = 'Sem locais do grupo 2'; na.F1 = 'Sem locais do grupo 2'; }
  if (!temG1) ['E1', 'E2', 'E4', 'P2'].forEach(k => { na[k] = 'Sem locais dos grupos 1 e 2'; });
  if (!calc.ambientes.some(a => a.equipamentos.some(e => e.suporteVida))) na.F2 = 'Sem equipamentos de suporte à vida informados';
  // NC de projeto / situação existente / medições fora do critério viram NC do
  // checklist (se o engenheiro não marcou o item) — e daí NC no laudo e no orçamento
  const med = medicoes(insp, calc);
  const deMedicao = [
    ...med.dsi.filter(m => m.resultado === 'NC').map(m => ({ cod: m.falhas.some(f => /fuga/.test(f)) && m.falhas.length === 1 ? 'IT3' : 'IT4', local: m.sistema || 'DSI', texto: `Ensaio do DSI: ${m.falhas.join('; ')}.` })),
    ...med.equipotencializacao.filter(m => m.resultado === 'NC').map(m => ({ cod: 'E3', local: m.ambiente || 'Equipotencialização', texto: `${m.ponto || 'ponto'}: ${num(m.valor_ohm, 3)} Ω > 0,2 Ω.` })),
    ...med.dr.filter(m => m.resultado === 'NC').map(m => ({ cod: 'P2', local: m.circuito || 'DR', texto: `Ensaio do DR fora do critério (${m.tempo_ms} ms, tipo ${m.tipo || 'A'}).` })),
    ...med.comutacao.filter(m => m.resultado === 'NC').map(m => ({ cod: 'F4', local: m.fonte || 'Fonte de segurança', texto: `Comutação em ${num(m.tempo_s, 2)} s acima do limite da classe ${classeCurta(String(m.classe))}.` })),
    ...med.isolamento.filter(m => m.resultado === 'NC').map(m => ({ cod: 'P5', local: m.circuito || 'Isolamento', texto: `Resistência de isolamento ${num(m.valor_mohm, 3)} MΩ abaixo do mínimo.` })),
  ];
  const marcados = new Set((insp.checklist || []).filter(x => x.situacao && x.situacao !== 'NV').map(x => x.cod));
  const auto = [];
  for (const n of [...calc.ncs, ...deMedicao]) {
    if (marcados.has(n.cod)) continue;
    const ja = auto.find(x => x.cod === n.cod);
    if (ja) ja.obs += ` | ${n.local}: ${n.texto}`; else auto.push({ cod: n.cod, situacao: 'NC', obs: `${n.local}: ${n.texto}` });
  }
  const daObra = [...(insp.checklist || []).filter(x => !auto.some(a => a.cod === x.cod)), ...auto];
  const checklist = I.mesclarChecklist(CHECKLIST, daObra, na);
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const parecer = I.parecer(checklist, ncs, [...med.isolamento, ...med.equipotencializacao, ...med.dsi, ...med.dr, ...med.comutacao]);
  return { dados, calc, insp, checklist, ncs, med, parecer };
}

// ── Resumo para a tela ──────────────────────────────────────────────────────

function resumir(res) {
  const { calc } = res;
  const fs = calc.fonte;
  const porGrupo = [0, 1, 2].map(g => calc.ambientes.filter(a => a.grupo === g).length);
  const nIt = calc.sistemas.reduce((s, x) => s + x.unidades, 0);
  const temInspecao = ['checklist', 'isolamento', 'equipotencializacao', 'dsi', 'ensaios_dr', 'comutacao'].some(k => (res.insp[k] || []).length);
  const ncF = (cod) => calc.ncs.some(n => n.cod === cod);
  return {
    indicadores: [
      { rotulo: 'Locais', valor: String(calc.ambientes.length), detalhe: `grupo 0: ${porGrupo[0]} · grupo 1: ${porGrupo[1]} · grupo 2: ${porGrupo[2]}` },
      { rotulo: 'Sistemas IT médicos', valor: String(nIt), ok: !ncF('IT1') && !ncF('IT2'), detalhe: calc.sistemas.map(s => `${s.id} ${num(s.kvaPorUnidade)} kVA${s.unidades > 1 ? ` ×${s.unidades}` : ''}`).join(' · ') || '—' },
      { rotulo: 'UPS (classes ≤ 0,5 s)', valor: fs.precisaUps ? `${num(fs.upsKvaAdotado || 0)} kVA` : 'não exigida', ok: fs.precisaUps ? !ncF('F1') : undefined, detalhe: fs.precisaUps ? `carga ${kva(fs.upsCargaVa)} · autonomia ${num(fs.upsAutonomiaMin, 0)} min` : '' },
      { rotulo: 'Grupo gerador (≤ 15 s)', valor: fs.precisaGerador ? `${num(fs.geradorKvaAdotado || 0)} kVA` : 'não exigido', ok: fs.precisaGerador ? !ncF('F3') : undefined, detalhe: fs.precisaGerador ? `mínimo ${num(fs.geradorMinKva, 1)} kVA · ${num(fs.geradorAutonomiaH, 0)} h` : '' },
      { rotulo: 'Circuitos', valor: String(calc.circuitos.length), detalhe: `IT ${calc.circuitosIt.length} · TN-S ${calc.circuitosTn.length} · maior ΔV ${num(calc.maiorQueda)} %` },
      { rotulo: 'Quadros', valor: `${calc.quadros.filter(q => q.nCircuitos).length} QD + ${nIt} QDIT`, detalhe: calc.quadros.filter(q => q.alimentador).map(q => `${q.id} ${q.alimentador.disjuntor} A`).join(' · ') },
      { rotulo: 'Não conformidades de projeto', valor: String(calc.ncs.length), ok: calc.ncs.length === 0 },
      ...(temInspecao ? [{ rotulo: 'Parecer da inspeção', valor: res.parecer.situacao.replace(/_/g, ' '), ok: res.parecer.situacao === 'CONFORME' ? true : res.parecer.situacao === 'INCONCLUSIVO' ? undefined : false, detalhe: `NC ${res.parecer.cont.NC} · NV ${res.parecer.cont.NV}` }] : []),
    ],
    textos: [...calc.ncs.map(n => `NC ${n.cod} — ${n.local}: ${n.texto}`), ...calc.avisos],
    tabelas: [
      { titulo: 'Classificação dos locais (NBR 13534 / RDC 50)', colunas: ['Ambiente', 'Tipo (RDC 50)', 'Grupo', 'Classe', 'Postos', 'Tomadas IT', 'Tomadas TN', 'IT', 'BEL', 'Quadro'],
        linhas: calc.ambientes.map(a => [a.nome, a.tipoRotulo, `${a.grupo}${a.editado ? ' *' : ''}`, classeCurta(a.classe), a.postos, a.tomadasIt, a.tomadasTn, a.sistemaIt || '—', sim(a.bel), a.quadro]) },
      { titulo: 'Sistemas IT médicos (transformador, DSI e painel de alarme)', colunas: ['Sistema', 'Locais', 'Instalada', 'Fator', 'Demandada', 'Transformador', 'Classe', 'Circuitos', 'Painel de alarme'],
        linhas: calc.sistemas.map(s => [`${s.id} / ${s.qdit}`, s.ambientes.map(a => a.nome).join(', '), kva(s.vaInstalada), num(s.fator), kva(s.vaDemanda), `${num(s.kvaPorUnidade)} kVA${s.unidades > 1 ? ` ×${s.unidades}` : ''}`, classeCurta(s.classe), s.circuitos.length, s.localPainel]) },
      { titulo: 'Circuitos', colunas: ['Circ.', 'Quadro', 'Descrição', 'Sist.', 'Classe', 'VA', 'Lig.', 'Ib (A)', 'Seção', 'Disj.', 'DR', 'ΔV %'],
        linhas: calc.todosCircuitos.map(x => [x.id, x.quadro, x.descricao, x.sistema, classeCurta(x.classe), num(x.potenciaNominalVa || x.potencia_va, 0), x.ligacao, num(x.ib, 1), sec(x.secao), `${x.polos}P ${x.disjuntor} A${x.curva ? ` ${x.curva}` : ''}`, x.dr ? `tipo ${x.drTipo || 'A'}` : '—', num(x.queda)]) },
      { titulo: 'Fonte de segurança por classe (710.556)', colunas: ['Classe', 'Carga (kVA)', 'Fonte'],
        linhas: [['0.15', 'UPS on-line'], ['0.5', 'UPS'], ['15', 'Grupo gerador'], ['>15', 'Grupo gerador (manual/automático)']].map(([k, f]) => [C.CLASSES[k].rotulo, num(fs.porClasse[k] / 1000), f]) },
      { titulo: 'Quadros setoriais', colunas: ['Quadro', 'Instalada', 'Demanda', 'Alimentador', 'Disj. geral', 'ΔV %', 'Módulos'],
        linhas: calc.quadros.filter(q => q.alimentador).map(q => [q.id, kva(q.instaladaVa), kva(q.demandaVa), sec(q.alimentador.secao), `${q.alimentador.polos}P ${q.alimentador.disjuntor} A`, num(q.alimentador.queda), q.modulos]) },
    ],
  };
}

// ── Documentos ──────────────────────────────────────────────────────────────

function secoesMemorial(res) {
  const { calc } = res;
  const c = calc.config;
  const fs = calc.fonte;
  const obra = res.dados.obra?.nome || 'o estabelecimento';
  const eq = calc.ambientes.filter(a => a.equipotencializacao);
  return [
    { titulo: '1. Objeto e premissas', paragrafos: [
      `Projeto das instalações elétricas de baixa tensão dos locais médicos de ${obra}, conforme a ABNT NBR 13534:2008 (requisitos específicos para estabelecimentos assistenciais de saúde), a RDC 50/2002 da Anvisa e, no que não for específico, a ABNT NBR 5410:2004. Alimentação ${c.sistema} ${c.vfn}/${c.vff} V, esquema ${c.esquema}; sistemas IT médicos com secundário de ${c.vIt} V.`,
      `Condutores de cobre ${c.isolacao === 'PVC' ? '450/750 V' : '0,6/1 kV HEPR 90 °C'} não halogenados, com baixa emissão de fumaça (NBR 13248 — local de fuga longa, BD4, NBR 5410 5.2.2.2 [CONFERIR]), método ${c.metodo} (${T.METODOS[c.metodo]}), ${c.temperatura} °C, ${c.agrupamento} circuitos agrupados.`,
      'As cláusulas "710.x" citadas seguem a numeração da IEC 60364-7-710:2002, base da NBR 13534:2008. [CONFERIR a numeração no texto da NBR] Valores marcados [CONFERIR] são premissas de projeto a validar.',
    ] },
    { titulo: '2. Classificação dos locais médicos (710.3 e 710.556.5.1)', paragrafos: [
      'Grupo 0: sem equipamentos eletromédicos com partes aplicadas. Grupo 1: partes aplicadas externas ou invasivas (exceto área cardíaca), onde a falta de energia não ameaça a vida. Grupo 2: partes aplicadas em procedimentos intracardíacos, cirurgias e tratamentos vitais, onde a descontinuidade da alimentação pode ameaçar a vida do paciente.',
      'Classes da fonte de segurança pelo tempo de comutação: ≤ 0,15 s, ≤ 0,5 s (focos cirúrgicos e luminárias essenciais, 3 h), ≤ 15 s (equipamentos dos grupos 1 e 2 e iluminação de segurança, 24 h) e > 15 s (serviços de manutenção do hospital). Classificação sugerida pelo tipo de ambiente da RDC 50 e acordada com a equipe médica do EAS. [CONFERIR]',
    ],
    tabela: { colunas: ['Ambiente', 'Tipo (RDC 50)', 'Área (m²)', 'Postos', 'Grupo', 'Classe'], linhas: calc.ambientes.map(a => [a.nome, a.tipoRotulo, num(a.area_m2), a.postos, `${a.grupo}${a.editado ? ' (alterado)' : ''}`, classeCurta(a.classe)]), proporcoes: [1.6, 3, 0.7, 0.6, 0.8, 0.8] } },
    { titulo: '3. Sistema IT médico (710.413.1.5 e 710.512.1)', paragrafos: [
      'Nos locais do grupo 2, os circuitos dos equipamentos de suporte à vida, de aplicações cirúrgicas e dos demais equipamentos no ambiente do paciente são alimentados por sistema IT médico, com ao menos um sistema por grupo de salas com a mesma função (cada sala cirúrgica com o seu). Ficam fora do IT, em TN-S com DR 30 mA, a movimentação da mesa cirúrgica, raios X, equipamentos > 5 kVA e cargas não críticas (710.413.1.3).',
      `Transformador de separação monofásico (IEC 61558-2-15) de 0,5 a 10 kVA, secundário ≤ 250 V, corrente de fuga ≤ 0,5 mA, instalado próximo ao local. Potência = carga instalada do IT (equipamentos + ${num(c.vaTomadaIt, 0)} VA por tomada livre) × fator de simultaneidade ${num(c.fatorIt)} [CONFERIR], escolhida entre as potências comerciais ${C.IT.comerciais.map(k => num(k)).join(' / ')} kVA. Primário protegido por disjuntor curva D dimensionado com ${num(C.FATOR_PRIMARIO_IT)} × In (corrente de magnetização); proteção do transformador só contra curto-circuito, com sobrecarga e temperatura supervisionadas pelo DSI [CONFERIR].`,
      'Cada sistema IT tem DSI (IEC 61557-8): impedância interna ≥ 100 kΩ, tensão de medição ≤ 25 V CC, corrente injetada ≤ 1 mA, alarme ao atingir 50 kΩ, dispositivo de teste e monitoração de carga e temperatura do transformador; e painel de alarme em local permanentemente supervisionado, com sinal verde (normal), amarelo (falha de isolamento, não cancelável) e alarme sonoro silenciável. Não se instala DR nos circuitos do IT.',
    ],
    tabela: { colunas: ['Sistema', 'Locais', 'Instalada', 'Demandada', 'Trafo', 'I prim./sec. (A)', 'Classe', 'Circ.', 'Painel de alarme'],
      linhas: calc.sistemas.map(s => [`${s.id} / ${s.qdit}`, s.ambientes.map(a => a.nome).join(', '), kva(s.vaInstalada), kva(s.vaDemanda), `${num(s.kvaPorUnidade)} kVA${s.unidades > 1 ? ` ×${s.unidades}` : ''}`, `${num(s.iPrimario, 1)} / ${num(s.iSecundario, 1)}`, classeCurta(s.classe), s.circuitos.length, s.localPainel]),
      proporcoes: [0.9, 1.6, 0.8, 0.8, 0.7, 0.9, 0.6, 0.4, 1.4], tamanho: 15, vazio: 'Nenhum local do grupo 2 — sistema IT médico não exigido.' } },
    { titulo: '4. Tomadas por leito/posto e identificação (710.53)', paragrafos: [
      'Em cada posto de tratamento do grupo 2 as tomadas do IT vêm de no mínimo dois circuitos distintos (as tomadas de cada cabeceira são alternadas entre os circuitos do sistema). As tomadas do IT são de cor diferenciada e identificadas de forma permanente com "IT MÉDICO" e o nº do circuito. Quantidades mínimas por posto adotadas pela H&M [CONFERIR com a equipe médica e a RDC 50].',
    ],
    tabela: { colunas: ['Ambiente', 'Postos', 'IT/posto', 'TN/posto', 'Tomadas IT', 'Tomadas TN', 'Circuitos IT', 'Circuitos TN'],
      linhas: calc.ambientes.map(a => [a.nome, a.postos, a.tomadasMinPorPosto.it, a.tomadasMinPorPosto.tn, a.tomadasIt, a.tomadasTn, a.circuitos.it.join(', ') || '—', a.circuitos.tn.join(', ') || '—']), proporcoes: [1.6, 0.5, 0.6, 0.6, 0.7, 0.7, 1.6, 1.4], tamanho: 15 } },
    { titulo: '5. Proteção diferencial e esquema de aterramento (710.312.2.1 e 710.413.1.3)', paragrafos: [
      `Esquema ${c.esquema}; não se admite condutor PEN (TN-C) a jusante do quadro geral. DR IΔn ≤ 30 mA tipo A (tipo B onde houver componente contínua lisa, ex.: raios X/tomógrafo com conversor — [CONFERIR]) em todos os circuitos de tomadas dos locais do grupo 1 (NBR 13534, 5.1.2.2.4.2) e, nos locais do grupo 2, só nos circuitos TN admitidos fora do IT (mesa cirúrgica, raios X, equipamentos > 5 kVA e cargas não críticas); tipo AC não é permitido. DR individual por circuito para limitar desligamentos simultâneos. Os circuitos de iluminação seguem a NBR 5410 (seccionamento pelo disjuntor) — a NBR 13534 exige DR nos circuitos de tomadas do grupo 1; a IEC 60364-7-710 estende a exigência a todos os circuitos finais até 32 A do grupo 1, o que pode ser adotado como critério do projeto. [CONFERIR]`,
      `Circuitos com DR: ${calc.circuitosTn.filter(x => x.dr).map(x => x.id).join(', ') || 'nenhum'}.`,
    ] },
    { titulo: '6. Circuitos e dimensionamento (NBR 5410, 6.2.5 a 6.2.7)', paragrafos: [
      `Mesmo motor da skill de elétrica predial: Iz = I(tab) × FCT × FCA ≥ Ib, Ib ≤ In ≤ Iz (5.3.4), seção mínima da Tabela 47 e queda ≤ ${num(c.quedaTerminal)} % nos circuitos terminais. Circuitos do IT em ${c.vIt} V com disjuntor bipolar; tomadas com disjuntor mínimo de ${c.disjMinTomadas} A e iluminação ${c.disjMinIluminacao} A quando o cabo permite [CONFERIR]. Limites por circuito: IT ${c.limiteItA} A, TN ${c.limiteTnA} A e no máximo ${c.maxTomadas} tomadas.`,
    ],
    tabela: { colunas: ['Circ.', 'Quadro', 'Descrição', 'Sist.', 'Classe', 'VA', 'Lig.', 'Ib', 'L (m)', 'F/N/PE', 'Disj.', 'DR', 'ΔV %'],
      linhas: calc.todosCircuitos.map(x => [x.id, x.quadro, x.descricao, x.sistema, classeCurta(x.classe), num(x.potenciaNominalVa || x.potencia_va, 0), x.ligacao, num(x.ib, 1), num(x.comprimento, 0), `${sec(x.secao)} / ${x.secaoNeutro ? sec(x.secaoNeutro) : '—'} / ${sec(x.secaoPE)}`, `${x.polos}P ${x.disjuntor} A${x.curva ? ` ${x.curva}` : ''}`, x.dr ? x.drTipo || 'A' : '—', num(x.queda)]),
      proporcoes: [0.65, 0.65, 2.2, 0.4, 0.55, 0.5, 0.35, 0.4, 0.35, 1.35, 0.75, 0.35, 0.4], tamanho: 13 } },
    { titulo: '7. Quadros e alimentadores', paragrafos: [
      `QD setoriais com reserva da Tabela 59 e DPS classe II; QDIT por sistema IT com transformador, DSI e disjuntores bipolares. Demanda dos QD = circuitos TN × ${num(c.fdQuadro)} [CONFERIR] + carga demandada dos IT. Disjuntor geral acima do maior disjuntor a jusante (seletividade a confirmar pelas curvas no executivo).`,
    ],
    tabela: { colunas: ['Quadro', 'Circuitos', 'Instalada', 'Demanda', 'Ib (A)', 'Alimentador', 'L (m)', 'Disj. geral', 'ΔV %', 'Módulos'],
      linhas: calc.quadros.filter(q => q.alimentador).map(q => [q.id, q.nCircuitos, kva(q.instaladaVa), kva(q.demandaVa), num(q.alimentador.ib, 1), sec(q.alimentador.secao), num(q.alimentador.comprimento, 0), `${q.alimentador.polos}P ${q.alimentador.disjuntor} A`, num(q.alimentador.queda), q.modulos]),
      proporcoes: [0.8, 0.6, 0.8, 0.8, 0.6, 0.8, 0.5, 0.8, 0.5, 0.6] } },
    { titulo: '8. Equipotencialização suplementar (710.413.1.6)', paragrafos: [
      'Em cada local dos grupos 1 e 2, barramento de equipotencialização local (BEL) no local ou próximo, ligando: PE das tomadas e equipamentos fixos, partes condutivas estranhas (painéis de gases medicinais, tubulações, estruturas metálicas), blindagens, piso condutivo e blindagem do transformador IT; ligações visíveis e desconectáveis individualmente. No grupo 2, a resistência entre esses pontos e o BEL não pode passar de 0,2 Ω (adotada também como referência no grupo 1 [CONFERIR]).',
      `Seção mínima pela resistência: S ≥ ρ·L / (0,2 Ω − ${num(C.BEL.rConexoesOhm)} Ω de conexões), ρ = ${num(C.BEL.rho, 4)} Ω·mm²/m, com mínimo de ${C.BEL.secaoMin} mm²; L = maior distância ponto → BEL estimada em 2√A + 3 m [CONFERIR no projeto]. Ligação BEL → barra PE do quadro ≥ ${C.BEL.secaoMinQuadro} mm² (NBR 5410, 6.4.2.1).`,
    ],
    tabela: { colunas: ['Local', 'Grupo', 'Ligações', 'L máx. (m)', 'S calc. (mm²)', 'Seção', 'R estimada (Ω)', 'BEL → quadro'],
      linhas: eq.map(a => [a.nome, a.grupo, a.equipotencializacao.ligacoes, num(a.equipotencializacao.lMax, 1), num(a.equipotencializacao.secaoCalculada), sec(a.equipotencializacao.secao), num(a.equipotencializacao.resistenciaEstimada, 3), sec(a.equipotencializacao.secaoQuadro)]),
      proporcoes: [1.6, 0.5, 0.7, 0.7, 0.8, 0.7, 0.9, 0.9], vazio: 'Sem locais dos grupos 1 e 2.' } },
    { titulo: '9. Fonte de segurança (710.556)', paragrafos: [
      `Cargas por classe: ≤ 0,15 s ${kva(fs.porClasse['0.15'])}; ≤ 0,5 s ${kva(fs.porClasse['0.5'])}; ≤ 15 s ${kva(fs.porClasse['15'])}; > 15 s ${kva(fs.porClasse['>15'])}.`,
      fs.precisaUps
        ? `UPS on-line (classes ≤ 0,5 s): carga ${kva(fs.upsCargaVa)} ÷ carregamento ${num(C.FONTE.carregamentoUps * 100, 0)} % = ${num(fs.upsMinKva, 1)} kVA → ${fs.ups === 'existente' ? `existente de ${num(fs.upsKva)} kVA` : `${num(fs.upsKvaSugerido)} kVA`}; autonomia ${num(fs.upsAutonomiaMin, 0)} min (mínimo ${num(fs.upsAutonomiaReqMin, 0)} min${fs.gerador === 'nao' ? ' — 3 h sem gerador' : ' como ponte até o gerador; as 3 h da classe 0,5 s ficam com o conjunto UPS + gerador'}) ≈ ${num(fs.upsEnergiaKwh, 1)} kWh ≈ ${num(fs.upsBateriaAh, 0)} Ah em ${num(fs.vBancoV, 0)} V. [CONFERIR com o fabricante]`
        : 'Sem cargas de classe ≤ 0,5 s: UPS não exigida pela NBR 13534.',
      fs.precisaGerador
        ? `Grupo gerador (classe ≤ 15 s, partida e transferência automática em até 15 s quando a tensão cair mais de 10 % por mais de 3 s): cargas ≤ 15 s e > 15 s × ${num(c.fdQuadro)} = ${kva(fs.carga15Va)} + entrada da UPS (${kva(fs.upsCargaVa)} × ${num(C.FONTE.fatorEntradaUps)}) + outras cargas essenciais ${num(fs.outrasKva)} kVA = ${kva(fs.geradorCargaVa)} ÷ ${num(C.FONTE.carregamentoGerador * 100, 0)} % = ${num(fs.geradorMinKva, 1)} kVA → ${fs.gerador === 'existente' ? `existente de ${num(fs.geradorKva)} kVA` : `${num(fs.geradorKvaSugerido)} kVA`}. Autonomia ${num(fs.geradorAutonomiaH, 0)} h (24 h — redutível a 3 h só nas condições de 710.556.5.2.2.2), tanque ≈ ${num(fs.tanqueL, 0)} L a ${num(C.FONTE.consumoDieselLkWh)} L/kWh. Transferência informada: ${num(fs.tempoTransferenciaS, 1)} s. [CONFERIR]`
        : 'Sem cargas de segurança: gerador não exigido pela NBR 13534.',
    ] },
    { titulo: '10. Iluminação de segurança (710.560.9)', paragrafos: [
      'Alimentada pela fonte de segurança com comutação ≤ 15 s: rotas de fuga e sinalização de saída, salas de geradores e quadros, locais de serviços essenciais e ao menos uma luminária nos locais do grupo 1; no grupo 2, no mínimo 50 % da iluminação. Focos cirúrgicos e luminárias essenciais em classe ≤ 0,5 s. Iluminação de emergência autônoma pela NBR 10898 (skill de incêndio).',
    ],
    tabela: { colunas: ['Local', 'Grupo', 'Iluminação (VA)', 'Segurança (VA)', 'Pontos', 'Pontos de segurança'],
      linhas: calc.ambientes.filter(a => a.iluminacaoVa > 0).map(a => [a.nome, a.grupo, num(a.iluminacaoVa, 0), num(a.iluminacaoSegurancaVa, 0), a.luminarias, a.luminariasSeguranca]), proporcoes: [1.8, 0.5, 1, 1, 0.7, 1] } },
    { titulo: '11. Verificações (710.61 e 710.62)', paragrafos: ['Verificação inicial: ensaios da NBR 5410 Seção 7 e mais: ensaio funcional completo do DSI e do alarme; medição da equipotencialização suplementar; integridade das ligações equipotenciais e da fonte de segurança; corrente de fuga dos transformadores IT em vazio.'],
      tabela: { colunas: ['Verificação periódica', 'Intervalo'], linhas: [
        ['Ensaio funcional dos dispositivos de comutação da fonte de segurança', '12 meses'],
        ['Ensaio funcional do DSI e do painel de alarme', '12 meses'],
        ['Conferência visual dos ajustes dos dispositivos de proteção', '12 meses'],
        ['Medição da equipotencialização suplementar', '36 meses'],
        ['Ensaio dos dispositivos DR em IΔn', '12 meses'],
        ['Fonte de segurança a bateria (funcional / capacidade)', 'mensal (15 min) / 12 meses [CONFERIR]'],
        ['Grupo gerador (funcional até a temperatura nominal / autonomia 60 min)', 'mensal / 12 meses [CONFERIR]'],
      ], proporcoes: [4, 1.6] } },
    { titulo: '12. Lista de materiais (preliminar)', tabela: { colunas: ['Grupo', 'Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.grupo, m.codigo, m.descricao, m.unidade, num(m.quantidade, 1), m.referencia]), proporcoes: [1, 0.8, 3.6, 0.4, 0.5, 1.3], tamanho: 14 },
      notas: ['Cabos com 10 % de folga; eletrodutos e equipotencialização estimados — confirmar no projeto executivo.'] },
    ...(calc.ncs.length ? [{ titulo: 'Não conformidades de projeto', marcadores: calc.ncs.map(n => `${n.cod} — ${n.local}: ${n.texto}`) }] : []),
    { titulo: 'Avisos', marcadores: calc.avisos },
  ];
}

function cfgLaudo(res) {
  const { calc, med } = res;
  const fs = calc.fonte;
  return {
    titulo: 'LAUDO DE INSPEÇÃO — INSTALAÇÕES ELÉTRICAS DE ESTABELECIMENTO ASSISTENCIAL DE SAÚDE',
    tipoInspecao: `Verificação conforme a ABNT NBR 13534:2008 e a ABNT NBR 5410, Seção 7 — ${({ inicial: 'verificação inicial', periodica: 'verificação periódica', reforma: 'após reforma/ampliação' })[res.insp.tipo] || 'verificação periódica'}`,
    tituloCurto: 'Laudo NBR 13534 — instalações hospitalares',
    sigla: 'LAUDO-HOSP',
    objetivo: 'Verificar a conformidade das instalações elétricas dos locais médicos com a ABNT NBR 13534:2008 — classificação dos locais, sistema IT médico (transformador, DSI e alarme), proteção diferencial, equipotencialização suplementar, tomadas e identificação, fonte de segurança e iluminação de segurança — com os ensaios da NBR 5410, as não conformidades, recomendações e prazos.',
    listaNormas: NORMAS,
    secoesChecklist: SECOES_CHECKLIST,
    descricao: [
      ['Alimentação', `${calc.config.sistema} ${calc.config.vfn}/${calc.config.vff} V — esquema ${calc.config.esquema}`],
      ['Locais médicos', [0, 1, 2].map(g => `grupo ${g}: ${calc.ambientes.filter(a => a.grupo === g).map(a => a.nome).join(', ') || '—'}`).join(' | ')],
      ['Sistemas IT médicos', calc.sistemas.map(s => `${s.id} ${num(s.kvaPorUnidade)} kVA — ${s.ambientes.map(a => a.nome).join(', ')}`).join(' | ') || '—'],
      ['Fonte de segurança', `UPS: ${({ prever: 'a prever', existente: `existente ${num(fs.upsKva)} kVA`, nao: 'não há' })[fs.ups]} · Gerador: ${({ prever: 'a prever', existente: `existente ${num(fs.geradorKva)} kVA`, nao: 'não há' })[fs.gerador]}`],
    ],
    metodologia: [
      'Inspeção visual (NBR 5410, 7.2) dos quadros, QDIT, tomadas, BEL e fonte de segurança, com a classificação dos locais conferida com a equipe médica.',
      'Ensaio funcional do DSI e do painel de alarme com resistência de teste abaixo do ajuste; leitura do ajuste e da corrente de fuga do transformador IT em vazio (710.61).',
      'Medição da resistência da equipotencialização suplementar entre o PE de tomadas/equipamentos/partes condutivas e o BEL (≤ 0,2 Ω).',
      'Resistência de isolamento (Tabela 60) e ensaio dos DR em IΔn (tempo e tipo).',
      'Ensaio de comutação da fonte de segurança com cronometragem por classe (≤ 0,15 s / ≤ 0,5 s / ≤ 15 s).',
      'Segurança: os ensaios que interrompem a alimentação de locais do grupo 2 só com autorização da direção clínica e sem pacientes dependentes de suporte à vida; NR-10 (10.5).',
    ],
    medicoes: [
      { titulo: '6.1 Resistência de isolamento (NBR 5410, 7.3.3)', colunas: ['Circuito', 'Tensão (V)', 'Medido (MΩ)', 'Critério', 'Resultado'], proporcoes: [1.4, 0.8, 0.9, 2.4, 0.8],
        linhas: med.isolamento.map(m => [m.circuito, num(m.tensao_v, 0), m.valor_mohm ?? '', m.criterio, m.resultado]) },
      { titulo: '6.2 Equipotencialização suplementar (710.413.1.6)', colunas: ['Local', 'Ponto', 'Medido (Ω)', 'Critério', 'Resultado'], proporcoes: [1.4, 1.8, 0.8, 1.8, 0.8],
        linhas: med.equipotencializacao.map(m => [m.ambiente, m.ponto, m.valor_ohm ?? '', m.criterio, m.resultado]) },
      { titulo: '6.3 DSI, alarme e transformador IT (710.413.1.5 / 710.61)', colunas: ['Sistema', 'Ajuste (kΩ)', 'Visual', 'Sonoro', 'Fuga (mA)', 'Observação', 'Resultado'], proporcoes: [0.8, 0.8, 0.6, 0.6, 0.7, 2.2, 0.8],
        linhas: med.dsi.map(m => [m.sistema, m.ajuste_kohm ?? '', m.alarme_visual === false ? 'falhou' : m.alarme_visual ? 'ok' : '', m.alarme_sonoro === false ? 'falhou' : m.alarme_sonoro ? 'ok' : '', m.fuga_trafo_ma ?? '', m.falhas.join('; ') || m.criterio, m.resultado]) },
      { titulo: '6.4 Dispositivos DR (710.413.1.3)', colunas: ['Circuito', 'Tipo', 'IΔn (mA)', 'Tempo (ms)', 'Critério', 'Resultado'], proporcoes: [1.2, 0.5, 0.6, 0.7, 2.6, 0.8],
        linhas: med.dr.map(m => [m.circuito, m.tipo || 'A', m.corrente_ma ?? 30, m.tempo_ms ?? '', m.criterio, m.resultado]) },
      { titulo: '6.5 Comutação da fonte de segurança (710.556)', colunas: ['Fonte', 'Classe', 'Tempo medido (s)', 'Critério', 'Resultado'], proporcoes: [1.2, 1, 1, 2, 0.8],
        linhas: med.comutacao.map(m => [m.fonte, classeCurta(String(m.classe)), m.tempo_s ?? '', m.criterio, m.resultado]) },
    ],
    conclusoes: ['As verificações periódicas da NBR 13534 (710.62) devem ser registradas no prontuário das instalações: DSI, comutação e DR a cada 12 meses; equipotencialização a cada 36 meses.'],
    proximaInspecao: [
      ['DSI / alarme, comutação, DR, ajustes das proteções', '12 meses (710.62)'],
      ['Equipotencialização suplementar', '36 meses (710.62)'],
      ['Gerador e baterias da fonte de segurança', 'Ensaio funcional mensal e de autonomia anual [CONFERIR]'],
    ],
  };
}

function cfgChecklist(res) {
  const { calc } = res;
  return {
    titulo: 'CHECKLIST DE CAMPO — ELÉTRICA HOSPITALAR', subtitulo: 'ABNT NBR 13534:2008 — NBR 5410, Seção 7 — NR-10', tituloCurto: 'Checklist de campo — hospitalar',
    secoesChecklist: SECOES_CHECKLIST,
    preparacao: [
      'Combinar com a direção clínica/enfermagem os horários dos ensaios; nunca interromper IT de leito ou sala com paciente em suporte à vida.',
      'APR e permissão de trabalho; desenergização, bloqueio e sinalização (NR-10, 10.5) antes de abrir quadros.',
      'Levar: megôhmetro 500 V CC, micro-ohmímetro / medidor de continuidade (≥ 200 mA), testador de DR (tipos A/B), resistência de teste para DSI (ex.: 39 kΩ), alicate amperímetro de fuga (mA), cronômetro/registrador para comutação, câmera.',
    ],
    referencias: [
      ...calc.sistemas.map(s => [`${s.id} (${s.ambientes.map(a => a.nome).join(', ')})`, `trafo ${num(s.kvaPorUnidade)} kVA · DSI alarme ≥ 50 kΩ · ${s.circuitos.length} circuitos · painel: ${s.localPainel}`]),
      ['Equipotencialização (grupo 2)', '≤ 0,2 Ω entre PE/partes condutivas e o BEL'],
      ['Fonte de segurança', `UPS ${calc.fonte.precisaUps ? `${num(calc.fonte.upsKvaAdotado || 0)} kVA (≤ 0,5 s)` : '—'} · gerador ${calc.fonte.precisaGerador ? `${num(calc.fonte.geradorKvaAdotado || 0)} kVA (≤ 15 s)` : '—'}`],
    ],
    medicoes: [
      { titulo: 'DSI e transformador IT', colunas: ['Sistema', 'Ajuste (kΩ)', 'Teste alarme (visual/sonoro)', 'Fuga trafo (mA)'], proporcoes: [1.5, 1, 1.6, 1], linhas: calc.sistemas.map(s => [`${s.id} — ${s.qdit}`, '', '☐ ok  ☐ falhou', '']) },
      { titulo: 'Equipotencialização (Ω)', colunas: ['Local', 'Ponto → BEL', 'Medido (Ω)', 'Obs.'], proporcoes: [1.5, 2, 1, 1.5], linhas: calc.ambientes.filter(a => a.bel).flatMap(a => [[a.nome, 'Tomada / PE', '', ''], [a.nome, 'Painel de gases / estrutura', '', '']]) },
      { titulo: 'Ensaio de DR', colunas: ['Circuito', 'Tipo', 'Tempo (ms)', 'Botão de teste'], proporcoes: [2, 0.8, 1, 1], linhas: calc.circuitosTn.filter(x => x.dr).map(x => [`${x.id} — ${x.descricao}`.slice(0, 60), x.drTipo || 'A', '', '☐ ok']) },
      { titulo: 'Comutação da fonte de segurança', colunas: ['Fonte', 'Classe', 'Tempo medido (s)', 'Obs.'], proporcoes: [1.5, 1, 1, 2], linhas: [['UPS', '≤ 0,5 s', '', ''], ['Gerador / QTA', '≤ 15 s', '', '']] },
    ],
  };
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial descritivo e de cálculo', formato: 'Word', nome: 'Memorial_Eletrica_Hospitalar',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO E DE CÁLCULO — INSTALAÇÕES ELÉTRICAS HOSPITALARES', subtitulo: 'ABNT NBR 13534:2008 — RDC 50/2002 — ABNT NBR 5410:2004', tituloCurto: 'Memorial — elétrica hospitalar', sigla: 'MEM-HOSP', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de locais, circuitos, IT e materiais', formato: 'Excel', nome: 'Eletrica_Hospitalar',
    gerar: (res) => {
      const { calc } = res;
      return D.gerarPlanilha([
        { nome: 'Ambientes', colunas: [
          { header: 'Ambiente', key: 'nome', width: 26 }, { header: 'Tipo (RDC 50)', key: 'tipoRotulo', width: 44 }, { header: 'Grupo', key: 'grupo', width: 7 }, { header: 'Classe', key: 'classeTxt', width: 10 },
          { header: 'Alterado?', key: 'alterado', width: 9 }, { header: 'Área (m²)', key: 'area_m2', width: 9 }, { header: 'Postos', key: 'postos', width: 7 }, { header: 'Tomadas IT', key: 'tomadasIt', width: 10 },
          { header: 'Tomadas TN', key: 'tomadasTn', width: 10 }, { header: 'Sistema IT', key: 'sistemaIt', width: 10 }, { header: 'BEL', key: 'belTxt', width: 6 }, { header: 'Quadro', key: 'quadro', width: 10 },
          { header: 'Iluminação (VA)', key: 'iluminacaoVa', width: 13 }, { header: 'Ilum. segurança (VA)', key: 'iluminacaoSegurancaVa', width: 15 }, { header: 'Alertas', key: 'alertasTxt', width: 60 }],
          linhas: calc.ambientes.map(a => ({ ...a, classeTxt: classeCurta(a.classe), alterado: a.editado ? 'sim' : '', belTxt: a.bel ? 'sim' : '', sistemaIt: a.sistemaIt || '', alertasTxt: a.alertas.join(' | ') })) },
        { nome: 'Circuitos', colunas: [
          { header: 'Circuito', key: 'id', width: 11 }, { header: 'Quadro', key: 'quadro', width: 10 }, { header: 'Descrição', key: 'descricao', width: 48 }, { header: 'Sistema', key: 'sistema', width: 8 },
          { header: 'Classe', key: 'classeTxt', width: 9 }, { header: 'Tipo', key: 'tipoTxt', width: 11 }, { header: 'Potência (VA)', key: 'va', width: 12, numFmt: '0' }, { header: 'Ligação', key: 'ligacao', width: 8 },
          { header: 'Tensão (V)', key: 'tensao', width: 9 }, { header: 'Ib (A)', key: 'ib', width: 8, numFmt: '0.0' }, { header: 'Comprimento (m)', key: 'comprimento', width: 12 }, { header: 'Seção (mm²)', key: 'secao', width: 10 },
          { header: 'Iz (A)', key: 'iz', width: 8, numFmt: '0.0' }, { header: 'Disjuntor (A)', key: 'disjuntor', width: 11 }, { header: 'Polos', key: 'polos', width: 6 }, { header: 'DR', key: 'drTxt', width: 8 },
          { header: 'Queda (%)', key: 'queda', width: 9, numFmt: '0.00' }, { header: 'Critério', key: 'criterio', width: 40 }],
          linhas: [...calc.todosCircuitos, ...calc.quadros.filter(q => q.alimentador).map(q => ({ ...q.alimentador, quadro: q.id, sistema: 'TN', classe: q.essencial ? '15' : '' }))]
            .map(x => ({ ...x, classeTxt: classeCurta(x.classe), tipoTxt: ROTULO_TIPO[x.tipo] || x.tipo, va: x.potenciaNominalVa || x.potencia_va, drTxt: x.dr ? `30 mA ${x.drTipo || 'A'}` : '' })) },
        { nome: 'Transformadores IT', colunas: [
          { header: 'Sistema', key: 'id', width: 8 }, { header: 'QDIT', key: 'qdit', width: 9 }, { header: 'Locais', key: 'locais', width: 40 }, { header: 'Classe', key: 'classeTxt', width: 9 },
          { header: 'Carga instalada (VA)', key: 'vaInstalada', width: 16, numFmt: '0' }, { header: 'Fator', key: 'fator', width: 7 }, { header: 'Carga demandada (VA)', key: 'vaDemanda', width: 17, numFmt: '0' },
          { header: 'Trafo (kVA)', key: 'kvaPorUnidade', width: 10 }, { header: 'Unidades', key: 'unidades', width: 9 }, { header: 'Carregamento', key: 'carregamento', width: 12, numFmt: '0%' },
          { header: 'I primário (A)', key: 'iPrimario', width: 12, numFmt: '0.0' }, { header: 'I secundário (A)', key: 'iSecundario', width: 13, numFmt: '0.0' }, { header: 'Circuitos IT', key: 'nCirc', width: 10 },
          { header: 'DSI + painel', key: 'nDsi', width: 11 }, { header: 'Painel de alarme', key: 'localPainel', width: 32 }],
          linhas: calc.sistemas.map(s => ({ ...s, locais: s.ambientes.map(a => a.nome).join(', '), classeTxt: classeCurta(s.classe), nCirc: s.circuitos.length, nDsi: s.unidades })) },
        { nome: 'Quadros', colunas: [
          { header: 'Quadro', key: 'id', width: 10 }, { header: 'Nome', key: 'nome', width: 24 }, { header: 'Circuitos', key: 'nCircuitos', width: 9 }, { header: 'Reserva', key: 'reserva', width: 8 },
          { header: 'Instalada (VA)', key: 'instaladaVa', width: 13, numFmt: '0' }, { header: 'Demanda (VA)', key: 'demandaVa', width: 13, numFmt: '0' }, { header: 'Alimentador (mm²)', key: 'secao', width: 15 },
          { header: 'Disjuntor geral (A)', key: 'disj', width: 15 }, { header: 'Queda (%)', key: 'queda', width: 9, numFmt: '0.00' }, { header: 'Módulos', key: 'modulos', width: 8 }],
          linhas: calc.quadros.filter(q => q.alimentador).map(q => ({ ...q, secao: q.alimentador.secao, disj: q.alimentador.disjuntor, queda: q.alimentador.queda })) },
        { nome: 'Fonte de segurança', colunas: [{ header: 'Item', key: 'item', width: 50 }, { header: 'Valor', key: 'valor', width: 16, numFmt: '0.00' }, { header: 'Unidade', key: 'un', width: 10 }],
          linhas: [
            ['Carga classe ≤ 0,15 s', calc.fonte.porClasse['0.15'] / 1000, 'kVA'], ['Carga classe ≤ 0,5 s', calc.fonte.porClasse['0.5'] / 1000, 'kVA'],
            ['Carga classe ≤ 15 s', calc.fonte.porClasse['15'] / 1000, 'kVA'], ['Carga classe > 15 s', calc.fonte.porClasse['>15'] / 1000, 'kVA'],
            ['UPS — potência mínima', calc.fonte.upsMinKva, 'kVA'], ['UPS — adotada', calc.fonte.upsKvaAdotado || 0, 'kVA'], ['UPS — autonomia', calc.fonte.upsAutonomiaMin, 'min'], ['UPS — energia do banco', calc.fonte.upsEnergiaKwh, 'kWh'],
            ['Gerador — carga', calc.fonte.geradorCargaVa / 1000, 'kVA'], ['Gerador — potência mínima', calc.fonte.geradorMinKva, 'kVA'], ['Gerador — adotado', calc.fonte.geradorKvaAdotado || 0, 'kVA'],
            ['Gerador — autonomia', calc.fonte.geradorAutonomiaH, 'h'], ['Gerador — tanque estimado', calc.fonte.tanqueL, 'L'],
          ].map(([item, valor, un]) => ({ item, valor, un })) },
        (() => { const aba = D.abaMateriais(calc.materiais); return { ...aba, colunas: [...aba.colunas, { header: 'Grupo', key: 'grupo', width: 24 }] }; })(),
      ]);
    } },
  { tipo: 'laudo', rotulo: 'Laudo de inspeção (NBR 13534)', formato: 'Word', nome: 'Laudo_Eletrica_Hospitalar',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, cfgLaudo(res), { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Hospitalar',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, cfgChecklist(res), res.checklist)) },
];

// ── Orçamento ───────────────────────────────────────────────────────────────

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const obra = dados.obra?.nome || dados.cliente?.nome || 'o estabelecimento';
  const S = 'Serviços (Mão de Obra)';
  const SUB = 'Elétrica hospitalar';
  const srv = (codigo, descricao, quantidade, unidade, subgrupo = SUB) => ({ secao: S, subgrupo, codigo, descricao, quantidade, unidade });
  const nIt = calc.sistemas.reduce((s, x) => s + x.unidades, 0);
  const locais12 = calc.ambientes.filter(a => a.grupo >= 1).length;
  const fs = calc.fonte;
  if (modo === 'execucao') {
    const tomIt = calc.ambientes.reduce((s, a) => s + a.tomadasIt, 0);
    const tomTn = calc.ambientes.reduce((s, a) => s + a.tomadasTn, 0);
    const pontosLuz = calc.ambientes.reduce((s, a) => s + a.luminarias, 0);
    const nExcl = calc.circuitos.filter(x => x.tipo === 'tue').length;
    const nQd = calc.quadros.filter(q => q.nCircuitos).length;
    const nDisp = calc.circuitosTn.length + calc.circuitosTn.filter(x => x.dr).length + nQd + calc.quadros.reduce((s, q) => s + (q.nCircuitos ? q.dpsQtd : 0), 0);
    const itens = [
      ...calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: `${SUB} — ${m.grupo}`, descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
      ...(nIt ? [srv('hosp_painel_it', 'Montagem e instalação de painel IT médico (QDIT com transformador de separação, barramentos e identificação)', nIt, 'un'),
        srv('hosp_dsi', 'Instalação e parametrização de DSI e painel de alarme do IT médico (ajuste ≥ 50 kΩ, sinalização e teste)', nIt, 'un'),
        srv('hosp_tomada_it', 'Instalação de tomada do sistema IT médico com identificação permanente', tomIt, 'un')] : []),
      ...(locais12 ? [srv('hosp_equipotencializacao', 'Equipotencialização suplementar por local médico (BEL e ligações de PE e partes condutivas)', locais12, 'un')] : []),
      srv('ele_qd_setorial', 'Instalação de quadros de distribuição setoriais', nQd, 'un', 'Elétrica'),
      srv('ele_disjuntores', 'Instalação de disjuntores, DR e DPS dos quadros setoriais', nDisp, 'un', 'Elétrica'),
      srv('ele_eletrodutos', 'Passagem de eletrodutos e fiação dos circuitos', 1, 'vb', 'Elétrica'),
      srv('ele_tomada_media', 'Instalação de tomadas TN-S (circuitos com DR)', tomTn, 'un', 'Elétrica'),
      srv('ele_ponto_energia', 'Instalação de pontos de luz (normal e segurança) e de força dos equipamentos', pontosLuz + nExcl, 'un', 'Elétrica'),
      ...((fs.precisaUps && fs.ups === 'prever') || (fs.precisaGerador && fs.gerador === 'prever') ? [srv('hosp_fonte_seguranca', 'Instalação e integração da fonte de segurança (UPS, QTA do gerador, circuitos por classe)', 1, 'vb')] : []),
      ...(locais12 ? [srv('hosp_comissionamento', 'Comissionamento e ensaios NBR 13534 por local médico (isolamento, DSI, equipotencialização ≤ 0,2 Ω, DR, comutação)', locais12, 'un')] : []),
      srv('hosp_projeto', 'Projeto elétrico hospitalar NBR 13534 com classificação dos locais, memorial e ART', 1, 'vb'),
    ].filter(i => i.quantidade > 0);
    return {
      cliente_nome: dados.cliente?.nome || '',
      escopo: `Execução das instalações elétricas dos locais médicos de ${obra} conforme a ABNT NBR 13534 e a NBR 5410: ${calc.ambientes.length} locais classificados (grupos 0/1/2), ${nIt} sistema(s) IT médico(s) com transformador de separação, DSI e painel de alarme, ${calc.circuitos.length} circuitos (IT e TN-S com DR 30 mA), ${calc.quadros.filter(q => q.nCircuitos).length} quadro(s) setorial(is), equipotencialização suplementar em ${locais12} local(is)${fs.precisaUps ? `, UPS ${fs.ups === 'prever' ? `de ${num(fs.upsKvaSugerido)} kVA` : 'existente'}` : ''}${fs.precisaGerador ? `, gerador ${fs.gerador === 'prever' ? `de ${num(fs.geradorKvaSugerido)} kVA` : 'existente'}` : ''}, comissionamento e ensaios.`,
      observacoes: 'Rascunho gerado pela skill de elétrica hospitalar — conferir classificação dos locais com a equipe médica, quantidades e preços antes de enviar ao cliente.',
      itens,
    };
  }
  const nIso = Math.max(1, (res.insp.isolamento || []).length || calc.circuitos.length);
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: `Inspeção das instalações elétricas dos locais médicos de ${obra} conforme a ABNT NBR 13534 e a Seção 7 da NBR 5410: classificação dos locais, sistema IT médico (DSI, alarme e transformador), equipotencialização suplementar, DR, tomadas e identificação, fonte de segurança (comutação e autonomia), com laudo técnico e ART.${res.ncs.length ? ` Inclui a correção das ${res.ncs.length} não conformidades apontadas (itens a cotar).` : ''}`,
    observacoes: 'Rascunho gerado pela skill de elétrica hospitalar — ensaios em locais do grupo 2 dependem de janela combinada com a direção clínica.',
    itens: [
      srv('hosp_inspecao', 'Inspeção visual e documental das instalações hospitalares (NBR 13534 / NR-10)', 1, 'vb', 'Laudo hospitalar'),
      ...(locais12 ? [srv('hosp_ensaio_local', 'Ensaios por local médico: DSI e alarme, fuga do transformador IT, equipotencialização ≤ 0,2 Ω e DR', locais12, 'un', 'Laudo hospitalar')] : []),
      srv('ele_ensaio_isolamento', 'Ensaios de resistência de isolamento e continuidade do PE (por circuito)', nIso, 'un', 'Laudo hospitalar'),
      ...(fs.precisaUps || fs.precisaGerador ? [srv('hosp_ensaio_comutacao', 'Ensaio de comutação da fonte de segurança (tempo por classe e autonomia)', 1, 'vb', 'Laudo hospitalar')] : []),
      srv('hosp_laudo', 'Laudo técnico NBR 13534 das instalações hospitalares com ART', 1, 'vb', 'Laudo hospitalar'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' })),
    ],
  };
}

// ── Formulário da tela ─────────────────────────────────────────────────────

const OP = {
  tensoes: F.op([['127', '127 V (F-N)'], ['220', '220 V (F-N)']]),
  tensoesFF: F.op([['220', '220 V (F-F)'], ['380', '380 V (F-F)']]),
  sistema: F.op([['monofasico', 'Monofásico (F+N)'], ['bifasico', 'Bifásico (2F+N)'], ['trifasico', 'Trifásico (3F+N)']]),
  esquema: F.op([['TN-S', 'TN-S'], ['TN-C-S', 'TN-C-S (PEN só até o quadro geral)'], ['TT', 'TT'], ['TN-C', 'TN-C (não permitido em EAS)']]),
  entrega: F.op([['bt', 'Em baixa tensão (queda total ≤ 5 %)'], ['trafo', 'Transformador próprio (≤ 7 %)']]),
  isolacao: F.op([['EPR', 'HEPR/EPR 90 °C 0,6/1 kV não halogenado'], ['PVC', '450/750 V 70 °C não halogenado']]),
  metodo: F.op(Object.entries(T.METODOS)),
  ligacao: F.op([['FN', 'F-N'], ['FF', 'F-F'], ['FFF', '3F']]),
  tipoAmb: F.op([...C.TIPOS].sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR')).map(t => [t.id, `${t.rotulo} (grupo ${t.grupo})`])),
  grupo: [{ valor: '', rotulo: 'Sugerido pelo tipo' }, ...F.op([['0', 'Grupo 0'], ['1', 'Grupo 1'], ['2', 'Grupo 2']])],
  classe: [{ valor: '', rotulo: 'Sugerida pelo tipo' }, ...F.op([['0.15', '≤ 0,15 s'], ['0.5', '≤ 0,5 s'], ['15', '≤ 15 s'], ['>15', '> 15 s']])],
  sistemaEq: [{ valor: '', rotulo: 'Automático' }, ...F.op([['IT', 'IT médico'], ['TN', 'TN-S com DR']])],
  fonte: F.op([['prever', 'Prever (a skill dimensiona)'], ['existente', 'Existente (verificar)'], ['nao', 'Não há']]),
  tipoInsp: F.op([['inicial', 'Verificação inicial / comissionamento'], ['periodica', 'Verificação periódica'], ['reforma', 'Após reforma/ampliação']]),
  drTipo: F.op([['A', 'A'], ['B', 'B'], ['AC', 'AC (não permitido)']]),
  fonteEnsaio: F.op([['UPS', 'UPS'], ['Gerador', 'Gerador / QTA']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Alimentação e critérios', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'instalacao.tensao_fn', rotulo: 'Tensão F-N', tipo: 'selecao', opcoes: OP.tensoes },
      { caminho: 'instalacao.tensao_ff', rotulo: 'Tensão F-F', tipo: 'selecao', opcoes: OP.tensoesFF },
      { caminho: 'instalacao.sistema', rotulo: 'Sistema', tipo: 'selecao', opcoes: OP.sistema },
      { caminho: 'instalacao.esquema', rotulo: 'Esquema na entrada', tipo: 'selecao', opcoes: OP.esquema },
      { caminho: 'instalacao.ponto_entrega', rotulo: 'Ponto de entrega', tipo: 'selecao', opcoes: OP.entrega },
      { caminho: 'instalacao.isolacao', rotulo: 'Cabos', tipo: 'selecao', opcoes: OP.isolacao },
      { caminho: 'instalacao.metodo', rotulo: 'Método de instalação', tipo: 'selecao', opcoes: OP.metodo },
      { caminho: 'instalacao.temperatura', rotulo: 'Temperatura ambiente (°C)', tipo: 'numero' },
      { caminho: 'instalacao.agrupamento', rotulo: 'Circuitos agrupados (pior trecho)', tipo: 'numero' },
      { caminho: 'instalacao.comprimento_medio_circuito_m', rotulo: 'Comprimento médio dos circuitos (m)', tipo: 'numero' },
      { caminho: 'instalacao.queda_max_terminal_pct', rotulo: 'Queda máx. circuito terminal (%)', tipo: 'numero' },
      { caminho: 'instalacao.queda_max_alimentador_pct', rotulo: 'Queda máx. alimentador (%)', tipo: 'numero' },
      { caminho: 'instalacao.tensao_it_v', rotulo: 'Tensão do secundário IT (V)', tipo: 'numero', dica: '≤ 250 V (710.512.1)' },
      { caminho: 'instalacao.ligacao_tomadas_tn', rotulo: 'Ligação das tomadas TN', tipo: 'selecao', opcoes: OP.ligacao },
      { caminho: 'instalacao.fator_simultaneidade_it', rotulo: 'Fator de simultaneidade do IT', tipo: 'numero', dica: 'Premissa H&M 0,7 [CONFERIR]' },
      { caminho: 'instalacao.va_tomada_it', rotulo: 'VA por tomada IT livre', tipo: 'numero' },
      { caminho: 'instalacao.va_tomada_tn', rotulo: 'VA por tomada TN livre', tipo: 'numero' },
      { caminho: 'instalacao.limite_circuito_it_a', rotulo: 'Corrente máx. por circuito IT (A)', tipo: 'numero' },
      { caminho: 'instalacao.limite_circuito_tn_a', rotulo: 'Corrente máx. por circuito TN (A)', tipo: 'numero' },
      { caminho: 'instalacao.max_tomadas_circuito', rotulo: 'Máx. de tomadas por circuito', tipo: 'numero' },
      { caminho: 'instalacao.fator_demanda_quadros', rotulo: 'Fator de demanda dos QD', tipo: 'numero', dica: 'Premissa 0,8 [CONFERIR]' },
      { caminho: 'instalacao.va_luminaria', rotulo: 'VA por luminária', tipo: 'numero' },
      { caminho: 'instalacao.comprimento_primario_it_m', rotulo: 'Distância QD → QDIT (m)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '3. Fonte de segurança', aberta: true, itens: [
    { tipo: 'nota', texto: 'Classe ≤ 0,5 s (focos cirúrgicos, IT do grupo 2, suporte à vida) exige UPS; classe ≤ 15 s exige grupo gerador com transferência automática e 24 h de autonomia (710.556).' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'fonte_seguranca.gerador', rotulo: 'Grupo gerador', tipo: 'selecao', opcoes: OP.fonte },
      { caminho: 'fonte_seguranca.gerador_kva', rotulo: 'Gerador existente (kVA)', tipo: 'numero' },
      { caminho: 'fonte_seguranca.gerador_autonomia_h', rotulo: 'Autonomia do gerador (h)', tipo: 'numero' },
      { caminho: 'fonte_seguranca.tempo_transferencia_s', rotulo: 'Partida + transferência (s)', tipo: 'numero' },
      { caminho: 'fonte_seguranca.ups', rotulo: 'UPS', tipo: 'selecao', opcoes: OP.fonte },
      { caminho: 'fonte_seguranca.ups_kva', rotulo: 'UPS existente (kVA)', tipo: 'numero' },
      { caminho: 'fonte_seguranca.ups_autonomia_min', rotulo: 'Autonomia da UPS (min)', tipo: 'numero', dica: 'Com gerador: ponte ≥ 15 min [CONFERIR]; sem gerador: 180 min' },
      { caminho: 'fonte_seguranca.tensao_banco_v', rotulo: 'Tensão do banco de baterias (V)', tipo: 'numero' },
      { caminho: 'fonte_seguranca.outras_cargas_essenciais_kva', rotulo: 'Outras cargas essenciais no gerador (kVA)', tipo: 'numero', dica: 'Climatização de UTI/CC, gases medicinais, elevadores, bombas…', largura: 'inteira' },
    ] },
  ] },
  { titulo: '4. Quadros por setor', itens: [
    { tipo: 'nota', texto: 'Um quadro setorial por linha. Os QDIT (um por sistema IT) são criados automaticamente e alimentados pelo quadro do setor.' },
    { tipo: 'tabela', caminho: 'quadros', rotuloAdicionar: 'Adicionar quadro', novaLinha: { id: 'QD{n}', nome: '', setor: '', comprimento_alimentador_m: null },
      colunas: [{ campo: 'id', rotulo: 'Identificação', largura: 110 }, { campo: 'nome', rotulo: 'Nome' }, { campo: 'setor', rotulo: 'Setor' }, { campo: 'comprimento_alimentador_m', rotulo: 'Alimentador (m)', tipo: 'numero', largura: 110 }] },
  ] },
  { titulo: '5. Ambientes (locais médicos)', aberta: true, itens: [
    { tipo: 'nota', texto: 'O tipo (RDC 50) sugere o grupo e a classe; altere só com o acordo da equipe médica. "Leitos/postos" multiplica as tomadas mínimas. Ambientes com o mesmo "Sistema IT (grupo)" dividem o transformador (salas com a mesma função).' },
    { tipo: 'tabela', caminho: 'ambientes', rotuloAdicionar: 'Adicionar ambiente',
      novaLinha: { nome: '', tipo: 'enfermaria', grupo: '', classe: '', area_m2: null, leitos: 1, quadro: '', comprimento_m: null, tomadas_it_extras: 0, tomadas_tn_extras: 0, iluminacao_va: null, sistema_it: '' },
      colunas: [
        { campo: 'nome', rotulo: 'Ambiente' }, { campo: 'tipo', rotulo: 'Tipo (RDC 50)', tipo: 'selecao', opcoes: OP.tipoAmb, largura: 260 },
        { campo: 'grupo', rotulo: 'Grupo', tipo: 'selecao', opcoes: OP.grupo, largura: 120 }, { campo: 'classe', rotulo: 'Classe', tipo: 'selecao', opcoes: OP.classe, largura: 120 },
        { campo: 'area_m2', rotulo: 'Área (m²)', tipo: 'numero', largura: 80 }, { campo: 'leitos', rotulo: 'Leitos/postos', tipo: 'numero', largura: 80 },
        { campo: 'quadro', rotulo: 'Quadro', largura: 90 }, { campo: 'comprimento_m', rotulo: 'Compr. circuitos (m)', tipo: 'numero', largura: 90 },
        { campo: 'tomadas_it_extras', rotulo: 'Tomadas IT extras', tipo: 'numero', largura: 80 }, { campo: 'tomadas_tn_extras', rotulo: 'Tomadas TN extras', tipo: 'numero', largura: 80 },
        { campo: 'iluminacao_va', rotulo: 'Iluminação (VA)', tipo: 'numero', largura: 90 }, { campo: 'sistema_it', rotulo: 'Sistema IT (grupo)', largura: 100 },
      ] },
    { tipo: 'nota', texto: 'Equipamentos médicos por ambiente (o nome do ambiente deve ser igual ao da tabela acima). Sistema automático: no grupo 2 vai para o IT, salvo > 5 kVA; escolha "TN-S com DR" para mesa cirúrgica, raios X e cargas não críticas (710.413.1.3). Suporte à vida → classe ≤ 0,15 s.' },
    { tipo: 'tabela', caminho: 'equipamentos', rotuloAdicionar: 'Adicionar equipamento médico',
      novaLinha: { ambiente: '', descricao: '', quantidade: 1, potencia_w: null, fp: 0.9, suporte_vida: false, classe: '', sistema: '', circuito_exclusivo: false, ligacao: '' },
      colunas: [
        { campo: 'ambiente', rotulo: 'Ambiente' }, { campo: 'descricao', rotulo: 'Equipamento' }, { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 60 },
        { campo: 'potencia_w', rotulo: 'Potência unit. (W)', tipo: 'numero', largura: 100 }, { campo: 'fp', rotulo: 'FP', tipo: 'numero', largura: 60 },
        { campo: 'suporte_vida', rotulo: 'Suporte à vida', tipo: 'check', largura: 80 }, { campo: 'classe', rotulo: 'Classe', tipo: 'selecao', opcoes: OP.classe, largura: 120 },
        { campo: 'sistema', rotulo: 'Sistema', tipo: 'selecao', opcoes: OP.sistemaEq, largura: 120 }, { campo: 'circuito_exclusivo', rotulo: 'Circuito exclusivo', tipo: 'check', largura: 80 },
        { campo: 'ligacao', rotulo: 'Ligação', tipo: 'selecao', opcoes: [{ valor: '', rotulo: 'Automática' }, ...OP.ligacao], largura: 100 },
      ] },
  ] },
  { titulo: '6. Situação existente (para laudo de instalação existente)', itens: [
    { tipo: 'nota', texto: 'Só para instalação existente: marque o que foi constatado em cada local. Cada marcação vira não conformidade no laudo e item de correção no orçamento.' },
    { tipo: 'tabela', caminho: 'existente', rotuloAdicionar: 'Adicionar local', novaLinha: { ambiente: '', sem_it: false, dr_no_it: false, tomadas_sem_identificacao: false, sem_bel: false },
      colunas: [{ campo: 'ambiente', rotulo: 'Ambiente' }, { campo: 'sem_it', rotulo: 'Grupo 2 sem IT', tipo: 'check', largura: 100 }, { campo: 'dr_no_it', rotulo: 'DR em circuito IT', tipo: 'check', largura: 100 },
        { campo: 'tomadas_sem_identificacao', rotulo: 'Tomadas IT sem identificação', tipo: 'check', largura: 120 }, { campo: 'sem_bel', rotulo: 'Sem BEL', tipo: 'check', largura: 80 }] },
  ] },
  F.secaoInspecao(7, OP.tipoInsp),
  F.secaoChecklist(8, CHECKLIST.length),
  { titulo: '9. Ensaios (NBR 13534 710.61/710.62 e NBR 5410 7.3)', itens: [
    { tipo: 'tabela', caminho: 'inspecao.dsi', rotuloAdicionar: 'Adicionar ensaio de DSI', novaLinha: { sistema: '', ajuste_kohm: null, alarme_visual: true, alarme_sonoro: true, fuga_trafo_ma: null },
      colunas: [{ campo: 'sistema', rotulo: 'Sistema IT (IT1, IT2…)' }, { campo: 'ajuste_kohm', rotulo: 'Ajuste (kΩ)', tipo: 'numero', largura: 90 }, { campo: 'alarme_visual', rotulo: 'Sinal amarelo ok', tipo: 'check', largura: 90 },
        { campo: 'alarme_sonoro', rotulo: 'Alarme sonoro ok', tipo: 'check', largura: 90 }, { campo: 'fuga_trafo_ma', rotulo: 'Fuga do trafo (mA)', tipo: 'numero', largura: 100 }] },
    { tipo: 'tabela', caminho: 'inspecao.equipotencializacao', rotuloAdicionar: 'Adicionar medição de equipotencialização', novaLinha: { ambiente: '', ponto: '', valor_ohm: null },
      colunas: [{ campo: 'ambiente', rotulo: 'Ambiente' }, { campo: 'ponto', rotulo: 'Ponto → BEL' }, { campo: 'valor_ohm', rotulo: 'Medido (Ω)', tipo: 'numero', largura: 100 }] },
    { tipo: 'tabela', caminho: 'inspecao.ensaios_dr', rotuloAdicionar: 'Adicionar ensaio de DR', novaLinha: { circuito: '', tipo: 'A', corrente_ma: 30, tempo_ms: null, botao_teste: true },
      colunas: [{ campo: 'circuito', rotulo: 'Circuito' }, { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.drTipo, largura: 120 }, { campo: 'corrente_ma', rotulo: 'IΔn (mA)', tipo: 'numero', largura: 80 },
        { campo: 'tempo_ms', rotulo: 'Tempo (ms)', tipo: 'numero', largura: 90 }, { campo: 'botao_teste', rotulo: 'Botão ok', tipo: 'check', largura: 70 }] },
    { tipo: 'tabela', caminho: 'inspecao.comutacao', rotuloAdicionar: 'Adicionar ensaio de comutação', novaLinha: { fonte: 'Gerador', classe: '15', tempo_s: null },
      colunas: [{ campo: 'fonte', rotulo: 'Fonte', tipo: 'selecao', opcoes: OP.fonteEnsaio, largura: 140 }, { campo: 'classe', rotulo: 'Classe', tipo: 'selecao', opcoes: OP.classe.slice(1), largura: 120 }, { campo: 'tempo_s', rotulo: 'Tempo medido (s)', tipo: 'numero', largura: 110 }] },
    { tipo: 'tabela', caminho: 'inspecao.isolamento', rotuloAdicionar: 'Adicionar medição de isolamento', novaLinha: { circuito: '', tensao_v: 220, valor_mohm: null },
      colunas: [{ campo: 'circuito', rotulo: 'Circuito' }, { campo: 'tensao_v', rotulo: 'Tensão nominal (V)', tipo: 'numero', largura: 120 }, { campo: 'valor_mohm', rotulo: 'Medido (MΩ)', tipo: 'numero', largura: 100 }] },
  ] },
  F.secaoNcs(10, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(11),
];

module.exports = criarDisciplina({
  chave: 'eletrica_hospitalar',
  nome: 'Elétrica hospitalar (NBR 13534)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Execução da instalação', descricao: 'Sistema IT médico, quadros, tomadas, equipotencialização, fonte de segurança (com preço do catálogo) e mão de obra' },
    { modo: 'inspecao', rotulo: 'Inspeção e laudo', descricao: 'Inspeção, ensaios NBR 13534 (DSI, equipotencialização, DR, comutação), laudo e correção das não conformidades' },
  ],
  montarOrcamento,
});
