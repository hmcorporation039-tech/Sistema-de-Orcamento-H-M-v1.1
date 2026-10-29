// HTML do BOLETIM DE MEDIÇÃO da obra (versão 2.0, Fase 3G) — vira PDF em
// pdfPuppeteer.js (A4 paisagem). Tudo que vem do banco passa por escapeHtml.
// Os números vêm prontos de utils/cronograma.js (boletimMedicao).
const { htmlBanner, EMPRESA } = require('./pdfTemplate');
// dataBR: base comum — a cópia daqui fatiava o texto e, com a data vinda do banco como Date, imprimia "Wed Oct 28"
const { escapeHtml, formatarMoeda: moeda, formatarData: dataBR } = require('./htmlPdf');

const pct = (v) => `${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

/**
 * { obra, proposta, boletim, resumo, medicoes (do período, vigentes, com observação), periodicidade, emitidoPor }
 */
function gerarHtmlBoletim({ obra, proposta, boletim, medicoes = [], periodicidade, emitidoPor }) {
  const b = boletim;
  const linhas = b.linhas.map((l, i) => `
    <tr class="${l.medido ? '' : 'sem'}">
      <td class="c">${i + 1}</td>
      <td>${escapeHtml(l.nome)}</td>
      <td class="n">${moeda(l.valor)}</td>
      <td class="n">${pct(l.peso)}</td>
      <td class="n">${pct(l.previsto_acum_pct)}</td>
      <td class="n">${pct(l.pct_anterior)}</td>
      <td class="n destaque">${pct(l.pct_periodo)}</td>
      <td class="n">${pct(l.pct_acumulado)}</td>
      <td class="n">${moeda(l.valor_anterior)}</td>
      <td class="n destaque">${moeda(l.valor_periodo)}</td>
      <td class="n">${moeda(l.valor_acumulado)}</td>
      <td class="n">${moeda(l.saldo)}</td>
    </tr>`).join('');
  const obs = medicoes.filter(m => m.observacao).map(m => `<li><b>${escapeHtml(m.etapa_nome)}</b>: ${escapeHtml(m.observacao)}</li>`).join('');
  const desvio = b.fisico_acumulado - b.fisico_previsto;
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Boletim de medição</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #222; margin: 0; }
  .banner { width: 100%; max-height: 70px; object-fit: contain; object-position: left; margin-bottom: 6px; }
  h1 { font-size: 16px; margin: 4px 0 2px; color: #1f1f1f; }
  .sub { color: #666; margin-bottom: 10px; }
  .faixa { height: 3px; background: #c9a227; margin: 6px 0 10px; }
  .info { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px 14px; margin-bottom: 10px; }
  .info .r { font-size: 8px; text-transform: uppercase; color: #888; letter-spacing: .4px; }
  .info .v { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1f1f1f; color: #fff; font-size: 8.5px; padding: 5px 4px; text-align: center; }
  td { border-bottom: 1px solid #e3e3e3; padding: 4px; }
  td.n { text-align: right; white-space: nowrap; }
  td.c { text-align: center; }
  td.destaque { background: #fff7dc; font-weight: bold; }
  tr.sem td { color: #888; }
  tfoot td { font-weight: bold; background: #f4f4f4; border-top: 2px solid #c9a227; }
  .cartoes { display: flex; gap: 10px; margin: 12px 0; }
  .cartao { flex: 1; border: 1px solid #e0e0e0; border-left: 4px solid #c9a227; padding: 6px 8px; }
  .cartao .r { font-size: 8px; color: #888; text-transform: uppercase; }
  .cartao .v { font-size: 14px; font-weight: bold; }
  .obs { margin-top: 8px; }
  .obs ul { margin: 4px 0 0 16px; padding: 0; }
  .assin { display: flex; gap: 40px; margin-top: 36px; }
  .assin div { flex: 1; border-top: 1px solid #444; padding-top: 4px; text-align: center; font-size: 9px; }
  .nota { color: #888; font-size: 8px; margin-top: 10px; }
</style></head>
<body>
  ${htmlBanner()}
  <h1>Boletim de Medição nº ${escapeHtml(String(b.numero).padStart(2, '0'))}</h1>
  <div class="sub">Período ${escapeHtml(b.rotulo)} (${dataBR(b.periodo)} a ${dataBR(b.fim_periodo)}) · medição ${periodicidade === 'semanal' ? 'semanal' : 'mensal'}</div>
  <div class="faixa"></div>
  <div class="info">
    <div><div class="r">Obra</div><div class="v">${escapeHtml(obra.codigo)} — ${escapeHtml(obra.nome)}</div></div>
    <div><div class="r">Cliente</div><div class="v">${escapeHtml(obra.cliente_nome) || '—'}</div></div>
    <div><div class="r">Local</div><div class="v">${escapeHtml(obra.local) || '—'}</div></div>
    <div><div class="r">Proposta de base</div><div class="v">${proposta ? escapeHtml(proposta.numero) : '—'}</div></div>
  </div>
  <table>
    <thead><tr>
      <th>Item</th><th style="text-align:left">Etapa</th><th>Valor contratado</th><th>Peso</th><th>Previsto acum.</th>
      <th>% anterior</th><th>% no período</th><th>% acumulado</th>
      <th>Medido anterior</th><th>Medido no período</th><th>Medido acumulado</th><th>Saldo a medir</th>
    </tr></thead>
    <tbody>${linhas}</tbody>
    <tfoot><tr>
      <td></td><td>TOTAL</td><td class="n">${moeda(b.totais.valor)}</td><td class="n">100,00%</td><td class="n">${pct(b.fisico_previsto)}</td>
      <td class="n">${pct(b.fisico_anterior)}</td><td class="n">${pct(b.fisico_acumulado - b.fisico_anterior)}</td><td class="n">${pct(b.fisico_acumulado)}</td>
      <td class="n">${moeda(b.totais.valor_anterior)}</td><td class="n">${moeda(b.totais.valor_periodo)}</td>
      <td class="n">${moeda(b.totais.valor_acumulado)}</td><td class="n">${moeda(b.totais.saldo)}</td>
    </tr></tfoot>
  </table>
  <div class="cartoes">
    <div class="cartao"><div class="r">Valor desta medição</div><div class="v">${moeda(b.totais.valor_periodo)}</div></div>
    <div class="cartao"><div class="r">Físico acumulado (obra)</div><div class="v">${pct(b.fisico_acumulado)}</div></div>
    <div class="cartao"><div class="r">Físico previsto até o período</div><div class="v">${pct(b.fisico_previsto)}</div></div>
    <div class="cartao"><div class="r">Desvio físico</div><div class="v" style="color:${desvio < -1 ? '#c0392b' : desvio > 1 ? '#1a7f3c' : '#222'}">${desvio >= 0 ? '+' : ''}${pct(desvio)}</div></div>
    <div class="cartao"><div class="r">Financeiro acumulado</div><div class="v">${pct(b.financeiro_acumulado)}</div></div>
  </div>
  ${obs ? `<div class="obs"><b>Observações da medição</b><ul>${obs}</ul></div>` : ''}
  <div class="assin">
    <div>${escapeHtml(EMPRESA.razaoSocial)}<br/>Responsável pela medição</div>
    <div>Contratante / fiscalização<br/>${escapeHtml(obra.cliente_nome) || ''}</div>
  </div>
  <div class="nota">Emitido em ${escapeHtml(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}${emitidoPor ? ` por ${escapeHtml(emitidoPor)}` : ''}. % acumulado = avanço físico de cada etapa até o fim do período; peso da etapa no físico da obra conforme o cronograma.</div>
</body></html>`;
}

module.exports = { gerarHtmlBoletim };
