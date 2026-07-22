const CATEGORIAS = [
  {
    nome: 'EPI',
    regex: /\bepi\b|\bbotina\b|\bcapacete\b|\b[oó]culos\b|protetor auditivo|\bcolete\b|cinto de seguran[cç]a|\btalabarte\b|\bluva(s)? de (seguran[cç]a|prote[cç][aã]o|vaqueta|raspa|nitr[ií]lica|latex)\b/i,
  },
  {
    nome: 'CFTV',
    regex: /\bcftv\b|c[aâ]mera|\bdvr\b|\bnvr\b|central de alarme|\balarme\b|\bsirene\b|sensor iv|infravermelho passivo|cerca el[ée]trica|controle de acesso|biometria|interfone|videoporteiro|seguran[cç]a eletr[oô]nica|cart[aã]o de mem[oó]ria|micro ?sd|cabo coaxial|fonte a?ut\.? ac\/dc/i,
  },
  {
    nome: 'Redes / Cabeamento Estruturado',
    regex: /\bswitch\b|patch ?panel|patch ?cord|\brack\b|keystone|\brj-?45\b|\butp\b|\bcat ?[56]\b|fibra [oó]ptica|roteador|access point|\bap wi-?fi\b|firewall|\bservidor\b|conversor de m[ií]dia/i,
  },
  {
    nome: 'Ferramentas',
    regex: /\balicate\b|\bserra\b|n[ií]vel (mao|de m[aã]o)|\bprumo\b|chave de fenda|chave phillips|chave allen|furadeira|parafusadeira|\btrena\b|esquadro|\bbroca\b|suporte fixa[cç][aã]o|fita dupla face|\bvhb\b|marreta|talhadeira/i,
  },
  {
    nome: 'Ferragens',
    regex: /\bparafuso\b|\bporca\b|\barruela\b|\brebite\b|\bprego\b|\bbucha\b/i,
  },
  {
    nome: 'Infraestrutura',
    regex: /eletroduto|duto corrugado|canaleta|caixa (de )?passagem|caixa \dx\d|aterramento|\bhaste\b|cordoalha|passa ?fio|caixa de inspe[cç][aã]o|abra[cç]adeira|leito(s)? (de|p\/?) ?cabos|bandejamento|eletrocalha|\bgalv\b|condulete|\bbox reto\b|luva de emenda|caixa mult|tampa petrolete|\bcopex\b|\bespiral\b|spiral ?tube|zincado|caixa de montagem|\bpvc\b|\btamp[aã]o\b|\btampa\b.*cega|\bveneziana\b|\bventoinha\b|\bventilador\b|\bcotovelo\b/i,
  },
  {
    nome: 'Elétrica',
    regex: /disjuntor|contator|interruptor|tomada|cabo flex[ií]vel|cabo de alimenta[cç][aã]o|cabo de inc[eê]ndio|terminal pr[ée] ?isol|\bfio\b|\bdimmer\b|programador hor[aá]rio|quadro|\bdps\b|\brel[ée]\b|lumin[aá]ria|\blampada\b|\breator\b|^cb\b|\banilha\b|protetor (de )?surto|\bbarramento\b|\bbot[aã]o\b|bloco de contato|\bqdo\b|sinal led|fita isolante|painel led|\blux\b.*\bmod\b|trilho perf|prensa ?cabo|conector gen[eé]rico/i,
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
