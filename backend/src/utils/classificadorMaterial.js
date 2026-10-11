// Regras de palavras-chave para a categoria de um material. É uma das etapas
// da classificação automática (services/classificacaoMateriais.js), que antes
// tenta o NCM e o material mais parecido já classificado no catálogo, e por
// último pergunta à IA. As categorias seguem as que a H&M usa no catálogo.
// A ordem importa: vale a primeira que casar (as mais específicas primeiro).
const CATEGORIAS = [
  {
    nome: 'EPI',
    regex: /\bepi\b|\bbotina\b|\bcapacete\b|\b[oó]culos\b|protetor auditivo|\bcolete\b|cinto de seguran[cç]a|\btalabarte\b|\bluvas? (de )?(seguran[cç]a|prote[cç][aã]o|vaqueta|raspa|nitr[ií]lica|l[aá]tex|flextactil)/i,
  },
  {
    // Componentes elétricos inequívocos vêm antes de CFTV e Ferragens: nas
    // cotações de painel (ex.: ECO/Siemens) "RELE ... PARAFUSO" caía em
    // Ferragens e "CONTATOR DE ALARME" em CFTV.
    nome: 'Elétrica',
    regex: /\b(mini)?disjuntor|\bcontator|\brel[ée]\b|bloco de contato|contato auxiliar|\bfus[ií]vel|\bcomutador|\bsinaleiro|multimedidor|\btransformador|\bdps\b|seccionadora|chave seletora|inversor de frequ[eê]ncia|soft.?starter|\bbotoeira|montagem de quadro/i,
  },
  {
    nome: 'Redes / Cabeamento Estruturado',
    regex: /\bswitch\b|patch ?panel|pacth ?panel|patch ?cord|\brack\b|keystone|\brj ?-?45\b|\butp\b|\bcat\.? ?[56]e?\b|fibra [oó]ptica|roteador|access? point|\bap wi-?fi\b|firewall|\bservidor\b|conversor de m[ií]dia|\bgbic\b|\bsfp\b|bandeja fixa|organizador de cabo|\bvelcro\b/i,
  },
  {
    nome: 'Automação',
    regex: /\bsmart\b|wi-?fi.{0,30}\b(interruptor|tomada|dimmer)|\b(interruptor|tomada|dimmer)\b.{0,40}wi-?fi|zigbee|\bknx\b|\balexa\b|automa[cç][aã]o|controlador (ddc|program[aá]vel)|\bbacnet\b|supervis[oó]rio/i,
  },
  {
    nome: 'Alarme',
    regex: /central de alarme|\balarme\b|\bsirene\b|\bivp\b|sensor (iv|infravermelho|magn[eé]tico|de movimento|movimento|de abertura|de presen[cç]a s\/fio)|infravermelho passivo|teclado xat|cerca el[eé]trica|eletrificador|\brep \d{3,4}\b|\bxas \d/i,
  },
  {
    nome: 'Controle de acesso',
    regex: /controle de acesso|controlador(a)? de acesso|\bcatraca|\bfacial\b|fechadura (solen[oó]ide|eletro|magn)|eletro-?[ií]m[aã]|biometria|leitor biom|acionador de abertura|bot[aã]o de sa[ií]da|\bfail.?safe\b/i,
  },
  {
    nome: 'Interfonia',
    regex: /interfone|porteiro|videoporteiro|\bpabx\b|central (cp|telef|pabx)|\bramais\b|ap\.? ?tel\b|aparelho telef|terminal (de portaria|dedicado)|\bcabo ci\b|engate r[aá]pido|\bbloco (idc|bli|m10)|\brj ?-?11\b/i,
  },
  {
    nome: 'Sonorização',
    regex: /sonoriza|\bjbl\b|caixa (de som|ac[uú]stica)|amplif(icador)?\.? (de [aá]udio|class)|\bmicrofone|arandela ac[uú]stica|\bmixer\b/i,
  },
  {
    nome: 'Nobreaks',
    regex: /no-?break|\bups\b/i,
  },
  {
    nome: 'CFTV',
    regex: /\bcftv\b|c[aâ]mera|\bdvr\b|\bnvr\b|gravador (dig|de v[ií]deo)|wd purple|skyhawk|hard disk|\bhd \d+ ?tb|disco r[ií]g|seguran[cç]a eletr[oô]nica|cart[aã]o de mem[oó]ria|micro ?sd|fonte a?ut\.? ac\/dc/i,
  },
  {
    nome: 'Antena coletiva',
    regex: /\bantena|coaxial|\brg-?(6|59|11)\b|\bsplitters?\b|divisor(es)? (de sinal|coaxial|tv)|distribuidor de tv|amplificador de sinal \/ distribuidor/i,
  },
  {
    nome: 'Informatica',
    regex: /webcam|v[ií]deo ?confer|notebook|computador|\bmonitor (led|lcd|\d)|\bmouse\b|impressora|\bssd\b/i,
  },
  {
    nome: 'Ferramentas',
    regex: /\balicate\b|\bserra\b|n[ií]vel (mao|de m[aã]o)|\bprumo\b|chave de fenda|chave phillips|chave allen|furadeira|parafusadeira|\btrena\b|esquadro|\bbroca\b|suporte fixa[cç][aã]o|fita dupla face|\bvhb\b|marreta|talhadeira|disco (de )?corte|\bestilete/i,
  },
  {
    nome: 'Infraestrutura',
    regex: /eletroduto|duto corrugado|canaleta|caixa (de )?passagem|caixa \dx\d|aterramento|\bhaste\b|cordoalha|passa ?fio|caixa de inspe[cç][aã]o|abra[cç]adeira|leito(s)? (de|p\/?) ?cabos|bandejamento|eletrocalha|\bgalv\b|condulete|\bbox reto\b|luva de emenda|caixa mult|tampa petrolete|\bcopex\b|\bespiral\b|spiral ?tube|zincado|caixa de montagem|\bpvc\b|\btamp[aã]o\b|\btampa\b.*cega|\bveneziana\b|\bventoinha\b|\bventilador\b|\bcotovelo\b/i,
  },
  {
    nome: 'Ferragens',
    regex: /\bparafuso\b|\bporca\b|\barruela\b|\brebite\b|\bprego\b|\bbucha\b/i,
  },
  {
    nome: 'Elétrica',
    regex: /disjuntor|contator|interruptor|tomada|cabo flex[ií]vel|cabo de alimenta[cç][aã]o|cabo de inc[eê]ndio|terminal pr[ée] ?isol|\bfio\b|\bdimmer\b|programador hor[aá]rio|quadro|\bdps\b|\brel[ée]\b|lumin[aá]ria|\blampada\b|\breator\b|^cb\b|\banilha\b|protetor (de )?surto|\bbarramento\b|\bbot[aã]o\b|bloco de contato|\bqdo\b|sinal led|fita isolante|painel led|\blux\b.*\bmod\b|trilho perf|prensa ?cabo|conector gen[eé]rico|cabo de cobre|cabo (solar|fotovoltaico|pp)|m[oó]dulo fotovoltaico|inversor (on-?grid|solar|fotovoltaico)|conectores? mc4|string ?box|placa de advert[eê]ncia/i,
  },
];

// Só classifica quando alguma palavra-chave bate — nunca força um material em
// categoria errada só para não ficar em branco.
function classificarPorDescricao(descricao) {
  const texto = String(descricao || '');
  for (const categoria of CATEGORIAS) {
    if (categoria.regex.test(texto)) return categoria.nome;
  }
  return null;
}

module.exports = { classificarPorDescricao };
