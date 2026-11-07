// Catálogo de componentes de quadros (versão 2.4 — services/componentesQuadro.js,
// migração 2.0-20, rotas /componentes-quadro e o documento HTML aberto em aba).
// Sem gastar cota: a IA é FALSA (ia.pesquisarWeb trocado no teste).
//   1. regras puras: nome do fabricante, números, registro, domínio oficial,
//      resposta da IA (link de loja / medida faltando / outro fabricante = recusado);
//   2. JSON da skill + banco (o banco sobrepõe), injeção nos dados da skill de
//      quadros (nada muda sem fabricante, com a tabela vazia ou em outra disciplina);
//   3. com o BANCO DE TESTE (hm_orcamentos_v2): migração idempotente, cadastro,
//      duplicado, aprovação, busca da IA gravada "a conferir", busca em lote com
//      limite e sem repetir, e as rotas (sem login 401; não admin 403).
// Apaga tudo o que cria. Rodar: npm test (pasta backend).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const express = require('express');
const jwt = require('jsonwebtoken');

const ia = require('../src/services/ia');
const S = require('../src/services/componentesQuadro');

let ok = 0;
const caso = async (nome, fn) => {
  try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`  FALHOU ${nome}: ${e.stack || e.message}`); process.exitCode = 1; }
};
const SUF = `T${Date.now().toString(36)}`;

const BOM = {
  encontrado: true, fabricante: 'WEG', linha: 'MDW-C', referencia: `MDWC16-3-${SUF}`, tipo: 'disjuntor_din',
  descricao: 'Minidisjuntor 3P 16 A curva C 10 kA', polos: 3, corrente_a: 16, curva: 'C', icu_ka: 10,
  largura_mm: 54, altura_mm: '85', profundidade_mm: '74,5', modulos_din: 3, montagem: 'din',
  fonte_url: 'https://static.weg.net/medias/downloadcenter/catalogo-mdw.pdf', fonte_documento: 'Catálogo MDW, p. 12', obs: 'Icn NBR NM 60898',
};
const PEDIDO = { fabricante: 'weg', tipo: 'disjuntor_din', especificacao: `disjuntor 3P 16 A curva C 10 kA ${SUF}` };

(async () => {
  // ── 1. regras puras ──────────────────────────────────────────────────────
  await caso('fabricante: nome canônico (maiúsculas, acento, apelido); outro fica como digitado', () => {
    assert.strictEqual(S.canonFabricante('weg'), 'WEG');
    assert.strictEqual(S.canonFabricante('schneider'), 'Schneider Electric');
    assert.strictEqual(S.canonFabricante('WEIDMULLER'), 'Weidmüller');
    assert.strictEqual(S.canonFabricante('mean  well'), 'Mean Well');
    assert.strictEqual(S.canonFabricante('Metaltex'), 'Metaltex');
    assert.deepStrictEqual(S.FABRICANTES, [...S.FABRICANTES].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })), 'lista A–Z');
  });

  await caso('números da tela/IA: vírgula, milhar de mm, unidade escrita; texto = inválido', () => {
    assert.strictEqual(S.lerNumero('74,5'), 74.5);
    assert.strictEqual(S.lerNumero('74.5'), 74.5);
    assert.strictEqual(S.lerNumero('1.200'), 1200);
    assert.strictEqual(S.lerNumero('0.125'), 0.125);
    assert.strictEqual(S.lerNumero('54 mm'), 54);
    assert.strictEqual(S.lerNumero(''), null);
    assert.ok(Number.isNaN(S.lerNumero('abc')));
  });

  await caso('registro: exige fabricante, referência, tipo do contrato e as três medidas', () => {
    const { registro, erros } = S.normalizarRegistro(BOM);
    assert.deepStrictEqual(erros, []);
    assert.strictEqual(registro.profundidade_mm, 74.5);
    assert.strictEqual(registro.altura_mm, 85);
    const r2 = S.normalizarRegistro({ fabricante: 'WEG', referencia: 'X', tipo: 'nada', largura_mm: 0 });
    assert.ok(r2.erros.some(e => /Tipo de componente inválido/.test(e)));
    assert.ok(r2.erros.some(e => /largura_mm/.test(e)));
    const r3 = S.normalizarRegistro({ ...BOM, profundidade_mm: null, montagem: 'teto', fonte_url: 'ftp://x' });
    assert.ok(r3.erros.some(e => /largura, altura e profundidade/.test(e)));
    assert.ok(r3.erros.some(e => /Montagem inválida/.test(e)));
    assert.ok(r3.erros.some(e => /http/.test(e)));
    assert.deepStrictEqual(S.normalizarRegistro({ ...BOM, pontos: { DI: '16', 'x y': 3 } }).registro.pontos, { DI: 16 });
  });

  await caso('domínio: só o site oficial do fabricante; loja e terceiros recusados', () => {
    assert.ok(S.dominioDoFabricante('https://download.schneider-electric.com/files?p_Doc_Ref=x', 'Schneider Electric').ok);
    assert.ok(S.dominioDoFabricante('https://www.se.com/br/pt/product/A9F74316', 'schneider').ok);
    assert.ok(S.dominioDoFabricante('https://static.weg.net/medias/x.pdf', 'WEG').confirmado);
    assert.ok(!S.dominioDoFabricante('https://www.mercadolivre.com.br/disjuntor-weg', 'WEG').ok);
    assert.ok(!S.dominioDoFabricante('https://www.alldatasheet.com/weg.pdf', 'WEG').ok);
    assert.ok(!S.dominioDoFabricante('https://weg.net.golpe.com/x.pdf', 'WEG').ok, 'subdomínio enganoso');
    assert.ok(!S.dominioDoFabricante('https://www.siemens.com/x.pdf', 'WEG').ok, 'site de outro fabricante');
    assert.ok(!S.dominioDoFabricante('', 'WEG').ok);
    const livre = S.dominioDoFabricante('https://www.metaltex.com.br/catalogo.pdf', 'Metaltex');
    assert.ok(livre.ok && livre.confirmado === false, 'fabricante fora da lista: vale, mas marcado');
  });

  await caso('resposta da IA: boa → registro "a conferir"; link de loja, medida faltando, outro fabricante ou não achado → recusada', () => {
    const v = S.validarRespostaIA(BOM, PEDIDO);
    assert.ok(v.ok, v.problemas.join('; '));
    assert.strictEqual(v.registro.origem, 'pesquisa_ia');
    assert.strictEqual(v.registro.verificado, false);
    assert.strictEqual(v.registro.fabricante, 'WEG');
    assert.strictEqual(v.registro.tipo, 'disjuntor_din');
    const loja = S.validarRespostaIA({ ...BOM, fonte_url: 'https://www.amazon.com.br/dp/123' }, PEDIDO);
    assert.ok(!loja.ok && loja.problemas.some(p => /loja\/terceiro/.test(p)));
    const semMedida = S.validarRespostaIA({ ...BOM, profundidade_mm: null }, PEDIDO);
    assert.ok(!semMedida.ok && semMedida.problemas.some(p => /faltou alguma das medidas/.test(p)));
    const outro = S.validarRespostaIA({ ...BOM, fabricante: 'Siemens' }, PEDIDO);
    assert.ok(!outro.ok && outro.problemas.some(p => /outro fabricante/.test(p)));
    const nao = S.validarRespostaIA({ encontrado: false, motivo: 'sem datasheet' }, PEDIDO);
    assert.ok(!nao.ok && nao.naoEncontrado && /sem datasheet/.test(nao.problemas[0]));
    assert.ok(!S.validarRespostaIA(null, PEDIDO).ok);
    const livre = S.validarRespostaIA({ ...BOM, fabricante: 'Metaltex', fonte_url: 'https://metaltex.com.br/x.pdf' }, { ...PEDIDO, fabricante: 'Metaltex' });
    assert.ok(livre.ok && /\[CONFERIR\] domínio/.test(livre.registro.obs));
  });

  await caso('prompt exige o documento do FABRICANTE, código de pedido, L×A×P montado e não inventar', () => {
    const p = S.montarPromptMedida(PEDIDO);
    assert.match(p, /PRÓPRIO FABRICANTE/);
    assert.match(p, /weg\.net/);
    assert.match(p, /CÓDIGO COMERCIAL DE PEDIDO/);
    assert.match(p, /largura_mm.*altura_mm.*profundidade_mm/s);
    assert.match(p, /NÃO invente/);
    assert.match(p, /"encontrado":false/);
    assert.match(S.montarPromptMedida({ ...PEDIDO, tipo: 'dps' }), /POR POLO/, 'convenção do contrato: DPS por polo');
    assert.match(S.montarPromptMedida({ ...PEDIDO, tipo: 'borne' }), /seção nominal em mm²/);
    assert.ok(!/POR POLO/.test(p));
  });

  // ── 2. JSON da skill + banco; injeção ────────────────────────────────────
  const hm = { ...S.paraSkill(S.normalizarRegistro(BOM).registro), referencia: 'A9F74316', fabricante: 'Schneider Electric', origem: 'catalogo_hm', verificado: true };
  const doBanco = [
    { ...S.paraSkill(S.normalizarRegistro(BOM).registro), id: 7, referencia: 'a9f74316', fabricante: 'schneider', largura_mm: 53, origem: 'usuario', verificado: true },
    { ...S.paraSkill(S.normalizarRegistro(BOM).registro), id: 8, origem: 'pesquisa_ia', verificado: false },
  ];

  await caso('catálogo da tela: o banco sobrepõe o JSON da skill pelo par fabricante + referência', () => {
    const m = S.mesclarCatalogo([hm], doBanco);
    assert.strictEqual(m.length, 2);
    const sch = m.find(c => c.referencia.toLowerCase() === 'a9f74316');
    assert.strictEqual(sch.largura_mm, 53);
    assert.strictEqual(sch.chave, 'db:7');
    assert.strictEqual(sch.substitui_catalogo, true);
    assert.strictEqual(S.filtrar(m, { verificado: 'nao' }).length, 1);
    assert.strictEqual(S.filtrar(m, { fabricante: 'WEG' }).length, 1);
    assert.strictEqual(S.filtrar(m, { texto: 'minidisjuntor c' }).length, 2);
  });

  await caso('injeção: só os registros dos fabricantes escolhidos (padrão, por tipo e por dispositivo); não altera o original', () => {
    const regs = doBanco.map(r => ({ ...r, fabricante: S.canonFabricante(r.fabricante) }));
    const dados = { fabricantes: { padrao: 'WEG' }, circuitos: [{ n: 1 }] };
    const novo = S.injetarNosDados(dados, regs);
    assert.notStrictEqual(novo, dados);
    assert.strictEqual(dados.catalogo_componentes, undefined, 'o objeto salvo não muda');
    assert.deepStrictEqual(novo.catalogo_componentes.map(r => r.fabricante), ['WEG']);
    assert.strictEqual(novo.catalogo_componentes[0].id, undefined, 'só os campos do contrato');
    const porTipo = S.injetarNosDados({ fabricantes: { padrao: 'WEG', por_tipo: { disjuntor_din: 'Schneider Electric' } } }, regs);
    assert.strictEqual(porTipo.catalogo_componentes.length, 2);
    const porDispositivo = S.injetarNosDados({ partidas: [{ tag: 'M1', fabricante: 'schneider' }] }, regs);
    assert.deepStrictEqual(porDispositivo.catalogo_componentes.map(r => r.fabricante), ['Schneider Electric']);
    const porReferencia = S.injetarNosDados({ circuitos: [{ referencia: BOM.referencia }] }, regs);
    assert.strictEqual(porReferencia.catalogo_componentes.length, 1);
    const porMotor = S.injetarNosDados({ motores: [{ tag: 'M1', referencias: { Q1: BOM.referencia.toUpperCase(), K1: '' } }] }, regs);
    assert.strictEqual(porMotor.catalogo_componentes.length, 1, 'referencias { Q1, K1, T1 } do motor');
  });

  await caso('injeção é no-op: tabela vazia, sem fabricante escolhido ou fabricante sem registro', () => {
    const dados = { fabricantes: { padrao: 'WEG' } };
    assert.strictEqual(S.injetarNosDados(dados, []), dados);
    const semFab = { circuitos: [{ n: 1 }] };
    assert.strictEqual(S.injetarNosDados(semFab, doBanco), semFab);
    const outro = { fabricantes: { padrao: 'Steck' } };
    assert.strictEqual(S.injetarNosDados(outro, doBanco), outro);
  });

  await caso('processarComMotor: outra disciplina recebe os MESMOS dados; quadros recebe o catálogo do banco', () => {
    const comum = require('../src/controllers/laudos/comum');
    const { motorDaDisciplina } = require('../src/utils/disciplinasLaudo');
    const dados = { fabricantes: { padrao: 'WEG' } };
    S._interno.cacheBanco = doBanco.map(r => ({ ...r, fabricante: S.canonFabricante(r.fabricante) }));
    try {
      let recebido;
      const falso = { processar: (d) => { recebido = d; return {}; } };
      comum.processarComMotor(falso, dados);
      assert.strictEqual(recebido, dados, 'motor que não é o de quadros: nada muda');
      assert.strictEqual(comum.dadosParaMotor(motorDaDisciplina('eletrica'), dados), dados);
      let quadros = null;
      try { quadros = motorDaDisciplina('quadros'); } catch (e) { console.log(`  (skill de quadros não carregou: ${e.message} — parte pulada)`); }
      if (quadros) {
        const d = comum.dadosParaMotor(quadros, dados);
        assert.deepStrictEqual(d.catalogo_componentes.map(r => r.referencia), [BOM.referencia]);
        assert.strictEqual(dados.catalogo_componentes, undefined);
      }
    } finally { S.invalidarCache(); }
  });

  // ── 3. banco de teste ────────────────────────────────────────────────────
  if (process.env.DB_NAME !== 'hm_orcamentos_v2') {
    console.log(`componentesQuadro: parte com banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em hm_orcamentos_v2)`);
    console.log(`componentesQuadro: ${ok} casos ok`);
    return;
  }
  const pool = require('../src/config/database');
  const { JWT_SECRET } = require('../src/config/segredos');
  const migracao = require('../src/models/migracoes/2.0-20-componentes-quadro');
  const criados = { usuarios: [] };
  const FAB = `Fabricante Teste ${SUF}`;
  const disponivelOriginal = ia.disponivel;
  const pesquisarOriginal = ia.pesquisarWeb;
  let servidor;
  try {
    await caso('migração 2.0-20 idempotente (roda duas vezes) com o índice único sem diferenciar maiúsculas', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await migracao(client);
        await migracao(client);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; } finally { client.release(); }
      const { rows } = await pool.query("SELECT indexname FROM pg_indexes WHERE tablename = 'componentes_quadro' ORDER BY indexname");
      const nomes = rows.map(r => r.indexname);
      assert.ok(nomes.includes('componentes_quadro_fabricante_referencia_uk'));
      assert.ok(nomes.includes('componentes_quadro_tipo_fabricante_idx'));
    });

    let idManual;
    await caso('cadastro manual: origem usuário; mesma referência com outra caixa = 409; aprovar exige documento', async () => {
      const usuario = { id: null, nome: 'Eng. Teste' };
      const c = await S.criar({ ...BOM, fabricante: FAB, referencia: `REF-${SUF}`, fonte_url: null, fonte_documento: null }, usuario);
      idManual = c.id;
      assert.strictEqual(c.origem, 'usuario');
      assert.strictEqual(c.verificado, false);
      assert.strictEqual(c.altura_mm, 85);
      await assert.rejects(S.criar({ ...BOM, fabricante: FAB.toUpperCase(), referencia: `ref-${SUF}` }, usuario), (e) => e.status === 409);
      await assert.rejects(S.aprovar(idManual, usuario), (e) => e.status === 400 && /documento do fabricante/.test(e.message));
      const ed = await S.atualizar(idManual, { ...BOM, fabricante: FAB, referencia: `REF-${SUF}`, fonte_documento: 'Catálogo 2025 p. 3', largura_mm: 36 }, usuario);
      assert.strictEqual(ed.largura_mm, 36);
      const ap = await S.aprovar(idManual, usuario);
      assert.strictEqual(ap.verificado, true);
      assert.strictEqual(ap.verificado_por, 'Eng. Teste');
      assert.ok(ap.verificado_em);
      const lista = await S.listar({ fabricante: FAB });
      assert.strictEqual(lista.itens.length, 1);
      assert.strictEqual(lista.itens[0].chave, `db:${idManual}`);
    });

    await caso('injeção pelo cache do banco (como no carregarLaudo de um projeto de quadros)', async () => {
      await S.atualizarCache();
      const d = S.injetarNosDados({ fabricantes: { padrao: FAB } });
      assert.deepStrictEqual(d.catalogo_componentes.map(r => r.referencia), [`REF-${SUF}`]);
      S.invalidarCache();
    });

    let chamadas = 0;
    ia.disponivel = () => true;
    ia.pesquisarWeb = async (prompt, opcoes) => {
      chamadas++;
      assert.match(prompt, /SITE OFICIAL/);
      // a cadeia passa ao próximo provedor quando o resultado é recusado
      assert.strictEqual(opcoes.aceitar({ ...BOM, fonte_url: 'https://www.amazon.com.br/x' }, { ultimo: false }), false);
      if (/LOJAMARCA/.test(prompt)) return { provedor: 'claude_max', fonte: 'Claude Max', json: { ...BOM, referencia: `LOJA-${SUF}`, fonte_url: 'https://www.amazon.com.br/x' } };
      const n = (/item (\d+)/.exec(prompt) || [])[1];
      return { provedor: 'claude_max', fonte: 'Claude Max', json: { ...BOM, referencia: n ? `LOTE${n}-${SUF}` : BOM.referencia } };
    };

    await caso('busca da medida (IA falsa): achado gravado "a conferir" (pesquisa_ia); link de loja não grava nada', async () => {
      const r = await S.pesquisarMedida(PEDIDO, { id: null, nome: 'Eng. Teste' });
      assert.strictEqual(r.situacao, 'encontrado');
      assert.strictEqual(r.registro.origem, 'pesquisa_ia');
      assert.strictEqual(r.registro.verificado, false);
      assert.strictEqual(r.registro.fabricante, 'WEG');
      // revisão do uso de IA (06/11/2026): a mesma especificação já pesquisada sai do catálogo, sem IA; "pesquisar de
      // novo" (fresco) atualiza o achado da IA ainda não conferido
      const antes = chamadas;
      const deNovo = await S.pesquisarMedida(PEDIDO, null);
      assert.deepStrictEqual([deNovo.situacao, chamadas], ['ja_no_catalogo', antes], 'já pesquisado: não chama a IA');
      const de2 = await S.pesquisarMedida(PEDIDO, null, { fresco: true });
      assert.strictEqual(de2.situacao, 'encontrado', 'pesquisa_ia ainda não conferida pode ser atualizada (fresco)');
      const loja = await S.pesquisarMedida({ ...PEDIDO, especificacao: `LOJAMARCA ${SUF}` }, null);
      assert.strictEqual(loja.situacao, 'nao_encontrado');
      assert.match(loja.motivo, /loja/);
      // o "não encontrado" fica lembrado (30 dias): a mesma especificação não gasta IA de novo; fresco tenta outra vez
      const n = chamadas;
      const lembrado = await S.pesquisarMedida({ ...PEDIDO, especificacao: `LOJAMARCA ${SUF}` }, null);
      assert.deepStrictEqual([lembrado.situacao, lembrado.lembrado, chamadas], ['nao_encontrado', true, n]);
      assert.match(lembrado.motivo, /já pesquisado em/);
      await S.pesquisarMedida({ ...PEDIDO, especificacao: `LOJAMARCA ${SUF}` }, null, { fresco: true });
      assert.strictEqual(chamadas, n + 1);
      // a busca passa o prazo total e o sinal de cancelamento para a IA
      let opcoesVistas = null;
      const pesquisarAntes = ia.pesquisarWeb;
      ia.pesquisarWeb = async (p, o) => { opcoesVistas = o; return pesquisarAntes(p, o); };
      const sinal = new AbortController().signal;
      try { await S.pesquisarMedida({ ...PEDIDO, especificacao: `LOJAMARCA prazo ${SUF}` }, null, { signal: sinal }); } finally { ia.pesquisarWeb = pesquisarAntes; }
      assert.ok(opcoesVistas.timeoutTotalMs > 0 && opcoesVistas.timeoutTotalMs < 300000, 'prazo total menor que o da tela');
      assert.strictEqual(opcoesVistas.signal, sinal);
      // cancelada pela tela: 499, sem seguir a cadeia
      ia.pesquisarWeb = async () => { throw Object.assign(new Error('pedido à IA cancelado'), { cancelado: true }); };
      try { await assert.rejects(S.pesquisarMedida({ ...PEDIDO, especificacao: `cancelada ${SUF}` }, null), (e) => e.status === 499); } finally { ia.pesquisarWeb = pesquisarAntes; }
      const { rows } = await pool.query('SELECT 1 FROM componentes_quadro WHERE referencia = $1', [`LOJA-${SUF}`]);
      assert.strictEqual(rows.length, 0);
      await assert.rejects(S.pesquisarMedida({ fabricante: 'WEG', tipo: 'xx', especificacao: 'a' }), (e) => e.status === 400);
    });

    await caso('sem IA disponível: 422 com a explicação', async () => {
      ia.disponivel = () => false;
      try { await assert.rejects(S.pesquisarMedida({ ...PEDIDO, especificacao: `sem IA ${SUF}` }), (e) => e.status === 422); } finally { ia.disponivel = () => true; }
    });

    await caso(`busca em lote: no máximo ${S.LIMITE_LOTE} por pedido, sem repetir, pula o já pesquisado`, async () => {
      const lista = [
        PEDIDO, // já pesquisado no caso anterior
        ...Array.from({ length: S.LIMITE_LOTE + 3 }, (_, i) => ({ tag: `Q${i}`, fabricante: 'WEG', tipo: 'contator', especificacao: `item ${i} ${SUF}` })),
        { tag: 'Q0b', fabricante: 'WEG', tipo: 'contator', especificacao: `item 0 ${SUF}` }, // repetido
        { tag: 'X', fabricante: '', tipo: 'contator', especificacao: 'sem fabricante' },
      ];
      chamadas = 0;
      const t = await S.iniciarPesquisaEmLote(lista, { id: null, nome: 'Eng. Teste' });
      assert.strictEqual(t.ignorados, 3);
      for (let i = 0; i < 100 && S.lerTarefa(t.id, { id: null }).situacao !== 'concluida'; i++) await new Promise(r => setTimeout(r, 50));
      const fim = S.lerTarefa(t.id, { id: null });
      assert.strictEqual(fim.situacao, 'concluida');
      assert.strictEqual(chamadas, S.LIMITE_LOTE);
      assert.strictEqual(fim.itens.filter(i => i.situacao === 'encontrado').length, S.LIMITE_LOTE);
      assert.strictEqual(fim.itens.find(i => i.especificacao === PEDIDO.especificacao).situacao, 'ja_no_catalogo');
      assert.strictEqual(fim.itens.find(i => i.tag === 'X').situacao, 'ignorado');
      assert.strictEqual(S.lerTarefa(t.id, { id: 999999, role: 'user' }), null, 'tarefa de outro usuário');
    });

    // ── rotas ──
    const app = express();
    app.use(express.json());
    app.use('/api', require('../src/routes'));
    app.use(require('../src/middleware/erros').tratarErros);
    servidor = app.listen(0, '127.0.0.1');
    await new Promise(r => servidor.once('listening', r));
    const base = `http://127.0.0.1:${servidor.address().port}/api`;
    const pedir = async (metodo, caminho, token, corpo) => {
      const r = await fetch(`${base}${caminho}`, {
        method: metodo, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
      const texto = await r.text();
      let dados; try { dados = JSON.parse(texto); } catch { dados = texto; }
      return { status: r.status, dados };
    };
    const { rows: [u] } = await pool.query(
      "INSERT INTO usuarios (nome, email, senha, role, ativo, senha_provisoria) VALUES ($1,$2,'x-sem-login','user',true,false) RETURNING id, nome, email, role",
      [`Teste Componentes ${SUF}`, `teste-componentes-${SUF}@exemplo.invalid`]);
    criados.usuarios.push(u.id);
    const token = jwt.sign({ id: u.id, nome: u.nome, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });

    await caso('rotas: sem login 401 em todas; usuário comum lê mas não cadastra/edita/aprova/exclui (403)', async () => {
      const rotas = [
        ['GET', '/componentes-quadro'], ['GET', `/componentes-quadro/${idManual}`], ['POST', '/componentes-quadro'],
        ['PUT', `/componentes-quadro/${idManual}`], ['POST', `/componentes-quadro/${idManual}/aprovar`], ['DELETE', `/componentes-quadro/${idManual}`],
        ['POST', '/componentes-quadro/pesquisar-medida'], ['POST', '/componentes-quadro/pesquisar-medidas'], ['GET', '/componentes-quadro/pesquisas/abc'],
        ['POST', '/laudos/1/documento/modelo3d/abrir'],
      ];
      for (const [m, c] of rotas) assert.strictEqual((await pedir(m, c, null, m === 'GET' || m === 'DELETE' ? undefined : {})).status, 401, `${m} ${c} sem login`);
      const lista = await pedir('GET', `/componentes-quadro?fabricante=${encodeURIComponent(FAB)}`, token);
      assert.strictEqual(lista.status, 200);
      assert.strictEqual(lista.dados.itens.length, 1);
      assert.ok(Array.isArray(lista.dados.fabricantes) && lista.dados.tipos.length > 20);
      assert.strictEqual((await pedir('GET', `/componentes-quadro/${idManual}`, token)).dados.referencia, `REF-${SUF}`);
      for (const [m, c] of [['POST', '/componentes-quadro'], ['PUT', `/componentes-quadro/${idManual}`], ['POST', `/componentes-quadro/${idManual}/aprovar`], ['DELETE', `/componentes-quadro/${idManual}`]]) {
        assert.strictEqual((await pedir(m, c, token, m === 'DELETE' ? undefined : { ...BOM })).status, 403, `${m} ${c} usuário comum`);
      }
      assert.strictEqual((await pedir('GET', '/componentes-quadro/abc', token)).status, 400, 'id inválido');
      assert.strictEqual((await pedir('GET', '/componentes-quadro/pesquisas/naoexiste', token)).status, 404);
      assert.strictEqual((await pedir('POST', '/componentes-quadro/pesquisar-medida', token, { fabricante: 'WEG', tipo: 'invalido', especificacao: 'x' })).status, 400);
    });

    await caso('documento HTML em aba: link curto inválido/expirado = 404 texto, sem login', async () => {
      const r = await fetch(`${base}/documentos-html/ver/${'0'.repeat(48)}`);
      assert.strictEqual(r.status, 404);
      assert.match(await r.text(), /expirado/);
      assert.strictEqual((await fetch(`${base}/documentos-html/ver/..%2F..%2Fx`)).status, 404);
    });

    await caso('excluir (admin): sai do banco e fica na auditoria', async () => {
      await S.remover(idManual, { id: null });
      assert.strictEqual(await S.buscarUm(idManual), null);
      const { rows } = await pool.query("SELECT 1 FROM auditoria WHERE entidade = 'componente_quadro' AND entidade_id = $1", [idManual]);
      assert.strictEqual(rows.length, 1);
    });
  } finally {
    ia.disponivel = disponivelOriginal;
    ia.pesquisarWeb = pesquisarOriginal;
    if (servidor) servidor.close();
    await pool.query("DELETE FROM componentes_quadro WHERE referencia LIKE $1 OR fabricante LIKE $2", [`%${SUF}`, `%${SUF}`]).catch(() => {});
    await pool.query("DELETE FROM componentes_quadro_nao_encontrados WHERE chave LIKE $1", [`%${SUF.toLowerCase()}%`]).catch(() => {});
    await pool.query("DELETE FROM auditoria WHERE entidade = 'componente_quadro' AND detalhes::text LIKE $1", [`%${SUF}%`]).catch(() => {});
    if (criados.usuarios.length) await pool.query('DELETE FROM usuarios WHERE id = ANY($1)', [criados.usuarios]).catch(() => {});
    await pool.end();
  }
  console.log(`componentesQuadro: ${ok} casos ok`);
})().catch((e) => { console.error(e); process.exitCode = 1; });
