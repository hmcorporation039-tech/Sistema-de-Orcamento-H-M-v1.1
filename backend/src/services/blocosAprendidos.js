// O que o sistema aprendeu dos NOMES DE BLOCO nas legendas das pranchas (models/migracoes/2.0-49-treino-com-o-acervo.js).
// A legenda diz "TUG-30 = Tomada baixa 2P+T a 30 cm"; a próxima prancha do mesmo escritório, sem legenda, reconhece
// o bloco TUG-30 pelo nome — sem IA. Alimentado por cada análise de DWG/DXF e pelo treino com o acervo da pasta dos
// clientes (services/treinoAcervo.js). É sugestão: o item reconhecido assim fica "a conferir" (services/analiseCad).
//   carregar()                          → [{ nome, escritorio, descricao, disciplina, vezes, usuario? }] sem conflito
//   registrar(itens, escritorio, arquivo, executor, disciplinaDoArquivo, fonte) → o voto deste projeto em cada linha da
//                                         legenda (pagina.legendaItens do leitor do CAD); a disciplina do arquivo vale
//                                         quando nem o nome nem a descrição dizem a sua (treino por disciplina)
//   confirmar({ nome, escritorio, descricao, disciplina, fonte }) → o engenheiro diz o que é o bloco (mapa do CAD)
//   procurar(aprendidos, nome, escritorio, disciplinas) → a linha que vale para o bloco (função pura: o leitor do CAD usa)
const pool = require('../config/database');
const path = require('path');
const { detectarDisciplinas } = require('../utils/leitoresTabelaProjeto');
const { disciplinaDoBloco } = require(path.join(require('../config/caminhos').CAD, 'disciplinasCad.js'));
const votos = require('./votosAprendizado');
const { MESMO_RAMO, ramoDe } = require('./analiseCad/aprendidoNoDesenho');

// nome que não identifica nada: bloco anônimo do AutoCAD (*U12, A$C1F2…), hash, número solto, letra solta
const RE_NOME_SEM_SENTIDO = /^(\*|A\$C)|^[0-9A-F]{8,}$|^\d+$|^.{0,1}$/i;
const chaveDoNome = (nome) => String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim().slice(0, 120);
const textoUtil = (s) => /[A-Za-zÀ-ú]{4,}/.test(s || '');

async function carregar(executor = pool) {
  try {
    // a confirmação do engenheiro primeiro: o limite não pode cortar justo o que é certo
    const { rows } = await executor.query(
      `SELECT nome, escritorio, descricao, disciplina, vezes, origem FROM cad_blocos_aprendidos
        WHERE origem = 'usuario' OR conflitos = 0 ORDER BY (origem = 'usuario') DESC, vezes DESC LIMIT 20000`);
    return rows.map(r => ({ nome: r.nome, escritorio: r.escritorio, descricao: r.descricao, disciplina: r.disciplina || null, vezes: Number(r.vezes) || 1, ...(r.origem === 'usuario' ? { usuario: true } : {}) }));
  } catch (e) {
    console.warn('[blocosAprendidos] sem blocos aprendidos nesta leitura:', e.message); // banco antigo (sem a tabela) ou fora do ar
    return [];
  }
}

// a linha da tabela é a apuração dos votos (services/votosAprendizado.js): cada PROJETO conta uma vez
const chaveDoVoto = (nome, escritorio) => `${nome}|${escritorio}`;
// a linha de antes dos votos entra como voto 'legado' (o peso que ela tinha)
const legadoDe = (executor, nome, escritorio) => async () => {
  const { rows: [r] } = await executor.query('SELECT descricao, disciplina, origem, vezes, conflitos, arquivo FROM cad_blocos_aprendidos WHERE nome = $1 AND escritorio = $2', [nome, escritorio]);
  if (!r) return [];
  return [{ valor: r.disciplina || '', origem: r.origem, peso: r.vezes, dados: { descricao: r.descricao, disciplina: r.disciplina, arquivo: r.arquivo } },
    ...(r.conflitos > 0 && r.origem !== 'usuario' ? [{ valor: votos.CONFLITO_LEGADO, origem: 'legenda', peso: r.conflitos, dados: {} }] : [])];
};
async function aplicar(executor, nome, escritorio) {
  const d = await votos.apurar(executor, 'bloco', chaveDoVoto(nome, escritorio));
  if (!d) {
    await executor.query('DELETE FROM cad_blocos_aprendidos WHERE nome = $1 AND escritorio = $2', [nome, escritorio]);
    return null;
  }
  if (!d.dados?.descricao) { // só conflito antigo, sem opinião conhecida: continua fora de uso
    await executor.query('UPDATE cad_blocos_aprendidos SET conflitos = GREATEST(conflitos, 1), atualizado_em = NOW() WHERE nome = $1 AND escritorio = $2', [nome, escritorio]);
    return d;
  }
  await executor.query(
    `INSERT INTO cad_blocos_aprendidos (nome, escritorio, descricao, disciplina, origem, vezes, conflitos, arquivo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (nome, escritorio) DO UPDATE SET descricao = EXCLUDED.descricao, disciplina = EXCLUDED.disciplina, origem = EXCLUDED.origem,
       vezes = EXCLUDED.vezes, conflitos = EXCLUDED.conflitos, arquivo = EXCLUDED.arquivo, atualizado_em = NOW()`,
    [nome, escritorio, String(d.dados.descricao).slice(0, 200), d.dados.disciplina || null, d.usuario ? 'usuario' : 'legenda', d.vezes, d.conflitos, String(d.dados.arquivo || '').slice(0, 200)]);
  return d;
}

// itens: [{ nomeLimpo, descricao }]. Cada projeto (fonte) vota na disciplina do nome: o mesmo projeto relido não soma; a
// mesma disciplina em outro projeto reforça; outra disciplina diverge (vale a maioria — 3+ projetos e 2/3 deles — ou fica
// fora de uso até o engenheiro confirmar no mapa). A descrição mais recente da disciplina que vale fica.
// fonte: a identidade do projeto (sem ela, o nome do arquivo — como era antes).
async function registrar(itens, escritorio, arquivo, executor = pool, disciplinaDoArquivo = null, fonte = null) {
  let gravados = 0;
  const vistos = new Set();
  const esc = String(escritorio || '').slice(0, 120);
  for (const it of itens || []) {
    const nome = chaveDoNome(it?.nomeLimpo);
    if (!nome || RE_NOME_SEM_SENTIDO.test(nome) || vistos.has(nome) || !textoUtil(it.descricao)) continue;
    vistos.add(nome);
    const descricao = String(it.descricao).replace(/\s+/g, ' ').trim().slice(0, 200);
    // o prefixo do nome manda ("INC CENTRAL" é incêndio, mesmo com "Central de alarme…" na legenda); sem ele, o texto.
    // Bloco sem disciplina de instalação (identificador de janela, mobiliário) não se aprende; o de uma prancha que
    // diz a disciplina no nome/pasta ("…_CFT_…") fica com ela.
    const disciplina = disciplinaDoBloco(nome) || detectarDisciplinas(descricao)[0]?.chave || disciplinaDoArquivo || null;
    if (!disciplina) continue;
    try {
      await votos.votar(executor, {
        tipo: 'bloco', chave: chaveDoVoto(nome, esc), fonte: fonte || `arquivo:${String(arquivo || '')}`, valor: disciplina, origem: 'legenda',
        dados: { descricao, disciplina, arquivo: String(arquivo || '').slice(0, 200) }, legado: legadoDe(executor, nome, esc),
      });
      await aplicar(executor, nome, esc);
      gravados++;
    } catch (e) { console.warn('[blocosAprendidos] linha da legenda não gravada:', e.message); }
  }
  return gravados;
}

// O engenheiro confirma (ou corrige) no mapa do CAD o que é um bloco: vale como certo (origem 'usuario') para o
// escritório do carimbo — e, sem carimbo, como sugestão para a mesma disciplina (procurar: escritório vazio nunca é
// "o próprio"). Confirmar de novo do mesmo projeto não soma. Devolve a linha que ficou valendo.
async function confirmar({ nome, escritorio = '', descricao, disciplina, fonte, arquivo = '' }, executor = pool) {
  const chave = chaveDoNome(nome);
  if (!chave || RE_NOME_SEM_SENTIDO.test(chave)) throw Object.assign(new Error('Nome de bloco inválido.'), { status: 400 });
  const texto = String(descricao || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  if (!textoUtil(texto)) throw Object.assign(new Error('Escreva o que é o bloco (ex.: "Tomada baixa 2P+T a 30 cm").'), { status: 400 });
  if (!disciplina) throw Object.assign(new Error('Escolha a disciplina do bloco.'), { status: 400 });
  const esc = String(escritorio || '').slice(0, 120);
  await votos.votar(executor, {
    tipo: 'bloco', chave: chaveDoVoto(chave, esc), fonte, valor: disciplina, origem: 'usuario',
    dados: { descricao: texto, disciplina, arquivo: String(arquivo || '').slice(0, 200) }, legado: legadoDe(executor, chave, esc),
  });
  await aplicar(executor, chave, esc);
  const { rows: [r] } = await executor.query('SELECT nome, escritorio, descricao, disciplina, origem, vezes FROM cad_blocos_aprendidos WHERE nome = $1 AND escritorio = $2', [chave, esc]);
  return r || null;
}

// A linha que vale para o bloco. Sempre POR DISCIPLINA (diretriz de 06/11/2026: o escritório é preferência, nunca
// coringa): com disciplinas marcadas no arquivo, só a linha de uma delas (ou do mesmo ramo, MESMO_RAMO) vale.
//   - a do mesmo escritório do carimbo (o nome é convenção dele) — escritório vazio nunca é "o próprio": dois desenhos
//     sem carimbo não são do mesmo escritório (antes pulavam todas as travas abaixo);
//   - senão a de outros escritórios (ou sem carimbo), só se todos concordam na disciplina e o nome apareceu em 2+
//     projetos (ou o engenheiro confirmou) — nome curto como "T1" é convenção de cada escritório: não atravessa.
function procurar(aprendidos, nome, escritorio = '', disciplinas = []) {
  const chave = chaveDoNome(nome);
  if (!chave || RE_NOME_SEM_SENTIDO.test(chave) || !aprendidos?.length) return null;
  const doNome = aprendidos.filter(a => a.nome === chave);
  if (!doNome.length) return null;
  const marcadas = (disciplinas || []).map(ramoDe);
  const daDisciplina = (a) => !marcadas.length || !a.disciplina || marcadas.includes(ramoDe(a.disciplina));
  if (escritorio) {
    const proprio = doNome.find(a => a.escritorio === escritorio);
    if (proprio) return daDisciplina(proprio) ? { ...proprio, deOutroEscritorio: false } : null;
  }
  if (chave.length < 4) return null;
  const discDoNome = new Set(doNome.map(a => ramoDe(a.disciplina || '')));
  const vezes = doNome.reduce((s, a) => s + a.vezes, 0);
  if (discDoNome.size !== 1 || (vezes < 2 && !doNome.some(a => a.usuario))) return null;
  if (!daDisciplina(doNome[0])) return null;
  const melhor = [...doNome].sort((a, b) => (b.usuario ? 1 : 0) - (a.usuario ? 1 : 0) || b.vezes - a.vezes)[0];
  return { ...melhor, deOutroEscritorio: true };
}

module.exports = { carregar, registrar, confirmar, procurar, chaveDoNome, MESMO_RAMO, ramoDe };
