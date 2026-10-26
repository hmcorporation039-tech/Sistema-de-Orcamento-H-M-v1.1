// Disciplinas de projeto da H&M — FONTE ÚNICA. Cada área de atuação é uma
// disciplina separada (pedido do usuário, 25/10/2026): elétrica predial não se
// mistura com hospitalar ou industrial, cabeamento não se mistura com CFTV etc.
// Usada pela Análise de Projeto (restringe itens e contagens ao que foi
// marcado em cada arquivo), pelo relatório, pela tela (GET /projetos/disciplinas)
// e pelo servidor MCP.
//
// `skill`: pasta em skills/<skill> com o cálculo normativo da disciplina
// (null = skill ainda a criar). `grupo` só organiza a tela.
const DISCIPLINAS = [
  { chave: 'eletrica', nome: 'Elétrica predial/residencial (NBR 5410)', grupo: 'Elétrica', skill: 'eletrica' },
  { chave: 'eletrica_hospitalar', nome: 'Elétrica hospitalar (NBR 13534)', grupo: 'Elétrica', skill: 'eletrica_hospitalar' },
  { chave: 'eletrica_industrial', nome: 'Elétrica industrial (motores, CCM, correção de FP)', grupo: 'Elétrica', skill: 'eletrica_industrial' },
  { chave: 'media_tensao', nome: 'Média tensão / subestação (NBR 14039)', grupo: 'Elétrica', skill: 'media_tensao' },
  { chave: 'iluminacao', nome: 'Iluminação (NBR ISO/CIE 8995-1)', grupo: 'Elétrica', skill: 'iluminacao' },
  { chave: 'solar', nome: 'Energia solar fotovoltaica', grupo: 'Energia', skill: 'solar' },
  { chave: 'carregador', nome: 'Carregadores veiculares (NBR 17019)', grupo: 'Energia', skill: 'carregador' },
  { chave: 'spda', nome: 'SPDA (NBR 5419)', grupo: 'Proteção', skill: 'spda' },
  { chave: 'cabeamento', nome: 'Cabeamento estruturado — infraestrutura (NBR 14565)', grupo: 'Telecom', skill: 'cabeamento' },
  { chave: 'rede', nome: 'Redes de computadores (dados/Wi-Fi)', grupo: 'Telecom', skill: 'cabeamento' },
  { chave: 'telefonia', nome: 'Telefonia / interfonia', grupo: 'Telecom', skill: 'telefonia' },
  { chave: 'antena', nome: 'Antena / TV', grupo: 'Telecom', skill: 'antena' },
  { chave: 'cftv', nome: 'CFTV', grupo: 'Segurança', skill: 'cftv' },
  { chave: 'controle_acesso', nome: 'Controle de acesso', grupo: 'Segurança', skill: 'controle_acesso' },
  { chave: 'alarme', nome: 'Alarme de intrusão monitorado', grupo: 'Segurança', skill: 'alarme' },
  { chave: 'incendio', nome: 'Detecção e alarme de incêndio (NBR 17240)', grupo: 'Segurança', skill: 'incendio' },
  { chave: 'automacao', nome: 'Automação predial / BMS / climatização', grupo: 'Automação', skill: 'automacao' },
];

const CHAVES_VALIDAS = new Set(DISCIPLINAS.map(d => d.chave));

// Valida a lista de disciplinas vinda do frontend (form-data, chega como
// string JSON) — descarta silenciosamente chaves desconhecidas em vez de
// dar erro, pra não travar a análise por um valor inesperado.
function normalizarDisciplinas(valor) {
  let lista = valor;
  if (typeof valor === 'string') {
    try {
      lista = JSON.parse(valor);
    } catch {
      lista = [];
    }
  }
  if (!Array.isArray(lista)) return [];
  return [...new Set(lista.filter(c => CHAVES_VALIDAS.has(c)))];
}

function nomeDaDisciplina(chave) {
  return DISCIPLINAS.find(d => d.chave === chave)?.nome || chave;
}

module.exports = { DISCIPLINAS, CHAVES_VALIDAS, normalizarDisciplinas, nomeDaDisciplina };
