// Projeto pela especificação do cliente (services/projetoEspecificacao.js, services/aprendizadoEspecificacao.js,
// migração 2.0-56, rotas v2/especificacao.js). Dados SINTÉTICOS (nenhuma obra real).
// As partes puras rodam sempre; as do banco só no banco de teste, dentro de transação desfeita.
// Rodar: node testes/projetoEspecificacao.test.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const AP = require('../src/services/aprendizadoEspecificacao');
const svc = require('../src/services/projetoEspecificacao');
const { COMUM } = require('../src/config/caminhos');
const { padraoDaFrase } = require(path.join(COMUM, 'especificacao', 'leitor.js'));

const ESPEC = [
  'QF-TST — QUADRO DE FORÇA E COMANDO DE TESTE',
  'Especificação para cotação — Obra Fictícia · Rev. 00 · 01/11/2026',
  '',
  '1. DADOS DE ENTRADA',
  'Alimentação | 380/220 V · 3F + N + PE · 60 Hz, vinda do QGBT',
  'Resfriadores de líquido (1 un.) | Fabricante Genérico RX100 · 380 V 3N~ · MCA 40 A / MFA 50 A',
  'Bombas (2 un.) | Genérica BX-3 3 cv, 380 V, 1 operando + 1 reserva',
  'Inversores (2 un.) | Genérico GX-9 (380 V, 8 A), fornecidos pelo cliente para montagem dentro do quadro',
  '',
  '2. COMANDO',
  '- Uma seletora por bomba: MANUAL – 0 – AUTOMÁTICO.',
  '- AUTOMÁTICO: a bomba liga quando qualquer um dos resfriadores pedir bomba.',
  '- Seletora de bomba titular (B1 / B2): em automático liga somente a titular.',
  '- Botão de emergência: desliga as bombas.',
  '- Lógica por relés; CLP não é necessário.',
  '- Comando especial do zelador para o revezamento mensal.',
].join('\n');

(async () => {
  // ── puras ──────────────────────────────────────────────────────────────
  const itens = AP.itensDaAprovacao({
    correcoes: [{ frase: 'Comando especial do zelador para o revezamento mensal', alvo: 'requisito', id: 'comando.titular_reserva' }, { frase: 'x', alvo: 'invalido', id: 'y' }],
    respostas: { titular_x_automacao: { acao: 'sugestao', decisao: 'titular_automacao', valor: 'REMOTO' }, reserva_sem_troca: { acao: 'manter' } },
    precos: [{ chave: 'fonte 24vcc 5a', descricao: 'Fonte 24 Vcc 5 A', preco: 300, fonte: 'loja fictícia', faixa: [280, 320] }, { chave: 'zero', preco: 0 }],
    escolhas: { cargas: { motor: { fator_entrada_inversor: 1.5 } } },
  }, padraoDaFrase);
  assert.deepStrictEqual(itens.map(i => i.tipo).sort(), ['decisao', 'escolha', 'preco', 'resposta', 'vocabulario'], 'um item de cada tipo; inválidos e preço zero ficam fora');
  assert.strictEqual(itens.find(i => i.tipo === 'preco').perfil, AP.PERFIL_PRECO, 'preço vale para todos os perfis');
  const ap = AP.montarAprendido(itens.map(i => ({ tipo: i.tipo, chave: i.chave, valor: i.valor })));
  assert.strictEqual(ap.decisoes.titular_automacao, 'REMOTO');
  assert.strictEqual(ap.respostas.reserva_sem_troca, 'manter');
  assert.strictEqual(ap.precos[0].preco, 300);
  assert.strictEqual(ap.escolhas.cargas.motor.fator_entrada_inversor, 1.5);
  assert.ok(new RegExp(ap.vocabulario[0].padrao, 'iu').test('comando especial do zelador para o REVEZAMENTO mensal'), 'o padrão aprendido reconhece a mesma frase');

  // leitura sem banco (vocabulário vazio) e formato recusado
  await assert.rejects(() => svc.ler(Buffer.from('x'), 'a.exe'), /PDF, DOCX/);
  assert.ok(svc.perfis().some(p => p.chave === 'quadro_forca_comando') && svc.perfis().some(p => p.chave === 'painel_pressurizacao'), 'os dois perfis registrados');
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'src', 'models', 'migracoes', '2.0-56-projeto-pela-especificacao.js')));

  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`projetoEspecificacao: partes puras ok; parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'})`);
    return;
  }
  const pool = require('../src/config/database');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await require('../src/models/migracoes/2.0-56-projeto-pela-especificacao.js')(client); // idempotente
    const lida = await svc.ler(Buffer.from(ESPEC, 'utf8'), 'espec.txt', { db: client });
    assert.strictEqual(lida.perfil, 'quadro_forca_comando');
    const frase = lida.lidos.naoLidos.find(n => /zelador/.test(n.texto));
    assert.ok(frase, 'a frase desconhecida aparece como não lida');
    const g = await svc.gerar({ lidos: lida.lidos, cliente: 'Cliente Fictício', usuario: null }, { db: client });
    assert.ok(g.id > 0);
    assert.ok(g.resumo.funcional.length && g.resumo.funcional.every(f => f.ok), 'cenários do comando atendidos');
    assert.ok(g.resumo.pontos.some(p => p.id === 'reserva_sem_troca'), 'ponto: reserva sem troca automática');
    const { rows: [reg] } = await client.query('SELECT disciplina, tipo, gerar_orcamento, dados FROM laudos_projetos WHERE id = $1', [g.id]);
    assert.strictEqual(reg.disciplina, 'quadros');
    assert.strictEqual(reg.tipo, 'projeto');
    assert.strictEqual(reg.gerar_orcamento, false, 'projeto nasce sem orçamento');
    assert.ok(reg.dados.especificacao && reg.dados.circuitos.length, 'projeto da skill quadros com a especificação guardada');
    // a skill gera os documentos novos a partir do registro
    const motor = require(path.join(COMUM, '..', 'quadros', 'scripts', 'lib', 'index.js'));
    const res = motor.processar(reg.dados);
    assert.ok(motor.tiposDisponiveis(res).includes('pesquisa_precos') && motor.tiposDisponiveis(res).includes('folhas'));
    const md = await motor.gerarDocumento(res, 'entrega');
    assert.ok(md.buffer.toString('utf8').includes('Pontos a levantar'));
    // aprovar → o próximo projeto já sai com a decisão e lê a frase sem IA
    const r = await svc.aprovar(g.id, {
      correcoes: [{ frase: frase.texto, alvo: 'requisito', id: 'comando.troca_automatica', grupo: 'comando', rotulo: 'Troca automática por falha (rodízio)' }],
      respostas: { reserva_sem_troca: { acao: 'sugestao', decisao: 'troca_automatica', valor: 'SIM' } },
    }, { usuario: null, db: client });
    assert.strictEqual(r.aprendidos, 2);
    const lida2 = await svc.ler(Buffer.from(ESPEC, 'utf8'), 'espec.txt', { db: client });
    assert.ok(lida2.lidos.requisitos.some(q => q.id === 'comando.troca_automatica' && q.fonte === 'aprendido'), 'vocabulário aprendido lido sem IA');
    const g2 = await svc.gerar({ lidos: lida2.lidos, usuario: null }, { db: client });
    assert.ok(!g2.resumo.pontos.some(p => p.id === 'reserva_sem_troca'), 'a decisão aprovada resolve o ponto');
    assert.ok(g2.resumo.comando.blocos.some(b => b.variante === 'troca_automatica=SIM'), 'variante aprendida do bloco de comando');
    assert.ok(g2.resumo.funcional.every(f => f.ok), `cenários com a troca automática: ${g2.resumo.funcional.filter(f => !f.ok).map(f => f.nome).join('; ')}`);
    // simulação (o mesmo modelo do 3D)
    const sim = await svc.simular(g2.id, { S1: 'MAN' }, { db: client });
    assert.strictEqual(sim.saidas.KB1, true);
    assert.ok(sim.interacao.controles.some(c => c.id === 'S1' && c.tipo === 'seletora'));
    await client.query('ROLLBACK');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  await pool.end();
  console.log('projetoEspecificacao: ok');
})().catch((e) => { console.error(e); process.exit(1); });
