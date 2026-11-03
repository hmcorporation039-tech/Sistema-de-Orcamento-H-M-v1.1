// Modelo 3D ilustrativo (versão 2.3) — "para o cliente ter uma ideia de como
// vai ficar": a arquitetura (DWG/DXF) em 3D com os pontos das disciplinas.
//
// Origens possíveis:
//   'laudo'    — projeto/laudo por disciplina com arquitetura enviada
//                (laudos_projetos_arquitetura); pontos do formulário real
//   'analise'  — análise de projeto com arquitetura enviada
//                (analises_projeto_arquitetura); pontos do projeto (espacial) ou
//                os símbolos desenhados no arquivo — nunca estimados (01/11/2026)
//   Um modelo por planta do desenho (skills/_comum/cad/modelosPorPlanta.js).
//   'proposta' — a origem da proposta (origem_tipo/origem_id)
//
// O HTML gerado é guardado em modelos_3d com uma chave (hash de tudo que entra
// no modelo): enquanto nada muda, abrir de novo não recalcula. A imagem para o
// PDF da proposta é capturada uma vez e guardada na mesma linha.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ErroHttp } = require('../../utils/erros');
const { executarNoWorker } = require('../executarNoWorker');
const simbolosAprendidos = require('../simbolosAprendidos');
const pool = require('../../config/database');
const { capturarImagemDeHtml } = require('../pdfPuppeteer');

// disciplina do sistema → nome aceito pela estimativa (skills/_comum/cad/estimativaArquitetura.js)
const DISCIPLINAS_3D = {
  eletrica: 'eletrica', iluminacao: 'iluminacao', incendio: 'incendio', cabeamento: 'cabeamento', rede: 'cabeamento',
  cftv: 'cftv', alarme: 'alarme', controle_acesso: 'controle_acesso',
};
const TEMPO_LIMITE_MS = 90 * 1000;

// muda quando o gerador muda: invalida o cache dos modelos já gerados.
// Revisão de 02/11/2026: antes era uma lista fixa de arquivos (pela data), e
// faltavam simbolos.js, disciplinasCad.js, planta.js, plantasDisciplina.js,
// posicionamento.js e o cabeçalho da empresa — mudar um deles não refazia o 3D.
// Agora: hash do CONTEÚDO de todo .js/.json de skills/_comum/cad (subpastas
// inclusive, sem node_modules e sem os testes) e de skills/_comum/empresa.js.
// O hash só é refeito quando a data ou o tamanho de algum arquivo muda.
const { CAD, COMUM, RAIZ_SKILLS } = require('../../config/caminhos');
// Fase 1 do roteiro (02/11/2026): a cena (versão 3) leva circuito e comando por ponto e o
// modelo único da instalação — o módulo comum e os geradores das skills de elétrica e
// iluminação também mudam o 3D do formulário, então entram na chave do cache
const EXTRA_GERADOR = [
  path.join(COMUM, 'empresa.js'), path.join(COMUM, 'instalacao', 'index.js'),
  path.join(RAIZ_SKILLS, 'eletrica', 'scripts', 'lib', 'instalacao.js'), path.join(RAIZ_SKILLS, 'eletrica', 'scripts', 'lib', 'luminotecnico.js'),
  path.join(RAIZ_SKILLS, 'iluminacao', 'scripts', 'lib', 'instalacao.js'),
  // fase 2 (3D interativo): o simulador lógico, e o quadro do prédio sai do caderno de
  // fabricação da skill quadros (pasta inteira, abaixo)
  path.join(COMUM, 'instalacao', 'simulador.js'),
];
const PASTA_QUADROS = path.join(RAIZ_SKILLS, 'quadros', 'scripts', 'lib');
function arquivosDoGerador(pasta = CAD, lista = []) {
  for (const e of fs.readdirSync(pasta, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const f = path.join(pasta, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) arquivosDoGerador(f, lista); continue; }
    if (/\.(js|json)$/i.test(e.name) && !/^teste[-.]/i.test(e.name)) lista.push(f);
  }
  return lista;
}
let geradorCache = { assinatura: null, hash: null };
function versaoDoGerador() {
  try {
    const arquivos = [...arquivosDoGerador(), ...EXTRA_GERADOR, ...(fs.existsSync(PASTA_QUADROS) ? arquivosDoGerador(PASTA_QUADROS) : [])];
    const assinatura = arquivos.map(f => { const st = fs.statSync(f); return `${path.relative(COMUM, f)}:${st.mtimeMs}:${st.size}`; }).join('|');
    if (geradorCache.assinatura !== assinatura) {
      const h = crypto.createHash('sha256');
      // sem \r: o checkout com CRLF e o com LF dão o mesmo hash
      for (const f of arquivos) h.update(path.relative(COMUM, f).replace(/\\/g, '/')).update('\0').update(fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).update('\0');
      geradorCache = { assinatura, hash: h.digest('hex') };
    }
    return geradorCache.hash;
  } catch { return 'sem-gerador'; }
}

// as mensagens daqui são escritas para o usuário (inclusive as 5xx: "demorou demais")
const erro = (status, mensagem) => new ErroHttp(status, mensagem, {}, { publico: true });

// Tudo que o modelo precisa, a partir da origem. null = sem arquitetura.
async function fonteDoModelo(origemTipo, origemId, executor = pool) {
  if (origemTipo === 'proposta') {
    const { rows: [p] } = await executor.query('SELECT id, numero, origem_tipo, origem_id FROM propostas WHERE id = $1', [origemId]);
    if (!p) throw erro(404, 'Proposta não encontrada.');
    if (!p.origem_tipo || !p.origem_id) return null;
    const f = await fonteDoModelo(p.origem_tipo, p.origem_id, executor);
    return f && { ...f, proposta: p.numero };
  }
  if (origemTipo === 'laudo') {
    const { rows: [l] } = await executor.query('SELECT id, tipo, disciplina, titulo, cliente_nome, dados FROM laudos_projetos WHERE id = $1', [origemId]);
    if (!l) throw erro(404, 'Projeto não encontrado.');
    const { rows: [a] } = await executor.query('SELECT nome_arquivo, conteudo FROM laudos_projetos_arquitetura WHERE laudo_id = $1', [l.id]);
    if (!a) return null;
    const disc = DISCIPLINAS_3D[l.disciplina];
    const d = l.dados || {};
    return {
      origemTipo: 'laudo', origemId: l.id, nomeArquivo: a.nome_arquivo, dxf: a.conteudo.toString('utf8'),
      disciplinas: disc ? [disc] : [], dadosPorDisciplina: disc ? { [disc]: d } : {},
      semPontos: disc ? null : 'Esta disciplina ainda não tem pontos no 3D: o modelo mostra só a arquitetura.',
      peDireito: d.sistema?.pe_direito_m || d.pe_direito_m || null,
      titulo: `Modelo 3D — ${l.titulo || 'Projeto'}`, cliente: d.cliente?.nome || l.cliente_nome || '', obra: d.obra?.nome || '',
    };
  }
  if (origemTipo === 'analise') {
    const { rows: [an] } = await executor.query('SELECT id, nome_projeto, cliente_nome, disciplinas, espacial, arquivos_analisados FROM analises_projeto WHERE id = $1', [origemId]);
    if (!an) throw erro(404, 'Análise não encontrada.');
    const { rows: [a] } = await executor.query('SELECT nome_arquivo, conteudo FROM analises_projeto_arquitetura WHERE analise_id = $1', [an.id]);
    if (!a) return null;
    // 2.3: análise feita com o DWG/DXF do projeto → o 3D mostra o que está DESENHADO
    // (posições reais dos blocos e o traçado das eletrocalhas/eletrodutos), sem estimar
    const reais = dispositivosDoEspacial(an.espacial);
    if (reais.dispositivos.length || reais.trechos.length) {
      return {
        origemTipo: 'analise', origemId: an.id, nomeArquivo: a.nome_arquivo, dxf: a.conteudo.toString('utf8'),
        disciplinas: [], dadosPorDisciplina: {}, dispositivosReais: reais.dispositivos, trechos: reais.trechos,
        semPontos: `Componentes e traçados nas posições do projeto recebido (DWG/DXF${an.espacial.referencia ? `, alinhados a "${an.espacial.referencia}"` : ''}).${reais.genericos ? ` ${reais.genericos} componente(s) sem símbolo próprio aparecem como caixa com o nome do projeto.` : ''}`,
        peDireito: null,
        titulo: `Modelo 3D — ${an.nome_projeto || 'Projeto'}`, cliente: an.cliente_nome || '', obra: '',
      };
    }
    // sem posições do projeto: os pontos são os símbolos desenhados no próprio arquivo
    // enviado (o DWG do projeto elétrico serve de arquitetura). Nada é estimado pela
    // norma — a Arena (01/11/2026) saía com 868 tomadas que não existem no projeto.
    return {
      origemTipo: 'analise', origemId: an.id, nomeArquivo: a.nome_arquivo, dxf: a.conteudo.toString('utf8'),
      disciplinas: [], dadosPorDisciplina: {},
      semPontos: null,
      peDireito: null,
      titulo: `Modelo 3D — ${an.nome_projeto || 'Projeto'}`, cliente: an.cliente_nome || '', obra: '',
    };
  }
  throw erro(400, 'Origem do modelo 3D inválida.');
}

// Componente lido do DWG (services/analiseCad/index.js: descrição pela sigla, legenda ou
// nome do bloco) → símbolo do 3D pelo classificador único de todas as disciplinas
// (skills/_comum/cad/tiposDePonto.js: o mesmo da leitura dos símbolos explodidos). Tomada
// pela altura escrita ("H=0,30m", "2,20 m do piso") quando houver.
const { simboloDaDescricao } = require(path.join(CAD, 'tiposDePonto.js'));
const tipoDoTrecho = (layer) => (/ELETROCALHA/i.test(layer) ? 'eletrocalha' : /PERFILADO/i.test(layer) ? 'perfilado' : /LEITO/i.test(layer) ? 'leito' : /FIA[ÇC][ÃA]O|FIACAO/i.test(layer) ? 'fiacao' : 'eletroduto');
// disciplina: a chave do registro único (skills/_comum/disciplinas.js) vai como está —
// o 3D usa as mesmas chaves e traduz os nomes antigos (modelo3d.chaveDisciplina);
// a tabela de tradução que ficava aqui saiu na revisão de 02/11/2026

// analises_projeto.espacial (utils/compatibilidadeEspacial.js) → dispositivos e trechos da cena
// Todo componente do projeto entra no 3D com a descrição dele ("Acionador manual AME
// 521"), a disciplina e a altura lida do DWG; o que não tem símbolo próprio vira uma
// caixa com o nome (antes ficava de fora — isolador, módulo, central sem "INC" no nome).
const SIMBOLO_GENERICO = 'HM-GEN-COMPONENTE';
const rotuloDoComponente = (d) => String(d || '').replace(/\s*—\s*bloco .*$/i, '').replace(/\s*\((teto|parede)\)\s*$/i, '').trim().slice(0, 70);
function dispositivosDoEspacial(espacial) {
  const dispositivos = [];
  let genericos = 0;
  for (const p of espacial?.pontos || []) {
    if (!p.disciplina) continue; // climatização/hidráulica: referência, não é da H&M
    const proprio = simboloDaDescricao(p.descricao);
    if (!proprio) genericos++;
    const simbolo = proprio || SIMBOLO_GENERICO;
    dispositivos.push({ simbolo, rotulo: rotuloDoComponente(p.descricao) || null, disciplina: p.disciplina,
      ...(p.montagem !== 'teto' && Number(p.altura_m) > 0 ? { altura_m: Number(p.altura_m) } : {}), x: p.x, y: p.y, rotacao: 0, id: '', ambiente: null,
      // circuito e comando conferidos no Mapa do CAD (texto junto do símbolo): o 3D grava por ponto
      ...(p.circuito ? { circuito: String(p.circuito), comando: p.comando || '' } : {}) });
  }
  // tipo, material e medida lidos do desenho (services/analiseCad/medidasInfra.js); análise
  // antiga, sem eles: o tipo pela layer e a medida null (o 3D usa a seção ilustrativa)
  const trechos = (espacial?.trechos || []).map(t => ({
    disciplina: t.disciplina || 'eletrica', tipo: t.tipo || tipoDoTrecho(t.layer), layer: t.layer, segmentos: t.segmentos,
    material: t.material ?? null, medida: t.medida ?? null, secao_mm: t.secao_mm ?? null, origem_medida: t.origem_medida ?? null,
    ...(t.quantidade > 1 ? { quantidade: t.quantidade } : {}),
  }));
  return { dispositivos, trechos, genericos };
}

// aprendidos: a legenda aprendida que vai ao worker (services/simbolosAprendidos.js) —
// ela muda a leitura dos símbolos desenhados, então entra na chave (revisão de
// 02/11/2026: confirmar um símbolo no Mapa do CAD não refazia o 3D já guardado).
// Em ordem fixa: o "vezes" que reordena a lista não muda o resultado.
const hashAprendidos = (aprendidos) => crypto.createHash('sha256')
  .update(JSON.stringify((aprendidos || []).map(a => JSON.stringify(a)).sort())).digest('hex');
function chaveDa(fonte, aprendidos = []) {
  const h = crypto.createHash('sha256');
  h.update(versaoDoGerador());
  h.update(hashAprendidos(aprendidos));
  h.update(crypto.createHash('sha256').update(fonte.dxf).digest('hex'));
  if (fonte.dispositivosReais || fonte.trechos) h.update(crypto.createHash('sha256').update(JSON.stringify([fonte.dispositivosReais, fonte.trechos])).digest('hex'));
  h.update(JSON.stringify([fonte.disciplinas, fonte.dadosPorDisciplina, fonte.peDireito, fonte.titulo, fonte.cliente, fonte.obra, fonte.proposta || '', fonte.semPontos]));
  return h.digest('hex');
}

// Gerações em andamento por chave: dois cliques no mesmo modelo esperam a mesma
// (worker com a fila global de services/executarNoWorker.js: no máximo 2 ao mesmo tempo)
async function gerarNoWorker(fonte, aprendidos) {
  let m;
  try {
    m = await executarNoWorker(path.join(__dirname, 'worker.js'), {
      dxf: fonte.dxf, disciplinas: fonte.disciplinas, dadosPorDisciplina: fonte.dadosPorDisciplina, peDireito: fonte.peDireito,
      semPontos: fonte.semPontos, titulo: fonte.titulo, cliente: fonte.cliente, obra: fonte.obra, proposta: fonte.proposta || '',
      dispositivosReais: fonte.dispositivosReais || null, trechos: fonte.trechos || null,
      // legenda das pranchas lida em projetos anteriores (services/simbolosAprendidos.js)
      aprendidos: aprendidos || await simbolosAprendidos.carregar(),
    }, { tempoLimiteMs: TEMPO_LIMITE_MS, memoriaMb: 1024 });
  } catch (e) {
    if (e.codigo === 'TEMPO_ESGOTADO') throw erro(500, 'O modelo 3D demorou demais para ser gerado.');
    throw erro(500, `Falha ao gerar o 3D: ${e.message}`);
  }
  if (!m.ok) throw erro(400, `Não consegui montar o 3D: ${m.erro}`);
  return m;
}
const emAndamento = new Map();

const linhaDoCache = (origemTipo, origemId, fonte) => (origemTipo === 'proposta'
  ? { tipoCache: 'proposta', idCache: Number(origemId) }
  : { tipoCache: fonte.origemTipo, idCache: fonte.origemId });

// { html, numeros, avisos, gerado_em, chave } — do cache ou gerado agora.
// null = a origem não tem arquitetura.
async function obterModelo(origemTipo, origemId) {
  const fonte = await fonteDoModelo(origemTipo, origemId);
  if (!fonte) return null;
  // a MESMA lista vai para a chave e para o worker
  const aprendidos = await simbolosAprendidos.carregar();
  const chave = chaveDa(fonte, aprendidos);
  // proposta: o título leva o número dela, então o cache é da própria proposta
  const { tipoCache, idCache } = linhaDoCache(origemTipo, origemId, fonte);
  const { rows: [cache] } = await pool.query(
    'SELECT html, resumo, gerado_em, chave FROM modelos_3d WHERE origem_tipo = $1 AND origem_id = $2', [tipoCache, idCache]);
  if (cache && cache.chave === chave) return { html: cache.html, ...cache.resumo, gerado_em: cache.gerado_em, chave, fonte };

  const k = `${tipoCache}:${idCache}:${chave}`;
  if (!emAndamento.has(k)) {
    emAndamento.set(k, (async () => {
      const r = await gerarNoWorker(fonte, aprendidos);
      const resumo = { numeros: r.numeros, avisos: r.avisos, nome_arquivo: fonte.nomeArquivo };
      const { rows: [g] } = await pool.query(
        `INSERT INTO modelos_3d (origem_tipo, origem_id, chave, html, resumo, imagem, gerado_em)
         VALUES ($1,$2,$3,$4,$5,NULL,NOW())
         ON CONFLICT (origem_tipo, origem_id) DO UPDATE SET chave = EXCLUDED.chave, html = EXCLUDED.html, resumo = EXCLUDED.resumo, imagem = NULL, gerado_em = NOW()
         RETURNING gerado_em`,
        [tipoCache, idCache, chave, r.html, resumo]);
      return { html: r.html, ...resumo, gerado_em: g.gerado_em, chave, fonte };
    })().finally(() => emAndamento.delete(k)));
  }
  return emAndamento.get(k);
}

// "Gerar de novo" (dono do registro ou administrador: routes/v2/modelo3d.js): apaga o
// modelo guardado da origem e gera outra vez — para quando o 3D guardado ficou
// velho por algo que a chave não enxerga. Gerações em andamento da mesma chave
// continuam valendo (a nova espera a mesma).
async function refazerModelo(origemTipo, origemId) {
  const fonte = await fonteDoModelo(origemTipo, origemId);
  if (!fonte) return null;
  const { tipoCache, idCache } = linhaDoCache(origemTipo, origemId, fonte);
  await pool.query('DELETE FROM modelos_3d WHERE origem_tipo = $1 AND origem_id = $2', [tipoCache, idCache]);
  return obterModelo(origemTipo, origemId);
}

// Situação sem gerar: tem arquitetura? quais disciplinas terão pontos?
async function situacao(origemTipo, origemId) {
  const fonte = await fonteDoModelo(origemTipo, origemId);
  // proposta: e se o "mostrar ao cliente" está ligado
  const extra = origemTipo === 'proposta'
    ? { modelo_3d_cliente: (await pool.query('SELECT modelo_3d_cliente FROM propostas WHERE id = $1', [origemId])).rows[0]?.modelo_3d_cliente === true }
    : {};
  if (!fonte) return { disponivel: false, motivo: 'Envie a arquitetura (.dwg, .dxf ou PDF) para gerar o modelo 3D.', ...extra };
  return { disponivel: true, arquivo: fonte.nomeArquivo, disciplinas: fonte.disciplinas, aviso: fonte.semPontos, ...extra };
}

// PNG da vista em perspectiva, para o PDF da proposta (guardado com o modelo).
// Capturas em andamento por origem e chave (como obterModelo): dois PDFs da
// mesma proposta ao mesmo tempo esperam a MESMA captura — antes cada um abria
// o seu Chromium com WebGL por software e ocupava as duas vagas da fila de PDF.
const capturasEmAndamento = new Map();
async function imagemDoModelo(origemTipo, origemId) {
  const m = await obterModelo(origemTipo, origemId);
  if (!m) return null;
  const { tipoCache, idCache } = linhaDoCache(origemTipo, origemId, m.fonte);
  const { rows: [s] } = await pool.query('SELECT imagem, chave FROM modelos_3d WHERE origem_tipo = $1 AND origem_id = $2', [tipoCache, idCache]);
  if (s?.imagem && s.chave === m.chave) return s.imagem;
  const k = `${tipoCache}:${idCache}:${m.chave}`;
  if (!capturasEmAndamento.has(k)) {
    capturasEmAndamento.set(k, (async () => {
      const png = await capturarImagemDeHtml(m.html, {
        largura: 1600, altura: 1000, esperarSeletor: 'body.pronto',
        // sem as barras da página: só o modelo, com as etiquetas dos ambientes
        css: 'header,#barra,aside,footer,#dica{display:none!important}',
        antes: () => { const H = window.HM3D; if (H) { H.vista3d(); for (let i = 0; i < 3; i++) H.render(); } },
      });
      await pool.query('UPDATE modelos_3d SET imagem = $1 WHERE origem_tipo = $2 AND origem_id = $3 AND chave = $4', [png, tipoCache, idCache, m.chave]);
      return png;
    })().finally(() => capturasEmAndamento.delete(k)));
  }
  return capturasEmAndamento.get(k);
}

// Cabeçalho das páginas do 3D servidas pelo sistema: o HTML tem script embutido
// (three.js + cena), o que a política geral do sistema bloqueia. Aqui ele roda
// em "sandbox" sem allow-same-origin: origem opaca, sem acesso ao login do
// sistema guardado no navegador, sem rede.
const CSP_MODELO_3D = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; sandbox allow-scripts; frame-ancestors 'none'";

const nomeArquivo = (fonte) => `Modelo 3D - ${String(fonte.titulo || '').replace(/^Modelo 3D — /, '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Projeto'}.html`;

// Link curto (2 h: a troca de planta no 3D recarrega a página pelo mesmo link)
// para abrir o 3D numa aba nova: a aba não leva o
// cabeçalho de login, e um blob: criado pela tela herdaria a política da tela
// (script bloqueado). Guardado em memória — some ao reiniciar o servidor.
const LINKS = new Map();
const VALIDADE_LINK_MS = 2 * 60 * 60 * 1000;
function criarLink(origemTipo, origemId) {
  const agora = Date.now();
  for (const [t, l] of LINKS) if (l.expira < agora) LINKS.delete(t);
  const token = crypto.randomBytes(24).toString('hex');
  LINKS.set(token, { origemTipo, origemId: Number(origemId), expira: agora + VALIDADE_LINK_MS });
  return token;
}
function lerLink(token) {
  const l = /^[0-9a-f]{48}$/.test(String(token)) ? LINKS.get(token) : null;
  return l && l.expira > Date.now() ? l : null;
}

module.exports = {
  CSP_MODELO_3D, obterModelo, refazerModelo, situacao, imagemDoModelo, nomeArquivo, criarLink, lerLink,
  chaveDa, versaoDoGerador, arquivosDoGerador, gerarNoWorker, dispositivosDoEspacial,
};
