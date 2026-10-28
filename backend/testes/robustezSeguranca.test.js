// Revisão de segurança/disponibilidade/integridade (versão 2.3, 28/10/2026):
// fila global de workers, tarefas de CAD fora da thread principal, fila de PDF
// com prazo, transação com retrato único (REPEATABLE READ), auditoria
// obrigatória nas exclusões, ZIP-bomba em DOCX/XLSX, reserva da conversa do
// assistente e cartões de ação com o conteúdo do que será feito.
// Sem banco de verdade: o pool do PostgreSQL é trocado por um FALSO antes de
// carregar os módulos. Desenhos SINTÉTICOS (nenhum dado de cliente).
// Rodar: node testes/robustezSeguranca.test.js (ou npm test, pasta backend).
const assert = require('assert');
const path = require('path');

// ── pool falso (precisa vir antes de qualquer require de src/) ──────────────
const banco = { responder: async () => ({ rows: [], rowCount: 0 }), cliente: null };
const poolFalso = {
  query: (...a) => banco.responder(...a),
  connect: async () => banco.cliente,
  on() {},
};
require.cache[require.resolve('../src/config/database')] = { id: 'db', filename: 'db', loaded: true, exports: poolFalso };
// pastas dos registros falsas (a exclusão do laudo não mexe no disco de verdade)
const pastas = { gravados: [], excluidos: [], falharGravacao: false };
require.cache[require.resolve('../src/services/pastasRegistros')] = { id: 'pr', filename: 'pr', loaded: true, exports: {
  pastaDoLaudo: async (row) => `C:/falso/Laudos/${row.titulo}`,
  excluirPastaDoItem: async (tipo, row) => { pastas.excluidos.push([tipo, row.id]); return 'C:/falso/_Excluídos'; },
  seguro: async (rotulo, fn) => { try { return await fn(); } catch { return null; } },
  sincronizarLaudo: async () => null, sincronizarProjeto: async () => null, pastaDoProjeto: async () => null, resumoPasta: async () => null,
  pedidoLocal: () => false, caminhoRegistrado: async () => null, salvarPdfPropostaNasPastas: async () => null,
} };

const { executarNoWorker, estadoDoSemaforo, MAX_SIMULTANEOS } = require('../src/utils/executarNoWorker');
const T = require('../src/services/tarefasCad');
const { comVaga } = require('../src/utils/pdfPuppeteer');
const { comTransacao } = require('../src/utils/transacao');
const { registrarAuditoria } = require('../src/utils/auditoria');
const { conferirZipOffice } = require('../src/services/assistente/arquivos');
const R = require('../src/utils/assistenteRascunho');
const { prepararAcao } = require('../src/services/assistente/acoes');
const E = require('../src/services/assistente/execucao');

const SK = path.join(__dirname, '..', '..', 'skills');
const { DesenhoDxf } = require(path.join(SK, '_comum', 'cad', 'dxf.js'));
const WORKER_ESPERA = path.join(__dirname, 'fixtures', 'workerEspera.js');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const silencio = (fn) => async (...a) => {
  const { warn, error, log } = console;
  console.warn = () => {}; console.error = () => {}; console.log = () => {};
  try { return await fn(...a); } finally { Object.assign(console, { warn, error, log }); }
};

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

function arquiteturaSintetica() {
  const d = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }] });
  d.polilinha([[0, 0], [6, 0], [6, 4], [0, 4]], { layer: 'A-PAREDE', fechada: true });
  d.polilinha([[6.15, 0], [10, 0], [10, 4], [6.15, 4]], { layer: 'A-PAREDE', fechada: true });
  d.texto(2.5, 2, 0.2, 'SALA DE ESTAR', { layer: 'A-TEXTO' });
  d.texto(7.5, 2, 0.2, 'ESCRITORIO', { layer: 'A-TEXTO' });
  return d.toString();
}

// ════════ workers: fila global de no máximo 2 ════════
caso('executarNoWorker: 6 tarefas ao mesmo tempo, nunca mais de 2 rodando (fila global)', async () => {
  assert.strictEqual(MAX_SIMULTANEOS, 2);
  const tarefas = Array.from({ length: 6 }, (_, id) => executarNoWorker(WORKER_ESPERA, { id, ms: 150 }, { tempoLimiteMs: 10000, memoriaMb: 64 }));
  assert.ok(estadoDoSemaforo().naFila >= 3, JSON.stringify(estadoDoSemaforo()));
  const r = await Promise.all(tarefas);
  assert.deepStrictEqual(r.map(m => m.id), [0, 1, 2, 3, 4, 5]);
  // sobreposição máxima dos intervalos [início, fim] de cada worker
  const marcos = r.flatMap(m => [[m.inicio, 1], [m.fim, -1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let agora = 0, maximo = 0;
  for (const [, d] of marcos) { agora += d; maximo = Math.max(maximo, agora); }
  assert.ok(maximo <= 2, `rodaram ${maximo} ao mesmo tempo`);
  // a vaga volta quando a thread sai ('exit')
  for (let i = 0; i < 50 && estadoDoSemaforo().ativos; i++) await esperar(20);
  assert.deepStrictEqual(estadoDoSemaforo(), { ativos: 0, naFila: 0, maximo: 2 });
});

caso('executarNoWorker: tempo-limite encerra a thread e libera a vaga; thread que sai sem responder vira erro', async () => {
  await assert.rejects(executarNoWorker(WORKER_ESPERA, { ms: 5000 }, { tempoLimiteMs: 150, memoriaMb: 64 }), (e) => e.codigo === 'TEMPO_ESGOTADO');
  await assert.rejects(executarNoWorker(WORKER_ESPERA, { sair: true }, { tempoLimiteMs: 5000, memoriaMb: 64 }), (e) => e.codigo === 'SEM_RESPOSTA');
  for (let i = 0; i < 50 && estadoDoSemaforo().ativos; i++) await esperar(20);
  assert.strictEqual(estadoDoSemaforo().ativos, 0);
});

// ════════ leitura de CAD fora da thread principal ════════
caso('tarefasCad: arquitetura lida no worker (ambientes, layers) e mensagens de erro de sempre', async () => {
  const dxf = arquiteturaSintetica();
  const r = await T.lerArquiteturaNoWorker(Buffer.from(dxf, 'utf8'), 'Arquitetura.dxf');
  assert.strictEqual(r.origem, 'dxf');
  assert.ok(r.texto.includes('SECTION'));
  assert.deepStrictEqual(r.leitura.ambientes.map(a => a.nome), ['ESCRITORIO', 'SALA DE ESTAR']);
  assert.ok(Array.isArray(r.leitura.ambientes[0].poligono) && Array.isArray(r.leitura.portas) && r.leitura.layers.includes('A-PAREDE'));
  // arquivo que não é CAD: erro da conversão, com a mesma mensagem de antes
  const e = await T.lerArquiteturaNoWorker(Buffer.from('não sou cad'), 'x.dxf').catch(x => x);
  assert.strictEqual(e.etapa, 'conversao');
  assert.match(T.mensagemDaLeitura(e), /não é um DWG nem um DXF/);
});

caso('tarefasCad: planta da disciplina no worker (alarme, cujo resultado tem funções) e dados inválidos → etapa "dados"', async () => {
  const dxf = arquiteturaSintetica();
  const { motorDaDisciplina } = require('../src/utils/disciplinasLaudo');
  const p = await T.gerarPlantaNoWorker({ dxf, disciplina: 'alarme', dados: motorDaDisciplina('alarme').exemplo(), carimbo: { cliente: 'Cliente Exemplo', titulo: 'Teste' } });
  assert.ok(p.dxf.includes('SECTION') && Array.isArray(p.naoEncontrados));
  const e = await T.gerarPlantaNoWorker({ dxf, disciplina: 'alarme', dados: { ambientes: 'x' }, carimbo: {} }).catch(x => x);
  assert.strictEqual(e.etapa, 'dados');
});

caso('tarefasCad: DXF da compatibilização gerado no worker', async () => {
  const dxf = await T.dxfCompatibilizacaoNoWorker({
    dxfReferencia: arquiteturaSintetica(), titulo: 'COMPATIBILIZAÇÃO — TESTE',
    conflitos: [{ tipo: 'afastamento', tema: 'Detector de incêndio junto de luminária', x: 1, y: 1, ambiente: 'SALA DE ESTAR', distancia: 0.3, a: { descricao: 'Detector', arquivo: 'INC.dwg' }, b: { descricao: 'Luminária', arquivo: 'ILU.dwg' } }],
  });
  assert.ok(dxf.includes('COMPAT-CONFLITO') && dxf.includes('Detector de inc'));
});

// ════════ fila de PDF com prazo ════════
caso('fila de PDF: quem espera além do prazo recebe "fila cheia" (503) e a fila segue', async () => {
  const soltar = [];
  const ocupadas = [0, 1].map(() => comVaga(() => new Promise(r => soltar.push(r))));
  await esperar(10);
  await assert.rejects(comVaga(async () => 'nunca', 100), (e) => e.status === 503 && e.codigo === 'FILA_PDF_CHEIA' && /fila de PDF est[aá] cheia/i.test(e.message));
  // quem ainda está no prazo entra assim que uma vaga sobra
  const depois = comVaga(async () => 'entrou', 5000);
  soltar[0]('a');
  assert.strictEqual(await depois, 'entrou');
  soltar[1]('b');
  assert.deepStrictEqual(await Promise.all(ocupadas), ['a', 'b']);
  // as duas vagas voltaram
  assert.deepStrictEqual(await Promise.all([comVaga(async () => 1, 50), comVaga(async () => 2, 50)]), [1, 2]);
});

// ════════ transação: retrato único e nova tentativa ════════
function clienteFalso({ falharVezes = 0 } = {}) {
  const c = { log: [], liberado: 0, tentativas: 0 };
  c.release = () => { c.liberado++; };
  c.query = async (sql) => {
    const s = String(sql).trim();
    c.log.push(s);
    if (/^BEGIN/.test(s)) { c.tentativas++; return { command: 'BEGIN', rows: [] }; }
    if (/^COMMIT/.test(s)) return { command: 'COMMIT', rows: [] };
    if (/^ROLLBACK/.test(s)) return { command: 'ROLLBACK', rows: [] };
    if (/^UPDATE/.test(s) && c.tentativas <= falharVezes) throw Object.assign(new Error('could not serialize access due to concurrent update'), { code: '40001' });
    return { rows: [{ ok: true }] };
  };
  return c;
}

caso('comTransacao: REPEATABLE READ abre com o nível pedido; o padrão continua BEGIN simples', async () => {
  banco.cliente = clienteFalso();
  assert.strictEqual(await comTransacao(async (cl) => (await cl.query('SELECT 1')).rows.length, { isolamento: 'REPEATABLE READ' }), 1);
  assert.strictEqual(banco.cliente.log[0], 'BEGIN ISOLATION LEVEL REPEATABLE READ');
  banco.cliente = clienteFalso();
  await comTransacao(async (cl) => cl.query('SELECT 1'));
  assert.strictEqual(banco.cliente.log[0], 'BEGIN');
  await assert.rejects(comTransacao(async () => 1, { isolamento: 'READ UNCOMMITTED; DROP TABLE x' }), /isolamento inválido/);
});

caso('comTransacao: erro de serialização (40001) refaz a transação; outro erro não', async () => {
  banco.cliente = clienteFalso({ falharVezes: 1 });
  const r = await comTransacao(async (cl) => { await cl.query('UPDATE configuracoes SET valor = 1'); return 'gravou'; }, { isolamento: 'REPEATABLE READ' });
  assert.strictEqual(r, 'gravou');
  assert.strictEqual(banco.cliente.tentativas, 2);
  banco.cliente = clienteFalso({ falharVezes: 5 });
  await assert.rejects(comTransacao(async (cl) => cl.query('UPDATE x'), { isolamento: 'REPEATABLE READ' }), (e) => e.code === '40001');
  assert.strictEqual(banco.cliente.tentativas, 3);
  banco.cliente = clienteFalso({ falharVezes: 5 });
  await assert.rejects(comTransacao(async (cl) => cl.query('UPDATE x')), (e) => e.code === '40001');
  assert.strictEqual(banco.cliente.tentativas, 1, 'sem nível pedido: uma tentativa só (como antes)');
});

// ════════ auditoria obrigatória nas exclusões ════════
caso('auditoria obrigatória: falha da auditoria sobe (a exclusão é desfeita); a comum continua engolida', silencio(async () => {
  const cl = { release() {}, log: [], async query(s) { this.log.push(s); if (/INSERT INTO auditoria/.test(s)) throw Object.assign(new Error('falhou'), { code: '23502' }); return { rows: [] }; } };
  await registrarAuditoria(cl, { entidade: 'laudos_projetos', acao: 'excluir' });
  await assert.rejects(registrarAuditoria(cl, { entidade: 'laudos_projetos', acao: 'excluir', obrigatoria: true }), /falhou/);
  assert.ok(cl.log.includes('ROLLBACK TO SAVEPOINT hm_auditoria'));
}));

// ════════ DOCX/XLSX: ZIP-bomba ════════
caso('anexo do assistente: DOCX/XLSX com parte acima de 40 MB (declarado) é recusado antes de descompactar', async () => {
  const JSZip = require('jszip');
  const z = new JSZip();
  z.file('word/document.xml', '<w:document/>');
  z.file('word/media/enorme.bin', Buffer.alloc(41 * 1024 * 1024));
  const buf = await z.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 1 } });
  await assert.rejects(conferirZipOffice(buf), /grande demais por dentro/);
  const pequeno = new JSZip();
  pequeno.file('word/document.xml', '<w:document><w:p>Olá</w:p></w:document>');
  const zip = await conferirZipOffice(await pequeno.generateAsync({ type: 'nodebuffer' }));
  assert.ok(zip.file('word/document.xml'));
});

// ════════ cartões de ação com o conteúdo ════════
caso('rascunho: resumo mostra antes → depois de cada campo, com textos longos cortados em 600 caracteres', async () => {
  const base = R.propostaParaPayload({
    data: '2026-10-28', validade: 10, escopo: 'Escopo antigo', bdi: 20, secoes: [{ id: 1, nome: 'Materiais e Equipamentos' }],
    itens: [{ id: 5, secao_id: 1, descricao: 'Cabo UTP', quantidade: '6', unidade: 'm', valor_unitario: '2.50', status: 'confirmado' }],
  });
  const longo = 'x'.repeat(900);
  const { resumo } = R.aplicarOperacoes(base, {
    alterar: [{ item_id: 5, quantidade: 8, valor_unitario: 3, status: 'a_cotar' }],
    campos: { escopo: longo, bdi: 25, validade: 15, pagamento: 'À vista' },
  });
  const tudo = resumo.join('\n');
  assert.match(tudo, /alterado: Cabo UTP \(qtd 6 → 8, unitário R\$ 2\.50 → R\$ 3\.00, confirmado → a cotar\)/);
  assert.match(tudo, /bdi 20 % → 25 %/);
  assert.match(tudo, /validade 10 → 15 dias/);
  assert.match(tudo, /pagamento: \(vazio\) → "À vista"/);
  const escopo = resumo.find(t => t.startsWith('escopo:'));
  assert.ok(escopo.startsWith('escopo: "Escopo antigo" → "xxx'), escopo.slice(0, 60));
  assert.ok(escopo.includes('x'.repeat(600) + '…"') && !escopo.includes('x'.repeat(601)));
  // linha em branco não pode quebrar a separação resumo / motivo do cartão
  assert.strictEqual(R.cortarTexto('a\r\n\n\nb'), 'a\nb');
});

caso('ação "enviar e-mail": o cartão traz destinatário, assunto e o TEXTO do e-mail; edição de projeto/análise traz antes → depois', async () => {
  banco.responder = async (sql) => {
    if (/FROM propostas WHERE id/.test(sql)) return { rows: [{ id: 7, numero: 'P254', cliente_nome: 'Cliente Exemplo', total: 1000, status: 'Ativa' }] };
    if (/FROM laudos_projetos WHERE id/.test(sql)) return { rows: [{ id: 9, tipo: 'projeto', disciplina: 'cftv', titulo: 'Sede', dados: { cliente: { nome: 'Antigo' }, gravacao_dias: 15 } }] };
    if (/FROM analises_projeto WHERE id/.test(sql)) return { rows: [{ id: 3, nome_projeto: 'Prédio', cliente_nome: 'X', finalidade: 'orcamento', funcionamento: null, obra_id: null }] };
    return { rows: [] };
  };
  const mensagem = 'Bom dia,\n\n\nsegue a proposta revisada. Qualquer dúvida estou à disposição.';
  const a = await prepararAcao({ tipo: 'enviar_email_proposta', alvo_id: 7, payload: { destinatario: 'cliente@exemplo.com.br', mensagem }, descricao: 'pedido do usuário' });
  const [resumo, motivo] = a.descricao.split('\n\nMotivo informado pelo assistente: ');
  assert.strictEqual(motivo, 'pedido do usuário');
  assert.match(resumo, /Para: cliente@exemplo\.com\.br/);
  assert.match(resumo, /Assunto: Proposta P254 — H&M Engenharia e Tecnologia/);
  assert.match(resumo, /Texto: "Bom dia,\nsegue a proposta revisada\. Qualquer dúvida estou à disposição\."/);
  // sem mensagem: o texto padrão que vai sair
  const padrao = await prepararAcao({ tipo: 'enviar_email_proposta', alvo_id: 7, payload: { destinatario: 'cliente@exemplo.com.br' } });
  assert.match(padrao.descricao, /Texto: "Olá,\nSegue em anexo a proposta P254\."/);

  const pj = await prepararAcao({ tipo: 'atualizar_projeto', alvo_id: 9, payload: { dados: { cliente: { nome: 'Novo' }, gravacao_dias: 30 } } });
  assert.match(pj.descricao, /cliente: \{"nome":"Antigo"\} → \{"nome":"Novo"\}/);
  assert.match(pj.descricao, /gravacao_dias: 15 → 30/);
  const an = await prepararAcao({ tipo: 'atualizar_analise', alvo_id: 3, payload: { nome_projeto: 'Prédio novo', finalidade: 'elaboracao' } });
  assert.match(an.descricao, /nome_projeto: "Prédio" → "Prédio novo"/);
  assert.match(an.descricao, /finalidade: "orcamento" → "elaboracao"/);
  banco.responder = async () => ({ rows: [], rowCount: 0 });
});

// ════════ assistente: reserva da conversa antes de qualquer await ════════
caso('assistente: dois envios quase juntos na mesma conversa — o segundo recebe 409; "Parar" na reserva cancela', silencio(async () => {
  let id = 0;
  banco.responder = async (sql) => {
    await esperar(30); // o banco demora: antes os dois passavam pela conferência
    if (/RETURNING \*/.test(sql)) return { rows: [{ id: ++id, titulo: 'Nova conversa' }] };
    if (/RETURNING titulo/.test(sql)) return { rows: [{ titulo: 'oi' }] };
    return { rows: [] };
  };
  const g = E.criarGerenciador({ config: { maxSimultaneas: 1 } });
  const conversa = { id: 4242, titulo: 'Nova conversa' };
  const pedido = { usuario: { id: 1, nome: 'Teste' }, conversa, texto: 'oi', contexto: {} };
  const primeiro = g.iniciar(pedido);
  await assert.rejects(g.iniciar(pedido), (e) => e.status === 409);
  assert.ok(g.emAndamento(4242));
  assert.strictEqual(g.acompanhar(4242, () => {}), null, 'reserva: ainda não há o que acompanhar');
  assert.strictEqual(g.cancelar(4242), true);
  const { estado } = await primeiro;
  assert.strictEqual(estado.cancelado, true);
  for (let i = 0; i < 100 && g.emAndamento(4242); i++) await esperar(20);
  assert.strictEqual(g.emAndamento(4242), false, 'a marca sai no fim');
  assert.strictEqual(g.fila.estado().rodando, 0, 'cancelado na reserva não ocupa a fila');

  // falha ao gravar a mensagem: a reserva é solta (a conversa não fica travada)
  banco.responder = async () => { throw new Error('banco fora'); };
  await assert.rejects(g.iniciar({ ...pedido, conversa: { id: 4243, titulo: 'x' } }), /banco fora/);
  assert.strictEqual(g.emAndamento(4243), false);
  banco.responder = async () => ({ rows: [], rowCount: 0 });
}));

// ════════ exclusão do laudo: cópia das fotos/arquitetura antes, DELETE + auditoria juntos ════════
function cenarioExclusao({ fotosNovas = 0 } = {}) {
  const laudo = { id: 31, titulo: 'Laudo Exemplo', disciplina: 'spda', tipo: 'laudo', pasta: 'Laudo Exemplo', dados: { a: 1 } };
  banco.responder = async (sql) => {
    if (/SELECT \* FROM laudos_projetos WHERE id/.test(sql)) return { rows: [laudo] };
    if (/FROM laudos_projetos_fotos WHERE laudo_id = \$1 ORDER BY id/.test(sql)) {
      return { rows: [{ id: 1, nome_arquivo: 'fachada.jpg', mime: 'image/jpeg', conteudo: Buffer.from('jpg') }, { id: 2, nome_arquivo: null, mime: 'image/png', conteudo: Buffer.from('png') }] };
    }
    if (/FROM laudos_projetos_arquitetura/.test(sql)) return { rows: [{ nome_arquivo: 'ARQ.dwg', conteudo: Buffer.from('  0\nSECTION'), resumo: { ambientes: [] } }] };
    return { rows: [] };
  };
  const cl = { log: [], auditoria: [], release() {} };
  cl.query = async (sql, params) => {
    const s = String(sql).trim();
    cl.log.push(s);
    if (/^COMMIT/.test(s)) return { command: 'COMMIT', rows: [] };
    if (/count\(\*\)::int AS n FROM laudos_projetos_fotos/.test(s)) return { rows: [{ n: fotosNovas }] };
    if (/^DELETE FROM laudos_projetos/.test(s)) return { rows: [{ ...laudo }] };
    if (/INSERT INTO auditoria/.test(s)) cl.auditoria.push(JSON.parse(params[3]));
    return { rows: [] };
  };
  banco.cliente = cl;
  pastas.gravados = []; pastas.excluidos = [];
  return cl;
}
const resposta = () => ({ statusCode: 200, corpo: null, status(c) { this.statusCode = c; return this; }, json(b) { this.corpo = b; return this; } });

caso('exclusão do laudo: fotos e arquitetura copiadas para a pasta ANTES; DELETE e auditoria na mesma transação', silencio(async () => {
  const P = require('../src/utils/pastasSistema');
  const gravarOriginal = P.gravarArquivo;
  P.gravarArquivo = async (pasta, nome, conteudo) => { if (pastas.falharGravacao) throw new Error('pasta aberta em outro programa'); pastas.gravados.push([pasta.replace(/\\/g, '/'), nome, conteudo.length]); };
  try {
    const laudos = require('../src/controllers/laudosController');
    // tudo certo
    let cl = cenarioExclusao();
    let res = resposta();
    await laudos.remover({ params: { id: '31' }, usuario: { id: 1 } }, res);
    assert.deepStrictEqual(res.corpo, { ok: true });
    assert.deepStrictEqual(pastas.gravados.map(g => g.slice(0, 2)), [
      ['C:/falso/Laudos/Laudo Exemplo/Fotos (cópia ao excluir)', '1 - fachada.jpg'],
      ['C:/falso/Laudos/Laudo Exemplo/Fotos (cópia ao excluir)', '2 - foto.png'],
      ['C:/falso/Laudos/Laudo Exemplo/Arquitetura (cópia ao excluir)', 'ARQ.dxf'],
    ]);
    const ordem = cl.log.map(s => s.split(/\s+/).slice(0, 2).join(' '));
    assert.strictEqual(ordem[0], 'BEGIN');
    assert.ok(ordem.indexOf('DELETE FROM') < ordem.findIndex(s => s.startsWith('INSERT INTO')) && ordem.at(-1) === 'COMMIT', ordem.join(' | '));
    assert.strictEqual(cl.auditoria[0].fotos_copiadas.length, 2);
    assert.strictEqual(cl.auditoria[0].arquitetura_copiada.nome_arquivo, 'ARQ.dwg');
    assert.deepStrictEqual(pastas.excluidos, [['laudo', 31]]);

    // cópia falhou: 409 e nada excluído (nem transação aberta)
    cl = cenarioExclusao();
    pastas.falharGravacao = true;
    res = resposta();
    await laudos.remover({ params: { id: '31' }, usuario: { id: 1 } }, res);
    pastas.falharGravacao = false;
    assert.strictEqual(res.statusCode, 409);
    assert.match(res.corpo.erro, /nada foi excluído/);
    assert.strictEqual(cl.log.length, 0);
    assert.deepStrictEqual(pastas.excluidos, []);

    // foto nova chegou no meio: 409 e ROLLBACK
    cl = cenarioExclusao({ fotosNovas: 1 });
    res = resposta();
    await laudos.remover({ params: { id: '31' }, usuario: { id: 1 } }, res);
    assert.strictEqual(res.statusCode, 409);
    assert.ok(cl.log.includes('ROLLBACK') && !cl.log.some(s => /^DELETE/.test(s)));
  } finally {
    P.gravarArquivo = gravarOriginal;
    banco.responder = async () => ({ rows: [], rowCount: 0 });
  }
}));

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`robustez e segurança (revisão 2.3): ${ok}/${casos.length} casos ok`);
  process.exit(process.exitCode || 0);
})();
