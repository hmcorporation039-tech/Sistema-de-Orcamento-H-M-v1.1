const { EMPRESA, cabecalhoDataUri, gerarFooterTemplate } = require('./pdfTemplate');

function formatarMoeda(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(v) {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function gerarHtmlRelatorio({ dataInicio, dataFim, status, busca, propostas, totais }) {
  const linhas = propostas.map(p => `
    <tr>
      <td>${escapeHtml(p.numero)}</td>
      <td>${formatarData(p.data)}</td>
      <td>${escapeHtml(p.cliente_nome)}</td>
      <td>${escapeHtml(p.local_obra) || '—'}</td>
      <td><span class="status status-${escapeHtml(p.status)}">${escapeHtml(p.status)}</span></td>
      <td class="num total">${formatarMoeda(p.total)}</td>
    </tr>
  `).join('');

  const filtros = [
    `Período: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`,
    status ? `Status: ${escapeHtml(status)}` : null,
    busca ? `Busca: "${escapeHtml(busca)}"` : null,
  ].filter(Boolean).join(' · ');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 11px; }
  .banner { width: 100%; display: block; margin-bottom: 12px; }
  .titulo { font-family: 'Playfair Display', Georgia, serif; font-size: 18px; color: #1a1a1a; margin-bottom: 4px; }
  .filtros { font-size: 10px; color: #888; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #1a1a1a; color: #c9a227; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; padding: 7px 8px; text-align: left; }
  th.num, td.num { text-align: right; }
  td { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; font-size: 10px; }
  td.total { font-weight: 700; }
  .status { padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 700; }
  .status-Ativa { background: #c9a22733; color: #a5821c; }
  .status-Aprovada { background: #3fb95f33; color: #2c8a44; }
  .status-Recusada { background: #b0404033; color: #8a3030; }
  .status-Cancelada { background: #66666633; color: #555; }
  .resumo { display: flex; justify-content: flex-end; margin-bottom: 10px; }
  .resumo table { width: 300px; margin-bottom: 0; }
  .resumo td { border: none; padding: 3px 8px; font-size: 10.5px; }
  .resumo tr.final td { border-top: 2px solid #c9a227; padding-top: 6px; font-size: 14px; font-weight: 700; color: #c9a227; }
</style>
</head>
<body>
  ${cabecalhoDataUri ? `<img src="${cabecalhoDataUri}" class="banner" alt="H&amp;M Engenharia e Tecnologia LTDA" />` : ''}

  <div class="titulo">Relatório de Propostas</div>
  <div class="filtros">${filtros}</div>

  <table>
    <thead>
      <tr>
        <th>Número</th>
        <th>Data</th>
        <th>Cliente</th>
        <th>Local da obra</th>
        <th>Status</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${linhas || '<tr><td colspan="6" style="text-align:center;color:#888;padding:20px;">Nenhuma proposta encontrada no período.</td></tr>'}
    </tbody>
  </table>

  <div class="resumo">
    <table>
      <tr><td>Propostas no período</td><td class="num">${totais.propostas}</td></tr>
      <tr><td>Valor aprovado</td><td class="num">${formatarMoeda(totais.valorAprovado)}</td></tr>
      <tr class="final"><td>Valor total</td><td class="num">${formatarMoeda(totais.valorTotal)}</td></tr>
    </table>
  </div>
</body>
</html>
  `;
}

module.exports = { gerarHtmlRelatorio, gerarFooterTemplateRelatorio: gerarFooterTemplate, EMPRESA };
