function formatarMoeda(v) {
  return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(v) {
  if (!v) return '—';
  const d = new Date(v);
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatarNcm(v) {
  const digitos = String(v || '').replace(/\D/g, '');
  if (digitos.length !== 8) return v ? escapeHtml(v) : '—';
  return `${digitos.slice(0, 4)}.${digitos.slice(4, 6)}.${digitos.slice(6, 8)}`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function gerarHtmlProposta(proposta) {
  const { secoes = [], itens = [] } = proposta;

  const linhasSecoes = secoes.map(sec => {
    const itensSecao = itens.filter(it => it.secao_id === sec.id);
    if (itensSecao.length === 0) return '';
    const linhasItens = itensSecao.map(it => `
      <tr>
        <td>${escapeHtml(it.descricao)}</td>
        <td class="num">${formatarNcm(it.ncm)}</td>
        <td class="num">${Number(it.quantidade)}</td>
        <td class="num">${escapeHtml(it.unidade)}</td>
        <td class="num">${formatarMoeda(it.valor_unitario)}</td>
        <td class="num total">${formatarMoeda(it.valor_total)}</td>
      </tr>
    `).join('');
    return `
      <tr class="secao"><td colspan="6">${escapeHtml(sec.nome)}</td></tr>
      ${linhasItens}
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 11px; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #c9a227; padding-bottom: 14px; margin-bottom: 20px; }
  .header h1 { font-size: 17px; color: #1a1a1a; }
  .header p { font-size: 10px; color: #666; margin-top: 2px; }
  .numero { text-align: right; }
  .numero .num { font-size: 20px; font-weight: 700; color: #c9a227; }
  .numero .data { font-size: 10px; color: #666; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 20px; }
  .info-item .label { font-size: 8px; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 2px; }
  .info-item .valor { font-size: 11px; color: #1a1a1a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  th { background: #1a1a1a; color: #c9a227; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; padding: 7px 8px; text-align: left; }
  th.num, td.num { text-align: right; }
  td { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; font-size: 10.5px; }
  tr.secao td { background: #f2f2f2; font-weight: 700; color: #333; padding: 6px 8px; }
  td.total { font-weight: 700; }
  .totais { display: flex; justify-content: flex-end; margin-bottom: 20px; }
  .totais table { width: 280px; margin-bottom: 0; }
  .totais td { border: none; padding: 4px 8px; font-size: 11px; }
  .totais tr.final td { border-top: 2px solid #c9a227; padding-top: 8px; font-size: 15px; font-weight: 700; color: #c9a227; }
  .bloco { margin-bottom: 16px; }
  .bloco .label { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 3px; }
  .bloco .texto { font-size: 10.5px; white-space: pre-wrap; }
  .footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid #ccc; font-size: 9px; color: #888; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>H&amp;M Engenharia e Tecnologia</h1>
      <p>CNPJ 04.003.376/0001-00 · Taguatinga Norte, Brasília-DF</p>
    </div>
    <div class="numero">
      <div class="num">${escapeHtml(proposta.numero)}</div>
      <div class="data">${formatarData(proposta.data)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-item"><div class="label">Cliente</div><div class="valor">${escapeHtml(proposta.cliente_nome)}</div></div>
    <div class="info-item"><div class="label">Local da obra</div><div class="valor">${escapeHtml(proposta.local_obra) || '—'}</div></div>
    <div class="info-item"><div class="label">Tipo</div><div class="valor">${escapeHtml(proposta.tipo) || '—'}</div></div>
    <div class="info-item"><div class="label">Porte</div><div class="valor">${escapeHtml(proposta.porte) || '—'}</div></div>
    <div class="info-item"><div class="label">Responsável técnico</div><div class="valor">${escapeHtml(proposta.responsavel) || '—'}</div></div>
    <div class="info-item"><div class="label">Validade da proposta</div><div class="valor">${proposta.validade} dias</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th class="num">NCM/SH</th>
        <th class="num">Qtd.</th>
        <th class="num">Un.</th>
        <th class="num">Vlr. Unit.</th>
        <th class="num">Vlr. Total</th>
      </tr>
    </thead>
    <tbody>
      ${linhasSecoes}
    </tbody>
  </table>

  <div class="totais">
    <table>
      <tr><td>Subtotal materiais</td><td class="num">${formatarMoeda(proposta.subtotal_materiais)}</td></tr>
      <tr><td>Subtotal mão de obra</td><td class="num">${formatarMoeda(proposta.subtotal_mao_obra)}</td></tr>
      <tr><td>BDI (${proposta.bdi}%)</td><td class="num">${formatarMoeda(proposta.valor_bdi)}</td></tr>
      <tr class="final"><td>Total geral</td><td class="num">${formatarMoeda(proposta.total)}</td></tr>
    </table>
  </div>

  ${proposta.pagamento ? `
  <div class="bloco">
    <div class="label">Condições de pagamento</div>
    <div class="texto">${escapeHtml(proposta.pagamento)}</div>
  </div>` : ''}

  ${proposta.observacoes ? `
  <div class="bloco">
    <div class="label">Observações</div>
    <div class="texto">${escapeHtml(proposta.observacoes)}</div>
  </div>` : ''}

  <div class="footer">
    Proposta gerada eletronicamente por H&amp;M Engenharia e Tecnologia — válida por ${proposta.validade} dias a partir de ${formatarData(proposta.data)}.
  </div>
</body>
</html>
  `;
}

module.exports = { gerarHtmlProposta };
