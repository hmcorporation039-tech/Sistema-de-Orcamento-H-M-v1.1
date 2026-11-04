// Placar de precisão da leitura de PDF e DWG (fase 3 do roteiro): lê os projetos reais da pasta de fixtures
// (FORA do repositório) e compara com a contagem conferida pelo engenheiro (gabarito.json de cada projeto).
// Formato do gabarito e da pasta: docs/PLACAR-PRECISAO.md.
//
//   node scripts/placar-precisao.js                     placar de todos os projetos conferidos
//   node scripts/placar-precisao.js --json placar.json  grava também o resultado completo
//   node scripts/placar-precisao.js --rascunhos         inclui os gabaritos ainda não conferidos ("conferido": false)
//   node scripts/placar-precisao.js --com-aprendizado   lê com o que o sistema APRENDEU (banco): legenda, notas e blocos do
//                                                        DWG e a legenda de PDF do escritório — roda o placar sem e com
//                                                        para medir o ganho do treino (versão 2.30)
//   node scripts/placar-precisao.js --modelo "<pasta do projeto>" [arquivo …]
//                                                        grava gabarito.rascunho.json com o que o sistema leu
//                                                        hoje, para o engenheiro corrigir e renomear para gabarito.json
// Pasta: variável HM_PLACAR_PASTA ou, sem ela, "<pasta acima do repositório>/Placar de precisao".
// Sem --com-aprendizado não usa o banco (o aprendizado do escritório fica de fora: o placar mede o leitor). Cada
// mudança de leitor roda o placar antes de subir (roteiro, fase 3 item 7). Com --com-aprendizado, os arquivos do
// placar NÃO podem estar na pasta que o treino lê (o gabarito viraria treino — a medida perde o sentido).
const fs = require('fs');
const path = require('path');
const { RAIZ_REPOSITORIO } = require('../src/config/caminhos');
const { leituraDoProjeto, compararComGabarito, errosDoGabarito } = require('../src/utils/placarPrecisao');

const PASTA_PADRAO = path.join(RAIZ_REPOSITORIO, '..', 'Placar de precisao');
const pastaDoPlacar = () => process.env.HM_PLACAR_PASTA || PASTA_PADRAO;
const RE_CAD = /\.(dwg|dxf)$/i;

// lê os arquivos do projeto como a análise lê (sem banco): DWG/DXF pela análise de CAD, PDF pela leitura vetorial
// sabido: null (só o leitor) ou { cad: aprenderDoDesenho.conhecimento(), pdfDoEscritorio: (escritorio) → legenda aprendida }
async function lerProjeto(pasta, arquivos, sabido = null) {
  const { lerArquivoCad } = require('../src/services/analiseCad');
  const { lerPdfVetorial } = require('../src/utils/pdfVetorial');
  const { analisarProjeto } = require('../src/utils/projetoParser');
  const { detectarDisciplinas } = require('../src/utils/leitoresTabelaProjeto');
  const paginas = [];
  let ambientes = [];
  // disciplina do item como o orçamento decide (utils/analiseProjetoItens): a do desenho; sem ela, a do texto (PDF)
  // ou a 1ª marcada no arquivo
  const comDisciplina = (pag, marcadas, doTexto) => ({ ...pag, itens: (pag.itens || []).map(it => ({ ...it, disciplina: it.disciplina || (doTexto ? detectarDisciplinas(it.descricao || '')[0]?.chave : null) || marcadas[0] || null })) });
  const avisos = [];
  for (const a of arquivos) {
    const caminho = path.join(pasta, a.arquivo);
    if (!fs.existsSync(caminho)) { avisos.push(`arquivo não encontrado: ${a.arquivo}`); continue; }
    const buffer = fs.readFileSync(caminho);
    if (RE_CAD.test(a.arquivo)) {
      const r = await lerArquivoCad(buffer, a.arquivo, { ...(sabido?.cad || {}), disciplinas: a.disciplinas || [] });
      paginas.push(comDisciplina(r.pagina, a.disciplinas || [], false));
      if ((r.analise.ambientes || []).length > ambientes.length) ambientes = r.analise.ambientes;
    } else {
      let an = null;
      try { an = await analisarProjeto(buffer, a.arquivo); } catch (e) { avisos.push(`texto de "${a.arquivo}" não lido: ${e.message}`); }
      let legendaAprendida = [];
      if (sabido?.pdfDoEscritorio && an) {
        const { escritorioDoPdf } = require('../src/utils/escritorioDoProjeto');
        legendaAprendida = await sabido.pdfDoEscritorio(escritorioDoPdf(an.carimbo, (an.textoPorPagina || []).join('\n'), a.arquivo));
      }
      const pags = await lerPdfVetorial(buffer, { nomeArquivo: a.arquivo, maxPaginas: 15, legendaAprendida, ...(Number(a.escala) > 0 ? { escala: Number(a.escala) } : {}) });
      paginas.push(...pags.filter(p => !p.ignorada).map(p => comDisciplina(p, a.disciplinas || [], true)));
      if (an && (an.ambientes || []).length > ambientes.length) ambientes = an.ambientes;
    }
  }
  return { leitura: leituraDoProjeto({ paginas, ambientes }), avisos };
}

// todos os projetos da pasta (subpastas com gabarito.json). Devolve { pulado?, projetos: [...], total }
async function rodarPlacar({ pasta = pastaDoPlacar(), rascunhos = false, comAprendizado = false } = {}) {
  if (!fs.existsSync(pasta)) return { pulado: `pasta de fixtures não existe (${pasta}) — defina HM_PLACAR_PASTA`, projetos: [] };
  let sabido = null;
  if (comAprendizado) {
    const legendas = require('../src/services/legendasPdfAprendidas');
    const cache = new Map();
    sabido = {
      cad: await require('../src/services/aprenderDoDesenho').conhecimento(),
      pdfDoEscritorio: async (e) => { if (!e) return []; if (!cache.has(e)) cache.set(e, await legendas.carregar(e)); return cache.get(e); },
    };
  }
  const projetos = [];
  for (const nome of fs.readdirSync(pasta).sort()) {
    const dir = path.join(pasta, nome);
    const arqGab = path.join(dir, 'gabarito.json');
    if (!fs.statSync(dir).isDirectory() || !fs.existsSync(arqGab)) continue;
    let gab;
    try { gab = JSON.parse(fs.readFileSync(arqGab, 'utf8')); } catch (e) { projetos.push({ projeto: nome, erro: `gabarito.json inválido: ${e.message}` }); continue; }
    if (gab.conferido === false && !rascunhos) { projetos.push({ projeto: gab.projeto || nome, pulado: 'gabarito ainda não conferido ("conferido": false)' }); continue; }
    const erros = errosDoGabarito(gab);
    if (erros.length) { projetos.push({ projeto: gab.projeto || nome, erro: erros.join('; ') }); continue; }
    const t0 = Date.now();
    try {
      const { leitura, avisos } = await lerProjeto(dir, gab.arquivos, sabido);
      projetos.push({ projeto: gab.projeto || nome, ms: Date.now() - t0, ...compararComGabarito(leitura, gab), ...(avisos.length ? { avisos } : {}) });
    } catch (e) { projetos.push({ projeto: gab.projeto || nome, erro: e.message }); }
  }
  const medidos = projetos.filter(p => p.geral?.total != null);
  const media = (k) => { const v = medidos.map(p => p.geral[k]).filter(x => x != null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null; };
  return { pasta, comAprendizado, projetos, total: { projetos: medidos.length, simbolos: media('simbolos'), metros: media('metros'), ambientes: media('ambientes'), total: media('total') } };
}

const fmt = (v) => (v == null ? '—' : `${String(v).replace('.', ',')} %`);
function imprimir(r) {
  if (r.pulado) { console.log(`placar de precisão: pulado — ${r.pulado}`); return; }
  for (const p of r.projetos) {
    if (p.pulado || p.erro) { console.log(`\n■ ${p.projeto}: ${p.pulado ? `pulado — ${p.pulado}` : `ERRO — ${p.erro}`}`); continue; }
    console.log(`\n■ ${p.projeto}  (geral ${fmt(p.geral.total)} — símbolos ${fmt(p.geral.simbolos)}, metros ${fmt(p.geral.metros)}, ambientes ${fmt(p.geral.ambientes)}; ${Math.round(p.ms / 100) / 10} s)`);
    for (const s of p.simbolos) console.log(`   ${s.acerto === 100 ? '✓' : '✗'} ${(s.disciplina || '').padEnd(14)} ${String(s.tipo).slice(0, 40).padEnd(40)} esperado ${String(s.esperado).padStart(4)}  lido ${String(s.lido).padStart(4)}${s.aConferir ? ` (${s.aConferir} a conferir)` : ''}  ${fmt(s.acerto)}`);
    for (const t of p.trechos) console.log(`   ${t.acerto >= 95 ? '✓' : '✗'} ${(t.disciplina || '').padEnd(14)} ${`${t.tipo}${t.layer ? ` (${t.layer})` : ''}`.slice(0, 40).padEnd(40)} esperado ${String(t.esperado_m).padStart(6)} m  lido ${String(t.lido_m).padStart(6)} m  ${fmt(t.acerto)}`);
    if (p.ambientes) console.log(`   ambientes: ${p.ambientes.porNome.filter(a => a.achado).length}/${p.ambientes.porNome.length} achados${p.ambientes.quantidade ? `, ${p.ambientes.quantidade.lido} lidos de ${p.ambientes.quantidade.esperado}` : ''}  ${fmt(p.ambientes.acerto)}`);
    console.log(`   por disciplina: ${Object.entries(p.porDisciplina).map(([d, v]) => `${d} ${fmt(v)}`).join(' · ')}`);
    for (const a of p.avisos || []) console.log(`   aviso: ${a}`);
  }
  console.log(`\nPLACAR${r.comAprendizado ? ' COM O APRENDIZADO' : ''} (${r.total.projetos} projeto(s) conferido(s)): geral ${fmt(r.total.total)} — símbolos ${fmt(r.total.simbolos)}, metros ${fmt(r.total.metros)}, ambientes ${fmt(r.total.ambientes)}`);
}

// rascunho do gabarito a partir do que o sistema lê hoje (o engenheiro corrige os números e renomeia)
async function gravarModelo(pasta, arquivos) {
  const lista = arquivos.length ? arquivos : fs.readdirSync(pasta).filter(n => /\.(pdf|dwg|dxf)$/i.test(n));
  const { leitura } = await lerProjeto(pasta, lista.map(arquivo => ({ arquivo, disciplinas: [] })));
  const porDesc = new Map();
  for (const s of leitura.simbolos) {
    const k = `${s.disciplina}|${s.descricao.replace(/ — bloco .*/, '').slice(0, 60)}`;
    const g = porDesc.get(k) || porDesc.set(k, { disciplina: s.disciplina || '', tipo: s.descricao.replace(/ — bloco .*/, '').slice(0, 60), busca: s.descricao.replace(/ — bloco .*/, '').slice(0, 40).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), quantidade: 0 }).get(k);
    g.quantidade += s.quantidade;
  }
  const porTrecho = new Map();
  for (const t of leitura.trechos) {
    const k = `${t.disciplina}|${t.tipo}`;
    const g = porTrecho.get(k) || porTrecho.set(k, { disciplina: t.disciplina || '', tipo: t.tipo, metros: 0 }).get(k);
    g.metros = Math.round((g.metros + t.metros) * 10) / 10;
  }
  const rascunho = {
    projeto: path.basename(pasta), conferido: false, conferido_por: '', conferido_em: '',
    observacao: 'RASCUNHO com o que o sistema leu — confira cada número na planta, ajuste e mude "conferido" para true; depois renomeie para gabarito.json',
    arquivos: lista.map(arquivo => ({ arquivo, disciplinas: [] })),
    simbolos: [...porDesc.values()], trechos: [...porTrecho.values()],
    ambientes: { quantidade: leitura.ambientes.length, lista: leitura.ambientes.map(a => ({ nome: a.nome, ...(a.area_m2 ? { area_m2: a.area_m2 } : {}) })) },
  };
  const destino = path.join(pasta, 'gabarito.rascunho.json');
  fs.writeFileSync(destino, JSON.stringify(rascunho, null, 2));
  return destino;
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const val = (k) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : null);
    if (val('--modelo')) {
      const destino = await gravarModelo(path.resolve(val('--modelo')), args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--modelo' && args[i - 1] !== '--json'));
      console.log(`rascunho gravado em ${destino} — confira, ajuste e renomeie para gabarito.json`);
      return;
    }
    const r = await rodarPlacar({ rascunhos: args.includes('--rascunhos'), comAprendizado: args.includes('--com-aprendizado') });
    imprimir(r);
    if (val('--json')) fs.writeFileSync(path.resolve(val('--json')), JSON.stringify(r, null, 2));
    if (args.includes('--com-aprendizado')) await require('../src/config/database').end().catch(() => {});
  })().catch((e) => { console.error(`ERRO: ${e.message}`); process.exitCode = 1; });
}

module.exports = { rodarPlacar, lerProjeto, gravarModelo, pastaDoPlacar, PASTA_PADRAO };
