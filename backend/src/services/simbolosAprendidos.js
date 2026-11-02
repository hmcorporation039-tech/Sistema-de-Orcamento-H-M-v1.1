// O que o sistema aprendeu das legendas das pranchas (models/migracoes/2.0-23-aprendizado.js).
// Cada projeto analisado ensina: a linha da legenda "Tomada alta a 2,20m do piso" ao lado
// do triângulo cheio da layer EL-Tomadas vira conhecimento do sistema. No próximo desenho,
// a prancha sem legenda (outro pavimento, outro arquivo do mesmo escritório) é lida pelo
// que já foi aprendido — sem IA nem serviço de fora.
//
//   carregar()            → [{ layer, medida, fracao, simbolo, disciplina, altura_m, texto, usuario? }] (usuario: conferido na tela do mapa do CAD)
//                           só as chaves sem conflito (ou conferidas pelo usuário)
//   registrar(legenda, arquivo) → grava/reforça as linhas lidas (ver pontosDoDesenho.legendaDoProjeto)
const pool = require('../config/database');

const r3 = (v) => Math.round(Number(v) * 1000) / 1000;
// a forma do símbolo, sem a escala: proporção (lado menor ÷ maior) e preenchimento
const chaveDe = (l) => `${String(l.layer).toUpperCase().slice(0, 120)}|${(l.medida[1] / l.medida[0]).toFixed(2)}|${Number(l.fracao || 0).toFixed(2)}`;

async function carregar(executor = pool) {
  try {
    const { rows } = await executor.query(
      `SELECT layer, medida, fracao, simbolo, disciplina, altura_m, texto, origem FROM cad_simbolos_aprendidos
        WHERE origem = 'usuario' OR conflitos = 0 ORDER BY vezes DESC LIMIT 2000`);
    return rows.map(r => ({
      layer: r.layer, medida: r.medida.map(Number), fracao: Number(r.fracao), simbolo: r.simbolo, disciplina: r.disciplina,
      ...(r.altura_m != null ? { altura_m: Number(r.altura_m) } : {}), texto: r.texto || '',
      ...(r.origem === 'usuario' ? { usuario: true } : {}),
    }));
  } catch (e) {
    // banco antigo (sem a tabela) ou fora do ar: a leitura segue só com a legenda do desenho
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

module.exports = { carregar, registrar, chaveDe };
