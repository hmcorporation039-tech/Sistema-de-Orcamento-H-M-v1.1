// Reconhecimento, na ANÁLISE DO DWG/DXF, das disciplinas que estavam atrasadas no CAD (revisão geral, seção 6 —
// 14/11/2026): elétrica industrial, pressurização, média tensão, solar, carregador veicular, controle de acesso,
// hospitalar, automação, telefonia (DG) e antena (parabólica). Blocos com nome de outros escritórios (com e sem o
// contexto da disciplina marcada no arquivo), blocos da biblioteca H&M (que levam a peça exata para o 3D), símbolos
// explodidos lidos pela LEGENDA da prancha e o Mapa do CAD. DXF SINTÉTICOS (nenhum dado de cliente).
// Rodar: node testes/analiseCadDisciplinas.test.js
const assert = require('assert');
const path = require('path');
const { descreverSimbolo, lerArquivoCad } = require('../src/services/analiseCad');
const mapaCad = require('../src/services/mapaCad');
const { dispositivosDoEspacial } = require('../src/services/modelo3d');

const SK = require('../src/config/caminhos').RAIZ_SKILLS;
const { DesenhoDxf } = require(path.join(SK, '_comum', 'cad', 'dxf.js'));
const { SIMBOLOS, definirSimbolos } = require(path.join(SK, '_comum', 'cad', 'simbolos.js'));
const { BLOCOS_HM } = require(path.join(SK, '_comum', 'cad', 'disciplinasCad.js'));
const { disciplinaDoSimbolo: disciplinaDo3d, chaveDisciplina } = require(path.join(SK, '_comum', 'cad', 'modelo3d.js'));

let ok = 0;
const caso = async (nome, fn) => {
  try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
};
const g = (nomeLimpo, layer, extra = {}) => ({ bloco: nomeLimpo, nomeLimpo, layer, layers: [layer], atributos: {}, descricaoLegenda: null, ...extra });
const desc = (nome, layer, opcoes) => descreverSimbolo(g(nome, layer), opcoes);

// os símbolos que as disciplinas atrasadas ganharam (ou que existiam e nenhum desenho reconhecia)
const SIMBOLOS_NOVOS = Object.keys(SIMBOLOS).filter(s => /^HM-(IND|PRZ|MT)-|^HM-SOL-(MODULO|STRING-BOX|QUADRO-CA)$|^HM-VE-QUADRO$|^HM-ANT-PARABOLICA$/.test(s));
const DISC = { IND: 'eletrica_industrial', PRZ: 'pressurizacao', MT: 'media_tensao', SOL: 'solar', VE: 'carregador', ANT: 'antena', ACE: 'controle_acesso', HOSP: 'eletrica_hospitalar', AUT: 'automacao', TEL: 'telefonia' };

(async () => {
  await caso('blocos de outros escritórios: CCM, banco de capacitores, QD-VE, quadro CA, controladora, DG, parabólica, tomada IT, damper de alívio', async () => {
    const casos = [
      ['CCM-01', '0', 'eletrica_industrial', /^Centro de controle de motores/],
      ['BANCO CAPACITORES', '0', 'eletrica_industrial', /^Banco de capacitores/],
      ['INVERSOR DE FREQUENCIA', '0', 'eletrica_industrial', /^Inversor de frequência/],
      ['MOTOR 50CV', 'FORCA', 'eletrica_industrial', /^Motor elétrico/],
      ['QUADRO CA FV', '0', 'solar', /^Quadro CA da usina/],
      ['STRING BOX', 'FV-STRING-BOX', 'solar', /^String box/],
      ['QD-VE', '0', 'carregador', /^Quadro de distribuição da recarga/],
      ['CONTROLADORA', 'CA-DISPOSITIVO', 'controle_acesso', /^Controladora de acesso/],
      ['QUEBRA VIDRO', 'CA-DISPOSITIVO', 'controle_acesso', /^Acionador de emergência \(quebra-vidro\)/],
      ['SENSOR DE PORTA', 'CA-DISPOSITIVO', 'controle_acesso', /^Sensor de porta/],
      ['DG', 'TEL-DG', 'telefonia', /^DG \/ central/],
      ['PARABOLICA', 'ANT-EQUIP', 'antena', /^Antena parabólica/],
      ['TOMADA IT', 'ELE-TOMADA', 'eletrica_hospitalar', /^Tomada do sistema IT/],
      ['DSI', 'ELE-QUADRO', 'eletrica_hospitalar', /^Painel de alarme do DSI/],
      ['DAMPER ALIVIO', '0', 'pressurizacao', /^Damper \/ registro de alívio/],
    ];
    for (const [nome, layer, d, re] of casos) {
      const r = desc(nome, layer);
      assert.strictEqual(r.disciplina, d, `${nome}: ${JSON.stringify(r)}`);
      assert.match(r.descricao || '', re, nome);
    }
  });

  await caso('contexto da disciplina: ventilador/bomba são "outra área" nas de sempre e componente na pressurização e na indústria', async () => {
    // sem contexto: continua outra área (climatização/hidráulica — não vira material)
    assert.strictEqual(desc('VENTILADOR', '0').outraArea, true);
    assert.strictEqual(desc('BOMBA', '0').outraArea, true);
    assert.strictEqual(desc('VENTILADOR', 'MEC-EQUIPAMENTO', { disciplinas: ['eletrica'] }).outraArea, true);
    // pela layer (PRZ-, IND-) ou pela disciplina marcada no arquivo
    const v = desc('VENTILADOR', 'PRZ-VENTILADOR');
    assert.deepStrictEqual([v.disciplina, /^Ventilador de pressurização/.test(v.descricao), v.outraArea], ['pressurizacao', true, false]);
    assert.strictEqual(desc('VENTILADOR', '0', { disciplinas: ['pressurizacao'] }).disciplina, 'pressurizacao');
    assert.strictEqual(desc('PRESSOSTATO', 'PRZ-SENSOR').disciplina, 'pressurizacao');
    assert.match(desc('PRESSOSTATO', 'PRZ-SENSOR').descricao, /^Transmissor de pressão diferencial/);
    const b = desc('BOMBA', '0', { disciplinas: ['eletrica_industrial'] });
    assert.deepStrictEqual([b.disciplina, /^Motor elétrico \(carga acionada\)/.test(b.descricao)], ['eletrica_industrial', true]);
    assert.strictEqual(desc('EXAUSTOR', 'IND-MOTOR').disciplina, 'eletrica_industrial');
    // o nome/layer pede um contexto e o arquivo outro: vale o do desenho (ventilador na layer PRZ, num arquivo da indústria)
    assert.strictEqual(desc('VENTILADOR', 'PRZ-VENTILADOR', { disciplinas: ['eletrica_industrial'] }).disciplina, 'pressurizacao');
    // mesmo no arquivo da pressurização, o registro de gaveta da hidráulica não vira damper
    assert.notStrictEqual(desc('REGISTRO GAVETA', 'HID-AGUA', { disciplinas: ['pressurizacao'] }).disciplina, 'pressurizacao');
    // a malha/haste é da subestação só no arquivo de MT (sozinha, do SPDA)
    assert.strictEqual(desc('HASTE ATERRAMENTO', '0', { disciplinas: ['media_tensao'] }).disciplina, 'media_tensao');
    assert.notStrictEqual(desc('HASTE ATERRAMENTO', 'SPDA-HASTE').disciplina, 'media_tensao');
  });

  await caso('o que NÃO muda: motor do portão é da elétrica predial; controladora DDC é da automação; magnético de porta do alarme é do alarme', async () => {
    assert.strictEqual(desc('MOTOR PORTAO', 'ELE-TOMADA').disciplina, 'eletrica');
    assert.strictEqual(desc('CONTROLADORA DDC', 'AUT-CONTROLADOR').disciplina, 'automacao');
    assert.strictEqual(desc('SENSOR MAGNETICO PORTA', 'ALM-SENSOR').disciplina, 'alarme');
    assert.strictEqual(desc('TB-T', 'INST - TOMADAS').disciplina, 'eletrica');
    assert.match(desc('QL', 'INST - ELÉTRICA').descricao, /Quadro de distribuição/);
  });

  await caso('biblioteca H&M: todos os blocos com descrição e a disciplina do registro (a mesma do 3D); o bloco leva o símbolo exato', async () => {
    for (const [nome, s] of Object.entries(BLOCOS_HM)) {
      const r = desc(nome, s.layer);
      assert.ok(r.descricao && r.disciplina, nome);
      assert.strictEqual(chaveDisciplina(r.disciplina), disciplinaDo3d(nome), `${nome}: ${r.disciplina} × 3D ${disciplinaDo3d(nome)}`);
      assert.strictEqual(r.simbolo, nome);
    }
    for (const s of SIMBOLOS_NOVOS) assert.strictEqual(desc(s, SIMBOLOS[s].layer).disciplina, DISC[s.split('-')[1]], s);
  });

  // DXF com os BLOCOS da biblioteca H&M das disciplinas atrasadas (como a planta que o próprio sistema gera)
  function dxfBiblioteca(nomes) {
    const d = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, ...[...new Set(nomes.map(n => SIMBOLOS[n].layer))].map(nome => ({ nome, cor: 3 }))] });
    d.polilinha([[0, 0], [30, 0], [30, 12], [0, 12]], { layer: 'A-PAREDE', fechada: true });
    d.texto(12, 6, 0.3, 'GALPAO', { layer: 'A-TEXTO' });
    definirSimbolos(d, nomes);
    nomes.forEach((n, i) => { d.inserir(n, 1 + (i % 14) * 2, i < 14 ? 2 : 9, { layer: SIMBOLOS[n].layer, atributos: { ID: `X${i + 1}` } }); d.inserir(n, 1.6 + (i % 14) * 2, i < 14 ? 3.2 : 10, { layer: SIMBOLOS[n].layer, atributos: { ID: `Y${i + 1}` } }); });
    return d.toString();
  }
  const RECONHECIDOS = [...SIMBOLOS_NOVOS, 'HM-SOL-INVERSOR', 'HM-VE-CARREGADOR', 'HM-ACE-CONTROLADORA', 'HM-ACE-EMERGENCIA', 'HM-ACE-SENSOR',
    'HM-HOSP-TOMADA-IT', 'HM-HOSP-PAINEL-ALARME', 'HM-HOSP-BEL', 'HM-AUT-SENSOR', 'HM-TEL-DG'];

  await caso('DXF sintético com os blocos H&M: cada componente contado na disciplina certa e levado ao 3D com a peça exata', async () => {
    const r = await lerArquivoCad(Buffer.from(dxfBiblioteca(RECONHECIDOS)), 'biblioteca.dxf');
    for (const s of RECONHECIDOS) {
      const it = r.pagina.itens.find(i => i.tipo === 'simbolo' && i.bloco === s);
      assert.ok(it, `${s} fora dos itens: ${JSON.stringify(r.pagina.naoIdentificados)}`);
      assert.strictEqual(it.quantidade, 2, s);
      assert.strictEqual(it.disciplina, DISC[s.split('-')[1]], `${s}: ${it.disciplina}`);
    }
    assert.deepStrictEqual(r.pagina.naoIdentificados, []);
    // espacial → 3D: o ponto do bloco leva o símbolo (antes o 3D adivinhava pela descrição e o motor virava caixa genérica)
    const { dispositivos, genericos } = dispositivosDoEspacial(r.espacial);
    assert.strictEqual(genericos, 0);
    for (const s of RECONHECIDOS) assert.strictEqual(dispositivos.filter(d => d.simbolo === s).length, 2, s);
  });

  // DXF com símbolos EXPLODIDOS (sem bloco) e a legenda da prancha: o tipo vem da LEGENDA
  function dxfExplodidoComLegenda() {
    const d = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'IND-SIMBOLOS', cor: 30 }, { nome: 'PRZ-SIMBOLOS', cor: 150 }, { nome: 'LEGENDA', cor: 7 }] });
    d.polilinha([[0, 0], [20, 0], [20, 10], [0, 10]], { layer: 'A-PAREDE', fechada: true });
    d.texto(8, 5, 0.3, 'GALPAO DE PRODUCAO', { layer: 'A-TEXTO' });
    const quad = (x, y, L, W, layer) => d.polilinha([[x, y], [x + L, y], [x + L, y + W], [x, y + W]], { layer, fechada: true });
    // planta: 3 motores (quadrado 0,4), 1 CCM (0,8 × 0,3), 2 dampers (0,5 × 0,15)
    for (const x of [2, 5, 8]) quad(x, 2, 0.4, 0.4, 'IND-SIMBOLOS');
    quad(14, 8.5, 0.8, 0.3, 'IND-SIMBOLOS');
    for (const x of [3, 9]) quad(x, 8, 0.5, 0.15, 'PRZ-SIMBOLOS');
    // legenda à direita
    d.texto(30, 10, 0.25, 'LEGENDA', { layer: 'LEGENDA' });
    quad(30.2, 9.1, 0.4, 0.4, 'IND-SIMBOLOS'); d.texto(31, 9.2, 0.15, 'Motor de indução trifásico 10 cv', { layer: 'LEGENDA' });
    quad(30, 8.35, 0.8, 0.3, 'IND-SIMBOLOS'); d.texto(31, 8.4, 0.15, 'CCM - centro de controle de motores', { layer: 'LEGENDA' });
    quad(30.1, 7.65, 0.5, 0.15, 'PRZ-SIMBOLOS'); d.texto(31, 7.6, 0.15, 'Damper de alívio de sobrepressão', { layer: 'LEGENDA' });
    return d.toString();
  }

  await caso('DXF sintético explodido: motor, CCM e damper reconhecidos pela legenda no Mapa do CAD (a conferir até a confirmação)', async () => {
    const r = await lerArquivoCad(Buffer.from(dxfExplodidoComLegenda()), 'explodido.dxf');
    const linhas = r.mapa?.simbolos || [];
    const linha = (s) => linhas.find(l => l.simbolo === s);
    // (a contagem do desenho sintético inclui a amostra da legenda — a separação da legenda é a mesma de todas as
    // disciplinas e não é o que este caso prova; aqui vale o TIPO que a legenda deu a cada forma)
    assert.ok(linha('HM-IND-MOTOR')?.quantidade >= 3, JSON.stringify(linhas.map(l => [l.layer, l.medida, l.simbolo, l.quantidade, l.rotulo])));
    assert.ok(linha('HM-IND-CCM')?.quantidade >= 1 && linha('HM-PRZ-DAMPER')?.quantidade >= 2);
    assert.ok(['HM-IND-MOTOR', 'HM-IND-CCM', 'HM-PRZ-DAMPER'].every(s => linha(s).tipoDe === 'legenda'));
    assert.strictEqual(linha('HM-IND-MOTOR').disciplina, 'eletrica_industrial');
    assert.strictEqual(linha('HM-PRZ-DAMPER').disciplina, 'pressurizacao');
    // entram no orçamento marcados para conferir, com a disciplina e a descrição da legenda
    const it = r.pagina.itens.find(i => i.tipo === 'simbolo' && /^Motor de indução/.test(i.descricao));
    assert.ok(it && it.quantidade >= 3 && it.conferir && it.disciplina === 'eletrica_industrial', JSON.stringify(r.pagina.itens.map(i => [i.descricao, i.quantidade, i.disciplina])));
  });

  await caso('Mapa do CAD: os tipos novos na lista, cada um na disciplina do registro; confirmar um deles inclui a disciplina na análise', async () => {
    const tipos = mapaCad.tiposDisponiveis();
    for (const s of RECONHECIDOS) {
      const t = tipos.find(x => x.simbolo === s);
      assert.ok(t, `${s} fora da lista do mapa`);
      assert.strictEqual(mapaCad.chaveDoProjeto(t.disciplina), DISC[s.split('-')[1]] === 'controle_acesso' ? 'controle_acesso' : DISC[s.split('-')[1]], `${s}: ${t.disciplina}`);
      assert.ok(t.nome && !/^HM-/.test(t.nome), `${s}: nome ${t.nome}`);
    }
    // a confirmação de um motor num arquivo marcado só como elétrica predial pede a elétrica industrial
    const mapa = { simbolos: [{ layer: 'IND-SIMBOLOS', medida: [0.4, 0.4], simbolo: 'HM-IND-MOTOR', disciplina: 'eletrica_industrial', confirmado: true, contados: 3 }] };
    assert.deepStrictEqual(mapaCad.disciplinasAIncluir(mapa, ['eletrica']).map(d => [d.chave, d.pontos]), [['eletrica_industrial', 3]]);
    assert.strictEqual(mapaCad.validarLinhas([{ idx: 0, simbolo: 'HM-PRZ-VENTILADOR' }], mapa), null);
  });

  console.log(`analiseCad (disciplinas atrasadas): ${ok} casos ok`);
  await require('../src/config/database').end().catch(() => {});
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
