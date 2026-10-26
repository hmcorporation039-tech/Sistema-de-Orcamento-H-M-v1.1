// ORDENS DE SERVIÇO de campo (versão 2.0, Fase 4J). Contrato com o app de
// campo: docs/CAMPO-API.md. Regras puras (transições, conflito, validação de
// imagem, número) em utils/campo.js; aqui só banco, disco e HTTP.
//
// Quem vê: admin vê tudo; os demais, as OS em que são o responsável e as das
// obras que são deles (obra sem dono = livre, como na posse das outras rotas
// de obra). OS que o usuário não vê responde 404 (não revela que existe).
// Quem edita pelo escritório (PUT) e cria pela obra: dono da obra ou admin.
// Excluir: admin (só OS sem fotos e sem assinatura; senão cancela).
// Operações de campo (sincronizar, fotos): quem vê a OS.
//
// Arquivos: pasta da obra no sistema (services/pastasRegistros.pastaDaObra)
// em Campo\<numero>\<uuid>.<ext>; o banco guarda o caminho RELATIVO à pasta da
// obra (renomear a obra não quebra nada). Nenhum caminho vem do cliente: o nome
// é o uuid validado + a extensão do tipo conferido pelos bytes.
const crypto = require('crypto');
const fsp = require('fs/promises');
const path = require('path');
const pool = require('../config/database');
const C = require('../utils/campo');
const P = require('../utils/pastasSistema');
const { comTransacao } = require('../utils/transacao');
const { versaoDoPedido, responderConflitoOuAusente } = require('../utils/versao');
const { registrarAuditoria } = require('../utils/auditoria');
const { DISCIPLINAS_LAUDO, motorDaDisciplina } = require('../utils/disciplinasLaudo');
const { pastaDaObraPorId, seguro } = require('../services/pastasRegistros');
const { gerarPdfDeHtml } = require('../utils/pdfPuppeteer');
const { gerarFooterTemplate } = require('../utils/pdfTemplate');
const { gerarHtmlOS } = require('../utils/osPdfTemplate');
const { contentDisposition } = require('../utils/nomeArquivoDownload');

const ehAdmin = (u) => u?.role === 'admin';
const CHAVES_DISCIPLINA = DISCIPLINAS_LAUDO.map(d => d.chave);
// foto embutida no PDF como está até este tamanho; maior aparece só listada
const FOTO_PDF_MAX = 1.5 * 1024 * 1024;
const FOTOS_PDF_TOTAL = 60 * 1024 * 1024;
// folga do "agora" da lista (sincronização incremental): uma alteração cuja
// transação começou antes e terminou depois da leitura não fica para trás
const FOLGA_AGORA_MS = 2 * 60 * 1000;

class ErroPedido extends Error {
  constructor(status, mensagem, extra = {}) { super(mensagem); this.status = status; this.extra = extra; }
}
// erro de regra numa operação de campo: vira { ok: false, erro } (o app não reenvia)
class ErroRegra extends Error {}

// ── leitura ─────────────────────────────────────────────────────────────
const SQL_OS = `
  SELECT os.*, o.codigo AS obra_codigo, o.nome AS obra_nome, o.cliente_nome AS obra_cliente_nome, o.local AS obra_local,
         o.usuario_id AS obra_usuario_id, o.pasta AS obra_pasta, u.nome AS responsavel_nome, c.nome AS criado_por_nome
    FROM ordens_servico os
    JOIN obras o ON o.id = os.obra_id
    LEFT JOIN usuarios u ON u.id = os.responsavel_id
    LEFT JOIN usuarios c ON c.id = os.criado_por`;

// condição SQL de "quem vê" (params recebe o id do usuário)
function condicaoVisivel(usuario, params) {
  if (ehAdmin(usuario)) return 'TRUE';
  params.push(usuario.id);
  const n = params.length;
  return `(os.responsavel_id = $${n} OR o.usuario_id = $${n} OR o.usuario_id IS NULL)`;
}

const obraDaLinha = (row) => ({ usuario_id: row.obra_usuario_id });
const podeVer = (usuario, row) => C.podeVerOS(usuario, row, obraDaLinha(row));

// :id da rota = id numérico ou uuid da OS (a OS criada no aparelho só tem o uuid)
function lerChave(valor) {
  const s = String(valor || '');
  if (/^\d{1,10}$/.test(s) && Number(s) >= 1 && Number(s) <= 2147483647) return { coluna: 'os.id', valor: Number(s) };
  if (C.uuidValido(s)) return { coluna: 'os.uuid', valor: C.normalizarUuid(s) };
  return null;
}

// OS visível ao usuário (404 quando não existe ou ele não vê)
async function carregarOS(chaveBruta, usuario, executor = pool, { travar = false } = {}) {
  const chave = lerChave(chaveBruta);
  if (!chave) throw new ErroPedido(400, 'Identificador de OS inválido.');
  const { rows: [row] } = await executor.query(`${SQL_OS} WHERE ${chave.coluna} = $1${travar ? ' FOR UPDATE OF os' : ''}`, [chave.valor]);
  if (!row || !podeVer(usuario, row)) throw new ErroPedido(404, 'Ordem de serviço não encontrada.');
  return row;
}

async function fotosDe(ids, executor = pool) {
  const mapa = new Map(ids.map(id => [id, []]));
  if (!ids.length) return mapa;
  const { rows } = await executor.query('SELECT * FROM os_fotos WHERE os_id = ANY($1::int[]) ORDER BY tirada_em NULLS LAST, id', [ids]);
  for (const f of rows) mapa.get(f.os_id).push(f);
  return mapa;
}

function paraApi(row, fotos, usuario, opcoes = {}) {
  return {
    ...C.osParaApi(row, fotos, opcoes),
    pode_editar: C.podeEditarOS(usuario, obraDaLinha(row)) && !['concluida', 'cancelada'].includes(row.status),
    pode_excluir: ehAdmin(usuario),
  };
}

async function serializarIds(ids, usuario, opcoes = {}) {
  if (!ids.length) return [];
  const params = [ids];
  const cond = condicaoVisivel(usuario, params);
  const { rows } = await pool.query(`${SQL_OS} WHERE os.id = ANY($1::int[]) AND ${cond} ORDER BY os.id`, params);
  const fotos = await fotosDe(rows.map(r => r.id));
  return rows.map(r => paraApi(r, fotos.get(r.id), usuario, opcoes));
}

// estado da OS (o que as operações alteram) ↔ colunas
function estadoDaLinha(row) {
  return {
    status: row.status,
    iniciada_em: row.iniciada_em ? new Date(row.iniciada_em).toISOString() : null,
    concluida_em: row.concluida_em ? new Date(row.concluida_em).toISOString() : null,
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    historico: Array.isArray(row.historico) ? row.historico : [],
    observacao_final: row.observacao_final || '',
    observacao_em: row.observacao_em ? new Date(row.observacao_em).toISOString() : null,
    assinatura: row.assinatura_nome ? {
      nome: row.assinatura_nome, documento: row.assinatura_documento, arquivo: row.assinatura_arquivo,
      assinada_em: row.assinada_em ? new Date(row.assinada_em).toISOString() : null,
    } : null,
    inicio_lat: row.inicio_lat, inicio_lon: row.inicio_lon, conclusao_lat: row.conclusao_lat, conclusao_lon: row.conclusao_lon,
  };
}

async function gravarEstado(client, id, e) {
  const a = e.assinatura || {};
  await client.query(
    `UPDATE ordens_servico SET status=$1, iniciada_em=$2, concluida_em=$3, checklist=$4::jsonb, historico=$5::jsonb,
            observacao_final=$6, observacao_em=$7, assinatura_nome=$8, assinatura_documento=$9, assinatura_arquivo=$10,
            assinada_em=$11, inicio_lat=$12, inicio_lon=$13, conclusao_lat=$14, conclusao_lon=$15,
            versao=versao+1, atualizado_em=NOW()
      WHERE id=$16`,
    [e.status, e.iniciada_em, e.concluida_em, JSON.stringify(e.checklist), JSON.stringify(e.historico),
     e.observacao_final || null, e.observacao_em, a.nome || null, a.documento || null, a.arquivo || null,
     a.assinada_em || null, e.inicio_lat, e.inicio_lon, e.conclusao_lat, e.conclusao_lon, id]
  );
}

// ── arquivos (pasta da obra\Campo\<numero>) ─────────────────────────────
const pastaCampoRel = (row) => path.join('Campo', P.nomeSeguro(row.numero, `OS ${row.id}`));

async function gravarArquivoCampo(row, nomeArquivo, buffer) {
  const dirObra = await pastaDaObraPorId(row.obra_id);
  if (!dirObra) throw new Error(`pasta da obra ${row.obra_id} indisponível`);
  const rel = pastaCampoRel(row);
  await P.gravarArquivo(path.join(dirObra, rel), nomeArquivo, buffer);
  return path.join(rel, nomeArquivo).split(path.sep).join('/');
}

// caminho absoluto de um arquivo gravado (relativo à pasta da obra), sem sair dela
function caminhoArquivoCampo(obraPasta, rel) {
  if (!obraPasta || !rel) return null;
  const dirObra = path.resolve(P.caminhoDe('obra', obraPasta));
  const abs = path.resolve(dirObra, rel);
  return abs.startsWith(dirObra + path.sep) ? abs : null;
}

async function lerArquivo(abs) {
  if (!abs) return null;
  try { return await fsp.readFile(abs); } catch { return null; }
}

// ── modelos de checklist (checklistBase das skills + genérico) ──────────
let cacheModelos = null;
function modelosChecklist() {
  if (cacheModelos) return cacheModelos;
  const lista = [C.MODELO_GENERICO];
  for (const d of DISCIPLINAS_LAUDO) {
    if (!d.pasta) continue;
    try {
      const itens = C.normalizarChecklistBase(motorDaDisciplina(d.chave).checklistBase);
      if (itens.length) lista.push({ chave: d.chave, rotulo: `Inspeção — ${d.nome}`, disciplina: d.chave, itens });
    } catch (e) {
      console.warn(`Campo: checklist da disciplina ${d.chave} indisponível: ${e.message}`);
    }
  }
  cacheModelos = lista;
  return lista;
}

function itensDoModelo(chave) {
  if (chave == null) return { chave: null, checklist: [] };
  const m = modelosChecklist().find(x => x.chave === chave);
  if (!m) return { erro: 'Modelo de checklist desconhecido.' };
  return { chave: m.chave, checklist: C.checklistDoModelo(m.itens) };
}

async function conferirResponsavel(id, executor = pool) {
  if (id == null) return null;
  const { rows } = await executor.query('SELECT 1 FROM usuarios WHERE id = $1 AND ativo = true', [id]);
  return rows.length ? null : 'Responsável não encontrado (ou inativo).';
}

// INSERT com número OS-AAAA-NNNN sob trava (sem buraco: transação desfeita não consome número)
async function inserirOS(client, { uuid, obraId, dados, modelo, checklist, criadoPor }) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('ordens_servico_numero'))");
  const ano = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric' }));
  const { rows } = await client.query('SELECT numero FROM ordens_servico WHERE numero LIKE $1', [`OS-${ano}-%`]);
  const numero = C.formatarNumeroOS(ano, C.proximoNumeroOS(rows.map(r => r.numero), ano));
  const { rows: [os] } = await client.query(
    `INSERT INTO ordens_servico (uuid, numero, obra_id, titulo, descricao, tipo, disciplina, modelo_checklist, responsavel_id,
                                 agendada_para, checklist, criado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12) RETURNING id, numero`,
    [uuid, numero, obraId, dados.titulo, dados.descricao, dados.tipo, dados.disciplina, modelo, dados.responsavel_id,
     dados.agendada_para, JSON.stringify(checklist), criadoPor]
  );
  return os;
}

function responderErro(res, next, err) {
  if (err instanceof ErroPedido) return res.status(err.status).json({ erro: err.message, ...err.extra });
  return next(err);
}

// ── GET /campo/os?status=abertas|todas&desde=<iso>&obra_id= ─────────────
async function listar(req, res, next) {
  try {
    const agora = new Date();
    const params = [];
    const cond = [condicaoVisivel(req.usuario, params)];
    const status = req.query.status || 'abertas';
    if (!['abertas', 'todas'].includes(status)) throw new ErroPedido(400, 'Status inválido (use abertas ou todas).');
    if (status === 'abertas') {
      params.push(C.filtroAbertas(agora).concluidasDesde);
      cond.push(`(os.status IN ('aberta', 'em_execucao') OR (os.status = 'concluida' AND os.concluida_em >= $${params.length}))`);
    }
    if (req.query.desde) {
      const d = new Date(String(req.query.desde));
      if (Number.isNaN(d.getTime())) throw new ErroPedido(400, 'Data "desde" inválida (use ISO 8601).');
      params.push(d.toISOString());
      cond.push(`os.atualizado_em > $${params.length}`);
    }
    if (req.query.obra_id) {
      const n = Number(req.query.obra_id);
      if (!Number.isInteger(n) || n < 1 || n > 2147483647) throw new ErroPedido(400, 'Obra inválida.');
      params.push(n);
      cond.push(`os.obra_id = $${params.length}`);
    }
    const { rows } = await pool.query(
      `${SQL_OS} WHERE ${cond.join(' AND ')}
        ORDER BY CASE os.status WHEN 'em_execucao' THEN 0 WHEN 'aberta' THEN 1 WHEN 'concluida' THEN 2 ELSE 3 END,
                 os.agendada_para NULLS LAST, os.id DESC
        LIMIT 500`, params);
    const fotos = await fotosDe(rows.map(r => r.id));
    res.json({ itens: rows.map(r => paraApi(r, fotos.get(r.id), req.usuario)), agora: new Date(agora.getTime() - FOLGA_AGORA_MS).toISOString() });
  } catch (err) {
    responderErro(res, next, err);
  }
}

// ── GET /campo/os/:id ───────────────────────────────────────────────────
async function buscarUma(req, res, next) {
  try {
    const row = await carregarOS(req.params.id, req.usuario);
    const fotos = await fotosDe([row.id]);
    res.json(paraApi(row, fotos.get(row.id), req.usuario, { historico: true }));
  } catch (err) {
    responderErro(res, next, err);
  }
}

// ── GET /campo/modelos-checklist?disciplina= ────────────────────────────
async function modelos(req, res, next) {
  try {
    const disc = req.query.disciplina ? String(req.query.disciplina) : null;
    if (disc && !CHAVES_DISCIPLINA.includes(disc)) throw new ErroPedido(400, 'Disciplina inválida.');
    const itens = modelosChecklist().filter(m => !disc || m.chave === 'generico' || m.disciplina === disc);
    res.json({ itens });
  } catch (err) {
    responderErro(res, next, err);
  }
}

// ── POST /obras/:id/os (posse da obra) ──────────────────────────────────
async function criarDaObra(req, res, next) {
  try {
    const obraId = Number(req.params.id);
    const { rows: [obra] } = await pool.query('SELECT id, status FROM obras WHERE id = $1', [obraId]);
    if (!obra) throw new ErroPedido(404, 'Obra não encontrada.');
    if (obra.status === 'cancelada') throw new ErroPedido(409, 'Esta obra está cancelada; não recebe novas OS.');
    const v = C.validarDadosOS(req.body, {}, { disciplinas: CHAVES_DISCIPLINA });
    if (v.erro) throw new ErroPedido(400, v.erro);
    const erroResp = await conferirResponsavel(v.dados.responsavel_id);
    if (erroResp) throw new ErroPedido(400, erroResp);
    const m = itensDoModelo(C.chaveModelo(req.body?.modelo_checklist, v.dados.disciplina));
    if (m.erro) throw new ErroPedido(400, m.erro);
    let uuid = req.body?.uuid;
    if (uuid != null && uuid !== '' && !C.uuidValido(uuid)) throw new ErroPedido(400, 'uuid inválido.');
    uuid = uuid ? C.normalizarUuid(uuid) : crypto.randomUUID();
    const os = await comTransacao(async (client) => {
      const { rows: ja } = await client.query('SELECT 1 FROM ordens_servico WHERE uuid = $1', [uuid]);
      if (ja.length) throw new ErroPedido(409, 'Já existe uma OS com este uuid.');
      const nova = await inserirOS(client, { uuid, obraId, dados: v.dados, modelo: m.chave, checklist: m.checklist, criadoPor: req.usuario.id });
      await registrarAuditoria(client, { entidade: 'ordens_servico', entidadeId: nova.id, acao: 'criar', usuarioId: req.usuario.id, detalhes: { numero: nova.numero, obra_id: obraId } });
      return nova;
    });
    const [saida] = await serializarIds([os.id], req.usuario, { historico: true });
    res.status(201).json(saida);
  } catch (err) {
    responderErro(res, next, err);
  }
}

// ── PUT /campo/os/:id (escritório; versao → 409 se mudou) ───────────────
async function atualizar(req, res, next) {
  try {
    const atual = await carregarOS(req.params.id, req.usuario);
    if (!C.podeEditarOS(req.usuario, obraDaLinha(atual))) {
      throw new ErroPedido(403, 'Só o dono da obra ou um administrador edita a OS pelo escritório.');
    }
    if (['concluida', 'cancelada'].includes(atual.status)) {
      throw new ErroPedido(409, `Esta OS está ${atual.status === 'concluida' ? 'concluída' : 'cancelada'}; não pode mais ser editada.`);
    }
    const body = req.body || {};
    const v = C.validarDadosOS(body, atual, { disciplinas: CHAVES_DISCIPLINA });
    if (v.erro) throw new ErroPedido(400, v.erro);
    const d = v.dados;
    if (d.responsavel_id !== atual.responsavel_id) {
      const erroResp = await conferirResponsavel(d.responsavel_id);
      if (erroResp) throw new ErroPedido(400, erroResp);
    }
    let cancelar = false;
    if (Object.prototype.hasOwnProperty.call(body, 'status') && body.status !== atual.status) {
      if (body.status !== 'cancelada') throw new ErroPedido(400, 'O status muda pelo app de campo (iniciar/concluir); pelo escritório só é possível cancelar.');
      if (!ehAdmin(req.usuario)) throw new ErroPedido(403, 'Somente administradores cancelam uma OS.');
      cancelar = true;
    }
    // troca de modelo: só enquanto nada foi respondido
    let checklist = null;
    let modelo = atual.modelo_checklist;
    if (Object.prototype.hasOwnProperty.call(body, 'modelo_checklist')) {
      const chave = C.chaveModelo(body.modelo_checklist, d.disciplina);
      if (chave !== atual.modelo_checklist) {
        const usado = (atual.checklist || []).some(i => i.respondido_em || i.extra || i.observacao);
        if (usado || atual.status !== 'aberta') throw new ErroPedido(409, 'O checklist já tem respostas; não é possível trocar o modelo.');
        const m = itensDoModelo(chave);
        if (m.erro) throw new ErroPedido(400, m.erro);
        checklist = m.checklist;
        modelo = m.chave;
      }
    }
    const { rows } = await pool.query(
      `UPDATE ordens_servico SET titulo=$1, descricao=$2, tipo=$3, disciplina=$4, responsavel_id=$5, agendada_para=$6,
              modelo_checklist=$7, checklist=COALESCE($8::jsonb, checklist),
              status=CASE WHEN $9::boolean THEN 'cancelada' ELSE status END,
              cancelada_em=CASE WHEN $9::boolean THEN NOW() ELSE cancelada_em END,
              versao=versao+1, atualizado_em=NOW()
        WHERE id=$10 AND status NOT IN ('concluida', 'cancelada') AND ($11::int IS NULL OR versao = $11) RETURNING id`,
      [d.titulo, d.descricao, d.tipo, d.disciplina, d.responsavel_id, d.agendada_para, modelo,
       checklist ? JSON.stringify(checklist) : null, cancelar, atual.id, versaoDoPedido(body)]
    );
    if (!rows[0]) return responderConflitoOuAusente(pool, res, 'ordens_servico', atual.id);
    if (cancelar) await registrarAuditoria(pool, { entidade: 'ordens_servico', entidadeId: atual.id, acao: 'cancelar', usuarioId: req.usuario.id, detalhes: { numero: atual.numero } });
    const [saida] = await serializarIds([atual.id], req.usuario, { historico: true });
    res.json(saida);
  } catch (err) {
    responderErro(res, next, err);
  }
}

// ── DELETE /campo/os/:id (admin) — com fotos ou assinatura, cancela ─────
async function remover(req, res, next) {
  try {
    const chave = lerChave(req.params.id);
    if (!chave) throw new ErroPedido(400, 'Identificador de OS inválido.');
    const r = await comTransacao(async (client) => {
      const row = await carregarOS(req.params.id, req.usuario, client, { travar: true });
      const { rows: [n] } = await client.query('SELECT count(*)::int AS fotos FROM os_fotos WHERE os_id = $1', [row.id]);
      if (n.fotos > 0 || row.assinatura_nome) {
        if (row.status !== 'cancelada') {
          await client.query("UPDATE ordens_servico SET status='cancelada', cancelada_em=NOW(), versao=versao+1, atualizado_em=NOW() WHERE id=$1", [row.id]);
          await registrarAuditoria(client, { entidade: 'ordens_servico', entidadeId: row.id, acao: 'cancelar', usuarioId: req.usuario.id, detalhes: { numero: row.numero, motivo: 'exclusão pedida com fotos/assinatura' } });
        }
        return { cancelada: true, row };
      }
      await client.query('DELETE FROM ordens_servico WHERE id = $1', [row.id]);
      const { obra_pasta: _p, ...copia } = row;
      await registrarAuditoria(client, { entidade: 'ordens_servico', entidadeId: row.id, acao: 'excluir', usuarioId: req.usuario.id, detalhes: { os: copia } });
      return { cancelada: false, row };
    });
    if (r.cancelada) {
      return res.json({ cancelada: true, mensagem: `A OS ${r.row.numero} tem fotos ou assinatura: foi cancelada em vez de excluída (nada se perde).` });
    }
    // pasta Campo\<numero> vazia (sem fotos) sai junto; com algo dentro, fica
    const dir = caminhoArquivoCampo(r.row.obra_pasta, pastaCampoRel(r.row));
    if (dir) await fsp.rmdir(dir).catch(() => {});
    res.json({ cancelada: false, mensagem: `OS ${r.row.numero} excluída.` });
  } catch (err) {
    responderErro(res, next, err);
  }
}

// ── POST /campo/sincronizar ─────────────────────────────────────────────
// Cada operação na sua transação, na ordem enviada. Erro de regra → ok:false
// (gravado: o reenvio devolve o mesmo). Erro inesperado (banco, disco) → a
// requisição inteira responde 500; as operações anteriores já ficaram
// gravadas e o reenvio da fila as reconhece pelo op_uuid.
async function sincronizar(req, res, next) {
  try {
    const ops = req.body?.operacoes;
    if (!Array.isArray(ops)) throw new ErroPedido(400, 'Envie { operacoes: [...] }.');
    if (ops.length > C.LIMITES.operacoes_por_envio) throw new ErroPedido(413, `Envie no máximo ${C.LIMITES.operacoes_por_envio} operações por vez.`);
    const resultados = [];
    const afetadas = new Set();
    for (const op of ops) {
      const r = await aplicarUma(op, req.usuario);
      resultados.push(r);
      if (r.os_id) afetadas.add(r.os_id);
    }
    res.json({ resultados, os: await serializarIds([...afetadas], req.usuario) });
  } catch (err) {
    responderErro(res, next, err);
  }
}

async function aplicarUma(op, usuario) {
  const opUuid = op && typeof op === 'object' ? op.op_uuid : null;
  if (!C.uuidValido(opUuid)) return { op_uuid: opUuid ?? null, ok: false, erro: 'Operação sem identificador válido (op_uuid).' };
  const id = C.normalizarUuid(opUuid);
  if (!C.TIPOS_OPERACAO.includes(op.tipo)) return { op_uuid: opUuid, ok: false, erro: 'Tipo de operação desconhecido.' };
  return comTransacao(async (client) => {
    const gravada = async () => {
      const { rows: [j] } = await client.query('SELECT usuario_id, os_id, resultado FROM campo_operacoes WHERE op_uuid = $1', [id]);
      if (!j) return null;
      if (j.usuario_id != null && j.usuario_id !== usuario.id) return { op_uuid: opUuid, ok: false, erro: 'Este identificador de operação já foi usado por outro usuário.' };
      return { op_uuid: opUuid, ...(j.resultado || { ok: false, erro: 'Operação já recebida.' }), repetida: true };
    };
    const ja = await gravada();
    if (ja) return ja;
    const ins = await client.query(
      'INSERT INTO campo_operacoes (op_uuid, usuario_id, tipo) VALUES ($1, $2, $3) ON CONFLICT (op_uuid) DO NOTHING RETURNING id',
      [id, usuario.id, op.tipo]);
    if (!ins.rows.length) return (await gravada()) || { op_uuid: opUuid, ok: false, erro: 'Operação já recebida.' };
    let r;
    try {
      r = op.tipo === 'criar_os' ? await opCriarOS(client, op, usuario) : await opSobreOS(client, op, usuario, id);
    } catch (e) {
      if (!(e instanceof ErroRegra)) throw e;
      r = { ok: false, erro: e.message };
    }
    await client.query('UPDATE campo_operacoes SET resultado = $1::jsonb, os_id = $2 WHERE id = $3', [JSON.stringify(r), r.os_id ?? null, ins.rows[0].id]);
    return { op_uuid: opUuid, ...r };
  });
}

async function opCriarOS(client, op, usuario) {
  if (!C.uuidValido(op.os_uuid)) throw new ErroRegra('OS sem identificador válido (os_uuid).');
  const uuid = C.normalizarUuid(op.os_uuid);
  const { rows: [ja] } = await client.query(`${SQL_OS} WHERE os.uuid = $1`, [uuid]);
  if (ja) {
    if (!podeVer(usuario, ja)) throw new ErroRegra('Já existe uma OS com este identificador.');
    return { ok: true, os_id: ja.id };
  }
  const dados = (op.dados && typeof op.dados === 'object') ? op.dados : {};
  const obraId = Number(dados.obra_id);
  if (!Number.isInteger(obraId) || obraId < 1 || obraId > 2147483647) throw new ErroRegra('Obra inválida.');
  const { rows: [obra] } = await client.query('SELECT id, status, usuario_id, responsavel_id FROM obras WHERE id = $1', [obraId]);
  if (!obra) throw new ErroRegra('Obra não encontrada.');
  // regra única de quem abre OS: utils/campo.js (a lista do app usa a mesma em SQL)
  let pode = C.podeAbrirOS(usuario, obra);
  if (!pode) {
    const { rows } = await client.query('SELECT 1 FROM ordens_servico WHERE obra_id = $1 AND responsavel_id = $2 LIMIT 1', [obraId, usuario.id]);
    pode = C.podeAbrirOS(usuario, obra, { temOSNaObra: rows.length > 0 });
  }
  if (!pode) throw new ErroRegra('Você não pode abrir OS nesta obra. Peça ao escritório.');
  if (obra.status === 'cancelada') throw new ErroRegra('Esta obra está cancelada; não recebe novas OS.');
  const { responsavel_id: _r, ...semResponsavel } = dados;
  const v = C.validarDadosOS(semResponsavel, {}, { disciplinas: CHAVES_DISCIPLINA });
  if (v.erro) throw new ErroRegra(v.erro);
  v.dados.responsavel_id = usuario.id; // quem abriu no campo é o responsável
  const m = itensDoModelo(C.chaveModelo(dados.modelo_checklist, v.dados.disciplina));
  if (m.erro) throw new ErroRegra(m.erro);
  const nova = await inserirOS(client, { uuid, obraId, dados: v.dados, modelo: m.chave, checklist: m.checklist, criadoPor: usuario.id });
  await registrarAuditoria(client, { entidade: 'ordens_servico', entidadeId: nova.id, acao: 'criar', usuarioId: usuario.id, detalhes: { numero: nova.numero, obra_id: obraId, origem: 'campo' } });
  return { ok: true, os_id: nova.id };
}

async function opSobreOS(client, op, usuario, opUuid) {
  if (!C.uuidValido(op.os_uuid)) throw new ErroRegra('OS sem identificador válido (os_uuid).');
  const { rows: [row] } = await client.query(`${SQL_OS} WHERE os.uuid = $1 FOR UPDATE OF os`, [C.normalizarUuid(op.os_uuid)]);
  if (!row || !podeVer(usuario, row)) throw new ErroRegra('OS não encontrada (pode ter sido excluída ou passada para outro técnico).');
  const r = C.aplicarOperacao(estadoDaLinha(row), op, { agora: new Date(), usuario_id: usuario.id });
  if (!r.ok) return { ok: false, erro: r.erro, os_id: row.id };
  if (r.efeitos.assinaturaPng) r.estado.assinatura.arquivo = await gravarArquivoCampo(row, `assinatura-${opUuid}.png`, r.efeitos.assinaturaPng);
  if (r.mudou) await gravarEstado(client, row.id, r.estado);
  return { ok: true, os_id: row.id };
}

// ── POST /campo/os/:id/fotos (multipart; idempotente pelo uuid da foto) ─
async function enviarFoto(req, res, next) {
  try {
    if (!req.file) throw new ErroPedido(400, 'Envie a foto no campo "foto".');
    const lida = C.dadosDaFoto(req.body);
    if (lida.erro) throw new ErroPedido(400, lida.erro);
    const d = lida.dados;
    const row = await carregarOS(req.params.id, req.usuario);
    const existente = async () => (await pool.query('SELECT * FROM os_fotos WHERE uuid = $1', [d.uuid])).rows[0];
    const repetida = (f) => {
      if (f.os_id !== row.id) throw new ErroPedido(409, 'Este identificador de foto já foi usado em outra OS.');
      return res.status(200).json({ ...C.fotoParaApi(f), os_id: row.id, repetida: true });
    };
    const ja = await existente();
    if (ja) return repetida(ja);
    const erroStatus = C.conferirFoto(estadoDaLinha(row));
    if (erroStatus) throw new ErroPedido(409, erroStatus);
    const tipo = C.tipoImagem(req.file.buffer);
    if (!tipo) throw new ErroPedido(415, 'A foto precisa ser JPEG, PNG ou WebP.');
    const { rows: [n] } = await pool.query('SELECT count(*)::int AS qtd FROM os_fotos WHERE os_id = $1', [row.id]);
    if (n.qtd >= C.LIMITES.fotos_por_os) throw new ErroPedido(409, `Esta OS já tem ${C.LIMITES.fotos_por_os} fotos (limite).`);
    const arquivo = await gravarArquivoCampo(row, `${d.uuid}.${C.EXTENSAO[tipo]}`, req.file.buffer);
    const { rows: [nova] } = await pool.query(
      `INSERT INTO os_fotos (uuid, os_id, item_id, legenda, arquivo, tipo_mime, tirada_em, lat, lon, tamanho, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (uuid) DO NOTHING RETURNING *`,
      [d.uuid, row.id, d.item_id, d.legenda, arquivo, tipo, d.tirada_em, d.lat, d.lon, req.file.buffer.length, req.usuario.id]);
    if (!nova) return repetida(await existente()); // mesmo uuid chegando ao mesmo tempo
    await pool.query('UPDATE ordens_servico SET versao = versao + 1, atualizado_em = NOW() WHERE id = $1', [row.id]);
    res.status(201).json({ ...C.fotoParaApi(nova), os_id: row.id });
  } catch (err) {
    responderErro(res, next, err);
  }
}

// ── GET /campo/fotos/:uuid ──────────────────────────────────────────────
async function verFoto(req, res, next) {
  try {
    if (!C.uuidValido(req.params.uuid)) throw new ErroPedido(400, 'Identificador de foto inválido.');
    const { rows: [f] } = await pool.query(
      `SELECT f.arquivo, f.tipo_mime, os.responsavel_id, o.usuario_id AS obra_usuario_id, o.pasta AS obra_pasta
         FROM os_fotos f JOIN ordens_servico os ON os.id = f.os_id JOIN obras o ON o.id = os.obra_id
        WHERE f.uuid = $1`, [C.normalizarUuid(req.params.uuid)]);
    if (!f || !podeVer(req.usuario, f)) throw new ErroPedido(404, 'Foto não encontrada.');
    const buf = await lerArquivo(caminhoArquivoCampo(f.obra_pasta, f.arquivo));
    if (!buf) throw new ErroPedido(404, 'O arquivo da foto não está na pasta da obra.');
    res.set({ 'Content-Type': f.tipo_mime, 'Cache-Control': 'private, max-age=86400' });
    res.send(buf);
  } catch (err) {
    responderErro(res, next, err);
  }
}

// ── GET /campo/os/:id/assinatura ────────────────────────────────────────
async function verAssinatura(req, res, next) {
  try {
    const row = await carregarOS(req.params.id, req.usuario);
    if (!row.assinatura_arquivo) throw new ErroPedido(404, 'Esta OS ainda não tem assinatura.');
    const buf = await lerArquivo(caminhoArquivoCampo(row.obra_pasta, row.assinatura_arquivo));
    if (!buf || !C.ehPng(buf)) throw new ErroPedido(404, 'O arquivo da assinatura não está na pasta da obra.');
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'private, no-cache' });
    res.send(buf);
  } catch (err) {
    responderErro(res, next, err);
  }
}

// ── GET /campo/os/:id/pdf ───────────────────────────────────────────────
async function pdf(req, res, next) {
  try {
    const row = await carregarOS(req.params.id, req.usuario);
    const fotos = (await fotosDe([row.id])).get(row.id);
    const os = C.osParaApi(row, fotos, { historico: true });
    const imagens = new Map();
    let total = 0;
    for (const f of fotos) {
      if (f.tamanho > FOTO_PDF_MAX || total + f.tamanho > FOTOS_PDF_TOTAL) { imagens.set(f.uuid, null); continue; }
      const buf = await lerArquivo(caminhoArquivoCampo(row.obra_pasta, f.arquivo));
      const tipo = buf && C.tipoImagem(buf);
      imagens.set(f.uuid, tipo ? `data:${tipo};base64,${buf.toString('base64')}` : null);
      if (tipo) total += buf.length;
    }
    let assinaturaUri = null;
    if (row.assinatura_arquivo) {
      const buf = await lerArquivo(caminhoArquivoCampo(row.obra_pasta, row.assinatura_arquivo));
      if (buf && C.ehPng(buf)) assinaturaUri = `data:image/png;base64,${buf.toString('base64')}`;
    }
    const html = gerarHtmlOS({ os, imagens, assinaturaUri, emitidoPor: req.usuario?.nome });
    const arquivoPdf = await gerarPdfDeHtml(html, {
      margin: { top: '10mm', bottom: '22mm', left: '10mm', right: '10mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: gerarFooterTemplate(),
    });
    // cópia na pasta da obra (Campo\<numero>\Relatório <numero>.pdf), sobrescrita a cada geração
    await seguro(`pdf ${row.numero}`, () => gravarArquivoCampo(row, `Relatório ${row.numero}.pdf`, arquivoPdf));
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': contentDisposition(`Relatório ${row.numero}.pdf`) });
    res.send(arquivoPdf);
  } catch (err) {
    responderErro(res, next, err);
  }
}

module.exports = {
  listar, buscarUma, modelos, criarDaObra, atualizar, remover, sincronizar, enviarFoto, verFoto, verAssinatura, pdf,
  // para testes
  _interno: { lerChave, caminhoArquivoCampo, modelosChecklist },
};
