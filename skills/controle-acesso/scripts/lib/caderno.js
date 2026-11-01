// Caderno de fabricação e montagem das caixas do controle de acesso (PDF):
// uma caixa por controladora, com a controladora, a(s) fonte(s) 12 Vcc com
// bateria, o relé de liberação por incêndio (rota de fuga), o relé de
// intertravamento (quando informado), o módulo de botoeira de emergência/
// quebra-vidro e o DPS da alimentação. Leitores, fechaduras, botoeiras e
// sensores de porta ficam no campo (na_placa:false). Não há catálogo de
// controladora/fonte/bateria: medidas são típicas e vão marcadas [CONFERIR].
// Motor comum: skills/_comum/fabricacao/caixa.js.

const { cadernoDeCaixas } = require('../../../_comum/fabricacao/caixa');
const { gerarCadernoPdf } = require('../../../_comum/fabricacao/caderno');

const br = (v, c = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const sim = (v) => v === true || v === 'true' || v === 'sim' || v === 1 || v === '1';

const NORMAS = [
  { codigo: 'IEC 60839-11-1', titulo: 'Sistemas eletrônicos de controle de acesso — requisitos do sistema e dos componentes', aplicacao: 'controladora, fonte com bateria e gabinete com tamper (violação) e supervisão de falta de CA/bateria' },
  { codigo: 'IEC 60839-11-2', titulo: 'Sistemas eletrônicos de controle de acesso — diretrizes de aplicação', aplicacao: 'arranjo da controladora, das fechaduras e dos dispositivos de saída por porta' },
  { codigo: 'ABNT NBR 9077 e IT de saídas de emergência', titulo: 'Saídas de emergência em edifícios', aplicacao: 'portas em rota de fuga: fechadura fail-safe liberada por incêndio, falta de energia e acionador de emergência' },
  { codigo: 'ABNT NBR 17240', titulo: 'Detecção e alarme de incêndio', aplicacao: 'contato seco da central de alarme que aciona o relé de liberação das fechaduras' },
  { codigo: 'ABNT NBR 9050', titulo: 'Acessibilidade', aplicacao: 'altura dos comandos de porta (leitor e botoeira entre 0,80 m e 1,20 m)' },
  { codigo: 'ABNT NBR 5410', titulo: 'Instalações elétricas de baixa tensão', aplicacao: 'circuito dedicado da alimentação CA, DPS classe II e aterramento da caixa' },
  { codigo: 'Lei 13.709/2018 (LGPD)', titulo: 'Proteção de dados pessoais', aplicacao: 'controladora e servidor guardam credenciais e registros de acesso (biometria/face são dados sensíveis): caixa trancada, acesso restrito e registro de intervenção' },
];

const unidadeBase = (id) => String(id).replace(/\.\d+$/, '');

function montarCaixas(res) {
  const { calc, dados } = res;
  const s = dados.sistema || {};
  const intertrav = sim(s.intertravamento) || calc.pontos.some(p => sim(p.intertravamento));
  const caixas = [];
  for (const c of calc.controladoras) {
    const pts = c.portas.map(u => calc.pontos.find(p => p.id === unidadeBase(u))).filter(Boolean);
    const nEmerg = pts.reduce((a, p) => a + (p.botoeiraEmergencia || 0), 0);
    const rotas = pts.filter(p => p.rota);
    const nRota = rotas.length;
    const nFech = pts.reduce((a, p) => a + (p.nFechaduras || 0), 0);
    const nLeit = c.leitores;
    const nBot = pts.reduce((a, p) => a + (p.botoeiraSaida || 0), 0);
    const nSens = pts.reduce((a, p) => a + (p.sensores || 0), 0);
    const comRele = calc.incendio && nRota > 0;
    const bat = c.bateriaAh <= 12 ? { largura_mm: 150, altura_mm: 100, profundidade_mm: c.bateriaAh <= 7 ? 65 : 95 } : { largura_mm: 180, altura_mm: 170, profundidade_mm: 80 };
    const tecnologias = calc.pontos.map(p => p.rotuloTecnologia).filter((v, i, a) => v && a.indexOf(v) === i).join(', ');
    const itens = [
      { tag: 'CTRL', tipo: 'modulo', descricao: `Controladora de acesso ${calc.ppc} portas / ${calc.lpc} leitores, TCP/IP, ${calc.comunicacao === 'rs485' ? 'OSDP/RS-485' : 'Wiegand'}`, largura_mm: 180, altura_mm: 150, profundidade_mm: 40, fixacao: 'placa' },
      ...Array.from({ length: c.nFontes }, (_, k) => ({ tag: c.nFontes > 1 ? `FT${k + 1}` : 'FT', tipo: 'fonte', descricao: `Fonte 12 Vcc ${c.fonteA} A com carregador e supervisão de falta de CA/bateria baixa`, largura_mm: 160, altura_mm: 100, profundidade_mm: 60, fixacao: 'placa' })),
      ...Array.from({ length: c.nBaterias }, (_, k) => ({ tag: c.nBaterias > 1 ? `BAT${k + 1}` : 'BAT', tipo: 'bateria', descricao: `Bateria selada VRLA 12 V ${c.bateriaAh} Ah (autonomia ${calc.autonomiaH} h em repouso)`, ...bat, peso_kg: c.bateriaAh * 0.3, fixacao: 'placa' })),
      ...(comRele ? [{ tag: 'RL-INC', tipo: 'modulo', descricao: `Relé de interface com a central de incêndio (contato NF da central corta a alimentação das fechaduras das rotas de fuga: ${rotas.map(p => p.id).join(', ')})`, largura_mm: 45, altura_mm: 90, profundidade_mm: 60 }] : []),
      ...(intertrav ? [{ tag: 'RL-INT', tipo: 'modulo', descricao: 'Relé de intertravamento (eclusa): trava uma porta enquanto a outra do par está aberta', largura_mm: 45, altura_mm: 90, profundidade_mm: 60 }] : []),
      ...(nEmerg ? [{ tag: 'MD-EMG', tipo: 'modulo', descricao: `Módulo de interface dos acionadores de emergência/quebra-vidro (${nEmerg}; contatos NF em série com a alimentação das fechaduras)`, largura_mm: 70, altura_mm: 90, profundidade_mm: 55 }] : []),
      { tag: 'DPS', tipo: 'modulo', descricao: 'DPS classe II 275 V na entrada CA da fonte', largura_mm: 18, altura_mm: 90, profundidade_mm: 60 },
      // campo (fora da caixa)
      ...(nLeit ? [{ tag: 'LEI', descricao: `Leitores (${nLeit})${tecnologias ? ` — ${tecnologias}` : ''}`, quantidade: nLeit, na_placa: false, largura_mm: 80, altura_mm: 120 }] : []),
      ...(nFech ? [{ tag: 'FCH', descricao: `Fechaduras eletromagnéticas/fechos elétricos (${nFech}), alimentadas por esta caixa`, quantidade: nFech, na_placa: false, largura_mm: 250, altura_mm: 50 }] : []),
      ...(nBot ? [{ tag: 'BOT', descricao: `Botoeiras de saída (${nBot})`, quantidade: nBot, na_placa: false, largura_mm: 80, altura_mm: 120 }] : []),
      ...(nEmerg ? [{ tag: 'ACE', descricao: `Acionadores de emergência quebra-vidro (${nEmerg})`, quantidade: nEmerg, na_placa: false, largura_mm: 90, altura_mm: 90 }] : []),
      ...(nSens ? [{ tag: 'SEN', descricao: `Sensores magnéticos de porta (${nSens})`, quantidade: nSens, na_placa: false, largura_mm: 40, altura_mm: 12 }] : []),
    ];
    const frente = [
      { tag: 'L-REDE', tipo: 'led', texto: ['REDE CA'] },
      { tag: 'L-BAT', tipo: 'led', texto: ['BATERIA'] },
      { tag: 'L-PORTA', tipo: 'led', texto: ['PORTA ABERTA'] },
      ...(nRota ? [{ tag: 'L-EMG', tipo: 'led', texto: ['LIBERAÇÃO EMERG.'] }, { tag: 'B-TESTE', tipo: 'botao', texto: ['TESTE LIBERAÇÃO'] }] : []),
    ];
    caixas.push({
      id: c.id,
      titulo: `Controladora de acesso — ${c.portas.join(', ')}`,
      local: String(s.local_controladoras || 'SALA TÉCNICA / PRÓXIMO ÀS PORTAS').toUpperCase(),
      funcao: `Comanda ${c.nPortas} porta(s) (${c.portas.join(', ')}) com ${c.leitores} leitor(es). Corrente em repouso ${br(c.iRep, 2)} A, de pico ${br(c.iPico, 2)} A: fonte ${c.fonteA} A${c.nFontes > 1 ? ` (${c.nFontes} un)` : ''} e bateria ${c.bateriaAh} Ah${c.nBaterias > 1 ? ` (${c.nBaterias} un)` : ''} para ${calc.autonomiaH} h de autonomia.`,
      observacoes: [
        ...(nRota ? [`Rota de fuga (${rotas.map(p => p.id).join(', ')}): fechadura fail-safe; a alimentação passa pelo contato NF do relé de incêndio e do acionador de emergência, e a falta de energia também libera a porta.`] : []),
        ...(calc.sensivel ? ['Há biometria/reconhecimento facial no sistema: caixa trancada e registro de quem intervém (LGPD).'] : []),
      ],
      itens, frente,
      tensao: '127/220 Vca entrada · 12 Vcc saída',
      ip: pts.some(p => p.externo) ? 'IP54' : 'IP40',
      largura_min_mm: 300, altura_min_mm: 400,
      dissipacao_w: Math.round(c.iPico * 12 * 0.15 + 5),
      bornes: Math.max(20, c.nPortas * 14),
      cabo_interligacao: 'manga blindada 6/4 vias 24 AWG (leitores), PP 2 × seção do memorial (fechaduras), U/UTP Cat 6 (rede)',
      dados_placa: [['Controladora', `${c.nPortas} porta(s) · ${c.leitores} leitor(es)`], ['Fonte / bateria', `12 Vcc ${c.fonteA} A / ${c.bateriaAh} Ah`], ['Autonomia', `${calc.autonomiaH} h`]],
      normaInvolucro: 'ABNT NBR IEC 60529 · IEC 60839-11-1 (tamper)',
      verificacoes: [
        { item: `${c.id} · Autonomia da bateria`, criterio: `com a CA desligada, a controladora e os leitores seguem ativos; carga em repouso ≈ ${br(c.iRep, 2)} A, bateria ${c.bateriaAh} Ah (≥ ${br(c.ahNec, 1)} Ah para ${calc.autonomiaH} h); LED de bateria e aviso de falta de CA funcionando`, norma: 'IEC 60839-11-1' },
        { item: `${c.id} · Teste de cada porta`, criterio: `portas ${c.portas.join(', ')}: credencial válida abre, inválida nega, botoeira de saída abre, sensor registra porta aberta/forçada, tamper da caixa gera alarme`, norma: 'IEC 60839-11-2' },
        ...(nRota ? [
          { item: `${c.id} · Rota de fuga fail-safe`, criterio: `portas ${rotas.map(p => p.id).join(', ')}: ao cortar a alimentação a fechadura libera (fail-safe); a saída fica livre pelo lado de dentro`, norma: 'NBR 9077 · IT saídas de emergência' },
          { item: `${c.id} · Liberação por incêndio`, criterio: calc.incendio ? 'ao disparar a central de alarme (contato NF), o relé corta a alimentação e as portas de rota de fuga liberam; rearme só após reset da central' : 'sem integração com a central informada: confirmar liberação por falta de energia e acionador de emergência e registrar a aceitação do Corpo de Bombeiros', norma: 'NBR 17240 · IT saídas de emergência' },
          { item: `${c.id} · Acionador de emergência`, criterio: 'ao acionar o quebra-vidro a porta libera imediatamente, sem depender de software, rede ou bateria da controladora', norma: 'NBR 9077' },
        ] : []),
        ...(intertrav ? [{ item: `${c.id} · Intertravamento`, criterio: 'com uma porta do par aberta a outra não libera; em emergência/incêndio ambas liberam', norma: 'IEC 60839-11-2' }] : []),
      ],
    });
  }
  return caixas;
}

function montarCaderno(res) {
  const { calc } = res;
  return cadernoDeCaixas(montarCaixas(res), {
    dados: res.dados,
    sigla: 'CAD-CX-ACE',
    subtitulo: `Controladoras do controle de acesso — ${calc.nCtrl} caixa(s), ${calc.nPontos} ponto(s) de acesso${calc.rotas.length ? `, ${calc.rotas.length} em rota de fuga` : ''}`,
    normas: NORMAS,
    modeloHm: 'H&M CX-ACE',
    normaHm: 'IEC 60839-11-1 / NBR 9077',
    verificacoesExtra: [
      { item: 'Altura dos comandos', criterio: 'leitores e botoeiras entre 0,80 m e 1,20 m do piso; passagem acessível junto a catracas ≥ 0,90 m', norma: 'ABNT NBR 9050' },
      { item: 'Alimentação CA', criterio: 'circuito dedicado com DR e DPS classe II; PE da caixa ligado ao aterramento', norma: 'ABNT NBR 5410' },
      ...(calc.sensivel ? [{ item: 'Dados pessoais', criterio: 'biometria/face: acesso ao servidor restrito, base legal e aviso de privacidade afixados', norma: 'LGPD (Lei 13.709/2018)' }] : []),
    ],
    avisos: [
      'Controladora, fonte, bateria e relés não têm catálogo: medidas e massas são típicas e o invólucro foi dimensionado por elas. Fonte, bateria, relé de incêndio e DPS já estão na lista de materiais do memorial; invólucro, trilho, bornes e demais itens de montagem devem ser incluídos no orçamento conforme este caderno. [CONFERIR]',
      ...(calc.rotas.length && !calc.incendio ? ['Há portas em rota de fuga sem integração com a central de incêndio: caixa montada sem relé de liberação (ver não conformidade R2 do memorial). [CONFERIR IT local]'] : []),
    ],
  });
}

const gerarCaderno = (res) => gerarCadernoPdf(montarCaderno(res));

module.exports = { montarCaixas, montarCaderno, gerarCaderno };
