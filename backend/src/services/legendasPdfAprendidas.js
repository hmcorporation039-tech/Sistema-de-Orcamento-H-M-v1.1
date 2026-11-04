// Legenda de prancha em PDF aprendida por escritório (versão 2.30 — models/migracoes/2.0-51-legendas-pdf-aprendidas.js).
//   registrar(paginas, { escritorio, arquivo, disciplina }) → as linhas de legenda das folhas (utils/pdfVetorial:
//       p.legendaPropria) e as notas de altura do texto do PDF viram aprendizado. Devolve { legendas, notas }.
//   carregar(escritorio)  → [{ texto, sig }] da legenda que pode ser usada (sem conflito) para lerPdfVetorial
//       (legendaAprendida): só do MESMO escritório — o tamanho do símbolo no papel é costume de quem plota.
// O que vem daqui é sugestão: o símbolo contado pela legenda aprendida sai "a conferir" (fora do orçamento).
const path = require('path');
const crypto = require('crypto');
const pool = require('../config/database');
const { CAD } = require('../config/caminhos');
const { tipoPeloTexto, alturaEscrita, tomadaPelaAltura } = require(path.join(CAD, 'tiposDePonto.js'));
const { notasDeAltura } = require(path.join(CAD, 'pontosDoDesenho.js'));
const notasAprendidas = require('./notasAprendidas');

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

async function registrar(paginas, { escritorio = '', arquivo = '', disciplina = null, textoDasNotas = '' } = {}, executor = pool) {
  let legendas = 0, notas = 0;
  if (!escritorio) return { legendas, notas }; // sem responsável no carimbo não há de quem aprender
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
        // mesmo tipo (ou os dois sem tipo e o mesmo texto): reforça; tipo diferente: conflito (sai do uso)
        await executor.query(
          `INSERT INTO pdf_legendas_aprendidas (chave, escritorio, assinatura, texto, simbolo, disciplina, altura_m, arquivo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (chave) DO UPDATE SET
             vezes = pdf_legendas_aprendidas.vezes + 1,
             conflitos = pdf_legendas_aprendidas.conflitos + CASE WHEN COALESCE(pdf_legendas_aprendidas.simbolo, pdf_legendas_aprendidas.texto) IS DISTINCT FROM COALESCE(EXCLUDED.simbolo, EXCLUDED.texto) THEN 1 ELSE 0 END,
             arquivo = EXCLUDED.arquivo, atualizado_em = NOW()`,
          [chave, escritorio.slice(0, 120), JSON.stringify(k.sig), k.texto.slice(0, 300), t.simbolo, t.disciplina || disciplina, t.altura_m, String(arquivo).slice(0, 300)]);
        legendas++;
      } catch (e) { console.warn('[legendasPdf] linha não aprendida:', e.message); }
    }
  }
  // notas gerais de altura no texto da prancha ("TOMADAS BAIXAS A 0,30 M DO PISO, SALVO INDICAÇÃO"): o mesmo
  // aprendizado das notas do DWG (services/notasAprendidas.js), por escritório
  if (textoDasNotas) {
    const linhas = String(textoDasNotas).split(/\r?\n/).map(s => s.trim()).filter(s => s.length >= 8 && s.length <= 300).slice(0, 4000);
    const lidas = notasDeAltura({ notas: linhas.map(s => ({ s })) });
    if (lidas.length) notas = await notasAprendidas.registrar(lidas, escritorio, arquivo, executor).catch(() => 0);
  }
  return { legendas, notas };
}

async function carregar(escritorio, executor = pool) {
  if (!escritorio) return [];
  try {
    const { rows } = await executor.query(
      `SELECT texto, assinatura FROM pdf_legendas_aprendidas WHERE escritorio = $1 AND conflitos = 0 ORDER BY vezes DESC, atualizado_em DESC LIMIT $2`,
      [escritorio, MAX_POR_ESCRITORIO]);
    return rows.map(r => ({ texto: r.texto, sig: r.assinatura }));
  } catch (e) {
    console.warn('[legendasPdf] sem legenda aprendida nesta leitura:', e.message); // banco antigo (sem a tabela) ou fora do ar
    return [];
  }
}

module.exports = { registrar, carregar, chaveDaAssinatura, tipoDaLegenda };
