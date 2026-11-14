// COR DA INFRAESTRUTURA POR TIPO (pedido do usuário em 09/11/2026: "diferenciar a
// infraestrutura por cores também é bem interessante. Eletrodutos e seus componentes uma
// cor, eletrocalhas outra, corrugados outra cor e assim sucessivamente, isso de acordo com
// cada projeto"). Antes a cor saía de DISCIPLINAS[k].cor — toda a infraestrutura da
// elétrica era laranja, fosse eletrocalha, eletroduto rígido ou corrugado.
//
// Agora a cor é do TIPO de infraestrutura, em todas as disciplinas (a disciplina continua
// como filtro no 3D):
//   1) a cor do PROJETO, quando ele define: a legenda (opcoes.legendaInfra) ou a cor da
//      entidade/layer no DXF (trecho.cor '#rrggbb', trecho.cor_aci 1–255 ou
//      trecho.cor_rgb truecolor, com trecho.cor_fonte 'legenda' | 'entidade' | 'layer');
//   2) senão a PALETA PADRÃO abaixo (um lugar só, tons distintos entre os tipos);
//   3) o caminho SUGERIDO pelo sistema continua na cor própria e translúcido.
// Os componentes da infraestrutura (curvas, luvas, conduletes, caixas de passagem e as
// descidas) saem na cor do tipo — o visualizador desenha com g.cor.
//
// Só no Node (modelo3d.js): a cena leva g.tipoInfra, g.cor, g.cor_fonte e a legenda pronta
// (cena.legendaInfra); o visualizador não recalcula nada.

// Cores ACI do AutoCAD (índice 0–255 → RGB): a tabela do pacote dxf, que o sistema já usa
// para ler o desenho. Fora do Node (bundle) o require falha e a ACI não é convertida.
let ACI = null;
try { ACI = require('dxf/lib/util/colors').default; } catch (e) { ACI = null; }

// Paleta padrão por tipo (tons de famílias diferentes, legíveis no fundo escuro do 3D e
// distintos entre si; o sugerido fica com a cor própria, ver modelo3d.js COR_SUGERIDO)
const TIPOS_INFRA = {
  eletroduto_rigido: { rotulo: 'Eletroduto rígido (e curvas, luvas, buchas, conduletes)', cor: '#ff7f0e' },
  eletroduto_flexivel: { rotulo: 'Eletroduto flexível corrugado', cor: '#ffd23f' },
  eletroduto_enterrado: { rotulo: 'Eletroduto enterrado (PEAD)', cor: '#a0662b' },
  eletroduto: { rotulo: 'Eletroduto (material não informado no projeto)', cor: '#c9c3b8' },
  eletrocalha: { rotulo: 'Eletrocalha', cor: '#2f8cff' },
  perfilado: { rotulo: 'Perfilado', cor: '#22c7d6' },
  leito: { rotulo: 'Leito para cabos', cor: '#9b6bff' },
  canaleta: { rotulo: 'Canaleta', cor: '#ff5fb4' },
  duto_piso: { rotulo: 'Duto de piso', cor: '#b5c22b' },
  duto_ar: { rotulo: 'Duto de ar (climatização)', cor: '#7bd88f' },
  fiacao: { rotulo: 'Fiação / cabos (sem infraestrutura desenhada)', cor: '#eef0f2' },
  sugerido: { rotulo: 'Caminho sugerido pelo sistema (não é do projeto)', cor: '#8fe9ff' },
};
// ordem da legenda
const ORDEM_TIPOS = Object.keys(TIPOS_INFRA);

const hex2 = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
const rgbHex = ([r, g, b]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
// cor ACI (1–255; 0 = BYBLOCK e 256 = BYLAYER não são cor) → '#rrggbb'
function corAci(n) {
  const i = Number(n);
  if (!Number.isInteger(i) || i < 1 || i > 255 || !ACI || !ACI[i]) return null;
  return rgbHex(ACI[i]);
}
// truecolor do DXF (código 420: 0xRRGGBB) → '#rrggbb'
function corRgb(v) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 0xffffff) return null;
  return rgbHex([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
const corHex = (s) => (typeof s === 'string' && /^#?[0-9a-f]{6}$/i.test(s.trim()) ? `#${s.trim().replace('#', '').toLowerCase()}` : null);
// a cor que o trecho do projeto traz (hex, truecolor ou ACI), com a fonte
function corDoTrecho(t) {
  if (!t || typeof t !== 'object') return null;
  const cor = corHex(t.cor) || corRgb(t.cor_rgb) || corAci(t.cor_aci);
  if (!cor) return null;
  // branco/preto ACI 7 (cor "do fundo" no CAD) não distingue tipo nenhum: não vale como cor do tipo
  if (Number(t.cor_aci) === 7 || cor === '#ffffff' || cor === '#000000') return null;
  const fonte = ['legenda', 'entidade', 'layer'].includes(t.cor_fonte) ? t.cor_fonte : 'layer';
  return { cor, fonte };
}

// Tipo da infraestrutura do grupo/trecho: pelo tipo do traçado e, no eletroduto, pelo
// material e pela layer (rígido, corrugado, PEAD enterrado, duto de piso)
function tipoDeInfra(g) {
  if (!g) return 'eletroduto';
  if (g.sugerido) return 'sugerido';
  const tipo = String(g.tipo || '').toLowerCase();
  if (tipo === 'fiacao' || g.forma === 'linha') return 'fiacao';
  if (tipo === 'eletrocalha') return 'eletrocalha';
  if (tipo === 'perfilado') return 'perfilado';
  if (tipo === 'leito') return 'leito';
  if (tipo === 'canaleta') return 'canaleta';
  if (tipo === 'duto') return 'duto_ar';
  if (tipo === 'duto_piso') return 'duto_piso';
  const txt = `${g.material || ''} ${g.rotulo || ''} ${(g.layers || []).join(' ')} ${g.layer || ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  if (/DUTO\s*(DE\s*)?PISO|PISO\s*ELEVADO/.test(txt)) return 'duto_piso';
  if (/CANALETA/.test(txt)) return 'canaleta';
  if (/PEAD|ENTERRAD|KANALEX|SUBTERR/.test(txt)) return 'eletroduto_enterrado';
  if (/CORRUG|FLEXIV|FLEX\b|SANFON/.test(txt)) return 'eletroduto_flexivel';
  if (/RIGID|GALVAN|ACO\b|A[CÇ]O\s|FERRO|PVC\s*R|ROSCAVEL|ELETRODUTO\s*R\b/.test(txt)) return 'eletroduto_rigido';
  return 'eletroduto';
}

// legendaInfra (do projeto): [{ tipo: 'eletrocalha', cor: '#1f77b4' | cor_aci | cor_rgb }] ou
// { eletrocalha: '#1f77b4' } — a cor que a LEGENDA do projeto dá a cada tipo
function coresDaLegenda(legenda) {
  const out = {};
  const lista = Array.isArray(legenda) ? legenda : legenda && typeof legenda === 'object' ? Object.entries(legenda).map(([tipo, cor]) => (typeof cor === 'object' ? { tipo, ...cor } : { tipo, cor })) : [];
  for (const l of lista) {
    const tipo = TIPOS_INFRA[l?.tipo] ? l.tipo : tipoDeInfra({ tipo: l?.tipo, material: l?.material || l?.descricao, rotulo: l?.rotulo });
    const c = corDoTrecho({ ...l, cor_fonte: 'legenda' });
    if (c && !out[tipo]) out[tipo] = c;
  }
  return out;
}

// Cor de cada grupo da infraestrutura (mutável: g.tipoInfra, g.cor, g.cor_fonte, g.cor_projeto):
//   - o grupo com cor própria do projeto (entidade/layer) fica com ela;
//   - o tipo com cor na legenda do projeto, ou com cor no projeto em algum grupo (a do maior
//     comprimento), passa essa cor aos grupos do tipo que não têm cor própria;
//   - o resto, a paleta padrão do tipo.
function aplicarCoresInfra(infra, { legendaInfra = null } = {}) {
  const daLegenda = coresDaLegenda(legendaInfra);
  const doTipo = {};
  for (const g of infra || []) {
    g.tipoInfra = g.tipoInfra || tipoDeInfra(g);
    const c = g.sugerido ? null : (g.cor_projeto || null);
    if (!c) continue;
    const k = g.tipoInfra;
    const a = doTipo[k] || (doTipo[k] = new Map());
    a.set(`${c.cor}|${c.fonte}`, (a.get(`${c.cor}|${c.fonte}`) || 0) + (Number(g.comprimento_m) || 0));
  }
  const corTipo = {};
  for (const k of ORDEM_TIPOS) {
    if (daLegenda[k]) { corTipo[k] = daLegenda[k]; continue; }
    const m = doTipo[k];
    if (m && m.size) {
      const [chave] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
      const [cor, fonte] = chave.split('|');
      corTipo[k] = { cor, fonte };
    }
  }
  for (const g of infra || []) {
    const k = g.tipoInfra;
    if (g.sugerido) { g.cor = TIPOS_INFRA.sugerido.cor; g.cor_fonte = 'padrao'; continue; }
    const c = (k !== 'sugerido' && daLegenda[k]) || g.cor_projeto || corTipo[k] || null;
    g.cor = c ? c.cor : (TIPOS_INFRA[k] || TIPOS_INFRA.eletroduto).cor;
    g.cor_fonte = c ? c.fonte : 'padrao';
  }
  return infra;
}

const ROTULO_FONTE_COR = { legenda: 'cor da legenda do projeto', entidade: 'cor do traçado no desenho (DXF)', layer: 'cor da layer no desenho (DXF)', padrao: 'cor padrão do sistema por tipo' };

// Legenda de cores da infraestrutura: SÓ os tipos presentes no projeto, com a cor, o nome,
// as medidas encontradas, a metragem e a fonte da cor (projeto ou padrão)
function legendaDeCores(infra) {
  const por = new Map();
  for (const g of infra || []) {
    const k = g.tipoInfra || tipoDeInfra(g);
    if (!por.has(k)) por.set(k, { tipo: k, rotulo: (TIPOS_INFRA[k] || TIPOS_INFRA.eletroduto).rotulo, cores: new Map(), medidas: new Set(), materiais: new Set(), comprimento_m: 0, disciplinas: new Set(), grupos: 0 });
    const e = por.get(k);
    e.grupos++;
    e.comprimento_m += Number(g.comprimento_m) || 0;
    if (g.medida) e.medidas.add(String(g.medida));
    if (g.material) e.materiais.add(String(g.material));
    if (g.disciplina) e.disciplinas.add(String(g.disciplina));
    const kc = `${g.cor}|${g.cor_fonte || 'padrao'}`;
    e.cores.set(kc, (e.cores.get(kc) || 0) + (Number(g.comprimento_m) || 0));
  }
  return [...por.values()].sort((a, b) => ORDEM_TIPOS.indexOf(a.tipo) - ORDEM_TIPOS.indexOf(b.tipo)).map(e => {
    const [cor, fonte] = [...e.cores.entries()].sort((a, b) => b[1] - a[1])[0][0].split('|');
    return {
      tipo: e.tipo, rotulo: e.rotulo, cor, cor_fonte: fonte, fonte_texto: ROTULO_FONTE_COR[fonte] || fonte,
      // mais de uma cor no mesmo tipo (o projeto pinta cada trecho com a sua): as outras
      outras_cores: [...e.cores.keys()].map(k => k.split('|')[0]).filter(c => c !== cor),
      medidas: [...e.medidas].sort(), materiais: [...e.materiais].sort(), comprimento_m: Math.round(e.comprimento_m * 10) / 10,
      disciplinas: [...e.disciplinas].sort(), grupos: e.grupos,
    };
  });
}

module.exports = { TIPOS_INFRA, ORDEM_TIPOS, tipoDeInfra, corAci, corRgb, corDoTrecho, coresDaLegenda, aplicarCoresInfra, legendaDeCores, ROTULO_FONTE_COR };
