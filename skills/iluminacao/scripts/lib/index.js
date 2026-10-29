// Disciplina ILUMINAÇÃO — luminotécnico (NBR ISO/CIE 8995-1) e automação de
// iluminação, com circuitos pela NBR 5410 (motor da skill de elétrica).

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { fmtNum } = require('../../../_comum/docx-base');
const C = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-escritorio.json');

const NORMAS = [
  ['ABNT NBR ISO/CIE 8995-1:2013', 'Iluminação de ambientes de trabalho — Parte 1: Interior (Em, UGR_L, Ra, uniformidade, fator de manutenção)'],
  ['ABNT NBR 5410:2004 (versão corrigida 2008)', 'Instalações elétricas de baixa tensão — circuitos de iluminação (9.5.2.1, 9.5.3, Tabela 47, 5.1.3.2.2)'],
  ['ABNT NBR 15215 (partes 1 a 4)', 'Iluminação natural — referência para aproveitamento da luz natural (não calculada nesta skill)'],
  ['IEC 62386 (DALI / DALI-2)', 'Interface digital endereçável para iluminação — até 64 endereços de driver por linha'],
  ['IEC 60929, Anexo E', 'Interface de controle analógica 0-10 V para drivers'],
  ['Portaria Inmetro vigente para produtos LED / PBE e Selo Procel', 'Eficiência e conformidade de lâmpadas e luminárias LED [CONFERIR número da portaria em vigor]'],
  ['INI-C (Portaria Inmetro 309/2022)', 'Eficiência energética de edificações comerciais, de serviços e públicas — densidade de potência de iluminação [CONFERIR]'],
  ['ABNT NBR 10898', 'Iluminação de emergência — tratada na skill de incêndio (não duplicada aqui)'],
];
const SECOES_CHECKLIST = ['Documentação', 'Luminárias', 'Níveis de iluminação', 'Controle e automação', 'Instalação elétrica'];

const num = fmtNum; // número pt-BR; '—' quando vazio ou inválido
const sec = (s) => (s == null ? '—' : `${String(s).replace('.', ',')} mm²`);
const sim = (ok, exigido) => (ok == null ? (exigido == null ? '—' : 'não verificado (dado da luminária ausente)') : ok ? 'atende' : 'NÃO atende');
// requisito exigido pela atividade sem o dado da luminária para comparar
const semDado = (a) => (a.okRa == null && a.raMin != null) || (a.okUgr == null && a.ugrL != null);
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function comandosTexto(a) {
  const c = a.comandos;
  return [
    c.interruptores && `${c.interruptores} interruptor(es)`, c.dimmers && `${c.dimmers} dimmer(s)`, c.botoeirasDali && `${c.botoeirasDali} botoeira(s) DALI`,
    c.tecladosCena && `${c.tecladosCena} teclado(s) de cena`, c.controladores010 && `${c.controladores010} controlador(es) 0-10 V`, c.releAuxiliar && 'relé auxiliar',
  ].filter(Boolean).join(', ') || '—';
}

// ── Medição de iluminância ─────────────────────────────────────────────────

function lerLeituras(texto) {
  if (Array.isArray(texto)) return texto.map(Number).filter(v => Number.isFinite(v) && v >= 0);
  return String(texto || '').split(/[;\s]+/).filter(t => t !== '').map(t => Number(t.replace(',', '.'))).filter(v => Number.isFinite(v) && v >= 0);
}

function avaliarMedicao(m, calc) {
  const amb = calc.ambientes.find(a => normalizar(a.nome) === normalizar(m.ambiente));
  const leituras = lerLeituras(m.leituras);
  const emExigida = Number(m.em_exigida_lx) > 0 ? Number(m.em_exigida_lx) : amb ? amb.emExigida : null;
  const uoMin = amb ? amb.uoMin : 0.7;
  if (!leituras.length) return { ...m, amb, leituras, emExigida, uoMin, resultado: 'NV' };
  const emed = leituras.reduce((s, v) => s + v, 0) / leituras.length;
  const emin = Math.min(...leituras);
  const uo = emed > 0 ? emin / emed : 0;
  const okEm = emExigida == null ? null : emed >= emExigida;
  const okUo = uo >= uoMin - 1e-9;
  return { ...m, amb, leituras, emExigida, uoMin, emed, emin, emax: Math.max(...leituras), uo, okEm, okUo, resultado: okEm === false || !okUo ? 'NC' : okEm == null ? 'NV' : 'C' };
}

function processar(dados) {
  const calc = C.calcular(dados);
  const insp = dados.inspecao || {};
  const ambs = calc.ambientes;
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, {
    ...(ambs.some(a => a.presenca) ? {} : { C2: 'Sem sensores de presença no projeto' }),
    ...(ambs.some(a => ['dali', 'cena', '010'].includes(a.controle)) ? {} : { C3: 'Sem DALI/0-10 V no projeto' }),
    ...(ambs.some(a => C.DIMERIZAVEL.includes(a.controle)) ? {} : { C4: 'Sem dimerização no projeto' }),
    E3: 'Iluminação de emergência avaliada na disciplina de incêndio (NBR 10898)',
  });
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const medicoes = (insp.medicoes_iluminancia || []).filter(m => m && m.ambiente).map(m => avaliarMedicao(m, calc));
  return { dados, calc, insp, checklist, ncs, medicoes, parecer: I.parecer(checklist, ncs, medicoes) };
}

// ── Resumo para a tela e a CLI ─────────────────────────────────────────────

function linhasAmbientes(calc) {
  return calc.ambientes.map(a => [a.nome, a.atividadeRotulo, num(a.area, 1), num(a.hm), num(a.k), num(a.fu), num(a.fm), a.emExigida, num(a.nCalc, 1), `${a.nx} × ${a.ny}`, a.n, Math.round(a.emObtida), num(a.dpi, 1), C.CONTROLES[a.controle].split(' (')[0], a.circuitos.join(', ')]);
}

function resumir(res) {
  const { calc } = res;
  const t = calc.totais;
  const naoAtende = calc.ambientes.filter(a => !a.okEm || a.okRa === false || a.okUgr === false);
  const naoVerificados = calc.ambientes.filter(a => !naoAtende.includes(a) && semDado(a));
  const tipos = Object.entries(t.porTipo).filter(([, q]) => q).map(([k, q]) => `${q} ${C.TIPOS_LUMINARIA[k]}`).join(' · ');
  const medidos = res.medicoes.filter(m => m.resultado !== 'NV');
  return {
    indicadores: [
      { rotulo: 'Ambientes', valor: String(t.ambientes), detalhe: `${num(t.area, 1)} m²` },
      { rotulo: 'Luminárias', valor: String(t.luminarias), detalhe: tipos + (t.metrosPerfil ? ` (${num(t.metrosPerfil, 1)} m de perfil)` : '') },
      { rotulo: 'Requisitos da NBR ISO/CIE 8995-1', valor: `${t.ambientes - naoAtende.length - naoVerificados.length} de ${t.ambientes}`, detalhe: [naoAtende.length ? `revisar: ${naoAtende.map(a => a.nome).join(', ')}` : '', naoVerificados.length ? `Ra/UGR não verificados (dado da luminária ausente): ${naoVerificados.map(a => a.nome).join(', ')}` : ''].filter(Boolean).join(' · ') || 'Em, Ra e UGR atendidos', ok: naoAtende.length ? false : naoVerificados.length ? undefined : true },
      { rotulo: 'Potência instalada', valor: `${num(t.potencia / 1000, 2)} kW`, detalhe: `densidade média ${num(t.dpi, 1)} W/m²`, ok: calc.ambientes.some(a => a.okDpi === false) ? false : undefined },
      { rotulo: 'Circuitos de iluminação', valor: String(t.circuitos), detalhe: calc.circuitos.map(x => `${x.id}: ${sec(x.secao)} / ${x.disjuntor} A`).join(' · ') },
      { rotulo: 'Automação', valor: `${t.sensores} sensor(es)`, detalhe: `${t.comandos} comando(s) · ${t.enderecosDali} endereço(s) DALI em ${t.barramentos} linha(s)` },
      ...(res.medicoes.length ? [{ rotulo: 'Medições de iluminância', valor: `${medidos.filter(m => m.resultado === 'C').length} de ${medidos.length}`, detalhe: 'ambientes dentro do critério', ok: medidos.length ? medidos.every(m => m.resultado === 'C') : undefined }] : []),
    ],
    textos: calc.avisos,
    tabelas: [
      { titulo: 'Cálculo por ambiente (método dos lúmens)', colunas: ['Ambiente', 'Atividade', 'Área (m²)', 'hm (m)', 'k', 'FU', 'FM', 'Em exig. (lx)', 'N calc.', 'Grade', 'N', 'Em obtida (lx)', 'W/m²', 'Controle', 'Circuito'], linhas: linhasAmbientes(calc) },
      { titulo: 'Circuitos de iluminação (NBR 5410)', colunas: ['Circuito', 'Ambientes', 'VA', 'Ib (A)', 'L eq. (m)', 'Seção', 'Disjuntor', 'DR', 'ΔV %'],
        linhas: calc.circuitos.map(x => [x.id, x.ambientes.join(', '), x.potencia_va, num(x.ib, 2), num(x.comprimento, 1), sec(x.secao), `${x.polos}P ${x.disjuntor} A`, x.dr ? 'sim' : '—', num(x.queda)]) },
    ],
  };
}

// ── Memorial luminotécnico ─────────────────────────────────────────────────

function secoesMemorial(res) {
  const { calc, dados } = res;
  const p = calc.projeto;
  const c = calc.config;
  const amb = calc.ambientes;
  return [
    { titulo: '1. Objeto', paragrafos: [
      `Projeto luminotécnico e de comando/automação da iluminação de ${dados.obra?.nome || 'a edificação'} (${amb.length} ambientes, ${num(calc.totais.area, 1)} m²), com ${calc.totais.luminarias} luminárias LED e potência instalada de ${num(calc.totais.potencia / 1000, 2)} kW, e dimensionamento dos ${calc.circuitos.length} circuitos de iluminação.`,
      'Iluminação de emergência (ABNT NBR 10898) é tratada no projeto de incêndio e não faz parte deste memorial.',
    ] },
    { titulo: '2. Critérios e método de cálculo', paragrafos: [
      'Requisitos por atividade da ABNT NBR ISO/CIE 8995-1:2013, Tabela 1: iluminância mantida Em no plano de referência, índice de ofuscamento unificado limite UGR_L e índice de reprodução de cor mínimo Ra; uniformidade Emin/Emed ≥ 0,7 na área da tarefa (0,4 em circulação, depósito e garagem).',
      'Quantidade de luminárias pelo método dos lúmens: N = (Em × A) / (Φ × FU × FM), em que A é a área (m²), Φ o fluxo luminoso da luminária (lm), FU o fator de utilização e FM o fator de manutenção.',
      'Índice do recinto: k = (C × L) / (hm × (C + L)), com hm = altura de montagem da luminária − altura do plano de trabalho. FU obtido do fabricante quando informado; na falta, pela tabela simplificada em função de k e das refletâncias de teto, parede e piso.',
      `Distribuição em grade nx × ny pela proporção do ambiente, com espaçamento entre luminárias ≤ ${num(p.fatorEspacamento)} × hm e espaçamentos nos dois sentidos com razão ≤ ${num(p.razaoMax)}; iluminância resultante E = N × Φ × FU × FM / A.`,
      'Densidade de potência de iluminação DPI = P / A (W/m²), também expressa por 100 lx (W/m²/100 lx), comparada à referência de eficiência da atividade.',
      `Circuitos de iluminação pela ABNT NBR 5410 (mesmo motor de cálculo do projeto elétrico): agrupamento até ${c.limiteIluminacaoA} A por circuito (${p.ligacao === 'FN' ? c.vfn : c.vff} V), seção mínima 1,5 mm² (Tabela 47), capacidade de condução com fatores de temperatura e agrupamento, proteção In ≤ Iz e queda de tensão ≤ ${num(c.quedaTerminal)} %.`,
    ] },
    { titulo: '3. Premissas adotadas', marcadores: [
      'Fator de manutenção por estado de conservação: limpo 0,80; normal 0,70; sujo 0,60 — pressupõe limpeza anual e luminárias LED com manutenção do fluxo L80 ou melhor. [CONFERIR com o plano de manutenção do cliente]',
      'FU da tabela simplificada para luminária LED de distribuição direta (fluxo da luminária); substituir pelo FU do fabricante no projeto executivo. [CONFERIR]',
      `Espaçamento máximo ≈ ${num(p.fatorEspacamento)} × hm (relação típica de catálogo para facho médio-largo). [CONFERIR com a curva fotométrica]`,
      `Eficácia mínima das luminárias: ${p.eficaciaMin} lm/W; fator de potência dos drivers ${num(p.fpDriver)}. [CONFERIR]`,
      `Sensor de presença: cobertura circular de Ø ${num(p.sensorDiametro)} m na altura de instalação; grade de sensores pelo quadrado inscrito (lado = Ø/√2). [CONFERIR com o fabricante]`,
      `DALI: até ${p.enderecosDali} endereços de driver por linha, uma fonte de barramento por linha; dimmer de corte de fase até ${p.dimmerW} W; controlador 0-10 V até ${p.drivers010} drivers.`,
      'Comprimento equivalente para a queda de tensão = distância ao quadro + metade do percurso interno (carga distribuída); cabos e eletrodutos pelo percurso total + 10 %. [CONFERIR no projeto executivo]',
      'Locais de habitação: carga de iluminação para os circuitos não inferior à da NBR 5410, 9.5.2.1.2 (100 VA nos primeiros 6 m² + 60 VA a cada 4 m² inteiros).',
    ] },
    { titulo: '4. Luminárias do projeto', tabela: { colunas: ['Código', 'Tipo', 'Descrição', 'W', 'lm', 'lm/W', 'Ra', 'TCC (K)', 'UGR', 'FU fabr.'],
      linhas: calc.luminarias.map(l => [l.codigo, C.TIPOS_LUMINARIA[l.tipo], `${l.descricao || ''}${l.tipo === 'perfil' ? ` (peça de ${num(l.comprimento)} m)` : ''}${l.suspensao ? ` — suspensão ${num(l.suspensao)} m` : ''}`, num(l.potencia, 1), num(l.fluxo, 0), num(l.eficacia, 0), l.ra ?? '—', l.tcc ?? '—', l.ugr ?? '—', l.fu ? num(l.fu) : '—']),
      proporcoes: [0.6, 0.8, 2.4, 0.4, 0.5, 0.5, 0.4, 0.6, 0.4, 0.5], tamanho: 15 } },
    { titulo: '5. Requisitos por ambiente (NBR ISO/CIE 8995-1, Tabela 1)', tabela: { colunas: ['Ambiente', 'Atividade', 'Em (lx)', 'UGR_L', 'Ra mín.', 'Uo mín.', 'Luminária', 'Ra', 'UGR'],
      linhas: amb.map(a => [a.nome, `${a.atividadeRotulo}${a.conferirAtividade ? ' [CONFERIR]' : ''}`, a.emExigida, a.ugrL ?? '—', a.raMin ?? '—', num(a.uoMin), a.luminaria.codigo, sim(a.okRa, a.raMin), sim(a.okUgr, a.ugrL)]),
      proporcoes: [1.2, 2.2, 0.5, 0.5, 0.5, 0.5, 0.7, 0.7, 0.7], tamanho: 15 },
      notas: amb.filter(a => a.notaAtividade).map(a => `${a.nome}: ${a.notaAtividade}`) },
    { titulo: '6. Cálculo por ambiente (método dos lúmens)', tabela: { colunas: ['Ambiente', 'C × L (m)', 'A (m²)', 'hm (m)', 'k', 'FU', 'FM', 'N calc.', 'Grade', 'N', 'dx × dy (m)', 'smáx (m)', 'Em obtida (lx)'],
      linhas: amb.map(a => [a.nome, `${num(a.comprimento)} × ${num(a.largura)}`, num(a.area, 1), num(a.hm), num(a.k), num(a.fu), num(a.fm), num(a.nCalc, 2), `${a.nx} × ${a.ny}`, a.n, `${num(a.dx)} × ${num(a.dy)}`, num(a.smax), `${Math.round(a.emObtida)} (+${num(a.folga * 100, 0)} %)`]),
      proporcoes: [1.2, 0.8, 0.5, 0.45, 0.4, 0.4, 0.4, 0.5, 0.5, 0.35, 0.8, 0.5, 0.8], tamanho: 14 },
      notas: [`FU: ${[...new Set(amb.map(a => a.fuFonte))].join('; ')}. Refletâncias teto/parede/piso por ambiente na planilha.`] },
    { titulo: '7. Eficiência energética', paragrafos: ['Luminárias LED com registro no Inmetro (PBE) e, quando disponível, Selo Procel. A referência de densidade de potência é a do método das atividades (RTQ-C/Inmetro, nível A), apenas indicativa; a classificação oficial segue a INI-C em vigor. [CONFERIR]'],
      tabela: { colunas: ['Ambiente', 'Potência (W)', 'DPI (W/m²)', 'W/m²/100 lx', 'Referência (W/m²)', 'Situação'],
        linhas: amb.map(a => [a.nome, num(a.potencia, 0), num(a.dpi, 1), num(a.dpi100, 2), a.dpiRef ? num(a.dpiRef, 1) : '—', a.okDpi == null ? '—' : a.okDpi ? 'dentro' : 'ACIMA'])
          .concat([['TOTAL', num(calc.totais.potencia, 0), num(calc.totais.dpi, 1), '', '', '']]),
        proporcoes: [1.6, 0.8, 0.8, 0.8, 0.9, 0.8] } },
    { titulo: '8. Comando e automação', tabela: { colunas: ['Ambiente', 'Controle', 'Sensores', 'Comandos (junto à porta)', 'Drivers/fontes', 'End. DALI', 'Linha DALI'],
      linhas: amb.map(a => [a.nome, C.CONTROLES[a.controle], a.sensores.n ? `${a.sensores.n} (${a.sensores.nx} × ${a.sensores.ny})` : '—', comandosTexto(a), a.fontes || 'integrado', a.enderecos || '—', (a.barramentos || []).join(', ') || '—']),
      proporcoes: [1.2, 1.4, 0.7, 1.8, 0.7, 0.5, 0.6], tamanho: 15 },
      marcadores: calc.barramentos.map(b => `${b.id}: ${b.enderecos} endereço(s) de driver e ${b.dispositivos} dispositivo(s) de controle — ${b.ambientes.join(', ')}.`) },
    { titulo: '9. Circuitos de iluminação (NBR 5410)', paragrafos: [`Alimentação ${p.ligacao === 'FN' ? `F-N ${c.vfn} V` : `F-F ${c.vff} V`}, cabos de cobre ${c.isolacao}, método ${c.metodo}, ${c.temperatura} °C, agrupamento de ${c.agrupamento} circuitos. Circuitos de iluminação separados dos de tomadas (9.5.3.1).`],
      tabela: { colunas: ['Circuito', 'Ambientes', 'Lum.', 'VA', 'Ib (A)', 'L eq. (m)', 'Rota (m)', 'Seção F/N/PE', 'Iz (A)', 'Disjuntor', 'DR', 'ΔV %'],
        linhas: calc.circuitos.map(x => [x.id, x.ambientes.join(', '), x.luminarias, x.potencia_va, num(x.ib), num(x.comprimento, 1), num(x.rota, 1), `${sec(x.secao)} / ${sec(x.secaoNeutro)} / ${sec(x.secaoPE)}`, num(x.iz, 1), `${x.polos}P ${x.disjuntor} A`, x.dr ? '30 mA' : '—', num(x.queda)]),
        proporcoes: [0.5, 1.8, 0.4, 0.5, 0.5, 0.5, 0.5, 1.4, 0.5, 0.7, 0.5, 0.45], tamanho: 14 } },
    { titulo: '10. Lista de materiais (preliminar)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 1), m.referencia]), proporcoes: [0.7, 4, 0.5, 0.6, 1.5], tamanho: 15 } },
    ...(calc.avisos.length ? [{ titulo: 'Avisos', marcadores: calc.avisos }] : []),
  ];
}

// ── Relatório de medição / comissionamento ─────────────────────────────────

function cfgRelatorio(res) {
  const { calc } = res;
  return {
    titulo: 'RELATÓRIO DE MEDIÇÃO DE ILUMINÂNCIA E COMISSIONAMENTO', tipoInspecao: 'Medição de iluminância (ABNT NBR ISO/CIE 8995-1) e comissionamento dos comandos de iluminação',
    tituloCurto: 'Relatório — iluminação', sigla: 'REL-ILUM',
    objetivo: 'Verificar se a iluminação instalada atende à iluminância mantida, à uniformidade, à reprodução de cor e ao controle de ofuscamento exigidos pela ABNT NBR ISO/CIE 8995-1 para cada atividade, e comissionar os comandos (interruptores, dimmers, sensores de presença, DALI/0-10 V e cenas).',
    listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
    descricao: [
      ['Ambientes', `${calc.totais.ambientes} (${num(calc.totais.area, 1)} m²)`],
      ['Luminárias', `${calc.totais.luminarias} — ${calc.luminarias.map(l => l.codigo).join(', ')}`],
      ['Potência instalada', `${num(calc.totais.potencia / 1000, 2)} kW (${num(calc.totais.dpi, 1)} W/m²)`],
      ['Automação', `${calc.totais.sensores} sensor(es), ${calc.totais.enderecosDali} endereço(s) DALI em ${calc.totais.barramentos} linha(s)`],
    ],
    metodologia: [
      'Luxímetro com certificado de calibração válido, fotocélula com correção de cosseno e de cor, apoiada no plano de referência de cada atividade (0,75 m para mesa, piso para circulação).',
      'Malha de pontos no centro de células de lado p = 0,2 × 5^log10(d), d = maior dimensão do ambiente (critério da EN 12464-1 adotado como premissa) [CONFERIR com a NBR ISO/CIE 8995-1].',
      'Medição só com iluminação artificial (à noite ou com a luz natural bloqueada), após 15 min de estabilização das luminárias. Iluminância média = média aritmética das leituras; uniformidade Uo = Emin/Emed.',
      'Comissionamento: acionamento de cada comando, teste de cobertura e retardo dos sensores, verificação do endereçamento, grupos e cenas DALI e da dimerização em toda a faixa.',
    ],
    medicoes: [
      { titulo: '6.1 Iluminância média e uniformidade por ambiente', colunas: ['Ambiente', 'Pontos', 'Em exigida (lx)', 'E média (lx)', 'E mín. (lx)', 'Uo (mín.)', 'Resultado'], proporcoes: [1.6, 0.6, 0.9, 0.9, 0.8, 0.9, 0.8],
        linhas: res.medicoes.map(m => [m.ambiente, m.leituras.length || '', m.emExigida ?? '—', m.emed != null ? Math.round(m.emed) : '', m.emin != null ? Math.round(m.emin) : '', m.uo != null ? `${num(m.uo)} (≥ ${num(m.uoMin)})` : '', m.resultado]),
        nota: 'Resultado C quando E média ≥ Em exigida e Uo ≥ uniformidade mínima da atividade; leituras na malha de pontos da tabela 6.2.' },
      { titulo: '6.2 Malha de medição recomendada', colunas: ['Ambiente', 'C × L (m)', 'Malha p (m)', 'Pontos (nx × ny)', 'Plano (m)', 'Em de projeto (lx)'], proporcoes: [1.6, 0.9, 0.8, 1, 0.7, 0.9],
        linhas: calc.ambientes.map(a => [a.nome, `${num(a.comprimento)} × ${num(a.largura)}`, num(a.malha.p), `${a.malha.pontos} (${a.malha.nx} × ${a.malha.ny})`, num(a.plano), Math.round(a.emObtida)]) },
    ],
    conclusoes: ['Medições sem iluminação natural representam a iluminância inicial da instalação nova; a iluminância mantida ao longo da vida depende do plano de manutenção compatível com o FM adotado.'],
    proximaInspecao: [['Periodicidade sugerida', 'Nova medição a cada 2 anos, ou após troca de luminárias, layout ou forro [CONFERIR com o cliente]'], ['Manutenção', 'Limpeza das luminárias conforme o FM adotado no projeto']],
  };
}

function cfgChecklist(res) {
  const { calc } = res;
  return {
    titulo: 'CHECKLIST DE CAMPO — ILUMINAÇÃO', subtitulo: 'ABNT NBR ISO/CIE 8995-1 — medição de iluminância e comissionamento', tituloCurto: 'Checklist de campo — iluminação',
    secoesChecklist: SECOES_CHECKLIST,
    preparacao: [
      'Levar: luxímetro calibrado (certificado válido), trena/medidor laser, escada, câmera e a planta com a malha de pontos de cada ambiente.',
      'Medir à noite ou com a luz natural bloqueada; ligar a iluminação 15 min antes; anotar cada leitura na posição da malha.',
      'Para comandos e quadros: seguir a NR-10 (desenergizar antes de abrir quadros e luminárias).',
    ],
    referencias: calc.ambientes.map(a => [`${a.nome} — iluminância`, `Em ≥ ${a.emExigida} lx (projeto ${Math.round(a.emObtida)} lx), Uo ≥ ${num(a.uoMin)}, ${a.n} luminárias ${a.luminaria.codigo}`]),
    medicoes: [
      { titulo: 'Medição de iluminância (malha de pontos)', colunas: ['Ambiente', 'Malha', 'Pontos', 'E média', 'E mín.', 'Uo'], proporcoes: [1.8, 0.7, 0.8, 0.8, 0.8, 0.6],
        linhas: calc.ambientes.map(a => [a.nome, `${num(a.malha.p)} m`, `${a.malha.nx} × ${a.malha.ny}`, '', '', '']) },
      { titulo: 'Comissionamento dos comandos', colunas: ['Ambiente', 'Controle', 'Teste', 'Obs.'], proporcoes: [1.6, 1.4, 1, 1.6],
        linhas: calc.ambientes.map(a => [a.nome, C.CONTROLES[a.controle] + (a.presenca ? ' + sensor' : ''), '☐ ok   ☐ falha', '']) },
    ],
  };
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial luminotécnico', formato: 'Word', nome: 'Memorial_Luminotecnico',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO E DE CÁLCULO — PROJETO LUMINOTÉCNICO', subtitulo: 'ABNT NBR ISO/CIE 8995-1:2013 — método dos lúmens — circuitos pela ABNT NBR 5410', tituloCurto: 'Memorial — luminotécnico', sigla: 'MEM-ILUM', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de cálculo, circuitos e materiais', formato: 'Excel', nome: 'Luminotecnico',
    gerar: (res) => {
      const { calc } = res;
      return D.gerarPlanilha([
        { nome: 'Ambientes', colunas: [
          { header: 'Ambiente', key: 'nome', width: 24 }, { header: 'Atividade', key: 'atividadeRotulo', width: 36 }, { header: 'C (m)', key: 'comprimento', numFmt: '0.00' }, { header: 'L (m)', key: 'largura', numFmt: '0.00' },
          { header: 'Área (m²)', key: 'area', numFmt: '0.00' }, { header: 'Pé-direito (m)', key: 'peDireito', numFmt: '0.00' }, { header: 'Plano (m)', key: 'plano', numFmt: '0.00' }, { header: 'hm (m)', key: 'hm', numFmt: '0.00' },
          { header: 'k', key: 'k', numFmt: '0.00' }, { header: 'Refl. teto/parede/piso', key: 'refl', width: 18 }, { header: 'FU', key: 'fu', numFmt: '0.000' }, { header: 'Fonte do FU', key: 'fuFonte', width: 24 }, { header: 'FM', key: 'fm', numFmt: '0.00' },
          { header: 'Em exigida (lx)', key: 'emExigida' }, { header: 'UGR_L', key: 'ugrL' }, { header: 'Ra mín.', key: 'raMin' }, { header: 'Luminária', key: 'lum' }, { header: 'Φ (lm)', key: 'fluxo' },
          { header: 'N calculado', key: 'nCalc', numFmt: '0.00' }, { header: 'nx', key: 'nx' }, { header: 'ny', key: 'ny' }, { header: 'N', key: 'n' }, { header: 'dx (m)', key: 'dx', numFmt: '0.00' }, { header: 'dy (m)', key: 'dy', numFmt: '0.00' },
          { header: 'Espaç. máx. (m)', key: 'smax', numFmt: '0.00' }, { header: 'Em obtida (lx)', key: 'emObtida', numFmt: '0' }, { header: 'Potência (W)', key: 'potencia', numFmt: '0' }, { header: 'W/m²', key: 'dpi', numFmt: '0.0' },
          { header: 'W/m²/100 lx', key: 'dpi100', numFmt: '0.00' }, { header: 'Controle', key: 'controleRotulo', width: 26 }, { header: 'Sensores', key: 'nSensores' }, { header: 'End. DALI', key: 'enderecos' }, { header: 'Circuito', key: 'circ' },
        ], linhas: calc.ambientes.map(a => ({ ...a, refl: `${a.refl.teto} / ${a.refl.parede} / ${a.refl.piso}`, lum: a.luminaria.codigo, fluxo: a.luminaria.fluxo, controleRotulo: C.CONTROLES[a.controle], nSensores: a.sensores.n, circ: a.circuitos.join(', ') })) },
        { nome: 'Luminárias', colunas: [{ header: 'Código', key: 'codigo' }, { header: 'Tipo', key: 'tipo' }, { header: 'Descrição', key: 'descricao', width: 36 }, { header: 'Potência (W)', key: 'potencia' }, { header: 'Fluxo (lm)', key: 'fluxo' }, { header: 'lm/W', key: 'eficacia', numFmt: '0' }, { header: 'Ra', key: 'ra' }, { header: 'TCC (K)', key: 'tcc' }, { header: 'UGR', key: 'ugr' }, { header: 'FU fabricante', key: 'fu' }, { header: 'Quantidade', key: 'qtd' }],
          linhas: calc.luminarias.map(l => ({ ...l, qtd: calc.ambientes.filter(a => a.luminaria.codigo === l.codigo).reduce((s, a) => s + a.n, 0) })) },
        { nome: 'Circuitos', colunas: [{ header: 'Circuito', key: 'id' }, { header: 'Ambientes', key: 'amb', width: 40 }, { header: 'Luminárias', key: 'luminarias' }, { header: 'VA', key: 'potencia_va' }, { header: 'Tensão (V)', key: 'tensao' }, { header: 'Ib (A)', key: 'ib', numFmt: '0.00' }, { header: 'L eq. (m)', key: 'comprimento', numFmt: '0.0' }, { header: 'Rota (m)', key: 'rota', numFmt: '0.0' }, { header: 'Seção (mm²)', key: 'secao' }, { header: 'Iz (A)', key: 'iz', numFmt: '0.0' }, { header: 'Disjuntor (A)', key: 'disjuntor' }, { header: 'DR', key: 'drTxt' }, { header: 'Queda (%)', key: 'queda', numFmt: '0.00' }],
          linhas: calc.circuitos.map(x => ({ ...x, amb: x.ambientes.join(', '), drTxt: x.dr ? '30 mA' : '' })) },
        { nome: 'Posições (planta)', colunas: [{ header: 'Ambiente', key: 'ambiente', width: 24 }, { header: 'Elemento', key: 'elemento', width: 18 }, { header: 'Id', key: 'id' }, { header: 'x (m)', key: 'x', numFmt: '0.00' }, { header: 'y (m)', key: 'y', numFmt: '0.00' }, { header: 'Obs.', key: 'obs', width: 40 }],
          linhas: calc.ambientes.flatMap(a => [
            ...a.posicoes.map((pt, i) => ({ ambiente: a.nome, elemento: `Luminária ${a.luminaria.codigo}`, id: `${a.luminaria.codigo}-${i + 1}`, ...pt, obs: i === 0 ? `origem no canto; x ao longo de ${a.comprimento} m; grade ${a.nx} × ${a.ny}` : '' })),
            ...a.sensores.posicoes.map((pt, i) => ({ ambiente: a.nome, elemento: 'Sensor de presença', id: `SP-${i + 1}`, ...pt, obs: '' })),
            ...(a.comandos.total ? [{ ambiente: a.nome, elemento: 'Comando', id: 'S', x: null, y: null, obs: `${comandosTexto(a)} — junto à porta (h = 1,10 m)` }] : []),
          ]) },
        D.abaMateriais(calc.materiais),
      ]);
    } },
  { tipo: 'relatorio', rotulo: 'Relatório de medição e comissionamento', formato: 'Word', nome: 'Relatorio_Medicao_Iluminancia',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, cfgRelatorio(res), { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Iluminacao',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, cfgChecklist(res), res.checklist)) },
];

// ── Orçamento ──────────────────────────────────────────────────────────────

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const obra = dados.obra?.nome || dados.cliente?.nome || 'a edificação';
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade, subgrupo = 'Iluminação') => ({ secao: S, subgrupo, codigo, descricao, quantidade, unidade });
  const t = calc.totais;
  if (modo === 'inspecao') {
    return {
      cliente_nome: dados.cliente?.nome || '',
      escopo: `Medição de iluminância por malha de pontos (ABNT NBR ISO/CIE 8995-1) e comissionamento dos comandos de iluminação de ${obra} (${t.ambientes} ambientes), com relatório técnico e ART.${res.ncs.length ? ` Inclui a correção das ${res.ncs.length} não conformidades apontadas (itens a cotar).` : ''}`,
      observacoes: 'Rascunho gerado pela skill de iluminação — conferir antes de enviar ao cliente.',
      itens: [
        srv('ilum_medicao', 'Medição de iluminância por malha de pontos e teste dos comandos (por ambiente)', t.ambientes, 'un', 'Medição de iluminação'),
        srv('ilum_relatorio', 'Relatório de medição de iluminância e comissionamento com ART', 1, 'vb', 'Medição de iluminação'),
        ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' })),
      ],
    };
  }
  const interno = calc.circuitos.reduce((s, x) => s + x.rota, 0);
  const comandos = calc.ambientes.reduce((s, a) => s + a.comandos.total, 0);
  const temDali = calc.barramentos.length > 0;
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: `Fornecimento e instalação do sistema de iluminação de ${obra} conforme projeto luminotécnico (ABNT NBR ISO/CIE 8995-1): ${t.luminarias} luminárias LED (${num(t.potencia / 1000, 2)} kW, ${num(t.dpi, 1)} W/m²)${t.sensores ? `, ${t.sensores} sensores de presença` : ''}${temDali ? `, ${calc.barramentos.length} linha(s) DALI-2 com ${t.enderecosDali} endereços programados` : ''}, comandos e ${calc.circuitos.length} circuitos de iluminação (ABNT NBR 5410), com projeto e ART.`,
    observacoes: 'Rascunho gerado pela skill de iluminação — conferir modelos, quantidades e preços antes de enviar ao cliente.',
    itens: [
      ...calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Iluminação', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
      ...(t.porTipo.embutir ? [srv('ilum_luminaria_embutir', 'Instalação de luminária de embutir', t.porTipo.embutir, 'un')] : []),
      ...(t.porTipo.sobrepor ? [srv('ilum_luminaria_sobrepor', 'Instalação de luminária de sobrepor', t.porTipo.sobrepor, 'un')] : []),
      ...(t.porTipo.pendente ? [srv('ilum_luminaria_pendente', 'Instalação de luminária pendente (com suspensão)', t.porTipo.pendente, 'un')] : []),
      ...(t.metrosPerfil ? [srv('ilum_perfil_led', 'Instalação de perfil LED linear (embutir/sobrepor/marcenaria)', Math.ceil(t.metrosPerfil * 10) / 10, 'm')] : []),
      ...(t.fontes ? [srv('ilum_driver', 'Instalação de driver/fonte LED remota', t.fontes, 'un')] : []),
      ...(comandos ? [srv('ilum_interruptor_dimmer', 'Instalação de interruptor/dimmer/botoeira de iluminação', comandos, 'un')] : []),
      ...(t.sensores ? [srv('ilum_sensor_presenca', 'Instalação e ajuste de sensor de presença', t.sensores, 'un')] : []),
      ...(temDali ? [
        srv('ilum_controlador_dali', 'Instalação de controlador/gateway DALI-2 e fonte de barramento', calc.barramentos.length, 'un'),
        srv('ilum_programacao_dali', 'Endereçamento, grupos, cenas e comissionamento DALI (por endereço)', t.enderecosDali, 'pt'),
      ] : []),
      srv('ilum_infraestrutura', 'Infraestrutura e fiação dos circuitos de iluminação (eletrodutos e cabos)', Math.ceil(interno), 'm'),
      srv('ele_disjuntores', 'Instalação de disjuntores e DR dos circuitos de iluminação', calc.circuitos.length + calc.circuitos.filter(x => x.dr).length, 'un'),
      srv('ilum_projeto', 'Projeto luminotécnico com memorial de cálculo e ART', 1, 'vb'),
    ],
  };
}

// ── Formulário da tela ─────────────────────────────────────────────────────

const OP = {
  tensoes: F.op([['127', '127 V (F-N)'], ['220', '220 V (F-N)']]),
  tensoesFF: F.op([['220', '220 V (F-F)'], ['380', '380 V (F-F)']]),
  ligacao: F.op([['FN', 'Fase-neutro'], ['FF', 'Fase-fase']]),
  isolacao: F.op([['PVC', 'PVC 70 °C (450/750 V)'], ['EPR', 'EPR/XLPE 90 °C (0,6/1 kV)']]),
  metodo: F.op([['B1', 'B1 — eletroduto aparente/embutido'], ['B2', 'B2 — cabo multipolar em eletroduto'], ['C', 'C — sobre parede/bandeja'], ['E', 'E — bandeja perfurada']]),
  conservacao: F.op(Object.entries(C.ROTULO_CONSERVACAO).map(([k, v]) => [k, `${v} — FM ${String(C.FM[k]).replace('.', ',')}`])),
  tipoLum: F.op(Object.entries(C.TIPOS_LUMINARIA).map(([k, v]) => [k, v.charAt(0).toUpperCase() + v.slice(1)])),
  controle: F.op(Object.entries(C.CONTROLES)),
  atividade: F.op([...C.ATIVIDADES].sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR')).map(a => [a.id, `${a.rotulo} — ${a.em} lx`])),
  teto: F.op([['0.8', 'Branco (0,8)'], ['0.7', 'Claro (0,7)'], ['0.5', 'Médio (0,5)'], ['0.3', 'Escuro (0,3)']]),
  parede: F.op([['0.5', 'Clara (0,5)'], ['0.3', 'Média (0,3)'], ['0.1', 'Escura (0,1)']]),
  piso: F.op([['0.3', 'Claro (0,3)'], ['0.2', 'Médio (0,2)'], ['0.1', 'Escuro (0,1)']]),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Critérios do projeto e alimentação', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'projeto.conservacao_padrao', rotulo: 'Conservação padrão (FM)', tipo: 'selecao', opcoes: OP.conservacao },
      { caminho: 'projeto.fator_espacamento', rotulo: 'Espaçamento máx. (× hm)', tipo: 'numero', dica: 'Típico 1,5 — conferir na curva fotométrica' },
      { caminho: 'projeto.razao_max_espacamento', rotulo: 'Razão máx. entre espaçamentos', tipo: 'numero', dica: 'dx/dy; padrão 1,5' },
      { caminho: 'projeto.eficacia_minima_lm_w', rotulo: 'Eficácia mínima (lm/W)', tipo: 'numero' },
      { caminho: 'projeto.sensor_diametro_m', rotulo: 'Sensor: diâmetro de detecção (m)', tipo: 'numero' },
      { caminho: 'projeto.dimmer_capacidade_w', rotulo: 'Dimmer: potência máx. (W)', tipo: 'numero' },
      { caminho: 'projeto.rele_sensor_w', rotulo: 'Sensor: carga máx. do relé (W)', tipo: 'numero' },
      { caminho: 'projeto.drivers_por_controlador_010', rotulo: 'Drivers por controlador 0-10 V', tipo: 'numero' },
      { caminho: 'projeto.enderecos_dali', rotulo: 'Endereços por linha DALI', tipo: 'numero', dica: 'Máximo 64 (IEC 62386)' },
      { caminho: 'projeto.fp_driver', rotulo: 'Fator de potência dos drivers', tipo: 'numero' },
      { caminho: 'projeto.fonte_perfil_w', rotulo: 'Fonte do perfil LED (W)', tipo: 'numero' },
    ] },
    { tipo: 'nota', texto: 'Circuitos de iluminação (NBR 5410) — mesmo motor da elétrica predial.' },
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'instalacao.tensao_fn', rotulo: 'Tensão F-N', tipo: 'selecao', opcoes: OP.tensoes },
      { caminho: 'instalacao.tensao_ff', rotulo: 'Tensão F-F', tipo: 'selecao', opcoes: OP.tensoesFF },
      { caminho: 'instalacao.ligacao_iluminacao', rotulo: 'Ligação dos circuitos', tipo: 'selecao', opcoes: OP.ligacao },
      { caminho: 'instalacao.limite_circuito_iluminacao_a', rotulo: 'Corrente máx. por circuito (A)', tipo: 'numero' },
      { caminho: 'projeto.potencia_max_circuito_va', rotulo: 'Potência máx. por circuito (VA)', tipo: 'numero', dica: 'Opcional — limita além da corrente (ex.: 1 200 VA)' },
      { caminho: 'instalacao.isolacao', rotulo: 'Isolação', tipo: 'selecao', opcoes: OP.isolacao },
      { caminho: 'instalacao.metodo', rotulo: 'Método de instalação', tipo: 'selecao', opcoes: OP.metodo },
      { caminho: 'instalacao.temperatura', rotulo: 'Temperatura ambiente (°C)', tipo: 'numero' },
      { caminho: 'instalacao.agrupamento', rotulo: 'Circuitos agrupados', tipo: 'numero' },
      { caminho: 'instalacao.comprimento_medio_circuito_m', rotulo: 'Distância padrão ao quadro (m)', tipo: 'numero' },
      { caminho: 'instalacao.queda_max_terminal_pct', rotulo: 'Queda máx. no circuito (%)', tipo: 'numero' },
    ] },
  ] },
  { titulo: '3. Luminárias do projeto', aberta: true, resumo: null, itens: [
    { tipo: 'nota', texto: 'Uma linha por modelo. Fluxo = lm da LUMINÁRIA (ficha técnica). Perfil LED: potência e fluxo POR PEÇA do comprimento informado. FU do fabricante é opcional (substitui a tabela simplificada).' },
    { tipo: 'tabela', caminho: 'luminarias', rotuloAdicionar: 'Adicionar luminária',
      novaLinha: { codigo: 'L{n}', descricao: '', tipo: 'embutir', potencia_w: null, fluxo_lm: null, ra: 80, tcc_k: 4000, ugr: null, fu: null, suspensao_m: null, comprimento_m: null, driver_externo: false },
      colunas: [
        { campo: 'codigo', rotulo: 'Código', largura: 70 }, { campo: 'descricao', rotulo: 'Descrição / modelo' },
        { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.tipoLum, largura: 130 },
        { campo: 'potencia_w', rotulo: 'W', tipo: 'numero', largura: 60 }, { campo: 'fluxo_lm', rotulo: 'lm', tipo: 'numero', largura: 70 },
        { campo: 'ra', rotulo: 'Ra', tipo: 'numero', largura: 55 }, { campo: 'tcc_k', rotulo: 'TCC (K)', tipo: 'numero', largura: 70 },
        { campo: 'ugr', rotulo: 'UGR', tipo: 'numero', largura: 55 }, { campo: 'fu', rotulo: 'FU fabr.', tipo: 'numero', largura: 65 },
        { campo: 'suspensao_m', rotulo: 'Suspensão (m)', tipo: 'numero', largura: 80 }, { campo: 'comprimento_m', rotulo: 'Peça perfil (m)', tipo: 'numero', largura: 80 },
        { campo: 'driver_externo', rotulo: 'Driver à parte', tipo: 'check', largura: 70 },
      ] },
  ] },
  { titulo: '4. Ambientes', aberta: true, itens: [
    { tipo: 'nota', texto: 'Atividade pela NBR ISO/CIE 8995-1 (define Em, UGR e Ra). Informe comprimento × largura (ou só a área, se irregular). Luminária = código da tabela acima. Plano de trabalho vazio usa o da atividade (0,75 m mesa; 0 = piso). Opcionais: FU do ambiente, Em própria, quantidade fixa (verificar projeto existente) e circuito.' },
    { tipo: 'tabela', caminho: 'ambientes', rotuloAdicionar: 'Adicionar ambiente',
      novaLinha: { nome: '', atividade: 'escritorio', comprimento_m: null, largura_m: null, area_m2: null, pe_direito_m: 2.8, plano_trabalho_m: null, refl_teto: '0.7', refl_parede: '0.5', refl_piso: '0.2', luminaria: '', controle: 'interruptor', sensor_presenca: false, conservacao: '', portas: 1, distancia_quadro_m: null, fu: null, em_lx: null, quantidade: null, circuito: '' },
      colunas: [
        { campo: 'nome', rotulo: 'Ambiente', largura: 140 }, { campo: 'atividade', rotulo: 'Atividade (NBR ISO/CIE 8995-1)', tipo: 'selecao', opcoes: OP.atividade, largura: 260 },
        { campo: 'comprimento_m', rotulo: 'C (m)', tipo: 'numero', largura: 60 }, { campo: 'largura_m', rotulo: 'L (m)', tipo: 'numero', largura: 60 },
        { campo: 'area_m2', rotulo: 'Área (m²)', tipo: 'numero', largura: 70 }, { campo: 'pe_direito_m', rotulo: 'Pé-direito (m)', tipo: 'numero', largura: 75 },
        { campo: 'plano_trabalho_m', rotulo: 'Plano (m)', tipo: 'numero', largura: 65 },
        { campo: 'refl_teto', rotulo: 'Teto', tipo: 'selecao', opcoes: OP.teto, largura: 110 }, { campo: 'refl_parede', rotulo: 'Parede', tipo: 'selecao', opcoes: OP.parede, largura: 110 }, { campo: 'refl_piso', rotulo: 'Piso', tipo: 'selecao', opcoes: OP.piso, largura: 100 },
        { campo: 'luminaria', rotulo: 'Luminária', largura: 75 }, { campo: 'controle', rotulo: 'Controle', tipo: 'selecao', opcoes: OP.controle, largura: 190 },
        { campo: 'sensor_presenca', rotulo: 'Sensor de presença', tipo: 'check', largura: 75 },
        { campo: 'conservacao', rotulo: 'Conservação', tipo: 'selecao', opcoes: [{ valor: '', rotulo: '— padrão do projeto' }, ...OP.conservacao], largura: 150 },
        { campo: 'portas', rotulo: 'Portas', tipo: 'numero', largura: 55 }, { campo: 'distancia_quadro_m', rotulo: 'Dist. quadro (m)', tipo: 'numero', largura: 80 },
        { campo: 'fu', rotulo: 'FU', tipo: 'numero', largura: 55 }, { campo: 'em_lx', rotulo: 'Em própria (lx)', tipo: 'numero', largura: 75 },
        { campo: 'quantidade', rotulo: 'Qtd. fixa', tipo: 'numero', largura: 65 }, { campo: 'circuito', rotulo: 'Circuito', largura: 65 },
      ] },
  ] },
  F.secaoInspecao(5, F.op([['comissionamento', 'Comissionamento (instalação nova)'], ['periodica', 'Medição periódica'], ['diagnostico', 'Diagnóstico de instalação existente']])),
  F.secaoChecklist(6, CHECKLIST.length),
  { titulo: '7. Medições de iluminância', itens: [
    { tipo: 'nota', texto: 'Uma linha por ambiente (nome igual ao da tabela de ambientes). Leituras em lux separadas por ponto e vírgula, na ordem da malha. Em exigida vazia usa a do ambiente.' },
    { tipo: 'tabela', caminho: 'inspecao.medicoes_iluminancia', rotuloAdicionar: 'Adicionar medição', novaLinha: { ambiente: '', leituras: '', em_exigida_lx: null, observacao: '' },
      colunas: [{ campo: 'ambiente', rotulo: 'Ambiente', largura: 160 }, { campo: 'leituras', rotulo: 'Leituras (lx; separadas por ;)', tipo: 'area' }, { campo: 'em_exigida_lx', rotulo: 'Em exigida (lx)', tipo: 'numero', largura: 90 }, { campo: 'observacao', rotulo: 'Observação' }] },
  ] },
  F.secaoNcs(8, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(9),
];

module.exports = criarDisciplina({
  chave: 'iluminacao',
  nome: 'Iluminação — luminotécnico e automação (NBR ISO/CIE 8995-1)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Fornecimento e instalação da iluminação', descricao: 'Luminárias, drivers, sensores, controladores DALI/0-10 V, cabos e eletrodutos dos circuitos de iluminação e mão de obra' },
    { modo: 'inspecao', rotulo: 'Medição e relatório', descricao: 'Medição de iluminância por ambiente, comissionamento dos comandos, relatório com ART e correção das não conformidades' },
  ],
  montarOrcamento,
});
