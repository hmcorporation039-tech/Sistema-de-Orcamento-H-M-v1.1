// Treino com as obras já feitas pela H&M (pedido do usuário em 03/11/2026: "vasculhe a pasta clientes, lá temos
// muitos projetos que já foram executados, muitos PDFs e DWG que podem servir de referência e aprendizado").
//
// Percorre a pasta dos clientes (PASTA_CLIENTES, no servidor) SÓ LENDO, e passa cada DWG/DXF pelo MESMO leitor da
// análise de projeto (services/analiseCad). O que o desenho ensina vai para o banco, como numa análise
// (services/aprenderDoDesenho.js): as linhas da legenda (símbolo explodido → tipo e altura), as notas gerais de
// altura do escritório e os nomes de bloco da legenda. Sem IA e sem nada da obra no repositório.
//   - um arquivo por vez (a leitura de CAD tem fila global de 2: a análise de um usuário não espera o treino inteiro);
//   - retoma de onde parou: acervo_treino guarda caminho, tamanho e data de cada arquivo lido, e só o que mudou é relido;
//   - tempo-limite por rodada (a rotina das 06:00 e das 18:00 lê por até 2 h e continua na próxima).
// Rodar à mão: node scripts/treinar-acervo.js (ver o script) ou o botão "Executar agora" da rotina em Integrações.
const crypto = require('crypto');
const fsp = require('fs/promises');
const path = require('path');
const pool = require('../config/database');
const { RAIZ_CLIENTES_SERVIDOR } = require('./pastasSistema');

const RE_CAD = /\.(dwg|dxf)$/i;
// pastas do próprio sistema que não são obra (lixeira, reserva local) e pastas ocultas
const RE_PASTA_FORA = /^(_Exclu[ií]dos|_Aguardando servidor|\.|~\$)/i;
const MAIOR_ARQUIVO = 120 * 1024 * 1024; // DWG maior que isso costuma ser modelo 3D ou nuvem de pontos: não ensina símbolo
const PAUSA_MS = 300; // folga entre um arquivo e outro: o treino não monopoliza o processador

const estado = { rodando: false, parar: false, iniciadoEm: null, terminadoEm: null, total: 0, pendentes: 0, feitos: 0, lidos: 0, erros: 0, atual: null, ensinou: { simbolos: 0, notas: 0, blocos: 0 }, mensagem: null };
const situacao = () => ({ ...estado, ensinou: { ...estado.ensinou } });

async function listarArquivos(raiz, acc = []) {
  let itens;
  try { itens = await fsp.readdir(raiz, { withFileTypes: true }); } catch { return acc; }
  for (const it of itens) {
    const p = path.join(raiz, it.name);
    if (it.isDirectory()) { if (!RE_PASTA_FORA.test(it.name)) await listarArquivos(p, acc); continue; }
    if (it.isFile() && RE_CAD.test(it.name)) {
      try { const st = await fsp.stat(p); acc.push({ caminho: p, tamanho: st.size, modificado: st.mtime }); } catch { /* sumiu no meio da varredura */ }
    }
  }
  return acc;
}

async function gravar(arq, raiz, situacaoArq, resumo, hash = null) {
  await pool.query(
    `INSERT INTO acervo_treino (caminho, tamanho, modificado_em, tipo, situacao, resumo, hash) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (caminho) DO UPDATE SET tamanho = EXCLUDED.tamanho, modificado_em = EXCLUDED.modificado_em, situacao = EXCLUDED.situacao,
       resumo = EXCLUDED.resumo, hash = EXCLUDED.hash, lido_em = NOW()`,
    [path.relative(raiz, arq.caminho), arq.tamanho, arq.modificado, path.extname(arq.caminho).slice(1).toLowerCase(), situacaoArq, JSON.stringify(resumo), hash]);
}

// Lê um arquivo e registra o que ele ensina. `ler` e `aprender` vêm de fora nos testes. A cópia idêntica de um
// arquivo já lido (mesmo conteúdo em outra pasta) não ensina de novo: `{ copiaDe }`.
async function treinarArquivo(arq, { ler, aprender, buffer: dado }) {
  const buffer = dado || await fsp.readFile(arq.caminho);
  const nome = path.basename(arq.caminho);
  const r = await ler(buffer, nome);
  const ensinou = await aprender(r, nome);
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
    disciplinas: (r.analise?.disciplinasDetectadas || []).map(d => d.chave || d).slice(0, 8),
  };
}

// opcoes: { raiz, tempoMaxMs, limite, ler, aprender } → resumo da rodada
async function treinar(opcoes = {}) {
  if (estado.rodando) return { ...situacao(), jaRodando: true };
  const raiz = opcoes.raiz || RAIZ_CLIENTES_SERVIDOR;
  const ler = opcoes.ler || ((buffer, nome) => require('./analiseCad').lerArquivoCad(buffer, nome, { disciplinas: [] }));
  const aprender = opcoes.aprender || require('./aprenderDoDesenho').registrarLeitura;
  const fim = Date.now() + (opcoes.tempoMaxMs || 2 * 3600 * 1000);
  Object.assign(estado, { rodando: true, parar: false, iniciadoEm: new Date(), terminadoEm: null, total: 0, pendentes: 0, feitos: 0, lidos: 0, erros: 0, atual: null, ensinou: { simbolos: 0, notas: 0, blocos: 0 }, mensagem: 'listando os arquivos da pasta dos clientes' });
  try {
    const todos = await listarArquivos(raiz);
    const { rows } = await pool.query('SELECT caminho, tamanho, modificado_em FROM acervo_treino');
    const ja = new Map(rows.map(r => [r.caminho, r]));
    const pendentes = todos.filter((a) => {
      const j = ja.get(path.relative(raiz, a.caminho));
      return !j || Number(j.tamanho) !== a.tamanho || Math.abs(new Date(j.modificado_em) - a.modificado) > 2000;
    }).sort((a, b) => b.modificado - a.modificado); // as obras mais recentes primeiro: o costume atual dos escritórios
    Object.assign(estado, { total: todos.length, pendentes: pendentes.length, mensagem: null });
    for (const arq of pendentes.slice(0, opcoes.limite || Infinity)) {
      if (estado.parar || Date.now() > fim) break;
      estado.atual = path.relative(raiz, arq.caminho);
      if (arq.tamanho > MAIOR_ARQUIVO) {
        await gravar(arq, raiz, 'erro', { erro: `arquivo de ${Math.round(arq.tamanho / 1048576)} MB: grande demais para o treino` });
        estado.erros++; estado.feitos++;
        continue;
      }
      try {
        const buffer = await fsp.readFile(arq.caminho);
        const hash = crypto.createHash('sha1').update(buffer).digest('hex');
        const { rows: [copia] } = await pool.query(`SELECT caminho FROM acervo_treino WHERE hash = $1 AND situacao = 'lido' AND caminho <> $2 LIMIT 1`, [hash, path.relative(raiz, arq.caminho)]);
        if (copia) {
          await gravar(arq, raiz, 'lido', { copiaDe: copia.caminho }, hash);
          estado.lidos++; estado.feitos++;
          continue;
        }
        const resumo = await treinarArquivo(arq, { ler, aprender, buffer });
        await gravar(arq, raiz, 'lido', resumo, hash);
        estado.lidos++;
        for (const k of ['simbolos', 'notas', 'blocos']) estado.ensinou[k] += Number(resumo[k === 'blocos' ? 'blocosAprendidos' : k]) || 0;
      } catch (e) {
        await gravar(arq, raiz, 'erro', { erro: String(e.message || e).slice(0, 300) }).catch(() => {});
        estado.erros++;
      }
      estado.feitos++;
      await new Promise(r => setTimeout(r, PAUSA_MS));
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

// Para o painel: quantos arquivos do acervo já foram lidos e o que ensinaram (sem varrer a pasta de novo)
async function resumoDoAcervo() {
  try {
    const { rows: [r] } = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE situacao = 'lido')::int AS lidos, COUNT(*) FILTER (WHERE situacao = 'erro')::int AS erros,
              COUNT(DISTINCT NULLIF(resumo->>'escritorio', ''))::int AS escritorios, MAX(lido_em) AS ultimo
         FROM acervo_treino`);
    return { ...r, rodada: situacao() };
  } catch {
    return { lidos: 0, erros: 0, escritorios: 0, ultimo: null, rodada: situacao() };
  }
}

module.exports = { treinar, pararTreino, situacao, resumoDoAcervo, listarArquivos, treinarArquivo };
