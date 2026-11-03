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
//   - retoma de onde parou: acervo_treino guarda caminho, tamanho e data de cada arquivo lido, e só o que mudou é relido;
//   - planilhas e PDFs primeiro (segundos cada), depois os desenhos (~10 s cada);
//   - tempo-limite por rodada (a rotina das 06:00 e das 18:00 lê por até 2 h e continua na próxima).
// Rodar à mão: node scripts/treinar-acervo.js (ver o script) ou o botão "Treinar agora" do painel do aprendizado.
const crypto = require('crypto');
const fsp = require('fs/promises');
const path = require('path');
const pool = require('../config/database');
const { RAIZ_CLIENTES_SERVIDOR } = require('./pastasSistema');
const { disciplinaDoArquivo } = require('../utils/disciplinaDoArquivo');

const RE_CAD = /\.(dwg|dxf)$/i;
const RE_PLANILHA = /\.(xlsx|xlsm)$/i;
// PDF que ensina material: orçamento, cotação, lista/planilha de material. As pranchas, a proposta da própria H&M
// (preço de venda) e os documentos (contrato, nota, laudo, memorial) não entram.
const RE_PDF_MATERIAIS = /or[cç]amento|cota[cç][aã]o|lista (de )?materia|materia(l|is)\b|planilha|pedido de (compra|material)|\bLM[-_ ]/i;
const RE_PDF_FORA = /proposta comercial|^P\d{2,4}[- ]|contrato|nota fiscal|\bNF[-_ e]|boleto|conta de|laudo|memorial|relat[oó]rio|\bART\b|caderno|certificado/i;
const ehPdfDeMateriais = (nome) => /\.pdf$/i.test(nome) && RE_PDF_MATERIAIS.test(nome) && !RE_PDF_FORA.test(nome);
const tipoDe = (nome) => (RE_CAD.test(nome) ? 'cad' : RE_PLANILHA.test(nome) ? 'planilha' : ehPdfDeMateriais(nome) ? 'pdf' : null);
// pastas do próprio sistema que não são obra (lixeira, reserva local) e pastas ocultas
const RE_PASTA_FORA = /^(_Exclu[ií]dos|_Aguardando servidor|\.|~\$)/i;
const MAIOR_ARQUIVO = 120 * 1024 * 1024; // DWG maior que isso costuma ser modelo 3D ou nuvem de pontos: não ensina símbolo
const MAIOR_DOCUMENTO = 25 * 1024 * 1024; // planilha/PDF maior que isso é base de preço ou caderno inteiro, não lista da obra
const PAUSA_MS = 300; // folga entre um arquivo e outro: o treino não monopoliza o processador

const zerado = () => ({ simbolos: 0, notas: 0, blocos: 0, materiais: 0, semPreco: 0 });
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

async function gravar(arq, raiz, situacaoArq, resumo, hash = null, disciplina = null) {
  await pool.query(
    `INSERT INTO acervo_treino (caminho, tamanho, modificado_em, tipo, situacao, resumo, hash, disciplina) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (caminho) DO UPDATE SET tamanho = EXCLUDED.tamanho, modificado_em = EXCLUDED.modificado_em, situacao = EXCLUDED.situacao,
       resumo = EXCLUDED.resumo, hash = EXCLUDED.hash, disciplina = EXCLUDED.disciplina, lido_em = NOW()`,
    [path.relative(raiz, arq.caminho), arq.tamanho, arq.modificado, path.extname(arq.caminho).slice(1).toLowerCase(), situacaoArq, JSON.stringify(resumo), hash, disciplina]);
}

// Lê um DWG/DXF e registra o que ele ensina. `ler` e `aprender` vêm de fora nos testes. `disciplina`: a do caminho
// (vai ao leitor como marcada e é a de reserva da linha de legenda/bloco que não diz a sua). A que o leitor detectou
// no desenho só classifica o arquivo no painel: não é segura o bastante para dar disciplina a um bloco.
async function treinarArquivo(arq, { ler, aprender, buffer: dado, disciplina = null }) {
  const buffer = dado || await fsp.readFile(arq.caminho);
  const nome = path.basename(arq.caminho);
  const r = await ler(buffer, nome, { disciplinas: disciplina ? [disciplina] : [] });
  const detectadas = (r.analise?.disciplinasDetectadas || []).map(d => d.chave || d).slice(0, 8);
  const daDisciplina = disciplina || detectadas[0] || null;
  const ensinou = await aprender(r, nome, { disciplina });
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
    disciplinas: detectadas,
  };
}

// Planilha: os materiais novos de cada aba (services/treinoMateriais.js)
async function treinarPlanilha(buffer, nome, { disciplina, ctx }) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return require('./treinoMateriais').aprenderDaPlanilha(wb, { disciplina, arquivo: nome, ctx });
}

// Orçamento/cotação em PDF: o leitor das cotações de fornecedor, sem IA (só entra leitura conferida com o total)
async function treinarPdf(buffer, nome, { disciplina, ctx }) {
  const { lerDocumentoCotacao } = require('./leitorCotacao');
  const leitura = await lerDocumentoCotacao(buffer, nome, { permitirIA: false });
  if (leitura.daHM) return { ignorado: 'proposta da própria H&M (preço de venda)' };
  if (!leitura.itens.length) return { lidos: 0, novos: 0, metodo: leitura.metodo || null, aviso: leitura.avisos?.[0] || null };
  const r = await require('./treinoMateriais').aprenderDoDocumento(leitura.itens, { disciplina, arquivo: nome, ctx });
  return { ...r, metodo: leitura.metodo };
}

// opcoes: { raiz, tempoMaxMs, limite, ler, aprender, tipos } → resumo da rodada
async function treinar(opcoes = {}) {
  if (estado.rodando) return { ...situacao(), jaRodando: true };
  const raiz = opcoes.raiz || RAIZ_CLIENTES_SERVIDOR;
  const ler = opcoes.ler || ((buffer, nome, o) => require('./analiseCad').lerArquivoCad(buffer, nome, o));
  const aprender = opcoes.aprender || require('./aprenderDoDesenho').registrarLeitura;
  const tipos = new Set(opcoes.tipos || ['planilha', 'pdf', 'cad']);
  const fim = Date.now() + (opcoes.tempoMaxMs || 2 * 3600 * 1000);
  Object.assign(estado, { rodando: true, parar: false, iniciadoEm: new Date(), terminadoEm: null, total: 0, pendentes: 0, feitos: 0, lidos: 0, ignorados: 0, erros: 0, atual: null, ensinou: zerado(), mensagem: 'listando os arquivos da pasta dos clientes' });
  let ctx = null; // catálogo carregado uma vez para as planilhas/PDFs da rodada
  try {
    const todos = (await listarArquivos(raiz)).filter(a => tipos.has(tipoDe(a.caminho)));
    const { rows } = await pool.query('SELECT caminho, tamanho, modificado_em FROM acervo_treino');
    const ja = new Map(rows.map(r => [r.caminho, r]));
    const ordem = { planilha: 0, pdf: 1, cad: 2 };
    const pendentes = todos.filter((a) => {
      const j = ja.get(path.relative(raiz, a.caminho));
      return !j || Number(j.tamanho) !== a.tamanho || Math.abs(new Date(j.modificado_em) - a.modificado) > 2000;
    // planilhas e PDFs primeiro (rápidos); em cada tipo, as obras mais recentes: o costume atual dos escritórios
    }).sort((a, b) => (ordem[tipoDe(a.caminho)] - ordem[tipoDe(b.caminho)]) || (b.modificado - a.modificado));
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
      if (arq.tamanho > (tipo === 'cad' ? MAIOR_ARQUIVO : MAIOR_DOCUMENTO)) {
        await gravar(arq, raiz, 'erro', { erro: `arquivo de ${Math.round(arq.tamanho / 1048576)} MB: grande demais para o treino` }, null, disciplina);
        estado.erros++; estado.feitos++;
        continue;
      }
      try {
        const buffer = await fsp.readFile(arq.caminho);
        const hash = crypto.createHash('sha1').update(buffer).digest('hex');
        const { rows: [copia] } = await pool.query(`SELECT caminho FROM acervo_treino WHERE hash = $1 AND situacao = 'lido' AND caminho <> $2 LIMIT 1`, [hash, rel]);
        if (copia) {
          await gravar(arq, raiz, 'lido', { copiaDe: copia.caminho }, hash, disciplina);
          estado.lidos++; estado.feitos++;
          continue;
        }
        const nome = path.basename(arq.caminho);
        let resumo;
        if (tipo === 'cad') {
          resumo = await treinarArquivo(arq, { ler, aprender, buffer, disciplina });
          for (const k of ['simbolos', 'notas', 'blocos']) estado.ensinou[k] += Number(resumo[k === 'blocos' ? 'blocosAprendidos' : k]) || 0;
        } else {
          if (!ctx) ctx = await require('./treinoMateriais').prepararContexto();
          resumo = await (tipo === 'planilha' ? treinarPlanilha : treinarPdf)(buffer, nome, { disciplina, ctx });
          estado.ensinou.materiais += resumo.novos || 0;
          estado.ensinou.semPreco += resumo.semPreco || 0;
        }
        await gravar(arq, raiz, 'lido', resumo, hash, resumo.disciplina || disciplina);
        estado.lidos++;
      } catch (e) {
        await gravar(arq, raiz, 'erro', { erro: String(e.message || e).slice(0, 300) }, null, disciplina).catch(() => {});
        estado.erros++;
      }
      estado.feitos++;
      await new Promise(r => setTimeout(r, tipo === 'cad' ? PAUSA_MS : 50));
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
                COUNT(*) FILTER (WHERE tipo NOT IN ('dwg', 'dxf'))::int AS documentos,
                COALESCE(SUM((resumo->>'simbolos')::int + (resumo->>'blocosAprendidos')::int) FILTER (WHERE resumo ? 'simbolos'), 0)::int AS legenda
           FROM acervo_treino WHERE situacao = 'lido' GROUP BY 1 ORDER BY 2 DESC, 3 DESC`),
      require('./treinoMateriais').resumoDosMateriais(),
    ]);
    return { ...r, porDisciplina, materiais, rodada: situacao() };
  } catch {
    return { lidos: 0, erros: 0, ignorados: 0, escritorios: 0, ultimo: null, porDisciplina: [], materiais: [], rodada: situacao() };
  }
}

module.exports = { treinar, pararTreino, situacao, resumoDoAcervo, listarArquivos, treinarArquivo, paraTestes: { tipoDe, ehPdfDeMateriais } };
