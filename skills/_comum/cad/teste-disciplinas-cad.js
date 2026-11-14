// Teste do RECONHECIMENTO das disciplinas que estavam atrasadas no CAD (revisão geral, seção 6 — 14/11/2026):
// elétrica industrial (motor, CCM, banco de capacitores), pressurização (ventilador, damper de alívio, transmissor
// de ΔP/pressostato), média tensão (transformador, cubículo, chave, para-raios, malha), solar (módulo, string box,
// inversor, quadro CA), carregador veicular (wallbox, QD-VE), controle de acesso (controladora, botoeira de
// emergência, sensor de porta), hospitalar (tomada IT, DSI, BEL), automação (sensor de temperatura/umidade/CO₂),
// telefonia (DG) e antena (parabólica) — e a PLANTA AUTOMÁTICA da elétrica industrial e da automação.
// Desenhos SINTÉTICOS montados aqui (nenhum dado de cliente). Rodar: node _comum/cad/teste-disciplinas-cad.js
const assert = require('assert');
const { DesenhoDxf } = require('./dxf');
const { lerArquitetura } = require('./arquitetura');
const { SIMBOLOS } = require('./simbolos');
const { BLOCOS_HM, disciplinaDaLayer, PROPRIOS_DA_DISCIPLINA, daPropriaDisciplina } = require('./disciplinasCad');
const { TIPOS, tipoPeloTexto, tipoPelaLayer, simboloDaDescricao } = require('./tiposDePonto');
const { ESPEC, DISCIPLINAS: D3, chaveDisciplina, disciplinaDoSimbolo, classeDaLayer, montarCena } = require('./modelo3d');
const { legendaDoProjeto, propostaDeMapa, RE_INSTALACAO } = require('./pontosDoDesenho');
const { lerProjetoDxf } = require('./projetoDxf');
const { PERFIS, componenteDoPerfil } = require('./perfisDisciplina');
const { PLANTAS } = require('./plantasDisciplina');
const { gerarPlanta } = require('./planta');
const REGISTRO = require('../disciplinas');
const padrao = require('./padrao-hm.json');

let ok = 0;
const caso = (nome, fn) => {
  try { fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; }
};

// símbolos novos desta revisão (e os que já existiam mas nenhum desenho reconhecia)
const NOVOS = ['HM-IND-MOTOR', 'HM-IND-CCM', 'HM-IND-BANCO-CAPACITORES', 'HM-PRZ-VENTILADOR', 'HM-PRZ-DAMPER', 'HM-PRZ-SENSOR-PRESSAO',
  'HM-MT-TRANSFORMADOR', 'HM-MT-CUBICULO', 'HM-MT-CHAVE', 'HM-MT-PARA-RAIOS', 'HM-MT-MALHA', 'HM-SOL-MODULO', 'HM-SOL-STRING-BOX',
  'HM-SOL-QUADRO-CA', 'HM-VE-QUADRO', 'HM-ANT-PARABOLICA'];
const RECONHECIDOS_AGORA = [...NOVOS, 'HM-SOL-INVERSOR', 'HM-VE-CARREGADOR', 'HM-ACE-CONTROLADORA', 'HM-ACE-EMERGENCIA', 'HM-ACE-SENSOR',
  'HM-HOSP-TOMADA-IT', 'HM-HOSP-PAINEL-ALARME', 'HM-HOSP-BEL', 'HM-AUT-SENSOR', 'HM-TEL-DG'];
// disciplina esperada (chave do registro único) pelo prefixo do símbolo
const DISC = { IND: 'eletrica_industrial', PRZ: 'pressurizacao', MT: 'media_tensao', SOL: 'solar', VE: 'carregador', ANT: 'antena', ACE: 'controle_acesso', HOSP: 'eletrica_hospitalar', AUT: 'automacao', TEL: 'telefonia' };
const discDe = (s) => DISC[s.split('-')[1]];
const chaves = new Set(REGISTRO.DISCIPLINAS.map(d => d.chave));

caso('biblioteca: cada símbolo novo tem nome HM-<DISC>-*, layer do padrão H&M, ESPEC do 3D com forma existente e a disciplina certa no registro', () => {
  const layers = new Set(padrao.layers.map(l => l.nome));
  for (const s of NOVOS) {
    const sim = SIMBOLOS[s];
    assert.ok(sim, `${s} fora da biblioteca`);
    assert.ok(layers.has(sim.layer), `${s}: layer ${sim.layer} fora do padrao-hm.json`);
    assert.ok(ESPEC[s], `${s} sem ESPEC no 3D`);
    // a mesma disciplina na tabela da biblioteca (análise do DWG) e na legenda do 3D, e ela existe no registro
    assert.strictEqual(BLOCOS_HM[s].disciplina, discDe(s), `${s}: biblioteca ${BLOCOS_HM[s].disciplina}`);
    assert.strictEqual(disciplinaDoSimbolo(s), discDe(s), `${s}: 3D ${disciplinaDoSimbolo(s)}`);
    assert.ok(chaves.has(discDe(s)) && D3[discDe(s)], s);
  }
  // nenhum símbolo da biblioteca sem disciplina no 3D (antes o HM-PRZ-PAINEL ficava sem disciplina na tabela da biblioteca)
  assert.deepStrictEqual(Object.keys(SIMBOLOS).filter(s => !BLOCOS_HM[s].disciplina), []);
  assert.deepStrictEqual(Object.keys(SIMBOLOS).filter(s => disciplinaDoSimbolo(s) === 'outros'), []);
  assert.strictEqual(BLOCOS_HM['HM-PRZ-PAINEL'].disciplina, 'pressurizacao');
  // biblioteca × 3D: a mesma disciplina para todos (cabeamento é a rede no 3D)
  const dif = Object.keys(SIMBOLOS).filter(s => chaveDisciplina(BLOCOS_HM[s].disciplina) !== disciplinaDoSimbolo(s));
  assert.deepStrictEqual(dif, []);
});

caso('a legenda de cada símbolo é reconhecida de volta pelo classificador único (o 3D acha a peça pela descrição)', () => {
  for (const s of RECONHECIDOS_AGORA) assert.strictEqual(simboloDaDescricao(SIMBOLOS[s].legenda), s, `${s}: "${SIMBOLOS[s].legenda}" → ${simboloDaDescricao(SIMBOLOS[s].legenda)}`);
});

// [texto da legenda do projeto, símbolo esperado]
const LEGENDAS = [
  ['Motor de indução trifásico 15 cv', 'HM-IND-MOTOR'], ['Motobomba de recalque', 'HM-IND-MOTOR'],
  ['CCM-01 Centro de controle de motores', 'HM-IND-CCM'], ['Banco de capacitores automático 90 kvar', 'HM-IND-BANCO-CAPACITORES'],
  ['Ventilador centrífugo de pressurização da escada', 'HM-PRZ-VENTILADOR'], ['Damper de alívio de sobrepressão', 'HM-PRZ-DAMPER'],
  ['Registro de alívio de pressão na escada', 'HM-PRZ-DAMPER'], ['Pressostato diferencial', 'HM-PRZ-SENSOR-PRESSAO'], ['Transmissor de pressão diferencial', 'HM-PRZ-SENSOR-PRESSAO'],
  ['Transformador 150 kVA a óleo', 'HM-MT-TRANSFORMADOR'], ['Cubículo de medição', 'HM-MT-CUBICULO'], ['Chave fusível 15 kV', 'HM-MT-CHAVE'],
  ['Chave seccionadora tripolar 15 kV', 'HM-MT-CHAVE'], ['Para-raios polimérico 12 kV 10 kA', 'HM-MT-PARA-RAIOS'], ['Malha de aterramento da subestação', 'HM-MT-MALHA'],
  ['Módulo fotovoltaico 550 Wp', 'HM-SOL-MODULO'], ['String box 2 entradas', 'HM-SOL-STRING-BOX'], ['Quadro CA do inversor', 'HM-SOL-QUADRO-CA'], ['Inversor on-grid 10 kW', 'HM-SOL-INVERSOR'],
  ['Carregador veicular wallbox 7,4 kW', 'HM-VE-CARREGADOR'], ['Quadro de recarga dos veículos (QD-VE)', 'HM-VE-QUADRO'],
  ['Controladora de acesso 4 portas', 'HM-ACE-CONTROLADORA'], ['Botoeira de emergência quebra-vidro', 'HM-ACE-EMERGENCIA'], ['Sensor de porta aberta', 'HM-ACE-SENSOR'],
  ['Tomada do sistema IT médico', 'HM-HOSP-TOMADA-IT'], ['Painel de alarme do DSI', 'HM-HOSP-PAINEL-ALARME'], ['BEL - barramento de equipotencialização local', 'HM-HOSP-BEL'],
  ['Sensor de temperatura ambiente', 'HM-AUT-SENSOR'], ['Sensor de CO2 de parede', 'HM-AUT-SENSOR'], ['Sensor de umidade relativa', 'HM-AUT-SENSOR'], ['Termostato comunicante', 'HM-AUT-SENSOR'],
  ['DG - distribuidor geral', 'HM-TEL-DG'], ['Central de interfonia', 'HM-TEL-DG'], ['Antena parabólica 60 cm com LNBF', 'HM-ANT-PARABOLICA'],
];

caso('legenda do projeto: o texto de cada componente diz o tipo (tabela única de tipos de ponto)', () => {
  for (const [texto, s] of LEGENDAS) assert.strictEqual(tipoPeloTexto(texto)?.[2], s, `"${texto}" → ${tipoPeloTexto(texto)?.[2]}`);
});

caso('layer: H&M (IND-, PRZ-, MT-, FV-, VE-, TEL-DG) e de outros escritórios dizem o tipo; a disciplina da layer também', () => {
  const casos = [['IND-MOTOR', 'HM-IND-MOTOR'], ['FORCA-MOTORES', 'HM-IND-MOTOR'], ['IND-CCM', 'HM-IND-CCM'], ['ELE-CCM-02', 'HM-IND-CCM'], ['IND-CAPACITOR', 'HM-IND-BANCO-CAPACITORES'],
    ['PRZ-VENTILADOR', 'HM-PRZ-VENTILADOR'], ['PRZ-DAMPER', 'HM-PRZ-DAMPER'], ['PRZ-SENSOR', 'HM-PRZ-SENSOR-PRESSAO'], ['PRESSOSTATO', 'HM-PRZ-SENSOR-PRESSAO'],
    ['MT-TRANSFORMADOR', 'HM-MT-TRANSFORMADOR'], ['MT-CUBICULO', 'HM-MT-CUBICULO'], ['MT-CHAVE', 'HM-MT-CHAVE'], ['MT-PARA-RAIOS', 'HM-MT-PARA-RAIOS'], ['MT-MALHA', 'HM-MT-MALHA'],
    ['FV-MODULO', 'HM-SOL-MODULO'], ['FV-STRING-BOX', 'HM-SOL-STRING-BOX'], ['FV-QUADRO-CA', 'HM-SOL-QUADRO-CA'], ['FV-INVERSOR', 'HM-SOL-INVERSOR'],
    ['VE-QUADRO', 'HM-VE-QUADRO'], ['VE-CARREGADOR', 'HM-VE-CARREGADOR'], ['TEL-DG', 'HM-TEL-DG'], ['CA-CONTROLADORA', 'HM-ACE-CONTROLADORA'],
    ['CA-BOTOEIRA-EMERG', 'HM-ACE-EMERGENCIA'], ['CA-SENSOR-PORTA', 'HM-ACE-SENSOR'], ['AUT-SENSOR', 'HM-AUT-SENSOR'], ['HOSP-TOMADA-IT', 'HM-HOSP-TOMADA-IT'], ['ANT-PARABOLICA', 'HM-ANT-PARABOLICA']];
  for (const [layer, s] of casos) assert.strictEqual(tipoPelaLayer(layer)?.[2], s, `${layer} → ${tipoPelaLayer(layer)?.[2]}`);
  const disc = [['IND-MOTOR', 'eletrica_industrial'], ['FORCA MOTORES', 'eletrica_industrial'], ['PRZ-DUTO', 'pressurizacao'], ['DUTO PRESSURIZACAO', 'pressurizacao'],
    ['MT-MALHA', 'media_tensao'], ['PARA-RAIOS MT', 'media_tensao'], ['TOMADAS HOSPITALAR', 'eletrica_hospitalar'], ['VAGAS RECARGA', 'carregador']];
  for (const [layer, d] of disc) assert.strictEqual(disciplinaDaLayer(layer), d, `${layer} → ${disciplinaDaLayer(layer)}`);
  // as layers das disciplinas novas são de instalação: não sobem como parede nem viram ambiente
  for (const l of ['IND-MOTOR', 'PRZ-DUTO', 'MT-MALHA', 'FV-MODULO', 'VE-QUADRO']) assert.strictEqual(classeDaLayer(l, false), null, l);
  for (const l of ['IND-MOTOR', 'MOTORES', 'PRZ-DAMPER', 'TEL-DG', 'MT-CHAVE', 'HOSP-BEL']) assert.ok(RE_INSTALACAO.test(l), l);
});

caso('o que muda e o que NÃO muda (antes caía em outro tipo ou em outra disciplina)', () => {
  const t = (s) => tipoPeloTexto(s)?.[2] || null;
  // antes: inversor de frequência virava inversor solar; "Quadro CA do inversor" virava inversor; QD-VE virava wallbox
  assert.strictEqual(t('Inversor de frequência 10 cv'), 'HM-IND-MOTOR'); // (o "cv" é do motor que ele aciona)
  assert.notStrictEqual(t('Inversor de frequência'), 'HM-SOL-INVERSOR');
  // antes: a botoeira de emergência na layer CA-…-EMERG caía na luminária de emergência; a layer AUT-SENSOR no sensor de presença
  assert.strictEqual(tipoPelaLayer('CA-BOTOEIRA-EMERG')[2], 'HM-ACE-EMERGENCIA');
  assert.strictEqual(tipoPelaLayer('AUT-SENSOR')[2], 'HM-AUT-SENSOR');
  // antes: "Tomada IT" virava tomada comum na descrição do componente
  assert.strictEqual(simboloDaDescricao('Tomada 2P+T do sistema IT médico'), 'HM-HOSP-TOMADA-IT');
  // NÃO muda: o magnético de porta continua do alarme; o para-raios e a malha sozinhos não são de MT (SPDA);
  // detector de temperatura é de incêndio; transformador de separação/comando não é o de força; motor do portão não é indústria
  assert.strictEqual(t('Sensor magnético de porta'), 'HM-ALM-MAGNETICO');
  assert.strictEqual(tipoPelaLayer('ALM-SENSOR-PORTA')?.[2], 'HM-ALM-IVP');
  assert.notStrictEqual(t('Para-raios tipo Franklin'), 'HM-MT-PARA-RAIOS');
  assert.strictEqual(t('Malha de aterramento'), null);
  assert.strictEqual(t('Haste de aterramento'), 'HM-SPDA-CAIXA-INSPECAO');
  assert.strictEqual(t('Detector de temperatura'), 'HM-INC-DETECTOR-TEMP');
  assert.strictEqual(t('Transformador de separação 10 kVA (IT médico)'), null);
  assert.strictEqual(t('Transformador de comando 220/24 V'), null);
  assert.notStrictEqual(t('Motor do portão de garagem'), 'HM-IND-MOTOR');
  assert.strictEqual(t('Extintor de CO2 6 kg'), null);
  assert.strictEqual(t('Tomada de TV'), 'HM-ANT-PONTO');
  assert.strictEqual(t('Luminária de emergência'), 'HM-INC-EMERGENCIA');
  assert.strictEqual(t('Leitor facial'), 'HM-ACE-LEITOR');
  // ventilador/damper sozinhos continuam da climatização (outra área): só com a pressurização no texto ou na layer
  assert.strictEqual(t('Ventilador axial'), null);
  assert.strictEqual(tipoPelaLayer('DAMPER'), undefined);
  // ponto de extensão: no arquivo da pressurização/indústria, ventilador e bomba deixam de ser "outra área"
  assert.ok(daPropriaDisciplina('VENTILADOR PRZ-VENTILADOR', ['pressurizacao']) && daPropriaDisciplina('BOMBA 0', ['eletrica_industrial']));
  assert.ok(!daPropriaDisciplina('VENTILADOR', ['eletrica']) && PROPRIOS_DA_DISCIPLINA.climatizacao);
});

// ── Símbolos EXPLODIDOS com a legenda da prancha (QiBuilder/AltoQi, PDF convertido): o tipo vem da LEGENDA ──
const ret = (layer, x, y, L, W = L) => ({ layer, pts: [[x, y], [x + L, y], [x + L, y + W], [x, y + W]], fechada: true });
caso('símbolos explodidos: cada componente das disciplinas novas reconhecido pela linha da legenda (layer genérica)', () => {
  const arq = { ambientes: [], referencia: [], preenchimentos: [], simbolosDaLegenda: [], notas: [] };
  LEGENDAS.forEach(([texto], i) => {
    const layer = `SIMB-${String(i + 1).padStart(2, '0')}`;
    const y = 50 - i * 0.7;
    arq.simbolosDaLegenda.push(ret(layer, 100, y - 0.15, 0.3));
    arq.notas.push({ s: texto, x: 100.6, y, h: 0.12, legenda: true });
    // planta: dois de cada, longe da legenda
    arq.referencia.push(ret(layer, i * 2, 0, 0.3), ret(layer, i * 2, 5, 0.3));
  });
  const leg = legendaDoProjeto(arq);
  const mapa = propostaDeMapa(arq);
  LEGENDAS.forEach(([texto, s], i) => {
    const layer = `SIMB-${String(i + 1).padStart(2, '0')}`;
    assert.strictEqual(leg.find(l => l.layer === layer)?.simbolo, s, `legenda "${texto}"`);
    const linha = mapa.simbolos.find(l => l.layer === layer);
    assert.ok(linha && linha.simbolo === s && linha.quantidade === 2 && linha.tipoDe === 'legenda', `mapa "${texto}": ${JSON.stringify(linha)}`);
  });
});

// ── DXF com BLOCOS e legenda (o leitor do DWG/DXF): a descrição da legenda chega a cada bloco ──
function dxfIndustrial() {
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'IND-MOTOR', cor: 30 }, { nome: 'IND-CCM', cor: 30 }, { nome: 'IND-CAPACITOR', cor: 30 }, { nome: 'LEGENDA', cor: 7 }] });
  g.polilinha([[0, 0], [20, 0], [20, 10], [0, 10]], { layer: 'A-PAREDE', fechada: true });
  g.texto(8, 5, 0.3, 'GALPAO DE PRODUCAO', { layer: 'A-TEXTO' });
  g.bloco('MOT', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.2, { layerName: '0' }); });
  g.bloco('CCM', (b) => { b.addLWPolyline([[-0.35, -0.15], [0.35, -0.15], [0.35, 0.15], [-0.35, 0.15]].map(([x, y]) => ({ point: { x, y } })), { flags: 1, layerName: '0' }); });
  g.bloco('BC', (b) => { b.addLWPolyline([[-0.25, -0.15], [0.25, -0.15], [0.25, 0.15], [-0.25, 0.15]].map(([x, y]) => ({ point: { x, y } })), { flags: 1, layerName: '0' }); });
  for (const x of [2, 5, 8, 11]) g.inserir('MOT', x, 2, { layer: 'IND-MOTOR' });
  g.inserir('CCM', 15, 9, { layer: 'IND-CCM' });
  g.inserir('BC', 17, 9, { layer: 'IND-CAPACITOR' });
  g.texto(30, 10, 0.25, 'LEGENDA', { layer: 'LEGENDA' });
  const linha = (y, bloco, layer, desc) => { g.inserir(bloco, 30.4, y + 0.06, { layer }); g.texto(31, y, 0.13, desc, { layer: 'LEGENDA' }); };
  linha(9.3, 'MOT', 'IND-MOTOR', 'Motor de indução trifásico 15 cv');
  linha(8.6, 'CCM', 'IND-CCM', 'Centro de controle de motores');
  linha(7.9, 'BC', 'IND-CAPACITOR', 'Banco de capacitores automático');
  return g.toString();
}
caso('DXF sintético (elétrica industrial): motores, CCM e banco contados sem os da legenda, com a descrição da legenda', () => {
  const p = lerProjetoDxf(dxfIndustrial(), { fator: 1 });
  const gr = (n) => p.simbolos.find(s => s.nomeLimpo === n);
  assert.deepStrictEqual([gr('MOT').quantidade, gr('CCM').quantidade, gr('BC').quantidade], [4, 1, 1]);
  assert.strictEqual(gr('MOT').descricaoLegenda, 'Motor de indução trifásico 15 cv');
  // e a descrição leva à peça certa do 3D
  assert.strictEqual(simboloDaDescricao(gr('MOT').descricaoLegenda), 'HM-IND-MOTOR');
  assert.strictEqual(simboloDaDescricao(gr('CCM').descricaoLegenda), 'HM-IND-CCM');
  assert.strictEqual(simboloDaDescricao(gr('BC').descricaoLegenda), 'HM-IND-BANCO-CAPACITORES');
});

caso('perfil do CAD (entender o projeto): componentes da industrial, hospitalar, pressurização, solar, recarga e automação', () => {
  const tipos = (k) => PERFIS[k].componentes.map(c => c.tipo);
  for (const t of ['motor', 'ccm', 'banco_capacitores']) assert.ok(tipos('eletrica_industrial').includes(t), `industrial sem ${t}: ${tipos('eletrica_industrial')}`);
  for (const t of ['tomada_it', 'painel_alarme', 'bel']) assert.ok(tipos('eletrica_hospitalar').includes(t), `hospitalar sem ${t}`);
  for (const t of ['ventilador', 'damper', 'sensor_pressao', 'painel']) assert.ok(tipos('pressurizacao').includes(t), `pressurização sem ${t}`);
  for (const t of ['modulo', 'string_box', 'quadro_ca', 'inversor']) assert.ok(tipos('solar').includes(t), `solar sem ${t}`);
  for (const t of ['carregador', 'quadro']) assert.ok(tipos('carregador').includes(t), `recarga sem ${t}`);
  assert.ok(tipos('automacao').includes('sensor') && tipos('telefonia').includes('dg') && tipos('antena').includes('parabolica'));
  assert.strictEqual(componenteDoPerfil(PERFIS.eletrica_industrial, 'Banco de capacitores 90 kvar')?.tipo, 'banco_capacitores');
  assert.strictEqual(componenteDoPerfil(PERFIS.eletrica_hospitalar, 'Painel de alarme do DSI do centro cirúrgico')?.tipo, 'painel_alarme');
  // a média tensão continua com a lista própria da subestação
  assert.ok(PERFIS.media_tensao.componentes.some(c => c.tipo === 'transformador'));
});

caso('3D: as peças novas entram com forma do visualizador, tamanho ≤ 1,2 m e a cor/rótulo da disciplina', () => {
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }] });
  g.polilinha([[0, 0], [10, 0], [10, 8], [0, 8]], { layer: 'A-PAREDE', fechada: true });
  g.texto(4, 4, 0.3, 'GALPAO', { layer: 'A-TEXTO' });
  const arq = lerArquitetura(g.toString());
  const dispositivos = NOVOS.map((s, i) => ({ simbolo: s, x: 0.5 + (i % 8) * 1.1, y: i < 8 ? 1 : 6 }));
  const c = montarCena(arq, { peDireito: 4, dispositivos, estimarInfra: false });
  for (const s of NOVOS) {
    const t = c.dispositivos.find(x => x.simbolo === s);
    assert.ok(t && t.itens.length === 1, `${s} fora da cena`);
    assert.strictEqual(t.disciplina, discDe(s), `${s}: ${t.disciplina}`);
    assert.ok(t.tam.every(v => v > 0 && v <= 1.2) && t.forma === ESPEC[s].forma, s);
  }
  for (const k of ['eletrica_industrial', 'pressurizacao', 'media_tensao', 'solar', 'carregador', 'antena']) {
    assert.ok(c.disciplinas[k] && c.disciplinas[k].cor !== '#dddddd', `${k}: ${JSON.stringify(c.disciplinas[k])}`);
  }
});

// ── Planta automática ─────────────────────────────────────────────────────
function arquiteturaIndustrial() {
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }] });
  g.polilinha([[0, 0], [24, 0], [24, 12], [0, 12]], { layer: 'A-PAREDE', fechada: true });
  g.polilinha([[24.15, 0], [30, 0], [30, 6], [24.15, 6]], { layer: 'A-PAREDE', fechada: true });
  g.polilinha([[24.15, 6.15], [30, 6.15], [30, 12], [24.15, 12]], { layer: 'A-PAREDE', fechada: true });
  g.texto(10, 6, 0.3, 'GALPAO DE PRODUCAO', { layer: 'A-TEXTO' });
  g.texto(25, 3, 0.3, 'CASA DE BOMBAS', { layer: 'A-TEXTO' });
  g.texto(25, 9, 0.3, 'SALA ELETRICA', { layer: 'A-TEXTO' });
  return lerArquitetura(g.toString());
}

caso('planta automática da elétrica industrial: motores do cálculo, bombas na casa de bombas, CCM/QGBT/banco na sala elétrica', () => {
  const motor = require('../../eletrica-industrial/scripts/lib/index.js');
  const dados = motor.exemplo();
  const res = motor.processar(dados);
  const arq = arquiteturaIndustrial();
  assert.deepStrictEqual(arq.ambientes.map(a => a.nome).sort(), ['CASA DE BOMBAS', 'GALPAO DE PRODUCAO', 'SALA ELETRICA']);
  const { pontos, notas } = PLANTAS.eletrica_industrial(res, arq);
  const out = gerarPlanta({ arquitetura: arq, pontos, notas });
  assert.deepStrictEqual(out.naoEncontrados, []);
  const por = (id) => out.posicoes.find(p => p.id === id);
  // todos os motores do cálculo (com as unidades repetidas: M-02-1, M-02-2…), nenhum a mais
  assert.strictEqual(out.posicoes.filter(p => p.simbolo === 'HM-IND-MOTOR').length, res.calc.unidades.length);
  for (const u of res.calc.unidades) assert.ok(por(u.tag), `motor ${u.tag} fora da planta`);
  // a bomba vai para a casa de bombas (pelo nome da carga); sem local nem nome de carga, o galpão (o maior) — não a sala
  // elétrica onde está o CCM que o alimenta
  assert.strictEqual(por('M-02-1').ambiente, 'CASA DE BOMBAS');
  assert.strictEqual(por('M-01').ambiente, 'GALPAO DE PRODUCAO');
  // CCM (símbolo próprio), QD, QGBT e banco na sala elétrica
  assert.strictEqual(por('CCM-01').simbolo, 'HM-IND-CCM');
  assert.strictEqual(por('QD-01').simbolo, 'HM-ELE-QUADRO');
  assert.ok(['CCM-01', 'CCM-02', 'QD-01', 'QGBT', 'BC'].every(id => por(id)?.ambiente === 'SALA ELETRICA'), JSON.stringify(out.posicoes.map(p => [p.id, p.ambiente])));
  assert.strictEqual(por('BC').simbolo, 'HM-IND-BANCO-CAPACITORES');
  // legenda/quantitativo com os símbolos da disciplina; o DXF tem os blocos e as layers IND-*
  assert.ok(out.quantitativo.some(q => /Motor elétrico/.test(q.legenda) && q.quantidade === res.calc.unidades.length), JSON.stringify(out.quantitativo));
  assert.ok(/HM-IND-MOTOR/.test(out.dxf) && /IND-CCM/.test(out.dxf));
  // o ambiente escrito no formulário vale mais (o do motor e o do quadro)
  const d2 = JSON.parse(JSON.stringify(dados));
  d2.motores[0].ambiente = 'Casa de bombas';
  d2.quadros.find(q => q.id === 'CCM-02').ambiente = 'Galpão de produção';
  const p2 = PLANTAS.eletrica_industrial(motor.processar(d2), arq);
  const o2 = gerarPlanta({ arquitetura: arq, ...p2 });
  assert.strictEqual(o2.posicoes.find(p => p.id === 'M-01').ambiente, 'CASA DE BOMBAS');
  assert.strictEqual(o2.posicoes.find(p => p.id === 'CCM-02').ambiente, 'GALPAO DE PRODUCAO');
  assert.ok(notas.some(n => /indicativ/.test(n)) && !notas.some(n => /\d+\s?m\b.{0,20}(afastamento|dist[âa]ncia m[íi]nima)/i.test(n)));
});

caso('planta automática da automação: um sensor por zona (pelo tipo de controle) e os quadros de automação na sala técnica', () => {
  const motor = require('../../automacao/scripts/lib/index.js');
  const dados = motor.exemplo();
  dados.zonas = [
    { id: 'Z1', nome: 'Escritório', uso: 'escritorio', area_m2: 60, controle: 'co2', setpoint: 24 },
    { id: 'Z2', nome: 'Sala de reunião', uso: 'reuniao', area_m2: 20, pessoas: 8, controle: 'sensor_tur', setpoint: 23 },
  ];
  const res = motor.processar(dados);
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }] });
  g.polilinha([[0, 0], [10, 0], [10, 6], [0, 6]], { layer: 'A-PAREDE', fechada: true });
  g.polilinha([[10.15, 0], [15, 0], [15, 6], [10.15, 6]], { layer: 'A-PAREDE', fechada: true });
  g.polilinha([[15.15, 0], [18, 0], [18, 6], [15.15, 6]], { layer: 'A-PAREDE', fechada: true });
  g.texto(4, 3, 0.3, 'ESCRITORIO', { layer: 'A-TEXTO' });
  g.texto(11, 3, 0.3, 'SALA DE REUNIAO', { layer: 'A-TEXTO' });
  g.texto(15.5, 3, 0.3, 'SALA TECNICA', { layer: 'A-TEXTO' });
  const arq = lerArquitetura(g.toString());
  const { pontos, notas } = PLANTAS.automacao(res, arq);
  const out = gerarPlanta({ arquitetura: arq, pontos, notas });
  assert.deepStrictEqual(out.naoEncontrados, []);
  const sens = out.posicoes.filter(p => p.simbolo === 'HM-AUT-SENSOR');
  assert.deepStrictEqual(sens.map(p => [p.id, p.ambiente]).sort(), [['CO2-Z1', 'ESCRITORIO'], ['TU-Z2', 'SALA DE REUNIAO']]);
  const qa = out.posicoes.filter(p => p.simbolo === 'HM-AUT-CONTROLADOR');
  assert.ok(qa.length === res.calc.bms.quadros && qa.every(p => p.ambiente === 'SALA TECNICA'), JSON.stringify(qa));
  // os equipamentos integrados (cobertura, subsolo) não viram ponto: ficam na nota
  assert.ok(notas.some(n => /Chiller.*Cobertura/i.test(n)), notas.join(' | '));
});

caso('as plantas automáticas novas estão no registro das plantas (laudos, entregas e linha de comando)', () => {
  assert.strictEqual(typeof PLANTAS.eletrica_industrial, 'function');
  assert.strictEqual(typeof PLANTAS.automacao, 'function');
  // a chave do motor da skill é a do registro (o sistema procura PLANTAS[motor.chave])
  assert.strictEqual(require('../../eletrica-industrial/scripts/lib/index.js').chave, 'eletrica_industrial');
  assert.strictEqual(require('../../automacao/scripts/lib/index.js').chave, 'automacao');
});

// a tabela de tipos não tem linha que nunca casa por engano (as novas casam o próprio símbolo)
caso('tabela de tipos: cada símbolo novo tem uma linha (layer e texto) e a disciplina do 3D', () => {
  for (const s of RECONHECIDOS_AGORA) {
    const linha = TIPOS.find(t => t[2] === s);
    assert.ok(linha, `${s} sem linha em tiposDePonto`);
    assert.strictEqual(chaveDisciplina(linha[3]), discDe(s), `${s}: ${linha[3]}`);
  }
});

console.log(`disciplinas no CAD: ${ok} casos ok`);
