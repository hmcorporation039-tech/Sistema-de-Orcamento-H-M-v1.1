const path = require('path');

// Disciplinas dos projetos e laudos (hub Obras → abas "Projetos por disciplina" e "Laudos").
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
  { chave: 'controle_acesso', nome: 'Controle de acesso (IEC 60839-11 / NBR 9077 / LGPD)', pasta: 'controle-acesso' },
  { chave: 'alarme', nome: 'Alarme de intrusão monitorado (EN 50131 / EN 50136)', pasta: 'alarme' },
  { chave: 'iluminacao', nome: 'Iluminação — luminotécnico e automação (NBR ISO/CIE 8995-1)', pasta: 'iluminacao' },
  { chave: 'eletrica_hospitalar', nome: 'Elétrica hospitalar (NBR 13534 / RDC 50)', pasta: 'eletrica-hospitalar' },
  { chave: 'media_tensao', nome: 'Média tensão — subestação (NBR 14039)', pasta: 'media-tensao' },
  { chave: 'eletrica_industrial', nome: 'Elétrica industrial (motores, CCM, correção de FP, curto-circuito)', pasta: 'eletrica-industrial' },
  { chave: 'telefonia', nome: 'Telefonia e interfonia (práticas Telebrás / NBR 14565 / NBR 14306)', pasta: 'telefonia' },
  { chave: 'antena', nome: 'Antena coletiva / TV (ISDB-Tb e satélite)', pasta: 'antena' },
  { chave: 'pressurizacao', nome: 'Pressurização de escadas — controle de fumaça e automação (NBR 14880 / CBMDF)', pasta: 'pressurizacao' },
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
      // versão 2.1: cada documento e modo de orçamento vem com `uso` ('projeto' |
      // 'laudo' | 'ambos', de skills/_comum/tipos-documento.js) — a tela mostra
      // só o que serve ao registro aberto (projeto ou laudo)
      const { documentos, modosOrcamento } = tiposDocumento().classificarSkill(m);
      const C = cadSeguro();
      return {
        chave: d.chave, nome: d.nome, disponivel: true, documentos, modosOrcamento,
        desenhos: { planta: !!C?.PLANTAS?.[d.chave], unifilar: !!C?.UNIFILARES?.[d.chave] },
      };
    } catch (e) {
      return { chave: d.chave, nome: d.nome, disponivel: false, erro: e.message };
    }
  });
}

// Base comum de CAD das skills (skills/_comum/cad): leitura de arquitetura e
// geração de planta DXF; DWG convertido em processo à parte. Carregada só quando usada, como as skills.
function cad() {
  if (!cache.__cad) {
    const base = path.join(RAIZ_SKILLS, '_comum', 'cad');
    cache.__cad = {
      ...require(path.join(base, 'arquitetura.js')),
      ...require(path.join(base, 'planta.js')),
      ...require(path.join(base, 'plantasDisciplina.js')),
      ...require(path.join(base, 'unifilar.js')),
      ...require(path.join(base, 'dwg.js')),
    };
  }
  return cache.__cad;
}

// a base de CAD pode faltar (npm install não rodado em skills): a lista de disciplinas continua
function cadSeguro() {
  try { return cad(); } catch { return null; }
}

// Classificação projeto × laudo (skills/_comum/tipos-documento.js — sem dependências)
function tiposDocumento() {
  if (!cache.__tipos) cache.__tipos = require(path.join(RAIZ_SKILLS, '_comum', 'tipos-documento.js'));
  return cache.__tipos;
}

// Base das entregas do projeto: marca AS BUILT e ZIP (skills/_comum/entrega.js)
function entrega() {
  if (!cache.__entrega) cache.__entrega = require(path.join(RAIZ_SKILLS, '_comum', 'entrega.js'));
  return cache.__entrega;
}

module.exports = { DISCIPLINAS_LAUDO, motorDaDisciplina, listarDisciplinas, cad, tiposDocumento, entrega };
