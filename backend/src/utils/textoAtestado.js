// Limpeza e leitura do texto da nota fiscal para o atestado de capacidade técnica.
// A discriminação das notas vem em CAIXA ALTA, sem acento (e, nas importadas do SYSB1, com letras
// perdidas: "PRESTAO DE SERVIOS"). Aqui o texto vira frase normal, as atividades saem uma por
// linha, agrupadas por disciplina, e os itens com quantidade explícita viram a planilha de
// serviços. Tudo determinístico e sem IA; o engenheiro confere e ajusta na tela antes de baixar.

const semAcento = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '');

// palavras comuns de nota de serviço: chave sem acento → forma correta (também as com letra perdida)
const PALAVRAS = {
  prestacao: 'prestação', prestao: 'prestação', servico: 'serviço', servicos: 'serviços', servio: 'serviço', servios: 'serviços',
  instalacao: 'instalação', instalacoes: 'instalações', instalao: 'instalação', instalaes: 'instalações',
  reinstalacao: 'reinstalação', lancamento: 'lançamento', lancamentos: 'lançamentos',
  eletrica: 'elétrica', eletricas: 'elétricas', eletrico: 'elétrico', eletricos: 'elétricos', eletronica: 'eletrônica', eletronico: 'eletrônico',
  estacao: 'estação', estacoes: 'estações', operacao: 'operação', operacoes: 'operações', operaoes: 'operações',
  video: 'vídeo', vigilancia: 'vigilância', correcao: 'correção', estetica: 'estética', conectorizacao: 'conectorização',
  lampada: 'lâmpada', lampadas: 'lâmpadas', paineis: 'painéis', mao: 'mão', iluminacao: 'iluminação', automacao: 'automação',
  comunicacao: 'comunicação', camera: 'câmera', cameras: 'câmeras', ligacao: 'ligação', ligacoes: 'ligações',
  manutencao: 'manutenção', construcao: 'construção', distribuicao: 'distribuição', alimentacao: 'alimentação',
  protecao: 'proteção', sinalizacao: 'sinalização', sonorizacao: 'sonorização', tecnica: 'técnica', tecnico: 'técnico',
  area: 'área', medicao: 'medição', medicoes: 'medições', execucao: 'execução', demolicao: 'demolição', substituicao: 'substituição',
  fiscalizacao: 'fiscalização', inspecao: 'inspeção', emergencia: 'emergência', deteccao: 'detecção', incendio: 'incêndio',
  seguranca: 'segurança', numero: 'número', monitoramneto: 'monitoramento', tubulacao: 'tubulação', ventilacao: 'ventilação',
  climatizacao: 'climatização', predio: 'prédio', predios: 'prédios', edificio: 'edifício', edificios: 'edifícios', condominio: 'condomínio',
  residencia: 'residência', subestacao: 'subestação', conexao: 'conexão', conexoes: 'conexões', portao: 'portão', portoes: 'portões', sao: 'São', luis: 'Luís', vitoria: 'Vitória', brasilia: 'Brasília', goiania: 'Goiânia',
  maceio: 'Maceió', belem: 'Belém', macapa: 'Macapá', cuiaba: 'Cuiabá', florianopolis: 'Florianópolis', joao: 'João', paulo: 'Paulo',
};

const SIGLAS = new Set(['spda', 'nvr', 'cpu', 'cpus', 'dnit', 'led', 'leds', 'rj45', 'df', 'ps', 'ccn', 'dvr', 'cftv', 'art', 'rrt', 'ti', 'pdu', 'ups', 'dps', 'hdmi', 'wifi', 'poe', 'usb', 'tv', 'gps', 'sinapi']);
const SIGLA_FORMA = { cpus: 'CPUs', leds: 'LEDs' };
const UFS = new Set(['ac', 'al', 'ap', 'am', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mt', 'ms', 'mg', 'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'sp', 'se', 'to']);
const CIDADES = new Set(['são luís', 'fortaleza', 'vitória', 'contagem', 'feira de santana', 'brasília', 'taguatinga', 'goiânia', 'belo horizonte', 'salvador',
  'recife', 'natal', 'teresina', 'joão pessoa', 'maceió', 'aracaju', 'belém', 'macapá', 'manaus', 'boa vista', 'porto velho', 'rio branco', 'palmas',
  'cuiabá', 'campo grande', 'curitiba', 'florianópolis', 'porto alegre', 'são paulo', 'rio de janeiro', 'ceilândia', 'samambaia', 'gama', 'planaltina', 'sobradinho']);

const ehCaixaAlta = (t) => {
  const letras = String(t).match(/\p{L}/gu) || [];
  if (letras.length < 8) return false;
  const altas = letras.filter(c => c !== c.toLowerCase()).length;
  return altas / letras.length > 0.8;
};

const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Devolve o texto com acento nas palavras conhecidas e, se veio em caixa alta, em frase normal.
function normalizarTexto(bruto) {
  let t = String(bruto ?? '').replace(/\r/g, '').replace(/[ \t]+/g, ' ');
  const caixaAlta = ehCaixaAlta(t);
  if (caixaAlta) t = t.toLowerCase();
  // palavras conhecidas (só as que ainda não têm acento); mantém siglas e códigos com número/hífen
  t = t.replace(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu, (w) => {
    const baixa = w.toLowerCase();
    if (/[\d-]/.test(w)) return caixaAlta ? w.toUpperCase() : w;
    if (SIGLAS.has(baixa)) return SIGLA_FORMA[baixa] || baixa.toUpperCase();
    if (UFS.has(baixa) && w === w.toUpperCase() && w.length === 2) return w; // sigla de estado já em maiúscula
    if (PALAVRAS[baixa] && baixa === semAcento(baixa)) return PALAVRAS[baixa];
    return caixaAlta ? baixa : w;
  });
  // nome de cidade depois de "em": capitaliza e deixa a sigla do estado em maiúscula
  t = t.replace(/\b(em) ((?:\p{L}+ ?){1,4}?)(?=[,;.\n]|$)/giu, (todo, em, lugar) => {
    const palavras = lugar.trim().split(/\s+/);
    const ultima = palavras[palavras.length - 1].toLowerCase();
    const comUf = palavras.length > 1 && UFS.has(ultima);
    const cidade = (comUf ? palavras.slice(0, -1) : palavras).join(' ').toLowerCase();
    if (!comUf && !CIDADES.has(cidade)) return todo;
    const nome = cidade.split(' ').map(p => (['de', 'da', 'do', 'dos', 'das'].includes(p) ? p : capitalizar(p))).join(' ');
    return `${em} ${nome}${comUf ? ` ${ultima.toUpperCase()}` : ''}`;
  });
  return t.trim();
}

// Grupos (disciplinas) por palavra-chave, na ordem; a primeira que casar vale.
const GRUPOS = [
  ['Proteção contra descargas atmosféricas (SPDA)', /\bspda\b|para-?raios|captador|cordoalha|aterramento/],
  ['Segurança eletrônica e monitoramento', /c[aâ]mera|\bnvr\b|\bdvr\b|cftv|vigil[aâ]ncia|v[ií]deo|alarme|controle de acesso|sensor/],
  ['Rede de dados e cabeamento estruturado', /\brede\b|rj-?45|cabeamento estruturado|patch|\brack\b|conectoriza|computador/],
  ['Automação', /automa[cç][aã]o/],
  ['Instalações elétricas e iluminação', /el[eé]tric|quadro|painel|painéis|paineis|tomada|ilumina|l[aâ]mpada|\bled|luminária|luminaria|cabos?\b|infraestrutura|eletroduto|disjuntor|letreiro/],
  ['Mobiliário e equipamentos', /esta[cç][aã]o de trabalho|monitor|\bcpu|mesa|cadeira|equipamento|nobreak/],
];
const GRUPO_PADRAO = 'Serviços executados';

function grupoDaAtividade(texto) {
  const t = String(texto).toLowerCase();
  for (const [nome, re] of GRUPOS) if (re.test(t)) return nome;
  return GRUPO_PADRAO;
}

const PREFIXOS = /^(constando( de| com)?|presta[cç][aã]o de servi[cç]os?( de| para)?|servi[cç]os? de|fornecimento e)\s+/i;

// "04 estações" → "4 estações" (zero à esquerda de contagem) e espaços duplos
const limparAtividade = (a) => capitalizar(String(a).trim().replace(PREFIXOS, '').replace(/\b0+(\d)\b(?![,.]\d)/g, '$1').replace(/\s+/g, ' ').replace(/^[-–•*\s]+|[.\s]+$/g, '').trim());

// Referência do pedido/contrato escrita na nota ("PEDIDO: CCN 9254")
function extrairPedido(texto) {
  const m = /^\s*(?:pedido|contrato)\s*:?\s*(.+)$/im.exec(String(texto));
  return m ? { pedido: m[1].trim(), resto: String(texto).replace(m[0], '') } : { pedido: null, resto: String(texto) };
}

// Atividades: uma por linha/marcador/ponto e vírgula; frase corrida separa por vírgula (menos nas
// vírgulas decimais, "2,5 mm"). Devolve [{ grupo, texto }] já limpas.
function atividadesDaNota(discriminacao) {
  const { pedido, resto } = extrairPedido(discriminacao);
  const texto = normalizarTexto(resto);
  const brutas = [];
  for (const linha of texto.split(/\n+|;|\.(?=\s|$)/)) {
    for (const f of linha.split(/,(?!\d)/)) {
      // "…lateral, com correção…" continua a atividade anterior
      if (brutas.length && /^\s*(com|sem|para|inclusive|incluindo|conforme)\b/i.test(f)) brutas[brutas.length - 1] += `,${f}`;
      else brutas.push(f);
    }
  }
  const pecas = brutas.map(limparAtividade).filter(x => x.length > 1);
  const vistos = new Set();
  const atividades = [];
  for (const p of pecas) {
    const chave = p.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    atividades.push({ grupo: grupoDaAtividade(p), texto: p });
  }
  return { atividades, pedido };
}

// Atividades agrupadas ({ grupo, itens[] }), na ordem em que cada grupo apareceu.
function agrupar(atividades) {
  const grupos = [];
  for (const a of atividades) {
    let g = grupos.find(x => x.grupo === a.grupo);
    if (!g) { g = { grupo: a.grupo, itens: [] }; grupos.push(g); }
    g.itens.push(a.texto);
  }
  return grupos;
}

const NAO_CONTAVEIS = /^(mm|cm|m|km|kva|kw|kwh|v|a|w|hz|ah|ma|mw|db|dbm|u|gb|tb|mb|mhz|ghz|polegadas?|pol|dias?|meses|mês|anos?|vezes|x|%)$/i;
const NUM_PONTO = /(?<![\p{L}\d,.-])(\d{1,6})(?![\d]|[,.]\d)\s+(\p{L}{3,})/u;

// Item da planilha: só quando a atividade traz a quantidade escrita ("580 pontos de rede RJ45");
// nada é calculado nem estimado. Unidade: "pt" para pontos, senão "un".
function itemDePlanilha(texto) {
  const m = NUM_PONTO.exec(texto);
  if (!m || NAO_CONTAVEIS.test(m[2])) return null;
  const quantidade = Number(m[1]);
  if (!quantidade) return null;
  const unidade = /^pontos?$/i.test(m[2]) ? 'pt' : 'un';
  return { descricao: texto, unidade, quantidade };
}

const numeroBR = (n) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Texto editável de atividades:  "Grupo:" numa linha e uma atividade por linha abaixo.
function atividadesParaTexto(grupos) {
  return grupos.map(g => `${g.grupo}:\n${g.itens.join('\n')}`).join('\n\n');
}
function atividadesDoTexto(texto) {
  const grupos = [];
  let atual = null;
  for (const bruta of String(texto ?? '').split(/\r?\n/)) {
    const l = bruta.replace(/\s+/g, ' ').trim().replace(/^\d+[.)]\s+/, '').replace(/[;.]$/, '').trim();
    if (!l) continue;
    if (/:$/.test(l)) { atual = { grupo: l.slice(0, -1).trim().slice(0, 120), itens: [] }; grupos.push(atual); continue; }
    if (!atual) { atual = { grupo: GRUPO_PADRAO, itens: [] }; grupos.push(atual); }
    atual.itens.push(l.slice(0, 300));
  }
  return grupos.filter(g => g.itens.length).slice(0, 12).map(g => ({ ...g, itens: g.itens.slice(0, 40) }));
}

// Texto editável da planilha: "Grupo:" e linhas "descrição | un 4" (unidade antes do número).
function planilhaParaTexto(grupos) {
  return grupos.map(g => `${g.grupo}:\n${g.itens.map(i => `${i.descricao} | ${i.unidade} ${numeroBR(i.quantidade)}`).join('\n')}`).join('\n\n');
}
function planilhaDoTexto(texto) {
  const grupos = [];
  let atual = null;
  for (const bruta of String(texto ?? '').split(/\r?\n/)) {
    const l = bruta.replace(/\s+/g, ' ').trim();
    if (!l) continue;
    if (/:$/.test(l) && !l.includes('|')) { atual = { grupo: l.slice(0, -1).trim().slice(0, 120), itens: [] }; grupos.push(atual); continue; }
    const [desc, qtd = ''] = l.split('|').map(x => x.trim());
    if (!desc) continue;
    if (!atual) { atual = { grupo: GRUPO_PADRAO, itens: [] }; grupos.push(atual); }
    const q = /^(\p{L}{1,6})?\s*([\d.]+(?:,\d+)?)?$/u.exec(qtd);
    const numero = q && q[2] ? Number(q[2].replace(/\./g, '').replace(',', '.')) : null;
    atual.itens.push({ descricao: desc.slice(0, 300), unidade: (q && q[1]) || 'un', quantidade: Number.isFinite(numero) ? numero : null });
  }
  return grupos.filter(g => g.itens.length).slice(0, 30).map(g => ({ ...g, itens: g.itens.slice(0, 300) }));
}

// Planilha sugerida a partir das atividades com quantidade escrita
function planilhaDasAtividades(grupos) {
  const saida = [];
  for (const g of grupos) {
    const itens = g.itens.map(itemDePlanilha).filter(Boolean);
    if (itens.length) saida.push({ grupo: g.grupo, itens });
  }
  return saida;
}

module.exports = {
  normalizarTexto, atividadesDaNota, agrupar, grupoDaAtividade, itemDePlanilha, numeroBR, GRUPO_PADRAO,
  atividadesParaTexto, atividadesDoTexto, planilhaParaTexto, planilhaDoTexto, planilhaDasAtividades,
};
