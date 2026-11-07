// Teste da base de CAD (skills/_comum/cad): escrita DXF no padrão H&M (blocos
// com atributos, SEQEND único, rotação dos atributos), leitura de arquitetura
// (ambientes por polilinha fechada + texto, unidade mm→m, parede dupla) e
// posicionamento de pontos. Desenhos sintéticos. Rodar: node _comum/cad/teste-cad.js
const assert = require('assert');
const { Helper } = require('dxf');
const { DesenhoDxf } = require('./dxf');
const { definirSimbolos, legenda } = require('./simbolos');
const { lerArquitetura } = require('./arquitetura');
const P = require('./posicionamento');

let ok = 0;
const falhou = (nome, e) => { console.error(`  FALHOU ${nome}: ${e.message}`); process.exitCode = 1; };
const caso = (nome, fn) => {
  try {
    const r = fn();
    if (r && r.then) return r.then(() => { ok++; console.log(`  ok  ${nome}`); }, e => falhou(nome, e));
    ok++; console.log(`  ok  ${nome}`);
  } catch (e) { falhou(nome, e); }
};

function arquiteturaSintetica() {
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }] });
  g.polilinha([[-150, -150], [8150, -150], [8150, 5150], [-150, 5150]], { layer: 'A-PAREDE', fechada: true }); // face externa
  g.polilinha([[0, 0], [5000, 0], [5000, 5000], [0, 5000]], { layer: 'A-PAREDE', fechada: true });
  g.polilinha([[5150, 0], [8000, 0], [8000, 5000], [5150, 5000]], { layer: 'A-PAREDE', fechada: true });
  g.texto(2500, 2500, 200, 'SALA DE ESTAR', { layer: 'A-TEXTO' });
  g.texto(2500, 2100, 150, 'A=25,00m²', { layer: 'A-TEXTO' });
  g.texto(6500, 2500, 200, 'COZINHA', { layer: 'A-TEXTO' });
  // desenho em milímetros ($INSUNITS = 4)
  return g.toString().replace(/(\$INSUNITS\r?\n\s*70\r?\n\s*)6/, '$14');
}

caso('arquitetura em mm: ambientes no menor polígono, área e perímetro em metros', () => {
  const a = lerArquitetura(arquiteturaSintetica());
  assert.strictEqual(a.fatorUnidade, 0.001);
  assert.deepStrictEqual(a.ambientes.map(x => [x.nome, x.area_m2, x.perimetro_m]), [['COZINHA', 14.25, 15.7], ['SALA DE ESTAR', 25, 20]]);
});

caso('posicionamento: perímetro, grade e cantos ficam dentro do ambiente', () => {
  const sala = [[0, 0], [5, 0], [5, 5], [0, 5]];
  const t = P.noPerimetro(sala, 4);
  assert.strictEqual(t.length, 4);
  assert.ok(t.every(p => p.x > 0 && p.x < 5 && p.y > 0 && p.y < 5), 'tomada fora do ambiente');
  assert.ok(t.every(p => Math.min(p.x, p.y, 5 - p.x, 5 - p.y) < 0.2), 'tomada longe da parede');
  assert.strictEqual(P.gradeComQuantidade(sala, 4).length, 4);
  assert.strictEqual(P.nosCantos(sala, 2).length, 2);
});

caso('DXF H&M: blocos com 2 atributos, um SEQEND por inserção, atributo gira com o símbolo', () => {
  const d = new DesenhoDxf();
  definirSimbolos(d, ['HM-ELE-TOMADA-BAIXA', 'HM-INC-DETECTOR-FUMACA']);
  d.inserir('HM-ELE-TOMADA-BAIXA', 1, 1, { layer: 'ELE-TOMADA', rotacao: 90, atributos: { ID: 'T1', CIRCUITO: 'C3' } });
  d.inserir('HM-INC-DETECTOR-FUMACA', 3, 3, { layer: 'INC-DETECTOR', atributos: { ID: 'DF1' } });
  legenda(d, 10, 10, [{ simbolo: 'HM-ELE-TOMADA-BAIXA', quantidade: 1 }]);
  const txt = d.toString();
  assert.match(txt, /AC1021/, 'precisa ser R2007');
  // sequência de entidades: INSERT ATTRIB ATTRIB SEQEND (nunca SEQEND entre atributos)
  // DXF = pares (código de grupo, valor): entidade é o valor do código 0
  const lin = txt.split(/\r?\n/).map(s => s.trim());
  const tipos = [];
  let naSecao = false;
  for (let i = 0; i < lin.length - 1; i += 2) {
    if (lin[i] === '2' && lin[i + 1] === 'ENTITIES') naSecao = true;
    else if (naSecao && lin[i] === '0') { if (lin[i + 1] === 'ENDSEC') break; tipos.push(lin[i + 1]); }
  }
  const seq = tipos.join(' ');
  assert.ok(seq.includes('INSERT ATTRIB ATTRIB SEQEND'), seq.slice(0, 120));
  assert.ok(!/ATTRIB SEQEND ATTRIB/.test(seq), 'SEQEND entre atributos');
  const ents = new Helper(txt).parsed.entities;
  const atr = ents.filter(e => e.type === 'ATTRIB');
  const c3 = atr.find(a => a.tag === 'CIRCUITO')?.text;
  assert.ok(c3 && c3.string === 'C3', 'atributo CIRCUITO não lido');
  // ATTDEF em (0,2 ; -0,08) girado 90° em torno de (1,1) → (1,08 ; 1,2)
  assert.ok(Math.abs(c3.x - 1.08) < 1e-6 && Math.abs(c3.y - 1.2) < 1e-6, `posição ${c3.x},${c3.y}`);
});

caso('planta de elétrica sobre a arquitetura: quantidades da NBR 5410 e pontos dentro dos ambientes', () => {
  const { gerarPlanta } = require('./planta');
  const { PLANTAS } = require('./plantasDisciplina');
  const arq = lerArquitetura(arquiteturaSintetica());
  const motor = require('../../eletrica/scripts/lib/index.js');
  const v = JSON.parse(JSON.stringify(motor.modeloVazio()));
  v.ambientes = arq.ambientes.map(a => ({ nome: a.nome, tipo: /COZ/.test(a.nome) ? 'cozinha' : 'sala', area_m2: a.area_m2, perimetro_m: a.perimetro_m }));
  const res = motor.processar(v);
  const { pontos, notas } = PLANTAS.eletrica(res, arq);
  const out = gerarPlanta({ arquitetura: arq, pontos, notas, carimbo: { cliente: 'Cliente Exemplo' } });
  const tomadas = out.quantitativo.find(q => q.simbolo === 'HM-ELE-TOMADA-BAIXA').quantidade;
  assert.strictEqual(tomadas, res.calc.previsao.reduce((s, a) => s + a.nTug, 0), 'tomadas = previsão da norma');
  assert.strictEqual(out.naoEncontrados.length, 0);
  for (const p of out.posicoes) {
    const a = arq.ambientes.find(x => x.nome === p.ambiente);
    const xs = a.poligono.map(q => q[0]), ys = a.poligono.map(q => q[1]);
    assert.ok(p.x > Math.min(...xs) && p.x < Math.max(...xs) && p.y > Math.min(...ys) && p.y < Math.max(...ys), `${p.id} fora de ${p.ambiente}`);
  }
  assert.ok(new Helper(out.dxf).parsed.entities.filter(e => e.type === 'INSERT').length >= out.posicoes.length);
});

caso('unifilar QElectroTech da elétrica: formato 0.100, um disjuntor por circuito, válido pelas regras de carga do QET', () => {
  const { gerarUnifilarEletrica } = require('./unifilar');
  const motor = require('../../eletrica/scripts/lib/index.js');
  const res = motor.processar(motor.exemplo());
  const { xml, folhas } = gerarUnifilarEletrica(res);
  assert.match(xml, /<project[^>]*version="0\.100\.0"/, 'precisa abrir na 0.100 (estável)');
  assert.strictEqual(folhas, Math.ceil(res.calc.circuitos.length / 6));
  for (let i = 0; i <= res.calc.circuitos.length; i++) assert.ok(xml.includes(`-Q${i}`), `falta -Q${i}`);
  assert.ok(xml.includes('embed://import/'), 'símbolos embutidos no arquivo');
});

caso('unifilar industrial: QGBT + CCMs num projeto só, motores com símbolo de motor', () => {
  const { gerarUnifilarIndustrial } = require('./unifilar');
  const motor = require('../../eletrica-industrial/scripts/lib/index.js');
  const { xml, folhas, quadros } = gerarUnifilarIndustrial(motor.processar(motor.exemplo()));
  assert.ok(quadros.length >= 2 && folhas >= quadros.length);
  assert.match(xml, /<project[^>]*version="0\.100\.0"/);
  assert.ok(xml.includes('moteur.elmt'), 'motor sem o símbolo de motor');
});

caso('unifilar da subestação (MT): entrega → proteção → transformador → QGBT, 0 erros nas regras do QET', () => {
  const { gerarUnifilarMT } = require('./unifilar');
  const motor = require('../../media-tensao/scripts/lib/index.js');
  const { xml, folhas } = gerarUnifilarMT(motor.processar(motor.exemplo()));
  assert.match(xml, /<project[^>]*version="0\.100\.0"/);
  assert.ok(folhas >= 1);
  for (const r of ['-F1', '-FV1', '-Q1', '-Q2', '-K1', '-T1', '-Q3']) assert.ok(xml.includes(r), `falta ${r}`);
});

caso('plantas de telefonia e antena: unidade-tipo na arquitetura sem número de apartamento', () => {
  const { gerarPlanta } = require('./planta');
  const { PLANTAS } = require('./plantasDisciplina');
  const arq = lerArquitetura(arquiteturaSintetica()); // SALA DE ESTAR, COZINHA
  const tel = require('../../telefonia/scripts/lib/index.js');
  const ant = require('../../antena/scripts/lib/index.js');
  const pt = gerarPlanta({ arquitetura: arq, ...PLANTAS.telefonia(tel.processar(tel.exemplo()), arq) });
  const pa = gerarPlanta({ arquitetura: arq, ...PLANTAS.antena(ant.processar(ant.exemplo()), arq) });
  // interfone da unidade-tipo uma vez só na cozinha (não 54 vezes)
  assert.strictEqual(pt.posicoes.filter(p => p.simbolo === 'HM-TEL-PONTO' && p.ambiente === 'COZINHA').length, 1);
  assert.ok(pa.posicoes.some(p => p.simbolo === 'HM-ANT-PONTO' && p.ambiente === 'SALA DE ESTAR'));
  for (const o of [pt, pa]) assert.ok(new Helper(o.dxf).parsed.entities.length > 0);
});

// Arquitetura com portas em BLOCO (arco de 90° + folha): uma girada 180° entre
// sala e cozinha (abre para a sala) e uma espelhada na fachada da cozinha
function arquiteturaComPortas() {
  const { point3d } = require('@tarikjabiri/dxf');
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'A-PORTA', cor: 3 }] });
  g.polilinha([[0, 0], [5000, 0], [5000, 5000], [0, 5000]], { layer: 'A-PAREDE', fechada: true });
  g.polilinha([[5150, 0], [8000, 0], [8000, 5000], [5150, 5000]], { layer: 'A-PAREDE', fechada: true });
  g.texto(2500, 2500, 200, 'RECEPÇÃO', { layer: 'A-TEXTO' });
  g.texto(6500, 2500, 200, 'SALA DE TI', { layer: 'A-TEXTO' });
  // bloco da porta: dobradiça na origem, folha aberta até (800,0), batente em (0,800)
  g.bloco('PORTA80', (b) => {
    b.addLine(point3d(0, 0), point3d(800, 0), { layerName: '0' });
    b.addArc(point3d(0, 0), 800, 0, 90, { layerName: '0' });
  });
  g.dxf.addInsert('PORTA80', point3d(5000, 2000), { layerName: 'A-PORTA', rotationAngle: 180 });
  g.dxf.addInsert('PORTA80', point3d(7000, 0), { layerName: 'A-PORTA', rotationAngle: 90, scaleFactor: { x: -1, y: 1, z: 1 } });
  return g.toString().replace(/(\$INSUNITS\r?\n\s*70\r?\n\s*)6/, '$14');
}

caso('portas em bloco (girada e espelhada): dobradiça, batente, largura e ambientes', () => {
  const a = lerArquitetura(arquiteturaComPortas());
  assert.strictEqual(a.portas.length, 2, JSON.stringify(a.portas.map(p => p.meio)));
  const interna = a.portas.find(p => !p.externa), externa = a.portas.find(p => p.externa);
  const perto = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.01;
  assert.ok(perto(interna.dobradica, [5, 2]) && perto(interna.batente, [5, 1.2]), `interna ${interna.dobradica} → ${interna.batente}`);
  assert.strictEqual(interna.largura_m, 0.8);
  assert.strictEqual(interna.abre_para, 'RECEPÇÃO');
  assert.strictEqual(interna.outro_lado, 'SALA DE TI');
  // espelhada: dobradiça em (7;0), batente em (6,2;0), abre para fora (y < 0)
  assert.ok(perto(externa.dobradica, [7, 0]) && perto(externa.batente, [6.2, 0]), `externa ${externa.dobradica} → ${externa.batente}`);
  assert.deepStrictEqual(externa.ambientes, ['SALA DE TI']);
  assert.ok(externa.n[1] < 0, 'a porta da fachada abre para fora');
});

caso('planta de controle de acesso: leitor do lado de fora, botoeira dentro, junto à porta certa', () => {
  const { gerarPlanta } = require('./planta');
  const { PLANTAS } = require('./plantasDisciplina');
  const arq = lerArquitetura(arquiteturaComPortas());
  const motor = require('../../controle-acesso/scripts/lib/index.js');
  const v = motor.exemplo();
  v.portas = [{ ...v.portas.find(p => p.tipo === 'simples' && p.sentido === 'entrada'), id: 'P1', local: 'Sala de TI / rack', quantidade: 1 }];
  v.catracas = [];
  const res = motor.processar(v);
  const { pontos, notas } = PLANTAS.controle_acesso(res, arq);
  const out = gerarPlanta({ arquitetura: arq, pontos, notas });
  assert.strictEqual(out.naoEncontrados.length, 0);
  const le = out.posicoes.find(p => p.id.startsWith('LE-P1'));
  const bs = out.posicoes.find(p => p.id.startsWith('BS-P1'));
  const fe = out.posicoes.find(p => p.id.startsWith('FE-P1'));
  assert.ok(le && bs && fe, out.posicoes.map(p => p.id).join(' '));
  // porta principal da Sala de TI: a que dá para a Recepção (não a da fachada);
  // leitor do lado da Recepção (x < 5), botoeira dentro da sala (x > 5,15)
  assert.strictEqual(le.porta, bs.porta);
  assert.ok(le.x < 5 && bs.x > 5.15, `leitor ${le.x},${le.y} botoeira ${bs.x},${bs.y}`);
  // ao lado do batente da fechadura (y < 1,2), não no meio do vão
  assert.ok(le.y < 1.2 && bs.y < 1.2, `y ${le.y} ${bs.y}`);
  assert.ok(Math.abs(fe.y - 1.6) < 0.05, 'eletroímã no meio do vão');
});

caso('alarme e elétrica usam as portas: magnético no vão, interruptor junto ao batente', () => {
  const { gerarPlanta } = require('./planta');
  const { PLANTAS } = require('./plantasDisciplina');
  const arq = lerArquitetura(arquiteturaComPortas());
  const motor = require('../../eletrica/scripts/lib/index.js');
  const v = JSON.parse(JSON.stringify(motor.modeloVazio()));
  v.ambientes = arq.ambientes.map(a => ({ nome: a.nome, tipo: 'sala', area_m2: a.area_m2, perimetro_m: a.perimetro_m }));
  const out = gerarPlanta({ arquitetura: arq, ...PLANTAS.eletrica(motor.processar(v), arq) });
  const s = out.posicoes.find(p => p.simbolo === 'HM-ELE-INTERRUPTOR' && p.ambiente === 'RECEPÇÃO');
  assert.ok(s.porta && Math.abs(s.x - 4.8) < 0.05 && s.y < 1.2, `interruptor ${s.x},${s.y}`);
});

caso('ambientes pelas paredes (sem polilinha de área): vão da porta fechado, área pela face da parede', () => {
  const { point3d } = require('@tarikjabiri/dxf');
  const g = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'A-PORTA', cor: 3 }, { nome: 'A-MOBILIARIO', cor: 4 }] });
  const L = (x1, y1, x2, y2) => g.linha(x1, y1, x2, y2, 'A-PAREDE');
  // faces interna e externa do contorno (parede de 150 mm), em linhas soltas
  [[0, 0, 8000, 0], [8000, 0, 8000, 5000], [8000, 5000, 0, 5000], [0, 5000, 0, 0],
    [-150, -150, 8150, -150], [8150, -150, 8150, 5150], [8150, 5150, -150, 5150], [-150, 5150, -150, -150]].forEach(l => L(...l));
  // parede interna com vão de 800 mm (y 1200–2000) e arremates
  [[5000, 0, 5000, 1200], [5000, 2000, 5000, 5000], [5150, 0, 5150, 1200], [5150, 2000, 5150, 5000], [5000, 1200, 5150, 1200], [5000, 2000, 5150, 2000]].forEach(l => L(...l));
  g.bloco('PORTA80', (b) => { b.addLine(point3d(0, 0), point3d(800, 0), { layerName: '0' }); b.addArc(point3d(0, 0), 800, 0, 90, { layerName: '0' }); });
  g.dxf.addInsert('PORTA80', point3d(5000, 2000), { layerName: 'A-PORTA', rotationAngle: 180 });
  g.polilinha([[1000, 3000], [2000, 3000], [2000, 4000], [1000, 4000]], { layer: 'A-MOBILIARIO', fechada: true }); // mesa: não é parede
  g.texto(2500, 2500, 200, 'SALA', { layer: 'A-TEXTO' });
  g.texto(6500, 2500, 200, 'COZINHA', { layer: 'A-TEXTO' });
  g.texto(9500, 2500, 200, 'NOTA FORA', { layer: 'A-TEXTO' }); // fora do prédio: vaza, descartado
  const a = lerArquitetura(g.toString().replace(/(\$INSUNITS\r?\n\s*70\r?\n\s*)6/, '$14'));
  assert.deepStrictEqual(a.ambientes.map(x => x.nome), ['COZINHA', 'SALA']);
  const [coz, sala] = a.ambientes;
  assert.ok(Math.abs(sala.area_m2 - 25) < 0.5 && Math.abs(coz.area_m2 - 14.25) < 0.4, `áreas ${sala.area_m2} ${coz.area_m2}`);
  assert.ok(sala.origem === 'paredes' && sala.poligono.length <= 8, `polígono com ${sala.poligono.length} vértices`);
  assert.strictEqual(a.portas.length, 1);
  assert.deepStrictEqual([a.portas[0].abre_para, a.portas[0].outro_lado], ['SALA', 'COZINHA']);
});

caso('DWG: arquivo inválido devolve orientação clara, sem derrubar o processo', async () => {
  const { textoDxfDoArquivo, ehDwg } = require('./dwg');
  const falso = Buffer.concat([Buffer.from('AC1032'), Buffer.alloc(4000, 7)]);
  assert.ok(ehDwg(falso));
  await assert.rejects(textoDxfDoArquivo(falso, 'teste.dwg'), /AutoCAD 2018.*salve como DXF/s);
  const dxf = await textoDxfDoArquivo(Buffer.from(arquiteturaSintetica()), 'a.dxf');
  assert.strictEqual(dxf.origem, 'dxf');
  await assert.rejects(textoDxfDoArquivo(Buffer.from('qualquer coisa'), 'x.txt'), /não é um DWG nem um DXF/);
});

// Revisão de 27/10/2026, achado A2.13
caso('DXF: quebra de linha em texto/atributo não corrompe o arquivo (TEXT/ATTRIB são de uma linha)', () => {
  const d = new DesenhoDxf();
  definirSimbolos(d, ['HM-ELE-TOMADA-BAIXA']);
  d.inserir('HM-ELE-TOMADA-BAIXA', 1, 1, { layer: 'ELE-TOMADA', atributos: { ID: 'T1', CIRCUITO: 'Tomadas\nCopa\r\n2º\x0Bandar' } });
  d.texto(2, 2, 0.2, 'Linha 1\nLinha 2\ttab', { layer: '0' });
  const lin = d.toString().split(/\r?\n/);
  // pares código/valor: todo código de grupo é inteiro; antes "Copa" virava código
  for (let i = 0; i + 1 < lin.length; i += 2) assert.match(lin[i].trim(), /^-?\d+$/, `código de grupo inválido na linha ${i + 1}: "${lin[i]}"`);
  const helper = new Helper(d.toString());
  const textos = helper.parsed.entities.map(e => (e.text && typeof e.text === 'object') ? e.text.string : (e.string || e.text)).filter(Boolean);
  assert.ok(textos.includes('Tomadas / Copa / 2º andar'), `atributo: ${JSON.stringify(textos)}`);
  assert.ok(textos.includes('Linha 1 / Linha 2 tab'), `texto: ${JSON.stringify(textos)}`);
});

caso('QElectroTech: caracteres de controle no texto não quebram o XML', () => {
  const { SaxesParser } = require('saxes');
  const { gerarUnifilarMT } = require('./unifilar');
  const motor = require('../../media-tensao/scripts/lib/index.js');
  const d = motor.exemplo();
  d.obra = { ...(d.obra || {}), nome: 'SE & <Copa> "x"\x0B\x0C fim\r\nLinha 2' };
  d.cliente = { ...(d.cliente || {}), nome: "D'Ávila & Cia\x01" };
  const { xml } = gerarUnifilarMT(motor.processar(d));
  const erros = [];
  const p = new SaxesParser();
  p.on('error', e => erros.push(e.message));
  p.write(xml).close();
  assert.deepStrictEqual(erros.slice(0, 2), []);
  assert.ok(!/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(xml), 'sobrou caractere de controle');
});

caso('casamento de nomes por palavra: "WC FEM" não cai no "WC"; "SALA" não casa com "SALAO"', () => {
  const { acharAmbiente, casaNome } = require('./planta');
  const arq = { ambientes: [{ nome: 'WC' }, { nome: 'SALÃO DE FESTAS' }, { nome: 'SALA DE ESTAR' }, { nome: 'WC MASC' }] };
  assert.strictEqual(acharAmbiente(arq, 'WC FEM'), undefined, 'antes: casava com "WC"');
  assert.strictEqual(acharAmbiente(arq, 'WC Masc.').nome, 'WC MASC');
  assert.strictEqual(acharAmbiente(arq, 'Sala').nome, 'SALA DE ESTAR', 'antes podia casar com SALÃO');
  assert.strictEqual(acharAmbiente(arq, 'Sala de estar e jantar').nome, 'SALA DE ESTAR', 'skill mais específica sem palavra distintiva');
  assert.strictEqual(casaNome('Sala 2', 'SALA'), false);
  assert.strictEqual(casaNome('Consultório', 'CONSULTÓRIO 1'), true);
});

// (29/10/2026) limites do 069e6f3: etiqueta de equipamento não é nome de sala;
// layer DETALHE com parte da planta não some
function plantaQuatroSalas(rotulos, extra) {
  const g = new DesenhoDxf({ layers: [{ nome: 'PAREDE', cor: 8 }, { nome: 'TEXTO', cor: 7 }, { nome: 'CFTV', cor: 3 }, { nome: 'ARQ-DETALHE', cor: 2 }] });
  const L = (a, b, c, d) => g.linha(a, b, c, d, 'PAREDE');
  L(0, 0, 20, 0); L(20, 0, 20, 4); L(20, 4, 0, 4); L(0, 4, 0, 0); L(5, 0, 5, 4); L(10, 0, 10, 4); L(15, 0, 15, 4);
  rotulos.forEach(([x, s, layer]) => g.texto(x, 2, 0.2, s, { layer: layer || 'TEXTO' }));
  if (extra) extra(g);
  return g.toString();
}

caso('etiqueta de equipamento (CAM-04, FOG5, QD-01) acha a sala mas não vira o nome dela', () => {
  const nomes = (r) => lerArquitetura(plantaQuatroSalas(r)).ambientes.map(a => a.nome);
  assert.deepStrictEqual(nomes([[2.5, 'CAM-04', 'CFTV'], [7.5, 'FOG5'], [12.5, 'DET 3'], [17.5, 'AM-01']]), ['Ambiente 1', 'Ambiente 2', 'Ambiente 3', 'Ambiente 4']);
  assert.deepStrictEqual(nomes([[2.5, 'SALA 01'], [7.5, 'BWC 2'], [12.5, 'APTO 101'], [17.5, 'DORM. 3']]), ['APTO 101', 'BWC 2', 'DORM. 3', 'SALA 01']);
  assert.deepStrictEqual(nomes([[2.5, 'CAM-04', 'CFTV'], [7.5, 'COZINHA'], [12.5, 'QD-01'], [17.5, 'BANHEIRO']]), ['Ambiente 1', 'Ambiente 2', 'BANHEIRO', 'COZINHA']);
});

caso('layer DETALHE com parte da planta (bancada) não some; ambiente continua', () => {
  const a = lerArquitetura(plantaQuatroSalas([[2.5, 'COZINHA'], [7.5, 'SALA']], (g) => {
    g.polilinha([[0.2, 0.2], [3, 0.2], [3, 0.8], [0.2, 0.8]], { layer: 'ARQ-DETALHE', fechada: true }); // bancada
  }));
  assert.deepStrictEqual(a.ambientes.map(x => x.nome), ['COZINHA', 'SALA']);
  assert.ok(a.referencia.some(r => r.layer === 'ARQ-DETALHE'), 'a bancada da layer DETALHE saiu da referência');
});

caso('vocabulário de cômodo reconhece palavras longas (BANHEIRO, DORMITÓRIO, DEPÓSITO)', () => {
  const { RE_NOME_SALA } = require('./classificarPrancha');
  for (const t of ['BANHEIRO', 'DORMITÓRIO 1', 'DEPÓSITO', 'ALMOXARIFADO', 'CIRCULAÇÃO', 'SALA 2']) assert.ok(RE_NOME_SALA.test(t), t);
  assert.ok(!RE_NOME_SALA.test('CAM-04'));
});

// unifilar: barramento vertical com saídas identificadas, título e "sem escala"
function unifilar(g, x0, y0, k = 1) {
  g.texto(x0, y0 + 12 * k, 0.5 * k, 'DIAGRAMA UNIFILAR QD-01', { layer: 'TEXTO' });
  g.texto(x0, y0 + 11 * k, 0.3 * k, 'SEM ESCALA', { layer: 'TEXTO' });
  g.linha(x0, y0, x0, y0 + 10 * k, 'PAREDE');
  for (let i = 0; i < 10; i++) {
    g.linha(x0, y0 + i * k, x0 + 4 * k, y0 + i * k, 'PAREDE');
    g.polilinha([[x0 + 1 * k, y0 + i * k - 0.2 * k], [x0 + 1.6 * k, y0 + i * k - 0.2 * k], [x0 + 1.6 * k, y0 + i * k + 0.2 * k], [x0 + 1 * k, y0 + i * k + 0.2 * k]], { layer: 'PAREDE', fechada: true });
    g.texto(x0 + 4.2 * k, y0 + i * k, 0.2 * k, `C${i + 1} DISJ 20A 2,5mm²`, { layer: 'TEXTO' });
  }
}

caso('desenho só de unifilar/quadro: nenhum ambiente (não vira prédio no 3D)', () => {
  const g = new DesenhoDxf({ layers: [{ nome: 'PAREDE', cor: 8 }, { nome: 'TEXTO', cor: 7 }] });
  unifilar(g, 0, 0);
  const a = lerArquitetura(g.toString());
  assert.ok(a.classificacao.semPlanta, a.classificacao.resumo);
  assert.deepStrictEqual(a.ambientes, []);
});

caso('planta pequena longe do diagrama não some (grade da folha grossa demais)', () => {
  // diagrama a 2 km da planta (vistas em escalas diferentes no mesmo modelo — Arena)
  const a = lerArquitetura(plantaQuatroSalas([[2.5, 'COZINHA'], [7.5, 'SALA'], [12.5, 'QUARTO'], [17.5, 'BANHEIRO']], (g) => unifilar(g, 2000, 300, 10)));
  assert.ok(a.classificacao.temPlanta, a.classificacao.resumo);
  assert.deepStrictEqual(a.ambientes.map(x => x.nome), ['BANHEIRO', 'COZINHA', 'QUARTO', 'SALA']);
});

caso('valor com unidade, bitola e sigla solta não viram nome de sala', () => {
  // (texto que não é nome nem etiqueta não cria sala: só os nomes reais aparecem)
  const nomes = (r) => lerArquitetura(plantaQuatroSalas(r)).ambientes.map(a => a.nome).filter(n => !/^Ambiente \d+$/.test(n));
  assert.deepStrictEqual(nomes([[2.5, '70mm²'], [7.5, '24 Vdc'], [12.5, 'AAG 3"'], [17.5, 'ST']]), []);
  assert.deepStrictEqual(nomes([[2.5, 'WC'], [7.5, 'DML'], [12.5, '150Ah, 1990kg'], [17.5, 'Tomada altura: 30 cm']]), ['DML', 'WC']);
});

// ── Revisão de 29/10/2026 (M2): o que não é ambiente num desenho de instalação ──
caso('campo de visão da câmera não é sala; atributo de equipamento (TAG, DESCR, ALTURA) não é nome', () => {
  const a = lerArquitetura(plantaQuatroSalas([[2.5, 'COZINHA'], [7.5, 'SALA']], (g) => {
    g.camada('CFTV-COBERTURA'); g.camada('INC-DETECTOR');
    g.polilinha([[10.5, 0.5], [14.5, 0.5], [14.5, 3.5], [10.5, 3.5]], { layer: 'CFTV-COBERTURA', fechada: true });
    g.bloco('INC_DET', (b) => { b.addCircle({ x: 0, y: 0, z: 0 }, 0.15, { layerName: '0' }); },
      [{ tag: 'TAG', x: 0.2, y: 0.1, altura: 0.1 }, { tag: 'DESCR', x: 0.2, y: -0.1, altura: 0.1 }, { tag: 'ALTURA', x: 0.2, y: -0.3, altura: 0.1 }]);
    for (const x of [12.5, 17.5]) g.inserir('INC_DET', x, 2, { layer: 'INC-DETECTOR', atributos: { TAG: 'AP-01', DESCR: 'Detector de fumaça endereçável - nave', ALTURA: 'teto' } });
  }));
  assert.deepStrictEqual(a.ambientes.filter(x => !x.semNome).map(x => x.nome), ['COZINHA', 'SALA']);
  assert.ok(!a.ambientes.some(x => Math.abs(x.area_m2 - 12) < 0.5), 'o polígono da cobertura (12 m²) não é ambiente');
});

caso('moldura "DI-Área do detalhe" (QiBuilder) não vira sala gigante com o nome de dentro', () => {
  const a = lerArquitetura(plantaQuatroSalas([[2.5, 'COZINHA'], [7.5, 'SALA']], (g) => {
    g.camada('DI-Área do detalhe');
    g.polilinha([[-5, -5], [45, -5], [45, 30], [-5, 30]], { layer: 'DI-Área do detalhe', fechada: true });
    g.texto(30, 20, 0.2, 'LANCHONETE', { layer: 'TEXTO' });
  }));
  assert.ok(!a.ambientes.some(x => x.area_m2 > 1000), a.ambientes.map(x => `${x.nome}=${x.area_m2}`).join('; '));
  assert.ok(!a.ambientes.some(x => x.nome === 'LANCHONETE'));
});

caso('grade de módulos iguais encostados (cobertura de detector) não vira 8 salas; salas iguais com parede entre elas ficam', () => {
  const a = lerArquitetura(plantaQuatroSalas([[2.5, 'COZINHA'], [7.5, 'SALA']], (g) => {
    g.camada('A-AREA');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.polilinha([[30 + i * 6.3, j * 6.3], [36.3 + i * 6.3, j * 6.3], [36.3 + i * 6.3, 6.3 + j * 6.3], [30 + i * 6.3, 6.3 + j * 6.3]], { fechada: true });
    g.texto(33, 3, 0.2, 'AREA TECNICA', { layer: 'TEXTO' });
    g.texto(39, 3, 0.2, '6 LEITOS', { layer: 'TEXTO' });
    // 6 quartos iguais de 3 × 4 m com parede de 15 cm entre eles
    for (let i = 0; i < 6; i++) {
      g.polilinha([[i * 3.15, 10], [i * 3.15 + 3, 10], [i * 3.15 + 3, 14], [i * 3.15, 14]], { layer: 'A-AREA', fechada: true });
      g.texto(i * 3.15 + 1, 12, 0.2, `QUARTO ${i + 1}`, { layer: 'TEXTO' });
    }
  }));
  assert.ok(!a.ambientes.some(x => Math.abs(x.area_m2 - 39.69) < 0.1), a.ambientes.map(x => `${x.nome}=${x.area_m2}`).join('; '));
  assert.strictEqual(a.ambientes.filter(x => /QUARTO/.test(x.nome)).length, 6);
});

caso('nota e contagem dentro da planta não são nome de sala', () => {
  const nomes = (r) => lerArquitetura(plantaQuatroSalas(r)).ambientes.map(a => a.nome).filter(n => !/^Ambiente \d+$/.test(n));
  assert.deepStrictEqual(nomes([[2.5, '6 LEITOS'], [7.5, '(Segue p/ Sala de Rack)'], [12.5, 'RESERVA LEGAL: 20%'], [17.5, '213-QLTF-VEST']]), []);
  assert.deepStrictEqual(nomes([[2.5, '30A-30mA'], [7.5, 'PD SOB VIGA= 1,85m'], [12.5, 'TOTAL VAGAS: 7'], [17.5, 'RECEPÇÃO']]), ['RECEPÇÃO']);
});

// ── Circuitos originais dos quadros: diagrama unifilar e quadro de cargas (04/11/2026) ─────────
// Desenho SINTÉTICO no arranjo do QiBuilder: barramento no meio, saídas dos dois lados com número,
// potência e descrição na mesma linha e o disjuntor/seção logo acima; DR com a corrente acima do "DR"
caso('quadros do diagrama: unifilar (disjuntor, seção, DR, geral, título) e quadro de cargas em tabela', () => {
  const { lerQuadrosDoDiagrama, tagNaPlanta, tipoDoCircuito } = require('./quadrosDoDiagrama');
  const T = [];
  const t = (s, x, y, h = 0.2) => T.push({ s, x, y, h, layer: 'DI-Textos do diagrama' });
  T.push({ s: 'QD-01 (TÉRREO)', x: -3.5, y: 24, h: 0.25, layer: 'DI-Títulos' });
  t('3#10(10)10mm²', 10.5, 23); t('50 A', 10, 22);
  t('40 A', 11.2, 21.5); t('DR', 11.2, 21); t('30 mA', 11.9, 20.8);
  // lado direito (número à direita): 1 e 3, sob o DR do alto
  t('10 A', 12, 20.88); t('1.5', 12.5, 20.52); t('ILUM. RECEPÇÃO', 14.1, 20); t('180 W', 18.3, 20); t('1', 19.7, 20);
  t('20 A', 12, 17.32); t('2.5', 12.5, 16.96); t("TUG'S RECEPÇÃO", 14.1, 16.44); t('1200 W', 18.3, 16.44); t('3', 19.7, 16.44);
  // lado esquerdo: chuveiro com DR próprio entre a descrição e o barramento
  t('40 A', 2.6, 19.8); t('32 A', 3.9, 19.04); t('6', 3.4, 18.68); t('DR', 2.6, 18.26);
  t('2', -3.4, 18.22); t('5400 W', -2, 18.22); t('CHUVEIRO', 1.8, 18.22);
  // legenda de luminárias (número + potência + nome, sem disjuntor): não é quadro
  t('1', 40, 10); t('LUMINÁRIA LED', 41.5, 10); t('15 W', 45, 10);
  t('2', 40, 9); t('PLAFON', 41.5, 9); t('9 W', 45, 9);
  // quadro de cargas em tabela
  const c = (s, x, y) => T.push({ s, x, y, h: 0.13, layer: 'TABELA' });
  c('QUADRO DE CARGAS - QDL-2 (COZINHA)', 60, 51);
  [['CIRCUITO', 60], ['DESCRIÇÃO', 62], ['QTD', 66], ['POTÊNCIA (VA)', 68], ['DISJUNTOR', 71], ['SEÇÃO (mm²)', 73], ['FASES', 75], ['DR', 77]].forEach(([s, x]) => c(s, x, 50));
  [['1', 60.3], ['ILUM. COZINHA', 62], ['-', 66.3], ['300', 68.2], ['10 A', 71.2], ['1,5', 73.3], ['R', 75.2], ['-', 77.1]].forEach(([s, x]) => c(s, x, 49.6));
  [['2', 60.3], ['TOMADAS COZINHA', 62], ['4', 66.3], ['1.800', 68.2], ['2P-20A', 71.2], ['2,5', 73.3], ['RS', 75.2], ['30mA', 77.1]].forEach(([s, x]) => c(s, x, 49.2));
  c('TOTAL', 60, 48.8); c('2100', 68.2, 48.8);

  const qs = lerQuadrosDoDiagrama(T);
  assert.deepStrictEqual(qs.map(q => q.tag), ['QD-01', 'QDL-2'], 'o unifilar e a tabela; a legenda de luminárias não é quadro');
  const [u, tab] = qs;
  assert.strictEqual(u.descricao, 'TÉRREO');
  assert.deepStrictEqual(u.geral, { In: 50, polos: 3 }, 'geral logo abaixo do cabo do alimentador');
  assert.deepStrictEqual(u.circuitos.map(x => [x.numero, x.descricao, x.potencia_w, x.In, x.secao_mm2, x.dr]), [
    ['1', 'ILUM. RECEPÇÃO', 180, 10, 1.5, 'DR1'], ['2', 'CHUVEIRO', 5400, 32, 6, 'DR2'], ['3', "TUG'S RECEPÇÃO", 1200, 20, 2.5, 'DR1'],
  ], 'a corrente do DR (40 A acima do "DR") não vira disjuntor do chuveiro');
  assert.deepStrictEqual(u.drs.map(d => [d.tag, d.In, d.idn_ma, d.circuitos]), [['DR1', 40, 30, ['1', '3']], ['DR2', 40, null, ['2']]]);
  assert.deepStrictEqual(tab.circuitos.map(x => [x.numero, x.descricao, x.potencia_va, x.In, x.polos, x.secao_mm2, x.fases, !!x.dr]), [
    ['1', 'ILUM. COZINHA', 300, 10, null, 1.5, 1, false], ['2', 'TOMADAS COZINHA', 1800, 20, 2, 2.5, 2, true],
  ], 'colunas pelo cabeçalho (a "QTD" não desloca a potência); para no TOTAL');
  assert.strictEqual(tab.descricao, 'COZINHA');
  assert.deepStrictEqual(['ILUM. QUADRA 1', "TUG'S WC'S", 'CHUV. COMUM', 'AR-CONDICIONADO', 'BOMBA DE RECALQUE', 'RESERVA'].map(tipoDoCircuito), ['iluminacao', 'tug', 'tue', 'ar_condicionado', 'motor', 'reserva']);
  assert.strictEqual(tagNaPlanta(0, 0, [{ s: 'QDFL-7', x: 0.6, y: 0.2 }, { s: 'QGBT', x: 5, y: 0 }]), 'QDFL-7');
  assert.strictEqual(tagNaPlanta(0, 0, [{ s: 'QUADRAS 1 E 2', x: 0.5, y: 0 }]), null, '"QUADRAS 1" não é tag de quadro');
  assert.deepStrictEqual(lerQuadrosDoDiagrama([]), []);
});

// ── Revisão do motor de leitura (06/11/2026) ────────────────────────────────────────────────────
// Desenhos SINTÉTICOS em DXF cru (sem dado de cliente), cada caso falhava antes da correção.
{
  const { lerQuadrosDoDiagrama, tagNaPlanta, chaveTag } = require('./quadrosDoDiagrama');
  const { posicionarPontos } = require('./planta');
  const dxfR = (ents, { insunits = 6, blocos = [] } = {}) => ['0', 'SECTION', '2', 'HEADER', ...(insunits == null ? [] : ['9', '$INSUNITS', '70', insunits]), '0', 'ENDSEC',
    '0', 'SECTION', '2', 'BLOCKS', ...blocos.flat(), '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', ...ents.flat(), '0', 'ENDSEC', '0', 'EOF'].join('\n');
  const linhaR = (x1, y1, x2, y2, layer = 'A-PAREDE') => ['0', 'LINE', '8', layer, '10', x1, '20', y1, '30', 0, '11', x2, '21', y2, '31', 0];
  const textoR = (s, x, y, h = 0.15, layer = 'A-TEXTO', extra = []) => ['0', 'TEXT', '8', layer, '10', x, '20', y, '30', 0, '40', h, '1', s, ...extra];
  const mtextR = (s, x, y, h = 0.2) => ['0', 'MTEXT', '8', 'A-TEXTO', '10', x, '20', y, '30', 0, '40', h, '71', 5, '1', s];
  const poliR = (pts, layer = 'A-AREA', extra = []) => ['0', 'LWPOLYLINE', '8', layer, '90', pts.length, '70', 1, ...extra, ...pts.flatMap(([x, y]) => ['10', x, '20', y])];
  const ret = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const nomes = (a) => a.ambientes.map(x => `${x.nome} ${x.area_m2}`);

  caso('R-05 etiqueta em MTEXT "COZINHA\\PA = 8,50 m²" (também com códigos de formatação) não apaga o ambiente', () => {
    for (const rotulo of ['COZINHA\\PA = 8,50 m²', '{\\fArial|b1;COZINHA}\\P{\\H0.7x;A=8,50m²}']) {
      const a = lerArquitetura(dxfR([poliR(ret(0, 0, 3.4, 2.5)), mtextR(rotulo, 1.7, 1.25)]), { classificar: false });
      assert.deepStrictEqual(nomes(a), ['COZINHA 8.5'], rotulo);
    }
  });

  // sala 3,0 × 2,0 m e WC 1,2 × 2,0 m pelas PAREDES (só LINE), parede interna dupla de 15 cm
  const plantaPorLinhas = (dx = 0) => [
    linhaR(dx, 0, dx + 4.35, 0), linhaR(dx + 4.35, 0, dx + 4.35, 2), linhaR(dx + 4.35, 2, dx, 2), linhaR(dx, 2, dx, 0),
    linhaR(dx + 3.0, 0, dx + 3.0, 2), linhaR(dx + 3.15, 0, dx + 3.15, 2), textoR('SALA', dx + 1.2, 1), textoR('WC', dx + 3.6, 1),
  ];
  caso('R-06 outra prancha a 1,3 km no mesmo desenho não engrossa a grade: as salas pelas paredes não encolhem nem somem', () => {
    const so = lerArquitetura(dxfR(plantaPorLinhas()), { classificar: false });
    const longe = lerArquitetura(dxfR([...plantaPorLinhas(), linhaR(1300, 600, 1310, 600), linhaR(1310, 600, 1310, 610)]), { classificar: false });
    assert.deepStrictEqual(nomes(longe), nomes(so));
    assert.deepStrictEqual(nomes(so), ['SALA 5.98', 'WC 2.38']);
    // corredor de 0,90 m com a prancha a 1,5 km: antes sumia
    const corredor = [linhaR(0, 0, 6, 0), linhaR(6, 0, 6, 0.9), linhaR(6, 0.9, 0, 0.9), linhaR(0, 0.9, 0, 0), textoR('CORREDOR', 2, 0.4)];
    assert.deepStrictEqual(nomes(lerArquitetura(dxfR([...corredor, linhaR(1500, 750, 1505, 750)]), { classificar: false })), ['CORREDOR 5.38']);
  });

  caso('R-07 DWG em mm sem $INSUNITS, só LINE e sem porta é lido em mm; em metros nas coordenadas UTM continua metro', () => {
    const mm = [linhaR(0, 0, 5000, 0), linhaR(5000, 0, 5000, 4000), linhaR(5000, 4000, 0, 4000), linhaR(0, 4000, 0, 0),
      linhaR(5000, 0, 9000, 0), linhaR(9000, 0, 9000, 4000), linhaR(9000, 4000, 5000, 4000), textoR('SALA', 2000, 2000, 200), textoR('COZINHA', 7000, 2000, 200)];
    const a = lerArquitetura(dxfR(mm, { insunits: null }));
    assert.strictEqual(a.fatorUnidade, 0.001);
    assert.deepStrictEqual(nomes(a), ['COZINHA 15.98', 'SALA 19.98']);
    const X = 500000, Y = 7000000; // UTM em metros: a coordenada passa de 2000, a largura não
    const utm = [linhaR(X, Y, X + 5, Y), linhaR(X + 5, Y, X + 5, Y + 4), linhaR(X + 5, Y + 4, X, Y + 4), linhaR(X, Y + 4, X, Y), textoR('SALA', X + 2, Y + 2, 0.2),
      poliR(ret(X + 10, Y, X + 13, Y + 3), 'A-AREA'), textoR('DEPOSITO', X + 11, Y + 1.5, 0.2)];
    const b = lerArquitetura(dxfR(utm, { insunits: null }));
    assert.strictEqual(b.fatorUnidade, 1);
    assert.deepStrictEqual(nomes(b), ['DEPOSITO 9', 'SALA 19.98']);
  });

  caso('R-17 contorno do prédio em polilinha com divisória em LINE: um ambiente por nome (não um só com a área do prédio)', () => {
    const contorno = [poliR(ret(0, 0, 9, 4), 'A-PAREDE'), linhaR(5, 0, 5, 4), textoR('SALA', 2, 2, 0.2), textoR('COZINHA', 7, 2, 0.2)];
    assert.deepStrictEqual(nomes(lerArquitetura(dxfR(contorno), { classificar: false })), ['COZINHA 15.98', 'SALA 19.98']);
    // sem a divisória (ambiente integrado com dois nomes): o polígono continua sendo a sala
    const integrado = [poliR(ret(0, 0, 9, 4), 'A-PAREDE'), textoR('ESTAR', 2, 2, 0.25), textoR('JANTAR', 7, 2, 0.2)];
    assert.deepStrictEqual(nomes(lerArquitetura(dxfR(integrado), { classificar: false })), ['ESTAR 36']);
  });

  caso('R-18 polilinha e TEXT com normal −Z (espelhados) caem do lado certo do eixo', () => {
    const Z = ['210', 0, '220', 0, '230', -1];
    // a sala de x = −5 a −1 desenhada espelhada (OCS x de 1 a 5); o nome em MTEXT (já no sistema do desenho)
    const a = lerArquitetura(dxfR([poliR(ret(1, 0, 5, 3), 'A-AREA', Z), mtextR('SALA', -3, 1.5)]), { classificar: false });
    assert.deepStrictEqual(nomes(a), ['SALA 12']);
    assert.ok(a.ambientes[0].poligono.every(([x]) => x <= -1 + 1e-9), 'polígono em x negativo');
    // o TEXT espelhado (OCS x = 3) dentro da sala desenhada normalmente em x de −5 a −1
    const b = lerArquitetura(dxfR([poliR(ret(-5, 0, -1, 3)), textoR('COPA', 3, 1.5, 0.2, 'A-TEXTO', Z)]), { classificar: false });
    assert.deepStrictEqual(nomes(b), ['COPA 12']);
  });

  // unifilar do teste acima (QiBuilder), com moldura, para a leitura pelo lerArquitetura
  const unifilarR = (titulo = 'QD-01 (TÉRREO)', layer = 'DI-TEXTOS') => {
    const T = [];
    const t = (s, x, y, h = 0.2) => T.push(textoR(s, x, y, h, layer));
    t(titulo, -3.5, 24, 0.25); t('3#10(10)10mm²', 10.5, 23); t('50 A', 10, 22); t('40 A', 11.2, 21.5); t('DR', 11.2, 21); t('30 mA', 11.9, 20.8);
    t('10 A', 12, 20.88); t('1.5', 12.5, 20.52); t('ILUM. RECEPÇÃO', 14.1, 20); t('180 W', 18.3, 20); t('1', 19.7, 20);
    t('20 A', 12, 17.32); t('2.5', 12.5, 16.96); t("TUG'S RECEPÇÃO", 14.1, 16.44); t('1200 W', 18.3, 16.44); t('3', 19.7, 16.44);
    t('40 A', 2.6, 19.8); t('32 A', 3.9, 19.04); t('6', 3.4, 18.68); t('DR', 2.6, 18.26); t('2', -3.4, 18.22); t('5400 W', -2, 18.22); t('CHUVEIRO', 1.8, 18.22);
    const L = (x1, y1, x2, y2, l) => linhaR(x1, y1, x2, y2, l);
    const tracos = [L(11, 15, 11, 23, 'DI-BARRA'), L(11, 20.1, 20, 20.1, 'DI-CIRC'), L(11, 16.54, 20, 16.54, 'DI-CIRC'), L(4, 18.4, 11, 18.4, 'DI-CIRC'),
      L(-4, 25, 21, 25, 'DI-MOLD'), L(-4, 14, 21, 14, 'DI-MOLD'), L(-4, 14, -4, 25, 'DI-MOLD'), L(21, 14, 21, 25, 'DI-MOLD')];
    return { T, tracos };
  };
  const resumoQ = (qs) => qs.map(q => `${q.tag}: ${q.circuitos.map(c => `${c.numero}(${c.In}A,${c.potencia_w ?? c.potencia_va})`).join(' ')}`);

  caso('R-14 título dentro da moldura do diagrama (1,1 m abaixo do topo) é achado', () => {
    const { T, tracos } = unifilarR();
    const a = lerArquitetura(dxfR([...T, ...tracos]));
    assert.ok(a.classificacao.regioes.some(r => r.tipo === 'diagrama'), 'a moldura é a região do diagrama');
    assert.deepStrictEqual(a.quadrosDoDiagrama.map(q => q.tag), ['QD-01']);
  });

  caso('R-15 unifilar inserido como bloco "DIAGRAMA UNIFILAR QD-01": os textos vão para o leitor dos quadros (e não viram sala)', () => {
    const { T, tracos } = unifilarR('QD-01 (TÉRREO)', '0');
    const nome = 'DIAGRAMA UNIFILAR QD-01';
    const bloco = ['0', 'BLOCK', '8', '0', '2', nome, '70', 0, '10', 0, '20', 0, '30', 0, '3', nome, '1', '', ...T.flat(), ...tracos.flat(), '0', 'ENDBLK', '8', '0'];
    const a = lerArquitetura(dxfR([['0', 'INSERT', '8', 'DI-DIAGRAMA', '2', nome, '10', 0, '20', 0, '30', 0], linhaR(0, 0, 1, 0, 'X')], { blocos: [bloco] }));
    assert.deepStrictEqual(resumoQ(a.quadrosDoDiagrama), ['QD-01: 1(10A,180) 2(32A,5400) 3(20A,1200)']);
    assert.deepStrictEqual(a.ambientes, []);
  });

  caso('R-12 disjuntor "1x20A", "C20" e potência "1.2 kW" no unifilar; diagrama não lido deixa aviso', () => {
    const base = (dj, pot = (w) => w) => {
      const T = [];
      const t = (s, x, y, h = 0.2) => T.push({ s, x, y, h, layer: 'DI' });
      T.push({ s: 'QD-01 (TÉRREO)', x: -3.5, y: 24, h: 0.25, layer: 'DI-Títulos' });
      t('3#10(10)10mm²', 10.5, 23); t(dj(50), 10, 22); t('40 A', 11.2, 21.5); t('DR', 11.2, 21);
      t(dj(10), 12, 20.88); t('1.5', 12.5, 20.52); t('ILUM. RECEPÇÃO', 14.1, 20); t(pot('180 W'), 18.3, 20); t('1', 19.7, 20);
      t(dj(20), 12, 17.32); t('2.5', 12.5, 16.96); t("TUG'S RECEPÇÃO", 14.1, 16.44); t(pot('1200 W'), 18.3, 16.44); t('3', 19.7, 16.44);
      t('40 A', 2.6, 19.8); t(dj(32), 3.9, 19.04); t('6', 3.4, 18.68); t('DR', 2.6, 18.26); t('2', -3.4, 18.22); t(pot('5400 W'), -2, 18.22); t('CHUVEIRO', 1.8, 18.22);
      return T;
    };
    const esperado = ['QD-01: 1(10A,180) 2(32A,5400) 3(20A,1200)'];
    assert.deepStrictEqual(resumoQ(lerQuadrosDoDiagrama(base((a) => `1x${a}A`))), esperado);
    assert.deepStrictEqual(resumoQ(lerQuadrosDoDiagrama(base((a) => `C${a}`))), esperado);
    const kw = { '1200 W': '1.2 kW', '5400 W': '5.4 kW' };
    assert.deepStrictEqual(resumoQ(lerQuadrosDoDiagrama(base((a) => `${a} A`, (w) => kw[w] || w))), esperado);
    assert.deepStrictEqual(lerQuadrosDoDiagrama(base((a) => `3x${a}A`))[0].circuitos.map(c => c.polos), [3, 3, 3]);
    // o diagrama que não dá para ler (potência sem unidade): aviso, não silêncio
    const { T, tracos } = unifilarR('DIAGRAMA UNIFILAR - QD-01');
    const ilegivel = T.map(e => e.map(v => (/^\d+ W$/.test(v) ? v.replace(' W', '') : v)));
    const a = lerArquitetura(dxfR([...ilegivel, ...tracos]));
    assert.deepStrictEqual(a.quadrosDoDiagrama, []);
    assert.match(a.avisosDiagrama.join(' '), /sem circuitos lidos.*\[CONFERIR\]/);
    assert.deepStrictEqual(lerArquitetura(dxfR([...T, ...tracos])).avisosDiagrama, []);
  });

  caso('R-10/R-11 tags QGBT-A × QGBT-B, CCM-BOMBAS, "QD 01"; QD01 = QD-01 = QD1; número "01" do diagrama vira "1"', () => {
    const umQuadro = (titulo, dx) => {
      const T = [];
      const t = (s, x, y) => T.push({ s, x: x + dx, y, h: 0.2, layer: 'DI' });
      T.push({ s: titulo, x: -3.5 + dx, y: 24, h: 0.25, layer: 'DI-Títulos' });
      t('3#10(10)10mm²', 10.5, 23); t('50 A', 10, 22);
      t('10 A', 12, 20.88); t('ILUM. RECEPÇÃO', 14.1, 20); t('180 W', 18.3, 20); t('1', 19.7, 20);
      t('20 A', 12, 17.32); t("TUG'S RECEPÇÃO", 14.1, 16.44); t('1200 W', 18.3, 16.44); t('3', 19.7, 16.44);
      t('32 A', 3.9, 19.04); t('2', -3.4, 18.22); t('5400 W', -2, 18.22); t('CHUVEIRO', 1.8, 18.22);
      return T;
    };
    assert.deepStrictEqual(lerQuadrosDoDiagrama([...umQuadro('QGBT-A', 0), ...umQuadro('QGBT-B', 200)]).map(q => `${q.tag} ${q.circuitos.length}`), ['QGBT-A 3', 'QGBT-B 3']);
    const tag = (s) => tagNaPlanta(0, 0, [{ s, x: 0, y: 0 }]);
    assert.deepStrictEqual(['QGBT - TÉRREO', 'CCM-BOMBAS', 'QD 01', 'QGBT-TÉRREO', 'QTD 2', 'QUARTO 1'].map(tag), ['QGBT', 'CCM-BOMBAS', 'QD01', 'QGBT', null, null]);
    assert.deepStrictEqual(new Set(['QD01', 'QD-01', 'QD1', 'QD 01', 'qd.01'].map(chaveTag)).size, 1);
    assert.notStrictEqual(chaveTag('QGBT-A'), chaveTag('QGBT-B'));
    // tabela numerada 01, 02: o mesmo quadro do unifilar "QD-01" escrito "QD01" na tabela se junta a ele
    const T = umQuadro('QD-01 (TÉRREO)', 0);
    const c = (s, x, y) => T.push({ s, x, y, h: 0.13, layer: 'TABELA' });
    c('QUADRO DE CARGAS - QD01', 60, 51);
    [['CIRCUITO', 60], ['DESCRIÇÃO', 62], ['POTÊNCIA (VA)', 68], ['DISJUNTOR', 71]].forEach(([s, x]) => c(s, x, 50));
    [['04', 60.3], ['ILUM. COZINHA', 62], ['300', 68.2], ['10 A', 71.2]].forEach(([s, x]) => c(s, x, 49.6));
    [['01', 60.3], ['ILUM. RECEPÇÃO', 62], ['180', 68.2], ['10 A', 71.2]].forEach(([s, x]) => c(s, x, 49.2));
    const qs = lerQuadrosDoDiagrama(T);
    assert.deepStrictEqual(qs.map(q => [q.tag, q.origem, q.circuitos.map(x => x.numero).join(',')]), [['QD-01', 'unifilar+tabela', '1,2,3,4']]);
  });

  caso('R-13 quadro de cargas com cabeçalho CENTRALIZADO e valor alinhado à esquerda da célula', () => {
    const H = [];
    const h = (s, x, y) => H.push({ s, x, y, h: 0.13, layer: 'TABELA' });
    h('QUADRO DE CARGAS - QD-02', 60, 51);
    // colunas: CIRC 60–61, DESCRIÇÃO 61–66 (centro 63,5), POTÊNCIA 66–69 (centro 67,5), DISJUNTOR 69–71 (centro 70)
    [['CIRC.', 60.5], ['DESCRIÇÃO', 63.5], ['POTÊNCIA (VA)', 67.5], ['DISJUNTOR', 70]].forEach(([s, x]) => h(s, x, 50));
    [['1', 60.1], ['ILUM. COZINHA', 61.1], ['300', 66.1], ['10 A', 69.1]].forEach(([s, x]) => h(s, x, 49.6));
    [['2', 60.1], ['TOMADAS COZINHA', 61.1], ['1800', 66.1], ['20 A', 69.1]].forEach(([s, x]) => h(s, x, 49.2));
    assert.deepStrictEqual(lerQuadrosDoDiagrama(H).map(q => [q.tag, q.circuitos.map(c => [c.numero, c.descricao, c.potencia_va, c.In])]),
      [['QD-02', [['1', 'ILUM. COZINHA', 300, 10], ['2', 'TOMADAS COZINHA', 1800, 20]]]]);
  });

  caso('R-09 planta da skill: dois ambientes "BANHEIRO" — os pontos do 2º vão para o 2º, não para o 1º', () => {
    const arq = { ambientes: [{ nome: 'BANHEIRO', poligono: ret(0, 0, 2, 2), area_m2: 4 }, { nome: 'BANHEIRO', poligono: ret(10, 0, 14, 3), area_m2: 12 }], portas: [] };
    const lum = { simbolo: 'HM-ILU-LUMINARIA', n: 1, regra: 'centro', prefixo: 'L' };
    const out = posicionarPontos(arq, [{ ambiente: 'BANHEIRO', itens: [lum] }, { ambiente: 'BANHEIRO', itens: [lum] }]);
    assert.deepStrictEqual(out.posicoes.map(p => [p.id, p.x, p.y]), [['L1', 1, 1], ['L2', 12, 1.5]]);
    // grupos com símbolos diferentes para o mesmo ambiente (terminal e porteiro) continuam juntos no 1º
    const tel = posicionarPontos(arq, [{ ambiente: 'BANHEIRO', itens: [{ ...lum, simbolo: 'HM-TEL-PONTO' }] }, { ambiente: 'BANHEIRO', itens: [{ ...lum, simbolo: 'HM-TEL-PORTEIRO', prefixo: 'P' }] }]);
    assert.deepStrictEqual(tel.posicoes.map(p => [p.x, p.y]), [[1, 1], [1, 1]]);
  });
}

// casos assíncronos (DWG) terminam depois dos síncronos
process.on('beforeExit', () => { if (!process.__fimCad) { process.__fimCad = true; console.log(`cad: ${ok} casos ok`); } });

// ── SK-01: grade nx × ny em sala que não é retangular ──────────────────────
// Sala em L de 64 m² (8 × 8 sem o quadrado 4 × 4 de um canto) com a grade 4 × 4
// da skill de iluminação: 4 centros caem no recorte. Antes saíam 12 luminárias
// sem aviso; agora as 4 que faltam vão para dentro do L e a planta/3D batem
// com o memorial (16). Se nem assim couber, sai um aviso "N de M".
{
  const { posicionarPontos } = require('./planta');
  const { dentro: dentroL } = require('./arquitetura');
  const salaL = [[0, 0], [8, 0], [8, 4], [4, 4], [4, 8], [0, 8]];
  const arqL = { ambientes: [{ nome: 'SALA EM L', poligono: salaL }], portas: [] };
  const lum = (n) => [{ ambiente: 'SALA EM L', itens: [{ simbolo: 'HM-ILU-LUMINARIA', n, regra: 'grade_nxny', nx: 4, ny: 4, prefixo: 'L' }] }];

  caso('SK-01 grade 4 × 4 em sala em L: as 16 luminárias ficam dentro do L, sem repetir posição e sem aviso', () => {
    const out = posicionarPontos(arqL, lum(16));
    assert.strictEqual(out.posicoes.length, 16, `posicionadas ${out.posicoes.length}`);
    assert.deepStrictEqual(out.avisos, []);
    for (const p of out.posicoes) assert.ok(dentroL([p.x, p.y], salaL), `fora do L: ${p.x},${p.y}`);
    let menor = Infinity;
    out.posicoes.forEach((a, i) => out.posicoes.slice(i + 1).forEach(b => { menor = Math.min(menor, Math.hypot(a.x - b.x, a.y - b.y)); }));
    assert.ok(menor >= 0.9, `luminárias amontoadas (menor distância ${menor.toFixed(2)} m)`);
    // os 12 centros da grade original continuam onde estavam
    assert.strictEqual(out.posicoes.filter(p => [1, 3, 5, 7].includes(p.x) && [1, 3, 5, 7].includes(p.y)).length, 12);
  });

  caso('SK-01 sala retangular continua com a grade exata (nada redistribuído)', () => {
    const ret = { ambientes: [{ nome: 'SALA EM L', poligono: [[0, 0], [8, 0], [8, 8], [0, 8]] }], portas: [] };
    const out = posicionarPontos(ret, lum(16));
    assert.deepStrictEqual(out.posicoes.map(p => [p.x, p.y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]),
      [1, 3, 5, 7].flatMap(x => [1, 3, 5, 7].map(y => [x, y])));
    assert.deepStrictEqual(out.avisos, []);
  });

  caso('SK-01 quando a regra põe menos pontos que o pedido, sai o aviso "N de M"', () => {
    const out = posicionarPontos(arqL, lum(20));   // a skill pediu 20, a grade 4 × 4 só tem 16
    assert.strictEqual(out.posicoes.length, 16);
    assert.strictEqual(out.avisos.length, 1);
    assert.match(out.avisos[0], /SALA EM L: 4 de 20 .*fora da planta/);
  });
}
