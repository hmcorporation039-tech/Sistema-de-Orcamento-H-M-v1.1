// Legenda de prancha em PDF aprendida por escritório (versão 2.30 — models/migracoes/2.0-51-legendas-pdf-aprendidas.js).
//   registrar(paginas, { escritorio, arquivo, disciplina, fonte }) → as linhas de legenda das folhas (utils/pdfVetorial:
//       p.legendaPropria) e as notas de altura do texto do PDF viram aprendizado. Devolve { legendas, notas }.
//   carregar(escritorio, executor, { disciplinas }) → [{ texto, sig }] da legenda que pode ser usada (sem conflito) para lerPdfVetorial
//       (legendaAprendida): só do MESMO escritório — o tamanho do símbolo no papel é costume de quem plota.
// O que vem daqui é sugestão: o símbolo contado pela legenda aprendida sai "a conferir" (fora do orçamento).
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/database');
const { CAD } = require('../config/caminhos');
const { tipoPeloTexto, alturaEscrita, tomadaPelaAltura } = require(path.join(CAD, 'tiposDePonto.js'));
const { notasDeAltura } = require(path.join(CAD, 'pontosDoDesenho.js'));
const notasAprendidas = require('./notasAprendidas');
const votos = require('./votosAprendizado');
const { ramoDe } = require('./analiseCad/aprendidoNoDesenho');

const MAX_POR_ESCRITORIO = 400;
const r1 = (v) => Math.round(Number(v) * 2) / 2; // meio ponto (~0,18 mm no papel)

// a chave não muda com o símbolo girado 90° na planta (largura e altura trocadas)
function chaveDaAssinatura(escritorio, sig) {
  const [a, b] = [r1(sig.blob.w), r1(sig.blob.h)].sort((x, y) => y - x);
  const partes = (sig.comps || []).map(c => `${c.chave}:${[r1(c.w), r1(c.h)].sort((x, y) => y - x).join('x')}:${Math.round(c.d)}`).sort().join(',');
  const h = crypto.createHash('sha1').update(partes).digest('hex').slice(0, 12);
  return `${escritorio}|${sig.blob.chave}|${a}x${b}|${(sig.comps || []).length}|${h}`.slice(0, 300);
}

// tipo do ponto pela descrição da legenda ("Tomada baixa 2P+T a 0,30 m do piso" → HM-ELE-TOMADA-BAIXA, 0,30)
function tipoDaLegenda(texto) {
  const t = tipoPeloTexto(texto);
  const h = alturaEscrita(texto);
  if (!t) return { simbolo: null, disciplina: null, altura_m: h > 0 && h <= 15 ? h : null };
  const simbolo = /TOMADA/.test(t[2]) && h > 0 ? tomadaPelaAltura(h) : t[2];
  return { simbolo, disciplina: t[3] || null, altura_m: h > 0 && h <= 15 ? h : null };
}

// a linha da tabela é a apuração dos votos de cada PROJETO (services/votosAprendizado.js): reler o mesmo PDF não soma, a
// maioria (3+ projetos, 2/3 deles) resolve o conflito
const legadoDe = (executor, chave) => async () => {
  const { rows: [r] } = await executor.query('SELECT escritorio, assinatura, texto, simbolo, disciplina, altura_m, vezes, conflitos, arquivo FROM pdf_legendas_aprendidas WHERE chave = $1', [chave]);
  if (!r) return [];
  return [{ valor: r.simbolo || r.texto, origem: 'legenda', peso: r.vezes, dados: { escritorio: r.escritorio, sig: r.assinatura, texto: r.texto, simbolo: r.simbolo, disciplina: r.disciplina, altura_m: r.altura_m != null ? Number(r.altura_m) : null, arquivo: r.arquivo } },
    ...(r.conflitos > 0 ? [{ valor: votos.CONFLITO_LEGADO, origem: 'legenda', peso: r.conflitos, dados: {} }] : [])];
};
async function aplicar(executor, chave) {
  const d = await votos.apurar(executor, 'pdf', chave);
  if (!d) { await executor.query('DELETE FROM pdf_legendas_aprendidas WHERE chave = $1', [chave]); return null; }
  const x = d.dados || {};
  if (!x.sig || !x.texto) {
    await executor.query('UPDATE pdf_legendas_aprendidas SET conflitos = GREATEST(conflitos, 1), atualizado_em = NOW() WHERE chave = $1', [chave]);
    return d;
  }
  await executor.query(
    `INSERT INTO pdf_legendas_aprendidas (chave, escritorio, assinatura, texto, simbolo, disciplina, altura_m, vezes, conflitos, arquivo)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (chave) DO UPDATE SET assinatura = EXCLUDED.assinatura, texto = EXCLUDED.texto, simbolo = EXCLUDED.simbolo, disciplina = EXCLUDED.disciplina,
       altura_m = EXCLUDED.altura_m, vezes = EXCLUDED.vezes, conflitos = EXCLUDED.conflitos, arquivo = EXCLUDED.arquivo, atualizado_em = NOW()`,
    [chave, String(x.escritorio || '').slice(0, 120), JSON.stringify(x.sig), String(x.texto).slice(0, 300), x.simbolo || null, x.disciplina || null,
      Number(x.altura_m) > 0 ? Number(x.altura_m) : null, d.vezes, d.conflitos, String(x.arquivo || '').slice(0, 300)]);
  return d;
}

// fonte: quem ensina — o projeto (obra/análise) ou, sem ela, o nome do arquivo (como era antes)
async function registrar(paginas, { escritorio = '', arquivo = '', disciplina = null, textoDasNotas = '', fonte = null } = {}, executor = pool) {
  let legendas = 0, notas = 0;
  if (!escritorio) return { legendas, notas }; // sem responsável no carimbo não há de quem aprender
  const quem = fonte || `arquivo:${String(arquivo || '')}`;
  const vistas = new Set();
  for (const p of paginas || []) {
    for (const k of p.legendaPropria || []) {
      if (!k?.sig?.blob || !k.texto || k.texto.length < 6) continue;
      const chave = chaveDaAssinatura(escritorio, k.sig);
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      const t = tipoDaLegenda(k.texto);
      // só o que vira um tipo de ponto que o sistema conhece (ensaio com o acervo: a maior parte das linhas sem tipo
      // era de hidráulica e ar-condicionado — válvula, união, dreno — que não são pontos da H&M)
      if (!t.simbolo) continue;
      try {
        // mesmo tipo em outro projeto: reforça; tipo diferente: diverge (vale a maioria, senão sai do uso)
        await votos.votar(executor, {
          tipo: 'pdf', chave, fonte: quem, valor: t.simbolo, origem: 'legenda', legado: legadoDe(executor, chave),
          dados: { escritorio: escritorio.slice(0, 120), sig: k.sig, texto: k.texto.slice(0, 300), simbolo: t.simbolo, disciplina: t.disciplina || disciplina, altura_m: t.altura_m, arquivo: String(arquivo).slice(0, 300) },
        });
        await aplicar(executor, chave);
        legendas++;
      } catch (e) { console.warn('[legendasPdf] linha não aprendida:', e.message); }
    }
  }
  // notas gerais de altura no texto da prancha ("TOMADAS BAIXAS A 0,30 M DO PISO, SALVO INDICAÇÃO"): o mesmo
  // aprendizado das notas do DWG (services/notasAprendidas.js), por escritório
  if (textoDasNotas) {
    const linhas = String(textoDasNotas).split(/\r?\n/).map(s => s.trim()).filter(s => s.length >= 8 && s.length <= 300).slice(0, 4000);
    const lidas = notasDeAltura({ notas: linhas.map(s => ({ s })) });
    if (lidas.length) notas = await notasAprendidas.registrar(lidas, escritorio, arquivo, executor, { fonte: quem }).catch(() => 0);
  }
  return { legendas, notas };
}

// disciplinas (opcional): as marcadas no arquivo — a linha aprendida de outra disciplina não vale sozinha (diretriz de
// 06/11/2026: o aprendizado é por disciplina; o escritório é só preferência)
async function carregar(escritorio, executor = pool, { disciplinas = [] } = {}) {
  if (!escritorio) return [];
  const marcadas = [...new Set((disciplinas || []).flatMap(d => [d, ramoDe(d)]))];
  try {
    const { rows } = await executor.query(
      `SELECT texto, assinatura, disciplina FROM pdf_legendas_aprendidas WHERE escritorio = $1 AND conflitos = 0
          AND ($3::text[] IS NULL OR disciplina IS NULL OR disciplina = ANY($3))
        ORDER BY vezes DESC, atualizado_em DESC LIMIT $2`,
      [escritorio, MAX_POR_ESCRITORIO, marcadas.length ? marcadas : null]);
    return rows.filter(r => !marcadas.length || !r.disciplina || marcadas.includes(ramoDe(r.disciplina))).map(r => ({ texto: r.texto, sig: r.assinatura }));
  } catch (e) {
    console.warn('[legendasPdf] sem legenda aprendida nesta leitura:', e.message); // banco antigo (sem a tabela) ou fora do ar
    return [];
  }
}

module.exports = { registrar, carregar, chaveDaAssinatura, tipoDaLegenda };
