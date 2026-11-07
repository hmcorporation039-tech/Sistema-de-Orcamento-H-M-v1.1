// Correções da revisão geral de 11/2026: hora do lançamento manual do financeiro,
// excluir/editar proposta aprovada pelo link (com trava), proposta com nota
// emitida, cronograma gerado em dobro, centavos com o meio para longe do zero,
// nota com líquido negativo e rascunho casado errado na importação, nota
// substituída, migração 2.0-50, monitor das pastas, reserva local da pasta dos
// clientes e laudo gravando na pasta para quem não é o dono.
// A parte do banco só roda em hm_orcamentos_v2. Dados SINTÉTICOS (prefixo ZZ Corr).
// Rodar: node testes/correcoesGerais.test.js (pasta backend).
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// pastas do sistema num diretório temporário (antes de carregar qualquer serviço)
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'hm-correcoes-'));
process.env.PASTA_ARQUIVOS_SISTEMA = TMP;
process.env.PASTA_CLIENTES = path.join(TMP, 'Servidor', 'Clientes');
require('../src/config/env');

let ok = 0;
const caso = async (nome, fn) => {
  try { await fn(); ok++; console.log(`  ok  ${nome}`); } catch (e) { console.error(`FALHOU: ${nome}`); throw e; }
};
const silencio = async (fn) => {
  const { warn, log } = console;
  console.warn = () => {}; console.log = () => {};
  try { return await fn(); } finally { Object.assign(console, { warn, log }); }
};
const resFalso = () => {
  const r = { statusCode: 200, body: null, cabecalhos: {} };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.send = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.cabecalhos[k] = v; };
  r.set = (o) => { Object.assign(r.cabecalhos, o); return r; };
  return r;
};

(async () => {
  const fin = require('../src/controllers/financeiroController');
  const { ErroHttp } = require('../src/utils/erros');

  // ── 1. financeiro: hora local de Brasília, sem o "Z" ───────────────────
  await caso('financeiro: datetime-local grava como está; com fuso converte para Brasília; inválida é recusada', () => {
    assert.strictEqual(fin.dataHoraBrasilia('2026-11-06T10:30'), '2026-11-06 10:30:00');
    assert.strictEqual(fin.dataHoraBrasilia('2026-11-06T10:30:15'), '2026-11-06 10:30:15');
    // o que a tela mandava antes (toISOString): 10:30 em Brasília = 13:30Z → volta a ser 10:30
    assert.strictEqual(fin.dataHoraBrasilia('2026-11-06T13:30:00.000Z'), '2026-11-06 10:30:00');
    assert.strictEqual(fin.dataHoraBrasilia('2026-11-07T01:15:00Z'), '2026-11-06 22:15:00', 'perto da meia-noite UTC ainda é o dia anterior');
    assert.strictEqual(fin.dataHoraBrasilia(new Date('2026-11-06T13:30:00Z')), '2026-11-06 10:30:00', 'Date (como o Pix do e-mail)');
    for (const v of ['2026-02-31T10:00', '2026-11-06T24:00', 'x', '', null, undefined, '2026-11-06']) assert.strictEqual(fin.dataHoraBrasilia(v), null, String(v));
  });

  // ── 11. financeiro: período inválido é 400, não 500 ────────────────────
  await caso('financeiro: dataInicio/dataFim inválidas viram 400 com mensagem clara', async () => {
    for (const q of [{ dataInicio: '2026-13-01' }, { dataFim: 'ontem' }, { dataInicio: '2026-02-31' }, { dataInicio: '2026-11-10', dataFim: '2026-11-01' }]) {
      await assert.rejects(() => fin.listar({ query: q }, resFalso()), (e) => e instanceof ErroHttp && e.status === 400 && /data/i.test(e.message), JSON.stringify(q));
    }
  });

  // ── 4. centavos: meio para longe do zero, robusto ao binário ───────────
  await caso('centavos: ISS de 5 % sobre 100,30 = 5,02; -1,005 → -1,01; sem "-0"', () => {
    const { arredondar } = require('../src/utils/calculoProposta');
    assert.strictEqual(arredondar(100.3 * 5 / 100), 5.02);
    assert.strictEqual(arredondar(5.015), 5.02);
    assert.strictEqual(arredondar(-1.005), -1.01);
    assert.strictEqual(arredondar(-0.125), -0.13);
    assert.strictEqual(arredondar(2.675), 2.68);
    assert.strictEqual(arredondar(1.15 * 3), 3.45);
    assert.strictEqual(arredondar(0.1 + 0.2), 0.3);
    assert.ok(Object.is(arredondar(-0.001), 0));
    assert.strictEqual(arredondar('abc'), 0);
    // a nota fiscal usa a mesma regra
    const { calcularTotais } = require('../src/controllers/notasFiscaisController');
    const zero = { valor_deducoes: 0, desconto_incondicionado: 0, desconto_condicionado: 0, valor_pis: 0, valor_cofins: 0, valor_inss: 0, valor_ir: 0, valor_csll: 0, outras_retencoes: 0 };
    const d = calcularTotais({ ...zero, valor_servicos: 100.3, aliquota_iss: 5, iss_retido: true });
    assert.strictEqual(d.valor_iss, 5.02, 'antes 5,01');
    assert.strictEqual(d.valor_liquido, 95.28);
    // composições, curva ABC e BDI também
    assert.strictEqual(require('../src/utils/composicoes').arred2(5.015), 5.02);
    const { calcularCurvaAbc } = require('../src/utils/curvaAbc');
    const abc = calcularCurvaAbc([{ descricao: 'X', quantidade: 3, valor_unitario: 1.6716666, tipo: 'material' }]);
    assert.strictEqual(abc.itens[0].total, 5.01); // 3 × 1,67 (unitário arredondado antes), como a proposta
    assert.strictEqual(calcularCurvaAbc([{ descricao: 'Y', quantidade: 1, valor_unitario: 5.015, tipo: 'material' }]).total, 5.02);
  });

  // ── 11. BDI: ano da CPRB vazio fica vazio (não vira ano 0) ─────────────
  await caso('BDI: memória com ano_cprb null/vazio guarda null', () => {
    const { normalizarMemoriaBdi } = require('../src/utils/bdiTcu');
    const base = { tipo_obra: 'edificios', regime: 'desonerado', parcelas: { ac: 4, sg: 0.8, r: 1.27, df: 1.23, l: 7.4, pis: 0.65, cofins: 3, iss: 2, cprb: 4.5 } };
    assert.strictEqual(normalizarMemoriaBdi({ ...base, ano_cprb: null }).ano_cprb, null);
    assert.strictEqual(normalizarMemoriaBdi({ ...base, ano_cprb: '' }).ano_cprb, null);
    assert.strictEqual(normalizarMemoriaBdi(base).ano_cprb, null);
    assert.strictEqual(normalizarMemoriaBdi({ ...base, ano_cprb: 2026 }).ano_cprb, 2026);
    // o núcleo compartilhado do frontend tem a mesma linha
    const front = fs.readFileSync(path.join(__dirname, '..', '..', 'frontend', 'src', 'utils', 'bdiTcu.js'), 'utf8');
    assert.ok(front.includes("m.ano_cprb != null && m.ano_cprb !== ''"));
  });

  // ── 9. laudos: só o dono/admin grava na pasta; abrir a pasta pede posse ─
  await caso('laudos: GET de documento/planta/unifilar só grava na pasta para o dono; POST pasta/abrir com posseLaudo', () => {
    const { podeGravarNaPasta } = require('../src/controllers/laudos/desenhos');
    assert.strictEqual(podeGravarNaPasta({ usuario: { id: 2, role: 'usuario' } }, { usuario_id: 2 }), true);
    assert.strictEqual(podeGravarNaPasta({ usuario: { id: 3, role: 'usuario' } }, { usuario_id: 2 }), false);
    assert.strictEqual(podeGravarNaPasta({ usuario: { id: 3, role: 'admin' } }, { usuario_id: 2 }), true);
    assert.strictEqual(podeGravarNaPasta({ usuario: { id: 3, role: 'usuario' } }, { usuario_id: null }), true, 'registro antigo sem dono');
    const rotas = fs.readFileSync(path.join(__dirname, '..', 'src', 'routes', 'index.js'), 'utf8');
    assert.match(rotas, /router\.post\('\/laudos\/:id\/pasta\/abrir', autenticar, validarId, posseLaudo,/);
    const entregas = fs.readFileSync(path.join(__dirname, '..', 'src', 'controllers', 'laudos', 'entregas.js'), 'utf8');
    assert.match(entregas, /gerarDocumentosDoLaudo\(laudo, \[tipo\], \{ gravar: podeGravarNaPasta\(req, laudo\) \}\)/);
  });

  // ── 7. monitor das pastas: uma rodada por vez ──────────────────────────
  await caso('monitor das pastas: rodada nova não começa por cima da anterior', async () => {
    const P = require('../src/services/pastasSistema');
    const monitor = require('../src/services/monitorPastas');
    const original = P.enviarPendentesAoServidor;
    let chamadas = 0;
    P.enviarPendentesAoServidor = async () => { chamadas++; await new Promise(r => setTimeout(r, 150)); throw new Error('servidor de mentira'); };
    try {
      const [a, b] = await silencio(() => Promise.all([monitor.rodadaDoMonitor(), monitor.rodadaDoMonitor()]));
      assert.deepStrictEqual([a, b], [true, false], 'a segunda chamada volta sem rodar');
      assert.strictEqual(chamadas, 1);
      assert.strictEqual(await silencio(() => monitor.rodadaDoMonitor()), true, 'terminada a anterior, roda de novo');
    } finally { P.enviarPendentesAoServidor = original; }
  });

  // ── 7. reserva local: só sai o que foi copiado ─────────────────────────
  await caso('reserva da pasta dos clientes: arquivo que chega durante o envio não é apagado', async () => {
    const P = require('../src/services/pastasSistema');
    const pend = P.RAIZ_CLIENTES_PENDENTE;
    assert.ok(pend.startsWith(TMP), 'a reserva do teste fica no diretório temporário');
    fs.mkdirSync(path.join(pend, 'Cliente A', 'Obras'), { recursive: true });
    fs.mkdirSync(path.join(pend, 'Cliente B'), { recursive: true });
    fs.writeFileSync(path.join(pend, 'Cliente A', 'Obras', 'um.txt'), '1');
    fs.writeFileSync(path.join(pend, 'Cliente B', 'dois.txt'), '2');
    let chegou = false;
    P.registrarAoGravar(() => {
      if (chegou) return;
      chegou = true; // o servidor caiu e voltou no meio: uma gravação nova foi para a reserva
      fs.mkdirSync(path.join(pend, 'Cliente C'), { recursive: true });
      fs.writeFileSync(path.join(pend, 'Cliente C', 'novo.txt'), 'novo');
    });
    const n = await silencio(() => P.enviarPendentesAoServidor());
    assert.strictEqual(n, 2);
    assert.ok(fs.existsSync(path.join(process.env.PASTA_CLIENTES, 'Cliente A', 'Obras', 'um.txt')));
    assert.ok(fs.existsSync(path.join(pend, 'Cliente C', 'novo.txt')), 'antes a reserva inteira era apagada (rm recursivo)');
    assert.ok(!fs.existsSync(path.join(pend, 'Cliente A')), 'pasta que ficou vazia sai');
    assert.ok(!fs.existsSync(path.join(pend, 'Cliente B')));
  });

  // ── parte do banco ─────────────────────────────────────────────────────
  const BANCO_DE_TESTE = 'hm_orcamentos_v2';
  if (process.env.DB_NAME !== BANCO_DE_TESTE) {
    console.log(`correcoesGerais: parte do banco pulada (DB_NAME=${process.env.DB_NAME || '(vazio)'} — só roda em ${BANCO_DE_TESTE})`);
  } else {
    const pool = require('../src/config/database');
    const CPF_TESTE = '90909090909';
    const limpar = async () => {
      await pool.query("DELETE FROM financeiro_movimentos WHERE nome LIKE 'ZZ Corr%'");
      await pool.query("DELETE FROM notas_fiscais WHERE tomador->>'nome' LIKE 'ZZ Corr%' OR chave_acesso LIKE '5300108220400337600010000000000000009926110%'");
      await pool.query("DELETE FROM proposta_decisoes_aprovacao WHERE numero_proposta LIKE 'ZZCOR%'");
      await pool.query("DELETE FROM obra_etapas WHERE obra_id IN (SELECT id FROM obras WHERE codigo LIKE 'ZZ-CORR%')");
      await pool.query("DELETE FROM obra_cronogramas WHERE obra_id IN (SELECT id FROM obras WHERE codigo LIKE 'ZZ-CORR%')");
      await pool.query("DELETE FROM propostas WHERE numero LIKE 'ZZCOR%'");
      await pool.query("DELETE FROM obras WHERE codigo LIKE 'ZZ-CORR%'");
      await pool.query('DELETE FROM clientes WHERE documento = $1', [CPF_TESTE]);
    };
    const admin = { id: 1, role: 'admin' };
    const comum = { id: 1, role: 'usuario' };
    let seq = 0;
    const proposta = async (extra = {}) => {
      seq++;
      const { rows: [p] } = await pool.query(
        `INSERT INTO propostas (numero, sequencial, data, status, cliente_nome, total, obra_id, cliente_id)
         VALUES ($1, $2, CURRENT_DATE, $3, 'ZZ Corr Cliente', $4, $5, $6) RETURNING *`,
        [`ZZCOR${seq}`, 990000 + seq, extra.status || 'Ativa', extra.total ?? 1000, extra.obra_id ?? null, extra.cliente_id ?? null]);
      return p;
    };
    const aceitarPeloLink = (p) => pool.query(
      `INSERT INTO proposta_decisoes_aprovacao (proposta_id, numero_proposta, total, decisao, nome, tipo_documento, documento, aceite_termos, texto_declaracao, hash_conteudo, conteudo)
       VALUES ($1, $2, $3, 'aprovada', 'ZZ Corr', 'CPF', '12345678909', true, 'aceito', $4, '{}')`,
      [p.id, p.numero, p.total, 'a'.repeat(64)]);

    try {
      await limpar();

      // ── 5. migração 2.0-50 idempotente ──────────────────────────────────
      await caso('migração 2.0-50: rodar de novo não refaz a trava (e refaz quando falta o "ignorado")', async () => {
        const mig = require('../src/models/migracoes/2.0-50-treino-por-disciplina');
        const oid = async () => (await pool.query("SELECT oid FROM pg_constraint WHERE conname = 'acervo_treino_situacao_check'")).rows[0]?.oid;
        await mig(pool);
        const antes = await oid();
        await mig(pool);
        assert.strictEqual(await oid(), antes, 'a trava certa fica como está (antes: DROP + ADD a cada partida)');
        // banco que ainda tem a trava da 2.0-49 (só lido/erro) ganha a nova
        await pool.query('ALTER TABLE acervo_treino DROP CONSTRAINT acervo_treino_situacao_check');
        // NOT VALID: o banco de teste já tem linhas 'ignorado'
        await pool.query("ALTER TABLE acervo_treino ADD CONSTRAINT acervo_treino_situacao_check CHECK (situacao IN ('lido', 'erro')) NOT VALID");
        await mig(pool);
        const { rows: [c] } = await pool.query("SELECT pg_get_constraintdef(oid) AS d FROM pg_constraint WHERE conname = 'acervo_treino_situacao_check'");
        assert.match(c.d, /'ignorado'/);
      });

      // ── 1. financeiro no banco: sem as 3 h a mais ───────────────────────
      await caso('financeiro (banco): a hora gravada é a digitada, e editar sem mexer não soma 3 h', async () => {
        const hora = async (id) => (await pool.query("SELECT to_char(data_hora, 'YYYY-MM-DD HH24:MI') AS h FROM financeiro_movimentos WHERE id = $1", [id])).rows[0].h;
        const r = resFalso();
        await fin.criar({ body: { tipo: 'recebido', nome: 'ZZ Corr Pix', valor: 10, dataHora: '2026-11-06T10:30' }, usuario: admin }, r);
        assert.strictEqual(r.statusCode, 201);
        const id = r.body.id;
        assert.strictEqual(await hora(id), '2026-11-06 10:30');
        // a tela abre a edição com a hora de Brasília do que voltou e salva de novo, duas vezes
        for (let i = 0; i < 2; i++) {
          const volta = fin.dataHoraBrasilia(new Date(r.body.data_hora)).slice(0, 16).replace(' ', 'T');
          const r2 = resFalso();
          await fin.atualizar({ params: { id }, body: { tipo: 'recebido', nome: 'ZZ Corr Pix', valor: 10, dataHora: volta }, usuario: admin }, r2);
          assert.strictEqual(r2.statusCode, 200);
          assert.strictEqual(await hora(id), '2026-11-06 10:30', `edição ${i + 1}`);
        }
        // cliente antigo que ainda manda toISOString(): convertido para Brasília
        const r3 = resFalso();
        await fin.atualizar({ params: { id }, body: { tipo: 'recebido', nome: 'ZZ Corr Pix', valor: 10, dataHora: '2026-11-06T14:45:00.000Z' }, usuario: admin }, r3);
        assert.strictEqual(await hora(id), '2026-11-06 11:45');
        const r4 = resFalso();
        await fin.criar({ body: { tipo: 'recebido', nome: 'ZZ Corr Pix', valor: 10, dataHora: '2026-02-31T10:00' }, usuario: admin }, r4);
        assert.strictEqual(r4.statusCode, 400);
      });

      // ── 2 e 6. proposta aprovada pelo link: excluir/editar ─────────────
      const P = require('../src/controllers/propostasController');
      await caso('proposta aprovada pelo link: não-admin não exclui (409); admin exclui; sem aceite, exclui', async () => {
        const p = await proposta({ status: 'Aprovada' });
        await aceitarPeloLink(p);
        await assert.rejects(() => P.remover({ params: { id: String(p.id) }, usuario: comum }, resFalso()),
          (e) => e instanceof ErroHttp && e.status === 409 && e.extra.codigo === 'APROVADA_PELO_CLIENTE');
        assert.strictEqual((await pool.query('SELECT 1 FROM propostas WHERE id = $1', [p.id])).rows.length, 1, 'continua lá');
        const r = resFalso();
        await P.remover({ params: { id: String(p.id) }, usuario: admin }, r);
        assert.strictEqual(r.statusCode, 200);
        const livre = await proposta({ status: 'Aprovada' }); // aprovada na tela, sem aceite do link
        const r2 = resFalso();
        await P.remover({ params: { id: String(livre.id) }, usuario: comum }, r2);
        assert.strictEqual(r2.statusCode, 200);
        const r3 = resFalso();
        await P.remover({ params: { id: '999999999' }, usuario: comum }, r3);
        assert.strictEqual(r3.statusCode, 404);
      });

      await caso('proposta com nota fiscal emitida não é excluída (nem pelo admin); com rascunho, é', async () => {
        const p = await proposta();
        await pool.query(
          "INSERT INTO notas_fiscais (situacao, numero, tomador, valor_servicos, discriminacao, proposta_id) VALUES ('emitida', 990001, $1, 1000, 'x', $2)",
          [JSON.stringify({ nome: 'ZZ Corr Nota' }), p.id]);
        await assert.rejects(() => P.remover({ params: { id: String(p.id) }, usuario: admin }, resFalso()),
          (e) => e instanceof ErroHttp && e.status === 409 && e.extra.codigo === 'PROPOSTA_COM_NOTA_FISCAL' && /990001/.test(e.message));
        const q = await proposta();
        await pool.query(
          "INSERT INTO notas_fiscais (situacao, tomador, valor_servicos, discriminacao, proposta_id) VALUES ('rascunho', $1, 1000, 'x', $2)",
          [JSON.stringify({ nome: 'ZZ Corr Nota' }), q.id]);
        const r = resFalso();
        await P.remover({ params: { id: String(q.id) }, usuario: admin }, r);
        assert.strictEqual(r.statusCode, 200);
      });

      await caso('editar proposta aprovada pelo link: a conferência trava a linha dentro da transação', async () => {
        const p = await proposta({ status: 'Aprovada' });
        await aceitarPeloLink(p);
        const corpo = { data: '2026-11-06', cliente_nome: 'ZZ Corr Cliente', secoes: [], itens: [], bdi: 0 };
        await assert.rejects(() => P.atualizar({ params: { id: String(p.id) }, body: corpo, usuario: comum }, resFalso()),
          (e) => e instanceof ErroHttp && e.status === 409 && e.extra.codigo === 'APROVADA_PELO_CLIENTE');
        // a trava (FOR UPDATE) segura a edição enquanto outra transação mexe na linha
        const outro = await pool.connect();
        try {
          const livre = await proposta();
          await outro.query('BEGIN');
          await outro.query('SELECT 1 FROM propostas WHERE id = $1 FOR UPDATE', [livre.id]);
          let terminou = false;
          const edicao = P.atualizar({ params: { id: String(livre.id) }, body: corpo, usuario: comum }, resFalso()).then(() => { terminou = true; });
          await new Promise(r => setTimeout(r, 300));
          assert.strictEqual(terminou, false, 'a edição espera a trava');
          // o aceite chega (na transação que segurava a linha) e é gravado antes
          await outro.query("UPDATE propostas SET status = 'Aprovada' WHERE id = $1", [livre.id]);
          await outro.query(
            `INSERT INTO proposta_decisoes_aprovacao (proposta_id, numero_proposta, total, decisao, nome, tipo_documento, documento, aceite_termos, texto_declaracao, hash_conteudo, conteudo)
             VALUES ($1, $2, 1000, 'aprovada', 'ZZ Corr', 'CPF', '12345678909', true, 'aceito', $3, '{}')`, [livre.id, livre.numero, 'b'.repeat(64)]);
          await outro.query('COMMIT');
          await assert.rejects(() => edicao, (e) => e instanceof ErroHttp && e.status === 409, 'viu o aceite que chegou durante a espera');
        } finally { outro.release(); }
      });

      // ── 3. cronograma: dois cliques em "Gerar" ──────────────────────────
      await caso('cronograma: duas gerações ao mesmo tempo não duplicam as etapas', async () => {
        const { rows: [o] } = await pool.query("INSERT INTO obras (codigo, nome, cliente_nome, status) VALUES ('ZZ-CORR-1', 'ZZ Corr Obra', 'ZZ Corr Cliente', 'contratada') RETURNING id");
        const p = await proposta({ status: 'Aprovada', obra_id: o.id, total: 3000 });
        const sec = async (nome, ordem) => (await pool.query('INSERT INTO proposta_secoes (proposta_id, nome, ordem) VALUES ($1, $2, $3) RETURNING id', [p.id, nome, ordem])).rows[0].id;
        const sm = await sec('Materiais', 1);
        const so = await sec('Mão de obra', 2);
        const item = (s, d, v, sub) => pool.query(
          'INSERT INTO proposta_itens (proposta_id, secao_id, descricao, quantidade, unidade, valor_unitario, valor_total, subgrupo, ordem) VALUES ($1,$2,$3,1,$4,$5,$5,$6,1)',
          [p.id, s, d, 'un', v, sub]);
        await item(sm, 'Câmera', 1000, 'CFTV');
        await item(sm, 'Cabo', 500, 'Rede');
        await item(so, 'Instalação de câmeras', 1000, 'CFTV');
        await item(so, 'Lançamento de cabos', 500, 'Rede');
        const C = require('../src/controllers/cronogramaController');
        const req = () => ({ params: { id: String(o.id) }, body: { data_inicio: '2026-11-09' }, usuario: admin });
        const [r1, r2] = [resFalso(), resFalso()];
        await Promise.all([C.gerar(req(), r1), C.gerar(req(), r2)]);
        assert.strictEqual(r1.statusCode, 200);
        assert.strictEqual(r2.statusCode, 200);
        const esperadas = r1.body.etapas.length;
        assert.ok(esperadas >= 2);
        const { rows: [{ n }] } = await pool.query('SELECT count(*)::int AS n FROM obra_etapas WHERE obra_id = $1', [o.id]);
        assert.strictEqual(n, esperadas, 'antes: as duas gerações liam a lista vazia e inseriam tudo duas vezes');
      });

      // ── 11. nota: líquido negativo; rascunho casado só quando único ─────
      const N = require('../src/controllers/notasFiscaisController');
      await caso('nota: retenções maiores que o serviço (líquido negativo) são recusadas', async () => {
        const { rows: [s] } = await pool.query('SELECT id FROM empresa_servicos_nfse LIMIT 1');
        const { rows: [c] } = await pool.query("INSERT INTO clientes (nome, documento) VALUES ('ZZ Corr Tomador', $1) RETURNING id", [CPF_TESTE]);
        if (!s) return; // sem serviço fiscal cadastrado no banco de teste
        const r = resFalso();
        await N.criar({ body: { cliente_id: c.id, servico_id: s.id, valor_servicos: 100, valor_ir: 80, valor_inss: 30, discriminacao: 'ZZ Corr', competencia: '2026-11-06' }, usuario: admin }, r);
        assert.strictEqual(r.statusCode, 400);
        assert.match(r.body.erro, /líquido ficaria negativo/);
        const r2 = resFalso();
        await N.criar({ body: { cliente_id: c.id, servico_id: s.id, valor_servicos: 100, valor_ir: 80, discriminacao: 'ZZ Corr', competencia: '2026-11-06' }, usuario: admin }, r2);
        assert.strictEqual(r2.statusCode, 201);
      });

      const HM = '04003376000100';
      const xmlNacional = (numero, chave) => Buffer.from(`<NFSe xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><infNFSe Id="NFS${chave}"><nNFSe>${numero}</nNFSe><xTribNac>Engenharia</xTribNac>
  <dhProc>2026-11-03T14:05:00-03:00</dhProc><emit><CNPJ>${HM}</CNPJ></emit><valores><pAliqAplic>2.00</pAliqAplic><vISSQN>16.00</vISSQN><vLiq>784.00</vLiq></valores>
  <DPS versao="1.00"><infDPS Id="DPS1"><dhEmi>2026-11-03T14:00:00-03:00</dhEmi><serie>1</serie><nDPS>7</nDPS><dCompet>2026-11-03</dCompet>
  <toma><CPF>${CPF_TESTE}</CPF><xNome>ZZ Corr Tomador</xNome></toma>
  <serv><locPrest><cLocPrestacao>5300108</cLocPrestacao></locPrest><cServ><cTribNac>070101</cTribNac><xDescServ>Projeto</xDescServ><cNBS>114032000</cNBS></cServ></serv>
  <valores><vServPrest><vServ>800.00</vServ></vServPrest><trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>2</tpRetISSQN></tribMun></trib></valores></infDPS></DPS></infNFSe></NFSe>`);
      const CH = '5300108220400337600010000000000000009926110';

      await caso('importação: rascunho do mesmo cliente e valor só vira a nota quando é único', async () => {
        const { rows: [c] } = await pool.query('SELECT id FROM clientes WHERE documento = $1', [CPF_TESTE]);
        const rascunho = async (p) => (await pool.query(
          "INSERT INTO notas_fiscais (situacao, cliente_id, tomador, valor_servicos, discriminacao, proposta_id) VALUES ('rascunho', $1, $2, 800, 'ZZ Corr', $3) RETURNING id",
          [c.id, JSON.stringify({ nome: 'ZZ Corr Tomador' }), p.id])).rows[0].id;
        // dois rascunhos iguais de propostas diferentes → nenhum é escolhido
        const [p1, p2] = [await proposta(), await proposta()];
        const [ra, rb] = [await rascunho(p1), await rascunho(p2)];
        const r = await silencio(() => N.importarConteudos([{ nome: 'a.xml', buffer: xmlNacional(990101, `${CH}0001`) }], 1));
        assert.strictEqual(r.rascunhos_emitidos, 0);
        assert.strictEqual(r.importadas, 1);
        assert.ok(r.erros.some(e => /mais de um rascunho/.test(e)), r.erros.join(' | '));
        const sit = async (id) => (await pool.query('SELECT situacao FROM notas_fiscais WHERE id = $1', [id])).rows[0].situacao;
        assert.deepStrictEqual([await sit(ra), await sit(rb)], ['rascunho', 'rascunho']);
        // um só → vira a nota
        await pool.query('DELETE FROM notas_fiscais WHERE id = $1', [rb]);
        const r2 = await silencio(() => N.importarConteudos([{ nome: 'b.xml', buffer: xmlNacional(990102, `${CH}0002`) }], 1));
        assert.strictEqual(r2.rascunhos_emitidos, 1, r2.erros.join(' | '));
        assert.strictEqual(await sit(ra), 'emitida');
      });

      await caso('cancelamento importado não troca nota "substituída" para "cancelada"', async () => {
        const chave = `${CH}0003`;
        await pool.query(
          "INSERT INTO notas_fiscais (situacao, numero, chave_acesso, tomador, valor_servicos, discriminacao) VALUES ('substituida', 990103, $1, $2, 800, 'ZZ Corr')",
          [chave, JSON.stringify({ nome: 'ZZ Corr Tomador' })]);
        // mesmo formato do evento de testes/notasFiscais.test.js
        const evento = Buffer.from(`<evento><infEvento><pedRegEvento><infPedReg><chNFSe>${chave}</chNFSe><dhEvento>2026-11-04T10:00:00-03:00</dhEvento>
          <e101101><xDesc>Cancelamento</xDesc><cMotivo>1</cMotivo><xMotivo>Erro no valor</xMotivo></e101101></infPedReg></pedRegEvento></infEvento></evento>`);
        const r = await silencio(() => N.importarConteudos([{ nome: 'cancel.xml', buffer: evento }], 1));
        const { rows: [n] } = await pool.query('SELECT situacao FROM notas_fiscais WHERE chave_acesso = $1', [chave]);
        assert.strictEqual(n.situacao, 'substituida');
        assert.ok(!r.erros.some(e => /ainda não está no sistema/.test(e)), 'nem avisa como nota desconhecida');
      });
    } finally {
      await limpar().catch(e => console.error('limpeza:', e.message));
      await pool.end();
    }
  }

  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`correcoesGerais: ${ok} caso(s) ok`);
})().catch(e => { console.error(e); process.exit(1); });
