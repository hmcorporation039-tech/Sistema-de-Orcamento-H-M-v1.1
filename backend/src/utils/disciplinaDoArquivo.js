// Disciplina de um arquivo do acervo pelo NOME e pelas PASTAS (treino com as obras já feitas, pedido do usuário
// em 03/11/2026: "faça com que o sistema sempre aprenda por disciplinas"). Os escritórios codificam a disciplina
// no nome da prancha ("001_ELE_ALM-01_…", "HSL_…_AUT_PE_…", "CH-DFS-5300-…") e nas pastas ("5000 - Eletrica",
// "CLIMATIZAÇÃO", "3000 -Arquitetura"). Olha primeiro o nome do arquivo, depois as pastas, da mais funda para a
// raiz: o que estiver mais perto do arquivo vale (a prancha "ELE_ARENA.dwg" dentro de "Arquitetura" é elétrica).
//   disciplinaDoArquivo(caminhoRelativo) → { chave, origem: 'nome' | 'pasta' } — disciplina da H&M
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

function disciplinaDoTexto(texto) {
  const t = normalizar(texto);
  if (t.trim() === '') return null;
  const achadas = DA_HM.filter(([, re]) => re.test(t)).map(([chave]) => chave);
  if (achadas.length) return { chave: achadas[0] };
  const fora = FORA.find(([, re]) => re.test(t));
  return fora ? { fora: fora[0] } : null;
}

function disciplinaDoArquivo(caminho) {
  const partes = String(caminho || '').split(/[\\/]+/).filter(Boolean);
  if (!partes.length) return null;
  const arquivo = partes.pop().replace(/\.[^.]+$/, '');
  const d = disciplinaDoTexto(arquivo);
  if (d) return d.chave ? { chave: d.chave, origem: 'nome' } : d;
  for (const pasta of partes.reverse()) {
    const p = disciplinaDoTexto(pasta);
    if (p) return p.chave ? { chave: p.chave, origem: 'pasta' } : p;
  }
  return null;
}

module.exports = { disciplinaDoArquivo, disciplinaDoTexto };
