// Teste da fase 1 do roteiro (modelo único da instalação), sem navegador e sem dado de
// cliente: o validador; o projeto exemplo da elétrica com luminotécnico
// (skills/eletrica/exemplos/exemplo-com-luminotecnico.json) — todo ponto tem circuito,
// todo circuito tem disjuntor e quadro, a soma das cargas bate com o quadro de cargas,
// os circuitos IL* entram no quadro de cargas e no unifilar, a planta usa a grade do
// luminotécnico; o quadro importado; o 3D com circuito e comando por ponto e ids
// estáveis; e a leitura do circuito escrito junto do símbolo no DWG.
// Rodar: node skills/_comum/instalacao/teste-instalacao.js
const assert = require('assert');
const path = require('path');
const I = require('./index');

const SKILLS = path.join(__dirname, '..', '..');
const CAD = path.join(__dirname, '..', 'cad');
let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
};

// ── Validador ───────────────────────────────────────────────────────────────
function minima() {
  const inst = I.novaInstalacao('teste');
  inst.quadros.push({ tag: 'QD-01', geral: { tag: 'Q0', In: 40, polos: 2 }, drs: [{ tag: 'DR-2', circuitos: ['2'] }], carga_instalada_va: 1100,
    disjuntores: [{ tag: 'Q1', circuito: '1', polos: 1, In: 10 }, { tag: 'Q2', circuito: '2', polos: 1, In: 16 }] });
  inst.circuitos.push({ id: '1', quadro: 'QD-01', disjuntor: 'Q1', tipo: 'iluminacao', potencia_va: 200, pontos: ['L1', 'L2', 'S1'] });
  inst.circuitos.push({ id: '2', quadro: 'QD-01', disjuntor: 'Q2', tipo: 'tug', potencia_va: 900, pontos: ['T1', 'T2'] });
  inst.pontos.push(
    { id: 'L1', tipo: 'ponto_luz', ambiente: 'Sala', circuito: '1', comando: '1a', carga_va: 100 },
    { id: 'L2', tipo: 'ponto_luz', ambiente: 'Sala', circuito: '1', comando: '1a', carga_va: 100 },
    { id: 'S1', tipo: 'interruptor_simples', ambiente: 'Sala', circuito: '1', comando: '1a', carga_va: 0 },
    { id: 'T1', tipo: 'tomada', ambiente: 'Sala', circuito: '2', carga_va: 600 },
    { id: 'T2', tipo: 'tomada', ambiente: 'Sala', circuito: '2', carga_va: 300 },
  );
  inst.comandos.push({ id: '1a', tipo: 'interruptor_simples', circuitos: ['1'], retorno: 'a', dispositivos: ['S1'], pontos: ['L1', 'L2'] });
  return inst;
}
const clone = (o) => JSON.parse(JSON.stringify(o));

caso('validador: instalação coerente passa', () => {
  const v = I.validarInstalacao(minima());
  assert.deepStrictEqual(v.erros, []);
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.resumo.pontos, 5);
});

caso('validador: ponto sem circuito, circuito sem disjuntor, soma que não bate e comando para ponto inexistente', () => {
  const a = clone(minima()); a.pontos[3].circuito = ''; a.circuitos[1].pontos = ['T2'];
  assert.ok(I.validarInstalacao(a).erros.some(e => /T1.*sem circuito/.test(e)));
  const b = clone(minima()); b.circuitos[0].disjuntor = '';
  assert.ok(I.validarInstalacao(b).erros.some(e => /Circuito 1 sem disjuntor/.test(e)));
  const c = clone(minima()); c.pontos[4].carga_va = 100;
  assert.ok(I.validarInstalacao(c).erros.some(e => /Circuito 2: os pontos somam 700 VA e o quadro de cargas tem 900 VA/.test(e)));
  const d = clone(minima()); d.comandos[0].pontos.push('L9');
  assert.ok(I.validarInstalacao(d).erros.some(e => /aponta para o ponto L9, que não existe/.test(e)));
  const e = clone(minima()); e.quadros[0].disjuntores[1].circuito = '7';
  assert.ok(I.validarInstalacao(e).erros.some(x => /Q2 aponta para o circuito 7/.test(x)));
  const f = clone(minima()); f.quadros[0].carga_instalada_va = 2000;
  assert.ok(I.validarInstalacao(f).erros.some(x => /QD-01: os circuitos somam 1100 VA/.test(x)));
});

caso('letras do retorno e tipo do comando pelo número de pontos', () => {
  assert.deepStrictEqual([0, 1, 25, 26, 27].map(I.letraRetorno), ['a', 'b', 'z', 'aa', 'ab']);
  assert.strictEqual(I.comandoDeInterruptores(1).tipo, 'interruptor_simples');
  assert.deepStrictEqual(I.comandoDeInterruptores(3).dispositivos, ['interruptor_paralelo', 'interruptor_intermediario', 'interruptor_paralelo']);
  assert.strictEqual(I.comandoDeInterruptores(4, 'pulsador').tipo, 'pulsador_rele_impulso');
  assert.strictEqual(I.comandoDeInterruptores(2, 'contator').tipo, 'contator_botoeira');
});

// ── Projeto exemplo: elétrica predial com luminotécnico ──────────────────────
const ELE = require(path.join(SKILLS, 'eletrica', 'scripts', 'lib', 'index.js'));
const EXEMPLO = require(path.join(SKILLS, 'eletrica', 'exemplos', 'exemplo-com-luminotecnico.json'));
const res = ELE.processar(clone(EXEMPLO));
const inst = res.instalacao;

caso('exemplo: todo ponto tem circuito, todo circuito tem disjuntor e quadro, a soma bate', () => {
  const v = I.validarInstalacao(inst);
  assert.deepStrictEqual(v.erros, []);
  assert.ok(inst.pontos.length > 30);
  for (const p of inst.pontos) assert.ok(inst.circuitos.some(c => c.id === p.circuito), `${p.id} sem circuito`);
  const q = inst.quadros[0];
  for (const c of inst.circuitos) assert.ok(q.disjuntores.some(d => d.tag === c.disjuntor && d.circuito === c.id), `circuito ${c.id} sem disjuntor`);
  // soma por circuito = quadro de cargas (calc.circuitos) e total = potência instalada
  for (const c of res.calc.circuitos) {
    const soma = inst.pontos.filter(p => p.circuito === String(c.id) && I.TIPOS_CARGA.has(p.tipo)).reduce((s, p) => s + p.carga_va, 0);
    assert.ok(Math.abs(soma - c.potencia_va) <= 1, `circuito ${c.id}: ${soma} × ${c.potencia_va}`);
  }
  assert.ok(Math.abs(inst.circuitos.reduce((s, c) => s + c.potencia_va, 0) - res.calc.demanda.instaladaVa) < 1e-6);
});

caso('exemplo: os circuitos IL* do luminotécnico entram no quadro de cargas, na planilha e no unifilar (SK-06)', () => {
  const ids = res.calc.circuitos.map(c => String(c.id));
  assert.ok(ids.includes('IL1') && ids.includes('IL2'), ids.join(','));
  // sem circuito de iluminação próprio da elétrica para a Sala, a Cozinha e o Banheiro
  const proprios = res.calc.circuitos.filter(c => c.tipo === 'iluminacao' && !/^IL/.test(c.id));
  assert.ok(proprios.every(c => !c.ambientes.some(n => ['Sala', 'Cozinha', 'Banheiro'].includes(n))));
  const { gerarUnifilarEletrica } = require(path.join(CAD, 'unifilar.js'));
  assert.match(gerarUnifilarEletrica(res).xml, /IL1/);
  assert.ok(ELE.resumir(res).tabelas[0].linhas.some(l => l[0] === 'IL2'));
  assert.strictEqual(res.calc.previsao.find(a => a.nome === 'Sala').iluminacaoDe, 'luminotecnico');
});

caso('exemplo: comandos com os pontos que comandam (paralelo, pulsador + relé de impulso, sensor)', () => {
  const sala = inst.comandos.find(c => c.ambiente === 'Sala');
  assert.strictEqual(sala.tipo, 'interruptor_paralelo');
  assert.strictEqual(sala.dispositivos.length, 2);
  const coz = inst.comandos.find(c => c.ambiente === 'Cozinha');
  assert.strictEqual(coz.tipo, 'pulsador_rele_impulso');
  assert.strictEqual(coz.rele.tipo, 'impulso');
  assert.strictEqual(coz.dispositivos.length, 3);
  assert.strictEqual(inst.comandos.find(c => c.ambiente === 'Banheiro').tipo, 'sensor_presenca');
  for (const k of inst.comandos) for (const id of k.pontos) assert.strictEqual(inst.pontos.find(p => p.id === id).comando, k.id);
  // pulsadores e relé de impulso nos materiais da iluminação (só quando escolhidos)
  const ILU = require(path.join(SKILLS, 'iluminacao', 'scripts', 'lib', 'calculo.js'));
  const mats = ILU.calcular({ ...EXEMPLO.luminotecnico, instalacao: { ...EXEMPLO.luminotecnico.instalacao, tensao_fn: 127, tensao_ff: 220 } }).materiais;
  assert.strictEqual(mats.find(m => m.codigo === 'PULS').quantidade, 3);
  assert.strictEqual(mats.find(m => m.codigo === 'RELE-IMP').quantidade, 1);
});

// ── Planta com a grade do luminotécnico ─────────────────────────────────────
const { DesenhoDxf } = require(path.join(CAD, 'dxf.js'));
const { lerArquitetura } = require(path.join(CAD, 'arquitetura.js'));
function arquitetura(extra) {
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'EL-LUMINARIA', cor: 2 }, { nome: 'EL-TEXTO', cor: 1 }] });
  g.polilinha([[-150, -150], [8150, -150], [8150, 5150], [-150, 5150]], { layer: 'A-PAREDE', fechada: true });
  g.polilinha([[0, 0], [5000, 0], [5000, 5000], [0, 5000]], { layer: 'A-PAREDE', fechada: true });
  g.polilinha([[5150, 0], [8000, 0], [8000, 5000], [5150, 5000]], { layer: 'A-PAREDE', fechada: true });
  g.texto(2500, 2500, 200, 'SALA', { layer: 'A-TEXTO' });
  g.texto(6500, 2500, 200, 'COZINHA', { layer: 'A-TEXTO' });
  if (extra) extra(g);
  return g.toString().replace(/(\$INSUNITS\r?\n\s*70\r?\n\s*)6/, '$14');
}
const dadosCasa = () => {
  const d = clone(EXEMPLO);
  d.ambientes = [{ nome: 'Sala', tipo: 'sala', area_m2: 25, perimetro_m: 20 }, { nome: 'Cozinha', tipo: 'cozinha', area_m2: 14.25, perimetro_m: 15.7 }];
  d.tues = [{ ambiente: 'Cozinha', descricao: 'Micro-ondas', potencia_w: 1200, ligacao: 'FN', fp: 1 }];
  d.luminotecnico.ambientes = d.luminotecnico.ambientes.filter(a => a.nome === 'Sala');
  return d;
};

caso('planta elétrica: na Sala a grade do luminotécnico (no lugar de 1 ponto a cada 16 m²), ids do modelo e CIRCUITO/RETORNO', () => {
  const { PLANTAS } = require(path.join(CAD, 'plantasDisciplina.js'));
  const { gerarPlanta } = require(path.join(CAD, 'planta.js'));
  const arq = lerArquitetura(arquitetura());
  const r = ELE.processar(dadosCasa());
  const salaLum = r.luminotecnico.ambientes.Sala;
  const out = gerarPlanta({ arquitetura: arq, ...PLANTAS.eletrica(r, arq) });
  const luzSala = out.posicoes.filter(p => p.simbolo === 'HM-ELE-PONTO-LUZ' && p.ambiente === 'SALA');
  assert.strictEqual(luzSala.length, salaLum.n);
  assert.notStrictEqual(salaLum.n, Math.max(1, Math.round(25 / 16)));
  const ids = new Set(r.instalacao.pontos.map(p => p.id));
  assert.ok(out.posicoes.every(p => ids.has(p.id) || p.simbolo === 'HM-ELE-QUADRO'), 'id fora do modelo');
  assert.match(out.dxf, /\nRETORNO\r?\n/);
  assert.match(out.dxf, /\nIL1\r?\n/);
});

// ── Quadro importado da elétrica: as mesmas tags e os pontos do projeto ─────
caso('quadros: importado da elétrica com luminotécnico, o modelo do quadro tem os IL* e fecha', () => {
  const { deEletrica, deIluminacao } = require(path.join(SKILLS, 'quadros', 'scripts', 'lib', 'importar.js'));
  const Q = require(path.join(SKILLS, 'quadros', 'scripts', 'lib', 'index.js'));
  const q = Q.processar(deEletrica(clone(EXEMPLO)).dados);
  assert.deepStrictEqual(q.validacaoInstalacao.erros, []);
  assert.ok(q.instalacao.quadros[0].disjuntores.some(d => d.tag === 'QIL1'));
  // mesma tag no caderno de fabricação (componentes do quadro)
  assert.ok(q.calc.comps.lista.some(k => k.ref === 'QIL1'));
  assert.strictEqual(q.instalacao.pontos.length, inst.pontos.length);
  const ql = Q.processar(deIluminacao(clone(require(path.join(SKILLS, 'iluminacao', 'exemplos', 'exemplo-escritorio.json')))).dados);
  assert.deepStrictEqual(ql.validacaoInstalacao.erros, []);
  assert.deepStrictEqual(ql.instalacao.circuitos.map(c => c.id), ['IL1', 'IL2', 'IL3']);
});

// ── 3D: circuito e comando por ponto, a instalação na cena, ids estáveis ────
caso('3D (3D-06): itens com circuito e comando, instalação na cena com posição, ids iguais ao regerar', () => {
  const { montarCenasPorPlanta } = require(path.join(CAD, 'modelosPorPlanta.js'));
  const arq = lerArquitetura(arquitetura());
  const gerar = () => montarCenasPorPlanta(arq, { disciplinas: ['eletrica'], dadosPorDisciplina: { eletrica: dadosCasa() }, sugerirInfra: false }).cenas[0];
  const cena = gerar();
  assert.strictEqual(cena.versao, 3);
  assert.ok(cena.instalacao, 'cena sem instalacao');
  const luz = cena.dispositivos.find(t => t.simbolo === 'HM-ELE-PONTO-LUZ');
  assert.ok(luz.itens.every(it => it[8] && it[9]), 'luz sem circuito/comando');
  const daSala = cena.instalacao.pontos.filter(p => p.ambiente === 'Sala' && p.tipo === 'ponto_luz');
  assert.ok(daSala.length && daSala.every(p => Array.isArray(p.posicao) && p.circuito === 'IL1'));
  const tomada = cena.dispositivos.find(t => t.simbolo === 'HM-ELE-TOMADA-BAIXA');
  assert.ok(tomada.itens.every(it => it[8] && it[9] === ''), 'tomada: circuito sim, comando não');
  // o elemento (símbolo + id) é o mesmo entre regerações
  const chaves = (c) => c.dispositivos.flatMap(t => t.itens.map(it => `${t.simbolo}|${it[6]}|${it[8] || ''}`)).sort();
  assert.deepStrictEqual(chaves(gerar()), chaves(cena));
  assert.ok(new Set(luz.itens.map(it => it[6])).size === luz.itens.length, 'id repetido');
});

// ── DWG recebido: circuito e retorno escritos junto do símbolo ──────────────
caso('DWG: texto "3a", "3" + "b" e "C4" junto das luminárias vira sugestão de circuito e retorno por ponto e por linha do mapa', () => {
  const { pontosDoDesenho } = require(path.join(CAD, 'pontosDoDesenho.js'));
  const { lerProjetoDxf } = require(path.join(CAD, 'projetoDxf.js'));
  const { anotarCircuitos, lerMarcacao, circuitoConferido } = require(path.join(CAD, 'circuitoDoDesenho.js'));
  assert.deepStrictEqual(lerMarcacao('3a'), { circuito: '3', retornos: ['a'] });
  assert.deepStrictEqual(lerMarcacao('C-12'), { circuito: '12', retornos: [] });
  assert.deepStrictEqual(lerMarcacao('IL2b'), { circuito: 'IL2', retornos: ['b'] });
  assert.deepStrictEqual(lerMarcacao('a,b'), { circuito: null, retornos: ['a', 'b'] });
  assert.strictEqual(lerMarcacao('h=1,10m'), null);
  assert.strictEqual(lerMarcacao('SALA'), null);
  assert.strictEqual(lerMarcacao('20A'), null);
  // luminárias explodidas (quadrado de 40 cm em linhas) na layer EL-LUMINARIA, textos ao lado
  const quadrado = (g, x, y) => { const s = 200; [[x - s, y - s, x + s, y - s], [x + s, y - s, x + s, y + s], [x + s, y + s, x - s, y + s], [x - s, y + s, x - s, y - s]].forEach(l => g.linha(...l, 'EL-LUMINARIA')); };
  const texto = arquitetura((g) => {
    quadrado(g, 1500, 1500); g.texto(1800, 1800, 100, '3a', { layer: 'EL-TEXTO' });
    quadrado(g, 3500, 1500); g.texto(3800, 1800, 100, '3', { layer: 'EL-TEXTO' }); g.texto(3800, 1650, 100, 'b', { layer: 'EL-TEXTO' });
    quadrado(g, 6500, 3500); g.texto(6800, 3800, 100, 'C4', { layer: 'EL-TEXTO' });
    quadrado(g, 6500, 1200); // sem texto
  });
  const arq = lerArquitetura(texto);
  const { pontos } = pontosDoDesenho(arq);
  assert.strictEqual(pontos.length, 4, JSON.stringify(pontos.map(p => [p.simbolo, p.x, p.y])));
  const { textos } = lerProjetoDxf(texto, { fator: arq.fatorUnidade });
  const r = anotarCircuitos(pontos, textos);
  const em = (x, y) => pontos.find(p => Math.abs(p.x - x) < 0.05 && Math.abs(p.y - y) < 0.05);
  assert.deepStrictEqual([em(1.5, 1.5).circuito_lido, em(1.5, 1.5).retorno_lido], ['3', 'a']);
  assert.deepStrictEqual([em(3.5, 1.5).circuito_lido, em(3.5, 1.5).retorno_lido], ['3', 'b']);
  assert.strictEqual(em(6.5, 3.5).circuito_lido, '4');
  assert.strictEqual(em(6.5, 1.2).circuito_lido, undefined);
  assert.strictEqual(r.lidos, 3);
  const linha = r.porLinha.get(pontos[0].linha);
  assert.deepStrictEqual([linha.pontos, linha.com_circuito, linha.circuitos], [4, 3, { 3: 2, 4: 1 }]);
  // só a linha conferida no mapa leva o circuito para o 3D
  assert.strictEqual(circuitoConferido(em(1.5, 1.5)), null);
  assert.deepStrictEqual(circuitoConferido({ ...em(1.5, 1.5), confirmado: true }), { circuito: '3', retorno: 'a', comando: '3a' });
});

console.log(`instalação (modelo único, fase 1): ${ok} casos ok`);
