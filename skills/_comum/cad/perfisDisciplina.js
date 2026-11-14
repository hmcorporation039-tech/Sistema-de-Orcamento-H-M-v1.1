// PERFIS DE DISCIPLINA para o entendimento do projeto (./objetivoDoProjeto.js) — uma tabela EXPLÍCITA por
// disciplina: o vocabulário que diz "este desenho é desta disciplina", os títulos da vista principal, os
// componentes que interessam (regex → tipo normalizado, descrição padrão, forma 3D sugerida, serviço de mão de
// obra) e o que é o OBJETO do projeto: a arquitetura (disciplinas prediais — os pontos estão nas salas) ou o
// abrigo/equipamento (subestação: o que se constrói é o abrigo e o que se monta são os equipamentos).
//
// Por que existe (pedido do usuário em 09/11/2026): o DWG de uma subestação abrigada trouxe colada a planta de
// situação da arena (outro projeto, layers PDF_*) e o sistema "construiu" a arena no 3D, tirou ambientes de textos
// soltos e contou luminárias e acionadores que não são do projeto. "Avaliar o projeto e ver do que realmente se
// trata… use o mesmo fundamento para todas as disciplinas."
//
// Chaves = as de ../disciplinas.js. Os componentes das disciplinas prediais vêm da tabela ÚNICA de tipos de ponto
// (./tiposDePonto.js) — nada duplicado; a média tensão tem a lista completa da subestação aqui. Os códigos de
// serviço são os de backend/src/services/precosMaoDeObraReferencia.js (só os que existem). Nenhum dado de cliente.
const { TIPOS } = require('./tiposDePonto');
const { DISCIPLINAS } = require('../disciplinas');

// ── Média tensão / subestação (NBR 14039) ────────────────────────────────────────────────────────────
// A ordem importa: o mais específico antes (TP/TC antes de transformador; mufla antes de cabo; chave
// seccionadora antes de fusível — "CHAVE SECCIONADORA… COM SUPORTE PARA FUSÍVEL HH-16A" é a chave).
// unidade 'm' = comprimento (quantidade é medida, não contada pelos balões)
const C = (tipo, re, descricao, forma3d, servico = null, extra = {}) => ({ tipo, re, descricao, forma3d, servico, unidade: 'un', ...extra });
const COMPONENTES_MT = [
  // acessórios ANTES dos equipamentos: "ALAVANCA DE MANOBRA DA CHAVE SECCIONADORA" é a alavanca, "PLACA… ESTA CHAVE NÃO DEVE
  // SER MANOBRADA" é a placa, "CANALETA… PASSAGEM DOS CABOS" é a canaleta
  C('alavanca_manobra', /ALAVANCA|PUNHO DE MANOBRA/i, 'Alavanca de manobra da chave', 'ferragem'),
  C('placa_advertencia', /PLACA/i, 'Placa de advertência/sinalização', 'placa'),
  C('tela_insetos', /TELA.{0,20}INSETOS/i, 'Tela à prova de insetos', 'tela'),
  C('tela_protecao', /TELA\s+(DE\s+PROTE|MET[ÁA]LICA)|TELA.{0,20}COMPARTIMENTO/i, 'Tela de proteção', 'tela'),
  C('tapete', /TAPETE/i, 'Tapete isolante de borracha', 'tapete'),
  C('extintor', /EXTINTOR/i, 'Extintor de incêndio', 'extintor'),
  C('canaleta', /CANALETA/i, 'Canaleta de cabos', 'canaleta', null, { unidade: 'm' }),
  C('veneziana', /VENEZIANA|ALETAS?\s+(PARA\s+)?VENTILA|ABERTURA\s+PARA\s+VENTILA/i, 'Veneziana de ventilação', 'veneziana'),
  C('poste_entrada', /\bPOSTES?\b(?!.{0,20}ILUMINA)/i, 'Poste de entrada/entrega', 'poste'),
  C('cruzeta', /CRUZETA/i, 'Cruzeta', 'cruzeta'),
  C('mao_francesa', /M[ÃA]O.?FRANCESA/i, 'Mão francesa', 'ferragem'),
  C('isolador', /ISOLADOR(?!A)/i, 'Isolador de MT', 'isolador'),
  C('para_raios', /P[AÁ]RA.?RAIOS?/i, 'Para-raios de distribuição', 'para_raios'),
  C('chave_fusivel', /CHAVE\s+FUS[ÍI]VEL|CORTA.?CIRCUITO/i, 'Chave fusível de distribuição', 'chave_fusivel'),
  C('chave_seccionadora', /SECCIONADORA/i, 'Chave seccionadora de MT', 'chave_seccionadora'),
  C('fusivel_hh', /FUS[ÍI]VEIS?\s*(TIPO\s*)?HH|\bHH[- ]?\d+\s*A\b/i, 'Fusível HH', 'fusivel'),
  // terminação: a interna e a externa ("TERMINAL POLIMÉRICO… PARA USO EXTERNO"); "terminal aéreo" é do SPDA
  C('mufla_interna', /(MUFLA|TERMINA[ÇC][ÃA]O|TERMINAL(?!\s+A[ÉE]REO)).{0,60}(INTERN|ABRIGAD)|(INTERN[AO]).{0,20}MUFLA/i, 'Mufla/terminação de MT — uso interno', 'mufla', 'mt_terminacao', { porFase: true }),
  C('mufla_externa', /(MUFLA|TERMINA[ÇC][ÃA]O|TERMINAL(?!\s+A[ÉE]REO)).{0,60}(EXTERN|AO TEMPO)|(EXTERN[AO]).{0,20}MUFLA/i, 'Mufla/terminação de MT — uso externo', 'mufla', 'mt_terminacao', { porFase: true }),
  C('mufla', /MUFLA|TERMINA[ÇC][ÃA]O\s+(DE\s+)?MT/i, 'Mufla/terminação de MT', 'mufla', 'mt_terminacao', { porFase: true }),
  // TP e TC antes do transformador de força
  C('tp', /\bTPS?\b|TRANSFORMADOR(ES)?\s+DE\s+POTENCIAL/i, 'Transformador de potencial (TP)', 'tp'),
  C('tc', /\bTCS?\b(?!\s*\/)|TRANSFORMADOR(ES)?\s+DE\s+CORRENTE/i, 'Transformador de corrente (TC)', 'tc'),
  C('transformador', /TRANSFORMADOR|\bTRAFOS?\b/i, 'Transformador de força', 'transformador', 'mt_transformador'),
  C('disjuntor_mt', /DISJUNTOR.{0,50}(\b(13[.,]8|15|17[.,]5|24|36)\s*KV|M[ÉE]DIA TENS|\bMT\b|PVO|A V[ÁA]CUO|SF6)/i, 'Disjuntor de MT', 'disjuntor', 'mt_disjuntor_rele'),
  C('rele', /\bREL[ÉE]S?(?![A-Za-zÀ-ú])(?!.{0,5}T[ÉE]RMICO)|\bSIPRATIC|\b50\s*\/\s*51/i, 'Relé de proteção (50/51)', 'rele', 'mt_disjuntor_rele'),
  C('medicao', /MEDI[ÇC][ÃA]O|MEDIDOR|\bCJTR\b|CAIXA.{0,6}\bP4\b/i, 'Medição / caixa de medição', 'caixa_medicao'),
  C('qgbt', /\bQGBT\b|QUADRO\s+GERAL\s+(DE\s+)?B/i, 'QGBT', 'quadro', 'mt_qgbt'),
  C('disjuntor_geral_bt', /DISJUNTOR.{0,60}(CAIXA MOLDADA|TERMOMAGN|TRIPOLAR|GERAL)/i, 'Disjuntor geral de BT', 'disjuntor', 'mt_qgbt'),
  C('dps', /\bDPS\b|SUPRESSOR(ES)?\s+DE\s+SURTO/i, 'DPS', 'dps'),
  // cabos: o de MT pela classe de tensão; o de BT pelo 0,6/1 kV ou 750 V (antes do de MT: "XLPE - 0,6/1,0 KV")
  C('cabo_bt', /(CABO|CONDUTOR).{0,80}(0[,.]6\s*\/\s*1|750\s*V)/i, 'Cabo de BT', 'cabo', null, { unidade: 'm' }),
  C('cabo_mt', /(CABO|CONDUTOR).{0,80}(\b(8[,.]7\s*\/\s*)?15\s*KV|XLPE?\b|\bEPR\b)/i, 'Cabo de MT', 'cabo', 'mt_cabo', { unidade: 'm' }),
  C('barramento', /VERGALH[ÃA]O|BARRAMENTO|\bBARRAS?\s+(DE\s+)?COBRE/i, 'Barramento (vergalhão/barra de cobre)', 'barramento', null, { unidade: 'm' }),
  C('eletroduto', /ELETRODUTO/i, 'Eletroduto', 'eletroduto', 'mt_infra_subterranea', { unidade: 'm' }),
  C('caixa_inspecao', /(CAIXA|CX\.?)\s+(DE\s+)?(INSPE|ATERRAMENTO)/i, 'Caixa de inspeção do aterramento', 'caixa', 'mt_hastes'),
  C('caixa_passagem', /PO[ÇC]O\s+(TIPO\s+)?P|CAIXA\s+DE\s+PASSAGEM/i, 'Caixa de passagem / poço', 'caixa', 'mt_infra_subterranea'),
  C('haste', /\bHASTES?\b/i, 'Haste de aterramento', 'haste', 'mt_hastes'),
  C('cordoalha', /CORDOALHA|COBRE\s+NU|\bCU\s*NU\b|FIO\s+DE\s+A[ÇC]O\s+COBREADO/i, 'Cordoalha / condutor de aterramento', 'cordoalha', 'mt_malha', { unidade: 'm' }),
  C('malha', /MALHA\s+DE\s+(ATERRAMENTO|TERRA)/i, 'Malha de aterramento', 'cordoalha', 'mt_malha', { unidade: 'm' }),
  C('conector', /GRAMPO|CONECTOR/i, 'Conector / grampo', 'ferragem'),
  C('porta', /\bPORTAS?\b(?!.{0,10}(DO|DE)\s+(QUADRO|PAINEL))(?![\s-]*FUS)/i, 'Porta', 'porta'),
  C('iluminacao_se', /LUMIN[ÁA]RIA|ILUMINA[ÇC][ÃA]O|L[ÂA]MPADA|REFLETOR/i, 'Iluminação da subestação', 'luminaria'),
];

// Componentes das disciplinas prediais: a tabela única de tipos de ponto (./tiposDePonto.js). A disciplina de lá
// tem nomes próprios ('controle-acesso', 'veicular', 'iluminacao-externa') — aqui, as chaves de ../disciplinas.js
const CHAVE_TIPOS = { 'controle-acesso': 'controle_acesso', veicular: 'carregador', 'iluminacao-externa': 'iluminacao' };
const componentesDosTipos = (chave) => {
  const vistos = new Set();
  return TIPOS.filter(t => (CHAVE_TIPOS[t[3]] || t[3]) === chave && !/\(\?!\)/.test(t[1].source)).map(([, re, simbolo]) => {
    const tipo = simbolo.replace(/^HM-[A-Z]+-/, '').toLowerCase().replace(/-/g, '_');
    if (vistos.has(tipo)) return null;
    vistos.add(tipo);
    return C(tipo, re, tipo.replace(/_/g, ' '), simbolo);
  }).filter(Boolean);
};

// ── Tabela dos perfis ─────────────────────────────────────────────────────────────────────────────────
// vocabulario: [regex, peso] — cada texto que casa soma o peso (com teto por disciplina, em objetivoDoProjeto)
// carimbo: o que, escrito no carimbo/título da folha, diz a disciplina com força
// titulosPrincipal: título da vista que é o objetivo do projeto
// objeto: 'arquitetura' (predial) | 'abrigo' (subestação: o abrigo e os equipamentos)
// tipos: [regex, chave, rótulo] — o tipo do projeto dentro da disciplina (o primeiro que casa); tipoPadrao
// layers: nome de layer da disciplina (só soma como evidência)
const PERFIS = {
  media_tensao: {
    objeto: 'abrigo',
    carimbo: /SUBESTA[ÇC][ÃA]O|CABINE\s+PRIM|M[ÉE]DIA\s+TENS[ÃA]O|ENTRADA\s+(DE\s+ENERGIA\s+)?EM\s+(MT|M[ÉE]DIA)|\bSE[- ]\d{2,4}\s*KVA/i,
    vocabulario: [
      [/SUBESTA[ÇC][ÃA]O|CABINE\s+PRIM/i, 2], [/\bMUFLA|TERMINA[ÇC][ÃA]O\s+(DE\s+)?MT/i, 1], [/TRANSFORMADOR|\bTRAFO\b/i, 1],
      [/\b\d{2,4}\s*KVA\b/i, 0.5], [/\b1[13][.,][248]\s*KV\b|13\.800\s*V|\b(34[.,]5|23)\s*KV\b/i, 1], [/SECCIONADORA|FUS[ÍI]VEL\s*HH|CHAVE\s+FUS[ÍI]VEL/i, 1],
      [/P[AÁ]RA.?RAIOS?.{0,40}(KV|KA|[ÓO]XIDO)/i, 1], [/POSTE\s+DE\s+(ENTREGA|ENTRADA)|RAMAL\s+DE\s+ENTRADA/i, 1], [/MEDI[ÇC][ÃA]O\s+INDIRETA|\bCJTR\b|\bTCS?\b.{0,10}\/\s*5\s*A/i, 1],
      [/\bM[ÉE]DIA\s+TENS[ÃA]O|\bNBR\s*14039/i, 1.5], [/TAPETE\s+DE\s+BORRACHA|TAPETE\s+ISOLANTE/i, 1], [/RESIST[ÊE]NCIA\s+DE\s+ATERRAMENTO|MALHA\s+DE\s+ATERRAMENTO/i, 0.5],
    ],
    titulosPrincipal: /PLANTA.{0,25}(SUBESTA[ÇC][ÃA]O|CABINE|ABRIGO|\bSE\b)|(SUBESTA[ÇC][ÃA]O|CABINE).{0,25}PLANTA/i,
    tipos: [
      [/BLINDAD|METAL.?ENCLOSED|CUB[ÍI]CULO\s+BLINDADO/i, 'subestacao_blindada', 'subestação blindada'],
      [/SUBESTA[ÇC][ÃA]O.{0,30}(A[ÉE]REA|EM\s+POSTE|DE\s+POSTE)|TRANSFORMADOR\s+EM\s+POSTE/i, 'subestacao_poste', 'subestação em poste'],
      [/SUBESTA[ÇC][ÃA]O.{0,30}AO\s+TEMPO/i, 'subestacao_ao_tempo', 'subestação ao tempo'],
      [/SUBESTA[ÇC][ÃA]O.{0,30}ABRIGAD|ABRIGAD.{0,20}SUBESTA|CABINE\s+DE\s+ALVENARIA/i, 'subestacao_abrigada', 'subestação abrigada'],
    ],
    tipoPadrao: ['subestacao', 'subestação'],
    // o serviço de montagem da subestação inteira pelo tipo (precosMaoDeObraReferencia)
    servicoDoTipo: { subestacao_abrigada: 'mt_se_abrigada', subestacao_poste: 'mt_se_poste', subestacao_blindada: 'mt_se_blindada', subestacao_ao_tempo: 'mt_se_ao_tempo' },
    layers: /SUBEST|MUFLA|TRAFO|TRANSFORMADOR|SECCIONADORA|\bMT\b|M[ÉE]DIA.?TENS/i,
    componentes: COMPONENTES_MT,
  },
};

// Disciplinas prediais e as demais: o vocabulário e os títulos básicos; os componentes vêm de ./tiposDePonto.js
const basico = (objeto, carimbo, vocabulario, titulosPrincipal, tipoPadrao, layers, extra = {}) => ({ objeto, carimbo, vocabulario, titulosPrincipal, tipos: [], tipoPadrao, layers, ...extra });
const PLANTA_DE = (re) => new RegExp(`PLANTA.{0,30}(${re})|(${re}).{0,20}PLANTA`, 'i');
Object.assign(PERFIS, {
  eletrica: basico('arquitetura', /INSTALA[ÇC][ÕO]ES\s+EL[ÉE]TRICAS|PROJETO\s+EL[ÉE]TRICO|EL[ÉE]TRICA\s+PREDIAL|BAIXA\s+TENS[ÃA]O/i,
    [[/\bTOMADAS?\b/i, 0.3], [/INTERRUPTOR/i, 0.3], [/QUADRO\s+DE\s+(DISTRIBUI|CARGAS?)|\bQDC?\b|\bQD[-\s]?\d/i, 0.5], [/\bTU[GE]\b|CIRCUITO/i, 0.3], [/NBR\s*5410/i, 1.5], [/PONTO\s+DE\s+LUZ/i, 0.3]],
    PLANTA_DE('EL[ÉE]TRIC|TOMADAS?|FOR[ÇC]A|PONTOS'), ['eletrica_predial', 'elétrica predial'], /^(EL|ELE|ELET)[-_ ]|EL[ÉE]TRIC|TOMAD/i,
    { tipos: [[/RESID[ÊE]NCI|CASA|APARTAMENTO/i, 'eletrica_residencial', 'elétrica residencial']] }),
  iluminacao: basico('arquitetura', /LUMINOT[ÉE]CNIC|PROJETO\s+DE\s+ILUMINA/i,
    [[/LUMIN[ÁA]RIA/i, 0.3], [/\bLUX\b|ILUMIN[ÂA]NCIA|\bUGR\b/i, 1], [/NBR\s*(ISO\/CIE\s*)?8995/i, 1.5], [/DALI|DIMMER|SENSOR\s+DE\s+PRESEN/i, 0.5]],
    PLANTA_DE('ILUMINA|LUMINOT|LUMIN[ÁA]RIAS'), ['luminotecnico', 'luminotécnico'], /^(ILU|ILUM|LUM)[-_ ]|ILUMINA|LUMIN/i),
  incendio: basico('arquitetura', /INC[ÊE]NDIO|DETEC[ÇC][ÃA]O\s+E\s+ALARME|\bSDAI\b|\bSPCI\b/i,
    [[/DETECTOR/i, 0.5], [/ACIONADOR\s+MANUAL/i, 0.5], [/AVISADOR|SIRENE/i, 0.3], [/CENTRAL\s+DE\s+(ALARME|INC)/i, 1], [/NBR\s*(17240|10898)/i, 1.5], [/EMERG[ÊE]NCIA|BALIZAMENTO/i, 0.3]],
    PLANTA_DE('INC[ÊE]NDIO|DETEC|ALARME|SDAI|PREVEN'), ['deteccao_alarme', 'detecção e alarme de incêndio'], /^(INC|SDAI|SPCI|PCI)[-_ ]|INC[ÊE]NDIO|DETEC/i),
  cftv: basico('arquitetura', /\bCFTV\b|VIDEOMONITORA|C[ÂA]MERAS/i,
    [[/C[ÂA]MERA|\bDOME\b|BULLET/i, 0.5], [/\bNVR\b|\bDVR\b/i, 1], [/\bCFTV\b/i, 1], [/IEC\s*62676/i, 1.5]],
    PLANTA_DE('CFTV|C[ÂA]MERAS?|VIDEOMONITORA'), ['cftv_ip', 'CFTV'], /CFTV|C[ÂA]MERA/i),
  rede: basico('arquitetura', /CABEAMENTO\s+ESTRUTURADO|L[ÓO]GICA|REDE\s+DE\s+DADOS|TELECOM/i,
    [[/\bRJ.?45\b|CAT\.?\s?6/i, 0.5], [/PONTO\s+DE\s+(REDE|L[ÓO]GICA|DADOS)/i, 0.5], [/\bRACK\b|PATCH\s*PANEL/i, 0.5], [/NBR\s*14565/i, 1.5], [/ACCESS.?POINT|WI.?FI/i, 0.3]],
    PLANTA_DE('L[ÓO]GICA|CABEAMENTO|REDE|DADOS|TELECOM'), ['cabeamento', 'cabeamento estruturado'], /^(CAB|LOG|REDE|TI)[-_ ]|L[ÓO]GICA|DADOS|CABEAMENTO/i),
  telefonia: basico('arquitetura', /TELEFONIA|INTERFONIA|INTERFONE/i,
    [[/TELEF[ÔO]N|RAMAL|INTERFON|PORTEIRO/i, 0.5], [/\bDG\b|BLOCO\s+(IDC|BLI)/i, 0.5]],
    PLANTA_DE('TELEFONIA|INTERFON'), ['telefonia', 'telefonia/interfonia'], /^TEL[-_ ]|TELEF|INTERF/i),
  antena: basico('arquitetura', /ANTENA\s+COLETIVA|\bMATV\b|\bSMATV\b|\bCATV\b/i,
    [[/ANTENA|COAXIAL|DERIVADOR|MULTISWITCH|\bLNBF?\b/i, 0.5]],
    PLANTA_DE('ANTENA|TV'), ['antena_coletiva', 'antena coletiva'], /^ANT[-_ ]|ANTENA|CATV|MATV/i),
  controle_acesso: basico('arquitetura', /CONTROLE\s+DE\s+ACESSO/i,
    [[/LEITORA?\b|BIOM[ÉE]TRI|FACIAL/i, 0.5], [/FECHADURA|ELETRO[ÍI]M[ÃA]|BOTOEIRA|CATRACA|CANCELA/i, 0.5], [/CONTROLADORA/i, 0.5]],
    PLANTA_DE('CONTROLE\\s+DE\\s+ACESSO|ACESSO'), ['controle_acesso', 'controle de acesso'], /^(ACE|CA|CTRL)[-_ ]|ACESSO/i),
  alarme: basico('arquitetura', /ALARME\s+DE\s+INTRUS|ALARME\s+MONITORADO|SEGURAN[ÇC]A\s+ELETR/i,
    [[/\bIVP\b|INFRAVERMELHO|SENSOR\s+MAGN/i, 0.5], [/CENTRAL\s+DE\s+ALARME|TECLADO|SIRENE/i, 0.5]],
    PLANTA_DE('ALARME|INTRUS'), ['alarme_intrusao', 'alarme de intrusão'], /^(ALM|ALARME)[-_ ]|ALARME|INTRUS/i),
  spda: basico('arquitetura', /\bSPDA\b|PARA.?RAIOS|DESCARGAS\s+ATMOSF/i,
    [[/\bSPDA\b/i, 1], [/CAPTOR|FRANKLIN|TERMINAL\s+A[ÉE]REO/i, 0.5], [/DESCIDA/i, 0.5], [/NBR\s*5419/i, 1.5], [/ANEL\s+DE\s+ATERRAMENTO|CAIXA\s+DE\s+INSPE/i, 0.3]],
    PLANTA_DE('SPDA|COBERTURA|PARA.?RAIOS'), ['spda', 'SPDA'], /^SPDA[-_ ]|SPDA|PARA.?RAIO/i),
  solar: basico('arquitetura', /FOTOVOLT|USINA\s+SOLAR|ENERGIA\s+SOLAR|MICROGERA|MINIGERA/i,
    [[/M[ÓO]DULOS?\s+(FOTOVOLT|SOLAR)|\bWP\b|\bKWP\b/i, 1], [/INVERSOR/i, 0.5], [/STRING|STRINGBOX|STRING\s*BOX/i, 0.5], [/NBR\s*16690/i, 1.5]],
    PLANTA_DE('FOTOVOLT|SOLAR|M[ÓO]DULOS|ARRANJO'), ['usina_solar', 'usina solar fotovoltaica'], /^(FV|SOL)[-_ ]|FOTOVOLT|SOLAR/i,
    // usina de solo (estrutura no terreno): o objeto é o arranjo de módulos, não a arquitetura — como o abrigo da SE
    { tipos: [[/USINA\s+DE\s+SOLO|SOLO|CARPORT/i, 'usina_solo', 'usina solar de solo', 'equipamento'], [/TELHADO|COBERTURA/i, 'usina_telhado', 'usina solar em telhado']] }),
  carregador: basico('arquitetura', /RECARGA\s+DE\s+VE|CARREGADOR\s+VEICULAR|ELETROPOSTO|WALLBOX/i,
    [[/CARREGADOR|WALLBOX|RECARGA/i, 0.7], [/NBR\s*17019/i, 1.5]],
    PLANTA_DE('RECARGA|CARREGADOR|VAGAS'), ['recarga_ve', 'recarga de veículo elétrico'], /^VE[-_ ]|CARREG|WALLBOX/i),
  climatizacao: basico('arquitetura', /CLIMATIZA[ÇC][ÃA]O|AR.?CONDICIONADO|\bHVAC\b|VENTILA[ÇC][ÃA]O\s+MEC/i,
    [[/EVAPORADORA|CONDENSADORA|\bSPLIT\b|\bVRF\b|FANCOIL|CHILLER/i, 0.7], [/DUTO|DIFUSOR|GRELHA|DAMPER/i, 0.3], [/\bTR\b|BTU/i, 0.3], [/NBR\s*16401/i, 1.5]],
    PLANTA_DE('CLIMATIZA|AR.?CONDICIONADO|HVAC|DUTOS'), ['climatizacao', 'climatização'], /HVAC|AVAC|CLIMA|AR.?COND|^MEC[-_ ]/i),
  pressurizacao: basico('arquitetura', /PRESSURIZA[ÇC][ÃA]O/i,
    [[/PRESSURIZA/i, 1], [/ESCADA\s+PRESSURIZADA|DAMPER\s+DE\s+AL[ÍI]VIO|PRESSOSTATO/i, 0.7], [/NBR\s*14880/i, 1.5]],
    PLANTA_DE('PRESSURIZA|ESCADA'), ['pressurizacao', 'pressurização de escada'], /PRESSURIZ/i),
  automacao: basico('arquitetura', /AUTOMA[ÇC][ÃA]O|\bBMS\b|SUPERVIS[ÓO]RIO/i,
    [[/\bCLP\b|\bDDC\b|CONTROLADOR/i, 0.5], [/BACNET|MODBUS|KNX/i, 1]],
    PLANTA_DE('AUTOMA'), ['automacao', 'automação'], /AUTOMA|\bBMS\b|^AUT[-_ ]/i),
  eletrica_hospitalar: basico('arquitetura', /HOSPITALAR|\bIT\s+M[ÉE]DICO|NBR\s*13534/i,
    [[/\bIT\s+M[ÉE]DICO|\bDSI\b|TRANSFORMADOR\s+DE\s+SEPARA/i, 1], [/NBR\s*13534|RDC\s*50/i, 1.5], [/CENTRO\s+CIR[ÚU]RGICO|\bUTI\b/i, 0.3]],
    PLANTA_DE('HOSPITALAR|EL[ÉE]TRIC'), ['eletrica_hospitalar', 'elétrica hospitalar'], /HOSP/i),
  eletrica_industrial: basico('arquitetura', /EL[ÉE]TRICA\s+INDUSTRIAL|\bCCM\b/i,
    [[/\bCCM\b|MOTOR(ES)?\b|\bCV\b/i, 0.3], [/SOFT.?STARTER|INVERSOR\s+DE\s+FREQ|ESTRELA.?TRI[ÂA]NGULO/i, 0.7], [/BANCO\s+DE\s+CAPACITOR/i, 0.7]],
    PLANTA_DE('INDUSTRIAL|FOR[ÇC]A|MOTORES'), ['eletrica_industrial', 'elétrica industrial'], /CCM|MOTOR|^IND[-_ ]/i),
  quadros: basico('equipamento', /MONTAGEM\s+DE\s+(QUADRO|PAINEL)|LAYOUT\s+DO\s+(QUADRO|PAINEL)|FABRICA[ÇC][ÃA]O\s+DE\s+(QUADRO|PAINEL)/i,
    [[/VISTA\s+FRONTAL|PLACA\s+DE\s+MONTAGEM|CANALETA|TRILHO\s+DIN/i, 0.5], [/NBR\s*IEC\s*61439/i, 1.5]],
    /VISTA\s+(FRONTAL|INTERNA)|LAYOUT\s+(INTERNO\s+)?D[OE]\s+(QUADRO|PAINEL)|PLACA\s+DE\s+MONTAGEM/i, ['quadro', 'quadro elétrico'], /QUADRO|PAINEL/i),
});
// a rede e o cabeamento são a mesma leitura (../disciplinas.js: rede.skill = cabeamento)
PERFIS.cabeamento = PERFIS.rede;

for (const [chave, p] of Object.entries(PERFIS)) {
  if (!p.componentes) p.componentes = componentesDosTipos(chave === 'cabeamento' ? 'rede' : chave);
  p.chave = p.chave || chave;
}

// perfil da disciplina; sem perfil (disciplina nova sem linha aqui): só o vocabulário do nome
function perfilDe(chave) {
  if (PERFIS[chave]) return PERFIS[chave];
  const d = DISCIPLINAS.find(x => x.chave === chave);
  if (!d) return null;
  return { chave, objeto: 'arquitetura', carimbo: null, vocabulario: [], titulosPrincipal: null, tipos: [], tipoPadrao: [chave, d.nomes.analise], layers: null, componentes: [] };
}

// tipo normalizado de uma descrição pelo perfil (o primeiro componente que casa) — null quando nenhum
function componenteDoPerfil(perfil, texto) {
  const s = String(texto || '');
  return (perfil?.componentes || []).find(c => c.re.test(s)) || null;
}

module.exports = { PERFIS, perfilDe, componenteDoPerfil, COMPONENTES_MT };
