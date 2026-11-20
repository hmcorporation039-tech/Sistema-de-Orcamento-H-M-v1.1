// CENTRO ÚNICO pedido no campo de instruções, em QUALQUER disciplina (versão 2.50, 20/11/2026). Pedido do usuário: "foi pedido que toda a
// infraestrutura saísse de um rack no subsolo, que todos os NVRs ficassem nesse rack, porém tudo continua como na
// análise anterior [...] o sistema tem que avisar se tiver alguma coisa fora da norma ou não adequado para o projeto".
// O interpretador não entendia a frase (pavimento sem sala, "rack único") e o projetista recriava os racks de piso e
// secundários. Agora: a frase vira centros.telecom = { ambiente, pavimento, unico: true }; o projetista não cria rack de
// piso/secundário e avisa FORA DA NORMA (cabo > 90 m, NBR 14565) e FORA DO ADEQUADO (rack em garagem, sanitário…).
// Depois: "o mesmo critério tem que ser adotado para qualquer projeto de qualquer disciplina" — quadro único (elétrica,
// queda de tensão NBR 5410 6.2.7.2), central de incêndio (fora do pavimento da entrada, NBR 17240), alarme, controle de
// acesso e telefonia (limite de cabo da skill), sempre com FORA DA NORMA / FORA DO ADEQUADO.
// Dados SINTÉTICOS (nenhum dado de cliente). Rodar: node testes/centroUnico.test.js
const assert = require('assert');
const path = require('path');
const { CAD } = require('../src/config/caminhos');
const { projetarDisciplinas } = require(path.join(CAD, 'projetista.js'));
const { interpretar } = require('../src/services/instrucoes/interpretar');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
};

// prédio de 4 pavimentos, cada um 70 x 20 m, desenhados lado a lado (100 m) e alinhados pelo deslocamento
const R = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const sala = (nome, pol, pavimento) => ({ nome, pavimento, poligono: pol, area_m2: Math.abs((pol[1][0] - pol[0][0]) * (pol[2][1] - pol[1][1])) });
const PAVS = ['Subsolo', 'Térreo', '1º pavimento', '2º pavimento'];
const AMB = [];
PAVS.forEach((pv, i) => {
  const o = i * 100;
  AMB.push(sala('CIRCULAÇÃO', R(o, 8, o + 70, 12), pv), sala('ESCADA', R(o, 0, o + 4, 8), pv));
  if (i === 0) AMB.push(sala('ÁREA TÉCNICA (ENERGIA)', R(o + 4, 0, o + 10, 8), pv), sala('GARAGEM', R(o + 10, 0, o + 70, 8), pv), sala('DEPÓSITO', R(o, 12, o + 10, 20), pv));
  else for (let k = 0; k < 6; k++) AMB.push(sala(k === 5 ? 'ESPAÇO CELEBRATIVO' : `SALA 0${k + 1}`, R(o + 4 + k * 11, 0, o + 15 + k * 11, 8), pv), sala(`SECRETARIA ${k + 1}`, R(o + k * 11, 12, o + 11 + k * 11, 20), pv));
});
// a entrada do prédio: porta da fachada no térreo
const PORTAS = [{ meio: [130, 0], n: [0, 1], u: [1, 0], dobradica: [129.4, 0], batente: [130.6, 0], externa: true, ambientes: ['SALA 03'], largura_m: 1.2 }];
const ARQ = { ambientes: AMB, portas: PORTAS, pavimentos: PAVS.map((nome, i) => ({ nome, deslocamento: [-i * 100, 0] })) };
const CTX = { ambientes: AMB, pontos: [], disciplinas: ['cftv', 'rede'], pavimentos: PAVS, projetadas: ['cftv', 'rede'], elaboracao: true };
const DISC = ['cftv', 'rede', 'eletrica', 'iluminacao', 'incendio', 'alarme', 'controle_acesso', 'telefonia', 'antena'];
const TODAS = { ...CTX, disciplinas: DISC, projetadas: DISC };
const SUB = { ambiente: 'ÁREA TÉCNICA (ENERGIA)', pavimento: 'Subsolo', unico: true };
const unicoEm = (grupo, local = SUB) => ({ criterios: { centros: { [grupo]: local } } });
const racks = (p) => p.pontos.filter(q => q.simbolo === 'HM-CAB-RACK');
const quadros = (p) => p.pontos.filter(q => q.simbolo === 'HM-ELE-QUADRO');

caso('a frase do pedido vira UMA operação: rack único na sala técnica do subsolo (pavimento sem sala)', () => {
  const r = interpretar('toda a infraestrutura deve sair de um rack no subsolo e todos os NVRs devem ficar nesse rack', CTX);
  assert.deepStrictEqual(r.duvidas, []);
  assert.strictEqual(r.operacoes.length, 1);
  assert.deepStrictEqual(r.operacoes[0].centros, { telecom: { ambiente: 'ÁREA TÉCNICA (ENERGIA)', pavimento: 'Subsolo', unico: true } });
  assert.match(r.operacoes[0].descricao, /Rack único em ÁREA TÉCNICA \(ENERGIA\) \(Subsolo\).*sem racks de piso nem secundários/);
});

caso('outras formas de pedir: "rack único", "concentre", "só um rack", "sem racks de piso", "todos os NVRs no rack"', () => {
  for (const t of ['use um rack único no subsolo', 'concentre tudo no rack do subsolo', 'só um rack, no depósito do subsolo',
    'rack no subsolo, sem racks de piso', 'todos os nvrs no rack do subsolo', 'todos os gravadores e switches no rack da área técnica']) {
    const r = interpretar(t, CTX);
    assert.deepStrictEqual(r.duvidas, [], t);
    assert.strictEqual(r.operacoes.length, 1, t);
    assert.strictEqual(r.operacoes[0].centros.telecom.unico, true, t);
    assert.strictEqual(r.operacoes[0].centros.telecom.pavimento, 'Subsolo', t);
  }
  assert.strictEqual(interpretar('só um rack, no depósito do subsolo', CTX).operacoes[0].centros.telecom.ambiente, 'DEPÓSITO');
});

caso('"leve o rack para o subsolo" (sem "único") também aceita o pavimento: a sala técnica dele', () => {
  const r = interpretar('leve o rack para o subsolo', CTX);
  assert.deepStrictEqual(r.duvidas, []);
  assert.deepStrictEqual(r.operacoes[0].centros, { telecom: { ambiente: 'ÁREA TÉCNICA (ENERGIA)', pavimento: 'Subsolo' } });
});

caso('rack único num projeto recebido (orçamento) ou sem CFTV/rede: explica em vez de fazer nada calado', () => {
  assert.match(interpretar('rack único no subsolo', { ...CTX, elaboracao: false }).duvidas[0], /elaboração de projeto/);
  assert.match(interpretar('rack único no subsolo', { ...CTX, projetadas: ['incendio'] }).duvidas[0], /não tem CFTV nem rede/);
  // a operação comum continua igual
  assert.strictEqual(interpretar('acrescente 2 câmeras no espaço celebrativo do térreo', CTX).operacoes[0].tipo, 'adicionar');
});

caso('projetista sem o pedido: racks de piso e secundários (cabo ≤ 90 m) — como antes', () => {
  const p = projetarDisciplinas(ARQ, ['cftv', 'rede'], {});
  assert.ok(racks(p).length > 1);
  assert.ok(p.cabos.every(c => c.comprimento_m <= 90));
  assert.ok(!p.avisos.some(a => /^FORA DA NORMA/.test(a)));
});

caso('projetista com rack único: 1 rack só, sem backbone, e o aviso FORA DA NORMA dos cabos > 90 m (NBR 14565)', () => {
  const p = projetarDisciplinas(ARQ, ['cftv', 'rede'], { criterios: { centros: { telecom: { ambiente: 'ÁREA TÉCNICA (ENERGIA)', pavimento: 'Subsolo', unico: true } } } });
  assert.strictEqual(racks(p).length, 1);
  assert.strictEqual(racks(p)[0].ambiente, 'ÁREA TÉCNICA (ENERGIA)');
  assert.match(racks(p)[0].motivo, /RACK ÚNICO/);
  assert.ok(!p.metragens.some(m => /Backbone/.test(m.descricao)));
  const longos = p.cabos.filter(c => c.comprimento_m > 90);
  assert.ok(longos.length > 0, 'o prédio de teste tem pontos a mais de 90 m do subsolo');
  const cftv = p.avisos.find(a => /^FORA DA NORMA — CFTV/.test(a));
  assert.ok(cftv, 'falta o aviso de CFTV');
  assert.match(cftv, /NBR 14565 limita o cabo horizontal a 90 m/);
  assert.match(cftv, /com todos os NVRs/);
  assert.ok(p.avisos.some(a => /^FORA DA NORMA — Cabeamento/.test(a)));
  assert.ok(p.criterios.some(c => /^Gravação: \d+ câmera\(s\) — NVR\(s\) e switches PoE todos no rack único em "ÁREA TÉCNICA \(ENERGIA\)" \(Subsolo\)/.test(c)));
});

caso('rack (único ou não) numa garagem: aviso FORA DO ADEQUADO, mas a escolha do engenheiro é mantida', () => {
  const p = projetarDisciplinas(ARQ, ['cftv'], { criterios: { centros: { telecom: { ambiente: 'GARAGEM', pavimento: 'Subsolo', unico: true } } } });
  assert.strictEqual(racks(p)[0].ambiente, 'GARAGEM');
  assert.ok(p.avisos.some(a => /^FORA DO ADEQUADO: .* "GARAGEM" \(Subsolo\)/.test(a)));
  const tec = projetarDisciplinas(ARQ, ['cftv'], { criterios: { centros: { telecom: { ambiente: 'ÁREA TÉCNICA (ENERGIA)', pavimento: 'Subsolo' } } } });
  assert.ok(!tec.avisos.some(a => /^FORA DO ADEQUADO/.test(a)));
});

caso('o "unico" só vale quando é true (e nunca no QD de um pavimento)', () => {
  const p = projetarDisciplinas(ARQ, ['cftv'], { criterios: { centros: { telecom: { ambiente: 'ÁREA TÉCNICA (ENERGIA)', pavimento: 'Subsolo', unico: 'sim' } } } });
  assert.ok(racks(p).length > 1);
  const e = projetarDisciplinas(ARQ, ['eletrica'], { criterios: { centros: { 'eletrica|Subsolo': SUB } } });
  assert.strictEqual(quadros(e).length, 4);
});

// ── as outras disciplinas (o mesmo critério em qualquer projeto) ──
caso('interpretador: "quadro único", "todas as centrais", "central de incêndio única", "todos os quadros"', () => {
  const q = interpretar('quadro único no subsolo', TODAS);
  assert.deepStrictEqual(q.duvidas, []);
  assert.deepStrictEqual(q.operacoes[0].centros, { eletrica: SUB });
  assert.match(q.operacoes[0].descricao, /^Quadro único em .*sem QD por pavimento.*queda de tensão/);
  const c = interpretar('todas as centrais no depósito do subsolo', TODAS);
  assert.deepStrictEqual(c.duvidas, []);
  assert.deepStrictEqual(Object.keys(c.operacoes[0].centros).sort(), ['acesso', 'alarme', 'eletrica', 'incendio', 'telecom', 'telefonia']);
  assert.ok(Object.values(c.operacoes[0].centros).every(x => x.unico === true && x.ambiente === 'DEPÓSITO'));
  const i = interpretar('central de incêndio única no subsolo', TODAS);
  assert.deepStrictEqual(Object.keys(i.operacoes[0].centros), ['incendio']);
  assert.match(i.operacoes[0].descricao, /^Central de incêndio única em/);
  assert.deepStrictEqual(Object.keys(interpretar('todos os quadros no subsolo', TODAS).operacoes[0].centros), ['eletrica']);
});

caso('interpretador: "retire todos os quadros do 2º pavimento" não é centro único; antena não concentra; disciplina ausente explica', () => {
  const r = interpretar('retire todos os quadros do 2º pavimento', TODAS);
  assert.ok(!r.operacoes.some(o => Object.values(o.centros || {}).some(x => x.unico)));
  assert.match(interpretar('antena única no subsolo', TODAS).duvidas[0], /cobertura/);
  assert.match(interpretar('quadro único no subsolo', CTX).duvidas[0], /não tem elétrica nem iluminação/);
});

caso('elétrica com quadro único: 1 QD para todos os pavimentos, seção pela queda de tensão e FORA DA NORMA do que não dá', () => {
  assert.strictEqual(quadros(projetarDisciplinas(ARQ, ['eletrica'], {})).length, 4);
  const p = projetarDisciplinas(ARQ, ['eletrica', 'iluminacao'], unicoEm('eletrica'));
  assert.strictEqual(quadros(p).length, 1);
  assert.strictEqual(quadros(p)[0].ambiente, 'ÁREA TÉCNICA (ENERGIA)');
  assert.match(quadros(p)[0].motivo, /QUADRO ÚNICO/);
  assert.ok(p.criterios.some(c => /^Quadro único em "ÁREA TÉCNICA \(ENERGIA\)" \(Subsolo\)/.test(c)));
  assert.ok(!p.metragens.some(m => /Alimentadores dos QDs/.test(m.descricao)), 'sem QD por pavimento não há alimentador entre QDs');
  // os circuitos dos outros pavimentos sobem até o QD: mais cabo que com o QD do pavimento
  const comp = (x, pav) => x.cabos.filter(c => c.disciplina === 'eletrica' && c.ponto.endsWith(`(${pav})`)).reduce((s, c) => s + c.comprimento_m, 0);
  assert.ok(comp(p, '2º pavimento') > comp(projetarDisciplinas(ARQ, ['eletrica', 'iluminacao'], {}), '2º pavimento'));
  assert.ok(p.avisos.some(a => /seção aumentada pela queda de tensão no comprimento real até o quadro único/.test(a)));
  assert.ok(p.avisos.some(a => /^FORA DA NORMA — Elétrica predial: com o quadro único .*NBR 5410 \(6\.2\.7\.2\)/.test(a)));
  // a seção aumentada entra na metragem de cabo
  assert.ok(p.metragens.some(m => /Cabo de cobre flexível 10 mm²/.test(m.descricao)));
});

caso('quadro único numa garagem: FORA DO ADEQUADO com a referência da NBR 5410', () => {
  const p = projetarDisciplinas(ARQ, ['eletrica'], unicoEm('eletrica', { ...SUB, ambiente: 'GARAGEM' }));
  assert.ok(p.avisos.some(a => /^FORA DO ADEQUADO: Quadro de distribuição \(QD\) em "GARAGEM" \(Subsolo\).*NBR 5410/.test(a)));
});

caso('incêndio: sem escolha, a central vai para junto da entrada; no subsolo, FORA DO ADEQUADO (NBR 17240, repetidor)', () => {
  const central = (p) => p.pontos.find(q => q.simbolo === 'HM-INC-CENTRAL');
  const auto = projetarDisciplinas(ARQ, ['incendio'], {});
  assert.strictEqual(central(auto).pavimento, 'Térreo');
  assert.match(central(auto).motivo, /junto da entrada principal/);
  assert.ok(!auto.avisos.some(a => /^FORA/.test(a)));
  const sub = projetarDisciplinas(ARQ, ['incendio'], unicoEm('incendio'));
  assert.strictEqual(central(sub).pavimento, 'Subsolo');
  assert.match(central(sub).motivo, /ÚNICA em/);
  assert.ok(sub.avisos.some(a => /^FORA DO ADEQUADO: Central de alarme de incêndio .* no Subsolo, fora do pavimento da entrada principal \(Térreo\).*NBR 17240.*repetidor/.test(a)));
});

caso('alarme, acesso, telefonia e antena: local inadequado avisado, "única/único" no critério, antena explica o pedido não aplicado', () => {
  const p = projetarDisciplinas(ARQ, ['alarme', 'controle_acesso', 'telefonia', 'antena'], { criterios: { centros: { alarme: { ...SUB, ambiente: 'GARAGEM' }, acesso: SUB, telefonia: SUB, antena: { ambiente: 'DEPÓSITO', pavimento: 'Subsolo' } } } });
  assert.ok(p.avisos.some(a => /^FORA DO ADEQUADO: Central de alarme .* "GARAGEM" \(Subsolo\).*área protegida/.test(a)));
  assert.ok(p.criterios.some(c => /^Controladora de acesso .* única em "ÁREA TÉCNICA \(ENERGIA\)"/.test(c)));
  assert.ok(p.criterios.some(c => /^Central telefônica \/ DG .* única em/.test(c)));
  assert.ok(p.avisos.some(a => /^Antena coletiva \/ TV: o local pedido \("DEPÓSITO"\) não foi aplicado/.test(a)));
});

caso('controle de acesso: leitor além do limite de cabo da skill vira FORA DO ADEQUADO com a saída', () => {
  // porta de uma secretaria (sala restrita) no 2º pavimento; controladora única no subsolo
  const portas = [...PORTAS, { meio: [355, 12], n: [0, 1], u: [1, 0], dobradica: [354.55, 12], batente: [355.45, 12], ambientes: ['SECRETARIA 6', 'CIRCULAÇÃO'], largura_m: 0.9 }];
  const p = projetarDisciplinas({ ...ARQ, portas }, ['controle_acesso'], unicoEm('acesso'));
  const { LIMITE } = require(path.join(CAD, '..', '..', 'controle-acesso', 'scripts', 'lib', 'calculo.js'));
  const longos = p.cabos.filter(c => c.comprimento_m > LIMITE.wiegand);
  assert.ok(longos.length > 0, 'o leitor do 2º pavimento passa do limite');
  assert.ok(p.avisos.some(a => new RegExp(`^FORA DO ADEQUADO — Controle de acesso: com controladora de acesso .* única em .*a mais de ${LIMITE.wiegand} m.*RS-485/OSDP`).test(a)));
});

caso('aplicar: o controlador guarda o "unico" de cada grupo (não do QD de um pavimento nem da antena) até os critérios do projetista', () => {
  const { lerOperacoes } = require('../src/controllers/projetos/instrucoes').paraTestes;
  const [op] = lerOperacoes([{ tipo: 'mover', descricao: 'x', centros: { telecom: { ambiente: 'CPD', pavimento: 'Subsolo', unico: true }, incendio: { ambiente: 'CPD', unico: true }, 'eletrica|Térreo': { ambiente: 'CPD', unico: true }, antena: { ambiente: 'CPD', unico: true } } }]);
  assert.deepStrictEqual(op.centros, { telecom: { ambiente: 'CPD', pavimento: 'Subsolo', unico: true }, incendio: { ambiente: 'CPD', unico: true }, 'eletrica|Térreo': { ambiente: 'CPD' }, antena: { ambiente: 'CPD' } });
  const { lerCriterios } = require('../src/controllers/projetos/analises');
  const crit = lerCriterios({ centros: op.centros }).centros;
  assert.strictEqual(crit.telecom.unico, true);
  assert.strictEqual(crit.incendio.unico, true);
});

caso('PTZ: só no espaço de reunião do térreo, para a transmissão ao vivo (nem no 1º pavimento nem no estacionamento)', () => {
  const pavs = ['Térreo', '1º pavimento'];
  const ambientes = [
    sala('ESPAÇO CELEBRATIVO', R(0, 0, 30, 20), 'Térreo'), sala('SALÃO PAROQUIAL', R(100, 0, 130, 20), '1º pavimento'),
    sala('ESTACIONAMENTO', R(0, 30, 40, 50), 'Térreo'), sala('ÁREA TÉCNICA', R(32, 0, 36, 4), 'Térreo'),
  ];
  const arq = { ambientes, portas: [], pavimentos: pavs.map((nome, i) => ({ nome, deslocamento: [-i * 100, 0] })) };
  const ptz = projetarDisciplinas(arq, ['cftv'], {}).pontos.filter(q => /PTZ/.test(q.rotulo || ''));
  assert.strictEqual(ptz.length, 1);
  assert.strictEqual(ptz[0].ambiente, 'ESPAÇO CELEBRATIVO');
  assert.match(ptz[0].motivo, /transmissão ao vivo/);
  assert.strictEqual(projetarDisciplinas(arq, ['cftv'], { criterios: { ptz: false } }).pontos.filter(q => /PTZ/.test(q.rotulo || '')).length, 0);
});

console.log(`centro único: ${ok} casos ok`);
// o controlador abre o pool do banco ao ser carregado: fecha para o teste terminar
setImmediate(() => { try { require('../src/config/database').end(); } catch { /* sem banco */ } });
