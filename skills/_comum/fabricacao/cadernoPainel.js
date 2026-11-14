// Caderno de fabricação e montagem dos PAINÉIS das disciplinas (14/11/2026 — revisão geral,
// seção 6): CCM da elétrica industrial, painel de comando da pressurização, QD de recarga
// veicular, quadro DDC da automação e quadro da central de água gelada da climatização.
//
// Todo painel de força e comando é um QUADRO da NBR IEC 61439: em vez de um motor novo, a
// disciplina monta o JSON da skill de quadros (skills/quadros — o mesmo formato do exemplos/
// modelo-vazio.json) com os dados que ela já calculou, e este módulo:
//   1. roda o motor de quadros (invólucro, arranjo, barramentos com medidas, N/PE, bornes, fonte
//      24 Vcc, E/S do CLP com reserva, térmica, componentes do catálogo do fabricante, materiais
//      "da caixa aos parafusos", plaquetas, verificações de rotina da NBR IEC 61439-1);
//   2. monta o caderno pelo adaptador da skill de quadros (quadros/scripts/lib/caderno.js — as
//      vistas são as mesmas do DXF e do 3D do quadro) e acrescenta o que é da disciplina: sigla,
//      normas, seções (partidas por motor, lógica de comando, modos de operação, intertravamentos,
//      lista de E/S…), ensaios funcionais e avisos;
//   3. acrescenta a LISTA DE MATERIAIS para compra (código, descrição, fabricante/referência do
//      catálogo, quantidade, preço unitário e total) — mesmo formato das listas das outras skills:
//      preço do catálogo quando a tela informa (dados.precos_materiais), senão "a cotar"; o
//      orçamento da proposta casa a descrição com o catálogo H&M no backend.
//   4. junta vários quadros num caderno só (dois CCMs, dois quadros DDC), como a caixa.js faz com
//      várias centrais.
// O PDF sai pelo molde comum (./caderno.js: capa com o timbrado H&M, carimbo em toda folha).
// Nada aqui inventa valor de norma: o que é típico ou escolha de projeto sai com [CONFERIR].

const CAD = require('./caderno');
const { formatarMoeda, numeroBr } = require('../base/formato');

// Carregados só quando usados (a skill de quadros puxa o catálogo e a especificação)
const QUADROS = () => require('../../quadros/scripts/lib/index.js');
const MODELO_QUADRO = () => require('../../quadros/exemplos/modelo-vazio.json');

const clonar = (o) => JSON.parse(JSON.stringify(o));
const qtdTxt = (v) => numeroBr(v, 2);

// JSON da skill de quadros a partir dos dados da disciplina: cabeçalho (meta, cliente, obra,
// responsável), fabricantes e catálogo injetado (quando a disciplina tiver), e o que a disciplina
// passar em `quadro`, `circuitos`, `drs`, `motores` e `automacao` (por cima do modelo vazio)
function dadosDoQuadro(dadosDisciplina, { quadro = {}, circuitos = [], drs = [], motores = [], automacao = {} } = {}) {
  const d = dadosDisciplina || {};
  const m = clonar(MODELO_QUADRO());
  for (const k of ['meta', 'responsavel', 'cliente', 'obra']) m[k] = { ...m[k], ...(d[k] || {}) };
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(m.meta.data || ''))) m.meta.data = '';
  m.meta.titulo = `${quadro.tag || m.quadro.tag} — ${quadro.descricao || ''}`.replace(/ — $/, '');
  if (d.fabricantes) m.fabricantes = clonar(d.fabricantes);
  if (Array.isArray(d.catalogo_componentes)) m.catalogo_componentes = d.catalogo_componentes;
  Object.assign(m.quadro, quadro);
  m.circuitos = circuitos;
  m.drs = drs;
  m.motores = motores;
  m.automacao = { ...m.automacao, ...automacao };
  return m;
}

function processarQuadro(dadosQuadro) {
  return QUADROS().processar(dadosQuadro);
}

// Lista de materiais do painel para compra: os materiais do cálculo do quadro (com fabricante e
// referência quando vieram do catálogo) + extras da disciplina (ex.: medidor por ponto).
// precos: { [código ou descrição]: R$ } — preço do catálogo informado pela tela; sem preço, "a cotar".
function linhasMateriais(resQ, { extras = [], precos = null } = {}) {
  const lista = [...(resQ ? resQ.calc.materiais : []), ...extras].filter(m => m && Number(m.quantidade) > 0);
  const preco = (m) => {
    if (!precos) return null;
    const v = precos[m.codigo] ?? precos[m.descricao];
    return Number(v) > 0 ? Number(v) : null;
  };
  return lista.map(m => {
    const p = preco(m);
    const fab = [m.fabricante, m.referencia_fabricante].filter(Boolean).join(' ');
    return {
      codigo: m.codigo || '—', grupo: m.grupo || 'Outros', descricao: m.descricao, fabricante: fab || '—', unidade: m.unidade || 'un', quantidade: Number(m.quantidade),
      preco: p, total: p != null ? p * Number(m.quantidade) : null,
    };
  });
}

function secaoListaMateriais(linhas, { titulo = 'Lista de materiais do painel (compra e orçamento)', tag = '' } = {}) {
  const grupos = [];
  for (const l of linhas) if (!grupos.includes(l.grupo)) grupos.push(l.grupo);
  const total = linhas.reduce((s, l) => s + (l.total || 0), 0);
  const aCotar = linhas.filter(l => l.preco == null).length;
  const tab = grupos.flatMap(g => [{ grupo: g }, ...linhas.filter(l => l.grupo === g).map(l => [l.codigo, l.descricao, l.fabricante, l.unidade, qtdTxt(l.quantidade),
    l.preco != null ? formatarMoeda(l.preco) : 'a cotar', l.total != null ? formatarMoeda(l.total) : '—'])]);
  return {
    titulo: tag ? `${tag} — ${titulo}` : titulo, paisagem: true,
    paragrafos: [
      'Mesma lista da planilha de materiais da skill de quadros (quantidade por regra, fabricante e referência quando a medida veio do catálogo do fabricante). Preço unitário do catálogo H&M quando informado; os itens "a cotar" recebem o preço do catálogo na proposta (o orçamento casa a descrição com o catálogo) ou pela cotação do fornecedor.',
      linhas.length ? `${linhas.length} itens; ${aCotar} a cotar${total > 0 ? `; total dos itens com preço: ${formatarMoeda(total)}` : ''}.` : 'Sem materiais calculados.',
    ],
    tabela: { colunas: ['Cód.', 'Descrição', 'Fabricante / referência', 'Un.', 'Qtd.', 'Preço unit.', 'Total'], linhas: tab, proporcoes: [0.6, 4.2, 1.6, 0.4, 0.6, 0.9, 0.9] },
  };
}

// normas sem repetir o código (a da disciplina vence a do quadro quando o código é o mesmo)
function juntarNormas(base, extras) {
  const chave = (n) => String(n.codigo || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const ja = new Set((extras || []).map(chave));
  return [...(extras || []), ...(base || []).filter(n => !ja.has(chave(n)))];
}

// Caderno de UM quadro: motor de quadros + o que é da disciplina.
// extra = { sigla, titulo, subtitulo, normas[], caracteristicas[[k,v]], secoes[] (antes das do
//           quadro), secoesFim[], verificacoes[], avisos[], componentes[], materiaisExtras[], precos }
function cadernoDoQuadro(dadosQuadro, extra = {}) {
  let resQ = processarQuadro(dadosQuadro);
  const avisosMontagem = [];
  // o arranjo não coube em nenhum invólucro de sobrepor/embutir: refaz como autoportante (a skill de
  // quadros só avisa e usa o maior da série — o caderno sairia com o desenho estourando a caixa)
  if (!resQ.calc.layout.cabe && dadosQuadro.quadro.montagem !== 'autoportante') {
    const antes = dadosQuadro.quadro.montagem;
    const outro = processarQuadro({ ...dadosQuadro, quadro: { ...dadosQuadro.quadro, montagem: 'autoportante' } });
    if (outro.calc.layout.cabe) {
      resQ = outro;
      avisosMontagem.push(`O arranjo não coube na série de invólucros de ${antes}: o painel foi dimensionado como autoportante (piso). Para manter ${antes}, dividir em dois quadros. [CONFERIR]`);
    }
  }
  const QC = require('../../quadros/scripts/lib/caderno.js');
  const cad = QC.montarCaderno(resQ);
  const linhas = linhasMateriais(resQ, { extras: extra.materiaisExtras || [], precos: extra.precos || null });
  const caderno = {
    ...cad,
    sigla: extra.sigla || cad.sigla,
    titulo: extra.titulo || cad.titulo,
    subtitulo: extra.subtitulo || cad.subtitulo,
    normas: juntarNormas(cad.normas, extra.normas),
    caracteristicas: [...cad.caracteristicas, ...(extra.caracteristicas || [])],
    componentes: [...cad.componentes, ...(extra.componentes || [])],
    secoes: [...(extra.secoes || []), secaoListaMateriais(linhas), ...cad.secoes, ...(extra.secoesFim || [])],
    verificacoes: [...cad.verificacoes, ...(extra.verificacoes || [])],
    avisos: [...(extra.avisos || []), ...avisosMontagem, ...cad.avisos],
  };
  return { caderno, resQ, materiais: linhas };
}

// Vários quadros num caderno só: capítulos com o prefixo da tag de cada um, uma plaqueta H&M
// desenhada por quadro (mesma regra de caixa.js). partes = [{ caderno, tag }]
function juntarCadernos(partes, { sigla, titulo, subtitulo, normas, avisos = [], secoes = [] } = {}) {
  if (partes.length === 1) {
    const c = partes[0].caderno;
    return { ...c, sigla: sigla || c.sigla, titulo: titulo || c.titulo, subtitulo: subtitulo || c.subtitulo, secoes: [...secoes, ...c.secoes], avisos: [...avisos, ...c.avisos] };
  }
  const pref = (tag, t) => `${tag} · ${t}`;
  const primeiro = partes[0].caderno;
  return {
    ...primeiro,
    sigla: sigla || primeiro.sigla,
    titulo: titulo || primeiro.titulo,
    subtitulo: subtitulo || `${partes.length} quadros — ${partes.map(p => p.tag).join(', ')}`,
    tag: `${partes[0].tag}…${partes[partes.length - 1].tag}`,
    normas: normas || partes.reduce((acc, p) => juntarNormas(acc, p.caderno.normas), []),
    caracteristicas: partes.flatMap(p => [[p.tag, ''], ...p.caderno.caracteristicas.map(([k, v]) => [`${p.tag} · ${k}`, v])]).filter(([, v]) => v !== ''),
    desenhos: partes.flatMap(p => p.caderno.desenhos.map(d => ({ ...d, titulo: pref(p.tag, d.titulo) }))),
    componentes: partes.flatMap(p => p.caderno.componentes.map(k => ({ ...k, tag: `${p.tag}/${k.tag}` }))),
    barramentos: partes.flatMap(p => (p.caderno.barramentos || []).map(b => ({ ...b, barra: `${p.tag} · ${b.barra}` }))),
    materiais_montagem: partes.flatMap(p => (p.caderno.materiais_montagem || []).map(m => ({ ...m, grupo: pref(p.tag, m.grupo || 'Outros') }))),
    plaquetas: partes.flatMap(p => (p.caderno.plaquetas || []).map(x => ({ ...x, tag: `${x.tag} ${p.tag}`, grupo: pref(p.tag, x.grupo || 'Plaquetas') }))),
    plaqueta_hm: primeiro.plaqueta_hm,
    plaquetas_hm: partes.map(p => p.caderno.plaqueta_hm).filter(Boolean),
    secoes: [...secoes, ...partes.flatMap(p => p.caderno.secoes.map(s => ({ ...s, titulo: s.titulo.startsWith(`${p.tag} — `) ? s.titulo : pref(p.tag, s.titulo) })))],
    verificacoes: partes.flatMap(p => p.caderno.verificacoes.map(v => ({ ...v, item: pref(p.tag, v.item) }))),
    // aviso igual em todos os quadros aparece uma vez só, sem a tag
    avisos: (() => {
      const comuns = partes[0].caderno.avisos.filter(a => partes.every(p => p.caderno.avisos.includes(a)));
      return [...avisos, ...comuns, ...partes.flatMap(p => p.caderno.avisos.filter(a => !comuns.includes(a)).map(a => `${p.tag}: ${a}`))];
    })(),
  };
}

const gerarPdf = (caderno) => CAD.gerarCadernoPdf(caderno);
const gerarHtml = (caderno) => CAD.gerarCadernoHtml(caderno);

module.exports = { dadosDoQuadro, processarQuadro, cadernoDoQuadro, juntarCadernos, linhasMateriais, secaoListaMateriais, juntarNormas, gerarPdf, gerarHtml };
