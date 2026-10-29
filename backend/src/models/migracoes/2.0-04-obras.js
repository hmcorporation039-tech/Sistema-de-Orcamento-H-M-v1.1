// Versão 2.0 — Fase 2D: a entidade OBRA.
//
// Antes, proposta, análise, laudo, contrato e financeiro só se ligavam pelo
// nome digitado. Aqui nasce a tabela `obras` e a coluna `obra_id` (nula,
// ON DELETE SET NULL) em propostas, analises_projeto, laudos_projetos,
// contratos e financeiro_movimentos. Regras puras em utils/obras.js.
//
// Ligação dos dados existentes (docs/ARQUITETURA-2.0.md, Fase 2), só onde
// obra_id ainda é NULL e nunca apagando nada:
//   0. cliente_id por nome (sem acento/maiúscula, só com um cliente ativo que
//      bata) onde for nulo — análises, laudos e propostas;
//   1. cada análise → uma obra (nome do projeto ou cliente + data), com a
//      proposta dela (analises_projeto.proposta_id);
//   2. cada laudo → a obra da análise de onde veio ("Calcular pela norma":
//      laudos_projetos.analise_id, ou, nos antigos, título + cliente iguais
//      aos da análise) ou uma obra própria (nome = título); as propostas de
//      laudos_projetos.propostas vão junto;
//   3. propostas soltas → uma obra por local_obra + cliente (normalizados);
//      sem local, uma obra por proposta;
//   4. contratos → obra cujo nome/local bate com contratos.local_obra
//      (utils/obras.js escolherObraParaContrato); senão ficam sem obra;
//   5. movimentos do financeiro ficam sem obra (o usuário liga na tela).
// Status inicial: alguma proposta Aprovada → 'contratada'; senão 'orcamento'.
//
// Idempotente em dois níveis:
//   - a ligação roda UMA vez (marca 'obras_migracao_dados' em configuracoes):
//     depois disso, um item que o usuário desligar de uma obra não é religado
//     no próximo reinício, e item novo sem obra não vira obra sozinho;
//   - cada obra criada aqui guarda a origem (origem_migracao 'analise:12',
//     'laudo:3', 'propostas:45'), única — mesmo apagando a marca e rodando de
//     novo, nenhuma obra é duplicada.
// Os arquivos NÃO são movidos: as pastas antigas (Projetos\, Laudos\)
// continuam onde estão; só itens novos ligados a uma obra nascem na pasta
// dela (services/pastasRegistros.js, coluna pasta_obra_id).
const O = require('../../utils/obras');
const { segmentoDoCliente } = require('../../utils/precosMaoDeObraReferencia');

const MARCA = 'obras_migracao_dados';
const LISTA_STATUS = O.STATUS_OBRA.map(s => `'${s}'`).join(',');

module.exports = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS obras (
      id SERIAL PRIMARY KEY,
      codigo VARCHAR(20) NOT NULL UNIQUE,
      nome VARCHAR(200) NOT NULL,
      cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
      cliente_nome VARCHAR(200),
      local TEXT,
      segmento VARCHAR(10) NOT NULL DEFAULT 'privado',
      status VARCHAR(20) NOT NULL DEFAULT 'orcamento',
      inicio_previsto DATE,
      fim_previsto DATE,
      responsavel_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      pasta VARCHAR(255),
      observacoes TEXT,
      usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
      origem_migracao VARCHAR(40) UNIQUE,
      criado_em TIMESTAMP DEFAULT NOW(),
      atualizado_em TIMESTAMP DEFAULT NOW(),
      versao INTEGER NOT NULL DEFAULT 0
    )`);
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'obras_segmento_check') THEN
        ALTER TABLE obras ADD CONSTRAINT obras_segmento_check CHECK (segmento IN ('publico','privado'));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'obras_status_check') THEN
        ALTER TABLE obras ADD CONSTRAINT obras_status_check CHECK (status IN (${LISTA_STATUS}));
      END IF;
    END $$`);
  await client.query('CREATE INDEX IF NOT EXISTS idx_obras_status ON obras (status)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_obras_cliente ON obras (cliente_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_obras_atualizado ON obras (atualizado_em DESC)');

  for (const tabela of ['propostas', 'analises_projeto', 'laudos_projetos', 'contratos', 'financeiro_movimentos']) {
    await client.query(`ALTER TABLE ${tabela} ADD COLUMN IF NOT EXISTS obra_id INTEGER REFERENCES obras(id) ON DELETE SET NULL`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_${tabela}_obra ON ${tabela} (obra_id)`);
  }
  // laudos guardavam só o nome do cliente; e passam a lembrar a análise de origem
  await client.query('ALTER TABLE laudos_projetos ADD COLUMN IF NOT EXISTS cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL');
  await client.query('ALTER TABLE laudos_projetos ADD COLUMN IF NOT EXISTS analise_id INTEGER REFERENCES analises_projeto(id) ON DELETE SET NULL');
  // Pasta dentro da obra: análise/laudo NOVO ligado a uma obra grava em
  // Obras\<obra>\Projeto ou Obras\<obra>\Laudos\<disciplina>; esta coluna diz
  // de qual obra é a pasta (nula = pasta antiga em Projetos\ ou Laudos\).
  for (const tabela of ['analises_projeto', 'laudos_projetos']) {
    await client.query(`ALTER TABLE ${tabela} ADD COLUMN IF NOT EXISTS pasta_obra_id INTEGER REFERENCES obras(id) ON DELETE SET NULL`);
  }

  // uma vez só (models/apoioMigracoes.js)
  const resumo = await require('../apoioMigracoes').umaVez(client, MARCA, () => ligarDadosExistentes(client));
  if (!resumo) return;
  console.log(`Obras (2.0): ${resumo.obrasCriadas} obra(s) criada(s) — de ${resumo.deAnalises} análise(s), ${resumo.deLaudos} laudo(s) e ${resumo.dePropostas} grupo(s) de propostas; ` +
    `${resumo.propostasLigadas} proposta(s), ${resumo.laudosNaObraDaAnalise} laudo(s) na obra da análise, ${resumo.contratosLigados} contrato(s) ligados; ` +
    `cliente_id preenchido em ${resumo.clientesPreenchidos} registro(s)`);
};

async function ligarDadosExistentes(client) {
  const r = { obrasCriadas: 0, deAnalises: 0, deLaudos: 0, dePropostas: 0, propostasLigadas: 0, laudosNaObraDaAnalise: 0, contratosLigados: 0, contratosSemObra: 0, clientesPreenchidos: 0 };

  // ── 0. cliente_id por nome ────────────────────────────────────────────
  const clientes = (await client.query('SELECT id, nome, tipo FROM clientes WHERE ativo = true')).rows;
  const porNome = new Map();
  for (const c of clientes) {
    const k = O.normalizarTexto(c.nome);
    if (!k) continue;
    porNome.set(k, porNome.has(k) ? null : c); // nome repetido no cadastro: ambíguo, não liga
  }
  const clientePorNome = (nome) => porNome.get(O.normalizarTexto(nome)) || null;
  const clientePorId = new Map(clientes.map(c => [c.id, c]));
  for (const tabela of ['analises_projeto', 'laudos_projetos', 'propostas']) {
    const { rows } = await client.query(`SELECT id, cliente_nome FROM ${tabela} WHERE cliente_id IS NULL AND COALESCE(TRIM(cliente_nome), '') <> ''`);
    for (const row of rows) {
      const c = clientePorNome(row.cliente_nome);
      if (!c) continue;
      const u = await client.query(`UPDATE ${tabela} SET cliente_id = $1 WHERE id = $2 AND cliente_id IS NULL`, [c.id, row.id]);
      r.clientesPreenchidos += u.rowCount;
    }
  }

  // ── códigos OB-AAAA-NNN ───────────────────────────────────────────────
  const codigos = (await client.query('SELECT codigo FROM obras')).rows.map(x => x.codigo);
  async function criarObra({ origem, nome, clienteId, clienteNome, local, usuarioId, criadoEm }) {
    const existente = await client.query('SELECT id FROM obras WHERE origem_migracao = $1', [origem]);
    if (existente.rows.length) return existente.rows[0].id;
    const quando = criadoEm ? new Date(criadoEm) : new Date();
    const ano = quando.getFullYear();
    const codigo = O.formatarCodigo(ano, O.proximoSequencial(codigos, ano));
    codigos.push(codigo);
    const cli = clienteId ? clientePorId.get(clienteId) : clientePorNome(clienteNome);
    const nomeCliente = (clienteNome && String(clienteNome).trim()) || cli?.nome || null;
    const { rows } = await client.query(
      `INSERT INTO obras (codigo, nome, cliente_id, cliente_nome, local, segmento, status, usuario_id, origem_migracao, criado_em, atualizado_em)
       VALUES ($1,$2,$3,$4,$5,$6,'orcamento',$7,$8,$9,$9) RETURNING id`,
      [codigo, String(nome || 'Obra').slice(0, 200), cli?.id || clienteId || null, nomeCliente ? nomeCliente.slice(0, 200) : null,
       local && String(local).trim() ? String(local).trim() : null,
       segmentoDoCliente(cli?.tipo, nomeCliente), usuarioId || null, origem, quando]
    );
    r.obrasCriadas++;
    return rows[0].id;
  }
  const ligarProposta = async (propostaId, obraId) => {
    const u = await client.query('UPDATE propostas SET obra_id = $1 WHERE id = $2 AND obra_id IS NULL', [obraId, propostaId]);
    r.propostasLigadas += u.rowCount;
  };

  // ── 1. análises ───────────────────────────────────────────────────────
  const analises = (await client.query(
    `SELECT a.id, a.cliente_id, a.cliente_nome, a.nome_projeto, a.pasta, a.arquivos_analisados, a.proposta_id, a.usuario_id, a.criado_em,
            p.local_obra, p.cliente_id AS proposta_cliente_id
       FROM analises_projeto a LEFT JOIN propostas p ON p.id = a.proposta_id
      WHERE a.obra_id IS NULL ORDER BY a.id`)).rows;
  for (const a of analises) {
    const obraId = await criarObra({
      origem: `analise:${a.id}`, nome: O.nomeObraDaAnalise(a), clienteId: a.cliente_id || a.proposta_cliente_id,
      clienteNome: a.cliente_nome, local: a.local_obra, usuarioId: a.usuario_id, criadoEm: a.criado_em,
    });
    r.deAnalises++;
    await client.query('UPDATE analises_projeto SET obra_id = $1 WHERE id = $2 AND obra_id IS NULL', [obraId, a.id]);
    if (a.proposta_id) await ligarProposta(a.proposta_id, obraId);
  }

  // ── 2. laudos ─────────────────────────────────────────────────────────
  const analisesComObra = (await client.query(
    'SELECT id, nome_projeto, cliente_nome, criado_em, obra_id FROM analises_projeto WHERE obra_id IS NOT NULL')).rows;
  const laudos = (await client.query(
    `SELECT id, titulo, cliente_id, cliente_nome, propostas, analise_id, usuario_id, criado_em, dados->'obra'->>'nome' AS obra_nome
       FROM laudos_projetos WHERE obra_id IS NULL ORDER BY id`)).rows;
  for (const l of laudos) {
    const idsPropostas = Object.values(l.propostas || {}).map(Number).filter(n => Number.isInteger(n) && n > 0);
    let obraId = null;
    const origemAnalise = l.analise_id
      ? analisesComObra.find(a => a.id === l.analise_id)
      : O.analiseDeOrigemDoLaudo(l, analisesComObra);
    if (origemAnalise) {
      obraId = origemAnalise.obra_id;
      r.laudosNaObraDaAnalise++;
    } else {
      // uma das propostas do laudo já está numa obra (ex.: veio da análise) → mesma obra
      if (idsPropostas.length) {
        const { rows } = await client.query('SELECT obra_id FROM propostas WHERE id = ANY($1::int[]) AND obra_id IS NOT NULL ORDER BY id LIMIT 1', [idsPropostas]);
        obraId = rows[0]?.obra_id || null;
      }
      if (!obraId) {
        obraId = await criarObra({
          origem: `laudo:${l.id}`, nome: l.titulo || l.obra_nome || `Laudo ${l.id}`, clienteId: l.cliente_id,
          clienteNome: l.cliente_nome, local: null, usuarioId: l.usuario_id, criadoEm: l.criado_em,
        });
        r.deLaudos++;
      }
    }
    await client.query('UPDATE laudos_projetos SET obra_id = $1 WHERE id = $2 AND obra_id IS NULL', [obraId, l.id]);
    for (const pid of idsPropostas) await ligarProposta(pid, obraId);
  }

  // ── 3. propostas soltas ───────────────────────────────────────────────
  const soltas = (await client.query(
    'SELECT id, numero, cliente_id, cliente_nome, local_obra, status, usuario_id, criado_em FROM propostas WHERE obra_id IS NULL ORDER BY id')).rows;
  for (const grupo of O.agruparPropostasSoltas(soltas)) {
    const primeira = grupo.propostas[0];
    const comCliente = grupo.propostas.find(p => p.cliente_id) || primeira;
    const obraId = await criarObra({
      origem: `propostas:${primeira.id}`, nome: O.nomeObraDasPropostas(grupo), clienteId: comCliente.cliente_id,
      clienteNome: comCliente.cliente_nome, local: primeira.local_obra, usuarioId: primeira.usuario_id, criadoEm: primeira.criado_em,
    });
    r.dePropostas++;
    for (const p of grupo.propostas) await ligarProposta(p.id, obraId);
  }

  // status deduzido (só nas obras criadas por esta migração)
  await client.query(`
    UPDATE obras SET status = 'contratada'
     WHERE origem_migracao IS NOT NULL AND status = 'orcamento'
       AND EXISTS (SELECT 1 FROM propostas p WHERE p.obra_id = obras.id AND p.status = 'Aprovada')`);

  // ── 4. contratos ──────────────────────────────────────────────────────
  const obras = (await client.query('SELECT id, nome, local, status FROM obras')).rows;
  const contratos = (await client.query("SELECT id, local_obra FROM contratos WHERE obra_id IS NULL AND COALESCE(TRIM(local_obra), '') <> '' ORDER BY id")).rows;
  for (const c of contratos) {
    const obraId = O.escolherObraParaContrato(c.local_obra, obras);
    if (!obraId) { r.contratosSemObra++; continue; }
    const u = await client.query('UPDATE contratos SET obra_id = $1 WHERE id = $2 AND obra_id IS NULL', [obraId, c.id]);
    r.contratosLigados += u.rowCount;
  }

  // 5. financeiro_movimentos: ficam sem obra de propósito.
  return r;
}
