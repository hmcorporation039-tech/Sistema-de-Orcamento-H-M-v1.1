// Telefone e chat verificados + auditoria de acesso (Fase 6, itens 4 e 5 — 02/11/2026).
//
// Contrato com o canal remoto (services/canal/, outro módulo):
//   usuarioPeloCanal(canal, idExterno)          → { id, nome, email, papel, totp_ativo } | null
//       só com vínculo verificado e ativo, e usuário ativo. Sem isso o canal não atende.
//   confirmarVinculo(canal, idExterno, codigo)  → { ok: true, usuario: { id, nome } } | { ok: false, motivo }
//       o canal recebe "/vincular 123456" e chama esta função. Motivos: 'id_invalido',
//       'codigo_invalido' (errado, vencido ou já usado — de propósito, sem dizer qual),
//       'muitas_tentativas'.
//   registrarAuditoria({ usuario_id, origem, acao, detalhe, ip })
//       origem: 'web' | 'telegram' | 'whatsapp' | 'mcp'. Grava na tabela `auditoria` (entidade
//       'acesso'). Nunca derruba quem chamou: falha vai só para o log.
//
//   canal       'telegram' | 'whatsapp'
//   idExterno   chat_id do Telegram (número, pode ser negativo em grupo) ou telefone do WhatsApp
//               (E.164: "+5561999998888"; "5561999998888", espaços e traços também são aceitos)
//
// O código de vínculo é gerado pela pessoa logada na tela "Minha conta" (6 dígitos, prazo curto,
// VINCULO_CODIGO_MINUTOS, padrão 10) e fica no banco só como hash. Tentativas erradas contam por id
// externo (5 em 15 min) e no total (50 em 15 min): 6 dígitos não aguentam força bruta sem limite.
const crypto = require('crypto');
const pool = require('../config/database');
const { jsonBemFormado } = require('./auditoria');
const { comTransacao } = require('./transacao');

const CANAIS = ['telegram', 'whatsapp'];
const ORIGENS = ['web', 'telegram', 'whatsapp', 'mcp'];
const LIMITE_POR_ID = 5;
const LIMITE_GERAL = 50;
const JANELA_TENTATIVAS_MIN = 15;

const minutosDoCodigo = () => {
  const n = parseInt(process.env.VINCULO_CODIGO_MINUTOS, 10);
  return Number.isFinite(n) && n >= 1 && n <= 60 ? n : 10;
};

function normalizarIdExterno(canal, idExterno) {
  const t = String(idExterno ?? '').trim();
  if (canal === 'telegram') return /^-?\d{1,20}$/.test(t) ? t : null;
  if (canal === 'whatsapp') {
    const digitos = t.replace(/[\s().-]/g, '').replace(/^\+/, '');
    return /^\d{8,15}$/.test(digitos) ? `+${digitos}` : null;
  }
  return null;
}

const hashCodigo = (canal, codigo) => crypto.createHash('sha256').update(`vinculo:${canal}:${codigo}`).digest('hex');

// ── Auditoria de acesso ────────────────────────────────────────────────
async function registrarAuditoria({ usuario_id = null, origem = 'web', acao, detalhe = null, ip = null, entidade = 'acesso', entidade_id = null } = {}, executor = pool) {
  try {
    await executor.query(
      `INSERT INTO auditoria (entidade, entidade_id, acao, detalhes, usuario_id, origem, ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        String(entidade || 'acesso').slice(0, 40), entidade_id,
        String(acao || 'desconhecida').slice(0, 40),
        detalhe == null ? null : jsonBemFormado(typeof detalhe === 'object' ? detalhe : { texto: String(detalhe) }),
        usuario_id, ORIGENS.includes(origem) ? origem : 'web', ip ? String(ip).slice(0, 64) : null,
      ]
    );
  } catch (e) {
    console.warn(`Auditoria de acesso (${acao}): ${e.message}`);
  }
}

// ── Vínculo ────────────────────────────────────────────────────────────
async function gerarCodigoVinculo(usuarioId, canal, { ip = null } = {}) {
  if (!CANAIS.includes(canal)) throw Object.assign(new Error('Canal inválido (telegram ou whatsapp).'), { status: 400 });
  const minutos = minutosDoCodigo();
  const gerado = await comTransacao(async (client) => {
    // um código por pessoa e canal: pedir outro invalida o anterior
    await client.query(
      'UPDATE canal_codigos_vinculo SET expira_em = NOW() WHERE usuario_id = $1 AND canal = $2 AND usado_em IS NULL AND expira_em > NOW()',
      [usuarioId, canal]);
    let codigo = null;
    for (let i = 0; i < 10 && !codigo; i++) {
      const tentativa = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      const { rows } = await client.query(
        'SELECT 1 FROM canal_codigos_vinculo WHERE canal = $1 AND codigo_hash = $2 AND usado_em IS NULL AND expira_em > NOW()',
        [canal, hashCodigo(canal, tentativa)]);
      if (!rows.length) codigo = tentativa;
    }
    if (!codigo) throw new Error('Não foi possível gerar um código livre');
    const { rows: [linha] } = await client.query(
      `INSERT INTO canal_codigos_vinculo (usuario_id, canal, codigo_hash, expira_em)
       VALUES ($1, $2, $3, NOW() + make_interval(mins => $4)) RETURNING expira_em`,
      [usuarioId, canal, hashCodigo(canal, codigo), minutos]);
    return { codigo, canal, expira_em: linha.expira_em, minutos };
  });
  // fora da transação: uma falha da auditoria não pode desfazer o código
  await registrarAuditoria({ usuario_id: usuarioId, origem: 'web', acao: 'vinculo_codigo_gerado', detalhe: { canal }, ip });
  return gerado;
}

async function tentativasRecentes(canal, idExterno) {
  const { rows: [r] } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE detalhes->>'id_externo' = $2)::int AS deste, COUNT(*)::int AS total
       FROM auditoria
      WHERE entidade = 'acesso' AND acao = 'vinculo_falhou' AND origem = $1
        AND criado_em > NOW() - make_interval(mins => $3)`,
    [canal, idExterno, JANELA_TENTATIVAS_MIN]);
  return r;
}

async function confirmarVinculo(canal, idExterno, codigo) {
  if (!CANAIS.includes(canal)) return { ok: false, motivo: 'id_invalido' };
  const id = normalizarIdExterno(canal, idExterno);
  if (!id) return { ok: false, motivo: 'id_invalido' };

  const t = await tentativasRecentes(canal, id);
  if (t.deste >= LIMITE_POR_ID || t.total >= LIMITE_GERAL) {
    await registrarAuditoria({ origem: canal, acao: 'vinculo_bloqueado', detalhe: { id_externo: id } });
    return { ok: false, motivo: 'muitas_tentativas' };
  }

  const texto = String(codigo ?? '').replace(/\s/g, '');
  const falhar = async () => {
    await registrarAuditoria({ origem: canal, acao: 'vinculo_falhou', detalhe: { id_externo: id } });
    return { ok: false, motivo: 'codigo_invalido' };
  };
  if (!/^\d{6}$/.test(texto)) return falhar();

  const resultado = await comTransacao(async (client) => {
    const { rows: [cod] } = await client.query(
      `SELECT c.id, c.usuario_id, u.nome
         FROM canal_codigos_vinculo c JOIN usuarios u ON u.id = c.usuario_id
        WHERE c.canal = $1 AND c.codigo_hash = $2 AND c.usado_em IS NULL AND c.expira_em > NOW() AND u.ativo
        ORDER BY c.id DESC LIMIT 1
        FOR UPDATE OF c`,
      [canal, hashCodigo(canal, texto)]);
    if (!cod) return null;
    await client.query('UPDATE canal_codigos_vinculo SET usado_em = NOW() WHERE id = $1', [cod.id]);
    // o chat/telefone passa a ser só desta pessoa (se estava com outra, o vínculo antigo cai)
    const { rows: antigos } = await client.query(
      'UPDATE canal_vinculos SET ativo = false, removido_em = NOW() WHERE canal = $1 AND id_externo = $2 AND ativo RETURNING usuario_id',
      [canal, id]);
    const { rows: [v] } = await client.query(
      `INSERT INTO canal_vinculos (usuario_id, canal, id_externo, verificado_em, ativo)
       VALUES ($1, $2, $3, NOW(), true) RETURNING id`,
      [cod.usuario_id, canal, id]);
    return { usuario: { id: cod.usuario_id, nome: cod.nome }, vinculo_id: v.id, substituiu: antigos.map(a => a.usuario_id) };
  });
  if (!resultado) return falhar();

  await registrarAuditoria({
    usuario_id: resultado.usuario.id, origem: canal, acao: 'vinculo_confirmado',
    detalhe: { id_externo: id, vinculo_id: resultado.vinculo_id, ...(resultado.substituiu.length ? { tirado_de: resultado.substituiu } : {}) },
  });
  return { ok: true, usuario: resultado.usuario, vinculo_id: resultado.vinculo_id };
}

async function usuarioPeloCanal(canal, idExterno) {
  if (!CANAIS.includes(canal)) return null;
  const id = normalizarIdExterno(canal, idExterno);
  if (!id) return null;
  const { rows: [u] } = await pool.query(
    `SELECT u.id, u.nome, u.email, u.role AS papel, u.totp_ativo
       FROM canal_vinculos v JOIN usuarios u ON u.id = v.usuario_id
      WHERE v.canal = $1 AND v.id_externo = $2 AND v.ativo AND v.verificado_em IS NOT NULL AND u.ativo
      ORDER BY v.id DESC LIMIT 1`,
    [canal, id]);
  return u ? { id: u.id, nome: u.nome, email: u.email, papel: u.papel, totp_ativo: u.totp_ativo === true } : null;
}

// Mostra só o fim do telefone/chat na tela (o número inteiro não precisa ficar exposto).
function mascarar(idExterno) {
  const t = String(idExterno || '');
  return t.length <= 4 ? t : `${'•'.repeat(Math.min(6, t.length - 4))}${t.slice(-4)}`;
}

async function listarVinculos(usuarioId) {
  const { rows } = await pool.query(
    `SELECT id, canal, id_externo, verificado_em, criado_em FROM canal_vinculos
      WHERE usuario_id = $1 AND ativo AND verificado_em IS NOT NULL ORDER BY canal, id`, [usuarioId]);
  return rows.map(r => ({ id: r.id, canal: r.canal, id_externo: mascarar(r.id_externo), verificado_em: r.verificado_em, criado_em: r.criado_em }));
}

// Remove o vínculo do próprio usuário (ou de qualquer um, se `admin`). Devolve true se removeu.
async function removerVinculo(vinculoId, { usuarioId, admin = false, ip = null }) {
  const { rows: [v] } = await pool.query(
    `UPDATE canal_vinculos SET ativo = false, removido_em = NOW()
      WHERE id = $1 AND ativo AND ($2::boolean OR usuario_id = $3) RETURNING usuario_id, canal`,
    [vinculoId, admin, usuarioId]);
  if (!v) return false;
  await registrarAuditoria({ usuario_id: usuarioId, origem: 'web', acao: 'vinculo_removido', detalhe: { vinculo_id: Number(vinculoId), canal: v.canal, dono: v.usuario_id }, ip });
  return true;
}

module.exports = {
  CANAIS, ORIGENS,
  usuarioPeloCanal, confirmarVinculo, registrarAuditoria,
  gerarCodigoVinculo, listarVinculos, removerVinculo, normalizarIdExterno, hashCodigo, mascarar,
};
