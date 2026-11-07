// Aprendizado das notas do desenho (item 8 do plano): nota geral de altura → sugestão de altura na linha do mapa;
// por escritório (responsável técnico do carimbo); só vale depois de 2 desenhos sem contradição ou de o engenheiro
// confirmar; sempre sugestão (a linha segue "a conferir"). DXF SINTÉTICO. A parte do banco só roda em hm_orcamentos_v2.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const path = require('path');
const { lerArquivoCad } = require('../src/services/analiseCad');
const mapaCad = require('../src/services/mapaCad');
const { chaveEscritorio } = require('../src/utils/escritorioDoProjeto');
const SK = require('../src/config/caminhos').RAIZ_SKILLS;
const { DesenhoDxf } = require(path.join(SK, '_comum', 'cad', 'dxf.js'));
const { notasDeAltura } = require(path.join(SK, '_comum', 'cad', 'pontosDoDesenho.js'));

const RESPONSAVEL = 'ZZ Escritorio Teste';
function desenho({ notas = [], responsavel = RESPONSAVEL } = {}) {
  const d = new DesenhoDxf({ layers: [{ nome: 'A-PAREDE', cor: 8 }, { nome: 'A-TEXTO', cor: 7 }, { nome: 'EL-TOMADAS', cor: 1 }] });
  d.polilinha([[0, 0], [6, 0], [6, 4], [0, 4]], { layer: 'A-PAREDE', fechada: true });
  d.texto(2.5, 2, 0.2, 'SALA', { layer: 'A-TEXTO' });
  for (const x of [0.5, 1.5, 2.5]) d.polilinha([[x, 0.3], [x + 0.3, 0.3], [x + 0.15, 0.56]], { layer: 'EL-TOMADAS', fechada: true });
  d.texto(12, 8, 0.2, 'NOTAS GERAIS', { layer: 'A-TEXTO' });
  notas.forEach((n, i) => d.texto(12, 7 - i, 0.2, n, { layer: 'A-TEXTO' }));
  if (responsavel) d.texto(12, 1, 0.2, 'RESPONSAVEL TECNICO: ' + responsavel, { layer: 'A-TEXTO' });
  return Buffer.from(d.toString());
}
const linhaTomada = (r) => r.mapa.simbolos.find(s => s.layer === 'EL-TOMADAS');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };

(async () => {
  await caso('nota geral de altura vira a altura sugerida da linha do mapa (e a linha segue a conferir)', async () => {
    const r = await lerArquivoCad(desenho({ notas: ['Tomadas baixas a 0,30 m do piso'] }), 'a.dxf');
    const t = linhaTomada(r);
    assert.deepStrictEqual([t.simbolo, t.altura_m, t.alturaDe], ['HM-ELE-TOMADA-BAIXA', 0.3, 'nota']);
    assert.match(t.alturaTexto, /Tomadas baixas/);
    assert.ok(r.pagina.itens.filter(it => it.tipo === 'simbolo').every(it => it.ambiguo), 'sugestão não conta no orçamento');
    assert.deepStrictEqual(r.aprendizado.notas.map(n => [n.simbolo, n.altura_m]), [['HM-ELE-TOMADA-BAIXA', 0.3]]);
    assert.strictEqual(r.aprendizado.escritorio, chaveEscritorio({ responsavel: RESPONSAVEL }));
  });

  await caso('sem nota nada é inventado; nota de forro, nota com dois tipos e notas que se contradizem ficam de fora', async () => {
    assert.strictEqual(linhaTomada(await lerArquivoCad(desenho(), 'b.dxf')).altura_m, undefined);
    const fora = ['Altura do forro: 3,00 m', 'Tomadas a 0,30 m e interruptores a 1,10 m do piso'];
    assert.strictEqual(linhaTomada(await lerArquivoCad(desenho({ notas: fora }), 'c.dxf')).altura_m, undefined);
    const contradiz = await lerArquivoCad(desenho({ notas: ['Tomadas baixas a 0,30 m do piso', 'Tomadas baixas h=0,40 m'] }), 'd.dxf');
    assert.strictEqual(linhaTomada(contradiz).altura_m, undefined, 'duas alturas para o mesmo tipo: nenhuma vale');
  });

  await caso('notasDeAltura: tomada pela altura, interruptor por tipo, nota de legenda ignorada', () => {
    const arq = { notas: [{ s: 'Tomadas altas a 2,20 m do piso' }, { s: 'Interruptores h = 1,10 m' }, { s: 'Tomada baixa a 0,30 m do piso', legenda: true }] };
    assert.deepStrictEqual(notasDeAltura(arq).map(n => [n.simbolo, n.altura_m]), [['HM-ELE-TOMADA-ALTA', 2.2], ['HM-ELE-INTERRUPTOR', 1.1]]);
  });

  await caso('carimbo sem responsável não herda o costume de ninguém (nem do grupo "sem escritório")', async () => {
    const aprendidas = [{ escritorio: '', simbolo: 'HM-ELE-TOMADA-BAIXA', altura_m: 0.3, texto: 'x' }];
    const r = linhaTomada(await lerArquivoCad(desenho({ responsavel: '' }), 'sem.dxf', { notasAprendidas: aprendidas }));
    assert.strictEqual(r.altura_m, undefined);
  });

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log('notasAprendidas: parte do banco pulada (DB_NAME=' + (process.env.DB_NAME || '(vazio)') + ' — só roda em ' + BANCO_DE_TESTE + ')');
  } else {
    const pool = require('../src/config/database');
    const notas = require('../src/services/notasAprendidas');
    const ESC = chaveEscritorio({ responsavel: RESPONSAVEL });
    // as linhas e os votos de quem ensinou (services/votosAprendizado.js); '' = as confirmações por disciplina do teste
    const limpar = async () => {
      await pool.query("DELETE FROM aprendizado_votos WHERE tipo = 'nota' AND (chave LIKE 'ZZ%' OR fonte LIKE '%zz-disc%')");
      await pool.query("DELETE FROM cad_notas_aprendidas WHERE escritorio LIKE 'ZZ%' OR arquivo LIKE 'zz-disc%'");
    };
    const dele = async () => (await notas.carregar()).filter(n => n.escritorio === ESC);
    try {
      await require('../src/models/migracoes/2.0-53-aprendizado-por-disciplina')(pool);
      await limpar();
      await caso('uma nota lida uma vez só ainda não vale; duas vezes sem contradição vale; a maioria resolve; empate tira do uso', async () => {
        const n = [{ simbolo: 'HM-ELE-TOMADA-BAIXA', altura_m: 0.3, texto: 'Tomadas baixas a 0,30 m do piso' }];
        await notas.registrar(n, ESC, 'p1.dxf');
        assert.strictEqual((await dele()).length, 0);
        await notas.registrar(n, ESC, 'p2.dxf');
        assert.deepStrictEqual((await dele()).map(x => [x.simbolo, x.altura_m]), [['HM-ELE-TOMADA-BAIXA', 0.3]]);
        await notas.registrar([{ ...n[0], altura_m: 0.4 }], ESC, 'p3.dxf'); // outro desenho disse outra altura
        // 2 de 3 projetos (2/3) dizem 0,30: a maioria resolve (antes o conflito era para sempre)
        assert.deepStrictEqual((await dele()).map(x => x.altura_m), [0.3], 'a maioria (3+ projetos, 2/3 deles) vale');
        await notas.registrar([{ ...n[0], altura_m: 0.4 }], ESC, 'p4.dxf');
        assert.strictEqual((await dele()).length, 0, '2 × 2: com conflito a sugestão sai do uso');
        // o mesmo projeto relido não vota de novo
        await notas.registrar([{ ...n[0], altura_m: 0.4 }], ESC, 'p4.dxf');
        assert.strictEqual((await dele()).length, 0);
      });

      await caso('o mesmo arquivo analisado de novo não conta como outro desenho; escritório vazio não grava', async () => {
        await limpar();
        const n = [{ simbolo: 'HM-ELE-TOMADA-BAIXA', altura_m: 0.3, texto: 't' }];
        await notas.registrar(n, ESC, 'igual.dxf'); await notas.registrar(n, ESC, 'igual.dxf');
        assert.strictEqual((await dele()).length, 0, 'duas análises do mesmo arquivo ainda são um desenho só');
        await notas.registrar(n, ESC, 'outro.dxf');
        assert.strictEqual((await dele()).length, 1);
        assert.strictEqual(await notas.registrar(n, '', 'z.dxf'), 0);
      });

      await caso('o aprendido do escritório pré-preenche a altura do próximo desenho dele, e só dele', async () => {
        await limpar();
        const n = [{ simbolo: 'HM-ELE-TOMADA-BAIXA', altura_m: 0.3, texto: 'Tomadas baixas a 0,30 m do piso' }];
        await notas.registrar(n, ESC, 'p1.dxf'); await notas.registrar(n, ESC, 'p2.dxf');
        const aprendidas = await notas.carregar();
        const mesmo = linhaTomada(await lerArquivoCad(desenho(), 'novo.dxf', { notasAprendidas: aprendidas }));
        assert.deepStrictEqual([mesmo.altura_m, mesmo.alturaDe], [0.3, 'nota_aprendida']);
        const outro = linhaTomada(await lerArquivoCad(desenho({ responsavel: 'ZZ Outro Projetista' }), 'novo2.dxf', { notasAprendidas: aprendidas }));
        assert.strictEqual(outro.altura_m, undefined, 'outro escritório não herda');
        // a nota do próprio desenho vale mais que o aprendido
        const comNota = linhaTomada(await lerArquivoCad(desenho({ notas: ['Tomadas baixas a 0,45 m do piso'] }), 'novo3.dxf', { notasAprendidas: aprendidas }));
        assert.deepStrictEqual([comNota.altura_m, comNota.alturaDe], [0.45, 'nota']);
      });

      await caso('a altura que o engenheiro confirma no mapa vale para o tipo no escritório; desfazer esquece', async () => {
        await limpar();
        const m = { arquivo: 'x.dxf', simbolos: [{ idx: 0, layer: 'EL-TOMADAS', medida: [0.3, 0.26], quantidade: 3, simbolo: 'HM-ELE-TOMADA-BAIXA', origem: 'regra' }] };
        const { mapa, alteradas } = mapaCad.aplicarNoMapa(m, [{ idx: 0, simbolo: 'HM-ELE-TOMADA-MEDIA', altura_m: 1.1, confirmado: true }]);
        assert.strictEqual(await notas.aprenderConfirmadas(alteradas, ESC, 'x.dxf'), 1);
        const r = await dele();
        assert.deepStrictEqual([r.length, r[0].simbolo, r[0].altura_m, r[0].usuario], [1, 'HM-ELE-TOMADA-MEDIA', 1.1, true], 'o engenheiro vale sem esperar o segundo desenho');
        const { alteradas: desf } = mapaCad.aplicarNoMapa(mapa, [{ idx: 0, confirmado: false }]);
        assert.strictEqual(await notas.esquecer(desf, ESC, undefined, { arquivo: 'x.dxf' }), 1);
        assert.strictEqual((await dele()).length, 0);
        // confirmação sem altura não ensina nada
        const { alteradas: semAltura } = mapaCad.aplicarNoMapa(m, [{ idx: 0, simbolo: 'HM-ELE-TOMADA-MEDIA', confirmado: true }]);
        assert.strictEqual(await notas.aprenderConfirmadas(semAltura, ESC, 'x.dxf'), 0);
      });
      await caso('sem escritório no carimbo, a altura que o engenheiro confirmou vale pela DISCIPLINA (e desfazer só tira o voto do projeto)', async () => {
        await limpar();
        const m = { arquivo: 'zz-disc.dxf', simbolos: [{ idx: 0, layer: 'EL-TOMADAS', medida: [0.3, 0.26], quantidade: 3, simbolo: 'HM-ELE-TOMADA-BAIXA', origem: 'regra' }] };
        const { mapa, alteradas } = mapaCad.aplicarNoMapa(m, [{ idx: 0, simbolo: 'HM-ELE-TOMADA-BAIXA', altura_m: 0.35, confirmado: true }]);
        await notas.aprenderConfirmadas(alteradas, '', 'zz-disc.dxf', undefined, { fonte: 'analise:zz-disc-1' });
        await notas.aprenderConfirmadas(alteradas, '', 'zz-disc.dxf', undefined, { fonte: 'analise:zz-disc-2' });
        const daDisciplina = (await notas.carregar()).filter(n => n.escritorio === '' && n.simbolo === 'HM-ELE-TOMADA-BAIXA');
        assert.deepStrictEqual(daDisciplina.map(n => [n.altura_m, n.disciplina, n.usuario]), [[0.35, 'eletrica', true]]);
        const aprendidas = await notas.carregar();
        // o desenho sem carimbo (antes a linha morta: o motor não usava altura sem escritório) e o de elétrica
        const sem = linhaTomada(await lerArquivoCad(desenho({ responsavel: '' }), 'zz-sem.dxf', { notasAprendidas: aprendidas, disciplinas: ['eletrica'] }));
        assert.deepStrictEqual([sem.altura_m, sem.alturaDe], [0.35, 'nota_disciplina']);
        // outra disciplina marcada: não vale
        const cftv = linhaTomada(await lerArquivoCad(desenho({ responsavel: '' }), 'zz-sem2.dxf', { notasAprendidas: aprendidas, disciplinas: ['cftv'] }));
        assert.strictEqual(cftv.altura_m, undefined);
        // o escritório dele vale mais (a nota aprendida do próprio escritório), mas sem ela vale a da disciplina
        const comEsc = linhaTomada(await lerArquivoCad(desenho(), 'zz-com.dxf', { notasAprendidas: aprendidas, disciplinas: ['eletrica'] }));
        assert.deepStrictEqual([comEsc.altura_m, comEsc.alturaDe], [0.35, 'nota_disciplina']);
        // desfazer no projeto 1: o projeto 2 continua ensinando
        const { alteradas: desf } = mapaCad.aplicarNoMapa(mapa, [{ idx: 0, confirmado: false }]);
        assert.strictEqual(await notas.esquecer(desf, '', undefined, { fonte: 'analise:zz-disc-1' }), 1);
        const { rows } = await pool.query("SELECT vezes, origem FROM cad_notas_aprendidas WHERE escritorio = '' AND simbolo = 'HM-ELE-TOMADA-BAIXA'");
        assert.deepStrictEqual(rows, [{ vezes: 1, origem: 'usuario' }]);
      });
    } finally { await limpar(); await pool.end(); }
  }
  console.log('notasAprendidas: ok (' + ok + ' verificações)');
})().catch(e => { console.error(e); process.exit(1); });
