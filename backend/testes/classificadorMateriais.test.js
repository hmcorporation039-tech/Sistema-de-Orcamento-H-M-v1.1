// Classificador local de materiais (item 7 do plano): aprende as categorias do próprio catálogo e só
// responde quando está confiante; abaixo do corte segue para NCM, "parecido", palavras-chave e IA.
// A parte do banco repete a MEDIÇÃO que autorizou ligar o classificador (80 % treino / 20 % teste).
// Rodar: node testes/classificadorMateriais.test.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const knn = require('../src/utils/classificadorKnn');
const { categoriaLocal, termos, paraTestes } = require('../src/services/classificacaoMateriais');
const { classificarPorDescricao } = require('../src/utils/classificadorMaterial');

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
  // o que acabou de ser classificado entra na referência e ensina o item seguinte (catalogoMateriais faz push)
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

  // ── medição no catálogo real (só no banco do v2): é ela que autoriza o classificador ──
  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`classificadorMateriais: medição no catálogo pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    try {
      const { rows } = await pool.query("SELECT descricao, categoria FROM materiais WHERE ativo = true AND COALESCE(categoria, '') NOT IN ('Não classificado', 'Geral', '')");
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
