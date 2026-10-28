// Leitura automática de e-mail (notas/orçamentos e Pix) — revisão de
// 27/10/2026, seção [B1] itens 5, 9, 11 e 12. Tudo com FALSOS: não abre IMAP,
// não lê a caixa de verdade e não grava no banco. Rodar: node testes/leituraEmail.test.js
const assert = require('assert');

// pool falso antes de carregar os serviços (eles fazem require do pool real)
const poolFalso = { query: async () => ({ rows: [] }), connect: async () => { throw new Error('use o db injetado'); }, on() {} };
require.cache[require.resolve('../src/config/database')] = { id: 'db', filename: 'db', loaded: true, exports: poolFalso };

const E = require('../src/services/conexaoEmail');
const { lerPixNaCaixaDeEntrada } = require('../src/services/financeiroEmailService');
const { lerCaixaDeEntrada, processarOrcamentosPorEmail } = require('../src/services/notaFiscalEmailService');
const { criarRotinas } = require('../src/services/rotinas');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);
const silencioso = { log() {}, warn() {}, error() {} };
const calado = (fn) => async () => {
  const { warn, error, log } = console; console.warn = () => {}; console.error = () => {}; console.log = () => {};
  try { return await fn(); } finally { Object.assign(console, { warn, error, log }); }
};

// ── falsos ───────────────────────────────────────────────────────────────
const AUT_INTER = 'mx.google.com; dkim=pass header.i=@inter.co header.s=x; spf=pass; dmarc=pass (p=REJECT) header.from=inter.co';
function email({ assunto, html = '', de = 'no-reply@inter.co', aut = AUT_INTER, anexos = [] }) {
  return { subject: assunto, html, date: new Date('2026-10-20T12:00:00Z'), from: { value: [{ address: de }] }, headers: new Map([['authentication-results', aut]]), attachments: anexos };
}
const pixRecebido = (valor, nome) => email({ assunto: 'Pix recebido', html: `<p>Você recebeu um Pix no valor de R$ ${valor} de ${nome}, na conta 123</p>` });
const pixRealizado = (valor, id) => email({ assunto: 'Pix realizado', html: `<p>Em 01/08/2026, foi realizado um pagamento via Pix no valor de R$ ${valor}.</p><p>Nome:</p><p>Fulano de Tal</p><p>Data:</p><p>01/08/2026, às 12:56</p><p>ID Transação:</p><p>${id}</p>` });

// mensagens: [{ uid, emailId, messageId, assunto, conteudo | erroDownload }]
function imapFalso(mensagens, { uidValidity = 1n, caiNoDownload = false } = {}) {
  const imap = {
    usable: true, mailbox: { uidValidity }, logout: async () => { imap.saiu = true; }, downloads: [],
    async getMailboxLock() { return { release() {} }; },
    async search() { return mensagens.map(m => m.uid); },
    async *fetch(uids) { for (const m of mensagens) if (uids.includes(m.uid)) yield { uid: m.uid, emailId: m.emailId, envelope: { messageId: m.messageId, subject: m.assunto } }; },
    async download(uid) {
      imap.downloads.push(uid);
      const m = mensagens.find(x => x.uid === uid);
      if (m.erroDownload) { if (caiNoDownload) imap.usable = false; throw new Error(m.erroDownload); }
      return { content: m.conteudo };
    },
  };
  return imap;
}

// banco falso com as tabelas que as rotinas usam
function bancoFalso({ processados = [], movimentos = [] } = {}) {
  const b = { processados: [...processados], movimentos: [...movimentos], transacoes: 0, liberado: false };
  const cliente = {
    release() { b.liberado = true; },
    async query(sql, p = []) {
      const s = String(sql).trim();
      if (/^(BEGIN|COMMIT|ROLLBACK)/.test(s)) { if (/^BEGIN/.test(s)) b.transacoes++; return { rows: [] }; }
      if (/FROM emails_processados/.test(s)) {
        const [chave, legado, assunto] = p;
        const r = b.processados.find(x => x.message_id === chave)
          || b.processados.find(x => x.message_id === legado && [assunto, `[rejeitado] ${assunto}`.slice(0, 500), String(assunto).slice(0, 500)].includes(x.assunto));
        return { rows: r ? [r] : [] };
      }
      if (/^INSERT INTO emails_processados/.test(s)) {
        if (!b.processados.some(x => x.message_id === p[0])) b.processados.push({ message_id: p[0], assunto: p[1], itens_lidos: p[2], leitor_versao: p[3] });
        return { rows: [], rowCount: 1 };
      }
      if (/FROM financeiro_movimentos WHERE id_transacao/.test(s)) return { rows: b.movimentos.filter(m => m.id_transacao === p[0]) };
      if (/^INSERT INTO financeiro_movimentos/.test(s)) {
        if (b.movimentos.some(m => m.email_message_id === p[5])) return { rows: [], rowCount: 0 };
        b.movimentos.push({ tipo: p[0], nome: p[1], valor: p[2], id_transacao: p[4], email_message_id: p[5] });
        return { rows: [], rowCount: 1 };
      }
      return { rows: [] };
    },
  };
  b.db = { connect: async () => cliente };
  return b;
}
const conectaCom = (imap) => async () => imap;
const lerEmail = async (c) => c; // o "conteúdo" baixado já é o e-mail lido

// ════════ item 5 — falha de conexão: tenta de novo e vira ERRO ════════
caso('conexão: tenta 3 vezes com espera (30 s, 2 min) e conecta na 3ª', async () => {
  let n = 0; const esperas = [];
  const imap = await E.conectarComRetry({
    conectarFn: async () => { if (++n < 3) throw Object.assign(new Error('getaddrinfo ENOTFOUND imap.gmail.com'), { code: 'ENOTFOUND' }); return 'conectado'; },
    esperar: async (ms) => { esperas.push(ms); }, log: silencioso,
  });
  assert.strictEqual(imap, 'conectado');
  assert.deepStrictEqual(esperas, [30000, 120000]);
});

caso('conexão: sem rede depois das tentativas → FalhaConexaoEmail (code EMAIL_CONEXAO); senha errada não repete', async () => {
  let n = 0;
  await assert.rejects(E.conectarComRetry({ conectarFn: async () => { n++; throw new Error('getaddrinfo ENOTFOUND imap.gmail.com'); }, esperar: async () => {}, log: silencioso }),
    (e) => e instanceof E.FalhaConexaoEmail && e.code === 'EMAIL_CONEXAO' && e.tentativas === 3 && /ENOTFOUND/.test(e.message));
  assert.strictEqual(n, 3);
  n = 0;
  await assert.rejects(E.conectarComRetry({ conectarFn: async () => { n++; throw Object.assign(new Error('auth'), { authenticationFailed: true }); }, esperar: async () => {}, log: silencioso }), /credenciais inválidas/);
  assert.strictEqual(n, 1);
  assert.deepStrictEqual(E.esperasDaOrigem('manual'), [5000]);
});

caso('rotina de Pix sem conexão: rodada registrada como ERRO (antes "avisos", contada como sucesso)', async () => {
  const linhas = [];
  const db = { query: async (sql, p) => { if (/^INSERT INTO rotinas_execucoes/.test(sql)) { linhas.push({ id: 1, status: 'em_andamento' }); return { rows: [{ id: 1 }] }; } if (/^UPDATE rotinas_execucoes/.test(sql)) { Object.assign(linhas[0], { status: p[1], erro: p[4] }); } return { rows: [] }; } };
  const r = criarRotinas({ db, log: silencioso, definicoes: { 'pix-email': {
    nome: 'Pix', configurada: () => true, itens: (x) => x.movimentosImportados,
    executar: () => lerPixNaCaixaDeEntrada({ configurado: () => true, conectarEmail: () => E.conectarComRetry({ conectarFn: async () => { throw new Error('getaddrinfo ENOTFOUND imap.gmail.com'); }, esperas: [1], esperar: async () => {}, log: silencioso }) }),
  } } });
  await assert.rejects(r.executarRotina('pix-email', { origem: 'agendada' }), /Falha ao conectar ao e-mail/);
  assert.strictEqual(linhas[0].status, 'erro');
  assert.match(linhas[0].erro, /ENOTFOUND/);
});

caso('agenda: rodada que falhou é repescada em 15 min (até 4 vezes); sucesso volta ao horário normal', calado(async () => {
  const agendas = [];
  let falhar = true;
  const r = criarRotinas({ db: { query: async () => ({ rows: [{ id: 1 }] }) }, log: silencioso, agendar: (fn, ms) => agendas.push({ fn, ms }), definicoes: {
    x: { nome: 'X', configurada: () => true, executar: async () => { if (falhar) throw new Error('sem rede'); return { avisos: [] }; } },
  } });
  const antes = process.env.ROTINAS_AUTOMATICAS; process.env.ROTINAS_AUTOMATICAS = 'ligadas';
  try { r.agendarRotinas(); } finally { process.env.ROTINAS_AUTOMATICAS = antes; }
  // perto das 06:00/18:00 o próximo horário normal vem antes da repescagem (é a regra): não dá para testar agora
  if (agendas[0].ms <= 16 * 60 * 1000) { console.log('  (repescagem: perto do horário fixo, caso pulado)'); return; }
  for (let i = 1; i <= 4; i++) { await agendas[i - 1].fn(); assert.strictEqual(agendas[i].ms, 15 * 60 * 1000, `repescagem ${i}`); }
  await agendas[4].fn(); // 5ª falha seguida: volta ao horário normal
  assert.notStrictEqual(agendas[5].ms, 15 * 60 * 1000);
  falhar = false;
  await agendas[5].fn();
  assert.notStrictEqual(agendas[6].ms, 15 * 60 * 1000);
}));

// ════════ itens 9 e 11 — e-mail ilegível não trava; chave estável ════════
caso('Pix: e-mail ilegível vira aviso e os seguintes são lidos; chave = X-GM-MSGID; transação repetida não duplica', calado(async () => {
  const b = bancoFalso({ processados: [{ message_id: '40', assunto: 'Pix recebido' }], movimentos: [{ id_transacao: 'E123', email_message_id: 'gm:antigo' }] });
  const imap = imapFalso([
    { uid: 10, emailId: '111', assunto: 'Pix recebido', erroDownload: 'mensagem corrompida' },
    { uid: 20, emailId: '222', assunto: 'Pix realizado', conteudo: pixRealizado('291,00', 'E123') },
    { uid: 30, emailId: '333', assunto: 'Pix recebido', conteudo: pixRecebido('25.500,00', 'Hospital Prontonorte S A') },
    { uid: 40, assunto: 'Pix recebido', conteudo: pixRecebido('1,00', 'Já lido') }, // registro antigo pelo UID (mesmo assunto)
  ]);
  const r = await lerPixNaCaixaDeEntrada({ db: b.db, configurado: () => true, conectarEmail: conectaCom(imap), lerEmail, vincular: async () => {} });
  assert.deepStrictEqual(imap.downloads, [10, 20, 30], 'o UID 40 (já lido antes desta versão) não é baixado');
  assert.ok(r.avisos.some(a => /não pôde ser lido.*corrompida/.test(a)), 'aviso do e-mail ilegível');
  assert.ok(r.avisos.some(a => /E123.*já estava lançado/.test(a)), 'mesma transação não duplica');
  assert.strictEqual(r.movimentosImportados, 1);
  assert.strictEqual(b.movimentos.length, 2, 'o antigo + o recebido');
  assert.deepStrictEqual([b.movimentos[1].valor, b.movimentos[1].email_message_id], [25500, 'gm:333']);
  assert.ok(b.processados.some(p => p.message_id === 'gm:333') && b.processados.some(p => p.message_id === 'gm:222'));
  assert.ok(!b.processados.some(p => p.message_id === 'gm:111'), 'o ilegível fica para a próxima rodada');
  assert.ok(imap.saiu && b.liberado);
}));

caso('Pix: UID antigo com OUTRO assunto não é confundido (UIDVALIDITY mudou) — e-mail novo é lido', calado(async () => {
  const b = bancoFalso({ processados: [{ message_id: '50', assunto: 'Pix realizado' }] });
  const imap = imapFalso([{ uid: 50, emailId: '999', assunto: 'Pix recebido', conteudo: pixRecebido('10,00', 'Cliente Novo') }]);
  const r = await lerPixNaCaixaDeEntrada({ db: b.db, configurado: () => true, conectarEmail: conectaCom(imap), lerEmail, vincular: async () => {} });
  assert.strictEqual(r.movimentosImportados, 1);
}));

caso('chave da mensagem: X-GM-MSGID > Message-ID > UIDVALIDITY:UID', () => {
  assert.strictEqual(E.chaveDaMensagem({ emailId: '123', messageId: '<a@b>', uid: 5, uidValidity: '7' }), 'gm:123');
  assert.strictEqual(E.chaveDaMensagem({ messageId: ' <abc@mail.gmail.com> ', uid: 5 }), 'mid:abc@mail.gmail.com');
  assert.strictEqual(E.chaveDaMensagem({ uid: 5, uidValidity: '7' }), 'uid:7:5');
});

caso('conexão caiu no meio da leitura: a rodada vira erro (não marca o resto como lido)', calado(async () => {
  const b = bancoFalso();
  const imap = imapFalso([{ uid: 1, emailId: '1', assunto: 'Pix recebido', erroDownload: 'Socket closed' }, { uid: 2, emailId: '2', assunto: 'Pix recebido', conteudo: pixRecebido('1,00', 'X') }], { caiNoDownload: true });
  await assert.rejects(lerPixNaCaixaDeEntrada({ db: b.db, configurado: () => true, conectarEmail: conectaCom(imap), lerEmail, vincular: async () => {} }), /conexão com o e-mail caiu/);
  assert.strictEqual(b.processados.length, 0);
  assert.ok(b.liberado && imap.saiu, 'conexões devolvidas mesmo com erro');
}));

caso('notas: falha de conexão lança erro; e-mail ilegível não trava as notas seguintes', calado(async () => {
  await assert.rejects(lerCaixaDeEntrada({ configurado: () => true, conectarEmail: async () => { throw new E.FalhaConexaoEmail('ENOTFOUND', 3); } }), (e) => e.code === 'EMAIL_CONEXAO');
  const b = bancoFalso();
  const imap = imapFalso([
    { uid: 1, emailId: 'a', assunto: 'DANFE 1', erroDownload: 'parse falhou' },
    { uid: 2, emailId: 'b', assunto: 'DANFE 2', conteudo: email({ assunto: 'DANFE 2', de: 'nfe@fornecedor.com.br', aut: 'mx.google.com; dkim=pass header.i=@fornecedor.com.br; dmarc=pass header.from=fornecedor.com.br' }) },
  ]);
  const processadas = [];
  const r = await lerCaixaDeEntrada({
    db: b.db, configurado: () => true, conectarEmail: conectaCom(imap), lerEmail,
    processar: async (c, em) => { processadas.push(em.subject); }, orcamentos: async () => {},
    margemPadrao: async () => 30, indiceCatalogo: async () => ({}), encerrar: async () => {}, classificar: async () => ({}),
  });
  assert.deepStrictEqual(processadas, ['DANFE 2']);
  assert.strictEqual(r.emailsProcessados, 1);
  assert.ok(r.avisos.some(a => /não pôde ser lido/.test(a)));
  assert.ok(b.processados.some(p => p.message_id === 'gm:b'));
}));

// ════════ item 12 — orçamento por e-mail só de remetente autêntico ════════
caso('orçamento por e-mail sem DKIM/DMARC válido: ignorado (registrado como rejeitado); com assinatura: importado', calado(async () => {
  const b = bancoFalso();
  const cliente = await b.db.connect();
  const anexo = { filename: 'orcamento.pdf', contentType: 'application/pdf', content: Buffer.from('%PDF'), size: 4 };
  const imap = imapFalso([
    { uid: 1, emailId: 'f1', assunto: 'Orçamento', conteudo: email({ assunto: 'Orçamento', de: 'vendas@golpe.com', aut: 'mx.google.com; dkim=fail header.i=@golpe.com; dmarc=fail header.from=golpe.com', anexos: [anexo] }) },
    { uid: 2, emailId: 'f2', assunto: 'Orçamento 2', conteudo: email({ assunto: 'Orçamento 2', de: 'vendas@loja.com.br', aut: 'mx.google.com; dkim=pass header.i=@loja.com.br; dmarc=pass header.from=loja.com.br', anexos: [anexo] }) },
  ]);
  const importados = [];
  const resumo = { emailsEncontrados: 0, emailsProcessados: 0, materiaisCriados: 0, materiaisAtualizados: 0, orcamentosImportados: 0, leiturasPorIA: 0, avisos: [] };
  await processarOrcamentosPorEmail(imap, cliente, 30, {}, resumo, {
    lerEmail,
    lerDocumento: async () => ({ itens: [{ descricao: 'Cabo', preco: 1 }], avisos: [] }),
    importar: async (c, i, leitura) => { importados.push(leitura); return { criados: 1, atualizados: 0 }; },
  });
  assert.strictEqual(importados.length, 1, 'só o autêntico');
  assert.ok(resumo.avisos.some(a => /golpe\.com.*DKIM\/DMARC/.test(a)));
  const rej = b.processados.find(p => p.message_id === 'gm:f1');
  assert.ok(rej && /^\[rejeitado\]/.test(rej.assunto), 'rejeitado não volta a ser lido');
  assert.ok(b.processados.some(p => p.message_id === 'gm:f2' && p.itens_lidos === 1));
}));

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`leitura de e-mail: ${ok}/${casos.length} casos ok`);
  process.exit(process.exitCode || 0);
})();
