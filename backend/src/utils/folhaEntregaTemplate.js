// HTML da FOLHA DE ENTREGA do projeto (versão 2.1) — vira PDF A4 em
// pdfPuppeteer.js. É o "PDF" das entregas: identificação, lista dos arquivos
// entregues e o resumo técnico do cálculo da skill. O memorial em PDF não é
// gerado pelo sistema (não há conversor de Word para PDF instalado no
// projeto): sai pelo Word, em Arquivo › Salvar como › PDF.
// Tudo que vem do banco/formulário passa por escapeHtml.
const { cabecalhoDataUri, EMPRESA } = require('./pdfTemplate');
const { hojeBrasilia } = require('./dataHoje');

const { escapeHtml, formatarData: dataBr } = require('./htmlPdf');

// indicadores do resumo que são da inspeção (parecer, checklist): não entram na entrega do projeto
const DA_INSPECAO = /inspe[cç][aã]o|parecer|checklist|n[aã]o conformidade/i;

/**
 * { disciplina: nome, titulo, dados (formulário), arquivos: [{ nome, descricao }],
 *   resumo (resumir() da skill) | null, asBuilt: { data, revisao } | null, emitidoPor, notas: [texto] }
 */
function gerarHtmlFolhaEntrega({ disciplina, titulo, dados = {}, arquivos = [], resumo = null, asBuilt = null, emitidoPor = '', notas = [] }) {
  const cli = dados.cliente || {};
  const resp = dados.responsavel || {};
  const meta = dados.meta || {};
  const revisao = asBuilt ? (asBuilt.revisao || meta.revisao || '') : (meta.revisao || 'R00');
  const data = asBuilt ? asBuilt.data : (meta.data || hojeBrasilia());
  const kv = [
    ['Cliente', cli.nome], ['Obra / instalação', dados.obra?.nome || titulo], ['Disciplina', disciplina],
    ['Endereço', [cli.endereco, [cli.cidade, cli.uf].filter(Boolean).join('/')].filter(Boolean).join(' — ')],
    ['Responsável técnico', [resp.nome, resp.crea && `CREA ${resp.crea}`, resp.art && `ART ${resp.art}`].filter(Boolean).join(' — ')],
    ['Revisão / data', `${revisao || '—'} / ${dataBr(data)}`],
  ];
  const indicadores = (resumo?.indicadores || []).filter(i => !DA_INSPECAO.test(`${i.rotulo} ${i.detalhe || ''}`));
  const textos = (resumo?.textos || []);
  const tabelas = (resumo?.tabelas || []).filter(t => !DA_INSPECAO.test(t.titulo || ''));
  const temResumo = indicadores.length || textos.length || tabelas.length;

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Folha de entrega</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5px; color: #1a1a1a; margin: 0; }
  .cab img { width: 100%; display: block; }
  h1 { font-size: 17px; margin: 14px 0 2px; color: #1a1a1a; }
  h2 { font-size: 12.5px; margin: 16px 0 6px; color: #8a6d0b; border-bottom: 1px solid #c9a227; padding-bottom: 3px; }
  .sub { color: #595959; margin-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #d0d0d0; padding: 4px 6px; vertical-align: top; text-align: left; }
  th { background: #f3f3f3; font-size: 9.5px; text-transform: uppercase; }
  .kv td:first-child { width: 28%; background: #fafafa; font-weight: bold; }
  .asbuilt { border: 3px solid #c00000; color: #c00000; font-weight: bold; font-size: 18px; text-align: center; padding: 8px; margin: 10px 0; letter-spacing: 1px; }
  .asbuilt small { display: block; font-size: 10.5px; letter-spacing: 0; margin-top: 3px; }
  .ind { display: inline-block; width: 32%; margin: 0 1% 6px 0; border: 1px solid #e0e0e0; padding: 5px 7px; vertical-align: top; }
  .ind b { display: block; font-size: 12px; }
  .ind span { color: #666; font-size: 9px; text-transform: uppercase; }
  .nota { color: #555; font-size: 9.5px; margin-top: 10px; line-height: 1.5; }
  .conferir { color: #a35b00; }
</style></head><body>
  ${cabecalhoDataUri ? `<div class="cab"><img src="${cabecalhoDataUri}" alt=""></div>` : ''}
  <h1>Folha de entrega — Projeto de ${escapeHtml(disciplina)}</h1>
  <div class="sub">${escapeHtml(EMPRESA.razaoSocial)} · emitida em ${escapeHtml(new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }))}${emitidoPor ? ` por ${escapeHtml(emitidoPor)}` : ''}</div>
  ${asBuilt ? `<div class="asbuilt">AS BUILT<small>Documentação conforme executado — Rev. ${escapeHtml(asBuilt.revisao || '—')} — ${escapeHtml(dataBr(asBuilt.data))}</small></div>` : ''}
  <table class="kv">${kv.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v || '—')}</td></tr>`).join('')}</table>

  <h2>Arquivos entregues</h2>
  <table><tr><th style="width:45%">Arquivo</th><th>Conteúdo</th></tr>
    ${arquivos.map(a => `<tr><td>${escapeHtml(a.nome)}</td><td>${escapeHtml(a.descricao || '')}</td></tr>`).join('')}
  </table>

  ${temResumo ? `<h2>Resumo técnico do cálculo</h2>
  <div>${indicadores.map(i => `<div class="ind"><span>${escapeHtml(i.rotulo)}</span><b>${escapeHtml(i.valor)}</b>${i.detalhe ? escapeHtml(i.detalhe) : ''}</div>`).join('')}</div>
  ${textos.length ? `<ul>${textos.map(t => `<li class="${/\[CONFERIR/.test(t) ? 'conferir' : ''}">${escapeHtml(t)}</li>`).join('')}</ul>` : ''}
  ${tabelas.map(t => `<h2 style="font-size:11px">${escapeHtml(t.titulo)}</h2>
    <table><tr>${(t.colunas || []).map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr>
    ${(t.linhas || []).map(l => `<tr>${l.map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</table>`).join('')}`
    : '<p class="nota">O resumo técnico desta disciplina está no memorial descritivo e de cálculo.</p>'}

  ${notas.map(n => `<p class="nota">${escapeHtml(n)}</p>`).join('')}
  <p class="nota">Documentos resultado de cálculo com as premissas declaradas — revisar e assinar pelo responsável técnico habilitado antes da emissão.</p>
</body></html>`;
}

module.exports = { gerarHtmlFolhaEntrega };
