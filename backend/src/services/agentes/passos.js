// Passos de cada agente próprio (o QUE cada um faz; a fila, o estado e o registro ficam em executor.js e a
// definição em dados, em registro.js). Tudo determinístico: as ferramentas internas (ferramentasInternas.js) chamam
// os motores do sistema; nenhum passo chama IA. Quando falta algo que só a pessoa (ou a IA) resolve, o agente PARA
// com a pendência (ctx.parar) e, se for o caso, diz que a IA pode ajudar (ctx.precisaIa) — o usuário decide.
//
// ctx (executor.js): entrada, texto (pedido original), f (ferramentas), passo(chave, fn), pular(chave, motivo),
//   secao(titulo, linhas), pendencia(texto), link(rotulo, link), arquivo(registro), dado(chave, valor),
//   parar({ status, motivo, pergunta }), precisaIa(motivo), log(texto), cancelado()
const { DISCIPLINAS } = require('../../utils/disciplinasProjeto');
const { DISCIPLINAS_LAUDO } = require('../../utils/disciplinasLaudo');
const { disciplinaDoTexto } = require('../../utils/disciplinaDoArquivo');
const P = require('./planilhaPrecos');
const R = require('./respostas');
const adaptadorQuadros = require('./adaptadorQuadros');
const { linhasDoObjetivo, nomeDisciplina } = require('./objetivoResumo');

const CHAVES_ANALISE = new Set(DISCIPLINAS.map(d => d.chave));
const CHAVES_PROJETO = new Set(DISCIPLINAS_LAUDO.map(d => d.chave));
const REGISTRO = (() => { try { return require('../../../../skills/_comum/disciplinas.js').DISCIPLINAS || []; } catch { return []; } })();
// chave da análise → chave da skill de projeto (rede → cabeamento: registro único skills/_comum/disciplinas.js)
const disciplinaDaSkill = (c) => { const d = REGISTRO.find(x => x.chave === c); return d?.skill || c; };
const MAX_ITENS_PRECO = 150;
const MAX_PESQUISAS_WEB = 8;
const CONFERIR = /\[CONFERIR\]|conferir/i;
const cortar = (t, n = 220) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n)}…` : s; };
const { moedaTexto } = require('../../utils/moeda'); // fonte única (2.38)
const brl = (v) => moedaTexto(v, { vazio: '—' });
const hoje = () => require('../../utils/dataHoje').hojeBrasilia();

// suporte: { tipo: 'dado_faltando' | 'regra_ausente' | 'pergunta_tecnica', pergunta, disciplina? } — o executor pede
// SUPORTE Claude Max com essa pergunta (depois de olhar a base de conhecimento aprovada), se estiver ligado
class Parada extends Error {
  constructor({ status = 'pendente', motivo = '', pergunta = null, suporte = null } = {}) { super(motivo); this.parada = true; this.status = status; this.pergunta = pergunta; this.suporte = suporte; }
}

// Disciplinas de um arquivo sem IA: pedido explícito → nome do arquivo → texto do PDF
async function deduzirDisciplinas(ctx, arquivoId, pedidas) {
  const validas = (pedidas || []).filter(d => CHAVES_ANALISE.has(d));
  if (validas.length) return { disciplinas: validas, origem: 'informadas' };
  const reg = await ctx.f.arquivoDaConversa(arquivoId);
  const doNome = disciplinaDoTexto(String(reg.nome_original || '').replace(/\.[^.]+$/, ''), { caminho: true });
  if (doNome?.chave) return { disciplinas: (doNome.chaves || [doNome.chave]).filter(d => CHAVES_ANALISE.has(d)), origem: 'nome do arquivo' };
  if (reg.tipo === 'pdf') {
    const resumo = await ctx.f.resumoDoArquivo(arquivoId).catch(() => null);
    const det = (resumo?.disciplinasDetectadas || []).map(d => d.chave).filter(d => CHAVES_ANALISE.has(d));
    if (det.length) return { disciplinas: det.slice(0, 2), origem: 'texto do PDF' };
  }
  return { disciplinas: [], origem: null };
}

function perguntaDisciplina(contexto) {
  return `Qual a disciplina${contexto ? ` ${contexto}` : ''}? Ex.: elétrica, CFTV, cabeamento, incêndio, SPDA, média tensão, quadros, climatização. Responda, por exemplo, "analise este arquivo de CFTV".`;
}

// disciplinas com que o agente analisou o arquivo e de onde vieram (informadas no pedido ou deduzidas): o passo
// 'disciplinas' só amplia a análise quando o usuário NÃO disse quais queria
const DEDUZIDAS = new WeakMap();
async function garantirAnalise(ctx, chavePasso, { finalidade }) {
  const e = ctx.entrada;
  if (e.analise_id && !e.arquivo_id) {
    let a;
    await ctx.passo(chavePasso, async () => { a = await ctx.f.verAnalise(e.analise_id); return `Análise #${a.id} já salva (${(a.disciplinas || []).join(', ') || 'sem disciplina'}) — lida sem refazer.`; });
    return a;
  }
  if (!e.arquivo_id) return null;
  let a;
  await ctx.passo(chavePasso, async () => {
    const { disciplinas, origem } = await deduzirDisciplinas(ctx, e.arquivo_id, e.disciplinas || (e.disciplina ? [e.disciplina] : []));
    if (!disciplinas.length) {
      const reg = await ctx.f.arquivoDaConversa(e.arquivo_id).catch(() => null);
      throw new Parada({ motivo: 'Não deu para saber a disciplina pelo nome nem pelo texto do arquivo.', pergunta: perguntaDisciplina('do projeto'),
        suporte: { tipo: 'dado_faltando', pergunta: `O arquivo "${reg?.nome_original || e.arquivo_id}" (${reg?.tipo || '?'}) chegou para análise sem disciplina no nome nem no texto. Como identificar a disciplina dele (use ler_arquivo com o id ${e.arquivo_id}) e que regra de nome/conteúdo o agente deveria usar?` } });
    }
    a = await ctx.f.analisarArquivo({ arquivo_id: e.arquivo_id, disciplinas, finalidade, obra_id: e.obra_id });
    DEDUZIDAS.set(ctx, { disciplinas, origem, finalidade });
    ctx.dado('analise_id', a.id);
    return `Análise #${a.id} criada (${finalidade === 'elaboracao' ? 'elaboração' : 'orçamento'}) — disciplinas ${disciplinas.join(', ')} (pelo ${origem}).`;
  });
  return a;
}

// ── 1. Análise de projeto ───────────────────────────────────────────────────
async function analiseProjeto(ctx) {
  const e = ctx.entrada;
  let a = await garantirAnalise(ctx, 'analisar', { finalidade: e.finalidade || 'orcamento' });
  if (!a) throw new Parada({ motivo: 'Falta o arquivo do projeto.', pergunta: 'Anexe o PDF, DWG ou DXF do projeto (ou abra a análise na tela) e peça de novo.' });
  const L = require('./planilhaLevantamento');

  // DISCIPLINAS PELO DESENHO (20/11/2026): sem disciplina no pedido, o agente deduz pelo nome do arquivo — e o desenho
  // pode ter mais. LACE-LAB: "elétrica" pelo nome, mas 88 luminárias e 6 de emergência ficavam fora do orçamento.
  // Pedido sem disciplina → a análise é refeita com as do desenho (≥ 3 pontos); disciplina informada → só avisa.
  const deduzidas = DEDUZIDAS.get(ctx);
  const sugeridas = L.disciplinasSugeridas(L.contagemDaAnalise(a));
  if (deduzidas && deduzidas.origem !== 'informadas' && sugeridas.length) {
    await ctx.passo('disciplinas', async () => {
      const todas = [...new Set([...deduzidas.disciplinas, ...sugeridas.map(s => s.chave)])];
      const anterior = a.id;
      a = await ctx.f.analisarArquivo({ arquivo_id: e.arquivo_id, disciplinas: todas, finalidade: deduzidas.finalidade, obra_id: e.obra_id });
      ctx.dado('analise_id', a.id);
      ctx.log(`análise #${anterior} refeita como #${a.id} com ${todas.join(', ')}`);
      return `O desenho também tem ${sugeridas.map(s => `${s.nome} (${s.pontos} ponto(s))`).join(', ')}: análise refeita como #${a.id} com ${todas.join(', ')} (a #${anterior} continua salva).`;
    });
  } else ctx.pular('disciplinas', !sugeridas.length ? 'o desenho não tem pontos de outra disciplina' : 'disciplinas informadas no pedido — as outras do desenho ficam como aviso');

  ctx.link(`Análise de projeto #${a.id}`, `/obras/analise/${a.id}`);
  ctx.dado('analise_id', a.id);

  await ctx.passo('objetivo', async () => {
    const { linhas, pendencias, objetivos } = linhasDoObjetivo(a);
    ctx.secao('O que é o projeto', linhas);
    pendencias.forEach(p => ctx.pendencia(p));
    ctx.dado('objetivo', objetivos.map(o => ({ disciplina: o.disciplina, tipo: o.tipo, tipoRotulo: o.tipoRotulo, confianca: o.confianca })));
    return objetivos.length ? `${objetivos.map(o => o.tipoRotulo || o.tipo).join(', ')}` : 'leitura do PDF (sem objetivo de CAD)';
  });

  await ctx.passo('achados', async () => {
    const linhas = [];
    const achados = a.achados || [];
    for (const x of achados.slice(0, 12)) linhas.push(`- **${cortar(x.tema, 60)}**: ${cortar(x.observacao, 220)}`);
    if (achados.length > 12) linhas.push(`- … mais ${achados.length - 12} achado(s) na tela da análise`);
    const serv = (a.servicos || []).filter(s => !s.pronto);
    const mat = (a.materiais || []).filter(m => !m.pronto);
    const semCatalogo = mat.filter(m => m.preco_catalogo == null).length;
    linhas.unshift(`- ${(a.ambientes || []).length} ambiente(s), ${serv.length} serviço(s) e ${mat.length} material(is) levantados${semCatalogo ? ` (${semCatalogo} sem correspondência no catálogo — ficarão a cotar)` : ''}.`);
    ctx.secao('Achados', linhas);
    for (const d of a.dadosExtraidos || []) {
      for (const parte of String(d?.aviso || '').split(/;\s+/).filter(t => CONFERIR.test(t))) ctx.pendencia(parte.startsWith('[CONFERIR]') ? cortar(parte, 240) : `[CONFERIR] ${cortar(parte, 240)}`);
    }
    const nadaLido = !serv.length && !mat.length && !(a.ambientes || []).length;
    const semTexto = (a.dadosExtraidos || []).some(d => d?.semTexto || /sem texto|escaneado/i.test(String(d?.aviso || '')));
    if (nadaLido) {
      ctx.pendencia('[CONFERIR] a leitura local não achou pontos nem materiais neste arquivo.');
      if (semTexto) ctx.precisaIa('O PDF parece escaneado (sem texto): a IA pode enriquecer a análise lendo a imagem — só sugere, tudo fica a conferir.');
    }
    return `${achados.length} achado(s), ${mat.length} material(is), ${serv.length} serviço(s)`;
  });

  // CONTAGEM DE PONTOS e LEVANTAMENTO no padrão H&M (20/11/2026): antes a resposta só dizia quantos itens havia;
  // agora mostra o que foi contado (item, quantidade, origem) e entrega a planilha de quantitativos
  let contagem = [];
  await ctx.passo('contagem', async () => {
    contagem = L.contagemDaAnalise(a);
    const marcadas = contagem.filter(c => c.marcada !== false);
    const fora = contagem.filter(c => c.marcada === false);
    const fmt = (q) => Number(q).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    const linhas = [];
    if (marcadas.length) {
      linhas.push('| Disciplina | Item | Qtd | Un | |', '|---|---|---:|---|---|');
      for (const c of marcadas.slice(0, 30)) linhas.push(`| ${L.nomeDisc(c.disciplina).replace(/\s*\(.*\)$/, '')} | ${cortar(c.descricao, 70).replace(/\|/g, '/')} | ${fmt(c.quantidade)} | ${c.unidade} | ${c.conferir ? '⚠ conferir' : ''} |`);
      if (marcadas.length > 30) linhas.push(`| | … mais ${marcadas.length - 30} linha(s) na planilha | | | |`);
    } else linhas.push('- Nenhum ponto contado nas disciplinas marcadas.');
    const noMapa = marcadas.filter(c => c.pendenteMapa && c.unidade === 'un').reduce((s, c) => s + c.quantidade, 0);
    if (noMapa) {
      // quantas linhas do mapa dá para aceitar em um clique (tipo da legenda / layer que diz o tipo, texto coerente)
      let seguras = 0, aConferir = 0;
      try {
        const { linhasSeguras } = require('../mapaCad');
        for (const d of a.dadosExtraidos || []) {
          if (!d?.mapa_cad?.simbolos) continue;
          const s = linhasSeguras(d.mapa_cad);
          seguras += s.seguras.reduce((t, l) => t + (d.mapa_cad.simbolos[l.idx]?.contados || 0), 0);
          aConferir += s.aConferir.reduce((t, l) => t + (d.mapa_cad.simbolos[l.idx]?.contados || 0), 0);
        }
      } catch { /* sem o mapa: fica a mensagem geral */ }
      linhas.push('', `- ${fmt(noMapa)} ponto(s) foram lidos de símbolos explodidos e **aguardam a conferência no mapa do CAD** ([análise #${a.id}](/obras/analise/${a.id}) → mapa do CAD): só depois entram no orçamento.`
        + (seguras ? ` **${fmt(seguras)} deles vêm da legenda do próprio desenho** — o botão "Aceitar as da legenda e reprocessar" põe todos no orçamento em um clique${aConferir ? `; ${fmt(aConferir)} ficam para conferir um a um` : ''}.` : ''));
      ctx.pendencia(`[CONFERIR] ${fmt(noMapa)} ponto(s) do desenho aguardam a conferência no mapa do CAD da análise #${a.id} para entrar no orçamento${seguras ? ` (${fmt(seguras)} aceitáveis em um clique pela legenda)` : ''}.`);
    }
    // disciplina marcada sem nenhum ponto lido: arquivo de outra disciplina, ou leitura que falhou
    const zeradas = L.disciplinasZeradas(a, contagem);
    if (zeradas.length && marcadas.length) {
      linhas.push('', `- Nenhum ponto de **${zeradas.map(L.nomeDisc).join(', ')}** foi lido, embora a disciplina esteja marcada: confira se o arquivo é dessa disciplina.`);
      ctx.pendencia(`[CONFERIR] disciplina marcada sem nenhum ponto lido: ${zeradas.map(L.nomeDisc).join(', ')}.`);
    }
    // CONFERÊNCIA VISUAL (20/11/2026): a IA não refaz a contagem — só olha onde o sistema tem dúvida
    const duvidas = [];
    if (noMapa) duvidas.push(`${fmt(noMapa)} ponto(s) de símbolo explodido ainda sem conferência`);
    const implausiveis = marcadas.filter(c => /implaus/i.test(c.descricao));
    if (implausiveis.length) duvidas.push(`${implausiveis.length} medida(s) de infraestrutura marcadas como implausíveis`);
    if (zeradas.length) duvidas.push(`disciplina sem ponto lido (${zeradas.map(L.nomeDisc).join(', ')})`);
    if (duvidas.length) ctx.precisaIa(`Conferência visual: o Claude pode olhar a prancha e conferir só as dúvidas da contagem — ${duvidas.join('; ')}. Ele não refaz a contagem; o que ele apontar entra como [CONFERIR] na análise #${a.id} (ferramenta enriquecer_analise_projeto).`);
    if (fora.length) {
      const porDisc = new Map();
      fora.forEach(c => porDisc.set(c.disciplina, (porDisc.get(c.disciplina) || 0) + (c.unidade === 'un' ? c.quantidade : 0)));
      linhas.push('', `- O desenho também tem ${[...porDisc].map(([d, q]) => `${fmt(q)} ponto(s) de ${L.nomeDisc(d).replace(/\s*\(.*\)$/, '')}`).join(', ')}, que **não entram no orçamento** porque a disciplina não foi marcada. Para incluir, peça de novo marcando a disciplina (ex.: "analise elétrica e iluminação").`);
      ctx.pendencia(`[CONFERIR] itens de disciplina não marcada no desenho (${[...porDisc.keys()].map(L.nomeDisc).join(', ')}) ficaram fora do orçamento.`);
    }
    ctx.secao('Contagem de pontos', linhas);
    ctx.dado('contagem', contagem.slice(0, 300).map(({ disciplina, descricao, quantidade, unidade, conferir, marcada }) => ({ disciplina, descricao, quantidade, unidade, conferir, marcada })));
    const un = marcadas.filter(c => c.unidade === 'un').reduce((s, c) => s + c.quantidade, 0);
    return `${fmt(un)} ponto(s) em ${marcadas.length} tipo(s)${fora.length ? ` + ${fora.length} tipo(s) de disciplina não marcada` : ''}`;
  });

  await ctx.passo('planilha', async () => {
    const buffer = await L.gerarPlanilhaLevantamento({ analise: a, contagem });
    const nome = `Levantamento de quantitativos - ${String(a.nomeProjeto || `Analise ${a.id}`).replace(/[^\w\- ]+/g, '').slice(0, 60) || `Analise ${a.id}`} - ${hoje()}.xlsx`;
    const salvo = await ctx.f.salvarArquivo(nome, buffer, 'xlsx');
    if (salvo) ctx.arquivo(salvo);
    return salvo ? 'planilha padrão H&M (contagem, ambientes, serviços, materiais, pendências)' : 'a conversa não guardou o arquivo';
  });

  if (e.mostrar_3d) {
    await ctx.passo('modelo3d', async () => {
      const s = await ctx.f.situacao3d('analise', a.id);
      if (!s.disponivel) { ctx.secao('Modelo 3D', [`- ${s.motivo || 'Sem base para o 3D.'}`]); return 'sem 3D'; }
      ctx.secao('Modelo 3D', [
        `- Pronto, a partir de "${cortar(s.arquivo, 80)}"${(s.disciplinas || []).length ? ` (${s.disciplinas.join(', ')})` : ''}: abra a [análise #${a.id}](/obras/analise/${a.id}) e use o cartão do 3D (abrigo, equipamentos, quadros com fiação F/N/PE, barramentos, manobras e infraestrutura colorida por tipo).`,
        ...(s.aviso ? [`- ${cortar(s.aviso, 200)}`] : []),
      ]);
      return 'disponível';
    });
  } else ctx.pular('modelo3d', 'não pedido');
}

// ── 2. Projeto da disciplina ────────────────────────────────────────────────
async function projetoDisciplina(ctx) {
  const e = ctx.entrada;
  let projetoId = e.projeto_id || null;
  let analise = null;
  if (projetoId) ctx.pular('analise', `projeto #${projetoId} já existe`);
  else {
    analise = await garantirAnalise(ctx, 'analise', { finalidade: 'elaboracao' });
    if (!analise) throw new Parada({ motivo: 'Falta a análise ou o arquivo do projeto.', pergunta: 'Anexe o arquivo do projeto (ou abra a análise/projeto na tela) e peça de novo.' });
    ctx.link(`Análise de projeto #${analise.id}`, `/obras/analise/${analise.id}`);
  }

  let disciplina = null;
  await ctx.passo('disciplina', async () => {
    if (projetoId) { const p = await ctx.f.verProjeto(projetoId); disciplina = p.disciplina; return `${nomeDisciplina(disciplina)} (do projeto #${projetoId})`; }
    const pedida = e.disciplina ? disciplinaDaSkill(e.disciplina) : null;
    const doObjetivo = [...new Set((analise.dadosExtraidos || []).map(d => d?.objetivo?.disciplina).filter(Boolean).map(disciplinaDaSkill))];
    const daAnalise = [...new Set((analise.disciplinas || []).map(disciplinaDaSkill))].filter(d => CHAVES_PROJETO.has(d));
    disciplina = pedida || (doObjetivo.length === 1 ? doObjetivo[0] : null) || (daAnalise.length === 1 ? daAnalise[0] : null);
    if (!disciplina) throw new Parada({ motivo: `A análise tem ${daAnalise.length || 'nenhuma'} disciplina(s) de projeto${daAnalise.length ? ` (${daAnalise.join(', ')})` : ''} e nenhuma foi escolhida.`, pergunta: perguntaDisciplina('do projeto a fazer') });
    if (!CHAVES_PROJETO.has(disciplina)) {
      throw new Parada({ motivo: `"${disciplina}" não tem skill de projeto.`, pergunta: `Disciplinas com projeto: ${[...CHAVES_PROJETO].join(', ')}.`,
        suporte: { tipo: 'regra_ausente', disciplina, pergunta: `Pediram o projeto da disciplina "${disciplina}", que não tem skill de projeto no sistema. Qual skill existente atende (ou como fazer pela tela) e que regra o agente deveria seguir?` } });
    }
    return `${nomeDisciplina(disciplina)}${pedida ? ' (pedida)' : doObjetivo.length === 1 ? ' (pelo objetivo do projeto)' : ' (única da análise)'}`;
  });

  if (projetoId) ctx.pular('projeto', 'já criado');
  else {
    await ctx.passo('projeto', async () => {
      const r = await ctx.f.criarProjetoDeAnalise(analise.id, disciplina);
      projetoId = r.id;
      for (const av of (r.avisos || []).slice(0, 30)) ctx.pendencia(CONFERIR.test(av) ? cortar(av, 240) : `[CONFERIR] ${cortar(av, 240)}`);
      return r.existente ? `a análise já tinha o projeto #${r.id} (existente — usado como está)` : `projeto #${r.id} criado com o formulário preenchido pela análise`;
    });
  }
  ctx.link(`Projeto #${projetoId} — ${nomeDisciplina(disciplina)}`, `/obras?aba=projetos&laudo=${projetoId}`);
  ctx.dado('projeto_id', projetoId);

  await ctx.passo('calculo', async () => {
    let r;
    try { r = await ctx.f.calcularProjeto(projetoId); } catch (err) {
      if (err.status === 400) {
        ctx.precisaIa('O formulário da skill está incompleto para o cálculo; a IA pode sugerir valores típicos [CONFERIR] — ou complete na tela.');
        throw new Parada({ motivo: `O cálculo recusou o formulário: ${cortar(err.message, 300)}`, pergunta: `Complete o formulário do projeto #${projetoId} na tela (ou peça "use a IA para preencher") e peça de novo "calcule o projeto".`,
          suporte: { tipo: 'dado_faltando', disciplina, pergunta: `A skill de ${disciplina} recusou o formulário do projeto #${projetoId}: "${cortar(err.message, 300)}". Que dado falta, de onde ele costuma vir (projeto, norma, valor típico [CONFERIR]) e como preencher? Use ver_projeto e consultar_norma.` } });
      }
      throw err;
    }
    const ind = (r.indicadores || []).slice(0, 14).map(i => `- ${i.rotulo}: **${cortar(i.valor, 80)}**${i.detalhe ? ` — ${cortar(i.detalhe, 120)}` : ''}${i.ok === false ? ' ⚠' : ''}`);
    ctx.secao(`Cálculo pela skill — ${nomeDisciplina(disciplina)}`, ind.length ? ind : ['- (a skill não devolveu indicadores)']);
    for (const i of (r.indicadores || []).filter(x => x.ok === false)) ctx.pendencia(`[CONFERIR] ${i.rotulo}: ${cortar(i.valor, 80)}${i.detalhe ? ` — ${cortar(i.detalhe, 120)}` : ''}`);
    const avisos = (r.textos || []).map(t => cortar(t, 240));
    avisos.filter(t => CONFERIR.test(t)).slice(0, 25).forEach(t => ctx.pendencia(t.startsWith('[CONFERIR]') ? t : `[CONFERIR] ${t}`));
    const outros = avisos.filter(t => !CONFERIR.test(t));
    if (outros.length) ctx.secao('Avisos da skill', outros.slice(0, 12).map(t => `- ${t}`));
    return `${(r.indicadores || []).length} indicador(es), ${avisos.length} aviso(s)`;
  });

  if (e.documentos === false) { ctx.pular('documentos', 'não pedido'); return; }
  await ctx.passo('documentos', async () => {
    const lista = await ctx.f.disciplinasDoTipo('projeto');
    const d = (lista || []).find(x => x.chave === disciplina);
    const preferidos = ['memorial', 'planilha', 'materiais', 'risco'];
    const docs = (d?.documentos || []).filter(x => preferidos.includes(x.tipo)).sort((x, y) => preferidos.indexOf(x.tipo) - preferidos.indexOf(y.tipo)).slice(0, 3);
    if (!docs.length) return 'a skill não tem memorial/planilha de projeto';
    const feitos = [];
    for (const doc of docs) {
      if (ctx.cancelado()) break;
      try {
        const g = await ctx.f.documentoDoProjeto(projetoId, doc.tipo);
        const salvo = await ctx.f.salvarArquivo(g.nome || `${doc.rotulo}.${doc.formato === 'Excel' ? 'xlsx' : 'docx'}`, g.buffer);
        if (salvo) { ctx.arquivo(salvo); feitos.push(doc.rotulo); } else ctx.pendencia(`${doc.rotulo}: formato que a conversa não guarda — baixe na tela do projeto.`);
      } catch (err) { ctx.pendencia(`[CONFERIR] ${doc.rotulo} não foi gerado: ${cortar(err.message, 160)}`); }
    }
    return feitos.length ? feitos.join(', ') : 'nenhum documento gerado';
  });
}

// ── preços: lista de materiais → linhas classificadas ──────────────────────
async function linhasComPreco(ctx, itens, { pesquisarMercado = false, chaveReferencias = 'referencias', chaveMercado = 'mercado' } = {}) {
  const usados = itens.slice(0, MAX_ITENS_PRECO);
  if (itens.length > MAX_ITENS_PRECO) ctx.pendencia(`[CONFERIR] só os primeiros ${MAX_ITENS_PRECO} itens foram pesquisados (a lista tem ${itens.length}).`);
  const refs = new Map();
  await ctx.passo(chaveReferencias, async () => {
    let com = 0;
    for (const [i, it] of usados.entries()) {
      if (ctx.cancelado()) break;
      const r = Number(it.preco_cliente) > 0 ? null : await ctx.f.referenciasDePreco(it.descricao);
      refs.set(i, r);
      if (r) com++;
    }
    return `${com} de ${usados.length} item(ns) com referência própria (sem IA)`;
  });
  const web = new Map();
  const semRef = usados.map((it, i) => ({ it, i })).filter(({ it, i }) => !refs.get(i) && !(Number(it.preco_cliente) > 0));
  if (pesquisarMercado && semRef.length) {
    await ctx.passo(chaveMercado, async () => {
      let ok = 0;
      for (const { it, i } of semRef.slice(0, MAX_PESQUISAS_WEB)) {
        if (ctx.cancelado()) break;
        try { web.set(i, await ctx.f.pesquisarMercado(it.descricao)); ok++; } catch (err) { ctx.log(`pesquisa na web de "${cortar(it.descricao, 60)}" falhou: ${err.message}`); }
      }
      if (semRef.length > MAX_PESQUISAS_WEB) ctx.pendencia(`[CONFERIR] ${semRef.length - MAX_PESQUISAS_WEB} item(ns) sem referência ficaram fora da pesquisa na web (limite de ${MAX_PESQUISAS_WEB} por execução).`);
      return `${ok} pesquisa(s) na web (usa cota, autorizada)`;
    });
  } else ctx.pular(chaveMercado, pesquisarMercado ? 'todos os itens têm referência' : 'pesquisa na web não autorizada (usa cota) — peça "pesquise também na web" para incluir');
  return usados.map((it, i) => ({ ...it, ...P.classificarPreco(it, refs.get(i), web.get(i)), descricao: it.descricao }));
}

function gruposDasLinhas(linhas) {
  const grupos = new Map();
  for (const l of linhas) {
    const g = l.grupo || 'Materiais';
    if (!grupos.has(g)) grupos.set(g, []);
    grupos.get(g).push(l);
  }
  return [...grupos].map(([nome, itens]) => ({ nome, itens }));
}

async function entregarPlanilha(ctx, linhas, { titulo, contingenciaPct = 10, fornecidosCliente = [], anteprojeto = false, chave = 'planilha', nomeArquivo }) {
  let resumo;
  await ctx.passo(chave, async () => {
    const naoInclui = ['mão de obra (montagem, instalação, comissionamento)', 'BDI', 'frete', 'impostos sobre serviço', 'os itens "A cotar"', ...(fornecidosCliente.length ? [`itens fornecidos pelo cliente (${fornecidosCliente.slice(0, 5).join('; ')})`] : [])];
    const buffer = await P.gerarPlanilhaPrecos({ titulo, dataBase: hoje(), contingenciaPct, grupos: gruposDasLinhas(linhas), naoInclui });
    const salvo = await ctx.f.salvarArquivo(`${String(titulo || 'Pesquisa de precos').replace(/[^\w\- ]+/g, '').slice(0, 80) || 'Pesquisa de precos'} - ${hoje()}.xlsx`.replace(/^ +/, ''), buffer, 'xlsx');
    if (salvo) ctx.arquivo(salvo);
    const resp = R.respostaPrecos({ linhas, contingenciaPct, fornecidosCliente, anteprojeto });
    resp.secoes.forEach(s => ctx.secao(s.titulo, s.linhas));
    resumo = resp.resumo;
    linhas.filter(l => l.conferir).slice(0, 15).forEach(l => ctx.pendencia(`[CONFERIR] ${cortar(l.descricao, 100)}: ${l.origem === P.ORIGENS.a_cotar ? 'a cotar (sem referência)' : cortar(l.observacao, 120)}`));
    ctx.dado('totais', { subtotal: resumo.subtotal, contingencia: resumo.contingencia, total: resumo.total, a_cotar: resumo.aCotar });
    return `${linhas.length} item(ns) — material ${brl(resumo.subtotal)}, com contingência ${brl(resumo.total)}${nomeArquivo ? '' : ''}`;
  });
  return resumo;
}

// materiais de uma proposta (seções que não são de mão de obra)
function materiaisDaProposta(p) {
  const { ehMaoDeObra } = require('../../utils/calculoProposta');
  const secoes = new Map((p.secoes || []).map(s => [s.id, s]));
  return (p.itens || []).filter(i => !ehMaoDeObra(secoes.get(i.secao_id)?.nome || '')).map(i => ({
    descricao: i.descricao, quantidade: Number(i.quantidade) || 0, unidade: i.unidade || 'un', grupo: i.subgrupo || secoes.get(i.secao_id)?.nome || 'Materiais',
    tag: i.codigo || '', item_id: i.id, status: i.status, valor_unitario: Number(i.valor_unitario) || 0,
  }));
}

// ── 3. Orçamento ────────────────────────────────────────────────────────────
async function orcamento(ctx) {
  const e = ctx.entrada;
  let analiseId = e.analise_id || null;
  const projetoId = e.projeto_id || null;
  if (projetoId) ctx.pular('origem', `projeto #${projetoId}`);
  else if (e.arquivo_id) {
    const a = await garantirAnalise(ctx, 'origem', { finalidade: 'orcamento' });
    analiseId = a.id;
    ctx.link(`Análise de projeto #${a.id}`, `/obras/analise/${a.id}`);
  } else ctx.pular('origem', `análise #${analiseId}`);

  let proposta = null;
  await ctx.passo('rascunho', async () => {
    let r;
    try {
      if (projetoId) {
        let modo = e.modo;
        if (!modo) {
          const p = await ctx.f.verProjeto(projetoId);
          const disc = (await ctx.f.disciplinasDoTipo(p.tipo || 'projeto')).find(d => d.chave === p.disciplina);
          modo = disc?.modosOrcamento?.[0]?.modo;
          if (!modo) throw new Parada({ motivo: `O ${p.tipo || 'projeto'} #${projetoId} não tem modo de orçamento.`, pergunta: 'Escolha o modo do orçamento na tela do projeto.' });
        }
        r = await ctx.f.gerarOrcamentoDoProjeto(projetoId, modo);
      } else r = await ctx.f.gerarOrcamentoDaAnalise(analiseId);
    } catch (err) {
      if (err.status === 403) {
        throw new Parada({ status: 'pendente', motivo: `Não gerei: ${cortar(err.message, 300)}`, pergunta: 'Esse orçamento atualizaria uma proposta que não foi criada por este agente. Gere pela tela (botão "Gerar orçamento") ou peça ao dono da proposta — não sobrescrevo sem a confirmação dele.' });
      }
      throw err;
    }
    proposta = await ctx.f.verProposta(r.propostaId);
    ctx.link(`Proposta ${r.numero}`, `/propostas/editar/${r.propostaId}`);
    ctx.dado('proposta_id', r.propostaId);
    const aCotar = (proposta.itens || []).filter(i => i.status === 'a_cotar').length;
    ctx.secao('Rascunho de proposta', [
      `- ${r.criada ? 'Criada' : 'Atualizada'} a **Proposta ${r.numero}** pelo motor de orçamento (catálogo e o aprendido nas propostas aprovadas da disciplina) — total ${brl(proposta.total)} (materiais ${brl(proposta.subtotal_materiais)}, mão de obra ${brl(proposta.subtotal_mao_obra)}).`,
      `- ${(proposta.itens || []).length} item(ns); **${aCotar} a cotar** (o engenheiro confirma na tela).`,
      ...(r.mensagem ? [`- ${cortar(r.mensagem, 400)}`] : []),
      ...(r.pontosCadSemConferir ? [`- ${r.pontosCadSemConferir} ponto(s) do desenho ainda não conferido(s) no mapa ficaram FORA do orçamento [CONFERIR].`] : []),
    ]);
    if (aCotar) ctx.pendencia(`[CONFERIR] ${aCotar} item(ns) a cotar na proposta ${r.numero} — a planilha QF-CAG traz a referência de cada um.`);
    return `Proposta ${r.numero} — ${brl(proposta.total)}, ${aCotar} a cotar`;
  });

  const materiais = materiaisDaProposta(proposta);
  if (!materiais.length) { ctx.pular('precos', 'proposta sem materiais'); ctx.pular('planilha', 'proposta sem materiais'); return; }
  // o preço que o motor já deu (confirmado) vale como estimativa H&M; o "a cotar" procura referência
  const itens = materiais.map(m => ({ ...m }));
  const linhas = await linhasComPreco(ctx, itens, { pesquisarMercado: !!e.pesquisar_mercado, chaveReferencias: 'precos', chaveMercado: 'mercado' });
  for (const l of linhas) {
    if (l.origem === P.ORIGENS.a_cotar && l.status === 'confirmado' && l.valor_unitario > 0) {
      Object.assign(l, { preco: l.valor_unitario, origem: P.ORIGENS.estimativa, fonte: 'Proposta (motor de orçamento: catálogo/histórico)', conferir: false, observacao: '' });
    }
  }
  await entregarPlanilha(ctx, linhas, { titulo: `Pesquisa de preços — Proposta ${proposta.numero}`, contingenciaPct: 10 });
}

// ── leitura de lista de materiais (XLSX/CSV) ───────────────────────────────
const CAB = {
  descricao: /descri|material|produto|^item$/i, quantidade: /^qtd|quant/i, unidade: /^un(id)?\.?$|unidade/i, tag: /^tag$|^c[óo]d|refer[êe]ncia interna/i,
  grupo: /grupo|categoria|se[çc][ãa]o/i, preco_cliente: /pre[çc]o|valor/i, modelo: /modelo|marca|refer[êe]ncia/i, fornecido: /fornecid|cliente fornece/i,
};
// cabeçalho: a 1ª linha com 2+ células preenchidas e uma coluna de descrição ("Descrição", "Material", "Produto")
const CAB_DESCRICAO = /^descri|descri[çc][ãa]o|^materia(l|is)$|^produto/i;
function lerTabela(linhas) {
  const iCab = linhas.findIndex(l => l.filter(c => String(c ?? '').trim()).length >= 2 && l.some(c => CAB_DESCRICAO.test(String(c || '').trim())));
  if (iCab < 0) return [];
  const cab = linhas[iCab].map(c => String(c || '').trim());
  const col = { descricao: cab.findIndex(c => CAB_DESCRICAO.test(c)) };
  for (const [k, re] of Object.entries(CAB)) {
    if (k === 'descricao') continue;
    const i = cab.findIndex((c, j) => re.test(c) && !Object.values(col).includes(j));
    if (i >= 0) col[k] = i;
  }
  const num = (v) => { if (v == null || String(v).trim() === '') return null; const n = Number(String(v).replace(/\s/g, '').replace(/R\$/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
  const out = [];
  let grupoAtual = null;
  for (const l of linhas.slice(iCab + 1)) {
    const desc = String(l[col.descricao] ?? '').trim();
    if (!desc) continue;
    const qtd = col.quantidade != null ? num(l[col.quantidade]) : null;
    if (qtd == null && l.filter(c => String(c ?? '').trim()).length <= 2) { grupoAtual = desc; continue; } // linha de título de grupo
    out.push({
      descricao: desc.slice(0, 500), quantidade: qtd ?? 1, unidade: col.unidade != null ? String(l[col.unidade] ?? '').trim() || 'un' : 'un',
      tag: col.tag != null ? String(l[col.tag] ?? '').trim() : '', grupo: (col.grupo != null && String(l[col.grupo] ?? '').trim()) || grupoAtual || 'Materiais',
      preco_cliente: col.preco_cliente != null ? num(l[col.preco_cliente]) : null, modelo: col.modelo != null ? String(l[col.modelo] ?? '').trim() : '',
      fornecido_cliente: col.fornecido != null && /^(s|sim|x|cliente)/i.test(String(l[col.fornecido] ?? '').trim()),
    });
  }
  return out;
}
async function lerListaDoArquivo(buffer, tipo) {
  if (tipo === 'csv') {
    const texto = buffer.toString('utf8').replace(/^﻿/, '');
    const sep = (texto.split('\n')[0].match(/;/g) || []).length >= (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    return lerTabela(texto.split(/\r?\n/).map(l => l.split(sep).map(c => c.replace(/^"|"$/g, ''))));
  }
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const linhas = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const v = [];
    row.eachCell({ includeEmpty: true }, (c, n) => { const x = c.value; v[n - 1] = x && typeof x === 'object' ? (x.result ?? x.text ?? (x.richText ? x.richText.map(t => t.text).join('') : '')) : x; });
    linhas.push(v);
  });
  return lerTabela(linhas);
}

// ── 4. Pesquisa de preços ───────────────────────────────────────────────────
async function pesquisaPrecos(ctx) {
  const e = ctx.entrada;
  let itens = [];
  let titulo = e.titulo || 'Pesquisa de preços de materiais';
  let anteprojeto = false;
  await ctx.passo('lista', async () => {
    if (Array.isArray(e.itens) && e.itens.length) {
      // aceita também a lista de materiais do projeto do quadro (nomes de campo do motor da especificação)
      itens = e.itens.map(i => ({ ...i, descricao: i?.descricao || i?.description || i?.item || i?.nome || '' })).filter(i => String(i.descricao).trim()).map(i => ({
        descricao: String(i.descricao).slice(0, 500), quantidade: Number(i.quantidade ?? i.qtd) || 1, unidade: i.unidade || i.un || 'un', tag: i.tag || '', grupo: i.grupo || i.categoria || 'Materiais',
        preco_cliente: Number(i.preco_cliente) > 0 ? Number(i.preco_cliente) : null, modelo: i.modelo || i.referencia || '',
        fornecido_cliente: i.fornecido_cliente === true || i.fornecidoCliente === true || i.fornecido === 'cliente',
      }));
      anteprojeto = !!e.anteprojeto || itens.some(i => i.modelo);
      return `${itens.length} item(ns) da lista enviada${e.origem_lista ? ` (${e.origem_lista})` : ''}`;
    }
    if (e.proposta_id) {
      const p = await ctx.f.verProposta(e.proposta_id);
      itens = materiaisDaProposta(p);
      titulo = e.titulo || `Pesquisa de preços — Proposta ${p.numero}`;
      ctx.link(`Proposta ${p.numero}`, `/propostas/editar/${p.id}`);
      return `${itens.length} material(is) da proposta ${p.numero}`;
    }
    if (e.analise_id) {
      const a = await ctx.f.verAnalise(e.analise_id);
      itens = (a.materiais || []).filter(m => !m.pronto && Number(m.quantidade) > 0).map(m => ({ descricao: m.descricao, quantidade: Number(m.quantidade), unidade: m.unidade || 'un', grupo: m.disciplina ? nomeDisciplina(m.disciplina) : 'Materiais', tag: '' }));
      titulo = e.titulo || `Pesquisa de preços — Análise #${a.id}`;
      ctx.link(`Análise de projeto #${a.id}`, `/obras/analise/${a.id}`);
      return `${itens.length} material(is) da análise #${a.id}`;
    }
    const { registro, buffer } = await ctx.f.bytesDoArquivo(e.arquivo_id);
    if (!['xlsx', 'csv'].includes(registro.tipo)) throw new Parada({ motivo: `"${registro.nome}" é ${registro.tipo.toUpperCase()}: a lista de materiais precisa ser XLSX ou CSV.`, pergunta: 'Anexe a lista em Excel (colunas Descrição, Qtd, Un) ou abra a proposta/análise na tela.' });
    itens = await lerListaDoArquivo(buffer, registro.tipo);
    anteprojeto = itens.some(i => i.modelo);
    titulo = e.titulo || `Pesquisa de preços — ${registro.nome.replace(/\.[^.]+$/, '')}`;
    return `${itens.length} item(ns) lidos de "${registro.nome}"`;
  });
  const fornecidos = itens.filter(i => i.fornecido_cliente);
  const aPesquisar = itens.filter(i => !i.fornecido_cliente);
  if (!aPesquisar.length) throw new Parada({ motivo: 'A lista não tem materiais para pesquisar.', pergunta: 'Confira se a planilha tem a coluna "Descrição" (e Qtd/Un).' });
  const linhas = await linhasComPreco(ctx, aPesquisar, { pesquisarMercado: !!e.pesquisar_mercado });
  await entregarPlanilha(ctx, linhas, { titulo, contingenciaPct: e.contingencia_pct ?? 10, fornecidosCliente: fornecidos.map(f => cortar(f.descricao, 60)), anteprojeto });
}

// ── 5. Quadro pela especificação (aguardando o módulo) ──────────────────────
async function quadroEspecificacao(ctx) {
  const e = ctx.entrada;
  const truncado = R.pedidoTruncado(ctx.texto || e.texto || '');
  let situacao = null;
  await ctx.passo('modulo', async () => {
    situacao = adaptadorQuadros.situacao();
    return situacao.disponivel ? situacao.projeto : 'aguardando módulo';
  });
  if (!situacao.disponivel) {
    R.respostaQuadro({ truncado, aguardando: true, situacaoModulo: situacao }).forEach(s => ctx.secao(s.titulo, s.linhas));
    ctx.pular('especificacao', 'aguardando módulo'); ctx.pular('projeto', 'aguardando módulo'); ctx.pular('planilha', 'aguardando módulo');
    throw new Parada({ status: 'aguardando_modulo', motivo: 'O motor do projeto do quadro pela especificação ainda não está instalado.' });
  }
  let especificacao = null;
  await ctx.passo('especificacao', async () => {
    if (e.arquivo_id) { const { registro, buffer } = await ctx.f.bytesDoArquivo(e.arquivo_id); especificacao = { nome: registro.nome, tipo: registro.tipo, buffer }; return `arquivo "${registro.nome}"`; }
    especificacao = String(e.texto || '');
    return `texto (${especificacao.length} caracteres)`;
  });
  let r;
  await ctx.passo('projeto', async () => {
    r = await adaptadorQuadros.projetar(especificacao, { pacote: truncado ? R.PACOTE_PADRAO : null, pedido: ctx.texto || '' });
    R.respostaQuadro({ projeto: r.projeto, truncado }).forEach(s => ctx.secao(s.titulo, s.linhas));
    r.pendencias.slice(0, 30).forEach(p => ctx.pendencia(CONFERIR.test(p) ? cortar(p, 240) : `[CONFERIR] ${cortar(p, 240)}`));
    ctx.dado('materiais', r.materiais.slice(0, 400));
    for (const doc of (r.projeto?.arquivos || r.projeto?.documentos || []).filter(d => d && Buffer.isBuffer(d.buffer)).slice(0, 6)) {
      const salvo = await ctx.f.salvarArquivo(doc.nome || 'documento', doc.buffer);
      if (salvo) ctx.arquivo(salvo);
    }
    return `${r.modulo.projeto} — ${r.materiais.length} material(is), ${r.pendencias.length} pendência(s)`;
  });
  if (r.planilha) {
    await ctx.passo('planilha', async () => { const s = await ctx.f.salvarArquivo(`Pesquisa de precos do quadro - ${hoje()}.xlsx`, r.planilha, 'xlsx'); if (s) ctx.arquivo(s); return 'planilha da skill'; });
  } else ctx.pular('planilha', 'peça "faça a pesquisa de preço do material" para a planilha QF-CAG');
}

const EXECUTORES = {
  analise_projeto: analiseProjeto,
  projeto_disciplina: projetoDisciplina,
  orcamento,
  pesquisa_precos: pesquisaPrecos,
  quadro_especificacao: quadroEspecificacao,
};

module.exports = { EXECUTORES, Parada, lerTabela, lerListaDoArquivo, linhasDoObjetivo, materiaisDaProposta, deduzirDisciplinas, disciplinaDaSkill };
