// O que o sistema aprendeu das NOTAS dos desenhos e das alturas conferidas na tela do mapa do CAD
// (models/migracoes/2.0-29-notas-aprendidas.js, item 8 do plano). POR DISCIPLINA (diretriz de 06/11/2026; a coluna
// disciplina é a do tipo de ponto — migração 2.0-53) e por escritório (responsável técnico do carimbo) quando houver:
//   carregar()                          → [{ escritorio, simbolo, altura_m, texto, disciplina, usuario? }] só do que pode
//                                         ser usado: conferido pelo engenheiro, ou lido em 2+ projetos sem contradição
//   registrar(notas, escritorio, arquivo, executor, { fonte }) → o voto deste projeto nas notas gerais de altura lidas
//                                         (pontosDoDesenho.notasDeAltura) — só com escritório no carimbo
//   aprenderConfirmadas / esquecer      → as alturas que o engenheiro confirmou (ou desfez) no mapa; sem escritório no
//                                         carimbo valem pela disciplina (escritório '': services/analiseCad/aprendidoNoDesenho)
// É sempre sugestão: o tipo e a altura só contam no orçamento depois de confirmados.
// Cada PROJETO conta uma vez (services/votosAprendizado.js): "PLANTA ELETRICA.dwg" de duas obras são dois projetos; a
// R01 e a R02 do mesmo projeto, um só. Desfazer tira só o voto deste projeto.
const pool = require('../config/database');
const votos = require('./votosAprendizado');

const alturaTexto = (h) => Number(h).toFixed(2);
const chaveDoVoto = (escritorio, simbolo) => `${escritorio}|${simbolo}`;
const disciplinaDe = (simbolo) => { try { return require('./mapaCad').disciplinaDoSimbolo(simbolo); } catch { return null; } };

async function carregar(executor = pool) {
  try {
    // a confirmação do engenheiro primeiro: o limite não pode cortar justo o que é certo
    const { rows } = await executor.query(
      `SELECT escritorio, simbolo, altura_m, texto, origem, disciplina FROM cad_notas_aprendidas
        WHERE origem = 'usuario' OR (conflitos = 0 AND vezes >= 2) ORDER BY (origem = 'usuario') DESC, vezes DESC LIMIT 2000`);
    return rows.map(r => ({ escritorio: r.escritorio, simbolo: r.simbolo, altura_m: Number(r.altura_m), texto: r.texto || '', disciplina: r.disciplina || disciplinaDe(r.simbolo), ...(r.origem === 'usuario' ? { usuario: true } : {}) }));
  } catch (e) {
    console.warn('[notasAprendidas] sem notas aprendidas nesta leitura:', e.message); // banco antigo (sem a tabela) ou fora do ar
    return [];
  }
}

const legadoDe = (executor, escritorio, simbolo) => async () => {
  const { rows: [r] } = await executor.query('SELECT altura_m, texto, origem, vezes, conflitos, arquivo FROM cad_notas_aprendidas WHERE escritorio = $1 AND simbolo = $2', [escritorio, simbolo]);
  if (!r) return [];
  return [{ valor: alturaTexto(r.altura_m), origem: r.origem, peso: r.vezes, dados: { altura_m: Number(r.altura_m), texto: r.texto, arquivo: r.arquivo } },
    ...(r.conflitos > 0 && r.origem !== 'usuario' ? [{ valor: votos.CONFLITO_LEGADO, origem: 'nota', peso: r.conflitos, dados: {} }] : [])];
};
// a linha da tabela é a apuração dos votos
async function aplicar(executor, escritorio, simbolo) {
  const d = await votos.apurar(executor, 'nota', chaveDoVoto(escritorio, simbolo));
  if (!d) {
    await executor.query('DELETE FROM cad_notas_aprendidas WHERE escritorio = $1 AND simbolo = $2', [escritorio, simbolo]);
    return null;
  }
  if (!(Number(d.dados?.altura_m) > 0)) {
    await executor.query('UPDATE cad_notas_aprendidas SET conflitos = GREATEST(conflitos, 1), atualizado_em = NOW() WHERE escritorio = $1 AND simbolo = $2', [escritorio, simbolo]);
    return d;
  }
  await executor.query(
    `INSERT INTO cad_notas_aprendidas (escritorio, simbolo, altura_m, texto, origem, vezes, conflitos, arquivo, disciplina) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (escritorio, simbolo) DO UPDATE SET altura_m = EXCLUDED.altura_m, texto = EXCLUDED.texto, origem = EXCLUDED.origem, vezes = EXCLUDED.vezes,
       conflitos = EXCLUDED.conflitos, arquivo = EXCLUDED.arquivo, disciplina = EXCLUDED.disciplina, atualizado_em = NOW()`,
    [escritorio, simbolo, Number(d.dados.altura_m), String(d.dados.texto || '').slice(0, 200), d.usuario ? 'usuario' : 'nota', d.vezes, d.conflitos,
      String(d.dados.arquivo || '').slice(0, 200), disciplinaDe(simbolo)]);
  return d;
}

// Mesma nota e mesma altura em outro PROJETO reforça; outra altura diverge (vale a maioria — 3+ projetos e 2/3 deles —
// ou sai do uso até alguém conferir). fonte: a identidade do projeto (sem ela, o nome do arquivo — como era antes).
async function registrar(notas, escritorio, arquivo, executor = pool, { fonte = null } = {}) {
  let gravadas = 0;
  if (!escritorio) return 0; // sem responsável no carimbo não há de quem aprender
  const vistos = new Set();
  for (const n of notas || []) {
    if (!n?.simbolo || !(Number(n.altura_m) > 0) || vistos.has(n.simbolo)) continue;
    vistos.add(n.simbolo);
    try {
      await votos.votar(executor, {
        tipo: 'nota', chave: chaveDoVoto(escritorio, n.simbolo), fonte: fonte || `arquivo:${String(arquivo || '')}`, valor: alturaTexto(n.altura_m), origem: 'nota',
        dados: { altura_m: Number(n.altura_m), texto: String(n.texto || '').slice(0, 200), arquivo: String(arquivo || '').slice(0, 200) }, legado: legadoDe(executor, escritorio, n.simbolo),
      });
      await aplicar(executor, escritorio, n.simbolo);
      gravadas++;
    } catch (e) { console.warn('[notasAprendidas] nota não gravada:', e.message); }
  }
  return gravadas;
}

// linhas do mapa confirmadas com altura (services/mapaCad.aplicarNoMapa → alteradas): a altura que o engenheiro deu a
// esse TIPO de ponto vale para o escritório — ou, sem escritório no carimbo, para a disciplina do tipo —, em qualquer
// layer. fonte: o projeto (obra/análise); confirmar de novo no mesmo projeto não soma.
async function aprenderConfirmadas(alteradas, escritorio, arquivo, executor = pool, { fonte = null } = {}) {
  let gravadas = 0;
  const porTipo = new Map();
  for (const { depois: s, desfeita } of alteradas) {
    if (desfeita || !s.confirmado || !s.simbolo || s.simbolo === '?' || !(s.altura_m > 0)) continue;
    porTipo.set(s.simbolo, s);
  }
  const esc = String(escritorio || '').slice(0, 120);
  for (const [simbolo, s] of porTipo) {
    try {
      await votos.votar(executor, {
        tipo: 'nota', chave: chaveDoVoto(esc, simbolo), fonte: fonte || `arquivo:${String(arquivo || '')}`, valor: alturaTexto(s.altura_m), origem: 'usuario',
        dados: { altura_m: Number(s.altura_m), texto: String(s.rotulo || '').slice(0, 200), arquivo: String(arquivo || '').slice(0, 200) }, legado: legadoDe(executor, esc, simbolo),
      });
      await aplicar(executor, esc, simbolo);
      gravadas++;
    } catch (e) { console.warn('[notasAprendidas] altura confirmada não gravada:', e.message); }
  }
  return gravadas;
}

// Desfazer uma confirmação tira só o voto DESTE projeto (e só se ele ainda é a mesma altura): o que outros projetos
// ensinaram continua — antes apagava a linha inteira. mapa: o mapa depois do desfazer — outra linha do mesmo projeto
// ainda confirmada com esse tipo e essa altura mantém o voto.
async function esquecer(alteradas, escritorio, executor = pool, { fonte = null, arquivo = '', mapa = null } = {}) {
  let removidas = 0;
  const esc = String(escritorio || '').slice(0, 120);
  for (const { antes: s, desfeita } of alteradas) {
    if (!desfeita || !s.simbolo || !(s.altura_m > 0)) continue;
    if ((mapa?.simbolos || []).some(x => x.confirmado && x.simbolo === s.simbolo && alturaTexto(x.altura_m || 0) === alturaTexto(s.altura_m))) continue;
    try {
      const n = await votos.retirar(executor, { tipo: 'nota', chave: chaveDoVoto(esc, s.simbolo), fonte: fonte || `arquivo:${String(arquivo || '')}`, valor: alturaTexto(s.altura_m), origem: 'usuario' });
      if (n) { await aplicar(executor, esc, s.simbolo); removidas += n; }
    } catch (e) { console.warn('[notasAprendidas] altura não removida:', e.message); }
  }
  return removidas;
}

module.exports = { carregar, registrar, aprenderConfirmadas, esquecer };
