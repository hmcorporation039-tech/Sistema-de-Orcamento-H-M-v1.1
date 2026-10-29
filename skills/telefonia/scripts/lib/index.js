// Disciplina TELEFONIA E INTERFONIA — contrato do sistema.

const { criarDisciplina } = require('../../../_comum/disciplina');
const D = require('../../../_comum/documentos');
const I = require('../../../_comum/inspecao');
const F = require('../../../_comum/formulario');
const { fmtNum } = require('../../../_comum/docx-base');
const C = require('./calculo');

const CHECKLIST = require('../../dados/checklist_base.json');
const MODELO = require('../../exemplos/modelo-vazio.json');
const EXEMPLO = require('../../exemplos/exemplo-condominio.json');

const NORMAS = [
  ['Práticas Telebrás de tubulação e rede telefônica em edifícios', 'Prumada, caixas de distribuição geral e de andar, cabos CI/CCI e distribuidor geral (DG) [CONFERIR versão adotada pela operadora]'],
  ['ABNT NBR 13726 / NBR 13727', 'Redes telefônicas internas em prédios — tubulação de entrada e partes componentes do projeto de tubulação telefônica [CONFERIR vigência]'],
  ['ABNT NBR 14565:2019', 'Cabeamento estruturado para edifícios comerciais — pontos de voz IP, limite de 90 m do cabo horizontal e identificação'],
  ['ABNT NBR 14306', 'Proteção elétrica e compatibilidade eletromagnética em redes internas de telecomunicações em edificações [CONFERIR vigência]'],
  ['ABNT NBR 5410', 'Instalações elétricas de baixa tensão — DPS (6.3.5), equipotencialização e aterramento (6.4), circuito dedicado'],
  ['ABNT NBR 5419-4', 'Proteção contra descargas atmosféricas — sistemas elétricos e eletrônicos internos (DPS em linhas de sinal)'],
  ['ABNT NBR 9050', 'Acessibilidade — altura de comandos e controles (terminais)'],
  ['Regulamentação Anatel', 'Equipamentos de telecomunicações com certificação/homologação Anatel [CONFERIR resolução vigente]'],
];
const SECOES_CHECKLIST = ['Documentação', 'Central e programação', 'Ramais e terminais', 'Porteiro e portaria', 'Cabeamento e DG', 'Proteção e aterramento', 'Alimentação', 'Rede IP'];
const num = fmtNum; // número pt-BR; '—' quando vazio ou inválido

function processar(dados) {
  const calc = C.calcular(dados);
  const insp = dados.inspecao || {};
  const na = {};
  if (calc.analogica) { na.N1 = 'Sistema analógico, sem rede IP'; na.N2 = 'Sistema analógico, sem PABX IP'; }
  if (!calc.troncos) na.C3 = 'Sem troncos externos no escopo';
  if (!calc.nPorteiros) { na.P1 = 'Sem porteiros eletrônicos'; na.P2 = 'Sem porteiros eletrônicos'; }
  if (!calc.terminaisPortaria) { na.P3 = 'Sem terminal de portaria'; na.R2 = 'Sem terminal de portaria'; }
  if (!calc.temParesExternos) na.T1 = 'Sem pares saindo da edificação';
  if (!calc.comNobreak) na.E1 = 'Sem nobreak no escopo';
  const checklist = I.mesclarChecklist(CHECKLIST, insp.checklist, na);
  // NCs de projeto (ex.: pares externos sem DPS) entram no item, se não verificado
  for (const n of calc.ncsProjeto) {
    const c = checklist.find(x => x.cod === n.cod);
    if (!c || (c.situacao && c.situacao !== 'NV')) continue;
    Object.assign(c, { situacao: 'NC', obs: n.descricao, recomendacao: n.recomendacao, prioridade: n.prioridade, onde: n.local });
  }
  const ncs = I.consolidarNcs(checklist, insp.ncs);
  const campos = ['chamada_ok', 'audio_ok', 'identificacao_ok'];
  const testes = (insp.teste_ramais || []).map(m => {
    const v = campos.map(k => m[k]).filter(x => x !== null && x !== undefined && x !== '');
    return { ...m, resultado: !v.length ? 'NV' : v.some(x => x === false || x === 'false') ? 'NC' : 'C' };
  });
  return { dados, calc, insp, checklist, ncs, testes, parecer: I.parecer(checklist, ncs, testes) };
}

function descricaoCentral(calc) {
  if (calc.analogica) return `${calc.nCentrais > 1 ? `${calc.nCentrais} × ` : ''}${calc.central.rotulo}${calc.placas ? ` com ${calc.placas} placa(s) de ${calc.capPlaca} ramais (${calc.capacidadeInstalada} ramais instalados)` : ''}`;
  return `${calc.pabx.rotulo} com ${calc.licencas} licença(s) SIP${calc.gwFxs ? ` e ${calc.gwFxs.qtd} gateway(s) FXS de ${calc.gwFxs.valor} portas` : ''}`;
}

function linhasBlocos(calc) {
  return calc.blocos.map(b => [b.nome, b.nPav, b.upp, b.unidades, b.r, b.ramais, num(b.h, 2), num(b.dDg, 0), num(b.dUn, 0), b.rotaExterna ? 'sim' : 'não']);
}

function linhasPrumada(calc) {
  const l = [];
  for (const b of calc.blocos) for (const p of b.pavimentos) {
    l.push([b.nome, p.pavimento, p.unidades, p.ramais, p.paresNec || '—', p.ciPares ? `${p.ciCabos > 1 ? `${p.ciCabos} × ` : ''}CI-50 ${p.ciPares} p` : '—', p.ciPares ? num(p.compCi, 1) : '—', p.blocosIdc || '—', num(p.compRamal, 1)]);
  }
  return l;
}

function resumir(res) {
  const { calc } = res;
  const cabosTxt = calc.ip
    ? `UTP Cat 6 ${calc.cabos.utpM} m${calc.cabos.fibraM ? ` · fibra ${calc.cabos.fibraM} m` : ''}`
    : `CCI 2 p ${calc.cabos.cciM[2]} m · CCI 4 p ${calc.cabos.cciM[4]} m · CI ${Object.entries(calc.cabos.ciPorPares).map(([p, m]) => `${p} p ${m} m`).join(' · ') || '—'}${calc.cabos.utpM ? ` · UTP ${calc.cabos.utpM} m` : ''}`;
  const nb = calc.nobreaks[0];
  return {
    indicadores: [
      { rotulo: 'Ramais', valor: `${calc.ramaisNec} com reserva`, detalhe: `${calc.ramaisUsados} em uso: ${calc.ramaisUnidades} de unidades (${calc.unidades} unidades) · ${calc.ramaisAreas} de áreas comuns · ${calc.terminaisPortaria} portaria · ${calc.nPorteiros} porteiro(s) · reserva ${num(calc.reserva * 100, 0)} %` },
      { rotulo: calc.analogica ? 'Central' : 'PABX IP', valor: calc.analogica ? `${calc.nCentrais} × ${calc.central.ramais} ramais` : `${calc.licencas} licenças SIP`, detalhe: descricaoCentral(calc) },
      { rotulo: 'Terminais', valor: String(calc.terminaisDedicados + calc.telefonesIp + calc.terminaisPortaria + calc.nPorteiros), detalhe: `${calc.terminaisDedicados ? `${calc.terminaisDedicados} dedicados` : `${calc.telefonesIp} telefones IP`} · ${calc.terminaisPortaria} de portaria · ${calc.nPorteiros} porteiro(s)` },
      { rotulo: 'Cabos', valor: calc.ip ? `${calc.cabos.utpM} m UTP` : `${calc.cabos.cciM[2] + calc.cabos.cciM[4] + calc.cabos.ciM} m`, detalhe: cabosTxt },
      { rotulo: 'DG e blocos', valor: calc.blocosDg + calc.blocosAndares ? `${calc.blocosDg + calc.blocosAndares} blocos IDC-110` : `${calc.switches} switch(es) PoE`, detalhe: calc.blocosDg + calc.blocosAndares ? `DG ${calc.blocosDg} · andares ${calc.blocosAndares} · ${calc.suportes} suporte(s)` : `${calc.pontosIp} pontos IP · PoE ${num(calc.poeW, 0)} W` },
      { rotulo: 'Nobreak', valor: nb ? `${calc.nobreaks.length} × ${nb.va} VA` : 'não previsto', detalhe: nb ? `${calc.nobreaks.map(n => `${n.local}: ${num(n.cargaW, 0)} W → ${n.va} VA, bateria ${n.nBaterias > 1 ? `${n.nBaterias} × ` : ''}${n.bateriaAh} Ah`).join(' · ')} — ${num(calc.autonomiaH, 0)} h` : 'interfonia para na falta de energia', ok: nb ? undefined : false },
      { rotulo: 'DPS de linha', valor: `${calc.dps.total} un`, detalhe: calc.comDps ? `troncos ${calc.dps.tronco} · porteiros ${calc.dps.porteiro} · áreas externas ${calc.dps.area} · Ethernet ${calc.dps.ethernet} · módulos 10 p ${calc.dps.modulos} · CA ${calc.dps.ca}` : 'DPS de linha desativado', ok: calc.ncsProjeto.length ? false : undefined },
    ],
    textos: [...calc.ncsProjeto.map(n => `NÃO CONFORME (${n.cod}) — ${n.descricao}. ${n.recomendacao}`), ...calc.avisos],
    tabelas: [
      { titulo: 'Edificação', colunas: ['Bloco', 'Pav.', 'Un./pav.', 'Unidades', 'Ramais/un.', 'Ramais', 'Pé-direito', 'DG (m)', 'Unid. (m)', 'Rota externa'], linhas: linhasBlocos(calc) },
      { titulo: calc.ip ? 'Pavimentos (cabo por ramal)' : 'Prumada por pavimento', colunas: ['Bloco', 'Pav.', 'Unid.', 'Ramais', 'Pares nec.', 'Cabo CI', 'CI (m)', 'Blocos', 'Ramal (m)'], linhas: linhasPrumada(calc) },
    ],
  };
}

function secoesMemorial(res) {
  const { calc, dados } = res;
  const secoes = [
    { titulo: '1. Objeto e premissas', paragrafos: [
      `Sistema de ${calc.rotuloTipo.toLowerCase()} de ${dados.obra?.nome || 'a edificação'}: ${calc.blocos.length} bloco(s), ${calc.unidades} unidades, ${calc.ramaisUnidades} ramais de unidades, ${calc.ramaisAreas} ramais de áreas comuns, ${calc.terminaisPortaria} terminal(is) de portaria e ${calc.nPorteiros} porteiro(s) eletrônico(s).`,
      `Topologia: ${calc.ip ? 'pontos de voz IP em cabeamento estruturado (NBR 14565)' : calc.rotuloTopologia}. Central/DG em ${calc.localDg}; portaria em ${calc.localPortaria}. Fator de cabo ${num(calc.f, 2)} (folgas, curvas e subidas) [CONFERIR com o levantamento em campo]. Infraestrutura (tubulação e caixas): ${calc.infraExistente ? 'existente, a reaproveitar' : 'nova, incluída na lista de materiais'}.`,
    ] },
    { titulo: '2. Critérios normativos', marcadores: [
      'Rede interna (práticas Telebrás e NBR 13726/13727 [CONFERIR vigência]): entrada e DG no térreo/subsolo, prumada com caixa de distribuição em cada pavimento e ramal da caixa até a tomada da unidade; cabos de energia nunca na mesma tubulação dos cabos telefônicos (NBR 5410).',
      'Cabos: CI-50 (prumada, por pavimento) e CCI-50 2 pares (ramal de unidade: 1 par em uso + 1 de reserva) ou 4 pares (porteiro: áudio, chamada e comando). Terminação em blocos de engate rápido IDC-110/BLI de 10 pares no DG e nas caixas de andar.',
      'Pontos IP (NBR 14565:2019): cabo U/UTP Cat 6 com no máximo 90 m do switch à tomada; acima disso, switch no bloco interligado por fibra.',
      'Proteção (NBR 5410 6.3.5, NBR 5419-4 e NBR 14306 [CONFERIR]): DPS de linha em todo par que sai da edificação (troncos da operadora, porteiros, áreas externas e interligação entre blocos), aterrado no barramento TAP do DG ligado ao BEP (6.4); DPS classe II na alimentação CA da central.',
      'Alimentação: central (e switches PoE) em nobreak com a autonomia definida, em circuito dedicado com disjuntor identificado.',
      'Equipamentos com certificação/homologação Anatel; terminais com comandos entre 0,80 m e 1,20 m (NBR 9050) [CONFERIR].',
    ] },
    { titulo: '3. Edificação e ramais', paragrafos: [
      `Ramais em uso = unidades × ramais por unidade + áreas comuns + portaria + porteiros = ${calc.ramaisUnidades} + ${calc.ramaisAreas} + ${calc.terminaisPortaria} + ${calc.nPorteiros} = ${calc.ramaisUsados}. Ramais com reserva = ⌈${calc.ramaisUsados} × (1 + ${num(calc.reserva * 100, 0)} %)⌉ = ${calc.ramaisNec}.`,
      'Numeração sugerida: [bloco][pavimento][unidade] (ex.: 1101 = bloco 1, 1º pavimento, unidade 01); áreas comuns 801…, portaria 901…, porteiros 951… — ajustar à programação da central.',
    ], tabela: { colunas: ['Bloco', 'Pav.', 'Un./pav.', 'Unidades', 'Ramais/un.', 'Ramais', 'Pé-dir. (m)', 'Dist. DG (m)', 'Dist. unid. (m)', 'Rota ext.'], linhas: linhasBlocos(calc), proporcoes: [1, 0.45, 0.6, 0.65, 0.65, 0.55, 0.65, 0.7, 0.75, 0.6], tamanho: 15 } },
  ];
  if (calc.areas.length || calc.portoes.length) {
    secoes.push({ titulo: '3.1 Áreas comuns, portaria e portões', nivel: 2, tabela: { colunas: ['Local', 'Tipo', 'Ramais', 'Distância (m)', 'Cabo', 'Comprimento (m)', 'DPS'],
      linhas: calc.ambientes.filter(a => ['area_comum', 'portaria', 'portao'].includes(a.tipo)).map(a => [a.nome, { area_comum: 'Área comum', portaria: 'Portaria', portao: `Porteiro — ${a.rotuloFechadura}` }[a.tipo], a.ramais, a.distancia != null ? num(a.distancia, 0) : '—', a.cabo, num(a.comprimento_m, 1), a.dps ? 'sim' : '—']),
      proporcoes: [1.5, 1.8, 0.5, 0.7, 1.1, 0.8, 0.4], tamanho: 15 } });
  }
  secoes.push({ titulo: calc.analogica ? '4. Central de interfonia e placas de ramais' : '4. PABX IP, licenças e gateways', paragrafos: calc.analogica ? [
    `Central: a menor de linha com capacidade ≥ ${calc.ramaisNec} ramais → ${descricaoCentral(calc)} [CONFERIR modelo]. Placas = ⌈${calc.ramaisNec} ÷ ${calc.capPlaca}⌉ = ${calc.placas}.`,
    calc.troncos ? `Troncos externos: ${calc.troncos} linha(s) ${calc.tipoTronco === 'sip' ? 'SIP (entregues por ATA/gateway FXS à placa de tronco)' : 'analógica(s)'} → ${calc.placasTronco} placa(s) de tronco (${C.LINHAS_PLACA_TRONCO} linhas cada) [CONFERIR].` : 'Sem troncos externos (interfonia interna).',
    `Terminais: ${calc.terminaisDedicados} terminais dedicados (unidades e áreas comuns), ${calc.terminaisPortaria} terminal(is) de portaria com identificação do chamador e ${calc.nPorteiros} porteiro(s) eletrônico(s) com comando de fechadura.`,
  ] : [
    `PABX IP com capacidade ≥ ${calc.ramaisNec} ramais → ${calc.pabx.rotulo} [CONFERIR modelo]; licenças SIP = ramais com reserva = ${calc.licencas} [CONFERIR modelo de licenciamento do fabricante].`,
    calc.hibrido ? `Ramais analógicos (unidades, áreas comuns e porteiros) = ${calc.ramaisAnalogicos} → portas FXS com reserva = ${calc.fxsNec} → ${calc.gwFxs ? `${calc.gwFxs.qtd} gateway(s) de ${calc.gwFxs.valor} portas` : '—'}; portaria em telefone IP.` : `Telefones IP PoE: ${calc.telefonesIp} (unidades e áreas comuns), ${calc.terminaisPortaria} de portaria e ${calc.nPorteiros} porteiro(s)/videoporteiro(s) SIP.`,
    calc.troncos ? `Troncos: ${calc.troncos} ${calc.tipoTronco === 'sip' ? `tronco(s) SIP (${calc.licencasTronco} canal(is) licenciados no PABX)` : `linha(s) analógica(s) → gateway FXO de ${calc.gwFxo.valor} portas`}.` : 'Sem troncos externos.',
  ] });
  if (!calc.ip) {
    secoes.push({ titulo: '5. Cabeamento — prumada e ramais', paragrafos: [
      calc.topologia === 'prumada'
        ? `Prumada: um cabo CI-50 do DG até a caixa de cada pavimento, com pares = ⌈unidades do andar × ramais × (1 + ${num(calc.reservaPares * 100, 0)} %)⌉ arredondados ao cabo comercial (${C.CI_PARES.join('/')} pares). Comprimento = (distância DG → base da prumada + pavimento × pé-direito) × ${num(calc.f, 2)} + ${C.FOLGA_CI} m de arremates.`
        : `Topologia direta: um cabo CCI do DG até cada unidade. Comprimento = (distância DG + pavimento × pé-direito + distância média à unidade) × ${num(calc.f, 2)} + descida (pé-direito).`,
      `Ramal: CCI-50 ${calc.paresCci} pares por ramal = ${calc.topologia === 'prumada' ? 'distância média caixa → unidade' : 'percurso total'} × ${num(calc.f, 2)} + descida (pé-direito). Áreas comuns, portaria e portões: distância × ${num(calc.f, 2)} + ${C.DESCIDA_PADRAO} m. Alcance prático do ramal analógico ${C.LIMITE_CCI} m [CONFERIR com o fabricante].`,
      `Totais: ${Object.entries(calc.cabos.ciPorPares).map(([p, m]) => `CI-50 ${p} pares ${m} m`).join('; ') || 'sem CI'}; CCI-50 2 pares ${calc.cabos.cciM[2]} m; CCI-50 4 pares ${calc.cabos.cciM[4]} m${calc.cabos.utpM ? `; U/UTP Cat 6 ${calc.cabos.utpM} m (portaria IP)` : ''}${calc.cabos.ppFechaduraM ? `; cabo PP 2 × 1,5 mm² ${calc.cabos.ppFechaduraM} m (fechaduras novas)` : ''}.`,
    ], tabela: { colunas: ['Bloco', 'Pav.', 'Unid.', 'Ramais', 'Pares nec.', 'Cabo CI', 'CI (m)', 'Blocos', 'Ramal (m)'], linhas: linhasPrumada(calc), proporcoes: [1, 0.45, 0.5, 0.55, 0.65, 1.1, 0.6, 0.55, 0.7], tamanho: 14 } });
    secoes.push({ titulo: '6. DG, blocos IDC-110 e caixas de andar', paragrafos: [
      `DG: blocos = ⌈pares dos cabos que chegam (${calc.paresCabosDg}) ÷ 10⌉ + ⌈pares da central (${calc.paresCentral}) ÷ 10⌉ + ⌈troncos (${calc.troncosAnalogicos}) ÷ 10⌉ = ${calc.blocosDg}; caixas de andar: o maior entre os pares do CI e os pares dos ramais do andar ÷ 10 = ${calc.blocosAndares} no total. Suportes para até ${C.BLOCOS_POR_SUPORTE} blocos: ${calc.suportes}. Fio jumper para os cruzamentos central ↔ cabos: ${calc.jumperM} m.`,
      'Identificar cada par no DG e nas caixas de andar (unidade/ramal) e entregar o mapa de pares ao condomínio.',
    ] });
  }
  if (!calc.analogica) {
    secoes.push({ titulo: calc.ip ? '5. Rede IP (NBR 14565)' : '7. Rede IP da portaria (NBR 14565)', paragrafos: [
      `Pontos IP: ${calc.pontosIp} · PoE ${num(calc.poeW, 0)} W (telefone ${C.W_TERMINAL_IP} W, portaria ${C.W_PORTARIA_IP} W, porteiro ${C.W_PORTEIRO_IP} W [CONFERIR]). Cabo U/UTP Cat 6 por ponto = percurso × ${num(calc.f, 2)} + descida, limitado a 90 m; blocos com ponto acima de 90 m ou em outra edificação recebem switch na base da prumada, interligado ao DG por fibra óptica multimodo (dielétrica).`,
      'Switches gerenciáveis com VLAN de voz e QoS, alimentados pelo nobreak; PABX com senhas fortes, acesso remoto restrito e bloqueio de rotas internacionais/premium.',
    ], tabela: { colunas: ['Local', 'Pontos', 'Equip./uplinks', 'Switches', 'Patch panels', 'Rack', 'PoE (W)', 'UTP (m)'], linhas: calc.locaisRede.map(l => [l.local, l.pontos, l.equipamentos, l.switches, l.paineis, `${l.rackU}U`, num(l.poeW, 0), l.utp]), proporcoes: [1.8, 0.6, 0.8, 0.7, 0.8, 0.5, 0.6, 0.6], tamanho: 15 } });
  }
  secoes.push(
    { titulo: '8. Proteção (DPS) e aterramento', paragrafos: [
      calc.comDps
        ? `DPS de linha: troncos ${calc.dps.tronco}; porteiros ${calc.dps.porteiro}; ramais de áreas externas ${calc.dps.area}; Ethernet externos ${calc.dps.ethernet}; módulos de 10 pares nas duas pontas das interligações entre edificações ${calc.dps.modulos}; DPS classe II na alimentação CA ${calc.dps.ca}.`
        : 'DPS de linha NÃO previsto — ver não conformidade de projeto.',
      `Aterramento: ${calc.taps} barramento(s) TAP (DG${calc.taps > 1 ? ' e entradas dos blocos/racks remotos' : ''}) ligado(s) ao BEP da edificação com cabo de cobre 16 mm² (${calc.cabos.cabo16M} m) [CONFERIR seção com o projeto de aterramento].`,
    ] },
    { titulo: '9. Alimentação e nobreak', paragrafos: calc.nobreaks.length ? [
      `Nobreak por local: VA ≥ carga ÷ ${C.FP_NOBREAK} × ${C.MARGEM_NOBREAK}; bateria (Ah em 12 V) ≥ carga × ${num(calc.autonomiaH, 0)} h ÷ (12 V × ${C.EFICIENCIA}) × ${C.FATOR_BATERIA} (envelhecimento e temperatura). Consumos típicos: central ${calc.analogica ? `${calc.central.w} W + ${C.W_PLACA} W por placa` : `PABX ${calc.pabx.w} W, gateway ${C.W_GATEWAY} W, switch ${C.W_SWITCH} W + PoE`} [CONFERIR ficha técnica].`,
    ] : ['Sem nobreak — a interfonia para na falta de energia (recomenda-se no mínimo 2 h).'],
    tabela: calc.nobreaks.length ? { colunas: ['Local', 'Carga (W)', 'VA nec.', 'Nobreak', 'Energia (Wh)', 'Bateria nec. (Ah)', 'Bateria'], linhas: calc.nobreaks.map(n => [n.local, num(n.cargaW, 0), num(n.vaNec, 0), `${n.nNobreaks > 1 ? `${n.nNobreaks} × ` : ''}${n.va} VA`, num(n.whNec, 0), num(n.ahNec, 1), `${n.nBaterias > 1 ? `${n.nBaterias} × ` : ''}${n.bateriaAh} Ah`]), proporcoes: [1.8, 0.6, 0.6, 0.7, 0.7, 0.8, 0.7], tamanho: 15 } : undefined },
    { titulo: '10. Lista de materiais (preliminar)', tabela: { colunas: ['Cód.', 'Descrição', 'Un.', 'Qtd.', 'Referência'], linhas: calc.materiais.map(m => [m.codigo, m.descricao, m.unidade, num(m.quantidade, 0), m.referencia]), proporcoes: [0.55, 4, 0.4, 0.5, 1.5], tamanho: 15 } },
  );
  if (calc.ncsProjeto.length) secoes.push({ titulo: 'Não conformidades de projeto', marcadores: calc.ncsProjeto.map(n => `${n.cod} — ${n.descricao}. ${n.recomendacao}`) });
  if (calc.avisos.length) secoes.push({ titulo: 'Avisos', marcadores: calc.avisos });
  // numeração contínua (as seções de rede/prumada dependem do tipo de sistema)
  let n = 0;
  let sub = 0;
  for (const s of secoes) {
    const m = /^\d+(?:\.\d+)?\.?\s+(.*)$/.exec(s.titulo);
    if (!m) continue;
    if (s.nivel === 2) s.titulo = `${n}.${++sub} ${m[1]}`;
    else { n++; sub = 0; s.titulo = `${n}. ${m[1]}`; }
  }
  return secoes;
}

const DOCUMENTOS = [
  { tipo: 'memorial', rotulo: 'Memorial descritivo de telefonia e interfonia', formato: 'Word', nome: 'Memorial_Telefonia_Interfonia',
    gerar: (res) => D.docxParaBuffer(D.gerarMemorial(res.dados, { titulo: 'MEMORIAL DESCRITIVO — TELEFONIA E INTERFONIA', subtitulo: 'Práticas Telebrás, ABNT NBR 14565, NBR 14306, NBR 5410 e NBR 5419-4', tituloCurto: 'Memorial — telefonia e interfonia', sigla: 'MEM-TEL', secoes: secoesMemorial(res), listaNormas: NORMAS })) },
  { tipo: 'planilha', rotulo: 'Planilha de ramais, cabos e materiais', formato: 'Excel', nome: 'Telefonia_Interfonia',
    gerar: (res) => {
      const { calc } = res;
      const prumada = [];
      for (const b of calc.blocos) for (const p of b.pavimentos) prumada.push({ bloco: b.nome, pavimento: p.pavimento, unidades: p.unidades, ramais: p.ramais, paresNec: p.paresNec || null, cabo: p.ciPares ? `${p.ciCabos > 1 ? `${p.ciCabos} × ` : ''}CI-50 ${p.ciPares} pares` : '', compCi: p.ciPares ? p.compCi : null, ciM: p.ciPares ? p.ciM : null, blocosIdc: p.blocosIdc || null, compRamal: p.compRamal, ramalM: p.compRamal * p.ramais });
      const abas = [
        { nome: 'Ramais', colunas: [{ header: 'Ramal', key: 'ramal', width: 9 }, { header: 'Tipo', key: 'tipo', width: 12 }, { header: 'Bloco', key: 'bloco', width: 12 }, { header: 'Pav.', key: 'pavimento', width: 6 }, { header: 'Local', key: 'local', width: 28 }, { header: 'Terminal', key: 'terminal', width: 22 }, { header: 'Cabo', key: 'cabo', width: 22 }, { header: 'Comprimento (m)', key: 'comprimento_m', width: 14, numFmt: '0.0' }],
          linhas: calc.ramaisLista },
        { nome: calc.ip ? 'Pavimentos' : 'Prumada', colunas: [{ header: 'Bloco', key: 'bloco', width: 12 }, { header: 'Pav.', key: 'pavimento', width: 6 }, { header: 'Unidades', key: 'unidades', width: 9 }, { header: 'Ramais', key: 'ramais', width: 8 }, { header: 'Pares nec.', key: 'paresNec', width: 10 }, { header: 'Cabo CI', key: 'cabo', width: 20 }, { header: 'CI por cabo (m)', key: 'compCi', width: 13, numFmt: '0.0' }, { header: 'CI total (m)', key: 'ciM', width: 12, numFmt: '0.0' }, { header: 'Blocos IDC', key: 'blocosIdc', width: 10 }, { header: 'Cabo por ramal (m)', key: 'compRamal', width: 15, numFmt: '0.0' }, { header: 'Ramais total (m)', key: 'ramalM', width: 14, numFmt: '0.0' }],
          linhas: prumada },
        { nome: 'Resumo', colunas: [{ header: 'Grandeza', key: 'k', width: 46 }, { header: 'Valor', key: 'v', width: 60 }],
          linhas: [
            ['Tipo de sistema', calc.rotuloTipo], ['Topologia', calc.ip ? 'Pontos IP (NBR 14565)' : calc.rotuloTopologia], ['Unidades', calc.unidades], ['Ramais em uso', calc.ramaisUsados], ['Ramais com reserva', calc.ramaisNec],
            ['Central / PABX', descricaoCentral(calc)], ['Troncos', `${calc.troncos} (${calc.tipoTronco})`], ['Blocos IDC-110 (DG / andares)', `${calc.blocosDg} / ${calc.blocosAndares}`], ['Suportes', calc.suportes],
            ...Object.entries(calc.cabos.ciPorPares).map(([p, m]) => [`Cabo CI-50 ${p} pares (m)`, m]), ['Cabo CCI-50 2 pares (m)', calc.cabos.cciM[2]], ['Cabo CCI-50 4 pares (m)', calc.cabos.cciM[4]], ['Cabo U/UTP Cat 6 (m)', calc.cabos.utpM], ['Fibra óptica (m)', calc.cabos.fibraM],
            ...calc.nobreaks.map(n => [`Nobreak — ${n.local}`, `${num(n.cargaW, 0)} W → ${n.nNobreaks > 1 ? `${n.nNobreaks} × ` : ''}${n.va} VA; bateria ${n.nBaterias > 1 ? `${n.nBaterias} × ` : ''}${n.bateriaAh} Ah`]),
            ['DPS (total)', calc.dps.total],
          ].map(([k, v]) => ({ k, v })) },
      ];
      if (calc.locaisRede.length) abas.push({ nome: 'Rede IP', colunas: [{ header: 'Local', key: 'local', width: 34 }, { header: 'Pontos', key: 'pontos' }, { header: 'Equip./uplinks', key: 'equipamentos' }, { header: 'Switches', key: 'switches' }, { header: 'Patch panels', key: 'paineis' }, { header: 'Rack (U)', key: 'rackU' }, { header: 'PoE (W)', key: 'poeW', numFmt: '0' }, { header: 'UTP (m)', key: 'utp' }], linhas: calc.locaisRede });
      abas.push(D.abaMateriais(calc.materiais));
      return D.gerarPlanilha(abas);
    } },
  { tipo: 'laudo', rotulo: 'Relatório de vistoria / teste', formato: 'Word', nome: 'Relatorio_Telefonia_Interfonia',
    gerar: (res) => D.docxParaBuffer(D.gerarLaudoInspecao(res.dados, res.insp, {
      titulo: 'RELATÓRIO DE VISTORIA E TESTE — TELEFONIA E INTERFONIA', tipoInspecao: res.insp.tipo === 'periodica' ? 'Vistoria técnica periódica' : 'Comissionamento / vistoria técnica', tituloCurto: 'Relatório — telefonia e interfonia', sigla: 'REL-TEL',
      objetivo: 'Verificar a instalação e o funcionamento do sistema de telefonia/interfonia — central ou PABX, terminais das unidades e áreas comuns, terminal de portaria, porteiros eletrônicos, DG, prumada e caixas de andar —, o teste ramal a ramal, a identificação dos pares, a proteção por DPS, o aterramento e a alimentação por nobreak.',
      listaNormas: NORMAS, secoesChecklist: SECOES_CHECKLIST,
      descricao: [
        ['Sistema', res.calc.rotuloTipo],
        ['Central / PABX', descricaoCentral(res.calc)],
        ['Ramais', `${res.calc.ramaisUsados} em uso · ${res.calc.ramaisNec} com reserva (${res.calc.unidades} unidades)`],
        ['Portaria / porteiros', `${res.calc.terminaisPortaria} terminal(is) / ${res.calc.nPorteiros} porteiro(s)`],
        ['Nobreak', res.calc.nobreaks.length ? res.calc.nobreaks.map(n => `${n.local}: ${n.va} VA, ${num(res.calc.autonomiaH, 0)} h`).join(' · ') : 'não previsto'],
      ],
      metodologia: [
        'Inspeção visual da central, do DG, das caixas de andar, dos terminais e dos porteiros.',
        'Teste ramal a ramal: chamada da portaria para cada unidade e da unidade para a portaria, conferindo áudio nos dois sentidos e a identificação no terminal de portaria.',
        'Teste dos porteiros: chamada, áudio e acionamento da fechadura/portão.',
        'Conferência da identificação de pares contra o mapa; teste de continuidade, curto e inversão dos pares (ou certificação UTP).',
        'Verificação dos DPS de linha, do TAP ligado ao BEP e teste de autonomia do nobreak com falta de CA.',
      ],
      medicoes: [{ titulo: '6.1 Teste ramal a ramal', colunas: ['Ramal', 'Local', 'Chamada', 'Áudio', 'Identificação', 'Obs.', 'Resultado'], proporcoes: [0.6, 1.5, 0.6, 0.6, 0.8, 2, 0.7],
        linhas: res.testes.map(m => [m.ramal, m.local || '', ...['chamada_ok', 'audio_ok', 'identificacao_ok'].map(k => (m[k] === false || m[k] === 'false' ? 'falha' : m[k] ? 'ok' : '')), m.observacao || '', m.resultado]),
        nota: `Testar todos os ${res.calc.ramaisUsados} ramais em uso (unidades, áreas comuns, portaria e porteiros); ramais não testados ficam NV.` }],
      proximaInspecao: [['Periodicidade sugerida', 'Anual, e após descarga atmosférica, reforma ou ampliação de ramais [CONFERIR contrato de manutenção]'], ['Teste de nobreak', 'Semestral (falta de CA simulada)']],
    }, { checklist: res.checklist, ncs: res.ncs, parecer: res.parecer, baseDir: res.baseDir, pastaFotos: res.pastaFotos })) },
  { tipo: 'checklist', rotulo: 'Checklist de campo', formato: 'Word', nome: 'Checklist_Campo_Telefonia_Interfonia',
    gerar: (res) => D.docxParaBuffer(D.gerarChecklistCampo(res.dados, res.insp, {
      titulo: 'CHECKLIST DE CAMPO — TELEFONIA E INTERFONIA', subtitulo: 'Vistoria e teste ramal a ramal (práticas Telebrás, NBR 14565, NBR 5410, NBR 5419-4)', tituloCurto: 'Checklist — telefonia e interfonia', secoesChecklist: SECOES_CHECKLIST,
      preparacao: [
        'Combinar com o síndico/zelador o teste ramal a ramal (moradores serão chamados) e o teste de falta de energia.',
        'Levar: mapa de pares e lista de ramais impressos, testador de pares/multímetro, monofone de teste (butt set), trena, etiquetas e, se IP, notebook com acesso ao PABX.',
        'Registrar em cada ramal: chamada, áudio nos dois sentidos e identificação no terminal de portaria.',
      ],
      referencias: [
        ['Ramais em uso / com reserva', `${res.calc.ramaisUsados} / ${res.calc.ramaisNec}`],
        ['Central / PABX', descricaoCentral(res.calc)],
        ['Blocos IDC-110 (DG / andares)', `${res.calc.blocosDg} / ${res.calc.blocosAndares}`],
        ['DPS de linha previstos', String(res.calc.dps.total)],
        ...res.calc.nobreaks.map(n => [`Nobreak — ${n.local}`, `${n.va} VA · ${num(res.calc.autonomiaH, 0)} h`]),
      ],
      medicoes: [{ titulo: 'Teste ramal a ramal', colunas: ['Ramal', 'Local', 'Chamada', 'Áudio', 'Identificação', 'Par no DG', 'Obs.'], proporcoes: [0.6, 1.5, 0.6, 0.6, 0.8, 0.7, 1.5],
        linhas: res.calc.ramaisLista.map(r => [r.ramal, `${r.bloco !== '—' ? `${r.bloco} — ` : ''}${r.local}`, '', '', '', '', '']) }],
    }, res.checklist)) },
];

function montarOrcamento(res, modo) {
  const { calc, dados } = res;
  const S = 'Serviços (Mão de Obra)';
  const srv = (codigo, descricao, quantidade, unidade) => ({ secao: S, subgrupo: 'Telefonia e interfonia', codigo, descricao, quantidade, unidade });
  const terminais = calc.terminaisDedicados + calc.telefonesIp;
  const cabosRamalM = calc.cabos.cciM[2] + calc.cabos.cciM[4] + calc.cabos.utpM;
  const nDps = calc.dps.total;
  const itens = modo === 'inspecao'
    ? [
      srv('tel_vistoria', 'Vistoria e teste ramal a ramal (chamada, áudio e identificação), porteiros e portaria', calc.ramaisUsados, 'un'),
      srv('tel_laudo', 'Relatório de vistoria/teste de telefonia e interfonia com ART', 1, 'vb'),
      ...res.ncs.map(n => ({ secao: S, subgrupo: 'Correção de não conformidades', descricao: `${n.id} (${n.item}) — ${n.recomendacao}`, quantidade: 1, unidade: 'vb' })),
    ]
    : [
      ...calc.materiais.map(m => ({ secao: 'Materiais e Equipamentos', subgrupo: 'Telefonia e interfonia', descricao: m.descricao, quantidade: m.quantidade, unidade: m.unidade })),
      srv('tel_central', calc.analogica ? `Instalação de central de interfonia com ${calc.placas} placa(s) de ramais` : `Instalação de PABX IP${calc.gwFxs || calc.gwFxo ? ' e gateways' : ''}`, calc.analogica ? calc.nCentrais : 1, 'un'),
      ...(calc.pontosConector ? [srv('tel_ponto', 'Conectorização de ponto de telefonia (RJ-11/RJ-45 + teste)', calc.pontosConector, 'pt')] : []),
      ...(terminais ? [srv('tel_terminal', 'Instalação de terminal de interfonia/telefone na unidade ou área comum, com teste', terminais, 'un')] : []),
      ...(calc.terminaisPortaria ? [srv('tel_portaria', 'Instalação e configuração de terminal de portaria', calc.terminaisPortaria, 'un')] : []),
      ...(calc.nPorteiros ? [srv('tel_porteiro', 'Instalação de porteiro eletrônico com ligação da fechadura/portão', calc.nPorteiros, 'un')] : []),
      ...(calc.cabos.ciM + calc.cabos.fibraM ? [srv('tel_prumada', 'Lançamento de cabo de prumada (CI/fibra) do DG às caixas de andar, por metro', calc.cabos.ciM + calc.cabos.fibraM, 'm')] : []),
      ...(cabosRamalM ? [srv('tel_cabo_ramal', 'Lançamento de cabo de ramal (CCI/UTP) até o terminal, por metro', cabosRamalM, 'm')] : []),
      ...(calc.blocosDg + calc.blocosAndares ? [srv('tel_dg', 'Montagem do DG e das caixas de andar: blocos IDC-110/BLI com suportes, conectorização e identificação dos pares', calc.blocosDg + calc.blocosAndares, 'un')] : []),
      ...(nDps ? [srv('tel_dps', 'Instalação de DPS de linha/CA e ligação ao barramento de aterramento (TAP → BEP)', nDps, 'un')] : []),
      ...(calc.nobreaks.length ? [srv('tel_nobreak', 'Instalação de nobreak com banco de baterias para a central/rack', calc.nobreaks.reduce((a, n) => a + n.nNobreaks, 0), 'un')] : []),
      ...(calc.switches ? [srv('tel_switch', 'Instalação e configuração de switch PoE (VLAN de voz/QoS) e rack', calc.switches, 'un')] : []),
      ...(calc.pontosIp ? [srv('cab_certificacao', 'Certificação e etiquetagem dos pontos (rede + câmeras + telefonia)', calc.pontosIp, 'pt')] : []),
      ...(calc.infraM ? [srv('tel_infra', 'Infraestrutura de telefonia (prumada, eletrodutos e caixas), por metro', calc.infraM, 'm')] : []),
      srv('tel_programacao', `Programação da ${calc.analogica ? 'central' : 'PABX IP'} (${calc.ramaisUsados} ramais, porteiros, portaria${calc.troncos ? ', troncos' : ''}) e treinamento da portaria`, 1, 'vb'),
      srv('tel_comissionamento', 'Teste ramal a ramal, identificação dos pares, mapa do DG e as built', 1, 'vb'),
      srv('tel_projeto', 'Projeto de telefonia/interfonia (ramais, prumada, DG, memorial) com ART', 1, 'vb'),
    ];
  const obra = dados.obra?.nome || 'a edificação';
  return {
    cliente_nome: dados.cliente?.nome || '',
    escopo: modo === 'inspecao'
      ? `Vistoria técnica e teste ramal a ramal do sistema de telefonia/interfonia de ${obra} (${calc.ramaisUsados} ramais, ${calc.nPorteiros} porteiro(s)), com verificação do DG, identificação de pares, DPS, aterramento e nobreak, e relatório com ART.`
      : `Fornecimento, instalação e programação de sistema de ${calc.rotuloTipo.toLowerCase()} em ${obra}: ${descricaoCentral(calc)}, ${terminais} terminal(is) para ${calc.unidades} unidades e áreas comuns, ${calc.terminaisPortaria} terminal(is) de portaria, ${calc.nPorteiros} porteiro(s) eletrônico(s), cabeamento${calc.ip ? ' estruturado' : ' CI/CCI com DG e blocos IDC-110'}, DPS de linha, nobreak para ${num(calc.autonomiaH, 0)} h, projeto, ART e treinamento.`,
    observacoes: `Rascunho gerado pela skill de telefonia e interfonia — conferir modelos, quantidades e preços antes de enviar ao cliente.${calc.infraExistente ? ' Considera a tubulação telefônica existente em condições de uso.' : ''} Contratação de linhas/troncos com a operadora não incluída.`,
    itens,
  };
}

const OP = {
  tipo: F.op(Object.entries(C.TIPOS_SISTEMA)),
  topologia: F.op(Object.entries(C.TOPOLOGIAS)),
  tronco: F.op([['analogico', 'Linha analógica (operadora)'], ['sip', 'Tronco SIP']]),
  caboRamal: F.op([['cci2', 'CCI-50 2 pares'], ['cci4', 'CCI-50 4 pares']]),
  fechadura: F.op(Object.entries(C.FECHADURAS)),
};

const FORMULARIO = [
  F.secaoIdentificacao(1),
  { titulo: '2. Sistema', aberta: true, itens: [
    { tipo: 'grade', colunas: 4, campos: [
      { caminho: 'sistema.tipo', rotulo: 'Tipo de sistema', tipo: 'selecao', opcoes: OP.tipo },
      { caminho: 'sistema.topologia', rotulo: 'Topologia (analógico)', tipo: 'selecao', opcoes: OP.topologia },
      { caminho: 'sistema.ramais_por_unidade', rotulo: 'Ramais por unidade', tipo: 'numero' },
      { caminho: 'sistema.reserva_pct', rotulo: 'Reserva de ramais (%)', tipo: 'numero' },
      { caminho: 'sistema.ramais_por_placa', rotulo: 'Ramais por placa da central', tipo: 'numero', dica: 'Central analógica modular (ex.: 16)' },
      { caminho: 'sistema.terminais_portaria', rotulo: 'Terminais de portaria', tipo: 'numero' },
      { caminho: 'sistema.local_portaria', rotulo: 'Local da portaria' },
      { caminho: 'sistema.distancia_portaria_m', rotulo: 'Distância DG → portaria (m)', tipo: 'numero' },
      { caminho: 'sistema.local_dg', rotulo: 'Local da central / DG' },
      { caminho: 'sistema.troncos', rotulo: 'Troncos externos (linhas)', tipo: 'numero' },
      { caminho: 'sistema.tipo_tronco', rotulo: 'Tipo de tronco', tipo: 'selecao', opcoes: OP.tronco },
      { caminho: 'sistema.cabo_ramal', rotulo: 'Cabo do ramal', tipo: 'selecao', opcoes: OP.caboRamal },
      { caminho: 'sistema.reserva_pares_pct', rotulo: 'Reserva de pares na prumada (%)', tipo: 'numero' },
      { caminho: 'sistema.fator_cabo', rotulo: 'Fator de cabo (folgas)', tipo: 'numero', dica: 'Padrão 1,15' },
      { caminho: 'sistema.ambiente_terminal', rotulo: 'Ambiente do terminal na unidade', dica: 'Nome do ambiente na planta (ex.: Cozinha)' },
      { caminho: 'sistema.autonomia_h', rotulo: 'Autonomia do nobreak (h)', tipo: 'numero' },
      { caminho: 'sistema.distancia_bep_m', rotulo: 'Distância DG → BEP (m)', tipo: 'numero' },
      { caminho: 'sistema.portas_switch', rotulo: 'Portas por switch (IP)', tipo: 'numero' },
      { caminho: 'sistema.nobreak', rotulo: 'Prever nobreak', tipo: 'check' },
      { caminho: 'sistema.dps_linha', rotulo: 'Prever DPS de linha', tipo: 'check' },
      { caminho: 'sistema.infra_existente', rotulo: 'Tubulação telefônica existente', tipo: 'check' },
    ] },
  ] },
  { titulo: '3. Edificação — blocos e torres', aberta: true, itens: [
    { tipo: 'nota', texto: 'Um bloco/torre por linha. Distância DG: do DG até a base da prumada do bloco; distância à unidade: da caixa do andar até o terminal. Rota externa: o cabo sai da edificação do DG (outra torre) — recebe DPS nas duas pontas.' },
    { tipo: 'tabela', caminho: 'blocos', rotuloAdicionar: 'Adicionar bloco', novaLinha: { nome: 'Torre {n}', pavimentos: 1, unidades_por_pavimento: 1, primeiro_pavimento: 1, pe_direito_m: 2.9, distancia_dg_m: 20, distancia_media_unidade_m: 15, ramais_por_unidade: null, rota_externa: false },
      colunas: [
        { campo: 'nome', rotulo: 'Bloco/torre' },
        { campo: 'pavimentos', rotulo: 'Pavimentos', tipo: 'numero', largura: 80 },
        { campo: 'unidades_por_pavimento', rotulo: 'Unid./pav.', tipo: 'numero', largura: 80 },
        { campo: 'primeiro_pavimento', rotulo: '1º pav. com unid.', tipo: 'numero', largura: 90 },
        { campo: 'pe_direito_m', rotulo: 'Pé-direito (m)', tipo: 'numero', largura: 90 },
        { campo: 'distancia_dg_m', rotulo: 'Dist. DG (m)', tipo: 'numero', largura: 85 },
        { campo: 'distancia_media_unidade_m', rotulo: 'Dist. unid. (m)', tipo: 'numero', largura: 90 },
        { campo: 'ramais_por_unidade', rotulo: 'Ramais/unid.', tipo: 'numero', largura: 85 },
        { campo: 'rota_externa', rotulo: 'Rota externa', tipo: 'check', largura: 80 },
      ] },
  ] },
  { titulo: '4. Áreas comuns e portões', aberta: true, itens: [
    { tipo: 'nota', texto: 'Áreas comuns com ramal (salão, academia, guarita, garagem…). Externo: o cabo sai da edificação (recebe DPS de linha).' },
    { tipo: 'tabela', caminho: 'areas_comuns', rotuloAdicionar: 'Adicionar área comum', novaLinha: { nome: '', ramais: 1, distancia_m: 20, externo: false },
      colunas: [{ campo: 'nome', rotulo: 'Área comum' }, { campo: 'ramais', rotulo: 'Ramais', tipo: 'numero', largura: 80 }, { campo: 'distancia_m', rotulo: 'Dist. DG (m)', tipo: 'numero', largura: 90 }, { campo: 'externo', rotulo: 'Externo', tipo: 'check', largura: 70 }] },
    { tipo: 'nota', texto: 'Portões com porteiro eletrônico (um porteiro por portão).' },
    { tipo: 'tabela', caminho: 'portoes', rotuloAdicionar: 'Adicionar portão', novaLinha: { nome: '', distancia_m: 30, fechadura: 'existente' },
      colunas: [{ campo: 'nome', rotulo: 'Portão' }, { campo: 'distancia_m', rotulo: 'Dist. DG (m)', tipo: 'numero', largura: 90 }, { campo: 'fechadura', rotulo: 'Fechadura', tipo: 'selecao', opcoes: OP.fechadura, largura: 220 }] },
  ] },
  F.secaoInspecao(5, F.op([['comissionamento', 'Comissionamento'], ['vistoria', 'Vistoria técnica'], ['periodica', 'Vistoria periódica']])),
  F.secaoChecklist(6, CHECKLIST.length),
  { titulo: '7. Teste ramal a ramal', itens: [
    { tipo: 'nota', texto: 'Marque cada teste feito; em branco = não verificado. Inclua portaria e porteiros.' },
    { tipo: 'tabela', caminho: 'inspecao.teste_ramais', rotuloAdicionar: 'Adicionar teste', novaLinha: { ramal: '', local: '', chamada_ok: null, audio_ok: null, identificacao_ok: null, observacao: '' },
      colunas: [{ campo: 'ramal', rotulo: 'Ramal', largura: 80 }, { campo: 'local', rotulo: 'Local', largura: 160 }, { campo: 'chamada_ok', rotulo: 'Chamada ok', tipo: 'check', largura: 85 }, { campo: 'audio_ok', rotulo: 'Áudio ok', tipo: 'check', largura: 80 }, { campo: 'identificacao_ok', rotulo: 'Identificação ok', tipo: 'check', largura: 105 }, { campo: 'observacao', rotulo: 'Observação' }] },
  ] },
  F.secaoNcs(8, CHECKLIST.map(c => c.cod)),
  F.secaoFotos(9),
];

module.exports = criarDisciplina({
  chave: 'telefonia',
  nome: 'Telefonia e interfonia (práticas Telebrás / NBR 14565 / NBR 14306)',
  modelo: MODELO,
  exemplo: EXEMPLO,
  checklistBase: CHECKLIST,
  formulario: FORMULARIO,
  processar,
  resumir,
  documentos: DOCUMENTOS,
  modosOrcamento: [
    { modo: 'execucao', rotulo: 'Implantação de telefonia/interfonia', descricao: 'Central ou PABX, terminais, porteiros, cabos CI/CCI/UTP, DG e blocos, DPS, nobreak, programação e mão de obra' },
    { modo: 'inspecao', rotulo: 'Vistoria / teste ramal a ramal', descricao: 'Teste por ramal, relatório com ART e correção das não conformidades' },
  ],
  montarOrcamento,
});
