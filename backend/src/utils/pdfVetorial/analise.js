// Parte da leitura vetorial de PDF (utils/pdfVetorial.js, que explica o método inteiro):
// passo 4, página → itens da legenda com contagem e metragem.
const { cronometro } = require('./tempo');
const { simbolos, uniaoBusca } = require('./simbolos');
const {
  ehDescricao, textoAoLado, regioesLegenda, descricaoCompleta,
  dentroDe, tocam, parecido, indiceDeCompanheiros, faixaDe, partesCasam, mesmaAssinatura,
} = require('./legenda');
const { tabelasDeLegenda } = require('./tabelaLegenda');
const { escalaDoCarimbo, PT_PARA_M, escalasDaFolha } = require('./escala');

const RE_TITULO_NAO_LINHA = /^\s*(DETALHES?|NOTAS?|OBSERVA[ÇC]|LEGENDA|VER\s|ATEN[ÇC][ÃA]O|IMPORTANTE)\b/i;

// ── 4) Página → itens da legenda com contagem e metragem ─────────────────
// `regioesFora` ([[x0, y0, x1, y1]] em pontos): regiões da folha que não são planta
// (diagrama unifilar, vista de quadro, quadro de cargas, carimbo — utils/classificarPranchaPdf.js):
// o símbolo e a linha que caem nelas não são contados (o disjuntor do unifilar
// parecia a tomada da legenda).
// `regioesFolha` ([{ tipo, caixa }], do classificador): dão a escala de cada vista
// (folha com mais de uma escala) — ver escalasDaFolha.
// `prazo` (Date.now() limite): passou, para com erro TEMPO_ESGOTADO.
// `escalaReserva` ({ escala, origem }, utils/escalaDaPlanta.js): nome do arquivo, portas ou cotas — só vale sem a
// informada e sem escala escrita na folha. `origemEscala` ('informada', 'carimbo', …) diz de onde veio a escala dada.
function analisarGeometria({ caminhos, textos, largura, altura }, { escala, origemEscala: origemInformada = null, escalaReserva = null, regioesFora = [], regioesFolha = [], prazo = null } = {}) {
  const foraDaPlanta = (caixa) => regioesFora.some(r => dentroDe(r, caixa));
  const relogio = cronometro(prazo);
  const blobs = simbolos(caminhos, { prazo });
  // legenda em tabela (Símbolo | Fornecedor | Descrição | QTDE): lida pelas colunas
  const tabelas = tabelasDeLegenda(textos, caminhos, blobs);
  const naTabela = (caixa) => tabelas.some(t => dentroDe(t.caixa, caixa));
  // candidatos a amostra de legenda: símbolo com descrição à direita
  const candSimb = [];
  for (const b of blobs) { relogio(); if (naTabela(b.caixa)) continue; const desc = textoAoLado(b.caixa, textos); if (desc) candSimb.push({ tipo: 'simbolo', caixa: b.caixa, desc, blob: b }); }
  // traço de legenda: reta curta (10–80 pt) com descrição à direita
  const candLinha = [];
  for (const c of caminhos) {
    if (!c.traco || !c.reto || c.comp < 10 || c.comp > 80) continue;
    relogio();
    if (naTabela(c.caixa)) continue;
    const desc = textoAoLado(c.caixa, textos, 40);
    if (desc) candLinha.push({ tipo: 'linha', caixa: c.caixa, desc, estilo: `${c.stroke}|${c.lw}|${c.dash}`, cor: c.stroke, lw: c.lw, dash: c.dash });
  }
  const regioesClassicas = regioesLegenda(textos, [...candSimb, ...candLinha]);
  const regioes = [...regioesClassicas, ...tabelas.map(t => t.caixa)];
  const regiao = regioes.length ? [Math.min(...regioes.map(r => r[0])), Math.min(...regioes.map(r => r[1])), Math.max(...regioes.map(r => r[2])), Math.max(...regioes.map(r => r[3]))] : null;
  const naLegenda = (caixa) => regioes.some(r => dentroDe(r, caixa));
  const naLegendaClassica = (caixa) => regioesClassicas.some(r => dentroDe(r, caixa));
  const escalas = escalasDaFolha(textos, regioesFolha, escala);
  // sem escala no carimbo, o "1:50" do título da vista vale quando é o único valor da folha
  // e, sem nenhuma escrita, a de reserva (nome do arquivo → portas → cotas — CAD-09); a origem vai no resultado
  const doCarimbo = escala ? null : escalaDoCarimbo(textos);
  const doTitulo = escala || doCarimbo ? null : (escalas.distintas.length === 1 && escalas.distintas[0] >= 10 ? escalas.distintas[0] : null);
  const reserva = escala || doCarimbo || doTitulo || escalas.porVista ? null : escalaReserva;
  const esc = escala || doCarimbo || doTitulo || reserva?.escala || null;
  const origemEscala = escala ? (origemInformada || 'informada') : doCarimbo ? 'carimbo' : doTitulo ? 'titulo_vista' : reserva?.origem || null;

  // traço de legenda só se isolado: lado de um símbolo (quadrado, caixa) toca outros caminhos
  const daLegenda = caminhos.filter(c => naLegendaClassica(c.caixa));
  const linhasIsoladas = candLinha.filter(l => naLegendaClassica(l.caixa) && !daLegenda.some(c => c.caixa !== l.caixa && tocam(c.caixa, l.caixa)));
  // partes de um mesmo símbolo (cheio + contorno, ou símbolo de 2 linhas de altura)
  // viram uma entrada só: a da 1ª linha de texto, com a assinatura da maior parte
  const simbs = candSimb.filter(c => naLegendaClassica(c.caixa));
  const { raiz, unir } = uniaoBusca(simbs.length);
  for (let i = 0; i < simbs.length; i++) for (let j = i + 1; j < simbs.length; j++) if (tocam(simbs[i].caixa, simbs[j].caixa, 1.5)) unir(i, j);
  const grupos = new Map();
  simbs.forEach((c, i) => { const r = raiz(i); (grupos.get(r) || grupos.set(r, []).get(r)).push(c); });
  const entradas = [];
  for (const g of grupos.values()) {
    const topo = [...g].sort((a, b) => a.desc.y - b.desc.y)[0].desc;
    const maior = [...g].sort((a, b) => (b.blob.w * b.blob.h) - (a.blob.w * a.blob.h))[0];
    entradas.push({ ...maior, desc: topo });
  }
  entradas.push(...linhasIsoladas);
  // símbolo centrado num parágrafo de várias linhas casa com a 2ª linha: sobe
  // até a 1ª, sem passar por uma linha que já é início de outra entrada
  const marcadas = new Set(entradas.map(e => Math.round(e.desc.y)));
  for (const e of entradas) {
    let d = e.desc;
    for (let passo = 0; passo < 5; passo++) {
      const acima = textos.filter(t => t.horizontal && Math.abs(t.x - d.x) < d.h && t.y < d.y && d.y - t.y < d.h * 1.7).sort((a, b) => b.y - a.y)[0];
      if (!acima || marcadas.has(Math.round(acima.y)) || !ehDescricao(acima.s)) break;
      d = { ...(textoAoLado([acima.x - 1, acima.y - acima.h * 0.6, acima.x - 0.6, acima.y - acima.h * 0.1], textos, 2) || { texto: acima.s, x: acima.x, y: acima.y, h: acima.h }) };
    }
    e.desc = d;
  }
  const inicios = new Set(entradas.map(e => Math.round(e.desc.y)));
  for (const e of entradas) e.texto = descricaoCompleta(e, textos, inicios);

  // Assinatura do símbolo: a maior parte (cor, cheio/vazado, tamanho) e as
  // partes de OUTRA família com o centro dentro dela (o miolo cheio do círculo
  // vazado…). Só o tamanho da maior parte não separava "embutido AR70" de
  // "embutido AR111" (mesmo círculo, miolos diferentes).
  const companheiros = indiceDeCompanheiros(blobs);
  const assinaturaDe = (b) => ({ blob: b, comps: companheiros(b) });

  // uma entrada por SÍMBOLO: a chave é a assinatura (estilo do traço, na linha),
  // não o texto — antes, uma entrada por descrição juntava luminárias diferentes
  // do mesmo fornecedor. A mesma assinatura com o mesmo texto (legenda repetida
  // na folha) é uma entrada só; com textos diferentes, as duas ficam e são
  // marcadas ambíguas mais abaixo.
  const unicas = [];
  tabelas.forEach(t => t.entradas.forEach((e, i) => { e.linhaTabela = i + 1; }));
  for (const e of [...tabelas.flatMap(t => t.entradas), ...entradas]) {
    relogio();
    if (e.tipo === 'simbolo') e.sig = assinaturaDe(e.blob);
    const igual = unicas.find(u => u.tipo === e.tipo && u.texto === e.texto && (e.tipo === 'simbolo' ? mesmaAssinatura(u.sig, e.sig) : u.estilo === e.estilo));
    if (!igual) { unicas.push({ ...e }); continue; }
    if (e.qtde != null) igual.qtde = (igual.qtde ?? 0) + e.qtde;
  }

  // ocorrências na planta: cada símbolo vai para a entrada que ele satisfaz com
  // MAIS partes (o círculo com miolo é do "AR111", não do "círculo sozinho");
  // empate: conta para as duas (e elas ficam ambíguas)
  const entradasSimb = unicas.filter(e => e.tipo === 'simbolo');
  for (const e of entradasSimb) e.ocorr = [];
  const amostras = new Set(entradasSimb.map(e => e.blob));
  for (const b of blobs) {
    relogio();
    if (amostras.has(b)) continue;
    let cand = null;
    for (const e of entradasSimb) if (parecido(b, e.blob)) (cand ||= []).push(e);
    if (!cand || naLegenda(b.caixa) || foraDaPlanta(b.caixa)) continue;
    const sb = assinaturaDe(b);
    const ok = cand.filter(e => partesCasam(e.sig, sb));
    if (!ok.length) continue;
    const max = Math.max(...ok.map(e => e.sig.comps.length));
    for (const e of ok) if (e.sig.comps.length === max) e.ocorr.push(b);
  }

  const itens = [];
  for (const e of unicas) {
    e.desc = { ...e.desc, texto: e.texto };
    const doProjeto = {
      ...(e.qtde != null ? { qtde_projeto: e.qtde } : {}),
      ...(e.fornecedor ? { fornecedor: e.fornecedor } : {}),
      ...(e.codigo ? { codigo: e.codigo } : {}),
      ...(e.daTabela ? { origem_legenda: 'tabela', linha_tabela: e.linhaTabela } : {}),
    };
    if (e.tipo === 'simbolo') {
      itens.push({
        tipo: 'simbolo', descricao: e.desc.texto, quantidade: e.ocorr.length,
        assinatura: { cor: e.blob.chave.slice(1).split('|')[0], preenchido: e.blob.chave[0] === 'F', largura_pt: +e.blob.w.toFixed(1), altura_pt: +e.blob.h.toFixed(1), ...(e.sig.comps.length ? { partes: e.sig.comps.length } : {}) },
        ...doProjeto,
        posicoes: e.ocorr.slice(0, 500).map(b => [Math.round(b.cx), Math.round(b.cy)]),
        _sig: e.sig,
      });
    } else {
      // título sublinhado ("DETALHES EM MARCENARIA…", "NOTAS") não é tipo de linha: com a escala do nome do arquivo
      // (CAD-09) ele ganhava 236 m de "material" na prancha luminotécnica da Paróquia
      if (RE_TITULO_NAO_LINHA.test(e.desc.texto || '')) continue;
      itens.push({ tipo: 'linha', descricao: e.desc.texto, ...medirLinha(e.estilo, caminhos, { naLegenda, foraDaPlanta, esc, escalas, relogio }), estilo: { cor: e.cor, espessura: e.lw, tracejado: e.dash || null }, ...doProjeto });
    }
  }
  // duas linhas da tabela com a mesma descrição e símbolos diferentes: o código
  // (ou a linha da tabela) separa os nomes
  const repetidas = new Map();
  for (const i of itens) repetidas.set(i.descricao, (repetidas.get(i.descricao) || 0) + 1);
  const vistos = new Map();
  for (const i of itens) {
    if (repetidas.get(i.descricao) < 2) continue;
    const n = (vistos.get(i.descricao) || 0) + 1;
    vistos.set(i.descricao, n);
    i.descricao = `${i.descricao} (símbolo ${i.codigo || i.linha_tabela || n})`;
  }
  // na legenda, símbolos iguais (mesma assinatura) com descrições diferentes não se distinguem: avisa
  const simbItens = itens.filter(i => i.tipo === 'simbolo');
  for (const i of simbItens) {
    if (simbItens.some(j => j !== i && j.assinatura.cor === i.assinatura.cor && j.assinatura.preenchido === i.assinatura.preenchido
      && Math.abs(j.assinatura.largura_pt - i.assinatura.largura_pt) <= 0.8 && Math.abs(j.assinatura.altura_pt - i.assinatura.altura_pt) <= 0.8
      && mesmaAssinatura(i._sig, j._sig))) i.ambiguo = true;
  }
  for (const i of simbItens) delete i._sig;
  // o mesmo estilo de linha em duas descrições: não dá para separar as metragens
  itens.filter(i => i.tipo === 'linha').forEach((i, _, l) => { if (l.some(j => j !== i && JSON.stringify(j.estilo) === JSON.stringify(i.estilo))) i.ambiguo = true; });
  itens.sort((a, b) => (a.tipo === b.tipo ? a.descricao.localeCompare(b.descricao, 'pt-BR') : a.tipo === 'simbolo' ? -1 : 1));
  const valido = (i) => i.descricao.length >= 6 && !/^(SOBE|DESCE)\b/i.test(i.descricao) && (i.tipo === 'simbolo' ? i.quantidade > 0 : i.comprimento_pt > 0);
  // o que o projetista quantificou na tabela e não foi contado no desenho: fica à
  // vista (para o achado de conferência "legenda diz N, desenho tem 0")
  const naoContados = [
    ...tabelas.flatMap(t => t.semSimbolo),
    ...itens.filter(i => !valido(i) && i.qtde_projeto != null).map(i => ({ descricao: i.descricao, qtde_projeto: i.qtde_projeto, ...(i.codigo ? { codigo: i.codigo } : {}), motivo: 'símbolo não encontrado na planta' })),
  ];
  const linhasSemEscala = itens.filter(i => i.tipo === 'linha' && valido(i) && i.metros == null && escalas.porVista && escalas.distintas.length > 1);
  return {
    itens: itens.filter(valido), legenda: regiao ? regiao.map(Math.round) : null, legendas: regioes.map(r => r.map(Math.round)), escala: esc, origemEscala, pagina_pt: [Math.round(largura), Math.round(altura)],
    ...(tabelas.length ? { tabelasLegenda: tabelas.map(t => ({ caixa: t.caixa.map(Math.round), colunas: t.colunas, linhas: t.entradas.length + t.semSimbolo.length })) } : {}),
    ...(naoContados.length ? { naoContados } : {}),
    ...(escalas.distintas.length > 1 || escalas.temSemEscala ? { escalas: { distintas: escalas.distintas, semEscala: escalas.temSemEscala, vistas: escalas.vistas.map(v => ({ tipo: v.tipo, caixa: v.caixa.map(Math.round), escala: v.escala })) } } : {}),
    ...(linhasSemEscala.length ? { avisoEscala: `folha com mais de uma escala (${escalas.distintas.map(v => `1:${v}`).join(', ')}): ${linhasSemEscala.length} linha(s) da legenda caem em vista sem escala identificada — metragem não calculada, conferir na planta` } : {}),
  };
}

// Comprimento de um estilo de linha na planta. Folha de escala única: tudo na
// escala do carimbo. Folha com mais de uma escala (ou com vista "SEM ESCALA"):
// cada trecho na escala da sua vista; trecho em vista "sem escala" não entra nos
// metros; trecho em vista sem escala identificada, com mais de uma escala na
// folha, bloqueia os metros (null) em vez de chutar uma escala.
function medirLinha(estilo, caminhos, { naLegenda, foraDaPlanta, esc, escalas, relogio }) {
  // comprimento do caminho se ele é deste estilo (null se não é). Faixa: o
  // comprimento é o lado maior (só faixa alinhada aos eixos — a inclinada fica de fora)
  const [, familia, tRef] = estilo.startsWith('faixa|') ? estilo.match(/^faixa\|(.+)\|([\d.]+)$/) : [];
  const casa = familia
    ? (c) => { const f = faixaDe(c); return f && f.familia === familia && Math.abs(f.T - +tRef) <= Math.max(0.25, +tRef * 0.2) ? f.L : null; }
    : (c) => (c.traco && `${c.stroke}|${c.lw}|${c.dash}` === estilo ? c.comp : null);
  let comp = 0, n = 0, metros = 0, semEscalaPt = 0, indefinidoPt = 0;
  const porEscala = {};
  const vistaDe = (caixa) => {
    const cx = (caixa[0] + caixa[2]) / 2, cy = (caixa[1] + caixa[3]) / 2;
    let melhor = null;
    for (const v of escalas.vistas) {
      const [x0, y0, x1, y1] = v.caixa;
      if (cx < x0 || cx > x1 || cy < y0 || cy > y1) continue;
      const area = (x1 - x0) * (y1 - y0);
      if (!melhor || area < melhor.area) melhor = { v, area };
    }
    return melhor?.v || null;
  };
  for (const c of caminhos) {
    const L = casa(c);
    if (L == null || naLegenda(c.caixa) || foraDaPlanta(c.caixa)) continue;
    relogio();
    comp += L; n++;
    if (!escalas.porVista) continue;
    const v = vistaDe(c.caixa);
    const e = v?.escala ?? (escalas.distintas.length === 1 ? escalas.distintas[0] : null);
    if (e === 0) semEscalaPt += L;
    else if (e == null) indefinidoPt += L;
    else { metros += L * PT_PARA_M * e; porEscala[e] = (porEscala[e] || 0) + L; }
  }
  const r = { comprimento_pt: Math.round(comp), trechos: n };
  if (!escalas.porVista) return { ...r, metros: esc ? Math.round(comp * PT_PARA_M * esc * 10) / 10 : null };
  return {
    ...r,
    metros: indefinidoPt > 0 || !Object.keys(porEscala).length ? null : Math.round(metros * 10) / 10,
    escalas_pt: Object.fromEntries(Object.entries(porEscala).map(([k, v]) => [`1:${k}`, Math.round(v)])),
    ...(semEscalaPt ? { sem_escala_pt: Math.round(semEscalaPt) } : {}),
    ...(indefinidoPt ? { escala_indefinida_pt: Math.round(indefinidoPt) } : {}),
  };
}

module.exports = { analisarGeometria, medirLinha };