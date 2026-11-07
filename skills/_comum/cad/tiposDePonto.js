// Tipos de ponto de TODAS as disciplinas — um classificador só para a análise do
// projeto, o 3D e o orçamento (pedido do usuário em 01/11/2026: "tudo tem que ser
// padrão na forma de análise, se adaptando apenas a cada norma da disciplina").
// Antes eram quatro listas com regras diferentes (o DOME do CFTV, a altura da
// tomada alta 1,6 × 2,0 m, "h=8" em cm num lugar e em m noutro).
//
// [layer, texto (legenda, descrição do bloco), símbolo do 3D, disciplina]. A layer diz o
// tipo quando o nome é claro; o TEXTO da legenda ao lado do símbolo diz quando a layer é
// genérica ("SIMBOLOS", "INC-PONTOS"). A ordem importa: o mais específico antes
// (emergência antes de luminária; rede/TV/telefone e quadro antes de tomada).
const TIPOS = [
  // Sensor de PRESENÇA (06/11/2026): "Detector de presença de teto" e a layer EL-DETECTOR-PRESENCA caíam no
  // detector de fumaça (incêndio) pela linha DETEC abaixo, e o sensor da layer de ALARME ("ALM-SENSOR") ia para a
  // iluminação. O de alarme (layer ALM-/ALARME-, ou "IVP"/"alarme" no texto) é o IVP; o resto é o da iluminação.
  [/^(ALM|ALARME?|INTRUS[ÃA]O)[-_ ](?!.*MAGN).*(SENSOR|PRESEN|DETEC)/i, /^(?=.*(alarme|intrus|\bivp\b)).*(sensor|detector)\s+de\s+(presen[çc]a|movimento)/i, 'HM-ALM-IVP', 'alarme'],
  [/(DETEC|SENSOR).{0,12}PRESEN|PRESEN[ÇC]A/i, /^(?!.*(alarme|intrus|\bivp\b|infraverm)).*(sensor|detector)\s+de\s+presen[çc]a/i, 'HM-ILU-SENSOR', 'iluminacao'],
  [/EMERG|BALIZ|ACLAR/i, /(lumin[áa]ria|ilumina[çc][ãa]o|bloco|l[âa]mpada).{0,40}emerg|bloco aut[ôo]nomo|balizamento|aclaramento/i, 'HM-INC-EMERGENCIA', 'incendio'],
  [/DETEC.{0,12}(TEMP|TERM)/i, /detector.{0,30}(temperatura|t[ée]rmic|termovelo)/i, 'HM-INC-DETECTOR-TEMP', 'incendio'],
  [/DETEC|FUMA[ÇC]/i, /detector|fuma[çc]a/i, 'HM-INC-DETECTOR-FUMACA', 'incendio'],
  [/ACION/i, /acionador manual|botoeira.{0,20}inc[êe]ndio/i, 'HM-INC-ACIONADOR', 'incendio'],
  [/AVISAD|AUDIOVIS|^(INC|PCI)[-_ ].*SIREN/i, /avisador|audiovisual|sirene.{0,20}inc[êe]ndio/i, 'HM-INC-AVISADOR', 'incendio'],
  [/^(INC|PCI)[-_ ].*CENTRAL|CENTRAL.{0,12}INC/i, /central.{0,30}inc[êe]ndio/i, 'HM-INC-CENTRAL', 'incendio'],
  [/C[ÂA]MERA|CFTV/i, /c[âa]mera|cftv|(?<![a-z])dome|bullet/i, 'HM-CFTV-CAMERA', 'cftv'],
  [/RACK/i, /\brack\b/i, 'HM-CAB-RACK', 'rede'],
  // (layer "CAB-AP" e o modelo "AP 3000 AX" na legenda: no R04 o AP saía como ponto de rede — fase 3, 02/11/2026)
  [/WI.?FI|ACCESS.?POINT|(^|[-_ ])AP([-_ ]|$)/i, /access.?point|ponto de acesso.{0,10}(sem fio|wi)|wi.?fi|\bAP\s?\d{3,4}\s?(AX|AC|N)\b/i, 'HM-CAB-AP', 'rede'],
  [/(^|[-_ ])(REDE|L[ÓO]GICA|DADOS|RJ.?45|CAB)([-_ ]|$)/i, /(ponto|tomada).{0,15}(rede|l[óo]gica|dados)|l[óo]gica|rj.?45|cat\.?\s?6/i, 'HM-CAB-PONTO-REDE', 'rede'],
  [/PORTEIRO/i, /porteiro/i, 'HM-TEL-PORTEIRO', 'telefonia'],
  [/^TEL[-_ ]|TELEF|INTERF/i, /telef[ôo]n|telefone|interfon|ramal/i, 'HM-TEL-PONTO', 'telefonia'],
  [/^ANT[-_ ]|ANTENA|(^|[-_ ])TV([-_ ]|$)/i, /antena|(ponto|tomada).{0,10}(de )?tv\b|coaxial/i, 'HM-ANT-PONTO', 'antena'],
  [/LEITOR/i, /leitora?\b|biom[ée]tri|facial|controle de acesso/i, 'HM-ACE-LEITOR', 'controle-acesso'],
  [/FECHAD|ELETRO[IÍ]M/i, /fechadura|eletro[íi]m[ãa]|fecho el[ée]tr/i, 'HM-ACE-FECHADURA', 'controle-acesso'],
  [/BOTOEIRA/i, /botoeira/i, 'HM-ACE-BOTOEIRA', 'controle-acesso'],
  [/CATRACA/i, /catraca|torniquete/i, 'HM-ACE-CATRACA', 'controle-acesso'],
  [/\bIVP\b|INFRAV/i, /\bivp\b|infravermelho|sensor de alarme/i, 'HM-ALM-IVP', 'alarme'],
  [/MAGN[EÉ]T/i, /magn[ée]tico/i, 'HM-ALM-MAGNETICO', 'alarme'],
  [/TECLADO/i, /teclado/i, 'HM-ALM-TECLADO', 'alarme'],
  [/SIREN/i, /sirene/i, 'HM-ALM-SIRENE', 'alarme'],
  [/^ALM[-_ ].*CENTRAL|CENTRAL.{0,12}ALARM/i, /central.{0,20}alarme/i, 'HM-ALM-CENTRAL', 'alarme'],
  [/CAPTOR|FRANKLIN|TERMINAL.?A[ÉE]REO/i, /captor|franklin|terminal a[ée]reo/i, 'HM-SPDA-CAPTOR', 'spda'],
  [/DESCIDA/i, /descida/i, 'HM-SPDA-DESCIDA', 'spda'],
  [/INSPE[ÇC]|HASTE/i, /caixa de inspe[çc]|haste/i, 'HM-SPDA-CAIXA-INSPECAO', 'spda'],
  [/CARREG|WALLBOX|^VE[-_ ]/i, /carregador|wallbox|recarga/i, 'HM-VE-CARREGADOR', 'veicular'],
  [/INVERSOR/i, /inversor/i, 'HM-SOL-INVERSOR', 'solar'],
  [/SENSOR/i, /sensor de presen[çc]a/i, 'HM-ILU-SENSOR', 'iluminacao'],
  [/PONTO.?(DE.?)?LUZ/i, /ponto de luz/i, 'HM-ELE-PONTO-LUZ', 'eletrica'],
  // (a layer "ILUMINAÇÃO" sozinha não diz o aparelho: "EL-ILUMINACAO-INTERRUPTORES", "EL-QUADRO-ILUMINACAO" e
  // "ILUMINACAO-POSTES" saíam como luminária porque "ILUMINA" contém "LUMIN" — 06/11/2026. Agora o LUMIN da
  // layer não vale dentro de "ILUMINA"; a layer só de iluminação continua luminária pela última linha da tabela)
  [/L[ÂA]MP|(?<!I)LUMIN|REFLET|PROJETOR|ARANDELA|PLAFON/i, /lumin[áa]ria|l[âa]mpada|arandela|plafon|refletor|projetor|spot\b|pendente|downlight/i, 'HM-ILU-LUMINARIA', 'iluminacao'],
  [/POSTE/i, /poste/i, 'HM-ILU-POSTE', 'iluminacao-externa'],
  [/QUADRO/i, /quadro|\bq[dg][a-z]*\b|\bql\b/i, 'HM-ELE-QUADRO', 'eletrica'],
  [/TOMAD/i, /tomada|for[çc]a|chuveiro/i, 'HM-ELE-TOMADA-BAIXA', 'eletrica'],
  [/INTERRUP/i, /interruptor/i, 'HM-ELE-INTERRUPTOR', 'eletrica'],
  // layer de iluminação sem outro aparelho no nome ("EL-ILUMINACAO"): luminária — só pela layer (o texto nunca casa)
  [/ILUMINA/i, /(?!)/, 'HM-ILU-LUMINARIA', 'iluminacao'],
];
// família do tipo (a altura muda a tomada baixa/média/alta, não o tipo)
const familia = (simbolo) => (simbolo || '').replace(/-(BAIXA|MEDIA|ALTA)$/, '');
const tipoPelaLayer = (layer) => TIPOS.find(([rl]) => rl.test(layer || ''));
const tipoPeloTexto = (texto) => TIPOS.find(([, rt]) => rt.test(texto || ''));

// Altura escrita: "2,20m do piso", "H=0,30", "h: 1,10 m", "altura: 97,5 cm". Sem unidade, acima
// de 10 é cm ("h=30") e até 10 é metro ("h=2,2", poste "h=8"). O leitor é o de ./textoCad.js —
// o mesmo da análise do DWG (disciplinasCad.alturaDoTexto) e das notas do mapa (pontosDoDesenho)
const { metros, alturaEscrita, RE_ALTURA_PISO, RE_ALTURA_H } = require('./textoCad');

// tomada pela altura (a peça do 3D e o nome do tipo): o meio entre as alturas típicas
// (0,30 / 1,10 / 2,20 m) — baixa até 0,6 m, média até 1,6 m, alta acima
const tomadaPelaAltura = (h) => (h >= 1.6 ? 'HM-ELE-TOMADA-ALTA' : h >= 0.6 ? 'HM-ELE-TOMADA-MEDIA' : 'HM-ELE-TOMADA-BAIXA');
// pontos de parede (a nota "altura: …" ao lado vale para eles)
const DE_PAREDE = /TOMADA|INTERRUPTOR|ELE-PONTO$|ACIONADOR|LEITOR|BOTOEIRA|TECLADO|PORTEIRO|PONTO-REDE|TEL-PONTO|ANT-PONTO|CARREGADOR|QUADRO|AVISADOR|SIRENE/;

// descrição de um componente (bloco do DWG, linha da legenda do PDF) → símbolo do 3D
function simboloDaDescricao(descricao) {
  const d = String(descricao || '');
  // "Tomada 2P+T — circuito QD1-3": é tomada (o QD é do circuito), salvo tomada de rede/TV/telefone
  const tomada = /\btomada\b/i.test(d) && !/tomada.{0,12}(rede|l[óo]gica|dados|tv\b|telef|coaxial)/i.test(d);
  const t = tomada ? TIPOS.find(x => x[2] === 'HM-ELE-TOMADA-BAIXA') : tipoPeloTexto(d);
  if (!t) return null;
  if (t[2] !== 'HM-ELE-TOMADA-BAIXA') return t[2];
  if (/tomada\s+alta/i.test(d)) return 'HM-ELE-TOMADA-ALTA';
  if (/tomada\s+m[ée]dia/i.test(d)) return 'HM-ELE-TOMADA-MEDIA';
  const h = alturaEscrita(d);
  return h ? tomadaPelaAltura(h) : 'HM-ELE-TOMADA-BAIXA';
}

module.exports = { TIPOS, familia, tipoPelaLayer, tipoPeloTexto, metros, alturaEscrita, tomadaPelaAltura, DE_PAREDE, simboloDaDescricao, RE_ALTURA_PISO, RE_ALTURA_H };
