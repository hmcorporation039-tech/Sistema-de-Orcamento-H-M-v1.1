// Atestado de capacidade técnica (item 9 do plano), no modelo formal do Márcio: só o corpo (sem
// timbre da H&M), a partir de nota EMITIDA, com o número da nota; nada inventado; itens da proposta
// ligada viram a planilha; limpeza do texto em CAIXA ALTA das notas importadas.
// Rodar: node testes/atestadoCapacidade.test.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const JSZip = require('jszip');
const { montarAtestado, gerarDocx, validarNota } = require('../src/services/atestadoCapacidade');
const T = require('../src/utils/textoAtestado');

(async () => {
  // ── limpeza do texto das notas (exemplos reais do SYSB1) ──
  const dnit = T.atividadesDaNota('INSTALACAO DE CENTRO DE OPERAOES DO DNIT EM SAO LUIS, CONSTANDO 04 ESTACOES DE TRABALHO COMPLETAS COM CPUS, 08 MONITORES, 04 NOBREAKS, INFRAESTRUTURA E LANCAMENTO DE CABOS PARA INSTALACOES ELETRICAS E CABEAMENTO ESTRUTURADO PARA REDE DE COMPUTADORES COM 05 PONTOS, SISTEMA DE VIDEO MONITORAMNETO COM 01 NVR E 01 CAMERA DE VIGILANCIA.');
  assert.deepStrictEqual(dnit.atividades.map(a => a.texto), [
    'Instalação de centro de operações do DNIT em São Luís', '4 estações de trabalho completas com CPUs', '8 monitores', '4 nobreaks',
    'Infraestrutura e lançamento de cabos para instalações elétricas e cabeamento estruturado para rede de computadores com 5 pontos',
    'Sistema de vídeo monitoramento com 1 NVR e 1 câmera de vigilância']);
  assert.strictEqual(T.atividadesDaNota('INSTALACAO DE CENTRO DE OPERAOES DO DNIT EM FEIRA DE SANTANA BA').atividades[0].texto, 'Instalação de centro de operações do DNIT em Feira de Santana BA');
  const dif = T.atividadesDaNota('- FORNECIMENTO DE MAO DE OBRA PARA INSTALACOES ELETRICAS\r\n- NOVOS PERFIS DE LEDS EM MARCENARIA E TETO,\r\n- REINSTALACAO DO LETREIRO PRINCIPAL E LATERAL, COM CORRECAO ELETRICA E ESTETICA DO CABEAMENTO\r\n- CONECTORIZACAO DE 580 PONTOS DE REDE RJ45');
  assert.deepStrictEqual(dif.atividades.map(a => a.texto), [
    'Fornecimento de mão de obra para instalações elétricas', 'Novos perfis de LEDs em marcenaria e teto',
    'Reinstalação do letreiro principal e lateral, com correção elétrica e estética do cabeamento', 'Conectorização de 580 pontos de rede RJ45']);
  const ped = T.atividadesDaNota('PRESTACAO DE SERVICOS DE LANCAMENTOS DE CABOS ELETRICOS E INFRAESTRUTURA\r\n\r\nPEDIDO: CCN 9254');
  assert.strictEqual(ped.pedido, 'CCN 9254');
  assert.deepStrictEqual(ped.atividades.map(a => a.texto), ['Lançamentos de cabos elétricos e infraestrutura']);
  assert.strictEqual(T.atividadesDaNota('Instalação de cabo 2,5 mm² em 3 circuitos').atividades.length, 1, 'vírgula decimal não separa');
  assert.strictEqual(T.itemDePlanilha('Instalação de cabo 2,5 mm² em tomadas'), null, 'medida não vira quantidade');
  assert.deepStrictEqual(T.itemDePlanilha('Conectorização de 580 pontos de rede RJ45'), { descricao: 'Conectorização de 580 pontos de rede RJ45', unidade: 'pt', quantidade: 580 });
  // texto de atividades/planilha: ida e volta
  assert.deepStrictEqual(T.atividadesDoTexto('Elétrica:\n1. Cabos;\nQuadros\n\nRedes:\nPontos'), [{ grupo: 'Elétrica', itens: ['Cabos', 'Quadros'] }, { grupo: 'Redes', itens: ['Pontos'] }]);
  assert.deepStrictEqual(T.planilhaDoTexto('Redes:\nPontos de rede | pt 580,00\nRack | un 1'),
    [{ grupo: 'Redes', itens: [{ descricao: 'Pontos de rede', unidade: 'pt', quantidade: 580 }, { descricao: 'Rack', unidade: 'un', quantidade: 1 }] }]);

  // ── atestado ──
  const nota = {
    id: 7, situacao: 'emitida', numero: 123, data_emissao: '2026-10-20T14:00:00Z', competencia: '2026-10-01',
    valor_servicos: '12500.5',
    discriminacao: 'INSTALACAO DE CENTRO DE OPERACOES DO DNIT EM VITORIA ES, CONSTANDO 06 ESTACOES DE TRABALHO COMPLETAS COM CPUS, 12 MONITORES',
    servico_descricao: '7.02 - Execução, por administração, empreitada ou subempreitada, de obras de construção civil...',
    tomador: { nome: 'Colégio Exemplo LTDA', documento: '12345678000190', logradouro: 'SQN 100', numero: 'Bl A', bairro: 'Asa Norte', municipio: 'Brasília', uf: 'DF' },
  };
  for (const s of ['rascunho', 'cancelada', 'substituida']) assert.ok(validarNota({ ...nota, situacao: s }), s);
  assert.strictEqual(validarNota(nota), null);
  assert.throws(() => montarAtestado({ ...nota, situacao: 'rascunho' }), /emitida/);

  const a = montarAtestado(nota);
  const txt = a.texto;
  assert.ok(txt.startsWith('ATESTADO DE CAPACIDADE TÉCNICA'));
  assert.ok(txt.includes('empresa H&M ENGENHARIA E TECNOLOGIA LTDA, inscrita no CNPJ sob o nº 04.003.376/0001-00 e com sede na Q CNF 3, SN, Lote 16'));
  assert.ok(txt.includes('prestou a Colégio Exemplo LTDA, inscrito(a) no CNPJ sob o nº 12.345.678/0001-90 e com sede em SQN 100, Bl A, Asa Norte, Brasília/DF, os serviços de instalação de centro de operações do DNIT em Vitória ES conforme estabelecido abaixo:'));
  assert.ok(!txt.includes('7.02'), 'a lista de serviços da LC 116 não entra no texto');
  assert.ok(txt.includes('- Nota fiscal: NFS-e nº 123, emitida em 20/10/2026, competência 10/2026'), 'número da nota no corpo');
  assert.ok(txt.includes('1) DADOS DO CONTRATO'), 'sem responsável técnico a parte 1 some e a numeração se ajusta');
  assert.ok(!/RESPONSÁVEL TÉCNICO|Período|Vigência|Endereço:|Contrato:/.test(txt), 'sem dado, sem linha');
  assert.ok(txt.includes('- Contratante: Colégio Exemplo LTDA'));
  assert.ok(txt.includes('2) DESCRIÇÃO DAS ATIVIDADES') && txt.includes('3) PLANILHA DE SERVIÇOS') && txt.includes('4) COMPROVAÇÃO DOCUMENTAL'));
  assert.ok(txt.includes('6 estações de trabalho completas com CPUs | un 6,00'), 'quantidade escrita na nota vira planilha');
  assert.ok(txt.includes('NFS-e 123 | 20/10/2026 | Colégio Exemplo LTDA / 12.345.678/0001-90'));
  assert.ok(txt.includes('☒ Notas fiscais relacionadas acima') && txt.includes('☐ Cópia do contrato e aditivos'));
  assert.ok(txt.includes('atenderam aos prazos e condições contratuais, não constando em nossos registros fatos que desabonem a conduta da empresa'));
  assert.ok(txt.includes('Brasília, ____ de ______________ de ______'));
  assert.ok(txt.includes('[Nome do signatário]'));
  assert.ok(!/12\.500/.test(txt), 'valor só se pedido');
  assert.ok(a.avisos.length >= 4);
  assert.ok(!/telefone|WhatsApp|PIX|papel timbrado do contratante/i.test(txt));

  // com proposta ligada: planilha vem dos itens reais, agrupada por seção; local da proposta é sugerido
  const contexto = {
    proposta: { numero: 'P209', total: 50000, local_obra: 'Hospital Santa Lúcia Sul' },
    itens: [
      { secao: 'Rede', descricao: 'Ponto de rede Cat 6', quantidade: '40.000', unidade: 'pt' },
      { secao: 'Rede', descricao: 'Rack 12U', quantidade: 1, unidade: 'un' },
      { secao: 'Elétrica', descricao: 'Quadro de distribuição', quantidade: 2, unidade: 'un' },
      { secao: 'Elétrica', descricao: 'Item sem quantidade', quantidade: 0, unidade: 'un' },
    ],
  };
  const b = montarAtestado(nota, {
    mostrar_valor: true, contrato: 'CT 45/2026', inicio: '2026-09-01', fim: '2026-10-15', vigencia_inicio: '2026-08-01', vigencia_fim: '2026-12-31',
    area: 'm² 320,00', local: 'Sede, Asa Norte', cidade: 'Brasília',
    responsaveis: [{ nome: 'Fulano de Tal', titulo: 'Engenheiro Eletricista', crea: '12345/D-DF', art: '0720260001' }],
    signatarios: [{ nome: 'Maria Souza', cargo: 'Diretora' }], setor: 'Gerência de Infraestrutura',
  }, contexto);
  const tb = b.texto;
  assert.ok(tb.includes('1) RESPONSÁVEL TÉCNICO') && tb.includes('- Nome: Fulano de Tal – Engenheiro Eletricista – CREA/CAU: 12345/D-DF') && tb.includes('- ART/RRT: 0720260001'));
  assert.ok(tb.includes('- Proposta comercial: nº P209') && tb.includes('- Contrato: CT 45/2026'));
  assert.ok(tb.includes('- Prazo de execução dos serviços: 45 dias') && tb.includes('- Período de execução: 01/09/2026 a 15/10/2026'));
  assert.ok(tb.includes('- Vigência do contrato: 01/08/2026 a 31/12/2026') && tb.includes('- Área / quantitativo executado: m² 320,00') && tb.includes('- Endereço: Sede, Asa Norte'));
  assert.ok(tb.includes('- Valor dos serviços: R$') && tb.includes('12.500,50'));
  assert.ok(tb.includes('[REDE]\nPonto de rede Cat 6 | pt 40,00\nRack 12U | un 1,00\n[ELÉTRICA]\nQuadro de distribuição | un 2,00'));
  assert.ok(!tb.includes('Item sem quantidade'));
  assert.ok(tb.includes('Competência 10/2026 · Proposta P209'));
  assert.ok(tb.includes('☒ ART/RRT dos responsáveis técnicos'));
  assert.ok(tb.includes('Maria Souza') && tb.includes('Gerência de Infraestrutura'));
  assert.ok(b.avisos.some(x => /difere da proposta/.test(x)), 'nota diferente da proposta avisa');
  assert.strictEqual(b.sugestao.planilhaOrigem, 'proposta');
  assert.strictEqual(b.sugestao.local, 'Hospital Santa Lúcia Sul');

  // nota sem texto de serviço: nunca usa a descrição longa da LC 116; sigla no início não vira minúscula
  const semTexto = montarAtestado({ ...nota, discriminacao: '' });
  assert.ok(semTexto.texto.includes('os serviços de [natureza resumida dos serviços] conforme') && !semTexto.texto.includes('7.02'));
  assert.ok(semTexto.avisos.some(x => /texto de serviço/.test(x)));
  assert.ok(montarAtestado({ ...nota, discriminacao: 'SPDA DO PREDIO' }).texto.includes('os serviços de SPDA do prédio conforme'));
  assert.ok(montarAtestado(nota, { inicio: '2026-10-15', fim: '2026-09-01' }).avisos.some(x => /antes do início/.test(x)));
  assert.ok(!montarAtestado(nota, { inicio: '2026-10-15', fim: '2026-09-01' }).texto.includes('Prazo de execução'));

  // texto editado pelo engenheiro vale mais que o sugerido
  const c = montarAtestado(nota, { atividades: 'Elétrica:\nCabos de potência', planilha: 'Elétrica:\nCabos | m 100' }, contexto);
  assert.ok(c.texto.includes('1. Cabos de potência.') && c.texto.includes('Cabos | m 100,00') && !c.texto.includes('Ponto de rede'));
  const vazia = montarAtestado(nota, { planilha: '' }, contexto);
  assert.ok(!vazia.texto.includes('PLANILHA DE SERVIÇOS'), 'planilha apagada some do documento');

  // ── .docx: sem timbre, imagem, cabeçalho nem rodapé; tabelas e caracteres especiais ──
  const zip = await JSZip.loadAsync(await gerarDocx(b.blocos));
  assert.deepStrictEqual(Object.keys(zip.files).filter(f => !f.endsWith('/')).sort(),
    ['[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels', 'word/document.xml', 'word/styles.xml'].sort());
  const doc = await zip.file('word/document.xml').async('string');
  assert.ok(doc.includes('ATESTADO DE CAPACIDADE TÉCNICA') && doc.includes('NFS-e 123'));
  assert.strictEqual((doc.match(/<w:tbl>/g) || []).length, 3, 'planilha, comprovação e assinaturas');
  assert.ok(!/<w:drawing|<w:pict|headerReference|footerReference/.test(doc));
  const esp = await gerarDocx(montarAtestado({ ...nota, discriminacao: 'Montagem de quadro <QD> & rack' }).blocos);
  const docEsp = await (await JSZip.loadAsync(esp)).file('word/document.xml').async('string');
  assert.ok(docEsp.includes('&lt;QD&gt; &amp; rack') && !docEsp.includes('<QD>'));

  // rotas existem, exigem login e admin
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'routes', 'v2', 'notasFiscais.js'), 'utf8');
  for (const r of [/post\('\/notas-fiscais\/:id\/atestado', autenticar, validarId, admin,/, /post\('\/notas-fiscais\/:id\/atestado\.docx', autenticar, validarId, admin,/,
    /get\('\/notas-fiscais\/:id\/propostas-candidatas', autenticar, validarId, admin,/, /put\('\/notas-fiscais\/:id\/proposta', autenticar, validarId, admin,/]) assert.ok(r.test(src), String(r));

  // ── vínculo nota → proposta no banco do v2 (o que o teste cria, ele apaga) ──
  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`atestadoCapacidade: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    const ctrl = require('../src/controllers/notasFiscaisController');
    const resp = () => { const r = { codigo: 200 }; r.status = (cod) => { r.codigo = cod; return r; }; r.json = (o) => { r.corpo = o; return r; }; return r; };
    const seq = 950000 + Math.floor(Math.random() * 40000);
    try {
      const novoCliente = async (nome) => (await pool.query('INSERT INTO clientes (nome) VALUES ($1) RETURNING id', [nome])).rows[0].id;
      const novaProposta = async (n, cliente, status) => (await pool.query(
        "INSERT INTO propostas (numero, sequencial, data, cliente_id, cliente_nome, status, total) VALUES ($1, $2, CURRENT_DATE, $3, 'ZZ', $4, 1000) RETURNING id",
        [`T${seq + n}`.slice(0, 10), seq + n, cliente, status])).rows[0].id;
      const cli = await novoCliente('ZZ Cliente atestado');
      const outro = await novoCliente('ZZ Outro cliente');
      const prop = await novaProposta(0, cli, 'Aprovada');
      const propOutro = await novaProposta(1, outro, 'Aprovada');
      const propCancelada = await novaProposta(2, cli, 'Cancelada');
      const nf = (await pool.query(
        "INSERT INTO notas_fiscais (situacao, origem, numero, cliente_id, tomador, discriminacao, valor_servicos, data_emissao) VALUES ('emitida', 'importada', $1, $2, $3, 'TESTE ATESTADO', 100, NOW()) RETURNING id",
        [900000000 + seq, cli, JSON.stringify({ nome: 'ZZ' })])).rows[0].id;
      const usuario = { id: null };

      let r = resp(); await ctrl.propostasCandidatas({ params: { id: nf } }, r);
      assert.deepStrictEqual(r.corpo.map(p => p.id), [prop], 'só proposta aprovada/ativa do mesmo cliente');
      for (const [rotulo, body] of [['de outro cliente', { proposta_id: propOutro }], ['cancelada', { proposta_id: propCancelada }], ['inválida', { proposta_id: 'abc' }]]) {
        r = resp(); await ctrl.vincularProposta({ params: { id: nf }, body, usuario }, r);
        assert.strictEqual(r.codigo, 400, `proposta ${rotulo} é recusada`);
      }
      r = resp(); await ctrl.vincularProposta({ params: { id: nf }, body: { proposta_id: prop }, usuario }, r);
      assert.strictEqual(r.codigo, 200); assert.strictEqual(r.corpo.proposta_id, prop);
      r = resp(); await ctrl.previaAtestado({ params: { id: nf }, body: {} }, r);
      assert.strictEqual(r.corpo.proposta_id, prop); assert.ok(r.corpo.texto.includes('Proposta comercial: nº T'));
      r = resp(); await ctrl.vincularProposta({ params: { id: nf }, body: { proposta_id: null }, usuario }, r);
      assert.strictEqual(r.corpo.proposta_id, null, 'desligar o vínculo');
      // apagar a proposta não apaga a nota (ON DELETE SET NULL)
      await pool.query('UPDATE notas_fiscais SET proposta_id = $1 WHERE id = $2', [prop, nf]);
      await pool.query('DELETE FROM propostas WHERE id = $1', [prop]);
      assert.strictEqual((await pool.query('SELECT proposta_id FROM notas_fiscais WHERE id = $1', [nf])).rows[0].proposta_id, null);
    } finally {
      await pool.query("DELETE FROM notas_fiscais WHERE discriminacao = 'TESTE ATESTADO'").catch(() => {});
      await pool.query("DELETE FROM propostas WHERE cliente_nome = 'ZZ' AND numero LIKE 'T9%'").catch(() => {});
      await pool.query("DELETE FROM clientes WHERE nome IN ('ZZ Cliente atestado', 'ZZ Outro cliente')").catch(() => {});
      await pool.end();
    }
  }
  console.log('atestadoCapacidade: ok');
})().catch(e => { console.error(e); process.exit(1); });
