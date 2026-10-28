// Monitor das pastas dos clientes (versão 2.3, migração 2.0-19): avisa quando
// aparece arquivo NOVO, ALTERADO ou REMOVIDO na pasta de um cliente — o
// projeto revisado que o arquiteto mandou, a planilha que o cliente atualizou.
//   - o que o PRÓPRIO sistema grava (P.gravarArquivo) é registrado na hora como
//     "conhecido" (origem 'sistema'): não vira aviso;
//   - a varredura compara a pasta com o retrato (pasta_arquivos) — a cada 10 min
//     em segundo plano e na hora, quando alguém abre o cliente/obra;
//   - o que já existia antes (pastas levadas pelo script de mudança, pasta do
//     servidor adotada pelo nome ou ligada à mão) entra no retrato inicial como
//     conhecido, sem virar aviso (clientes.pasta_retrato_em);
//   - em segundo plano, só os clientes em tratamento (SQL_EM_TRATAMENTO);
//   - arquivo de projeto novo (PDF/DWG/DXF/ZIP) aparece pronto para "Analisar".
// Desliga com MONITOR_PASTAS=desligado no .env.
const fsp = require('fs/promises');
const path = require('path');
const pool = require('../config/database');
const P = require('../utils/pastasSistema');

const IGNORAR = /(^|[\\/])(~\$[^\\/]*|Thumbs\.db|desktop\.ini|\.DS_Store)$|\.(tmp|bak|dwl2?|sv\$)$/i;
const ANALISAVEL = /\.(pdf|dwg|dxf|zip)$/i;
const INTERVALO_MS = 10 * 60 * 1000;
const relDe = (raiz, abs) => path.relative(raiz, abs).split(path.sep).join('/');

// cliente e obra a partir do caminho relativo ("<cliente>/Obras/<obra>/...")
async function donoDoCaminho(rel, client = pool) {
  const [cli, sub, obraPasta] = rel.split('/');
  const c = (await client.query('SELECT id FROM clientes WHERE LOWER(pasta) = LOWER($1) LIMIT 1', [cli])).rows[0];
  let obraId = null;
  if (sub === 'Obras' && obraPasta) {
    obraId = (await client.query('SELECT id FROM obras WHERE pasta_base = $1 AND LOWER(pasta) = LOWER($2) LIMIT 1', [`${cli}/Obras`, obraPasta])).rows[0]?.id || null;
  }
  return { clienteId: c?.id || null, obraId };
}

// Gravação feita pelo sistema → retrato "conhecido" (sem aviso)
async function registrarGravacaoSistema(abs) {
  try {
    const raiz = [P.RAIZ_CLIENTES_SERVIDOR, P.RAIZ_CLIENTES_PENDENTE].map(r => path.resolve(r)).find(r => path.resolve(abs).startsWith(r + path.sep));
    if (!raiz) return;
    const rel = relDe(raiz, path.resolve(abs));
    if (IGNORAR.test(rel) || rel.startsWith('_Excluídos/')) return;
    const st = await fsp.stat(abs);
    const { clienteId, obraId } = await donoDoCaminho(rel);
    await pool.query(
      `INSERT INTO pasta_arquivos (cliente_id, obra_id, caminho, tamanho, modificado_em, origem, situacao)
       VALUES ($1,$2,$3,$4,$5,'sistema','conhecido')
       ON CONFLICT ((LOWER(caminho))) DO UPDATE SET tamanho = EXCLUDED.tamanho, modificado_em = EXCLUDED.modificado_em,
         origem = 'sistema', situacao = 'conhecido', cliente_id = EXCLUDED.cliente_id, obra_id = EXCLUDED.obra_id`,
      [clienteId, obraId, rel, st.size, st.mtime]);
  } catch (e) {
    console.warn(`Monitor de pastas (registrar gravação): ${e.message}`);
  }
}

const emAndamento = new Map();

// Varre a pasta de UM cliente (pastaRel = clientes.pasta, ou "_Sem cliente")
async function escanearPasta(pastaRel, clienteId) {
  const chave = pastaRel.toLowerCase();
  if (emAndamento.has(chave)) return emAndamento.get(chave);
  const tarefa = (async () => {
    if (!(await P.servidorDisponivel())) return { disponivel: false };
    const dir = path.join(P.RAIZ_CLIENTES_SERVIDOR, pastaRel);
    if (!(await P.existe(dir))) return { disponivel: true, novos: 0 };
    const arquivos = (await P.listarArquivos(dir))
      .map(a => ({ ...a, rel: `${pastaRel}/${a.arquivo.split(path.sep).join('/')}` }))
      .filter(a => !IGNORAR.test(a.rel) && !a.rel.includes('/_Excluídos/'));
    const prefixo = `${pastaRel}/`.toLowerCase();
    const { rows } = await pool.query('SELECT id, caminho, tamanho, modificado_em, origem, situacao FROM pasta_arquivos WHERE left(LOWER(caminho), length($1)) = $1', [prefixo]);
    const retrato = new Map(rows.map(r => [r.caminho.toLowerCase(), r]));
    // retrato inicial (clientes.pasta_retrato_em NULL): pasta que já existia no
    // servidor e foi adotada — o que está nela entra como conhecido, sem aviso.
    // Pasta criada pelo sistema nasce vazia e com o retrato feito: tudo que
    // aparecer nela é novidade.
    const primeira = !!clienteId && !(await pool.query('SELECT pasta_retrato_em FROM clientes WHERE id = $1', [clienteId])).rows[0]?.pasta_retrato_em;
    let novos = 0, alterados = 0, removidos = 0;
    const donos = new Map();
    const dono = async (rel) => {
      const k = rel.split('/').slice(0, 3).join('/');
      if (!donos.has(k)) donos.set(k, await donoDoCaminho(rel));
      return donos.get(k);
    };
    for (const a of arquivos) {
      const atual = retrato.get(a.rel.toLowerCase());
      retrato.delete(a.rel.toLowerCase());
      if (!atual) {
        const d = await dono(a.rel);
        await pool.query(
          `INSERT INTO pasta_arquivos (cliente_id, obra_id, caminho, tamanho, modificado_em, origem, situacao)
           VALUES ($1,$2,$3,$4,$5,'externo',$6) ON CONFLICT ((LOWER(caminho))) DO NOTHING`,
          [d.clienteId ?? clienteId, d.obraId, a.rel, a.tamanho, a.alterado_em, primeira ? 'conhecido' : 'novo']);
        if (!primeira) novos++;
        continue;
      }
      const mudou = Number(atual.tamanho) !== a.tamanho || Math.abs(new Date(atual.modificado_em).getTime() - new Date(a.alterado_em).getTime()) > 2000;
      if (mudou && primeira) {
        await pool.query("UPDATE pasta_arquivos SET tamanho = $2, modificado_em = $3, situacao = 'conhecido' WHERE id = $1", [atual.id, a.tamanho, a.alterado_em]);
      } else if (mudou) {
        // novo continua novo (ainda não visto); o resto vira alterado
        await pool.query(`UPDATE pasta_arquivos SET tamanho = $2, modificado_em = $3, situacao = CASE WHEN situacao = 'novo' THEN 'novo' ELSE 'alterado' END,
          detectado_em = NOW(), visto_em = NULL, visto_por = NULL WHERE id = $1`, [atual.id, a.tamanho, a.alterado_em]);
        alterados++;
      } else if (atual.situacao === 'removido') {
        await pool.query("UPDATE pasta_arquivos SET situacao = 'conhecido' WHERE id = $1", [atual.id]);
      }
    }
    // o que sumiu: do sistema sai do retrato calado; o de fora vira aviso
    for (const r of retrato.values()) {
      if (primeira || r.origem === 'sistema' || r.situacao === 'novo') await pool.query('DELETE FROM pasta_arquivos WHERE id = $1', [r.id]);
      else if (r.situacao !== 'removido') { await pool.query("UPDATE pasta_arquivos SET situacao = 'removido', detectado_em = NOW(), visto_em = NULL WHERE id = $1", [r.id]); removidos++; }
    }
    if (primeira) await pool.query('UPDATE clientes SET pasta_retrato_em = NOW() WHERE id = $1', [clienteId]);
    return { disponivel: true, novos, alterados, removidos, primeira };
  })().finally(() => emAndamento.delete(chave));
  emAndamento.set(chave, tarefa);
  return tarefa;
}

async function escanearCliente(clienteId) {
  const c = (await pool.query('SELECT id, pasta FROM clientes WHERE id = $1', [clienteId])).rows[0];
  if (!c?.pasta) return { disponivel: await P.servidorDisponivel(), novos: 0 };
  return escanearPasta(c.pasta, c.id);
}

// Em segundo plano, só os clientes EM TRATAMENTO (as pastas do servidor podem
// ter milhares de arquivos): obra em andamento, movimento nos últimos 90 dias
// ou retrato inicial por tirar. Os outros são varridos quando alguém abre o
// cliente/obra (escanearCliente). `todos`: o script de mudança varre tudo.
const SQL_EM_TRATAMENTO = `
  SELECT c.id, c.pasta FROM clientes c
   WHERE c.pasta IS NOT NULL AND (c.pasta_retrato_em IS NULL
      OR c.atualizado_em > NOW() - INTERVAL '90 days'
      OR EXISTS (SELECT 1 FROM obras o WHERE o.cliente_id = c.id AND (o.status NOT IN ('concluida', 'cancelada') OR o.atualizado_em > NOW() - INTERVAL '90 days'))
      OR EXISTS (SELECT 1 FROM propostas p WHERE p.cliente_id = c.id AND p.atualizado_em > NOW() - INTERVAL '90 days')
      OR EXISTS (SELECT 1 FROM analises_projeto a WHERE a.cliente_id = c.id AND a.atualizado_em > NOW() - INTERVAL '90 days')
      OR EXISTS (SELECT 1 FROM laudos_projetos l WHERE l.cliente_id = c.id AND l.atualizado_em > NOW() - INTERVAL '90 days'))`;

async function escanearTodos({ todos = false } = {}) {
  const { rows } = await pool.query(todos ? 'SELECT id, pasta FROM clientes WHERE pasta IS NOT NULL' : SQL_EM_TRATAMENTO);
  const total = { novos: 0, alterados: 0, removidos: 0 };
  for (const c of rows) {
    const r = await escanearPasta(c.pasta, c.id).catch(e => { console.warn(`Monitor de pastas (${c.pasta}): ${e.message}`); return {}; });
    if (r.disponivel === false) return { disponivel: false };
    for (const k of Object.keys(total)) total[k] += r[k] || 0;
  }
  await escanearPasta(P.SEM_CLIENTE, null).catch(() => {});
  return { disponivel: true, ...total };
}

const SQL_NOVIDADES = `
  SELECT pa.id, pa.caminho, pa.situacao, pa.origem, pa.tamanho, pa.modificado_em, pa.detectado_em,
         pa.cliente_id, c.nome AS cliente_nome, pa.obra_id, o.codigo AS obra_codigo, o.nome AS obra_nome
    FROM pasta_arquivos pa
    LEFT JOIN clientes c ON c.id = pa.cliente_id
    LEFT JOIN obras o ON o.id = pa.obra_id
   WHERE pa.situacao <> 'conhecido'`;

async function novidades({ clienteId = null, obraId = null } = {}) {
  const cond = [], params = [];
  if (clienteId) { params.push(clienteId); cond.push(`pa.cliente_id = $${params.length}`); }
  if (obraId) { params.push(obraId); cond.push(`(pa.obra_id = $${params.length} OR (pa.obra_id IS NULL AND pa.cliente_id = (SELECT cliente_id FROM obras WHERE id = $${params.length})))`); }
  const { rows } = await pool.query(`${SQL_NOVIDADES}${cond.length ? ` AND ${cond.join(' AND ')}` : ''} ORDER BY pa.detectado_em DESC LIMIT 300`, params);
  return rows.map(r => ({ ...r, nome: r.caminho.split('/').pop(), analisavel: r.situacao !== 'removido' && ANALISAVEL.test(r.caminho) }));
}

async function resumo() {
  const { rows } = await pool.query(`SELECT pa.cliente_id, c.nome AS cliente_nome, count(*)::int AS total
    FROM pasta_arquivos pa LEFT JOIN clientes c ON c.id = pa.cliente_id WHERE pa.situacao <> 'conhecido' GROUP BY 1, 2 ORDER BY 3 DESC`);
  return { total: rows.reduce((s, r) => s + r.total, 0), porCliente: rows, disponivel: await P.servidorDisponivel() };
}

// "Visto": novo/alterado vira conhecido; removido sai do retrato
async function marcarVisto(ids, usuario) {
  const lista = [...new Set((ids || []).map(Number).filter(n => Number.isInteger(n) && n > 0))].slice(0, 1000);
  if (!lista.length) return 0;
  await pool.query("DELETE FROM pasta_arquivos WHERE id = ANY($1) AND situacao = 'removido'", [lista]);
  const r = await pool.query("UPDATE pasta_arquivos SET situacao = 'conhecido', visto_em = NOW(), visto_por = $2 WHERE id = ANY($1) AND situacao <> 'conhecido'", [lista, usuario.id]);
  return r.rowCount;
}

// Caminho absoluto de um arquivo do retrato (no servidor ou, se ainda não foi, na reserva local)
async function caminhoAbsoluto(rel) {
  const partes = String(rel).split('/');
  if (partes.some(p => p === '..' || p === '')) return null;
  for (const raiz of [P.RAIZ_CLIENTES_SERVIDOR, P.RAIZ_CLIENTES_PENDENTE]) {
    const abs = path.join(raiz, ...partes);
    if (await P.existe(abs)) return abs;
  }
  return null;
}

let relogio = null;
function iniciarMonitor() {
  P.registrarAoGravar((abs) => { registrarGravacaoSistema(abs); });
  if (String(process.env.MONITOR_PASTAS || '').toLowerCase() === 'desligado' || relogio) return;
  const rodada = async () => {
    try {
      const enviados = await P.enviarPendentesAoServidor();
      if (enviados) console.log(`Pasta dos clientes: ${enviados} arquivo(s) gravado(s) com o servidor fora foram enviados.`);
      await escanearTodos();
    } catch (e) {
      console.warn(`Monitor de pastas: ${e.message}`);
    }
  };
  setTimeout(rodada, 60 * 1000).unref?.();
  relogio = setInterval(rodada, INTERVALO_MS);
  relogio.unref?.();
}

module.exports = { iniciarMonitor, registrarGravacaoSistema, escanearPasta, escanearCliente, escanearTodos, novidades, resumo, marcarVisto, caminhoAbsoluto, ANALISAVEL };
