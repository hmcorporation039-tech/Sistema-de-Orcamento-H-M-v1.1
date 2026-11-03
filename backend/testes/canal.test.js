// Canal remoto (Fase 6) — partes que não precisam do banco:
//   - assinatura dos webhooks (Telegram: segredo em tempo constante; WhatsApp: HMAC-SHA256 do corpo
//     bruto e o GET de verificação);
//   - leitura do corpo de cada provedor (só conversa particular; status do WhatsApp fora);
//   - interpretador local (cada comando, acento, caixa) e a busca aproximada (um, vários, nenhum);
//   - voz desligada e voz com whisper falso;
//   - LISTA ÚNICA de ferramentas (INT-05): o assistente e o Claude Desktop tiram da mesma lista, o
//     Desktop mantém os nomes e parâmetros de antes, e o financeiro só aparece para admin/financeiro.
// A parte com banco (fila, id duplicado, vínculo, ação pendente) fica em canalIntegracao.test.js.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const A = require('../src/services/canal/assinaturas');
const Pv = require('../src/services/canal/provedores');
const { interpretar } = require('../src/services/canal/interpretador');
const B = require('../src/services/canal/busca');
const voz = require('../src/services/canal/voz');
const { config, estadoDosCanais } = require('../src/services/canal/config');
const { partes } = require('../src/services/canal/adaptadores');
const F = require('../src/services/assistente/ferramentas');
const { aplicarEscolha } = require('../src/services/canal/comandos');

let ok = 0;
const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);
const importar = (arq) => import(require('url').pathToFileURL(path.join(__dirname, '..', 'src', 'mcp', arq)).href);

caso('Telegram: segredo certo passa; errado, vazio ou sem segredo configurado, não', () => {
  assert.strictEqual(A.conferirTelegram('segredo-123', 'segredo-123'), true);
  assert.strictEqual(A.conferirTelegram('segredo-124', 'segredo-123'), false);
  assert.strictEqual(A.conferirTelegram('segredo-123x', 'segredo-123'), false);
  assert.strictEqual(A.conferirTelegram('', 'segredo-123'), false);
  assert.strictEqual(A.conferirTelegram(undefined, 'segredo-123'), false);
  assert.strictEqual(A.conferirTelegram('qualquer', ''), false, 'sem segredo no .env recusa tudo');
  // a comparação é em tempo constante (timingSafeEqual dos hashes), não ===
  const fonte = fs.readFileSync(path.join(__dirname, '..', 'src', 'services', 'canal', 'assinaturas.js'), 'utf8');
  assert.match(fonte, /timingSafeEqual/);
});

caso('WhatsApp: HMAC-SHA256 do corpo BRUTO com o app secret', () => {
  const segredo = 'app-secret-de-teste';
  const corpo = Buffer.from('{"object":"whatsapp_business_account","entry":[]}');
  const assinatura = `sha256=${crypto.createHmac('sha256', segredo).update(corpo).digest('hex')}`;
  assert.strictEqual(A.conferirWhatsapp(corpo, assinatura, segredo), true);
  assert.strictEqual(A.conferirWhatsapp(corpo, assinatura.toUpperCase().replace('SHA256=', 'sha256='), segredo), true, 'hex em maiúsculas');
  assert.strictEqual(A.conferirWhatsapp(Buffer.from(`${corpo} `), assinatura, segredo), false, 'um byte a mais');
  assert.strictEqual(A.conferirWhatsapp(corpo, assinatura, 'outro-segredo'), false);
  assert.strictEqual(A.conferirWhatsapp(corpo, 'sha256=abc', segredo), false);
  assert.strictEqual(A.conferirWhatsapp(corpo, undefined, segredo), false);
  assert.strictEqual(A.conferirWhatsapp(corpo, assinatura, ''), false, 'sem app secret recusa tudo');
  assert.strictEqual(A.conferirWhatsapp(JSON.parse(corpo), assinatura, segredo), false, 'corpo já convertido em objeto não serve');
  // GET de verificação
  const q = { 'hub.mode': 'subscribe', 'hub.verify_token': 'combinado', 'hub.challenge': '1158201444' };
  assert.strictEqual(A.verificacaoWhatsapp(q, 'combinado'), '1158201444');
  assert.strictEqual(A.verificacaoWhatsapp({ ...q, 'hub.verify_token': 'errado' }, 'combinado'), null);
  assert.strictEqual(A.verificacaoWhatsapp({ ...q, 'hub.mode': 'unsubscribe' }, 'combinado'), null);
  assert.strictEqual(A.verificacaoWhatsapp(q, ''), null);
  assert.strictEqual(A.verificacaoWhatsapp({ ...q, 'hub.challenge': '<script>' }, 'combinado'), null, 'desafio só com caracteres seguros');
});

caso('provedores: Telegram só conversa particular; WhatsApp ignora status de entrega', () => {
  const tg = Pv.lerTelegram({ update_id: 77, message: { message_id: 1, chat: { id: 5551234, type: 'private' }, from: { first_name: 'Márcio' }, text: 'vencimentos' } });
  assert.deepStrictEqual(tg.map(m => [m.canal, m.id_externo, m.remetente, m.tipo, m.texto]), [['telegram', 'u77', '5551234', 'texto', 'vencimentos']]);
  assert.deepStrictEqual(Pv.lerTelegram({ update_id: 78, message: { chat: { id: -100, type: 'group' }, text: 'oi' } }), []);
  const voz1 = Pv.lerTelegram({ update_id: 79, message: { chat: { id: 9, type: 'private' }, voice: { file_id: 'AbC', mime_type: 'audio/ogg', duration: 3 } } });
  assert.strictEqual(voz1[0].tipo, 'audio'); assert.strictEqual(voz1[0].midia.file_id, 'AbC');
  const wa = Pv.lerWhatsapp({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: {
    contacts: [{ wa_id: '5561999998888', profile: { name: 'Fulano' } }],
    messages: [{ id: 'wamid.1', from: '5561999998888', type: 'text', text: { body: 'notas abertas' } }],
    statuses: [{ id: 'wamid.0', status: 'delivered' }],
  } }] }] });
  assert.deepStrictEqual(wa.map(m => [m.id_externo, m.remetente, m.texto, m.nome_remetente]), [['wamid.1', '5561999998888', 'notas abertas', 'Fulano']]);
  assert.deepStrictEqual(Pv.lerWhatsapp({ object: 'page' }), []);
});

caso('interpretador: cada comando, sem acento e sem caixa', () => {
  const c = (t) => interpretar(t);
  assert.deepStrictEqual(c('AJUDA'), { comando: 'ajuda' });
  assert.deepStrictEqual(c('/start'), { comando: 'ajuda' });
  assert.deepStrictEqual(c('Custos Santa Lúcia este mês'), { comando: 'custos', obra: 'santa lucia', mes: true });
  assert.deepStrictEqual(c('custos da obra OB-2026-003'), { comando: 'custos', obra: 'ob-2026-003', mes: false });
  assert.deepStrictEqual(c('gastos santa lucia no mes'), { comando: 'custos', obra: 'santa lucia', mes: true });
  assert.deepStrictEqual(c('NOTAS ABERTAS'), { comando: 'notas_a_receber' });
  assert.deepStrictEqual(c('notas em aberto'), { comando: 'notas_a_receber' });
  assert.deepStrictEqual(c('Notas a receber?'), { comando: 'notas_a_receber' });
  assert.deepStrictEqual(c('Vencimentos'), { comando: 'vencimentos' });
  assert.deepStrictEqual(c('o que está vencendo?'), { comando: 'vencimentos' });
  assert.deepStrictEqual(c('Proposta 254'), { comando: 'proposta', termo: '254' });
  assert.deepStrictEqual(c('proposta nº P045'), { comando: 'proposta', termo: 'p045' });
  assert.deepStrictEqual(c('pix sem obra'), { comando: 'pix_sem_obra' });
  assert.deepStrictEqual(c('Cotações'), { comando: 'cotacoes' });
  assert.deepStrictEqual(c('margem da obra santa lucia'), { comando: 'margem', obra: 'santa lucia' });
  assert.deepStrictEqual(c('Enviar P254 para Paróquia'), { comando: 'enviar_proposta', termo: 'p254', destino: 'paroquia', email: null });
  assert.deepStrictEqual(c('mande a proposta 12 pra Joao.Silva@Exemplo.com.br'), { comando: 'enviar_proposta', termo: '12', destino: 'Joao.Silva@Exemplo.com.br', email: 'Joao.Silva@Exemplo.com.br' });
  assert.deepStrictEqual(c('manda o projeto da Paróquia para o cliente'), { comando: 'enviar_projeto', termo: 'paroquia', destino: 'cliente', email: null });
  assert.deepStrictEqual(c('SIM 4821'), { comando: 'confirmar', codigo: '4821' });
  assert.deepStrictEqual(c('sim, 4821'), { comando: 'confirmar', codigo: '4821' });
  assert.deepStrictEqual(c('Sim'), { comando: 'confirmar', codigo: null });
  assert.deepStrictEqual(c('NÃO'), { comando: 'cancelar' });
  assert.deepStrictEqual(c('nao'), { comando: 'cancelar' });
  assert.deepStrictEqual(c('2'), { comando: 'escolha', indice: 2 });
  assert.deepStrictEqual(c('/vincular 123456'), { comando: 'vincular', codigo: '123456' });
  // pedido livre vai ao assistente
  assert.strictEqual(c('faz um orçamento de 12 câmeras'), null);
  assert.strictEqual(c('quanto gastei com cabo no mês passado e por quê?'), null);
  assert.strictEqual(c(''), null);
});

caso('busca aproximada: um claramente melhor, vários empatados (pergunta qual), nenhum', () => {
  const cand = [
    { id: 1, rotulo: 'OB-2026-001 — Hospital Santa Lúcia', texto: 'OB-2026-001 Hospital Santa Lúcia Hospital Santa Lucia SA' },
    { id: 2, rotulo: 'OB-2026-002 — Santa Lúcia Anexo', texto: 'OB-2026-002 Santa Lúcia Anexo Hospital Santa Lucia SA' },
    { id: 3, rotulo: 'OB-2026-003 — Paróquia Nossa Senhora', texto: 'OB-2026-003 Paróquia Nossa Senhora Aparecida' },
  ];
  const vários = B.escolher('santa lucia', cand);
  assert.ok(vários.varios && vários.varios.length === 2, JSON.stringify(vários));
  assert.deepStrictEqual(vários.varios.map(v => v.id).sort(), [1, 2]);
  assert.strictEqual(B.escolher('santa lúcia anexo', cand).unico?.id, 2);
  assert.strictEqual(B.escolher('PAROQUIA', cand).unico?.id, 3, 'sem acento e sem caixa');
  assert.strictEqual(B.escolher('paroq', cand).unico?.id, 3, 'começo da palavra');
  assert.strictEqual(B.escolher('paroqia nossa', cand).unico?.id, 3, 'um erro de digitação');
  assert.ok(B.escolher('subestação industrial', cand).nenhum);
  assert.strictEqual(B.escolher('x', [{ id: 9, rotulo: 'a', texto: 'b', exato: true }, ...cand]).unico.id, 9, 'código exato vence');
  assert.strictEqual(B.codigoDeObra('custos ob 2026-3'), 'OB-2026-003');
  assert.strictEqual(B.numeroDeProposta('P 254'), 'P254');
  // a resposta "2" completa o comando guardado
  const escolha = { campo: 'obra', comando: { comando: 'custos', obra: 'santa lucia', mes: true }, opcoes: [{ id: 1 }, { id: 2 }], expira_em: new Date(Date.now() + 60000).toISOString() };
  assert.deepStrictEqual(aplicarEscolha(escolha, 2).comando, { comando: 'custos', obra: 'santa lucia', mes: true, obra_id: 2 });
  assert.match(aplicarEscolha(escolha, 3).erro, /1 a 2/);
  assert.match(aplicarEscolha({ ...escolha, expira_em: new Date(Date.now() - 1000).toISOString() }, 1).erro, /expirou/);
  assert.match(aplicarEscolha(null, 1).erro, /Não há/);
});

caso('configuração: os dois canais desligados por padrão; estado sem segredos', () => {
  const c = config({});
  assert.strictEqual(c.telegram.ativo, false);
  assert.strictEqual(c.whatsapp.ativo, false);
  assert.strictEqual(c.acaoPrazoMin, 10);
  const e = estadoDosCanais({ CANAL_TELEGRAM_ATIVO: 'true', CANAL_TELEGRAM_TOKEN: 'tok-secreto', CANAL_TELEGRAM_SEGREDO: 'seg-secreto' });
  assert.strictEqual(e.telegram.ativo, true); assert.strictEqual(e.telegram.configurado, true);
  assert.ok(!JSON.stringify(e).includes('secreto'), 'o estado não mostra segredo');
  assert.deepStrictEqual(estadoDosCanais({}).whatsapp.faltando.length, 4);
  // texto longo vai em partes de até 4000 caracteres
  const p = partes(`${'a'.repeat(3000)}\n${'b'.repeat(3000)}`, 4000);
  assert.strictEqual(p.length, 2);
  assert.ok(p.every(x => x.length <= 4000));
});

caso('voz: sem WHISPER_* responde "não ativada"; com whisper (falso) vira texto', async () => {
  const semVoz = config({});
  assert.strictEqual(voz.vozDisponivel(semVoz), false);
  assert.deepStrictEqual(await voz.transcrever(Buffer.from('x'), { cfg: semVoz }), { erro: voz.NAO_ATIVADA });
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-voz-teste-'));
  try {
    const bin = path.join(pasta, 'whisper-cli.exe'); const modelo = path.join(pasta, 'ggml-base.bin');
    fs.writeFileSync(bin, ''); fs.writeFileSync(modelo, '');
    const cfg = config({ WHISPER_CPP_BIN: bin, WHISPER_MODELO: modelo, FFMPEG_BIN: 'ffmpeg-falso' });
    assert.strictEqual(voz.vozDisponivel(cfg), true);
    const chamados = [];
    const executar = async (comando, args) => {
      chamados.push(comando);
      if (comando === 'ffmpeg-falso') { fs.writeFileSync(args[args.length - 1], 'RIFF'); return { codigo: 0 }; }
      const base = args[args.indexOf('-of') + 1];
      assert.ok(args.includes('-l') && args[args.indexOf('-l') + 1] === 'pt');
      assert.ok(args[args.indexOf('-f') + 1].endsWith('audio.wav'), 'whisper recebe o WAV 16 kHz');
      fs.writeFileSync(`${base}.txt`, '  vencimentos \n');
      return { codigo: 0 };
    };
    assert.deepStrictEqual(await voz.transcrever(Buffer.from('ogg'), { cfg, executar }), { texto: 'vencimentos' });
    assert.deepStrictEqual(chamados, ['ffmpeg-falso', bin]);
    assert.ok((await voz.transcrever(Buffer.alloc(0), { cfg, executar })).erro);
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

caso('INT-05: lista única — assistente e Claude Desktop tiram as ferramentas do mesmo lugar', async () => {
  const cat = await importar('catalogoFerramentas.mjs');
  const desk = await importar('ferramentasDesktop.mjs');
  const comum = await importar('assistenteFerramentas.mjs');
  const api = async () => ({});
  const assistente = cat.ferramentasDoServidor('assistente', { api });
  const desktop = cat.ferramentasDoServidor('desktop', { api, pastasPdf: ['C:\\pasta'] });
  // assistente = a lista do --allowedTools (services/assistente/ferramentas.js)
  assert.deepStrictEqual(assistente.map(f => f.nome).sort(), F.FERRAMENTAS.map(f => f.nome).sort());
  // Desktop: os nomes e parâmetros que o Márcio já usa continuam iguais
  for (const [nome, params] of Object.entries(desk.INTERFACE_DESKTOP)) {
    const f = desktop.find(x => x.nome === nome);
    assert.ok(f, `Desktop perdeu a ferramenta ${nome}`);
    for (const p of params) assert.ok(Object.prototype.hasOwnProperty.call(f.entrada, p), `${nome}: parâmetro ${p} sumiu`);
    for (const p of Object.keys(f.entrada)) assert.ok(params.includes(p) || f.entrada[p].isOptional(), `${nome}: parâmetro novo obrigatório ${p}`);
  }
  // as compartilhadas são a MESMA definição nos dois servidores (descrição e parâmetros)
  for (const nome of comum.COMPARTILHADAS) {
    const a = assistente.find(x => x.nome === nome); const d = desktop.find(x => x.nome === nome);
    assert.ok(a && d, `compartilhada ausente: ${nome}`);
    assert.strictEqual(a.descricao, d.descricao, nome);
    assert.deepStrictEqual(Object.keys(a.entrada), Object.keys(d.entrada), nome);
  }
  // nenhuma ferramenta definida duas vezes; o Desktop não ganha as que gravam pela conversa do assistente
  assert.strictEqual(new Set(desktop.map(f => f.nome)).size, desktop.length);
  for (const so of ['propor_acao', 'editar_rascunho', 'ler_arquivo', 'gerar_orcamento', 'consultar_norma']) assert.ok(!desktop.some(f => f.nome === so), `${so} não é do Desktop`);
  // os servidores registram pelo catálogo (nada de registerTool escrito à mão)
  for (const arq of ['mcpServer.mjs', 'assistenteMcp.mjs']) {
    const fonte = fs.readFileSync(path.join(__dirname, '..', 'src', 'mcp', arq), 'utf8');
    assert.ok(!/registerTool\(\s*['"`]/.test(fonte), `${arq} registra ferramenta fora do catálogo`);
    assert.match(fonte, /ferramentasDoServidor\(/);
  }
  // o MCP do v2 continua apontando para a PORT do .env (3002), não para a produção
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'src', 'mcp', 'mcpServer.mjs'), 'utf8'), /MCP_API_URL \|\| `http:\/\/localhost:\$\{process\.env\.PORT \|\| 3001\}`/);
  // analisar_projeto do Desktop: PDF, DWG e DXF, 40 MB, obra_id e a pasta dos clientes (INT-05)
  const { pastasPermitidasPdf, TAMANHO_MAX_PDF } = require('../src/mcp/regras');
  assert.strictEqual(TAMANHO_MAX_PDF, 40 * 1024 * 1024);
  assert.ok(pastasPermitidasPdf({ PASTA_CLIENTES: 'C:\\Servidor\\Clientes' }, 'C:\\HM').some(p => /Servidor[\\/]Clientes$/.test(p)));
  assert.ok(desktop.find(f => f.nome === 'analisar_projeto').entrada.obra_id);
});

caso('papel: o financeiro só aparece para admin e financeiro (assistente e --allowedTools)', async () => {
  const cat = await importar('catalogoFerramentas.mjs');
  const api = async () => ({});
  const fin = ['custos_obra', 'margem_obra', 'pix_sem_obra', 'notas_fiscais', 'notas_a_receber'];
  const nomes = (papel) => cat.ferramentasDoServidor('assistente', { api, papel }).map(f => f.nome);
  for (const papel of ['user', 'tecnico']) {
    for (const n of fin) assert.ok(!nomes(papel).includes(n), `${papel} vê ${n}`);
    assert.ok(nomes(papel).includes('vencimentos'));
    assert.ok(!F.ferramentasPermitidas(papel).some(t => fin.some(n => t.endsWith(`__${n}`))), `--allowedTools de ${papel}`);
  }
  for (const papel of ['admin', 'financeiro']) for (const n of fin) assert.ok(nomes(papel).includes(n), `${papel} não vê ${n}`);
  // nomes novos sem palavra proibida e tipo de ação novo registrado no servidor
  for (const n of F.FERRAMENTAS.map(f => f.nome)) assert.ok(!F.PROIBIDAS.test(n), n);
  assert.ok(F.TIPOS_ACAO.includes('enviar_email_projeto'));
});

(async () => {
  for (const [nome, fn] of casos) {
    try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
  }
  console.log(`canal (sem banco): ${ok}/${casos.length} casos ok`);
  await require('../src/config/database').end().catch(() => {});
})();
