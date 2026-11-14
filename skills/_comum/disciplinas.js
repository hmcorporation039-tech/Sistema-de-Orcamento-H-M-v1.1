// REGISTRO ÚNICO das disciplinas da H&M (revisão de 28/10/2026). Antes a mesma
// lista estava copiada em uns 10 lugares (laudos, análise, subgrupos da
// proposta, siglas dos kits, base de serviços, tela…), com nomes que já
// divergiam; criar uma disciplina nova obrigava a mexer em todos. Agora cada
// lugar DERIVA daqui. Sem dependências (o backend e o frontend, pela API, leem).
//
// Campos:
//   chave     — identificador gravado em tudo (não muda nunca)
//   pasta     — skill em skills/<pasta> com o cálculo normativo (null = usa a de `skill`)
//   skill     — chave da disciplina cujo motor atende esta (rede → cabeamento)
//   laudo     — tem projeto/laudo por disciplina (aba Projetos/Laudos)
//   grupo     — só organiza a tela da análise
//   sigla     — código dos kits (KIT-<SIGLA>-NN)
//   curto     — nome curto na legenda do 3D, na paleta de componentes e no Mapa do CAD (2.37)
//   cor       — cor da disciplina no 3D, no marcador do componente inserido e nas telas (2.37: antes o 3D, o
//     editor de componentes e o Mapa do CAD tinham cada um a sua tabela, com cores diferentes)
//   nomes.laudo   — nome completo (projetos e laudos por disciplina)
//   nomes.analise — nome curto da análise de projeto e do relatório
//   nomes.servico — nome na base de serviços de mão de obra (tela de preços, composições)
//   subgrupo.material / subgrupo.servico — subgrupo do item na proposta. JÁ
//     GRAVADO em propostas antigas: mudar o texto quebra o reconhecimento —
//     acrescente o antigo em `aliases`.
//   aliases   — outros nomes de subgrupo que valem como esta disciplina (inclusive
//     os que o orçamento das skills grava: 'Usina solar', 'Recarga de VE',
//     'Medição de iluminação')
const DISCIPLINAS = [
  { chave: 'eletrica', curto: 'Elétrica', cor: '#ff9f43', pasta: 'eletrica', skill: 'eletrica', laudo: true, grupo: 'Elétrica', sigla: 'ELE',
    nomes: { laudo: 'Elétrica predial (NBR 5410)', analise: 'Elétrica predial/residencial (NBR 5410)', servico: 'Elétrica (infraestrutura)' },
    subgrupo: { material: 'Elétrica', servico: 'Elétrica' }, aliases: ['Elétrica (infraestrutura)', 'Infraestrutura elétrica'] },
  { chave: 'eletrica_hospitalar', curto: 'Elétrica hospitalar', cor: '#ff7a59', pasta: 'eletrica-hospitalar', skill: 'eletrica_hospitalar', laudo: true, grupo: 'Elétrica', sigla: 'HOSP',
    nomes: { laudo: 'Elétrica hospitalar (NBR 13534 / RDC 50)', analise: 'Elétrica hospitalar (NBR 13534)', servico: 'Elétrica hospitalar' },
    subgrupo: { material: 'Elétrica', servico: 'Elétrica hospitalar' }, aliases: [] },
  { chave: 'eletrica_industrial', curto: 'Elétrica industrial', cor: '#ff8c5a', pasta: 'eletrica-industrial', skill: 'eletrica_industrial', laudo: true, grupo: 'Elétrica', sigla: 'IND',
    nomes: { laudo: 'Elétrica industrial (motores, CCM, correção de FP, curto-circuito)', analise: 'Elétrica industrial (motores, CCM, correção de FP)', servico: 'Elétrica industrial' },
    subgrupo: { material: 'Elétrica', servico: 'Elétrica industrial' }, aliases: [] },
  { chave: 'media_tensao', curto: 'Média tensão / subestação', cor: '#e8a33d', pasta: 'media-tensao', skill: 'media_tensao', laudo: true, grupo: 'Elétrica', sigla: 'MT',
    nomes: { laudo: 'Média tensão — subestação (NBR 14039)', analise: 'Média tensão / subestação (NBR 14039)', servico: 'Média tensão / subestação' },
    subgrupo: { material: 'Elétrica', servico: 'Média tensão' }, aliases: ['Subestação', 'Média tensão / subestação'] },
  { chave: 'quadros', curto: 'Quadros elétricos', cor: '#f0b35a', pasta: 'quadros', skill: 'quadros', laudo: true, grupo: 'Elétrica', sigla: 'QD',
    nomes: { laudo: 'Quadros elétricos e de automação — projeto de fabricação (NBR IEC 61439)', analise: 'Quadros elétricos e de automação (fabricação — NBR IEC 61439)', servico: 'Montagem de quadros elétricos e de automação' },
    subgrupo: { material: 'Quadros elétricos', servico: 'Montagem de quadros' }, aliases: ['Quadros elétricos', 'Montagem de painéis', 'Painéis elétricos', 'Montagem de quadros elétricos e de automação'] },
  { chave: 'iluminacao', curto: 'Iluminação', cor: '#ffe27a', pasta: 'iluminacao', skill: 'iluminacao', laudo: true, grupo: 'Elétrica', sigla: 'ILUM',
    nomes: { laudo: 'Iluminação — luminotécnico e automação (NBR ISO/CIE 8995-1)', analise: 'Iluminação (NBR ISO/CIE 8995-1)', servico: 'Iluminação' },
    subgrupo: { material: 'Elétrica', servico: 'Iluminação' }, aliases: ['Medição de iluminação'] },
  { chave: 'solar', curto: 'Solar', cor: '#f6c90e', pasta: 'solar', skill: 'solar', laudo: true, grupo: 'Energia', sigla: 'SOL',
    nomes: { laudo: 'Usina solar fotovoltaica (NBR 16690 / REN 1000)', analise: 'Energia solar fotovoltaica', servico: 'Usina solar fotovoltaica' },
    subgrupo: { material: 'Elétrica', servico: 'Solar' }, aliases: ['Energia solar', 'Usina solar fotovoltaica', 'Fotovoltaico', 'Usina solar'] },
  { chave: 'carregador', curto: 'Recarga veicular', cor: '#a4e05a', pasta: 'carregador', skill: 'carregador', laudo: true, grupo: 'Energia', sigla: 'VE',
    nomes: { laudo: 'Carregador veicular (NBR 17019)', analise: 'Carregadores veiculares (NBR 17019)', servico: 'Recarga de veículo elétrico — Laudos e projetos' },
    subgrupo: { material: 'Elétrica', servico: 'Recarga de veículo elétrico' }, aliases: ['Carregador veicular', 'Recarga de veículo elétrico — Laudos e projetos', 'Recarga de VE'] },
  { chave: 'spda', curto: 'SPDA', cor: '#bfc5cc', pasta: 'spda', skill: 'spda', laudo: true, grupo: 'Proteção', sigla: 'SPDA',
    nomes: { laudo: 'SPDA — para-raios (NBR 5419:2026)', analise: 'SPDA (NBR 5419)', servico: 'SPDA (para-raios) — Laudos e projetos' },
    subgrupo: { material: 'Elétrica', servico: 'SPDA' }, aliases: ['Para-raios', 'SPDA (para-raios)', 'SPDA (para-raios) — Laudos e projetos'] },
  { chave: 'cabeamento', curto: 'Cabeamento estruturado', cor: '#4fa3ff', pasta: 'cabeamento', skill: 'cabeamento', laudo: true, grupo: 'Telecom', sigla: 'CAB',
    nomes: { laudo: 'Cabeamento estruturado (NBR 14565)', analise: 'Cabeamento estruturado — infraestrutura (NBR 14565)', servico: 'Infra. de Cabeamento Estruturado' },
    subgrupo: { material: 'Redes / Cabeamento Estruturado', servico: 'Cabeamento Estruturado' }, aliases: ['Infra. de Cabeamento Estruturado', 'Infraestrutura de Cabeamento Estruturado'] },
  { chave: 'rede', curto: 'Rede (cabeamento)', cor: '#4fa3ff', pasta: null, skill: 'cabeamento', laudo: false, grupo: 'Telecom', sigla: 'REDE',
    nomes: { laudo: 'Redes de computadores (dados/Wi-Fi)', analise: 'Redes de computadores (dados/Wi-Fi)', servico: 'Redes de Computadores (dados)' },
    subgrupo: { material: 'Redes / Cabeamento Estruturado', servico: 'Redes' }, aliases: ['Rede', 'Redes de Computadores (dados)', 'Redes / Cabeamento Estruturado', 'Dados'] },
  { chave: 'telefonia', curto: 'Telefonia', cor: '#c49a6c', pasta: 'telefonia', skill: 'telefonia', laudo: true, grupo: 'Telecom', sigla: 'TEL',
    nomes: { laudo: 'Telefonia e interfonia (práticas Telebrás / NBR 14565 / NBR 14306)', analise: 'Telefonia / interfonia', servico: 'Telefonia e interfonia' },
    subgrupo: { material: 'Interfonia', servico: 'Telefonia' }, aliases: ['Interfonia', 'Telefonia e interfonia', 'Telefonia / Interfonia'] },
  { chave: 'antena', curto: 'Antena / TV', cor: '#3fd0c0', pasta: 'antena', skill: 'antena', laudo: true, grupo: 'Telecom', sigla: 'ANT',
    nomes: { laudo: 'Antena coletiva / TV (ISDB-Tb e satélite)', analise: 'Antena / TV', servico: 'Antena coletiva / TV' },
    subgrupo: { material: 'Antena coletiva', servico: 'Antena' }, aliases: ['Antena/TV', 'Antena coletiva', 'Antena coletiva / TV', 'TV'] },
  { chave: 'cftv', curto: 'CFTV', cor: '#ff5c8a', pasta: 'cftv', skill: 'cftv', laudo: true, grupo: 'Segurança', sigla: 'CFTV',
    nomes: { laudo: 'CFTV (IEC 62676-4 / LGPD)', analise: 'CFTV', servico: 'CFTV' },
    subgrupo: { material: 'CFTV', servico: 'CFTV' }, aliases: ['Câmeras', 'Videomonitoramento'] },
  { chave: 'controle_acesso', curto: 'Controle de acesso', cor: '#5ee38a', pasta: 'controle-acesso', skill: 'controle_acesso', laudo: true, grupo: 'Segurança', sigla: 'ACE',
    nomes: { laudo: 'Controle de acesso (IEC 60839-11 / NBR 9077 / LGPD)', analise: 'Controle de acesso', servico: 'Controle de acesso' },
    subgrupo: { material: 'Controle de acesso', servico: 'Controle de Acesso' }, aliases: [] },
  { chave: 'alarme', curto: 'Alarme', cor: '#b388ff', pasta: 'alarme', skill: 'alarme', laudo: true, grupo: 'Segurança', sigla: 'ALM',
    nomes: { laudo: 'Alarme de intrusão monitorado (EN 50131 / EN 50136)', analise: 'Alarme de intrusão monitorado', servico: 'Alarme' },
    subgrupo: { material: 'Alarme', servico: 'Alarme' }, aliases: ['Alarme de intrusão'] },
  { chave: 'incendio', curto: 'Incêndio', cor: '#ff4b3e', pasta: 'incendio', skill: 'incendio', laudo: true, grupo: 'Segurança', sigla: 'INC',
    nomes: { laudo: 'Incêndio — detecção, alarme e iluminação de emergência (NBR 17240 / NBR 10898)', analise: 'Detecção e alarme de incêndio (NBR 17240)', servico: 'Incêndio (detecção, alarme e iluminação de emergência)' },
    subgrupo: { material: 'Incêndio', servico: 'Incêndio' }, aliases: ['Alarme de incêndio', 'Incêndio (detecção, alarme e iluminação de emergência)'] },
  { chave: 'pressurizacao', curto: 'Pressurização', cor: '#9fb4ff', pasta: 'pressurizacao', skill: 'pressurizacao', laudo: true, grupo: 'Segurança', sigla: 'PRES',
    nomes: { laudo: 'Pressurização de escadas — controle de fumaça e automação (NBR 14880 / CBMDF)', analise: 'Pressurização de escadas (NBR 14880)', servico: 'Pressurização de escadas' },
    subgrupo: { material: 'Pressurização', servico: 'Pressurização de escadas' }, aliases: ['Pressurização', 'Escada pressurizada'] },
  { chave: 'automacao', curto: 'Automação', cor: '#7fe0ff', pasta: 'automacao', skill: 'automacao', laudo: true, grupo: 'Automação', sigla: 'AUT',
    nomes: { laudo: 'Automação — BMS, climatização e residencial (ISO 16484 / ISO 52120-1)', analise: 'Automação predial / BMS / climatização', servico: 'Automação' },
    subgrupo: { material: 'Automação', servico: 'Automação' }, aliases: ['Automação predial', 'Automação residencial'] },
  { chave: 'climatizacao', curto: 'Climatização', cor: '#5ec8f2', pasta: 'climatizacao', skill: 'climatizacao', laudo: true, grupo: 'Climatização', sigla: 'CLIM',
    nomes: { laudo: 'Climatização — carga térmica, VRF/self/chiller, VAV e PMOC (NBR 16401 / Lei 13.589)', analise: 'Climatização / ar-condicionado (NBR 16401)', servico: 'Climatização' },
    subgrupo: { material: 'Climatização', servico: 'Climatização' }, aliases: ['Ar-condicionado', 'Ar condicionado', 'HVAC', 'PMOC'] },
];

// "Outros": não é disciplina de projeto, mas existe nos kits e na base de serviços
const OUTROS = { chave: 'outros', sigla: 'OUT', nomes: { servico: 'Outros serviços' }, subgrupo: { material: 'Outros', servico: 'Outros' }, aliases: [] };

// Nomes antigos de disciplina ainda gravados (classificador de pontos, Mapa do CAD, análises e caches anteriores à
// unificação) → chave do registro. Usado pelo 3D e pelas telas: antes cada um tinha a sua tradução.
const ALIASES_CHAVE = { 'controle-acesso': 'controle_acesso', veicular: 'carregador', 'eletrica-hospitalar': 'eletrica_hospitalar' };
// Chaves que não são disciplina de projeto, mas aparecem no 3D e no Mapa do CAD (postes e caixas da área externa)
const EXTRAS_VISUAIS = [{ chave: 'iluminacao-externa', curto: 'Iluminação externa', cor: '#ffb84d' }];

const porChave = (chave) => DISCIPLINAS.find(d => d.chave === chave) || (chave === 'outros' ? OUTROS : null);
// { chave: valor } de um campo, com "outros" quando ele tiver o campo
const mapa = (fn, { comOutros = false } = {}) => Object.fromEntries([...DISCIPLINAS, ...(comOutros ? [OUTROS] : [])].map(d => [d.chave, fn(d)]));
// { curto, cor } de uma chave (aceita os nomes antigos e os extras); null quando não é conhecida
function visual(chave) {
  const k = ALIASES_CHAVE[chave] || chave;
  const d = DISCIPLINAS.find(x => x.chave === k) || EXTRAS_VISUAIS.find(x => x.chave === k);
  return d ? { curto: d.curto, cor: d.cor } : null;
}

module.exports = { DISCIPLINAS, OUTROS, ALIASES_CHAVE, EXTRAS_VISUAIS, porChave, mapa, visual };
