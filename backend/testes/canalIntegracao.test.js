// Canal remoto (Fase 6) — integração com o BANCO DE TESTE (hm_orcamentos_v2) e a API de verdade numa
// porta livre, sem provedor e sem IA: o adaptador de envio, o assistente e o executor das ações são
// FALSOS (nada sai para o Telegram/WhatsApp, nenhum e-mail é enviado). Confere:
//   - canal desligado → 404; assinatura inválida → 401 (nada entra na fila); válida → 200 e resposta;
//   - id externo repetido (reenvio do provedor) → processado UMA vez;
//   - quem não tem vínculo verificado só recebe "Use /vincular <código> gerado no sistema.";
//   - comandos locais (vencimentos, custos com escolha "qual delas?", financeiro só para admin/financeiro),
//     o resto vai ao assistente;
//   - ação pendente: confirma, código errado, NÃO, prazo vencido, registro que mudou, usuário sem
//     permissão; o envio pelo canal passa pela conferência de envio da tela (INT-03);
//   - auditoria de cada mensagem e ação; simulador da tela (admin);
//   - e, com o módulo de segurança real (services/telefonesVerificados.js), o /vincular de verdade.
// Só roda com DB_NAME=hm_orcamentos_v2; apaga tudo o que cria.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const path = require('path');
const crypto = require('crypto');

const BANCO_DE_TESTE = 'hm_orcamentos_v2';
if (process.env.DB_NAME !== BANCO_DE_TESTE) {
  console.log(`canalIntegracao: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  process.exit(0);
}

// canais ligados SÓ neste processo, com segredos de teste (nada real)
const SEGREDO_TG = `seg-tg-${crypto.randomBytes(6).toString('hex')}`;
const SEGREDO_WA = `seg-wa-${crypto.randomBytes(6).toString('hex')}`;
const VERIFY_WA = `verif-${crypto.randomBytes(4).toString('hex')}`;
Object.assign(process.env, {
  CANAL_TELEGRAM_ATIVO: 'true', CANAL_TELEGRAM_TOKEN: '', CANAL_TELEGRAM_SEGREDO: SEGREDO_TG,
  CANAL_WHATSAPP_ATIVO: 'true', CANAL_WHATSAPP_TOKEN: '', CANAL_WHATSAPP_APP_SECRET: SEGREDO_WA, CANAL_WHATSAPP_VERIFY_TOKEN: VERIFY_WA,
  CANAL_ACAO_PRAZO_MIN: '10', WHISPER_CPP_BIN: '', WHISPER_MODELO: '',
});

const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/database');
const { criarTabelas } = require('../src/models/schema');
const { JWT_SECRET } = require('../src/config/segredos');
const T = require('../src/services/canal/trabalhador');
const { substituirDependencias, dependencias } = require('../src/services/canal/dependencias');
const P = require('../src/services/canal/acoesPendentes');
const { conversaDoContato } = require('../src/services/canal/assistenteCanal');

const MARCA = `zzcanal${Date.now().toString(36)}`;
const criado = { usuarios: [], obras: [], propostas: [], movimentos: [], chats: new Set() };
let base; let servidor;
let ok = 0;

function app() {
  const a = express();
  a.use('/api/canal/webhook', require('../src/controllers/canalController').corpoBrutoDosWebhooks());
  a.use(express.json({ limit: '5mb' }));
  a.use('/api', require('../src/routes'));
  a.use(require('../src/middleware/erros').tratarErros);
  return a;
}

// ── dublês ────────────────────────────────────────────────────────────────
const vinculos = new Map(); // `${canal}:${id}` → usuário { id, nome, email, papel }
const auditorias = [];
const enviados = [];
const executadas = [];
const seg = {
  seguranca: true,
  usuarioPeloCanal: async (canal, id) => vinculos.get(`${canal}:${id}`) || null,
  confirmarVinculo: async (canal, id, codigo) => {
    if (codigo !== '123456') return { ok: false, motivo: 'codigo_invalido' };
    const u = criado.usuarios[0];
    vinculos.set(`${canal}:${id}`, { id: u.id, nome: u.nome, email: u.email, papel: 'admin' });
    return { ok: true, usuario: { id: u.id, nome: u.nome } };
  },
  registrarAuditoria: async (r) => { auditorias.push(r); },
};
const adaptadorFalso = (canal) => ({ canal, async enviar(id, texto) { enviados.push({ canal, id: String(id), texto }); return { enviado: true }; }, async baixarAudio() { return null; } });
let executorFalha = null;
const trab = T.criarTrabalhador({
  seg: () => seg,
  adaptador: adaptadorFalso,
  assistente: async ({ texto }) => ({ texto: `ASSISTENTE: ${texto}` }),
  executar: async (acao) => { if (executorFalha) throw executorFalha; executadas.push(acao.id); return { mensagem: `executada ${acao.tipo}` }; },
});

async function req(metodo, caminho, { corpo, bruto, headers = {}, token } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let body;
  if (bruto !== undefined) { body = bruto; h['Content-Type'] = h['Content-Type'] || 'application/json'; }
  else if (corpo !== undefined) { body = JSON.stringify(corpo); h['Content-Type'] = 'application/json'; }
  const r = await fetch(`${base}${caminho}`, { method: metodo, headers: h, body });
  const texto = await r.text();
  let dados; try { dados = JSON.parse(texto); } catch { dados = texto; }
  return { status: r.status, dados };
}

let updateId = Math.floor(Date.now() / 1000);
const chatDe = (n) => { const c = String(880000000 + (Date.now() % 1000000) * 10 + n); criado.chats.add(c); return c; };

// manda pelo webhook do Telegram (assinado) e espera a resposta do trabalhador
async function telegram(chat, texto, { id = ++updateId, segredo = SEGREDO_TG } = {}) {
  const antes = enviados.length;
  const r = await req('POST', '/api/canal/webhook/telegram', {
    bruto: JSON.stringify({ update_id: id, message: { message_id: id, chat: { id: Number(chat), type: 'private' }, from: { first_name: 'Teste' }, text: texto } }),
    headers: { 'X-Telegram-Bot-Api-Secret-Token': segredo },
  });
  await trab.esperarOcioso();
  const novas = enviados.slice(antes).filter(e => e.id === String(chat));
  return { status: r.status, resposta: novas.length ? novas[novas.length - 1].texto : null, todas: novas };
}

const casos = [];
const caso = (nome, fn) => casos.push([nome, fn]);

caso('canal desligado responde 404 (os dois provedores)', async () => {
  process.env.CANAL_TELEGRAM_ATIVO = 'false'; process.env.CANAL_WHATSAPP_ATIVO = 'false';
  try {
    assert.strictEqual((await req('POST', '/api/canal/webhook/telegram', { bruto: '{}', headers: { 'X-Telegram-Bot-Api-Secret-Token': SEGREDO_TG } })).status, 404);
    assert.strictEqual((await req('POST', '/api/canal/webhook/whatsapp', { bruto: '{}' })).status, 404);
    assert.strictEqual((await req('GET', `/api/canal/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_WA}&hub.challenge=123`)).status, 404);
  } finally {
    process.env.CANAL_TELEGRAM_ATIVO = 'true'; process.env.CANAL_WHATSAPP_ATIVO = 'true';
  }
});

caso('Telegram: assinatura inválida → 401 e nada na fila; válida → 200 e resposta', async () => {
  const chat = chatDe(1);
  const r = await telegram(chat, 'ajuda', { segredo: 'errado' });
  assert.strictEqual(r.status, 401);
  const semCabecalho = await req('POST', '/api/canal/webhook/telegram', { bruto: JSON.stringify({ update_id: ++updateId, message: { chat: { id: Number(chat), type: 'private' }, text: 'ajuda' } }) });
  assert.strictEqual(semCabecalho.status, 401);
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM canal_mensagens WHERE canal = $1 AND remetente = $2', ['telegram', chat]);
  assert.strictEqual(rows[0].n, 0, 'assinatura inválida não entra na fila');
  assert.ok(auditorias.some(a => a.acao === 'canal_assinatura_invalida'));
  const certo = await telegram(chat, 'ajuda');
  assert.strictEqual(certo.status, 200);
  assert.strictEqual(certo.resposta, T.NAO_VINCULADO, 'sem vínculo: só o aviso do /vincular');
});

caso('id externo repetido (reenvio do provedor) é processado uma vez só', async () => {
  const chat = chatDe(2);
  vinculos.set(`telegram:${chat}`, papelDe(0, 'admin'));
  const id = ++updateId;
  const a = await telegram(chat, 'vencimentos', { id });
  const b = await telegram(chat, 'vencimentos', { id });
  assert.strictEqual(a.status, 200); assert.strictEqual(b.status, 200);
  assert.strictEqual(a.todas.length, 1);
  assert.strictEqual(b.todas.length, 0, 'a cópia não gerou outra resposta');
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM canal_mensagens WHERE canal = $1 AND id_externo = $2', ['telegram', `u${id}`]);
  assert.strictEqual(rows[0].n, 1);
});

caso('WhatsApp: GET de verificação, HMAC válido/inválido e corpo alterado', async () => {
  const ok1 = await req('GET', `/api/canal/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_WA}&hub.challenge=987654`);
  assert.strictEqual(ok1.status, 200); assert.strictEqual(String(ok1.dados), '987654');
  assert.strictEqual((await req('GET', '/api/canal/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=987654')).status, 403);
  const fone = `55619${String(Date.now()).slice(-8)}`;
  criado.chats.add(fone);
  const corpo = JSON.stringify({ object: 'whatsapp_business_account', entry: [{ changes: [{ value: { messages: [{ id: `wamid.${MARCA}`, from: fone, type: 'text', text: { body: 'ajuda' } }] } }] }] });
  const assinatura = `sha256=${crypto.createHmac('sha256', SEGREDO_WA).update(Buffer.from(corpo)).digest('hex')}`;
  assert.strictEqual((await req('POST', '/api/canal/webhook/whatsapp', { bruto: corpo, headers: { 'X-Hub-Signature-256': 'sha256=' + '0'.repeat(64) } })).status, 401);
  assert.strictEqual((await req('POST', '/api/canal/webhook/whatsapp', { bruto: corpo.replace('ajuda', 'ajudA'), headers: { 'X-Hub-Signature-256': assinatura } })).status, 401, 'corpo alterado');
  const antes = enviados.length;
  assert.strictEqual((await req('POST', '/api/canal/webhook/whatsapp', { bruto: corpo, headers: { 'X-Hub-Signature-256': assinatura } })).status, 200);
  await trab.esperarOcioso();
  const r = enviados.slice(antes).find(e => e.canal === 'whatsapp' && e.id === fone);
  assert.strictEqual(r?.texto, T.NAO_VINCULADO);
});

caso('vínculo: /vincular errado não liga; certo liga e passa a atender', async () => {
  const chat = chatDe(3);
  assert.strictEqual((await telegram(chat, 'vencimentos')).resposta, T.NAO_VINCULADO);
  assert.match((await telegram(chat, '/vincular 000000')).resposta, /inválido/);
  assert.strictEqual((await telegram(chat, 'notas abertas')).resposta, T.NAO_VINCULADO);
  assert.match((await telegram(chat, '/vincular 123456')).resposta, /ligado à sua conta/);
  const v = (await telegram(chat, 'Vencimentos')).resposta;
  assert.match(v, /^(Vencimentos|Nada vencido|Nenhum vencimento)/);
});

caso('comandos: custos com "qual delas?", escolha pelo número, financeiro só admin/financeiro, resto ao assistente', async () => {
  const chat = chatDe(4);
  vinculos.set(`telegram:${chat}`, papelDe(0, 'admin'));
  const pergunta = (await telegram(chat, `custos ${MARCA} lucena`)).resposta;
  assert.match(pergunta, /Achei mais de uma obra/);
  assert.match(pergunta, /1\) .*\n2\) /);
  const custos = (await telegram(chat, '1')).resposta;
  assert.match(custos, /^Custos da obra/);
  // o nome mais completo resolve sem perguntar; acento e caixa não importam
  const unico = (await telegram(chat, `CUSTOS ${MARCA.toUpperCase()} LUCENA ANEXO este mês`)).resposta;
  assert.match(unico, /^Custos da obra .*Anexo/);
  assert.match(unico, /Material: R\$\s?123,45/);
  // financeiro: técnico não vê
  const tec = chatDe(5);
  vinculos.set(`telegram:${tec}`, papelDe(2, 'tecnico'));
  assert.match((await telegram(tec, `custos ${MARCA} lucena anexo`)).resposta, /só para o administrador e o financeiro/);
  assert.match((await telegram(tec, 'notas abertas')).resposta, /só para o administrador e o financeiro/);
  // pedido livre → assistente (dublê)
  assert.strictEqual((await telegram(chat, 'faz um orçamento de 12 câmeras')).resposta, 'ASSISTENTE: faz um orçamento de 12 câmeras');
  // proposta pelo número
  assert.match((await telegram(chat, `proposta ${criado.propostas[0].numero}`)).resposta, new RegExp(`^Proposta ${criado.propostas[0].numero}`));
  assert.ok(auditorias.filter(a => a.acao === 'canal_mensagem').length >= 5, 'cada mensagem auditada');
});

caso('envio pelo canal passa pela conferência de envio da tela (INT-03): proposta sem itens é recusada', async () => {
  const chat = chatDe(6);
  vinculos.set(`telegram:${chat}`, papelDe(0, 'admin'));
  const r = (await telegram(chat, `enviar ${criado.propostas[0].numero} para cliente.teste@exemplo.com.br`)).resposta;
  assert.match(r, /Conferência antes do envio/);
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM assistente_acoes WHERE canal = 'telegram' AND canal_id_externo = $1", [chat]);
  assert.strictEqual(rows[0].n, 0, 'nenhuma ação pendente criada');
});

// cria uma ação pendente do canal (mudar status da proposta) para o chat
async function acaoPara(chat, usuarioIdx, propostaIdx = 1) {
  const u = criado.usuarios[usuarioIdx];
  const contato = await T.contatoDe({ canal: 'telegram', remetente: chat });
  const usuario = vinculos.get(`telegram:${chat}`);
  const conversa = await conversaDoContato({ ...contato, canal: 'telegram', id_externo: chat }, usuario);
  const { acao, texto } = await P.criarAcaoDoCanal({
    contato: { canal: 'telegram', id_externo: chat }, usuario: { ...usuario, id: u.id }, conversaId: conversa.id,
    tipo: 'mudar_status_proposta', alvo_id: criado.propostas[propostaIdx].id, payload: { status: 'Cancelada' }, descricao: 'teste do canal',
  });
  assert.match(texto, new RegExp(`SIM ${acao.codigo} \\(vale 10 min\\)`));
  return acao;
}
const statusDa = async (id) => (await pool.query('SELECT status, resultado FROM assistente_acoes WHERE id = $1', [id])).rows[0];

caso('ação pendente: código errado não executa; SIM <código> executa uma vez; NÃO cancela', async () => {
  const chat = chatDe(7);
  vinculos.set(`telegram:${chat}`, papelDe(0, 'admin'));
  const acao = await acaoPara(chat, 0);
  const errado = acao.codigo === '1000' ? '1001' : '1000';
  assert.match((await telegram(chat, `SIM ${errado}`)).resposta, /Código não confere/);
  assert.strictEqual((await statusDa(acao.id)).status, 'pendente');
  assert.match((await telegram(chat, 'sim')).resposta, /SIM seguido do código/);
  assert.match((await telegram(chat, `sim ${acao.codigo}`)).resposta, /^Feito\. executada mudar_status_proposta/);
  assert.strictEqual((await statusDa(acao.id)).status, 'aplicada');
  assert.deepStrictEqual(executadas.filter(id => id === acao.id), [acao.id]);
  assert.match((await telegram(chat, `SIM ${acao.codigo}`)).resposta, /Não há nenhuma ação/);
  assert.deepStrictEqual(executadas.filter(id => id === acao.id), [acao.id], 'não executa duas vezes');
  const outra = await acaoPara(chat, 0);
  assert.match((await telegram(chat, 'NÃO')).resposta, /Cancelado/);
  assert.strictEqual((await statusDa(outra.id)).status, 'descartada');
  assert.ok(!executadas.includes(outra.id));
  assert.ok(auditorias.some(a => a.acao === 'acao_confirmada') && auditorias.some(a => a.acao === 'acao_cancelada') && auditorias.some(a => a.acao === 'acao_codigo_errado'));
});

caso('ação pendente: prazo vencido e registro que mudou não executam', async () => {
  const chat = chatDe(8);
  vinculos.set(`telegram:${chat}`, papelDe(0, 'admin'));
  const vencida = await acaoPara(chat, 0);
  await pool.query("UPDATE assistente_acoes SET expira_em = NOW() - INTERVAL '1 minute' WHERE id = $1", [vencida.id]);
  assert.match((await telegram(chat, `SIM ${vencida.codigo}`)).resposta, /prazo/i);
  assert.strictEqual((await statusDa(vencida.id)).status, 'descartada');
  assert.ok(!executadas.includes(vencida.id));
  // a proposta mudou (outra versão) depois do resumo: não executa
  const mudou = await acaoPara(chat, 0);
  await pool.query('UPDATE propostas SET versao = versao + 1, total = total + 10 WHERE id = $1', [criado.propostas[1].id]);
  assert.match((await telegram(chat, `SIM ${mudou.codigo}`)).resposta, /mudou depois que a ação foi preparada/);
  const s = await statusDa(mudou.id);
  assert.strictEqual(s.status, 'descartada'); assert.strictEqual(s.resultado.motivo, 'mudou');
  assert.ok(!executadas.includes(mudou.id));
});

caso('ação pendente: quem perdeu a permissão (papel ou posse) não confirma', async () => {
  const chat = chatDe(9);
  vinculos.set(`telegram:${chat}`, papelDe(1, 'user')); // dono da proposta 2
  const acao = await acaoPara(chat, 1, 2);
  vinculos.set(`telegram:${chat}`, papelDe(1, 'tecnico'));
  assert.match((await telegram(chat, `SIM ${acao.codigo}`)).resposta, /Sem permissão/);
  assert.strictEqual((await statusDa(acao.id)).status, 'descartada');
  assert.ok(!executadas.includes(acao.id));
  // posse: a proposta passou a ser de outro usuário
  vinculos.set(`telegram:${chat}`, papelDe(1, 'user'));
  const outra = await acaoPara(chat, 1, 2);
  await pool.query('UPDATE propostas SET usuario_id = $2 WHERE id = $1', [criado.propostas[2].id, criado.usuarios[0].id]);
  assert.match((await telegram(chat, `SIM ${outra.codigo}`)).resposta, /criado por outro usuário/);
  assert.ok(!executadas.includes(outra.id));
  // o chat perdeu o vínculo
  vinculos.set(`telegram:${chat}`, papelDe(0, 'admin'));
  const terceira = await acaoPara(chat, 0, 2);
  vinculos.delete(`telegram:${chat}`);
  assert.strictEqual((await telegram(chat, `SIM ${terceira.codigo}`)).resposta, T.NAO_VINCULADO);
  assert.strictEqual((await statusDa(terceira.id)).status, 'pendente', 'sem vínculo nem chega a confirmar');
});

caso('simulador da tela: só admin; passa pela mesma fila e responde', async () => {
  const admin = criado.usuarios[0]; const comum = criado.usuarios[1];
  const tok = (u) => jwt.sign({ id: u.id, nome: u.nome, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '10m', algorithm: 'HS256' });
  assert.strictEqual((await req('POST', '/api/canal/simular', { corpo: { texto: 'ajuda' } })).status, 401);
  assert.strictEqual((await req('POST', '/api/canal/simular', { corpo: { texto: 'ajuda' }, token: tok(comum) })).status, 403);
  assert.strictEqual((await req('GET', '/api/canal/estado', { token: tok(comum) })).status, 403);
  const r = await req('POST', '/api/canal/simular', { corpo: { texto: 'ajuda' }, token: tok(admin) });
  assert.strictEqual(r.status, 202);
  await trab.esperarOcioso();
  const m = await req('GET', `/api/canal/mensagens/${r.dados.id}`, { token: tok(admin) });
  assert.strictEqual(m.dados.estado, 'respondida');
  assert.match(m.dados.resposta, /^Comandos/);
  const sem = await req('POST', '/api/canal/simular', { corpo: { texto: 'ajuda', sem_vinculo: true }, token: tok(admin) });
  await trab.esperarOcioso();
  assert.strictEqual((await req('GET', `/api/canal/mensagens/${sem.dados.id}`, { token: tok(admin) })).dados.resposta, T.NAO_VINCULADO);
  const est = await req('GET', '/api/canal/estado', { token: tok(admin) });
  assert.strictEqual(est.status, 200);
  assert.ok(!JSON.stringify(est.dados).includes(SEGREDO_TG), 'estado sem segredo');
  // consultas do financeiro: exigem admin/financeiro
  assert.strictEqual((await req('GET', `/api/consultas/obras/${criado.obras[0].id}/custos`, { token: tok(comum) })).status, 403);
  const c = await req('GET', `/api/consultas/obras/${criado.obras[1].id}/custos?mes=1`, { token: tok(admin) });
  assert.strictEqual(c.status, 200); assert.match(c.dados.texto, /Material/);
  assert.strictEqual((await req('GET', '/api/consultas/vencimentos', { token: tok(comum) })).status, 200);
});

caso('INT-08 na tela do assistente: "Aplicar" com prazo vencido ou registro que mudou não executa', async () => {
  const { prepararAcao } = require('../src/services/assistente/acoes');
  const admin = criado.usuarios[0];
  const token = jwt.sign({ id: admin.id, nome: admin.nome, email: admin.email, role: admin.role }, JWT_SECRET, { expiresIn: '10m', algorithm: 'HS256' });
  const { rows: [conv] } = await pool.query("INSERT INTO assistente_conversas (usuario_id, titulo) VALUES ($1, 'teste INT-08') RETURNING id", [admin.id]);
  const nova = async (expira) => {
    const p = await prepararAcao({ tipo: 'mudar_status_proposta', alvo_id: criado.propostas[0].id, payload: { status: 'Recusada' }, descricao: 'teste' });
    const { rows: [a] } = await pool.query(
      `INSERT INTO assistente_acoes (conversa_id, usuario_id, tipo, alvo_tipo, alvo_id, descricao, payload, impressao, expira_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, [conv.id, admin.id, p.tipo, p.alvo_tipo, p.alvo_id, p.descricao, p.payload, p.impressao, expira]);
    return a.id;
  };
  const vencida = await nova(new Date(Date.now() - 60000));
  const r1 = await req('POST', `/api/assistente/acoes/${vencida}/aplicar`, { token });
  assert.strictEqual(r1.status, 409); assert.strictEqual(r1.dados.motivo, 'expirou');
  const mudou = await nova(new Date(Date.now() + 3600000));
  await pool.query('UPDATE propostas SET versao = versao + 1 WHERE id = $1', [criado.propostas[0].id]);
  const r2 = await req('POST', `/api/assistente/acoes/${mudou}/aplicar`, { token });
  assert.strictEqual(r2.status, 409); assert.strictEqual(r2.dados.motivo, 'mudou');
  const { rows } = await pool.query("SELECT status FROM propostas WHERE id = $1", [criado.propostas[0].id]);
  assert.strictEqual(rows[0].status, 'Ativa', 'nada executado');
  assert.strictEqual((await statusDa(mudou)).status, 'descartada');
});

caso('módulo de segurança REAL (telefonesVerificados.js): /vincular de verdade e auditoria na tabela', async () => {
  substituirDependencias(null);
  const real = dependencias();
  if (!real.seguranca) { console.log('    (módulo de segurança ainda não existe: caso pulado)'); return; }
  const TV = require('../src/services/telefonesVerificados');
  const realTrab = T.criarTrabalhador({ adaptador: adaptadorFalso, assistente: async () => ({ texto: 'x' }), executar: async () => ({}) });
  T.substituirTrabalhador(realTrab);
  try {
    const chat = chatDe(10);
    const u = criado.usuarios[0];
    const antes = enviados.length;
    const mandar = async (texto) => {
      await req('POST', '/api/canal/webhook/telegram', { bruto: JSON.stringify({ update_id: ++updateId, message: { chat: { id: Number(chat), type: 'private' }, text: texto } }), headers: { 'X-Telegram-Bot-Api-Secret-Token': SEGREDO_TG } });
      await realTrab.esperarOcioso();
      return enviados.slice(antes).filter(e => e.id === chat).pop()?.texto;
    };
    assert.strictEqual(await mandar('vencimentos'), T.NAO_VINCULADO);
    const { codigo } = await TV.gerarCodigoVinculo(u.id, 'telegram');
    assert.match(await mandar(`/vincular ${codigo}`), /ligado à sua conta/);
    assert.match(await mandar('vencimentos'), /^(Vencimentos|Nada vencido|Nenhum vencimento)/);
    const { rows } = await pool.query("SELECT acao, origem FROM auditoria WHERE entidade = 'acesso' AND usuario_id = $1 AND origem = 'telegram' ORDER BY id", [u.id]);
    assert.ok(rows.some(r => r.acao === 'vinculo_confirmado'), 'vínculo auditado');
    assert.ok(rows.some(r => r.acao === 'canal_mensagem'), 'mensagem auditada');
  } finally {
    T.substituirTrabalhador(trab);
  }
});

function papelDe(idx, papel) {
  const u = criado.usuarios[idx];
  return { id: u.id, nome: u.nome, email: u.email, papel };
}

(async () => {
  try {
    await criarTabelas();
    await criarTabelas(); // migrações idempotentes
    for (const [i, role] of ['admin', 'user', 'user'].entries()) {
      const { rows: [u] } = await pool.query(
        `INSERT INTO usuarios (nome, email, senha, role, ativo, senha_provisoria) VALUES ($1,$2,'x-sem-login',$3,true,false) RETURNING id, nome, email, role`,
        [`Teste Canal ${i} ${MARCA}`, `${MARCA}.${i}@teste.invalido`, role]);
      criado.usuarios.push(u);
    }
    for (const [i, nome] of [`${MARCA} Lucena`, `${MARCA} Lucena Anexo`].entries()) {
      const { rows: [o] } = await pool.query(`INSERT INTO obras (codigo, nome, cliente_nome, status, usuario_id) VALUES ($1,$2,'Cliente Teste Canal','orcamento',$3) RETURNING id`,
        [`ZZ-${MARCA}-${i}`, nome, criado.usuarios[0].id]);
      criado.obras.push(o);
    }
    const { rows: [mv] } = await pool.query(
      `INSERT INTO financeiro_movimentos (tipo, nome, valor, data_hora, obra_id, categoria, origem) VALUES ('realizado', 'Fornecedor Teste Canal', 123.45, NOW(), $1, 'material', 'manual') RETURNING id`, [criado.obras[1].id]);
    criado.movimentos.push(mv.id);
    const n0 = 900000 + Math.floor(Math.random() * 90000);
    for (let i = 0; i < 3; i++) {
      const dono = i === 2 ? criado.usuarios[1].id : criado.usuarios[0].id;
      const { rows: [p] } = await pool.query(
        `INSERT INTO propostas (numero, sequencial, data, cliente_nome, status, total, usuario_id) VALUES ($1,$2,CURRENT_DATE,'Cliente Teste Canal','Ativa',0,$3) RETURNING id, numero`,
        [`P${n0 + i}`, n0 + i, dono]);
      criado.propostas.push(p);
    }
    substituirDependencias(seg);
    T.substituirTrabalhador(trab);
    servidor = app().listen(0, '127.0.0.1');
    await new Promise(r => servidor.once('listening', r));
    base = `http://127.0.0.1:${servidor.address().port}`;
    for (const [nome, fn] of casos) {
      try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
    }
  } catch (e) {
    console.error('canalIntegracao: falha na preparação:', e);
    process.exitCode = 1;
  } finally {
    trab.parar();
    substituirDependencias(null);
    if (servidor) await new Promise(r => servidor.close(r));
    const chats = [...criado.chats];
    const ids = criado.usuarios.map(u => u.id);
    await pool.query("DELETE FROM canal_mensagens WHERE remetente = ANY($1::text[]) OR (canal = 'simulador' AND usuario_id = ANY($2::int[])) OR remetente = ANY($3::text[])",
      [chats, ids, ids.map(i => `sim-${i}`)]).catch(e => console.error('limpeza mensagens:', e.message));
    await pool.query('DELETE FROM canal_contatos WHERE id_externo = ANY($1::text[]) OR id_externo = ANY($2::text[])', [chats, ids.map(i => `sim-${i}`)]).catch(e => console.error('limpeza contatos:', e.message));
    await pool.query('DELETE FROM auditoria WHERE usuario_id = ANY($1::int[])', [ids]).catch(() => {});
    await pool.query("DELETE FROM auditoria WHERE entidade = 'acesso' AND (detalhes->>'id_externo' = ANY($1::text[]) OR detalhes->>'id_externo' = ANY($2::text[]))", [chats, chats.map(c => `+${c}`)]).catch(() => {});
    await pool.query('DELETE FROM financeiro_movimentos WHERE id = ANY($1::int[])', [criado.movimentos]).catch(e => console.error('limpeza movimentos:', e.message));
    await pool.query('DELETE FROM propostas WHERE id = ANY($1::int[])', [criado.propostas.map(p => p.id)]).catch(e => console.error('limpeza propostas:', e.message));
    await pool.query('DELETE FROM obras WHERE id = ANY($1::int[])', [criado.obras.map(o => o.id)]).catch(e => console.error('limpeza obras:', e.message));
    await pool.query('DELETE FROM usuarios WHERE id = ANY($1::int[])', [ids]).catch(e => console.error('limpeza usuários:', e.message));
    console.log(`canal (integração): ${ok}/${casos.length} casos ok`);
    await pool.end().catch(() => {});
  }
})();
