// VOCABULÁRIO do campo de instruções da análise (versão 2.47, 20/11/2026 — pedido do usuário: "tem que haver um campo
// do qual se possa inserir instruções para alterar a análise, como por exemplo mude a estrutura para determinado lugar,
// acrescente um componente, retire um componente, isso de forma mais fácil", sem depender de IA).
//
// É só DADO, sem acento e em minúsculas (agentes/textoPedido.normalizar), sempre no SINGULAR (o plural é reduzido na
// leitura: singular()). O aprendido entra pela tabela agentes_sugestoes (tipo 'instrucao'), depois da aprovação do
// administrador — services/instrucoes/aprendidas.js.
//
//   VERBOS       radical → ação ('adicionar' | 'retirar' | 'mover' | 'trocar' | 'definir')
//   COMPONENTES  frase → símbolo da biblioteca (services/bibliotecaComponentes.js); a frase mais longa ganha.
//                Lista de símbolos: o primeiro cuja disciplina está na análise (ex.: "sensor de presença" é IVP numa
//                análise de alarme e sensor de iluminação numa de iluminação).
//   ESTRUTURA    o equipamento central de cada grupo do projetista (rack, central, DG, controladora, QD): "mover"
//                um deles numa análise de elaboração muda o local escolhido e refaz os cabos.

// radical (começo da palavra) → ação. "mude/mudar" é mover, salvo quando vem com quantidade ("mude para 3 câmeras")
const VERBOS = [
  ['acrescent', 'adicionar'], ['adicion', 'adicionar'], ['inclu', 'adicionar'], ['coloc', 'adicionar'], ['coloq', 'adicionar'], ['ponha', 'adicionar'],
  ['por', 'adicionar', true], ['poe', 'adicionar', true], ['bot', 'adicionar'], ['boto', 'adicionar'], ['insir', 'adicionar'], ['inser', 'adicionar'], ['instal', 'adicionar'],
  ['prev', 'adicionar'], ['crie', 'adicionar', true], ['criar', 'adicionar', true], ['add', 'adicionar', true], ['mais', 'adicionar', true],
  ['retir', 'retirar'], ['remov', 'retirar'], ['tir', 'retirar'], ['exclu', 'retirar'], ['apag', 'retirar'], ['elimin', 'retirar'],
  ['delet', 'retirar'], ['menos', 'retirar', true], ['sem', 'retirar', true],
  ['mov', 'mover'], ['mud', 'mover'], ['lev', 'mover'], ['transfer', 'mover'], ['transfir', 'mover'], ['pass', 'mover'], ['desloc', 'mover'], ['desloq', 'mover'], ['realoc', 'mover'], ['realoq', 'mover'],
  ['reposicion', 'mover'], ['transport', 'mover'],
  ['troc', 'trocar'], ['troq', 'trocar'], ['substitu', 'trocar'],
  ['deix', 'definir'], ['quer', 'definir'], ['fiq', 'definir'], ['ajust', 'definir'], ['defin', 'definir'],
];
// (true = a palavra inteira, não o começo: "por" não pode casar "porta", "mais" não casa "maisena")

// números escritos por extenso (masculino e feminino)
const NUMEROS = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30,
};
const ORDINAIS = { primeiro: 1, segundo: 2, terceiro: 3, quarto: 4, quinto: 5, sexto: 6, setimo: 7, oitavo: 8, nono: 9, decimo: 10 };
// "todos", "todas", "tudo", "cada" = todos os do lugar
const TODOS = new Set(['todo', 'toda', 'todos', 'todas', 'tudo', 'cada', 'qualquer']);

// frase → símbolo(s). Sempre no singular e sem acento.
const COMPONENTES = {
  // CFTV
  camera: ['HM-CFTV-CAMERA'], cam: ['HM-CFTV-CAMERA'], 'camera de cftv': ['HM-CFTV-CAMERA'], 'camera dome': ['HM-CFTV-CAMERA'], dome: ['HM-CFTV-CAMERA'],
  'camera bullet': ['HM-CFTV-CAMERA'], bullet: ['HM-CFTV-CAMERA'], 'camera ptz': ['HM-CFTV-CAMERA'], ptz: ['HM-CFTV-CAMERA'], 'speed dome': ['HM-CFTV-CAMERA'],
  'camera externa': ['HM-CFTV-CAMERA'], 'camera de seguranca': ['HM-CFTV-CAMERA'], cftv: ['HM-CFTV-CAMERA'],
  nvr: ['HM-CAB-RACK'], dvr: ['HM-CAB-RACK'], gravador: ['HM-CAB-RACK'],
  // rede
  'ponto de rede': ['HM-CAB-PONTO-REDE'], 'tomada de rede': ['HM-CAB-PONTO-REDE'], rj45: ['HM-CAB-PONTO-REDE'], 'rj 45': ['HM-CAB-PONTO-REDE'],
  'ponto de dado': ['HM-CAB-PONTO-REDE'], 'ponto logico': ['HM-CAB-PONTO-REDE'], 'ponto de telecom': ['HM-CAB-PONTO-REDE'], 'ponto de internet': ['HM-CAB-PONTO-REDE'],
  rede: ['HM-CAB-PONTO-REDE'],
  ap: ['HM-CAB-AP'], 'access point': ['HM-CAB-AP'], wifi: ['HM-CAB-AP'], 'wi fi': ['HM-CAB-AP'], 'ponto de acesso': ['HM-CAB-AP'], 'roteador wifi': ['HM-CAB-AP'],
  'antena wifi': ['HM-CAB-AP'],
  rack: ['HM-CAB-RACK'], distribuidor: ['HM-CAB-RACK'], 'patch panel': ['HM-CAB-RACK'], switch: ['HM-CAB-RACK'], 'rack de rede': ['HM-CAB-RACK'],
  // incêndio
  detector: ['HM-INC-DETECTOR-FUMACA'], 'detector de fumaca': ['HM-INC-DETECTOR-FUMACA'], 'detector de incendio': ['HM-INC-DETECTOR-FUMACA'],
  'sensor de fumaca': ['HM-INC-DETECTOR-FUMACA'], 'detector optico': ['HM-INC-DETECTOR-FUMACA'],
  'detector de temperatura': ['HM-INC-DETECTOR-TEMP'], 'detector termico': ['HM-INC-DETECTOR-TEMP'], 'detector termovelocimetrico': ['HM-INC-DETECTOR-TEMP'],
  'detector de calor': ['HM-INC-DETECTOR-TEMP'],
  acionador: ['HM-INC-ACIONADOR', 'HM-ACE-EMERGENCIA'], 'acionador manual': ['HM-INC-ACIONADOR'], 'botoeira de incendio': ['HM-INC-ACIONADOR'],
  'acionador de incendio': ['HM-INC-ACIONADOR'], 'botao de incendio': ['HM-INC-ACIONADOR'],
  avisador: ['HM-INC-AVISADOR'], 'avisador audiovisual': ['HM-INC-AVISADOR'], 'sirene de incendio': ['HM-INC-AVISADOR'], strobo: ['HM-INC-AVISADOR'],
  'central de incendio': ['HM-INC-CENTRAL'], 'central de alarme de incendio': ['HM-INC-CENTRAL'], 'painel de incendio': ['HM-INC-CENTRAL'],
  'central de deteccao': ['HM-INC-CENTRAL'],
  'luminaria de emergencia': ['HM-INC-EMERGENCIA'], 'iluminacao de emergencia': ['HM-INC-EMERGENCIA'], 'luz de emergencia': ['HM-INC-EMERGENCIA'],
  'bloco autonomo': ['HM-INC-EMERGENCIA'], emergencia: ['HM-INC-EMERGENCIA'],
  // alarme
  ivp: ['HM-ALM-IVP'], 'sensor infravermelho': ['HM-ALM-IVP'], 'sensor de movimento': ['HM-ALM-IVP'], 'sensor de alarme': ['HM-ALM-IVP'],
  'sensor de presenca': ['HM-ALM-IVP', 'HM-ILU-SENSOR'], sensor: ['HM-ALM-IVP', 'HM-ILU-SENSOR', 'HM-INC-DETECTOR-FUMACA'],
  magnetico: ['HM-ALM-MAGNETICO'], 'sensor magnetico': ['HM-ALM-MAGNETICO'], 'sensor de abertura': ['HM-ALM-MAGNETICO'], 'sensor de porta': ['HM-ALM-MAGNETICO', 'HM-ACE-SENSOR'],
  sirene: ['HM-ALM-SIRENE', 'HM-INC-AVISADOR'], teclado: ['HM-ALM-TECLADO'], 'teclado do alarme': ['HM-ALM-TECLADO'],
  'central de alarme': ['HM-ALM-CENTRAL', 'HM-INC-CENTRAL'], 'central do alarme': ['HM-ALM-CENTRAL'],
  // controle de acesso
  leitor: ['HM-ACE-LEITOR'], 'leitor facial': ['HM-ACE-LEITOR'], 'leitor de cartao': ['HM-ACE-LEITOR'], biometria: ['HM-ACE-LEITOR'],
  'leitor biometrico': ['HM-ACE-LEITOR'], 'controle de acesso': ['HM-ACE-LEITOR'], facial: ['HM-ACE-LEITOR'],
  fechadura: ['HM-ACE-FECHADURA'], eletroima: ['HM-ACE-FECHADURA'], 'fechadura eletromagnetica': ['HM-ACE-FECHADURA'], 'fecho eletrico': ['HM-ACE-FECHADURA'],
  'fechadura eletrica': ['HM-ACE-FECHADURA'],
  botoeira: ['HM-ACE-BOTOEIRA', 'HM-INC-ACIONADOR'], 'botao de saida': ['HM-ACE-BOTOEIRA'], 'botoeira de saida': ['HM-ACE-BOTOEIRA'],
  'acionador de emergencia': ['HM-ACE-EMERGENCIA'], 'quebra vidro': ['HM-ACE-EMERGENCIA', 'HM-INC-ACIONADOR'],
  controladora: ['HM-ACE-CONTROLADORA'], 'controladora de acesso': ['HM-ACE-CONTROLADORA'],
  catraca: ['HM-ACE-CATRACA'], torniquete: ['HM-ACE-CATRACA'],
  // elétrica e iluminação
  tomada: ['HM-ELE-TOMADA-BAIXA'], 'tomada baixa': ['HM-ELE-TOMADA-BAIXA'], 'tomada media': ['HM-ELE-TOMADA-MEDIA'], 'tomada alta': ['HM-ELE-TOMADA-ALTA'],
  'tomada de uso geral': ['HM-ELE-TOMADA-BAIXA'], tug: ['HM-ELE-TOMADA-BAIXA'],
  tue: ['HM-ELE-TUE'], 'tomada de uso especifico': ['HM-ELE-TUE'], 'ponto de forca': ['HM-ELE-TUE'], 'tomada 20a': ['HM-ELE-TUE'],
  interruptor: ['HM-ELE-INTERRUPTOR', 'HM-ILU-COMANDO'], dimmer: ['HM-ILU-COMANDO'], 'comando de iluminacao': ['HM-ILU-COMANDO'],
  'ponto de luz': ['HM-ELE-PONTO-LUZ', 'HM-ILU-LUMINARIA'], luz: ['HM-ILU-LUMINARIA', 'HM-ELE-PONTO-LUZ'],
  luminaria: ['HM-ILU-LUMINARIA', 'HM-ELE-PONTO-LUZ'], lampada: ['HM-ILU-LUMINARIA', 'HM-ELE-PONTO-LUZ'], plafon: ['HM-ILU-LUMINARIA'],
  'painel led': ['HM-ILU-LUMINARIA'], spot: ['HM-ILU-LUMINARIA'], arandela: ['HM-ILU-LUMINARIA'],
  'sensor de presenca de teto': ['HM-ILU-SENSOR'],
  quadro: ['HM-ELE-QUADRO'], qd: ['HM-ELE-QUADRO'], 'quadro de distribuicao': ['HM-ELE-QUADRO'], 'quadro eletrico': ['HM-ELE-QUADRO'],
  'quadro de luz': ['HM-ELE-QUADRO'], 'quadro de energia': ['HM-ELE-QUADRO'],
  poste: ['HM-ILU-POSTE'], 'caixa de passagem': ['HM-ELE-CAIXA-PISO'],
  // telefonia
  telefone: ['HM-TEL-PONTO'], 'ponto de telefone': ['HM-TEL-PONTO'], ramal: ['HM-TEL-PONTO'], interfone: ['HM-TEL-PONTO'], 'ponto de interfone': ['HM-TEL-PONTO'],
  porteiro: ['HM-TEL-PORTEIRO'], 'porteiro eletronico': ['HM-TEL-PORTEIRO'], 'video porteiro': ['HM-TEL-PORTEIRO'],
  dg: ['HM-TEL-DG'], pabx: ['HM-TEL-DG'], 'central telefonica': ['HM-TEL-DG'], 'central de interfonia': ['HM-TEL-DG'], 'central de portaria': ['HM-TEL-DG'],
  // antena
  'tomada de tv': ['HM-ANT-PONTO'], 'ponto de tv': ['HM-ANT-PONTO'], tv: ['HM-ANT-PONTO'], 'ponto de antena': ['HM-ANT-PONTO'],
  'tomada de antena': ['HM-ANT-PONTO'], parabolica: ['HM-ANT-PARABOLICA'], antena: ['HM-ANT-PARABOLICA'], 'tomada de satelite': ['HM-ANT-SAT'],
  // SPDA
  captor: ['HM-SPDA-CAPTOR'], 'para raio': ['HM-SPDA-CAPTOR'], descida: ['HM-SPDA-DESCIDA'], 'caixa de inspecao': ['HM-SPDA-CAIXA-INSPECAO'],
  haste: ['HM-SPDA-CAIXA-INSPECAO'], 'haste de aterramento': ['HM-SPDA-CAIXA-INSPECAO'],
  // climatização
  evaporadora: ['HM-CLIM-EVAPORADORA'], 'ar condicionado': ['HM-CLIM-EVAPORADORA'], split: ['HM-CLIM-EVAPORADORA'], condensadora: ['HM-CLIM-CONDENSADORA'],
  difusor: ['HM-CLIM-DIFUSOR'], grelha: ['HM-CLIM-GRELHA'],
  // recarga veicular e solar
  carregador: ['HM-VE-CARREGADOR'], wallbox: ['HM-VE-CARREGADOR'], 'carregador veicular': ['HM-VE-CARREGADOR'], inversor: ['HM-SOL-INVERSOR'],
};

// a ESTRUTURA de cada grupo do projetista (skills/_comum/cad/projetista.js DISCIPLINAS[*].centro) e as disciplinas
// do grupo; "estrutura" sozinha = todas as do projeto
const ESTRUTURAS = {
  'HM-CAB-RACK': { grupo: 'telecom', disciplinas: ['cftv', 'rede'], nome: 'rack (CFTV/rede)' },
  'HM-INC-CENTRAL': { grupo: 'incendio', disciplinas: ['incendio'], nome: 'central de incêndio' },
  'HM-ALM-CENTRAL': { grupo: 'alarme', disciplinas: ['alarme'], nome: 'central de alarme' },
  'HM-ACE-CONTROLADORA': { grupo: 'acesso', disciplinas: ['controle_acesso'], nome: 'controladora de acesso' },
  'HM-TEL-DG': { grupo: 'telefonia', disciplinas: ['telefonia'], nome: 'DG / central telefônica' },
  'HM-ANT-PARABOLICA': { grupo: 'antena', disciplinas: ['antena'], nome: 'antena / headend' },
  'HM-ELE-QUADRO': { grupo: 'eletrica', disciplinas: ['eletrica', 'iluminacao'], nome: 'quadro de distribuição', porPavimento: true },
};
const PALAVRAS_ESTRUTURA = ['estrutura', 'equipamento central', 'central', 'centrai', 'infraestrutura central', 'equipamento'];

// palavras que indicam lugar de DESTINO ("para", "pra", "ate") ou de ORIGEM ("de", "do", "da")
const DESTINO = new Set(['para', 'pra', 'pro', 'ate', 'ao']);

// tipos de ambiente pelo começo do nome (plural "nos quartos" = todos os quartos)
module.exports = { VERBOS, NUMEROS, ORDINAIS, TODOS, COMPONENTES, ESTRUTURAS, PALAVRAS_ESTRUTURA, DESTINO };
