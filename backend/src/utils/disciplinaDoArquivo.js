// Disciplina de um arquivo do acervo pelo NOME e pelas PASTAS (treino com as obras já feitas, pedido do usuário
// em 03/11/2026: "faça com que o sistema sempre aprenda por disciplinas"). Os escritórios codificam a disciplina
// no nome da prancha ("001_ELE_ALM-01_…", "HSL_…_AUT_PE_…", "CH-DFS-5300-…") e nas pastas ("5000 - Eletrica",
// "CLIMATIZAÇÃO", "3000 -Arquitetura"). Olha primeiro o nome do arquivo, depois as pastas, da mais funda para a
// raiz: o que estiver mais perto do arquivo vale (a prancha "ELE_ARENA.dwg" dentro de "Arquitetura" é elétrica).
//   disciplinaDoArquivo(caminhoRelativo) → { chave, chaves?, origem: 'nome' | 'pasta' } — disciplina(s) da H&M
//                                         | { fora: 'Arquitetura' }              — disciplina que não é da H&M
//                                         | null                                — o caminho não diz
//   disciplinaDoTexto(texto)             → o mesmo para um texto solto (nome de aba, título de seção da planilha)
// Função pura, sem banco.
const ACENTOS = /[̀-ͯ]/g;
const normalizar = (s) => ` ${String(s || '').normalize('NFD').replace(ACENTOS, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()} `;

// Códigos e palavras de cada disciplina da H&M (as chaves de skills/_comum/disciplinas.js). Siglas curtas e
// ambíguas (SE, MT, QD, PE, SOL, VE) ficam de fora: aparecem em qualquer nome ("Sol Nascente"). Dos números,
// só os da codificação das listas dos hospitais (5100 elétrica, 5300 cabeamento, 6000/6300 climatização).
const DA_HM = [
  ['eletrica_hospitalar', /\b(IT MEDICO|HOSPITALAR)\b/],
  ['media_tensao', /\b(SUBESTACAO|MEDIA TENSAO|CABINE PRIMARIA)\b/],
  ['pressurizacao', /\b(PRES|PRESSURIZACAO)\b/],
  ['spda', /\b(SPDA|PARA RAIOS|ATERRAMENTO|DESCARGAS ATMOSFERICAS)\b/],
  ['incendio', /\b(INC|INCENDIO|SDAI|DETECCAO|PSCIP|PPCI|EMERGENCIA)\b/],
  ['cftv', /\b(CFT|CFTV|CIRCUITO FECHADO|VIDEOMONITORAMENTO)\b/],
  ['alarme', /\b(ALM|ALARME|INTRUSAO)\b/],
  ['controle_acesso', /\b(ACE|CONTROLE DE ACESSO)\b/],
  ['telefonia', /\b(TEL|TELEFONIA|INTERFONIA|INTERFONE)\b/],
  ['antena', /\b(ANT|ANTENA|MATV|SMATV)\b/],
  ['cabeamento', /\b(CAB|LOG|LOGICA|CABEAMENTO|CABEAMENTO ESTRUTURADO|TELECOM|DADOS|REDE LOGICA|5300)\b/],
  ['automacao', /\b(AUT|AUTOMACAO|BMS|SUPERVISAO PREDIAL)\b/],
  // "ventilação" sozinha não: "INSTALAÇÃO DE ESGOTO E VENTILAÇÃO" é hidráulica
  ['climatizacao', /\b(CLI|CLIM|CLIMATIZACAO|HVAC|AVAC|AR CONDICIONADO|VENTILACAO MECANICA|EXAUSTAO|6000|6300)\b/],
  ['iluminacao', /\b(ILUM|ILUMINACAO|LUMINOTECNICO|LUMINOTECNICA)\b/],
  ['solar', /\b(SOLAR|FOTOVOLTAICO|FOTOVOLTAICA|FV)\b/],
  ['carregador', /\b(RECARGA|WALLBOX|CARREGADOR VEICULAR)\b/],
  ['eletrica_industrial', /\b(INDUSTRIAL|CCM)\b/],
  // a elétrica por último: "001_ELE_ALM-01" é alarme (a sigla da elétrica é o grupo; a outra, a disciplina)
  ['eletrica', /\b(ELE|ELET|ELETRICA|ELETRICO|ELETRICAS|ELETRICOS|INSTALACOES ELETRICAS|FORCA|TOMADAS|5000|5100)\b/],
];
// Disciplinas de projeto que não são da H&M: o desenho/lista delas não ensina símbolo nem material nosso
const FORA = [
  ['Arquitetura', /\b(ARQ|ARQUITETURA|ARQUITETONICO|INTERIORES|MOBILIARIO|ACABAMENTO|ACABAMENTOS|PAISAGISMO|LISTAPORTA|LISTAACABA|LISTAMOBIL|LISTAACESS|LISTAADORN|LISTAMETAI)\b/],
  ['Hidráulica', /\b(HID|HIDRO|HIDRAULICA|HIDRAULICO|HIDRAULICAS|HIDROSSANITARIO|HIDROSSANITARIOS|HIDROSSANITARIAS|SANITARIO|SANITARIAS|ESGOTO|PLUVIAL|PLUVIAIS|DRENO|DRENAGEM|GAS|AGUA FRIA|AGUA QUENTE|GASES MEDICINAIS)\b/],
  ['Estrutura', /\b(EST|ESTRUTURA|ESTRUTURAL|SUPERESTRUTURA|FUNDACAO|FUNDACOES|FORMAS|ARMACAO|CONCRETO|METALICA)\b/],
  ['Topografia', /\b(TOPOGRAFIA|TOPOGRAFICO|TERRAPLENAGEM|TERRAPLANAGEM)\b/],
  // seções de obra civil e de combate a incêndio por água (títulos das planilhas gerais de obra: "12.1 PINTURA",
  // "16.2 SPRINKLERS"). "Cobertura" fica de fora: também é nome de apartamento.
  ['Civil', /\b(CANTEIRO|DEMOLICAO|DEMOLICOES|ALVENARIA|ALVENARIAS|DRYWALL|PAVIMENTACAO|REVESTIMENTO|REVESTIMENTOS|FORROS|IMPERMEABILIZACAO|ESQUADRIA|ESQUADRIAS|PERSIANAS|VIDROS|BANCADAS|SERRALHERIA|PINTURA|PINTURAS|LOUCAS|METAIS SANITARIOS|MARCENARIA|DIVISORIA|DIVISORIAS|SPRINKLER|SPRINKLERS|HIDRANTE|HIDRANTES|EXTINTOR|EXTINTORES|LIMPEZA)\b/],
];

// Palavras que só dizem a disciplina com contexto técnico ao lado (revisão de 06/11/2026: "Condomínio Solar das
// Palmeiras" virava usina solar, "Concreto Forte Construtora" virava estrutura, "SLU - Serviço de Limpeza Urbana" virava
// obra civil). No CAMINHO do arquivo, sem o contexto, a palavra é tirada antes de procurar; no texto solto (título de
// seção da planilha: "12.1 LIMPEZA"), vale como sempre.
const AMBIGUAS = [
  [/\bSOLAR\b/g, /\b(ENERGIA|USINA|SISTEMA|GERACAO|PAINEL|PAINEIS|MODULO|MODULOS|PLACAS?) SOLAR(ES)?\b|\bSOLAR (FOTOVOLTAIC[OA]|FV|ON GRID|OFF GRID)\b/],
  [/\bCONCRETO\b/g, /\bCONCRETO (ARMADO|PROTENDIDO|ESTRUTURAL)\b|\bESTRUTURAS? (DE|EM) CONCRETO\b/],
  [/\bLIMPEZA\b/g, /\bLIMPEZA (FINAL|DE OBRA|DA OBRA|GERAL|DO TERRENO|DE TERRENO)\b/],
  [/\bMETALICA\b/g, /\bESTRUTURAS? METALICAS?\b/],
];
const semAmbiguas = (t) => AMBIGUAS.reduce((s, [palavra, contexto]) => (contexto.test(s) ? s : s.replace(palavra, ' ')), t);
// "001_ELE_ALM-01": a sigla curta da elétrica é o grupo, a outra é a disciplina — a elétrica só é MAIS uma disciplina
// do arquivo quando dita por extenso ("…_Eletrica_CFTV")
const ELETRICA_POR_EXTENSO = /\b(ELETRICA|ELETRICO|ELETRICAS|ELETRICOS|INSTALACOES ELETRICAS|FORCA|TOMADAS)\b/;

// → { chave, chaves? (quando diz mais de uma: "Paroquia_NSA_Incendio_CFTV_Cabeamento") } | { fora } | null
function disciplinaDoTexto(texto, { caminho = false } = {}) {
  let t = normalizar(texto);
  if (t.trim() === '') return null;
  if (caminho) t = semAmbiguas(t);
  let achadas = DA_HM.filter(([, re]) => re.test(t)).map(([chave]) => chave);
  if (achadas.length > 1 && achadas.includes('eletrica') && !ELETRICA_POR_EXTENSO.test(t)) achadas = achadas.filter(c => c !== 'eletrica');
  if (achadas.length) return achadas.length > 1 ? { chave: achadas[0], chaves: achadas } : { chave: achadas[0] };
  const fora = FORA.find(([, re]) => re.test(t));
  return fora ? { fora: fora[0] } : null;
}

// caminho: relativo à pasta dos clientes ("<cliente>/Obras/<obra>/…/arquivo"). O nome da pasta do CLIENTE não diz a
// disciplina (é o nome da empresa: "Condomínio Solar…", "Concreto Forte…") e "Obras" também não: olha o nome do
// arquivo e depois as pastas DENTRO do cliente, da mais perto do arquivo para fora.
function disciplinaDoArquivo(caminho) {
  const partes = String(caminho || '').split(/[\/]+/).filter(Boolean);
  if (!partes.length) return null;
  const arquivo = partes.pop().replace(/\.[^.]+$/, '');
  const iClientes = partes.findIndex(p => /^clientes$/i.test(p.trim()));
  const pastas = (iClientes >= 0 ? partes.slice(iClientes + 2) : partes.slice(1)).filter(p => !/^obras?$/i.test(p.trim()));
  const comOrigem = (d, origem) => (d.chave ? { chave: d.chave, ...(d.chaves ? { chaves: d.chaves } : {}), origem } : d);
  const d = disciplinaDoTexto(arquivo, { caminho: true });
  if (d) return comOrigem(d, 'nome');
  for (const pasta of pastas.reverse()) {
    const p = disciplinaDoTexto(pasta, { caminho: true });
    if (p) return comOrigem(p, 'pasta');
  }
  return null;
}

// Versão da regra acima: o arquivo do acervo 'ignorado' (de outra disciplina) por uma versão anterior é reavaliado
// no próximo treino (services/treinoAcervo.js) — a regra mudou, ele pode ser da H&M.
const REGRA_VERSAO = 2;

module.exports = { disciplinaDoArquivo, disciplinaDoTexto, REGRA_VERSAO };
