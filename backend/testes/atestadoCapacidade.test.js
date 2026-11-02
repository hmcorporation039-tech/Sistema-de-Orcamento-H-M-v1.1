// Atestado de capacidade técnica (item 9 do plano): só o corpo do texto, sem timbre da H&M, a partir
// de nota EMITIDA; nada inventado (quantitativo, local, ART só entram se informados).
// Rodar: node testes/atestadoCapacidade.test.js
const assert = require('assert');
const JSZip = require('jszip');
const { montarAtestado, gerarDocx, validarNota } = require('../src/services/atestadoCapacidade');

(async () => {
  const nota = {
    id: 7, situacao: 'emitida', numero: 123, data_emissao: '2026-10-20T14:00:00Z', competencia: '2026-10-01',
    valor_servicos: '12500.5', discriminacao: 'Instalação de  cabeamento estruturado\ne 40 pontos & rack <teste>',
    tomador: { nome: 'Colégio Exemplo LTDA', documento: '12345678000190', logradouro: 'SQN 100', numero: 'Bl A', bairro: 'Asa Norte', municipio: 'Brasília', uf: 'DF' },
  };

  // só nota emitida
  for (const s of ['rascunho', 'cancelada', 'substituida']) assert.ok(validarNota({ ...nota, situacao: s }), s);
  assert.strictEqual(validarNota(nota), null);
  assert.throws(() => montarAtestado({ ...nota, situacao: 'rascunho' }), /emitida/);

  // sem opções: nada inventado
  const a = montarAtestado(nota);
  assert.ok(a.texto.startsWith('ATESTADO DE CAPACIDADE TÉCNICA'));
  assert.ok(a.texto.includes('Colégio Exemplo LTDA'));
  assert.ok(a.texto.includes('CNPJ nº 12.345.678/0001-90'));
  assert.ok(a.texto.includes('SQN 100, Bl A, Asa Norte, Brasília/DF'));
  assert.ok(a.texto.includes('NFS-e) nº 123, emitida em 20/10/2026, competência 10/2026'));
  assert.ok(a.texto.includes('Instalação de cabeamento estruturado e 40 pontos & rack <teste>'), 'espaços e quebras viram um espaço');
  assert.ok(!a.texto.includes('12.500'), 'valor só aparece se pedido');
  assert.ok(!/Local de execução|Período|quantitativos executados|Responsável técnico/.test(a.texto), 'sem dado, sem linha');
  assert.ok(a.texto.includes('[nome do signatário]'));
  assert.ok(a.avisos.length >= 3);
  // sem timbre nem logo da H&M como cabeçalho/assinatura: a H&M aparece só como a contratada
  assert.ok(!a.paragrafos.some(p => p.centro && /H&M/.test(p.texto)));
  assert.ok(!/telefone|WhatsApp|PIX/i.test(a.texto));

  // com dados informados
  const b = montarAtestado(nota, {
    mostrar_valor: true, local: 'Sede, Asa Norte', inicio: '2026-09-01', fim: '2026-10-15',
    quantitativos: '40 pontos de rede Cat 6\n\n  1 rack de 12U  ', responsavel_tecnico: 'Fulano de Tal', crea: '12345/D-DF', art: '0720260001',
    signatario: 'Maria Souza', cargo: 'Diretora',
  });
  assert.ok(b.texto.includes('R$') && b.texto.includes('12.500,50'));
  assert.ok(b.texto.includes('Local de execução: Sede, Asa Norte.'));
  assert.ok(b.texto.includes('Período de execução: de 01/09/2026 a 15/10/2026.'));
  assert.ok(b.texto.includes('– 40 pontos de rede Cat 6\n\n– 1 rack de 12U'));
  assert.ok(b.texto.includes('Fulano de Tal, CREA/CAU nº 12345/D-DF, ART/RRT nº 0720260001'));
  assert.ok(b.texto.includes('Maria Souza') && b.texto.includes('Diretora'));
  assert.ok(!b.avisos.some(x => /Signatário|quantitativos|responsável/i.test(x)));

  // teto de linhas de quantitativo
  const muitos = montarAtestado(nota, { quantitativos: Array.from({ length: 50 }, (_, i) => `item ${i}`) });
  assert.strictEqual(muitos.paragrafos.filter(p => p.texto.startsWith('– ')).length, 20);

  // .docx: zip com as 3 partes, XML escapado, sem imagem/cabeçalho/rodapé
  const buf = await gerarDocx(b.paragrafos);
  const zip = await JSZip.loadAsync(buf);
  assert.deepStrictEqual(Object.keys(zip.files).sort(), ['[Content_Types].xml', '_rels/', '_rels/.rels', 'word/', 'word/_rels/', 'word/_rels/document.xml.rels', 'word/document.xml', 'word/styles.xml'].sort());
  const doc = await zip.file('word/document.xml').async('string');
  assert.ok(doc.includes('ATESTADO DE CAPACIDADE TÉCNICA'));
  assert.ok(!/<w:drawing|<w:pict|headerReference|footerReference/.test(doc));
  const c = await gerarDocx(montarAtestado(nota).paragrafos);
  const docC = await (await JSZip.loadAsync(c)).file('word/document.xml').async('string');
  assert.ok(docC.includes('&amp; rack &lt;teste&gt;'), 'caracteres especiais escapados');
  assert.ok(!docC.includes('<teste>'));

  // as rotas existem, exigem login e admin
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'routes', 'v2', 'notasFiscais.js'), 'utf8');
  assert.ok(/post\('\/notas-fiscais\/:id\/atestado', autenticar, validarId, admin,/.test(src));
  assert.ok(/post\('\/notas-fiscais\/:id\/atestado\.docx', autenticar, validarId, admin,/.test(src));
  console.log('atestadoCapacidade: ok');
})().catch(e => { console.error(e); process.exit(1); });
