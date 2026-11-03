// Busca aproximada de obra, proposta e cliente pelo que a pessoa escreveu no canal ("custos santa
// lucia", "proposta 254", "enviar P254 para paroquia"). Sem IA: compara palavras sem acento e sem
// caixa, aceita palavra começada ("paroq" → "Paróquia") e um erro de digitação em palavra longa.
//
// escolher(candidatos) decide: um só claramente melhor → { unico }; empate → { varios } para o canal
// perguntar "qual?"; nada parecido → { nenhum }.
const pool = require('../../config/database');
const { semAcento } = require('../../utils/texto');

const PALAVRAS_VAZIAS = new Set(['a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'para', 'pra', 'obra', 'cliente', 'proposta', 'ltda', 'me', 'sa']);

const normalizar = (s) => semAcento(String(s || '')).toLowerCase().replace(/[^a-z0-9@.\-]+/g, ' ').trim();
const palavras = (s) => normalizar(s).replace(/[.\-@]/g, ' ').split(/\s+/).filter(p => p && !PALAVRAS_VAZIAS.has(p));

// distância de edição limitada (para "lucia" × "luzia")
function distancia(a, b, limite = 2) {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let ant = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(ant[j] + 1, atual[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (atual[j] < menor) menor = atual[j];
    }
    if (menor > limite) return limite + 1;
    ant = atual;
  }
  return ant[b.length];
}

function palavraCasa(termo, alvo) {
  if (termo === alvo) return 1;
  if (termo.length >= 3 && alvo.startsWith(termo)) return 0.9;
  if (termo.length >= 5 && distancia(termo, alvo, 1) <= 1) return 0.8;
  return 0;
}

// 0 a 1: quanto do que foi escrito aparece no texto do candidato
function pontuar(termo, texto) {
  const t = palavras(termo);
  if (!t.length) return 0;
  const alvo = palavras(texto);
  if (!alvo.length) return 0;
  let soma = 0;
  for (const p of t) soma += Math.max(0, ...alvo.map(a => palavraCasa(p, a)));
  const base = soma / t.length;
  // a frase inteira dentro do nome vale mais que as palavras soltas
  const inteira = normalizar(texto).includes(normalizar(termo)) ? 0.05 : 0;
  return Math.min(1, base + inteira);
}

const MINIMO = 0.6;
const FOLGA = 0.15;

// candidatos: [{ id, rotulo, texto, exato? }] → { unico } | { varios } | { nenhum }
function escolher(termo, candidatos, { maximo = 5 } = {}) {
  const exatos = candidatos.filter(c => c.exato);
  if (exatos.length === 1) return { unico: exatos[0] };
  const lista = (exatos.length ? exatos : candidatos)
    .map(c => ({ ...c, pontos: c.exato ? 1 : pontuar(termo, c.texto) }))
    .filter(c => c.pontos >= MINIMO)
    .sort((a, b) => b.pontos - a.pontos || String(a.rotulo).localeCompare(String(b.rotulo), 'pt-BR'));
  if (!lista.length) return { nenhum: true };
  if (lista.length === 1 || lista[0].pontos - lista[1].pontos >= FOLGA) return { unico: lista[0] };
  const empatados = lista.filter(c => lista[0].pontos - c.pontos < FOLGA).slice(0, maximo);
  return { varios: empatados };
}

// ── Consultas ───────────────────────────────────────────────────────────
// "OB-2026-003", "2026-003" ou "003" → código exato
function codigoDeObra(termo) {
  const m = normalizar(termo).match(/(?:ob\s*-?\s*)?(\d{4})\s*-\s*(\d{1,4})\b/);
  return m ? `OB-${m[1]}-${m[2].padStart(3, '0')}` : null;
}

async function buscarObras(termo, db = pool) {
  const { rows } = await db.query(
    `SELECT id, codigo, nome, cliente_nome, local, status FROM obras WHERE status IS DISTINCT FROM 'cancelada' ORDER BY atualizado_em DESC NULLS LAST, id DESC LIMIT 2000`);
  const codigo = codigoDeObra(termo);
  return escolher(termo, rows.map(o => ({
    id: o.id, rotulo: `${o.codigo} — ${o.nome}${o.cliente_nome ? ` (${o.cliente_nome})` : ''}`,
    texto: `${o.codigo} ${o.nome} ${o.cliente_nome || ''} ${o.local || ''}`, exato: !!codigo && o.codigo.toUpperCase() === codigo, registro: o,
  })));
}

// "P254", "p 254", "254" → número da proposta
function numeroDeProposta(termo) {
  const m = normalizar(termo).match(/^(?:p\s*-?\s*)?(\d{1,6})$/);
  return m ? `P${m[1]}` : null;
}

async function buscarPropostas(termo, db = pool) {
  const numero = numeroDeProposta(termo);
  if (numero) {
    // número com ou sem zeros à esquerda ("P45" × "P045")
    const { rows } = await db.query(
      `SELECT p.id, p.numero, p.cliente_nome, p.status, p.total, p.cliente_id FROM propostas p
        WHERE upper(p.numero) = $1 OR regexp_replace(upper(p.numero), '^P0+', 'P') = regexp_replace($1, '^P0+', 'P')
        ORDER BY p.id DESC LIMIT 5`, [numero]);
    if (rows.length === 1) return { unico: { id: rows[0].id, rotulo: rotuloProposta(rows[0]), registro: rows[0] } };
    if (rows.length > 1) return { varios: rows.map(p => ({ id: p.id, rotulo: rotuloProposta(p), registro: p })) };
    return { nenhum: true };
  }
  const { rows } = await db.query(
    `SELECT p.id, p.numero, p.cliente_nome, p.status, p.total, p.cliente_id, p.local_obra FROM propostas p
      WHERE p.status IN ('Ativa', 'Aprovada') ORDER BY p.id DESC LIMIT 2000`);
  return escolher(termo, rows.map(p => ({ id: p.id, rotulo: rotuloProposta(p), texto: `${p.numero} ${p.cliente_nome || ''} ${p.local_obra || ''}`, registro: p })));
}
const rotuloProposta = (p) => `${p.numero} — ${p.cliente_nome || 'sem cliente'} (${p.status})`;

async function buscarClientes(termo, db = pool) {
  const { rows } = await db.query(`SELECT id, nome, email, email_nota FROM clientes WHERE ativo IS NOT FALSE ORDER BY nome LIMIT 5000`);
  return escolher(termo, rows.map(c => ({ id: c.id, rotulo: c.nome, texto: c.nome, registro: c })));
}

module.exports = { normalizar, palavras, pontuar, escolher, distancia, codigoDeObra, numeroDeProposta, buscarObras, buscarPropostas, buscarClientes };
