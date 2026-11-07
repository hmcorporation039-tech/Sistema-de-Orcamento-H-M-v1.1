// Texto de CAD para todo o sistema (revisão de 02/11/2026, CAD-01 e CAD-11):
//   - limparMtext: os códigos de formatação do MTEXT (e do TEXT com "%%"), num
//     lugar só. Antes eram duas cópias (projetoDxf.js e arquitetura.js), cada uma
//     com um defeito diferente: os códigos de sublinhado, sobrelinha e riscado
//     (\L \l \O \o \K \k) não terminam em ";" e ficavam no texto — o título
//     "\LLEGENDA\l" não era reconhecido e a amostra da legenda virava ponto da
//     planta — ou apagavam tudo até o próximo ";" ("\LNOTAS:\l tomadas a 0,30 m
//     do piso; interruptores…" perdia a nota das tomadas). \U+XXXX ("Ø") também
//     ficava cru;
//   - lerAltura / alturaEscrita: a altura de instalação escrita no desenho
//     ("a 2,20m do piso", "h=0,30", "H: 1,10 m", "altura: 97,5 cm"). Antes eram
//     três leitores (disciplinasCad.alturaDoTexto, tiposDePonto.alturaEscrita e
//     as regex de pontosDoDesenho) e "Tomada alta a 2,20m do piso" saía no piso
//     num deles (CAD-02).
// Nenhum dado de cliente aqui.

// ── MTEXT ────────────────────────────────────────────────────────────────
// códigos que levam parâmetro até o ";": fonte, altura, cor, alinhamento,
// inclinação, espaçamento, largura, parágrafo
const COM_PARAMETRO = new Set(['f', 'F', 'H', 'C', 'c', 'A', 'Q', 'T', 'W', 'p']);
// liga/desliga sem parâmetro: sublinhado, sobrelinha, riscado
const ALTERNA = new Set(['L', 'l', 'O', 'o', 'K', 'k']);
// \M+NXXXX: caractere multibyte pela página de código N (1 = japonês, 2 = chinês
// tradicional, 3 = coreano, 4 = coreano Johab, 5 = chinês simplificado)
const PAGINAS_MBCS = { 1: 'shift_jis', 2: 'big5', 3: 'euc-kr', 4: 'johab', 5: 'gbk' };
function multibyte(n, hex) {
  try {
    const cod = parseInt(hex, 16);
    return new TextDecoder(PAGINAS_MBCS[n], { fatal: true }).decode(Uint8Array.from([cod >> 8, cod & 0xff]));
  } catch {
    return '';
  }
}
// "\S1/2;" (fração), "\S2^;" (expoente), "\S^2;" (índice), "\S1#2;" → "1/2", "2", "2", "1/2"
function empilhado(conteudo) {
  const [a = '', b = ''] = conteudo.split(/[/^#]/);
  return a && b ? `${a.trim()}/${b.trim()}` : (a || b).trim();
}

// Texto do MTEXT/TEXT sem os códigos de formatação. `quebra` substitui o fim de
// parágrafo (\P), a quebra de coluna (\N) e a linha de cota (\X): '\n' para
// remontar linhas (projetoDxf.js), ' ' para nome de sala (arquitetura.js).
function limparMtext(texto, { quebra = '\n' } = {}) {
  const s = String(texto ?? '');
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '{' || c === '}') continue; // grupo de formatação
    if (c !== '\\' || i + 1 >= s.length) { out += c; continue; }
    const d = s[i + 1];
    if (d === '\\' || d === '{' || d === '}') { out += d; i++; continue; }
    if (d === 'P' || d === 'N' || d === 'X') { out += quebra; i++; continue; }
    if (d === '~') { out += ' '; i++; continue; }
    if (ALTERNA.has(d)) { i++; continue; }
    if (d === 'U' && s[i + 2] === '+') {
      const m = /^[0-9A-Fa-f]{4,5}/.exec(s.slice(i + 3, i + 8));
      if (m) { out += String.fromCodePoint(parseInt(m[0], 16)); i += 2 + m[0].length; continue; }
    }
    if (d === 'M' && s[i + 2] === '+') {
      const m = /^([1-5])([0-9A-Fa-f]{4})/.exec(s.slice(i + 3, i + 8));
      if (m) { out += multibyte(Number(m[1]), m[2]); i += 7; continue; }
    }
    if (d === 'S' || COM_PARAMETRO.has(d)) {
      const fim = s.indexOf(';', i + 2);
      if (fim < 0) { i++; continue; } // sem ";": some só o código
      if (d === 'S') out += empilhado(s.slice(i + 2, fim));
      i = fim;
      continue;
    }
    // código desconhecido: fica a letra (como o AutoCAD mostra)
    out += d;
    i++;
  }
  return out
    .replace(/%%[cC]/g, 'Ø').replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/%%[uUoOkK]/g, '')
    .replace(/%%(\d{3})/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/ /g, ' ');
}

// ── Altura de instalação ─────────────────────────────────────────────────
// Sem unidade: acima de 10 é cm ("h=30") e até 10 é metro ("h=2,2", poste "h=8");
// "mm" e "cm" valem o que dizem — a mesma regra em todo o sistema.
const metros = (v, un) => {
  const n = Number(String(v).replace(',', '.'));
  if (un) return /^mm$/i.test(un) ? n / 1000 : /^cm$/i.test(un) ? n / 100 : n;
  return n > 10 ? n / 100 : n;
};
// "2,20m do piso", "a 0,30 m do piso", "1,20 do piso", "a 1.20m do chão" (06/11/2026: "do chão" e "ao piso")
const RE_ALTURA_PISO = /([0-9]+(?:[.,][0-9]+)?)\s*(mm|cm|m)?\s*(?:do|ao)\s+(?:piso|ch[ãa]o)/i;
// "h=0,30", "H = 1,10 m", "h: 1,10 m", "altura: 97,5 cm", "altura 2,20"; e (06/11/2026) "Altura de
// instalação: 1,20 m", "Altura de montagem = 2,40m", "H(m)=1,10" — a unidade entre parênteses vale
// como a escrita depois do número (grupo 1: unidade do "H(m)"; 2: valor; 3: unidade depois do valor)
const RE_ALTURA_H = /(?:\bh\s*(?:\(\s*(mm|cm|m)\s*\))?\s*[=:]|\baltura\b(?:\s+d[eoa]\s+(?:instala[çc][ãa]o|montagem|fixa[çc][ãa]o|centro))?\s*(?:\(\s*(?:mm|cm|m)\s*\))?\s*[=:]?)\s*([0-9]+(?:[.,][0-9]+)?)\s*(mm|cm|m)?/i;
const RE_ABAIXO_DO_FORRO = /abaixo\s+do\s+forro/i;
// "Altura (cm): 110" — a unidade entre parênteses depois de "altura" (o RE_ALTURA_H só guarda a do "H(m)")
const RE_UNIDADE_PARENTESES = /\baltura\b[^(\d]{0,30}\(\s*(mm|cm|m)\s*\)/i;

// Altura escrita num texto → { altura_m, abaixoDoForro } ou null quando não diz.
// "h= 20 cm abaixo do forro": a medida é a partir do forro (abaixoDoForro: true).
function lerAltura(texto) {
  const s = String(texto || '');
  const p = RE_ALTURA_PISO.exec(s);
  const h = p ? null : RE_ALTURA_H.exec(s);
  if (!p && !h) return null;
  const v = p ? metros(p[1], p[2]) : metros(h[2], h[3] || h[1] || RE_UNIDADE_PARENTESES.exec(s)?.[1]);
  if (!Number.isFinite(v)) return null;
  return { altura_m: Math.round(v * 100) / 100, abaixoDoForro: RE_ABAIXO_DO_FORRO.test(s) };
}
// só a altura a partir do piso, em metros (0 < h ≤ 30), ou null
function alturaEscrita(texto) {
  const a = lerAltura(texto);
  return a && !a.abaixoDoForro && a.altura_m > 0 && a.altura_m <= 30 ? a.altura_m : null;
}

module.exports = { limparMtext, lerAltura, alturaEscrita, metros, RE_ALTURA_PISO, RE_ALTURA_H, RE_ABAIXO_DO_FORRO };
