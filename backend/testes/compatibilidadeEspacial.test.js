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

  // ── Robustez (revisão de segurança 2.3) ──────────────────────────────────
  const { conflitosDeTracado } = require('../src/utils/compatibilidadeEspacial');
  const tr = (arquivo, layer, disciplina, segmentos) => ({ arquivo, layer, disciplina, segmentos });

  await caso('diagonal de 20 km: ignorada com aviso e em menos de 1 s (antes: varria a caixa inteira)', async () => {
    const t0 = Date.now();
    const r20 = conflitosDeTracado([
      tr('ELE.dwg', 'ELETROCALHA', 'eletrica', [[0, 0, 14142, 14142]]),
      tr('LOG.dwg', 'INFRA LOGICA', 'cabeamento', [[0, 0.1, 14142, 14142.1], [3, 3.9, 12, 3.9]]),
    ], []);
    assert.ok(Date.now() - t0 < 1000, `${Date.now() - t0} ms`);
    assert.strictEqual(r20.longos.length, 2);
    assert.strictEqual(r20.conflitos.length, 0);
    // e no compatibilizar vira achado
    const amb = salas();
    const rc = compatibilizar([
      { arquivo: 'ELE.dwg', disciplinas: ['eletrica'], espacial: { ambientes: amb, pontos: [], trechos: [{ layer: 'ELETROCALHA', segmentos: [[0, 0, 14142, 14142]] }] } },
      { arquivo: 'LOG.dwg', disciplinas: ['cabeamento'], espacial: { ambientes: amb, pontos: [], trechos: [{ layer: 'INFRA LOGICA', segmentos: [[0, 0.1, 14142, 14142.1]] }] } },
    ]);
    assert.ok(Date.now() - t0 < 1000, `${Date.now() - t0} ms`);
    assert.ok(rc.achados.some(a => a.tema === 'Traçados longos demais ignorados na compatibilização' && /ELETROCALHA/.test(a.observacao)), JSON.stringify(rc.achados));
  });

  await caso('diagonal de 990 m paralela a 10 cm: sobreposição medida e rápida', async () => {
    const t0 = Date.now();
    const L = 700; // 990 m de diagonal
    const r = conflitosDeTracado([
      tr('ELE.dwg', 'ELETROCALHA', 'eletrica', [[0, 0, L, L]]),
      tr('LOG.dwg', 'INFRA LOGICA', 'cabeamento', [[0, 0.1, L, L + 0.1]]),
    ], []);
    assert.ok(Date.now() - t0 < 1000, `${Date.now() - t0} ms`);
    assert.strictEqual(r.resumo.length, 1);
    assert.ok(Math.abs(r.resumo[0].metros - L * Math.SQRT2) < 1, String(r.resumo[0].metros));
    // a 1,5 m de distância não é o mesmo caminho
    const longe = conflitosDeTracado([
      tr('ELE.dwg', 'ELETROCALHA', 'eletrica', [[0, 0, L, L]]),
      tr('LOG.dwg', 'INFRA LOGICA', 'cabeamento', [[0, 1.5, L, L + 1.5]]),
    ], []);
    assert.strictEqual(longe.resumo.length, 0);
  });

  const zipCom = async (arquivos) => {
    const z = new JSZip();
    for (const [nome, conteudo] of arquivos) z.file(nome, conteudo);
    return z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 1 } });
  };
  const DXF_MIN = '  0\nSECTION\n  2\nENTITIES\n  0\nENDSEC\n  0\nEOF\n';
  const dono = { id: 999002, role: 'usuario' };

  await caso('pacote: escolhas a mais, ids repetidos e id inexistente (tudo conferido antes de ler)', async () => {
    const p = await Pacotes.receberPacote([{ originalname: 'p.zip', buffer: await zipCom([['A/ELE-01.dxf', DXF_MIN], ['A/LOG-01.dxf', DXF_MIN]]) }], dono);
    const [a, b] = p.arquivos;
    // mesmo id repetido: entra uma vez só (a primeira escolha vale)
    const r = Pacotes.arquivosDoPacote(p.token, dono, [{ id: a.id, disciplinas: ['eletrica'] }, { id: a.id, disciplinas: ['cftv'] }]);
    assert.strictEqual(r.length, 1);
    assert.deepStrictEqual(r[0].disciplinas, ['eletrica']);
    // mais escolhas que itens do pacote: 400 sem ler nada
    assert.throws(() => Pacotes.arquivosDoPacote(p.token, dono, [{ id: a.id }, { id: b.id }, { id: a.id }]), (e) => e.status === 400 && /tem 2 \(máximo de 60\)/.test(e.message));
    // milhares de repetições: recusado logo (antes lia o mesmo arquivo milhares de vezes)
    assert.throws(() => Pacotes.arquivosDoPacote(p.token, dono, Array.from({ length: 5000 }, () => ({ id: a.id }))), (e) => e.status === 400);
    // id que não existe, mesmo depois de um válido: 400
    assert.throws(() => Pacotes.arquivosDoPacote(p.token, dono, [{ id: a.id }, { id: '999' }]), (e) => e.status === 400 && /999/.test(e.message));
    Pacotes.descartarPacote(p.token, dono);
  });

  await caso('pacote: ZIP-bomba — entrada acima de 40 MB pelo tamanho declarado e extensão não aceita, sem descompactar', async () => {
    const grande = Buffer.alloc(41 * 1024 * 1024); // zeros: comprime para quase nada
    const buf = await zipCom([['ELE-01.dxf', DXF_MIN], ['GRANDE.dwg', grande], ['Planilha.xlsx', grande]]);
    assert.ok(buf.length < 1024 * 1024, `zip de teste com ${buf.length} bytes`);
    const p = await Pacotes.receberPacote([{ originalname: 'bomba.zip', buffer: buf }], dono);
    assert.deepStrictEqual(p.arquivos.map(x => x.nome), ['ELE-01.dxf']);
    const motivos = Object.fromEntries(p.ignorados.map(i => [i.nome, i.motivo]));
    assert.strictEqual(motivos['bomba.zip/GRANDE.dwg'], 'acima de 40 MB');
    assert.strictEqual(motivos['bomba.zip/Planilha.xlsx'], 'não é PDF, DWG nem DXF');
    Pacotes.descartarPacote(p.token, dono);
  });

  await caso('pacote: soma declarada acima de 600 MB é recusada antes de descompactar', async () => {
    // ZIP pequeno com o tamanho DECLARADO adulterado no índice central (39 MB
    // cada): 16 × 39 MB = 624 MB. As 15 primeiras passam pelo limite por arquivo,
    // o tamanho real não bate (o JSZip recusa: "corrompido") e a 16ª estoura a
    // soma ANTES de ser descompactada.
    const buf = await zipCom(Array.from({ length: 16 }, (_, i) => [`P-${i}.dwg`, 'AC1027']));
    const fim = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    let pos = buf.readUInt32LE(fim + 16);
    for (let i = 0; i < buf.readUInt16LE(fim + 10); i++) {
      assert.strictEqual(buf.readUInt32LE(pos), 0x02014b50);
      buf.writeUInt32LE(39 * 1024 * 1024, pos + 24); // tamanho descompactado declarado
      pos += 46 + buf.readUInt16LE(pos + 28) + buf.readUInt16LE(pos + 30) + buf.readUInt16LE(pos + 32);
    }
    await assert.rejects(Pacotes.receberPacote([{ originalname: 'enorme.zip', buffer: buf }], dono), (e) => e.status === 400 && /600 MB/.test(e.message));
    // um só adulterado: vira "corrompido" nos ignorados, o resto do pacote segue
    const um = await zipCom([['ELE-01.dxf', DXF_MIN], ['X.dwg', 'AC1027']]);
    const f1 = um.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    let p1 = um.readUInt32LE(f1 + 16);
    p1 += 46 + um.readUInt16LE(p1 + 28) + um.readUInt16LE(p1 + 30) + um.readUInt16LE(p1 + 32);
    um.writeUInt32LE(30 * 1024 * 1024, p1 + 24);
    const p = await Pacotes.receberPacote([{ originalname: 'um.zip', buffer: um }], dono);
    assert.deepStrictEqual(p.arquivos.map(x => x.nome), ['ELE-01.dxf']);
    assert.deepStrictEqual(p.ignorados, [{ nome: 'um.zip/X.dwg', motivo: 'arquivo corrompido dentro do ZIP' }]);
    Pacotes.descartarPacote(p.token, dono);
    // o contrário: declara 1 KB e tem 30 MB — a descompactação para no que passar do declarado
    const mente = await zipCom([['ELE-01.dxf', DXF_MIN], ['Y.dwg', Buffer.alloc(30 * 1024 * 1024)]]);
    const f2 = mente.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    let p2 = mente.readUInt32LE(f2 + 16);
    p2 += 46 + mente.readUInt16LE(p2 + 28) + mente.readUInt16LE(p2 + 30) + mente.readUInt16LE(p2 + 32);
    mente.writeUInt32LE(1024, p2 + 24);
    const pm = await Pacotes.receberPacote([{ originalname: 'mente.zip', buffer: mente }], dono);
    assert.deepStrictEqual(pm.arquivos.map(x => x.nome), ['ELE-01.dxf']);
    assert.deepStrictEqual(pm.ignorados, [{ nome: 'mente.zip/Y.dwg', motivo: 'arquivo corrompido dentro do ZIP' }]);
    Pacotes.descartarPacote(pm.token, dono);
  });

  await caso('pacote: arquivo em disco acima do limite é ignorado pelo tamanho, sem ler', async () => {
    const fs = require('fs');
    const os = require('os');
    const pathM = require('path');
    const dir = fs.mkdtempSync(pathM.join(os.tmpdir(), 'hm-teste-pacote-'));
    try {
      const grande = pathM.join(dir, 'grande.dwg');
      // arquivo esparso: 41 MB de tamanho sem gravar 41 MB
      const fd = fs.openSync(grande, 'w'); fs.ftruncateSync(fd, 41 * 1024 * 1024); fs.closeSync(fd);
      const pequeno = pathM.join(dir, 'ELE-01.dxf');
      fs.writeFileSync(pequeno, DXF_MIN);
      const p = await Pacotes.receberPacote([{ originalname: 'grande.dwg', path: grande }, { originalname: 'ELE-01.dxf', path: pequeno }], dono);
      assert.deepStrictEqual(p.arquivos.map(x => x.nome), ['ELE-01.dxf']);
      assert.deepStrictEqual(p.ignorados, [{ nome: 'grande.dwg', motivo: 'acima de 40 MB' }]);
      Pacotes.descartarPacote(p.token, dono);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  await caso('limpeza das pastas temporárias por idade (mais de 3 h)', async () => {
    const fs = require('fs');
    const os = require('os');
    const pathM = require('path');
    const dir = fs.mkdtempSync(pathM.join(os.tmpdir(), 'hm-teste-limpeza-'));
    try {
      const velho = pathM.join(dir, 'velho'); fs.mkdirSync(velho); fs.writeFileSync(pathM.join(velho, '1.bin'), 'x');
      const novo = pathM.join(dir, 'novo.bin'); fs.writeFileSync(novo, 'x');
      const quatroHoras = new Date(Date.now() - 4 * 3600 * 1000);
      fs.utimesSync(velho, quatroHoras, quatroHoras);
      assert.strictEqual(Pacotes.limparPastaPorIdade(dir), 1);
      assert.ok(!fs.existsSync(velho) && fs.existsSync(novo));
      // pasta que não existe: não quebra
      assert.strictEqual(Pacotes.limparPastaPorIdade(pathM.join(dir, 'nao-existe')), 0);
      // o relógio de 30 min não segura o processo (unref)
      const relogio = Pacotes.agendarLimpezaTemporarios();
      assert.strictEqual(relogio.hasRef(), false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  console.log(`compatibilidadeEspacial + pacote: ${ok} casos ok`);
})().catch((e) => { console.error('FALHOU:', e); process.exit(1); });
