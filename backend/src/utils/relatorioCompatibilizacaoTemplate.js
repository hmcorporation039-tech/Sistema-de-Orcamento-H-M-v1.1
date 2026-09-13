function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function formatarData(v) {
  const d = v ? new Date(v) : new Date();
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatarMoedaLocal(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Monta as linhas de uma tabela agrupando por subgrupo (na ordem em que os
// itens aparecem, sem reordenar) — mesmo padrão usado no PDF comercial de
// proposta: um cabeçalho de sub-bloco toda vez que o subgrupo muda.
function linhasAgrupadasPorSubgrupo(itens, colunas, gerarLinhaTr) {
  let ultimo = null;
  return itens.map(it => {
    const sg = (it.subgrupo || '').trim() || null;
    let cabecalho = '';
    if (sg !== ultimo) {
      if (sg) cabecalho = `<tr class="subgrupo"><td colspan="${colunas}">${escapeHtml(sg)}</td></tr>`;
      ultimo = sg;
    }
    return cabecalho + gerarLinhaTr(it);
  }).join('');
}

// Relatório de compatibilização de projeto — documento interno, separado do
// PDF comercial de orçamento. Consolida o que foi extraído automaticamente
// dos arquivos do projeto (ambientes, câmeras, cabos) e a lista de serviços
// revisada pelo usuário (com o que já está pronto e não entra na mão de obra).
function gerarHtmlRelatorioCompatibilizacao(analise) {
  const {
    cliente, disciplinas = [], arquivosAnalisados = [], ambientes = [], cameras = { total: 0, detalhePorArquivo: [] },
    pontosRedeAntena = { rede: { total: 0 }, antena: { total: 0 } },
    tabelaCabos = [], achados = [], servicos = [], materiais = [],
  } = analise;

  const linhasAmbientes = ambientes.map(a => `
    <tr>
      <td>${escapeHtml(a.nome)}</td>
      <td class="num">${a.area_m2 != null ? a.area_m2.toLocaleString('pt-BR') + ' m²' : '—'}</td>
    </tr>
  `).join('');

  const linhasCameras = (cameras.detalhePorArquivo || []).map(c => `
    <tr>
      <td>${escapeHtml(c.arquivo)}</td>
      <td class="num">${c.ocorrencias}</td>
      <td class="num">${c.total}</td>
      <td>${c.repetidas.length ? c.repetidas.map(n => 'CAM' + n).join(', ') : '—'}</td>
      <td>${c.faltando.length ? c.faltando.map(n => 'CAM' + n).join(', ') : '—'}</td>
    </tr>
  `).join('');

  const linhasCabos = tabelaCabos.map(c => `
    <tr><td class="num">${escapeHtml(c.sigla)}</td><td>${escapeHtml(c.descricao)}</td></tr>
  `).join('');

  const linhasAchados = achados.map(a => `
    <tr><td>${escapeHtml(a.tema)}</td><td>${escapeHtml(a.observacao)}</td></tr>
  `).join('');

  const linhasServicos = linhasAgrupadasPorSubgrupo(servicos, 5, s => `
    <tr class="${s.pronto ? 'pronto' : ''}">
      <td>${escapeHtml(s.descricao)}</td>
      <td class="num">${s.quantidade ?? '—'}</td>
      <td>${escapeHtml(s.unidade || '')}</td>
      <td>${s.pronto ? 'Já pronto (não orçado)' : 'A executar'}</td>
      <td class="obs">${escapeHtml(s.observacao || '')}</td>
    </tr>
  `);

  const linhasMateriais = linhasAgrupadasPorSubgrupo(materiais, 5, m => `
    <tr class="${m.pronto ? 'pronto' : ''}">
      <td>${escapeHtml(m.descricao)}${m.referencia_fabricante ? `<div class="obs">Ref.: ${escapeHtml(m.referencia_fabricante)}</div>` : ''}</td>
      <td class="num">${m.quantidade ?? '—'}</td>
      <td>${escapeHtml(m.unidade || '')}</td>
      <td class="num">${m.preco_catalogo != null ? formatarMoedaLocal(m.preco_catalogo) + (m.confianca_catalogo != null ? ` (${m.confianca_catalogo}% match)` : '') : '—'}</td>
      <td>${m.pronto ? 'Já disponível (não orçado)' : 'A fornecer'}</td>
    </tr>
  `);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 11px; }
  h1 { font-size: 18px; color: #1a1a1a; margin-bottom: 2px; }
  .subtitulo { font-size: 11px; color: #888; margin-bottom: 16px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .5px; color: #c9a227;
       border-bottom: 2px solid #c9a227; padding-bottom: 4px; margin: 20px 0 8px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 14px; }
  .info-item .label { font-size: 8px; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 1px; }
  .info-item .valor { font-size: 10.5px; color: #1a1a1a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  th { background: #1a1a1a; color: #c9a227; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; padding: 6px 8px; text-align: left; }
  th.num, td.num { text-align: right; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e5e5; font-size: 10px; vertical-align: top; }
  td.obs { color: #666; font-size: 9px; }
  tr.subgrupo td { background: #f2f2f2; font-weight: 700; color: #333; padding: 5px 8px; }
  tr.pronto td { color: #999; background: #f7f7f7; }
  tr.pronto td:nth-child(4) { color: #3a8a4a; font-weight: 700; }
  .vazio { padding: 10px 8px; color: #999; font-size: 10px; font-style: italic; }
  .aviso { background: #fff8e6; border: 1px solid #e8d29a; border-radius: 6px; padding: 10px 12px; font-size: 10px; color: #7a5c00; margin-bottom: 14px; }
</style>
</head>
<body>
  <h1>Relatório de Compatibilização de Projeto</h1>
  <div class="subtitulo">Documento interno — não substitui o orçamento comercial enviado ao cliente</div>

  <div class="info-grid">
    <div class="info-item">
      <div class="label">Cliente</div>
      <div class="valor">${escapeHtml(cliente || '—')}</div>
    </div>
    <div class="info-item">
      <div class="label">Data do relatório</div>
      <div class="valor">${formatarData()}</div>
    </div>
    ${disciplinas.includes('rede') ? `
    <div class="info-item">
      <div class="label">Pontos de rede</div>
      <div class="valor">${pontosRedeAntena.rede?.total ?? 0}</div>
    </div>` : ''}
    ${disciplinas.includes('antena') ? `
    <div class="info-item">
      <div class="label">Pontos de TV/antena</div>
      <div class="valor">${pontosRedeAntena.antena?.total ?? 0}</div>
    </div>` : ''}
    <div class="info-item" style="grid-column: 1 / -1;">
      <div class="label">Arquivos analisados</div>
      <div class="valor">${arquivosAnalisados.map(escapeHtml).join(' · ') || '—'}</div>
    </div>
  </div>

  <div class="aviso">
    Este relatório reúne dados extraídos automaticamente dos arquivos do projeto (texto do PDF) e a
    revisão de serviços/materiais feita antes de gerar este documento. Confira sempre os itens marcados
    na seção de Compatibilização antes de fechar o orçamento.
  </div>

  <h2>Pontos por Ambiente (${ambientes.length})</h2>
  ${ambientes.length > 0 ? `
  <table>
    <thead><tr><th>Ambiente</th><th class="num">Área</th></tr></thead>
    <tbody>${linhasAmbientes}</tbody>
  </table>` : `<div class="vazio">Nenhum ambiente identificado.</div>`}

  ${disciplinas.includes('cftv') ? `
  <h2>CFTV — Câmeras (total: ${cameras.total || 0})</h2>
  ${(cameras.detalhePorArquivo || []).length > 0 ? `
  <table>
    <thead><tr><th>Arquivo</th><th class="num">Ocorrências</th><th class="num">Códigos únicos</th><th>Repetidos</th><th>Faltando na sequência</th></tr></thead>
    <tbody>${linhasCameras}</tbody>
  </table>` : `<div class="vazio">Nenhuma câmera identificada nos arquivos.</div>`}` : ''}

  <h2>Tabela de Cabos (legenda do projeto)</h2>
  ${tabelaCabos.length > 0 ? `
  <table>
    <thead><tr><th class="num">Sigla</th><th>Descrição</th></tr></thead>
    <tbody>${linhasCabos}</tbody>
  </table>` : `<div class="vazio">Nenhuma legenda de cabos identificada.</div>`}

  <h2>Compatibilização — Pendências e Observações (${achados.length})</h2>
  ${achados.length > 0 ? `
  <table>
    <thead><tr><th style="width:180px">Tema</th><th>Observação</th></tr></thead>
    <tbody>${linhasAchados}</tbody>
  </table>` : `<div class="vazio">Nenhuma pendência identificada automaticamente.</div>`}

  <h2>Serviços (Mão de Obra)</h2>
  ${servicos.length > 0 ? `
  <table>
    <thead><tr><th>Descrição</th><th class="num">Qtd.</th><th>Un.</th><th>Status</th><th>Observação</th></tr></thead>
    <tbody>${linhasServicos}</tbody>
  </table>` : `<div class="vazio">Nenhum serviço lançado.</div>`}

  <h2>Materiais / Equipamentos</h2>
  ${materiais.length > 0 ? `
  <table>
    <thead><tr><th>Descrição</th><th class="num">Qtd.</th><th>Un.</th><th class="num">Preço catálogo</th><th>Status</th></tr></thead>
    <tbody>${linhasMateriais}</tbody>
  </table>` : `<div class="vazio">Nenhum material lançado.</div>`}
</body>
</html>
  `;
}

module.exports = { gerarHtmlRelatorioCompatibilizacao };
