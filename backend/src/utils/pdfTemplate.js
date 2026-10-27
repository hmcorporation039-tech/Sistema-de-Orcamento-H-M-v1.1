const fs = require('fs');
const path = require('path');
const { ehMaoDeObra, detalharBdi } = require('./calculoProposta');
const { calcularCurvaAbc } = require('./curvaAbc');
const {
  FONTE_BDI_TCU, FORNECIMENTO_TCU, REGIMES_BDI, PARCELAS_BDI, referenciaTcu, tributosBdi, normalizarMemoriaBdi,
} = require('./bdiTcu');

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

// Data vinda de coluna DATE do banco ("2026-01-15"): o driver devolve meia-noite
// UTC, então formatar em UTC é o certo — em horário de Brasília viraria o dia
// anterior.
function formatarData(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—'; // evita imprimir "Invalid Date"
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Data de HOJE (assinatura de contrato, emissão do documento): precisa do fuso
// local, não de UTC. Com UTC, um contrato gerado às 21h30 de Brasília saía
// datado do dia seguinte — num documento com valor jurídico.
function formatarDataDeHoje() {
  return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Código de serviço da base de mão de obra (ele_qdg, rede_switch, livre_12…) é
// uso interno: não vai para o PDF do cliente. Código de material (catálogo,
// fabricante) continua aparecendo.
const CODIGO_INTERNO_SERVICO = /^[a-z][a-z0-9]*_[a-z0-9_]+$/;
const codigoParaCliente = (codigo) => (CODIGO_INTERNO_SERVICO.test(String(codigo || '')) ? '' : codigo);

// Quantidade era o único número do PDF sem formatação pt-BR: a coluna é
// DECIMAL(10,3), então 2,5 m de cabo saía como "2.5" com ponto, e um valor
// ausente viraria "NaN" no documento do cliente (todos os outros campos são
// protegidos por formatarMoeda).
function formatarQuantidade(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

// Percentuais vêm do driver do pg como string ("15.50", coluna DECIMAL(5,2)),
// e eram impressos crus — "BDI (15.50%)" com ponto decimal, num documento em
// que todo o resto está em pt-BR.
function formatarPercentual(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
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

// ── Anexos opcionais da proposta (versão 2.0, Fase 3F) ──
// Desligados por padrão; ligados ao gerar o PDF (?curva_abc=1&composicao_bdi=1).

function formatarPct2(v) {
  const n = Number(v);
  return (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Curva ABC dos itens (custo direto, sem BDI/impostos). Código interno de
// serviço não aparece (codigoParaCliente), como no corpo da proposta.
function htmlAnexoCurvaAbc(proposta) {
  const { secoes = [], itens = [] } = proposta;
  const tipoDaSecao = new Map(secoes.map(s => [s.id, ehMaoDeObra(s.nome) ? 'servico' : 'material']));
  const curva = calcularCurvaAbc(itens.map(it => ({
    descricao: it.descricao, quantidade: it.quantidade, unidade: it.unidade, valor_unitario: it.valor_unitario,
    codigo: it.codigo, tipo: tipoDaSecao.get(it.secao_id) || 'material',
  })));
  const maior = curva.itens.length ? curva.itens[0].total : 0;
  const linhas = curva.itens.map(l => `
      <tr class="abc-${l.classe}">
        <td class="num">${l.posicao}</td>
        <td>${escapeHtml(l.descricao)}${codigoParaCliente(l.codigo) ? ` <span class="cod">${escapeHtml(codigoParaCliente(l.codigo))}</span>` : ''}</td>
        <td>${l.tipo === 'servico' ? 'Serviço' : 'Material'}</td>
        <td class="num">${formatarQuantidade(l.quantidade)} ${escapeHtml(l.unidade)}</td>
        <td class="num">${formatarMoeda(l.total)}</td>
        <td class="num">${formatarPct2(l.pct)}%</td>
        <td class="num">${formatarPct2(l.pct_acumulado)}%</td>
        <td class="barra"><div style="width:${maior > 0 ? Math.max(1, Math.round((l.total / maior) * 100)) : 0}%"></div></td>
        <td class="classe">${l.classe}</td>
      </tr>`).join('');
  const r = curva.resumo;
  const resumo = ['A', 'B', 'C'].map(c => `<td><b>Classe ${c}</b> — ${r[c].itens} item(ns), ${formatarMoeda(r[c].valor)} (${formatarPct2(r[c].pct)}%)</td>`).join('');
  return `
  <div class="anexo">
    <div class="anexo-titulo">Anexo — Curva ABC dos itens</div>
    <div class="anexo-sub">Itens (materiais e serviços) ordenados pelo valor total, com o percentual de cada um e o acumulado.
      Classe A: até ${formatarPercentual(curva.limites.A)}% do valor acumulado; B: até ${formatarPercentual(curva.limites.B)}%; C: o restante.
      Valores de custo direto (sem BDI e impostos), somando o mesmo item lançado em mais de uma linha.</div>
    <table class="resumo-abc"><tr>${resumo}</tr></table>
    <table class="tabela-abc">
      <thead><tr><th class="num">#</th><th>Descrição</th><th>Tipo</th><th class="num">Qtd.</th><th class="num">Valor total</th><th class="num">%</th><th class="num">% acum.</th><th></th><th>Classe</th></tr></thead>
      <tbody>${linhas}
        <tr class="total"><td></td><td colspan="3"><b>Total (custo direto)</b></td><td class="num"><b>${formatarMoeda(curva.total)}</b></td><td class="num">100,00%</td><td colspan="3"></td></tr>
      </tbody>
    </table>
  </div>`;
}

// Composição do BDI pela fórmula do TCU (memória gravada pelo calculador do
// editor em propostas.bdi_memoria). Exigida em proposta para órgão público.
function htmlTabelaBdi(titulo, parcelas, regime, bdi, ref) {
  const faixa = (k) => (ref && ref[k] ? ref[k].map(v => `${formatarPct2(v)}%`) : ['—', '—', '—']);
  const linhasParcelas = PARCELAS_BDI.map(([k, nome]) => {
    const [q1, med, q3] = faixa(k);
    return `<tr><td>${escapeHtml(nome)}</td><td class="num"><b>${formatarPct2(parcelas[k])}%</b></td><td class="num">${q1}</td><td class="num">${med}</td><td class="num">${q3}</td></tr>`;
  }).join('');
  const base = parcelas.iss_base == null ? 100 : Number(parcelas.iss_base);
  const linhasTributos = [
    ['PIS', parcelas.pis],
    ['COFINS', parcelas.cofins],
    [`ISS${base !== 100 ? ` (${formatarPct2(parcelas.iss)}% sobre ${formatarPct2(base)}% do preço)` : ''}`, Number(parcelas.iss) * (base / 100)],
    ...(regime === 'desonerado' ? [['CPRB — contribuição previdenciária sobre a receita bruta', parcelas.cprb]] : []),
  ].map(([nome, v]) => `<tr><td>${escapeHtml(nome)}</td><td class="num">${formatarPct2(v)}%</td><td colspan="3"></td></tr>`).join('');
  const [bq1, bmed, bq3] = faixa('bdi');
  return `
    <div class="bdi-bloco">
      <div class="bdi-titulo">${escapeHtml(titulo)}</div>
      <table class="tabela-bdi">
        <thead><tr><th>Parcela</th><th class="num">Adotado</th><th class="num">TCU 1º quartil</th><th class="num">TCU médio</th><th class="num">TCU 3º quartil</th></tr></thead>
        <tbody>
          ${linhasParcelas}
          <tr class="sub"><td colspan="5">Tributos sobre o preço (I)</td></tr>
          ${linhasTributos}
          <tr class="sub"><td>Total de tributos (I)</td><td class="num">${formatarPct2(tributosBdi(parcelas, regime))}%</td><td colspan="3"></td></tr>
          <tr class="final"><td>BDI resultante</td><td class="num">${formatarPct2(bdi)}%</td><td class="num">${bq1}</td><td class="num">${bmed}</td><td class="num">${bq3}</td></tr>
        </tbody>
      </table>
    </div>`;
}

function htmlAnexoComposicaoBdi(proposta) {
  const m = normalizarMemoriaBdi(proposta.bdi_memoria);
  if (!m) {
    return `
  <div class="anexo">
    <div class="anexo-titulo">Anexo — Composição do BDI</div>
    <div class="anexo-sub">BDI adotado nesta proposta: <b>${formatarPct2(proposta.bdi)}%</b>. A composição detalhada (parcelas pela fórmula do
      Acórdão 2.622/2013-TCU-Plenário) não foi registrada para esta proposta.</div>
  </div>`;
  }
  const tipo = referenciaTcu(m.tipo_obra);
  const avisos = [];
  if (Math.abs(Number(proposta.bdi) - m.bdi) > 0.005) avisos.push(`O BDI aplicado na proposta (${formatarPct2(proposta.bdi)}%) difere do calculado nesta composição (${formatarPct2(m.bdi)}%).`);
  const bdiMat = proposta.bdi_materiais;
  if (m.materiais && (bdiMat == null || Math.abs(Number(bdiMat) - m.materiais.bdi) > 0.005)) {
    avisos.push(`O BDI de materiais aplicado na proposta (${bdiMat == null ? 'o mesmo BDI' : `${formatarPct2(bdiMat)}%`}) difere do calculado nesta composição (${formatarPct2(m.materiais.bdi)}%).`);
  }
  return `
  <div class="anexo">
    <div class="anexo-titulo">Anexo — Composição do BDI</div>
    <div class="anexo-sub">
      Tipo de obra: <b>${escapeHtml(tipo ? tipo.nome : m.tipo_obra)}</b> · Regime: <b>${escapeHtml(REGIMES_BDI[m.regime] || m.regime)}</b>${m.regime === 'desonerado' && m.ano_cprb ? ` · CPRB de ${escapeHtml(m.ano_cprb)}` : ''}<br/>
      Fórmula: BDI = [ (1 + AC + S + R + G) × (1 + DF) × (1 + L) / (1 − I) ] − 1 &nbsp;—&nbsp; ${escapeHtml(FONTE_BDI_TCU)}.
      Faixas de referência (1º quartil, médio e 3º quartil) do mesmo acórdão; a tabela do TCU publica seguro e garantia juntos.
      ${m.regime === 'desonerado' ? 'As faixas de BDI do acórdão são de orçamentos sem desoneração: a CPRB soma por cima delas.' : ''}
    </div>
    ${htmlTabelaBdi(m.materiais ? 'BDI dos serviços (mão de obra e execução)' : 'BDI da proposta', m.parcelas, m.regime, m.bdi, tipo)}
    ${m.materiais ? htmlTabelaBdi('BDI diferenciado — fornecimento de materiais e equipamentos', m.materiais.parcelas, m.regime, m.materiais.bdi, FORNECIMENTO_TCU) : ''}
    ${avisos.map(a => `<div class="anexo-aviso">${escapeHtml(a)}</div>`).join('')}
  </div>`;
}

function gerarHtmlProposta(proposta, anexos = {}) {
  const { secoes = [], itens = [] } = proposta;
  const bdiDetalhe = detalharBdi({
    subtotalMateriais: proposta.subtotal_materiais, subtotalMaoObra: proposta.subtotal_mao_obra,
    bdi: proposta.bdi, bdi_materiais: proposta.bdi_materiais,
  });

  const linhasSecoes = secoes.map(sec => {
    const itensSecao = itens.filter(it => it.secao_id === sec.id);
    if (itensSecao.length === 0) return '';
    // Agrupa por subgrupo (ex: "Cabeamento/Rede/CFTV", "Alarme"), na ordem em que os itens
    // foram lançados, inserindo uma linha de sub-cabeçalho a cada troca de subgrupo. O status
    // interno do item (confirmado/a cotar) é uso interno da equipe e não aparece no PDF do cliente.
    let ultimoSubgrupo = null;
    const linhasItens = itensSecao.map(it => {
      const sg = (it.subgrupo || '').trim() || null;
      let cabecalho = '';
      if (sg !== ultimoSubgrupo) {
        if (sg) cabecalho = `<tr class="subgrupo"><td colspan="6">${escapeHtml(sg)}</td></tr>`;
        ultimoSubgrupo = sg;
      }
      return `${cabecalho}
      <tr>
        <td>${escapeHtml(it.descricao)}</td>
        <td class="num">${escapeHtml(codigoParaCliente(it.codigo)) || '—'}</td>
        <td class="num">${formatarQuantidade(it.quantidade)}</td>
        <td class="num">${escapeHtml(it.unidade)}</td>
        <td class="num">${formatarMoeda(it.valor_unitario)}</td>
        <td class="num total">${formatarMoeda(it.valor_total)}</td>
      </tr>`;
    }).join('');
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
  .saudacao { font-size: 10.5px; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #1a1a1a; color: #c9a227; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; padding: 6px 8px; text-align: left; }
  th.num, td.num { text-align: right; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e5e5; font-size: 10px; }
  tr.secao td { background: #f2f2f2; font-weight: 700; color: #333; padding: 5px 8px; }
  tr.subgrupo td { font-weight: 700; color: #666; padding: 4px 8px 3px 12px; font-size: 9px; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #e5e5e5; }
  td.total { font-weight: 700; }
  .totais { display: flex; justify-content: flex-end; margin-bottom: 14px; }
  .totais table { width: 300px; margin-bottom: 0; }
  .totais td { border: none; padding: 3px 8px; font-size: 10.5px; }
  .totais tr.final td { border-top: 2px solid #c9a227; padding-top: 6px; font-size: 14px; font-weight: 700; color: #c9a227; }
  .bloco { margin-bottom: 12px; background: #faf9f6; border-left: 3px solid #c9a227; border-radius: 0 4px 4px 0; padding: 8px 10px; page-break-inside: avoid; }
  .bloco .label { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; color: #a9842f; font-weight: 700; margin-bottom: 3px; }
  .bloco .texto { font-size: 10px; line-height: 1.4; white-space: pre-wrap; color: #333; }
  .encerramento { margin-top: 14px; padding-top: 10px; border-top: 1px solid #ddd; page-break-inside: avoid; }
  .empresa-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 24px; font-size: 9px; color: #333; margin-bottom: 14px; }
  .empresa-grid b { display: block; color: #888; font-weight: 700; text-transform: uppercase; font-size: 7.5px; letter-spacing: .4px; margin-bottom: 1px; }
  .secao-titulo { font-size: 8.5px; text-transform: uppercase; letter-spacing: .5px; color: #c9a227; font-weight: 700; margin-bottom: 6px; }
  .assinatura { text-align: center; margin-top: 10px; }
  .assinatura .atenciosamente { font-size: 10.5px; margin-bottom: 16px; }
  .assinatura .nome { font-family: 'Dancing Script', cursive; font-size: 19px; color: #1a1a1a; }
  .assinatura .linha { width: 220px; border-top: 1px solid #999; margin: 4px auto 4px; }
  .assinatura .cargo { font-size: 9px; color: #666; }
  .anexo { page-break-before: always; }
  .anexo-titulo { font-size: 13px; font-weight: 700; color: #c9a227; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
  .anexo-sub { font-size: 9.5px; color: #555; line-height: 1.45; margin-bottom: 10px; }
  .anexo-aviso { font-size: 9.5px; color: #8a5a00; background: #fff6df; border-left: 3px solid #c9a227; padding: 5px 8px; margin-top: 6px; }
  .tabela-abc td { font-size: 9px; padding: 3px 6px; }
  .tabela-abc .cod { color: #888; font-size: 8px; }
  .tabela-abc td.barra { width: 90px; }
  .tabela-abc td.barra div { height: 7px; background: #c9a227; border-radius: 2px; }
  .tabela-abc tr.abc-B td.barra div { background: #8c8c8c; }
  .tabela-abc tr.abc-C td.barra div { background: #c8c8c8; }
  .tabela-abc td.classe { font-weight: 700; text-align: center; }
  .tabela-abc td.num { white-space: nowrap; }
  .tabela-abc tr.total td { border-top: 2px solid #c9a227; border-bottom: none; page-break-inside: avoid; }
  .resumo-abc td { border: none; font-size: 9.5px; padding: 0 8px 6px 0; }
  .bdi-bloco { margin-bottom: 12px; page-break-inside: avoid; }
  .bdi-titulo { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px; color: #333; margin-bottom: 4px; }
  .tabela-bdi td { font-size: 9.5px; padding: 3px 8px; }
  .tabela-bdi tr.sub td { background: #f5f5f5; font-weight: 700; color: #444; }
  .tabela-bdi tr.final td { border-top: 2px solid #c9a227; font-weight: 700; font-size: 11px; color: #a9842f; }
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
  ${proposta.escopo ? `
  <div class="bloco">
    <div class="label">Escopo</div>
    <div class="texto">${escapeHtml(proposta.escopo)}</div>
  </div>` : ''}

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
      ${Number(proposta.imposto_venda) > 0 ? `<tr><td>Imposto sobre vendas (${formatarPercentual(proposta.imposto_venda)}%)</td><td class="num">${formatarMoeda(proposta.valor_imposto_venda)}</td></tr>` : ''}
      <tr><td>Subtotal mão de obra</td><td class="num">${formatarMoeda(proposta.subtotal_mao_obra)}</td></tr>
      ${Number(proposta.imposto_servico) > 0 ? `<tr><td>Imposto sobre serviços (${formatarPercentual(proposta.imposto_servico)}%)</td><td class="num">${formatarMoeda(proposta.valor_imposto_servico)}</td></tr>` : ''}
      ${bdiDetalhe.diferenciado
        ? `<tr><td>BDI materiais (${formatarPercentual(proposta.bdi_materiais)}%)</td><td class="num">${formatarMoeda(bdiDetalhe.valor_bdi_materiais)}</td></tr>
      <tr><td>BDI mão de obra (${formatarPercentual(proposta.bdi)}%)</td><td class="num">${formatarMoeda(bdiDetalhe.valor_bdi_mao_obra)}</td></tr>`
        : `<tr><td>BDI (${formatarPercentual(proposta.bdi)}%)</td><td class="num">${formatarMoeda(proposta.valor_bdi)}</td></tr>`}
      ${Number(proposta.desconto_materiais_pct) < 0 ? `<tr><td colspan="2" style="font-style:italic;color:#666;font-size:9px;">Desconto de ${formatarPercentual(Math.abs(proposta.desconto_materiais_pct))}% já aplicado aos valores de materiais</td></tr>` : ''}
      ${Number(proposta.desconto_mao_obra_pct) < 0 ? `<tr><td colspan="2" style="font-style:italic;color:#666;font-size:9px;">Desconto de ${formatarPercentual(Math.abs(proposta.desconto_mao_obra_pct))}% já aplicado aos valores de mão de obra</td></tr>` : ''}
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
  ${anexos.composicaoBdi ? htmlAnexoComposicaoBdi(proposta) : ''}
  ${anexos.curvaAbc ? htmlAnexoCurvaAbc(proposta) : ''}
</body>
</html>
  `;
}

function formatarDocumentoPorTipo(documento, tipo) {
  const digitos = String(documento || '').replace(/\D/g, '');
  if (tipo === 'Pessoa Jurídica' || digitos.length === 14) {
    return digitos.length === 14
      ? `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`
      : documento || '—';
  }
  return digitos.length === 11
    ? `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`
    : documento || '—';
}

function gerarHtmlContrato(contrato) {
  const ehPJ = contrato.prestador_tipo === 'Pessoa Jurídica';
  const rotuloDocumento = ehPJ ? 'CNPJ' : 'CPF';
  const documentoFormatado = formatarDocumentoPorTipo(contrato.prestador_documento, contrato.prestador_tipo);
  const objeto = contrato.objeto?.trim()
    || 'prestação de serviços técnicos de engenharia elétrica e automação';

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
  .titulo { text-align: center; font-size: 15px; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; margin: 10px 0 4px; color: #1a1a1a; }
  .subtitulo { text-align: center; font-size: 9.5px; color: #888; margin-bottom: 18px; }
  .qualificacao { font-size: 10.5px; line-height: 1.6; text-align: justify; margin-bottom: 10px; }
  .qualificacao b { font-weight: 700; }
  .clausula-titulo { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; margin: 14px 0 5px; color: #1a1a1a; }
  .clausula-texto { font-size: 10.5px; line-height: 1.55; text-align: justify; }
  .clausula-texto + .clausula-texto { margin-top: 5px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; margin: 8px 0 4px; }
  .info-item .label { font-size: 8px; text-transform: uppercase; letter-spacing: .5px; color: #888; margin-bottom: 1px; }
  .info-item .valor { font-size: 10.5px; color: #1a1a1a; font-weight: 600; }
  .local-data { text-align: center; font-size: 10.5px; margin-top: 26px; margin-bottom: 30px; }
  .assinaturas { display: flex; justify-content: space-between; gap: 30px; margin-top: 10px; page-break-inside: avoid; }
  .assinaturas .bloco-assinatura { flex: 1; text-align: center; }
  .assinaturas .linha { width: 100%; border-top: 1px solid #555; margin-bottom: 6px; }
  .assinaturas .parte { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
  .assinaturas .nome-doc { font-size: 9.5px; color: #444; margin-top: 2px; }
  .rodape-numero { text-align: right; font-size: 9px; color: #888; margin-top: 20px; }
</style>
</head>
<body>
  ${cabecalhoDataUri ? `<img src="${cabecalhoDataUri}" class="banner" alt="H&amp;M Engenharia e Tecnologia LTDA" />` : ''}

  <div class="titulo">Contrato de Prestação de Serviços</div>
  <div class="subtitulo">Contrato Nº ${String(contrato.id).padStart(4, '0')} · Código de Registro ${escapeHtml(contrato.codigo_registro) || '—'}</div>

  <div class="qualificacao">
    <b>CONTRATANTE:</b> ${escapeHtml(EMPRESA.razaoSocial)}, pessoa jurídica de direito privado, inscrita no CNPJ
    sob o nº ${escapeHtml(EMPRESA.cnpj)}, com sede em ${escapeHtml(EMPRESA.endereco)}, CEP ${escapeHtml(EMPRESA.cep)},
    neste ato representada por ${escapeHtml(EMPRESA.representanteLegal)}.
  </div>
  <div class="qualificacao">
    <b>CONTRATADO(A):</b> ${escapeHtml(contrato.prestador_nome)}, ${ehPJ ? 'pessoa jurídica' : 'pessoa física'},
    inscrito(a) no ${rotuloDocumento} sob o nº ${escapeHtml(documentoFormatado)}.
  </div>

  <div class="clausula-titulo">Cláusula 1ª — Do Objeto</div>
  <div class="clausula-texto">
    O presente contrato tem como objeto a ${escapeHtml(objeto)}, a ser executado(a) pelo(a) CONTRATADO(A)
    em favor do CONTRATANTE, conforme condições estabelecidas nas cláusulas seguintes.
  </div>

  <div class="clausula-titulo">Cláusula 2ª — Do Local e Prazo de Execução</div>
  <div class="clausula-texto">
    Os serviços serão prestados no seguinte local: <b>${escapeHtml(contrato.local_obra) || '—'}</b>, durante o período
    de <b>${formatarData(contrato.periodo_inicio)}</b> a <b>${formatarData(contrato.periodo_fim)}</b>.
  </div>

  <div class="clausula-titulo">Cláusula 3ª — Do Valor e Forma de Pagamento</div>
  <div class="clausula-texto">
    Pelos serviços objeto deste contrato, o CONTRATANTE pagará ao(à) CONTRATADO(A) o valor total de
    <b>${formatarMoeda(contrato.valor)}</b>, mediante transferência via Pix para a chave cadastrada pelo(a) CONTRATADO(A),
    ou outra forma de pagamento acordada entre as partes.
  </div>

  <div class="clausula-titulo">Cláusula 4ª — Das Obrigações das Partes</div>
  <div class="clausula-texto">
    O(A) CONTRATADO(A) obriga-se a executar os serviços com zelo, diligência e observância das normas técnicas e de
    segurança aplicáveis, respondendo por eventuais danos causados por sua ação ou omissão.
  </div>
  <div class="clausula-texto">
    O CONTRATANTE obriga-se a fornecer as condições necessárias para a execução dos serviços e a efetuar o pagamento
    na forma e prazo acordados.
  </div>

  <div class="clausula-titulo">Cláusula 5ª — Da Natureza da Relação</div>
  <div class="clausula-texto">
    Este contrato tem natureza eminentemente civil, de prestação de serviços autônoma, não gerando qualquer vínculo
    empregatício, societário ou de subordinação entre as partes, nos termos da legislação civil vigente.
  </div>

  <div class="clausula-titulo">Cláusula 6ª — Da Rescisão</div>
  <div class="clausula-texto">
    O presente contrato poderá ser rescindido por qualquer das partes, mediante comunicação prévia, em caso de
    descumprimento de quaisquer das cláusulas aqui estabelecidas.
  </div>

  <div class="clausula-titulo">Cláusula 7ª — Do Foro</div>
  <div class="clausula-texto">
    As partes elegem o foro da Comarca de Brasília-DF para dirimir quaisquer dúvidas ou controvérsias oriundas deste
    contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
  </div>

  <div class="local-data">Brasília-DF, ${formatarDataDeHoje()}.</div>

  <div class="assinaturas">
    <div class="bloco-assinatura">
      <div class="linha"></div>
      <div class="parte">Contratante</div>
      <div class="nome-doc">${escapeHtml(EMPRESA.razaoSocial)}</div>
      <div class="nome-doc">CNPJ ${escapeHtml(EMPRESA.cnpj)}</div>
    </div>
    <div class="bloco-assinatura">
      <div class="linha"></div>
      <div class="parte">Contratado(a)</div>
      <div class="nome-doc">${escapeHtml(contrato.prestador_nome)}</div>
      <div class="nome-doc">${rotuloDocumento} ${escapeHtml(documentoFormatado)}</div>
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

module.exports = { gerarHtmlProposta, gerarHtmlContrato, gerarFooterTemplate, EMPRESA, cabecalhoDataUri, codigoParaCliente };
