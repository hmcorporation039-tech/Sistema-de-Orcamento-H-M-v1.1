// Verificação em duas etapas da conta (Fase 6, item 3 — 02/11/2026): ativar, conferir no login,
// desativar e códigos de recuperação. O cálculo do código e a cifra ficam em services/totp.js.
//
// Ativar é em dois passos: `iniciar` gera a chave (guardada cifrada como PENDENTE, vale 15 min) e
// devolve o QR/URL para o aplicativo; `confirmar` recebe o primeiro código do aplicativo e só então
// liga a verificação — assim ninguém fica trancado fora por ter lido o QR errado.
const pool = require('../config/database');
const T = require('./totp');
const { comTransacao } = require('./transacao');

const PENDENTE_MINUTOS = 15;

async function codigosRestantes(usuarioId, executor = pool) {
  const { rows: [r] } = await executor.query(
    'SELECT COUNT(*)::int AS n FROM totp_recuperacao WHERE usuario_id = $1 AND usado_em IS NULL', [usuarioId]);
  return r.n;
}

async function gravarCodigosRecuperacao(client, usuarioId) {
  const codigos = T.gerarCodigosRecuperacao(10);
  await client.query('DELETE FROM totp_recuperacao WHERE usuario_id = $1', [usuarioId]);
  for (const c of codigos) {
    await client.query('INSERT INTO totp_recuperacao (usuario_id, codigo_hash) VALUES ($1, $2)', [usuarioId, T.hashRecuperacao(c)]);
  }
  return codigos;
}

// → { segredo (base32, para digitar), url (otpauth://), qr (data:image/png) }
async function iniciar(usuario, executor = pool) {
  if (!T.chaveCifra()) throw Object.assign(new Error('A verificação em duas etapas não está configurada neste servidor (falta TOTP_CHAVE_CIFRA no backend/.env).'), { status: 503, code: 'TOTP_SEM_CHAVE' });
  const segredo = T.gerarSegredo();
  const segredoBase32 = T.paraBase32(segredo);
  await executor.query(
    'UPDATE usuarios SET totp_segredo_pendente = $2, totp_pendente_em = NOW() WHERE id = $1',
    [usuario.id, T.cifrar(segredoBase32)]);
  const url = T.urlOtpauth({ segredoBase32, conta: usuario.email });
  let qr = null;
  try {
    qr = await require('qrcode').toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 220 });
  } catch (e) {
    console.warn(`QR da verificação em duas etapas não gerado: ${e.message}`);
  }
  // a chave em grupos de 4 fica mais fácil de digitar no aplicativo
  return { segredo: segredoBase32.match(/.{1,4}/g).join(' '), url, qr };
}

// → { ok: true, codigos } | { ok: false, motivo: 'sem_pendente' | 'codigo' }
async function confirmar(usuarioId, codigo) {
  return comTransacao(async (client) => {
    const { rows: [u] } = await client.query(
      `SELECT totp_segredo_pendente, (totp_pendente_em > NOW() - make_interval(mins => $2)) AS no_prazo
         FROM usuarios WHERE id = $1 FOR UPDATE`, [usuarioId, PENDENTE_MINUTOS]);
    if (!u || !u.totp_segredo_pendente || !u.no_prazo) return { ok: false, motivo: 'sem_pendente' };
    const segredo = T.deBase32(T.decifrar(u.totp_segredo_pendente));
    const passo = T.verificarCodigo(segredo, codigo);
    if (passo == null) return { ok: false, motivo: 'codigo' };
    await client.query(
      `UPDATE usuarios SET totp_ativo = true, totp_segredo = totp_segredo_pendente, totp_segredo_pendente = NULL,
              totp_pendente_em = NULL, totp_ativado_em = NOW(), totp_ultimo_passo = $2
        WHERE id = $1`, [usuarioId, passo]);
    const codigos = await gravarCodigosRecuperacao(client, usuarioId);
    return { ok: true, codigos };
  });
}

// Confere a segunda etapa (código do aplicativo ou de recuperação) de quem tem TOTP ativo.
// → { ok: true, metodo: 'totp' | 'recuperacao', restantes? } | { ok: false, motivo: 'codigo' | 'configuracao' }
async function conferir(usuarioId, codigo, executor = pool) {
  if (T.pareceRecuperacao(codigo)) {
    const { rows } = await executor.query(
      `UPDATE totp_recuperacao SET usado_em = NOW()
        WHERE id = (SELECT id FROM totp_recuperacao WHERE usuario_id = $1 AND codigo_hash = $2 AND usado_em IS NULL
                     ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
        RETURNING id`, [usuarioId, T.hashRecuperacao(codigo)]);
    if (!rows.length) return { ok: false, motivo: 'codigo' };
    return { ok: true, metodo: 'recuperacao', restantes: await codigosRestantes(usuarioId, executor) };
  }
  const { rows: [u] } = await executor.query('SELECT totp_ativo, totp_segredo, totp_ultimo_passo FROM usuarios WHERE id = $1', [usuarioId]);
  if (!u || !u.totp_ativo || !u.totp_segredo) return { ok: false, motivo: 'codigo' };
  let segredo;
  try {
    segredo = T.deBase32(T.decifrar(u.totp_segredo));
  } catch (e) {
    // TOTP_CHAVE_CIFRA ausente ou trocada: só os códigos de recuperação entram
    console.error(`Verificação em duas etapas: não foi possível ler a chave do usuário ${usuarioId} (${e.message}). Confira TOTP_CHAVE_CIFRA no .env.`);
    return { ok: false, motivo: 'configuracao' };
  }
  const passo = T.verificarCodigo(segredo, codigo, { ultimoPasso: u.totp_ultimo_passo });
  if (passo == null) return { ok: false, motivo: 'codigo' };
  // grava o passo só se for maior que o último (dois pedidos com o mesmo código: só um passa)
  const { rowCount } = await executor.query(
    'UPDATE usuarios SET totp_ultimo_passo = $2 WHERE id = $1 AND (totp_ultimo_passo IS NULL OR totp_ultimo_passo < $2)',
    [usuarioId, passo]);
  return rowCount ? { ok: true, metodo: 'totp' } : { ok: false, motivo: 'codigo' };
}

async function desativar(usuarioId, executor = pool) {
  await executor.query(
    `UPDATE usuarios SET totp_ativo = false, totp_segredo = NULL, totp_segredo_pendente = NULL, totp_pendente_em = NULL,
            totp_ativado_em = NULL, totp_ultimo_passo = NULL WHERE id = $1`, [usuarioId]);
  await executor.query('DELETE FROM totp_recuperacao WHERE usuario_id = $1', [usuarioId]);
}

async function novosCodigos(usuarioId) {
  return comTransacao((client) => gravarCodigosRecuperacao(client, usuarioId));
}

async function situacao(usuarioId, executor = pool) {
  const { rows: [u] } = await executor.query('SELECT totp_ativo, totp_ativado_em FROM usuarios WHERE id = $1', [usuarioId]);
  return {
    ativo: !!u?.totp_ativo,
    ativado_em: u?.totp_ativado_em || null,
    codigos_restantes: u?.totp_ativo ? await codigosRestantes(usuarioId, executor) : 0,
    configurado: !!T.chaveCifra(),
  };
}

module.exports = { PENDENTE_MINUTOS, iniciar, confirmar, conferir, desativar, novosCodigos, situacao, codigosRestantes };
