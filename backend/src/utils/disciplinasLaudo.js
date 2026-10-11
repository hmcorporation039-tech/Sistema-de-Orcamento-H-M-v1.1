const path = require('path');

// Disciplinas de laudo/projeto da aba Análise de Projeto → "Laudos e projetos".
// Cada disciplina pronta é uma skill em <raiz>/skills/<pasta>, com o contrato
// de skills/spda/scripts/lib/index.js (mesmo motor usado pelo Claude Code, pra
// tela e skill nunca darem resultados diferentes). As que ainda não têm skill
// aparecem na tela como "em preparação".
const DISCIPLINAS_LAUDO = [
  { chave: 'spda', nome: 'SPDA — para-raios (NBR 5419:2026)', pasta: 'spda' },
  { chave: 'eletrica', nome: 'Elétrica predial (NBR 5410)', pasta: 'eletrica' },
  { chave: 'incendio', nome: 'Incêndio — detecção, alarme e iluminação de emergência (NBR 17240 / NBR 10898)', pasta: 'incendio' },
  { chave: 'cabeamento', nome: 'Cabeamento estruturado (NBR 14565)', pasta: 'cabeamento' },
  { chave: 'cftv', nome: 'CFTV (IEC 62676-4 / LGPD)', pasta: 'cftv' },
  { chave: 'solar', nome: 'Usina solar fotovoltaica (NBR 16690 / REN 1000)', pasta: 'solar' },
  { chave: 'carregador', nome: 'Carregador veicular (NBR 17019)', pasta: 'carregador' },
  { chave: 'automacao', nome: 'Automação — BMS, climatização e residencial (ISO 16484 / ISO 52120-1)', pasta: 'automacao' },
];

const RAIZ_SKILLS = path.join(__dirname, '..', '..', '..', 'skills');
const cache = {};

// Carrega a skill só quando usada — se faltar o `npm install` dela, o erro
// fica restrito a esta tela em vez de derrubar o backend inteiro no boot.
function motorDaDisciplina(chave) {
  const d = DISCIPLINAS_LAUDO.find(x => x.chave === chave);
  if (!d) {
    const err = new Error(`Disciplina desconhecida: ${chave}`);
    err.status = 400;
    throw err;
  }
  if (!d.pasta) {
    const err = new Error(`A disciplina "${d.nome}" ainda está em preparação.`);
    err.status = 400;
    throw err;
  }
  if (!cache[chave]) {
    try {
      cache[chave] = require(path.join(RAIZ_SKILLS, d.pasta, 'scripts', 'lib', 'index.js'));
    } catch (e) {
      const err = new Error(`Não foi possível carregar a skill "${d.pasta}" (${e.message}). Rode "npm install" em skills/${d.pasta}.`);
      err.status = 500;
      throw err;
    }
  }
  return cache[chave];
}

function listarDisciplinas() {
  return DISCIPLINAS_LAUDO.map(d => {
    if (!d.pasta) return { chave: d.chave, nome: d.nome, disponivel: false };
    try {
      const m = motorDaDisciplina(d.chave);
      return { chave: d.chave, nome: d.nome, disponivel: true, documentos: m.documentos, modosOrcamento: m.modosOrcamento };
    } catch (e) {
      return { chave: d.chave, nome: d.nome, disponivel: false, erro: e.message };
    }
  });
}

module.exports = { DISCIPLINAS_LAUDO, motorDaDisciplina, listarDisciplinas };
