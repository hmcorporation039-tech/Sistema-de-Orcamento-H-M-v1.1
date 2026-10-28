// Versão 2.3 — compatibilização por posição entre DWG/DXF (utils/compatibilidadeEspacial.js)
// e pacote de arquivos (services/pacotesProjeto.js + utils/classificarArquivoProjeto.js).
// Cenário SINTÉTICO (nenhum dado de cliente). Sem banco.
// Rodar: npm test (pasta backend).
const assert = require('assert');
const JSZip = require('jszip');
const { compatibilizar, alinhar } = require('../src/utils/compatibilidadeEspacial');
const { sugerirDisciplinas } = require('../src/utils/classificarArquivoProjeto');
const Pacotes = require('../src/services/pacotesProjeto');

let ok = 0;
const caso = async (nome, fn) => { await fn(); ok++; };

// 4 salas 5 × 4 m lado a lado (polilinha de área), deslocáveis
const ret = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
function salas(dx = 0, dy = 0, areas = {}) {
  return ['RECEPCAO', 'SALA 1', 'SALA 2', 'COPA'].map((nome, i) => {
    const larg = areas[nome] ? areas[nome] / 4 : 5;
    return { nome, area_m2: larg * 4, poligono: ret(i * 6 + dx, dy, i * 6 + larg + dx, 4 + dy), origem: 'polilinha' };
  });
}
const pt = (x, y, descricao, disciplina, classe) => ({ x, y, descricao, disciplina, classe });

(async () => {
  const D = { dx: 100, dy: 50 }; // o desenho de incêndio veio com outra origem
  const arq = { arquivo: 'ARQ.dwg', disciplinas: [], referencia: true, tipoReferencia: 'arquitetura', espacial: { ambientes: salas(), pontos: [], trechos: [] } };
  const ilu = { arquivo: 'ILU.dwg', disciplinas: ['iluminacao'], espacial: { ambientes: salas(), pontos: [pt(2, 2, 'Luminária — bloco L1', 'iluminacao', 'luminaria'), pt(8, 2, 'Luminária — bloco L1', 'iluminacao', 'luminaria'), pt(14, 2, 'Luminária — bloco L1', 'iluminacao', 'luminaria')], trechos: [] } };
  const inc = { arquivo: 'INC.dwg', disciplinas: ['incendio'], espacial: {
    ambientes: salas(D.dx, D.dy),
    // detector a 0,3 m da luminária da RECEPCAO; outro a 2 m de tudo; outro a 1 m do difusor da SALA 2
    pontos: [pt(2.3 + D.dx, 2 + D.dy, 'Detector de incêndio', 'incendio', 'detector'), pt(9.5 + D.dx, 3.5 + D.dy, 'Detector de incêndio', 'incendio', 'detector'), pt(16 + D.dx, 1 + D.dy, 'Detector de incêndio', 'incendio', 'detector')],
    trechos: [] } };
  const ac = { arquivo: 'AC.dwg', disciplinas: [], referencia: true, tipoReferencia: 'climatizacao', espacial: { ambientes: salas(), pontos: [pt(16, 2, 'Difusor linear', null, 'difusor')], trechos: [] } };
  const ele = { arquivo: 'ELE.dwg', disciplinas: ['eletrica'], espacial: { ambientes: salas(), pontos: [pt(20, 0.3, 'Tomada baixa 2P+T', 'eletrica', 'outro')],
    trechos: [{ layer: 'ELETROCALHA', disciplina: null, segmentos: [[0, 3.8, 22, 3.8]] }] } };
  const log = { arquivo: 'LOG.dwg', disciplinas: ['cabeamento'], espacial: { ambientes: salas(), pontos: [pt(20.1, 0.3, 'Ponto de rede', 'cabeamento', 'outro')],
    trechos: [{ layer: 'INFRA LOGICA', disciplina: null, segmentos: [[3, 3.9, 12, 3.9]] }] } };
  const outroPav = { arquivo: 'ELE-2PAV.dwg', disciplinas: ['eletrica'], espacial: { ambientes: [{ nome: 'AUDITORIO', area_m2: 80, poligono: ret(0, 0, 10, 8), origem: 'polilinha' }], pontos: [pt(1, 1, 'Tomada', 'eletrica', 'outro')], trechos: [] } };

  await caso('alinhamento por votação: o desenho deslocado volta para a origem da arquitetura', async () => {
    const al = alinhar(arq, inc);
    assert.ok(al && Math.abs(al.dx + 100) < 0.01 && Math.abs(al.dy + 50) < 0.01, JSON.stringify(al));
    assert.strictEqual(al.casados, 4);
  });

  const r = compatibilizar([arq, ilu, inc, ac, ele, log, outroPav], { temPdf: true });
  const temas = (t) => r.conflitos.filter(c => c.tema === t);

  await caso('referência é a arquitetura enviada como referência', async () => {
    assert.strictEqual(r.referencia, 'ARQ.dwg');
  });

  await caso('detector a 0,3 m de luminária (critério 0,5 m) — o de 2 m não', async () => {
    const c = temas('Detector de incêndio junto de luminária');
    assert.strictEqual(c.length, 1);
    assert.strictEqual(c[0].distancia, 0.3);
    assert.strictEqual(c[0].ambiente, 'RECEPCAO');
    assert.strictEqual(c[0].a.arquivo, 'INC.dwg');
    assert.strictEqual(c[0].b.arquivo, 'ILU.dwg');
  });

  await caso('detector a 1 m do difusor da climatização (critério 1,5 m)', async () => {
    const c = temas('Detector de incêndio junto de saída de ar');
    assert.strictEqual(c.length, 1);
    assert.strictEqual(c[0].ambiente, 'SALA 2');
    assert.strictEqual(c[0].b.disciplina, null);
  });

  await caso('tomada e ponto de rede no mesmo ponto (10 cm)', async () => {
    const c = temas('Componentes de disciplinas diferentes no mesmo ponto');
    assert.strictEqual(c.length, 1);
    assert.deepStrictEqual([c[0].a.disciplina, c[0].b.disciplina].sort(), ['cabeamento', 'eletrica']);
  });

  await caso('eletrocalha e infraestrutura de lógica no mesmo caminho (9 m a 10 cm)', async () => {
    const c = temas('Energia e telecomunicações no mesmo caminho');
    assert.ok(c.length >= 1);
    assert.ok(Math.abs(c[0].metros - 9) < 0.1, String(c[0].metros));
    assert.ok(r.achados.some(a => a.tema === 'Energia e telecomunicações no mesmo caminho' && /NBR 14565/.test(a.observacao)));
  });

  await caso('achados: deslocamento corrigido, pavimento sem verificação, aviso dos PDFs', async () => {
    assert.ok(r.achados.some(a => a.tema === 'Desenho deslocado em relação à arquitetura' && /"INC\.dwg"/.test(a.observacao)));
    assert.ok(r.achados.some(a => a.tema === 'Desenhos sem verificação de posição' && /ELE-2PAV/.test(a.observacao)));
    assert.ok(r.achados.some(a => a.tema === 'Compatibilização por posição só entre DWG/DXF'));
    assert.ok(r.achados.some(a => a.tema === 'Compatibilização: Detector de incêndio junto de luminária' && /Critério: afastamento mínimo adotado de 0,5 m/.test(a.observacao)));
  });

  await caso('arquitetura de outra revisão: 3 salas com área diferente', async () => {
    // depósitos ampliados em torno do mesmo centro (a revisão nova mudou só eles)
    const deps = (meio) => ['DEP 1', 'DEP 2', 'DEP 3'].map((nome, i) => ({ nome, area_m2: 4 * meio * meio, poligono: ret(40 + i * 10 - meio, 10 - meio, 40 + i * 10 + meio, 10 + meio), origem: 'polilinha' }));
    const arq2 = { ...arq, espacial: { ...arq.espacial, ambientes: [...salas(), ...deps(1.5)] } };
    const rev = { arquivo: 'CFTV.dwg', disciplinas: ['cftv'], espacial: { ambientes: [...salas(), ...deps(2)], pontos: [], trechos: [] } };
    const r2 = compatibilizar([arq2, rev]);
    assert.ok(r2.achados.some(a => a.tema === 'Arquitetura de revisões diferentes'), JSON.stringify(r2.achados));
    // mesma arquitetura: sem o aviso
    assert.ok(!compatibilizar([arq, ilu]).achados.some(a => a.tema === 'Arquitetura de revisões diferentes'));
  });

  await caso('sugestão de disciplina pelo nome do arquivo', async () => {
    assert.deepStrictEqual(sugerirDisciplinas('PRJ-ELE-01 Térreo.dwg').disciplinas, ['eletrica']);
    assert.deepStrictEqual(sugerirDisciplinas('2025-E.01-3P-R02.dwg').disciplinas, ['eletrica']);
    assert.deepStrictEqual(sugerirDisciplinas('LOG-CFTV-02.pdf').disciplinas.sort(), ['cabeamento', 'cftv']);
    const a = sugerirDisciplinas('PRJ-PE-ARQ-003.dwg');
    assert.strictEqual(a.referencia, true);
    assert.strictEqual(a.tipoReferencia, 'arquitetura');
    assert.strictEqual(sugerirDisciplinas('X-M.01-HVAC.dwg').tipoReferencia, 'climatizacao');
    assert.deepStrictEqual(sugerirDisciplinas('Memorial.pdf', 'QUADRO DE CARGAS ... DISJUNTOR ... CIRCUITO ... TOMADA').disciplinas, ['eletrica']);
    assert.deepStrictEqual(sugerirDisciplinas('ELEVADOR.pdf').disciplinas, []);
  });

  await caso('pacote: ZIP com pastas, ZIP dentro de ZIP, lixo e formatos ignorados', async () => {
    const dentro = new JSZip();
    dentro.file('CFTV/CFTV-01.dxf', '  0\nSECTION\n  2\nENTITIES\n  0\nENDSEC\n  0\nEOF\n');
    const zip = new JSZip();
    zip.file('Projeto/ELE/ELE-01.dxf', '  0\nSECTION\n  2\nENTITIES\n  0\nENDSEC\n  0\nEOF\n');
    zip.file('Projeto/ARQ/ARQ-01.dwg', Buffer.from('AC1027' + '\u0000'.repeat(20), 'latin1'));
    zip.file('Projeto/Planilha.xlsx', 'x');
    zip.file('__MACOSX/._ELE-01.dxf', 'x');
    zip.file('Projeto/ELE/ELE-01.bak', 'x');
    zip.file('Projeto/sub.zip', await dentro.generateAsync({ type: 'nodebuffer' }));
    const usuario = { id: 999001, role: 'usuario' };
    const p = await Pacotes.receberPacote([{ originalname: 'pacote.zip', buffer: await zip.generateAsync({ type: 'nodebuffer' }) }], usuario);
    assert.match(p.token, /^[0-9a-f]{40}$/);
    const porNome = Object.fromEntries(p.arquivos.map(a => [a.nome, a]));
    assert.deepStrictEqual(Object.keys(porNome).sort(), ['ARQ-01.dwg', 'CFTV-01.dxf', 'ELE-01.dxf']);
    assert.deepStrictEqual(porNome['ELE-01.dxf'].sugestao.disciplinas, ['eletrica']);
    assert.strictEqual(porNome['ARQ-01.dwg'].sugestao.referencia, true);
    assert.deepStrictEqual(porNome['CFTV-01.dxf'].sugestao.disciplinas, ['cftv']);
    assert.match(porNome['CFTV-01.dxf'].caminho, /sub\.zip\/CFTV\/CFTV-01\.dxf$/);
    assert.deepStrictEqual(p.ignorados.map(i => i.nome), ['pacote.zip/Projeto/Planilha.xlsx']);
    // só o dono (ou admin) usa o pacote
    assert.throws(() => Pacotes.arquivosDoPacote(p.token, { id: 5, role: 'usuario' }, []), (e) => e.status === 403);
    const escolhidos = Pacotes.arquivosDoPacote(p.token, usuario, [{ id: porNome['ELE-01.dxf'].id, disciplinas: ['eletrica'] }, { id: porNome['ARQ-01.dwg'].id, referencia: true }]);
    assert.strictEqual(escolhidos.length, 2);
    assert.strictEqual(escolhidos[1].referencia, true);
    assert.strictEqual(escolhidos[1].tipoReferencia, 'arquitetura');
    assert.ok(Buffer.isBuffer(escolhidos[0].buffer));
    Pacotes.descartarPacote(p.token, usuario);
    assert.throws(() => Pacotes.arquivosDoPacote(p.token, usuario, []), (e) => e.status === 404);
    assert.throws(() => Pacotes.manifesto('../../etc', usuario), (e) => e.status === 404);
  });

  await caso('pacote sem nenhum PDF/DWG/DXF: erro claro', async () => {
    await assert.rejects(Pacotes.receberPacote([{ originalname: 'foto.jpg', buffer: Buffer.from('x') }], { id: 1 }), /Nenhum PDF, DWG ou DXF/);
  });

  console.log(`compatibilidadeEspacial + pacote: ${ok} casos ok`);
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
