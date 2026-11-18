// GET /projetos/analises/:id/projeto-sugerido/prancha?pavimento=…&formato=dxf|pdf (versão 2.46, 18/11/2026)
// "Gerar a prancha DXF/PDF de cada pavimento com o projeto desenhado." A arquitetura guardada na análise, recortada no
// pavimento, com os componentes e o traçado do projeto (já com as edições do 3D) — skills/_comum/cad/pranchaSugerida.js,
// numa thread à parte. DXF: para o projetista revisar no AutoCAD; PDF: a folha para conferir/entregar.
const path = require('path');
const pool = require('../../config/database');
const { gerarPdfDeHtml } = require('../../services/pdfPuppeteer');
const { executarNoWorker } = require('../../services/executarNoWorker');
const { fonteDoModelo } = require('../../services/modelo3d');
const { contentDisposition } = require('../../utils/nomeArquivoDownload');
const { hojeBrasilia } = require('../../utils/dataHoje');
const { escapeHtml } = require('../../utils/htmlPdf');

const WORKER = path.join(__dirname, '..', '..', 'services', 'pranchaSugerida', 'worker.js');
const br = (v, c = 0) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: c });

async function prancha(req, res) {
  const id = Number(req.params.id);
  const formato = req.query.formato === 'pdf' ? 'pdf' : 'dxf';
  const pavimento = String(req.query.pavimento || '').slice(0, 120);
  const { rows: [an] } = await pool.query('SELECT id, nome_projeto, cliente_nome, dados_extraidos FROM analises_projeto WHERE id = $1', [id]);
  if (!an) return res.status(404).json({ erro: 'Análise não encontrada.' });
  const sug = (Array.isArray(an.dados_extraidos) ? an.dados_extraidos : []).find(e => e?.projeto_sugerido && !e.projeto_sugerido.erro)?.projeto_sugerido;
  if (!sug) return res.status(400).json({ erro: 'Esta análise não tem projeto sugerido pelo sistema (só a análise de elaboração projeta).' });
  let fonte;
  try { fonte = await fonteDoModelo('analise', id); } catch (e) { return res.status(e.status || 500).json({ erro: e.message }); }
  if (!fonte) return res.status(404).json({ erro: 'A arquitetura desta análise não está guardada — analise o DWG/DXF de novo.' });
  const titulo = String(an.nome_projeto || 'Projeto').slice(0, 120);
  const disciplinas = (sug.disciplinas || []).join(', ').toUpperCase();
  let m;
  try {
    m = await executarNoWorker(WORKER, {
      dxf: fonte.dxf, pavimento, dispositivos: fonte.dispositivosReais || [], trechos: fonte.trechos || [],
      notas: (sug.criterios || []).map(String).slice(0, 12),
      carimbo: { disciplina: disciplinas, titulo, cliente: an.cliente_nome || '', obra: titulo, data: hojeBrasilia().split('-').reverse().join('/'), fase: 'EP (projeto sugerido)' },
    }, { tempoLimiteMs: 180 * 1000, memoriaMb: 1536 });
  } catch (e) {
    return res.status(500).json({ erro: e.codigo === 'TEMPO_ESGOTADO' ? 'A prancha demorou demais para ser gerada.' : `Falha ao gerar a prancha: ${e.message}` });
  }
  if (!m.ok) return res.status(400).json({ erro: m.erro });
  const nome = `Projeto sugerido - ${titulo} - ${m.pavimento || 'planta'}`.replace(/[\/:*?"<>|]+/g, '_');
  if (formato === 'dxf') {
    res.set({ 'Content-Type': 'application/dxf', 'Content-Disposition': contentDisposition(`${nome}.dxf`) });
    return res.send(Buffer.from(m.dxf, 'utf8'));
  }
  const linhas = (m.quantitativo || []).map(q => `<tr><td>${escapeHtml(q.legenda)}</td><td style="text-align:right">${br(q.quantidade)}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A3 landscape; margin: 8mm; }
    body { font-family: Arial, sans-serif; color: #222; margin: 0; }
    .folha { display: grid; grid-template-columns: 1fr 88mm; gap: 6mm; height: 270mm; }
    .desenho { border: 0.4mm solid #333; padding: 3mm; overflow: hidden; }
    .lado { border: 0.4mm solid #333; padding: 3mm; font-size: 8.5pt; display: flex; flex-direction: column; gap: 3mm; }
    h1 { font-size: 12pt; margin: 0; } h2 { font-size: 9.5pt; margin: 0 0 1mm; }
    table { width: 100%; border-collapse: collapse; } td { border-bottom: 0.2mm solid #ccc; padding: 0.8mm 0; }
    .nota { font-size: 7.5pt; color: #444; margin: 0 0 0.8mm; } .carimbo { margin-top: auto; border-top: 0.4mm solid #333; padding-top: 2mm; font-size: 8pt; }
  </style></head><body><div class="folha"><div class="desenho">${m.svg}</div><div class="lado">
    <div><h1>${escapeHtml(titulo)}</h1><div>Planta baixa — ${escapeHtml(m.pavimento || 'pavimento')} — projeto sugerido</div><div>${escapeHtml(disciplinas)}</div></div>
    <div><h2>Quantitativo do pavimento</h2><table>${linhas || '<tr><td>Nenhum componente neste pavimento.</td></tr>'}</table></div>
    <div><h2>Notas</h2><p class="nota">1. Projeto SUGERIDO pelo sistema H&amp;M a partir da arquitetura — conferir e completar antes de emitir.</p>${(sug.criterios || []).slice(0, 10).map((c, i) => `<p class="nota">${i + 2}. ${escapeHtml(c)}</p>`).join('')}</div>
    <div class="carimbo"><b>H&amp;M Engenharia</b><br>Cliente: ${escapeHtml(an.cliente_nome || '—')}<br>Data: ${escapeHtml(hojeBrasilia().split('-').reverse().join('/'))} · Fase: EP (projeto sugerido)<br>Desenho: Sistema H&amp;M — revisar antes de emitir</div>
  </div></div></body></html>`;
  const pdf = await gerarPdfDeHtml(html, { landscape: true, format: 'A3', printBackground: true, margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' } });
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': contentDisposition(`${nome}.pdf`) });
  return res.send(pdf);
}

module.exports = { prancha };
