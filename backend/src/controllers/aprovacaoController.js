// Versão 2.0 — Fase 3I: aprovação da proposta por link.
//
// Duas metades:
//   - INTERNA (login): gerar, listar e revogar links; ver as decisões.
//     Rotas em routes/v2/aprovacao.js, com autenticar (+ posse para alterar).
//   - PÚBLICA (sem login, prefixo /api/publico/aprovacao/:token): o cliente vê
//     a proposta, baixa o PDF e registra UMA decisão (aprovar/recusar).
//
// Segurança da parte pública (detalhes em utils/aprovacaoLink.js):
//   - token de 32 bytes aleatórios; no banco só o hash sha-256;
//   - token inexistente, expirado ou revogado → a MESMA resposta 404;
//   - só campos da lista fechada de montarPropostaPublica (as do PDF do cliente);
//   - erro nunca devolve detalhe/stack, e o log não leva o token;
//   - decisão numa transação com a linha do link e a da proposta travadas
//     (FOR UPDATE) + UNIQUE(link_id): dois cliques simultâneos não geram duas.
//
// É aceite eletrônico simples, NÃO assinatura ICP-Brasil — dito na tela, no
// comprovante e no texto da declaração gravado com a decisão.
const pool = require('../config/database');
const { comTransacao } = require('../utils/transacao');
const { registrarAuditoria } = require('../utils/auditoria');
const { registrarEvento, aplicarStatusProposta, montarPdfBuffer } = require('./propostasController');
const A = require('../utils/aprovacaoLink');
const { contentDisposition } = require('../utils/nomeArquivoDownload');
const { normalizarTextos } = require('../middleware/textoBemFormado');

const SQL_PROPOSTA = "SELECT p.*, to_char(p.data, 'YYYY-MM-DD') AS data_iso FROM propostas p WHERE p.id = $1";

async function conteudoPublico(executor, proposta) {
  const secoes = await executor.query('SELECT id, nome, ordem FROM proposta_secoes WHERE proposta_id = $1 ORDER BY ordem, id', [proposta.id]);
  const itens = await executor.query(
    'SELECT secao_id, descricao, codigo, quantidade, unidade, valor_unitario, valor_total, subgrupo FROM proposta_itens WHERE proposta_id = $1 ORDER BY ordem, id',
    [proposta.id]
  );
  const pub = A.montarPropostaPublica(proposta, secoes.rows, itens.rows);
  return { pub, hash: A.hashConteudo(pub) };
}

// URL pública do sistema (ex.: https://orcamentos.hemengetecnologia.com.br), se
// configurada; senão a tela usa o endereço em que está aberta.
function urlPublicaBase() {
  const u = String(process.env.URL_PUBLICA || '').trim().replace(/\/+$/, '');
  return /^https?:\/\/[^\s/]+/i.test(u) ? u : null;
}

// CPF/CNPJ com o meio à mostra (padrão de comprovante): ***.456.789-** / **.345.678/0001-**
function mascararDocumento(formatado) {
  const t = String(formatado || '');
  if (t.length < 8) return t ? '***' : t;
  return t.replace(/^(.{3})/, m => m.replace(/[0-9A-Za-z]/g, '*')).replace(/(.{2})$/, m => m.replace(/[0-9A-Za-z]/g, '*'));
}

// publico: a página aberta pelo link (que costuma ser encaminhado) mostra o
// documento mascarado e não mostra e-mail nem IP — o registro completo fica
// para a H&M (listarDecisoes), conforme a LGPD.
function comprovante(d, { publico = false } = {}) {
  const documento = A.formatarDocumento(d.documento, d.tipo_documento);
  const completo = {
    codigo: A.codigoComprovante(d.id, d.hash_conteudo),
    decisao: d.decisao,
    numero: d.numero_proposta,
    total: Number(d.total),
    nome: d.nome,
    tipo_documento: d.tipo_documento,
    documento,
    cargo: d.cargo || null,
    email: d.email || null,
    observacao: d.observacao || null,
    decidido_em: d.decidido_em,
    decidido_em_texto: `${A.dataHoraBR(d.decidido_em)} (horário de Brasília)`,
    ip: d.ip || null,
    hash_conteudo: d.hash_conteudo,
    texto_declaracao: d.texto_declaracao,
    aviso: A.AVISO_JURIDICO,
  };
  return publico ? { ...completo, documento: mascararDocumento(documento), email: null, ip: null } : completo;
}

// ════════════════════════ PARTE INTERNA (com login) ════════════════════════

async function gerarLink(req, res, next) {
  try {
    const { rows } = await pool.query(SQL_PROPOSTA, [req.params.id]);
    const proposta = rows[0];
    if (!proposta) return res.status(404).json({ erro: 'Proposta não encontrada.' });
    if (proposta.status !== 'Ativa') {
      return res.status(409).json({ erro: `Só proposta Ativa pode receber link de aprovação (esta está ${proposta.status}).` });
    }
    if (A.propostaVencida(proposta.data_iso, proposta.validade)) {
      return res.status(409).json({
        erro: `A validade desta proposta terminou em ${A.dataBR(A.vencimentoProposta(proposta.data_iso, proposta.validade))}. Atualize a data ou a validade antes de gerar o link.`,
      });
    }
    const expira = A.calcularExpiracao({ dataIso: proposta.data_iso, validade: proposta.validade, dias: req.body?.dias });
    if (expira.erro) return res.status(400).json({ erro: expira.erro });

    const token = A.gerarToken();
    const link = await comTransacao(async (client) => {
      const r = await client.query(
        `INSERT INTO proposta_links_aprovacao (proposta_id, token_hash, criado_por, expira_em)
         VALUES ($1, $2, $3, $4) RETURNING id, criado_em, expira_em`,
        [proposta.id, A.hashToken(token), req.usuario.id, expira]
      );
      await registrarEvento(client, proposta.id, req.usuario.id, 'link_aprovacao',
        `Link de aprovação #${r.rows[0].id} gerado (válido até ${A.dataHoraBR(r.rows[0].expira_em)})`);
      await registrarAuditoria(client, {
        entidade: 'propostas', entidadeId: proposta.id, acao: 'gerar_link_aprovacao', usuarioId: req.usuario.id,
        detalhes: { link_id: r.rows[0].id, expira_em: r.rows[0].expira_em },
      });
      return r.rows[0];
    });

    // O token em claro só existe nesta resposta: depois, nem o sistema sabe montá-lo.
    res.status(201).json({
      id: link.id,
      token,
      caminho: `/aprovacao/${token}`,
      url_publica_base: urlPublicaBase(),
      expira_em: link.expira_em,
      criado_em: link.criado_em,
      numero: proposta.numero,
      cliente_nome: proposta.cliente_nome,
      total: Number(proposta.total),
    });
  } catch (err) {
    next(err);
  }
}

async function listarLinks(req, res, next) {
  try {
    const existe = await pool.query('SELECT id FROM propostas WHERE id = $1', [req.params.id]);
    if (!existe.rows.length) return res.status(404).json({ erro: 'Proposta não encontrada.' });
    const { rows } = await pool.query(
      `SELECT l.id, l.criado_em, l.expira_em, l.revogado_em, l.ultimo_acesso_em, l.acessos,
              uc.nome AS criado_por_nome, ur.nome AS revogado_por_nome,
              d.id AS decisao_id, d.decisao, d.nome AS decisao_nome, d.decidido_em
         FROM proposta_links_aprovacao l
         LEFT JOIN usuarios uc ON uc.id = l.criado_por
         LEFT JOIN usuarios ur ON ur.id = l.revogado_por
         LEFT JOIN proposta_decisoes_aprovacao d ON d.link_id = l.id
        WHERE l.proposta_id = $1
        ORDER BY l.criado_em DESC, l.id DESC`,
      [req.params.id]
    );
    const agora = new Date();
    res.json({
      url_publica_base: urlPublicaBase(),
      links: rows.map(l => ({
        id: l.id,
        criado_em: l.criado_em,
        criado_por_nome: l.criado_por_nome || null,
        expira_em: l.expira_em,
        revogado_em: l.revogado_em,
        revogado_por_nome: l.revogado_por_nome || null,
        ultimo_acesso_em: l.ultimo_acesso_em,
        acessos: l.acessos,
        // 'ativo' | 'expirado' | 'revogado' | 'usado' (já tem decisão)
        estado: l.decisao_id ? 'usado' : A.estadoLink(l, agora),
        decisao: l.decisao_id ? { id: l.decisao_id, decisao: l.decisao, nome: l.decisao_nome, decidido_em: l.decidido_em } : null,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function revogarLink(req, res, next) {
  const linkId = Number(req.params.linkId);
  if (!Number.isInteger(linkId) || linkId < 1 || linkId > 2147483647) return res.status(400).json({ erro: 'Identificador inválido.' });
  try {
    const r = await comTransacao(async (client) => {
      const atual = await client.query(
        'SELECT id, revogado_em FROM proposta_links_aprovacao WHERE id = $1 AND proposta_id = $2 FOR UPDATE',
        [linkId, req.params.id]
      );
      if (!atual.rows.length) return { http: 404, erro: 'Link não encontrado nesta proposta.' };
      if (atual.rows[0].revogado_em) return { http: 409, erro: 'Este link já estava revogado.' };
      const upd = await client.query(
        'UPDATE proposta_links_aprovacao SET revogado_em = NOW(), revogado_por = $2 WHERE id = $1 RETURNING id, revogado_em',
        [linkId, req.usuario.id]
      );
      await registrarEvento(client, req.params.id, req.usuario.id, 'link_revogado', `Link de aprovação #${linkId} revogado`);
      await registrarAuditoria(client, {
        entidade: 'propostas', entidadeId: Number(req.params.id), acao: 'revogar_link_aprovacao', usuarioId: req.usuario.id,
        detalhes: { link_id: linkId },
      });
      return { link: upd.rows[0] };
    });
    if (r.erro) return res.status(r.http).json({ erro: r.erro });
    res.json({ mensagem: 'Link revogado. Quem tiver o endereço não consegue mais abrir a proposta.', ...r.link });
  } catch (err) {
    next(err);
  }
}

async function listarDecisoes(req, res, next) {
  try {
    const existe = await pool.query('SELECT id FROM propostas WHERE id = $1', [req.params.id]);
    if (!existe.rows.length) return res.status(404).json({ erro: 'Proposta não encontrada.' });
    const completo = req.query.completo === '1';
    const { rows } = await pool.query(
      `SELECT * FROM proposta_decisoes_aprovacao WHERE proposta_id = $1 ORDER BY decidido_em DESC, id DESC`,
      [req.params.id]
    );
    res.json(rows.map(d => ({
      id: d.id,
      link_id: d.link_id,
      ...comprovante(d),
      aceite_termos: d.aceite_termos,
      user_agent: d.user_agent || null,
      ...(completo ? { conteudo: d.conteudo } : {}),
    })));
  } catch (err) {
    next(err);
  }
}

// ════════════════════════ PARTE PÚBLICA (sem login) ════════════════════════

// Toda falha inesperada da parte pública: log sem o token, resposta genérica.
function falhaPublica(res, onde, err) {
  console.error(`[aprovação pública] erro em ${onde}:`, err?.message || err);
  if (!res.headersSent) res.status(500).json({ erro: 'Não foi possível concluir agora. Tente de novo em alguns minutos.' });
}

const linkInvalido = (res) => res.status(404).json({ erro: A.MSG_LINK_INVALIDO, codigo: 'LINK_INVALIDO' });

// Link válido (existe, não expirou, não foi revogado) ou null
async function buscarLinkValido(executor, token, { travar = false } = {}) {
  if (!A.formatoTokenValido(token)) return null;
  const hash = A.hashToken(token);
  const { rows } = await executor.query(
    `SELECT * FROM proposta_links_aprovacao WHERE token_hash = $1${travar ? ' FOR UPDATE' : ''}`,
    [hash]
  );
  const link = rows[0];
  if (!link || !A.hashesIguais(link.token_hash, hash)) return null;
  return A.estadoLink(link) === 'ativo' ? link : null;
}

function situacaoDaProposta(proposta, decisao) {
  if (decisao) return { situacao: 'decidida', mensagem: null };
  const r = A.avaliarProposta(proposta);
  return r.ok ? { situacao: 'aberta', mensagem: null } : { situacao: 'indisponivel', mensagem: r.erro, codigo: r.codigo };
}

async function verPublico(req, res) {
  try {
    const link = await buscarLinkValido(pool, req.params.token);
    if (!link) return linkInvalido(res);
    const { rows } = await pool.query(SQL_PROPOSTA, [link.proposta_id]);
    if (!rows.length) return linkInvalido(res);
    const proposta = rows[0];
    await pool.query('UPDATE proposta_links_aprovacao SET acessos = acessos + 1, ultimo_acesso_em = NOW() WHERE id = $1', [link.id]);

    const dec = await pool.query('SELECT * FROM proposta_decisoes_aprovacao WHERE link_id = $1', [link.id]);
    const decisao = dec.rows[0] || null;
    const { pub, hash } = await conteudoPublico(pool, proposta);
    const sit = situacaoDaProposta(proposta, decisao);
    res.json({
      proposta: pub,
      hash_conteudo: hash,
      ...sit,
      link_expira_em: link.expira_em,
      texto_declaracao_aprovar: A.textoDeclaracao('aprovada', pub),
      texto_declaracao_recusar: A.textoDeclaracao('recusada', pub),
      aviso: A.AVISO_JURIDICO,
      comprovante: decisao ? comprovante(decisao, { publico: true }) : null,
      // modelo 3D ilustrativo (2.3), quando quem orçou ligou para o cliente
      modelo_3d: proposta.modelo_3d_cliente === true && sit.situacao !== 'indisponivel',
    });
  } catch (err) {
    falhaPublica(res, 'ver proposta', err);
  }
}

async function pdfPublico(req, res) {
  try {
    const link = await buscarLinkValido(pool, req.params.token);
    if (!link) return linkInvalido(res);
    // o mesmo PDF do cliente (gerarHtmlProposta como está); nada é gravado em pasta
    // proposta cancelada ou recusada: a página já diz "indisponível"; o PDF também some
    const { rows: [st] } = await pool.query('SELECT status FROM propostas WHERE id = $1', [link.proposta_id]);
    if (!st || st.status === 'Cancelada' || st.status === 'Recusada') return linkInvalido(res);
    const r = await montarPdfBuffer(link.proposta_id);
    if (!r) return linkInvalido(res);
    const nome = `Proposta_${String(r.proposta.numero || '').replace(/[^A-Za-z0-9_-]+/g, '_')}_HM_Engenharia.pdf`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': contentDisposition(nome, 'inline') });
    // puppeteer 25 devolve Uint8Array; sem Buffer.from o Express 4 responde JSON ({"0":37,...})
    res.send(Buffer.from(r.pdf));
  } catch (err) {
    falhaPublica(res, 'PDF', err);
  }
}

// Modelo 3D ilustrativo da proposta (2.3): só com o "mostrar ao cliente"
// ligado e proposta não cancelada/recusada. A página roda em sandbox
// (modelo3dController.enviarPagina): o script do 3D não lê nada do sistema.
async function modelo3dPublico(req, res) {
  try {
    const link = await buscarLinkValido(pool, req.params.token);
    if (!link) return linkInvalido(res);
    const { rows: [p] } = await pool.query('SELECT id, status, modelo_3d_cliente FROM propostas WHERE id = $1', [link.proposta_id]);
    if (!p || !p.modelo_3d_cliente || p.status === 'Cancelada' || p.status === 'Recusada') return linkInvalido(res);
    const m = await require('../services/modelo3d').obterModelo('proposta', p.id);
    if (!m) return linkInvalido(res);
    require('./modelo3dController').enviarPagina(res, m.html);
  } catch (err) {
    falhaPublica(res, 'modelo 3D', err);
  }
}

async function decidirPublico(req, res) {
  if (!A.formatoTokenValido(req.params.token)) return linkInvalido(res);
  // textos bem formados também aqui (o server.js já faz para todo corpo JSON):
  // surrogate solto no nome derrubava a auditoria e a decisão sumia (revisão 27/10/2026)
  const { erro, dados } = A.validarDecisao(normalizarTextos(req.body || {}));
  if (erro) return res.status(400).json({ erro });

  const ip = A.ipDoPedido(req);
  const userAgent = String(req.get('user-agent') || '').slice(0, 500) || null;
  try {
    const r = await comTransacao(async (client) => {
      const link = await buscarLinkValido(client, req.params.token, { travar: true });
      if (!link) return { http: 404, corpo: { erro: A.MSG_LINK_INVALIDO, codigo: 'LINK_INVALIDO' } };
      const { rows } = await client.query(`${SQL_PROPOSTA} FOR UPDATE`, [link.proposta_id]);
      const proposta = rows[0];
      const existente = await client.query('SELECT id FROM proposta_decisoes_aprovacao WHERE link_id = $1', [link.id]);
      const pode = A.avaliarDecisao({ link, proposta, decisaoExistente: existente.rows[0] || null });
      if (!pode.ok) return { http: pode.http, corpo: { erro: pode.erro, codigo: pode.codigo } };

      const { pub, hash } = await conteudoPublico(client, proposta);
      if (dados.hash_conteudo !== hash) {
        return { http: 409, corpo: { erro: 'A proposta foi atualizada depois que esta página foi aberta. Recarregue para ver a versão atual antes de decidir.', codigo: 'PROPOSTA_ALTERADA' } };
      }

      const declaracao = A.textoDeclaracao(dados.decisao, pub);
      const ins = await client.query(
        `INSERT INTO proposta_decisoes_aprovacao
           (link_id, proposta_id, numero_proposta, total, decisao, nome, tipo_documento, documento, cargo, email,
            observacao, aceite_termos, texto_declaracao, ip, user_agent, hash_conteudo, conteudo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
        [link.id, proposta.id, proposta.numero, pub.totais.total, dados.decisao, dados.nome, dados.documento.tipo,
          dados.documento.numero, dados.cargo, dados.email, dados.observacao, dados.aceite, declaracao, ip, userAgent,
          hash, JSON.stringify(pub)]
      );
      const d = ins.rows[0];

      // mesmo caminho da tela: status + evento + obra "contratada" (se aprovada)
      const status = dados.decisao === 'aprovada' ? 'Aprovada' : 'Recusada';
      await aplicarStatusProposta(client, proposta.id, status, null, `Status alterado para ${status} pelo cliente (link de aprovação #${link.id})`);
      const quem = `${dados.nome}, ${dados.documento.tipo} ${dados.documento.formatado}${dados.cargo ? `, ${dados.cargo}` : ''}, IP ${ip || '—'}`;
      const detalhes = dados.decisao === 'aprovada'
        ? `Aprovada pelo cliente via link (${quem}) — comprovante ${A.codigoComprovante(d.id, hash)}`
        : `Recusada pelo cliente via link (${quem})${dados.observacao ? ` — motivo: ${dados.observacao.slice(0, 500)}` : ''} — comprovante ${A.codigoComprovante(d.id, hash)}`;
      await registrarEvento(client, proposta.id, null, dados.decisao === 'aprovada' ? 'aprovada_link' : 'recusada_link', detalhes);
      await registrarAuditoria(client, {
        entidade: 'propostas', entidadeId: proposta.id, acao: dados.decisao === 'aprovada' ? 'aprovada_pelo_cliente' : 'recusada_pelo_cliente',
        detalhes: { decisao_id: d.id, link_id: link.id, nome: dados.nome, documento: dados.documento.formatado, ip, user_agent: userAgent, hash_conteudo: hash, total: pub.totais.total },
      });
      return { http: 201, corpo: { mensagem: status === 'Aprovada' ? 'Proposta aprovada. Obrigado!' : 'Recusa registrada. Obrigado pelo retorno.', comprovante: comprovante(d) } };
    });
    res.status(r.http).json(r.corpo);
  } catch (err) {
    // UNIQUE(link_id): outra aba gravou a decisão no mesmo instante
    if (err && err.code === '23505') {
      return res.status(409).json({ erro: 'Já existe uma decisão registrada por este link. Cada link aceita uma única decisão.', codigo: 'JA_DECIDIDA' });
    }
    falhaPublica(res, 'registrar decisão', err);
  }
}

module.exports = { gerarLink, listarLinks, revogarLink, listarDecisoes, verPublico, pdfPublico, decidirPublico, modelo3dPublico };
