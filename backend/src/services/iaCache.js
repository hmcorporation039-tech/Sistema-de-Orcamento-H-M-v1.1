const crypto = require('crypto');
const pool = require('../config/database');

// Cache das chamadas à IA. Só otimização: se a tabela falhar por qualquer motivo, a
// chamada segue normalmente (nunca trava o fluxo por causa do cache).
//   nome     = função + versão do roteiro (ex.: 'equipamentos_projeto v1'); roteiro novo
//              muda o nome e não reaproveita resposta antiga
//   entrada  = o que a IA recebe; vai para o hash normalizada (espaços e caixa não contam)
//   ttlDias  = validade; resposta vazia, nula ou com erro não é guardada (cacheVazio: guarda a vazia)

const normalizar = (entrada) => (typeof entrada === 'string' ? entrada : JSON.stringify(entrada ?? null)).replace(/\s+/g, ' ').trim().toLowerCase();

function chaveDe(nome, entrada) {
  return crypto.createHash('sha256').update(`${nome}\u0000${normalizar(entrada)}`).digest('hex');
}

const vazio = (v) => v == null || v === '' || (Array.isArray(v) && !v.length) || (Array.isArray(v?.itens) && !v.itens.length) || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);

// ── Contador "quanto sai sem IA" (ia_cache_uso, por função e por dia) ────────────────────────────
// Revisão do uso de IA de 06/11/2026: antes um número só ("acertos") misturava o resolvido sem IA com a resposta
// antiga da IA reaproveitada do cache, e a chamada que falhava não contava. Agora, por função, quatro contagens:
//   'sem_ia'  resolvido pelo motor determinístico (leitor local, catálogo, referências próprias)  → coluna sem_ia
//   'cache'   reaproveitou uma resposta que a IA já tinha dado (não chamou de novo)              → coluna acertos
//   'ia'      chamou a IA e ela respondeu                                                         → coluna chamadas
//   'falha'   chamou a IA e ela não respondeu (fora do ar, sem cota, tempo esgotado)              → coluna falhas
// Cada função conta na sua unidade (documento, material, pesquisa, arquivo) — o painel mostra por função.
// O nome da função é gravado sem a versão do roteiro ('equipamentos_projeto v1' → 'equipamentos_projeto').
const COLUNA_DO_TIPO = { sem_ia: 'sem_ia', cache: 'acertos', ia: 'chamadas', falha: 'falhas' };
const nomeDaFuncao = (nome) => String(nome || '').replace(/\s+v\d+$/i, '').slice(0, 60);

// tipo: 'sem_ia' | 'cache' | 'ia' | 'falha' (true/false de antes = 'cache'/'ia')
async function registrarUso(nome, tipo) {
  const t = tipo === true ? 'cache' : tipo === false ? 'ia' : tipo;
  const coluna = COLUNA_DO_TIPO[t];
  if (!coluna) return;
  await pool.query(
    `INSERT INTO ia_cache_uso (nome, dia, ${coluna}) VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (nome, dia) DO UPDATE SET ${coluna} = ia_cache_uso.${coluna} + 1`,
    [nomeDaFuncao(nome)]
  ).catch(() => {});
}

// Leitura de cotação de fornecedor (pasta e e-mail), por documento: lido só com os leitores locais (layouts
// conhecidos, universal, OCR) = sem IA; leitura da IA reaproveitada do mesmo documento já lido (hash) = cache; foi para
// a IA = chamada (ou falha, se ela não respondeu). Documento sem itens e sem IA não entra na conta. Nunca derruba a leitura.
function contarLeituraCotacao(leitura) {
  if (leitura?.iaDeCache) return registrarUso('leitura_cotacao', 'cache');
  if (leitura?.usouIA) return registrarUso('leitura_cotacao', leitura.iaFalhou ? 'falha' : 'ia');
  if (leitura?.itens?.length) return registrarUso('leitura_cotacao', 'sem_ia');
  return Promise.resolve();
}

// comCache(nome, entrada, { ttlDias, fresco, cacheVazio, guardar }, () => chamadaÀIA())
//   → { valor, deCache, criadoEm }. `fresco` ignora o que está guardado (e regrava).
//   cacheVazio: guarda também a resposta vazia (a IA já disse que não há nada neste texto — não perguntar de novo).
//   guardar(valor) → false: não guarda esta resposta (ex.: a IA leu só parte do texto).
//   contar: false — quem chama conta o uso na própria unidade (ex.: leitura de cotação, por documento).
async function comCache(nome, entrada, { ttlDias, fresco = false, cacheVazio = false, guardar, contar = true } = {}, chamada) {
  const uso = (tipo) => (contar ? registrarUso(nome, tipo) : Promise.resolve());
  const chave = chaveDe(nome, entrada);
  if (!fresco) {
    const guardado = await pool.query(
      `UPDATE ia_cache SET acertos = acertos + 1 WHERE chave = $1 AND expira_em > NOW() RETURNING resultado, criado_em`,
      [chave]
    ).then(r => r.rows[0]).catch(() => null);
    if (guardado) {
      await uso('cache');
      return { valor: guardado.resultado, deCache: true, criadoEm: guardado.criado_em };
    }
  }
  let valor;
  try {
    valor = await chamada(); // erro da IA sobe daqui: nada é guardado
  } catch (e) {
    await uso('falha');
    throw e;
  }
  await uso('ia');
  const podeGuardar = valor != null && (cacheVazio || !vazio(valor)) && (!guardar || guardar(valor) !== false);
  if (podeGuardar) {
    limparExpiradosDeVezEmQuando();
    await pool.query(
      `INSERT INTO ia_cache (chave, nome, resultado, expira_em) VALUES ($1, $2, $3, NOW() + ($4 || ' days')::interval)
       ON CONFLICT (chave) DO UPDATE SET resultado = EXCLUDED.resultado, criado_em = NOW(), expira_em = EXCLUDED.expira_em, acertos = 0`,
      [chave, nome, JSON.stringify(valor), String(ttlDias)]
    ).catch(() => {});
  }
  return { valor, deCache: false, criadoEm: null };
}

// Painel de Integrações e "O que o sistema já sabe": por função, as quatro contagens e as taxas
//   taxaSemIA = resolvido sem IA nenhuma; taxa = não precisou chamar a IA agora (sem IA + cache)
async function situacao(dias = 30) {
  try {
    const uso = await pool.query(
      `SELECT regexp_replace(nome, '\\s+v[0-9]+$', '') AS nome, SUM(sem_ia)::int AS sem_ia, SUM(acertos)::int AS cache,
              SUM(chamadas)::int AS chamadas, SUM(falhas)::int AS falhas
         FROM ia_cache_uso WHERE dia > CURRENT_DATE - $1::int GROUP BY 1 ORDER BY 1`, [dias]);
    const guardadas = await pool.query(`SELECT COUNT(*)::int AS n FROM ia_cache WHERE expira_em > NOW()`);
    const pct = (a, b) => (b ? Math.round(100 * a / b) : null);
    const funcoes = uso.rows.map(r => {
      const total = r.sem_ia + r.cache + r.chamadas + r.falhas;
      return {
        nome: r.nome, semIA: r.sem_ia, cache: r.cache, chamadas: r.chamadas, falhas: r.falhas, total,
        acertos: r.sem_ia + r.cache, // compatível com a tela antiga: não chamou a IA agora
        taxaSemIA: pct(r.sem_ia, total), taxa: pct(r.sem_ia + r.cache, total),
      };
    });
    const soma = (c) => funcoes.reduce((s, f) => s + f[c], 0);
    const semIA = soma('semIA'), cache = soma('cache'), chamadas = soma('chamadas'), falhas = soma('falhas');
    return {
      dias, semIA, cache, chamadas, falhas, acertos: semIA + cache, evitadas: semIA + cache,
      taxa: pct(semIA + cache, semIA + cache + chamadas + falhas) ?? 0, guardadas: guardadas.rows[0].n, funcoes,
    };
  } catch {
    return { dias, semIA: 0, cache: 0, chamadas: 0, falhas: 0, acertos: 0, evitadas: 0, taxa: 0, guardadas: 0, funcoes: [] };
  }
}

async function limparExpirados() {
  const r = await pool.query('DELETE FROM ia_cache WHERE expira_em < NOW()');
  return r.rowCount;
}

// Resposta vencida nunca mais é lida: sem isto a tabela só cresceria. Sem rotina própria — na
// primeira gravação de cada processo e depois no máximo uma vez por dia, em segundo plano.
let ultimaLimpeza = 0;
function limparExpiradosDeVezEmQuando() {
  if (Date.now() - ultimaLimpeza < 24 * 3600 * 1000) return;
  ultimaLimpeza = Date.now();
  limparExpirados().catch(() => {});
}

module.exports = { comCache, chaveDe, registrarUso, contarLeituraCotacao, situacao, limparExpirados, nomeDaFuncao };
