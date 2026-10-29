// Sugestão de disciplina para cada arquivo de um PACOTE de projeto (versão 2.3):
// pelo nome (siglas de prancha usuais: ELE, ILU, CFTV, LOG, INC, SPDA, ARQ…)
// e, sem sigla no nome, pelo conteúdo (texto do PDF; texto/layers do DXF).
// Arquitetura, estrutura, hidráulica e climatização são REFERÊNCIA: não são
// orçadas, mas o DWG delas entra na compatibilização por posição (um detector
// não pode ficar colado num difusor de ar) e serve de base do 3D.
// É sugestão: a tela mostra e o usuário confirma antes de analisar.
const { detectarDisciplinas } = require('./leitoresTabelaProjeto');
const { semAcento } = require('./texto');

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
  [/ (LOG|LOGICA|REDE|REDES|DADOS|CAB|CABEAMENTO|CAB ESTRU|TI|TELECOM|INFRA TI) /, 'cabeamento'],
  [/ (AUTOMACAO|BMS|SUPERVISORIO) /, 'automacao'],
  // "AUT" sozinho é fraco: também é código de contrato/autor no começo do nome
  // ("SENG-AUT-CLINICA…-CAB.ESTRU.pdf" virava cabeamento + automação). Só vale
  // quando nenhuma outra sigla de disciplina aparece no nome.
  [/ AUT /, 'automacao', null, true],
  [/ (CARREGADOR|RECARGA|VE|WALLBOX) /, 'carregador'],
  [/ (ILU|ILUM|ILUMINACAO|LUM|LUMINOTECNICO|LUMINOTECNICA) /, 'iluminacao'],
  [/ (HOSP|HOSPITALAR|IT MEDICO) /, 'eletrica_hospitalar'],
  // fabricação de quadro/painel (skills/quadros) — antes de industrial e elétrica
  [/ (LAYOUT DO (PAINEL|QUADRO)|PLACA DE MONTAGEM|MONTAGEM DO (PAINEL|QUADRO)|FABRICACAO DE (PAINEL|PAINEIS|QUADRO|QUADROS)|PAINEL DE AUTOMACAO|DIAGRAMA DE COMANDO|DIAGRAMA DE FORCA) /, 'quadros'],
  [/ (IND|INDUSTRIAL|CCM|MOTORES) /, 'eletrica_industrial'],
  [/ (ELE|ELET|ELETRICA|ELETRICO|IE|INST ELETRICA|FORCA|TOMADAS|QDC|QDF|QD|QDG|UNIFILAR) /, 'eletrica'],
  [/ E \d{1,3} /, 'eletrica'],
];
const ROTULO_REF = { arquitetura: 'arquitetura', estrutura: 'estrutura', hidraulica: 'hidráulica', climatizacao: 'climatização' };

// ── Quadros (fabricação de painel, skills/quadros) pelo conteúdo ──────────
// Um PDF/DWG só de desenhos de painel (layout, placa de montagem, barramento,
// bornes, CLP, diagrama de comando/força) nunca era sugerido como "quadros":
// o nome dava elétrica (QD, QDF, UNIFILAR) ou o conteúdo caía em elétrica.
// Termos de FABRICAÇÃO contam forte; os de quadro em geral (QGBT, QD-, quadro
// de distribuição, unifilar) contam fraco — uma planta elétrica comum também
// tem "QD-01", unifilar e quadro de cargas, e isso sozinho continua elétrica.
// Sem sinal de planta (sala com área, "PLANTA BAIXA") e com termos de
// fabricação dominando → quadros no lugar de elétrica; com planta e muitos
// termos de fabricação → elétrica + quadros como segunda disciplina.
const FABRICACAO_QUADRO = [
  /LAYOUT D[OE] (PAINEL|QUADRO)/, /PLACA DE MONTAGEM/, /BARRAMENTO/, /\bBORNES?\b/, /\b(CLP|PLC)\b/,
  /DIAGRAMA (DE )?(COMANDO|FORCA)/, /DIAGRAMA TRIFILAR/, /PAINEL DE AUTOMACAO/, /TRILHO DIN/, /CANALETA/,
  /VISTA (FRONTAL|INTERNA|DA PORTA)/, /\bIHM\b/, /\bCONTATOR/, /\bCCM\b/, /INVOLUCRO/, /PRENSA[ -]?CABO/,
];
const QUADRO_GERAL = /QUADRO DE DISTRIBUICAO|\bQGBT\b|\bQD[FLC]?[ -]?\d|DIAGRAMA UNIFILAR/g;
function sinaisDeQuadro(texto) {
  const t = semAcento(String(texto || '').toUpperCase());
  const fortes = FABRICACAO_QUADRO.filter(re => re.test(t)).length;
  const ocorrFortes = FABRICACAO_QUADRO.reduce((s, re) => s + (t.match(new RegExp(re.source, 'g')) || []).length, 0);
  const geral = (t.match(QUADRO_GERAL) || []).length;
  const areas = (t.match(/\bA\s*[=:]\s*\d+[.,]?\d*\s*M[²2]/g) || []).length;
  const planta = /PLANTA BAIXA|PLANTA DO (TERREO|PAVIMENTO)|PAVIMENTO TIPO/.test(t) || areas >= 2;
  return { fortes, total: ocorrFortes + geral, planta };
}
function comQuadros(r, texto) {
  if (!texto || r.referencia) return r;
  const q = sinaisDeQuadro(texto);
  // painel de automação (CLP, IHM) também é fabricação de quadro quando não há planta
  const ele = (d) => ['eletrica', 'eletrica_industrial', 'automacao'].includes(d);
  if (q.fortes >= 2 && q.total >= 5 && !q.planta && (!r.disciplinas.length || r.disciplinas.every(ele) || r.disciplinas.includes('quadros'))) {
    return { ...r, disciplinas: ['quadros'], motivo: 'desenho de quadro/painel (layout, montagem, comando) sem planta — fabricação de quadros' };
  }
  if (q.fortes >= 3 && q.planta && r.disciplinas.some(ele) && !r.disciplinas.includes('quadros')) {
    return { ...r, disciplinas: [...r.disciplinas, 'quadros'], motivo: `${r.motivo}; também tem desenho de fabricação de quadro` };
  }
  return r;
}

// texto: conteúdo já lido (PDF/DXF) ou null (DWG: só pelo nome)
function sugerirDisciplinas(nome, texto = null) {
  return comQuadros(sugerirPeloNomeOuTexto(nome, texto), texto);
}
function sugerirPeloNomeOuTexto(nome, texto) {
  const n = normalizar(String(nome).replace(/\.[a-z0-9]+$/i, ''));
  const disciplinas = [];
  const fracas = [];
  let referencia = null;
  for (const [re, disc, ref, fraca] of PELO_NOME) {
    if (!re.test(n)) continue;
    if (fraca) { if (!fracas.includes(disc)) fracas.push(disc); continue; }
    if (disc && !disciplinas.includes(disc)) disciplinas.push(disc);
    if (ref && !referencia) referencia = ref;
  }
  if (!disciplinas.length && !referencia) disciplinas.push(...fracas);
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
