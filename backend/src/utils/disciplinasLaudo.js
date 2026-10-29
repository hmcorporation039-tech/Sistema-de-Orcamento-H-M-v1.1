const path = require('path');

// Disciplinas dos projetos e laudos (hub Obras → abas "Projetos por disciplina" e "Laudos").
// Cada disciplina pronta é uma skill em <raiz>/skills/<pasta>, com o contrato
// de skills/spda/scripts/lib/index.js (mesmo motor usado pelo Claude Code, pra
// tela e skill nunca darem resultados diferentes). As que ainda não têm skill
// aparecem na tela como "em preparação".
// Lista derivada do registro único (skills/_comum/disciplinas.js).
const { RAIZ_SKILLS, COMUM, CAD, registroDisciplinas } = require('../config/caminhos');
const REGISTRO = registroDisciplinas();
const DISCIPLINAS_LAUDO = REGISTRO.DISCIPLINAS.filter(d => d.laudo).map(d => ({ chave: d.chave, nome: d.nomes.laudo, pasta: d.pasta }));
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
    const base = CAD;
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
  if (!cache.__tipos) cache.__tipos = require(path.join(COMUM, 'tipos-documento.js'));
  return cache.__tipos;
}

// Base das entregas do projeto: marca AS BUILT e ZIP (skills/_comum/entrega.js)
function entrega() {
  if (!cache.__entrega) cache.__entrega = require(path.join(COMUM, 'entrega.js'));
  return cache.__entrega;
}

module.exports = { DISCIPLINAS_LAUDO, motorDaDisciplina, listarDisciplinas, cad, tiposDocumento, entrega };
