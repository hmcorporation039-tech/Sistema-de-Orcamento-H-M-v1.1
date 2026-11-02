// PDF da nota fiscal de serviço (versão 2.4) no layout da NFS-e impressa pelo
// ISSnet do DF (a mesma "Danfe" que o SYSB1 abre): cabeçalho do GDF com o
// número da nota, quadro do prestador com a logo da H&M (logo.png original, em
// resolução cheia — a do portal do ISS é uma miniatura de 102×70) e o QR Code,
// identificação, tomador, intermediário, descrição, detalhamento dos tributos e
// informações adicionais. Serve para a nota importada (SYSB1/ISSnet ou Emissor
// Nacional), a emitida e o rascunho (marca d'água). O documento fiscal é o XML;
// este PDF é a representação para o cliente.
const fs = require('fs');
const path = require('path');
const { escapeHtml, formatarMoeda } = require('./htmlPdf');
const { EMPRESA } = require('./pdfTemplate');

const e = escapeHtml;

function imagem(nome) {
  try {
    return `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '..', 'assets', nome)).toString('base64')}`;
  } catch {
    return null;
  }
}
const LOGO = imagem('logo.png');
const BRASAO = imagem(path.join('fiscal', 'brasao-df.png'));
const SELO = imagem(path.join('fiscal', 'nfse-selo.png'));

// o que o ISS DF imprime em "Informações Adicionais" para ME/EPP do Simples
const TEXTO_SIMPLES = 'I - "DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL"; e\n'
  + 'II - "NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI."\n'
  + 'PROCON: TEL 151- SETOR COMERCIAL SUL, QUADRA 8, BLOCO B-60, SALA 240- BRASILIA - DF';
const CONSULTA_ISS = 'https://iss.fazenda.df.gov.br/online/Login/Login.aspx';
const CONSULTA_NACIONAL = 'https://www.nfse.gov.br/consultapublica';

// ExigibilidadeISS do ABRASF 2.0x
const NATUREZA = { 1: 'Exigível', 2: 'Não incidência', 3: 'Isenção', 4: 'Exportação', 5: 'Imunidade', 6: 'Exigibilidade suspensa por decisão judicial', 7: 'Exigibilidade suspensa por processo administrativo' };
const UF_NOME = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará', DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás',
  MA: 'Maranhão', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná', PE: 'Pernambuco',
  PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins',
};

const fmtCnpjCpf = (d) => {
  const s = String(d || '').replace(/\D/g, '');
  if (s.length === 14) return s.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (s.length === 11) return s.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return s;
};
const fmtCep = (c) => { const s = String(c || '').replace(/\D/g, ''); return s.length === 8 ? `${s.slice(0, 5)}-${s.slice(5)}` : s; };
const fmtFone = (f) => {
  const s = String(f || '').replace(/\D/g, '');
  if (s.length === 10 || s.length === 11) return `(${s.slice(0, 2)})${s.slice(2, -4)}-${s.slice(-4)}`;
  return f || '';
};
const fmtCtribNac = (c) => (c && c.length === 6 ? `${c.slice(0, 2)}.${c.slice(2, 4)}.${c.slice(4)}` : c || '');
const fmtChave = (c) => String(c || '').replace(/(\d{5})(?=\d)/g, '$1 ');
const num2 = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function dataBR(v, comHora = false) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? `${v}T12:00:00-03:00` : v);
  if (Number.isNaN(d.getTime())) return String(v);
  const o = { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' };
  if (comHora) Object.assign(o, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return d.toLocaleString('pt-BR', o).replace(',', '');
}

// rótulo pequeno em cima, valor embaixo (as células do ISS)
const cel = (rotulo, valor, { classe = '', colspan = 1 } = {}) =>
  `<td class="${classe}"${colspan > 1 ? ` colspan="${colspan}"` : ''}><span class="r">${e(rotulo)}</span><span class="v">${valor}</span></td>`;
const titulo = (t) => `<div class="tit">${e(t)}</div>`;

function gerarHtmlNfse(nota, { empresa = {}, municipios = {}, qrcode = null } = {}) {
  const t = nota.tomador || {};
  const nacional = nota.padrao === 'nacional';
  const rascunho = nota.situacao === 'rascunho';
  const cancelada = nota.situacao === 'cancelada';
  const marca = rascunho ? 'RASCUNHO' : cancelada ? 'CANCELADA' : nota.situacao === 'substituida' ? 'SUBSTITUÍDA' : '';
  const municipio = (cod) => {
    const m = municipios[cod];
    return m ? `${m.nome} - ${UF_NOME[m.uf] || m.uf}` : (cod || '');
  };
  const munTomador = municipios[t.codigo_municipio];
  const retido = !!nota.iss_retido;
  const base = Number(nota.valor_servicos || 0) - Number(nota.valor_deducoes || 0) - Number(nota.desconto_incondicionado || 0);
  const itemLista = nota.item_lista ? String(Number(String(nota.item_lista).replace(/\D/g, ''))) : (nota.ctrib_nac ? String(Number(nota.ctrib_nac.slice(0, 4))) : '');
  const atividade = nacional || !nota.ctrib_mun
    ? [fmtCtribNac(nota.ctrib_nac), nota.servico_descricao].filter(Boolean).join(' - ')
    : [nota.ctrib_mun, nota.servico_descricao].filter(Boolean).join(' - ');
  // o ISS corta a descrição numa linha só
  const atividadeCurta = atividade.length > 78 ? `${atividade.slice(0, 75).trimEnd()}...` : atividade;
  const chave = nacional ? nota.chave_acesso : nota.chave_nacional;
  const consulta = nacional ? CONSULTA_NACIONAL : CONSULTA_ISS;
  const outras = nota.outras_informacoes || (empresa.op_simp_nac === 3 ? TEXTO_SIMPLES : '');
  const responsavel = retido ? (nota.responsavel_retencao === 2 ? 'Intermediário' : 'Tomador') : '';

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>NFS-e ${e(nota.numero || 'rascunho')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 8pt; margin: 0; }
  table { border-collapse: collapse; width: 100%; }
  .quadro { border: 1px solid #000; margin-top: 3px; page-break-inside: avoid; }
  .tit { font-weight: bold; font-size: 9.5pt; padding: 2px 5px; border-bottom: 1px solid #000; }
  .cab td { vertical-align: middle; }
  .cab .gdf b { font-size: 11pt; display: block; }
  .cab .gdf span { display: block; font-size: 8.5pt; color: #1d3f8f; margin-top: 1px; }
  .cab .gdf small { display: block; font-size: 7.5pt; margin-top: 1px; }
  .cab .nac b { font-size: 10pt; display: block; color: #1a4a8a; font-weight: 900; letter-spacing: .2px; }
  .cab .nac span { display: block; font-size: 8pt; color: #444; margin-top: 2px; }
  .cab .nac small { display: block; font-size: 7pt; color: #666; margin-top: 1px; }
  .serie { border-left: 1px solid #000; width: 40mm; text-align: center; vertical-align: top !important; }
  .serie .r { display: block; text-align: left; font-size: 6pt; padding: 1px 3px; }
  .serie .v { display: block; font-weight: bold; font-size: 8.5pt; padding: 0 3px 3px; }
  .serie .num { border-top: 1px solid #000; }
  .serie .num .v { font-size: 10pt; }
  .prest td { vertical-align: middle; }
  .prest .logo { width: 30mm; padding: 4px 6px; text-align: center; }
  .prest .logo img { width: 26mm; height: 26mm; object-fit: contain; display: block; margin: auto; }
  .prest .dados { padding: 4px 6px; font-size: 7.5pt; line-height: 1.35; }
  .prest .dados b { font-size: 9pt; display: block; }
  .prest .datas { width: 38mm; border-left: 1px solid #000; padding: 0; vertical-align: top !important; }
  .prest .datas div { border-bottom: 1px solid #000; text-align: center; }
  .prest .datas div:last-child { border-bottom: 0; }
  .prest .datas .r { display: block; text-align: left; font-size: 6pt; padding: 1px 3px 0; }
  .prest .datas .v { display: block; font-weight: bold; font-size: 9pt; padding: 0 3px 2px; }
  .prest .qr { width: 30mm; border-left: 1px solid #000; text-align: center; }
  .prest .qr img { width: 25mm; height: 25mm; display: block; margin: auto; }
  .prest .qr div { font-size: 7pt; color: #b00000; font-weight: bold; padding: 4px; }
  .grade td { border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 1px 4px 2px; vertical-align: top; }
  .grade tr:last-child td { border-bottom: 0; }
  .trib { table-layout: fixed; }
  .trib td { overflow: hidden; }
  .trib .v { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .grade td:last-child { border-right: 0; }
  .grade .r { display: block; font-size: 6pt; }
  .grade .v { display: block; font-size: 9pt; min-height: 11pt; }
  .grade .dir .v { text-align: right; }
  .grade .neg .v { font-weight: bold; }
  .grade .neg .r { font-weight: bold; }
  .toma { padding: 2px 5px 3px; font-size: 8pt; }
  .toma td { padding: 0 3px 0 0; border: 0; vertical-align: top; }
  .toma th { text-align: left; font-weight: bold; padding: 0 4px 0 0; white-space: nowrap; width: 1%; }
  .inter td { font-size: 6pt; font-weight: bold; padding: 2px 5px 9px; border: 0; }
  .desc { padding: 3px 5px; font-size: 8pt; min-height: 42mm; white-space: pre-wrap; line-height: 1.3; }
  .obra td { font-weight: bold; font-size: 8.5pt; padding: 2px 5px; border-top: 1px solid #000; border-right: 1px solid #000; }
  .obra td:last-child { border-right: 0; }
  .info { padding: 3px 5px 5px; font-size: 8.5pt; white-space: pre-wrap; line-height: 1.3; }
  .info .chave { color: #e00000; font-weight: bold; white-space: normal; margin-top: 6px; }
  .aviso { color: #e00000; font-weight: bold; font-size: 8.5pt; padding: 3px 5px; border-bottom: 1px solid #000; }
  .rodape { text-align: center; font-size: 7pt; margin-top: 3px; }
  .rodape b { text-decoration: underline; }
</style></head><body>

<div class="quadro"><table class="cab"><tr>
  <td style="width:15mm;padding:3px 4px 3px 8px">${BRASAO ? `<img src="${BRASAO}" style="width:11mm;display:block" alt="">` : ''}</td>
  ${nacional
    ? `<td class="nac" style="padding:4px 6px"><b>NOTA FISCAL DE SERVIÇOS ELETRÔNICA — NFS-e</b><span>Padrão Nacional — Emissor Nacional (nfse.gov.br)</span><small>Consulta pública: www.nfse.gov.br/consultapublica</small></td>`
    : `<td class="gdf"><b>Governo do Distrito Federal</b><span>Secretaria de Estado de Economia do Distrito Federal</span><small>Fone: () - 156 - Opção 3 - www.sefaz.df.gov.br</small></td>`
  }
  <td style="width:28mm;text-align:center">${SELO ? `<img src="${SELO}" style="width:24mm;display:block;margin:auto" alt="">` : ''}</td>
  <td class="serie">
    <span class="r">Série do Documento</span><span class="v">Nota Fiscal de Serviço Eletrônica - NFS-e</span>
    <div class="num"><span class="r">Número da Nota Fiscal</span><span class="v">${e(rascunho ? 'RASCUNHO' : nota.numero || '')}</span></div>
  </td>
</tr></table></div>

<div class="quadro">
  ${titulo('Dados do Prestador de Serviço')}
  <table class="prest"><tr>
    <td class="logo">${LOGO ? `<img src="${LOGO}" alt="${e(EMPRESA.razaoSocial)}">` : ''}</td>
    <td class="dados">
      <b>${e(EMPRESA.razaoSocial.toUpperCase())}</b><b>${e(EMPRESA.nomeFantasia.toUpperCase())}</b>
      ${e(EMPRESA.endereco)}<br>
      CEP ${e(EMPRESA.cep)} - Fone: ${e(EMPRESA.telefone)}<br>
      ${e(EMPRESA.email)}<br>
      Inscrição Municipal ${e(empresa.inscricao_municipal || '')} - CPF/CNPJ ${e(EMPRESA.cnpj)}
    </td>
    <td class="datas">
      <div><span class="r">Data de Geração da NFS-e</span><span class="v">${e(rascunho ? '—' : dataBR(nota.data_emissao, true))}</span></div>
      <div><span class="r">Data de Competência</span><span class="v">${e(dataBR(nota.competencia))}</span></div>
      <div><span class="r">Cód. de Autenticidade</span><span class="v">${e(nota.codigo_verificacao || (rascunho ? '—' : ''))}</span></div>
      <div><span class="r">Responsável pela Retenção</span><span class="v">${e(responsavel) || '&nbsp;'}</span></div>
    </td>
    <td class="qr">${qrcode ? `<img src="${qrcode}" alt="QR Code de consulta">` : `<div>${rascunho ? 'RASCUNHO<br>SEM VALOR FISCAL' : ''}</div>`}</td>
  </tr></table>
</div>
${cancelada ? `<div class="quadro"><div class="aviso" style="border:0">NFS-e CANCELADA${nota.motivo_cancelamento ? ` — ${e(nota.motivo_cancelamento)}` : ''}${nota.cancelada_em ? ` — Data de cancelamento: ${e(dataBR(nota.cancelada_em))}` : ''}</div></div>` : ''}

<div class="quadro">
  ${titulo('Identificação da Nota Fiscal Eletrônica')}
  <table class="grade">
    <tr>${cel('Natureza da Operação', e(NATUREZA[nota.exigibilidade_iss || 1]))}${cel(nacional ? 'Número da DPS' : 'Número do RPS', e(nota.numero_dps || ''))}${cel(nacional ? 'Série da DPS' : 'Série do RPS', e(nota.serie_dps || ''))}${cel(nacional ? 'Data de Emissão da DPS' : 'Data de Emissão do RPS', e(rascunho ? '' : dataBR(nota.data_emissao)))}</tr>
    <tr>${cel('Local dos Serviços', e(municipio(nota.codigo_municipio_prestacao)), { colspan: 2 })}${cel('Município Incidência', e(municipio(nota.municipio_incidencia || nota.codigo_municipio_prestacao)), { colspan: 2 })}</tr>
  </table>
</div>

<div class="quadro">
  ${titulo('Dados do Tomador de Serviços')}
  <div class="toma"><table>
    <tr><th>CNPJ/CPF :</th><td style="width:45%">${e(fmtCnpjCpf(t.documento))}</td><th>IM :</th><td>${e(t.inscricao_municipal || '')}</td></tr>
    <tr><th>Razão Social :</th><td colspan="3">${e(t.nome || '')}</td></tr>
    <tr><th>Endereço :</th><td>${e(t.logradouro || '')}</td><th>Número :</th><td>${e(t.numero || '')}</td></tr>
    <tr><th>Complemento :</th><td>${e(t.complemento || '')}</td><th>Bairro :</th><td>${e(t.bairro || '')}</td></tr>
    <tr><th>CEP :</th><td>${e(fmtCep(t.cep))}</td><th>Cidade/UF :</th><td>${e(munTomador ? `${munTomador.nome}/ ${munTomador.uf}` : t.uf || '')}</td></tr>
    <tr><th>Telefone :</th><td>${e(fmtFone(t.telefone))}</td><th>E-mail :</th><td>${e(t.email || '')}</td></tr>
  </table></div>
</div>

<div class="quadro">
  ${titulo('Dados do Intermediário de Serviços')}
  <table class="inter"><tr><td style="width:33%">CNPJ/CPF</td><td style="width:33%">Inscrição Municipal</td><td>Razão Social</td></tr></table>
</div>

<div class="quadro">
  ${titulo('Descrição dos Serviços')}
  <div class="desc">${e(nota.discriminacao || '')}</div>
</div>

<div class="quadro">
  ${titulo('Detalhamento dos Tributos')}
  <table class="grade trib">
    <tr>${cel(nacional ? 'Código de Tributação Nacional' : 'Atividade do Município', e(atividadeCurta), { colspan: 3 })}${cel('Alíquota', `<b>${e(nota.aliquota_iss == null ? '' : num2(nota.aliquota_iss))}</b>`, { classe: 'dir' })}${cel('Item da LC116/2003', e(itemLista))}${cel('Cód. NBS', e(nota.nbs || ''))}${cel('Cód. CNAE', e(nota.cnae || ''), { colspan: 2 })}</tr>
    <tr>${cel('Vl. Total dos Serviços', e(formatarMoeda(nota.valor_servicos)), { classe: 'dir neg' })}${cel('Desconto Incondicionado', e(formatarMoeda(nota.desconto_incondicionado)), { classe: 'dir' })}${cel('Deduções Base Cálculo', e(formatarMoeda(nota.valor_deducoes)), { classe: 'dir' })}${cel('Base de Cálculo', e(formatarMoeda(base)), { classe: 'dir', colspan: 2 })}${cel('Total do ISSQN', e(formatarMoeda(retido ? 0 : nota.valor_iss)), { classe: 'dir' })}${cel('ISSQN Retido', retido ? 'Sim' : 'Não')}${cel('Desconto Condicionado', e(formatarMoeda(nota.desconto_condicionado)), { classe: 'dir' })}</tr>
    <tr>${cel('PIS', e(formatarMoeda(nota.valor_pis)), { classe: 'dir' })}${cel('COFINS', e(formatarMoeda(nota.valor_cofins)), { classe: 'dir' })}${cel('INSS', e(formatarMoeda(nota.valor_inss)), { classe: 'dir' })}${cel('IRRF', e(formatarMoeda(nota.valor_ir)), { classe: 'dir' })}${cel('CSLL', e(formatarMoeda(nota.valor_csll)), { classe: 'dir' })}${cel('Outras Retenções', e(formatarMoeda(nota.outras_retencoes)), { classe: 'dir' })}${cel('Vl. ISSQN Retido', e(formatarMoeda(retido ? nota.valor_iss : 0)), { classe: 'dir' })}${cel('Vl. Líquido da Nota Fiscal', e(formatarMoeda(nota.valor_liquido)), { classe: 'dir neg' })}</tr>
  </table>
  <table class="obra"><tr><td style="width:35%">Construção Civil</td><td style="width:35%">Cód. Obra :</td><td>Art. :</td></tr></table>
</div>

<div class="quadro">
  ${titulo('Informações Adicionais')}
  <div class="info">${[nota.observacoes, outras].filter(Boolean).map(e).join('\n\n')}${chave ? `<div class="chave">Chave de acesso no Ambiente de Dados Nacional: ${e(nacional ? fmtChave(chave) : chave)}.</div>` : ''}${rascunho ? '<div class="chave">RASCUNHO — sem valor fiscal. A nota vale depois de emitida, com número e código de autenticidade.</div>' : ''}</div>
</div>

<div class="rodape">Consulte a autenticidade deste documento acessando o site: <b>${e(consulta)}</b></div>
</body></html>`;
}

module.exports = { gerarHtmlNfse, fmtChave, fmtCnpjCpf };
