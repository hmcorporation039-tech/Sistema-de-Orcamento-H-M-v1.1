// Sugestões do item 9 (02/11/2026): atestado juntando várias notas do mesmo cliente, rascunho de nota a partir da
// proposta, recebimento (Pix) ligado à nota e envio do atestado. A parte do banco só roda em hm_orcamentos_v2.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const { montarAtestado } = require('../src/services/atestadoCapacidade');

const tomador = { nome: 'ZZ Cliente Extras', documento: '12345678000190', municipio: 'Brasília', uf: 'DF' };
const nota = (n, extra = {}) => ({
  id: n, situacao: 'emitida', numero: n, data_emissao: `2026-10-${10 + (n % 10)}T12:00:00Z`, competencia: '2026-10-01', valor_servicos: '1000',
  discriminacao: 'INSTALACAO DE 10 PONTOS DE REDE', tomador, ...extra,
});

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };

(async () => {
  await caso('um atestado para várias notas: todas na comprovação, valor somado, atividades reunidas', () => {
    const a = nota(101, { discriminacao: 'INSTALACAO DE 10 PONTOS DE REDE' });
    const b = nota(102, { discriminacao: 'FORNECIMENTO E INSTALACAO DE 2 CAMERAS', valor_servicos: '500.5' });
    const r = montarAtestado(a, { mostrar_valor: true }, { outrasNotas: [b] });
    assert.match(r.texto, /Notas fiscais: NFS-e nº 101 \(emitida em 11\/10\/2026\); NFS-e nº 102 \(emitida em 12\/10\/2026\)/);
    assert.match(r.texto, /NFS-e 101 \| 11\/10\/2026/);
    assert.match(r.texto, /NFS-e 102 \| 12\/10\/2026/);
    assert.match(r.texto, /Valor total dos serviços: R\$\s*1\.500,50/);
    assert.match(r.texto, /pontos de rede/i);
    assert.match(r.texto, /câmeras/i);
    assert.ok(r.avisos.some(x => /Atestado único das NFS-e 101, 102/.test(x)));
  });

  await caso('uma nota só continua como era; nota de outro cliente ou não emitida é recusada', () => {
    assert.match(montarAtestado(nota(103), {}, { outrasNotas: [] }).texto, /- Nota fiscal: NFS-e nº 103, emitida em/);
    const outro = nota(104, { tomador: { ...tomador, documento: '99999999000191' } });
    assert.throws(() => montarAtestado(nota(103), {}, { outrasNotas: [outro] }), /outro tomador/);
    assert.throws(() => montarAtestado(nota(103), {}, { outrasNotas: [nota(105, { situacao: 'cancelada' })] }), /emitida/);
  });

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`notasExtras: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    const ctrl = require('../src/controllers/notasFiscaisController');
    const chamar = async (fn, req) => {
      const out = { status: 200, corpo: null };
      const res = { status(s) { out.status = s; return this; }, json(c) { out.corpo = c; return this; } };
      await fn({ params: {}, body: {}, usuario: { id: admin }, ...req }, res);
      return out;
    };
    let admin = null;
    const limpar = async () => {
      await pool.query("DELETE FROM financeiro_movimentos WHERE nome LIKE 'ZZ Extras%'").catch(() => {});
      await pool.query("DELETE FROM notas_fiscais WHERE discriminacao LIKE 'ZZ EXTRAS%' OR discriminacao LIKE 'Prestação de serviços conforme proposta comercial nº ZZEX%'").catch(() => {});
      await pool.query("DELETE FROM propostas WHERE numero LIKE 'ZZEX%'").catch(() => {});
      await pool.query("DELETE FROM clientes WHERE nome LIKE 'ZZ Extras%'").catch(() => {});
    };
    try {
      admin = (await pool.query("SELECT id FROM usuarios WHERE role = 'admin' ORDER BY id LIMIT 1")).rows[0]?.id;
      await limpar();
      const servico = (await pool.query('SELECT id FROM empresa_servicos_nfse ORDER BY id LIMIT 1')).rows[0]?.id;
      assert.ok(admin && servico, 'o banco do v2 precisa de um administrador e de um serviço fiscal cadastrado');
      const cliente = (await pool.query("INSERT INTO clientes (nome, documento, tipo) VALUES ('ZZ Extras Cliente', '12345678000190', 'Empresa') RETURNING id")).rows[0].id;
      const emitida = async (numero, valor, discr = 'ZZ EXTRAS nota') => (await pool.query(
        `INSERT INTO notas_fiscais (situacao, origem, numero, cliente_id, tomador, discriminacao, valor_servicos, valor_liquido, data_emissao, servico_id)
         VALUES ('emitida', 'importada', $1, $2, $3, $4, $5, $5, NOW(), $6) RETURNING id`,
        [numero, cliente, JSON.stringify({ nome: 'ZZ Extras Cliente', documento: '12345678000190' }), discr, valor, servico])).rows[0].id;
      const n1 = await emitida(990001, 1000);
      const n2 = await emitida(990002, 250);

      await caso('notas candidatas: outras emitidas do mesmo cliente, sem a própria', async () => {
        const r = await chamar(ctrl.notasCandidatas, { params: { id: n1 } });
        assert.deepStrictEqual(r.corpo.map(x => x.id), [n2]);
      });

      await caso('rascunho a partir da proposta: valor, cliente e serviço da última nota; pede confirmação se já tem nota', async () => {
        const prop = (await pool.query(
          "INSERT INTO propostas (numero, sequencial, data, cliente_id, cliente_nome, status, total, local_obra) VALUES ('ZZEX1', 990001, CURRENT_DATE, $1, 'ZZ Extras Cliente', 'Aprovada', 4321.5, 'Bloco B') RETURNING id", [cliente])).rows[0].id;
        const r = await chamar(ctrl.criarDeProposta, { body: { proposta_id: prop } });
        assert.strictEqual(r.status, 201, JSON.stringify(r.corpo));
        const n = (await pool.query('SELECT * FROM notas_fiscais WHERE id = $1', [r.corpo.id])).rows[0];
        assert.deepStrictEqual([n.situacao, Number(n.valor_servicos), n.cliente_id, n.servico_id, n.proposta_id], ['rascunho', 4321.5, cliente, servico, prop]);
        assert.match(n.discriminacao, /proposta comercial nº ZZEX1 — Bloco B\./);
        const de_novo = await chamar(ctrl.criarDeProposta, { body: { proposta_id: prop } });
        assert.strictEqual(de_novo.status, 409);
        assert.ok(de_novo.corpo.ja_tem_nota);
        assert.strictEqual((await chamar(ctrl.criarDeProposta, { body: { proposta_id: prop, confirmar: true } })).status, 201);
        await pool.query("UPDATE propostas SET status = 'Cancelada' WHERE id = $1", [prop]);
        assert.strictEqual((await chamar(ctrl.criarDeProposta, { body: { proposta_id: prop, confirmar: true } })).status, 400);
        assert.strictEqual((await chamar(ctrl.criarDeProposta, { body: { proposta_id: 0 } })).status, 400);
      });

      await caso('recebimento: só o Pix de mesmo valor é candidato; ligar, não ligar duas vezes em notas diferentes, desligar', async () => {
        const mov = async (valor, nome) => (await pool.query(
          "INSERT INTO financeiro_movimentos (tipo, nome, valor, data_hora, origem) VALUES ('recebido', $1, $2, NOW(), 'manual') RETURNING id", [nome, valor])).rows[0].id;
        const certo = await mov(1000, 'ZZ Extras Pix certo');
        await mov(777, 'ZZ Extras Pix outro valor');
        const c = await chamar(ctrl.recebimentosCandidatos, { params: { id: n1 } });
        assert.deepStrictEqual(c.corpo.candidatos.map(x => x.id), [certo]);
        assert.strictEqual((await chamar(ctrl.ligarRecebimento, { params: { id: n1 }, body: { movimento_id: certo } })).status, 200);
        const lista = await pool.query('SELECT recebido_valor FROM (SELECT (SELECT COALESCE(sum(f.valor), 0) FROM financeiro_movimentos f WHERE f.nota_id = n.id) AS recebido_valor FROM notas_fiscais n WHERE n.id = $1) x', [n1]);
        assert.strictEqual(Number(lista.rows[0].recebido_valor), 1000);
        assert.strictEqual((await chamar(ctrl.ligarRecebimento, { params: { id: n2 }, body: { movimento_id: certo } })).status, 409, 'o mesmo Pix não quita duas notas');
        assert.deepStrictEqual((await chamar(ctrl.recebimentosCandidatos, { params: { id: n1 } })).corpo.candidatos, []);
        await chamar(ctrl.ligarRecebimento, { params: { id: n1 }, body: { movimento_id: certo, ligar: false } });
        assert.deepStrictEqual((await chamar(ctrl.recebimentosCandidatos, { params: { id: n1 } })).corpo.candidatos.map(x => x.id), [certo]);
        assert.strictEqual((await chamar(ctrl.ligarRecebimento, { params: { id: n1 }, body: { movimento_id: 'x' } })).status, 400);
      });

      await caso('envio do atestado: valida os e-mails antes de montar qualquer coisa', async () => {
        assert.strictEqual((await chamar(ctrl.enviarAtestado, { params: { id: n1 }, body: { destinatario: 'isto-nao-e-email' } })).status, 400);
        assert.strictEqual((await chamar(ctrl.enviarAtestado, { params: { id: 0 }, body: { destinatario: 'a@b.com' } })).status, 404);
      });
    } finally { await limpar(); await pool.end(); }
  }
  console.log(`notasExtras: ok (${ok} verificações)`);
})().catch(e => { console.error(e); process.exit(1); });
