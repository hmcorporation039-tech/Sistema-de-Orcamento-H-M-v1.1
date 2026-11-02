// Propostas enviadas e sem resposta: quando é a hora do contato, adiar, encerrar depois de 3 contatos, e só
// proposta Ativa e enviada entra. A parte do banco só roda em hm_orcamentos_v2.
const assert = require('assert');
const f = require('../src/services/followUpPropostas');

let ok = 0;
const caso = async (nome, fn) => { try { await fn(); ok++; } catch (e) { e.message = nome + ': ' + e.message; throw e; } };
const contato = (dia) => ({ tipo: 'contato', criado_em: dia, proximo_em: null });
const adiado = (dia, ate) => ({ tipo: 'adiado', criado_em: dia, proximo_em: ate });

(async () => {
  await caso('primeiro contato 5 dias depois do envio: aguardando, hoje, atrasado', () => {
    const base = { envios: ['2026-10-20'], data: '2026-10-20', validade: 30 };
    const a = f.avaliar({ ...base, hoje: '2026-10-23' });
    assert.strictEqual(a.nivel, 'aguardando');
    assert.strictEqual(a.proximo_contato, '2026-10-25');
    assert.strictEqual(a.dias_para_contato, 2);
    assert.strictEqual(a.dias_desde_envio, 3);
    assert.strictEqual(f.avaliar({ ...base, hoje: '2026-10-25' }).nivel, 'hoje');
    const atrasado = f.avaliar({ ...base, hoje: '2026-10-29' });
    assert.strictEqual(atrasado.nivel, 'atrasado');
    assert.strictEqual(atrasado.dias_de_atraso, 4);
  });

  await caso('sem nenhum envio não há o que acompanhar', () => {
    assert.strictEqual(f.avaliar({ envios: [], registros: [contato('2026-10-20')].slice(0, 0), hoje: '2026-11-02' }), null);
  });

  await caso('um contato feito recomeça a contagem, agora de 10 dias; vale o último envio se for mais novo', () => {
    const a = f.avaliar({ envios: ['2026-10-01'], registros: [contato('2026-10-10')], hoje: '2026-10-15' });
    assert.strictEqual(a.proximo_contato, '2026-10-20');
    assert.strictEqual(a.nivel, 'aguardando');
    assert.strictEqual(a.contatos, 1);
    const reenviada = f.avaliar({ envios: ['2026-10-01', '2026-10-12'], registros: [contato('2026-10-10')], hoje: '2026-10-15' });
    assert.strictEqual(reenviada.ultimo_envio, '2026-10-12');
    assert.strictEqual(reenviada.proximo_contato, '2026-10-22', 'a base é o mais recente entre envio e contato');
  });

  await caso('adiar vale até a data escolhida; um contato novo depois cancela o adiamento', () => {
    const envios = ['2026-10-01'];
    const a = f.avaliar({ envios, registros: [adiado('2026-10-08', '2026-10-30')], hoje: '2026-10-20' });
    assert.strictEqual(a.proximo_contato, '2026-10-30');
    assert.strictEqual(a.nivel, 'aguardando');
    assert.strictEqual(a.adiado_ate, '2026-10-30');
    const depois = f.avaliar({ envios, registros: [adiado('2026-10-08', '2026-10-30'), contato('2026-10-15')], hoje: '2026-10-20' });
    assert.strictEqual(depois.proximo_contato, '2026-10-25', 'o contato é mais novo que o adiamento');
    assert.strictEqual(depois.adiado_ate, null);
    const maisRecente = f.avaliar({ envios, registros: [adiado('2026-10-08', '2026-10-30'), adiado('2026-10-09', '2026-10-12')], hoje: '2026-10-20' });
    assert.strictEqual(maisRecente.proximo_contato, '2026-10-12', 'vale o adiamento mais recente');
  });

  await caso('depois de 3 contatos sem resposta, na hora do próximo, sugere encerrar', () => {
    const registros = [contato('2026-09-10'), contato('2026-09-20'), contato('2026-10-01')];
    const cedo = f.avaliar({ envios: ['2026-09-01'], registros, hoje: '2026-10-05' });
    assert.strictEqual(cedo.nivel, 'aguardando');
    const hora = f.avaliar({ envios: ['2026-09-01'], registros, hoje: '2026-10-11' });
    assert.strictEqual(hora.nivel, 'encerrar');
    assert.strictEqual(hora.contatos, 3);
  });

  await caso('validade vencida aparece como sinal, com data da proposta + dias', () => {
    const a = f.avaliar({ envios: ['2026-10-01'], data: '2026-10-01', validade: 10, hoje: '2026-10-20' });
    assert.ok(a.validade_vencida);
    assert.ok(!f.avaliar({ envios: ['2026-10-01'], data: '2026-10-01', validade: 30, hoje: '2026-10-20' }).validade_vencida);
    assert.ok(!f.avaliar({ envios: ['2026-10-01'], data: '2026-10-01', validade: 0, hoje: '2026-10-20' }).validade_vencida, 'validade 0 = sem prazo');
  });

  await caso('mediana de dias até a aprovação só aparece com amostra mínima', () => {
    assert.deepStrictEqual(f.medianaDias([3, 9]), { n: 2, mediana: null });
    assert.deepStrictEqual(f.medianaDias([9, 3, 5]), { n: 3, mediana: 5 });
    assert.deepStrictEqual(f.medianaDias([2, 4, 6, 10]), { n: 4, mediana: 5 });
    assert.deepStrictEqual(f.medianaDias([]), { n: 0, mediana: null });
  });

  await caso('validação do registro: tipo, tamanho da nota e data do adiamento', () => {
    const hoje = '2026-11-02';
    assert.strictEqual(f.validarRegistro({ tipo: 'contato' }, hoje), null);
    assert.strictEqual(f.validarRegistro({ tipo: 'contato', nota: 'ligou, pediu 1 semana' }, hoje), null);
    assert.match(f.validarRegistro({ tipo: 'x' }, hoje), /contato ou se quer adiar/);
    assert.match(f.validarRegistro({ tipo: 'contato', nota: 'x'.repeat(501) }, hoje), /500 caracteres/);
    assert.match(f.validarRegistro({ tipo: 'adiado' }, hoje), /até quando/);
    assert.match(f.validarRegistro({ tipo: 'adiado', proximo_em: '2026-11-02' }, hoje), /depois de hoje/);
    assert.match(f.validarRegistro({ tipo: 'adiado', proximo_em: '2027-06-01' }, hoje), /180 dias/);
    assert.strictEqual(f.validarRegistro({ tipo: 'adiado', proximo_em: '2026-11-10' }, hoje), null);
  });

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`followUpPropostas: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    const limpar = () => pool.query("DELETE FROM propostas WHERE numero LIKE 'ZZF%'").catch(() => {});
    try {
      await require('../src/models/migracoes/2.0-34-followup-propostas')(pool);
      await require('../src/models/migracoes/2.0-34-followup-propostas')(pool);   // idempotente
      await limpar();
      const nova = async (numero, seq, status, total) => (await pool.query(
        "INSERT INTO propostas (numero, sequencial, data, validade, cliente_nome, total, status) VALUES ($1, $2, '2026-10-01', 60, 'ZZ Cliente', $3, $4) RETURNING id",
        [numero, seq, total, status])).rows[0].id;
      const evento = (id, acao, detalhes, dia) => pool.query(
        'INSERT INTO proposta_eventos (proposta_id, acao, detalhes, criado_em) VALUES ($1, $2, $3, $4)', [id, acao, detalhes, `${dia} 10:00`]);
      const meus = async (hoje) => (await f.listar(pool, hoje)).itens.filter(i => i.numero.startsWith('ZZF'));

      await caso('banco: só proposta Ativa e enviada por e-mail entra, ordenada por urgência', async () => {
        const enviadaAntiga = await nova('ZZF001', 991001, 'Ativa', 5000);
        await evento(enviadaAntiga, 'email', 'Enviada por e-mail para a@b.c', '2026-10-10');
        const enviadaRecente = await nova('ZZF002', 991002, 'Ativa', 9000);
        await evento(enviadaRecente, 'email', 'Enviada por e-mail para a@b.c', '2026-11-01');
        const naoEnviada = await nova('ZZF003', 991003, 'Ativa', 1000);
        const aprovada = await nova('ZZF004', 991004, 'Aprovada', 1000);
        await evento(aprovada, 'email', 'Enviada', '2026-10-10');
        const lista = await meus('2026-11-02');
        assert.deepStrictEqual(lista.map(i => i.numero), ['ZZF001', 'ZZF002']);
        assert.strictEqual(lista[0].nivel, 'atrasado');
        assert.strictEqual(lista[0].dias_de_atraso, 18, '10/10 + 5 dias = 15/10; de 15/10 a 02/11 são 18 dias');
        assert.strictEqual(lista[1].nivel, 'aguardando');
        assert.ok(!lista.some(i => i.id === naoEnviada || i.id === aprovada));
        const r = (await f.listar(pool, '2026-11-02')).resumo;
        assert.ok(r.atrasados >= 1 && r.valor_atrasado >= 5000);
      });

      await caso('banco: registrar contato recomeça a contagem e grava no histórico; adiar muda a data', async () => {
        const { rows: [p] } = await pool.query("SELECT id FROM propostas WHERE numero = 'ZZF001'");
        await f.registrar(pool, p.id, null, { tipo: 'contato', nota: 'ligou, volta na semana que vem' }, '2026-11-02');
        let item = (await meus('2026-11-02')).find(i => i.numero === 'ZZF001');
        assert.strictEqual(item.contatos, 1);
        assert.strictEqual(item.ultima_nota, 'ligou, volta na semana que vem');
        const { rows: ev } = await pool.query("SELECT detalhes FROM proposta_eventos WHERE proposta_id = $1 AND acao = 'followup'", [p.id]);
        assert.match(ev[0].detalhes, /ligou, volta/);
        await f.registrar(pool, p.id, null, { tipo: 'adiado', proximo_em: '2026-12-01' }, '2026-11-02');
        item = (await meus('2026-11-02')).find(i => i.numero === 'ZZF001');
        assert.strictEqual(item.proximo_contato, '2026-12-01');
        assert.strictEqual(item.nivel, 'aguardando');
      });

      await caso('banco: recusa registrar em proposta não enviada, não Ativa ou inexistente', async () => {
        const { rows } = await pool.query("SELECT id, numero FROM propostas WHERE numero IN ('ZZF003', 'ZZF004')");
        const id = (n) => rows.find(r => r.numero === n).id;
        await assert.rejects(() => f.registrar(pool, id('ZZF003'), null, { tipo: 'contato' }), /ainda não tem envio registrado/);
        await assert.rejects(() => f.registrar(pool, id('ZZF004'), null, { tipo: 'contato' }), /Aprovada/);
        await assert.rejects(() => f.registrar(pool, 999999999, null, { tipo: 'contato' }), /não encontrada/);
        await assert.rejects(() => f.registrar(pool, id('ZZF003'), null, { tipo: 'adiado', proximo_em: '2020-01-01' }), /depois de hoje/);
      });

      await caso('banco: proposta Ativa sem envio fica numa lista à parte; registrar o envio à mão a coloca no acompanhamento', async () => {
        const { rows: [p] } = await pool.query("SELECT id FROM propostas WHERE numero = 'ZZF003'");
        let r = await f.listar(pool, '2026-11-02');
        assert.ok(r.sem_envio.some(x => x.id === p.id), 'ZZF003 não foi enviada');
        assert.ok(r.resumo.sem_envio >= 1);
        await assert.rejects(() => f.registrarEnvio(pool, p.id, null, { data: '03/11/2026' }, '2026-11-02'), /quando a proposta foi enviada/);
        await assert.rejects(() => f.registrarEnvio(pool, p.id, null, { data: '2026-11-05' }, '2026-11-02'), /futuro/);
        await assert.rejects(() => f.registrarEnvio(pool, p.id, null, { data: '2026-09-01' }, '2026-11-02'), /antes da data da proposta/);
        await assert.rejects(() => f.registrarEnvio(pool, 999999999, null, { data: '2026-11-01' }, '2026-11-02'), /não encontrada/);
        const { rows: [aprov] } = await pool.query("SELECT id FROM propostas WHERE numero = 'ZZF004'");
        await assert.rejects(() => f.registrarEnvio(pool, aprov.id, null, { data: '2026-11-01' }, '2026-11-02'), /Aprovada/);

        await f.registrarEnvio(pool, p.id, null, { data: '2026-10-20', nota: 'mandei pelo WhatsApp' }, '2026-11-02');
        r = await f.listar(pool, '2026-11-02');
        assert.ok(!r.sem_envio.some(x => x.id === p.id));
        const item = r.itens.find(i => i.id === p.id);
        assert.strictEqual(item.ultimo_envio, '2026-10-20');
        assert.strictEqual(item.nivel, 'atrasado');
        const { rows: ev } = await pool.query("SELECT detalhes FROM proposta_eventos WHERE proposta_id = $1 AND acao = 'envio_manual'", [p.id]);
        assert.ok(ev[0].detalhes.includes("20/10/2026") && ev[0].detalhes.includes("WhatsApp"), ev[0].detalhes);
        await f.registrar(pool, p.id, null, { tipo: 'contato' }, '2026-11-02');   // agora aceita contato
      });

      await caso('banco: mediana de resposta usa só proposta aprovada com envio e aprovação no histórico', async () => {
        const base = (await f.listar(pool, '2026-11-02')).resumo.resposta_aprovada.n;
        for (const [i, dias] of [2, 4, 9].entries()) {
          const id = await nova(`ZZF01${i}`, 991010 + i, 'Aprovada', 100);
          await evento(id, 'email', 'Enviada', '2026-09-01');
          await evento(id, 'status', 'Status alterado para Aprovada', `2026-09-${String(1 + dias).padStart(2, '0')}`);
        }
        const r = (await f.listar(pool, '2026-11-02')).resumo.resposta_aprovada;
        assert.strictEqual(r.n, base + 3);
        if (base === 0) assert.strictEqual(r.mediana, 4);
      });
    } finally {
      await limpar();
      await pool.end();
    }
  }

  console.log(`followUpPropostas: ok (${ok} verificações)`);
})().catch(e => { console.error(e); process.exit(1); });
