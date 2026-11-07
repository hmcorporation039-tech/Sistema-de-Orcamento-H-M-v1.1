// Parte da leitura vetorial de PDF (utils/pdfVetorial.js, que explica o método inteiro):
// escala do carimbo e passo 3c, escala por vista.
const { meioDoTexto } = require('./legenda');

// Título de vista que NÃO é a planta: a escala escrita nele só vale para a região dele. Antes, "DETALHE ESC. 1:25"
// a ~95 pt do carimbo 1:50 virava a escala da planta (linha de 500 pt saía 4,4 m em vez de 8,8 m, sem aviso).
const PALAVRA_DETALHE = '(?:DETALHES?|AMPLIA[ÇC](?:[ÃA]O|[ÕO]ES)|CORTES?|VISTAS?|ELEVA[ÇC](?:[ÃA]O|[ÕO]ES)|ESQUEMAS?|DIAGRAMAS?|UNIFILAR)';
const RE_DETALHE = new RegExp(`\\b${PALAVRA_DETALHE}\\b`, 'i');
const RE_COMECA_DETALHE = new RegExp(`^\\W*${PALAVRA_DETALHE}\\b`, 'i');
const RE_PLANTA = /\bPLANTAS?\b/i;
const RE_COMECA_PLANTA = /^\W*PLANTAS?\b/i;
const RE_SEM_ESCALA = /SEM\s+ESCALA|S\/\s*ESCALA|FORA DE ESCALA/i;
// "ESC. 1:50", "ESCALA 1/75", "ESCALA - 1:50", "ESCALA: 1:50"
const RE_ROTULADA = /ESC(?:ALA)?\.?\s*[:=\-–]?\s*1\s*[:/]\s*(\d{1,4})\b/i;
// "PLANTA BAIXA 1:50", "DETALHE 2 1:25" (título da vista com a escala, sem a palavra ESCALA)
const RE_TITULO_COM_ESCALA = /\b(?:PLANTAS?|DETALHES?|AMPLIA[ÇC][ÃA]O|CORTES?|VISTAS?)\b.*?(?<![\d.,])1\s*[:/]\s*(\d{1,4})\b/i;

// De que vista é o rótulo: pelo próprio texto e, se ele não diz, pelo título ao lado (mesma linha, à esquerda) ou
// logo acima ("DETALHE 1" numa linha, "ESC. 1:25" na de baixo — o CAD separa os textos). Do vizinho só vale texto que
// COMEÇA com o tipo da vista: "DESENHO: PLANTA BAIXA E DETALHES" do carimbo não faz do "ESCALA: 1:50" um detalhe.
// → 'detalhe' | 'planta' | null
function tipoPeloTexto(s, soInicio) {
  if (RE_COMECA_DETALHE.test(s)) return 'detalhe';
  if (RE_COMECA_PLANTA.test(s)) return 'planta';
  if (soInicio) return null;
  if (RE_PLANTA.test(s)) return 'planta';
  if (RE_DETALHE.test(s)) return 'detalhe';
  return null;
}
function tipoDoRotulo(t, textos) {
  const proprio = tipoPeloTexto(t.s, false);
  if (proprio) return proprio;
  const h = t.h || 6;
  let melhor = null;
  for (const o of textos) {
    if (o === t) continue;
    const mesmaLinha = Math.abs(o.y - t.y) < h * 0.6 && o.x < t.x && t.x - (o.x + (o.w || 0)) < h * 4;
    const acima = o.y < t.y && t.y - o.y < h * 2.6 && o.x < t.x + (t.w || h * 4) && o.x + (o.w || 0) > t.x - h * 2;
    if (!mesmaLinha && !acima) continue;
    const tipo = tipoPeloTexto(o.s, true);
    const d = Math.hypot(o.x - t.x, o.y - t.y);
    if (tipo && (!melhor || d < melhor.d)) melhor = { tipo, d };
  }
  return melhor?.tipo || null;
}

// caixas das regiões do classificador → o ponto cai no carimbo?
const carimbosDe = (regioesFolha) => (regioesFolha || []).filter(r => r.tipo === 'carimbo').map(r => r.caixa);
const dentroDeAlguma = (caixas, x, y) => caixas.some(c => x >= c[0] && x <= c[2] && y >= c[1] && y <= c[3]);
const temPlanta = (regioesFolha) => (regioesFolha || []).some(r => r.tipo === 'planta');
const areaDe = (c) => (c[2] - c[0]) * (c[3] - c[1]);
const distCaixa = ([x0, y0, x1, y1], p) => Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(y0 - p.y, 0, p.y - y1));

// Escala do carimbo: "ESC. 1:50", "ESCALA 1/75", "ESCALA - 1:50", o "1:75" solto perto de um "ESCALA:" (o CAD
// separa em dois textos) e o título da planta com a escala ("PLANTA BAIXA 1:50"). "SEM ESCALA" não conta.
// Desempate (revisão de 06/11/2026 — antes o empate 1:50 × 1:25 dava o MENOR denominador e o 3D saía na metade):
//   1) a escala de detalhe/ampliação/corte não é a da planta (só vale quando não há outra e a folha não tem planta);
//   2) o rótulo dentro da região "carimbo" do classificador vale mais;
//   3) a mais frequente (rótulo com a palavra ESCALA ou título da vista pesa 2, o "1:50" solto 1);
//   4) a da vista de planta de maior área (rótulo mais perto dela);
//   5) ainda empatado: o maior denominador (planta, não detalhe) e `ambigua` com os valores — quem usa avisa.
// `regioesFolha` ([{ tipo, caixa }], do classificador) é opcional: sem ela valem 1, 3 e 5.
// → { escala, ambigua: [valores] | null }
function escalaDoCarimboDetalhada(textos, regioesFolha = []) {
  const carimbos = carimbosDe(regioesFolha);
  const cand = [];
  for (const t of textos) {
    let v = null, peso = 0;
    const m = RE_SEM_ESCALA.test(t.s) ? null : (t.s.match(RE_ROTULADA) || t.s.match(RE_TITULO_COM_ESCALA));
    if (m) { v = +m[1]; peso = 2; }
    else {
      const solto = t.s.match(/^1\s*[:/]\s*(\d{2,4})$/);
      if (solto && textos.some(e => /^ESC(ALA)?\b/i.test(e.s) && !RE_SEM_ESCALA.test(e.s) && Math.hypot(e.x - t.x, e.y - t.y) < 200)) { v = +solto[1]; peso = 1; }
    }
    if (!(v >= 10 && v <= 2000)) continue;
    const p = { x: t.x + (t.w || 0) / 2, y: meioDoTexto(t) };
    const noCarimbo = dentroDeAlguma(carimbos, p.x, p.y);
    // o rótulo dentro do carimbo é da folha, nunca de um detalhe
    cand.push({ v, peso, ...p, noCarimbo, detalhe: !noCarimbo && tipoDoRotulo(t, textos) === 'detalhe' });
  }
  if (!cand.length) return { escala: null, ambigua: null };
  // só de detalhe: vale para a folha só quando ela não tem vista de planta (folha só de detalhe, ou sem classificação)
  let lista = cand.filter(c => !c.detalhe);
  if (!lista.length) {
    if (temPlanta(regioesFolha)) return { escala: null, ambigua: null };
    lista = cand;
  }
  if (lista.some(c => c.noCarimbo)) lista = lista.filter(c => c.noCarimbo);
  const soma = new Map();
  for (const c of lista) soma.set(c.v, (soma.get(c.v) || 0) + c.peso);
  const max = Math.max(...soma.values());
  let empatadas = [...soma].filter(([, s]) => s === max).map(([v]) => v);
  // a da maior vista de planta: o valor com o rótulo mais perto dela (só se for estritamente o mais perto)
  const maior = (regioesFolha || []).filter(r => r.tipo === 'planta').sort((a, b) => areaDe(b.caixa) - areaDe(a.caixa))[0];
  if (empatadas.length > 1 && maior) {
    const d = empatadas.map(v => ({ v, d: Math.min(...lista.filter(c => c.v === v).map(c => distCaixa(maior.caixa, c))) })).sort((a, b) => a.d - b.d);
    if (d[0].d < d[1].d) empatadas = [d[0].v];
  }
  if (empatadas.length === 1) return { escala: empatadas[0], ambigua: null };
  const ord = [...empatadas].sort((a, b) => a - b);
  return { escala: ord[ord.length - 1], ambigua: ord };
}
const escalaDoCarimbo = (textos, regioesFolha = []) => escalaDoCarimboDetalhada(textos, regioesFolha).escala;

// ── 3c) Escala por vista ─────────────────────────────────────────────────────
// Uma folha pode ter vistas em escalas diferentes (planta 1:50 + ampliação 1:25,
// detalhe 1:15…). Rótulos de escala: "ESC. 1:50", "ESCALA 1/75", "ESCALA - 1:50", o "1:50" solto
// do título da vista, "PLANTA BAIXA 1:50" e "SEM ESCALA". Cada vista da folha (regiões do classificador)
// fica com o rótulo mais próximo DO MESMO TIPO (o de detalhe não vai para a planta, o da planta não vai para o
// detalhe); a linha medida usa a escala da vista onde está.
// `detalhe`: rótulo de detalhe/ampliação/corte/diagrama — e o "SEM ESCALA" sem título de planta também (planta de
// instalações sempre tem escala; o "SEM ESCALA" é do detalhe ou do unifilar ao lado). Rótulo no carimbo: nem um nem outro.
const PT_PARA_M = 25.4 / 72 / 1000;
function rotulosDeEscala(textos, regioesFolha = []) {
  const carimbos = carimbosDe(regioesFolha);
  const rot = [];
  const valores = (s) => [...s.matchAll(/1\s*[:/]\s*(\d{1,4})\b/g)].map(m => +m[1]).filter(v => v >= 1 && v <= 2000);
  for (const t of textos) {
    const s = t.s.trim();
    const base = () => {
      const x = t.x + t.w / 2, y = meioDoTexto(t);
      const tipo = dentroDeAlguma(carimbos, x, y) ? null : tipoDoRotulo(t, textos);
      return { x, y, texto: t, detalhe: tipo === 'detalhe', planta: tipo === 'planta' };
    };
    if (RE_SEM_ESCALA.test(s)) { const b = base(); rot.push({ ...b, detalhe: !b.planta, valores: [0] }); continue; }
    const m = s.match(/ESC(?:ALA)?\.?\s*[:=\-–]?\s*(1\s*[:/]\s*\d{1,4}.*)$/i);
    if (m) { const v = valores(m[1]); if (v.length) rot.push({ ...base(), valores: v }); continue; }
    const tit = s.match(RE_TITULO_COM_ESCALA);
    if (tit) { if (+tit[1] >= 1 && +tit[1] <= 2000) rot.push({ ...base(), valores: [+tit[1]] }); continue; }
    if (/^1\s*[:/]\s*\d{1,4}(\s*[,;eE]\s*1\s*[:/]\s*\d{1,4})*$/.test(s)) rot.push({ ...base(), valores: valores(s) });
  }
  return rot;
}

// regiões da folha (classificador) → escala de cada vista. Rótulo do carimbo
// (dentro da região "carimbo") vale para a folha toda só quando é o único valor.
// `distintasPlanta`: os valores que não são de detalhe (a escala da planta sai deles, nunca do detalhe).
// `porVista`: mais de uma escala, "SEM ESCALA" ou escala de detalhe na folha — cada trecho na escala da sua vista
// (a vista de planta sem rótulo próprio fica com a escala da planta: analise.js/medirLinha).
function escalasDaFolha(textos, regioesFolha = [], escalaInformada = null) {
  const rot = rotulosDeEscala(textos, regioesFolha);
  const carimbos = carimbosDe(regioesFolha);
  const noCarimbo = (r) => dentroDeAlguma(carimbos, r.x, r.y);
  const distintas = [...new Set(rot.flatMap(r => r.valores).filter(v => v > 0))].sort((a, b) => a - b);
  const distintasPlanta = [...new Set(rot.filter(r => !r.detalhe).flatMap(r => r.valores).filter(v => v > 0))].sort((a, b) => a - b);
  const temSemEscala = rot.some(r => r.valores.includes(0));
  const vistas = [];
  const porVista = !escalaInformada && (distintas.length > 1 || temSemEscala || rot.some(r => r.detalhe && r.valores.some(v => v > 0)));
  if (porVista) {
    const daVista = rot.filter(r => !noCarimbo(r) && r.valores.length === 1);
    for (const reg of regioesFolha) {
      if (['carimbo', 'legenda'].includes(reg.tipo)) continue;
      const [x0, y0, x1, y1] = reg.caixa;
      const lim = Math.min(150, Math.max(40, 0.25 * Math.max(x1 - x0, y1 - y0)));
      const ehPlanta = reg.tipo === 'planta';
      let melhor = null;
      for (const r of daVista) {
        // planta só com rótulo que não é de detalhe; detalhe/diagrama só com rótulo que não é de planta
        if (ehPlanta ? r.detalhe : r.planta) continue;
        const d = distCaixa(reg.caixa, r);
        if (d <= lim && (!melhor || d < melhor.d)) melhor = { d, v: r.valores[0] };
      }
      vistas.push({ tipo: reg.tipo, caixa: reg.caixa, escala: melhor ? melhor.v : null });
    }
  }
  return { distintas, distintasPlanta, temSemEscala, vistas, porVista };
}

// A escala da PLANTA da folha — a MESMA regra para a metragem (analise.js) e para o 3D (services/pdfParaDxf.js);
// antes o 3D usava só o carimbo e o quantitativo também o título da vista, e um podia sair diferente do outro.
// Ordem: informada → carimbo/título com a escala (escalaDoCarimboDetalhada) → o "1:50" solto do título da vista
// quando é o único valor de planta → `reserva` ({ escala, origem }: nome do arquivo, portas, cotas —
// utils/escalaDaPlanta.js), esta só quando a folha não tem nenhuma escala de planta escrita.
// → { escala, origem, ambigua? } (`ambigua`: valores empatados no texto; a usada é a maior — conferir)
function escalaDaPlanta(textos, regioesFolha = [], { informada = null, reserva = null } = {}) {
  if (Number(informada) > 0) return { escala: Number(informada), origem: 'informada' };
  const c = escalaDoCarimboDetalhada(textos, regioesFolha);
  if (c.escala) return { escala: c.escala, origem: 'carimbo', ...(c.ambigua ? { ambigua: c.ambigua } : {}) };
  const ef = escalasDaFolha(textos, regioesFolha);
  // só valores de detalhe e a folha sem vista de planta (folha só de detalhe): o do detalhe vale para ela
  const daPlanta = ef.distintasPlanta.length || temPlanta(regioesFolha) ? ef.distintasPlanta : ef.distintas;
  if (daPlanta.length === 1 && daPlanta[0] >= 10) return { escala: daPlanta[0], origem: 'titulo_vista' };
  if (!daPlanta.length && reserva?.escala) return { escala: reserva.escala, origem: reserva.origem };
  return { escala: null, origem: null };
}

// a folha tem escala DA PLANTA escrita (carimbo, título da vista)? Então a de reserva não é usada.
// "SEM ESCALA" (do detalhe, do unifilar) e a escala de um detalhe não contam: antes um "DETALHE 1 - SEM ESCALA"
// anulava a escala da folha inteira e o nome do arquivo, as portas e as cotas nem eram tentados.
function escalaEscrita(textos, regioesFolha = []) {
  if (escalaDoCarimbo(textos, regioesFolha)) return true;
  const rot = rotulosDeEscala(textos, regioesFolha).filter(r => r.valores.some(v => v > 0));
  return temPlanta(regioesFolha) ? rot.some(r => !r.detalhe) : rot.length > 0;
}

module.exports = { escalaDoCarimbo, escalaDoCarimboDetalhada, escalaDaPlanta, PT_PARA_M, rotulosDeEscala, escalasDaFolha, escalaEscrita };
