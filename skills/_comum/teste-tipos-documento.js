// Teste da classificação projeto × laudo (_comum/tipos-documento.js): toda
// skill (qualquer pasta com scripts/lib/index.js) precisa ter TODOS os
// documentos e modos de orçamento classificados — skill nova com documento
// fora da lista faz este teste falhar. Também confere que cada skill tem o que
// mostrar nos dois tipos de registro. Rodar: node _comum/teste-tipos-documento.js
const fs = require('fs');
const path = require('path');
const T = require('./tipos-documento');

const RAIZ = path.join(__dirname, '..');
let ok = 0;
let falhas = 0;
const falhou = (msg) => { falhas++; console.log(`  FALHOU ${msg}`); };

const pastas = fs.readdirSync(RAIZ)
  .filter(p => !p.startsWith('_') && p !== 'node_modules' && fs.existsSync(path.join(RAIZ, p, 'scripts', 'lib', 'index.js')));

if (pastas.length < 17) falhou(`esperava as 17 skills, achei ${pastas.length}`);

for (const pasta of pastas) {
  const skill = require(path.join(RAIZ, pasta, 'scripts', 'lib', 'index.js'));
  const { documentos, modosOrcamento, semClassificacao } = T.classificarSkill(skill);
  if (semClassificacao.length) {
    falhou(`${pasta}: sem classificação em _comum/tipos-documento.js → ${semClassificacao.join('; ')}`);
    continue;
  }
  const para = (lista, tipo) => lista.filter(x => T.serve(x.uso, tipo));
  if (!para(documentos, 'projeto').length) falhou(`${pasta}: nenhum documento de projeto`);
  else if (!para(documentos, 'laudo').length) falhou(`${pasta}: nenhum documento de laudo`);
  else if (!para(modosOrcamento, 'projeto').length) falhou(`${pasta}: nenhum orçamento de execução (projeto)`);
  else if (!para(modosOrcamento, 'laudo').length) falhou(`${pasta}: nenhum orçamento de inspeção (laudo)`);
  else ok++;
}

// regras fixas
const regra = (rotulo, obtido, esperado) => { if (obtido === esperado) ok++; else falhou(`${rotulo}: ${obtido} ≠ ${esperado}`); };
regra('memorial é de projeto', T.usoDoDocumento('eletrica', 'memorial'), 'projeto');
regra('checklist é de laudo', T.usoDoDocumento('eletrica', 'checklist'), 'laudo');
regra('análise de risco do SPDA serve aos dois', T.usoDoDocumento('spda', 'risco'), 'ambos');
regra('planta (DXF) é de projeto', T.usoDoDocumento('cftv', 'planta'), 'projeto');
regra('unifilar (QElectroTech) é de projeto', T.usoDoDocumento('eletrica', 'unifilar'), 'projeto');
regra('documento desconhecido fica sem classificação', T.usoDoDocumento('eletrica', 'novo_tipo'), null);
regra('execução vai com o projeto', T.usoDoModo('solar', 'execucao'), 'projeto');
regra('vistoria vai com o laudo', T.usoDoModo('cftv', 'vistoria'), 'laudo');
regra('"ambos" serve ao laudo', T.serve('ambos', 'laudo'), true);
regra('"projeto" não serve ao laudo', T.serve('projeto', 'laudo'), false);
// skill fictícia com documento novo: o teste acima pegaria
regra('skill com documento novo é apontada', T.classificarSkill({ chave: 'x', documentos: [{ tipo: 'parecer_x', rotulo: 'Parecer' }], modosOrcamento: [] }).semClassificacao.length, 1);

console.log(`_comum/teste-tipos-documento.js: ${ok}/${ok + falhas} verificações OK (${pastas.length} skills)`);
process.exitCode = falhas ? 1 : 0;
