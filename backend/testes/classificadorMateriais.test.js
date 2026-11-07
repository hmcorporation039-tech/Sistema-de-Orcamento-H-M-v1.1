// Classificador local de materiais (item 7 do plano): aprende as categorias do próprio catálogo e só
// responde quando está confiante; abaixo do corte segue para NCM, "parecido", palavras-chave e IA.
// A parte do banco repete a MEDIÇÃO que autorizou ligar o classificador (80 % treino / 20 % teste).
// Rodar: node testes/classificadorMateriais.test.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const knn = require('../src/utils/classificadorKnn');
const { categoriaLocal, termos, paraTestes } = require('../src/services/classificacaoMateriais');
const { classificarPorDescricao } = require('../src/utils/classificadorMaterial');
const c2origem = (c) => c && c.origem;

const CATALOGO = [
  ['CAMERA BULLET IP 2MP 3,6MM IR 30M HIKVISION', 'CFTV'], ['CAMERA DOME IP 4MP POE VARIFOCAL', 'CFTV'], ['CAMERA IP BULLET 5MP EXTERNA', 'CFTV'],
  ['NVR 16 CANAIS 4K HIKVISION', 'CFTV'], ['GRAVADOR DIGITAL NVR 8 CANAIS POE', 'CFTV'], ['HD 4TB SURVEILLANCE', 'CFTV'], ['FONTE 12V 2A PARA CAMERA CFTV', 'CFTV'],
  ['CABO FLEXIVEL 2,5MM 750V PT 100MT', 'Elétrica'], ['CABO FLEXIVEL 4,0MM 750V AZ 100MT', 'Elétrica'], ['CABO FLEXIVEL 1,5MM 750V VM 100MT', 'Elétrica'],
  ['DISJUNTOR MONO 20A CURVA C 3KA', 'Elétrica'], ['DISJUNTOR BIPOLAR 32A CURVA C', 'Elétrica'], ['DISJUNTOR TRIPOLAR 63A CURVA C', 'Elétrica'],
  ['TOMADA 2P+T 10A 4X2 BRANCA', 'Elétrica'], ['INTERRUPTOR SIMPLES 10A 4X2 BRANCO', 'Elétrica'], ['QUADRO DISTRIBUICAO EMBUTIR 12 DISJUNTORES', 'Elétrica'],
  ['SWITCH NAO GERENCIAVEL 8 PORTAS GIGABIT', 'Redes'], ['SWITCH GERENCIAVEL 24 PORTAS POE', 'Redes'], ['PATCH PANEL 24 PORTAS CAT6', 'Redes'],
  ['CABO UTP CAT6 CAIXA 305M AZUL', 'Redes'], ['CABO UTP CAT5E CAIXA 305M CINZA', 'Redes'], ['RACK 19 36U PISO 570MM', 'Redes'], ['PATCH CORD CAT6 1,5M', 'Redes'],
  ['CENTRAL ALARME 8 ZONAS MONITORAVEL', 'Alarme'], ['SENSOR MAGNETICO ABERTURA SEM FIO', 'Alarme'], ['SENSOR INFRAVERMELHO PASSIVO IVP PET', 'Alarme'], ['SIRENE ALARME 120DB', 'Alarme'], ['TECLADO ALARME LED 8 ZONAS', 'Alarme'],
].map(([descricao, categoria]) => ({ descricao, categoria, ncm: null }));

async function rotinaEmLote(pool) {
  const ia = require('../src/services/ia');
  const svc = require('../src/services/classificacaoMateriais');
  const orig = { perguntarJSON: ia.perguntarJSON };
  // só pontuação: nenhum vizinho no catálogo, nem palavra-chave — é o caso que vai à IA
  const marca = `~~ ${'#'.repeat(1 + (Date.now() % 7))} ¤ ${'+'.repeat(1 + (Date.now() % 5))}`;
  let perguntas = 0;
  const ids = [];
  // a rotina passa por TODOS os pendentes do banco de teste: a tentativa registrada pela IA falsa é desfeita no fim
  const { rows: semTentativa } = await pool.query('SELECT id FROM materiais WHERE categoria_ia_tentada_em IS NULL');
  try {
    for (const d of [`${marca} §`, `${marca} ¶`]) {
      const { rows: [m] } = await pool.query("INSERT INTO materiais (descricao, categoria, unidade, preco, origem) VALUES ($1, 'Não classificado', 'un', 1, 'teste') RETURNING id", [d]);
      ids.push(m.id);
    }
    // a IA falsa "classifica" só o primeiro, com a primeira categoria da lista que recebeu
    ia.perguntarJSON = async (p) => {
      perguntas++;
      const cats = JSON.parse(p.slice(p.indexOf('['), p.indexOf(']') + 1));
      return { fonte: 'teste', json: { [ids[0]]: cats[0] } };
    };
    const r1 = await svc.classificarPendentes();
    const { rows } = await pool.query('SELECT id, categoria, categoria_origem, categoria_ia_tentada_em FROM materiais WHERE id = ANY($1) ORDER BY id', [ids]);
    if (rows[0].categoria_origem === 'ia') {
      assert.ok(perguntas >= 1 && r1.classificadosIA >= 1, JSON.stringify(r1));
      assert.ok(rows[1].categoria_ia_tentada_em, 'tentativa registrada no que a IA não classificou');
      assert.strictEqual(rows[1].categoria, 'Não classificado');
      const antes = perguntas;
      await svc.classificarPendentes();
      assert.strictEqual(perguntas, antes, 'o mesmo material não volta à IA antes de 7 dias');
      console.log('  rotina em lote: categoria da IA marcada e nova tentativa só depois de 7 dias');
    } else {
      // o catálogo achou um vizinho: sugestão local marcada (nunca IA sem marca)
      assert.ok(['knn_baixa', 'parecido', 'palavras', 'knn', 'ncm'].includes(rows[0].categoria_origem), JSON.stringify(rows[0]));
      console.log(`  rotina em lote: resolvido sem IA (${rows[0].categoria_origem})`);
    }
  } finally {
    Object.assign(ia, orig);
    if (ids.length) await pool.query('DELETE FROM materiais WHERE id = ANY($1)', [ids]);
    await pool.query('UPDATE materiais SET categoria_ia_tentada_em = NULL WHERE id = ANY($1)', [semTentativa.map(r => r.id)]);
  }
}

(async () => {
  // ── modelo pequeno demais não responde ──
  assert.strictEqual(knn.classificar(knn.treinar(CATALOGO.slice(0, 5)), 'CAMERA IP'), null);
  assert.strictEqual(knn.classificar(null, 'CAMERA IP'), null);

  // ── responde com confiança quando os vizinhos concordam e há um parecido de fato ──
  const modelo = knn.treinar(CATALOGO);
  let r = knn.classificar(modelo, 'CAMERA BULLET IP 8MP 2,8MM HIKVISION');
  assert.strictEqual(r.categoria, 'CFTV'); assert.ok(r.confianca >= 0.5, `confiança ${r.confianca}`);
  r = knn.classificar(modelo, 'Disjuntor DIN monopolar 16A curva C');
  assert.strictEqual(r.categoria, 'Elétrica'); assert.ok(r.confianca >= 0.5, `confiança ${r.confianca}`);
  r = knn.classificar(modelo, 'SWITCH 16 PORTAS GIGABIT NAO GERENCIAVEL');
  assert.strictEqual(r.categoria, 'Redes');
  // grafias diferentes do mesmo termo (trigramas): FLEX / FLEXIVEL
  r = knn.classificar(modelo, 'CB FLEX 6,0MM 750V PT');
  assert.strictEqual(r.categoria, 'Elétrica');
  // sem nenhum termo conhecido: não chuta
  assert.strictEqual(knn.classificar(modelo, 'XYZQW 99999'), null);
  assert.strictEqual(knn.classificar(modelo, ''), null);
  assert.strictEqual(knn.classificar(modelo, '   '), null);
  // palavra solta e genérica tem confiança baixa (abaixo do corte)
  r = knn.classificar(modelo, 'CAIXA');
  assert.ok(!r || r.confianca < paraTestes.CORTE_KNN, 'palavra genérica não passa do corte');

  // ── integração em categoriaLocal (sem NCM não precisa de banco) ──
  const ref = CATALOGO.map(c => ({ ...c, termos: termos(c.descricao) }));
  let c = await categoriaLocal(null, { descricao: 'CAMERA BULLET IP 8MP 2,8MM HIKVISION' }, ref);
  assert.strictEqual(c.categoria, 'CFTV'); assert.match(c.criterio, /^aprendido do catálogo \(\d+ %\), parecido com "/);
  // a referência que cresce (material com categoria escolhida por gente) refaz o modelo
  const antes = await categoriaLocal(null, { descricao: 'BALIZA EMERGENCIA AUTONOMA 30 LEDS' }, ref);
  for (let i = 0; i < 3; i++) ref.push({ descricao: `BALIZA EMERGENCIA AUTONOMA ${i} LEDS`, categoria: 'Iluminação', ncm: null, termos: termos(`BALIZA EMERGENCIA AUTONOMA ${i} LEDS`) });
  c = await categoriaLocal(null, { descricao: 'BALIZA EMERGENCIA AUTONOMA 30 LEDS' }, ref);
  assert.strictEqual(c.categoria, 'Iluminação', `referência que cresceu precisa refazer o modelo (antes: ${antes && antes.categoria})`);
  // texto sem nada parecido e sem palavra-chave: null (vai para a IA)
  assert.strictEqual(await categoriaLocal(null, { descricao: 'ZZQQ XXWW' }, ref), null);
  // NCM é a ÚLTIMA etapa (acerta só ~89 %): só vale quando nenhuma outra respondeu
  const clienteFalso = { query: async () => ({ rows: [{ categoria: 'Ferragens' }] }) };
  c = await categoriaLocal(clienteFalso, { descricao: 'CAMERA BULLET IP 8MP 2,8MM HIKVISION', ncm: '85258999' }, ref);
  assert.strictEqual(c.categoria, 'CFTV', 'o NCM não passa na frente do que o catálogo ensinou');
  c = await categoriaLocal(clienteFalso, { descricao: 'ZZQQ XXWW', ncm: '73181500' }, ref);
  assert.deepStrictEqual([c.categoria, c.criterio], ['Ferragens', 'NCM 73181500'], 'sem outra resposta, o NCM decide');

  // ── revisão do uso de IA (06/11/2026): cada categoria diz de onde veio (materiais.categoria_origem) ──
  c = await categoriaLocal(null, { descricao: 'CAMERA BULLET IP 8MP 2,8MM HIKVISION' }, ref);
  assert.strictEqual(c.origem, 'knn');
  assert.strictEqual(c2origem(await categoriaLocal(clienteFalso, { descricao: 'ZZQQ XXWW', ncm: '73181500' }, ref)), 'ncm');
  // abaixo do corte, o vizinho mais votado vira SUGESTÃO "a conferir" (knn_baixa) em vez de ir para a IA
  let achouFraco = false;
  for (const d of ['SUPORTE PAREDE METALICO', 'CAIXA', 'FITA ISOLANTE 20M', 'PARAFUSO 6MM', 'ABRACADEIRA NYLON']) {
    const fraco = knn.classificar(knn.treinar(ref), d);
    if (!fraco || fraco.confianca >= paraTestes.CORTE_KNN || paraTestes.maisParecido(ref, d) || classificarPorDescricao(d)) continue;
    c = await categoriaLocal(null, { descricao: d }, ref);
    assert.deepStrictEqual([c.categoria, c.origem], [fraco.categoria, 'knn_baixa'], d);
    assert.match(c.criterio, /a conferir/);
    achouFraco = true;
    break;
  }
  console.log(`  sugestão fraca do kNN (knn_baixa): ${achouFraco ? 'conferida' : 'nenhum exemplo no catálogo sintético'}`);
  // o gabarito do kNN (e do NCM) é só a categoria confiável: escolhida por gente ou o catálogo anterior à marca
  const { SQL_CATEGORIA_CONFIAVEL, carregarReferencia } = require('../src/services/classificacaoMateriais');
  assert.match(SQL_CATEGORIA_CONFIAVEL, /categoria_origem IS NULL OR categoria_origem = 'usuario'/);
  let sqlRef = '';
  await carregarReferencia({ query: async (sql) => { sqlRef = sql; return { rows: [] }; } });
  assert.ok(sqlRef.includes(SQL_CATEGORIA_CONFIAVEL), 'carregarReferencia filtra a categoria confiável');

  // ── medição no catálogo real (só no banco do v2): é ela que autoriza o classificador ──
  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`classificadorMateriais: medição no catálogo pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    try {
      // o material do treino com o acervo (origem 'acervo') tem a categoria tirada da disciplina do arquivo, não de
      // uma classificação conferida: não serve de gabarito
      // rotina em lote (revisão do uso de IA de 06/11/2026): a categoria da IA fica marcada 'ia' e o material que a IA
      // já viu espera 7 dias — com a IA falsa (sem gastar nada) e materiais de teste
      await rotinaEmLote(pool);
      const { rows } = await pool.query("SELECT descricao, categoria FROM materiais WHERE ativo = true AND COALESCE(categoria, '') NOT IN ('Não classificado', 'Geral', '') AND COALESCE(origem, '') <> 'acervo'");
      if (rows.length < 200) {
        console.log(`classificadorMateriais: catálogo com ${rows.length} itens classificados — medição pulada (precisa de 200)`);
      } else {
        const gerador = (semente) => { let a = semente >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
        let total = 0, respondeu = 0, acertouKnn = 0, okBase = 0, okConjunto = 0, respBase = 0, respConjunto = 0;
        for (let rep = 0; rep < 10; rep++) {
          const rnd = gerador(1000 + rep);
          const l = [...rows];
          for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
          const corte = Math.floor(l.length * 0.8);
          const treino = l.slice(0, corte).map(x => ({ ...x, termos: termos(x.descricao) }));
          const m = knn.treinar(treino);
          for (const it of l.slice(corte)) {
            total++;
            const k = knn.classificar(m, it.descricao);
            const base = (paraTestes.maisParecido(treino, it.descricao) || {}).categoria || classificarPorDescricao(it.descricao) || null;
            if (base) { respBase++; if (base === it.categoria) okBase++; }
            const kn = k && k.confianca >= paraTestes.CORTE_KNN ? k.categoria : null;
            if (kn) { respondeu++; if (kn === it.categoria) acertouKnn++; }
            const conj = kn || base;
            if (conj) { respConjunto++; if (conj === it.categoria) okConjunto++; }
          }
        }
        const acertoKnn = acertouKnn / respondeu;
        const acertoBase = okBase / respBase; const acertoConj = okConjunto / respConjunto;
        console.log(`  medição (10 sorteios): kNN responde ${(100 * respondeu / total).toFixed(0)} % e acerta ${(100 * acertoKnn).toFixed(1)} %; sem kNN ${(100 * acertoBase).toFixed(1)} %; com kNN ${(100 * acertoConj).toFixed(1)} %`);
        assert.ok(acertoKnn >= 0.92, `o kNN só pode responder se acertar ≥ 92 % (acertou ${(100 * acertoKnn).toFixed(1)} %)`);
        assert.ok(respondeu / total >= 0.4, 'o kNN precisa responder uma parte relevante dos itens');
        assert.ok(acertoConj >= acertoBase, 'com o kNN o conjunto não pode acertar menos que sem ele');
        assert.ok(respConjunto / total >= 0.95, 'o conjunto continua respondendo quase tudo (a IA é só o resto)');
      }
    } finally { await pool.end(); }
  }
  console.log('classificadorMateriais: ok');
})().catch(e => { console.error(e); process.exit(1); });
