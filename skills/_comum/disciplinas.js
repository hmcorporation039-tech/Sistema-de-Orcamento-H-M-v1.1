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
//   nomes.laudo   — nome completo (projetos e laudos por disciplina)
//   nomes.analise — nome curto da análise de projeto e do relatório
//   nomes.servico — nome na base de serviços de mão de obra (tela de preços, composições)
//   subgrupo.material / subgrupo.servico — subgrupo do item na proposta. JÁ
//     GRAVADO em propostas antigas: mudar o texto quebra o reconhecimento —
//     acrescente o antigo em `aliases`.
//   aliases   — outros nomes de subgrupo que valem como esta disciplina
const DISCIPLINAS = [
  { chave: 'eletrica', pasta: 'eletrica', skill: 'eletrica', laudo: true, grupo: 'Elétrica', sigla: 'ELE',
    nomes: { laudo: 'Elétrica predial (NBR 5410)', analise: 'Elétrica predial/residencial (NBR 5410)', servico: 'Elétrica (infraestrutura)' },
    subgrupo: { material: 'Elétrica', servico: 'Elétrica' }, aliases: ['Elétrica (infraestrutura)', 'Infraestrutura elétrica'] },
  { chave: 'eletrica_hospitalar', pasta: 'eletrica-hospitalar', skill: 'eletrica_hospitalar', laudo: true, grupo: 'Elétrica', sigla: 'HOSP',
    nomes: { laudo: 'Elétrica hospitalar (NBR 13534 / RDC 50)', analise: 'Elétrica hospitalar (NBR 13534)', servico: 'Elétrica hospitalar' },
    subgrupo: { material: 'Elétrica', servico: 'Elétrica hospitalar' }, aliases: [] },
  { chave: 'eletrica_industrial', pasta: 'eletrica-industrial', skill: 'eletrica_industrial', laudo: true, grupo: 'Elétrica', sigla: 'IND',
    nomes: { laudo: 'Elétrica industrial (motores, CCM, correção de FP, curto-circuito)', analise: 'Elétrica industrial (motores, CCM, correção de FP)', servico: 'Elétrica industrial' },
    subgrupo: { material: 'Elétrica', servico: 'Elétrica industrial' }, aliases: [] },
  { chave: 'media_tensao', pasta: 'media-tensao', skill: 'media_tensao', laudo: true, grupo: 'Elétrica', sigla: 'MT',
    nomes: { laudo: 'Média tensão — subestação (NBR 14039)', analise: 'Média tensão / subestação (NBR 14039)', servico: 'Média tensão / subestação' },
    subgrupo: { material: 'Elétrica', servico: 'Média tensão' }, aliases: ['Subestação', 'Média tensão / subestação'] },
  { chave: 'iluminacao', pasta: 'iluminacao', skill: 'iluminacao', laudo: true, grupo: 'Elétrica', sigla: 'ILUM',
    nomes: { laudo: 'Iluminação — luminotécnico e automação (NBR ISO/CIE 8995-1)', analise: 'Iluminação (NBR ISO/CIE 8995-1)', servico: 'Iluminação' },
    subgrupo: { material: 'Elétrica', servico: 'Iluminação' }, aliases: [] },
  { chave: 'solar', pasta: 'solar', skill: 'solar', laudo: true, grupo: 'Energia', sigla: 'SOL',
    nomes: { laudo: 'Usina solar fotovoltaica (NBR 16690 / REN 1000)', analise: 'Energia solar fotovoltaica', servico: 'Usina solar fotovoltaica' },
    subgrupo: { material: 'Elétrica', servico: 'Solar' }, aliases: ['Energia solar', 'Usina solar fotovoltaica', 'Fotovoltaico'] },
  { chave: 'carregador', pasta: 'carregador', skill: 'carregador', laudo: true, grupo: 'Energia', sigla: 'VE',
    nomes: { laudo: 'Carregador veicular (NBR 17019)', analise: 'Carregadores veiculares (NBR 17019)', servico: 'Recarga de veículo elétrico — Laudos e projetos' },
    subgrupo: { material: 'Elétrica', servico: 'Recarga de veículo elétrico' }, aliases: ['Carregador veicular', 'Recarga de veículo elétrico — Laudos e projetos'] },
  { chave: 'spda', pasta: 'spda', skill: 'spda', laudo: true, grupo: 'Proteção', sigla: 'SPDA',
    nomes: { laudo: 'SPDA — para-raios (NBR 5419:2026)', analise: 'SPDA (NBR 5419)', servico: 'SPDA (para-raios) — Laudos e projetos' },
    subgrupo: { material: 'Elétrica', servico: 'SPDA' }, aliases: ['Para-raios', 'SPDA (para-raios)', 'SPDA (para-raios) — Laudos e projetos'] },
  { chave: 'cabeamento', pasta: 'cabeamento', skill: 'cabeamento', laudo: true, grupo: 'Telecom', sigla: 'CAB',
    nomes: { laudo: 'Cabeamento estruturado (NBR 14565)', analise: 'Cabeamento estruturado — infraestrutura (NBR 14565)', servico: 'Infra. de Cabeamento Estruturado' },
    subgrupo: { material: 'Redes / Cabeamento Estruturado', servico: 'Cabeamento Estruturado' }, aliases: ['Infra. de Cabeamento Estruturado', 'Infraestrutura de Cabeamento Estruturado'] },
  { chave: 'rede', pasta: null, skill: 'cabeamento', laudo: false, grupo: 'Telecom', sigla: 'REDE',
    nomes: { laudo: 'Redes de computadores (dados/Wi-Fi)', analise: 'Redes de computadores (dados/Wi-Fi)', servico: 'Redes de Computadores (dados)' },
    subgrupo: { material: 'Redes / Cabeamento Estruturado', servico: 'Redes' }, aliases: ['Rede', 'Redes de Computadores (dados)', 'Redes / Cabeamento Estruturado', 'Dados'] },
  { chave: 'telefonia', pasta: 'telefonia', skill: 'telefonia', laudo: true, grupo: 'Telecom', sigla: 'TEL',
    nomes: { laudo: 'Telefonia e interfonia (práticas Telebrás / NBR 14565 / NBR 14306)', analise: 'Telefonia / interfonia', servico: 'Telefonia e interfonia' },
    subgrupo: { material: 'Interfonia', servico: 'Telefonia' }, aliases: ['Interfonia', 'Telefonia e interfonia', 'Telefonia / Interfonia'] },
  { chave: 'antena', pasta: 'antena', skill: 'antena', laudo: true, grupo: 'Telecom', sigla: 'ANT',
    nomes: { laudo: 'Antena coletiva / TV (ISDB-Tb e satélite)', analise: 'Antena / TV', servico: 'Antena coletiva / TV' },
    subgrupo: { material: 'Antena coletiva', servico: 'Antena' }, aliases: ['Antena/TV', 'Antena coletiva', 'Antena coletiva / TV', 'TV'] },
  { chave: 'cftv', pasta: 'cftv', skill: 'cftv', laudo: true, grupo: 'Segurança', sigla: 'CFTV',
    nomes: { laudo: 'CFTV (IEC 62676-4 / LGPD)', analise: 'CFTV', servico: 'CFTV' },
    subgrupo: { material: 'CFTV', servico: 'CFTV' }, aliases: ['Câmeras', 'Videomonitoramento'] },
  { chave: 'controle_acesso', pasta: 'controle-acesso', skill: 'controle_acesso', laudo: true, grupo: 'Segurança', sigla: 'ACE',
    nomes: { laudo: 'Controle de acesso (IEC 60839-11 / NBR 9077 / LGPD)', analise: 'Controle de acesso', servico: 'Controle de acesso' },
    subgrupo: { material: 'Controle de acesso', servico: 'Controle de Acesso' }, aliases: [] },
  { chave: 'alarme', pasta: 'alarme', skill: 'alarme', laudo: true, grupo: 'Segurança', sigla: 'ALM',
    nomes: { laudo: 'Alarme de intrusão monitorado (EN 50131 / EN 50136)', analise: 'Alarme de intrusão monitorado', servico: 'Alarme' },
    subgrupo: { material: 'Alarme', servico: 'Alarme' }, aliases: ['Alarme de intrusão'] },
  { chave: 'incendio', pasta: 'incendio', skill: 'incendio', laudo: true, grupo: 'Segurança', sigla: 'INC',
    nomes: { laudo: 'Incêndio — detecção, alarme e iluminação de emergência (NBR 17240 / NBR 10898)', analise: 'Detecção e alarme de incêndio (NBR 17240)', servico: 'Incêndio (detecção, alarme e iluminação de emergência)' },
    subgrupo: { material: 'Incêndio', servico: 'Incêndio' }, aliases: ['Alarme de incêndio', 'Incêndio (detecção, alarme e iluminação de emergência)'] },
  { chave: 'pressurizacao', pasta: 'pressurizacao', skill: 'pressurizacao', laudo: true, grupo: 'Segurança', sigla: 'PRES',
    nomes: { laudo: 'Pressurização de escadas — controle de fumaça e automação (NBR 14880 / CBMDF)', analise: 'Pressurização de escadas (NBR 14880)', servico: 'Pressurização de escadas' },
    subgrupo: { material: 'Pressurização', servico: 'Pressurização de escadas' }, aliases: ['Pressurização', 'Escada pressurizada'] },
  { chave: 'automacao', pasta: 'automacao', skill: 'automacao', laudo: true, grupo: 'Automação', sigla: 'AUT',
    nomes: { laudo: 'Automação — BMS, climatização e residencial (ISO 16484 / ISO 52120-1)', analise: 'Automação predial / BMS / climatização', servico: 'Automação' },
    subgrupo: { material: 'Automação', servico: 'Automação' }, aliases: ['Automação predial', 'Automação residencial'] },
];

// "Outros": não é disciplina de projeto, mas existe nos kits e na base de serviços
const OUTROS = { chave: 'outros', sigla: 'OUT', nomes: { servico: 'Outros serviços' }, subgrupo: { material: 'Outros', servico: 'Outros' }, aliases: [] };

const porChave = (chave) => DISCIPLINAS.find(d => d.chave === chave) || (chave === 'outros' ? OUTROS : null);
// { chave: valor } de um campo, com "outros" quando ele tiver o campo
const mapa = (fn, { comOutros = false } = {}) => Object.fromEntries([...DISCIPLINAS, ...(comOutros ? [OUTROS] : [])].map(d => [d.chave, fn(d)]));

module.exports = { DISCIPLINAS, OUTROS, porChave, mapa };
