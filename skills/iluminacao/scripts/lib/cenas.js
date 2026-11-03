// Grupos de luminárias e cenas de iluminação por ambiente (fase 5 do roteiro de
// 02/11/2026): em vez de só contar teclados, o projeto diz QUAIS cenas existem
// (nome) e o nível de cada grupo em cada uma (%). Vão para o modelo único da
// instalação (comando.cenas, ponto.grupo) e para o simulador do 3D.
//
// Formulário (dados):
//   grupos: [{ ambiente, grupo, luminarias }]  luminarias = "1-4, 7" (posição na grade,
//           1 = canto de origem, linha a linha), "fila 1", "filas 1-2", "coluna 3",
//           "todas" ou vazio/"demais" (as que sobraram). Sem linha: grupo único "Geral".
//   cenas:  [{ ambiente, nome, niveis }]  niveis = "Quadro 100; Plateia 30" ou
//           "Quadro=100, Plateia=30" ou "70" (todos os grupos). Grupo não citado = 0 %.

const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const GRUPO_UNICO = 'Geral';
// controles com cenas: DALI-2 (botoeira) e o teclado de cenas
const COM_CENAS = ['dali', 'cena'];

// índices (base 0, ordem da grade j·nx + i) de uma especificação de grupo
function indicesDaEspec(espec, nx, ny) {
  const n = nx * ny;
  const t = normal(espec);
  if (!t || /^(demais|resto|restantes|outras)$/.test(t)) return null; // = as que sobraram
  if (/^(todas|todos|tudo)$/.test(t)) return [...Array(n).keys()];
  const r = new Set();
  for (const parte of t.split(/[;,]+/).map(s => s.trim()).filter(Boolean)) {
    const m = parte.match(/^(filas?|fileiras?|linhas?|colunas?)\s*(\d+)(?:\s*(?:-|a|ate)\s*(\d+))?$/);
    if (m) {
      const a = Number(m[2]), b = Number(m[3] || m[2]);
      for (let k = Math.min(a, b); k <= Math.max(a, b); k++) {
        if (/^col/.test(m[1])) { if (k >= 1 && k <= nx) for (let j = 0; j < ny; j++) r.add(j * nx + k - 1); }
        else if (k >= 1 && k <= ny) for (let i = 0; i < nx; i++) r.add((k - 1) * nx + i);
      }
      continue;
    }
    const f = parte.match(/^(\d+)(?:\s*(?:-|a|ate)\s*(\d+))?$/);
    if (!f) throw new Error(`não entendi "${parte}" (use 1-4, fila 1, coluna 2, todas ou demais)`);
    const a = Number(f[1]), b = Number(f[2] || f[1]);
    for (let k = Math.min(a, b); k <= Math.max(a, b); k++) if (k >= 1 && k <= n) r.add(k - 1);
  }
  return [...r].sort((x, y) => x - y);
}

// "Quadro 100; Plateia 30" → { padrao, niveis: { grupo: 0–1 } }
function lerNiveis(texto, grupos) {
  const t = String(texto ?? '').trim();
  const niveis = {};
  const desconhecidos = [];
  if (!t) return { padrao: 0, niveis, desconhecidos };
  const so = t.replace('%', '').replace(',', '.');
  if (/^\d+(\.\d+)?$/.test(so)) return { padrao: Math.min(100, Number(so)) / 100, niveis, desconhecidos };
  let padrao = 0;
  for (const parte of t.split(/[;\n]+|,(?!\d)/).map(s => s.trim()).filter(Boolean)) {
    const m = parte.match(/^(.+?)\s*[=:]?\s*(\d+(?:[.,]\d+)?)\s*%?$/);
    if (!m) { desconhecidos.push(parte); continue; }
    const v = Math.max(0, Math.min(100, Number(m[2].replace(',', '.')))) / 100;
    const nome = m[1].trim();
    if (/^(\*|todos|todas|demais|resto)$/i.test(normal(nome))) { padrao = v; continue; }
    const g = grupos.find(x => normal(x) === normal(nome));
    if (g) niveis[g] = v; else desconhecidos.push(nome);
  }
  return { padrao, niveis, desconhecidos };
}

// Grupos e cenas do ambiente `a` (já calculado: nx, ny, n, controle) a partir das
// linhas do formulário. → { grupos: [{ nome, luminarias: [índices] }], grupoDe: [nome por
// luminária], cenas: [{ nome, niveis: { grupo: 0–1 }, padrao }] }
function gruposECenas(a, linhasGrupos = [], linhasCenas = [], avisos = []) {
  const doAmb = (l) => normal(l?.ambiente) === normal(a.nome);
  const n = a.n;
  const grupoDe = Array(n).fill(null);
  const grupos = [];
  const pendentes = [];
  for (const l of (linhasGrupos || []).filter(doAmb)) {
    const nome = String(l.grupo || '').trim() || `Grupo ${grupos.length + 1}`;
    if (grupos.some(g => normal(g.nome) === normal(nome))) { avisos.push(`${a.nome}: grupo "${nome}" repetido — vale a primeira linha.`); continue; }
    let idx;
    try { idx = indicesDaEspec(l.luminarias, a.nx, a.ny); } catch (e) { avisos.push(`${a.nome}, grupo "${nome}": ${e.message}.`); continue; }
    const g = { nome, luminarias: [] };
    grupos.push(g);
    if (idx === null) { pendentes.push(g); continue; }
    for (const k of idx) {
      if (k >= n) continue;
      if (grupoDe[k] != null) { avisos.push(`${a.nome}: luminária ${k + 1} está nos grupos "${grupoDe[k]}" e "${nome}" — fica no primeiro.`); continue; }
      grupoDe[k] = nome;
      g.luminarias.push(k);
    }
  }
  // "demais" / sem grupo
  const sobra = grupoDe.map((g, k) => (g == null ? k : -1)).filter(k => k >= 0);
  if (sobra.length) {
    const g = pendentes[0] || grupos.find(x => normal(x.nome) === normal(GRUPO_UNICO)) || (grupos.push({ nome: grupos.length ? 'Demais' : GRUPO_UNICO, luminarias: [] }), grupos[grupos.length - 1]);
    for (const k of sobra) { grupoDe[k] = g.nome; g.luminarias.push(k); }
  }
  for (const g of pendentes.slice(sobra.length ? 1 : 0)) if (!g.luminarias.length) avisos.push(`${a.nome}: grupo "${g.nome}" ficou sem luminárias.`);
  const nomes = grupos.filter(g => g.luminarias.length).map(g => g.nome);

  const linhas = (linhasCenas || []).filter(doAmb);
  const cenas = [];
  if (linhas.length && !COM_CENAS.includes(a.controle)) {
    avisos.push(`${a.nome}: ${linhas.length} cena(s) informada(s), mas o controle do ambiente não é DALI-2 nem teclado de cenas — cenas ignoradas.`);
  } else {
    for (const l of linhas) {
      const nome = String(l.nome || '').trim() || `Cena ${cenas.length + 1}`;
      const r = lerNiveis(l.niveis, nomes);
      if (r.desconhecidos.length) avisos.push(`${a.nome}, cena "${nome}": ${r.desconhecidos.map(x => `"${x}"`).join(', ')} não é grupo do ambiente (grupos: ${nomes.join(', ')}).`);
      cenas.push({ nome, niveis: r.niveis, padrao: r.padrao });
    }
    if (cenas.length > 4 && a.controle === 'cena') avisos.push(`${a.nome}: ${cenas.length} cenas — o teclado padrão tem 4 cenas + liga/desliga; prever teclado maior ou botoeira programável. [CONFERIR]`);
  }
  return { grupos: grupos.filter(g => g.luminarias.length), grupoDe, cenas };
}

// nível (0–1) de um grupo numa cena
const nivelNaCena = (cena, grupo) => (cena.niveis && grupo in cena.niveis ? cena.niveis[grupo] : cena.padrao || 0);

// texto "Quadro 100 % · Plateia 30 %" de uma cena
function textoCena(cena, grupos) {
  return grupos.map(g => `${g} ${Math.round(nivelNaCena(cena, g) * 100)} %`).join(' · ');
}

module.exports = { gruposECenas, indicesDaEspec, lerNiveis, nivelNaCena, textoCena, GRUPO_UNICO, COM_CENAS };
