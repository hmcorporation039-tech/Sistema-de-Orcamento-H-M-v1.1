// Treino com as obras já feitas pela H&M (pedido do usuário em 03/11/2026: "vasculhe a pasta clientes, lá temos
// muitos projetos que já foram executados, muitos PDFs e DWG que podem servir de referência e aprendizado").
//
// Percorre a pasta dos clientes (PASTA_CLIENTES, no servidor) SÓ LENDO. Sem IA e sem nada da obra no repositório.
//   - DWG/DXF: o MESMO leitor da análise de projeto (services/analiseCad); o que o desenho ensina vai para o banco,
//     como numa análise (services/aprenderDoDesenho.js): legendas, alturas e nomes de bloco;
//   - planilhas (xlsx) e orçamentos/cotações em PDF: os materiais que o catálogo ainda NÃO tem
//     (services/treinoMateriais.js) — o que já existe não muda.
// SEMPRE POR DISCIPLINA (pedido do usuário, 03/11/2026): cada arquivo tem a disciplina do nome e das pastas
// (utils/disciplinaDoArquivo.js) — o leitor do CAD a recebe como "disciplina marcada", e a linha de legenda ou o
// nome de bloco sem disciplina própria fica com a do arquivo. Arquivo de arquitetura, hidráulica ou estrutura não
// é lido (situação 'ignorado').
//   - um arquivo por vez (a leitura de CAD tem fila global de 2: a análise de um usuário não espera o treino inteiro);
//   - retoma de onde parou: acervo_treino guarda caminho, tamanho e data de cada arquivo lido, e só o que mudou é relido
//     (mais o que deu erro — até 3 tentativas — e o ignorado por uma versão antiga da regra de disciplina);
//   - cada arquivo numa transação (o que ele ensina e a situação dele juntos) e uma rodada por vez, mesmo entre
//     processos (advisory lock: a rotina e o script não rodam juntos);
//   - planilhas e PDFs primeiro (segundos cada), depois os desenhos (~10 s cada);
//   - tempo-limite por rodada (a rotina das 06:00 e das 18:00 lê por até 2 h e continua na próxima).
// Rodar à mão: node scripts/treinar-acervo.js (ver o script) ou o botão "Treinar agora" do painel do aprendizado.
const crypto = require('crypto');
const fsp = require('fs/promises');
const path = require('path');
const pool = require('../config/database');
const { RAIZ_CLIENTES_SERVIDOR } = require('./pastasSistema');
const { disciplinaDoArquivo, REGRA_VERSAO } = require('../utils/disciplinaDoArquivo');
const { executarComTrava } = require('./travaJob');

const RE_CAD = /\.(dwg|dxf)$/i;
// .xls (Excel 97-2003): leitor próprio, sem dependência nova (utils/leitorXls.js — versão 2.30)
const RE_PLANILHA = /\.(xlsx|xlsm|xls)$/i;
// PDF que ensina material: orçamento, cotação, lista/planilha de material. As pranchas, a proposta da própria H&M
// (preço de venda) e os documentos (contrato, nota, laudo, memorial) não entram.
const RE_PDF_MATERIAIS = /or[cç]amento|cota[cç][aã]o|lista (de )?materia|materia(l|is)\b|planilha|pedido de (compra|material)|\bLM[-_ ]/i;
const RE_PDF_FORA = /proposta comercial|^P\d{2,4}[- ]|contrato|nota fiscal|\bNF[-_ e]|boleto|conta de|laudo|memorial|relat[oó]rio|\bART\b|caderno|certificado/i;
const ehPdfDeMateriais = (nome) => /\.pdf$/i.test(nome) && RE_PDF_MATERIAIS.test(nome) && !RE_PDF_FORA.test(nome);
// prancha em PDF (versão 2.30): o PDF que não é lista de material nem documento ensina a legenda (símbolo + descrição)
// e as notas de altura do escritório que projetou (services/legendasPdfAprendidas.js)
const ehPrancha = (nome) => /\.pdf$/i.test(nome) && !ehPdfDeMateriais(nome) && !RE_PDF_FORA.test(nome);
const tipoDe = (nome) => (RE_CAD.test(nome) ? 'cad' : RE_PLANILHA.test(nome) ? 'planilha' : ehPdfDeMateriais(nome) ? 'pdf' : ehPrancha(nome) ? 'prancha' : null);
// pastas do próprio sistema que não são obra (lixeira, reserva local) e pastas ocultas
const RE_PASTA_FORA = /^(_Exclu[ií]dos|_Aguardando servidor|\.|~\$)/i;
const MAIOR_ARQUIVO = 120 * 1024 * 1024; // DWG maior que isso costuma ser modelo 3D ou nuvem de pontos: não ensina símbolo
const MAIOR_DOCUMENTO = 25 * 1024 * 1024; // planilha/PDF maior que isso é base de preço ou caderno inteiro, não lista da obra
const PAUSA_MS = 300; // folga entre um arquivo e outro: o treino não monopoliza o processador

const zerado = () => ({ simbolos: 0, notas: 0, blocos: 0, materiais: 0, semPreco: 0, legendasPdf: 0 });
const estado = { rodando: false, parar: false, iniciadoEm: null, terminadoEm: null, total: 0, pendentes: 0, feitos: 0, lidos: 0, ignorados: 0, erros: 0, atual: null, ensinou: zerado(), mensagem: null };
const situacao = () => ({ ...estado, ensinou: { ...estado.ensinou } });

async function listarArquivos(raiz, acc = []) {
  let itens;
  try { itens = await fsp.readdir(raiz, { withFileTypes: true }); } catch { return acc; }
  for (const it of itens) {
    const p = path.join(raiz, it.name);
    if (it.isDirectory()) { if (!RE_PASTA_FORA.test(it.name)) await listarArquivos(p, acc); continue; }
    if (it.isFile() && !/^~\$/.test(it.name) && tipoDe(it.name)) {
      try { const st = await fsp.stat(p); acc.push({ caminho: p, tamanho: st.size, modificado: st.mtime }); } catch { /* sumiu no meio da varredura */ }
    }
  }
  return acc;
}

// erro passageiro (tempo-limite, banco fora do ar) não pode travar o arquivo para sempre: o arquivo com erro é relido
// até MAX_TENTATIVAS vezes, com ESPERA_ERRO_MS entre uma e outra (a próxima rodada das 06:00/18:00 tenta de novo)
const MAX_TENTATIVAS = 3;
const ESPERA_ERRO_MS = 60 * 60 * 1000;

// executor: a transação do arquivo (o aprendizado e a situação do arquivo gravados juntos — se o processo cair no
// meio, nada fica pela metade e o arquivo é relido sem contar duas vezes)
async function gravar(arq, raiz, situacaoArq, resumo, hash = null, disciplina = null, executor = pool, { tentativas = null } = {}) {
  const errou = situacaoArq === 'erro';
  await executor.query(
    `INSERT INTO acervo_treino (caminho, tamanho, modificado_em, tipo, situacao, resumo, hash, disciplina, tentativas, regra_disciplina)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (caminho) DO UPDATE SET tamanho = EXCLUDED.tamanho, modificado_em = EXCLUDED.modificado_em, situacao = EXCLUDED.situacao,
       resumo = EXCLUDED.resumo, hash = EXCLUDED.hash, disciplina = EXCLUDED.disciplina, regra_disciplina = EXCLUDED.regra_disciplina, lido_em = NOW(),
       tentativas = CASE WHEN $11 THEN acervo_treino.tentativas + 1 ELSE EXCLUDED.tentativas END`,
    [path.relative(raiz, arq.caminho), arq.tamanho, arq.modificado, path.extname(arq.caminho).slice(1).toLowerCase(), situacaoArq, JSON.stringify(resumo), hash, disciplina,
      tentativas ?? (errou ? 1 : 0), REGRA_VERSAO, errou && tentativas == null]);
}

// Quem ensina, para o aprendizado (services/votosAprendizado.js): a OBRA ("<cliente>/Obras/<obra>"), senão a pasta do
// arquivo — a R01 e a R02 do mesmo projeto contam uma vez; "PLANTA ELETRICA.dwg" de duas obras, duas.
function fonteDoCaminho(rel) {
  const pastas = String(rel || '').split(/[\\/]+/).filter(Boolean).slice(0, -1);
  const i = pastas.findIndex(p => /^obras?$/i.test(p.trim()));
  const obra = i >= 0 && pastas[i + 1] ? pastas.slice(0, i + 2) : pastas;
  return `acervo:${(obra.length ? obra : [String(rel || '')]).join('/')}`.slice(0, 300);
}

// A transação só abre na primeira gravação (BEGIN preguiçoso): a leitura do desenho (até 3 min) fica fora dela.
function transacaoPreguicosa(client) {
  let aberta = false;
  return {
    aberta: () => aberta,
    query: (...args) => {
      if (!aberta) { aberta = true; client.query('BEGIN').catch(() => {}); } // o pg enfileira: o BEGIN vai antes
      return client.query(...args);
    },
  };
}

// Lê um DWG/DXF e registra o que ele ensina. `ler` e `aprender` vêm de fora nos testes. `disciplina`: a do caminho
// (vai ao leitor como marcada e é a de reserva da linha de legenda/bloco que não diz a sua); `disciplinas`: todas as do
// caminho ("…_Incendio_CFTV_Cabeamento") — com mais de uma, não há reserva (a linha sem disciplina própria não se
// aprende). A que o leitor detectou no desenho só classifica o arquivo no painel: não é segura o bastante para dar
// disciplina a um bloco. fonte / executor: quem ensina e a transação do arquivo.
async function treinarArquivo(arq, { ler, aprender, buffer: dado, disciplina = null, disciplinas = null, fonte = null, executor = undefined }) {
  const buffer = dado || await fsp.readFile(arq.caminho);
  const nome = path.basename(arq.caminho);
  const marcadas = disciplinas?.length ? disciplinas : disciplina ? [disciplina] : [];
  const r = await ler(buffer, nome, { disciplinas: marcadas });
  const detectadas = (r.analise?.disciplinasDetectadas || []).map(d => d.chave || d).slice(0, 8);
  const daDisciplina = marcadas[0] || detectadas[0] || null;
  const ensinou = await aprender(r, nome, { disciplina: marcadas.length === 1 ? marcadas[0] : null, fonte, executor });
  const simbolos = r.mapa?.simbolos || [];
  return {
    // o que foi gravado no aprendizado (linhas novas ou reforçadas)
    simbolos: ensinou.simbolos || 0, notas: ensinou.notas || 0, blocosAprendidos: ensinou.blocos || 0,
    escritorio: r.aprendizado?.escritorio || '',
    legenda: (r.aprendizado?.legenda?.length || 0) + (r.aprendizado?.blocos?.length || 0),
    // o que o leitor reconheceu sozinho neste desenho (formas explodidas e grupos de bloco)
    formas: simbolos.length,
    reconhecidas: simbolos.filter(s => s.simbolo && s.simbolo !== '?').length,
    gruposDeBloco: r.pagina?.itens?.filter(i => i.tipo === 'simbolo').length || 0,
    naoIdentificados: r.pagina?.naoIdentificados?.length || 0,
    disciplina: daDisciplina,
    disciplinas: marcadas.length > 1 ? marcadas : detectadas,
  };
}

// Planilha: os materiais novos de cada aba (services/treinoMateriais.js). client/novos: a transação do arquivo e a lista
// do que ela cadastrou (entra no índice da rodada depois do COMMIT)
async function treinarPlanilha(buffer, nome, { disciplina, ctx, client, novos }) {
  let wb;
  if (/\.xls$/i.test(nome)) wb = require('../utils/leitorXls').workbookDoXls(buffer);
  else {
    const ExcelJS = require('exceljs');
    wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
  }
  return require('./treinoMateriais').aprenderDaPlanilha(wb, { disciplina, arquivo: nome, ctx, client, novos });
}

// Orçamento/cotação em PDF: o leitor das cotações de fornecedor, sem IA (só entra leitura conferida com o total)
async function treinarPdf(buffer, nome, { disciplina, ctx, client, novos }) {
  const { lerDocumentoCotacao } = require('./leitorCotacao');
  const leitura = await lerDocumentoCotacao(buffer, nome, { permitirIA: false });
  if (leitura.daHM) return { ignorado: 'proposta da própria H&M (preço de venda)' };
  if (!leitura.itens.length) return { lidos: 0, novos: 0, metodo: leitura.metodo || null, aviso: leitura.avisos?.[0] || null };
  const r = await require('./treinoMateriais').aprenderDoDocumento(leitura.itens, { disciplina, arquivo: nome, ctx, client, novos });
  return { ...r, metodo: leitura.metodo };
}

// Prancha em PDF: lê o carimbo (escritório) e, com ele, a legenda de cada folha e as notas de altura. Sem escritório no
// carimbo não há de quem aprender (o tamanho do símbolo no papel é costume de quem plota): nem lê o desenho.
async function treinarPrancha(buffer, nome, { disciplina, lerVetorial, fonte = null, executor = undefined }) {
  const { analisarProjeto } = require('../utils/projetoParser');
  const { escritorioDoProjeto } = require('../utils/escritorioDoProjeto');
  const analise = await analisarProjeto(buffer, nome);
  if (analise.semTexto) return { prancha: true, ignorado: 'PDF só imagem (escaneado): sem texto para aprender' };
  let escritorio = '';
  try { escritorio = escritorioDoProjeto(analise.carimbo, (analise.textoPorPagina || []).join('\n'), nome); } catch { escritorio = ''; }
  if (!escritorio) return { prancha: true, escritorio: '', legendasPdf: 0, notas: 0, aviso: 'sem autor do projeto (carimbo, texto ou código do desenho)' };
  const ler = lerVetorial || ((b, o) => require('../utils/pdfVetorial').lerPdfVetorial(b, o));
  const paginas = await ler(buffer, { nomeArquivo: nome, maxPaginas: 15 });
  const r = await require('./legendasPdfAprendidas').registrar(paginas, { escritorio, arquivo: nome, disciplina, fonte, textoDasNotas: (analise.textoPorPagina || []).join('\n') }, executor);
  return {
    prancha: true, escritorio, disciplina,
    folhas: paginas.filter(p => p.pagina).length, comLegenda: paginas.filter(p => p.legendaPropria?.length).length,
    simbolosContados: paginas.reduce((t, p) => t + (p.itens || []).filter(i => i.tipo === 'simbolo').reduce((u, i) => u + (i.quantidade || 0), 0), 0),
    legendasPdf: r.legendas, notas: r.notas,
  };
}

// o arquivo precisa ser lido nesta rodada? Novo ou mudou; com erro, até MAX_TENTATIVAS e depois da espera; ignorado
// (de outra disciplina) por uma versão anterior da regra (utils/disciplinaDoArquivo.REGRA_VERSAO)
function pendente(j, a, agora = Date.now()) {
  if (!j) return true;
  if (Number(j.tamanho) !== a.tamanho || Math.abs(new Date(j.modificado_em) - a.modificado) > 2000) return true;
  if (j.situacao === 'erro') return Number(j.tentativas || 0) < MAX_TENTATIVAS && agora - new Date(j.lido_em).getTime() >= ESPERA_ERRO_MS;
  if (j.situacao === 'ignorado') return Number(j.regra_disciplina || 1) < REGRA_VERSAO;
  return false;
}

// opcoes: { raiz, tempoMaxMs, limite, ler, aprender, tipos, lerVetorial } → resumo da rodada
async function treinar(opcoes = {}) {
  if (estado.rodando) return { ...situacao(), jaRodando: true };
  // trava também ENTRE processos (advisory lock do PostgreSQL — services/travaJob.js): a rotina das 06:00/18:00 e o
  // scripts/treinar-acervo.js rodando juntos liam e ensinavam os mesmos arquivos duas vezes
  const r = await executarComTrava('treino-acervo', () => rodada(opcoes));
  if (r?.ignorado) return { ...situacao(), jaRodando: true, mensagem: r.avisos?.[0] || 'o treino já está rodando em outra instância do sistema' };
  return r;
}

async function rodada(opcoes) {
  if (estado.rodando) return { ...situacao(), jaRodando: true };
  const raiz = opcoes.raiz || RAIZ_CLIENTES_SERVIDOR;
  // o DWG é lido com o que o sistema JÁ sabe (como na análise): o "reconhecidas" do treino passa a medir o sistema de
  // verdade. O que ele grava continua vindo só da legenda e das notas do próprio desenho (não reforça o que já sabia).
  let sabido = null, lidosComSabido = 0;
  const ler = opcoes.ler || (async (buffer, nome, o) => {
    if (!sabido || lidosComSabido++ >= 100) { sabido = await require('./aprenderDoDesenho').conhecimento(); lidosComSabido = 0; }
    return require('./analiseCad').lerArquivoCad(buffer, nome, { ...sabido, ...o });
  });
  const aprender = opcoes.aprender || require('./aprenderDoDesenho').registrarLeitura;
  const tipos = new Set(opcoes.tipos || ['planilha', 'pdf', 'cad', 'prancha']);
  const fim = Date.now() + (opcoes.tempoMaxMs || 2 * 3600 * 1000);
  Object.assign(estado, { rodando: true, parar: false, iniciadoEm: new Date(), terminadoEm: null, total: 0, pendentes: 0, feitos: 0, lidos: 0, ignorados: 0, erros: 0, atual: null, ensinou: zerado(), mensagem: 'listando os arquivos da pasta dos clientes' });
  let ctx = null; // catálogo carregado uma vez para as planilhas/PDFs da rodada
  try {
    const todos = (await listarArquivos(raiz)).filter(a => tipos.has(tipoDe(a.caminho)));
    const { rows } = await pool.query('SELECT * FROM acervo_treino');
    const ja = new Map(rows.map(r => [r.caminho, r]));
    const ordem = { planilha: 0, pdf: 1, cad: 2, prancha: 3 }; // a prancha em PDF é a mais lenta
    // planilhas e PDFs primeiro (rápidos); em cada tipo, as obras mais recentes: o costume atual dos escritórios
    const pendentes = todos.filter(a => pendente(ja.get(path.relative(raiz, a.caminho)), a))
      .sort((a, b) => (ordem[tipoDe(a.caminho)] - ordem[tipoDe(b.caminho)]) || (b.modificado - a.modificado));
    Object.assign(estado, { total: todos.length, pendentes: pendentes.length, mensagem: null });
    for (const arq of pendentes.slice(0, opcoes.limite || Infinity)) {
      if (estado.parar || Date.now() > fim) break;
      const rel = path.relative(raiz, arq.caminho);
      const tipo = tipoDe(arq.caminho);
      const doCaminho = disciplinaDoArquivo(rel);
      estado.atual = rel;
      if (doCaminho?.fora) {
        await gravar(arq, raiz, 'ignorado', { fora: doCaminho.fora });
        estado.ignorados++; estado.feitos++;
        continue;
      }
      const disciplina = doCaminho?.chave || null;
      const disciplinas = doCaminho?.chaves || (disciplina ? [disciplina] : []);
      if (arq.tamanho > (tipo === 'cad' ? MAIOR_ARQUIVO : MAIOR_DOCUMENTO)) {
        // não muda numa nova tentativa: sem reler
        await gravar(arq, raiz, 'erro', { erro: `arquivo de ${Math.round(arq.tamanho / 1048576)} MB: grande demais para o treino` }, null, disciplina, pool, { tentativas: MAX_TENTATIVAS });
        estado.erros++; estado.feitos++;
        continue;
      }
      const client = await pool.connect();
      const tx = transacaoPreguicosa(client);
      const novos = []; // materiais cadastrados por este arquivo: entram no índice da rodada depois do COMMIT
      try {
        const buffer = await fsp.readFile(arq.caminho);
        const hash = crypto.createHash('sha1').update(buffer).digest('hex');
        const { rows: [copia] } = await pool.query(`SELECT caminho FROM acervo_treino WHERE hash = $1 AND situacao = 'lido' AND caminho <> $2 LIMIT 1`, [hash, rel]);
        if (copia) {
          await gravar(arq, raiz, 'lido', { copiaDe: copia.caminho }, hash, disciplina);
          estado.lidos++;
        } else {
          const nome = path.basename(arq.caminho);
          const fonte = fonteDoCaminho(rel);
          let resumo;
          if (tipo === 'cad') {
            resumo = await treinarArquivo(arq, { ler, aprender, buffer, disciplina, disciplinas, fonte, executor: tx });
          } else if (tipo === 'prancha') {
            resumo = await treinarPrancha(buffer, nome, { disciplina: disciplinas.length > 1 ? null : disciplina, lerVetorial: opcoes.lerVetorial, fonte, executor: tx });
          } else {
            if (!ctx) ctx = await require('./treinoMateriais').prepararContexto();
            resumo = await (tipo === 'planilha' ? treinarPlanilha : treinarPdf)(buffer, nome, { disciplina, ctx, client: tx, novos });
          }
          await gravar(arq, raiz, 'lido', resumo, hash, resumo.disciplina || disciplina, tx);
          await client.query('COMMIT');
          if (novos.length) require('./treinoMateriais').indexarNovos(ctx, novos);
          // o painel do treino soma só o que foi gravado
          if (tipo === 'cad') for (const k of ['simbolos', 'notas', 'blocos']) estado.ensinou[k] += Number(resumo[k === 'blocos' ? 'blocosAprendidos' : k]) || 0;
          else if (tipo === 'prancha') { estado.ensinou.legendasPdf += resumo.legendasPdf || 0; estado.ensinou.notas += resumo.notas || 0; }
          else { estado.ensinou.materiais += resumo.novos || 0; estado.ensinou.semPreco += resumo.semPreco || 0; }
          estado.lidos++;
        }
      } catch (e) {
        if (tx.aberta()) await client.query('ROLLBACK').catch(() => {});
        await gravar(arq, raiz, 'erro', { erro: String(e.message || e).slice(0, 300) }, null, disciplina).catch(() => {});
        estado.erros++;
      } finally {
        client.release();
      }
      estado.feitos++;
      await new Promise(r => setTimeout(r, tipo === 'cad' || tipo === 'prancha' ? PAUSA_MS : 50));
    }
    const restam = pendentes.length - estado.feitos;
    estado.mensagem = restam > 0 ? `${restam} arquivo(s) ficam para a próxima rodada` : 'todos os arquivos da pasta foram lidos';
    return { ...situacao(), restam };
  } finally {
    Object.assign(estado, { rodando: false, atual: null, terminadoEm: new Date() });
  }
}

function pararTreino() {
  if (estado.rodando) estado.parar = true;
  return situacao();
}

// Para o painel: quantos arquivos do acervo já foram lidos, por disciplina, e o que ensinaram (sem varrer a pasta)
async function resumoDoAcervo() {
  try {
    const [{ rows: [r] }, { rows: porDisciplina }, materiais] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FILTER (WHERE situacao = 'lido')::int AS lidos, COUNT(*) FILTER (WHERE situacao = 'erro')::int AS erros,
                COUNT(*) FILTER (WHERE situacao = 'ignorado')::int AS ignorados,
                COUNT(DISTINCT NULLIF(resumo->>'escritorio', ''))::int AS escritorios, MAX(lido_em) AS ultimo
           FROM acervo_treino`),
      pool.query(
        `SELECT COALESCE(disciplina, '') AS disciplina,
                COUNT(*) FILTER (WHERE tipo IN ('dwg', 'dxf'))::int AS desenhos,
                COUNT(*) FILTER (WHERE tipo NOT IN ('dwg', 'dxf') AND NOT resumo ? 'prancha')::int AS documentos,
                COUNT(*) FILTER (WHERE resumo ? 'prancha')::int AS pranchas,
                -- legenda aprendida: dos DWG (formas e nomes de bloco) e das pranchas em PDF (versão 2.30)
                COALESCE(SUM(COALESCE((resumo->>'simbolos')::int, 0) + COALESCE((resumo->>'blocosAprendidos')::int, 0) + COALESCE((resumo->>'legendasPdf')::int, 0)), 0)::int AS legenda
           FROM acervo_treino WHERE situacao = 'lido' GROUP BY 1 ORDER BY 2 DESC, 3 DESC`),
      require('./treinoMateriais').resumoDosMateriais(),
    ]);
    return { ...r, porDisciplina, materiais, rodada: situacao() };
  } catch {
    return { lidos: 0, erros: 0, ignorados: 0, escritorios: 0, ultimo: null, porDisciplina: [], materiais: [], rodada: situacao() };
  }
}

module.exports = { treinar, pararTreino, situacao, resumoDoAcervo, listarArquivos, treinarArquivo, treinarPrancha, paraTestes: { tipoDe, ehPdfDeMateriais, ehPrancha, pendente, fonteDoCaminho, MAX_TENTATIVAS } };
