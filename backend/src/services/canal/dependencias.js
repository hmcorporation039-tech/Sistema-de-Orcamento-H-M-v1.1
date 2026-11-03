// O que o canal usa da parte de SEGURANÇA (outro módulo, services/telefonesVerificados.js e o
// middleware exigePapel em middleware/auth.js):
//   usuarioPeloCanal(canal, idExterno)         → { id, nome, email, papel, totp_ativo } | null
//   confirmarVinculo(canal, idExterno, codigo) → { ok, usuario?, motivo? }
//   registrarAuditoria({ usuario_id, origem, acao, detalhe, ip })
//   exigePapel(...papeis)                      → middleware
// Carregados na hora do uso (não na partida). Se o módulo de segurança não existir, o canal fica
// FECHADO: ninguém é reconhecido (todos recebem "Use /vincular…"), o vínculo não confirma, a
// auditoria vai para o log e exigePapel usa a regra local (admin passa sempre).
// Os testes trocam tudo por dublês com substituirDependencias().
let substitutas = null;

function carregar(caminho) {
  try { return require(caminho); } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND' && String(e.message).includes(caminho.split('/').pop())) return null;
    throw e;
  }
}

function exigePapelLocal(...papeis) {
  const lista = papeis.flat();
  return (req, res, next) => {
    const papel = req.usuario?.papel || req.usuario?.role;
    if (papel === 'admin' || (papel && lista.includes(papel))) return next();
    return res.status(403).json({ erro: 'Seu perfil não tem acesso a esta área.' });
  };
}

function dependencias() {
  if (substitutas) return substitutas;
  const seg = carregar('../telefonesVerificados');
  const auth = carregar('../../middleware/auth');
  return {
    seguranca: !!seg,
    usuarioPeloCanal: seg?.usuarioPeloCanal || (async () => null),
    confirmarVinculo: seg?.confirmarVinculo || (async () => ({ ok: false, motivo: 'indisponivel' })),
    registrarAuditoria: seg?.registrarAuditoria || (async (r) => { console.log(`[canal] auditoria ${r?.acao} (usuário ${r?.usuario_id ?? '—'})`); }),
    exigePapel: auth?.exigePapel || exigePapelLocal,
  };
}

// middleware que resolve o exigePapel na hora do pedido (o módulo de segurança pode chegar depois)
const exigePapelTardio = (...papeis) => (req, res, next) => dependencias().exigePapel(...papeis)(req, res, next);

const substituirDependencias = (d) => { substitutas = d ? { ...dependenciasPadrao(), ...d } : null; };
function dependenciasPadrao() { const s = substitutas; substitutas = null; try { return dependencias(); } finally { substitutas = s; } }

module.exports = { dependencias, substituirDependencias, exigePapelLocal, exigePapelTardio };
