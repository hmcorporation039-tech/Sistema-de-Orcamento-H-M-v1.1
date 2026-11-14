// Caderno de fabricação e montagem do PAINEL DE COMANDO da pressurização de escada (PDF).
// Sai dos MESMOS dados da vista interna do painel no 3D (_comum/instalacao/paineis.js →
// dadosDoPainelPressurizacao + comandoDaPressurizacao): ventiladores e acionamento do cálculo da
// skill, a escada de relés do perfil de pressurização (partida pelo alarme da central, MAN-0-AUT
// por ventilador, reversão para o reserva por falta de fluxo/falha, modo TESTE com chave, inibição
// pela fumaça na casa de máquinas, operação/falha para a central), as seletoras, os sinaleiros e
// a régua de campo X2. O quadro (invólucro, Q0, partidas com disjuntor-motor + contator +
// inversor/soft-starter, fonte 24 Vcc, relés, bornes, barramento, plaquetas, materiais e ensaios
// de rotina da NBR IEC 61439-1) é o da skill de quadros, pelo módulo comum
// _comum/fabricacao/cadernoPainel.js. Os cenários simulados da escada viram o roteiro do ensaio
// funcional (NBR IEC 61439-1, 11.10).

const P = require('../../../_comum/fabricacao/cadernoPainel');
const PA = require('../../../_comum/instalacao/paineis');
const { fmtNum } = require('../../../_comum/docx-base');

const num = fmtNum;
const TAG = 'QPE';
const RFF_PADRAO = require('../../../quadros/dados/perfil-especificacao.json').regras.rff; // a mesma tag padrão do painel no 3D (TAG_PADRAO_PAINEL.pressurizacao)

const NORMAS = [
  { codigo: 'ABNT NBR 14880', titulo: 'Saídas de emergência em edifícios — escadas de segurança — controle de fumaça por pressurização', aplicacao: 'Partida automática pelo sistema de detecção, ventilador reserva, controle da pressão diferencial e ensaios de aceitação do sistema.' },
  { codigo: 'CBMDF NT 10/2015 (4.3.1.10) / IT 13 CBPMESP / CBMGO NT 13', titulo: 'Controle de fumaça — pressurização de escadas', aplicacao: 'Alimentação exclusiva, partida pela central, acionadores remotos, parada só no painel, modo de teste e reversão para o reserva [CONFERIR a norma do corpo de bombeiros local].' },
  { codigo: 'ABNT NBR 17240', titulo: 'Sistemas de detecção e alarme de incêndio', aplicacao: 'Interface com a central: contato do módulo de comando (partida) e retornos de operação e falha (módulo de entrada).' },
  { codigo: 'ABNT NBR IEC 60947-4-1 / 60947-4-2', titulo: 'Contatores e partidas de motores; soft-starters', aplicacao: 'Contator de isolamento e soft-starter dos ventiladores.' },
  { codigo: 'IEC 61800-5-1 / IEC 61800-3', titulo: 'Acionamentos de velocidade variável', aplicacao: 'Inversores dos ventiladores (PID pela pressão diferencial), cabo motor blindado.' },
];

const TIPO_SINALEIRO = { branco: 'sinaleiro_branco', vermelho: 'sinaleiro_vermelho', verde: 'sinaleiro_verde', amarelo: 'sinaleiro_amarelo' };
// a skill dá 'soft_starter'; o 3D (paineis.js) compara com 'soft' — aqui as duas grafias valem
const PARTIDA_QUADRO = { inversor: 'inversor', soft: 'soft_starter', soft_starter: 'soft_starter', direta: 'direta' };
const ROTULO_ACION = { inversor: 'inversor de frequência', soft_starter: 'soft-starter', direta: 'partida direta' };

// Painel e comando: os mesmos objetos do 3D
function painelDaPressurizacao(res) {
  const d = PA.dadosDoPainelPressurizacao({ calculo: res.calc, tag: TAG });
  const cmd = PA.comandoDaPressurizacao(d);
  return { d, cmd };
}

// Seletoras na ordem da porta do caderno: as dos ventiladores primeiro (a skill de quadros numera
// S1, S2… na ordem — S1/S2 ficam iguais às do 3D) e a chave de TESTE depois. Sinaleiros H1…Hn
// na ordem do comando (iguais aos do 3D).
function seletorasNaOrdem(cmd) {
  const sel = (cmd.porta || []).filter(e => e.porta !== false);
  const doVentilador = (e) => /^S[0-9]+$/.test(e.id);
  return [...sel.filter(doVentilador), ...sel.filter(e => !doVentilador(e))];
}

function montarQuadro(res, d, cmd) {
  const { calc, dados } = res;
  const { vent, al, c } = calc;
  const el = c.eletrica || {};
  const partida = PARTIDA_QUADRO[d.partidaUsada] || 'inversor';
  const timers = new Set((cmd.modelo.temporizadores || []).map(t => t.tag));
  const circ = (al.circuitos || [])[0] || {};
  const motores = Array.from({ length: d.nUsado }, (_, k) => ({
    tag: `V${k + 1}`, descricao: `Ventilador de pressurização V${k + 1}${d.nUsado === 2 ? (k ? ' (reserva)' : ' (principal)') : ''}`,
    potencia: vent.cv, unidade: 'cv', rendimento: vent.eta, fp: vent.fp, ip_in: null, partida, quantidade: 1, secao_mm2: circ.secao || null, tensao_placa: '',
    operando: d.nUsado === 2 ? k === 0 : true,
  }));
  const porta = [
    ...seletorasNaOrdem(cmd).map(e => ({ tipo: 'seletor', funcao: `${e.rotulo}${e.material === 'seletora_chave' && !/chave/i.test(e.rotulo) ? ' (chave com segredo)' : ''}`, quantidade: 1, sem_clp: true })),
    ...cmd.sinaleiros.map(s => ({ tipo: TIPO_SINALEIRO[s.cor] || 'sinaleiro_branco', funcao: s.rotulo.toUpperCase(), quantidade: 1, sem_clp: true })),
  ];
  // CLP (junto com os relés): as E/S do memorial — pressostatos, status, transmissor de ΔP e referência de
  // velocidade dos inversores. Seletoras e sinaleiros da porta são da lógica por relés (sem_clp)
  const TIPO_ES = { ED: 'DI', SD: 'DO', EA: 'AI', SA: 'AO' };
  const sinais = (calc.aut.pontos || []).filter(p => TIPO_ES[p.tipo]).map(p => ({ tag: p.tag, descricao: p.descricao, tipo: TIPO_ES[p.tipo], quantidade: 1 }));
  // tipo 'ccm' (painel de partidas de motores): o tipo 'comando' da skill de quadros é comando de
  // MÁQUINA (NR-12) e põe botão de emergência + relé de segurança — proibido aqui, a parada durante o
  // alarme é só pelo painel
  return P.dadosDoQuadro(dados, {
    quadro: {
      tag: TAG, descricao: 'Painel de comando da pressurização de escada', tipo: 'ccm', sistema: 'trifasico', maquina: false,
      tensao_ff: el.vff || 380, tensao_fn: el.vfn || 220, esquema: (dados.alimentacao || {}).esquema || 'TN-S',
      montagem: 'sobrepor', local: 'interno_tecnico', reserva_pct: 20,
    },
    motores,
    // relé de falta e sequência de fase (lógica por relés): minidisjuntor 3P de 2 A curva C da medição — o mesmo
    // padrão do quadro de força e comando (skills/quadros/dados/perfil-especificacao.json → regras.rff)
    circuitos: cmd.reles.some(r => r.tag === 'KFF') ? [{ n: 'RF', descricao: `RFF — relé de falta e sequência de fase (${RFF_PADRAO.referencia})`, tipo: 'automacao', ligacao: 'FFF', fases: 'ABC', potencia_w: 5, fp: 1, disjuntor_a: RFF_PADRAO.protecao_a, curva: RFF_PADRAO.curva, secao_mm2: 1.5 }] : [],
    automacao: {
      ativo: true, clp: true, sinais_motores: false, sinais, reserva_io_pct: 20, comunicacao: 'ethernet, modbus_rtu', reles_interface: calc.aut.totais.SD, porta,
      reles_auxiliares: cmd.reles.map(r => ({ tag: r.tag, tipo: timers.has(r.tag) ? 'temporizador' : 'rele', rotulo: r.rotulo || '' })),
    },
  });
}

function secoes(res, d, cmd) {
  const { calc } = res;
  const aut = calc.aut;
  const tempos = new Map((cmd.modelo.temporizadores || []).map(t => [t.tag, t.preset_s]));
  const campo = (calc.aut.pontos || []).filter(p => p.origem !== 'painel');
  return [
    { titulo: 'Modos de operação e intertravamentos', paragrafos: [
      `Painel ${TAG}: ${d.nUsado} ventilador(es) ${d.nUsado === 2 ? '(principal + reserva com reversão automática)' : ''}, acionamento por ${ROTULO_ACION[PARTIDA_QUADRO[d.partidaUsada] || 'inversor']}${d.cv ? ` — motor ${num(d.cv, 1)} cv${d.inA ? `, In ≈ ${num(d.inA, 1)} A` : ''}` : ''}. Lógica por relés (a mesma do 3D e do projeto pela especificação): ${cmd.blocos.map(b => b.id || b).join(', ')}.`,
      'Modos: MANUAL (seletora do ventilador em MAN — parte sem o alarme), AUTOMÁTICO (seletora em AUT — parte pelo contato da central de alarme ou pela chave de TESTE), 0 (desligado, sinalizado como falha na central) e TESTE (chave com segredo: roda a pressurização sem acionar a central).',
    ], marcadores: [...(aut.logica || []), ...(aut.intertravamentos || []).map(t => `Intertravamento: ${t}`)] },
    { titulo: 'Divisão de funções — relés e CLP', paragrafos: [
      'Relés (segurança, sem depender do CLP): relé de falta e sequência de fase (RFF/KFF — sinaliza e avisa a central sem desligar a pressurização), partida pelo alarme, MAN-0-AUT, temporização (KTR) e reversão para o reserva quando o principal não confirma o funcionamento após a partida.',
      `CLP: lê os pressostatos de fluxo, o status dos inversores e o transmissor de ΔP e controla a velocidade dos inversores (PID) para manter ${num(calc.c.dp, 0)} Pa na escada; E/S do memorial: ED ${calc.aut.totais.ED} · SD ${calc.aut.totais.SD} · EA ${calc.aut.totais.EA} · SA ${calc.aut.totais.SA} (com 20 % de reserva: ${calc.aut.comReserva.ED}/${calc.aut.comReserva.SD}/${calc.aut.comReserva.EA}/${calc.aut.comReserva.SA}).`,
    ] },
    { titulo: 'Escada de relés — função e contatos', tabela: {
      colunas: ['Tag', 'Tipo', 'Função', 'Contatos usados'],
      linhas: cmd.reles.map(r => [r.tag, tempos.has(r.tag) ? `temporizador (retardo na energização, ${num(tempos.get(r.tag))} s)` : 'relé auxiliar 24 Vcc, 4 contatos reversíveis', r.rotulo || '—', (r.usos || []).map(u => `${u.contato} ${u.tipo} → ${u.uso}`).join('; ') || '—']),
      proporcoes: [0.5, 1.4, 1.6, 3.5] } },
    { titulo: 'Porta — seletoras e sinaleiros', tabela: {
      colunas: ['Tag (caderno)', 'Tag na lógica / 3D', 'Dispositivo', 'Posições / cor', 'Função'],
      linhas: [
        ...seletorasNaOrdem(cmd).map((x, i) => [`S${i + 1}`, x.id, x.descricao || 'Seletora 22 mm', (x.posicoes || []).join(' · '), x.rotulo]),
        ...cmd.sinaleiros.map((x, i) => [`H${i + 1}`, x.tag, `Sinaleiro LED 22 mm ${x.tensao || '24 Vcc'}`, x.cor, x.rotulo]),
      ], proporcoes: [0.6, 0.7, 2, 1.1, 2.4] },
      marcadores: ['Sem botão de emergência que desligue os ventiladores: a parada durante o alarme é só no painel (sistema de segurança contra incêndio — CBMDF NT 10, 4.3.1.10.5 g) [CONFERIR com a norma local].'] },
    { titulo: 'Régua de campo X2 e interface com a central de alarme', paragrafos: ['Bornes de campo na ordem das conexões da escada de relés; cabos de sinal em eletroduto separado da força. O transmissor de ΔP (porta da escada no pavimento intermediário) e os pressostatos de fluxo entram no CLP, que pelo PID dá a referência de velocidade dos inversores (escada em 50 Pa).'],
      tabela: { colunas: ['Borne', 'Ligação', 'Bloco da lógica'], linhas: cmd.conexoes.filter(x => x.regua === 'X2').map((x, i) => [`X2:${i + 1}`, x.rotulo, x.grupo || '—']), proporcoes: [0.6, 3.6, 1.6] },
      marcadores: campo.map(p => `${p.tag} (${p.tipo}) — ${p.descricao} — origem: ${p.origem}`) },
  ];
}

function verificacoes(cmd) {
  return [
    ...(cmd.verificacao || []).map(v => ({ item: `Ensaio funcional — ${v.nome}`, criterio: `Reproduzir o cenário com o painel energizado (seletoras, contatos de campo simulados nos bornes X2) e conferir relés e sinaleiros; simulação da lógica: ${v.ok ? 'OK' : `FALHOU (${(v.falhas || []).join('; ')})`}`, norma: 'NBR IEC 61439-1, 11.10; NBR 14880' })),
    { item: 'Interface com a central', criterio: 'Contato da central parte o sistema na hora; retornos de OPERAÇÃO e FALHA chegam aos módulos de entrada; fio de falha partido também alarma (contato NF)', norma: 'NBR 17240; CBMDF NT 10 [CONFERIR]' },
    { item: 'Parametrização do acionamento', criterio: 'Inversor com os dados de placa do motor, rampas e referência de velocidade vinda do CLP; relé de falha e saída "em funcionamento" ligados à escada de relés', norma: 'IEC 61800-5-1' },
    { item: 'Programa do CLP — controle de pressão', criterio: 'PID com o transmissor de ΔP no setpoint do memorial (escada em 50 Pa) sem ultrapassar o limite; leitura dos pressostatos de fluxo e status dos inversores; sinaleiro de pressão fora da faixa', norma: 'NBR 14880; CBMDF NT 10 [CONFERIR]' },
    { item: 'Relé de falta e sequência de fase', criterio: 'Retirar uma fase e inverter a sequência na entrada do RFF: KFF cai, acende FALTA DE FASE e abre a falha para a central, sem desligar o comando', norma: 'NBR IEC 61439-1, 11.10' },
  ];
}

function montarCaderno(res) {
  const { d, cmd } = painelDaPressurizacao(res);
  const dq = montarQuadro(res, d, cmd);
  const { caderno } = P.cadernoDoQuadro(dq, {
    sigla: 'CAD-PRZ', normas: NORMAS,
    subtitulo: `${TAG} — painel de comando da pressurização: ${d.nUsado} ventilador(es), ${ROTULO_ACION[PARTIDA_QUADRO[d.partidaUsada] || 'inversor']}, ${cmd.reles.length} relés de lógica`,
    caracteristicas: [['Lógica de comando', `${cmd.blocos.length} blocos, ${cmd.reles.length} relés, ${(cmd.verificacao || []).filter(v => v.ok).length}/${(cmd.verificacao || []).length} cenários simulados OK`], ['Reversão para o reserva', d.nUsado === 2 ? `${d.tempoReversao} s sem fluxo ou falha do acionamento` : '—']],
    secoes: secoes(res, d, cmd),
    verificacoes: verificacoes(cmd),
    avisos: [
      ...(res.calc.arr && res.calc.arr.n > 2 ? [`O arranjo do cálculo tem ${res.calc.arr.n} ventiladores; o painel (como a vista do 3D) foi montado para 2 (principal + reserva). [CONFERIR]`] : []),
      'Transmissor de ΔP, pressostatos de fluxo, detector da casa de máquinas, acionadores remotos e módulos da central são itens de campo: não fazem parte do painel (estão no memorial e no orçamento da skill).',
    ],
    materiaisExtras: cmd.reles.some(r => r.tag === 'KFF') ? [{ codigo: 'RFF', grupo: 'Comando', descricao: `Relé de falta e sequência de fase ${(res.calc.c.eletrica || {}).vff || 380} V, 1 NA/NF, trilho DIN (${RFF_PADRAO.referencia}) — supervisão sem desligar a pressurização`, unidade: 'un', quantidade: 1 }] : [],
    precos: res.dados.precos_materiais || null,
  });
  return caderno;
}

const gerarCaderno = (res) => P.gerarPdf(montarCaderno(res));

module.exports = { montarCaderno, gerarCaderno, painelDaPressurizacao, montarQuadro };
