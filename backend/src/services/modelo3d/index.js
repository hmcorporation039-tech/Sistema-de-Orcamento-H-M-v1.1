// Modelo 3D ilustrativo (versão 2.3) — "para o cliente ter uma ideia de como
// vai ficar": a arquitetura (DWG/DXF) em 3D com os pontos das disciplinas.
//
// Origens possíveis:
//   'laudo'    — projeto/laudo por disciplina com arquitetura enviada
//                (laudos_projetos_arquitetura); pontos do formulário real
//   'analise'  — análise de projeto com arquitetura enviada
//                (analises_projeto_arquitetura); pontos ESTIMADOS das disciplinas
//   'proposta' — a origem da proposta (origem_tipo/origem_id)
//
// O HTML gerado é guardado em modelos_3d com uma chave (hash de tudo que entra
// no modelo): enquanto nada muda, abrir de novo não recalcula. A imagem para o
// PDF da proposta é capturada uma vez e guardada na mesma linha.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ErroHttp } = require('../../utils/erros');
const { executarNoWorker } = require('../../utils/executarNoWorker');
const pool = require('../../config/database');
const { capturarImagemDeHtml } = require('../../utils/pdfPuppeteer');

// disciplina do sistema → nome aceito pela estimativa (skills/_comum/cad/estimativaArquitetura.js)
const DISCIPLINAS_3D = {
  eletrica: 'eletrica', iluminacao: 'iluminacao', incendio: 'incendio', cabeamento: 'cabeamento', rede: 'cabeamento',
  cftv: 'cftv', alarme: 'alarme', controle_acesso: 'controle-acesso',
};
const TEMPO_LIMITE_MS = 90 * 1000;

// muda quando o gerador muda: invalida o cache dos modelos já gerados
const { CAD } = require('../../config/caminhos');
function versaoDoGerador() {
  try {
    return ['modelo3d.js', 'estimativaArquitetura.js', 'visualizador3d.js', path.join('visualizador3d', 'app.bundle.js')]
      .map(f => fs.statSync(path.join(CAD, f)).mtimeMs).join('|');
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
        semPontos: `Componentes e traçados nas posições do projeto recebido (DWG/DXF${an.espacial.referencia ? `, alinhados a "${an.espacial.referencia}"` : ''}).${reais.foraDoMapa ? ` ${reais.foraDoMapa} componente(s) sem símbolo no 3D ficaram de fora.` : ''}`,
        peDireito: null,
        titulo: `Modelo 3D — ${an.nome_projeto || 'Projeto'}`, cliente: an.cliente_nome || '', obra: '',
      };
    }
    const chaves = (an.disciplinas || []).map(x => (typeof x === 'string' ? x : x?.chave)).filter(Boolean);
    const disciplinas = [...new Set(chaves.map(k => DISCIPLINAS_3D[k]).filter(Boolean))];
    // projeto recebido em DWG/DXF, mas sem posições alinhadas: avisa que os pontos são
    // ESTIMADOS (antes o 3D mostrava 11 tomadas estimadas com 6 desenhadas, sem aviso)
    const veioDeCad = (an.arquivos_analisados || []).some(x => /\.(dwg|dxf)$/i.test(x?.nomeArquivo || x?.arquivo || ''));
    return {
      origemTipo: 'analise', origemId: an.id, nomeArquivo: a.nome_arquivo, dxf: a.conteudo.toString('utf8'),
      disciplinas, dadosPorDisciplina: {},
      semPontos: !disciplinas.length ? 'As disciplinas desta análise ainda não têm pontos no 3D: o modelo mostra só a arquitetura.'
        : veioDeCad ? 'Pontos ESTIMADOS pela norma (para conferir): os componentes do DWG/DXF não puderam ser posicionados na arquitetura — ela precisa de pelo menos 3 ambientes com o mesmo nome nos dois desenhos.'
          : null,
      peDireito: null,
      titulo: `Modelo 3D — ${an.nome_projeto || 'Projeto'}`, cliente: an.cliente_nome || '', obra: '',
    };
  }
  throw erro(400, 'Origem do modelo 3D inválida.');
}

// Componente lido do DWG (utils/analiseCad.js: descrição pela sigla, legenda ou
// nome do bloco) → símbolo do 3D (skills/_comum/cad/modelo3d.js ESPEC). Tomada
// pela altura escrita na legenda ("H=0,30m") quando houver.
const SIMBOLO_DO_COMPONENTE = [
  [/LUMIN[ÁA]RIA DE EMERG|ILUMINA[ÇC][ÃA]O DE EMERG|BLOCO AUT/i, 'HM-INC-EMERGENCIA'],
  [/TOMADA M[ÉE]DIA/i, 'HM-ELE-TOMADA-MEDIA'],
  [/TOMADA ALTA/i, 'HM-ELE-TOMADA-ALTA'],
  [/TOMADA/i, (d) => { const h = Number(String(d).match(/H\s*=\s*([\d.,]+)/i)?.[1]?.replace(',', '.')); return h >= 1.6 ? 'HM-ELE-TOMADA-ALTA' : h >= 0.6 ? 'HM-ELE-TOMADA-MEDIA' : 'HM-ELE-TOMADA-BAIXA'; }],
  [/INTERRUPTOR/i, 'HM-ELE-INTERRUPTOR'],
  [/QUADRO|\bQDC?\b|\bQL\b/i, 'HM-ELE-QUADRO'],
  [/PONTO DE LUZ/i, 'HM-ELE-PONTO-LUZ'],
  [/LUMIN|ARANDELA|PLAFON|SPOT|PENDENTE|DOWNLIGHT/i, 'HM-ILU-LUMINARIA'],
  [/C[ÂA]MERA|\bDOME\b|BULLET/i, 'HM-CFTV-CAMERA'],
  [/ACCESS ?POINT|WI-?FI/i, 'HM-CAB-AP'],
  [/PONTO DE REDE|L[ÓO]GIC|RJ-?45/i, 'HM-CAB-PONTO-REDE'],
  [/INTERFONE|PORTEIRO/i, 'HM-TEL-PORTEIRO'],
  [/TELEF/i, 'HM-TEL-PONTO'],
  [/PONTO DE TV|ANTENA|COAXIAL/i, 'HM-ANT-PONTO'],
  [/DETECTOR|FUMA[ÇC]/i, 'HM-INC-DETECTOR-FUMACA'],
  [/ACIONADOR/i, 'HM-INC-ACIONADOR'],
  [/AVISADOR|AUDIOVISUAL/i, 'HM-INC-AVISADOR'],
  [/CENTRAL.*INC/i, 'HM-INC-CENTRAL'],
  [/SENSOR DE ALARME|IVP|INFRAVERMELHO/i, 'HM-ALM-IVP'],
  [/SIRENE/i, 'HM-ALM-SIRENE'],
  [/TECLADO/i, 'HM-ALM-TECLADO'],
  [/CONTROLE DE ACESSO|LEITOR|FECHADURA/i, 'HM-ACE-LEITOR'],
];
const tipoDoTrecho = (layer) => (/ELETROCALHA/i.test(layer) ? 'eletrocalha' : /PERFILADO/i.test(layer) ? 'perfilado' : /LEITO/i.test(layer) ? 'leito' : /FIA[ÇC][ÃA]O|FIACAO/i.test(layer) ? 'fiacao' : 'eletroduto');
const DISCIPLINA_3D_TRECHO = { cabeamento: 'rede', rede: 'rede', controle_acesso: 'controle-acesso' };

// analises_projeto.espacial (utils/compatibilidadeEspacial.js) → dispositivos e trechos da cena
function dispositivosDoEspacial(espacial) {
  const dispositivos = [];
  let foraDoMapa = 0;
  for (const p of espacial?.pontos || []) {
    if (!p.disciplina) continue; // climatização/hidráulica: referência, não é da H&M
    const regra = SIMBOLO_DO_COMPONENTE.find(([re]) => re.test(p.descricao || ''));
    if (!regra) { foraDoMapa++; continue; }
    const simbolo = typeof regra[1] === 'function' ? regra[1](p.descricao) : regra[1];
    dispositivos.push({ simbolo, x: p.x, y: p.y, rotacao: 0, id: '', ambiente: null });
  }
  const trechos = (espacial?.trechos || []).map(t => ({
    disciplina: DISCIPLINA_3D_TRECHO[t.disciplina] || t.disciplina || 'eletrica', tipo: tipoDoTrecho(t.layer), layer: t.layer, segmentos: t.segmentos,
  }));
  return { dispositivos, trechos, foraDoMapa };
}

function chaveDa(fonte) {
  const h = crypto.createHash('sha256');
  h.update(versaoDoGerador());
  h.update(crypto.createHash('sha256').update(fonte.dxf).digest('hex'));
  if (fonte.dispositivosReais || fonte.trechos) h.update(crypto.createHash('sha256').update(JSON.stringify([fonte.dispositivosReais, fonte.trechos])).digest('hex'));
  h.update(JSON.stringify([fonte.disciplinas, fonte.dadosPorDisciplina, fonte.peDireito, fonte.titulo, fonte.cliente, fonte.obra, fonte.proposta || '', fonte.semPontos]));
  return h.digest('hex');
}

// Gerações em andamento por chave: dois cliques no mesmo modelo esperam a mesma
// (worker com a fila global de utils/executarNoWorker.js: no máximo 2 ao mesmo tempo)
async function gerarNoWorker(fonte) {
  let m;
  try {
    m = await executarNoWorker(path.join(__dirname, 'worker.js'), {
      dxf: fonte.dxf, disciplinas: fonte.disciplinas, dadosPorDisciplina: fonte.dadosPorDisciplina, peDireito: fonte.peDireito,
      semPontos: fonte.semPontos, titulo: fonte.titulo, cliente: fonte.cliente, obra: fonte.obra, proposta: fonte.proposta || '',
      dispositivosReais: fonte.dispositivosReais || null, trechos: fonte.trechos || null,
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
  const chave = chaveDa(fonte);
  // proposta: o título leva o número dela, então o cache é da própria proposta
  const { tipoCache, idCache } = linhaDoCache(origemTipo, origemId, fonte);
  const { rows: [cache] } = await pool.query(
    'SELECT html, resumo, gerado_em, chave FROM modelos_3d WHERE origem_tipo = $1 AND origem_id = $2', [tipoCache, idCache]);
  if (cache && cache.chave === chave) return { html: cache.html, ...cache.resumo, gerado_em: cache.gerado_em, chave, fonte };

  const k = `${tipoCache}:${idCache}:${chave}`;
  if (!emAndamento.has(k)) {
    emAndamento.set(k, (async () => {
      const r = await gerarNoWorker(fonte);
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

// Link curto (10 min) para abrir o 3D numa aba nova: a aba não leva o
// cabeçalho de login, e um blob: criado pela tela herdaria a política da tela
// (script bloqueado). Guardado em memória — some ao reiniciar o servidor.
const LINKS = new Map();
const VALIDADE_LINK_MS = 10 * 60 * 1000;
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
  DISCIPLINAS_3D, CSP_MODELO_3D, fonteDoModelo, obterModelo, situacao, imagemDoModelo, nomeArquivo, criarLink, lerLink,
  chaveDa, gerarNoWorker, dispositivosDoEspacial,
};
