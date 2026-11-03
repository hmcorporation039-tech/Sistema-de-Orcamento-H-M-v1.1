// Disciplina de um MATERIAL (treino com as planilhas e orçamentos do acervo, 03/11/2026: "o sistema sempre aprenda
// por disciplinas"). Ordem:
//   1. palavras próprias de uma disciplina na descrição ("detector de fumaça" é incêndio, "captor" é SPDA,
//      "evaporadora" é climatização) — vale mesmo numa lista de outra disciplina;
//   2. item de obra que não é instalação nossa (drywall, porta, piso, louça, tubo de esgoto…): nenhuma;
//   3. a categoria do catálogo (Elétrica, CFTV…, a mesma da classificação do material); a infraestrutura
//      (eletroduto, eletrocalha) fica com a disciplina da lista de onde veio — a do CFTV é do CFTV;
//   4. material de apoio (parafuso, bucha, EPI, ferramenta) ou que o catálogo ainda não sabe classificar: a
//      disciplina do arquivo/aba de onde veio (a lista de materiais da elétrica é de elétrica).
// Sem nenhuma, null: o material não entra no aprendizado (não se sabe de que instalação é).
// Função pura.
const PROPRIAS = [
  ['incendio', /detector(es)? (de |[óo]ptico )?(fuma[cç]a|temperatura|termovelocim|chama|g[aá]s)|acionador(es)? manua|avisador(es)? (a[uú]dio|sonoro|visual)|sirene audiovisual|central (de )?(alarme )?(de )?(detec[cç][aã]o )?(de )?inc[eê]ndio|ilumina[cç][aã]o de emerg|lumin[aá]ria(s)? de emerg|bloco aut[oô]nomo|placa fotolumin|sinaliza[cç][aã]o (de )?emerg|m[oó]dulo isolador|\bSDAI\b|cabo (de |para )?(alarme de )?inc[eê]ndio/i],
  ['spda', /\bSPDA\b|para-?raios? (tipo )?franklin|\bcaptor|terminal a[eé]reo|cordoalha (de )?cobre nu|cabo (de )?cobre nu|barra chata (de )?alum|conector (de )?medi[cç][aã]o|caixa de (inspe[cç][aã]o|equaliza[cç][aã]o) (de )?(aterramento|spda)?|\bBEP\b|haste (de )?(aterramento|cobreada|copperweld|terra)|solda exot[eé]rmica|fita de alum[ií]nio/i],
  ['pressurizacao', /pressuriza[cç]|damper de al[ií]vio|registro de sobrepress/i],
  ['climatizacao', /\bsplit\b|evaporadora|gabinete de ar|\bar externo|\bcassete|hi-?wall|piso[- ]teto|fancolete|condensadora|ar[- ]condicionado|\bVRF\b|\bVRV\b|fan-?coil|\bchiller|tubo (de )?cobre|isolamento (t[eé]rmico|elastom)|elastom[eé]rico|difusor|grelha (de |para )?(ar|insufla|retorno)|\bdamper|exaustor|bomba de (condensado|dreno)|\bduto (de ar|flex[ií]vel de ar|em chapa)/i],
  ['solar', /fotovolt|m[oó]dulo solar|placa solar|inversor (solar|on-?grid|h[ií]brido|string)|string ?box|microinversor|conector MC4/i],
  ['carregador', /wallbox|carregador (veicular|de ve[ií]culo|para ve[ií]culo)|esta[cç][aã]o de recarga/i],
  ['media_tensao', /m[eé]dia tens[aã]o|\b(13[.,]8|15|24|36) ?kv\b|\bmufla|chave fus[ií]vel|cub[ií]culo|transformador (a [oó]leo|seco|de pot[eê]ncia)/i],
  ['iluminacao', /lumin[aá]ria|l[aâ]mpada|painel (de )?led|refletor|perfil (de )?led|fita (de )?led|\bspot\b|arandela|plafon|downlight|driver (de |para )?led|projetor (de )?led/i],
  // câmera e rede: o equipamento é da disciplina mesmo numa lista de outra ("câmera" na lista de cabeamento é CFTV)
  ['cftv', /c[aâ]mera|\bNVR\b|\bDVR\b|speed ?dome|\bbalun\b|videomonitoramento/i],
  ['cabeamento', /patch ?(panel|cord)|keystone|\bRJ ?-?45\b|\bcat\.? ?(5e|6a?)\b|\bswitch\b|access ?point|\bU\/UTP\b|\bUTP\b|fibra [oó]ptica|\bDIO\b|cord[aã]o [oó]ptico/i],
  ['automacao', /\bCLP\b|controlador (l[oó]gico|ddc|program[aá]vel)|m[oó]dulo (de )?(entradas?|sa[ií]das?|e\/s|i\/o)|sensor de (co2|temperatura|umidade|press[aã]o)|transmissor de (press|temper|umid)|\batuador|\bIHM\b|supervis[oó]rio|\bbacnet|\bmodbus|\bknx\b|zigbee/i],
];
// item de obra que não é instalação da H&M (lista de arquitetura, hidráulica, mobiliário, acabamento)
const RE_FORA = /dry ?wall|montante \d|\bguia \d+ ?x|placa (de )?gesso|gesso acartonado|\bgesso\b|\btinta\b|massa corrida|\bselador|\bcimento|\bareia\b|\bbrita\b|argamassa|porcelanato|cer[aâ]mic|\bpiso\b|rodap[eé]|revestimento|\bporta\b|janela|\bvidro|espelho\b|\bmdf\b|compensado|madeira|\bcadeira|\bmesa\b|\bsof[aá]\b|poltrona|arm[aá]rio|bancada|\bvaso (sanit|de)|lavat[oó]rio|\bcuba\b|torneira|chuveiro|registro de (gaveta|press[aã]o|esfera)|\bv[aá]lvula de (descarga|reten)|esgoto|pluvial|caixa d.[aá]gua|tubo (de )?pvc (sold|esgoto|[aá]gua)|\bjoelho|\bluva soldável|impermeabiliz|\bconcreto|\bvergalh|\ba[cç]o ca-?\d|quadro (decorativo|de arte)|\badorno|obra de arte|\btapete|\bcortina|persiana|papel de parede/i;
// tubo e conexão hidráulica de PVC (branco = esgoto, marrom = água fria, soldável), que a classificação do catálogo
// confunde com eletroduto ("TÊ 90° SOLDÁVEL PVC RÍGIDO MARROM 25 MM" caía em Infraestrutura)
const RE_HIDRAULICA = /pvc (r[ií]gido )?(branco|marrom)|\bsold[aá]vel|jun[cç][aã]o (simples|dupla)|anel de borracha|\bsif[aã]o|\bralo\b|caixa sifonada|\bTE (de )?redu[cç][aã]o.*pvc/i;
// o que é infraestrutura elétrica mesmo com essas palavras (eletroduto de PVC, caixa de passagem)
const RE_INFRA_ELETRICA = /eletroduto|eletrocalha|condulete|perfilado|caixa de passagem|leito (para|de) cabos/i;

// categoria do catálogo → disciplina (as categorias de apoio ficam com a disciplina do arquivo)
const POR_CATEGORIA = {
  'Elétrica': 'eletrica', 'Infraestrutura': 'eletrica', 'Redes / Cabeamento Estruturado': 'cabeamento', 'CFTV': 'cftv',
  'Alarme': 'alarme', 'Controle de acesso': 'controle_acesso', 'Interfonia': 'telefonia', 'Antena coletiva': 'antena',
  'Automação': 'automacao', 'Incêndio': 'incendio', 'SPDA': 'spda', 'Iluminação': 'iluminacao', 'Climatização': 'climatizacao',
  'Energia solar': 'solar', 'Recarga de VE': 'carregador', 'Média tensão': 'media_tensao', 'Pressurização': 'pressurizacao',
};
const APOIO = new Set(['Ferragens', 'Ferramentas', 'EPI', 'Nobreaks', 'Sonorização', 'Informatica']);
// disciplina → categoria do material que entra no catálogo sem categoria reconhecida (todo material tem categoria)
const CATEGORIA_DA_DISCIPLINA = {
  eletrica: 'Elétrica', eletrica_hospitalar: 'Elétrica', eletrica_industrial: 'Elétrica', quadros: 'Elétrica', cabeamento: 'Redes / Cabeamento Estruturado',
  rede: 'Redes / Cabeamento Estruturado', cftv: 'CFTV', alarme: 'Alarme', controle_acesso: 'Controle de acesso', telefonia: 'Interfonia',
  antena: 'Antena coletiva', automacao: 'Automação', incendio: 'Incêndio', spda: 'SPDA', iluminacao: 'Iluminação', climatizacao: 'Climatização',
  solar: 'Energia solar', carregador: 'Recarga de VE', media_tensao: 'Média tensão', pressurizacao: 'Pressurização',
};

// descricao → chave da disciplina ou null. opcoes: { categoria (do catálogo), contexto (disciplina do arquivo/aba) }
function disciplinaDoMaterial(descricao, { categoria = null, contexto = null } = {}) {
  const t = String(descricao || '');
  const propria = PROPRIAS.find(([, re]) => re.test(t));
  if (propria) return propria[0];
  if ((RE_FORA.test(t) || RE_HIDRAULICA.test(t)) && !RE_INFRA_ELETRICA.test(t)) return null;
  // eletroduto, eletrocalha, caixa de passagem: a infraestrutura é da disciplina que a usa (a do CFTV é do CFTV)
  if (categoria === 'Infraestrutura' && contexto) return contexto;
  if (categoria && POR_CATEGORIA[categoria]) return POR_CATEGORIA[categoria];
  // apoio, ou material que o catálogo ainda não sabe classificar numa lista que diz a disciplina
  if (!categoria || APOIO.has(categoria)) return contexto || null;
  return null;
}

module.exports = { disciplinaDoMaterial, CATEGORIA_DA_DISCIPLINA };
