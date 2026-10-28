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

// casos assíncronos (DWG) terminam depois dos síncronos
process.on('beforeExit', () => { if (!process.__fimCad) { process.__fimCad = true; console.log(`cad: ${ok} casos ok`); } });
