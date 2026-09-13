const { nomeDaDisciplina } = require('./disciplinasProjeto');

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

// Resumo do orçamento (Bloco 1 = mão de obra, Bloco 2 = materiais/equipamentos,
// Total geral) — mesmo formato da aba "Orçamento Geral" da planilha de
// referência da empresa. Sempre recalculado a partir dos itens atuais (nunca
// guardado pronto) — mesma regra de "nunca confiar em total já pronto" usada
// no resto do sistema (ver calculoProposta.js). Itens "já pronto" não entram
// (não fazem parte do escopo orçado).
function calcularResumo(servicos, materiais) {
  const blocoMaoDeObra = servicos.filter(s => !s.pronto)
    .reduce((soma, s) => soma + (Number(s.quantidade) || 0) * (Number(s.valor_unitario) || 0), 0);
  const blocoMateriais = materiais.filter(m => !m.pronto)
    .reduce((soma, m) => soma + (Number(m.quantidade) || 0) * (Number(m.preco_catalogo) || 0), 0);
  return {
    blocoMaoDeObra,
    blocoMateriais,
    total: blocoMaoDeObra + blocoMateriais,
  };
}

// Relatório de compatibilização de projeto — documento interno, separado do
// PDF comercial de orçamento. Consolida o que foi extraído automaticamente
// dos arquivos do projeto (pontos por ambiente, câmeras, cabos) e a lista de
// serviços revisada pelo usuário (com o que já está pronto e não entra na
// mão de obra).
function gerarHtmlRelatorioCompatibilizacao(analise) {
  const {
    cliente, disciplinas = [], arquivosAnalisados = [], pontosPorAmbiente = [],
    cameras = { total: 0, detalhePorArquivo: [] },
    pontosRedeAntena = { rede: { total: 0 }, antena: { total: 0 } },
    tabelaCabos = [], achados = [], servicos = [], materiais = [],
  } = analise;

  const resumo = calcularResumo(servicos, materiais);

  // Pontos por ambiente: distribuição APROXIMADA (ver utils/pontosPorAmbiente.js)
  // — colunas variam conforme a disciplina selecionada, igual ao resto do
  // relatório, e só entram ambientes com pelo menos 1 ponto.
  const colunasPontos = [
    disciplinas.includes('rede') && { chave: 'rede', titulo: 'Rede' },
    disciplinas.includes('antena') && { chave: 'antena', titulo: 'TV/Antena' },
    disciplinas.includes('cftv') && { chave: 'cftv', titulo: 'Câmeras' },
  ].filter(Boolean);

  const linhasPontosPorAmbiente = pontosPorAmbiente.map(a => `
    <tr>
      <td>${escapeHtml(a.ambiente)}</td>
      ${colunasPontos.map(c => `<td class="num">${a[c.chave]}</td>`).join('')}
      <td class="num"><b>${a.total}</b></td>
    </tr>
  `).join('');

  // Tabela de detalhe por arquivo, usada igualmente para os três tipos de
  // ponto codificado (câmera CAMx, rede Rx, antena/TV Ax) — antes só câmeras
  // tinham essa tabela; rede e antena ficavam só com um número total, sem
  // dizer quais códigos foram encontrados nem em qual arquivo. O prefixo vem
  // por parâmetro (não de dentro do dado salvo) porque análises salvas antes
  // desta correção não tinham esse campo — ler `d.prefixo` delas imprimiria
  // "undefinedN" nos códigos.
  function linhasDetalhePorArquivo(detalhe, prefixo) {
    return (detalhe || []).map(d => `
      <tr>
        <td>${escapeHtml(d.arquivo)}</td>
        <td class="num">${d.ocorrencias}</td>
        <td class="num">${d.total}</td>
        <td class="obs">${d.unicas.map(n => prefixo + n).join(', ')}</td>
        <td>${d.repetidas.length ? d.repetidas.map(n => prefixo + n).join(', ') : '—'}</td>
        <td>${d.faltando.length ? d.faltando.map(n => prefixo + n).join(', ') : '—'}</td>
      </tr>
    `).join('');
  }

  // Uma seção completa de tipo de ponto (título, legenda explicando o código
  // e o que cada coluna quer dizer, e a tabela por arquivo ou o aviso de que
  // nada foi encontrado).
  function secaoTipoDePonto(titulo, prefixo, exemplo, detalhe) {
    return `
    <h2>${escapeHtml(titulo)} — código ${escapeHtml(prefixo)}nº (ex.: ${escapeHtml(prefixo + exemplo)})</h2>
    ${(detalhe || []).length > 0 ? `
    <p class="legenda">
      Cada ponto deste tipo aparece na planta com um código individual (${escapeHtml(prefixo)}1, ${escapeHtml(prefixo)}2...).
      <b>Ocorrências</b> = quantas vezes o código aparece no texto do PDF; <b>pontos únicos</b> = quantidade real de
      pontos físicos distintos — é esse o número usado no orçamento. <b>Repetidos</b> e <b>faltando na numeração</b>
      ajudam a conferir a planta antes de fechar.
    </p>
    <table>
      <thead><tr><th>Arquivo</th><th class="num">Ocorrências</th><th class="num">Pontos únicos</th><th>Códigos encontrados</th><th>Repetidos</th><th>Faltando na numeração</th></tr></thead>
      <tbody>${linhasDetalhePorArquivo(detalhe, prefixo)}</tbody>
    </table>` : `<div class="vazio">Nenhum código ${escapeHtml(prefixo)}nº identificado nos arquivos analisados.</div>`}`;
  }

  const linhasCabos = tabelaCabos.map(c => `
    <tr><td class="num">${escapeHtml(c.sigla)}</td><td>${escapeHtml(c.descricao)}</td></tr>
  `).join('');

  const linhasAchados = achados.map(a => `
    <tr><td>${escapeHtml(a.tema)}</td><td>${escapeHtml(a.observacao)}</td></tr>
  `).join('');

  const linhasServicos = linhasAgrupadasPorSubgrupo(servicos, 6, s => `
    <tr class="${s.pronto ? 'pronto' : ''}">
      <td>${escapeHtml(s.descricao)}</td>
      <td class="num">${escapeHtml(s.quantidade ?? '—')}</td>
      <td>${escapeHtml(s.unidade || '')}</td>
      <td class="num">${s.valor_unitario ? formatarMoedaLocal(s.valor_unitario) : '—'}</td>
      <td class="num">${s.valor_unitario ? formatarMoedaLocal((Number(s.quantidade) || 0) * (Number(s.valor_unitario) || 0)) : '—'}</td>
      <td>${s.pronto ? 'Já pronto (não orçado)' : 'A executar'}</td>
    </tr>
  `);

  const linhasMateriais = linhasAgrupadasPorSubgrupo(materiais, 6, m => `
    <tr class="${m.pronto ? 'pronto' : ''}">
      <td>${escapeHtml(m.descricao)}${m.referencia_fabricante ? `<div class="obs">Ref.: ${escapeHtml(m.referencia_fabricante)}</div>` : ''}</td>
      <td class="num">${escapeHtml(m.quantidade ?? '—')}</td>
      <td>${escapeHtml(m.unidade || '')}</td>
      <td class="num">${m.preco_catalogo != null ? formatarMoedaLocal(m.preco_catalogo) + (m.confianca_catalogo != null ? ` (${escapeHtml(m.confianca_catalogo)}% match)` : '') : '—'}</td>
      <td class="num">${m.preco_catalogo != null ? formatarMoedaLocal((Number(m.quantidade) || 0) * Number(m.preco_catalogo)) : '—'}</td>
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
  tr.pronto td:nth-child(6) { color: #3a8a4a; font-weight: 700; }
  .vazio { padding: 10px 8px; color: #999; font-size: 10px; font-style: italic; }
  .aviso { background: #fff8e6; border: 1px solid #e8d29a; border-radius: 6px; padding: 10px 12px; font-size: 10px; color: #7a5c00; margin-bottom: 14px; }
  .legenda { font-size: 9.5px; color: #666; margin-bottom: 8px; line-height: 1.5; }
  .resumo-blocos { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 18px; }
  .resumo-bloco { border: 1px solid #e5e5e5; border-radius: 6px; padding: 10px 12px; }
  .resumo-bloco .rotulo { font-size: 8px; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 3px; }
  .resumo-bloco .valor { font-size: 15px; font-weight: 700; color: #1a1a1a; }
  .resumo-bloco.total { background: #1a1a1a; }
  .resumo-bloco.total .rotulo { color: #c9a227; }
  .resumo-bloco.total .valor { color: #fff; }
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
    ${disciplinas.includes('cftv') ? `
    <div class="info-item">
      <div class="label">Câmeras (código CAMnº)</div>
      <div class="valor">${escapeHtml(cameras.total ?? 0)}</div>
    </div>` : ''}
    ${disciplinas.includes('rede') ? `
    <div class="info-item">
      <div class="label">Pontos de rede (código Rnº)</div>
      <div class="valor">${escapeHtml(pontosRedeAntena.rede?.total ?? 0)}</div>
    </div>` : ''}
    ${disciplinas.includes('antena') ? `
    <div class="info-item">
      <div class="label">Pontos de TV/antena (código Anº)</div>
      <div class="valor">${escapeHtml(pontosRedeAntena.antena?.total ?? 0)}</div>
    </div>` : ''}
    <div class="info-item" style="grid-column: 1 / -1;">
      <div class="label">Arquivos analisados</div>
      <div class="valor">${arquivosAnalisados.map(a =>
        `${escapeHtml(a.arquivo)} (${(a.disciplinas || []).map(nomeDaDisciplina).join(', ')})`
      ).join(' · ') || '—'}</div>
    </div>
  </div>

  <div class="aviso">
    Este relatório reúne dados extraídos automaticamente dos arquivos do projeto (texto do PDF) e a
    revisão de serviços/materiais feita antes de gerar este documento. Confira sempre os itens marcados
    na seção de Compatibilização antes de fechar o orçamento.
  </div>

  <h2>Resumo do Orçamento</h2>
  <div class="resumo-blocos">
    <div class="resumo-bloco">
      <div class="rotulo">Bloco 1 — Mão de obra</div>
      <div class="valor">${formatarMoedaLocal(resumo.blocoMaoDeObra)}</div>
    </div>
    <div class="resumo-bloco">
      <div class="rotulo">Bloco 2 — Materiais e equipamentos</div>
      <div class="valor">${formatarMoedaLocal(resumo.blocoMateriais)}</div>
    </div>
    <div class="resumo-bloco total">
      <div class="rotulo">Total geral</div>
      <div class="valor">${formatarMoedaLocal(resumo.total)}</div>
    </div>
  </div>
  <p class="legenda" style="margin-top:-12px;">
    Soma dos itens de "Serviços" e "Materiais/Equipamentos" abaixo (exceto os marcados "já pronto"). Itens sem
    valor unitário preenchido, ou sem correspondência no catálogo, entram como R$ 0,00 neste resumo — preencha
    ou confirme antes de considerar o total fechado.
  </p>

  ${(disciplinas.includes('cftv') || disciplinas.includes('rede') || disciplinas.includes('antena')) ? `
  <h2>Pontos Identificados no Projeto</h2>
  ${disciplinas.includes('cftv') ? secaoTipoDePonto('Câmeras', 'CAM', '1', cameras.detalhePorArquivo) : ''}
  ${disciplinas.includes('rede') ? secaoTipoDePonto('Pontos de rede', 'R', '1', pontosRedeAntena.rede?.detalhePorArquivo) : ''}
  ${disciplinas.includes('antena') ? secaoTipoDePonto('Pontos de TV/antena', 'A', '1', pontosRedeAntena.antena?.detalhePorArquivo) : ''}

  <h2 style="margin-top:26px;">Pontos por Ambiente</h2>
  <p class="legenda">
    Distribuição <b>aproximada</b> — calculada pela posição de cada código no desenho, sem noção de parede ou
    fronteira entre salas. Confira sempre contra a planta antes de usar. Só aparecem ambientes com pelo menos
    1 ponto identificado.
  </p>
  ${pontosPorAmbiente.length > 0 ? `
  <table>
    <thead><tr><th>Ambiente</th>${colunasPontos.map(c => `<th class="num">${escapeHtml(c.titulo)}</th>`).join('')}<th class="num">Total</th></tr></thead>
    <tbody>${linhasPontosPorAmbiente}</tbody>
  </table>` : `<div class="vazio">Não foi possível estimar a distribuição por ambiente nos arquivos analisados.</div>`}
  ` : ''}

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
    <thead><tr><th>Descrição</th><th class="num">Qtd.</th><th>Un.</th><th class="num">Vlr. unit.</th><th class="num">Vlr. total</th><th>Status</th></tr></thead>
    <tbody>${linhasServicos}</tbody>
  </table>` : `<div class="vazio">Nenhum serviço lançado.</div>`}

  <h2>Materiais / Equipamentos</h2>
  ${materiais.length > 0 ? `
  <table>
    <thead><tr><th>Descrição</th><th class="num">Qtd.</th><th>Un.</th><th class="num">Preço catálogo</th><th class="num">Vlr. total</th><th>Status</th></tr></thead>
    <tbody>${linhasMateriais}</tbody>
  </table>` : `<div class="vazio">Nenhum material lançado.</div>`}
</body>
</html>
  `;
}

module.exports = { gerarHtmlRelatorioCompatibilizacao };
