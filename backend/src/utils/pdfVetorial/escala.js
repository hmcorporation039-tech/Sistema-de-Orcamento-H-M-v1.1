// Parte da leitura vetorial de PDF (utils/pdfVetorial.js, que explica o método inteiro):
// escala do carimbo e passo 3c, escala por vista.
const { meioDoTexto } = require('./legenda');

// Escala do carimbo: "ESC. 1:50", "ESCALA 1/75" ou o "1:75" solto perto de
// um "ESCALA:" (o CAD separa em dois textos). A mais frequente; "SEM ESCALA" não conta.
function escalaDoCarimbo(textos) {
  const cont = {};
  const somar = (v, peso = 1) => { if (v >= 10 && v <= 2000) cont[v] = (cont[v] || 0) + peso; };
  for (const t of textos) {
    const m = t.s.match(/ESC(?:ALA)?\.?\s*[:=]?\s*1\s*[:/]\s*(\d{2,4})\b/i);
    if (m) { somar(+m[1], 2); continue; }
    const solto = t.s.match(/^1\s*[:/]\s*(\d{2,4})$/);
    if (solto && textos.some(e => /^ESC(ALA)?\b/i.test(e.s) && !/SEM ESCALA/i.test(e.s) && Math.hypot(e.x - t.x, e.y - t.y) < 200)) somar(+solto[1]);
  }
  const melhor = Object.entries(cont).sort((a, b) => b[1] - a[1])[0];
  return melhor ? Number(melhor[0]) : null;
}

// ── 3c) Escala por vista ─────────────────────────────────────────────────────
// Uma folha pode ter vistas em escalas diferentes (planta 1:50 + ampliação 1:25,
// detalhe 1:15…). Rótulos de escala: "ESC. 1:50", "ESCALA 1/75", o "1:50" solto
// do título da vista e "SEM ESCALA". Cada vista da folha (regiões do classificador)
// fica com o rótulo mais próximo; a linha medida usa a escala da vista onde está.
const PT_PARA_M = 25.4 / 72 / 1000;
function rotulosDeEscala(textos) {
  const rot = [];
  const valores = (s) => [...s.matchAll(/1\s*[:/]\s*(\d{1,4})\b/g)].map(m => +m[1]).filter(v => v >= 1 && v <= 2000);
  for (const t of textos) {
    const s = t.s.trim();
    const base = { x: t.x + t.w / 2, y: meioDoTexto(t), texto: t };
    if (/SEM\s+ESCALA|S\/\s*ESCALA|FORA DE ESCALA/i.test(s)) { rot.push({ ...base, valores: [0] }); continue; }
    const m = s.match(/ESC(?:ALA)?\.?\s*[:=]?\s*(1\s*[:/]\s*\d{1,4}.*)$/i);
    if (m) { const v = valores(m[1]); if (v.length) rot.push({ ...base, valores: v }); continue; }
    if (/^1\s*[:/]\s*\d{1,4}(\s*[,;eE]\s*1\s*[:/]\s*\d{1,4})*$/.test(s)) rot.push({ ...base, valores: valores(s) });
  }
  return rot;
}

// regiões da folha (classificador) → escala de cada vista. Rótulo do carimbo
// (dentro da região "carimbo") vale para a folha toda só quando é o único valor.
function escalasDaFolha(textos, regioesFolha = [], escalaInformada = null) {
  const rot = rotulosDeEscala(textos);
  const carimbos = regioesFolha.filter(r => r.tipo === 'carimbo').map(r => r.caixa);
  const noCarimbo = (r) => carimbos.some(c => r.x >= c[0] && r.x <= c[2] && r.y >= c[1] && r.y <= c[3]);
  const distintas = [...new Set(rot.flatMap(r => r.valores).filter(v => v > 0))].sort((a, b) => a - b);
  const temSemEscala = rot.some(r => r.valores.includes(0));
  const vistas = [];
  const porVista = !escalaInformada && (distintas.length > 1 || temSemEscala);
  if (porVista) {
    const daVista = rot.filter(r => !noCarimbo(r) && r.valores.length === 1);
    for (const reg of regioesFolha) {
      if (['carimbo', 'legenda'].includes(reg.tipo)) continue;
      const [x0, y0, x1, y1] = reg.caixa;
      const lim = Math.min(150, Math.max(40, 0.25 * Math.max(x1 - x0, y1 - y0)));
      let melhor = null;
      for (const r of daVista) {
        const d = Math.hypot(Math.max(x0 - r.x, 0, r.x - x1), Math.max(y0 - r.y, 0, r.y - y1));
        if (d <= lim && (!melhor || d < melhor.d)) melhor = { d, v: r.valores[0] };
      }
      vistas.push({ tipo: reg.tipo, caixa: reg.caixa, escala: melhor ? melhor.v : null });
    }
  }
  return { distintas, temSemEscala, vistas, porVista };
}

// a folha tem escala escrita (carimbo, título da vista, "SEM ESCALA")? Então a de reserva não é usada
const escalaEscrita = (textos) => !!escalaDoCarimbo(textos) || rotulosDeEscala(textos).length > 0;

module.exports = { escalaDoCarimbo, PT_PARA_M, rotulosDeEscala, escalasDaFolha, escalaEscrita };