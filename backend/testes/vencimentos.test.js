// Vencimentos de laudos: datas, etapas de aviso, texto do e-mail e o fluxo com banco (só em hm_orcamentos_v2).
const assert = require('assert');
const v = require('../src/services/vencimentos');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };

(async () => {
  await caso('somarMeses não estoura o fim do mês e vira o ano', () => {
    assert.strictEqual(v.somarMeses('2026-01-31', 1), '2026-02-28');
    assert.strictEqual(v.somarMeses('2028-01-31', 1), '2028-02-29');
    assert.strictEqual(v.somarMeses('2026-11-02', 12), '2027-11-02');
    assert.strictEqual(v.somarMeses('2026-12-15', 3), '2027-03-15');
  });

  await caso('ehDataIso recusa data impossível e texto solto', () => {
    assert.ok(v.ehDataIso('2026-02-28'));
    assert.ok(!v.ehDataIso('2026-02-30'));
    assert.ok(!v.ehDataIso('02/11/2026'));
    assert.ok(!v.ehDataIso(null));
  });

  await caso('etapas: 61 dias nada, 60 e 30 avisam, vencido é a última', () => {
    const hoje = '2026-11-02';
    assert.strictEqual(v.situacao('2027-01-02', hoje).etapa, 0);   // 61 dias
    assert.strictEqual(v.situacao('2027-01-01', hoje).etapa, 1);   // 60
    assert.strictEqual(v.situacao('2026-12-03', hoje).etapa, 1);   // 31
    assert.strictEqual(v.situacao('2026-12-02', hoje).etapa, 2);   // 30
    assert.strictEqual(v.situacao('2026-11-02', hoje).rotulo, 'vence hoje');
    const venc = v.situacao('2026-11-01', hoje);
    assert.strictEqual(venc.etapa, 3);
    assert.strictEqual(venc.rotulo, 'venceu há 1 dia');
    assert.strictEqual(v.situacao('2026-10-20', hoje).rotulo, 'venceu há 13 dias');
  });

  await caso('validação do cadastro diz o que falta', () => {
    const base = { disciplina: 'spda', descricao: 'SPDA — Edifício Aurora', emitido_em: '2026-03-10', validade_meses: 12 };
    assert.strictEqual(v.validarEntrada(base), null);
    assert.match(v.validarEntrada({ ...base, disciplina: ' ' }), /disciplina/);
    assert.match(v.validarEntrada({ ...base, descricao: '' }), /Descreva/);
    assert.match(v.validarEntrada({ ...base, emitido_em: '10/03/2026' }), /data de emissão/);
    assert.match(v.validarEntrada({ ...base, validade_meses: 0 }), /1 a 120/);
    assert.match(v.validarEntrada({ ...base, validade_meses: 2.5 }), /1 a 120/);
  });

  await caso('e-mail lista cada laudo com o prazo e conta os vencidos', () => {
    const m = v.mensagem([
      { descricao: 'SPDA — Aurora', cliente_nome: 'Condomínio Aurora', vence_em: '2026-12-01' },
      { descricao: 'Incêndio — Sede', cliente_nome: null, vence_em: '2026-10-30' },
    ], '2026-11-02');
    assert.match(m.assunto, /2 \(1 vencido\)/);
    assert.match(m.texto, /SPDA — Aurora \(Condomínio Aurora\): vence em 29 dias — vence em 01\/12\/2026/);
    assert.match(m.texto, /Incêndio — Sede: venceu há 3 dias/);
  });

  await caso('avisar: manda uma vez por etapa e só marca se o e-mail saiu', async () => {
    const linhas = [
      { id: 1, descricao: 'A', cliente_nome: null, vence_em: '2026-12-01', etapa_avisada: 0 },
      { id: 2, descricao: 'B', cliente_nome: null, vence_em: '2026-12-01', etapa_avisada: 2 },   // já avisado a 30 dias
      { id: 3, descricao: 'C', cliente_nome: null, vence_em: '2027-09-01', etapa_avisada: 0 },   // longe
    ];
    const gravados = [];
    const db = { query: async (sql, p) => (/^SELECT/.test(sql.trim()) ? { rows: linhas } : (gravados.push(p), { rows: [] })) };
    let enviados = 0;
    const r = await v.avisarVencimentos({ db, enviar: async () => { enviados++; }, destino: 'x@y.com', hoje: '2026-11-02' });
    assert.strictEqual(r.avisados, 1);
    assert.strictEqual(enviados, 1);
    assert.deepStrictEqual(gravados, [[1, 2]]);

    gravados.length = 0;
    const falha = await v.avisarVencimentos({ db, enviar: async () => { throw new Error('sem rede'); }, destino: 'x@y.com', hoje: '2026-11-02' });
    assert.strictEqual(falha.avisados, 0);
    assert.match(falha.avisos[0], /sem rede/);
    assert.deepStrictEqual(gravados, [], 'e-mail que falhou não marca como avisado');

    const semDestino = await v.avisarVencimentos({ db, enviar: async () => { throw new Error('não era para enviar'); }, destino: '', hoje: '2026-11-02' });
    assert.match(semDestino.avisos[0], /ALERTA_EMAIL/);
  });

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`vencimentos: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    const limpar = async () => {
      await pool.query("DELETE FROM vencimentos_laudos WHERE descricao LIKE 'ZZ Venc%' OR laudo_id IN (SELECT id FROM laudos_projetos WHERE titulo LIKE 'ZZ Venc%')").catch(() => {});
      await pool.query("DELETE FROM laudos_projetos WHERE titulo LIKE 'ZZ Venc%'").catch(() => {});
    };
    try {
      await require('../src/models/migracoes/2.0-31-vencimentos-laudos')(pool);
      await require('../src/models/migracoes/2.0-31-vencimentos-laudos')(pool);  // idempotente
      await limpar();

      await caso('banco: cadastro, lista com situação, renovar e encerrar', async () => {
        const id = await v.criar(pool, { disciplina: 'SPDA', descricao: 'ZZ Venc antigo', cliente_nome: 'ZZ Cliente', emitido_em: '2025-12-20', validade_meses: 12 });
        let l = await v.listar(pool, '2026-11-02');
        const item = l.itens.find(i => i.id === id);
        assert.strictEqual(item.vence_em, '2026-12-20');
        assert.strictEqual(item.nivel, 'atencao');
        assert.strictEqual(item.disciplina, 'spda');
        await assert.rejects(() => v.criar(pool, { disciplina: 'spda', descricao: '', emitido_em: '2025-12-20' }), /Descreva/);
        await pool.query('UPDATE vencimentos_laudos SET etapa_avisada = 1 WHERE id = $1', [id]);
        await v.renovar(pool, id, { emitido_em: '2026-11-02' });
        l = await v.listar(pool, '2026-11-02');
        const novo = l.itens.find(i => i.id === id);
        assert.strictEqual(novo.vence_em, '2027-11-02');
        assert.strictEqual(novo.etapa_avisada, 0, 'renovar zera os avisos');
        await v.encerrar(pool, id);
        assert.ok(!(await v.listar(pool)).itens.some(i => i.id === id));
        await assert.rejects(() => v.encerrar(pool, id), /não encontrado/);
      });

      await caso('banco: laudo do sistema entra sozinho; exemplo não; laudo novo encerra o antigo da mesma obra', async () => {
        const obra = (await pool.query('SELECT id FROM obras ORDER BY id LIMIT 1')).rows[0]?.id || null;
        const novoLaudo = async (titulo, data, extra = {}) => (await pool.query(
          "INSERT INTO laudos_projetos (disciplina, titulo, cliente_nome, dados, tipo, obra_id) VALUES ('spda', $1, 'ZZ Cliente', $2, 'laudo', $3) RETURNING id",
          [titulo, JSON.stringify({ meta: { data, ...extra } }), obra])).rows[0].id;
        const a = await novoLaudo('ZZ Venc laudo 2025', '2025-10-01');
        await novoLaudo('ZZ Venc exemplo', '2026-10-01', { dados_ilustrativos: true });
        await novoLaudo('ZZ Venc sem data', 'ontem');
        assert.strictEqual(await v.sincronizarLaudos(pool), 1, 'só o laudo com data válida e sem marca de exemplo');
        assert.strictEqual(await v.sincronizarLaudos(pool), 0, 'rodar de novo não duplica');
        const itens = (await v.listar(pool, '2026-11-02')).itens.filter(i => i.laudo_id === a);
        assert.strictEqual(itens[0].vence_em, '2026-10-01');
        assert.strictEqual(itens[0].nivel, 'vencido');
        if (obra) {
          const b = await novoLaudo('ZZ Venc laudo 2026', '2026-10-20');
          await v.sincronizarLaudos(pool);
          const ativos = (await v.listar(pool)).itens.filter(i => [a, b].includes(i.laudo_id));
          assert.deepStrictEqual(ativos.map(i => i.laudo_id), [b], 'o laudo mais novo da mesma obra e disciplina substitui o antigo');
        }
      });
    } finally {
      await limpar();
      await pool.end();
    }
  }

  console.log(`vencimentos: ok (${ok} verificações)`);
})().catch(e => { console.error(e); process.exit(1); });
