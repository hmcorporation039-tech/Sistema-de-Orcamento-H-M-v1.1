// O que o sistema aprendeu das NOTAS dos desenhos e das alturas conferidas na tela do mapa do CAD
// (models/migracoes/2.0-29-notas-aprendidas.js, item 8 do plano). Por escritório (responsável técnico do carimbo):
//   carregar()                          → [{ escritorio, simbolo, altura_m, texto, usuario? }] só do que pode ser usado:
//                                         conferido pelo engenheiro, ou lido em 2+ desenhos sem contradição
//   registrar(notas, escritorio, arquivo) → grava/reforça as notas gerais de altura lidas (pontosDoDesenho.notasDeAltura)
//   aprenderConfirmadas / esquecer      → as alturas que o engenheiro confirmou (ou desfez) no mapa
// É sempre sugestão: o tipo e a altura só contam no orçamento depois de confirmados.
const pool = require('../config/database');

async function carregar(executor = pool) {
  try {
    const { rows } = await executor.query(
      `SELECT escritorio, simbolo, altura_m, texto, origem FROM cad_notas_aprendidas
        WHERE origem = 'usuario' OR (conflitos = 0 AND vezes >= 2) ORDER BY vezes DESC LIMIT 2000`);
    return rows.map(r => ({ escritorio: r.escritorio, simbolo: r.simbolo, altura_m: Number(r.altura_m), texto: r.texto || '', ...(r.origem === 'usuario' ? { usuario: true } : {}) }));
  } catch (e) {
    console.warn('[notasAprendidas] sem notas aprendidas nesta leitura:', e.message); // banco antigo (sem a tabela) ou fora do ar
    return [];
  }
}

// Mesma nota e mesma altura em outro arquivo reforça (vezes + 1); outra altura conta conflito (sai do uso até alguém conferir)
async function registrar(notas, escritorio, arquivo, executor = pool) {
  let gravadas = 0;
  if (!escritorio) return 0; // sem responsável no carimbo não há de quem aprender
  const vistos = new Set();
  for (const n of notas || []) {
    if (!n?.simbolo || !(Number(n.altura_m) > 0) || vistos.has(n.simbolo)) continue;
    vistos.add(n.simbolo);
    try {
      await executor.query(
        `INSERT INTO cad_notas_aprendidas (escritorio, simbolo, altura_m, texto, arquivo) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (escritorio, simbolo) DO UPDATE SET
           vezes = cad_notas_aprendidas.vezes + CASE WHEN cad_notas_aprendidas.altura_m = EXCLUDED.altura_m AND cad_notas_aprendidas.arquivo IS DISTINCT FROM EXCLUDED.arquivo THEN 1 ELSE 0 END,
           conflitos = cad_notas_aprendidas.conflitos + CASE WHEN cad_notas_aprendidas.origem <> 'usuario' AND cad_notas_aprendidas.altura_m <> EXCLUDED.altura_m AND cad_notas_aprendidas.arquivo IS DISTINCT FROM EXCLUDED.arquivo THEN 1 ELSE 0 END,
           arquivo = EXCLUDED.arquivo,
           atualizado_em = NOW()`,
        [escritorio, n.simbolo, Number(n.altura_m), String(n.texto || '').slice(0, 200), String(arquivo || '').slice(0, 200)]);
      gravadas++;
    } catch (e) { console.warn('[notasAprendidas] nota não gravada:', e.message); }
  }
  return gravadas;
}

// linhas do mapa confirmadas com altura (services/mapaCad.aplicarNoMapa → alteradas): a altura que o engenheiro
// deu a esse TIPO de ponto vale para o escritório, em qualquer layer
async function aprenderConfirmadas(alteradas, escritorio, arquivo, executor = pool) {
  let gravadas = 0;
  const porTipo = new Map();
  for (const { depois: s, desfeita } of alteradas) {
    if (desfeita || !s.confirmado || !s.simbolo || s.simbolo === '?' || !(s.altura_m > 0)) continue;
    porTipo.set(s.simbolo, s);
  }
  for (const [simbolo, s] of porTipo) {
    try {
      await executor.query(
        `INSERT INTO cad_notas_aprendidas (escritorio, simbolo, altura_m, texto, origem, arquivo) VALUES ($1, $2, $3, $4, 'usuario', $5)
         ON CONFLICT (escritorio, simbolo) DO UPDATE SET altura_m = EXCLUDED.altura_m, texto = EXCLUDED.texto, origem = 'usuario', conflitos = 0, arquivo = EXCLUDED.arquivo,
           vezes = cad_notas_aprendidas.vezes + CASE WHEN cad_notas_aprendidas.origem = 'usuario' AND cad_notas_aprendidas.altura_m = EXCLUDED.altura_m THEN 1 ELSE 0 END,
           atualizado_em = NOW()`,
        [escritorio || '', simbolo, s.altura_m, String(s.rotulo || '').slice(0, 200), String(arquivo || '').slice(0, 200)]);
      gravadas++;
    } catch (e) { console.warn('[notasAprendidas] altura confirmada não gravada:', e.message); }
  }
  return gravadas;
}

// desfazer uma confirmação tira a altura que ela ensinou (só se ainda é a do engenheiro e é a mesma altura)
async function esquecer(alteradas, escritorio, executor = pool) {
  let removidas = 0;
  for (const { antes: s, desfeita } of alteradas) {
    if (!desfeita || !s.simbolo || !(s.altura_m > 0)) continue;
    try {
      const r = await executor.query(`DELETE FROM cad_notas_aprendidas WHERE escritorio = $1 AND simbolo = $2 AND origem = 'usuario' AND altura_m = $3`, [escritorio || '', s.simbolo, s.altura_m]);
      removidas += r.rowCount;
    } catch (e) { console.warn('[notasAprendidas] altura não removida:', e.message); }
  }
  return removidas;
}

module.exports = { carregar, registrar, aprenderConfirmadas, esquecer };
