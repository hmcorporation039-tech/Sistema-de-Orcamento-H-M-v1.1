const fs = require('fs');
const path = require('path');

function carregarImagem(nome) {
  try {
    const buffer = fs.readFileSync(path.join(__dirname, '..', 'assets', nome));
    return `data:image/png;base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

const cabecalhoDataUri = carregarImagem('cabecalho.png');

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

const EMPRESA = {
  razaoSocial: 'H&M Engenharia e Tecnologia LTDA',
  nomeFantasia: 'H&M Engenharia e Tecnologia',
  endereco: 'Quadra CNF 03 Lote 16 Loja 04 – Taguatinga Norte, Brasília-DF',
  cep: '72.125-535',
  cnpj: '04.003.376/0001-00',
  inscricaoEstadual: '07.864.408/002-36',
  telefone: '(61) 99185-8745',
  email: 'hmengetecnologia@gmail.com',
  representanteLegal: 'Márcio Henrique',
  banco: '007 - Inter',
  agencia: '0001',
  conta: '46963106-6',
  chavePix: '04003376000100',
};

function gerarHtmlProposta(proposta) {
  const { secoes = [], itens = [] } = proposta;

  const linhasSecoes = secoes.map(sec => {
    const itensSecao = itens.filter(it => it.secao_id === sec.id);
    if (itensSecao.length === 0) return '';
    const linhasItens = itensSecao.map(it => `
      <tr>
        <td>${escapeHtml(it.descricao)}</td>
        <td class="num">${escapeHtml(it.codigo) || '—'}</td>
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
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; font-size: 11px; }
  .banner { width: 100%; display: block; margin-bottom: 8px; }
  .numero-linha { text-align: right; margin-bottom: 12px; }
  .numero-linha .num { font-size: 18px; font-weight: 700; color: #c9a227; }
  .numero-linha .data { font-size: 9.5px; color: #888; margin-top: 1px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin-bottom: 12px; }
  .info-item .label { font-size: 8px; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 1px; }
  .info-item .valor { font-size: 10.5px; color: #1a1a1a; }
  .saudacao { font-size: 10.5px; margin-bottom: 5px; }
  .intro { font-size: 10px; line-height: 1.4; margin-bottom: 12px; white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #1a1a1a; color: #c9a227; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; padding: 6px 8px; text-align: left; }
  th.num, td.num { text-align: right; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e5e5; font-size: 10px; }
  tr.secao td { background: #f2f2f2; font-weight: 700; color: #333; padding: 5px 8px; }
  td.total { font-weight: 700; }
  .totais { display: flex; justify-content: flex-end; margin-bottom: 14px; }
  .totais table { width: 300px; margin-bottom: 0; }
  .totais td { border: none; padding: 3px 8px; font-size: 10.5px; }
  .totais tr.final td { border-top: 2px solid #c9a227; padding-top: 6px; font-size: 14px; font-weight: 700; color: #c9a227; }
  .bloco { margin-bottom: 12px; }
  .bloco .label { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 3px; }
  .bloco .texto { font-size: 10px; white-space: pre-wrap; }
  .encerramento { margin-top: 14px; padding-top: 10px; border-top: 1px solid #ddd; page-break-inside: avoid; }
  .empresa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 24px; font-size: 9px; color: #333; margin-bottom: 14px; }
  .empresa-grid b { display: block; color: #888; font-weight: 700; text-transform: uppercase; font-size: 7.5px; letter-spacing: .4px; margin-bottom: 1px; }
  .secao-titulo { font-size: 8.5px; text-transform: uppercase; letter-spacing: .5px; color: #c9a227; font-weight: 700; margin-bottom: 6px; }
  .assinatura { text-align: center; margin-top: 10px; }
  .assinatura .atenciosamente { font-size: 10.5px; margin-bottom: 16px; }
  .assinatura .nome { font-family: 'Dancing Script', cursive; font-size: 19px; color: #1a1a1a; }
  .assinatura .linha { width: 220px; border-top: 1px solid #999; margin: 4px auto 4px; }
  .assinatura .cargo { font-size: 9px; color: #666; }
</style>
</head>
<body>
  ${cabecalhoDataUri ? `<img src="${cabecalhoDataUri}" class="banner" alt="H&amp;M Engenharia e Tecnologia LTDA" />` : ''}
  <div class="numero-linha">
    <div class="num">${escapeHtml(proposta.numero)}</div>
    <div class="data">${formatarData(proposta.data)}</div>
  </div>

  <div class="info-grid">
    <div class="info-item"><div class="label">Cliente</div><div class="valor">${escapeHtml(proposta.cliente_nome)}</div></div>
    <div class="info-item"><div class="label">Local da obra</div><div class="valor">${escapeHtml(proposta.local_obra) || '—'}</div></div>
    <div class="info-item"><div class="label">Tipo</div><div class="valor">${escapeHtml(proposta.tipo) || '—'}</div></div>
    <div class="info-item"><div class="label">Porte</div><div class="valor">${escapeHtml(proposta.porte) || '—'}</div></div>
    <div class="info-item"><div class="label">Responsável técnico</div><div class="valor">${escapeHtml(proposta.responsavel) || '—'}</div></div>
    <div class="info-item"><div class="label">Validade da proposta</div><div class="valor">${proposta.validade} dias</div></div>
  </div>

  <div class="saudacao">Prezado(a) ${escapeHtml(proposta.cliente_nome)},</div>
  ${proposta.observacoes ? `<div class="intro">${escapeHtml(proposta.observacoes)}</div>` : ''}

  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th class="num">Código</th>
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
      ${Number(proposta.imposto_venda) > 0 ? `<tr><td>Imposto sobre vendas (${proposta.imposto_venda}%)</td><td class="num">${formatarMoeda(proposta.valor_imposto_venda)}</td></tr>` : ''}
      <tr><td>Subtotal mão de obra</td><td class="num">${formatarMoeda(proposta.subtotal_mao_obra)}</td></tr>
      ${Number(proposta.imposto_servico) > 0 ? `<tr><td>Imposto sobre serviços (${proposta.imposto_servico}%)</td><td class="num">${formatarMoeda(proposta.valor_imposto_servico)}</td></tr>` : ''}
      <tr><td>BDI (${proposta.bdi}%)</td><td class="num">${formatarMoeda(proposta.valor_bdi)}</td></tr>
      <tr class="final"><td>Total geral</td><td class="num">${formatarMoeda(proposta.total)}</td></tr>
    </table>
  </div>

  ${proposta.pagamento ? `
  <div class="bloco">
    <div class="label">Condições de pagamento</div>
    <div class="texto">${escapeHtml(proposta.pagamento)}</div>
  </div>` : ''}

  <div class="encerramento">
    <div class="empresa-grid">
      <div><b>Razão Social</b>${escapeHtml(EMPRESA.razaoSocial)}</div>
      <div><b>Nome Fantasia</b>${escapeHtml(EMPRESA.nomeFantasia)}</div>
      <div><b>Endereço</b>${escapeHtml(EMPRESA.endereco)}</div>
      <div><b>CEP</b>${escapeHtml(EMPRESA.cep)}</div>
      <div><b>CNPJ</b>${escapeHtml(EMPRESA.cnpj)}</div>
      <div><b>Inscrição Estadual</b>${escapeHtml(EMPRESA.inscricaoEstadual)}</div>
      <div><b>Telefone</b>${escapeHtml(EMPRESA.telefone)}</div>
      <div><b>E-mail</b>${escapeHtml(EMPRESA.email)}</div>
    </div>

    <div class="secao-titulo">Dados Bancários</div>
    <div class="empresa-grid">
      <div><b>Banco</b>${escapeHtml(EMPRESA.banco)}</div>
      <div><b>Agência</b>${escapeHtml(EMPRESA.agencia)}</div>
      <div><b>Conta</b>${escapeHtml(EMPRESA.conta)}</div>
      <div><b>Chave Pix</b>${escapeHtml(EMPRESA.chavePix)}</div>
    </div>

    <div class="assinatura">
      <div class="atenciosamente">Atenciosamente,</div>
      <div class="nome">${escapeHtml(EMPRESA.representanteLegal)}</div>
      <div class="linha"></div>
      <div class="cargo">Representante Legal</div>
    </div>
  </div>
</body>
</html>
  `;
}

function gerarFooterTemplate() {
  return `
    <div style="width:100%; font-family: Arial, Helvetica, sans-serif; font-size: 8px; color: #888;
      text-align: center; line-height: 1.6; padding: 0 14mm; box-sizing: border-box;">
      <div style="border-top: 1px solid #ccc; padding-top: 5px;">
        ${escapeHtml(EMPRESA.razaoSocial)}<br/>
        ${escapeHtml(EMPRESA.endereco)}, CEP ${escapeHtml(EMPRESA.cep)}<br/>
        ${escapeHtml(EMPRESA.telefone)} · ${escapeHtml(EMPRESA.email)}
      </div>
    </div>
  `;
}

module.exports = { gerarHtmlProposta, gerarFooterTemplate, EMPRESA, cabecalhoDataUri };
