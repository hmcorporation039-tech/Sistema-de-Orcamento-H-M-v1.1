// Sugestão de disciplina para cada arquivo de um PACOTE de projeto (versão 2.3):
// pelo nome (siglas de prancha usuais: ELE, ILU, CFTV, LOG, INC, SPDA, ARQ…)
// e, sem sigla no nome, pelo conteúdo (texto do PDF; texto/layers do DXF).
// Arquitetura, estrutura, hidráulica e climatização são REFERÊNCIA: não são
// orçadas, mas o DWG delas entra na compatibilização por posição (um detector
// não pode ficar colado num difusor de ar) e serve de base do 3D.
// É sugestão: a tela mostra e o usuário confirma antes de analisar.
const { detectarDisciplinas } = require('./leitoresTabelaProjeto');

// com espaços nas pontas: as regras casam palavras inteiras (" E 01 ")
const normalizar = (s) => ` ${require('./texto').chaveNome(s)} `;

// [regex sobre o nome normalizado (com espaços nas pontas), disciplina | null, tipo de referência]
const PELO_NOME = [
  [/ (ARQ|ARQUITETURA|ARQUITETONICO|LAYOUT|LEIAUTE|LYT|PLANTA BAIXA|PB) /, null, 'arquitetura'],
  [/ (EST|ESTRUTURA|ESTRUTURAL|FORMA|FORMAS|FUNDACAO|FUNDACOES|ARMACAO) /, null, 'estrutura'],
  [/ (HID|HIDR|HIDRO|HIDRAULICA|HIDROSSANITARIO|SAN|SANITARIO|ESG|ESGOTO|PLUVIAL|AGUA FRIA|AF|AQ|GAS|GLP) /, null, 'hidraulica'],
  [/ (MEC|HVAC|CLIM|CLIMATIZACAO|AR CONDICIONADO|AC|VENT|VENTILACAO|EXAUSTAO|DUTOS) /, null, 'climatizacao'],
  // prancha no padrão de disciplina por letra ("E.01", "M.02"): E = elétrica, M = mecânica/climatização
  [/ M \d{1,3} /, null, 'climatizacao'],
  [/ (PRESS|PRESSURIZACAO) /, 'pressurizacao'],
  [/ (SPDA|PARA RAIOS|PARARAIOS|ATERRAMENTO) /, 'spda'],
  [/ (SE|SUBESTACAO|CABINE|MT|MEDIA TENSAO) /, 'media_tensao'],
  [/ (FV|SOLAR|FOTOVOLTAICO|FOTOVOLTAICA|UFV) /, 'solar'],
  [/ (CFTV|CFT|CAMERAS?|VIDEOMONITORAMENTO|VIGILANCIA) /, 'cftv'],
  [/ (ALM|ALARME|INTRUSAO) /, 'alarme'],
  [/ (CA|ACESSO|CONTROLE DE ACESSO|CATRACAS?) /, 'controle_acesso'],
  [/ (INC|INCENDIO|SDAI|DETECCAO|PCI|PPCI|ALARME DE INCENDIO) /, 'incendio'],
  [/ (TEL|TELEFONIA|INTERFONE|INTERFONIA|PABX) /, 'telefonia'],
  [/ (TV|ANT|ANTENA|CATV|SMATV|MATV) /, 'antena'],
  [/ (LOG|LOGICA|REDE|REDES|DADOS|CAB|CABEAMENTO|TI|TELECOM|INFRA TI) /, 'cabeamento'],
  [/ (AUT|AUTOMACAO|BMS|SUPERVISORIO) /, 'automacao'],
  [/ (CARREGADOR|RECARGA|VE|WALLBOX) /, 'carregador'],
  [/ (ILU|ILUM|ILUMINACAO|LUM|LUMINOTECNICO|LUMINOTECNICA) /, 'iluminacao'],
  [/ (HOSP|HOSPITALAR|IT MEDICO) /, 'eletrica_hospitalar'],
  [/ (IND|INDUSTRIAL|CCM|MOTORES) /, 'eletrica_industrial'],
  [/ (ELE|ELET|ELETRICA|ELETRICO|IE|INST ELETRICA|FORCA|TOMADAS|QDC|QDF|QD|QDG|UNIFILAR) /, 'eletrica'],
  [/ E \d{1,3} /, 'eletrica'],
];
const ROTULO_REF = { arquitetura: 'arquitetura', estrutura: 'estrutura', hidraulica: 'hidráulica', climatizacao: 'climatização' };

// texto: conteúdo já lido (PDF/DXF) ou null (DWG: só pelo nome)
function sugerirDisciplinas(nome, texto = null) {
  const n = normalizar(String(nome).replace(/\.[a-z0-9]+$/i, ''));
  const disciplinas = [];
  let referencia = null;
  for (const [re, disc, ref] of PELO_NOME) {
    if (!re.test(n)) continue;
    if (disc && !disciplinas.includes(disc)) disciplinas.push(disc);
    if (ref && !referencia) referencia = ref;
  }
  if (disciplinas.length) return { disciplinas, referencia: false, tipoReferencia: null, motivo: 'pela sigla no nome do arquivo' };
  if (referencia) return { disciplinas: [], referencia: true, tipoReferencia: referencia, motivo: `${ROTULO_REF[referencia]} — referência para a compatibilização (não é orçada)` };
  if (texto) {
    const det = detectarDisciplinas(texto);
    const total = det.reduce((s, d) => s + d.ocorrencias, 0);
    // as que somam ao menos 25 % das palavras típicas encontradas (no máximo 3)
    const fortes = det.filter(d => d.ocorrencias >= 3 && d.ocorrencias / total >= 0.25).slice(0, 3).map(d => (d.chave === 'rede' ? 'cabeamento' : d.chave));
    if (fortes.length) return { disciplinas: [...new Set(fortes)], referencia: false, tipoReferencia: null, motivo: 'pelo conteúdo do arquivo' };
  }
  return { disciplinas: [], referencia: false, tipoReferencia: null, motivo: 'não identificada — marque a disciplina' };
}

module.exports = { sugerirDisciplinas };
