// CAMPO DE INSTRUÇÕES da análise (versão 2.47, 20/11/2026). O engenheiro escreve o que mudar e o sistema:
//   1. INTERPRETA sem IA (services/instrucoes/interpretar.js) e mostra o que entendeu, já com as posições;
//   2. APLICA o que o engenheiro confirmar — componentes inseridos/retirados pelo mesmo registro do 3D e do Mapa do CAD
//      (services/edicoesDoMapa.js) e o local da estrutura pelo critério `centros` do projetista — e RECALCULA a MESMA
//      análise (executarAnalise com `substituir`): orçamento, cabos, 3D e prancha saem atualizados, sem análise nova;
//   3. guarda cada instrução (analises_instrucoes) com o que havia antes: "Desfazer" volta a última;
//   4. (2.49) na elaboração, guarda os AJUSTES por ambiente: a mesma correção repetida vira sugestão de regra do
//      projetista, que só vale depois da aprovação do administrador (services/instrucoes/regrasProjetista.js).
// Quando as regras não entendem a frase, o engenheiro pode pedir à IA: ela só REESCREVE a frase no formato padrão
// (a mesma leitura determinística resolve as posições) e as palavras novas viram sugestão de vocabulário, que só vale
// depois da aprovação do administrador (services/instrucoes/aprendidas.js).
//
//   GET  /projetos/analises/:id/instrucoes                  histórico
//   POST /projetos/analises/:id/instrucoes/interpretar      { texto }            → { operacoes, duvidas, iaDisponivel }
//   POST /projetos/analises/:id/instrucoes/interpretar-ia   { texto }            → { operacoes, duvidas, termos, frases }
//   POST /projetos/analises/:id/instrucoes                  { texto, operacoes, origem, termos } → a análise recalculada
//   POST /projetos/analises/:id/instrucoes/:iid/desfazer                          → a análise recalculada
const pool = require('../../config/database');
const { comTransacao } = require('../../services/transacao');
const { registrarAuditoria } = require('../../services/auditoria');
const edicoesDoMapa = require('../../services/edicoesDoMapa');
const { interpretar } = require('../../services/instrucoes/interpretar');
const aprendidas = require('../../services/instrucoes/aprendidas');
const regrasProjetista = require('../../services/instrucoes/regrasProjetista');
const { componentes, componente } = require('../../services/bibliotecaComponentes');
const ia = require('../../services/ia');
const analises = require('./analises');
const mapaCad = require('./mapaCad');

const MAX_OPERACOES = 20;
const MAX_ITENS = 300;
const recalculando = new Set(); // análises com recálculo em andamento (um de cada vez)

function contextoDa(a, aprendidasMapa = {}) {
  const dados = Array.isArray(a.dados_extraidos) ? a.dados_extraidos : [];
  const sug = dados.map(d => d?.projeto_sugerido).filter(p => p && !p.erro);
  return {
    ambientes: Array.isArray(a.ambientes) ? a.ambientes : [],
    pontos: Array.isArray(a.espacial?.pontos) ? a.espacial.pontos : [],
    disciplinas: Array.isArray(a.disciplinas) ? a.disciplinas : [],
    pavimentos: [...new Set(dados.flatMap(d => (Array.isArray(d?.pavimentos) ? d.pavimentos.map(p => p.nome) : [])))],
    projetadas: [...new Set(sug.flatMap(p => p.disciplinas || []))],
    elaboracao: a.finalidade === 'elaboracao',
    aprendidas: aprendidasMapa,
  };
}
const temPlanta = (a) => (Array.isArray(a.dados_extraidos) ? a.dados_extraidos : []).some(d => d?.mapa_cad?.simbolos);
const SEM_PLANTA = 'Esta análise não tem planta do CAD (DWG/DXF): o campo de instruções altera componentes na planta. Para análises de PDF, ajuste os itens no editor da proposta.';

async function carregar(id, client = pool, travar = false) {
  const { rows: [a] } = await client.query(`SELECT * FROM analises_projeto WHERE id = $1${travar ? ' FOR UPDATE' : ''}`, [id]);
  if (!a) throw Object.assign(new Error('Análise não encontrada'), { status: 404 });
  return a;
}
const texto = (v) => String(v || '').trim().slice(0, 1500);

// ── histórico ──
async function listar(req, res) {
  const { rows } = await pool.query(
    `SELECT i.id, i.texto, i.origem, i.operacoes, i.criado_em, i.desfeita_em, u.nome AS usuario_nome
       FROM analises_instrucoes i LEFT JOIN usuarios u ON u.id = i.usuario_id
      WHERE i.analise_id = $1 ORDER BY i.id DESC LIMIT 50`, [req.params.id]);
  const ultima = rows.find(r => !r.desfeita_em);
  res.json(rows.map(r => ({
    id: r.id, texto: r.texto, origem: r.origem, criado_em: r.criado_em, desfeita_em: r.desfeita_em, usuario_nome: r.usuario_nome,
    operacoes: (r.operacoes || []).map(o => o.descricao), podeDesfazer: r.id === ultima?.id,
  })));
}

// ── interpretar (sem IA) ──
async function interpretarRota(req, res) {
  const a = await carregar(req.params.id);
  const t = texto(req.body?.texto);
  if (!temPlanta(a)) return res.json({ operacoes: [], duvidas: [SEM_PLANTA], iaDisponivel: false });
  const r = interpretar(t, contextoDa(a, await aprendidas.carregar(pool)));
  // a IA só ajuda quando a FRASE não foi entendida ("não há detector no CPD" ela não resolve)
  const naoEntendeu = r.duvidas.some(d => /Não reconheci|Não entendi|Faltou o que fazer|Não entendi a ação/.test(d));
  res.json({ ...r, iaDisponivel: naoEntendeu ? iaDisponivel() : false });
}
function iaDisponivel() { try { return !!ia.disponivel(); } catch { return false; } }

// ── interpretar com a IA: ela só reescreve no formato padrão; a leitura e as posições são as mesmas ──
function promptIa(t, ctx) {
  // a biblioteca INTEIRA (só as disciplinas da análise fazia a IA forçar o mais parecido: "olho de boi" virava luminária de emergência
  // numa análise sem iluminação); os equipamentos sem nome próprio (HM-EQ-…) ficam de fora
  const lista = componentes().filter(c => !/^HM-EQ-/.test(c.nome));
  const salas = [...new Set(ctx.ambientes.filter(x => x?.nome && !x.semNome).map(x => `${x.nome}${x.pavimento ? ` (${x.pavimento})` : ''}`))].slice(0, 300);
  return [
    'Você ajuda um engenheiro a alterar um projeto de instalações. Reescreva a instrução dele em frases simples, no formato padrão abaixo, usando SÓ os nomes de componente e de ambiente das listas. Não invente ambiente nem componente; se nenhum componente da lista corresponder ao que o engenheiro pediu, diga em "naoEntendi" em vez de escolher um parecido.',
    'Formatos (uma frase por ação):',
    '- acrescente N <componente> na <AMBIENTE> do <PAVIMENTO>',
    '- retire N <componente> da <AMBIENTE> do <PAVIMENTO>   (ou: retire todos os <componente> da <AMBIENTE>)',
    '- mova N <componente> da <AMBIENTE> para a <AMBIENTE> do <PAVIMENTO>',
    '- leve o <componente> para a <AMBIENTE> do <PAVIMENTO>   (equipamento central: rack, central, quadro)',
    '- troque os <componente> por <componente> na <AMBIENTE>',
    '- deixe N <componente> na <AMBIENTE> do <PAVIMENTO>',
    'Responda SÓ com JSON: {"frases": ["..."], "termos": [{"frase": "palavras que o engenheiro usou para o componente", "componente": "nome exato da lista"}], "naoEntendi": "o que não deu para entender, ou vazio"}.',
    `Componentes: ${lista.map(c => c.nome).join(' | ')}`,
    `Ambientes (pavimento): ${salas.join(' | ')}`,
    `Instrução do engenheiro: ${t}`,
  ].join('\n');
}
async function interpretarIa(req, res) {
  const a = await carregar(req.params.id);
  const t = texto(req.body?.texto);
  if (!t) return res.status(400).json({ erro: 'Escreva a instrução.' });
  if (!temPlanta(a)) return res.status(400).json({ erro: SEM_PLANTA });
  if (!iaDisponivel()) return res.status(503).json({ erro: 'Nenhuma IA disponível agora. Reescreva a instrução com os nomes da legenda e dos ambientes.' });
  const ctx = contextoDa(a, await aprendidas.carregar(pool));
  let json;
  try {
    ({ json } = await ia.perguntarJSON(promptIa(t, ctx), { finalidade: 'instrução da análise', timeoutMs: 120000, timeoutTotalMs: 150000 }));
  } catch (e) {
    return res.status(502).json({ erro: `A IA não respondeu: ${e.message}` });
  }
  const frases = (Array.isArray(json?.frases) ? json.frases : []).map(f => String(f || '').slice(0, 300)).filter(Boolean).slice(0, MAX_OPERACOES);
  const r = interpretar(frases.join('. '), ctx);
  const porNome = new Map(componentes().map(c => [aprendidas.fraseNormal(c.nome), c.simbolo]));
  const termos = (Array.isArray(json?.termos) ? json.termos : [])
    .map(x => ({ frase: String(x?.frase || '').slice(0, 60), simbolo: porNome.get(aprendidas.fraseNormal(x?.componente)) }))
    .filter(x => x.simbolo && x.frase.trim());
  if (json?.naoEntendi) r.duvidas.push(`A IA não entendeu: ${String(json.naoEntendi).slice(0, 300)}`);
  res.json({ ...r, termos, frases });
}

// ── aplicar ──
// operações vindas da tela (as que o engenheiro deixou marcadas): só os campos conhecidos
function lerOperacoes(lista) {
  if (!Array.isArray(lista) || !lista.length) return 'Nada para aplicar.';
  if (lista.length > MAX_OPERACOES) return `Instruções demais de uma vez (máximo ${MAX_OPERACOES}).`;
  const ops = [];
  for (const o of lista) {
    const item = (p) => ({ simbolo: String(p?.simbolo || ''), x: Number(p?.x), y: Number(p?.y), ...(p?.rotulo ? { rotulo: String(p.rotulo).slice(0, 120) } : {}) });
    const adicionar = (Array.isArray(o?.adicionar) ? o.adicionar : []).map(item);
    const remover = (Array.isArray(o?.remover) ? o.remover : []).map(item);
    if (adicionar.length + remover.length > MAX_ITENS) return `Componentes demais numa instrução (máximo ${MAX_ITENS}).`;
    if ([...adicionar, ...remover].some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return 'Posição inválida.';
    if (adicionar.some(p => !componente(p.simbolo))) return 'Componente que não existe na biblioteca.';
    const centros = {};
    for (const [k, v] of Object.entries(o?.centros && typeof o.centros === 'object' ? o.centros : {}).slice(0, 20)) {
      if (!/^[a-z_]+(\|.{1,80})?$/.test(k) || !v?.ambiente) return 'Local de estrutura inválido.';
      centros[k] = { ambiente: String(v.ambiente).slice(0, 120), ...(v.pavimento ? { pavimento: String(v.pavimento).slice(0, 80) } : {}), ...(v.unico === true && !k.includes('|') && k !== 'antena' ? { unico: true } : {}) };
    }
    if (!adicionar.length && !remover.length && !Object.keys(centros).length) continue;
    ops.push({ tipo: String(o?.tipo || '').slice(0, 12), descricao: String(o?.descricao || '').slice(0, 300), adicionar, remover, centros });
  }
  return ops.length ? ops : 'Nada para aplicar.';
}
const edicoesPorArquivo = (a) => Object.fromEntries((Array.isArray(a.dados_extraidos) ? a.dados_extraidos : [])
  .filter(d => d?.mapa_cad?.simbolos).map(d => [d.mapa_cad.arquivo || d.arquivo, edicoesDoMapa.normalizar(d.mapa_cad.edicoes)]));
const assinatura = (porArquivo) => JSON.stringify(Object.keys(porArquivo).sort().map(k => [k, porArquivo[k].adicionados.map(x => x.id).sort(), porArquivo[k].removidos.map(x => x.id).sort()]));
function comEdicoes(a, porArquivo) {
  return (Array.isArray(a.dados_extraidos) ? a.dados_extraidos : []).map(d => {
    const nome = d?.mapa_cad?.simbolos ? (d.mapa_cad.arquivo || d.arquivo) : null;
    return nome && porArquivo[nome] ? { ...d, mapa_cad: { ...d.mapa_cad, edicoes: porArquivo[nome], edicoesNoOrcamento: false } } : d;
  });
}

// recalcula a análise no lugar com as edições e critérios já gravados; responde a análise (ou o erro)
async function recalcular(req, res, a, criterios, extraResposta) {
  const lidos = await mapaCad.arquivosDaAnalise(a, { incluirDisciplinas: false });
  const corpo = { finalidade: a.finalidade || 'orcamento', obra_id: a.obra_id, nome_projeto: a.nome_projeto };
  return analises.executarAnalise(req, res, lidos.arquivos, corpo, {
    mapasConfirmados: lidos.mapasConfirmados, mapasEditados: lidos.mapasEditados, analiseAnterior: a,
    substituir: a.id, criterios, extraResposta,
  });
}

async function aplicar(req, res) {
  const id = Number(req.params.id);
  const t = texto(req.body?.texto);
  const ops = lerOperacoes(req.body?.operacoes);
  if (typeof ops === 'string') return res.status(400).json({ erro: ops });
  if (recalculando.has(id)) return res.status(409).json({ erro: 'Esta análise já está sendo recalculada: espere terminar.' });
  recalculando.add(id);
  let instrucaoId = null, antes = null;
  try {
    const { a, depoisCriterios } = await comTransacao(async (client) => {
      const a0 = await carregar(id, client, true);
      if (!temPlanta(a0)) throw Object.assign(new Error(SEM_PLANTA), { status: 400 });
      const criteriosAntes = analises.criteriosDaAnalise(a0);
      antes = { edicoes: edicoesPorArquivo(a0), criterios: criteriosAntes };
      // componentes: o mesmo caminho do 3D (posições da referência → arquivo de cada uma)
      const adicionar = ops.flatMap(o => o.adicionar), remover = ops.flatMap(o => o.remover);
      const porArquivo = JSON.parse(JSON.stringify(antes.edicoes));
      if (adicionar.length || remover.length) {
        const pedidos = mapaCad.pedidosDo3d({ adicionar, remover }, a0);
        if (typeof pedidos === 'string') throw Object.assign(new Error(pedidos), { status: 400 });
        for (const [arquivo, pedido] of Object.entries(pedidos)) {
          const d = a0.dados_extraidos.find(x => x?.mapa_cad?.simbolos && (x.mapa_cad.arquivo || x.arquivo) === arquivo);
          const erro = edicoesDoMapa.validarPedido(pedido, { ...d.mapa_cad, edicoes: porArquivo[arquivo] });
          if (erro) throw Object.assign(new Error(erro), { status: 400 });
          porArquivo[arquivo] = edicoesDoMapa.aplicarPedido(porArquivo[arquivo], pedido, req.usuario.id).edicoes;
        }
      }
      // estrutura: o local escolhido entra nos critérios do projetista
      const centrosNovos = Object.assign({}, ...ops.map(o => o.centros));
      let depoisCriterios = criteriosAntes;
      if (Object.keys(centrosNovos).length) {
        if (a0.finalidade !== 'elaboracao') throw Object.assign(new Error('Mover a estrutura refazendo os cabos vale para a elaboração de projeto. Num projeto recebido, diga "retire" e "acrescente" o equipamento.'), { status: 400 });
        depoisCriterios = { ...(criteriosAntes || {}), centros: { ...(criteriosAntes?.centros || {}), ...centrosNovos } };
      }
      const dados = comEdicoes(a0, porArquivo);
      await client.query('UPDATE analises_projeto SET dados_extraidos = $1 WHERE id = $2', [JSON.stringify(dados), id]);
      // (2.49) o que a instrução mudou por ambiente (só na elaboração): base das regras aprendidas do projetista
      let ajustes = [];
      try { ajustes = regrasProjetista.ajustesDaInstrucao(a0, ops); } catch (e) { console.error('[instruções] ajustes não calculados:', e.message); }
      const { rows: [ins] } = await client.query(
        `INSERT INTO analises_instrucoes (analise_id, texto, origem, operacoes, antes, depois, usuario_id, ajustes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [id, t || ops.map(o => o.descricao).join('; '), req.body?.origem === 'ia' ? 'ia' : 'regras',
          JSON.stringify(ops.map(o => ({ tipo: o.tipo, descricao: o.descricao, adicionados: o.adicionar.length, retirados: o.remover.length, centros: o.centros }))),
          JSON.stringify(antes), JSON.stringify({ assinatura: assinatura(porArquivo), edicoes: porArquivo, criterios: depoisCriterios }), req.usuario.id, JSON.stringify(ajustes)]);
      instrucaoId = ins.id;
      await registrarAuditoria(client, { entidade: 'analises_projeto', entidadeId: id, acao: 'instrucao_aplicada', usuarioId: req.usuario.id,
        detalhes: { instrucao: ins.id, texto: t.slice(0, 300), operacoes: ops.map(o => o.descricao).slice(0, 20) } });
      return { a: { ...a0, dados_extraidos: dados }, depoisCriterios };
    });
    // as palavras que a IA ajudou a entender e o engenheiro confirmou ao aplicar: sugestão de vocabulário (vale depois da aprovação)
    if (req.body?.origem === 'ia' && Array.isArray(req.body?.termos)) {
      await aprendidas.sugerir(pool, { termos: req.body.termos, texto: t, usuarioId: req.usuario.id }).catch(e => console.error('[instruções] sugestão não gravada:', e.message));
    }
    // (2.49) a correção repetida vira sugestão de regra do projetista (a tela avisa a que acabou de nascer)
    const regrasSugeridas = await regrasProjetista.atualizarSugestoes(pool, { usuarioId: req.usuario.id }).catch((e) => { console.error('[instruções] regras não sugeridas:', e.message); return []; });
    const ok = await recalcular(req, res, a, depoisCriterios, { instrucao: { id: instrucaoId, texto: t, operacoes: ops.map(o => o.descricao), regrasSugeridas } });
    if (!ok) { await voltarAoAntes(id, antes, instrucaoId); await regrasProjetista.atualizarSugestoes(pool).catch(() => {}); return; }
  } catch (e) {
    if (instrucaoId) { await voltarAoAntes(id, antes, instrucaoId).catch(() => {}); await regrasProjetista.atualizarSugestoes(pool).catch(() => {}); }
    if (!res.headersSent) res.status(e.status || 500).json({ erro: e.status ? e.message : 'Erro ao aplicar a instrução.' });
    if (!e.status) console.error('[instruções] erro ao aplicar:', e);
  } finally {
    recalculando.delete(id);
  }
}

// recálculo falhou: as edições voltam ao que eram e a instrução sai do histórico
async function voltarAoAntes(id, antes, instrucaoId) {
  await comTransacao(async (client) => {
    const a = await carregar(id, client, true);
    await client.query('UPDATE analises_projeto SET dados_extraidos = $1 WHERE id = $2', [JSON.stringify(comEdicoes(a, antes.edicoes)), id]);
    await client.query('DELETE FROM analises_instrucoes WHERE id = $1', [instrucaoId]);
  });
}

// ── desfazer a última ──
async function desfazer(req, res) {
  const id = Number(req.params.id), iid = Number(req.params.iid);
  if (!Number.isInteger(iid) || iid <= 0) return res.status(400).json({ erro: 'Instrução inválida.' });
  if (recalculando.has(id)) return res.status(409).json({ erro: 'Esta análise já está sendo recalculada: espere terminar.' });
  recalculando.add(id);
  try {
    const { a, criterios, instrucao } = await comTransacao(async (client) => {
      const { rows: [i] } = await client.query('SELECT * FROM analises_instrucoes WHERE id = $1 AND analise_id = $2 FOR UPDATE', [iid, id]);
      if (!i) throw Object.assign(new Error('Instrução não encontrada.'), { status: 404 });
      if (i.desfeita_em) throw Object.assign(new Error('Esta instrução já foi desfeita.'), { status: 409 });
      const { rows: [ultima] } = await client.query('SELECT id FROM analises_instrucoes WHERE analise_id = $1 AND desfeita_em IS NULL ORDER BY id DESC LIMIT 1', [id]);
      if (ultima.id !== i.id) throw Object.assign(new Error('Desfaça primeiro as instruções mais novas (uma de cada vez, da última para a primeira).'), { status: 409 });
      const a0 = await carregar(id, client, true);
      if (i.depois?.assinatura && assinatura(edicoesPorArquivo(a0)) !== i.depois.assinatura) {
        throw Object.assign(new Error('A análise foi editada depois desta instrução (no 3D ou no Mapa do CAD): desfaça aquela edição por lá, ou escreva uma instrução nova.'), { status: 409 });
      }
      const dados = comEdicoes(a0, i.antes?.edicoes || {});
      await client.query('UPDATE analises_projeto SET dados_extraidos = $1 WHERE id = $2', [JSON.stringify(dados), id]);
      await client.query('UPDATE analises_instrucoes SET desfeita_em = NOW(), desfeita_por = $2 WHERE id = $1', [iid, req.usuario.id]);
      await registrarAuditoria(client, { entidade: 'analises_projeto', entidadeId: id, acao: 'instrucao_desfeita', usuarioId: req.usuario.id, detalhes: { instrucao: iid, texto: String(i.texto).slice(0, 300) } });
      return { a: { ...a0, dados_extraidos: dados }, criterios: i.antes?.criterios || null, instrucao: i };
    });
    // os critérios de ANTES valem como estão (sem eles, o recálculo reaproveitaria os da análise, já com o local novo)
    const ok = await recalcular(req, res, a, a.finalidade === 'elaboracao' ? (criterios || {}) : null, { desfeita: { id: iid, texto: instrucao.texto } });
    if (!ok) {
      // volta a instrução e as edições dela (a análise fica como estava antes do desfazer)
      await comTransacao(async (client) => {
        const a1 = await carregar(id, client, true);
        if (instrucao.depois?.edicoes) await client.query('UPDATE analises_projeto SET dados_extraidos = $1 WHERE id = $2', [JSON.stringify(comEdicoes(a1, instrucao.depois.edicoes)), id]);
        await client.query('UPDATE analises_instrucoes SET desfeita_em = NULL, desfeita_por = NULL WHERE id = $1', [iid]);
      }).catch(e => console.error('[instruções] desfazer não voltou:', e.message));
    }
    // (2.49) a instrução desfeita deixa de contar para as regras sugeridas (a resposta já foi enviada)
    await regrasProjetista.atualizarSugestoes(pool).catch(e => console.error('[instruções] regras não atualizadas:', e.message));
  } catch (e) {
    if (!res.headersSent) res.status(e.status || 500).json({ erro: e.status ? e.message : 'Erro ao desfazer a instrução.' });
    if (!e.status) console.error('[instruções] erro ao desfazer:', e);
  } finally {
    recalculando.delete(id);
  }
}

module.exports = { listar, interpretar: interpretarRota, interpretarIa, aplicar, desfazer, paraTestes: { lerOperacoes, contextoDa, promptIa, assinatura } };
