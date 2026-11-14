// Projeto pela especificação nas demais disciplinas (14/11/2026): central de incêndio, subestação de MT,
// automação/BMS e QD predial (perfis de SKILL — skills/_comum/especificacao/solucaoSkill.js) e a sequência
// de chillers (perfil do quadro com blocos novos). Especificações SINTÉTICAS em skills/<disciplina>/testes/.
// As partes puras rodam sempre; as do banco só no banco de teste, dentro de transação desfeita.
// Rodar: node testes/projetoEspecificacaoDisciplinas.test.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const svc = require('../src/services/projetoEspecificacao');
const { RAIZ_SKILLS } = require('../src/config/caminhos');
const { motorDaDisciplina } = require('../src/utils/disciplinasLaudo');

const espec = (pasta) => fs.readFileSync(path.join(RAIZ_SKILLS, pasta, 'testes', 'especificacao-exemplo.txt'));
const CASOS = [
  { pasta: 'incendio', perfil: 'central_incendio', disciplina: 'incendio' },
  { pasta: 'media-tensao', perfil: 'subestacao_mt', disciplina: 'media_tensao' },
  { pasta: 'automacao', perfil: 'automacao_bms', disciplina: 'automacao' },
  { pasta: 'eletrica', perfil: 'quadro_distribuicao_predial', disciplina: 'quadros' },
  { pasta: 'climatizacao', perfil: 'cag_sequencia_chillers', disciplina: 'quadros' },
];

(async () => {
  // ── puras: perfis registrados e escolhidos pelo texto ────────────────────
  const chaves = svc.perfis().map(p => p.chave);
  for (const c of CASOS) assert.ok(chaves.includes(c.perfil), `perfil ${c.perfil} registrado`);
  for (const c of CASOS) {
    const lida = await svc.ler(espec(c.pasta), 'espec.txt');
    assert.strictEqual(lida.perfil, c.perfil, `${c.pasta}: o texto escolhe o perfil ${c.perfil}`);
  }

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`projetoEspecificacaoDisciplinas: partes puras ok; parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'})`);
    return;
  }
  const pool = require('../src/config/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const c of CASOS) {
      const lida = await svc.ler(espec(c.pasta), 'espec.txt', { db: client });
      const g = await svc.gerar({ lidos: lida.lidos, cliente: 'Cliente Fictício', obra: 'Obra Fictícia', usuario: null }, { db: client });
      const { rows: [reg] } = await client.query('SELECT disciplina, tipo, dados FROM laudos_projetos WHERE id = $1', [g.id]);
      assert.strictEqual(reg.disciplina, c.disciplina, `${c.pasta}: gravado como laudo de ${c.disciplina}`);
      assert.strictEqual(reg.tipo, 'projeto');
      assert.strictEqual(reg.dados.especificacao.perfil, c.perfil);
      assert.ok(g.resumo.materiais.length > 0, `${c.pasta}: materiais`);
      // nunca R$ 0,00: sem preço fica vazio ("a cotar"); só o fornecido pelo cliente não tem preço
      assert.ok(g.resumo.materiais.every(m => m.origem === 'Cliente' || m.preco == null || m.preco > 0), `${c.pasta}: nunca R$ 0,00`);
      // os documentos da skill do laudo abrem a partir do registro (o mesmo caminho de /laudos/:id/documento)
      const motor = motorDaDisciplina(c.disciplina);
      const res = motor.processar(reg.dados);
      const tipos = motor.tiposDisponiveis(res);
      if (g.resumo.tipo === 'skill') {
        assert.ok(tipos.includes('precos_especificacao') && tipos.includes('entrega_especificacao'), `${c.pasta}: pesquisa de preços e texto de entrega disponíveis`);
        assert.ok(g.resumo.documentos.some(d => d.tipo === 'precos_especificacao' && d.ext === 'xlsx'), `${c.pasta}: documentos na tela`);
        const pl = await motor.gerarDocumento(res, 'precos_especificacao');
        assert.ok(pl.buffer.length > 5000 && /\.xlsx$/.test(pl.nomeArquivo));
        const tx = await motor.gerarDocumento(res, 'entrega_especificacao');
        assert.ok(/^# /.test(tx.buffer.toString('utf8')) && /\.md$/.test(tx.nomeArquivo));
        await assert.rejects(() => svc.simular(g.id, {}, { db: client }), /comando por relés/, `${c.pasta}: sem escada, sem simulação`);
      } else {
        assert.ok(g.resumo.funcional.length && g.resumo.funcional.every(f => f.ok), `${c.pasta}: cenários do comando ${g.resumo.funcional.filter(f => !f.ok).map(f => f.nome).join('; ')}`);
        assert.ok(tipos.includes('folhas') && tipos.includes('pesquisa_precos'), `${c.pasta}: folhas do painel pelo perfil gravado`);
        assert.strictEqual(res.especificacao.perfil, c.perfil, `${c.pasta}: os documentos refazem a solução pelo perfil gravado`);
      }
      // ver (refaz do registro, sem IA)
      const v = await svc.ver(g.id, { db: client });
      assert.strictEqual(v.resumo.perfil, c.perfil);

      if (c.pasta === 'incendio') {
        assert.ok(g.resumo.causaEfeito.some(x => x.id === 'pressurizacao'), 'matriz: partida da pressurização');
        assert.ok(g.resumo.pontos.some(p => p.id === 'alarme_15min'), 'ponto: 15 min de alarme');
        const a = await svc.atualizar(g.id, { decisoes: { alarme_15min: 'SIM' } }, { db: client });
        assert.ok(!a.resumo.pontos.some(p => p.id === 'alarme_15min'), 'a sugestão adotada some dos pontos');
        const { rows: [r2] } = await client.query('SELECT dados FROM laudos_projetos WHERE id = $1', [g.id]);
        assert.strictEqual(r2.dados.sistema.tempo_alarme_min, 15, 'o formulário da skill recebe a decisão');
        assert.strictEqual(r2.dados.cliente.nome, 'Cliente Fictício', 'cliente preservado ao atualizar');
      }
      if (c.pasta === 'climatizacao') {
        // a seletora de liberação tem o apelido SLIB nos cenários; na simulação direta vale o id real (S3…)
        const slib = g.resumo.interacao.controles.find(x => x.tipo === 'seletora' && /LIBERA/i.test(x.rotulo)).id;
        const sim = await svc.simular(g.id, { S1: 'AUT', SLID: 'ROD', [slib]: 'LIB' }, { db: client });
        assert.strictEqual(sim.saidas.KC1, true, 'chiller 1 líder comandado');
        assert.strictEqual(sim.saidas['CH1.HABILITA'] ?? sim.saidas[Object.keys(sim.saidas).find(k => /\.HABILITA$/.test(k))], true, 'habilitado com o fluxo provado');
      }
    }
    await client.query('ROLLBACK');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  await pool.end();
  console.log(`projetoEspecificacaoDisciplinas: ${CASOS.length} disciplinas ok`);
})().catch((e) => { console.error(e); process.exit(1); });
