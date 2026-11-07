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
// Revisão de 06/11/2026 (migração 2.0-53): cada PROJETO dá um voto por chave (services/votosAprendizado.js) — reler o
// mesmo desenho não soma, a maioria resolve o conflito e a confirmação do engenheiro vence; "não é ponto" confirmado
// também se aprende (simbolo '?', chave "NP|…", por disciplina e escritório — services/mapaCad.js), como sugestão.
//
//   carregar()            → [{ layer, medida, fracao, simbolo, disciplina, altura_m, texto, usuario?, escritorio?, porMedida?, em }]
//                           (usuario: conferido na tela do mapa do CAD) só as chaves sem conflito (ou conferidas pelo usuário)
//   carregarNaoPonto()    → as formas que o engenheiro disse "não é ponto" [{ layer, medida, fracao, escritorio, disciplina, porMedida, em }]
//   registrar(legenda, arquivo, executor, { fonte, escritorio }) → o voto deste projeto nas linhas lidas
//                           (ver pontosDoDesenho.legendaDoProjeto); a linha desenhada na escala da planta vale também pela medida
//   votarSimbolo / retirarVoto → a confirmação (ou o desfazer) do mapa do CAD (services/mapaCad.js)
//   exportar() / validarBiblioteca() / importar() → a biblioteca em JSON, para levar de uma instalação para outra
const pool = require('../config/database');
const votos = require('./votosAprendizado');

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
// a opinião de um voto: o tipo e a altura
const valorDe = (simbolo, altura) => `${simbolo}|${Number(altura) > 0 ? Number(altura).toFixed(2) : ''}`;

const deLinha = (r) => ({
  layer: r.layer, medida: r.medida.map(Number), fracao: Number(r.fracao), simbolo: r.simbolo, disciplina: r.disciplina,
  ...(r.altura_m != null ? { altura_m: Number(r.altura_m) } : {}), texto: r.texto || '',
  ...(r.origem === 'usuario' ? { usuario: true } : {}),
  ...(r.escritorio ? { escritorio: r.escritorio } : {}), ...(r.por_medida ? { porMedida: true } : {}),
  ...(r.atualizado_em ? { em: new Date(r.atualizado_em).getTime() } : {}),
});

async function carregar(executor = pool) {
  try {
    // a confirmação do engenheiro primeiro: o limite não pode cortar justo o que é certo
    const { rows } = await executor.query(
      `SELECT layer, medida, fracao, simbolo, disciplina, altura_m, texto, origem, escritorio, por_medida, atualizado_em FROM cad_simbolos_aprendidos
        WHERE (origem = 'usuario' OR conflitos = 0) AND simbolo <> '?' ORDER BY (origem = 'usuario') DESC, vezes DESC LIMIT 2000`);
    return rows.map(deLinha);
  } catch (e) {
    // banco antigo (sem a tabela ou sem a migração 2.0-43) ou fora do ar: a leitura segue só com a legenda do desenho
    console.warn('[simbolosAprendidos] sem aprendizado nesta leitura:', e.message);
    return [];
  }
}

async function carregarNaoPonto(executor = pool) {
  try {
    const { rows } = await executor.query(
      `SELECT layer, medida, fracao, simbolo, disciplina, altura_m, texto, origem, escritorio, por_medida, atualizado_em FROM cad_simbolos_aprendidos
        WHERE (origem = 'usuario' OR conflitos = 0) AND simbolo = '?' ORDER BY atualizado_em DESC LIMIT 2000`);
    return rows.map(r => ({ ...deLinha(r), disciplina: r.disciplina || '', escritorio: r.escritorio || '' }));
  } catch (e) {
    console.warn('[simbolosAprendidos] sem "não é ponto" aprendido nesta leitura:', e.message);
    return [];
  }
}

// ── votos (services/votosAprendizado.js): a linha da tabela é a apuração ──
const linhaParaDados = (r) => ({
  layer: r.layer, medida: (r.medida || []).map(Number), fracao: Number(r.fracao || 0), simbolo: r.simbolo, disciplina: r.disciplina || null,
  altura_m: r.altura_m != null ? Number(r.altura_m) : null, texto: r.texto || '', escritorio: r.escritorio || '', por_medida: !!r.por_medida, arquivo: r.arquivo || '',
});
const legadoDe = (executor, chave) => async () => {
  const { rows: [r] } = await executor.query('SELECT * FROM cad_simbolos_aprendidos WHERE chave = $1', [chave]);
  if (!r) return [];
  return [{ valor: valorDe(r.simbolo, r.altura_m), origem: r.origem, peso: r.vezes, dados: linhaParaDados(r) },
    ...(r.conflitos > 0 && r.origem !== 'usuario' ? [{ valor: votos.CONFLITO_LEGADO, origem: 'legenda', peso: r.conflitos, dados: {} }] : [])];
};
async function aplicar(executor, chave) {
  const d = await votos.apurar(executor, 'simbolo', chave);
  if (!d) {
    await executor.query('DELETE FROM cad_simbolos_aprendidos WHERE chave = $1', [chave]);
    return null;
  }
  const x = d.dados || {};
  if (!x.simbolo || !Array.isArray(x.medida) || !x.layer) { // só conflito antigo, sem opinião conhecida: continua fora de uso
    await executor.query('UPDATE cad_simbolos_aprendidos SET conflitos = GREATEST(conflitos, 1), atualizado_em = NOW() WHERE chave = $1', [chave]);
    return d;
  }
  await executor.query(
    `INSERT INTO cad_simbolos_aprendidos (chave, layer, medida, fracao, simbolo, disciplina, altura_m, texto, origem, vezes, conflitos, arquivo, escritorio, por_medida)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (chave) DO UPDATE SET layer = EXCLUDED.layer, medida = EXCLUDED.medida, fracao = EXCLUDED.fracao, simbolo = EXCLUDED.simbolo,
       disciplina = EXCLUDED.disciplina, altura_m = EXCLUDED.altura_m, texto = EXCLUDED.texto, origem = EXCLUDED.origem, vezes = EXCLUDED.vezes,
       conflitos = EXCLUDED.conflitos, arquivo = EXCLUDED.arquivo, escritorio = EXCLUDED.escritorio, por_medida = EXCLUDED.por_medida, atualizado_em = NOW()`,
    [chave, String(x.layer).slice(0, 120), x.medida.map(r3), r3(x.fracao || 0), String(x.simbolo).slice(0, 40), x.disciplina || null,
      Number(x.altura_m) > 0 ? Number(x.altura_m) : null, String(x.texto || '').slice(0, 200), d.usuario ? 'usuario' : 'legenda', d.vezes, d.conflitos,
      String(x.arquivo || '').slice(0, 200), String(x.escritorio || '').slice(0, 120), !!x.por_medida]);
  return d;
}

// o voto de um projeto numa chave (dados: a linha que ele ensina) e a linha da tabela refeita
async function votarSimbolo(executor, chave, { fonte, origem, dados }) {
  await votos.votar(executor, { tipo: 'simbolo', chave, fonte, valor: valorDe(dados.simbolo, dados.altura_m), origem, dados, legado: legadoDe(executor, chave) });
  return aplicar(executor, chave);
}
// desfazer: tira o voto deste projeto, se ele ainda diz o mesmo tipo e altura
async function retirarVoto(executor, chave, { fonte, simbolo, altura_m, origem = 'usuario' }) {
  const n = await votos.retirar(executor, { tipo: 'simbolo', chave, fonte, valor: valorDe(simbolo, altura_m), origem });
  if (n) await aplicar(executor, chave);
  return n;
}

// grava as linhas da legenda lidas num arquivo: o voto deste projeto (fonte) em cada chave. Mesmo tipo e altura em outro
// projeto reforça; outro tipo ou altura diverge — vale a maioria (3+ projetos, 2/3 deles) ou a chave sai do uso até o
// usuário conferir: o sistema não "aprende" o que se contradiz. A linha da legenda desenhada na escala da planta
// (escalaDePlanta: services/analiseCad/aprendidoNoDesenho.js) vale também pela medida real e pelo escritório (lacuna
// 16 da revisão: "EL-Tomadas" com 13 linhas da mesma família e alturas diferentes era ambígua só pela proporção).
async function registrar(legenda, arquivo, executor = pool, { fonte = null, escritorio = '' } = {}) {
  const vistas = new Set();
  let gravadas = 0;
  const quem = fonte || `arquivo:${String(arquivo || '')}`;
  for (const l of legenda || []) {
    if (!l?.layer || !Array.isArray(l.medida) || !(l.medida[0] > 0) || !l.simbolo || l.simbolo === '?') continue;
    const chaves = [[chaveDe(l), false], ...(l.escalaDePlanta ? [[chaveComMedida(l, escritorio), true]] : [])];
    for (const [chave, porMedida] of chaves) {
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      try {
        await votarSimbolo(executor, chave, {
          fonte: quem, origem: 'legenda',
          dados: {
            layer: String(l.layer).slice(0, 120), medida: porMedida ? [...l.medida].map(Number).sort((a, b) => b - a) : l.medida.map(Number), fracao: Number(l.fracao || 0),
            simbolo: l.simbolo, disciplina: l.disciplina || null, altura_m: Number(l.altura_m) > 0 ? Number(l.altura_m) : null, texto: String(l.texto || '').slice(0, 200),
            escritorio: porMedida ? String(escritorio || '').slice(0, 120) : '', por_medida: porMedida, arquivo: String(arquivo || '').slice(0, 200),
          },
        });
        if (!porMedida) gravadas++;
      } catch (e) { console.warn('[simbolosAprendidos] linha da legenda não gravada:', e.message); }
    }
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
      WHERE (origem = 'usuario' OR conflitos = 0) AND simbolo <> '?' ORDER BY layer, simbolo, id`);
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

// Grava as linhas importadas, como o voto da biblioteca (fonte 'biblioteca:<arquivo>'). O que esta instalação já tem
// conferido pelo usuário NÃO é trocado por uma linha de legenda importada (a confirmação vence a legenda na apuração);
// a linha importada conferida pelo usuário vale como conferida. Devolve { gravadas, mantidas }.
async function importar(linhas, arquivo = 'biblioteca importada', executor = pool) {
  let gravadas = 0, mantidas = 0;
  for (const l of linhas) {
    const chave = l.por_medida ? chaveComMedida(l, l.escritorio) : chaveDe(l);
    const d = await votarSimbolo(executor, chave, {
      fonte: `biblioteca:${String(arquivo).slice(0, 200)}`, origem: l.origem === 'usuario' ? 'usuario' : 'legenda',
      dados: { layer: l.layer, medida: l.medida, fracao: l.fracao, simbolo: l.simbolo, disciplina: l.disciplina, altura_m: l.altura_m, texto: l.texto,
        escritorio: l.escritorio, por_medida: l.por_medida, arquivo: String(arquivo).slice(0, 200) },
    });
    if (d && d.valor === valorDe(l.simbolo, l.altura_m)) gravadas++; else mantidas++;
  }
  return { gravadas, mantidas };
}

module.exports = { carregar, carregarNaoPonto, registrar, votarSimbolo, retirarVoto, aplicar, valorDe, chaveDe, chaveComMedida, exportar, importar, validarBiblioteca, FORMATO };
