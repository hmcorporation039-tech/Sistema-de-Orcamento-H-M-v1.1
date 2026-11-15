// Modelo 3D ilustrativo (versão 2.3) — ver services/modelo3d.
// Rotas em routes/v2/modelo3d.js.
const path = require('path');
const pool = require('../config/database');
const M = require('../services/modelo3d');
const { lerArquiteturaNoWorker, mensagemDaLeitura, resumoDaArquitetura, dxfParaGuardar, dxfConvertido, faltouEscala } = require('../services/tarefasCad');
const { contentDisposition } = require('../utils/nomeArquivoDownload');
const { registrarAuditoria } = require('../services/auditoria');
const P = require('../services/pastasSistema');
const { pastaDoLaudo, pastaDoProjeto, seguro } = require('../services/pastasRegistros');
const { enviarComprimido } = require('../utils/respostaComprimida');
const { registrarErroInesperado } = require('../middleware/erros');

const ORIGENS = new Set(['laudo', 'analise', 'proposta']);
const TABELA_ORIGEM = { laudo: 'laudos_projetos', analise: 'analises_projeto', proposta: 'propostas' };

function lerOrigem(req, res) {
  const { origem } = req.params;
  if (!ORIGENS.has(origem)) { res.status(400).json({ erro: 'Origem do modelo 3D inválida.' }); return null; }
  return { origem, id: Number(req.params.id) };
}

// Cópia "Modelo 3D - <nome>.html" na pasta do projeto/análise (como a planta DXF).
// Devolve a pasta onde gravou, ou null (sem registro ou falha na pasta — já registrada no log).
async function gravarNaPasta(m) {
  const { origemTipo, origemId } = m.fonte;
  return seguro(`modelo 3D ${origemTipo} ${origemId}`, async () => {
    const tabela = origemTipo === 'laudo' ? 'laudos_projetos' : 'analises_projeto';
    const { rows: [row] } = await pool.query(`SELECT * FROM ${tabela} WHERE id = $1`, [origemId]);
    if (!row) return null;
    const pasta = origemTipo === 'laudo' ? await pastaDoLaudo(row) : await pastaDoProjeto(row);
    await P.gravarArquivo(pasta, M.nomeArquivo(m.fonte), Buffer.from(m.html, 'utf8'));
    return pasta;
  });
}

// Ao abrir/gerar de novo, a cópia da pasta acompanha o 3D — menos na análise que já foi SALVA para o cliente
// (2.43): lá a cópia é a versão aprovada, e só o "Aprovar e salvar para o cliente" a troca.
async function copiarParaPasta(o, m) {
  if (o.origem === 'proposta') return;
  if (o.origem === 'analise' && await M.salvoParaCliente(o.id)) return;
  await gravarNaPasta(m);
}

const resumoPublico = (m) => ({ numeros: m.numeros, avisos: m.avisos, gerado_em: m.gerado_em, arquivo: m.nome_arquivo });

// GET /modelo-3d/:origem/:id — tem arquitetura? (não gera)
async function situacao(req, res) {
  const o = lerOrigem(req, res);
  if (!o) return;
  res.json(await M.situacao(o.origem, o.id));
}

// POST /modelo-3d/:origem/:id/abrir — gera (ou pega do cache) e devolve um link
// curto para abrir numa aba nova
async function abrir(req, res) {
  const o = lerOrigem(req, res);
  if (!o) return;
  const m = await M.obterModelo(o.origem, o.id);
  if (!m) return res.status(400).json({ erro: 'Envie primeiro a arquitetura (.dwg, .dxf ou PDF) para gerar o modelo 3D.' });
  await copiarParaPasta(o, m);
  // embutido (2.30): o 3D dentro da tela da análise, com o modo de edição de componentes
  const embutido = req.body?.embutido === true && o.origem === 'analise';
  res.json({ url: `/api/modelo-3d/ver/${M.criarLink(o.origem, o.id, { embutido })}`, ...resumoPublico(m) });
}

// POST /modelo-3d/:origem/:id/gerar-de-novo — apaga o 3D guardado e gera outra vez
// (dono do registro ou administrador); devolve o mesmo que /abrir
async function gerarDeNovo(req, res) {
  const o = lerOrigem(req, res);
  if (!o) return;
  const m = await M.refazerModelo(o.origem, o.id);
  if (!m) return res.status(400).json({ erro: 'Envie primeiro a arquitetura (.dwg, .dxf ou PDF) para gerar o modelo 3D.' });
  await registrarAuditoria(pool, { entidade: TABELA_ORIGEM[o.origem], entidadeId: o.id, acao: 'modelo_3d_gerar_de_novo', usuarioId: req.usuario.id });
  await copiarParaPasta(o, m);
  res.json({ url: `/api/modelo-3d/ver/${M.criarLink(o.origem, o.id)}`, ...resumoPublico(m) });
}

// POST /modelo-3d/analise/:id/salvar-cliente (dono da análise ou administrador) — o "Aprovar e salvar para o
// cliente" do editor 3D (2.43): gera o 3D com as edições de agora, grava "Modelo 3D - <nome>.html" na pasta do
// cliente e guarda quem salvou e quando. Devolve o link para abrir, o nome do arquivo (para baixar) e as propostas
// feitas desta análise, com o "mostrar ao cliente" de cada uma — a tela liga ali mesmo, sem ir ao cartão de baixo.
async function salvarParaCliente(req, res) {
  const id = Number(req.params.id);
  const m = await M.obterModelo('analise', id);
  if (!m) return res.status(400).json({ erro: 'Envie primeiro a arquitetura (.dwg, .dxf ou PDF) para gerar o modelo 3D.' });
  const pasta = await gravarNaPasta(m);
  const nome = M.nomeArquivo(m.fonte);
  const ed = m.fonte.edicoes || { inseridos: 0, retirados: 0 };
  const { rows: [s] } = await pool.query(
    `INSERT INTO analises_modelo_3d_cliente (analise_id, chave, nome_arquivo, inseridos, retirados, usuario_id, salvo_em)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())
     ON CONFLICT (analise_id) DO UPDATE SET chave = EXCLUDED.chave, nome_arquivo = EXCLUDED.nome_arquivo, inseridos = EXCLUDED.inseridos,
       retirados = EXCLUDED.retirados, usuario_id = EXCLUDED.usuario_id, salvo_em = NOW()
     RETURNING salvo_em`,
    [id, m.chave, nome, ed.inseridos, ed.retirados, req.usuario.id]);
  await registrarAuditoria(pool, { entidade: 'analises_projeto', entidadeId: id, acao: 'modelo_3d_salvo_cliente', detalhes: { arquivo: nome, ...ed }, usuarioId: req.usuario.id });
  const propostas = await M.propostasDaAnalise(id);
  res.json({
    nome_arquivo: nome, na_pasta: !!pasta, salvo_em: s.salvo_em, por: req.usuario.nome || null, ...ed,
    url: `/api/modelo-3d/ver/${M.criarLink('analise', id)}`, propostas, ...resumoPublico(m),
  });
}

// GET /modelo-3d/:origem/:id/arquivo — o HTML para baixar (abre sem internet)
async function arquivo(req, res) {
  const o = lerOrigem(req, res);
  if (!o) return;
  const m = await M.obterModelo(o.origem, o.id);
  if (!m) return res.status(400).json({ erro: 'Envie primeiro a arquitetura (.dwg, .dxf ou PDF) para gerar o modelo 3D.' });
  const nome = M.nomeArquivo(m.fonte);
  res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': contentDisposition(nome), 'X-Nome-Arquivo': encodeURIComponent(nome) });
  enviarComprimido(req, res, m.html);
}

// Página do 3D com a política própria (script embutido em sandbox), comprimida (~1 MB → ~1/4)
function enviarPagina(req, res, html, { embutido = false } = {}) {
  res.set({
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': embutido ? M.CSP_MODELO_3D_EMBUTIDO : M.CSP_MODELO_3D,
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  enviarComprimido(req, res, html);
}

// GET /modelo-3d/ver/:token — sem login: o token curto (2 h) é a autorização
async function ver(req, res) {
  const l = M.lerLink(req.params.token);
  if (!l) return res.status(404).type('text/plain; charset=utf-8').send('Link do modelo 3D expirado. Abra de novo pelo sistema.');
  try {
    const m = await M.obterModelo(l.origemTipo, l.origemId);
    if (!m) return res.status(404).type('text/plain; charset=utf-8').send('Este registro não tem mais arquitetura para o modelo 3D.');
    enviarPagina(req, res, m.html, { embutido: !!l.embutido });
  } catch (err) {
    // inesperado (sem status): log + resumo diário de erros, como o tratador central; o token do link
    // não vai para o resumo (errosSistema.normalizarRota)
    if (!err.status) registrarErroInesperado(req, err);
    else console.error('Erro ao servir o modelo 3D:', err.message);
    res.status(err.status && err.status < 500 ? err.status : 500).type('text/plain; charset=utf-8').send(err.status ? err.message : 'Erro ao gerar o modelo 3D.');
  }
}

// POST /projetos/analises/:id/arquitetura — DWG/DXF/PDF da arquitetura na análise
// (PDF: campos opcionais `escala` — 50 para 1:50 — e `pagina`)
async function enviarArquiteturaAnalise(req, res) {
  const arq = req.file;
  if (!arq) return res.status(400).json({ erro: 'Envie o arquivo da arquitetura (.dwg, .dxf ou .pdf).' });
  const { rows: [analise] } = await pool.query('SELECT * FROM analises_projeto WHERE id = $1', [req.params.id]);
  if (!analise) return res.status(404).json({ erro: 'Análise não encontrada.' });
  // conversão (DWG/PDF) e leitura numa thread à parte (services/tarefasCad): na
  // thread principal, um desenho grande travava o sistema para todos
  let lida;
  try { lida = await lerArquiteturaNoWorker(arq.buffer, arq.originalname, req.body); } catch (e) { return res.status(400).json({ erro: mensagemDaLeitura(e), faltaEscala: faltouEscala(e) }); }
  // mesmo formato de laudos_projetos_arquitetura: o projeto criado da análise copia esta linha
  const resumo = resumoDaArquitetura(lida);
  await pool.query(
    `INSERT INTO analises_projeto_arquitetura (analise_id, nome_arquivo, conteudo, resumo, usuario_id) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (analise_id) DO UPDATE SET nome_arquivo = EXCLUDED.nome_arquivo, conteudo = EXCLUDED.conteudo, resumo = EXCLUDED.resumo, usuario_id = EXCLUDED.usuario_id, criado_em = NOW()`,
    [analise.id, String(arq.originalname).slice(0, 200), dxfParaGuardar(lida, arq.buffer), resumo, req.usuario.id]);
  await registrarAuditoria(pool, { entidade: 'analises_projeto', entidadeId: analise.id, acao: 'arquitetura_3d', detalhes: { arquivo: arq.originalname }, usuarioId: req.usuario.id });
  await seguro(`arquitetura análise ${analise.id}`, async () => {
    const pasta = path.join(await pastaDoProjeto(analise), 'Arquitetura');
    await P.gravarArquivo(pasta, arq.originalname, arq.buffer);
    const conv = dxfConvertido(lida, arq.originalname);
    if (conv) await P.gravarArquivo(pasta, conv.nome, conv.conteudo);
  });
  res.status(201).json({ nome_arquivo: arq.originalname, ...resumo, ambientes: resumo.ambientes.length });
}

// GET /projetos/analises/:id/arquitetura
async function verArquiteturaAnalise(req, res) {
  const { rows: [a] } = await pool.query('SELECT nome_arquivo, resumo, criado_em FROM analises_projeto_arquitetura WHERE analise_id = $1', [req.params.id]);
  res.json(a || null);
}

// PATCH /propostas/:id/modelo-3d-cliente { mostrar } — o cliente vê o 3D no
// link de aprovação e a imagem no PDF
async function mostrarAoCliente(req, res) {
  const mostrar = req.body?.mostrar === true;
  if (mostrar) {
    const s = await M.situacao('proposta', Number(req.params.id));
    if (!s.disponivel) return res.status(400).json({ erro: 'Esta proposta não tem modelo 3D: ela precisa vir de uma análise ou de um projeto com a arquitetura (.dwg, .dxf ou PDF) enviada.' });
  }
  const { rowCount } = await pool.query('UPDATE propostas SET modelo_3d_cliente = $1 WHERE id = $2', [mostrar, req.params.id]);
  if (!rowCount) return res.status(404).json({ erro: 'Proposta não encontrada.' });
  await registrarAuditoria(pool, { entidade: 'propostas', entidadeId: Number(req.params.id), acao: 'modelo_3d_cliente', detalhes: { mostrar }, usuarioId: req.usuario.id });
  res.json({ modelo_3d_cliente: mostrar });
}

module.exports = { situacao, abrir, gerarDeNovo, salvarParaCliente, arquivo, ver, enviarPagina, enviarArquiteturaAnalise, verArquiteturaAnalise, mostrarAoCliente };
