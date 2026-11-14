// Teste do 3D interativo de 09/11/2026 (dados SINTÉTICOS, sem navegador):
//   - quadro FIEL ao projeto: polos/In/curva/seção do diagrama, com a fonte, e [CONFERIR] no ausente;
//   - barramentos N/PE com a medida do projeto e com a medida calculada pela skill quadros;
//   - fiação F/N/PE de um circuito com DR; desligar o disjuntor apaga os condutores do circuito;
//   - motor genérico de interação: subestação (seccionadora × disjuntor, trafo, QGBT e circuitos),
//     incêndio (acionador → sirenes), alarme, CFTV (switch PoE) e controle de acesso;
//   - vista interna do rack e da central a partir do cálculo das skills;
//   - infraestrutura: cor do projeto × paleta padrão por tipo e a legenda só com os tipos presentes.
// Rodar: node skills/_comum/instalacao/teste-painel.js
const assert = require('assert');
const path = require('path');
const PQ = require('./painelQuadro');
const I = require('./interacao');
const PN = require('./paineis');
const { criarSimulador } = require('./simulador');
const { calcularBarramentos } = require('./barramentosCalculados');
const { instalacaoDoDesenho } = require('./doDesenho');
const CI = require('../cad/coresInfra');

const SKILLS = path.join(__dirname, '..', '..');
let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
};

// quadro sintético (como o diagrama do projeto chega ao modelo único)
function quadroExemplo(barramentos) {
  const q = {
    tag: 'QD-1', origem: 'unifilar', geral: { tag: 'QG', In: 63, polos: 3, curva: null }, alimentador: '4#16(16)16', alimentador_secao_mm2: 16,
    drs: [{ tag: 'DR1', In: 40, idn_ma: 30, polos: 4, lido: true, circuitos: ['3'] }],
    disjuntores: [
      { tag: 'Q1', circuito: '1', polos: 1, In: 10, curva: 'B', fontes: { In: 'unifilar', polos: 'unifilar', curva: 'unifilar' } },
      { tag: 'Q2', circuito: '2', polos: 2, In: 25, curva: null, fontes: { In: 'tabela', polos: 'tabela' } },
      { tag: 'Q3', circuito: '3', polos: 1, In: 20, curva: 'C', fontes: { In: 'unifilar', curva: 'unifilar', polos: 'unifilar' } },
    ],
    ...(barramentos ? { barramentos } : {}),
  };
  const circuitos = {
    1: { id: '1', quadro: 'QD-1', disjuntor: 'Q1', descricao: 'Iluminação', secao_mm2: 1.5, fontes: { secao_mm2: 'unifilar', descricao: 'unifilar' }, pontos: ['L1'] },
    2: { id: '2', quadro: 'QD-1', disjuntor: 'Q2', descricao: 'Ar-condicionado', secao_mm2: null, fontes: { descricao: 'tabela' }, pontos: [] },
    3: { id: '3', quadro: 'QD-1', disjuntor: 'Q3', descricao: 'Tomadas cozinha', secao_mm2: 2.5, fontes: { secao_mm2: 'tabela', descricao: 'unifilar' }, pontos: ['T1'] },
  };
  return { q, circuitos };
}
const instDe = (q, circuitos) => ({ quadros: [q], circuitos: Object.values(circuitos), pontos: [{ id: 'L1', tipo: 'luminaria', circuito: '1' }, { id: 'T1', tipo: 'tomada', circuito: '3' }], comandos: [] });

caso('disjuntor fiel ao projeto: polos, In, curva e seção com a fonte; o que falta sai [CONFERIR]', () => {
  const { q, circuitos } = quadroExemplo();
  const cena = PQ.montarQuadroEsquematico(q, { circuito: (id) => circuitos[id] });
  const q1 = cena.caixas.find(b => b.tag === 'Q1');
  const f = Object.fromEntries(q1.ficha.map(l => [l.campo, l]));
  assert.match(f.Polos.valor, /^1P/);
  assert.strictEqual(f['Corrente nominal (In)'].valor, '10 A');
  assert.strictEqual(f.Curva.valor, 'B');
  assert.strictEqual(f['Seção do cabo de saída'].valor, '1,5 mm²');
  assert.match(f['Corrente nominal (In)'].fonte, /unifilar/);
  // Icu não está no projeto: [CONFERIR], sem valor de norma inventado
  assert.strictEqual(f['Capacidade de interrupção (Icu/Icn)'].valor, PQ.CONFERIR);
  assert.ok(f['Capacidade de interrupção (Icu/Icn)'].conferir);
  // largura pelos polos: 2P = 2 módulos DIN de 18 mm
  assert.strictEqual(cena.caixas.find(b => b.tag === 'Q2').l, 36);
  const f2 = Object.fromEntries(cena.caixas.find(b => b.tag === 'Q2').ficha.map(l => [l.campo, l]));
  assert.ok(f2.Curva.conferir && f2['Seção do cabo de saída'].conferir, 'Q2 sem curva e sem seção no projeto');
  assert.match(f2['Corrente nominal (In)'].fonte, /quadro de cargas/);
  // DR: IΔn e circuitos protegidos do projeto
  const fd = Object.fromEntries(cena.caixas.find(b => b.tag === 'DR1').ficha.map(l => [l.campo, l]));
  assert.strictEqual(fd['Sensibilidade (IΔn)'].valor, '30 mA');
  assert.strictEqual(fd['Circuitos protegidos'].valor, '3');
});

caso('barramentos N/PE: medida do projeto (sem [CONFERIR]) e calculada pela skill quadros (conferir com o fabricante)', () => {
  const doProjeto = PQ.barramentosDoQuadro({ ...quadroExemplo().q, barramentos: { tipo: 'pente', pente: { a: 63, s: 10 }, neutro: { l: 15, e: 3 }, pe: { l: 12, e: 2 }, fonte: 'projeto' } }, { terminais: { N: 4, PE: 5 } });
  const N = doProjeto.barras.find(b => b.funcao === 'N'), PE = doProjeto.barras.find(b => b.funcao === 'PE');
  assert.deepStrictEqual([N.largura_mm, N.espessura_mm, PE.largura_mm, PE.espessura_mm], [15, 3, 12, 2]);
  assert.ok(!N.conferir && !PE.conferir && N.fonte === 'projeto');
  // furos pela regra da skill quadros: usados + 20 % + 2
  assert.strictEqual(PE.furos, 5 + 1 + 2);
  assert.ok(PE.comprimento_mm >= 20 + 10 * Math.ceil(PE.furos / 2));
  // calculado: geral 63 A → pente; PE pela Tabela 58 / curto (Icc da premissa, marcada)
  const calc = calcularBarramentos(quadroExemplo().q);
  assert.strictEqual(calc.tipo, 'pente');
  assert.strictEqual(calc.fonte, 'calculado');
  assert.strictEqual(calc.icc_informada, false);
  const b2 = PQ.barramentosDoQuadro({ ...quadroExemplo().q, barramentos: calc }, { terminais: { N: 3, PE: 4 } });
  const PE2 = b2.barras.find(b => b.funcao === 'PE');
  assert.ok(PE2.largura_mm > 0 && PE2.espessura_mm > 0 && PE2.conferir);
  assert.match(PE2.fonte_texto, /calculado.*conferir com o fabricante/);
  assert.strictEqual(PE2.cor, PQ.COR.barraPE);
  assert.strictEqual(b2.barras.find(b => b.funcao === 'N').cor, PQ.COR.barraN);
  // geral de 250 A: barras de fase pela DIN 43671
  const grande = calcularBarramentos({ tag: 'QGBT', geral: { In: 250, polos: 3 }, disjuntores: [] });
  assert.strictEqual(grande.tipo, 'barra');
  assert.ok(grande.fase.l * grande.fase.e >= 100);
  // sem In do geral no projeto: nada calculado → [CONFERIR]
  assert.strictEqual(calcularBarramentos({ tag: 'Q', geral: { In: null } }), null);
  const sem = PQ.barramentosDoQuadro({ tag: 'Q', geral: { tag: 'QG' }, disjuntores: [] });
  assert.ok(sem.barras.every(b => b.conferir));
});

caso('fiação de um circuito com DR: fase do disjuntor, neutro pela saída do DR, PE da barra PE, cor da função e seção do projeto', () => {
  const { q, circuitos } = quadroExemplo();
  const cena = PQ.montarQuadroEsquematico(q, { circuito: (id) => circuitos[id] });
  const c3 = cena.condutores.filter(c => c.circuito === '3');
  const F = c3.find(c => c.funcao === 'F'), N = c3.find(c => c.funcao === 'N'), PE = c3.find(c => c.funcao === 'PE');
  assert.ok(F && N && PE, JSON.stringify(c3.map(c => c.funcao)));
  assert.match(F.de, /^Q3/);
  assert.match(N.de, /DR1.*N/, 'o neutro do circuito sai do DR');
  assert.match(PE.de, /barra PE/);
  assert.ok([F, N, PE].every(c => c.secao_mm2 === 2.5 && c.pts.length >= 3));
  assert.strictEqual(N.cor, PQ.COR.N);
  assert.strictEqual(PE.cor, PQ.COR.PE);
  assert.strictEqual(PE.cor2, PQ.COR.PE_FAIXA);
  // o fio fica mais grosso com a seção (2,5 mm² > 1,5 mm²)
  const F1 = cena.condutores.find(c => c.circuito === '1' && c.funcao === 'F');
  assert.ok(F.d_mm > F1.d_mm);
  // alimentação → geral (3 fases) com a seção do alimentador; o geral alimenta o pente; o DR tem o N da barra
  assert.strictEqual(cena.condutores.filter(c => c.energia?.tipo === 'entrada' && c.funcao === 'F').length, 3);
  assert.ok(cena.condutores.some(c => /DR1 — polo N \(entrada\)/.test(c.para)));
  assert.ok(cena.condutores.filter(c => c.energia?.tipo === 'entrada').every(c => c.secao_mm2 === 16));
  // circuito sem seção no projeto: condutor marcado
  assert.ok(cena.condutores.filter(c => c.circuito === '2').every(c => c.secao_mm2 == null && c.conferir.some(t => /seção/.test(t))));
  // camadas liga/desliga
  for (const k of ['barramentos', 'fiacao-F', 'fiacao-N', 'fiacao-PE', 'canaletas', 'bornes']) assert.ok(cena.camadas.some(c => c.id === k), k);
});

caso('desligar um disjuntor apaga os condutores do circuito (o PE continua); desligar o DR apaga os dele', () => {
  const { q, circuitos } = quadroExemplo();
  const cena = PQ.montarQuadroEsquematico(q, { circuito: (id) => circuitos[id] });
  const sim = criarSimulador(instDe(q, circuitos));
  const on = (c) => PQ.condutorEnergizado(c, { sim, quadroTag: 'QD-1' });
  const doCirc = (id) => cena.condutores.filter(c => c.circuito === id);
  assert.ok(doCirc('3').every(on));
  sim.desligar('Q3', 'QD-1');
  assert.ok(doCirc('3').filter(c => c.funcao !== 'PE').every(c => !on(c)), 'F e N do circuito 3 apagam');
  assert.ok(doCirc('3').filter(c => c.funcao === 'PE').every(on), 'o PE não é seccionado');
  assert.ok(doCirc('1').every(on), 'os outros circuitos seguem');
  assert.strictEqual(sim.estadoPonto('T1').energizado, false);
  sim.ligar('Q3', 'QD-1');
  sim.desligar('DR1', 'QD-1');
  assert.ok(!on(doCirc('3').find(c => c.funcao === 'F')));
  assert.ok(cena.condutores.filter(c => c.energia?.tipo === 'tags' && c.energia.tags.includes('DR1')).every(c => !on(c)));
  sim.ligar('DR1', 'QD-1');
  sim.desligar('QG', 'QD-1');
  assert.ok(cena.condutores.filter(c => c.funcao === 'F' && c.energia?.tipo === 'entrada').every(on), 'a chegada continua com tensão');
  assert.ok(cena.condutores.filter(c => c.circuito).filter(c => c.funcao !== 'PE').every(c => !on(c)), 'geral desligado: todas as saídas apagam');
});

caso('cena de fabricação da skill quadros: barras marcadas, fiação completa e ficha fiel', () => {
  const Q = require(path.join(SKILLS, 'quadros', 'scripts', 'lib', 'index'));
  const { montarCena } = require(path.join(SKILLS, 'quadros', 'scripts', 'lib', 'modelo3d'));
  const dados = require(path.join(SKILLS, 'quadros', 'exemplos', 'exemplo-qd-predial.json'));
  const r = Q.processar(JSON.parse(JSON.stringify(dados)));
  const cena = montarCena(r.calc, dados);
  assert.ok(cena.caixas.some(b => b.barra === 'N') && cena.caixas.some(b => b.barra === 'PE'));
  assert.ok(cena.condutores.length > 20);
  const funcoes = new Set(cena.condutores.map(c => c.funcao));
  assert.deepStrictEqual([...funcoes].sort(), ['F', 'N', 'PE']);
  assert.ok(cena.camadas.some(c => c.id === 'fiacao-PE'));
  assert.ok(cena.caixas.find(b => b.tag === 'Q1').ficha.some(l => l.campo === 'Corrente nominal (In)' && /A$/.test(l.valor)));
  assert.strictEqual(r.instalacao.quadros[0].barramentos.fonte, 'calculado');
});

caso('diagrama → modelo único: curva e fonte de cada dado chegam ao disjuntor; barramentos calculados pelo geral do projeto', () => {
  const lidos = [{ tag: 'QD-1', origem: 'unifilar+tabela', geral: { In: 50, polos: 3 }, alimentador: '4#10(10)10', alimentador_secao_mm2: 10, drs: [],
    circuitos: [{ numero: '1', descricao: 'Iluminação', tipo: 'iluminacao', In: 10, polos: 1, curva: 'B', secao_mm2: 1.5, fontes: { In: 'unifilar', curva: 'tabela', secao_mm2: 'unifilar' } }] }];
  const r = instalacaoDoDesenho([{ simbolo: 'HM-ELE-QUADRO', forma: 'quadro', disciplina: 'eletrica', x: 0, y: 0, ambiente: -1 }, { simbolo: 'HM-ILU-LUMINARIA', forma: 'luminaria', disciplina: 'iluminacao', x: 1, y: 1, ambiente: -1, circuito: '1' }], { quadros: lidos });
  const q = r.instalacao.quadros[0];
  assert.strictEqual(q.disjuntores[0].curva, 'B');
  assert.strictEqual(q.disjuntores[0].fontes.curva, 'tabela');
  assert.strictEqual(q.alimentador_secao_mm2, 10);
  assert.strictEqual(q.barramentos.fonte, 'calculado');
  const f = Object.fromEntries(PQ.fichaDoDisjuntor(q, q.disjuntores[0], r.instalacao.circuitos[0]).map(l => [l.campo, l]));
  assert.match(f.Curva.fonte, /quadro de cargas/);
  assert.match(f['Corrente nominal (In)'].fonte, /unifilar/);
});

// ── subestação ──────────────────────────────────────────────────────────────
const COMPS_SE = [
  { id: 'cf', tipo: 'chave_fusivel', descricao: 'Chave fusível 15 kV' }, { id: 'secc', tipo: 'chave_seccionadora', descricao: 'Seccionadora tripolar' },
  { id: 'dj', tipo: 'disjuntor_mt', descricao: 'Disjuntor 15 kV' }, { id: 'rele', tipo: 'rele', descricao: 'Relé 50/51' },
  { id: 'tr', tipo: 'transformador', descricao: 'Trafo 150 kVA' }, { id: 'qg', tipo: 'qgbt', descricao: 'QGBT' }, { id: 'ext', tipo: 'extintor' },
];
caso('subestação: seccionadora não abre sob carga; aberta, desenergiza o trafo, o QGBT e os circuitos de BT', () => {
  const r = I.redeDaSubestacao(COMPS_SE);
  assert.ok(!r.equipamentos.some(e => e.id === 'ext'), 'extintor não entra na rede elétrica');
  const rede = I.criarInteracao(r.equipamentos);
  const inst = { quadros: [{ tag: 'QGBT', geral: { tag: 'QG', In: 250, polos: 3 }, drs: [], disjuntores: [{ tag: 'Q1', circuito: '1', polos: 1, In: 16 }] }], circuitos: [{ id: '1', quadro: 'QGBT', disjuntor: 'Q1', pontos: ['T1'] }], pontos: [{ id: 'T1', tipo: 'tomada', circuito: '1' }], comandos: [] };
  const sim = criarSimulador(inst);
  I.ligarAoSimulador(rede, sim);
  assert.ok(rede.saida('tr') && rede.saida('qg') && sim.alimentado('1'));
  // ordem de manobra: com o disjuntor fechado a seccionadora NÃO abre (aviso didático)
  const recusa = rede.agir('secc', 'abrir');
  assert.match(recusa, /recusada.*NUNCA abra a seccionadora sob carga/);
  assert.strictEqual(rede.estado('secc'), 'fechada');
  assert.match(rede.agir('dj', 'abrir'), /geral de BT/, 'aviso: abrir antes o geral de BT');
  assert.match(rede.agir('secc', 'abrir'), /aberta/);
  assert.strictEqual(rede.saida('tr'), false);
  assert.strictEqual(rede.situacao('tr').texto, 'DESENERGIZADO');
  assert.strictEqual(rede.saida('qg'), false);
  assert.strictEqual(sim.alimentado('1'), false);
  assert.match(sim.motivo('1'), /QGBT sem alimentação/);
  assert.strictEqual(sim.estadoPonto('T1').energizado, false);
  assert.ok(!sim.quadroEnergizado('QGBT'));
  // religar na sequência: seccionadora (com o disjuntor aberto) → disjuntor
  rede.agir('secc', 'fechar');
  rede.agir('dj', 'fechar');
  assert.ok(sim.alimentado('1'));
});

caso('subestação: trip pelo relé 50/51 abre o disjuntor; não fecha sem rearmar o relé; fusível queimado', () => {
  const rede = I.criarInteracao(I.redeDaSubestacao(COMPS_SE).equipamentos);
  rede.agir('rele', 'atuar');
  assert.strictEqual(rede.estado('dj'), 'disparado');
  assert.strictEqual(rede.aparencia('dj'), 'falha');
  assert.ok(!rede.saida('tr'));
  rede.agir('dj', 'rearmar');
  assert.match(rede.agir('dj', 'fechar'), /recusada.*rearme o relé/);
  rede.agir('rele', 'rearmar');
  rede.agir('dj', 'fechar');
  assert.ok(rede.saida('tr'));
  rede.agir('cf', 'queimar');
  assert.ok(!rede.saida('tr') && rede.situacao('tr').motivo.includes('fusível queimado'));
});

// ── sistemas de sinal ───────────────────────────────────────────────────────
caso('incêndio: acionador manual → central em alarme → avisadores tocam; reset só com o acionador rearmado', () => {
  const r = I.redeDeSinal([
    { id: 'C', simbolo: 'HM-INC-CENTRAL', x: 0, y: 0 }, { id: 'AM', simbolo: 'HM-INC-ACIONADOR', x: 2, y: 0 },
    { id: 'DF', simbolo: 'HM-INC-DETECTOR-FUMACA', x: 3, y: 1 }, { id: 'AV1', simbolo: 'HM-INC-AVISADOR', x: 4, y: 0 }, { id: 'AV2', simbolo: 'HM-INC-AVISADOR', x: 5, y: 0 },
  ]);
  const rede = I.criarInteracao(r.equipamentos);
  assert.ok(!rede.saida('AV1'));
  rede.agir('AM', 'acionar');
  assert.strictEqual(rede.estado('C'), 'alarme');
  assert.ok(rede.saida('AV1') && rede.saida('AV2'));
  assert.match(rede.situacao('AV1').texto, /TOCANDO/);
  rede.agir('C', 'silenciar');
  assert.ok(!rede.saida('AV1'));
  assert.match(rede.agir('C', 'rearmar'), /recusada/);
  rede.agir('AM', 'rearmar');
  rede.agir('C', 'rearmar');
  assert.strictEqual(rede.estado('C'), 'normal');
  // detector também dispara (o alarme fica guardado até o reset)
  rede.agir('DF', 'detectar');
  rede.agir('DF', 'limpar');
  assert.strictEqual(rede.estado('C'), 'alarme');
});

caso('alarme, CFTV e controle de acesso: zona violada só dispara armado; switch PoE desligado apaga as câmeras; botoeira libera a fechadura', () => {
  const r = I.redeDeSinal([
    { id: 'CA', simbolo: 'HM-ALM-CENTRAL', x: 0, y: 0 }, { id: 'IVP', simbolo: 'HM-ALM-IVP', x: 1, y: 0 }, { id: 'SR', simbolo: 'HM-ALM-SIRENE', x: 2, y: 0 }, { id: 'TK', simbolo: 'HM-ALM-TECLADO', x: 0, y: 1 },
    { id: 'RK', simbolo: 'HM-CAB-RACK', x: 0, y: 5 }, { id: 'CAM1', simbolo: 'HM-CFTV-CAMERA', x: 3, y: 5 },
    { id: 'FE', simbolo: 'HM-ACE-FECHADURA', x: 10, y: 0 }, { id: 'BT', simbolo: 'HM-ACE-BOTOEIRA', x: 10.5, y: 0.5 }, { id: 'EM', simbolo: 'HM-ACE-EMERGENCIA', x: 12, y: 0 },
  ]);
  const rede = I.criarInteracao(r.equipamentos);
  rede.agir('IVP', 'violar');
  assert.ok(!rede.saida('SR'), 'desarmado: não dispara');
  assert.match(rede.agir('TK', 'armar'), /recusada/, 'não arma com zona aberta');
  rede.agir('IVP', 'normalizar');
  rede.agir('TK', 'armar');
  assert.strictEqual(rede.estado('CA'), 'armado');
  rede.agir('IVP', 'violar');
  assert.ok(rede.saida('SR') && rede.estado('CA') === 'disparado');
  assert.ok(rede.saida('CAM1'));
  rede.agir('RK', 'desligar');
  assert.ok(!rede.saida('CAM1'));
  assert.match(rede.situacao('CAM1').texto, /SEM ENERGIA/);
  assert.strictEqual(rede.estado('FE'), 'travada');
  rede.agir('BT', 'liberar');
  assert.strictEqual(rede.estado('FE'), 'liberada');
  rede.agir('FE', 'travar');
  rede.agir('EM', 'acionar');
  assert.strictEqual(rede.estado('FE'), 'liberada');
  // contrato: o `interacao` declarado no componente vale sobre o perfil
  const meu = I.comPerfil({ id: 'X', tipo: 'qualquer', interacao: { regra: 'fonte', estados: ['a', 'b'], inicial: 'b', conduz: ['a'] } }, 'cftv_switch');
  assert.strictEqual(I.criarInteracao([meu]).saida('X'), false);
});

caso('vista interna: rack pelo cálculo das skills cabeamento/cftv e central pelo cálculo da skill incendio', () => {
  const cab = require(path.join(SKILLS, 'cabeamento', 'scripts', 'lib', 'calculo')).calcular(require(path.join(SKILLS, 'cabeamento', 'exemplos', 'exemplo-escritorio.json')));
  const cftv = require(path.join(SKILLS, 'cftv', 'scripts', 'lib', 'calculo')).calcular(require(path.join(SKILLS, 'cftv', 'exemplos', 'exemplo-comercio.json')));
  const pav = cab.pavimentos[0];
  const d = PN.dadosDoRack({ cabeamento: pav, cftv, portasPainel: cab.cfg.portasPainel, portasSwitch: cab.cfg.portasSwitch, equipamentoSwitch: 'RK' });
  assert.strictEqual(d.patchPanels.filter(p => p.uso === 'dados').length, pav.paineisPorFd);
  assert.strictEqual(d.patchPanels.filter(p => p.uso === 'dados').reduce((s, p) => s + p.usadas, 0), pav.pontosPorFd);
  assert.strictEqual(d.switches.filter(s => s.uso === 'cftv').length, cftv.switches);
  const cena = PN.cenaDoRack(d);
  assert.strictEqual(cena.tipo, 'quadro');
  assert.ok(cena.condutores.length >= pav.pontosPorFd, 'um cordão por porta usada');
  assert.ok(cena.caixas.some(b => b.equipamento === 'RK'), 'o switch de CFTV é o equipamento do prédio');
  // switch desligado: cordões dele sem energia
  const rede = I.criarInteracao([...cena.equipamentos, I.comPerfil({ id: 'RK', tipo: 'cftv_switch' }, 'cftv_switch')]);
  rede.agir('RK', 'desligar');
  const cordCam = cena.condutores.filter(c => c.energia?.id === 'RK');
  assert.ok(cordCam.length && cordCam.every(c => !PQ.condutorEnergizado(c, { rede })));
  const inc = require(path.join(SKILLS, 'incendio', 'scripts', 'lib', 'calculo')).calcular(require(path.join(SKILLS, 'incendio', 'exemplos', 'exemplo-escritorio.json')));
  const dc = PN.dadosDaCentral({ calculo: inc });
  assert.strictEqual(dc.circuitos, inc.tipoSistema === 'enderecavel' ? inc.lacos : inc.zonas);
  assert.strictEqual(dc.bateriaAh, inc.bateria.bateriaEscolhida);
  const cc = PN.cenaDaCentral(dc);
  assert.ok(cc.condutores.filter(c => c.funcao === 'laco').length === dc.circuitos);
  // sem o cálculo da skill: contagem do projeto e [CONFERIR] no que falta
  const sem = PN.cenaDaCentral(PN.dadosDaCentral({ contagem: { detectores: 3, acionadores: 1, avisadores: 2 } }));
  assert.ok(sem.caixas[0].ficha.some(l => l.campo === 'Laços' && l.conferir));
  assert.ok(sem.caixas[0].ficha.some(l => l.campo === 'Detectores' && l.valor === '3'));
});

// ── cores da infraestrutura ─────────────────────────────────────────────────
caso('infraestrutura: cor do projeto (legenda/DXF) × paleta padrão por tipo; componentes na cor do tipo', () => {
  assert.strictEqual(CI.tipoDeInfra({ tipo: 'eletroduto', material: 'PVC rígido' }), 'eletroduto_rigido');
  assert.strictEqual(CI.tipoDeInfra({ tipo: 'eletroduto', material: 'PVC corrugado' }), 'eletroduto_flexivel');
  assert.strictEqual(CI.tipoDeInfra({ tipo: 'eletroduto', material: 'PEAD corrugado enterrado' }), 'eletroduto_enterrado');
  assert.strictEqual(CI.tipoDeInfra({ tipo: 'eletroduto', layers: ['ELE-ELETRODUTO-FLEX'] }), 'eletroduto_flexivel');
  assert.strictEqual(CI.tipoDeInfra({ tipo: 'eletroduto' }), 'eletroduto', 'sem material: não inventa');
  assert.strictEqual(CI.corAci(5), '#0000ff');
  const infra = [
    { tipo: 'eletrocalha', comprimento_m: 10, cor_projeto: CI.corDoTrecho({ cor_aci: 150, cor_fonte: 'layer' }) },
    { tipo: 'eletrocalha', comprimento_m: 4 },                    // sem cor própria: a do tipo no projeto
    { tipo: 'eletroduto', material: 'PVC rígido', comprimento_m: 8 },
    { tipo: 'eletroduto', material: 'PVC corrugado', comprimento_m: 6 },
    { tipo: 'eletroduto', sugerido: true, comprimento_m: 3 },
  ];
  CI.aplicarCoresInfra(infra);
  assert.strictEqual(infra[0].cor, CI.corAci(150));
  assert.strictEqual(infra[0].cor_fonte, 'layer');
  assert.strictEqual(infra[1].cor, CI.corAci(150), 'o tipo pega a cor que o projeto dá a ele');
  assert.strictEqual(infra[2].cor, CI.TIPOS_INFRA.eletroduto_rigido.cor);
  assert.strictEqual(infra[2].cor_fonte, 'padrao');
  assert.notStrictEqual(infra[2].cor, infra[3].cor, 'rígido e corrugado com cores diferentes');
  assert.strictEqual(infra[4].cor, CI.TIPOS_INFRA.sugerido.cor);
  // legenda do projeto vale sobre a paleta e sobre a cor da layer
  const infra2 = [{ tipo: 'eletroduto', material: 'PVC rígido', comprimento_m: 5, cor_projeto: { cor: '#123456', fonte: 'layer' } }, { tipo: 'perfilado', comprimento_m: 2 }];
  CI.aplicarCoresInfra(infra2, { legendaInfra: [{ tipo: 'perfilado', cor: '#ab00cd' }] });
  assert.strictEqual(infra2[1].cor, '#ab00cd');
  assert.strictEqual(infra2[1].cor_fonte, 'legenda');
  // paleta: todos os tipos com cores distintas
  const cores = Object.values(CI.TIPOS_INFRA).map(t => t.cor);
  assert.strictEqual(new Set(cores).size, cores.length);
});

caso('legenda de cores: só os tipos presentes, com medidas, metragem e a fonte da cor; a cena traz pronta', () => {
  const { montarCena } = require('../cad/modelo3d');
  const arq = { ambientes: [{ nome: 'SALA', poligono: [[0, 0], [8, 0], [8, 6], [0, 6]], area_m2: 48 }], referencia: [], portas: [] };
  const cena = montarCena(arq, {
    peDireito: 3, estimarInfra: false,
    trechos: [
      { disciplina: 'eletrica', tipo: 'eletrocalha', secao_mm: [100, 50], medida: '100 × 50 mm', segmentos: [[1, 1, 7, 1]], cor_aci: 30, cor_fonte: 'entidade' },
      { disciplina: 'eletrica', tipo: 'eletroduto', material: 'PVC corrugado', medida: 'Ø 20 mm', secao_mm: [20, 20], segmentos: [[1, 2, 7, 2], [7, 2, 7, 5]] },
    ],
  });
  const tipos = cena.legendaInfra.map(l => l.tipo);
  assert.deepStrictEqual(tipos, ['eletroduto_flexivel', 'eletrocalha']);
  const calha = cena.legendaInfra.find(l => l.tipo === 'eletrocalha');
  assert.strictEqual(calha.cor, CI.corAci(30));
  assert.strictEqual(calha.cor_fonte, 'entidade');
  assert.deepStrictEqual(calha.medidas, ['100 × 50 mm']);
  assert.ok(calha.comprimento_m > 5.9);
  const flex = cena.legendaInfra.find(l => l.tipo === 'eletroduto_flexivel');
  assert.strictEqual(flex.cor_fonte, 'padrao');
  assert.ok(cena.infra.every(g => g.tipoInfra && /^#[0-9a-f]{6}$/.test(g.cor)));
});

console.log(`painel, interação e cores da infraestrutura (09/11/2026): ${ok} casos ok`);
