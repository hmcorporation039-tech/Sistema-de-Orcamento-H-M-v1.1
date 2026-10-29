// Dados da H&M Engenharia e Tecnologia — FONTE ÚNICA do papel timbrado de
// todos os documentos que o sistema emite: PDF do backend (proposta, contrato,
// relatórios, OS, boletim de medição, folha de entrega), Word das skills
// (memorial, laudo, checklist) e Excel (planilhas das skills e do backend).
// Antes razão social, endereço e contatos estavam repetidos em vários
// arquivos; mudou endereço/telefone/e-mail, muda só aqui.
//
// Sem dependências: as skills são a camada de baixo e rodam também fora do
// backend (pelo Claude Code). O backend chega aqui por config/caminhos.js (COMUM).

const EMPRESA = Object.freeze({
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
});

// As 3 linhas do rodapé da proposta (o padrão do papel timbrado):
//   razão social / endereço, CEP / telefone · e-mail
// { cnpj: true } acrescenta o CNPJ na primeira linha (Word e Excel); o PDF da
// proposta segue sem ele, como sempre saiu.
function linhasRodape({ cnpj = false } = {}) {
  return [
    cnpj ? `${EMPRESA.razaoSocial} · CNPJ ${EMPRESA.cnpj}` : EMPRESA.razaoSocial,
    `${EMPRESA.endereco}, CEP ${EMPRESA.cep}`,
    `${EMPRESA.telefone} · ${EMPRESA.email}`,
  ];
}

// ── Excel: papel timbrado na impressão ─────────────────────────────────────
// Cabeçalho/rodapé de impressão de uma aba (ExcelJS, sem precisar importá-lo):
//   cabeçalho: razão social à esquerda, título do documento à direita (o centro
//              fica livre — é onde a entrega as-built carimba "AS BUILT");
//   rodapé:    as linhas da empresa no centro, "Página X de Y" à direita.
// Códigos do Excel: &L/&C/&R seções, &P página, &N total, &"fonte,estilo",
// &<n> tamanho, && = "&" literal. O Excel limita cada um a 255 caracteres.
const LIMITE_EXCEL = 255;
const textoExcel = (s) => String(s ?? '').replace(/&/g, '&&').replace(/[\r\n]+/g, ' ');

function cabecalhoExcel(titulo) {
  const esquerda = `&L&"Arial,Bold"&9 ${textoExcel(EMPRESA.razaoSocial)}`;
  let t = String(titulo ?? '').replace(/[\r\n]+/g, ' ').trim();
  if (!t) return esquerda;
  const max = LIMITE_EXCEL - esquerda.length - '&R&"Arial"&8 '.length;
  // corta o texto ANTES de escapar (não parte um "&&" ao meio)
  while (textoExcel(t).length > max) t = `${t.slice(0, -2)}…`;
  return `${esquerda}&R&"Arial"&8 ${textoExcel(t)}`;
}

function rodapeExcel() {
  const pagina = '&R&"Arial"&7 Página &P de &N';
  const completo = `&C&"Arial"&7 ${linhasRodape({ cnpj: true }).map(textoExcel).join('\n')}${pagina}`;
  if (completo.length <= LIMITE_EXCEL) return completo;
  return `&C&"Arial"&7 ${linhasRodape().map(textoExcel).join('\n')}${pagina}`;
}

// Timbra uma aba (chamar ao gerar a planilha, antes de qualquer carimbo como
// o "AS BUILT", que depois entra no centro do cabeçalho preservando a empresa
// e o título). Mantém os demais campos de headerFooter; não toca em células
// nem fórmulas.
function timbrarPlanilha(ws, titulo = '') {
  const hf = ws.headerFooter || {};
  ws.headerFooter = { ...hf, oddHeader: cabecalhoExcel(titulo), oddFooter: rodapeExcel() };
  return ws;
}

// Todas as abas da pasta de trabalho (chamar depois de criar as abas). No
// cabeçalho vai "título — nome da aba" (ou só o nome da aba, sem título).
function timbrarPastaDeTrabalho(wb, titulo = '') {
  wb.eachSheet((ws) => timbrarPlanilha(ws, [titulo, ws.name].filter(Boolean).join(' — ')));
  return wb;
}

module.exports = { EMPRESA, linhasRodape, timbrarPlanilha, timbrarPastaDeTrabalho, cabecalhoExcel, rodapeExcel };
