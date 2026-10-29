// Análise de Projeto — pacote de arquivos (2.3, rotas em routes/v2/pacotesProjeto.js):
// receber arquivos soltos, uma pasta ou um ZIP, analisar os escolhidos (a mesma
// análise do envio direto) e o DXF da compatibilização por posição.
const pool = require('../../config/database');
const { contentDisposition } = require('../../utils/nomeArquivoDownload');
const { normalizarDisciplinas } = require('../../utils/disciplinasProjeto');
const Pacotes = require('../../services/pacotesProjeto');
const { nomeUtf8 } = require('./comum');
const { arquivoInvalido, executarAnalise } = require('./analises');

// ── Pacote de arquivos (2.3) — services/pacotesProjeto.js ──────────────────
// POST /projetos/pacotes: arquivos soltos, de uma pasta (o nome vem com a pasta
// relativa) ou ZIP → { token, arquivos com a disciplina sugerida, ignorados }
async function receberPacote(req, res) {
  if (!req.files?.length) return res.status(400).json({ erro: 'Envie os arquivos, a pasta ou o ZIP do projeto (PDF, DWG, DXF ou ZIP).' });
  const recebidos = req.files.map((f) => {
    const caminho = nomeUtf8(f.originalname).replace(/\\/g, '/').replace(/^\/+|(^|\/)\.\.(\/|$)/g, '').slice(-400);
    return { originalname: caminho.split('/').pop(), buffer: f.buffer, path: f.path, caminho: caminho.includes('/') ? caminho : null };
  });
  res.status(201).json(await Pacotes.receberPacote(recebidos, req.usuario));
}

// POST /projetos/pacotes/:token/analisar { arquivos: [{ id, disciplinas, referencia, tipoReferencia }], finalidade, obra_id, nome_projeto }
async function analisarPacote(req, res) {
  const escolhas = Array.isArray(req.body?.arquivos) ? req.body.arquivos : [];
  if (!escolhas.length) return res.status(400).json({ erro: 'Escolha os arquivos do pacote a analisar.' });
  const normalizadas = escolhas.map(e => ({ ...e, referencia: e.referencia === true, disciplinas: e.referencia === true ? [] : normalizarDisciplinas(e.disciplinas) }));
  if (normalizadas.some(e => !e.referencia && !e.disciplinas.length)) {
    return res.status(400).json({ erro: 'Cada arquivo precisa de ao menos uma disciplina, ou ser marcado como referência (arquitetura, estrutura, hidráulica, climatização).' });
  }
  if (!normalizadas.some(e => !e.referencia)) return res.status(400).json({ erro: 'Marque a disciplina de ao menos um arquivo: só arquivos de referência não geram análise.' });
  let arquivos;
  try {
    arquivos = Pacotes.arquivosDoPacote(req.params.token, req.usuario, normalizadas);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ erro: err.message });
    throw err;
  }
  const invalido = arquivoInvalido(arquivos);
  if (invalido) return res.status(400).json({ erro: invalido });
  // nomes repetidos em pastas diferentes do pacote: o nome leva a pasta (a pasta do projeto guarda todos)
  const vistos = new Map();
  for (const a of arquivos) vistos.set(a.nomeArquivo, (vistos.get(a.nomeArquivo) || 0) + 1);
  for (const a of arquivos) if (vistos.get(a.nomeArquivo) > 1 && a.caminho) a.nomeArquivo = a.caminho.replace(/[\\/]+/g, ' - ').replace(/[:*?"<>|]+/g, '_').slice(-180);
  // sem nome de projeto: vale o nome da pasta/ZIP enviado (todos os arquivos vieram dele)
  const corpo = { ...(req.body || {}) };
  const emPasta = arquivos.every(a => String(a.caminho || '').includes('/'));
  const raizes = [...new Set(arquivos.map(a => String(a.caminho || '').split('/')[0]))];
  if (!String(corpo.nome_projeto || '').trim()) {
    let sugerido = null;
    try { sugerido = Pacotes.manifesto(req.params.token, req.usuario).nome_sugerido; } catch { /* sem manifesto: usa a pasta */ }
    if (sugerido) corpo.nome_projeto = String(sugerido).slice(0, 200);
    else if (emPasta && raizes.length === 1) corpo.nome_projeto = raizes[0].replace(/\.zip$/i, '').trim().slice(0, 200);
  }
  const ok = await executarAnalise(req, res, arquivos, corpo);
  if (ok) Pacotes.descartarPacote(req.params.token, req.usuario);
}

// DELETE /projetos/pacotes/:token
async function descartarPacote(req, res) {
  Pacotes.descartarPacote(req.params.token, req.usuario);
  res.status(204).end();
}

// GET /projetos/analises/:id/compatibilizacao-dxf — arquitetura de referência + conflitos marcados
async function compatibilizacaoDxf(req, res) {
  const { rows: [an] } = await pool.query('SELECT id, nome_projeto, cliente_nome, conflitos FROM analises_projeto WHERE id = $1', [req.params.id]);
  if (!an) return res.status(404).json({ erro: 'Análise não encontrada.' });
  const { rows: [arq] } = await pool.query('SELECT conteudo FROM analises_projeto_arquitetura WHERE analise_id = $1', [an.id]);
  if (!arq) return res.status(400).json({ erro: 'Esta análise não tem desenho DWG/DXF de referência: a compatibilização por posição precisa dos DWG/DXF do projeto.' });
  // em thread à parte: ler a arquitetura de referência inteira levava segundos de CPU
  const { dxfCompatibilizacaoNoWorker } = require('../../services/tarefasCad');
  const nomeProj = String(an.nome_projeto || an.cliente_nome || 'Projeto').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80);
  const dxf = await dxfCompatibilizacaoNoWorker({ dxfReferencia: arq.conteudo.toString('utf8'), conflitos: an.conflitos || [], titulo: `COMPATIBILIZAÇÃO — ${nomeProj.toUpperCase()}` });
  const nome = `Compatibilização - ${nomeProj}.dxf`;
  res.set({ 'Content-Type': 'application/dxf', 'Content-Disposition': contentDisposition(nome), 'X-Nome-Arquivo': encodeURIComponent(nome) });
  res.send(Buffer.from(dxf, 'utf8'));
}

module.exports = { receberPacote, analisarPacote, descartarPacote, compatibilizacaoDxf };
