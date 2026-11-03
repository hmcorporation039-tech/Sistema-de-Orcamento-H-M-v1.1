// Mapa do CAD confirmado pelo engenheiro (item 3 do plano): o desenho com símbolos explodidos vira um mapa
// (layer × forma → tipo, quantidade, origem); o que ainda não foi conferido fica fora do orçamento; a
// confirmação entra na releitura e vira aprendizado. DXF SINTÉTICO (nenhum dado de cliente).
// Rodar: node testes/mapaCad.test.js (a parte do banco só roda em hm_orcamentos_v2).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
// as pastas do projeto desta prova ficam numa pasta temporária (nunca na pasta real do sistema)
const PASTA_TESTE = fs.mkdtempSync(path.join(os.tmpdir(), 'mapacad-'));
process.env.PASTA_ARQUIVOS_SISTEMA = PASTA_TESTE;
const { lerArquivoCad } = require('../src/services/analiseCad');
const mapaCad = require('../src/services/mapaCad');

const SK = require('../src/config/caminhos').RAIZ_SKILLS;
const { DesenhoDxf } = require(path.join(SK, '_comum', 'cad', 'dxf.js'));

function dxfExplodido() {
  const d = new DesenhoDxf({ layers: [
    { nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'EL-TOMADAS', cor: 1 }, { nome: 'EL-SIMBOLOS', cor: 3 },
  ] });
  d.polilinha([[0, 0], [6, 0], [6, 4], [0, 4]], { layer: 'A-PAREDE', fechada: true });
  d.polilinha([[6.15, 0], [10, 0], [10, 4], [6.15, 4]], { layer: 'A-PAREDE', fechada: true });
  d.texto(2.5, 2, 0.2, 'SALA DE ESTAR', { layer: 'A-TEXTO' });
  d.texto(7.5, 2, 0.2, 'ESCRITORIO', { layer: 'A-TEXTO' });
  // tomadas: triângulos de 0,30 m na layer que diz o que é (tipo vem da regra da layer)
  for (const x of [0.5, 1.5, 2.5, 7, 8]) d.polilinha([[x, 0.3], [x + 0.3, 0.3], [x + 0.15, 0.56]], { layer: 'EL-TOMADAS', fechada: true });
  // três quadrados de 0,40 m numa layer sem nome de tipo: o sistema não sabe o que são
  for (const x of [1, 3, 8.5]) d.polilinha([[x, 3], [x + 0.4, 3], [x + 0.4, 3.4], [x, 3.4]], { layer: 'EL-SIMBOLOS', fechada: true });
  return d.toString();
}

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = `${nome}: ${e.message}`; throw e; } };

(async () => {
  const dxf = Buffer.from(dxfExplodido());
  let proposto;

  await caso('o desenho com símbolos explodidos devolve o mapa', async () => {
    const r = await lerArquivoCad(dxf, 'planta.dxf');
    assert.ok(r.mapa, 'sem mapa');
    assert.strictEqual(r.mapa.arquivo, 'planta.dxf');
    assert.strictEqual(r.mapa.valeParaOrcamento, true);
    const tomadas = r.mapa.simbolos.find(s => s.layer === 'EL-TOMADAS');
    const desconhecido = r.mapa.simbolos.find(s => s.layer === 'EL-SIMBOLOS');
    assert.ok(tomadas && desconhecido, JSON.stringify(r.mapa.simbolos));
    assert.strictEqual(tomadas.quantidade, 5);
    assert.strictEqual(tomadas.contados, 5, 'os pontos contados saem da planta');
    assert.match(tomadas.simbolo, /^HM-ELE-TOMADA|^HM-ELE-PONTO/);
    assert.strictEqual(tomadas.origem, 'regra');
    assert.strictEqual(desconhecido.simbolo, '?');
    assert.strictEqual(desconhecido.origem, 'nao_reconhecido');
    assert.strictEqual(desconhecido.contados, 0, 'tipo desconhecido não gera ponto');
    assert.ok(r.mapa.simbolos.every((s, i) => s.idx === i));
    // até conferir, o ponto fica de fora do orçamento (ambíguo) e marcado para conferir
    const item = r.pagina.itens.find(it => it.tipo === 'simbolo');
    assert.ok(item.ambiguo && item.conferir && item.origemDescricao === 'desenho');
    proposto = r.mapa;
    // planta da tela: a posição de cada ponto lido, com a linha do mapa, e a caixa que a envolve
    const pl = r.mapa.planta;
    assert.ok(pl && pl.pontos.length >= 5, 'sem planta do mapa');
    assert.ok(pl.pontos.every(p => Number.isInteger(p[0]) && r.mapa.simbolos[p[0]] && Number.isFinite(p[1]) && Number.isFinite(p[2])));
    assert.strictEqual(pl.pontos.filter(p => p[0] === tomadas.idx).length, 5);
    assert.strictEqual(pl.pontos.filter(p => p[0] === desconhecido.idx).length, 3, 'o que não foi reconhecido também aparece na planta');
    assert.ok(r.mapa.simbolos.every(q => !('centros' in q)), 'as posições ficam só na planta');
    const [x0, y0, x1, y1] = pl.caixa;
    assert.ok(x0 < x1 && y0 < y1 && pl.pontos.every(p => p[1] >= x0 && p[1] <= x1 && p[2] >= y0 && p[2] <= y1));
  });

  await caso('a confirmação na releitura conta no orçamento e some o "a conferir"', async () => {
    const confirmados = mapaCad.confirmadasDoMapa(mapaCad.aplicarNoMapa(proposto, [
      { idx: proposto.simbolos.findIndex(s => s.layer === 'EL-TOMADAS'), simbolo: 'HM-ELE-TOMADA-MEDIA', altura_m: 1.1, confirmado: true },
      { idx: proposto.simbolos.findIndex(s => s.layer === 'EL-SIMBOLOS'), simbolo: 'HM-ALM-SIRENE', confirmado: true },
    ]).mapa);
    assert.strictEqual(confirmados.length, 2);
    const r = await lerArquivoCad(dxf, 'planta.dxf', { confirmados });
    const tomada = r.pagina.itens.find(it => it.tipo === 'simbolo' && it.bloco === 'HM-ELE-TOMADA-MEDIA');
    const sirene = r.pagina.itens.find(it => it.tipo === 'simbolo' && it.bloco === 'HM-ALM-SIRENE');
    assert.ok(tomada && sirene, JSON.stringify(r.pagina.itens.map(i => [i.bloco, i.quantidade])));
    assert.strictEqual(tomada.quantidade, 5); assert.strictEqual(sirene.quantidade, 3);
    for (const it of [tomada, sirene]) { assert.strictEqual(it.ambiguo, false); assert.ok(!it.conferir); assert.strictEqual(it.origemDescricao, 'confirmado'); }
    assert.strictEqual(tomada.altura_m, 1.1);
    const linhaSirene = r.mapa.simbolos.find(s => s.layer === 'EL-SIMBOLOS');
    assert.deepStrictEqual([linhaSirene.origem, linhaSirene.confirmado, linhaSirene.contados], ['confirmado', true, 3]);
    // os pontos da análise carregam a linha do mapa e a confirmação
    assert.ok(r.espacial.pontos.length >= 8);
  });

  await caso('"não é ponto" (?) confirmado tira a layer da contagem', async () => {
    const i = proposto.simbolos.findIndex(s => s.layer === 'EL-TOMADAS');
    const confirmados = mapaCad.confirmadasDoMapa(mapaCad.aplicarNoMapa(proposto, [{ idx: i, simbolo: '?', confirmado: true }]).mapa);
    const r = await lerArquivoCad(dxf, 'planta.dxf', { confirmados });
    assert.ok(!r.pagina.itens.some(it => it.tipo === 'simbolo' && /TOMADA/.test(it.bloco)));
    assert.strictEqual(r.mapa.simbolos[i].contados, 0);
  });

  await caso('CAD-03: linhas vizinhas (20/22/24 cm) confirmadas com tipos diferentes não contam o mesmo símbolo duas vezes', async () => {
    const d = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'EL-SIMBOLOS', cor: 3 }] });
    d.polilinha([[0, 0], [10, 0], [10, 8], [0, 8]], { layer: 'A-PAREDE', fechada: true });
    d.texto(5, 7, 0.2, 'SALA', { layer: 'A-TEXTO' });
    [0.20, 0.22, 0.24].forEach((l, k) => { for (let i = 0; i < 3; i++) d.polilinha([[1 + i * 2, 1 + k * 2], [1 + i * 2 + l, 1 + k * 2], [1 + i * 2 + l, 1 + k * 2 + l], [1 + i * 2, 1 + k * 2 + l]], { layer: 'EL-SIMBOLOS', fechada: true }); });
    const buf = Buffer.from(d.toString());
    const r0 = await lerArquivoCad(buf, 'vizinhas.dxf');
    const linhas = r0.mapa.simbolos.filter(s => s.layer === 'EL-SIMBOLOS');
    assert.strictEqual(linhas.reduce((t, s) => t + s.quantidade, 0), 9, JSON.stringify(linhas.map(s => [s.medida, s.quantidade])));
    const confirmados = mapaCad.confirmadasDoMapa(mapaCad.aplicarNoMapa(r0.mapa, linhas.map((s, k) => ({ idx: s.idx, simbolo: k === 0 ? 'HM-ELE-TOMADA-BAIXA' : 'HM-ELE-INTERRUPTOR', confirmado: true }))).mapa);
    const r = await lerArquivoCad(buf, 'vizinhas.dxf', { confirmados });
    const pontos = r.pagina.itens.filter(it => it.tipo === 'simbolo').reduce((t, it) => t + it.quantidade, 0);
    assert.strictEqual(pontos, 9, `9 símbolos desenhados viraram ${pontos} pontos no orçamento (antes: 12)`);
    // e a contagem de cada linha na tela bate com o que ela gera
    for (const s of r.mapa.simbolos.filter(x => x.layer === 'EL-SIMBOLOS')) assert.strictEqual(s.contados, s.quantidade, JSON.stringify(s));
  });

  await caso('validação das correções', async () => {
    assert.match(mapaCad.validarLinhas([], proposto), /ao menos uma/);
    assert.match(mapaCad.validarLinhas([{ idx: 99, simbolo: '?' }], proposto), /inexistente/);
    assert.match(mapaCad.validarLinhas([{ idx: 0, simbolo: 'HM-NAO-EXISTE' }], proposto), /não existe/);
    assert.match(mapaCad.validarLinhas([{ idx: 0, simbolo: '?', altura_m: -1 }], proposto), /Altura inválida/);
    assert.match(mapaCad.validarLinhas([{ idx: 0, simbolo: '?', altura_m: 40 }], proposto), /Altura inválida/);
    assert.strictEqual(mapaCad.validarLinhas([{ idx: 0, simbolo: 'HM-ELE-TOMADA-ALTA', altura_m: '2,0'.replace(',', '.') }, { idx: 1, simbolo: '?' }], proposto), null);
    assert.strictEqual(mapaCad.validarLinhas([{ idx: 0, confirmado: false }], proposto), null, 'desfazer não precisa de tipo');
    const tipos = mapaCad.tiposDisponiveis();
    assert.ok(tipos.length > 30 && tipos.every(t => t.simbolo && t.nome && t.disciplina));
    assert.ok(tipos.some(t => t.simbolo === 'HM-ILU-POSTE' && t.disciplina === 'iluminacao-externa'));
  });

  await caso('aplicar e desfazer a confirmação', async () => {
    const i = proposto.simbolos.findIndex(s => s.layer === 'EL-TOMADAS');
    const antes = JSON.stringify(proposto);
    const { mapa: m1, alteradas } = mapaCad.aplicarNoMapa(proposto, [{ idx: i, simbolo: 'HM-ELE-TOMADA-ALTA', altura_m: 2.2, confirmado: true }]);
    assert.strictEqual(JSON.stringify(proposto), antes, 'o mapa original não pode mudar');
    const s = m1.simbolos[i];
    assert.deepStrictEqual([s.simbolo, s.origem, s.confirmado, s.corrigido, s.altura_m, s.disciplina], ['HM-ELE-TOMADA-ALTA', 'confirmado', true, true, 2.2, 'eletrica']);
    assert.strictEqual(s.proposto.simbolo, proposto.simbolos[i].simbolo, 'guarda o que o sistema tinha proposto');
    assert.strictEqual(alteradas.length, 1);
    // confirmar duas vezes não perde o proposto original
    const { mapa: m2 } = mapaCad.aplicarNoMapa(m1, [{ idx: i, simbolo: 'HM-ELE-TOMADA-BAIXA', confirmado: true }]);
    assert.strictEqual(m2.simbolos[i].proposto.simbolo, proposto.simbolos[i].simbolo);
    assert.strictEqual(m2.simbolos[i].altura_m, undefined, 'sem altura informada, a altura sai');
    // desfazer volta ao proposto
    const { mapa: m3, alteradas: a3 } = mapaCad.aplicarNoMapa(m2, [{ idx: i, confirmado: false }]);
    assert.strictEqual(a3[0].desfeita, true);
    const volta = m3.simbolos[i];
    assert.deepStrictEqual([volta.simbolo, volta.origem, volta.confirmado, volta.proposto], [proposto.simbolos[i].simbolo, 'regra', undefined, undefined]);
    // desfazer o que não estava confirmado não faz nada
    assert.strictEqual(mapaCad.aplicarNoMapa(proposto, [{ idx: i, confirmado: false }]).alteradas.length, 0);
    const r = mapaCad.resumoDoMapa(m1);
    assert.strictEqual(r.conferidas, 1); assert.ok(r.pendentes >= 1 && r.naoReconhecidas === 1);
  });

  await caso('ponto conferido de disciplina que não foi marcada no envio é avisado', () => {
    const mapa = { simbolos: [
      { idx: 0, layer: 'A', simbolo: 'HM-ALM-SIRENE', disciplina: 'alarme', confirmado: true, contados: 2 },
      { idx: 1, layer: 'B', simbolo: 'HM-ELE-TOMADA-BAIXA', disciplina: 'eletrica', confirmado: true, contados: 5 },
      { idx: 2, layer: 'C', simbolo: 'HM-ALM-SENSOR-IVP', disciplina: 'alarme', confirmado: false, contados: 4 },
      { idx: 3, layer: 'D', simbolo: '?', disciplina: '', confirmado: true, contados: 0 },
      { idx: 4, layer: 'E', simbolo: 'HM-CAB-PONTO-RJ45', disciplina: 'rede', confirmado: true, contados: 3 },
    ] };
    const falta = mapaCad.disciplinasAIncluir(mapa, ['eletrica']);
    assert.deepStrictEqual(falta.map(d => [d.chave, d.linhas, d.pontos]), [['alarme', 1, 2], ['cabeamento', 1, 3]]);
    assert.deepStrictEqual(mapaCad.disciplinasAIncluir(mapa, ['eletrica', 'alarme', 'cabeamento']), [], 'tudo marcado: nada a incluir');
    assert.deepStrictEqual(mapaCad.disciplinasAIncluir(mapa, ['eletrica', 'alarme', 'rede']), [], 'rede e cabeamento são o mesmo grupo');
    assert.strictEqual(mapaCad.chaveDoProjeto('controle-acesso'), 'controle_acesso');
    assert.strictEqual(mapaCad.chaveDoProjeto('nao-existe'), null);
  });

  // ── rotas e arquivos ──
  await caso('rotas do mapa passam por autenticação e posse', async () => {
    const rotas = fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'index.js'), 'utf8');
    assert.match(rotas, /router\.get\('\/projetos\/analises\/:id\/mapa', autenticar, validarId, projCtrl\.lerMapaCad\)/);
    assert.match(rotas, /router\.put\('\/projetos\/analises\/:id\/mapa', autenticar, validarId, posseAnalise, projCtrl\.salvarMapaCad\)/);
    assert.match(rotas, /router\.post\('\/projetos\/analises\/:id\/mapa\/reprocessar', autenticar, validarId, posseAnalise, projCtrl\.reprocessarMapaCad\)/);
  });

  // ── aprendizado (só no banco do v2) ──
  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`mapaCad: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    const simbolosAprendidos = require('../src/services/simbolosAprendidos');
    const ARQ = 'ZZ-teste-mapa.dxf';
    const limpar = () => pool.query(`DELETE FROM cad_simbolos_aprendidos WHERE arquivo = ANY($1) OR layer LIKE 'ZZ-TESTE-%'`, [[ARQ, 'ZZ-planta-mapa.dxf']]);
    try {
      await limpar();
      await caso('confirmação vira aprendizado do usuário, vale mais que a legenda e se desfaz', async () => {
        const m = { arquivo: ARQ, simbolos: [{ idx: 0, layer: 'ZZ-TESTE-LAYER', medida: [0.4, 0.4], quantidade: 3, simbolo: '?', origem: 'nao_reconhecido' }] };
        const { mapa, alteradas } = mapaCad.aplicarNoMapa(m, [{ idx: 0, simbolo: 'HM-ALM-SIRENE', altura_m: 2.4, confirmado: true }]);
        assert.strictEqual(await mapaCad.aprender(alteradas, ARQ), 1);
        let aprendidos = (await simbolosAprendidos.carregar()).filter(l => l.layer === 'ZZ-TESTE-LAYER');
        assert.strictEqual(aprendidos.length, 1);
        assert.deepStrictEqual([aprendidos[0].simbolo, aprendidos[0].altura_m, aprendidos[0].usuario], ['HM-ALM-SIRENE', 2.4, true]);
        // corrigir de novo troca o tipo (não conta conflito) e mantém a origem do usuário
        const { alteradas: a2 } = mapaCad.aplicarNoMapa(mapa, [{ idx: 0, simbolo: 'HM-INC-AVISADOR', altura_m: 2.3, confirmado: true }]);
        await mapaCad.aprender(a2, ARQ);
        const { rows } = await pool.query(`SELECT simbolo, origem, conflitos, vezes FROM cad_simbolos_aprendidos WHERE layer = 'ZZ-TESTE-LAYER'`);
        assert.deepStrictEqual([rows.length, rows[0].simbolo, rows[0].origem, rows[0].conflitos], [1, 'HM-INC-AVISADOR', 'usuario', 0]);
        // "não é ponto" não se aprende
        const { alteradas: a3 } = mapaCad.aplicarNoMapa(mapa, [{ idx: 0, simbolo: '?', confirmado: true }]);
        assert.strictEqual(await mapaCad.aprender(a3, ARQ), 0);
        // desfazer esquece
        const { alteradas: a4 } = mapaCad.aplicarNoMapa(a2[0].depois ? { ...m, simbolos: [a2[0].depois] } : m, [{ idx: 0, confirmado: false }]);
        assert.strictEqual(await mapaCad.esquecer(a4), 1);
        aprendidos = (await simbolosAprendidos.carregar()).filter(l => l.layer === 'ZZ-TESTE-LAYER');
        assert.strictEqual(aprendidos.length, 0);
      });
      await caso('o tipo aprendido do usuário aparece no mapa do próximo desenho (mesmo contra a regra da layer)', async () => {
        // quadrados de 0,40 m na layer EL-SIMBOLOS: o usuário já disse que são sirenes
        await mapaCad.aprender(mapaCad.aplicarNoMapa({ arquivo: ARQ, simbolos: [{ idx: 0, layer: 'EL-SIMBOLOS', medida: [0.4, 0.4], quantidade: 3, simbolo: '?' }] },
          [{ idx: 0, simbolo: 'HM-ALM-SIRENE', altura_m: 2.4, confirmado: true }]).alteradas, ARQ);
        const aprendidos = await simbolosAprendidos.carregar();
        const r = await lerArquivoCad(dxf, 'planta2.dxf', { aprendidos });
        const linha = r.mapa.simbolos.find(s => s.layer === 'EL-SIMBOLOS');
        assert.deepStrictEqual([linha.simbolo, linha.origem, linha.altura_m], ['HM-ALM-SIRENE', 'aprendido', 2.4]);
        // mas continua a conferir: o aprendido só pré-preenche, quem conta é a confirmação
        assert.ok(r.pagina.itens.filter(it => it.tipo === 'simbolo').every(it => it.ambiguo));
      });
      await caso('rotas de ponta a ponta: ler, corrigir, aprender, desfazer e reprocessar', async () => {
        const express = require('express');
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../src/config/segredos');
        const { analisarProjetoCompleto } = require('../src/services/compatibilizacaoAnalise');
        const { sincronizarProjeto } = require('../src/services/pastasRegistros');
        const { rows: [u] } = await pool.query("SELECT id, nome, email, role FROM usuarios WHERE role = 'admin' AND ativo = true ORDER BY id LIMIT 1");
        assert.ok(u, 'o banco de teste precisa de um administrador');
        const token = jwt.sign({ id: u.id, nome: u.nome, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
        const NOME = 'ZZ-planta-mapa.dxf';
        const arquivos = [{ buffer: dxf, nomeArquivo: NOME, disciplinas: ['eletrica'] }];
        const resultado = await analisarProjetoCompleto(arquivos);
        assert.ok(resultado.dadosExtraidos[0].mapa_cad, 'a análise guarda o mapa do CAD');
        // o usuário revisou a análise: mudou o valor de um serviço, retirou outro e acrescentou um serviço e um material
        assert.ok(resultado.servicos.length >= 3 && resultado.materiais.length >= 1, 'a análise de elétrica traz itens-modelo');
        const servicosEditados = [{ ...resultado.servicos[0], valor_unitario: 123.45 }, ...resultado.servicos.slice(2), { codigo: null, descricao: 'ZZ serviço manual', disciplina: 'eletrica', unidade: 'un', quantidade: 3, valor_unitario: 10, pronto: false }];
        const materiaisEditados = [...resultado.materiais, { descricao: 'ZZ material manual', disciplina: 'eletrica', unidade: 'un', quantidade: 2, pronto: false }];
        const ins = await pool.query(
          `INSERT INTO analises_projeto (cliente_nome, disciplinas, arquivos_analisados, ambientes, pontos_por_ambiente, cameras, pontos_rede_antena, tabela_cabos, achados, servicos, materiais, usuario_id, nome_projeto, dados_extraidos, finalidade)
           VALUES ('ZZ Cliente', $1, $2, '[]', '[]', '{}', '{}', '[]', '[]', $5, $6, $3, 'ZZ Mapa CAD', $4, 'orcamento') RETURNING *`,
          [JSON.stringify(resultado.disciplinas), JSON.stringify(resultado.arquivosAnalisados), u.id, JSON.stringify(resultado.dadosExtraidos), JSON.stringify(servicosEditados), JSON.stringify(materiaisEditados)]);
        const analise = ins.rows[0];
        await pool.query('UPDATE analises_projeto SET leitura_original = $1 WHERE id = $2', [JSON.stringify({ servicos: resultado.servicos, materiais: resultado.materiais }), analise.id]);
        await sincronizarProjeto(analise, arquivos);
        const app = express();
        app.use(express.json());
        app.use('/api', require('../src/routes'));
        app.use(require('../src/middleware/erros').tratarErros);
        const servidor = app.listen(0, '127.0.0.1');
        await new Promise(r => servidor.once('listening', r));
        const base = `http://127.0.0.1:${servidor.address().port}/api`;
        const chamar = async (metodo, caminho, corpo, semToken) => {
          const r = await fetch(base + caminho, { method: metodo, headers: { 'Content-Type': 'application/json', ...(semToken ? {} : { Authorization: `Bearer ${token}` }) }, ...(corpo ? { body: JSON.stringify(corpo) } : {}) });
          return { status: r.status, corpo: await r.json().catch(() => null) };
        };
        const novas = [];
        try {
          const URL = `/projetos/analises/${analise.id}/mapa`;
          assert.strictEqual((await chamar('GET', URL, null, true)).status, 401);
          assert.strictEqual((await chamar('PUT', URL, { arquivo: NOME, linhas: [{ idx: 0, simbolo: '?' }] }, true)).status, 401);
          let r = await chamar('GET', URL);
          assert.strictEqual(r.status, 200);
          assert.strictEqual(r.corpo.disponivel, true);
          assert.ok(r.corpo.tipos.length > 30);
          const mapa = r.corpo.arquivos[0];
          assert.strictEqual(mapa.arquivo, NOME);
          assert.strictEqual(mapa.resumo.conferidas, 0);
          const iT = mapa.simbolos.findIndex(x => x.layer === 'EL-TOMADAS'); const iS = mapa.simbolos.findIndex(x => x.layer === 'EL-SIMBOLOS');
          assert.strictEqual((await chamar('GET', '/projetos/analises/999999999/mapa')).status, 404);
          // entradas inválidas
          assert.strictEqual((await chamar('PUT', URL, { arquivo: 'outro.dxf', linhas: [{ idx: iT, simbolo: '?' }] })).status, 404);
          assert.strictEqual((await chamar('PUT', URL, { arquivo: NOME, linhas: [{ idx: iT, simbolo: 'HM-NAO-EXISTE' }] })).status, 400);
          assert.strictEqual((await chamar('PUT', URL, { arquivo: NOME, linhas: [{ idx: 99, simbolo: '?' }] })).status, 400);
          assert.strictEqual((await chamar('PUT', URL, { arquivo: NOME, linhas: [] })).status, 400);
          assert.strictEqual((await chamar('POST', URL + '/reprocessar', {})).status, 400, 'sem confirmar nada não reprocessa');
          // corrige: as tomadas ficam médias a 1,10 m e os quadrados são sirenes
          r = await chamar('PUT', URL, { arquivo: NOME, linhas: [{ idx: iT, simbolo: 'HM-ELE-TOMADA-MEDIA', altura_m: 1.1, confirmado: true }, { idx: iS, simbolo: 'HM-ALM-SIRENE', altura_m: 2.4, confirmado: true }] });
          assert.strictEqual(r.status, 200, JSON.stringify(r.corpo));
          assert.strictEqual(r.corpo.arquivos[0].resumo.conferidas, 2);
          assert.strictEqual(r.corpo.aprendidas, 2);
          const { rows } = await pool.query("SELECT simbolo, origem FROM cad_simbolos_aprendidos WHERE layer IN ('EL-TOMADAS', 'EL-SIMBOLOS') AND arquivo = $1 ORDER BY layer", [NOME]);
          assert.deepStrictEqual(rows.map(x => [x.simbolo, x.origem]), [['HM-ALM-SIRENE', 'usuario'], ['HM-ELE-TOMADA-MEDIA', 'usuario']]);
          const aud = await pool.query("SELECT count(*)::int AS n FROM auditoria WHERE entidade = 'analises_projeto' AND entidade_id = $1 AND acao = 'mapa_cad'", [analise.id]);
          assert.strictEqual(aud.rows[0].n, 1);
          // a confirmação ficou guardada na análise
          assert.strictEqual((await pool.query('SELECT dados_extraidos FROM analises_projeto WHERE id = $1', [analise.id])).rows[0].dados_extraidos[0].mapa_cad.simbolos[iS].confirmado, true);
          // desfazer uma das duas esquece o que ela ensinou
          r = await chamar('PUT', URL, { arquivo: NOME, linhas: [{ idx: iS, confirmado: false }] });
          assert.strictEqual(r.corpo.arquivos[0].resumo.conferidas, 1); assert.strictEqual(r.corpo.esquecidas, 1);
          // reprocessa com a tomada conferida: análise NOVA, a antiga fica como está
          r = await chamar('POST', URL + '/reprocessar', {});
          assert.strictEqual(r.status, 200, JSON.stringify(r.corpo));
          novas.push(r.corpo.id);
          assert.notStrictEqual(r.corpo.id, analise.id);
          assert.match(r.corpo.nomeProjeto, /\(mapa confirmado\)$/);
          const dadosNovos = r.corpo.dadosExtraidos[0];
          const tomadaNova = dadosNovos.desenho[0].itens.find(it => it.bloco === 'HM-ELE-TOMADA-MEDIA');
          assert.ok(tomadaNova && tomadaNova.ambiguo === false && tomadaNova.quantidade === 5, JSON.stringify(dadosNovos.desenho[0].itens));
          const linhaNova = dadosNovos.mapa_cad.simbolos.find(x => x.layer === 'EL-TOMADAS');
          assert.deepStrictEqual([linhaNova.origem, linhaNova.contados], ['confirmado', 5]);
          // as edições do usuário na análise antiga foram copiadas para a nova
          const h = r.corpo.edicoesHerdadas;
          assert.strictEqual(h.copiadas, true, JSON.stringify(h));
          assert.ok(h.alterados >= 1 && h.removidos >= 1 && h.acrescentados >= 2, JSON.stringify(h));
          assert.strictEqual(r.corpo.servicos[0].valor_unitario, 123.45);
          assert.ok(!r.corpo.servicos.some(x => x.descricao === resultado.servicos[1].descricao), 'o serviço retirado continua fora');
          assert.ok(r.corpo.servicos.some(x => x.descricao === 'ZZ serviço manual') && r.corpo.materiais.some(x => x.descricao === 'ZZ material manual'));
          // a análise nova também guarda o que LEU, para um próximo reprocessamento
          const guardada = (await pool.query('SELECT leitura_original FROM analises_projeto WHERE id = $1', [r.corpo.id])).rows[0].leitura_original;
          assert.ok(Array.isArray(guardada.servicos) && !guardada.servicos.some(x => x.descricao === 'ZZ serviço manual'), 'a leitura original não leva as edições');
          // disciplina do ponto conferido que não foi marcada no envio (sirene = alarme): avisada e incluída
          r = await chamar('PUT', URL, { arquivo: NOME, linhas: [{ idx: iS, simbolo: 'HM-ALM-SIRENE', altura_m: 2.4, confirmado: true }] });
          assert.deepStrictEqual(r.corpo.arquivos[0].disciplinasAIncluir.map(d => d.chave), ['alarme']);
          r = await chamar('POST', URL + '/reprocessar', { incluirDisciplinas: false });
          novas.push(r.corpo.id);
          assert.ok(!r.corpo.disciplinas.includes('alarme'), 'incluirDisciplinas:false respeita a marcação do envio');
          r = await chamar('POST', URL + '/reprocessar', {});
          novas.push(r.corpo.id);
          assert.ok(r.corpo.disciplinas.includes('alarme') && r.corpo.disciplinas.includes('eletrica'), JSON.stringify(r.corpo.disciplinas));
          assert.ok(r.corpo.dadosExtraidos[0].desenho[0].itens.some(it => it.bloco === 'HM-ALM-SIRENE' && it.ambiguo === false), 'a sirene conferida entra na contagem');
          // a análise de origem não mudou
          assert.strictEqual((await pool.query('SELECT nome_projeto FROM analises_projeto WHERE id = $1', [analise.id])).rows[0].nome_projeto, 'ZZ Mapa CAD');
        } finally {
          servidor.close();
          // a trilha de auditoria das análises do teste sai junto (não fica apontando para o nada)
          await pool.query("DELETE FROM auditoria WHERE entidade = 'analises_projeto' AND entidade_id = ANY($1)", [[analise.id, ...novas]]).catch(() => {});
          await pool.query('DELETE FROM analises_projeto WHERE id = ANY($1)', [[analise.id, ...novas]]);
        }
      });
    } finally { await limpar(); await pool.end(); fs.rmSync(PASTA_TESTE, { recursive: true, force: true }); }
  }
  fs.rmSync(PASTA_TESTE, { recursive: true, force: true });
  console.log(`mapaCad: ok (${ok} verificações)`);
})().catch(e => { console.error(e); process.exit(1); });
