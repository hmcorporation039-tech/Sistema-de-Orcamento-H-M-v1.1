// Caderno de fabricação e montagem de CAIXAS e CENTRAIS (PDF): central de
// alarme, central de incêndio, controladora de acesso, DG de telefonia,
// headend de antena, string box solar etc. — qualquer invólucro que a skill
// dimensiona e que não seja quadro de força (skills/quadros) nem rack 19"
// (rack.js). A skill monta uma descrição simples da caixa (itens com medida,
// botões/sinalizadores da porta, normas) e este módulo devolve o objeto
// `caderno` do contrato (CONTRATO-CADERNO): vista frontal, placa de montagem
// com os itens dispostos em fileiras, componentes, materiais "da caixa aos
// parafusos", plaquetas e plaqueta H&M, verificações e avisos.
//
// Medidas dos itens que não vêm de catálogo são típicas e saem marcadas
// [CONFERIR]; quantidades de material saem por regra (campo `regra`).

const { criarPincelSvg } = require('./svg');

const br = (v, c = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
const maiusc = (s) => String(s ?? '').toUpperCase();

// Invólucros padrão de mercado (L × A × P, mm), do menor ao maior
const INVOLUCROS = [
  [200, 300, 150], [300, 400, 200], [400, 500, 200], [500, 600, 200], [600, 800, 250],
  [600, 1000, 300], [800, 1000, 300], [800, 1200, 300], [1000, 1200, 400],
];
const MARGEM_PLACA = 50;   // borda livre da placa de montagem
const FOLGA_ITEM = 40;     // espaço entre itens para canaleta e passagem de fio
const OCUPACAO_MAX = 0.55; // área dos itens / área útil da placa (resto = canaletas, fiação, ar)

// Fileiras (shelf packing) dos itens dentro da largura útil; devolve posições e a altura usada
function disporItens(itens, larguraUtil) {
  const pos = [];
  let x = 0, y = 0, hFileira = 0;
  for (const it of itens) {
    const w = Number(it.largura_mm) || 60, h = Number(it.altura_mm) || 60;
    if (x > 0 && x + w > larguraUtil) { x = 0; y += hFileira + FOLGA_ITEM; hFileira = 0; }
    pos.push({ it, x, y, w, h });
    x += w + FOLGA_ITEM / 2;
    hFileira = Math.max(hFileira, h);
  }
  return { pos, altura: y + hFileira };
}

// Escolhe o menor invólucro em que os itens cabem com folga; respeita o mínimo pedido pela skill
function escolherInvolucro(caixa) {
  if (caixa.largura_mm && caixa.altura_mm && caixa.profundidade_mm) {
    return { l: caixa.largura_mm, a: caixa.altura_mm, p: caixa.profundidade_mm, escolhida: false };
  }
  const itens = (caixa.itens || []).filter(i => i.na_placa !== false);
  const profMin = Math.max(100, ...itens.map(i => (Number(i.profundidade_mm) || 0) + 40));
  for (const [l, a, p] of INVOLUCROS) {
    if (p < profMin || l < (caixa.largura_min_mm || 0) || a < (caixa.altura_min_mm || 0)) continue;
    const util = l - 2 * MARGEM_PLACA, altUtil = a - 2 * MARGEM_PLACA;
    const area = itens.reduce((t, i) => t + (Number(i.largura_mm) || 60) * (Number(i.altura_mm) || 60), 0);
    if (area > OCUPACAO_MAX * util * altUtil) continue;
    if (disporItens(itens, util).altura <= altUtil) return { l, a, p, escolhida: true };
  }
  const [l, a, p] = INVOLUCROS[INVOLUCROS.length - 1];
  return { l, a, p, escolhida: true, excede: true };
}

function itemTrilho(it) { return it.fixacao === 'trilho' || (it.fixacao == null && it.tipo === 'modulo'); }

// Vista frontal: porta com dobradiças, fecho, plaqueta de identificação e os botões/sinalizadores
function vistaFrontal(c, inv) {
  const p = criarPincelSvg({ escala: inv.a > 700 ? 10 : 5 });
  const L = inv.l, A = inv.a;
  p.ret(0, 0, L, A, 'QD-PAINEL');
  p.ret(10, 10, L - 20, A - 20, 'QD-PORTA');
  [0.15, 0.85].forEach(f => p.ret(-5, A * f - 25, 7, 50, 'QD-PORTA'));
  p.ret(L - 38, A / 2 - 30, 22, 60, 'QD-PORTA');
  p.circ(L - 27, A / 2, 5, 'QD-PORTA');
  const hTxt = Math.min(18, L / 14);
  p.txt(L / 2, A - 40, hTxt, c.id, { alinhar: 'centro', negrito: true });
  p.txt(L / 2, A - 40 - hTxt * 1.6, hTxt * 0.6, maiusc(c.titulo), { alinhar: 'centro' });
  // comandos e sinalizadores em fileira(s), centralizados, plaqueta embaixo de cada um
  const frente = c.frente || [];
  const passo = Math.max(60, Math.min(110, (L - 80) / Math.max(1, Math.min(frente.length, 8))));
  const porLinha = Math.max(1, Math.floor((L - 60) / passo));
  frente.forEach((f, i) => {
    const col = i % porLinha, lin = Math.floor(i / porLinha);
    const nCol = Math.min(porLinha, frente.length - lin * porLinha);
    const x = L / 2 + (col - (nCol - 1) / 2) * passo;
    const y = A - 120 - lin * 90;
    if (f.tipo === 'display') p.ret(x - 40, y - 15, 80, 35, 'QD-COMPONENTE');
    else p.circ(x, y, f.tipo === 'led' ? 6 : 11, f.tipo === 'led' ? 'QD-PE' : 'QD-COMPONENTE');
    p.txt(x, y - 24, 6.5, f.tag, { alinhar: 'centro' });
    p.retCor(x - 27, y - 44, 54, 14, { fundo: '#111', cor: '#555', pena: 0.1 });
    p.txt(x, y - 37, 4.5, String((f.texto && f.texto[0]) || f.tag).slice(0, 14), { alinhar: 'centro', cor: '#fff' });
  });
  p.txt(L / 2, 15, 6, `${L} × ${A} × ${inv.p} mm — ${c.ip || 'IP54'}`, { alinhar: 'centro' });
  return { titulo: `${c.id} — vista frontal externa (porta fechada)`, ...p.svg({ margem: 25 }), escala: `1:${p.escala}`, notas: ['Dobradiças à esquerda, fecho com chave à direita; comandos e sinalizadores com a plaqueta de identificação logo abaixo.'] };
}

// Placa de montagem (porta aberta): trilhos/itens em fileiras, canaletas e bornes de saída
function vistaPlaca(c, inv) {
  const p = criarPincelSvg({ escala: inv.a > 700 ? 10 : 5 });
  const L = inv.l, A = inv.a;
  p.ret(0, 0, L, A, 'QD-PAINEL');
  p.ret(MARGEM_PLACA / 2, MARGEM_PLACA / 2, L - MARGEM_PLACA, A - MARGEM_PLACA, 'QD-PORTA');
  const itens = (c.itens || []).filter(i => i.na_placa !== false);
  const util = L - 2 * MARGEM_PLACA;
  const { pos } = disporItens(itens, util);
  const hTxt = Math.max(5, Math.min(9, L / 45));
  for (const q of pos) {
    const x = MARGEM_PLACA + q.x, y = A - MARGEM_PLACA - q.y - q.h;
    if (itemTrilho(q.it)) p.ret(x - 5, y + q.h / 2 - 7, q.w + 10, 14, 'QD-TRILHO');
    p.ret(x, y, q.w, q.h, q.it.tipo === 'bateria' ? 'QD-RESERVA' : 'QD-COMPONENTE');
    p.txt(x + q.w / 2, y + q.h / 2, hTxt, q.it.tag, { alinhar: 'centro', negrito: true });
    p.txt(x + q.w / 2, y + q.h / 2 - hTxt * 1.5, hTxt * 0.65, `${q.w}×${q.h}`, { alinhar: 'centro' });
  }
  // canaleta de fiação em volta da área útil e na base (entrada de cabos)
  p.ret(MARGEM_PLACA - 20, MARGEM_PLACA - 20, util + 40, 25, 'QD-CANALETA');
  p.txt(L / 2, MARGEM_PLACA - 12, hTxt * 0.7, 'canaleta 25 × 40 mm — entrada de cabos (prensa-cabos) na face inferior', { alinhar: 'centro' });
  p.txt(L / 2, 15, 6, `${L} × ${A} × ${inv.p} mm — placa de montagem em chapa galvanizada 2 mm`, { alinhar: 'centro' });
  return { titulo: `${c.id} — placa de montagem e disposição interna`, ...p.svg({ margem: 25 }), escala: `1:${p.escala}`, notas: ['Disposição indicativa (itens em fileiras); a posição final respeita o raio de curvatura dos cabos e a ventilação de cada equipamento. [CONFERIR com os modelos comprados]'] };
}

function materiaisDaCaixa(c, inv) {
  const itens = c.itens || [];
  const trilho = itens.filter(itemTrilho);
  const larguraTrilhos = trilho.reduce((t, i) => t + (Number(i.largura_mm) || 60), 0);
  const trilhoM = Math.ceil((larguraTrilhos + 100) / 1000 * 10) / 10 || 0.3;
  const nFios = Math.max(8, itens.length * 6);
  const nBornes = Math.max(10, Number(c.bornes) || itens.length * 4);
  const cabos = (inv.l + inv.a) * 2 / 1000 * 1.3; // perímetro da placa com 30 % de sobra
  const m = (grupo, descricao, especificacao, quantidade, unidade, regra) => ({ grupo, descricao, especificacao, quantidade, unidade, regra });
  return [
    m('Invólucro', `Caixa metálica ${inv.l} × ${inv.a} × ${inv.p} mm`, `chapa de aço 1,2 mm pintada RAL 7035, porta com vedação, fecho com chave, ${c.ip || 'IP54'}${c.externa ? ', uso externo (com aba contra chuva)' : ''}`, 1, 'un', 'dimensionada pelos itens (ocupação ≤ 55 % da placa)'),
    m('Invólucro', 'Placa de montagem em chapa galvanizada 2 mm', `${inv.l - 2 * MARGEM_PLACA / 2} × ${inv.a - MARGEM_PLACA} mm`, 1, 'un', 'uma por caixa'),
    m('Fixação', 'Parafuso sextavado M6 × 16 + arruela lisa e de pressão (placa → espelho da caixa)', 'aço zincado/inox', 4, 'un', '4 pontos, um por canto'),
    m('Fixação', 'Parafuso M4 × 12 + porca e arruela (trilho, canaleta e itens sem trilho)', 'aço zincado', Math.max(12, itens.length * 3 + 6), 'un', '3 por item + 6 para trilhos e canaletas'),
    m('Fixação', 'Bucha S8 + parafuso 6 × 50 (caixa → parede)', 'aço zincado, bucha de nylon', 4, 'un', '4 pontos de fixação (alça da caixa)'),
    m('Fixação', 'Trilho DIN 35 × 7,5 mm', 'aço zincado, furado', trilhoM, 'm', 'largura dos módulos em trilho + 100 mm de folga'),
    m('Fiação', 'Canaleta PVC 25 × 40 mm com tampa', 'cinza, autoextinguível', Math.ceil(cabos * 10) / 10, 'm', 'perímetro da placa + 30 %'),
    m('Fiação', 'Condutor 0,5 a 1,5 mm² flexível, antichama (BWF), cores por função', 'preto/vermelho = alimentação, azul = 0 V/comum, branco = sinal', nFios, 'm', '1 m por ligação estimada (6 por item)'),
    m('Fiação', 'Cabo de interligação (CCI/CI/UTP/coaxial) conforme o sistema', c.cabo_interligacao || 'conforme memorial da skill', Math.max(10, nFios / 2), 'm', 'metade da fiação interna, comprimento a conferir'),
    m('Terminais', 'Borne de passagem sobre trilho 2,5 mm² (entrada/saída de campo)', 'bege; terra verde-amarelo', nBornes, 'un', c.bornes ? 'indicado pela skill' : '4 por item'),
    m('Terminais', 'Terminal tubular pré-isolado (ilhós) 0,5 a 1,5 mm²', 'cores por seção', nFios * 2, 'un', '2 por condutor'),
    m('Terminais', 'Terminal olhal para PE', '4 mm² / M6', 4, 'un', 'barra PE e porta'),
    m('Entrada de cabos', 'Prensa-cabo com contraporca', 'PG 13,5 e PG 21, IP68', Math.max(4, Math.ceil(itens.length / 2)), 'un', 'furos na face inferior, 1 por cabo ou feixe'),
    m('Aterramento', 'Barra de terra PE com 8 furos', 'cobre estanhado, fixada na placa', 1, 'un', 'uma por caixa'),
    m('Aterramento', 'Cordoalha/jumper 4 mm² verde-amarelo (porta e placa → barra PE)', 'comprimento ≤ 300 mm', 2, 'un', 'porta e placa'),
    m('Ventilação', 'Respiro/filtro ou ventilador com filtro (se dissipação > 30 W)', 'IP54', c.dissipacao_w > 30 ? 1 : 0, 'un', 'só quando a dissipação interna passa de 30 W'),
    m('Identificação', 'Anilhas/marcadores de fio (numeração do esquema)', 'branco, letra preta', nFios, 'un', '1 por ponta de fio principal'),
    m('Identificação', 'Abraçadeira de nylon 2,5 × 100 mm', 'preta, UV', Math.max(20, itens.length * 6), 'un', '6 por item'),
    m('Documentação', 'Esquema elétrico e lista de componentes em porta-documentos na porta', 'A4 plastificado', 1, 'un', 'uma por caixa'),
    ...(c.materiais_extra || []),
  ].filter(x => x.quantidade > 0);
}

function plaquetasDaCaixa(c, inv, data) {
  const comando = (f) => ({
    tag: f.tag, texto: f.texto && f.texto.length ? f.texto : [f.tag], largura_mm: f.largura_mm || 40, altura_mm: f.altura_mm || 12,
    material: 'acrílico 2 mm preto gravado a laser', fundo: '#000', letra: '#fff', fixacao: 'adesivo dupla face 3M VHB',
    local: `porta, abaixo do ${f.tipo === 'led' ? 'sinalizador' : f.tipo === 'display' ? 'visor' : 'comando'} ${f.tag}`, quantidade: 1,
  });
  const plaquetas = [
    { tag: 'ID-CAIXA', texto: [c.id, maiusc(c.titulo), c.local ? maiusc(c.local) : ''].filter(Boolean), largura_mm: 120, altura_mm: 40, material: 'acrílico 2 mm preto gravado a laser', fundo: '#000', letra: '#fff', fixacao: 'adesivo dupla face 3M VHB', local: 'porta, no topo, centralizada', quantidade: 1 },
    { tag: 'ADV-ELETRICA', texto: ['PERIGO', 'RISCO DE CHOQUE ELÉTRICO', c.tensao ? `${c.tensao} — DESLIGAR ANTES` : 'DESLIGAR ANTES DE INTERVIR'], largura_mm: 100, altura_mm: 30, material: 'acrílico 2 mm amarelo gravado a laser', fundo: '#ffd400', letra: '#000', fixacao: 'adesivo dupla face 3M VHB', local: 'porta, canto inferior direito (NR-10 10.10 / NBR 5410 6.5.4.10)', quantidade: 1 },
    { tag: 'ADV-BATERIA', texto: ['CAIXA COM BATERIA', 'DESLIGAR A BATERIA ANTES', 'DE QUALQUER INTERVENÇÃO'], largura_mm: 100, altura_mm: 30, material: 'acrílico 2 mm amarelo gravado a laser', fundo: '#ffd400', letra: '#000', fixacao: 'adesivo dupla face 3M VHB', local: 'face interna da porta, junto à bateria', quantidade: 1, so_se: (c.itens || []).some(i => i.tipo === 'bateria') },
    { tag: 'ET-PE', texto: ['PE'], largura_mm: 15, altura_mm: 8, material: 'etiqueta de poliéster verde-amarela', fundo: '#8bc34a', letra: '#000', fixacao: 'adesivo', local: 'barra de terra', quantidade: 1 },
    ...(c.frente || []).map(comando),
    ...(c.plaquetas_extra || []),
  ].filter(x => x.so_se !== false).map(({ so_se, ...x }) => x);
  const plaqueta_hm = {
    modelo: `${c.modeloHm || 'H&M CX'} / ${c.id}`,
    numero_serie: 'a preencher na fabricação (nº da OS)',
    dados: [
      ['Norma', c.normaHm || (c.normas?.[0]?.codigo ?? '')],
      ['Identificação', [c.id, c.titulo].filter(Boolean).join(' — ')],
      ['Dimensões', `${inv.l} × ${inv.a} × ${inv.p} mm · ${c.ip || 'IP54'}`],
      ...(c.tensao ? [['Alimentação', c.tensao]] : []),
      ...(c.dados_placa || []),
      ['Data', data || 'a preencher'],
    ],
    largura_mm: 100, altura_mm: 70, material: 'alumínio anodizado 0,5 mm gravado',
    fixacao: 'adesivo dupla face 3M VHB (sem furar a caixa)', local: 'lateral direita ou face externa inferior da porta',
  };
  return { plaquetas, plaqueta_hm };
}

const SEQUENCIA = [
  'Conferir a caixa recebida (medidas, vedação, fecho, pintura) com este caderno e marcar os furos da placa e da entrada de cabos.',
  'Fixar a placa de montagem, a barra de terra PE e os jumpers da porta; ligar o PE da caixa ao condutor de proteção.',
  'Fixar trilhos, canaletas e itens na posição do desenho da placa; baterias na base, presas por cinta.',
  'Montar fiação interna com as cores e anilhas do esquema; apertar bornes no torque do fabricante.',
  'Instalar comandos e sinalizadores na porta, ligar o cabo de porta (com laço) e fixar as plaquetas e a plaqueta H&M.',
  'Energizar sem os periféricos, conferir tensões, depois ligar o campo e executar as verificações abaixo.',
];

// caixas: array de descrições (ver topo); opts = { dados, sigla, titulo, subtitulo, tag, revisao, data,
// normas, modeloHm, normaHm, verificacoesExtra, secoes, avisos }
function cadernoDeCaixas(caixas, opts = {}) {
  const lista = Array.isArray(caixas) ? caixas : [caixas];
  const dados = opts.dados || {};
  const data = opts.data || (dados.meta?.data ? String(dados.meta.data).slice(0, 10).split('-').reverse().join('/') : '');
  const varios = lista.length > 1;
  const pref = (c, t) => (varios ? `${c.id} · ${t}` : t);
  const partes = lista.map(c0 => {
    const c = { modeloHm: opts.modeloHm, normaHm: opts.normaHm, normas: opts.normas, ...c0 };
    const inv = escolherInvolucro(c);
    const pl = plaquetasDaCaixa(c, inv, data);
    return { c, inv, ...pl, desenhos: [vistaFrontal(c, inv), vistaPlaca(c, inv)], materiais: materiaisDaCaixa(c, inv) };
  });
  const plaquetas = partes.flatMap(p => p.plaquetas.map(x => ({ ...x, tag: varios ? `${x.tag} ${p.c.id}` : x.tag, grupo: varios ? `Plaquetas — ${p.c.id}` : undefined })));
  const componentes = partes.flatMap(p => (p.c.itens || []).map(i => ({
    tag: varios ? `${p.c.id}/${i.tag}` : i.tag, descricao: i.descricao, fabricante: i.fabricante || '—', referencia: i.referencia || '—',
    medidas: i.largura_mm ? `${i.largura_mm} × ${i.altura_mm}${i.profundidade_mm ? ` × ${i.profundidade_mm}` : ''} mm` : '—',
    quantidade: i.quantidade || 1, unidade: i.unidade || 'un', local: i.local || (i.na_placa === false ? 'campo (fora da caixa)' : itemTrilho(i) ? 'trilho DIN' : 'placa'),
    fonte: i.fonte || 'medida típica [CONFERIR]',
  })));
  const verificacoes = partes.flatMap(p => [
    { item: pref(p.c, 'Invólucro'), criterio: `${p.c.ip || 'IP54'}: vedação da porta íntegra, prensa-cabos apertados, fecho com chave, pintura sem falhas`, norma: p.c.normaInvolucro || 'ABNT NBR IEC 60529' },
    { item: pref(p.c, 'Aterramento'), criterio: 'continuidade PE entre porta, placa, barra de terra e condutor de proteção (≤ 0,1 Ω)', norma: 'ABNT NBR 5410 6.4' },
    { item: pref(p.c, 'Fiação'), criterio: 'cores, anilhas e torque conferidos com o esquema; nenhum condutor sem terminal; sem emenda interna', norma: 'boa prática (NBR IEC 61439-1 8.6)' },
    ...(p.c.verificacoes || []),
  ]).concat(opts.verificacoesExtra || []);
  const secoes = [
    ...partes.map(p => ({
      titulo: `${p.c.id} — ${p.c.titulo}`,
      paragrafos: [p.c.funcao, ...(p.c.observacoes || [])].filter(Boolean),
      tabela: { colunas: ['Tag', 'Item', 'L × A (mm)', 'Qtd.', 'Local'], linhas: (p.c.itens || []).map(i => [i.tag, i.descricao, i.largura_mm ? `${i.largura_mm} × ${i.altura_mm}` : '—', String(i.quantidade || 1), i.na_placa === false ? 'campo' : 'caixa']), proporcoes: [0.8, 3.4, 1, 0.5, 0.8] },
    })),
    { titulo: 'Sequência de montagem', marcadores: SEQUENCIA },
    ...(opts.secoes || []),
  ];
  return {
    tipo: 'caixa',
    sigla: opts.sigla || 'CAD-CX',
    titulo: opts.titulo || 'CADERNO DE FABRICAÇÃO E MONTAGEM',
    subtitulo: opts.subtitulo || (varios ? `${lista.length} caixas — ${lista.map(c => c.id).join(', ')}` : `${lista[0].id} — ${lista[0].titulo}`),
    tag: opts.tag || (varios ? `${lista[0].id}…${lista[lista.length - 1].id}` : lista[0].id),
    revisao: opts.revisao || String(dados.meta?.revisao || 'R00').split(' ')[0],
    data, dados,
    normas: opts.normas || [],
    caracteristicas: varios
      ? [['Caixas', String(lista.length)], ...partes.map(p => [p.c.id, `${p.inv.l} × ${p.inv.a} × ${p.inv.p} mm · ${p.c.ip || 'IP54'}`])]
      : [['Identificação', `${partes[0].c.id} — ${partes[0].c.titulo}`], ['Invólucro', `${partes[0].inv.l} × ${partes[0].inv.a} × ${partes[0].inv.p} mm (L × A × P)`], ['Grau de proteção', partes[0].c.ip || 'IP54'], ...(partes[0].c.tensao ? [['Alimentação', partes[0].c.tensao]] : []), ...(partes[0].c.caracteristicas || [])],
    desenhos: partes.flatMap(p => p.desenhos.map(d => ({ ...d, titulo: varios ? d.titulo : d.titulo.replace(`${p.c.id} — `, '') }))),
    componentes,
    materiais_montagem: partes.flatMap(p => p.materiais.map(m => ({ ...m, grupo: pref(p.c, m.grupo) }))),
    plaquetas,
    plaqueta_hm: partes[0].plaqueta_hm,
    plaquetas_hm: partes.map(p => p.plaqueta_hm),
    secoes,
    verificacoes,
    avisos: [
      ...partes.filter(p => p.inv.excede).map(p => `${p.c.id}: os itens passam do maior invólucro padrão (${INVOLUCROS[INVOLUCROS.length - 1].join(' × ')} mm) — dividir em duas caixas ou usar gabinete sob medida. [CONFERIR]`),
      ...partes.flatMap(p => p.c.avisos || []), ...(opts.avisos || []),
      'Medidas dos itens sem catálogo são típicas de mercado; quantidades de material saem por regra (coluna "regra"). Conferir com os modelos comprados antes da montagem. [CONFERIR]',
    ],
  };
}

module.exports = { cadernoDeCaixas, escolherInvolucro, disporItens, INVOLUCROS, vistaFrontal, vistaPlaca, materiaisDaCaixa, plaquetasDaCaixa };
