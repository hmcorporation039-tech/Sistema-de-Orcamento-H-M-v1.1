// O que o sistema aprendeu das legendas das pranchas (models/migracoes/2.0-23-aprendizado.js).
// Cada projeto analisado ensina: a linha da legenda "Tomada alta a 2,20m do piso" ao lado
// do triângulo cheio da layer EL-Tomadas vira conhecimento do sistema. No próximo desenho,
// a prancha sem legenda (outro pavimento, outro arquivo do mesmo escritório) é lida pelo
// que já foi aprendido — sem IA nem serviço de fora.
//
// Biblioteca de blocos (fase 3, CAD-08 — migração 2.0-43): a confirmação do Mapa do CAD vale pela
// MEDIDA real (DWG/DXF estão em tamanho real) e guarda o escritório do carimbo. Antes a chave era só
// a proporção: a tomada de 20 cm e o quadro de 40 cm (dois quadrados) caíam na mesma linha, e a
// confirmação mais recente apagava a outra.
//
//   carregar()            → [{ layer, medida, fracao, simbolo, disciplina, altura_m, texto, usuario?, escritorio?, porMedida? }]
//                           (usuario: conferido na tela do mapa do CAD) só as chaves sem conflito (ou conferidas pelo usuário)
//   registrar(legenda, arquivo) → grava/reforça as linhas lidas (ver pontosDoDesenho.legendaDoProjeto)
//   exportar() / validarBiblioteca() / importar() → a biblioteca em JSON, para levar de uma instalação para outra
const pool = require('../config/database');

const r3 = (v) => Math.round(Number(v) * 1000) / 1000;
// a forma do símbolo, sem a escala: proporção (lado menor ÷ maior) e preenchimento — a legenda lida do
// desenho (a amostra da legenda pode estar noutra escala) e o PDF sem escala confiável
const chaveDe = (l) => `${String(l.layer).toUpperCase().slice(0, 120)}|${(l.medida[1] / l.medida[0]).toFixed(2)}|${Number(l.fracao || 0).toFixed(2)}`;
// a forma em tamanho real (confirmação do mapa de DWG/DXF): medida a 2 cm e o escritório do carimbo
const a2cm = (v) => (Math.round(Number(v) / 0.02) * 0.02).toFixed(2);
function chaveComMedida(l, escritorio = '') {
  const [a, b] = [...l.medida].map(Number).sort((x, y) => y - x);
  return `${String(l.layer).toUpperCase().slice(0, 120)}|${a2cm(a)}x${a2cm(b)}|${Number(l.fracao || 0).toFixed(2)}|${String(escritorio || '').slice(0, 120)}`;
}

const deLinha = (r) => ({
  layer: r.layer, medida: r.medida.map(Number), fracao: Number(r.fracao), simbolo: r.simbolo, disciplina: r.disciplina,
  ...(r.altura_m != null ? { altura_m: Number(r.altura_m) } : {}), texto: r.texto || '',
  ...(r.origem === 'usuario' ? { usuario: true } : {}),
  ...(r.escritorio ? { escritorio: r.escritorio } : {}), ...(r.por_medida ? { porMedida: true } : {}),
});

async function carregar(executor = pool) {
  try {
    const { rows } = await executor.query(
      `SELECT layer, medida, fracao, simbolo, disciplina, altura_m, texto, origem, escritorio, por_medida FROM cad_simbolos_aprendidos
        WHERE origem = 'usuario' OR conflitos = 0 ORDER BY vezes DESC LIMIT 2000`);
    return rows.map(deLinha);
  } catch (e) {
    // banco antigo (sem a tabela ou sem a migração 2.0-43) ou fora do ar: a leitura segue só com a legenda do desenho
    console.warn('[simbolosAprendidos] sem aprendizado nesta leitura:', e.message);
    return [];
  }
}

// grava as linhas da legenda lidas num arquivo. Mesma chave com o mesmo tipo e altura:
// reforça (vezes + 1). Com outro tipo ou altura: conta conflito (a chave sai do uso até
// o usuário conferir) — o sistema não "aprende" o que se contradiz.
async function registrar(legenda, arquivo, executor = pool) {
  const vistas = new Set();
  let gravadas = 0;
  for (const l of legenda || []) {
    if (!l?.layer || !Array.isArray(l.medida) || !(l.medida[0] > 0) || !l.simbolo) continue;
    const chave = chaveDe(l);
    if (vistas.has(chave)) continue;
    vistas.add(chave);
    try {
      await executor.query(
        `INSERT INTO cad_simbolos_aprendidos (chave, layer, medida, fracao, simbolo, disciplina, altura_m, texto, arquivo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (chave) DO UPDATE SET
           vezes = cad_simbolos_aprendidos.vezes + CASE WHEN cad_simbolos_aprendidos.simbolo = EXCLUDED.simbolo
             AND cad_simbolos_aprendidos.altura_m IS NOT DISTINCT FROM EXCLUDED.altura_m THEN 1 ELSE 0 END,
           conflitos = cad_simbolos_aprendidos.conflitos + CASE WHEN cad_simbolos_aprendidos.origem <> 'usuario'
             AND (cad_simbolos_aprendidos.simbolo <> EXCLUDED.simbolo OR cad_simbolos_aprendidos.altura_m IS DISTINCT FROM EXCLUDED.altura_m) THEN 1 ELSE 0 END,
           atualizado_em = NOW()`,
        [chave, String(l.layer).slice(0, 120), l.medida.map(r3), r3(l.fracao || 0), l.simbolo, l.disciplina || null,
          Number(l.altura_m) > 0 ? Number(l.altura_m) : null, String(l.texto || '').slice(0, 200), String(arquivo || '').slice(0, 200)]);
      gravadas++;
    } catch (e) { console.warn('[simbolosAprendidos] linha da legenda não gravada:', e.message); }
  }
  return gravadas;
}

// ── Biblioteca exportável (levar de uma instalação para outra) ─────────────
// Formato: { formato: 'hm-biblioteca-blocos', versao: 1, exportado_em, linhas: [{ layer, medida: [maior, menor] (m),
// fracao, simbolo, disciplina, altura_m, texto, origem ('legenda'|'usuario'), escritorio, por_medida, vezes }] }.
// Só o que serve para reconhecer símbolo: nada do projeto (nem o nome do arquivo de onde veio).
const FORMATO = 'hm-biblioteca-blocos';
async function exportar(executor = pool) {
  const { rows } = await executor.query(
    `SELECT layer, medida, fracao, simbolo, disciplina, altura_m, texto, origem, escritorio, por_medida, vezes FROM cad_simbolos_aprendidos
      WHERE origem = 'usuario' OR conflitos = 0 ORDER BY layer, simbolo, id`);
  return {
    formato: FORMATO, versao: 1, exportado_em: new Date().toISOString(),
    linhas: rows.map(r => ({
      layer: r.layer, medida: r.medida.map(Number), fracao: Number(r.fracao), simbolo: r.simbolo, disciplina: r.disciplina || null,
      altura_m: r.altura_m != null ? Number(r.altura_m) : null, texto: r.texto || '', origem: r.origem, escritorio: r.escritorio || '',
      por_medida: !!r.por_medida, vezes: Number(r.vezes) || 1,
    })),
  };
}

// Confere o JSON antes de gravar. Devolve { linhas válidas, erros: [texto] }. `simbolosValidos`: Set dos tipos do 3D
function validarBiblioteca(json, simbolosValidos) {
  const erros = [];
  if (!json || json.formato !== FORMATO || !Array.isArray(json.linhas)) return { linhas: [], erros: [`o arquivo não é uma biblioteca de blocos (formato "${FORMATO}")`] };
  if (json.linhas.length > 5000) return { linhas: [], erros: ['biblioteca grande demais (máximo de 5.000 linhas)'] };
  const linhas = [];
  json.linhas.forEach((l, i) => {
    const m = Array.isArray(l?.medida) ? l.medida.map(Number) : [];
    if (!l || typeof l.layer !== 'string' || !l.layer.trim()) return erros.push(`linha ${i + 1}: sem layer`);
    if (m.length !== 2 || !m.every(v => v > 0 && v < 50)) return erros.push(`linha ${i + 1}: medida inválida`);
    if (!simbolosValidos.has(l.simbolo)) return erros.push(`linha ${i + 1}: tipo "${String(l.simbolo).slice(0, 40)}" não existe`);
    const f = Number(l.fracao || 0);
    if (!(f >= 0 && f <= 1)) return erros.push(`linha ${i + 1}: preenchimento inválido`);
    const h = l.altura_m == null || l.altura_m === '' ? null : Number(l.altura_m);
    if (h != null && !(h > 0 && h <= 15)) return erros.push(`linha ${i + 1}: altura inválida`);
    linhas.push({
      layer: l.layer.trim().slice(0, 120), medida: m.sort((a, b) => b - a), fracao: f, simbolo: l.simbolo,
      disciplina: l.disciplina ? String(l.disciplina).slice(0, 40) : null, altura_m: h, texto: String(l.texto || '').slice(0, 200),
      origem: l.origem === 'usuario' ? 'usuario' : 'legenda', escritorio: String(l.escritorio || '').slice(0, 120), por_medida: l.por_medida === true,
    });
  });
  return { linhas, erros };
}

// Grava as linhas importadas. O que esta instalação já tem conferido pelo usuário NÃO é sobrescrito por uma
// linha de legenda importada; a linha importada conferida pelo usuário vale como conferida. Devolve { gravadas, mantidas }.
async function importar(linhas, arquivo = 'biblioteca importada', executor = pool) {
  let gravadas = 0, mantidas = 0;
  for (const l of linhas) {
    const chave = l.por_medida ? chaveComMedida(l, l.escritorio) : chaveDe(l);
    const r = await executor.query(
      `INSERT INTO cad_simbolos_aprendidos (chave, layer, medida, fracao, simbolo, disciplina, altura_m, texto, origem, arquivo, escritorio, por_medida)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (chave) DO UPDATE SET simbolo = EXCLUDED.simbolo, disciplina = EXCLUDED.disciplina, altura_m = EXCLUDED.altura_m,
         texto = EXCLUDED.texto, origem = EXCLUDED.origem, conflitos = 0, arquivo = EXCLUDED.arquivo, atualizado_em = NOW()
       WHERE cad_simbolos_aprendidos.origem <> 'usuario' OR EXCLUDED.origem = 'usuario'`,
      [chave, l.layer, l.medida.map(r3), r3(l.fracao), l.simbolo, l.disciplina, l.altura_m, l.texto, l.origem, String(arquivo).slice(0, 200), l.escritorio, l.por_medida]);
    if (r.rowCount) gravadas++; else mantidas++;
  }
  return { gravadas, mantidas };
}

module.exports = { carregar, registrar, chaveDe, chaveComMedida, exportar, importar, validarBiblioteca, FORMATO };
