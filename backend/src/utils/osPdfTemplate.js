// HTML do RELATÓRIO DA ORDEM DE SERVIÇO (versão 2.0, Fase 4J) — vira PDF A4
// em pdfPuppeteer.js. Tudo que vem do banco ou do aparelho passa por
// escapeHtml. As fotos chegam como data: URI (o navegador do PDF não acessa
// nada além de data:) e são mostradas reduzidas pelo CSS; quem chama só
// embute as de até 1,5 MB (as maiores aparecem listadas, sem a imagem).
const { htmlBanner, EMPRESA } = require('./pdfTemplate');
const C = require('./campo');

const { escapeHtml, formatarData: dataCurta } = require('./htmlPdf');

const TZ = 'America/Sao_Paulo';
const dataHora = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' }) : '—';
};
const coord = (p) => (p ? `${Number(p.lat).toFixed(6)}, ${Number(p.lon).toFixed(6)}` : '');
const quebras = (s) => escapeHtml(s).replace(/\n/g, '<br/>');

const COR_RESPOSTA = { conforme: '#1f7a3a', nao_conforme: '#b02a2a', na: '#666' };

/**
 * { os: objeto de utils/campo.osParaApi (com historico), imagens: Map(uuid → data URI | null),
 *   assinaturaUri: data URI | null, emitidoPor }
 */
function gerarHtmlOS({ os, imagens = new Map(), assinaturaUri = null, emitidoPor = '' }) {
  const grupos = [];
  for (const item of os.checklist) {
    let g = grupos.find(x => x.nome === item.grupo);
    if (!g) { g = { nome: item.grupo, itens: [] }; grupos.push(g); }
    g.itens.push(item);
  }
  const ncs = os.checklist.filter(i => i.resposta === 'nao_conforme');
  const r = os.resumo;

  const linhasChecklist = grupos.map(g => `
    <tr class="grupo"><td colspan="3">${escapeHtml(g.nome)}</td></tr>
    ${g.itens.map(i => `
    <tr class="${i.resposta === 'nao_conforme' ? 'nc' : ''}">
      <td class="cod">${escapeHtml(i.id)}</td>
      <td>${escapeHtml(i.texto)}${i.extra ? ' <span class="extra">(item extra)</span>' : ''}
        ${i.observacao ? `<div class="obs">${quebras(i.observacao)}</div>` : ''}
        ${i.fotos.length ? `<div class="obs">Fotos: ${i.fotos.map(u => escapeHtml(numeroFoto(os, u))).join(', ')}</div>` : ''}</td>
      <td class="resp" style="color:${COR_RESPOSTA[i.resposta] || '#999'}">${i.resposta ? escapeHtml(C.ROTULO_RESPOSTA[i.resposta]) : 'Sem resposta'}
        ${i.respondido_em ? `<div class="quando">${escapeHtml(dataHora(i.respondido_em))}</div>` : ''}</td>
    </tr>`).join('')}`).join('');

  const blocoNcs = ncs.length ? `
    <div class="ncs">
      <div class="ncs-tit">Não conformidades (${ncs.length})</div>
      <ol>${ncs.map(i => `<li><b>${escapeHtml(i.id)}</b> — ${escapeHtml(i.texto)}${i.observacao ? `<br/><span>${quebras(i.observacao)}</span>` : ''}</li>`).join('')}</ol>
    </div>` : '';

  const fotos = os.fotos.map((f, idx) => {
    const uri = imagens.get(f.uuid);
    const item = f.item_id ? os.checklist.find(i => i.id === f.item_id) : null;
    const legenda = [`Foto ${idx + 1}`, item ? `item ${item.id}` : '', f.legenda].filter(Boolean).join(' — ');
    return `
      <div class="foto">
        ${uri ? `<img src="${uri}" alt=""/>` : '<div class="semfoto">imagem grande demais para o relatório — está na pasta da obra (Campo)</div>'}
        <div class="leg">${escapeHtml(legenda)}</div>
        <div class="quando">${escapeHtml(dataHora(f.tirada_em))}${f.lat != null ? ` · ${escapeHtml(coord(f))}` : ''}</div>
      </div>`;
  }).join('');

  const a = os.assinatura;
  const blocoAssinatura = a ? `
    <div class="assin">
      ${assinaturaUri ? `<img src="${assinaturaUri}" alt="Assinatura"/>` : ''}
      <div class="linha">${escapeHtml(a.nome)}${a.documento ? ` — ${escapeHtml(a.documento)}` : ''}</div>
      <div class="quando">Assinado no aparelho em ${escapeHtml(dataHora(a.assinada_em))}</div>
    </div>` : '<div class="assin vazio">Sem assinatura do cliente.</div>';

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(os.numero)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #222; margin: 0; }
  .banner { width: 100%; display: block; margin-bottom: 8px; } /* papel timbrado: banner inteiro, como na proposta */
  h1 { font-size: 16px; margin: 4px 0 2px; color: #1f1f1f; }
  .sub { color: #666; margin-bottom: 4px; }
  .faixa { height: 3px; background: #c9a227; margin: 6px 0 10px; }
  .info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px 14px; margin-bottom: 10px; }
  .info .r { font-size: 8px; text-transform: uppercase; color: #888; letter-spacing: .4px; }
  .info .v { font-weight: bold; }
  .bloco { margin: 8px 0; }
  .bloco .r { font-size: 8px; text-transform: uppercase; color: #888; letter-spacing: .4px; margin-bottom: 2px; }
  .cartoes { display: flex; gap: 8px; margin: 8px 0 10px; }
  .cartao { flex: 1; border: 1px solid #e0e0e0; border-left: 4px solid #c9a227; padding: 5px 8px; }
  .cartao .r { font-size: 8px; color: #888; text-transform: uppercase; }
  .cartao .v { font-size: 13px; font-weight: bold; }
  .cartao.nc { border-left-color: #b02a2a; }
  .ncs { border: 2px solid #b02a2a; background: #fff3f3; padding: 6px 10px; margin: 8px 0 10px; page-break-inside: avoid; }
  .ncs-tit { color: #b02a2a; font-weight: bold; font-size: 11px; margin-bottom: 4px; }
  .ncs ol { margin: 0 0 0 16px; padding: 0; }
  .ncs li { margin-bottom: 3px; }
  .ncs span { color: #555; }
  h2 { font-size: 12px; margin: 14px 0 6px; color: #1f1f1f; border-bottom: 1px solid #c9a227; padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; }
  td { border-bottom: 1px solid #e3e3e3; padding: 4px; vertical-align: top; }
  tr { page-break-inside: avoid; }
  tr.grupo td { background: #1f1f1f; color: #fff; font-weight: bold; font-size: 9px; padding: 4px 6px; }
  tr.nc td { background: #fff3f3; }
  td.cod { width: 34px; color: #888; white-space: nowrap; }
  td.resp { width: 92px; font-weight: bold; text-align: right; }
  .obs { color: #555; margin-top: 2px; font-style: italic; }
  .extra { color: #888; font-size: 8px; }
  .quando { color: #888; font-size: 8px; font-weight: normal; }
  .fotos { display: flex; flex-wrap: wrap; gap: 8px; }
  .foto { width: 31.5%; border: 1px solid #e0e0e0; padding: 4px; page-break-inside: avoid; }
  .foto img { display: block; max-width: 100%; max-height: 62mm; margin: 0 auto; object-fit: contain; }
  .semfoto { height: 30mm; display: flex; align-items: center; justify-content: center; text-align: center; color: #888; background: #f6f6f6; padding: 6px; }
  .leg { margin-top: 3px; font-weight: bold; }
  .assin { margin-top: 10px; width: 60%; page-break-inside: avoid; }
  .assin img { display: block; max-width: 100%; max-height: 35mm; }
  .assin .linha { border-top: 1px solid #444; padding-top: 3px; font-weight: bold; }
  .assin.vazio { color: #888; }
  .nota { color: #888; font-size: 8px; margin-top: 12px; }
</style></head>
<body>
  ${htmlBanner()}
  <h1>Ordem de Serviço ${escapeHtml(os.numero)}</h1>
  <div class="sub">${escapeHtml(os.titulo)}</div>
  <div class="faixa"></div>
  <div class="info">
    <div><div class="r">Obra</div><div class="v">${escapeHtml(os.obra.codigo)} — ${escapeHtml(os.obra.nome)}</div></div>
    <div><div class="r">Cliente</div><div class="v">${escapeHtml(os.obra.cliente_nome) || '—'}</div></div>
    <div><div class="r">Local</div><div class="v">${escapeHtml(os.obra.endereco) || '—'}</div></div>
    <div><div class="r">Tipo</div><div class="v">${escapeHtml(C.ROTULO_TIPO_OS[os.tipo] || os.tipo)}</div></div>
    <div><div class="r">Status</div><div class="v">${escapeHtml(C.ROTULO_STATUS_OS[os.status] || os.status)}</div></div>
    <div><div class="r">Responsável</div><div class="v">${escapeHtml(os.responsavel_nome) || '—'}</div></div>
    <div><div class="r">Agendada para</div><div class="v">${escapeHtml(dataCurta(os.agendada_para))}</div></div>
    <div><div class="r">Iniciada em</div><div class="v">${escapeHtml(dataHora(os.iniciada_em))}${os.inicio ? `<div class="quando">${escapeHtml(coord(os.inicio))}</div>` : ''}</div></div>
    <div><div class="r">Concluída em</div><div class="v">${escapeHtml(dataHora(os.concluida_em))}${os.conclusao ? `<div class="quando">${escapeHtml(coord(os.conclusao))}</div>` : ''}</div></div>
  </div>
  ${os.descricao ? `<div class="bloco"><div class="r">Descrição</div><div>${quebras(os.descricao)}</div></div>` : ''}

  ${os.checklist.length ? `
  <div class="cartoes">
    <div class="cartao"><div class="r">Itens respondidos</div><div class="v">${r.respondidos} de ${r.total}</div></div>
    <div class="cartao"><div class="r">Conformes</div><div class="v">${r.conforme}</div></div>
    <div class="cartao nc"><div class="r">Não conformes</div><div class="v">${r.nao_conforme}</div></div>
    <div class="cartao"><div class="r">Não se aplica</div><div class="v">${r.na}</div></div>
  </div>` : ''}
  ${blocoNcs}

  ${os.checklist.length ? `<h2>Checklist</h2><table>${linhasChecklist}</table>` : ''}

  ${os.observacao_final ? `<h2>Observação final</h2><div>${quebras(os.observacao_final)}</div>` : ''}

  ${os.fotos.length ? `<h2>Fotos (${os.fotos.length})</h2><div class="fotos">${fotos}</div>` : ''}

  <h2>Assinatura do cliente</h2>
  ${blocoAssinatura}

  <div class="nota">Relatório gerado em ${escapeHtml(dataHora(new Date()))}${emitidoPor ? ` por ${escapeHtml(emitidoPor)}` : ''} · ${escapeHtml(EMPRESA.razaoSocial)}.
  Horários e posições registrados pelo aparelho do técnico; assinatura eletrônica simples colhida na tela do aparelho.</div>
</body></html>`;
}

function numeroFoto(os, uuid) {
  const i = os.fotos.findIndex(f => f.uuid === uuid);
  return i >= 0 ? `Foto ${i + 1}` : 'foto';
}

module.exports = { gerarHtmlOS };
