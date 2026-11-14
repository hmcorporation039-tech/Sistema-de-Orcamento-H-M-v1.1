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
  // Controle de acesso (14/11/2026): a botoeira de emergência ("quebra-vidro") caía na luminária de emergência pela
  // layer EMERG (CA-BOTOEIRA-EMERG), o sensor de porta no magnético do alarme e a controladora no controlador de
  // automação (texto "controlador") ou em nada. Antes da linha da emergência.
  [/QUEBRA.?VIDRO|BOTOEIRA.{0,12}EMERG|^(ACE|CA|CTRL)[-_ ].*EMERG/i, /quebra.?vidro|(botoeira|acionador) de emerg[êe]ncia.{0,50}(porta|acesso|fechadura|libera)|libera[çc][ãa]o de emerg[êe]ncia d[ae] porta/i, 'HM-ACE-EMERGENCIA', 'controle-acesso'],
  // (o "sensor magnético de porta/janela" e o da layer/legenda de alarme continuam do alarme)
  [/^(?!(ALM|ALARME?|INTRUS[ÃA]O)[-_ ]).*SENSOR.{0,6}(DE.?)?PORTA|^(ACE|CA|CTRL)[-_ ].*SENSOR/i, /^(?!.*(magn[ée]tico de (porta|janela|abertura)|alarme|intrus)).*(sensor.{0,20} de porta|porta (aberta|arrombada))/i, 'HM-ACE-SENSOR', 'controle-acesso'],
  [/CONTROLADORA|^(ACE|CA|CTRL)[-_ ].*CONTROL/i, /controladora(?!.{0,20}(ddc|bacnet|automa|\bclp\b))|controlador de acesso/i, 'HM-ACE-CONTROLADORA', 'controle-acesso'],
  // Elétrica hospitalar (14/11/2026): os símbolos HM-HOSP-* existiam, mas nenhum desenho os reconhecia — a tomada IT
  // caía na tomada comum e o painel do DSI no quadro. Antes da tomada e do quadro.
  [/HOSP.*TOMAD|TOMAD.*(^|[-_ ])IT([-_ ]|$)|(^|[-_ ])IT[-_ ].*TOMAD/i, /tomada.{0,30}(\bit\b|sistema it|it m[ée]dico)/i, 'HM-HOSP-TOMADA-IT', 'eletrica_hospitalar'],
  [/\bDSI\b|ALARME.{0,10}[-_ ](IT|DSI)([-_ ]|$)|ISOLAMENTO.{0,10}(IT|M[ÉE]DICO)/i, /\bdsi\b|supervisor de isolamento|painel (de )?alarme.{0,40}(\bit\b|isolamento)|anunciador.{0,30}\bit\b/i, 'HM-HOSP-PAINEL-ALARME', 'eletrica_hospitalar'],
  [/(^|[-_ ])BEL([-_ ]|$)|EQUIPOTENCIALIZA[ÇC][ÃA]O.?LOCAL/i, /\bbel\b|equipotencializa[çc][ãa]o (local|suplementar)/i, 'HM-HOSP-BEL', 'eletrica_hospitalar'],
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
  // DG / central de interfonia ou PABX (14/11/2026): antes caía no ponto de telefone pela layer TEL-
  [/(^|[-_ ])DG([-_ \d]|$)|DISTRIBUIDOR.?GERAL|PABX|CENTRAL.{0,12}(INTERF|PORTARIA|TELEF)/i, /\bdg\b|distribuidor geral|\bpabx\b|central (de )?(interfonia|portaria|telef)/i, 'HM-TEL-DG', 'telefonia'],
  [/^TEL[-_ ]|TELEF|INTERF/i, /telef[ôo]n|telefone|interfon|ramal/i, 'HM-TEL-PONTO', 'telefonia'],
  // antena parabólica (14/11/2026): antes virava tomada de TV pela palavra "antena"
  [/PARAB[ÓO]LIC|(^|[-_ ])LNBF?([-_ ]|$)/i, /parab[óo]lica|\blnbf?\b|banda ku|antena.{0,20}sat[ée]lite/i, 'HM-ANT-PARABOLICA', 'antena'],
  // (a layer ANT-EQUIP é dos equipamentos — parabólica, headend —: o tipo vem da legenda, não vira tomada pela layer)
  [/^ANT[-_ ](?!EQUIP)|ANTENA|(^|[-_ ])TV([-_ ]|$)/i, /antena|(ponto|tomada).{0,10}(de )?tv\b|coaxial/i, 'HM-ANT-PONTO', 'antena'],
  [/LEITOR/i, /leitora?\b|biom[ée]tri|facial|controle de acesso/i, 'HM-ACE-LEITOR', 'controle-acesso'],
  [/FECHAD|ELETRO[IÍ]M/i, /fechadura|eletro[íi]m[ãa]|fecho el[ée]tr/i, 'HM-ACE-FECHADURA', 'controle-acesso'],
  [/BOTOEIRA/i, /botoeira/i, 'HM-ACE-BOTOEIRA', 'controle-acesso'],
  [/CATRACA/i, /catraca|torniquete/i, 'HM-ACE-CATRACA', 'controle-acesso'],
  [/\bIVP\b|INFRAV/i, /\bivp\b|infravermelho|sensor de alarme/i, 'HM-ALM-IVP', 'alarme'],
  [/MAGN[EÉ]T/i, /magn[ée]tico/i, 'HM-ALM-MAGNETICO', 'alarme'],
  [/TECLADO/i, /teclado/i, 'HM-ALM-TECLADO', 'alarme'],
  [/SIREN/i, /sirene/i, 'HM-ALM-SIRENE', 'alarme'],
  [/^ALM[-_ ].*CENTRAL|CENTRAL.{0,12}ALARM/i, /central.{0,20}alarme/i, 'HM-ALM-CENTRAL', 'alarme'],
  // Média tensão (14/11/2026): símbolos de planta da subestação. Transformador de separação/isolador (IT médico),
  // de comando, TC e TP não são o transformador de força; o para-raios e a malha só com o contexto de MT/subestação
  // (o "para-raios" e a "malha de aterramento" sozinhos são do SPDA)
  [/^MT[-_ ].*TRAF|TRANSFORMADOR(?!.{0,20}(SEPARA|ISOLA|COMANDO|[-_ ]IT\b))|(^|[-_ ])TRAFO/i, /^(?!.*(separa[çc]|isola|comando|corrente|potencial|\bit\b)).*(transformador (de )?(for[çc]a|pot[êe]ncia|distribui)|\btrafo\b|transformador.{0,40}(\d+\s?kva|\bkv\b|[óo]leo|a seco))/i, 'HM-MT-TRANSFORMADOR', 'media_tensao'],
  [/CUB[ÍI]CULO/i, /cub[íi]culo/i, 'HM-MT-CUBICULO', 'media_tensao'],
  [/^MT[-_ ].*(CHAVE|SECC)|SECCIONADORA|CHAVE.?FUS/i, /chave fus[íi]vel|seccionadora.{0,40}(\bkv\b|\bmt\b|m[ée]dia tens|prim[áa]ri)|(\bmt\b|m[ée]dia tens[ãa]o).{0,30}(seccionadora|chave)/i, 'HM-MT-CHAVE', 'media_tensao'],
  [/^MT[-_ ].*RAIO|PARA.?RAIOS?.{0,12}(MT|KV|DISTRIB)/i, /para.?raios?.{0,40}(\bkv\b|\bka\b|[óo]xido|\bzno\b|distribui[çc]|polim[ée]ric|\bmt\b|m[ée]dia tens)/i, 'HM-MT-PARA-RAIOS', 'media_tensao'],
  [/^MT[-_ ].*(MALHA|HASTE|ATERR)|MALHA.?(DE.?)?(ATERR|TERRA).{0,12}(SE|MT|SUBEST)/i, /malha de (aterramento|terra).{0,40}(subesta|cabine|\bse\b|\bmt\b)|(subesta[çc][ãa]o|cabine).{0,40}malha de (aterramento|terra)/i, 'HM-MT-MALHA', 'media_tensao'],
  [/CAPTOR|FRANKLIN|TERMINAL.?A[ÉE]REO/i, /captor|franklin|terminal a[ée]reo/i, 'HM-SPDA-CAPTOR', 'spda'],
  [/DESCIDA/i, /descida/i, 'HM-SPDA-DESCIDA', 'spda'],
  [/INSPE[ÇC]|HASTE/i, /caixa de inspe[çc]|haste/i, 'HM-SPDA-CAIXA-INSPECAO', 'spda'],
  // pressurização (14/11/2026): ventilador, damper/registro de alívio e transmissor de pressão diferencial/pressostato.
  // O ventilador e o damper sozinhos são da climatização (outra área): aqui só com a pressurização na layer ou no texto
  [/^PRZ[-_ ].*(VENT|MOTOR)|PRESSURIZ.{0,30}VENT|VENT.{0,30}PRESSURIZ/i, /ventilador.{0,40}pressuriza|pressuriza.{0,40}ventilador|ventilador (de |da )?(insufla[çc][ãa]o )?(da )?escada/i, 'HM-PRZ-VENTILADOR', 'pressurizacao'],
  [/^PRZ[-_ ].*(DAMPER|AL[ÍI]VIO|REGISTRO|VENEZ)|DAMPER.{0,20}AL[ÍI]VIO|REGISTRO.{0,20}(AL[ÍI]VIO|SOBREPRESS)/i, /(damper|registro|veneziana).{0,30}(al[íi]vio|sobrepress)|al[íi]vio de (sobre)?press[ãa]o/i, 'HM-PRZ-DAMPER', 'pressurizacao'],
  [/PRESSOSTATO|^PRZ[-_ ].*(SENSOR|TRANSM|PRESS|DP\b)|PRESS[ÃA]O.?DIF/i, /^(?!.*(bomba|hidrant|sprinkler|filtro)).*(pressostato|press[ãa]o diferencial)/i, 'HM-PRZ-SENSOR-PRESSAO', 'pressurizacao'],
  // painéis com vista interna no 3D (14/11/2026): o painel da pressurização e o quadro de automação (CLP/DDC)
  // antes caíam em HM-ELE-QUADRO pela linha QUADRO abaixo. Só pela layer do PAINEL (a layer de dutos e
  // ventiladores da pressurização não vira painel)
  [/PRZ[-_ ]?(PAINEL|QUADRO|QPE)|PRESSURIZ.{0,20}(PAINEL|QUADRO|QPE)/i, /painel.{0,40}pressuriza|(quadro|painel) de comando da pressuriza|\bQPE\b/i, 'HM-PRZ-PAINEL', 'pressurizacao'],
  [/^AUT[-_ ].*(CONTROL|QUADRO|CLP|DDC)|(^|[-_ ])(CLP|DDC|PLC)([-_ ]|$)/i, /quadro de automa[çc][ãa]o|\bclp\b|\bddc\b|controlador (de |da )?automa/i, 'HM-AUT-CONTROLADOR', 'automacao'],
  // Elétrica industrial (14/11/2026): CCM antes do quadro; motor (ponto de força) pela layer ou pelo texto — o motor
  // do portão, da cancela e da persiana/cortina não é carga industrial
  [/(^|[-_ ])CCM([-_ \d]|$)/i, /\bccm\b|centro de controle de motores/i, 'HM-IND-CCM', 'eletrica_industrial'],
  [/CAPACITOR|BANCO.?(DE.?)?CAP/i, /banco de capacitor|capacitor(es)? (de pot[êe]ncia|trif[áa]sico)|corre[çc][ãa]o (do )?fator de pot[êe]ncia/i, 'HM-IND-BANCO-CAPACITORES', 'eletrica_industrial'],
  [/(^|[-_ ])MOTOR(ES)?([-_ \d]|$)|^IND[-_ ].*MOT/i, /^(?!.*(port[ãa]o|cancela|persiana|cortina)).*(\bmotor(es)?\b|motobomba|\b\d+([.,]\d+)?\s?cv\b)/i, 'HM-IND-MOTOR', 'eletrica_industrial'],
  // quadro da recarga antes do carregador (o texto "recarga" levava o QD-VE para o wallbox)
  [/^VE[-_ ].*(QUADRO|QD)|QD.?VE\b|QUADRO.{0,20}(RECARGA|CARREG)/i, /quadro.{0,40}(recarga|carregador)|\bqd-?ve\b/i, 'HM-VE-QUADRO', 'veicular'],
  [/CARREG|WALLBOX|^VE[-_ ]/i, /carregador|wallbox|recarga/i, 'HM-VE-CARREGADOR', 'veicular'],
  // Solar (14/11/2026): módulo, string box e quadro CA antes do inversor ("Quadro CA do inversor" é o quadro)
  [/M[ÓO]DULOS?.?(FV|FOTOV|SOLAR)|^(FV|SOL|SOLAR)[-_ ].*(M[ÓO]D|PAINE|PLACA)|PLACAS?.?SOLAR|PAINE(L|IS).?(FV|SOLAR|FOTOV)/i, /m[óo]dulos?\s+(fotovolt|solar|fv)|pain(el|[ée]is)\s+(solar|fotovolt)|placas?\s+solar|\b\d{3}\s?wp\b/i, 'HM-SOL-MODULO', 'solar'],
  [/STRING.?BOX|^(FV|SOL)[-_ ](.*[-_ ])?SB([-_ ]|$)|CAIXA.?(DE.?)?JUN[ÇC].{0,10}(FV|CC)/i, /string.?box|caixa de jun[çc][ãa]o.{0,20}(cc|fv|string|m[óo]dulo)/i, 'HM-SOL-STRING-BOX', 'solar'],
  [/^(FV|SOL)[-_ ].*(QUADRO|QD|QCA)|QUADRO.?CA.?(FV|SOLAR|USINA)/i, /quadro (de prote[çc][ãa]o )?ca\b.{0,40}(inversor|fotovolt|usina|\bfv\b|solar)|(inversor|fotovolt|usina|\bfv\b|solar).{0,40}quadro (de prote[çc][ãa]o )?ca\b/i, 'HM-SOL-QUADRO-CA', 'solar'],
  // (o inversor de frequência é da elétrica industrial, não da usina)
  [/INVERSOR(?!.{0,4}(DE.?)?FREQ)/i, /inversor(?!\s+de\s+frequ)/i, 'HM-SOL-INVERSOR', 'solar'],
  // Automação (14/11/2026): sensor de temperatura, umidade e CO₂ (e termostato) da automação — antes a layer AUT-SENSOR
  // caía no sensor de presença da iluminação. Um tipo só no 3D (o quadro de automação conta HM-AUT-SENSOR); o que ele
  // mede fica na descrição da legenda.
  [/^AUT[-_ ].*SENSOR|TERMOSTATO|(SENSOR|TRANSM|SONDA).{0,15}(TEMP|UMID|CO2|CO₂)/i, /(sensor|transmissor|sonda|medidor)\s+(de\s+)?(temperatura|umidade|co[2₂]|di[óo]xido)|termostato|sensor de automa[çc][ãa]o|(?<![a-z])co[2₂](?![a-z0-9]).{0,30}(temperatura|umidade|sensor)/i, 'HM-AUT-SENSOR', 'automacao'],
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
const DE_PAREDE = /TOMADA|INTERRUPTOR|ELE-PONTO$|ACIONADOR|LEITOR|BOTOEIRA|TECLADO|PORTEIRO|PONTO-REDE|TEL-PONTO|ANT-PONTO|CARREGADOR|QUADRO|AVISADOR|SIRENE|CCM|BANCO-CAP|STRING-BOX|TEL-DG|AUT-SENSOR|PRZ-SENSOR|ACE-EMERGENCIA|ACE-CONTROLADORA/;

// descrição de um componente (bloco do DWG, linha da legenda do PDF) → símbolo do 3D
function simboloDaDescricao(descricao) {
  const d = String(descricao || '');
  // "Tomada 2P+T — circuito QD1-3": é tomada (o QD é do circuito), salvo tomada de rede/TV/telefone
  const tomada = /\btomada\b/i.test(d) && !/tomada.{0,12}(rede|l[óo]gica|dados|tv\b|telef|coaxial)/i.test(d)
    && !/tomada.{0,30}(\bit\b|sistema it|it m[ée]dico)/i.test(d); // (a do IT médico tem tipo próprio — 14/11/2026)
  const t = tomada ? TIPOS.find(x => x[2] === 'HM-ELE-TOMADA-BAIXA') : tipoPeloTexto(d);
  if (!t) return null;
  if (t[2] !== 'HM-ELE-TOMADA-BAIXA') return t[2];
  if (/tomada\s+alta/i.test(d)) return 'HM-ELE-TOMADA-ALTA';
  if (/tomada\s+m[ée]dia/i.test(d)) return 'HM-ELE-TOMADA-MEDIA';
  const h = alturaEscrita(d);
  return h ? tomadaPelaAltura(h) : 'HM-ELE-TOMADA-BAIXA';
}

module.exports = { TIPOS, familia, tipoPelaLayer, tipoPeloTexto, metros, alturaEscrita, tomadaPelaAltura, DE_PAREDE, simboloDaDescricao, RE_ALTURA_PISO, RE_ALTURA_H };
