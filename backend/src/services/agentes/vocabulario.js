// VOCABULÁRIO do roteador de intenção do assistente (dados — extensível: o aprendido entra pela tabela
// agentes_sugestoes, tipo 'vocabulario', depois da aprovação do engenheiro).
//
// Cada intenção tem gatilhos; um gatilho é uma lista de GRUPOS e casa quando cada grupo acha um termo DIFERENTE do
// pedido. Termo terminado em * casa pelo começo ("orcament*" → orçamento, orçamentos); com espaço é frase ("o que e
// este projeto"); o resto casa a palavra inteira. Tudo já sem acento e minúsculo (textoPedido.normalizar).
//   prioridade  maior ganha quando duas intenções casam
//   exclui      termos que anulam o gatilho (ex.: "orçamento do quadro" não é projeto de quadro)
//   requer      'disciplina' (precisa citar uma disciplina) | 'arquivo_anexado' | 'contexto_projeto'
//   aceitaPergunta  vale mesmo em frase interrogativa ("o que é este projeto?")
//   exemplos    frases reais de pedido (o teste confere que cada uma cai na intenção)
const VERBOS_FAZER = ['faz*', 'faca', 'facam', 'elabor*', 'mont*', 'ger*', 'gere', 'cri*', 'prepar*', 'desenvolv*', 'sugir*', 'sugira', 'refaz*', 'tir*', 'produz*'];

const INTENCOES = [
  {
    chave: 'consultor', agente: null, decisao: 'suporte', prioridade: 100, aceitaPergunta: true,
    gatilhos: [
      [['pesquisa aprofundada', 'pesquise a fundo', 'pesquisa a fundo', 'pesquise profundamente', 'pesquisa detalhada', 'consulte o claude', 'pergunte ao claude', 'consultor', 'modo consultor', 'pesquisa profunda']],
    ],
    exemplos: ['faça uma pesquisa aprofundada sobre DPS classe I em subestação', 'consulte o Claude sobre a NR-10 para painéis'],
  },
  {
    chave: 'pesquisa_precos', agente: 'pesquisa_precos', prioridade: 95,
    gatilhos: [
      [['pesquis*', 'levant*', 'cot*', 'busc*', 'consult*', 'procur*', 'orce', 'orcar'], ['preco*', 'valor*', 'custo*']],
      [['planilha*', 'tabela*', 'lista*'], ['preco*']],
      [['pesquisa de mercado', 'qf cag', 'qfcag']],
    ],
    exemplos: ['faça a pesquisa de preço do material necessario para a montagem do quadro', 'pesquise os preços desta lista', 'monte a planilha de preços', 'cote os preços dos materiais'],
  },
  {
    chave: 'quadro_especificacao', agente: 'quadro_especificacao', prioridade: 90,
    gatilhos: [
      [['quadro*', 'painel', 'paineis', 'qgbt', 'ccm', 'qta', 'qcm'], ['especific*', 'requisit*', 'descric*', 'memorial', 'solicitad*']],
      { grupos: [VERBOS_FAZER, ['quadro*', 'painel', 'paineis', 'qgbt', 'ccm']], exclui: ['orcament*', 'proposta*', 'preco*', '3d', 'laudo*', 'inspec*'] },
    ],
    exemplos: ['De acordo com a descrição do cliente, sugira um projeto do quadro solicitado. Com projeto unifilar e 2…', 'monte o quadro desta especificação', 'projete o painel pela especificação do cliente'],
  },
  {
    chave: 'orcamento', agente: 'orcamento', prioridade: 70,
    gatilhos: [
      [VERBOS_FAZER, ['orcament*', 'proposta*']],
      [['orcar', 'orce', 'orcamentar', 'orcamente']],
    ],
    exemplos: ['gere o orçamento', 'monte a proposta deste projeto', 'orce este projeto de CFTV', 'faça o orçamento e pesquise os itens na web'],
  },
  {
    chave: 'projeto', agente: 'projeto_disciplina', prioridade: 60,
    gatilhos: [
      [[...VERBOS_FAZER, 'calcul*', 'dimension*'], ['projeto*']],
      { grupos: [['calcul*', 'dimension*', 'recalcul*']], requer: 'disciplina_ou_projeto' },
    ],
    exemplos: ['faça o projeto de CFTV', 'elabore o projeto elétrico', 'dimensione a elétrica desta obra', 'calcule o projeto'],
  },
  {
    chave: 'modelo_3d', agente: 'analise_projeto', prioridade: 50,
    gatilhos: [[['3d', 'tridimensional', 'maquete*']]],
    exemplos: ['mostre o 3D', 'abra o modelo 3D deste projeto'],
  },
  {
    chave: 'objetivo', agente: 'analise_projeto', prioridade: 45, aceitaPergunta: true,
    gatilhos: [[['o que e este projeto', 'o que e esse projeto', 'o que e o projeto', 'do que se trata', 'objetivo do projeto', 'que projeto e esse', 'que projeto e este', 'que tipo de projeto', 'entenda o projeto', 'o que tem neste projeto', 'o que tem nesse projeto']]],
    exemplos: ['o que é este projeto?', 'do que se trata esse arquivo?'],
  },
  {
    chave: 'analise', agente: 'analise_projeto', prioridade: 40,
    gatilhos: [
      [['analis*', 'leia', 'ler', 'interpret*', 'examin*', 'verifiq*', 'verificar', 'confira', 'conferir'], ['arquiv*', 'projeto*', 'pdf', 'dwg', 'dxf', 'planta*', 'desenho*', 'prancha*', 'isso', 'este', 'esse', 'esta', 'essa', 'anexo', 'documento*']],
      { grupos: [['analis*', 'leia']], requer: 'arquivo_anexado' },
    ],
    exemplos: ['analise este arquivo', 'leia o PDF anexo', 'analise o DWG de CFTV'],
  },
];

// Disciplinas citadas no pedido (frases primeiro: "alarme de incêndio" é incêndio, não alarme) — chaves da análise
const DISCIPLINAS_TERMOS = [
  ['incendio', ['alarme de incendio', 'deteccao de incendio', 'incendio', 'sdai', 'nbr 17240', 'iluminacao de emergencia']],
  ['controle_acesso', ['controle de acesso', 'catraca*', 'fechadura*', 'biometria']],
  ['media_tensao', ['media tensao', 'cabine primaria', 'subestac*', 'nbr 14039']],
  ['eletrica_hospitalar', ['hospitalar', 'it medico', 'nbr 13534']],
  ['eletrica_industrial', ['industrial', 'motores', 'correcao de fator']],
  ['rede', ['rede de dados', 'wifi', 'wi fi']],
  ['cabeamento', ['cabeamento*', 'rede logica', 'logica', 'nbr 14565']],
  ['climatizacao', ['ar condicionado', 'climatiz*', 'hvac', 'vrf', 'pmoc', 'carga termica']],
  ['pressurizacao', ['pressuriz*', 'escada pressurizada']],
  ['iluminacao', ['iluminac*', 'luminotecn*']],
  ['solar', ['fotovolt*', 'energia solar', 'usina solar', 'solar']],
  ['carregador', ['carregador*', 'wallbox', 'recarga']],
  ['spda', ['spda', 'para raios', 'pararaio*', 'nbr 5419']],
  ['telefonia', ['telefon*', 'interfon*', 'pabx', 'ramais']],
  ['antena', ['antena*', 'matv', 'tv coletiva']],
  ['cftv', ['cftv', 'camera*', 'videomonitor*', 'nvr', 'dvr']],
  ['alarme', ['alarme*', 'intrusao']],
  ['automacao', ['automac*', 'bms', 'supervisor*']],
  ['quadros', ['quadro*', 'painel', 'paineis', 'qgbt', 'ccm']],
  ['eletrica', ['eletric*', 'nbr 5410', 'tomadas', 'forca']],
];

// Pedido explícito de IA (vai direto ao modelo) e de agente (força o roteamento)
const FORCAR_IA = ['use a ia', 'usar a ia', 'use ia', 'com a ia', 'com ia', 'pergunte a ia', 'sem agente', 'conversa livre', 'responda voce', 'chame a ia'];
// Pergunta aberta: começa assim → IA (a não ser que a intenção aceite pergunta)
const COMECO_PERGUNTA = ['como', 'porque', 'por que', 'qual', 'quais', 'quanto', 'quantos', 'quantas', 'quando', 'onde', 'quem', 'explique', 'explica', 'explicar', 'o que', 'me explique', 'me diga', 'sera que', 'devo', 'vale a pena', 'existe', 'tem como'];
// Permissão de gastar cota na web (pesquisar_mercado)
const PERMITE_WEB = ['na web', 'na internet', 'internet', 'online', 'pesquisa de mercado', 'no mercado', 'lojas', 'sites'];

module.exports = { INTENCOES, DISCIPLINAS_TERMOS, FORCAR_IA, COMECO_PERGUNTA, PERMITE_WEB, VERBOS_FAZER };
