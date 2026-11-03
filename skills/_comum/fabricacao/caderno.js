// Caderno de fabricação e montagem (PDF) — módulo comum a tudo o que a H&M
// projeta e manda fabricar/montar: quadros (NBR IEC 61439), racks de rede e de
// CFTV, caixas. Pedido do usuário de 31/10/2026: todo conjunto projetado sai
// com um PDF com o layout, os componentes e fabricantes, os barramentos e todos
// os materiais "da caixa até os parafusos", as plaquetas de cada comando e a
// plaqueta da H&M, conforme a norma do produto.
//
// Contrato (scratchpad CONTRATO-CADERNO.md, resumido aqui): a skill monta o
// objeto `caderno` e chama gerarCadernoHtml / gerarCadernoPdf:
//   { tipo, sigla, titulo, subtitulo, tag, revisao, data, dados,
//     normas[{codigo,titulo,aplicacao}], caracteristicas[[k,v]],
//     desenhos[{titulo, svg, escala '1:N' | omitido (automática), semEscala?, orientacao?, notas[], legenda?[[tag,desc]]}],
//     componentes[{tag,descricao,fabricante,referencia,medidas,quantidade,unidade,local,fonte}],
//     barramentos[{barra,material,secao,comprimento_mm,quantidade,capacidade_A,icw_kA,isoladores,fixacao}],
//     materiais_montagem[{grupo,descricao,especificacao,quantidade,unidade,regra}],
//     plaquetas[{tag,texto[],largura_mm,altura_mm,material,fundo,letra,fixacao,local,quantidade, grupo?, forma?, desenhar?}],
//     plaqueta_hm{modelo,numero_serie,dados[[k,v]],largura_mm,altura_mm,material,fixacao, local?},
//     secoes[{titulo,paragrafos[],tabela{colunas,linhas,proporcoes},marcadores?[],paisagem?}],
//     verificacoes[{item,criterio,norma}], avisos[] }
// Extensões compatíveis (opcionais): desenho.semEscala/orientacao/legenda;
// plaqueta.grupo/forma/desenhar (desenhar:false = só na lista, ex. etiquetas
// internas); secao.marcadores/paisagem; plaqueta_hm.local/subtitulo.
//
// O HTML é autossuficiente (timbrado e logo em data URI, sem fonte externa):
// abre sem rede e o PDF sai igual em qualquer PC. Todo texto passa por escape.

const fs = require('fs');
const path = require('path');
const { EMPRESA, linhasRodape } = require('../empresa');
const { escapeHtml } = require('./svg');
const { htmlFolhaPlaquetas } = require('./plaquetas');
const { htmlParaPdf } = require('./pdf');

const e = escapeHtml;

// Página A4 e margens (mm): o rodapé leva o carimbo em toda página
const MARGEM = { topo: 10, base: 25, lado: 10 };
const PAGINA = { retrato: [210, 297], paisagem: [297, 210] };
// área do desenho: página menos margens, título (14 mm) e uma reserva para as notas
const AREA_DESENHO = {
  retrato: [210 - 2 * MARGEM.lado, 297 - MARGEM.topo - MARGEM.base - 16],
  paisagem: [297 - 2 * MARGEM.lado, 210 - MARGEM.topo - MARGEM.base - 16],
};
// escalas normalizadas (NBR 8196) + 1:15 e 1:25, usuais nos desenhos de quadro
const ESCALAS = [1, 2, 5, 10, 15, 20, 25, 50, 75, 100, 200];

function imagemDataUri(nome) {
  try {
    return `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '..', 'assets', nome)).toString('base64')}`;
  } catch {
    return '';
  }
}
let imagens = null;
const img = () => (imagens ||= { banner: imagemDataUri('cabecalho.png'), logo: imagemDataUri('logo-pequeno.png') });

// altura aproximada (mm) das notas (7,4 pt: ≈ 1,55 mm por caractere, 4,1 mm por linha) e da
// legenda compacta (2 colunas quando há largura) numa coluna de largura larguraMm
function alturaNotas(notas = [], larguraMm = 190) {
  const porLinha = Math.max(20, Math.floor(larguraMm / 1.55));
  return (notas || []).reduce((s, t) => s + Math.ceil(String(t).length / porLinha) * 4.1, 0) + (notas && notas.length ? 4 : 0);
}
function alturaLegenda(n = 0, larguraMm = 190) {
  if (!n) return 0;
  return Math.ceil(n / (larguraMm >= 150 ? 2 : 1)) * 3.9 + 4;
}
const LADO_MM = 62; // coluna de notas/legenda ao lado do desenho (desenho estreito em página larga)

// Arranjos possíveis da página do desenho: notas embaixo ou ao lado, retrato ou paisagem
function arranjos(notas, legenda, orientacao) {
  const out = [];
  for (const o of (orientacao ? [orientacao] : ['retrato', 'paisagem'])) {
    const [w, h0] = AREA_DESENHO[o];
    out.push({ orientacao: o, lado: false, w, h: h0 - alturaNotas(notas, w) - alturaLegenda(legenda, w) });
    if ((notas.length || legenda) && alturaNotas(notas, LADO_MM) + alturaLegenda(legenda, LADO_MM) <= h0) out.push({ orientacao: o, lado: true, w: w - LADO_MM - 4, h: h0 });
  }
  return out;
}

// Escala normalizada que faz o desenho (L × A em mm do mundo) caber na página. A escala
// preferida (a que a skill usou para os textos) vale se couber em algum arranjo; senão fica a
// MAIOR escala possível (empate: notas embaixo, retrato).
function escolherEscala(L, A, { notas = [], legenda = 0, legendaLinhas = 0, orientacao = null, preferida = null } = {}) {
  const arr = arranjos(notas || [], legenda || legendaLinhas || 0, orientacao);
  const cabe = (a, n) => L / n <= a.w + 1e-6 && A / n <= a.h + 1e-6;
  if (preferida) {
    const a = arr.find(x => cabe(x, preferida));
    if (a) return { ...a, esc: preferida };
  }
  const opcoes = arr.map(a => ({ ...a, esc: ESCALAS.find(n => cabe(a, n)) || Math.max(L / a.w, A / Math.max(20, a.h)) }));
  opcoes.sort((a, b) => a.esc - b.esc || (a.lado - b.lado) || (a.orientacao === 'retrato' ? -1 : 1));
  return opcoes[0];
}

const fmtEscala = (n) => `1:${String(Math.round(n * 10) / 10).replace('.', ',')}`;
const numero = (v, casas = 0) => (v == null || v === '' ? '—' : (typeof v === 'number' ? v.toLocaleString('pt-BR', { maximumFractionDigits: casas }) : String(v)));

// <svg viewBox="0 0 L A"> → mesmo svg com largura/altura físicas na escala 1:n
function svgNaEscala(svg, n) {
  const m = String(svg).match(/viewBox="\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)\s*"/);
  if (!m) return { svg, L: 0, A: 0 };
  const L = Number(m[3]), A = Number(m[4]);
  const raiz = String(svg).replace(/^<svg\b([^>]*)>/, (tudo, attrs) => `<svg${attrs.replace(/\s(width|height)="[^"]*"/g, '')} width="${(L / n).toFixed(2)}mm" height="${(A / n).toFixed(2)}mm">`);
  return { svg: raiz, L, A };
}

function tabelaHtml({ colunas = [], linhas = [], proporcoes = null, classe = '' }) {
  const total = proporcoes ? proporcoes.reduce((s, v) => s + v, 0) : 0;
  const col = proporcoes ? `<colgroup>${proporcoes.map(p => `<col style="width:${((p / total) * 100).toFixed(2)}%"/>`).join('')}</colgroup>` : '';
  return `<table class="${e(classe)}">${col}<thead><tr>${colunas.map(c => `<th>${e(c)}</th>`).join('')}</tr></thead><tbody>${
    linhas.map(l => (l && l.grupo ? `<tr class="grupo"><td colspan="${colunas.length}">${e(l.grupo)}</td></tr>` : `<tr>${(l || []).map(v => `<td>${e(v == null ? '—' : v)}</td>`).join('')}</tr>`)).join('')}</tbody></table>`;
}

const kv = (pares) => `<table class="kv"><tbody>${pares.filter(p => p && p[0]).map(([k, v]) => `<tr><th>${e(k)}</th><td>${e(v == null || v === '' ? '—' : v)}</td></tr>`).join('')}</tbody></table>`;

// 'AAAA-MM-DD' → 'DD/MM/AAAA' (pacote comum, base/formato.js)
const { dataIsoBr: dataBr } = require('../base/formato');

const CSS = `
@page { size: A4; margin: ${MARGEM.topo}mm ${MARGEM.lado}mm ${MARGEM.base}mm ${MARGEM.lado}mm; }
@page paisagem { size: A4 landscape; margin: ${MARGEM.topo}mm ${MARGEM.lado}mm ${MARGEM.base}mm ${MARGEM.lado}mm; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; background: #fff; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 8.6pt; color: #151515; line-height: 1.35; }
.pagina { break-before: page; }
.paisagem { page: paisagem; }
h1 { font-size: 20pt; margin: 0 0 4mm; letter-spacing: .3px; }
h2 { font-size: 12.5pt; margin: 0 0 3mm; padding-bottom: 1.2mm; border-bottom: 0.6mm solid #b8902a; color: #111; }
h3 { font-size: 10pt; margin: 4mm 0 2mm; color: #4a3b10; break-after: avoid; }
h2 { break-after: avoid; }
.segue { margin-top: 8mm; }
p { margin: 0 0 2mm; }
table { width: 100%; border-collapse: collapse; margin: 0 0 3mm; font-size: 7.4pt; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th, td { border: 0.2mm solid #9a9a9a; padding: 0.9mm 1.3mm; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
thead th { background: #1c1c1c; color: #f1d27a; font-weight: bold; }
tr.grupo td { background: #f3ead2; font-weight: bold; color: #3d2f08; }
table.kv th { width: 34%; background: #f4f1e8; color: #222; font-weight: bold; }
.capa { position: relative; min-height: 255mm; }
.capa .banner { width: 100%; display: block; margin-bottom: 8mm; }
.capa .sigla { display: inline-block; background: #1c1c1c; color: #f1d27a; padding: 1mm 3mm; font-weight: bold; font-size: 9pt; margin-bottom: 3mm; }
.capa .subtitulo { font-size: 13pt; color: #333; margin: 0 0 7mm; }
.capa .conteudo { margin-top: 6mm; columns: 2; column-gap: 8mm; font-size: 8.4pt; }
.capa .conteudo ol { margin: 0; padding-left: 5mm; }
.capa .nota { position: absolute; bottom: 0; left: 0; right: 0; font-size: 7.6pt; color: #555; border-top: 0.3mm solid #ccc; padding-top: 2mm; }
.dz-cab { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 0.6mm solid #b8902a; margin-bottom: 2.5mm; }
.dz-cab h2 { border: 0; margin: 0; padding: 0 0 1mm; }
.dz-cab .esc { font-weight: bold; font-size: 9.5pt; color: #4a3b10; white-space: nowrap; }
.dz-area { display: flex; justify-content: center; align-items: flex-start; }
.dz-area svg { display: block; }
ol.notas { margin: 2mm 0 0; padding-left: 5mm; font-size: 7.4pt; color: #222; }
ol.notas li { margin-bottom: 0.6mm; }
.dz-lado { display: flex; gap: 4mm; align-items: flex-start; }
.dz-lado .dz-area { flex: 1; }
.dz-col { width: ${LADO_MM}mm; flex: none; }
.legenda { font-size: 7pt; margin: 2mm 0 0; line-height: 1.3; }
.legenda.duas { columns: 2; column-gap: 6mm; }
.legenda div { break-inside: avoid; margin-bottom: 0.5mm; }
ul.marcadores { margin: 0 0 3mm; padding-left: 5mm; }
ul.marcadores li { margin-bottom: 0.8mm; }
.pl-grade { display: flex; flex-wrap: wrap; gap: 5mm 6mm; align-items: flex-start; margin-bottom: 3mm; }
.pl-cartao { margin: 0; break-inside: avoid; }
.pl-cartao svg { display: block; }
.pl-cartao figcaption { font-size: 6.6pt; color: #333; margin-top: 1mm; max-width: 70mm; line-height: 1.25; }
.escala-aviso { font-size: 7.6pt; color: #6a4f00; background: #fbf4dc; border: 0.2mm solid #e2cf8e; padding: 1.2mm 2mm; margin-bottom: 3mm; }
.avisos li { color: #5a3b00; }
td.ok { width: 12mm; text-align: center; }
`;

// Carimbo do rodapé (toda página): H&M, título, tag, sigla, revisão, data e folha n/N.
// Template do Chromium: estilos inline, tamanhos em px, imagens só em data URI.
function carimboRodape(caderno) {
  const { logo } = img();
  const td = 'border:0.6px solid #555;padding:2px 4px;vertical-align:middle;';
  const rot = (t) => `<div style="font-size:5.5px;color:#666;text-transform:uppercase;letter-spacing:.3px">${e(t)}</div>`;
  const cel = (titulo, valor, largura) => `<td style="${td}width:${largura}">${rot(titulo)}<div style="font-weight:bold">${valor}</div></td>`;
  return `<div style="width:100%;padding:0 ${MARGEM.lado}mm;font-family:Arial,Helvetica,sans-serif;font-size:7.5px;color:#111;-webkit-print-color-adjust:exact">
  <table style="width:100%;border-collapse:collapse;table-layout:fixed">
    <tr>
      <td style="${td}width:30px;text-align:center">${logo ? `<img src="${logo}" style="height:24px;width:24px"/>` : ''}</td>
      <td style="${td}">${rot(EMPRESA.nomeFantasia)}<div style="font-weight:bold">${e(caderno.titulo || 'CADERNO DE FABRICAÇÃO E MONTAGEM')}</div><div style="font-size:6.5px">${e(caderno.subtitulo || '')}</div></td>
      ${cel('Tag', e(caderno.tag || '—'), '60px')}
      ${cel('Documento', e(caderno.sigla || '—'), '52px')}
      ${cel('Rev.', e(caderno.revisao || 'R00'), '30px')}
      ${cel('Data', e(caderno.data || '—'), '48px')}
      ${cel('Folha', '<span class="pageNumber"></span>/<span class="totalPages"></span>', '40px')}
    </tr>
  </table>
  <div style="font-size:5.8px;color:#777;text-align:center;margin-top:2px">${linhasRodape({ cnpj: true }).map(e).join(' · ')}</div>
</div>`;
}

function secaoDesenho(d, n) {
  const notas = d.notas || [];
  const legenda = d.legenda || [];
  const m = String(d.svg || '').match(/viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([-\d.]+)[\s,]+([-\d.]+)\s*"/);
  const L = m ? Number(m[1]) : 100, A = m ? Number(m[2]) : 100;
  const pedida = d.escala ? Number(String(d.escala).split(':')[1]) : null;
  // diagrama sem escala: cabe no arranjo mais favorável (fator qualquer)
  const r = d.semEscala
    ? arranjos(notas, legenda.length, d.orientacao || null).map(a => ({ ...a, esc: Math.max(L / a.w, A / Math.max(20, a.h)) })).sort((a, b) => a.esc - b.esc)[0]
    : escolherEscala(L, A, { notas, legenda: legenda.length, orientacao: d.orientacao || null, preferida: Number.isFinite(pedida) && pedida > 0 ? pedida : null });
  const { svg } = svgNaEscala(d.svg, r.esc);
  const leg = legenda.length ? `<div class="legenda ${r.lado ? '' : 'duas'}">${legenda.map(([t, x]) => `<div><b>${e(t)}</b> — ${e(x)}</div>`).join('')}</div>` : '';
  const nts = notas.length ? `<ol class="notas">${notas.map(t => `<li>${e(t)}</li>`).join('')}</ol>` : '';
  // desenho estreito: notas e legenda numa coluna ao lado (o desenho fica maior)
  const corpo = r.lado ? `<div class="dz-lado"><div class="dz-area">${svg}</div><div class="dz-col">${leg}${nts}</div></div>` : `<div class="dz-area">${svg}</div>${leg}${nts}`;
  return `<section class="pagina ${r.orientacao === 'paisagem' ? 'paisagem' : ''}">
  <div class="dz-cab"><h2>${e(n)} ${e(d.titulo)}</h2><span class="esc">${d.semEscala ? 'SEM ESCALA' : `ESCALA ${e(fmtEscala(r.esc))}`}</span></div>
  ${corpo}
</section>`;
}

function gerarCadernoHtml(caderno) {
  const c = caderno || {};
  const dados = c.dados || {};
  const { banner } = img();
  const resp = dados.responsavel || {};
  const cli = dados.cliente || {};
  const capitulos = [];
  const corpo = [];
  let cap = 0;
  const capitulo = (titulo) => { cap++; capitulos.push(`${cap}. ${titulo}`); return `${cap}.`; };

  // 1. dados nominais e normas
  if ((c.caracteristicas || []).length || (c.normas || []).length) {
    const n = capitulo('Dados nominais e normas aplicáveis');
    corpo.push(`<section class="pagina"><h2>${e(n)} Dados nominais e normas aplicáveis</h2>
      ${(c.caracteristicas || []).length ? `<h3>Características do conjunto</h3>${kv(c.caracteristicas)}` : ''}
      ${(c.normas || []).length ? `<h3>Normas</h3>${tabelaHtml({ colunas: ['Norma', 'Assunto', 'O que se aplica neste conjunto'], linhas: c.normas.map(x => [x.codigo, x.titulo, x.aplicacao]), proporcoes: [1.3, 1.9, 2.8] })}` : ''}
    </section>`);
  }
  // 2. desenhos (um por página)
  if ((c.desenhos || []).length) {
    const n = capitulo('Desenhos de fabricação');
    c.desenhos.forEach((d, i) => corpo.push(secaoDesenho(d, `${n}${i + 1}`)));
  }
  // 3. plaquetas
  if ((c.plaquetas || []).length || c.plaqueta_hm || (c.plaquetas_hm || []).length) {
    const n = capitulo('Plaquetas e identificação');
    const folha = htmlFolhaPlaquetas(c.plaquetas || [], (c.plaquetas_hm && c.plaquetas_hm.length) ? c.plaquetas_hm : (c.plaqueta_hm || null));
    const todas = (c.plaquetas || []).map(p => [p.tag, (Array.isArray(p.texto) ? p.texto : [p.texto]).filter(Boolean).join(' / '), `${p.largura_mm} × ${p.altura_mm}`, p.material, p.fixacao, p.local, p.quantidade ?? 1]);
    corpo.push(`<section class="pagina"><h2>${e(n)} Plaquetas e identificação</h2>
      <div class="escala-aviso">Folha de plaquetas em escala ${e(folha.escala)} — imprimir em tamanho real (100 %, sem "ajustar à página") para conferir as medidas. Texto, cores e material conforme a lista abaixo.</div>
      ${folha.html}
      <h3>Lista de plaquetas e etiquetas</h3>
      ${tabelaHtml({ colunas: ['Tag', 'Texto', 'L × A (mm)', 'Material / cores', 'Fixação', 'Local', 'Qtd.'], linhas: todas, proporcoes: [0.7, 2.2, 0.8, 1.6, 1.3, 1.6, 0.4] })}
    </section>`);
  }
  // 4. componentes
  if ((c.componentes || []).length) {
    const n = capitulo('Componentes');
    corpo.push(`<section class="pagina paisagem"><h2>${e(n)} Componentes (tag, fabricante, referência e medidas)</h2>
      ${tabelaHtml({ colunas: ['Tag', 'Descrição', 'Fabricante', 'Referência', 'L × A × P (mm)', 'Qtd.', 'Un.', 'Local', 'Fonte da medida'],
        linhas: c.componentes.map(k => [k.tag, k.descricao, k.fabricante || '—', k.referencia || '—', k.medidas || '—', k.quantidade ?? 1, k.unidade || 'un', k.local || '—', k.fonte || '—']),
        proporcoes: [0.75, 3.2, 1, 1.1, 1.05, 0.4, 0.35, 1.5, 2.3] })}
    </section>`);
  }
  // 5. barramentos
  if ((c.barramentos || []).length) {
    const n = capitulo('Barramentos');
    // segue na mesma página dos componentes (mesma orientação): tabela curta
    corpo.push(`<section class="paisagem ${(c.componentes || []).length ? 'segue' : 'pagina'}"><h2>${e(n)} Barramentos</h2>
      ${tabelaHtml({ colunas: ['Barra', 'Material', 'Seção', 'Compr. (mm)', 'Qtd.', 'Capacidade (A)', 'Icw (kA)', 'Isoladores / suportes', 'Fixação e conexões'],
        linhas: c.barramentos.map(b => [b.barra, b.material, b.secao, numero(b.comprimento_mm), b.quantidade ?? 1, numero(b.capacidade_A), numero(b.icw_kA, 1), b.isoladores || '—', b.fixacao || '—']),
        proporcoes: [0.8, 1, 0.9, 0.6, 0.4, 0.7, 0.55, 2.2, 2.6] })}
    </section>`);
  }
  // 6. materiais de montagem, agrupados
  if ((c.materiais_montagem || []).length) {
    const n = capitulo('Materiais de montagem — da caixa aos parafusos');
    const ordem = [];
    for (const m of c.materiais_montagem) if (!ordem.includes(m.grupo || 'Outros')) ordem.push(m.grupo || 'Outros');
    const linhas = ordem.flatMap(g => [{ grupo: g }, ...c.materiais_montagem.filter(m => (m.grupo || 'Outros') === g).map(m => [m.descricao, m.especificacao || '—', numero(m.quantidade, 2), m.unidade || 'un', m.regra || '—'])]);
    corpo.push(`<section class="pagina paisagem"><h2>${e(n)} Materiais de montagem — da caixa aos parafusos</h2>
      <p>Quantidades por regra (coluna "Regra"); medidas e valores típicos marcados [CONFERIR] devem ser confirmados com o fornecedor antes da compra.</p>
      ${tabelaHtml({ colunas: ['Material', 'Especificação', 'Qtd.', 'Un.', 'Regra (como a quantidade foi obtida)'], linhas, proporcoes: [2.2, 2.6, 0.5, 0.4, 3] })}
    </section>`);
  }
  // 7. seções extras
  // seções extras em sequência (a primeira abre página; muda de página quando muda a orientação)
  (c.secoes || []).forEach((s, i, todas) => {
    const n = capitulo(s.titulo);
    const nova = i === 0 || !!s.paisagem !== !!todas[i - 1].paisagem;
    corpo.push(`<section class="${nova ? 'pagina' : 'segue'} ${s.paisagem ? 'paisagem' : ''}"><h2>${e(n)} ${e(s.titulo)}</h2>
      ${(s.paragrafos || []).map(p => `<p>${e(p)}</p>`).join('')}
      ${s.tabela && (s.tabela.linhas || []).length ? tabelaHtml(s.tabela) : ''}
      ${(s.marcadores || []).length ? `<ul class="marcadores">${s.marcadores.map(t => `<li>${e(t)}</li>`).join('')}</ul>` : ''}
    </section>`);
  });
  // 8. verificações
  if ((c.verificacoes || []).length) {
    const n = capitulo('Verificações e ensaios de rotina');
    corpo.push(`<section class="pagina"><h2>${e(n)} Verificações e ensaios de rotina (checklist de montagem)</h2>
      <table><colgroup><col style="width:4%"/><col style="width:30%"/><col style="width:36%"/><col style="width:16%"/><col style="width:6%"/><col style="width:8%"/></colgroup>
      <thead><tr><th>#</th><th>Item</th><th>Critério</th><th>Norma</th><th>OK</th><th>Rubrica</th></tr></thead><tbody>
      ${c.verificacoes.map((v, i) => `<tr><td>${i + 1}</td><td>${e(v.item)}</td><td>${e(v.criterio)}</td><td>${e(v.norma || '—')}</td><td class="ok">☐</td><td></td></tr>`).join('')}
      </tbody></table>
      <p>Executado por: ______________________ Data: ___/___/______ &nbsp;&nbsp; Verificado por: ______________________</p>
    </section>`);
  }
  // 9. avisos
  if ((c.avisos || []).length) {
    const n = capitulo('Avisos e pontos a conferir');
    corpo.push(`<section class="pagina"><h2>${e(n)} Avisos e pontos a conferir</h2><ul class="marcadores avisos">${c.avisos.map(t => `<li>${e(t)}</li>`).join('')}</ul></section>`);
  }

  const capa = `<section class="capa">
  ${banner ? `<img class="banner" src="${banner}" alt="${e(EMPRESA.razaoSocial)}"/>` : ''}
  <div class="sigla">${e(c.sigla || '')} · ${e(c.revisao || 'R00')}</div>
  <h1>${e(c.titulo || 'CADERNO DE FABRICAÇÃO E MONTAGEM')}</h1>
  <div class="subtitulo">${e(c.subtitulo || '')}</div>
  ${kv([
    ['Cliente', cli.nome],
    ['Obra', dados.obra?.nome],
    ['Endereço', [cli.endereco, cli.cidade, cli.uf].filter(Boolean).join(' — ')],
    ['Tag do conjunto', c.tag],
    ['Documento', [c.sigla, dados.meta?.documento_n].filter(Boolean).join(' · ')],
    ['Revisão / data', `${c.revisao || 'R00'} — ${c.data || dataBr(dados.meta?.data) || ''}`],
    ['Fabricante / emitente', `${EMPRESA.razaoSocial} · CNPJ ${EMPRESA.cnpj}`],
    ['Responsável técnico', [resp.nome, resp.titulo, resp.crea ? `CREA ${resp.crea}` : '', resp.art ? `ART ${resp.art}` : ''].filter(Boolean).join(' · ') || 'a definir'],
  ])}
  <div class="conteudo"><b>Conteúdo</b><ol>${capitulos.map(t => `<li>${e(t.replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol></div>
  <div class="nota">Documento gerado pelo sistema da ${e(EMPRESA.nomeFantasia)} a partir do projeto. Itens marcados [CONFERIR] devem ser confirmados antes de comprar e fabricar. Fabricar somente com a revisão em vigor.</div>
</section>`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>${e(c.titulo || 'Caderno de fabricação')} — ${e(c.tag || '')}</title>
<style>${CSS}</style></head>
<body>${capa}${corpo.join('\n')}</body></html>`;
}

async function gerarCadernoPdf(caderno) {
  return htmlParaPdf(gerarCadernoHtml(caderno), {
    margin: { top: `${MARGEM.topo}mm`, bottom: `${MARGEM.base}mm`, left: `${MARGEM.lado}mm`, right: `${MARGEM.lado}mm` },
    displayHeaderFooter: true, headerTemplate: '<div></div>', footerTemplate: carimboRodape(caderno),
  });
}

module.exports = { gerarCadernoHtml, gerarCadernoPdf, carimboRodape, escolherEscala, svgNaEscala, escapeHtml, AREA_DESENHO, ESCALAS, MARGEM, fmtEscala };
