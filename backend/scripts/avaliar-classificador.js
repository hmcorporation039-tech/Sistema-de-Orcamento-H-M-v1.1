// Mede o classificador local de materiais (item 7 do plano) ANTES de ligar: separa 20 % do catálogo
// já classificado, treina com os 80 % e vê quanto acerta e quanto responde, várias vezes (sorteio com
// semente fixa, então o resultado se repete). Só lê o banco; não grava nada.
// Uso: node scripts/avaliar-classificador.js [repeticoes=20]
const pool = require('../src/config/database');
const knn = require('../src/utils/classificadorKnn');
const { classificarPorDescricao } = require('../src/utils/classificadorMaterial');
const { paraTestes } = require('../src/services/classificacaoMateriais');
const { termos } = require('../src/services/classificacaoMateriais');

const PENDENTES = ['Não classificado', 'Geral', ''];
const CORTES = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

function gerador(semente) { // mulberry32
  let a = semente >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const embaralhar = (lista, rnd) => { const l = [...lista]; for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; };
const pct = (a, b) => (b ? `${(100 * a / b).toFixed(1)}%` : '—');

// etapas que já existem hoje (NCM igual → material mais parecido ≥ 0,5 → palavras-chave)
function categoriaPorNcm(ncmPorCategoria, item) { return item.ncm && ncmPorCategoria.has(item.ncm) ? ncmPorCategoria.get(item.ncm) : null; }
function semNcm(ref, item) {
  const p = paraTestes.maisParecido(ref, item.descricao);
  if (p) return p.categoria;
  return classificarPorDescricao(item.descricao) || null;
}

(async () => {
  const repeticoes = Math.max(1, Number(process.argv[2]) || 20);
  const { rows } = await pool.query('SELECT descricao, categoria, ncm FROM materiais WHERE ativo = true AND COALESCE(categoria, \'\') <> ALL($1)', [PENDENTES]);
  console.log(`Catálogo classificado: ${rows.length} materiais em ${new Set(rows.map(r => r.categoria)).size} categorias; ${repeticoes} sorteios de 80 % treino / 20 % teste.\n`);
  const acc = { atual: { n: 0, resp: 0, ok: 0 }, knn: Object.fromEntries(CORTES.map(c => [c, { resp: 0, ok: 0 }])), comb: Object.fromEntries(CORTES.map(c => [c, { ia: 0, ok: 0, resp: 0 }])), total: 0, ncm: { resp: 0, ok: 0 } };
  const erros = new Map();
  for (let r = 0; r < repeticoes; r++) {
    const rnd = gerador(1000 + r);
    const ordem = embaralhar(rows, rnd);
    const corte = Math.floor(ordem.length * 0.8);
    const treino = ordem.slice(0, corte); const teste = ordem.slice(corte);
    const modelo = knn.treinar(treino);
    const porNcm = new Map();
    const contagem = new Map();
    for (const t of treino) if (t.ncm) { const k = `${t.ncm}|${t.categoria}`; contagem.set(k, (contagem.get(k) || 0) + 1); }
    for (const [k, n] of contagem) { const [ncm, cat] = k.split('|'); if (!porNcm.has(ncm) || n > porNcm.get(ncm).n) porNcm.set(ncm, { n, cat }); }
    const ncmPorCategoria = new Map([...porNcm].map(([ncm, v]) => [ncm, v.cat]));
    const ref = treino.map(r => ({ ...r, termos: termos(r.descricao) }));
    for (const item of teste) {
      acc.total++;
      const nc = categoriaPorNcm(ncmPorCategoria, item);
      const a = nc || semNcm(ref, item);
      if (nc) { acc.ncm.resp++; if (nc === item.categoria) acc.ncm.ok++; }
      if (a) { acc.atual.resp++; if (a === item.categoria) acc.atual.ok++; }
      const k = knn.classificar(modelo, item.descricao);
      for (const c of CORTES) {
        const responde = k && k.confianca >= c;
        if (responde) { acc.knn[c].resp++; if (k.categoria === item.categoria) acc.knn[c].ok++; else erros.set(`${c}|${item.categoria} → ${k.categoria}`, (erros.get(`${c}|${item.categoria} → ${k.categoria}`) || 0) + 1); }
        // combinado (ordem em uso): kNN confiante → parecido ≥ 0,5 → palavras-chave → NCM → IA
        const final = responde ? k.categoria : (semNcm(ref, item) || nc);
        if (final) { acc.comb[c].resp++; if (final === item.categoria) acc.comb[c].ok++; } else acc.comb[c].ia++;
      }
    }
  }
  console.log(`Ordem antiga (NCM, parecido ≥ 0,5, palavras-chave): respondem ${pct(acc.atual.resp, acc.total)} dos itens e acertam ${pct(acc.atual.ok, acc.atual.resp)} do que respondem; ${pct(acc.total - acc.atual.resp, acc.total)} vão para a IA.\n`);
  console.log(`Só a etapa do NCM: responde ${pct(acc.ncm.resp, acc.total)} e acerta ${pct(acc.ncm.ok, acc.ncm.resp)}.
`);
  console.log('Corte de confiança | kNN responde | kNN acerta (do que responde) | kNN → parecido → regras → NCM: vai p/ IA | acerto geral do que responde');
  for (const c of CORTES) {
    const k = acc.knn[c]; const m = acc.comb[c];
    console.log(`${String(c).padEnd(18)} | ${pct(k.resp, acc.total).padEnd(12)} | ${pct(k.ok, k.resp).padEnd(28)} | ${pct(m.ia, acc.total).padEnd(31)} | ${pct(m.ok, m.resp)}`);
  }
  const frequentes = [...erros].filter(([k]) => k.startsWith('0.5|')).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (frequentes.length) console.log(`\nErros mais comuns do kNN no corte 0,5 (esperada → dada: vezes em ${repeticoes} sorteios):\n` + frequentes.map(([k, n]) => `  ${k.slice(4)}: ${n}`).join('\n'));
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
