// O que o sistema aprendeu dos NOMES DE BLOCO nas legendas das pranchas (models/migracoes/2.0-49-treino-com-o-acervo.js).
// A legenda diz "TUG-30 = Tomada baixa 2P+T a 30 cm"; a próxima prancha do mesmo escritório, sem legenda, reconhece
// o bloco TUG-30 pelo nome — sem IA. Alimentado por cada análise de DWG/DXF e pelo treino com o acervo da pasta dos
// clientes (services/treinoAcervo.js).
//   carregar()                          → [{ nome, escritorio, descricao, disciplina, vezes, usuario? }] sem conflito
//   registrar(itens, escritorio, arquivo, executor, disciplinaDoArquivo) → grava/reforça as linhas da legenda
//                                         (pagina.legendaItens do leitor do CAD); a disciplina do arquivo vale
//                                         quando nem o nome nem a descrição dizem a sua (treino por disciplina)
//   procurar(aprendidos, nome, escritorio) → a linha que vale para o bloco (função pura: o leitor do CAD usa)
const pool = require('../config/database');
const path = require('path');
const { detectarDisciplinas } = require('../utils/leitoresTabelaProjeto');
const { disciplinaDoBloco } = require(path.join(require('../config/caminhos').CAD, 'disciplinasCad.js'));

// nome que não identifica nada: bloco anônimo do AutoCAD (*U12, A$C1F2…), hash, número solto, letra solta
const RE_NOME_SEM_SENTIDO = /^(\*|A\$C)|^[0-9A-F]{8,}$|^\d+$|^.{0,1}$/i;
const chaveDoNome = (nome) => String(nome || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim().slice(0, 120);
const textoUtil = (s) => /[A-Za-zÀ-ú]{4,}/.test(s || '');

async function carregar(executor = pool) {
  try {
    const { rows } = await executor.query(
      `SELECT nome, escritorio, descricao, disciplina, vezes, origem FROM cad_blocos_aprendidos
        WHERE origem = 'usuario' OR conflitos = 0 ORDER BY vezes DESC LIMIT 20000`);
    return rows.map(r => ({ nome: r.nome, escritorio: r.escritorio, descricao: r.descricao, disciplina: r.disciplina || null, vezes: Number(r.vezes) || 1, ...(r.origem === 'usuario' ? { usuario: true } : {}) }));
  } catch (e) {
    console.warn('[blocosAprendidos] sem blocos aprendidos nesta leitura:', e.message); // banco antigo (sem a tabela) ou fora do ar
    return [];
  }
}

// itens: [{ nomeLimpo, descricao }]. Mesmo nome e mesma disciplina: reforça; outra disciplina: conflito (sai do uso).
// A descrição mais recente fica (a legenda do escritório pode ter ganho detalhe), a disciplina é o que se confere.
async function registrar(itens, escritorio, arquivo, executor = pool, disciplinaDoArquivo = null) {
  let gravados = 0;
  const vistos = new Set();
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
      await executor.query(
        `INSERT INTO cad_blocos_aprendidos (nome, escritorio, descricao, disciplina, arquivo) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (nome, escritorio) DO UPDATE SET
           vezes = cad_blocos_aprendidos.vezes + CASE WHEN cad_blocos_aprendidos.disciplina IS NOT DISTINCT FROM EXCLUDED.disciplina THEN 1 ELSE 0 END,
           conflitos = cad_blocos_aprendidos.conflitos + CASE WHEN cad_blocos_aprendidos.origem <> 'usuario'
             AND cad_blocos_aprendidos.disciplina IS DISTINCT FROM EXCLUDED.disciplina THEN 1 ELSE 0 END,
           descricao = CASE WHEN cad_blocos_aprendidos.origem = 'usuario' THEN cad_blocos_aprendidos.descricao ELSE EXCLUDED.descricao END,
           atualizado_em = NOW()`,
        [nome, String(escritorio || '').slice(0, 120), descricao, disciplina, String(arquivo || '').slice(0, 200)]);
      gravados++;
    } catch (e) { console.warn('[blocosAprendidos] linha da legenda não gravada:', e.message); }
  }
  return gravados;
}

// A linha que vale para o bloco: a do mesmo escritório; senão a de outros escritórios só se todos concordam na
// disciplina e o nome apareceu em 2+ arquivos (nome curto como "T1" é convenção de cada escritório: não atravessa).
function procurar(aprendidos, nome, escritorio = '') {
  const chave = chaveDoNome(nome);
  if (!chave || RE_NOME_SEM_SENTIDO.test(chave) || !aprendidos?.length) return null;
  const doNome = aprendidos.filter(a => a.nome === chave);
  if (!doNome.length) return null;
  const proprio = doNome.find(a => a.escritorio === (escritorio || ''));
  if (proprio) return { ...proprio, deOutroEscritorio: false };
  if (chave.length < 4) return null;
  const disciplinas = new Set(doNome.map(a => a.disciplina || ''));
  const vezes = doNome.reduce((s, a) => s + a.vezes, 0);
  if (disciplinas.size !== 1 || vezes < 2) return null;
  return { ...doNome.sort((a, b) => b.vezes - a.vezes)[0], deOutroEscritorio: true };
}

module.exports = { carregar, registrar, procurar, chaveDoNome };
