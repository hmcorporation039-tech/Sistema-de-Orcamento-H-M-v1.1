// Modelo 3D ilustrativo (versão 2.3) — ver services/modelo3d.
// Rotas em routes/v2/modelo3d.js.
const path = require('path');
const pool = require('../config/database');
const M = require('../services/modelo3d');
const { cad } = require('../utils/disciplinasLaudo');
const { contentDisposition } = require('../utils/nomeArquivoDownload');
const { registrarAuditoria } = require('../utils/auditoria');
const P = require('../utils/pastasSistema');
const { pastaDoLaudo, pastaDoProjeto, seguro } = require('../services/pastasRegistros');

const ORIGENS = new Set(['laudo', 'analise', 'proposta']);

function responderErro(res, err, contexto) {
  if (err.status && err.status < 500) return res.status(err.status).json({ erro: err.message });
  console.error(`Erro no modelo 3D (${contexto}):`, err);
  return res.status(500).json({ erro: err.status ? err.message : 'Erro interno ao gerar o modelo 3D.' });
}

function lerOrigem(req, res) {
  const { origem } = req.params;
  if (!ORIGENS.has(origem)) { res.status(400).json({ erro: 'Origem do modelo 3D inválida.' }); return null; }
  return { origem, id: Number(req.params.id) };
}

// Cópia "Modelo 3D - <nome>.html" na pasta do projeto/análise (como a planta DXF)
async function gravarNaPasta(m) {
  const { origemTipo, origemId } = m.fonte;
  await seguro(`modelo 3D ${origemTipo} ${origemId}`, async () => {
    const tabela = origemTipo === 'laudo' ? 'laudos_projetos' : 'analises_projeto';
    const { rows: [row] } = await pool.query(`SELECT * FROM ${tabela} WHERE id = $1`, [origemId]);
    if (!row) return;
    const pasta = origemTipo === 'laudo' ? await pastaDoLaudo(row) : await pastaDoProjeto(row);
    await P.gravarArquivo(pasta, M.nomeArquivo(m.fonte), Buffer.from(m.html, 'utf8'));
  });
}

const resumoPublico = (m) => ({ numeros: m.numeros, avisos: m.avisos, gerado_em: m.gerado_em, arquivo: m.nome_arquivo });

// GET /modelo-3d/:origem/:id — tem arquitetura? (não gera)
async function situacao(req, res) {
  const o = lerOrigem(req, res);
  if (!o) return;
  try {
    res.json(await M.situacao(o.origem, o.id));
  } catch (err) { responderErro(res, err, 'situação'); }
}

// POST /modelo-3d/:origem/:id/abrir — gera (ou pega do cache) e devolve um link
// curto para abrir numa aba nova
async function abrir(req, res) {
  const o = lerOrigem(req, res);
  if (!o) return;
  try {
    const m = await M.obterModelo(o.origem, o.id);
    if (!m) return res.status(400).json({ erro: 'Envie primeiro a arquitetura (.dwg ou .dxf) para gerar o modelo 3D.' });
    if (o.origem !== 'proposta') await gravarNaPasta(m);
    res.json({ url: `/api/modelo-3d/ver/${M.criarLink(o.origem, o.id)}`, ...resumoPublico(m) });
  } catch (err) { responderErro(res, err, 'abrir'); }
}

// GET /modelo-3d/:origem/:id/arquivo — o HTML para baixar (abre sem internet)
async function arquivo(req, res) {
  const o = lerOrigem(req, res);
  if (!o) return;
  try {
    const m = await M.obterModelo(o.origem, o.id);
    if (!m) return res.status(400).json({ erro: 'Envie primeiro a arquitetura (.dwg ou .dxf) para gerar o modelo 3D.' });
    const nome = M.nomeArquivo(m.fonte);
    res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': contentDisposition(nome), 'X-Nome-Arquivo': encodeURIComponent(nome) });
    res.send(Buffer.from(m.html, 'utf8'));
  } catch (err) { responderErro(res, err, 'baixar'); }
}

// Página do 3D com a política própria (script embutido em sandbox)
function enviarPagina(res, html) {
  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': M.CSP_MODELO_3D,
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  res.send(html);
}

// GET /modelo-3d/ver/:token — sem login: o token curto (10 min) é a autorização
async function ver(req, res) {
  const l = M.lerLink(req.params.token);
  if (!l) return res.status(404).type('text/plain; charset=utf-8').send('Link do modelo 3D expirado. Abra de novo pelo sistema.');
  try {
    const m = await M.obterModelo(l.origemTipo, l.origemId);
    if (!m) return res.status(404).type('text/plain; charset=utf-8').send('Este registro não tem mais arquitetura para o modelo 3D.');
    enviarPagina(res, m.html);
  } catch (err) {
    console.error('Erro ao servir o modelo 3D:', err.message);
    res.status(err.status && err.status < 500 ? err.status : 500).type('text/plain; charset=utf-8').send(err.status ? err.message : 'Erro ao gerar o modelo 3D.');
  }
}

// POST /projetos/analises/:id/arquitetura — DWG/DXF da arquitetura na análise
async function enviarArquiteturaAnalise(req, res) {
  try {
    const arq = req.file;
    if (!arq) return res.status(400).json({ erro: 'Envie o arquivo da arquitetura (.dwg ou .dxf).' });
    const { rows: [analise] } = await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [req.params.id]);
    if (!analise) return res.status(404).json({ erro: 'Análise não encontrada.' });
    let texto, origem, leitura;
    try { ({ texto, origem } = await cad().textoDxfDoArquivo(arq.buffer, arq.originalname)); } catch (e) { return res.status(400).json({ erro: e.message }); }
    try { leitura = cad().lerArquitetura(texto); } catch (e) { return res.status(400).json({ erro: `Não consegui ler a arquitetura: ${e.message}` }); }
    // mesmo formato de laudos_projetos_arquitetura: o projeto criado da análise copia esta linha
    const resumo = {
      ambientes: leitura.ambientes.map(x => ({ nome: x.nome, area_m2: x.area_m2, perimetro_m: x.perimetro_m, origem: x.origem })),
      portas: leitura.portas.length, layers: leitura.layers.length, fatorUnidade: leitura.fatorUnidade, origem,
    };
    await pool.query(
      `INSERT INTO analises_projeto_arquitetura (analise_id, nome_arquivo, conteudo, resumo, usuario_id) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (analise_id) DO UPDATE SET nome_arquivo = EXCLUDED.nome_arquivo, conteudo = EXCLUDED.conteudo, resumo = EXCLUDED.resumo, usuario_id = EXCLUDED.usuario_id, criado_em = NOW()`,
      [analise.id, String(arq.originalname).slice(0, 200), Buffer.from(texto, 'utf8'), resumo, req.usuario.id]);
    await registrarAuditoria(pool, { entidade: 'analises_projeto', entidadeId: analise.id, acao: 'arquitetura_3d', detalhes: { arquivo: arq.originalname }, usuarioId: req.usuario.id });
    await seguro(`arquitetura análise ${analise.id}`, async () => {
      await P.gravarArquivo(path.join(await pastaDoProjeto(analise), 'Arquitetura'), arq.originalname, arq.buffer);
    });
    res.status(201).json({ nome_arquivo: arq.originalname, ...resumo, ambientes: resumo.ambientes.length });
  } catch (err) { responderErro(res, err, 'arquitetura da análise'); }
}

// GET /projetos/analises/:id/arquitetura
async function verArquiteturaAnalise(req, res) {
  try {
    const { rows: [a] } = await pool.query('SELECT nome_arquivo, resumo, criado_em FROM analises_projeto_arquitetura WHERE analise_id = $1', [req.params.id]);
    res.json(a || null);
  } catch (err) { responderErro(res, err, 'ver arquitetura da análise'); }
}

// PATCH /propostas/:id/modelo-3d-cliente { mostrar } — o cliente vê o 3D no
// link de aprovação e a imagem no PDF
async function mostrarAoCliente(req, res) {
  try {
    const mostrar = req.body?.mostrar === true;
    if (mostrar) {
      const s = await M.situacao('proposta', Number(req.params.id));
      if (!s.disponivel) return res.status(400).json({ erro: 'Esta proposta não tem modelo 3D: ela precisa vir de uma análise ou de um projeto com a arquitetura (.dwg ou .dxf) enviada.' });
    }
    const { rowCount } = await pool.query('UPDATE propostas SET modelo_3d_cliente = $1 WHERE id = $2', [mostrar, req.params.id]);
    if (!rowCount) return res.status(404).json({ erro: 'Proposta não encontrada.' });
    await registrarAuditoria(pool, { entidade: 'propostas', entidadeId: Number(req.params.id), acao: 'modelo_3d_cliente', detalhes: { mostrar }, usuarioId: req.usuario.id });
    res.json({ modelo_3d_cliente: mostrar });
  } catch (err) { responderErro(res, err, 'mostrar ao cliente'); }
}

module.exports = { situacao, abrir, arquivo, ver, enviarPagina, enviarArquiteturaAnalise, verArquiteturaAnalise, mostrarAoCliente };
