// Base única de serviços de mão de obra (versão 2.0): código estável dos
// livres, disciplina deduzida só de sinais confiáveis, fusão "é o mesmo
// que…" e cadastro ao salvar proposta. Sem banco (cliente falso em memória).
// Rodar: npm test (pasta backend).
const assert = require('assert');
const {
  codigoLivre, disciplinaDoSubgrupo, deduzirDisciplina, resolverCodigo, planejarFusao, garantirServicoCadastrado,
} = require('../src/utils/servicosBase');

let ok = 0;
const pendentes = [];
function caso(nome, fn) {
  pendentes.push(Promise.resolve().then(fn).then(
    () => { ok++; console.log(`  ok  ${nome}`); },
    (e) => { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
  ));
}

caso('código do serviço livre é estável pelo id da tabela antiga', () => {
  assert.strictEqual(codigoLivre(42), 'livre_42');
  assert.strictEqual(codigoLivre('7'), 'livre_7');
});

caso('subgrupo → disciplina só por nome exato (sem acento/caixa)', () => {
  assert.strictEqual(disciplinaDoSubgrupo('Redes de Computadores (dados)'), 'rede');
  assert.strictEqual(disciplinaDoSubgrupo('  controle de acesso '), 'controle_acesso');
  assert.strictEqual(disciplinaDoSubgrupo('ELETRICA'), 'eletrica');
  assert.strictEqual(disciplinaDoSubgrupo('Antena/TV'), 'antena');
  assert.strictEqual(disciplinaDoSubgrupo('Interfonia'), 'telefonia');
  assert.strictEqual(disciplinaDoSubgrupo('Sonorização'), null);
  assert.strictEqual(disciplinaDoSubgrupo('Instalação de câmeras CFTV'), null); // não é nome de subgrupo
});

caso('disciplina deduzida: código padrão > subgrupo único > outros', () => {
  assert.strictEqual(deduzirDisciplina({ disciplinasDosCodigos: ['spda'], subgrupos: ['CFTV'] }), 'spda');
  assert.strictEqual(deduzirDisciplina({ subgrupos: ['CFTV'] }), 'cftv');
  assert.strictEqual(deduzirDisciplina({ subgrupos: ['Redes', 'Redes de Computadores (dados)'] }), 'rede');
  assert.strictEqual(deduzirDisciplina({ subgrupos: ['CFTV', 'Interfonia', 'Redes'] }), 'outros'); // ambíguo
  assert.strictEqual(deduzirDisciplina({ subgrupos: ['Alarme', 'Sonorização'] }), 'outros');
  assert.strictEqual(deduzirDisciplina({ disciplinasDosCodigos: ['rede', 'cftv'], subgrupos: [] }), 'outros');
  assert.strictEqual(deduzirDisciplina({}), 'outros');
});

const BASE = [
  { codigo: 'cftv_camera_interna', origem: 'padrao', ativo: true, fundido_em: null },
  { codigo: 'rede_switch', origem: 'padrao', ativo: true, fundido_em: null },
  { codigo: 'livre_10', origem: 'proposta', ativo: true, fundido_em: null },
  { codigo: 'livre_11', origem: 'proposta', ativo: false, fundido_em: 'livre_10' }, // fundido num livre
  { codigo: 'livre_12', origem: 'proposta', ativo: false, fundido_em: 'rede_switch' },
  { codigo: 'livre_13', origem: 'proposta', ativo: false, fundido_em: null }, // só desativado
];

caso('fusão de um livre num padrão: desativa a origem e redireciona quem apontava para ela', () => {
  const p = planejarFusao(BASE, 'livre_10', 'cftv_camera_interna');
  assert.deepStrictEqual(p, { origem: 'livre_10', destino: 'cftv_camera_interna', redirecionar: ['livre_11'] });
});

caso('fusão segue a cadeia até o destino final (sem ciclo)', () => {
  const p = planejarFusao(BASE, 'livre_10', 'livre_12'); // livre_12 já é rede_switch
  assert.strictEqual(p.destino, 'rede_switch');
  const porCodigo = new Map(BASE.map(s => [s.codigo, s]));
  assert.strictEqual(resolverCodigo(porCodigo, 'livre_11').codigo, 'livre_10');
  const ciclo = new Map([['a', { codigo: 'a', fundido_em: 'b' }], ['b', { codigo: 'b', fundido_em: 'a' }]]);
  assert.ok(resolverCodigo(ciclo, 'a')); // termina
});

caso('fusão recusada: padrão como origem, destino inexistente, o próprio ou desativado', () => {
  assert.strictEqual(planejarFusao(BASE, 'rede_switch', 'cftv_camera_interna').status, 400);
  assert.strictEqual(planejarFusao(BASE, 'livre_99', 'rede_switch').status, 404);
  assert.strictEqual(planejarFusao(BASE, 'livre_10', 'nao_existe').status, 404);
  assert.strictEqual(planejarFusao(BASE, 'livre_10', 'livre_10').status, 400);
  assert.strictEqual(planejarFusao(BASE, 'livre_10', 'livre_11').status, 400); // volta para a própria origem
  assert.strictEqual(planejarFusao(BASE, 'livre_10', 'livre_13').status, 400); // desativado
  assert.strictEqual(planejarFusao(BASE, 'livre_10', '').status, 404);
});

// Cliente falso: guarda as duas tabelas em memória e responde às consultas
// de garantirServicoCadastrado (o texto do SQL decide qual operação é).
function clienteFalso() {
  const ref = [
    { codigo: 'rede_switch', descricao: 'Instalação e config. de switches', origem: 'padrao', ativo: true, fundido_em: null, disciplina: 'rede' },
    { codigo: 'livre_5', descricao: 'Instalação de switch PoE', origem: 'proposta', ativo: false, fundido_em: 'rede_switch', disciplina: 'cftv' },
  ];
  const antigos = [{ id: 5, descricao: 'Instalação de switch PoE', ativo: false }];
  const chave = (t) => String(t).trim().toLowerCase();
  const ordenar = (l) => [...l].sort((a, b) => ((b.origem === 'padrao') - (a.origem === 'padrao')) || (b.ativo - a.ativo));
  return {
    ref, antigos,
    async query(sql, p = []) {
      if (/FROM precos_mao_de_obra_referencia\s+WHERE LOWER\(TRIM\(descricao\)\)/.test(sql)) {
        return { rows: ordenar(ref.filter(r => chave(r.descricao) === chave(p[0]))).slice(0, 1) };
      }
      if (/^SELECT id FROM mao_de_obra_itens/.test(sql)) return { rows: antigos.filter(a => chave(a.descricao) === chave(p[0])).slice(0, 1) };
      if (/^INSERT INTO mao_de_obra_itens/.test(sql)) {
        const novo = { id: antigos.length ? Math.max(...antigos.map(a => a.id)) + 1 : 1, descricao: p[0], ativo: true };
        antigos.push(novo);
        return { rows: [{ id: novo.id }] };
      }
      if (/^SELECT disciplina FROM precos_mao_de_obra_referencia WHERE codigo/.test(sql)) return { rows: ref.filter(r => r.codigo === p[0] && r.origem === 'padrao') };
      if (/^\s*INSERT INTO precos_mao_de_obra_referencia/.test(sql)) {
        if (ref.some(r => r.codigo === p[0] || (r.origem === 'proposta' && chave(r.descricao) === chave(p[1])))) return { rowCount: 0, rows: [] };
        ref.push({ codigo: p[0], descricao: p[1], unidade: p[2], disciplina: p[3], valor_referencia: p[4], origem: 'proposta', ativo: true, fundido_em: null });
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`consulta inesperada: ${sql.slice(0, 80)}`);
    },
  };
}

caso('salvar proposta: descrição igual a um padrão não cria livre', async () => {
  const c = clienteFalso();
  assert.strictEqual(await garantirServicoCadastrado(c, { descricao: '  instalação e config. de SWITCHES ', valor_unitario: 99 }), 'rede_switch');
  assert.strictEqual(c.ref.length, 2);
  assert.strictEqual(c.antigos.length, 1);
});

caso('salvar proposta: descrição de um livre fundido usa o padrão de destino (não recria)', async () => {
  const c = clienteFalso();
  assert.strictEqual(await garantirServicoCadastrado(c, { descricao: 'Instalação de switch PoE', valor_unitario: 150 }), 'rede_switch');
  assert.strictEqual(c.ref.length, 2);
});

caso('salvar proposta: serviço novo entra na base única (livre_<id>) e na tabela antiga, uma vez só', async () => {
  const c = clienteFalso();
  const item = { descricao: 'Instalação de caixa acústica', unidade: 'un', valor_unitario: 85, subgrupo: 'Sonorização' };
  assert.strictEqual(await garantirServicoCadastrado(c, item), 'livre_6');
  const novo = c.ref.find(r => r.codigo === 'livre_6');
  assert.strictEqual(novo.disciplina, 'outros');
  assert.strictEqual(novo.valor_referencia, 85);
  assert.strictEqual(c.antigos.length, 2);
  assert.strictEqual(await garantirServicoCadastrado(c, { ...item, valor_unitario: 999 }), 'livre_6'); // de novo: nada muda
  assert.strictEqual(c.ref.length, 3);
  assert.strictEqual(c.ref.find(r => r.codigo === 'livre_6').valor_referencia, 85); // preço existente não muda
});

caso('salvar proposta: disciplina pelo código padrão do item; sem valor não vira referência', async () => {
  const c = clienteFalso();
  await garantirServicoCadastrado(c, { descricao: 'Instalação de switch 48 portas', codigo: 'rede_switch', subgrupo: 'CFTV', valor_unitario: 0 });
  const novo = c.ref.find(r => r.descricao === 'Instalação de switch 48 portas');
  assert.strictEqual(novo.disciplina, 'rede');
  assert.strictEqual(novo.valor_referencia, null);
  assert.strictEqual(await garantirServicoCadastrado(c, { descricao: '   ' }), null);
  assert.strictEqual(await garantirServicoCadastrado(c, { descricao: 'x'.repeat(301) }), null);
});

Promise.all(pendentes).then(() => console.log(`servicosBase: ${ok} de ${pendentes.length} casos ok`));
