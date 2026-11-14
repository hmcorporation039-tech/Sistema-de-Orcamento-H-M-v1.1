// Documentos do projeto pela especificação (FL01…FL07 em PDF A3, ficha técnica em PDF A4 e o
// texto de entrega em Markdown), todos gerados do MODELO (../../quadros/scripts/lib/especificacao.js
// → projeto). Papel timbrado da H&M (../empresa.js e assets/logo-pequeno.png), carimbo com
// projeto/cliente/conteúdo/ref./data/rev./escala/folha e "documento preliminar — exige
// verificação e ART". Todo texto passa por escapeHtml.

const fs = require('fs');
const path = require('path');
const { escapeHtml: e } = require('../base/html');
const { EMPRESA, linhasRodape } = require('../empresa');
const D = require('./desenhos');
const DA = require('./desenhosArranjo');

const fmt = (v, d = 1) => (v == null || v === '' ? '—' : String(Math.round(Number(v) * 10 ** d) / 10 ** d).replace('.', ','));
const moeda = (v) => (v == null ? '—' : `R$ ${Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`);
const dataBr = (iso) => { const d = iso ? new Date(`${iso}T12:00:00`) : new Date(); return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); };
let logoCache = null;
const logo = () => {
  if (logoCache != null) return logoCache;
  try { logoCache = `data:image/png;base64,${fs.readFileSync(path.join(__dirname, '..', 'assets', 'logo-pequeno.png')).toString('base64')}`; } catch { logoCache = ''; }
  return logoCache;
};

const CSS = `
@page { size: A3 landscape; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; }
.folha { width: 420mm; height: 297mm; padding: 8mm; page-break-after: always; position: relative; }
.folha:last-child { page-break-after: auto; }
.moldura { border: 0.6mm solid #111; width: 100%; height: 100%; position: relative; display: flex; flex-direction: column; }
.titulo { font-size: 13pt; font-weight: bold; padding: 2.2mm 3mm 1mm; border-bottom: 0.3mm solid #999; }
.corpo { flex: 1; padding: 2.5mm 3mm; overflow: hidden; position: relative; }
.corpo svg { width: 100%; height: 100%; }
.carimbo { border-top: 0.5mm solid #111; display: grid; grid-template-columns: 62mm 74mm 70mm 30mm 26mm 18mm 26mm 1fr 30mm; font-size: 7.4pt; height: 25mm; }
.carimbo > div { border-right: 0.3mm solid #111; padding: 1.2mm 1.6mm; overflow: hidden; }
.carimbo > div:last-child { border-right: none; }
.carimbo .r { font-size: 6.2pt; color: #555; text-transform: uppercase; letter-spacing: .02em; }
.carimbo .v { font-size: 8.6pt; font-weight: bold; margin-top: .6mm; }
.carimbo .emp { display: flex; gap: 2mm; align-items: center; }
.carimbo .emp img { height: 11mm; }
.aviso { font-size: 6.6pt; color: #8a1c1c; margin-top: .8mm; }
table { border-collapse: collapse; width: 100%; font-size: 7.6pt; }
th { background: #0f2257; color: #fff; text-align: left; padding: 1mm 1.4mm; font-weight: bold; }
td { border-bottom: 0.2mm solid #ccd; padding: .7mm 1.4mm; vertical-align: top; }
tr:nth-child(even) td { background: #f5f7fb; }
h3 { font-size: 9.5pt; margin: 2.2mm 0 1mm; color: #0f2257; }
.cols { display: grid; gap: 4mm; }
.c2 { grid-template-columns: 1fr 1fr; }
.c3 { grid-template-columns: 1.3fr 1fr 1fr; }
.peq { font-size: 7.2pt; }
.ok { color: #1d7a3a; font-weight: bold; } .nok { color: #b3261e; font-weight: bold; }
.conferir { background: #fff4d6; }
ul { margin: .5mm 0 0 4mm; padding: 0; font-size: 7.6pt; } li { margin-bottom: .6mm; }
.nota { font-size: 7.2pt; color: #444; margin: .5mm 0; }
.mat table { font-size: 6.4pt; } .peqtab table { font-size: 6.6pt; } .peqtab td { padding: .3mm 1mm; } .peqtab h3 { margin: 1mm 0 .5mm; } .mat td { padding: .35mm 1mm; } .mat th { padding: .6mm 1mm; }
`;

function carimbo(p, conteudo, folha, total, escala = 'sem escala') {
  const m = p.meta;
  return `<div class="carimbo">
  <div class="emp">${logo() ? `<img src="${logo()}"/>` : ''}<div><div class="v" style="font-size:8pt">${e(EMPRESA.razaoSocial.toUpperCase())}</div><div class="peq">Soluções em Engenharia, Tecnologia e Inovação</div><div class="peq">CNPJ ${e(EMPRESA.cnpj)}</div></div></div>
  <div><div class="r">Projeto</div><div class="v">${e(m.titulo)}</div><div class="r" style="margin-top:1mm">Cliente / obra</div><div class="v" style="font-size:7.6pt">${e([m.cliente, m.obra].filter(Boolean).join(' · ') || '—')}</div></div>
  <div><div class="r">Conteúdo</div><div class="v">${e(conteudo)}</div></div>
  <div><div class="r">Ref.</div><div class="v">${e(m.referencia)}</div></div>
  <div><div class="r">Data</div><div class="v">${e(dataBr(m.data || p.gerado_em))}</div></div>
  <div><div class="r">Rev.</div><div class="v">${e(m.revisao || '0A')}</div></div>
  <div><div class="r">Escala</div><div class="v">${e(escala)}</div></div>
  <div><div class="r">Responsável técnico</div><div class="v">________________ CREA ______</div><div class="aviso">Documento preliminar — exige verificação e ART do engenheiro responsável. Normas: ${e((p.escopo.normas.length ? p.escopo.normas : ['ABNT NBR IEC 61439-1/2', 'NBR 5410', 'NR-10']).join(' · '))}. Marcas e modelos "ou equivalente".</div></div>
  <div><div class="r">Anteprojeto</div><div class="v" style="font-size:7pt">gerado pela especificação</div><div class="r" style="margin-top:1mm">Folha</div><div class="v" style="font-size:12pt">${String(folha).padStart(2, '0')}/${String(total).padStart(2, '0')}</div></div>
</div>`;
}

const tabela = (cab, linhas, classes = []) => `<table><tr>${cab.map(h => `<th>${e(h)}</th>`).join('')}</tr>${linhas.map((ln, i) => `<tr${classes[i] ? ` class="${classes[i]}"` : ''}>${ln.map(v => `<td>${e(v)}</td>`).join('')}</tr>`).join('')}</table>`;
const lista = (itens) => `<ul>${itens.map(i => `<li>${e(i)}</li>`).join('')}</ul>`;

// ── conteúdo de cada folha ───────────────────────────────────────────────────
function fl01(p) { return { conteudo: 'FL01 — Diagrama unifilar de força', titulo: `DIAGRAMA UNIFILAR DE FORÇA — ${p.quadro.tag} · ${p.quadro.vff}/${p.quadro.vfn} V · ${p.quadro.condutores} · ${p.quadro.frequencia} Hz · ${p.quadro.esquema}`, corpo: D.unifilar(p) }; }
function fl02(p) { return { conteudo: `FL02 — Comando (${p.comando.tensao}, lógica por relés)`, titulo: `DIAGRAMA DE COMANDO — LÓGICA POR RELÉS · ${p.comando.tensao} (G1 ${p.comando.fonte.A} A / F1) — gerado pelos blocos de função`, corpo: D.ladder(p) }; }
function fl03(p) {
  const cmd = p.comando;
  const reles = cmd.reles.map(r => [r.tag, r.rotulo, ...[0, 1, 2, 3].map(k => (r.usos[k] ? `${r.usos[k].contato} ${r.usos[k].tipo} — ${r.usos[k].uso}` : 'reserva'))]);
  const sel = cmd.seletoras.map(s => [s.tag, s.rotulo || '', (s.posicoes || []).join(' · '), s.blocos.map(b => `${b.bloco} ${b.tipo} (${b.fecha_em}) → ${b.uso}`).join('; ')]);
  const func = p.funcional.map(f => [f.ok ? 'OK' : 'FALHA', f.nome, f.falhas.join('; ')]);
  const corpo = `<div class="cols c2"><div>
    <h3>Relés auxiliares — ${e(cmd.reles.length)} × ${e('4 contatos reversíveis 24 Vcc (base, LED e diodo de roda-livre)')}</h3>
    ${tabela(['Relé', 'Função', 'Contato 1', 'Contato 2', 'Contato 3', 'Contato 4'], reles)}
    <h3>Seletoras e botões (blocos de contato)</h3>
    ${tabela(['Tag', 'Rótulo', 'Posições', 'Blocos'], sel)}
    <h3>Lógica</h3><p class="nota">Blocos de função usados: ${e(cmd.blocos.map(b => b.rotulo + (b.variante ? ' — variante aprovada' : '')).join('; '))}.</p>
    ${lista([...cmd.logica, ...cmd.notas, `Fiação de comando 0,75–1,0 mm² com anilhas; bobinas ${cmd.tensao} com diodo de roda-livre.`])}
  </div><div>
    <h3>Verificação funcional — simulação da lógica (${p.funcional.filter(f => f.ok).length}/${p.funcional.length} cenários atendidos)</h3>
    <p class="nota">Cada cenário vem do bloco de função e da especificação; o avaliador lê a escada até estabilizar (como um CLP). O mesmo modelo alimenta o 3D interativo.</p>
    <table><tr><th>Resultado</th><th>Cenário</th><th>Observação</th></tr>${func.map(f => `<tr><td class="${f[0] === 'OK' ? 'ok' : 'nok'}">${e(f[0])}</td><td>${e(f[1])}</td><td>${e(f[2])}</td></tr>`).join('')}</table>
  </div></div>`;
  return { conteudo: 'FL03 — Relés, contatos e verificação funcional', titulo: 'RELÉS, CONTATOS, SELETORAS E VERIFICAÇÃO FUNCIONAL (SIMULAÇÃO)', corpo };
}
function fl04(p) {
  const cmd = p.comando;
  const grupos = {};
  for (const sc of cmd.modelo.saidasCampo) (grupos[sc.bloco] ||= []).push(sc);
  const linhasCampo = [];
  for (const d of cmd.modelo.degraus) {
    const fs0 = []; const walk = (x) => { if (!x) return; if (x.s) x.s.forEach(walk); else if (x.p) x.p.forEach(walk); else fs0.push(x); }; walk(d.expr);
    for (const f of fs0.filter(f => f.campo || /\.(PEDIDO|RUN|FALHA|VALVULA|TITULAR)$/.test(f.x))) linhasCampo.push(['entrada (contato do campo)', f.rotulo || f.x, `${d.saida} — ${d.rotulo || ''}`, f.campo?.regua || 'X2']);
  }
  for (const sc of cmd.modelo.saidasCampo) linhasCampo.push([sc.livre ? 'contato seco livre' : 'saída (contato do quadro)', sc.rotulo || sc.tag, (sc.expr.p || [sc.expr]).map(x => x.etiqueta || x.x).join(' ∥ '), sc.tag.startsWith('X3') ? 'X3' : 'X2']);
  for (const d of cmd.modelo.degraus.filter(x => /^YV/.test(x.saida))) linhasCampo.push(['carga de campo (atuador)', d.rotulo, `${d.barra} → ${(d.expr.p || [d.expr]).map(x => x.etiqueta || x.rotulo || x.x).join(' ∥ ')}`, 'X2']);
  const reg = p.reguas.map(rg => `<div><h3>${e(rg.id)} — ${e(rg.titulo)} (${rg.bornes.length} + ${rg.reserva} reserva = ${rg.total})</h3>${tabela(['Borne', 'Ligação', 'mm²'], [...rg.bornes.map(b => [`${rg.id}:${b.n}`, b.rotulo, fmt(b.secao, 1)]), ...Array.from({ length: rg.reserva }, (_, k) => [`${rg.id}:${rg.bornes.length + k + 1}`, 'reserva', ''])])}</div>`).join('');
  const notas = [
    'Contatos para o campo são secos (sem tensão do quadro) quando vão a uma entrada do equipamento; a tensão vem da própria placa do equipamento. Cabo blindado 2 × 0,75 mm² por sinal.',
    ...(p.reguas.some(r => r.id === 'X4') ? ['X4 — RS-485: par trançado blindado 1 par + GND; terminação 120 Ω na extremidade; endereços distintos; blindagem aterrada em um só ponto.'] : []),
    `Reserva ≥ ${Math.round(p.quadro.reservaPct * 100)} % de bornes em cada régua.`,
  ];
  // réguas desenhadas (um retângulo por borne, reserva tracejada) em cima; as tabelas com a ligação de cada borne embaixo
  const corpo = `<div style="display:flex;flex-direction:column;height:100%"><div style="height:62mm">${DA.reguasSvg(p.reguas)}</div>
    <div class="cols peqtab" style="grid-template-columns: 1.4fr ${p.reguas.map(() => '1fr').join(' ')}"><div><h3>Interfaces de campo</h3>${tabela(['Tipo', 'Sinal', 'Contato / lógica', 'Régua'], linhasCampo)}${lista(notas)}</div>${reg}</div></div>`;
  return { conteudo: 'FL04 — Interfaces e réguas de bornes', titulo: 'INTERFACES DE CAMPO E RÉGUAS DE BORNES (numeração e reserva)', corpo };
}
function fl05(p) {
  // em escala, pelo arranjo calculado pela skill (quando existe); senão o esquema por zonas
  const desenho = p.arranjo ? DA.layoutArranjo(p.arranjo, p.quadro) : D.layout(p.layout, p.quadro);
  const arr = p.arranjo ? [`Arranjo calculado pela skill (${p.arranjo.modo === 'zonas' ? 'zonas: força em cima, acionamentos | comando lado a lado, bornes embaixo' : 'fileiras'}): placa ${p.arranjo.placa.altura} × ${p.arranjo.placa.largura} mm, ${p.arranjo.alturaNecessaria} mm ocupados${p.arranjo.cabe ? '' : ' — NÃO CABE no invólucro de referência [CONFERIR]'}; peças com as medidas típicas/de catálogo da skill.`] : [];
  // legenda da porta (as tags do desenho com a função de cada dispositivo)
  const legPorta = [...(p.comando.seletoras || []).filter(x => ['seletora', 'emergencia'].includes(x.tipo)).map(x => `${x.tag} ${x.rotulo}`), ...p.sinaleiros.map(h => `${h.tag} ${h.rotulo} (${h.cor})`)];
  const leg = legPorta.length ? [`Porta: ${legPorta.join(' · ')}.`] : [];
  const corpo = `<div style="display:flex;flex-direction:column;height:100%"><div style="height:182mm">${desenho}</div><div><h3>Critérios de layout</h3>${lista([...leg, ...arr, ...p.layout.criterios, ...(p.ventilacao ? [`Ventilação: ${p.ventilacao.texto}.`] : []), `Dimensão ${p.quadro.dimensao.a} × ${p.quadro.dimensao.l} × ${p.quadro.dimensao.p} mm (A × L × P); peso estimado ${p.quadro.peso.min}–${p.quadro.peso.max} kg [CONFERIR com o fabricante].`])}</div></div>`;
  return { conteudo: 'FL05 — Layout 2D: porta e placa', titulo: `LAYOUT 2D — QUADRO ${p.quadro.montagem.toUpperCase()} EM ${p.quadro.material.toUpperCase()} ${p.quadro.ip} · ${p.quadro.dimensao.a} × ${p.quadro.dimensao.l} × ${p.quadro.dimensao.p} mm`, corpo, escala: 'indicativa' };
}
function fl06(p) {
  const dem = p.demanda.linhas.map(l => [l.circuito, l.carga, l.tensao, `${fmt(l.ib)} (${l.criterio})`, l.protecao, ['L1', 'L2', 'L3'].map(f => (l.fases[f] ? fmt(l.fases[f]) : '—')).join(' / ')]);
  dem.push(['TOTAL', 'Fase mais carregada', '', '', `${p.geral.tag} ${p.geral.texto}`, `${fmt(p.demanda.porFase.L1)} / ${fmt(p.demanda.porFase.L2)} / ${fmt(p.demanda.porFase.L3)}`]);
  const mat = p.materiais.map(m => [m.tag, m.descricao, fmt(m.quantidade, 2), m.unidade, m.referencia, m.icu || m.obs || '']);
  const dados = [
    `Dimensão ${p.quadro.dimensao.a} × ${p.quadro.dimensao.l} × ${p.quadro.dimensao.p} mm (A × L × P) · peso estimado ${p.quadro.peso.min}–${p.quadro.peso.max} kg [CONFERIR].`,
    `Tensão de comando ${p.comando.tensao} (fonte G1 ${p.comando.fonte.A} A) · sinalização 24 Vcc (H1 em 220 Vca).`,
    `${p.quadro.ip} · separação força/comando por chapa · ${p.quadro.esquema} · Icc no ponto ${p.quadro.icc_ka ? `${p.quadro.icc_ka} kA` : 'a confirmar'}.`,
  ];
  const corpo = `<div class="cols c2"><div>
    <h3>1. Quadro de cargas e demanda</h3>${tabela(['Circ.', 'Carga', 'Tensão', 'Ib (A)', 'Proteção', 'L1 / L2 / L3 (A)'], dem)}
    <h3>3. Pendências — confirmar antes do executivo</h3>${lista(p.pendencias.map(x => `${x.n}. ${x.texto}`))}
    <h3>4. Pontos a levantar com o cliente</h3>${lista(p.pontos.map((x, i) => `${i + 1}. ${x.texto}${x.sugestao ? ` → Sugestão: ${x.sugestao.texto}` : ''}`))}
    <h3>5. Exceções e observações a declarar na proposta</h3>${lista(p.excecoes.map(x => `${x.letra}) ${x.texto}`))}
    <h3>6. Dados do quadro (preliminares)</h3>${lista(dados)}
  </div><div>
    <h3>2. Lista de materiais — referência (marca/modelo "ou equivalente técnico"; Icu definitivo após a Icc)</h3>
    <div class="mat">${tabela(['Tag', 'Descrição', 'Qtd', 'Un', 'Referência (ou eq.)', 'Icu / obs.'], mat)}</div>
  </div></div>`;
  return { conteudo: 'FL06 — Quadro de cargas, materiais, pendências e exceções', titulo: 'QUADRO DE CARGAS · LISTA DE MATERIAIS · PENDÊNCIAS · PONTOS A LEVANTAR · EXCEÇÕES', corpo };
}
function fl07(p) {
  const prot = p.protecoes.map(q => [q.tag, q.funcao, `${q.polos} ${q.In} A${q.Ir ? ` (Ir ${q.Ir})` : ''}${q.idn ? ` ${q.idn} mA` : ''}`, q.criterio || '', q.condutor?.criterio || (q.condutor?.secao ? `${q.condutor.secao} mm²` : '')]);
  const corpo = `<div class="cols c2"><div>
    <h3>Principais decisões (com a justificativa)</h3>${lista(p.decisoes.map(d => `${d.titulo}: ${d.texto}${d.criterio ? ` (${d.criterio})` : ''}`))}
    <h3>Premissas e interpretação</h3>${lista(p.premissas)}
    ${p.memoria.map(m => `<h3>${e(m.titulo)}</h3>${lista(m.linhas)}`).join('')}
    ${p.avisos.length ? `<h3>Avisos [CONFERIR]</h3>${lista(p.avisos)}` : ''}
  </div><div>
    <h3>Proteções e condutores internos (IB ≤ In ≤ Iz — NBR 5410, 5.3.4.1)</h3>${tabela(['Tag', 'Função', 'Dispositivo', 'Critério', 'Condutor interno'], prot)}
  </div></div>`;
  return { conteudo: 'FL07 — Memória de cálculo e decisões', titulo: 'MEMÓRIA DE CÁLCULO, DECISÕES E PREMISSAS', corpo };
}

const GERADORES = { unifilar: [fl01], comando: [fl02, fl03], interfaces: [fl04], layout: [fl05], cargas_materiais: [fl06], memoria: [fl07] };

function htmlFolhas(projeto, { folhas } = {}) {
  const pedidas = folhas || projeto.folhasPedidas || Object.keys(GERADORES);
  const paginas = pedidas.flatMap(k => (GERADORES[k] || []).map(g => g(projeto)));
  const total = paginas.length;
  const corpo = paginas.map((pg, i) => `<div class="folha"><div class="moldura"><div class="titulo">${e(pg.titulo)}</div><div class="corpo">${pg.corpo}</div>${carimbo(projeto, pg.conteudo, i + 1, total, pg.escala)}</div></div>`).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${e(projeto.meta.titulo)}</title><style>${CSS}</style></head><body>${corpo}</body></html>`;
}

async function gerarFolhasPdf(projeto, opcoes = {}) {
  const { htmlParaPdf } = require('../fabricacao/pdf');
  return htmlParaPdf(htmlFolhas(projeto, opcoes), { format: 'A3', landscape: true, printBackground: true, preferCSSPageSize: true });
}

// ── Ficha técnica (A4) ───────────────────────────────────────────────────────
function htmlFicha(p) {
  const q = p.quadro;
  const dadosQ = [
    ['Designação', p.meta.titulo], ['Tensão nominal (Ue)', `${q.vff}/${q.vfn} V · ${q.condutores} · ${q.frequencia} Hz · ${q.esquema}`], ['Corrente nominal do conjunto (InA)', `${p.geral.In} A (geral${p.geral.Ir ? `, Ir regulado em ${p.geral.Ir} A` : ''})`],
    ['Barramento', p.barramento.texto || '—'], ['Icc presumida / Icw', q.icc_ka ? `${q.icc_ka} kA` : 'a confirmar com o estudo de curto [CONFERIR]'], ['Grau de proteção', `${q.ip}${q.ik ? ` / ${q.ik}` : ''}`],
    ['Invólucro', `${q.montagem}, ${q.material}, ${q.dimensao.a} × ${q.dimensao.l} × ${q.dimensao.p} mm, porta com fechadura e placa de montagem`], ['Peso estimado', `${q.peso.min}–${q.peso.max} kg [CONFERIR]`],
    ['Separação interna', q.separacao ? 'força × comando por chapa' : '—'], ['Tensão de comando', `${p.comando.tensao} (G1 ${p.comando.fonte.A} A); sinalização 24 Vcc; H1 220 Vca`], ['Ventilação', p.ventilacao ? `${p.ventilacao.texto}` : 'natural'],
    ['Entrada / saída de cabos', `alimentadores ${q.entrada === 'superior' ? 'por cima' : 'por baixo'}; demais pelas ${q.saida}`], ['Réguas de bornes', p.reguas.map(r => `${r.id} ${r.titulo.toLowerCase()} (${r.total})`).join(' · ')],
    ['Normas', (p.escopo.normas.length ? p.escopo.normas : ['ABNT NBR IEC 61439-1/2', 'NBR 5410', 'NR-10']).join(' · ')], ['Ensaios', 'verificações de rotina da NBR IEC 61439-1 (seção 11) na fábrica; teste funcional pelos cenários da FL03'],
  ];
  const NORMA = { caixa_moldada: 'NBR IEC 60947-2', minidisjuntor: 'NBR NM 60898 / NBR IEC 60947-2', disjuntor_motor: 'NBR IEC 60947-2/-4-1', idr: 'NBR NM 61008', contator: 'NBR IEC 60947-4-1' };
  const comp = [
    ...p.protecoes.map(z => [z.tag, z.funcao, `${z.tipo.replace('_', ' ')} ${z.polos} ${z.In} A${z.Ir ? ` (Ir ${z.Ir} A)` : ''}${z.curva ? ` curva ${z.curva}` : ''}${z.idn ? ` ${z.idn} mA tipo ${z.drTipo}` : ''}`, z.referencia || '', NORMA[z.tipo] || '', z.criterio || '']),
    ...(p.dps ? [['DPS', 'Proteção contra surtos', p.dps.texto, p.dps.referencia, 'NBR 5410 6.3.5.2 / NBR IEC 61643-11', 'classe II no barramento (sem SPDA informado) [CONFERIR]']] : []),
    ...(p.rff ? [['RFF', 'Relé de falta e sequência de fase', `${q.vff} V, 1 NA/NF`, p.rff.referencia, 'NBR IEC 60255', p.rff.contato]] : []),
    ['G1', 'Fonte de comando', `24 Vcc ${p.comando.fonte.A} A (${p.comando.fonte.W} W)`, p.comando.fonte.referencia, 'NBR IEC 61204', `${fmt(p.comando.fonte.iFonte, 2)} A calculados${p.comando.fonte.nota ? `; ${p.comando.fonte.nota}` : ''}`],
    ...p.comando.reles.map(r => [r.tag, r.rotulo, '4 contatos reversíveis 24 Vcc', 'Finder 55.34 + 94.04 + 99.02 ou equivalente', 'NBR IEC 61810-1', `${r.usos.length} contato(s) usado(s), ${r.reserva} reserva`]),
    ...p.comando.seletoras.map(s => [s.tag, s.rotulo || '', s.descricao || (s.posicoes ? `${s.posicoes.join(' · ')}, ${s.blocos.length} bloco(s)` : ''), '', 'NBR IEC 60947-5-1 / 60204-1', s.blocos.map(b => `${b.bloco} ${b.fecha_em}`).join(', ')]),
    ...p.sinaleiros.map(s => [s.tag, s.rotulo, `LED 22 mm ${s.tensao} ${s.cor}`, '', 'NBR IEC 60947-5-1 / IEC 60073', '']),
  ];
  const css = `@page{size:A4 portrait;margin:12mm} body{font-family:Arial,Helvetica,sans-serif;font-size:8.6pt;color:#111} h1{font-size:14pt;margin:0} h2{font-size:10.5pt;color:#0f2257;border-bottom:.4mm solid #0f2257;margin:5mm 0 2mm} table{border-collapse:collapse;width:100%} th{background:#0f2257;color:#fff;text-align:left;padding:1.2mm} td{border-bottom:.2mm solid #ccd;padding:1mm;vertical-align:top} .cab{display:flex;gap:4mm;align-items:center;border-bottom:.6mm solid #b8860b;padding-bottom:2mm} .cab img{height:14mm} .rod{font-size:7pt;color:#555;margin-top:6mm;border-top:.3mm solid #999;padding-top:1.5mm} .aviso{color:#8a1c1c;font-size:7.6pt}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ficha técnica ${e(q.tag)}</title><style>${css}</style></head><body>
<div class="cab">${logo() ? `<img src="${logo()}"/>` : ''}<div><h1>Ficha técnica — ${e(p.meta.titulo)}</h1><div>${e([p.meta.cliente, p.meta.obra].filter(Boolean).join(' · '))} · ${e(p.meta.referencia)} · Rev. ${e(p.meta.revisao)} · ${e(dataBr(p.meta.data || p.gerado_em))}</div></div></div>
<p class="aviso">Documento preliminar gerado a partir da especificação — exige verificação e ART do engenheiro responsável. Marcas e modelos "ou equivalente técnico"; dados de catálogo típicos [CONFERIR com o fabricante].</p>
<h2>1. Dados do quadro (NBR IEC 61439-1, 6.1 — marcação)</h2>
<table>${dadosQ.map(([k, v]) => `<tr><td style="width:55mm"><b>${e(k)}</b></td><td>${e(v)}</td></tr>`).join('')}</table>
<h2>2. Componentes (dados, norma e critério/fonte)</h2>
<table><tr><th>Tag</th><th>Função</th><th>Especificação</th><th>Referência</th><th>Norma</th><th>Critério / fonte</th></tr>${comp.map(z => `<tr>${z.map(v => `<td>${e(v)}</td>`).join('')}</tr>`).join('')}</table>
<h2>3. Pendências</h2><ol>${p.pendencias.map(x => `<li>${e(x.texto)}</li>`).join('')}</ol>
<div class="rod">${linhasRodape({ cnpj: true }).map(e).join('<br/>')}</div>
</body></html>`;
}
async function gerarFichaPdf(projeto) {
  const { htmlParaPdf } = require('../fabricacao/pdf');
  return htmlParaPdf(htmlFicha(projeto), { format: 'A4', printBackground: true, preferCSSPageSize: true });
}

// ── Texto de entrega (Markdown, para o cliente e o engenheiro) ───────────────
// precos (opcional): o resumo da planilha de pesquisa (./planilhaPrecos.js → resumo)
function textoEntrega(p, precos = null) {
  const L = [];
  L.push(`# ${p.meta.titulo}`);
  L.push(`${[p.meta.cliente, p.meta.obra].filter(Boolean).join(' · ')} · ${p.meta.referencia} · Rev. ${p.meta.revisao} · ${dataBr(p.meta.data || p.gerado_em)}`, '');
  L.push('## Anteprojeto (PDF)', '');
  for (const pr of p.premissas.filter(x => /^Pedido/.test(x))) L.push(pr, '');
  const folhas = [];
  const add = (fl, cont) => folhas.push(`| ${fl} | ${cont} |`);
  add('FL01', `Unifilar de força: geral ${p.geral.tag} ${p.geral.Ir || p.geral.In} A, barramento, ${[p.dps ? 'DPS' : '', p.rff ? 'relé de falta de fase (RFF)' : ''].filter(Boolean).join(', ')}, ${p.cargas.map(c => c.id).join(', ')}, auxiliares, fonte e ventilação`);
  add('FL02', `Comando ${p.comando.tensao} por relés (${p.comando.reles.length} relés): ${p.comando.blocos.map(b => b.rotulo.split(' (')[0].toLowerCase()).join(', ')}`);
  add('FL03', `Tabela de contatos dos relés, seletoras e verificação funcional (${p.funcional.filter(f => f.ok).length}/${p.funcional.length} cenários simulados)`);
  add('FL04', `Interfaces de campo e réguas de bornes ${p.reguas.map(r => r.id).join('/')} com ${Math.round(p.quadro.reservaPct * 100)} % de reserva`);
  add('FL05', 'Layout 2D: porta e placa de montagem, separação força/comando, ventilação');
  add('FL06', 'Quadro de cargas, lista de materiais com marca/modelo de referência, pendências, pontos a levantar e exceções');
  add('FL07', 'Memória de cálculo, decisões e premissas');
  L.push('| Folha | Conteúdo |', '|---|---|', ...folhas, '');
  L.push('**Principais decisões**');
  for (const d of p.decisoes) L.push(`- ${d.titulo}: ${d.texto}${d.criterio ? ` (${d.criterio})` : ''}`);
  L.push('');
  if (p.pontos.length) {
    L.push('**Pontos a levantar com o cliente**');
    p.pontos.forEach((x, i) => L.push(`${i + 1}. ${x.texto}${x.sugestao ? ` Sugestão: ${x.sugestao.texto}` : ''}`));
    L.push('');
  }
  L.push(`**Falta confirmar:** ${p.pendencias.map(x => x.texto.replace(/\.$/, '')).join('; ')}.`, '');
  if (precos) {
    L.push('## Pesquisa de preços do material (XLSX)', '');
    L.push(`Material para montar o quadro: **${moeda(precos.subtotal)}**, ou **${moeda(precos.total)}** com ${Math.round(precos.contingencia * 100)} % de contingência (frete/variação). Não inclui mão de obra, BDI${precos.temCliente ? ' nem os itens fornecidos pelo cliente' : ''}.`, '');
    L.push('| Grupo | Total (R$) |', '|---|---|', ...precos.porGrupo.map(g => `| ${g.grupo} | ${moeda(g.total).replace('R$ ', '')} |`), `| **Subtotal material** | **${moeda(precos.subtotal).replace('R$ ', '')}** |`, `| Contingência ${Math.round(precos.contingencia * 100)} % | ${moeda(precos.subtotal * precos.contingencia).replace('R$ ', '')} |`, `| **Total** | **${moeda(precos.total).replace('R$ ', '')}** |`, '');
    L.push('**Itens que mais pesam**', '', '| Item | Preço unitário | Fonte |', '|---|---|---|', ...precos.top.map(t => `| ${t.descricao}${t.referencia ? ` (${t.referencia})` : ''} | ${moeda(t.preco)}${t.quantidade > 1 ? ` × ${fmt(t.quantidade, 0)}` : ''} | ${t.fonte || t.origem} |`), '');
    L.push(`- ${moeda(precos.pesquisado)} (${Math.round(100 * precos.pesquisado / (precos.subtotal || 1))} %) com preço pesquisado; ${moeda(precos.estimado)} (${Math.round(100 * precos.estimado / (precos.subtotal || 1))} %) são estimativa e precisam de cotação${precos.aCotar ? `; ${precos.aCotar} item(ns) sem preço (a cotar)` : ''}.`);
    L.push('- Preços de varejo: com CNPJ em distribuidor tende a sair menor — tratar como teto.');
    if (precos.economia && precos.economia.total > 0) L.push(`- Onde economizar: ${precos.economia.itens.map(x => `${x.descricao} (${x.de} → ${x.para})`).join('; ')} → ≈ ${moeda(precos.economia.total)} a menos, com menor robustez.`);
    if (precos.mudancas.length) L.push(`- Mudanças em relação ao anteprojeto: ${precos.mudancas.join('; ')}.`);
    if (precos.dependeIcc.length) L.push(`- ${precos.dependeIcc.join(', ')} podem mudar de versão e de preço após a confirmação da Icc.`);
    L.push('');
  }
  L.push('Observações: marcas e modelos "ou equivalente"; documento preliminar — exige conferência e ART do engenheiro responsável.');
  return L.join('\n');
}

module.exports = { htmlFolhas, gerarFolhasPdf, htmlFicha, gerarFichaPdf, textoEntrega, carimbo };
