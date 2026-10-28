// Disciplina AUTOMAÇÃO (BMS, climatização e residencial) — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const T = require('./tabelas');
const { calcular } = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-comercial.json');

const NORMAS = [
  ['ISO 16484 (partes 2, 3 e 5)', 'Sistemas de automação e controle predial (BACS) — equipamentos, funções e protocolo BACnet'],
  ['ISO 52120-1:2022 (antiga EN 15232)', 'Contribuição da automação e da gestão técnica para a eficiência energética — classes A a D'],
  ['ABNT NBR 16401 (partes 1 a 3)', 'Instalações de ar-condicionado — projeto, conforto térmico e qualidade do ar interior'],
  ['ABNT NBR 7256', 'Tratamento de ar em estabelecimentos assistenciais de saúde (quando aplicável)'],
  ['ISO/IEC 14543-3 (KNX) e Modbus', 'Protocolos de comunicação de campo'],
  ['ABNT NBR 5410 e NBR 14565', 'Instalações elétricas de baixa tensão e cabeamento estruturado'],
];
const SECOES_CHECKLIST = ['Documentação', 'Quadros e campo', 'Rede', 'Supervisório', 'Funções de controle', 'Ensaios', 'Residencial'];
const num = (v, c = 2) => (v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c }));
const pct = (v) => `${num(v * 100, 0)} %`;
const ROTULO_CONTROLE = { nenhum: 'Sem controle', termostato: 'Termostato comunicante', sensor_t: 'Sensor de temperatura', sensor_tur: 'Sensor T + UR', co2: 'Sensor CO₂ + T + UR (DCV)' };

// Sequências de controle típicas por equipamento (descritivo de funcionamento)
const SEQUENCIAS = {
  chiller: 'Chillers: habilitação por horário e demanda, sequenciamento e rodízio por horas de operação, reajuste do setpoint de água gelada pela carga, alarmes de falha lidos pela integração.',
  bomba: 'Bombas: comando com confirmação de status, velocidade variável pelo diferencial de pressão do circuito, rodízio e reserva automática em falha.',
  torre: 'Torres: ventilador em estágios ou velocidade variável pela temperatura da água de condensação.',
  ahu: 'Fancoils (AHU): liga por horário/ocupação; válvula de água gelada modulando pela temperatura de retorno ou do ambiente; damper de ar externo pela vazão mínima da NBR 16401-3 (ou pelo CO₂); alarme de filtro sujo por pressostato; desligamento pelo sistema de incêndio.',
  fancolete: 'Fancoletes: velocidade e válvula pela temperatura do ambiente, com limites de setpoint para o usuário e modo desocupado.',
  vrf: 'VRF: integração por gateway — liga/desliga, modo, setpoint e falhas de cada unidade interna; bloqueio de faixa de setpoint pelo supervisório.',
  split: 'Splits: comando por gateway ou IR — liga/desliga por horário e presença, setpoint limitado.',
  exaustor: 'Exaustores/ventiladores: liga por horário ou intertravado com o uso, com confirmação de status e alarme de falha.',
  iluminacao: 'Iluminação: comando por horário e por presença nas áreas comuns, com confirmação de status.',
  medidor: 'Medidores de energia: leitura de consumo, demanda e qualidade de energia para relatórios e alarmes de demanda.',
  gerador: 'Grupo gerador: status, falhas, combustível e partidas lidos pela integração.',
  nobreak: 'Nobreaks: status, autonomia e alarmes lidos pela integração.',
  reservatorio: 'Reservatórios: nível e alarmes de nível alto/baixo.',
  sala_pressao: 'Salas com pressão controlada: temperatura, umidade e diferencial de pressão monitorados e controlados nos limites do projeto, com alarme local e no supervisório.',
  quadro: 'Quadros elétricos: status de disjuntores e falhas monitorados.',
};

function processar(dados) {
  const calc = calcular(dados);
  const insp = dados.inspecao || {};
  const na = {};
  if (!calc.resid) for (const c of ['H1', 'H2', 'H3', 'H4']) na[c] = 'Sem automação residencial';
  if (!calc.bms) for (const c of ['D1', 'D2', 'Q1', 'Q2', 'Q4', 'R1', 'R2', 'S1', 'S2', 'S4', 'T1', 'T3']) na[c] = 'Sem BMS';
  if (!calc.zonas.length) na.F2 = 'Sem zonas de climatização';
  if (!(dados.equipamentos || []).some(e => e.tipo === 'sala_pressao')) na.F5 = 'Sem salas com pressão controlada';
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, na);
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const pontos = (insp.testes_pontos || []).map(m => ({ ...m, resultado: m.ok == null ? 'NV' : m.ok ? 'C' : 'NC' }));
  const sensores = (insp.sensores || []).map(m => {
    const desvio = m.valor_bms == null || m.valor_referencia == null || m.valor_bms === '' || m.valor_referencia === '' ? null : Number(m.valor_bms) - Number(m.valor_referencia);
    return { ...m, desvio, resultado: desvio == null ? 'NV' : Math.abs(desvio) <= (Number(m.tolerancia) || 0.5) ? 'C' : 'NC' };
  });
  return { dados, calc, insp, checklist, ncs, med: { pontos, sensores }, parecer: I.parecer(checklist, ncs, [...pontos, ...sensores]) };
}

function resumir(res) {
  const { bms, zonas, efic, resid } = res.calc;
  const ind = [];
  if (bms) {
    ind.push({ rotulo: 'Pontos físicos', valor: `${bms.fisicos}`, detalhe: `DI ${bms.tot.di} · DO ${bms.tot.do} · AI ${bms.tot.ai} · AO ${bms.tot.ao} · com ${pct(bms.reserva)} de reserva: ${bms.fisicosComReserva}` });
    ind.push({ rotulo: 'Integrações', valor: `${bms.rede} pontos`, detalhe: `${bms.dispositivosRede} dispositivo(s) em ${bms.segmentos} segmento(s) RS-485` });
    ind.push({ rotulo: 'Controladores', valor: `${bms.controladores}`, detalhe: `${bms.quadros} quadro(s) · licença ${bms.licenca} pontos` });
  }
  if (zonas.length) {
    const total = zonas.reduce((a, z) => a + z.m3h, 0);
    ind.push({ rotulo: 'Ar externo', valor: `${num(total, 0)} m³/h`, detalhe: `${zonas.length} zona(s) · ${zonas.filter(z => z.dcv).length} com controle por CO₂` });
  }
  if (efic) {
    ind.push({ rotulo: 'Classe da automação', valor: `${efic.atual.classe} → ${efic.proposta.classe}`, detalhe: 'ISO 52120-1 / EN 15232 (avaliação simplificada)', ok: ['A', 'B'].includes(efic.proposta.classe) });
    ind.push({ rotulo: 'Economia estimada', valor: `${num(efic.economiaKwh, 0)} kWh/mês`, detalhe: `climatização ${pct(efic.econTh)} · demais ${pct(efic.econEl)}${efic.economiaRs != null ? ` · R$ ${num(efic.economiaRs, 0)}/mês` : ''}` });
  }
  if (resid) ind.push({ rotulo: 'Automação residencial', valor: `${resid.dispositivos} dispositivos`, detalhe: `${resid.rotulo} · ${resid.ambientes.length} ambiente(s)` });
  const tabelas = [];
  if (bms) tabelas.push({ titulo: 'Lista de pontos (por equipamento)', colunas: ['Tag', 'Equipamento', 'Local', 'Qtd.', 'DI', 'DO', 'AI', 'AO', 'Rede'], linhas: linhasPontos(bms) });
  if (zonas.length) tabelas.push({ titulo: 'Zonas de climatização (NBR 16401-3)', colunas: ['Zona', 'Uso', 'Área (m²)', 'Pessoas', 'Ar externo (m³/h)', 'Controle', 'Setpoint CO₂', 'Redução média'], linhas: linhasZonas(zonas) });
  if (efic) tabelas.push({ titulo: 'Funções de automação — situação atual × proposta', colunas: ['Função', 'Atual', 'Classe', 'Proposta', 'Classe'], linhas: linhasFuncoes(efic) });
  if (resid) tabelas.push({ titulo: `Automação residencial — ${resid.rotulo}`, colunas: ['Ambiente', 'Luz liga/desliga', 'Luz dimerizável', 'Cortinas', 'Ar-cond.', 'Tomadas', 'Sensores', 'Cenas'], linhas: linhasResid(resid) });
  return { indicadores: ind, textos: res.calc.avisos, tabelas };
}

const linhasPontos = (b) => [
  ...b.linhas.map(l => [l.id, l.descricao, l.local, l.qtd, l.di * l.qtd, l.do * l.qtd, l.ai * l.qtd, l.ao * l.qtd, l.totalRede]),
  ['Total', '', '', '', b.tot.di, b.tot.do, b.tot.ai, b.tot.ao, b.rede],
];
const linhasZonas = (zonas) => zonas.map(z => [z.nome, z.rotuloUso, num(z.area, 0), z.pessoas, num(z.m3h, 0), ROTULO_CONTROLE[z.controle] || '—', z.dcv ? `${num(z.setpointCo2, 0)} ppm` : '—', z.dcv ? pct(z.reducao) : '—']);
function linhasFuncoes(efic) {
  // união das funções: a proposta já traz as mantidas como hoje e as novas sem nível atual
  const atual = Object.fromEntries(efic.atual.detalhes.map(d => [d.cod, d]));
  return efic.proposta.detalhes.map(d => [d.rotulo, atual[d.cod]?.nivel || '— (não informado)', atual[d.cod]?.classe || '—', d.nivel, d.classe])
    .concat([['Classe do conjunto (a menor das funções)', '', efic.atual.classe, '', efic.proposta.classe]]);
}
const linhasResid = (r) => r.ambientes.map(a => [a.nome, a.ilum_onoff || 0, a.ilum_dimer || 0, a.cortinas || 0, a.ar_condicionado || 0, a.tomadas || 0, a.sensores || 0, a.cenas || 0]);

function secoesMemorial(res) {
  const { bms, zonas, efic, resid, materiais, avisos } = res.calc;
  const escopo = [bms && 'sistema de supervisão e controle predial (BMS)', zonas.length && 'automação da climatização', resid && 'automação residencial'].filter(Boolean);
  const s = [{ titulo: '1. Objeto', paragrafos: [`Automação de ${res.dados.obra?.nome || 'a edificação'}: ${escopo.join(', ')}. As quantidades resultam das premissas declaradas neste memorial ${bms || zonas.length ? 'e da lista de equipamentos informada; a lista de pontos final deve ser compatibilizada com os projetos de ar-condicionado, elétrica e hidráulica e com os fabricantes.' : 'e do levantamento por ambiente; os modelos finais dependem da visita técnica (caixas, neutro e cobertura da rede).'}`] }];
  let i = 2;
  if (bms) {
    const prot = bms.protocolo === 'modbus' ? 'Modbus' : 'BACnet (ISO 16484-5)';
    s.push({ titulo: `${i++}. Arquitetura do sistema`, marcadores: [
      `Nível de gestão: servidor/estação com software supervisório (licença de ${bms.licenca} pontos), alarmes, tendências, programação horária e relatórios de energia.`,
      `Nível de automação: ${bms.controladores} controlador(es) programável(is) ${prot}/IP de ${bms.pontosPorControlador} pontos, em ${bms.quadros} quadro(s) de automação com fonte 24 V e nobreak.`,
      `Integrações: ${bms.dispositivosRede} dispositivo(s) por rede ${prot === 'Modbus' ? 'Modbus RTU' : 'BACnet MS/TP ou Modbus'} em ${bms.segmentos} segmento(s) RS-485 (até ${res.dados.sistema?.dispositivos_por_segmento || 32} dispositivos e 1 200 m por segmento, terminação de 120 Ω nas pontas).`,
      `Nível de campo: ${bms.fisicos} pontos físicos (${bms.fisicosComReserva} com ${pct(bms.reserva)} de reserva), cabo blindado de 1 par com blindagem aterrada numa só extremidade, separado dos circuitos de força.`,
    ] });
    s.push({ titulo: `${i++}. Lista de pontos`, tabela: { colunas: ['Tag', 'Equipamento', 'Local', 'Qtd.', 'DI', 'DO', 'AI', 'AO', 'Rede'], linhas: linhasPontos(bms), proporcoes: [0.7, 2.6, 1.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.5], tamanho: 15 },
      notas: ['DI: entrada digital (status, alarme) · DO: saída digital (comando) · AI: entrada analógica (temperatura, umidade, pressão, CO₂) · AO: saída analógica (válvula, damper, inversor) · Rede: pontos lidos por integração.'] });
    const tipos = [...new Set(bms.linhas.map(l => l.tipo))].filter(t => SEQUENCIAS[t]);
    if (tipos.length) s.push({ titulo: `${i++}. Descritivo de funcionamento (sequências de controle)`, marcadores: tipos.map(t => SEQUENCIAS[t]).concat(['Falha segura: em perda de comunicação, cada controlador mantém a última estratégia local; após queda de energia, o sistema retorna ao estado programado.']) });
  }
  if (zonas.length) {
    s.push({ titulo: `${i++}. Climatização — ar externo e controle por zona`, paragrafos: [
      'Vazão de ar externo pela ABNT NBR 16401-3 (procedimento de vazão, nível 1): Vbz = Fp·Pz + Fa·Az, com eficiência de distribuição Ez = 1 (insuflamento e retorno pelo forro, resfriamento).',
      `Nas zonas com controle por CO₂ (DCV), o damper de ar externo modula entre a parcela da área (Fa·Az) e a vazão de projeto, mantendo o CO₂ abaixo do setpoint. CO₂ em regime: Cint = ${T.CO2_EXTERNO_PPM} ppm + G/(vazão por pessoa), com G = ${num(T.CO2_PESSOA_LS, 4)} L/s·pessoa; setpoint limitado a ${num(res.dados.sistema?.co2_max_ppm || 1100, 0)} ppm. Redução média estimada com ${res.dados.sistema?.ocupacao_media_pct || 60} % de ocupação.`,
    ], tabela: { colunas: ['Zona', 'Uso', 'Área (m²)', 'Pessoas', 'Ar externo (m³/h)', 'Controle', 'Setpoint CO₂', 'Redução média'], linhas: linhasZonas(zonas), proporcoes: [1.5, 1.1, 0.7, 0.6, 0.9, 1.5, 0.8, 0.8], tamanho: 15 } });
  }
  if (efic) {
    s.push({ titulo: `${i++}. Eficiência energética da automação (ISO 52120-1 / EN 15232)`, paragrafos: [
      `Avaliação simplificada das funções de automação: classe atual ${efic.atual.classe} e classe proposta ${efic.proposta.classe} (a classe do conjunto é a menor entre as funções).${efic.limitantes.length ? ` Funções que limitam a classe proposta: ${efic.limitantes.join('; ')}.` : ''}`,
      `Pelo método dos fatores BAC (uso "${efic.uso}"): fator térmico ${num(efic.fatores.th[efic.atual.classe])} → ${num(efic.fatores.th[efic.proposta.classe])} (${pct(efic.econTh)} na climatização) e elétrico ${num(efic.fatores.el[efic.atual.classe])} → ${num(efic.fatores.el[efic.proposta.classe])} (${pct(efic.econEl)} nos demais usos). Sobre ${num(efic.kwhClima, 0)} + ${num(efic.kwhOutros, 0)} kWh/mês, a economia estimada é de ${num(efic.economiaKwh, 0)} kWh/mês${efic.economiaRs != null ? ` (R$ ${num(efic.economiaRs, 0)}/mês a R$ ${num(efic.tarifa)}/kWh)` : ''}. Estimativa para decisão de investimento — a economia real deve ser verificada por medição.`,
    ], tabela: { colunas: ['Função', 'Atual', 'Classe', 'Proposta', 'Classe'], linhas: linhasFuncoes(efic), proporcoes: [2, 2, 0.5, 2, 0.5], tamanho: 15 } });
  }
  if (resid) {
    const r = resid.rede;
    s.push({ titulo: `${i++}. Automação residencial — ${resid.rotulo}`, paragrafos: [
      resid.tecnologia === 'knx'
        ? `Barramento KNX com ${resid.dispositivos} dispositivos em ${r.linhas} linha(s) (até 64 dispositivos e 1 000 m por linha; consumo estimado ${r.consumoMa} mA por linha para fonte de 640 mA). Atuadores no quadro de automação, botoeiras nos ambientes e interface IP para programação (ETS) e aplicativo.`
        : `${resid.dispositivos} dispositivos ${resid.tecnologia === 'wifi' ? `Wi-Fi (${r.aps} ponto(s) de acesso na rede 2,4 GHz)` : `Zigbee 3.0 com ${r.hubs} central(is)`}, instalados atrás dos interruptores existentes (exigem neutro na caixa). Comandos locais continuam funcionando sem internet; cenas, horários e assistente de voz pelo aplicativo.`,
    ], tabela: { colunas: ['Ambiente', 'Luz liga/desliga', 'Luz dimerizável', 'Cortinas', 'Ar-cond.', 'Tomadas', 'Sensores', 'Cenas'], linhas: linhasResid(resid), proporcoes: [1.6, 0.8, 0.8, 0.7, 0.7, 0.7, 0.7, 0.6], tamanho: 15 } });
  }
  s.push({ titulo: `${i++}. Lista de materiais (preliminar)`, tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 0), m.referencia]), proporcoes: [0.7, 4, 0.5, 0.6, 1.4] } });
  if (avisos.length) s.push({ titulo: 'Avisos', marcadores: avisos });
  return s;
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial descritivo da automação', formato: 'Word', nome: 'Memorial_Automacao',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO — AUTOMAÇÃO PREDIAL', subtitulo: 'BMS, climatização e automação residencial — ISO 16484, ISO 52120-1 e ABNT NBR 16401', tituloCurto: 'Memorial — automação', sigla: 'MEM-AUT', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Lista de pontos e materiais', formato: 'Excel', nome: 'Automacao',
    gerar: (res) => D.gerarPlanilha([
      ...(res.calc.bms ? [{ nome: 'Lista de pontos', colunas: [{ header: 'Tag', key: 'id' }, { header: 'Equipamento', key: 'descricao', width: 40 }, { header: 'Local', key: 'local', width: 22 }, { header: 'Qtd.', key: 'qtd' }, { header: 'DI (un.)', key: 'di' }, { header: 'DO (un.)', key: 'do' }, { header: 'AI (un.)', key: 'ai' }, { header: 'AO (un.)', key: 'ao' }, { header: 'Físicos (total)', key: 'fisicos' }, { header: 'Rede (total)', key: 'totalRede' }], linhas: res.calc.bms.linhas }] : []),
      ...(res.calc.zonas.length ? [{ nome: 'Zonas', colunas: [{ header: 'Zona', key: 'nome', width: 26 }, { header: 'Uso', key: 'rotuloUso', width: 16 }, { header: 'Área (m²)', key: 'area' }, { header: 'Pessoas', key: 'pessoas' }, { header: 'Ar externo (L/s)', key: 'vbz', numFmt: '0.0' }, { header: 'Ar externo (m³/h)', key: 'm3h', numFmt: '0' }, { header: 'Controle', key: 'controle' }, { header: 'Setpoint CO₂ (ppm)', key: 'setpointCo2' }], linhas: res.calc.zonas }] : []),
      ...(res.calc.resid ? [{ nome: 'Residencial', colunas: [{ header: 'Ambiente', key: 'nome', width: 24 }, { header: 'Luz liga/desliga', key: 'ilum_onoff' }, { header: 'Luz dimerizável', key: 'ilum_dimer' }, { header: 'Cortinas', key: 'cortinas' }, { header: 'Ar-cond.', key: 'ar_condicionado' }, { header: 'Tomadas', key: 'tomadas' }, { header: 'Sensores', key: 'sensores' }, { header: 'Cenas', key: 'cenas' }], linhas: res.calc.resid.ambientes }] : []),
      D.abaMateriais(res.calc.materiais),
    ]) },
  { tipo: 'laudo', rotulo: 'Relatório de comissionamento / diagnóstico', formato: 'Word', nome: 'Relatorio_Automacao',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, {
      titulo: 'RELATÓRIO DE COMISSIONAMENTO E DIAGNÓSTICO — AUTOMAÇÃO PREDIAL', tipoInspecao: 'Comissionamento ponto a ponto e avaliação das funções de automação', tituloCurto: 'Relatório — automação', sigla: 'REL-AUT',
      objetivo: 'Verificar a instalação, a configuração, as funções de controle, a segurança cibernética e a documentação do sistema de automação, e avaliar a classe de eficiência da automação (ISO 52120-1).',
      listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
      descricao: [
        ...(res.calc.bms ? [['BMS', `${res.calc.bms.fisicos} pontos físicos, ${res.calc.bms.rede} pontos de integração, ${res.calc.bms.controladores} controlador(es)`]] : []),
        ...(res.calc.efic ? [['Classe da automação', `atual ${res.calc.efic.atual.classe} — proposta ${res.calc.efic.proposta.classe}`]] : []),
        ...(res.calc.resid ? [['Residencial', `${res.calc.resid.rotulo}, ${res.calc.resid.dispositivos} dispositivos`]] : []),
      ],
      metodologia: ['Inspeção visual dos quadros, sensores, atuadores e barramentos.', 'Teste ponto a ponto das entradas e saídas e conferência dos sensores com instrumento de referência.', 'Ensaio das funções de controle, alarmes, programação horária e retorno após queda de energia.'],
      medicoes: [
        { titulo: '6.1 Teste ponto a ponto', colunas: ['Tag', 'Tipo', 'Descrição', 'Resultado'], proporcoes: [1.2, 0.5, 3, 0.8], linhas: res.med.pontos.map(m => [m.tag, m.tipo || '', m.descricao || '', m.resultado]) },
        { titulo: '6.2 Conferência de sensores', colunas: ['Sensor', 'Valor no BMS', 'Referência', 'Desvio', 'Tolerância', 'Resultado'], proporcoes: [2, 0.8, 0.8, 0.7, 0.7, 0.8], linhas: res.med.sensores.map(m => [m.sensor, m.valor_bms ?? '', m.valor_referencia ?? '', m.desvio == null ? '' : num(m.desvio, 2), m.tolerancia ?? 0.5, m.resultado]) },
      ],
    }, { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Automacao',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, {
      titulo: 'CHECKLIST DE CAMPO — AUTOMAÇÃO PREDIAL', subtitulo: 'Comissionamento e diagnóstico (ISO 16484 / ISO 52120-1)', tituloCurto: 'Checklist — automação', secoesChecklist: SECOES_CHECKLIST,
      preparacao: ['Combinar com a operação os testes de comando (equipamentos vão ligar e desligar).', 'Levar: notebook com acesso ao supervisório, termo-higrômetro e medidor de CO₂ de referência, multímetro, lista de pontos impressa.'],
      referencias: [
        ...(res.calc.bms ? [['Pontos físicos previstos', String(res.calc.bms.fisicos)], ['Pontos de integração', String(res.calc.bms.rede)]] : []),
        ...(res.calc.resid ? [['Dispositivos residenciais', String(res.calc.resid.dispositivos)]] : []),
      ],
      medicoes: [{ titulo: 'Conferência de sensores', colunas: ['Sensor', 'Valor no BMS', 'Referência', 'Obs.'], proporcoes: [2.2, 1, 1, 2], linhas: res.calc.zonas.map(z => [z.nome, '', '', '']) }],
    }, res.checklist)) },
];

function montarOrcamento(res, modo) {
  const { bms, zonas, resid, materiais } = res.calc;
  const { dados } = res;
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade) => ({ secao: S, subgrupo: 'Automação', codigo, descricao, quantidade, unidade });
  let itens;
  if (modo === 'diagnostico') {
    itens = [srv('auto_inspecao', 'Diagnóstico/comissionamento do sistema de automação (testes ponto a ponto, funções e segurança)', 1, 'vb'),
      srv('auto_laudo', 'Relatório técnico com classe de eficiência da automação e ART', 1, 'vb'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' }))];
  } else {
    const sensores = (dados.zonas || []).filter(z => z.nome && z.controle && z.controle !== 'nenhum').length;
    itens = [
      ...materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Automação', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
      ...(bms ? [
        srv('auto_pontos_bms', 'Instalação e cabeamento de ponto físico de automação (por ponto)', bms.fisicos, 'pt'),
        ...(bms.quadros ? [srv('auto_quadro', 'Montagem e instalação de quadro de automação', bms.quadros, 'un')] : []),
        ...(bms.dispositivosRede ? [srv('auto_integracao', 'Integração de equipamento por rede (BACnet/Modbus)', bms.dispositivosRede, 'un')] : []),
        srv('auto_central', 'Instalação e configuração do servidor/supervisório', 1, 'un'),
      ] : []),
      ...(sensores ? [srv('auto_sensor', 'Instalação de sensor/termostato de ambiente', sensores, 'un')] : []),
      ...(resid ? [
        srv('auto_atuadores', 'Instalação de atuadores/módulos de automação (tomadas, cortinas, cenas)', resid.dispositivos, 'un'),
        ...(bms ? [] : [srv('auto_central', 'Instalação e configuração de central de automação', 1, 'un')]),
      ] : []),
      srv('auto_programacao', 'Programação, telas/aplicativo, cenas e sequências de controle', 1, 'vb'),
      srv('auto_comissionamento', 'Comissionamento ponto a ponto, testes e treinamento', 1, 'vb'),
      srv('auto_projeto', 'Projeto de automação (lista de pontos, arquitetura, descritivo) com ART', 1, 'vb'),
    ];
  }
  const partes = [bms && `BMS com ${bms.fisicos} pontos físicos e ${bms.dispositivosRede} integração(ões)`, zonas.length && `controle de climatização de ${zonas.length} zona(s)`, resid && `automação residencial ${resid.rotulo.split(' (')[0]} com ${resid.dispositivos} dispositivos`].filter(Boolean);
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: modo === 'diagnostico'
      ? `Diagnóstico e comissionamento do sistema de automação de ${dados.obra?.nome || 'a edificação'}, com testes ponto a ponto, verificação das funções de controle e da segurança, avaliação da classe de eficiência (ISO 52120-1) e relatório técnico com ART.`
      : `Fornecimento, instalação, programação e comissionamento de automação em ${dados.obra?.nome || 'a edificação'}: ${partes.join('; ')}, incluindo projeto, ART e treinamento.`,
    observacoes: 'Rascunho gerado pela skill de automação — lista de pontos e materiais preliminares; conferir com os projetos complementares e os fabricantes antes de enviar ao cliente.',
    itens,
  };
}

const OP = {
  uso: F.op([['escritorio', 'Escritório'], ['comercio', 'Comércio'], ['hotel', 'Hotel'], ['hospital', 'Hospital / saúde'], ['escola', 'Escola'], ['residencial', 'Residencial']]),
  protocolo: F.op([['bacnet', 'BACnet'], ['modbus', 'Modbus']]),
  equip: F.op(Object.entries(T.EQUIPAMENTOS).map(([k, v]) => [k, v.rotulo])),
  usoZona: F.op(Object.entries(T.AR_EXTERNO).map(([k, v]) => [k, v.rotulo])),
  controle: F.op(Object.entries(ROTULO_CONTROLE)),
  tecnologia: F.op(Object.entries(T.RESID).map(([k, v]) => [k, v.rotulo])),
};
const opcoesFuncao = (f) => [{ valor: '', rotulo: '—' }, ...F.op(f.niveis.map(([v, r, c]) => [v, `${r} (${c})`]))];

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Premissas do sistema', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.uso', rotulo: 'Uso da edificação', tipo: 'selecao', opcoes: OP.uso },
      { caminho: 'sistema.protocolo', rotulo: 'Protocolo principal', tipo: 'selecao', opcoes: OP.protocolo },
      { caminho: 'sistema.reserva_pct', rotulo: 'Reserva de pontos (%)', tipo: 'numero' },
      { caminho: 'sistema.pontos_por_controlador', rotulo: 'Pontos por controlador', tipo: 'numero' },
      { caminho: 'sistema.controladores_por_quadro', rotulo: 'Controladores por quadro', tipo: 'numero' },
      { caminho: 'sistema.dispositivos_por_segmento', rotulo: 'Dispositivos por segmento RS-485', tipo: 'numero' },
      { caminho: 'sistema.distancia_media_ponto_m', rotulo: 'Distância média ponto → quadro (m)', tipo: 'numero' },
      { caminho: 'sistema.zonas_no_bms', rotulo: 'Sensores das zonas no BMS', tipo: 'check' },
      { caminho: 'sistema.consumo_climatizacao_kwh_mes', rotulo: 'Consumo da climatização (kWh/mês)', tipo: 'numero' },
      { caminho: 'sistema.consumo_outros_kwh_mes', rotulo: 'Consumo de iluminação e outros (kWh/mês)', tipo: 'numero' },
      { caminho: 'sistema.tarifa_kwh', rotulo: 'Tarifa (R$/kWh)', tipo: 'numero' },
      { caminho: 'sistema.ocupacao_media_pct', rotulo: 'Ocupação média (%) — DCV', tipo: 'numero' },
    ] },
  ] },
  { titulo: '3. Equipamentos supervisionados (BMS)', aberta: true, itens: [
    { tipo: 'nota', texto: 'Uma linha por tipo de equipamento. DI/DO/AI/AO/Rede vazios usam os pontos típicos do tipo; preencha para sobrescrever (valores por unidade).' },
    { tipo: 'tabela', caminho: 'equipamentos', rotuloAdicionar: 'Adicionar equipamento', novaLinha: { id: 'EQ{n}', tipo: 'ahu', descricao: '', local: '', quantidade: 1, di: null, do: null, ai: null, ao: null, rede: null },
      colunas: [
        { campo: 'id', rotulo: 'Tag', largura: 70 }, { campo: 'tipo', rotulo: 'Tipo', tipo: 'selecao', opcoes: OP.equip, largura: 230 }, { campo: 'descricao', rotulo: 'Descrição' },
        { campo: 'local', rotulo: 'Local', largura: 130 }, { campo: 'quantidade', rotulo: 'Qtd.', tipo: 'numero', largura: 60 },
        { campo: 'di', rotulo: 'DI', tipo: 'numero', largura: 55 }, { campo: 'do', rotulo: 'DO', tipo: 'numero', largura: 55 }, { campo: 'ai', rotulo: 'AI', tipo: 'numero', largura: 55 }, { campo: 'ao', rotulo: 'AO', tipo: 'numero', largura: 55 }, { campo: 'rede', rotulo: 'Rede', tipo: 'numero', largura: 60 },
      ] },
  ] },
  { titulo: '4. Zonas de climatização', itens: [
    { tipo: 'nota', texto: 'Pessoas vazio = densidade típica do uso (NBR 16401-3). Uso "outro": informe Fp (L/s·pessoa) e Fa (L/s·m²). Salas de saúde seguem a NBR 7256.' },
    { tipo: 'tabela', caminho: 'zonas', rotuloAdicionar: 'Adicionar zona', novaLinha: { id: 'Z{n}', nome: '', uso: 'escritorio', area_m2: null, pessoas: null, controle: 'sensor_t', setpoint: 24, fp: null, fa: null },
      colunas: [
        { campo: 'id', rotulo: 'Id', largura: 60 }, { campo: 'nome', rotulo: 'Zona' }, { campo: 'uso', rotulo: 'Uso', tipo: 'selecao', opcoes: OP.usoZona, largura: 170 },
        { campo: 'area_m2', rotulo: 'Área (m²)', tipo: 'numero', largura: 80 }, { campo: 'pessoas', rotulo: 'Pessoas', tipo: 'numero', largura: 75 },
        { campo: 'controle', rotulo: 'Controle', tipo: 'selecao', opcoes: OP.controle, largura: 200 }, { campo: 'setpoint', rotulo: 'Setpoint (°C)', tipo: 'numero', largura: 90 },
        { campo: 'fp', rotulo: 'Fp', tipo: 'numero', largura: 60 }, { campo: 'fa', rotulo: 'Fa', tipo: 'numero', largura: 60 },
      ] },
  ] },
  { titulo: '5. Funções de automação — atual × proposta (ISO 52120-1)', itens: [
    { tipo: 'nota', texto: 'Para retrofit/diagnóstico: marque como está hoje e como ficará. A classe do conjunto é a menor entre as funções marcadas. Deixe em branco se não se aplica.' },
    { tipo: 'grade', colunas: 2, campos: T.FUNCOES_BAC.flatMap(f => [
      { caminho: `funcoes.atual.${f.cod}`, rotulo: `${f.rotulo} — atual`, tipo: 'selecao', opcoes: opcoesFuncao(f) },
      { caminho: `funcoes.proposta.${f.cod}`, rotulo: `${f.rotulo} — proposta`, tipo: 'selecao', opcoes: opcoesFuncao(f) },
    ]) },
  ] },
  { titulo: '6. Automação residencial', itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'residencial.tecnologia', rotulo: 'Tecnologia', tipo: 'selecao', opcoes: OP.tecnologia },
      { caminho: 'residencial.assistente_voz', rotulo: 'Assistentes de voz / telas', tipo: 'numero' },
      { caminho: 'residencial.distancia_media_m', rotulo: 'Distância média ao quadro (m) — KNX', tipo: 'numero' },
    ] },
    { tipo: 'tabela', caminho: 'residencial.ambientes', rotuloAdicionar: 'Adicionar ambiente', novaLinha: { nome: '', ilum_onoff: 0, ilum_dimer: 0, cortinas: 0, ar_condicionado: 0, tomadas: 0, sensores: 0, cenas: 0 },
      colunas: [
        { campo: 'nome', rotulo: 'Ambiente' }, { campo: 'ilum_onoff', rotulo: 'Luz liga/desliga', tipo: 'numero', largura: 90 }, { campo: 'ilum_dimer', rotulo: 'Luz dimerizável', tipo: 'numero', largura: 90 },
        { campo: 'cortinas', rotulo: 'Cortinas', tipo: 'numero', largura: 75 }, { campo: 'ar_condicionado', rotulo: 'Ar-cond.', tipo: 'numero', largura: 75 }, { campo: 'tomadas', rotulo: 'Tomadas', tipo: 'numero', largura: 75 },
        { campo: 'sensores', rotulo: 'Sensores', tipo: 'numero', largura: 75 }, { campo: 'cenas', rotulo: 'Cenas', tipo: 'numero', largura: 65 },
      ] },
  ] },
  F.secaoInspecao(7, F.op([['comissionamento', 'Comissionamento'], ['diagnostico', 'Diagnóstico / retrofit'], ['periodica', 'Inspeção periódica']])),
  F.secaoChecklist(8, CHECKLIST.length),
  { titulo: '9. Testes e conferência de sensores', itens: [
    { tipo: 'tabela', caminho: 'inspecao.testes_pontos', rotuloAdicionar: 'Adicionar ponto testado', novaLinha: { tag: '', tipo: 'DO', descricao: '', ok: null },
      colunas: [{ campo: 'tag', rotulo: 'Tag', largura: 140 }, { campo: 'tipo', rotulo: 'Tipo', largura: 70 }, { campo: 'descricao', rotulo: 'Descrição' }, { campo: 'ok', rotulo: 'OK', tipo: 'check', largura: 60 }] },
    { tipo: 'tabela', caminho: 'inspecao.sensores', rotuloAdicionar: 'Adicionar sensor', novaLinha: { sensor: '', valor_bms: null, valor_referencia: null, tolerancia: 0.5 },
      colunas: [{ campo: 'sensor', rotulo: 'Sensor' }, { campo: 'valor_bms', rotulo: 'Valor no BMS', tipo: 'numero', largura: 110 }, { campo: 'valor_referencia', rotulo: 'Referência', tipo: 'numero', largura: 110 }, { campo: 'tolerancia', rotulo: 'Tolerância', tipo: 'numero', largura: 100 }] },
  ] },
  F.secaoNcs(10, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(11),
];

module.exports = criarDisciplina({
  chave: 'automacao',
  nome: 'Automação — BMS, climatização e residencial (ISO 16484 / ISO 52120-1)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Implantação da automação', descricao: 'Controladores, quadros, sensores, integrações, módulos residenciais, programação e comissionamento' },
    { modo: 'diagnostico', rotulo: 'Diagnóstico / comissionamento', descricao: 'Testes, avaliação da classe de eficiência, relatório e correção das não conformidades' },
  ],
  montarOrcamento,
});
