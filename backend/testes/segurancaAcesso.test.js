// Segurança de acesso da Fase 6 (02/11/2026): TOTP (vetores da RFC 6238), papéis (exigePapel), IP de
// fora, e — com banco, só em hm_orcamentos_v2 — sessões (renovação, folga, reuso, revogação),
// login em duas etapas, códigos de vínculo do canal (vencido, usado duas vezes, tentativas) e
// usuarioPeloCanal só com vínculo verificado. Não usa a rede nem envia e-mail.
require('../src/config/env');
const assert = require('assert');
const crypto = require('crypto');
const T = require('../src/services/totp');
const { ipPrivado, acessoDeFora, descreverDispositivo } = require('../src/utils/ipPedido');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };

// resposta falsa do Express
const resposta = () => ({ statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(b) { this.body = b; return this; } });

(async () => {
  // ── TOTP ─────────────────────────────────────────────────────────────
  await caso('TOTP: vetores da RFC 6238 (apêndice B) em SHA-1, SHA-256 e SHA-512, 8 dígitos', () => {
    const segredos = {
      sha1: Buffer.from('12345678901234567890', 'ascii'),
      sha256: Buffer.from('12345678901234567890123456789012', 'ascii'),
      sha512: Buffer.from('1234567890123456789012345678901234567890123456789012345678901234', 'ascii'),
    };
    const vetores = [
      [59, '94287082', '46119246', '90693936'],
      [1111111109, '07081804', '68084774', '25091201'],
      [1111111111, '14050471', '67062674', '99943326'],
      [1234567890, '89005924', '91819424', '93441116'],
      [2000000000, '69279037', '90698825', '38618901'],
      [20000000000, '65353130', '77737706', '47863826'],
    ];
    for (const [t, s1, s256, s512] of vetores) {
      assert.strictEqual(T.totp(segredos.sha1, t * 1000, { digitos: 8, algoritmo: 'sha1' }), s1, `SHA-1 em ${t}`);
      assert.strictEqual(T.totp(segredos.sha256, t * 1000, { digitos: 8, algoritmo: 'sha256' }), s256, `SHA-256 em ${t}`);
      assert.strictEqual(T.totp(segredos.sha512, t * 1000, { digitos: 8, algoritmo: 'sha512' }), s512, `SHA-512 em ${t}`);
    }
  });

  await caso('HOTP: vetores da RFC 4226 (apêndice D) e base32 de ida e volta', () => {
    const s = Buffer.from('12345678901234567890', 'ascii');
    const esperados = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];
    esperados.forEach((c, i) => assert.strictEqual(T.hotp(s, i), c, `contador ${i}`));
    assert.strictEqual(T.paraBase32(s), 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    assert.deepStrictEqual(T.deBase32('gezd gnbv gy3t qojq gezd gnbv gy3t qojq'), s);
    const r = crypto.randomBytes(20);
    assert.deepStrictEqual(T.deBase32(T.paraBase32(r)), r);
    assert.throws(() => T.deBase32('ABC1'), /base32/);
  });

  await caso('TOTP: aceita um passo de diferença, recusa dois, formato errado e o mesmo código de novo', () => {
    const s = T.gerarSegredo();
    const agora = 1_800_000_000_000;
    const passo = T.passoDe(agora);
    assert.strictEqual(T.verificarCodigo(s, T.hotp(s, passo), { tempoMs: agora }), passo);
    assert.strictEqual(T.verificarCodigo(s, T.hotp(s, passo - 1), { tempoMs: agora }), passo - 1, 'relógio 30 s atrasado');
    assert.strictEqual(T.verificarCodigo(s, T.hotp(s, passo + 1), { tempoMs: agora }), passo + 1, 'relógio 30 s adiantado');
    assert.strictEqual(T.verificarCodigo(s, T.hotp(s, passo - 2), { tempoMs: agora }), null, '60 s fora');
    assert.strictEqual(T.verificarCodigo(s, '12345', { tempoMs: agora }), null);
    assert.strictEqual(T.verificarCodigo(s, 'abcdef', { tempoMs: agora }), null);
    assert.strictEqual(T.verificarCodigo(s, ` ${T.hotp(s, passo)} `, { tempoMs: agora }), passo, 'espaços em volta');
    assert.strictEqual(T.verificarCodigo(s, T.hotp(s, passo), { tempoMs: agora, ultimoPasso: passo }), null, 'código já usado');
    assert.strictEqual(T.verificarCodigo(s, T.hotp(s, passo - 1), { tempoMs: agora, ultimoPasso: passo }), null, 'código mais antigo que o último');
  });

  await caso('TOTP: URL otpauth e cifra da chave (AES-256-GCM)', () => {
    const url = T.urlOtpauth({ segredoBase32: 'JBSWY3DPEHPK3PXP', conta: 'marcio@exemplo.invalid' });
    assert.strictEqual(url, 'otpauth://totp/H%26M%20Engenharia:marcio%40exemplo.invalid?secret=JBSWY3DPEHPK3PXP&issuer=H%26M%20Engenharia&algorithm=SHA1&digits=6&period=30');
    const chave = crypto.randomBytes(32);
    const c = T.cifrar('JBSWY3DPEHPK3PXP', chave);
    assert.match(c, /^v1:/);
    assert.ok(!c.includes('JBSWY3DPEHPK3PXP'), 'a chave não pode aparecer no texto gravado');
    assert.notStrictEqual(T.cifrar('JBSWY3DPEHPK3PXP', chave), c, 'IV novo a cada cifra');
    assert.strictEqual(T.decifrar(c, chave), 'JBSWY3DPEHPK3PXP');
    assert.throws(() => T.decifrar(c, crypto.randomBytes(32)), 'chave errada não decifra');
    const adulterado = c.slice(0, -2) + (c.endsWith('A') ? 'B' : 'A') + c.slice(-1);
    assert.throws(() => T.decifrar(adulterado, chave), 'texto alterado não passa na etiqueta do GCM');
    assert.strictEqual(T.chaveCifra(''), null);
    assert.strictEqual(T.chaveCifra('curta'), null);
    assert.strictEqual(T.chaveCifra('a'.repeat(64)).length, 32);
    assert.throws(() => T.cifrar('x', null), (e) => e.code === 'TOTP_SEM_CHAVE');
  });

  await caso('códigos de recuperação: 10, formato xxxxx-xxxxx, hash sem diferença de caixa e traço', () => {
    const cs = T.gerarCodigosRecuperacao();
    assert.strictEqual(cs.length, 10);
    assert.strictEqual(new Set(cs).size, 10);
    for (const c of cs) {
      assert.match(c, /^[a-z2-9]{5}-[a-z2-9]{5}$/);
      assert.ok(T.pareceRecuperacao(c));
      assert.strictEqual(T.hashRecuperacao(c), T.hashRecuperacao(c.toUpperCase().replace('-', ' ')));
    }
    assert.ok(!T.pareceRecuperacao('123456'), 'código do aplicativo não é de recuperação');
  });

  // ── Papéis ───────────────────────────────────────────────────────────
  const { exigePapel, PAPEIS } = require('../src/middleware/auth');
  await caso('exigePapel: admin passa sempre, o papel certo passa, os outros recebem 403', () => {
    const rodar = (mw, role) => {
      const res = resposta();
      let passou = false;
      mw({ usuario: role ? { id: 1, role } : undefined }, res, () => { passou = true; });
      return passou ? 'passou' : res.statusCode;
    };
    const fin = exigePapel('financeiro');
    assert.strictEqual(rodar(fin, 'admin'), 'passou');
    assert.strictEqual(rodar(fin, 'financeiro'), 'passou');
    assert.strictEqual(rodar(fin, 'tecnico'), 403);
    assert.strictEqual(rodar(fin, 'user'), 403);
    assert.strictEqual(rodar(fin, null), 403, 'sem usuário (rota sem autenticar)');
    const varios = exigePapel('tecnico', 'financeiro');
    assert.strictEqual(rodar(varios, 'tecnico'), 'passou');
    assert.strictEqual(rodar(varios, 'financeiro'), 'passou');
    assert.strictEqual(rodar(varios, 'user'), 403);
    assert.strictEqual(rodar(exigePapel(['user']), 'user'), 'passou', 'lista também vale');
    assert.throws(() => exigePapel('gerente'), /desconhecido/, 'papel escrito errado quebra na partida');
    assert.throws(() => exigePapel(), /ao menos um/);
    assert.deepStrictEqual(PAPEIS.map(p => p.valor).sort(), ['admin', 'financeiro', 'tecnico', 'user']);
  });

  await caso('IP: rede local × de fora, e cabeçalho de proxy sem TRUST_PROXY conta como de fora', () => {
    for (const ip of ['127.0.0.1', '::1', '::ffff:192.168.0.10', '10.1.2.3', '172.16.0.1', '172.31.255.1', 'fd12:3456::1']) assert.ok(ipPrivado(ip), ip);
    for (const ip of ['8.8.8.8', '172.32.0.1', '200.150.10.1', '2804:14c::1', '']) assert.ok(!ipPrivado(ip), ip);
    const app = (trust) => ({ get: () => trust });
    assert.strictEqual(acessoDeFora({ ip: '192.168.0.5', headers: {}, app: app(false) }), false);
    assert.strictEqual(acessoDeFora({ ip: '127.0.0.1', headers: { 'cf-connecting-ip': '200.1.1.1' }, app: app(false) }), true, 'túnel sem TRUST_PROXY');
    assert.strictEqual(acessoDeFora({ ip: '200.1.1.1', headers: { 'x-forwarded-for': '200.1.1.1' }, app: app(1) }), true);
    assert.strictEqual(acessoDeFora({ ip: '192.168.0.9', headers: { 'x-forwarded-for': '192.168.0.9' }, app: app(1) }), false);
    assert.strictEqual(descreverDispositivo('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'), 'Chrome no Windows');
    assert.strictEqual(descreverDispositivo('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'), 'Safari no iPhone/iPad');
  });

  // ── Banco ────────────────────────────────────────────────────────────
  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`segurancaAcesso: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    // chave de teste (o .env do v2 pode ter outra; aqui não importa) e nada de e-mail
    process.env.TOTP_CHAVE_CIFRA = crypto.randomBytes(32).toString('hex');
    process.env.AVISO_LOGIN_NOVO_EMAIL = 'desligado';
    const pool = require('../src/config/database');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../src/config/segredos');
    const S = require('../src/services/sessoesUsuario');
    const V = require('../src/services/telefonesVerificados');
    const E = require('../src/services/segundaEtapa');
    const { autenticar } = require('../src/middleware/auth');
    const authCtrl = require('../src/controllers/authController');

    const MARCA = 'zz-seg-acesso-';
    // ids externos de teste: chats negativos com este prefixo e telefones +5500999…
    const ID_TESTE = `-99971${String(Date.now()).slice(-7)}`;
    const limpar = async () => {
      await pool.query(`DELETE FROM auditoria WHERE usuario_id IN (SELECT id FROM usuarios WHERE email LIKE $1)`, [`${MARCA}%`]).catch(() => {});
      await pool.query(`DELETE FROM auditoria WHERE entidade = 'acesso' AND (detalhes->>'id_externo' LIKE '-99971%' OR detalhes->>'id_externo' LIKE '+5500999%' OR detalhes->>'email' LIKE $1)`, [`${MARCA}%`]).catch(() => {});
      await pool.query('DELETE FROM usuarios WHERE email LIKE $1', [`${MARCA}%`]).catch(() => {});
    };
    const criarUsuario = async (sufixo, role = 'user', senha = 'senha-de-teste-123') => {
      const { rows: [u] } = await pool.query(
        `INSERT INTO usuarios (nome, email, senha, role) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, role`,
        [`ZZ Seg ${sufixo}`, `${MARCA}${sufixo}@exemplo.invalid`, bcrypt.hashSync(senha, 4), role]);
      return u;
    };
    // passa o pedido pelo autenticar e devolve o status (200 = passou)
    const pelaPorta = async (token) => {
      const res = resposta();
      let passou = false;
      await autenticar({ headers: { authorization: `Bearer ${token}` }, method: 'GET', originalUrl: '/api/conta', ip: '127.0.0.1', app: { get: () => false } }, res, () => { passou = true; });
      return passou ? 200 : res.statusCode;
    };

    try {
      await limpar();
      for (const m of ['2.0-44-sessoes', '2.0-45-totp-papeis', '2.0-46-canal-vinculos']) {
        await require(`../src/models/migracoes/${m}`)(pool);
        await require(`../src/models/migracoes/${m}`)(pool);   // idempotente
      }

      await caso('banco: papéis novos entram na regra do banco e um papel inventado não', async () => {
        await criarUsuario('fin', 'financeiro');
        await criarUsuario('tec', 'tecnico');
        await assert.rejects(() => criarUsuario('ger', 'gerente'), (e) => e.code === '23514');
      });

      await caso('banco: sessão renova, troca a chave, aceita a anterior só na folga e derruba quem reusa', async () => {
        const u = await criarUsuario('sessao');
        const s = await S.criarSessao(u, { dispositivoId: 'disp-teste-0001', dispositivo: 'Teste', ip: '127.0.0.1' });
        assert.strictEqual(jwt.verify(s.token, JWT_SECRET).sid, s.sessaoId);
        assert.strictEqual(await pelaPorta(s.token), 200);
        // chave inventada para uma sessão que existe: recusa SEM derrubar a sessão (senão qualquer um, sem login, derrubava todas)
        assert.deepStrictEqual(await S.renovarSessao(`${s.sessaoId}.${'A'.repeat(43)}`), { ok: false, motivo: 'invalida' });
        assert.strictEqual(await pelaPorta(s.token), 200, 'a sessão continua depois da chave inventada');
        const r1 = await S.renovarSessao(s.renovacao, { ip: '127.0.0.1' });
        assert.ok(r1.ok && r1.token && r1.renovacao, 'renovou');
        assert.notStrictEqual(r1.renovacao, s.renovacao, 'a chave muda a cada renovação');
        assert.strictEqual(await pelaPorta(r1.token), 200);
        // outra aba com a chave anterior, logo depois: recebe só o token (a chave nova já está no navegador)
        const folga = await S.renovarSessao(s.renovacao);
        assert.ok(folga.ok && folga.token && !folga.renovacao, 'chave anterior dentro da folga');
        // passada a folga, a chave anterior é sinal de cópia: a sessão cai
        await pool.query("UPDATE sessoes SET renovada_em = NOW() - interval '5 minutes' WHERE id = $1", [s.sessaoId]);
        assert.deepStrictEqual(await S.renovarSessao(s.renovacao), { ok: false, motivo: 'invalida' });
        assert.strictEqual(await pelaPorta(r1.token), 401, 'o token da sessão derrubada para de valer');
        assert.strictEqual((await S.renovarSessao(r1.renovacao)).ok, false, 'nem a chave atual renova mais');
        assert.strictEqual((await pool.query('SELECT motivo_revogacao FROM sessoes WHERE id = $1', [s.sessaoId])).rows[0].motivo_revogacao, 'reuso');
        assert.strictEqual((await S.renovarSessao('lixo')).ok, false);
        assert.strictEqual((await S.renovarSessao(`${s.sessaoId}.${'x'.repeat(43)}`)).ok, false);
      });

      await caso('banco: sair/encerrar revoga na hora; "encerrar as outras" mantém a atual; vencida não renova', async () => {
        const u = await criarUsuario('revoga');
        const a = await S.criarSessao(u, { dispositivoId: 'disp-a-0001' });
        const b = await S.criarSessao(u, { dispositivoId: 'disp-b-0001' });
        const c = await S.criarSessao(u, { dispositivoId: 'disp-c-0001' });
        assert.strictEqual((await S.listarSessoes(u.id, a.sessaoId)).length, 3);
        assert.ok((await S.listarSessoes(u.id, a.sessaoId)).find(x => x.id === a.sessaoId).atual);
        assert.strictEqual(await S.revogarSessao(b.sessaoId, 'encerrada', { usuarioId: u.id + 999999 }), false, 'sessão de outra pessoa');
        assert.strictEqual(await S.revogarSessao(b.sessaoId, 'saiu', { usuarioId: u.id }), true);
        assert.strictEqual(await pelaPorta(b.token), 401);
        assert.strictEqual((await S.renovarSessao(b.renovacao)).ok, false);
        assert.strictEqual(await S.revogarSessoesDoUsuario(u.id, 'outras', { exceto: a.sessaoId }), 1);
        assert.strictEqual(await pelaPorta(c.token), 401);
        assert.strictEqual(await pelaPorta(a.token), 200, 'a sessão atual continua');
        // o mesmo navegador entrando de novo substitui a sessão antiga dele
        const a2 = await S.criarSessao(u, { dispositivoId: 'disp-a-0001' });
        assert.strictEqual(await pelaPorta(a.token), 401);
        assert.strictEqual(await pelaPorta(a2.token), 200);
        await pool.query("UPDATE sessoes SET expira_em = NOW() - interval '1 minute' WHERE id = $1", [a2.sessaoId]);
        assert.deepStrictEqual(await S.renovarSessao(a2.renovacao), { ok: false, motivo: 'vencida' });
        // token antigo (sem sid) continua valendo até vencer
        const legado = jwt.sign({ id: u.id, nome: u.nome, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
        assert.strictEqual(await pelaPorta(legado), 200);
        const vencido = jwt.sign({ id: u.id, sid: a.sessaoId, exp: Math.floor(Date.now() / 1000) - 10 }, JWT_SECRET, { algorithm: 'HS256' });
        const res = resposta();
        await autenticar({ headers: { authorization: `Bearer ${vencido}` }, originalUrl: '/api/x' }, res, () => {});
        assert.strictEqual(res.body.codigo, 'TOKEN_EXPIRADO', 'o frontend renova sozinho com esse código');
      });

      await caso('banco: login com senha abre sessão, registra falha e avisa dispositivo novo', async () => {
        const u = await criarUsuario('login', 'user', 'senha-certa-123');
        const pedido = (corpo, ua = 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0') => ({ body: corpo, headers: { 'user-agent': ua }, ip: '127.0.0.1', app: { get: () => false } });
        const errado = resposta();
        await authCtrl.login(pedido({ email: u.email, senha: 'errada-errada' }), errado);
        assert.strictEqual(errado.statusCode, 401);
        const certo = resposta();
        await authCtrl.login(pedido({ email: u.email.toUpperCase(), senha: 'senha-certa-123', dispositivo: 'disp-login-0001' }), certo);
        assert.ok(certo.body.token && certo.body.renovacao, 'token curto e chave de renovação');
        assert.strictEqual(certo.body.usuario.totpAtivo, false);
        const outro = resposta();
        await authCtrl.login(pedido({ email: u.email, senha: 'senha-certa-123', dispositivo: 'disp-login-0002' }, 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile'), outro);
        assert.ok(outro.body.token);
        await new Promise(r => setTimeout(r, 200));   // o aviso roda sem segurar a resposta
        const acoes = (await pool.query('SELECT acao FROM auditoria WHERE usuario_id = $1 ORDER BY id', [u.id])).rows.map(r => r.acao);
        assert.deepStrictEqual(acoes.filter(a => a.startsWith('login')), ['login_falhou', 'login', 'login', 'login_novo']);
      });

      await caso('banco: duas etapas — ativa com o 1º código, login pede o código, código repetido e de recuperação usado não entram', async () => {
        const u = await criarUsuario('totp', 'admin', 'senha-certa-123');
        const ini = await E.iniciar(u);
        assert.match(ini.url, /^otpauth:\/\/totp\//);
        assert.match(ini.qr || '', /^data:image\/png;base64,/);
        const gravado = (await pool.query('SELECT totp_segredo_pendente FROM usuarios WHERE id = $1', [u.id])).rows[0].totp_segredo_pendente;
        assert.ok(!gravado.includes(ini.segredo.replace(/ /g, '')), 'chave cifrada no banco');
        const segredo = T.deBase32(ini.segredo);
        assert.deepStrictEqual(await E.confirmar(u.id, '000000') , { ok: false, motivo: 'codigo' });
        // o próximo passo (vale pela janela de ±1) para não colidir com o código usado no login abaixo
        const conf = await E.confirmar(u.id, T.hotp(segredo, T.passoDe(Date.now()) - 1));
        assert.ok(conf.ok && conf.codigos.length === 10);
        assert.strictEqual((await E.situacao(u.id)).codigos_restantes, 10);

        const pedido = (corpo) => ({ body: corpo, headers: {}, ip: '127.0.0.1', app: { get: () => false } });
        const etapa1 = resposta();
        await authCtrl.login(pedido({ email: u.email, senha: 'senha-certa-123' }), etapa1);
        assert.strictEqual(etapa1.body.precisaTotp, true);
        assert.ok(!etapa1.body.token, 'sem token antes do código');
        assert.strictEqual(await pelaPorta(etapa1.body.desafio), 401, 'o desafio não serve como token');
        const codigo = T.totp(segredo);
        const etapa2 = resposta();
        await authCtrl.loginTotp(pedido({ desafio: etapa1.body.desafio, codigo }), etapa2);
        assert.ok(etapa2.body.token && etapa2.body.renovacao, 'entrou com o código do aplicativo');
        const repetido = resposta();
        await authCtrl.loginTotp(pedido({ desafio: etapa1.body.desafio, codigo }), repetido);
        assert.strictEqual(repetido.statusCode, 401, 'o mesmo código não entra duas vezes');
        const rec = resposta();
        await authCtrl.loginTotp(pedido({ desafio: etapa1.body.desafio, codigo: conf.codigos[0].toUpperCase() }), rec);
        assert.ok(rec.body.token, 'código de recuperação entra');
        assert.strictEqual(rec.body.codigosRecuperacaoRestantes, 9);
        const rec2 = resposta();
        await authCtrl.loginTotp(pedido({ desafio: etapa1.body.desafio, codigo: conf.codigos[0] }), rec2);
        assert.strictEqual(rec2.statusCode, 401, 'código de recuperação vale uma vez');
        const vencido = resposta();
        await authCtrl.loginTotp(pedido({ desafio: jwt.sign({ id: u.id, escopo: 'login-totp', exp: Math.floor(Date.now() / 1000) - 1 }, JWT_SECRET), codigo }), vencido);
        assert.strictEqual(vencido.body.codigo, 'DESAFIO_VENCIDO');
        await E.desativar(u.id);
        assert.deepStrictEqual(await E.situacao(u.id), { ativo: false, ativado_em: null, codigos_restantes: 0, configurado: true });
      });

      await caso('banco: código de vínculo vale uma vez, vence, e usuarioPeloCanal só devolve vínculo verificado', async () => {
        const u = await criarUsuario('canal');
        assert.strictEqual(await V.usuarioPeloCanal('telegram', ID_TESTE), null, 'antes de vincular');
        // vínculo gravado sem verificação (não deveria existir, mas se existir não vale)
        await pool.query("INSERT INTO canal_vinculos (usuario_id, canal, id_externo, verificado_em) VALUES ($1, 'telegram', $2, NULL)", [u.id, ID_TESTE]);
        assert.strictEqual(await V.usuarioPeloCanal('telegram', ID_TESTE), null, 'sem verificação não vale');
        await pool.query('DELETE FROM canal_vinculos WHERE usuario_id = $1', [u.id]);

        const g = await V.gerarCodigoVinculo(u.id, 'telegram');
        assert.match(g.codigo, /^\d{6}$/);
        const guardado = (await pool.query('SELECT codigo_hash FROM canal_codigos_vinculo WHERE usuario_id = $1 ORDER BY id DESC LIMIT 1', [u.id])).rows[0].codigo_hash;
        assert.notStrictEqual(guardado, g.codigo, 'só o hash fica no banco');
        assert.strictEqual((await V.confirmarVinculo('whatsapp', '+5500999000001', g.codigo)).ok, false, 'código de um canal não vale no outro');
        const r = await V.confirmarVinculo('telegram', ID_TESTE, g.codigo);
        assert.deepStrictEqual(r.usuario, { id: u.id, nome: u.nome });
        assert.deepStrictEqual(await V.confirmarVinculo('telegram', ID_TESTE, g.codigo), { ok: false, motivo: 'codigo_invalido' }, 'usado duas vezes');
        const achado = await V.usuarioPeloCanal('telegram', ID_TESTE);
        assert.deepStrictEqual(achado, { id: u.id, nome: u.nome, email: u.email, papel: 'user', totp_ativo: false });

        // vencido
        const g2 = await V.gerarCodigoVinculo(u.id, 'whatsapp');
        await pool.query("UPDATE canal_codigos_vinculo SET expira_em = NOW() - interval '1 second' WHERE usuario_id = $1 AND canal = 'whatsapp' AND usado_em IS NULL", [u.id]);
        assert.deepStrictEqual(await V.confirmarVinculo('whatsapp', '+55 00 999-000002', g2.codigo), { ok: false, motivo: 'codigo_invalido' }, 'vencido');
        // pedir outro código invalida o anterior
        const g3 = await V.gerarCodigoVinculo(u.id, 'whatsapp');
        const g4 = await V.gerarCodigoVinculo(u.id, 'whatsapp');
        if (g3.codigo !== g4.codigo) assert.strictEqual((await V.confirmarVinculo('whatsapp', '+5500999000003', g3.codigo)).ok, false, 'o anterior deixou de valer');
        const w = await V.confirmarVinculo('whatsapp', '5500999000003', g4.codigo);
        assert.ok(w.ok);
        assert.strictEqual((await V.usuarioPeloCanal('whatsapp', '+55 (00) 999000003'))?.id, u.id, 'telefone normalizado para E.164');

        // usuário desativado e vínculo removido não respondem
        await pool.query('UPDATE usuarios SET ativo = false WHERE id = $1', [u.id]);
        assert.strictEqual(await V.usuarioPeloCanal('telegram', ID_TESTE), null, 'usuário desativado');
        await pool.query('UPDATE usuarios SET ativo = true WHERE id = $1', [u.id]);
        const vinc = (await V.listarVinculos(u.id)).find(v => v.canal === 'telegram');
        assert.ok(vinc && !vinc.id_externo.includes(ID_TESTE.slice(0, -4)), 'a tela mostra só o fim do id');
        assert.strictEqual(await V.removerVinculo(vinc.id, { usuarioId: u.id + 999999 }), false, 'vínculo de outra pessoa');
        assert.strictEqual(await V.removerVinculo(vinc.id, { usuarioId: u.id }), true);
        assert.strictEqual(await V.usuarioPeloCanal('telegram', ID_TESTE), null, 'vínculo removido');
        assert.strictEqual(await V.usuarioPeloCanal('sms', ID_TESTE), null);
        assert.deepStrictEqual(await V.confirmarVinculo('telegram', 'abc', '123456'), { ok: false, motivo: 'id_invalido' });
      });

      await caso('banco: tentativas erradas de vínculo travam o id externo depois de 5', async () => {
        const id = `${ID_TESTE}9`;
        for (let i = 0; i < 5; i++) assert.strictEqual((await V.confirmarVinculo('telegram', id, '000000')).motivo, 'codigo_invalido');
        assert.deepStrictEqual(await V.confirmarVinculo('telegram', id, '000000'), { ok: false, motivo: 'muitas_tentativas' });
      });

      await caso('banco: registrarAuditoria grava origem e IP (e nunca derruba quem chama)', async () => {
        const u = await criarUsuario('aud');
        await V.registrarAuditoria({ usuario_id: u.id, origem: 'telegram', acao: 'mensagem', detalhe: { texto: 'notas abertas' }, ip: '200.1.1.1' });
        await V.registrarAuditoria({ usuario_id: u.id, origem: 'sms', acao: 'x'.repeat(80), detalhe: 'texto solto' });
        const avisos = [];
        const avisoOriginal = console.warn;
        console.warn = (m) => avisos.push(m);
        try { await V.registrarAuditoria({ usuario_id: 'nao-e-numero', acao: 'quebrada' }); } finally { console.warn = avisoOriginal; }
        assert.match(avisos.join(' '), /Auditoria de acesso \(quebrada\)/, 'falha só vai para o log');
        const linhas = (await pool.query('SELECT entidade, origem, acao, ip, detalhes FROM auditoria WHERE usuario_id = $1 ORDER BY id', [u.id])).rows;
        assert.deepStrictEqual(linhas[0], { entidade: 'acesso', origem: 'telegram', acao: 'mensagem', ip: '200.1.1.1', detalhes: { texto: 'notas abertas' } });
        assert.strictEqual(linhas[1].origem, 'web', 'origem desconhecida vira web');
        assert.strictEqual(linhas[1].acao.length, 40);
        assert.deepStrictEqual(linhas[1].detalhes, { texto: 'texto solto' });
      });
    } finally {
      const avisoOriginal = console.warn;
      console.warn = () => {};
      try { await limpar(); } finally { console.warn = avisoOriginal; }
      await pool.end();
    }
  }

  console.log(`segurancaAcesso: ok (${ok} verificações)`);
})().catch(e => { console.error(e); process.exit(1); });
