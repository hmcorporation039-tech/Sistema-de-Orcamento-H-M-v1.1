// Caderno de fabricação e montagem dos QUADROS DDC (QA-01…QA-n, PDF) da automação predial (BMS).
// A lista de pontos do cálculo da skill (equipamentos × DI/DO/AI/AO, reserva, controladores e
// quadros) é repartida entre os quadros — cada equipamento inteiro num quadro, equilibrando os
// pontos físicos — e cada quadro vira um quadro de automação da skill de quadros, pelo módulo
// comum _comum/fabricacao/cadernoPainel.js: controlador DDC (base) + módulos de E/S com a reserva
// da skill, fonte 24 Vcc pelo consumo (+ margem), relés de interface nas saídas digitais, réguas
// de bornes por sinal, DPS, invólucro, plaquetas, materiais da caixa aos parafusos, lista de
// materiais com preço e ensaios de rotina da NBR IEC 61439-1 (+ teste ponto a ponto das E/S).
// Automação residencial (Zigbee/Wi-Fi/KNX sem BMS) não tem quadro DDC: o documento não se aplica.

const P = require('../../../_comum/fabricacao/cadernoPainel');
const { fmtNum } = require('../../../_comum/docx-base');

const num = fmtNum;
const TIPOS = ['di', 'do', 'ai', 'ao'];

const NORMAS = [
  { codigo: 'ISO 16484-2 / -5 (BACnet: ISO 16484-5)', titulo: 'Sistemas de automação e controle predial — hardware; protocolo BACnet', aplicacao: 'Controladores DDC e integração com o supervisório (BACnet/IP e MS/TP).' },
  { codigo: 'ABNT NBR IEC 61131-2', titulo: 'Controladores programáveis — requisitos de equipamentos e ensaios', aplicacao: 'Entradas e saídas 24 Vcc, alimentação do controlador e dos módulos [CONFERIR aplicabilidade ao DDC escolhido].' },
  { codigo: 'ABNT NBR 5410', titulo: 'Instalações elétricas de baixa tensão', aplicacao: 'Alimentação do quadro, DPS (6.3.5), separação entre circuitos de potência e de sinal (6.2.9.5) e aterramento.' },
];

// Equipamentos (linhas da lista de pontos) repartidos entre os quadros: o maior primeiro, no
// quadro com menos pontos físicos (cada linha inteira num quadro — fiação de um equipamento num lugar só)
function repartir(bms) {
  const n = Math.max(1, bms.quadros || 1);
  const qs = Array.from({ length: n }, (_, i) => ({ tag: `QA-${String(i + 1).padStart(2, '0')}`, linhas: [], fisicos: 0 }));
  for (const l of [...bms.linhas].filter(x => x.fisicos > 0).sort((a, b) => b.fisicos - a.fisicos || String(a.id).localeCompare(String(b.id)))) {
    const q = qs.reduce((a, b) => (b.fisicos < a.fisicos ? b : a));
    q.linhas.push(l); q.fisicos += l.fisicos;
  }
  for (const q of qs) {
    q.pontos = Object.fromEntries(TIPOS.map(t => [t, q.linhas.reduce((s, l) => s + l.qtd * (l[t] || 0), 0)]));
    q.comReserva = Math.ceil(q.fisicos * (1 + bms.reserva) - 1e-9);
    q.controladores = Math.max(1, Math.ceil(q.comReserva / Math.max(1, bms.pontosPorControlador)));
  }
  return qs.filter(q => q.linhas.length);
}

function dadosDoQa(res, q, i) {
  const { calc, dados } = res;
  const bms = calc.bms;
  const sinais = [];
  for (const l of q.linhas) for (const t of TIPOS) {
    const quantidade = l.qtd * (l[t] || 0);
    if (quantidade > 0) sinais.push({ tag: l.id, descricao: `${l.descricao} (${l.qtd} × ${l[t]} ${t.toUpperCase()})`, tipo: t.toUpperCase(), quantidade });
  }
  const comunicacao = ['ethernet', ...(bms.segmentos > 0 && i === 0 ? ['modbus_rtu'] : [])];
  return P.dadosDoQuadro(dados, {
    quadro: { tag: q.tag, descricao: 'Quadro de automação predial (DDC)', tipo: 'automacao', sistema: 'monofasico', tensao_ff: 380, tensao_fn: 220, montagem: 'sobrepor', local: 'interno_tecnico', reserva_pct: 20 },
    automacao: {
      ativo: true, clp: true, cpu_di: 0, cpu_do: 0, cpu_ai: 0, cpu_ao: 0, reserva_io_pct: Math.round(bms.reserva * 100),
      sinais_motores: false, comunicacao: comunicacao.join(', '), switch_portas: 0, sinais, cargas_24v: [], porta: [{ tipo: 'sinaleiro_branco', funcao: 'Quadro energizado', quantidade: 1 }],
      cpu_referencia: null,
    },
  });
}

// a CPU do motor de quadros é o controlador DDC (base, E/S nos módulos): texto próprio
const textoDdc = (bms, q) => `Controlador DDC ${String(bms.protocolo || '').toUpperCase() === 'BACNET' ? 'BACnet/IP' : String(bms.protocolo || '').toUpperCase()} programável (base, E/S nos módulos de expansão)${q.controladores > 1 ? ` — ${q.controladores} controladores neste quadro, ver aviso` : ''}`;

function secaoPontos(q, bms) {
  return {
    titulo: `${q.tag} — lista de pontos (E/S) e reserva`, paisagem: true,
    paragrafos: [
      `Pontos físicos: DI ${q.pontos.di} · DO ${q.pontos.do} · AI ${q.pontos.ai} · AO ${q.pontos.ao} = ${q.fisicos}; com a reserva de ${Math.round(bms.reserva * 100)} % da skill: ${q.comReserva} pontos → ${q.controladores} controlador(es) de ${bms.pontosPorControlador} pontos. Saídas digitais por relé de interface (contato seco para o campo); entradas analógicas com cabo blindado aterrado só no quadro.`,
    ],
    tabela: {
      colunas: ['Tag', 'Equipamento', 'Local', 'Qtd.', 'DI', 'DO', 'AI', 'AO', 'Pontos físicos', 'Pontos de rede'],
      linhas: q.linhas.map(l => [l.id, `${l.rotulo} — ${l.descricao}`, l.local || '—', String(l.qtd), String(l.qtd * l.di), String(l.qtd * l.do), String(l.qtd * l.ai), String(l.qtd * l.ao), String(l.fisicos), String(l.totalRede || 0)]),
      proporcoes: [0.5, 3, 1.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.7, 0.7],
    },
  };
}

const exigeCaderno = (res) => !!(res.calc.bms && res.calc.bms.controladores > 0 && res.calc.bms.fisicos > 0);

function montarCaderno(res) {
  const { calc, dados } = res;
  if (!exigeCaderno(res)) throw new Error('Sem lista de pontos de BMS (controladores DDC): não há quadro de automação para o caderno.');
  const bms = calc.bms;
  const qs = repartir(bms);
  const partes = qs.map((q, i) => {
    const { caderno } = P.cadernoDoQuadro(dadosDoQa(res, q, i), {
      sigla: 'CAD-DDC', normas: NORMAS,
      caracteristicas: [['Controladores DDC', `${q.controladores} × ${bms.pontosPorControlador} pontos (${String(bms.protocolo || '').toUpperCase()})`], ['Pontos (com reserva)', `${q.fisicos} físicos (${q.comReserva} com ${Math.round(bms.reserva * 100)} % de reserva)`]],
      secoes: [secaoPontos(q, bms)],
      verificacoes: [
        { item: 'E/S ponto a ponto', criterio: 'Cada entrada simulada no borne de campo aparece no controlador/supervisório com a tag certa; cada saída aciona o relé de interface e o borne de campo; analógicas conferidas em 0/50/100 % da faixa', norma: 'comissionamento (ISO 16484) [CONFERIR roteiro do cliente]' },
        { item: 'Comunicação', criterio: `Controlador visível na rede ${String(bms.protocolo || '').toUpperCase()} com o Device ID/endereço do projeto${bms.segmentos > 0 && i === 0 ? '; barramento RS-485 com terminação de 120 Ω nas pontas e blindagem aterrada num ponto só' : ''}`, norma: 'ISO 16484-5 [CONFERIR]' },
        { item: 'Fonte 24 Vcc e falta de energia', criterio: 'Tensão da fonte sob carga; volta da energia sem perder a programação; alarme de falta de fonte no supervisório', norma: 'boa prática H&M' },
      ],
      avisos: [
        ...(q.controladores > 1 ? [`A skill prevê ${q.controladores} controladores neste quadro; o arranjo considera um controlador base com as E/S em módulos de expansão (mesma quantidade de pontos). Com controladores independentes, acrescentar a base de cada um (≈ 110 mm de trilho, típico) — conferir no layout. [CONFERIR]`] : []),
        'Capacidade dos módulos de E/S, consumo em 24 Vcc e medidas são típicos de catálogo: confirmar com o fabricante do DDC escolhido. [CONFERIR]',
        'Sensores, atuadores, transdutores, gateway, switch central, nobreak e supervisório são itens de campo/central: estão no memorial e no orçamento da skill, não no quadro.',
      ],
      precos: dados.precos_materiais || null,
    });
    // texto do controlador DDC no lugar da "CPU compacta" genérica
    const ddc = textoDdc(bms, q);
    // quadro só de automação: o aviso de "nenhum circuito ou motor" do motor de quadros não se aplica
    caderno.avisos = caderno.avisos.filter(t => !/^Nenhum circuito ou motor/.test(t));
    caderno.componentes = caderno.componentes.map(k => (/^CPU compacta/.test(k.descricao) ? { ...k, descricao: ddc } : k));
    caderno.secoes = caderno.secoes.map(s => (s.tabela ? { ...s, tabela: { ...s.tabela, linhas: s.tabela.linhas.map(l => (Array.isArray(l) ? l.map(v => (typeof v === 'string' && /^CPU compacta/.test(v) ? ddc : v)) : l)) } } : s));
    return { tag: q.tag, caderno };
  });
  return P.juntarCadernos(partes, {
    sigla: 'CAD-DDC',
    subtitulo: `${qs.map(q => q.tag).join(', ')} — quadros DDC: ${bms.controladores} controladores, ${bms.fisicos} pontos físicos (${String(bms.protocolo || '').toUpperCase()})`,
  });
}

const gerarCaderno = (res) => P.gerarPdf(montarCaderno(res));

module.exports = { montarCaderno, gerarCaderno, exigeCaderno, repartir };
