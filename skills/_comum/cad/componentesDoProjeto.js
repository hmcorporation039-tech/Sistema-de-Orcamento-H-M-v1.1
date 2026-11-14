// COMPONENTES, LEGENDAS e DADOS do projeto lidos no desenho — parte do entendimento do projeto
// (./objetivoDoProjeto.js). Só o que está ESCRITO: valor que o desenho não diz fica null; o que é inferido sai com
// `conferir` e o motivo. Nunca valor de norma inventado (revisão de 09/11/2026, pedido do usuário: "pegar postes de
// entrada, trafos e todos os componentes que estão no projeto e definir as análises em cima dos componentes que
// interessam"; e "as legendas são a fonte dos NOMES e das CARACTERÍSTICAS dos componentes").
//
// A LEGENDA é um passo de primeira classe e vale para TODAS as disciplinas. Formas lidas:
//   relacao_materiais — "RELAÇÃO/LISTA DE MATERIAIS": uma linha por item "NN DESCRIÇÃO"; o número pode ser um
//                       texto separado da descrição (mesma linha) e a descrição pode continuar na linha de baixo;
//   legenda           — "LEGENDA …" numerada, inclusive num MTEXT só ("1 PERFIL U… 2 ISOLADOR… 3 CABO…");
//   legenda_detalhe   — peças numeradas sob o título de um detalhe ("CAIXA DE ATERRAMENTO COM INSPEÇÃO": 1 TAMPÃO…
//                       5 HASTE…), em uma ou mais colunas;
//   legenda_simbolos  — "LEGENDA:" de símbolos: o bloco/desenho à esquerda e a descrição à direita na mesma linha →
//                       mapa bloco → descrição (o bloco achado na vista principal ganha o nome da legenda);
//   notas             — "NOTA(S)" numeradas: não são componentes, mas os dados escritos nelas valem.
// Fontes dos componentes, da mais confiável para a menos: relação/legenda → legenda de símbolos → bloco → layer →
// diagrama. Quando duas fontes discordam (kVA, kV, A, isolamento), a relação/legenda vale e a divergência vira aviso.
// Quantidade: a coluna de quantidade da relação; senão a contagem na vista principal (balões, blocos); senão a das
// vistas de apoio [CONFERIR]; senão null [CONFERIR].
// Entrada: textos { s, x, y, h, layer }, círculos { centro, r }, inserções { nome, x, y, layer } em metros (os de
// ./arquitetura.js). Os perfis (./perfisDisciplina.js) só acrescentam vocabulário e tipos. Nenhum dado de cliente.
const { componenteDoPerfil } = require('./perfisDisciplina');

const num = (v) => { const n = Number(String(v).replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const r2 = (v) => Math.round(v * 100) / 100;
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const mediana = (v) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 0; };
const limpa = (s) => String(s || '').replace(/\s+/g, ' ').replace(/^[\s\-–:;,.]+|[\s\-–:;,]+$/g, '').trim();

// ── Parágrafos ───────────────────────────────────────────────────────────────────────────────────────
// Texto de várias linhas escrito em TEXTs separados ("3#50MM2 CONDUTOR DE" / "COBRE UNIPOLAR, ISOLADO" /
// "PARA 15kV, XLP OU EPR"): linhas da mesma coluna (mesmo x), da mesma altura de letra, uma logo abaixo da outra
function paragrafos(textos) {
  const ts = textos.filter(t => t.s && Number.isFinite(t.x) && Number.isFinite(t.y)).map(t => ({ ...t, h: t.h || 0.1 }));
  const ordem = ts.map((_, i) => i).sort((a, b) => ts[b].y - ts[a].y);
  const usado = new Set();
  // índice pelo x (célula de 1 m): só os vizinhos da coluna são comparados
  const porX = new Map();
  ordem.forEach(i => { const k = Math.floor(ts[i].x); (porX.get(k) || porX.set(k, []).get(k)).push(i); });
  const out = [];
  for (const i of ordem) {
    if (usado.has(i)) continue;
    usado.add(i);
    const linhas = [ts[i]];
    let cur = ts[i];
    for (;;) {
      let prox = -1, dy = Infinity;
      for (const k of [Math.floor(cur.x) - 1, Math.floor(cur.x), Math.floor(cur.x) + 1]) {
        for (const j of porX.get(k) || []) {
          if (usado.has(j)) continue;
          const t = ts[j];
          const d = cur.y - t.y;
          if (d <= 0 || d > 2.6 * cur.h || Math.abs(t.x - cur.x) > 1.2 * cur.h || Math.max(t.h, cur.h) / Math.min(t.h, cur.h) > 1.4) continue;
          if (d < dy) { dy = d; prox = j; }
        }
      }
      if (prox < 0) break;
      usado.add(prox);
      cur = ts[prox];
      linhas.push(cur);
    }
    out.push({ s: linhas.map(l => l.s).join(' ').replace(/\s+/g, ' ').trim(), x: linhas[0].x, y: linhas[0].y, h: linhas[0].h, layer: linhas[0].layer, linhas });
  }
  return out;
}

// ── Legendas ─────────────────────────────────────────────────────────────────────────────────────────
// título explícito de lista (no começo do texto: "4) - PARA LISTA DE EQUIPAMENTOS…" é nota, não título)
const RE_TITULO_LISTA = /^\s*(RELA[ÇC][ÃA]O\s+DE\s+(MATERIA|EQUIPAMENTO|COMPONENTE)|LISTA\s+DE\s+(MATERIA|EQUIPAMENTO|COMPONENTE)|LEGENDAS?\b|SIMBOLOGIA\b|CONVEN[ÇC][ÕO]ES\b|ITENS\b)/i;
const RE_TITULO_NOTAS = /^\s*(NOTAS?|OBSERVA[ÇC][ÕO]ES|OBS)\b/i;
const tipoDaLista = (titulo) => (/RELA[ÇC][ÃA]O|LISTA/i.test(titulo) ? 'relacao_materiais' : RE_TITULO_NOTAS.test(titulo) ? 'notas' : /^\s*(LEGENDA|SIMBOLOGIA|CONVEN)/i.test(titulo) ? 'legenda' : 'legenda_detalhe');
// linha numerada: "01 ELETRODUTO…", "1 - O VALOR…", "2 -1xDISJUNTOR…", "5) HASTE…" — o resto tem de ter palavra
// ("2,4m", "20(L)x5(E)", "3#50MM2", "1-100W" não são itens)
const RE_NUM_LINHA = /^(\d{1,3})(?:\s*[-–.)]\s*|\s+)(.+)$/;
const linhaNumerada = (s) => { const m = RE_NUM_LINHA.exec(String(s).trim()); return m && /[A-Za-zÀ-ú]{3}/.test(m[2]) && !/^[\d,.]+\s*(m|cm|mm)\b/i.test(m[2]) ? { n: Number(m[1]), resto: m[2].trim() } : null; };
// (depois da unidade, nada de letra — "15 MÃO FRANCESA" é o item 15, não "15 M")
const RE_UNIDADE_DEPOIS = /^(KV|KA|KVA|KW|MM2?|MM²|CM|M|A|V|W|HZ|KG|PÇ|PC|UN|%)(?![A-Za-zÀ-ú])/i;
const RE_ESCALA = /^(ESC(ALA)?\.?\s*:?\s*1\s*[:/]|SEM\s+ESCALA|S\/\s*ESC)/i;

// "1 PERFIL U… 2 ISOLADOR… 3 CABO…" num texto só (o MTEXT com \P vem com as linhas juntas): corta no próximo
// número da sequência seguido de palavra (não de unidade: "12 KV, 10 KA 12 TERMINAL" corta no segundo 12)
function itensNumTexto(s) {
  const l = linhaNumerada(s);
  if (!l) return null;
  let n = l.n;
  const itens = [];
  let resto = l.resto, atual = { n, s: '' };
  for (;;) {
    const re = new RegExp(`(?:^|\\s)(${n + 1})(?:\\s*[-–.)]\\s*|\\s+)(?=\\S)`, 'g');
    let corte = null, mm;
    while ((mm = re.exec(resto))) {
      const depois = resto.slice(mm.index + mm[0].length);
      if (/^[A-Za-zÀ-ú]{2,}/.test(depois) && !RE_UNIDADE_DEPOIS.test(depois)) { corte = mm; break; }
    }
    if (!corte) { atual.s = resto.trim(); itens.push(atual); break; }
    atual.s = resto.slice(0, corte.index).trim();
    itens.push(atual);
    n++;
    resto = resto.slice(corte.index + corte[0].length);
    atual = { n, s: '' };
  }
  return itens;
}

const novaLegenda = (titulo, tipo, tit, itens, caixa, extra = {}) => {
  const ns = itens.map(i => i.numero).filter(n => n != null);
  // itens que faltam na numeração (só na relação: a lista de peças do detalhe pode pular de propósito)
  const faltando = [];
  if (tipo === 'relacao_materiais' && ns.length) for (let n = 1; n < Math.max(...ns); n++) if (!ns.includes(n)) faltando.push(n);
  return { titulo, tipo, x: tit?.x ?? null, y: tit?.y ?? null, h: tit?.h ?? null, layer: tit?.layer ?? null, caixa, itens, faltando, ...extra };
};
const item = (n, descricao, x, y, extra = {}) => ({ numero: n, item: n == null ? null : String(n).padStart(2, '0'), descricao: limpa(descricao), especificacao: especificacaoDe(descricao), quantidade: null, unidade: null, x, y, ...extra });

// Lista sob um título explícito: a coluna dos números é a mais comum sob o título; número e descrição pareados
// pela LINHA (mesmo y), linha sem número é continuação do item de cima; para no primeiro vão grande
function listaSobTitulo(tit, textos, usados) {
  const h = tit.h || 0.1;
  const x0 = tit.x - 40 * h, x1 = tit.x + 120 * h, y0 = tit.y - 200 * h;
  const area = textos.filter(t => t !== tit && !usados.has(t) && t.y < tit.y + 0.2 * h && t.y >= y0 && t.x >= x0 && t.x <= x1);
  const tipo0 = tipoDaLista(tit.s);
  // um texto só com a lista inteira (MTEXT de parágrafos: "LEGENDA POSTE DE ENTREGA")
  const corrida = area.filter(t => Math.abs(t.x - tit.x) <= 3 * h && tit.y - t.y <= 6 * h).map(t => ({ t, itens: itensNumTexto(t.s) })).find(o => o.itens?.length >= 3);
  if (corrida) {
    usados.add(corrida.t);
    return novaLegenda(limpa(tit.s), tipo0, tit, corrida.itens.map(i => item(i.n, i.s, corrida.t.x, corrida.t.y)), [tit.x, corrida.t.y - h, tit.x + 60 * h, tit.y + h]);
  }
  const numerados = area.map(t => {
    const so = /^(\d{1,3})$/.exec(t.s.trim());
    if (so) return { t, n: Number(so[1]), resto: '' };
    const l = linhaNumerada(t.s);
    return l ? { t, n: l.n, resto: l.resto } : null;
  }).filter(Boolean);
  let colX = null, melhor = 0;
  for (const a of numerados) { const c = numerados.filter(b => Math.abs(b.t.x - a.t.x) <= 1.5 * a.t.h).length; if (c > melhor) { melhor = c; colX = a.t.x; } }
  if (melhor >= 2) {
    let col = numerados.filter(a => Math.abs(a.t.x - colX) <= 1.5 * a.t.h).sort((a, b) => b.t.y - a.t.y);
    const vaos = col.slice(1).map((a, i) => col[i].t.y - a.t.y).filter(v => v > 0.05 * h).sort((a, b) => a - b);
    const tipico = vaos[vaos.length >> 1] || 4 * h;
    const ate = [];
    for (const a of col) {
      if (ate.length && ate.at(-1).t.y - a.t.y > Math.max(4 * tipico, 10 * a.t.h)) break;
      if (!ate.length && tit.y - a.t.y > Math.max(4 * tipico, 12 * h)) break;
      if (ate.some(b => b.n === a.n)) continue;
      ate.push(a);
    }
    col = ate;
    if (col.length >= 2) {
      // a letra das linhas (não a do título) mede as tolerâncias da tabela
      const hl = mediana(col.map(a => a.t.h)) || h;
      const yFim = col.at(-1).t.y - 1.2 * tipico;
      const cab = (re) => area.find(t => re.test(t.s.trim()) && t.y > col[0].t.y - 0.3 * hl && t.y <= tit.y + 0.2 * h);
      const cabQtd = cab(/^(QTD\.?|QUANT\.?|QUANTIDADE)$/i), cabUn = cab(/^(UN\.?|UNID\.?|UNIDADE)$/i);
      const naColuna = (t, c) => c && Math.abs(t.x - c.x) <= 3 * hl;
      // descrições: os textos sem número da faixa da lista, ao lado da coluna (até 12 letras à esquerda: o
      // número pode ficar à direita da descrição centrada) — cada um vai para o número mais perto na vertical
      const livres = area.filter(t => !col.some(a => a.t === t) && !/^\d{1,3}$/.test(t.s.trim()) && t.y >= yFim && t.y <= tit.y - 0.3 * hl
        && t.x >= colX - 12 * hl && t.x <= colX + 15 * hl && !(itensNumTexto(t.s)?.length >= 2) && !naColuna(t, cabQtd) && !naColuna(t, cabUn) && t !== cabQtd && t !== cabUn);
      const itens = col.map(a => ({ a, partes: a.resto ? [{ s: a.resto, y: a.t.y, x: a.t.x }] : [] }));
      for (const t of livres) {
        let k = -1, d = Infinity;
        itens.forEach((it, i) => { const dd = Math.abs(it.a.t.y - t.y); if (dd < d) { d = dd; k = i; } });
        // na mesma linha, ou a linha de baixo (continuação) — nunca a de cima de outro número mais perto
        if (k >= 0 && d <= Math.max(0.75 * tipico, 1.5 * hl)) { itens[k].partes.push({ s: t.s, y: t.y, x: t.x }); usados.add(t); }
      }
      const naLinha = (it, c) => { const t = c && area.find(o => naColuna(o, c) && o !== c && Math.abs(o.y - it.a.t.y) <= 0.6 * tipico); return t ? t.s.trim() : null; };
      const lista = itens.map(it => {
        it.partes.sort((p, q) => (q.y - p.y) || (p.x - q.x));
        const x = item(it.a.n, it.partes.map(p => p.s).join(' '), it.a.t.x, it.a.t.y);
        const q = naLinha(it, cabQtd);
        if (q && num(q) != null) x.quantidade = num(q);
        if (cabUn) x.unidade = naLinha(it, cabUn);
        usados.add(it.a.t);
        return x;
      }).filter(i => i.descricao);
      return novaLegenda(limpa(tit.s), tipo0, tit, lista,
        [Math.min(colX - 12 * hl, ...lista.map(i => i.x)), yFim, Math.max(tit.x + 60 * h, colX + 120 * hl), tit.y + h], { temQuantidade: !!cabQtd });
    }
  }
  // sem números: legenda de SÍMBOLOS — as descrições em coluna sob o título
  if (tipo0 !== 'legenda') return null;
  return legendaDeSimbolos(tit, area, usados);
}

// "LEGENDA:" de símbolos: descrições alinhadas em coluna(s) (texto de 3+ letras), cada uma com o símbolo à esquerda
function legendaDeSimbolos(tit, area, usados) {
  const h = tit.h || 0.1;
  // (até 40 letras do título para a direita: a tabela ao lado da legenda não é legenda)
  const cand = area.filter(t => t.s.trim().length >= 3 && /[A-Za-zÀ-ú]{3}/.test(t.s) && !RE_NUM_LINHA.test(t.s.trim()) && tit.y - t.y <= 80 * h && t.x >= tit.x - 2 * h && t.x <= tit.x + 40 * h);
  // colunas: x com 3+ textos
  const colunas = [];
  for (const t of cand) {
    if (colunas.some(c => Math.abs(c.x - t.x) <= t.h)) continue;
    const mesma = cand.filter(o => Math.abs(o.x - t.x) <= t.h).sort((a, b) => b.y - a.y);
    if (mesma.length >= 3) colunas.push({ x: t.x, textos: mesma });
  }
  const itens = [];
  for (const c of colunas) {
    const vaos = c.textos.slice(1).map((t, i) => c.textos[i].y - t.y).sort((a, b) => a - b);
    const tipico = vaos[vaos.length >> 1] || 4 * h;
    let ant = null;
    for (const t of c.textos) {
      // (a primeira linha fica logo abaixo do título: a coluna da tabela vizinha, metros abaixo, não é legenda)
      if (ant ? ant.y - t.y > Math.max(4 * tipico, 6 * t.h) : tit.y - t.y > 8 * h) break;
      itens.push(item(null, t.s, t.x, t.y, { h: t.h }));
      usados.add(t);
      ant = t;
    }
  }
  if (itens.length < 2) return null;
  const xs = itens.map(i => i.x), ys = itens.map(i => i.y);
  return novaLegenda(limpa(tit.s), 'legenda_simbolos', tit, itens.sort((a, b) => (b.y - a.y) || (a.x - b.x)), [Math.min(...xs) - 10 * h, Math.min(...ys) - h, Math.max(...xs) + 40 * h, tit.y + h]);
}

// Peças numeradas SEM título de lista (detalhe, notas): grupos de linhas numeradas perto umas das outras; o título é
// o texto logo acima do grupo (o nome do detalhe — "CAIXA DE ATERRAMENTO COM INSPEÇÃO")
function listasSemTitulo(textos, usados) {
  const cand = textos.filter(t => !usados.has(t) && linhaNumerada(t.s));
  const pai = cand.map((_, i) => i);
  const raiz = (i) => { while (pai[i] !== i) i = pai[i] = pai[pai[i]]; return i; };
  const ord = cand.map((_, i) => i).sort((a, b) => cand[a].y - cand[b].y);
  for (let a = 0; a < ord.length; a++) {
    for (let b = a + 1; b < ord.length; b++) {
      const ta = cand[ord[a]], tb = cand[ord[b]];
      const hm = Math.max(ta.h || 0.1, tb.h || 0.1);
      if (tb.y - ta.y > 5 * hm) break;
      if (Math.abs(ta.x - tb.x) <= 60 * hm) pai[raiz(ord[a])] = raiz(ord[b]);
    }
  }
  const grupos = new Map();
  cand.forEach((t, i) => { const r = raiz(i); (grupos.get(r) || grupos.set(r, []).get(r)).push(t); });
  const out = [];
  for (const g of grupos.values()) {
    const corrida = g.length === 1 ? itensNumTexto(g[0].s) : null;
    const nums = g.map(t => linhaNumerada(t.s).n);
    if (!(corrida?.length >= 3) && (g.length < 3 || new Set(nums).size < g.length * 0.8 || Math.min(...nums) > 2)) continue;
    const h = mediana(g.map(t => t.h || 0.1));
    const topo = Math.max(...g.map(t => t.y)), xMin = Math.min(...g.map(t => t.x)), xMax = Math.max(...g.map(t => t.x));
    // título: o texto não numerado mais perto acima (sem escala, cota nem número)
    const tit = textos.filter(t => !g.includes(t) && t.y > topo && t.y - topo <= 8 * h && t.x >= xMin - 5 * h && t.x <= xMax + 30 * h
      && !RE_ESCALA.test(t.s.trim()) && !/^[\d.,\s]+$/.test(t.s) && /[A-Za-zÀ-ú]{3}/.test(t.s)).sort((a, b) => (a.y - b.y) || (b.h - a.h))[0] || null;
    let itens;
    if (corrida?.length >= 3) itens = corrida.map(i => item(i.n, i.s, g[0].x, g[0].y));
    else {
      // continuação: texto sem número logo abaixo de um item, na mesma coluna
      const resto = textos.filter(t => !usados.has(t) && !g.includes(t) && t !== tit && !linhaNumerada(t.s) && t.y < topo && t.y >= Math.min(...g.map(o => o.y)) - 3 * h);
      itens = g.sort((a, b) => (b.y - a.y) || (a.x - b.x)).map(t => {
        const partes = [linhaNumerada(t.s).resto];
        let cur = t;
        for (;;) {
          const prox = resto.filter(o => !usados.has(o) && Math.abs(o.x - t.x) <= 1.5 * h && cur.y - o.y > 0 && cur.y - o.y <= 2.6 * h)
            .filter(o => !g.some(n => n !== t && Math.abs(n.x - o.x) <= 1.5 * h && n.y < cur.y && n.y >= o.y)).sort((a, b) => b.y - a.y)[0];
          if (!prox) break;
          partes.push(prox.s);
          usados.add(prox);
          cur = prox;
        }
        return item(linhaNumerada(t.s).n, partes.join(' '), t.x, t.y);
      });
    }
    g.forEach(t => usados.add(t));
    itens.sort((a, b) => a.numero - b.numero);
    const titulo = tit ? limpa(tit.s) : null;
    const tipo = titulo ? (RE_TITULO_NOTAS.test(titulo) ? 'notas' : tipoDaLista(titulo)) : 'legenda_detalhe';
    // frases longas sem título de legenda/lista: notas
    const tipoFinal = tipo === 'legenda_detalhe' && itens.filter(i => i.descricao.length >= 45 && /\b(DEVER|SER[ÁA]O?|DEVE)\b/i.test(i.descricao)).length >= itens.length * 0.5 ? 'notas' : tipo;
    out.push(novaLegenda(titulo, tipoFinal, tit, itens, [xMin - h, Math.min(...g.map(t => t.y)) - h, xMax + 40 * h, (tit?.y ?? topo) + h]));
  }
  return out;
}

// Todas as legendas do desenho. `insercoes` ({ nome, x, y }): o bloco à esquerda de cada linha da legenda de símbolos
function lerLegendas(textos, { insercoes = [] } = {}) {
  const ts = textos.filter(t => t.s && String(t.s).trim() && Number.isFinite(t.x) && Number.isFinite(t.y)).map(t => ({ ...t, s: String(t.s).trim(), h: t.h || 0.1 }));
  const usados = new Set();
  const legendas = [];
  // (as NOTAS numeradas saem pelos grupos sem título, abaixo: sob o título 'NOTA' a coluna pegava cotas e o carimbo)
  const titulos = ts.filter(t => t.s.length <= 60 && RE_TITULO_LISTA.test(semAcento(t.s).toUpperCase()) && !linhaNumerada(t.s))
    .sort((a, b) => b.h - a.h);
  for (const tit of titulos) {
    if (usados.has(tit)) continue;
    const l = listaSobTitulo(tit, ts, usados);
    if (l && l.itens.length) { usados.add(tit); legendas.push(l); }
  }
  legendas.push(...listasSemTitulo(ts, usados));
  // legenda de símbolos: o bloco inserido à esquerda da descrição, na mesma linha → mapa bloco → descrição
  for (const l of legendas.filter(x => x.tipo === 'legenda_simbolos')) {
    for (const it of l.itens) {
      const h = it.h || l.h || 0.1;
      const b = insercoes.filter(i => i.x < it.x - 0.1 * h && i.x >= it.x - 10 * h && Math.abs(i.y - (it.y + h / 2)) <= 1.5 * h).sort((p, q) => q.x - p.x)[0];
      if (b) it.bloco = b.nome;
      delete it.h;
    }
  }
  return legendas;
}

// ── Balões ───────────────────────────────────────────────────────────────────────────────────────────
// Círculo pequeno com um número dentro (o nº do item). O ponto do TEXT é o canto de baixo à esquerda: o centro
// da letra fica meia altura acima e meio texto à direita
function lerBaloes(textos, circulos) {
  const nums = textos.filter(t => /^\d{1,3}[A-Z]?$/.test(String(t.s).trim()) && t.h > 0);
  if (!nums.length || !circulos?.length) return [];
  const cel = 0.5;
  const idx = new Map();
  const k = (x, y) => `${Math.floor(x / cel)},${Math.floor(y / cel)}`;
  const vistos = new Set();
  for (const c of circulos) {
    const chave = `${c.centro[0].toFixed(3)},${c.centro[1].toFixed(3)},${c.r.toFixed(3)}`;
    if (vistos.has(chave)) continue; // círculo repetido (bloco explodido duas vezes)
    vistos.add(chave);
    (idx.get(k(...c.centro)) || idx.set(k(...c.centro), []).get(k(...c.centro))).push(c);
  }
  const out = [];
  const usados = new Set();
  for (const t of nums) {
    const s = String(t.s).trim();
    const cx = t.x + s.length * t.h * 0.45, cy = t.y + t.h / 2;
    let melhor = null, dm = Infinity;
    const i = Math.floor(cx / cel), j = Math.floor(cy / cel);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      for (const c of idx.get(`${i + a},${j + b}`) || []) {
        if (c.r < 0.5 * t.h || c.r > 3 * t.h) continue;
        const d = Math.hypot(c.centro[0] - cx, c.centro[1] - cy);
        if (d <= 0.8 * c.r && d < dm) { dm = d; melhor = c; }
      }
    }
    if (!melhor || usados.has(melhor)) continue;
    usados.add(melhor);
    out.push({ n: Number.parseInt(s, 10), s, x: melhor.centro[0], y: melhor.centro[1], r: melhor.r, layer: t.layer });
  }
  return out;
}

// Linha de chamada do balão: o traço que toca o círculo e sai dele — a outra ponta é o componente apontado
function alvoDoBalao(b, segmentos) {
  let melhor = null, dm = Infinity;
  for (const [p, q] of segmentos) {
    for (const [a, z] of [[p, q], [q, p]]) {
      const da = Math.hypot(a[0] - b.x, a[1] - b.y);
      if (Math.abs(da - b.r) > 0.35 * b.r) continue;
      const dz = Math.hypot(z[0] - b.x, z[1] - b.y);
      if (dz < 2 * b.r) continue;
      const erro = Math.abs(da - b.r);
      if (erro < dm) { dm = erro; melhor = z; }
    }
  }
  return melhor ? [r2(melhor[0]), r2(melhor[1])] : null;
}

// ── Especificação lida da descrição ──────────────────────────────────────────────────────────────────
function especificacaoDe(s) {
  const e = {};
  const t = String(s || '');
  let m;
  if ((m = /(\d{1,5}(?:[.,]\d+)?)\s*KVA\b/i.exec(t))) e.kva = num(m[1]);
  if ((m = /(\d{1,2}[.,]\d{1,3})\s*KV\b(?!\s*\/)/i.exec(t)) && !/\/\s*$/.test(t.slice(0, m.index))) e.tensao_kv = num(m[1]);
  else if ((m = /\b(\d{1,2})\.(\d{3})\s*V\b/i.exec(t))) e.tensao_kv = Number(m[1]) + Number(m[2]) / 1000;
  if ((m = /(?:CLASSE\s*(?:DE\s*)?)?(?:^|[^\d/,.])(\d{1,2})\s*KV\b/i.exec(t)) && !(m.index > 0 && /\d[.,]$/.test(t.slice(0, m.index + 1)))) e.classe_kv = num(m[1]);
  if ((m = /(\d[.,]?\d*)\s*\/\s*(\d{1,2}[.,]?\d*)\s*KV\b/i.exec(t))) e.isolacao_kv = `${m[1]}/${m[2]}`;
  if ((m = /(\d{3})\s*\/\s*(\d{3})\s*V\b/i.exec(t))) e.tensao_secundaria_v = `${m[1]}/${m[2]}`;
  if ((m = /\bIN\s*[:=-]?\s*(\d{1,4})\s*A\b/i.exec(t)) || (m = /(?:^|[^\w/#.,])(\d{1,4})\s*A\b(?!\s*=)/.exec(t))) e.corrente_a = num(m[1]);
  if ((m = /(\d{1,3}(?:[.,]\d+)?)\s*KA\b/i.exec(t))) e.capacidade_interrupcao_ka = num(m[1]);
  if ((m = /HH[- ]?(\d{1,3})\s*A/i.exec(t))) e.fusivel_hh_a = num(m[1]);
  if ((m = /#\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:MM2|MM²|mm²|mm2)?/i.exec(t)) || (m = /(\d{1,3}(?:[.,]\d+)?)\s*(?:MM2|MM²|mm²|mm2)\b/i.exec(t))) e.secao_mm2 = num(m[1]);
  if ((m = /[Ø∅]\s*(\d+(?:[.,]\d+)?)\s*mm/i.exec(t))) e.diametro_mm = num(m[1]);
  else if ((m = /[Ø∅]\s*(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?)\s*(?:"|''|POL)/i.exec(t))) e.diametro_pol = m[1].replace(/\s+/g, '');
  if ((m = /(\d+(?:[.,]\d+)?)\s*KG\b/i.exec(t))) e.massa_kg = num(m[1]);
  if ((m = /\bL\s*=\s*(\d+[.,]\d+)\s*M\b/i.exec(t))) e.largura_m = num(m[1]);
  if ((m = /\bH\s*=\s*(\d+[.,]\d+)\s*M\b/i.exec(t))) e.altura_m = num(m[1]);
  if ((m = /\bALTURA(?:\s+DE\s+\w+)?\s*=\s*(\d+[.,]\d+)\s*M\b/i.exec(t))) e.altura_instalacao_m = num(m[1]);
  if ((m = /(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)\b/.exec(t))) e.dimensoes = `${m[1]}x${m[2]} ${m[3]}`;
  if ((m = /(\d+[.,]\d+)\s*m\b(?!m)/i.exec(t)) && /HASTE|POSTE/i.test(t)) e.comprimento_m = num(m[1]);
  if ((m = /(\d+)\s*m\s*\/\s*(\d+)\s*daN/i.exec(t))) { e.comprimento_m = num(m[1]); e.esforco_dan = num(m[2]); }
  if (/[ÓO]LEO/i.test(t)) e.isolamento = 'óleo';
  else if (/(À|\bA)\s+SECO\b/i.test(t)) e.isolamento = 'seco';
  if (/TRIF[ÁA]SIC|TRIPOLAR/i.test(t)) e.polos = 3;
  else if (/UNIPOLAR|MONOPOLAR/i.test(t)) e.polos = 1;
  if (/USO\s+INTERNO|INTERN[AO]\b/i.test(t)) e.uso = 'interno';
  else if (/USO\s+EXTERNO|EXTERN[AO]\b/i.test(t)) e.uso = 'externo';
  if (/\bXLPE?\b/i.test(t)) e.isolacao = /\bEPR\b/i.test(t) ? 'XLPE ou EPR' : 'XLPE';
  else if (/\bEPR\b/i.test(t)) e.isolacao = 'EPR';
  return e;
}

// ── Dados da média tensão (só o que está escrito) ───────────────────────────────────────────────────
// fontes: { campo: ['origem: "texto"'] } para a conferência; avisos de divergência entre o que o desenho diz.
// `paras`: parágrafos fora das vistas de contexto (cada um pode trazer `carimbo: true`)
function dadosMediaTensao(paras, { relacao = [], layers = [], blocos = [] } = {}) {
  const dados = {
    potencia_kva: null, tensao_primaria_kv: null, tensao_secundaria_v: null, tensao_secundaria_fn_v: null, demanda_kva: null, carga_instalada_kw: null,
    tipo_se: null, medicao: null, protecao: null, cabo_mt_mm2: null, resistencia_malha_max_ohm: null, hastes: null, impedancia_pct: null, disjuntor_geral_bt_a: null,
    isolamento_trafo: null, requisitos_abrigo: [],
  };
  const fontes = {};
  const avisos = [];
  const todos = [...relacao.map(i => ({ s: i.descricao, origem: `relação, item ${i.item}`, peso: 3 })), ...paras.map(p => ({ s: p.s, origem: p.carimbo ? 'carimbo' : 'texto', peso: p.carimbo ? 3 : 2 }))];
  const votar = (lista) => {
    const conta = new Map();
    for (const { v, peso, origem, s } of lista) { const c = conta.get(v) || { v, peso: 0, origens: [] }; c.peso += peso; c.origens.push(`${origem}: "${s.slice(0, 90)}"`); conta.set(v, c); }
    return [...conta.values()].sort((a, b) => b.peso - a.peso);
  };
  const fonte = (t) => [`${t.origem}: "${t.s.slice(0, 90)}"`];

  // potência do transformador (não a demanda, não a carga, não "0,30 m² para cada 100 kVA")
  const pot = [];
  for (const t of todos) {
    if (/DEMANDA|CARGA|TOTAL|PARA\s+CADA|INSTALADA\s+EM|\bPOR\s+\d/i.test(t.s)) continue;
    if (!/TRANSFORMADOR|\bTRAFO|SUBESTA|\bSE[- ]?\d|CABINE|POT[ÊE]NCIA/i.test(t.s)) continue;
    for (const m of t.s.matchAll(/(\d{2,5}(?:[.,]\d+)?)\s*KVA\b/gi)) pot.push({ v: num(m[1]), peso: t.peso, origem: t.origem, s: t.s });
  }
  const vp = votar(pot);
  if (vp.length) {
    dados.potencia_kva = vp[0].v;
    fontes.potencia_kva = vp[0].origens.slice(0, 4);
    if (vp.length > 1) avisos.push(`Potência do transformador: o desenho diz ${vp.map(x => `${x.v} kVA (${x.origens.length}×)`).join(' e ')} — valeu ${vp[0].v} kVA; confira [CONFERIR].`);
  }
  // nome de layer/bloco com potência: só aviso quando diverge do escrito
  for (const [qual, nomes] of [['layer', layers], ['bloco', blocos]]) {
    for (const l of nomes) {
      const m = /(\d{2,5}(?:[.,]\d+)?)\s*KVA/i.exec(l);
      if (m && /TRANSFORMADOR|TRAFO/i.test(l) && dados.potencia_kva != null && num(m[1]) !== dados.potencia_kva) {
        avisos.push(`${qual === 'layer' ? 'A layer' : 'O bloco'} "${l}" diz ${num(m[1])} kVA, mas a relação/carimbo/unifilar dizem ${dados.potencia_kva} kVA — vale o escrito (nome de ${qual} copiado de outro projeto?).`);
      }
    }
  }
  // isolamento do transformador: óleo × seco
  const isol = votar(todos.filter(t => /TRANSFORMADOR|TRAFO/i.test(t.s)).flatMap(t => {
    const m = /ISOLAMENTO\s+(?:À|A|EM)?\s*(SECO|[ÓO]LEO)|(?:À|\bA)\s+([ÓO]LEO|SECO)\b/i.exec(t.s);
    return m ? [{ v: /SECO/i.test(m[0]) ? 'seco' : 'óleo', peso: t.peso, origem: t.origem, s: t.s }] : [];
  }));
  if (isol.length) {
    dados.isolamento_trafo = isol[0].v;
    fontes.isolamento_trafo = isol[0].origens.slice(0, 2);
    if (isol.length > 1) avisos.push(`Isolamento do transformador divergente no desenho: ${isol.map(x => `${x.v} (${x.origens[0]})`).join(' × ')} — valeu ${isol[0].v}; confira [CONFERIR].`);
  }
  // tensão primária: valor com decimal em kV (13,8 kV) ou 13.800 V — a classe "15 kV" e o "8,7/15 kV" do cabo não
  const tp = [];
  for (const t of todos) {
    for (const m of t.s.matchAll(/(\d{1,2}[.,]\d{1,3})\s*KV\b/gi)) {
      const v = num(m[1]);
      if (v >= 2 && v <= 69 && !/\/\s*$/.test(t.s.slice(0, m.index)) && !/^\s*\//.test(t.s.slice(m.index + m[0].length))) tp.push({ v, peso: t.peso, origem: t.origem, s: t.s });
    }
    for (const m of t.s.matchAll(/\b(\d{1,2})\.(\d{3})\s*V\b/gi)) tp.push({ v: Number(m[1]) + Number(m[2]) / 1000, peso: t.peso, origem: t.origem, s: t.s });
  }
  const vt = votar(tp);
  if (vt.length) { dados.tensao_primaria_kv = vt[0].v; fontes.tensao_primaria_kv = vt[0].origens.slice(0, 3); }
  // secundária 380/220 V
  const ts = votar(todos.flatMap(t => [...t.s.matchAll(/(\d{3})\s*\/\s*(\d{3})\s*V\b/gi)].map(m => ({ v: `${m[1]}/${m[2]}`, peso: t.peso, origem: t.origem, s: t.s }))));
  if (ts.length) { dados.tensao_secundaria_v = num(ts[0].v.split('/')[0]); dados.tensao_secundaria_fn_v = num(ts[0].v.split('/')[1]); fontes.tensao_secundaria_v = ts[0].origens.slice(0, 2); }
  // demanda, carga instalada e impedância
  for (const t of todos) {
    let m;
    if (dados.demanda_kva == null && (m = /DEMANDA[^0-9]{0,25}(\d+(?:[.,]\d+)?)\s*KVA/i.exec(t.s))) { dados.demanda_kva = num(m[1]); fontes.demanda_kva = fonte(t); }
    if (dados.carga_instalada_kw == null && (m = /CARGA(?:\s+INSTALADA)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*KW\b/i.exec(t.s))) { dados.carga_instalada_kw = num(m[1]); fontes.carga_instalada_kw = fonte(t); }
    if (dados.impedancia_pct == null && (m = /\bZ\s*[=:]\s*(\d+(?:[.,]\d+)?)\s*%/i.exec(t.s))) { dados.impedancia_pct = num(m[1]); fontes.impedancia_pct = fonte(t); }
  }
  // tipo da subestação (só se escrito; primeiro "SUBESTAÇÃO … ABRIGADA" — o carimbo; a "cabine de alvenaria" da
  // descrição da porta só na falta)
  for (const t of [...todos.filter(o => /SUBESTA/i.test(o.s)), ...todos.filter(o => !/SUBESTA/i.test(o.s))]) {
    const m = /SUBESTA[ÇC][ÃA]O.{0,30}?\b(ABRIGADA|BLINDADA|A[ÉE]REA|EM\s+POSTE|AO\s+TEMPO)|CABINE\s+(BLINDADA|DE\s+ALVENARIA)/i.exec(t.s);
    if (m) { const w = (m[1] || m[2]).toUpperCase(); dados.tipo_se = /ABRIG|ALVEN/.test(w) ? 'abrigada' : /BLIND/.test(w) ? 'blindada' : /TEMPO/.test(w) ? 'ao tempo' : 'poste'; fontes.tipo_se = fonte(t); break; }
  }
  // medição: "MEDIÇÃO INDIRETA "CJTR-250A""
  for (const t of todos) {
    const m = /MEDI[ÇC][ÃA]O\s+(INDIRETA|DIRETA)(?:[^A-Z0-9]{0,6}([A-Z]{2,6}-?\d{1,4}\s*A?))?/i.exec(t.s);
    if (m) { dados.medicao = `${m[1].toLowerCase()}${m[2] ? ` ${m[2].replace(/\s+/g, '')}` : ''}`; fontes.medicao = fonte(t); if (m[2]) break; }
  }
  // proteção geral de MT: disjuntor + relé, ou chave seccionadora + fusível HH
  {
    const chave = todos.find(t => /SECCIONADORA/i.test(t.s) && /\d{2,4}\s*A\b/.test(t.s)) || todos.find(t => /SECCIONADORA/i.test(t.s));
    const hh = todos.map(t => /(?:FUS[ÍI]VEL\s*HH|\bHH)[- ]?(\d{1,3})\s*A/i.exec(t.s)).find(Boolean);
    const disj = todos.find(t => /DISJUNTOR.{0,50}(\b(13[.,]8|15|17[.,]5|24)\s*KV|M[ÉE]DIA TENS|PVO|A V[ÁA]CUO|SF6)/i.test(t.s));
    const rele = todos.find(t => /\bREL[ÉE]S?(?![A-Za-zÀ-ú])|\b50\s*\/\s*51/i.test(t.s));
    if (disj || chave || hh) {
      const ca = chave && /(\d{2,4})\s*A\b/.exec(chave.s);
      dados.protecao = { tipo: disj ? 'disjuntor de MT' : 'chave seccionadora + fusível HH', chave_seccionadora_a: ca ? num(ca[1]) : null, fusivel_hh_a: hh ? num(hh[1]) : null, rele: rele ? rele.s.slice(0, 90) : null };
      fontes.protecao = [chave, disj, rele].filter(Boolean).map(t => fonte(t)[0]);
      if (rele && !disj) avisos.push(`O desenho cita relé ("${rele.s.slice(0, 70)}"), mas não um disjuntor de MT — a proteção lida foi chave seccionadora + fusível HH; confira [CONFERIR].`);
    }
  }
  // cabo de MT: seção do condutor de 15 kV
  {
    const c = votar(todos.filter(t => /(CABO|CONDUTOR).{0,60}(15\s*KV|XLPE?|EPR)/i.test(t.s) && !/0[,.]6\s*\/\s*1|750\s*V/i.test(t.s))
      .flatMap(t => { const m = /#\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:MM2|MM²)/i.exec(t.s) || /(\d{1,3}(?:[.,]\d+)?)\s*(?:MM2|MM²)\b/i.exec(t.s); return m ? [{ v: num(m[1]), peso: t.peso, origem: t.origem, s: t.s }] : []; }));
    if (c.length) { dados.cabo_mt_mm2 = c[0].v; fontes.cabo_mt_mm2 = c[0].origens.slice(0, 3); }
  }
  // resistência máxima da malha: "R </= 10 Ohms", "DEVERÁ SER </= 10 OHMS", "INFERIOR OU IGUAL A 10 OHMS"
  {
    const r = votar(todos.flatMap(t => [...t.s.matchAll(/(?:<\s*\/?\s*=|≤|=\s*<|INFERIOR\s+OU\s+IGUAL\s+A|M[ÁA]XIM[OA].{0,40}?|\bRMAX\b.{0,6}?)\s*(\d{1,3}(?:[.,]\d+)?)\s*(?:OHMS?|Ω)/gi)]
      .map(m => ({ v: num(m[1]), peso: t.peso, origem: t.origem, s: t.s }))));
    if (r.length) { dados.resistencia_malha_max_ohm = r[0].v; fontes.resistencia_malha_max_ohm = r[0].origens.slice(0, 3); }
  }
  // hastes: "6xHASTES", "NO MÍNIMO 04 HASTES"
  {
    const h = votar(todos.flatMap(t => [...t.s.matchAll(/(\d{1,2})\s*X?\s*HASTES\b|M[ÍI]NIMO\s+(?:DE\s+)?(\d{1,2})\s+HASTES/gi)].map(m => ({ v: num(m[1] || m[2]), peso: t.peso, origem: t.origem, s: t.s }))));
    if (h.length) {
      dados.hastes = h[0].v;
      fontes.hastes = h[0].origens.slice(0, 2);
      if (h.length > 1) avisos.push(`Número de hastes divergente no desenho: ${h.map(x => `${x.v} (${x.origens[0]})`).join(' × ')} [CONFERIR].`);
    }
  }
  // disjuntor geral de BT: "DISJUNTOR TRIPOLAR In: 250A"
  for (const t of todos) {
    const m = /DISJUNTOR.{0,60}?\bIN\s*[:=-]?\s*(\d{2,4})\s*A/i.exec(t.s);
    if (m && !/KV/i.test(t.s)) { dados.disjuntor_geral_bt_a = num(m[1]); fontes.disjuntor_geral_bt_a = fonte(t); break; }
  }
  // requisitos do abrigo escritos nas notas da distribuidora (porta, ventilação, iluminação, tela) — o texto como está
  const REQ = [
    ['ventilacao', /(ABERTURAS?\s+DE\s+\d[.,]\d+\s*M[²2]\s+PARA\s+CADA\s+\d+\s*KVA[^;]{0,80})/i],
    ['iluminacao', /(AFASTADA,?\s+NO\s+M[ÍI]NIMO\s+\d[.,]\d+\s*M\s+DA\s+ALTA\s+TENS[ÃA]O)/i],
    ['tela', /(MALHA\s+(?:M[ÍI]NIMA\s+|DE\s+NO\s+M[ÍI]NIMO\s+)?\d+\s*MM\s+E\s+(?:NO\s+)?M[ÁA]XIM[OA]\s+(?:DE\s+)?\d+\s*MM)/i],
  ];
  const corrido = paras.map(p => p.s).join(' ');
  for (const [chave, re] of REQ) {
    const m = re.exec(corrido);
    if (m) dados.requisitos_abrigo.push({ item: chave, texto: limpa(m[0]).slice(0, 200) });
  }
  // porta: "DIMENSÕES MÍNIMAS DE 0,80X2,10 M, ABRINDO… PARA FORA" no parágrafo da porta ou logo abaixo dele
  paras.some((p) => {
    const m = /(\d[.,]\d{2}\s*X\s*\d[.,]\d{2}\s*M)\b(,?\s*ABRINDO[^;]{0,40})?/i.exec(p.s);
    if (!m) return false;
    const acima = paras.find(q => q !== p && Math.abs(q.x - p.x) <= 1 && q.y > p.y && q.y - p.y <= 3 * (p.h || 0.1));
    if (!/PORTA/i.test(p.s) && !(acima && /PORTA/i.test(acima.s))) return false;
    dados.requisitos_abrigo.unshift({ item: 'porta', texto: limpa(`${acima && !/PORTA/i.test(p.s) ? `${acima.s} ` : ''}${p.s}`).slice(0, 200) });
    return true;
  });
  return { dados, fontes, avisos };
}

// ── Componentes do objetivo ──────────────────────────────────────────────────────────────────────────
const CAMPOS_CONFRONTO = ['kva', 'tensao_kv', 'corrente_a', 'isolamento', 'secao_mm2'];
// fonte de uma legenda
const FONTE_DA_LEGENDA = { relacao_materiais: 'relacao_materiais', legenda: 'legenda', legenda_detalhe: 'legenda_detalhe', legenda_simbolos: 'legenda_simbolos' };

// Monta os componentes do perfil a partir das legendas (já sem as de contexto), dos balões, dos blocos, das layers e
// do diagrama. Entradas:
//   legendas                — lerLegendas (só as que valem: fora das vistas de contexto)
//   baloesPrincipal         — balões na vista principal ({ n, x, y, alvo })
//   baloesVistas            — [{ id, titulo, baloes }] das vistas de apoio
//   blocosPrincipal         — inserções na vista principal ({ nome, x, y })
//   layersComponente        — [{ layer, posicoes: [{ x, y }] }] layers com nome de componente (posições na principal)
//   diagrama                — parágrafos das vistas de diagrama/unifilar
//   rotulosPrincipal        — textos da vista principal (o rótulo "POÇO TIPO PP", "CJTR-250A" ao lado do desenho)
//   baloesDaLista(lista)    — balões na vista de uma lista secundária (a legenda do poste chama as peças no desenho dele)
function montarComponentes(perfil, { legendas = [], baloesPrincipal = [], baloesVistas = [], blocosPrincipal = [], layersComponente = [], diagrama = [], rotulosPrincipal = [], baloesDaLista = () => [], vistaPrincipal = null }) {
  const componentes = [];
  const avisos = [];
  const deItens = legendas.filter(l => l.tipo !== 'notas' && l.tipo !== 'legenda_simbolos');
  // a lista que os balões numeram: a relação de materiais; sem ela, a legenda numerada mais longa. As outras listas
  // (legenda do poste de entrega, peças de um detalhe) têm numeração própria: o item leva o nome da lista
  const ordenadas = [...deItens].sort((a, b) => ((b.tipo === 'relacao_materiais') - (a.tipo === 'relacao_materiais')) || ((b.tipo === 'legenda') - (a.tipo === 'legenda')) || (b.itens.length - a.itens.length));
  const principal = ordenadas.find(l => l.tipo === 'relacao_materiais' || l.tipo === 'legenda') || null;
  const confrontar = (comp, esp, origem) => {
    for (const k of CAMPOS_CONFRONTO) {
      if (comp.especificacao[k] != null && esp[k] != null && comp.especificacao[k] !== esp[k]) {
        avisos.push(`${origem} diz ${k} = ${esp[k]}, mas ${comp.fonte === 'relacao_materiais' ? `a relação (item ${comp.item})` : `"${comp.lista || comp.fonte}"`} diz ${comp.especificacao[k]} — vale ${comp.fonte === 'relacao_materiais' || comp.fonte === 'legenda' ? 'a relação/legenda' : 'a primeira fonte'} [CONFERIR].`);
      } else if (comp.especificacao[k] == null && esp[k] != null) comp.especificacao[k] = esp[k];
    }
  };
  const novo = (c, descricao, extra) => ({
    id: null, tipo: c?.tipo || 'outro', descricao: limpa(descricao), item: null, lista: null, fonte: null, fontes: [], quantidade: null, unidade: c?.unidade || 'un',
    especificacao: especificacaoDe(descricao), posicoes: [], conferir: false, motivo: null, forma3d: c?.forma3d || null, servico: c?.servico || null, ...extra,
  });

  // 1) relação de materiais e legendas numeradas
  for (const lista of ordenadas) {
    const ehPrincipal = lista === principal;
    for (const it of lista.itens) {
      const c = componenteDoPerfil(perfil, it.descricao);
      // legenda de outra coisa colada (só a relação de materiais vale inteira): só o que é do perfil
      if (!c && lista.tipo !== 'relacao_materiais') continue;
      const fonte = FONTE_DA_LEGENDA[lista.tipo];
      // lista secundária (poste de entrega, peças de detalhe): o mesmo tipo já na relação é a mesma peça → confirma
      // (especificação que diverge — cabo de 10 mm² × cabo de 16 mm² — é outra peça, não a mesma)
      const ja = !ehPrincipal && c && componentes.find(x => x.tipo === c.tipo && !CAMPOS_CONFRONTO.some(k => x.especificacao[k] != null && it.especificacao[k] != null && x.especificacao[k] !== it.especificacao[k]));
      if (ja) {
        ja.fontes.push(`${fonte}: "${lista.titulo}" item ${it.item}`);
        confrontar(ja, it.especificacao, `"${lista.titulo}" (item ${it.item})`);
        continue;
      }
      const comp = novo(c, it.descricao, {
        item: ehPrincipal ? it.item : `${lista.titulo || 'lista sem título'} ${it.item}`, lista: lista.titulo, fonte,
        fontes: [`${fonte}: "${lista.titulo || 'lista sem título'}" item ${it.item}`], especificacao: { ...it.especificacao },
      });
      if (it.quantidade != null) { comp.quantidade = it.quantidade; comp.fontes.push('coluna de quantidade da lista'); if (it.unidade) comp.unidade = String(it.unidade).toLowerCase(); }
      const bal = ehPrincipal ? baloesPrincipal.filter(b => b.n === it.numero) : [];
      comp.posicoes = bal.map(b => ({ x: r2(b.x), y: r2(b.y), vista: vistaPrincipal, origem: 'balao', ...(b.alvo ? { alvo: b.alvo } : {}) }));
      // lista secundária: o balão da peça no desenho dela (poste de entrega) dá a posição — a chamada não é contagem
      if (!ehPrincipal) {
        const bl = baloesDaLista(lista).filter(b => b.n === it.numero);
        comp.posicoes = bl.map(b => ({ x: r2(b.x), y: r2(b.y), vista: b.vista || null, origem: 'balao' }));
        if (bl.length) comp._chamadas = bl.length;
      }
      comp._baloes = bal.length;
      comp._ehPrincipal = ehPrincipal;
      comp._numero = it.numero;
      componentes.push(comp);
    }
  }
  // 2) legenda de símbolos: bloco → descrição; o bloco na vista principal vira componente com o nome da legenda
  const mapaSimbolos = new Map();
  for (const l of legendas.filter(x => x.tipo === 'legenda_simbolos')) for (const it of l.itens) if (it.bloco && !mapaSimbolos.has(it.bloco)) mapaSimbolos.set(it.bloco, { it, l });
  const blocosUsados = new Set();
  for (const [bloco, { it, l }] of mapaSimbolos) {
    const ins = blocosPrincipal.filter(b => b.nome === bloco);
    if (!ins.length) continue;
    const c = componenteDoPerfil(perfil, it.descricao) || componenteDoPerfil(perfil, bloco);
    if (!c) continue;
    ins.forEach(b => blocosUsados.add(b));
    const ja = componentes.find(x => x.tipo === c.tipo);
    if (ja) { ja.fontes.push(`legenda_simbolos: "${l.titulo}" → bloco "${bloco}" (${ins.length}× na principal)`); ja._blocos = (ja._blocos || 0) + ins.length; if (!ja.posicoes.length) ja.posicoes = ins.map(b => ({ x: r2(b.x), y: r2(b.y), vista: vistaPrincipal, origem: 'bloco' })); continue; }
    const comp = novo(c, it.descricao, { lista: l.titulo, fonte: 'legenda_simbolos', fontes: [`legenda_simbolos: "${l.titulo}" → bloco "${bloco}"`], especificacao: { ...it.especificacao } });
    comp.posicoes = ins.map(b => ({ x: r2(b.x), y: r2(b.y), vista: vistaPrincipal, origem: 'bloco' }));
    comp._blocos = ins.length;
    componentes.push(comp);
  }
  // 3) blocos na vista principal com nome de componente ("TRANSFORMADOR A SECO 225KVA", "BUCHA DE PASSAGEM… 15KV")
  const porNome = new Map();
  for (const b of blocosPrincipal) if (!blocosUsados.has(b)) (porNome.get(b.nome) || porNome.set(b.nome, []).get(b.nome)).push(b);
  for (const [nome, ins] of porNome) {
    const c = componenteDoPerfil(perfil, nome);
    if (!c) continue;
    const esp = especificacaoDe(nome);
    const ja = componentes.find(x => x.tipo === c.tipo);
    const pos = ins.map(b => ({ x: r2(b.x), y: r2(b.y), vista: vistaPrincipal, origem: 'bloco' }));
    if (ja) {
      ja.fontes.push(`bloco: "${nome}" (${ins.length}× na principal${ins[0].anonimo ? `, inserido como ${ins[0].anonimo}` : ''})`);
      confrontar(ja, esp, `O bloco "${nome}"`);
      ja._blocos = (ja._blocos || 0) + ins.length;
      ja.posicoes.push(...pos.filter(p => !ja.posicoes.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 0.05)));
      continue;
    }
    const comp = novo(c, nome, { fonte: 'bloco', fontes: [`bloco: "${nome}" (${ins.length}× na principal)`], especificacao: esp });
    comp.posicoes = pos;
    comp._blocos = ins.length;
    componentes.push(comp);
  }
  // 4) layers com nome de componente: confirmam (posição) ou acrescentam (sem quantidade escrita)
  for (const lc of layersComponente) {
    const c = componenteDoPerfil(perfil, lc.layer);
    if (!c) continue;
    const ja = componentes.find(x => x.tipo === c.tipo) || (c.tipo === 'mufla' ? componentes.find(x => /^mufla/.test(x.tipo)) : null);
    const esp = especificacaoDe(lc.layer);
    if (ja) {
      ja.fontes.push(`layer: "${lc.layer}"`);
      confrontar(ja, esp, `A layer "${lc.layer}"`);
      if (!ja.posicoes.length && lc.posicoes.length) ja.posicoes = lc.posicoes.map(p => ({ ...p, vista: vistaPrincipal, origem: 'layer' }));
      continue;
    }
    // sem desenho na vista principal, o nome da layer sozinho não cria componente (luminária da arena, legenda colada)
    if (!lc.posicoes.length) continue;
    const comp = novo(c, lc.layer, { fonte: 'layer', fontes: [`layer: "${lc.layer}"`], especificacao: esp, conferir: true });
    comp.posicoes = lc.posicoes.map(p => ({ ...p, vista: vistaPrincipal, origem: 'layer' }));
    comp._layer = lc.posicoes.length;
    componentes.push(comp);
  }
  // 5) rótulos escritos na vista principal: dão a posição ao que não tem; o que só existe como rótulo vira componente
  const porTipo = new Map();
  for (const t of rotulosPrincipal) {
    if (/^[\d.,\s]+$/.test(t.s) || t.s.length < 3) continue;
    const c = componenteDoPerfil(perfil, t.s);
    if (!c) continue;
    (porTipo.get(c.tipo) || porTipo.set(c.tipo, { c, ts: [] }).get(c.tipo)).ts.push(t);
  }
  for (const { c, ts } of porTipo.values()) {
    const pos = ts.map(t => ({ x: r2(t.x), y: r2(t.y), vista: vistaPrincipal, origem: 'texto' }));
    const ja = componentes.find(x => x.tipo === c.tipo);
    if (ja) {
      ja.fontes.push(`texto na principal: "${ts[0].s.slice(0, 50)}"`);
      if (!ja.posicoes.some(p => p.vista === vistaPrincipal)) ja.posicoes = pos.concat(ja.posicoes);
      continue;
    }
    if (c.unidade !== 'un') continue;
    const comp = novo(c, ts[0].s, { fonte: 'texto', fontes: ts.slice(0, 3).map(t => `texto na principal: "${t.s.slice(0, 50)}"`), conferir: true });
    comp.posicoes = pos;
    comp._rotulos = ts.length;
    componentes.push(comp);
  }
  // 6) diagrama unifilar: o que ele cita e as listas não têm (QGBT, disjuntor geral); o que já existe, confirma
  const doDiagrama = new Map();
  for (const p of diagrama) {
    const c = componenteDoPerfil(perfil, p.s);
    if (!c || c.unidade !== 'un') continue;
    (doDiagrama.get(c.tipo) || doDiagrama.set(c.tipo, { c, ps: [] }).get(c.tipo)).ps.push(p);
  }
  for (const { c, ps } of doDiagrama.values()) {
    const ja = componentes.find(x => x.tipo === c.tipo);
    if (ja) { ja.fontes.push(`diagrama: "${ps[0].s.slice(0, 60)}"`); for (const p of ps) confrontar(ja, especificacaoDe(p.s), `O diagrama ("${p.s.slice(0, 50)}")`); continue; }
    const comp = novo(c, ps[0].s, { fonte: 'diagrama', fontes: ps.slice(0, 3).map(p => `diagrama: "${p.s.slice(0, 60)}"`), conferir: true });
    comp._diagrama = ps.length;
    // "(3)TC.../5A", "3x FUSÍVEL": a quantidade escrita na frente
    const q = /^\s*\((\d{1,2})\)|^\s*(\d{1,2})\s*[xX]\s*[A-Za-zÀ-ú]/.exec(ps[0].s);
    if (q) comp._qtdDiagrama = Number(q[1] || q[2]);
    componentes.push(comp);
  }

  // quantidade: a coluna da lista; senão a contagem na principal (balões, blocos); senão vistas de apoio; senão null
  for (const comp of componentes) {
    const naPrincipal = comp._baloes || comp._blocos || 0;
    if (comp.quantidade != null) {
      if (naPrincipal && naPrincipal !== comp.quantidade && comp.unidade !== 'm') avisos.push(`${comp.descricao.slice(0, 50)}: a lista diz ${comp.quantidade}, a vista principal mostra ${naPrincipal} — vale a lista [CONFERIR].`);
      comp.motivo = 'quantidade da coluna da lista';
    } else if (comp.unidade === 'm') {
      comp.conferir = true;
      comp.motivo = 'comprimento não escrito: medir no desenho [CONFERIR]';
    } else if (comp._baloes) {
      comp.quantidade = comp._baloes;
      comp.motivo = 'contagem pelos balões da vista principal';
      if (comp._blocos && comp._blocos !== comp._baloes) avisos.push(`${comp.descricao.slice(0, 50)}: ${comp._baloes} balão(ões) e ${comp._blocos} bloco(s) na vista principal [CONFERIR].`);
      // terminação/mufla unipolar: o balão aponta o conjunto trifásico
      const c = componenteDoPerfil(perfil, comp.descricao);
      if (c?.porFase && comp.especificacao.polos === 1 && comp._baloes < 3) {
        comp.quantidade = comp._baloes * 3;
        comp.conferir = true;
        comp.motivo = `${comp._baloes} balão(ões) no conjunto; peça unipolar → ${comp._baloes * 3} (uma por fase) [CONFERIR]`;
      }
    } else if (comp._blocos) {
      comp.quantidade = comp._blocos;
      comp.motivo = 'contagem dos blocos na vista principal';
    } else if (comp._ehPrincipal) {
      // a mesma peça aparece em vários cortes: o máximo de balões numa vista só
      const porVista = baloesVistas.map(v => ({ v, n: v.baloes.filter(b => b.n === comp._numero).length })).filter(x => x.n).sort((a, b) => b.n - a.n);
      if (porVista.length) {
        comp.quantidade = porVista[0].n;
        comp.conferir = true;
        comp.motivo = `sem balão na vista principal; ${porVista[0].n} balão(ões) em "${porVista[0].v.titulo || porVista[0].v.id}" [CONFERIR]`;
        comp.fontes.push(`balões em ${porVista.length} vista(s) de apoio`);
      } else {
        comp.conferir = true;
        comp.motivo = 'quantidade não escrita nem indicada por balão ou bloco [CONFERIR]';
      }
    } else if (comp._layer) {
      comp.quantidade = comp._layer;
      comp.conferir = true;
      comp.motivo = `pela layer: ${comp._layer} grupo(s) de desenho na vista principal [CONFERIR]`;
    } else if (comp._rotulos) {
      comp.quantidade = comp._rotulos;
      comp.conferir = true;
      comp.motivo = `${comp._rotulos} rótulo(s) escrito(s) na vista principal [CONFERIR]`;
    } else if (comp._chamadas) {
      comp.conferir = true;
      comp.motivo = `chamada por balão no desenho de "${comp.lista}" (${comp._chamadas}×) — a chamada não é contagem; quantidade não escrita [CONFERIR]`;
    } else if (comp._diagrama) {
      comp.quantidade = comp._qtdDiagrama || 1;
      comp.conferir = true;
      comp.motivo = comp._qtdDiagrama ? `quantidade escrita no diagrama ("${comp.descricao.slice(0, 30)}") [CONFERIR]` : 'citado no diagrama unifilar (1 por citação) [CONFERIR]';
    } else {
      comp.conferir = true;
      comp.motivo = comp.fonte === 'layer' ? 'só o nome da layer — sem desenho na vista principal [CONFERIR]' : 'quantidade não escrita [CONFERIR]';
    }
    for (const k of Object.keys(comp)) if (k.startsWith('_')) delete comp[k];
  }
  // balão na principal sem item na relação; itens que faltam na numeração da relação
  if (principal) {
    const semItem = [...new Set(baloesPrincipal.filter(b => !principal.itens.some(i => i.numero === b.n)).map(b => b.n))];
    if (semItem.length) avisos.push(`Balão(ões) ${semItem.map(n => String(n).padStart(2, '0')).join(', ')} na vista principal sem item na "${principal.titulo}" [CONFERIR].`);
    if (principal.faltando?.length) avisos.push(`"${principal.titulo}": os itens ${faixas(principal.faltando)} não estão no texto do desenho (apagados, em imagem ou em outra folha) — não foram inventados [CONFERIR].`);
  }
  componentes.forEach((c, i) => { c.id = `C${String(i + 1).padStart(2, '0')}`; });
  return { componentes, avisos, listaPrincipal: principal?.titulo || null };
}

// [3,4,5,6,7,8,10,12,13] → "03–08, 10, 12, 13"
function faixas(ns) {
  const p = (n) => String(n).padStart(2, '0');
  const out = [];
  for (let i = 0; i < ns.length; i++) {
    let j = i;
    while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++;
    out.push(j - i >= 2 ? `${p(ns[i])}–${p(ns[j])}` : ns.slice(i, j + 1).map(p).join(', '));
    i = j;
  }
  return out.join(', ');
}

module.exports = { paragrafos, lerLegendas, itensNumTexto, linhaNumerada, lerBaloes, alvoDoBalao, especificacaoDe, dadosMediaTensao, montarComponentes, faixas, RE_TITULO_LISTA };
