// Teste do simulador lógico da instalação (fase 2 do roteiro — 3D interativo), sem
// navegador: energizado(ponto) = geral ∧ DR ∧ disjuntor ∧ lógica do comando; interruptor
// simples, paralelo e intermediário; relé de impulso; contator com selo, desliga e
// emergência; sensor; dimmer e cenas; painel de motor (liga, desliga, emergência,
// sinaleiros, relé térmico desarmado); o projeto exemplo da elétrica (desligar o
// disjuntor do circuito apaga as luminárias dele e deixa as tomadas sem energia) e o
// quadro de automação da skill quadros (partidas de motor).
// Rodar: node skills/_comum/instalacao/teste-simulador.js
const assert = require('assert');
const path = require('path');
const I = require('./index');
const { criarSimulador } = require('./simulador');

const SKILLS = path.join(__dirname, '..', '..');
let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
};
const clone = (o) => JSON.parse(JSON.stringify(o));

// Instalação de teste: um quadro com geral, DR de dois circuitos e um comando de cada tipo
function exemplo() {
  const inst = I.novaInstalacao('teste');
  const q = { tag: 'QD-01', geral: { tag: 'Q0', In: 40, polos: 2 }, drs: [{ tag: 'DR1', In: 25, idn_ma: 30, polos: 2, circuitos: ['2', '3'] }], disjuntores: [] };
  inst.quadros.push(q);
  const circ = (id, tipo, extra = {}) => { inst.circuitos.push({ id, quadro: 'QD-01', disjuntor: `Q${id}`, tipo, potencia_va: 0, pontos: [], ...extra }); q.disjuntores.push({ tag: `Q${id}`, circuito: id, polos: 1, In: 10 }); };
  const ponto = (id, tipo, circuito, comando = null) => { inst.pontos.push({ id, tipo, circuito, comando, carga_va: 0 }); inst.circuitos.find(c => c.id === circuito).pontos.push(id); };
  const cmd = (id, tipo, circuito, dispositivos, pontos, extra = {}) => inst.comandos.push({ id, tipo, circuitos: [circuito], dispositivos, pontos, ...extra });
  circ('1', 'iluminacao'); circ('2', 'tug'); circ('3', 'iluminacao'); circ('M1', 'motor', { descricao: 'Bomba de recalque' });
  // 1a: simples — 1b: paralelo — 1c: paralelo + intermediário — 3a: pulsadores + relé de impulso
  ponto('S1', 'interruptor_simples', '1', '1a'); ponto('L1', 'ponto_luz', '1', '1a');
  ponto('S2', 'interruptor_paralelo', '1', '1b'); ponto('S3', 'interruptor_paralelo', '1', '1b'); ponto('L2', 'ponto_luz', '1', '1b');
  ponto('S4', 'interruptor_paralelo', '1', '1c'); ponto('S5', 'interruptor_intermediario', '1', '1c'); ponto('S6', 'interruptor_paralelo', '1', '1c'); ponto('L3', 'ponto_luz', '1', '1c');
  ponto('P1', 'pulsador', '3', '3a'); ponto('P2', 'pulsador', '3', '3a'); ponto('L4', 'luminaria', '3', '3a');
  ponto('B1', 'botoeira', '3', '3b'); ponto('L5', 'luminaria', '3', '3b');
  ponto('SP1', 'sensor', '3', '3c'); ponto('S7', 'interruptor', '3', '3c'); ponto('L6', 'luminaria', '3', '3c');
  ponto('D1', 'dimmer', '3', '3d'); ponto('L7', 'luminaria', '3', '3d');
  ponto('TC1', 'teclado_cena', '3', '3e'); ponto('L8', 'luminaria', '3', '3e');
  ponto('T1', 'tomada', '2'); ponto('T2', 'tomada', '2');
  ponto('MB1', 'motor', 'M1');
  cmd('1a', 'interruptor_simples', '1', ['S1'], ['L1']);
  cmd('1b', 'interruptor_paralelo', '1', ['S2', 'S3'], ['L2']);
  cmd('1c', 'interruptor_intermediario', '1', ['S4', 'S5', 'S6'], ['L3']);
  cmd('3a', 'pulsador_rele_impulso', '3', ['P1', 'P2'], ['L4'], { rele: { tag: 'KI1', tipo: 'impulso' } });
  cmd('3b', 'contator_botoeira', '3', ['B1'], ['L5'], { rele: { tag: 'K1', tipo: 'contator', selo: true } });
  cmd('3c', 'sensor_presenca', '3', ['SP1', 'S7'], ['L6']);
  cmd('3d', 'dimmer', '3', ['D1'], ['L7']);
  cmd('3e', 'cena', '3', ['TC1'], ['L8']);
  return inst;
}

caso('o modelo de teste é coerente (validador da fase 1)', () => {
  assert.deepStrictEqual(I.validarInstalacao(exemplo()).erros, []);
});

caso('início "ligado": disjuntores ligados, luzes acesas, tomadas com energia, motor parado', () => {
  const s = criarSimulador(exemplo());
  for (const id of ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'T1', 'T2']) assert.strictEqual(s.energizado(id), true, id);
  assert.strictEqual(s.energizado('MB1'), false);
  assert.strictEqual(s.ligado('Q3'), true);
  const d = criarSimulador(exemplo(), { inicio: 'desligado' });
  assert.strictEqual(d.energizado('L1'), false);
  assert.strictEqual(d.energizado('T1'), true);
});

caso('energizado = geral ∧ DR ∧ disjuntor ∧ comando (com o motivo)', () => {
  const s = criarSimulador(exemplo());
  s.desligar('Q3');
  assert.deepStrictEqual(['L4', 'L5', 'L6', 'L7', 'L8'].map(s.energizado), [false, false, false, false, false]);
  assert.strictEqual(s.energizado('L1'), true, 'outro circuito continua');
  assert.match(s.estadoPonto('L4').texto, /sem energia \(disjuntor Q3 desligado\)/);
  s.ligar('Q3');
  assert.strictEqual(s.energizado('L4'), true, 'relé de impulso guarda a posição');
  assert.strictEqual(s.energizado('L5'), false, 'contator com selo caiu na falta de tensão e não volta sozinho');
  // DR do grupo 2 e 3
  s.alternar('DR1');
  assert.strictEqual(s.energizado('T1'), false);
  assert.match(s.estadoPonto('T1').texto, /SEM ENERGIA \(DR1 \(DR\) do QD-01 desligado\)/);
  assert.strictEqual(s.energizado('L1'), true, 'circuito 1 fora do DR');
  s.alternar('DR1');
  // geral
  s.desligar('Q0');
  assert.ok(['L1', 'L2', 'L3', 'T1', 'T2', 'L7'].every(id => !s.energizado(id)));
  assert.match(s.motivo('1'), /disjuntor geral Q0 do QD-01 desligado/);
  s.ligar('Q0');
  assert.strictEqual(s.energizado('L1'), true);
});

caso('interruptores: simples, paralelo (two-way) e intermediário (four-way) — qualquer tecla inverte', () => {
  const s = criarSimulador(exemplo(), { inicio: 'desligado' });
  s.acionar('S1'); assert.strictEqual(s.energizado('L1'), true);
  s.acionar('S1'); assert.strictEqual(s.energizado('L1'), false);
  s.acionar('S2'); assert.strictEqual(s.energizado('L2'), true);
  s.acionar('S3'); assert.strictEqual(s.energizado('L2'), false, 'paralelo: a outra ponta apaga');
  s.acionar('S2'); assert.strictEqual(s.energizado('L2'), true);
  for (const [tecla, esperado] of [['S4', true], ['S5', false], ['S6', true], ['S5', false], ['S4', true]]) {
    s.acionar(tecla);
    assert.strictEqual(s.energizado('L3'), esperado, `após ${tecla}`);
  }
  // clicar na luminária aciona o comando dela (1º dispositivo)
  s.acionar('L1'); assert.strictEqual(s.energizado('L1'), true);
});

caso('pulsador com relé de impulso: cada pulso alterna; sem tensão na bobina, o pulso não faz nada', () => {
  const s = criarSimulador(exemplo(), { inicio: 'desligado' });
  s.acionar('P1'); assert.strictEqual(s.energizado('L4'), true);
  s.acionar('P2'); assert.strictEqual(s.energizado('L4'), false);
  s.acionar('P2'); assert.strictEqual(s.energizado('L4'), true);
  s.desligar('Q3');
  assert.match(s.acionar('P1'), /sem efeito/);
  s.ligar('Q3');
  assert.strictEqual(s.energizado('L4'), true);
});

caso('contator com botoeira: liga sela, desliga e emergência derrubam, emergência trava o liga', () => {
  const s = criarSimulador(exemplo(), { inicio: 'desligado' });
  s.acionar('B1', 'liga'); assert.strictEqual(s.energizado('L5'), true);
  assert.strictEqual(s.estadoComando('3b').k, true, 'selo');
  s.acionar('B1', 'desliga'); assert.strictEqual(s.energizado('L5'), false);
  s.acionar('B1', 'liga'); s.acionar('B1', 'emergencia');
  assert.strictEqual(s.energizado('L5'), false);
  assert.match(s.acionar('B1', 'liga'), /emergência/);
  assert.strictEqual(s.energizado('L5'), false);
  s.acionar('B1', 'liberar');
  assert.strictEqual(s.energizado('L5'), false, 'liberar não religa');
  s.acionar('B1'); assert.strictEqual(s.energizado('L5'), true, 'sem ação = alterna (liga)');
  s.acionar('B1'); assert.strictEqual(s.energizado('L5'), false, 'sem ação = alterna (desliga)');
});

caso('sensor de presença com desligamento manual; dimmer e teclado de cenas', () => {
  const s = criarSimulador(exemplo(), { inicio: 'desligado' });
  assert.strictEqual(s.energizado('L6'), false);
  s.acionar('SP1'); assert.strictEqual(s.energizado('L6'), true, 'presença');
  s.acionar('S7'); assert.strictEqual(s.energizado('L6'), false, 'interruptor inibe o sensor');
  s.acionar('S7'); s.acionar('SP1'); assert.strictEqual(s.energizado('L6'), false, 'ambiente vazio');
  s.acionar('D1'); assert.strictEqual(s.estadoPonto('L7').nivel, 1);
  s.acionar('D1', 0.4); assert.strictEqual(s.estadoPonto('L7').nivel, 0.4);
  assert.match(s.estadoPonto('L7').texto, /40 %/);
  s.acionar('D1'); assert.strictEqual(s.energizado('L7'), false);
  s.acionar('D1'); assert.strictEqual(s.estadoPonto('L7').nivel, 0.4, 'volta ao último nível');
  const niveis = [1, 2, 3, 4].map(() => { s.acionar('TC1'); return s.estadoPonto('L8').nivel; });
  assert.deepStrictEqual(niveis, [1, 0.6, 0.3, 0]);
});

caso('painel de motor: liga, desliga, emergência, sinaleiros e relé térmico desarmado', () => {
  const s = criarSimulador(exemplo());
  let p = s.painel('M1');
  assert.deepStrictEqual([p.girando, p.sinaleiros.branco, p.sinaleiros.verde], [false, true, false]);
  s.motor('M1', 'liga');
  p = s.painel('M1');
  assert.deepStrictEqual([p.girando, p.sinaleiros.verde, p.sinaleiros.vermelho], [true, true, false]);
  assert.strictEqual(s.energizado('MB1'), true);
  s.motor('M1', 'desarmar_termico');
  p = s.painel('M1');
  assert.deepStrictEqual([p.girando, p.contator, p.sinaleiros.amarelo, p.sinaleiros.vermelho], [false, false, true, true]);
  assert.match(s.motor('M1', 'liga'), /térmico/);
  s.motor('M1', 'rearmar'); assert.strictEqual(s.painel('M1').girando, false, 'rearme não religa');
  s.motor('M1', 'liga'); assert.strictEqual(s.painel('M1').girando, true);
  s.motor('M1', 'emergencia');
  assert.deepStrictEqual([s.painel('M1').girando, s.painel('M1').sinaleiros.vermelho], [false, true]);
  s.motor('M1', 'liberar'); s.motor('M1', 'liga');
  assert.strictEqual(s.painel('M1').girando, true);
  // emergência da porta do quadro para todos os motores do quadro
  s.emergenciaQuadro('QD-01', true); assert.strictEqual(s.painel('M1').girando, false);
  s.emergenciaQuadro('QD-01', false); s.motor('M1', 'liga');
  // falta de energia derruba o selo do contator
  s.desligar('QM1'); s.ligar('QM1');
  assert.strictEqual(s.painel('M1').girando, false);
  // clicar no motor no 3D alterna liga/desliga
  s.acionar('MB1'); assert.strictEqual(s.energizado('MB1'), true);
  s.motor('M1', 'desliga'); s.desligar('QM1');
  assert.match(s.motor('M1', 'liga'), /disjuntor QM1 desligado/);
});

caso('quadro alimentado por circuito de outro quadro; avisos para quem assina; exportar/importar', () => {
  const inst = exemplo();
  inst.circuitos.push({ id: 'AL1', quadro: 'QD-01', disjuntor: 'QAL1', tipo: 'alimentador', potencia_va: 0, pontos: [] });
  inst.quadros[0].disjuntores.push({ tag: 'QAL1', circuito: 'AL1', polos: 2, In: 32 });
  inst.quadros.push({ tag: 'QD-02', alimentado_por: 'AL1', geral: { tag: 'Q0', In: 32, polos: 2 }, drs: [], disjuntores: [{ tag: 'Q9', circuito: '9', polos: 1, In: 10 }] });
  inst.circuitos.push({ id: '9', quadro: 'QD-02', disjuntor: 'Q9', tipo: 'tug', potencia_va: 0, pontos: ['T9'] });
  inst.pontos.push({ id: 'T9', tipo: 'tomada', circuito: '9' });
  const s = criarSimulador(inst);
  const eventos = [];
  const sair = s.assinar(e => eventos.push(e.tipo));
  assert.strictEqual(s.energizado('T9'), true);
  s.desligar('QAL1');
  assert.strictEqual(s.energizado('T9'), false);
  assert.match(s.motivo('9'), /QD-02 sem alimentação \(disjuntor QAL1 desligado\)/);
  s.desligar('Q0', 'QD-02'); s.ligar('QAL1');
  assert.match(s.motivo('9'), /geral Q0 do QD-02/);
  assert.strictEqual(s.ligado('Q0', 'QD-01'), true, 'Q0 de cada quadro é um');
  s.acionar('S1');
  const v = s.versao;
  const salvo = s.exportar();
  const s2 = criarSimulador(inst);
  s2.importar(salvo);
  assert.deepStrictEqual(['T9', 'L1', 'T1'].map(s2.energizado), ['T9', 'L1', 'T1'].map(s.energizado));
  s2.importar({ protecao: { 'QD-01|Q1': 'lixo' }, comandos: { nada: {} } });
  assert.strictEqual(s2.ligado('Q1'), true);
  sair();
  s.reiniciar();
  assert.ok(s.versao > v);
  assert.deepStrictEqual(eventos, ['protecao', 'protecao', 'protecao', 'comando']);
  assert.strictEqual(s.energizado('T9'), true);
});

// ── Projeto exemplo da elétrica (com luminotécnico) ─────────────────────────
caso('exemplo da elétrica: desligar QIL1 apaga a Sala; Q2 deixa as tomadas sem energia; paralelo e impulso', () => {
  const ELE = require(path.join(SKILLS, 'eletrica', 'scripts', 'lib', 'index.js'));
  const res = ELE.processar(clone(require(path.join(SKILLS, 'eletrica', 'exemplos', 'exemplo-com-luminotecnico.json'))));
  const s = criarSimulador(res.instalacao);
  const inst = res.instalacao;
  const doCircuito = (c, tipos) => inst.pontos.filter(p => p.circuito === c && tipos.includes(p.tipo)).map(p => p.id);
  const luzIL1 = doCircuito('IL1', ['luminaria', 'ponto_luz']);
  assert.ok(luzIL1.length >= 4);
  assert.ok(luzIL1.every(s.energizado));
  s.desligar('QIL1');
  assert.ok(luzIL1.every(id => !s.energizado(id)), 'luzes do IL1 apagadas');
  assert.ok(doCircuito('IL2', ['luminaria', 'ponto_luz']).every(s.energizado), 'IL2 continua');
  s.ligar('QIL1');
  const tomadas = inst.pontos.filter(p => p.tipo === 'tomada' && p.circuito === inst.circuitos.find(c => c.tipo === 'tug').id).map(p => p.id);
  const c = inst.pontos.find(p => p.id === tomadas[0]).circuito;
  s.desligar(`Q${c}`);
  assert.ok(tomadas.every(id => !s.energizado(id)));
  assert.match(s.estadoPonto(tomadas[0]).texto, /^SEM ENERGIA/);
  // a Sala tem interruptores paralelos; a Cozinha, pulsadores com relé de impulso
  const sala = inst.comandos.find(k => k.ambiente === 'Sala');
  s.acionar(sala.dispositivos[1]);
  assert.ok(sala.pontos.every(id => !s.energizado(id)), 'paralelo: a outra ponta apaga');
  const coz = inst.comandos.find(k => k.tipo === 'pulsador_rele_impulso');
  s.acionar(coz.dispositivos[2]);
  assert.ok(coz.pontos.every(id => !s.energizado(id)));
  s.acionar(coz.dispositivos[0]);
  assert.ok(coz.pontos.every(s.energizado));
});

caso('quadro de automação (skill quadros): um painel por partida de motor, disjuntor-motor e DDR', () => {
  const Q = require(path.join(SKILLS, 'quadros', 'scripts', 'lib', 'index.js'));
  const q = Q.processar(clone(require(path.join(SKILLS, 'quadros', 'exemplos', 'exemplo-automacao.json'))));
  const s = criarSimulador(q.instalacao);
  const motores = q.instalacao.circuitos.filter(c => c.tipo === 'motor').map(c => c.id);
  assert.deepStrictEqual(s.paineis().map(p => p.id).sort(), [...motores].sort());
  const m = motores[0];
  s.motor(m, 'liga');
  assert.strictEqual(s.painel(m).girando, true);
  s.desligar(`${m}-Q1`);
  assert.strictEqual(s.painel(m).girando, false);
  assert.strictEqual(s.painel(m).sinaleiros.branco, false);
  // DDR: o disjuntor e o DR são o mesmo dispositivo
  const ddr = q.instalacao.quadros[0].drs.find(d => d.ddr);
  assert.strictEqual(s.dispositivo(ddr.tag).tipo, 'ddr');
  s.desligar(ddr.tag);
  assert.strictEqual(s.alimentado(ddr.circuitos[0]), false);
});

// ── Fase 5: cenas definidas no projeto (nome e % de cada grupo) ─────────────
caso('cenas do projeto: nível por grupo, troca de cena, desligado e DALI-2 com cenas (fase 5)', () => {
  const ILU = require(path.join(SKILLS, 'iluminacao', 'scripts', 'lib', 'index.js'));
  const r = ILU.processar(ILU.exemplo());
  const s = criarSimulador(r.instalacao);
  const k = r.instalacao.comandos.find(c => c.tipo === 'cena');
  assert.deepStrictEqual(k.cenas.map(c => c.nome), ['Reunião', 'Apresentação', 'Videoconferência', 'Limpeza']);
  const ponto = (g) => k.pontos.find(id => s.ponto(id).grupo === g);
  const [mesa, tela] = [ponto('Mesa'), ponto('Tela')];
  const niveis = () => [s.estadoPonto(mesa).nivel, s.estadoPonto(tela).nivel];
  assert.deepStrictEqual(niveis(), [1, 1], 'começa na 1ª cena (Reunião)');
  const tc = k.dispositivos[0];
  s.acionar(tc); assert.deepStrictEqual(niveis(), [0.4, 0], 'Apresentação: mesa 40 %, tela apagada');
  assert.match(s.estadoPonto(mesa).texto, /40 %/);
  assert.strictEqual(s.estadoComando(k.id).cenaAtiva, 'Apresentação');
  s.acionar(tc); assert.deepStrictEqual(niveis(), [0.8, 0.5], 'Videoconferência');
  s.acionar(tc); assert.deepStrictEqual(niveis(), [1, 1], 'Limpeza: todos os grupos 100 %');
  s.acionar(tc); assert.deepStrictEqual(niveis(), [0, 0], 'depois da última: desligado');
  s.acionar(tc); assert.deepStrictEqual(niveis(), [1, 1], 'volta à 1ª');
  s.acionar(tc, { cena: 2 }); assert.deepStrictEqual(niveis(), [0.8, 0.5], 'chamar a cena 3 direto');
  s.acionar(tc, { cena: -1 }); assert.deepStrictEqual(niveis(), [0, 0], 'desligar');
  // desligar o disjuntor apaga a cena; religar volta a ela
  s.acionar(tc, 1); s.desligar(s.circuito(k.circuitos[0]).disjuntor);
  assert.deepStrictEqual(niveis(), [0, 0]);
  s.ligar(s.circuito(k.circuitos[0]).disjuntor);
  assert.deepStrictEqual(niveis(), [0.4, 0]);
  // estado salvo e recarregado (troca de planta): a cena volta
  const s2 = criarSimulador(r.instalacao); s2.importar(s.exportar());
  assert.strictEqual(s2.estadoComando(k.id).cenaAtiva, 'Apresentação');
  // DALI-2 com cenas: começa no nível manual; chamar cena e depois a botoeira volta ao manual
  const inst = clone(r.instalacao);
  const kd = inst.comandos.find(c => c.tipo === 'cena'); kd.tipo = 'dali';
  const d = criarSimulador(inst);
  const n = () => [d.estadoPonto(mesa).nivel, d.estadoPonto(tela).nivel];
  assert.deepStrictEqual(n(), [1, 1]);
  d.acionar(tc, { cena: 1 }); assert.deepStrictEqual(n(), [0.4, 0]);
  d.acionar(tc, 0.25); assert.deepStrictEqual(n(), [0.25, 0.25], 'nível manual sai da cena');
  // validador: cena com grupo que não existe vira aviso
  kd.cenas[0].niveis.Palco = 1;
  assert.ok(I.validarInstalacao(inst).avisos.some(a => /Palco/.test(a)));
});

// revisão de 04/11/2026: o 3D de uma análise de DWG (sem o modelo da skill) monta a instalação pelo desenho
caso('instalação estimada pelo desenho: quadro, circuito por ambiente e interruptor do ambiente', () => {
  const { instalacaoDoDesenho } = require('./doDesenho');
  const it = (simbolo, forma, ambiente, x, y, extra = {}) => ({ simbolo, forma, disciplina: 'eletrica', ambiente, nomeAmbiente: ambiente >= 0 ? `Sala ${ambiente + 1}` : null, x, y, id: '', circuito: '', comando: '', ...extra });
  const itens = [
    it('HM-ELE-QUADRO', 'quadro', 0, 0, 0),
    it('HM-ILU-LUMINARIA', 'luminaria', 0, 2, 2), it('HM-ILU-LUMINARIA', 'luminaria', 0, 4, 2),
    it('HM-ELE-INTERRUPTOR', 'interruptor', 0, 1, 0), it('HM-ELE-INTERRUPTOR', 'interruptor', 0, 5, 0),
    it('HM-ELE-TOMADA-BAIXA', 'tomada', 0, 3, 0),
    it('HM-ILU-LUMINARIA', 'luminaria', 1, 10, 2, { circuito: '7' }),
    it('HM-CFTV-CAMERA', 'camera', 1, 10, 3, { disciplina: 'cftv' }),
  ];
  const r = instalacaoDoDesenho(itens);
  assert.ok(r && r.instalacao.estimada);
  assert.strictEqual(r.ids[7], '', 'câmera não entra na instalação elétrica');
  assert.strictEqual(new Set(r.ids.filter(Boolean)).size, 7, 'ids únicos');
  const inst = r.instalacao;
  assert.strictEqual(inst.quadros.length, 1);
  assert.strictEqual(inst.quadros[0].ponto, r.ids[0], 'o quadro desenhado é o quadro da simulação');
  assert.ok(inst.circuitos.some(c => c.id === '7'), 'circuito escrito no desenho vale');
  assert.ok(inst.quadros[0].disjuntores.every(d => d.In == null), 'sem corrente nominal inventada');
  const k = inst.comandos.find(c => c.ambiente === 'Sala 1');
  assert.strictEqual(k.tipo, 'interruptor_paralelo', 'dois interruptores na sala → paralelo');
  const sim = criarSimulador(inst);
  const [l1, l2] = [r.ids[1], r.ids[2]];
  assert.ok(sim.energizado(l1) && sim.energizado(l2), 'começa aceso');
  sim.acionar(r.ids[3]);
  assert.ok(!sim.energizado(l1) && !sim.energizado(l2), 'o interruptor apaga as luminárias da sala');
  sim.acionar(r.ids[4]);
  assert.ok(sim.energizado(l1), 'o outro paralelo acende de novo');
  sim.desligar(sim.circuito(sim.ponto(r.ids[5]).circuito).disjuntor, inst.quadros[0].tag);
  assert.ok(!sim.energizado(r.ids[5]) && sim.energizado(l1), 'desligar o disjuntor das tomadas não apaga a luz');
  assert.strictEqual(instalacaoDoDesenho([it('HM-CFTV-CAMERA', 'camera', 0, 0, 0, { disciplina: 'cftv' })]), null, 'sem nada elétrico: sem instalação');
});

// pedido de 04/11/2026: o quadro do 3D com os circuitos ORIGINAIS do diagrama unifilar/quadro de cargas do projeto
caso('instalação pelo desenho com os quadros lidos do diagrama: circuitos originais, ponto pelo número, pela descrição e pelo tipo', () => {
  const { instalacaoDoDesenho } = require('./doDesenho');
  const it = (simbolo, forma, nome, x, y, extra = {}) => ({ simbolo, forma, disciplina: 'eletrica', ambiente: nome ? 0 : -1, nomeAmbiente: nome, x, y, id: '', circuito: '', comando: '', ...extra });
  const lidos = [
    { tag: 'QD-01', descricao: 'TÉRREO', origem: 'unifilar', geral: { In: 50, polos: 3 },
      drs: [{ tag: 'DR1', In: 40, idn_ma: null, circuitos: ['1', '3'] }, { tag: 'DR2', In: 40, idn_ma: 30, circuitos: ['2'] }],
      circuitos: [
        { numero: '1', descricao: 'ILUM. RECEPÇÃO', tipo: 'iluminacao', potencia_w: 180, In: 10, secao_mm2: 1.5, dr: 'DR1' },
        { numero: '2', descricao: 'CHUVEIRO', tipo: 'tue', potencia_w: 5400, In: 32, secao_mm2: 6, dr: 'DR2' },
        { numero: '3', descricao: "TUG'S RECEPÇÃO", tipo: 'tug', potencia_w: 1200, In: 20, secao_mm2: 2.5, dr: 'DR1' },
      ] },
    { tag: 'QD-02', descricao: 'COZINHA', origem: 'tabela', geral: null, drs: [],
      circuitos: [{ numero: '1', descricao: 'ILUM. COZINHA', tipo: 'iluminacao', potencia_va: 300, In: 10 }, { numero: '2', descricao: 'TOMADAS COZINHA', tipo: 'tug', potencia_va: 1800, In: 20 }] },
    { tag: 'QD-03', descricao: 'GARAGEM', origem: 'unifilar', geral: null, drs: [], circuitos: [{ numero: '1', descricao: 'ILUM. GARAGEM', tipo: 'iluminacao', In: 10 }] },
  ];
  const itens = [
    it('HM-ELE-QUADRO', 'quadro', 'RECEPÇÃO', 0, 0, { tag: 'QD-01' }),
    it('HM-ILU-LUMINARIA', 'luminaria', 'RECEPÇÃO', 2, 2),                       // pela descrição: ILUM. RECEPÇÃO
    it('HM-ELE-TOMADA-BAIXA', 'tomada', 'RECEPÇÃO', 3, 0, { circuito: '3' }),     // pelo número escrito junto
    it('HM-ELE-TOMADA-TUE', 'tomada', 'RECEPÇÃO', 4, 0),                          // o único TUE do quadro
    it('HM-ELE-INTERRUPTOR', 'interruptor', 'RECEPÇÃO', 1, 0),
    it('HM-ILU-LUMINARIA', 'luminaria', 'COZINHA', 30, 2),                        // QD-02 não desenhado: pela descrição
  ];
  const r = instalacaoDoDesenho(itens, { quadros: lidos });
  const inst = r.instalacao;
  assert.deepStrictEqual(inst.quadros.map(q => q.tag), ['QD-01', 'QD-02'], 'o QD-03 (sem ponto nesta planta) fica de fora');
  const qd1 = inst.quadros[0];
  assert.strictEqual(qd1.ponto, r.ids[0], 'o quadro lido é o desenhado com a mesma tag');
  assert.deepStrictEqual(qd1.disjuntores.map(d => [d.tag, d.In]), [['Q1', 10], ['Q2', 32], ['Q3', 20]], 'disjuntores do diagrama');
  assert.strictEqual(qd1.geral.In, 50);
  assert.ok(qd1.drs.every(d => d.lido) && qd1.drs[0].idn_ma === null, 'sensibilidade não escrita fica null (o 3D diz "a conferir")');
  const circ = (k) => inst.circuitos.find(c => c.id === inst.pontos.find(p => p.id === r.ids[k]).circuito);
  assert.strictEqual(circ(1).descricao, 'ILUM. RECEPÇÃO');
  assert.strictEqual(circ(2).id, 'QD-01.3');
  assert.strictEqual(circ(3).descricao, 'CHUVEIRO');
  assert.strictEqual(circ(5).id, 'QD-02.1');
  assert.ok(inst.circuitos.filter(c => c.quadro === 'QD-01').every(c => c.origem === 'diagrama' && !c.estimado));
  assert.deepStrictEqual([r.resumo.porNumero, r.resumo.porDescricao, r.resumo.porTipo, r.resumo.estimados], [1, 2, 1, 0]);
  const sim = criarSimulador(inst);
  assert.ok(sim.energizado(r.ids[1]) && sim.energizado(r.ids[2]));
  sim.desligar('DR1', 'QD-01');
  assert.ok(!sim.energizado(r.ids[1]) && !sim.energizado(r.ids[2]) && sim.energizado(r.ids[3]), 'o DR1 do diagrama protege os circuitos 1 e 3, não o chuveiro');
  // quadro desenhado sem tag, no ambiente do quadro lido: liga pelo nome do ambiente
  const r2 = instalacaoDoDesenho([it('HM-ELE-QUADRO', 'quadro', 'COZINHA', 30, 0), it('HM-ILU-LUMINARIA', 'luminaria', 'COZINHA', 30, 2)], { quadros: lidos });
  assert.strictEqual(r2.instalacao.quadros[0].tag, 'QD-02');
  assert.strictEqual(r2.instalacao.quadros[0].ponto, r2.ids[0]);
});

// revisão de 06/11/2026 (R-11 e R-19): a planta escreve "QD01" e "1", o diagrama "QD-01" e "01"
caso('R-11 planta "QD01" × diagrama "QD-01" e circuito "1" × "01": o mesmo quadro e o mesmo circuito (sem "1 (estimado)")', () => {
  const { instalacaoDoDesenho } = require('./doDesenho');
  const it = (simbolo, forma, x, y, extra = {}) => ({ simbolo, forma, disciplina: 'eletrica', ambiente: 0, nomeAmbiente: 'COZINHA', x, y, id: '', circuito: '', comando: '', ...extra });
  const lidos = [{ tag: 'QD-01', descricao: null, origem: 'tabela', geral: null, drs: [{ tag: 'DR-02', circuitos: ['02'] }],
    circuitos: [{ numero: '01', descricao: 'ILUM. COZINHA', tipo: 'iluminacao', potencia_va: 300, In: 10 }, { numero: '02', descricao: 'TOMADAS COZINHA', tipo: 'tug', potencia_va: 1800, In: 20 }] }];
  const r = instalacaoDoDesenho([it('HM-ELE-QUADRO', 'quadro', 0, 0, { tag: 'QD01' }), it('HM-ILU-LUMINARIA', 'luminaria', 2, 2, { circuito: '1' })], { quadros: lidos });
  const inst = r.instalacao;
  assert.deepStrictEqual(inst.quadros.map(q => [q.tag, q.ponto]), [['QD-01', r.ids[0]]], 'o quadro desenhado "QD01" é o "QD-01" do diagrama');
  assert.deepStrictEqual(inst.circuitos.map(c => `${c.id}${c.estimado ? ' (estimado)' : ''}`), ['1', '2']);
  assert.strictEqual(inst.pontos.find(p => p.id === r.ids[1]).circuito, '1');
  assert.deepStrictEqual(inst.quadros[0].drs[0].circuitos, ['2']);
  assert.deepStrictEqual([r.resumo.porNumero, r.resumo.estimados], [1, 0]);
});

caso('R-19 número do circuito lido no texto da planta: ponto e circuito marcados "lido, a conferir"', () => {
  const { instalacaoDoDesenho } = require('./doDesenho');
  const it = (simbolo, forma, x, y, extra = {}) => ({ simbolo, forma, disciplina: 'eletrica', ambiente: 0, nomeAmbiente: 'SALA', x, y, id: '', circuito: '', comando: '', ...extra });
  const r = instalacaoDoDesenho([it('HM-ELE-QUADRO', 'quadro', 0, 0), it('HM-ILU-LUMINARIA', 'luminaria', 2, 2, { circuito: '05', circuitoDaPlanta: true }), it('HM-ELE-TOMADA-BAIXA', 'tomada', 3, 0, { circuito: '6' })]);
  const p = (k) => r.instalacao.pontos.find(x => x.id === r.ids[k]);
  assert.deepStrictEqual([p(1).circuito, p(1).circuitoLido], ['5', 'a_conferir']);
  assert.strictEqual(p(2).circuitoLido, undefined, 'circuito do desenho conferido não é marcado');
  const c5 = r.instalacao.circuitos.find(c => c.id === '5');
  assert.match(c5.descricao, /lido na planta, a conferir/);
  assert.strictEqual(c5.lidoNaPlanta, 1);
  assert.strictEqual(r.resumo.lidosNaPlanta, 1);
  assert.strictEqual(criarSimulador(r.instalacao).estadoPonto(r.ids[1]).circuitoLido, 'a_conferir');
});

console.log(`simulador da instalação (fases 2 e 5): ${ok} casos ok`);
