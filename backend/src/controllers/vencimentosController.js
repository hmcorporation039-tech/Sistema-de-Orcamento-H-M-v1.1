// Vencimentos de laudos e de documentos da empresa (painel inicial): lista, cadastro, renovar e encerrar.
// Os documentos da empresa (tipo 'empresa', inclusive o certificado digital) são só do administrador.
// Regras e e-mail em services/vencimentos.js. Rotas em routes/v2/vencimentos.js.
const venc = require('../services/vencimentos');
const { registrarAuditoria } = require('../services/auditoria');
const pool = require('../config/database');

const responder = (res, err) => res.status(err.status || 500).json({ erro: err.status ? err.message : 'Não foi possível concluir. Tente de novo.' });

const ehAdmin = (req) => req.usuario?.role === 'admin';
const lista = (req) => venc.listar(pool, undefined, { incluirEmpresa: ehAdmin(req) });
const negar = () => Object.assign(new Error('Os documentos da empresa são só do administrador.'), { status: 403 });

// O certificado é aberto no máximo uma vez por hora (abrir o .pfx é trabalho à toa a cada visita ao painel).
let certificadoLidoEm = 0;
async function listar(req, res) {
  try {
    await venc.sincronizarLaudos(pool);
    if (ehAdmin(req) && Date.now() - certificadoLidoEm > 3600 * 1000) {
      certificadoLidoEm = Date.now();
      await venc.sincronizarCertificado(pool);
    }
    res.json(await lista(req));
  } catch (err) { responder(res, err); }
}

// Vencimento de documento da empresa: quem não é administrador não mexe.
async function exigirPermissao(req, id) {
  if (ehAdmin(req)) return;
  const tipo = (await pool.query('SELECT tipo FROM vencimentos_laudos WHERE id = $1', [id])).rows[0]?.tipo;
  if (tipo === 'empresa') throw negar();
}

async function criar(req, res) {
  try {
    if (req.body?.tipo === 'empresa' && !ehAdmin(req)) throw negar();
    const id = await venc.criar(pool, req.body || {}, req.usuario.id);
    await registrarAuditoria(pool, { entidade: 'vencimento_laudo', entidadeId: id, acao: 'criar', usuarioId: req.usuario.id, detalhes: { descricao: req.body?.descricao, emitido_em: req.body?.emitido_em } });
    res.status(201).json({ id, ...(await lista(req)) });
  } catch (err) { responder(res, err); }
}

async function renovar(req, res) {
  try {
    await exigirPermissao(req, Number(req.params.id));
    await venc.renovar(pool, Number(req.params.id), req.body || {});
    await registrarAuditoria(pool, { entidade: 'vencimento_laudo', entidadeId: Number(req.params.id), acao: 'renovar', usuarioId: req.usuario.id, detalhes: req.body || {} });
    res.json(await lista(req));
  } catch (err) { responder(res, err); }
}

async function encerrar(req, res) {
  try {
    await exigirPermissao(req, Number(req.params.id));
    await venc.encerrar(pool, Number(req.params.id));
    await registrarAuditoria(pool, { entidade: 'vencimento_laudo', entidadeId: Number(req.params.id), acao: 'encerrar', usuarioId: req.usuario.id });
    res.json(await lista(req));
  } catch (err) { responder(res, err); }
}

module.exports = { listar, criar, renovar, encerrar };
