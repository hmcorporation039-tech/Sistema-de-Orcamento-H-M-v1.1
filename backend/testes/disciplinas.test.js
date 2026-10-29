// Registro único das disciplinas (skills/_comum/disciplinas.js) — o que não pode
// se desencontrar: chave/sigla repetida, subgrupo que aponta para duas
// disciplinas, laudo sem skill, e as listas que derivam dele. Sem banco.
// Rodar: npm test (pasta backend).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { RAIZ_SKILLS, registroDisciplinas } = require('../src/config/caminhos');
const { DISCIPLINAS, OUTROS, mapa } = registroDisciplinas();

let ok = 0;
const caso = (nome, fn) => { fn(); ok++; };

caso('chaves e siglas únicas; todo campo preenchido', () => {
  const chaves = DISCIPLINAS.map(d => d.chave), siglas = [...DISCIPLINAS, OUTROS].map(d => d.sigla);
  assert.strictEqual(new Set(chaves).size, chaves.length, 'chave repetida');
  assert.strictEqual(new Set(siglas).size, siglas.length, 'sigla repetida');
  for (const d of DISCIPLINAS) {
    for (const campo of ['grupo', 'sigla', 'skill']) assert.ok(d[campo], `${d.chave}: falta ${campo}`);
    for (const campo of ['laudo', 'analise', 'servico']) assert.ok(d.nomes?.[campo], `${d.chave}: falta nomes.${campo}`);
    for (const campo of ['material', 'servico']) assert.ok(d.subgrupo?.[campo], `${d.chave}: falta subgrupo.${campo}`);
    assert.ok(chaves.includes(d.skill), `${d.chave}: skill "${d.skill}" não é disciplina`);
  }
});

caso('nome de subgrupo (serviço + aliases) leva a uma disciplina só', () => {
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const dono = new Map();
  for (const [chave, nomes] of Object.entries(mapa(d => [d.chave, d.subgrupo.servico, ...d.aliases]))) {
    for (const n of nomes) {
      const k = norm(n);
      assert.ok(!dono.has(k) || dono.get(k) === chave, `"${n}" é de ${dono.get(k)} e de ${chave}`);
      dono.set(k, chave);
    }
  }
});

caso('disciplina com laudo tem a skill na pasta, com a mesma chave', () => {
  for (const d of DISCIPLINAS.filter(x => x.laudo)) {
    const indice = path.join(RAIZ_SKILLS, d.pasta, 'scripts', 'lib', 'index.js');
    assert.ok(fs.existsSync(indice), `${d.chave}: skills/${d.pasta} não existe`);
    const texto = fs.readFileSync(indice, 'utf8');
    assert.ok(new RegExp(`chave:\\s*'${d.chave}'`).test(texto), `${d.chave}: skills/${d.pasta} declara outra chave`);
  }
});

caso('as listas do sistema derivam do registro (laudos, análise, subgrupos, siglas)', () => {
  const { DISCIPLINAS_LAUDO } = require('../src/utils/disciplinasLaudo');
  const { DISCIPLINAS: DA, nomeDaDisciplina } = require('../src/utils/disciplinasProjeto');
  const C = require('../src/utils/composicoes');
  const S = require('../src/utils/servicosBase');
  assert.strictEqual(DISCIPLINAS_LAUDO.length, DISCIPLINAS.filter(d => d.laudo).length);
  assert.strictEqual(DA.length, DISCIPLINAS.length);
  assert.strictEqual(nomeDaDisciplina('rede'), 'Redes de computadores (dados/Wi-Fi)');
  assert.strictEqual(C.subgrupoDoItem('servico', 'spda'), 'SPDA');
  assert.strictEqual(C.subgrupoDoItem('material', 'telefonia'), 'Interfonia');
  assert.strictEqual(C.proximoCodigo('pressurizacao', []), 'KIT-PRES-01');
  assert.strictEqual(S.disciplinaDoSubgrupo('SPDA (para-raios) — Laudos e projetos'), 'spda');
  assert.strictEqual(S.disciplinaDoSubgrupo('Redes / Cabeamento Estruturado'), 'rede');
});

console.log(`disciplinas: ${ok} casos ok`);
