// CAMPO DE INSTRUÇÕES da análise (versão 2.47, 20/11/2026). Pedido do usuário: "tem que haver um campo do qual se
// possa inserir instruções para alterar a análise, como por exemplo mude a estrutura para determinado lugar, acrescente
// um componente, retire um componente, isso de forma mais fácil" — sem depender de IA. O interpretador
// (services/instrucoes/interpretar.js) lê a frase pelo vocabulário e pelos nomes das salas da própria análise e devolve
// as operações com as posições; o controlador valida o que vem da tela (controllers/projetos/instrucoes.js).
// Dados SINTÉTICOS (nenhum dado de cliente). Rodar: node testes/instrucoesAnalise.test.js
const assert = require('assert');
const path = require('path');
const { interpretar, paraTestes: T } = require('../src/services/instrucoes/interpretar');
const { dentro } = require(path.join(require('../src/config/caminhos').CAD, 'arquitetura.js'));

let ok = 0;
const pendentes = [];
const falhou = (nome, e) => { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; };
const caso = (nome, fn) => {
  try {
    const r = fn();
    if (r && typeof r.then === 'function') { pendentes.push(r.then(() => { ok++; console.log(`  ok  ${nome}`); }, e => falhou(nome, e))); return; }
    ok++; console.log(`  ok  ${nome}`);
  } catch (e) { falhou(nome, e); }
};

// térreo (x 0–15) e 1º pavimento (x 20–33), lado a lado como nas pranchas
const R = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const sala = (nome, pavimento, pol) => ({ nome, pavimento, poligono: pol, area_m2: Math.abs((pol[1][0] - pol[0][0]) * (pol[2][1] - pol[1][1])) });
const AMB = [
  sala('CPD', 'Térreo', R(0, 0, 4, 4)), sala('CIRCULAÇÃO', 'Térreo', R(4, 0, 12, 4)), sala('BANHEIRO', 'Térreo', R(12, 0, 15, 4)),
  sala('SALA DE TV', 'Térreo', R(0, 4, 8, 9)),
  sala('CAPELA', '1º pavimento', R(20, 0, 30, 8)), sala('DEPÓSITO', '1º pavimento', R(30, 0, 33, 4)), sala('CIRCULAÇÃO', '1º pavimento', R(30, 4, 33, 8)),
  sala('QUARTO - 01', '1º pavimento', R(20, 8, 26, 12)),
];
const P = (simbolo, x, y, descricao) => ({ simbolo, x, y, ...(descricao ? { descricao } : {}) });
const PONTOS = [
  P('HM-CAB-RACK', 2, 0.3), P('HM-CFTV-CAMERA', 4.4, 0.4), P('HM-CFTV-CAMERA', 11.6, 3.6),
  P('HM-INC-DETECTOR-FUMACA', 2, 2), P('HM-INC-DETECTOR-FUMACA', 8, 2), P('HM-INC-DETECTOR-FUMACA', 25, 4),
  P('HM-CFTV-CAMERA', 20.4, 0.4), P('HM-CFTV-CAMERA', 29.6, 7.6), P('HM-ELE-QUADRO', 31, 0.2),
  // ponto do desenho sem símbolo: reconhecido pela descrição
  P(null, 31.5, 6, 'Câmera dome IP 4 MP'),
];
const CTX = { ambientes: AMB, pontos: PONTOS, disciplinas: ['cftv', 'incendio', 'rede', 'eletrica'], pavimentos: ['Térreo', '1º pavimento'], projetadas: ['cftv', 'incendio', 'eletrica'], elaboracao: true };
const salaDe = (x, y) => AMB.find(a => dentro([x, y], a.poligono));
const um = (texto, ctx = CTX) => { const r = interpretar(texto, ctx); return { r, op: r.operacoes[0] }; };

caso('acrescentar: "acrescente 2 câmeras na capela" — duas posições dentro da capela, longe das que já existem', () => {
  const { r, op } = um('acrescente 2 câmeras na capela');
  assert.deepStrictEqual(r.duvidas, []);
  assert.strictEqual(op.tipo, 'adicionar');
  assert.strictEqual(op.adicionar.length, 2);
  for (const p of op.adicionar) {
    assert.strictEqual(p.simbolo, 'HM-CFTV-CAMERA');
    assert.strictEqual(salaDe(p.x, p.y).nome, 'CAPELA');
    assert.ok(Math.min(Math.hypot(p.x - 20.4, p.y - 0.4), Math.hypot(p.x - 29.6, p.y - 7.6)) > 1, 'colada numa câmera existente');
  }
  assert.match(op.descricao, /Acrescentar 2 × Câmera de CFTV em CAPELA \(1º pavimento\)/);
});

caso('retirar: o detector do CPD sai; "retire todos os detectores do térreo" tira os do pavimento', () => {
  const a = um('retire o detector do cpd').op;
  assert.deepStrictEqual(a.remover, [{ simbolo: 'HM-INC-DETECTOR-FUMACA', x: 2, y: 2 }]);
  const b = um('retire todos os detectores do térreo').op;
  assert.strictEqual(b.remover.length, 2);
  assert.ok(b.remover.every(p => salaDe(p.x, p.y).pavimento === 'Térreo'));
  // não existe: avisa em vez de inventar
  assert.match(interpretar('retire o detector do banheiro', CTX).duvidas[0], /Não há/);
});

caso('estrutura na elaboração: "leve o rack para o depósito" muda o local (critério) e os cabos são refeitos; QD pelo pavimento do destino', () => {
  const { op } = um('leve o rack para o depósito');
  assert.strictEqual(op.tipo, 'mover');
  assert.deepStrictEqual(op.centros, { telecom: { ambiente: 'DEPÓSITO', pavimento: '1º pavimento' } });
  assert.strictEqual(op.adicionar.length + op.remover.length, 0);
  assert.deepStrictEqual(um('mova o quadro para a capela').op.centros, { 'eletrica|1º pavimento': { ambiente: 'CAPELA', pavimento: '1º pavimento' } });
  // "a estrutura" sozinha: todas as do projeto
  assert.deepStrictEqual(Object.keys(um('mude a estrutura para o cpd').op.centros).sort(), ['eletrica|Térreo', 'incendio', 'telecom']);
  // projeto RECEBIDO (orçamento): o rack é retirado e posto no destino
  const rec = um('leve o rack para o depósito', { ...CTX, elaboracao: false }).op;
  assert.strictEqual(rec.remover.length, 1);
  assert.strictEqual(salaDe(rec.adicionar[0].x, rec.adicionar[0].y).nome, 'DEPÓSITO');
});

caso('mover componentes: "retire as câmeras da capela e coloque no depósito" vira UMA operação de mover', () => {
  const { r, op } = um('retire as câmeras da capela e coloque no depósito');
  assert.strictEqual(r.operacoes.length, 1);
  assert.strictEqual(op.tipo, 'mover');
  assert.strictEqual(op.remover.length, 2);
  assert.strictEqual(op.adicionar.length, 2);
  assert.ok(op.adicionar.every(p => salaDe(p.x, p.y).nome === 'DEPÓSITO'));
});

caso('sala com o mesmo nome em dois pavimentos: pergunta qual; "do térreo" resolve; plural vale para todas', () => {
  assert.match(interpretar('acrescente 1 câmera na circulação', CTX).duvidas[0], /mais de um pavimento/);
  const t = um('acrescente 1 câmera na circulação do térreo').op;
  assert.strictEqual(salaDe(t.adicionar[0].x, t.adicionar[0].y).pavimento, 'Térreo');
  const todas = um('acrescente 1 ponto de rede em todas as circulações').op;
  assert.strictEqual(todas.adicionar.length, 2);
});

caso('nome de sala com palavra de componente ("SALA DE TV") é lugar, não componente; várias ações e vários componentes', () => {
  const { r } = um('acrescente 2 tomadas na sala de tv e 1 detector na capela; retire 1 câmera da circulação do térreo');
  assert.deepStrictEqual(r.operacoes.map(o => [o.tipo, o.simbolo, o.ambiente]), [
    ['adicionar', 'HM-ELE-TOMADA-BAIXA', 'SALA DE TV'], ['adicionar', 'HM-INC-DETECTOR-FUMACA', 'CAPELA'], ['retirar', 'HM-CFTV-CAMERA', 'CIRCULAÇÃO'],
  ]);
});

caso('deixar N, trocar, número por extenso, "quarto 1" = "QUARTO - 01", ponto do desenho sem símbolo', () => {
  assert.strictEqual(um('deixe 1 câmera na capela').op.remover.length, 1);
  assert.strictEqual(um('3 detectores no cpd').op.adicionar.length, 2);
  const tr = um('troque a câmera por um detector na circulação do térreo').op;
  assert.strictEqual(tr.tipo, 'trocar');
  assert.strictEqual(tr.remover[0].simbolo, 'HM-CFTV-CAMERA');
  assert.strictEqual(tr.adicionar[0].simbolo, 'HM-INC-DETECTOR-FUMACA');
  assert.deepStrictEqual([tr.adicionar[0].x, tr.adicionar[0].y], [tr.remover[0].x, tr.remover[0].y]);
  assert.strictEqual(um('coloque duas câmeras no quarto 1').op.adicionar.length, 2);
  // a câmera desenhada sem símbolo (só a descrição) conta na circulação do 1º pavimento
  assert.strictEqual(um('retire a câmera da circulação do 1º pavimento').op.remover.length, 1);
});

caso('não entendeu: diz o quê, sem inventar; frase aprendida e aprovada passa a ser entendida', () => {
  const r = interpretar('faça um bolo', CTX);
  assert.strictEqual(r.operacoes.length, 0);
  assert.match(r.duvidas[0], /Não entendi/);
  assert.match(interpretar('acrescente 2 olhos de boi na capela', CTX).duvidas.join(' '), /componente|Não entendi/);
  const aprendeu = interpretar('acrescente 2 olhos de boi na capela', { ...CTX, aprendidas: { 'olho de boi': ['HM-ILU-LUMINARIA'] } });
  assert.strictEqual(aprendeu.operacoes[0].simbolo, 'HM-ILU-LUMINARIA');
  assert.strictEqual(aprendeu.operacoes[0].adicionar.length, 2);
  assert.match(interpretar('', CTX).duvidas[0], /Escreva/);
});

caso('singular das palavras e nomes oficiais da biblioteca', () => {
  assert.deepStrictEqual(['cameras', 'detectores', 'centrais', 'botoes', 'luzes', 'quartos', 'mais', 'tres'].map(T.singular),
    ['camera', 'detector', 'central', 'botao', 'luz', 'quarto', 'mais', 'tres']);
  assert.strictEqual(um('acrescente 1 detector pontual de temperatura na capela').op.simbolo, 'HM-INC-DETECTOR-TEMP');
});

caso('o que vem da tela é validado: componente que não existe, posição, local de estrutura, excesso', () => {
  const { lerOperacoes } = require('../src/controllers/projetos/instrucoes').paraTestes;
  assert.match(lerOperacoes([]), /Nada/);
  assert.match(lerOperacoes([{ adicionar: [{ simbolo: 'HM-NAO-EXISTE', x: 1, y: 1 }] }]), /não existe/);
  assert.match(lerOperacoes([{ remover: [{ simbolo: 'HM-CFTV-CAMERA', x: 'a', y: 1 }] }]), /Posição/);
  assert.match(lerOperacoes([{ centros: { 'telecom; drop table': { ambiente: 'CPD' } } }]), /estrutura/);
  assert.match(lerOperacoes(Array.from({ length: 21 }, () => ({ remover: [{ x: 1, y: 1 }] }))), /demais/);
  const ok1 = lerOperacoes([{ tipo: 'mover', descricao: 'x', centros: { telecom: { ambiente: 'CPD', pavimento: 'Térreo', extra: 1 } }, hack: true }]);
  assert.deepStrictEqual(ok1, [{ tipo: 'mover', descricao: 'x', adicionar: [], remover: [], centros: { telecom: { ambiente: 'CPD', pavimento: 'Térreo' } } }]);
});

caso('critérios: o local escolhido (centros) passa; vazio não', () => {
  const { lerCriterios } = require('../src/controllers/projetos/analises');
  assert.deepStrictEqual(lerCriterios({ centros: { telecom: { ambiente: 'CPD' } } }), { centros: { telecom: { ambiente: 'CPD' } } });
  assert.strictEqual(lerCriterios({ centros: {} }), null);
  assert.strictEqual(lerCriterios({ centros: ['x'] }), null);
});

caso('IA só reescreve: o pedido leva as salas e os componentes da análise, e nada mais', () => {
  const { promptIa } = require('../src/controllers/projetos/instrucoes').paraTestes;
  const p = promptIa('bota uma speed dome na capela', CTX);
  assert.match(p, /CAPELA \(1º pavimento\)/);
  assert.match(p, /Câmera de CFTV/);
  assert.match(p, /Responda SÓ com JSON/);
  assert.ok(!/JWT|senha|token/i.test(p));
});

caso('frases aprendidas: só as aprovadas, de componente que existe', async () => {
  const ap = require('../src/services/instrucoes/aprendidas');
  ap.esquecerCache();
  const db = { query: async () => ({ rows: [{ termos: ['Olho de Boi'], intencao: 'HM-ILU-LUMINARIA' }, { termos: ['x'], intencao: 'HM-NAO-EXISTE' }] }) };
  const m = await ap.carregar(db);
  assert.deepStrictEqual(m, { 'olho de boi': ['HM-ILU-LUMINARIA'] });
  ap.esquecerCache();
  const gravados = [];
  const n = await ap.sugerir({ query: async (sql, v) => { gravados.push(v); return { rows: [] }; } }, { termos: [{ frase: 'Speed Dome', simbolo: 'HM-CFTV-CAMERA' }, { frase: 'x'.repeat(80), simbolo: 'HM-CFTV-CAMERA' }, { frase: 'algo', simbolo: 'NAO' }], texto: 'bota uma speed dome', usuarioId: 1 });
  assert.strictEqual(n, 1);
  assert.strictEqual(gravados[0][5], 'instrucao:speed dome:HM-CFTV-CAMERA');
});

Promise.all(pendentes).then(() => console.log(`instruções da análise: ${ok} casos ok`));
