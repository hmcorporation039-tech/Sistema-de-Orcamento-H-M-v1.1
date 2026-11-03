// Notas a receber: estado da nota (recebida, parcial, aberta, sem histórico, baixada), semelhança de nome,
// sugestão de ligação com Pix (alta/média/ambígua) e resumo por faixa. A parte do banco só roda em hm_orcamentos_v2.
const assert = require('assert');
const s = require('../src/services/notasAReceber');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };
const nota = (extra) => ({ id: 1, valor_liquido: 1000, valor_servicos: 1020, data_emissao: '2026-10-01', tomador_nome: 'HOSPITAL SANTA LUCIA S/A', saldo: 1000, ...extra });
const pix = (extra) => ({ id: 10, nome: 'Hospital Santa Lucia S A', valor: 1000, data_hora: '2026-10-05T10:00:00', ...extra });

(async () => {
  await caso('nome do Pix confere com o tomador apesar de S/A, acento e abreviação', () => {
    assert.ok(s.nomesParecidos('Hospital Santa Lucia S A', 'HOSPITAL SANTA LUCIA S/A'));
    assert.ok(s.nomesParecidos('P  O Solar Energy Ltda', 'P. O SOLAR ENERGY LTDA'));
    assert.ok(s.nomesParecidos('Tourinho Leal Drummond Andrade Sociedade Advogados', 'Tourinho Leal Drummond de Andrade Sociedade de Advogados'));
    assert.ok(!s.nomesParecidos('Jessica Flavia Lima de Brito', 'HOSPITAL SANTA LUCIA S/A'));
    assert.ok(!s.nomesParecidos('', 'HOSPITAL SANTA LUCIA S/A'));
    assert.ok(!s.nomesParecidos('LTDA', 'LTDA'));
  });

  await caso('estado: aberta passa a atrasada depois do prazo, parcial mostra o saldo, recebida e baixada saem', () => {
    const n = { valor_liquido: 1000, data_emissao: '2026-10-01' };
    const aberta = s.estadoDaNota({ nota: n, recebido: 0, hoje: '2026-10-20' });
    assert.strictEqual(aberta.estado, 'aberta');
    assert.strictEqual(aberta.dias, 19);
    assert.strictEqual(aberta.atrasada, false);
    assert.strictEqual(s.estadoDaNota({ nota: n, recebido: 0, hoje: '2026-10-31' }).atrasada, false);   // 30 dias: ainda no prazo
    assert.strictEqual(s.estadoDaNota({ nota: n, recebido: 0, hoje: '2026-11-01' }).atrasada, true);    // 31 dias
    const parcial = s.estadoDaNota({ nota: n, recebido: 400, hoje: '2026-10-20' });
    assert.strictEqual(parcial.estado, 'parcial');
    assert.strictEqual(parcial.saldo, 600);
    assert.strictEqual(s.estadoDaNota({ nota: n, recebido: 1000, hoje: '2026-10-20' }).estado, 'recebida');
    assert.strictEqual(s.estadoDaNota({ nota: n, recebido: 999.995, hoje: '2026-10-20' }).estado, 'recebida');   // centavo de arredondamento
    const baixada = s.estadoDaNota({ nota: { ...n, baixa_manual_em: '2026-10-10' }, recebido: 0, hoje: '2026-12-01' });
    assert.strictEqual(baixada.estado, 'baixada');
    assert.strictEqual(baixada.saldo, 0);
  });

  await caso('nota emitida muito antes do primeiro Pix conhecido não vira atraso: fica sem histórico', () => {
    const n = { valor_liquido: 1000, data_emissao: '2025-09-07' };
    const a = s.estadoDaNota({ nota: n, recebido: 0, hoje: '2026-11-02', primeiroPix: '2026-01-05' });
    assert.strictEqual(a.estado, 'sem_historico');
    assert.strictEqual(a.atrasada, false);
    // emitida pouco antes do primeiro Pix: o pagamento pode estar nele, então segue em aberto
    assert.strictEqual(s.estadoDaNota({ nota: { ...n, data_emissao: '2025-12-20' }, recebido: 0, hoje: '2026-11-02', primeiroPix: '2026-01-05' }).estado, 'aberta');
    // com Pix ligado já não é sem histórico
    assert.strictEqual(s.estadoDaNota({ nota: n, recebido: 300, hoje: '2026-11-02', primeiroPix: '2026-01-05' }).estado, 'parcial');
  });

  await caso('faixas de espera', () => {
    assert.strictEqual(s.faixaDe(30), 'no_prazo');
    assert.strictEqual(s.faixaDe(31), 'ate60');
    assert.strictEqual(s.faixaDe(61), 'ate90');
    assert.strictEqual(s.faixaDe(91), 'mais90');
  });

  await caso('sugestão alta: um Pix, valor igual, nome confere, só serve a essa nota', () => {
    const r = s.sugerirLigacoes([nota({})], [pix({})]);
    assert.strictEqual(r.get(1).confianca, 'alta');
    assert.strictEqual(r.get(1).movimento.id, 10);
  });

  await caso('sugestão aceita o valor bruto (ISS não descontado) e o saldo de uma nota parcial', () => {
    assert.strictEqual(s.sugerirLigacoes([nota({})], [pix({ valor: 1020 })]).get(1).confianca, 'alta');
    assert.strictEqual(s.sugerirLigacoes([nota({ saldo: 600 })], [pix({ valor: 600 })]).get(1).confianca, 'alta');
  });

  await caso('Pix de outro valor, de antes da emissão ou de uma semana antes não é candidato', () => {
    assert.strictEqual(s.sugerirLigacoes([nota({})], [pix({ valor: 999 })]).size, 0);
    assert.strictEqual(s.sugerirLigacoes([nota({})], [pix({ data_hora: '2026-09-20T10:00:00' })]).size, 0);
    assert.strictEqual(s.sugerirLigacoes([nota({})], [pix({ data_hora: '2026-09-30T23:00:00' })]).get(1).confianca, 'alta');   // até 1 dia antes
  });

  await caso('mesmo valor mas nome diferente: média, o administrador confere', () => {
    const r = s.sugerirLigacoes([nota({})], [pix({ nome: 'Fulano de Tal' })]);
    assert.strictEqual(r.get(1).confianca, 'media');
  });

  await caso('dois Pix possíveis para a mesma nota: ambígua e sem movimento escolhido', () => {
    const r = s.sugerirLigacoes([nota({})], [pix({ id: 10 }), pix({ id: 11 })]);
    assert.strictEqual(r.get(1).confianca, 'ambigua');
    assert.strictEqual(r.get(1).movimento, null);
    assert.strictEqual(r.get(1).alternativas, 2);
  });

  await caso('um Pix que serve a duas notas não é ligado sozinho a nenhuma', () => {
    const r = s.sugerirLigacoes([nota({ id: 1 }), nota({ id: 2 })], [pix({})]);
    assert.strictEqual(r.get(1).confianca, 'ambigua');
    assert.strictEqual(r.get(2).confianca, 'ambigua');
  });

  await caso('com dois Pix, o de nome certo ganha e a sugestão é alta', () => {
    const r = s.sugerirLigacoes([nota({})], [pix({ id: 10, nome: 'Fulano de Tal' }), pix({ id: 11 })]);
    assert.strictEqual(r.get(1).confianca, 'alta');
    assert.strictEqual(r.get(1).movimento.id, 11);
    assert.strictEqual(r.get(1).alternativas, 1);
  });

  await caso('resumo: soma só abertas e parciais, separa atrasadas, faixas e sem histórico', () => {
    const itens = [
      { estado: 'aberta', saldo: 1000, dias: 10, atrasada: false, sugestao: { confianca: 'alta' } },
      { estado: 'aberta', saldo: 2000, dias: 45, atrasada: true, sugestao: null },
      { estado: 'parcial', saldo: 600, dias: 120, atrasada: true, sugestao: { confianca: 'media' } },
      { estado: 'sem_historico', saldo: 5000, dias: 400, atrasada: false, sugestao: null },
    ];
    const r = s.resumir(itens);
    assert.strictEqual(r.em_aberto, 3);
    assert.strictEqual(r.saldo_total, 3600);
    assert.strictEqual(r.atrasadas, 2);
    assert.strictEqual(r.saldo_atrasado, 2600);
    assert.strictEqual(r.sem_historico, 1);
    assert.strictEqual(r.valor_sem_historico, 5000);
    assert.strictEqual(r.sugestoes_altas, 1);
    assert.deepStrictEqual(r.faixas.no_prazo, { n: 1, saldo: 1000 });
    assert.deepStrictEqual(r.faixas.mais90, { n: 1, saldo: 600 });
  });

  await caso('obra do Pix pela nota: só preenche obra vazia; obra diferente fica e vira aviso', () => {
    assert.strictEqual(s.decidirObraDoPix(null, 5), 'preencher');
    assert.strictEqual(s.decidirObraDoPix(5, 5), 'ja_na_obra');
    assert.strictEqual(s.decidirObraDoPix('5', 5), 'ja_na_obra', 'id que vem do banco como texto');
    assert.strictEqual(s.decidirObraDoPix(7, 5), 'divergente');
    assert.strictEqual(s.decidirObraDoPix(null, null), 'sem_obra_na_nota', 'nota sem proposta (ou proposta sem obra): nada muda');
    assert.strictEqual(s.decidirObraDoPix(7, null), 'sem_obra_na_nota');
  });

  // ── Banco (só no de teste) ──────────────────────────────────────────────────
  if (process.env.DB_NAME !== 'hm_orcamentos_v2') {
    console.log(`ok notasAReceber: ${ok} verificações (parte do banco pulada: fora de hm_orcamentos_v2)`);
    process.exit(0);
  }
  const pool = require('../src/config/database');
  const migrar = require('../src/models/migracoes/2.0-36-baixa-manual-notas');
  const marca = 900000000 + (Date.now() % 90000000) * 10;   // número alto, fora da série real
  const ids = { notas: [], movs: [], propostas: [], obras: [] };
  let usuarioId;
  try {
    await migrar(pool);
    await migrar(pool);   // idempotente
    usuarioId = (await pool.query("SELECT id FROM usuarios WHERE role = 'admin' ORDER BY id LIMIT 1")).rows[0].id;
    const criarNota = async (numero, valor, nome, dia, propostaId = null) => (await pool.query(
      `INSERT INTO notas_fiscais (situacao, numero, data_emissao, valor_servicos, valor_liquido, tomador, proposta_id)
       VALUES ('emitida', $1, $2, $3, $3, $4::jsonb, $5) RETURNING id`, [marca + Number(numero), dia, valor, JSON.stringify({ nome }), propostaId])).rows[0].id;
    const criarPix = async (valor, nome, dia, obraId = null) => (await pool.query(
      `INSERT INTO financeiro_movimentos (tipo, nome, valor, data_hora, origem, obra_id) VALUES ('recebido', $1, $2, $3, 'manual', $4) RETURNING id`, [nome, valor, dia, obraId])).rows[0].id;
    const criarObra = async (sufixo) => {
      const id = (await pool.query("INSERT INTO obras (codigo, nome, cliente_nome, status) VALUES ($1, $1, 'ZZ Arec', 'execucao') RETURNING id", [`ZZ-AREC-${sufixo}${String(marca).slice(-7)}`])).rows[0].id;
      ids.obras.push(id);
      return id;
    };
    const obraDe = async (id) => (await pool.query('SELECT obra_id FROM financeiro_movimentos WHERE id = $1', [id])).rows[0].obra_id;
    // a nota conhece a obra pela proposta: nota → proposta → obra
    const obraA = await criarObra('A');
    const obraB = await criarObra('B');
    const pA = (await pool.query(
      "INSERT INTO propostas (numero, sequencial, data, cliente_nome, status, total, obra_id) VALUES ($1, $2, CURRENT_DATE, 'ZZ Arec', 'Aprovada', 1000, $3) RETURNING id",
      [`ZZA${String(marca).slice(-7)}`, marca, obraA])).rows[0].id;
    ids.propostas.push(pA);
    // valores com centavos improváveis, para não casar com Pix reais do banco de teste
    const hoje = new Date().toISOString().slice(0, 10);
    const n1 = await criarNota('1', 7777.77, 'EMPRESA TESTE AREC LTDA', hoje, pA);
    const n2 = await criarNota('2', 8888.88, 'OUTRA TESTE AREC LTDA', hoje);
    ids.notas.push(n1, n2);
    const m1 = await criarPix(7777.77, 'Empresa Teste Arec Ltda', hoje);
    ids.movs.push(m1);

    await caso('banco: a nota nova aparece em aberto com a sugestão alta', async () => {
      const l = await s.listar();
      const i1 = l.itens.find(i => i.id === n1);
      assert.strictEqual(i1.estado, 'aberta');
      assert.strictEqual(i1.sugestao.confianca, 'alta');
      assert.strictEqual(i1.sugestao.movimento.id, m1);
      assert.strictEqual(l.itens.find(i => i.id === n2).sugestao, null);
    });

    await caso('banco: ligar sugeridas liga o Pix e a nota sai da lista; repetir não liga de novo', async () => {
      // só as notas do teste: o banco v2 tem notas e Pix reais que não podem ser ligados por um teste
      const r = await s.ligarSugeridas(usuarioId, undefined, [n1, n2]);
      assert.strictEqual(r.ligadas, 1);
      assert.strictEqual(r.obras_preenchidas, 1);
      assert.strictEqual((await pool.query('SELECT nota_id FROM financeiro_movimentos WHERE id = $1', [m1])).rows[0].nota_id, n1);
      assert.ok(!(await s.listar()).itens.some(i => i.id === n1));
      assert.strictEqual((await s.ligarSugeridas(usuarioId, undefined, [n1, n2])).ligadas, 0);
    });

    await caso('banco: o Pix ligado em lote leva a obra da proposta da nota, e a auditoria registra', async () => {
      assert.strictEqual(await obraDe(m1), obraA);
      const { rows: [aud] } = await pool.query(
        "SELECT detalhes FROM auditoria WHERE entidade = 'notas_fiscais' AND entidade_id = $1 AND acao = 'ligar_recebimento' ORDER BY id DESC LIMIT 1", [n1]);
      assert.strictEqual(aud.detalhes.obra_preenchida, true);
      assert.strictEqual(aud.detalhes.obra_id, obraA);
    });

    await caso('banco: Pix que já está em outra obra não muda de obra; volta aviso', async () => {
      const n3 = await criarNota('3', 6666.61, 'EMPRESA TESTE AREC LTDA', hoje, pA);
      ids.notas.push(n3);
      const m3 = await criarPix(6666.61, 'Empresa Teste Arec Ltda', hoje, obraB);
      ids.movs.push(m3);
      const r = await s.ligar(n3, m3, usuarioId);
      assert.strictEqual(r.obra_preenchida, false);
      assert.strictEqual(r.obra_id, obraB);
      assert.match(r.aviso, /ZZ-AREC-B/);
      assert.strictEqual(await obraDe(m3), obraB, 'a obra posta antes continua');
      // nota sem proposta: nada muda, sem aviso
      const m3b = await criarPix(8888.88, 'Outra Teste Arec Ltda', hoje);
      ids.movs.push(m3b);
      assert.deepStrictEqual(await s.ligar(n2, m3b, usuarioId), { obra_id: null, obra_preenchida: false, aviso: null });
      assert.strictEqual(await obraDe(m3b), null);
      await pool.query('UPDATE financeiro_movimentos SET nota_id = NULL WHERE id = $1', [m3b]);   // n2 volta a ficar em aberto para o caso da baixa
    });

    await caso('banco: pela tela da nota também leva a obra; desligar a nota deixa a obra e avisa', async () => {
      const ctrl = require('../src/controllers/notasFiscaisController');
      const chamar = async (fn, req) => {
        const out = { status: 200, corpo: null };
        const res = { status(st) { out.status = st; return this; }, json(c) { out.corpo = c; return this; } };
        await fn({ params: {}, body: {}, usuario: { id: usuarioId }, ...req }, res);
        return out;
      };
      const n4 = await criarNota('4', 5555.53, 'EMPRESA TESTE AREC LTDA', hoje, pA);
      ids.notas.push(n4);
      const m4 = await criarPix(5555.53, 'Empresa Teste Arec Ltda', hoje);
      ids.movs.push(m4);
      const lig = await chamar(ctrl.ligarRecebimento, { params: { id: n4 }, body: { movimento_id: m4 } });
      assert.strictEqual(lig.status, 200);
      assert.strictEqual(lig.corpo.obra_preenchida, true);
      assert.strictEqual(await obraDe(m4), obraA);
      const des = await chamar(ctrl.ligarRecebimento, { params: { id: n4 }, body: { movimento_id: m4, ligar: false } });
      assert.strictEqual(des.status, 200);
      assert.match(des.corpo.aviso, /continua na obra ZZ-AREC-A/);
      assert.strictEqual(await obraDe(m4), obraA, 'desligar a nota não apaga a obra (pode ter sido posta à mão)');
      assert.strictEqual((await pool.query('SELECT nota_id FROM financeiro_movimentos WHERE id = $1', [m4])).rows[0].nota_id, null);
    });

    await caso('banco: Pix ligado a nota antes da mudança ganha a obra pelo botão do administrador', async () => {
      const n5 = await criarNota('5', 4444.47, 'EMPRESA TESTE AREC LTDA', hoje, pA);
      ids.notas.push(n5);
      const m5 = await criarPix(4444.47, 'Empresa Teste Arec Ltda', hoje);
      ids.movs.push(m5);
      // como ficava antes: só nota_id, sem obra
      await pool.query('UPDATE financeiro_movimentos SET nota_id = $1 WHERE id = $2', [n5, m5]);
      assert.ok((await s.contarObraPelaNota()).n >= 1);
      assert.ok((await s.listar()).obra_pela_nota.n >= 1);
      // só os Pix do teste (o banco v2 tem Pix reais); os que já têm obra ou não têm nota de obra ficam como estão
      assert.deepStrictEqual(await s.aplicarObraDasNotas(usuarioId, pool, ids.movs), { preenchidos: 1, obras: 1 });
      assert.strictEqual(await obraDe(m5), obraA);
      assert.deepStrictEqual(await s.aplicarObraDasNotas(usuarioId, pool, ids.movs), { preenchidos: 0, obras: 0 }, 'repetir não muda nada');
    });

    await caso('banco: ligar um Pix já ligado a outra nota é recusado (409)', async () => {
      await assert.rejects(() => s.ligar(n2, m1, usuarioId), (e) => e.status === 409);
      await assert.rejects(() => s.ligar(n2, 0, usuarioId), (e) => e.status === 400);
      await assert.rejects(() => s.ligar(99999999, m1, usuarioId), (e) => e.status === 404);
    });

    await caso('banco: baixa manual exige observação, tira a nota da lista e pode ser desfeita', async () => {
      await assert.rejects(() => s.darBaixa(n2, usuarioId, '  '), (e) => e.status === 400);
      await assert.rejects(() => s.darBaixa(n2, usuarioId, 'x'.repeat(301)), (e) => e.status === 400);
      await s.darBaixa(n2, usuarioId, 'TED em 10/2026');
      assert.ok(!(await s.listar()).itens.some(i => i.id === n2));
      await s.desfazerBaixa(n2, usuarioId);
      assert.ok((await s.listar()).itens.some(i => i.id === n2));
      await assert.rejects(() => s.desfazerBaixa(n2, usuarioId), (e) => e.status === 404);
    });
  } finally {
    if (ids.movs.length) {
      // a auditoria do botão "levar a obra das notas" que este teste gerou (detalhes.movimentos = ids dos Pix)
      await pool.query("DELETE FROM auditoria WHERE entidade = 'financeiro_movimento' AND acao = 'obra_pela_nota' AND EXISTS (SELECT 1 FROM jsonb_array_elements(detalhes->'movimentos') e WHERE e::text::int = ANY($1::int[]))",
        [ids.movs]).catch(() => {});
      await pool.query('DELETE FROM financeiro_movimentos WHERE id = ANY($1)', [ids.movs]);
    }
    if (ids.notas.length) await pool.query('DELETE FROM notas_fiscais WHERE id = ANY($1)', [ids.notas]);
    if (ids.propostas.length) await pool.query('DELETE FROM propostas WHERE id = ANY($1)', [ids.propostas]);
    if (ids.obras.length) await pool.query('DELETE FROM obras WHERE id = ANY($1)', [ids.obras]);
    await pool.query("DELETE FROM auditoria WHERE entidade = 'notas_fiscais' AND entidade_id = ANY($1)", [ids.notas]).catch(() => {});
  }
  console.log(`ok notasAReceber: ${ok} verificações`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
